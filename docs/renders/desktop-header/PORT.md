# DC-SCREEN-W · port notes (ADDENDUM-D §D4)

Render: `desktop-header-render.html` (+ the PNGs, `contrast.json`). Regenerate: `python3 docs/renders/desktop-header/build-desktop-header.py`.
Pane 1128 × 800 CSS px (1200 window − 72 rail), hub 328 px, detail 800 px; stress pane 720 px (detail 392 px).

## Mechanism (today)

| # | Where | What it does in the pane |
|---|---|---|
| 1 | `src/shells/settings.html:138` `body[data-pane] .sd-detail > :not(.sd-empty) > :not(.c-topbar) { max-width: 640px; margin-inline: auto }` | The scroller `.c-settings__body` (the band's parent) becomes a 640 px centred column. The band's bleed (`settings-app.css:494` / `:691`, negative inline margin) escapes only the body padding, so it stops at the column. The bar is excluded and spans the full 800 px. |
| 2 | `src/shells/settings.html:148` `body[data-pane] .c-topbar { background: var(--surface-settings-ground) }` | Sets `background` directly (0,2,1). The S17 header rule (`settings-app.css:949–953`) only sets `--surface-topbar: transparent`, so the bar stays OPAQUE ground and covers the band's top 56 px. That is the "cut" band. |
| 3 | `src/styles/components/settings-app.css:949–959` | Still re-assigns `--text-topbar` / `--icon-topbar` to `--text-on-hero` (white) and the 22 px bold title. Light: white ink #f9fafb on ground #f3f5f7 = **1.05 : 1** (invisible). Dark: light ink on the dark ground = 15.91 : 1 (readable, but the band is still cut). |
| 4 | `src/components/illustrations-s17.js:38/40/54/56` `par: 'xMidYMax slice'` + `illo.css:69` (layer = 100 % of the band) | Any band wider than a phone scales the art up (×1.5 at 598 px, ×2 at 800 px) and crops its top: the heart and the app tile are cut. Both options need the art held at phone scale. |
| 5 | `src/styles/base.css:184–203` `.u-scroll` `scrollbar-gutter: stable` | The thin scrollbar's gutter is outside the content box: a full-width band stops ~10 px short of the pane's right edge. Matters for option A only. |

JS needs no change for either option (`createSettingsContributors` `settings-app.js:869`, band `:891`, scroll → `data-solid` `:880–886`; `createSettingsAbout` `:1098`, `onScroll` `:1124–1130`, band `:1146`). `setTopSurface` is already a no-op in pane mode (`settings.html:918`).

## Option A: full-width band under a transparent bar (the phone's look)

Spec: `option-a.css`. Put the rules in the pane block of `src/shells/settings.html` (after `:153`), so they sit with the pane rules they override and come later in the cascade.

| Change | Selector / value | Why |
|---|---|---|
| Size container + gutter | `.sd-detail > .c-settings-{about,contrib}--hdr { container-type: inline-size; --hdr-gutter: max(16px, 50cqi − 304px) }` | Keeps the 640 px column as padding, not a width cap. |
| Full-width scroller | `… > .c-settings__body.u-scroll { max-width: none; padding-inline: var(--hdr-gutter); scrollbar-width: none }` (0,5,1) | Beats `:138`. Hides the scrollbar on these two screens only (row 5). |
| Band bleed + phone height | contrib band `--ct-hdr-h: 220px; margin-inline: −gutter`; about band `--ab-hdr-h: 234px; margin-inline: −gutter − 20px` | Overrides `settings-app.css:499` / `:696` in the pane. |
| Art at phone scale | both `.il` layers `inline-size: 430px`, centred; ground layer masked 0–30 % / 70–100 %; foreground masked 0–15 % / 85–100 %; band `background` = the art's own tokens (`--ab-band-from/-to/-deep`, `--dc-a/b/c` + the htBs top shade) | Row 4. Fills the wide sides with no seam. |
| Top scrim | band `::after`, 120 px, `rgba(8,30,90,.42)` light / `rgba(0,0,0,.22)` dark, solid to 44 px | Without it white ink on `--ab-band-from` is ~3.1 : 1 and on `--dc-a` ~3.3 : 1. Two NEW sanctioned values. |
| Transparent bar | `> .c-topbar:not([data-solid]) { background: transparent }` | Beats `:148`. Once the bar is solid it takes the pane ground again. |

- **Measured (1128 px):** title 6.01 / 7.80 : 1 light, 8.90 / 11.01 : 1 dark (About / Contributors). Narrow 720 px: 6.32 / 6.38 light, 8.05 / 7.90 dark.
- **Risks:**
  - The contrast depends on art geometry. The 430 px column must stay clear of the title. At a 392 px detail the art covers the whole band, and only the scrim holds 4.5 : 1. The twinkles and bokeh drift (motion on); the render is the reduced-motion still frame.
  - The scrollbar is hidden on two screens: there is no draggable thumb for mouse users.
  - Mac Catalyst: the `#993` title-bar hairline (`base.css:46`) would cross the band. It needs `data-bleed-top` while these screens are open.
  - `container-type` / `cqi` / `mask-image` are new to this shell. They are fine in WebView2 and WKWebView 16+.
  - A jsdom pin cannot see pixels. An honest ≥ 4.5 pin needs a Chromium pixel pin, or a token composite (scrim over the lightest stop) plus a geometry assumption.
- **Cost:** ~70 CSS lines and 2 new sanctioned colours. The pin is either new Chromium-pin plumbing or a weaker token pin. One extra Mac check. Medium.

## Option B: rounded band card in the column, normal pane bar (recommended)

Spec: `option-b.css`. Same place: the pane block of `src/shells/settings.html` (after `:153`).

| Change | Selector / value | Why |
|---|---|---|
| Bar back in the flow | `body[data-pane] .c-settings-{about,contrib}--hdr > .c-topbar { position: sticky }` | Undoes `settings-app.css:943–947` in the pane. |
| Normal ink + title | `… > .c-topbar:not([data-solid]) { --surface-topbar/--text-topbar/--icon-topbar: inherit }`, its `.c-topbar__title { font-size: heading-sm; font-weight: semibold; text-shadow: none }` | Undoes `:949–959`. The pane ground comes from `:148`, unchanged. |
| Body top padding | `… > .c-settings__body { padding-block-start: var(--screen-pad) }` | Undoes `:961–962`. |
| Band = card | contrib band `margin-inline: 0; border-radius: 24px` (its names-card radius); about band `margin-inline: −20px; border-radius: var(--radius-16)` (its settings-card radius) | Aligns with the column's cards. Keeps the desktop heights `:499` / `:696` (200 / 208). |
| Art at phone scale | same 430 px column + masks + token ground as A | Row 4: without it the heart and the app tile crop at the card's top. |

- **Measured:** title 16.88 : 1 light, 15.91 : 1 dark, both screens, both widths. The ink is `--text-topbar` on `--surface-settings-ground`, the same as every other pane sublevel.
- **Risks:**
  - The phone look (band under the bar) is lost on desktop. The pane already reads as one flat surface (#1080 F5), so B matches it.
  - The `data-solid` toggle still runs. It is harmless, because the tokens are pinned in both states.
  - The art-column rules are shared with A; they must cover both layers.
- **Pin:** a token pin is enough. Desktop + pane: open About / Contributors, then resolve the bar title's ink and the bar surface from the tokens in both themes and assert ≥ 4.5 : 1. Deliberate break: drop the `inherit` rule. The ink then falls back to `--text-on-hero` and the pin reads 1.05 : 1 in light.
- **Cost:** ~45 CSS lines (25 without the art column). No new colour. A jsdom pin. Low.

## Side finding (phone, outside D4)

The PHONE header today fails the same 4.5 : 1 bar: About light **3.49**, Contributors light **2.68**, Contributors dark **3.92** (the twinkles and bokeh under the title; 412 × 915, 24 px inset). The D4 pin is desktop-only. If the 4.5 pin should also hold on the phone, the option A scrim is the candidate fix there.
