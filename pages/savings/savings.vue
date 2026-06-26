<template>
  <view class="page">
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="topbar">
      <view>
        <text class="topbar-title">储蓄追踪</text>
        <text class="topbar-sub">月度打卡 · 目标进度 · 资金分配</text>
      </view>
      <view class="topbar-btn" @click="sheet = true">+ 记一笔</view>
    </view>

    <view class="content">
      <!-- 进度环 + 数据 -->
      <view class="card ring-card">
        <progress-ring :pct="downPct" :size="280" :stroke="26" color="var(--accent)">
          <text class="big-pct font-num">{{ downPct.toFixed(1) }}<text class="big-sym">%</text></text>
          <text class="big-lbl">首付目标进度</text>
        </progress-ring>
        <text class="ring-sum">已存 {{ fmtFull(downBalance) }} / {{ fmtFull(downTarget) }}</text>
        <text class="ring-sub">还需 {{ fmtFull(Math.max(0, downTarget - downBalance)) }} 元 · 预计 {{ downEta.toFixed(1) }} 年</text>

        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">本月已存</text>
            <text class="info-val font-num">{{ fmtFull(monthTotal) }}<text class="u">元</text></text>
            <text class="info-delta" style="color:var(--success)">{{ monthPct }}% 目标</text>
          </view>
          <view class="info-item">
            <text class="info-label">今年累计</text>
            <text class="info-val font-num">{{ fmtFull(yearTotal) }}<text class="u">元</text></text>
            <text class="info-delta" style="color:var(--accent)">{{ doneMonths }} / 12 月</text>
          </view>
          <view class="info-item">
            <text class="info-label">连续打卡</text>
            <text class="info-val font-num">{{ streak }}<text class="u">个月</text></text>
            <text class="info-delta" style="color:var(--warm)">🔥 保持中</text>
          </view>
          <view class="info-item">
            <text class="info-label">总净资产</text>
            <text class="info-val font-num">{{ fmtFull(netWorth) }}<text class="u">元</text></text>
            <text class="info-delta" style="color:var(--info)">含收益</text>
          </view>
        </view>
      </view>

      <!-- 年度打卡 -->
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">{{ currentYear }} 年度打卡</text>
            <text class="card-sub">每月存入情况</text>
          </view>
          <view class="legend">
            <text class="legend-item"><text class="dot" style="background:var(--success-soft);border:3rpx solid var(--success)"></text>达标</text>
            <text class="legend-item"><text class="dot" style="background:var(--warm-soft);border:3rpx solid var(--warm)"></text>部分</text>
            <text class="legend-item"><text class="dot" style="background:var(--surface-2);border:3rpx solid var(--border)"></text>未到</text>
          </view>
        </view>
        <view class="checkin-grid">
          <view class="checkin-cell" :class="c.status" v-for="c in calendar" :key="c.m">
            <text class="cm-m">{{ c.m }}月</text>
            <text class="cm-a">{{ c.total > 0 ? fmt(c.total) : '—' }}</text>
          </view>
        </view>
        <view class="year-foot">
          <text>年度目标 <text class="font-num b">{{ fmtFull(yearTarget) }}</text> 元</text>
          <text>已完成 <text class="font-num b" style="color:var(--success)">{{ fmtFull(yearTotal) }}</text> 元</text>
          <text class="b" style="color:var(--accent)">{{ yearPct }}%</text>
        </view>
      </view>

      <!-- 三大目标 -->
      <view class="card">
        <text class="card-title">目标进度</text>
        <text class="card-sub">三大里程碑资金累积</text>
        <view class="goal-card" v-for="g in goals" :key="g.id">
          <view class="goal-head">
            <view class="goal-ico" :style="{ background: soft(g.color), color: colorVar(g.color) }">{{ emoji(g.color) }}</view>
            <view class="goal-main">
              <view class="goal-top">
                <text class="goal-name">{{ g.name }}</text>
                <text class="goal-pct font-num" :style="{ color: colorVar(g.color) }">{{ g.pct.toFixed(1) }}%</text>
              </view>
              <view class="goal-bar"><view class="goal-bar-fill" :style="{ width: g.pct + '%', background: colorVar(g.color) }"></view></view>
              <text class="goal-amt">{{ fmt(g.balance) }} / {{ fmt(g.target) }}<text v-if="g.year"> · {{ g.year }}年</text></text>
            </view>
          </view>
        </view>
      </view>

      <!-- 资金分配（最近一月） -->
      <view class="card" v-if="alloc.length">
        <text class="card-title">资金分配（最近一月）</text>
        <text class="card-sub">月存 {{ fmtFull(allocTotal) }} 元的配置</text>
        <view class="alloc-row" v-for="a in alloc" :key="a.accountId">
          <view class="alloc-dot" :style="{ background: colorVar(a.color) }"></view>
          <text class="alloc-name">{{ a.name }}</text>
          <view class="alloc-bar"><view class="alloc-fill" :style="{ width: a.pct + '%', background: colorVar(a.color) }"></view></view>
          <text class="alloc-val font-num">{{ fmtFull(a.amount) }}元</text>
        </view>
      </view>

      <!-- 趋势柱图 -->
      <view class="card">
        <text class="card-title">净资产增长趋势</text>
        <text class="card-sub">近 {{ trend.length }} 个月</text>
        <view class="chart">
          <view class="bar-col" v-for="(t, i) in trend" :key="i">
            <text class="bar-val font-num">{{ fmt(t.value) }}</text>
            <view class="bar-track"><view class="bar" :style="{ height: barHeight(t.value) + '%', background: i === trend.length - 1 ? 'var(--accent)' : 'var(--accent-light)' }"></view></view>
            <text class="bar-label">{{ t.label }}</text>
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="card">
        <text class="card-title">存款记录（{{ history.length }} 笔）</text>
        <view class="hist-row" v-for="h in history" :key="h.id">
          <view class="hist-dot" :style="{ background: colorVar(h.color) }"></view>
          <view class="hist-main">
            <view class="hist-line1">
              <text class="hist-cat">{{ h.category || '打卡' }} · {{ h.accountName }}</text>
              <text class="hist-amt font-num" style="color:var(--success)">+{{ fmtFull(h.amount) }}</text>
            </view>
            <view class="hist-line2">
              <text class="hist-date">{{ h.date }}</text>
              <text class="hist-bal font-num">余额 {{ fmtFull(h.balance) }}</text>
            </view>
          </view>
          <text class="hist-del" @click="del(h)">✕</text>
        </view>
        <view v-if="!history.length" class="empty">暂无记录，点右上角"记一笔"</view>
      </view>

      <view style="height: 180rpx"></view>
    </view>

    <bottom-nav active="savings" @checkin="sheet = true" />
    <checkin-sheet :visible="sheet" @close="sheet = false" @saved="onSaved" />
  </view>
