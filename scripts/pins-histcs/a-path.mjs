/* ==== histcs · A — History C#: P-28 (an older page read and built off the UI thread), HV-5 (the first older page holds 50 rows); the path.
 * Contract docs/contract-histcs.md § 2 / § 3 / § 4; mechanisms docs/histcs-mechanisms.md.
 *
 * LIMITS — read first (DECISIONS 1735 / 1627: the limits of a source pin are stated, not hidden). This is a SOURCE pin. The BEHAVIOUR
 * runs in the C# harness (scripts/csh/HistcsTests.cs, over the REAL SpixiFlags.cs: the switches, nextShow, the busy guard, schedule,
 * decide, the push gate with real threads, the line builders). SingleChatPage.xaml.cs is a MAUI file the cloud cannot compile, so this
 * module reads its TEXT. What it does NOT catch:
 *   · anything at RUN time: that loadMoreIn is reached, that the task runs on a pool thread, that the gate is held while the pushes post,
 *     that a drop really pushes nothing, that no deadlock exists, the order of a live arrival against a prepend — the csh gate tests and
 *     the walk rows of docs/walk-histcs.md prove what can be proven; the rest is stated in histcs-mechanisms § 5;
 *   · deliberately hidden code: a masked `#define` / `#if` trick, a `using X = …;` alias, a type that shadows HistoryOlderRules /
 *     HistcsFlags / OlderBusy / OlderPushGate / Volatile / Interlocked, a second partial of SingleChatPage that adds a caller (a
 *     `partial` of this class in another file is not read), reflection by a name built from pieces, a csproj `Compile Remove`, an
 *     identifier written with a `\u` escape or with a Unicode format character;
 *   · a C# 11 raw string literal (`"""…"""`) — the comment mask does not know it; SingleChatPage.xaml.cs and SpixiFlags.cs have none
 *     today, one would make a7 / a8 differ from the base and fail closed;
 *   · a call written another way than the text pinned here (a method group, a delegate, a local function, `this.` in front, a helper
 *     that calls `takeOlderJob` or writes `olderJobPending`): the NAME counts (a6) are exact over the code of THIS file only;
 *   · the Ixian-Core files (Friend.getMessages and its cache rule — the D-18 check is evidence in histcs-mechanisms § 6, not a pin) and
 *     the platform SDK;
 *   · files other than Spixi/Pages/Chat/SingleChatPage.xaml.cs and Spixi/Utils/SpixiFlags.cs (b-lines.mjs reads the rest).
 * Comments are masked first (comments → spaces, newlines kept, strings kept; the coldstart1 / photo1a / defaultsb mask, copied here so
 * that this module stands alone); brace walks use a second mask that also blanks string contents. Texts are compared after whitespace
 * collapse (`norm`), so a line break or an indent is free; a comment is free (masked) in SingleChatPage.xaml.cs, NOT in SpixiFlags.cs
 * (a8 holds that file with its comments).
 * BASE = 338d30f4 (`redesign/frontend`). The three SHA-256 values in BASE below are FROZEN CONSTANTS, computed from the BASE text of the
 * two files by the functions exported here (the pin runs in CI and on tree copies with no git):
 *   onLoadMoreBody = sha256( onLoadMoreBody(<SingleChatPage.xaml.cs at the base>) )   — the EXACT raw text between the braces of
 *                    `private void onLoadMore()` (comments and indents included; a BOM stripped first, CRLF → LF),
 *   sclRest        = sha256( sclRest(<SingleChatPage.xaml.cs at the base>) )          — the whole file, comments masked, whitespace
 *                    collapsed, with the histcs region and insertions taken out (see sclRest below),
 *   flagsRest      = sha256( flagsRest(<SpixiFlags.cs at the base>) )                 — the whole file as raw text, whitespace
 *                    collapsed, with the histcs block taken out (see flagsRest below; it also cuts a `HistcsFlags.read();` line, but
 *                    since the merge change M1 no such line exists — init() is untouched and a8 fails on one).
 * `baseHashes(sclText, flagsText)` (exported) returns the three values. At the base every cut is a no-op, so a later re-base after a
 * reviewed edit of an untouched part is the same call over the new text — only after a look at the diff (the #1653 way).
 * ★ histcs #46 r1: the NEW code is held too (a11): `regionHashes(sclText)` (exported) returns the three values in NEW (the region, the
 * body of pushPendingJump, the list of the `★ histcs` statements of loadMessages / insertMessage(…, batch) / UiBatch / applyPendingJumpWindow), frozen over the
 * round-1 fix — re-based after a look at the diff (#46 r2: re-based again after a look at the diff, the round-2 statements added). sclRest cuts the new single statements (CUTS) and puts back the two base texts the
 * fix replaced (REPLACES: insertMessage's file-row add, pushPendingJump's take), so a7 still equals the base value.
 *
 * KEYS (each ONE `ok`):
 *   a1 branch    — onNavigating's `ixian:loadmore` branch is ONE statement `loadMoreIn();`; `onLoadMore();` is called nowhere else but
 *                  loadMoreIn's OFF route; outside every `#if`
 *   a2 baseBody  — onLoadMore()'s body (exact raw text between its braces) = the base: SHA-256 frozen
 *   a3 order     — loadMoreIn: line → flags line → (two locals) → the OFF route `onLoadMore(); return;` BEFORE any other statement → the
 *                  page's token `object busyOwner = new object();` → the P-28 guard `tryEnter(busyOwner)` → nextShow → the job (with the
 *                  token) → (HV-5 only: bind + loadMessages inline) → schedule(olderBusy, job.owner, …); the job binds INSIDE the lambda
 *                  before loadMessages(); schedule is the last statement; the new members sit directly after onLoadMore(), before the
 *                  `#1166 B2` comment
 *   a4 members   — ★ r4: + olderLatePushes / olderDrainLate (the bounded drain, a type-only warn), olderPushed = marker post, exit, clear, leave, drain; olderPostBehind with the try / catch round the post.
 *                  OlderJob (+ owner, jumpSeen, r3: markerDue) / olderBusy / olderGate / olderJobPending / olderPushing / olderPostsPending (r3) / takeOlderJob / olderMayPush /
 *                  olderPushed / olderPostMarker / olderDeferBehindPage / olderPostBehind (r3: the delivery order) / olderClosedEarly (r2: + the channel test; r3: + the read channel) / olderFallbackDrop (r2) / beginLoadScope: the contract's text (thread test before the CompareExchange; enter →
 *                  counters → decide in the contract's argument order; the keep marks olderPushing; the one exit and the owner's leave on
 *                  the drop path; olderPushed = exit + clear + leave; olderClosedEarly exact; beginLoadScope's two lines)
 *   a5 inserts   — ★ r4: + deleteMessage's and updateMessage's late-repeat statement (`lateRepeats`; both are CUTS of a7).
 *                  loadMessages: the six insertions (i)-(vi) in place, each with its neighbours, + the round-1 statements (the jump seen
 *                  at (i); the early close before `UiBatch batch`, the deferred list after the batch's prefetch block; the deferred add at the KEEP point (r2: `&& json != null`);
 *                  r2: `olderFallbackDrop` directly after the `if (prepend) {…}` anchor block inside the build's lock; applyPendingJumpWindow's `olderBusy.held` statement between the widening block and `if (reload)`);
 *                  insertMessage's file-row wrap; the UiBatch field; olderMayPush before BOTH anchor writes; olderPushed after the push
 *                  block; the new statements outside every `#if`; r3: `olderDeferBehindPage(olderJob)` directly after the jumpSeen statement (before the
 *                  `One row MORE` block / `int window = want + 1;`), `olderClosedEarly(olderJob, readChannel)`, pushPendingJump's first statement the deferral
 *   a6 names     — ★ r4: `olderDrainLate(` three, `olderLatePushes` five (`.Enqueue(` two — deleteMessage and updateMessage — `.TryDequeue(` one), `olderBusy.held` three.
 *                  The exact count table of the new names over the code of the file (takeOlderJob called ONCE; olderJobPending written
 *                  only by the two Volatile.Write in loadMoreIn and the CompareExchange in takeOlderJob; olderPushing written only in the
 *                  region; the gate / busy (four owner leaves, r2) / rules calls; jumpArmedId by `ref` twice; deferredFileRows six times;
 *                  r2: olderFallbackDrop( twice, olderBusy.held once, OlderDrop. five times;
 *                  r3: olderPostsPending six times and written only in the region, olderPostMarker( three, olderDeferBehindPage( two, olderPostBehind( three, markerDue three,
 *                  MainThread.BeginInvokeOnMainThread( only in olderPostMarker and olderPostBehind within the region, Task.Run( twice in the region)
 *   a7 sclRest   — the rest of SingleChatPage.xaml.cs (the file minus the region of a3 / a4, the insertions of a5 and the one branch
 *                  statement of a1, with the two replaced base texts put back) = the base: SHA-256 frozen
 *   a8 flagsRest — SpixiFlags.cs minus the histcs block = the base: SHA-256 frozen; init() is untouched (it still ends with
 *                  `readPhoto1b(); readFixb4();` — the merged base 8ce1215d, re-based 2026-11-23), there is NO `HistcsFlags.read();` line (contract § 6 M1: the switches are read lazily, once, at
 *                  their first use — HistcsFlags.ensureRead) and no line outside the block names HistcsFlags
 *   a9 block     — the histcs block holds exactly seven types (HistcsFlags, OlderDrop, HistoryOlderRules, OlderBusy, OlderPushGate + its
 *                  nested Ticket and its private OtherLoad); it names no Logging / P1Perf / bridge / task / thread / file word, reads three
 *                  preferences and writes none; OlderBusy is OWNER-aware with `Interlocked.CompareExchange(ref …)` in both transitions (held
 *                  by SOURCE: the csh break m18, a non-atomic tryEnter, is this key's); schedule leaves twice, both by its owner
 *   a10 harness  — csh holds HistcsTests.cs with its 43 tests, compiles the REAL SpixiFlags.cs, no `Compile Remove`, no copy of the types
 *   a11 regionWhole — ★ #46 r4: 21 → 23 statements (+ deleteMessage, updateMessage); the three frozen hashes re-based after a look at the diff (r2, r3, r4).
 *                  ★ #46 r1: the NEW code, whole: the region (loadMoreIn + members), pushPendingJump's body and the list of the 21
 *                  `★ histcs` statements of loadMessages / insertMessage(…, batch) / UiBatch / applyPendingJumpWindow, each by a FROZEN SHA-256 (regionHashes,
 *                  re-based after a look at the diff (#46 r2): the round-2 code added the fallback drop (loadMessages), applyPendingJumpWindow's statement,
 *                  the channel test of olderClosedEarly and the keep point's `&& json != null`; 18 → 20 statements;
 *                  re-based after a look at the diff (#46 r3): the delivery-order code of mechanisms § 4 — see the NEW comment below; 20 → 21 statements)
 *
 * PLANNED BREAKS (#802; each ONE mutation in a COPY of the tree, run with --root, then restored; the key that must turn red; the lead runs them):
 *   a1: the branch statement `loadMoreIn();` → `onLoadMore();` [a1, a7]; a second statement `requestPrepend();` in the branch [a1, a7];
 *       the branch wrapped in `#if ANDROID` [a1, a7]
 *   a2: one comment word inside onLoadMore() changed [a2 only]; `messagesToShow += Config.messagesToLoad;` → `+= 1;` [a2, a7]
 *   a3: the OFF route moved below the guard [a3, a11]; `tryEnter(busyOwner)` → `tryEnter(new object())` [a3, a6, a11];
 *       `schedule(olderBusy, job.owner, …)` → `schedule(olderBusy, new object(), …)` [a3, a11]; `onLoadMore(); return;` → `onLoadMore();` (no return) [a3]; the flags line moved above
 *       the P1 line [a3]; `job.bindHere();` moved above the schedule call (outside the lambda) [a3]; `Volatile.Write(ref olderJobPending, job)`
 *       moved below `loadMessages();` in the lambda [a3, a6]; `nextShow(…, page50)` → `nextShow(…, false)` [a3]; the members moved to the end of
 *       the file [a3, a7]
 *   a4: `olderBusy.leave(job.owner);` deleted from olderPushed [a4, a6, a11]; `Volatile.Write(ref olderPushing, job);` deleted
 *       from olderMayPush's keep [a4, a6, a11]; olderClosedEarly's `ReferenceEquals(friend, job.chat)` dropped [a4, a11];
 *       `job.thread == Environment.CurrentManagedThreadId` removed from takeOlderJob [a4]; the argument order of decide swapped
 *       (`thumbDoc == job.doc` ↔ `ReferenceEquals(friend, job.chat)`) [a4]; a second `olderGate.exit(` added in olderMayPush's keep path [a4, a6];
 *       `ReferenceEquals(historyAnchor, job.anchor)` → `true` [a4]
 *   a5: the early-close line moved below `UiBatch batch = new UiBatch();` [a5, a7, a11]; the deferred-list line deleted [a5, a6, a7, a11]; the KEEP-point add moved above
 *       `if (!olderMayPush(olderJob, readChannel)) { olderJob!.zeroed …` [a5, a11]; insertMessage's else-branch deleted (the base add
 *       gone) [a5, a7, a11]; the jumpSeen line moved above `takeOlderJob()` [a5, a7, a11];
 *       `olderMayPush` removed from the empty branch [a5, a6, a7]; the main-branch check moved below `historyAnchor = new HistoryAnchor(…)` [a5, a7];
 *       `olderPushed(olderJob);` deleted [a5, a6, a7]; `takeOlderJob()` called a second time in loadMessages [a5, a6, a7];
 *       `bool olderLines = prepend;` → `= true;` [a5, a7]; the `using IDisposable? olderScope` → a plain local (no using) [a5, a7]
 *   a6: a second `Volatile.Write(ref olderJobPending, …)` in a new method [a6, a7]; `olderJobPending = null;` in loadMessages [a6, a7];
 *       `olderBusy.leave();` added in loadMoreIn [a6]
 *   a7: one character changed in a base method far from the change (e.g. onLoadMore's neighbour requestPrepend) [a7 only]; an `else`
 *       branch added to onNavigating's loadmore branch [a1, a7]
 *   a8: one comment word in SpixiFlags.cs outside the block changed [a8 only]; `HistcsFlags.read();` added as the last statement of
 *       init [a8]; `bool x = HistcsFlags.LoadMoreOffUi;` added in init [a8]
 *   a9: a `Logging.info(…)` inside HistcsFlags.read [a9]; an eighth type in the block [a9]; `Preferences.Default.Set(…)` in the block [a9];
 *       `using System.Threading.Tasks` use of `Task.Run` in the block [a9]; OlderBusy.tryEnter → `if (this.owner == null) { this.owner =
 *       owner; return true; } return false;` (m18) [a9]; OlderBusy.leave → `Interlocked.Exchange(ref this.owner, null)` [a9 (+ csh
 *       busy_guard_stale_leave…, schedule_leaves_with_its_owner_only)]; one `busy.leave(owner)` of schedule deleted [a9 (+ csh schedule_*)]
 *   r2 (planned breaks; run 2026-11-22 in a tree copy, red exactly as listed): the `if (olderFallbackDrop(olderJob, prepend)) { return; }` statement deleted from loadMessages [a5, a6, a11]; moved above the
 *       `if (prepend) {` anchor block [a5 only]; olderFallbackDrop's `ReferenceEquals(historyAnchor, job.anchor)` test dropped [a4, a11]; its `olderBusy.leave(job.owner);` deleted [a4, a6, a11];
 *       olderClosedEarly's `switched` test dropped [a4, a11]; the keep point's `&& json != null` dropped [a5, a7, a11]; applyPendingJumpWindow's statement deleted [a5, a6, a11];
 *       its `&& olderBusy.held` → `&& true` [a5, a6, a7, a11]
 *   a11 (the pushPendingJump break and the loadMessages break below were run on 2026-11-22: red exactly as listed): a statement added to olderPushed (e.g. `olderGate.exit(ref job.gateHeld);` twice) [a4, a6, a11]; the `if (id != null)` of
 *       pushPendingJump removed (the push unconditional) [a7, a11]; a new `// ★ histcs` statement `int x = 0;` in loadMessages (after `long flushMs = …`: [a5, a7, a11]; run 2026-11-22)
 *   r3 (the delivery order; run 2026-11-22 in a tree copy, red exactly as listed): the `Interlocked.Increment(ref olderPostsPending);` of olderMayPush's keep deleted [a4, a6, a11];
 *       `job.markerDue = 1;` deleted [a4, a6, a11]; the `olderPostMarker(job);` of olderPushed deleted [a4, a6, a11]; the one of the task's after step deleted [a3, a6, a11];
 *       a second one added there [a3, a6, a11]; the `if (olderDeferBehindPage(olderJob)) { return; }` of loadMessages deleted [a5, a6, a11]; moved above the `jumpSeen` statement [a5, a11];
 *       pushPendingJump's deferral deleted [a5, a6, a7, a11]; olderDeferBehindPage's `olderPostsPending <= 0` test dropped [a4, a6, a11]; olderPostBehind without `Task.Run(` [a4, a6, a11];
 *       a second `MainThread.BeginInvokeOnMainThread(` in the region [a4, a6, a11]; `e.GetType().Name` → `e.Message` in olderPostBehind's warn [a4, a11 (+ b-lines)];
 *       olderClosedEarly's `readChannel != job.channel` dropped [a4, a11]
 *   r4 (the late repeats of a delete / edit, the marker order; run 2026-11-23 in a tree copy, red exactly as listed): the `olderDrainLate();` of olderPushed deleted [a4, a6, a11]; of the task's after step deleted [a3, a6, a11];
 *       `olderPostMarker(job);` moved below `olderGate.exit(…)` in olderPushed [a4, a11]; olderDrainLate's `int n = olderLatePushes.Count;` bound dropped (`while (TryDequeue…)`) [a4, a11];
 *       `e.GetType().Name` → `e.Message` in its warn [a4, a11, b2]; deleteMessage's `HistcsFlags.LoadMoreOffUi &&` test dropped [a5, a7, a11]; updateMessage's statement deleted [a5, a6, a7, a11];
 *       a third `olderLatePushes.Enqueue(` outside the two [a5, a6, a7]; olderDeferBehindPage's `if (!isDisposed)` dropped [a4, a11]; olderPostBehind's outer catch warn changed [a4, a11, b2];
 *       deleteMessage's lambda push name changed [a5, a7, a11, b4]; a `Task.Run(` in olderDrainLate [a4, a6, a11, b4]
 *   a10: a `[TestMethod]` taken off one test of HistcsTests.cs [a10 only]; `<Compile Remove="HistcsTests.cs" />` in csh.csproj [a10 only]
 */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // the file as it is on disk

