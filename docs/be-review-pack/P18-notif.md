# P18 · NOTIF · Push notifications, the two push extensions, mute and notification prefs

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MED | no — neither extension gets a key, a wallet file or a keychain group; the App Group file holds addresses and names only | yes | shipped | 7 min |

**Look here first:** `Spixi/Platforms/iOS/SPushPrefsShare.cs:123` — writes muted contact addresses and (sender-name on) their nicknames as plain JSON into the App Group container, outside the app sandbox, for a second process that also runs OneSignal code (#919).

**DECISIONS:** #221 · #466 · #468 · #476 · #503 · #510 · #549 · #554 · #611 · #708 · #915 · #919 · #974 · #975 · #978 · #1303

## What changed and why
- Android: a killed-app push now enters our code through a OneSignal service extension; one shared decision fetches the mailbox when the node runs, else applies master/mute by sender address and posts our own generic row (#503, #510).
- iOS: the `Spixi-PushService` Notification Service Extension reads a store the app writes into App Group `group.com.ixilabs.spixi`; a muted sender's push is emptied, not cancelled (iOS cannot cancel) (#915, #919, #975).
- New prefs in `SNotificationPrefs`: master, sender name (default off), in-app sounds, a local 1:1 mute, and a OneSignal opt-out that withholds consent on Android and skips SDK init on iOS (#466, #468, #708).
- Notification text is a per-type line ("New Message", "Missed call"); message text is never included (#466, #549).
- O-06: the per-contact mute key is removed with the contact at the 7 app-side removal sites (O-06 (#1303)).

## Files (verified at 387ca78b)
- `Spixi/Platforms/Android/SNotificationServiceExtension.cs:101` — calls `SPushService.decidePush`; `:152` discards the SDK row only after our row posted (#510).
- `Spixi/Platforms/Android/SPushService.cs:757` — a background push runs `OfflinePushMessages.fetchPushMessages` (try-lock, no wait); `:815` mute/master by address; `:852` posts "Spixi" / "New Message" (#503, #510); `:192` / `:273` consent and OptOut follow the opt-out (#708).
- `Spixi-PushService/SpixiPushGate.cs:194` — `decide(store, fa)`: no store → show; master off or muted `fa` → Suppress; `:224` empties title, subtitle, body, sound (#919).
- `Spixi/Platforms/iOS/SPushPrefsShare.cs:273` / `:284` — the muted 1:1 set (+ declined requesters) and the nick map; `:125` backup-excluded; `:148` deleted by the account wipe (#919, #978).
- `Spixi/Meta/SNotificationPrefs.cs:407` — `shouldDisplayRawPush`, fails open; `:284` `forgetContact` (#510, O-06 (#1303)).
- `Spixi/Meta/Node.cs:1362` — the sender name is prefixed only when opted in (#466).
- `Spixi/VoIP/VoIPManager.cs:537` — an unanswered incoming call's row is re-posted as "Missed call", no name; muted → cancelled (#549, #554, #611).

## Bridge surface
| Verb / push | Args (shape) | Who can send it (which WebView / shell) | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:notifEnabled:` · `notifSenderName:` · `notifSounds:` | `<"on" \| other>` | `src/shells/settings.html` → `Raw/html/settings.html`, SettingsPage; also renders peer names (Downloads sheet) | `Spixi/Pages/Settings/SettingsPage.xaml.cs:942` · `:948` · `:982` | ours (#466, #468) |
| `ixian:notifPushProvider:` | `<"on" \| other>` | settings.html, SettingsPage | `Spixi/Pages/Settings/SettingsPage.xaml.cs:954` | ours (#708) |
| `ixian:mutechat:` | `<address b58>:<on\|off>` | `home.html`, HomePage — UNTRUSTED (chat names, previews) | `Spixi/Pages/Home/HomePage.xaml.cs:1308` | ours (#476) |
| `ixian:enableNotifications` / `disableNotifications` | none | `contact_details.html` ContactDetails · `chat.html` SingleChatPage — UNTRUSTED | `Spixi/Pages/Contacts/ContactDetails.xaml.cs:1024` · `Spixi/Pages/Chat/SingleChatPage.xaml.cs:778` | reshaped: on a 1:1 = local mute, nothing sent; newly handled on ContactDetails (#466) |
| push `setNotifEnabled` · `setNotifSenderName` · `setNotifSounds` · `setNotifPushProvider` | `<bool "True"\|"False">` (the stored value) | C# → settings.html | `Spixi/Pages/Settings/SettingsPage.xaml.cs:253`–`:263` | ours (#466, #708) |
| push `setContactNotifications` | `<"0"\|"1">` | C# → contact_details.html | `Spixi/Pages/Contacts/ContactDetails.xaml.cs:396` | ours (#466) |
| push `setChatMuted` | `<address b58>, <"0"\|"1">` | C# → home.html | `Spixi/Pages/Home/HomePage.xaml.cs:1378` · `:3190` | ours (#476) |
No verb here is reachable from a mini-app: `MiniAppPage`'s bridge and `onNavigatingGlobal` handle none of them (#221).

## Threat → rule → proof
| A hostile <…> could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| peer / push server: a crafted `fa` in the payload | `fa` is compared and used as a key or thread id only (`Spixi-PushService/SpixiPushGate.cs:201`); Android parses it in a try (`Spixi/Platforms/Android/SPushService.cs:847`); logs carry type + sanitised text (`Spixi/Platforms/Android/SNotificationServiceExtension.cs:160`) (#510, #919) | smoke "★★ GATE 26 (O-24 · O-26): the two push-path catches…"; parse path: no pin — walk only |
| peer: get message text shown on the lock screen | text never enters a row; body = our per-type string (`Spixi/Platforms/Android/SPushService.cs:852`), name opt-in (`Spixi/Meta/Node.cs:1362`) (#466) | smoke "★ #495: the body is the app's OWN per-type string…" · "NOTIF-2: the sender name is prefixed only when the user opted in…" |
| muted contact: still buzz a killed app | Android Suppress (`Spixi/Platforms/Android/SPushService.cs:815`); iOS empty rewrite (`Spixi-PushService/SpixiPushGate.cs:199`) (#510, #919) | smoke "★★ #919 ④: the mute rewrite clears title, subtitle, body AND sound…"; device: walk (#974) |
| compromised home WebView: mute or unmute any chat | only an existing contact is touched (`Spixi/Pages/Home/HomePage.xaml.cs:1344`); a group/bot also gets the legacy `enableNotifications` bot action (`:1351`) (#476) | no C# pin — walk only |
| OneSignal (third party): keep token / IP after the opt-out | consent withheld + OptOut (`Spixi/Platforms/Android/SPushService.cs:192`, `:273`); iOS skips init (`Spixi/Platforms/iOS/SPushService.cs:70`) (#708) | smoke "★★ #708 [Android]: consent FOLLOWS the preference…" · "★★ #708 [iOS]…" |

## Given up / left open
- The push carries the sender only: a muted 1:1 contact is silenced in groups too, and a muted group is not silenced in the background; the fix is a chat address in the payload (BE row) (#919).
- iOS: a muted push may still show an empty row; iOS OFF mid-session is OptOut only (no consent gate) until restart (#708, #919).
- The App Group file is plaintext, written with no explicit file-protection class — accepted as CORE-11's at-rest question (#919).
- O-06 residual: Core-side removals (bot leaveConfirmed, owner handleLeave, Payment friends) leave the mute key (O-06 (#1303)).

## ⚠ Contradiction
- `docs/be-cutover-brief.md:219` says the extension is out of the build and the entitlements carry only `aps-environment`; at HEAD `Spixi/Spixi.csproj:408` references it and both entitlements carry the App Group (#919); `docs/security-handover-gate.md:1515` ("not compiled anywhere yet") and `docs/ios-nse-spec.md` ("Nothing here is built") are stale too (#974).
- `docs/security-review-for-be-engineer.md` files the `mutechat` log NIT as "inherited"; `mutechat` is ours (absent at 0e85a4b8) and `Spixi/Pages/Home/HomePage.xaml.cs:1342` still echoes the token (#476).

## Question for BE
Is a plaintext App Group file of muted addresses and opted-in nicknames, readable by the extension and the OneSignal SDK in it, with no explicit file-protection class, acceptable until CORE-11 (the data-at-rest ask) — yes / no?