</template>

<script>
import db from '../../store/db.js'
import calc from '../../utils/calc.js'
import ProgressRing from '../../components/progress-ring.vue'
import BottomNav from '../../components/bottom-nav.vue'
import CheckinSheet from '../../components/checkin-sheet.vue'

export default {
  components: { ProgressRing, BottomNav, CheckinSheet },
  data() {
    return {
      statusBarHeight: 20,
      sheet: false,
      profile: {},
      netWorth: 0,
      downBalance: 0,
      downTarget: 0,
      downPct: 0,
      downEta: 0,
      monthTotal: 0,
      monthPct: 0,
      yearTotal: 0,
      yearTarget: 0,
      yearPct: 0,
      doneMonths: 0,
      streak: 0,
      calendar: [],
      goals: [],
      alloc: [],
      trend: [],
      history: [],
      currentYear: new Date().getFullYear(),
      trendMax: 1
    }
  },
  computed: {
    allocTotal() { return this.alloc.reduce((s, a) => s + a.amount, 0) }
  },
  onLoad() {
    try { this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20 } catch (e) {}
  },
  onShow() { this.refresh() },
  methods: {
    fmt: calc.fmt,
    fmtFull: calc.fmtFull,
    colorVar: db.colorVar,
    soft(key) { return 'var(--' + key + '-soft)' },
    emoji(color) { return { accent: '🏠', warm: '👶', success: '🛡️', info: '📈' }[color] || '💰' },
    onSaved() { this.sheet = false; this.refresh() },
    barHeight(v) {
      if (this.trendMax <= 0) return 0
      return Math.max(8, Math.round(v / this.trendMax * 100))
    },
    del(h) {
      uni.showModal({
        title: '删除记录',
        content: '确定删除 ' + h.date + ' 的 ' + fmtFull(h.amount) + ' 元记录？',
        success: r => {
          if (r.confirm) { db.deleteCheckin(h.id); this.refresh(); uni.showToast({ title: '已删除', icon: 'none' }) }
        }
      })
    },
    refresh() {
      const now = new Date()
      const cy = now.getFullYear()
      const cm = now.getMonth() + 1
      this.profile = db.getProfile()
      this.netWorth = db.netWorth()
      this.monthTotal = db.monthTotal(cy, cm)
      const target = this.profile.monthlyTarget || 8000
      this.monthPct = target > 0 ? Math.round(this.monthTotal / target * 100) : 0
      this.yearTotal = db.yearTotal(cy)
      this.yearTarget = target * 12
      this.yearPct = this.yearTarget > 0 ? Math.min(100, Math.round(this.yearTotal / this.yearTarget * 1000) / 10) : 0
      this.calendar = db.monthlyStatus(cy)
      this.doneMonths = this.calendar.filter(c => c.status === 'done').length
      this.streak = db.currentStreak()

      // 首付目标
      const sum = calc.plannerSummary(this.profile, db.accountBalance('down'))
      this.downTarget = sum.downAmt
      this.downBalance = db.accountBalance('down')
      this.downPct = this.downTarget > 0 ? Math.min(100, this.downBalance / this.downTarget * 100) : 0
      this.downEta = sum.timeToSave

      // 目标
      this.goals = db.goals().map(g => { const p = db.goalProgress(g); return Object.assign({}, g, { balance: p.balance, pct: p.pct }) })

      // 分配 / 趋势 / 历史
      this.alloc = db.latestAllocation()
      this.trend = db.netWorthSeries(6)
      this.trendMax = Math.max.apply(null, this.trend.map(t => t.value)) || 1
      this.history = db.history().slice(0, 50)
    }
  }
}

