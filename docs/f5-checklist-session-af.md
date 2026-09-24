# F5 checklist — Session AF (2026-09-24): the AE walk fixes, #944 reviewed

Rows: DECISIONS **#946** (the owed review: AE r4 CLEAN · #944 NOT CLEAN → 7 Opus rounds → CLEAN; ★ E-1 the
blind-room address leak FIXED) · **#947** ③ Cancel request removed from contact details (+ the ContactDetails
verb deleted) · **#948** ④ the member-sheet admin buttons (the rule moved to member-sheet.css, stacked) ·
**#949** ⑤ no hairlines inside a group (Account hub · roster) · **#950** ② a second tip says the true thing
BEFORE any payment dialog · **#951** ① the reaction pill — rendered, your pick · **#952–#961** the #46 loop over
the build batch (10 rounds, 0 MAJOR, CLEAN; design calls #953 and #959). Verdict:
`docs/opus-review-verdict-session-ae.md`. Walk sheet: `docs/walk-artifact-session-af.html` (23 rows; also
published as an Artifact).

★ **C# CHANGED** — `Spixi/Pages/Home/HomePage.xaml.cs` (the blind guard) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs`
(`hasOwnTip`) · `Spixi/Pages/Contacts/ContactDetails.xaml.cs` (the verb deleted) + all 13
`Spixi/Resources/Raw/lang/*.txt` (+1 key each). This build is the FIRST COMPILE of those edits; a compile error
is this session's bug. `cs-syntax-check`: 184 parse cleanly + 3 known gaps (unchanged).

**Components changed** → bundle BEFORE shells: `src/components/contacts-shell.js`; styles
`member-sheet.css` · `chat-info.css` · `settings-shell.css`; shells `contact_details.html` · `chat.html`
(comments). Strings: `extract-strings --check` green (the new text is a C# lang key, not a shell key).

**Suite, BEFORE/AFTER in one environment** (container, WITH the `Ixian-Core` sibling):

| | result |
|---|---|
| BEFORE (`7f27e5f4`, #944 committed) | 4868 pass, **4 RED** besides the 2 KNOWN — #944 had broken #720→CH6 and CH6 ①②③ and never ran the full suite |
| AFTER (this batch) | `BASELINE OK — 4880 pass / the 2 KNOWN` |

Expect your AE number **+18** (AE container 4862 → 4880; read the DELTA, #895).

## 1 · Build (PowerShell, repo folder)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
node scripts\build-demo-bundle.mjs
node scripts\build-shells.mjs
node scripts\build-shells.mjs --check
node scripts\smoke-test.mjs
```

Windows: open `SPIXI.sln` in Visual Studio → **F5** (net10.0-windows, Debug). Never `dotnet build` (#663 — it
serves the previous shells and looks normal).

Android (Motorola, USB debugging on):

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run
```

→ opens **Spixi Dev** on the phone. C# changed, so if the phone shows old behaviour, delete `Spixi\obj` and
`Spixi\bin` and run the same command again.

## 2 · The walk — `docs/walk-artifact-session-af.html`

§0 AF.0 build · §1 ③ (AF.1 no Cancel on the pending profile · AF.2 strip/row still "Hide" · ★ AF.3 incoming
Decline removes — the behaviour the pin hands to you, #959) · §2 ④ (AF.4 phone · AF.5 desktop) · §3 ② (★ AF.6
the second tip, no payment dialog · AF.7 a first tip unchanged) · §4 ⑤ (AF.8 hub + Notifications · ★ AF.9 the
roster, look for ANY line — #953 hands this to you) · §5 #944 first walk (AF.10–AF.16; ★ AF.12 a BLIND group,
nameless sender → no prefix) · §6 AF.17 your pill pick · §7 AF.18/AF.19 carried from AE · §8 records + dials.

Rows where the NOTE is the answer: AF.17 (LEAVE or B) and AF.22 (four dials).

## 3 · Then

`git add` the NEW files: `docs/f5-checklist-session-af.md docs/walk-artifact-session-af.html
docs/commit-message-session-af.txt docs/handoff-2026-09-24b.md docs/sheets/session-af/` — never `git add -A`.
Moved to `docs/archive/`: `handoff-2026-09-24.md` (git shows a rename). Commit ONE batch
(`docs/commit-message-session-af.txt`) → the OFFICE iPhone day (`docs/handoff-2026-09-24b.md`).
