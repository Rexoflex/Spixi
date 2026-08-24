# iOS PUSH — WORK ORDER

Date: 2026-08-24. Build: `3d6703a7`. Device: iPhone 15, iOS.
Language: ASD-STE100.

---

## 1. THE CAUSE

The app does not have the `aps-environment` entitlement.
Thus iOS does not give an APNs token to the app.
Thus OneSignal has no subscription to send to.
The app has never received a remote push on iOS.

The notifications that you see now are LOCAL notifications.
The app makes them itself while the app process is alive.
`Spixi/Meta/Node.cs:1039` calls `showLocalNotification()`.
`Spixi/Platforms/iOS/SPushService.cs:335` sets `ThreadIdentifier`.

This is the proof from the signed app on the device:

```
codesign -d --entitlements - Spixi.app
  application-identifier               3D663HCNTU.com.ixilabs.spixi
  com.apple.developer.team-identifier  3D663HCNTU
  get-task-allow                       true
  keychain-access-groups               3D663HCNTU.com.ixilabs.spixi
```

There is no `aps-environment` key.

## 2. WHY THE TWO APPS ARE DIFFERENT

| Condition | Redesign | Legacy |
|---|---|---|
| App in the background, process alive | Shows a notification | Shows a notification |
| Phone locked | Shows nothing | Shows a notification |
| App killed | Shows nothing | Shows a notification |
| Notifications group together | Yes | No |

The redesign uses only the local path. The local path sets a thread id, thus the
notifications group. The local path stops when iOS stops the process.

The legacy app uses the remote path. A raw APNs push has no thread id, thus the
notifications do not group. The remote path does not need the process.

OneSignal is correct. Both apps use the same bundle id `com.ixilabs.spixi`.
Both apps use the same OneSignal app id `af20710d-7d68-4038-94a4-2896f3029263`.
Do not change the OneSignal configuration.

## 3. STEP 1 — MAKE THE TOKEN WORK

Do these steps at `developer.apple.com/account`.

1. Open Identifiers. Select `com.ixilabs.spixi`.
2. Select Push Notifications. Save the App ID.
3. Open Profiles. Add a new profile. Select iOS App Development.
4. Select the App ID `com.ixilabs.spixi`. Do not select the wildcard App ID.
5. Select the certificate `Apple Development: Damir Rekic`.
6. Select the device with the UDID `00008120-001C02E00E39A01E`.
7. Name the profile `VS: com.ixilabs.spixi Development`.
8. Generate the profile. Download the profile. Open the file to install it.

WARNING: Do step 2 before step 3. If you make the profile first, the profile does
not have `aps-environment`.

WARNING: A wildcard profile can not have `aps-environment`. Apple does not permit it.

Then build the app on the Mac:

```bash
rm -rf Spixi/obj Spixi/bin
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug \
  -p:RuntimeIdentifier=ios-arm64 \
  -p:CodesignProvision="VS: com.ixilabs.spixi Development"
```

WARNING: Always give `-p:RuntimeIdentifier=ios-arm64`. If you do not give it, the
build makes a simulator app.

Then install the app and start it. Make a wallet. Wait 4 seconds.
Then use dev mode. Send the log. Find `[APNSDIAG]`.

| Log line | Meaning |
|---|---|
| `token=<N> chars` and a `subId` | The registration is correct |
| `token=(NONE - not registered with APNs)` | The entitlement is not in the app |
| No line | `initialize()` did not run |

## 4. RESULT OF STEP 1

Notifications come when the phone is locked. Notifications come when the app is killed.

The notifications do not group. The notifications ignore the chat mute.
This is correct for a raw push. It is not a defect.

## 5. STEP 2 — THE NOTIFICATION SERVICE EXTENSION

The extension code is already in the repository. Do not write it again.

| File | Condition |
|---|---|
| `Spixi-PushService/Spixi-PushService.csproj` | Complete |
| `Spixi-PushService/NotificationService.cs` | Complete |
| `Spixi-PushService/Info.plist` | Complete |
| `Spixi-PushService/Entitlements.plist` | Empty. You must add the App Group |
| `Spixi/Spixi.csproj:302` | The ProjectReference is commented out |

