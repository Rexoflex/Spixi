/* ==== photo1a · A — the chat OPEN: PO-0 (the developer-only [P1] chat lines), PO-1 (the media wait for the first paint), PO-5 (fewer
 * file checks per load) — the MAUI call sites that the C# harness cannot reach (contract docs/contract-photo1a.md § 3, § 3.1, § 5).
 *
 * The pure rules RUN in the harness (scripts/csh/PhotoOpenTests.cs, 23 tests (★ photo1a #46 r7: counted): the flags line, MediaHold / MediaGate, MediaCounts, the
 * re-check rule, UiCommandText.build (the ONE builder, ruling 1736) read from Utils.cs, fileSizeArgOnce / localArgOnce equality, LoadOnce). The pages
 * that call them (SingleChatPage, SharedItems, SpixiFlags.init) are MAUI-bound and UNCOMPILED here, so these are SOURCE pins — with the
 * limits that come with that: they read text, they do not run the page; a hidden `#define`, a shadow class or an alias is not caught
 * (the coldstart1 #1627 limits). Comments are masked first (comments -> spaces, newlines kept, strings kept: the a-extra / coldstart1
 * mask, copied here so that this module stands alone); the brace walk uses a second mask that also blanks string contents. Where a
 * rule is only a string builder (the three [P1] chat bodies, the [FLAGS] line) the expression is EVALUATED with sample numbers —
 * behaviour, not text (#771/#798).
 *   a1 lineShapes   — PhotoOpenRules.onloadMainBody / readBody / mediaBody take ONLY int / long / bool, the format helpers n() / b() are the
 *                     clamp-and-InvariantCulture and the 0|1 ones, and each return expression (literals, n(), b(), `+` — nothing else) is
 *                     evaluated: the text is exactly the line of contract § 3.1 and passes the [P1] grammar (tokens ^[a-z0-9_.=-]{1,40}$,
 *                     <= 16); a negative number is written 0; MediaCounts.takeLine passes only its integer / bool fields to mediaBody
 *   a2 lineSites    — the three lines go ONLY through P1Perf.line, from their ONE call site each (onLoad before Task.Run; loadMessages right
 *                     after the read loop and before the empty-history return and before `UiBatch batch`; scheduleMediaLine 2000 ms after the
 *                     present, once per document), inside `P1Perf.enabled`, and every argument is an integer variable of the allow-list
 *                     (no friend, address, id, path, name); no Logging./Console. in PhotoOpenRules.cs; the three body words live only there
 *   a3 flagsLine    — `[FLAGS] photo1a mediaafterpaint=<0|1> fewerchecks=<0|1> thumbstore=<0|1> voicestore=<0|1>` (★ r7: four tokens) is built by
 *                     PhotoOpenRules.flagsLine (evaluated) and logged ONCE, by Logging.info (every build), in SpixiFlags.init after the four
 *                     computes, outside any #if, with the four properties in the parameter order
 *   a4 gateOff      — the three enqueue loops of loadMessages (thumbs, voices, offers) keep their order after messagesDone and each runs the OLD
 *                     statement (`enqueueThumb(t.Key, t.Value, storeGen0);` …: the base loop + the load's ONE store generation, ★ r7 NIT-1) as the else of `if (!(holdOpen && holdMedia(…)))` — with the switch OFF
 *                     `holdOpen` is false and the old loop runs as at the base; a load-more prepend never holds (holdOpen and the gate's own
 *                     `!prepend`); the hold is the PhotoOpenRules.MediaGate whose OFF answers are the pass-through ones
 *   a5 gateOn       — ON, the held jobs are released by the paint signal (onPainted, after the present), the backstop and the paintedSeen
 *                     branch of armPresentOnPainted, each ONE runReleasedMedia(mediaGate.<release>(SpixiFlags.PhotoMediaAfterPaint, …)) on the
 *                     main thread; the hold opens in onLoad after thumbDoc++ (a reload with the paint seen holds nothing) and nowhere else
 *   a6 pushOffMain  — processThumb / processVoiceInfo build the command text on the DRAINER thread (before BeginInvokeOnMainThread, only with
 *                     the switch ON) and the main-thread lambda only hands it to sendBuiltCommand -> sendMessage after the SAME re-check
 *                     (isDisposed / doc / friend / pref); the lambda builds nothing; OFF = builtCmd null = the old Utils.sendUiCommand
 *                     statements, byte for byte; the two voice answers (`voiceState error`, `voiceInfo`) are the old ones
 *   a7 fewerOff     — PO-5: with the switch OFF `rowCache` is never installed (beginRowCache returns null; one call site; `rowCache` assigned
 *                     only there and in the scope's Dispose), so every PO-5 branch takes its ELSE = the old statement, byte for byte (localArgOf
 *                     call, fileSizeArgOf statement, the avatar statements + the unconditional imageToDataUri / avatarForRow, the three pref
 *                     reads, the re-check rule `!fewerChecks || …`); SharedItems' old localArgOf overload is untouched
 *   a8 deleteGen    — the delete generation (round 1: PROCESS-WIDE, `private static int fileDeleteGen`): ONE `Interlocked.Increment(ref fileDeleteGen)` in each of
 *                     refreshFileRow, refreshHeldFileRows, deleteMessage (★ r7: its body = the base body c0a7617 + exactly the increment and the store call) and `public static void noteFileDeleted()` (the whole body = that one
 *                     statement) and nowhere else; noteFileDeleted() is called from exactly four places (review round 3 MINOR-2: delete-all also bumps per file): DownloadsPage right after the
 *                     successful File.Delete, SettingsPage's single download delete right after its File.Delete, and SettingsPage.onDeleteDownloads — after each File.Delete(file) in its loop and once at its end; loadMessages samples the generation ONCE before
 *                     the read loop and reads it ONCE at the re-check; the rule `!fewerChecks || start != now`
 *   a9 switches     — SpixiFlags: the four keys and their strings (★ r7 NIT-1: was `the two keys`), the start value false, `int qa = 1, …` (absent = 1) read inside init's try,
 *                     S16PassRules.effectiveFlag after the catch and each property is read only
 *                     where the contract puts it (counted over Spixi/**)
 *   a11 oldBodies   — (★ photo1a re-base 2026-11-18: was noStore, while PO-3 / PO-6 were parked) chatThumbOf / voiceInfoOf equal the base c0a76176 by SHA-256; ThumbJob, VoiceInfoJob and the 3-argument enqueueThumb / enqueueVoiceInfo equal the base ones once the job generation `gen` is taken out
 *   a10 harness     — csh.csproj compiles PhotoOpenRules.cs and PhotoOpenTests holds at least 23 tests (the contract's 19 + the later ones)
 * Deliberate breaks (#802): the builder-pins report of batch photo1a (B4), one per key. */
import { createHash } from 'node:crypto';

