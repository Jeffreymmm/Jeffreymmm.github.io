/**
 * db.js —— 本地数据层（三端通用：APP/H5/小程序）
 *
 * 存储方案：uni.setStorageSync（同步、离线、持久）。
 * 数据模型（单一数据源）：
 *   - profile   用户参数（驱动所有计算）
 *   - accounts  账户 {id,name,opening,color}（opening=初始余额）
 *   - checkins  打卡记录 {id,date,account,amount,category,note}
 * 账户当前余额 = opening + Σ该账户打卡记录（派生，避免双源漂移）
 * 目标（goals）由 profile 派生，无需单独存储。
 */
import calc from '../utils/calc.js'

const KEY = 'life_planner_data_v1'
let cache = null

/* ============ 持久化 ============ */
function load() {
  if (cache) return cache
  let raw = null
  try { raw = uni.getStorageSync(KEY) } catch (e) { raw = null }
  if (!raw) { cache = seed(); save() }
  else cache = raw
  // 形状保护
  cache.profile = cache.profile || {}
  cache.accounts = cache.accounts || []
  cache.checkins = cache.checkins || []
  return cache
}
function save() {
  try { uni.setStorageSync(KEY, cache) } catch (e) { console.warn('保存失败', e) }
}

/* ============ 种子数据（按"今天"动态生成最近 6 个月）============ */
function pad(n) { return n < 10 ? '0' + n : '' + n }
function seed() {
  const now = new Date()
  const profile = {
    name: '小王',
    greeting: '继续加油',
    city: '深圳',
    age: 29,
    income: 25000,
    savings: 150000,
    housePrice: 3200000,
    downPaymentPct: 30,
    saveRate: 32,
    rate: 3.5,
    years: 30,
    babyYear: 3,
    cityFactor: 1.0,
    investReturn: 3,
    babyTier: 1.0,
    monthlyTarget: 8000,
    emergencyTarget: 60000
  }
  const accounts = [
    { id: 'down', name: '首付账户', opening: 126000, color: 'accent' },
    { id: 'baby', name: '育儿储备', opening: 11000, color: 'warm' },
    { id: 'emergency', name: '应急储备', opening: 39000, color: 'success' },
    { id: 'invest', name: '投资基金', opening: 12000, color: 'info' }
  ]
  // 最近 6 个月（含当月），每月 8000 = 首付4000+育儿1500+应急1000+投资1500
  const checkins = []
  let counter = 1
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 5)
    const date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-05'
    checkins.push({ id: 'seed-' + pad(counter++), date, account: 'down', amount: 4000, category: '月度储蓄', note: '' })
    checkins.push({ id: 'seed-' + pad(counter++), date, account: 'baby', amount: 1500, category: '月度储蓄', note: '' })
    checkins.push({ id: 'seed-' + pad(counter++), date, account: 'emergency', amount: 1000, category: '月度储蓄', note: '' })
    checkins.push({ id: 'seed-' + pad(counter++), date, account: 'invest', amount: 1500, category: '定投', note: '指数基金' })
  }
  return { profile, accounts, checkins }
}

function genId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/* ============ 读写 ============ */
function getProfile() { return cache.profile }
function saveProfile(p) { cache.profile = Object.assign({}, cache.profile, p); save(); return cache.profile }
function getAccounts() { return cache.accounts }
function saveAccounts(arr) { cache.accounts = arr; save(); return cache.accounts }
function getCheckins() { return cache.checkins }
function addCheckin(c) {
  const rec = {
    id: genId(),
    date: c.date,
    account: c.account,
    amount: +c.amount || 0,
    category: c.category || '月度储蓄',
    note: c.note || ''
  }
  cache.checkins.push(rec)
  save()
  return rec
}
function deleteCheckin(id) {
  cache.checkins = cache.checkins.filter(c => c.id !== id)
  save()
}
function resetData() { cache = seed(); save(); return cache }

/* ============ 派生计算 ============ */
function accountBalance(id) {
  const acc = cache.accounts.find(a => a.id === id)
  if (!acc) return 0
  const sum = cache.checkins.filter(c => c.account === id).reduce((s, c) => s + (+c.amount || 0), 0)
  return (+acc.opening || 0) + sum
}
function netWorth() {
  return cache.accounts.reduce((s, a) => s + accountBalance(a.id), 0)
}
function monthTotal(year, month) {
  const key = year + '-' + pad(month)
  return cache.checkins.filter(c => c.date && c.date.slice(0, 7) === key).reduce((s, c) => s + (+c.amount || 0), 0)
}
function yearTotal(year) {
  return cache.checkins.filter(c => c.date && c.date.slice(0, 4) === String(year)).reduce((s, c) => s + (+c.amount || 0), 0)
}
function avgMonthly() {
  if (!cache.checkins.length) return 0
  const months = new Set(cache.checkins.map(c => c.date.slice(0, 7)))
  return months.size ? yearTotal(new Date().getFullYear()) / months.size : 0
}