Make these three items at Apple:

1. A new App ID: `com.ixilabs.spixi.Spixi-PushService`.
2. A new App Group: `group.com.ixilabs.spixi`. Enable it on both App IDs.
3. A second development profile for `com.ixilabs.spixi.Spixi-PushService`.

WARNING: After you enable the App Group on `com.ixilabs.spixi`, make its profile
again. A profile does not get a new capability automatically.

Make these four changes in the repository:

1. Change `OneSignalSDK.DotNet` in the extension from 5.2.2 to 6.1.9.
   The app uses 6.1.9. Two versions in one bundle are not permitted.
2. Add `com.apple.security.application-groups` to both Entitlements.plist files.
3. Remove the comment marks from the ProjectReference in `Spixi/Spixi.csproj`.
4. In `DidReceiveNotificationRequest`, read `fa` from `request.Content.UserInfo`.
   Then call `SNotificationPrefs.shouldDisplayRawPush(fa)`. Do this before you
   call OneSignal.

WARNING: Keep `SupportedOSPlatformVersion` at 15.0. It must not be more than the
`MinimumOSVersion` of the app. If it is more, iOS does not bind the extension.
iOS then removes all mutable-content pushes and gives no error.

WARNING: The extension is a different process. It can not read the memory of the
app. It can not read the Preferences of the app. The App Group is necessary.

## 6. LIMITS

The iOS extension can only change a notification. It can not cancel a notification.
Android can cancel a notification with `preventDefault(true)`. iOS has no equivalent.

Thus a muted chat can show an empty notification on iOS.
To make mute correct on iOS, the server must not send the push.
This is a backend task.

Two more items are necessary for a complete result:

1. The four sound files. iOS notifications have no sound until these files are added.
2. For TestFlight or the App Store, `aps-environment` must be `production`.
   This needs a distribution profile. Nobody has tested this configuration.

## 7. UNKNOWN

We do not know if the OneSignal payload contains the `fa` field.
The mute gate needs this field. Do step 1 first. Then read a real payload.

---

# STATUS AFTER THE SESSION — 2026-08-25, 01:00

## A. STEP 1 IS DONE

We did all of section 3. These items are complete and verified:

| Item | Result |
|---|---|
| Apple membership | Live. Profiles are valid to 2027 |
| Profile `VS: com.ixilabs.spixi Development` | Regenerated. It has `aps=development` |
| The app entitlement | `codesign` shows `aps-environment = development` |
| APNs token | ★ The app receives a token. This is the first time |
| OneSignal subscription | `0a50fb97-abd9-49e7-8e80-17124fa69e6d`. Status: **Subscribed** |
| The `ixi` tag | Correct. The push filter finds 1 recipient |
| IPN | It sends. The sends are in Delivery |
| The payload | Correct. Title "New Message". It is an alert, not a silent push |

⚠ The old subscription had the error `Apns Bad Device Token`. We deleted that
subscription record. The app made a new record. The error is gone.

## B. THE PUSH STILL DOES NOT ARRIVE

The notification does not come to the phone. We tested these conditions:
app killed, phone locked, WiFi, mobile network. The result is the same.

These causes are NOT the problem. We measured each one:

| Possible cause | Why it is not the cause |
|---|---|
| The banner is hidden | ★ There is NO BADGE on the app icon. iOS adds the badge when it RECEIVES the push. No badge shows that the phone did not receive it |
| Notification Center holds it | Notification Center is empty |
| iOS settings are off | The Spixi notification settings are all ON |
| Focus mode | No Focus mode is on |
| The office network stops APNs | We tested on the mobile network. The result is the same |
| The push has no content | The payload has a title. `Content Available` is False |
| The recipient is wrong | The filter finds exactly 1 recipient |

## C. ★★ IMPORTANT — DO NOT TRUST "DELIVERED"

OneSignal shows the status **Delivered**. This status is NOT proof of delivery on iOS.

