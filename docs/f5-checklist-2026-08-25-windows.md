# F5 checklist — WINDOWS. The first desktop pass in nine batches.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Walk this **on the Windows machine**. It is the same position iOS was in on 2026-08-21,
and that pass came back **71 pass · 0 fail** — so the expected result here is "nothing
regressed", and the value of the sheet is that we will finally know.

★ Template: `docs/f5-verdict-2026-08-21-ios.md`. This sheet keeps that pass's shape and
drops everything that was iOS-only.

---

## 0. Build it

⚠ C# changed heavily this batch (#387: wipe first — a red row can be a dirty build).

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
```

Then the pipeline, in order:

```
node scripts/generate-chat-pattern.mjs
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/smoke-test.mjs
```

| Step | Expect |
|---|---|
| generate-chat-pattern | `triangles 224×193.988 … ★ default` |
| build-demo-bundle | **275 exports** |
| build-shells | **18 shells** |
| smoke-test | **BASELINE OK — 2478 pass / the same 4** (#136 · #149③ · M5 · B3) |
| cs-syntax-check | 140 clean + 1 known gap |
| verify-locales | ALL LOCALES CLEAN |

Then, two commands — **never one**:

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug
Spixi\bin\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe
```

⚠ `git --no-optional-locks status` always.

---

## 1. ★ Boot and the eight unverified batches

Nothing here is new work. It is the regression surface that has never been looked at on
Windows since #325.

| # | Do this | Expect |
|---|---|---|
| 1.1 | Launch | The app starts. No exception dialog |
| 1.2 | Look at Chats, Wallet, Apps, Account | All four render. This is the desktop split (#240) |
| 1.3 | Light mode, then dark | ★ **The saturated dark ramp** — the chat canvas, the topbar and the bottom bar agree. **Light must be byte-identical to before**; that is the guarantee the change was built on |
| 1.4 | Open a conversation | ★ **The triangle pattern** on the chat canvas. It is pure CSS, so it lands here too |
| 1.5 | Account → Chat appearance | The pattern ladder renders and the levels change the canvas |
| 1.6 | Send a message to yourself or a test contact | It sends. The tick behaves |
| 1.7 | Resize the window narrow, then wide | The pane/takeover switch still works both ways |

## 2. ★ SOUNDS — new on Windows this batch, and audible for the first time

The four effect files landed as **placeholders** (`docs/sound-placeholders.md`). Windows
has had the `playEffect` plumbing since #468 and has never had anything to play.

| # | Do this | Expect |
|---|---|---|
| 2.1 | Send a chat message | One short blip |
| 2.2 | Receive a chat message | A two-note **rise** — clearly different from 2.1 |
| 2.3 | Send a payment | Two warmer, lower notes |
| 2.4 | Receive a payment | A three-note ascending figure — the longest of the four |
| 2.5 | Account → Notifications → **In-app sounds OFF**, repeat 2.1 | **Silence.** The switch is the SND-3 desktop off switch |

★ Judge them. They are placeholders and exist to be replaced — say if they are too loud,
too long, or the wrong character. Peak is −12.5 dBFS and none is over 0.52 s.

## 3. ★★ N65 — THE LANGUAGE PICK. This is the row the pass is for.

Damir's 2026-08-18 Windows frame had **four surfaces disagreeing at once**: hub copy in
French, the Language row reading Deutsch, the checkmark on Português, the app in German.

**Two of the four are fixed this batch (#498)** — the row value and the checkmark now
follow C#'s answer instead of the tap. The other two need the log line, which has been in
the build since #385 and **has never once been read on a device.**

| # | Do this | Expect |
|---|---|---|
| 3.1 | Account → Language → pick **Português (Brasil)** | The checkmark lands on it |
| 3.2 | Go back to the Account hub | ★ The **Language row VALUE** reads Português — not the previous language |
| 3.3 | Look at the hub copy, and at Chats behind it | Both in Portuguese |
| 3.4 | Restart the app | Still Portuguese |
| 3.5 | Now pick a language, then **read the log** | see the table below |

Dev mode is **10 taps on the "Chats" title** → send log. Search `Language pick`.

| The log says | Read it as | Who owns it |
|---|---|---|
| `loaded=True, active now 'pt-br'` **and** every surface agrees | ★ **N65 IS CLOSED.** #498 was the whole of it | done |
| `loaded=True` but a surface still disagrees | the load works; that surface has its own source — §3 of `docs/n65-triage-language-pick.md` names all four | us, next batch |
| `loaded=False` **plus** a `Language file … error on line N` | the file is refused; the parse is the fault | us, and it is small |
| `loaded=False` with no file error | the ASSET READ failed — `SPlatformUtils.getAsset` on Windows | us |
| the line is **absent** | the handler never ran; the verb never arrived | us — the shell emit and `onNavigatingGlobal` |

⚠ Report the line **verbatim**. One line decides which of five things this is.

## 4. This batch's other rows, as they look on Windows

| # | Row | Do this | Expect |
|---|---|---|---|
| 4.1 | **iOS-56** (#499) | Account → turn the app lock **OFF** → **Cancel** the confirm screen | ★ The lock switch **snaps back to ON**. Before this batch it stayed OFF while the lock was still on — a control lying about a security setting. And **Save must not appear** for a change you backed out of |
| 4.2 | iOS-56, the other way | Turn the lock off and **complete** the confirm | The switch goes OFF and stays off after a restart |
| 4.3 | **iOS-62** (#492) | Right-click a message | ★ The pressed bubble carries a **blue ring** while the menu is up, and the ring goes when the menu closes — by Escape, by clicking away, and by picking an action. All three |
| 4.4 | **iOS-61** | Open a surface with an empty state (Wallet with no activity, a new chat) | The illustration is **there when the screen is**, not a second later |
| 4.5 | **iOS-59 — MEASUREMENT (#501)** | Dev mode on. Wallet with one or two transactions. Read the `WALLET …` line in the dev strip, then again with many transactions | ★ Send both readings. The fix for this was built and then **reverted** — it assumed the hero sits inside the scroller and it does not — so this batch measures. `range` must exceed 120 or the hero cannot collapse |
| 4.6 | **N83** | Any lock cycle, then read the log | ★ **No** `Unknown localization key; LaunchBootView`. It used to print on every lock presentation |

⚠ **#496, the lock grace window, is on this platform too.** Windows takes the second of
the two grace branches, so it must agree with Android: background the app, come straight
back → **no prompt**; background it, wait 10 seconds, come back → **prompt**. And the row
the audit added (#500): after a long absence, **cancel the password prompt and try to get
in again** — it must still be locked.

## 5. Regression sweep — the desktop grammar

| # | Do this | Expect |
|---|---|---|
| 5.1 | Open contact info and group info | Render, and close cleanly |
| 5.2 | Wallet → Receive, then Send | The takeover opens and returns |
| 5.3 | Apps → open one, then back | The pane restores |
| 5.4 | Account → every sublevel and back | No blank pane, no wrong language after §3 |
| 5.5 | A payment end to end | Sends, appears in activity, sounds once (§2) |

## 6. Do NOT report these

* **Push notifications.** Windows has no OneSignal path; `SPushService.initialize()` is a
  stub. #493/#494/#495 are Android, and iOS is blocked on Apple.
* The **4 known smoke pre-existers** (#136 · #149③ · M5 · B3).
* The `missing encryption keys!` flood — pre-existing, Core-side, and already has a row.

---

## 7. Writing it up

★ **Write the verdict to disk** (#459 ①) as `docs/f5-verdict-2026-08-25-windows.md`,
even if it is "all pass". A verdict referenced by name and never written cost a session
its repro once already.
