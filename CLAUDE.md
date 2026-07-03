# CLAUDE.md — Spixi Frontend Redesign

Orientation for any AI or human picking up this work. Keep it current; keep it short.

## What this is

Rework of the Spixi MAUI app's WebView frontend: consolidate 29 HTML pages → 9 flow shells, drop Bootstrap/jQuery/Font Awesome, move to Vite + vanilla JS with a token-driven stylesheet and inline SVG icons. Branch: `redesign/frontend`. The C# side stays as-is; new bridge commands are proposed only.

## Ground rules

- **Plan before building.** Nothing ships without a doc reviewed by Damir + BE engineer (+ a second AI review pass).
- **Bridge protocol is frozen** unless BE approves a new command (ARCHITECTURE.md §8). Existing `ixian:` commands and `executeUiCommand` calls must keep working.
- **Security is non-negotiable** — see SECURITY.md. Shells emit payment *intent*; only C# signs/broadcasts. No keys/passwords in the WebView.
- **Figma is direction, not gospel.** Tokens are the source of truth once locked; adapt layouts where implementation reveals better options, and flag deviations.
- **WebView baseline is conservative CSS.** Flag modern features per-case at demo time.
- **Demos run in a plain browser** via the mock bridge, and are mirrored to Figma.
- **Every doc is concise.** Short tables over prose. If a fact is verifiable in source, cite the file:line.

## Doc index

| Doc | Purpose |
|---|---|
| `DECISIONS.md` | **Decision log — read before changing anything.** Every locked/provisional decision with rationale |
| `ARCHITECTURE.md` | Bridge command inventory, per-view data contracts, 29→9 consolidation, stack, i18n plan, proposed commands, BE findings |
| `SECURITY.md` | Wallet/payment isolation invariants every shell must preserve |
| `CLAUDE.md` | This file — orientation + workflow loop |
| `docs/audit/bridge-audit-A.md` | Source-level bridge audit: Chat, Contacts, Home, Launch, Wallet |
| `docs/audit/bridge-audit-B.md` | Source-level bridge audit: Settings, Scan, MiniApps, Downloads, Dev, Contributors + base class |
| `docs/audit/assets-audit.md` | HTML/JS/CSS inventory, localization mechanism, duplication analysis |
| `DESIGN_SYSTEM.md` | *(pending)* Tokens + component inventory with variants/states |

## Workflow loop (per unit of work)

1. **Scope** — pick the smallest next unit (a shell, a token group, a component).
2. **Draft doc** — write/update the relevant concise .md before or alongside the work.
3. **Build** — against the mock bridge; runnable in a browser.
4. **Verify** — check against the command inventory + SECURITY.md checklist; note file:line for any source claim.
5. **Review** — Damir + BE, plus a second-AI pass. Capture corrections in the doc, not just the code.
6. **Commit** — one logical unit per commit; Damir reviews the diff in GitHub Desktop and pushes.

**Hard rule: every significant decision gets a row in `DECISIONS.md` when it's made** — architecture, naming, conventions, scope. Reviews check 🟡 (provisional) rows first. Superseded decisions are marked, never deleted.

