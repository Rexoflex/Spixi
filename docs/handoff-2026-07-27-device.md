# HANDOFF 2026-07-27 (evening) → next session: DEVICE-PASS FIXES

**Phase:** B — platform bring-up (standing rules `docs/handoff-post-freeze.md` §1B).
This session (Mac, Cowork/cloud + device bridge) landed **#283** (12 fixes from
Damir's second sim pass — see the DECISIONS row) AND got Spixi running on a **real
iPhone for the first time** (iPhone 15, dev-signed Debug build). Damir's device
walk produced 6 new findings + 1 backlog row → `docs/ios-sim-findings.md` third-pass
table (**iOS-26…iOS-31**). Everything is committed + pushed; Damir continues on PC.

## State of the world

- **#283 committed**: chat keyboard handler (chat.html visualViewport) · request-unread
  pair (SingleChatPage push + home.html navUnreadTotal) · external-link browser handoff
  (iOSWebViewHandler, LinkActivated-gated) · FAB inset · mobile tx sheet restored
  (onTx desktop-only) · tick grammar (delivered=neutral, read=green — tokens) · media
  fitTile (no letterbox/upscale) · backup local stamp (spixi.backup.last, interim) ·
  Change password = S7 LANDED (ixian:encpass + setCaps encpass) · delete-history
  immediacy (ContactDetails reload-open-chat + SettingsPage dirty flag) · launch backup
  illo = images/backup.svg. Pipeline ran: bundle (235 exports) → 17 shells → smoke
  384✓/0✗. iOS-15 DECIDED: silent decline.
- **Device verify results (the point of the walk):** most of #283 held; two rows
  DIDN'T fully: iOS-29 (keyboard: topbar fixed ✓, composer still under keyboard ✗)
  and iOS-31 (request unread still sticks after accept+open+leave). Both are
  regression-checks on this session's own fixes — fix FIRST, with live inspection
  (see gotchas: Inspectable).

## THE PLATE — suggested order

1. **iOS-29 — composer under keyboard.** The #283 handler's `delta = innerHeight −
   vv.height` never crossed the 60px threshold on device (topbar staying proves the
   handler runs — the pan reset works; the body-resize branch doesn't). Likely fix:
   baseline the delta against the INITIAL layout height captured at boot, not live
   innerHeight (WKWebView may shrink both together on device). Debug live: flip
   `platformView.Inspectable = true` (already scaffolded, commented, in
   iOSWebViewHandler.ConnectHandler) → Safari → Develop → Damir's iPhone → chat.html
   → watch `innerHeight` / `visualViewport.height` with the keyboard up.
2. **iOS-31 — request unread sticks after accept (regression-check of iOS-8/11 fix).**
   Hypotheses ranked in the findings row: late "Contact Accepted" message re-increment
   vs setContactStatus routing vs FE request remnant in navUnreadTotal. Inspect
   home.html state live (same Inspectable path) while running the accept flow.
3. **iOS-27 — CRASH receiving a contact request ON DEVICE** (sim was fixed by
   #280/281 — device notification path differs: real push registration/OneSignal).
   Get the .ips (iPhone: Settings → Privacy & Security → Analytics → Analytics Data →
   Spixi-*.ips; or Xcode → Window → Devices → device logs). The #280 guard logs the
   managed exception if it's the guarded path — console via
   `xcrun devicectl device console --device <UDID>`.
4. **iOS-28 — deleting a contact leaves its chat row** (chats list not flushed /
   FE tombstone only set by the row menu). Same delete-refresh family as iOS-24/25.
5. **iOS-30 — contacts + new-chat screens narrower than chats list** (post-#282
   side-inset suspect; measure in Inspector).
6. **iOS-26 — groups back into contacts + people/groups filter** (Damir REVERTED the
   removal decision: history-delete orphans groups). Product batch row, not a quick fix.
7. **Windows cross-checks still owed** (07-22 PC handoff is STILL live): F5 #273–#279
   + now #283's XPLAT rows (iOS-8/11 fix, iOS-16 ticks, iOS-17 media, iOS-19 stamp,
   iOS-24/25 deletes) on WebView2.

## Backlog added this session

- **Wallet sync status** (Damir): IXICore already exposes the wallet block height;
  network height is known → compute + surface sync progress in the wallet UI.
  FE wiring + one C# push — queue with the wallet batch.
- **PRE-1 bundle de-dupe** (`docs/audit-refactor-plan.md` §6b): shells share ONE
  spixi.iife.js instead of 17 inlined copies (−20 MB, flicker-safe by construction,
  constraints written in the row). Post-cutover refactor phase.

## Gotchas — real-device workflow (all learned tonight)

- **Deploy:** `dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug
  -p:RuntimeIdentifier=ios-arm64` then add `-t:Run -p:_DeviceName=<UDID>`
  (UDID via `xcrun devicectl list devices`). `-t:Run` REPLACES Build — two steps.
- **mlaunch hangs SILENTLY** (33 min tonight) when install can't proceed — the №1
  cause: a same-bundle-ID App Store build on the phone (dev signature can't overwrite;
  uninstall legacy Spixi first — or side-load under `-p:ApplicationId=com.ixilabs.spixi.dev`
  with its own profile). Prefer `xcrun devicectl device install app --device <UDID>
  <path to .app>` — visible progress + real error messages.
- **Signing:** Apple Development cert (Xcode → Settings → Accounts → Manage
  Certificates) + a provisioning profile for the bundle ID — quickest via a throwaway
  Xcode app with that bundle ID run once on the phone. codesign keychain prompt wants
  the MAC LOGIN password; "Always Allow".
- **Debug the WebView on device:** uncomment `platformView.Inspectable = true` in
  iOSWebViewHandler (DEBUG-only ideally) → Safari Develop menu attaches to any shell.
  This is the tool for iOS-29/30/31. REMEMBER to re-comment before any release build.
- Cowork/cloud session workflow unchanged (stage → edit in container → commit back;
  generators via device VM node; git CANNOT unlink on the mount — `mv` stale
  `.git/index.lock` into `_to_delete/`). Components changed → bundle BEFORE shells.

## Owed / gated (unchanged + grown)

- **Opus #46 audit loop now spans #273–#283** (highest-risk new rows: #283 keyboard
  handler + navUnreadTotal + the C# read-status push).
- PC track: Windows F5 checks (see plate 7) · Android bring-up
  (`docs/handoff-2026-07-22-pc.md` — still live).
- Gated: wallet-send LAST (#232) · reply-to (BE carrier) · #234 (BE sign-off) ·
  BE cutover backlog (`docs/be-cutover-brief.md`, `docs/security-review-for-be-engineer.md`).
