# F5 checklist — Session X (2026-09-17): the composer regression, the chooser, the row, the ticks

Rows: DECISIONS **#869–#872**. Proposal (not built): `docs/contact-details-premium-proposal.md`.
Renders (built shells, Chromium, the C# wire): `docs/sheets/session-x/`.

Everything below already RAN on this machine's VM (bundle · 18 shells · `build-shells --check` ·
`extract-strings --check` · `i18n-lint` · `generate-icons --check` · NUL sweep — all green; the
per-pin harnesses new-vs-committed + mutations). The full suite is yours: it is longer than one
bridge call.

## 1 · The paste (PowerShell, repo root, one line at a time)

```powershell
npm i --no-save jsdom eslint globals
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Expected last suite line: **BASELINE OK / the 2 KNOWN** with **+9 assertions** over W's count
(composer-h boot pin · undeclared-identifier gate ×2 · art ladder · sheet-card lift · chooser
rule · row column · read stroke · read contrast — some carry two clauses). ⚠ If the first red
line is `UNDECLARED-IDENTIFIER GATE: parser missing`, the `npm i` line did not run — the gate
refuses to pass without ESLint (#869), by design. ⚠ Install all three together: `npm i --no-save`
of one package PRUNES the others (there is no package.json to protect them).

Then: wipe `obj`/`bin` is NOT needed (no C# changed). Build (Windows: F5, never `dotnet build` —
#663) and deploy Android.

## 2 · The walk

| # | do | expect | P/F |
|---|---|---|---|
| X.1 | open any conversation with history | the NEWEST bubble sits fully ABOVE the composer pill; the pattern runs behind the pill | |
| X.2 | same chat: tap ⊕ (tray) then type | the log lifts with the tray; nothing hides under it (the Session K rule still holds) | |
| X.3 | scroll up, tap the chevron / the @ FAB | both float ABOVE the pill, not over it | |
| X.4 | Chats list: rows with and without unread / muted / @ | the TIME sits on the name's line in EVERY row; badges sit on the excerpt's line | |
| X.5 | Chats list: a row whose last message is delivered vs one read | delivered = grey ✓✓; read = blue ✓✓ — SAME weight, colour only (#877) | |
| X.6 | in a chat: your delivered vs read bubbles (both themes) | delivered = quiet meta ink; read = MINT — same weight and size (#877; the B/C dial is withdrawn) | |
| X.7 | Contacts → Add contact, LIGHT | the two cards show a visible hover on desktop (bg step + lift), pressed = darker step | |
| X.8 | same, DARK | the cards are LIGHTER than the sheet (no recessed cards, no hairline); hover lifts again | |
| X.9 | same, DARK, the art | still a white square UNTIL you replace `src/demo/images/add-contact.png` with a transparent export (§3) | |
| X.10 | Chat info (1:1) | unchanged — the proposal is not built | |

## 3 · Owed by Damir

1. **A transparent `src/demo/images/add-contact.png`** (same name) — export the illustration
   NODE from Figma (not the asset URL, #865), transparent background, square box, 3×. Overwrite
   the file; the next `build-shells` copies it beside the shells. No code change (#870 — the
   SVG-first rung was reverted after your run tripped the reachability gate).
2. The three forks in `docs/contact-details-premium-proposal.md` §4 (recommendation A · A · A).
4. **S1 timed** — the spare experiment is still undecided (#872 ②): checklist W §3 has the line.

## 4 · Commit

One batch, `docs/commit-message-session-x.txt`. `git add` the new files: `docs/contact-details-premium-proposal.md` ·
`docs/f5-checklist-session-x.md` · `docs/handoff-2026-09-17.md` · `docs/commit-message-session-x.txt` · `docs/sheets/session-x/`.
