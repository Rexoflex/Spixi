# Open Items — Consolidated Backlog (2026-07-28)

Compiled by the planning/review session to complement the main build session.
Sources: full row-by-row reconciliation of `be-cutover-brief.md`, `handoff-2026-07-27-postreview.md`, `handoff-post-freeze.md`, `opus-review-macsession-282-283.md`, `security-review-for-be-engineer.md`, `ios-sim-findings.md`, `mac-bringup-*`, plus the roadmap/punch-list/spec docs — **every claimed-landed item spot-checked against the current tree** where cheap. Also includes NEW findings from today's independent three-way audit (features / UX / technical health) not tracked in any existing doc.

Legend: `[verified]` = status confirmed in code this session, not just doc state. Existing IDs (C…, CH…, W…, S…, L…, A…, CI…, CO…) refer to `be-cutover-brief.md` rows. This doc lists **open items only** — landed rows are omitted (landed-with-residuals appear with only the residual).

---

## 0. NEW — found today, tracked nowhere else

| # | Sev | Item | Evidence |
|---|---|---|---|
| NEW-1 | **HIGH** | `build-shells.mjs all` overwrites LIVE `apps.html` + `wallet_send.html` with mock-data demo pages (`SHELLS` map rows `apps:`/`payments:`), and handoff-2026-07-27 *instructs* running `all`. Only git-restore protects the live money page. Fix: split demo targets out of `all`; add preflight refusing to overwrite pages with a live C# host | scripts/build-shells.mjs map rows [verified] |
| NEW-2 | **HIGH** | Backup success is optimistic and can be false: `ctrl.done` fires when the share sheet *opens*; CTA morphs to "Backed up" + nudge cleared even if user cancels. Trust-critical for a wallet app. Interim fix: neutral copy ("Backup file prepared — save it somewhere safe"), don't stamp date; real fix = S2/S12 completion callback | src/components/settings-backup.js runBackup (in-code comment admits it) [verified] |
| NEW-3 | **HIGH** | Cold-start shows "No chats yet" to populated accounts: home shell drops boot splash at `window load`, before the `clearChats→addChat×N` flush; no hydrating-vs-empty distinction (also wallet tx list, contacts). `chat.html` already has the right pattern (`chat-boot` + 5s safety) | src/shells/home.html boot sequence + chats-shell.js empty render [verified] |
| NEW-4 | MED | `showRatingPrompt` is a `dbg()` no-op stub in home.html — C#'s rating flow lands nowhere; `rating-nudge.js` + `backup-nudge.js` components exported but never mounted by any shell | src/shells/home.html:1937 [verified] |
| NEW-5 | MED | Text multi-select: `chat-select.js` fully built + copy-sweep strings exist, but wiring is `select:false` and appears in NO doc's open list — untracked gap | chat shell config [verified] |
| NEW-6 | MED | Windows push notifications = empty stub (`Platforms/Windows/SPushService.cs` all no-ops) — on no backlog anywhere | [verified] |
| NEW-7 | MED | Rework dropped 5 locales vs legacy (cn-cn, id-id, it-it, ja-jp, lt-lt). Decide: restore via `build-locales.mjs` draft pipeline, or accept + announce | src/strings/ vs Resources/Raw/lang [verified] |
| NEW-8 | MED | Full-list re-render per keystroke in chats/wallet/contacts shells (`listEl.textContent=''` + rebuild) — jank risk on low-end Android WebViews; row diffing is a logged enhancement (spec §9) but unscheduled | chats-shell.js / wallet-shell.js |
| NEW-9 | MED | Media viewer has no pinch-zoom ("post-v1" in-file) — table-stakes for a messenger; at least double-tap 2× | media-viewer.js |
| NEW-10 | MED | Bottom-nav unread badge invisible to screen readers (aria-label on bare span); fold count into button label like `scroll-latest.js` does | bottomnav.js:96-107 |
| NEW-11 | MED | Hardcoded English in a11y surfaces: `aria-label="Loading"` in 10 shells, chat-log label, all `<title>` values bypass SL substitution | shells markup |
| NEW-12 | MED | Collapsed "Advanced" backup section stays keyboard-focusable (aria-hidden without `inert`); copy the `chats-header.js` inert grammar | settings-backup.css:224-238 |
| NEW-13 | LOW | Lazy-history load failure is silent (spinner removed, no retry hint) | lazy-history.js:51-54 |
| NEW-14 | LOW | Copy-confirmation grammar inconsistent: toast ("Copied") in settings/apps-details vs button-morph ✓ in wallet-receive — standardize on morph | — |
| NEW-15 | LOW | Token hygiene: apps-header.css uses keys-tier tokens + raw rgba gradient stop (only 2 non-semantic uses repo-wide); message-bubble.css mention washes self-flagged "TOKEN CANDIDATES" | apps-header.css:44-45, message-bubble.css:281-287 |
| NEW-16 | LOW | Overlay focus trap filters only `.disabled`/`.hidden`, not CSS-hidden elements (`offsetParent`/`checkVisibility()`) | overlay.js:36-40 |
| NEW-17 | LOW | Repo hygiene: `.gitattributes eol=lf` (116-file CRLF churn), `scripts/_f5repro.mjs` scratch file, stale `src/strings/draft/*.todo.json` | — |
| NEW-18 | PROCESS | ~29 components exist in code but ❌ in Figma — superseded by "code-first" decision, but DESIGN_SYSTEM.md §6 rule should be formally amended so the design doc stops claiming authority | DESIGN_SYSTEM.md §3/§6 |

