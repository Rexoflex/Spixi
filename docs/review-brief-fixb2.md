# Review brief — fixb2 (Fix batch 2) (#1695–#1714)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1 by the lead (Claude Opus, #1640).
The verdict is written back into § 5 when the loop closes (#660). Readers by #1606 + #1640: the security-only pass
(items 3 and 4 whole) and the riskiest file `Spixi/Utils/SPayments.cs` → fresh read-only **Claude Fable 5.2**; every
other reader → fresh read-only **Claude Opus**. The builder of item 4 (a Fable 5.2 instance) never reviews it. No
fallback model: a declined round is a stop.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch / packet |
|---|---|---|---|
| 1 · unread pill | "Unread messages" is a centred pill like the date pill on every platform; the desktop full-bleed rule is gone; the both-edges gutter of fixb1 stays (measured) | `src/styles/components/typed-bubbles.css`, `src/shells/chat.html`, `src/components/typed-bubbles.js` (comment), built html | none (shell) |
| 2 · divider line + reset | `paneDividerLine` margin `0,0,4,0` → `0,0,0,0` (covers the 1 px hairline of `home.html` `body::after`, measured at scale 1 / 1.5); `leftPaneDefaultWidth` 400 → 440 (🟡 dial; also the first-run default) | `Spixi/Pages/Home/HomePage.xaml`, `HomePage.xaml.cs:178` | `DividerHoverLine` (fixb1) · P62 |
| 3 · confirm focus | inside `SConfirm.showSafeDefaultConfirm` (Windows, `ConfirmSafeDefault` arm): on `Opened` + once at Low priority, the KEYBOARD focus goes to the Close (Cancel) button only, then the Close accent state; the text sits in a non-focusable vertical ScrollViewer (Q-1) | `Spixi/Utils/SConfirm.cs`, NEW `Spixi/Utils/FixB2Rules.cs` (item 3 span) | `ConfirmSafeDefault` (fixb1, no new switch) · P59 |
| 4 · pay + mini-app confirm | Windows: the payment send confirm (`SPayments.confirmAndAuth`) and the three mini-app confirms (`MiniAppPage.handleAction`) use `SConfirm.askPlainSafeWinAsync` (holds the ConfirmGate, then the safe-default dialog) when their switch AND `NativeConfirm` are on; OFF / non-Windows = today's call byte for byte | `SPayments.cs`, `MiniAppPage.xaml.cs`, `SConfirm.cs` (entry), `SpixiFlags.cs`, `FixB2Rules.cs` (item 4 span) | NEW `PayConfirmSafeDefault` (P60), NEW `MiniAppConfirmSafeDefault` (P61); line `[FLAGS] payconfirmdefault= appconfirmdefault=` |
| 5 · sheet height | every centred desktop `.c-sheet` (not anchored): `max-height: max(76%, min(100% − 48px, 608px))` — hosts ≥ 800 px unchanged | `src/styles/components/overlay.css` | none (shell) |
| 6 · tx row inset | desktop wallet tx rows: margin-inline 8 px, margin-block 1 px, radius-12 (= the chat row), padding-inline 8 px (content keeps its x) | `src/styles/components/txlist-item.css` | none (shell) |
| 7 · Aurora ring | a dedicated token `--outline-select-ring` (= `--outline-action-default` in the light root and the dark block; light Aurora `#2B47A9`): 2.61 → 3.05 : 1 on the gap; the global action token is unchanged (r1 fix) | `src/styles/tokens.css`, `src/shells/chat.html` (the A2 ring) | none (token) |

Not built: nothing of the seven is stopped. Lead decisions to check: D-1 (item 4's entry HOLDS the ConfirmGate instead of
counting a plain alert — other Spixi alerts are DROPPED while a payment / mini-app confirm is up, because a MAUI alert
opening over our ContentDialog would throw in MAUI's `async void` handler and stop the app; `useSafeDialog` = own
switch AND `NativeConfirm`) · Q-1 fixed (the scroll viewer) · item 3 has no switch of its own (it fixes the arm of
`ConfirmSafeDefault`; the prompt allows exactly two new switches).

## 2 · How to run
- Tree: your read-only copy (the lead gives its path); range = the working-tree diff against `06a4845d`
  (`git diff 06a4845d -- <files>` in the copy). Pipeline: FULL (done) · smoke before: `BASELINE OK 6522 / the 2 KNOWN`
  on the base · CSH 622 → 632 · Ixian-Core @097341a present beside the copy.
- Known failures: the 2 KNOWN (#136 · B3); L214 (run the smoke with `TZ=America/Los_Angeles`).
- ⚠ The Windows C# (`#if WINDOWS`) is UNCOMPILED in the cloud; CI compiles Windows. The pins for it are SOURCE pins.
- Run single pins: `node scripts/run-pins.mjs --root <copy> pins-fixb2/<mod>`; csh: `node scripts/run-csh.mjs`.
  Never the full smoke. Wait rule: run nothing until `/home/claude/logs/smoke-r0.done` exists (the lead's full smoke).

## 3 · Auditor scopes (disjoint)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S (security-only) | Fable 5.2 | items 3 + 4 whole: `SConfirm.cs`, `FixB2Rules.cs`, `SpixiFlags.cs` (fixb2 lines), `MiniAppPage.xaml.cs` (three sites), csh `FixB2ConfirmTests.cs`, `FixB2PayTests.cs`, pins `a-confirm-focus`, `d-pay-confirm` (APP / ENTRY / FLAGS / WINDOWS-ONLY / RULES), re-based `pins-fixb1/a-confirm`, `pins-safety/c-confirm` | can Enter / Esc / a closed dialog / an error / a second dialog / a page script make a confirm say yes? Does any OFF arm differ from the base? Does anything signed, sent, shown or bridged change? Is the focus step able to focus OK? Is a new exposure introduced (the gate lens)? |
| R (riskiest file) | Fable 5.2 | `Spixi/Utils/SPayments.cs` whole + `d-pay-confirm` PAY-OFF / PAY-ON / PAY-REST | ★ only the shown dialog changed: texts, amounts, auth step and its WinUI rule, the order confirm → auth → send, every caller (`handleSignSend`, `handlePayRequest`, `confirmTip`) unchanged |
| O1 (shells) | Opus | items 1, 5, 6, 7: the four CSS / shell sources, the built html, pins `c-unread-pill`, `e-sheet-height`, `f-txrow`, `g-aurora-ring`, the sweeps, the re-based `pins-fixb1/c-unread*`, `pins-s4/fixr2`, the 3 + 1 re-based inline smoke rows | behaviour on every platform and both themes; conservative CSS; tokens; do the pins fail when the behaviour breaks; are the re-bases the smallest honest change |
| O2 (divider + re-bases) | Opus | item 2: `HomePage.xaml(.cs)` divider + reset, pins `b-divider`, `b-hairline-sweep`, re-based `pins-fixb1/d-divider`; and the re-bases of item 4 that are not security text: `pins-fixb1/g-sparekeep`, `pins-perfb1/f-flags`, `pins-s16/b-l8`, `pins-v1am/c-csharp` | the measurement and the position; the dial; does each re-base still catch what it was written for (#1596: only the hash / count moved) |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220 / #221) · ★ C# touches no risky parts (for item 4: ONLY how the
  native confirm is shown on Windows changes; nothing signed, broadcast, shown as text or bridged; the auth step and its
  platform rule `SPayments.cs:610` @ `06a4845d` (`:623` at the head); the order confirm → auth → send) · fail closed (Esc, a closed dialog, an error, a
  second dialog = Cancel) · switch OFF = today's call byte for byte · no new bridge verb, `spixi.*` key, network fetch,
  log line with user data · bundle BEFORE shells · tokens are the source of truth · no new string.
- Accepted (do not re-open): #1629 / #1639 (the pill, every platform) · #1633 (the safe default, own switches, native
  confirm) · #1634 (the whole-file hashes stay; an edit re-bases after a look at the diff) · #1635 (3) (no
  Developer-screen rows) · #1614 (keep the #1343 defaults, darken the ring) · the reset-width dial +40 px (main chat 🟡,
  Damir judges at the walk) · #1627 / P50 (source pins do not catch deliberately hidden code).

