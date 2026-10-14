/* ==== S18 D3 (Damir 2026-10-12, the S17 walk: MO-LANG / MO-APP / MO-OFFLINE / MO-AUTODL gave no sheet and the log could not
 * say why) — Developer › Reset moment sheets + the moment decision log line. P28, dev surface, #1312 rule 1.
 * (a) EXECUTED on the BUILT dev.html (jsdom) — the second tap re-based by S19 F8 (inside the 1 s quiet window: no second verb):
 *   · no row before C# declared the verb (cap `devmoments`) — no dead row on an older exe — and none without the Moment-sheets
 *     flag row (a 3-digit setFlagsDev); with both, ONE row in the flags card, its label = the dictionary's devResetMoments
 *     (en-us and a de-de boot), not a switch (the S16 flags pin counts switches);
 *   · a tap sends EXACTLY `ixian:devmoments:reset` (no argument, nothing else); a second tap the same; the cap arriving after
 *     the flags push remounts the card with the row; no page error.
 * (b) SOURCE (C#; scripts/csh cannot reach the MAUI glue — the pure parts are EXECUTED in S17MomentTests.AskLine_*):
 *   · DevPage: an EXACT `Equals(S17MomentRules.DevResetVerb)` branch, dev mode gates the only call (SMoments.resetForDev),
 *     a failure logs its type only; onLoad declares the cap AFTER pushFlagsDev; the verb constant is the fixed string;
 *   · SMoments.resetForDev: removes moments.seen / moments.langs / moments.apps (SLocalOnlyStore.remove — written at once),
 *     clears the session bits (moment, card, since) + the pending language + the one-shot privacy open, ONE log call with the
 *     fixed constant DevResetLine (a literal);
 *   · the ask line: logged in answerAsync AFTER decide() and BEFORE the answer push, from askLine(id, d, why(...)), at most
 *     MaxAskLines (100) per process (resetForDev starts the count again) — a page spamming asks cannot flood ixian.log; askLine's
 *     line is built ONLY from literals + Ids[i] (the FIXED set, re-read by index — never the caller's id) + decisionWord(d)
 *     (three literals) + WhyWords[k] (the five literals); `arg` (a language code / an app id) never reaches a log call.
 * Deliberate breaks (S18 D3 report): dev.html sending `ixian:devmoments:reset:1` → (a) tap fails; the row built without the
 * cap test → (a) noDeadRow fails; the ask log without the MaxAskLines cap → (b) askPlace fails; askLine concatenating `id` → (b) askShape fails; DevPage without the devMode test →
 * (b) devGate fails; resetForDev keeping moments.apps → (b) reset fails. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';

const VERB = 'ixian:devmoments:reset';

/* the body of the first `{ … }` after `sig` (brace-matched), C# comments stripped */
function body(src, sig) {
  const at = src.indexOf(sig);
  if (at < 0) return '';
  const open = src.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(open + 1, i).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '); }
  }
  return '';
}

