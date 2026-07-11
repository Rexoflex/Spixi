# i18n wiring spec — Phase 3 item 3 (window.SL goes live)

Turns the READY dictionary machinery (#166–#169: en-us + locales +
`strings.iife.js` + pseudo leak-test) into live localization in the shells, with
**no C# changes** and the bridge frozen. Implements ARCHITECTURE §7.
en-us is **662 keys** today (the generator writes the count into the file header —
that header is the source of truth; it grows with every extraction).

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

Load the dictionary global, then set the active locale before first render. The
**fallback differs by surface** (Batch A / A4):

| Surface | Boot line |
|---|---|
| Production shell (`src/shells/*.html`) | `window.SL = window.SpixiStrings.get(new URLSearchParams(location.search).get('lang') \|\| '*SL{language-code}');` |
| Demo (`src/demo/*.html`) | `window.SL = window.SpixiStrings.get(new URLSearchParams(location.search).get('lang') \|\| 'en-us');` |

- Shells: `*SL{language-code}` is substituted by `SpixiLocalization.localizeHtml`
  on every page load (the key ships in all 13 lang files), so the dictionary
  follows the app's language pref. In a plain-browser preview the marker stays
  un-substituted → `get()` falls back to en-us. **Hard-coding `'en-us'` here is
  the bug A4 fixed** (production rendered English in every locale).
- Demos have no C# substitution pass → they keep the literal `'en-us'`.
- `?lang=de-de` (or any embedded locale) switches language in both; `?lang=pseudo`
  loads the marker locale (every rendered string becomes `⟦key⟧`, so any plain
  English left on screen is an un-i18n'd hardcoded string — the leak test).
- Locales without a shell dictionary (`cn-cn` `it-it` `id-id` `ja-jp` `lt-lt`) are
  hidden from the pickers. If the app is *already* on one (App.xaml.cs:100-107
  auto-detects + persists the OS culture on first run), the picker appends a
  single read-only row for it (endonym + "translation pending" hint) so the user
  still sees their current language — `settings.html` `PENDING_LANGS`,
  `launch-shell.js` `PENDING_LANGS`.

## Mapping to the real app (Phase 3 items 4–5, no work here)

- Under Vite (item 4) the components keep their ESM `import { getStrings }`; the
  build resolves it normally. The demo `strings.iife.js` / `SpixiStrings` global
  ALSO ships inside the self-contained shells (build-shells inlines it) — it is
  the dictionary source in production too.
- **CORRECTED (Batch A — the paragraph below was never implemented and hid a
  shipped bug):** C# does NOT inject a `window.SL` token block. The shells embed
  every locale via the inlined `SpixiStrings` and pick one at boot:
  `window.SL = SpixiStrings.get(?lang= || '*SL{language-code}')` — the
  `language-code` key exists in every lang file, `localizeHtml` substitutes it
  on each page load, and an un-substituted marker (plain-browser preview) falls
  back to en-us inside `get()`. Before this fix the boot line was
  `?lang= || 'en-us'` and C# never appended a query → **production rendered
  English shell copy in every locale.** A language change rides the existing
  page-reload path; it becomes *instant* only if the §8 `getStrings`/`setStrings`
  bridge command is later approved — at which point the C# side calls
  `setStrings(newDict)` and shells re-render.
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
- Dictionary regeneration is part of every batch that touches copy:
  `extract-strings` → `build-locales` → `build-strings-iife` → `build-shells`.
  en-us has grown 600 (#166) → 605 (#175) → **662** (Batch A, which also brought
  `src/shells/` into the extractor's sweep — shell keys were never extractable
  before). `extract --check` must report **0 fallback conflicts**.
