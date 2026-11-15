/* ==== perfb1 P-11 switch 2 (SpixiFlags.SpareKeepShortSleep, opt-in, Android only) — keep the chat spare over a short sleep.
 *
 * Mechanism and reason: docs/perfb1-spare-drop-reason.md (the drop at sleep guards a hidden WebView whose content process
 * died alone — an Apple mechanism; on Android all WebViews share one renderer). The pure rule (Spixi/Utils/SpareKeepRules.cs)
 * is executed by scripts/csh (PerfB1SpareKeepTests.cs). This SOURCE pin (stripCode; brace-matched bodies) holds the sites:
 *   SLEEP  — App.OnSleep keeps ONLY through the rule and ONLY under `#if ANDROID`; the switch is read first, so OFF → the old
 *            `dropSpareChat("sleep")`; iPhone / Mac drop as before; Windows never drops at sleep;
 *   RESUME — App.OnResume calls spareKeepOnResume (Android): the limit first (both clocks), the proof POSTED;
 *   CLAIM  — pushSpareChat's FIRST statement drops a kept spare that the rule does not call claimable (Proven only);
 *   PROVEN — no path writes Proven but the proof's answer (afterProof, inside the deadline, no lock);
 *   OUT    — every way out of Kept / Proving is a drop through the ONE dropKeptSpare (`sleep`) or a completed proof;
 *   PROOF  — `document.readyState` on the spare's OWN WebView, nothing else evaluated, no log, no push, no new drop word;
 *   POST   — (#46 r1 A-2) the proof leaves OnResume's turn for real: through the pool, then the main thread;
 *   ANCHORED (#46 r1 pin audit C-1 · C-2 · C-5 · C-6 · C-10) — keepSpareAtSleep, spareKeepOnResume, startSpareKeepProof,
 *            finishSpareKeepProof and appLockUpForSpareKeep held WHOLE (stripCode + white space normalised), the slot's
 *            fill / empty / copy sites NAMED by method, no `return` before App.OnSleep's sleep drop. These bodies are
 *            BRITTLE ON PURPOSE: the cloud can neither compile nor run this Android-only glue, so its source text is the
 *            only test there is — a change to one of them must re-state it here.
 * The `harness` keys hold test-method NAMES, not their assertions — the CSH count is the gate for the pure rules.
 * Deliberate breaks (#802): remove the limit (`return elapsed < LimitMs;` → `return true;`) → red `limit` (+ CSH);
 * hand out an unproven spare (`claimable(true, spareKeepState)` → `claimable(false, spareKeepState)`) → red `claimChecksProven`;
 * keep with the switch off (`spareKept = SpixiFlags.SpareKeepShortSleep && …` → `spareKept = true && …`) → red `sleepSite`;
 * the old inline post back (`_ = Task.Run(() => MainThread.BeginInvokeOnMainThread(…))` → `MainThread.BeginInvokeOnMainThread(…)`)
 * → red `limitFirst`, `throughThePool`, `neverInline`; the pin auditor's C1–C18 and C10 (keep without `spareKeepOp = kept`, a
 * constant answer, `lockUp = false` at start / finish, appLockUpForSpareKeep → false, no `spareKeepProofSeq++`,
 * `chatStaging = false`, `elapsedMs = 0`, no Kept / Proving write, a second slot taker) and a `return` before the sleep
 * drop → red in SLEEP TAIL / PROOF INPUTS / RESUME WRITE / ONE TAKER; #46 r2: a new `borrowSpare()` reading
 * `spareChatOp?.target` (either #if arm) or a `PreloadOp o = spareChatOp!;` reader → red `mentions` (names the method); #46 r3 R3-2: a
 * `borrowKeptSpare()` reading `spareKeepOp?.target` → red `keepMentions`; the pin counts every textual mention of the two statics that hold the op, per
 * enclosing method — an alias through a local variable or a parameter is out of reach of a text pin, and a field or a property is counted under the method above it;
 * the sleep-drop block back BEFORE `markBackgrounded(); isInForeground = false;` → red `dropAfterTheForegroundFlag`. Restored. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return '';
    const o = t.indexOf('{', at); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig));
  const count = (t, re) => (t.match(re) || []).length;
  const F = (v) => Object.entries(v).filter(([, x]) => !x).map(([k]) => k);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const tree = walk('Spixi').map((f) => [f, rd(f)]);
  const treeCount = (re) => tree.reduce((n, [, t]) => n + count(t, re), 0);

  const APP = rd('Spixi/App.xaml.cs');
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const RULES = rd('Spixi/Utils/SpareKeepRules.cs');

  /* the switch-2 region of SpixiContentPage: from the first switch-2 field to the `#else` stub's `#endif` */
  const iRegion = SCP.indexOf('private static PreloadOp? spareKeepOp = null;');
  const iIf = SCP.lastIndexOf('#if ANDROID', iRegion);
  const iElse = SCP.indexOf('#else', iRegion);
  const iEnd = SCP.indexOf('#endif', iElse);
  const region = iIf >= 0 && iElse > iRegion && iEnd > iElse ? SCP.slice(iIf, iElse) : '';
  const stub = iElse > 0 && iEnd > iElse ? SCP.slice(iElse, iEnd) : '';
  const between = iIf >= 0 ? SCP.slice(iIf + '#if ANDROID'.length, iRegion) : 'x';

  /* ── SLEEP ── */
  const sleep = body(APP, 'protected override void OnSleep()');
  const keep = body(SCP, 'public static bool keepSpareAtSleep(bool lockEnabledOrUp)');
  const s = {
    sleepSite: /#if !WINDOWS\s*bool spareKept = false;\s*#if ANDROID\s*spareKept = SpixiFlags\.SpareKeepShortSleep && SpixiContentPage\.keepSpareAtSleep\(isLockEnabled\(\) \|\| isLockScreenActive\);\s*#endif\s*if \(!spareKept\)\s*\{\s*SpixiContentPage\.dropSpareChat\("sleep"\);\s*\}\s*#endif/.test(sleep),
    oneSleepDrop: count(sleep, /dropSpareChat\(/g) === 1 && count(sleep, /\bspareKept = /g) === 2 && treeCount(/\bkeepSpareAtSleep\(/g) === 2,
    androidOnly: region.length > 0 && /^\s*$/.test(between) && /public static bool keepSpareAtSleep\(bool lockEnabledOrUp\)/.test(region)
      && /public static void spareKeepOnResume\(\)/.test(region) && !/keepSpareAtSleep|spareKeepOnResume|EvaluateJavaScriptAsync/.test(stub)
      && /private static bool dropSpareIfKeptUnproven\(\)\s*\{\s*return false;\s*\}/.test(stub),
    keepThroughRule: /int next = SpareKeepRules\.atSleep\(SpixiFlags\.SpareKeepShortSleep, ready, chatStaging, lockUp \|\| modalOverlayOp != null\);\s*if \(next != SpareKeepRules\.Kept \|\| kept == null\)\s*\{\s*spareKeepOp = null;\s*spareKeepState = SpareKeepRules\.None;\s*return false;\s*\}/.test(keep)
      && /bool ready = kept != null && kept\.target is SingleChatPage s && s\.spareShellBooted;/.test(keep)
      && /bool lockUp = lockEnabledOrUp \|\| isLockStaging\(\);/.test(keep),
    ruleOffFirst: /if \(!flagOn \|\| !spareReady \|\| chatStaging \|\| lockEnabledOrUp\)\s*\{\s*return Dropped;\s*\}\s*return Kept;/.test(body(RULES, 'internal static int atSleep(')),
  };
  ok(F(s).length === 0,
    '★ perfb1 P-11 switch 2 SLEEP: App.OnSleep keeps the spare ONLY through SpixiContentPage.keepSpareAtSleep (→ SpareKeepRules.atSleep: switch ON, a READY spare, nothing staging, app lock off and no lock up) and ONLY under `#if ANDROID`, with the switch read FIRST — OFF → `dropSpareChat("sleep")`, the old drop; iPhone / Mac keep the drop; Windows never drops at sleep — failing: ' + JSON.stringify(F(s)));

  /* ── RESUME ── */
  const resume = body(APP, 'protected override void OnResume()');
  const onRes = body(SCP, 'public static void spareKeepOnResume()');
  const r = {
    resumeCall: /^\{\s*base\.OnResume\(\);\s*isInForeground = true;\s*#if ANDROID\s*SpixiContentPage\.spareKeepOnResume\(\);\s*#endif\s*Node\.resume\(\);/.test(resume)
      && treeCount(/\bspareKeepOnResume\(/g) === 2,
    limitFirst: /next = SpareKeepRules\.atResume\(spareKeepState, spareKeepTickElapsedMs\(\), spareKeepWallElapsedMs\(\)\);/.test(onRes)
      && /if \(next != SpareKeepRules\.Proving\)\s*\{\s*dropKeptSpare\(op\);\s*return;\s*\}\s*_ = Task\.Run\(\(\) => MainThread\.BeginInvokeOnMainThread\(\(\) => startSpareKeepProof\(op\)\)\);\s*\}$/.test(onRes)
      && /if \(op == null \|\| spareKeepState != SpareKeepRules\.Kept\)\s*\{\s*return;\s*\}/.test(onRes),
    bothClocks: /return Environment\.TickCount64 - spareKeepAtTick;/.test(region) && /return \(long\)\(DateTime\.UtcNow - spareKeepAtUtc\)\.TotalMilliseconds;/.test(region)
      && /spareKeepAtTick = Environment\.TickCount64;\s*spareKeepAtUtc = DateTime\.UtcNow;/.test(keep),
    limit: /internal const long LimitMs = 3 \* 60 \* 1000;/.test(RULES)
      && /if \(tickElapsedMs < 0 \|\| wallElapsedMs < 0\)\s*\{\s*return false;\s*\}\s*long elapsed = tickElapsedMs > wallElapsedMs \? tickElapsedMs : wallElapsedMs;\s*return elapsed < LimitMs;/.test(body(RULES, 'internal static bool withinLimit('))
      && /return withinLimit\(tickElapsedMs, wallElapsedMs\) \? Proving : Dropped;/.test(body(RULES, 'internal static int atResume(')),
    timerOnlyDrops: /if \(state == Kept && !withinLimit\(tickElapsedMs, wallElapsedMs\)\)\s*\{\s*return Dropped;\s*\}\s*return state;/.test(body(RULES, 'internal static int atLimitTimer('))
      && /Task\.Delay\(\(int\)SpareKeepRules\.LimitMs\)\.ContinueWith\(_ => dropKeptSpareAtLimit\(kept\)\);/.test(keep)
      && /!= SpareKeepRules\.Dropped\)\s*\{\s*return;[\s\S]*dropKeptSpare\(op\);\s*\}$/.test(body(SCP, 'private static void dropKeptSpareAtLimit(PreloadOp? op)')),
  };
  ok(F(r).length === 0,
    '★ perfb1 P-11 switch 2 RESUME / LIMIT: App.OnResume calls SpixiContentPage.spareKeepOnResume (Android) before any lock decision; a Kept spare is measured against SpareKeepRules.LimitMs (3 min) on BOTH clocks — the larger counts, a clock that went back is over, at the limit is over — over → dropped at once, within → the proof is POSTED (it runs after OnResume\'s lock decisions); the best-effort background timer can only drop a still-Kept spare that is over the limit — failing: ' + JSON.stringify(F(r)));

  /* ── CLAIM ── */
  const push = body(SCP, 'public string? pushSpareChat(Action<SingleChatPage> attach, int column, string navKey, int timeoutMs = 4000)');
  const claim = body(region, 'private static bool dropSpareIfKeptUnproven()');
  const c = {
    claimFirst: /^\{\s*if \(dropSpareIfKeptUnproven\(\)\)\s*\{\s*return SPARE_WHY_NONE;\s*\}\s*PreloadOp\? op;/.test(push) && treeCount(/\bdropSpareIfKeptUnproven\(/g) === 3,
    claimChecksProven: /if \(op == null \|\| spareKeepOp != op\)\s*\{\s*return false;\s*\}\s*if \(SpareKeepRules\.claimable\(true, spareKeepState\)\)\s*\{\s*spareKeepOp = null;\s*spareKeepState = SpareKeepRules\.None;\s*return false;\s*\}\s*\}\s*dropKeptSpare\(op\);\s*return true;\s*\}$/.test(claim),
    ruleProvenOnly: /return !isKeptSpare \|\| state == Proven;/.test(body(RULES, 'internal static bool claimable(')),
    offIsOld: /^\{\s*if \(!SpixiFlags\.SpareKeepShortSleep\)\s*\{\s*return false;\s*\}\s*PreloadOp\? op;/.test(claim)
      && /^\{\s*if \(!SpixiFlags\.SpareKeepShortSleep\)\s*\{\s*return;\s*\}\s*PreloadOp\? op;/.test(onRes),
  };
  ok(F(c).length === 0,
    '★ perfb1 P-11 switch 2 CLAIM (fail closed): pushSpareChat\'s FIRST statement hands the kept spare to SpareKeepRules.claimable — only a Proven one goes on (as a normal READY spare); Kept · Proving · Dropped · any other state is DROPPED and the tap opens cold with the existing word `none` (an unproven spare is never handed to a chat open); switch OFF: the claim helper and the resume call return at once (the old path) — failing: ' + JSON.stringify(F(c)));

  /* ── PROVEN · OUT ── */
  const finish = body(region, 'private static void finishSpareKeepProof(PreloadOp op, long seq, string? answer, long t0)');
  const start = body(region, 'private static void startSpareKeepProof(PreloadOp op)');
  const dropK = body(region, 'private static void dropKeptSpare(PreloadOp op)');
  const writes = (SCP.match(/spareKeepState = [^;]+;/g) || []).map((w) => w.replace(/^spareKeepState = |;$/g, ''));
  const allowed = new Set(['SpareKeepRules.None', 'SpareKeepRules.Kept', 'SpareKeepRules.Proving', 'SpareKeepRules.Dropped', 'next']);
  const p = {
    stateWrites: writes.length > 0 && writes.every((w) => allowed.has(w)) && count(SCP, /spareKeepState = next;/g) === 1 && !/(?<![=!<>])= SpareKeepRules\.Proven\b/.test(SCP),
    provenOnlyByAnswer: /int next = SpareKeepRules\.afterProof\(spareKeepState, answer, elapsedMs, lockUp \|\| modalOverlayOp != null\);\s*spareKeepState = next;\s*if \(next == SpareKeepRules\.Proven\)\s*\{\s*return;\s*\}\s*\}\s*dropKeptSpare\(op\);\s*\}$/.test(finish)
      && count(SCP, /SpareKeepRules\.afterProof\(/g) === 1 && count(RULES, /return Proven;/g) === 1
      && /if \(answerProves\(answer\) && elapsedMs >= 0 && elapsedMs <= ProofDeadlineMs && !lockUp\)\s*\{\s*return Proven;\s*\}\s*return Dropped;/.test(body(RULES, 'internal static int afterProof(')),
    settledOnce: /if \(seq != spareKeepProofSeq \|\| spareKeepOp != op \|\| spareKeepState != SpareKeepRules\.Proving\)\s*\{\s*return;\s*\}/.test(finish)
      && count(region, /finishSpareKeepProof\(op, seq, /g) === 2
      && /Task\.Delay\(\(int\)SpareKeepRules\.ProofDeadlineMs\)\.ContinueWith\(_ => finishSpareKeepProof\(op, seq, null, t0\)\);/.test(start)
      && /internal const long ProofDeadlineMs = 1000;/.test(RULES),
    oneDrop: count(region, /dropSpareChat\(/g) === 1 && /spareKeepState = SpareKeepRules\.Dropped;\s*if \(spareChatOp != op\)[\s\S]*dropSpareChat\("sleep"\);/.test(dropK)
      && count(region, /dropKeptSpare\(op\);/g) === 6,
    proofStartDrops: /if \(next != SpareKeepRules\.Proving \|\| wv == null\)\s*\{\s*dropKeptSpare\(op\);\s*return;\s*\}/.test(start)
      && /catch \(Exception\)\s*\{\s*dropKeptSpare\(op\);\s*\}/.test(start)
      && /next = SpareKeepRules\.atProofStart\(spareKeepState, lockUp \|\| modalOverlayOp != null\);/.test(start),
  };
  ok(F(p).length === 0,
    '★ perfb1 P-11 switch 2 PROVEN / OUT (L157): no line writes Proven — the ONE `spareKeepState = next` takes SpareKeepRules.afterProof, which answers Proven only for "complete" inside ProofDeadlineMs (1000 ms) with no lock; the deadline passes no answer (→ Dropped) and the second of answer / deadline finds the state settled (sequence-guarded); every other way out of Kept or Proving (limit · lock · no WebView · a throw · a wrong or late answer · a tap) is the ONE dropKeptSpare → `dropSpareChat("sleep")` — failing: ' + JSON.stringify(F(p)));

  /* ── PROOF · no log · no push · pure · harness ── */
  const proj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/PerfB1SpareKeepTests.cs')) ? raw('scripts/csh/PerfB1SpareKeepTests.cs') : '';
  const q = {
    ownWebView: /wv = op\.target\._webView;/.test(start) && /var answer = wv\.EvaluateJavaScriptAsync\("document\.readyState"\);/.test(start)
      && count(region, /EvaluateJavaScriptAsync\(/g) === 1 && /return answer != null && answer\.Trim\('"'\) == "complete";/.test(RULES),
    noLogNoPush: region.length > 0 && !/Logging|Console|sendUiCommand|executeUiCommand|evaluateJavascript\(|\.Eval\(/.test(region),
    pure: !/^\s*using\s/m.test(RULES) && !/Microsoft\.Maui|IXICore|SpixiFlags|DateTime|Environment/.test(RULES),
    harness: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/SpareRearmRules\.cs" \/>[^\n]*\n\s*<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/SpareKeepRules\.cs" \/>/.test(proj)
      && /\[TestClass\]\s*public class PerfB1SpareKeepTests/.test(tests)
      && ['switch_off_drops_at_sleep', 'a_lock_drops', 'the_limit_just_under_at_over_and_a_clock_that_went_back', 'unproven_is_not_usable',
        'proof_late_or_wrong_is_not_usable', 'proven_is_usable', 'model_sleep_return_tap_at_once_is_cold_and_drops_the_spare',
        'model_sleep_return_tap_after_the_answer_uses_the_spare'].every((n) => tests.includes('public void ' + n + '()')),
  };
  ok(F(q).length === 0,
    '★ perfb1 P-11 switch 2 PROOF: the proof evaluates `document.readyState` (the expression checkIfPageLoaded uses) on the spare\'s OWN WebView — one evaluation, it reads one DOM state word and writes nothing; the switch-2 code logs nothing and pushes nothing (no new log word, no new push, no new drop word); the rule is pure (no using, no MAUI / Core type, no clock — the call sites pass the elapsed times) and is executed in scripts/csh (PerfB1SpareKeepTests, its csproj line right after SpareRearmRules) — failing: ' + JSON.stringify(F(q)));

  /* ── POST (#46 r1 A-2): the proof starts AFTER OnResume's turn, for real ── */
  const resumeCallers = tree.flatMap(([f, x]) => [...x.matchAll(/\bspareKeepOnResume\(\)/g)]
    .filter((m) => !/void spareKeepOnResume\(\)/.test(x.slice(x.lastIndexOf('\n', m.index) + 1, x.indexOf('\n', m.index)))).map((m) => {
    const head = x.slice(0, m.index);
    const sigs = [...head.matchAll(/^[ \t]*(?:(?:public|private|protected|internal|static|override|virtual|async|new)\s+)+[\w<>?,\[\] .]+\s+(\w+)\s*\([^;{]*\)\s*$/gm)];
    return f + '#' + (sigs.length ? sigs[sigs.length - 1][1] : '?');
  }));
  const proofStarts = [...SCP.matchAll(/\bstartSpareKeepProof\(op\)/g)].map((m) => SCP.slice(Math.max(0, m.index - 80), m.index));
  const po = {
    /* MainThread.BeginInvokeOnMainThread runs the action INLINE on the main thread (MainActivity.cs, the F3 docblock), and
       App.OnResume IS the main thread — so the hop goes through the pool first: from there the main-thread post is real */
    onlyFromOnResume: resumeCallers.length === 1 && resumeCallers[0] === 'Spixi/App.xaml.cs#OnResume',
    throughThePool: proofStarts.length === 1 && /_ = Task\.Run\(\(\) => MainThread\.BeginInvokeOnMainThread\(\(\) => $/.test(proofStarts[0]),
    neverInline: !/^\s*MainThread\.BeginInvokeOnMainThread\(\(\) => startSpareKeepProof/m.test(SCP),
    lockAtStartAndAnswer: /bool lockUp = appLockUpForSpareKeep\(\) \|\| isLockStaging\(\);/.test(start) && /bool lockUp = appLockUpForSpareKeep\(\) \|\| isLockStaging\(\);/.test(finish),
  };
  ok(F(po).length === 0,
    '★ perfb1 P-11 switch 2 POST (#46 r1 A-2): App.OnResume (the main thread) is spareKeepOnResume\'s one caller, and MainThread.BeginInvokeOnMainThread runs INLINE when it is already on the main thread — so the proof leaves the turn through the pool (`_ = Task.Run(() => MainThread.BeginInvokeOnMainThread(() => startSpareKeepProof(op)))`): it starts AFTER OnResume\'s lock decisions, and its 1000 ms deadline starts then, not at the busiest moment; the lock is tested at the proof start AND at the answer — failing: ' + JSON.stringify(F(po)) + ' callers: ' + JSON.stringify(resumeCallers));

  /* ══ #46 r1 pin audit (C-1 · C-2 · C-5 · C-6 · C-10): ANCHORED BODIES — brittle on purpose. The cloud can neither compile
     nor run this glue (Android-only MAUI code), so the source text IS the test: a body here is compared whole, after
     stripCode and white-space normalising. A change to one of these bodies must re-state it here, on purpose. ══ */
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  /* a method head: modifiers, a type, a name, its parameters — the body may start on the same line (a one-line method) */
  const SIGRE = /^[ \t]*(?:(?:public|private|protected|internal|static|override|virtual|async|new)\s+)+[\w<>?,\[\] .]+\s+(\w+)\s*\([^;{]*\)\s*(?:\{.*)?$/gm;
  const methodAt = (t, idx) => { const sigs = [...t.slice(0, idx).matchAll(SIGRE)]; return sigs.length ? sigs[sigs.length - 1][1] : '?'; };
  const SLOT_DECL = 'private static PreloadOp? spareChatOp = null;';
  const SCPx = SCP.replace(SLOT_DECL, '');   // the declaration's initializer is not a site
  const sitesOf = (re) => [...SCPx.matchAll(re)].map((m) => methodAt(SCPx, m.index));

  /* ── SLEEP TAIL (C-1, C-5 C1 / C8 / C18, C-10) ── */
  const KEEP = '{ bool lockUp = lockEnabledOrUp || isLockStaging(); PreloadOp? kept; lock (preloadLock) { kept = spareChatOp; '
    + 'bool ready = kept != null && kept.target is SingleChatPage s && s.spareShellBooted; '
    + 'bool chatStaging = preloadPending || (activePreload != null && activePreload.target is SingleChatPage); '
    + 'int next = SpareKeepRules.atSleep(SpixiFlags.SpareKeepShortSleep, ready, chatStaging, lockUp || modalOverlayOp != null); '
    + 'if (next != SpareKeepRules.Kept || kept == null) { spareKeepOp = null; spareKeepState = SpareKeepRules.None; return false; } '
    + 'spareKeepOp = kept; spareKeepState = SpareKeepRules.Kept; spareKeepAtTick = Environment.TickCount64; spareKeepAtUtc = DateTime.UtcNow; spareKeepProofSeq++; } '
    + 'Task.Delay((int)SpareKeepRules.LimitMs).ContinueWith(_ => dropKeptSpareAtLimit(kept)); return true; }';
  const nKeep = norm(keep);
  const iSpareKept = sleep.indexOf('bool spareKept = false;');
  const st = {
    keepBody: nKeep === KEEP,
    /* the tail: a `true` (= App.OnSleep skips the drop) only AFTER the spare is marked kept, stamped on both clocks and given a
       new proof cycle, and after the limit timer is armed */
    keptTail: /spareKeepOp = kept; spareKeepState = SpareKeepRules\.Kept; spareKeepAtTick = Environment\.TickCount64; spareKeepAtUtc = DateTime\.UtcNow; spareKeepProofSeq\+\+; \} Task\.Delay\(\(int\)SpareKeepRules\.LimitMs\)\.ContinueWith\(_ => dropKeptSpareAtLimit\(kept\)\); return true; \}$/.test(nKeep),
    oneReturnTrue: count(nKeep, /return true;/g) === 1,
    chatStagingInput: nKeep.includes('bool chatStaging = preloadPending || (activePreload != null && activePreload.target is SingleChatPage);'),
    noReturnBeforeTheSleepDrop: iSpareKept > 0 && !/\breturn\b/.test(sleep.slice(0, iSpareKept)),
    /* #46 r2 R2-5: the sleep drop (which sets the pending re-arm) stands AFTER `isInForeground = false;` — a chats flush on
       the tick thread then finds the app in the background and leaves the re-arm for the resume; markBackgrounded stays
       right before the flag (smoke #496) */
    dropAfterTheForegroundFlag: count(sleep, /\bisInForeground = false;/g) === 1 && /markBackgrounded\(\);\s*isInForeground = false;\s*#if !WINDOWS\s*bool spareKept = false;/.test(sleep)
      && iSpareKept > sleep.indexOf('isInForeground = false;'),
  };
  ok(F(st).length === 0,
    '★ perfb1 P-11 switch 2 SLEEP TAIL (#46 r1 C-1 · C-5 · C-10): keepSpareAtSleep is held WHOLE — its ONE `return true` (which makes App.OnSleep skip the drop) comes only after `spareKeepOp = kept; spareKeepState = Kept;` both clock stamps, `spareKeepProofSeq++` (an answer of the cycle before is void) and the limit timer; `chatStaging` reads preloadPending and a staging chat; App.OnSleep has no `return` before its sleep-drop block, and that block stands right after `markBackgrounded(); isInForeground = false;` (#46 r2 R2-5: no flush can take the re-arm the drop sets while the flag still says foreground) — failing: ' + JSON.stringify(F(st)));

  /* ── PROOF INPUTS (C-2 C5 / C3 / C2 / C4, C-5 C6) ── */
  const START = '{ bool lockUp = appLockUpForSpareKeep() || isLockStaging(); WebView? wv; long seq; int next; lock (preloadLock) { '
    + 'if (spareKeepOp != op || spareChatOp != op || spareKeepState != SpareKeepRules.Proving) { return; } '
    + 'next = SpareKeepRules.atProofStart(spareKeepState, lockUp || modalOverlayOp != null); wv = op.target._webView; seq = ++spareKeepProofSeq; } '
    + 'if (next != SpareKeepRules.Proving || wv == null) { dropKeptSpare(op); return; } long t0 = Environment.TickCount64; '
    + 'try { var answer = wv.EvaluateJavaScriptAsync("document.readyState"); '
    + 'Task.Delay((int)SpareKeepRules.ProofDeadlineMs).ContinueWith(_ => finishSpareKeepProof(op, seq, null, t0)); '
    + 'answer.ContinueWith(t => finishSpareKeepProof(op, seq, t.Status == TaskStatus.RanToCompletion ? t.Result : null, t0)); } '
    + 'catch (Exception) { dropKeptSpare(op); } }';
  const FINISH = '{ long elapsedMs = Environment.TickCount64 - t0; bool lockUp = appLockUpForSpareKeep() || isLockStaging(); lock (preloadLock) { '
    + 'if (seq != spareKeepProofSeq || spareKeepOp != op || spareKeepState != SpareKeepRules.Proving) { return; } '
    + 'if (spareChatOp != op) { spareKeepOp = null; spareKeepState = SpareKeepRules.None; return; } '
    + 'int next = SpareKeepRules.afterProof(spareKeepState, answer, elapsedMs, lockUp || modalOverlayOp != null); spareKeepState = next; '
    + 'if (next == SpareKeepRules.Proven) { return; } } dropKeptSpare(op); }';
  const nStart = norm(start), nFinish = norm(finish);
  const nAppLock = norm(body(region, 'private static bool appLockUpForSpareKeep()'));
  const pi = {
    startBody: nStart === START,
    finishBody: nFinish === FINISH,
    answerContinuation: count(region, /answer\.ContinueWith\(t => finishSpareKeepProof\(op, seq, t\.Status == TaskStatus\.RanToCompletion \? t\.Result : null, t0\)\);/g) === 1,
    lockUpAtStart: nStart.startsWith('{ bool lockUp = appLockUpForSpareKeep() || isLockStaging();'),
    lockUpAtFinish: nFinish.startsWith('{ long elapsedMs = Environment.TickCount64 - t0; bool lockUp = appLockUpForSpareKeep() || isLockStaging();'),
    appLockBody: nAppLock === '{ return Application.Current is App app && app.isAppLockActive; }',
    elapsedFromT0: count(region, /long elapsedMs = Environment\.TickCount64 - t0;/g) === 1 && count(region, /long t0 = Environment\.TickCount64;/g) === 1,
  };
  ok(F(pi).length === 0,
    '★ perfb1 P-11 switch 2 PROOF INPUTS (#46 r1 C-2 · C-5): the inputs of the only way to Proven are held — the answer continuation passes the task\'s OWN result only when it RanToCompletion (never a constant) and the start tick t0; `elapsedMs` is measured from that t0 at the answer; `lockUp` = appLockUpForSpareKeep() || isLockStaging() at the proof start AND at the answer; appLockUpForSpareKeep is exactly `App.isAppLockActive`; startSpareKeepProof and finishSpareKeepProof are held whole — failing: ' + JSON.stringify(F(pi)));

  /* ── RESUME WRITE (C-5 C9) ── */
  const RESUME = '{ if (!SpixiFlags.SpareKeepShortSleep) { return; } PreloadOp? op; int next; lock (preloadLock) { op = spareKeepOp; '
    + 'if (op == null || spareKeepState != SpareKeepRules.Kept) { return; } if (spareChatOp != op) { spareKeepOp = null; spareKeepState = SpareKeepRules.None; return; } '
    + 'next = SpareKeepRules.atResume(spareKeepState, spareKeepTickElapsedMs(), spareKeepWallElapsedMs()); '
    + 'if (next == SpareKeepRules.Proving) { spareKeepState = SpareKeepRules.Proving; } } '
    + 'if (next != SpareKeepRules.Proving) { dropKeptSpare(op); return; } '
    + '_ = Task.Run(() => MainThread.BeginInvokeOnMainThread(() => startSpareKeepProof(op))); }';
  const nRes = norm(onRes);
  const iAt = nRes.indexOf('next = SpareKeepRules.atResume('), iProving = nRes.indexOf('spareKeepState = SpareKeepRules.Proving;'), iPost = nRes.indexOf('_ = Task.Run(');
  const rw = {
    resumeBody: nRes === RESUME,
    provingAfterTheLimitBeforeThePost: iAt > 0 && iProving > iAt && iPost > iProving,
    oneProvingWrite: count(SCP, /spareKeepState = SpareKeepRules\.Proving;/g) === 1,
  };
  ok(F(rw).length === 0,
    '★ perfb1 P-11 switch 2 RESUME WRITE (#46 r1 C-5): spareKeepOnResume is held whole — the ONE Kept → Proving write stands after the limit test (atResume) and before the proof post, so "proven → usable" stays reachable — failing: ' + JSON.stringify(F(rw)));

  /* ── ONE TAKER (C-6): every site that fills, empties or copies the spare slot, by method ── */
  const fills = sitesOf(/\bspareChatOp = op;/g);
  const empties = sitesOf(/\bspareChatOp = null;/g);
  const copies = sitesOf(/=\s*spareChatOp;/g);
  const slotWrites = count(SCPx, /\bspareChatOp = /g);
  /* #46 r2 R2-3: EVERY mention of the slot, in any shape (`?.target`, `!`, a compare, a copy), per enclosing method, over
     the whole stripped file — both `#if` arms; the declaration apart. A new reader anywhere goes red and names its method. */
  const mentionMap = {};
  for (const m of SCPx.matchAll(/\bspareChatOp\b/g)) { const k = methodAt(SCPx, m.index); mentionMap[k] = (mentionMap[k] || 0) + 1; }
  /* #46 r3 R3-2: the kept, UNPROVEN spare is also reachable through the second static that holds the op, `spareKeepOp` — counted the same way (own map). */
  const KEEP_DECL = 'private static PreloadOp? spareKeepOp = null;';
  const SCPk = SCP.replace(KEEP_DECL, '');
  const keepMap = {};
  for (const m of SCPk.matchAll(/\bspareKeepOp\b/g)) { const k = methodAt(SCPk, m.index); keepMap[k] = (keepMap[k] || 0) + 1; }
  const KEEP_MENTIONS = { keepSpareAtSleep: 2, spareKeepOnResume: 2, dropSpareIfKeptUnproven: 2, startSpareKeepProof: 1, finishSpareKeepProof: 2, dropKeptSpareAtLimit: 1, dropKeptSpare: 4 };
  const MENTIONS = { hasSpareChat: 1, warmSpareChat: 6, dropSpareChat: 2, keepSpareAtSleep: 1, spareKeepOnResume: 1, dropSpareIfKeptUnproven: 1,
    startSpareKeepProof: 1, finishSpareKeepProof: 1, dropKeptSpare: 1, pushSpareChat: 2 };
  const sameMap = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
  const ot = {
    fills: fills.join() === 'warmSpareChat',
    empties: empties.join() === 'warmSpareChat,dropSpareChat,pushSpareChat',
    copies: copies.join() === 'dropSpareChat,keepSpareAtSleep,dropSpareIfKeptUnproven,pushSpareChat',
    noOtherWrite: slotWrites === fills.length + empties.length,
    mentions: sameMap(mentionMap, MENTIONS),
    keepMentions: sameMap(keepMap, KEEP_MENTIONS),
    privateSlot: SCP.split(SLOT_DECL).length === 2 && tree.filter(([, x]) => /\bspareChatOp\b/.test(x)).map(([f]) => f).join() === 'Spixi/Utils/SpixiContentPage.cs',
  };
  ok(F(ot).length === 0,
    '★ perfb1 P-11 switch 2 ONE TAKER (#46 r1 C-6): the spare slot is private to SpixiContentPage and its sites are NAMED — filled only by warmSpareChat; emptied only by warmSpareChat (its staging failure), dropSpareChat and pushSpareChat; copied out only by dropSpareChat, keepSpareAtSleep, dropSpareIfKeptUnproven and pushSpareChat; and (#46 r2 R2-3 · r3 R3-2) EVERY textual mention of the two statics that hold the op — `spareChatOp` (`mentions`) and `spareKeepOp` (`keepMentions`) — in any shape is counted per enclosing method (both #if arms, the declarations apart; a field or a property is counted under the method above it); an alias made through a local variable or a parameter is out of reach of a text pin — so a new reader or taker of either static goes red and names its method, and pushSpareChat (whose first statement is dropSpareIfKeptUnproven) stays the only counted taker that hands a spare to a chat — failing: ' + JSON.stringify(F(ot)) + ' ' + JSON.stringify({ fills, empties, copies, slotWrites, mentionMap, keepMap }));
}
