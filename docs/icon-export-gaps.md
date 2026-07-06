# Icon sweep — missing glyphs to export (Phase-2 "B2 icon exports")

Full sweep of every glyph the UI references (`icon('x')` / `icon: 'x'` /
`glyph: 'x'`, plus bottomnav `-filled` twins derived as `item.icon + '-filled'`)
against the registry (`src/assets/icons/tabler-icon-*.svg` → `generate-icons.mjs`).

**Headline: nothing in the UI renders empty today** — every referenced name
resolves to a registered icon. The gaps are (a) one bottomnav selected-state
twin, and (b) three glyphs that currently show a *stand-in* because the real
Tabler icon was never exported.

## The pipeline (how export → auto-theme works)

Drop `src/assets/icons/tabler-icon-<name>.svg` (24×24 viewBox, filled Tabler
style) → run `node scripts/generate-icons.mjs` → rebuild the demo bundle. The
generator does the theming automatically, so it looks right in BOTH modes:
- ink `#131415` → `currentColor` (inherits the context token: topbar ink, row
  ink, on-scrim, etc. — themes with light/dark for free)
- brand `#3050BD` → `var(--icon-accent)` (themed accent)
- any fill-less shape → `currentColor`
No per-icon CSS or token wiring is needed — that's the whole point of the pipeline.

## Export list (4 files)

| Export as | Tabler slug | Where it shows | Today | Lights up on export? |
|---|---|---|---|---|
| `tabler-icon-user-circle-filled.svg` | `user-circle` (filled variant) | Account tab **selected** state (mobile bottomnav) | absent → tab stays outline when selected | **YES — automatic.** bottomnav derives `user-circle-filled` dynamically; the file is all that's missing |
| `tabler-icon-world.svg` | `world` | Settings → **Language** row disc | stand-in `at` (settings-shell.js:661) | needs 1-line swap (below) |
| `tabler-icon-lock.svg` | `lock` | Settings → **App lock / security** disc | stand-in `square-asterisk` (settings-shell.js:699) | needs 1-line swap |
| `tabler-icon-user-plus.svg` | `user-plus` | Contacts → **Add contact** action | stand-in `user-circle` (contacts-shell.js:249) | needs 1-line swap |

### Important nuance — the 3 stand-ins are NOT fully automatic
`user-circle-filled` lights up the moment you export it (the code already asks
for that name). But `world` / `lock` / `user-plus` are *hardcoded stand-ins* —
the components literally say `glyph: 'at'` etc. Exporting the real SVG adds it to
the registry and themes it correctly, but the call site still points at the
stand-in until it's swapped. These swaps are FROZEN-component edits (flag +
DECISIONS row, per the audit rules), one line each:
- `settings-shell.js:661` `glyph: 'at'` → `glyph: 'world'`
- `settings-shell.js:699` `glyph: 'square-asterisk'` → `glyph: 'lock'`
- `contacts-shell.js:249` `'user-circle'` → `'user-plus'`

**Sequencing (avoid a broken frame):** export the SVGs + regenerate FIRST, then
apply the swaps. Swapping before the icon exists = `icon()` warns "unknown icon"
and renders empty until the file lands.

## Optional (icon already exists — code-only, no export)
`shield-lock` IS registered, but `createSystemNotice` still defaults its medallion
to `glyph: 'square-asterisk'` (system-notice.js:8), and the desktop secure-notice
doesn't override it — so the "Encrypted, peer-to-peer" notice shows an asterisk,
not a shield. One-line default swap to `shield-lock` finishes #127.

## NOT gaps (verified — leave alone)
- `apps-filled`, `messages-filled`, `wallet-filled` — present; those nav tabs
  already crossfade to filled on select.
- `icon: 'users'` (app-frame/chats "Contacts" topbar action) — a topbar action,
  not a nav tab, so it needs no `-filled` twin; base `users` is registered.
- Demo stand-ins (mock camera, media SVG, avatar data-URI, safe-area padding)
  are intentional file:// mocks, not registry gaps.
