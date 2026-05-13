'use client'
import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'text/csv':        '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
}
const ACCEPT_ATTR = Object.keys(ACCEPTED_TYPES).join(',')

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function DropZone({ label, hint, file, onFile, onClear, disabled, isProcessing }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled || isProcessing) return
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }, [disabled, isProcessing, onFile])

  const handleDragOver = (e) => { e.preventDefault(); if (!disabled && !isProcessing) setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleChange = (e) => { const f = e.target.files[0]; if (f) onFile(f) }

  if (isProcessing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-border-subtle bg-surface-800 opacity-70">
        <span className="inline-block w-3.5 h-3.5 border border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="font-mono text-sm text-text-muted">Processing file…</p>
      </div>
    )
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-accent-border bg-accent-subtle">
        <FileText size={16} className="text-accent flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm text-text-primary truncate">{file.name}</p>
          <p className="font-mono text-data-sm text-text-muted">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={onClear}
          aria-label="Remove file"
          className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors duration-150"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      className={[
        'relative flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-card border border-dashed transition-colors duration-200 cursor-pointer',
        dragging
          ? 'border-accent bg-accent-subtle'
          : disabled
            ? 'border-border-subtle opacity-40 cursor-not-allowed'
            : 'border-border hover:border-accent-border hover:bg-accent-subtle',
      ].join(' ')}
    >
      <Upload
        size={20}
        className={dragging ? 'text-accent' : 'text-text-muted'}
      />
      <div className="text-center">
        <p className="font-body text-sm text-text-secondary">{label}</p>
        <p className="font-mono text-data-sm text-text-muted mt-0.5">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleChange}
        className="sr-only"
        disabled={disabled}
      />
    </div>
  )
}

export function FileUpload({
  fundType,
  primaryFile,
  secondaryFile,
  isProcessingFile,
  fileError,
  extractError,
  isExtracting,
  onPrimaryFile,
  onSecondaryFile,
  clearPrimaryFile,
  clearSecondaryFile,
  onExtract,
  onBack,
}) {
  const fundLabel = {
    pe:          'PE / Buyout',
    vc:          'Venture Capital',
    'hedge-fund':'Hedge Fund',
    'real-assets':'Real Assets',
  }[fundType] || 'Fund'

  const canExtract = !!primaryFile && !isProcessingFile && !isExtracting

  return (
    <div className="w-full max-w-intake mx-auto">
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">{fundLabel}</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary leading-tight">
          Upload your portfolio snapshot
        </h1>
        <p className="font-body text-sm text-text-secondary mt-2">
          PDF fund reports, Excel exports, or CSV data files up to 10 MB.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-mono text-data-sm text-text-label uppercase tracking-wider mb-2">
            Portfolio snapshot <span className="text-data-flag">required</span>
          </p>
          <DropZone
            label="Drop file here or click to browse"
            hint="PDF · XLSX · CSV"
            file={primaryFile}
            onFile={onPrimaryFile}
            onClear={clearPrimaryFile}
            disabled={isProcessingFile || isExtracting}
            isProcessing={isProcessingFile && !primaryFile}
          />
        </div>

        <div>
          <p className="font-mono text-data-sm text-text-label uppercase tracking-wider mb-2">
            Capital account supplement <span className="text-text-muted">optional</span>
          </p>
          <DropZone
            label="Supplementary document"
            hint="PDF · XLSX · CSV"
            file={secondaryFile}
            onFile={onSecondaryFile}
            onClear={clearSecondaryFile}
            disabled={isProcessingFile || isExtracting}
          />
        </div>
      </div>

      {fileError && (
        <div className="flex items-start gap-2 mt-4 px-3 py-2.5 rounded-card bg-surface-800 border border-border-subtle">
          <AlertCircle size={14} className="text-data-flag flex-shrink-0 mt-0.5" />
          <p className="font-body text-sm text-text-secondary">{fileError}</p>
        </div>
      )}

      {extractError && !fileError && (
        <div className="flex items-start gap-2 mt-4 px-3 py-2.5 rounded-card bg-surface-800 border border-border-subtle">
          <AlertCircle size={14} className="text-data-negative flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm text-text-secondary">{extractError}</p>
            <p className="font-mono text-data-sm text-text-muted mt-0.5">Check your file and try again.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-subtle">
        <button
          onClick={onBack}
          disabled={isExtracting}
          className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150 disabled:opacity-40"
        >
          Back
        </button>

        <button
          onClick={onExtract}
          disabled={!canExtract}
          className={[
            'flex items-center gap-2 px-5 py-2.5 rounded-card font-body text-sm font-medium transition-all duration-200',
            canExtract
              ? 'bg-accent text-surface-950 hover:bg-accent-dim'
              : 'bg-surface-700 text-text-muted cursor-not-allowed',
          ].join(' ')}
        >
          {isExtracting ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
              Extracting
            </>
          ) : (
            'Extract Fields'
          )}
        </button>
      </div>
    </div>
  )
}
