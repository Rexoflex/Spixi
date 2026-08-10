# iOS launch gaps — curated (2026-08-10, post-#325)

One page: what actually stands between HEAD and an iOS launch, and the cheap-C#
basket. Sources: ios-sim-findings (open rows) · handoff-2026-08-10 sweep ·
be-cutover-brief (open rows re-checked this session) · security-review doc.
Update in place; this supersedes memory, not the source docs.

## A. Launch gates (blockers — nothing ships around these)

| # | Gate | Shape |
|---|------|-------|
| A1 | **L8 — wallet password stored in CLEARTEXT device Preferences** | C#: move to iOS Keychain (MAUI SecureStorage) + migrate existing installs. The one true security blocker in the list |
| A2 | **L6 — restore mutates state BEFORE verifying the password** | C#: reorder `onRestore` (verify → then mutate). Small, destructive-path |
| A3 | **Security-review walkthrough with the BE engineer** | Process: `docs/security-review-for-be-engineer.md` MAJORs #4 (file:// localStorage partition vs mini-apps) · #5 (lock/call exclusivity — landed, verify) · #6 (mini-app link handoff + insets) · #7 (delegate clobber — landed, verify) · #234 resume-lock Cancel. Damir walks the engineer through it (handoff-post-freeze order) |
| A4 | **iOS-32 — thermal/battery parity with legacy** | Measurement, not code: Release/AOT build, unplugged, Settings→Battery share vs legacy Spixi side-by-side. Damir's own ship gate |
| A5 | **iOS-42/45 — real Terms + Privacy documents** | Damir input: the two texts; drop-in replaces `TERMS_DEFAULT`/`PRIVACY_DEFAULT` (launch-shell.js) |
| A6 | **B1/B2/B3 runsheet rows — notification/push delegate families on device** | Verification (device-pass-runsheet-2026-07-28): does handleNotificationReceived still fire · push-tap ownership · Release registrar. MORE suspect post-#312 (same registrar family as the scan saga) |
| A7 | **Full-app iOS pass on the finished build** | The end-to-end walk (Stage-5 class: create → contact → chat → pay → backup → restore) once the above land |

## B. Should-have before launch (Damir-flagged UX, not strictly gating)

| # | Item | Shape |
|---|------|-------|
| B1 | **S2 — attach tray UNDER the composer** (iOS-44, un-deferred by Damir) | FE rework: attach-sheet grid builder → mobile tray in the flex column below the composer, swap-with-keyboard grammar; desktop popover untouched. Design ready (this session's prep) |
| B2 | **iOS-43 — app-invite "Launch …" button label clipped** | FE small: typed-bubble action-row overflow |
| B3 | **S5 — i18n residue** (`build-locales --todo`): sl-si first, then W1 es/ru leftovers | FE/drafts only |
| B4 | **iOS-18 — multiuser app picker still legacy design** | Either reskin (medium FE) or accept legacy for v1 — Damir dial |
| B5 | **S7 — probe retirement** (scan storage line · [cam-perm] console noise · frame-black false positive; KEEP the per-nav heal) | FE + tiny C#; hygiene before release builds |
| B6 | **S3 — Parity Batch B** (B1 media-cap flip all platforms · B2 backup-nudge ack stamp · B3 share verb) | Pre-verified this session: B1 = cap flip + bot/blind-group tile gate (C# picker proven platform-neutral via avatar path) · B2 = small C# (verb + one-time clear; FE already built in #314) · B3 = home zero-C# + small SettingsPage verb |

## C. Cheap C# basket (small, high-value — batch into 1–2 rounds)

| Row | What | Cost |
|-----|------|------|
| iOS-54 | showWarning fan-out → chat topbar sub-line ("Connecting" in open chats; precedence connecting > typing > presence) | ~20 lines + shell hook |
| L1 | create-failure release signal (today: infinite spinner on failure) | few lines |
| L2 | `create:<nick>:<pass>` parse guard | few lines |
| L5 | missing walleterror strings + `"global -dialog-ok"` typo | trivial |
| L7 | push the PICKED restore filename, not the staging path | ~1 line |
| W9 | WalletSentPage hardening (activity-null NRE · status-latch order · `=0` sentinel) | small |
| C16 | remote `msgDelete` not persisted (message resurrects on reopen) — FE latch shipped (#255), this is the C# half | small |
| C17 | pending-contact state arg + cancel-request path residual | small |
| C22 | native call bar return-to-call route | small |
| GJ1 | "you were added to a group" system message (verified absent in StreamProcessor) | small-medium |
| A4/A5b | app fetch-failure push · `installed` casing | trivial |
| S13 | settings external-link sink hardening (★ security-flagged — pair with the A3 walkthrough) | small |

## D. Explicitly NOT launch-gating (post-launch / the one BE pass)

Inline Pay/Decline (C1–C3) · arbitrary emoji reactions (C8, Ixian-Core) · OG link
previews (C14, ★ human BE review) · C15 link-confirm spoof (★ same review) ·
pin/mute/favorites persistence (CH4) · delete/history wipe depth (CH3) · shared
media feed (CI6) · group typing attribution (C21) · mini-app session UX (C20) ·
paste-to-send (C12) · wallet-send flip (W5/W6 — stays LAST by standing rule) ·
CI-rows polish · iOS-41 select-text dial.

## Suggested order

1. Cheap-C# round 1: iOS-54 + L1/L2/L5/L7 + W9 (one build, one F5).
2. S3 Batch B (its own #46 loop — covers the C# legs).
3. S2 attach tray (FE) + B2/B3/B5 riders.
4. A1/A2 (L8 keychain + L6 reorder) — with the A3 security walkthrough.
5. A4 thermal measurement on a Release build · A6 runsheet rows · A5 docs from Damir.
6. A7 full pass → launch call.