const count = (t, s) => t.split(s).length - 1;
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const sha = (s) => createHash('sha256').update(s).digest('hex');
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const words = (t, name) => (t.match(new RegExp('(?<![A-Za-z0-9_])' + esc(name) + '(?![A-Za-z0-9_])', 'g')) || []).length;

/* comments -> spaces (newlines kept); strings and char literals kept (strings = false) or their CONTENTS blanked too (strings = true) */
export const mask = (t, strings = false) => {
  const out = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const str = (i, verbatim, interp) => {
    const open = i;
    i++;
    const done = (e) => { if (strings) blank(open + 1, Math.max(open + 1, e - 1)); return e; };
    while (i < n) {
      const c = t[i];
      if (verbatim) {
        if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return done(i + 1); }
      } else {
        if (c === '\\') { i += 2; continue; }
        if (c === '"') return done(i + 1);
        if (c === '\n') return done(i);
      }
      if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
      i++;
    }
    return done(i);
  };
  const code = (i, hole) => {
    let depth = 0;
    while (i < n) {
      const c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
      if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
      if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); if (m && strings) blank(i + 1, i + m[0].length - 1); i += m ? m[0].length : 1; continue; }
      if (c === '"') { i = str(i, false, false); continue; }
      if (c === '@' && d === '"') { i = str(i + 1, true, false); continue; }
      if (c === '$' && d === '"') { i = str(i + 1, false, true); continue; }
      if ((c === '$' && d === '@' || c === '@' && d === '$') && t[i + 2] === '"') { i = str(i + 2, true, true); continue; }
      if (hole) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
      i++;
    }
    return i;
  };
  code(0, false);
  return out.join('');
};
/* the open preprocessor regions at a position: a stack of #if conditions (read on the comment-masked text) */
const regionsAt = (src, pos) => {
  const st = [];
  for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
    if (m[1] === 'if') st.push(m[2].trim());
    else if (m[1] === 'endif') st.pop();
    else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
  }
  return st;
};
/* the brace-matched block that follows `sig`: found on the string-blanked mask, returned from the comment mask (same length) */
const span = (code, bare, sig, from = 0) => {
  const at = bare.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
  const o = bare.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < bare.length; k++) { if (bare[k] === '{') d++; else if (bare[k] === '}' && --d === 0) return { at, open: o, end: k + 1, text: code.slice(o, k + 1) }; }
  return { at, end: -1, text: '' };
};

const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs', CSPROJ_F = 'scripts/csh/csh.csproj',
  TESTS_F = 'scripts/csh/HistcsTests.cs';

/* the texts of the change (contract-histcs § 3; comment-masked, whitespace-collapsed) */
const SIG_ONLOADMORE = 'private void onLoadMore()';
const B2_MARK = '/* ★ #1166 B2 (#1142';
const BLOCK_OPEN = '/* ★ histcs (History C#';
const BRANCH_OLD = 'else if (current_url.Equals("ixian:loadmore", StringComparison.Ordinal)) { onLoadMore(); }';
const BRANCH_NEW = 'else if (current_url.Equals("ixian:loadmore", StringComparison.Ordinal)) { loadMoreIn(); }';
const BRANCH_RE = /else if \(current_url\.Equals\("ixian:loadmore", StringComparison\.Ordinal\)\)\s*\{\s*loadMoreIn\(\);\s*\}/g;

const N1 = 'if (P1Perf.enabled) { P1Perf.line(HistoryOlderRules.LoadMoreInBody); }';
const N2 = 'if (HistcsFlags.takeFlagsLine()) { Logging.info(HistcsFlags.flagsLine(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50)); }';
const N3 = 'if (!HistoryOlderRules.usesNewPath(offUi, page50)) { onLoadMore(); return; }';
const N5 = 'messagesToShow = HistoryOlderRules.nextShow(messagesToShow, Config.messagesToLoad, page50);';
const N4 = 'object busyOwner = new object();';   // ★ histcs #46 r1 (S-3): the page's token for the OWNER-aware busy guard, right after the OFF route
const N4_GUARD = 'if (offUi && !olderBusy.tryEnter(busyOwner))';
const N6 = 'OlderJob job = new OlderJob(offUi, thumbDoc, friend, selectedChannel, historyAnchor, offUi ? olderGate.ticket() : default, busyOwner);';
const N7 = 'if (!offUi) { job.bindHere(); Volatile.Write(ref olderJobPending, job); try { loadMessages(); } finally { Interlocked.CompareExchange(ref olderJobPending, null, job); } return; }';   // lead (merge): a load that threw before it took the job leaves none behind
const N8 = 'HistoryOlderRules.schedule(olderBusy, job.owner, a => { Task.Run(a); }, () => { job.bindHere(); Volatile.Write(ref olderJobPending, job); loadMessages(); }, e => Logging.warn("loadmore: the older page failed (" + e.GetType().Name + ")"), () => { olderPostMarker(job); olderGate.exit(ref job.gateHeld); Interlocked.CompareExchange(ref olderJobPending, null, job); Interlocked.CompareExchange(ref olderPushing, null, job); olderDrainLate(); if (job.zeroed) { pushZeroedChatRow(); } });';   // lead (merge): + the clear of a job no load took · ★ histcs #46 r1: + the owner (S-3), + the clear of this job's pushing mark (F1) · r3: + the marker post (the empty-branch keep, or a throw after the keep) · ★ #46 r4: the marker post FIRST (O5 NOTE-5: under the gate, before the exit) and the late-push drain after the clears (S4 MINOR-1)

