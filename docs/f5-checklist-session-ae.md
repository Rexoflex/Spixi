# F5 checklist — Session AE (2026-09-23): the last FE fix round before the office

Rows: DECISIONS **#938** (the freeze DIAGNOSED — inherited, caught, Core; CORE-13) · **#939** (the ⊕ tray:
`height: max(slot, content)`) · **#940** (the fade behind the composer, per row; pick **A**) · **#941** (the
bot-room Delete gate) · **#942** (AD.13 closed — one tip per sender is Core's rule) · **#943** (the #46 loop
on Opus, FOUR rounds, every one NOT CLEAN; CLEAN NOT CLAIMED — no fifth reader over the r4 fixes). Verdict:
`docs/opus-review-verdict-session-ae.md`. Gate section: `docs/security-handover-gate.md` (Session AE — nothing
introduced). **Walk sheet: `docs/walk-artifact-session-ae.html`** — 19 rows, P/F/N + notes, Copy results at
the top.

★ **NO C# CHANGED.** Nothing to compile; no `obj`/`bin` wipe. On Windows, F5 (never `dotnet build`, #663 — a
`dotnet build` serves the PREVIOUS shells and looks normal). Android: a Debug deploy repackages the assets.
The freeze item (#938) changed NOTHING in the app — it is a diagnosis to confirm (AE.1 · AE.2), and the fix
is Core's (`docs/be-cutover-brief.md` CORE-13).

**Components changed** → the bundle BEFORE the shells: `src/components/attach-sheet.js` ·
`message-menu.js` · `chat-select.js`; styles `attach-sheet.css` · `message-menu.css` · `reactions.css`
(comment only); the shell `src/shells/chat.html`; the suite `scripts/smoke-test.mjs`. Strings unchanged
(`extract-strings --check` green; zero new keys).

Everything below RAN in the container: bundle · 18 shells · the four `--check` gates ✓ · lint ✓ · the K1
jsdom harness + the built-shell boot gate (a stubbed ResizeObserver whose callback is INVOKED — `--composer-h:
77px` required) · the Playwright renders on the BUILT shell through the real `executeUiCommand` wire
(`docs/sheets/session-ae/`) · the FULL suite on a snapshot of the landed tree.

**Suite, controlled BEFORE/AFTER in one environment** (container, WITH the `Ixian-Core` sibling):

| | result |
|---|---|
| BEFORE (pristine snapshot ≡ `a664d59f`) | `BASELINE OK — 4848 pass / the 2 KNOWN` |
| AFTER (this batch, after the r4 fixes) | `BASELINE OK — 4862 pass / the 2 KNOWN (+14)` |

Compare the DELTA in your environment, never the absolute (#895): expect your Session AD number **+14**.

## 1 · Build

```
node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs && node scripts/smoke-test.mjs
```
then F5 Windows → Android Debug deploy. `git add` the NEW files:
`docs/opus-review-verdict-session-ae.md docs/f5-checklist-session-ae.md docs/walk-artifact-session-ae.html
docs/commit-message-session-ae.txt docs/handoff-2026-09-23d.md docs/sheets/session-ae/` — never `git add -A`.
Four consumed docs moved to `docs/archive/` (git shows renames): `handoff-2026-09-23b.md` ·
`f5-checklist-session-ad.md` · `walk-artifact-session-ad.html` · `commit-message-session-ad.txt`.

## 2 · The walk — `docs/walk-artifact-session-ae.html`

§0 build (AE.0) · §1 the freeze (AE.1 Windows Debug: Continue → the app resumes · AE.2 Android: no freeze,
the `Exception occured in StreamProcessor.receiveData` line in `ixian.log`) · §2 the fixes (★ AE.3 the tray on
a FRESH keyboard slot — `localStorage spixi.kb.slot` unset · AE.4 rotation · ★ AE.5 the fade, pick A, a LONG
chat · AE.6 desktop · AE.6b iOS only, the keyboard slide — office · AE.7 the lifted row crisp · AE.8 the pill
pop residual, your eye · ★ AE.9/AE.10 Delete as member vs admin in a bot room · AE.11 mixed select) · §3 the
AD rows still owed (AE.12 = AD.13 corrected · AE.13 = AD.19 · AE.14 = AD.20 · AE.15 = AD.23) · §4 two reads.

Rows where the NOTE is the answer: AE.1 and AE.2 (did the break appear at all; the log line), AE.8 (how
visible the pill pop is), AE.12 (the design, not a bug).

## 3 · Then

Commit ONE batch (`docs/commit-message-session-ae.txt`) → **the office iPhone day**
(`docs/walk-artifact-ios-office.html`; iO.1 the portal is DONE, #932 — mark it P; iO.7 the mute test is the
day's question; AE.6b rides along) → the next session's item 0 = the FIFTH Opus reader over the r4 delta
(#943) → the endgame (#916 as shaped by #933).
