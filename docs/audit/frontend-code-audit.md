# Frontend code audit — components, CSS, JS, generators

*2026-07-02, second-AI review pass (read-only) over `src/components`, `src/styles`, `scripts/`, demos. Findings verified against DECISIONS.md; sanctioned patterns excluded. file:line refs are as of audit time.*

**RESOLUTION (same day):** all findings fixed via the agent fix→review loop (DECISIONS #46), final reviewer verdict CLEAN. Explicitly deferred with rationale: icon registry split (#47), i18n full SL integration (threading landed, `strings` params throughout), `--spacing-10`/size-token gaps (next Figma sync), row click delegation (shell concern), font-weight animation cost + avatar dot ring (commented as accepted). New conventions from the loop: free-function update APIs (#44), ES2020 JS floor (#45).

## Drift

- MED — `src/components/avatar.js:31-32,52` — inline `width`/`height`/`fontSize` styles violate DECISIONS #16 ("no inline styles"; only #29's morph width and #37's hue custom props are sanctioned exceptions). Tokens exist (`--size-avatar-48`, tokens.css:275). Fix: `data-size` attr + CSS, like button does.
- MED — `src/components/topbar.js:24`, `bottomnav.js:16`, `chatlist-item.js:74` — hardcoded English UI strings (`'Back'`, `'Main'`, `'Draft: '`) baked into components; convention is per-shell `window.SL` (CLAUDE.md conventions, DECISIONS #6). `'Draft: '` has a "SL key in shells" comment but no injection point in the API.
- MED — `src/components/chatlist-item.js:128,149` — `formatChatTimestamp` accepts a `strings` dict (timestamp.js:7) but neither `createChatItem` nor `refreshTimestamps` ever passes it → "Yesterday" is permanently English even once SL exists. Add a strings option or module-level locale setter.
- MED — `src/components/timestamp.js:16` — `hour12: false` hardcoded; chat-list-spec.md §3 says "HH:mm (locale, **24h follows device**)". Drop `hour12` and let the locale decide.
- MED — `src/styles/tokens.css` — `--spacing-10` missing while CLAUDE.md status says "`spacing/10` added for 44 padding" in Figma; tokens.css is stale vs the source-of-truth (DECISIONS #11) and button 44 uses `--spacing-20` (button.css:52) — verify which is right at re-sync.
- LOW — `src/styles/components/chatlist-item.css:75-76`, `bottomnav.css:115-119`, `avatar.css:51-52` — magic sizes (18px indicator/badge, 12px dot, `-6px/-10px` badge offsets, `max-width: 96px` bottomnav.css:24) with no tokens; spec says 18px so values are right, but they're repeated across two files — candidates for `size/*` tokens.
- LOW — `src/components/topbar.js:7,31` — JSDoc says `logo: url` but implementation treats it as a boolean and pulls the registry icon (demo passes `logo: true`). Fix the doc.
- LOW — `src/demo/app-frame.html` — demo `:hover` rules (`.fab`, `.hero__eye`, `.quick-action`, `.chip`) not wrapped in `@media (hover: hover)`; #43 sanctions them as interim, but the guard rule is unconditional — cheap to comply now. Also raw `rgb(255 255 255 / 0.12)`, no token.
- Bridge isolation: clean — no `ixian:`/`executeUiCommand` anywhere in src/components|styles|demo.

## Inconsistencies

- MED — `src/styles/components/chatlist-item.css:19-21` — `:hover` (same specificity, later in source) overrides `[aria-current]` selected background: hovering a selected row repaints it neutral, losing selection. Bottomnav handles exactly this case explicitly (bottomnav.css:64-65); chatlist needs `[aria-current]:hover` too.
- MED — API shape drift across factories: `createBottomNav` augments the element (`el.setActive/setBadge`); button uses free exported functions (`setLoading(el)`); chat item has no update API at all (rebuild-only) plus module-level `refreshTimestamps(rootEl)`. Pick one pattern before more components land.
- LOW — `aria-current` values differ: `'page'` in bottomnav.js:69 vs `'true'` in chatlist-item.js:106; both CSS files select bare `[aria-current]`.
- LOW — hover transition durations differ: chatlist uses `--duration-100` matching the token comment "100ms micro: hover"; button/topbar/bottomnav use `--duration-200` for the same feedback.
- LOW — `99+` capping duplicated in chatlist-item.js:35 and bottomnav.js:79; extract a `formatCount()`.
- LOW — a11y text alternatives uneven: status icons and indicators are `aria-hidden`/bare digits — a row announces "Han Solo … 3" with no "unread" context; bottomnav badge likewise unlabeled while icon-only buttons correctly require `ariaLabel`.
- LOW — `bottomnav.js:58-61` — clicking the already-active item re-fires `onChange`; guard `if (item.id === current) return`.
- LOW — both demos initialize theme toggle label as "Toggle dark" even when OS-dark already applied.

## JS

- MED — `src/components/avatar.js:21-25` — `initials()` throws on whitespace-only names (TypeError via `parts.map`); and `/^[A-Za-z]/` means non-Latin-named contacts (Cyrillic, CJK, Arabic…) get the generic glyph instead of initials — contradicts #34 "initials (named contacts)". Use a Unicode letter check (`/\p{L}/u`) and guard empty parts.
- MED — `src/components/timestamp.js:31-39` — ticker skips `cb` while hidden but never fires on `visibilitychange` → timestamps stale on resume (up to a day if timers suspended past midnight). Add a visibilitychange refresh. Minor: interval not minute-aligned (today-times lag up to 59s); "single ticker" not enforced — double-invocation double-ticks.
- MED — `src/components/button.js:82` — morph release timer hardcoded `250` while CSS width transition is `var(--duration-200)`; token change or reduced-motion (0ms) desyncs them. Use `transitionend` with timeout fallback; `el._morphTimer` expando pollutes the element.
- LOW — `chatlist-item.js:62,124` — `Object.assign(icon(...), { })` dead leftover.
- LOW — `icons.js` — `ICON_NAMES` exported but unused anywhere; dead export.
- LOW — one click listener per chat row; fine at 12, unbounded list needs delegation in the shell.
- LOW — optional chaining (ES2020) in button.js shipped un-transpiled; project has conservative CSS baseline but no documented JS baseline — document a JS floor or let Vite target it.
- LOW — `app-frame.html` `reqBody.innerHTML` templates a contact name/address slot — the exact field that will be user data in the real shell. (Registry innerHTML is sanctioned, static-only.)

## CSS

- MED — `button.css:27`, `avatar.css:44` — `user-select: none` without `-webkit-user-select`; WebKit (iOS WKWebView, Safari) only honors the prefixed form — long-press selection still triggers on a primary target platform.
- MED — `base.css` `.u-scroll` — `scrollbar-color: transparent transparent` revealed only on `:hover/:focus-within`; on Android WebView ≥ Chromium 121 (honors `scrollbar-width/color`) touch users never hover → native scroll indicator hidden entirely, contradicting #41's "mobile native indicators untouched". Guard the whole block behind `@media (hover: hover)`.
- MED — `button.css:31-34` — `transition: … width …` on every button permanently; full-width buttons animate width on container/viewport resize (layout animation, jank). Scope width transition to the morph only.
- MED — `bottomnav.css` — animating `font-weight` re-runs layout every frame of every selection change. Comment covers the older-WebView snap but not layout cost; consider pre-bolded overlay crossfade like the icon twin, or accept and document.
- LOW — tokens.css: scrim deliberately uses `rgba()` for conservative baseline while elevation uses modern `rgb(… / …)` slash syntax two rules later; unify (rgba).
- LOW — `padding-inline` used throughout — needs Safari 14.1+/Chromium 87+; newest CSS in the components — flag once at demo per ground rule.
- LOW — avatar dot ring is `--surface-screen`; on hover/selected/pressed row surfaces the ring shows a mismatched halo.
- LOW — `topbar.css:51` — equal specificity + later load order: topbar action buttons lose button `:hover`/`:active` ink changes. If intended (hero ink stability), comment it; otherwise override `--_ink` instead of `color`.
- Sanctioned, not findings: scrollbar styling (#41), avatar `:root` S/L vars in component CSS (#37), raw 32/44/56 heights (#12), `font-weight` snap note (#39), inline morph width (#29).

## Generators

- MED — `build-demo-bundle.mjs:30-32` — regexes only match column-0 single-line forms. Silent breakage: (1) importing anything from icons.js beyond `icon`/`ICONS` → `undefined` at runtime; (2) same-named `function` helpers across modules — last silently wins; (3) new component file forgotten in `FILES`/`EXPOSE` → fails only when called. Multi-line/indented/`export default` forms syntax-error the bundle. Fix: fail build on residual `import`/`export` tokens; derive EXPOSE from parsed export names.
- MED — `generate-icons.mjs:42` — fill-less normalization covers `<path>` only; `<circle>`/`<rect>`/`<ellipse>`/`<g>`-hoisted fills render invisible (same class as #40). Also only exact `fill="#131415|#3050BD"` themed — `stroke="#131415"`, `style="fill:…"`, other ink hexes ship hardcoded (wrong in dark mode).
- LOW — `generate-icons.mjs:31` — `\s*\n\s*` → `''` glues attribute-per-line SVG into malformed `<pathd="…"`; join with a space.
- LOW — missing `viewBox` silently defaults to `0 0 24 24` — 32px-grid export would clip with no warning.
- LOW — header comment says "logo.svg is NOT processed" but it is (per #32/#36); stale comment invites wrong edits.
- LOW — raw Tabler background stubs (`M0 0h24v24H0z` fill=none) kept in registry — dead bytes per icon.

## Perf

- MED — `icons.js` (90 KB) dominates bundle: monolithic `ICONS` object = zero tree-shaking — every shell ships all 67 icons. Consider per-icon exports (Vite-shakeable) or per-shell subsets; logo path (~3.6 KB) belongs only in the root topbar shell.
- MED — layout-forcing animations: bottomnav `font-weight` transition + always-on button `width` transition (both flagged above); pill/icon crossfades correctly use opacity/transform only.
- LOW — fonts (62 KB) load with `swap`, no preload in demo heads → FOUT on first paint; preload both WOFF2s.
- LOW — `spixi.iife.js` 19.8 KB unminified — fine for demos; production path is the Vite build (#3), keep it that way.

## Top 5 actions

1. Fix chatlist selected-row hover cascade + add `-webkit-user-select` — two one-line CSS bugs shipping broken behavior on primary targets.
2. Guard `.u-scroll` theming behind `@media (hover: hover)` — protects #41's intent on modern Android WebViews.
3. Harden avatar `initials()` (whitespace crash + non-Latin names) — user-data-driven crash path.
4. Make build-demo-bundle fail loudly on residual `import`/`export` + derive EXPOSE automatically; extend icon normalization to non-path elements and stroke inks — both scripts are silent-drift factories as components multiply.
5. Split/subset the icon registry before shells are built — decide the pattern now, not after 9 shells import it.
