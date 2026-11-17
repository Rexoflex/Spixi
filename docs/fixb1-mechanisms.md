# Fix batch 1 — the mechanisms, written before the fix (#294)

Session `fixb1`, 2026-11-16, read on `redesign/frontend` @ `efcde241`. One section per item that the prompt marks
"mechanism first" (items 1, 3, 4, 6). Each says what the tree does today, how sure the reading is, and what the fix
changes. Items 2, 5 and 7 have a short note at the end.

## Item 1 — Windows: Enter confirms the destructive system dialog (WALK #1540 SW-S5-ENTER = F)

- **Path today.** `SConfirm.askAsync` (`Spixi/Utils/SConfirm.cs:47`) → `page.displaySpixiAlert(title, text, ok, cancel,
  nativeConfirm: true)` (`Spixi/Utils/SpixiContentPage.cs:6661`) → the root page's MAUI `DisplayAlert`
  (`SpixiContentPage.cs:6684`). On Windows MAUI shows a WinUI `ContentDialog`: the accept text is the PRIMARY button,
  the cancel text is the SECONDARY button, and MAUI sets no `DefaultButton` (its default is `None`). With no default
  button, the dialog gives focus to its first button — the primary (destructive) one — and Enter presses the focused
  button. So Enter = OK = the destructive verb. The only guard was `SafetyRules.MinConfirmMs` (600 ms,
  `SafetyRules.cs:235`): an OK faster than that becomes Cancel; a slower Enter goes through.
- **How sure.** The MAUI Windows alert code was not fetched in this session (the fetch needed an approval nobody could
  give); the reading is from the MAUI source as known and from the WinUI docs of `ContentDialog.DefaultButton`
  ("the default is None"; the default button responds to Enter and gets the focus at open). The walk fail
  (Enter ran the verb) agrees with it. Recorded before as Session Safety #46 r1 MINOR-4.
- **Rejected fix: swap the two texts in `DisplayAlert`** (Cancel as the primary). MAUI returns only `true` for the
  primary and `false` for everything else, so Esc and a closed dialog (`ContentDialogResult.None`) would read as
  "not Cancel" = OK. That turns a dismiss into a confirm — the opposite of fail-closed.
- **Fix.** On Windows only, behind its own switch, `SConfirm` shows its own `ContentDialog`: the OK text is the
  primary button, the Cancel text is the CLOSE button, and `DefaultButton = Close`. The Cancel button gets the focus and
  the accent at open, Enter on it cancels, Esc closes = cancel, and only `ContentDialogResult.Primary` counts as OK
  (a pure rule in the harness). A user who tabs to OK and presses Enter still presses OK (a focused button handles
  Enter itself). The gate, the lock checks, the 600 ms rule and the log line stay as they are. Switch off = today's
  `displaySpixiAlert` call, byte for byte. iPhone, Mac and Android: not touched (`#if WINDOWS`).
- **Known limit of the fix.** The new dialog is outside MAUI's own alert queue. A MAUI alert that opens while the
  confirm is up makes WinUI throw ("only one ContentDialog at a time"). Every Spixi alert goes through
  `displaySpixiAlert`, which DROPS other alerts while a confirm is up (`SConfirm.tryNoteAlertOpened`); the direct
  `DisplayAlert` calls left in the tree are on the backup page (a user flow on another page; the confirm dialog is
  modal) and on the Safety-flag-off path of the chat page. A confirm that opens while a MAUI alert is up throws in
  `ShowAsync`; `askAsync` catches it and answers Cancel (fail closed).

## Item 3 — Desktop: the "Unread messages" strip stops short of the right edge

- **Path today.** The log is `#messages.messages.u-scroll` (`src/shells/chat.html:650`). On a pointer device
  `base.css .u-scroll` gives it `scrollbar-width: thin` and `scrollbar-gutter: stable` (`src/styles/base.css:186-194`):
  WebView2 draws a CLASSIC thin scroll bar and the gutter is reserved on the END edge only — with a scroll bar and
  without one. The strip (`.c-unread-divider`, `src/styles/components/typed-bubbles.css:418`) pulls itself over the
  760-column padding with `margin-inline: calc(-1 * max(0px, (100vw - 760px) / 2))` (`chat.html:325`). That makes it
  run from the pane's left edge to the LEFT edge of the gutter: it is cut by one gutter width on the right only. The
  date pills and the bubbles are centred in the same box, so the whole column sits half a gutter left of the pane's
  centre. The comment at `chat.html:321` already says so ("the strip runs from the pane edge to the scrollbar edge");
  the gutter is wider than the "6px" it names — `scrollbar-width: thin` wins over `::-webkit-scrollbar { width: 6px }`
  in Chromium 121+, and the thin classic bar grows with the display scale. Damir measured about 20 px.
- **How sure.** From the CSS; to be measured by the Chromium pin with a classic scroll bar (Linux headless Chrome
  draws classic bars, like WebView2).
