# F5 checklist — Session Y (2026-09-17): the contact-details premium pass

Rows: DECISIONS **#878–#882**. Renders (built shells, Chromium, the C# wire): `docs/sheets/session-y/`.

Everything below already RAN — on this machine's VM (bundle · 18 shells · `build-shells --check` ·
`extract-strings --check` · `i18n-lint` · `generate-icons --check`) AND, for the first time, the FULL smoke suite
in the container on this exact tree: **BASELINE OK — 4714 pass / the 2 KNOWN** (#882 ①). Your run is the
confirmation on Windows, not the first run.

## 1 · The paste (PowerShell, repo root, one line at a time)

```powershell
npm i --no-save jsdom eslint globals
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Expected last suite line: **BASELINE OK — 4714 pass / the 2 KNOWN** (+42 assertions over X's count: the Session Y
block ×38 · the gate fixture · the per-shell vacuity clause · the #877 positive-property clause ·  the #345 line).
⚠ A `parser missing` red = the `npm i` line did not run; install all three together (`--no-save` of one PRUNES the
others). ⚠ If `.git/index.lock` exists, delete it before GitHub Desktop (#882 ②).

Then: no C# changed — Windows F5 (never `dotnet build`, #663) and deploy Android.

## 2 · The walk — Contact details / Chat info / Group info, BOTH themes

Tick sheet: `docs/walk-artifact-session-y.html` (P / F / N/A, note on every row, Copy results).

**WALKED 2026-09-17: 12 P · 0 F · 0 N/A** — `docs/walk-session-y-results.md` (with the logcat numbers and the meminfo series owed for AND-40).

| # | do | expect | P/F |
|---|---|---|---|
| Y.1 | Contacts → any 1:1 contact (directory) | hero: avatar · name (pencil) · the truncated **address in BLUE with a QR glyph** under it; tap it → the address/QR sheet | |
| Y.2 | same screen, the action row | FOUR equal rounded-rectangle tiles on the card colour: **Message · Call · Pay · Mute** (Call only if the contact is callable). No Request. No circles. | |
| Y.3 | tap **Mute** | the tile reads **Unmute** with a crossed bell, instantly; the chat list row shows the muted mark; tap again → Mute | |
| Y.4 | scroll | sections are cards with the title OUTSIDE in small caps: GROUPS YOU ARE BOTH IN · Payments (N) row · the destructive card LAST — Delete chat history (grey) above **Remove contact (red text, no red fill)** | |
| Y.5 | open a chat → header → Chat info (1:1) | same screen, the row is **Call · Pay · Mute** (no Message — you are in the chat) | |
| Y.6 | Payments (N) → expand | the tx rows sit inside the card with a thin separator between them starting at the text edge; press one → the press fill spans the row (#880 ①) | |
| Y.7 | a GROUP → Group info | avatar keeps its gradient · member count · a lone **Mute** tile · **Leave group (red text) ABOVE** the MEMBERS (N) card · no address line | |
| Y.8 | a BOT / channel → Chat info | the address line in blue under the name · Mute tile · Leave group above the roster | |
| Y.9 | DARK, any of the above | cards lift from the screen by tone (no shadow, no border); separators visible but quiet; tile hover (desktop) one step lighter; red label readable | |
| Y.10 | LIGHT, same | cards one tone down from the screen, no shadow; separators visible | |
| Y.11 | desktop (Windows) — the detail pane | the same grammar in the pane (#247: same component, same CSS); keyboard-tab to Delete chat history → the focus ring draws INSIDE the row, fully visible (#880 ②) | |
| Y.12 | the Account hub | UNCHANGED — its coloured discs stay (#618 amended to one grammar per screen family) | |

## 3 · Owed by Damir

1. **S1 timed** (#872 ②) — still the one number that decides #864 and the spare.
2. **A transparent `src/demo/images/add-contact.png`** (X §3 ①) — still owed unless it landed with the X deploy.
3. The four dials of #882 (handoff §4 ②) — one word each.

## 4 · Commit

One batch, `docs/commit-message-session-y.txt`. `git add` the new files: `docs/f5-checklist-session-y.md` ·
`docs/walk-artifact-session-y.html` · `docs/handoff-2026-09-17b.md` · `docs/commit-message-session-y.txt` · `docs/sheets/session-y/`; and the three
moves into `docs/archive/` (`handoff-2026-09-17.md` · `f5-checklist-session-x.md` · `commit-message-session-x.txt`).
