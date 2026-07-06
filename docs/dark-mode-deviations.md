# Dark-mode deviations log — Phase 2 tail (2026-07-06)

Scope: verification pass on the theming model + a code-side audit for token
bypasses that would break dark mode. Method = static CSS/token inspection
against the clean HEAD snapshot (no sandbox render — #142). Items marked
**[eyeball]** need Damir's visual dark pass in the demo; nothing here is a code
bug.

## Verdict: dark mode is token-driven and swaps cleanly

Every color in the component CSS resolves through a semantic token
(`var(--…)`) or a **sanctioned fixed-pair** surface. The `[data-theme="dark"]`
block in `tokens.css` overrides the surfaces the shells sit on:

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--surface-screen` | neutral-10 | neutral-900 | base pane |
| `--surface-menu` | neutral-10 | neutral-700 | elevated surfaces lighten in dark |
| `--surface-hero` | primary-600 | primary-800 | wallet hero / topbar |
| `--surface-qr` | neutral-10 | neutral-10 | **fixed pair** — QR stays near-white for scan readability |
| `--switch-track-off` / `--switch-knob` | dedicated pairs (#148) | — | neutral-03 vanished on cards; on-action ink went near-black — both fixed by dedicated pairs |

The "115 raw hex" a naïve grep reports are almost all `#NNN` **DECISIONS
references in comments** (e.g. `#148③`), not colors. The only literal color
hex in component CSS is the **scan-shell camera bed** (`#101214` bed, `#ffffff`
on-camera ink, torch-lit chip) — every occurrence carries a `/* sanctioned … */`
note and is intentionally identical in both modes (a camera viewport is a fixed
dark surface regardless of app theme).

## Cleared this pass

- **[D-log] Inline `.c-txsheet` tx-detail surface (desktop).** The desktop
  tx-detail *lift* (`buildInlineTxDetail` → `dtOpenWalletDetail('tx')`) mounts
  the `.c-txsheet` in the **detail pane** (`--surface-screen` → neutral-900 in
  dark), not the anchored-menu surface (`--surface-menu` → neutral-700) it was
  originally drawn against. Both are valid dark surfaces and all inner ink uses
  semantic tokens, so it themes correctly — the note was only that it now reads
  at *pane* elevation, not *menu* elevation. **[eyeball]** confirm the tx-detail
  card still reads cleanly on the deep pane in dark. Not a code change.

## [eyeball] — verify in Damir's dark demo pass

These are composition surfaces / transient overlays that the jsdom smoke can't
see; token-correct in code, worth a visual confirm in dark:

1. **Anchored context-menu dropdowns** (desktop right-click → `--surface-menu`,
   neutral-700 in dark) — confirm separation from the pane behind them.
2. **Attach / share popover** rising from the composer ⊕ (desktop) — same
   `--surface-menu` family.
3. **Theme preview tiles** (launch welcome + settings theme sheet, #147) — the
   tiles preview *both* modes on a pinned-dark welcome; confirm the selected
   tile ring is visible.
4. **Nudges** — backup-nudge and rating-nudge cards in dark.
5. **Fixed-pair sanity check** — `--surface-qr` (chat-info QR, wallet receive
   QR) and the scan camera bed / torch-lit chip: confirm they still read
   deliberately (near-white QR, dark camera bed) rather than looking like a
   theming miss.

## No action items for code

The token layer is doing its job; the remaining work is purely Damir's visual
confirmation in the demo (both modes toggle via the desktop language/theme
controls). If any [eyeball] item reads wrong, the fix is a dedicated token pair
in `tokens.css` (the #148 pattern), not a per-component raw.
