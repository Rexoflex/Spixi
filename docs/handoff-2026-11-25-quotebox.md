# Handoff 2026-11-25 — quotebox: the Windows quote box of REPLY C — mechanism only, no fix, a walk owed

Read this FIRST, then DECISIONS #2010–#2012 and `docs/quotebox-mechanism.md`. Number block of this session:
#2010–#2019 (used: #2010–#2012; #2013–#2019 stay empty) · lessons L309–L312 (used: L309) · packets P109–P110 (none used).
The main chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/quotebox` · base: `redesign/frontend` @ `0eda93f5` "Merge pull request #28 from Rexoflex/work/walktools2" ·
  push: made AFTER this commit, each commit read back through the GitHub API (#1546 (3)) · pull request: Damir opens it with
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/quotebox?expand=1` (the title and the description to
  paste: `claude/session-quotebox-status.md`) · merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): not run at the time of this commit — it runs on the pull request that Damir opens.
- Smoke: `BASELINE OK — 7054 pass / the 2 KNOWN` on the base (cloud twin + Ixian-Core @ `097341a`, `npm ci` on the committed
  lock: jsdom 29.1.1, `TZ=America/Los_Angeles`); the final tree: see #2012 (delta +0: no pin, no smoke row) · CSH 908.
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (291 files). Not run: the FULL
  pipeline, `extract-strings`, `generate-icons`, `build-legal-docs`, `i18n-lint`, pseudo, `verify-locales`, `pin-sweep` —
  no `src/**`, string, icon, legal or pin file changed.
- Review: § 5 of `docs/review-brief-quotebox.md` · models: lead Claude Opus; no builder agent; readers Claude Fable 5.2
  (security-only) and Claude Opus (claims).
- ⚠ C# UNCOMPILED: none (no C# changed).
- New files: `docs/quotebox-mechanism.md`, `docs/contract-quotebox.md`, `docs/review-brief-quotebox.md`,
  `docs/walk-quotebox.md`, `docs/handoff-2026-11-25-quotebox.md`, `scripts/pins-quotebox/harness-seed57.mjs`.
- Size (R1 / R3): app C# **+0** code lines (budget +40), hand-written `src/**` **+0** (budget +80); app C# at the base
  64,368 code lines · 22,004 comment-only lines (the counter of the inventory § 13.1 re-built in this session: Pygments
  `CSharpLexer`, a line with a code token or a preprocessor line = code; it gives 63,925 at `23c9c495`, the inventory's
  number) · 39 switches (+0) · 10 app C# files over 1,500 lines (none grew; `SingleChatPage.xaml.cs` 10,695 and
  `src/shells/chat.html` 10,053 unchanged).
- Still owed: the walk rows of `docs/walk-quotebox.md` (Windows Ctrl+F5 + Android, on the build Damir already has); then
  the fix batch by the cause the walk shows.

