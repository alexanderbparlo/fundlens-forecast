// Pure calculation functions. No side effects, no API calls.
// All percentages stored as natural numbers (35.0 = 35%).
// IRR stored as decimal fractions (0.15 = 15%).

// ── Date helpers ──────────────────────────────────────────────────────────────

export function yearsBetween(dateA, dateB) {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000
  return (new Date(dateB) - new Date(dateA)) / msPerYear
}

export function addYears(date, years) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + Math.floor(years))
  d.setDate(d.getDate() + Math.round((years % 1) * 365.25))
  return d
}

// ── IRR solver (Newton-Raphson) ───────────────────────────────────────────────
// cashFlows: Array<{ t: number, amount: number }>
//   t = years from t=0, amount = signed cash amount (negative = outflow)
// Returns decimal IRR, or null if no convergence / degenerate input.

export function computeIRR(cashFlows, tolerance = 1e-8, maxIter = 200) {
  if (!cashFlows || cashFlows.length < 2) return null

  const hasNeg = cashFlows.some(c => c.amount < 0)
  const hasPos = cashFlows.some(c => c.amount > 0)
  if (!hasNeg || !hasPos) return null  // no sign change — IRR undefined

  function npv(r) {
    return cashFlows.reduce((s, c) => s + c.amount / Math.pow(1 + r, c.t), 0)
  }
  function dnpv(r) {
    return cashFlows.reduce((s, c) => s - (c.t * c.amount) / Math.pow(1 + r, c.t + 1), 0)
  }

  let rate = 0.15
  for (let i = 0; i < maxIter; i++) {
    const f  = npv(rate)
    const df = dnpv(rate)
    if (Math.abs(df) < 1e-12) break
    const next = rate - f / df
    if (next < -0.99 || next > 50) break  // escaped feasible range
    if (Math.abs(next - rate) < tolerance) return next
    rate = next
  }

  // Bisection fallback between -0.99 and 10
  let lo = -0.99, hi = 10
  if (npv(lo) * npv(hi) > 0) return null  // no bracket
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (Math.abs(hi - lo) < tolerance) return mid
    npv(mid) * npv(lo) < 0 ? (hi = mid) : (lo = mid)
  }
  return (lo + hi) / 2
}

// ── Current fund metrics ──────────────────────────────────────────────────────

export function calculateCurrentMetrics(fund, investments = []) {
  const { calledCapital, totalNAV, distributionsToDate, totalCommittedCapital } = fund

  const called      = calledCapital      ?? 0
  const nav         = totalNAV           ?? 0
  const distributed = distributionsToDate ?? 0
  const committed   = totalCommittedCapital ?? 0

  const dpi  = called > 0 ? distributed / called : null
  const rvpi = called > 0 ? nav / called          : null
  const tvpi = (dpi !== null && rvpi !== null) ? dpi + rvpi : null
  const moic = tvpi  // same for simple fund-level view
  const calledPct = committed > 0 ? called / committed : null

  const totalCost    = investments.reduce((s, i) => s + (i.costBasis    ?? 0), 0)
  const totalCurrentMV = investments.reduce((s, i) => s + (i.marketValue ?? 0), 0)
  const unrealizedGL = totalCurrentMV - totalCost

  return { dpi, rvpi, tvpi, moic, calledPct, totalNAV: nav, totalCost, totalCurrentMV, unrealizedGL }
}

// ── Investment-level helpers ──────────────────────────────────────────────────

// Default target hold periods (years) by fund type
const TARGET_HOLD = { pe: 6, vc: 9, 'real-assets': 8 }

export function computeRemainingHold(investment, assumptions, fundType, today = new Date()) {
  const target = TARGET_HOLD[fundType] ?? 6
  const current = investment.entryDate
    ? Math.max(0, yearsBetween(investment.entryDate, today))
    : target / 2  // assume halfway through if no entry date
  const remaining = Math.max(0.5, target - current) + (assumptions.timingMonths ?? 0) / 12
  return remaining
}

// Project a single investment's exit value given scenario assumptions.
// Returns null if insufficient data.
export function projectExitValue(investment, assumptions, fundType) {
  const { marketValue, entryMultiple } = investment
  const { growthPct = 0, exitAdj = 0 } = assumptions

  if (marketValue === null || marketValue === undefined) return null

  const remainingYears = computeRemainingHold(investment, assumptions, fundType)
  const growthFactor   = Math.pow(1 + growthPct / 100, remainingYears)

  let multipleRatio = 1
  if (fundType === 'real-assets') {
    // Cap rate effect: value = NOI/capRate; capRate change (bps) alters value
    const baseCapRate = 5  // % — assumed if not in data
    const newCapRate  = Math.max(0.1, baseCapRate + exitAdj / 100)
    multipleRatio     = baseCapRate / newCapRate
  } else {
    // PE/VC: entry multiple expansion/contraction
    const effectiveMultiple = entryMultiple && entryMultiple > 0 ? entryMultiple : (fundType === 'vc' ? 15 : 8)
    const newMultiple = Math.max(1, effectiveMultiple + exitAdj)
    multipleRatio = newMultiple / effectiveMultiple
  }

  return marketValue * growthFactor * multipleRatio
}

