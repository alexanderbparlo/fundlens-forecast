// Scenario projection orchestration. No API calls — pure computation.
// Calls metricCalculations.js for all math.

import {
  calculateCurrentMetrics,
  projectExitValue,
  computeRemainingHold,
  investmentGrossIRR,
  projectFundIRR,
  yearsBetween,
  addYears,
  aggregateExposures,
  computeFactorImpact,
  computeIRR,
} from './metricCalculations.js'

const SCENARIO_LABELS = { bear: 'Bear', base: 'Base', bull: 'Bull' }
const STRESS_LABELS = {
  marketPct:    { label: 'Market Risk',        unit: '%'   },
  ratesBps:     { label: 'Interest Rate Risk', unit: 'bps' },
  creditBps:    { label: 'Credit Risk',        unit: 'bps' },
  fxPct:        { label: 'FX Risk',            unit: '%'   },
  liquidityPct: { label: 'Liquidity Risk',     unit: '%'   },
}

// ── Macro scenarios (PE / VC / Real Assets) ───────────────────────────────────

export function runMacroScenarios(confirmedFields, scenarioConfig, fundType) {
  const today = new Date()
  const { fund, investments = [] } = confirmedFields

  const currentMetrics = calculateCurrentMetrics(fund, investments)

  // Per-scenario projections
  const scenarios = {}
  for (const [key, assumptions] of Object.entries(scenarioConfig)) {
    if (key === 'type') continue

    const investmentProjections = investments.map(inv => {
      const projectedValue    = projectExitValue(inv, assumptions, fundType)
      const remainingHold     = computeRemainingHold(inv, assumptions, fundType, today)
      const currentHold       = inv.entryDate ? Math.max(0, yearsBetween(inv.entryDate, today)) : 0
      const totalHoldYears    = currentHold + remainingHold
      const grossIRR          = investmentGrossIRR(inv.costBasis, projectedValue, totalHoldYears)
      const projectedExitDate = inv.entryDate ? addYears(inv.entryDate, totalHoldYears) : null
      const projectedMoic     = inv.costBasis && projectedValue ? projectedValue / inv.costBasis : null
      const currentMoic       = inv.costBasis && inv.marketValue ? inv.marketValue / inv.costBasis : null

      return {
        name:             inv.name,
        costBasis:        inv.costBasis,
        currentMV:        inv.marketValue,
        currentMoic,
        currentHoldYears: currentHold,
        remainingHoldYears: remainingHold,
        totalHoldYears,
        projectedValue,
        projectedExitDate: projectedExitDate ? projectedExitDate.toISOString().slice(0, 10) : null,
        projectedExitYear: projectedExitDate ? projectedExitDate.getFullYear() : null,
        projectedMoic,
        grossIRR,
        dataQuality: projectedValue !== null ? 'complete' : 'insufficient_data',
      }
    })

    const validProjections = investmentProjections.filter(p => p.projectedValue !== null)
    const projectedNAV     = validProjections.reduce((s, p) => s + p.projectedValue, 0)
    const called           = fund.calledCapital ?? 0
    const distributed      = fund.distributionsToDate ?? 0

    const projectedTVPI = called > 0 ? (distributed + projectedNAV) / called : null
    // DPI excludes residual NAV. This engine does not project new distributions,
    // so projected DPI equals realized distributions over called capital.
    const projectedDPI  = called > 0 ? distributed / called : null
    const fundIRR       = projectFundIRR(fund, validProjections, today)

    // Portfolio gross IRR: weighted by cost basis
    const totalCost = validProjections.reduce((s, p) => s + (p.costBasis ?? 0), 0)
    let portfolioIRR = null
    if (totalCost > 0) {
      const blendedCFs = [{ t: 0, amount: -totalCost }]
      for (const p of validProjections) {
        if (p.costBasis && p.totalHoldYears) {
          blendedCFs.push({ t: p.totalHoldYears, amount: p.projectedValue })
        }
      }
      portfolioIRR = computeIRR(blendedCFs)
    }

    const avgRemainingHold = validProjections.length > 0
      ? validProjections.reduce((s, p) => s + p.remainingHoldYears, 0) / validProjections.length
      : null

    const dataFlags = []
    if (investmentProjections.some(p => p.dataQuality !== 'complete')) {
      dataFlags.push(`${investmentProjections.filter(p => p.dataQuality !== 'complete').length} investment(s) excluded — insufficient market value data.`)
    }
    if (validProjections.length < investments.length) {
      dataFlags.push('Fund-level metrics reflect only investments with sufficient data.')
    }

    scenarios[key] = {
      label: SCENARIO_LABELS[key] ?? key,
      assumptions,
      projectedNAV,
      projectedTVPI,
      projectedDPI,
      projectedIRR: fundIRR,
      portfolioIRR,
      avgRemainingHoldYears: avgRemainingHold,
      dataFlags,
      investmentProjections,
    }
  }

  // Reshape: top-level investmentProjections with per-scenario sub-objects
  const allNames = [...new Set(investments.map(i => i.name))]
  const investmentProjections = allNames.map(name => {
    const base = investments.find(i => i.name === name)
    const perScenario = {}
    for (const [key, sc] of Object.entries(scenarios)) {
      const p = sc.investmentProjections.find(p => p.name === name)
      if (p) {
        const { name: _n, costBasis: _c, currentMV: _mv, currentMoic: _cm, currentHoldYears: _ch, ...rest } = p
        perScenario[key] = rest
      }
    }
    const first = Object.values(scenarios)[0]?.investmentProjections.find(p => p.name === name)
    return {
      name,
      costBasis:        base?.costBasis     ?? null,
      currentMV:        base?.marketValue   ?? null,
      currentMoic:      first?.currentMoic  ?? null,
      currentHoldYears: first?.currentHoldYears ?? null,
      entryDate:        base?.entryDate     ?? null,
      scenarios: perScenario,
    }
  })

  // Remove per-scenario investmentProjections from top-level (they're consolidated above)
  for (const sc of Object.values(scenarios)) {
    delete sc.investmentProjections
  }

  return {
    type:                 'macro',
    fundType,
    asOf:                 fund.reportingAsOf ?? null,
    currency:             fund.currency ?? 'USD',
    currentMetrics,
    scenarios,
    investmentProjections,
    scopeNote:            'Investment-level NAV projection only. Excludes fund liabilities, fee accruals, and management company cash flows.',
  }
}

