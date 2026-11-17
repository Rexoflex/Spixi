# Agent contract — fixb2 (Fix batch 2: the walk findings of Fix batch 1 and the desktop polish that waited)

Written by the lead (Claude Opus, by Damir's ruling #1640) BEFORE any agent starts. Prompt: the project doc
`claude/session-fixb2-prompt.md` (its ★ rules hold; #1640 changes only the lead and the builder of item 4). Every agent
gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/fixb2` @ `06a4845d` ("Merge pull request #13 from Rexoflex/work/coldstart1") · baseline: `BASELINE OK
  6522 / the 2 KNOWN (#136 · B3)` (re-measured by the lead, `TZ=America/Los_Angeles`, L214) · CSH 622 (observed) ·
  tools: Node 22.23.4 · jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp
  0.23.5 (L160) · .NET SDK 10.0.115 · Ixian-Core @ `097341a` · Chromium: Playwright at
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`, browsers in `/opt/pw-browsers`.
- Must hold for everyone: the PARAMOUNT isolation invariant · ★ C# touches no risky parts · the frozen bridge (no new
  verb, no new push, no new `spixi.*` storage key, no new network fetch, no new log line with user data) · #1312 /
  #1478 (a change behind a switch keeps its OWN switch, the old path = the fallback) · edit `src/`, never
  `Spixi/Resources/Raw/html` by hand (the pipeline writes it; bundle BEFORE shells) · no commit, no push, no full
  smoke, nothing in Ixian-Core · no new or changed string (stop and ask if you think you need one) · conservative CSS
  · tokens are the source of truth · DECISIONS rows, packets, gate rows and the export docs are the LEAD's.
- **Hashed pins (#1634, #1596):** a file that a pin holds whole by SHA-256 (the seven of #1653: `SConfirm.cs`,
  `FixB1Rules.cs`, `SafetyRules.cs`, `ConfirmGate.cs`, `S16PassRules.cs`, `SpixiFlags.cs`, `HomePage.xaml`) is
  re-based by the agent that edits it: look at your diff, change only the hash constant, and add one line to the
  pin's header comment "re-based by fixb2 item <n> (<what changed>)". Name each re-base in your report.
- Not touched by anyone: `Spixi/Platforms/Android/MainActivity.cs`, `MainApplication.cs`, `Spixi/App.xaml.cs`,
  `Spixi/Utils/SDevSeed*.cs`, `scripts/device/**`, `scripts/pins-filewalk/**`, `scripts/pins-perfb1toggle/**`,
  `Spixi/Spixi.csproj`, `Spixi/Meta/**`, `.github/**`, `Spixi/Pages/Dev/**`, `src/shells/dev.html` (#1635 (3): no
  Developer-screen rows), every payment path other than the one confirm call.
- **Wait rule (L153):** the lead's baseline smoke runs at the start. Before you run ANY `node` or `dotnet` command,
  wait until the file `/home/claude/logs/smoke-base.done` exists (`test -f`, `sleep 60` between checks). Reading,
  web research and editing files are allowed at once.
- Work copies are git worktrees of `work/fixb2` (shared `node_modules` by symlink; `../Ixian-Core` resolves). Run a
  pin as `node scripts/run-pins.mjs --root <your copy> pins-fixb2/<mod>` from your copy.

## 2 · Items and ownership (file scopes are disjoint at the same time)
| Item | Agent | Model (effort high) | Owns | Owes (each pin with one deliberate break, #802) | Copy |
|---|---|---|---|---|---|
| 3 · confirm focus (mechanism first) | builder-a | opus | `Spixi/Utils/SConfirm.cs` (the `#if WINDOWS` dialog code only) · NEW `Spixi/Utils/FixB2Rules.cs` (create it; your code between `// ── item 3 ──` markers) · `scripts/csh/csh.csproj` (add `FixB2Rules.cs`) · NEW `scripts/csh/FixB2ConfirmTests.cs` · NEW `scripts/pins-fixb2/a-confirm-focus.mjs` · re-base `scripts/pins-fixb1/a-confirm.mjs` (FILE hash and any key your edit moves) | the mechanism section FIRST, in `/home/claude/work/a/_mechanism.md`, before any code edit; a-confirm-focus: at open the Cancel (Close) button gets the keyboard focus, never the primary; the accent of the default button is applied; a failed focus step leaves the dialog as today (Enter does nothing) and never focuses OK; `confirmIsOk` unchanged; switch OFF = today's call byte for byte | `/home/claude/work/a` |
| 2 · divider line + reset width (mechanism first) | builder-b | opus | `Spixi/Pages/Home/HomePage.xaml` (the `paneDividerLine` element) · `Spixi/Pages/Home/HomePage.xaml.cs` (the divider code and the reset-width constant only) · NEW `scripts/pins-fixb2/b-divider.mjs` · NEW `scripts/pins-fixb2/b-hairline-sweep.mjs` (Chromium, by hand) · re-base `scripts/pins-fixb1/d-divider.mjs` (XAML hash, the margin key) and any pin that holds `leftPaneDefaultWidth = 400` | the mechanism FIRST in `/home/claude/work/b/_mechanism.md`: MEASURE the hairline (the built home shell in Chromium at the desktop size, device scale 1 and 1.5: which element paints it, its x relative to the WebView's trailing edge, its width) and the grip's column edge; then the line covers it exactly; the reset width dial = today's value + 40 px (name both); Windows + Mac; switch `DividerHoverLine` OFF = no line, as today | `/home/claude/work/b` |
| 1 · unread pill · 6 · tx row inset · 8 (Mac) | builder-c | sonnet | `src/shells/chat.html` · `src/styles/components/typed-bubbles.css` · `src/components/typed-bubbles.js` · `src/styles/components/txlist-item.css` · the built html (by the pipeline, in your copy only) · NEW `scripts/pins-fixb2/c-unread-pill.mjs`, `c-unread-pill-sweep.mjs` (Chromium, by hand), `f-txrow.mjs` · re-base `scripts/pins-fixb1/c-unread.mjs`, `c-unread-sweep.mjs` and the inline smoke rows in `scripts/smoke-test.mjs` that assert the full-bleed strip (smallest change, each named) | c-unread-pill: on phone AND desktop the marker is a centred pill with the date pill's radius, type and token family; no full-bleed rule left; c-unread-pill-sweep: built chat shell, desktop with a classic scroll bar AND phone 412 × 915, long + short chat, both themes: pill centre == date-pill centre (±1 px), both edges free; decide with a render whether the both-edges gutter of fixb1 stays (it keeps the column centred) and say why; f-txrow: the desktop tx row's side margin, block margin and radius EQUAL the chat row's (read both rules, not a list of your own); phone rows stay full width; renders before / after | `/home/claude/work/c` |
| 5 · address sheet height (mechanism first) · 7 · Aurora ring | builder-e | sonnet | the CSS / JS of the centred desktop sheets (expected `src/styles/components/settings-shell.css` and the sheet component that opens "Your Ixian address"; name the files in `_mechanism.md` before editing) · `src/styles/tokens.css` (the Aurora ring token only) · the built html (pipeline, your copy only) · NEW `scripts/pins-fixb2/e-sheet-height.mjs`, `g-aurora-ring.mjs` · re-base the pins that hold the old values (each named) | the mechanism of item 5 FIRST in `/home/claude/work/e/_mechanism.md` (the max-height and the margins of the centred sheet; which other centred sheets share the rule; fix the rule once); e-sheet-height: in a small desktop window (smallest supported height) the sheet uses the free height before it scrolls, in a large window its box is today's; g-aurora-ring: read `m005` / #1345 for the exact ring, compute WCAG contrast of the ring against its ground ≥ 3 : 1 (both themes where the ring shows), the moment defaults of #1343 unchanged; renders before / after | `/home/claude/work/e` |
| 4 · payment + mini-app confirm on Windows | builder-d | **fable** (#1640) | starts AFTER builder-a, from the lead's merged tree. `Spixi/Utils/SPayments.cs` (the confirm call in `confirmAndAuth` only) · `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs` (the three confirm calls only) · `Spixi/Utils/SpixiFlags.cs` (the two switches + one `[FLAGS]` line) · `Spixi/Utils/SConfirm.cs` (ONE new Windows entry, below) · `Spixi/Utils/FixB2Rules.cs` (between `// ── item 4 ──` markers) · NEW `scripts/csh/FixB2PayTests.cs` · NEW `scripts/pins-fixb2/d-pay-confirm.mjs` · re-base `pins-fixb1/a-confirm.mjs`, `g-sparekeep.mjs`, `pins-perfb1/f-flags.mjs` and any pin `pin-sweep --working` names for these files | re-find every line; trace each mini-app confirm to what it approves (for the packet); d-pay-confirm + csh: the rules of § 3; switch OFF = today's call byte for byte per call site; nothing signed, sent or bridged changes | `/home/claude/work/d` |

Integration of the pins into `scripts/smoke-test.mjs` (ONE block for `pins-fixb2`) is the LEAD's. The Chromium sweeps
are not in the smoke.

## 3 · Interfaces between items
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| `SConfirm.showSafeDefaultConfirm(title, text, ok, cancel)` | `#if WINDOWS`, `private static Task<bool>`; true ONLY for `ContentDialogResult.Primary` (`FixB1Rules.confirmIsOk`); a fault = the caller's Cancel; Cancel = the Close button = `DefaultButton`. Item 3 adds the focus / accent step INSIDE it (no new parameter, no change of the result rule) | builder-a | `askAsync` (Windows, `ConfirmSafeDefault`) and item 4's entry |
| Item 3's switch | NONE new: the focus step is a part of the `ConfirmSafeDefault` arm (OFF = today's MAUI call, byte for byte). The prompt allows exactly two new switches (item 4) | — | — |
| `SConfirm.askPlainSafeWinAsync(string title, string text, string ok, string cancel)` (name final by builder-d) | NEW, `#if WINDOWS`, `internal static Task<bool>`: the same alert accounting as `displaySpixiAlert` for a plain alert today (with `SpixiFlags.NativeConfirm`: `tryNoteAlertOpened()` → 0 = a confirm is up → false, logged; `noteAlertClosed` in `finally`), then `showSafeDefaultConfirm`; a throw, a null task, Esc, a closed dialog, a second dialog → false. No 600 ms rule, no lock check (the prompt allows only the shown dialog to change) unless builder-d shows that today's path has them | builder-d | SPayments, MiniAppPage |
| `SpixiFlags.PayConfirmSafeDefault` | `public static bool { get; private set; } = true;` key `flagPayConfirmSafeDefault` (int pref, absent = 1), `S16PassRules.effectiveFlag(dev, v)`; read only by `#if WINDOWS` code | builder-d | SPayments.confirmAndAuth |
| `SpixiFlags.MiniAppConfirmSafeDefault` | same shape, key `flagMiniAppConfirmSafeDefault` (absent = 1) | builder-d | MiniAppPage (the three calls) |
| `[FLAGS]` line | ONE new fixed line from `FixB2Rules.flagsLine(pay, app)` = `[FLAGS] payconfirmdefault=<0|1> appconfirmdefault=<0|1>`, logged in `SpixiFlags.init` after the fixb1 line; the perfb1 and fixb1 lines unchanged | builder-d | the log, the BUILD rows |
| `FixB2Rules` (pure, no MAUI) | `public static class FixB2Rules` in `Spixi/Utils/FixB2Rules.cs`; each item's members between its markers; compiled by csh | builder-a creates, builder-d adds | csh tests |
| The unread pill | class names chosen by builder-c, named in its report: the marker keeps `.c-unread-divider` (the JS and the bridge-side tests find it by it) and takes the date pill's radius / type / token family | builder-c | — |
| The divider line | `paneDividerLine` keeps its name, `WidthRequest="2"`, `InputTransparent="True"`; only its position changes (measured) | builder-b | — |

## 4 · What each agent returns
- The list of files it CHANGED or ADDED (the lead copies back only these) and its `_mechanism.md` (items 2, 3, 5).
- Per pin: the command, the green line, the break (a one-token mutation in a full copy, #802), the red line with the
  failing key, then restored.
- C# builders: `node scripts/run-csh.mjs` in the copy → `CSH pass=<n> fail=0` and the new test names; `node
  scripts/cs-syntax-check.mjs` green; every re-based pin with its old and new value.
- Shell builders: the pipeline (bundle BEFORE shells), both `--check` gates green, renders of the BUILT shells (before
  and after, light and dark, a desktop size and 412 × 915) as PNG in `<copy>/_renders/` with a list of the names.
  Demo data only: no real name or address in a picture.
- What it could not prove (⚠ C# UNCOMPILED, not rendered, not measured on a device) and anything seen outside its
  scope (a note, not a fix).

## 5 · Integration order and checks (the lead)
1. builder-a, builder-b, builder-c, builder-e in parallel → copy back the changed files → builder-d from that tree.
2. The FULL pipeline (bundle BEFORE shells) → the `--check` gates and the G2 checks → the `pins-fixb2` block in
   `scripts/smoke-test.mjs` → grep the smoke for the tokens of every edited line (L84).
3. The full smoke (one at a time, nothing beside it, L153) + CSH → the #46 loop: the security-only pass over items 3
   and 4 and `SPayments.cs` by fresh read-only Fable 5.2 readers; the other readers fresh read-only Opus (#1606,
   #1640); builder-d never reviews item 4 → CLEAN → the export → merge the newest base (no rebase) → ONE push (#1546).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
