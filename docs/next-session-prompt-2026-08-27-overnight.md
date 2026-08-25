# Session brief — OVERNIGHT, from the 2026-08-27 iOS pass

**LANGUAGE RULE: ASD-STE100.** See `CLAUDE.md`.

★ **Read first:** `docs/f5-verdict-2026-08-27-ios.md` — 48 pass · 14 fail · 2 n/a of 65.
Sheet: `docs/f5-checklist-2026-08-27-ios-office.md`. Build walked: `eeed6549`.

---

## 0. ★★ The constraint that shapes this session

**Damir is at home: Windows and Android. iOS is at the office.**
Some of the worst rows in this pass **fail only on iOS and can not be verified here.**

| Row | Verify at home? |
|---|---|
| A2.1 · A2.2 · 12 · 15 — the lift | ★ **NO.** They PASS on Android. The defect is iOS-only |
| B1.7 — address-row press feedback | ★ **NO.** iOS-only |
| §1 — the bot-group freeze | ★ **NO.** Android is 10 s and does not freeze |
| §2 — the onboarding keyboard | ★ Probably not. Test on Android and say what you saw |
| A7.1 — the mini-app rectangle | ★ **YES — this one is Android-only** |
| Everything else | Yes |

★★ **THIS SESSION FIXES EVERYTHING IN THE LIST, iOS ROWS INCLUDED.** The table above is
NOT a scope cut. It says only which fixes you can PROVE here.

⚠ So: write every fix. For the iOS-only rows, mark them **UNVERIFIED** in the handoff and
say what you could not exercise. Do not write "pass" for a thing you never saw run.
★ Damir walks them on the Mac the next evening and closes them there.

## 1. Decisions already taken. Do not re-open them.

| | ★ Decision |
|---|---|
| The details cover | **REMOVE for v1.** Do not polish it |
| The ring on the lifted row | **REMOVE on Android AND iOS** — and it ships WITH the iOS lift fix, never before |
| "Show sender name" | **RESTORE on MOBILE, keep removed on DESKTOP** |
| The numpad, wallet-send included | **IN SCOPE.** The standing "wallet-send stays LAST" rule is about the send-flow redesign, not about input defects that corrupt the typed amount |

## 2. ★ The work, in priority order

### P1 — the lifted row. Fourth round. ⚠ Its own batch and its own audit.

Rows A2.1, A2.2, 12, 15 — one defect, four symptoms.

