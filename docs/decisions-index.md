# DECISIONS index — find the live rule by area

Interim index, until the strip (#933) rewrites DECISIONS by area. The rows stay in `DECISIONS.md`; this file only points at them. State as of row 1100 (2026-10-01, session 0); S9 rows #1243–#1251 added to the live-row cells (2026-10-07). Update a line when a row changes the live rule of its area.
Read a row: `grep -n '^| #\?NNN ' DECISIONS.md` (ids are written `NNN` or `#NNN`; also `217b`, `#348b`, `B1`–`B3`, `N83`–`N86`, `iOS-63`). #302 is retired. 204, 344, 594 and 595 have no row.
Notation: `#A→#B` means #A was superseded, amended or reversed by #B, so follow #B. 🟡 means provisional or not yet walked. Newest rule comes first in each cell.

| Area | Live rows (newest rule first) | What they decide (≤ 25 words) |
|---|---|---|
| Security invariants & handover gate | #1250 🟡 · #805 · #777 · #775 · #392 · #254 · #232 · #221 🟡 · #220 (#19→#220) | Chat and all untrusted content get their own WebView, with panes coordinated through C# only. The redesign introduces nothing: an introduced-vs-inherited sweep runs, and each new verb or key gets a gate row in the same batch. |
| C# touches no risky parts / BE review | #1250 🟡 · #1245 · #962 · #675 · #635 · #626 · #523 · #448 · #295 · #232 | The WebView composes and C# signs only after a native confirm. Human BE review comes before release. Ixian-Core stays at `097341a`, and Core changes go to the BE cutover. |
| Wallet & money path: amounts and inputs | #1048 · #1016 · #1004 · #628 · #627 · #625 · #624 · #620 · #607 · #360 · #77 · #26 | Amounts show at most 2 dp, truncated, with display-only grouping. Paste, caret and Enter never alter or spend. Numbers stay neutral; received is green. Pins read the built bundle. |
| Wallet screen | #1072 · #1056 · #1050 · #1008 · #990 · #527 · #456 · #452 · #444 · #517 | Receive is request-first. A scan-progress strip and sheet. The tx sheet is a receipt card. On phones "Missing a transaction?" is a "?" pill. Narrow panes show icon-only badges. |
| Send flow | #642 · #636 (#526→#636) · #635 · #628 · #626 · #609 · #560 (#556→#560) · #558 · #530 · #524 · #523 · #133 | One-screen compose plus a review sheet, and C# signs on a native confirm (tips too). The legacy send, receive and payment pages are deleted. Decline lives on the card. Max waits for a recipient. |
| Chat: bubbles & layout | #1082 · #1055 · #1044 · #1043 · #904 · #817 · #814 · #813 · #742 · #63 · #14 | Same-sender run has a 2 px gap, tail 7×11, bubble pad-y 7. The dark sent bubble is #1a4a96, and the dark hairline is 4.5 %. Density tokens come from the #742 render sheets. |
| Chat: composer & keyboard | #976 🟡 · #940 · #893 ❌ · #892 (#889→#892) · #818 · #733 · #724 · #711 · #705 · #64 | The composer is a floating pill, 8 px from the edges, and messages fade behind it. The glass option is retired. The caret shows on entry without the keyboard. The mic slot is flagged off. |
| Chat: menus, select, reactions, ticks | #1248 · #1247 · #1071 · #1067 · #1065 (#1033→#1065) · #1064 · #1010 · #966 · #963 · #950 · #941 · #877 · #658 · #650 (#649→#650) · #643 · #557 (#24→#75→#557) | The anchored long-press menu grows in and fades out, and the keyboard stays up. Ticks differ by colour only. The menu shows seen and downloaded, not delivered. One tip per message. |
| Chat: reply, reactions scope, media & links | #1250 · #1248 · #1244 · #931 · #914 · #805 · #448 · #441 · #436 (#430→#436) · #215 · #206 (#81→#206) · #82 | Reply-to is built but dark until Core lands. Reactions are heart-only (Core). Media auto-loads only from Tenor, Giphy and apps.spixi.io, with a Privacy toggle. Links are buttons behind a confirm. |
| Chat transport / pre-warm / perf | #1249 · #1095 · #925 · #917 · #913 · #804 · #803 · #802 · #801 · #800 · #785 · #782 · #780 (#779 parked) · #778 · #777 · #766 · #345 · #298 | A pre-warmed blank chat and batch transport ship. Reusing a warm chat WebView is parked for security. Screens open as soon as possible. Perf work is ranked by risk and measured first. |
| Chats list | #1248 · #1090 · #1088 · #1063 · #969 · #944 · #877 · #848 (#837→#848) · #815 · #720 · #606 · #561 · #327 · #276 · #211 · #192 · #118 · #115 · #33 | Rows give more air (pad 14). The unread time is blue. A room row shows "Sender:" / "You:". The Requests chip has no count. Addresses are middle-truncated. There is no swipe on desktop. |
| Contacts & contact requests | #978 🟡 · #970 · #947 · #870 · #863 · #850 · #849 · #634 · #562 (#543→#562) · #540 · #367 · #366 · #275 · #116 · #109 · #155 | Add contact is a chooser sheet. An outgoing request is hidden, never destroyed. There is one remove-contact sheet that names the blocking groups. Declined requests go to an ignore list. Accept is staged. |
| Calls (VoIP, call card, ring) | #1095 · #1087 · #1086 · #1075 · #1074 · #1006 · #621 · #611 · #602 · #583 · #580 · #577 · #554 · #272 · #270 · #256 | A native CallPage with the premium 1:1 surface and a minimised card that has a dark edge. The lock wins over the call. Declined is not missed. A muted contact gets no missed banner. |
| Notifications, push & sounds | #1248 · #1243 · #975 🟡 · #974 · #919 · #915 · #743 · #712 · #708 · #612 · #611 · #514 · #510 (#493→#503→#510) · #495 · #476 · #475 · N85 · #535 · #518 · #502 · #468 | Killed-app pushes go through the extension gate (Android, then iOS). OneSignal has a real opt-out. Mute silences but the badge shows. There are no transaction sounds, and desktop plays a background notification sound only. |
| Groups / bots / channels | #1247 · #1243 · #941 · #873 · #680 · #676 (#672→#676) · #650 · #643 · #638 · #637 · #623 · #619 · #617 · #613 · #567 · #370 (#356→#370) · #365 · #99 · #97 | Legacy is the reference for bot rooms: names, avatars, and send-request on a tapped member. Kick and ban are bot-room only. Group ticks come from per-member receipts. Destructive rows stay above members. |
| Account / settings hub | #1248 · #1245 · #1093 · #1091 · #1078 · #1076 · #1068 · #1017 · #1007 · #804 · #718 · #601 · #582 · #547 · #546 · #545 · #341 · #315 · #245 (#240→#243→#245) | Account is a peer tab that never slides. Sublevels boot no WebView. The hub has white cards on grey, one-line subtitles, and an address header. Delete account wipes everything. |
| Lock | #516 · #507 (#505→#507) · #500 · #496 (#484→#496) · #480 · #462 · #458 (#234→#458) · #454 (#438→#442→#454) · #272 · #230 · #229 · #160 · #159 | The lock is presented at pause, with no Cancel bypass. The grace window is measured from backgrounding. Desktop locks on input idle. The lock is shown in place and is fixed dark. |
| Launch / onboarding | #1246 · #615 · #614 · #548 · #401 · #391 · #390 · #389 · #318 · #185 · #165 (#164→#165) · #163 | The onboarding tail is deleted. Backup nudges after the first real asset. Back unwinds one level. The keyboard is dismissable. The splash is theme-aware, and the Android bars are full bleed. |
| Scan / QR | #831 · #582 · #509 · #313 · #312 · #309 · #307 · #304 · #293 · #158 · #137 | A full scan takeover with an aspect-locked feed, so the OS asks once. A scanned `addr:ixi` is split at the first colon. The QR is fixed dark with a tight quiet zone. |
| Apps / mini-apps | #1247 · #1245 · #1085 · #936 · #852 (#836→#852) · #851 · #832 · #784 · #544 · #533 · #216 · #214 · #198 · #184 · #129 · #122 | The apps tab defaults to grid and persists the view. Add app opens in the desktop pane. An installed app is not offered as new. Invite cancel and decline use tombstone cards. The picker shows app icons. |
| i18n & locales | #1246 · #999 · #849 · #822 · #821 · #812 · #713 · #504 · #498 · #445 · #405 · #379 · #175 · #168 · #167 · #166 · #6 | `window.SL` runtime, 13 locales, with translations as part of the build. Gates catch English-only keys. A legacy translation never wins on an English match. Split keys whose owner differs. |
| Legal docs | #992 · #914 · #906 · #901 · #899 · #819 · #737 · #730 · #703 · #702 · #699 · #169 | Terms and Privacy are English only, baked into the app at build time with an automatic hold. The policy is final and was read by counsel. In-app copy never overstates privacy. |
| Tokens & theming | #1030 · #1018 · #989 · #769 · #763 · #316 (#11→#316) · #244 (#241→#244) · #53 · #16 · #7 · #5 | Code-first tokens: primitive → key → token, with the theme swapped by `data-theme`. Dark is near-neutral. White on-action ink uses a separate token. Components read semantic tokens only. |
| Colours: buttons, sheets, avatars, discs | #1068 · #1062 · #1053 · #1052 · #1017 · #1001 · #364 (#37→#364) · #170 · #9 | Tonal buttons have their own AA palette, and the dark tonal label is blue. Dark destructive is #9a2c29. One Telegram-close avatar palette for both themes, also used for discs. |
| Chat canvas & pattern | #1066 · #1058 · #1029 · #1023 ⛔ · #1002 · #998 (#855→#998) · #997 (#853→#997) · #866 · #758 · #750 · #690 (#478→#690) | The pattern is Contours (matrix and doodles are retired). The light ground is Mist, with a brand gradient as an option. Dark ground is #0D1117, with a dark brand gradient. |
| Typography / density | #1078 · #1063 · #904 · #817 · #742 · #228 (#227→#228) · #226 · #58 · #17 · #12 | The UI font is system-ui. Desktop density is set by a platform flag, not a width query. One title scale (heading-sm). Bubble and row metrics come from the #742 render sheets. |
| Icons & illustrations | #1248 · #868 · #865 · #862 · #856 · #809 · #710 · #709 · #698 · #689 (#683→#689) · #671 · #665 · #664 · #693 · #174 (#130/#132→#174) · #40 · #32 | Exported SVGs, then `generate-icons` and `--check` (gate 63). Each platform has its own launcher icon. The logotype ink is a role. 3D illustrations. Edit `src/` assets, never build outputs. |
| Desktop split view / panes | #1247 · #1246 · #1046 · #923 · #922 · #898 · #897 · #852 · #728 · #722 · #669 · #561 · #247 · #245 · #236 · #221 🟡 · #220 (#19, #89→#220) | Each pane is its own WebView. The conversation column is capped at 760 px. Tx detail swaps in place with no animation. A phone is one pane in every posture. The rail has one writer. |
| Navigation & motion | #1071 · #741 · #740 · #735 · #725 · #718 · #707 · #704 · #706 · #685 · #614 | Mobile subscreens slide; Account and the conversation do not. On desktop only chat info slides. Entrances slide 40 % and fade. iOS back is wired in every shell. |
| Platform: iOS | #1086 · #1084 · #1028 · #976 · #975 · #974 · #972 · #932 · #919 · #915 · #809 · #807 · #706 · #488 · #487 · #486 · #312 · #309 · #293 · #282 · #281 | Edge-to-edge with env() insets. Delegates are re-asserted on every navigation. The push extension has an App Group gate. Native copy. Walks happen at the office, which is the first compile of iOS C#. |
| Platform: Android | #1249 · #1095 · #924 · #923 · #922 · #883 · #830 · #824 · #734 · #732 · #679 · #665 · #577 · #548 · #409 · #408 · #407 · #401 · #331 · #330 · #329 | Full-bleed system bars with per-tab glyphs, and a transparent nav bar under the composer. A dev-coexist build beside legacy. The ring uses the application context. The memory kill is unreproduced. |
| Platform: Mac Catalyst | #1245 · #1098 · #1086 · #1026 · #981 · #980 · #979 · #973 · #920 · #916 | The Mac ships in v1 (#1098; needs the D25 WebView handler). Route B: vendored RocksDbSharp, which boots. A local notification lane (Dock badge and bounce). Mic and camera usage strings. The divider affordance is cross-platform. |
| Platform: Windows | #1069 · #938 · #888 · #768 · #753 · #698 · #666 · #663 · #576 · #516 · #507 · #228 | Build with F5, never plain `dotnet build`. A missing asset folder must fail loud. Flags are drawn in the picker. The restore picker has a Win32 fallback. The app has its own icon. |
| Build pipeline & generators | #1069 · #882 · #868 · #862 · #854 · #792 · #790 · #789 · #693 · #663 · #593 · #283 · #176 (#3→#176) · #35 · #32 | Custom node scripts, not Vite. Build the bundle before the shells. A release strip step. A reachability gate for the legacy purge. The full smoke suite runs in the container. Compile C# for real. |
| Smoke / pins rules | #953 · #892 · #861 · #859 · #828 · #810 · #798 · #772 · #771 · #694 · #682 · #659 · #646 · #627 · #395 | A pin declares `stripCode` or raw, executes behaviour, and is mutation-proven. A gate must prove it runs. Sweep the touched files when you retire a token. A visual property is gated by the walk. |
| Walks & verdict process | #1243 · #1069 · #953 · #905 · #843 · #749 · #742 · #660 · #511 · #459 | Render on the built shell (both themes) before the pin. A walk sheet takes notes on PASS rows. A verdict file names its batch. A findings row closes only when walked. |
| Review process (#46 loop) | #1471 · #1251 · #943 · #880 · #806 · #767 · #659 · #657 · #647 · #542 · #515 · #512 · (#352→#1471) · #260 · #235 · #143 · #85 · #62 · #46 | Disjoint read-only auditors, then fixers, then a fresh break-my-verdict reviewer each round, until CLEAN. Reviews run on Claude Fable 5.2 (#1471, which supersedes #352 for the model): fresh read-only instances; no fallback to another model — stop and tell Damir. The builder never reviews its own work. The loop is never skipped. |
| Session workflow / language / commits | #1494 · #1493 · #1492 · #1491 · #1490 · #1489 · #1488 · #1497 🟡 · #1496 🟡 · #1495 🟡 · #1472 · #1100 · #1097 · #1096 · #931 · #882 · #868 · #860 · #759 · #748 · #736 · #723 · #681 · #673 · #513 · #450 · #398 · #380 | Damir talks in ONE main chat (#1488); a Fable 5.2 lead starts agents by model at high effort (#1489). A work session takes only Ready items ("go" = Ready, #1492), commits on `work/<batch>`, pushes after #46 CLEAN and opens a pull request ONLY inside the fork; Damir merges (#1490, #1493; the old `CLAUDE.md` step 8 "Damir commits and pushes" → #1490). Mission Control is the source of truth (#1491). Number blocks per session (#1494). FORGE + numbered prompts (now one prompt doc per work session, #1488) + short CLAUDE.md (#1097, #1100). No attribution lines in commits. STE100 applies to chat replies only. Verify the baseline in a clean clone, and stop if numbers differ. Check the mounts first. Record rows at decision time. |
| Endgame: freeze / sweep / strip / TestFlight | #1099 · #1098 · #1054 · #971 · #937 · #933 · #916 · #910 · #909 · #825 | Order (#1099 confirms #971 + #937): session-1 → office walk + fix round → L6 → read-only sweep → Damir picks → freeze + `freeze-v1` tag → characterization → refactor picks → strip → gate re-run → merge → TestFlight. v1 DoD = `docs/release-readiness.md`. |
| Deferred to v1.1 / later | #1046 · #936 · #934 · #931 · #910 · #909 · #908 · #864 · #779 · #686 · #448 · #295 · #215 · #128 · B3 · #100 | The BE cutover, Core-dependent features (reply-to, more reactions, request reject), link previews, warm chat WebView, self-destruct, delete-for-everyone, the floating-composer cost and the pre-launch optimization sweep. |

## Rows that changed process rules

| Row | Rule it set or changed |
|---|---|
| #46 | The audit loop is a rule: read-only audit, then disjoint fixers, then an adversarial reviewer, repeated until CLEAN. |
| #62 | Pipelined review: the auditor reviews component N while N+1 is built. |
| #143 | A standing Opus adversarial review brief (`docs/opus-review-brief.md`) opens the finalization era. |
| #215 | Verify a premise on the device (persistence, reachability) before building. Flag 🟡 when the tree cannot prove it. |
| #232 | Wallet send lands last. Any security-flagged item needs human BE review before build (later: before release, #523). |
| #235 | A fresh break-my-verdict re-audit attacks the CLEAN verdicts, not only the findings. |
| #294 | Measure on the device before you choose a lever. A third failed guess means you ship a probe, not a fix. |
| #316 | Figma mirroring is retired: code is the source of truth (replaces #11). |
| #352 | ❌ Superseded for the model by #1471 (2026-11-11). Was: adversarial review always runs on Opus, never on the builder's tokens. |
| #380 | Session budget mode: sessions are scoped small (lifted per session, as in #398). |
| #398 | The canon for long unattended runs: verify at source, no repro means no build, mutation-proven pins, rows at decision time, security gate, bundle before shells, triage rather than half-build. |
| #512 | The #46 loop is not skipped on small batches, and skipping it is itself a finding. |
| #542 | The builder never reviews its own work. |
| #658 | When the same defect class keeps returning, the defect is the design. Delete the class. |
| #660 | A loop is not finished until its verdict is written into the brief that ordered it. |
| #663 | On Windows, build with F5 (or copy `Resources\Raw`). Plain `dotnet build` serves the old shell. |
| #681 | If a recorded baseline number differs, say so and STOP. Trace it before you continue. |
| #766 | Everything opens as soon as possible, with no delay unless it is unavoidable. |
| #771 | Every pin declares `stripCode` or raw, and pins about prose run on a `prose()` normaliser. |
| #772 | A comment that states an invariant the code does not enforce is a defect, and the gate checks this. |
| #775 | A new `spixi.*` key gets its security-handover-gate row in the same batch. |
| #782 | Perf work is ranked by risk, not by size. Avoid any lever that can break things. |
| #798 | A refusal is documented from the cases you did not think of, never from the author's list. |
| #805 | The security handover sweep is mandatory and is derived from the diff. "Introduces nothing" must be proven, not asserted. |
| #810 | A gate must be able to fail visibly. A gate that cannot execute is a defect. |
| #905 | A findings row closes when someone walks it, not when the code lands. |
| #906 | The legal hold gate recognises the project's open-question words (NEEDS DAMIR, TODO, TBD, FIXME, XXX). Note: the "status row = what a session found" lesson the owner associates with #906 is stated in #905. |
| #931 | The STE100 language rule is scoped to chat replies only. Docs, comments and commits are exempt. |
| #933 | The strip has one branch, one cleanup and three comment tiers. Pins that assert comment text are retired or re-based. |
| #953 | When a reviewer finds the same class twice, make a design call, not a third patch. A visual property is gated by the walk. |
| #971 | Do not refactor before a device walk. The code sweep follows the office day and its fix round. |
| #1096 | Commit rule: no attribution lines or session links in commits or PRs (CLAUDE.md, 2026-10-01). |
| #1097 | CLAUDE.md = rules + loop + "where we are now"; history in `docs/status-log.md`; numbered prompts; lessons + this index. Marked 2026-11-12: its commit step and the numbered prompts are superseded by #1490 / #1488. |
| #1100 | Bot practices adopted: "is this worth doing?" first, review before delivery, deliberate-break per pin, failure text proves its setup, characterize first; a review brief for every loop. |
| #1471 | Every #46 reviewer runs on Claude Fable 5.2 as a fresh read-only instance; the builder's context never reviews; no fallback to another model — stop and tell Damir (supersedes #352 for the model). |
| #1472 | No new build session starts while more than one batch is unwalked; cloud-only research and tooling are exempt. |
| #1478 | Every change that ships behind a switch keeps its OWN switch with the old path as the fallback; switches are never merged per area. |
| #1488 | ONE talk session: Damir talks in the main chat; every other session runs alone and reports through files. Replaces the planning chat. |
| #1489 | The lead of every session is Fable 5.2; sub-agents at high effort: Haiku mechanical, Sonnet standard build, Opus hard build, fresh Fable 5.2 reviewers. |
| #1490 | A work session commits on `work/<batch>`, pushes it after #46 CLEAN and opens a pull request; no session pushes `redesign/frontend`, force-pushes, merges or tags. Supersedes "Damir commits and pushes" (the old `CLAUDE.md` step 8). |
| #1491 | Mission Control stays the source of truth; work sessions update their own items, the main chat the rest; statuses "Ready" and "Walk owed". |
| #1492 | "Go" = Damir sets the item Ready in the main chat. A work session does not interview. |
| #1493 | A pull request is opened only inside the fork (`Rexoflex/Spixi` → `redesign/frontend`); never to upstream; no push to upstream. |
| #1494 | Each session gets its own DECISIONS and lessons number block and never writes outside it. |
| #1495 🟡 · #1496 🟡 · #1497 🟡 | Proposals, not in force: merge only after the walk · #1474 again with CI · a nightly task for the top Ready item. |
| #1520 | The adb walk (`scripts/device/adb-walk.ps1`) is the standard way to take Android device numbers; a missing line is "no data", never a guess; two runs agree by the rule of #1530 (medians < 20 %, or ≤ 17 ms, or ≤ 1 for a count). |
| #1521 | No dev "go to" verb: the walk navigates only by calibrated coordinates and the existing `fa` notification intent. |
| #1522 | The adb walk's safety rules: one pinned dev package, an adb allowlist, the log filtered on the phone, masks for folders / serial / seed addresses, focus checks, restores; the nightly task is not registered. |
| #1523 | Session Tooling + Tooling R6 record: kept / cut, the unverified steps' results, the four done-when items (repeatability met by #1530), #46 CLEAN at r6 by #1519, the fallback delivery. |
| #1550 | The adb walk's seven new steps (resume-now, resume-3s, chatinfo, tab-apps / tab-wallet / tab-account, history) run after the old ones; scroll-image only with `-Steps` and the local key `imageChatAddress`; the tab steps never keep a Wallet or Account screenshot. |
| #1551 | The parser rows of the new steps; the old rows stay byte-identical; one removed line = "no data", exit 2. |
| #1552 | r6-1 of batch tooling fixed: `Protect-Text` replaces only absolute folder values. |
| #1553 | Session Walk steps 2 record: PARTLY (block 2, the two full runs of #1530, owed); #46 CLEAN at r4; the cold start of the same install moved 2.2 s → 3.6 s (not explained). |
| #1560 | Speed batch 1a's four switches: `WarmOnIdle`, `SpareRearm`, `PhoneNoEmptyDetail` (ON) and `SpareKeepShortSleep` — the first OPT-IN flag (absent = OFF; a stored 1 acts only in dev mode; OFF at once on both ways out of dev mode); one `[FLAGS]` line; four `ixian:devflash:` forms; no Developer row yet (#1569). |
| #1561 | P-12 `WarmOnIdle` (P38): on Android a hidden WebView boots only after 1200 ms without a touch and 900 ms after the other hidden boot; the touch stamp is a time only; the warm after a chat close now waits too (the trade against #1147 (4)). |
| #1562 · #1563 🟡 | P-11 switch 1 `SpareRearm` (P39): the spare chat page is armed again after a drop, never under a lock or in the background · a quiet resume schedules the warm at the resume itself + 1800 ms (a quiet resume has no chats flush) — Damir confirms. |
| #1564 · #1565 🟡 | P-11 switch 2 `SpareKeepShortSleep` (P40, Android, opt-in): why the app drops the spare at sleep (`docs/perfb1-spare-drop-reason.md`); a kept spare is used only after a `document.readyState` proof at the return · dials: 3 minutes, 1000 ms. |
| #1566 | P-13 `PhoneNoEmptyDetail` (P41): a phone display does not build the empty right pane at start; the first wide layout builds it once. |
| #1567 | The dev image seed (P42): seed indexes 50, 51, 52 = Seed 51–53 with 46 photos; the album is in Seed 52; fixed times; files kept or deleted only by content proof; Seed 01–50 unchanged. |
| #1568 🟡 | Five existing pins re-based because they count what the batch adds (outside the prompt's file-area line, on purpose) — Damir confirms. |
| #1569 ❓ | How is a switch of batch 1a set on the phone? The Developer screen has no rows for the four switches (options A–D). |
| #1570 | The measuring plan of batch 1a (`docs/walk-perfb1.md`): plan A three runs on one build, plan B two builds; which rows judge which switch; the before-number is run 0 of the same sitting. |
| #1571 📝 · #1572 ❓ | Recorded: a second "heavy" seed after a restart can add old messages again (a candidate for the slow phone of 2026-11-13; "Remove, then Seed") · open: is a store-shape Android build debuggable? |
| #1573 | Session Speed batch 1a record: WALK-READY by #1546 (the session pushed `work/perfb1`; Damir opens the pull request); #46 CLEAN at r4 (MAJOR 4 → 0 → 0 → 0; four NITs recorded); smoke 6341 / the 2 KNOWN (= 6298 + 43), CSH 583; C# UNCOMPILED; nothing measured on a device. |
| #1580 | The first shell boot (787 ms) is the `load` event of the FIRST document of the process; about 700 ms are first-document costs; the 50 seed chats do not explain it; a parse line for the home shell is proposed. |
| #1581 | P-09: the carrier gate and the line invariant are always on in `build-shells` and `strip-release` (no switch); the pixel gate is a lead-machine tool. |
| #1582 | P-06: `SpixiLeanCss` (default OFF) packs every stylesheet without its comments; the strip changes only a removed comment and its own white space; it keeps what the browser keeps as text and refuses what it cannot read. |
| #1583 ⏸ | P-07 (`SpixiLeanJs`) is PARKED (Damir, 2026-11-15): the build refuses the switch; the hand-written JS scanner had a silent mis-read in each of four review rounds; the code stays as a tool. |
| #1584 | The MSBuild switches: off = today's package; `SpixiLeanCss` only in an Android dev build with the dev app id until the ruling of the defaults; `SpixiLeanJs` and `SpixiLeanCssFull` refused; a stamp in `obj` stops a build when a switch changed. |
| #1585 | GATE 2 on a lean package passes only when the red rows are exactly a written list; the plain `smoke-packaged` is red on four rows in any copy (found, not changed). |
| #1586 🟡 | Not built (`SpixiLeanCssFull`, "emit ASCII") and the proposals: the next design of P-07 (a parser in the build path / a build-time proof / drop), the cross-check and the MSBuild harness in CI, the re-base of the listed rows, the end of the Android-dev-build rule. |
| #1587 | Licence and source notices stay in a lean package (`keepReason`); three licence findings outside the strip's scope for the main chat. |
| #1588 | Harness numbers, lean off against on (direction only): ready −50 to −80 ms with both switches at CPU × 4; the html folder 8.31 MB → 6.90 MB with CSS alone. |
| #1589 | Session Speed lean record: PARTLY (item 4 parked); #46 CLEAN at round 5 for the delivered scope (MAJOR 3 → 5 → 5 → 2 → 0); Damir's two rulings in the session (the reader models; the park). |
| #1615 | The launch intent extra of #1595 (dev builds only, packet P48): ONE string extra `perfb1flags`, grammar exactly `warmidle=<0\|1>,sparerearm=<0\|1>,sparekeep=<0\|1>,noemptydetail=<0\|1>` (all four or nothing), stored only with Developer mode on, acts at the NEXT start, one fixed line `[FLAGS] perfb1 extra stored`; the read is one-shot (`bundle == null`, not launched from history); Android only. |
| #1616 | The security lens of the extra: any app on the phone can send it to the developer build; the worst effect is the four developer preferences of batch 1a for the next start; a store build has none of it; no value in a log or a file. Recorded: four separate writes, the legacy `fa` read, the store before login. |
| #1617 | The adb walk's `-Flags`: set-up (force-stop → the extra → the stored line → force-stop → a cold start → the state line → ONE pid-filtered pull → compare), six stop codes, the pid guard (a new app process inside the run stops it), the parser withholds every number of an asked run that is not proven (exit 2) or differs (new exit 4); `run.json` `flags`; without `-Flags` nothing changes; the state STAYS on the phone. |
| #1618 | Session "Speed 1a toggle" record: delivered by #1546 (the session pushed `work/perfb1toggle`; Damir opens the pull request); #46 security-only CLEAN at r5 (MAJOR 1 → 0 → 0 → 0 → 0); smoke 6361 / the 2 KNOWN (= 6341 + 20), CSH 600; both walk scripts and `OnCreate` / `OnNewIntent` are frozen by hash in the pins; Android C# UNCOMPILED until the operator block. |
| #1645 | Fix batch 1 items 1 + 2 (P50, P53): on Windows the native confirm before a destructive verb is a WinUI `ContentDialog` with Cancel as the default (Close) button — Enter and Esc cancel, only Primary is OK (switch `ConfirmSafeDefault`); on Android the alert dialog's accent has a night value (brand-300), readable on the dark surface (resources, no switch). |
| #1646 | Fix batch 1 item 3: the desktop chat log reserves the scroll-bar gutter on both edges — the unread strip has one equal inset, with and without a scroll bar. |
| #1647 | Fix batch 1 item 5 (#1539 Dial 1 = B): the Account header is the photo and the name only; the "My address" row and its sheet keep QR, the full address, Copy and the explainer; three header-only strings removed. |
| #1648 🟡 | Fix batch 1 item 6: the drawn scroll indicator of long option sheets takes the outline family (was an icon ink = the other theme's look); a dial for the walk. |
| #1649 🟡 | Fix batch 1 item 4 (P51): Windows + Mac, a 2 px accent line in the chat-list divider grip on hover and for the whole drag (switch `DividerHoverLine`); the main chat's dials. |
| #1650 | Fix batch 1 item 7 (P52, #1611): `SpareKeepShortSleep` ON by default (absent = ON, a stored 0 acts only in dev mode); P40's keep unchanged. |
| #1651 🟡 | The two new switches of fixb1 have no Developer-screen control (preferences only); a question for the main chat. |
| #1652 🟡 | Outside fixb1: on Windows the payment send confirm (no auth step on WinUI) and the mini-app confirmations still take Enter on the primary button; a question for the main chat. |
| #1653 | Fix batch 1 #46: CLEAN at r5 (MAJOR 3 → 1 → 1 → 3 → 0, all pin gaps); the security pin net = whole-file SHA-256 of seven files (any edit re-bases after a look at its diff); round 5's MINORs recorded. |
| #1654 | Session Fix batch 1 record: smoke 6516 / the 2 KNOWN (= 6463 + 53), CSH 607; two older send pins fail in the first hour after local midnight (L214). |
| #1665 | The dev file seed (packet P55, dev builds only): Seed 54 documents (20 file rows), Seed 55 voice (16 inline rows + 4 voice files), Seed 56 one chat of 100 messages with 96 photos; fixed times; the image seed's disk rules + a content proof after each move; a complete chat is skipped on a re-seed; one removal loop over 56 indexes. |
| #1666 | The adb walk's five opt-in steps `scroll-files`, `scroll-voice`, `scroll-photos`, `viewer`, `downloads`: local keys that must equal the derived dev-seed addresses; gates; a PROVEN restart or a halt; no PNG kept; seven count polls; four new map keys absent until a calibrate run. |
| #1667 | The parser rows of the five steps; the scroll / long-task / close rows windowed by `stamp2`; the old rows byte-identical. |
| #1668 | The security lens of batch `filewalk` + two inherited findings: a seed chat is not network-silent (presence lookups at every open); Core decrypts an rsa2 chat without a signature check (legacy, for the BE engineer). |
| #1669 | QUESTION: the walk step `send` is not built (`input text` is forbidden by #1522 ②; no log line at the bubble; a send to a seed contact queues a pending message). Options a–d; recommended (c) no step before the launch. |
| #1670 | QUESTION: the walk step `live` is not built (no existing input without a real peer). Options a–d; recommended (c) by hand before the launch. |
| #1671 | What the new steps cannot measure (the viewer's full view, video) and how the two tap points are found; QUESTION for the main chat: the `accountDownloads` point from a render of the built settings shell (recommended). |
| #1672 | The recorded residuals of the #46 loop of batch `filewalk`. |
| #1673 | Session "File chats and walk steps 3" record: CLEAN at r5 (MAJOR 6 → 1 → 1 → 4 → 0); smoke 6505 / the 2 KNOWN (= 6463 + 42), CSH 611; `SDevSeed.cs` UNCOMPILED until `redesign-ci`; the operator block did not run (its gate); questions #1669, #1670, #1671 ⑤. |
| #1674 | The operator block of batch `filewalk` ran (2026-11-17): the map is calibrated for `viewer` (`fcc247f`, pin b6 re-based), `downloads` stays no data (the row is below the first screen), two runs agree on 31 / 33 rows (the voice-chat open differs). |
| #1680 | Cold start 1 (CS-02 of #1626, packet P57): 32 developer-only marks `[P1] cold <token> t=<ms>` (ms since the Android process start) + the anchor `[P1] cold logger t= req=` (written LAST by the one flush after `Logging.start`); one inserted statement per mark; one-shot per mark; `[Conditional("SPIXI_DEV_COEXIST")]`: a store build has no call; Android only; valid for a COLD launch only. |
| #1681 🟡 | The security lens of the marks (BE reviews at handover, P57): log lines are the only gate trigger; no value of the code around a site; the presence of `wallet_out` / `home_*` tells the boot branch; the dev-only `OnPageStarted` override touches no content (PARAMOUNT holds); the wallet load is timed from outside. |
| #1682 | CS-03: the full-AOT build is `-p:AndroidEnableProfiledAot=false` on the command line (no csproj change); the A/B protocol (A, B, A again; two runs × 5 each; one day; #1530); a custom AOT profile only at ≥ 150 ms (#1626). |
| #1683 | What the later walk-rows batch (CS-01 + the summary rows, after `filewalk`) must add to `adb-walk-parse.ps1`; the scratch parser `split.py` is its reference. |
| #1684 | The pins of Cold start 1 — the review stopped at round 3 by rule 9 (a define in a caller file, a shadow class: holes that need deliberately hidden code); Damir accepted the limits (#1627): `pins-coldstart1/a-lines` (6 rows: DEV ONLY, CALL SITES, NO MOVE, NOTHING NEW, HARNESS, FREEZE — `P1Perf.cs` and `ColdStartRules.cs` whole by SHA-256); csh `ColdStartTests` (15); re-bases: `a-extra` `OC_FROZEN` (#1596), `pins-s9/a3-wiring`, the inline #461 pin. |
| #1685 | Session "Cold start 1" record: stopped at review round 3 on the pin (rule 9); Damir accepted the limits (#1627); CLEAN at round 4; merged `redesign/frontend` @ `8b3c4ae4`, smoke 6522, CSH 622; delivered by #1546; the operator block follows. |

### Session Fix batch 2 (`fixb2`, 2026-11-17, #1695–#1706, L225–L230, packets P59–P62)
| Row | Rule |
|---|---|
| #1695 | Windows safe-default confirm: on `Opened` (+ once at Low priority) the KEYBOARD focus goes to the Cancel (Close) part only, then its accent; the text sits in a non-focusable ScrollViewer (P59). |
| #1696 🟡 | Item 3 has no switch of its own: the focus step is part of `ConfirmSafeDefault`. |
| #1697 | Windows: the payment send confirm and the three mini-app confirms use `SConfirm.askPlainSafeWinAsync` (switches `PayConfirmSafeDefault`, `MiniAppConfirmSafeDefault`; `useSafeDialog` = own switch AND `NativeConfirm`); 🟡 D-1 the entry holds the ConfirmGate (P60, P61). |
| #1698 | The payment confirm's recorded limits — every one toward Cancel (P60). |
| #1699 | What each mini-app yes approves (unchanged) + the legacy risks seen on those paths (P61). |
| #1700 🟡 | Divider line `Margin 0,0,0,0` = on the hairline; reset / default width 400 → 440 (dial); the reset re-fits chat info (P62). |
| #1701 | "Unread messages" = a centred pill like the date pill on every platform; the both-edges gutter stays. |
| #1702 | Centred desktop sheets: `max-height: max(76%, min(100% − 48px, 608px))`; the chat app picker shares it. |
| #1703 🟡 | Desktop wallet tx rows take the chat row's inset (8 / 1 / radius 12) + padding 8 (dial). |
| #1704 | Light Aurora ring: the dedicated token `--outline-select-ring` (#2B47A9, 3.05 : 1); the global action token unchanged. |
| #1705 | #46 stopped at round 3 by rule 9 (three pin scanners); answered by #1735 (a): the pin limits are accepted and recorded; the final readers: 0 MAJOR in the code. |
| #1706 | Session record (walk-ready by #1546 after #1735; merged tree 6617 / CSH 643). |
| #1715 | Photo open 1a PO-1 (P65, switch `PhotoMediaAfterPaint`): a chat open's media pushes wait for the paint signal / the 400 ms backstop; the push text is built off the main thread, byte-identical. |
| #1716 | PO-5 (P66, switch `PhotoFewerFileChecks`): one file-check pass per row; the 1:1 avatar + two prefs once per load (`readReceipts` stays live); the re-check only when a process-wide delete generation moved (`noteFileDeleted()`). |
| #1717 | PO-0 (P69): `[P1] chat onload-main` / `chat read` / `chat media` (dev builds) and `[FLAGS] photo1a mediaafterpaint= fewerchecks=`. |
| #1718 | The walk steps `open-seed` (`-SeedIndex`, a proven restart + a cold rep, the (pid, index) warm-up) and `mem-photos`; new parser rows not required. |
| #1719 ✅ | PO-3 + PO-6 (the thumbnail / waveform store) stopped after review round 2 — the Fable 5.2 limit; parked with its open findings. Superseded by #1728: resumed and finished. |
| #1720 | What images by URL (#1642) can read from the parked store, and what it still needs. |
| #1721 | The spec for "Photo open 1b" (the shell half). |
| #1722 | BE ask CORE-17: keep the last load window of a chat in memory (Core reads the whole file per open). |
| #1723 | The pins of photo1a (`pins-photo1a/a-open`, `c-walk`) and the re-bases (#1568, #1596). |
| #1724 ✅ | The #46 loop: CLEAN NOT CLAIMED at round 5 on a pin gap (no code defect in r3–r5); not delivered. Answered by #1726 (a). |
| #1725 | Session "Photo open 1a" record. |
| #1726 | Damir's ruling in the work session: #1724 → (a), #1719 → (a); complete the session; Fable 5.2 only for its intended work. |
| #1727 | The S15 pin loop hit rule 9 at round 8 (F1 / F2, inherited limits of `pins-s15/c-transport`); Damir chose (a) "Accept, then push" (main-chat ruling #1746). |
| #1728 | PO-3 + PO-6 (the thumbnail / waveform store) resumed and finished: store fix rounds 2 and 3, store round 7 CLEAN; the recorded limits m-1, m-A…m-F; packets P67 / P68. |
| #1729 | The one builder `UiCommandText` for the push text (S15 O-11 kept; byte-identical; packet P70) + the N51 clock position. |
| #1730 | The #46 verdict of rounds 6–9: CLEAN (F1 / F2 recorded). |
| #1731 | The merge with Fix batch 2 (`55feaddc`) and its pin re-bases. |
| #1732 | Session "Photo open 1a" — the record, final state (CSH 766; models; owed: the operator block, compiles). |

### Session Chat shell batch (`photo1b`, 2026-11-18, #1755–#1767, L241–L246, packets P71–P76)
| Row | Rule |
|---|---|
| #1755 | HV-1 (P71, switch `HistoryInsertOnly`, cap `olderInsert`): an older page inserts only its own rows through the same row builders; a render-context key over every build-time read; the full render otherwise. |
| #1756 | HV-3 (P72, `HistoryAnchorOneTask` / `olderAnchor1`): the anchor at `addMessages` and again at `messagesDone` until painted; the fix in one task. |
| #1757 | HV-4 (P73, `FadeFromBand` / `fadeBand`): the composer fade pass starts at the band (binary search); the old walk while a transform runs. |
| #1758 | The developer lines of HV-0 / PO-0 (shell): `[P1] shell older insert …`, `… older frames …`, `[CDPERF] chat-shell late …`, `… build= …` (`data-p1` only). |
| #1759 | HV-5 is C# (`onLoadMore`), not in this batch; the spec for the later C# batch (P-28, HV-5, the C# lines). |
| #1760 | PO-4 (P74, `PhotoTileLite` / `photoTileLite`): the lighter photo tile; the file face made when needed. |
| #1761 | PO-6 shell half (P75, `VoiceWaveLite` / `voiceWaveLite`): fewer wave writes; the one-element wave not built (reason). |
| #1762 | The chat backgrounds of #1644 built; dark Mist `#0C0E10` / `#272B2D` / `#151819`; the light Aurora ring stays (3.024 : 1); the Settings preview = the chat. |
| #1763 🟡 | The floors that moved by the picks of #1644 (recorded; the main chat confirms). |
| #1764 | The five switches (int prefs), their cap words, one `[FLAGS] photo1b` line (P76). |
| #1765 | The chat.html size ceiling 964 → 995 KB (delta stated). |
| #1766 | The #46 loop of the batch (verdict in `docs/review-brief-photo1b.md` § 5). |
| #1767 | Session record. |
| #1790 | Defaults batch (ruling #1750, main chat): items 1–3 built behind three switches; item 4 (the Android lock flash) stopped with a question; the shell defaults are Fix batch 3's. |
| #1791 | A NEW or RESTORED account is written with App lock On (`DefaultAppLockOn`; create body + `applyRestorePrefs`, after the verify; readers unchanged, absent = Off; P79). |
| #1792 | A NEW or RESTORED account is written with Confirm payments On where the row exists (`DefaultPayConfirmOn`; not Windows; `SPayments.cs` / `SConfirm.cs` untouched; P80). |
| #1793 | The app lock's no-auth window is 60 s on the phone and the Mac (`LockDelayOneMinute`, OFF = 5 s; `DefaultsRules.withinGrace`); a verified unlock clears the leaving stamp (R1-2); Windows unchanged (P81). |
| #1794 🟡 | The no-credential device: the lock falls back to the Spixi password, a send to the native confirm alone; D-1 (the "Authentication Failed" alert) proposed for a later lock batch. |
| #1795 🟡 | The Android lock flash: the shell's 3 s belt fires during the absence + an animated pop; the fix needs `lock.html` → a question (A / B / C). |
| #1796 🟡 | Review round 1: 0 MAJOR; R1-1 (the wall-clock measure, inherited) a question; R1-2 fixed; R1-3 Mac plugin unproven. |
| #1797 | The walk: a new Windows account through `ixian.cfg`; no safe new account on the test phone (emulator / spare phone / launch walk); the pin re-bases of other batches. |
| #1798 🟡 | Side effects of the new defaults (recents, the spare keep, the Mac shield, the Settings field write) and the first-notice proposal (none for v1). |
| #1799 | The #46 verdict of the batch. |
| #1800 | Session "Defaults batch" — the record (numbers, models, owed). |

### Session Fix batch 3 (`fixb3`, 2026-11-18 → 22, #1810–#1818, L257–L260, packets P84–P86)
| Row | Rule |
|---|---|
| #1801 | The merges with the Chat shell batch (`c9d6bf64`: one hand merge, `SpixiFlags.cs` init tail; eight pins re-based; a Fable reader CLEAN) and Fix batch 3 (`1ad3a44e`: no hand merge, no re-base); CSH 806; the `e-header` timing flake. |
| #1810 | Fix batch 3 item 1: a mini-app action before `ixian:onload` is refused "not ready"; both catches log the command name + exception type only (P84; no switch). |
| #1811 | Fix batch 3 item 2: chat info re-scans after "Delete history" (both paths), one scan gate, the cache after the gate; chat info's delete runs the Sent sweep (P85; no switch). |
| #1812 | Fix batch 3 items 3 + 4: the walk step `downloads` scrolls the Account hub (swipe → check → tap); `-HistorySeed <k>` (P86). #1666 ④ moved by #1739 (3). |
| #1813 | Fix batch 3: the #46 verdict. |
| #1814 | Session "Fix batch 3" — the record. |
| #1815 | Question Q-2: received downloads after chat info › Delete history (answered by #1816). |
| #1816 | Q-2 answered (Damir #1754): option (a), received downloads stay after chat info › Delete history for v1. |
| #1817 | Fix batch 3 operator block: the four map keys, the `-HistorySeed` state renamed (`$script:HistSeedIdx`; round 5 CLEAN), the device runs. |
| #1818 | Finding: the `-HistorySeed` row "first swipe -> 1st page" gives no data (log order); recorded, fix direction in a later scripts batch (Q-3). |
| #1775 | The third-party notices against what ships: one inventory (37 components), 49 licence texts in `Spixi/Resources/Raw/licenses/`, UNPROVEN facts as questions (packet P77). |
| #1776 | The two packaging refusals (the P-07 park inside the lean target; no out folder in the project folder but under obj / bin) and the link refusals; the recorded obj / bin limit (P78). |
| #1777 | The plain `smoke-packaged` fixed at its cause (the copy is a git work tree, Core linked beside it, links removed first); L-1 closed by #1783. |
| #1778 | CI runs the parser cross-check and the MSBuild harness (`--fake`, `--real`) after CSH; no new action, secret, permission or fetch. |
| #1779 | The lean expected reds re-based (`copy: []`; css / js lists checked by GATE 2). |
| #1780 | With the lean switches off the package is byte-equal to the base but `Raw/licenses/**`. |
| #1781 | ⛔ #46 of the follow-up: NOT CLEAN at round 5 — superseded by #1783. |
| #1782 | Session "Speed lean follow-up" — the record (stopped before the push; models; numbers). |
| #1783 | #46 round 6 of the follow-up (ruling #1753): L-1 and r5C-1 closed in `b-refusals.mjs`; CLEAN (one Opus reader); R6-1 recorded (outbound link cases skipped where the temp folder is linked). |
| #1784 | Session "Speed lean follow-up" — the delivery record (three base merges, numbers, push by #1546). |
