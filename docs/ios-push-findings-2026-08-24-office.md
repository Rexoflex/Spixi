# iOS PUSH — the corrected diagnosis. Office Mac, 2026-08-24, build `3d6703a7`.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

★ This doc CORRECTS `docs/f5-verdict-2026-08-21-ios.md` §3 and the iOS sections of
`docs/handoff-2026-08-24.md`. Two of the five "layers" recorded there are WRONG.
Read this before any more push work on either platform.

Device: iPhone 15 (`iPhone15,4`), UDID `00008120-001C02E00E39A01E`,
CoreDevice `F992BFF8-BB7E-5F68-8E25-496307854F6D`.

---

## 1. ★★ The finding, in one paragraph

**The redesign has never received a single REMOTE push on iOS. Every notification
Damir has ever seen on the redesign is a LOCAL notification, posted by the app's own
process while it is still alive.** That is why they group correctly and why they stop
the moment the phone is locked. Legacy Spixi is the exact inverse: it receives real
remote pushes, so it survives lock and kill, and it does NOT group because a raw APNs
push carries no thread identifier. Each app has exactly one of the two halves.

## 2. The evidence. Device-observed, not reasoned.

| Situation | Redesign (this build) | Legacy Spixi |
|---|---|---|
| App open, then backgrounded | notification arrives, **banner, grouped** | arrives |
| Phone **locked** | ★ **nothing** | arrives |
| App **killed** | ★ **nothing** | arrives |
| Grouping / stacking | ★ **groups correctly** | ★ **does NOT group** |

Signed-binary proof, from the build installed on the phone this session:

```
codesign -d --entitlements - Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app
  application-identifier      3D663HCNTU.com.ixilabs.spixi
  com.apple.developer.team-identifier  3D663HCNTU
  get-task-allow              true
  keychain-access-groups      3D663HCNTU.com.ixilabs.spixi
```

★ **No `aps-environment`.** Without it iOS never issues an APNs device token, so
OneSignal has no subscription to address. No remote push can arrive, by construction.

Code proof of the local path:

| File | What |
|---|---|
| `Spixi/Meta/Node.cs:1039` | calls `SPushService.showLocalNotification(...)` when a message arrives on the app's OWN Ixian socket |
| `Spixi/Platforms/iOS/SPushService.cs:335` | sets `ThreadIdentifier = data` (the wallet address) — **this is why the redesign groups** |
| `Spixi/VoIP/VoIPManager.cs:234` | the same local path for calls |

Lock the phone → iOS suspends the process → the Ixian socket drops → the local path
is gone, and there is no remote path to fall back to. Kill the app → same, sooner.

## 3. ★ What the earlier notes got WRONG. Do not repeat these.

| Claim | Status | Why |
|---|---|---|
| **Layer E — "the bundle ID changed, OneSignal may still target `io.ixian.spixi`"** (`f5-verdict-2026-08-21-ios.md` §3E) | ★ **DEAD. Withdraw it.** | `<ApplicationId>` is `com.ixilabs.spixi` on EVERY branch — `origin/master`, `upstream/master`, `upstream/development`, `redesign/frontend`. `oneSignalAppId` is `af20710d-7d68-4038-94a4-2896f3029263` on every branch too. Legacy and the redesign share BOTH. Legacy push works. Therefore the OneSignal APNs credential is correct for `com.ixilabs.spixi` and Apple accepts the topic. The `10e621f7` rename is real but is from **July 2024** and every branch moved together |
| **"Damir has never seen an iOS notification permission prompt"** so permission may be the blocker | ★ **WRONG** | Local notifications DISPLAY. That is impossible without granted permission. Permission is granted. Layer B is not the blocker |
| "Push is not tested and cannot be" | superseded | It can now. The membership is renewed |

⚠ The lead dev was right to push back on the OneSignal theory. The correct reading of
"legacy works" is: **the server and the credential are fine; this build was never able
to ask for a token.**

## 4. Apple state as of this session

