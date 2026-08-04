Spixi — F5 FIXES (post batch-A device pass). Repo = connected folder
~/Documents/GitHub/Spixi, branch redesign/frontend, HEAD ae2867c7.

READ IN ORDER:
1. docs/handoff-2026-08-04.md          — F5 results + the 4 findings, with evidence
2. docs/parity-a-preflight.md          — why batch A was built the way it was
3. DECISIONS #297–#299                 — what shipped in batch A

Damir F5'd batch A on an iPhone 15. Six of eight testable items pass, ZERO batch-A
regressions. Four findings came out; three are fixes, one is a BE log. Do NOT
re-derive the evidence in the handoff — it is file:line verified. Spend the tokens
on building.

WORK, in this order:

F1 — iOS inline media playback (C#, ~10 lines). THE PRIORITY.
  The iOS scanner does not scan at all, while the torch works — which proves the
  camera track is live and the problem is video RENDERING, not permission. This is
  iOS-49 from DECISIONS #293, half-finished: MediaCaptureUIDelegate landed,
  AllowsInlineMediaPlayback never did (zero hits repo-wide).
  It CANNOT be set in ConnectHandler — WKWebViewConfiguration is immutable after
  the WKWebView is constructed. Override CreatePlatformView() in
  Spixi/Platforms/iOS/iOSWebViewHandler.cs, build the configuration there with
  AllowsInlineMediaPlayback = true and MediaTypesRequiringUserActionForPlayback =
  None, and construct the WKWebView from it.
  Then check the vendored html5-qrcode sets `playsinline` on its <video> element
  (Spixi/Resources/Raw/html/js/html5-qrcode.min.js) — if it doesn't, that's a small
  shell-side patch and part of this fix.
  This also unblocks verifying A8 (scan zoom), which is built but has never been
  observed on iOS.
  ⚠ This is the one C# item. Everything else below is zero-C#.

F2 — Pinch-to-zoom sweep (zero-C#, 17 shells + an optional 2-line C# belt).
  Every shell EXCEPT chat.html lets WKWebView raster-zoom the whole document.
  chat.html:10 already carries the correct clamp (minimum-scale=1, maximum-scale=1,
  user-scalable=no) — it was added 2026-07-29 for the pinch-to-text gesture and
  never swept. Apply the same clamp to the other 17 shells; chat keeps its gesture
  handler, nothing else needs one.
  Consider the C# belt too (iOSWebViewHandler.ConnectHandler, beside the existing
  ScrollView lines): MinimumZoomScale = MaximumZoomScale = 1. It covers the
  still-legacy pages the FE sweep can't reach, and costs nothing because the shells
  scroll inner containers, not the WebView scroll view.
  ⚠ ASK DAMIR FIRST: --chat-text-scale is chat-only, so clamping every screen
  removes the only way to enlarge text on wallet/apps/account. Recommend clamping
  now and logging app-wide text scale as a follow-up — but it's his call, so put it
  to him before you sweep.

F3 — Wallet Share must not carry `:send:<amount>` (zero-C#, small).
  Damir: "we can't share a request for a specific amount yet, so that needs to go
  out." Share should send the BARE ADDRESS always. That collapses the amount-gate
  branch batch A added in home.html's shareReceivePayload — the gate existed to
  stop the amount being silently dropped; his call is that it shouldn't be in the
  shared text at all. The QR keeps encoding address:send:<amount> — scanner-to-
  scanner is still correct; this is only about text leaving the app.
  ⚠ ASK DAMIR: should the Share button still be offered while an amount is entered,
  given it will share something without the amount? Bare-address-anyway vs
  hide/disable Share. One line either way; the second is more honest.

F4 — Presence staleness: LOG ONLY, do not touch the shell.
  A contact shows online for ~2 min after quitting. The A4 render is correct — it
  shows what C# pushes. Node.cs:418-455 reports online while a PresenceList entry
  exists and hasn't expired; it never goes false on a clean quit. There is no
  honest signal to render differently, so this is a BE/Ixian-Core item.
  Add it to docs/security-review-for-be-engineer.md (or the BE cutover brief) as a
  trust-signal correctness row, alongside the chat-transport work order in
  docs/chat-transport-spec.md.

RULES
- Zero-C# EXCEPT F1 (and the optional F2 belt). If anything else turns out to need
  C#, STOP, log it, skip it (#215 discipline).
- ★ #221 chat isolation untouched. No money-path changes.
- Full build pipeline, bundle BEFORE shells: extract-strings → build-locales →
  build-strings-iife → build-demo-bundle → build-shells → i18n-lint +
  pseudo-locale-smoke + smoke-test.
- Smoke baseline is 868 pass / 4 fail. Those 4 are PRE-EXISTING at HEAD (#136 · #149③
  · M5 · B3) — do not "fix" them as part of this, just confirm you added none.
- Add smoke assertions per fix. #46 audit loop after the batch. DECISIONS #300+ and
  a CLAUDE.md status line. Per-item F5 checklist for Damir. ONE commit after his F5.
- ⚠ BRIDGE GOTCHA: always `git --no-optional-locks` on the mounted folder — a plain
  git status strands a 0-byte .git/index.lock and GitHub Desktop then refuses to
  commit. The bridge cannot delete it; move it to _to_delete/.
- ⚠ BUILD GOTCHA: MSBuild's obj stamp means changed shells can silently not reach
  the app bundle. After building, verify the new code is actually in
  Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/. Force with
  rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios.

STILL OWED, not this batch: the >64 000-char paste that A7's guard has never been
exercised with · W1 in Spanish/Russian · A10 on WINDOWS (it decides part of batch B)
· A2/A6/A9/A11 (need a paid bot, a bot, a dual-capability app, a 30-day timer).

Batch B remains blocked on Damir's three dials: R3 media-cap scope · R6 mobile tx
detail · R4 timestamp burn.

Before you do anything: analyse the problem and see whether any of these can be
done better than described. That instruction caught two ship-blocking defects last
session.
