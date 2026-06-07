import { NextResponse } from 'next/server'
import client from '@/lib/anthropic/client'
import { handleAnthropicError } from '@/lib/anthropic/errorHandler'
import { checkRateLimit, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit'
import { parseJsonResponse } from '@/lib/utils'
import { NARRATIVE_SYSTEM_PROMPT } from '@/lib/prompts/forecastPrompts'

export const maxDuration = 300

const VALID_FUND_TYPES = new Set(['pe', 'vc', 'hedge-fund', 'real-assets'])

const FUND_TYPE_LABELS = {
  pe:           'PE / Buyout',
  vc:           'Venture Capital',
  'hedge-fund': 'Hedge Fund',
  'real-assets':'Real Assets',
}

function pct(v, decimals = 1) {
  if (v === null || v === undefined) return 'N/A'
  return `${v.toFixed(decimals)}%`
}

function mult(v, decimals = 2) {
  if (v === null || v === undefined) return 'N/A'
  return `${v.toFixed(decimals)}x`
}

function irr(v) {
  if (v === null || v === undefined) return 'N/A'
  return `${(v * 100).toFixed(1)}%`
}

function currency(v, cur = 'USD') {
  if (v === null || v === undefined) return 'N/A'
  const symbol = cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9)  return `${sign}${symbol}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}${symbol}${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3)  return `${sign}${symbol}${(abs / 1e3).toFixed(0)}K`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

function buildMacroUserMessage(fundType, results, manualFields) {
  const cur = results.currency ?? 'USD'
  const fundLabel = FUND_TYPE_LABELS[fundType] ?? fundType

  const scenarioLines = Object.entries(results.scenarios).map(([key, sc]) => {
    const a = sc.assumptions
    return `  ${sc.label}:
    Assumptions: Revenue/valuation growth ${a.growthPct}%, exit multiple delta ${a.exitAdj}x, timing shift ${a.timingMonths} months, hurdle rate delta ${a.discountBps} bps
    Projected NAV: ${currency(sc.projectedNAV, cur)}
    Projected TVPI: ${mult(sc.projectedTVPI)}
    Projected IRR: ${irr(sc.projectedIRR)}
    Portfolio gross IRR: ${irr(sc.portfolioIRR)}
    Avg remaining hold: ${sc.avgRemainingHoldYears !== null ? `${sc.avgRemainingHoldYears.toFixed(1)} years` : 'N/A'}
    Data flags: ${sc.dataFlags?.length ? sc.dataFlags.join(' | ') : 'None'}`
  }).join('\n\n')

  const invLines = results.investmentProjections.map(inv => {
    const scLines = Object.entries(inv.scenarios).map(([k, s]) =>
      `    ${k}: projected ${currency(s.projectedValue, cur)}, MOIC ${mult(s.projectedMoic)}, gross IRR ${irr(s.grossIRR)}, exit ~${s.projectedExitYear ?? 'N/A'}`
    ).join('\n')
    return `  ${inv.name}: cost ${currency(inv.costBasis, cur)}, current MV ${currency(inv.currentMV, cur)}, current MOIC ${mult(inv.currentMoic)}\n${scLines}`
  }).join('\n\n')

  const manualNote = manualFields.length > 0
    ? `Manually entered fields (not extracted from document): ${manualFields.join(', ')}`
    : 'All fields extracted from uploaded document.'

  return `FUND ANALYSIS NARRATIVE REQUEST
================================

Fund Type: ${fundLabel}
As-of Date: ${results.asOf ?? 'Not specified'}
Currency: ${cur}

CURRENT METRICS
Total committed capital: ${currency(results.currentMetrics.totalCost, cur)}
Current total NAV: ${currency(results.currentMetrics.totalNAV, cur)}
DPI: ${mult(results.currentMetrics.dpi)}
RVPI: ${mult(results.currentMetrics.rvpi)}
TVPI: ${mult(results.currentMetrics.tvpi)}
Called %: ${results.currentMetrics.calledPct !== null ? pct(results.currentMetrics.calledPct * 100) : 'N/A'}

SCENARIO PROJECTIONS
${scenarioLines}

INVESTMENT-LEVEL PROJECTIONS (${results.investmentProjections.length} investments)
${invLines || 'No investment-level data available.'}

DATA QUALITY
${manualNote}

SCOPE NOTE (include this in the final paragraph)
${results.scopeNote}

Write the narrative now.`
}

function buildStressUserMessage(results, manualFields) {
  const cur = results.currency ?? 'USD'
  const sr = results.stressResults

  const factorLines = sr.factorBreakdown.map(f =>
    `  ${f.factor}: shock ${f.shock} ${f.unit}, mapped exposure ${currency(f.mappedExposure, cur)}, estimated impact ${currency(f.impact, cur)} (${f.impactPct !== null ? pct(f.impactPct) : 'N/A'} of NAV)`
  ).join('\n')

  const manualNote = manualFields.length > 0
    ? `Manually entered fields (not extracted from document): ${manualFields.join(', ')}`
    : 'All fields extracted from uploaded document.'

  return `HEDGE FUND STRESS TEST NARRATIVE REQUEST
=========================================

As-of Date: ${results.asOf ?? 'Not specified'}
Currency: ${cur}

CURRENT PORTFOLIO
Current NAV: ${currency(sr.baseNAV, cur)}
Investment count: ${results.currentMetrics.totalCurrentMV !== null ? results.investmentProjections?.length ?? 'N/A' : 'N/A'}

STRESS RESULTS
Stressed NAV: ${currency(sr.stressedNAV, cur)}
Total impact: ${currency(sr.totalImpact, cur)} (${sr.totalImpactPct !== null ? pct(sr.totalImpactPct) : 'N/A'} of NAV)

FACTOR BREAKDOWN
${factorLines}

UNMAPPED EXPOSURE
${sr.unmappedExposure > 0 ? `${currency(sr.unmappedExposure, cur)} (${sr.unmappedPct !== null ? pct(sr.unmappedPct) : 'N/A'} of NAV) could not be mapped to a risk factor and was excluded.` : 'All exposures successfully mapped.'}

DATA FLAGS
${sr.dataFlags?.length ? sr.dataFlags.join('\n') : 'None.'}

DATA QUALITY
${manualNote}

SCOPE NOTE (include this in the final paragraph)
${results.scopeNote}

Write the narrative now.`
}

function extractManualFields(fieldSources) {
  if (!fieldSources) return []
  return Object.entries(fieldSources)
    .filter(([, v]) => v === 'manual')
    .map(([k]) => k.replace('fund.', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim())
}

export async function POST(request) {
  const identifier = getClientIdentifier(request)
  const rateResult = await checkRateLimit('narrative', identifier)
  if (!rateResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit reached. Please wait before generating another narrative.' },
      { status: 429, headers: rateLimitHeaders(rateResult) }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { fundType, analysisResults, fieldSources } = body

  if (!fundType || !VALID_FUND_TYPES.has(fundType)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing fundType.' },
      { status: 400 }
    )
  }
  if (!analysisResults || typeof analysisResults !== 'object') {
    return NextResponse.json(
      { success: false, error: 'analysisResults is required.' },
      { status: 400 }
    )
  }

  const manualFields = extractManualFields(fieldSources)
  const userMessage  = analysisResults.type === 'stress'
    ? buildStressUserMessage(analysisResults, manualFields)
    : buildMacroUserMessage(fundType, analysisResults, manualFields)

  try {
    const response = await client.messages.create({
      model:         'claude-opus-4-8',
      max_tokens:    2000,
      thinking:      { type: 'adaptive' },
      output_config: { effort: 'xhigh' },
      system:        NARRATIVE_SYSTEM_PROMPT,
      messages:      [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock?.text) {
      return NextResponse.json(
        { success: false, error: 'Narrative generation produced no output. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: { narrative: textBlock.text.trim() } },
      { headers: rateLimitHeaders(rateResult) }
    )
  } catch (err) {
    return handleAnthropicError(err)
  }
}
