# Agent contract — fixb1 (Fix batch 1: seven small fixes before the launch)

Written by the lead (Claude Opus, by #1612) BEFORE any agent starts. Prompt: the project doc
`claude/session-fixb1-prompt.md`. Mechanisms: `docs/fixb1-mechanisms.md` (read it first). Every agent gets this file
plus its own row. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/fixb1` @ "Merge pull request #9 from Rexoflex/work/perfb1toggle" (`efcde241`) · baseline: `BASELINE OK
  6463 / the 2 KNOWN (#136 · B3)` (to be re-measured by the lead) · CSH 600 · tools: jsdom 29.1.1 · eslint 10.14.0 ·
  globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160) · .NET SDK 10.0.115.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new
  verb, no new push, no new cap) · #1312 / #1478 (a C# change keeps its OWN switch, the old path = the fallback) · the
  security handover gate triggers (a new log line or preference = a gate row, written by the lead) · edit `src/`,
  never `Spixi/Resources/Raw/html` by hand · no commit, no push, no full smoke, nothing in Ixian-Core · no changed or new
  string (a string runs `extract-strings` + `build-locales`; this batch needs none — stop and ask if you think it does)
  · conservative CSS · DECISIONS rows, packets, gate rows and the export docs are the LEAD's (do not write them).
- Not touched by anyone: `Spixi/Platforms/Android/MainActivity.cs`, `scripts/device/**`, `Spixi/Utils/SDevSeed*.cs`,
  `Spixi/Spixi.csproj`, `.github/**`, `scripts/pins-perfb1toggle/**`, `scripts/pins-perfb1/e-image-seed.mjs`,
  `Spixi/Pages/Dev/**`, `src/shells/dev.html`, `docs/walk-perfb1.md`. The pins of `perfb1toggle` hold the bodies of
  `OnCreate` / `OnNewIntent` / `handleNotificationIntent` and both walk scripts by SHA-256.
- **Wait rule (L153):** the lead's baseline smoke runs at the start. Before you run ANY `node` or `dotnet` command,
  wait until the file `/home/claude/logs/smoke-base.done` exists (`test -f`, `sleep 60` between checks). Reading and
  editing files is allowed at once.

