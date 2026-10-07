# Review brief — Session 10 (the S9 walk fix round) · DECISIONS #1254

## 1 · What landed
Tree: `/home/claude/wM` (base f5c1f9a6 + the S10 merge, uncommitted; `git -C /home/claude/wM diff` / `git status`). Contract:
`/tmp/claude-0/kit/CONTRACT-S10.md` (READ IT — it is the spec). Ixian-Core read-only at `/home/claude/Ixian-Core` (097341a).
| Item | Where |
|---|---|
| P1 paste/attach STRIP (replaces the S9 preview sheet; append batches; 🟡 `ixian:mediaDrop:<16hex>:<k>`) | `src/components/media-strip.js/.css`, `src/shells/chat.html`, `src/components/composer.js`; C# `Pages/Chat/SingleChatPage.xaml.cs` media region, `Utils/S10MediaRules.cs`, `Utils/PhotoRules.cs` |
| F1 chat-open grey frame (no `_webView.BackgroundColor` writes on the Android chat) + `[P1] hold nbg` probe | `Utils/SpixiContentPage.cs` |
| F4 haptics probe + Vibrator fallback + VIBRATE | `Utils/SpixiContentPage.cs`, `Platforms/Android/AndroidManifest.xml` |
| P2 50 MB free send cap, receive = largest tier 100 MB | `PhotoRules.cs`, `SingleChatPage`, `Data/TransferManager.cs` |
| F2 grid: Download all (n), tappable +N, group reply display "📷 n photos", viewer Reply | `chat.html`, `media-bubble.js/.css`, `media-viewer.js` |
| F3 deleted-photo excerpt (read side + clearDeletedLast + live count) | `ChatHeal.cs`, `CoreMessageWriter.cs`, `UIHelpers.cs`, `HomePage.xaml.cs`, `S10FixRules.cs` |
| F5 toasts full width, 4 lines, longer duration | `toast.css`, `toast.js` |
| F6 wallet pre-push after bootDropped + probes | `HomePage.xaml.cs` |
| F7 part files → `Downloads/.partial` + sweep; From sheet option C with avatars (🟡 push `setDownloadAvatars`) | `TransferManager.cs`, `DownloadsIndex.cs`, `SettingsPage.xaml.cs`, `settings-app.js`, `settings-shell.js/.css`, `settings.html` |
| P3 owner's created line = 2 lines | `S9FixRules.cs`, `HomePage.xaml.cs`, 13 `lang/*.txt`, `chat.html` (.chat-event pre-line) |
| P4 chats excerpt 1 / 2 lines (default 2, flow layout), setting in Chat appearance, key `spixi.chat.previewlines` | `settings-screens.js`, `settings.html`, `home.html`, `chatlist-item.js/.css` |
Tests: `scripts/pins-s10/*.mjs` (a/b/c/d), `scripts/csh/S10MediaTests.cs`, `S10FixTests.cs`; re-based: `pins-s9/a1-wiring`, `a3-wiring`, `b1-sheet` (rewritten), `b2-polish`, `pins-s4/cs`, `pins-s6b/cs`, `pins-s7/shell`, `csh/S9MediaTests`, `S9FixTests`, inline smoke (`grep -n "S10" scripts/smoke-test.mjs`).
Green: smoke after the merge = BASELINE OK except 3 re-base misses, fixed by the lead (row-title weight revert in settings-shell.css:269, pins-s9/a1-wiring M8, a3-wiring D-04) — final smoke after #46 · CSH pass=295 fail=0 · every --check gate.

## 2 · How to run (READ-ONLY reviewers: do NOT run scripts/smoke-test.mjs, do NOT edit /home/claude/wM)
Single pin modules: copy the tree first (`cp -a /home/claude/wM /tmp/claude-0/<you>-copy`), then `/tmp/claude-0/kit/make-runner.sh <copy>` and `node <copy>/scripts/_run-pins.mjs <copy> pins-s10/c-strip …`. csh: `node scripts/run-csh.mjs` in YOUR copy (≈ 3 min, at most once). Mutations only in your copy.

## 3 · Scopes (disjoint)
- **R1 — C# compile-read + threading + Android API lifetimes + security** (SingleChatPage media region incl. append/finishPick/onMediaDrop races, SpixiContentPage F1/F4, PhotoRules, TransferManager part files + sweep (never delete a live transfer's part, leaf-named), HomePage F3/F6, ChatHeal/CoreMessageWriter/UIHelpers, DownloadsIndex avatars, SettingsPage, S9FixRules, lang files format). Every API name/overload against net10.0-android / MAUI 10.0.71 (uncompiled code!). The handover gate: does S10 introduce any exposure absent at the baseline?
- **R2 — chat shell** (media-strip, chat.html P1 / F2 / P3, composer.js, media-bubble, media-viewer, toast): every strip exit (send, last ✕, Esc, back, chat switch, lock, doc reload, a newer batch, a mediaPicked while sending) answers C# exactly once; verb shapes match the C# parser; a11y (names, focus after ✕/send/close, keyboard); RTL; both themes; desktop; the reply-context rule; caption cap; Download all (double tap, partial progress, gone members).
- **R3 — other shells + tests** (settings-app/shell/screens, settings.html avatars validation, home.html P4 head script, chatlist-item 2B CSS incl. swipe / requests / desktop; then ALL new + re-based pins and csh tests: does each fail when its behaviour breaks? deliberate breaks — budget 25; are re-based pins weakened?).

## 4 · Must hold
CLAUDE.md ★ rules · bridge frozen except the 🟡 items in the contract · C# names its own files; WebView sends ids/digits/caption only · logs fixed words + exception types · the old wire unchanged (the group reply wire = the first photo's quote line) · no Core change. Accepted dials (do NOT re-open): strip A, camera into the strip, P3 wording, F6 pre-push, F7 option C + part folder, F4 respect the setting, P4 2B / default 2 / Chat appearance.

## 5 · Verdict — CLEAN at r4 (#1257)
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | R1 C# | 0 | 7 (M2 = security gate: a peer-named file the sweep would delete) | 4 |
| r1 | R2 chat shell | 0 | 8 | 6 |
| r1 | R3 other shells + tests (21 mutations, 10 survivors) | 0 | 11 | 6 |
| r2 | fresh | 2 (`CreateForUsage((int)…)` does not compile · the drop filter hid a re-added photo) | 3 | 6 |
| r3 | fresh | 1 (the r2 forget loop never fired: C# pushed nothing on a drop) | 0 | 0 |
| r4 | fresh | 0 | 0 | 3 |
Fixes: r1 by the 4 build agents in fresh copies (45 breaks, 0 survivors); r2 + r3 by the lead (enum overload; forget loop; `@supports` for the name cap; `mediaDropped` push; pins c-readd / a-wiring / d-preview — each break killed). Recorded, not fixed: the list in #1257. Final: smoke BASELINE OK 5604 / the 2 KNOWN · CSH 299. Lessons L101–L103.
