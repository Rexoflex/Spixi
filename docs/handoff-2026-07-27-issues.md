# HANDOFF 2026-07-27 → next session: FIX THE IDENTIFIED ISSUES

**Phase:** B — platform bring-up (standing rules `docs/handoff-post-freeze.md` §1B:
platform bugs only, fix small, log in DECISIONS.md). This session (Mac, Cowork/cloud
via the device bridge) landed **#282 edge-to-edge** (iOS-1/3/4) — built, sim-verified
by Damir ("all is good"), committed. Damir also ran his plumbing checklist on the sim
(receive contacts, backup, …) on top of it — pass was clean; any findings he logs
land in `docs/ios-sim-findings.md` as iOS-11+.

## What #282 changed (context for the next fixes)

- `SpixiContentPage.applyPlatformPageChrome`: iOS page padding DROPPED for redesigned
  shells (they own their insets via `env(safe-area-inset-*)`); the 8 legacy pages
  (no `viewport-fit=cover` — address/apps/settings_lock/wallet_* entry pages) keep
  the historical inset via `hasLegacyPageChrome`. Keep that detector in sync.
- Fixed chrome now pads itself: c-topbar / c-bottomnav (heights GROW by the inset),
  composer, scan hint+torch, c-callin, launch welcome/footer/tail bottoms, lock bottom.
- call.html bar-mode strip + CallPage stage grow by the top inset (iOS only).
- Riders: `surfaceColorFor` wallet_sent stale legacy-blue entry removed;
  `WalletSentPage` backing → `getSurfaceColor()`.
- Android untouched (MainActivity view-group insets still native).

## THE PLATE — fix next, suggested order

1. **iOS-6 — keyboard shoves the topbar off-screen.** WKWebView keyboard-viewport
   strategy: today the keyboard RESIZES/pushes the whole page; wanted = topbar stays,
   composer lifts. Investigate `visualViewport` handling in the chat shell vs a native
   inset approach (`KeyboardLayoutGuide` / scrollView contentInset are already
   pinned Never in iOSWebViewHandler). NOTE post-#282 the WebView is edge-to-edge —
   retest first; the failure mode may have changed shape.
2. **iOS-8 — unread badge persists after open+leave on a `request-done` row.**
   Suspected CROSS-PLATFORM (read-clear path never fires for the request event kind),
   NOT iOS-specific — cross-check on Windows before fixing (the 07-22 PC handoff step
   4 has the recipe). Likely home-shell/`setContactStatus`/C# read-flip interaction.
3. **iOS-10 — external/Terms links Cancel-blocked with no external-browser handoff.**
   The #280 guard logs the real exception now; repro with `simctl launch --console`.
   Behaviour gap vs Windows: decide + implement the `Browser.OpenAsync` handoff in
   `SecureNavigationDelegate.DecidePolicy` (security: allowlist http/https OUT to the
   OS browser only — never in-WebView).
4. **iOS-2 — backup illustration consistency.** Launch/backup intro should use the
   SAME asset as the backup nudge + Account→Backup pane (`images/backup.svg`, the
   #245b canon). Small shell/asset swap.
5. **New findings from Damir's checklists** — `docs/ios-sim-findings.md` iOS-11+ rows
   (check the file; empty at handoff time means the plumbing pass logged nothing new).

## Owed / gated (unchanged)

- **Opus #46 audit loop over #273–#282** (3 disjoint read-only auditors → fixes →
  fresh break-my-verdict re-review). Highest-risk rows: #275 (state-relative C#
  composer lock) · #274 (localStorage handshake) · #281 (runtime selector export,
  native-seam class) · **#282 (the legacy-page detector + call-strip inset)**.
- PC track still parked: Windows F5 #273–#279 checks · iOS-8 cross-check · Android
  bring-up (`docs/handoff-2026-07-22-pc.md` — still live, not consumed).
- Mac track remaining: Deutsch locale/dates · lock flow (Cmd+Shift+H) · Safari pass
  over `src/demo/*.html` · Stage-5 two-device sim passes.
- Gated: wallet-send LAST (#232) · reply-to (BE carrier first) · #234 (BE sign-off) ·
  BE cutover backlog `docs/be-cutover-brief.md` + `docs/security-review-for-be-engineer.md`.

## Gotchas (this session's workflow — Cowork/cloud + device bridge)

- Session ran as cloud Cowork with the repo mounted over the device bridge: edits =
  stage file → edit in container → commit back; generators run fine via the device
  VM's node 22 on the mounted repo (`node scripts/build-shells.mjs`, etc.).
- Smoke on the mount: the contacts-block real-timer tail exceeds the 45s window →
  `timeout … exit=124` with ~348 ✓ and 0 ✗ is a PASS signature; Damir's local run
  confirms the tail.
- git on the mount CANNOT unlink: stale `.git/index.lock` blocks everything — `mv` it
  into `_to_delete/` (never delete-in-place; Damir trashes `_to_delete/` manually).
- Only CSS/shell/C# changed in #282 → NO bundle rebuild was needed. If the next fixes
  touch `src/components/*.js`: bundle BEFORE shells, always (#258 preflight gates it).