**Hard rule: audit loop per milestone (DECISIONS #46).** Whenever a component set + its behavior is complete, or a major feature lands: spin up an audit agent (read-only, findings with file:line) → fixer agents (disjoint file scopes, explicit cross-file contracts) → adversarial reviewer agent → loop fix↔review until CLEAN. Mechanical fixes land directly; architectural findings become 🟡 DECISIONS rows, never silent changes. Rebuild generators + run the jsdom smoke test between fix and review passes.

## Status

- [x] Repo audited; `ARCHITECTURE.md` written and committed
- [x] `SECURITY.md` written
- [x] `CLAUDE.md` written
- [x] Assume ARCHITECTURE §5 (consolidation) and §8 (new commands) approved — proceeding
- [x] Figma access working (Components page node `9275:74`); variables sampled across Buttons/Text fields/Nav/Chat sections
- [x] `docs/tokens-analysis.md` written — token issues + proposed 2-layer structure (primitives + semantic aliases incl. topbar/bottombar/bubble tokens)
- [x] Token architecture decided: primitives → keys (light/dark modes) → semantic aliases; numeric naming (`spacing/16`); single `action` role; cleanup happens in Figma (source of truth)
- [x] `DESIGN_SYSTEM.md` drafted — ~55-component inventory (18 in Figma, 8 partial, ~29 missing) + missing token groups (z-index, elevation, motion, sizes, layout)
- [x] Damir restructured Figma to primitives (`Spixi - primitives`) → `keys` (mode-less) → `tokens` (light+dark modes live HERE, per token); `keys-responsive` holds desktop/mobile type + spacing; `typography` composes type tokens
- [x] Full 443-variable dump taken; missing variables written via connector: scale fills, numeric spacing renames, size/* keys, layout/* dims, `region` semantic tokens (topbar/bottombar/bubbles/input/qr/presence/progress), pattern-fix renames — see DESIGN_SYSTEM.md §2
- [x] Buttons decision: 3 heights named by value (32/44/56) × width hug/full/fixed; component workflow: Claude builds structure+bindings via MCP, Damir polishes, Figma native AI = exploration only
- [x] 3 mis-bindings fixed in Figma (outline/info dark → info/300; icon/on-action dark → neutral/950; accent-hover dark → accent/200)
- [x] `src/styles/tokens.css` generated (375 custom properties: primitives → keys → tokens light/dark + code-only z/motion/elevation/opacity/scrim); validated — no undefined refs, conservative CSS only
- [ ] **TOKENS LOCKED pending Damir's final look in Figma + tokens.css commit**
- [x] Full Figma sweep done → `docs/figma-sweep.md`: 27 component sets + chat composites (message/payment/app/call bubbles ✅) + 6 screens (Chats/Wallet/Apps×2/Account/Conversation, mobile light). Build split agreed: Claude = structure/bindings/screen drafts + code-first utility screens; Damir = polish + brand-heavy launch screens; dark mode = token swap + verification only
- [x] `layout/bubble-max` (320) added — chat bubble max width; content-max = desktop pane, distinct
- [x] WEB code syntax set on 425 variables (Dev Mode shows exact tokens.css `var(--…)` names)
- [x] **Remote-binding repair (important):** components/screens were bound to a stale REMOTE library copy of the variables — 1,072 bindings repointed to local collections file-wide (Components 991, Screens 81, Chat&Composite already clean; Archive intentionally skipped). Legacy names mapped (`colors/text/01`→`text/neutral/01`, t-shirt radii by resolved value, etc.)
- [x] Buttons in Figma ✅: sets renamed `button/56|32/*`, new `button/44/*` default+destructive (24 variants each, all token-bound, exact 44px). Width = instance auto-layout, not variants. `spacing/10` added for 44 padding
- [x] Tokens added: hero region (+on-hero text/icon), topbar text/icon, interactive hover/pressed/selected, surface/menu, bubble-max — DECISIONS #20–24
- [x] Message context-menu interaction spec (mobile long-press + desktop) → DESIGN_SYSTEM.md §5b; reply/edit = new §8 proposals (DECISIONS #25)
- [x] Button in CODE: `src/components/button.js` + `src/styles/components/button.css` + `src/styles/base.css` + no-build demo `src/demo/components.html` (open directly in a browser; theme toggle included). Syntax + token cross-refs verified
- [x] Button reviewed by Damir → conventions LOCKED (#16, #17); review findings implemented: state layers on outline/text (#28), success morph + width animation (#29), icon API leading/trailing/icon-only (#30). Demos self-contained (#27). All committed + pushed
- [x] App frame part 1: `icons.js` registry (Tabler, sprite source) + `c-topbar` (root/view variants, hero-aware) + `c-bottomnav` (tonal pill, badges, avatar slot) + `src/demo/app-frame.html` (phone frame, hero toggle wired to Wallet tab)
- [x] Damir design review round: fonts embedded + demo rebuilt against real Screens frames (#31); hero gradient tokenized (`--gradient-hero-overlay`); bottomnav equal-width items; filter chips + search field in demo are PLACEHOLDERS (proper c-chip/c-search-field components pending)
- [x] `docs/chat-list-spec.md` — token-exact chat-item anatomy, status-icon colors, timestamp rules, excerpt types, 4 flags for Damir (①–④)
- ⚠️ Icons: Figma icons are FILLED paths (#131415), not stroke Tabler as in icons.js — awaiting Damir bulk-export of icons frame → `src/assets/icons/` → icons.js regenerated from those (canonical pipeline)
- [x] Icons/logo pipeline live: 64 assets in `src/assets/icons/` (Damir export) → `scripts/generate-icons.mjs` → registry (ink→currentColor, brand→icon-accent, logo→currentColor). MISSING: `tabler-icon-search` (temp glyph in demo)
- [x] Chat-list flags resolved: unread = bold + indicator, NO tint (#33) · avatar/48 added · @ indicator unified · deterministic gradient avatars (#34)
- [x] List primitives BUILT: `timestamp.js` (format + single ticker), `avatar.js`, `chatlist-item.js` (indicator/status/excerpt/row) + CSS; demo bundle system (#35: `scripts/build-demo-bundle.mjs` → `src/demo/spixi.iife.js`); Chats demo shows 12 real rows incl. contact-request block, live timestamp buckets
- ⚠️ Sandbox mirror truncates Edit-modified files — generators were run inline / bundle written directly; re-run scripts locally when mirror behaves
- [x] List demo reviewed by Damir 2026-07-02: excerpt glyphs approved; committed. Session continues on his Mac (clone fork → open this file first)
- [x] Avatar gradients now THEME-AWARE (#37 🟡): JS sets hue custom props only, S/L themed in avatar.css per mode — fixes dark-on-dark initials in dark mode; dark pastel values await Damir's look
- [x] Avatar hue hash: avalanche finalizer added (#38) — old hash clustered similar names into an olive band; hues now span the wheel. Bundle rebuilt (19,222 B). If dark mode shows white initials/same avatar colors as light → stale cached avatar.css, hard-refresh
- [x] Mac session 2026-07-02 — review findings done: avatar gradients darkened (48%/34% lightness, was 62%/45%) · muted chat shows BOTH count-muted + bell-off via new `createIndicators()` (chatlist-item.js; single-indicator `createIndicator` unchanged) · Safari fix: `format('woff2')` in base.css (Safari rejects `'woff2-variations'`; demos now work in Safari) · bundle rebuilt via script (18,982 B, 14 exports), jsdom smoke test: 12 rows, QWERTZ = count-muted + bell-off ✓
- [x] Bottomnav selection ANIMATED (#39 🟡): filled icon twins crossfade+scale-pop over outline on select; tonal pill = `::before` layer, grows in (0.85→1)/shrinks out; ink/label transition both ways; `[data-dual]` guards items without a twin (account keeps outline). Generator fix #40: fill-less Tabler paths → explicit currentColor (apps/messages-filled were invisible); registry 67 icons
- [x] Scrollbars tamed (#41 🟡): `.u-scroll` utility in base.css — thin themed thumb, invisible until hover/focus-within, reserved gutter; mobile WebView native overlay indicators untouched. Demo `.content` regions use it
- [x] Bottomnav badge scope decided (#42 🟡): Chats only, numeric via existing `setUnreadIndicator`; no wallet/apps badge (tx/files/invites arrive as chat messages — would double-signal; no "unseen tx" in bridge). BE question open: muted chats excluded from total?
- [x] Chats badge wired in demo (=4, muted excluded per #42); BE muted question added to ARCHITECTURE §9.4; demo rows refactored to `CHAT_ROWS` data array
- [x] Hover coverage rule (#43 ✅): every interactive gets `:hover` from #23 tokens inside `@media (hover: hover)` — added to bottomnav (+ tonal-hover pill), button.css hovers now guarded too; demo placeholders (eye/quick-actions/chips) got interim hovers
- [x] **Code audit done** (2nd-AI pass) → `docs/audit/frontend-code-audit.md`: 40+ findings (drift/inconsistencies/JS/CSS/generators/perf)
- [x] **Audit findings ALL FIXED via agent loop** (3 fixer agents w/ disjoint scopes → reviewer agent → punch-list fixes → re-review = CLEAN). Highlights: selected-hover cascade, -webkit-user-select, .u-scroll fully hover-guarded, initials() Unicode-hardened (ИП/张 work, whitespace safe), timestamp ticker (visibilitychange + minute-aligned + true singleton), morph via transitionend + data-morphing (width transition scoped), free-function APIs `setNavActive/setNavBadge` (#44 🟡), formatCount shared, a11y labels on indicators/badges, strings threading for i18n, generators fail loudly (derived EXPOSE, collision detection, syntax smoke test, non-path fill normalization, stroke theming), font preloads, hover/active source-order fixed everywhere. Deferred logged: #45 ES2020 floor 🟡, #47 icon-registry split 🟡. Audit-loop rule = #46 + hard rule above
- [x] Bottomnav badge recolored (#48 🟡): error role + 2px bar-surface ring — action-blue badge was unreadable on the selected tonal pill (Damir screenshots, both themes); list indicators stay action-blue
- [x] Icon-button hover ink (#49 🟡): topbar actions + demo eye now change color on hover (action ink / on-hero tint), literal `color:` removed from topbar rule (was freezing button hover); hero pins ink + state backgrounds. Change reviewed by agent (cascade/tokens/both themes verified), 2 findings fixed
- [x] Figma file key stored: `cQ8yMZF5R0LGM9O1q9502F` (Components page node `9275:74`)
- [x] **c-chip + c-search-field BUILT** (#50/#51 🟡, spec `docs/chip-search-spec.md`): specs pulled via connector; UX review added selected/disabled chip states, opt-in icons, whole-chip dismiss, 44px targets, clear-on-filled search, layout-jump border fixes; Figma token ERRORS confirmed by Damir (text-field hover `outline-info`, focus `text-action-default` → action outline roles) — MIRROR TO FIGMA. #46 loop ran: reviewer caught `[hidden]`-vs-display:flex (global `[hidden]{display:none !important}` in base.css now), disabled-hover leak, null-safety, clear tap target. Demo: live search filter + exclusive chip group
- [x] Chat-list search UPGRADED (#52 🟡-BE): matches name + excerpt with match highlighting (`highlight.js`, TreeWalker text-node wrap, XSS-safe; `.c-highlight` warning wash in base.css). Full message-history search = new §8 proposal `ixian:search` (histories are C#-side; WebView caching would breach SECURITY.md)
- [x] Theme-switch flicker FIXED (#53 ✅): `.theme-switching` transition suppression during swap (base.css + both demo toggles, two-rAF removal)
- [x] Chip refinements per Damir: selected = TONAL fill (#50 amended); `tabler-icon-x` exported → registry 69, chip dismiss glyph = `x` (16/14)
- [x] **c-badge + c-txlist-item BUILT** (#54/#55 🟡, spec `docs/tx-row-spec.md`): badge = Figma-exact 5 types × tonal/solid, static; tx rows sent/received/pending/failed with `formatTxTimestamp` (absolute, +year if not current), direction labeled for SRs, amounts pre-formatted+u-tabular, failed = struck `text-neutral-disabled` (Figma had raw #6a717c — UNBOUND, fix there). #46 loop ran: badge demo matrix added to components.html, tx-scoped string keys, overflow guards, demo decoupled via data-direction. Wallet demo: 6 rows wired to filter chips
- [x] `scripts/smoke-test.mjs` COMMITTED (13 assertions, computed-style based; `node scripts/smoke-test.mjs [root]`, needs jsdom) — the #46 loop's verification step, no longer recreated ad hoc
- [x] Search clear glyph switched to plain `x` per Damir (was circle-x)
- [x] **Overlays batch COMPLETE** (#57 🟡): c-banner + c-toast + c-callbar built code-first (home session, PC) — spec in overlays-spec.md batch B/C; #46 reviewer ran CLEAN, 4 hardening MINORs landed (callbar pre-enter race + in-place bridge update, toast queue cap/dedupe, reduced-motion queue latency, banner label "Status"). Demo: Banner/Call toolbar toggles, toasts from sheet actions. Bundle appended MANUALLY (PC mirror truncates Edit-modified files — re-run `node scripts/build-demo-bundle.mjs` on the Mac to verify parity; build script FILES already includes the three)
- [x] Topbar view title verified `heading-sm` (Damir ask; root logotype stays heading-md)
- [x] Damir overlay/title review round: ALL titles unified to heading-sm incl. root logotype + hero (#58) · connectivity → topbar title-state decided, banner = actionable only (#59 🟡, §8 `showWarning(text, kind)` proposal added) · modal side-by-side confirmed for short labels (#60, spec flag ② resolved)
- [x] **Figma mirroring PART 1 done** (#61): wash tokens 3-tier + code adoption · #51 text-field rebinds · #54 failed-amount role fix · #48 nav badge (error+ring+ink) · #49 verified already-correct in Figma · #58 wordmark + Wallet hero title → heading/sm style
- [x] **Figma mirroring PART 2 done** (2026-07-03, #61 updated): chips → 10 variants/set (selected axis + disabled) · "Overlays" section with c-banner/c-toast/c-callbar/c-sheet/c-modal reference components (token-bound; modal uses live button/44 instances) · elevation/2+3 effect styles
- [x] **CHAT ASSEMBLY started** (#62 pipeline: build N ∥ audit N−1). Interview done: grouping #63 · composer mic-flagged #64 + voice §8 proposal · reactions overlap #65 · gaps flagged #66 (+ reaction excerpt type) · chats-list scroll-collapse search + filter chips (All/Unread/Favorites/Groups) #67 + favorites/pinned §8 proposal
- [x] **Batch 1a DONE + audited**: c-bubble (sent/received × single/first/middle/last, meta-in-bubble w/ <time>, labeled status glyphs, identity-hued sender labels via shared hashHue, logical-corner grouping, flow-root, RTL-safe) + c-datesep (shared dayBucketLabel) + `src/demo/chat.html` (group-chat conversation, role=log). Audit: 4 MAJORs fixed (failed/read on-bubble contrast → NEW tokens `--icon-bubble-read/-failed` in tokens.css both modes — **ADD TO FIGMA at next mirror**, clearfix, RTL, hue single-source) + DRY/a11y MINORs. ⚠️ REACTION PLACEMENT CONFLICT parked: design = pill inside bubble; Damir interview = overlapping corner — decide at reactions batch with both on screen
- [x] **Batch 1a review fixes + BATCH 1b BUILT** (#68): failed = outline+retry+caption · chat canvas pattern+gradient (`--chat-pattern-opacity`, `--gradient-chat`) · read = success-green checks · c-topbar chat variant (identity per Damir mock) + setTopbarSub · c-composer (⊕/auto-grow/Enter/mic-flag) · avatar-40. Demo chat.html is LIVE (type+send with on-the-fly grouping, retry toast, voice-flag toggle). Bundle: manual SUPERSEDE section appended — **Mac rebuild normalizes**. Tokens for next Figma mirror: --icon-bubble-read/-failed, chat gradient/pattern opacity, wash usage
- [x] **FULL audit round (#70)** — 3 MAJOR / 9 MINOR / NITs all fixed (IME guard, sender-label AA, composer RTL, canvas contrast, failed r2 clean-bubble + width rule, datesep hairline, bubble elevation, sent-meta AA, chat-topbar hairline). Unread divider = frontend-only (per-message `read` flags exist) — NO BE work
  - Figma mirror queue (next pass): --icon-bubble-read/-failed · white received bubble · --gradient-chat/--chat-pattern-opacity values · sender-label S/L · sent-meta primary-100 · datesep hairline · chat-topbar hairline
- [x] **BATCH 2 done + audited (#71)**: typed-bubbles.js/css — payment/app/call/file cards + unread divider, all states, bridge-mapped; demo shows the full conversation incl. live download simulation. 3 MAJOR audit finds fixed (received-payment side, dark track, progress a11y)
- [x] **FULL chat audit r2 (#72, Damir-ordered, 3 adversarial agents)** — report `docs/audit/chat-full-audit-r2.md`. 7 MAJORs FIXED: ts/locale crash guards (`docLocale()` now shared from timestamp.js) · loading=disabled (keyboard re-fired processing Pay) · oneShot/reentryGuard action guards (**shell contract: bridge re-render replaces latched cards**) · file-bubble state dispatcher + setFileProgress aria/glyph refresh · dark read-check → success-800 · sender-label light L→28%. +14 quick wins. Bundle: AUDIT r2 SUPERSEDE section appended (syntax-checked) — **Mac rebuild normalizes**. Bridge coverage gaps TABLED in the report (setChatMode/channels/contact-request pane/loadmore/status-updaters have NO code home) — sync to ARCHITECTURE §9 + decide updater-API vs full-re-render. Backlog MINORs in report, fold into related batches
- [x] **Session 2026-07-03 (round 2): C17 demo split + STATES MATRIX (#73)** — chat.html = 1:1 phone + group phone + matrix (every payment/app/file/call/reaction/reply state on the real canvas)
- [x] **Pattern premium treatment DONE + LOCKED (#76)**: `scripts/generate-chat-pattern.mjs` → generated `src/styles/chat-pattern.css` (data-URI mask, CORS-clean on file://; paint in generated file, layer in message-bubble.css, fail-soft) · ink = "Primary soft" primary-200/-800 @ 0.5 both modes (Damir via demo switcher) · light `--gradient-chat` v2 sky-blue diagonal (Damir rgba values over surface-screen)
- [x] **BATCH 3 BUILT (#74)**: c-reactions (#65 LOCKED overlap + pop animation) · c-typing · c-scroll-latest (+unread badge) · c-msgmenu (sheet-based §5b 🟡 #75, long-press+right-click, capability-gated) · r2 backlog C8/C15/A17/B4/B6 folded in · #77 amount rule (`formatIxiAmount`, ≤2 dp truncated, round=bare — C# must mirror) · #78 processing Pay = "Processing"+spinner only
- [x] **BATCH 3b BUILT (#79, §8-gated #25)**: bubble reply quote + edited marker · composer context strip (`setComposerContext`/`getComposerContext`) · menu Reply/Edit behind capability getters · demo "Reply/Edit (§8)" toggle simulates the handshake
- [x] **Damir round 3 (2026-07-03)**: pattern ink LOCKED Primary soft @0.5 (#76) · light gradient v2 sky-blue diagonal (#76) · processing Pay label fix (#78) · #65 reactions LOCKED overlap + pop animation · #77 amount rule (`formatIxiAmount`) · **c-mbubble GIF/image tiles, P2P tap-to-load + sender-embedded preview (#81, BlurHash/ThumbHash eval = BE)** · **linkify as button-links + confirm modal, link preview §8 sender-composed (#82)** · **reactions cap 3 types + "+N" → inspect sheet (#83)** · typing pill hugs composer @ spacing-4 (#84)
- [x] **#46 audit loop r3+r4 RUN + CLEAN (#85)** — 7 MAJORs + 11 MINORs fixed (money path, media tile, contrast on the v2 canvas, a11y); backlog items in row #85
- [x] **Damir round 4**: composer ⊕ alignment · file-transfer "keep open" hint · emoji-only big bubbles · C9 accepted (#80 ✅) · declined-call decision + icon-gap list (#87)
- [ ] ⚠️ **FIRST ACTION next session (parked 2026-07-03 — flag immediately):** run `node scripts/build-demo-bundle.mjs` + `node scripts/smoke-test.mjs` — normalizes the manual BATCH 3/3b bundle sections (expected diff: comment/order cleanup + `docLocale` joins the export map). Commit separately as "normalize generated bundle". NOTE: does NOT require the Mac — any terminal with Node on the REAL files works (Damir's PC terminal included); only Claude's sandboxed mount serves stale copies of session-edited files. Damir committed 2026-07-03 (32 files) without this step — bundle works, is hand-maintained until then
- [ ] **Next — CHAT V1 FINALIZATION (scope locked in #86, build in this order):**
  1. ~~In-place updaters~~ DONE (#88): `setMessageStatus` / `setPaymentStatus` (WeakMap re-render, returns new row) / `removeMessage` (grouping repair) — live in chat.html (Pay loop, read ticks, menu Delete)
  1b. **Desktop split-view demo DONE (#89)**: `src/demo/desktop.html` — vertical-bottomnav rail, draggable divider, empty state, 2 wired conversations; #19 pitch evidence, pending Damir look
  2. ~~Secure-chat notice~~ DONE (#91): c-sysnotice, appears when history exhausts (true chat start)
  3. ~~Lazy load-more~~ DONE (#90): attachLazyHistory — auto-fire, spinner, anchor-preserving; live in chat.html (2 pages) + desktop Han (1 page)
  3b. Round-5 adds: reply-quote thumbs/kind glyphs (#92) · cancel/decline working-state loading (#93) · desktop demo FIXED (SpixiIcons bug) — desktop polish pass queued AFTER chat v1
  4. ~~Bot chat + channels~~ DONE (#97): topbar-tap → channel sheet, composer cost line, group-consistent posts — desktop "Ixian News" demo. ~~Attach sheet~~ DONE (#96): tile grid, media tiles flagged
  5. ~~LAST v1 GAPS~~ ALL BUILT (#101) + rounds 8–11 (#99/#102–#105) + **FREEZE AUDIT RUN + CLEAN (#106)**. **CHAT SURFACE V1 = FROZEN pending Damir's commit.** Remaining before shells: bundle normalization run (any Node terminal) · Figma mirror batch (queue in item 9 + #106 backlog) · #105 QR placement pick · #108 mention-@ at chats shell
  5b. Icon exports for the freeze: `shield-lock` (secure-notice medallion — square-asterisk stands in) · illustration language = post-v1 DS decision (#95 notes)
  5c. Wallet-polish queue grew: "Missing a transaction?" chip-trigger + explainer sheet (#98, Damir design analyzed)
  6. Contact-request pane — 🟡 Damir decides minimal-pane vs list-only (#86)
  7. Voice-note lifecycle design (#87④, with the voice §8 batch) · self-destructing messages (BE eval #87③)
  8. ~~Icon exports~~ DONE 2026-07-03 (registry 75): arrow-back-up (menu Reply wired) · trash (menu Delete wired) · player-pause · phone-x · arrows-maximize · hourglass-empty (self-destruct) — voice = existing `microphone` (Damir; no suitable waveform in Tabler). STILL PENDING: `user-circle-filled` (Damir preps later; avatars are user-generated so default-state only)
  9. Figma mirror queue: batch-2 cards · #70 list · r2 deltas · reactions OVERLAP redesign (#65) · --chat-pattern-ink + gradient-v2 candidates (#76) · --text-on-scrim/--icon-on-scrim (#85) · dark error-badge recipe fix (#85 backlog, w/ bottomnav #48) · reply/edited/typing/scroll-latest/msgmenu/media reference components
  10. Then: desktop split-view demo (#19 pitch) · chats-list upgrades at home shell (#67)
  11. **On Mac: `node scripts/build-demo-bundle.mjs` + `node scripts/generate-chat-pattern.mjs` + smoke test** (PC mirror stale for Edit-modified files; bundle carries manual BATCH 3/3b sections)
  12. UX review checklist (Damir eyeball): pattern ink visibility on v2 gradient bottom (#85 backlog) · datesep/divider at v2 top · dark-green read checks · sheet-vs-anchored menu (#75) · typing hug spacing-4 (#84) · composer ⊕ after the 2px fix
- [x] `tabler-icon-search` exported by Damir → registry regenerated (68 icons), temp glyph removed from demo
- [x] Stale `.git/index.lock` (0 B) removed — was blocking GitHub Desktop commits
- ⚠️ Sandbox note (Windows session): mounted-folder cache served stale copies of freshly edited files. Mac mirror verified OK 2026-07-02 (bash sees fresh edits; scripts run normally)
- [ ] Then: component inventory (`DESIGN_SYSTEM.md`) → build components in code + Figma
- [ ] Then: build shells one at a time (start with app shell + navigation)

## Conventions (to firm up as we build)

- Source in `src/` at repo root; built output committed to `Spixi/Resources/Raw/html`.
- Bridge access only via `src/bridge/` (`mock.js` for browser, `native.js` for MAUI) — shells never touch `ixian:`/`executeUiCommand` directly.
- Strings via a per-shell `window.SL` dictionary; config via `window.SPIXI_ENV` (ARCHITECTURE.md §7).
