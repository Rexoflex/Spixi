# Review brief — session 8 (#1229–#1236)

Work order for the #46 adversarial loop. Verdict goes into §5 when the loop closes.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| Mailbox probe | dev-only `[P1] push fetch got/new/rep/reid/ran/codes` | `Spixi/Utils/PushFetchProbe.cs`, `Network/StreamProcessor.cs` (receiveData top), `Meta/Node.cs` loop, `Platforms/{Android,iOS}/SPushService.cs` | #1229 |
| Groups | added-to-group line id {6}; owner-only group avatar receive; owner photo change (`ixian:groupPhoto`); #1204 (b) N = 11 | `Utils/UnreadRule.cs`, `Utils/GroupAvatarRule.cs`, `StreamProcessor.cs`, `Node.cs`, `Pages/Contacts/ContactDetails.xaml.cs`, `src/components/chat-info.js` (+css), `src/shells/contact_details.html`, `src/shells/chat.html` (sysline chip) | #1231 |
| Reactions | 6 quick emoji; `react:<id>:<i>`; `like:<emoji>:<n>;` push; untrusted-emoji filter (C# + shell) | `Utils/ReactionSet.cs`, `Pages/Chat/SingleChatPage.xaml.cs`, `src/shells/chat.html`, `src/components/message-menu.js`, `reactions.js`, css | #1232 |
| Mini-app | Join → appRequestAccept; `ixian:appDecline` silent reject; stored declines both sides; localStorage family removed | `Utils/AppInviteRules.cs`, `Meta/SAppDeclines.cs`, `SingleChatPage.xaml.cs`, `HomePage.xaml.cs` (onJoinApp), `MiniAppPage.xaml.cs` (sessionIdFor), `StreamProcessor.cs`, `SettingsPage.xaml.cs` (wipe), `src/shells/chat.html`, `typed-bubbles.js` | #1233 |
| Privacy | receipts / typing / hide-online prefs + verbs + caps + echoes; reciprocal effects; capability id `spixi.presence-hidden.1` | `Meta/SPrivacyPrefs.cs`, `Utils/PrivacyRules.cs`, `Utils/PresenceDisplay.cs`, `Utils/SpixiProtocols.cs`, `SettingsPage.xaml.cs`, `SingleChatPage.xaml.cs`, `HomePage.xaml.cs`, `StreamProcessor.cs`, `src/shells/settings.html`, `settings-screens.js` | #1234 |
| Light-dismiss | `blurDismiss` + one desktop window-blur listener; flags on 7 quick surfaces + bot channel selector | `src/components/overlay.js`, `sheet.js`, `chats-row-menu.js`, `attach-sheet.js`, `apps-menu.js`, `shared-items.js`, `member-sheet.js`, `message-menu.js`, `reactions.js`, `src/shells/chat.html` | #1235 |
| Reply excerpt | excerptKind `reply` + glyph + SR prefix | `HomePage.xaml.cs`, `src/shells/home.html`, `chatlist-item.js` (+css) | #1236 |
| Strings | 7 shell keys + 1 C# key, 12 locales (AI drafts) | `src/strings/draft/*.json`, `Spixi/Resources/Raw/lang/*.txt` | N4 |
| Pins | `scripts/pins-s8/*` (10 modules), `scripts/csh/S8RulesTests.cs` (+14), re-base `pins-s6b/cs.mjs` 7b [P1] guard | | |

Not built: disappearing messages (v1.1, #1230), group rename (v1.1, #1230).

## 2 · How to run
- Tree: container `/home/claude/s8/M/Spixi` (= fe86a846 + the S8 working-tree diff), Ixian-Core @097341a sibling present.
- Pipeline: FULL (extract-strings → build-locales → build-strings-iife → build-demo-bundle → build-shells). All `--check` gates OK, verify-locales OK, i18n-lint OK.
- `node scripts/run-csh.mjs` → `CSH pass=222 fail=0`. Smoke: see §5 (one full run at a time — reviewers do NOT run the full smoke).
- Single pin module runner: smoke prelude + module (see how `scripts/pins-s8/ui-kit.mjs` / `pins-s7b/s1-boot.mjs` boot).
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Auditor scopes (disjoint)
| Auditor | Scope | Focus |
|---|---|---|
| A | all C# in the diff | compile-level read (types, namespaces, overloads, nullable, `#if` platforms, `goto case`, internal Core types), threading (probe sets, decline store, ask cache), Core API use verified at Ixian-Core source, the "C# touches no risky parts" fence, verb validation, untrusted peer input (emoji, group avatar sender, appRequestReject from a peer), what an OLD app sees on the wire |
| B | shells + components + css + strings | behaviour on the built shells, the frozen bridge grammar (every verb sent = a C# handler), push formats match C# (reactions, app_state, echoes, excerptKind), the security-gate triggers (sinks: textContent only, no new storage key, no remote fetch), a11y (pressed/disabled, SR prefix, badge name, focus after jump), both themes, desktop vs mobile for blur |
| C | tests | every new pin / csh test fails when its behaviour breaks (deliberate breaks, derived cases — mutation budget 30), the re-based `pins-s6b/cs.mjs` guard is not weakened, registration (pins run once, not inside another loop), gaps: behaviours with no pin |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221; light-dismiss = per pane, no cross-pane JS) · WebView composes, C# signs · no WebView path into a file op (group photo: C# picker, bytes in memory, no temp file) · no URL / address / name / text / hash / id in logs · bundle BEFORE shells · no Ixian-Core change · bridge verbs new = 🟡 + gate row (§S8 of `docs/security-handover-gate.md`).
- Accepted (do not re-open): 6 quick emoji only (#1232) · reciprocal receipts / online / typing (#1234) · silent reject, group Decline local only (#1233) · N = 11 (#1231) · blur-close risk from C# `Focus()` and Alt-Tab (#1235) · R1 wording (#1236) · the probe's 50 ms cooldown heuristic (#1229) · no rename, no disappearing (#1230).

## 5 · Verdict

### S8 core (#1229–#1236) — **CLEAN at r5**
| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | A C# · B shells · C tests (31 mutations, 8 survivors) | 5 | 9 | 16 | fixed by 3 fixers in fresh copies + lead |
| r2 | fresh | 0 | 3 | 6 | fixed (bot-room chatStream forge · letter-like symbols · line time) |
| r3 | fresh (131-case C#/shell parity) | 0 | 4 | 6 | fixed / recorded (BE: offline group photo) |
| r4 | fresh (full code-point parity) | 0 | 4 | 4 | fixed — the emoji DISPLAY became an allow-list (same class 3×, #46 step 9) |
| r5 | fresh | 0 | 2 | 6 | both wording → fixed in #1231 / #1234 |

MAJORs (r1): (1) `PushFetchProbe.cs` named `IXICore.StreamMessage` with only `using IXICore.Streaming` (ImplicitUsings off) → CS0246 on every target; the csh stub sat in the wrong namespace and hid it — fix: the using + the stub moved (lesson: a stub must live in the real namespace). (2) receipts OFF → group detail "Nobody has seen this yet" (false) — `setReadReceipts` to the chat + no seen sentence while off. (3) a `public` key constant let any file name the key (pin laundering) → private + use count. (4) N = 11 untested past 11 → n = 12 case. (5) cs-wiring pinned words not predicates → pure helpers + csh.

### S8 picks (#1237–#1240) — **CLEAN at r4**
| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | A C# · B shells + tests (20 mutations, 6 survivors) | 2 | 9 | 13 | fixed (Q-S, Q-C) |
| r2 | fresh | 0 | 3 | 9 | 2 fixed by the lead, 1 recorded (sent wave trade-off) |
| r3 | fresh | 0 | 2 | 4 | fixed — the lead's r2 hint fix was cancelled by a later `white-space: normal` in the same rule; the pin now reads the LAST declaration |
| r4 | fresh | 0 real (1 reported = the reader's own unrestored break, file mtime 10 min after the copy; the delivered tree is clean) | 0 | 4 | its 2 proposed pins added + broken on purpose |

MAJORs (r1): a group voice bubble 18 px past the log at 320 px (min-width beat max-width) · every history clip "unplayed" after a reopen (heard was per document) → accent only for clips that arrived live.

Final numbers: smoke BASELINE OK 5461 / 2 KNOWN · CSH 236 · chat.html 872 044 chars (CHAT_KB_CEIL 853) · ⚠ C# uncompiled.