## 5 · Verdict
**0 MAJOR IN THE CODE — DELIVERED by ruling #1735 (Damir, 2026-11-18 11:20: "Accept the test limits" = option (a) of #1705).** After the stop of round 3 (rule 9) the three pin keys stay as built with their limits recorded (#1705, P60, P61, the gate section). The final readers over the unchanged tree `review/r4` @ `1636b59e`: **S4 (Claude Fable 5.2, the security-only scope: items 3, 4, `SPayments.cs`) — 0 MAJOR in the code**, MINOR 1 (the template's command row HAS XY keyboard navigation: the Left arrow moves the focus from Cancel to OK; no single key says yes; recorded in P59 / P60 / P61 + walk W-1 / W-4; `XYFocusKeyboardNavigation = Disabled` on `CommandSpace` is a later-batch candidate), NIT 2 (the focus may not return to the WebView field after the dialog closes — walk W-1; the `SConfirm.cs` header names only the `askAsync` log lines); **O5 (Claude Opus, items 1, 2, 5, 6, 7 + the docs) — 0 MAJOR in the code**, MINOR 1 + NIT 2 in the docs (fixed: § 1 row 7, the `SPayments.cs` line, the mechanisms headroom). No code file changed after round 3: the code files of the push are byte-identical to what rounds 3 and 4 read (SHA-256, first 12: `SConfirm.cs` 6b76e4a7e7ec · `SPayments.cs` a43f7fa14336 · `SpixiFlags.cs` 8550c50fbc27 · `FixB2Rules.cs` 0c2ffd9c09ed · `MiniAppPage.xaml.cs` fa430016e65d · `HomePage.xaml` 992a99e2c56c · `HomePage.xaml.cs` 561fc76d03d9). The merged tree (+ `redesign/frontend` @ `c0a76176`): `BASELINE OK — 6617 pass / the 2 KNOWN` (= 6564 + 53) · CSH 643 (= 633 + 10).

