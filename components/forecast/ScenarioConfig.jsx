'use client'
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

// ── Macro scenario — field configs per fund type ──────────────────────────────

const MACRO_FIELDS = {
  pe: [
    { key: 'growthPct',    label: 'Revenue Growth',    unit: '%',   step: 0.5, hint: 'Applied to portfolio co. revenues'          },
    { key: 'exitAdj',      label: 'Exit Multiple Adj', unit: 'x',   step: 0.1, hint: 'Delta applied to current EV/EBITDA'          },
    { key: 'timingMonths', label: 'Exit Timing',       unit: 'mo',  step: 1,   hint: 'Shift in projected hold period (+= delayed)' },
    { key: 'discountBps',  label: 'Hurdle Rate Adj',   unit: 'bps', step: 10,  hint: 'Delta to IRR hurdle (+= higher hurdle)'      },
  ],
  vc: [
    { key: 'growthPct',    label: 'Next Round Val. Δ', unit: '%',   step: 1,   hint: 'Change in post-money at next round'          },
    { key: 'exitAdj',      label: 'Exit Multiple Adj', unit: 'x',   step: 0.1, hint: 'Delta to exit valuation multiple'            },
    { key: 'timingMonths', label: 'Exit Timing',       unit: 'mo',  step: 1,   hint: 'Shift in projected exit (+= delayed)'        },
    { key: 'discountBps',  label: 'Hurdle Rate Adj',   unit: 'bps', step: 10,  hint: 'Delta to IRR hurdle (+= higher hurdle)'      },
  ],
  'real-assets': [
    { key: 'growthPct',    label: 'NOI Growth',        unit: '%',   step: 0.5, hint: 'Annual net operating income growth'          },
    { key: 'exitAdj',      label: 'Cap Rate Δ',        unit: 'bps', step: 10,  hint: 'Cap rate change (+= expansion, value ↓)'     },
    { key: 'timingMonths', label: 'Exit Timing',       unit: 'mo',  step: 1,   hint: 'Shift in projected disposition (+= delayed)' },
    { key: 'discountBps',  label: 'Hurdle Rate Adj',   unit: 'bps', step: 10,  hint: 'Delta to IRR hurdle (+= higher hurdle)'      },
  ],
}

const DEFAULTS = {
  bear: { growthPct: -5,  exitAdj: -1.5, timingMonths: 12,  discountBps: 200  },
  base: { growthPct:  5,  exitAdj:  0,   timingMonths:  0,  discountBps:   0  },
  bull: { growthPct: 12,  exitAdj:  1.5, timingMonths: -6,  discountBps: -100 },
}

const SCENARIOS = [
  { key: 'bear', label: 'Bear',  sublabel: 'Downside',         color: 'text-data-negative' },
  { key: 'base', label: 'Base',  sublabel: 'Base Case',        color: 'text-text-secondary' },
  { key: 'bull', label: 'Bull',  sublabel: 'Upside',           color: 'text-data-positive'  },
]

// ── Stress test — risk categories ─────────────────────────────────────────────

const STRESS_CATEGORIES = [
  {
    key:     'marketPct',
    label:   'Market Risk',
    desc:    'Broad equity market move (%)',
    detail:  'Applied to long/short equity exposures',
    unit:    '%',
    default: -20,
  },
  {
    key:     'ratesBps',
    label:   'Interest Rate Risk',
    desc:    'Parallel yield curve shift (bps)',
    detail:  'Applied to fixed income and rate-sensitive positions',
    unit:    'bps',
    default: 200,
  },
  {
    key:     'creditBps',
    label:   'Credit Risk',
    desc:    'Credit spread widening (bps)',
    detail:  'Applied to corporate bonds, leveraged loans, CLOs',
    unit:    'bps',
    default: 150,
  },
  {
    key:     'fxPct',
    label:   'FX Risk',
    desc:    'Currency move vs. USD (%)',
    detail:  'Applied to non-USD denominated positions',
    unit:    '%',
    default: -10,
  },
  {
    key:     'liquidityPct',
    label:   'Liquidity Risk',
    desc:    'Illiquid position haircut (%)',
    detail:  'Applied to side pockets and illiquid credit',
    unit:    '%',
    default: -15,
  },
]

// ── Shared input ──────────────────────────────────────────────────────────────

function ScenarioInput({ value, onChange, step }) {
  return (
    <input
      type="number"
      value={value === null || value === undefined ? '' : value}
      step={step ?? 'any'}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="w-full px-2 py-1.5 rounded-card border border-border-subtle bg-surface-800 font-mono text-sm text-text-primary text-right focus:outline-none focus:border-accent-border focus:bg-surface-700 transition-colors duration-150"
    />
  )
}

// ── Macro scenario config ─────────────────────────────────────────────────────