## 1 · What this session did
| Item | Result | Evidence |
|---|---|---|
| 1 mechanism | not reproduced off the device; in Chromium all four replies jump with the mouse; three inputs give "no reaction, no toast" (C#'s fallback box · an unanswered jump whose toast a landing older page cancels · a full repaint of the log inside a mouse press); four likely causes | `docs/quotebox-mechanism.md` § 0–§ 5; `scripts/pins-quotebox/harness-seed57.mjs` (nine runs, § 2 of the mechanism); CSH `WalkTools2SeedTests.cs:185-188`; #2010 |
| 2 fix | not built (no proven cause; the prompt) | #2011 |
| 3 walk rows | Q-0, W-BUILD, Q-W1 … Q-W5, A-BUILD, A-1 | `docs/walk-quotebox.md` = the Artifact "Spixi walk — quotebox" |
| 4 size | +0 / +0 | § 0 |

## 2 · Walk
Sheet: `docs/walk-quotebox.md` = the Artifact "Spixi walk — quotebox", https://claude.ai/artifact/9r32SVQYJDpMpbYC1XbeZu
(9 rows: Windows Ctrl+F5 and Android, no new build). Result: owed.

## 3 · Proposed next steps (the main chat decides)
Outcome: on Windows a click on the quote box of any reply jumps to the quoted message, as on Android.
1. Damir walks `docs/walk-quotebox.md` (about 15 minutes, no build).
2. Cause 1 shown (no sender line, no hand, on REPLY B of the same open too) → a small C# batch at the OPEN's one deeper
   read (`prefetchReplyDeep`, `SingleChatPage.xaml.cs:2363-2390`: a short or failed read is cached for the whole document
   today), behind its own switch (#1478), with a pin and a deliberate break.
3. Cause 2 shown → the same kind of batch on the jump path: 2a (dropped before any rows came: `onQuoteJump`
   `:2773-2776`, `:2781-2786`, `requestJump` `:5659`, `applyPendingJumpWindow` `:5674-5682`) or 2b (the rows came, the
   `jumpToMessage` was lost: `pushPendingJump` `:5715-5737`), and the page's toast wait that any prepend cancels
   (`chat.html:7327`). The walk decides neither: the main chat reads the notes and Q-W5's `shell older insert rows=` lines
   at the click times with the signatures of `docs/quotebox-mechanism.md` § 5.
4. Either of them with `Cannot open chat file.` in the log → also a BE question about Core's read-write open of chat files
   (Ixian-Core `LocalStorage.cs:494-503`; Core is BE-only).
5. Cause 3 shown (no menu on a right-click) → a Windows mechanism session on the native layer over the chat pane (3a) or the
   WebView2 input path (3b).
6. Cause 4 shown (a `rows=50 … mode=full` page in the same second as a failed click, no larger line before the next) → a
   page batch: an older page that would repaint the whole log under a pressed mouse waits for the release (or keeps the
   pressed row), behind its own cap switch; the wait never frees on a timer alone (L157).
Every fix: the existing pushes only; a new switch (a stored key and a `[FLAGS]` word), a cap switch (a `setCaps` word), a
WebView setting, a new log line or push — each is a gate trigger with its gate row and packet (#1312).

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | Walk the rows of `docs/walk-quotebox.md` now (no build), or fold them into the next walk of another batch | the fix batch |
| Damir / main chat | The walk sheet decides no cause: its decision table was parked by rule 9 (#46 r3 and r4 each found a picture it misread). (a) the main chat reads the notes with § 5 of the mechanism (recommended); (b) a later docs batch builds a decision table with its own #46 loop; (c) a short device session with a log tail (through line L's filter) reads the case live | how the walk result is read |

## 5 · Recorded, not changed
- Core's `readMessagesFile` opens a chat file with read-WRITE access and returns an empty list on any open error
  (Ixian-Core `Streaming/Storage/LocalStorage.cs:494-503`) — Core is BE-only; it matters only if the walk shows
  `Cannot open chat file.`.
- `prefetchReplyDeep` caches a short or failed read for the whole document (`SingleChatPage.xaml.cs:2385-2389`) — the likely
  place of a fix for cause 1; `onQuoteJump` returns with no line when busy or when its read misses (`:2773-2786`) and the
  page's toast wait ends at any prepend (`chat.html:7327`) — the place for cause 2. Not changed without the walk.

## 6 · Lessons (also appended to docs/lessons.md)
- L309 — a quote box with no reaction and no toast has more than one source (C#'s fallback box; an unanswered jump whose
  toast a landing older page cancels; a full repaint inside a mouse press); on the device read the sender line and the
  pointer first, click several times kept still, and read the page's per-page log line (#2010, #2011).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
This batch changes no app file: the walk needs no build of this branch (the build of `0eda93f5` is the walk's build).
To read the branch:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git log --oneline -5 origin/work/quotebox
```
Normal path (#1546): the session pushed `work/quotebox`; Damir opens the compare link of § 0, checks "base repository:
Rexoflex/Spixi · base: redesign/frontend" and clicks "Create pull request" with the pasted title and description.
Merge: "Create a merge commit" (#1505). Do NOT use the link that `git push` prints (`…/pull/new/work/quotebox`).
