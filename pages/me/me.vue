<template>
  <view class="page">
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="topbar">
      <text class="topbar-title">我的</text>
    </view>

    <view class="content">
      <!-- 个人卡片 -->
      <view class="profile-card">
        <view class="avatar">{{ (form.name || '我').slice(0, 1) }}</view>
        <view class="profile-info">
          <text class="profile-name">{{ form.name }}</text>
          <text class="profile-meta">{{ form.city }} · {{ form.age }} 岁 · 月目标 {{ fmtFull(form.monthlyTarget) }} 元</text>
        </view>
      </view>

      <!-- 基础资料 -->
      <view class="card">
        <text class="card-title">基础资料</text>
        <view class="field">
          <text class="field-label">昵称</text>
          <input class="text-input" v-model="form.name" placeholder="你的昵称" />
        </view>
        <view class="field">
          <text class="field-label">所在城市</text>
          <input class="text-input" v-model="form.city" placeholder="如 北京" />
        </view>
        <view class="field-row">
          <view class="field half">
            <text class="field-label">当前年龄</text>
            <view class="num-row"><input class="num-input" type="number" v-model.number="form.age" /><text class="suffix">岁</text></view>
          </view>
          <view class="field half">
            <text class="field-label">激励语</text>
            <input class="text-input" v-model="form.greeting" placeholder="继续加油" />
          </view>
        </view>
      </view>

      <!-- 目标设置 -->
      <view class="card">
        <text class="card-title">目标设置</text>
        <view class="field">
          <text class="field-label">每月存款目标</text>
          <view class="num-row"><text class="prefix">¥</text><input class="num-input" type="number" v-model.number="form.monthlyTarget" /></view>
        </view>
        <view class="field">
          <text class="field-label">育儿储备目标</text>
          <view class="num-row"><text class="prefix">¥</text><input class="num-input" type="number" v-model.number="form.babyTarget" /></view>
        </view>
        <view class="field">
          <text class="field-label">应急储备目标</text>
          <view class="num-row"><text class="prefix">¥</text><input class="num-input" type="number" v-model.number="form.emergencyTarget" /></view>
        </view>
      </view>

      <!-- 账户余额（直接编辑当前持有金额，保存时反算初始值，保持单一数据源）-->
      <view class="card">
        <text class="card-title">账户余额</text>
        <text class="card-sub">设置各账户当前持有金额，目标完成度按此计算</text>
        <view class="acct-row" v-for="a in accounts" :key="a.id">
          <view class="acct-dot" :style="{ background: colorVar(a.color) }"></view>
          <view class="acct-info">
            <text class="acct-name">{{ a.name }}</text>
            <text class="acct-bal font-num">已打卡累计 {{ fmtFull(a.checkinSum) }}</text>
          </view>
          <view class="acct-input">
            <input class="num-input acct-num" type="number" v-model.number="a.balance" />
          </view>
        </view>
      </view>

      <button class="save-btn" @click="save">保存全部修改</button>

      <!-- 数据管理 -->
      <view class="card">
        <text class="card-title">数据管理</text>
        <view class="dm-row" @click="reset">
          <text class="dm-name">重置全部数据</text>
          <text class="dm-arrow">›</text>
        </view>
        <view class="dm-tip">数据均保存在本机（离线），重置后恢复演示种子数据。</view>
      </view>

      <!-- 云同步 -->
      <view class="card">
        <text class="card-title">云同步</text>
        <view class="dm-row" @click="openSyncSheet">
          <text class="dm-name-normal">同步设置</text>
          <text class="dm-arrow">›</text>
        </view>
        <view class="dm-row" @click="uploadCloud">
          <text class="dm-name-normal">上传到云端</text>
          <text class="dm-arrow">›</text>
        </view>
        <view class="dm-row" @click="downloadCloud">
          <text class="dm-name-normal">从云端恢复</text>
          <text class="dm-arrow">›</text>
        </view>
        <view class="dm-row" @click="clearCloud">
          <text class="dm-name">清除云端配置</text>
          <text class="dm-arrow">›</text>
        </view>
        <view class="dm-tip">通过 GitHub Gist 跨设备同步。Token 仅本地存储，请勿在公共设备保留。</view>
      </view>

      <view class="about">人生规划器 v1.0.0 · 数据本地存储</view>
      <view style="height: 180rpx"></view>
    </view>

    <bottom-nav active="me" @checkin="sheet = true" />
    <checkin-sheet :visible="sheet" @close="sheet = false" @saved="sheet = false" />
    <sync-sheet :visible="syncSheet" @close="syncSheet = false" @saved="onSyncSaved" />
  </view>