// ── Hedge fund stress test ────────────────────────────────────────────────────

export function runStressTest(confirmedFields, scenarioConfig) {
  const { fund, investments = [] } = confirmedFields
  const { shocks } = scenarioConfig

  const currentMetrics = calculateCurrentMetrics(fund, investments)
  const baseNAV = fund.totalNAV ?? currentMetrics.totalCurrentMV ?? 0

  const exposures = aggregateExposures(investments)
  const totalMapped = Object.entries(exposures)
    .filter(([k]) => k !== 'unmapped')
    .reduce((s, [, v]) => s + v, 0)

  const factorBreakdown = []
  let totalImpact = 0

  for (const [key, shock] of Object.entries(shocks)) {
    if (shock === null || shock === undefined) continue
    const meta = STRESS_LABELS[key]
    if (!meta) continue

    const impact = computeFactorImpact(key, shock, exposures)
    totalImpact += impact

    // Which exposure bucket drives this factor?
    const exposureBucketMap = {
      marketPct:    'equity_long + equity_short',
      ratesBps:     'fixed_income',
      creditBps:    'credit',
      fxPct:        'fx',
      liquidityPct: 'illiquid',
    }
    const bucketKey   = exposureBucketMap[key]
    const bucketTotal = key === 'marketPct'
      ? (exposures.equity_long + exposures.equity_short)
      : (exposures[bucketKey] ?? 0)

    factorBreakdown.push({
      factor:          meta.label,
      factorKey:       key,
      shock,
      unit:            meta.unit,
      mappedExposure:  bucketTotal,
      impact:          Math.round(impact),
      impactPct:       baseNAV > 0 ? (impact / baseNAV) * 100 : null,
    })
  }

  const stressedNAV   = baseNAV + totalImpact
  const unmappedPct   = baseNAV > 0 ? (exposures.unmapped / baseNAV) * 100 : null
  const totalImpactPct = baseNAV > 0 ? (totalImpact / baseNAV) * 100 : null

  const dataFlags = []
  if (exposures.unmapped > 0 && baseNAV > 0) {
    dataFlags.push(`${(exposures.unmapped / baseNAV * 100).toFixed(1)}% of portfolio NAV (${exposures.unmapped.toLocaleString()}) could not be mapped to a risk factor — excluded from stress impact.`)
  }
  if (totalMapped === 0) {
    dataFlags.push('No asset class exposures found in portfolio. Populate the Exposure Type field for each position and re-run.')
  }

  return {
    type:         'stress',
    fundType:     'hedge-fund',
    asOf:         fund.reportingAsOf ?? null,
    currency:     fund.currency ?? 'USD',
    currentMetrics,
    stressResults: {
      baseNAV:        Math.round(baseNAV),
      stressedNAV:    Math.round(stressedNAV),
      totalImpact:    Math.round(totalImpact),
      totalImpactPct: totalImpactPct !== null ? parseFloat(totalImpactPct.toFixed(2)) : null,
      factorBreakdown,
      exposures,
      unmappedExposure: exposures.unmapped,
      unmappedPct:    unmappedPct !== null ? parseFloat(unmappedPct.toFixed(1)) : null,
      dataFlags,
    },
    scopeNote: 'Stress impacts estimated using simplified duration/spread approximations. Actual portfolio impact depends on security-level positioning.',
  }
}
