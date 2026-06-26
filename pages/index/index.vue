<template>
  <view class="page">
    <!-- 状态栏占位 -->
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 头部 -->
    <view class="header">
      <view>
        <view class="hdr-greet">{{ greeting }}</view>
        <view class="hdr-name">{{ name }}，{{ profile.greeting || '继续加油' }}</view>
      </view>
      <view class="hdr-avatar">{{ (name || '我').slice(0, 1) }}</view>
    </view>

    <view class="content">
      <!-- 净资产卡 -->
      <view class="nw-card">
        <view class="nw-glow"></view>
        <view class="nw-label">总净资产</view>
        <view class="nw-value font-num">{{ fmtFull(netWorth) }}<text class="nw-unit">元</text></view>
        <view class="nw-delta">↑ 本月 +{{ fmtFull(monthTotal) }} · {{ health }}</view>
        <view class="nw-alloc">
          <view class="nw-alloc-item" v-for="a in allocs" :key="a.id">
            <view class="nw-alloc-label">{{ a.name }}</view>
            <view class="nw-alloc-val font-num">{{ fmtFull(a.balance) }}</view>
          </view>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="qa-row">
        <view class="qa-btn" @click="openSheet">
          <view class="qa-ico" style="background: var(--accent-soft); color: var(--accent)">✓</view>
          <text class="qa-label">存钱打卡</text>
        </view>
        <view class="qa-btn" @click="go('/pages/planner/planner')">
          <view class="qa-ico" style="background: var(--warm-soft); color: var(--warm)">📊</view>
          <text class="qa-label">模拟器</text>
        </view>
        <view class="qa-btn" @click="go('/pages/savings/savings')">
          <view class="qa-ico" style="background: var(--info-soft); color: var(--info)">📈</view>
          <text class="qa-label">储蓄趋势</text>
        </view>
        <view class="qa-btn" @click="go('/pages/me/me')">
          <view class="qa-ico" style="background: var(--success-soft); color: var(--success)">👤</view>
          <text class="qa-label">我的</text>
        </view>
      </view>

      <!-- 连续达标横幅 -->
      <view class="streak">
        <text class="streak-emoji">🔥</text>
        <view class="streak-info">
          <view class="streak-head">连续 {{ streak }} 个月达标！</view>
          <view class="streak-detail">今年已存 {{ fmtFull(yearTotal) }} 元</view>
        </view>
        <view class="streak-count font-num">{{ streak }}<text class="u">月</text></view>
      </view>

      <!-- 首付进度 -->
      <view class="card">
        <view class="card-title">首付目标进度</view>
        <view class="card-sub">目标 {{ fmt(downTarget) }} · 预计 {{ downYear }} 年购房</view>
        <view class="ring-row">
          <progress-ring :pct="downPct" :size="200" :stroke="18" color="var(--accent)">
            <text class="ring-pct font-num">{{ downPct.toFixed(1) }}<text class="ring-sym">%</text></text>
            <text class="ring-lbl">已完成</text>
          </progress-ring>
          <view class="ring-info">
            <view class="ring-amount font-num">{{ fmtFull(downBalance) }}<text class="ring-amt-unit"> / {{ fmt(downTarget) }}</text></view>
            <view class="ring-break">月存 {{ fmtFull(profile.income * profile.saveRate / 100) }} 元</view>
            <view class="ring-eta">⏱ 预计 {{ downEta.toFixed(1) }} 年后达标</view>
          </view>
        </view>
      </view>

      <!-- 三大里程碑 -->
      <view class="card">
        <view class="card-title">三大里程碑</view>
        <view class="card-sub">资金累积进度</view>
        <view class="goal" v-for="g in goals" :key="g.id">
          <view class="goal-ico" :style="{ background: soft(g.color), color: colorVar(g.color) }">{{ goalEmoji(g.color) }}</view>
          <view class="goal-info">
            <view class="goal-top">
              <text class="goal-name">{{ g.name }}</text>
              <text class="goal-pct font-num" :style="{ color: colorVar(g.color) }">{{ g.pct.toFixed(1) }}%</text>
            </view>
            <view class="goal-bar"><view class="goal-bar-fill" :style="{ width: g.pct + '%', background: colorVar(g.color) }"></view></view>
            <view class="goal-amt">{{ fmt(g.balance) }} / {{ fmt(g.target) }}<text v-if="g.year"> · {{ g.year }}年</text></view>
          </view>
        </view>
      </view>

      <!-- 月度打卡 -->
      <view class="card">
        <view class="card-title">{{ currentYear }} 存钱打卡</view>
        <view class="card-sub">连续达标，再接再厉</view>
        <view class="cal-grid">
          <view class="cal-cell" :class="c.status" v-for="c in calendar" :key="c.m">
            <text class="cal-m">{{ c.m }}月</text>
            <text class="cal-a">{{ c.total > 0 ? fmt(c.total) : '—' }}</text>
          </view>
        </view>
        <view class="cal-foot">
          <text class="cal-foot-label">年度目标 <text class="font-num cal-foot-val">{{ fmt(yearTarget) }}</text></text>
          <text class="cal-foot-label">已完成 <text class="font-num" style="color: var(--success); font-weight: 700">{{ fmt(yearTotal) }}</text></text>
          <text class="cal-foot-pct">{{ yearPct }}%</text>
        </view>
      </view>

      <!-- 快速模拟器 -->
      <view class="card">
        <view class="card-title">快速模拟器</view>
        <view class="card-sub">调整参数即时看结果</view>

        <view class="sim-row">
          <view class="sim-label"><text>月收入</text><text class="sim-val font-num">{{ fmtFull(simIncome) }}元</text></view>
          <slider class="sim-slider" :min="5000" :max="60000" :step="1000" :value="simIncome" @changing="simIncome = $event.detail.value" />
        </view>
        <view class="sim-row">
          <view class="sim-label"><text>储蓄率</text><text class="sim-val font-num">{{ simRate }}%</text></view>
          <slider class="sim-slider" :min="10" :max="70" :step="2" :value="simRate" @changing="simRate = $event.detail.value" />
        </view>
        <view class="sim-row">
          <view class="sim-label"><text>目标房价</text><text class="sim-val font-num">{{ simHouseWan }}万</text></view>
          <slider class="sim-slider" :min="50" :max="800" :step="10" :value="simHouseWan" @changing="simHouseWan = $event.detail.value" />
        </view>

        <view class="sim-result">
          <view>
            <view class="sim-result-label">攒够首付预计</view>
            <view class="sim-result-detail font-num">月存 {{ fmtFull(sim.monthlySave) }} · 首付 {{ fmt(sim.downAmt) }}</view>
          </view>
          <view class="sim-result-value font-num">{{ sim.timeToSave.toFixed(1) }}<text class="u">年</text></view>
        </view>
      </view>

      <!-- 人生里程碑时间线 -->
      <view class="card">
        <view class="card-title">人生里程碑</view>
        <view class="card-sub">你的财务时间线</view>
        <view class="tl">
          <view class="tl-item" v-for="(e, i) in timeline" :key="i" :class="{ last: i === timeline.length - 1 }">
            <view class="tl-rail" v-if="i !== timeline.length - 1"></view>
            <view class="tl-dot" :style="{ borderColor: colorVar(e.color), background: colorVar(e.color) }"></view>
            <view class="tl-body">
              <view class="tl-age">{{ e.age }}</view>
              <view class="tl-event">{{ e.event }}</view>
              <view class="tl-amt">{{ e.amt }}</view>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 180rpx"></view>
    </view>

    <bottom-nav active="home" @checkin="openSheet" />
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
      name: '',
      profile: {},
      netWorth: 0,
      monthTotal: 0,
      health: '稳健',
      allocs: [],
      streak: 0,
      yearTotal: 0,
      downTarget: 0,
      downBalance: 0,
      downPct: 0,
      downEta: 0,
      downYear: 0,
      goals: [],
      calendar: [],
      currentYear: new Date().getFullYear(),
      yearTarget: 0,
      simIncome: 25000,
      simRate: 32,
      simHouseWan: 320,
      timeline: []
    }
  },
  computed: {
    greeting() {
      const h = new Date().getHours()
      if (h < 11) return '早上好 ☀️'
      if (h < 13) return '中午好'
      if (h < 18) return '下午好'
      return '晚上好 🌙'
    },
    yearPct() {
      return this.yearTarget > 0 ? Math.min(100, Math.round(this.yearTotal / this.yearTarget * 1000) / 10) : 0
    },
    sim() {
      const fakeProfile = {
        income: this.simIncome, saveRate: this.simRate, housePrice: this.simHouseWan * 10000,
        downPaymentPct: 30, rate: 3.5, years: 30, investReturn: 3
      }
      const s = calc.plannerSummary(fakeProfile, 0)
      return s
    }
  },
  onLoad() {
    try {
      this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
    } catch (e) {}
    this.refresh()
  },
  onShow() { this.refresh() },
  methods: {
    fmt: calc.fmt,
    fmtFull: calc.fmtFull,
    colorVar: db.colorVar,
    soft(key) { return 'var(--' + key + '-soft)' },
    goalEmoji(color) {
      return { accent: '🏠', warm: '👶', success: '🎓', info: '📈' }[color] || '💰'
    },
    go(url) { uni.reLaunch({ url }) },
    openSheet() { this.sheet = true },
    onSaved() { this.sheet = false; this.refresh() },
    refresh() {
      this.profile = db.getProfile()
      this.name = this.profile.name || '我'
      this.netWorth = db.netWorth()
      const now = new Date()
      this.monthTotal = db.monthTotal(now.getFullYear(), now.getMonth() + 1)
      const sum = calc.plannerSummary(this.profile, db.accountBalance('down'))
      this.health = sum.healthScore.label

      // 净资产分配（前三个账户）
      this.allocs = db.getAccounts().slice(0, 3).map(a => ({ id: a.id, name: a.name, balance: db.accountBalance(a.id) }))

      this.streak = db.currentStreak()
      this.yearTotal = db.yearTotal(now.getFullYear())
      this.yearTarget = (this.profile.monthlyTarget || 8000) * Math.min(12, now.getMonth() + 1)

      // 首付进度
      this.downTarget = sum.downAmt
      this.downBalance = db.accountBalance('down')
      this.downPct = this.downTarget > 0 ? Math.min(100, this.downBalance / this.downTarget * 100) : 0
      this.downEta = sum.timeToSave
      this.downYear = now.getFullYear() + Math.ceil(sum.timeToSave || 0)

      // 目标
      this.goals = db.goals().map(g => {
        const p = db.goalProgress(g)
        return Object.assign({}, g, { balance: p.balance, pct: p.pct })
      })

      // 月历
      this.calendar = db.monthlyStatus(now.getFullYear())

      // 时间线
      this.timeline = this.buildTimeline(sum)
    },
    buildTimeline(sum) {
      const p = this.profile
      const events = [
        { age: '现在 · ' + p.age + '岁', event: '月存 ' + calc.fmtFull(sum.monthlySave) + ' 元', amt: '累计储蓄 ' + calc.fmt(db.netWorth()), color: 'accent' },
        { age: (p.babyYear || 0) + '年后 · ' + (p.age + (p.babyYear || 0)) + '岁', event: '生育计划', amt: '首年育儿约 ' + calc.fmt(sum.babyFirstYear), color: 'warm' },
        { age: sum.timeToSave.toFixed(1) + '年后 · ' + sum.houseAge.toFixed(1) + '岁', event: '购房目标', amt: '首付 ' + calc.fmt(sum.downAmt) + ' · 月供 ' + calc.fmtFull(sum.mortgage), color: 'success' },
        { age: (sum.timeToSave + (p.years || 30)).toFixed(0) + '年后 · ' + (sum.houseAge + (p.years || 30)).toFixed(0) + '岁', event: '房贷还清', amt: '迈向财务自由', color: 'muted-2' }
      ]
      return events
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; }
.statusbar { background: var(--surface); }

.header {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
  padding: 16rpx 32rpx 32rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.hdr-greet { font-size: 26rpx; color: var(--muted); font-weight: 600; }
.hdr-name { font-size: 40rpx; font-weight: 800; color: var(--fg-strong); letter-spacing: -1rpx; margin-top: 4rpx; }
.hdr-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: var(--warm-soft); color: var(--warm);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 32rpx;
}

.content { padding: 0 32rpx; }

/* 净资产卡 */
.nw-card {
  border-radius: 40rpx; padding: 48rpx 40rpx; color: #fff;
  margin-bottom: 32rpx; position: relative; overflow: hidden;
  background: linear-gradient(135deg, #2f6bff 0%, #1e3a8a 100%);
  box-shadow: 0 16rpx 40rpx rgba(47,107,255,0.25);
}
.nw-glow {
  position: absolute; top: -80rpx; right: -80rpx;
  width: 320rpx; height: 320rpx; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%);
}
.nw-label { font-size: 26rpx; opacity: .85; font-weight: 600; }
.nw-value { font-size: 72rpx; font-weight: 800; letter-spacing: -2rpx; line-height: 1.1; margin-top: 12rpx; }
.nw-unit { font-size: 32rpx; opacity: .8; margin-left: 4rpx; }
.nw-delta {
  display: inline-block; margin-top: 20rpx;
  font-size: 24rpx; font-weight: 700;
  background: rgba(255,255,255,0.18); padding: 8rpx 20rpx; border-radius: 999rpx;
}
.nw-alloc { display: flex; gap: 24rpx; margin-top: 28rpx; }
.nw-alloc-item { flex: 1; }
.nw-alloc-label { font-size: 22rpx; opacity: .75; }
.nw-alloc-val { font-size: 30rpx; font-weight: 700; margin-top: 4rpx; }

/* 快捷入口 */
.qa-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin-bottom: 32rpx; }
.qa-btn {
  background: var(--surface); border-radius: 32rpx; padding: 28rpx 16rpx;
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
  border: 2rpx solid var(--border);
}
.qa-btn:active { background: var(--surface-2); }
.qa-ico { width: 72rpx; height: 72rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 800; }
.qa-label { font-size: 22rpx; font-weight: 600; color: var(--muted); }