// Compute gross IRR for a single investment (two-point: entry → projected exit).
export function investmentGrossIRR(costBasis, projectedValue, totalHoldYears) {
  if (!costBasis || costBasis <= 0 || !projectedValue || !(totalHoldYears > 0)) return null
  return computeIRR([
    { t: 0,              amount: -costBasis      },
    { t: totalHoldYears, amount: projectedValue  },
  ])
}

// ── Fund-level projected IRR ──────────────────────────────────────────────────
// Simplified: -calledCapital at t=0, projected exits at their respective dates,
// distributionsToDate at midpoint of hold period (approximation).

export function projectFundIRR(fund, investmentProjections, today = new Date()) {
  const { calledCapital, distributionsToDate, inceptionDate } = fund
  if (!calledCapital || calledCapital <= 0) return null

  const inceptionYears = inceptionDate
    ? Math.max(0, yearsBetween(inceptionDate, today))
    : null

  const cashFlows = [{ t: 0, amount: -calledCapital }]

  if (distributionsToDate && distributionsToDate > 0 && inceptionYears !== null) {
    cashFlows.push({ t: inceptionYears / 2, amount: distributionsToDate })
  }

  for (const proj of investmentProjections) {
    if (proj.projectedValue === null) continue
    const exitYears = inceptionYears !== null
      ? inceptionYears + proj.remainingHoldYears
      : proj.totalHoldYears ?? 6
    cashFlows.push({ t: exitYears, amount: proj.projectedValue })
  }

  return cashFlows.length >= 2 ? computeIRR(cashFlows) : null
}

// ── Hedge fund exposure categorization ───────────────────────────────────────

const EXPOSURE_PATTERNS = {
  equity_long:  [/long.?equity/i, /equity.?long/i, /^equity$/i, /long.?only/i],
  equity_short: [/short.?equity/i, /equity.?short/i, /^short$/i],
  fixed_income: [/fixed.?income/i, /bond/i, /treasury/i, /government/i, /rates?/i, /gilt/i],
  credit:       [/credit/i, /loan/i, /clo/i, /cdo/i, /leveraged/i, /high.?yield/i, /ig.?credit/i],
  fx:           [/\bfx\b/i, /currency/i, /forex/i, /foreign.?exchange/i],
  illiquid:     [/illiquid/i, /side.?pocket/i, /private/i, /real.?asset/i, /real.?estate/i],
}

export function categorizeExposure(assetClassExposure) {
  if (!assetClassExposure) return null
  const exp = assetClassExposure.trim()
  for (const [category, patterns] of Object.entries(EXPOSURE_PATTERNS)) {
    if (patterns.some(re => re.test(exp))) return category
  }
  return null
}

export function aggregateExposures(investments) {
  const totals = { equity_long: 0, equity_short: 0, fixed_income: 0, credit: 0, fx: 0, illiquid: 0 }
  let unmapped = 0

  for (const inv of investments) {
    const mv  = inv.marketValue ?? 0
    const cat = categorizeExposure(inv.assetClassExposure)
    if (cat) totals[cat] += Math.abs(mv)
    else     unmapped    += Math.abs(mv)
  }

  return { ...totals, unmapped }
}

// ── Stress factor impact ──────────────────────────────────────────────────────

const APPROX_DURATION        = 5    // years — fixed income modified duration
const APPROX_SPREAD_DURATION = 3    // years — credit spread duration

export function computeFactorImpact(factorKey, shock, exposures) {
  switch (factorKey) {
    case 'marketPct': {
      const f = shock / 100
      return exposures.equity_long * f - exposures.equity_short * f
    }
    case 'ratesBps': {
      return -APPROX_DURATION * (shock / 10000) * exposures.fixed_income
    }
    case 'creditBps': {
      return -APPROX_SPREAD_DURATION * (shock / 10000) * exposures.credit
    }
    case 'fxPct': {
      return exposures.fx * (shock / 100)
    }
    case 'liquidityPct': {
      return exposures.illiquid * (shock / 100)
    }
    default:
      return 0
  }
}