### Round log
- **Round 1** (tree `review/r1`; S + R Fable 5.2, O1 + O2 Opus): **MAJOR 3** (all pin gaps or a layout gap; no wrong yes,
  no OFF arm that differs, nothing signed / sent / shown / bridged changed — S and R checked) · MINOR 8 · NIT ~14. R
  (SPayments.cs): CLEAN, 2 MINOR + 3 NIT recorded in P60. Also found by the lead's full smoke: the inline row `I-2 r2
  (#358)` read the light-Aurora `--outline-action-default` line as the DARK value (dark rest 1.75) — the token change of
  item 7 was too wide. Fixes (builders: Fable 5.2 for item 4's pin, Opus for item 2, Sonnet for the shells):
  S MAJOR-1 `d-pay-confirm` WINDOWS-ONLY → an exact per-file table of the bare names over every region (+ `\u` escapes) ·
  O2 MAJOR-1 the double-click reset re-fits chat info (`updateInfoPaneWidth()`, as the pan) · O1 MAJOR-1 `f-txrow` reads
  top-level rules only + computed rows in jsdom · item 7 → a dedicated token `--outline-select-ring` (only the A2 ring
  reads it; the global action token is unchanged everywhere) · O1 m-1 `e-sheet-height` scans every at-rule depth
  (exact allow-list) · O1 m-2 the chat app picker takes the shared cap · O1 m-3 the pill keeps 16 px from a phone edge and
  wraps a long word · O1 m-4 the pill cannot be hidden unseen · S NIT-1 / NIT-4, O2 N-1 (an honest WinUI rounding model;
  half-up asserted, half-to-even printed — the walk checks 125 %), O2 N-2, stale comments. Recorded, not changed: R
  MINOR-1/2, S MINOR-1/2 (D-1 costs, P60 / P61), O2 m-1 (chat info opens beside the conversation from 1040 DIP, P62),
  S NIT-2 / NIT-3 / NIT-5, O1 NITs (the light-Aurora side effects are gone with the dedicated token).
  Files changed r1 → r2: `review/r1-to-r2.txt`.
- **Round 2** (tree `review/r2`; S2 Fable 5.2, O3 Opus; full smoke on the r2 tree: `BASELINE OK — 6574 pass / the 2
  KNOWN` = 6522 + 52, `TZ=America/Los_Angeles`): **MAJOR 2, both pin gaps** — S2: the WINDOWS-ONLY walk of
  `d-pay-confirm` (and the same idiom in `a-confirm-focus` OFF) skipped `bin` / `obj` at every depth and matched `.cs`
  with case, but the SDK compiles a nested `Spixi/Utils/bin/X.cs` and `X.CS` → only `Spixi/bin`, `Spixi/obj` are skipped,
  `/\.cs$/i`, + a guard against Unicode FORMAT characters outside literals (0 in today's tree); the claim texts now name
  what stays out (the `://` trick of `stripCode`, a reflection name, Ixian-Core files — the #1627 class). O3: the
  hidden-pill guard missed `max-height: 0` and `opacity: 0.01` → a wider source scan + measured visibility in the
  sweep. MINOR: S2 m-2 (the gate rows — written at the export), m-3 (P61 + walk W-4: arrow keys), O3 m-1 (the tx row
  padding is pinned by a computed check). NIT recorded: S2 (Ixian-Core imported; a text swap held only by the FILE hash;
  no RTL `FlowDirection` on our dialog), O3 (the ring token under a nested ground keeps the Aurora value — no nested
  ring today; `overflow-wrap: anywhere` needs iOS 15.4, used ~10× already; a non-desktop sheet cap; 548 chars of
  chat.html headroom). No wrong yes, no OFF arm that differs, nothing signed / sent / shown / bridged changed (S2).
- **Round 3** (tree `review/r3`; S3 Fable 5.2, O4 Opus; full smoke on the r3 tree: `BASELINE OK — 6575 pass / the 2
  KNOWN` = 6522 + 53): **MAJOR 3, ALL IN HAND-WRITTEN PIN SCANNERS; NO FINDING IN THE CODE IN ANY ROUND.** S3: the
  WINDOWS-ONLY walk of `d-pay-confirm` (and of `a-confirm-focus` OFF) reads every file as UTF-8 and strips `//` to `\n`
  — a plain fifth caller in a UTF-16 file or a file with lone-CR line ends compiles (`csc` 10.0.115, proven) and stays
  green; m-1 the Cf guard lists a subset of `\p{Cf}`; m-2 a U+2028 after `//`; m-3 the gate rows (owed at the export).
  O4: the hidden-pill guard of `c-unread-pill` + its sweep misses `filter: opacity(0)`, `mask-image`, an alpha-0 colour,
  `-webkit-text-fill-color: transparent`, a `visibility` rule on the span by another selector and `line-height: 0`
  (all six proven by screenshots); `f-txrow`'s content-line row reads the cascaded `padding-inline` string, so a
  physical `padding-left: 0` (content 88 → 80 px) stays green; m-1 a `data-platform` rule could re-cap the sheets
  unseen by `e-sheet-height`. The behaviour of all seven items was measured correct again (S3: no wrong yes, OFF arms
  = base, nothing signed / sent / shown / bridged changed; O4: Chromium geometry of items 1, 2, 5, 6, 7).
- **STOP by rule 9 of the lead skill (2026-11-17 23:55).** Three scanner keys found a NEW class of silent fault in two
  rounds in a row (WINDOWS-ONLY: spelling r1 → file coverage r2 → encoding r3; the hidden-pill guard: r2 → r3; the
  `f-txrow` geometry: r1 → r2 → r3). No third fix round is started. The choice goes to Damir (the status doc and
  Mission Control): (a) accept the stated limits of these source / CSS pins (as #1627) and let ONE fresh reader per
  scope check the unchanged tree for code findings, then deliver; (b) one redesign of the three keys (a byte / line-end
  guard over every walked C# file; pixel and geometry measures in the Chromium sweeps), then fresh readers in rounds
  4–5; (c) drop the three over-reaching keys and say that the diff review, the walk and the BE review hold the rest.
  The tree as read by round 3 is committed on the local `work/fixb2` (not pushed).

