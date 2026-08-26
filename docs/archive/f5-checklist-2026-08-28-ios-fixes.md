# F5 checklist — the 2026-08-27 iOS pass, fixed. Batch #596–#615.

**LANGUAGE RULE: ASD-STE100.** See `CLAUDE.md`.

★ Damir is on **Windows and Android** first, **iOS at the office** later. The table says
which rows can be closed where. Rows marked ★ iOS are **UNVERIFIED** — they were built
from the code, not from a screen, and the batch says so in its own comments.

## 0 · Build

C# changed in 7 files (`Utils`, `SpixiContentPage`, `HomePage`, `SingleChatPage`,
`ContactDetails`, `LaunchPage`, `VoIPManager`, `SNotificationPrefs`, `App`) →
**wipe `Spixi/obj` and `Spixi/bin`** (#387).

```
node scripts/extract-strings.mjs      # expect 773 keys · 0 fallback conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs    # expect 297 exports   ← BUNDLE BEFORE SHELLS
node scripts/build-shells.mjs         # expect 18 shells
node scripts/smoke-test.mjs           # expect BASELINE OK 3274 / the 3 known
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/verify-locales.mjs
```

⚠ **`src/components/amount-keyboard.js` is a NEW file — `git add` it.**
All of the above ran green in the cloud container; your run is the pre-commit confirmation.

---

## A · Windows and Android — closable tonight

| # | Do | Expect |
|---|---|---|
| A1 | Chats list, **long-press a row**, dark AND light | the row lifts, and **there is no ring** — a lighter ground plus a shadow. In dark it should read as a step up, not as a tint. ⚠ EYEBALL: is it enough without the ring? |
| A2 | Same, on a **pinned** row and on a row with an open swipe drawer | it lifts, keeps its own colour, and no translucent band flashes through as the drawer springs back |
| A3 | Long-press, then tap the dim | the menu closes and the row returns. Nothing is left lit or untappable |
| A4 | **Contacts** (FAB → Start chat), press and hold the **People / Groups chips** and drag up | the chip row **does not move**. It still scrolls sideways |
| A5 | **Account**, scroll down, tap Chats, tap Account again | it opens **at the top**. Then: Account → Backup → back → it returns **where you were** |
| A6 | **Account → Notifications** | **three** switches on the phone: Allow notifications · Show sender name · In-app sounds. Toggle Show sender name ON, force-quit, reopen — **it is still ON** |
| A7 | Windows: **Account → Notifications** | **two** switches. No "Show sender name" |
| A8 | Wallet → **Send**, tap the amount | the keyboard comes up, the screen can be **scrolled to Review**, and a tap on any empty part of the screen **closes the keyboard** |
| A9 | ★★ Wallet → Send, type **1** then **,** then **4** | the field reads **1.4** (or **1,4** in de-de) — **not 14**. Then Deutsch, type **1 . 4** → **1,4** |
| A10 | Chat → a message → **Tip**, tap Custom | the sheet **rises above the keyboard** — chips, field and button all reachable — and a tap on the sheet closes the keyboard |
| A11 | Deutsch, same tip sheet | the **fourth chip is not cut off** (it wraps to a second row), and the title reads as a **name and then an action** — the name bold, the verb a step back in weight and ink |
| A11b ⚠ DIAL | English, the same chip row | ⚠ EYEBALL. The chips are **no longer equal width** (measured 74/74/86/103 against a uniform 84.3 before) — that is what lets the German one wrap instead of clipping. Keep, or reverse it and let the label ellipsise instead? One declaration either way |
| A12 | Chat → tip a group member with no nickname | the title shows a **short** address, not an ellipsised one printed as if it were a name |
| A13 | A **declined** call, then look at the chats list row | the excerpt has a **glyph** (a crossed phone), in the normal ink — not red |
| A14 | **Mute** a contact, have them call you, do not answer | **no missed-call notification.** The call still appears in the chat |
| A14b ⚠ DIAL | Turn the GLOBAL notifications master OFF, receive a call, do not answer | the phone **rings** (calls deliberately ignore the master) and there is **no missed-call row**. Is that what you want, or should the master gate the ring too? |
| A22 | Wallet → **Receive**, type an amount, then tap **"Show my address"** | the sheet opens **fully on screen** with its Close button reachable. ★ This one was broken by the first cut of the keyboard fix and caught before it shipped |
| A23 | Wallet → Send, tap the amount, then **drag to scroll** the screen | the keyboard **stays up** while you scroll. Only a tap dismisses it |
| A24 | The Spixi bot group → a message → the ⋮ menu | ⚠ if the room hides addresses there is **no Tip option** (C# would refuse it) — and no "add contact" in the member sheet, because C# refuses that for every bot |
| A15 | Create account: tap Nickname | the **Create** button stays visible above the keyboard, and a tap on the background closes the keyboard |
| A16 | On create/restore, open **Terms**, press hardware back | the **sheet closes** and you stay on the same view. Press back again → **welcome** |
| A17 | ★★ Open the **Spixi bot group**, then its info | ⚠ **REWRITTEN 2026-08-28.** The device symptom was NOT "Hidden member" — it was nothing at all, with every avatar disc the same colour. Expect now: every sender shows a **nickname**, or a **truncated address** when they have none, and the discs are **different colours** (the hue is derived from the address, so one uniform colour means no address arrived). Tap a member: the sheet opens. Admin: kick/ban are live |
| A17b | ★★ Open the bot group and **time it** | it appears **immediately**, with skeletons while data loads — not after a 4-5 second freeze. Then tap **info** straight away: it should open at once, because it was only ever queued behind that freeze |
| A17c | Open the bot group, then a **1:1** chat, then back | the 1:1 still opens instantly and its messages are all there — the wait that moved is shared code, so this is the did-I-break-it half |
| A18 | A **private blind group**, same check | members are **still** masked. Blindness must still work where it belongs |
| A19 | Contact details, any contact | **no cover band** behind the avatar. The avatar and the name are unchanged |
| A19b | ★ Contact details — look at **Delete chat history** and **Remove contact** | they are now **ordinary rows** like the ones below them: disc, label, chevron, on a card. Same grammar as the Account hub. The disc colour still carries the tier — neutral for delete, red for remove |
| A20 | Account → your address row → the sheet | it **hugs its content** — no large gap above the QR — there is space under the title, and the green safety block is clearly its own card |
| A21 | Open a **multi-user mini app** from the Apps tab (Android) | ⚠ EYEBALL, this one is unverified: no pressed-row rectangle flashes over the picker |

## B · ★ iOS only — the office Mac

| # | Do | Expect |
|---|---|---|
| B1 | ★★ Chats list, long-press a row, **dark and light** | the row **lifts above the dim**. This is the fourth round on it and the first fix that does not depend on a z-index race — if it still fails, run `document.elementFromPoint()` over the row's centre with the menu open and report what it names |
| B2 | Row 12's chat (the one that sat behind the dim) and a **pinned** row | both lift |
| B3 | Wallet → Send, tap the amount | Review is reachable and a tap outside closes the keyboard |
| B4 | Tip → Custom | the sheet rises; nothing is behind the pad |
| B5 | Create account, tap Nickname | the Create button is above the keyboard, and a tap dismisses it |
| B6 | Kill the app, get a message, **tap the notification** | it opens **that chat**, not the chats list. ⚠ If it lands on the list, say whether the app was **cold** and whether a lock was showing — that separates the fixed half from the known one |
| B7 | Contact details → the address row, press and hold | it presses (row B1.7 — no change was made for this; report it again either way) |
| B8 | The Spixi bot group | A17 and the freeze (§1 of the verdict) — the freeze is **NOT fixed**; see `docs/bot-group-load-freeze.md` |

---

## What was NOT fixed, and why

| | |
|---|---|
| **C2 — the badge resets to 1** | ★ Not fixable in the app. APNs `aps.badge` is an ABSOLUTE number; "increment" is something OneSignal implements **inside the NotificationServiceExtension**, using an App Group that does not exist at Apple yet. While the app is killed no code of ours runs. The only extension-free alternative is the push server sending a correct absolute badge, which it cannot do — it is a blind relay of an encrypted blob. **BE row.** |
| **C8, the other half** | On iOS a tap on a **local** notification has no owner: `fa` is written into `UserInfo` and nothing reads it, because the `UNUserNotificationCenter` delegate was deleted in the iOS-27 crash fix and OneSignal's `Clicked` event fires only for OneSignal rows. Remote taps are fixed (#612). Local rows need a delegate owner — its own batch, with the #280/#281 crash history in front of it |
| **The bot-group freeze** | Investigated and written, not built: `docs/bot-group-load-freeze.md`. It has a named cause (a 5-second `Thread.Sleep` on the UI thread, groups and bots only) and needs instrumentation before a fix |
| **Swipe-back everywhere** | Specced, not built: `docs/swipe-back-spec.md`. ~55-60 surfaces, and the real gap is that **iOS receives no back signal at all** |
| **The tip refusal in a flagged bot room** | Left alone on purpose. It is the money path, and whether a flagged room's roster addresses are real or derived is not answerable from the tree (#215) |

## Report as

`row = pass | fail | n/a`, and a sentence for every ⚠ EYEBALL row (A1, A20, A21).
