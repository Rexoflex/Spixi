# Review brief — session 4: P-1 levers, A2 / A4 / A5 (#1124), dark chat thumb (#1132–#1134)

File name: `docs/review-brief-session-4.md`. Work order for the #46 loop. Verdict → §5 when the loop closes.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| Lever 1 · A1 | `nativeWebViewOf` (Android): direct cast, else `SpixiWebviewRenderer2.Control`; null for mini-apps; used by the hold and `applyPageSurfaceColor` | `Spixi/Utils/SpixiContentPage.cs` | #1132 (1) |
| Lever 2 | `txPushedToShell` latch; `raiseTxDirtyIfRowsStale` (names, fiat) | `Spixi/Pages/Home/HomePage.xaml.cs` | #1132 (1) |
| Lever 2b | wallet keeps old rows until `clearPaymentActivityDone` (400 ms net) | `src/shells/home.html` | #1132 (1) |
| Lever 10 | Account → tab exits via `exitSettings('handoff')`; home answers `coverpainted` after a tab land; dirty = `apply` + `handoff` | `src/shells/settings.html`, `src/shells/home.html` | #1132 (1) |
| Lever 11 | close wait = `OpenPerfRules.closeHideWaitMs` (Win 100, Android 16, Apple 100) | `SpixiContentPage.cs`, NEW `Spixi/Utils/OpenPerfRules.cs` | #1132 (1) |
| Lever 5 | a tap claims a WARMING spare; attach on its own onload; 1000 ms budget → cold fallback; cancel on close-all / drop | `SpixiContentPage.cs`, `HomePage.xaml.cs` | #1133 (1) |
| Lever 3 | desktop (WinUI + Mac, wide) re-warms a spare 600 ms after a chat presents | `SpixiContentPage.cs`, `HomePage.xaml.cs` | #1133 (2) |
| A2 G-4 | row band + 1 px ring, 3 s, every bubble kind; reduced motion static | `src/shells/chat.html` | #1132 (4) |
| A4 G-6 | inset gallery (4 px gaps, r8), chips +12 px | `src/styles/components/shared-items.css`, `chat-info.css` | #1132 (5) |
| A5 #1124 | image file = media tile (A local preview · B glyph + ring + `keepOpen` · C offered); OFF = file card; light no-preview ground white; 🟡 NEW pushes `setPhotoPreviews`, `setFileThumb`; Privacy switch `ixian:photoPreviews:on|off` | `chat.html`, `typed-bubbles.js`, `media-bubble.js`, `message-bubble.js`, `media-bubble.css`, `SingleChatPage.xaml.cs`, `Spixi/Meta/SChatPrefs.cs`, `SettingsPage.xaml.cs`, `settings.html`, `settings-screens.js`, strings, `docs/security-handover-gate.md` | #1133 (3) |
| #1134 | dark chat log thumb = `--outline-neutral-02` via `--chat-scroll-thumb` | `src/styles/tokens.css`, `message-bubble.css` | #1134 |
| Renders | levers 7 + 12, A2 / A4 / A5 | `docs/sheets/session4/` | — |

Not built: levers 4 (probe owed), 6 (load-more delta, not picked), 8, 9 (deferred).

## 2 · How to run
- Tree: container twin `/home/claude/Spixi`, range `95ef645c..HEAD` · Ixian-Core @097341a present at `../Ixian-Core`
- Pipeline FULL · smoke `BASELINE OK 5138 / the 2 KNOWN` (5095 + 43: cs 13 · nav 24 · chat 5 · main 1) · `node scripts/run-csh.mjs` → CSH 53/53
- Pins: `scripts/pins-s4/{cs,nav,chat,main}.mjs`, wired after `SESSION 3 PINS END`; csh: `scripts/csh/OpenPerfRulesTests.cs`
- Author deliberate breaks: cs 30 · nav 17 · chat 30 · main 1 (all failed for their reason, per the build reports)

