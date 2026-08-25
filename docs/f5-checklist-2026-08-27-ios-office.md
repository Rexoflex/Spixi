# F5 checklist — iOS office pass, 2026-08-27. Build `eeed6549`.

**LANGUAGE RULE: ASD-STE100.** See `CLAUDE.md`.

★ One sheet for the iPhone. It merges `f5-checklist-2026-08-26-queued-fe.md` (#589/#590)
and `f5-checklist-2026-08-26-details.md` (#591/#592) and **removes every desktop-only row**.
Row ids are kept from the source documents so results map straight back.

⚠ **iOS has seen NONE of this.** The last iOS device build was `3d6703a7`. Three commits
have landed since: #576–#588, #589–#592 and #593. The walk-day batch (#576–#588) has its
own sheet, `f5-checklist-2026-08-26-walkday.md`, and is ALSO untested on iOS.

## 0 · Build and deploy

C# changed in 3 files (`SNotificationPrefs.cs`, `App.xaml.cs`, `ContactDetails.xaml.cs`)
→ **wipe `obj` and `bin`** (#387).

```bash
rm -rf Spixi/obj Spixi/bin
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug \
  -p:RuntimeIdentifier=ios-arm64 \
  -p:CodesignProvision="VS: com.ixilabs.spixi Development"

DEV=F992BFF8-BB7E-5F68-8E25-496307854F6D
xcrun devicectl device install app --device $DEV Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app
xcrun devicectl device process launch --device $DEV com.ixilabs.spixi
```

| Trap | Rule |
|---|---|
| `-p:RuntimeIdentifier=ios-arm64` | ★ NOT optional. Without it the build makes a SIMULATOR app |
| `-p:CodesignKey=...` | ★ Do NOT pass it. The name match fails. The csproj alias is correct |
| `-p:CodesignEntitlements=` | ★ Do NOT pass it. That switch removes push |
| Confirm push survived | `codesign -d --entitlements - …/Spixi.app` must show `aps-environment → development` |

---

# PART A — the queued FE batch (#589 / #590)

## A1 · The address sheet

| # | Do | Expect |
|---|---|---|
| 1.1 | Account — look at the order | the **address row is ABOVE Contacts** |
| 1.2 | Tap it | info block → QR → caption → address chip (Copy + Share) → safety line. Each explanation is beside what it explains |
| 1.3 | Both explainer blocks | every line of copy starts at the SAME left edge |
| 1.6 | Wallet → empty activity → **"Show my address"** | it opens the **sheet**, not the Receive screen. The hero's Receive still opens the takeover |

⚠ **1.7 — EYEBALL.** On a tall phone the slack now collects **above the QR**. The info
paragraph can sit alone at the top with ~110px of air below it. If it reads as a hole,
say so.
⚠ **1.8 — EYEBALL.** The safety block and the address chip are adjacent and both paint
`--surface-neutral-02`. Two identical cards in a row can read as one broken block.

★ Rows 1.4 and 1.5 are DESKTOP. They are not in this sheet.

## A2 · The lifted row — ★ WRONG TWICE ALREADY

| # | Do | Expect |
|---|---|---|
| 2.1 | ★ **DARK MODE**, chats list, long-press a row | the row is clearly lifted: one neutral step **AND a ring** |
| 2.2 | Light mode, the same | the same, and it must not look heavier than dark |
| 2.3 | Open a row's swipe drawer, then long-press it | no translucent band flashes through the row as the drawer springs back |

★ The ground from #572 was **dead code since it shipped**. After that was fixed, one
neutral step measures **1.10:1** in dark — a black scrim can not darken a black list.
**The ring does the work in dark.** If the ring reads as "selected" and not as "lifted",
say so. The fallback is elevation.

## A3 · Nicknames

| # | Do | Expect |
|---|---|---|
| 4.1 | A contact with a long nickname (20+ characters, no spaces) | the name is never middle-truncated as `abc…xyz`. Only an ADDRESS is |
| 4.2 | Tip or Request that contact | the sheet title keeps the **verb** and ellipsizes only the **name** |
| 4.3 | Change to **Deutsch**, repeat 4.2 | de-de puts the name first. The action word must stay readable |

## A4 · Language on mobile

| # | Do | Expect |
|---|---|---|
| 5.4 | Change the language, then use the app normally | ★ **Nothing must differ from before.** The #590 work is desktop-rail only. This row exists to prove mobile did not regress |

## A5 · Notifications — ★ NEW, and now testable

| # | Do | Expect |
|---|---|---|
| 6.1 | Account → Notifications | **two** switches: the master and In-app sounds. "Show sender name" is GONE |
| 6.2 | Receive a message | the notification reads its per-type line with **no sender name** |

⚠ **6.3 is a QUESTION, not a test.** Was "Show sender name" ever in a build a real user
ran? It shipped 2026-08-21. If not, the one-shot migration mutates preference state for
nobody and should be deleted.

## A6 · The mini-app press rectangle — ★ EVIDENCE, NOT A FIX

| # | Do | Expect |
|---|---|---|
| 7.1 | Open a mini app that shows the contacts picker | ideally no pressed-row rectangle over the new screen |

⚠ `pressable.js` already bounds press state to ~2 s, so the fix can NOT explain a
rectangle that persists. **If it is still there, a screenshot is owed** (#294).

---

# PART B — the details redesign (#591 / #592)

## B1 · The details screen — open a contact from the directory

| # | Do | Expect |
|---|---|---|
| 1.1 | The top | a soft **cover** behind the avatar. It bleeds to both screen edges and up to the chrome, and fades at the bottom |
| 1.2 | A contact WITH a photo, then one WITHOUT | with: a blurred wash of their photo. Without: their identity colour — the hue their gradient avatar wears |
| 1.3 | The action row | **four** actions: Message · Call · Pay · Request |
| 1.4 | The address row | disc + "Spixi address" + the **truncated** address + chevron. The full base58 is nowhere on this screen |
| 1.5 | Tap it | the shared address sheet opens — QR, full address, Copy, explainer |
| 1.6 | Read that sheet's copy | it is about **their** address. No "your" anywhere, and ★ **no Share button** |
| 1.7 | Press and hold the address row | it visibly presses |

## B2 · ★★ CALL GATING — the MAJOR

| # | Do | Expect |
|---|---|---|
| 2.1 | An **approved** contact → details | Call is present and starts a call |
| 2.2 | ★ A contact you sent a request to who has **NOT accepted** → details | ★ **NO Call button at all** |

★ Unwired, 2.2 ran the whole path — permission prompt, a call bubble written to your
history, the call screen, a dial tone, 45 seconds of ringing — and the peer received
nothing. Same class as the composer lock (#275).
⚠ Known and accepted: if the peer accepts WHILE you look at their details, the Call
button appears only when you open the screen again.

## B3 · Groups

| # | Do | Expect |
|---|---|---|
| 3.1 | Open a group's info | Message **alone**. No Call, no Pay, no Request, no address row |

## B4 · The skeleton

| # | Do | Expect |
|---|---|---|
| 4.1 | Open a group with many members and watch the roster land | the placeholder rows are **clearly visible**, and when the real rows arrive **nothing shifts** |

⚠ It was drawn in `--surface-neutral-02` — the card's own colour in both themes. Two ramp
steps up now. "A notch or 2" is your eyeball.

## B5 · The two extras, in a conversation

| # | Do | Expect |
|---|---|---|
| 5.1 | A short call card ("Missed call") and a short payment card | they **hug** their content. They are not drawn at the full rail with empty space beside them |
| 5.2 | A long call or payment line | it **wraps**. It is not clipped |
| 5.3 | A tipped message | the chip is **green**, not orange |

⚠ **5.4 — EYEBALL, a token change.** `--text-success` moved one ramp step darker **in
light mode only**. It also moves received tx amounts, tx-sheet amounts and payment-card
amounts. All gain contrast. None change hue. It reverts in one line.
⚠ **5.5 — EYEBALL.** A hugging call card that carries a tip badge AND reactions can show
its reaction row past the card edge. Not a clip. A layout-quality call.

---

# PART C — ★★ NOTIFICATIONS. Finish what 2026-08-25 started.

Push now works on iOS. See `docs/ios-push-findings-2026-08-24-office.md`.
These rows confirm it is reliable, and record how it looks before the extension batch.

| # | Do | Expect |
|---|---|---|
| C1 | ★ Kill the app. Lock the phone. Send ONE message from Android. **Measure the time** | it arrives in seconds. ★ One arrival is not a pass — this row is about SPEED and REPEATABILITY |
| C2 | Repeat C1 three times over the pass | all three arrive |
| C3 | Background the app (do not kill it). Send a message | it arrives. This is the LOCAL path and it must still group |
| C4 | Open the app. Send a message to the chat you have open | ★ **NO banner.** The foreground handler suppresses it on purpose |
| C5 | With the app killed, look at the notification | ⚠ It is **ungrouped**, it shows **no sender name**, and it says "New Message". ★ **CORRECT — do NOT file these.** They need the extension |
| C6 | Mute a chat, kill the app, receive a message from it | ⚠ It **still arrives**. Also correct. The mute gate needs the extension |
| C7 | Sound | ⚠ **Silent.** The four sound assets are not in the build |
| C8 | Tap a notification | it opens the app. Say where it lands — the right chat, or the list |

★ **C8 is the only row here that can find a NEW defect.** C5, C6 and C7 are known and
recorded. If C1 or C2 fails, stop and read §13 of the findings doc — the direct-APNs test.

---

# What is NOT in this sheet

| | |
|---|---|
| Desktop rows | queued-fe 1.4, 1.5, 3.1–3.3, 5.1–5.3 · details 6.1, 6.2. **They need Windows** |
| The demos | queued-fe §7 — a browser surface, not a device one |
| ★ The walk-day batch (#576–#588) | its own sheet, `f5-checklist-2026-08-26-walkday.md`. **Also unwalked on iOS.** Damir's call whether it rides this pass |

## Report as

`PART.row = pass | fail | n/a` and a sentence for every EYEBALL row.
The eyeballs are 1.7, 1.8, 2.1 (the ring), 4.1(B), 5.4, 5.5 — and the question 6.3.
