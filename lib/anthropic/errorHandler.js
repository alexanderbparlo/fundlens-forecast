import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export function handleAnthropicError(error) {
  if (error instanceof Anthropic.APIConnectionError) {
    console.error('Anthropic connection error:', error.message)
    return NextResponse.json(
      { success: false, error: 'Connection failed. Please try again.' },
      { status: 503 }
    )
  }

  if (error instanceof Anthropic.RateLimitError) {
    console.error('Anthropic rate limit hit:', error.message)
    return NextResponse.json(
      { success: false, error: 'Rate limit reached. Please wait a moment.' },
      { status: 429 }
    )
  }

  if (error instanceof Anthropic.APIStatusError) {
    console.error('Anthropic API status error:', error.status, error.message)
    return NextResponse.json(
      { success: false, error: `API error: ${error.message}` },
      { status: error.status }
    )
  }

  console.error('Unexpected error in Anthropic call:', error)
  return NextResponse.json(
    { success: false, error: 'An unexpected error occurred.' },
    { status: 500 }
  )
}
