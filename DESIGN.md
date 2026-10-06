# OceanX Design System

---

## OceanX Overrides
*These rules supersede any conflicting rule below. All agents read this section first.*

### 1. Typography — Figtree (stand-in for Zeist), no Big Shoulders
**Big Shoulders Display is removed.** All text (display, headings, body, UI, labels, form fields) uses one font stack:

```
'Figtree', 'Inter', system-ui, sans-serif
```

Both `--font-display` and `--font-body` tokens resolve to this stack. **Figtree** is a geometric variable font (300–900 + italic) loaded from Google Fonts; it is the active stand-in for **Zeist VF Web** (OceanX's brand font, pending licence). Inter is the webfont fallback. Use weight and size to establish hierarchy, not a second typeface.

**Typography weight tokens:**
| Token | Value | Usage |
|---|---|---|
| `--weight-h1` | `400` | h1 elements — regular weight |
| `--weight-h2` | `300` | h2 elements — light |
| `--weight-h3` | `300` | h3–h6 elements — light |
| `--weight-body` | `350` | p elements — between light and regular (variable font only) |
| `--weight-label` | `570` | labels, badges, meta lines — semi-medium |

**Colour tokens:**
| Token | Value | Usage |
|---|---|---|
| `--color-heading` | `#000000` | h1/h2/h3 — pure black |
| `--color-text-secondary` | `#5B6770` | body/description paragraphs — ~5.6:1 on white, WCAG AA |

Big Shoulders may return in a future iteration as a display-only accent. Do not re-add it without explicit approval.

**Implementation:** Figtree + Inter are imported together as a single Google Fonts `@import` in `src/index.css`. The `@font-face` block for Zeist VF Web is kept commented out in that file; uncomment it (and prepend `'Zeist VF Web',` to both font tokens) once files land in `src/assets/fonts/`. All form controls and buttons use `font-family: inherit` to track the body font automatically.

### 2. Theme -- light, white background
The theme is light. Dark ocean navy is removed.

| Token | Value |
|---|---|
| `--color-bg` | `#FFFFFF` |
| `--color-surface` | `#F5F7FA` |
| `--color-surface-raised` | `#EDF0F4` |
| `--color-border` | `#D1D9E0` |
| `--color-border-subtle` | `#E5E9EE` |
| `--color-text-primary` | `#0F1E28` |
| `--color-text-secondary` | `#5B6770` | body/description paragraphs — ~5.6:1 on white, WCAG AA |
| `--color-text-muted` | `#5C6E7A` | labels, meta, placeholders — ~5.3:1 on white, WCAG AA |

### 3. Heading order — headline first
**Headline first, supporting text below. Never place a lede or description above a heading.**

DOM order must match visual order. The heading element (`h1`/`h2`/`h3`) always precedes any descriptive `<p>`. There is no CSS reordering (no `flex-direction: column-reverse`, `order`, or `grid-template-areas`) that swaps visual position. Exception: a small type/category meta label (e.g. "KEY FINDING", "Schools") may appear above the heading as it acts as a label, not a description.

All agents and developers: check this rule before committing. The Short Hero pattern in §Layout patterns is heading-first — display line, then mission sentence.

### 4. Accent and interactive colour rules
`--color-accent: #90E0EF` (OceanX cyan-blue) **fails WCAG AA on white** (~2.1:1 contrast).

**Accent rules:**
- Use `--color-accent` ONLY as a **fill** (button background, badge background, active state highlight).
- Always pair with `--color-text-on-accent: #0F1E28` for text on accent fills.
- Never use `--color-accent` as text colour, icon colour, focus outline, or thin border on a white or light surface.

**For text, links, key numbers, focus outlines, and interactive hover borders** use:
`--color-link: #0D7A8E` -- dark ocean teal, ~5.0:1 contrast on white (passes WCAG AA).

---

## Foundations

### Colour palette

```
/* Superseded -- see OceanX Overrides §2 for current light-theme values */
--color-bg:            #07111E   /* deep ocean navy -- page background */
--color-surface:       #0D1E30   /* cards, panels */
--color-surface-raised: #122740  /* hover, lifted states */
--color-border:        #1E3A52   /* 1px borders */
--color-border-subtle: #152D44   /* dividers */

--color-accent:        #90E0EF   /* OceanX cyan-blue */
--color-accent-dim:    #5BB8CC   /* pressed / dimmed accent */

--color-text-primary:  #EFF6FB   /* headings, primary labels */
--color-text-secondary: #8BAFC5  /* supporting text, meta */
--color-text-muted:    #4F7490   /* placeholders, disabled */

--color-success:       #52C97E
--color-warning:       #E9AA4F
--color-danger:        #E06262

--color-reuse:         #52C97E
--color-adapt:         #E9AA4F
--color-drop:          #E06262
```

WCAG AA requirement: all body text on `--color-bg` or `--color-surface` must pass 4.5:1. `--color-text-primary` on `--color-bg` passes. `--color-accent` must not be used as body text on dark surfaces.

### Typography

Scale (rem):
| Token | Size | Weight | Line height |
|---|---|---|---|
| `--text-display` | 3.5rem | 700 | 1.05 |
| `--text-h1` | 2.25rem | 700 | 1.1 |
| `--text-h2` | 1.5rem | 600 | 1.2 |
| `--text-h3` | 1.125rem | 600 | 1.3 |
| `--text-body` | 1rem | 400 | 1.6 |
| `--text-small` | 0.875rem | 400 | 1.5 |
| `--text-micro` | 0.75rem | 500 | 1.4 |

All text uses the single font stack defined in OceanX Overrides §1. Weight and size establish hierarchy; no second typeface.
Letter-spacing for display: -0.02em. Headings: -0.01em. Body: 0.

### Spacing

8px base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96.

```
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px
--space-6:  24px
--space-8:  32px
--space-12: 48px
--space-16: 64px
--space-20: 80px
--space-24: 96px
```

### Borders and radius

All borders are `1px solid var(--color-border)`. No box shadows on surfaces. No glow effects.
Radius: `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`.
Interactive elements: `--radius-md`. Large containers: `--radius-lg`. Tags/chips: `--radius-sm`.

### Elevation

No box shadows. Differentiate layers through background colour only (`--color-surface` vs `--color-surface-raised`). Reserve `--color-surface-raised` for hover states or modals.

### Grid and layout

- Page max-width: 1200px, centered, `padding-inline: var(--space-6)`.
- Content max-width (single-column text): 720px.
- Card grids: CSS Grid, `repeat(auto-fill, minmax(280px, 1fr))`, gap `var(--space-6)`.
- Responsive breakpoints: 768px (tablet), 480px (mobile).

---

## Components

### Buttons

Two variants:
- **Primary**: `background: var(--color-accent)`, text `#07111E`, border none, `border-radius: var(--radius-md)`, `padding: 10px 20px`, font-weight 600, body font.
- **Ghost**: `background: transparent`, `border: 1px solid var(--color-border)`, text `var(--color-text-primary)`, same padding and radius.

No shadows. Hover for primary: `filter: brightness(0.95)`. Hover for ghost: `background: var(--color-surface-raised)`. Focus: `outline: 2px solid var(--color-link)`, `outline-offset: 2px`.
No rounded pill shapes. No icon-only buttons without an accessible label.

### Cards

Plain surface. `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `padding: var(--space-6)`.
No shadows. Hover state: `border-color: var(--color-link)`, `background: var(--color-surface-raised)`.
Clickable cards: cursor pointer, transition border-color 150ms ease.

### Form inputs

`background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, `padding: 10px 14px`, full width.
Focus: `border-color: var(--color-link)`, `outline: none`.
Label: above input, `--text-small`, `--color-text-secondary`, `margin-bottom: var(--space-1)`.

### Tags / Chips

Inline, `background: var(--color-surface-raised)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `padding: 2px 8px`, `--text-micro`, `--color-text-secondary`.

All metadata tags (Audience, Grade, Curriculum, In versions) use the same default grey style. The `accent` variant (teal outline, `--color-link`) is reserved for recommendation-status tags (Reuse, Adapt, Drop) and other semantically meaningful status indicators — not for field values like curriculum alignment.

### Navigation

Top bar. `background: var(--color-bg)`, `border-bottom: 1px solid var(--color-border)`. Height: 56px.

Left: OceanX Education logo (`src/assets/OXE_logo.png`, 28px tall on desktop / 24px mobile) followed by a 1px border divider and the product name "Insights" in `--color-link`. The whole left group is a link to `/` with `aria-label="OceanX Education, home"`. Right: nav links, `--text-small`, `--color-text-secondary`. Active link: `--color-link`, `font-weight: 570`.

---

## Layout patterns

### Short hero
1. Display heading (`--text-display`, h1) — e.g. "Capture. Learn. Decide."
2. Mission sentence (`--text-body`, `<p>`) — below the heading, max-width 560px.

No eyebrow chips, no background images, no gradients. Left-aligned. Top padding `--space-20`. Heading always first in DOM order.

### Card links
Title (`--text-h3`) + one descriptive line (`--text-small`, `--color-text-secondary`). Whole card clickable. `min-height: 100px`. No icons tiled alongside the label.

### Featured item
Full-width surface at top. Title, one supporting meta line, one primary action button. Below it: the grid.

### Dated update cards
Meta line: `category | date` in `--text-micro`, `--color-text-muted`. Then headline in `--text-h3`. Then supporting body line. Then a recommendation badge (Reuse / Adapt / Drop).

### Filterable library
Horizontal filter row (selects or button groups), result count in `--text-small` right-aligned or below. Grid below. Filters do not collapse on mobile -- they scroll horizontally.

### Collections (versions)
A section per version. Version title as `--text-h2`. A horizontal or grid row of component cards, each with title and type. A "View Learner Content" link.

---

## Accessibility

- Minimum contrast: 4.5:1 for all text against its background.
- All interactive elements keyboard accessible. Visible focus styles (2px `--color-link` outline).
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<h1>`...`<h6>` in order.
- Every form input has a visible `<label>`. No placeholder-only labels.
- No colour-only meaning (pair colour with text or icon).

---

## Anti-patterns (never do these)

- No gradient text (`background-clip: text`).
- No nested cards (a card inside a card).
- No icon tile stacks (icon + label + description block repeated).
- No generic CTAs ("Learn More", "Get Started", "Explore").
- No decorative emojis in UI copy.
- No em dashes in any copy. Use colons or restructure.
- No `box-shadow` on surfaces.
- No `--color-accent` as text colour on any surface. Use `--color-link` for interactive text, `--color-text-on-accent` for text on accent fills.
