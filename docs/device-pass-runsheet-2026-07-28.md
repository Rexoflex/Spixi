# Device-pass run sheet — verify-gated rows (2026-07-28)

Execution order for the #215-gated checks from `docs/opus-review-273-281.md` + plate items 3–4.
Rule: these are **verify-first** — do NOT build fixes around any of them until the observation
below confirms the mechanism. Log outcomes as `ios-sim-findings.md` rows (next free = iOS-33).

**Hardware matrix:** B1/B2 need a REAL device + real OneSignal push (remote push does not deliver
to the simulator). C-9 + iOS-31 run on the sim. iOS-29 = device (sim keyboard metrics lie).
B3 is a build, no hardware.

---

## B3 — static-registrar build gate (run FIRST, it's free)

**Why:** #281's hand-written `[Export]` selectors (`SPushService.cs:104,113`) carry an
`Action<UNNotificationPresentationOptions>` block param with no `[BlockProxy]` — the classic
static-registrar (device/Release) failure. #281 is only verified under the dynamic registrar
(sim Debug).

**Steps:** `dotnet build -c Release -p:RuntimeIdentifier=ios-arm64` (net10.0-ios).

**Verdict:**
- Builds clean → gate half-passed; still boot it once on device before any ship (registrar
  failures can surface at startup registration, not compile).
- Registrar/marshal error naming `OneSignalWillPresentNotification` or the block param →
  CONFIRMED: add `[BlockProxy]`/`ObjCRuntime` block typing or go dynamic-registration (see B1 fix
  path) — same change fixes both.

## B1 — OneSignal delegate starvation (foreground REMOTE push)

**Why:** OneSignal's swizzle does `class_addMethod(prefixedSel)` → exchange. `class_addMethod`
FAILS if the class already defines the selector — which #281's `[Export]`s
(`SPushService.cs:104,113`) now guarantee — so the exchange plausibly swaps our two managed impls
and OneSignal's own handler installs nowhere. Crash is verifiably gone; whether
`handleNotificationReceived` still runs is NOT verified.

**Steps (device, Debug, debugger attached):**
1. Breakpoints (or temp `Logging.info`) at:
   - `SPushService.cs:315` `handleNotificationReceived` (wired via `WillDisplay +=` at :138)
   - `SPushService.cs:321` `OfflinePushMessages.fetchPushMessages(true, true)`
   - `SPushService.cs:57` `WillPresentNotification` + `:105` `OneSignalWillPresentNotification`
2. App FOREGROUND, chat list visible. Send a real push from a second account/device.
3. Note which of the four fire, and in what order.

**Verdict:**
- `handleNotificationReceived` + `fetchPushMessages` fire → B1 CLEAR, close the row.
- Only the exported/override pair fires (or nothing) → CONFIRMED starvation: replace the
  `[Export]`s with **dynamic post-init registration** of the prefixed selectors
  (`class_addMethod` ourselves AFTER OneSignal init) — the review's prescribed fix. Do not ship
  #281 as-is.
- While here: does the foreground banner/List presentation still appear? (`WillPresentNotification`
  returns `.List` — `SPushService.cs:65`-ish options path.)

## B2 — double tap-handling (remote-push tap)

**Why:** Two live owners for a push tap: revived delegate route
`DidReceiveNotificationResponse` (`SPushService.cs:25`) → `App.startingScreen` +
`HomePage.updateScreen()` (:41-43) **vs** OneSignal `Clicked` → `handleNotificationOpened`
(`SPushService.cs:333`) → `App.startingScreen` + `popToRootAsync()` (:345-346). Divergent
navigation if both fire.

**Steps (device, Debug):**
1. Breakpoints at `SPushService.cs:41` (`updateScreen` path) and `:346` (`popToRootAsync` path).
2. App BACKGROUND → send push with an `fa` payload → tap the notification.
3. Repeat once with the app killed (cold start).

**Verdict:**
- Both fire → CONFIRMED: pick ONE owner — idempotency latch or drop the `Clicked` handler
  (review suggests either; decide + log a DECISIONS row).
- One fires → note WHICH (that's the surviving owner; still decide deliberately, don't rely on
  swizzle luck).

## C-9 — `file://` localStorage persistence probe (sim, ~60 s)

