# Spixi — legal claims verification sweep
**Date:** 2026-08-29 · **Scope:** `Spixi/` (C#, MAUI), `Ixian-Core` @ 097341a, `src/` (frontend), `Spixi-PushService`
**Method:** every claim traced to the code that implements it. Verdicts are VERIFIED, FALSE, or NEEDS DAMIR.

---

## A · The two findings that change the documents

### ⚠⚠ A1 — Messages DO rest on an IXI-operated server when the recipient is offline
**Verdict: the current in-app copy is FALSE.**

`Spixi/Meta/Config.cs:36` → `pushServiceUrl = "https://ipn.ixian.io/v2"`, wired at `Spixi/Meta/Node.cs:151`.
`Ixian-Core/Streaming/OfflinePushMessages.cs`:

| endpoint | what is sent |
|---|---|
| `register.php` | the device's **public key**, a nonce, a signature → returns an auth key |
| `push.php` | `tag` = **recipient address** · `data` = **the full StreamMessage, base64** · `fa` = **sender address** · `pk` = sender public key (first contact only) |
| `fetch.php` | `tag` = **recipient address** · nonce · signature |

So for an offline recipient the **encrypted message body is stored on `ipn.ixian.io` until it is fetched**, and that server necessarily observes **who sent to whom, and when** — the social graph and timing, though not the plaintext.

**What is shipped today and is not true:**
- `src/shells/chat.html:3435` (the secure-notice card, on every conversation): *"Messages go straight from device to device… **No server carries or stores them.** Every message exists only with you two, nowhere else."*
- `src/components/launch-shell.js` `PRIVACY_DEFAULT`: *"your messages stay on your device"*

Both are true **only while both parties are online**. This is a product-copy correction, not just a legal one.

### ⚠⚠ A2 — Push notifications are delivered by OneSignal, a US third party
**Verdict: "IXI Labs collects no personal data" is FALSE as an absolute.**

`Spixi-PushService/NotificationService.cs` → `using OneSignalSDK.DotNet;`
`Spixi/Platforms/Android/SPushService.cs:111` → `OneSignal.Initialize(Config.oneSignalAppId)`
`Spixi/Meta/Config.cs:69` → app id `af20710d-7d68-4038-94a4-2896f3029263`

OneSignal is a processor that receives, at minimum, a **push token, device model, OS and app version, language, timezone and IP address**, and assigns its own subscription identifier. That is a third-party data flow and **both app stores require it to be declared** (Apple privacy nutrition label, Google Data safety form). The published policy names no processor at all.

---

## B · Claims that survive the sweep — and are stronger than the current text says

| # | claim | evidence | verdict |
|---|---|---|---|
| B1 | No phone number or email required to create an account | no registration path in the app; identity is a generated wallet address | **VERIFIED** |
| B2 | IXI Labs cannot read message content | messages are `StreamMessage`s, encrypted before they reach the transport; the push store receives ciphertext | **VERIFIED** |
| B3 | Message history is stored locally on the device | local storage only; no sync endpoint exists | **VERIFIED** |
| B4 | Wallet keys never leave the device | `WalletStorage` is local; keys are used to sign, never transmitted | **VERIFIED** |
| B5 | No analytics, telemetry or crash-reporting SDK in the app | swept for Sentry / AppCenter / Crashlytics / Firebase / Mixpanel / Amplitude across `Spixi/` and `Ixian-Core` — **zero matches**; the only hits were variable names | **VERIFIED** |
| B6 | Logs stay on the device | `Ixian-Core/Meta/Logging.cs` writes `ixian.log` to a local path; nothing uploads it. The only exit is `ixian:sendlog` in the Dev page, a **user-initiated share sheet** | **VERIFIED** |
| B7 | **A Spixi client does not publish its IP address** | `Ixian-Core/Network/CoreNetworkProtocol.cs:293` — the client branch constructs `PresenceAddress(device_id, "", …)` with an **empty** address. Only servers (`:322`) publish theirs | **VERIFIED — and currently unstated. This is a real privacy property the policy gives away for free.** |

---

## C · Facts that must be disclosed and currently are not (or not fully)

| # | fact | evidence |
|---|---|---|
| C1 | A **device id** is published in the presence list alongside your address | `Ixian-Core/Presence/PresenceAddress.cs:25` |
| C2 | The **relay node you connect to sees your IP** at the transport level, unavoidably, even though it is not published | inherent to TCP; presence merely does not record it |
| C3 | The app contacts `resources.ixian.io` **hourly** for a version check and **every 30 minutes** for an IXI price | `Config.cs:37,46` + `checkPriceSeconds = 1800`, `checkVersionSeconds = 3600`. Sends no personal data, but reveals your IP and that you are running Spixi, on a schedule |
| C4 | Wallet addresses and transactions are **public and immutable** on the Ixian blockchain | already in the published policy §3.5 — correct, keep it |
| C5 | Mini Apps are hosted at `apps.spixi.io` and open in the **external browser** | `Config.cs:34`, `HomePage.xaml.cs:1260` |
| C6 | Permissions requested: camera, microphone, audio/video capture, external storage read+write, notifications, fingerprint, wake lock | `AndroidManifest.xml` |

---

## D · Needs a ruling from Damir

| # | question | why it matters |
|---|---|---|
| D1 | **How long does `ipn.ixian.io` retain an undelivered message?** Is there a TTL, and is a fetched message deleted? `remove.php` exists (`OfflinePushMessages.cs:186`) but its result is discarded | GDPR retention. This is server-side; I cannot read it from the client code |
| D2 | Who operates `ipn.ixian.io` — IXI Labs itself, or a hosting provider? | determines controller vs processor language |
| D3 | Is the OneSignal integration configured with **consent gating** before initialisation? | GDPR: an SDK that phones home before consent is a live exposure |
| D4 | The published Terms are **website** terms only (§1: *"These Terms relate primarily to Site usage"*). The wallet-responsibility clause the in-app stub relies on — *"no other way to recover them exists"* — **appears nowhere in the published Terms** | this is the most important clause in the whole document and it is currently only in a placeholder |
| D5 | Is there an app-facing Terms document at `docs.ixian.io/terms.html`? Indexed by search, 404s on fetch | may already answer D4 |
| D6 | Minimum age: the app stub says 16, the published policy says "not directed to children under 16" | 13 vs 16 differs by jurisdiction; a wallet may argue for 18 |
