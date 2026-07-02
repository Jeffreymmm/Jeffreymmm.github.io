/**
 * calc.js —— 纯金融计算（与平台无关，三端通用）
 * 全部为纯函数，便于测试与复用（DRY）。
 */

/** 数字格式化为"万/亿"简写 */
function fmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return Math.round(n).toLocaleString('zh-CN')
}

/** 千分位整数 */
function fmtFull(n) {
  return Math.round(n).toLocaleString('zh-CN')
}

/** 等额本息月供 loan=贷款总额 annualRatePct=年利率(%) years=年限 */
function monthlyMortgage(loan, annualRatePct, years) {
  if (!loan || loan <= 0) return 0
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return loan / n
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/**
 * 攒够目标所需年数（含复利收益）
 * target=目标 current=现有 monthlySave=月存 annualReturnPct=年化收益(%)
 */
function timeToSave(target, current, monthlySave, annualReturnPct) {
  if (current >= target) return 0
  const mr = annualReturnPct / 100 / 12
  let t = 0
  let fv = current
  while (fv < target && t < 600) {
    fv = fv * (1 + mr) + monthlySave
    t++
  }
  return t / 12
}

/**
 * 育儿成本基准表（年度额度；0-3 岁项 supplies03/earlyEdu/medical03 也是每年额度，
 * 0-3 岁累计需 ×3，见 babyCosts.yr03）。
 * 提取为模块常量，供 babyCosts 与 babyMonthlyProfile 共享，避免额度重复定义（DRY）。
 */
const BABY_BASE = {
  pregnancy: 15000, delivery: 20000, yuesao: 30000,
  milk0_1: 12000, milk1_3: 8000, supplies03: 10000, earlyEdu: 12000, medical03: 6000,
  kinder: 12000, hobbies36: 6000,
  primary: 3000, tutoring712: 10000, hobbies712: 8000,
  middle: 5000, highSchool: 8000, tutoring1318: 18000, hobbies1318: 6000
}

/**
 * 育儿成本（移植自 baby 页，供后续"买房/育儿"模块复用）
 * cityFactor 城市系数(0.6/0.85/1.0/1.3) tier 精细度(0.7/1.0/1.4/2.0)
 */
function babyCosts(cityFactor, tier) {
  const base = BABY_BASE
  const f = cityFactor * tier
  const pregnancy = (base.pregnancy + base.delivery + base.yuesao) * f
  const yr03 = (base.milk0_1 + base.milk1_3 * 2 + base.supplies03 * 3 + base.earlyEdu * 3 + base.medical03 * 3) * f
  const yr36 = (base.kinder + base.hobbies36) * 3 * f
  const yr712 = (base.primary + base.tutoring712 + base.hobbies712) * 6 * f
  const yr1318 = (base.middle * 3 + base.highSchool * 3 + base.tutoring1318 * 6 + base.hobbies1318 * 6) * f
  const total = pregnancy + yr03 + yr36 + yr712 + yr1318
  const firstYear = pregnancy + 12000 * f + 10000 * f
  return { pregnancy, yr03, yr36, yr712, yr1318, total, firstYear, monthlyAvg: total / 18 / 12 }
}

/**
 * 0-6 岁逐月花销剖面（供规划页柱图可视化，回答"月存能否覆盖各年龄段支出"）
 * 复用 BABY_BASE 年度额度，按年拆月均，年内常数（KISS，不造季节性假设）。
 * cityFactor 城市系数 tier 精细度
 * 返回：monthly[72] / yearly[6]{age,stage,yearlyTotal,monthlyAvg} / monthlyAvg06 / peakMonthly / total06
 */
function babyMonthlyProfile(cityFactor, tier) {
  const f = (+cityFactor || 1) * (+tier || 1)
  const b = BABY_BASE
  // 0-3 岁每年共享支出（用品+早教+医疗，均为年度额度）
  const toddlerShared = b.supplies03 + b.earlyEdu + b.medical03
  const raw = [
    { age: '0-1岁', yearly: b.milk0_1 + toddlerShared, stage: 'infant' },
    { age: '1-2岁', yearly: b.milk1_3 + toddlerShared, stage: 'toddler' },
    { age: '2-3岁', yearly: b.milk1_3 + toddlerShared, stage: 'toddler' },
    { age: '3-4岁', yearly: b.kinder + b.hobbies36, stage: 'preschool' },
    { age: '4-5岁', yearly: b.kinder + b.hobbies36, stage: 'preschool' },
    { age: '5-6岁', yearly: b.kinder + b.hobbies36, stage: 'preschool' }
  ]
  const yearly = raw.map(y => {
    const yearlyTotal = y.yearly * f
    return { age: y.age, stage: y.stage, yearlyTotal, monthlyAvg: yearlyTotal / 12 }
  })
  const total06 = yearly.reduce((s, y) => s + y.yearlyTotal, 0)
  const peakMonthly = yearly.reduce((m, y) => Math.max(m, y.monthlyAvg), 0)
  // 逐月序列（年内常数），共 72 个月
  const monthly = []
  yearly.forEach(y => { for (let i = 0; i < 12; i++) monthly.push(y.monthlyAvg) })
  return { monthly, yearly, monthlyAvg06: total06 / 72, peakMonthly, total06 }
}

/**
 * 综合规划核心派生（首页/规划页共用）
 * profile=用户参数 currentDownBalance=首付账户当前余额
 */
function plannerSummary(profile, currentDownBalance) {
  const p = profile || {}
  const income = +p.income || 0
  const saveRate = +p.saveRate || 0
  const monthlySave = income * saveRate / 100
  const yearlySave = monthlySave * 12
  const downAmt = (+p.housePrice || 0) * (+p.downPaymentPct || 0) / 100
  const loan = (+p.housePrice || 0) - downAmt
  const mortgage = monthlyMortgage(loan, +p.rate || 0, +p.years || 30)
  const mortgagePct = income > 0 ? mortgage / income * 100 : 0
  const toSave = timeToSave(downAmt, +currentDownBalance || 0, monthlySave, +p.investReturn || 0)
  const cityFactor = +p.cityFactor || 1
  const tier = +p.babyTier || 1
  const baby = babyCosts(cityFactor, tier)
  const babyMonthly06 = babyMonthlyProfile(cityFactor, tier).monthlyAvg06
  return {
    income, saveRate, monthlySave, yearlySave,
    downAmt, loan, mortgage, mortgagePct,
    timeToSave: toSave,
    houseAge: (+p.age || 0) + toSave,
    babyTotal: baby.total,
    babyFirstYear: baby.firstYear,
    babyMonthly06,
    healthScore: healthLevel(mortgagePct)
  }
}

/** 财务健康度评级 */
function healthLevel(mortgagePct) {
  if (mortgagePct > 50) return { label: '高风险', color: 'danger' }
  if (mortgagePct > 40) return { label: '偏紧', color: 'warm' }
  return { label: '稳健', color: 'success' }
}

/**
 * 生娃节点规划（持续现金流模型，纯函数，三端通用）
 * 回答：「多久攒够孕产启动现金」「生娃后月存能否覆盖 0-6 岁月均支出」
 * 启动门槛只算孕产期必备现金（产检+分娩+月子，出生前后必须用现金支付）；
 * 奶粉/用品/早教等持续性支出由生娃后月度育儿储蓄覆盖，不计入一次性门槛。
 * profile=用户参数 babyBalance=育儿账户当前余额 babyMonthlySave=每月育儿储蓄
 */
function babyPlan(profile, babyBalance, babyMonthlySave) {
  const p = profile || {}
  const age = +p.age || 0
  const investReturn = +p.investReturn || 0
  const babyYear = +p.babyYear || 0
  const cityFactor = +p.cityFactor || 1
  const tier = +p.babyTier || 1
  const save = +babyMonthlySave || 0
  const balance = +babyBalance || 0
  // 育儿成本（复用 babyCosts，一次取值）
  const baby = babyCosts(cityFactor, tier)
  // 0-6 岁逐月剖面（供 UI 柱图）
  const profile06 = babyMonthlyProfile(cityFactor, tier)
  // 孕产期现金明细（产检/分娩/月子），用于启动门槛与 UI 拆解
  const f = cityFactor * tier
  const pregnancyBreakdown = {
    checkup: BABY_BASE.pregnancy * f,
    delivery: BABY_BASE.delivery * f,
    yuesao: BABY_BASE.yuesao * f
  }
  // 启动门槛 = 孕产现金（不可分期）；持续支出由月存覆盖
  const launchTarget = baby.pregnancy
  // 攒够启动资金所需年数（复用 timeToSave）
  const yearsToReady = timeToSave(launchTarget, balance, save, investReturn)
  // 持续现金流：月存能否覆盖 0-6 岁月均育儿支出
  const monthlyCost = profile06.monthlyAvg06
  const monthlyGap = Math.max(0, monthlyCost - save)
  const covered = save >= monthlyCost
  const cashflow = {
    monthlyCost,
    monthlySave: save,
    monthlyGap,
    covered,
    // 覆盖时无缺口，runway 无意义 → null（避免 Infinity 的 JSON 序列化与模板渲染问题）
    runwayMonths: covered ? null : (monthlyGap > 0 ? balance / monthlyGap : 0)
  }
  return {
    launchTarget,
    pregnancyBreakdown,
    profile06,
    cashflow,
    yearsToReady,
    readyAge: age + yearsToReady,
    gap: yearsToReady - babyYear,
    status: yearsToReady <= babyYear ? 'onTrack' : 'late',  // 计划内就绪 / 落后计划
    monthlyAvg: monthlyCost
  }
}

/**
 * 买房 vs 生娃 先后顺序建议（纯函数，三端通用）
 * 核心判断依据：生娃有生理年龄窗口、买房可延后；兼顾购房后现金流能否叠加育儿。
 * baby=babyPlan 结果 summary=plannerSummary 结果 profile=用户参数
 */
function milestoneOrder(baby, summary, profile) {
  const p = profile || {}
  const income = +p.income || 0
  const b = baby || {}
  const s = summary || {}
  const houseAge = +s.houseAge || 0
  const readyAge = +b.readyAge || 0
  const primeAge = 35              // 生娃适龄窗口参考（岁）
  const cashflowCap = 55           // 月供+育儿占月收入的健康上限(%)
  const fmtAge = n => n.toFixed(0)

  // 生娃后月度现金流：月供 + 育儿月均支出
  const postExpense = (+s.mortgage || 0) + (+b.monthlyAvg || 0)
  const postPct = income > 0 ? postExpense / income * 100 : 0
  const postHealth = healthLevel(postPct)
  // 购房后月供叠加育儿月支出的合计占比
  const stackedPct = (+s.mortgagePct || 0) + (income > 0 ? (+b.monthlyAvg || 0) / income * 100 : 0)

  let order, reason
  if (Math.abs(houseAge - readyAge) <= 1) {
    order = 'parallel'
    reason = '购房与生娃资金就绪时间接近（' + fmtAge(readyAge) + ' 岁与 ' + fmtAge(houseAge) + ' 岁相差不超过 1 年），建议每月储蓄在首付与育儿间按约 6:4 分配、同步推进。'
  } else if (readyAge + 1 <= houseAge && readyAge <= primeAge) {
    order = 'babyFirst'
    reason = '生娃资金 ' + fmtAge(readyAge) + ' 岁就绪，比购房（' + fmtAge(houseAge) + ' 岁）早 ' + fmtAge(houseAge - readyAge) + ' 年，且在 ' + primeAge + ' 岁适龄窗口内。生娃有生理节奏，建议先启动生育计划，购房可延后。'
  } else if (houseAge <= readyAge && stackedPct <= cashflowCap) {
    order = 'buyFirst'
    reason = '购房（' + fmtAge(houseAge) + ' 岁）早于生娃就绪（' + fmtAge(readyAge) + ' 岁），且购房后月供叠加育儿仅占收入 ' + stackedPct.toFixed(0) + '%，建议先安居再从容备孕。'
  } else if (postPct > cashflowCap) {
    order = 'babyFirst'
    reason = '若同时承担月供与育儿，月支出占收入 ' + postPct.toFixed(0) + '% 偏高。建议先生娃（育儿支出可阶段性控制），购房延后至现金流更宽裕。'
  } else {
    order = 'buyFirst'
    reason = '当前现金流可支撑，建议按你更看重的优先级推进；先购房能锁定居住成本，再备孕。'
  }
  return { order, reason, postExpense, postPct, postHealth }
}

export default { fmt, fmtFull, monthlyMortgage, timeToSave, babyCosts, babyMonthlyProfile, plannerSummary, healthLevel, babyPlan, milestoneOrder }
