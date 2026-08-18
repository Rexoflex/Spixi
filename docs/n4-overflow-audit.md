# N4 ④ — per-language button-overflow audit (2026-08-17, cloud session)

**Tool:** `scripts/i18n-overflow-audit.mjs` (committed; rerun after any
translation change: `node scripts/i18n-overflow-audit.mjs` — exit 1 on a break;
`--all` adds near misses). It is part of the string-change pipeline beside
i18n-lint and pseudo.

## Method

Buttons and chips are `white-space: nowrap` with NO ellipsis (button.css:31,
chip.css:18) — an over-long label spills out of the control. The topbar
ellipsizes (topbar.css:29-31), so titles only ever clip safely. jsdom gives no
layout, so the tool:

1. **Harvests** every `strings.KEY` that flows into a `createButton` /
   `createChip` / `createTopbar` / `createModal` actions label at its SOURCE
   call site (src/components + src/shells) — 102 keys across 10 control
   classes. Label-property-only matching; `createTopbar` actions labels are
   aria-only and excluded.
2. **Estimates** rendered width per locale value with a Roboto/system-ui
   advance table (CJK/kana/fullwidth = 1em, Cyrillic ≈ Latin, tracking
   −0.25px/char). Error band ±8% — a break needs ratio > 1.08.
3. **Budgets** (360px viewport): CSS-derived where the container is knowable,
   English-calibrated (max(static floor, en × class factor)) for hug contexts —
   the shipped English passed device F5s, so a context is never tighter than
   its English rendering.

| Class | Static | en factor | Basis |
|---|---|---|---|
| button-56 full | 280px | 1.6 | 360−2·16 screen −2·24 pad |
| button-44 full | 288px | 1.6 | 360−2·16 −2·20 |
| button-44+icon hug | 180px floor | 1.35 | card/sheet contexts |
| button-32(+icon) hug | 140px floor | 1.35 | bubble/card contexts |
| modal-action | 88px | 1.25 | (312−48−8)/2 −40 (overlay.css:91 equal pair) |
| chip | 90px floor | 1.3 | hug in 328px row |
| bottomnav | 80px | 1.25 | max-width 96 −2·8 (bottomnav.css:29) |
| topbar | 170px floor | 1.3 | report-only (safe ellipsis) |

## Result

First pass: **29 breaks across 11 locales** (worst: ru `sendContactRequest`
289px in a 180px context; ru `keepWaiting` 141px in an 88px modal pair). All 29
were fixed at the correct source — the draft json when drafted, the legacy
lang txt when legacy-seeded (5 legacy lines: ja `wallet-sent-view-explorer` +
`app-details-uninstall`, id `app-details-uninstall`, ru
`index-missing-tx-view-all` + `chat-modal-tip-custom`). Full before/after list:
the #379 DECISIONS row; every fix is also flagged for native review in
`docs/n4-review-notes.md`.

Second pass: **NO BREAKERS.** 72 near misses (92–108% of budget — inside the
estimator error band) and 7 safe topbar clips remain; they are watch-items for
device eyeballs, listed by `--all`. Note `ru chat-modal-tip-custom` seeds BOTH
`custom` (tip chip) and `tierCustom` (security tier) — the shortened «Вручную»
now shows in both spots; native review may want the tier renamed.

## Caveats

- 360px is the modelled floor. A 320px device loses ~40px per full-width
  budget; the near-miss set is the first to go. No shipped 320px target today.
- The estimator is font-approximate. Anything within ±8% is reported as near,
  never auto-fixed.
