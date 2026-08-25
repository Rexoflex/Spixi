# F5 VERDICT — 2026-08-27, iOS device pass. iPhone 15 / iOS 26.6, build `eeed6549`.

**48 pass · 14 fail · 2 n/a · 1 not walked** of 65.
Damir on hardware, office Mac. Sheet: `docs/f5-checklist-2026-08-27-ios-office.md`.
Covers #576–#583 (walk-day), #589/#590 (queued FE), #591/#592 (details) and the
notification confirmation. ★ **The first iOS pass since `3d6703a7` — four batches blind.**

★ Headline: **push is confirmed working and reliable on iOS** (C1–C3 pass). The failures
are concentrated in two places: the **lifted row**, which does not work on iOS at all, and
the **wallet/tip numpad**, which carries four separate defects on the money path.

---

## 1. ★★ SEVERITY 1 — the bot-group hang. NEW, iOS-only.

From row 35's notes. This was not what row 35 tested; it was found alongside it.

| | |
|---|---|
| Repro | Join the Spixi bot group on iOS |
| Symptom | The group takes **minutes** to load all messages. ★ **The app FREEZES during the load.** On Android the same group is **10 seconds max** |
| After a restart | The group chat **does not load to the final message** |
| Platform | ★ **iOS only.** Android is 10 s and does not freeze |

