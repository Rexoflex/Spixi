# Decision Log

Every significant decision gets a row when it's made — this is the feedback loop that prevents drift.
Status: ✅ locked · 🟡 provisional (locks after named review) · ❌ superseded (keep row, link replacement).

| # | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| 1 | 2026-07-02 | Bridge protocol frozen; new commands spec-only (ARCHITECTURE.md §8), mocked in JS until BE implements | Zero C# changes to ship frontend; BE stays in control | ✅ |
| 2 | 2026-07-02 | 29 pages → 9 flow shells; MAUI page classes and navigation untouched (shells + route param) | Kills duplication without touching BE surface (ARCHITECTURE.md §5) | ✅ approved by Damir (BE assumed) |
| 3 | 2026-07-02 | Vite + vanilla JS; built output committed to `Resources/Raw/html` | No Node on MAUI dev machines/CI | ✅ |
| 4 | 2026-07-02 | Conservative WebView CSS baseline; modern features flagged per-case at demo | 4 platforms, unknown minimum WebViews | ✅ |
| 5 | 2026-07-02 | Theme follows OS + manual override; dark = token swap via `data-theme`, set by JS | Replaces 2×115KB parallel stylesheets | ✅ |
| 6 | 2026-07-02 | i18n: keep `*SL{}` channel; per-shell `window.SL` dict + `window.SPIXI_ENV` for config | No C# changes; XSS-safe textContent rendering (ARCHITECTURE.md §7) | ✅ |
| 7 | 2026-07-02 | Token architecture: primitives (mode-less) → keys (mode-less vocabulary) → tokens (LIGHT/DARK live here, per token) | Damir's structure; per-token dark control (DESIGN_SYSTEM.md §1) | ✅ |
| 8 | 2026-07-02 | Naming: numeric = scales (`spacing/16`); role names = semantic tokens (`layout/bar-top`) | Value-truth for scales; roles outlive values | ✅ |
| 9 | 2026-07-02 | Single `action` role for interactive color; no separate accent role at component level | Wallet needs one unambiguous interactive color; old file proved accent drift | ✅ |
| 10 | 2026-07-02 | z-index, motion, elevation, opacity = code-only tokens (not Figma variables); elevation in Figma = effect styles when needed | Figma can't use them; dead variables pollute pickers | ✅ |
| 11 | 2026-07-02 | Figma is source of truth for tokens; cleanup happens in Figma, code regenerates (`tokens.css` header documents re-sync) | One-way sync, diffable updates | ✅ |
| 12 | 2026-07-02 | Buttons: 3 heights named by value (32/44/56); width = instance-level auto-layout (hug/full), NOT a variant axis | Avoids 432-variant explosion; height is the real design axis | ✅ |
| 13 | 2026-07-02 | Build split: Claude = component structure/bindings + composed-screen drafts + code-first utility screens; Damir = polish + brand-heavy screens; Figma native AI = throwaway exploration only; dark mode = verification only | figma-sweep.md §3 | ✅ |
| 14 | 2026-07-02 | Chat bubble width: `max-width: min(var(--bubble-max-pct, 75%), var(--layout-bubble-max))` — % of message-list container, absolute cap 320 (responsive-ready) | Messenger best practice (75–80%); % is code-only, cap is a Figma variable | ✅ |
| 15 | 2026-07-02 | Per-component process: code always; Figma when design-valued; screens = compositions (Figma drafts for design-heavy, code-first for utility); every component demoable via mock bridge | Q3 agreement | ✅ |
| 16 | 2026-07-02 | Component code conventions: one `.js` + one `.css` per component · plain functions returning DOM · CSS consumes semantic tokens ONLY (no primitives/keys) · modifiers = data-attributes mirroring Figma names (`button/44` ↔ `data-size="44"` ↔ `createButton({size:44})`) · states = native pseudo-classes (`:hover`, `:focus-visible`, `:disabled`) + `data-loading` · no inline styles · demo case per component | Anti-drift; taxonomy identical across Figma/CSS/JS | 🟡 locks after button code review |
| 17 | 2026-07-02 | 44-height buttons use `label/sm` (14px) text | Fell out of exact-44 math; Damir may prefer 16px — one rebind if so | 🟡 pending Damir |
| 18 | 2026-07-02 | JS: per-component source files bundled by Vite into one file per shell; shared utils = explicit imports; no global JS | Zero runtime cost for many source files; kills the chat.js-monolith pattern; imports make dependencies visible | ✅ |
| 19 | 2026-07-02 | Desktop: target single-WebView layout (all panels as DOM) enabling resizable dividers + third details panel in pure frontend; requires "hosted panes" bridge proposal (ARCHITECTURE.md §8) — BE approval pending. Fallback: two-WebView with fixed proportions, polish only | One contained C# change vs MAUI work on every future layout tweak | 🟡 pending BE |

## How to use this file

- Adding a decision: append a row, keep rationale to one line, link the doc with details.
- Changing a decision: mark old row ❌ with "superseded by #N", add the new row. Never delete.
- Reviews (Damir, BE, second AI) check 🟡 rows first.
