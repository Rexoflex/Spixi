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
