# The illustration set, aligned — notes

2026-10-11 · Damir 14:45 / 14:48: "Do we need to update any of the existing illustrations … to match the quality and direction?" → "Please do"
(render the welcome options and the less-shiny set). Render only; nothing in `src/` changes.

| Item | Detail |
|---|---|
| ★ PICKED (Damir 2026-10-11 14:55) | **Welcome A** (today, no change) · **less shine** on the set · **the calm chest** in the backup slot |
| Welcome A | today: `illoWelcome1–4` on `--gradient-launch` (pinned dark), 232 px art, title, copy, dots, Create / Restore |
| Welcome B | the same art on a rounded panel (296 × 250, radius 28) in the locked carousel's dark ground (`#2c5fd8 → #6a2fc8`), white sparkles, a light rim and a deep violet shadow; behind the art a quiet wall that names the slide (bubbles · ID cards · coins · app tiles) at 14 % (What's new: 22–32 %), panning slowly |
| Less shine | every `*Gl@@` gloss gradient's stop opacities × 0.5 (`0.6 → 0.3`, `0.08 → 0.04`); no shape, colour or motion change; 12 drawings (rating has no gloss sheet, so it does not change) |
| Backup | the calm, one-body chest of `kit-render.html` in the backup slot |
| Empty states | stay on the plain screen ground on purpose (calm for waiting states); only the gloss change applies |
| To build (after a pick) | gloss: one edit per drawing in `IL_ART` · backup: replace the `IL_ART.backup` body (slot, size, `--il-*` unchanged) · welcome: no change (A picked) |
