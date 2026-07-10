# Opus work order — FULL #46 AUDIT+FIX LOOP over DESKTOP PASS 2 (DECISIONS #240–#245b + colors #241/#244)

> **This is a fix LOOP, not a single review pass** (Damir shipped the batch; this
> is the owed adversarial gate). Read the REAL files with the Read tool only —
> the sandbox mount serves stale/truncated copies of session-edited files (#175);
> never trust bash/node reads of tree files. Entry context: DECISIONS **240–245**
> (+ #225 overlay model · #230/#235 lock guards · #232 directives · #221 isolation) ·
> `desktop-split-spec.md` §2.1/§6e.4 (NOTE: §6e.4's master-detail text is
> SUPERSEDED by #243/#245 — the DECISIONS rows are the truth) ·
> `fable-build-brief-desktop-pass.md` (live work order, §4a built).
>
> ## Loop protocol (#46 hard rule)
> 1. Spawn **3–4 READ-ONLY adversarial auditors in parallel, disjoint scopes**:
>    (A) C# overlay/lock/lifecycle — SpixiContentPage stageMargin + HomePage
>    onSettings/close-audit/back/divider + SettingsPage apply/backup/caps;
>    (B) settings.html pane state machine + home.html account-tap/onSettingsClosed
>    (renderLayout/rebuildHub/exit latch/avatar latch/caps);
>    (C) settings-shell.js component deltas (inline pickers, nav hooks, row keys —
>    SHEET MODE MUST BE BYTE-IDENTICAL, mobile regression = MAJOR);
>    (D) tokens.css #241→#244 color rework + --text-link + message-bubble.css
>    (consumer sweep: every var(--green/orange/red/blue/info/success/warning/error
>    consumer against the NEW step semantics, both themes).
>    Findings = MAJOR/MINOR/NIT with file:line, security dimension explicit.
> 2. Land MECHANICAL fixes directly (fixer agents with disjoint file scopes if
>    parallel); architectural findings = 🟡 DECISIONS rows, never silent changes.
> 3. **Adversarial re-review of every fix** (fresh agent, break-my-verdict posture
>    — the #235 lesson: single-pass CLEAN on a cross-file security surface is not
>    enough). Loop fix↔review until CLEAN.
> 4. Close out: verdict appended to THIS file + DECISIONS row + CLAUDE.md status
>    line; Damir's exact local command list at the end (you author source only —
>    §5c: no builds/smoke in-session beyond outputs-dir harnesses).
>
> ## ★ Non-negotiables to attack hardest
> - Chat isolation (#221): nothing in this batch may compose chat into a shared
>   WebView/JS context; settings pane = ONE WebView, settings-only trust domain.
> - Lock un-dismissability (#230/#235): stageMargin must never inset a LOCK stage
>   (locks stage full-span, cover the rail); pushPageLoaded's modalOverlayOp guard;
>   back-swallow ordering in HomePage.OnBackButtonPressed.
> - Money: nothing touches signing; backup verbs are bare triggers, C# names paths.
> - Save-if-dirty close audit: EVERY path that closes/covers the Account pane.
> - Security-flagged C# beyond mechanical → security-review-for-be-engineer.md +
>   be-cutover, gate on human review (#232). Wallet-send stays LAST + gated.

## Scope — full file list across the batch

#240 table below + the addendums (1 = #242 · 2 = #243 · 3 = #245/#244). Net files:
`Spixi/Utils/SpixiContentPage.cs` (stageMargin) · `Spixi/Pages/Home/HomePage.xaml(.cs)`
(divider/cursor/624-clamp · onSettings peer-pane · close-audit · onSettingsClosed push) ·
`Spixi/Pages/Settings/SettingsPage.xaml.cs` (pane/metrics/apply/backup-forward/caps) ·
`Spixi/Pages/Settings/BackupPage.xaml.cs` (static extraction) · `src/components/settings-shell.js`
(row keys · inline pickers · nav hooks) · `src/shells/settings.html` (pane machine) ·
`src/shells/home.html` (account tap + onSettingsClosed) · `src/styles/tokens.css`
(#244 primitives + --text-link) · `src/styles/components/message-bubble.css` (link role).

## Scope (files changed in #240)

| File | Change |
|---|---|
| `Spixi/Pages/Home/HomePage.xaml` | D1: `paneDivider` BoxView (col 0, End, 6px, transparent, IsVisible=false) |
| `Spixi/Pages/Home/HomePage.xaml.cs` | onSettings pane pin + re-tap/resurface guard · `requestSettingsOverlayExit()` + calls in `ixian:tab:`/`onChat`/`onTransaction` · OnBackButtonPressed settings routing · D1 fields/gestures/persist/`OnPageSizeChanged` |
| `Spixi/Pages/Settings/SettingsPage.xaml.cs` | `SettingsPage(bool pane_mode = false)` field + `setPaneMode('1')` first push in `onLoad` |
| `src/components/settings-shell.js` | `key:` added to nav settingRows (chatappearance/notifications/howto/about/downloads/contributors/dev/danger) — additive, bundle rebuild |
| `src/shells/settings.html` | pane CSS block · pane state + 640px split mq · `renderLayout`/`buildScreen`/`getEmpty`/`markSelected` view unification · Contributors un-gated (`capabilities:{contributors:true}` + screen) · handlers `setPaneMode`/`onExitRequest` · new string `settingsEmptyHint` (inline fallback) |
| docs | DECISIONS #240 · be-cutover D1 LANDED / S10 OBSOLETE / S14 softened · desktop-split-spec §6e.4 |

## Attack surfaces (in priority order)

1. **★ Lock invariants (#230/#235) with a pane-hosted SettingsPage.** Claimed: the
   three SettingsPage confirm-locks (`ixian:delete`/`deletea`/`lock:off` →
   `pushModalLoaded`) stage on the overlay-HOST grid (SettingsPage.Content is null
   as an overlay), full-span, added LAST → cover home + pane + divider;
   `canShowInPlace` (`op.host == overlayHost` + top-of-stack + empty ModalStack +
   `modalOverlayOp == null`) holds; `hasModalOverlay()` back-swallow runs BEFORE the
   new settings-back routing in `HomePage.OnBackButtonPressed`. Try to find an
   ordering/stacking path where a lock renders UNDER the settings pane stage, or
   where the new back routing runs while a lock is up.
2. **Close-audit completeness (save-if-dirty).** Claimed closed paths: tab switch ·
   hardware back · chat open · tx open · Account re-tap (no-op). Hunt for any OTHER
   caller that can close/cover the settings overlay without routing
   `onExitRequest`/`onBack` — e.g. `popToRootAsync` callers, `setOverlayHost`
   (HomePage recreate), notification-driven `onChat` (now requests exit first —
   verify the race with the staging chat), `closeTopOverlay` from a NON-settings top
   overlay stacked above settings (ContactDetails/AppDetails full-span over the pane:
   their back closes THEM, settings stays — verify).
3. **The resurface loop** (`onSettings`): `while (!(getTopOverlay() is SettingsPage)
   && closeTopOverlay()) {}` — synchronous stack mutation vs the async main-thread
   teardown in `closeOverlay`; can it livelock, double-close, or close a STAGING
   overlay? Interaction with the `preloadPending` guard.
4. **exitSettings latch vs re-render.** `exiting` gates `renderLayout`/rebuilds; C#
   may push `onExitRequest` repeatedly (tab spam) — verify idempotence and that a
   FAILED pop (verb lost) can't wedge the shell in a dead state worse than today.
5. **Split-mode flip correctness** (`renderLayout`): resize across 640px inside the
   pane with a screen open — detail/takeover re-homing, no duplicate mounts
   (`hubEl.parentNode` guards), scroll restore in `rebuildHub`, `markSelected`
   clearing. Sheets/modals opened from a screen (host = document.body) surviving a
   flip mid-open. Danger confirm open during flip.
6. **D1 gestures.** Pan anchor seeding (WinUI skipped-Started), clamp, persist
   points, divider vs col-1 overlay hit-testing, transparent BoxView hit-test on
   WinUI (`Color`+`BackgroundColor` Transparent — if it doesn't hit-test, drag is
   dead: F5 item, flag if you know a counterexample), narrow-window hide,
   `applyLeftPaneWidth` while a chat overlay is pinned col 1 (live WebView resize).
7. **setPaneMode timing.** Push ordering vs the #225 present (claimed: onLoad pushes
   coalesce pre-present); language-change reload re-push; a STALE pane push after a
   narrow re-open (paneMode is a C# field per instance — new instance per open, so
   narrow opens get no push — verify no localStorage/persisted leakage of pane state
   FE-side).
8. **Component change** (settingRow `key:`): additive only; smoke/static guards
   unaffected; no selector collisions (`data-setting-key` was already used by theme/
   language rows + the #166 i18n intercept).

## Accepted/known (don't re-flag)

- Resize-to-narrow strands the pinned pane invisible-but-open — #225-M2 class,
  explicitly queued next unit (no data loss; back/tab still exit it cleanly).
- Account rail item shows no active state while the pane is open (no home-side signal).
- Chat-appearance dark preview brightness (#239 ⓐ) · 0.36 magic ratio (#239 ⓑ).
- Grip has no resize cursor; RTL pan sign untested (app is LTR).
- Master column fixed 360px (no inner divider) — dial for Damir, not a defect.
- `settingsEmptyHint` inline fallback rides the next extract-strings run.
- S6 dirtyLock canceled-auth · S11 landtab race · S14 pop-on-mobile — pre-existing BE gaps.

## Addendum — F5 round 1 fixes (#242, same review session covers them)

| Fix | Files | Attack |
|---|---|---|
| Pane rendered its own rail (CSS specificity: desktop-rail rule (1,2,0) beat the pane hide (1,1,1)) | `settings.html` new `:root[data-desktop] body[data-pane] #settings-nav` | any OTHER `:root[data-desktop]` rule that can leak into pane mode the same way (check the `body{flex-direction:row}` one) |
| Avatar-only change never dirtied (X1 data-URI killed the `/avatar-tmp/` sniff) | `settings.html` `avatarPickPending` latch | latch truth table: pick→push, pick→CANCEL→later pushes (onLoad re-push after account delete), remove-after-pick, apply clears dirty but tmp file still on disk → next exit's ixian:save re-promotes? (`applyAvatar` deletes tmp on promote — verify no double-promote) |
| Theme/Language as detail screens | `settings-shell.js` `inline:true` on both pickers + `onThemeNav`/`onLanguageNav`; shell `pickerScreen` + buildScreen cases | sheet mode must be BYTE-IDENTICAL in behavior (mobile regression risk); inline option-list latch release; split-flip while a picker screen is open; hub value-label sync after inline commits (state.theme + scheduleRebuild) |
| Backup pinned to the detail column | `SettingsPage.xaml.cs` `pushPageLoaded(..., paneMode ? 1 : -1)` | overlay stacking: backup over settings over home — back order; tab-switch while backup open (requestSettingsOverlayExit targets the BURIED settings — verify no weirdness) |
| **S14 LANDED**: `ixian:apply` + `saveSettingsCore` refactor + `setCaps` push | `SettingsPage.xaml.cs` + shell `setCaps` handler | verify core == old onSaveSettings body exactly (language/lock/nick/avatar/broadcast/home-reload); `selectedLanguage` consumed semantics; apply during exiting latch; cap mutation reaches `bridge.cap` (same object reference, native.js:51/76) |
| Divider: 10px grip + WinUI ProtectedCursor reflection | `HomePage.xaml(.cs)` | reflection null-safety (WinAppSDK rename → warn, not crash); grip width stealing edge clicks |

## Addendum 2 — F5 round 2 (#243): master-detail DROPPED → single-pane sublevels

Damir rejected the hub+detail split ("double pane") — review the REPLACEMENT, don't
re-litigate the split:

- `settings.html`: split machinery deleted (masterWrap/detail/empty/markSelected/
  splitMq); `renderLayout` = one-column takeover nav; pane CSS = rail hide (both
  specificity variants) + demo grammar caps (640px centered screens, sheet padding
  on lifted pickers, hugging backup CTAs). Attack: leftover split references (grep
  sd-/isSplit CLEAN in-session), cap CSS vs base `#settings-root > *` flex rules,
  onThemeNav/onLanguageNav now gate on `paneMode`.
- **Backup sublevel (S15 landed):** `BackupPage.backupAccount()/backupWallet()` now
  STATIC (bodies unchanged, instance handlers delegate; `using System.Threading.Tasks`
  added); SettingsPage forwards `ixian:backupAccount`/`backupWallet` + caps
  "settingsApply,backupInline"; shell renders `createSettingsBackup` in-pane
  (settings-backup.css linked). Attack: fire-and-forget discards (`_ =`), share-sheet
  reentrancy (double-tap CTA — component latches, verify), the ★ rule (no WebView
  path input — verbs are bare, verified), old-exe/new-shell fallback (no cap → push).
- **Pane width:** max 520→624 with a WINDOW-AWARE clamp (`min(624, Width−320)`,
  floor 280) and apply-time-only clamping (field/pref keep the user's pick through a
  window shrink). Attack: Math.Clamp min>max cases, ctor-time Width==-1 path,
  drag past the dynamic ceiling.

## Addendum 3 — F5 round 3 (#245): Account = PEER PANE (+ #244 colors)

The #243 single-column read was over-correction; Damir's demo image = hub in the
LIST-column slot, sublevels in the detail region, rail visible. Review:

- **`pushPageLoaded` gained `stageMargin`** (SpixiContentPage) — presentation-only
  inset on the stage; zero default. Attack: every OTHER caller unaffected (default),
  margin interaction with SetColumnSpan/RowSpan, closeOverlay teardown, the
  transparent 72dip strip's hit-testing (home rail must stay clickable through it —
  the stage's bounds EXCLUDE the strip, so nothing to hit-test; verify no platform
  quirk), lock stages still full-span NO margin (cover the rail).
- **HomePage:** `railWidthDip = 72` coupling to bottomnav.css (documented); onSettings
  wide → span+margin + `new SettingsPage(true, leftPaneWidth − 72)`; onOverlayClosed
  pushes `onSettingsClosed`. Attack: leftPaneWidth mutation between open and metrics
  push (divider covered while open — can't drift), narrow-open path unchanged.
- **SettingsPage:** `setPaneMetrics` push (invariant culture "0" format). 
- **settings.html:** pane = master (--sd-master-w, default 328px) + detail
  (empty-state default, 640-capped sublevels); renderLayout/rebuildHub pane branches
  (hub must never be stolen into the detail — harness-verified); setPaneMetrics
  guard [200,1000]. home.html: Account tap keeps highlight + `onSettingsClosed`
  handler restores it. Attack: rebuild during open sublevel, exit during sublevel,
  markSelected keys (backup row key added — component), `?pane=1` preview.
- **#244 colors:** hotter green/orange/red/blue primitives (anchors 500/400/600/500) +
  NEW `--text-link`/`--text-link-hover` + `.c-bubble__link` consumes them. Attack:
  any consumer assuming the old step semantics (e.g. green-500 was #007052-class
  DEEP in the pre-#241 scale — presence dot/`--surface-presence-online` is now a
  VIVID green: intended), sent-side link override unaffected, accent flip NOT done
  (flagged, Damir's call — launch/lock medallions + list read ticks blast radius).

## Build/verify (Damir runs; fable did not)

`node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
`node scripts/smoke-test.mjs` → build **net10.0-windows** (NOT Rebuild Solution) → F5:
wide Account = pane + master-detail + empty state + row tint · dirty nick then tab
switch/chat open → saved (nick survives re-open) · hardware back routes hub/exit ·
narrow + mobile Account unchanged · Contributors renders (both modes) · divider drag
280–520 + dbl-click reset + restart persist · delete-wallet confirm lock = FULL-WINDOW
over the pane, back swallowed · `?pane=1` browser preview.

---

## ✅ VERDICT (Opus #46 loop, 2026-07-10) — PASS

4 read-only adversarial auditors (disjoint scopes A/B/C/D) + a fresh break-my-verdict
re-review over the 2 highest-risk CLEANs (avatar latch + lock un-dismissability).
Real files via the Read tool only (#175). **0 MAJOR across the whole batch.**

**★ Security/correctness invariants VERIFIED HOLDING (file:line proof in the agent reports):**
- **Lock un-dismissability with `stageMargin` in play — HOLDS.** `stageMargin` lives ONLY on
  `pushPageLoaded` (SpixiContentPage.cs:572); `pushModalLoaded` (:704) has no such param and
  stages every lock zero-margin, full-column/full-row span (:756-763), added LAST → covers
  home + pane + divider + rail. The three SettingsPage confirm-locks + the App.OnResume
  resume lock are the ONLY `pushModalLoaded` callers (no non-lock caller). Fail-closed drop on
  `modalOverlayOp != null` fires at the top of `pushPageLoaded` before any stage/margin
  (:585-589). `canShowInPlace` requires `op.host==overlayHost && NavStack.Last==host &&
  ModalStack.Count==0 && modalOverlayOp==null` (:884-888) → legacy-host resume locks fall to
  a real un-poppable `PushModalAsync`. `hasModalOverlay()` back-swallow precedes the new
  settings back-routing in OnBackButtonPressed (:1741-1744 before :1749).
- **Save-if-dirty close-audit — HOLDS.** tab switch / hardware back / onChat / onTransaction /
  Account re-tap all route `onExitRequest`/`onBack` through the shell's save path; while the
  Account pane spans grid-minus-rail the chats list is covered, so no un-routed overlay can
  stack over settings.
- **Chat isolation (#221) — HOLDS.** settings.html is a settings-only shell; it links
  message-bubble/chat-pattern CSS solely for the STATIC chat-appearance preview + writes chat
  prefs to localStorage for chat.html's own boot — mounts no live chat, reads no chat state,
  one WebView = one trust domain.
- **Mobile sheet mode BYTE-IDENTICAL — HOLDS.** `settingsOptionSheet`/`settingsThemeSheet`
  `inline` logic is fully branch-guarded; non-inline path is the pre-desktop DOM/behavior/latch
  verbatim (settings-shell.js). No mobile regression; every pane/rail rule is
  `body[data-pane]` / `:root[data-desktop]` scoped and cannot match a phone-UA boot.
- **Money / backup — HOLDS.** S15 backup verbs are bare triggers; C# names every path
  (BackupPage.xaml.cs). S14 apply persists only (no keys/paths/signing). Accent NOT flipped
  (still aliases brand); blue feeds only `info-*`; no indigo remnant; link role defined both themes.

**FIX LANDED (1, mechanical, shell-only → rides `build-shells`, NO bundle rebuild):**
- **settings.html `loadAvatar` else-branch now clears `avatarPickPending`** (Auditor B MINOR-1).
  A canceled picker / default re-push (`p===''`) left the latch armed → a later reload push
  false-marked `dirtyAvatar` → spurious Save + exit via `ixian:save` instead of a clean
  `ixian:back`. The pick flow is a SINGLE non-empty push (verified against
  SettingsPage.onChangeAvatarAsync), so clearing in the else-branch cannot drop a real pick's
  dirty (that takes the if-branch). Re-reviewed break-my-verdict → HOLDS, no regression.

**LOGGED — Damir's reserved color dials (his hand-picked anchors #241/#244; NOT silently repainted):**
- 🟡 **Solid info badge AA regression (Auditor D MINOR-1):** `.c-badge[solid][info]` = white 12px
  bold on `--surface-info` (blue-500 #0b87b4) ≈ **3.96:1** < 4.5 AA (was 4.6 on the pre-#241
  indigo). Your logged conditional ("IF solid info badges carry small white text, repoint
  surface-info → info-600") is now CONFIRMED TRUE — `badge.css:25` is the sole `--surface-info`
  consumer. Remedy: repoint `--surface-info → info-600` (#006588 ≈5.9:1) OR give the solid-info
  badge its own info-600 background (preserves your #0b87b4 surface anchor). One-line, your call.
- 🟡 **Sent-bubble ticks contrast (Auditor D MINOR-2):** `--icon-bubble-read/-delivered`
  (green-300/400) on `--gradient-bubble-sent` now dips <3:1 at the lighter gradient stop after
  the vivid green re-anchor; the `tokens.css:485` ">=3:1" comment is stale. F5 eyeball — the
  ticks are intentionally subtle; re-dial to a darker green step if read/delivered are hard to tell apart.
- 🟡 **Warning surface hue (Auditor D NIT):** `--surface-warning` = orange-600 #884b00 reads
  brown vs the bright #ef9132 anchor at 400. AA-good (6.65:1), design eyeball only.

**LOGGED — deferred / pre-existing (not fixed, not regressions):**
- 🟡 **Resume-lock STAGING input-freeze targets the wrong grid for a non-Grid legacy host**
  (Auditor A M1) → security-review-for-be-engineer.md MINOR. Pre-existing, ≤1.2s input-only, no
  content exposure; security-flagged C# → human BE gate (#232). Low severity.
- 🟡 **3 gated-OFF nav rows (onChangePassword/onSecurity/onPrivacy) lack `key:`** (Auditor C
  MINOR) → add keys when caps S7/§9 light up (adding now forces a bundle rebuild for zero prod
  benefit — deferred to the cap-enable moment).
- **Accepted/by-design (no action):** `exiting` latch has no self-heal if C# loses the pop verb
  (Auditor B MINOR-2, not worse than baseline) · `dirtyLock` shows a spurious Save on toggle-back
  → harmless no-op `ixian:save` on exit (Auditor B NIT-1, cosmetic, no savedLock baseline) ·
  divider grip steals the trailing 10px of the chats WebView edge (Auditor A M2, Damir widened
  6→10 deliberately, desktop-only) · vestigial `capabilities.contributors` gate on a static
  screen (Auditor C NIT).

**Net: PASS. 1 mechanical fix (settings.html, rides `build-shells`, no bundle rebuild). Color
findings are your reserved dials; the C# lock-staging edge is BE-gated + pre-existing. No silent
C# changes; wallet-send untouched; chat wall untouched.**
