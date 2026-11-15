# P41 · PHONE: NO EMPTY DETAIL AT START · The empty right-hand page is built at the first wide layout, not at app start, on a phone (Speed batch 1a, P-13)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (a page is built later or not at all on a phone; nothing new is read, sent, stored or logged) | no | none: no verb, push, `spixi.*` key, log word or timer; 1 pref; dev: 1 switch name on `ixian:devflash:`; the one `[FLAGS]` line (plumbing, see the gate section) | built behind flag `SpixiFlags.PhoneNoEmptyDetail` (default ON) · ⚠ C# UNCOMPILED (Android / iPhone build) · no device number yet | 3 min |

**Look here first:** `HomePage.defaultDetailContent` (`Spixi/Pages/Home/HomePage.xaml.cs:40`, the field initializer: `constructAtStart ? new EmptyDetail() : null`) and `EmptyDetailRules.constructNow` (`Spixi/Utils/EmptyDetailRules.cs:30`).

**DECISIONS:** #1312 · #1478 · #1473 · this batch's own rows: #1560 (the four switches) · #1566 (this change).

## What changed and why
- **What the page is.** `EmptyDetail` (`empty_detail.html`) is the resting right pane of the wide layout (the EmptyDetail shell). It shows no chat and no wallet data. On a phone the layout is always single-pane (`OnPageSizeChanged`: `Width < 700 || isPhoneDisplay()`, `HomePage.xaml.cs:609`; `Spixi/Pages/Home/EmptyDetail.xaml.cs:16` loads `empty_detail.html`) and `rightContent` is hidden, so the page is never visible.
- **Why.** The page was built in HomePage's field initializer and its WebView booted at cold start anyway: one more shell boot, about 4.6–5.0 MB renderer PSS (harness figure, not a device number), on the one renderer thread Android shares.
- **The change.** With the switch ON and a PHONE DISPLAY (Android or iOS with the short side under 600 dp, `isPhoneDisplay`, `:565-586`; every other platform answers false first, the platform test at `:573`), the page is not built at start: the field is `null` (`:40`) and the constructor attaches it only when it exists (`:307-310`). It is built ONCE at the first wide layout, a foldable that opens: `buildDefaultDetailOnFirstWide` (`:597-605`), called from the wide arm of `OnPageSizeChanged` before the pane is shown (`:633`). The rule refuses a second build (`EmptyDetailRules.constructNow`, `EmptyDetailRules.cs:30`: `exists` → false).
- **Unchanged.** Tablets, Windows and Mac build at start as before (`isPhoneDisplay` is false there; the rule defers only for switch ON AND phone display, `EmptyDetailRules.cs:17`). Switch OFF = today's path, and the display is not even read (`phoneForEmptyDetail`, `:590-593`).
- **The reset.** `removeDetailContent(true)` (`:6355`) disposes the page and rebuilds it only if one existed, or the rule does not defer (`EmptyDetailRules.rebuild`, `:41`; call `:6371`); a deferred page that was never built stays unbuilt. The null-safe readers: the theme collector (`UIHelpers.cs:320` through `add(Page? p)`, `:272`), `reloadDefaultDetail` (`HomePage.xaml.cs:2131`, `?.reload()` at `:2135`), and `getDefaultDetailContent` (`:2126`) construct nothing.
- **Construction moves in time; nothing else.** The same class, the same document, the same data, only built at the first wide layout (or never, on a device that never gets one). No new timer, no new push, no new log word.
- **Flag.** Int pref `flagPhoneNoEmptyDetail` (`SpixiFlags.cs:32`, `:102`, `:146`, `:181`), absent = ON, a stored 0 acts only in dev mode; `[FLAGS] … noemptydetail=…`. Dev switch `ixian:devflash:noemptydetail:<0|1>` (`DevPage.xaml.cs:159`).

## Files
`Spixi/Utils/EmptyDetailRules.cs` (new, pure) · `Spixi/Pages/Home/HomePage.xaml.cs:38-40`, `:307-310`, `:565-605`, `:633`, `:6355-6374` · pin `scripts/pins-perfb1/d-empty-detail.mjs` (4 rows: gate, lazy, nullsafe, desk) · csh `PerfB1EmptyDetailTests` (6 tests).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The isolation invariant (chat in its own WebView) is touched | It is not: the EmptyDetail page holds no chat; the change builds one page later, the pane layout and every overlay are unchanged | n/a (no new data path); pin `d-empty-detail` (`GATE`) |
| A null reader crashes (a theme push, a reload, a reset) before the page exists | Every use of `defaultDetailContent` is null-safe; the accessors construct nothing | pin `d-empty-detail` (`NULLSAFE`: `allUsesNullSafe`) |
| A second EmptyDetail is built (two WebViews) | `constructNow` refuses when one exists; the field is the rule's `exists` input; one caller in the wide arm | csh `the_first_wide_layout_builds_it_once_never_twice` · pin `LAZY` (`oneCaller`, `wideArmCalls`) |
| A desktop or tablet loses its right pane | They build at start: the phone input needs Android / iOS and a short side under 600 dp; a display read failure is "not a phone" | csh `not_a_phone_display_is_built_at_start_no_change` · pin `DESKTOP` |
| Switch OFF differs from today | The rule returns "build at start" for OFF on every platform | csh `switch_off_is_todays_path_on_every_idiom` · pin `GATE` (`startGated`) |
| A new surface | None: no verb, push, key, log word or timer is added | pin `d-empty-detail` |

## NOT proven
- ⚠ C# UNCOMPILED for Android and iPhone; csh runs the pure rule, the pin reads source text.
- No device number: the 4.6–5.0 MB PSS and the boot time saved are harness figures; the device sitting follows the delivery. The keep rule: a switch that does not measurably help on the device is removed.
- A real foldable that opens (the first wide layout builds the page, shows it, and the pane looks as before) is not walked; the "first wide layout" path has only the model and the pin.

## How to switch it off
Developer mode on → send `ixian:devflash:noemptydetail:0` (no row on the Developer screen in this batch) → restart.

## Question for BE
None beyond the packets above: no new surface. Is a page that is built once, later, but with the same content, outside what you need to see? (yes / no)
