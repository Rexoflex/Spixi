# WORK ORDER — privacy, notifications and the claims the app makes
**Raised:** 2026-08-29, Session E (the chat background pattern), from a legal-claims sweep
**For:** Damir + the dev lead, before launch
**Companion documents:** `docs/legal/claims-sweep.md` · `docs/legal/privacy-policy.md` · `docs/legal/terms-of-use.md`

> **Read P0 first.** One item ships a claim that is not true. Everything else can wait for a point release; that one should not.

---

## P0 · The secure-notice card tells the user something the architecture does not do

**Where:** `src/shells/chat.html:3435` (`createSecureNotice`), mirrored in
`src/components/launch-shell.js` `PRIVACY_DEFAULT`. Shown at the top of **every conversation**.

**What it says today:**
> "Messages go straight from device to device, sealed with post-quantum encryption. **No server carries or stores them.** Every message exists only with you two, nowhere else."

**What actually happens** (`Ixian-Core/Streaming/OfflinePushMessages.cs`, wired at `Spixi/Meta/Node.cs:151`,
URL at `Spixi/Meta/Config.cs:36` → `https://ipn.ixian.io/v2`):

When the recipient is **offline**, the sender POSTs to `push.php` with
`tag` = recipient address · `data` = the encrypted StreamMessage · `fa` = **sender address** ·
`pk` = sender public key on first contact. It is held there until the recipient's device calls
`fetch.php`. So a server **does** carry and store the message, and it observes **who sent to whom, and when**.

⚠ The encryption claim is fine — the server holds ciphertext and cannot read it. **It is the
"no server" sentence that is false**, and it is the sentence a journalist or a regulator will test.

**Suggested replacement** (keeps the strength, loses the untruth):
> "Messages are sealed on your device with post-quantum encryption and opened only by the person you
> sent them to. If they're offline, the encrypted message waits on our relay until their device
> collects it — we can't read it there either."

**Owner:** copy decision is Damir's; the string lives in `src/strings/en-us.js`
(`secureNoticeText`) and is translated in twelve locales, so a change costs an i18n pass.

---

## P1 · OneSignal initialises before consent — on Android only

**Evidence.**
- **Android:** `Spixi/Platforms/Android/MainApplication.cs:105` → `SPushService.registerEarly()` →
  `Spixi/Platforms/Android/SPushService.cs:111` `OneSignal.Initialize(Config.oneSignalAppId)`.
  `MainApplication.OnCreate` runs **before any Activity**, on every process start including a first
  install — so the SDK is live before the user has seen a screen, let alone accepted anything.
- **iOS:** `SPushService.initialize()` is called from `Node.start()` (`Spixi/Meta/Node.cs:365`),
  which needs a wallet. That is **after** onboarding and after consent. iOS is already correct.

★ **The Android placement is deliberate and was right for its purpose.** The `#493` note explains it:
a push waking a killed app used to arrive ~4 s before a handler existed. Do not simply move it back.

**Fix that keeps both properties — OneSignal's own consent gate:**

```csharp
OneSignal.ConsentRequired = true;          // BEFORE Initialize
OneSignal.Initialize(Config.oneSignalAppId);
// … handlers attach as they do today; the SDK transmits nothing yet
OneSignal.ConsentGiven = true;             // when the stored accept-flag is set, and on later launches
```

