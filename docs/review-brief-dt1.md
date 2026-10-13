# Review brief — DT-1 P1 (the desktop chat list polish + the Windows title bar)

## 1 · What landed (base `c277ec5f`, Session 19)
- **A (#1385)** `src/components/chats-shell.js` (`chatsRenderPlan`, `buildSectionHead`, `wrapChatRowActions`, render / patch / hover tracker changes), `src/components/chatlist-item.js` (`snapRowHover` / `restoreRowFocus` for a wrapper row), `src/shells/home.html` (`sections` / `hoverActions` / `onFold`, `spixi.chats.fold`), `src/styles/components/chatlist-item.css` + `chats-shell.css`, new key `pinnedSection` (en-us + 13 drafts).
- **B (#1386)** `Spixi/Utils/DtTitleBarRules.cs` (new), `Spixi/Platforms/Windows/DtTitleBar.cs` (new), `Spixi/Utils/SpixiFlags.cs`, `Spixi/App.xaml.cs` (CreateWindow), `Spixi/Platforms/Windows/App.xaml.cs` (window mapper), `Spixi/Utils/ThemeManager.cs` (loadTheme), `Spixi/Pages/Dev/DevPage.xaml.cs` (verb + push), `src/shells/dev.html` (Title bar card), 4 dev strings.
- Tests: `scripts/pins-dt1/a-list.mjs` (19), `scripts/pins-dt1/b-titlebar.mjs` (4), `scripts/csh/DtTitleBarTests.cs` (5).
- Built in a cloud twin (clone of `redesign/frontend` @ `c277ec5f` + Ixian-Core `097341a`, dotnet-sdk-8.0); reviewers read copies of it.

## 2 · How to run
- Built shells: `Spixi/Resources/Raw/html/index.html` (home), `dev.html`. Pins run inside `scripts/smoke-test.mjs` (registered after the S19 loop).
- C#: `node scripts/run-csh.mjs` → `CSH pass=446`. The MAUI / WinUI C# CANNOT compile here (net10.0-windows).

## 3 · Must-hold invariants
- No new bridge verb a page can send for A (hover actions = the row menu's existing actions). The phone list is byte-for-byte today's behaviour.
- Chat stays in its own WebView; nothing here crosses panes.
- Gate: a new `spixi.*` key holds no peer data; a log line = fixed words + type names; a dev verb acts only with `devMode` on.
- #1276: never paint the WinUI window root. #1073: the window size save rule untouched.
- #43: hover only under `(hover: hover)`; #227: avatars / sizes / weights unchanged; #1171: hover survives a live row replace; #1166 P-03: the one-row patch keeps working.

## 4 · Accepted dials (do not re-open)
- Q1 "Spixi" only; no search in the bar; logo stays in the rail; the Mac strip is v1.1; C dropped.
- The hover buttons are `tabIndex -1` (🟡 deviation recorded in #1385; the keyboard path = the row menu).
- The title bar way is a dev switch (default `maui`) because the STOP rule needs a spike on Damir's PC.

## 5 · Verdict — CLEAN after r2 (#1387)
| round | reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A shell (Opus) | 1 | 7 | 5 |
| r1 | B C# + security at HIGH (Opus; MAUI 10.0.71 source traced) | 1 | 2 | 8 |
| r1 | tests (Opus; 26 own mutations) | 3 | 19 survivors | 4 |
| r2 | fresh break-my-verdict (Opus) | 1 | 4 | 8 |
| close | lead: every r2 fix verified + 4 deliberate breaks, all KILL | 0 | 0 | — |

MAJORs: (1) the section head's focus hand-back had no `document.hasFocus()` guard — a focus steal while typing in the chat pane (lesson: every focus hand-back in a desktop shell copies the restoreRowFocus rules). (2) Way 2 wrote the XAML extension flag and left MAUI's band; (r2) the hide set before the bar had a handler was dropped — MAUI collapses its band only from `TitleBar.OnIsVisibleChanged` with a handler (lesson: a MAUI platform view set before its handler exists does not reach the platform; way 2 stays UNVERIFIED until the spike). (3) `pins-s6/hover` went red on the new wrapper and the #345 INDEX ceiling went red — both found by running the whole suite, not the batch's own modules (L84 again). (4) The "requests count in Chats" claim had no pin.

Deliberate breaks (all KILL): the author's 13 + csh 1; r1 survivors re-run 30; r2 4. Survivors: none.
Security lens: CLEAN (the verb, the push, the log lines, the pref, the storage key).
Recorded, not fixed: listed under "r1 fixes" + #1387.

## 6 · r1 fixes (verified each finding in the source first)
| finding | verdict | fix |
|---|---|---|
| A-1 MAJOR head focus without hasFocus guard | confirmed | chats-shell.js renderChatsList: hasFocus + "focus already elsewhere" guards (pin a-plan noFocusSteal) |
| A-2 stale head count via patch | confirmed | head `data-count`; patch refuses on a mismatch (a-plan patchStaleCount) |
| A-3 dead click zone | confirmed | bar pointer-events none, buttons auto (a-plan barRest) |
| A-4 request cards misaligned | confirmed | desktop request card margin-inline spacing-8 + radius-12 (a-plan requestInset) |
| A-5 handshaking rows lose #1171 | confirmed | handshaking rows wrapped with NO action (data-acts 0; bar + time-hide rules skip data-acts 0) (a-plan handshakeUnit) |
| A-6 time / unread gone from the accessible name | confirmed | visually hidden (clip-path) instead of display:none (a-plan rightNotDisplayNone) |
| A-7 head focus ring clipped | confirmed | outline-offset -2 px + radius-8 |
| A-8 fold vs chips; stale fold | confirmed | sections only under the All chip; the last unpin resets the fold (a-plan chipFlat, a-list foldReset) |
| B MAJOR-1 way 2 wrong property + MAUI band | accepted (traced by the reader in MAUI 10.0.71) | AppWindow.TitleBar.ExtendsContentIntoTitleBar = false + a hidden MAUI TitleBar (walk decides) |
| B MINOR-1 MAUI resets caption buttons | accepted | UISettings.ColorValuesChanged → apply() |
| B MINOR-2 Windows 10 ignores colours | accepted | effectiveWay: build < 22000 → off (csh) |
| B NIT-1 run() outside try / dispatcher | fixed | whole run in try; the window's DispatcherQueue |
| B NIT-2 pref read order | fixed | own try after the release flags |
| B NIT-8 gate row | fixed | DevPage log line added |
| T MAJOR-1 pins-s6/hover red | confirmed | re-based on the hover UNIT (wrapper on desktop) — same claims, no weakening |
| T MAJOR-2 INDEX ceiling | confirmed | 635 → 644, measured 657 088 chars = 641.7 KB, stated |
| T MAJOR-3 + 19 survivors | confirmed | new module a-plan.mjs (20 checks) + a-list foldReset + b-titlebar wire tightened (devGate/store/push/onLoad/order/way2/captionList/effective/uiSettings/noRoot/typesOnly) + csh: all palette fields, captionColours, effectiveWay. Re-ran 30 mutations: all KILL |
Not fixed (NIT, recorded): 2-line preview re-wrap on hover · aria-controls on heads · hybrid touch sticky hover · the inherited `fired` swallow after a right click (keyboard Enter once) · dev card keyboard pattern (inherited) · dark boot frame #13171b vs #0F1113 (inherited) · static single-window state · MAUI TitleBar LayoutUpdated cost (watch at the spike).

## 7 · r2 fixes
| finding | verdict | fix |
|---|---|---|
| M-1 MAJOR way-2 hide before the handler | accepted (MAUI source) | hide on `HandlerChanged` once a handler exists; pin `way2` requires it; docs say UNVERIFIED |
| m-1 fold reset only on unpin | confirmed | `resetFoldIfNoPins()` in `savePins` (every pin drop) — pin `foldResetDelete` |
| m-2 the bar's pin carried the hover to the moved row | confirmed | `clearRowHover(listEl)` around the pin action — pin `pinNoCarry` |
| m-3 doc counts / walk refs | confirmed | counts fixed; `docs/walk-dt1.md` written; #1387 row |
| m-4 DEV-3 Core lines | confirmed (`:766–:771` + `:687–:692`) | fixed in core-asks, #1383, V1-ADDITIONS, the render |
| NIT time rule for data-acts 0 / the phone tracker | fixed | pins `handshakeKeepsTime`, `plainUnit` |
