# iOS NotificationServiceExtension — the work order, and why it is NOT in #510

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

DECISIONS **#503** (the finding) · **#510** (the Android half, built). This document is the
iOS half. **Nothing here is built.** It is written so the work is one sitting when the
prerequisite clears, not a research task.

---

## 1. Why it is gated, and it is not a code problem

The Android extension is a CLASS in the app, found by name from the manifest. The iOS
extension is a **separate signed binary** in the app bundle. From the OneSignal SDK's own
reference project (`examples/demo/NotificationServiceExtension`):

| Requirement | Value | Owner |
|---|---|---|
| A new `.csproj`, `net10.0-ios`, `OutputType Library`, `IsAppExtension true` | code | me |
| `ApplicationId` — its OWN bundle id, a child of the app's | `io.ixilabs.spixi.NSE` (or similar) | **Apple Developer portal** |
| `CodesignProvision` — a provisioning profile for THAT bundle id | a second profile | **Apple Developer portal** |
| `CodesignTeamId` | the team id | Damir |
| `Entitlements.plist` + an App Group shared with the app | a second entitlement | **Apple Developer portal** |
| `SupportedOSPlatformVersion` ≤ the app's `MinimumOSVersion` | must match | me |

⚠ **Three of the six are Apple-side, and iOS push is already blocked on Apple** (#486's
entitlement, #488's probe). Adding an extension target whose profile does not exist yet
does not fail gracefully — **the iOS build stops**, on the one platform Damir is about to
take to the office Mac.

⚠ And the SDK's own csproj carries this warning, which is the failure mode to expect:

> Must match (or be lower than) the host app's MinimumOSVersion. Without this, MSBuild
> defaults to the current iOS SDK, which is higher than the main app's, and iOS refuses to
> bind the extension ("No service extension record found for app" / UNErrorDomain 1904),
> **silently dropping mutable-content pushes**.

★ A silent drop is the same class of defect #503 records. Shipping this untested, on a
platform whose push cannot be exercised, would be building past a missing repro (#294).

## 2. What the iOS extension can and cannot do

★ **It is NOT the Android extension's equivalent, and this matters for expectations.**

- Android's `INotificationServiceExtension` can **suppress** a notification
  (`preventDefault(true)`) and post a different one. That is what makes the mute, the
  global master and the one-row-per-chat id work on the background lane.
- iOS's `UNNotificationServiceExtension` may only **mutate** the content of a notification
  that iOS has already decided to show. It **cannot cancel it**. The nearest thing is
  emptying the content, which still leaves a delivered notification on some iOS versions.

**So the honest iOS scope is:** the per-chat mute and the global master can suppress the
*content*, and the collapse id can be set so a second message from one sender replaces the
first — but a fully muted chat may still produce a silent, empty row. Whether that is
acceptable is Damir's call, and it should be decided **before** the work, not discovered on
a device.

⚠ The real fix for a muted chat on iOS is server-side: do not send the push. That is a BE
row (the same payload work as the group-address gap), not an app row.

## 3. The code, when the gate clears

Verified present at the pinned version — `OneSignalSDK.DotNet` **6.1.9** ships
`OneSignalSDK.DotNet.iOS/NotificationServiceExtension.cs` with both static methods, so no
package change is needed.

1. **`Spixi.NSE/Spixi.NSE.csproj`** — as the table in §1.
2. **`Info.plist`**: `NSExtensionPointIdentifier` = `com.apple.usernotifications.service`,
   `NSExtensionPrincipalClass` = `NotificationService`.
3. **`NotificationService.cs`** — subclass `UNNotificationServiceExtension`,
   `[Register("NotificationService")]`, and in `DidReceiveNotificationRequest` call
   `OneSignalSDK.DotNet.iOS.NotificationServiceExtension.DidReceiveNotificationExtensionRequest(request, bestAttempt, contentHandler)`;
   in `TimeWillExpire` call `ServiceExtensionTimeWillExpireRequest`.
4. **The Spixi gate**, before handing to OneSignal: read `fa` from
   `request.Content.UserInfo`, then `SNotificationPrefs.shouldDisplayRawPush(fa)`.
   ⚠ **The extension is its own PROCESS.** It does not share the app's memory, so
   `FriendList` is empty there and `Preferences` are not shared unless an **App Group** is
   configured and the prefs are written to it. Without the App Group the gate cannot read
   the mute at all — which is why the group is in the §1 table and not an optional extra.
5. `<ProjectReference>` from `Spixi.csproj` with `IsAppExtension`.

## 4. The order to do it in

1. Damir clears the Apple side: extension bundle id, provisioning profile, App Group.
2. Decide §2 — is a silent empty row acceptable for a muted chat, or does the mute move to
   the server?
3. Then the code above, in one sitting, with its own audit.

⚠ Until then iOS behaves exactly as it does today. Nothing in #510 changes iOS: the Android
extension is a Windows/Android-side file and the shared decision it calls
(`SPushService.decidePush`) lives in the **Android** `SPushService`, not in shared code.
