/* ==== histcs · B — History C#: the developer lines (HV-0), their grammar, the keys, no new bridge surface. Contract docs/contract-histcs.md § 3 / § 4;
 * mechanisms docs/histcs-mechanisms.md § 7.
 *
 * LIMITS — read first (DECISIONS 1735 / 1627: the limits of a source pin are stated, not hidden). This is a SOURCE pin. What a line CONTAINS
 * at run time is the C# harness's (scripts/csh/HistcsTests.cs: the exact texts, the extreme ints, the [P1] grammar through P1Perf.line, the
 * builders' parameter TYPES by reflection). This module reads the TEXT of the call sites in the MAUI file SingleChatPage.xaml.cs and the
 * names in the other C# files. What it does NOT catch:
 *   · anything at run time: which line is logged, how often, that a store build logs none (P1Perf.line is a no-op there — a fact of
 *     P1Perf.cs, held by pins-coldstart1/a-lines), the order of lines between threads;
 *   · deliberately hidden code: a `using L = IXICore.Meta.Logging;` alias, a logging helper that another file adds and a changed method
 *     calls (only the calls written `Logging.<x>(`, `P1Perf.line(`, `sendUiCommand(` in THIS file are counted), a `using static`, a call
 *     through reflection or a delegate, an identifier written with a `\u` escape, a second partial of SingleChatPage in another file;
 *   · a C# 11 raw string literal (`"""…"""`) — the comment mask does not know it; the two files read here have none today;
 *   · the Ixian-Core logger and what the platform does with a line (logcat, the console hook);
 *   · what a caller of `HistoryOlderRules.*Body` passes when the call is written another way than `P1Perf.line(HistoryOlderRules.<x>(<args>));`
 *     (such a call is counted and refused by b1, not evaluated);
 *   · files outside Spixi/ (.cs), src/ and Spixi/Resources/Raw/html (the web side is read for the two key strings and the two line words only).
 * Comments are masked first (comments → spaces, newlines kept, strings kept; the coldstart1 / photo1a / defaultsb mask, copied here so that this
 * module stands alone); the bracket walks use a second mask that also blanks string contents.
 * BASE = 338d30f4. The frozen numbers below (the count of `Logging.` / `P1Perf.line(` / `sendUiCommand(` / `"ixian:` / `Task.Run(` in the code of
 * SingleChatPage.xaml.cs, the 56 push names) are counted over the comment-masked code of the BASE file with the mask of this module; the new
 * code adds exactly what the contract names (the flags line, the type-only warn, the five dev lines, one Task.Run) + the round-3 members (★ #46 r3, the delivery
 * order: the type-only warn of olderPostBehind, one more Task.Run, two MainThread.BeginInvokeOnMainThread posts) + the round-1 early-close
 * dev line (★ #46 r1 S-1, `why=closed`, in olderClosedEarly) + the round-2 lines (★ #46 r2: `why=channel` in olderClosedEarly — the same ONE
 * call with a conditional argument — and `why=anchor` in the new olderFallbackDrop).
 *
 * KEYS (each ONE `ok`):
 *   b1 builders  — `HistoryOlderRules.olderReadBody(` / `.pushBody(` / `.dropBody(` / `.LoadMoreInBody` are used ONLY in SingleChatPage.xaml.cs (1 / 1 / 4 / 1;
 *                  ★ #46 r1 S-1: the third dropBody is olderClosedEarly's `why=closed`; ★ #46 r2: the fourth is olderFallbackDrop's `why=anchor`, and
 *                  olderClosedEarly's one call also says `why=channel`);
 *                  each is the sole argument of `P1Perf.line(`, inside an `if (P1Perf.enabled …) { … }` block, outside every `#if`; their
 *                  arguments are plain identifiers / member reads of int-long locals (readBody and pushBody: the exact contract text;
 *                  dropBody: PER SITE (★ #46 r2) — loadMoreIn `OlderDrop.Busy`, olderMayPush the identifier `why`, olderClosedEarly exactly
 *                  `closed ? OlderDrop.Closed : OlderDrop.Channel` (the ONLY conditional argument), olderFallbackDrop `OlderDrop.Anchor`; every other site refused)
 *                  — no string, no `+`, no `$"`, no message / address / name word
 *   b2 nolog     — no other new log call: SingleChatPage.xaml.cs holds exactly 193 `Logging.` calls at r3 (★ r4: 195, see below) (base 190 + the flags line + the two type-only
 *                  warns — ★ #46 r3: + olderPostBehind's `a deferred chat push failed (` + e.GetType().Name + `)`), 16 `P1Perf.line(` (base 9 + loadmore-in, the busy drop, the drop, the early close (★ #46 r1), the fallback drop (★ #46 r2), the older read, the
 *                  older push), 87
 *                  `sendUiCommand(`; loadMessages() keeps its 4 `Logging.` and 7 `sendUiCommand(` and gains exactly 2 `P1Perf.line(`; the
 *                  new region has exactly the three Logging calls (`Logging.info(HistcsFlags.flagsLine(…))`, `Logging.warn("loadmore: the older
 *                  page failed (" + e.GetType().Name + ")")`, and (r3) `Logging.warn("loadmore: a deferred chat push failed (" + e.GetType().Name + ")")` in
 *                  olderPostBehind's catch — the argument is the exception TYPE and nothing else) and five `P1Perf.line(`; no `.Message`, `.StackTrace`, `.ToString(`, `+ e`, `$"` there
 *   ★ r4 (S4 MINOR-1, the late repeats): b2 — 195 `Logging.` (base 190 + 5: the flags line, the older page's warn, olderDrainLate's `a late chat push failed (` warn, olderPostBehind's two `a deferred chat push failed (` warns); 88 `sendUiCommand(` (base 87 + 1); the region's five log calls in the order info, warn, warn (the drain's), warn, warn;
 *   b4 — 87 literal push calls (base 86 + 1) with the same 56 names: the one new call is deleteMessage's repeat of its own push inside the Enqueue lambda (`lateRepeatPush`); Task.Run / BeginInvokeOnMainThread counts unchanged (2 / 2 in the region, 19 / 24 in the file).
 *   b3 keys      — the C#-only preference keys: `flagLoadMoreOffUi` and `flagFirstOlderPage50` and the line words `loadmoreoffui` / `firstpage50`
 *                  appear only in SpixiFlags.cs among the C# files of Spixi/ (once each); the two Key constants only there; the two switch
 *                  properties only in SpixiFlags.cs and SingleChatPage.xaml.cs; none of the six words is in any file of src/ or Spixi/Resources/Raw/html
 *   b4 bridge    — no new bridge verb, push name or push shape: SingleChatPage.xaml.cs holds the base's 56 push names (the set of the literal
 *                  first arguments of `sendUiCommand(<page>, "<name>"`), 86 such calls, 104 `"ixian:` literals; the new region names no
 *                  sendUiCommand / executeUiCommand / evaluateJavascript / `ixian:` and holds exactly two `Task.Run(` (the schedule lambda + (r3) olderPostBehind;
 *                  the file: base 17 + 2); ★ r3: `MainThread.BeginInvokeOnMainThread(` appears in the region ONLY in olderPostMarker and olderPostBehind
 *                  (one each; the file: base 22 + 2)
 *
 * PLANNED BREAKS (#802; each ONE mutation in a COPY of the tree, run with --root, then restored; the key that must turn red; the lead runs them):
 *   b1: `HistoryOlderRules.olderReadBody(readPasses, window, …)` → `readBody(readPasses, window, …) + friend.nickname`-style: the call's first argument
 *       replaced by `friend.nickname.Length` [b1, + a5]; the push line moved out of its `P1Perf.enabled` block (the `if` removed, braces kept as a
 *       plain block) [b1, + a5]; the busy-drop line written `Logging.info("[P1] " + HistoryOlderRules.olderDropBody(OlderDrop.Busy))` [b1, b2];
 *       `HistoryOlderRules.olderPushBody(` called from a new method of another file (e.g. Spixi/Utils/Foo.cs) [b1]; the dev line wrapped in `#if ANDROID` [b1]
 *   b1 (r2, run 2026-11-22 in a tree copy, red exactly as listed): olderFallbackDrop's `OlderDrop.Anchor` → `OlderDrop.Closed` [b1]; olderClosedEarly's conditional → `why` [b1]; its two members swapped [b1];
 *       a second `P1Perf.line(…olderDropBody(OlderDrop.Anchor));` in olderFallbackDrop [b1, b2]; olderFallbackDrop's `if (P1Perf.enabled)` → `if (true)` [b1]
 *   b2: a `Logging.info("older " + n)` added in olderMayPush [b2]; a second `Logging.warn(` in loadMoreIn [b2]; `e.GetType().Name` → `e.Message` in the warn [b2];
 *       a third `P1Perf.line(` in loadMessages [b2, + a5]; a `Logging.warn` added in loadMessages [b2, + a5]
 *   r4 (run 2026-11-23 in a tree copy, red exactly as listed): `e.GetType().Name` → `e.Message` in olderDrainLate's warn [b2, + a4, a11]; olderPostBehind's outer catch warn changed [b2, + a4, a11];
 *       deleteMessage's lambda `sendUiCommand(this, "deleteMessage", lateId)` → another push name [b4, + a5, a7, a11]; a `Task.Run(` in olderDrainLate [b4, + a4, a6, a11]
 *   r3 (the delivery order; run 2026-11-22 in a minimal tree copy, red exactly as listed): `e.GetType().Name` → `e.Message` in olderPostBehind's warn [b2]; a second `Logging.warn(e.ToString());` there [b2];
 *       a third `Task.Run(` in the region [b4]; olderPostBehind without its `Task.Run(` [b4]; a `MainThread.BeginInvokeOnMainThread(` in olderDeferBehindPage [b4];
 *       one in loadMessages (outside the region) [b4]; olderClosedEarly's parameter renamed (its drop site no longer found) [b1]
 *   b3: the string "flagLoadMoreOffUi" copied into SingleChatPage.xaml.cs [b3]; `flagFirstOlderPage50` in src/bridge/native.js (a comment is enough) [b3];
 *       `HistcsFlags.FirstOlderPage50` read in a new file Spixi/Utils/Foo.cs [b3]; the word `firstpage50` in the built html [b3]
 *   b4: a new `Utils.sendUiCommand(this, "olderDropped");` in loadMoreIn [b4, + a6]; an `executeUiCommand` in the new region [b4]; a second `Task.Run(` in
 *       the region [b4]; an existing push name renamed [b4, + a7]
 */
