# Parity batch A — F5 checklist (DECISIONS #297–#299)

**Before you start:** `build net10.0-windows` (NOT Rebuild), and mind the MSBuild stale-asset
trap in `docs/handoff-2026-07-29d.md` §gotchas — a changed shell can silently not reach the app
bundle and you end up testing last hour's HTML.

Everything below is zero-C#. Anything marked ⚠ is a **verify-first (#215)** item: it may turn out
to be dead code rather than a bug, and that's a real outcome, not a failure.

---

## A1 — "Show older messages"

- [ ] Open a chat with **more than 100 messages**. A pill sits at the top of the log.
- [ ] The "Encrypted. Peer-to-peer. Yours alone." notice is **NOT** shown while the pill is
      (D1 — it marks the true start of the conversation).
- [ ] Tap it → it shows a spinner, then older messages appear **above** and your reading position
      is held (the message you were looking at stays roughly where it was).
- [ ] Keep tapping until history runs out → the pill **disappears** and the secure notice returns
      as the top item.
- [ ] Open a chat with **fewer than 100 messages** → no pill, notice pinned at top, unchanged.
- [ ] ⚠ **Load 3+ pages in a busy chat, then receive a message.** Does it jank? Every new message
      re-renders the whole log, and after 3 taps that's ~400 rows. If it stutters on device, say
      so — the fix is the transport work in `docs/chat-transport-spec.md`, not a tweak here.
- [ ] Bot chat: switch channel mid-load → no stale spinner rides into the new channel.
- [ ] **Non-English locale:** the pill reads "Show older messages" in English. That key is new and
      has no legacy translation to reuse — it needs a translator pass.

## A2 — Paid-bot cost + paid marker  ⚠

- [ ] Open a **paid bot** chat → a cost line sits above the composer reading exactly what C# sends
      (e.g. "Sending messages costs 0.1 IXI per kB"). **It must read as ONE sentence** — if you see
      "Each message costs Sending messages costs…", the fix didn't land.
- [ ] Open a **free group** → **no** cost line (C# sends a formatted "0.00000000" string for groups
      too; the gate is on the numeric value).
- [ ] ⚠ **Send a message to a paid bot → does a wallet glyph appear next to the delivery tick?**
      This is the one genuinely unverifiable bit: `paid` comes from `transactionId != ""`, which is
      set inside Ixian-Core, outside the repo. If no glyph ever appears, the marker is dead code —
      tell me and I'll log it rather than chase it.
- [ ] The delivery tick is still there alongside it (legacy replaced the tick; we kept both).

## A3 — Unread dot on the back button