- **Fix.** On the desktop, the log reserves the gutter on BOTH edges (`scrollbar-gutter: stable both-edges`). The strip
  then has the same inset (one gutter) on the left and the right, with and without a scroll bar, and the strip, the date
  pills, the bubbles and the composer share one centre (the pane's). On a Mac with overlay scroll bars the gutter is
  0 and the strip goes edge to edge, as today. Phones: not touched.

## Item 4 — Desktop: no hover state on the divider of the chat list

- **Path today.** The divider is a NATIVE element: the `BoxView` `paneDivider` (`Spixi/Pages/Home/HomePage.xaml:27`,
  10 px wide, `Color` and `BackgroundColor` Transparent) on the trailing edge of column 0, above the home WebView. The
  visible hairline is painted by the home shell inside its WebView, under the grip. The grip has a pan (drag) and a
  double tap (reset) (`HomePage.xaml.cs:317-328`), the ↔ cursor on Windows (`:336-355`, `ProtectedCursor` by
  reflection) and on the Mac (`:359-364`, `SMacCursor`). Nothing changes its colour: there is no hover state anywhere,
  and the home WebView cannot see the pointer over the grip (the grip is on top of it).
- **How sure.** From the code; certain.
- **Fix.** Native, behind its own switch: a second `BoxView` (`paneDividerLine`, 2 px, in the middle of the 10 px grip,
  input-transparent, below the grip) that shows in the accent colour of the active theme while the pointer is on the
  grip and for the whole drag, and hides when the pointer leaves or the drag ends. The state rule (idle / hover / drag)
  is pure and runs in the harness. Windows and Mac; phones never show the divider.

## Item 6 — Android: the scroll bar of the language sheet has the colour of the other theme

- **Path today.** The language list (and every long option sheet, `src/components/settings-shell.js:283-296`) HIDES its
  native bar (`.c-settings__opts--scroll { scrollbar-width: none }`, `src/styles/components/settings-shell.css:391-398`,
  #965) and shows a DRAWN indicator, `.c-scrollind` (`attachScrollIndicator`, `settings-shell.js:306`): a 4 px track
  `--surface-neutral-03` and a thumb `--icon-neutral-02` (drag: `--icon-neutral-01`). An ICON ink is dark in the light
  theme (`neutral-490`) and light in the dark theme (`neutral-400`) — the reverse of the app's scroll-bar family,
  `--outline-neutral-0x` (#1202 / #1134: "the light chat thumb looked like dark mode"). That is Damir's finding. The
  tokens re-point under `data-theme`, so the colour already follows a live theme change; it was the wrong family.
- **How sure.** From the CSS and the shell; certain for the language sheet (it shows no native bar). The FIRST reading
  of this doc (the native Android overlay thumb, no `color-scheme` declared) was wrong for this sheet: builder-c measured
  the sheet and found the hidden native bar and the drawn indicator. The root `scrollbar-color` rule of that first
  reading was built and then DROPPED (it changed every native thumb, unmeasured, and made the composer's dark thumb
  1.02 : 1). The native overlay bars of other lists are NOT changed by this batch.
- **Fix (🟡 dial, #1648).** The indicator takes the outline family: track `--outline-neutral-01`, thumb
  `--outline-neutral-03` (dark: `--outline-neutral-04`, because the sheet re-points the track to `neutral-700` and
  `-03` gave 1.13 : 1), drag `--outline-neutral-04`. Contrast thumb : track 1.37 (light) and 1.33 (dark). Damir judges
  the look at the walk.

## Notes on the other items
- **Item 2 (Android dark dialog buttons).** `SpixiAlertDialog` (`Spixi/Platforms/Android/Resources/values/styles.xml`)
  has the DayNight parent (the surface follows the OS mode) but ONE `colorAccent` `#3050BD` (brand-600, AND-14 #334)
  for both modes. The AppCompat dialog buttons take `colorAccent`; on the dark dialog surface (`#424242`) `#3050BD`
  has a contrast of about 1.4 : 1. Fix: the accent is a colour resource with a night value (`values-night/colors.xml`).
  The surface and the button colour come from the same configuration (the OS mode), so they always agree.
- **Item 5 (Account header).** The header (`src/components/settings-shell.js:807-904`) carries the short address,
  Copy, QR and the "Your Ixian address · What is this?" caption; the "My address" row (`:1043-1058`) opens
  `openAddressSheet`, which holds the code, the full address, Copy, Share and the explainer. So each control of the
  header has another way in, and the header can drop them (the builder checks the sheet's own controls).
- **Item 7 (`sparekeep` ON by default).** `SpixiFlags.SpareKeepShortSleep` reads its preference with absent = 0 and
  `PerfB1Rules.effectiveOptIn` (stored 1 AND dev mode). ON by default = the rule of the other three switches
  (`S16PassRules.effectiveFlag`: absent = ON, a stored 0 turns it off only in dev mode). The keep conditions (Android,
  app lock off, no lock up) live in `SpareKeepRules` / `App.OnSleep` and do not change.
