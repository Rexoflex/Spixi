# F5 scenarios — the 2026-08-20 batch. Scenario · what should happen · what a failure means.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Companion to `docs/f5-checklist-2026-08-20-overnight.md`, which has the BUILD steps. This
file is the test matrix. Build first, then work down this sheet.

★ Many of these are **negative** tests — the fix is that something no longer happens. A
negative test that "looks fine" is only a pass if you actually created the condition.

**Legend:** 🔴 blocks the batch · 🟡 tell me, does not block · ⬜ ordinary check
**Devices:** 1️⃣ one phone · 2️⃣ needs a second device

---

## A. Before you start

| | Set this up | Why |
|---|---|---|
| A1 | Spixi is the NEW build — Account → About shows the version, and Wallet → a transaction shows a **See details** row | If there is no See details, the package is stale and every result below is void |
| A2 | You have at least one transaction in the wallet, one contact, and one group | Half the sheet needs them |
| A3 | Note whether the app lock is currently ON or OFF | §C switches it deliberately; §D and §E want it OFF so it does not interrupt |

---

## B. 🔴 §5b — the "Sent to" header (#449). DO THIS FIRST, it is thirty seconds

I could not reproduce this from source. Both surfaces already truncate, and the tx detail
page has since **#276**, which closed this exact complaint. So the leading suspect is a
**stale `Resources\Raw\html` package**, which the clean wipe should have just ruled out.

| | Scenario | Should happen | If not |
|---|---|---|---|
| B1 🔴 1️⃣ | Wallet. Look at the transaction ROW in the list, **before** tapping it | Reads `4JsLSm…bncdFa` — six characters, ellipsis, six characters | Row full too → the shared truncation is not running at all; send me the row |
| B2 🔴 1️⃣ | Now tap it. Read the header above the amount | `Sent to 4JsLSm…bncdFa` | Row truncated but header full → it is the detail surface alone, not the shared component |
| B3 🔴 1️⃣ | Look at the **Recipient's address** row below | The FULL address, with a working copy button | This row is the sanctioned place for the full value — it must not be truncated |
| B4 🟡 1️⃣ | A transaction to someone who IS a named contact | Header shows the NICKNAME, not an address | |

★ If B2 still shows the full address on this clean build, C# is pushing a `username` that
is not base58-clean — a trailing space, a checksum suffix, a stray character. Send me a
screenshot of the header and I fix it at the C# push, not at either regex.

---

## C. 🔴 THE LOCK EXPOSURE (#442) — the headline of this batch

**Turn the app lock ON first.** Everything in this section is void with it off.

The defect: with the lock on, returning to Spixi painted your full chat list for about a
second before the lock appeared. The fix covers the screen synchronously at resume.

### C1. The core case, and every surface it must cover

| | Scenario | Should happen | If not |
|---|---|---|---|
| C1.1 🔴 | On the chats list. Background the app. Wait 10 s. Return | Dark screen, then the lock, then biometrics. **Your chat list is never visible** | The shield is not going down at resume |
| C1.2 🔴 | Same, but from an OPEN CONVERSATION | The conversation is never visible | An overlay surface is not covered |
| C1.3 🔴 | Same, but from the Wallet tab | The balance is never visible | |
| C1.4 🔴 | Same, but from Account, Backup or Downloads | Nothing readable before the lock | A pushed page is not covered |
| C1.5 🔴 | Same, but with a SHEET or dialog open — the attach sheet, a tx sheet | Nothing readable | The modal stack is not covered |
| C1.6 🟡 | Same, but during a live call if you can arrange one | The call surface is covered too | #272 says the lock outranks the ring |

### C2. The task switcher

| | Scenario | Should happen | If not |
|---|---|---|---|
| C2.1 🟡 | Background Spixi with the lock ON. Open the task switcher and look at the Spixi thumbnail | Dark, not your chat list | 🟡 **This is the half I could NOT verify.** Whether a view added at OnSleep reaches the Android snapshot is unproven — the canonical mechanism is FLAG_SECURE, which also blocks screenshots, so it is deliberately not used. Tell me either way; the answer decides whether we need FLAG_SECURE |

