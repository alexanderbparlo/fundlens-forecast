# FundLens Forecast — Design System

## Theme
Adaptive — light and dark, user-toggled, persisted to localStorage.

Light is the primary presentation mode (boardroom, LP meetings, daytime review).
Dark is the working mode (monitor-heavy setups, late-night analysis, focused work sessions).
Both are first-class — not a toggle between primary and afterthought.

Theme class applied to `<html>`: `class="light"` or `class="dark"`. All tokens are CSS custom properties on `:root`.

---

## Color

### Strategy: Committed
The teal accent carries 20–40% of visual weight on key interactive surfaces (CTAs, active states, chart fills, progress indicators). Neutrals are tinted cool toward the brand hue throughout — never pure black or white.

### Dark Theme Tokens
```css
:root.dark {
  --surface-950: oklch(12% 0.015 190);   /* page background */
  --surface-900: oklch(16% 0.018 190);   /* panel / sidebar background */
  --surface-800: oklch(20% 0.020 190);   /* card background */
  --surface-700: oklch(26% 0.018 190);   /* hover / elevated card */

  --accent:         oklch(72% 0.14 185); /* #00c8b4 teal — primary */
  --accent-dim:     oklch(62% 0.12 185); /* #00a898 — hover / pressed */
  --accent-subtle:  oklch(72% 0.14 185 / 0.12); /* teal tint — bg fills */
  --accent-border:  oklch(72% 0.14 185 / 0.30); /* teal — border accents */

  --data-positive:  oklch(75% 0.17 145); /* #22d37a green */
  --data-negative:  oklch(60% 0.20 25);  /* #f05252 red */
  --data-flag:      oklch(72% 0.16 70);  /* #f5a623 amber */
  --data-neutral:   oklch(65% 0.08 220); /* blue-grey — neutral data */

  --text-primary:   oklch(92% 0.008 200); /* #e8edf5 */
  --text-secondary: oklch(60% 0.015 220); /* #8892a4 */
  --text-muted:     oklch(42% 0.012 220); /* #4a5568 */
  --text-label:     oklch(52% 0.014 220); /* #6b7785 */

  --border:         oklch(26% 0.018 190 / 0.7);
  --border-subtle:  oklch(26% 0.018 190 / 0.35);
}
```

### Light Theme Tokens
```css
:root.light {
  --surface-950: oklch(96% 0.006 190);   /* page background — cool off-white */
  --surface-900: oklch(99% 0.004 190);   /* panel background — near-white */
  --surface-800: oklch(100% 0.003 190);  /* card background */
  --surface-700: oklch(93% 0.008 190);   /* hover / active */

  --accent:         oklch(58% 0.14 185); /* teal deepened for light contrast */
  --accent-dim:     oklch(48% 0.12 185); /* hover on light */
  --accent-subtle:  oklch(58% 0.14 185 / 0.10);
  --accent-border:  oklch(58% 0.14 185 / 0.25);

  --data-positive:  oklch(52% 0.17 145); /* deepened for light mode contrast */
  --data-negative:  oklch(48% 0.20 25);
  --data-flag:      oklch(52% 0.16 70);
  --data-neutral:   oklch(48% 0.08 220);

  --text-primary:   oklch(14% 0.015 200); /* near-black, tinted cool */
  --text-secondary: oklch(40% 0.015 220);
  --text-muted:     oklch(58% 0.012 220);
  --text-label:     oklch(50% 0.014 220);

  --border:         oklch(86% 0.008 200);
  --border-subtle:  oklch(92% 0.006 200);
}
```

### Color Rules
- Never use `#000` or `#fff` — always tint toward brand hue (chroma 0.003–0.01 minimum)
- Use `oklch()` throughout — reduces chroma at extremes automatically
- Data colors (positive/negative/flag/neutral) are visually consistent across themes but lightness-adjusted for contrast
- Teal accent lightness shifts per theme to maintain WCAG AA contrast on all surfaces

---

## Typography

