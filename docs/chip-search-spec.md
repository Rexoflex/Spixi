# c-chip + c-search-field — spec

*Source: Figma Components page `9275:74` (file `cQ8yMZF5R0LGM9O1q9502F`), pulled 2026-07-02: `chip-component` 9708:111127 (small 9510:78853 / large 9418:27947), `text-field/large` 9364:1385. Deviations from Figma are best-practice fixes → DECISIONS #50/#51 (🟡).*

## c-chip

Anatomy: `button.c-chip[data-size=large|small]` → optional leading icon · label · optional dismiss glyph.

| Aspect | large | small |
|---|---|---|
| Padding | 4 × 12 (`spacing-4/12`) | 4 × 8 |
| Label | body-sm | body-xs |
| Leading icon | 18 | 14 |
| Radius | `radius-16` (NOT full — demo placeholder had drift) | same |

States (all semantic tokens, from Figma):

| State | Surface | Border | Ink |
|---|---|---|---|
| default | `surface-neutral-01` | `outline-neutral-04` | `text-neutral-01` |
| hover (guarded #43) | `surface-neutral-02` | `outline-action-hover` | `text-action-hover` |
| pressed (`:active`) | `surface-action-tonal-default` | `outline-action-pressed` | `text-action-pressed` |
| focused | global `:focus-visible` ring (#23) | | |
| **selected** (`aria-pressed=true`) — NOT in Figma, #50 | `surface-action-default` | transparent | `text-neutral-on-action` |
| selected + hover | `surface-action-hover` | transparent | `text-neutral-on-action` |
| disabled — NOT in Figma | `surface-neutral-disabled` | `outline-neutral-disabled` | `text-neutral-on-disabled` |

Deviations (#50): selected/disabled added; icons opt-in (Figma defaults both on — filter chips get none); dismissible = explicit variant where the WHOLE chip triggers `onDismiss` (no nested button — invalid HTML; X is visual); extended 44px tap area via transparent pseudo (`--size-target-min`), visual unchanged.

API: `createChip({ label, size='large', selected=false, icon=null, dismissible=false, onClick, strings })` · free fn `setChipSelected(el, bool)` (#44). Toggle chips carry `aria-pressed`; dismissible chips instead get `aria-label` = label + strings.remove.

## c-search-field

No Figma search component — specialization of `text-field/large` (its own mockups show the search glyph). Anatomy: `div.c-search-field` → search icon 18 · `input[type=search]` body-md · clear button (`x` 18, visible only while text present; was `circle-x` pre icon-x export).

| State | Surface | Border |
|---|---|---|
| default | `surface-neutral-02` | **transparent 1px** (Figma: none — permanent border prevents hover/focus layout jump) |
| hover (guarded) | `surface-neutral-03` | `outline-action-hover` (Figma had `outline-info` — confirmed ERROR by Damir 2026-07-02; fix in Figma text-field/large too) |
| focus-within | `surface-neutral-01` | `outline-action-default` + 1px box-shadow (fakes Figma's 2px without shift; Figma used `text-action-default` as border — same correction) |
| disabled | `surface-neutral-disabled` | `outline-neutral-disabled` |

Focus treatment (sanctioned #51 deviation from the #23 ring): text fields show focus as the container's action border+shadow — the Figma text-field pattern — instead of the global `outline-focus` ring; the input's own outline is suppressed. The clear button keeps the normal ring.

Deviations (#51): min-height 44 (`size-target-min`; Figma ≈40) · clear button replaces text-field's trailing arrow (own hit area, `aria-label`) · Escape clears · no label/help row · native WebKit cancel glyph suppressed (custom clear is the affordance). body-md = 16px → no iOS focus zoom.

API: `createSearchField({ placeholder, value='', onInput, onSubmit, ariaLabel, strings })` · free fns `setSearchValue(el, v)`, `getSearchValue(el)`.

Behavior: `input` → toggle clear + `onInput(value)` · Enter → `onSubmit(value)` · Esc/clear-click → empty + `onInput('')`, focus stays in input.

## Open for Damir

① ~~solid vs tonal selected~~ — RESOLVED (Damir): TONAL fill + action ink, "not too strong"; selected-hover `tonal-hover`, selected-pressed `tonal-pressed`. ② ~~`outline-info` on text-field hover~~ — RESOLVED: error, corrected to `outline-action-hover` (+ focus → `outline-action-default`); mirror to Figma. ③ dismissible chip: whole-chip dismiss ok? ④ ~~`tabler-icon-x` missing~~ — RESOLVED: exported by Damir, registry 69 icons, dismiss glyph = `x` (16/14).
