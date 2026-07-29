# HANDOFF 2026-07-27 (post-review) -> next session

**Phase:** B — platform bring-up (`docs/handoff-post-freeze.md` §1B: platform bugs only, fix small,
log in DECISIONS.md).

This session (Cowork/cloud + device bridge, no build) reconciled GitHub<->local and ran the **owed
Opus #46 adversarial loop over #282 + #283**. Local `redesign/frontend` == `origin` tip `fd5b308b`;
the 116 "modified" files are CRLF-only churn from the Windows checkout (`git diff --ignore-cr-at-eol`
is empty — a `.gitattributes eol=lf` would silence it permanently). Full findings:
**`docs/opus-review-macsession-282-283.md`**.

## THE PLATE — fix next (verified findings first)

1. **Rebuild the 5 launch shells — iOS-2 never shipped.** `node scripts/build-shells.mjs all`
   (DEFAULT excludes launch). Confirm `intro*.html` / `onboarding.html` now carry
   `backupIllustration` + `images/backup.svg`, not `illoSlot('backup')`. One command; do it first.
2. **Delete-history immediacy is a no-op (iOS-24/25).** `SingleChatPage.loadMessages()` returns on
   empty *before* `clearMessages`. Emit the clear first. Also fix the desktop asymmetry:
   `SettingsPage.onDeleteHistory` (delete-all) never re-renders the open pane.
3. **iOS-31 — push literal `0`** from loadMessages' unread-clear instead of
   `getUnreadMessageCount()` (requestAdd is never markable-read). Second leg: HomePage
   contactStatusCache struct-copy + ts=0 drop. Inspect live before/after (#215).
4. **iOS-29 — keyboard handler.** Baseline delta against boot-captured layout height, or pin
   `body.height = vv.height` while the composer input has focus; gate on `vv.offsetTop`. Confirm with
   Safari Web Inspector (`Inspectable = true` scaffold in `iOSWebViewHandler.ConnectHandler`) whether
   `innerHeight` tracks `vv.height` on device.
5. **Mini-app WebView regressions (security).** The global `iOSWebViewHandler` now hands mini-app
   `LinkActivated` out to Safari (no confirm, no `TargetFrame` check), and mini-app pages lost their
   safe-area inset (Source-set, no `loadPage` -> Padding 0). Scope the link handoff to trusted host
   shells; classify MiniAppPage for chrome. **Log in `security-review-for-be-engineer.md`.**
6. Safe-area gaps: toast / pending-strip / request pane / encpass footer bottoms; landscape
   left/right insets. `fitTile` geometry. Backup stamp cross-WebView localStorage (verify iOS-19 on
   device).

## Carried forward — device pass (`docs/ios-sim-findings.md` iOS-26..32)
iOS-26 groups-in-contacts + people/groups filter (product batch) · iOS-27 crash receiving a contact
request ON DEVICE (get the .ips) · iOS-28 deleted contact leaves its chat row · iOS-30 contacts /
new-chat narrower than chats list · iOS-32 thermals/battery parity (ship gate).

## Still live / gated (unchanged)
- PC track: `docs/handoff-2026-07-22-pc.md` — Windows F5 #273–#279 + #283 xplat rows · Android bring-up.
- Mac remaining: Deutsch locale/dates · lock flow · Safari pass over `src/demo/*.html` · Stage-5 two-device.
- Gated: wallet-send LAST (#232) · reply-to (BE carrier) · #234 (BE) · BE cutover
  `docs/be-cutover-brief.md` + `docs/security-review-for-be-engineer.md`.

## Gotchas
- This mount truncates large-file reads/writes (#175/#204) — edit big files (CLAUDE.md, chat.html,
  home.html) via node fs on the device, not the Edit tool; verify size/lines after.
- Generators/smoke run on the device VM's node; smoke's contacts-timer tail exceeds the 45s
  device_bash window (exit-124 is expected there — Damir's local run confirms). Rebuild order:
  bundle -> shells.
- Consumed this session -> `docs/archive/`: `handoff-2026-07-27-device.md`,
  `handoff-2026-07-27-issues.md`.
