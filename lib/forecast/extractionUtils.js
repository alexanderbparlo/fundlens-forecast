// Field extraction helpers for the /api/forecast/extract route.

const FUND_TYPE_LABELS = {
  pe:           'PE / Buyout',
  vc:           'Venture Capital',
  'hedge-fund': 'Hedge Fund',
  'real-assets':'Real Assets',
}

// Builds the Anthropic message content array for the extraction call.
// PDF files become document blocks; parsed JSON (Excel/CSV) becomes text blocks.
export function buildExtractionContent(fundType, primaryFile, secondaryFile) {
  const blocks = []

  blocks.push(...fileToBlocks(primaryFile, 'Primary'))

  if (secondaryFile) {
    blocks.push(...fileToBlocks(secondaryFile, 'Supplementary'))
  }

  blocks.push({
    type: 'text',
    text: `Fund type: ${FUND_TYPE_LABELS[fundType] ?? fundType}\n\nExtract all fields from the document(s) above according to the JSON schema and fund-type guidance in your instructions. Return only the JSON object.`,
  })

  return blocks
}

function fileToBlocks(file, label) {
  if (file.dataType === 'base64') {
    return [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: file.mimeType,
          data: file.data,
        },
        title: file.name,
      },
    ]
  }

  // Excel/CSV parsed to JSON rows — format as structured text
  const formatted = formatJsonData(file.data)
  return [
    {
      type: 'text',
      text: `${label} file: ${file.name}\n\nParsed tabular data (${file.data.length} rows):\n${formatted}`,
    },
  ]
}

function formatJsonData(data) {
  if (!Array.isArray(data) || data.length === 0) return '(empty)'
  // Cap at 500 rows to avoid message limits; note truncation
  const rows = data.length > 500 ? data.slice(0, 500) : data
  const suffix = data.length > 500 ? `\n...(truncated — ${data.length - 500} additional rows not shown)` : ''
  return JSON.stringify(rows, null, 2) + suffix
}

// Applies the unfunded commitment derivation logic from the skill file.
// Called after extraction to back-fill any missing derived value.
// Returns a new fund object with the derived field filled in if possible.
export function deriveUnfundedCommitment(fund) {
  const { totalCommittedCapital: committed, calledCapital: called, unfundedCommitment: unfunded } = fund

  // Already fully populated — nothing to derive
  if (committed !== null && called !== null && unfunded !== null) return fund

  const result = { ...fund }

  if (unfunded !== null && committed !== null && called === null) {
    result.calledCapital = committed - unfunded
  } else if (committed !== null && called !== null && unfunded === null) {
    result.unfundedCommitment = committed - called
  }

  return result
}

// Validates the shape of the extraction response from the model.
// Returns { valid: true } or { valid: false, reason: string }.
export function validateExtractionResponse(data) {
  if (!data || typeof data !== 'object') return { valid: false, reason: 'Response is not an object' }
  if (!data.fund || typeof data.fund !== 'object') return { valid: false, reason: 'Missing fund object' }
  if (!Array.isArray(data.investments))             return { valid: false, reason: 'Missing investments array' }
  if (!data.fieldSources || typeof data.fieldSources !== 'object') return { valid: false, reason: 'Missing fieldSources object' }
  return { valid: true }
}

// Server-side file size guard: 3MB binary → ~4MB base64. Vercel's hard body
// limit is 4.5MB total, so this keeps a single-file request safely under it.
const MAX_BASE64_CHARS = 4_200_000

export function validateFilePayload(file, label) {
  if (!file || typeof file !== 'object') return `${label} file is missing or invalid`
  if (!file.name || !file.mimeType || !file.dataType || file.data === undefined) {
    return `${label} file is missing required fields (name, mimeType, dataType, data)`
  }
  if (!['base64', 'json'].includes(file.dataType)) {
    return `${label} file has unrecognised dataType: ${file.dataType}`
  }
  if (file.dataType === 'base64' && typeof file.data === 'string' && file.data.length > MAX_BASE64_CHARS) {
    return `${label} file exceeds the 3 MB size limit`
  }
  return null
}
