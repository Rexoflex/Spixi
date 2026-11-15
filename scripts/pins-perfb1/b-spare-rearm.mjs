/* ==== perfb1 P-11 switch 1 (SpixiFlags.SpareRearm) — the chat spare is armed again after a drop.
 *
 * Mechanism: trigger B (HomePage.warmChatSpareAfterFirstPaint) is one-shot (`chatSpareFirstWarmScheduled`), so after a
 * drop (sleep · theme · language · reload · devmode) no spare came back until a conversation closed (device: 15 of 15
 * opens after 60 s in the background `attach spare=0 why=none`, 286–296 ms). A resume has NO chats flush of its own
 * (App.OnResume raises no `shouldRefreshContacts`; HomePage has no onResume; a flush needs a message, a receipt, a
 * chat / Account close or a home reload). The pure rule (Spixi/Utils/SpareRearmRules.cs) is executed by scripts/csh
 * (PerfB1SpareRearmTests.cs). This SOURCE pin (stripCode; brace-matched bodies) holds the call sites:
 *   DROP   — dropSpareChat arms the re-arm INSIDE the preload lock (a re-arm word → pending; stop / lowmem → cleared);
 *   TAKE   — the next chats flush takes it (never while a lock is up: App.isAppLockActive or the in-place lock) and
 *            releases trigger B's latch, right before trigger B → the +1800 ms warm through the SAME funnel;
 *   RESUME — HomePage.onResume (App.OnResume → the CurrentPage, a resume that does not lock) takes the re-arm and
 *            schedules trigger B at once (resume + 1800 ms) — only when the take succeeded;
 *   ASK    — the fallback: HomePage's 2 s tick asks ONE flush for a pending re-arm (never while locked) on the existing
 *            flag — a locked resume (after the unlock) or HomePage not the current page at the resume;
 *   OFF    — every decision reads SpixiFlags.SpareRearm through the rule (OFF → never), trigger B is unchanged;
 *   WORDS  — the rule names only words a drop site really passes; no new log line;
 *   REFUSE — (#46 r1 A-3 · A-4 · S-6) no take and no ask in the background or while a lock stages; a refused take
 *            clears the one flush ask, so the tick asks again later.
 * The `harness` keys hold test-method NAMES, not their assertions — the CSH count is the gate for the pure rules.
 * Deliberate breaks (#802): remove the re-arm (`chatSpareFirstWarmScheduled = false;` → `= true;` in
 * rearmChatSpareAfterDrop) → red `takeReleasesLatch`; a re-arm while locked (`takeSpareRearm(appLockUp())` →
 * `takeSpareRearm(false)`) → red `takeReadsLock`; schedule without the take (`if (rearmChatSpareAfterDrop())` →
 * `if (true)` in onResume) → red `resumeHook`; `App.isInForeground` → `true` in takeSpareRearm → red `takeRule` +
 * `bothReadTheForeground`; the refused take's `spareRearmFlushAsked = false;` → `= true;` → red `writes`, `takeRule`,
 * `refusedTakeClearsTheAsk`; `|| isLockStaging()` → `|| false` in askSpareRearmFlush → red `askRule` +
 * `bothReadTheStagingLock`. Restored. */
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

  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');

  /* ── DROP ── */
  const drop = body(SCP, 'public static void dropSpareChat(string why)');
  const d = {
    armsInsideLock: /^\{\s*PreloadOp\? op;\s*lock \(preloadLock\)\s*\{\s*if \(SpareRearmRules\.rearmsAfterDrop\(SpixiFlags\.SpareRearm, why\)\)\s*\{\s*spareRearmPending = true;\s*spareRearmFlushAsked = false;\s*\}\s*else if \(SpareRearmRules\.clearsOnDrop\(why\)\)\s*\{\s*spareRearmPending = false;\s*\}\s*op = spareChatOp;\s*spareChatOp = null;\s*\}\s*cancelTakenWarmingSpare\(why\);/.test(drop),
    writes: /private static bool spareRearmPending = false;/.test(SCP) && /private static bool spareRearmFlushAsked = false;/.test(SCP)
      && count(SCP, /\bspareRearmPending = true;/g) === 1 && count(SCP, /\bspareRearmPending = false;/g) === 3
      && count(SCP, /\bspareRearmFlushAsked = true;/g) === 1 && count(SCP, /\bspareRearmFlushAsked = false;/g) === 3
      && treeCount(/\bspareRearm(?:Pending|FlushAsked)\b/g) === count(SCP, /\bspareRearm(?:Pending|FlushAsked)\b/g),
    stopClearsAfterRunningFalse: /^\{\s*running = false;[\s\S]*SpixiContentPage\.dropSpareChat\("stop"\);\s*\}$/.test(body(HP, 'public void stop()')),
  };
  ok(F(d).length === 0,
    '★ perfb1 P-11 DROP: dropSpareChat decides the re-arm INSIDE the preload lock, before the slot is read — a re-arm word (SpareRearmRules.rearmsAfterDrop with SpixiFlags.SpareRearm) arms it and resets the one flush ask, `stop` / `lowmem` cancel it; the two bools live only in SpixiContentPage; HomePage.stop clears `running` before its `stop` drop, so nothing re-arms after shutdown — failing: ' + JSON.stringify(F(d)));

  /* ── TAKE ── */
  const take = body(SCP, 'public static bool takeSpareRearm(bool appLockUp)');
  const rearm = body(HP, 'private bool rearmChatSpareAfterDrop()');
  const once = body(HP, 'private void warmChatSpareAfterFirstPaint()');
  const t = {
    takeRule: /^\{\s*lock \(preloadLock\)\s*\{\s*if \(!SpareRearmRules\.takesRearm\(SpixiFlags\.SpareRearm, spareRearmPending, appLockUp \|\| modalOverlayOp != null \|\| isLockStaging\(\), App\.isInForeground\)\)\s*\{\s*spareRearmFlushAsked = false;\s*return false;\s*\}\s*spareRearmPending = false;\s*return true;\s*\}\s*\}$/.test(take),
    takeReleasesLatch: /^\{\s*if \(SpixiContentPage\.takeSpareRearm\(appLockUp\(\)\)\)\s*\{\s*chatSpareFirstWarmScheduled = false;\s*return true;\s*\}\s*return false;\s*\}$/.test(rearm)
      && /private bool rearmChatSpareAfterDrop\(\)/.test(HP),
    takeReadsLock: /SpixiContentPage\.takeSpareRearm\(appLockUp\(\)\)/.test(rearm)
      && /private static bool appLockUp\(\)\s*\{\s*return Microsoft\.Maui\.Controls\.Application\.Current is App app && app\.isAppLockActive;\s*\}/.test(HP),
    rightBeforeTriggerB: /sendBatchOrRows\("addChats", chatsBatch, new\[\] \{ "clearChats", "clearRequests" \}, new\[\] \{ "clearChatsDone" \}\);[\s\S]{0,1400}?rearmChatSpareAfterDrop\(\);\s*warmAccountAfterFirstPaint\(\);\s*warmChatSpareAfterFirstPaint\(\);/.test(HP)
      && count(HP, /\brearmChatSpareAfterDrop\(\)/g) === 3 && treeCount(/\btakeSpareRearm\(/g) === 2,
    sameFunnel: /^\{\s*if \(chatSpareFirstWarmScheduled\)\s*\{\s*return;\s*\}\s*chatSpareFirstWarmScheduled = true;\s*scheduleChatSpareWarm\(CHAT_SPARE_WARM_AFTER_FIRST_PAINT_MS\);\s*\}$/.test(once)
      && /private const int CHAT_SPARE_WARM_AFTER_FIRST_PAINT_MS = 1800;/.test(HP),
  };
  ok(F(t).length === 0,
    '★ perfb1 P-11 TAKE: the chats flush takes a pending re-arm (SpareRearmRules.takesRearm: switch ON, pending, NO lock — App.isAppLockActive or the in-place lock) and only then releases trigger B\'s one-shot latch, in the statement right before trigger B, so the +1800 ms warm runs again through the SAME funnel (scheduleChatSpareWarm → warmChatSpareNow → warmSpareChat, every refusal kept; on Android behind the idle gate) — failing: ' + JSON.stringify(F(t)));

  /* ── RESUME: a quiet resume has no flush — App.OnResume → CurrentPage.onResume (HomePage while home is on screen) ── */
  const res = body(HP, 'public override void onResume()');
  const appRes = body(rd('Spixi/App.xaml.cs'), 'protected override void OnResume()');
  const r = {
    /* #46 r2 R2-4: the Account retry follows the re-arm (pins-perfb1/a-warm-idle row 6) */
    resumeHook: /^\{\s*base\.onResume\(\);\s*if \(rearmChatSpareAfterDrop\(\)\)\s*\{\s*warmChatSpareAfterFirstPaint\(\);\s*\}\s*if \(accountWarmRetryOnResume\)\s*\{\s*accountWarmRetryOnResume = false;\s*warmAccountAfterFirstPaint\(\);\s*\}\s*\}$/.test(res),
    resumeNeverWarmsDirectly: res.length > 0 && !/scheduleChatSpareWarm|warmChatSpareNow|warmSpareChat|chatSpareFirstWarmScheduled|shouldRefreshContacts/.test(res)
      && count(HP, /public override void onResume\(\)/g) === 1,
    appCallsCurrentPage: /SpixiContentPage p = \(SpixiContentPage\)\(\(NavigationPage\)MainPage\)\.CurrentPage;\s*try\s*\{\s*p\.onResume\(\);/.test(appRes),
  };
  ok(F(r).length === 0,
    '★ perfb1 P-11 RESUME: HomePage.onResume (App.OnResume calls it on the NavigationPage CurrentPage when the resume does not lock) calls base, then schedules trigger B ONLY when it took the pending re-arm (rearmChatSpareAfterDrop → true: the latch released under the take) — the warm starts at resume + 1800 ms through the same funnel; it never warms, schedules, clears the latch or raises a flush itself — failing: ' + JSON.stringify(F(r)));

  /* ── ASK ── */
  const ask = body(SCP, 'public static bool askSpareRearmFlush(bool appLockUp)');
  const a = {
    askRule: /^\{\s*lock \(preloadLock\)\s*\{\s*if \(!SpareRearmRules\.asksFlush\(SpixiFlags\.SpareRearm, spareRearmPending, spareRearmFlushAsked, appLockUp \|\| modalOverlayOp != null \|\| isLockStaging\(\), App\.isInForeground\)\)\s*\{\s*return false;\s*\}\s*spareRearmFlushAsked = true;\s*return true;\s*\}\s*\}$/.test(ask),
    tickRaisesTheExistingFlag: /if \(SpixiContentPage\.askSpareRearmFlush\(appLockUp\(\)\)\)\s*\{\s*UIHelpers\.shouldRefreshContacts = true;\s*\}\s*if \(UIHelpers\.shouldRefreshContacts\)\s*\{\s*loadChats\(\);/.test(HP)
      && treeCount(/\baskSpareRearmFlush\(/g) === 2,
  };
  ok(F(a).length === 0,
    '★ perfb1 P-11 ASK: a resume (or an unlock) has no chats flush of its own, so HomePage\'s 2 s tick asks ONE for a pending re-arm (SpareRearmRules.asksFlush: switch ON, pending, not asked yet, no lock) by raising the EXISTING `UIHelpers.shouldRefreshContacts` right before the flush reads it — no new verb, no new push — failing: ' + JSON.stringify(F(a)));

  /* ── WORDS · OFF · no log · pure ── */
  const rules = stripCode(raw('Spixi/Utils/SpareRearmRules.cs'));
  const rearmWords = [...body(rules, 'internal static bool rearmsAfterDrop(bool flagOn, string? why)').matchAll(/case "([a-z]+)":/g)].map((m) => m[1]);
  const siteWords = new Set(tree.flatMap(([, x]) => [...x.matchAll(/dropSpareChat\("([a-z]+)"\)/g)].map((m) => m[1])));
  const proj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/PerfB1SpareRearmTests.cs')) ? raw('scripts/csh/PerfB1SpareRearmTests.cs') : '';
  const w = {
    words: rearmWords.join() === 'sleep,theme,language,reload,devmode' && rearmWords.every((x) => siteWords.has(x))
      && siteWords.has('stop') && siteWords.has('lowmem') && /return why == "stop" \|\| why == "lowmem";/.test(rules),
    offFirst: /internal static bool rearmsAfterDrop\(bool flagOn, string\? why\)\s*\{\s*if \(!flagOn\)\s*\{\s*return false;\s*\}/.test(rules)
      && /return flagOn && pending && !flushAsked && !lockUp && foreground;/.test(rules) && /return flagOn && pending && !lockUp && foreground;/.test(rules),
    pure: !/^\s*using\s/m.test(rules) && !/Microsoft\.Maui|IXICore|SpixiFlags/.test(rules),
    noNewLog: [take, ask, rearm, res, body(HP, 'private static bool appLockUp()'), rules].every((x) => x.length > 0 && !/Logging|Console/.test(x)),
    harness: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/SpareRearmRules\.cs" \/>/.test(proj) && /\[TestClass\]\s*public class PerfB1SpareRearmTests/.test(tests)
      && /never_while_locked/.test(tests) && /switch_off_never_rearms/.test(tests),
  };
  ok(F(w).length === 0,
    '★ perfb1 P-11 WORDS / OFF: the re-arm words are exactly sleep · theme · language · reload · devmode and each is a word a dropSpareChat site passes (derived from the tree; `stop` / `lowmem` clear), the switch is tested FIRST (OFF → never), the rule is pure (no using, no MAUI / Core type; executed in scripts/csh, PerfB1SpareRearmTests) and no new log line exists on the path — failing: ' + JSON.stringify(F(w)) + ' words: ' + JSON.stringify({ rearmWords, siteWords: [...siteWords] }));

  /* ── REFUSE (#46 r1 A-3 · A-4 · S-6): no take and no ask in the background or while a lock stages; a refused take lets
     the tick ask again ── */
  const takeIf = /if \(!SpareRearmRules\.takesRearm\(([^;]*)\)\)\s*\{([^}]*)\}/.exec(take) || [];
  const askIf = /if \(!SpareRearmRules\.asksFlush\(([^;]*)\)\)\s*\{([^}]*)\}/.exec(ask) || [];
  const lastArg = (args) => (args || '').split(',').map((x) => x.trim()).pop();
  const stg = body(SCP, 'public static bool isLockStaging()');
  const rf = {
    bothReadTheForeground: lastArg(takeIf[1]) === 'App.isInForeground' && lastArg(askIf[1]) === 'App.isInForeground'
      && /internal static bool takesRearm\(bool flagOn, bool pending, bool lockUp, bool foreground\)/.test(rules)
      && /internal static bool asksFlush\(bool flagOn, bool pending, bool flushAsked, bool lockUp, bool foreground\)/.test(rules),
    bothReadTheStagingLock: /appLockUp \|\| modalOverlayOp != null \|\| isLockStaging\(\)/.test(takeIf[1] || '') && /appLockUp \|\| modalOverlayOp != null \|\| isLockStaging\(\)/.test(askIf[1] || '')
      && /^\{\s*lock \(preloadLock\)/.test(stg),   // the same Monitor the caller holds: a re-entry, no new lock order
    refusedTakeClearsTheAsk: /^\s*spareRearmFlushAsked = false;\s*return false;\s*$/.test(takeIf[2] || '') && /^\s*return false;\s*$/.test(askIf[2] || ''),
    harness: /public void never_in_the_background\(\)/.test(tests)
      && /model_a_take_in_the_background_is_refused_and_the_next_resume_still_rearms/.test(tests)
      && /model_a_lock_between_the_ask_and_the_take_lets_the_tick_ask_again/.test(tests),
  };
  ok(F(rf).length === 0,
    '★ perfb1 P-11 REFUSE (#46 r1 A-3 · A-4 · S-6): takeSpareRearm and askSpareRearmFlush pass App.isInForeground to the rule (a 2 s tick that passed its own foreground test before App.OnSleep must not TAKE the re-arm in the background — its warm would be refused `why=background` and the re-arm lost; it waits for the next resume) and count a lock that is still STAGING (isLockStaging, the keep path\'s test; the same preload Monitor, re-entered) as a lock; a refused take clears the one flush ask, so the tick asks again once the lock / the background is gone — at most one forced flush per successful take — failing: ' + JSON.stringify(F(rf)));
}
