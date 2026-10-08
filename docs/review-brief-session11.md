# Review brief — Session 11 (#1262)

Tree (READ ONLY): `/tmp/s11/R/spixi` = base d4198982 + the S11 batch (uncommitted; `git diff HEAD` shows it; generated output under `Spixi/Resources/Raw/html` and `src/demo/spixi.iife.js` is rebuilt from `src/`). Ixian-Core sibling at `/tmp/s11/R/Ixian-Core` (@097341a).
Contract the builders followed: `/tmp/s11/CONTRACT.md` (read it — it states every item and rule). Builder reports are summarised below.
Do NOT run `scripts/smoke-test.mjs` (the lead runs the one full smoke). You may run single pin modules with a small runner (smoke prelude + import loop, absolute root) and `node scripts/run-csh.mjs` in a COPY of the tree (`cp -a /tmp/s11/R /tmp/s11/R-<you>`), never in `/tmp/s11/R`.

## What landed
| Area | Files | Behaviour |
|---|---|---|
| A seasonal bar | `src/components/seasonal.js`, `src/styles/components/seasonal.css`, `src/shells/home.html` | Halloween 24 Oct 00:00 → 1 Nov 03:00, Christmas 1 Dec 00:00 → 2 Jan 00:00, local clock, boot/resume/60 s; `Spixi.__seasonNow` test hook |
| A line | `topbar.css`, tokens.css region A | blue → violet connecting strip, violet token |
| A MIT | `settings-app.js` | `aboutLegal` → `aboutLegal2` "© Ixian" |
| A update card | `glass-card.js/.css`, `home.html` (`sl-update-available` carrier, `updateVersionOf`), `HomePage.xaml.cs` (`ixian:openLink:` branch, NEW) | glass card, "How to update" → https://www.spixi.io/download, × in memory |
| A hints | `glass-card.js` (`pickHint`), `home.html` (`pumpHint`), `Spixi/Meta/SHints.cs`, `Spixi/Utils/S11HintRules.cs`, `HomePage` (cap `hints`, push `setHints`, verb `ixian:hint:<shown|done>:<id>`), `SettingsPage` (verb `ixian:hintsoff:<0|1>`, push `setHintsOff`), settings shell switch (lead-wired: `settings-screens.js createChatAppearance` + `settings.html` latchNotif) | tips 5–9, 3-day wait, 1 per 7 days, never with update/backup/rating, done = never again, off switch |
| A downloads gap | `settings-app.css` | more space between rows |
| Lead | `home.html`, `settings.html`, `settings-screens.js` | P4 Message preview default = 1 line (#1261): absent key → '1' |
| B illustrations | `src/components/illustrations.js`, `illo.css`, tokens region B, sites in launch-shell / empty-state / contacts-shell / apps-header / backup-nudge / settings-backup / wallet-shell / rating-nudge; deleted 6 PNG + 8 SVG | inline SVG, unique ids per instance, one entrance then hold, reduced motion static |
| C flash | `SpixiContentPage.cs` (holdStageUntilDrawn / PresentHold path), `SingleChatPage.xaml.cs`, `chat.html` (`paintAck` → `ixian:painted`), `DevPage` + `dev.html` (verb `ixian:devflash:`, push `setFlashDev`, pref `devFlashBits`), `S11ChatRules.holdStep` | Android: hold releases one frame after the shell's paint answer; grounds transparent until then; 250 ms cap; dev switches; `[P1] hold frame/release` probe |
| C keyboard | `overlay.js`, `message-menu.js` | touch-opened message menu: an action close blurs the kept field; never restores focus into a text field |
| C paste toast | `chat.html` | toast "Finish editing to add photos." when an image paste is refused during an edit |
| C auto-download | `settings-screens.js` Privacy row, `settings.html` (`ixian:photoAutoDl:<v>:<0|1>`, `setPhotoAutoDl`, cap `photoAutoDl`), `SettingsPage`, `Spixi/Meta/SAutoDownload.cs`, `StreamProcessor.handleFileHeader` → `SingleChatPage.maybeAutoDownload` / `acceptOfferClosed`, `S11ChatRules.shouldAutoDownload` | Off default · Wi-Fi only · Always; photos ≤ 10 MB; Load-pictures gate; approved contacts only; same accept path as the Download tap |
| C created line | `chat.html buildEventRow` | "\n" line → title (icon inline) + muted smaller subtitle |
| E viewer | `media-viewer.js/.css` | pinch / ctrl+wheel / double-tap zoom 1–4×, pan clamp, 3-slide paging track with velocity snap, reduced motion instant |
| F apps pre-push | `HomePage.xaml.cs` (`scheduleAppsPrePush`, `enterAppsTab`, `appsPushLock`), `S11AppsRules.cs` | apps list pushed ~2 s after boot off the UI thread; chat pages not reloaded for an unchanged list |
| Strings | 27 new keys + 12 locale drafts | — |
| Smoke | `scripts/smoke-test.mjs`: pins-s11 loader line; CHAT_KB_CEIL 900→905, INDEX_KB_CEIL 560→585 (measured 900.7 / 580.7); B re-bases (marked `★ S11 B re-base`) ; F re-bases in pins-s4/cs.mjs, pins-s9/a3-wiring.mjs | — |

## Must-hold invariants
CLAUDE.md ground rules (security invariant; C# touches no risky parts; handover gate: nothing introduced without a reason; bridge protocol: new verbs/pushes capability-gated and ignored by old shells/exes; no `spixi.*` localStorage key added; tokens only in tokens.css, no `[data-theme]` in component files; strings through `strings.x || '…'`; motion: reduced motion static, close faster than open). C# is UNCOMPILED: read it like a compiler (MAUI 10 / .NET 10 / Xamarin.Android bindings / Ixian-Core @097341a). Old pins must not have been weakened by re-bases.

## Accepted dials (do not re-open)
Everything in DECISIONS #1262 (scope, Off default, Privacy placement, tips 5–9 only, URL spixi.io/download, Source code row kept), #1261 (1-line default), the design picks (C1, X1, line B, illustration defaults, rating D). The album / P4 chooser / offer preview / send flow are renders for Damir — not built.

## Scopes (disjoint)
- **R1 — C# (compile + threading + security)**: every changed/new `*.cs` (HomePage, SettingsPage, SingleChatPage, SpixiContentPage, PresentHold if changed, DevPage, StreamProcessor, SHints, SAutoDownload, S11HintRules, S11ChatRules, S11AppsRules) + the csh tests. Questions: compiles? right thread? locks/deadlocks (appsPushLock with UI thread)? lifetime of OnDraw listeners / frame callbacks / PostDelayed on a detached view? does the flash candidate ever leave a chat untouchable or grounds transparent forever? does auto-download bypass any check the manual accept path has (blocked, pending, group rules, sizes, Load pictures)? any risky part (WebView-supplied path, openLink widening — evaluate the new HomePage `ixian:openLink:` against the security docs)? log lines carry no content?
- **R2 — shells / components / UX + security of the web side**: `home.html`, `seasonal.js/.css`, `glass-card.js/.css`, `topbar.css`, `settings.html`, `settings-screens.js`, `settings-app.js/.css`, `chat.html`, `overlay.js`, `message-menu.js`, `media-viewer.js/.css`, `illustrations.js`, `illo.css` + all illustration sites, tokens.css regions. Questions: logic bugs (date windows at DST changes, 60 s timer leaks, hint rules, update-version parse in all 13 locales, created-line split), HTML sinks (innerHTML of anything non-constant?), a11y (focus, aria, reduced motion), theme rules, old-shell/new-exe and new-shell/old-exe both safe, the keyboard fix on iOS/desktop, viewer gestures (pointer capture, cancel, RTL, close cleanup), size/perf.
- **R3 — tests**: `scripts/pins-s11/*.mjs`, `scripts/csh/S11*Tests.cs`, every re-based pin (B re-bases in smoke-test.mjs: `git diff HEAD -- scripts/smoke-test.mjs`; F: pins-s4/cs.mjs, pins-s9/a3-wiring.mjs). Questions: does each pin fail when its behaviour breaks (mutation budget ~25: break effectful lines in a COPY, run the module)? any re-base that weakened an old guarantee? coverage gaps for the riskiest behaviours (auto-download gate, hint rules, seasonal boundaries, flash release, keyboard)?

Report format: findings with severity MAJOR / MINOR / NIT, `file:line`, mechanism, evidence. Return the full report as text. Be harsh; the authors want to be proven wrong.

## §5 Verdict (#1264) — CLEAN at r4
| Round | Reader | MAJOR | MINOR | NIT | Notes |
|---|---|---|---|---|---|
| r1 | R1 C# | 2 | 5 | 5 | bot-room auto-download (`FriendType.Normal`); third `ixian:openLink:` sink on HomePage |
| r1 | R2 shells | 1 | 7 | ~10 | hints died at boot (`setHints` before the nudges); + motion / copy lens |
| r1 | R3 tests | 6 | 6 | 4 | 39 mutants: 19 killed / 18 survived (wiring); P4 default unpinned; a-season real clock; 3 inline pins red |
| r2 | fresh | 1 | 8 | 6 | 18/18 r1 fixes verified; keypad Enter re-click (5 → 55) |
| r3 | fresh | 1 | 1 | 6 | 10/10 r2 fixes verified; fr / ru / lt '.' decimal dropped (2.5 → 25); queued auto-download for a removed contact |
| r4 | lead | 0 | — | — | both r3 findings fixed with deliberate breaks (killed: h-r3 frDot / ruDot, c-wiring hookWhole); NIT-2 / 4 / 5 + hook comment |

Deliberate breaks across the batch: agents ≈ 330 (A 48 + 54, B 18, C 33, E 13, F 16, C2 31, G 37, G3 27, H 44, H3 14, F4 6) — survivors reported and either killed by a new pin or recorded as equivalent.
Lens findings offered to Damir: seasonal light bounded to ~20 s per 10 min (built) · hint copy for groups / desktop (built) · offer previews in memory only · paste on the keypad.
Recorded, not fixed: handoff 2026-10-08 §5. Final: smoke BASELINE OK 5664 / the 2 KNOWN · CSH 336.