### Fonts
```css
--font-display: 'Syne', sans-serif;     /* headings, labels, step indicators, fund names */
--font-body:    'DM Sans', sans-serif;  /* body text, UI copy, form labels, narrative */
--font-mono:    'DM Mono', monospace;   /* ALL numeric values, metric outputs, file names */
```

**DM Mono on all numeric values is non-negotiable.** Alignment matters in a financial tool.

### Scale
```css
--text-xs:      0.75rem;    /* 12px — labels, disclaimers */
--text-sm:      0.875rem;   /* 14px — secondary copy, table cells */
--text-base:    1rem;       /* 16px — body default */
--text-lg:      1.125rem;   /* 18px — emphasized body */
--text-xl:      1.25rem;    /* 20px — card titles */
--text-2xl:     1.5rem;     /* 24px — section headers */
--text-3xl:     1.875rem;   /* 30px — page titles */
--text-4xl:     2.25rem;    /* 36px — step display text */
--text-display: 3rem;       /* 48px — intake flow hero */
```

### Hierarchy Rules
- Minimum 1.25× ratio between adjacent steps in a visual hierarchy
- Weight + size together: never size alone, rarely weight alone
- Syne 600–700 for all section headers, step labels, fund type names
- DM Sans 400 body, 500 for emphasis, 600 for strong labels
- DM Mono 400 for supporting data, 500 for primary metric values
- Body line length: 65–75ch cap. Metric values uncapped.

---

## Spacing & Layout

### Base Unit: 8px
Spacing scale: `4 8 12 16 24 32 48 64 96 128`

Spacing should vary deliberately to create rhythm. Same padding everywhere is monotony — not a design system.

### Container
- Max-width: 1280px, centered
- Horizontal padding: 48px desktop, 24px tablet, 16px mobile

### Grid
12-column. Key layouts:
- Intake flow: centered single column, max-width 640px (focused, no distraction)
- Confirmation form: centered, max-width 800px
- Results: 8-col main + 4-col summary sidebar on desktop, stacked on tablet

---

## Elevation

### Dark Theme (surface steps, no shadows)
- Level 0 — page: `--surface-950`
- Level 1 — panels, sidebars: `--surface-900`
- Level 2 — cards, inputs, dropzones: `--surface-800`
- Level 3 — hover states, popovers: `--surface-700`

### Light Theme (shadows)
```css
--shadow-sm: 0 1px 3px oklch(14% 0.015 200 / 0.06), 0 1px 2px oklch(14% 0.015 200 / 0.04);
--shadow-md: 0 4px 12px oklch(14% 0.015 200 / 0.08), 0 2px 4px oklch(14% 0.015 200 / 0.04);
--shadow-lg: 0 8px 24px oklch(14% 0.015 200 / 0.10), 0 4px 8px oklch(14% 0.015 200 / 0.05);
```

---

## Motion

### Philosophy
Motion communicates intelligence and state — never decoration. The results screen should feel like data becoming visible, not animations playing. Influenced by Linear Mobile's purposeful transitions and second-brain layout interactivity: layers reveal, data flows, state changes feel considered.

### Easing
All transitions: ease-out-quint — `cubic-bezier(0.22, 1, 0.36, 1)`
No bounce, no elastic, no spring physics.

### Durations
```css
--duration-micro:    120ms;  /* hover, focus ring, checkbox */
--duration-standard: 240ms;  /* panel open, tab switch, tooltip */
--duration-elaborate: 400ms; /* page transition, results reveal */
```

### Specific Motion Patterns

**Step progression (intake flow):**
Current step slides left + fades out (160ms). Next step slides in from right + fades in (240ms). Progress indicator fills with teal.

**Results reveal:**
Metrics table rows stagger in top-to-bottom, 30ms between rows, fade + translateY(6px) → 0.
Charts draw left-to-right on mount (Recharts `animationDuration: 800`, ease-out).
AI narrative fades in 350ms after quantitative outputs settle.

**Theme toggle:**
Cross-fade between themes, 200ms. No flash.

