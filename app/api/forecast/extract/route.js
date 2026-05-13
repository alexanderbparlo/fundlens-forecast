import { NextResponse } from 'next/server'
import client from '@/lib/anthropic/client'
import { handleAnthropicError } from '@/lib/anthropic/errorHandler'
import { checkRateLimit, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit'
import { parseJsonResponse } from '@/lib/utils'
import { EXTRACT_SYSTEM_PROMPT } from '@/lib/prompts/forecastPrompts'
import {
  buildExtractionContent,
  deriveUnfundedCommitment,
  validateExtractionResponse,
  validateFilePayload,
} from '@/lib/forecast/extractionUtils'

export const maxDuration = 300

const VALID_FUND_TYPES = new Set(['pe', 'vc', 'hedge-fund', 'real-assets'])

export async function POST(request) {
  // Rate limiting
  const identifier = getClientIdentifier(request)
  const rateResult = await checkRateLimit('extract', identifier)
  if (!rateResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit reached. Please wait before submitting another document.' },
      { status: 429, headers: rateLimitHeaders(rateResult) }
    )
  }

  // Parse body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { fundType, primaryFile, secondaryFile } = body

  // Validate fund type
  if (!fundType || !VALID_FUND_TYPES.has(fundType)) {
    return NextResponse.json(
      { success: false, error: `Invalid fund type. Must be one of: ${[...VALID_FUND_TYPES].join(', ')}.` },
      { status: 400 }
    )
  }

  // Validate files
  const primaryError = validateFilePayload(primaryFile, 'Primary')
  if (primaryError) {
    return NextResponse.json({ success: false, error: primaryError }, { status: 400 })
  }

  if (secondaryFile !== undefined && secondaryFile !== null) {
    const secondaryError = validateFilePayload(secondaryFile, 'Secondary')
    if (secondaryError) {
      return NextResponse.json({ success: false, error: secondaryError }, { status: 400 })
    }
  }

  // Build Anthropic request
  const content = buildExtractionContent(
    fundType,
    primaryFile,
    secondaryFile ?? null
  )

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'xhigh' },
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock?.text) {
      console.error('Extract: no text block in response', response.content)
      return NextResponse.json(
        { success: false, error: 'Extraction produced no output. Please try again.' },
        { status: 500 }
      )
    }

    let extracted
    try {
      extracted = parseJsonResponse(textBlock.text)
    } catch (err) {
      console.error('Extract: failed to parse model JSON:', err, '\nRaw:', textBlock.text.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'Extraction output could not be parsed. Please try again.' },
        { status: 500 }
      )
    }

    const validation = validateExtractionResponse(extracted)
    if (!validation.valid) {
      console.error('Extract: invalid response shape:', validation.reason, extracted)
      return NextResponse.json(
        { success: false, error: 'Extraction returned an unexpected format. Please try again.' },
        { status: 500 }
      )
    }

    // Apply unfunded commitment derivation for any field the model missed
    extracted.fund = deriveUnfundedCommitment(extracted.fund)

    // Update fieldSources if derivation filled in a previously missing field
    if (extracted.fund.unfundedCommitment !== null && extracted.fieldSources['fund.unfundedCommitment'] === 'missing') {
      extracted.fieldSources['fund.unfundedCommitment'] = 'derived'
    }
    if (extracted.fund.calledCapital !== null && extracted.fieldSources['fund.calledCapital'] === 'missing') {
      extracted.fieldSources['fund.calledCapital'] = 'derived'
    }

    return NextResponse.json(
      { success: true, data: extracted },
      { headers: rateLimitHeaders(rateResult) }
    )
  } catch (err) {
    return handleAnthropicError(err)
  }
}