| | |
|---|---|
| Membership | ★ **RENEWED and live.** The team profile reissued, expires **Jul 27 2027** (it read `2026/08/11` last session — the lapse) |
| Certificate | `Apple Development: Damir Rekic`, SHA-1 `94F81C1C446F85349DBEF3CC3F02CA8BB10EA8DB`, `OU=3D663HCNTU`, `O=IXI Labs d.o.o.` ✔ right team |
| Profiles on the Mac | ★ **ONE, and it is the wildcard** — `3D663HCNTU.*`, `aps=NONE` |
| Profile store | ★ `~/Library/Developer/Xcode/UserData/Provisioning Profiles` — **Xcode 16+ moved it.** `~/Library/MobileDevice/Provisioning Profiles` is now EMPTY. Old runbooks that look there find nothing |

⚠ **A wildcard profile can NEVER carry `aps-environment`.** Apple excludes it: a push
entitlement must bind to one app id. This is not a bug to work around.

## 5. ★ FIX PART 1 — the token. Small, and it is the whole of today's job.

Apple portal → Certificates, Identifiers & Profiles:

1. **Identifiers → `com.ixilabs.spixi` → tick Push Notifications → Save.**
2. **Profiles → + → iOS App Development** → App ID `com.ixilabs.spixi` (NOT the
   wildcard) → certificate above → tick the iPhone 15 → name
   **`VS: com.ixilabs.spixi Development`** → Generate → Download → double-click.

⚠ Order is load-bearing. A profile generated BEFORE the Push tick returns `aps=none`
and looks identical to a good one until codesign refuses it.

3. Verify locally — the line must read `aps=development`:

```bash
DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
for p in "$DIR"/*.mobileprovision; do
  security cms -D -i "$p" -o /tmp/pp.plist 2>/dev/null
  printf '%-32s | aps=%-12s | exp=%s\n' \
    "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' /tmp/pp.plist 2>/dev/null)" \
    "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:aps-environment' /tmp/pp.plist 2>/dev/null || echo NONE)" \
    "$(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' /tmp/pp.plist 2>/dev/null)"
done
```

4. Rebuild WITH the entitlement — that is, WITHOUT the suppression used today:

```bash
rm -rf Spixi/obj Spixi/bin
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug \
  -p:RuntimeIdentifier=ios-arm64 \
  -p:CodesignProvision="VS: com.ixilabs.spixi Development"
```

5. Install, launch, create/restore a wallet, wait ~4 s, then dev mode → send log →
   search `[APNSDIAG]`.

| `[APNSDIAG]` line | Meaning |
|---|---|
| `token=<N> chars` **and** a `subId` | ★ registration works. Test locked and killed |
| `token=(NONE - not registered with APNs)` | the entitlement did not take — re-read the codesign dump |
| no line at all | `initialize()` never ran; `Node.cs:213` was not reached |

**Expected result after Part 1:** notifications survive **lock** and **kill**. They will
NOT group and will NOT respect mute. That is Part 2, and it is correct behaviour for a
raw push, not a regression.

## 6. ★ FIX PART 2 — the NotificationServiceExtension. Where the "second bundle" lives.

★ **The extension project already EXISTS in this repo. Nothing is written from scratch.**

| File | State |
|---|---|
| `Spixi-PushService/Spixi-PushService.csproj` | complete. `OutputType Library`, `IsAppExtension True`, `SupportedOSPlatformVersion 15.0` |
| `Spixi-PushService/NotificationService.cs` | complete. OneSignal's standard template, both static methods |
| `Spixi-PushService/Info.plist` | complete. `NSExtensionPointIdentifier = com.apple.usernotifications.service`, principal class `NotificationService` |
| `Spixi-PushService/Entitlements.plist` | ⚠ an EMPTY dict |
| `Spixi/Spixi.csproj:302-307` | ⚠ the `<ProjectReference>` is **COMMENTED OUT**. Added by `5de6c7d8`, never once part of an iOS build |

The extension's bundle id is already declared: **`com.ixilabs.spixi.Spixi-PushService`**.
It is a child of the app id. It does not exist at Apple yet.

### 6a. Apple-side, three artifacts. This is the answer to "where do I build it".

Nothing is built on the Mac. All three are created in the developer portal:

