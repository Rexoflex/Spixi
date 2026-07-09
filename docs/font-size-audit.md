# Font-size / density audit — Windows premium-feel pass

> **Purpose:** Damir's ask (2026-07-09, flicker session): "analyse the font size and potentially reduce the
> token font for specific texts" + the Spixi-vs-Telegram-vs-Discord screenshot (all dark, Windows) + the
> min-window-size concern. ANALYSIS ONLY — no code changed; every change below is a proposal for Damir.
> Pairs with `docs/native-feel-punch-list.md` §B (B1 system-ui, B3 density) and DECISIONS #222 (flicker).

## 1. Where the "too big" feel comes from (measured, file:line)

| Element | Token | Size | Reference (Telegram desktop dark) |
|---|---|---|---|
| Chat-row NAME | `--font-size-body-lg` (`chatlist-item.css:39`) | **18px/28** | ~14px semibold |
| Chat-row excerpt | `--font-size-body-sm` (`chatlist-item.css:64`) | 14px/20 | ~13px |
| Timestamp / count | `--font-size-body-xs` (`chatlist-item.css:87`) | 12px/16 | ~12px |
| Row avatar | `--size-avatar-48` (`avatar.css:33`) | 48px | ~54px BUT tighter text next to it |
| Row padding | `--spacing-12` all around (`chatlist-item.css:9`) | 12px | — |
| Resulting row | 48 avatar + 2×12 pad | **~72px** | ~64px, Discord DM rows ~44px |

Key fact: the desktop breakpoint (`tokens.css:310`, `@media (min-width:700px)`) bumps only **display/heading**
sizes — `body-*`/`label-*` are IDENTICAL on desktop. So the list renders phone-scale 18px names on a desktop
monitor sitting next to Telegram's ~14px — that, more than any single wrong value, is the "off" feel.
Second factor: Sora + Source Sans 3 have large x-heights and render soft as web fonts, so the same px reads
bigger and blurrier than native-rendered SF/Segoe (punch-list B1/B2).

## 2. Proposals (pick/adjust at review — token-level, both themes by construction)

- **R1 — do B1 (`system-ui`) FIRST, then re-judge.** The font swap alone tightens apparent size and crispness;
  don't tune px against Sora and then swap the face. (Already decided 2026-07-09; this is sequencing.)
- **R2 — desktop type step for LIST/UI roles.** In the `@media (min-width:700px)` block, add desktop values for
  the list roles instead of leaving them phone-scale, e.g. `body-lg 18→15px/22` (row names), `body-sm 14→13px/18`
  (excerpts), `label-md 16→14px/20` (buttons/inputs). Mobile untouched. One token block; every consumer follows.
- **R3 — row geometry to ~60–64px:** desktop row padding `12→8px` vertical + avatar `48→40` (`--size-avatar-40`
  already exists, `avatar.css:31`) on desktop only. Combined with R2 the list lands at Telegram density
  (punch-list B3's ~64px target) without touching mobile.
- **R4 — conversation text:** keep bubbles at `body-md` 16px on mobile; on desktop consider 15px. The dial
  already exists: `--chat-text-scale` (`tokens.css:761`, #147 Chat-appearance setting) — a desktop default of
  `0.9375` gets 15px with zero new mechanics once bubble adoption lands.
- **R5 — don't shrink**: timestamps/badges (12px is already the floor for legibility), a11y — keep ≥44px touch
  targets on mobile; desktop pointer targets may go denser (chips/search per B3).

## 3. Windows window sizing (the min-size concern)

Current (`Platforms/Windows/App.xaml.cs:26–29, 60–72`): default window **1600×1200 physical px**, minimum
**600×840 physical px**, enforced by listening to `AppWindow.Changed` and calling `Resize()` back when the user
drags below it.

Problems, in order of user-visible damage:

1. **Resize-fighting is not a real minimum.** The window first resizes below the floor, THEN snaps back —
   visible jitter while dragging (the "quite off" feel). Best practice on WinAppSDK: set
   `OverlappedPresenter.PreferredMinimumWidth/Height` (available since WinAppSDK 1.6) — the OS enforces the
   floor during the drag, no snap-back — or handle `WM_GETMINMAXINFO`. One-liner swap if the SDK version allows.
2. **Physical px ignore DPI.** At 100% scale the app opens 1600×1200 (bigger than a 1366×768 laptop screen) with
   a 600×840 floor; at 200% it opens 800×600 logical. Scale by the window's rasterization scale (or use logical
   units via the MAUI window APIs) so the experience is consistent.
3. **The 840px min height is unusually tall** (Telegram allows ~430px height; Discord's floor is 940×500).
   A short-wide window is a legitimate desktop shape. Suggest floor ≈ **480×360 logical** — enough for the
   single-pane layout — once the pane layout tolerates it.
4. **No size persistence.** Premium desktop apps restore the last window size/position; currently every launch
   resets to 1600×1200. `Preferences` + `AppWindow.GetFromWindowId` on close → restore on start.
5. Related: the split-view threshold is 700 **logical** px (`HomePage.OnPageSizeChanged:137`) while the floor is
   600 **physical** — at 100% scale a min-width window can never show the dual-pane layout, at 200% it always
   tries to. Align the two in the same unit system when touching this.

## 4. Suggested order

B1 system-ui swap → re-screenshot vs Telegram → R2/R3 desktop type+density block → window sizing fixes (§3,
small C#, safe — window chrome only, none of the §3 risky parts) → R4 with the bubble-scale adoption.
