# F5 checklist — 2026-08-25, ANDROID. Closed-app notifications · four device rows · the grace window · sounds.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Batch: DECISIONS **#493–#499**. Uncommitted, on top of `9cf78ca9`.
Walk this one FIRST — `docs/f5-checklist-2026-08-25-windows.md` is a separate pass.

---

## 0. Build it

⚠ C# changed heavily (#387: wipe first).

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
```

Then the pipeline:

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
| build-demo-bundle | **275 exports** (was 273) |
| build-shells | **18 shells** |
| smoke-test | **BASELINE OK — 2478 pass / the same 4** (#136 · #149③ · M5 · B3) |
| cs-syntax-check | 140 clean + 1 known gap |

Check the device is attached **before** the run step (#450):

```powershell
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
& $adb devices
```

Then two commands, never one (#320):

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```

---

## 1. ★★ DO THIS FIRST, BEFORE ANYTHING ELSE: the F1/F2 log

This build is the first one on your phone that carries `describeBarSurfaces()`. It shipped
in `71a000c6` — the commit you built at the office **for iOS** — so your Android device has
never had it. That is why the log you sent had no `lock/bar-surfaces` line in it.

1. App lock **on**.
2. Background the app **once**, come back.
3. Dev mode (10 taps on the "Chats" title) → **send log**.

| Search | Expect |
|---|---|
| `lock/bar-surfaces` | **exactly 1 line**, printed while the lock is up |

★ **One line settles F1 and F2.** Two hypotheses have already been wrong; nothing is being
guessed a third time. Send it before walking the rest and the fix lands in the next batch
with the evidence in hand.

---

## 2. ★★ THE BIG ONE — notifications when the app is CLOSED (#493 · #494 · #495)

Your words: *"if I close the app the notifications keep coming and they are not grouped, so
like legacy"*, and the global master failed the same way.

**Why it happened:** the handler that filters and groups notifications was registered inside
`Node.start()`, about **4 seconds** after launch. A push to a killed app is shown by
OneSignal's native code long before that. It now registers in the **Application**, which
Android runs before any component in the process.

★ **Close the app properly for each of these** — swipe it out of the recents list, not just
background it.

| # | Do this | Expect |
|---|---|---|
| 2.1 | Close the app. Have someone send you **four messages in one chat** | ★ **ONE notification row**, not four. It updates as they arrive |
| 2.2 | Open it | The chat opens on the right conversation |
| 2.3 | Close the app. Account → Notifications was left **ON**. Receive a message | A notification, formatted like ours — the Spixi mark, the blue accent |
| 2.4 | ★ Account → Notifications → **master switch OFF**. Close the app. Receive a message | ★ **NOTHING.** This is the half that has never worked while closed |
| 2.5 | Master back ON. Close the app. Receive messages in **two different chats** | **Two rows, one per chat** — not five, and not one merged row |
| 2.6 | Mute a **1:1** chat, close the app, have that person message you | 🟡 **May still notify.** See the note below — report what you see, either way |
| 2.7 | Open the app normally and receive a message with it in the foreground | Unchanged from today: the row you are used to |

⚠ **2.6, stated honestly before you test it.** With the app closed there is no contact list
in memory yet, so a per-chat mute can only be resolved once the node is up. The gate fails
**open** on purpose — a lost message is worse than an unwanted buzz. The **global** master
(2.4) works from the first millisecond because it is a plain preference. If 2.6 buzzes,
that is the known scope, not a new defect.

⚠ **And the group case is still BE**: a group push carries the SENDER'S address, not the
group's, so a muted group can still get through and a group row collapses per sender.
Unchanged this batch, and it needs the push payload to carry the group address.

| # | Also check the log | Expect |
|---|---|---|
| 2.8 | Search `[NOTIFDIAG]` | `OneSignal handlers registered in the Application (#493)` — **early**, near the top of the log |
| 2.9 | Search `Cannot clear notifications` | ★ **GONE.** Your 2026-08-22 log printed it twice on an ordinary launch |
| 2.10 | Search `cold push posted as a Spixi row` | Present when a push arrived to a closed app |

## 3. ★ THE LOCK GRACE WINDOW — your call, now built (#496)

You said the lock felt *"sketchy, sometimes yes sometimes no"*. It measured five seconds
from your last **unlock**; it now measures five seconds from the moment the app went
**away**, which is what every other messenger does.

| # | Do this | Expect |
|---|---|---|
| 3.1 | Unlock. Use the app for a minute. Switch to another app and **straight back** | ★ **No prompt.** This is the case that annoyed you |
| 3.2 | Switch away, **wait 10 seconds**, come back | ★ **The pattern prompt.** The lock still works |
| 3.3 | Unlock, immediately switch away, **wait 10 seconds**, come back | **Prompt.** A fresh unlock no longer buys you a free absence |
| 3.4 | Cold start from the launcher | **Prompt**, as always |
| 3.5 | Log: search `resume/pauseLock-held` | It prints `sinceBackground=` and `withinGrace=` beside the old `sinceUnlock=`, so you can see which clock decided |

