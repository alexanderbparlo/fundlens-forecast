import { NextResponse } from 'next/server'
import { handleAnthropicError } from '@/lib/anthropic/errorHandler'
import { checkRateLimit, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit'
import { runMacroScenarios, runStressTest } from '@/lib/forecast/scenarioEngine'

export const maxDuration = 300

const VALID_FUND_TYPES = new Set(['pe', 'vc', 'hedge-fund', 'real-assets'])

export async function POST(request) {
  const identifier = getClientIdentifier(request)
  const rateResult = await checkRateLimit('analyze', identifier)
  if (!rateResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit reached. Please wait before running another analysis.' },
      { status: 429, headers: rateLimitHeaders(rateResult) }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { fundType, confirmedFields, scenarioConfig } = body

  if (!fundType || !VALID_FUND_TYPES.has(fundType)) {
    return NextResponse.json(
      { success: false, error: `Invalid fund type. Must be one of: ${[...VALID_FUND_TYPES].join(', ')}.` },
      { status: 400 }
    )
  }

  if (!confirmedFields || typeof confirmedFields !== 'object' || !confirmedFields.fund) {
    return NextResponse.json(
      { success: false, error: 'confirmedFields is required and must include a fund object.' },
      { status: 400 }
    )
  }

  if (!scenarioConfig || !scenarioConfig.type) {
    return NextResponse.json(
      { success: false, error: 'scenarioConfig is required and must include a type field.' },
      { status: 400 }
    )
  }

  const validTypes = ['macro', 'stress']
  if (!validTypes.includes(scenarioConfig.type)) {
    return NextResponse.json(
      { success: false, error: `scenarioConfig.type must be one of: ${validTypes.join(', ')}.` },
      { status: 400 }
    )
  }

  if (scenarioConfig.type === 'stress' && fundType !== 'hedge-fund') {
    return NextResponse.json(
      { success: false, error: 'Stress test scenarios are only valid for Hedge Fund fund type.' },
      { status: 400 }
    )
  }

  if (scenarioConfig.type === 'macro' && fundType === 'hedge-fund') {
    return NextResponse.json(
      { success: false, error: 'Macro scenarios are not valid for Hedge Fund fund type. Use stress test.' },
      { status: 400 }
    )
  }

  try {
    let results
    if (scenarioConfig.type === 'stress') {
      results = runStressTest(confirmedFields, scenarioConfig)
    } else {
      results = runMacroScenarios(confirmedFields, scenarioConfig, fundType)
    }

    return NextResponse.json(
      { success: true, data: results },
      { headers: rateLimitHeaders(rateResult) }
    )
  } catch (err) {
    // runMacroScenarios / runStressTest are pure JS — unexpected errors go here
    if (err?.name === 'AnthropicError' || err?.status) return handleAnthropicError(err)
    console.error('Analyze computation error:', err)
    return NextResponse.json(
      { success: false, error: 'Analysis computation failed. Please check your input data and try again.' },
      { status: 500 }
    )
  }
}