**Loading states:**
Skeleton shimmer using accent-subtle cycling. Never a spinner alone — skeleton outlines preserve layout context.

**Data updates:**
Changing a scenario assumption: affected metric values fade out (120ms) then fade in with new value (120ms). No jarring repaints.

---

## Component Patterns

### Progress Indicator
Four-step horizontal stepper pinned below the top nav throughout the intake flow.
- Completed steps: teal filled circle + checkmark + Syne 500 label in text-secondary
- Active step: teal filled circle + Syne 600 label in text-primary
- Upcoming steps: surface-700 circle + Syne 400 label in text-muted
- Connector lines: surface-700 default, fill with teal on completion (animated left-to-right)

### Field Source Indicator
Small circular dot (6px), not a stripe border, left of each confirmation form field:
- Teal dot — extracted from upload (tooltip shows source on hover)
- Amber dot — not found, required (+ "Required" label in data-flag color)
- No dot — manually entered by user (pencil icon in text-muted)

### Confirmation Form
Pre-populated editable inputs. Full-width rows. Label above input (DM Sans 500 text-label). Source indicator left of label row. Input: surface-800 bg, border, rounded-lg, focus ring in accent. Read-only display mode for confirmed state (value + source, no input chrome).

### Scenario Grid (PE / VC / Real Assets)
Three-column layout: Bear | Base | Bull
- Base column: surface-800 bg, accent-border top (2px, full width — not a side stripe), slight elevation
- Bear/Bull: surface-900 bg, border
- Column header: Syne 600, text-primary. Sub-label: DM Sans 400, text-muted
- All inputs editable. Preset default shown as placeholder, not locked value.
- Delta indicators: small arrow + DM Mono value in data-positive or data-negative

### Stress Test Grid (Hedge Fund)
Five-row table. Columns: Risk Category | Description | Input (bps or %) | Est. Impact
- Category label: Syne 500 text-primary
- Description: DM Sans 400 text-secondary, text-sm
- Input: compact, DM Mono, right-aligned
- Impact column: DM Mono, data-positive/negative coloring, populates after analyze call

### Metrics Table
Fund-type-specific columns. DM Mono for all values.
Scenario sub-columns (Bear | Base | Bull) with directional delta indicators.
Row hover: surface-700 bg transition, 120ms.
Section dividers between metric groups (e.g., Return Metrics / Capital Metrics).

### Charts (Recharts)
- **NAV Trajectory:** AreaChart. Three areas (Bear/Base/Bull): data-negative/accent/data-positive. Filled areas at 15% opacity, strokes at full opacity. Animate on mount.
- **Distribution Timeline:** BarChart. Quarterly bars, accent fill. Stacked if multiple investment exits in same quarter.
- Axes: DM Mono tick labels, text-muted. Grid lines: border-subtle, horizontal only.
- Tooltips: surface-800 bg, border, text-primary, DM Mono values, DM Sans labels. No default Recharts tooltip styling.
- Legend: Syne 500 text-sm, inline dots matching series colors.

### V1 Scope Disclaimer Banner
Persistent, non-dismissible on results screen. Anchored below the metrics table header.
- surface-800 bg, border, rounded-lg
- Amber circular dot (6px) left of copy — not a stripe border
- DM Sans 400 text-sm text-secondary
- Copy: "This analysis reflects investment-level NAV based on market value of investments. It excludes other fund assets, liabilities, and accruals. Full NAV projection is planned for v2."
- Never in fine print. Visible without scrolling on results mount.

### Theme Toggle
Icon button (sun / moon), top-right nav. No label. 200ms cross-fade on click.

---

## Absolute Bans
- `border-left` colored accents on cards, list items, callouts — use circular dots, full borders, or background tints
- Gradient text (`background-clip: text`)
- Glassmorphism as a default treatment
- Hero-metric template (large number + small label + gradient accent)
- Identical card grids
- Modals as the first solution — exhaust inline and progressive alternatives first
- Pure `#000` or `#fff` anywhere in the UI
- Decorative icons on every heading or list item
- Placeholder data presented as if real
