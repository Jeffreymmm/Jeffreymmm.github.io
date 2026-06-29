/**
 * cloud.js —— GitHub Gist 云端同步编排层（三端通用：APP/H5/小程序）
 *
 * 职责：配置管理 + Gist CRUD + push/pull/restore 编排 + 写后自动上传。
 * 单向依赖 db.js（db 不感知 cloud），通过 db.onChange 订阅写事件，避免循环引用。
 *
 * 配置（token/gistId/lastSyncedAt）独立存储于 life_planner_cloud_v1，
 * 不混入业务数据 key（life_planner_data_v1）。
 *
 * 同步策略：Last-Write-Wins（按 updatedAt），离线优先。
 *   - push：本地快照 → 云端（无 gistId 自动创建并回填）
 *   - pull/restore：云端 → 本地（仅云端较新时恢复，手动可强制覆盖）
 *   - 写后自动 push（防抖 1s 合并连续写入）；restore 期间抑制回推
 *
 * 安全：Token 为 classic 类型、仅 gist scope；Gist 设为 secret（public:false）。
 *       v1 不加密，内置 encrypt/decrypt 恒等透传钩子（预留扩展，不破坏三端通用）。
 */
import db from './db.js'

const CFG_KEY = 'life_planner_cloud_v1'
const FILENAME = 'life-planner-data.json'
const DESCRIPTION = '人生规划器数据备份'
const API = 'https://api.github.com'

/* ============ 配置管理 ============ */
function getConfig() {
  try { return uni.getStorageSync(CFG_KEY) || {} } catch (e) { return {} }
}
function saveConfig(partial) {
  const merged = Object.assign({}, getConfig(), partial)
  try { uni.setStorageSync(CFG_KEY, merged) } catch (e) { console.warn('保存同步配置失败', e) }
  return merged
}
function clearConfig() {
  try { uni.removeStorageSync(CFG_KEY) } catch (e) {}
}
function hasToken() { return !!getConfig().token }
/** 完整可用：token 与 gistId 同时存在（用于启动自动同步等需明确目标的场景） */
function isConfigured() {
  const cfg = getConfig()
  return !!(cfg.token && cfg.gistId)
}

/* ============ 加解密透传（v1 恒等，预留扩展）============ */
function encrypt(text) { return text }
function decrypt(text) { return text }

