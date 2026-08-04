# F5 checklist — #301 fix batch (F1 · F2 · F3 · iOS-29 attempt 4)

Device: the iPhone 15 (AI15) again. Build recipe unchanged from `handoff-2026-07-29d.md` §gotchas.
⚠ **Before building:** `rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios` — the MSBuild
obj stamp can silently keep last session's HTML in the app bundle (#293 finding). If a fix "doesn't
work", check `Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/` carries it before concluding.
One thing is C#: the 2-line F2 belt — so this IS a full C# rebuild, not just an asset refresh.

## F1 — Scan (the important one; this run is EVIDENCE-GATHERING, possibly a fix)

The prescribed `AllowsInlineMediaPlayback` fix was proven already-on by framework default, so what
shipped is a **probe + a free re-kick**, not a blind fix. Three outcomes, all useful:

- [ ] Open scan (chats → add contact → scan, or wallet quickscan) → **does it scan a QR now?**
      If YES: the `play()` re-kick was the missing nudge — F1 is done, and A8 zoom becomes
      observable: point at a small/far QR → it should auto-zoom ~2× within a second of start.
      Test torch on/off too (must not reset the zoom).
- [ ] If it still doesn't scan, look at the hint line under the frame (~3 s after the camera
      starts). **Photograph/transcribe it exactly** — e.g.
      `scan probe — video 0x0 ready=1 · track live MUTED · frame n/a`. That line names the broken
      layer:
      - `track … MUTED` → WebKit suspended capture natively (C#/WebKit config territory)
      - `video 0x0` → inline rendering refused despite both flags
      - video sized + `frame black` → canvas readback
      - **no line appears and it still won't scan** → rendering is fine, decode is broken —
        connect Safari Web Inspector and copy the `[scan-probe]` console lines instead.
- [ ] Torch should still work regardless (it never broke).

## F2 — Pinch does nothing outside chat

- [ ] Wallet, Apps, Account, contact details, a settings sublevel: **pinch → nothing moves**.
      No raster zoom, no pan-stranding. (Before: the whole screen zoomed like a web page.)
- [ ] Chat: pinch still resizes the **message text** (same knob as Account → Chat appearance),
      and the setting survives closing/reopening the chat.
- [ ] One legacy page — wallet **Send** (the old-design screen): pinch should also do nothing
      (that's the C# belt working; the redesigned shells are covered by the meta clamp).

## F3 — Wallet Share

- [ ] Wallet → Receive → **Share** (no amount): share sheet opens with the **bare address** —
      no `:ixi`, no `:send:`.
- [ ] **Cancel the share sheet → nothing else happens.** No toast, and critically **no second
      share sheet** (batch A had that bug on cancel; fixed here).
- [ ] Tap **Request an amount** and type one → the **Share button disappears**. Clear the amount
      or collapse the row → it returns.
- [ ] ~~QR scanner-to-scanner with amount~~ **SUPERSEDED by r2 (#303, your ruling):** the QR now
      stays the plain `address:ixi` even with an amount typed — a second device scanning it gets
      the bare address, no prefilled amount. The send-request-to-a-contact strip still works and
      still carries the amount (as a chat message).
- [ ] (Windows, whenever you're next there: `docs/parity-a-f5-checklist.md` §A10 was rebased to
      this contract — test THAT version, not the old "copies + toast" description.)

## r4 addendum (#305) — scan layout final + consent persistence

- [ ] Preview now fills the whole camera area edge-to-edge; the bracket frame sits centered.
- [ ] Scan a QR aimed at the frame — speed should be much closer to legacy now (you were
      aiming at a cutout the decoder wasn't watching). If still notably slower, say so —
      fps/auto-zoom get measured next, not guessed.
- [ ] Leave the scanner, come back → **no "Allow camera" card** — it goes straight to the
      camera. (Revoke camera for Spixi in iOS Settings and it falls back to the honest
      prompt/denied cards, if you want to test that too.)

## r3 addendum (#304) — SCAN root-cause fix (test this after the rebuild)

Root cause was measured live on your phone: the QR library inline-stamped `position:relative`
on the feed container, collapsing it to 0×0 — camera was healthy the whole time. Two-line fix.

- [ ] Wallet → Scan → Allow: **the camera preview should now actually show** inside the frame.
- [ ] Point at a Spixi QR → **it scans** (first time ever on iOS).
- [ ] A8, finally observable: point at a small/far QR → auto-zoom ~2× within a second of start;
      toggle the torch on/off → the zoom must survive the toggle.
- [ ] If anything still fails, the probe line now prints a `box WxH` figure — photograph it
      (a 0×0 box there = the fix didn't reach the phone → obj/bin wipe and rebuild).
- [ ] (Windows, next pass: re-verify desktop scan — the feed is now genuinely absolute there
      too, which is the intended layout, but eyeball it.)

## r2 addendum (#303) — keyboard both-levers

- [ ] Open a chat → tap the composer: **the composer must sit on the keyboard on FIRST focus** —
      not after typing 7-8 characters (that was the r1 miss; r2 adds the native C# lever + a
      settle poll). Repeat cold a few times: open chat → tap → check, across different chats.
- [ ] Dismiss/re-summon the keyboard repeatedly; switch to the emoji keyboard and back (its
      height differs — the composer should track it).
- [ ] Everything else from the keyboard section above still applies (no double-topbar artifact,
      composer returns to bottom on dismiss).

## iOS-29 attempt 4 — composer above the keyboard  ⚠ the risky one, isolated on purpose

- [ ] Open a chat → tap the composer → **the composer should sit directly on top of the
      keyboard**; topbar stays put; the log shrinks. Type a few lines (composer grows), send.
- [ ] Rotate/dismiss keyboard → composer returns to the bottom, **not** hovering above the home
      indicator (the clamp guards that).
- [ ] Watch for the OLD artifact: topbar sliding up / a second topbar animating in. If ANY
      artifact or misplacement appears, say the word — this is one block in chat.html and reverts
      clean without touching the rest of the batch.
- [ ] Quick sanity on Android/Windows whenever convenient: keyboard behavior there must be
      unchanged (the lever computes 0 by construction where the OS resizes the viewport).

## F4 — nothing to test

Presence staleness is logged for the BE engagement (`security-review-for-be-engineer.md`,
trust-signal row). The dot will still show a quitter online for ~2 min — expected until BE.

## Housekeeping riding this batch

- `_to_delete/session-stage-*.tgz` (2 files) are session-transfer tarballs — delete `_to_delete/`
  locally as before; never commit it (it's already untracked-but-present; `git rm -r --cached
  _to_delete _gitlock_trash` clears the older tracked copies whenever you want).
- Commit is **ONE batch** after your F5, message suggestion:
  `F5 fixes (#301): scan probe + re-kick, chat-only pinch, bare-address share, keyboard lever 4`
