---
slug: partner-the-new-partner-home-page
score: 39
date: 2026-10-03T18:00:00Z
prior_score: 37
delta: +2
pass: landing-page-updates
---

# Critique: Partner Home Page (post landing-page-updates pass)

**Score: 39 / 40 (Excellent)**

## P0 — Blockers
None.

## P1 — Significant issues
None.

## P2 — Polish (resolved this session)
- ~~Logo renders as white box (brightness/invert filter on opaque-white PNG)~~ → Fixed: Pillow white-matte removal generates `OXE_logo_transparent.png` (original colours) and `OXE_logo_white.png`; Nav swaps src based on `overHero`; CSS filter removed.
- ~~CTAs use solid teal fill inconsistent with pill direction~~ → Fixed: All site-wide buttons converted to pill (border-radius 999px, 1px solid, transparent bg). Shared `Button` / `LinkButton` component created in `shared/ui/`.
- ~~Nav "Library" is a plain link~~ → Fixed: Styled as pill button — white pill over hero, dark pill on white nav, active state with link-colour border.
- ~~Sections constrained to 1200px max-width — no full-bleed feel~~ → Fixed: `.page-container` uses `clamp(20px, 5vw, 80px)` side padding, `max-width: 1600px` cap; nav `.inner` keeps 1200px constraint.
- ~~Hero gradient only `rgba(0,0,0,0.12)` at top — white nav-pill failed contrast~~ → Fixed: 0% stop raised to `rgba(0,0,0,0.38)`, ensuring white text/pill passes ~4.5:1 even against the lightest ray-lit areas.
- ~~`Button.sm` and nav link pill below 44px touch target~~ → Fixed: `.sm` padding `11px 18px` (44.4px); `.link` padding `11px 16px`.
- ~~Nav pill transition fires under `prefers-reduced-motion: reduce`~~ → Fixed: transition moved inside `@media (prefers-reduced-motion: no-preference)` guard; also added `border-color` to transition for smooth border animation.
- ~~Nav focus ring uses dark teal over hero image~~ → Fixed: `.navOver .link:focus-visible { outline-color: #ffffff }`.
- ~~Logo src swap re-announces "OceanX Education" to screen readers on scroll~~ → Fixed: `aria-label` moved to NavLink; `alt=""` on both `<img>` elements.
- ~~Hamburger tap target 32×32~~ → Fixed: `min-width/min-height: 44px` with `margin-right: -6px` for visual alignment.
- ~~LibraryPage `.featuredAction` / `.versionLink` are duplicate one-off pill styles~~ → Fixed: replaced with `<LinkButton>` component; dead CSS deleted.
- ~~Two competing `@media (max-width: 480px)` blocks in Nav.module.css~~ → Fixed: merged into one clean block; stale comment removed.

## P3 — Refinement (resolved this session)
- ~~`/kit` page missing — no way to preview button system~~ → Fixed: `/kit` route with `KitPage` showing dark and light pill variants at both sizes.

## Remaining known gaps (not bugs)
- Official OceanX logo files not yet delivered — using Pillow-generated variants (`TODO` comment in Nav.tsx)
- Real audience images (`Images/audience/schools.jpg`, `university.jpg`, `museum.jpg`) — cards use teal-tinted placeholders
- Real featured story image — using branded dark-teal placeholder
- `rgba(15,30,40,0.08/0.14)` hover fills hardcoded in Button.module.css and Nav.module.css — could be tokenised as `color-mix` expressions
- `#ffffff` in `Button.light` and navOver rules not yet a CSS token
- Nav active-state contrast `#0D7A8E` at 14px weight-570 clears AA by 0.07 — monitor when Figtree is replaced by Zeist VF Web