import { readFileSync as readBytes } from 'node:fs';   // the file as it is on disk

const count = (t, s) => t.split(s).length - 1;
const norm = (x) => x.replace(/\s+/g, ' ').trim();

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

const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs';
const SIG_ONLOADMORE = 'private void onLoadMore()';
const B2_MARK = '/* ★ #1166 B2 (#1142';

/* FROZEN from the base 338d30f4 (counted over the comment-masked code of SingleChatPage.xaml.cs with this module's mask; see the header) */
const BASE = {
  logging: 190, p1line: 9, sendUi: 87, ixianLiterals: 104, taskRun: 17, literalPushCalls: 86, mainPost: 22,   // mainPost: `MainThread.BeginInvokeOnMainThread(` (★ #46 r3)
  loadMessages: { logging: 4, p1line: 1, sendUi: 7 },
  pushNames: ['addApp', 'addChannelToSelector', 'addContact', 'addMessages', 'addReactions', 'callRefused', 'cancelInviteResult', 'chatBack', 'clearApps', 'clearInput', 'clearMessages',
    'deleteMessage', 'fileNotice', 'hideBackButton', 'jumpToMessage', 'leaveGroupResult', 'mediaDropped', 'mediaError', 'mediaPicked', 'messagesDone', 'onChatScreenLoaded', 'onChatScreenReady',
    'payRequestResult', 'setAvatar', 'setAvatarFor', 'setCaps', 'setChannelSelectorStatus', 'setChatMode', 'setFileThumb', 'setGroupOwner', 'setNickname', 'setOfferPreview', 'setOnlineStatus',
    'setPhotoPreviews', 'setReadReceipts', 'setSelectedChannel', 'setSelfAvatar', 'setSelfNick', 'setTipResult', 'setUnreadIndicator', 'showCallButton', 'showRequestSentModal', 'showUserTyping',
    'showWarning', 'undoRequestResult', 'updateFile', 'updateFileTicks', 'updateGroupChatNicks', 'updateMessage', 'updatePaymentRequestStatus', 'updateTransactionStatus', 'viewerImage', 'voiceInfo',
    'voiceRec', 'voiceRecLevel', 'voiceState'],
};