/* loadMessages: the six insertions, each with the neighbours the contract names */
const I_PRE = 'int want = (int)messagesToShow;';
const I_INS = 'OlderJob? olderJob = takeOlderJob(); if (olderJob != null) { prepend = true; } bool olderLines = prepend; using IDisposable? olderScope = beginLoadScope(olderJob);';
const I_JUMP = 'if (olderJob != null && olderJob.background) { olderJob.jumpSeen = Volatile.Read(ref jumpArmedId); }';   // ★ histcs #46 r1 (F1): directly after (i), after applyPendingJumpWindow(false)
const I_DEFER = 'if (olderDeferBehindPage(olderJob)) { return; }';   // ★ histcs #46 r3 (MINOR-1): directly after the jumpSeen statement of (i), before the `One row MORE` block
const I_POST = 'int window = want + 1;';
const II_PRE = 'bool anyReplyShaped = false;';
const II_A = 'long flushT0 = P1Perf.now();';
const II_MID = 'CoreMessageWriter.arrivals.beforeReread(arrivalKey, readChannel, CoreMessageWriter.instance);';
const II_B = 'long flushMs = P1Perf.msSince(flushT0);';
const II_POST = 'for (int pass = 0;';
const III_INS = 'if (P1Perf.enabled && olderLines) { P1Perf.line(HistoryOlderRules.olderReadBody(readPasses, window, P1Perf.msSince(readT0), flushMs)); }';   // lead (merge): its OWN block, directly before photo1a's `chat read` block (pins-photo1a/a-open holds that block whole)
const III = III_INS + ' if (P1Perf.enabled) { P1Perf.line(PhotoOpenRules.readBody(readRows, readPasses, P1Perf.msSince(readT0))); }';
const IV = 'if (messages == null || messages.Count == 0) { if (!olderMayPush(olderJob, readChannel)) { return; } historyAnchor = null;';
const IV_INS = 'if (!olderMayPush(olderJob, readChannel)) { return; }';
const V_INS1 = 'if (!olderMayPush(olderJob, readChannel)) { olderJob!.zeroed = zeroedUnread; return; }';
const V_DEFER = 'if (batch.deferredFileRows != null && json != null) { lock (fileRowsShown) { fileRowsShown.UnionWith(batch.deferredFileRows); } }';   // ★ histcs #46 r1 (F2): the KEEP point adds the page's file rows
const V_INS2 = 'if (P1Perf.enabled && olderLines) { P1Perf.line(HistoryOlderRules.olderPushBody(batch.items.Count, json != null ? json.Length : 0, buildClock.ElapsedMilliseconds)); }';
const V = 'json = null; } ' + V_INS1 + ' ' + V_DEFER + ' ' + V_INS2 + ' if (firstPushedId != null) { historyAnchor = new HistoryAnchor(firstPushedId, readChannel); }';
/* ★ histcs #46 r1: the early close (S-1) directly before the batch, the deferred file rows (F2) right after the batch's prefetch block */
const EARLY = 'if (olderClosedEarly(olderJob, readChannel)) { return; }';   // ★ histcs #46 r3 (S3 NIT-1): + the load's own read channel
/* ★ histcs #46 r2 (S2 MINOR-1/-2): the fallback drop — in the build's lock, after the `if (prepend) { … }` anchor block, before the unread zero; and (O3 M1) the one statement of applyPendingJumpWindow */
const FB = 'if (olderFallbackDrop(olderJob, prepend)) { return; }';
const FB_CTX = 'else { prepend = false; } } ' + FB + ' if (!prepend && friend.metaData.unreadMessageCount > 0)';
const SIG_AJW = 'private void applyPendingJumpWindow(bool reload)';
const AJW = 'if (reload && !widened && depth < SharedItems.JumpCap && olderBusy.held) { widened = true; }';
const AJW_CTX = 'widened = true; } ' + AJW + ' if (reload) {';
const DEFER_ON = 'if (olderJob != null && olderJob.background) { batch.deferredFileRows = new List<string>(); }';
const BUILD = 'string show_more = "true"; ' + EARLY + ' UiBatch batch = new UiBatch(); if (anyReplyShaped) { prefetchReplyDeep(readChannel); } ' + DEFER_ON + ' System.Diagnostics.Stopwatch buildClock';   // the deferred list right after the prefetch block (pins-s6b/cs holds the batch + that block adjacent)
/* ★ histcs #46 r1 (F2): insertMessage's file branch — the base `lock (fileRowsShown) { … Add … }` is the else-branch, word for word */
const FILE_BASE = 'lock (fileRowsShown) { fileRowsShown.Add(Crypto.hashToString(message.id)); }';
const FILE_NEW = 'if (batch?.deferredFileRows != null) { batch.deferredFileRows.Add(Crypto.hashToString(message.id)); } else { ' + FILE_BASE + ' }';
const FILE_CTX = 'noteOfferPreview(message, name, batch); ' + FILE_NEW + ' if (fileRowOnly) { return; }';
/* ★ histcs #46 r1 (F2): the UiBatch field, between its neighbours */
const UB_FIELD = 'public List<string>? deferredFileRows = null;';
const UB_CTX = 'public ReplyQuote.Index? replyIndex = null; ' + UB_FIELD + ' private readonly Dictionary<string, int> strIndex = new();';
/* ★ histcs #46 r1 (F1): pushPendingJump — the base `jumpArmedId = null;` → the background-page test + the atomic take */
const PPJ_SIG = 'private void pushPendingJump()';
const PPJ_BASE_MID = 'jumpArmedId = null;';
const PPJ_NEW_MID = 'OlderJob? pushingJob = Volatile.Read(ref olderPushing); if (pushingJob != null && pushingJob.thread == Environment.CurrentManagedThreadId && !ReferenceEquals(id, pushingJob.jumpSeen)) { return; } if (id == null || !ReferenceEquals(Interlocked.CompareExchange(ref jumpArmedId, null, id), id)) { return; }';
/* ★ histcs #46 r3 (O4 NIT-1): pushPendingJump's NEW FIRST statement — a main-thread jump waits behind a kept page's queued pushes */
const PPJ_DEFER = 'if (HistcsFlags.LoadMoreOffUi && Volatile.Read(ref olderPostsPending) > 0 && MainThread.IsMainThread) { olderPostBehind(pushPendingJump); return; }';
const PPJ_NEW = '{ string? id = jumpArmedId; ' + PPJ_NEW_MID + ' if (id != null) { Utils.sendUiCommand(this, "jumpToMessage", id); } }';
/* ★ histcs #46 r4 (S4 MINOR-1): the two statements that queue a REPEAT of a peer's delete / edit while a background page is in flight — deleteMessage (inside its channel branch, after its push) and updateMessage (right after its channel test) */
const SIG_DEL = 'public void deleteMessage(byte[] msg_id, int channel)', SIG_UPD = 'public void updateMessage(FriendMessage message, int channel)';
const D_LATE = 'if (HistcsFlags.LoadMoreOffUi && olderBusy.held) { string lateId = Crypto.hashToString(msg_id); olderLatePushes.Enqueue(() => Utils.sendUiCommand(this, "deleteMessage", lateId)); }';
const D_CTX = 'Utils.sendUiCommand(this, "deleteMessage", Crypto.hashToString(msg_id)); ' + D_LATE + ' } Interlocked.Increment(ref fileDeleteGen);';
const U_LATE = 'if (HistcsFlags.LoadMoreOffUi && olderBusy.held) { olderLatePushes.Enqueue(() => updateMessage(message, channel)); }';
const U_CTX = 'public void updateMessage(FriendMessage message, int channel) { if (channel != selectedChannel) { return; } ' + U_LATE + ' ';
const VI_INS = 'olderPushed(olderJob);';
const VI_INS2 = 'olderScope?.Dispose();';   // lead (merge): an OTHER load stops counting as in flight once its pushes are out (mechanisms § 4)
const VI = 'Utils.sendUiCommand(this, "messagesDone", show_more); pushPendingJump(); } ' + VI_INS + ' ' + VI_INS2 + ' int holdDoc = thumbDoc;';
/* every text that sclRest takes out (the rest of the file must be the base): each is followed by one space in the collapsed text */
const CUTS = [I_INS, I_JUMP, I_DEFER, PPJ_DEFER, II_A, II_B, III_INS, IV_INS, EARLY, DEFER_ON, FB, V_INS1, V_DEFER, V_INS2, VI_INS, VI_INS2, UB_FIELD, AJW, D_LATE, U_LATE];   // ★ histcs #46 r4: + D_LATE (deleteMessage), U_LATE (updateMessage) · ★ histcs #46 r1: + I_JUMP, EARLY, DEFER_ON, V_DEFER, UB_FIELD · r2: + FB (the fallback drop), AJW (applyPendingJumpWindow) · r3: + I_DEFER (loadMessages), PPJ_DEFER (pushPendingJump's first statement)
/* ★ histcs #46 r1: the two texts that REPLACE base text (new → base): the file branch's wrap (F2) and pushPendingJump's take (F1) */
const REPLACES = [[FILE_NEW, FILE_BASE], [PPJ_NEW_MID, PPJ_BASE_MID]];

/* the frozen BASE hashes (338d30f4) — see the header: the lead computes them with baseHashes() over the base texts */
const BASE = {
  onLoadMoreBody: '1654585d367832a696da37dff471c581df9f2cc854f0eaa50dd7c368fa98883d',
  sclRest: 'bb80f7ab9a79221ae83680e42dbb94a993b69cebe0a3a3e6b34a8ad1df108396',
  flagsRest: '01ea238585608e5697a17b500dc749153d29215dcbb33bbe9ae08fb075e448ee',   // ★ histcs merge re-base (2026-11-23, the merge of work/fixb4 @ 8ce1215d, ruling 1834): = flagsRest(SpixiFlags.cs at 8ce1215d), after a look at the diff — fixb4 added 36 lines outside the histcs block (its block + `readFixb4();` after `readPhoto1b();`), 0 deleted; the merged file minus the histcs block = the fixb4 file exactly. Superseded f211ffbd… (338d30f4)
};

/* ★ histcs #46 r1 — the frozen values of the NEW code (a11), computed with regionHashes() over SingleChatPage.xaml.cs;
   re-based after a look at the diff (#46 r2, 2026-11-22: the round-2 code change — olderClosedEarly's channel test, olderFallbackDrop + its one call,
   the keep-point `&& json != null`, applyPendingJumpWindow's `olderBusy.held` statement; pushPendingJump is unchanged in r2);
   re-based after a look at the diff (#46 r3, 2026-11-22: the delivery-order code — olderPostsPending, OlderJob.markerDue, olderPostMarker, olderDeferBehindPage, olderPostBehind,
   the keep's count, olderPushed's and the after step's marker, olderClosedEarly's read-channel parameter, pushPendingJump's new first statement, loadMessages' one new deferral statement; 20 → 21 statements);
   re-based after a look at the diff (#46 r4, 2026-11-23: the late-repeat code — olderLatePushes + olderDrainLate in the region, the drain at the end of olderPushed and of the task's after step, the marker post moved BEFORE the gate exit in both, olderDeferBehindPage's `!isDisposed` re-run, olderPostBehind's try / catch around the post, and the two new inserts: deleteMessage's and updateMessage's `olderLatePushes.Enqueue` statement; 21 → 23 statements; pushPendingJump unchanged) — a later change of the new code re-bases them the same way */
