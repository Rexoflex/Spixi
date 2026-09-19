# F5 checklist — Session AA (2026-09-18): the glass dial retired · the fade rendered · the three findings

**VERDICT (Damir, 2026-09-19, Windows + Android): 12 P · 0 F · 1 N/A. COMMITTED as one batch.**
★ **AA.7 DECLINES the fade** — "nothing for now, we dont touch it". The composer edge ships as it is; #893 RETIRES rather than lands. ⚠ **AA.8 is N/A because finding ③ did not reproduce** — that is evidence of absence, NOT a fix: nothing changed on the call path but two `Logging` lines, and the diagnostic stays armed for the next occurrence. AA.9/AA.10 pass (Message from the directory AND from a chat's ⓘ, plus a shared-group row); 🟡 #897 removing the stale pinned conversation is a plausible cause, unproven — the log line was not captured. AA.11 + AA.13: the tx detail opens with no fade, swaps instantly, and a PENDING transaction still updates live (the row that proves #898's swap carried no latch over). AA.12 passes with his note: "restarting does the expected, empty state in pane so thats good" — the #897 trade accepted on the record. Full verdict: DECISIONS **#900**.

Rows: DECISIONS **#892** (the retirement + the pins + the ceiling) · **#893** (the fade, rendered not landed) ·
**#894** (the three Z-walk findings, ruled out at source) · **#895** (the #46 review on Opus).
**Walk sheet: `docs/walk-artifact-session-aa.html`** — 10 rows, P/F/N + notes, Copy results at the top.
Renders: `docs/sheets/session-aa/`. Diagnostic: `docs/diagnostic-session-aa-findings.md`.