**Why:** the whole `spixi.*` family rides unvalidated `file://` WKWebView localStorage
(per-WebView-ephemeral is a documented platform behavior class). One probe clears or indicts
**14 shipped keys**: `spixi.settings.view` (#274 stash) · `spixi.appearance` ·
`spixi.chat.pattern` · `spixi.chat.textscale` · `spixi.draft.*` · `spixi.pins` · `spixi.exdel.*`
· `spixi.mentions.seen.*` · `spixi.backup.last` (written by settings_backup.html, READ by
settings.html — cross-WebView by design) · `spixi.likes.*` · `spixi.app.declined.*` ·
`spixi.media.autoload` · `spixi.media.loaded.*` · `spixi.landtab`.

**Steps (sim + Safari Web Inspector):**
1. Inspector → settings.html WebView console:
   `localStorage.setItem('spixi.probe','A'); localStorage.length`
2. Same-WebView reload (navigate away within the pane and back):
   `localStorage.getItem('spixi.probe')` → expect `'A'`.
3. Cross-WebView: attach to home.html (or chat.html) console:
   `localStorage.getItem('spixi.probe')` + `localStorage.getItem('spixi.appearance')`.
4. Kill the app (swipe), relaunch, re-attach to settings.html:
   `localStorage.getItem('spixi.probe')`.

**Verdict matrix:**
| survives reload | visible cross-WebView | survives relaunch | verdict |
|---|---|---|---|
| ✓ | ✓ | ✓ | C-9 CLEAR — log the passing row, done |
| ✓ | ✗ | any | cross-WebView mechanisms broken: backup stamp + any settings↔chat sharing → needs a C#-brokered store |
| any | any | ✗ | ALL 14 mechanisms are session-ephemeral → escalate: bridge-backed persistence proposal (§8), not a shell patch |

Log the result as an `ios-sim-findings.md` row either way (the review asks for it explicitly).

## iOS-31 — unread badge never clears (both legs; sim OK)

**Leg A — loadMessages pushes a recount, not zero.** `SingleChatPage.xaml.cs:1260-1271`: after
`metaData.unreadMessageCount = 0` it pushes
`UIHelpers.setContactStatus(…, friend.getUnreadMessageCount(), "", 0)`. `getUnreadMessageCount()`
(core-side, not in tree) recounts message flags — a `requestAdd` is never markable-read, so for a
chat whose unread includes the accepted-request row the recount is ≠ 0 and the "zeroed" push
re-asserts a stale count. Candidate fix: push literal `0` (the metaData zeroing IS the truth here).

**Leg B — HomePage cache drops/loses the update anyway.** `HomePage.xaml.cs:2446`:
`contactStatusCacheItem cacheItem = contactStatusCache[i]` — `contactStatusCacheItem` is a
**struct** (:102), so :2451-2456 mutate a COPY; the list entry never updates → `updateContactStatus`
(:2484) pushes the ORIGINAL cached values. And the update predicate `timestamp > cacheItem.timestamp`
(:2450) drops any `ts=0` push (exactly what Leg A sends) whenever an entry already exists.

**Steps (sim, Debug):**
1. Account with a pending incoming request (or have a second account send one) + ≥1 unread chat.
2. Chats list visible → note badges. Open the request chat → back to list.
3. Watch: badge on that row + tab badge. Expected bug: stays stale until a structural flush.
4. Breakpoint at `HomePage.xaml.cs:2450`: confirm the `ts=0` push arrives and is dropped, and/or
   step :2452 and observe `contactStatusCache[i]` unchanged after the mutation.

**Verdict:** observation matches → fix all three sites in one batch (literal 0 in
SingleChatPage:1270 · write-back `contactStatusCache[i] = cacheItem` · decide ts=0 semantics —
e.g. treat 0 as "display-only, always apply unread"). Doesn't match → back to live inspection
before any code.

## iOS-29 — keyboard viewport (device + Web Inspector)

**Why:** the #283 fix (`src/shells/chat.html:3017-3044` `keyboardViewport()`) keys off
`delta = window.innerHeight - vv.height > 60` (:3024-3025) — premised on `innerHeight` tracking
the LAYOUT viewport (constant) while `vv.height` shrinks. If on-device WKWebView `innerHeight`
TRACKS `vv.height`, delta stays ~0 and the fix never engages (or engages late via the pan path).

**Steps (device, Web Inspector on chat.html):**
1. Console: `[window.innerHeight, visualViewport.height, visualViewport.offsetTop]` before focus.
2. Focus the composer, keyboard up → re-run. Also watch a
   `visualViewport.addEventListener('resize', …)` log of the same triple.
3. Note whether `innerHeight` stayed constant (sim behavior) or followed `vv.height`.

**Verdict:**
- `innerHeight` constant, delta > 60 → current fix engages; iOS-29 is something else — capture
  what actually misbehaves (composer hidden? pan? late layout) with the triple logged.
- `innerHeight` tracks `vv.height` → CONFIRMED premise failure: switch to **baseline delta
  against boot-captured layout height** (capture `innerHeight` at boot pre-keyboard, compare
  `vv.height` to THAT), or pin `body.height = vv.height` while composer focused, gated on
  `vv.offsetTop` — the handoff's two candidate designs. Pick after the numbers are in hand.

---

## Row-logging reminders
- Every outcome above → `docs/ios-sim-findings.md` row (incl. passes — B1/C-9 are explicit asks).
- B2's owner decision + iOS-31's ts=0 semantics → DECISIONS rows.
- A2 (FriendState enum + non-destructive resend) stays a BE ask — nothing to run here.