---

## 1. Security — open items (ship-gating first)

| ID | Status | Item | Blocked on |
|---|---|---|---|
| #234 §1a | **OPEN MAJOR** [verified] | Resume/privacy lock dismissible via Cancel WITHOUT password — `App.onUnlock` ignores success bool (`App.xaml.cs:218-220` unconditional release); user-confirmed on device | BE design decision |
| MAJOR-5 / iOS-10 | **OPEN** [verified] | Mini-app external-link handoff unscoped: `iOSWebViewHandler` registered globally (`MauiProgram.cs:51`), LinkActivated has no TargetFrame/trust scoping — scripted `a.click()` in third-party mini-app HTML hands off to OS browser | C# scoping fix |
| MAJOR-4 (sec doc) | **OPEN** | Mini-app WebViews plausibly share shells' `file://` localStorage partition → third-party code can read `spixi.draft.<addr>` plaintext + address-bearing keys | (1) 5-line test mini-app to confirm per platform (2) separate partition |
| L8 | **OPEN** [verified] | Wallet password stored PLAINTEXT in Preferences, never cleared (`waletpass` misspelled removal key persists; `Node.cs:247-251`) | BE ~2-3h SecureStorage |
| C15 / MAJOR-3 (sec) | **OPEN** [verified] | Link-confirm modal spoofable: `HtmlDecode` AFTER modal shows URL, no scheme allowlist (`SingleChatPage.xaml.cs:344`, only `.Contains("://")`) | C# fix + BE review |
| L6 | **OPEN** [verified] | Restore mutates state BEFORE verifying password (wipes onboarding/lock flags, overwrites walletpass) — `LaunchRestorePage.xaml.cs:124-131` | BE ~1h verify-then-commit |
| L2 | OPEN | Password-over-URL parse divergence (UrlDecode; create vs unlock/restore) → silent lockout for passwords with `+`/`%xx`/space/`:` | BE ~1h canonical capture |
| S16-residual | OPEN | `TransferManager.cs:542` receive-time remote-peer filename traversal (write path) — resolver guard (#267) covered downloads-open only | BE ~30min |
| MAJOR-5 (sec, #5) | 4 BE asks open | popModal(page) helper for class-wide pop-the-top `PopModalAsync` hazard; answerable-from-lock product call; OnDisappearing Dispose guard vs ModalStack; sanity-check of lock-wins fix | BE |
| MINOR #246 | OPEN low | Resume-lock staging input-freeze targets wrong grid on non-Grid legacy hosts (≤1.2s input-live window) | BE call |
| Doc-debt | OPEN | PLATE-5 instructed logging the two mini-app regressions in security-review doc — rows still absent; robustness nit: `new Address(str)` before null-guard in onAccept/DeclineRequest | doc + trivial |
| §2 standing | constraints | W5 native-confirm mandatory (keep gated) · C12 C# names temp file/caps size/validates MIME · CH3 `deleteh` must be auth-gated (currently NOT LockPage-gated) | applies at cutover |

## 2. Verified regressions & platform bugs (from mac-session review + iOS findings)

| ID | Status | Item | Blocked on |
|---|---|---|---|
| MAJOR-6 / PLATE-5b | OPEN [verified] | Mini-app pages lose safe-area inset — `hasLegacyPageChrome` (`SpixiContentPage.cs:197-212`) has no MiniAppPage classification | C# |
| MAJOR-3 / iOS-31 | PARTIAL [verified] | Unread-stuck: fix pushes `setContactStatus` but still passes derived `friend.getUnreadMessageCount()` not literal 0; struct-in-List `contactStatusCache` copy bug remains (`HomePage.xaml.cs:102/110`, drain :2440+) | repro w/ Inspector; possibly Ixian-Core |
| MAJOR-4 / iOS-6/29 | OPEN [verified] | Composer under keyboard on device — `chat.html:3014-3016` gate (`innerHeight - vv.height > 60`) declared dead on device; other input-bearing shells may need same handler | device Inspector session |
| iOS-27 | OPEN | CRASH on real iPhone receiving contact request (sim guards #280 didn't cover) | .ips crash report |
| iOS-28 | OPEN | Deleting a contact leaves its chat row (tombstone only set by row menu) | xplat delete-refresh batch |
| iOS-32 | OPEN — **SHIP GATE** | Thermal/battery parity vs legacy Spixi | Release-build unplugged measurement |
| iOS-14 / iOS-30 | OPEN | Request-row address size; contacts/new-chat narrower than chats list | Inspector measure |
| iOS-18 | OPEN | Multiuser app user-picker still OLD design | apps batch |
| iOS-21/22/23 | OPEN | How-to link, dev-mode/send-log unreachable (no `ixian:dev` emitter exists in src/ [verified]), Terms+Privacy missing from About | S13 + S9 verbs |
| iOS-26 | OPEN | Groups back into contacts directory + people/groups filter chip | product batch |
| MINOR-1 | OPEN | `SettingsPage.onDeleteHistory` never re-renders an open conversation pane (desktop split) | small C# |
| MINOR-2/5 / PLATE-6 | OPEN | Safe-area CSS: toast, pending-strip + request pane, encpass footer bottoms; no left/right insets anywhere (landscape) | FE CSS |
| MINOR-3 | OPEN | `fitTile` clamps aspect 0.75 → letterboxes tall media, downscales small media | FE |
| MINOR-4 / iOS-19 | OPEN | Backup stamp = cross-WebView `file://` localStorage, plausibly unshared on WKWebView; it's the ONLY remaining backup prompt (C# reminder = dbg no-op) | device verify + S2 |
| MINOR-6 | OPEN | Backup date uses default locale not `docLocale()`; standalone backup shell doesn't refresh status after stamping | FE small |

## 3. BE cutover — still-open rows (from be-cutover-brief, reconciled)

**Chat:** C1/C2 (statusEnum+fiat on payment cards) · C3 (inline-pay decision) · C4-residual ("call back" shows during active call) · C6 (tip token normalize) · C7-residual (decline-NOTIFY → Ixian-Core) · C8 (emoji reactions — Ixian-Core store; re-apply DECISIONS #215) · C9 [verified open] (bot-tip guard `SingleChatPage.xaml.cs:1063-1068`, trivial) · C10 (double payment-request cards) · C11 (group ticks landed, 2-device verify owed) · C12 (paste-image verb, deferred to desktop pass) · C14 (link previews — sender-composed, human BE review first) · C16 [verified] (remote msgDelete UI-only, reappears on reopen — ~1h) · C17 (addContact state arg + cancel-request) · C20 (mini-app session accept/decline has NO UI — product decision) · C21 (group typing attribution) · C22 [verified] (call-bar return nav verb, CallPage handles only onload) · GJ1 [verified] ("added to group" system message, ~1h)

**Chats list:** CH2-residual (request w/ message falls to chat list) · CH3 [verified] (markread/delete persistence verbs — no `ixian:markread` handler; session-only tombstone; auth-gate per security §2) · CH4 (pin/mute/favorites flags + persist) · CH5-endstate (structured mention payload) · CH6-endstate (excerpt KIND enum) · CH7-optional (durable drafts — note plaintext = security MAJOR-4 residual) · CH8-residual (group reactor nick empty → truncated-address fallback)

**Wallet:** W1 (raw unix ts) · W2/W3/W4 (optional row enrichments) · **W5 [verified]** (`ixian:signSend` — compose built+gated, no C# handler, caps never injected; HIGH-risk row, native confirm mandatory; PREREQ #255: roster passed UNFILTERED — groups would appear as money recipients) · W6 (fee push; compose shows `WALLET_FEE_ESTIMATE=0`) · W7 (share verb + ExtendedAddress confirm) · W9 [verified: (b) not done — `WalletSentPage.xaml.cs:58-66` checkTransaction precedes hideBackButton] · WP-scan (quickscan → compose fill) · WP-flip (flip cap, retire 3 legacy wallet pages at §5 repoint) · WP-picker (recipient picker redesign #256)

**Settings:** S2 (real backup-status signal — pairs NEW-2) · S5/L4 (live-locale on boot; shells re-boot in en-us after language change) · S6 [verified] (setLockEnabled push success-only — no else branch, `SettingsPage.xaml.cs:447-457`) · S9 [verified] (dev verb — no emitter anywhere) · S11 (Account as true home tab) · S12 (backupAccount password arg — today encrypts with stored walletpass) · S13 [verified] (openLink not in global handler — gates iOS-21/23) · S14-residual (apply success/fail report)

**Apps:** A1-residual (uninstall RUNNING app: no session teardown, can throw + dangling MiniAppPage; FE nit: menuBtn rendered when onMenu undefined) · A3 [verified] (`app_verified` hardcoded false, `AppDetailsPage.xaml.cs:157`) · A4 (onFetchFailed push) · A5b (installed-arg casing) · A8(a)(c) (media flag on addFile; revealfile verb)

**Launch:** L1 [verified] (create-failure release — button wedges forever; one sendUiCommand in failure branch) · L3 (onboarding "Back up now" has no verb) · L5 [verified] (blank wallet-error dialog: lang keys don't exist + `"global -dialog-ok"` typo) · L7 [verified] (restore shows `wallet.ixi.tmp` path)

**Chat-info/Contacts:** CI1-residual (member count; admin/role semantics — fellow-admin kick guard dormant) · CI2 (payment activity enums) · CI3 (1:1 mute verb) · CI4 (bot destructive-action routing decision) · CI5 (FE hero avatar/presence unused) · CI6 (shared-media feed — no push contract, ~0.5-1d) · CI7 (group rename/re-avatar — protocol addition, verbs don't exist) · CO1 (pending flag) · CO2 (group-create host decision) · CO3 (add-contact failure push) · CO4 [verified] (onValidAddress carries no address — stale-✓ race) · CO5 (dual-nick)

**Cross-cutting:** §5-repoint (canonical filenames + setRoute; unlocks C19-residual call-bar-over-legacy-pages + retiring SetLockPage/settings_lock.html/BackupPage/ContributorsPage) · X1-residual [verified] (WalletSentPage avatar not data-URI wrapped — WinUI-only render) · #82 (remote-media IP-leak posture: BE sign-off + opt-out toggle UI) · i18n-C# [verified] (hardcoded English alerts `HomePage.xaml.cs:1175` etc., LockPage "Cancel") · SPLASH-ART (per-OS splash refresh)

## 4. Test/verification debt

| Item | Status |
|---|---|
| Behavioral shell coverage for chat.html/home.html (§5 post-freeze) — REQUIRED before any refactor; smoke suite proven unable to protect them | OPEN, prerequisite |
| Bridge-contract check (every emitted verb ↔ handler, every sendUiCommand ↔ page-global) — currently fails only at runtime, console-only | OPEN — cheap CI win (recommend first) |
| Adversarial #46 review of #273–#281 range — highest-risk seams: #275 composer-lock state machine, #274 localStorage language handshake, #281 runtime selector export | OWED |
| .NET tests: 1 test total (localization). No JS unit tests; 3,656-line smoke covers demo pages only | OPEN |
| Windows F5 of #273–#279 + #283 xplat rows; #273–#278 visual checks | OWED |
| Android: NEVER RUN (checklist Stage 3) | OPEN |
| Mac/iOS: Deutsch locale+dates, lock flow, Safari pass over demos, Stage-4 first-run remainder | OWED |
| Two-device passes (Stage 5): lock↔call both orders (tripwire log line), ZIndex fallback **specified NOT implemented** (`grid.Children.Remove/Add(callStage)`), contact-request both roles, #215 composer-live F5 gate, C11 group ticks | OPEN |
| Punch-list verifications: A1/A2 flicker F5 both themes, B2 pixel-scale probe, B3/B5 Damir dial passes, dark-mode eyeballs DM-1..6, iOS-16/17 eyeballs | OWED (Damir) |
| maui-integration-test-plan harness (RedesignTestPage + *.test.html) never built — decide keep/retire (partially superseded by real-shell device testing) | DECISION |
| audit-refactor-plan P1–P6 wholly unstarted (architecture map, security verification, refactor inventory, characterization tests, `audit-baseline.mjs`); refactors DEFERRED by explicit decision 2026-07-12 — do not re-open without re-litigating | OPEN (gated) |

## 5. FE feature/polish backlog (unblocked or FE-mostly)

- **PRE-1 bundle de-dupe** [verified open]: ~730KB bundle inlined into every shell → Raw/html ≈38MB; one co-located `js/spixi.iife.js` saves ~20MB. HIGH impact, pre-seeded in audit-refactor-plan (constraints documented there)
- Empty states: copy-only, no CTA/illustration — first-run "No chats yet" is an activation dead-end; IL-7..12 illustration slots unbuilt (P1: chats-empty, apps-empty)
- Q1 (restore "Replace file" state) · Q2 (create-screen gradient soften) · Q16 (delete-account full-wipe verify + land on welcome) · Q17 (restore skips backup nudge; community node) · Q18 (rejected request row returns — needs decline tombstone)
- Ph3.5-H2 [verified]: scan torch icon still `eye` stand-in (no torch SVG exported)
- Ph3.5-H4/H5: toast-adoption pass; systematic empty/error/offline pass (connectivity banner landed; pass not recorded)
- FS-R4: desktop conversation text 15px default not applied (mechanism exists); FS-§3.5 threshold alignment unverified
- A11Y-1 (#205, needs Damir sign-off): roving-tabindex radio-group pattern across 5 sites; A11Y-2 verdicts are ACCEPTED — do not re-open
- CP-1 (multi-select media extension = v2; but see NEW-5: even text select unwired) · CP-2 (PIN copy alignment when §9 tiers land)
- M13 i18n sweep batch never run (mount threading audit + per-locale --todo)
- GA leftovers: lock-fail pushes/biometric-retry + `SPIXI_ENV.biometrics` flag · scan denied-state OS-settings deep link · `checkAddress` silent-failure state · wallet filter keeps stale search query · apps-item menuBtn creation-guard
- Apps UX proposal (AUX-1/2/3/4b/5/6): unbuilt; scope reduced by A2 decision (Discover = external link); P0 items are pure-FE (add-flow tiles, install collapse)
- Paste-image (PI-FE/BE): spec'd, deferred to desktop pass by decision
- IL-13..17 illustration/animation slots (P1: install-success medallion)
- Wallet sync status (block height) in wallet hero — wanted, needs C# push
- figma-sweep.md: SUPERSEDED (code-first decision) — archive it

## 6. Suggested priorities for the build session

1. **NEW-1 build footgun** — one-line map change + preflight guard; protects the live money page from the very next `all` run.
2. **Security block (§1)**: #234 resume-lock Cancel bypass, mini-app link-handoff scoping (MAJOR-5), L8 cleartext password, C15 link spoof, L6 restore-order, TransferManager :542 traversal. All are C#-side, mostly small, all ship-gating.
3. **Trust-honesty UX**: NEW-2 optimistic backup + NEW-3 false-empty cold start (both small FE; chat.html already shows the pattern).
4. **Bridge-contract check in CI** — turns the silent-failure class into build errors; cheapest structural win given zero shell test coverage.
5. **Quick verified C# wins** (each ≤~1h): L1 create-wedge release, L5 missing lang keys + typo, L7 tmp-path display, GJ1 system message, C9 bot-tip guard, C16 delete persistence, S6 else-branch push, CO4 address arg, X1 avatar wrap, W9(b) order swap, i18n-C# alerts.
6. **Wallet pass** (W5+W6+roster filter+scan routing+flip) — LAST per #232, with security §2 constraints; then §5 repoint retires the legacy pages.
7. Device-verification backlog (§4) in parallel on the side: Android first run, two-device passes, iOS-32 ship gate.

*Cross-check note: gap-audit.md and polish-roadmap.md are partially stale (many rows landed in #186–#272); this doc reflects re-verified status as of today. When an item here lands, update the source doc row too, or mark it here — whichever list the build session treats as canonical.*