function fmtFull(n) { return Math.round(n).toLocaleString('zh-CN') }
</script>

<style scoped>
.page { min-height: 100vh; }
.statusbar { background: var(--surface); }
.topbar { padding: 16rpx 32rpx 24rpx; background: var(--surface); border-bottom: 2rpx solid var(--border); display: flex; align-items: flex-end; justify-content: space-between; }
.topbar-title { display: block; font-size: 40rpx; font-weight: 800; color: var(--fg-strong); }
.topbar-sub { display: block; font-size: 24rpx; color: var(--muted); margin-top: 4rpx; }
.topbar-btn { background: var(--accent); color: #fff; font-size: 26rpx; font-weight: 700; padding: 16rpx 28rpx; border-radius: 999rpx; }

.content { padding: 32rpx; }
.card { background: var(--surface); border: 2rpx solid var(--border); border-radius: 36rpx; padding: 36rpx; margin-bottom: 32rpx; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; }
.card-title { display: block; font-size: 32rpx; font-weight: 800; color: var(--fg-strong); }
.card-sub { display: block; font-size: 24rpx; color: var(--muted); margin: 4rpx 0 28rpx; }

/* 进度环卡 */
.ring-card { display: flex; flex-direction: column; align-items: center; }
.big-pct { font-size: 72rpx; font-weight: 800; color: var(--fg-strong); line-height: 1; }
.big-sym { font-size: 36rpx; color: var(--muted); }
.big-lbl { font-size: 24rpx; color: var(--muted); font-weight: 600; margin-top: 8rpx; }
.ring-sum { font-size: 32rpx; font-weight: 700; color: var(--fg-strong); margin-top: 24rpx; }
.ring-sub { font-size: 24rpx; color: var(--muted); margin-top: 6rpx; margin-bottom: 32rpx; }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; width: 100%; }
.info-item { background: var(--surface-2); border-radius: 20rpx; padding: 24rpx; }
.info-label { font-size: 24rpx; color: var(--muted); font-weight: 600; }
.info-val { display: block; font-size: 40rpx; font-weight: 800; color: var(--fg-strong); margin-top: 6rpx; }
.info-val .u { font-size: 22rpx; color: var(--muted); }
.info-delta { display: block; font-size: 22rpx; font-weight: 700; margin-top: 4rpx; }

/* legend */
.legend { display: flex; flex-direction: column; gap: 8rpx; }
.legend-item { font-size: 20rpx; color: var(--muted); display: flex; align-items: center; gap: 8rpx; }
.dot { width: 20rpx; height: 20rpx; border-radius: 6rpx; display: inline-block; }

