# Spixi — Privacy Policy

**Last updated: 29 August 2026** · Supersedes the version of 07 December 2025.

---

## The short version

Spixi has no accounts. You do not give us a phone number, an email address or a name to use it. We cannot read your messages, we do not hold your keys, and we run no analytics, telemetry or crash-reporting inside the app.

There are exactly three things we want you to know that are not obvious:

1. **When the person you are messaging is offline, your encrypted message is held briefly on a server we operate** so it can be delivered when they come back. We cannot read it. That server does see which address sent to which address, and when.
2. **Push notifications are delivered through OneSignal**, a third-party provider. To send a notification to your device, OneSignal necessarily holds a push token for it, together with basic device information and your IP address.
3. **The Ixian blockchain is public and permanent.** Wallet addresses and transactions recorded on it can be read by anyone, and cannot be edited or deleted by us or by you.

Everything else in this Policy is detail. If any of it conflicts with the summary above, the detail governs.

---

## 1. Who we are

The Services are operated by **IXI Labs d.o.o.**, a company registered in the Republic of Slovenia ("IXI Labs", "we", "us", "our").

Contact: **support@spixi.io** · https://www.spixi.io

For the purposes of the EU General Data Protection Regulation, IXI Labs is the **controller** of the limited personal data described in this Policy.

## 2. What this Policy covers

| context | what it is |
|---|---|
| **The Spixi app** | Peer-to-peer messaging, calls, file transfer, the IXI wallet and Mini Apps, on mobile and desktop. No account, no phone number, no email. |
| **The Spixi website** | `spixi.io`, its Help Center, download pages and contact forms. Uses cookies and analytics. |
| **The Ixian network** | A public, decentralised network of independently operated nodes. We do not control it and neither does anyone else. |

Together, the "Services". This Policy does not cover third-party sites you reach from the Services, or information you send us through separate channels.

## 3. What we never have

We want this stated plainly, because much of it is unusual:

- **No account.** There is nothing to register. Your identity in Spixi is a cryptographic wallet address generated on your device.
- **No phone number, no email address, no name** is required, requested, or stored in order to use the app.
- **No access to your message content.** Messages are encrypted on your device before they are transmitted. We hold no key that can open them.
- **No access to your wallet keys.** They are generated on your device, stored on your device, and used to sign locally. They are never transmitted to us and we cannot recover them.
- **No message history on our systems.** Your history lives in local storage on your device. There is no backup, sync or archive service that would give us a copy.
- **No analytics or telemetry inside the app.** The app contains no analytics SDK, no telemetry framework and no crash-reporting SDK of our own. This is verifiable: the source is public. We do receive **platform-level crash reports** from the app stores — see §4.10 below.
- **No advertising, no profiling, no sale of data.** Ever, and under no future business model that would require changing this sentence without telling you.
- **No published IP address.** When your client registers its presence on the Ixian network, the address field is deliberately left empty. Only server nodes publish a network address; clients do not.

## 4. What the app does process

### 4.1 Your address and keys

On first run the app generates a wallet, from which your **Spixi address** derives. It is a pseudonymous identifier: it is not linked to your real identity unless you link it yourself, by sharing it, publishing it, or transacting with a service that knows who you are.

Keys and the wallet file are stored on your device and protected by the password you set. **We never receive them, and we cannot restore them.** See the Terms of Use.

### 4.2 Messages — the direct path

When both parties are online, messages travel between devices over the Ixian network, relayed by independently operated nodes. Content is end-to-end encrypted; a relay forwards ciphertext and cannot read it.

A relay does, unavoidably, **see the IP address of the device connected to it**, in the same way any server sees the address of a client that connects. We do not record or publish it, and it is not written into the presence data the network shares.

### 4.3 Messages — the offline path, and the server that holds them

If the person you are messaging is not online, the message cannot be delivered directly. It is instead sent to an **offline delivery service we operate at `ipn.ixian.io`**, which holds it until their device fetches it.

What that service receives, on each message:

- the **recipient's address**, as the label the message is stored under;
- the **sender's address**;
- the **encrypted message itself**;
- on first contact, the sender's **public key**.

Your device registers with the service using its public key and a signature, and fetches messages by proving control of the address.

**We cannot read the messages held there** — they are the same ciphertext the recipient's device will decrypt. But the service does observe **which address sent to which address, and when**, and it holds the encrypted message for as long as it takes the recipient to come online. If that metadata matters to you, this is the paragraph to read twice.

**How long it is held.** Once your device has fetched a message, it asks the service to **delete it immediately**, and that is the normal path — a delivered message does not linger.

> ⟨PLACEHOLDER — the maximum period an *undelivered* message is retained before the service discards it. This is a server-side setting and must be stated as a concrete period, e.g. "at most N days". DAMIR TO CONFIRM with whoever operates ipn.ixian.io.⟩

### 4.4 Push notifications, and OneSignal