function MacroScenarioConfig({ fundType, initialConfig, onConfirm, onBack }) {
  const fields = MACRO_FIELDS[fundType] ?? MACRO_FIELDS.pe
  const [values, setValues] = useState(() =>
    initialConfig?.type === 'macro'
      ? { bear: initialConfig.bear, base: initialConfig.base, bull: initialConfig.bull }
      : { ...DEFAULTS }
  )

  const fundLabel = {
    pe:           'PE / Buyout',
    vc:           'Venture Capital',
    'real-assets':'Real Assets',
  }[fundType] ?? ''

  function update(scenario, key, value) {
    setValues(prev => ({ ...prev, [scenario]: { ...prev[scenario], [key]: value } }))
  }

  function reset(scenario) {
    setValues(prev => ({ ...prev, [scenario]: { ...DEFAULTS[scenario] } }))
  }

  function handleConfirm() {
    onConfirm({ type: 'macro', ...values })
  }

  return (
    <div className="w-full max-w-confirm mx-auto">
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">{fundLabel}</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary leading-tight">
          Configure scenarios
        </h1>
        <p className="font-body text-sm text-text-secondary mt-2">
          Adjust the assumptions for each scenario. All three run simultaneously.
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-800 border-b border-border-subtle">
              <th className="px-4 py-3 w-48" />
              {SCENARIOS.map(s => (
                <th key={s.key} className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`font-mono text-sm font-medium uppercase tracking-wider ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="font-body text-data-sm text-text-muted">{s.sublabel}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, fi) => (
              <tr
                key={field.key}
                className={[
                  'border-b border-border-subtle last:border-0',
                  fi % 2 === 0 ? 'bg-surface-950' : 'bg-surface-900',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-data-sm text-text-primary">{field.label}</span>
                    <span className="font-mono text-data-sm text-text-muted">{field.unit}</span>
                  </div>
                </td>
                {SCENARIOS.map(s => (
                  <td key={s.key} className="px-3 py-3 w-32">
                    <ScenarioInput
                      value={values[s.key][field.key]}
                      step={field.step}
                      onChange={v => update(s.key, field.key, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-800 border-t border-border-subtle">
              <td className="px-4 py-2" />
              {SCENARIOS.map(s => (
                <td key={s.key} className="px-3 py-2 text-center">
                  <button
                    onClick={() => reset(s.key)}
                    className="inline-flex items-center gap-1 font-mono text-data-sm text-text-muted hover:text-accent transition-colors duration-150"
                  >
                    <RotateCcw size={10} />
                    Reset
                  </button>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Field hints */}
      <div className="mt-4 space-y-1">
        {fields.map(f => (
          <p key={f.key} className="font-mono text-data-sm text-text-muted">
            <span className="text-text-label">{f.label}:</span>{' '}{f.hint}
          </p>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-subtle">
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
          Run Analysis
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Hedge fund stress test grid ───────────────────────────────────────────────

function StressTestGrid({ initialConfig, onConfirm, onBack }) {
  const [shocks, setShocks] = useState(() =>
    initialConfig?.type === 'stress'
      ? { ...initialConfig.shocks }
      : Object.fromEntries(STRESS_CATEGORIES.map(c => [c.key, c.default]))
  )

  function update(key, value) {
    setShocks(prev => ({ ...prev, [key]: value }))
  }

  function handleConfirm() {
    onConfirm({ type: 'stress', shocks })
  }

  return (
    <div className="w-full max-w-confirm mx-auto">
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">Hedge Fund</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary leading-tight">
          Configure stress test
        </h1>
        <p className="font-body text-sm text-text-secondary mt-2">
          Set the shock magnitude per risk factor. The model maps each shock to the
          relevant portfolio exposures from your uploaded document.
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border-subtle">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-800 border-b border-border-subtle">
              <th className="px-4 py-3 font-mono text-data-sm text-text-label uppercase tracking-wider">Risk Factor</th>
              <th className="px-4 py-3 font-mono text-data-sm text-text-label uppercase tracking-wider">Applies to</th>
              <th className="px-4 py-3 font-mono text-data-sm text-text-label uppercase tracking-wider w-36 text-right">Shock</th>
            </tr>
          </thead>
          <tbody>
            {STRESS_CATEGORIES.map((cat, ci) => (
              <tr
                key={cat.key}
                className={[
                  'border-b border-border-subtle last:border-0',
                  ci % 2 === 0 ? 'bg-surface-950' : 'bg-surface-900',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm text-text-primary">{cat.label}</span>
                    <span className="font-mono text-data-sm text-text-muted">{cat.desc}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-body text-sm text-text-secondary">{cat.detail}</td>
                <td className="px-4 py-3 w-36">
                  <div className="flex items-center gap-1.5 justify-end">
                    <ScenarioInput
                      value={shocks[cat.key]}
                      step={cat.unit === 'bps' ? 10 : 1}
                      onChange={v => update(cat.key, v)}
                    />
                    <span className="font-mono text-data-sm text-text-muted w-8 flex-shrink-0">{cat.unit}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-subtle">
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
          Run Stress Test
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

export function ScenarioConfig({ fundType, initialConfig, onConfirm, onBack }) {
  if (fundType === 'hedge-fund') {
    return <StressTestGrid initialConfig={initialConfig} onConfirm={onConfirm} onBack={onBack} />
  }
  return <MacroScenarioConfig fundType={fundType} initialConfig={initialConfig} onConfirm={onConfirm} onBack={onBack} />
}