const NEW = {
  region: '601eaba285e28af49b0d90c996466a30771c4d59aebfd9e902429f73b1dae3c8',
  pushPendingJump: '178e6fddae4427b88936eb479a7108d92f60cad79cd060215674671e59c2cfbe',
  inserts: '0eebe6eca6e32f4519362896d2c72fd261e0f252eb571dbe6851556819308da9',
};

const clean = (t) => t.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

/* the EXACT raw text between the braces of onLoadMore() (null when the method is not found exactly once) */
export const onLoadMoreBody = (text) => {
  const t = clean(text), code = mask(t), bare = mask(t, true);
  if (count(bare, SIG_ONLOADMORE) !== 1) return null;
  const sp = span(code, bare, SIG_ONLOADMORE);
  return sp.end > 0 ? t.slice(sp.open + 1, sp.end - 1) : null;
};

/* SingleChatPage.xaml.cs reduced to "everything but the change": the region between onLoadMore()'s closing brace and the `#1166 B2` comment
   (loadMoreIn + its new members: at the base it is blank) is cut; the one branch statement goes back to `onLoadMore();`; the fourteen
   inserted statements (CUTS: thirteen of loadMessages + the UiBatch field) are cut and the two replaced base texts (REPLACES) put back. Comments masked, whitespace collapsed. Exported: BASE.sclRest = sha(sclRest(base)). */
export const sclRest = (text) => {
  const t = clean(text), code = mask(t), bare = mask(t, true);
  const om = span(code, bare, SIG_ONLOADMORE);
  if (om.end < 0 || count(bare, SIG_ONLOADMORE) !== 1) return '<<NO onLoadMore>>';
  const b2 = t.indexOf(B2_MARK);
  if (b2 < om.end || count(t, B2_MARK) !== 1) return '<<NO B2 marker after onLoadMore>>';
  let c = norm(code.slice(0, om.end) + code.slice(b2));
  c = c.replace(BRANCH_NEW, BRANCH_OLD);
  for (const cut of CUTS) c = c.replace(cut + ' ', '');
  for (const [now, was] of REPLACES) c = c.replace(now, was);
  return c;
};

/* SpixiFlags.cs reduced to "everything but the change": the histcs block (from its opening comment to the namespace's closing brace)
   and every line that is the statement `HistcsFlags.read();` are cut. RAW text (comments kept), whitespace collapsed. Exported:
   BASE.flagsRest = sha(flagsRest(base)). */
export const flagsRest = (text) => {
  let t = clean(text);
  const at = t.indexOf(BLOCK_OPEN);
  if (at >= 0) t = t.slice(0, at) + t.slice(t.lastIndexOf('}'));
  t = t.split('\n').filter((l) => !/^\s*HistcsFlags\.read\(\);/.test(l)).join('\n');
  return norm(t);
};

/* the three values to freeze, from the base texts */
export const baseHashes = (sclText, flagsText) => ({
  onLoadMoreBody: sha(onLoadMoreBody(sclText) ?? '<<none>>'),
  sclRest: sha(sclRest(sclText)),
  flagsRest: sha(flagsRest(flagsText)),
});

/* ★ histcs #46 r1 (O2 MINOR-1/-2/-3): the NEW code itself, whole — the parts a7 cuts out are held here, so a statement added to the
   region, to pushPendingJump or as a `★ histcs` line of loadMessages / insertMessage(…, batch) / UiBatch cannot pass unseen.
     region  = the comment-masked, whitespace-collapsed text between onLoadMore()'s closing brace and the `#1166 B2` comment;
     jump    = the comment-masked, collapsed body of `private void pushPendingJump()` (braces included);
     inserts = every line of those three members whose RAW text carries `★ histcs`, as comment-masked collapsed code, each extended
               to a whole statement (an open brace, a header that ends in `)` or `else`, or a next line that starts `else` / `{`
               pulls in the next line); comment-only lines are skipped. Read on the code as it is now (the base has none). */
const SIG_LM = 'public void loadMessages()', SIG_INS3 = 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)', SIG_UB = 'private sealed class UiBatch';
export const regionParts = (text) => {
  const t = clean(text), code = mask(t), bare = mask(t, true);
  const om = span(code, bare, SIG_ONLOADMORE);
  const b2 = t.indexOf(B2_MARK);
  const region = om.end > 0 && b2 > om.end && count(t, B2_MARK) === 1 && count(bare, SIG_ONLOADMORE) === 1 ? norm(code.slice(om.end, b2)) : '<<NO region>>';
  const pj = span(code, bare, PPJ_SIG);
  const jump = pj.end > 0 && count(bare, PPJ_SIG) === 1 ? norm(pj.text) : '<<NO pushPendingJump>>';
  const rawL = t.split('\n'), codeL = code.split('\n'), bareL = bare.split('\n');
  const starts = []; { let o = 0; for (const l of rawL) { starts.push(o); o += l.length + 1; } }
  const lineAt = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };
  const bal = (s) => count(s, '{') - count(s, '}');
  const inserts = [];
  for (const sig of [SIG_LM, SIG_INS3, SIG_UB]) {
    const sp = span(code, bare, sig);
    if (sp.end < 0 || count(bare, sig) !== 1) { inserts.push('<<NO ' + sig + '>>'); continue; }
    const last = lineAt(sp.end - 1);
    for (let i = lineAt(sp.open); i <= last; i++) {
      if (!rawL[i].includes('★ histcs') || norm(codeL[i]) === '') continue;
      let acc = codeL[i], accB = bareL[i], j = i;
      const more = () => j < last && (bal(accB) > 0 || /(?:\)|\belse)$/.test(norm(accB)) || /^(?:else\b|\{)/.test(norm(bareL[j + 1])));
      while (more()) { j++; acc += '\n' + codeL[j]; accB += '\n' + bareL[j]; }
      inserts.push(norm(acc));
      i = j;
    }
  }
  /* ★ histcs #46 r2 (O3 M1): applyPendingJumpWindow's ONE new statement (its `★ histcs` comment sits on the inner line, so it is read whole by its text) */
  {
    const aj = span(code, bare, SIG_AJW);
    if (aj.end < 0 || count(bare, SIG_AJW) !== 1) inserts.push('<<NO ' + SIG_AJW + '>>');
    else {
      const m = /if \(reload && !widened[^{]*\{[^}]*\}/.exec(aj.text);
      inserts.push(m && count(aj.text, 'olderBusy.held') === 1 ? norm(m[0]) : '<<NO statement in ' + SIG_AJW + '>>');
    }
  }
  /* ★ histcs #46 r4 (S4 MINOR-1): deleteMessage's and updateMessage's ONE new statement each (read whole by its text; the block holds no inner brace) */
  for (const sig of [SIG_DEL, SIG_UPD]) {
    const sp = span(code, bare, sig);
    if (sp.end < 0 || count(bare, sig) !== 1) { inserts.push('<<NO ' + sig + '>>'); continue; }
    const m = /if \(HistcsFlags\.LoadMoreOffUi && olderBusy\.held\)\s*\{[^}]*\}/.exec(sp.text);
    inserts.push(m && count(sp.text, 'olderBusy.held') === 1 ? norm(m[0]) : '<<NO statement in ' + sig + '>>');
  }
  return { region, jump, inserts };
};
export const regionHashes = (text) => {
  const p = regionParts(text);
  return { region: sha(p.region), pushPendingJump: sha(p.jump), inserts: sha(JSON.stringify(p.inserts)) };
};

const TESTS = ['flags_keys_and_words', 'flags_absent_is_on', 'flags_stored_zero_acts_only_in_dev_mode', 'flags_devmode_absent_is_off', 'flags_each_key_is_its_own_switch',
  'flags_throwing_read_keeps_on', 'flags_read_lazily_once_not_by_init', 'flags_read_writes_no_log_line', 'flags_line_text', 'flags_line_taken_once', 'next_show_sequences', 'next_show_false_equals_the_base_formula',
  'uses_new_path_table', 'busy_guard_single_thread', 'busy_guard_race', 'schedule_normal_inline', 'schedule_body_throws', 'schedule_after_throws', 'schedule_throws_itself',
  'schedule_deferred_scheduler', 'schedule_real_task_run', 'decide_each_field_alone', 'decide_order_and_all_128_combinations', 'gate_load_begun_after_ticket', 'gate_load_in_flight',
  'gate_load_begun_and_ended_before_ticket', 'gate_held_makes_begin_other_wait', 'gate_held_makes_dispose_wait', 'gate_double_dispose_counts_once', 'gate_switch_off_counts_nothing',
  'gate_exit_twice_safe', 'gate_enter_blocks_while_another_thread_holds', 'gate_many_threads_end_state', 'lines_exact_texts', 'lines_extreme_values_stay_in_the_grammar',
  'lines_drop_words', 'lines_by_type_only', 'lines_through_p1perf_line', 'both_off_is_the_base', 'both_off_end_to_end_real_flags',
  'busy_guard_stale_leave_keeps_a_newer_owner', 'schedule_leaves_with_its_owner_only', 'gate_enter_twice_same_flag_one_exit_frees'];   // ★ histcs #46 r1: + 3 (S-3 ×2, O2 NIT-3)