/* the exact argument texts of the two contract-fixed calls (contract-histcs § 3 loadMessages (iii) / (v)) */
const READ_ARGS = 'readPasses, window, P1Perf.msSince(readT0), flushMs';
const PUSH_ARGS = 'batch.items.Count, json != null ? json.Length : 0, buildClock.ElapsedMilliseconds';
/* ★ histcs #46 r2: the dropBody argument PER SITE — each drop site sits in ONE named method and passes exactly the argument that method owns (a fixed OlderDrop member, olderMayPush's
   decided `why`, and olderClosedEarly's one conditional of two fixed members — the only conditional argument allowed) */
const DROP_SITES = [
  { sig: 'private void loadMoreIn()', arg: 'OlderDrop.Busy' },
  { sig: 'private bool olderMayPush(OlderJob? job, int readChannel)', arg: 'why' },
  { sig: 'private bool olderClosedEarly(OlderJob? job, int readChannel)', arg: 'closed ? OlderDrop.Closed : OlderDrop.Channel' },
  { sig: 'private bool olderFallbackDrop(OlderJob? job, bool prepend)', arg: 'OlderDrop.Anchor' },
];
const BAD_ARG_WORD = /message|address|path|name|nick|text|tostring|gettype|stacktrace/i;

/* the `if` conditions of the blocks that enclose `pos` (innermost first), read on the string-blanked mask */
const enclosingConds = (bare, pos) => {
  const conds = [];
  let depth = 0;
  for (let k = pos - 1; k >= 0; k--) {
    const c = bare[k];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth > 0) { depth--; continue; }
      let j = k - 1;
      while (j >= 0 && /\s/.test(bare[j])) j--;
      if (bare[j] === ')') {
        let d = 0, m = j;
        for (; m >= 0; m--) { if (bare[m] === ')') d++; else if (bare[m] === '(') { d--; if (d === 0) break; } }
        if (m > 0 && /\bif$/.test(bare.slice(0, m).trimEnd())) conds.push(norm(bare.slice(m + 1, j)));
      }
    }
  }
  return conds;
};
/* the argument text of the call whose `(` is at `open` (parentheses balanced on the string-blanked mask), read from the comment mask */
const argsAt = (code, bare, open) => {
  let d = 0;
  for (let k = open; k < bare.length; k++) {
    if (bare[k] === '(') d++;
    else if (bare[k] === ')' && --d === 0) return { text: norm(code.slice(open + 1, k)), end: k + 1 };
  }
  return { text: '<<unbalanced>>', end: -1 };
};

