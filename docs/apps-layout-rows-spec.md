# APPS LIST — DEFAULT VIEW AND VIEW PERSISTENCE (Damir, 2026-09-04, walk L)

**Status: LOGGED, NOT BUILT.** Two rows from the walk. Small, but one of them is a deferral
that was never closed and now reads to the user as a bug.

## Row 1 — the default view should be GRID

`src/shells/home.html:3025`

```js
const appsState = { apps: [], query: '', layout: 'list' };
```

`renderAppsList` resolves `state.layout === 'grid' ? 'grid' : 'list'`, so anything that is not
the literal `'grid'` falls to list. A new install therefore lands on **list**; Damir wants
**grid**.

**Fix:** the seed value at `home.html:3025`, and the same default wherever the standalone
apps-shell seeds its own state — grep `layout: 'list'` before changing one of them, so the two
homes cannot disagree. The component docblock (`apps-shell.js:9`) documents the state shape and
should be updated with it, or it becomes a false invariant (#772).

⚠ Row 1 and Row 2 interact: once the choice persists, the default is only what a **new install**
sees. Land them together, and make sure a stored `'list'` still wins over the new default —
changing a default must never silently re-skin somebody who chose the other one (the E1 rule).

## Row 2 — the choice does not survive a restart

`src/components/apps-shell.js:296-297`

```js
export function setAppsLayout(listEl, state, layout, opts) {
  state.layout = layout === 'grid' ? 'grid' : 'list';   // in-memory preference (persistence deferred, §7)
```

**This is not broken code — it is a deferral that was never closed**, and the comment says so in
as many words. Worth separating the two readings, because they are both true:

- **From the code's side:** working as written. Persistence was scoped out at §7 and nobody came
  back for it.
- **From Damir's side:** he set a view, restarted the app, and it was gone. That is a bug. A
  toggle that forgets is worse than no toggle, because the user has to re-set it every launch
  and eventually stops trusting the control.

**Fix:** persist it under a `spixi.*` key, following the established convention — the tree
already carries `spixi.chat.ground`, `spixi.chat.pattern`, `spixi.chat.patternstyle`,
`spixi.chat.textscale`, `spixi.appearance`. So: **`spixi.apps.layout`**, holding one of two
fixed words.

Read it where the state is seeded, not after first paint — a layout resolved late flips the list
from column to 2-up in front of the user. That is the **#690 three-ladder rule** in its apps-tab
form: if the value is read after the first render, it flashes.

Fail-soft, per the same convention as `readPatternLevel` and `bootKbSlot`: an unreadable,
absent or unrecognised value falls through to the default (grid, after Row 1) rather than to
empty or to a third state.

## ⚠ Process — a new `spixi.*` key needs a security-gate row BEFORE the batch

`CLAUDE.md` requires a `docs/security-handover-gate.md` read before any batch that adds a verb, a
`spixi.*` storage key, a WebView setting, an HTML sink, a network fetch, or a log line.
**Session J added `spixi.kb.slot` with no gate section and it was only caught in the #46 loop
three sessions later** — filed retroactively in Session L. Do not repeat it: `spixi.apps.layout`
gets its row in the same batch that adds it.

The row writes itself, and it is the mildest kind: **one of two fixed words** (`list` / `grid`),
no user content, no address, no identifier. It joins the mini-app-readable `file://` partition
(MAJOR #4) like every other `spixi.*` key — a mini-app could learn that this user prefers a grid.
That is a device-shape-class fact, not user data, and it is accepted on the same basis as
`spixi.kb.slot`. **Record the judgement; do not skip it because the answer is easy.**

## Gates

`build-demo-bundle` → `build-shells` (bundle BEFORE shells) · `smoke-test`. No new string if the
toggle's labels are unchanged, so locales should stay at 786 — **confirm rather than assume**,
and record the closing numbers.

Pins wanted: the seeded default is `'grid'` in every home that seeds one; the key is written on
change and read at seed time (not after first paint); an unrecognised stored value falls back to
the default. State `stripCode` or raw explicitly for each (#771).
