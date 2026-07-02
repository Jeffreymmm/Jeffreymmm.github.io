<template>
  <view class="page">
    <view class="statusbar" :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="topbar">
      <text class="topbar-title">综合规划</text>
      <text class="topbar-sub">调参即算 · 方案自动保存到本地</text>
    </view>

    <view class="content">
      <!-- KPI -->
      <view class="kpi-row">
        <view class="kpi">
          <text class="kpi-label">月存目标</text>
          <text class="kpi-value font-num">{{ fmtFull(summary.monthlySave) }}<text class="u">元</text></text>
        </view>
        <view class="kpi">
          <text class="kpi-label">购房时间</text>
          <text class="kpi-value font-num">{{ summary.timeToSave.toFixed(1) }}<text class="u">年</text></text>
        </view>
        <view class="kpi">
          <text class="kpi-label">月供压力</text>
          <text class="kpi-value font-num">{{ fmtFull(summary.mortgage) }}<text class="u">元</text></text>
          <text class="kpi-delta" :style="{ color: summary.mortgagePct > 45 ? 'var(--danger)' : summary.mortgagePct > 40 ? 'var(--warm)' : 'var(--success)' }">占收入 {{ summary.mortgagePct.toFixed(1) }}%</text>
        </view>
        <view class="kpi">
          <text class="kpi-label">育儿月均</text>
          <text class="kpi-value font-num">{{ fmtFull(summary.babyMonthly06) }}<text class="u">元</text></text>
        </view>
      </view>

      <!-- 基础参数 -->
      <view class="card">
        <view class="card-title">基础参数</view>
        <view class="card-sub">拖动滑块或输入，结果实时联动</view>

        <view class="field">
          <text class="field-label">税后月收入</text>
          <view class="field-input"><text class="prefix">¥</text>
            <input class="num-input" type="number" v-model.number="form.income" />
          </view>
        </view>
        <view class="field">
          <text class="field-label">现有储蓄</text>
          <view class="field-input"><text class="prefix">¥</text>
            <input class="num-input" type="number" v-model.number="form.savings" />
          </view>
        </view>
        <view class="field-row">
          <view class="field half">
            <text class="field-label">当前年龄</text>
            <view class="field-input"><input class="num-input" type="number" v-model.number="form.age" /><text class="suffix">岁</text></view>
          </view>
          <view class="field half">
            <text class="field-label">储蓄年化收益</text>
            <view class="field-input"><input class="num-input" type="number" v-model.number="form.investReturn" /><text class="suffix">%</text></view>
          </view>
        </view>

        <view class="slider-field">
          <view class="slider-head"><text>目标房价</text><text class="slider-val">{{ fmtFull(form.housePrice) }}元</text></view>
          <slider :min="500000" :max="8000000" :step="100000" :value="form.housePrice" @changing="form.housePrice = $event.detail.value" />
        </view>
        <view class="slider-field">
          <view class="slider-head"><text>首付比例</text><text class="slider-val">{{ form.downPaymentPct }}%</text></view>
          <slider :min="20" :max="80" :step="5" :value="form.downPaymentPct" @changing="form.downPaymentPct = $event.detail.value" />
        </view>
        <view class="slider-field">
          <view class="slider-head"><text>月储蓄率</text><text class="slider-val">{{ form.saveRate }}%</text></view>
          <slider :min="10" :max="70" :step="2" :value="form.saveRate" @changing="form.saveRate = $event.detail.value" />
        </view>

        <view class="field-row">
          <view class="field half">
            <text class="field-label">贷款利率</text>
            <view class="field-input"><input class="num-input" type="number" v-model.number="form.rate" /><text class="suffix">%</text></view>
          </view>
          <view class="field half">
            <text class="field-label">贷款年限</text>
            <picker class="picker" :range="yearsLabels" :value="yearsIndex" @change="form.years = yearsOptions[$event.detail.value]">
              <view class="picker-text">{{ form.years }}年 ▾</view>
            </picker>
          </view>
        </view>
        <view class="field-row">
          <view class="field half">
            <text class="field-label">所在城市</text>
            <picker class="picker" :range="cityLabels" :value="cityIndex" @change="form.cityFactor = cityOptions[$event.detail.value]">
              <view class="picker-text">{{ cityLabel }} ▾</view>
            </picker>
          </view>
          <view class="field half">
            <text class="field-label">育儿档位</text>
            <picker class="picker" :range="tierLabels" :value="tierIndex" @change="form.babyTier = tierOptions[$event.detail.value]">
              <view class="picker-text">{{ tierLabel }} ▾</view>
            </picker>
          </view>
        </view>
        <view class="field">
          <text class="field-label">计划生育时间</text>
          <picker class="picker" :range="babyYearLabels" :value="babyYearIndex" @change="form.babyYear = babyYearOptions[$event.detail.value]">
            <view class="picker-text">{{ babyYearLabel }} ▾</view>
          </picker>
        </view>

        <button class="save-btn" @click="save">保存方案</button>
      </view>

      <!-- 核心结果 -->
      <view class="card">
        <view class="card-title">核心结果</view>
        <view class="result-grid">
          <view class="result hl"><text class="r-label">首付金额</text><text class="r-value font-num">{{ fmt(summary.downAmt) }}<text class="u">元</text></text></view>
          <view class="result"><text class="r-label">贷款总额</text><text class="r-value font-num">{{ fmt(summary.loan) }}<text class="u">元</text></text></view>
          <view class="result"><text class="r-label">利息总额</text><text class="r-value font-num" style="color:var(--warm)">{{ fmt(summary.mortgage * form.years * 12 - summary.loan) }}<text class="u">元</text></text></view>
          <view class="result hl"><text class="r-label">攒够首付</text><text class="r-value font-num">{{ summary.timeToSave.toFixed(1) }}<text class="u">年</text></text></view>
        </view>
        <view class="insight" :class="insightClass">
          <text class="insight-icon">{{ insightIcon }}</text>
          <text class="insight-text">{{ insightText }}</text>
        </view>
      </view>

      <!-- 生娃规划 -->
      <view class="card">
        <view class="card-title">生娃规划</view>
        <view class="card-sub">攒够孕产现金即可启动，后续靠月度育儿储蓄覆盖</view>

        <!-- 启动资金门槛 -->
        <view class="baby-launch">
          <view class="baby-launch-main">
            <text class="baby-launch-label">生娃启动资金</text>
            <text class="baby-launch-val font-num">{{ fmt(baby.launchTarget) }}<text class="u">元</text></text>
          </view>
          <view class="baby-launch-break">
            <text>产检 {{ fmt(baby.pregnancyBreakdown.checkup) }}</text>
            <text>＋ 分娩 {{ fmt(baby.pregnancyBreakdown.delivery) }}</text>
            <text>＋ 月子 {{ fmt(baby.pregnancyBreakdown.yuesao) }}</text>
          </view>
        </view>

        <!-- 每月育儿储蓄 -->
        <view class="slider-field">
          <view class="slider-head"><text>每月育儿储蓄</text><text class="slider-val">{{ fmtFull(form.babySave) }} 元</text></view>
          <slider :min="500" :max="8000" :step="500" :value="form.babySave" @changing="form.babySave = $event.detail.value" />
        </view>

        <!-- 0-6 岁花销预测柱图 -->
        <view class="baby-chart-wrap">
          <view class="slider-head">
            <text>0-6 岁花销预测</text>
            <text class="slider-val">月均 {{ fmtFull(baby.cashflow.monthlyCost) }} 元</text>
          </view>
          <view class="baby-chart">
            <view class="ref-line" :style="{ bottom: saveLinePct + '%' }"><text class="ref-label">月存</text></view>
            <view class="bar-col" v-for="(y, i) in baby.profile06.yearly" :key="i">
              <text class="bar-val font-num">{{ fmt(y.monthlyAvg) }}</text>
              <view class="bar-track"><view class="bar" :style="{ height: barPct(y.monthlyAvg) + '%', background: stageColor(y.stage) }"></view></view>
              <text class="bar-label">{{ y.age }}</text>
            </view>
          </view>
          <view class="chart-legend">
            <view class="legend-item"><view class="dot infant"></view><text>婴儿期</text></view>
            <view class="legend-item"><view class="dot toddler"></view><text>幼儿期</text></view>
            <view class="legend-item"><view class="dot preschool"></view><text>学前</text></view>
          </view>
        </view>

        <!-- 三指标 -->
        <view class="baby-metrics">
          <view class="baby-metric hl">
            <text class="m-label">资金就绪</text>
            <text class="m-value font-num">{{ baby.yearsToReady.toFixed(1) }}<text class="u">年</text></text>
          </view>
          <view class="baby-metric">
            <text class="m-label">计划生娃</text>
            <text class="m-value font-num">{{ form.babyYear }}<text class="u">年后</text></text>
          </view>
          <view class="baby-metric">
            <text class="m-label">就绪年龄</text>
            <text class="m-value font-num">{{ baby.readyAge.toFixed(0) }}<text class="u">岁</text></text>
          </view>
        </view>

        <!-- 状态横幅：启动资金就绪 且 月存覆盖月均支出 才绿，否则黄 -->
        <view class="insight" :class="baby.status === 'onTrack' && baby.cashflow.covered ? 'ok' : 'warn'">
          <text class="insight-icon">{{ baby.status === 'onTrack' && baby.cashflow.covered ? '✓' : '⚠️' }}</text>
          <text class="insight-text">{{ babyInsight }}</text>
        </view>

        <!-- 买房 vs 生娃 顺序建议 -->
        <view class="baby-order">
          <view class="baby-order-head">
            <text class="bo-tag" :class="order.order">{{ orderLabel }}</text>
            <text class="bo-title">买房 · 生娃 顺序建议</text>
          </view>
          <text class="bo-reason">{{ order.reason }}</text>
          <view class="bo-cashflow">
            <text class="bo-cf-label">生娃后月度现金流</text>
            <text class="bo-cf-val font-num">月供+育儿 {{ fmtFull(order.postExpense) }} 元 · 占收入 {{ order.postPct.toFixed(0) }}%</text>
            <text class="bo-cf-health" :style="{ color: 'var(--' + order.postHealth.color + ')' }">{{ order.postHealth.label }}</text>
          </view>
        </view>
      </view>

      <!-- 场景对比 -->
      <view class="card">
        <view class="card-title">首付策略对比</view>
        <view class="card-sub">不同首付比例的影响</view>
        <view class="scn" v-for="s in scenarios" :key="s.pct" :class="{ on: s.pct === form.downPaymentPct }">
          <view class="scn-head">
            <text class="scn-name">{{ s.name }}</text>
            <text class="scn-pct font-num">{{ s.pct }}%</text>
          </view>
          <view class="scn-rows">
            <view class="scn-r"><text>月供</text><text class="font-num">{{ fmtFull(s.mortgage) }} 元</text></view>
            <view class="scn-r"><text>占收入</text><text class="font-num" :style="{color: s.mpct>45?'var(--danger)':s.mpct>35?'var(--warm)':'var(--success)'}">{{ s.mpct.toFixed(0) }}%</text></view>
            <view class="scn-r"><text>攒首付</text><text class="font-num">{{ s.time.toFixed(1) }} 年</text></view>
          </view>
        </view>
      </view>

      <!-- 里程碑时间线 -->
      <view class="card">
        <view class="card-title">人生里程碑</view>
        <view class="tl">
          <view class="tl-item" v-for="(e, i) in timeline" :key="i" :class="{ last: i === timeline.length - 1 }">
            <view class="tl-rail" v-if="i !== timeline.length - 1"></view>
            <view class="tl-dot" :style="{ borderColor: colorVar(e.color), background: colorVar(e.color) }"></view>
            <view class="tl-body">
              <text class="tl-age">{{ e.age }}</text>
              <text class="tl-event">{{ e.event }}</text>
              <text class="tl-amt">{{ e.amt }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height: 180rpx"></view>
    </view>

    <bottom-nav active="planner" @checkin="sheet = true" />
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
      form: Object.assign({}, db.getProfile()),
      yearsOptions: [15, 20, 25, 30],
      cityOptions: [0.6, 0.85, 1.0, 1.3],
      tierOptions: [0.7, 1.0, 1.4, 2.0],
      babyYearOptions: [0, 1, 2, 3, 5]
    }
  },
  computed: {
    summary() {
      return calc.plannerSummary(this.form, +this.form.savings || 0)
    },
    baby() {
      return calc.babyPlan(this.form, db.accountBalance('baby'), +this.form.babySave || 1500)
    },
    order() {
      return calc.milestoneOrder(this.baby, this.summary, this.form)
    },
    babyInsight() {
      const b = this.baby, c = b.cashflow
      if (b.status === 'onTrack' && c.covered) {
        return '孕产现金 ' + b.readyAge.toFixed(0) + ' 岁就绪，月存 ' + calc.fmtFull(c.monthlySave) + ' 元可覆盖 0-6 岁月均支出，节奏从容。'
      }
      if (b.status === 'onTrack' && !c.covered) {
        return '启动资金 ' + b.readyAge.toFixed(0) + ' 岁就绪，但月存比月均支出少 ' + calc.fmtFull(c.monthlyGap) + ' 元，现有储备可撑 ' + (c.runwayMonths ? Math.round(c.runwayMonths) : 0) + ' 个月，建议逐步加码月存。'
      }
      return '启动资金落后计划 ' + b.gap.toFixed(1) + ' 年（' + b.readyAge.toFixed(0) + ' 岁就绪）；月存比月均支出少 ' + calc.fmtFull(c.monthlyGap) + ' 元，建议加码每月育儿储蓄。'
    },
    saveLinePct() {
      // 虚线高度 = 当前月存 / 峰值月均，与柱子同基准归一化；调滑块时实时移动
      const peak = this.baby.profile06.peakMonthly || 1
      return Math.min(100, Math.max(0, (+this.form.babySave || 0) / peak * 100))
    },
    orderLabel() {
      return { babyFirst: '先生后买', buyFirst: '先买后生', parallel: '同步推进' }[this.order.order] || ''
    },
    yearsLabels() { return this.yearsOptions.map(y => y + '年') },
    yearsIndex() { return Math.max(0, this.yearsOptions.indexOf(+this.form.years)) },
    cityLabels() { return ['三线 ×0.6', '二线 ×0.85', '新一线 ×1.0', '一线 ×1.3'] },
    cityIndex() { return Math.max(0, this.cityOptions.indexOf(+this.form.cityFactor)) },
    cityLabel() { return this.cityLabels[this.cityIndex] },
    tierLabels() { return ['经济型 ×0.7', '标准型 ×1.0', '优质型 ×1.4', '精细型 ×2.0'] },
    tierIndex() { return Math.max(0, this.tierOptions.indexOf(+this.form.babyTier)) },
    tierLabel() { return this.tierLabels[this.tierIndex] },
    babyYearLabels() { return ['已出生', '1年后', '2年后', '3年后', '5年后'] },
    babyYearIndex() { return Math.max(0, this.babyYearOptions.indexOf(+this.form.babyYear)) },
    babyYearLabel() { return this.babyYearLabels[this.babyYearIndex] },
    scenarios() {
      const income = +this.form.income || 0
      const monthlySave = income * (+this.form.saveRate) / 100
      return [20, 30, 50].map(pct => {
        const downAmt = (+this.form.housePrice) * pct / 100
        const loan = (+this.form.housePrice) - downAmt
        const m = calc.monthlyMortgage(loan, +this.form.rate, +this.form.years)
        const t = calc.timeToSave(downAmt, +this.form.savings || 0, monthlySave, +this.form.investReturn)
        return {
          pct, name: pct === 20 ? '低首付快上车' : pct === 30 ? '稳健型' : '高首付低压',
          mortgage: m, mpct: income > 0 ? m / income * 100 : 0, time: t
        }
      })
    },
    insightClass() {
      const p = this.summary.mortgagePct
      if (p > 50) return 'warn'
      if (p > 40) return 'warn'
      return 'ok'
    },
    insightIcon() { return this.summary.mortgagePct > 40 ? '⚠️' : '✓' },
    insightText() {
      const p = this.summary.mortgagePct
      if (p > 50) return '月供占收入 ' + p.toFixed(0) + '%，超过 50% 安全线。建议提高首付或延后购房 1-2 年。'
      if (p > 40) return '月供占收入 ' + p.toFixed(0) + '%，偏高但可承受。建议预留 6 个月应急金。'
      return '当前方案财务健康，月供占收入 ' + p.toFixed(0) + '%，空间充足。'
    },
    timeline() {
      const s = this.summary
      const f = this.form
      return [
        { age: '现在 · ' + f.age + '岁', event: '月存 ' + calc.fmtFull(s.monthlySave) + ' 元', amt: '累计 ' + calc.fmt(+f.savings || 0), color: 'accent' },
        { age: (f.babyYear || 0) + '年后 · ' + (+f.age + (f.babyYear || 0)) + '岁', event: '生育计划', amt: '孕产启动约 ' + calc.fmt(this.baby.launchTarget), color: 'warm' },
        { age: s.timeToSave.toFixed(1) + '年后 · ' + s.houseAge.toFixed(1) + '岁', event: '购房目标', amt: '首付 ' + calc.fmt(s.downAmt) + ' · 月供 ' + calc.fmtFull(s.mortgage), color: 'success' },
        { age: (s.timeToSave + (+f.years || 30)).toFixed(0) + '年后', event: '房贷还清', amt: '迈向财务自由', color: 'muted-2' }
      ]
    }
  },
  onLoad() {
    try { this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20 } catch (e) {}
  },
  onShow() { this.form = Object.assign({}, db.getProfile()) },
  methods: {
    fmt: calc.fmt,
    fmtFull: calc.fmtFull,
    colorVar: db.colorVar,
    save() {
      db.saveProfile(this.form)
      uni.showToast({ title: '方案已保存', icon: 'success' })
    },
    barPct(v) {
      const peak = this.baby.profile06.peakMonthly
      if (!peak || peak <= 0) return 0
      return Math.max(8, Math.round(v / peak * 100))
    },
    stageColor(stage) {
      return { infant: 'var(--warm)', toddler: 'var(--warm-light)', preschool: 'var(--info)' }[stage] || 'var(--warm)'
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; }
.statusbar { background: var(--surface); }
.topbar { padding: 16rpx 32rpx 24rpx; background: var(--surface); border-bottom: 2rpx solid var(--border); }
.topbar-title { display: block; font-size: 40rpx; font-weight: 800; color: var(--fg-strong); }
.topbar-sub { display: block; font-size: 24rpx; color: var(--muted); margin-top: 4rpx; }

.content { padding: 32rpx; }

.kpi-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 32rpx; }
.kpi { background: var(--surface); border: 2rpx solid var(--border); border-radius: 28rpx; padding: 28rpx; }
.kpi-label { font-size: 24rpx; color: var(--muted); font-weight: 600; }
.kpi-value { display: block; font-size: 44rpx; font-weight: 800; color: var(--fg-strong); margin-top: 8rpx; }
.kpi-value .u { font-size: 24rpx; color: var(--muted); margin-left: 2rpx; }
.kpi-delta { display: block; font-size: 22rpx; font-weight: 700; margin-top: 6rpx; }

