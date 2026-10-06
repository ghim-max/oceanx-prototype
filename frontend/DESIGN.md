# Design system notes

## Pill buttons

Default pill: transparent background, 1px solid `var(--color-heading)` border, `var(--color-heading)` text. Hover fills with heading colour; text flips to `var(--color-bg)`.

**Exception — approval actions:** The "Looks good" pill uses an essence-filled style:
- Background `#90E0EF`, border `1px solid #5ecfe6`, text and icon `#000`
- Hover: `#72d5e9` background, `#46c5de` border
- Focus ring: `2px solid #46c5de`

Rationale: approval is a terminal, positive action that benefits from stronger visual distinction than a plain transparent pill, without using a colour that reads as link or error state.

## Colour rules

- `#90E0EF` (essence/accent) is used as a **fill** only — never as text colour (insufficient contrast on white).
- All link and button text uses `var(--color-heading)` or `var(--color-text-secondary)`.

## Status badges

Fixed/Adapted tags use `border: 1px solid currentColor` (`.statusBadge`) with colour-only variants:
- `.statusFixed` — `var(--color-text-secondary)` (neutral)
- `.statusAdapted` — `var(--color-warning)` (warm amber)

Tags always carry text (never colour alone) to meet accessibility requirements.