</template>

<script>
import db from '../../store/db.js'
import calc from '../../utils/calc.js'
import BottomNav from '../../components/bottom-nav.vue'
import CheckinSheet from '../../components/checkin-sheet.vue'
import cloud from '../../store/cloud.js'
import SyncSheet from '../../components/sync-sheet.vue'

export default {
  components: { BottomNav, CheckinSheet, SyncSheet },
  data() {
    return {
      statusBarHeight: 20,
      sheet: false,
      syncSheet: false,
      form: {},
      accounts: []
    }
  },
  onLoad() {
    try { this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20 } catch (e) {}
  },
  onShow() {
    this.form = Object.assign({}, db.getProfile())
    this.loadAccounts()
  },
  methods: {
    fmtFull: calc.fmtFull,
    colorVar: db.colorVar,
    // 加载账户并附加当前持有(balance)与打卡累计(checkinSum)，用于直接编辑持有金额
    loadAccounts() {
      this.accounts = db.getAccounts().map(a => {
        const opening = +a.opening || 0
        const balance = db.accountBalance(a.id)
        return Object.assign({}, a, { opening, balance, checkinSum: balance - opening })
      })
    },
    save() {
      db.saveProfile(this.form)
      // 持有金额反算为初始值，维持"当前余额 = 初始 + 打卡累计"的单一数据源
      db.saveAccounts(this.accounts.map(a => ({
        id: a.id, name: a.name, color: a.color,
        opening: (+a.balance || 0) - (a.checkinSum || 0)
      })))
      this.loadAccounts()
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    reset() {
      uni.showModal({
        title: '重置数据',
        content: '将清除所有打卡记录与修改，恢复演示数据，确定？',
        confirmColor: '#e5484d',
        success: r => {
          if (r.confirm) {
            db.resetData()
            this.form = Object.assign({}, db.getProfile())
            this.loadAccounts()
            uni.showToast({ title: '已重置', icon: 'success' })
          }
        }
      })
    },
    // ===== 云同步 =====
    openSyncSheet() { this.syncSheet = true },
    onSyncSaved() { this.syncSheet = false },
    // 重读本机数据（云恢复后刷新当前页展示）
    refreshFromDb() {
      this.form = Object.assign({}, db.getProfile())
      this.loadAccounts()
    },
    uploadCloud() {
      if (!cloud.hasToken()) {
        uni.showToast({ title: '请先配置同步', icon: 'none' })
        this.syncSheet = true
        return
      }
      uni.showLoading({ title: '上传中...', mask: true })
      cloud.push().then(() => {
        uni.hideLoading()
        uni.showToast({ title: '已上传', icon: 'success' })
      }).catch(e => {
        uni.hideLoading()
        this.showCloudError(e)
      })
    },
    downloadCloud() {
      if (!cloud.hasToken()) {
        uni.showToast({ title: '请先配置同步', icon: 'none' })
        this.syncSheet = true
        return
      }
      uni.showModal({
        title: '从云端恢复',
        content: '将用云端数据覆盖本机，确定？',
        confirmColor: '#e5484d',
        success: r => {
          if (!r.confirm) return
          uni.showLoading({ title: '同步中...', mask: true })
          cloud.restoreFromCloud(true).then(res => {
            uni.hideLoading()
            if (res && res.restored) {
              this.refreshFromDb()
              uni.showToast({ title: '已恢复', icon: 'success' })
            } else {
              uni.showToast({ title: '云端无更新', icon: 'none' })
            }
          }).catch(e => {
            uni.hideLoading()
            this.showCloudError(e)
          })
        }
      })
    },
    clearCloud() {
      uni.showModal({
        title: '清除配置',
        content: '仅清除本机同步配置（Token 等），不影响已上传的云端数据，确定？',
        confirmColor: '#e5484d',
        success: r => {
          if (r.confirm) {
            cloud.clearConfig()
            uni.showToast({ title: '已清除', icon: 'success' })
          }
        }
      })
    },
    showCloudError(e) {
      uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; }
.statusbar { background: var(--surface); }
.topbar { padding: 16rpx 32rpx 24rpx; background: var(--surface); border-bottom: 2rpx solid var(--border); }
.topbar-title { font-size: 40rpx; font-weight: 800; color: var(--fg-strong); }

.content { padding: 32rpx; }

.profile-card { display: flex; align-items: center; gap: 24rpx; background: var(--surface); border: 2rpx solid var(--border); border-radius: 36rpx; padding: 36rpx; margin-bottom: 32rpx; }
.avatar { width: 112rpx; height: 112rpx; border-radius: 50%; background: var(--warm-soft); color: var(--warm); display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 800; }
.profile-info { flex: 1; }
.profile-name { display: block; font-size: 36rpx; font-weight: 800; color: var(--fg-strong); }
.profile-meta { display: block; font-size: 24rpx; color: var(--muted); margin-top: 6rpx; }

.card { background: var(--surface); border: 2rpx solid var(--border); border-radius: 36rpx; padding: 36rpx; margin-bottom: 32rpx; }
.card-title { display: block; font-size: 32rpx; font-weight: 800; color: var(--fg-strong); }
.card-sub { display: block; font-size: 24rpx; color: var(--muted); margin: 4rpx 0 28rpx; }

.field { margin-top: 24rpx; }
.field-row { display: flex; gap: 24rpx; margin-top: 24rpx; }
.field.half { flex: 1; }
.field-label { display: block; font-size: 24rpx; font-weight: 600; color: var(--muted); margin-bottom: 10rpx; }
.text-input { height: 80rpx; border: 2rpx solid var(--border); border-radius: 20rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--fg-strong); background: var(--surface); }
.num-row { display: flex; align-items: center; border: 2rpx solid var(--border); border-radius: 20rpx; overflow: hidden; background: var(--surface); }
.prefix, .suffix { padding: 0 20rpx; height: 80rpx; line-height: 80rpx; font-size: 26rpx; color: var(--muted); background: var(--surface-2); }
.num-input { flex: 1; height: 80rpx; font-size: 30rpx; font-weight: 700; color: var(--fg-strong); padding: 0 20rpx; }

.acct-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 2rpx solid var(--border); }
.acct-row:last-child { border-bottom: 0; }
.acct-dot { width: 24rpx; height: 24rpx; border-radius: 6rpx; flex-shrink: 0; }
.acct-info { flex: 1; }
.acct-name { display: block; font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }
.acct-bal { display: block; font-size: 22rpx; color: var(--muted); margin-top: 4rpx; }
.acct-input { width: 280rpx; }
.acct-num { text-align: right; }

.save-btn { width: 100%; height: 96rpx; line-height: 96rpx; border-radius: 24rpx; background: var(--accent); color: #fff; font-size: 30rpx; font-weight: 700; border: 0; margin-bottom: 32rpx; }
.save-btn::after { border: none; }

.dm-row { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; }
.dm-name { font-size: 28rpx; font-weight: 600; color: var(--danger); }
.dm-name-normal { font-size: 28rpx; font-weight: 600; color: var(--fg-strong); }
.dm-arrow { font-size: 36rpx; color: var(--muted-2); }
.dm-tip { font-size: 22rpx; color: var(--muted); line-height: 1.5; }

.about { text-align: center; font-size: 22rpx; color: var(--muted-2); margin-top: 16rpx; }
</style>
