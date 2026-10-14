# Review brief — Session 20 (combined): chat UI lock + ON-1 launch flow + J layout + DT leftovers (#1374–#1404, #1420–#1422, #1440–#1441)

Work order for the #46 adversarial loop. Written before round 1; the verdict goes into §5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| A | composer height ↔ list: one reserve writer (`setLogReserve` / `holdLogReserve` / `syncLogReserve`), tray + reply/edit strip slide by transform / clip (strip keeps the GROW look), long-send clamp to `logEndTop()` | `src/shells/chat.html`, `composer.js`, `attach-sheet.js/.css` | #1375, #1378 |
| B | sent meta (time, ✓, ✓✓) at 0.7 via `--bubble-meta-opacity-sent` | `message-bubble.css`, `tokens.css` | #1377 |
| C | app tile tap = details, ⋮ → Run | `apps-item.js/.css`, `apps-shell.js`, `home.html` | #1377 |
| D | dark grounds L × 0.85 + dark incoming bubbles C × 0.85, L + 0.015, quotes re-derived; pattern alpha 0.101 | `tokens.css` | #1377, #1403 |
| E | file size on the file card (second line), localised units; C# arg 20 for sent + completed files behind `S20FileSize` | `typed-bubbles.js`, `timestamp.js`, `chat.html`, `SingleChatPage.xaml.cs`, `S11MediaRules.cs`, `SpixiFlags.cs`, `DevPage.xaml.cs`, `dev.html` | #1376, #1402 |
| F | message formatting (WhatsApp marks, code + blocks), strip on quote / preview / search, Aa format bar + desktop shortcuts | `msg-format.js`, `format-bar.js/.css`, `message-bubble.js`, `composer.js` (hook), `chat.html`, `home.html` | #1378, #1404 F2 |
| G | notice card ink-800, one tab stop on "Set group photo", RTL "n / 10" isolate, install-wait morph, install moment exempt from the session rule | `tokens.css`, `contacts-shell.js`, `apps-details.js`, `app_details.html`, `S17MomentRules.cs`, `SMoments.cs` | #1379 |
| H5 | title-bar ways `maui` / `colors` deleted | `DtTitleBar*.cs`, `App.xaml.cs`, `ThemeManager.cs`, `DevPage.xaml.cs`, `dev.html` | #1395 |
| I | Account hub toggle rows: layout B kept, top inset 13 px | `settings-shell.css` | #1401 |
| J1/J3/J4 | payment bubble stacked layout (today's colours), file card ✕ on tile + no Open link, app cards without header | `typed-bubbles.js/.css`, `chat.html` (`payName`) | #1440, #1441 |
| J2 | wallet: faces + direction badge, day groups, U+2212 + IXI unit, borderless circles, hero reads one token; spoof guard | `txlist-item.js/.css`, `wallet-shell.js/.css`, `wallet-hero.*`, `home.html` | #1440, #1404 F1 |
| ON-1 | two-step create, restore card, BG 2 / CARD 2, rings layer, pill P2, desktop two columns, Sora latin-ext (launch only), slide 3 copy, restore failure semantics, step-2 back without C# | `launch-shell.js/.css`, `launch-form.css`, `launch-font.css`, `launch.html`, `tokens.css`, `assets/fonts/` | #1420–#1422 |
| Strings | 54 new keys × 13 locales, slide 3 re-translated | `src/strings/draft/*.json` | — |

Not built: the notification strip wiring (no OS notification carries message text — `S20FormatRules.Strip` exists, unwired); the 1:1 payment name and the wallet 8th arg (🟡 #1441); drag and drop of the backup file; the photo-group caption formatting.

## 2 · How to run
- Tree: cloud twin `/home/claude/w/Spixi` (HEAD `03186b0d` WIP; base = Damir's `b4387636`), `../Ixian-Core` @ `097341a`. Range `b4387636..HEAD`.
- Pipeline: FULL (run). CSH `pass=451 fail=0`. Smoke: running (baseline 5965 / the 2 KNOWN).
- Known failures: the 2 KNOWN (#136 · B3); verify-locales id-id `groundBlueGradient:Spixi` (pre-existing). Known flakes: #1147 (5) photo fade, `pins-s14/d-backup-about`, `pins-s14/b-settings` tabOne under load.

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | chat: `chat.html`, `composer.js`, `attach-sheet.*`, `message-bubble.*`, `msg-format.js`, `format-bar.*`, `typed-bubbles.*`, `timestamp.js` | behaviour + regressions (keyboard ↔ tray, iOS lift, reply hold, rise, reduced motion), formatting correctness + a11y, payment / file / app states, both themes; motion lens; over-engineering lens |
| B | launch + home + settings + C#: `launch-shell.js`, `launch-form.css`, `launch.html`, `home.html`, `apps-*`, `txlist-item.*`, `wallet-*`, `settings-shell.css`, `contacts-shell.js`, `apps-details.js`, `dev.html`, `Spixi/**/*.cs` diff, `tokens.css` | behaviour, i18n (phone / device keys, 14 locales, pseudo-locale), keyboard / focus / desktop, the bridge grammar, C# compile-level sanity (uncompiled MAUI files) |
| C | pins: `scripts/pins-s20/*`, `scripts/pins-on1/*`, every pin / smoke assertion re-based in this range | each new pin fails for its behaviour (mutation budget ~15); re-bases not weakened; registration complete |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · WebView composes, C# signs · no WebView path into a file op · no password / text in logs or DOM attributes · no `innerHTML` for peer text · bundle BEFORE shells · tokens not literals · CHAT_KB_CEIL 957 / INDEX 649 (measured: chat 954.7 KB, index 648.7 KB).
- Accepted (do not re-open): B 0.7 trade (#1377) · D grounds + #1403 bubbles · E text (#1402) · F grammar (#1378) · I layout B kept (#1401) · J today's colours (#1440) · ON-1 Decisions + #1421 (consent at welcome, no slow restore screen, the honest create line) + #1422 picks.

## 5 · Verdict
**CLEAN at r7** (2026-10-14). Final: smoke 6087 / the 2 KNOWN (#136 · B3) · CSH 451 · gates green except the pre-existing id-id `groundBlueGradient:Spixi`.

| Round | Reader | MAJOR | MINOR | NIT | Notes |
|---|---|---|---|---|---|
| r1 | A chat · B launch/home/C# · C pins (29 mutations, 10 survivors) | 6 | ~20 | ~15 | ghost strip · phone rings hidden · dev flags card thrown · no Terms before consent · scrub pinned via C# only · trim pin weakened |
| sec | security-only HIGH | 1 | 1 | 3 | wallet face spoof via an address-shaped nickname · linkify cap per run (#1404) |
| r2 | fresh | 2 | 4 | 5 | ru em-dash · the legal line squeezed the slides (→ art shrinks, Damir) |
| r3 | fresh | 1 | 2 | 7 | wallet day groups vs status-ordered push |
| r4 | fresh | 1 | 3 | 2 | short desktop windows clipped (phone-only scoping) |
| r5 | fresh | 0 | 4 | 4 | non-monotonic ladder · Expired hoist · ring-hash coverage · ZWJ strip |
| r6 | fresh | 1 | 0 | 2 | inset push skipped the re-fit (3rd fit defect → structural: key on the room) |
| r7 | fresh, narrow | 0 | 0 | 1 | CLEAN (hidden-welcome trial writes, recorded) |

Deliberate breaks: every new pin broken on purpose by its builder (logged in each builder report) + 29 mutations by the r1 test auditor (10 survivors → pins added). Recorded, not fixed: DECISIONS #1406. Lesson: the same defect class three times (the welcome fit) → the design changed (L144).
