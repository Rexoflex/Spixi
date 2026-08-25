# F5 checklist — the overnight batches W + A–D (#535–#551, 2026-08-24)

★ Interactive version (counters + per-item pass/fail + Copy report):
the **"Overnight F5"** artifact. This file is the offline twin.

## Build order (C# changed — wipe obj/bin)

`node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
`node scripts/smoke-test.mjs` → **wipe obj/bin** → build net10.0-windows → F5.

⚠ New/untracked files — add them before any commit:
`git add Spixi/Utils/SContacts.cs src/components/contact-row.js src/styles/components/contact-row.css Spixi/Platforms/Android/Resources/values-night-v31 Spixi/Platforms/Android/Resources/layout-night Spixi/Platforms/Android/Resources/drawable/spixi_splash_icon_night.xml`

Expect: bundle **291** · shells **18** · smoke **BASELINE OK 2996 / the 3 KNOWN
(#136 · M5 · B3)** · cs-syntax **144 + 1** · locales CLEAN.

## BATCH W — the wallet follow-ups (#536–#542)

1. **W-a** Chat → attach ⊕ → Pay: the compose is fully STYLED on both themes (tokened
   amount field, picked row with avatar; the review sheet has separated rows — no
   "Amount13 IXI" run-together).
2. **W-i** Send (wallet tab AND in chat): the AMOUNT section is on TOP, the recipient
   picker below, Review at the bottom. Type an amount, then pick a contact: focus does
   not jump back into the field.
3. **W-j** Send rows · Receive rows · the Contacts directory: ONE row anatomy
   (avatar-48 + name + truncated address + online dot). Receive keeps the select circle.
4. **W-k** Enter/Next/Go on an amount field drops the keyboard (mobile). On Windows,
   Enter does not blur the field.
5. **W-c** Receive → "Show my address": the sheet scrolls internally on a short window
   (no cut chip, no outer scrollbar), the QR card scales, and it has the premium look
   (hairline chip, info disc, shield on the safety line). Desktop: a centered ~440 px
   dialog.
6. **W-d** An incoming payment request → **Pay** opens the NEW review sheet (recipient +
   amount + live fee + total) BEFORE the native confirm. A request that is no longer
   payable answers "This request can no longer be paid." — never silence.
7. **W-e / W-f** The wallet-hero SCAN of a receive QR opens the COMPOSE (never
   add-contact); a KNOWN contact's QR auto-picks that contact (nickname + avatar); a
   non-Ixian QR gives the invalid-address alert.
8. **W-g** Windows: the "Confirm payments" row is GONE from Account (it was a no-op
   there). Android: still present and working.
9. **#535** Sounds: sent = a short soft whoosh (minimal/swipe), received = a soft lift
   (minimal/drag-start), both at the same quiet base as the rest (−16 dBFS).
10. Regression: the wallet-pass flows still hold — fee gating (no invented fee, Review
    disabled until the quote lands), the native confirm, Max, cancel is silent.

## BATCH A — info · groups · the remove-contact data bug (#543)

11. **A6 ★ THE DATA BUG**: chats → long-press a 1:1 → Delete chat → step 2 → Remove
    contact → the contact is GONE from the Contacts directory too. Restart: still gone.
    Deleted history stays deleted after a restart.
12. **A5** The remove-contact step is a bottom sheet with "Groups you are both in".
    With a shared group, Remove is disabled until the group is ticked ("Leave 1 &
    remove"), and an extra confirm warns that the group chats go too. A refusal puts
    the row back with an honest toast.
13. **A7** The delete-chat options use the circle checkboxes (group-creation grammar);
    the fixed-on "Delete chat" label is full-ink.
14. **A1** A BOT room's info lists members with avatars (nickname, else truncated
    address) — no "Hidden member" wall. A blind GROUP still masks. A room with no
    synced roster says members are not listed yet — it never invents rows.
15. **A2** A bot's info has **Leave group**, and it works.
16. **A3** Contact info AND group info: the danger rows (Delete history · Remove
    contact / Leave) sit near the top, under the identity block and quick actions.
17. **A4** A 1:1 contact's info shows "Groups you are both in"; tapping one opens that
    group's chat.
18. **A8** Opening contact/group info shows a SKELETON while data lands (no blank
    flash); large rosters build once, without churn.
19. **A9** Outgoing bubbles: timestamp + sent/delivered glyphs at 0.7 ink; only the
    read tick (and a failure glyph) at full strength. ⚠ DIAL: 0.7 measures 3.73:1 on
    the 12 px meta (AA small-text is 4.5:1; 0.85 would measure 4.73:1) — say if 0.7
    reads too faint on device.
20. ★ The bridge-outbox side effect: bulk delete (select N messages → Delete) removes
    ALL N, and a multi-recipient payment request reaches every recipient.

## BATCH B — requests lifecycle (#544)

21. **B1** An outgoing PENDING contact request row → long-press → **Revoke request**
    (not "Delete chat") → a prompt with honest copy → Revoke → the row goes, the
    contact leaves the directory, a toast confirms. Restart: still gone.
22. **B2** Your own app-invite card → **Cancel** → confirm → your card flips to a
    persistent "Canceled" (survives re-open). The recipient's invite disappears and
    does NOT come back as a nameless ghost card when they reopen the chat.

## BATCH C — account lifecycle + splash (#545–#548)

23. **C1** Account → Delete data → **Delete account** (ONE card now) → PIN → lands on
    WELCOME. Then: create a NEW account → it connects (no eternal "Connecting…").
    Then wipe again and RESTORE THE SAME BACKUP → no fatal exception, chats load.
    ⚠ If a fatal dialog still appears, keep `ixian.log` — the named suspects are the
    balances duplicate-key and the RocksDB order (#545) plus the isolate latch (#550).
24. **C1** After the wipe: old pins/mutes/drafts/canceled-invite marks are gone; every
    setting is back at its default.
25. **C3** Cold start → wait ~2 s on Chats → tap Account: it opens instantly (warm
    park). Boot itself must NOT feel slower, and tapping Account immediately after
    boot must still work (slower, but never never).
26. **C4** Account → Contacts → Back: lands on ACCOUNT, not Chats. The topbar Contacts
    entry and the FAB still return to Chats.
27. **C5** Android with the OS in dark mode: kill + relaunch → the splash is near-black
    with the white Spixi mark (Android 12+; older devices: dark ground + white
    lockup). OS light mode: the blue splash, unchanged. ⚠ The mark's SIZE is a first
    cut — say if it reads too big or too small. (The OS theme decides, not the in-app
    theme — #534's platform limit.)
28. Windows boot cover: themed as before — verify only, no work expected.

## BATCH D — the missed call (#549)

29. **D1** Let a call ring out: a **"Missed call"** notification remains on the shade —
    and SURVIVES sitting on the chats list (the every-second sweep used to eat it
    within a second). It clears when you open that conversation.
30. **D1** Answered calls clear the incoming-call row; message notifications still
    clear when read. ⚠ iOS is reasoning-only for the OneSignal half — if a missed-call
    row vanishes on iOS, report it (the SDK ClearAll was removed).

## Report

Use the artifact's **Copy report** button, or reply with the failing item numbers.
Batch E (the menu batch) was NOT started — it is queued whole (#551).