export default async function (h) {
  const { ok, root, readdirSync, existsSync, join } = h;
  const text = (f) => (existsSync(join(root, f)) ? readBytes(join(root, f)).toString('utf8').replace(/^\uFEFF/, '') : '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const walk = (dir, keep, skipTop, out = [], top = true) => {
    if (!existsSync(join(root, dir))) return out;
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) { if (!(top && skipTop.includes(e.name.toLowerCase()))) walk(rel, keep, skipTop, out, false); }
      else if (keep.test(e.name)) out.push(rel);
    }
    return out;
  };
  const csFiles = walk('Spixi', /\.cs$/i, ['bin', 'obj']);
  const csCode = {};
  for (const f of csFiles) csCode[f] = mask(text(f));
  const webFiles = [...walk('src', /\.(html|js|mjs|css|json)$/i, ['node_modules']), ...walk('Spixi/Resources/Raw/html', /\.(html|js|mjs|css|json)$/i, [])];

  const raw = text(SCP_F);
  const code = mask(raw), bare = mask(raw, true);
  const om = span(code, bare, SIG_ONLOADMORE);
  const b2At = raw.indexOf(B2_MARK);
  const regionOk = om.end > 0 && b2At > om.end;
  const region = regionOk ? code.slice(om.end, b2At) : '';          // loadMoreIn + the new members
  const regionBare = regionOk ? bare.slice(om.end, b2At) : '';
  const lm = span(code, bare, 'public void loadMessages()');
  const lmBare = lm.end > 0 ? bare.slice(lm.open, lm.end) : '';
  const lmCode = lm.text;
  const ctr = (t, re) => (t.match(re) || []).length;

  /* ───────────────────────── b1 — the four builders ───────────────────────── */
  const sites = [];   // every `HistoryOlderRules.<x>` use in SingleChatPage.xaml.cs: { name, args | null, pos }
  for (const m of code.matchAll(/HistoryOlderRules\.(olderReadBody|olderPushBody|olderDropBody|LoadMoreInBody)\b/g)) {
    const after = m.index + m[0].length;
    if (m[1] === 'LoadMoreInBody') { sites.push({ name: m[1], args: null, pos: m.index, end: after }); continue; }
    if (code[after] !== '(') { sites.push({ name: m[1], args: '<<not a call>>', pos: m.index, end: after }); continue; }
    const a = argsAt(code, bare, after);
    sites.push({ name: m[1], args: a.text, pos: m.index, end: a.end });
  }
  const by = (n) => sites.filter((s) => s.name === n);
  const wrapped = (s) => {
    const pre = code.slice(Math.max(0, s.pos - 14), s.pos);
    const post = code.slice(s.end, s.end + 3);
    return /P1Perf\.line\($/.test(pre) && /^\s*\)\s*;/.test(post);
  };
  const devOnly = (s) => enclosingConds(bare, s.pos).some((c) => /^P1Perf\.enabled(?: && [\w.!() =<>]+)?$/.test(c));
  const otherFilesWithBuilders = csFiles.filter((f) => f !== SCP_F && f !== FLAGS_F && /HistoryOlderRules\./.test(csCode[f]));
  const dropMethods = DROP_SITES.map((d) => ({ ...d, sp: span(code, bare, d.sig) }));
  const dropArgsOk = dropMethods.every((d) => d.sp.end > 0 && count(bare, d.sig) === 1
    && by('olderDropBody').filter((s) => s.pos > d.sp.open && s.pos < d.sp.end).length === 1
    && by('olderDropBody').filter((s) => s.pos > d.sp.open && s.pos < d.sp.end).every((s) => s.args === d.arg))
    && by('olderDropBody').every((s) => dropMethods.some((d) => d.sp.end > 0 && s.pos > d.sp.open && s.pos < d.sp.end));   // no drop site outside the four methods
  const b1 = {
    found: raw.length > 0 && lm.end > 0 && regionOk,
    counts: by('olderReadBody').length === 1 && by('olderPushBody').length === 1 && by('olderDropBody').length === 4 && by('LoadMoreInBody').length === 1,   // ★ histcs #46 r1 (S-1): + olderClosedEarly's why=closed · r2: + olderFallbackDrop's why=anchor
    onlyInTheChatPage: otherFilesWithBuilders.length === 0,
    soleArgumentOfP1Line: sites.length === 7 && sites.every(wrapped),
    underP1PerfEnabled: sites.length === 7 && sites.every(devOnly),
    outsideEveryIf: sites.length === 7 && sites.every((s) => regionsAt(code, s.pos).length === 0),
    readArgs: by('olderReadBody').every((s) => s.args === READ_ARGS),
    pushArgs: by('olderPushBody').every((s) => s.args === PUSH_ARGS),
    dropArgs: dropArgsOk,   // ★ histcs #46 r2: per site (DROP_SITES): one site per named method, each with its own fixed argument
    noTextCanReach: sites.every((s) => s.args === null || (!/["$@]/.test(s.args) && !BAD_ARG_WORD.test(s.args) && /^[A-Za-z0-9_.,?:!=<>()\s]*$/.test(s.args))),
    readAndPushInLoadMessages: by('olderReadBody').every((s) => s.pos > lm.open && s.pos < lm.end) && by('olderPushBody').every((s) => s.pos > lm.open && s.pos < lm.end),
    dropsInTheRegion: by('olderDropBody').every((s) => s.pos > om.end && s.pos < b2At) && by('LoadMoreInBody').every((s) => s.pos > om.end && s.pos < b2At),
  };
  ok(F(b1).length === 0,
    '★ histcs b1 builders: HistoryOlderRules.olderReadBody / pushBody / dropBody / LoadMoreInBody are used only in SingleChatPage.xaml.cs (1 / 1 / 4 / 1 — read and push in loadMessages, the busy drop and the loadmore-in line in loadMoreIn, the drop in olderMayPush, the early close in olderClosedEarly (★ #46 r1 S-1; r2: `why=closed` or `why=channel`) and the fallback drop in olderFallbackDrop (★ #46 r2 `why=anchor`) counted in the four dropBody), each as the SOLE argument of `P1Perf.line(`, inside an `if (P1Perf.enabled …) { … }` block (developer builds only), outside every `#if`; the arguments are the contract text — readBody(`' + READ_ARGS + '`), pushBody(`' + PUSH_ARGS + '`), dropBody(PER SITE, ★ #46 r2: loadMoreIn `OlderDrop.Busy`, olderMayPush `why`, olderClosedEarly `closed ? OlderDrop.Closed : OlderDrop.Channel` (the only conditional), olderFallbackDrop `OlderDrop.Anchor`) — no string, no `+`, no message / address / name word: nothing but ints, longs and a fixed word can reach a line — failing: ' + JSON.stringify(F(b1)) + ' sites ' + JSON.stringify(sites.map((s) => s.name + '(' + (s.args ?? '') + ')')));

  /* ───────────────────────── b2 — no other new log call ───────────────────────── */
  const logRe = /\bLogging\./g, lineRe = /P1Perf\.line\(/g, sendRe = /sendUiCommand\(/g;
  const logsInRegion = [...region.matchAll(/Logging\.(\w+)\(/g)].map((m) => m[0]);
  const warnAts = [...region.matchAll(/Logging\.warn\(/g)].map((m) => m.index);
  const warnTexts = warnAts.map((a) => argsAt(region, regionBare, a + 'Logging.warn'.length).text);   // ★ histcs #46 r3: two warns in the region now
  const warnText = warnTexts.length > 0 ? warnTexts[0] : '';
  const DEFERRED_WARN = '"loadmore: a deferred chat push failed (" + e.GetType().Name + ")"', LATE_WARN = '"loadmore: a late chat push failed (" + e.GetType().Name + ")"';   // ★ histcs #46 r3 / r4: fixed text + the exception TYPE, nothing else
  const b2 = {
    found: regionOk && lm.end > 0,
    fileLoggingCalls: ctr(code, logRe) === BASE.logging + 5 + 1 && count(code, 'Logging.info("[QB2] " + ReplyMatchLog.body(') === 1,   // ★ quotebox2 re-base (2026-11-27, after a look at the diff): + 1 = matchReply's dev-only [QB2] line, named exactly (pins-quotebox2/b-matchlog holds it inside #if SPIXI_DEV_COEXIST);   // ★ histcs #46 r3: + the deferred-push warn (type only) · r4: + the post's own catch in olderPostBehind (the same text) and olderDrainLate's late-push warn
    fileP1Lines: ctr(code, lineRe) === BASE.p1line + 7,   // ★ histcs #46 r1 (S-1): + the early close · r2: + the fallback drop
    fileSendUi: ctr(code, sendRe) === BASE.sendUi + 1,   // ★ histcs #46 r4 (S4 MINOR-1): + deleteMessage's repeat of its own push (b4 holds that it is the one call, the same name)
    loadMessagesLogging: ctr(lmCode, logRe) === BASE.loadMessages.logging && ctr(lmCode, sendRe) === BASE.loadMessages.sendUi && ctr(lmCode, lineRe) === BASE.loadMessages.p1line + 2,
    regionLogs: JSON.stringify(logsInRegion) === JSON.stringify(['Logging.info(', 'Logging.warn(', 'Logging.warn(', 'Logging.warn(', 'Logging.warn(']),   // ★ histcs #46 r3: the flags line, the older page's warn, olderPostBehind's warn · r4 (in this order): the flags line, the older page's warn, olderDrainLate's warn, olderPostBehind's two warns
    regionP1Lines: ctr(region, lineRe) === 5 && ctr(region, sendRe) === 0,   // LoadMoreInBody, the busy drop, the older page's drop, the early close (★ #46 r1 S-1), the fallback drop (★ #46 r2)
    flagsLineOnce: count(norm(region), 'Logging.info(HistcsFlags.flagsLine(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50));') === 1,
    warnIsTypeOnly: warnText === '"loadmore: the older page failed (" + e.GetType().Name + ")"' && count(norm(region), '"loadmore: the older page failed ("') === 1,
    warnsInOrder: warnTexts.length === 4,   // ★ histcs #46 r4: the older page's, the late push's, olderPostBehind's two
    deferredWarnIsTypeOnly: warnTexts.length === 4 && warnTexts[2] === DEFERRED_WARN && warnTexts[3] === DEFERRED_WARN && count(norm(region), '"loadmore: a deferred chat push failed ("') === 2   // ★ histcs #46 r3: the argument is the exception TYPE and nothing else · r4: two lines, the same fixed text (the action's catch and the post's own catch, S4 NIT-3 / O5 NIT-2)
      && (() => { const pb = span(region, regionBare, 'void olderPostBehind(Action action)'); return pb.end > 0 && count(pb.text, 'Logging.warn(') === 2 && count(pb.text, 'catch (Exception e)') === 2; })(),   // both inside olderPostBehind, each in a `catch (Exception e)`
    lateWarnIsTypeOnly: warnTexts.length === 4 && warnTexts[1] === LATE_WARN && count(norm(region), '"loadmore: a late chat push failed ("') === 1   // ★ histcs #46 r4 (S4 MINOR-1): the NEW line — the argument is the exception TYPE and nothing else, in olderDrainLate's catch
      && (() => { const dr = span(region, regionBare, 'void olderDrainLate()'); return dr.end > 0 && count(dr.text, 'Logging.warn(') === 1 && count(dr.text, 'catch (Exception e)') === 1 && dr.text.indexOf('Logging.warn(') > dr.text.indexOf('catch (Exception e)'); })(),
    noTextOfAnExceptionOrAString: !/\.Message\b|\.StackTrace|\.ToString\(|\+\s*e\b(?!\s*\.)|\+\s*ex\b(?!\s*\.)|\$"|\.InnerException|\.Data\b/.test(region),
  };
  ok(F(b2).length === 0,
    '★ histcs b2 nolog: no other new log call — SingleChatPage.xaml.cs holds ' + (BASE.logging + 5) + ' `Logging.` calls (the base\'s ' + BASE.logging + ' + the flags line + four type-only warns — the older page\'s, olderPostBehind\'s two (★ #46 r3; r4: the post\'s own catch too) and olderDrainLate\'s (★ #46 r4)), ' + (BASE.p1line + 7) + ' `P1Perf.line(` (base ' + BASE.p1line + ' + seven: loadmore-in, the busy drop, the older page\'s drop, the early close (★ #46 r1), the fallback drop (★ #46 r2), the older read, the older push) and ' + BASE.sendUi + ' `sendUiCommand(` (unchanged); loadMessages() keeps its ' + BASE.loadMessages.logging + ' Logging and ' + BASE.loadMessages.sendUi + ' push calls and gains exactly two `P1Perf.line(`; the new region logs exactly `Logging.info(HistcsFlags.flagsLine(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50))`, the `Logging.warn("loadmore: the older page failed (" + e.GetType().Name + ")")` and (★ #46 r3) the `Logging.warn("loadmore: a deferred chat push failed (" + e.GetType().Name + ")")` of olderPostBehind\'s catch (★ #46 r4: twice — the action\'s catch and the post\'s own catch) and (★ #46 r4) the `Logging.warn("loadmore: a late chat push failed (" + e.GetType().Name + ")")` of olderDrainLate\'s catch (each: the exception TYPE only), with no `.Message`, `.StackTrace`, `.ToString(`, `+ e`, interpolated string — failing: ' + JSON.stringify(F(b2)) + ' got log ' + ctr(code, logRe) + ' p1 ' + ctr(code, lineRe) + ' send ' + ctr(code, sendRe) + ' region ' + JSON.stringify(logsInRegion) + ' warn ' + JSON.stringify(warnTexts));

  /* ───────────────────────── b3 — the keys stay in C# ───────────────────────── */
  const filesWith = (re) => csFiles.filter((f) => re.test(csCode[f]));
  const countIn = (f, re) => ctr(csCode[f] || '', re);
  const WEB_WORDS = ['flagLoadMoreOffUi', 'flagFirstOlderPage50', 'loadmoreoffui', 'firstpage50', 'LoadMoreOffUi', 'FirstOlderPage50'];
  const leaked = webFiles.filter((f) => { const t = readBytes(join(root, f)).toString('utf8'); return WEB_WORDS.some((w) => t.includes(w)); });
  const sameFiles = (re, want) => JSON.stringify(filesWith(re).sort()) === JSON.stringify(want.slice().sort());
  const b3 = {
    walked: csFiles.length > 100 && csFiles.includes(SCP_F) && csFiles.includes(FLAGS_F) && webFiles.length > 20,
    keyStringsOnlyInFlags: sameFiles(/flagLoadMoreOffUi/, [FLAGS_F]) && sameFiles(/flagFirstOlderPage50/, [FLAGS_F])
      && countIn(FLAGS_F, /flagLoadMoreOffUi/g) === 1 && countIn(FLAGS_F, /flagFirstOlderPage50/g) === 1,
    keyConstantsOnlyInFlags: sameFiles(/(?<![A-Za-z0-9_])LoadMoreOffUiKey(?![A-Za-z0-9_])/, [FLAGS_F]) && sameFiles(/(?<![A-Za-z0-9_])FirstOlderPage50Key(?![A-Za-z0-9_])/, [FLAGS_F]),
    lineWordsOnlyInFlags: sameFiles(/loadmoreoffui/, [FLAGS_F]) && sameFiles(/firstpage50/, [FLAGS_F])
      && countIn(FLAGS_F, /loadmoreoffui=/g) === 1 && countIn(FLAGS_F, /firstpage50=/g) === 1,
    switchPropertiesInTwoFiles: sameFiles(/(?<![A-Za-z0-9_])LoadMoreOffUi(?![A-Za-z0-9_])/, [FLAGS_F, SCP_F]) && sameFiles(/(?<![A-Za-z0-9_])FirstOlderPage50(?![A-Za-z0-9_])/, [FLAGS_F, SCP_F]),
    notInTheWebView: leaked.length === 0,
  };
  ok(F(b3).length === 0,
    '★ histcs b3 keys: the two preference keys are C#-only — `flagLoadMoreOffUi` and `flagFirstOlderPage50` and the [FLAGS] words `loadmoreoffui=` / `firstpage50=` appear once each in Spixi/Utils/SpixiFlags.cs and in no other C# file of Spixi/; the two Key constants only there; the two switch properties (LoadMoreOffUi, FirstOlderPage50) only in SpixiFlags.cs and SingleChatPage.xaml.cs; none of the six words is in any html / js / css / json of src/ or Spixi/Resources/Raw/html — no shell can read or write them, no bridge verb carries them — failing: ' + JSON.stringify(F(b3)) + (leaked.length ? ' web: ' + JSON.stringify(leaked.slice(0, 5)) : ''));

  /* ───────────────────────── b4 — no new bridge surface ───────────────────────── */
  const pushNames = [...code.matchAll(/sendUiCommand\(\s*[A-Za-z_.]+,\s*"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
  const uniq = [...new Set(pushNames)].sort();
  const b4 = {
    found: regionOk,
    sameNames: JSON.stringify(uniq) === JSON.stringify(BASE.pushNames.slice().sort()) && pushNames.length === BASE.literalPushCalls + 1,   // ★ histcs #46 r4: + ONE call of an existing name (lateRepeatPush)
    /* ★ histcs #46 r4 (S4 MINOR-1): the ONE new push call is deleteMessage's repeat of its OWN push (`deleteMessage`, the same id) inside the lambda queued in olderLatePushes — the page sends it again behind a page in flight; no new name, no new shape */
    lateRepeatPush: (() => { const d = span(code, bare, 'public void deleteMessage(byte[] msg_id, int channel)'); if (d.end < 0) return false; const t = norm(d.text); const q = t.indexOf('olderLatePushes.Enqueue('); return count(t, 'sendUiCommand(') === 2 && q > 0 && count(t, 'olderLatePushes.Enqueue(() => Utils.sendUiCommand(this, "deleteMessage", lateId));') === 1 && t.indexOf('sendUiCommand(') < q && t.lastIndexOf('sendUiCommand(') > q && count(t, 'string lateId = Crypto.hashToString(msg_id);') === 1; })(),
    sameLiterals: count(code, '"ixian:') === BASE.ixianLiterals,
    regionHasNoBridge: !/sendUiCommand|executeUiCommand|evaluateJavascript|EvaluateJavaScriptAsync|\bixian:|SetBinding|\.Source\s*=|Navigate/.test(region),
    twoTaskRuns: count(region, 'Task.Run(') === 2 && ctr(code, /Task\.Run\(/g) === BASE.taskRun + 2   // ★ histcs #46 r3: the schedule lambda + olderPostBehind
      && (() => { const pb = span(region, regionBare, 'void olderPostBehind(Action action)'); return pb.end > 0 && count(pb.text, 'Task.Run(') === 1; })(),
    /* ★ histcs #46 r3 (the delivery order): the region touches the main thread only in olderPostMarker and olderPostBehind — two posts, none elsewhere; the file holds the base's 22 + those two */
    mainThreadPostsOnlyInTwoMembers: count(region, 'MainThread.BeginInvokeOnMainThread(') === 2 && ctr(code, /MainThread\.BeginInvokeOnMainThread\(/g) === BASE.mainPost + 2
      && (() => { const a = span(region, regionBare, 'void olderPostMarker(OlderJob job)'), b = span(region, regionBare, 'void olderPostBehind(Action action)'); return a.end > 0 && b.end > 0 && count(a.text, 'MainThread.BeginInvokeOnMainThread(') === 1 && count(b.text, 'MainThread.BeginInvokeOnMainThread(') === 1; })(),
  };
  ok(F(b4).length === 0,
    '★ histcs b4 bridge: no new bridge verb, push name or push shape (the protocol is frozen) — SingleChatPage.xaml.cs holds the base\'s 56 push names (the literal first arguments of `sendUiCommand(<page>, "<name>"`), ' + BASE.literalPushCalls + ' such calls at the base and ' + BASE.ixianLiterals + ' `"ixian:` literals; the new region (loadMoreIn and its members) names no sendUiCommand / executeUiCommand / evaluateJavascript / `ixian:` and holds exactly two `Task.Run(` (the schedule lambda; ★ #46 r3: olderPostBehind) — ★ #46 r4: the file holds one MORE push call than the base (' + (BASE.literalPushCalls + 1) + ' literal calls, the same 56 names): deleteMessage\'s repeat of its own `deleteMessage` push, queued in olderLatePushes (lateRepeatPush) — the file ' + (BASE.taskRun + 2) + ' — ★ #46 r3: `MainThread.BeginInvokeOnMainThread(` is allowed in the region only in olderPostMarker and olderPostBehind (one each; the file: the base\'s ' + BASE.mainPost + ' + 2) — failing: ' + JSON.stringify(F(b4)) + ' names ' + uniq.length + '/' + BASE.pushNames.length + ' calls ' + pushNames.length + ' (base ' + BASE.literalPushCalls + ' + 1) literals ' + count(code, '"ixian:'));
}
