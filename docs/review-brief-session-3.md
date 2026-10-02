# Review brief — session 3: P-1 stamp set + Part A (#1126–#1129)

File name: `docs/review-brief-session-3.md`. Work order for the #46 adversarial loop (docs/process.md). Written BEFORE
round 1. The VERDICT is written back into §5 when the loop closes.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| P-1 stamps (TEMPORARY) | `[P1]` lines on every native open / close / pop, tab switch, wallet tx push, info pane, landtab, + Android/Windows frame windows; shell lines for taps → sends, tab / subscreen / sheet / modal changes, scroll, long tasks, boot; ONE grammar both sides; DEV-ONLY (`SPIXI_DEV_COEXIST`; `*SL{SpixiP1}` seeded "0" in a store build); Windows DevTools console hook (dev only, grammar-validated, mini-apps skipped) | NEW `Spixi/Utils/P1Perf.cs` · `Spixi/Utils/SpixiContentPage.cs` · `Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Lang/SpixiLocalization.cs` · NEW `src/components/p1.js` · `src/bridge/native.js` · `bottomnav.js` `subscreen-slide.js` `overlay.js` `chat-info.js` `shared-items.js` · 18 `src/shells/*.html` (head carrier) · `scripts/build-demo-bundle.mjs` · `docs/security-handover-gate.md` | #1127 |
| A1 probe | `[P1] a1 hold webview= handler= pv= incontent= stageh= page=` before every G-1 hold | `SpixiContentPage.p1HoldProbe` | #1123 (1), #1127 |
| A3 | Downloads rows lead with the chat's file tile (`createFileTile` = the bubble's own `fileTile`, no badge); typed-bubbles.css linked in settings + downloads | `typed-bubbles.js` · `settings-app.js` · `settings.html` · `downloads.html` | #1126, #1123 G-5 |
| A8 | file stamp children + a received file's time + every `.c-tcard__time` at 0.7; READ / FAILED tick 1.0 | `typed-bubbles.css` | #1126 |
| A10 | deletes + app-invite cancels go out as msgDelete with push OFF (`sendSilentMsgDelete`) | `SingleChatPage.xaml.cs` | #1128 |
| A11 | chats list: the SENT (neutral) tick takes the delivered fade; selected row exception | `chatlist-item.css` | #1129 |
| Pins | Session 3 block (A10 · A8 · A11 · A3 · P-1) + re-bases N83 (9 carriers) · B2 (silent delete) · #345 CHAT_KB_CEIL 711 | `scripts/smoke-test.mjs` | — |

Not built, and why: A9 (E-W3 nick catch-up) — Core already queues the nick on the server (`sendNickname` → `sendMessage(…, true, true, false)`), so a walk row tests delivery to a CLOSED app first (#294) · A2 / A4 / A5 — renders only (`docs/sheets/session3/`), Damir picks · A7 — BE row only.

## 2 · How to run
- Tree: container twin `/home/claude/Spixi` (base 67e35ca = HEAD 530ed33 + the interview DECISIONS rows) · the working-tree diff
- Pipeline: FULL (bundle → shells) · Ixian-Core @097341a present at `../Ixian-Core`
- Gates: `node scripts/smoke-test.mjs` → BASELINE OK / the 2 KNOWN (#136 · B3) · `node scripts/run-csh.mjs` → 26 · `node scripts/cs-syntax-check.mjs` · `node scripts/build-shells.mjs --check`

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | all C# (`P1Perf.cs`, `SpixiContentPage.cs`, `HomePage.xaml.cs`, `SpixiLocalization.cs`, `SingleChatPage.xaml.cs`) | compile-level read on every TFM (Android, Windows, iOS, MacCatalyst; with and without SPIXI_DEV_COEXIST), threading (frame probes, console hook, async void), lifetimes (event unsubscription, held receivers), can a stamp change behaviour or throw into a present/close path; A10 equivalence with Core's sendMsgDelete except the push flag |
| B | shells + components + CSS (`p1.js`, `native.js`, the hooked components, the 18 heads, `typed-bubbles.css`, `chatlist-item.css`, `settings-app.js`, `typed-bubbles.js`) | behaviour unchanged with P-1 OFF (no listener, no rAF, no cost), the grammar never lets user data out (verb payloads, names, ids), selector specificity / cascade of A8 + A11 across shells, A3 untrusted file name path |
| C | pins (`scripts/smoke-test.mjs` Session 3 block + the three re-bases) | each new pin fails when its behaviour breaks (deliberate break per clause, derived cases), the re-bases did not weaken N83 / B2 / #345 |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · no URL / address / name / text in any log line · the bridge protocol is frozen (no new verb) · no Core change · a store build has NO active [P1] path · bundle BEFORE shells.
- Accepted (do not re-open): A8 0.7 puts the light file-stamp time at 3.28:1 (the #1041 trade, Damir) · A11 (#1129, Damir picked "fade SENT too") · A10 Spixi C# only, no BE ask (#1128) · A7 BE only (#1126) · G-3 150 s kept (#1127) · the stamps are TEMPORARY (retire with `grep -rn "\[P1\]\|P1Perf\|SpixiP1\|p1\.js"`).

## 5 · Verdict
**CLEAN at r3** (#1129).

| Round | Reader | MAJOR | MINOR | NIT | Mutations (killed / run) |
|---|---|---|---|---|---|
| r1 | A — C# (Opus) | 0 | 4 | 8 | — |
| r1 | B — shells + CSS (Opus, Playwright + CDP on the built shells) | 0 | 3 | 10 | — |
| r1 | C — pins (Opus) | 3 | 6 | 5 | 2 / 9 |
| r2 | fresh reader (Opus) | 0 | 2 | 4 | 9 / 10 |
| r3 | fresh reader over the r2 fixes (Opus) | 0 | 2 | 4 | 10 / 14 (the 4 survivors = A12 timing, recorded) |

MAJORs (all r1, auditor C — the tests):
- **C-1** the C# grammar ran nowhere (2 integers pinned) → `P1Perf.cs` compiled into `scripts/csh` with SPIXI_DEV_COEXIST; 14 + 4 executed checks (CSH 26 → 44). Lesson L63.
- **C-2** the B2 re-base `[^\n]*` on raw source admitted a `return;` between the delete and its "ok" → the clause runs on stripCode, no gap.
- **C-3** N83 admitted `*SL{SpixiP1}` on a rule nothing enforced → the customStrings initializer must hold the seed and NO preprocessor line.

Recorded, not fixed: r1 A-M1 (owner relay re-pushes a delete — Core) · B-N7 (+29.7 KB CSS in settings/downloads — session-4 dial) · A-N4/N5/N6 (probe semantics: background windows, the fixed 24 ms drop threshold on 90/120 Hz, Runtime.enable replay timestamps — reader notes in the walk sheet) · B-N4 (`first=` blames any tap ≤ 2 s) · r2 NIT-4 (the store-build P1Perf bodies are compiled by no gate — the first Release build is the check) · r3 MINOR-1 (A12 pinned by source; timing = walk) · r3 NIT-2 (two quick open/close pairs inside 260 ms: the composer can lift ~200 ms early) · r3 NIT-3 (csh stubs `safe`; the real logSafe is not run there).

Final numbers: smoke BASELINE OK 5095 / the 2 KNOWN (#136 · B3) · CSH pass=44 · build-shells / extract-strings / legal-docs / icons --check ✓ · i18n-lint ✓ · verify-locales ✓ · cs-syntax-check clean. The post-r3 fix (stack capture 0 + the 16 KiB cap, one CDP call in its own try) is a compile-read + smoke-verified change.