| | |
|---|---|
| Symptom | On iOS the row **does not lift at all**, dark or light. On row 12 it sits **BEHIND the dim**. A pinned row keeps its colour and still does not lift. All four pass on Android |
| Also do | **Remove the ring on both platforms** (Damir's call — it reads wrong for a chat app and it clips at the sides) |
| ★ The trap | Removing the ring removes the ONLY thing that worked in dark. One neutral step measures **1.10:1** on a black list. So dark mode needs a real **elevation** treatment — shadow or a genuinely lighter surface — or the row ends up flatter than before |
| History | #572 shipped ground that was dead code · #579 fixed two regressions · #589 added the ring after the contrast measurement · **none of the three was ever walked on iOS** |

★ Start by finding out WHY iOS differs. Do not port the Android fix and hope.

### P2 — the numpad. Four defects, two on the money path.

| # | Defect | Where |
|---|---|---|
| 5a | The numpad **hides the sheet**; the sheet does not move up | Tip sheet |
| 5b | The numpad is **not dismissable** — "difficult to choose the recipient" | Wallet-send |
| 5c | ★ Typing `1` `,` `4` produces **`14.`** — the caret does not move past the separator | Wallet-send |
| 5d | Only a comma; no locale-correct separator handling | Both |

★ **5c needs a pinned test written from the property**, not from a fixture: type a
sequence, assert the parsed VALUE. It is a silent wrong-amount defect — same class as
#275 and #503, a path that runs and quietly produces the wrong result.

### P3 — notifications, the two real defects

| Row | Fix |
|---|---|
| **C8** | Tapping a notification lands on the **chats list**, not the originating chat. ★ The payload already carries `fa` (the sender address) — route on it |
| **33** | A **muted** contact still produces a missed-call notification after force-stop + cold boot. The mute gate does not reach the call path |
| **C2** | The badge **resets to 1** on each push while the app is killed instead of accumulating. The payload says `Increment by 1`; something is setting. Backgrounding and returning corrects it |

⚠ C5, C6, C7 are NOT defects — they need the NotificationServiceExtension. See
`docs/ios-nse-spec.md` and §14 of `docs/ios-push-findings-2026-08-24-office.md`. **The NSE
is NOT in this session.** It is gated on an App Group that does not exist at Apple yet.

### P4 — the decided design changes

| | |
|---|---|
| **Remove the details cover** (B1.1, B1.2) | Retire it. Do not replace it in this batch |
| **Restore "Show sender name" on mobile** (A6.1, A6.2) | Desktop stays without it. ⚠ The preference still lives in `SNotificationPrefs` — only the UI was deleted. ★ **And DELETE the one-shot migration** — Damir confirms the switch was internal-only and never reached a real user |
| **The safety block** (A1.8) | Give it colour — inverse the background, or the info as text |
| **The address sheet spacing** (A1.2, A1.7, B1.5) | The info block sits too close to the title, then a large gap, then the QR at the foot. ★ A1.7 was CONFIRMED on device: it reads as a hole. ⚠ Damir owes a screenshot — do the spacing, hold the layout |

### P5 — small and cheap

| Row | What |
|---|---|
| **B4.1** ★ NEW | In Contacts, press-and-hold on the **filter chips** drags that row vertically and it ends up cut off. It should not be vertically draggable |
| **A1.1** ★ NEW | The **Account screen keeps its scroll anchor** when returning from a PEER TAB. It should only do that when returning from an Account SUBSCREEN |
| **A4.2** | The tip sheet middle-truncates the nickname like an address, with room to spare. ★ **The Request sheet does it correctly — copy that** |
| **16** | A declined call is missing its **glyph in the chats excerpt** |
| **B1.7** | The address row has **no press feedback on iOS**. ⚠ Not verifiable here |
| **A7.1** | The mini-app press rectangle — ★ **Android-only, so it IS reproducible here.** It follows the list/grid shape. Too fast to screenshot |
| **A4.3** | German: the tip-sheet copy does not fit · "Tip user" is repeated right of the nickname in the same font · the custom amount overflows. ⚠ Damir owes a screenshot |

### P6 — investigate and WRITE, do not claim

| | |
|---|---|
| ★ **The bot-group freeze** (§1 of the verdict) | Minutes to load and **the app freezes**, against 10 s on Android. After a restart it does not reach the final message. Start at the per-message `EvaluateJavaScriptAsync` fan-out noted in `Config.cs:58` and the batching row in `be-cutover-brief.md`. ⚠ **iOS-only. Land it UNVERIFIED** |
| ★ **The onboarding keyboard** (§2) | It can not be dismissed while creating or restoring an account. Test on Android and report what you find |

## 3. Traps

| | |
|---|---|
| C# changes | **Wipe `Spixi/obj` and `Spixi/bin`** (#387) |
| Ixian-Core | Frozen at **`097341a`**. Five smoke pins enforce it. Do not touch |
| Android deploy | Two commands, never one (#320). Check the device is attached first (#450) |
| Windows deploy | Build, then run the exe separately. `-t:Run` hits MSB3073/9009 |
| The ring | ⚠ Removing it WITHOUT the iOS lift fix leaves the row flatter than it is today |
| Baseline | bundle 296 · shells 18 · smoke **3208 / the 3 known** · locales 771 keys |

## 4. 🟡 Owed by Damir — chase these

★ **Four of the five were ANSWERED on 2026-08-27. See §13 of the verdict.** What is left:

1. The **address-sheet screenshot** (D4). ★ The German tip-sheet screenshots ARRIVED — see
   verdict §12, which turns A4.2 and A4.3 into a repro.
2. `#565 ②`'s `[RESTOREDIAG]` lines (row 34 produces them).

★★ **RESOLVED — do not chase these, and DELETE them from the standing lists:**

| | |
|---|---|
| **C7** | ★ **PASS.** The notification sounded. The checklist row was wrong |
| **The four sound assets** | ★★ **THE ROW IS FALSE. Retire it.** All six files the code asks for are on disk AND in the bundle. The notification tone is `UNNotificationSound.Default` — the OS owns it. ⚠ Delete this row from every handoff; it has been carried since 2026-08-24 |
| **35b, the backup prompt** | ★ **NOT a defect.** DECISIONS #131 locked the nudge as "status-driven quiet-but-standing … **no popups**". A prompt was deliberately never built. A prompt on adding a contact would be a NEW design decision |
| **The migration** | ★ **DELETE it.** The switch was internal-only and never reached a real user |

## 5. ★ What this pass proved about the process

* **Four batches without an iOS device produced four rows that fail only on iOS.** The
  lifted row was measured, reviewed and walked three times — every time on Android.
* **A finding scoped to one platform became a fix applied to all of them** — the
  sender-name row says "Desktop" in its own text.
* **The two SEVERITY-1 findings arrived as asides on a row testing something else.** Read
  the notes, not the ticks.
