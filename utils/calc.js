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
 * 育儿成本（移植自 baby 页，供后续"买房/育儿"模块复用）
 * cityFactor 城市系数(0.6/0.85/1.0/1.3) tier 精细度(0.7/1.0/1.4/2.0)
 */
function babyCosts(cityFactor, tier) {
  const base = {
    pregnancy: 15000, delivery: 20000, yuesao: 30000,
    milk0_1: 12000, milk1_3: 8000, supplies03: 10000, earlyEdu: 12000, medical03: 6000,
    kinder: 12000, hobbies36: 6000,
    primary: 3000, tutoring712: 10000, hobbies712: 8000,
    middle: 5000, highSchool: 8000, tutoring1318: 18000, hobbies1318: 6000
  }
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
  const baby = babyCosts(+p.cityFactor || 1, +p.babyTier || 1)
  return {
    income, saveRate, monthlySave, yearlySave,
    downAmt, loan, mortgage, mortgagePct,
    timeToSave: toSave,
    houseAge: (+p.age || 0) + toSave,
    babyTotal: baby.total,
    babyFirstYear: baby.firstYear,
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
 * 生娃节点规划（纯函数，三端通用）
 * 回答：「按当前节奏，多久能攒够生娃启动资金、是否赶上计划」
 * profile=用户参数 babyBalance=育儿账户当前余额 babyMonthlySave=每月育儿储蓄
 */
function babyPlan(profile, babyBalance, babyMonthlySave) {
  const p = profile || {}
  const income = +p.income || 0
  const age = +p.age || 0
  const investReturn = +p.investReturn || 0
  const babyYear = +p.babyYear || 0
  // 育儿成本（复用 babyCosts，一次取值）
  const baby = babyCosts(+p.cityFactor || 1, +p.babyTier || 1)
  // 产后收入缓冲：产假期间收入中断/下降，预留数月生活费
  const bufferMonths = 6              // 缓冲月数
  const bufferRate = 0.6              // 按月收入的 60% 估（基本生活费 + 收入缺口）
  const buffer = income * bufferRate * bufferMonths
  // 生娃启动资金门槛 = 首年育儿支出(含孕产) + 产后收入缓冲
  const launchTarget = baby.firstYear + buffer
  // 攒够启动资金所需年数（复用 timeToSave）
  const yearsToReady = timeToSave(launchTarget, +babyBalance || 0, +babyMonthlySave || 0, investReturn)
  return {
    launchTarget,
    firstYear: baby.firstYear,
    buffer,
    yearsToReady,
    readyAge: age + yearsToReady,
    gap: yearsToReady - babyYear,
    status: yearsToReady <= babyYear ? 'onTrack' : 'late',  // 计划内就绪 / 落后计划
    monthlyAvg: baby.monthlyAvg
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

export default { fmt, fmtFull, monthlyMortgage, timeToSave, babyCosts, plannerSummary, healthLevel, babyPlan, milestoneOrder }
