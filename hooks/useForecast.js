'use client'
import { useState, useCallback } from 'react'
import { fileToBase64 } from '@/lib/utils'

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024

async function parseUploadedFile(file) {
  if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file)
    return { name: file.name, mimeType: file.type, size: file.size, dataType: 'base64', data: base64 }
  }

  if (file.type === 'text/csv') {
    const Papa = (await import('papaparse')).default
    const text = await file.text()
    const result = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (result.errors.length > 0) {
      console.warn('CSV parse warnings:', result.errors)
    }
    return { name: file.name, mimeType: file.type, size: file.size, dataType: 'json', data: result.data }
  }

  // Excel .xlsx
  const { read, utils } = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer)
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = utils.sheet_to_json(firstSheet)
  return { name: file.name, mimeType: file.type, size: file.size, dataType: 'json', data }
}

function validateFile(file) {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return 'Only PDF, Excel (.xlsx), and CSV files are accepted.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'File must be under 10MB.'
  }
  return null
}

export function useForecast() {
  // Step navigation
  const [step, setStep] = useState('fund-type') // 'fund-type' | 'upload' | 'confirm' | 'scenario' | 'results'
  const [fundType, setFundType] = useState(null) // 'pe' | 'vc' | 'hedge-fund' | 'real-assets'

  // Upload
  const [primaryFile, setPrimaryFile] = useState(null)
  const [secondaryFile, setSecondaryFile] = useState(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileError, setFileError] = useState(null)

  // Extract (Step 3)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [extractError, setExtractError] = useState(null)

  // Confirm (Step 4)
  const [confirmedFields, setConfirmedFields] = useState(null)

  // Scenario config (Step 5)
  const [scenarioConfig, setScenarioConfig] = useState(null)

  // Analyze (Step 6)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)

  // Narrative (Step 7)
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false)
  const [narrative, setNarrative] = useState(null)

  // ── Actions ───────────────────────────────────────────────────────────────

  const selectFundType = useCallback((type) => {
    setFundType(type)
    setStep('upload')
  }, [])

  const processFile = useCallback(async (file, setter) => {
    const error = validateFile(file)
    if (error) { setFileError(error); return false }
    setFileError(null)
    setIsProcessingFile(true)
    try {
      const processed = await parseUploadedFile(file)
      setter(processed)
      return true
    } catch (err) {
      setFileError('Failed to read file. Check that it is not corrupted and try again.')
      console.error('File parse error:', err)
      return false
    } finally {
      setIsProcessingFile(false)
    }
  }, [])

  const handlePrimaryFile = useCallback((file) => {
    return processFile(file, setPrimaryFile)
  }, [processFile])

  const handleSecondaryFile = useCallback((file) => {
    return processFile(file, setSecondaryFile)
  }, [processFile])

  const clearPrimaryFile = useCallback(() => {
    setPrimaryFile(null)
    setFileError(null)
  }, [])

  const clearSecondaryFile = useCallback(() => {
    setSecondaryFile(null)
  }, [])

  // Implemented in Step 3 — wires to /api/forecast/extract
  const extractFields = useCallback(async () => {
    if (!primaryFile) return
    setIsExtracting(true)
    setExtractError(null)
    try {
      const body = {
        fundType,
        primaryFile: {
          name: primaryFile.name,
          mimeType: primaryFile.mimeType,
          dataType: primaryFile.dataType,
          data: primaryFile.data,
        },
        ...(secondaryFile && {
          secondaryFile: {
            name: secondaryFile.name,
            mimeType: secondaryFile.mimeType,
            dataType: secondaryFile.dataType,
            data: secondaryFile.data,
          },
        }),
      }

      const res = await fetch('/api/forecast/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        // Step 3 implements the route — 501 expected until then
        if (res.status === 501) {
          console.info('Extract route not yet implemented (Step 3).')
          setStep('confirm')
          return
        }
        setExtractError(json.error || 'Extraction failed. Please try again.')
        return
      }

      setExtractedFields(json.data)
      setStep('confirm')
    } catch (err) {
      setExtractError('Network error. Please check your connection and try again.')
      console.error('Extract error:', err)
    } finally {
      setIsExtracting(false)
    }
  }, [primaryFile, secondaryFile, fundType])

  const analyzeScenarios = useCallback(async () => {
    if (!confirmedFields || !scenarioConfig) return
    if (analysisResults) return  // already have results — don't re-run
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const body = {
        fundType,
        confirmedFields: {
          fund:        confirmedFields.fund,
          investments: confirmedFields.investments,
        },
        scenarioConfig,
      }
      const res  = await fetch('/api/forecast/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setAnalyzeError(json.error || 'Analysis failed. Please try again.')
        return
      }
      setAnalysisResults(json.data)
    } catch (err) {
      setAnalyzeError('Network error. Please check your connection and try again.')
      console.error('Analyze error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [fundType, confirmedFields, scenarioConfig, analysisResults])

  const generateNarrative = useCallback(async () => {
    if (!analysisResults) return
    if (narrative) return
    setIsGeneratingNarrative(true)
    try {
      const body = { fundType, analysisResults, fieldSources: confirmedFields?.fieldSources }
      const res = await fetch('/api/forecast/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) return
      setNarrative(json.data.narrative)
    } catch (err) {
      console.error('Narrative error:', err)
    } finally {
      setIsGeneratingNarrative(false)
    }
  }, [fundType, analysisResults, confirmedFields, narrative])

  const goBack = useCallback(() => {
    const order = ['fund-type', 'upload', 'confirm', 'scenario', 'results']
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }, [step])

  const clearExtractError = useCallback(() => {
    setExtractError(null)
  }, [])

  const resetAll = useCallback(() => {
    setStep('fund-type')
    setFundType(null)
    setPrimaryFile(null)
    setSecondaryFile(null)
    setFileError(null)
    setIsProcessingFile(false)
    setIsExtracting(false)
    setExtractedFields(null)
    setExtractError(null)
    setConfirmedFields(null)
    setScenarioConfig(null)
    setIsAnalyzing(false)
    setAnalysisResults(null)
    setAnalyzeError(null)
    setIsGeneratingNarrative(false)
    setNarrative(null)
  }, [])

  return {
    // State
    step, fundType,
    primaryFile, secondaryFile, isProcessingFile, fileError,
    isExtracting, extractedFields, extractError,
    confirmedFields, scenarioConfig,
    isAnalyzing, analysisResults, analyzeError,
    isGeneratingNarrative, narrative,
    // Actions
    selectFundType,
    handlePrimaryFile, handleSecondaryFile, clearPrimaryFile, clearSecondaryFile,
    extractFields,
    clearExtractError,
    analyzeScenarios,
    goBack,
    generateNarrative,
    resetAll,
    // Setters for later steps
    setStep, setConfirmedFields, setScenarioConfig,
    setAnalysisResults, setAnalyzeError,
    setIsAnalyzing, setIsGeneratingNarrative, setNarrative,
  }
}