/** 当月与历史打卡状态（用于月历） */
function monthlyStatus(year) {
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  const target = +cache.profile.monthlyTarget || 8000
  const arr = []
  for (let m = 1; m <= 12; m++) {
    const total = monthTotal(year, m)
    let status
    if (year > curY || (year === curY && m > curM)) status = 'future'
    else if (year === curY && m === curM) status = 'current'
    else status = total >= target ? 'done' : (total > 0 ? 'partial' : 'missed')
    arr.push({ m, total, status })
  }
  return arr
}

/** 连续达标月数（当月未达标不中断，已完成历史月断档则停） */
function currentStreak() {
  const now = new Date()
  const target = +cache.profile.monthlyTarget || 8000
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  let streak = 0
  let first = true
  while (streak < 60) {
    const total = monthTotal(y, m)
    if (total >= target) streak++
    else if (first) { /* 当月在途，不中断 */ }
    else break
    first = false
    m--
    if (m < 1) { m = 12; y-- }
  }
  return streak
}

/** 由 profile 派生的三大目标（DRY：跟随参数自动更新） */
function goals() {
  const p = cache.profile
  const sum = calc.plannerSummary(p, accountBalance('down'))
  const nowY = new Date().getFullYear()
  return [
    { id: 'down', name: '购房首付', target: sum.downAmt || 960000, account: 'down', year: nowY + Math.ceil(sum.timeToSave || 0), color: 'accent' },
    { id: 'baby', name: '育儿储备金', target: sum.babyTotal || 130000, account: 'baby', year: null, color: 'warm' },
    { id: 'emergency', name: '应急储备金', target: +p.emergencyTarget || 60000, account: 'emergency', year: null, color: 'success' }
  ]
}
function goalProgress(g) {
  const balance = accountBalance(g.account)
  const pct = g.target > 0 ? Math.min(100, balance / g.target * 100) : 0
  return { balance, pct }
}

/** 净资产时序（最近 n 个月，月末值），用于趋势柱图 */
function netWorthSeries(n) {
  const openingsTotal = cache.accounts.reduce((s, a) => s + (+a.opening || 0), 0)
  const now = new Date()
  const arr = []
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const yy = d.getFullYear()
    const mm = d.getMonth() + 1
    const monthEnd = yy + '-' + pad(mm) + '-31'
    const cum = cache.checkins.filter(c => c.date && c.date <= monthEnd).reduce((s, c) => s + (+c.amount || 0), 0)
    arr.push({ label: (mm) + '月', value: openingsTotal + cum })
  }
  return arr
}

/** 最近一个有记录月份的分账户分配 */
function latestAllocation() {
  const months = cache.checkins.map(c => c.date.slice(0, 7)).sort().reverse()
  if (!months.length) return []
  const latest = months[0]
  const rows = cache.accounts.map(a => {
    const amount = cache.checkins.filter(c => c.account === a.id && c.date.slice(0, 7) === latest).reduce((s, c) => s + (+c.amount || 0), 0)
    return { accountId: a.id, name: a.name, color: a.color, amount }
  }).filter(r => r.amount > 0)
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1
  rows.forEach(r => r.pct = r.amount / total * 100)
  return rows
}

/** 历史记录（倒序，带各账户当时余额） */
function history() {
  const byDateDesc = (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  cache.accounts.forEach(a => {
    const list = cache.checkins.filter(c => c.account === a.id).slice().sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0)
    let bal = +a.opening || 0
    list.forEach(c => { bal += +c.amount || 0; c._bal = bal })
  })
  return cache.checkins.slice().sort(byDateDesc).map(c => {
    const acc = cache.accounts.find(a => a.id === c.account) || {}
    return {
      id: c.id, date: c.date, accountId: c.account,
      accountName: acc.name || c.account, color: acc.color || 'accent',
      amount: +c.amount || 0, balance: c._bal || 0,
      category: c.category || '', note: c.note || ''
    }
  })
}

/** 颜色 key → CSS 变量 */
function colorVar(key) {
  return 'var(--' + (key || 'accent') + ')'
}

export default {
  load, save, resetData,
  getProfile, saveProfile,
  getAccounts, saveAccounts,
  getCheckins, addCheckin, deleteCheckin,
  accountBalance, netWorth, monthTotal, yearTotal, avgMonthly,
  monthlyStatus, currentStreak, goals, goalProgress,
  netWorthSeries, latestAllocation, history, colorVar
}