Handlers still register early (so #493 holds), and **nothing reaches OneSignal until consent**.
On a later launch, restore `ConsentGiven` from the stored acceptance so a push into a killed app
still works.

**Verify:** first install, airplane mode off, watch for OneSignal traffic before the onboarding
commit. There should be none.

---

## P2 · A real opt-out for third-party push

**Today:** `SNotificationPrefs.notificationsEnabled` and `shouldDisplayRawPush()` (NOTIF-5) gate
**display only**. With notifications switched off the SDK is still initialised and still registers,
so OneSignal continues to receive a token, device metadata and an IP address. There is **no**
`OptOut` / `OptIn` / `Logout` call anywhere in the codebase — checked.

**Wanted:** a genuine opt-out — skip `Initialize` when the pref is off, and
`OneSignal.User.PushSubscription.OptOut()` when it is turned off at runtime.

⚠ **The cost differs by platform and the UI must say so**, because the honest labels are different:

| platform | what opting out costs | why |
|---|---|---|
| **Android** | messages arrive on the poll instead of instantly | `Node.mainLoop` already calls `fetchPushMessages` with `fireLocalNotification = OperatingSystem.IsAndroid()` — the app can poll and raise a LOCAL notification with no third party |
| **iOS** | **nothing arrives until the app is opened** | `Platforms/iOS/Info.plist` declares `UIBackgroundModes: remote-notification` — the remote push IS the wake-up |

**Proposed Settings row** (Settings → Notifications):

> **Notifications without a third party**
> Android — messages arrive when the app checks, instead of instantly.
> iOS — you'll only see messages when you open Spixi.

★ Almost nobody offers this as a user-facing choice. Threema built a feature out of it (*Threema Push*).

---

## P3 · A pre-permission explainer, not a second consent wall

**Recommendation: do NOT add a dedicated OneSignal consent dialog at onboarding.** The user has
just accepted Terms and Privacy; a second wall reads as friction, gets dismissed unread, and so
buys no real informed consent. P1 solves the legal question properly on its own.

**Instead**, put a one-screen explainer in front of the OS notification-permission prompt that
already exists — the moment the user is thinking about notifications anyway:

> To wake your device when a message arrives, we use a push provider (OneSignal), which receives a
> token identifying this installation. It never sees your messages. [Learn more]

---

## P4 · Go direct to APNs and FCM, and delete a processor

**Benefit, stated precisely: it removes ONE party, not all of them.** Google still sees the FCM
token; Apple still sees the APNs token. What disappears is **OneSignal** — a commercial vendor with
its own business model in the middle — plus a US international transfer and a whole processor
section of the Privacy Policy.

**Why OneSignal is there, and it is a fair call:** one SDK across both platforms with MAUI
bindings, token lifecycle handled, and `ipn.ixian.io` calls **one** HTTP API instead of two push
protocols. Replacing it is real work:

- **APNs** — HTTP/2 to `api.push.apple.com`, `.p8` token auth, a JWT re-signed roughly hourly.
- **FCM** — HTTP v1 API with OAuth2 service-account credentials and its own refresh.
- **Client** — iOS token from `DidRegisterForRemoteNotifications`; Android needs Firebase Messaging
  for its token. The push server stores it per address; it already stores per-address data.
- **Lost** — OneSignal's retry and delivery reporting.

⚠ Related and already known: `Spixi/Platforms/iOS/SPushService.cs` (APNS-1) records that the
OneSignal dashboard may still carry the **old bundle id** `io.ixian.spixi` against
`com.ixilabs.spixi`. On APNs the bundle id IS the `apns-topic`, so every push at this build is
rejected however correctly it is signed. **Check that before blaming anything else about iOS push.**

**Not recommended now:** a Threema-Push equivalent (own persistent connection, Google out of the
loop entirely). Much larger project, battery cost, and P4 captures most of the benefit.

---

## P5 · Questions only the backend owner can answer

| # | question | why it blocks |
|---|---|---|
| 1 | **How long does `ipn.ixian.io` keep an UNDELIVERED message?** | the last open placeholder in the Privacy Policy. `docs.ixian.io` documents none of this — I checked the docs root, the protocol page and the GitHub org |
| 2 | Who operates `ipn.ixian.io` — IXI Labs or a hosting provider? | controller vs processor language in the Policy |
| 3 | `remove.php`'s response is **discarded** (`OfflinePushMessages.cs:186`), so a lost race leaves the message on the server and it is delivered twice | known NOTIF-4 family; also means "deleted on fetch" is best-effort, which the Policy now says |

★ **A delivered message IS deleted promptly** — the client calls `remove.php` right after a
successful fetch. That half is verified and is in the Policy.

---

## P6 · Crash reports — the correction Damir caught

**I got this wrong first time and he was right to push.** There is no crash-reporting **SDK** in the
app — swept for Sentry, AppCenter, Crashlytics, Firebase, Mixpanel, Amplitude across `Spixi/` and
`Ixian-Core`, zero matches. **But that is not the same as "no crash data reaches IXI Labs."**

**Google Play Console (Android vitals)** collects crashes and ANRs **at the OS level** for anything
distributed through Play — no SDK needed — and a report can carry the stack trace, device model, OS
and app version, plus free text the user typed into the crash dialogue. **App Store Connect** does
the same for users who opted into sharing analytics.

**Action:** none in code. It is a **disclosure** item and it is already written into the Privacy
Policy (§4.10), including how a user limits it per platform. Threema discloses the same thing.

---

## P7 · Store data-safety declarations must match

Both stores require a declaration that matches reality. With OneSignal in the build the truthful
answer is **not** "no data collected":

- **Google Play Data safety** — device or other IDs (push token), app info and performance
  (crash logs), approximate location by IP if applicable.
- **Apple privacy nutrition label** — Identifiers → Device ID; Diagnostics → Crash Data.

⚠ **A declaration that says "no data collected" while OneSignal ships is the kind of mismatch that
gets an app pulled**, and it is trivially checkable by anyone with a proxy.

---

## P8 · Transparency report — cheap, and unusually strong for Spixi

Threema publishes one; Signal publishes the subpoenas alongside near-empty responses.

**Yours is powerful because it would be nearly empty**, but the count is not the point — the
**capability table** is: for each data category, what could be produced under any legal order.

| asked for | what IXI Labs could produce |
|---|---|
| message content | nothing — ciphertext only, no keys |
| account records | nothing — there is no account |
| contact list / social graph | nothing from our systems; the offline store sees sender/recipient pairs while a message is queued |
| IP addresses | website logs; the app does not publish a client IP in presence |
| keys / wallet | nothing |
| push identifiers | via OneSignal, if compelled through them |

**Practically:** a page on `spixi.io`, half-yearly, with period, request counts by type and
jurisdiction, how many were complied with, and that table. First edition ≈ one day.
★ **Start the internal log now** — the report is only credible if counting began before anyone asked.

⚠ **Do not add a warrant canary on my say-so.** Its legal effect in the EU is doubtful. Ask the lawyer.

---

## P9 · Still owed by Damir

- The **undelivered-message TTL** (P5 #1) — the last placeholder.
- A **lawyer's review** of both documents before launch. They are accurate about the software and
  organised properly, but a self-custodial wallet in the EU sits near financial regulation, and the
  liability cap and jurisdiction clauses want a Slovenian practitioner.
- Whether there is an **app-facing Terms document** at `docs.ixian.io/terms.html` — indexed by
  search engines, 404s on fetch.
- **Minimum age**: the app stub says 16, the published policy says "not directed to under 16".
  A wallet may argue for 18. One number, everywhere.