| 3.6 | ★★ **THE ONE THE AUDIT ADDED (#500).** Away for **10 minutes**. Come back → the pattern prompt appears → press **Back / Cancel** on it → immediately tap Spixi again | ★★ **The lock must still be there.** Before the audit caught it, this opened the app with no password: the pattern prompt is a separate Android activity, so presenting it paused Spixi and laid a fresh 5-second stamp |
| 3.7 | Same, the blunt version. Away 10 minutes → lock on screen → press **Home** → tap Spixi again within 2 seconds | ★★ **Still locked.** Same bypass, one gesture simpler |

⚠ **This is the security dial.** 3.2, 3.4, **3.6 and 3.7** are the ones that must never
fail. If any does, say so and it reverts in one line — the fallback expression still
contains the old measure.

## 4. The four device rows from the iPhone — all of them show here too

| # | Row | Do this | Expect |
|---|---|---|---|
| 4.1 | **iOS-62** (#492, your call: the cheap tint) | Long-press a message | ★ The pressed bubble carries a **blue ring** and stays visible behind the dim. You can see what you are acting on |
| 4.2 | iOS-62, the exits | Close the menu three ways: pick an action · tap the scrim · Android **back** | The ring goes **every** time. A ring left behind is a bug |
| 4.3 | **iOS-61** | Open Wallet with no activity, and a brand-new chat | The picture is there **with** the screen, not a second later |
| 4.4 | **iOS-59 — MEASUREMENT, not a fix (#501)** | Turn dev mode on (10 taps on "Chats"). Open the Wallet with **one or two transactions**. Read the `WALLET …` line in the strip at the bottom. Then swipe the list up hard and read it again | ★ **Send me the two readings** — `rows= V= S= range= top= hero= cmp=`. `range` is the whole answer: it must exceed **120** or the hero physically cannot collapse |
| 4.5 | iOS-59, the comparison | Same, with **many** transactions | The second `WALLET` reading. Two numbers and this row is solved properly |
| 4.6 | **iOS-56** (#499) | Account → app lock **OFF** → **Cancel** the confirm screen | ★ The switch **snaps back to ON**, and **Save does not appear**. It used to read OFF while the lock was still on |
| 4.7 | iOS-56, complete it | Turn the lock off and enter the password | Switch OFF, and still off after a restart |

⚠ **4.4 was going to be a fix, and it was pulled before it reached you.** It assumed the
big balance hero sits INSIDE the scrolling list, so that collapsing it makes the list
shorter. It does not — they are side by side, so collapsing the hero makes the scroll area
*bigger*, which is the opposite sign. Built on that model it could not have collapsed at
all with one row, and with two it would have juddered — the exact thing you reported. The
audit caught it. So this batch measures instead, and the next one fixes it from your two
numbers (#501).

★ **On the Cancel button itself:** it stays, and here is why. #234 removed the exit from the
**app lock** because there a cancel really did open the app. This screen is different — the
handler reads the result, so a cancel changes nothing and the lock stays on. Removing it
would trap you on a confirm screen with no way back to Settings. **The defect was the switch
lying, not the button.** If you still want it gone, say so — it is one line.

## 5. ★ SOUNDS — audible for the first time (#497)

Four real sounds at the time of writing — ⚠ **since 2026-08-23 (#518) only the TWO message
sounds remain; the transaction pair is removed by design, and the #521 interview replaced
the pair with Damir's own picks: `minimal/queued` + `minimal/warning` at −16 dBFS.** UI
SFX, CC0. Judge the two — too loud, too long, wrong character are all fair, and replacing
them is a drop-in with the same names.

| # | Do this | Expect |
|---|---|---|
| 5.1 | Send a chat message | One short blip — the quietest of the four |
| 5.2 | Receive one | A two-note **rise**, clearly different by shape |
| 5.3 | Send a payment | Two warmer, lower notes |
| 5.4 | Receive a payment | A three-note ascending figure, the longest |
| 5.5 | Account → Notifications → **In-app sounds OFF** → repeat 5.1 | **Silence** |
| 5.6 | Receive a call | The ringtone, **not** an effect. Effects must never fire under a ring |

Provenance, the licence and the replace-in-place contract: `docs/sound-placeholders.md`.
⚠ The four CALL sounds beside them are NOT changed — see N84.

## 6. N83 — one line of log noise, gone

| # | Do this | Expect |
|---|---|---|
| 6.1 | Any lock cycle, then read the log | ★ **No** `Unknown localization key; LaunchBootView`. It printed on **every** lock presentation, cold start and pause |

## 7. Regression sweep — what this batch could have broken

C# touched: `App.xaml.cs` (the lock lifecycle), `Node.cs`, `SettingsPage`, both push
services, `MainApplication`. That is the lifecycle surface, so:

| # | Do this | Expect |
|---|---|---|
| 7.1 | Cold start with the lock on | Prompt, unlock, Chats |
| 7.2 | Background and return ten times in a row | The lock behaves the same every time — no drift, no double prompt |
| 7.3 | A prompt appearing **over an already unlocked app** | ★ Must never happen. This was #472's worst near-miss |
| 7.4 | Foreground notifications, a normal message | Unchanged |
| 7.5 | The scan row after a restart | Still correct (F6 stays closed) |
| 7.6 | Language pick, then walk the app | Everything follows — #498 also lands here |
| 7.7 | A payment end to end | Sends, appears, sounds once |

## 8. Do NOT report

* iOS push — blocked on Apple, and the entitlement work is already on disk (#486).
* The **4 known** smoke pre-existers.
* The `missing encryption keys!` flood — pre-existing, Core-side, has its own row.
* Group mutes on a **closed** app (2.6) — the known BE scope, written above.

---

## 9. Writing it up

★ Write the verdict to disk (#459 ①) as `docs/f5-verdict-2026-08-25.md`, pass or fail.