| # | Portal page | What to create |
|---|---|---|
| 1 | Identifiers → App IDs → **+** | a NEW App ID, explicit, **`com.ixilabs.spixi.Spixi-PushService`**. It needs NO push capability of its own — it only needs the App Group |
| 2 | Identifiers → **App Groups** → **+** | `group.com.ixilabs.spixi`. Then EDIT BOTH App IDs and enable App Groups on each, selecting this group |
| 3 | Profiles → **+** → iOS App Development | a SECOND profile for `com.ixilabs.spixi.Spixi-PushService`, same certificate, same device. Name it `VS: com.ixilabs.spixi.Spixi-PushService Development` |

⚠ After enabling App Groups on `com.ixilabs.spixi`, its own profile from §5 must be
**REGENERATED** — an existing profile does not gain a capability retroactively.

### 6b. Repo-side, when the three artifacts exist

| # | Change |
|---|---|
| 1 | ★ **`Spixi-PushService.csproj` pins `OneSignalSDK.DotNet` 5.2.2; the app is on 6.1.9.** Two SDK versions in one bundle. Bump the extension to 6.1.9 FIRST — 6.1.9 is confirmed to ship `OneSignalSDK.DotNet.iOS/NotificationServiceExtension.cs` with both static methods |
| 2 | `Spixi-PushService/Entitlements.plist` — add `com.apple.security.application-groups` = `group.com.ixilabs.spixi` |
| 3 | `Spixi/Platforms/iOS/Entitlements.plist` — add the SAME group beside `aps-environment` |
| 4 | `Spixi/Spixi.csproj:302-307` — UNCOMMENT the `<ProjectReference>` |
| 5 | The Spixi gate inside `DidReceiveNotificationRequest`, BEFORE handing to OneSignal: read `fa` from `request.Content.UserInfo`, then `SNotificationPrefs.shouldDisplayRawPush(fa)` |
| 6 | Set a collapse/thread id on the mutated content so remote pushes group the way local ones already do |

⚠ **The extension is its own PROCESS.** `FriendList` is empty there and `Preferences`
are NOT shared. Without the App Group the mute gate cannot read anything. The group is
a requirement, not an extra.

⚠ **`SupportedOSPlatformVersion` must stay ≤ the app's `MinimumOSVersion`.** Both are
`15.0` today — leave them. If MSBuild defaults the extension higher, iOS refuses to
bind it (`UNErrorDomain 1904`, "No service extension record found for app") and
**silently drops every mutable-content push**. A silent drop is the same class of
defect as this whole finding.

### 6c. What the iOS extension CANNOT do

`UNNotificationServiceExtension` may only **mutate** a notification iOS has already
decided to show. It **cannot cancel** one. Android's `preventDefault(true)` has no iOS
equivalent. So a fully muted chat may still produce a silent, empty row.
★ The real fix for a muted chat on iOS is server-side: do not send the push. That is a
BE row. **Decide this with Damir BEFORE the work, not on a device after it.**

## 7. Build and deploy on the office Mac — what actually works

```bash
# git locks left by the Cowork sandbox block ALL git writes; clear them first
rm -f .git/index.lock .git/HEAD.lock .git/ORIG_HEAD.lock _to_delete_index.lock*

# pipeline, must end with an empty `git status --porcelain`
node scripts/extract-strings.mjs && node scripts/build-locales.mjs \
 && node scripts/build-strings-iife.mjs && node scripts/build-demo-bundle.mjs \
 && node scripts/build-shells.mjs && node scripts/smoke-test.mjs   # BASELINE OK 3049 / the 3 known

rm -rf Spixi/obj Spixi/bin
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug \
  -p:RuntimeIdentifier=ios-arm64 \
  -p:CodesignProvision="VS: com.ixilabs.spixi Development"

DEV=F992BFF8-BB7E-5F68-8E25-496307854F6D
xcrun devicectl device install app --device $DEV Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app
xcrun devicectl device process launch --device $DEV com.ixilabs.spixi
```