### C3. It must NOT over-trigger

| | Scenario | Should happen | If not |
|---|---|---|---|
| C3.1 🔴 | Turn the lock **OFF**. Background and return several times | **No dark flash at all.** Completely normal | The OnSleep guard is wrong |
| C3.2 🟡 | Lock ON. Background for LESS than 5 s and return | No lock — the cooldown. ⚠ You WILL see the dark cover briefly. That is the known dial: a protected thumbnail costs a dark frame on short switches. **Tell me if you want it traded back** | |
| C3.3 🔴 | Lock ON. Send a photo — tap attach, pick an image from the gallery, come back | **No lock.** A picker round trip is one continuous flow, suppressed for 5 minutes (#334) | If it locks, the own-intent suppression broke |
| C3.4 🔴 | Unlock normally | The app appears at once. **No leftover dark screen** | The shield is stranded — this is one of the three regressions the review caught |
| C3.5 🔴 | Background WHILE the lock screen is showing. Return. Unlock | The password field is never covered, and nothing opaque is left after the unlock | Same class as C3.4 |

### C4. ★ The discriminator I need answered

| | Scenario | Should happen | What it means |
|---|---|---|---|
| C4.1 🔴 | Force-stop Spixi. Launch it COLD with the lock on | The lock appears with no chat list behind it | **If the chat list flashes here too**, the cold path is implicated and `MainPage` assignment is not doing what the code says. That is a different bug and I want to know |

---

## D. THE WALLET

### D1. 🔴 The blockchain-scan strip (#444) — mostly a negative test

It appears only when the client is genuinely behind: more than 20 blocks. A synced phone
must see **nothing**.

| | Scenario | Should happen | If not |
|---|---|---|---|
| D1.1 🔴 | Open Wallet on this phone, which has been running and is current | **Nothing.** No strip, no bar at 100%, no "0%" | A strip on a synced client means the lag threshold is wrong. Screenshot it with the percentage |
| D1.2 🔴 | Stay on the Wallet tab for two full minutes and watch | The strip never blinks in and out | Flapping means the hysteresis is defeated |
| D1.3 ⬜ | Turn the network OFF. Force-stop. Relaunch. Open Wallet | "Looking for your transactions", a moving bar, and **no percentage at all** | A "0%" here is the exact trap the component exists to prevent |
| D1.4 ⬜ | Turn the network back ON | It either disappears, or shows a percentage that climbs | |
| D1.5 ⬜ | Leave the app closed a few hours, or restore an account, then open Wallet | A percentage climbing from a low number, disappearing when it finishes | |
| D1.6 ⬜ | Watch it climb | It STEPS rather than glides | Correct — headers arrive 250 at a time. Smoothing it would be a lie |
| D1.7 🟡 | Look at it beside the balance | **Art call.** It should read as a quiet status strip, not a second hero. Does it compete? | |
| D1.8 🟡 | Read the copy | **Copy call.** It avoids "syncing the blockchain" on purpose — the app walks block HEADERS looking for YOUR transactions. Sign it off or rewrite it | |

### D2. Transaction details (N25) and the explorer button

| | Scenario | Should happen | If not |
|---|---|---|---|
| D2.1 🔴 | Wallet, tap a transaction | Who, how much and the status at a glance. Address, date, fee and transaction ID are behind **See details** | |
| D2.2 🔴 | Tap **See details** | Expands below, chevron turns, label becomes **Hide details** | |
| D2.3 🔴 | Tap **View transaction on Explorer** | The browser opens **that transaction**. Not your address | Opening your address means the new verb is not wired |
| D2.4 🔴 | Open the transaction DETAIL page — on desktop, or the pushed page | Address, fee and ID shown **open**. No disclosure there | That page exists for those fields; hiding them inverts it |
| D2.5 ⬜ | Hide the balance with the eye, then open a transaction | Amounts masked. **Show amounts** reveals this view only | |
| D2.6 ⬜ | With amounts revealed, expand See details, then tap Show amounts again | The drawer does not collapse under you | |
| D2.7 🔴 | Tap **Missing a transaction?** | The sheet now says something concrete about the scan state | |
| D2.8 🔴 | In that sheet, tap **View all transactions on Explorer** | Opens your **ADDRESS**. That one is correct — it is a different question | |
| D2.9 ⬜ | Copy buttons on the address row and the transaction ID | Both copy, both show the tick morph | |

### D3. N43 — the wallet search bar

| | Scenario | Should happen | If not |
|---|---|---|---|
| D3.1 🔴 | Scroll the transaction list down | Search and filters **stay**. The balance hero still collapses | The hero collapse is a different affordance and must survive |
| D3.2 🟡 | Keep scrolling | ⚠ The row still scrolls out of view with the list — only the animated tuck is gone. **Scope call: is "never hides" supposed to mean sticky?** | |
| D3.3 ⬜ | Type a query, then scroll | The row pins at the top while a query is live | |

---

## E. CONTACTS AND CHAT

### E1. 🔴 Add contact (#435) — the tick-and-error contradiction

| | Scenario | Should happen | If not |
|---|---|---|---|
| E1.1 🔴 | Add contact. Type a valid address you do NOT have | Green tick. Send enabled | |
| E1.2 🔴 | Type an address you ALREADY have | A line naming the contact, a **View contact** button, **no green tick**, **no red error**, and Send is **disabled** | A tick and an error together is the original bug |
| E1.3 🔴 | Tap **View contact** | That contact opens. On a wide window it lands in the SAME column the form used, not a full takeover | |
| E1.4 🔴 | Type your OWN address | "This is your own address." No View button, Send disabled | |
| E1.5 🔴 | Edit the field after E1.2 | The panel clears and Send comes back | |
| E1.6 🔴 | Paste a known address, then quickly paste a NEW one before the first answer lands | The new address gets a tick, **not** "already in your contacts" | This stale-answer race was a review find |
| E1.7 ⬜ | Type obvious garbage — too short, spaces | Inline error, no native alert | |
| E1.8 ⬜ | Scan a QR | Fills the field and re-validates | |

### E2. 🔴 The connected chip (#434) — needs a second device

| | Scenario | Should happen | If not |
|---|---|---|---|
| E2.1 🔴 2️⃣ | B sends A a contact request. **A accepts from the chats-list card** | A's chat shows **"You are now connected with …"** as a centred chip | No line at all is the original bug |
| E2.2 🔴 2️⃣ | Immediately after E2.1, look at A's chats list and the bottom nav | **No unread badge** on that row, **no badge** on the nav | An unread badge for your own action was a review find |
| E2.3 🔴 2️⃣ | Also check the notification shade | **No "New Message" notification** | Same find |
| E2.4 🔴 2️⃣ | Repeat, but A accepts from INSIDE the chat | The same chip. **Once**, not twice | |
| E2.5 🔴 2️⃣ | Look at the chip on B's side too | B also sees "You are now connected with …" — one sentence, both directions | |
| E2.6 🔴 1️⃣ | Open an OLD chat that already has the old "has accepted your contact request" line | Still a centred chip, **not** a plain bubble | The legacy sentence must keep matching |
| E2.7 ⬜ 1️⃣ | Look at the chip's status | It carries **no** "sending" clock glyph | That was the second review find |

### E3. Chat regression — I changed how every message is pushed

| | Scenario | Should happen | If not |
|---|---|---|---|
| E3.1 🔴 | Long-press any message | There is **no Reply item**. The carrier is held for the BE cutover | A Reply item would silently drop the quote |
| E3.2 🔴 | Send and receive in a 1:1 chat | Arrives. One tick, then two | |
| E3.3 🔴 | Send and receive in a GROUP | Arrives | |
| E3.4 🔴 | Send in a bot room | Arrives | |
| E3.5 🔴 | Send to a PAID bot | Charged as before, wallet glyph appears | |
| E3.6 ⬜ | Send a long message, and one with emoji and CJK | Arrives intact | |
| E3.7 ⬜ | Force-quit, reopen the chat | History intact, nothing malformed | |
| E3.8 ⬜ | React, tip, delete, copy from the message menu | All unchanged | |
| E3.9 ⬜ | @-mention someone in a group | Picker works, the FAB jumps and pulses | I refactored the jump — this is the regression test |

---

## F. N43 — the search bars everywhere else

| | Scenario | Should happen | If not |
|---|---|---|---|
| F1 🔴 | Chats, scroll down | The search bar and the filter chips do **not** tuck away | |
| F2 🔴 | Apps with **nothing installed** | The search row **is there** | This is the half you named explicitly |
| F3 🔴 | Switch to the Apps tab and watch it closely | The search row does not appear-then-vanish. **This is the "apps flicker" you reported** — one bug, not two | |
| F4 ⬜ | Apps with apps installed, switch away and back | The row never blinks | |

---

## G. ACCOUNT

| | Scenario | Should happen | If not |
|---|---|---|---|
| G1 🔴 | Account → Preferences | A **Contacts** row is there | |
| G2 🔴 | Tap it | You land on **Chats** with the contacts directory open | |
| G3 🔴 | The ⓘ beside your address | A sheet on the phone, a centred dialog on desktop | |
| G4 🟡 | Read that copy | **Copy call — it is a draft.** It deliberately does NOT claim the address hides anything, because an Ixian address is public and its balance is visible in any explorer. The honest promise is about wallet ACCESS. Rewrite it if you want | |
| G5 ⬜ | Copy and share the address | Both still work. Share is mobile-only by design | |
| G6 ⬜ | The QR | Renders, scannable | |
| G7 🟡 | Rate-me (N80) | Should **not** appear before your 5th app open. Hard to force — just confirm it does not nag you now | |

---

## H. LANGUAGES (#445)

| | Scenario | Should happen |
|---|---|---|
| H1 🔴 | Account → Language → **Deutsch**. Walk chats, wallet, account, add-contact | Everything translated, including all the new strings |
| H2 🔴 | The connected chip in German | "Du bist jetzt mit … verbunden." |
| H3 🔴 | A transaction → the explorer button in German | "Transaktion im Explorer anzeigen" |
| H4 🔴 | Add contact → a known address, in German | "… ist bereits in deinen Kontakten." |
| H5 ⬜ | The scan strip in German, if you can trigger it | "Suche nach deinen Transaktionen" |
| H6 ⬜ | Now **Slovenščina**, same walk | Same coverage |
| H7 ⬜ | Switch back to English | Nothing stuck in the previous language |
| H8 🟡 | 中文 or Lietuvių, wallet → the explorer button | ⚠ Both render "Explorer" as *web browser*. Inherited wording, but this batch puts it on a second button. **Terminology call** |

---

## I. REGRESSION SWEEP — things I touched indirectly

| | Scenario | Should happen |
|---|---|---|
| I1 🔴 | All four tabs, back and forth several times | No blank screens, no stuck spinners, no flicker |
| I2 🔴 | Theme: Account → Theme → Light, then Dark, then System | Every surface follows. The lock stays dark in both |
| I3 ⬜ | Flip the OS theme with Spixi open | The app follows without throwing you back to Chats |
| I4 ⬜ | Wallet → Send, and Receive | Unchanged |
| I5 ⬜ | Backup, Downloads, About, How to use | All open |
| I6 ⬜ | A mini app | Opens and runs |
| I7 ⬜ | Rotate the phone on chats, wallet and a conversation | No layout breakage |
| I8 ⬜ | Airplane mode on, then off | The connecting line appears and clears |
| I9 🟡 | N70 — the update notice after starting OFFLINE | Only testable with a real newer version on the update server. Skip unless you have one |

---

## J. WHAT TO SEND ME

For anything that fails:

1. **Which line number** — C1.2, D1.1, and so on.
2. **A screenshot** if it is visual.
3. **Whether it survived a clean wipe and rebuild** — this decides "stale package" versus "real bug" more often than anything else, and it is why B is first.

For the four 🟡 judgement calls I need words rather than a pass or fail: **C2.1** the task
switcher, **C3.2** the dark cover on short switches, **D1.7 and D1.8** the strip's art and
copy, **G4** the address explainer copy, **D3.2** whether "never hides" means sticky, and
**H8** the Explorer wording.
