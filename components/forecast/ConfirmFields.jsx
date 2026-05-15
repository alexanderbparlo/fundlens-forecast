'use client'
import { useState, useMemo } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Source dot ────────────────────────────────────────────────────────────────

function SourceDot({ source }) {
  const cls =
    source === 'extracted' || source === 'derived' ? 'indicator-dot indicator-extracted' :
    source === 'missing'                            ? 'indicator-dot indicator-missing'   :
                                                     'indicator-dot indicator-manual'
  return <span className={cls} title={source} />
}

// ── Field input (fund-level) ──────────────────────────────────────────────────

function FieldInput({ label, fieldKey, value, source, type = 'text', required, placeholder, currency, money, onChange }) {
  const displayValue = value === null || value === undefined ? '' : String(value)

  function handleChange(e) {
    const raw = e.target.value
    if (raw === '') { onChange(null); return }
    if (type === 'number') { onChange(Number(raw)); return }
    onChange(raw)
  }

  const numForHint = money && type === 'number' && value !== null && value !== undefined ? Number(value) : null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <SourceDot source={source} />
        <label className="font-mono text-data-sm text-text-label uppercase tracking-wider">
          {label}
          {required && source === 'missing' && (
            <span className="text-data-flag ml-1">*</span>
          )}
        </label>
      </div>
      <input
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder ?? ''}
        step={type === 'number' ? 'any' : undefined}
        className="w-full px-3 py-2 rounded-card border border-border-subtle bg-surface-800 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border focus:bg-surface-700 transition-colors duration-150"
      />
      {numForHint !== null && !isNaN(numForHint) && numForHint !== 0 && (
        <span className="font-mono text-data-sm text-accent">
          {formatCurrency(numForHint, currency ?? 'USD')}
        </span>
      )}
    </div>
  )
}

// ── Fund field config ─────────────────────────────────────────────────────────

const FUND_FIELDS_LEFT = [
  { key: 'name',               label: 'Fund Name',            type: 'text',   required: true  },
  { key: 'reportingPeriod',    label: 'Reporting Period',     type: 'text',   placeholder: 'e.g. Q3 2024' },
  { key: 'totalCommittedCapital', label: 'Total Committed Capital', type: 'number', required: true, money: true },
  { key: 'unfundedCommitment', label: 'Unfunded Commitment',  type: 'number', money: true },
  { key: 'totalNAV',           label: 'Total NAV',            type: 'number', money: true },
]

const FUND_FIELDS_RIGHT = [
  { key: 'vintageYear',        label: 'Vintage Year',         type: 'number', placeholder: 'e.g. 2019' },
  { key: 'reportingAsOf',      label: 'Reporting As-of',      type: 'date',   required: true  },
  { key: 'calledCapital',      label: 'Called Capital',       type: 'number', money: true },
  { key: 'distributionsToDate',label: 'Distributions to Date',type: 'number', money: true },
  { key: 'currency',           label: 'Currency',             type: 'text',   placeholder: 'USD' },
]

// ── Investment table columns by fund type ─────────────────────────────────────

const INV_COLUMNS = {
  pe: [
    { key: 'name',         label: 'Company',       type: 'text',   w: 160 },
    { key: 'costBasis',    label: 'Cost ($)',       type: 'number', w: 120 },
    { key: 'marketValue',  label: 'Mkt Val ($)',    type: 'number', w: 120 },
    { key: 'entryDate',    label: 'Entry Date',     type: 'date',   w: 128 },
    { key: 'ownershipPct', label: 'Own %',          type: 'number', w: 72  },
    { key: 'entryMultiple',label: 'Entry Mx',       type: 'number', w: 80  },
  ],
  vc: [
    { key: 'name',               label: 'Company',        type: 'text',   w: 160 },
    { key: 'costBasis',          label: 'Cost ($)',        type: 'number', w: 120 },
    { key: 'marketValue',        label: 'Mkt Val ($)',     type: 'number', w: 120 },
    { key: 'entryDate',          label: 'Entry Date',      type: 'date',   w: 128 },
    { key: 'ownershipPct',       label: 'Own %',           type: 'number', w: 72  },
    { key: 'lastRoundValuation', label: 'Last Round ($)',  type: 'number', w: 128 },
  ],
  'hedge-fund': [
    { key: 'name',               label: 'Position',        type: 'text',   w: 180 },
    { key: 'assetClassExposure', label: 'Exposure Type',   type: 'text',   w: 160 },
    { key: 'costBasis',          label: 'Cost ($)',         type: 'number', w: 120 },
    { key: 'marketValue',        label: 'Mkt Val ($)',      type: 'number', w: 128 },
  ],
  'real-assets': [
    { key: 'name',          label: 'Asset',          type: 'text',   w: 180 },
    { key: 'costBasis',     label: 'Equity In ($)',   type: 'number', w: 120 },
    { key: 'marketValue',   label: 'Fair Val ($)',    type: 'number', w: 120 },
    { key: 'entryDate',     label: 'Acquired',        type: 'date',   w: 128 },
    { key: 'entryMultiple', label: 'Entry Cap %',     type: 'number', w: 96  },
  ],
}

