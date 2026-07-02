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
- [ ] **Next:**
  1. c-chip + c-search-field components (replace demo placeholders); transaction rows (wallet list); overlays batch (sheet/modal/toast/banner/callbar)
  2. `user-circle-filled` icon: Damir makes it manually (ETA next session) → account nav gets its selected-state twin automatically (dual-icon detection)
  3. Mirror #48 (error badge + ring) + #49 (icon hover inks) to Figma — connector re-authorized 2026-07-02
- [x] `tabler-icon-search` exported by Damir → registry regenerated (68 icons), temp glyph removed from demo
- [x] Stale `.git/index.lock` (0 B) removed — was blocking GitHub Desktop commits
- ⚠️ Sandbox note (Windows session): mounted-folder cache served stale copies of freshly edited files. Mac mirror verified OK 2026-07-02 (bash sees fresh edits; scripts run normally)
- [ ] Then: component inventory (`DESIGN_SYSTEM.md`) → build components in code + Figma
- [ ] Then: build shells one at a time (start with app shell + navigation)

## Conventions (to firm up as we build)

- Source in `src/` at repo root; built output committed to `Spixi/Resources/Raw/html`.
- Bridge access only via `src/bridge/` (`mock.js` for browser, `native.js` for MAUI) — shells never touch `ixian:`/`executeUiCommand` directly.
- Strings via a per-shell `window.SL` dictionary; config via `window.SPIXI_ENV` (ARCHITECTURE.md §7).