| Trap | Rule |
|---|---|
| `-p:RuntimeIdentifier=ios-arm64` | ★ NOT optional. Debug iOS with no RID silently builds a SIMULATOR app (`Spixi.csproj:52`) |
| `-p:CodesignKey="Apple Development: Damir Rekic"` | ★ **FAILS** — "not found in keychain". MSBuild matches the CN exactly and the real CN ends `(77X9Y36WPG)`. **Omit the property**; the csproj's `iPhone Developer` alias resolves correctly. Or pass the SHA-1 |
| `-p:CodesignEntitlements=` | the escape hatch that let the app run on the WILDCARD profile today. ⚠ It suppresses push. Remove it for any push build |
| `Spixi/obj` + `Spixi/bin` | wipe on any C# change AND when moving simulator ↔ device (the RocksDB xcframework slice differs) |
| Environment | dotnet **10.0.302**, workload set **10.0.303.1**, maui manifest 10.0.20/10.0.100, **Xcode 26.6**, node v26.5.0. Build is ~45 s warm, **1693 warnings / 0 errors** — the warnings are Ixian-Core CA1416/CA2022 noise |

## 8. Open, and what it means for the other platforms

* **#490 `clearRemoteNotifications` is still dead code on iOS** — `return;` is the first
  statement (`SPushService.cs:187`). It has never done anything. Needs its author.
* **#489 the init latch is FIXED** in `3d6703a7` — `isInitializing` now resets on both
  the fault and the throw path.
* **Android**: `#503`/`#510` stand unchanged. The Android extension can SUPPRESS; the
  iOS one cannot. Do not assume parity of behaviour, only parity of intent.
* ★ **The pattern to carry forward:** the redesign groups and dies on lock; legacy
  survives lock and does not group. Two apps, one half each. When two platforms differ,
  ask which MECHANISM is running, not which fix is missing. Three sessions were spent
  fixing push code that was never once asked to run.

---

# PART 2 — the night's result. Session end 2026-08-25 ~01:00.

## 9. ★★ What we FIXED. All of this is done and verified.

| # | Item | Evidence |
|---|---|---|
| 1 | The Apple membership is live | team profile reissued, expires **Jul 27 2027** |
| 2 | `VS: com.ixilabs.spixi Development` regenerated with push | `aps=development`, `MY_IPHONE_PRESENT=1`, exp Aug 24 **2027** |
| 3 | The app now BUILDS with the entitlement | `codesign -d --entitlements` shows `aps-environment → development` |
| 4 | ★ **iOS registers with APNs. First time ever.** | `[APNSDIAG] changed … token=64 chars optedIn=True` at 00:31:30 |
| 5 | The OneSignal subscription is healthy | `0a50fb97-abd9-49e7-8e80-17124fa69e6d`, **Subscribed**, Status details empty |
| 6 | The `ixi` tag resolves | the push filter reads `{"key":"ixi","field":"tag","value":"3UCNjpfAViff…","relation":"="}` → **1 recipient** |
| 7 | IPN fires on a real message | 6+ API sends in Delivery, 00:34–00:46, each Sent=1 |
| 8 | The payload is correct | title "New Message", **Content Available: False** (a real alert, not a silent push), Sound Default, Badge +1, Priority High, TTL 3 days |
| 9 | ★ `fa` IS in the payload | `Additional Data → fa = 4JsLSmAF4yp…` — the future NSE mute gate has the field it needs |

Nothing above worked before this session. The entitlement diagnosis in Part 1 was correct.

## 10. ★★★ What is STILL BROKEN, and the honest state of it

**The push does not arrive on the device.** Killed, locked, WiFi, cellular — nothing.

Ruled out by measurement, not by argument:

| Hypothesis | Killed by |
|---|---|
| Presentation / banner suppressed | ★ **NO BADGE on the app icon.** iOS increments the badge on RECEIPT, independent of display. No badge = nothing reached the device |
| Notification Centre held it quietly | Notification Centre is EMPTY |
| iOS notification settings off | Settings → Notifications → Spixi all ON |
| Focus / Sleep / DND | no Focus active |
| Office WiFi blocking APNs (port 5223) | ★ retested on **cellular**. Same result |
| Silent / content-only push | `Content Available: False`, title present |
| Wrong recipient or missing tag | filter resolves to exactly 1 recipient |
| IPN not sending | Delivery shows the sends |

## 11. ★★★ THE TRAP WE FELL INTO. Write this one down.

**OneSignal's "Delivered" for iOS is NOT a delivery receipt.** Confirmed delivery on iOS
requires a NotificationServiceExtension to report back — and ours is commented out
(`Spixi/Spixi.csproj:302`). Without the NSE, "Delivered" means only **"APNs accepted the
request."**

