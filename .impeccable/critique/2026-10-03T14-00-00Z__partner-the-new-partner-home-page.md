---
slug: partner-the-new-partner-home-page
score: 37
date: 2026-10-03T14:00:00Z
prior_score: 30
delta: +7
pass: polish
---

# Critique: Partner Home Page (post-polish)

**Score: 37 / 40 (Excellent)**

## P0 — Blockers
None.

## P1 — Significant issues
None.

## P2 — Polish (resolved this session)
- ~~Featured section placeholder contrast: `rgba(255,255,255,0.85)` on `#0D7A8E` = ~4.4:1 (sub-AA)~~ → Fixed: background darkened to `color-mix(in srgb, var(--color-link) 80%, black)` → ~6.5:1
- ~~CTA buttons below 44px touch target (12px padding = 42px height)~~ → Fixed: `14px 24px` padding = 46px
- ~~No active state on CTA buttons~~ → Fixed: `:active { filter: brightness(0.88) }`
- ~~Focus-visible border-radius mismatch (global 4px vs button 8px)~~ → Fixed: per-button `:focus-visible` override to `var(--radius-md)`
- ~~ImageCard focus ring radius mismatch~~ → Fixed: `.card:focus-visible { border-radius: var(--radius-image) }`
- ~~Scroll reveal gates content on JS (reveal-section added synchronously)~~ → Fixed: observer starts first, `reveal-section` added via `requestAnimationFrame` after in-viewport sections get `is-visible`
- ~~ImageCard no title hover signal~~ → Fixed: `.card:hover .title { color: var(--color-link) }` with reduced-motion guard

## P3 — Refinement (resolved this session)
- ~~768px section padding stays at 80px (only 480px breakpoint reduces it)~~ → Fixed: 768px breakpoint adds step to 64px for main sections, 48px for journey strip

## Remaining known gaps (not bugs)
- White logo file `Images/Logo/OXE_logo_white.png` missing — using `filter: brightness(0) invert(1)` as temporary replacement
- Real audience images (`Images/audience/schools.jpg`, `university.jpg`, `museum.jpg`) — cards use teal-tinted placeholders
- Real featured story image — using branded dark-teal placeholder
