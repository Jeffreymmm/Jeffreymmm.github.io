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

export default { fmt, fmtFull, monthlyMortgage, timeToSave, babyCosts, plannerSummary, healthLevel }
