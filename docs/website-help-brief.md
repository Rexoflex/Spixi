# Website help brief — what the app links to, and the claims rules (for the NEW spixi.io)

For: Damir and whoever builds the new Spixi website. Source: DECISIONS #1265 / #1267 (2026-10-08). Scan of the current site: 2026-10-08.

## 1 · Claims the new site must get right
The app follows these rules. The site should say the same, or the app cannot link to it.

| Topic | Do not write | Write instead | Why (source) |
|---|---|---|---|
| Servers | "No servers." · "Spixi doesn't need central servers." | "Spixi runs on the Ixian network of independent nodes, peer to peer." · "No central server stores your messages." (only if true for every path) | Messages to an offline contact pass the push relay `ipn.ixian.io` (`src/shells/chat.html:5380`); the app says nothing about servers. |
| Post-quantum | "Spixi uses post-quantum cryptography (FIPS 203)." (unconditional) | "Current Spixi apps use post-quantum encryption (ML-KEM-1024) with each other. With an older app, Spixi uses RSA-4096." | Damir 2026-08-30: the claim stays conditional; the rsa2 fallback is not post-quantum (`chat.html:5387–5399`). |
| End-to-end | "Messages are encrypted on your device." | "Messages are end-to-end encrypted: only the person you write to can read them." | History on the phone is not encrypted at rest (#1245, audit S-07). |
| Licence | "Open source, MIT licensed." | "© Ixian" · "The source code is public on GitHub." | Spixi is moving away from MIT (#1262). |
| Phone number | "No phone number. No email. No servers." | "No phone number. No email. Your account is a key on your phone." | the "No servers" part (row 1). |

## 2 · Pages the app links to today
| App place | Opens | Status 2026-10-08 |
|---|---|---|
| Home › update card › "How to update" | `https://www.spixi.io/download.html` (`Config.updateHelpUrl`) | Live. Bugs: the big "Download for Windows" button links to `#`; the APK / Windows links point at v0.9.22. |
| Account › About › Website | `https://www.spixi.io` | Live. |
| Account › About › Ixian network | `https://www.ixian.io` | Live. |
| Account › About › Source code | `https://github.com/ixian-platform/Spixi` | Live. |
| Account › How to use › Help centre | `https://www.spixi.io/help-center.html` | Live, but NO articles (the topic list is empty). |
| Home › tip "Decentralized" › Learn more | `https://www.ixian.io` (`Config.networkHelpUrl`) | Interim (#1267) until the new site has the article below. |
| Account › About › Privacy / Terms | in-app sheets (English), not the web | — |

Every web target is a constant in the app's C# (`Spixi/Meta/Config.cs`); changing one needs an app release. So the new site should keep these URLs alive or redirect them.

## 3 · Help articles the app wants (and the anchor each needs)
Proposal: one help page per topic under `/help/`. A stable URL per article matters more than the layout. When an article exists, the app switches its link in one release.

| # | App surface | Article title | Proposed URL | Must explain |
|---|---|---|---|---|
| 1 | Tip "Decentralized" | How Spixi works without a central server | `/help/decentralized.html` | The Ixian DLT + S2 overlay; the push relay for offline contacts (what it sees: an encrypted payload, a device token). |
| 2 | Tip "End-to-end encrypted" (HELD until this exists) | End-to-end encryption in Spixi | `/help/encryption.html` | Who can read a message; what is on the phone unencrypted (history); keys never leave the device. |
| 3 | Tip "Ready for quantum computers" | Post-quantum encryption | `/help/encryption.html#post-quantum` | BOTH paths: ML-KEM-1024 between current apps, RSA-4096 with older ones; how to tell which one a chat uses (if the app shows it). |
| 4 | Tip "No phone number" | Your account is a key | `/help/account.html` | No phone number / email; the account = the key on the device; lose the phone without a backup = lose the account. |
| 5 | Tip "Your backup is your account" | Back up and restore | `/help/backup.html` | The encrypted backup file, the password, restore steps per platform. |
| 6 | Tip "Money like a message" | Send and request IXI | `/help/payments.html` | Send / Request in a chat, the native confirm, fees, the fiat line. |
| 7 | Tip "Mini apps in chats" | Mini apps | `/mini-apps.html` (exists) | — |
| 8 | Tip "Add people in person" | Add a contact | `/help/contacts.html` | QR scan, address, contact requests. |
| 9 | Tip "Say thanks with a tip" | Tips | `/help/payments.html#tips` | Tip from a message menu. |
| 10 | Update card | How to update Spixi | `/download.html` (exists) | One page for every platform: stores, APK, Windows, Mac; how to see your version (Account › About). |
| 11 | How to use › Help centre | Help centre index | `/help-center.html` (exists, empty) | Links to articles 1–9. |
| 12 | How to use (6 steps) | Getting started | `/help/getting-started.html` | The same six steps as the app: start a chat · add by QR · send IXI · mini apps · back up · stay private. |

## 4 · Notes
- English first; the app is translated into 12 languages — the site can start English-only.
- The app never opens a URL that a web page or a chat supplies for these surfaces; only these constants.