## 2 · Items and ownership (file scopes are disjoint)
| Items | Agent | Model (effort high) | Owns (files / folders) | Owes (pins + one deliberate break each) | Work copy |
|---|---|---|---|---|---|
| 1 · 4 · 7 (all C#) | builder-a | opus | `Spixi/Utils/SConfirm.cs` · `Spixi/Utils/SpixiFlags.cs` · `Spixi/Utils/PerfB1Rules.cs` · NEW `Spixi/Utils/FixB1Rules.cs` · `Spixi/Pages/Home/HomePage.xaml` · `Spixi/Pages/Home/HomePage.xaml.cs` (the divider code only: the field block near :217, the D1 block :314-365, `onPaneDividerPan`, the two `paneDivider.IsVisible` sites) · `scripts/csh/csh.csproj` · NEW `scripts/csh/FixB1Tests.cs` · `scripts/csh/PerfB1FlagsTests.cs` · NEW `scripts/pins-fixb1/a-confirm.mjs`, `d-divider.mjs`, `g-sparekeep.mjs` · re-base only where a pin counts what this batch adds (#1596: smallest change, name the new site and the new pin module, keep the first failure): `scripts/pins-perfb1/c-spare-keep.mjs`, `f-flags.mjs`, `scripts/pins-s16/b-l8.mjs` and any other pin `pin-sweep --working` names for your files | a-confirm: the Windows branch (DefaultButton = Close, Close = Cancel, OK only for Primary through `FixB1Rules`), switch off = today's call byte for byte, no change outside `#if WINDOWS`; d-divider: the line element, the hover / drag wiring through `FixB1Rules`, Windows + Mac only, switch off = no line; g-sparekeep: absent = ON, `S16PassRules.effectiveFlag`, the `[FLAGS]` line; harness tests (below) | `/home/claude/work/a` |
| 2 (Android resources) | builder-b | sonnet | `Spixi/Platforms/Android/Resources/values/colors.xml` · `values/styles.xml` (the `SpixiAlertDialog` style only) · NEW `values-night/colors.xml` · NEW `scripts/pins-fixb1/b-dialog-colors.mjs` | b-dialog-colors: reads the resource values (not a list of your own), resolves the dialog accent for day and night, checks WCAG contrast ≥ 4.5 : 1 against the AppCompat alert surfaces (light `#FFFFFF`, dark `#424242` — `background_floating_material_light/dark`; say in the pin that these are the library's values, not ours), and that `SpixiAlertDialog` takes its accent from the resource on BOTH attribute spellings it sets | `/home/claude/work/b` |
| 3 · 5 · 6 (shells) + the built output | builder-c | sonnet | `src/**` (expected: `src/shells/chat.html`, `src/styles/base.css`, `src/components/settings-shell.js`, `src/styles/components/settings-shell.css` if a header rule dies, maybe `src/shells/settings.html`) · `Spixi/Resources/Raw/html/**` (ONLY by the pipeline) · NEW `scripts/pins-fixb1/c-unread.mjs` (smoke source pin), `scripts/pins-fixb1/c-unread-sweep.mjs` (Chromium, run by hand like `scripts/pins-s20h/a-sweep.mjs`), `e-header.mjs`, `f-scrollbar.mjs` · re-base the existing pins that assert the old Account header (the #1007 / #1091 / #1028 header controls) — the smallest change, each named in your report | c-unread-sweep: Playwright Chromium (`PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`), the BUILT chat shell, desktop, a classic scroll bar: the strip's left inset == right inset (±1 px) with a scroll bar and without one, both themes, and the date pill's centre == the strip's centre; e-header: the header has no address, Copy, QR or caption on phone and desktop, and the "My address" row → the sheet holds the QR code, the full address, a Copy control and the "What is this" explainer (walk each path); f-scrollbar: (changed after builder-c's measurement, see `docs/fixb1-mechanisms.md` § Item 6) the drawn indicator `.c-scrollind` uses the outline family in both themes, no icon ink, thumb ≠ track ≥ 1.2 : 1 per theme; `base.css` unchanged | `/home/claude/work/c` |

Integration of the pins into `scripts/smoke-test.mjs` (ONE block for `pins-fixb1`) is the LEAD's. The Chromium sweep is
not in the smoke.

## 3 · Interfaces between items
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| `SpixiFlags.ConfirmSafeDefault` | `public static bool { get; private set; } = true;` key `flagConfirmSafeDefault` (int pref, absent = 1), `S16PassRules.effectiveFlag(dev, v)`; only `#if WINDOWS` code reads it | builder-a | `SConfirm.askAsync` |
| `SpixiFlags.DividerHoverLine` | same shape, key `flagDividerHoverLine` (absent = 1); read by the Windows + Mac divider code only | builder-a | `HomePage` |
| `[FLAGS]` line | ONE new fixed line from `FixB1Rules.flagsLine(confirmDefault, dividerLine)` = `[FLAGS] confirmdefault=<0|1> dividerline=<0|1>` (fixed words, 0/1 only), logged in `SpixiFlags.init` after the perfb1 line. The perfb1 line and its words are NOT changed (the adb walk parses it) | builder-a | the log |
| `SpixiFlags.SpareKeepShortSleep` | absent = 1 (ON), `S16PassRules.effectiveFlag(dev, pk)`; the property's start value before `init` stays `false` (the old path until the read); `leaveDevMode()` keeps turning it OFF in this process (fail to the old path); `PerfB1Rules.effectiveOptIn` is removed if nothing else calls it | builder-a | `App.OnSleep`, `SpixiContentPage` (unchanged) |
| `FixB1Rules` (pure, no MAUI, compiled by csh) | `flagsLine(bool, bool)` · `confirmIsOk(int contentDialogResult)` → true ONLY for 1 (Primary); 0 (None: Esc, closed) and 2 (Secondary) → false · `DividerLine` state: `hoverEnter()`, `hoverExit()`, `dragStart()`, `dragEnd()` (ends the hover too — a later pointer move or enter shows it again), `bool visible` = hover OR drag | builder-a | SConfirm, HomePage, csh tests |
| The divider line | a `BoxView` `paneDividerLine` in `HomePage.xaml`, Grid.Column 0, `WidthRequest="2"`, `HorizontalOptions="End"`, `Margin="0,0,4,0"` (centred in the 10 px grip), `InputTransparent="True"`, `IsVisible="False"`, declared BEFORE `paneDivider` (under the grip, above the WebView, before any overlay stage). Colour: the accent of the active theme at the moment it shows (`ThemeManager.getResolvedAppearanceName()`: light → `#3050BD` brand-600, dark → `#769DFF` brand-400 — the lead's provisional pick; Damir judges at the walk). Hidden whenever `paneDivider` is hidden | builder-a | — |
| Dials of item 4 (main chat, 🟡) | 2 px wide, in the middle of the 10 px area, the accent of the active theme, shows at once on hover, stays for the whole drag, leaves when the pointer leaves or the drag ends | main chat | builder-a |

## 4 · What each agent returns
- The list of files it CHANGED or ADDED (the lead copies back only these).
- Per pin: the command (`node scripts/run-pins.mjs --root <work copy> pins-fixb1/<mod>`), the green line, the break it
  made (a one-token mutation in a full copy, #802), the red line with the failing key, then restored.
- builder-a: `node scripts/run-csh.mjs` in its copy → `CSH pass=<n> fail=0` and the list of new test names; the
  re-based pins with their old and new text.
- builder-c: the pipeline it ran (bundle BEFORE shells), both `--check` gates green, and render PNGs of the BUILT shells
  (before and after, both themes) for items 3, 5 and 6 in `/home/claude/work/c/_renders/`.
- What it could not prove (⚠ C# UNCOMPILED, not rendered, not measured on a device).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (bundle BEFORE shells) → the `--check` gates and the
   other G2 checks.
2. The `pins-fixb1` block in `scripts/smoke-test.mjs`; grep the smoke for the tokens of every edited line (L84).
3. The full smoke (one at a time, nothing beside it, L153) + CSH → the #46 loop with the security-only pass until CLEAN
   (readers by #1606: Fable 5.2 for the security-only pass and for `Spixi/Utils/SConfirm.cs`, Opus for the rest) →
   the export → commits, ONE push of `work/fixb1` (#1546).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
