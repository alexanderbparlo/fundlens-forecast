'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/utils'

// IRR values are decimal fractions (0.15 = 15%) → use formatPercent
// TVPI/DPI/RVPI are raw multiples (1.8 = 1.8x) → use formatMultiple
// calledPct is a fraction (0.75 = 75%) → use formatPercent
// Stress impactPct / totalImpactPct are natural percentages (-15.4 = -15.4%) → fmtNaturalPct

function fmtHold(v) {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(1)} yrs`
}

function fmtNaturalPct(v, decimals = 1) {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(decimals)}%`
}

const FILL_MAP = {
  bear: 'var(--data-negative)',
  base: 'var(--accent)',
  bull: 'var(--data-positive)',
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ label, sub }) {
  return (
    <div className="mb-4">
      <p className="font-mono text-label uppercase tracking-widest text-accent">{label}</p>
      {sub && <p className="font-body text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function MetricStrip({ items }) {
  return (
    <div className="panel mb-8 flex divide-x divide-border">
      {items.map(({ label, value, valueClass }) => (
        <div key={label} className="flex-1 px-5 py-4 min-w-0">
          <p className="font-body text-xs text-text-muted mb-1.5">{label}</p>
          <p className={`font-mono data-value text-data-lg truncate ${valueClass ?? 'text-text-primary'}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function MetricRow({ label, value, primary }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="font-body text-xs text-text-muted shrink-0">{label}</span>
      <span className={`font-mono text-sm data-value ${primary ? 'text-text-primary' : 'text-text-secondary'}`}>{value}</span>
    </div>
  )
}

function DataFlagList({ flags }) {
  if (!flags?.length) return null
  return (
    <div className="space-y-2">
      {flags.map((f, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="indicator-dot indicator-missing mt-1.5 flex-shrink-0" />
          <p className="font-body text-xs text-text-secondary leading-relaxed">{f}</p>
        </div>
      ))}
    </div>
  )
}

// ── Macro: scenario columns ───────────────────────────────────────────────────

const SCENARIO_COLS = [
  { key: 'bear', labelClass: 'text-data-negative' },
  { key: 'base', labelClass: 'text-accent', featured: true },
  { key: 'bull', labelClass: 'text-data-positive' },
]

function ScenarioColumns({ scenarios, currency }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {SCENARIO_COLS.map(({ key, labelClass, featured }) => {
        const sc = scenarios[key]
        if (!sc) return null
        return (
          <div
            key={key}
            className={featured
              ? 'relative rounded-card border border-accent-border p-5'
              : 'panel p-5'
            }
            style={featured ? { background: 'var(--accent-subtle)' } : undefined}
          >
            {featured && (
              <div
                className="absolute inset-x-0 top-0 h-px rounded-t-card"
                style={{ background: 'var(--accent)' }}
              />
            )}
            <p className={`font-mono text-label uppercase tracking-widest mb-5 ${labelClass}`}>
              {sc.label}
            </p>
            <div className="space-y-3">
              <MetricRow label="Proj. NAV"       value={formatCurrency(sc.projectedNAV, currency)} primary={featured} />
              <MetricRow label="Proj. TVPI"      value={formatMultiple(sc.projectedTVPI)}           primary={featured} />
              <MetricRow label="Proj. IRR"        value={formatPercent(sc.projectedIRR)}             primary={featured} />
              <MetricRow label="Portfolio IRR"    value={formatPercent(sc.portfolioIRR)}             primary={featured} />
              <MetricRow label="Avg. Hold Rem."   value={fmtHold(sc.avgRemainingHoldYears)}          primary={featured} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Macro: projected NAV bar chart ────────────────────────────────────────────

function NavTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2">
      <p className="font-mono text-label uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className="font-mono text-sm text-text-primary">{formatCurrency(payload[0]?.value, currency)}</p>
    </div>
  )
}

function NavChart({ scenarios, currency }) {
  const data = ['bear', 'base', 'bull']
    .filter(k => scenarios[k])
    .map(k => ({ name: scenarios[k].label, value: scenarios[k].projectedNAV ?? 0, key: k }))

  if (!data.length) return null

  return (
    <div className="panel p-5 mb-8">
      <p className="font-body text-xs text-text-muted mb-4">Projected NAV by scenario</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="36%">
          <XAxis
            dataKey="name"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => formatCurrency(v, currency)}
            width={76}
          />
          <Tooltip
            content={<NavTooltip currency={currency} />}
            cursor={{ fill: 'var(--surface-700)', opacity: 0.5 }}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={600} animationEasing="ease-out">
            {data.map(d => <Cell key={d.key} fill={FILL_MAP[d.key]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Macro: investment table ───────────────────────────────────────────────────

const TH = 'px-4 py-3 font-mono text-label uppercase tracking-widest text-text-muted whitespace-nowrap'
const TD = 'px-4 py-3 font-mono text-data-sm data-value'

function InvestmentTable({ investmentProjections, currency }) {
  if (!investmentProjections?.length) return null

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className={`${TH} text-left`}>Company</th>
              <th className={`${TH} text-right`}>Current MV</th>
              <th className={`${TH} text-right`}>MOIC</th>
              <th className={`${TH} text-right`}>Proj. Value</th>
              <th className={`${TH} text-right`}>Proj. MOIC</th>
              <th className={`${TH} text-right`}>Exit Est.</th>
            </tr>
          </thead>
          <tbody>
            {investmentProjections.map((inv, i) => {
              const base = inv.scenarios?.base
              const isLast = i === investmentProjections.length - 1
              return (
                <tr key={inv.name} className={isLast ? '' : 'border-b border-border-subtle'}>
                  <td className="px-4 py-3 font-body text-sm text-text-primary max-w-[160px] truncate" title={inv.name}>
                    {inv.name}
                  </td>
                  <td className={`${TD} text-right text-text-secondary`}>{formatCurrency(inv.currentMV, currency)}</td>
                  <td className={`${TD} text-right text-text-secondary`}>{formatMultiple(inv.currentMoic)}</td>
                  <td className={`${TD} text-right text-text-primary`}>{formatCurrency(base?.projectedValue, currency)}</td>
                  <td className={`${TD} text-right text-text-primary`}>{formatMultiple(base?.projectedMoic)}</td>
                  <td className={`${TD} text-right text-text-muted`}>{base?.projectedExitYear ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Stress test view ──────────────────────────────────────────────────────────

function StressTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <div className="card px-3 py-2">
      <p className="font-body text-xs text-text-secondary mb-1">{label}</p>
      <p className={`font-mono text-sm ${value > 0 ? 'text-data-positive' : 'text-data-negative'}`}>{formatCurrency(value, currency)}</p>
    </div>
  )
}

function StressChart({ factorBreakdown, currency }) {
  const data = factorBreakdown
    .filter(f => f.impact !== 0)
    .map(f => ({ name: f.factor, value: f.impact }))

  if (!data.length) return null

  return (
    <div className="panel p-5 mb-6">
      <p className="font-body text-xs text-text-muted mb-4">Estimated impact by risk factor</p>
      <ResponsiveContainer width="100%" height={Math.max(100, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <XAxis
            type="number"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => formatCurrency(v, currency)}
          />
          <YAxis
            type="category" dataKey="name"
            tick={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={false} tickLine={false} width={132}
          />
          <Tooltip
            content={<StressTooltip currency={currency} />}
            cursor={{ fill: 'var(--surface-700)', opacity: 0.4 }}
          />
          <Bar
            dataKey="value" radius={[0, 2, 2, 0]}
            isAnimationActive animationDuration={600} animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value > 0 ? 'var(--data-positive)' : 'var(--data-negative)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StressView({ stressResults, currency }) {
  const {
    baseNAV, stressedNAV, totalImpact, totalImpactPct,
    factorBreakdown, unmappedExposure, unmappedPct, dataFlags,
  } = stressResults

  const impactNeg = totalImpact < 0

  return (
    <>
      <MetricStrip items={[
        { label: 'Base NAV',      value: formatCurrency(baseNAV, currency) },
        { label: 'Stressed NAV',  value: formatCurrency(stressedNAV, currency) },
        { label: 'Total Impact',  value: formatCurrency(totalImpact, currency), valueClass: impactNeg ? 'text-data-negative' : 'text-data-positive' },
        { label: '% of NAV',      value: fmtNaturalPct(totalImpactPct),         valueClass: impactNeg ? 'text-data-negative' : 'text-data-positive' },
      ]} />

      <div className="mb-8">
        <SectionLabel label="Stress Test Results" sub="Estimated impact on portfolio NAV by risk factor" />

        <div className="panel mb-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className={`${TH} text-left`}>Factor</th>
                  <th className={`${TH} text-right`}>Shock</th>
                  <th className={`${TH} text-right`}>Exposure</th>
                  <th className={`${TH} text-right`}>Impact</th>
                  <th className={`${TH} text-right`}>% NAV</th>
                </tr>
              </thead>
              <tbody>
                {factorBreakdown.map((f, i) => {
                  const hasImpact = f.impact !== 0
                  const impactPos = f.impact > 0
                  const isLast = i === factorBreakdown.length - 1
                  return (
                    <tr key={f.factorKey} className={isLast ? '' : 'border-b border-border-subtle'}>
                      <td className="px-4 py-3 font-body text-sm text-text-primary">{f.factor}</td>
                      <td className={`${TD} text-right text-text-secondary`}>
                        {f.shock >= 0 ? '+' : ''}{f.shock}{f.unit}
                      </td>
                      <td className={`${TD} text-right text-text-secondary`}>{formatCurrency(f.mappedExposure, currency)}</td>
                      <td className={`${TD} text-right ${hasImpact ? (impactPos ? 'text-data-positive' : 'text-data-negative') : 'text-text-muted'}`}>{formatCurrency(f.impact, currency)}</td>
                      <td className={`${TD} text-right ${hasImpact && f.impactPct != null ? (impactPos ? 'text-data-positive' : 'text-data-negative') : 'text-text-muted'}`}>{fmtNaturalPct(f.impactPct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <StressChart factorBreakdown={factorBreakdown} currency={currency} />

        {unmappedExposure > 0 && (
          <div className="flex items-start gap-2 mb-4">
            <span className="indicator-dot indicator-missing mt-1.5 flex-shrink-0" />
            <p className="font-body text-xs text-text-secondary leading-relaxed">
              <span className="text-data-flag">{formatCurrency(unmappedExposure, currency)}</span>
              {' '}({fmtNaturalPct(unmappedPct)} of NAV) could not be mapped to a risk factor and was excluded from the stress calculation.
            </p>
          </div>
        )}

        {dataFlags?.length > 0 && <DataFlagList flags={dataFlags} />}
      </div>
    </>
  )
}

// ── Narrative panel ───────────────────────────────────────────────────────────

function NarrativePanel({ narrative, isGeneratingNarrative }) {
  return (
    <div className="mb-8">
      <SectionLabel label="AI Narrative" sub="Draft summary for LP communication" />
      <div className="panel p-6">
        {isGeneratingNarrative && !narrative && (
          <div>
            <div className="space-y-2.5 mb-5">
              {[72, 100, 88, 100, 64, 92, 80].map((w, i) => (
                <div key={i} className="shimmer h-3.5 rounded-sm" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-label text-text-muted uppercase tracking-widest">Generating narrative…</p>
            </div>
          </div>
        )}
        {!isGeneratingNarrative && !narrative && (
          <p className="font-body text-sm text-text-muted italic">
            Narrative generation failed. The analysis results above are complete.
          </p>
        )}
        {narrative && (
          <div className="space-y-4">
            {narrative.split('\n\n').map((para, i) => (
              <p key={i} className="font-body text-sm text-text-secondary leading-relaxed">{para}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Scope banner ──────────────────────────────────────────────────────────────

function ScopeBanner({ note }) {
  if (!note) return null
  return (
    <div className="scope-banner px-5 py-4 mb-8">
      <div className="flex items-start gap-3">
        <span className="indicator-dot indicator-missing mt-1 flex-shrink-0" />
        <div>
          <p className="font-mono text-label uppercase tracking-widest text-data-flag mb-1">Scope Note</p>
          <p className="font-body text-xs text-text-secondary leading-relaxed">{note}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ResultsDisplay({ analysisResults, narrative, isGeneratingNarrative, onBack, onReset }) {
  const {
    type,
    currency = 'USD',
    asOf,
    currentMetrics,
    scopeNote,
    scenarios,
    stressResults,
    investmentProjections,
  } = analysisResults ?? {}

  const isMacro = type === 'macro'

  const currentItems = currentMetrics ? [
    { label: 'Total NAV',  value: formatCurrency(currentMetrics.totalNAV, currency) },
    { label: 'TVPI',       value: formatMultiple(currentMetrics.tvpi) },
    { label: 'DPI',        value: formatMultiple(currentMetrics.dpi) },
    { label: 'RVPI',       value: formatMultiple(currentMetrics.rvpi) },
    { label: 'Called',     value: formatPercent(currentMetrics.calledPct) },
  ] : []

  const dataFlags = isMacro && scenarios
    ? [...new Set(Object.values(scenarios).flatMap(sc => sc.dataFlags ?? []))]
    : []

  return (
    <div className="w-full max-w-confirm mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">Results</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary mb-1">Analysis complete</h1>
        {asOf && (
          <p className="font-body text-sm text-text-secondary">As of {asOf} · {currency}</p>
        )}
      </div>

      {/* Current fund metrics — macro only; stress has its own strip inside StressView */}
      {isMacro && currentItems.length > 0 && <MetricStrip items={currentItems} />}

      {/* Macro: scenarios + chart + investments */}
      {isMacro && scenarios && (
        <>
          <div className="mb-8">
            <SectionLabel label="Scenario Projections" sub="Bear · Base · Bull assumptions applied" />
            <ScenarioColumns scenarios={scenarios} currency={currency} />
            <NavChart scenarios={scenarios} currency={currency} />
          </div>

          {investmentProjections?.length > 0 && (
            <div className="mb-8">
              <SectionLabel
                label="Portfolio Holdings"
                sub={`${investmentProjections.length} investment${investmentProjections.length !== 1 ? 's' : ''} · base case projection`}
              />
              <InvestmentTable
                investmentProjections={investmentProjections}
                currency={currency}
              />
            </div>
          )}

          {dataFlags.length > 0 && (
            <div className="mb-6">
              <DataFlagList flags={dataFlags} />
            </div>
          )}
        </>
      )}

      {/* Stress: breakdown + chart */}
      {!isMacro && stressResults && (
        <StressView stressResults={stressResults} currency={currency} />
      )}

      {/* AI Narrative */}
      <NarrativePanel narrative={narrative} isGeneratingNarrative={isGeneratingNarrative} />

      {/* Scope disclaimer */}
      <ScopeBanner note={scopeNote} />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="font-body text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
        >
          ← Back to scenarios
        </button>
        {onReset && (
          <button
            onClick={onReset}
            className="font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150"
          >
            Start new analysis
          </button>
        )}
      </div>
    </div>
  )
}
