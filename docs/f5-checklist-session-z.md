# F5 checklist — Session Z (2026-09-18): the Y-walk list · the #882 dials · flags on Windows · the glass dial

Rows: DECISIONS **#885** (the walk verdict + your answers) · **#886** (#884 ①–⑦ built) · **#887** (#882 (a)(c)(d)) ·
**#888** (L15b flags on Windows) · **#889** (the glass dial + the desktop composer foot) · **#890** (the #46 loop on Opus).
Walk sheet: `docs/walk-artifact-session-z.html` (17 rows, Copy results at the top). Renders: `docs/sheets/session-z/`.

Everything below already RAN — bundle · 18 shells · `build-shells --check` · `extract-strings --check` · i18n-lint · pseudo,
and the FULL smoke suite in the container on this exact tree: **BASELINE OK — 4754 pass / the 2 KNOWN**. Every landed file's hash read back (#865).
**No C# changed** — no `obj`/`bin` wipe, no Android rebuild of C#; the Raw/html assets are the change.

**VERDICT (Damir, 2026-09-18 evening, Windows + Android): 15 P · 1 F · 0 N/A, Z.17 not marked; COMMITTED `09f379b1`.** The fail is **Z.5, the glass dial**: "looks ugly, there's a rectangle and cutoff for glass — maybe a gradient / reduced opacity, or even that not" → the backdrop-filter band is OUT (#891). Z.10 passed without a chooser pick — still open. **Three findings on the way, none a walk row:** ① contact details → **Message** returns to the CONTACT LIST instead of opening the chat; ② tapping a **shared group** row ("Groups you are both in") also returns to the contact list; ③ the **call strip is invisible** — during a call there is nothing to answer or decline with. All three → `docs/next-session-prompt.md` §1/§2, verify-first.

## 1 · The paste (PowerShell, repo root, one line at a time)

```powershell
npm.cmd i --no-save jsdom eslint globals
node scripts/extract-strings.mjs --check
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/build-shells.mjs --check
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Expected last suite line: **BASELINE OK — 4754 pass / the 2 KNOWN** — +27 over AND-45's 4727. The delta is GATE 64 (the colour-literal walk, with its
fixtures) + GATE 65 (Session Z: sheets · ghost · the flag font executed on the BUILT shell · the derived card-hover walk ·
L15b's property/inlined/shell walks · the glass dial · the desktop foot) and ~40 pins re-based in both halves (#861) where a
number, a token name or a file they read moved (the P5 label · the hairline role · DARK SATURATION + ink contiguity · the
sheet-card floor · the notice trap · #876's tiles incl. the no-call host · Session P L1·12 4 → 5 keys · Session N `fonts/`
· `CHAT_KB_CEIL` 686 → 648 with its delta). ⚠ `parser missing` = the `npm i` line did not run (install all three together —
`--no-save` of one PRUNES the rest). ⚠ `.git/index.lock` → delete it before GitHub Desktop (#882 ②).

**Then Windows F5 in Visual Studio (never `dotnet build`, #663)** — this time Windows is the FIRST walk (the flags need
WebView2). Then the phone.

## 2 · Windows — walk rows Z.1–Z.6 (the sheet has the words)

| # | do | expect |
|---|---|---|
| Z.1 | Account → Language | colour flags on every row, not "US" / "DE" letters |
| Z.2 | sign out → welcome pill | the pill's flag too (PNG upgraded in place) |
| Z.3 | a message with 🇸🇮 😀, one with 🏴 | 🇸🇮 Twemoji · 😀 Segoe · 🏴 as before |
| Z.4 | any chat | the composer pill has a 12 px foot below it |
| Z.5 | F12: `localStorage.setItem('spixi.chat.glass','1')`, reopen the chat; then `removeItem` | frost ON band-only / OFF transparent — **your pick in the note** |
| Z.6 | sheets · pane · toasts | sheets' foot 24; the rest as before |

If Z.1 shows letters: open F12 → Console → `document.documentElement.hasAttribute('data-flag-font')` and
`typeof window.__spixiFlagFont`. `false` + `'undefined'` = the script never loaded (path or WebView2 policy — note the
console error verbatim); `true` + `'string'` = the font loaded and WebView2 did not apply it (a different fix, not this
route). Either verbatim line decides the next step; do not guess.

## 3 · The phone — walk rows Z.7–Z.16

The sheet carries them: hairlines (Z.7) · the label case + Deutsch (Z.8) · the pencil centring on BOTH screens (Z.9) ·
sheets 24 (Z.10, the tray deliberately 16) · the dark chooser hue (Z.11) · pressed fills on card rows (Z.12) · Request on
the directory arm, Mute from the chat's ⓘ (Z.13) · a chat opens and scrolls as before (Z.14) · the phone's own flags
untouched (Z.15) · the notice card by eye identical (Z.16).

**Z.10 carries a pick:** the chooser copy — `docs/sheets/session-z/chooser-grid.png` has base / trimmed / actions-first in
both themes; nothing landed. Write base / trimmed / actions-first in the note.

## 4 · Owed by Damir

1. This walk (§2 + §3) — then the commit (`docs/commit-message-session-z.txt`), one batch.
2. The two picks: the chooser copy (Z.10) · the glass default + whether it gets a Chat-appearance toggle (Z.5).
3. The translator pass over `src/strings/draft/*.json` (`creditFlags` ×12; `sharedGroupsTitle` for cn/id/it/ja/lt).
4. **S1 timed** (#872 ②) — still the one number that decides #864 and the spare.
5. The AND-40 meminfo series · the iOS walk · then pre-release per `docs/release-readiness.md`.

## 5 · Commit

One batch, `docs/commit-message-session-z.txt`. `git add` the NEW files: `src/assets/fonts/TwemojiCountryFlags.woff2` ·
`Spixi/Resources/Raw/html/fonts/TwemojiCountryFlags.js` · `docs/handoff-2026-09-18b.md` · `docs/f5-checklist-session-z.md`
· `docs/walk-artifact-session-z.html` · `docs/commit-message-session-z.txt` · `docs/sheets/session-z/` (10 PNGs); the
three moves into `docs/archive/` (`handoff-2026-09-18.md` · `f5-checklist-and-45.md` · `commit-message-and-45.txt` —
the AND-45 walk verdict is written into the checklist before it moves).
