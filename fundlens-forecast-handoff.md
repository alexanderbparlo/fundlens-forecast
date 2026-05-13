# FundLens Forecast — Claude Code Handoff Prompt

Paste this prompt into Claude Code to initiate the FundLens Forecast v1 build.

---

## PROMPT

You are building FundLens Forecast — a new tool in the DeciFin/FundLens suite.
This is a GP-facing scenario analysis and return projection tool for alternative
investment fund managers.

Before writing any code, read the following skill files in full:
- ~/.claude/skills/fundlens-forecast.md (primary reference for this build)
- ~/.claude/skills/fundlens-suite.md (stack, deployment, and suite conventions)
- ~/.claude/skills/anthropic-api-patterns.md (all Anthropic API call patterns)
- ~/.claude/skills/fund-accounting-domain.md (shared domain knowledge)

Also read the frontend design skills you have available (Impeccable, Huashu Design,
UI/UX Pro Max) and apply them to produce a high-quality, visually polished UI that
elevates the FundLens suite's design standard. This project is the design benchmark
for the suite going forward.

---

## WHAT TO BUILD

FundLens Forecast v1 — a Next.js application with the following user flow:

### Step 1 — Fund Type Selection
Present a clean four-option selector: PE/Buyout, Venture Capital, Hedge Fund, Real Assets.
No progression without a selection.

### Step 2 — File Upload
Accept PDF, Excel (.xlsx), or CSV portfolio snapshot uploads.
PDF: use Anthropic document block ingestion (see anthropic-api-patterns.md section 3).
Excel/CSV: parse with papaparse (CSV) or xlsx library (Excel) to structured JSON,
then pass as a formatted text block.

### Step 3 — Extract & Confirm (AI-assisted normalization gate)
Call the /api/forecast/extract route. The model extracts all known fields from the
upload and returns structured JSON. Display extracted fields in an editable confirmation
form. Clearly mark each field as: extracted (with source), manually entered, or not found.
Do NOT run analysis until the user explicitly confirms. "Confirm & Run Analysis" is
the only trigger for Step 4.

Optional secondary upload at this step: capital account statement, LP commitment schedule,
or any document that shows committed capital, ITD called capital, or unfunded commitment.
If uploaded, re-run extraction to pre-populate those fields before confirmation.

### Step 4 — Scenario Configuration
PE/VC/Real Assets: display macro scenario assumption fields (bear/base/bull) with
preset defaults. All fields must be editable.
Hedge Fund: display risk factor stress test grid — one input per risk category
(market risk, interest rate risk, credit/default risk, FX risk, liquidity risk).

### Step 5 — Analysis
Call /api/forecast/analyze with confirmed portfolio data + scenario assumptions.
Run projections. For PE/VC/Real Assets: all three scenarios simultaneously.
For Hedge Fund: stress test impact per risk category plus aggregate.

### Step 6 — Results
Display: key metrics table, scenario comparison (side-by-side for macro; impact table
for hedge fund), NAV trajectory chart, distribution timeline, return metrics by fund type.
Then call /api/forecast/narrative for the AI-generated plain-English summary.
Display narrative below the quantitative outputs.
Show persistent v1 NAV scope disclaimer banner throughout the results screen.

---

## API ROUTE STRUCTURE

```
app/api/forecast/
  extract/route.js      ← ingest upload, extract fields, return structured JSON
  analyze/route.js      ← run scenario projections on confirmed structured data
  narrative/route.js    ← generate AI narrative from projection outputs
```

Keep these as three separate routes with the confirmation gate between extract
and analyze in the frontend. Do not combine into one endpoint.

---

## ANTHROPIC API CONVENTIONS (non-negotiable)
- Model: claude-opus-4-7-20251101
- Thinking: { type: 'adaptive' } + output_config: { effort: 'xhigh' } on every call
- Extract text: response.content.find(b => b.type === 'text')?.text
- Client: singleton from lib/anthropic/client.js — never instantiate inline
- System prompts: lib/prompts/forecastPrompts.js — never inline
- Error handling: lib/anthropic/errorHandler.js shared handler
- Prompt caching: cache the document block when the same upload passes through
  multiple routes in the same session
- ANTHROPIC_API_KEY: process.env only, never client-side
- No portfolio data persisted server-side — process in memory per request only

---

## METRIC SETS BY FUND TYPE

Implement calculation logic for all metrics listed in fundlens-forecast.md section 6.
Key notes:
- Sharpe, Sortino, beta, alpha require historical return series — if not present in
  upload, display as unavailable with a note on required data. Do not estimate.
- Hedge fund mode uses risk factor stress test only — do not apply macro scenario
  presets to hedge fund portfolios.
- Unfunded commitment: derive as committed minus called if not explicit in upload.
- Reference DesoFall for carry/waterfall — do not rebuild that logic here.

---

## V1 SCOPE BOUNDARIES

Do not build the following in v1 — display as "coming in v2" in the UI where relevant:
- Full NAV (other assets / liabilities / accruals)
- Trial balance ingestion
- LP-level capital account modeling
- Management fee / carry cash flows
- Hedge fund historical return calculation from raw trade data

---

## UI/UX REQUIREMENTS

Apply the imported frontend design skills (Impeccable, Huashu Design, UI/UX Pro Max)
to produce a premium, visually distinctive interface. This is the design benchmark for
the FundLens suite going forward — existing tools will be updated to match.

Requirements:
- Consistent with DeciFin/FundLens brand (professional, financial services, clean)
- Four-step progress indicator visible throughout the flow
- Editable confirmation form with clear field-source labeling
- Side-by-side scenario comparison layout for results
- Chart components for NAV trajectory and distribution timeline
- Persistent v1 scope disclaimer banner on results screen
- Responsive — must work on desktop and tablet
- User-friendly for non-technical GPs — no unnecessary jargon in UI copy

---

## FILE STRUCTURE

Follow fundlens-suite.md conventions. Key additions for this project:

```
app/
  forecast/
    page.jsx                  ← main forecast flow (fund type → upload → confirm → results)
  api/
    forecast/
      extract/route.js
      analyze/route.js
      narrative/route.js
lib/
  anthropic/
    client.js                 ← shared singleton (may already exist)
    errorHandler.js           ← shared handler (may already exist)
  prompts/
    forecastPrompts.js        ← all system prompts for forecast agents
  forecast/
    extractionUtils.js        ← field extraction and normalization helpers
    metricCalculations.js     ← return metric calculation functions
    scenarioEngine.js         ← scenario projection logic by fund type
```

---

## BUILD ORDER

Suggested sequence — confirm with me before starting each step:

1. Skill file review and project scaffold (Next.js, dependencies, file structure)
2. File upload handling — PDF document block + Excel/CSV parsing
3. /api/forecast/extract route + extraction system prompt
4. Confirmation form UI component
5. Scenario configuration UI (macro presets + hedge fund stress test grid)
6. /api/forecast/analyze route + projection logic by fund type
7. /api/forecast/narrative route + narrative system prompt
8. Results display — metrics table, charts, scenario comparison
9. AI narrative display + scope disclaimer
10. Polish, error states, loading states, responsive layout

Pause and confirm with me after steps 3, 6, and 9 before continuing.