★ **C# CHANGED IN THREE FILES** — `CallPage.xaml.cs` (two `Logging` calls, no behaviour change),
`HomePage.xaml.cs` (#897 the tab sweep + #898 reusing an open tx detail) and `WalletSentPage.xaml.cs`
(#898: the 150 ms self-fade removed, plus `showTransaction` for the in-place swap) — so this one **does** need a build. They came out of the review round: two refusal paths in
`ensureSurface` returned `null` in silence, and one of them is the branch that most plausibly explains
finding ③ (a call with no UI on either device). Without them the log capture in §4 cannot answer the
question it is being asked. Everything else is CSS + one shell + the suite.

Everything below already RAN on the VM: bundle (byte-identical, no component JS moved) · 18 shells ·
`generate-icons --check` · `build-shells --check` · `extract-strings --check`; and in the container:
`cs-syntax-check` **138 clean + 1 known grammar gap**, and the FULL suite four times.

**Suite, controlled BEFORE/AFTER in one environment** (container, **no `Ixian-Core` sibling**):

| | result |
|---|---|
| BEFORE (HEAD `e326f76b`) | `BASELINE OK — 4752 pass / the 2 KNOWN` |
| AFTER (this batch) | `BASELINE OK — **4753** pass / the same 2 KNOWN` |

The `+1` is the one new pin (no refusal path in `ensureSurface` is silent). Nothing regressed.

★ **MEASURED, 2026-09-18: Damir's local run reads `BASELINE OK — 4755 pass / the 2 KNOWN`.** That is
Session Z's local 4754 **+1**, exactly this batch's one new pin, with the two pre-existers unchanged — so
the batch is clean and this row is now a measurement, not a prediction.

⚠ **And it corrects MY reconciliation, not either run.** The container reads **2 below** this machine
(4753 vs 4755), not 1. The `M1 (#448)` hold-out gate accounts for one of those (`+1` with an `Ixian-Core`
sibling beside the checkout); the second comes from something else this container does not have, and it is
NOT worth chasing — both environments moved by exactly +1 for this batch, which is the only thing the
number is a signal for. **Compare deltas between runs in the SAME environment; never compare an absolute
count across two.** Neither the Session Z figure nor mine was wrong; my assumption that the gap was exactly
the sibling's +1 was.

## 1 · The paste (PowerShell, repo root, one line at a time)

```powershell
npm.cmd i --no-save jsdom eslint globals
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/build-shells.mjs --check
node scripts/extract-strings.mjs --check
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Then **build** (C# changed):

* **Windows** — **F5 in Visual Studio, never `dotnet build`** (#663: a plain `dotnet build` does not stage
  the `MauiAsset` files, so the app silently serves the previous build's shells).
* **Android** — point at the PROJECT, not the solution, and build before running
  (`docs/android-test-quickstart.md`):

  ```powershell
  dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug
  dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run
  ```

  ⚠ `dotnet build -t:Run -f net10.0-android` from the repo root targets **`SPIXI.sln`**, so MSBuild
  applies `Run` to all four projects — `Spixi-UnitTests` gets `dotnet exec`'d (MSB3073, exit
  −2147450751) and `Spixi-PushService` fails with MSB3072/MSB6011 ("the Exec task needs a command").
  Neither is a real build failure and neither has anything to do with this batch. With more than one
  device attached add `-p:AdbTarget=-s<serial>` (no space after `-s`).

No `obj`/`bin` wipe is needed; nothing moved between projects.

⚠ `parser missing` = the `npm i` line did not run (install all three together — `--no-save` of one PRUNES
the rest). ⚠ `.git/index.lock` → delete it before GitHub Desktop (#882 ②). ⚠ `_to_delete/` holds this
session's scratch (a jsdom probe script and two transfer tarballs) — it is gitignored, delete it freely.

## 2 · Walk — the glass is GONE, and nothing else moved

Windows or Android, either is fine; this batch is CSS + one shell.

| # | do | expect |
|---|---|---|
| AA.1 | open any chat, scroll | exactly as before this batch — the composer bar is transparent, messages pass under it |
| AA.2 | F12: `localStorage.setItem('spixi.chat.glass','1')`, reopen the chat | **nothing happens** — the key is dead, no frost, no band. (Was the Z.5 dial.) |
| AA.3 | the day pill / unread strip while scrolling | **still frosted** — that glass is a different token pair and must be untouched |
| AA.4 | Account → Chat appearance → change pattern, ground, text size; reopen the chat | all three still apply live (the stamp gate lost a key, not a reader) |
| AA.5 | desktop: any chat | the composer still has its 12 px foot (#889 ②, kept) |
| AA.6 | place a call to a device that is **unlocked and awake**, then pull `ixian.log` | a normal call. This row exists to confirm the two new `Logging` lines did **not** start firing on the happy path — `Call surface: REFUSED` must be **absent** when the call works |
| AA.11 | ★ **desktop:** Wallet → click a transaction, then click through several more | **no fade, no flash, no anything.** The first opens in the right pane; every one after changes **instantly**, with no new WebView built (#898 — the cause was the page's own `FadeTo(1, 150)`, not the overlay machinery). And no chat ever shows underneath (#897). ⚠ The trade: returning to Chats lands on the empty pane, NOT the conversation you left — the same trade you made for Contacts. Say if it bites; the follow-up is to PARK it instead of closing |
| AA.12 | **desktop:** tap the Chats tab while a conversation is open; and restart the app on Chats | the conversation stays open both times — the close is gated off tab1, and `home.html`’s boot echo arrives as `ixian:tab:tab1`. If a conversation vanishes here, the gate is wrong |
| AA.13 | **desktop:** open a **pending** transaction, leave the detail open ~30 s | its status still updates live — the one thing the in-place swap could quietly break (a latch carried over from a confirmed tx would stop the 1 Hz poll, with nothing visibly wrong until a pending tx never moves) |

**AA.3 is the one that matters.** `--surface-composer-glass` (deleted) and `--surface-chat-glass` (live)
differ by one word; the new pin asserts both directions, but your eye is the second check.

## 3 · The fade — your pick, nothing has landed

`docs/sheets/session-aa/composer-edge-fade.png` — light and dark, today's hard cut beside the fade,
rendered on the real built shell with two bubbles genuinely under the pill.

The left panels are the bug you reported: a bubble **sliced mid-word** at the pill's top edge. The right
panels dissolve it instead. The newest message is never dimmed — the log already pads its bottom by the
composer height, so at rest the last bubble sits above the fade zone.

Say one of: **ship it** · **shorter/longer fade** (80 px today) · **no, leave the edge as it is**.

## 4 · The three findings — one log capture, no build

`docs/diagnostic-session-aa-findings.md` has the capture steps and the decision tables. In short:

* **③ (no call UI, both sides)** — #891's prescribed one-line revert of `installFlagFont()` is **falsified**:
  that call is a no-op on any device that can paint a flag, so it cannot make Android blind. Capture
  `ixian.log` from **both** devices after a failed call. The first question the log answers is whether the
  callee ever saw the call at all — if it did not, this is delivery, not the shell.
* **①/② (Message and a shared-group row return to the contact list, Android)** — open a contact from the
  directory, tap **Message**, pull the log, and look for `Chat page for … already open.` That one line picks
  between two fixes that are not interchangeable.

Both captures fit in one sitting. Nothing should be edited before them.
