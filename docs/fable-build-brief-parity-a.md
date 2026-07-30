# Build brief — PARITY BATCH A (zero-C#, post-#296 audit)

**Work order for the next build session.** Source of truth: `docs/legacy-parity-audit.md`
(#296). Every target below is audit-verified with file:line in both trees and survived an
adversarial refutation pass — do NOT re-derive the evidence, spend the tokens on building.
Read the audit doc §(a) first, then this brief. Line numbers are HEAD `20089c10` + the docs
commit; re-anchor by symbol if drifted.

## Ground rules (unchanged)

- **ZERO-C#. Frozen bridge.** Every item below works against verbs/pushes that already exist
  in current C# — that is why it's batch A. If an item turns out to need C#, STOP, log it,
  skip it (#215 discipline).
- ★ #221 chat isolation untouched. No money-path changes (R2 renders a cost line only —
  display, no send gating beyond what legacy did: legacy did NOT gate send, only disclosed).
- Components will change → **FULL build sequence, bundle BEFORE shells**:
  `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` →
  `build-shells` → `i18n-lint` + `pseudo-locale-smoke` + `smoke-test`. New string keys get
  inline en fallbacks; expect extract to pick them up (0 conflicts).
- Add smoke assertions per item. **#46 loop after the batch** (auditors → fix → break-my-verdict),
  then Damir F5 + commit as ONE batch.
- Sandbox gotcha (if run via the device bridge/VM): mount may truncate large files for
  bash/node — edit via file tools, verify via Read; MSBuild stale-asset gotcha in
  `docs/handoff-2026-07-29d.md` §gotchas applies at F5 time.

## Items (all zero-C#)

### A1 — R1: "Show older messages" (HIGH — the headline regression)
`src/shells/chat.html` `clearMessages` currently discards `showMore` (~:2242 "loadmore is a
stub verb"). C# is fully alive: `SingleChatPage.xaml.cs:151-153` dispatches `ixian:loadmore`,
`:373-375` grows the window (+100, `Config.cs:57`), `loadMessages` pushes `show_more`
(`:1248-1251`) and re-flushes clearMessages→re-add, which the shell's burst renderer already
handles. Build: when `showMore` is true, render a "Show older messages" affordance ABOVE the
first message (above the secure-notice/log start; a pill/button in the log header region —
respect the #181 centered-when-short layout) emitting `bridge.send('ixian:loadmore')`; show a
brief loading state until the re-flush lands (clearMessages will fire — reuse the load-burst
gate so there's no flash, #190/#191 class). Preserve scroll position sanely after re-render
(anchor to the previously-topmost message id if cheap; otherwise accept top-jump — legacy
jumped too). Do NOT wire `attachLazyHistory` (needs C# prepend — stays deferred, A-item in
audit §e). String key: `showOlderMessages`.

### A2 — R2: paid-bot cost bar + per-message paid marker
`setChatMode` (chat.html ~:2174-2191) drops `cost`/`costText`. `setComposerCost` already
exists (`src/components/composer.js:338`, demo-proven in desktop.html:1262). Wire: on
`setChatMode` with a non-zero cost, call `setComposerCost(costText)` (C# sends it localized —
pass verbatim, Q4/#187 precedent). Per-message `paid` flag is already threaded into flags
(chat.html ~:2277-2281) — add a small paid glyph/affix to the meta row in
`message-bubble.js` when `paid` (both directions; use an existing registry glyph — wallet/coin
class; if no suitable glyph, text affix from a string key `paidMarker`). Check states matrix
demo renders it.

### A3 — R8: in-chat unread-elsewhere badge
`setUnreadIndicator(n)` is a dbg stub (chat.html ~:2448); C# pushes on every unread change
(`SingleChatPage.xaml.cs:2044/2050`). Render a count badge on the chat topbar BACK button
(mobile/single-pane only — desktop dual-pane shows the list; gate on `!data-desktop`).
Badge grammar = #48 (error role + ring) at topbar scale; aria-label via strings
(`unreadElsewhere`). 0 → remove.

### A4 — R9: contact-details presence render
`contact_details.html:397` stores `state.online` from the 1 Hz `showIndicator` push but
nothing renders. `chat-info.js` gets a presence consumer: online dot on the hero avatar
(same grammar as chatlist rows / #117-adjacent) + optional "Online" sub-line for 1:1 context
only (never groups/bots). Live-update without full re-render (the shell already rebuilds on
setAvatar — piggyback or targeted class toggle). Component change → bundle rebuild.

### A5 — R10: rating prompt
`showRatingPrompt` pushed (`HomePage.xaml.cs:2458-2470`, Android/iOS, re-pushes until acted
on) → stub (home.html ~:2025). `rating-nudge.js` exists unwired. Mount it in home.html:
handler → show the nudge (sheet/modal per the component's own grammar), Yes/No →
`ixian:rating:yes|no` (handler alive `HomePage.xaml.cs:642`). Dedupe: don't re-show while
visible. Strings: reuse the component's keys; extract picks up any inline additions.

### A6 — R11: bot description (chat-shell leg only)
`setChatMode` drops `botDescription`/`serverDescription` (chat.html ~:2174-2191). Render it
in the CHANNEL SELECTOR sheet header (the bot-surface the shell owns, #97/#252 Q9) — a
body-sm neutral-02 line under the bot title. The nicer ContactDetails-pane home needs a
`setGroupInfo` arg = small-C# → NOT this batch (logged in audit §a R11).

### A7 — R13: 64k message guard
Legacy alerted + aborted at >64 000 chars (`js/chat.js:403-406`). Composer + send path have
no guard; transport is URL navigation (encodeURIComponent ~3× inflation). Add a guard in the
chat shell send path (not composer.js core — keep the component generic unless a `maxLength`
opt is cleaner): >64 000 chars → block send + toast (string key `messageTooLong`, mention the
limit). Count raw chars like legacy (pre-encode).

### A8 — R12: scan zoom preset
Legacy: `showZoomSliderIfSupported: true` + `applyVideoConstraints({zoom: 2.0})` after 1 s
(`legacy scan.html:70-86`). Vendored html5-qrcode supports both. Restore in
`src/bridge/scan-page.js` (torch precedent at :74): apply the 2.0 auto-zoom on start
(capability-guarded, fail-soft) — the slider is optional; if the redesigned scan UI has no
natural slot, auto-zoom alone matches the legacy default experience. Guard: never crash on
unsupported (desktop cams — #263 device-pick path must still work).

### A9 — R14: dual-capability app multi-launch choice
`home.html:1505-1506` + `app_details.html:154-156` force solo when `isSingleUser && isMultiUser`
(legacy modal: `index.html:649-667`). Both C# verbs alive (`ixian:startApp`/`ixian:startAppMulti`,
`HomePage.xaml.cs:720`; app_details routes exist). On tap of a dual-flag app: sheet with two
actions — "Launch solo" → `startApp`, "Invite a contact" → `startAppMulti` (native picker
follows, legacy parity). Multi-only and single-only behavior unchanged. Strings:
`launchSolo`/`launchInvite`(or similar). Apply in BOTH surfaces (home apps tab + app_details).

### A10 — R7 (home leg only): wallet-tab Share
`home.html:1350-1353` silent clipboard fallback on WebView2. Cheapest correct fix: emit the
LIVE orphaned verb `ixian:share` (`HomePage.xaml.cs:635` → native Share.RequestAsync) when
`navigator.share` is absent; keep navigator.share when present (iOS). At minimum port the
settings shell's hardened toast fallback (#235b, settings.html:885-897). The settings-shell
share leg needs a small-C# SettingsPage verb → batch B.

### A11 — R4 (FE leg only): backup reminder render
`toggleAnimatedSlider("backup-prompt")` pushed (`HomePage.xaml.cs:2077-2085`) → stub
(home.html ~:2026). Mount `backup-nudge.js` (exists, zero callers) in home.html: push →
show the nudge; CTA → `ixian:backup` is DEAD on HomePage in current routing — verify first
(#215): audit lists `ixian:backup` among dead handlers... it EXISTS at HomePage:533. Verify
it still navigates to backup; if not, route the CTA to `ixian:settings` + the landtab/hub
backup row instead (zero-C# path). Dismiss = local only. ⚠ KNOWN: C# burns
`backupReminderTimestamp` on push (`:2083`) — the first nudge after this fix may be one
interval late; the burn fix is small-C# = batch B (Damir dial R4).

## NOT in this batch (blocked on Damir dials / small-C#)

R3 media-cap flip (dial: iOS-only vs all) · R6 mobile tx "View details" row (re-opens the
iOS-13 decision) · R7 settings share verb · R4 timestamp-burn C# fix · R11 ContactDetails
description arg · R5 dev cluster (v1.0 item 4 — own unit: entry gesture + onSendLog wire;
zero-C# but scoped separately because it touches the Account hub grammar) · everything in
audit §(c) security (BE engagement).

## Definition of done

Each item: built + smoke assertion(s) + demo surface updated where one exists (components.html /
chat.html demo / states matrix). Batch: full pipeline green in-session where the environment
allows (else flag for Damir local), #46 loop CLEAN, DECISIONS row (#297+) written, CLAUDE.md
status line, F5 checklist for Damir per item (2-device for A1/A2 bot legs if available), ONE
commit after F5.