const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/* comments -> spaces (newlines kept); strings and char literals kept (strings = false) or their CONTENTS blanked too (strings = true) */
export const mask = (t, strings = false, fill = ' ') => {
  const out = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const str = (i, verbatim, interp) => {
    const open = i;
    i++;
    const done = (e) => { if (strings) { for (let k = open + 1; k < Math.max(open + 1, e - 1); k++) if (out[k] !== '\n') out[k] = fill; } return e; };
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
/* the open preprocessor regions at a position: a stack of #if conditions */
const regionsAt = (src, pos) => {
  const st = [];
  for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
    if (m[1] === 'if') st.push(m[2].trim());
    else if (m[1] === 'endif') st.pop();
    else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
  }
  return st;
};

export const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', RULES_F = 'Spixi/Utils/PhotoOpenRules.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs',
  SI_F = 'Spixi/Utils/SharedItems.cs';

/* the old statements of the base (c0a76176), as the masked + whitespace-normalised text; each was read from `git show c0a76176:<file>` when
   this pin was written (the builder's report names the check). ★ photo1a #46 r7: the three enqueue statements carry the batch's one addition,
   the load's store generation `storeGen0` (the base's own text is the same without it); `thumbPush` is the OLD push over `plainUri!` */
const OLD = {
  /* ★ photo1a re-base (2026-11-18): the batch loops pass the load's ONE store generation (storeGen0, F-2) to the 3-argument forms; the 2-argument forms stay for the live paths and delegate (b-store holds that) */
  enqueueThumb: 'enqueueThumb(t.Key, t.Value, storeGen0);',
  enqueueVoice: 'enqueueVoiceInfo(v.Key, v.Value, storeGen0);',
  enqueueOffer: 'enqueueOfferPreview(o.Key);',
  localArgOf: 'fLocal = SharedItems.localArgOf(message, out fCase);',
  fSize: 'fSize = SpixiFlags.S20FileSize ? fileSizeArgOf(message, fBytes, fLocal) : S11MediaRules.offerSizeArg(message.localSender, message.completed, fBytes);',
  avatarChain: 'else if(resolvedSender != null) { avatar = IxianHandler.localStorage.getAvatarPath(resolvedSender.ToString()); } else if (friend.bot || friend.type == FriendType.Group) { avatar = "img/spixiavatar.png"; } else { avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString()); } if (avatar == null) { avatar = "img/spixiavatar.png"; }',
  avatarFinal: 'if (!avatarFinal) { avatar = Utils.imageToDataUri(avatar); avatar = avatarForRow(avatar, resolvedSender); }',
  thumbCand: 'else if (message == null || message.id == null || !(message.completed || message.localSender) || !SharedItems.isImageName(name) || !SChatPrefs.photoPreviews) { return; }',
  receiptRead: 'if (PrivacyRules.sendsReadReceipt(SPrivacyPrefs.readReceipts, friend.bot, UnreadRule.isAddedToGroupLineId(message.id)))',   // round 1: read LIVE per row (it gates a network send)
  thumbPush: 'Utils.sendUiCommand(this, "setFileThumb", id, plainUri!);',   // round 1: the closure holds `plainUri` (the data URI only when no text was built)
  voiceErr: 'Utils.sendUiCommand(this, "voiceState", id, "error", "0", "0");',
  voiceInfo: 'Utils.sendUiCommand(this, "voiceInfo", id, info.Substring(0, bar), info.Substring(bar + 1));',
};

/* "lit" + n(x) + b(y) … evaluated with `env`; null when the expression holds anything else */
const evalPlus = (expr, env) => {
  const parts = [];
  let cur = '', inStr = false, depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (inStr) { cur += c; if (c === '\\') { cur += expr[++i]; } else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === '+' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur.trim());
  let out = '';
  for (const p of parts) {
    let m;
    if ((m = /^"((?:[^"\\]|\\.)*)"$/.exec(p))) out += m[1].replace(/\\(.)/g, '$1');
    else if ((m = /^n\(([A-Za-z_]\w*)\)$/.exec(p)) && m[1] in env) out += String(Math.max(0, env[m[1]]));
    else if ((m = /^b\(([A-Za-z_]\w*)\)$/.exec(p)) && m[1] in env) out += env[m[1]] ? '1' : '0';
    else return null;
  }
  return out;
};