export default async function (h) {
  const { ok, root, existsSync, join } = h;
  const exact = (f) => (existsSync(join(root, f)) ? readBytes(join(root, f)) : Buffer.alloc(0));
  const text = (f) => exact(f).toString('utf8').replace(/^\uFEFF/, '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const idx = (s, needle, from = 0) => s.indexOf(needle, from);

  const scpRaw = text(SCP_F);
  const code = mask(scpRaw), bare = mask(scpRaw, true);
  const nCode = norm(code);
  const om = span(code, bare, SIG_ONLOADMORE);
  const b2At = scpRaw.indexOf(B2_MARK);
  const region = om.end > 0 && b2At > om.end ? code.slice(om.end, b2At) : '';   // loadMoreIn + the new members (blank at the base)
  const regionN = norm(region);
  const regionBare = om.end > 0 && b2At > om.end ? bare.slice(om.end, b2At) : '';
  const sub = (sig) => span(region, regionBare, sig);   // a member of the region

  /* ───────────────────────── a1 — the branch ───────────────────────── */
  const nav = span(code, bare, 'private void onNavigating(object sender, WebNavigatingEventArgs e)');
  const navN = norm(nav.text);
  const branchHits = code.match(BRANCH_RE) || [];
  const branchAt = code.search(new RegExp(BRANCH_RE.source));
  const a1 = {
    found: nav.end > 0 && count(bare, 'private void onNavigating(object sender, WebNavigatingEventArgs e)') === 1,
    oneBranch: count(navN, BRANCH_NEW) === 1 && branchHits.length === 1,
    onlyThatCall: count(navN, '"ixian:loadmore"') === 1 && count(navN, 'onLoadMore();') === 0 && count(navN, 'loadMoreIn()') === 1,
    onLoadMoreCalledOnce: count(nCode, 'onLoadMore();') === 1 && words(code, 'onLoadMore') === 2,   // the declaration + the OFF route of loadMoreIn
    outsideEveryIf: branchAt > 0 && regionsAt(code, branchAt).length === 0,
  };
  ok(F(a1).length === 0,
    '★ histcs a1 branch: onNavigating\'s `ixian:loadmore` branch is ONE statement `loadMoreIn();` (the old `onLoadMore();` is gone there); `onLoadMore();` is called once in the file — the OFF route of loadMoreIn — and the name `onLoadMore` appears twice (declaration, that call); the branch sits outside every `#if` — failing: ' + JSON.stringify(F(a1)));

  /* ───────────────────────── a2 — onLoadMore()'s body is the base ───────────────────────── */
  const olmBody = onLoadMoreBody(scpRaw);
  const a2 = { found: olmBody !== null, sameAsBase: olmBody !== null && sha(olmBody) === BASE.onLoadMoreBody };
  ok(F(a2).length === 0,
    '★ histcs a2 baseBody: the exact raw text between the braces of `private void onLoadMore()` (comments, indents, the #354 / D-18 step over 100, `requestPrepend(); loadMessages();`) is the base (SHA-256 of that text at 338d30f4) — the both-switches-OFF path stays the old path byte for byte — failing: ' + JSON.stringify(F(a2)) + (olmBody !== null ? ' got ' + sha(olmBody) : ''));

  /* ───────────────────────── a3 — loadMoreIn: the order ───────────────────────── */
  const lmi = sub('void loadMoreIn()');
  const lb = norm(lmi.text);
  const i1 = idx(lb, N1), i2 = idx(lb, N2), i3 = idx(lb, N3), i5 = idx(lb, N5), i6 = idx(lb, N6), i7 = idx(lb, N7), i8 = idx(lb, N8);
  const iTry = idx(lb, 'olderBusy.tryEnter(busyOwner)');
  const mid = i2 >= 0 && i3 > i2 ? lb.slice(i2 + N2.length, i3) : '<<none>>';
  const localDecls = mid.trim().split(';').map((s) => s.trim()).filter((s) => s.length > 0).map((s) => s + ';').sort();
  const busyGap = iTry > 0 && i5 > iTry ? lb.slice(iTry, i5) : '<<none>>';
  const a3 = {
    found: lmi.end > 0 && count(regionBare, 'void loadMoreIn()') === 1 && /^(?:\w+ )*void loadMoreIn\(\)/.test(regionN),   // directly after onLoadMore(), before the B2 comment
    firstStatementIsTheLine: lb.startsWith('{ ' + N1 + ' ' + N2),
    flagsLineOnce: count(lb, N2) === 1 && count(nCode, 'HistcsFlags.takeFlagsLine()') === 1,
    twoLocalsOnly: JSON.stringify(localDecls) === JSON.stringify(['bool offUi = HistcsFlags.LoadMoreOffUi;', 'bool page50 = HistcsFlags.FirstOlderPage50;']),
    offRouteBeforeAnythingElse: i3 > i2 && i2 > i1 && i1 >= 0 && count(lb, N3) === 1 && count(lb, 'onLoadMore();') === 1,
    guardAfterTheRoute: iTry > i3 && count(lb, 'olderBusy.tryEnter(') === 1 && lb.slice(i3 + N3.length, iTry + 'olderBusy.tryEnter(busyOwner)'.length + 1) === ' ' + N4 + ' ' + N4_GUARD,   // ★ histcs #46 r1 (S-3): the token, then the guard with it
    guardDropLine: busyGap.includes('P1Perf.line(HistoryOlderRules.olderDropBody(OlderDrop.Busy));') && /olderDropBody\(OlderDrop\.Busy\)\); \} return; \}/.test(busyGap),
    windowAfterTheGuard: i5 > iTry && count(lb, N5) === 1 && count(nCode, 'messagesToShow = HistoryOlderRules.nextShow(') === 1,
    jobAfterTheWindow: i6 > i5 && count(lb, N6) === 1 && count(nCode, 'new OlderJob(') === 1,
    oneToken: count(lb, N4) === 1 && words(lb, 'busyOwner') === 3 && count(lb, 'job.owner') === 1,   // ★ histcs #46 r1 (S-3): declared, entered with, handed to the job; schedule leaves with job.owner
    hv5Route: i7 > i6 && count(lb, N7) === 1,
    scheduleLast: i8 > i7 && count(lb, N8) === 1 && lb.endsWith(N8 + ' }') && count(nCode, 'HistoryOlderRules.schedule(') === 1,
    bindInsideTheLambda: i8 > 0 && lb.indexOf('job.bindHere()', i8) > i8 && lb.indexOf('job.bindHere()', i8) < lb.indexOf('loadMessages();', i8) && count(lb, 'job.bindHere()') === 2,
    loadMessagesTwice: count(lb, 'loadMessages();') === 2,
    noOldPrependPair: !/requestPrepend|takePrepend|prependOnThread/.test(region),
    outsideEveryIf: lmi.at >= 0 && regionsAt(code, om.end + lmi.at).length === 0,
  };
  ok(F(a3).length === 0,
    '★ histcs a3 order: `loadMoreIn()` sits directly after onLoadMore() and its statements run in the contract\'s order — (1) `if (P1Perf.enabled) { P1Perf.line(HistoryOlderRules.LoadMoreInBody); }` FIRST, (2) the once-only `[FLAGS] histcs` line, (3) the two switch locals and the OFF route `if (!HistoryOlderRules.usesNewPath(offUi, page50)) { onLoadMore(); return; }` BEFORE any other statement (both switches OFF = the old path), (4) the page\'s token `object busyOwner = new object();` and the P-28 busy guard `olderBusy.tryEnter(busyOwner)` with its `chat older drop why=busy` dev line (★ #46 r1 S-3: OWNER-aware), (5) `messagesToShow = HistoryOlderRules.nextShow(…, page50)`, (6) `new OlderJob(offUi, thumbDoc, friend, selectedChannel, historyAnchor, …, busyOwner)`, (7) HV-5 only: bind + loadMessages() inline, (8) `HistoryOlderRules.schedule(olderBusy, job.owner, a => Task.Run(a), …)` LAST (its after step also clears this job\'s pushing mark); the job binds to the pool thread INSIDE the lambda BEFORE loadMessages(); requestPrepend / takePrepend are not used by this path — failing: ' + JSON.stringify(F(a3)) + (a3.twoLocalsOnly === false ? ' locals ' + JSON.stringify(localDecls) : ''));

  /* ───────────────────────── a4 — the members ───────────────────────── */
  const job = sub('class OlderJob');
  const jobN = norm(job.text);
  const take = sub('OlderJob? takeOlderJob()');
  const takeN = norm(take.text);
  const may = sub('bool olderMayPush(OlderJob? job, int readChannel)');
  const mayN = norm(may.text);
  const pushed = sub('void olderPushed(OlderJob? job)');
  const pushedN = norm(pushed.text);
  const scope = sub('IDisposable? beginLoadScope(OlderJob? job)');
  const scopeN = norm(scope.text);
  const early = sub('bool olderClosedEarly(OlderJob? job, int readChannel)');   // ★ histcs #46 r1 (S-1) · r3 (S3 NIT-1): + the read channel
  const marker = sub('void olderPostMarker(OlderJob job)');   // ★ histcs #46 r3 (MINOR-1)
  const markerN = norm(marker.text);
  const deferB = sub('bool olderDeferBehindPage(OlderJob? job)');   // ★ histcs #46 r3 (MINOR-1)
  const deferBN = norm(deferB.text);
  const behind = sub('void olderPostBehind(Action action)');   // ★ histcs #46 r3
  const behindN = norm(behind.text);
  const drain = sub('void olderDrainLate()');   // ★ histcs #46 r4 (S4 MINOR-1)
  const drainN = norm(drain.text);
  const earlyN = norm(early.text);
  const fallback = sub('bool olderFallbackDrop(OlderJob? job, bool prepend)');   // ★ histcs #46 r2 (S2 MINOR-1/-2)
  const fallbackN = norm(fallback.text);
  const EARLY_BODY = '{ if (job == null || !job.background) { return false; } bool closed = isDisposed || thumbDoc != job.doc || !ReferenceEquals(friend, job.chat); bool switched = Volatile.Read(ref selectedChannel) != job.channel || readChannel != job.channel; if (!closed && !switched) { return false; } if (P1Perf.enabled) { P1Perf.line(HistoryOlderRules.olderDropBody(closed ? OlderDrop.Closed : OlderDrop.Channel)); } olderBusy.leave(job.owner); return true; }';   // ★ histcs #46 r2 (S2 MINOR-1): + a switched channel (why=channel) · r3 (S3 NIT-1): + the load's own read channel (A → B → A)
  const MARKER_BODY = '{ if (Interlocked.Exchange(ref job.markerDue, 0) != 1) { return; } try { MainThread.BeginInvokeOnMainThread(() => Interlocked.Decrement(ref olderPostsPending)); } catch (Exception) { Interlocked.Decrement(ref olderPostsPending); } }';   // ★ histcs #46 r3 (MINOR-1): once per job; the decrement is POSTED behind the page's pushes, a throw decrements at once
  const DEFERB_BODY = '{ if (job != null || !HistcsFlags.LoadMoreOffUi || Volatile.Read(ref olderPostsPending) <= 0 || !MainThread.IsMainThread) { return false; } olderPostBehind(() => { if (!isDisposed) { loadMessages(); } }); return true; }';   // ★ histcs #46 r3 (MINOR-1): only a main-thread load that is not an older page, P-28 ON, a kept page still queued · r4 (S4 NIT-1): a page closed meanwhile runs nothing
  const BEHIND_BODY = '{ Task.Run(() => { try { MainThread.BeginInvokeOnMainThread(() => { try { action(); } catch (Exception e) { Logging.warn("loadmore: a deferred chat push failed (" + e.GetType().Name + ")"); } }); } catch (Exception e) { Logging.warn("loadmore: a deferred chat push failed (" + e.GetType().Name + ")"); } }); }';   // ★ histcs #46 r3: posted from a pool thread (the page's queue); a throw of the action is logged by its TYPE only · r4 (S4 NIT-3 / O5 NIT-2): + a try / catch around the post itself, the same type-only warn
  const DRAIN_BODY = '{ int n = olderLatePushes.Count; for (int i = 0; i < n && olderLatePushes.TryDequeue(out Action? late); i++) { try { late(); } catch (Exception e) { Logging.warn("loadmore: a late chat push failed (" + e.GetType().Name + ")"); } } }';   // ★ histcs #46 r4 (S4 MINOR-1): only the repeats queued at the start (a bounded loop), each in its own try, the type-only warn
  const LATE_FIELD = 'private readonly ConcurrentQueue<Action> olderLatePushes = new ConcurrentQueue<Action>();';   // ★ histcs #46 r4 (S4 MINOR-1)
  const FALLBACK_BODY = '{ if (job == null || !job.background || prepend || ReferenceEquals(historyAnchor, job.anchor)) { return false; } if (P1Perf.enabled) { P1Perf.line(HistoryOlderRules.olderDropBody(OlderDrop.Anchor)); } olderBusy.leave(job.owner); return true; }';   // ★ histcs #46 r2 (S2 MINOR-1/-2)
  const PUSHED_BODY = '{ if (job != null && job.background) { olderPostMarker(job); olderGate.exit(ref job.gateHeld); Interlocked.CompareExchange(ref olderPushing, null, job); olderBusy.leave(job.owner); olderDrainLate(); } }';   // ★ histcs #46 r3: + the marker post · r4: the marker post FIRST (under the gate, O5 NOTE-5), the drain of the late delete / edit repeats LAST (S4 MINOR-1)
  const DECIDE = 'HistoryOlderRules.decide(isDisposed, thumbDoc == job.doc, ReferenceEquals(friend, job.chat), Volatile.Read(ref selectedChannel) == job.channel && readChannel == job.channel, c.noLoadSince, c.noneInFlight, ReferenceEquals(historyAnchor, job.anchor))';
  const iEnter = idx(mayN, 'olderGate.enter(ref job.gateHeld)'), iCount = idx(mayN, 'olderGate.counters(job.ticket)'), iDecide = idx(mayN, DECIDE), iExit = idx(mayN, 'olderGate.exit(ref job.gateHeld)');
  const iThread = takeN.search(/\.thread (?:==|!=) Environment\.CurrentManagedThreadId/), iCas = idx(takeN, 'Interlocked.CompareExchange(ref olderJobPending, null, ');
  const a4 = {
    found: [job, take, may, pushed, scope, early, fallback, marker, deferB, behind, drain].every((s) => s.end > 0),
    fieldsAndBind: ['background', 'doc', 'chat', 'channel', 'anchor', 'ticket', 'thread', 'gateHeld', 'zeroed', 'bindHere', 'owner', 'jumpSeen'].every((w) => words(jobN, w) >= 1)
      && !/\bgateHeld\s*\{/.test(jobN) && /thread = Environment\.CurrentManagedThreadId/.test(jobN)
      && count(jobN, 'public readonly object owner;') === 1 && count(jobN, 'this.owner = owner;') === 1 && count(jobN, 'public string? jumpSeen = null;') === 1 && count(jobN, 'public int markerDue = 0;') === 1,   // ★ histcs #46 r1 (S-3, F1) · r3: + markerDue
    busyAndGate: count(regionN, 'private readonly OlderBusy olderBusy = new OlderBusy();') === 1 && count(regionN, 'private readonly OlderPushGate olderGate = new OlderPushGate();') === 1
      && count(regionN, 'private OlderJob? olderJobPending = null;') === 1 && count(regionN, 'private OlderJob? olderPushing = null;') === 1
      && count(regionN, 'private int olderPostsPending = 0;') === 1,   // ★ histcs #46 r3: the counter of kept pages whose pushes are posted and not delivered
    takeIsThreadBound: iThread > 0 && iCas > iThread && count(takeN, 'Interlocked.CompareExchange(') === 1 && /== j\b/.test(takeN),
    mayPushShape: iEnter > 0 && iCount > iEnter && iDecide > iCount && count(mayN, DECIDE) === 1 && /job == null \|\| !job\.background/.test(mayN),
    mayPushKeepHoldsTheGate: iExit > iDecide && count(mayN, 'olderGate.exit(') === 1 && count(mayN, 'olderGate.enter(') === 1 && count(mayN, 'return true;') >= 2 && mayN.trimEnd().endsWith('return false; }'),
    mayPushDropLine: count(mayN, 'HistoryOlderRules.olderDropBody(') === 1 && idx(mayN, 'olderDropBody(') > iExit && /if \(P1Perf\.enabled\) \{ P1Perf\.line\(HistoryOlderRules\.olderDropBody\(\w+\)\); \}/.test(mayN),
    mayPushKeepMarks: count(mayN, 'if (why == OlderDrop.None) { Volatile.Write(ref olderPushing, job); Interlocked.Increment(ref olderPostsPending); job.markerDue = 1; return true; }') === 1 && count(mayN, 'olderPushing') === 1
      && count(mayN, 'olderPostsPending') === 1 && count(mayN, 'markerDue') === 1,   // ★ histcs #46 r1 (F1): under the gate · r3: + the count (BEFORE the pushes, under the gate) and the owed marker
    mayPushDropFrees: count(mayN, 'olderGate.exit(ref job.gateHeld); olderBusy.leave(job.owner);') === 1 && count(mayN, 'olderBusy.') === 1,   // ★ histcs #46 r1 (S-3): a dropped page frees the guard
    pushedExits: pushedN === PUSHED_BODY,   // ★ histcs #46 r1: exit, this job's pushing mark cleared (F1), the guard freed with its owner (S-3)
    closedEarlyShape: earlyN === EARLY_BODY && count(regionN, 'bool olderClosedEarly(OlderJob? job, int readChannel)') === 1,   // ★ histcs #46 r1 (S-1) · r3 (S3 NIT-1): the read channel is a parameter and a test
    fallbackDropShape: fallbackN === FALLBACK_BODY && count(regionN, 'bool olderFallbackDrop(OlderJob? job, bool prepend)') === 1,   // ★ histcs #46 r2 (S2 MINOR-1/-2): background only, `prepend` false, the anchor replaced → why=anchor, the guard freed with its owner, true
    postMarkerShape: markerN === MARKER_BODY && count(regionN, 'void olderPostMarker(OlderJob job)') === 1,   // ★ histcs #46 r3 (MINOR-1): once per job (Exchange of markerDue), POSTED decrement; a throw decrements at once
    deferBehindShape: deferBN === DEFERB_BODY && count(regionN, 'bool olderDeferBehindPage(OlderJob? job)') === 1,   // ★ histcs #46 r3 (MINOR-1)
    postBehindShape: behindN === BEHIND_BODY && count(regionN, 'void olderPostBehind(Action action)') === 1 && count(behindN, 'Logging.') === 2,   // ★ histcs #46 r3: Task.Run → MainThread.BeginInvokeOnMainThread; the log lines carry the exception TYPE only (r4: two — the action's catch and the post's own catch)
    lateDrainShape: drainN === DRAIN_BODY && count(regionN, 'void olderDrainLate()') === 1 && count(regionN, LATE_FIELD) === 1 && count(regionN, 'olderLatePushes') === 3,   // ★ histcs #46 r4 (S4 MINOR-1): the queue, the bounded drain (Count read once, TryDequeue), one type-only warn (b-lines counts the region's log calls)
    scopeShape: /^\{ return job != null \? null : olderGate\.beginOther\(HistcsFlags\.LoadMoreOffUi\); \}$/.test(scopeN),
    noLogsInTheHelpers: !/Logging|P1Perf|sendUiCommand/.test(norm(take.text) + norm(job.text) + norm(scope.text) + pushedN + markerN + deferBN),
  };
  ok(F(a4).length === 0,
    '★ histcs a4 members: OlderJob (thread bound by bindHere; gateHeld a FIELD, for `ref job.gateHeld`), `olderBusy`, `olderGate`, `olderJobPending = null`; takeOlderJob returns the pending job only on the job\'s own thread (the thread test BEFORE the one Interlocked.CompareExchange); olderMayPush = enter → counters(job.ticket) → decide(isDisposed, thumbDoc == job.doc, ReferenceEquals(friend, job.chat), selectedChannel == job.channel && readChannel == job.channel, c.noLoadSince, c.noneInFlight, ReferenceEquals(historyAnchor, job.anchor)) in that argument order, ONE exit (the drop path; a keep leaves the gate HELD for the pushes and marks `olderPushing = job` under it, F1), the drop path frees the busy guard with the job\'s owner (S-3), the dev drop line; olderPushed exits, clears this job\'s pushing mark and frees the guard with its owner (S-3: the next request may start); olderClosedEarly (S-1; r2: + a switched channel) = null / not background → false, the chat still open on its channel → false, else the dev line `why=closed` (`why=channel` for a switch), the guard freed with its owner, true; olderFallbackDrop (★ #46 r2) = null / not background / `prepend` / the anchor still the request\'s → false, else the `why=anchor` dev line, the guard freed with its owner, true; beginLoadScope = `if (job != null) { return null; } return olderGate.beginOther(HistcsFlags.LoadMoreOffUi);`; ★ #46 r3 (the delivery order): the keep counts the page in `olderPostsPending` under the gate BEFORE its pushes and owes a marker (`markerDue`), olderPostMarker POSTS the decrement behind the pushes once per job (a throw decrements at once; called by olderPushed and by the task\'s after step), olderDeferBehindPage = a main-thread load that is not an older page, P-28 ON, `olderPostsPending > 0` → re-runs from olderPostBehind and returns true, olderPostBehind = `Task.Run(() => MainThread.BeginInvokeOnMainThread(…))` with a throw of the action logged by its TYPE only, olderClosedEarly also drops a load whose own read channel is not the job\'s (S3 NIT-1) — failing: ' + JSON.stringify(F(a4)));

  /* ───────────────────────── a5 — loadMessages: the insertions ───────────────────────── */
  const lm = span(code, bare, 'public void loadMessages()');
  const lN = norm(lm.text);
  const pMay1 = lm.text.indexOf('olderMayPush('), pMay2 = pMay1 >= 0 ? lm.text.indexOf('olderMayPush(', pMay1 + 1) : -1;
  const pAnch1 = lm.text.indexOf('historyAnchor = null;'), pAnch2 = lm.text.indexOf('historyAnchor = new HistoryAnchor(');
  const pPushed = lm.text.indexOf('olderPushed(');
  const pPrepend = lm.text.indexOf('"addMessages", json, "prepend"'), pDone = lm.text.indexOf('"messagesDone", show_more');
  const absAt = (needle, from = 0) => { const p = lm.text.indexOf(needle, from); return p >= 0 ? lm.open + p : -1; };   // a position of the masked body, in the file's code
  const a5 = {
    found: lm.end > 0 && count(bare, 'public void loadMessages()') === 1,
    i: count(lN, I_PRE + ' ' + I_INS + ' ' + I_JUMP + ' ' + I_DEFER + ' ' + I_POST) === 1 && lN.indexOf('applyPendingJumpWindow(false);') < lN.indexOf(I_JUMP),   // ★ histcs #46 r1 (F1): + the jump this load saw · r3 (MINOR-1): + the deferral directly after it (the scope is counted above it)
    pushJumpDefer: (() => { const pj = span(code, bare, PPJ_SIG); return pj.end > 0 && norm(pj.text).startsWith('{ ' + PPJ_DEFER + ' string? id = jumpArmedId;') && count(norm(pj.text), 'olderPostBehind(') === 1; })(),   // ★ histcs #46 r3 (O4 NIT-1): pushPendingJump's new FIRST statement
    ii: count(lN, II_PRE + ' ' + II_A + ' ' + II_MID + ' ' + II_B + ' ' + II_POST) === 1,
    iii: count(lN, III) === 1,
    iv: count(lN, IV) === 1,
    v: count(lN, V) === 1,
    vi: count(lN, VI) === 1,
    build: count(lN, BUILD) === 1 && count(lN, 'olderClosedEarly(') === 1 && count(lN, 'olderClosedEarly(olderJob, readChannel)') === 1 && count(lN, 'deferredFileRows') === 3,   // ★ histcs #46 r1 (S-1, F2): the early close before the batch, the deferred list right after it, the keep-point add
    fileBranch: count(norm(code), FILE_CTX) === 1 && count(norm(code), FILE_BASE) === 1,   // ★ histcs #46 r1 (F2): insertMessage's add waits for the keep of a background page; else the base lines
    uiBatchField: count(norm(code), UB_CTX) === 1,
    fallbackDrop: count(lN, FB_CTX) === 1 && count(lN, 'olderFallbackDrop(') === 1 && lN.indexOf(FB) > lN.indexOf('lock (messages)'),   // ★ histcs #46 r2 (S2 MINOR-1/-2): inside the build's lock, directly after the `if (prepend) {…}` anchor block, before the unread zero (the fallback's first side effect)
    jumpWindow: (() => { const aj = span(code, bare, SIG_AJW); const n = norm(aj.text); return aj.end > 0 && count(bare, SIG_AJW) === 1 && count(n, AJW_CTX) === 1 && count(n, 'olderBusy.held') === 1; })(),   // ★ histcs #46 r2 (O3 M1): between the widening block and `if (reload)`
    lateRepeats: (() => { const d = span(code, bare, SIG_DEL), u = span(code, bare, SIG_UPD); const at = (sp, needle) => { const p = sp.text.indexOf(needle); return p >= 0 ? sp.open + p : -1; };
      return d.end > 0 && u.end > 0 && count(bare, SIG_DEL) === 1 && count(bare, SIG_UPD) === 1 && count(norm(code), D_CTX) === 1 && count(norm(code), U_CTX) === 1 && count(norm(code), 'olderLatePushes.Enqueue(') === 2
        && [at(d, 'olderLatePushes.Enqueue('), at(u, 'olderLatePushes.Enqueue(')].every((p) => p > 0 && regionsAt(code, p).length === 0); })(),   // ★ histcs #46 r4 (S4 MINOR-1): deleteMessage's repeat inside its channel branch, after the push; updateMessage's directly after its channel test; two Enqueue calls in the file, outside every `#if`
    countsExact: count(lN, 'takeOlderJob()') === 1 && count(lN, 'beginLoadScope(') === 1 && count(lN, 'olderMayPush(') === 2 && count(lN, 'olderPushed(') === 1
      && count(lN, 'olderDeferBehindPage(') === 1 && count(lN, 'olderLines') === 3 && count(lN, 'flushT0') === 2 && count(lN, 'flushMs') === 2,
    mayPushBeforeBothAnchorWrites: pMay1 > 0 && pAnch1 > pMay1 && pMay2 > pAnch1 && pAnch2 > pMay2,
    deferAfterTheKeep: (() => { const pD = lm.text.indexOf('fileRowsShown.UnionWith('); return pD > pMay2 && pD < pAnch2; })(),   // ★ histcs #46 r1 (F2): only a KEPT page adds its file rows
    pushedAfterThePushBlock: pPushed > 0 && pPrepend > 0 && pDone > pPrepend && pPushed > pDone,
    usingDeclaration: count(lN, 'using IDisposable? olderScope = beginLoadScope(olderJob);') === 1 && !/using \(\s*IDisposable/.test(lN),
    outsideEveryIf: [absAt('takeOlderJob('), absAt('flushT0 ='), absAt('olderMayPush('), pMay2 > 0 ? lm.open + pMay2 : -1, absAt('olderPushed('), absAt('beginLoadScope('), absAt('olderClosedEarly('), absAt('olderDeferBehindPage('), absAt('olderFallbackDrop('), absAt('olderJob.jumpSeen ='), absAt('batch.deferredFileRows = '), absAt('fileRowsShown.UnionWith(')]
      .every((p) => p > 0 && regionsAt(code, p).length === 0),
  };
  ok(F(a5).length === 0,
    '★ histcs a5 inserts: loadMessages() holds the six insertions of the contract in place, each between its neighbours — (i) after `int want = (int)messagesToShow;`: `OlderJob? olderJob = takeOlderJob(); if (olderJob != null) { prepend = true; } bool olderLines = prepend; using IDisposable? olderScope = beginLoadScope(olderJob);` (a `using` declaration: the scope lives to every return), (ii) the flush clock around `beforeReread(…)`, (iii) the older read line under `P1Perf.enabled`, (iv) the empty branch\'s FIRST statement `if (!olderMayPush(olderJob, readChannel)) { return; }`, (v) the main branch\'s check after the try / catch and BEFORE `if (firstPushedId != null)`, with the push line, (vi) `olderPushed(olderJob);` right after the push block, before the media hold; ★ #46 r1: after (i) `olderJob.jumpSeen = Volatile.Read(ref jumpArmedId)` for a background job (F1), `if (olderClosedEarly(olderJob)) { return; }` directly before `UiBatch batch = new UiBatch();` (S-1) and the deferred file-row list right after the batch\'s `prefetchReplyDeep` block (F2), the deferred ids added under `lock (fileRowsShown)` at the KEEP point (after the main-branch check, before the anchor write), insertMessage\'s file branch adding to the batch\'s list when it has one and else the base `lock (fileRowsShown) { fileRowsShown.Add(…); }`, the UiBatch field `deferredFileRows = null`; olderMayPush comes before BOTH anchor writes (so a dropped page writes no anchor); `takeOlderJob()` is called once — failing: ' + JSON.stringify(F(a5)));

  /* ───────────────────────── a6 — who names what ───────────────────────── */
  const NAMES = {
    'takeOlderJob(': 2,                                            // the declaration + the ONE call in loadMessages
    'beginLoadScope(': 2,
    'olderMayPush(': 3,                                            // the declaration + the two calls
    'olderPushed(': 2,
    'ref olderJobPending': 6,                                      // Volatile.Write ×2 + the two clears (loadMoreIn) + Volatile.Read and CompareExchange (takeOlderJob)
    'Volatile.Write(ref olderJobPending, job)': 2,
    'Interlocked.CompareExchange(ref olderJobPending, null, ': 3,   // takeOlderJob + the two clears of loadMoreIn (lead, merge)
    'olderGate.enter(': 1,
    'olderGate.exit(': 3,                                          // olderMayPush (drop), olderPushed, the task's after()
    'olderGate.beginOther(': 1,
    'olderGate.ticket()': 1,
    'olderGate.counters(': 1,
    'olderBusy.tryEnter(': 1,
    'olderBusy.tryEnter(busyOwner)': 1,                            // ★ histcs #46 r1 (S-3): the guard is OWNER-aware
    'olderBusy.leave(': 4,                                         // ★ histcs #46 r1 (S-3): olderMayPush's drop, olderPushed, olderClosedEarly · r2: + olderFallbackDrop (+ schedule's final leave, in SpixiFlags.cs)
    'olderBusy.leave(job.owner)': 4,
    'olderFallbackDrop(': 2,                                       // ★ histcs #46 r2: the declaration + the ONE call in loadMessages
    'olderBusy.held': 3,                                           // ★ histcs #46 r2 (O3 M1): applyPendingJumpWindow's read · r4 (S4 MINOR-1): + deleteMessage's and updateMessage's tests
    'olderDrainLate(': 3,                                          // ★ histcs #46 r4 (S4 MINOR-1): the declaration + olderPushed + the task's after step
    'olderLatePushes': 5,                                          // ★ histcs #46 r4: the field, the drain's Count and TryDequeue, the two Enqueue (deleteMessage, updateMessage)
    'olderLatePushes.Enqueue(': 2,
    'olderLatePushes.TryDequeue(': 1,
    'OlderDrop.': 5,                                               // ★ histcs #46 r2: Busy (loadMoreIn), None (olderMayPush's test), Closed + Channel (olderClosedEarly's one conditional), Anchor (olderFallbackDrop)
    'ref olderPushing': 4,                                         // ★ histcs #46 r1 (F1): set in olderMayPush's keep; cleared in olderPushed and the task's after(); read in pushPendingJump
    'Volatile.Write(ref olderPushing, job)': 1,
    'Interlocked.CompareExchange(ref olderPushing, null, job)': 2,
    'Volatile.Read(ref olderPushing)': 1,
    'ref jumpArmedId': 2,                                          // ★ histcs #46 r1 (F1): the read at (i) and the atomic take of pushPendingJump
    'olderClosedEarly(': 2,                                        // ★ histcs #46 r1 (S-1): the declaration + the ONE call
    'olderClosedEarly(olderJob, readChannel)': 1,                  // ★ histcs #46 r3 (S3 NIT-1): the call names the load's own read channel
    'olderPostsPending': 6,                                        // ★ histcs #46 r3 (MINOR-1): the field, the keep's increment, the marker's two decrements, the defer's read, pushPendingJump's read
    'ref olderPostsPending': 5,
    'Interlocked.Increment(ref olderPostsPending)': 1,             // olderMayPush's keep (under the gate, before the pushes)
    'Interlocked.Decrement(ref olderPostsPending)': 2,             // olderPostMarker: the posted one + the at-once one after a throw
    'Volatile.Read(ref olderPostsPending)': 2,                     // olderDeferBehindPage + pushPendingJump
    'markerDue': 3,                                                // the field, the keep's set, the marker's Exchange
    'olderPostMarker(': 3,                                         // the declaration + olderPushed + the task's after step (★ r4: both BEFORE the gate exit)
    'olderDeferBehindPage(': 2,                                    // the declaration + the ONE call in loadMessages
    'olderPostBehind(': 3,                                         // the declaration + olderDeferBehindPage + pushPendingJump
    'MainThread.IsMainThread': 4,                                  // two others in the file (the sends, base) · r3: + olderDeferBehindPage, pushPendingJump
    'deferredFileRows': 6,                                         // ★ histcs #46 r1 (F2): the field, its set, the keep-point test + add, insertMessage's test + add
    'HistoryOlderRules.usesNewPath(': 1,
    'HistoryOlderRules.nextShow(': 1,
    'HistoryOlderRules.schedule(': 1,
    'HistoryOlderRules.decide(': 1,
    'HistcsFlags.takeFlagsLine(': 1,
    'HistcsFlags.flagsLine(': 1,
    'new OlderJob(': 1,
    'new OlderBusy(': 1,
    'new OlderPushGate(': 1,
  };
  const gotNames = {};
  for (const k of Object.keys(NAMES)) gotNames[k] = count(code, k);
  const wrongNames = Object.keys(NAMES).filter((k) => gotNames[k] !== NAMES[k]);
  const jobWrites = (bare.match(/(?<![A-Za-z0-9_])olderJobPending\s*(?:[-+*/|&^?]{0,2}=)(?!=)/g) || []).length;   // an assignment (the declaration's initializer is the one)
  const a6 = {
    exactTable: wrongNames.length === 0,
    oneInitializerNoOtherAssignment: jobWrites === 1 && count(norm(bare), 'private OlderJob? olderJobPending = null;') === 1,
    takeCalledInLoadMessagesOnly: a5.found && count(lN, 'takeOlderJob()') === 1 && count(code, 'takeOlderJob()') === 2,
    jobWrittenInLoadMoreInOnly: count(lb, 'Volatile.Write(ref olderJobPending, job)') === 2 && count(takeN, 'ref olderJobPending') === 2 && count(lb, 'Interlocked.CompareExchange(ref olderJobPending, null, job)') === 2,
    pushingWrittenInTheRegionOnly: (bare.match(/(?<![A-Za-z0-9_])olderPushing\s*(?:[-+*/|&^?]{0,2}=)(?!=)/g) || []).length === 1 && words(norm(code).replace(regionN, ''), 'olderPushing') === 1,   // ★ histcs #46 r1 (F1): the initializer; outside the region only pushPendingJump's read
    jumpSeenWrittenOnce: (bare.match(/\.jumpSeen\s*=(?!=)/g) || []).length === 1 && words(code, 'jumpSeen') === 3,   // the field, the ONE set at (i), pushPendingJump's read
    /* ★ histcs #46 r3 (MINOR-1, the delivery order): the counter is written only where the contract says; the main thread is touched by the region in exactly two places */
    pendingCounterWrittenInTheRegionOnly: (bare.match(/(?<![A-Za-z0-9_])olderPostsPending\s*(?:[-+*/|&^?]{0,2}=)(?!=)/g) || []).length === 1 && words(norm(code).replace(regionN, ''), 'olderPostsPending') === 1,   // the initializer; outside the region only pushPendingJump's read
    markerOnce: (bare.match(/\.markerDue\s*=(?!=)/g) || []).length === 1 && count(regionN, 'Interlocked.Exchange(ref job.markerDue, 0)') === 1,   // set once (the keep), taken once (the marker)
    mainThreadOnlyInTheTwoPosts: count(regionN, 'MainThread.BeginInvokeOnMainThread(') === 2 && count(markerN, 'MainThread.BeginInvokeOnMainThread(') === 1 && count(behindN, 'MainThread.BeginInvokeOnMainThread(') === 1,   // olderPostMarker + olderPostBehind, nowhere else in the region
    lateQueueTouchedAsTold: count(regionN, 'olderLatePushes.Enqueue(') === 0 && count(norm(bare), 'olderLatePushes.TryDequeue(out Action? late)') === 1 && count(regionN, 'olderDrainLate();') === 2,   // ★ histcs #46 r4: only the two public paths enqueue; only the drain dequeues; the drain is called by olderPushed and the task's after step (the third name is its declaration)
    taskRunTwiceInTheRegion: count(regionN, 'Task.Run(') === 2 && count(behindN, 'Task.Run(') === 1 && count(lb, 'Task.Run(') === 1,   // loadMoreIn's schedule + olderPostBehind
  };
  ok(F(a6).length === 0,
    '★ histcs a6 names: over the comment-masked code of SingleChatPage.xaml.cs the new names match the exact table — takeOlderJob() is called ONCE (in loadMessages); `olderJobPending` is assigned only by its initializer, the two `Volatile.Write(ref olderJobPending, job)` of loadMoreIn and the one `Interlocked.CompareExchange(ref olderJobPending, null, …)` of takeOlderJob; olderMayPush has two callers, olderPushed one; the gate has one enter, three exits (drop, olderPushed, the task\'s after), one counters, one beginOther, one ticket; ★ #46 r1: `olderBusy.leave(job.owner)` three times (olderMayPush\'s drop, olderPushed, olderClosedEarly; HistoryOlderRules.schedule leaves last, by owner), `olderPushing` written only in the region (the keep sets it, olderPushed and the after step clear it) and read once in pushPendingJump, `jumpArmedId` taken by `ref` only at (i) and in pushPendingJump\'s CompareExchange, `deferredFileRows` six times; ★ #46 r3 (the delivery order): `olderPostsPending` six times (one initializer; written only in the region — the keep\'s Increment, the marker\'s two Decrements; read by olderDeferBehindPage and pushPendingJump), `olderPostMarker(` three, `olderDeferBehindPage(` two (ONE call), `olderPostBehind(` three, `markerDue` three, `MainThread.BeginInvokeOnMainThread(` only in olderPostMarker and olderPostBehind within the region, `Task.Run(` twice there (the schedule of loadMoreIn, olderPostBehind) — failing: ' + JSON.stringify(F(a6)) + ' ' + JSON.stringify(Object.fromEntries(wrongNames.map((k) => [k, gotNames[k] + ' != ' + NAMES[k]]))));

  /* ───────────────────────── a7 — the rest of SingleChatPage.xaml.cs ───────────────────────── */
  const restNow = sclRest(scpRaw);
  const a7 = { found: !restNow.startsWith('<<'), sameAsBase: sha(restNow) === BASE.sclRest };
  ok(F(a7).length === 0,
    '★ histcs a7 sclRest: SingleChatPage.xaml.cs minus the region directly after onLoadMore() (loadMoreIn and its members), the inserted statements of loadMessages and the UiBatch field (★ #46 r1: + the jump seen, the early close, the deferred file rows; r3: + the deferral behind a kept page, and pushPendingJump\'s new first statement), the two replaced base texts put back (insertMessage\'s `lock (fileRowsShown) { fileRowsShown.Add(…); }`, pushPendingJump\'s `jumpArmedId = null;`) and the one branch statement (put back to `onLoadMore();`) is the base (comments masked, whitespace collapsed; SHA-256 at 338d30f4): the open path, requestPrepend / takePrepend, the read loop (its `window == 100` step), insertMessage, the media hold, every other method is the base\'s — failing: ' + JSON.stringify(F(a7)) + (a7.found ? ' got ' + sha(restNow) : ' ' + restNow));

  /* ───────────────────────── a8 — SpixiFlags.cs ───────────────────────── */
  const flagsRaw = text(FLAGS_F);
  const fCode = mask(flagsRaw), fBare = mask(flagsRaw, true);
  const initS = span(fCode, fBare, 'public static void init()');
  const initN = norm(initS.text);
  const readLines = flagsRaw.split('\n').filter((l) => /^\s*HistcsFlags\.read\(\);/.test(l));
  const readAt = fCode.indexOf('HistcsFlags.read();');
  const outside = (() => { const at = flagsRaw.indexOf(BLOCK_OPEN); return at >= 0 ? flagsRaw.slice(0, at) + flagsRaw.slice(flagsRaw.lastIndexOf('}')) : flagsRaw; })();
  const flagsNow = flagsRest(flagsRaw);
  const a8 = {
    found: initS.end > 0 && count(fBare, 'public static void init()') === 1,
    noReadLine: readLines.length === 0 && count(fCode, 'HistcsFlags.read(') === 0,   // lead (merge): the switches are read LAZILY (HistcsFlags.ensureRead), not by init()
    initUntouched: initN.endsWith('readPhoto1b(); readFixb4(); }') && count(initN, 'HistcsFlags') === 0,   // ★ histcs merge re-base (2026-11-23): init() of the merged base ends with fixb4's `readFixb4();` (was `readPhoto1b(); }` at 338d30f4)
    noUseOutsideTheBlock: words(mask(outside), 'HistcsFlags') === 0,
    sameAsBase: sha(flagsNow) === BASE.flagsRest,
  };
  ok(F(a8).length === 0,
    '★ histcs a8 flagsRest: SpixiFlags.cs minus the histcs block is the base (raw text, whitespace collapsed; SHA-256 at 338d30f4): init() is untouched (it still ends with `readPhoto1b(); readFixb4();`, the merged base 8ce1215d) and NO line outside the block names HistcsFlags — the two switches are read lazily, once per process, at their first use (HistcsFlags.ensureRead; csh flags_read_lazily_once_not_by_init) — failing: ' + JSON.stringify(F(a8)) + ' got ' + sha(flagsNow));

  /* ───────────────────────── a9 — the block ───────────────────────── */
  const blockAt = flagsRaw.indexOf(BLOCK_OPEN);
  const blockRaw = blockAt >= 0 ? flagsRaw.slice(blockAt, flagsRaw.lastIndexOf('}')) : '';
  const bCode = mask(blockRaw), bBare = mask(blockRaw, true);
  const bN = norm(bCode);
  const typeNames = [...bBare.matchAll(/\b(?:class|struct|enum|interface|record)\s+(\w+)/g)].map((m) => m[1]);
  const prefCalls = [...bCode.matchAll(/Preferences\.Default\.(\w+)\(([^)]*)\)/g)].map((m) => m[1] + '(' + norm(m[2]) + ')').sort();
  const busyN = norm(span(bCode, bBare, 'internal sealed class OlderBusy').text);
  const BUSY_BODY = '{ private object? owner = null; public bool tryEnter(object owner) { return System.Threading.Interlocked.CompareExchange(ref this.owner, owner, null) == null; } public void leave(object owner) { System.Threading.Interlocked.CompareExchange(ref this.owner, null, owner); } public bool held { get { return System.Threading.Volatile.Read(ref owner) != null; } } }';
  const a9 = {
    found: blockAt > 0 && count(flagsRaw, BLOCK_OPEN) === 1,
    exactlySevenTypes: JSON.stringify(typeNames) === JSON.stringify(['HistcsFlags', 'OlderDrop', 'HistoryOlderRules', 'OlderBusy', 'OlderPushGate', 'Ticket', 'OtherLoad']),
    declarations: ['public static class HistcsFlags', 'internal enum OlderDrop', 'internal static class HistoryOlderRules', 'internal sealed class OlderBusy', 'internal sealed class OlderPushGate'].every((d) => count(bN, d) === 1),
    noLogNoBridgeNoTaskNoFile: !/\bLogging\b|P1Perf|sendUiCommand|executeUiCommand|WebView|SecureStorage|WalletPassStore|\bTask\b|\bThread\b|Timer|File\.|Directory\.|System\.IO|\bawait\b|\basync\b/.test(bBare),
    readsOnly: !/Preferences\.Default\.(Set|Remove|Clear)\(/.test(bCode) && prefCalls.length === 3 && prefCalls.every((c) => c.startsWith('Get(')),
    effectiveFlagTwice: count(bN, 'S16PassRules.effectiveFlag(') === 2,
    noDirective: !/^\s*#/m.test(bCode),
    busyIsAtomicAndOwnerAware: busyN === BUSY_BODY,   // ★ histcs #46 r1 (S-3; csh m18 is held HERE, by source): both transitions are Interlocked.CompareExchange(ref …), the leave by owner
    scheduleLeavesByOwner: count(bN, 'busy.leave(owner);') === 2 && count(bN, 'busy.leave(') === 2 && count(bN, 'public static bool schedule(OlderBusy busy, object owner, Action<Action> schedule, Action body, Action<Exception> onFail, Action after)') === 1,
  };
  ok(F(a9).length === 0,
    '★ histcs a9 block: the block at the END of SpixiFlags.cs (inside `namespace SPIXI`, after SpixiFlags) holds exactly seven types — the five of contract § 2 (HistcsFlags, OlderDrop, HistoryOlderRules, OlderBusy, OlderPushGate) + OlderPushGate\'s nested Ticket and its private OtherLoad scope — and nothing else; OlderBusy is OWNER-aware and atomic (tryEnter = `Interlocked.CompareExchange(ref this.owner, owner, null) == null`, leave = `Interlocked.CompareExchange(ref this.owner, null, owner)`; ★ #46 r1 S-3 — the csh break m18 (a non-atomic tryEnter) is held here, by source) and schedule leaves twice, both `busy.leave(owner)`; its code names no Logging / P1Perf / bridge / task / thread / file word (the flags read logs NOTHING), reads exactly three preferences with `.Get(` and writes, removes and clears none (an existing account is not touched), uses S16PassRules.effectiveFlag twice (a stored 0 acts only in dev mode), no `#` directive — failing: ' + JSON.stringify(F(a9)) + ' types ' + JSON.stringify(typeNames) + ' prefs ' + JSON.stringify(prefCalls));

  /* ───────────────────────── a10 — the harness ───────────────────────── */
  const csproj = text(CSPROJ_F);
  const tests = mask(text(TESTS_F));
  const a10 = {
    compiled: count(csproj, 'Include="../../Spixi/Utils/SpixiFlags.cs"') === 1 && !/Compile\s+Remove/.test(csproj) && !/EnableDefaultCompileItems/.test(csproj),
    testFile: tests.length > 0 && /\[TestClass\]\s*public class HistcsTests\b/.test(tests),
    allTests: TESTS.length === 43 && (tests.match(/\[TestMethod\]/g) || []).length === TESTS.length && TESTS.every((t) => new RegExp('\\[TestMethod\\]\\s*public void ' + t + '\\(\\)').test(tests)),
    realTypes: !/\b(?:class|struct|enum)\s+(?:HistcsFlags|HistoryOlderRules|OlderBusy|OlderPushGate|OlderDrop|SpixiFlags)\b/.test(tests),
    realThreads: /new Thread\(/.test(tests) && /ManualResetEventSlim/.test(tests) && /Barrier/.test(tests) && /Task\.Run/.test(tests),
  };
  ok(F(a10).length === 0,
    '★ histcs a10 harness: scripts/csh/csh.csproj compiles the REAL Spixi/Utils/SpixiFlags.cs (no `Compile Remove`, default compile items on, so HistcsTests.cs is built), scripts/csh/HistcsTests.cs holds its 43 tests (the flags, nextShow / usesNewPath, the OWNER-aware busy guard, schedule (leaves by its owner), decide, the push gate with real threads, the line builders, "both switches OFF = the base"), defines none of the real types again, and uses real threads — failing: ' + JSON.stringify(F(a10)));

  /* ───────────────────────── a11 — the new code, whole (★ histcs #46 r1, O2 MINOR-1/-2/-3) ───────────────────────── */
  const parts = regionParts(scpRaw);
  const rh = regionHashes(scpRaw);
  const a11 = {
    found: !parts.region.startsWith('<<') && !parts.jump.startsWith('<<') && parts.inserts.every((x) => !x.startsWith('<<')),
    twentyThreeInserts: parts.inserts.length === 23,   // ★ histcs #46 r4: + deleteMessage's and updateMessage's late-repeat statements · ★ histcs #46 r2: 18 + the fallback drop (loadMessages) + applyPendingJumpWindow's statement · r3: + the deferral behind a kept page (loadMessages)
    regionWhole: rh.region === NEW.region,
    pushPendingJumpWhole: rh.pushPendingJump === NEW.pushPendingJump,
    insertsWhole: rh.inserts === NEW.inserts,
  };
  ok(F(a11).length === 0,
    '★ histcs a11 regionWhole: the NEW code that a7 cuts out is itself held whole by FROZEN SHA-256 values (regionHashes, re-based after a look at the diff) — the region between onLoadMore()\'s closing brace and the `#1166 B2` comment (loadMoreIn, OlderJob, the fields, takeOlderJob, olderMayPush, olderPushed, olderPostMarker, olderDeferBehindPage, olderPostBehind, olderClosedEarly, olderFallbackDrop, beginLoadScope; comments masked, whitespace collapsed), the body of pushPendingJump() (the r3 deferral behind a kept page as its first statement, the F1 test of the background page and the atomic take), and the list of the 23 `★ histcs` statements of loadMessages() (18), insertMessage(…, batch) (the deferred file-row wrap), UiBatch (the deferredFileRows field), applyPendingJumpWindow() (★ #46 r2: the one `olderBusy.held` widening statement, read whole by its text) and deleteMessage() / updateMessage() (★ #46 r4: the one `olderLatePushes.Enqueue` statement each) — a statement added, removed or changed there turns this red — failing: ' + JSON.stringify(F(a11)) + ' got ' + JSON.stringify(rh) + ' inserts ' + parts.inserts.length);
}