.card { background: var(--surface); border: 2rpx solid var(--border); border-radius: 36rpx; padding: 36rpx; margin-bottom: 32rpx; }
.card-title { font-size: 32rpx; font-weight: 800; color: var(--fg-strong); }
.card-sub { font-size: 24rpx; color: var(--muted); margin: 4rpx 0 28rpx; }

.field { margin-bottom: 24rpx; }
.field-row { display: flex; gap: 24rpx; margin-bottom: 24rpx; }
.field.half { flex: 1; }
.field-label { display: block; font-size: 24rpx; font-weight: 600; color: var(--muted); margin-bottom: 10rpx; }
.field-input { display: flex; align-items: center; border: 2rpx solid var(--border); border-radius: 20rpx; overflow: hidden; background: var(--surface); }
.prefix, .suffix { padding: 0 20rpx; height: 80rpx; line-height: 80rpx; font-size: 26rpx; color: var(--muted); background: var(--surface-2); }
.num-input { flex: 1; height: 80rpx; font-size: 30rpx; font-weight: 700; color: var(--fg-strong); padding: 0 20rpx; }
.picker { flex: 1; }
.picker-text { height: 80rpx; line-height: 80rpx; padding: 0 20rpx; border: 2rpx solid var(--border); border-radius: 20rpx; font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }

