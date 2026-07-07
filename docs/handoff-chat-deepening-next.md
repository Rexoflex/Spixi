# Handoff → next session: chat surface DEEP + working on Windows. Next = wire the OTHER shells to the bridge (breadth).

**Damir first:** commit this batch (GitHub Desktop) before starting the new chat. The redesigned **chat** surface now runs on the real bridge with real data on Windows — text, status ticks, **file transfer, group sender labels, app invites, reaction-likes**, plus the **secure notice + centered-when-empty layout**. All audited CLEAN. Start a fresh Opus chat from this file.

## Boot ritual
`CLAUDE.md` (status tail) → `DECISIONS.md` rows **#177–#181** → this file →
`docs/be-cutover-brief.md` (the deferred-C# work order) → `docs/chat-batch2-spec.md` →
`docs/handoff-stage4b-bridge-next.md` (the bridge-wiring pattern + workflow constraints — STILL AUTHORITATIVE).

## What this session did (all in `src/shells/chat.html`, ZERO C# change, frozen bridge)
- **#178 files + groups**: typed row model (`kind` 'text'|'file'|'app'); `addFile`/`updateFile`→`createFileBubble`+`setFileProgress` (fileIndex map, `ixian:acceptfile`/`openfile`); `updateGroupChatNicks` + grouping fix (runs break across kinds AND senders) + `resolveNick`/`groupNicks`. Audit CLEAN.
- **#180 apps + reactions**: `addAppRequest`→`createAppBubble` (state from localSender/appStatus; reuse `ixian:installApp`/`joinApp`); `addReactions`→`applyReactions` **likes interactive** (toggle → `ixian:contextAction:like:<id>`, keyword confirmed xaml.cs:1045), persisted across re-renders; **tips omitted** (token is `tip:<txid>` not an amount), **no `own` flag**. Audit CLEAN.
- **#181 secure notice + layout** (Damir screenshot feedback): `createSystemNotice` (shield-lock) ALWAYS first in the log (mirrors legacy `private-messages-note`, chat.js:1404; was missing). Layout: **messages bottom-anchored to composer**, **notice floats centered** above via `#messages > .c-sysnotice { margin-top:auto; margin-bottom:auto }` (empty chat → dead-center; rises as it fills; collapses on overflow → scrolls, newest bottom). "How it works" → `ixian:openLink:https://www.spixi.io/help-center.html`. Final consolidated audit CLEAN. **Damir on-device confirmed "perfect."**

## DEFERRED — needs C# (do NOT ship fragile). All in `docs/be-cutover-brief.md` (C1–C7)
- **Payments** — component assumes inline request-in Pay/Decline the frozen bridge can't cleanly feed; role/status live in localized strings (statusIcon is only `fa-clock`/`fa-check-circle`). Needs `statusEnum`+`kind` args (~1-2h), + fiat/insufficient. **Inline Pay decision**: reuse `ixian:viewPayment` (opens existing confirm/sign page, zero C#, recommended) vs new signed path.
- **Calls** — `addCall(id,message,declined,time)` is lossy (no missed/answered/duration). Needs enriched args (~½ day). Reuse `ixian:call` for call-back.
- Left as safe console.debug stubs in the shell: `addPaymentRequest`/`updatePaymentRequestStatus`/`updateTransactionStatus`/`addCall`/contacts/channels/call-button/warning.

## STRATEGY (Damir 2026-07-07 — the through-line)
**Ship every ZERO-C# type now → get the whole app working + tested → THEN one focused BE pass** against a working app. Deferred C# accumulates in `docs/be-cutover-brief.md` (the BE work order). Don't interleave C# changes; don't ship anything that misrepresents money/call state.

## NEXT WORK — breadth: wire the OTHER shells to the bridge
The whole app runs on real data only once wallet/apps/settings/launch are wired like home/chat. Recommended order + method (same pattern as home/chat):
1. Pick a shell (suggest **wallet** first — most surface, pairs with the later payment BE work; or **settings** for a quick momentum win).
2. Read its C# page's `sendUiCommand` set + legacy `js/<name>.js` handlers (contract).
3. Author `src/shells/<name>.html` following the home/chat pattern — register the C# push handlers via `bridge.exposeAll`, emit legacy `ixian:` verbs via `bridge.send`, and **fire `bridge.ready()` on the window `load` event** (the #177 load-timing invariant — premature ready races C#'s first push → empty until refresh).
4. Repoint `scripts/build-shells.mjs` manifest to include the new shell.
5. Accumulate any C# gaps into `docs/be-cutover-brief.md` (the "Other shells" table is ready for rows).
6. #46 audit (read-only agent, file:line) per shell → Damir F5-tests on Windows.

After all shells: full-app Windows test → Android round (`maui-integration-test-plan.md`) → item-5 C# repoint table (canonical §5 shell filenames, BE) → the BE cutover pass → Phase 4 freeze audit.

## Build / test ritual (Damir runs locally — PowerShell, one line, no `&&`)
- `node scripts/build-shells.mjs` (default = chat+home; add new shells to the manifest) → re-inlines `src/shells/*.html` into `Spixi/Resources/Raw/html`.
- Only re-run `node scripts/build-demo-bundle.mjs` if a COMPONENT source changed (shell-only edits don't need it — components are already bundled).
- F5 the `net10.0-windows` target in Visual Studio (CLI `dotnet run` hits the 9009 packaged-launch quirk → use F5 or `-p:WindowsPackageType=None`). C# build warnings (CoreStreamProcessor/SFilePicker/MauiProgram/ConsensusConfig) are pre-existing, not ours.
- Commit via GitHub Desktop only. Every decision → a `DECISIONS.md` row.

## Key files
`src/shells/{home,chat}.html` (the wired pattern) · `scripts/build-shells.mjs` + `scripts/lib/inline.mjs` · `src/bridge/native.js` · `docs/{be-cutover-brief,chat-batch2-spec,handoff-stage4b-bridge-next}.md` · `Spixi/Pages/**/*.xaml.cs` + `Spixi/Resources/Raw/html/js/*.js` (legacy contracts) · `ARCHITECTURE.md` §5/§7/§9 · `DECISIONS.md` #177–#181 · `CLAUDE.md` status.

## Flags / parked
- Avatars = gradient fallback (C# avatar paths don't resolve in self-contained shells; needs data-URI or resolvable path).
- Confirm `https://www.spixi.io/help-center.html` is the intended live security URL (Damir supplied it).
- Secure-notice copy is inline in the shell (window.SL-overridable) — fold into the i18n extraction at the next strings pass.