/* 月历 */
.checkin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.checkin-cell { aspect-ratio: 1.1; border-radius: 20rpx; border: 4rpx solid transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.cm-m { font-size: 20rpx; }
.cm-a { font-size: 22rpx; font-weight: 700; }
.checkin-cell.done { background: var(--success-soft); border-color: var(--success); }
.checkin-cell.done .cm-m, .checkin-cell.done .cm-a { color: var(--success); }
.checkin-cell.partial { background: var(--warm-soft); border-color: var(--warm); }
.checkin-cell.partial .cm-m, .checkin-cell.partial .cm-a { color: var(--warm); }
.checkin-cell.current { background: var(--accent-soft); border-color: var(--accent); }
.checkin-cell.current .cm-m, .checkin-cell.current .cm-a { color: var(--accent); }
.checkin-cell.missed { background: var(--danger-soft); border-color: var(--danger); }
.checkin-cell.missed .cm-m, .checkin-cell.missed .cm-a { color: var(--danger); }
.checkin-cell.future { background: var(--surface-2); border-color: var(--border); }
.checkin-cell.future .cm-m, .checkin-cell.future .cm-a { color: var(--muted-2); }
.year-foot { display: flex; justify-content: space-between; margin-top: 28rpx; padding-top: 20rpx; border-top: 2rpx solid var(--border); font-size: 24rpx; color: var(--muted); }
.b { font-weight: 700; color: var(--fg-strong); }

/* 目标 */
.goal-card { background: var(--surface-2); border: 2rpx solid var(--border); border-radius: 24rpx; padding: 24rpx; margin-top: 20rpx; }
.goal-head { display: flex; gap: 20rpx; align-items: center; }
.goal-ico { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; flex-shrink: 0; }
.goal-main { flex: 1; min-width: 0; }
.goal-top { display: flex; justify-content: space-between; }
.goal-name { font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }
.goal-pct { font-size: 26rpx; font-weight: 800; }
.goal-bar { width: 100%; height: 12rpx; background: var(--surface); border-radius: 999rpx; overflow: hidden; margin: 12rpx 0 8rpx; }
.goal-bar-fill { height: 100%; border-radius: 999rpx; }
.goal-amt { font-size: 22rpx; color: var(--muted); }

/* 分配 */
.alloc-row { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 0; border-bottom: 2rpx solid var(--border); }
.alloc-row:last-child { border-bottom: 0; }
.alloc-dot { width: 24rpx; height: 24rpx; border-radius: 6rpx; flex-shrink: 0; }
.alloc-name { flex: 1; font-size: 26rpx; font-weight: 600; color: var(--fg); }
.alloc-bar { flex: 2; height: 16rpx; background: var(--surface-2); border-radius: 999rpx; overflow: hidden; }
.alloc-fill { height: 100%; border-radius: 999rpx; }
.alloc-val { font-size: 28rpx; font-weight: 700; color: var(--fg-strong); min-width: 140rpx; text-align: right; }

/* 柱图 */
.chart { display: flex; align-items: flex-end; gap: 16rpx; height: 320rpx; padding-top: 20rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; height: 100%; justify-content: flex-end; }
.bar-val { font-size: 18rpx; font-weight: 700; color: var(--fg-strong); }
.bar-track { width: 100%; max-width: 80rpx; flex: 1; display: flex; align-items: flex-end; }
.bar { width: 100%; border-radius: 8rpx 8rpx 0 0; min-height: 16rpx; }
.bar-label { font-size: 18rpx; color: var(--muted); }

/* 历史 */
.hist-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 2rpx solid var(--border); }
.hist-row:last-child { border-bottom: 0; }
.hist-dot { width: 20rpx; height: 20rpx; border-radius: 6rpx; flex-shrink: 0; }
.hist-main { flex: 1; min-width: 0; }
.hist-line1 { display: flex; justify-content: space-between; }
.hist-cat { font-size: 28rpx; font-weight: 600; color: var(--fg-strong); }
.hist-amt { font-size: 30rpx; font-weight: 800; }
.hist-line2 { display: flex; justify-content: space-between; margin-top: 6rpx; }
.hist-date { font-size: 22rpx; color: var(--muted); }
.hist-bal { font-size: 22rpx; color: var(--muted); }
.hist-del { width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; color: var(--muted-2); font-size: 28rpx; }
.empty { text-align: center; color: var(--muted); font-size: 26rpx; padding: 40rpx 0; }
</style>
