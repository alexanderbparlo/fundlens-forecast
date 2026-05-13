'use client'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForecast } from '@/hooks/useForecast'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { FundTypeSelector } from '@/components/forecast/FundTypeSelector'
import { FileUpload } from '@/components/forecast/FileUpload'
import { ConfirmFields } from '@/components/forecast/ConfirmFields'
import { ScenarioConfig } from '@/components/forecast/ScenarioConfig'
import { ResultsDisplay } from '@/components/forecast/ResultsDisplay'

function ResultsStep({ fc }) {
  useEffect(() => {
    fc.analyzeScenarios()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // run once on mount

  useEffect(() => {
    if (fc.analysisResults && !fc.narrative && !fc.isGeneratingNarrative) {
      fc.generateNarrative()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fc.analysisResults])

  if (fc.isAnalyzing || fc.analyzeError || !fc.analysisResults) {
    return (
      <ResultsLoader
        isAnalyzing={fc.isAnalyzing}
        analyzeError={fc.analyzeError}
        onRetry={() => { fc.setAnalyzeError(null); fc.setAnalysisResults(null); fc.analyzeScenarios() }}
        onBack={fc.goBack}
        onReset={fc.resetAll}
      />
    )
  }

  return (
    <ResultsDisplay
      analysisResults={fc.analysisResults}
      narrative={fc.narrative}
      isGeneratingNarrative={fc.isGeneratingNarrative}
      onBack={fc.goBack}
      onReset={fc.resetAll}
    />
  )
}

function ResultsLoader({ isAnalyzing, analyzeError, onRetry, onBack, onReset }) {
  return (
    <div className="w-full max-w-intake mx-auto">
      <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">Results</p>

      {isAnalyzing && (
        <div className="py-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-block w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="font-body text-sm text-text-secondary">Running scenario analysis…</p>
          </div>
          <p className="font-mono text-data-sm text-text-muted ml-7">
            Projecting cash flows and computing return metrics across all scenarios.
          </p>
        </div>
      )}

      {!isAnalyzing && analyzeError && (
        <div className="py-8">
          <div className="flex items-start gap-2 mb-5 px-4 py-3 rounded-card bg-surface-800 border border-border-subtle">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-data-negative flex-shrink-0 mt-0.5">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="7" cy="9.5" r="0.7" fill="currentColor" />
            </svg>
            <p className="font-body text-sm text-text-secondary">{analyzeError}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-card font-body text-sm font-medium bg-accent text-surface-950 hover:bg-accent-dim transition-colors duration-150"
            >
              Retry analysis
            </button>
            <button
              onClick={onBack}
              className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
            >
              ← Back to scenarios
            </button>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="mt-4 font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150"
            >
              Start new analysis
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const variants = {
  enter:  { opacity: 0, x: 24  },
  center: { opacity: 1, x: 0   },
  exit:   { opacity: 0, x: -24 },
}

const transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
}

export default function ForecastPage() {
  const fc = useForecast()

  function renderStep() {
    switch (fc.step) {
      case 'fund-type':
        return <FundTypeSelector onSelect={fc.selectFundType} />

      case 'upload':
        return (
          <FileUpload
            fundType={fc.fundType}
            primaryFile={fc.primaryFile}
            secondaryFile={fc.secondaryFile}
            isProcessingFile={fc.isProcessingFile}
            fileError={fc.fileError}
            extractError={fc.extractError}
            isExtracting={fc.isExtracting}
            onPrimaryFile={(file) => { fc.clearExtractError(); fc.handlePrimaryFile(file) }}
            onSecondaryFile={fc.handleSecondaryFile}
            clearPrimaryFile={() => { fc.clearExtractError(); fc.clearPrimaryFile() }}
            clearSecondaryFile={fc.clearSecondaryFile}
            onExtract={fc.extractFields}
            onBack={fc.goBack}
          />
        )

      case 'confirm':
        return (
          <ConfirmFields
            fundType={fc.fundType}
            extractedFields={fc.extractedFields}
            onConfirm={(confirmed) => {
              fc.setConfirmedFields(confirmed)
              fc.setStep('scenario')
            }}
            onBack={fc.goBack}
          />
        )

      case 'scenario':
        return (
          <ScenarioConfig
            fundType={fc.fundType}
            onConfirm={(config) => {
              fc.setScenarioConfig(config)
              fc.setStep('results')
            }}
            onBack={fc.goBack}
          />
        )

      case 'results':
        return (
          <ResultsStep
            fc={fc}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-950">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-mono text-label uppercase tracking-widest text-accent">FundLens</span>
            <span className="text-border text-xs">/</span>
            <span className="font-display text-sm font-semibold text-text-primary">Forecast</span>
          </div>

          <div className="flex-1 flex justify-center">
            <ProgressIndicator step={fc.step} />
          </div>

          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-6 pt-16 pb-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={fc.step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="w-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