## 3 · Auditor scopes (disjoint)
| Auditor | Scope | Focus |
|---|---|---|
| A | all changed C# (`SpixiContentPage.cs`, `HomePage.xaml.cs`, `OpenPerfRules.cs`, `SingleChatPage.xaml.cs`, `SChatPrefs.cs`, `SettingsPage.xaml.cs`) | compile-level read (types, `#if`, usings), threading (decode off UI, pushes on main), lifetimes of the warming claim / re-warm (double claim, wrong friend, leaked spare, stranded tap, backstop), the fence (no path / name / address in a push or log), the wallet latch invalidation |
| B | shells + components + CSS (`chat.html`, `home.html`, `settings.html`, `typed-bubbles.js`, `media-bubble.js`, `message-bubble.js`, `settings-screens.js`, CSS) + gate doc | behaviour, both themes, a11y, `setFileThumb` validation, frozen-bridge grammar (only the named new verb/pushes), older-exe fallbacks (caps), the hand-off never strands Account; + MOTION lens |
| C | `scripts/pins-s4/*`, `scripts/csh/OpenPerfRulesTests.cs`, the re-based smoke pins | each pin fails when its behaviour breaks (mutation budget 25, effectful lines, cases derived not author-listed); re-bases not weakened |

## 4 · Non-negotiables and accepted dials
- Must hold: PARAMOUNT isolation (#220/#221 — the spare and the re-warm are own WebViews, used once) · C# touches no risky parts · no WebView path into a file op · no URL / address / name / text in logs · bundle BEFORE shells · [P1] stays dev-only · a store build logs nothing new.
- Accepted (do not re-open): the picks in #1132 / #1133 / #1134 · `setFileThumb` as a 🟡 push with a BE ask · the 1000 ms warming budget and the 16 ms Android close wait are dials for the walk.

## 5 · Verdict
**CLEAN at r5** (#1135). Rounds: `docs/reviews/session-4-r1.md` · `-r2.md` · `-r3.md` · `-r4-r5.md`.

| Round | Reader | MAJOR / MINOR / NIT | Notes |
|---|---|---|---|
| r1 | A C# (Opus) | 0 / 5 / 6 | Privacy change missed live chats · sent photo waited for the peer · cache reset at 64 + 40 MB cap · gate rows missing · re-warm over a live chat (walk) |
| r1 | B shells (Opus) | 1 / 5 / 4 + motion 3 / 2 | MAJOR B-1: a failed decode made the photo un-openable |
| r1 | C pins (Opus, 20 mutations) | 4 / 9 / 4 | MAJOR: call sites of the thumb pipeline unpinned (drainer start, updateFile → thumb, setter key, live enqueue) |
| r2 | fresh (Opus, 11 mutants) | 0 / 2 / 5 | the sent-photo fix did not reach the shell · an old jump stole a new highlight |
| r3 | fresh (Opus, 6 mutants) | 1 / 3 / 4 | MAJOR: the sending-tile scrim 2.2:1 in light → `--surface-scrim` 4.69:1, contrast now COMPUTED by the pin |
| r4 | fresh (Opus, 5 mutants) | 0 / 3 / 2 | the delivered / read tick left a sending file's name (#1035) |
| r5 | fresh (Opus, 4 mutants) | 0 / 1 / 2 | the tile's live plain-sent name unpinned → pinned, break fails |

MAJORs: B-1 (fix: drop the bad picture, idle, file action; pins `dropped` · `openAfterBad`) · C-c3/c4/c7/c9 (whole-body call-site pins) · R3-M1 (scrim token; computed-contrast pin). Lesson L67 / L68.
Deliberate breaks: build agents 30 + 17 + 30 + 1 · fixers 29 + 14 + 5 + 12 + 10 + 7 + 1 · readers 46 mutants (survivors all fixed or pinned).
Recorded, not fixed: R3-N2 · R3-N3 (inherited) · R3-N4 (no sent-file failure signal — BE) · r4 NIT-2 · r5 NIT-1 / NIT-2 · A-N4 · A-M5 + L-3 → walk rows.
Final: smoke **BASELINE OK 5150 / the 2 KNOWN** (+55) · CSH **59/59** · `--check` gates + verify-locales green · ⚠ C# uncompiled.