/* 连续达标 */
.streak {
  border-radius: 40rpx; padding: 40rpx; color: #fff; margin-bottom: 32rpx;
  display: flex; align-items: center; gap: 32rpx;
  background: linear-gradient(135deg, #f1813a 0%, #e8593a 100%);
}
.streak-emoji { font-size: 72rpx; }
.streak-info { flex: 1; }
.streak-head { font-size: 36rpx; font-weight: 800; }
.streak-detail { font-size: 24rpx; opacity: .9; margin-top: 4rpx; }
.streak-count { font-size: 64rpx; font-weight: 800; }
.streak-count .u { font-size: 28rpx; opacity: .8; }

/* 卡片 */
.card {
  background: var(--surface); border-radius: 40rpx; padding: 40rpx;
  margin-bottom: 32rpx; border: 2rpx solid var(--border);
}
.card-title { font-size: 32rpx; font-weight: 800; color: var(--fg-strong); }
.card-sub { font-size: 24rpx; color: var(--muted); margin-top: 4rpx; margin-bottom: 32rpx; }

/* 首付进度环 */
.ring-row { display: flex; align-items: center; gap: 40rpx; }
.ring-pct { font-size: 48rpx; font-weight: 800; color: var(--fg-strong); line-height: 1; }
.ring-sym { font-size: 24rpx; color: var(--muted); }
.ring-lbl { font-size: 20rpx; color: var(--muted); font-weight: 600; margin-top: 6rpx; }
.ring-info { flex: 1; }
.ring-amount { font-size: 44rpx; font-weight: 800; color: var(--fg-strong); }
.ring-amt-unit { font-size: 24rpx; color: var(--muted); }
.ring-break { font-size: 24rpx; color: var(--muted); margin-top: 8rpx; }
.ring-eta {
  display: inline-block; font-size: 24rpx; font-weight: 700; color: var(--accent);
  background: var(--accent-soft); padding: 8rpx 20rpx; border-radius: 999rpx; margin-top: 16rpx;
}

/* 目标 */
.goal { display: flex; align-items: center; gap: 24rpx; padding: 20rpx 0; }
.goal + .goal { border-top: 2rpx solid var(--border); }
.goal-ico { width: 88rpx; height: 88rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.goal-info { flex: 1; min-width: 0; }
.goal-top { display: flex; justify-content: space-between; align-items: center; }
.goal-name { font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }
.goal-pct { font-size: 26rpx; font-weight: 800; }
.goal-bar { width: 100%; height: 12rpx; background: var(--surface-2); border-radius: 999rpx; overflow: hidden; margin-top: 12rpx; }
.goal-bar-fill { height: 100%; border-radius: 999rpx; }
.goal-amt { font-size: 22rpx; color: var(--muted); margin-top: 8rpx; }

/* 月历 */
.cal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.cal-cell {
  aspect-ratio: 1.6; border-radius: 24rpx; border: 4rpx solid transparent;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx;
}
.cal-m { font-size: 22rpx; }
.cal-a { font-size: 24rpx; font-weight: 700; }
.cal-cell.done { background: var(--success-soft); border-color: var(--success); }
.cal-cell.done .cal-m, .cal-cell.done .cal-a { color: var(--success); }
.cal-cell.partial { background: var(--warm-soft); border-color: var(--warm); }
.cal-cell.partial .cal-m, .cal-cell.partial .cal-a { color: var(--warm); }
.cal-cell.current { background: var(--accent-soft); border-color: var(--accent); }
.cal-cell.current .cal-m, .cal-cell.current .cal-a { color: var(--accent); }
.cal-cell.missed { background: var(--danger-soft); border-color: var(--danger); }
.cal-cell.missed .cal-m, .cal-cell.missed .cal-a { color: var(--danger); }
.cal-cell.future { background: var(--surface-2); border-color: var(--border); }
.cal-cell.future .cal-m, .cal-cell.future .cal-a { color: var(--muted-2); }
.cal-foot { display: flex; justify-content: space-between; margin-top: 32rpx; padding-top: 24rpx; border-top: 2rpx solid var(--border); font-size: 24rpx; }
.cal-foot-label { color: var(--muted); }
.cal-foot-val { font-weight: 700; color: var(--fg-strong); }
.cal-foot-pct { font-weight: 800; color: var(--accent); }

/* 模拟器 */
.sim-row { margin-bottom: 28rpx; }
.sim-label { display: flex; justify-content: space-between; font-size: 26rpx; font-weight: 600; margin-bottom: 8rpx; color: var(--fg); }
.sim-val { color: var(--accent); font-weight: 800; }
.sim-slider { margin: 0; }
.sim-result {
  margin-top: 16rpx; border-radius: 24rpx; padding: 32rpx;
  background: var(--accent-soft); display: flex; justify-content: space-between; align-items: center;
}
.sim-result-label { font-size: 24rpx; color: var(--muted); font-weight: 600; }
.sim-result-detail { font-size: 22rpx; color: var(--muted); margin-top: 4rpx; }
.sim-result-value { font-size: 56rpx; font-weight: 800; color: var(--accent); }
.sim-result-value .u { font-size: 26rpx; color: var(--muted); }

/* 时间线 */
.tl { display: flex; flex-direction: column; }
.tl-item { display: flex; gap: 32rpx; padding-bottom: 36rpx; position: relative; }
.tl-item.last { padding-bottom: 0; }
.tl-rail { position: absolute; left: 13rpx; top: 32rpx; bottom: 0; width: 4rpx; background: var(--border-strong); }
.tl-dot { width: 30rpx; height: 30rpx; border-radius: 50%; border: 6rpx solid; flex-shrink: 0; margin-top: 4rpx; z-index: 1; background: var(--surface); }
.tl-body { flex: 1; }
.tl-age { font-size: 24rpx; font-weight: 700; color: var(--muted); }
.tl-event { font-size: 30rpx; font-weight: 700; color: var(--fg-strong); }
.tl-amt { font-size: 24rpx; color: var(--muted); margin-top: 4rpx; }
</style>