- [ ] Have unread messages in chat B. Open chat A → a small red dot on the back arrow.
- [ ] Open the **only** chat that has unread → the dot should **NOT** appear (it means "unread
      elsewhere"). This is the case the audit caught; worth checking deliberately.
- [ ] Clear all unread → dot goes.
- [ ] **Desktop**: no dot (the chats list beside the conversation already shows it).

## A4 — Contact presence

- [ ] Open a 1:1 contact's details with the contact **online** → green dot on the hero avatar.
- [ ] Have them go offline → **the dot clears within a couple of seconds** without you leaving the
      page. (This was the whole point — a rebuild alone would leave it green.)
- [ ] Group / bot details → never a dot.

## W1 — Presence dot in other languages

- [ ] Switch the app to **Spanish, French, Russian, Slovenian or Serbian**, open a 1:1 chat with an
      online contact → the topbar avatar shows the online dot. It has never worked in those five
      languages; this is the fix.

## A5 + A11 — The two nudges

- [ ] **Backup:** hard to trigger on demand (C# fires it on a 30-day boundary). If you can force
      it, the sheet should appear with the shield/backup artwork, and "Back up now" should open the
      backup page.
- [ ] After tapping "Back up now", come back to home → **no rating sheet waiting for you.**
- [ ] **Rating:** if it appears, dismiss it by tapping outside → then open a chat and come back.
      **It must NOT reappear.** (C# re-pushes on every chat exit; the 7-day local snooze is what
      stops the nag.)
- [ ] Neither nudge should ever appear over the contacts/wallet takeover, or while you're on the
      Wallet or Apps tab.
- [ ] If you've backed up recently, the backup nudge should stay quiet.

## A6 — Bot description

- [ ] Open a **bot** chat → tap the channel title → the channel panel shows the bot's description
      under the "Channels" heading, clamped to a few lines.
- [ ] A bot with no description → no empty line, no gap.

## A7 — Long message guard

- [ ] Paste something enormous (>64 000 characters) into the composer. **The text stays put** — it
      must not vanish. Send is disabled and a counter shows how far over you are.
- [ ] Tap send anyway → toast "Text is too long." **and the text is still there.**
- [ ] Trim it under the limit → the counter disappears and send re-enables.
- [ ] Non-English: this one **is** translated (it reused the legacy string) — check it in German.

## A8 — Scan zoom  ⚠

- [ ] Open the scanner on a phone → the camera should come up slightly zoomed in (~2×), making a
      small or distant QR easier to catch.
- [ ] ⚠ **Torch on, then torch OFF — does the LED actually go out?** This is the one the audit
      caught me on: the first version left it burning while the button said off.
- [ ] Torch on → does the zoom survive it (picture doesn't jump back to wide)?
- [ ] **Desktop/webcam**: no zoom applied, camera picker still works (#263).
- [ ] A device whose camera doesn't support zoom → scanning still works normally, nothing breaks.

## A9 — Dual-capability app launch

- [ ] Find an app that supports **both** solo and multi-user.
- [ ] Apps tab: tap it → launches **solo** (unchanged). Tap its ⋮ → an "Invite a contact" row →
      opens the contact picker.
- [ ] Its details page → an Open pill plus a small user-plus button beside it. **Check the app name
      isn't squashed and the header doesn't scroll sideways** — the first version overflowed here.
- [ ] A solo-only app and a multi-only app → no invite row, no extra button, behaviour unchanged.
- [ ] Note: the invite picker is the **old unredesigned** `WalletRecipientPage`, and it lists groups.
      Expected for now; flagged.

## A10 — Wallet Share  ⚠  (SUPERSEDED by F3 — #301, 2026-08-04: re-test to THIS contract, not the batch-A one)

Your dial after the iPhone F5: the shared text must never carry `:send:<amount>`, so Share now
**always sends the bare address**, and the button **hides while an amount is entered** (hide, not
disable — your pick). The clipboard/"Copied"-toast rungs are GONE (they only existed for the
amount case). #303 (your second ruling, same day) went further: the QR is now CONSTANT
`address:ixi` — it never encodes an amount either; an entered amount drives only the
send-request-to-a-contact strip.

- [ ] Wallet → Receive → Share, **no amount entered** → the share sheet carries the **bare address**
      (no `:ixi`, no `:send:`).
  - iOS → native share sheet. Cancel it → **nothing happens** — no toast, and no SECOND sheet
      (batch A would have re-opened one on cancel; fixed in F3).
  - ⚠ **Windows** → still the one to watch (this path has never run): the OS share sheet should
      open via the native verb, sharing the bare address. If nothing happens at all, tell me.
  - Android → same expectation as Windows.
- [ ] **Enter an amount** → the Share button **disappears**. Clear the amount (or collapse the
      request row) → it comes back.
- [ ] There is **no clipboard fallback and no "Copied" toast anywhere** in this flow now — if you
      see one, that's a stale build.

---

## Not in this batch (so you don't look for them)

R3 media-cap flip · R6 mobile tx "View details" · R7 the **settings** share verb · R4 timestamp-burn
C# fix · R11 the ContactDetails description arg · R5 dev cluster. All batch B or later; three of
them still need your dials.

## Known, pre-existing, not mine

`smoke-test` has **4 failures at HEAD** that predate this batch (#136 contact strip · #149③
chat-info QR · M5 request grammar · B3 `clearEntries`). They're the runs the #290–294 handoff listed
as owed and never ran locally. I left them alone — worth a session of their own.
