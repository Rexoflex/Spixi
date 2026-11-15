/* ==== perfb1 P-12 (SpixiFlags.WarmOnIdle) — warm hidden WebViews only at input idle (Android).
 *
 * Mechanism (Galaxy A52s, adb walk 2026-11-12): on Android all WebViews share ONE renderer thread; a hidden page that
 * boots during a scroll freezes the visible one. The pure rule (Spixi/Utils/WarmIdleRules.cs) is executed by
 * scripts/csh (PerfB1WarmIdleTests.cs). This SOURCE pin (stripCode; brace-matched bodies; callers derived from the
 * tree, #771) holds the MAUI-bound call sites:
 *   1 GATE   — every warm request reaches the WebView boot only through the gate: warmSpareChat's FIRST statement is
 *              the idle wait (its re-check re-enters HomePage.warmChatSpareNow, so every refusal runs again), the Account
 *              warm waits in a loop of the remaining quiet time before `new SettingsPage()`; warmSpareChat,
 *              warmParkedOverlay and SingleChatPage.createSpare have ONE caller each, inside those gated paths;
 *   2 STAMP  — MainActivity.DispatchTouchEvent stores a TIME only (one static long; no position, no log, no allocation)
 *              and is the one writer of it (#46 r1 S-10: `internal`, `private set`);
 *   3 OFF    — switch off / not Android = today's delays: the gate answers 0 (WarmIdleRules: switch first; the #else
 *              of inputIdleWaitMs), the fixed delays are kept and run BEFORE the gate;
 *   4 STAGGER (#46 r1 A-1) — ONE main-thread stamp of the last hidden boot that passed the gate; both waiters stamp it in
 *              the turn the gate answered 0, so the Account warm and the spare never boot within 900 ms of each other;
 *   5 FOREGROUND (#46 r1 A-6) — after its wait the Account warm boots only while running in the foreground (gate on);
 *   6 RESUME RETRY (#46 r2 R2-4) — that refusal sets ONE bool; HomePage.onResume asks the same warm again once.
 * The `harness` keys hold test-method NAMES, not their assertions — the CSH count is the gate for the pure rules.
 * Deliberate breaks (#802): `waitMs <= 0` → `waitMs >= 0` in spareWaitsForInputIdle (the spare bypasses the gate) →
 * red `spareGate`; `idleWaitMs > 0` → `idleWaitMs < 0` in the Account loop → red `accountGate`; the spare's
 * `markHiddenBoot();` → `inputIdleGates();` → red `bothWaitersStamp` + `spareGate`; `if (inputIdleGates())` →
 * `if (!inputIdleGates())` in markHiddenBoot → red `writtenOnlyWithTheGate`; `App.isInForeground` → `true` in the Account
 * loop → red `sequence`; `{ get; private set; }` → `{ get; set; }` on lastTouchMs → red `oneLong`; the refusal without
 * `accountWarmRetryOnResume = true;` → red `sequence`, `oneBool`, `setOnlyByTheRefusal`; onResume's `if (accountWarmRetryOnResume)`
 * → `if (true)` → red `oneBool`, `resumeAsksOnce` (+ b `resumeHook`). Restored. */
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
  /* the call sites of a method, by the method body that holds them: [file, enclosing signature line] */
  const callersOf = (re, declRe) => {
    const out = [];
    for (const [f, t] of tree) {
      for (const m of t.matchAll(re)) {
        const lineStart = t.lastIndexOf('\n', m.index) + 1;
        const line = t.slice(lineStart, t.indexOf('\n', m.index));
        if (declRe && declRe.test(line)) continue;
        /* the nearest method signature above the call */
        const head = t.slice(0, m.index);
        const sigs = [...head.matchAll(/^[ \t]*(?:(?:public|private|protected|internal|static|override|virtual|async|new)\s+)+[\w<>?,\[\] .]+\s+(\w+)\s*\([^;{]*\)\s*$/gm)];
        out.push(f + '#' + (sigs.length ? sigs[sigs.length - 1][1] : '?'));
      }
    }
    return out;
  };

  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const MA = rd('Spixi/Platforms/Android/MainActivity.cs');

  /* ── 1: GATE ── */
  const warm = body(SCP, 'public bool warmSpareChat(Func<SingleChatPage> make, int column)');
  const wait = body(SCP, 'private bool spareWaitsForInputIdle()');
  const idle = body(SCP, 'public static long inputIdleWaitMs()');
  const homeRecheck = body(HP, 'protected override void onSpareIdleRecheck()');
  const acc = body(HP, 'private void warmAccountAfterFirstPaint()');
  const iDelay = acc.indexOf('await Task.Delay(900);');
  const iRail = acc.indexOf('if (railPane)');
  const iLoop = acc.indexOf('for (long idleWaitMs = SpixiContentPage.inputIdleWaitMs();');
  const iPark = acc.indexOf('warmParkedOverlay(new SettingsPage())');
  const warmCallers = callersOf(/\bwarmSpareChat\(/g, /public bool warmSpareChat\(/);
  const parkCallers = callersOf(/\bwarmParkedOverlay\(/g, /public bool warmParkedOverlay\(/);
  const spareMakers = callersOf(/SingleChatPage\.createSpare\(/g);
  const recheckCalls = callersOf(/\bonSpareIdleRecheck\(\)/g, /void onSpareIdleRecheck\(\)/);
  const gate = {
    spareGate: /^\{\s*if \(spareWaitsForInputIdle\(\)\)\s*\{\s*return false;\s*\}\s*string\? refused = null;/.test(warm)
      && /^\{\s*long waitMs = inputIdleWaitMs\(\);\s*if \(waitMs <= 0\)\s*\{\s*markHiddenBoot\(\);\s*return false;\s*\}\s*if \(spareIdleRecheckPending\)\s*\{\s*return true;\s*\}\s*spareIdleRecheckPending = true;\s*Task\.Delay\(\(int\)waitMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*spareIdleRecheckPending = false;\s*onSpareIdleRecheck\(\);\s*\}\)\);\s*return true;\s*\}$/.test(wait),
    coalescedOnePending: /private static bool spareIdleRecheckPending = false;/.test(SCP) && count(SCP, /\bspareIdleRecheckPending = /g) === 3,
    recheckReentersFunnel: /protected virtual void onSpareIdleRecheck\(\)\s*\{\s*\}/.test(SCP)
      && /^\{\s*if \(!running\)\s*\{\s*return;\s*\}\s*warmChatSpareNow\(\);\s*\}$/.test(homeRecheck)
      && recheckCalls.length === 1 && recheckCalls[0] === 'Spixi/Utils/SpixiContentPage.cs#spareWaitsForInputIdle',
    accountGate: iDelay >= 0 && iRail > iDelay && iLoop > iRail && iPark > iLoop
      && /for \(long idleWaitMs = SpixiContentPage\.inputIdleWaitMs\(\); idleWaitMs > 0; idleWaitMs = SpixiContentPage\.inputIdleWaitMs\(\)\)\s*\{\s*await Task\.Delay\(\(int\)idleWaitMs\);\s*if \(!running\)\s*\{\s*return;\s*\}\s*\}\s*if \(!WarmIdleRules\.bootsAfterWait\([\s\S]*?\}\s*SpixiContentPage\.markHiddenBoot\(\);\s*if \(!warmParkedOverlay\(new SettingsPage\(\)\)\)/.test(acc)
      && count(acc, /new SettingsPage\(\)/g) === 1,
    oneWarmSpareCaller: warmCallers.length === 1 && warmCallers[0] === 'Spixi/Pages/Home/HomePage.xaml.cs#warmChatSpareNow',
    oneParkCaller: parkCallers.length === 1 && parkCallers[0] === 'Spixi/Pages/Home/HomePage.xaml.cs#warmAccountAfterFirstPaint',
    oneSpareMaker: spareMakers.length === 1 && spareMakers[0] === 'Spixi/Pages/Home/HomePage.xaml.cs#warmChatSpareNow',
    /* every spare trigger (A after a close · B after the first flush · C after a desktop present · the P-11 re-arm through
       B) funnels into warmChatSpareNow by the ONE post in scheduleChatSpareWarm, or by the idle re-check */
    funnel: /private void scheduleChatSpareWarm\(int delayMs\)\s*\{\s*if \(!CHAT_SPARE_ENABLED\)\s*\{\s*return;\s*\}\s*Task\.Delay\(delayMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(warmChatSpareNow\)\);\s*\}/.test(HP)
      && count(HP, /\bwarmChatSpareNow\b/g) === 3,
  };
  ok(F(gate).length === 0,
    '★ perfb1 P-12 GATE: every warm request reaches the WebView boot only through the input-idle gate — warmSpareChat\'s FIRST statement is the idle wait (one coalesced re-check after the remaining quiet time; it re-enters HomePage.warmChatSpareNow, so every refusal runs again, and nothing runs after stop()), the Account warm loops on the remaining quiet time AFTER its 900 ms and BEFORE `new SettingsPage()`; warmSpareChat · warmParkedOverlay · SingleChatPage.createSpare have one caller each, inside the gated paths (derived from the tree) — failing: ' + JSON.stringify(F(gate)) + ' callers: ' + JSON.stringify({ warmCallers, parkCallers, spareMakers, recheckCalls }));

  /* ── 2: STAMP ── */
  const dte = body(MA, 'public override bool DispatchTouchEvent(MotionEvent? e)');
  const writers = callersOf(/\blastTouchMs\s*=(?!=)/g);
  const stamp = {
    override: /^\{\s*lastTouchMs = System\.Environment\.TickCount64;\s*return base\.DispatchTouchEvent\(e\);\s*\}$/.test(dte),
    timeOnly: dte.length > 0 && !/GetX|GetY|RawX|RawY|\.X\b|\.Y\b|Pointer|Logging|Log\.|Console|\bnew\b|\+=/.test(dte),
    /* #46 r1 S-10: internal + private set — only MainActivity can write it (the reader is in the same assembly) */
    oneLong: /internal static long lastTouchMs \{ get; private set; \}/.test(MA) && count(MA, /\blastTouchMs\b/g) === 2
      && !/public static long lastTouchMs/.test(MA),
    oneOverride: tree.reduce((n, [, t]) => n + count(t, /override bool DispatchTouchEvent\(/g), 0) === 1,
    oneWriter: writers.length === 1 && writers[0] === 'Spixi/Platforms/Android/MainActivity.cs#DispatchTouchEvent',
    readByGateOnly: tree.filter(([, t]) => /MainActivity\.lastTouchMs/.test(t)).map(([f]) => f).join() === 'Spixi/Utils/SpixiContentPage.cs'
      && count(SCP, /MainActivity\.lastTouchMs/g) === 1,
  };
  ok(F(stamp).length === 0,
    '★ perfb1 P-12 STAMP: MainActivity.DispatchTouchEvent stores the TIME of the last touch in ONE static long (`lastTouchMs = System.Environment.TickCount64;` — qualified: this file also imports Android.OS, which has its own `Environment`, so the bare name does not compile, CS0104) and returns base — no position (GetX / GetY / RawX), no log line, no allocation; it is the one override and the one writer, and only the gate reads it — failing: ' + JSON.stringify(F(stamp)) + ' writers: ' + JSON.stringify(writers));

  /* ── 3: OFF = the old delays ── */
  const rules = raw('Spixi/Utils/WarmIdleRules.cs');
  const rulesC = stripCode(rules);
  const proj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/PerfB1WarmIdleTests.cs')) ? raw('scripts/csh/PerfB1WarmIdleTests.cs') : '';
  const off = {
    ruleSwitchFirst: /internal static long waitMs\(bool flagOn, bool gatedPlatform, long nowMs, long lastTouchMs\)\s*\{\s*if \(!gates\(flagOn, gatedPlatform\)\)\s*\{\s*return 0;\s*\}/.test(rulesC)
      && /internal static bool gates\(bool flagOn, bool gatedPlatform\)\s*\{\s*return flagOn && gatedPlatform;\s*\}/.test(rulesC)
      && /internal const long QuietMs = 1200;/.test(rulesC)
      && /internal static long waitMs\(bool flagOn, bool gatedPlatform, long nowMs, long lastTouchMs, long lastHiddenBootMs\)\s*\{\s*if \(!gates\(flagOn, gatedPlatform\)\)\s*\{\s*return 0;\s*\}/.test(rulesC)
      && /internal static bool bootsAfterWait\(bool gated, bool running, bool foreground\)\s*\{\s*return !gated \|\| \(running && foreground\);\s*\}/.test(rulesC),
    rulePure: !/^\s*using\s/m.test(rulesC) && !/Microsoft\.Maui|IXICore|SpixiFlags/.test(rulesC),
    androidOnly: /^\{\s*#if ANDROID\s*return WarmIdleRules\.waitMs\(SpixiFlags\.WarmOnIdle, true, Environment\.TickCount64, global::Spixi\.MainActivity\.lastTouchMs, lastHiddenBootMs\);\s*#else\s*return 0;\s*#endif\s*\}$/.test(idle)
      && /^\{\s*#if ANDROID\s*return WarmIdleRules\.gates\(SpixiFlags\.WarmOnIdle, true\);\s*#else\s*return false;\s*#endif\s*\}$/.test(body(SCP, 'public static bool inputIdleGates()')),
    oldDelays: /private const int CHAT_SPARE_WARM_AFTER_CLOSE_MS = 0;/.test(HP) && /private const int CHAT_SPARE_WARM_AFTER_FIRST_PAINT_MS = 1800;/.test(HP)
      && /private const int CHAT_SPARE_WARM_AFTER_PRESENT_MS = 600;/.test(HP) && iDelay >= 0 && iLoop > iDelay,
    harness: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/WarmIdleRules\.cs" \/>/.test(proj) && /\[TestClass\]\s*public class PerfB1WarmIdleTests/.test(tests)
      && /switch_off_or_ungated_platform_waits_zero_the_old_delays/.test(tests),
  };
  ok(F(off).length === 0,
    '★ perfb1 P-12 OFF: with the switch OFF and on Windows / iPhone / Mac the gate answers 0, so today\'s timers run unchanged — WarmIdleRules tests the switch and the platform FIRST (pure: no using, no MAUI / Core type; executed in scripts/csh, PerfB1WarmIdleTests), inputIdleWaitMs is `return 0` outside `#if ANDROID`, and the fixed delays (close 0 · first paint 1800 · desktop present 600 · Account 900) are kept and run BEFORE the gate (a lower bound) — failing: ' + JSON.stringify(F(off)));

  /* ── 4: STAGGER (#46 r1 A-1) — the gate serialises the hidden boots: ONE main-thread stamp of the last boot that passed ── */
  const mark = body(SCP, 'public static void markHiddenBoot()');
  const markCallers = callersOf(/\bmarkHiddenBoot\(\)/g, /void markHiddenBoot\(\)/);
  const iLoopOpen = iLoop < 0 ? -1 : acc.indexOf('{', iLoop);
  const iLoopEnd = iLoopOpen < 0 ? -1 : iLoopOpen + blockFrom(acc, iLoop).length;
  const afterLoop = iLoopEnd < 0 ? '' : acc.slice(iLoopEnd, iPark);
  const stg = {
    oneStamp: /#if ANDROID\s*private static long lastHiddenBootMs = 0;\s*#endif/.test(SCP) && count(SCP, /\blastHiddenBootMs\b/g) === 3
      && tree.filter(([, t]) => /\blastHiddenBootMs\b/.test(t)).map(([f]) => f).sort().join() === 'Spixi/Utils/SpixiContentPage.cs,Spixi/Utils/WarmIdleRules.cs'
      && !/\bstatic\s+long\s+lastHiddenBootMs\b/.test(rulesC),   // the pure rule only names it as a parameter
    writtenOnlyWithTheGate: /^\{\s*#if ANDROID\s*if \(inputIdleGates\(\)\)\s*\{\s*lastHiddenBootMs = Environment\.TickCount64;\s*\}\s*#endif\s*\}$/.test(mark)
      && count(SCP, /\blastHiddenBootMs = (?!0;)/g) === 1,
    bothWaitersStamp: markCallers.length === 2 && markCallers.includes('Spixi/Utils/SpixiContentPage.cs#spareWaitsForInputIdle')
      && markCallers.includes('Spixi/Pages/Home/HomePage.xaml.cs#warmAccountAfterFirstPaint'),
    sameTurnAsTheZero: afterLoop.length > 0 && !/\bawait\b|Task\.|BeginInvoke|Dispatch/.test(afterLoop) && /SpixiContentPage\.markHiddenBoot\(\);\s*if \(!$/.test(afterLoop),
    staggerDial: /internal const long StaggerMs = 900;/.test(rulesC),
    harness: /one_touch_at_f_plus_700_keeps_the_two_boots_900_apart/.test(tests) && /cold_start_no_touch_keeps_the_old_900_and_1800/.test(tests)
      && /switch_off_or_ungated_runs_no_stagger_logic/.test(tests),
  };
  ok(F(stg).length === 0,
    '★ perfb1 P-12 STAGGER (#46 r1 A-1): the Account warm and the chat spare count the quiet time from the SAME touch stamp, so the gate also takes the time of the last hidden boot that passed it — ONE main-thread static (`lastHiddenBootMs`, Android only, read only by inputIdleWaitMs) written only by markHiddenBoot and only with the gate on; BOTH waiters call it in the very turn the gate answered 0 (the spare inside spareWaitsForInputIdle\'s 0 branch; the Account loop after the loop with no await between) — so two hidden WebViews never boot within WarmIdleRules.StaggerMs (900 ms, the old gap) of each other (executed: PerfB1WarmIdleTests) — failing: ' + JSON.stringify(F(stg)) + ' callers: ' + JSON.stringify(markCallers));

  /* ── 5: FOREGROUND (#46 r1 A-6) — "no touch" is also true when the user LEFT the app ── */
  const fg = {
    sequence: /\}\s*if \(!WarmIdleRules\.bootsAfterWait\(SpixiContentPage\.inputIdleGates\(\), running, App\.isInForeground\)\)\s*\{\s*accountWarmed = false;\s*accountWarmRetryOnResume = true;\s*return;\s*\}\s*SpixiContentPage\.markHiddenBoot\(\);\s*if \(!warmParkedOverlay\(new SettingsPage\(\)\)\)/.test(acc),
    latchIsTheRetry: /private bool accountWarmed = false;/.test(HP) && count(HP, /\baccountWarmed = true;/g) === 1 && count(HP, /\baccountWarmed = false;/g) === 2
      && /^\{\s*if \(accountWarmed\)\s*\{\s*return;\s*\}\s*accountWarmed = true;/.test(acc),
    harness: /a_boot_after_the_wait_needs_the_foreground_only_with_the_gate_on/.test(tests),
  };
  ok(F(fg).length === 0,
    '★ perfb1 P-12 FOREGROUND (#46 r1 A-6): after its idle wait the Account warm boots only while HomePage runs AND the app is in the foreground — WarmIdleRules.bootsAfterWait(the gate, running, App.isInForeground), gate off → true (the old path, which had no such test); a refusal releases the one-shot latch (`accountWarmed = false`) so the next chats flush asks again, and nothing is stamped or booted — failing: ' + JSON.stringify(F(fg)));

  /* ── 6: RESUME RETRY (#46 r2 R2-4) — a quiet resume has no chats flush, so the refusal of row 5 is asked again there ── */
  const resH = body(HP, 'public override void onResume()');
  const rr = {
    oneBool: /private bool accountWarmRetryOnResume = false;/.test(HP) && count(HP, /\baccountWarmRetryOnResume = true;/g) === 1
      && count(HP, /\baccountWarmRetryOnResume = false;/g) === 2 && count(HP, /\baccountWarmRetryOnResume\b/g) === 4,
    setOnlyByTheRefusal: /accountWarmed = false;\s*accountWarmRetryOnResume = true;\s*return;/.test(acc),
    resumeAsksOnce: /if \(accountWarmRetryOnResume\)\s*\{\s*accountWarmRetryOnResume = false;\s*warmAccountAfterFirstPaint\(\);\s*\}\s*\}$/.test(resH)
      && count(resH, /warmAccountAfterFirstPaint\(\)/g) === 1,
    /* the retry goes through the SAME method: its latch (no second SettingsPage), the 900 ms, the gate, the foreground
       test and the stamp; the flush and onResume are its only callers */
    sameWarm: callersOf(/\bwarmAccountAfterFirstPaint\(\)/g, /void warmAccountAfterFirstPaint\(\)/).sort().join() === 'Spixi/Pages/Home/HomePage.xaml.cs#loadChats,Spixi/Pages/Home/HomePage.xaml.cs#onResume'
      && /^\{\s*if \(accountWarmed\)\s*\{\s*return;\s*\}\s*accountWarmed = true;/.test(acc),
    harness: /model_a_background_refusal_is_asked_again_at_a_quiet_resume/.test(tests),
  };
  ok(F(rr).length === 0,
    '★ perfb1 P-12 RESUME RETRY (#46 r2 R2-4): a quiet resume has no chats flush, so after the foreground refusal of the Account warm (gate on only) ONE bool (`accountWarmRetryOnResume`, set only by that refusal) makes HomePage.onResume call the same warmAccountAfterFirstPaint once — its latch, its 900 ms, the gate, the foreground test and the stamp all apply; no second SettingsPage when a flush warmed it already (the latch); switch off: the bool is never set — failing: ' + JSON.stringify(F(rr)));
}