To wake your device when a message is waiting, we use **OneSignal**, a push notification provider.

To deliver a notification, OneSignal holds a **push token identifying your device installation**, together with information such as device model, operating system and app version, language, timezone, and the **IP address** the device connects from. It assigns its own identifier to that installation.

The notification itself is a signal that something is waiting. **The message content is not in it** — your device fetches and decrypts the message itself.

OneSignal processes this data on our instructions as a processor, and is located in the United States; see §10.

**Where and when this applies.** OneSignal is used by the **Android and iOS** apps only; the Windows and macOS apps use no push provider. The SDK does not initialise until you have accepted these documents. *(Updated Session G/#708: the earlier draft of this paragraph disclosed that Android initialised OneSignal before the first screen; P1 shipped the fix — Android now arms `ConsentRequired` before initialisation and withholds consent until acceptance, and iOS starts the SDK only with the messaging node, after your wallet exists.)*

**Turning it off.** On Android and iOS, Settings → Notifications → **Instant delivery via OneSignal** is a real opt-out (shipped as P2/#708): off, on iOS the SDK is not initialised at all, and on Android consent is withdrawn and the subscription opted out — nothing more is transmitted to OneSignal from this device. The trade-off is stated on the switch: without the push, messages arrive when Spixi checks (Android) or when you open the app (iOS). The record OneSignal already holds is not deleted by the switch; only their processes can delete it.

### 4.5 Presence on the network

So that others can reach you, your device publishes a presence record to the Ixian network containing your **address, a device identifier, a node type, a client version and a last-seen timestamp**, signed by your key.

It does **not** contain your IP address. The address field for a client is deliberately empty.

### 4.6 The blockchain — public and permanent

The IXI wallet interacts with the Ixian blockchain. **Transactions and the addresses involved are recorded publicly and permanently.** Anyone can read them, index them, and analyse them, now or in the future.

This has a consequence we cannot engineer around: **on-chain records cannot be corrected or deleted**, by you, by us, or by a regulator's order. Any pseudonymity they give you depends on the link between your address and your identity never being made elsewhere.

### 4.7 Version and price checks

The app contacts `resources.ixian.io` about **once an hour** to check for a newer version, and about **every thirty minutes** to retrieve an IXI price. These requests carry no personal data, but like any web request they reveal your **IP address** and the fact that a Spixi client is running.

### 4.8 Mini Apps

Mini Apps are listed at `apps.spixi.io` and open in your device's browser. Once you leave the app, this Policy stops applying and the operator's own terms and privacy practices govern.

### 4.9 Logs

The app writes a diagnostic log to local storage on your device. **It is never uploaded.** The only way it leaves your device is if you deliberately export and send it to us from the developer screen. If you do, please read it first — it may contain addresses and technical detail about your session.

### 4.10 Crash reports from the app stores

We ship **no crash-reporting SDK**. We do, however, receive crash and stability information from the **platforms themselves**, because any app distributed through the stores does:

- **Google Play Console (Android vitals)** reports crashes and ANRs collected by the Android operating system. A report can include the **stack trace, device model, Android version, and app version**, and where the user chose to add one, **free-text they typed into the crash dialogue**.
- **Apple App Store Connect / Xcode Organizer** reports crashes from users who have opted in to sharing analytics with developers, with comparable technical detail.

This is collected by Google and Apple under **their** privacy policies and passed to us in aggregate. We do not control it, we cannot switch it off for you, and we use it only to fix faults. It is not linked to a Spixi address, because the operating system has no knowledge of one.

⚠ On Android you can limit this in **Settings → Google → Usage & diagnostics**; on iOS in **Settings → Privacy & Security → Analytics & Improvements**.

### 4.11 Device permissions

Depending on the features you use, the app may ask for **camera** (QR codes, video calls, photos), **microphone** (voice and video calls, voice notes), **storage** (attachments and backups), **notifications**, and **biometric unlock**. Each is used only for the feature that requests it, and data captured stays on your device or goes to your contact under the same encryption as any other message. We receive none of it.

## 5. How we are funded, and why that matters

Privacy policies rarely answer the obvious question, so: **Spixi is self-funded by IXI Labs. It is not funded by your data.**

We can afford this because the architecture is cheap to run. There is no message store to scale, no account database, no media CDN and no analytics pipeline; the network is carried by independently operated nodes, not by us.

Our intended revenue is **business and enterprise use of the Ixian platform**, and possibly **optional premium features** for individual users later. If we ever introduce a paid tier, it will add features — **it will not add data collection, and the free app will not become the product being sold.** If that intention ever changes, this Policy changes first, with notice, and you will be able to read exactly what changed.

We do not run advertising, we do not profile users, and we do not sell personal information — and, as §3 explains, we mostly could not if we wanted to.

## 6. What the website processes

The website is an ordinary website and behaves like one.

- **Log data** — IP address and approximate location, device, operating system and browser, pages visited, timestamps, referrer and similar usage information.
- **Cookies** — for preferences (including your cookie choice), basic functionality, and analytics. First-party and third-party, session and persistent. Examples include Google Analytics cookies (`_ga`, `_gid`, `_gat_*`) and our own preference cookie (`SpixiCookieAgreed`).
- **Analytics** — we use Google Analytics to understand aggregate usage.
- **Anything you send us** — support emails, form submissions, survey responses, newsletter sign-ups.

You can control cookies in your browser and through the banner on the site. Blocking some will affect how the site works.

**None of this touches the app.** Using Spixi does not require visiting the website.

## 7. Why we process it (legal bases)

Where the EU/UK GDPR applies:

| purpose | basis |
|---|---|
| Delivering messages you send, including via the offline service | **Performance of a contract** — it is the service you asked for |
| Push notifications | **Consent**, given through your device's notification permission, withdrawable at any time in system settings |
| Website analytics and non-essential cookies | **Consent**, via the cookie banner |
| Responding to support requests | **Performance of a contract** / **legitimate interests** |
| Securing the Services, preventing abuse, fixing faults | **Legitimate interests**, balanced against your rights |
| Marketing emails | **Consent**, withdrawable |

## 8. Who we share with

We do not sell personal information. We share only as follows:

- **OneSignal** — push delivery (§4.4).
- **Hosting and infrastructure providers** — for the website and the offline delivery service.
- **Analytics providers** — website only.
- **Legal, safety and enforcement** — where we reasonably believe disclosure is required by law or necessary to address fraud, security or abuse. Note what we could actually produce: we hold no message content, no keys and no account records.
- **A successor** — if we are acquired or merge, subject to this Policy continuing to apply.

## 9. Ixian network nodes are not our processors

Relay and master nodes on the Ixian network are **independently operated** and are not our subcontractors. They forward encrypted traffic and, like any server, see the IP address of whoever connects to them. We have no contract with them and cannot direct them. This is inherent to a decentralised network and is a trade-off you make in exchange for there being no central operator to compel.

## 10. International transfers

OneSignal and some infrastructure providers are located outside the EEA, principally in the **United States**. Where we transfer personal data outside the EEA or the UK we rely on appropriate safeguards, including the European Commission's **standard contractual clauses**, or another lawful transfer mechanism.

## 11. Retention

| data | kept for |
|---|---|
| Encrypted messages awaiting an offline recipient | deleted as soon as the recipient fetches them; if never fetched, ⟨PLACEHOLDER — DAMIR TO CONFIRM⟩ |
| Push tokens at OneSignal | for as long as the installation is active; removed when you uninstall or disable notifications |
| Website log and analytics data | per our analytics provider's configured retention |
| Support correspondence | as long as needed to resolve your matter and for a reasonable period afterwards |
| Your messages, contacts and keys | **on your device only, for as long as you keep them.** Deleting the app deletes them |
| On-chain records | **permanently, and beyond our control** |

## 12. Your rights

Subject to your location you may have the right to **access**, **rectify**, **erase**, **restrict**, **port**, or **object to** processing, and to **withdraw consent**. Write to **support@spixi.io** and we will respond within the period the law allows, normally one month.

Two honest limits:

- **We cannot identify you from an address alone.** If you ask us to act on data tied to a Spixi address, we may need you to prove control of it — usually by signing a challenge. We are not being obstructive; we genuinely have no account to look you up in.
- **We cannot delete from the blockchain.** No one can. Where you have a right of erasure it cannot extend to on-chain records.

You may also complain to your local supervisory authority. In Slovenia this is the **Information Commissioner (Informacijski pooblaščenec)**.

## 13. Children

The Services are not directed to anyone under **16**, or a higher age where local law requires one, and we do not knowingly collect their personal information. If you believe a child has provided us with personal data, contact us and we will act.

## 14. Security — ours and yours

We apply reasonable technical and organisational measures to what we control. The architecture does most of the work: we do not hold the things that would be worth stealing.

**Your side matters more than ours here.** Your keys, your backup file and your password are the whole of your security, and if your device is compromised, so is your Spixi. Keep your operating system updated, protect your device, and store your backup somewhere safe and offline. If you believe your device or wallet has been compromised, move any funds to a new wallet immediately.

## 15. California residents

If you are a California resident you may have rights under the CCPA/CPRA, including to know what we have collected, to request deletion subject to exceptions, and to opt out of certain sharing. **We do not sell personal information** as that term is defined under California law. Contact **support@spixi.io**.

You may also contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs, 1625 North Market Blvd., Sacramento, CA 95834, telephone (916) 445-1254 or (800) 952-5210.

## 16. Changes

We may update this Policy. The "Last updated" date above will change, and for material changes we will give additional notice through the app or the website. Continued use after a change takes effect means you accept it.

## 17. Contact

**IXI Labs d.o.o.**, Slovenia · **support@spixi.io** · https://www.spixi.io
