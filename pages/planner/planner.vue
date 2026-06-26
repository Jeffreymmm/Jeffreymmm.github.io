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
          <text class="kpi-label">育儿首年</text>
          <text class="kpi-value font-num">{{ fmt(summary.babyFirstYear) }}<text class="u"></text></text>
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
        { age: (f.babyYear || 0) + '年后 · ' + (+f.age + (f.babyYear || 0)) + '岁', event: '生育计划', amt: '首年育儿约 ' + calc.fmt(s.babyFirstYear), color: 'warm' },
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
</style>
