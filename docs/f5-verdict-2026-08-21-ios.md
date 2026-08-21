# F5 VERDICT — 2026-08-21, iOS device pass. iPhone 15, build `71a000c6`.

**71 pass · 0 fail · 3 n/a · 1 untested** of 75. Damir on hardware, Mac office session.
First iOS DEVICE build of the redesign ever — every prior iOS run was the Simulator.
First iOS run of any kind in **eight batches** (#325 → #484).

★ Headline: **nothing regressed.** Two batches touched all four platforms' `SPlatformUtils`
and `SPushService`, the triangle pattern and saturated dark are pure CSS, and none of it
broke iOS. The keyboard family (iOS-6/29/53, three failed fixes before #324) also held.

---

## 1. Build and signing, for the record

| | |
|---|---|
| Target | `net10.0-ios`, `-p:RuntimeIdentifier=ios-arm64`, Debug (interpreter) |
| Signing | `Apple Development: Damir Rekic`, team `3D663HCNTU` |
| Profile | `iOS Team Provisioning Profile: *` — WILDCARD, expires Jul 2027 |
| Deploy | `xcrun devicectl device install app` / `process launch` |

⚠ Debug iOS with no explicit RID silently builds a SIMULATOR app (`Spixi.csproj:52`).
The RID is not optional on the device path.
⚠ Wipe `Spixi/obj` + `Spixi/bin` when moving between simulator and device: the RocksDB
xcframework slice differs (`ios-arm64` vs `ios-arm64_x86_64-simulator`).

## 2. Closed on iOS hardware this pass

Boot + RocksDB device slice · edge-to-edge and safe areas · saturated dark AND the
light-mode guarantee · the triangle pattern and Chat appearance · the whole keyboard and
composer family · mute UX and the badge · the notifications SCREEN · the local
notification path · silence-without-crash on the missing sound assets · the app lock
including the app-switcher card · F4 (tx Close) · F5 (wallet zero state, no glyph) ·
F6 (the scan row) · scan and camera (#304 + #309, both device-verified at last) ·
Account park-and-re-present (#315) · the typeface and connecting copy (#314) · calls.

## 3. ★ PUSH NOTIFICATIONS — four blocking layers, analysed 2026-08-21

Push was NOT tested this pass and could not be. The analysis below is from source.

### A. No push entitlement — blocks the device token
The wildcard profile carries no `aps-environment`. There is no app-level entitlements
file: `Spixi-PushService/Entitlements.plist` exists but is an EMPTY dict, and
`Spixi.csproj` never sets `CodesignEntitlements`. Without it the app gets no APNs token,
so OneSignal has no subscription to address. **Small fix.**

### B. Push initializes ~4 s in, and only after a wallet exists
`Node.cs:213` calls `SPushService.initialize()` from inside `Node.start()`. On iOS that
call also contains `OneSignal.Initialize()` AND the permission prompt, and the next line
(`setTag`) reads `getWalletStorage().getPrimaryAddress()`.
* The OS permission dialog fires ~4 s into launch, not at a chosen moment.
* On a FRESH INSTALL, before wallet creation, push is never initialized at all.
* `AppDelegate.cs:19-34` — the app's own `RequestAuthorization` is COMMENTED OUT, so
  OneSignal's prompt inside `Node.start()` is the only one that exists.

★ **Damir reports he has never seen an iOS notification permission prompt.**

### B2. ★ The init latch — BOTH PLATFORMS
`isInitializing = true` is set at the top of `initialize()` and **never reset**.
`isInitialized = true` is set only inside the SUCCESS branch of the `ContinueWith`.
So a single fault or cancellation permanently disables push init for the process, and
every later call returns at the guard.
`Platforms/Android/SPushService.cs:52` + `:67` · `Platforms/iOS/SPushService.cs:65` + `:94`.

### C. ★ The Notification Service Extension is WRITTEN and SWITCHED OFF
`Spixi.csproj:293-299` — the `ProjectReference` to `Spixi-PushService` is commented out.
The extension itself is complete (OneSignal's standard template, correct
`NSExtensionPointIdentifier`, its own bundle ID `com.ixilabs.spixi.Spixi-PushService`).
It has never been part of an iOS build. Added by `5de6c7d8`, never enabled.

★ **THIS IS WHY #483's FIX DOES NOT PORT TO iOS.**

| | Android | iOS |
|---|---|---|
| Push to a KILLED app | FCM wakes the process; managed code can run | **No managed code runs at all** |
| The only hook | register the handler in the **Application** (#483) | the **NSE**, a separate process |
| So the fix is | app-startup ordering surgery | enable the extension, gate inside it |

Consequence: the mute, the global master and NOTIF-4's collapsing are bypassed for a
closed iOS app for a DIFFERENT reason than Android. It also explains ungrouped rows —
`showLocalNotification` sets `ThreadIdentifier = data`, so LOCAL notifications group, but
a raw push displayed by iOS carries no thread id.
⚠ Design step hiding here: the NSE is a separate PROCESS and cannot read the app's
in-memory prefs. The mute state must move to an **App Group** shared container. That is a
third entitlement and a real decision, not a flag flip.

### D. `clearRemoteNotifications` is DEAD CODE on iOS
`Platforms/iOS/SPushService.cs:117` — `return;` is the FIRST statement of the method; the
entire body below is unreachable. Android has no such return, and there is no comment or
DECISIONS row explaining it. Clearing remote notifications does nothing on iOS today.
⚠ Flagged, not fixed. A thing that passes vacuously is worse than one that fails.

### E. * THE BUNDLE ID CHANGED - and APNs keys the topic on it
**Found 2026-08-21. This sits UPSTREAM of layers A-D and may be the whole answer.**

```
10e621f7  2024-07-12  firestorm40  "updated app id and version"
  - <ApplicationId>io.ixian.spixi</ApplicationId>
  + <ApplicationId>com.ixilabs.spixi</ApplicationId>
```

* Damir: **push notifications WORK on legacy Spixi.** Legacy is `io.ixian.spixi`.
The redesign is `com.ixilabs.spixi`. Both App IDs exist in team `3D663HCNTU`.

On APNs the **bundle ID IS the `apns-topic`**. If the OneSignal app
(`af20710d-7d68-4038-94a4-2896f3029263`) still has its iOS platform configured against
`io.ixian.spixi`, Apple rejects every push aimed at this build - however correctly it is
signed and entitled. **Android was unaffected because FCM does not use the iOS bundle ID.**

| Credential in OneSignal | Consequence |
|---|---|
| **Auth Key (.p8)** | Team-wide. OneSignal stores the bundle ID as the topic - a field edit |
| **Certificate (.p12)** | Bound to `io.ixian.spixi` outright. A NEW certificate is required |

WARNING: check the OneSignal dashboard BEFORE buying any signing work. Two minutes, and it
can make layers A-D moot or confirm they are still needed on top.

### Instrument note - the device console does NOT show our log
`xcrun devicectl device console` did not attach (returned to the prompt at once), and it
would not have helped: Ixian `Logging.*` writes to the APP log, not os_log. **Use dev mode
-> send log** (#321, device-verified this pass as row 12.7). That is the correct instrument
for every `Logging.info` line in this analysis.

### The order of work
0. * **Check OneSignal's iOS bundle ID first** (layer E). Cheapest, and upstream of all.
1. **Diagnose second** — one log line separates "initialize never ran" from "it faulted and
   latched" from "it ran". Do not buy signing work before the repro (#294).
2. Layer A — App ID with Push, a real profile, an entitlements file, one csproj property.
3. Layer B2 — the latch. Small and it is a real bug on both platforms.
4. Layers B + C — their OWN batch with their OWN audit. Lifecycle ordering is the class
   that produced #442, #454 and #460, and C adds a second process and a shared container.

## 4. ★ NEW findings from this pass — Damir's notes

| # | Row | What | Shape |
|---|---|---|---|
| iOS-56 | 9.1 | ★ The "confirm it's you" screen shown when turning the LOCK OFF still has a **Cancel** button, although Cancel was removed from the general lock screen password prompt | **[SEC-adjacent]** The #234 resume-lock Cancel family. One surface was swept, this one was not. Find the second presentation site |
| iOS-57 | 9.1 | ★ **The keyboard cannot be dismissed anywhere.** Worst in Wallet → Request → amount: the contact list below is unreachable, so the flow is unusable | **[PLAT]** The #324 KVO contentOffset pin holds the WebView while the keyboard is up — chat-only by guard. Check whether a tap-outside / scroll-to-dismiss was ever wired on NON-chat surfaces. ⚠ #294 LESSON IS LAW: measure with Web Inspector before proposing a lever |
| iOS-58 | 10.2 | Swiping left from a subscreen should act as **back**, everywhere on iOS | **[PLAT/PROD]** The iOS interactive-pop gesture. Today the redesign's subscreens are WebView surfaces, so the native gesture does not exist. Needs a decision: native pop where a page is pushed, or an FE edge-swipe |
| iOS-59 | 10.9 | The wallet activity list must always be allowed to **minimize the hero**. With few transactions a hard swipe juggles the whole screen and snaps back, hiding the one row under the fold | **[XPLAT]** The collapse is gated on having enough scroll content. Allow the collapse regardless of row count |
| iOS-60 | 11.2 | **Scan from the WALLET should start a payment flow**, not add a contact | **[PROD]** One scanner, two intents. The entry point must carry the intent through |
| iOS-61 | 14.1 | The empty-state illustration and text are **not preloaded** — they pop in about a second late | **[XPLAT]** Believed logged before. Preload or reserve the box so there is no late paint |
| iOS-62 | 14.4 | Long-press should **highlight or auto-select** the pressed message so it stays visible behind the scrim — you cannot see what you are acting on | **[PROD — DECIDED 2026-08-21, Damir: the cheap TINT. Highlight IN PLACE, no selection mode. Auto-select would re-open the WKWebView selection gesture #290 suppressed]** iMessage lifts the bubble above the blur; WhatsApp tints it. A highlight is the cheap half and answers the complaint |

## 5. Not answered this pass

| | |
|---|---|
| 1.2 | Console could not be attached before launch, and nothing appeared after |
| 7.7 | OneSignal registration line — needs the console recipe, see §3 order of work |
| 8.2 | `playEffect` skip line — deferred |
| 2.4 | Backup intro illustration vs Account → Backup — untested |
| iOS-32 | Heat. A Debug INTERPRETER build cannot answer it. Release/AOT, unplugged, beside legacy Spixi |
