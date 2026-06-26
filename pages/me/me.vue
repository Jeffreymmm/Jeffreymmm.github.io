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
          <text class="field-label">应急储备目标</text>
          <view class="num-row"><text class="prefix">¥</text><input class="num-input" type="number" v-model.number="form.emergencyTarget" /></view>
        </view>
      </view>

      <!-- 账户余额（编辑初始值，当前余额 = 初始 + 打卡累计）-->
      <view class="card">
        <text class="card-title">账户初始余额</text>
        <text class="card-sub">当前余额 = 初始 + 该账户打卡累计</text>
        <view class="acct-row" v-for="a in accounts" :key="a.id">
          <view class="acct-dot" :style="{ background: colorVar(a.color) }"></view>
          <view class="acct-info">
            <text class="acct-name">{{ a.name }}</text>
            <text class="acct-bal font-num">当前余额 {{ fmtFull(acctBalance(a.id)) }}</text>
          </view>
          <view class="acct-input">
            <input class="num-input acct-num" type="number" v-model.number="a.opening" />
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

      <view class="about">人生规划器 v1.0.0 · 数据本地存储</view>
      <view style="height: 180rpx"></view>
    </view>

    <bottom-nav active="me" @checkin="sheet = true" />
    <checkin-sheet :visible="sheet" @close="sheet = false" @saved="sheet = false" />
  </view>
</template>

<script>
import db from '../../store/db.js'
import calc from '../../utils/calc.js'
import BottomNav from '../../components/bottom-nav.vue'
import CheckinSheet from '../../components/checkin-sheet.vue'

export default {
  components: { BottomNav, CheckinSheet },
  data() {
    return {
      statusBarHeight: 20,
      sheet: false,
      form: {},
      accounts: []
    }
  },
  onLoad() {
    try { this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20 } catch (e) {}
  },
  onShow() {
    this.form = Object.assign({}, db.getProfile())
    this.accounts = db.getAccounts().map(a => Object.assign({}, a))
  },
  methods: {
    fmtFull: calc.fmtFull,
    colorVar: db.colorVar,
    acctBalance(id) { return db.accountBalance(id) },
    save() {
      db.saveProfile(this.form)
      db.saveAccounts(this.accounts.map(a => ({ id: a.id, name: a.name, opening: +a.opening || 0, color: a.color })))
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
            this.accounts = db.getAccounts().map(a => Object.assign({}, a))
            uni.showToast({ title: '已重置', icon: 'success' })
          }
        }
      })
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
.dm-arrow { font-size: 36rpx; color: var(--muted-2); }
.dm-tip { font-size: 22rpx; color: var(--muted); line-height: 1.5; }

.about { text-align: center; font-size: 22rpx; color: var(--muted-2); margin-top: 16rpx; }
</style>
