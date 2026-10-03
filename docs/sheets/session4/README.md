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
