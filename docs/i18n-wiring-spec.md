# i18n wiring spec — Phase 3 item 3 (window.SL goes live)

Turns the READY dictionary machinery (#166–#169: 605-key en-us + locales +
`strings.iife.js` + pseudo leak-test) into live localization in the shells, with
**no C# changes** and the bridge frozen. Implements ARCHITECTURE §7.

## Runtime contract

- **`window.SL`** = the active string dictionary for the current shell — a flat
  `{ key: "value" }` object. This is the one runtime source of strings.
- **`src/components/strings-runtime.js`** exports `getStrings()` (returns
  `window.SL || {}`) and `setStrings(dict)` (assigns `window.SL`, returns it).
- Every component factory's `strings` parameter now defaults to `getStrings()`
  instead of `{}`. Because default params evaluate per call, each render reads
  the *current* `window.SL`. An explicit `strings` argument still wins, so
  parents that already thread a dict down are unaffected.
- `window.SL` absent → `getStrings()` returns `{}` → the existing
  `strings.KEY || 'English'` literals render. **Fully backward-compatible**: a
  shell that never sets `window.SL` behaves exactly as before.

## How a shell/demo goes live (the "one-liner")

Load the dictionary global, then set the active locale before first render:

```html
<script src="strings.iife.js"></script>
<script>window.SL = window.SpixiStrings.get(
  new URLSearchParams(location.search).get('lang') || 'en-us');</script>
```

- `?lang=de-de` (or any embedded locale) switches language; `?lang=pseudo`
  loads the marker locale (every rendered string becomes `⟦key⟧`, so any plain
  English left on screen is an un-i18n'd hardcoded string — the leak test).
- Default is `en-us` (identical output to the pre-i18n demos → zero visual diff
  on the default path, which keeps existing demo review valid).

## Mapping to the real app (Phase 3 items 4–5, no work here)

- Under Vite (item 4) the components keep their ESM `import { getStrings }`; the
  build resolves it normally. The demo `strings.iife.js` / `SpixiStrings` global
  is a **demo-only** convenience and is not shipped.
- In MAUI, C# injects the per-shell `window.SL = { … }` token block (ARCHITECTURE
  §7 — the mechanism that already injects `SL_Platform` into inline JS today).
  A language change rides the existing page-reload path; it becomes *instant*
  only if the §8 `getStrings`/`setStrings` bridge command is later approved —
  at which point the C# side calls `setStrings(newDict)` and shells re-render.
- `window.SPIXI_ENV` (config: Platform/theme/devMode/capabilities) stays a
  separate block — never mixed into `window.SL`.

## Decisions / flags

- **Locale switch in demos = `?lang=` reload**, not a live in-page re-render.
  Rationale: demos build their DOM once; a reload is honest about the MAUI
  reload path and avoids a bespoke re-render harness. `setStrings()` exists for
  the future instant-switch bridge, not the demos.
- **No visible language picker** added to each demo (avoids per-demo layout
  churn ×8 and scope creep); `?lang=` is the documented switch. Revisit if
  Damir wants an on-screen switcher.
- Dictionary regeneration is part of this batch: en-us drifted 600→605 keys
  since #166, so `extract-strings` → `build-locales` → `build-strings-iife` are
  re-run. `extract --check` reports **0 fallback conflicts** (the #166 25 are
  already resolved) and **3 no-fallback refs** — audited in the loop.