function InvestmentRow({ inv, columns, onUpdate, onRemove }) {
  return (
    <tr className="border-t border-border-subtle group">
      {columns.map((col) => {
        const val = inv[col.key]
        const display = val === null || val === undefined ? '' : String(val)

        function handleChange(e) {
          const raw = e.target.value
          if (raw === '') { onUpdate(col.key, null); return }
          onUpdate(col.key, col.type === 'number' ? Number(raw) : raw)
        }

        return (
          <td key={col.key} className="px-2 py-1.5" style={{ minWidth: col.w }}>
            <input
              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
              value={display}
              onChange={handleChange}
              step={col.type === 'number' ? 'any' : undefined}
              className="w-full px-2 py-1 rounded bg-surface-700 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-border transition-colors duration-150 border border-transparent hover:border-border-subtle focus:border-accent-border"
            />
          </td>
        )
      })}
      <td className="px-2 py-1.5 w-8">
        <button
          onClick={onRemove}
          aria-label="Remove investment"
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-data-negative transition-all duration-150"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  )
}

const BLANK_INVESTMENT = {
  name: '', assetClass: '', costBasis: null, marketValue: null,
  unrealizedGainLoss: null, ownershipPct: null, entryDate: null,
  entryMultiple: null, postMoneyValuationAtEntry: null,
  lastRoundValuation: null, realizedProceeds: null, assetClassExposure: null,
}

const EMPTY_FUND = {
  name: null, inceptionDate: null, vintageYear: null, currency: 'USD',
  reportingPeriod: null, reportingAsOf: null, totalCommittedCapital: null,
  calledCapital: null, unfundedCommitment: null, distributionsToDate: null, totalNAV: null,
}

function defaultSources(fund) {
  return Object.fromEntries(Object.keys(fund).map(k => [`fund.${k}`, 'missing']))
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConfirmFields({ fundType, extractedFields, onConfirm, onBack }) {
  const initialFund    = useMemo(() => ({ ...EMPTY_FUND,    ...(extractedFields?.fund         ?? {}) }), [extractedFields])
  const initialInvs    = useMemo(() => extractedFields?.investments ?? [], [extractedFields])
  const initialSources = useMemo(() => ({ ...defaultSources(EMPTY_FUND), ...(extractedFields?.fieldSources ?? {}) }), [extractedFields])

  const [fund,        setFund]        = useState(initialFund)
  const [investments, setInvestments] = useState(initialInvs)
  const [sources,     setSources]     = useState(initialSources)

  const columns = INV_COLUMNS[fundType] ?? INV_COLUMNS.pe

  const fundLabel = {
    pe:           'PE / Buyout',
    vc:           'Venture Capital',
    'hedge-fund': 'Hedge Fund',
    'real-assets':'Real Assets',
  }[fundType] ?? ''

  function handleFundChange(field, value) {
    setFund(prev => ({ ...prev, [field]: value }))
    setSources(prev => {
      const current = prev[`fund.${field}`]
      if (current === 'extracted' || current === 'derived' || current === 'missing') {
        return { ...prev, [`fund.${field}`]: 'manual' }
      }
      return prev
    })
  }

  function handleInvestmentUpdate(idx, field, value) {
    setInvestments(prev => prev.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv))
  }

  function handleAddInvestment() {
    setInvestments(prev => [...prev, { ...BLANK_INVESTMENT }])
  }

  function handleRemoveInvestment(idx) {
    setInvestments(prev => prev.filter((_, i) => i !== idx))
  }

  function handleConfirm() {
    onConfirm({ fund, investments, fieldSources: sources })
  }

  const missingRequired = (sources['fund.name'] === 'missing' && !fund.name) ||
                          (sources['fund.reportingAsOf'] === 'missing' && !fund.reportingAsOf)

  return (
    <div className="w-full max-w-confirm mx-auto">
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">{fundLabel}</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary leading-tight">
          Review extracted fields
        </h1>
        <p className="font-body text-sm text-text-secondary mt-2">
          Correct any errors before running analysis. Fields will not be stored.
        </p>
      </div>

      {/* Extraction notes */}
      {extractedFields?.extractionNotes && (
        <div className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-card bg-surface-800 border border-border-subtle">
          <AlertCircle size={14} className="text-data-flag flex-shrink-0 mt-0.5" />
          <p className="font-body text-sm text-text-secondary">{extractedFields.extractionNotes}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="indicator-dot indicator-extracted" />
          <span className="font-mono text-data-sm text-text-muted">Extracted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="indicator-dot indicator-missing" />
          <span className="font-mono text-data-sm text-text-muted">Not found</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="indicator-dot indicator-manual" />
          <span className="font-mono text-data-sm text-text-muted">Edited</span>
        </div>
      </div>

      {/* Fund details */}
      <section className="mb-8">
        <p className="font-mono text-data-sm text-text-label uppercase tracking-wider mb-4">Fund Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {FUND_FIELDS_LEFT.map((f) => (
            <FieldInput
              key={f.key}
              label={f.label}
              fieldKey={f.key}
              value={fund[f.key]}
              source={sources[`fund.${f.key}`] ?? 'missing'}
              type={f.type}
              required={f.required}
              placeholder={f.placeholder}
              currency={fund.currency}
              money={f.money ?? false}
              onChange={(v) => handleFundChange(f.key, v)}
            />
          ))}
          {FUND_FIELDS_RIGHT.map((f) => (
            <FieldInput
              key={f.key}
              label={f.label}
              fieldKey={f.key}
              value={fund[f.key]}
              source={sources[`fund.${f.key}`] ?? 'missing'}
              type={f.type}
              required={f.required}
              placeholder={f.placeholder}
              currency={fund.currency}
              money={f.money ?? false}
              onChange={(v) => handleFundChange(f.key, v)}
            />
          ))}
        </div>
      </section>

      <div className="accent-line mb-8" />

      {/* Investments */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-data-sm text-text-label uppercase tracking-wider">
            Portfolio Holdings
            {investments.length > 0 && (
              <span className="ml-2 text-text-muted normal-case">({investments.length})</span>
            )}
          </p>
          <button
            onClick={handleAddInvestment}
            className="flex items-center gap-1.5 font-mono text-data-sm text-text-muted hover:text-accent transition-colors duration-150"
          >
            <Plus size={12} />
            Add row
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-card border border-dashed border-border-subtle text-text-muted">
            <p className="font-body text-sm">No investments found — add rows manually if needed.</p>
          </div>
        ) : (() => {
          const totalCost = investments.reduce((s, inv) => s + (Number(inv.costBasis) || 0), 0)
          const totalMV   = investments.reduce((s, inv) => s + (Number(inv.marketValue) || 0), 0)
          const currency  = fund.currency ?? 'USD'
          return (
            <div className="overflow-x-auto rounded-card border border-border-subtle">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-800">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className="px-2 py-2 font-mono text-data-sm text-text-label uppercase tracking-wider whitespace-nowrap"
                        style={{ minWidth: col.w }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv, idx) => (
                    <InvestmentRow
                      key={idx}
                      inv={inv}
                      columns={columns}
                      onUpdate={(field, value) => handleInvestmentUpdate(idx, field, value)}
                      onRemove={() => handleRemoveInvestment(idx)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle bg-surface-800">
                    {columns.map((col, i) => {
                      if (i === 0) return (
                        <td key={col.key} className="px-2 py-2 font-mono text-data-sm text-text-label uppercase tracking-wider">
                          Total
                        </td>
                      )
                      if (col.key === 'costBasis') return (
                        <td key={col.key} className="px-2 py-2 font-mono text-sm text-text-primary">
                          {formatCurrency(totalCost, currency)}
                        </td>
                      )
                      if (col.key === 'marketValue') return (
                        <td key={col.key} className="px-2 py-2 font-mono text-sm text-text-primary">
                          {formatCurrency(totalMV, currency)}
                        </td>
                      )
                      return <td key={col.key} />
                    })}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })()}
      </section>

      {/* CTA */}
      <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
        <button
          onClick={onBack}
          className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
        >
          Back
        </button>

        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 px-5 py-2.5 rounded-card font-body text-sm font-medium bg-accent text-surface-950 hover:bg-accent-dim transition-colors duration-200"
        >
          Confirm & Run Analysis
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
