# Session 4 renders: lever 7 and lever 12


## Lever 7: desktop chat-info pane open (`lever7-pane-open-{light,dark}.png`)

| Row | What it shows |
|---|---|
| BEFORE | Full window before the pane presents: col 0 home 400, col 1 chat 880, col 2 = 0 |
| TODAY | What the code does now. `HomePage.onOverlayPresented` (`HomePage.xaml.cs:4661-4666`) sets col 2 to 360 in the present frame, so the chat compresses to 520 at t=0. `revealStage` then slides and fades the stage: 40% travel = 144 px, α 0 → 1, 300 ms on cubic-bezier(0.2,0,0,1) (`SpixiContentPage.cs:4159`, `:4209`, `ScreenSlideInMs :3955`, `SlideTravel :3965`). Early frames show an empty strip, which is the window ground in the expanded column. |
| 1 | The pane slides over the full-width chat with the same 40% travel and fade. At t=300 the column widens once and the chat compresses once. |
| 2 | Col 2 width runs 0 → 360 on the slide clock, so the chat reflows every frame. The pane fades on the same clock. The pane is laid out at 360 and clipped by the column, so the info shell does not reflow. |
| 3 | Push. The pane is opaque and travels the full 360 with its column edge, over the chat. The chat compresses at t=300. |

Frames are at t = 0 / 60 / 120 / 180 / 220 ms, plus t = 300. The 300 frame is the settled state; options 1 and 3 resize the chat only at that point. Each caption gives the chat width, the col 2 width, the pane dx and α. Frames are cropped to x ≥ 360 (the list column does not move).

**What is mocked:** the MAUI grid and the overlay stage. They are plain HTML boxes that use the C# numbers above. The three panes are the **real built shells**: `index.html?desktop=1`, `chat.html` and `contact_details.html`. Each one runs in its own iframe and gets data through `executeUiCommand`, with the same verbs that `ContactDetails.onLoad` pushes (`setPaneMode 2`, `setContext chat`, `setAddress`, `setNickname`, `setAvatar`, `showIndicator`). The window ground behind the empty column uses the info shell's body colour; the real MAUI page ground may be different. These frames do not include the frame-time cost of the WebView2 resize (it is a single resize in today / 1 / 3, and one resize per frame in 2), the WebView2 resize lag, or compositor effects.

## Lever 12: subscreen slide durations (`lever12-subslide-durations-{light,dark}.png`)

The sheet shows the real built `settings.html` on a phone (412×860, Android UA, `?mobile=1`). The flow is Account → Chat appearance, then Back.

| Row | In / out |
|---|---|
| TODAY | 300 / 220 (`subscreen-slide.css`, `subscreen-slide.js` ENTER_MS / EXIT_MS, the C# 300 / 220 at `SpixiContentPage.cs:3955`, `:2463`) |
| B | 220 / 160 |
| C | 180 / 140 |

ENTER frames are at t = 0, 40, 80, 120, 160, 200, 240 and 300. EXIT frames are at t = 0, 40, 80, 120, 160, 200 and 220. All rows use the same times, so you can compare down a column. The caption gives α, and "done" marks a frame at or after the end of that duration.

**What is mocked:** nothing in the pixels. The shipped `c-subslide-in` / `c-subslide-out` keyframes (40% travel + fade) run with the shipped easings (`--easing-standard` in, `--easing-accelerate` out). The script pauses each CSS animation and seeks it with the Web Animations API, and changes only `duration` for each row. While frames are taken, the 600 / 440 ms backstop timers are suppressed and `animationend` on the slide layer is held. This stops the JS from settling the paused slide. The native overlay slide (C#) uses the same numbers, and a smoke pin holds them equal, so a pick here changes both. The native slide is not rendered here.

## #1147 (1) A2 restyle: the jump band (`A2-fix-{light,dark}.png`)

The real built `chat.html` on a phone (412×760, Android UA, `?mobile=1`, reduced motion = the static held look). Four rows carry `data-mention-pulse` at once (in the app only one row is lit at a time): a received text, a sent text, a file card and an offered photo tile; the last row is not lit, for contrast. Band = `--surface-select-row` with `--radius-12` (the multi-select selected-row look), ring = 1 px `--outline-action-default`. Computed: light band rgba(48, 80, 189, 0.16), ring rgb(48, 80, 189); dark band rgba(118, 157, 255, 0.22), ring rgb(118, 157, 255); radius 12 px; row padding 0 / 16 px (the band hugs the bubble top and bottom, as the selected row does).

**What is mocked:** nothing in the pixels; the attribute is set by script on several rows to show every kind in one frame.

**Re-rendered after #46 r1 (B-m1 · B-M1):** the ring is now a 1 px band-coloured GAP (`--surface-select-row-gap`, the band made opaque: light #CED5E9 · dark #232D45) and then the 1 px blue ring, so the blue no longer touches the sent bubble. Computed: light `rgb(206,213,233) 0 0 0 1px, rgb(48,80,189) 0 0 0 2px`; dark `rgb(35,45,69) 0 0 0 1px, rgb(118,157,255) 0 0 0 2px`. Ring on the gap 4.76:1 (light) · 5.24:1 (dark); light before: ring on the sent bubble 1.17:1.

## #1148 (2) photo tile edge per side (`A5-edge-{light,dark}.png`, script `render-a5-edge.mjs.txt`)

The real built `chat.html` on a phone (412×1400, Android UA, `?mobile=1`). Two received and two sent photo tiles, each with a `setFileThumb` JPEG made for the test: one photo in the chat ground's own colour (light #ECEEF1 · dark #0C0E10, sampled from the canvas) and one light / dark green. Received tile = 2px frame in the incoming bubble ground (light #FFFFFF · dark #1A1C1F) + the incoming edge outside it (hairline transparent in light, rgba(255,255,255,0.043) in dark, + the lift). My tile = the sent 2px frame (light #2160C2 · dark #1A4A96) + the lift. Computed values match the received text bubble's tokens.

**What is mocked:** the photos (generated flat JPEGs). ⚠ In dark the received frame is the bubble ground (#1A1C1F) on a #0C0E10 canvas — it reads, but softly, as the dark text bubble does.

**Re-rendered after #46 r1 (B-M2 · B-m2):** a local photo tile is now SQUARE from its first frame (C#'s preview is a square centre crop, `SThumbnail.makeJpeg`, 320) and the picture COVERS the tile (no 1 px sliver inside the frame); the test JPEGs are not square, so they show centre-cropped.

## #1148 (4) reaction heart (`reaction-dot-{light,dark}.png`, script `render-reaction-dot.mjs.txt`)

The real built `index.html` (412×720). Rows: Ana = heart, no count (+ the sticky "Reacted" line) · Bor = heart AND 3 unread → the count wins, no heart · Cene = nothing · Dora = heart. Unread chip = 1 (Bor only), nav badge = 3. Disc = `--surface-select-row` (light rgba(48,80,189,0.16) · dark rgba(118,157,255,0.22)), heart = `--icon-action-default`, 20 px disc, 12 px filled heart, label "New reaction".

**What is mocked:** nothing in the pixels; the rows are pushed by script (`addChat` 13th arg).
