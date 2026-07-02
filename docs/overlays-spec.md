# Overlays — spec (batch A: scrim · c-sheet · c-modal)

*Code-first (no Figma components exist — DESIGN_SYSTEM §3 gap list; mirror to Figma after Damir polish). Replaces bridge-era `toggleAnimatedSlider` menus (sheet) and `showModalDialog` (modal). DECISIONS #56.*

## Shared overlay layer (`overlay.js`)

- Overlays mount into a **host** element (option, default `document.body`; demo passes the phone frame) — positioned `absolute inset-0` within it, so demos and the real shell behave identically.
- One **stack**: opening pushes, dismissing pops. Same element already in the stack → open is a no-op. `dismissTopOverlay()` free fn → shell's `onBack` hook (bridge bounces hardware back through JS, bridge-audit-B:87): returns true if an overlay consumed the back press, else shell emits `ixian:back`.
- **Dismissal policy (two separate opts):** `escDismiss` — Esc closes the top-most overlay; default TRUE for sheet AND modal (Esc is the safe dismiss path per ARIA APG). `lightDismiss` — scrim tap closes; governs ONLY the scrim (sheet default true, modal default false).
- Scrim: `div.c-scrim[aria-hidden=true]`, `--surface-scrim` fill, `--z-40`, fade `--duration-200`.
- Focus: **document-level containment while the stack is non-empty** — `keydown` traps Tab within the top entry (cycles first↔last; focus outside the trap is pulled back in), `focusin` anywhere outside the top entry refocuses its first focusable. Initial focus = first `[data-autofocus]` or first focusable. All programmatic focus uses `{ preventScroll: true }`.
- Focus restore: at dismiss time, only if focus is inside the closing overlay (or on `body`) → back to the opener; opener gone from DOM / unfocusable → the new top overlay's first focusable, if any.
- Removal: after the exit transition (`transitionend` + 400ms fallback, #29 pattern; listener detached on removal). **Element reuse:** re-opening an element whose exit is still running finishes the pending removal first (module WeakMap) — old scrim/listeners cleaned, then a fresh open proceeds.
- Scroll lock: host gets `data-overlay-open` (`overflow: hidden`); released when the LAST overlay on that host finishes its exit (checked at removal time, not at dismiss).
- `strings` keys (i18n threading): `strings.sheet` → sheet aria-label fallback ('Menu'), `strings.modal` → modal aria-label fallback ('Dialog') — used only when no title is given.

## c-sheet (bottom sheet, z-40)

`section.c-sheet[role=dialog][aria-modal=true]` → grab handle (32×4 pill, decorative) · optional title (heading-xs) · content slot.
Surface `--surface-menu` + `--elevation-3`, top radius `--radius-24`, padding `--spacing-16` + safe-area bottom. Max-width `--layout-content-max` centered on desktop.
Motion: translateY(100%)→0 `--duration-200 --easing-decelerate` in; accelerate out; scrim fades in parallel (reduced-motion → 0 via tokens).
Dismiss: scrim tap ✓ (`lightDismiss` default true) · Esc ✓ (`escDismiss` default true) · back ✓ · swipe-down = FUTURE (gesture util, logged).
API: `createSheet({ title, content, host, lightDismiss = true, escDismiss = true, onDismiss, strings })` → `openSheet(el)` / `closeSheet(el)` free fns (#44).

## c-modal (dialog, z-50)

`section.c-modal[role=dialog|alertdialog][aria-modal=true]` → title (heading-xs) · body (body-md, `text-neutral-02`, id + `aria-describedby` on the section) · actions row (1–2 c-buttons, 44).
Surface `--surface-menu` + `--elevation-3`, radius `--radius-24`, padding `--spacing-24`, width `min(100% − 48px, 360px)`, centered.
Motion: scale(0.95)+fade → 1, `--duration-200 --easing-standard`.
Dismiss: **`lightDismiss` default FALSE** (scrim tap disabled — confirmations must be explicit) but **Esc default TRUE** (`escDismiss`, safe cancel path); destructive confirm = `role=alertdialog`, initial focus on the SAFE action. No title → `aria-label` from `strings.modal`; `alertdialog` without a title logs a console warning (SRs announce alert dialogs by their label).
API: `createModal({ title, body, actions: [{label, type, intent, onClick, autofocus}], role, host, lightDismiss = false, escDismiss = true, onDismiss, strings })` → `openModal(el)` / `closeModal(el)`.

## Constraints

- **Never open a sheet above a modal** — sheet (z-40) would render UNDER the modal (z-50); modal-above-sheet is the only supported nesting order.
- `overlay.css` must load AFTER `base.css` (relies on base resets/`[hidden]` rules). Inner `.u-scroll` children of an open overlay stay scrollable behind the scrim by design — only the HOST is scroll-locked.

## Security note

Payment-confirm modals display intent only — confirm emits the existing `ixian:` command; no signing/keys in the WebView (SECURITY.md). The modal component is generic; payment flows add their own review content.

## Batch B/C: banner · toast · call bar (built 2026-07-02, code-first per figma-sweep §3 — no Figma designs existed; mirror after Damir approval)

These three are NOT modal overlays: no scrim, no focus trap, never steal focus. They bypass `overlay.js` deliberately.

| | c-banner | c-toast | c-callbar |
|---|---|---|---|
| Bridge | `showWarning(text)`, empty clears | (UI-initiated feedback) | `displayCallBar(sid, text, started)` / `hideCallBar` |
| Position | under top bar, in flow (max-height collapse) | bottom, above bar/composer | pinned top of host, over statusbar area (iOS convention) |
| z | in flow (none) | `--z-70` (above modals — feedback about the just-taken action) | `--z-60` (above modals — active call never hides) |
| Surface | `warning-inverse` + warning ink | `surface-menu` card, `elevation-3`, tone glyph (info/success/error) | `surface-success`, `on-action` ink (inverts correctly in dark) |
| Behavior | persistent while condition lasts; `setWarning(el, text)` | auto-dismiss 3.5s, tap dismiss, one per host + queue | live tabular timer (m:ss / h:mm:ss), whole bar = return-to-call, trailing hang-up; singleton per host |
| A11y | `role=status` | `role=status`, never focused | labeled buttons; timer text updates silently |

Toast discipline = #29: one confirmation per action — never toast what a button morph, navigation, or alert already confirms.
State washes on success/hero surfaces are interim rgba values — token candidates at next Figma sync (with the #48/#49 batch).

## Flags for Damir

① sheet grab handle: keep (drag affordance without drag yet) or drop until swipe lands? ② ~~modal action layout~~ RESOLVED (#60): side-by-side for two short labels; stack when labels wrap / 3+ actions. ③ ~~toast/banner/callbar = batches B/C~~ BUILT, see above — review in demo (Banner/Call toolbar toggles; toasts fire from sheet actions and hang-up). ④ call bar covers the (simulated) status-bar area — verify acceptable on device; else offset below safe-area. ⑤ NOTE (#59): connectivity messages will move from banner → topbar title-state once the §8 `showWarning(text, kind)` arg is approved; banner remains for actionable/critical notices.
