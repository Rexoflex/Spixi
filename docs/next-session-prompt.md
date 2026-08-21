# Next session — THE ONE-LINERS, then NOTIFICATIONS + SOUNDS. Lock = LOG ONLY.

Read `docs/f5-verdict-2026-08-21.md` FIRST — it is the device truth for the last batch,
not a plan — then `docs/master-worklist-2026-08-21.md` (★ its §0 CORRECTS three standing
conclusions), then `docs/handoff-2026-08-21.md`, then DECISIONS.md rows #454–#463.

★ **DAMIR CHOSE THIS BATCH, 2026-08-21:** the four one-liners, then the notifications
block — and the sound-effects block rides the same wiring gate for free.
★ **THE LOCK IS LOG-ONLY.** Ship the instrumentation for F1/F2/F3 with this batch so his
NEXT F5 produces the diagnosis. **Do not attempt a fix on any of the three.** F3 has had
two wrong fixes already and the lock surface has only just started working.

The last batch is **BUILT, DEPLOYED TO ANDROID, F5'd AND COMMITTED**. Smoke baseline is
**2280 pass / the 4 known pre-existers** (#136 · #149③ · M5 · B3). Shells 18.

★ **THE PRE-AUTH EXPOSURE IS CLOSED (#454 + #461).** Confirmed on device across every
resume shape. **Do not re-open #442's shield, and do not "improve" the pause lock.**

★ **THIS SESSION IS NO-BE WORK ONLY.** Ixian-Core stays at `097341a`; five smoke pins (the
hold-out gate) fail if an edit sneaks back in. Do not declare the `reply` capability —
with no carrier it renders a Reply action that silently drops the quote.

## SETUP
```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git      # SIBLING folder, REQUIRED
npm install jsdom --no-save
npm install --no-save tree-sitter tree-sitter-c-sharp           # the #459 C# syntax gate
```
Verify before building: smoke green at **2280 / the same 4**, Ixian-Core clean at
`097341a`, `node scripts/cs-syntax-check.mjs` reports 137 clean + 1 known grammar gap.
If not, say so and stop.

## THE WORK, in priority order

### 1 — FOUR one-liners. All ROOT-CAUSED. Type them, do not re-investigate.

**F4 — the Close button on the full-screen tx page does nothing.** My own #453 ④
regression. `src/shells/wallet_sent.html:307-326` LIFTS `.c-txsheet` out of a ghost sheet
and reparents it; the Close button at `src/components/wallet-shell.js:620-626` rides along
and calls `closeSheet(sheet)` on a sheet discarded lines earlier.
★ Damir's steer: **it belongs only in the sheet.** Add an explicit `showClose` option to
`openTxSheet` (default true) and pass `false` from `wallet_sent.html`, beside its existing
`disclose: false`. ⚠ Do NOT key it off `disclose` — different questions, and coupling them
is how the next surface inherits the wrong one.

**F5 — the wallet zero state must have NO glyph.** `src/components/wallet-shell.js:104`,
`glyph: 'wallet'`. Damir: *"THE ICON MUST BE REMOVED, there's no glyph or illustration on
wallet activity empty state."* ⚠ Check `createEmptyState` renders correctly with neither
an illustration nor a glyph before assuming it is free.

**NOTIF-1 — ★ the private-group notification toggle is IGNORED. One line.**
`Spixi/Meta/Node.cs:838-839`:
`if (friend.bot == false || (friend.metaData.botInfo != null && friend.metaData.botInfo.sendNotification))`
`friend.bot` is true **only for bots** (`Ixian-Core Friend.cs:250-253`); a private group is
made by `setGroupMode()` and never sets it — so the first clause short-circuits TRUE for
every private group and the toggle does nothing, while bots take the second clause and are
honored. Exactly the split Damir reported.
⚠ **Before changing it:** `Friend.getUnreadMessageCount()` returns 0 when
`sendNotification` is false (`Ixian-Core Friend.cs:513-520`), so muting a chat currently
also zeroes its badge. Decide whether that is intended — it is a product question, not a
side effect to inherit silently.
⚠ And note the CORE-side hazard, which is NOT ours to fix this session:
`GroupChat.cs:103` re-creates `botInfo` with `sendNotification: true` on every received
`createGroup`, which would clobber a user's mute.

**N80 — the rating nudge waits for the 5th app open.** Damir's dial is a COUNTER, not a
day. Gate lives in `home.html` (`RATING_SNOOZE_KEY` / `RATING_SNOOZE_MS`) +
`HomePage.checkForRating()`; the 7-day snooze and context gates already exist, so this is a
FIRST-SHOW condition and one new persisted value.

### 2 — ★ NOTIFICATIONS + SOUNDS. Damir's block, and they share one wiring job.

**NOTIF-2 — global + per-chat toggles.** The global SCREEN is already BUILT AND DARK:
`createNotificationsScreen` (`src/components/settings-screens.js:551-582`) and its hub row
(`settings-shell.js:793-797`) are gated on `capabilities.globalNotifications`, which the
production shell never sets (`src/shells/settings.html:756`). Flip the capability and wire
the verbs. ★ **The same gate hides an "In-app sounds" switch** (`settings-screens.js:571-575`)
— which is why SND below costs almost nothing extra.
Per-**group** and per-**bot** toggles already exist (`chat-info.js:467-495` →
`ixian:enableNotifications` / `ixian:disableNotifications` →
`SingleChatPage.xaml.cs:318-330`). Per-**1:1** has NO bridge verb yet
(`contact_details.html:365`) — that is the new surface.

**NOTIF-3 — the OS notification tap is slow and shows the chat list first.** It is not a
routing problem, it is a POLLED GLOBAL. `SPushService.cs:131-137` builds a plain
`MainActivity` intent (no deep link); `MainActivity.cs:270-283` sets `App.startingScreen`;
and the **1 Hz** `HomePage.updateScreen()` reads it at `:2493`. Plus a hardcoded
`Task.Delay(500)` at `MainActivity.cs:262`. Push the navigation instead of polling for it.

**NOTIF-4 — five notifications for one chat.** `SetGroup(data)` IS set
(`SPushService.cs:173-176`) but there is **no summary notification, no count, and a unique
id per message** — `Node.cs:847` uses `CRC32(friend_message.id)`. `unreadCount` is already
passed into `showLocalNotification` and never used. Either `MessagingStyle`, or one
updating notification per chat keyed on the friend address.

**SND-1/2/3 — sounds.** Today the app plays exactly FOUR sounds, all call-related, from
`Spixi/Resources/Raw/sounds/`. `SSystemAlert.flash()` is an **empty method** that
`Node.cs:854` calls on every message. Plumbing exists on all three platforms
(`playSoundFromAssets` / `AVAudioPlayer` / NAudio) — what is missing is one generic verb on
`Spixi/Interfaces/IPlatformUtils.cs:20-24` plus the assets. Message sent/received, tx
sent/received, and a desktop-specific off switch.
⚠ Sound assets are a Damir call — do not invent them. Ask, or ship the plumbing with the
switch and land the assets when he picks them.

### 3 — ★ THE LOCK: INSTRUMENTATION ONLY. NO FIX ATTEMPTS.

Damir's explicit call. Ship the log lines with this batch so the NEXT F5 produces the
diagnosis for free. **Do not touch the lock's behaviour** — it has only just started
working and F3 has had two wrong fixes in one day.

* **F3** — log all four gates and the branch: `uiReady` · `pageVisible` · `authAttempted` ·
  `authDeferred`, and whether `App.OnResume` reached `held.onForegroundReturned()` at all.
  ⚠ **Damir authenticates with a PATTERN** — the device-credential fallback
  (`AllowAlternativeAuthentication = true`), not a fingerprint. Cold start DOES prompt, so
  the plugin and the enrolment are fine; it is the RESUME path alone.
* **F1** — the white flash. Log or probe which surface paints first. Candidates: the Android
  window background (`MainTheme`), the modal push transition, lock.html's instant-bg (#203).
* **F2** — the splash-blue status bar. Log whether `repaintSystemBarsFor` runs for the
  PAUSE-presented lock. Probably the same root as F1.

DevPage renders the log; dev mode is 10 taps on the "Chats" title. The #304/#401 precedent
is an on-screen probe.

### 4 — Rows that need a DEVICE LOG before any code (#294)
Ship the measurement rather than a fix. The #304/#401 precedent is an on-screen probe;
DevPage renders the log and dev mode is 10 taps on the "Chats" title.

* **F6** the scan row appears and disappears at random. Log the pushed
  `current`/`target`/`origin` triple over ~60 s. Suspects both in
  `src/components/scan-progress.js:164-224`: the SHOW_LAG 20 / HIDE_LAG 2 hysteresis, and
  the indeterminate (`target == 0`, no peers) frame un-hiding the row — the #446 MAJOR
  shape, turned on itself.
* **F7** "Show amounts" absent on Android. `wallet_sent.html:258` needs
  `hideKnown && walletHidden`; `WalletSentPage.xaml.cs:97` pushes `setHideBalance`. Log
  which flag is false. Adjacent to the known pre-exister B3.
* **F1** ★ a WHITE FLASH before the lock — launch, every background, always before the
  pattern screen. **Not app content**; the exposure is closed. Candidates in order: the
  Android window background (`MainTheme`) is light and shows between the modal push and
  the lock's first paint · the modal transition paints the window ground · `lock.html`'s
  instant-bg (#203) is not reaching the first frame on this path.
* **F2** the lock's status bar renders splash-blue. `repaintSystemBarsFor` is called on
  the LockPage F-4 paths and in `dismissPauseLock` but apparently not for the
  PAUSE-presented lock. Likely one missing call, and probably the same root as F1.

### 5 — NEXT batch, not this one: ★ N67 / F8, ONE ACCOUNT, wipe means wipe.
Verbatim: *"just make it an account, and if you wipe it it wipes the app clean of any
account/wallet file, you start clean unless you restore."* Creating a new account after
deleting the wallet said *"there's an existing account on this device"* and the new
account then INHERITED the old one.
⚠ Destructive-path work. Reproduce and NAME the delete→restore error first (#215/#294),
write a security-gate row, and do not strand a live wallet behind onboarding (the
W14/#348 guard). Related: #284 · #264 · the `deleteh`/`deleted`/`deletea`/`delete` verb
family in `SettingsPage`.

**F9** rides with it: a fresh account showed the OLD balance until an app restart, so it
is an echo — a live `setBalance` push surviving the swap, or `IxianHandler.balances` not
being cleared. Separable from N69(a), which is Core-side and now confirmed a third time.

### 6 — After that, in Damir's stated order
**Calls** (CALL-1 full-screen incoming with accept/decline · CALL-2 the bar taking layout
space instead of overlaying · CALL-3 speaker · CALL-4 bubble states) — ⚠ the Android in-call
strip has NEVER been exercised on hardware; it needs a real two-device call before any of
it is judged. Then **group photo** (GRP-2, ours — see the worklist §0 correction) and
**add-members** (GRP-3, triage + BE sign-off). The **Send flow** (WAL-1) stays LAST: it is
the money path.

### 7 — The standing no-BE rows
**N80** (rating nudge = open counter, dialled) · **N79** (three blank SL ids on Send IXI —
Damir's call was to let the redesign retire them) · **N64** (the update-notice round) ·
**N70**.

### 8 — Reference: why the lock is log-only (do not act on this, it is context)
**F3 — no biometric/pattern prompt on resume. TWO failed fixes in one day.**
* #454's audit fix guarded on `App.isInForeground` — a no-op, because that flag is cleared
  in `OnSleep`, which MAUI raises from Android's **OnStop**, one step after the `OnPause`
  that creates the pause lock.
* #460 replaced it with an explicit latch (`deferAuthentication` / `onForegroundReturned`).
  Still fails.

Cold start DOES prompt, so the plugin and the enrolment are fine — it is the RESUME path
alone. **Instrument before touching it.** Log all four gates and the branch:
`uiReady` · `pageVisible` · `authAttempted` · `authDeferred`, and whether `App.OnResume`
reached `held.onForegroundReturned()` at all.
⚠ **New fact that belongs in the diagnosis:** Damir's device authenticates with a
**PATTERN** — the device-credential fallback (`AllowAlternativeAuthentication = true`) —
not a fingerprint. Whether androidx treats that path differently after a pause is an open
question and a candidate cause.

## DO-NOTs
1. Do not touch Ixian-Core. The hold-out gate enforces it.
2. Do not declare the `reply` capability.
3. Do not re-open #442's shield, or the R3 art (#433), or N31, or N61.
4. Do not build group rename / photo / add-members — verified NOT in Ixian-Core. BE.
5. Do not fix the lock by reverting to a plain modal push on the RESUME path (#423).
6. ★ Do not take a third guess at F3, F1 or F2. **This session is LOG-ONLY on the lock** —
   Damir's explicit call. The surface has only just started working.
7. Do not invent sound assets. They are Damir's pick — ship the plumbing and the switch.
8. Do not silently inherit the mute-zeroes-the-badge behaviour when fixing NOTIF-1
   (`Friend.getUnreadMessageCount()` returns 0 when `sendNotification` is false). It is a
   product question — raise it.

## STANDING RULES THIS PROJECT KEEPS RE-EARNING
* ★ **A pin that passes vacuously is worse than none.** Match on the CALL, strip comments
  for negative tests, slice to the FUNCTION not to a byte budget. And check the artifact
  that actually carries the code — `lock.html` does NOT inline the bundle, so a pin that
  read it for a bundle symbol was red with the code present and correct.
* ★ **MUTATE BEFORE BELIEVING.** Last batch: one batched revert run put 57 pins red and
  left the 4 known pre-existers alone. Three of the new pins were wrong on the first pass
  and only mutation found them.
* ★ **A LIFECYCLE FLAG THAT TURNS OVER AT THE WRONG EDGE IS WORSE THAN NONE** (#460). MAUI
  raises `Application.OnSleep` from Android's **OnStop**. That single fact cost TWO
  defects in one batch — #442's invisible cover and #454's dead biometric guard.
* ★ **A DIAL OFFERED WITH THE WRONG COST ATTACHED GETS THE WRONG ANSWER** (#461). "Blank
  the recents thumbnail" was presented as separate from the resume flash. They were the
  same picture, and the wrong framing cost a whole round.
* ★ **THE CHEAP DISCRIMINATOR FIRST.** Both breakthroughs last batch came from a ten-second
  question: what does the task-switcher thumbnail show, and did content appear or only a
  flash.
* ★ **A TEST SHEET IN THE WRONG SHELL IS WORSE THAN NO SHEET.** Damir runs PowerShell.
  `rmdir /s /q` is CMD and silently does nothing. A quoted path at the START of a line
  needs the call operator `&`; parentheses INSIDE a double-quoted string are safe.
  ⚠ And **give a discriminator you have actually counted** — an expected `Count : 3` that
  is really 1 wastes his time and teaches him to distrust the sheet.
* ★ **A REPAIR REGRESSES A PASSED ROUND MORE OFTEN THAN IT FAILS ON ITS OWN** (#423). F4 is
  a regression inside #453's own fix. Run the break-my-verdict pass over REPAIRS.
* ★ Source-reading gates cannot see a throw, a cascade or arithmetic.
* Verify at source · never build past a missing repro (#294) · bundle BEFORE shells ·
  DECISIONS rows at decision time · smoke as bookends · `git --no-optional-locks` always ·
  **#387 wipe `obj`/`bin` on any C# change**.
* ★ **WRITE THE VERDICT TO DISK.** A verdict referenced by name and never written cost a
  session its repro (#459 ①).

## DELIVERY — how Damir works
* Windows, PowerShell, at his machine, with an Android device on adb.
* Land everything on his disk and leave it UNCOMMITTED, with a full green pipeline:
  extract-strings → build-locales → build-strings-iife → build-demo-bundle → build-shells
  → i18n-lint → pseudo-locale-smoke → smoke.
* Give him ONE step at a time and WAIT. Never stack a command and a prerequisite.
* Expectations in a table OUTSIDE the pasted block, and tell him what NUMBER to expect.
* `adb` is NOT on his PATH. It is at
  `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe` — assign it to
  `$adb` and call it as `& $adb devices`.
* ⚠ Check the device is on adb BEFORE the run step (#450).
* Deploy — Android: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`, then
  `-t:Run` as a SECOND command (a wipe makes `-t:Run` fail alone, #320).

## STILL UNVERIFIED
iOS and Windows, for seven batches. The pause lock is **Android only** — iOS, MacCatalyst
and Windows keep the resume path with the #438 defect intact, deliberately. The Android
in-call strip has never been exercised — it needs a real two-device call.
