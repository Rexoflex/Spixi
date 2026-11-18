# Fix batch 2 — the mechanisms, written before the fixes (#294)

Session `fixb2`, 2026-11-17, read on `redesign/frontend` @ `06a4845d`. Lead: Claude Opus (#1640). One section per
item that the prompt marks "mechanism first" (items 2, 3, 5; item 4 follows item 3). Each section was written by its
builder in its work copy BEFORE the first code edit and is copied here unchanged in substance (headings levelled).
Items 1, 6 and 7 have a short note at the end.

## Item 3 — Windows confirm: no focus, no accent, Enter does nothing

Walk W-1 (Damir, Windows, F5, MAUI on WinUI 3, the page = WebView2): the dialog opens with NO visible focus and NO accent
on any button; Enter does nothing; Esc cancels; Tab to OK + Enter confirms. Built (fixb1): `SConfirm.showSafeDefaultConfirm`
(`Spixi/Utils/SConfirm.cs:112-150`) = a code-made `ContentDialog`, Primary = OK, Close = Cancel, `DefaultButton = Close`,
`Style = DefaultContentDialogStyle` when found, `ShowAsync()`; nothing else touches focus.

⚠ The cloud cannot run Windows. Everything below is READ from the WinUI / MAUI / CsWinRT sources (main branches, fetched
2026-11-17) and the Spixi tree; nothing was observed on a device. WinUI main may differ from the WinAppSDK that MAUI 10 ships.

Sources (raw files, line numbers of the fetched copies):
- WinUI `dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp` = **CD** · `dxaml/xcp/core/dll/focusmgr.cpp` = **FM** ·
  `dxaml/xcp/core/core/elements/XamlIslandRoot.cpp` = **IR** · `dxaml/xcp/core/core/elements/Popup.cpp` = **PO** ·
  `dxaml/xcp/dxaml/lib/ResourceDictionary_partial.cpp` = **RD** · `controls/dev/CommonStyles/ContentDialog_themeresources.xaml`
  = **TR** · `dxaml/xcp/components/controls/KeyDownUp/inc/ButtonBaseKeyProcess.h` = **BK** · `dxaml/xcp/dxaml/lib/ButtonBase_Partial.cpp`
  = **BB** · `controls/dev/WebView2/WebView2.cpp` = **WV** · `docs/design-notes/focus.md` = **FD**
  (all under https://github.com/microsoft/microsoft-ui-xaml, branch `main`).
- MAUI `src/Core/src/Hosting/MauiAppBuilder.cs` = **MB** · `src/Core/src/Platform/Windows/ResourceDictionaryExtensions.cs` = **RE** ·
  `src/Controls/src/Core/Platform/AlertManager/AlertManager.Windows.cs` = **AM** (https://github.com/dotnet/maui, `main`).
- CsWinRT `src/WinRT.Runtime/Projections/IDictionary.net5.cs` = **CW** (https://github.com/microsoft/CsWinRT, `master`).

### What the dialog does at open (from the source)
1. `ShowAsync` on a dialog that is not in the live tree = `EntireControlInPopup` (CD:686-690): the whole control is the
   child of a Popup. The popup state is `DialogShowingWithoutSmokeLayer` (CD:456-462), which turns the three template
   buttons into tab stops (TR:125-131; the template has `IsTabStop="False"` on them, TR:256-258).
2. Initial focus: `SetInitialFocusElement` runs on `LayoutRoot.Loaded` (CD:1636-1650): first focusable in the content
   (our TextBlock is not focusable) → else the DEFAULT button → else the first command button (CD:1995-2072). Every one of
   these calls passes **`FocusState_Programmatic`** (CD:2034, 2046, 2067).
3. Enter / Esc: ONE KeyDown handler on `LayoutRoot` (CD:224-226, 1748-1795): Esc → close action (= `None` = Cancel);
   Enter → `ProgrammaticClick()` on the DEFAULT button (Close). A focused Button handles Enter itself first (KeyDown marks
   it handled, click on KeyUp; `SetAcceptsReturn(true)` BB:46; BK:16-60).
4. Accent: the `DefaultButtonStates` group (CD:398-439): with `DefaultButton = Close`, `CloseAsDefaultButton` is chosen
   when focus is NOT in the command area, or when the Close button has it; it is NOT chosen when another command button
   has focus. The state sets `CloseButton.Style = AccentButtonStyle` (TR:206-209). It is re-evaluated on every GotFocus
   inside LayoutRoot (CD:232-237) and when the popup opens (PO → CD:1352-1373).
5. `Opened` is raised from `Popup.Opened`, which the event manager raises ASYNC (PO:250, PO:3263-3270 — `Raise(…, TRUE, …)`),
   after `UpdateVisualState` (CD:1362). The source does not fix its order against `LayoutRoot.Loaded` (step 2).

### The candidates
| # | Candidate | Verdict | Source | How sure |
|---|---|---|---|---|
| d (new) | **No focus RING by design**: the initial focus is Programmatic; on Programmatic focus XAML takes the state of the LAST INPUT DEVICE — the click on "Delete" in the page was a mouse click, so the state is `Pointer`, and XAML draws the focus rectangle only for `Keyboard` | **SUPPORTED** | CD:2045-2046 (`SetFocusedElement(defaultButton, FocusState_Programmatic)`); FM:3201-3222 (`CoerceFocusState`: Programmatic → Keyboard only if the last input was a keyboard / gamepad, "Otherwise … Pointer … focus rectangle will not be drawn"); FD:542-543 ("Xaml draws the focus rect when the focused element's FocusState is 'Keyboard'") | high — this alone means fixb1's "Cancel has the focus" could never show a ring after a mouse click, even when everything else works |
| a | **The keyboard (Win32) focus stays in the WebView2** when the dialog opens: XAML focus may move to the Close button, but the key messages still go to the Chromium input window, so Enter never reaches the dialog | **CANNOT TELL** (the most likely reading of "Enter does nothing") | Enter does nothing ⇒ the Enter KeyDown did NOT route through LayoutRoot: both routes there cancel (focused Close: BK:22-60; else the default button: CD:1773-1790). The WebView2 is the only other keyboard sink in that window (visual hosting, WV:906-929; the "Input HWND", WV:45-50). XAML normally takes Win32 focus back when it focuses an element (FD:181-199; FM:1935-1958, 2004-2009 → `GetFocusAdapter().SetFocus()`), BUT it skips it when the island reports it already has focus (IR:1295-1311 `if (!HasFocus())`), and the source names the gap: "InputFocusController needs some sort of ContainsFocus API to detect when Focus is in nested Content (eg XAML and a WebView2)" (FM:1784-1797, task 49085931). AGAINST: "Esc cancels" — Esc goes through the SAME LayoutRoot KeyDown handler (CD:1752-1764), so a pure (a) would make Esc do nothing too. Unless Damir's "Esc cancels" means "Esc deleted nothing" (the page under the dialog takes Esc for its own overlay, `src/components/overlay.js:96`), the pair Enter = nothing / Esc = cancel fits no single path in the source | low-medium. Proof on the device: with the dialog up, press Enter and read the log — `[CONFIRM] removehistory busy` (the page ran its verb again and the gate refused it) or a web confirm that opens behind the dialog = the keys went into the WebView |
| b | **The default style / the accent state is not applied** because `Resources.TryGetValue("DefaultContentDialogStyle")` does not see a key that lives in a MERGED dictionary (`XamlControlsResources`) | **NOT SUPPORTED** | C# `TryGetValue` on a WinRT map = `IMap.HasKey` then `Lookup` (CW:436-457); WinUI `ResourceDictionary::HasKey` = `LookupCore` → `TryGetItemCore` with `checkOnlyLocalDictionaries = false` → `LookupScope::All` (RD:23-49, 52-67, 86-93, 125-137) — merged dictionaries included. MAUI merges `XamlControlsResources` into `Application.Resources` (MB:81-90, RE:36-60) and relies on the same merged lookup itself (`resources.ContainsKey("MicrosoftMauiCoreIncluded")`, RE:27). And even without the explicit style, `XamlControlsResources` holds an IMPLICIT `<Style TargetType="ContentDialog" BasedOn="{StaticResource DefaultContentDialogStyle}"/>` (TR:56), the one MAUI's own alert uses (AM: no Style set) | high for the lookup. The missing ACCENT stays unexplained by the source: with `DefaultButton = Close` the state is `CloseAsDefaultButton` unless ANOTHER command button has focus (CD:405-436) — a muted system accent colour on Damir's PC, or focus on a non-Close button, are the readings left; cannot tell |
| c | **The 600 ms rule swallows the first key** | **NOT SUPPORTED** | `SafetyRules.tooFast` is read only AFTER the dialog closed and only for an OK: `if (yes && SafetyRules.tooFast(…))` (`Spixi/Utils/SConfirm.cs:76`, `SafetyRules.cs:235-237`). It cannot keep the dialog open or eat a key; an Enter that cancels logs `[CONFIRM] <verb> cancel` at any time | certain |

### What follows for the fix
- (d) is certain and (a) is the likely reading: the fix must set the focus with **`FocusState.Keyboard`** (ring) and by an
  app call to `UIElement.Focus`, which is the documented way for XAML to take the Win32 focus back to the island
  ("When the app programatically sets Xaml focus to a Xaml element, Xaml sets win32 focus to the island that contains that
  element", FD:181-199; FM:1935-1958: even when the element already has XAML focus, the call "ensure[s] the island has Win32
  focus"). `UIElement.Focus` returns true only when "keyboard focus and logical focus were set"
  (https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.uielement.focus).
- Re-focusing the element that already has XAML focus with another state updates the state and raises GotFocus (FM:1903-1932)
  → `UpdateVisualState` → `CloseAsDefaultButton` (CD:232-237, 429-434): the accent follows the focus on Close.
- Because `Opened` (async, step 5) and the Programmatic initial focus (step 2) have no fixed order, and a LATER Programmatic
  set on the same button would turn its state back to `Pointer` (FM:3201-3222 + FM:1903-1916), the step runs in `Opened`
  AND once more at Low dispatcher priority (after the pending layout / Loaded work). Neither is a timer; neither completes the
  dialog task; each targets ONLY the template part `CloseButton` whose shown text is the Cancel text and not the OK text.
- (b): `winDialogStyle()` already finds the merged key (CW → RD) — no change needed; kept byte for byte.
- No P/Invoke `SetFocus`, no `InputFocusController` call (a new API surface, UNCOMPILED here): the documented XAML call only.
- If the step finds no button, the button is not Close, or anything throws: nothing more happens — the dialog is as in
  fixb1 (Enter does nothing or cancels; never OK). If (a) holds and XAML cannot take the Win32 focus back, the walk will show
  it: then keep "Enter does nothing" (safe) and change the walk text (see the report).

## Item 2 — Desktop: the divider line beside the hairline; the reset width

Written BEFORE any edit of the XAML / C# (#294). Measured with `scripts/pins-fixb2/b-hairline-sweep.mjs` (new, Chromium
153.0.8010.12 headless, the BUILT `Spixi/Resources/Raw/html/index.html` of `06a4845d`, a desktop UA so the shell's own boot
script sets `data-desktop`).

### 1 · What paints the hairline
| Fact | Where | Measured |
|---|---|---|
| The ONLY `body::after` rule of the home shell: `:root[data-desktop] body::after { content:''; position:fixed; top:0; bottom:0; inset-inline-end:0; width:var(--outline-width-1); background:var(--outline-neutral-03); z-index:31; pointer-events:none }` | `src/shells/home.html:318-328` (built: `index.html:7430-7440`) | computed: fixed · inset-inline-end `0px` · width `1px` · no border · box-shadow `none` · z 31 |
| `--outline-width-1: 1px` | `src/styles/tokens.css:328` | — |
| Colour `--outline-neutral-03`: light `neutral-300`, dark `neutral-600` | `tokens.css:839`, `:1177` | light `rgb(199,203,209)`, dark `rgb(44,46,49)` |
| No other edge line: the rail's `border-inline-end` (`bottomnav.css:183`) is at the LEADING side (the rail is first in the row) | — | — |
| Root scroll bar | — | none (`innerWidth − clientWidth = 0`), so the fixed box ends at the window's last CSS px |

**Hairline box (CSS px, window width W):** `[W−1, W]` — at W 400: x 399…400; at W 440: x 439…440 (both themes).
**Device pixels painted** (a screenshot with and without the `::after`, per device column, counted from the trailing edge, 1 = the last column):
| Scale | Columns painted | Coverage |
|---|---|---|
| 1 (100 %) | column 1 | 1.00 |
| 1.5 (150 %) | columns 1 and 2 | col 1 = 1.00 · col 2 ≈ 0.5 (anti-aliased: 1 CSS px = 1.5 device px) |
Same at W 400 and 440, light and dark.

### 2 · Where the WebView, the grip and the line are (HomePage.xaml)
- The home `WebView` is the only content of `Grid.Column 0` (`HomePage.xaml:21`: Fill / Fill, no margin, no span). In split view the
  column has the width `leftPaneWidth` (`applyLeftPaneWidth`, `HomePage.xaml.cs:908-913`). So the WebView's trailing edge = the end of
  column 0 = `W` DIP, and the shell's `inset-inline-end: 0` lands exactly there.
- The grip `paneDivider` (`:31`): `End`, `WidthRequest 10`, no margin → DIP `[W−10, W]`; its trailing edge = the column edge.
- The line `paneDividerLine` (`:26`): `End`, `WidthRequest 2`, `Margin 0,0,4,0` → DIP `[W−6, W−4]` (the middle of the grip).
  Device columns from the end: scale 1 → 5…6; scale 1.5 → 7…9.
- **The offset:** the line's trailing edge is 4 DIP before the hairline's (centre to centre 4.5 DIP); a gap of 3 DIP between them.
  That is Damir's "about 4 px left of the hairline" (W-3).

### 3 · The unit relation
- WebView2: "Logical size × rasterization scale = Raw Pixel size" in `COREWEBVIEW2_BOUNDS_MODE_USE_RASTERIZATION_SCALE`, and the
  rasterization scale is the monitor DPI scale (plus the system text scale) — Microsoft, `ICoreWebView2Controller3`
  (learn.microsoft.com/microsoft-edge/webview2/reference/win32/icorewebview2controller3). The WinUI `WebView2` control is sized in
  effective pixels (DIP) = its logical size; at ZoomFactor 1 one CSS px = one DIP (WebKit wiki "Scales and Zooms": a page zoom of
  120 % means one CSS px occupies 1.2 DIP). The code already relies on it: `railWidthDip = 72` "CSS px == DIPs in the WebView at
  default zoom" (`HomePage.xaml.cs:179-182`).
- So at 100 % one CSS px = one DIP = one device px; at 150 % one CSS px = one DIP = 1.5 device px. Chromium's `deviceScaleFactor` is
  the rasterization scale in the sweep.
- Mac (WKWebView in Catalyst): one CSS px = one UIKit point at page zoom 1; MAUI lays out in points. The CSS is the same file, so the
  hairline is the same `[W−1, W]` point box; at 2× it paints two whole device px (no half column). If the app runs in the iPad idiom
  (scaled ~77 %), the scale applies to the whole UIKit tree — the WebView and the BoxView alike — so the relation holds.
  NOT measured: no WebKit in this container (only Chromium in `/opt/pw-browsers`).

### 4 · The fix (follows from the numbers)
- `Margin="0,0,0,0"` on `paneDividerLine` → DIP `[W−2, W]`: device columns 1…2 at 100 %, 1…3 at 150 %. It holds every painted column
  of the hairline (1 at 100 %; 1 and the half column 2 at 150 %) and shares its trailing edge. The line stays under the grip
  (`[W−10, W]`), so the hover area is unchanged. `WidthRequest="2"` and `InputTransparent="True"` stay (contract § 3). The line is 2 px,
  the hairline 1 px: the line also covers the 1 DIP of the list next to the hairline (to the left). It cannot be centred on the
  hairline without passing the column edge into column 1, where the chat overlays (added after it) would cover its right half.
- Reset width: `leftPaneDefaultWidth` 400 → 440 (`HomePage.xaml.cs:178`, verified 400). It is ONE constant for the double-click
  reset (`:325-330`), the first-run default (`Preferences.Default.Get("leftPaneWidth", leftPaneDefaultWidth)`, `:320`; the field inits
  `:184-185`) and the NaN fallback (`:893-896`). I keep one value (the lead's view): a fresh install starts at 440, a stored width
  is kept. No reason against found: 440 is inside [280, 624], and `clampLeftPaneWidth` still caps it at `Width − 320` (a 700 DIP
  window gives 380). The Account pane follows (`leftPaneWidth − railWidthDip`, `:3125`), from the live value, not the constant.

### 5 · How sure, and what only Damir's screen can prove
- Certain (code + measurement): which rule paints the hairline, its box `[W−1, W]` CSS px, the line's DIP box from the XAML, the
  4 DIP offset, and that margin 0 aligns the trailing edges.
- High, not proven here: that WinUI rounds the WebView's and the BoxView's trailing edges to the SAME device pixel at 150 % during a
  drag (a fractional width such as 401.3 DIP = 601.95 px). Both are arranged to the same column edge, so the same rounding applies.
- Only the device can show: the look on the real WebView2 / WKWebView at 100 % and 150 % (and the Mac Retina), and the case where
  Windows "Make text bigger" changes the WebView2 rasterization scale apart from the display scale.
- RTL: `inset-inline-end` moves the hairline to the left side under RTL; the XAML does not mirror with it. Out of scope, as today.

## Item 5 — Desktop: centred sheets keep fixed margins in a short window

### Item 5 · "Your Ixian address" in a small desktop window

### The mechanism (read, then measured)
| What | Where |
|---|---|
| Every centred desktop sheet is one `.c-sheet` placed at `left/top: 50%`, `transform: translate(-50%, -50%)`, `width: min(480px, 92%)`, **`max-height: 76%`**, `overflow-y: auto`, `padding: --spacing-24` | `src/styles/components/overlay.css:244-257` (`:root[data-desktop] .c-sheet`) |
| The address sheet narrows it: `width: min(440px, 92%)`; makes the dialog a flex column that CLIPS (`overflow-y: hidden`); the inner `.c-addr-sheet.u-scroll` is the ONE scroll container (`flex: 1 1 auto; min-height: 0; max-height: none`) | `src/styles/components/wallet-receive.css:266, 287-303` |
| Opened by Account › "My address" → `openAddressSheet({…, host: hostFor()})` → `sheet.classList.add('c-sheet--addr')` | `src/components/settings-shell.js:934`, `src/components/wallet-receive.js:508, 717` |
| The `76%` is a percentage of the HOST (the shell root), so the free height above and below is a FIXED 12 % each; the content height does not matter. Today: the cap binds, the inner scroller scrolls, and 24 % of the window stays empty | `overlay.css:247` |
| Margins / insets: no px inset; the vertical "margin" is only `(100% − max-height) / 2` because the dialog is centred | — |
| Shared by: the moment sheets (`.c-sheet.c-moment__sheet`, `moment-sheet.css:8`), the Theme / Language pickers (`.c-sheet`), every other `openSheet` (tx details, avatar sheet, add-contact…). The anchored dropdowns (`[data-dt-anchor="menu"/"up"]`, `desktop-anchors.js`) also inherit `max-height: 76%` — they are positioned by inline top/left and must not grow. `.c-modal` (centred confirm dialogs) has no max-height rule of its own (short content) — not touched | `overlay.css:244-312`, `moment-sheet.css`, `settings-shell.css:385-466` |
| No other CSS declares a desktop max-height on a centred sheet (grepped every `src/styles/components/*.css`); the inner list caps (`settings-shell.css:392` `.c-settings__opts--scroll`, `launch-shell.css:230`) are inside the sheet, not on it | — |

### Smallest supported window height
`Spixi/Platforms/Windows/App.xaml.cs:37-38` — `MinWidthDip = 384`, `MinHeightDip = 360` (DECISIONS #231c, #226; the OS enforces it through `PreferredMinimumHeight`, `:157-158`). This is the OUTER window; the web view is about a title bar (≈ 32) less, so I measured at 360 and at 328. No Mac minimum is set in C# (`Spixi/Platforms/MacCatalyst` has none): Apple phase.

### Measured in Chromium on the BUILT settings shell (`Spixi/Resources/Raw/html/settings.html`, desktop UA, demo address, light = dark)
Sheet box (viewport H → top free / bottom free / height / does the inner scroller scroll). BEFORE = the untouched tree `/home/claude/spixi`.

| Window | BEFORE | AFTER |
|---|---|---|
| 384 × 360 | 43.2 / 43.2 / 273.6 / **scrolls** (188 of 441 px visible) | 24 / 24 / **312** / scrolls (226 of 441 visible — the content cannot fit in 360 px) |
| 384 × 328 | 39.4 / 39.4 / 249.3 / scrolls | 24 / 24 / **280** / scrolls |
| 1000 × 668 (the default window) | 80.2 / 80.2 / 507.7 / **scrolls** (422 of 495) | 43.5 / 43.5 / **581** / no scroll (the whole sheet fits) |
| 1280 × 800 | 109.5 / 109.5 / 581 / no scroll | 109.5 / 109.5 / 581 / no scroll — **identical** |
| 1600 × 1000 | 209.5 / 209.5 / 581 / no scroll | 209.5 / 209.5 / 581 — identical |
| 412 × 915 (phone UA, not desktop) | bottom sheet, 672 high, no scroll | identical (the rule is `[data-desktop]` only) |

The sheet's natural height is 581 px (title + card + address + Share), so at 800 px the 76 % cap (608) is not even reached — which is why the large window stays byte-identical. Dark and light give the same numbers. Other centred sheets, same rule (Account › Theme, Language): at 360 Theme went 273.6 → 312 (still scrolls, its content is taller), Language went 273.6 (scrolls) → 283.6 (**no scroll**); at 800 both identical.

### The fix (one rule, `overlay.css` after the `[data-open]` rule)
```
:root[data-desktop] .c-sheet:not([data-dt-anchor]) {
  max-height: max(76%, min(calc(100% - 2 * var(--spacing-24)), 608px));
}
```
- A host of 800 px or more: `max()` takes the 76 % → today's value (608 = 76 % of 800 is the stated cap; at 1000 it is 760 as before).
- A shorter host: the cap grows to `H − 48` (a 24 px margin each side), never past 608: 360 → 312, 668 → 608, 528 → 480.
- The anchored dropdowns keep their 76 % (the `:not([data-dt-anchor])`). The base rule is untouched (every existing pin that reads it stays true). Fix once, in the shared rule, no per-sheet CSS.
- Conservative CSS: `min()`/`max()` with `calc()` and `%` — already used elsewhere in the sheets (`min(480px, 92%)`, `max(0px, …)`); `:not([attr])` is CSS3. Nothing modern. WebView2, Android WebView and WKWebView all support them.
- Comment kept to one line on purpose: the final tree's built `chat.html` is 986 588 chars against the `CHAT_KB_CEIL = 964` smoke row (964 × 1024 = 987 136): **548 chars of headroom** (measured on the committed head; 740 was an interim figure of `work/f1e`).
- #46 r1 (m-2): the chat app picker (`chat.html` `:root[data-desktop] .c-sheet.chat-app-picker-sheet[data-tall]`) set a FIXED `height: min(560px, 76%)`, which out-ranks `max-height`; it is now `min(560px, <the shared cap>)`. Measured in Chromium (384 × 360 / 1280 × 800 / 1000 × 668): 273.6 → 312 / 560 → 560 / 507.7 → 560. The Windows call-card decline sheet (`call.html` `.c-declinemsg-sheet { max-height: calc(100% - 48px) }`) IS a real centred `.c-sheet` (call-overlay.js:317 adds the class to a `createSheet` sheet), but it lives in the card-sized call WebView and deliberately takes H − 48 (never under the shared cap, #46 r2 NIT); it is held EXACTLY in the pin's allow-list, not covered by the shared expression. The pin's check (4) now scans rules inside at-rules too (m-1).

### Item 7 · the Aurora ring (#1614 "Keep defaults, darken the ring")

### What the "ring" is
DECISIONS #1345: "the blue selected-row ring … on Damir's gap #57A4E6". It is the A2 highlight of a jumped-to message (`src/shells/chat.html` `chat-jump-ring`, and the reduced-motion static twin): `box-shadow: 0 0 0 1px var(--surface-select-row-gap), 0 0 0 2px var(--outline-action-default)` — a 1 px GAP in the select band's colour, then 1 px of the action outline blue. Contrast ring : gap is held by `scripts/pins-s4/fixr2.mjs` (which carried the exception `light:aurora ≥ 2.5`).

| | ring token | gap token | contrast (WCAG) |
|---|---|---|---|
| light Aurora BEFORE | `--outline-action-default` = primary-600 = **#3050BD** | `--surface-select-row-gap` = **#57A4E6** (Damir's, held) | **2.61 : 1** |
| light Aurora AFTER | **#2B47A9** (hue 226.7° vs 226.4°, S 59 %, L 46.5 → 41.6 %) | #57A4E6 | **3.05 : 1** |
| dark Aurora (unchanged) | primary-400 **#769DFF** | **#1A2E68** | **4.92 : 1** (already passes) |

The ring has its OWN token since the lead's fix (the first version re-pointed the global `--outline-action-default` in the Aurora block, which also moved the reaction outline, the nick field border and the media focus, and the I-2 r2 #358 smoke row read it as a dark value): `--outline-select-ring: var(--outline-action-default)` in the light root and the dark block, `--outline-select-ring: #2B47A9` in the light Aurora ground block ONLY (`src/styles/tokens.css`); the A2 ring in `chat.html` (`chat-jump-ring` + the reduced-motion static rule) paints with it. The global `--outline-action-default` is unchanged everywhere; no other user of it moves (reaction outline, nick field, media focus keep primary-600 / primary-400).

The six moment defaults of #1343 are not touched (four holding files are hash-pinned in `g-aurora-ring`).

## Item 4 — the payment confirm and the mini-app confirms on Windows (after item 3)
- **Path today.** `SPayments.confirmAndAuth` (`Spixi/Utils/SPayments.cs:577`) shows the send confirm through
  `page.displaySpixiAlert(title, body, confirm, cancel)` (`:590`, a plain alert: `nativeConfirm` false) → MAUI
  `DisplayAlert` on the root page → on WinUI a `ContentDialog` with the confirm text as the PRIMARY button and no
  `DefaultButton`: the dialog focuses the primary and Enter presses it (the fixb1 mechanism, `docs/fixb1-mechanisms.md`
  § Item 1). On WinUI the auth step is skipped (`:610`, the app-lock rule), so Enter alone sends. The three mini-app
  confirmations (`Spixi/Pages/MiniApps/MiniAppPage.xaml.cs:293`, `:310`, `:334`) are the same plain alert.
- **Fix.** The same dialog code as item 3 (`SConfirm.showSafeDefaultConfirm`), per call site behind its own switch;
  the trace of each mini-app confirm is in packet P61.

## Notes on the other items
- **Item 1 (unread pill).** `docs/fixb1-mechanisms.md` § Item 3: the strip is a `#messages` child pulled over the 760
  column by a negative inline margin (`src/shells/chat.html:327`); with the gutter on both edges it stops one gutter short
  on each side. #1629 / #1639 remove the bar: a centred pill cannot miss an edge. The both-edges gutter stays (measured:
  pill centre = composer centre 0.00 px; end-only gutter = half a scroll bar off).
- **Item 6 (tx rows).** `src/styles/components/txlist-item.css` had only the desktop padding rule and no inset rule,
  although its comment (`:18`) says the two lists must not drift; DT-1 A (#1393) gave the chat rows margin-inline 8 px,
  margin-block 1 px and radius-12 (`chatlist-item.css:298-307`).
- **Item 7 (Aurora ring).** The ring is the A2 jumped-to row highlight (`chat.html` `chat-jump-ring`): 1 px of
  `--surface-select-row-gap` then 1 px of `--outline-action-default`; on light Aurora #3050BD on #57A4E6 = 2.61 : 1
  (#1345). A scoped token value in the light Aurora block lifts it to 3.05 : 1; dark Aurora is 4.92 : 1 already.