export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const rd = (f) => readFileSync(join(root, f), 'utf8');
  const { boot } = b2Kit(h);

  /* —— (a) the BUILT dev.html —— */
  const a = {};
  const en = JSON.parse(rd('src/strings/en-us.json'));
  const de = JSON.parse(rd('src/strings/de-de.json'));
  let s = null;
  const close = () => { try { s && s.dom.window.close(); } catch (er) {} s = null; };
  const rows = () => [...s.d.querySelectorAll('.c-dev-flags [data-dev-reset]')];
  try {
    s = await boot('dev.html');
    await sleep(100);
    s.push('setCaps', 'sendlog');
    s.push('setFlagsDev', '1,1,1,1');
    await sleep(60);
    a.noDeadRow = !!s.d.querySelector('.c-dev-flags') && rows().length === 0;
    s.push('setCaps', 'devmoments');   // the DevPage order: the cap lands AFTER the flags push → the card remounts
    await sleep(60);
    const r = rows();
    a.one = r.length === 1 && r[0].tagName === 'BUTTON' && r[0].getAttribute('type') === 'button' && !r[0].hasAttribute('role')
      && s.d.querySelectorAll('.c-dev-flags [role="switch"]').length === 4;
    a.label = !!en.devResetMoments && r.length === 1 && r[0].textContent.trim() === en.devResetMoments;
    const b0 = s.sent.length;
    r[0].click();
    await sleep(40);
    a.tap = JSON.stringify(s.sent.slice(b0)) === JSON.stringify([VERB]);
    rows()[0].click();
    await sleep(40);
    /* re-based by S19 F8 (#1371, Damir tapped 10× in 1.5 s): a second tap INSIDE the 1 s quiet window sends nothing more (the
       after-the-window tap + the toast are pinned in pins-s19/r-dev-reset-toast) */
    a.again = JSON.stringify(s.sent.slice(b0)) === JSON.stringify([VERB]);
    s.push('setFlagsDev', '1,1,1');   // an exe with no Moment-sheets flag row: no reset row either
    await sleep(40);
    a.behindFlagRow = !!s.d.querySelector('.c-dev-flags') && rows().length === 0;
    a.noErr = s.errs.filter((x) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(x)).length === 0;
    close();
    s = await boot('dev.html', { query: 'lang=de-de' });
    await sleep(100);
    s.push('setCaps', 'devmoments');
    s.push('setFlagsDev', '1,1,1,1');
    await sleep(60);
    a.deLabel = !!de.devResetMoments && rows().length === 1 && rows()[0].textContent.trim() === de.devResetMoments;
  } catch (er) { a.err = er.message; }
  finally { close(); }
  ok(Object.values(a).every((x) => x === true),
    '★ S18 D3 (P28, dev surface): the BUILT dev.html — the Reset moment sheets row shows only after C# declared the verb (cap devmoments) AND inside the Moment-sheets flag card (4 digits), one plain button labelled devResetMoments (en-us, de-de), and a tap sends EXACTLY `' + VERB + '` — ' + JSON.stringify(a));

  /* —— (b) SOURCE: the C# handler, resetForDev and the log line shape —— */
  const b = {};
  try {
    const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
    const SM = rd('Spixi/Meta/SMoments.cs');
    const RU = rd('Spixi/Utils/S17MomentRules.cs');
    const branch = body(DP, 'current_url.Equals(S17MomentRules.DevResetVerb, StringComparison.Ordinal)');
    b.verbConst = /public const string DevResetVerb = "ixian:devmoments:reset";/.test(RU);
    b.exact = DP.indexOf('current_url.Equals(S17MomentRules.DevResetVerb, StringComparison.Ordinal)') > 0
      && !/StartsWith\([^)]*devmoments/.test(DP) && !/ixian:devmoments/.test(DP.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''));
    b.devGate = /^\s*try\s*\{\s*if \(Preferences\.Default\.Get\("devMode", false\)\) SMoments\.resetForDev\(\);\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\("DevPage: moments reset failed: " \+ ex\.GetType\(\)\.Name\);\s*\}\s*$/.test(branch);
    b.cap = /pushFlagsDev\(\);[^\n]*\n(?:\s*\/\/[^\n]*\n)?\s*Utils\.sendUiCommand\(this, "setCaps", "devmoments"\);/.test(DP);
    const reset = body(SM, 'public static void resetForDev()');
    b.reset = ['KeySeen', 'KeyLangs', 'KeyApps'].every((k) => new RegExp('SLocalOnlyStore\\.remove\\(S17MomentRules\\.' + k + '\\);').test(reset))
      && ['sessionMoment = false;', 'sessionCard = false;', 'sessionSince = 0;', 'pendingLang = "";', 'privacyOpen = null;', 'askLines = 0;'].every((x) => reset.includes(x));
    const logs = reset.match(/Logging\.\w+\(/g) || [];
    /* re-based by #46 security N2: the line follows the store result — "cleared" only when all three removes wrote, else one
       fixed failure line; plus the store-exception warn (type name). Three log calls, all fixed text. */
    b.resetLine = /if \(stored\) Logging\.info\(S17MomentRules\.DevResetLine\);\s*else Logging\.warn\("\[MO\] dev reset: store write failed"\);/.test(reset)
      && ['KeySeen', 'KeyLangs', 'KeyApps'].every((k) => new RegExp('stored &= SLocalOnlyStore\\.remove\\(S17MomentRules\\.' + k + '\\);').test(reset))
      && logs.length === 3
      && /Logging\.warn\("SMoments: store failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\);/.test(reset)
      && /public const string DevResetLine = "\[MO\] dev reset: moment sheets cleared";/.test(RU);
    /* the ask line: after decide, before the answer push, built by askLine from why() */
    const ans = body(SM, 'private static async Task answerAsync(');
    /* ★ re-based by S20 S (#1379 G): decide / why take the install-moment bit (atInstall) as a sixth argument */
    const iDecide = ans.indexOf('S17MomentRules.decide(id, seen, sessionMoment, sessionCard, eligible, atInstall)');
    const iLine = ans.indexOf('string askLine = S17MomentRules.askLine(id, d, S17MomentRules.why(id, seen, sessionMoment, sessionCard, eligible, atInstall));');
    const iLog = ans.search(/if \(askLine\.Length > 0 && askLines < S17MomentRules\.MaxAskLines\)[^\n]*\s*\{\s*askLines\+\+;\s*Logging\.info\(askLine\);\s*\}/);
    const iPush = ans.indexOf('"momentAnswer"');
    b.askPlace = iDecide > 0 && iLine > iDecide && iLog > iLine && iPush > iLog && iLog < ans.indexOf('markSeen(id, arg);');
    /* `arg` (a code / an app id) never reaches a log call anywhere in SMoments */
    b.noArgLogged = !/Logging\.\w+\([^;]*\barg\b/.test(SM.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''));
    const al = body(RU, 'public static string askLine(string id, Decision d, Why w)');
    const ret = (/return ("\[MO\] ask id="[^;]*);/.exec(al) || [])[1] || '';
    const parts = ret.split('+').map((x) => x.trim());
    b.askShape = parts.length === 6 && parts.every((p) => /^"[^"\\]*"$/.test(p) || p === 'Ids[i]' || p === 'decisionWord(d)' || p === 'WhyWords[k]')
      && /int i = Array\.IndexOf\(Ids, id\);/.test(al) && /if \(i < 0 \|\| k < 0 \|\| k >= WhyWords\.Length\) return "";/.test(al);
    b.cap100 = /public const int MaxAskLines = 100;/.test(RU) && /askLines = 0;/.test(reset);
    b.words = /private static readonly string\[\] WhyWords = \{ "seen", "wait", "session", "card", "ok" \};/.test(RU)
      && /public static string decisionWord\(Decision d\) => d == Decision\.Grant \? "grant" : d == Decision\.Consume \? "consume" : "refuse";/.test(RU)
      && /public static readonly string\[\] Ids = \{ "lang", "autodl", "offline", "firstixi", "mic", "app", "pay" \};/.test(RU);
    b.csh = /public void AskLine_WhyMatchesDecide_FixedWordsOnly\(\)/.test(rd('scripts/csh/S17MomentTests.cs'));
  } catch (er) { b.err = er.message; }
  ok(Object.values(b).every((x) => x === true),
    '★ S18 D3 (P28): C# — DevPage handles the EXACT `' + VERB + '` only in dev mode (resetForDev, type-only warn), declares the cap after the flags push; resetForDev removes moments.seen / .langs / .apps at once + the session bits, one fixed line; the `[MO] ask id=… d=… why=…` line is logged after decide() and before the answer, from literals + the FIXED id set only (no code, no app id) — ' + JSON.stringify(b));
}