⚠ A freeze on the main thread during a bulk message load is a launch blocker, not a polish
row. The Android/iOS split (10 s vs minutes) says this is not the volume of messages — it
is what iOS does with them. Suspect the same per-message `EvaluateJavaScriptAsync` fan-out
already noted in `Config.cs:58` ("Opening a chat pushes ONE EvaluateJavaScriptAsync per
message"), which the be-cutover row wants batched.

★ **Needs its own batch and its own repro doc. Do not fold it into a polish round.**

## 2. ★ SEVERITY 1 — the keyboard cannot be dismissed during onboarding. NEW.

Also from row 35's notes, also not what the row tested.

| | |
|---|---|
| Repro | Create an account, or restore one |
| Symptom | The keyboard **cannot be dismissed** |
| Consequence | It covers the flow. This is the first screen a new user ever sees |

⚠ Same family as the tip-sheet numpad in §5. Both are "the keyboard owns the screen and
there is no way out".

## 3. SEVERITY 2 — confirmed defects

| Row | What | Note |
|---|---|---|
| **33** | A muted contact **still produces a missed-call notification** after a force-stop + cold boot | The mute gate does not reach the call path |
| **C8** | Tapping a notification lands on the **chats list**, not the chat it came from | The push carries `fa` (the sender address) — the tap handler is not routing on it |
| **C2** ⚠ | The launcher badge **resets to 1** on every push while the app is killed, instead of accumulating | The payload says `Increment by 1`; something is setting rather than incrementing. Backgrounding and returning updates it correctly |
| **B1.7** | The address row on contact details has **no press feedback** on iOS | It presses on other platforms |
| **35b** | The **backup prompt does not fire** when a new contact is added | ⚠ Was this ever the agreed trigger? Needs confirming before it is called a defect |

## 4. ★★ THE LIFTED ROW — fails on iOS, and Damir wants the ring gone

Rows **A2.1, A2.2, 12, 15** — four rows, one defect.

| Row | Result |
|---|---|
| A2.1 | ★ fail — **dark AND light: the row does not lift on iOS at all** |
| A2.2 | fail — same |
| 12 | fail — **the chat row sits BEHIND the dim on iOS.** Works on Android |
| 15 | fail — a pinned row keeps its colour but **does not lift** |

★ **This is the fourth round on this row** (#572 → #579 → #589 → here). Every previous
round was measured or walked on Android. **It has never once been walked on iOS.**

⚠ **Damir's decision, recorded:** *"please remove the ring on both android and iOS, it's
not looking good, and it gets cut off on the sides. It's not appropriate for a chat app
and this action."*

So the row needs BOTH:
1. the **ring removed** on every platform — his call, and it also removes the "is it lifted
   or selected?" ambiguity the last round asked about;
2. the **lift made to work on iOS**, where the elevation is what will have to carry it,
   since the ring is going.

★ The dark-mode contrast finding stands (one neutral step is 1.10:1 on a black list), so
with the ring gone, dark mode needs a real elevation treatment, not a tint.

## 5. ★★ THE NUMPAD — four defects, and two are on the money path

All from row A4.3. ⚠ **Wallet-send is the money path and the standing rule keeps it last —
but these are input defects, not the send flip.**

| # | What | Where |
|---|---|---|
| 5a | ★ The numpad **hides the tip sheet**. The sheet does not move up | Tip sheet |
| 5b | ★ The numpad is **not dismissable** — "it's difficult to choose the recipient" | Wallet-send |
| 5c | ★ Typing the decimal comma **does not move the caret**: typing `1`, `,`, `4` yields **`14.`** instead of `1.4` | Wallet-send. ⚠ A silent wrong-amount defect |
| 5d | There is **only a comma**, no locale-correct separator handling | Both |

★ **5c is the serious one.** A user types an amount and the field shows a different number.
Nothing warns them. That is the same class as the composer lock (#275) and #503 — a path
that runs and quietly produces the wrong result.

## 6. i18n — German overflows

Row A4.3, and Damir will send a screenshot.

| What | Detail |
|---|---|
| The tip sheet copy **does not fit** in de-de | |
| ★ "Tip user" is **repeated** to the right of the nickname, in the same font | Looks like a duplicated title, not a label |
| The **custom amount overflows** in German | "likely in other languages too" |

## 7. ★ DECISIONS OWED BY DAMIR — nothing moves until these land

| # | Question | His stated lean |
|---|---|---|
| D1 | **The details cover** (B1.1, B1.2) | ★ **"Remove it for now."** It has no lower edge, and for contacts with no photo the avatar is one colour and the cover becomes a full-bleed wash of the same green. He will fix it in another session — but the batch should retire it, not polish it |
| D2 | **The ring** on the lifted row | ★ **Remove on Android AND iOS** (§4) |
| D3 | **"Show sender name"** (A6.1, A6.2) | ★ See §9. He did not agree to lose it on MOBILE |
| D4 | The address sheet layout (B1.5, A1.2, A1.7) | Info block too close to the title, then a large gap, then the QR at the bottom. **A1.7 reads as a hole — confirmed on device.** He will send a screenshot |
| D5 | The safety block (A1.8) | ★ "Give it some colour — inverse the background, or the info as text" |

## 8. Small, cheap, and new

| Row | What |
|---|---|
| **B4.1 note** ★ NEW | In the **Contacts list**, pressing and holding on the **filter chips** lets you drag that row up and down. It ends up **cut off** at the top or the bottom. The chip row should not be vertically draggable |
| **A1.1 note** ★ NEW | The **Account screen keeps its scroll anchor** when you leave to Chats/Wallet/Apps and come back. ⚠ Damir: that should only happen when returning from an Account SUBSCREEN, not from a peer tab |
| **16** | A declined call is missing its **glyph in the chats excerpt**. Other call events have one |
| **19** | An answered call shows "Voice call" with **no duration** in the row. Damir: "it's ok" |
| **A4.2** | The **tip sheet truncates the nickname** middle-out like an address, and there is room for nearly the whole name. ⚠ The **Request sheet does this correctly** — copy that |
| **A7.1** | The mini-app press rectangle is ★ **Android-only**. Not reproducible on iOS. It follows the list/grid shape. Too fast to screenshot (#294 still unmet) |
| **B1.6** | The "their address" copy could be better — for the copy-polish pass |

## 9. ★ ANSWERED — the two questions in the notes

**A6.1 / A6.2 — "why is 'Show sender name' gone on mobile? When did we say that?"**

You did say it, on 2026-08-26. `f5-findings-2026-08-26-walkday.md:160`:

> *"**Desktop** Account → Notifications: 'show sender name' is redundant — Damir's call —
> remove the row."*

★ **But the finding was scoped to DESKTOP and the fix removed the row on every platform.**
That is a scope widening, not a misremembering. The preference still exists in
`SNotificationPrefs` — only the UI to reach it was deleted, plus a one-shot migration that
resets anyone who had it ON. **D3 is now: restore the row on mobile, or confirm the wider
removal.** ⚠ And #589's own open question is still unanswered: was that switch ever in a
build a real user ran? If not, delete the migration too.

**C7 — the sound.**

⚠ **The checklist row was imprecise and is withdrawn as written.** `SPushService.cs:345`
sets `content.Sound = UNNotificationSound.Default` and the OneSignal payload also carries
`Sound: Default`, so a notification SHOULD sound. The four outstanding assets are **custom
effect files**, and the send/receive effects Damir heard in-chat are `playEffect`
(`SPlatformUtils.cs:163`) — a different system that is working.

★ **Still unknown, and it is a one-line answer:** when the notification arrived on the
LOCK SCREEN, did the phone make a sound? Re-walk C7 with that question only.

## 10. What this pass taught

* ★ **Four batches without an iOS device produced four rows that fail only on iOS.** The
  lifted row was measured, reviewed and walked three times — on Android — and does not work
  at all on the other platform.
* ★ **A finding scoped to one platform became a fix applied to all of them.** The
  sender-name row said "Desktop" in its own text (§9).
* ★ **The richest findings came from the notes, not the results.** The bot-group freeze and
  the onboarding keyboard are both SEVERITY 1 and both arrived as asides on row 35, which
  was testing something else.
* ★ **"It's a pass, but…" is where the work is.** Eleven passing rows carry notes. The
  address sheet passed every functional row and still needs a redesign.

---

## 11. ★ DECISIONS — ANSWERED 2026-08-27, by Damir

| # | Question | ★ ANSWER |
|---|---|---|
| **D1** | The contact-details cover | ★ **REMOVE IT for v1.** Do not polish it. It has no lower edge, and for a contact with no photo it becomes a full-bleed wash of the avatar's own colour. A replacement is a later design job |
| **D2** | The ring on the lifted row | ★ **REMOVE on Android AND iOS.** ⚠ It must ship WITH the iOS lift fix, never before it — see §4 |
| **D3** | "Show sender name" | ★ **RESTORE the row on MOBILE. Keep it removed on DESKTOP.** That is what the 26 Aug finding actually asked for |
| **D4** | The address sheet layout | Open. Damir owes a screenshot. The spacing half (info block too close to the title, the gap above the QR) can proceed without it |
| **D5** | The safety block | ★ Give it colour — inverse the background, or the info as text. Damir's steer, exact treatment is the batch's call |
| **Numpad** | Is wallet-send in scope, against the standing "wallet-send stays LAST" rule? | ★ **YES — fix all four, wallet-send included.** The standing rule is about the SEND-FLOW redesign, not about input defects that corrupt what the user typed. §5c silently changes the amount |

★ **Note on D2.** With the ring gone, dark mode has no lift signal left: the measurement
from the last round says one neutral step is **1.10:1** on a black list. So removing the
ring makes a real ELEVATION treatment mandatory in dark, not optional. Ring-removal alone
would leave the row flatter than before.
