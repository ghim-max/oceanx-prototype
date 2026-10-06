---
target: /partner (the new partner home page)
total_score: 30
p0_count: 0
p1_count: 0
timestamp: 2026-10-03T09-44-46Z
slug: partner-the-new-partner-home-page
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nav scroll-state handled well; no loading states needed on static page |
| 2 | Match System / Real World | 4 | Plain warm language throughout; metaphors natural |
| 3 | User Control and Freedom | 3 | Logo always returns home; nav persistent; no dead ends |
| 4 | Consistency and Standards | 3 | CTA buttons and token usage consistent |
| 5 | Error Prevention | 3 | Static page; query-param library links are real URLs even if filter is unimplemented |
| 6 | Recognition Rather Than Recall | 4 | All choices visible; audience selection self-evident |
| 7 | Flexibility and Efficiency | 2 | Three audience entry points give fast paths; no other accelerators |
| 8 | Aesthetic and Minimalist Design | 3 | Five purposeful sections; audience card placeholders add wireframe noise |
| 9 | Error Recovery | 3 | No form elements; navigation is clear |
| 10 | Help and Documentation | 2 | No help system on a marketing page |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict

LLM: No immediate AI slop. Avoids all bans: no eyebrow labels on every section (only one deliberate "Featured story" kicker), no repeated identical card grids, no hero-metric template, no gradient text. Numbered journey steps are genuine sequential flow. Biggest risk: placeholder-driven audience section looks like wireframe.

Deterministic scan: Clean. detect.mjs returned 0 findings across all 4 source files.

## Priority Issues

[P2] Featured section reuses the hero image identically — same photo as 100svh hero appears again in featured story. Fix: use a different image or credible placeholder.

[P2] Audience card placeholder voids dominate mobile — at 375-768px, three identical grey rectangles ~211px tall each create ~633px of undifferentiated grey. Fix: real images or styled placeholder with teal tint + SVG icon.

[P3] Zero scroll motion on a brand surface — brand register permits ambitious entrance animation. Fix: IntersectionObserver is-visible class + CSS fade-up transition, reduced-motion safe.

[P3] 768px sections keep full 80px padding — only 480px breakpoint reduces padding. Fix: add 768px padding-block: var(--space-16) override.

## Persona Red Flags

Jordan: Audience cards look like disabled checkboxes on mobile — no visible link affordance with grey placeholder. 

Casey: Page is ~4500-5000px tall on 375px; anything past featured section may never be seen on first visit. ol#journeyStrip missing aria-labelledby.

Sam: quickFacts spans run together in accessibility tree without pauses. ol.journeyStrip lacks aria-labelledby="journey-heading".

## Minor Observations

- seagrassGrid align-items: start leaves visible empty space below video at 1024px. align-items: center would vertically centre it.
- bodyText max-width: 65ch never triggers inside the 2-col grid at 1024px (column width constrains first).
- text-wrap: pretty on .bodyText would reduce orphans in paragraphs.

## Questions

- Should there be a credibility signal (expedition footage, number of resources, institutional endorsement) above the fold or in the featured section?
- Is the journey strip intentionally quiet, or should it carry more visual weight?
- If audience images never arrive, would a colour-per-audience strategy make cards feel intentional?