/* ============ 网络封装 ============ */
function messageFor(code, ctx) {
  if (code === 'network') return '网络连接失败，请检查网络'
  if (code === '401') return 'Token 已失效，请重新配置'
  if (code === '403') return '请求过于频繁，请稍后再试'
  if (code === '404') {
    if (ctx === 'config') return 'Gist ID 无效，请检查'
    if (ctx === 'pull') return '云端数据不存在，请先上传'
    return '云端数据不存在'
  }
  return '云端服务异常，请稍后再试'
}
/** 统一请求：注入鉴权头，统一映射网络/HTTP 错误为 {code, status, message} */
function request(method, path, data, ctx) {
  const cfg = getConfig()
  if (!cfg.token) return Promise.reject({ code: 'noToken', message: '请先配置同步' })
  return new Promise((resolve, reject) => {
    uni.request({
      url: API + path,
      method,
      data,
      timeout: 15000,
      header: {
        'Authorization': 'Bearer ' + cfg.token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      success(res) {
        const status = res.statusCode
        if (status >= 200 && status < 300) resolve(res.data)
        else {
          const code = status === 401 ? '401' : status === 403 ? '403' : status === 404 ? '404' : 'http'
          reject({ code, status, message: messageFor(code, ctx) })
        }
      },
      fail() { reject({ code: 'network', message: messageFor('network', ctx) }) }
    })
  })
}

/* ============ Gist CRUD ============ */
function buildFiles(content) {
  const files = {}
  files[FILENAME] = { content }
  return files
}
function createGist(content) {
  return request('POST', '/gists', { description: DESCRIPTION, public: false, files: buildFiles(content) }, 'push')
    .then(d => d.id)
}
function updateGist(gistId, content) {
  return request('PATCH', '/gists/' + gistId, { description: DESCRIPTION, files: buildFiles(content) }, 'push')
    .then(() => gistId)
}
function readGist(gistId) {
  return request('GET', '/gists/' + gistId, null, 'pull').then(d => {
    const file = d.files && d.files[FILENAME]
    if (!file || !file.content) throw { code: 'parse', message: '云端数据已损坏' }
    return { content: file.content, updatedAt: d.updated_at || d.updatedAt }
  })
}
/** 按描述/文件名自动发现已存在的 Gist（跨设备首次恢复免手填 gistId） */
function discoverGist() {
  return request('GET', '/gists?per_page=100', null, 'config').then(list => {
    if (!Array.isArray(list)) return null
    const hit = list.find(g => g.description === DESCRIPTION || (g.files && g.files[FILENAME]))
    return hit ? hit.id : null
  })
}
/** 测试连接：仅验证 token 有效且有 gist 权限，无副作用 */
function testConnection() {
  return request('GET', '/gists?per_page=1', null, 'config').then(() => true)
}
/** 确保有 gistId：已有则直接返回，否则按描述自动发现并回填 */
function ensureGistId() {
  const cfg = getConfig()
  if (cfg.gistId) return Promise.resolve(cfg.gistId)
  if (!cfg.token) return Promise.reject({ code: 'noToken', message: '请先配置同步' })
  return discoverGist().then(id => {
    if (id) { saveConfig({ gistId: id }); return id }
    return null
  })
}

/* ============ 编排 ============ */
let pushTimer = null
let suppressPush = false

/** 上传本地快照到云端（无 gistId 自动创建并回填） */
function push() {
  const cfg = getConfig()
  if (!cfg.token) return Promise.reject({ code: 'noToken', message: '请先配置同步' })
  const snapshot = db.getSnapshot()
  const content = encrypt(JSON.stringify(snapshot))
  return (cfg.gistId ? updateGist(cfg.gistId, content) : createGist(content))
    .then(gistId => {
      saveConfig({ gistId, lastSyncedAt: snapshot.updatedAt })
      return gistId
    })
}
/** 拉取云端快照（不写本地），返回 {snapshot, updatedAt, isNewer} */
function pull() {
  return ensureGistId().then(gistId => {
    if (!gistId) return Promise.reject({ code: 'noConfig', message: '云端数据不存在，请先上传' })
    return readGist(gistId).then(({ content, updatedAt }) => {
      let snapshot
      try { snapshot = JSON.parse(decrypt(content)) }
      catch (e) { throw { code: 'parse', message: '云端数据已损坏' } }
      if (!snapshot || typeof snapshot !== 'object') throw { code: 'parse', message: '云端数据已损坏' }
      const cfg = getConfig()
      const isNewer = !cfg.lastSyncedAt || (!!updatedAt && updatedAt > cfg.lastSyncedAt)
      return { snapshot, updatedAt, isNewer }
    })
  })
}
/** 从云端恢复到本地（force=true 强制覆盖；仅云端较新或强制时执行） */
function restoreFromCloud(force) {
  return pull().then(({ snapshot, updatedAt, isNewer }) => {
    if (!force && !isNewer) return { restored: false }
    // restoreSnapshot 内部 save→emitChange 同步触发，suppressPush 期间吞掉，避免立即回推
    suppressPush = true
    try {
      db.restoreSnapshot(snapshot)
      saveConfig({ lastSyncedAt: updatedAt || snapshot.updatedAt })
    } finally {
      suppressPush = false
    }
    try { uni.$emit('lp:data-restored') } catch (e) {}
    return { restored: true }
  })
}
/** 启动时自动拉取（仅完整配置才执行；静默，失败仅 console.warn 不打扰） */
function autoSyncOnLaunch() {
  if (!isConfigured()) return Promise.resolve(false)
  return restoreFromCloud(false).then(r => {
    if (r.restored) uni.showToast({ title: '已从云端同步', icon: 'success' })
    return r.restored
  }).catch(e => { console.warn('启动同步失败', e); return false })
}
/** 写后防抖自动上传（1s 合并连续写入；restore 期间或未配置 token 时跳过） */
function debouncedPush() {
  if (suppressPush || !hasToken()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    push().catch(e => console.warn('自动上传失败', e))
  }, 1000)
}
/** 注册写后自动上传（幂等，进程内仅注册一次） */
let autoPushStarted = false
function startAutoPush() {
  if (autoPushStarted) return
  autoPushStarted = true
  db.onChange(debouncedPush)
}

export default {
  getConfig, saveConfig, clearConfig, hasToken, isConfigured,
  encrypt, decrypt,
  testConnection, discoverGist,
  push, pull, restoreFromCloud,
  autoSyncOnLaunch, startAutoPush
}