★ We read a SEND receipt as a DELIVERY receipt for an hour. It is the same class of error
as #503 (a gate that was green and did nothing) and as the 2.1 false pass — **a status
that reports the step before the one you care about.**

⚠ And note the second-order effect: the NSE is now needed for DIAGNOSIS, not only for
mute and grouping. Without it we cannot tell "Apple took it" from "the phone got it".

## 12. ★ The probe has a hole

`Spixi/Platforms/iOS/SPushService.cs:168` logs `token=" + tok.Length + " chars"`.
**It logs the LENGTH of OneSignal's COPY of the token. Never the value.**

So we have never verified that the token OneSignal holds is the token iOS issued to this
install. A stale but well-formed token would look identical in every log we have.

## 13. ★★ THE RESUME POINT — one command answers it

Stop asking OneSignal. Ask Apple.

**Step 1 — get the raw token.** No rebuild needed. OneSignal REST API:

```bash
curl -s "https://api.onesignal.com/apps/af20710d-7d68-4038-94a4-2896f3029263/subscriptions/0a50fb97-abd9-49e7-8e80-17124fa69e6d" \
  -H "Authorization: Key <ONESIGNAL_REST_API_KEY>" | python3 -m json.tool
```

The device token is the `token` / `identifier` field. The REST key is in
**Settings → Keys & IDs**. ⚠ Read-only call. It sends nothing.

**Step 2 — push straight at Apple, both hosts.** Needs the `.p8`, its Key ID (Apple
portal → Keys), and team `3D663HCNTU`. Build the JWT, then:

```bash
# sandbox — a development-signed build MUST work here
curl -v -H "apns-topic: com.ixilabs.spixi" -H "apns-push-type: alert" \
     -H "authorization: bearer $JWT" \
     -d '{"aps":{"alert":"direct apns test","badge":7,"sound":"default"}}' \
     --http2 "https://api.sandbox.push.apple.com/3/device/$TOKEN"

# production — should FAIL for this build
curl -v ... --http2 "https://api.push.apple.com/3/device/$TOKEN"
```

| Apple says | Meaning |
|---|---|
| **200 on sandbox AND the phone buzzes** | the token and the device are fine → the fault is OneSignal's routing. Raise it with OneSignal support with these message IDs |
| **200 on sandbox and STILL nothing** | the token OneSignal holds ≠ what the device has, or the device's APNs registration is broken. Re-read the token from iOS itself, not from the SDK |
| **400 BadDeviceToken on sandbox, 200 on production** | ★ the token is a PRODUCTION token. The entitlement did not take the way we think it did — re-read the codesign dump |
| **400 on both** | the token is stale. Force a fresh registration and repeat |

★ Whatever the answer, it is Apple's, and it is not open to interpretation.

**Step 3 — a cheap parallel fix.** Change the probe to log the token VALUE (or its first
and last 8 chars), so the log alone can answer this next time. Three characters of edit at
`SPushService.cs:168`.

## 14. Correction to the NSE work order (§6a of `ios-push-workorder-2026-08-24.md`)

★ **The extension's App ID ALREADY EXISTS at Apple.** The Profiles list carries
`VS: com.ixilabs.spixi.Spixi-PushService Development` (expired 2026/08/11), and a profile
cannot exist without its App ID. So §6a item 1 is DONE, and item 3 is a REGENERATION of
that expired profile, not a new one. Only the **App Group** is genuinely missing.

Revised Apple-side list for the NSE batch:

| # | State |
|---|---|
| App ID `com.ixilabs.spixi.Spixi-PushService` | ★ EXISTS |
| Profile for it | EXISTS, **expired** — regenerate, same as we did for the app |
| App Group `group.com.ixilabs.spixi` | **MISSING** — the only new artifact |

⚠ And after enabling the App Group on `com.ixilabs.spixi`, regenerate ITS profile too.

## 15. What this session taught

* ★ **"Delivered" answered a question we were not asking.** Read what a status actually
  measures before you trust it. On iOS, OneSignal cannot know a push arrived without the
  NSE — so it reports the last thing it CAN know, and it looks identical to success.
* ★ **A probe that logs a length is not a probe.** `token=64 chars` passed every reading
  all night and never once proved the token was right.