To confirm delivery on iOS, OneSignal needs the NotificationServiceExtension.
Our extension is not in the build (`Spixi/Spixi.csproj:302`).
Thus **"Delivered" means only "Apple accepted the request"**.

⚠ Also, the probe in the app writes `token=64 chars`. It writes the LENGTH of the token.
It does not write the token. Thus we have not compared OneSignal's token with the token
that iOS gave to this installation.

## D. ★ THE NEXT STEP — ASK APPLE, NOT ONESIGNAL

**Step 1.** Get the token. This is a read-only API call. Use the REST API key from
OneSignal Settings → Keys & IDs.

```
curl -s "https://api.onesignal.com/apps/af20710d-7d68-4038-94a4-2896f3029263/subscriptions/0a50fb97-abd9-49e7-8e80-17124fa69e6d" \
  -H "Authorization: Key <REST_API_KEY>"
```

**Step 2.** Send a push directly to Apple. Use the `.p8` key, its Key ID, and team
`3D663HCNTU`. Send to the sandbox server and to the production server.

```
https://api.sandbox.push.apple.com/3/device/<TOKEN>     <- must work for a dev build
https://api.push.apple.com/3/device/<TOKEN>             <- must fail for a dev build
```

| Apple result | Conclusion |
|---|---|
| 200 on sandbox, and the phone shows the notification | The device is correct. The fault is in OneSignal. Send them the message IDs |
| 200 on sandbox, but the phone shows nothing | OneSignal's token is not the token of this installation |
| 400 BadDeviceToken on sandbox, 200 on production | The token is a production token. Examine the entitlement again |
| 400 on both servers | The token is old. Make a new registration and repeat the test |

**Step 3.** Change the probe to write the token value. See
`Spixi/Platforms/iOS/SPushService.cs:168`.

## E. CORRECTION TO SECTION 5

★ The App ID `com.ixilabs.spixi.Spixi-PushService` **ALREADY EXISTS** at Apple.
A profile for it is in the Profiles list. It is expired.

The revised Apple work for the extension is:

| Item | State |
|---|---|
| App ID `com.ixilabs.spixi.Spixi-PushService` | Exists. No work |
| Its provisioning profile | Exists but expired. Regenerate it |
| App Group `group.com.ixilabs.spixi` | ★ Missing. This is the only new item |

⚠ When you add the App Group to `com.ixilabs.spixi`, you must regenerate its profile too.

★ The extension is now necessary for DIAGNOSIS, not only for mute and grouping.
Without it, OneSignal can not tell us if a push arrived.

---

# ★★ FINAL STATUS — 2026-08-25, 01:15. IT WORKS.

**Push notifications now arrive on iOS.** The app was killed. The phone was locked.
The notifications are fresh sends, not old messages from a queue.
This is the first time push has worked on iOS in this project.

★ **Section B above is not correct any more. Read this section.**

## The notifications do not look correct. This is normal.

| What you see | Why | The fix |
|---|---|---|
| They do not group | A push from the server has no thread id. Local notifications have one | The extension |
| They show no name. The text is "New Message" | The server can not know the name of the sender. The names are on the phone. The message text is encrypted. The push contains only `fa`, the address of the sender | The extension reads `fa` and writes the name |
| Mute does not work | No app code runs before iOS shows the push | The extension |

⚠ **Do not make bug reports for these three items. They are one task: the extension.**

## What to do next

1. ★ **Test again.** Send one message. Measure the time. Then use the app for a day.
   One notification is not sufficient proof.
2. **Do the extension task.** See section E. Only the App Group is missing at Apple.
3. The direct test with Apple (section D) is **not necessary now**. Do it only if the
   notifications stop again.
4. Change the probe to write the token value (`SPushService.cs:168`).

⚠ Two items are still open and they are not part of the extension task:

* **The sound files.** iOS notifications are SILENT until the four sound files are added.
* **Release builds.** `aps-environment` must be `production` for TestFlight and the App
  Store, with a distribution profile. Nobody has tested this.
