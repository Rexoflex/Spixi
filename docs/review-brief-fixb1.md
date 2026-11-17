# Review brief — fixb1: seven small fixes before the launch (#1645–#1654)

File name: `docs/review-brief-fixb1.md`. Work order for the #46 loop of Session "Fix batch 1" (2026-11-16). Written
BEFORE round 1. Readers by #1606 (Damir, quoted in the prompt): the readers of the **security-only pass** and the reader
of the riskiest file, **`Spixi/Utils/SConfirm.cs`**, are fresh read-only **Claude Fable 5.2** instances; every other
reader is a fresh read-only **Opus** instance. All at high effort. No fallback below the named model: a declined round
stops the batch. Round 1: two Fable readers (S-confirm, S-sec), two Opus auditors (O-csharp, O-shells) and one Opus
break-my-verdict reader (B). Every later round: one fresh break-my-verdict reader over the fixes (Fable when a fix
touches C#, an Android resource or a security question; Opus otherwise). Not CLEAN at round 5 → stop. The verdict is
in § 5.

## 1 · What the batch is
Rulings: #1603 (one small fix batch, items 1–5), #1611 (`sparekeep` ON by default, item 7), #1539 (the Account header),
#1541 (the Enter key); items 6 and 7 confirmed by Damir's "Ready" (#1612). Mechanisms: `docs/fixb1-mechanisms.md`.
Contract: `docs/contract-fixb1.md` (§ 3 is the claim to attack).

| Item | What landed | Where (files) | Packet · DECISIONS |
|---|---|---|---|
| 1 · Windows Enter | Behind `SpixiFlags.ConfirmSafeDefault` (ON), Windows only: `SConfirm` shows its own WinUI `ContentDialog` — OK = Primary, Cancel = Close, `DefaultButton = Close`; only `Primary` is OK (`FixB1Rules.confirmIsOk`). Gate, lock checks, 600 ms rule, log lines unchanged. OFF / other platforms = today's call | `Spixi/Utils/SConfirm.cs`, `FixB1Rules.cs` (new), `SpixiFlags.cs` | P50 · #1645 |
| 2 · Android dialog buttons | `SpixiAlertDialog` accent = `@color/spixiDialogAccent` (day `#3050BD`, night `#98B5FC`), both attribute spellings; no switch (a resource) | `Spixi/Platforms/Android/Resources/values/colors.xml`, `values/styles.xml`, `values-night/colors.xml` (new) | P53 · #1645 |
| 3 · Unread strip | Desktop log `scrollbar-gutter: stable both-edges` → equal inset both sides, with and without a bar | `src/shells/chat.html` | — · #1646 |
| 4 · Divider line | Behind `SpixiFlags.DividerHoverLine` (ON), Windows + Mac: a 2 px input-transparent `BoxView` under the grip, shown on hover and for the whole drag (`FixB1Rules.DividerLine`), accent of the resolved theme | `Spixi/Pages/Home/HomePage.xaml`, `HomePage.xaml.cs` | P51 · #1649 |
| 5 · Account header | The header shows the photo and the name only; the address, Copy, QR and the caption are gone; the "My address" row and its sheet keep QR, the full address, Copy and the explainer. Three strings dropped by the full pipeline (`addressWhatIsThis`, `copyFailedOpenQr`, `showQr`) | `src/components/settings-shell.js`, `src/styles/components/settings-shell.css`, `src/strings/*`, `docs/i18n-strings.md` | — · #1647 |
| 6 · Scroll indicator | The drawn indicator of long option sheets (#965) took icon inks; now the outline family (track outline-01, thumb outline-03 / dark outline-04, drag outline-04) — 🟡 dial | `src/styles/components/settings-shell.css` | — · #1648 |
| 7 · sparekeep | `flagSpareKeepShortSleep` absent = ON through `S16PassRules.effectiveFlag`; `effectiveOptIn` removed; P40's keep unchanged | `Spixi/Utils/SpixiFlags.cs`, `PerfB1Rules.cs` | P52 · #1650 |
| log | ONE new line `[FLAGS] confirmdefault=<0\|1> dividerline=<0\|1>` after the perfb1 line | `SpixiFlags.cs:201` | gate section |

Not built, and why: no Developer-screen control for the two new switches (DevPage is not in the batch's file areas;
the bridge is frozen; #1651) · nothing for the iPhone · no change of the native Android overlay scroll bars (the
mechanism of item 6 is the drawn indicator, `docs/fixb1-mechanisms.md`).

## 2 · How to run
- Tree for the readers: `/home/claude/spixi` (branch `work/fixb1`, the working tree; base `redesign/frontend` @
  `efcde241`). The diff: `git -C /home/claude/spixi diff efcde241 -- Spixi scripts src` plus the untracked new files
  (`git -C /home/claude/spixi status --short`). The built html under `Spixi/Resources/Raw/html` is generated: read the
  sources.
- Pipeline: FULL (the three strings) · smoke on the untouched base in this cloud twin (2026-11-16): `BASELINE OK —
  6463 pass / the 2 KNOWN` · CSH 600 → 607 after the batch · Ixian-Core @ `097341a` at `/home/claude/Ixian-Core`.
- A reader READS. It may run pins (`node scripts/run-pins.mjs --root <copy> <dir/mod>`), the harness
  (`node scripts/run-csh.mjs`) and the Chromium sweep in a COPY of the tree under `/home/claude/_review/<its name>/`
  (never in `/home/claude/spixi`), and only while `pgrep -f smoke-test.mjs` prints nothing. It changes no file of the
  tree. ⚠ No MAUI C# compiles in the cloud: read `SConfirm.cs` and `HomePage.xaml(.cs)` as a compiler would (WinUI 3,
  MAUI 10, `#if WINDOWS` / `MACCATALYST`).

## 3 · Auditor scopes
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S-confirm (the riskiest file) | Fable 5.2 | `Spixi/Utils/SConfirm.cs` whole; read around it: `ConfirmGate.cs`, `SafetyRules.cs` (`tooFast`, `confirmLine`), `SpixiContentPage.cs:6655-6765` (`displaySpixiAlert`), the callers of `askAsync` (grep), `FixB1Rules.cs`, `scripts/pins-fixb1/a-confirm.mjs`, `scripts/pins-safety/c-confirm.mjs`, csh `FixB1Tests` | **Security-only.** Can any path on Windows now answer OK without a deliberate press of the OK button (Enter, Esc, Space, a closed or lost window, a theme / DPI change, a second dialog, a throw, a null root, the lock coming up, a stacked MAUI alert, focus moved by script)? Is the gate ever left held or freed early? Does the switch OFF arm and the non-Windows arm equal the base byte for byte? Will it compile (types, `out object?`, the enum cast, `MainPage` obsolete warnings as errors)? |
| S-sec (security-only, the rest) | Fable 5.2 | Everything else in the diff: `SpixiFlags.cs`, `PerfB1Rules.cs`, `FixB1Rules.cs`, `HomePage.xaml(.cs)` (the divider hunks), the Android resources, `settings-shell.js` / `.css`, `chat.html`, the string removal, the new log line | **Security-only.** The handover-gate triggers (verb, `spixi.*` key, WebView setting, HTML sink, fetch, log line): is each new surface recorded and safe? Item 7: `sparekeep` ON for every Android user — does any path keep a spare with the app lock on or up, or hand an unproven spare to a chat; can a user who leaves dev mode end with a state that differs from the claim? Item 5: does the removal open a new way to show the full address at rest, or break the address-help moment's gate? No new HTML sink, no data in the log line |
| O-csharp | Opus | `HomePage.xaml(.cs)` hunks, `SpixiFlags.cs`, `PerfB1Rules.cs`, `FixB1Rules.cs`, csh `FixB1Tests.cs`, `PerfB1FlagsTests.cs`, `PerfB1ExtraTests.cs`, pins `d-divider`, `g-sparekeep`, the re-based `f-flags`, `b-l8`, `c-csharp` | Correctness: the line's state on Windows and Mac (pointer events during a pan, a drag that ends off the grip, a theme change while shown, single ↔ two pane), compile risk, the harness truly runs the rules, each pin key fails when its rule breaks (#802), the re-bases are the smallest (#1596) |
| O-shells | Opus | `src/shells/chat.html`, `src/components/settings-shell.js`, `src/styles/components/settings-shell.css`, the strings change, pins `b-dialog-colors`, `c-unread`, `c-unread-sweep`, `e-header`, `f-scrollbar`, `pins-s17/l-address-card`, the inline smoke re-bases (`git diff efcde241 -- scripts/smoke-test.mjs`) | Behaviour in both themes, phone and desktop; nothing outside the scoped selectors changed; the removed strings have no reader left (C#, shells, demo); the pins fail for their reason; the inline re-bases keep the old pins' meaning where it still holds |
| B (break-my-verdict) | Opus | The whole diff, with no knowledge of the others' findings | Break § 1 and the contract § 3 end to end: one way the batch does something the table says it does not, or fails to do what it says |

Finding classes: **MAJOR** = a destructive verb confirmed without a deliberate OK press, a weakened gate or lock, a
switch that does not restore the old path, a security-gate trigger that is not recorded or not safe, a kept spare
outside P40's conditions, a shell change that breaks a flow, or a pin that is green with its rule broken for a
security rule; **MINOR** = a correctness or hardening gap with a concrete mechanism, or a pin that does not fail when
its rule breaks; **NIT** = wording. Every finding carries `file:line` and the mechanism in THIS tree.

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new verb, push or
  cap) · #1312 / #1478 (each C# change its own switch, OFF = the old path) · L157 (no gate frees itself on a timer) ·
  no name, address or text in a log line · bundle BEFORE shells · the perfb1toggle SHA-256 pins stay green
  (`OnCreate`, `OnNewIntent`, `handleNotificationIntent`, both walk scripts untouched).
- Accepted (do not re-open): Cancel as the default button on Windows (#1541 / the MC item text) · the divider dials
  (2 px, the accent of the active theme, at once, for the whole drag — the main chat's 🟡, Damir judges at the walk) ·
  the header = photo + name only (#1539) · `sparekeep` ON by default (#1611) and P40 as reviewed in
  `docs/review-brief-perfb1.md` · equal inset for the strip (the MC item allows "edge to edge or inset equally") · the
  item 6 colours are a 🟡 dial for the walk · no Developer-screen control for the two new switches in this batch (#1651).

## 5 · Verdict
(open — the rounds follow)

### Round 1 (2026-11-16) — S-confirm and S-sec (Fable 5.2), O-csharp, O-shells and B (Opus), five fresh read-only readers, high effort: 3 MAJOR · 8 MINOR · NITs
Files read (SHA-256, first 16): `SConfirm.cs` `85a12b81de181dc8` · `SpixiFlags.cs` `c05a8f00d369f40f` · `HomePage.xaml.cs`
`441bb69977f73c23` · `settings-shell.js` `1f65d3837cdd190d` · `settings-shell.css` `8eaf7cd156efa245` · `chat.html`
`c15516ca723a1792`. Smoke before the round: `BASELINE OK — 6489 pass / the 2 KNOWN` (= 6463 + 30 new rows − 4 inline
rows folded by the header re-base) · CSH 607. **The code held against every attack of all five readers** (no path on
Windows answers OK without a press of OK; no kept spare outside P40; no new sink, verb, key or fetch; the strip, the
header and the line as claimed). The three MAJOR are PIN gaps on the security rule of item 1.
| Id | Finding (mechanism) | Fix |
|---|---|---|
| S-C-1 (MAJOR, pin) | `a-confirm` did not hold "the answer is ONLY `confirmIsOk`": `tcs.SetResult(true)`, an `Opened +=` or a `KeyDown` handler stayed green | key BODY: the whole body of `showSafeDefaultConfirm` is held as exact normalised text (+ only three helper members); the three breaks are red |
| S-C-2 (MAJOR, pin) | "the gate and the lock are the same on Windows" was compared only inside `askAsync`: a Windows-only `lockUp() => false` stayed green | key WHOLE: the whole Windows view (helper block dropped, the one ternary replaced by the base call) equals the whole non-Windows view; key DIRECTIVES: the directive list is exactly `#if WINDOWS · #else · #endif · #if WINDOWS · #endif` |
| S-C-3 (MAJOR, pin) | `project()` dropped an `#elif` arm, so a change for every other platform was invisible | strict projection: any `#elif`, `#define`, other `#if`, nesting → a sentinel that turns the keys red |
| S-C-4 (MINOR) | an empty Cancel (or OK) text hides that WinUI button; `DefaultButton = Close` then names no button (not reachable with the shipped files) | `SConfirm.cs:122`: an empty OK or Cancel → Cancel before the dialog is built; key EMPTY |
| S-S-1 (MINOR) | the account wipe calls `leaveDevMode` for every user → `sparekeep` OFF until the next start, against "a user without dev mode cannot turn it off" (fails to the old path) | recorded in P52 and the gate row (two callers) |
| S-S-2 (MINOR) | P40's body still says opt-in / `effectiveOptIn`; stale line citations | P40 addendum lists the superseded statements and the moved lines |
| S-S-3 (MINOR, pin) | `e-header` read text and classes only: `hero.title = address` stayed green | a key per form: no attribute value in the header holds the address or its first / last 6 characters |
| B-1 (MINOR) | walk A-BUILD / A-3 could pass on a build without item 7 (a stored 1 from the WALK #1610 sitting) | A-BUILD first removes the stored switches (Developer mode off, then on); A-3 asks for `[CDPERF] chat attach spare=1` / `spare=0` |
| B-2 = O-S-2 (MINOR) | walk A-2 asked other lists to match, but the batch changes only the drawn indicator; the mechanisms doc still gave the dropped root rule | A-2 rewritten; `docs/fixb1-mechanisms.md` § Item 6 rewritten (the drawn indicator; the first reading and the dropped rule recorded) |
| O-S-1 (MINOR) | the dark thumb rule `:root[data-theme="dark"]` out-ranked the drag rule; tied to `:root` only | `[data-theme="dark"] .c-scrollind__thumb`, before the drag rule (equal specificity); `f-scrollbar` re-based, key 3 reads the built track |
| O-C-1 (MINOR, pin) | `d-divider` held z-order only by declaration order: `ZIndex` on the line or the grip stayed green | `xamlLine` / `gripKept`: no `ZIndex`; `onlyWriters`: no code write of `ZIndex` / `InputTransparent`; + `VerticalOptions="Fill"` (O-C-2, O-C-3) |
NITs fixed: S-C-5 (P50: the app stops on a stacked MAUI alert — fail closed; no live path today; `SSystemAlert` noted) ·
S-C-6 (walk W-1 waits 1 s before Enter) · S-S-4 = B-3 = O-S-4 (the strings comment) · S-S-6 (P52: only Android acts;
the gate counts +1 native input) · B-5 / O-C-5 (the opt-in texts in the smoke descriptors, `csh.csproj`, `f-flags`) ·
B-6 (P51: the hidden XAML element exists everywhere) · O-C-4 (`f-flags` re-base made smaller: an optional fixb1 group)
· O-C-6 (`HomePage.xaml.cs:964`: the colour is set at every apply while shown) · O-C-8 (P52: no on-screen control sends
the DevPage verb) · O-S-3 (contract, smoke comment, `f-scrollbar` header) · O-S-5 / O-S-6 (stale smoke comments and a
citation) · O-S-8 (`chat.html` composer comment). **Recorded, not changed:** B-4 (in dark the dragged thumb equals the
idle thumb — inside the 🟡 dial; no lighter outline step) · O-C-7 (`ixian:disableDevMode` does not remove the two new
keys; no in-app writer exists; the six Safety keys behave the same) · S-S-5 / B-5 (the word "opt-in" in comments of
`SpareKeepRules.cs:1`, `SpixiContentPage.cs:2086`, `HomePage.xaml.cs:1909-1910`, `SettingsPage.xaml.cs:1848`,
`c-spare-keep.mjs:1` — files outside this batch's change or bodies held by text pins; wording at their next edit) ·
O-S-7 (`pins-s20i/e-select.mjs:68` probes a class that no longer exists; green, proves nothing — for the next
session that touches it) · B "outside the claim": on Windows the payment confirm (`SPayments.confirmAndAuth`) and the
mini-app confirmations still use MAUI `DisplayAlert`, where Enter presses the primary button — a question for the main
chat (#1652).
Checks after the fixes: the 16 affected pin modules `RESULT pass=102 fail=0` · CSH 607 · `build-shells --check`,
`build-locales --check`, `extract-strings --check` green · `cs-syntax-check` 279 files.

### Round 2 (2026-11-16) — one fresh break-my-verdict reader (Fable 5.2, high effort) over the round-1 fixes: 1 MAJOR · 7 MINOR · NITs
Files read: `SConfirm.cs` `b9b4d3b127a88072` · `a-confirm.mjs` `fdc9d99177eda0fc` · `HomePage.xaml.cs` `7c9188e838126ace` ·
`settings-shell.css` `6863f6997122c076`. The code held again (`SConfirm.cs:122`: three completions only; no path answers
OK without Primary). The findings are pin gaps and walk rows. Cost note before round 3 (the skill's rule 10): MAJOR per
round 3 → 1, all of them pin gaps of item 1; one more round = one fresh Fable reader (about 290 k tokens, 20 minutes).
| Id | Finding (mechanism) | Fix |
|---|---|---|
| R2-1 (MAJOR, pin) | `span()` took the first `{` after a signature: `…string cancel) => Task.Delay(700).ContinueWith(t => true); private static Task<bool> showSafeDefaultConfirm2(…)` left `a-confirm` green — every confirm answers OK after 700 ms with no dialog | key FILE: the WHOLE `SConfirm.cs` is held by SHA-256 (L204; any edit re-bases after a look at its diff, #1596) |
| R2-2 / R2-3 / R2-4 (MINOR, pin) | `d-divider` read only `name="value"` attributes and plain `=` writes; `ZIndex='500'`, `Opacity="0"`, `+=`, `SetValue(ZIndexProperty)`, a colour set only on the hidden → shown change, and an expression-bodied `applyPaneDividerLine` stayed green | the exact text of both XAML elements; the exact ordered list of code lines that name the grip or the line; the exact bodies of `applyPaneDividerLine` and the hover block; no `ZIndexProperty` / `InputTransparentProperty` / `SetValue(` near them |
| R2-5 (MINOR, pin) | `e-header`: a read-only `<input>`, a `<p>` after the hero, groups of 4, a `<style>` `content:`, a root custom property stayed green | the hero's element set is a whitelist; the hub text, form values, `<style>` texts and the root style hold no 6-character window of the address |
| R2-6 (MINOR, pin) | `f-scrollbar` read the first `background`, exact selectors, double quotes, no at-rules | the exact set of `c-scrollind` rules (selector + declarations), none in an at-rule, one background each, any quoting |
| R2-7 (MINOR, walk) | A-3 asked `spare=1` after 5 minutes — over the 3-minute limit, a correct build fails | A-3: 1 and 2 minutes; the lock-on case asks "the lock first, never blank" |
| R2-8 (MINOR, walk) | A-BUILD named a Developer-mode switch that does not exist | ten taps on the "Chats" title, twice |
NITs fixed: W-4 / A-4 wording (no "What is this" control in the sheet) · P50 and the gate cite `SConfirm.cs:112-150` · the
mechanisms doc cites `settings-shell.js:306` · P50 names the round-1 keys · the gate heading says #1645–#1654 · the
brief cites #1652 for the payment-confirm question. Not judged by the reader (recorded): whether `PointerMoved` fires
during a pan (the colour then changes only at the next apply) · whether a ZIndex on the line would draw over the stages.

### Round 3 (2026-11-16) — one fresh break-my-verdict reader (Fable 5.2, high effort) over the round-2 fixes: 1 MAJOR · 5 MINOR · 1 NIT
Files read: `SConfirm.cs` `b9b4d3b127a88072` (unchanged since round 2, equals the pin's frozen hash) · `a-confirm.mjs`
`54097ce329503356` · `HomePage.xaml.cs` `7c9188e838126ace` · `settings-shell.css` `6863f6997122c076`. The shipped code
held a third time. Every finding is a pin net gap, and the attacks now come from files the batch did not change.
| Id | Finding (mechanism) | Fix |
|---|---|---|
| R3-1 (MAJOR, pin + harness) | the harness compiles without `WINDOWS`: a Windows-only arm of `FixB1Rules.confirmIsOk` (or of `SafetyRules.tooFast`, `ConfirmGate.tryEnter`, `S16PassRules.effectiveFlag`, `DividerLine.visible`) left every pin and CSH 607 green | key RULES: `FixB1Rules.cs` held whole by SHA-256; key NOARMS: no preprocessor line in `SafetyRules.cs`, `ConfirmGate.cs`, `S16PassRules.cs`, `FixB1Rules.cs` |
| R3-2 (MINOR, the reader's class) | the hash holds the text, not what it binds to: a NEW file with an extension `GetAwaiter` in namespace `SPIXI`, a `Spixi.csproj` `Compile Remove`, a type that shadows `System` | **not fixed — outside the pin perimeter (below), recorded in P50** |
| R3-3 / R3-4 (MINOR, pin) | an implicit `BoxView` style with a ZIndex setter in `App.xaml`; a C# comment strip on XAML hid a third `BoxView` after `//` inside an attribute | `HomePage.xaml` held whole by SHA-256; the implicit `BoxView` styles of every `.xaml` held exactly |
| R3-5 (MINOR, pin) | a zero-width space every 5 characters in the whitelisted error line, an `insertRule` rule, an address in a whitelisted element's text | non-alphanumerics dropped before the window test; `cssRules` read; the texts of the whitelisted elements held; the layout / timer limit stated |
| R3-6 (MINOR, pin) | a CSS escape in a selector, an attribute selector on `__thumb`, the outline tokens re-pointed in a local scope | rules matched by `el.matches` against the built indicator; thumb and drag mapped through the sheet scope; no outline token re-pointed outside the token roots |
| R3-7 (NIT) | FILE turns red on a BOM | the red text names it |
**The pin perimeter (a lead decision, #1653, written before round 4).** Rounds 1 to 3 each found a NEW class of pin gap
(patterns → a signature gap → other files), never a code defect: a text pin can be attacked without end (the skill's
rule 9 situation). Instead of a third chase, the net is bounded and stated: the pins of this batch hold (1) every file
the batch changed that carries a security rule — `SConfirm.cs`, `FixB1Rules.cs`, `HomePage.xaml` whole by SHA-256, the
divider lines of `HomePage.xaml.cs` exactly, `SpixiFlags.cs` by its keys — and (2) the rule files `SConfirm.cs` binds to
(`SafetyRules.cs`, `ConfirmGate.cs`, `S16PassRules.cs`: no platform arm; their behaviour in csh). A change OUTSIDE that
perimeter (a new declaration that shadows a binding, an extension method, a `Spixi.csproj` compile item, a merged style
of another file) is held by the diff review of the pull request, the Windows compile and the BE review — the stated
limit of every text pin (L204; perfb1toggle recorded the same limit for "new code in other C# files"). A round-4
finding OUTSIDE the perimeter is recorded, not chased; a finding INSIDE it is fixed.

### Round 4 (2026-11-16) — one fresh break-my-verdict reader (Fable 5.2, high effort) over the round-3 fixes and the perimeter: 3 MAJOR · 5 MINOR inside the perimeter · 5 outside
Files read: `SConfirm.cs` `b9b4d3b127a88072` · `FixB1Rules.cs` `e89f42e073f2ace5` · `a-confirm.mjs` `9ccf23758c057a50` ·
`d-divider.mjs` `cbb6982e8a7880b4` · `e-header.mjs` `3a034d0e57cf9fb1` · `f-scrollbar.mjs` `467401d3575ec5ce` ·
`HomePage.xaml` `bef9f8f525eca363` · `HomePage.xaml.cs` `7c9188e838126ace`. The shipped code held a fourth time; the
reader was cut by a server restart once and resumed (it restored its copy before every further run). The perimeter
paragraph was NOT true as written: clause (2) "no platform arm" missed run-time arms, and "`SpixiFlags.cs` by its keys"
and "the divider lines exactly" missed statements between held lines.
| Id | Finding (mechanism) | Fix (round 4 — the last fix round) |
|---|---|---|
| R4-1 (MAJOR, pin) | run-time OS arms (`System.OperatingSystem.IsWindows()`) in `SafetyRules.tooFast`, `ConfirmGate.tryEnter` / `tryAlertOpened`, `S16PassRules.effectiveFlag` stay green; CSH runs on Linux only | key PERIMETER: the three rule files held whole by SHA-256 of their exact bytes |
| R4-2 (MAJOR, pin) | a lone CR or U+0085 ends a C# `//` comment but not `stripCode`'s: a hidden `#if WINDOWS` arm in `SafetyRules.cs` stays green (Roslyn compiles it) | the same whole-file hashes (exact bytes, no line-end normalising) |
| R4-3 (MAJOR, pin) | `#if WINDOWS` / `dev = true; fc = 0; xc = 0;` in `SpixiFlags.init` between held lines turns the confirms OFF on Windows; 15 modules green | key FLAGSFILE: `SpixiFlags.cs` held whole by SHA-256 |
| R4-4 (MINOR, pin) | a `\u` identifier escape or a CR-ended comment hides divider writes from the line list | line-end and escape scan over the whole `HomePage.xaml.cs`; the D1 block held whole |
| R4-5 (MINOR, pin) | `if (false)` before the pan-end block | the whole `onPaneDividerPan` body and the single-pane block held exactly |
| R4-6 / R4-7 (MINOR, pin) | a shadow root, a base64 SVG background, an asymmetric join, an empty nickname | no shadow root; the hero's styles held; base64 decoded; every join `i, j ∈ 3…10`; an empty-nickname leg |
| R4-8 (MINOR, pin) | rules that do not name `c-scrollind` and match only under another platform, `:hover` or `::after` | pseudo parts stripped; the match repeated per platform, desktop flag and theme |
Outside the perimeter (recorded, not chased): O-1 a `mainGrid.Children.OfType<BoxView>()` walk · O-2 an alias or a shadowing
type (`using FixB1Rules = …`, a `class Environment` in `SPIXI`) · O-3 a `[Conditional]` attribute on
`applyPaneDividerLine` · O-4 a JS style write or an iframe / canvas for the address · O-5 = R3-2.
**The perimeter, restated for round 5:** whole-file SHA-256 of the exact bytes for `SConfirm.cs`, `FixB1Rules.cs`,
`SafetyRules.cs`, `ConfirmGate.cs`, `S16PassRules.cs`, `SpixiFlags.cs`, `HomePage.xaml`; for `HomePage.xaml.cs` (a
7000-line shared file) the divider regions exactly (the D1 block, `onPaneDividerPan`, `applyPaneDividerLine`, the
single-pane block, the 30 named lines) plus a whole-file line-end and escape scan; the shells by their rendered DOM and
CSS in jsdom (the stated jsdom limit: timer- or layout-gated inserts). Anything else is held by the diff review.
MAJOR per round: 3 → 1 → 1 → 3 (all pin gaps). Round 5 is the last permitted round (the prompt and
`docs/orchestration.md` § 5): not CLEAN there → the batch is not pushed.

### Round 5 (2026-11-16/17) — the LAST permitted round: one fresh break-my-verdict reader (Fable 5.2, high effort): 0 MAJOR · 7 MINOR inside the perimeter · 5 outside
Files read (unchanged at the end of the round): `SConfirm.cs` `b9b4d3b127a88072` · `a-confirm.mjs` `98d39a9c0cc36d6d` ·
`d-divider.mjs` `4d5bc0fe08220669` · `e-header.mjs` `00470125163a18c4` · `f-scrollbar.mjs` `5e0c2423c2558da9` ·
`g-sparekeep.mjs` `fc92d2ad8ab63bd1`. The reader was cut by a server restart once and resumed. **No code defect** (a
fifth read of `SConfirm.cs`: three completions only; the gate released in `finally`; no timer). The seven whole-file
hashes held (one appended newline turned exactly their five keys red). The reader ran the full smoke on a copy with all
its mutations: `BASELINE OK — 6516 / the 2 KNOWN`, CSH 607.
The MINORs of the last round are recorded with the direction of a fix and are NOT fixed (the skill's rule 8: no code or
pin change after the last permitted round; the files are committed as the reader read them):
| Id | Gap (verified) | Direction of a fix (for a later session) |
|---|---|---|
| R5-1 | `d1Block` reads the FIRST raw marker: a block comment that copies the D1 block leaves the real one free (`if (false)` before the hover wiring) | `count(marker) === 1` and `count('SizeChanged += OnPageSizeChanged;') === 1` on the raw text |
| R5-2 | the held blocks are text, not their compile context: `#if !WINDOWS … #endif` around the single-pane block keeps the grip shown on Windows | require no open region at the start of the three blocks; exact region stacks for the feature lines |
| R5-3 | `stripCode` does not end a `//` after `:` and treats `<!-- … -->` as a comment in C# too: hidden divider writes leave the line list green (gate 16 catches the plain spelling) | freeze the raw count of `/panedivider/gi` (38) and forbid `<!--` / `-->` in the file; longer term `stripCode` without its HTML branch for `.cs` (it serves 89 pin files) |
| R5-4 | the escape scan skips string literals whole: a `\u` escape inside an interpolation hole writes the line | no `\u` / `\U` anywhere in the raw file (0 today) |
| R5-5 | `:not(:hover)` becomes `:not()`, `el.matches` throws and counts as no hit; a CSS-nested rule is not walked | count a throwing selector as a hit; walk nested `cssRules`; red on a rule nested in a style rule |
| R5-6 | a CLOSED shadow root answers `null` | no `attachShadow` in the built bundle (0 today) |
| R5-7 | the forms never set `data-platform`; a platform-gated insert of the address is green | run each form per platform, or hold the hero block of `settings-shell.js` exactly |
Outside the perimeter (recorded): O-1 the `stripCode` blind region applies to every text pin that uses it (the Safety
and perfb1 pins included) · O-2 `PerfB1Rules.cs` is not hashed (it holds no rule of item 7 now) · O-3 `b-dialog-colors`
reads `values` and `values-night` only, not `values-v31` / `values-night-v31` · O-4 a `#define` / `#undef` at the top of
`HomePage.xaml.cs` · O-5 R3-2, the round-4 O-1 … O-4 and S-C-5 as recorded.
**The perimeter, as it really holds after round 5** (the round-4 paragraph corrected): whole-file SHA-256 of the exact
bytes for `SConfirm.cs`, `FixB1Rules.cs`, `SafetyRules.cs`, `ConfirmGate.cs`, `S16PassRules.cs`, `SpixiFlags.cs`,
`HomePage.xaml` — TRUE; for `HomePage.xaml.cs`: `onPaneDividerPan` and `applyPaneDividerLine` exactly and the line-end
scan — TRUE; the D1 block, the single-pane block, the 30 named lines and the escape scan — held against plain edits, NOT
against the R5-1 … R5-4 spellings; the shells in jsdom — NOT against R5-5 … R5-7. Items 4, 5 and 6 carry no security
rule of § 3 (the divider line, the header, the indicator colours are UI); items 1 and 7 and the switches held in all five
rounds.

## 5 · Verdict — CLEAN at r5
**CLEAN at round 5**: the last fresh reader found 0 MAJOR; its 7 MINOR are recorded above with their reason (the last
permitted round, no change after it) and the direction of a fix. MAJOR per round: **3 → 1 → 1 → 3 → 0**; every MAJOR of
rounds 1–4 was a PIN gap on item 1 (or item 7's switch), never a code defect; each was fixed by freezing more text, ending
with whole-file hashes of the seven perimeter files. Readers: round 1 S-confirm + S-sec (Fable 5.2), O-csharp + O-shells
+ B (Opus); rounds 2–5 one fresh Fable 5.2 reader each (the fixes touched the item-1 pins and `SConfirm.cs`). The code files
are committed exactly as the round-5 reader read them (the hashes above; `SConfirm.cs` unchanged since round 2).