* ★ **The badge was the real instrument.** One bit — no badge on the icon — killed four
  hypotheses at once, because it measures RECEIPT rather than display. Find the field
  that measures the step you doubt.
* ★ **Two failures in a row can have different causes.** `BadDeviceToken` was real and we
  fixed it. What replaced it is NOT the same fault wearing a new mask, and treating it as
  one would have sent us back to the profile for a third time.
* ★ **The lead dev's push-back was right and it cost us nothing to check.** The OneSignal
  theory died against `git log` in two minutes. Check the cheap thing before defending.

---

# PART 3 — ★★★ RESOLVED. Push works on iOS. 2026-08-25, ~01:15.

## 16. The result

**Remote push notifications now ARRIVE on iOS**, with the app killed and the phone locked.
Damir confirms they are **fresh sends, not an APNs backlog** — each new message produces a
notification. This is the first time in the project's history.

★ **Section 10 above is SUPERSEDED. It is kept for the reasoning, not the conclusion.**

What made the difference, in order: the entitlement (#486) → a non-wildcard development
profile carrying `aps-environment` → deleting the stale subscription record that carried
`Apns Bad Device Token` from a month of App Store (production) use. The silent window
between the fix and the first arrival was registration settling, not a further fault.

⚠ We nearly built a fifth theory during that window. The lesson is in §18.

## 17. How they LOOK, and why that is correct

| Symptom | Cause | Fix |
|---|---|---|
| **Not grouped** | a raw APNs push carries no thread id. Local notifications group only because `SPushService.cs:335` sets `ThreadIdentifier = data` | the NSE sets a thread/collapse id |
| **No sender name** — body is the generic "New Message" | IPN cannot know the nickname. That mapping is `FriendList`, on the device. And the message body is E2E encrypted, so the server cannot read it either. The payload carries only `fa` = the sender's address | the NSE reads `fa`, resolves the contact and rewrites the title |
| **Mute is ignored** | no code runs before iOS draws a raw push | the NSE gate, `shouldDisplayRawPush(fa)` |

★ **None of these is a defect. They are the honest behaviour of a push with no extension.**
Do NOT open rows for them. They are one batch — the NSE — and it is already scoped in §14
and `docs/ios-nse-spec.md`.

## 18. Revised next steps

| # | Item | State |
|---|---|---|
| 1 | **Confirm it is reliable.** One message, timed, from a cold start. Then a normal day of use | ★ DO THIS FIRST. One arrival is not a pass |
| 2 | **The NSE batch** — names, grouping, mute. Only the App Group is missing at Apple (§14) | the real next batch |
| 3 | The direct-APNs test (§13) | ★ **DEMOTED to a fallback.** Run it only if delivery proves flaky |
| 4 | Log the token VALUE, not its length (`SPushService.cs:168`) | still worth doing. Cheap |
| 5 | The duplicate `changed` probe line (two identical logs, same timestamp) | loose end, harmless |
| 6 | #490 `clearRemoteNotifications` dead code | unchanged, needs its author |
| 7 | The four sound assets | unchanged. iOS push is SILENT until they land |
| 8 | `aps-environment: production` + a distribution profile for TestFlight/App Store | ★ NOT yet exercised. A release build still cannot push |

## 19. ★ What this session taught, final

* ★ **"Delivered" answered a question we were not asking.** On iOS, without the NSE,
  OneSignal reports only that Apple ACCEPTED the request. We read a send receipt as a
  delivery receipt for an hour.
* ★ **The badge was the real instrument.** One bit — no badge on the icon — killed four
  hypotheses at once, because it measures RECEIPT, not display.
* ★ **A probe that logs a length is not a probe.** `token=64 chars` passed every reading
  all night and never once proved the token was correct.
* ★ **We were one step from theorising past a fix that had already worked.** The system was
  correct and still settling. ⚠ Before inventing hypothesis five, RE-RUN the test.
* ★ **The lead dev's push-back was right and cost nothing to check.** The OneSignal-bundle-ID
  theory died against `git log` in two minutes.
* ★ **Three sessions were spent fixing push code that was never asked to run.** The entitlement
  was four lines of plist. Ask whether the code EXECUTES before asking whether it is correct.
