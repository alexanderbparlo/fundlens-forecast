'use client'

const FUND_TYPES = [
  {
    id:          'pe',
    number:      '01',
    name:        'PE / Buyout',
    description: 'Control investments with projected IRR, TVPI, entry and exit multiples across macro scenarios.',
  },
  {
    id:          'vc',
    number:      '02',
    name:        'Venture Capital',
    description: 'Equity portfolios with dilution modeling, markup/markdown tracking, and power-law concentration analysis.',
  },
  {
    id:          'hedge-fund',
    number:      '03',
    name:        'Hedge Fund',
    description: 'Risk factor stress tests across market, rate, credit, FX, and liquidity exposures.',
  },
  {
    id:          'real-assets',
    number:      '04',
    name:        'Real Assets',
    description: 'Infrastructure and real estate with cap rate, NOI growth, LTV, and cash-on-cash projections.',
  },
]

export function FundTypeSelector({ onSelect }) {
  return (
    <div className="w-full max-w-intake mx-auto">
      <div className="mb-8">
        <p className="font-mono text-label uppercase tracking-widest text-accent mb-3">Fund Type</p>
        <h1 className="font-display text-3xl font-semibold text-text-primary leading-tight">
          What type of fund are you analyzing?
        </h1>
      </div>

      <div className="space-y-px">
        {FUND_TYPES.map((ft) => (
          <button
            key={ft.id}
            onClick={() => onSelect(ft.id)}
            className="group w-full text-left px-4 py-4 rounded-card flex items-start gap-5 transition-colors duration-200 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <span className="font-mono text-data-sm text-text-muted group-hover:text-accent transition-colors duration-200 pt-0.5 flex-shrink-0 w-5">
              {ft.number}
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-text-primary group-hover:text-text-primary leading-snug">
                {ft.name}
              </p>
              <p className="font-body text-sm text-text-secondary mt-0.5 leading-relaxed">
                {ft.description}
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 mt-0.5 ml-auto text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