.slider-field { margin-bottom: 28rpx; }
.slider-head { display: flex; justify-content: space-between; font-size: 26rpx; font-weight: 600; margin-bottom: 8rpx; color: var(--fg); }
.slider-val { color: var(--accent); font-weight: 800; }

.save-btn { width: 100%; height: 96rpx; line-height: 96rpx; margin-top: 16rpx; border-radius: 24rpx; background: var(--accent); color: #fff; font-size: 30rpx; font-weight: 700; border: 0; }
.save-btn::after { border: none; }

.result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.result { background: var(--surface-2); border-radius: 20rpx; padding: 24rpx; border: 2rpx solid var(--border); }
.result.hl { background: var(--accent-soft); border-color: var(--accent-light); }
.r-label { display: block; font-size: 24rpx; color: var(--muted); font-weight: 600; }
.r-value { display: block; font-size: 38rpx; font-weight: 800; color: var(--fg-strong); margin-top: 6rpx; }
.r-value .u { font-size: 24rpx; color: var(--muted); }

.insight { display: flex; gap: 16rpx; padding: 24rpx; border-radius: 20rpx; margin-top: 24rpx; font-size: 26rpx; line-height: 1.5; }
.insight.warn { background: var(--warm-soft); color: #b45a1f; }
.insight.ok { background: var(--success-soft); color: #1a7a4d; }
.insight-icon { font-weight: 800; }

.scn { border: 3rpx solid var(--border); border-radius: 24rpx; padding: 28rpx; margin-bottom: 20rpx; }
.scn.on { border-color: var(--accent); background: var(--accent-soft); }
.scn-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.scn-name { font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }
.scn-pct { font-size: 36rpx; font-weight: 800; color: var(--accent); }
.scn-rows { display: flex; flex-direction: column; gap: 8rpx; }
.scn-r { display: flex; justify-content: space-between; font-size: 24rpx; color: var(--fg); border-top: 2rpx solid var(--border); padding-top: 8rpx; }

.tl { display: flex; flex-direction: column; margin-top: 16rpx; }
.tl-item { display: flex; gap: 32rpx; padding-bottom: 36rpx; position: relative; }
.tl-item.last { padding-bottom: 0; }
.tl-rail { position: absolute; left: 13rpx; top: 32rpx; bottom: 0; width: 4rpx; background: var(--border-strong); }
.tl-dot { width: 30rpx; height: 30rpx; border-radius: 50%; border: 6rpx solid; flex-shrink: 0; margin-top: 4rpx; z-index: 1; background: var(--surface); }
.tl-body { flex: 1; }
.tl-age { display: block; font-size: 24rpx; font-weight: 700; color: var(--muted); }
.tl-event { display: block; font-size: 30rpx; font-weight: 700; color: var(--fg-strong); }
.tl-amt { display: block; font-size: 24rpx; color: var(--muted); margin-top: 4rpx; }

/* 生娃规划 */
.baby-launch { background: var(--warm-soft); border-radius: 24rpx; padding: 28rpx; margin-bottom: 28rpx; }
.baby-launch-main { display: flex; justify-content: space-between; align-items: baseline; }
.baby-launch-label { font-size: 26rpx; color: var(--muted); font-weight: 600; }
.baby-launch-val { font-size: 48rpx; font-weight: 800; color: var(--warm); }
.baby-launch-val .u { font-size: 24rpx; color: var(--muted); margin-left: 2rpx; }
.baby-launch-break { display: flex; gap: 24rpx; margin-top: 12rpx; font-size: 24rpx; color: var(--muted); }

.baby-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin: 8rpx 0 24rpx; }
.baby-metric { background: var(--surface-2); border-radius: 20rpx; padding: 24rpx 16rpx; border: 2rpx solid var(--border); text-align: center; }
.baby-metric.hl { background: var(--warm-soft); border-color: var(--warm-light); }
.baby-metric .m-label { display: block; font-size: 22rpx; color: var(--muted); font-weight: 600; }
.baby-metric .m-value { display: block; font-size: 36rpx; font-weight: 800; color: var(--fg-strong); margin-top: 8rpx; }
.baby-metric .m-value .u { font-size: 22rpx; color: var(--muted); }

.baby-order { border: 3rpx solid var(--border); border-radius: 24rpx; padding: 28rpx; margin-top: 24rpx; }
.baby-order-head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.bo-tag { font-size: 24rpx; font-weight: 800; color: #fff; background: var(--warm); padding: 6rpx 20rpx; border-radius: 999rpx; }
.bo-tag.buyFirst { background: var(--accent); }
.bo-tag.parallel { background: var(--info); }
.bo-title { font-size: 28rpx; font-weight: 700; color: var(--fg-strong); }
.bo-reason { display: block; font-size: 26rpx; line-height: 1.5; color: var(--fg); }
.bo-cashflow { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; margin-top: 20rpx; padding-top: 20rpx; border-top: 2rpx solid var(--border); font-size: 24rpx; }
.bo-cf-label { color: var(--muted); }
.bo-cf-val { color: var(--fg-strong); font-weight: 700; }
.bo-cf-health { font-weight: 800; }

/* 0-6 岁花销柱图 */
.baby-chart-wrap { margin: 8rpx 0 24rpx; }
.baby-chart { display: flex; align-items: flex-end; gap: 16rpx; height: 320rpx; padding-top: 20rpx; position: relative; }
.ref-line { position: absolute; left: 0; right: 0; height: 0; border-top: 2rpx dashed var(--accent); z-index: 2; }
.ref-label { position: absolute; right: 0; top: -28rpx; font-size: 18rpx; color: var(--accent); background: var(--surface); padding: 0 8rpx; font-weight: 700; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; height: 100%; justify-content: flex-end; }
.bar-val { font-size: 18rpx; font-weight: 700; color: var(--fg-strong); }
.bar-track { width: 100%; max-width: 80rpx; flex: 1; display: flex; align-items: flex-end; }
.bar { width: 100%; border-radius: 8rpx 8rpx 0 0; min-height: 16rpx; }
.bar-label { font-size: 18rpx; color: var(--muted); }
.chart-legend { display: flex; gap: 24rpx; margin-top: 16rpx; }
.legend-item { font-size: 22rpx; color: var(--muted); display: flex; align-items: center; gap: 8rpx; }
.dot { width: 20rpx; height: 20rpx; border-radius: 6rpx; display: inline-block; }
.dot.infant { background: var(--warm); }
.dot.toddler { background: var(--warm-light); }
.dot.preschool { background: var(--info); }
</style>