export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  /* a file -> { m: comments masked (strings kept), b: strings blanked too } */
  const load = (f) => { const r = raw(f); return { f, r, m: mask(r, false), b: mask(r, true) }; };
  /* the brace-matched body after `sig` ('' when `sig` is missing or not unique) */
  const body = (x, sig) => {
    if (count(x.m, sig) !== 1) return '';
    const at = x.m.indexOf(sig);
    const o = x.b.indexOf('{', at + sig.length);
    if (o < 0) return '';
    let d = 0;
    for (let k = o; k < x.b.length; k++) { if (x.b[k] === '{') d++; else if (x.b[k] === '}' && --d === 0) return x.m.slice(o, k + 1); }
    return '';
  };
  const SCP = load(SCP_F), RU = load(RULES_F), SF = load(FLAGS_F), SI = load(SI_F);
  const NS = norm(SCP.m);   // the page, whitespace-normalised (for the exact old statements)
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const TREE = walk('Spixi').map((f) => ({ f, m: mask(raw(f), false) }));
  const treeCount = (s) => TREE.map((x) => [x.f, count(x.m, s)]).filter(([, c]) => c > 0);

  /* ── a1 · the three [P1] chat bodies: only numbers, exactly the lines of § 3.1 ── */
  const ret = (sig) => { const b = norm(body(RU, sig)); const m = /^\{ return ([\s\S]*); \}$/.exec(b); return m ? m[1] : null; };
  const P1TOKEN = /^[a-z0-9_.=-]{1,40}$/;
  const grammar = (line) => line !== null && line.split(' ').length <= 16 && line.split(' ').every((t) => P1TOKEN.test(t));
  const eMain = evalPlus(ret('public static string onloadMainBody(long ms)') || '', { ms: 123 });
  const eMainNeg = evalPlus(ret('public static string onloadMainBody(long ms)') || '', { ms: -5 });
  const eRead = evalPlus(ret('public static string readBody(int rows, int passes, long ms)') || '', { rows: 50, passes: 2, ms: 17 });
  const eMedia = evalPlus(ret('public static string mediaBody(int thumbs, int hit, int pre, int voice, int vpre, bool held, int queued)') || '',
    { thumbs: 48, hit: 30, pre: 0, voice: 3, vpre: 0, held: true, queued: 7 });
  const eMedia0 = evalPlus(ret('public static string mediaBody(int thumbs, int hit, int pre, int voice, int vpre, bool held, int queued)') || '',
    { thumbs: 0, hit: 0, pre: 0, voice: 0, vpre: 0, held: false, queued: -1 });
  const takeLine = norm(body(RU, 'public string? takeLine(int d, int queued)'));
  const a1 = {
    found: RU.m.length > 1000,
    formatN: norm(body(RU, 'private static string n(long v)')) === '{ return (v < 0 ? 0 : v).ToString(CultureInfo.InvariantCulture); }',
    formatB: norm(body(RU, 'private static string b(bool v)')) === '{ return v ? "1" : "0"; }',
    mainLine: eMain === 'chat onload-main ms=123' && /^chat onload-main ms=\d+$/.test(eMain) && eMainNeg === 'chat onload-main ms=0' && grammar(eMain),
    readLine: eRead === 'chat read rows=50 passes=2 ms=17' && /^chat read rows=\d+ passes=\d+ ms=\d+$/.test(eRead) && grammar(eRead),
    mediaLine: eMedia === 'chat media thumbs=48 hit=30 pre=0 voice=3 vpre=0 held=1 q=7'
      && /^chat media thumbs=\d+ hit=\d+ pre=\d+ voice=\d+ vpre=\d+ held=[01] q=\d+$/.test(eMedia) && grammar(eMedia)
      && eMedia0 === 'chat media thumbs=0 hit=0 pre=0 voice=0 vpre=0 held=0 q=0',
    /* the counts are plain integer fields and the line is built from them alone */
    takeLineInts: /private int thumbs = 0, hits = 0, pre = 0, voices = 0, vpre = 0;/.test(norm(RU.m)) && /private bool heldAny = false;/.test(norm(RU.m))
      && /return mediaBody\(thumbs, hits, pre, voices, vpre, heldAny, queued\);/.test(takeLine) && count(RU.m, 'mediaBody(') === 2,
  };
  ok(F(a1).length === 0,
    '★ photo1a a1 lineShapes (PO-0): PhotoOpenRules.onloadMainBody / readBody / mediaBody take only int / long / bool; n() clamps to >= 0 with the InvariantCulture, b() is 0|1; each return expression (literals, n(), b(), `+`) EVALUATES to exactly `chat onload-main ms=<n>` / `chat read rows=<r> passes=<p> ms=<n>` / `chat media thumbs=<a> hit=<b> pre=<c> voice=<d> vpre=<e> held=<f> q=<g>` of contract § 3.1 (integers and the 0|1 only, every token ^[a-z0-9_.=-]{1,40}$, <= 16 tokens, a negative number written 0), and MediaCounts.takeLine builds the media line from its integer / bool fields alone — failing: ' + JSON.stringify(F(a1)));

  /* ── a2 · where the three lines are written: P1Perf.line only, one site each, integers only ── */
  const onLoad = body(SCP, 'private void onLoad()');
  const loadM = body(SCP, 'public void loadMessages()');
  const sched = norm(body(SCP, 'private void scheduleMediaLine()'));
  const preload = norm(body(SCP, 'protected internal override void onPreloadPresented()'));
  const mainCall = /if \(P1Perf\.enabled\)\s*\{\s*P1Perf\.line\(PhotoOpenRules\.onloadMainBody\(P1Perf\.msSince\(onloadT0\)\)\);\s*\}\s*Task\.Run\(async \(\) =>/;
  const readCall = /if \(P1Perf\.enabled\)\s*\{\s*P1Perf\.line\(PhotoOpenRules\.readBody\(readRows, readPasses, P1Perf\.msSince\(readT0\)\)\);\s*\}\s*if \(messages == null\s*\|\|\s*messages\.Count == 0\)/;
  const loadLead = loadM.slice(0, Math.max(0, loadM.indexOf('UiBatch batch')));
  /* every identifier of the three REAL argument lists (captured from the source, review round 3 NIT) belongs to the allow-list of integer variables / calls */
  const realArgs = [/P1Perf\.line\(PhotoOpenRules\.onloadMainBody\((.*?)\)\);/.exec(onLoad), /P1Perf\.line\(PhotoOpenRules\.readBody\((.*?)\)\);/.exec(loadM), /mediaCounts\.takeLine\((.*?)\); if/.exec(sched)].map((m) => (m ? m[1] : '?'));
  const argIds = [...realArgs.join(' ').matchAll(/[A-Za-z_?][A-Za-z0-9_.?]*/g)].map((m) => m[0]);
  const allowed = new Set(['P1Perf.msSince', 'onloadT0', 'readRows', 'readPasses', 'readT0', 'doc', 'thumbQueue.Count', 'Volatile.Read', 'ref', 'voiceInfoQueued']);
  const typed = (code, name, type) => new RegExp('(?:^|[;{}\\s])' + type + ' ' + name + ' = ').test(code);
  const a2 = {
    found: onLoad.length > 1000 && loadM.length > 1000 && sched.length > 50,
    /* review round 4 m-2: the clocks and the pass counter start where they must */
    starts: norm(onLoad).startsWith('{ shellOverlayOpen = false; long onloadT0 = P1Perf.now();') && onLoad.includes('long onloadT0 = P1Perf.now();') && count(onLoad, 'onloadT0') === 2 && loadM.includes('long readT0 = P1Perf.now();') && loadM.includes('int readPasses = 0;') && count(loadM, 'long readT0') === 1 && count(loadM, 'int readPasses') === 1
      /* ★ photo1a r5 m-2: `readRows` is read right after the read loop's closing brace, BEFORE the trim block (`if (messages != null)`) — the line counts the rows the loop ended with, not the trimmed list */
      && count(loadM, 'int readRows') === 1 && norm(loadM).includes('window * 2, window + (want + 1 - visibleNow)); } int readRows = messages != null ? messages.Count : 0; if (messages != null) {'),
    mainOnce: count(onLoad, mainCall) === 1 && count(SCP.m, 'onloadMainBody(') === 1,
    readOnce: count(loadM, readCall) === 1 && count(SCP.m, 'readBody(') === 1 && loadLead.includes('P1Perf.line(PhotoOpenRules.readBody(') && loadM.indexOf('P1Perf.line(PhotoOpenRules.readBody(') < loadM.indexOf('UiBatch batch'),
    mediaWhole: sched === '{ if (!P1Perf.enabled) { return; } int doc = thumbDoc; Task.Delay(MEDIA_LINE_MS).ContinueWith(_ => MainThread.BeginInvokeOnMainThread(() => { try { if (isDisposed) { return; } string? body = mediaCounts.takeLine(doc, thumbQueue.Count + Volatile.Read(ref voiceInfoQueued)); if (body != null) { P1Perf.line(body); } } catch (Exception) { } })); }'
      && /private const int MEDIA_LINE_MS = 2000;/.test(SCP.m),
    mediaScheduled: preload.startsWith('{ cdperf("present", "t=" + openClock.ElapsedMilliseconds); scheduleMediaLine();') && count(SCP.m, 'scheduleMediaLine();') === 1,
    intsOnly: realArgs.every((r) => r !== '?') && argIds.every((id) => allowed.has(id) || /^\d+$/.test(id))
      && typed(onLoad, 'onloadT0', 'long') && typed(loadM, 'readT0', 'long') && typed(loadM, 'readRows', 'int') && typed(loadM, 'readPasses', 'int')
      && /readPasses\+\+;/.test(loadM) && count(loadM, 'readPasses') === 4 /* ★ histcs re-base (2026-11-22): 3 → 4 — the fourth is the argument of histcs's own `[P1] chat older read` line (HistoryOlderRules.olderReadBody, an int; pins-histcs/b-lines b1) */ && /int readRows = messages != null \? messages\.Count : 0;/.test(loadM)
      && /private readonly ConcurrentQueue<ThumbJob> thumbQueue/.test(SCP.m) && /private int voiceInfoQueued/.test(SCP.m),
    onlyP1Line: treeCount('"chat onload-main').length === 1 && treeCount('"chat onload-main')[0][0] === RULES_F
      && treeCount('"chat read ').length === 1 && treeCount('"chat read ')[0][0] === RULES_F
      && treeCount('"chat media thumbs=').length === 1 && treeCount('"chat media thumbs=')[0][0] === RULES_F
      && !/Logging\.\w+\([^;]*(onload-main|"chat read|"chat media thumbs|PhotoOpenRules\.\w+Body\()/.test(SCP.m),
    rulesSilent: !/\bLogging\./.test(RU.m) && !/\bConsole\./.test(RU.m) && !/\bDebug\./.test(RU.m) && !/\bPreferences\b|\bFile\b|\bFileInfo\b/.test(RU.m),
  };
  ok(F(a2).length === 0,
    '★ photo1a a2 lineSites (PO-0): the three `[P1] chat …` lines are written ONLY through P1Perf.line — `chat onload-main` once in onLoad (the statement before Task.Run, inside P1Perf.enabled), `chat read` once in loadMessages (right after the read loop, before the empty-history return and before UiBatch batch, inside P1Perf.enabled), `chat media` once per document 2000 ms after the present on the main thread (a page torn down = no line) — every argument an integer variable of the allow-list (the Stopwatch ms, rows, passes, the document number, the queue counts): no friend, address, id, path or name; the three body words exist only in PhotoOpenRules.cs, which has no Logging. / Console. / Preferences / File — failing: ' + JSON.stringify(F(a2)));

  /* ── a3 · the [FLAGS] photo1a line: built by PhotoOpenRules.flagsLine, logged once by SpixiFlags.init ── */
  const flagsExpr = ret('public static string flagsLine(bool mediaAfterPaint, bool fewerChecks, bool thumbStore, bool voiceStore)');
  /* ★ photo1a re-base (2026-11-18): PO-3 / PO-6 are back — the line has four tokens, `thumbstore=` and `voicestore=` after the two old ones */
  const fl = (a, b, c = false, d = false) => evalPlus(flagsExpr || '', { mediaAfterPaint: a, fewerChecks: b, thumbStore: c, voiceStore: d });
  const init = body(SF, 'public static void init()');
  const ni = norm(init);
  const CALL = 'Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore));';
  const callAt = SF.m.indexOf(CALL);
  const a3 = {
    found: init.length > 500,
    built: fl(true, false, false, false) === '[FLAGS] photo1a mediaafterpaint=1 fewerchecks=0 thumbstore=0 voicestore=0'
      && fl(false, true, true, false) === '[FLAGS] photo1a mediaafterpaint=0 fewerchecks=1 thumbstore=1 voicestore=0'
      && fl(false, false, false, true) === '[FLAGS] photo1a mediaafterpaint=0 fewerchecks=0 thumbstore=0 voicestore=1'
      && /^\[FLAGS\] photo1a mediaafterpaint=[01] fewerchecks=[01] thumbstore=[01] voicestore=[01]$/.test(fl(true, true, true, true) || ''),
    onlyHere: treeCount('"[FLAGS] photo1a').length === 1 && treeCount('"[FLAGS] photo1a')[0][0] === RULES_F,
    onceInInit: count(SF.m, 'PhotoOpenRules.flagsLine(') === 1 && count(init, CALL) === 1 && treeCount('PhotoOpenRules.flagsLine(').map(([f]) => f).join() === FLAGS_F,
    /* logged by Logging.info (every build, like the other [FLAGS] lines), not through P1Perf; outside every #if; after the four computes and the fixb1 line */
    everyBuild: callAt > 0 && regionsAt(SF.m, callAt).length === 0 && !/P1Perf/.test(SF.m),
    order: ni.indexOf('PhotoMediaAfterPaint = S16PassRules.effectiveFlag(dev, qa);') > ni.indexOf('Logging.info(FixB1Rules.flagsLine(ConfirmSafeDefault, DividerHoverLine));')
      && ni.indexOf('PhotoFewerFileChecks = S16PassRules.effectiveFlag(dev, qf);') < ni.indexOf(CALL)
      && ni.indexOf('PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt) && ChatMediaStore.platformOn;') > ni.indexOf('PhotoFewerFileChecks = S16PassRules.effectiveFlag(dev, qf);')
      && ni.indexOf('VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;') > ni.indexOf('PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt)')
      && ni.indexOf('VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;') < ni.indexOf(CALL),
    argOrder: /public static string flagsLine\(bool mediaAfterPaint, bool fewerChecks, bool thumbStore, bool voiceStore\)/.test(norm(RU.m)),
  };
  ok(F(a3).length === 0,
    '★ photo1a a3 flagsLine (P65–P68; ★ photo1a re-base 2026-11-18, four tokens): `[FLAGS] photo1a mediaafterpaint=<0|1> fewerchecks=<0|1> thumbstore=<0|1> voicestore=<0|1>` — the expression of PhotoOpenRules.flagsLine EVALUATES to that text; its words exist only there; SpixiFlags.init calls it exactly once, as `Logging.info(…)` outside any #if (every build, like the other [FLAGS] lines; not P1Perf), after the four computes and the fixb1 line, with the four properties in the parameter order — failing: ' + JSON.stringify(F(a3)));

  /* ── a4 · PO-1 OFF: the three enqueue loops are the old ones; the hold only wraps them ── */
  const loopOf = (coll, old, call) => new RegExp('foreach \\(KeyValuePair<string, FriendMessage> ' + coll + ' in batch\\.' + { t: 'thumbs', v: 'voices', o: 'offers' }[coll] + '\\)\\s*\\{\\s*if \\(!\\(holdOpen && holdMedia\\(prepend, holdDoc, \\(\\) => ' + call.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)\\)\\)\\s*\\{\\s*' + old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}\\s*\\}');
  const loopT = loadM.search(loopOf('t', OLD.enqueueThumb, 'enqueueThumb(t.Key, t.Value, storeGen0)'));
  const loopV = loadM.search(loopOf('v', OLD.enqueueVoice, 'enqueueVoiceInfo(v.Key, v.Value, storeGen0)'));
  const loopO = loadM.search(loopOf('o', OLD.enqueueOffer, 'enqueueOfferPreview(o.Key)'));
  const lastDone = loadM.lastIndexOf('Utils.sendUiCommand(this, "messagesDone", show_more);');
  const gateRules = norm(body(RU, 'public sealed class MediaGate<T>'));
  const holdM = norm(body(SCP, 'private bool holdMedia(bool prepend, int doc, Action enqueue)'));
  const a4 = {
    found: loadM.length > 1000 && gateRules.length > 100,
    loops: loopT > 0 && loopV > 0 && loopO > 0,
    order: lastDone > 0 && lastDone < loopT && loopT < loopV && loopV < loopO && loadM.indexOf('recheckBurstFileRows(batch, readChannel)') > loopT && loadM.indexOf('recheckBurstFileRows(batch, readChannel)') < loopV,
    holdOpen: /int holdDoc = thumbDoc;\s*bool holdOpen = !prepend && SpixiFlags\.PhotoMediaAfterPaint;/.test(loadM) && count(loadM, 'holdOpen') === 4,
    /* each old statement exists exactly where the wrapper keeps it: the lambda + the else (2), never a third copy */
    twoEach: count(loadM, 'enqueueThumb(t.Key, t.Value, storeGen0)') === 2 && count(loadM, 'enqueueVoiceInfo(v.Key, v.Value, storeGen0)') === 2 && count(loadM, 'enqueueOfferPreview(o.Key)') === 2,
    oneHoldSite: count(SCP.m, 'holdMedia(') === 4 && /bool prepend = takePrepend\(\);/.test(loadM),
    holdWhole: holdM === '{ if (!mediaGate.tryHold(SpixiFlags.PhotoMediaAfterPaint, prepend, doc, enqueue)) { return false; } mediaCounts.held(doc); return true; }',
    /* the gate's OFF / prepend answers are the pass-through ones (executed in csh PhotoOpenTests; the text is held here) */
    gateOff: gateRules.includes('public bool tryHold(bool on, bool prepend, int doc, T item) { return on && !prepend && hold.tryHold(doc, item); }')
      && gateRules.includes('public List<T> paint(bool on, int doc) { return on ? hold.release(doc) : new List<T>(); }')
      && gateRules.includes('public List<T> armed(bool on, bool paintedSeen, int doc) { return on && paintedSeen ? hold.release(doc) : new List<T>(); }')
      && gateRules.includes('public List<T> backstop(bool on, int doc) { return on ? hold.release(doc) : new List<T>(); }')
      && gateRules.includes('public void load(bool on, bool paintedSeen, int doc) { if (!on) { return; } if (paintedSeen) { hold.drop(); } else { hold.open(doc); } }'),
  };
  ok(F(a4).length === 0,
    '★ photo1a a4 gateOff (PO-1): the three enqueue loops of loadMessages — thumbnails, then (after the re-check) waveforms, then offer previews, all after the last messagesDone — each runs the old loop statement (`enqueueThumb(t.Key, t.Value, storeGen0);` / `enqueueVoiceInfo(v.Key, v.Value, storeGen0);` / `enqueueOfferPreview(o.Key);` — the base statements + the one store generation of the load) as the else of `if (!(holdOpen && holdMedia(…)))`, with holdOpen = !prepend && SpixiFlags.PhotoMediaAfterPaint: the switch OFF or a load-more prepend never holds, so the loops run as at the base (plus the generation argument) in the same order; the hold is PhotoOpenRules.MediaGate, whose OFF answers are the pass-through ones — failing: ' + JSON.stringify(F(a4)));

  /* ── a5 · PO-1 ON: held, then released by the paint signal, the backstop and the paintedSeen branch ── */
  const arm = norm(body(SCP, 'private void armPresentOnPainted()'));
  const painted = norm(body(SCP, 'private void onPainted()'));
  const runRel = norm(body(SCP, 'private void runReleasedMedia(List<Action> go)'));
  const onLoadN = norm(onLoad);
  const iThumbDoc = onLoadN.indexOf('thumbDoc++;'), iReset = onLoadN.indexOf('mediaCounts.reset(thumbDoc);'), iLoad = onLoadN.indexOf('mediaGate.load(SpixiFlags.PhotoMediaAfterPaint, paintedSeen, thumbDoc);');
  const a5 = {
    found: arm.length > 100 && painted.length > 50,
    armSeen: /if \(paintedSeen\) \{ signalPreloadReady\(\); runReleasedMedia\(mediaGate\.armed\(SpixiFlags\.PhotoMediaAfterPaint, paintedSeen, thumbDoc\)\); return; \}/.test(arm),
    backstop: /signalPreloadReady\(\); runReleasedMedia\(mediaGate\.backstop\(SpixiFlags\.PhotoMediaAfterPaint, thumbDoc\)\); \}\)\);? \}$/.test(arm)
      && arm.indexOf('MainThread.BeginInvokeOnMainThread') < arm.indexOf('mediaGate.backstop('),
    paint: /if \(presentArmed\) \{ signalPreloadReady\(\); \} runReleasedMedia\(mediaGate\.paint\(SpixiFlags\.PhotoMediaAfterPaint, thumbDoc\)\); \}$/.test(painted)
      && painted.indexOf('mediaCounts.painted(thumbDoc);') > 0 && painted.indexOf('mediaCounts.painted(thumbDoc);') < painted.indexOf('paintedSeen = true;'),
    onceEach: count(SCP.m, 'runReleasedMedia(') === 4 && count(arm, 'runReleasedMedia(') === 2 && count(painted, 'runReleasedMedia(') === 1
      && count(SCP.m, 'mediaGate.armed(') === 1 && count(SCP.m, 'mediaGate.backstop(') === 1 && count(SCP.m, 'mediaGate.paint(') === 1,
    runWhole: runRel === '{ if (isDisposed) { return; } foreach (Action a in go) { try { a(); } catch (Exception e) { Logging.warn("chat media release failed (" + e.GetType().Name + ")"); } } }',
    openInOnLoad: iThumbDoc > 0 && iThumbDoc < iReset && iReset < iLoad && count(SCP.m, 'mediaGate.load(') === 1 && count(onLoad, 'mediaGate.load(') === 1,
    gateField: /private readonly PhotoOpenRules\.MediaGate<Action> mediaGate = new PhotoOpenRules\.MediaGate<Action>\(\);/.test(SCP.m)
      && count(SCP.m.replace(/mediaGate\.(load|tryHold|paint|armed|backstop)\(/g, ''), 'mediaGate.') === 0,
    heldCounted: count(SCP.m, 'mediaCounts.held(') === 1 && count(SCP.m, 'mediaCounts.reset(') === 1,
  };
  ok(F(a5).length === 0,
    '★ photo1a a5 gateOn (PO-1): with the switch ON the media jobs a load held are released — in their old order, on the main thread — by exactly three points, each ONE `runReleasedMedia(mediaGate.<release>(SpixiFlags.PhotoMediaAfterPaint, …))`: onPainted (the paint signal, after the present is signalled), the 400 ms backstop of armPresentOnPainted (after signalPreloadReady) and the paintedSeen branch of armPresentOnPainted (a reload: the paint was seen already); the hold opens in onLoad after thumbDoc++ (mediaGate.load: a reload holds nothing) and nowhere else; a throwing job logs a type only — failing: ' + JSON.stringify(F(a5)));

  /* ── a6 · PO-1: the push text is built off the main thread; the main thread only sends it ── */
  const pt = body(SCP, 'private void processThumb(ThumbJob job)');
  const pv = body(SCP, 'private void processVoiceInfo(VoiceInfoJob job)');
  const lam = (b) => { const i = b.indexOf('MainThread.BeginInvokeOnMainThread(() =>'); if (i < 0) return ''; const bb = mask(b, true); const o = bb.indexOf('{', i); let d = 0; for (let k = o; k < bb.length; k++) { if (bb[k] === '{') d++; else if (bb[k] === '}' && --d === 0) return b.slice(o, k + 1); } return ''; };
  const ptLam = lam(pt), pvLam = lam(pv);
  const ptHead = pt.slice(0, pt.indexOf('MainThread.BeginInvokeOnMainThread'));
  const pvHead = pv.slice(0, pv.indexOf('MainThread.BeginInvokeOnMainThread'));
  const sbc = norm(body(SCP, 'private void sendBuiltCommand(string text)'));
  const a6 = {
    found: ptLam.length > 100 && pvLam.length > 100,
    thumbBuiltOffMain: /string\? builtCmd = SpixiFlags\.PhotoMediaAfterPaint \? UiCommandText\.build\("setFileThumb", id, uri\) : null;/.test(ptHead)
      && count(SCP.m, 'UiCommandText.build(') === 3 && count(SCP.m, 'uiCommandText') === 0 /* ★ photo1a (ruling 1736): the shared builder */,
    plainOnly: norm(ptHead).includes('string? plainUri = builtCmd == null ? uri : null;') && !/\buri\b/.test(ptLam),
    thumbMain: norm(ptLam) === '{ if (isDisposed || doc != thumbDoc || friend == null || !SChatPrefs.photoPreviews) { lock (thumbsSent) { thumbsSent.Remove(sentKey); } return; } if (builtCmd != null) { sendBuiltCommand(builtCmd); } else { ' + OLD.thumbPush + ' } mediaCounts.thumb(doc, hit); }',
    voiceBuiltOffMain: /if \(SpixiFlags\.PhotoMediaAfterPaint\)\s*\{\s*if \(info == null\)\s*\{\s*builtCmd = UiCommandText\.build\("voiceState", id, "error", "0", "0"\);\s*\}\s*else\s*\{\s*int builtBar = info\.IndexOf\('\|'\);\s*if \(builtBar >= 0\)\s*\{\s*builtCmd = UiCommandText\.build\("voiceInfo", id, info\.Substring\(0, builtBar\), info\.Substring\(builtBar \+ 1\)\);\s*\}\s*\}\s*\}/.test(pvHead)
      && /string\? builtCmd = null;/.test(pvHead),
    voiceMain: norm(pvLam) === '{ if (isDisposed || doc != thumbDoc) { lock (voiceInfoSent) { voiceInfoSent.Remove(sentKey); } return; } if (builtCmd != null) { sendBuiltCommand(builtCmd); if (info != null) { mediaCounts.voice(doc); } return; } if (info == null) { ' + OLD.voiceErr + ' return; } int bar = info.IndexOf(\'|\'); ' + OLD.voiceInfo + ' mediaCounts.voice(doc); }',
    /* review round 3 m-2 · ★ photo1a re-base (2026-11-18, PO-3 is back): `chatThumbOld` is the old chatThumbOfCounted — chatThumbOf + the `hit` probe, whole (a `hit = true`, a changed return or a lost NIT-2 head `if (!P1Perf.enabled) { return chatThumbOf(fi); }` is red) */
    countedWhole: NS.includes("private static string? chatThumbOld(FileInfo fi, out bool hit) " + "{ hit = false; if (!P1Perf.enabled) { return chatThumbOf(fi); } try { string key = fi.FullName + \"|\" + fi.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) + \"|\" + fi.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture); lock (chatThumbLock) { hit = chatThumbCache.ContainsKey(key); } } catch (Exception) { hit = false; } return chatThumbOf(fi); }"),
    /* review round 4 m-2 · ★ photo1a re-base (2026-11-18): processThumb from the ONE store call (`chatThumbFor(fi, job.id, job.gen, out bool hit)`; the store / LRU, OFF = chatThumbOld = the base call) to the main-thread post, whole (a changed call, a dropped return or a write of `hit` is red) */
    thumbHead: (() => { const h = norm(pt); const i = h.indexOf('string? uri = chatThumbFor('); const j = h.indexOf('MainThread.BeginInvokeOnMainThread('); return i > 0 && j > i && h.slice(i, j).trim() === "string? uri = chatThumbFor(fi, job.id, job.gen, out bool hit); if (uri == null) { return; } int doc = job.doc; string id = job.id; string? builtCmd = SpixiFlags.PhotoMediaAfterPaint ? UiCommandText.build(\"setFileThumb\", id, uri) : null; string? plainUri = builtCmd == null ? uri : null;"; })(),
    /* ★ photo1a #46 r7 (2026-11-18) F1: `voiceHead`, the twin of `thumbHead` — processVoiceInfo from `int doc = job.doc;` to the main-thread post, whole (a statement added before the post, e.g. `builtCmd = "voiceInfo('" + id + "','" + info + "');";` or `builtCmd += id;`, is red); `builtCmd` is assigned exactly three times in the method: its declaration (= null) and the two UiCommandText.build lines */
    voiceHead: (() => { const h = norm(pv); const i = h.indexOf('int doc = job.doc;'); const j = h.indexOf('MainThread.BeginInvokeOnMainThread('); return i > 0 && j > i && count(h, 'int doc = job.doc;') === 1 && h.slice(i, j).trim() === `int doc = job.doc; string id = job.id; string? builtCmd = null; if (SpixiFlags.PhotoMediaAfterPaint) { if (info == null) { builtCmd = UiCommandText.build("voiceState", id, "error", "0", "0"); } else { int builtBar = info.IndexOf('|'); if (builtBar >= 0) { builtCmd = UiCommandText.build("voiceInfo", id, info.Substring(0, builtBar), info.Substring(builtBar + 1)); } } }`; })()
      && count(pv, /\bbuiltCmd\s*[-+*\/|&^%?]?=(?!=)/g) === 3 && count(pv, 'builtCmd = UiCommandText.build(') === 2,
    countedCall: count(NS, 'string? uri = chatThumbFor(fi, job.id, job.gen, out bool hit);') === 1 && count(SCP.m, 'chatThumbFor(') === 4 && count(SCP.m, 'chatThumbOld(') === 3 && !/\bchatThumbOfCounted\b/.test(SCP.m),
    nothingBuiltOnMain: !/uiCommandText|UiCommandText|Convert\.|Encoding\.|escapeHtmlParameter|ToBase64String|StringBuilder/.test(ptLam + pvLam),
    sendOnly: sbc === '{ try { sendMessage(text); } catch (Exception e) { Logging.error("Exception occured in sendUiCommand (" + e.GetType().Name + ")"); } }' && count(SCP.m, 'sendBuiltCommand(') === 3,
    /* ★ photo1a #46 r8 (2026-11-18, Opus MAJOR-1 / MAJOR-2): BOTH push methods are held WHOLE (comment-masked, whitespace-
       normalised, SHA-256 — the #1653 pattern): a write of builtCmd / plainUri / hit / info anywhere in the method (before
       or after the post, by any assignment form: =, +=, ??=, Interlocked.Exchange, ref) changes the hash. An edit of either
       method re-bases these two values after a look at its diff (#1596). */
    bodiesWhole: sha(norm(pt)) === '780905290220bbe209bd0fb2ea6f70c7638966c8dc6f3e8b3cfb9472ea676fae' && sha(norm(pv)) === '265442cfe4b14d146ec1c6ca9c37223e366e344eb0bcd0534fe835f392c66fdc',
    oneSendUiPush: count(SCP.m, '"setFileThumb"') === 2 && count(SCP.m, '"voiceInfo"') === 2 && count(SCP.m, '"voiceState", id, "error", "0", "0"') === 2,
  };
  ok(F(a6).length === 0,
    '★ photo1a a6 pushOffMain (PO-1): processThumb / processVoiceInfo build the UI command text on the DRAINER thread — before BeginInvokeOnMainThread, and only with SpixiFlags.PhotoMediaAfterPaint ON — and the main-thread lambda only hands it to sendBuiltCommand (-> sendMessage, with sendUiCommand\'s own error line) after the SAME re-check as before (isDisposed / doc / friend / the pref; the slot given back when it fails): the lambda builds nothing (no uiCommandText, base64, Encoding, StringBuilder); the switch OFF = builtCmd null = the OLD `Utils.sendUiCommand(this, "setFileThumb", id, plainUri!)` (plainUri = uri when no text was built) / `voiceState error` / `voiceInfo` statements, byte for byte; the head of processVoiceInfo from `int doc = job.doc;` to the post is held whole (voiceHead), like thumbHead; the command words and argument lists are the old ones (no new verb, no new argument) — failing: ' + JSON.stringify(F(a6)));

  /* ── a7 · PO-5 OFF: no once-values, so every branch is the old statement ── */
  const begin = norm(body(SCP, 'private static IDisposable? beginRowCache(UiBatch batch)'));
  const forRow = norm(body(SCP, 'private static RowCache? rowCacheFor(UiBatch? batch)'));
  const noteCand = norm(body(SCP, 'private void noteThumbCandidate(FriendMessage message, string name, UiBatch? batch)'));
  const IM = norm(body(SCP, 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)'));
  const oldLocalArg = norm(body(SI, 'public static string localArgOf(FriendMessage fm, out string pathCase)'));
  const upd = body(SCP, 'private void updateMessageReadStatus(');
  const a7 = {
    found: begin.length > 50 && forRow.length > 30,
    installOff: begin === '{ if (!SpixiFlags.PhotoFewerFileChecks) { return null; } RowCacheScope scope = new RowCacheScope(rowCache); rowCache = new RowCache(batch); return scope; }'
      && count(SCP.m, 'beginRowCache(') === 2 && /using IDisposable\? rowScope = beginRowCache\(batch\);/.test(loadM)
      && count(SCP.m, /(?<![.\w])rowCache = /g) === 2 && /public void Dispose\(\) \{ rowCache = prev; \}/.test(NS),
    ownerOnly: forRow === '{ RowCache? rc = rowCache; return batch != null && rc != null && ReferenceEquals(rc.owner, batch) ? rc : null; }'
      && /\[ThreadStatic\] private static RowCache\? rowCache;/.test(SCP.m),
    localArg: NS.includes('if (rowOnce != null) { fLocal = SharedItems.localArgOf(message, out fCase, out fPath); } else { ' + OLD.localArgOf + ' }'),
    fSize: NS.includes('if (rowOnce != null) { fSize = SpixiFlags.S20FileSize ? fileSizeArgOnce(message, fBytes, fLocal, fPath) : S11MediaRules.offerSizeArg(message.localSender, message.completed, fBytes); } else { ' + OLD.fSize + ' }'),
    avatar: NS.includes('if (PhotoOpenRules.oneToOneAvatarOnce(rowOnce != null, friend.bot, friend.type == FriendType.Group)) {')
      && NS.includes('avatarFinal = true; } ' + OLD.avatarChain) && NS.includes(OLD.avatarFinal),
    prefs: noteCand.includes(OLD.thumbCand) && noteCand.includes('rowOnce.once.flag(PhotoOpenRules.LoadOnce.PhotoPreviews, () => SChatPrefs.photoPreviews)')
      && norm(upd).includes(OLD.receiptRead) && count(norm(upd), 'SPrivacyPrefs.readReceipts') === 1 && !/rowOnce|LoadOnce\.ReadReceipts/.test(upd)
      && !/ReadReceipts/.test(RU.m),
    oldOverload: oldLocalArg === '{ pathCase = FileRowRules.CaseNone; try { if (fm == null || fm.type != FriendMessageType.fileHeader) { return ""; } if (!fm.completed) { pathCase = FileRowRules.CasePending; return ""; } pathCase = FileRowRules.localPathCase(fm.filePath, localPathOf(fm) != null, cacheDirOnce.Value); return FileRowRules.localArg(fm.localSender, fm.completed, pathCase); } catch (Exception) { return ""; } }',
    newOverload: norm(body(SI, 'public static string localArgOf(FriendMessage fm, out string pathCase, out string? path)')).includes('return PhotoOpenRules.localArgOnce(fm.localSender, fm.completed, fm.filePath, () => localPathOf(fm), () => cacheDirOnce.Value, out pathCase, out path); }'),
    /* review round 3 M-3: the SCP wrapper of PO-5's arg-20 path, whole — its lambdas are the S20 rule's inputs (the live outgoing transfer by exact uid, the localPathOf copy, the file length) */
    sizeWrapper: NS.includes("private static string fileSizeArgOnce(FriendMessage message, ulong headerBytes, string fLocal, string? resolvedPath) " + "{ return PhotoOpenRules.fileSizeArgOnce(message.localSender, message.completed, headerBytes, fLocal, resolvedPath, message.transferId, id => { FileTransfer? t = TransferManager.getOutgoingTransfer(id); return t != null && t.uid == id ? t.fileSize : 0UL; }, () => SharedItems.localPathOf(message), p => new FileInfo(p).Length); }"),
    /* review round 3 m-1: the ON block of the 1:1 once-avatar, whole (the data-URI function it passes, the key, the once-per-load cache) */
    /* review round 4 M-1: `avatarFinal` starts false and is written ONCE more, inside the ON block (a start of `true` skips the OFF path's imageToDataUri / avatarForRow block); m-1: `fPath` has no write but its declaration and the overload's `out fPath` */
    /* ★ photo1a r5 m-3: counted INSIDE insertMessage's 3-argument body only — a `string fPath = a;` in another helper is none of this key's business */
    imFound: IM.length > 2000,
    avatarFinalWrites: IM.includes('bool avatarFinal = false;') && count(IM, /\bavatarFinal\s*=[^=]/g) === 2 && count(IM, /\bavatarFinal\b/g) === 3 && count(IM, 'avatarFinal = true; }') === 1,
    fPathWrites: IM.includes('string? fPath = null;') && count(IM, /\bfPath\s*=[^=]/g) === 1 && count(IM, 'out fPath)') === 1 && count(IM, /\bfPath\b/g) === 3,
    /* ★ photo1a r5 M-1: the once-value holder, whole — ONE per UiBatch (`new LoadOnce()` is built here and nowhere else in Spixi/), the owner is the batch it was made for */
    rowCacheWhole: NS.includes('private sealed class RowCache { public readonly UiBatch owner; public readonly PhotoOpenRules.LoadOnce once = new PhotoOpenRules.LoadOnce(); public RowCache(UiBatch b) { owner = b; } }')
      && JSON.stringify(treeCount('new PhotoOpenRules.LoadOnce(')) === JSON.stringify([[SCP_F, 1]]),
    /* ★ photo1a r5 n-1: the SharedItems overload with `out path`, whole */
    overloadWhole: norm(body(SI, 'public static string localArgOf(FriendMessage fm, out string pathCase, out string? path)')) === '{ path = null; if (fm == null || fm.type != FriendMessageType.fileHeader) { pathCase = FileRowRules.CaseNone; return ""; } return PhotoOpenRules.localArgOnce(fm.localSender, fm.completed, fm.filePath, () => localPathOf(fm), () => cacheDirOnce.Value, out pathCase, out path); }',
    avatarOnBlock: NS.includes("if (PhotoOpenRules.oneToOneAvatarOnce(rowOnce != null, friend.bot, friend.type == FriendType.Group)) { string avatarKey = resolvedSender != null ? resolvedSender.ToString() : friend.walletAddress.ToString(); avatar = rowOnce!.once.once(\"avatar|\" + avatarKey, () => PhotoOpenRules.oneToOneRowAvatar(IxianHandler.localStorage.getAvatarPath(avatarKey), Utils.imageToDataUri)); avatarFinal = true; }"),
    recheckRule: norm(body(RU, 'public static bool recheckFileRows(bool fewerChecks, int deleteGenAtStart, int deleteGenNow)')) === '{ return !fewerChecks || deleteGenAtStart != deleteGenNow; }',
  };
  ok(F(a7).length === 0,
    '★ photo1a a7 fewerOff (PO-5): with SpixiFlags.PhotoFewerFileChecks OFF the once-values are never installed (beginRowCache returns null; its one call site; `rowCache` is assigned only there and in the scope\'s Dispose; rowCacheFor answers a row of the installing batch only), so every PO-5 branch takes its ELSE = the old statement byte for byte: `fLocal = SharedItems.localArgOf(message, out fCase);`, the old `fSize = SpixiFlags.S20FileSize ? fileSizeArgOf(…) : S11MediaRules.offerSizeArg(…);`, the old avatar chain + the unconditional imageToDataUri / avatarForRow, the old `!SChatPrefs.photoPreviews` condition and the old live read of SPrivacyPrefs.readReceipts; SharedItems\' old localArgOf overload is untouched, the new one only delegates to PhotoOpenRules.localArgOnce; the re-check rule is `!fewerChecks || start != now` (OFF = always) — failing: ' + JSON.stringify(F(a7)));

  /* ── a8 · the delete generation ── */
  const incs = (b) => count(b, 'Interlocked.Increment(ref fileDeleteGen);');
  const refresh = body(SCP, 'public bool refreshFileRow(FriendMessage? message, int channel)');
  const heldRows = body(SCP, 'public int refreshHeldFileRows()');
  const delMsg = body(SCP, 'public void deleteMessage(byte[] msg_id, int channel)');
  const noteBody = body(SCP, 'public static void noteFileDeleted()');
  const DL = load('Spixi/Pages/Downloads/DownloadsPage.xaml.cs'), SET = load('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const onDelDl = body(SET, 'public void onDeleteDownloads()');
  /* ★ quotebox2 size re-base (2026-11-27, after a look at the diff): the keep-test names SingleChatPage.xaml.cs exactly (was /SingleChatPage/):
     the new partial file SingleChatPage.ReplyMatch.cs holds no call (:0) and must drop out like every other file without one; a call
     there would still show (≠ 0) and turn noteCalls red. Break: one `noteFileDeleted();` added to SingleChatPage.ReplyMatch.cs → noteCalls,
     red as observed 2026-11-27. */
  const noteCallSites = TREE.map((x) => x.f + ':' + count(x.m, 'noteFileDeleted(')).filter((t) => !/:0$/.test(t) || /SingleChatPage\.xaml\.cs/.test(t))
    .map((t) => t.replace(/SingleChatPage\.xaml\.cs:\d+/, 'SingleChatPage.xaml.cs:0')).sort().join();
  /* the base body of deleteMessage (c0a7617) without its closing brace — `git show c0a7617:Spixi/Pages/Chat/SingleChatPage.xaml.cs`, masked + normalised */
  const BASE_DELETE_OPEN = '{ voiceRowDeleted(msg_id); if (channel == selectedChannel) { lock (fileRowsShown) { fileRowsShown.Remove(Crypto.hashToString(msg_id)); } Utils.sendUiCommand(this, "deleteMessage", Crypto.hashToString(msg_id)); }';
  const a8 = {
    found: refresh.length > 50 && heldRows.length > 50 && delMsg.length > 50,
    refreshFirst: norm(refresh).startsWith('{ Interlocked.Increment(ref fileDeleteGen); if (message == null'),
    heldFirst: norm(heldRows).startsWith('{ Interlocked.Increment(ref fileDeleteGen); List<string> held;'),
    /* ★ photo1a #46 r7 (2026-11-18) NIT-1: deleteMessage's body = the BASE body (c0a7617, masked + whitespace-normalised, frozen here: no git read) + EXACTLY the batch's two statements — the generation increment, then the store call (b-store b1 holds the store call) — so a third statement (`ChatMediaStore.wipe();` before the increment, any other) is red */
    /* ★ histcs re-base (#46 r4, 2026-11-23): admits EXACTLY ONE new statement inside the `if (channel == selectedChannel)` block, after the push — histcs's repeat of the delete behind a background older page
       (`if (HistcsFlags.LoadMoreOffUi && olderBusy.held) { string lateId = …; olderLatePushes.Enqueue(() => Utils.sendUiCommand(this, "deleteMessage", lateId)); }`; pins-histcs/a-path a5 / a11 hold it whole). The generation increment and the store delete are unchanged. */
    deleteOnce: incs(delMsg) === 1 && norm(delMsg) === BASE_DELETE_OPEN.slice(0, -2) + ' if (HistcsFlags.LoadMoreOffUi && olderBusy.held) { string lateId = Crypto.hashToString(msg_id); olderLatePushes.Enqueue(() => Utils.sendUiCommand(this, "deleteMessage", lateId)); } }' + ' Interlocked.Increment(ref fileDeleteGen); ChatMediaStore.deleteMessage(friend?.walletAddress, msg_id); }',
    onlyFour: incs(SCP.m) === 4 && incs(refresh) === 1 && incs(heldRows) === 1 && incs(noteBody) === 1 && !/fileDeleteGen\s*(\+\+|--|=[^=]|\+=|-=)/.test(SCP.m.replace(/private static int fileDeleteGen = 0;/, '')),
    noteStatic: norm(noteBody) === '{ Interlocked.Increment(ref fileDeleteGen); }' && /public static void noteFileDeleted\(\)/.test(SCP.m),
    noteCalls: noteCallSites === 'Spixi/Pages/Chat/SingleChatPage.xaml.cs:0,Spixi/Pages/Downloads/DownloadsPage.xaml.cs:1,Spixi/Pages/Settings/SettingsPage.xaml.cs:3'
      && /File\.Delete\(path\);\s*SingleChatPage\.noteFileDeleted\(\);/.test(body(SET, 'private void onNavigating(object sender, WebNavigatingEventArgs e)'))
      && /File\.Delete\(path\);\s*SingleChatPage\.noteFileDeleted\(\);/.test(DL.m) && count(norm(onDelDl), 'SingleChatPage.noteFileDeleted();') === 2
      && /File\.Delete\(file\);\s*SingleChatPage\.noteFileDeleted\(\);\s*file_count\+\+;/.test(norm(onDelDl))
      && norm(onDelDl).lastIndexOf('SingleChatPage.noteFileDeleted();') > norm(onDelDl).indexOf('catch (Exception e)') && norm(onDelDl).endsWith('SingleChatPage.noteFileDeleted(); }'),
    sampled: count(loadM, 'int deleteGen0 = Volatile.Read(ref fileDeleteGen);') === 1 && loadM.indexOf('int deleteGen0 =') < loadM.indexOf('friend.getMessages(')
      && count(loadM, 'Volatile.Read(ref fileDeleteGen)') === 2 && count(SCP.m, 'Volatile.Read(ref fileDeleteGen)') === 2,
    field: /private static int fileDeleteGen = 0;/.test(SCP.m) && !/private int fileDeleteGen/.test(SCP.m) && count(SCP.m, 'fileDeleteGen') === 7,
    recheck: /if \(PhotoOpenRules\.recheckFileRows\(SpixiFlags\.PhotoFewerFileChecks, deleteGen0, Volatile\.Read\(ref fileDeleteGen\)\)\)\s*\{\s*recheckBurstFileRows\(batch, readChannel\);\s*\}/.test(loadM) && count(SCP.m, 'recheckBurstFileRows(batch') === 1,
  };
  ok(F(a8).length === 0,
    '★ photo1a a8 deleteGen (PO-5): the page\'s delete generation moves by ONE `Interlocked.Increment(ref fileDeleteGen)` in each in-app delete notification — the first statement of refreshFileRow and of refreshHeldFileRows, and at the end of deleteMessage — and nowhere else (no other write); loadMessages samples it ONCE before the read loop (before friend.getMessages) and reads it ONCE at the re-check, where `PhotoOpenRules.recheckFileRows(SpixiFlags.PhotoFewerFileChecks, start, now)` decides (OFF = always, as before) — failing: ' + JSON.stringify(F(a8)));

  /* ── a9 · the two switches: keys, defaults, the S16 rule, the consumers ── */
  const initN = ni;
  const keys = [['PhotoMediaAfterPaintKey', 'flagPhotoMediaAfterPaint', 'PhotoMediaAfterPaint', 'qa'], ['PhotoFewerFileChecksKey', 'flagPhotoFewerFileChecks', 'PhotoFewerFileChecks', 'qf'],
    /* ★ photo1a re-base (2026-11-18): PO-3 / PO-6 are back — two more keys, the same shape */
    ['PhotoThumbStoreKey', 'flagPhotoThumbStore', 'PhotoThumbStore', 'qt'], ['VoicePeaksStoreKey', 'flagVoicePeaksStore', 'VoicePeaksStore', 'qv']];
  const iTry = init.search(/\btry\s*\{/), iCatch = init.indexOf('catch (Exception ex)');
  const iCatchEnd = iCatch < 0 ? -1 : iCatch + body({ m: init, b: mask(init, true) }, 'catch (Exception ex)').length;
  const flagsOf = (p) => treeCount('SpixiFlags.' + p);
  const a9 = {
    found: init.length > 500 && iTry > 0 && iCatch > iTry,
    keys: keys.every(([k, s]) => new RegExp('public const string ' + k + ' = "' + s + '";').test(SF.m) && count(SF.m, '"' + s + '"') === 1 && treeCount('"' + s + '"').length === 1),
    startFalse: keys.every(([, , p]) => new RegExp('public static bool ' + p + ' \\{ get; private set; \\} = false;').test(SF.m)),
    absentOn: /int qa = 1, qf = 1, qt = 1, qv = 1;/.test(init) && init.indexOf('int qa = 1, qf = 1, qt = 1, qv = 1;') < iTry
      && keys.every(([k, , , q]) => { const s = q + ' = Preferences.Default.Get(' + k + ', 1);'; return count(init, s) === 1 && init.indexOf(s) > iTry && init.indexOf(s) < iCatch; }),
    rule: /PhotoMediaAfterPaint = S16PassRules\.effectiveFlag\(dev, qa\);/.test(init) && /PhotoFewerFileChecks = S16PassRules\.effectiveFlag\(dev, qf\);/.test(init)
      && /PhotoThumbStore = S16PassRules\.effectiveFlag\(dev, qt\) && ChatMediaStore\.platformOn;/.test(init) && /VoicePeaksStore = S16PassRules\.effectiveFlag\(dev, qv\) && ChatMediaStore\.platformOn;/.test(init)
      && keys.every(([, , p]) => count(init, p + ' = ') === 1 && init.indexOf(p + ' = ') > iCatchEnd) && /return !\(devMode && stored == 0\);/.test(raw('Spixi/Utils/S16PassRules.cs').replace(/\/\/.*$/gm, '')),
    consumersAfterPaint: flagsOf('PhotoMediaAfterPaint').filter(([f]) => f !== RULES_F).map(([f, c]) => f + ':' + c).join() === SCP_F + ':8',
    consumersFewer: flagsOf('PhotoFewerFileChecks').filter(([f]) => f !== RULES_F).map(([f, c]) => f + ':' + c).join() === SCP_F + ':2',
    /* the store switches are read in the page only: the load's one generation read, the two live-path enqueues, the two For() gates (3 sites each) */
    consumersThumb: flagsOf('PhotoThumbStore').filter(([f]) => f !== RULES_F).map(([f, c]) => f + ':' + c).join() === SCP_F + ':3',
    consumersVoice: flagsOf('PhotoVoicePeaksStore').length === 0 && flagsOf('VoicePeaksStore').filter(([f]) => f !== RULES_F).map(([f, c]) => f + ':' + c).join() === SCP_F + ':3',
    notDevControl: !/PhotoMediaAfterPaint|PhotoFewerFileChecks|PhotoThumbStore|VoicePeaksStore|flagPhoto|flagVoicePeaks/.test(mask(raw('Spixi/Pages/Dev/DevPage.xaml.cs'))),
  };
  ok(F(a9).length === 0,
    '★ photo1a a9 switches (#1478: one switch per change): SpixiFlags holds the keys flagPhotoMediaAfterPaint / flagPhotoFewerFileChecks (each string once in Spixi/**), the start value `= false` (before init = the old path), the locals `qa = qf = qt = qv = 1` (ABSENT = 1 = ON; ★ photo1a re-base 2026-11-18: + flagPhotoThumbStore / flagVoicePeaksStore, the rule AND-ed with ChatMediaStore.platformOn, each store property read at 3 sites of the page) read inside init\'s try, the S16 rule `S16PassRules.effectiveFlag(dev, q…)` after the catch (a stored 0 acts only in dev mode);  each property is read only where the contract puts it (PhotoMediaAfterPaint: the 8 sites of the gate and the push in SingleChatPage; PhotoFewerFileChecks: beginRowCache + the re-check) and no Developer-screen control exists in this batch — failing: ' + JSON.stringify(F(a9)));

  /* ── a11 · oldBodies (★ photo1a re-base 2026-11-18: PO-3 / PO-6 are BACK, so the old "noStore" key is turned into what still matters:
        the six base bodies are the base's, except for the ONE added thing, the job generation) ──
     chatThumbOf and voiceInfoOf are untouched (= the base c0a76176 by SHA-256); ThumbJob / VoiceInfoJob / the 3-argument enqueueThumb / enqueueVoiceInfo
     equal the base ones once the generation (the `gen` field, the `long g` constructor argument, `gen = g;`, the `, gen` argument) is taken out; the
     2-argument forms are held by b-store (they only read the generation and delegate). */
  /* the SHA-256 of the masked, whitespace-normalised bodies of the BASE c0a76176 ("Merge pull request #14"), computed from `git show c0a76176:Spixi/Pages/Chat/SingleChatPage.xaml.cs`
     and FROZEN here (review round 3 M-2: reading `git show HEAD:` compared the tree with itself once the batch was committed) */
  const BASE_SHA = {
    'private static string? chatThumbOf(FileInfo fi)': '8715e9b9a89eaab4f5e7178cb6c6def3d6f2f5d4ec5226b2a577c95e82377729',
    'private string? voiceInfoOf(FriendMessage fm, string id, out bool notYet)': 'a8abf7fa89a069f3db2a1260769070830fcf5ec9b28d33c3104f4ab65b5f1d99',
    'private void enqueueThumb(string id, FriendMessage fm)': 'c7d7d7011b43317b2dd701a4f45009e475d05f02a604ad4c180633ecaab4a330',
    'private void enqueueVoiceInfo(string id, FriendMessage fm)': 'f23a83a3c83041f0cf47a992698affee6df0aa93132b0c1e5c97554880791d7b',
    'private sealed class ThumbJob': '0bdc7028484c9e035018c85bbb0266ed0bccd4bf4e95ced17b596c1c28f424d8',
    'private sealed class VoiceInfoJob': '0fdd3cb88728e8b91dd9cc24738f782bedaf2702f9f1fda2ad30c2bac9b06306',
  };
  /* the generation taken out: exactly four textual forms, nothing else */
  const noGen = (t) => norm(t.replace(/public readonly long gen;/, '').replace(/, long g\)/, ')').replace(/ gen = g;/, '').replace(/, gen\)/g, ')'));
  const SAME_AS = [['private static string? chatThumbOf(FileInfo fi)', 'private static string? chatThumbOf(FileInfo fi)', false],
    ['private string? voiceInfoOf(FriendMessage fm, string id, out bool notYet)', 'private string? voiceInfoOf(FriendMessage fm, string id, out bool notYet)', false],
    ['private void enqueueThumb(string id, FriendMessage fm, long gen)', 'private void enqueueThumb(string id, FriendMessage fm)', true],
    ['private void enqueueVoiceInfo(string id, FriendMessage fm, long gen)', 'private void enqueueVoiceInfo(string id, FriendMessage fm)', true],
    ['private sealed class ThumbJob', 'private sealed class ThumbJob', true], ['private sealed class VoiceInfoJob', 'private sealed class VoiceInfoJob', true]];
  const sameBody = ([sig, base, strip]) => { const b1 = body(SCP, sig); return b1.length > 40 && sha(strip ? noGen(b1) : norm(b1)) === BASE_SHA[base]; };
  const a11 = {
    found: SCP.m.length > 100000,
    oldBodies: SAME_AS.every(sameBody),
    /* the generation is the ONLY difference: the stripped text of the jobs must not hide a second change — the removed forms occur exactly where they should */
    genOnly: count(body(SCP, 'private sealed class ThumbJob'), /\bgen\b/g) === 2 && count(body(SCP, 'private sealed class VoiceInfoJob'), /\bgen\b/g) === 2
      && count(body(SCP, 'private void enqueueThumb(string id, FriendMessage fm, long gen)'), /\bgen\b/g) === 1 && count(body(SCP, 'private void enqueueVoiceInfo(string id, FriendMessage fm, long gen)'), /\bgen\b/g) === 1,
  };
  ok(F(a11).length === 0,
    '★ photo1a a11 oldBodies (PO-3 / PO-6; ★ photo1a re-base 2026-11-18: was `noStore` while the store was parked): the bodies of chatThumbOf and voiceInfoOf equal the base c0a76176 by SHA-256 (frozen constants, no git read) of the masked, whitespace-normalised text; ThumbJob, VoiceInfoJob and the 3-argument enqueueThumb / enqueueVoiceInfo equal the base ones once the job generation (`gen`) is taken out, and `gen` appears nowhere else in them — failing: ' + JSON.stringify(F(a11)));

  /* ── a10 · the harness runs the rules ── */
  const csproj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/PhotoOpenTests.cs')) ? raw('scripts/csh/PhotoOpenTests.cs') : '';
  const a10 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/PhotoOpenRules.cs" />') === 1,
    tests: count(tests, /\[TestMethod\]/g) >= 23 && /\[TestClass\]\s*public class PhotoOpenTests/.test(tests),
    readsUtils: /Utils\.cs/.test(tests) && /public static void sendUiCommand\(SpixiContentPage contentPage, string command, params string\[\] arguments\)/.test(tests),
  };
  ok(F(a10).length === 0,
    '★ photo1a a10 harness (PO-0 / PO-1 / PO-5): csh.csproj compiles the REAL PhotoOpenRules.cs, PhotoOpenTests holds at least the 23 [TestMethod]s (the contract 19 + the later ones, counted ★ r7) (the flags line, the gate, the counts, the re-check rule, the one-pass row arguments, the command text read against Utils.sendUiCommand\'s own source) — failing: ' + JSON.stringify(F(a10)));
}
