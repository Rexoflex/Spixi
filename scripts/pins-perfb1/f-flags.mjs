/* ==== perfb1 (Speed batch 1a) · F — the four switches' plumbing (P38–P41): SpixiFlags.WarmOnIdle · SpareRearm ·
 * SpareKeepShortSleep (OPT-IN) · PhoneNoEmptyDetail, read once at start; OFF = the old path (#1312 rule 1 / #1478).
 *
 * The pure rules and the REAL SpixiFlags.init run in the C# harness (scripts/csh/PerfB1FlagsTests.cs: defaults 1, 1, 0, 1;
 * a stored 0 acts only in dev mode; the opt-in's stored 1 acts only in dev mode; a throwing read keeps the defaults; the one
 * [FLAGS] line). This module pins the structure the harness cannot reach (comment-stripped C#, brace-matched bodies):
 *   INIT  — SpixiFlags: the four keys and property defaults; the four reads inside init's try (absent 1, 1, 0, 1); the three
 *           ON flags through S16PassRules.effectiveFlag and the opt-in through PerfB1Rules.effectiveOptIn (never
 *           effectiveFlag), all after the catch; ONE Logging.info(PerfB1Rules.flagsLine(…)) right after the safety line;
 *           PerfB1DevKeys = the four keys in the DevSwitchNames order;
 *   RULES — PerfB1Rules.cs is pure (no MAUI / Core using) and the harness compiles it;
 *   DEV   — DevPage: ONE branch `PerfB1Rules.devSwitchVerb(current_url, …)` BEFORE the catch-all devflash branch; its body
 *           stores ONLY inside `devMode && index in range && parseFlagTail`, then the existing pushFlagsDev; no earlier
 *           StartsWith branch (or the safety names) takes a perfb1 verb; pushFlagsDev names none of the four (no new push);
 *   SHELL — dev.html (source and built) does not name the four words (no shell change in this batch);
 *   DEV MODE OFF — (#46 r1 B-1 / S-5) `ixian:disableDevMode` removes the four keys and calls SpixiFlags.leaveDevMode
 *           (the opt-in OFF in this process) BEFORE its dropSpareChat("devmode").
 * Deliberate breaks: builder-d report (perfb1); #46 r1: leaveDevMode moved after the drop → red `order`;
 * leaveDevMode's `= false` → `= true` → CSH red (PerfB1FlagsTests.leaving_dev_mode_… / after_leaving_dev_mode_…); #46 r2 R2-1:
 * the wipe's call removed → red `bothCallersNoThird` + `wipeRightAfterTheClear`; moved before the Clear → red
 * `wipeRightAfterTheClear`; a third caller (enableDevMode) → red `bothCallersNoThird`. Restored. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const body = (t, sig, from = 0) => {
    const i = t.indexOf(sig, from); if (i < 0) return '';
    const o = t.indexOf('{', i + sig.length - 1); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);

  const NAMES = ['warmidle', 'sparerearm', 'sparekeep', 'noemptydetail'];
  const SF = rd('Spixi/Utils/SpixiFlags.cs');
  const RU = rd('Spixi/Utils/PerfB1Rules.cs');
  const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const SR = rd('Spixi/Utils/SafetyRules.cs');

  /* ── INIT ── */
  const init = body(SF, 'public static void init()');
  const at = (s) => init.indexOf(s);
  const iTry = init.search(/\btry\s*\{/), iCatch = at('catch (Exception ex)');
  const iCatchEnd = iCatch < 0 ? -1 : iCatch + body(init, 'catch (Exception ex)', iCatch).length;
  const reads = [['pw', 'WarmOnIdleKey', 1], ['pr', 'SpareRearmKey', 1], ['pk', 'SpareKeepShortSleepKey', 0], ['pn', 'PhoneNoEmptyDetailKey', 1]];
  const safetyLine = 'Logging.info(SafetyRules.flagsLine(SafeAppId, SafeStorage, SafePick, NativeConfirm, HistoryLock, WinAppMarker));';
  const comp = ['WarmOnIdle = S16PassRules.effectiveFlag(dev, pw);', 'SpareRearm = S16PassRules.effectiveFlag(dev, pr);',
    'SpareKeepShortSleep = PerfB1Rules.effectiveOptIn(dev, pk);', 'PhoneNoEmptyDetail = S16PassRules.effectiveFlag(dev, pn);',
    'Logging.info(PerfB1Rules.flagsLine(WarmOnIdle, SpareRearm, SpareKeepShortSleep, PhoneNoEmptyDetail));'];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tail = new RegExp([safetyLine, ...comp].map(esc).join('\\s*') + '\\s*\\}$');
  const fl = {
    found: init.length > 0 && iTry > 0 && iCatch > iTry,
    keys: /public const string WarmOnIdleKey = "flagWarmOnIdle";/.test(SF) && /public const string SpareRearmKey = "flagSpareRearm";/.test(SF)
      && /public const string SpareKeepShortSleepKey = "flagSpareKeepShortSleep";/.test(SF) && /public const string PhoneNoEmptyDetailKey = "flagPhoneNoEmptyDetail";/.test(SF),
    defaults: /public static bool WarmOnIdle \{ get; private set; \} = true;/.test(SF) && /public static bool SpareRearm \{ get; private set; \} = true;/.test(SF)
      && /public static bool PhoneNoEmptyDetail \{ get; private set; \} = true;/.test(SF),
    optInDefaultOff: /public static bool SpareKeepShortSleep \{ get; private set; \} = false;/.test(SF),
    locals: /int pw = 1, pr = 1, pk = 0, pn = 1;/.test(init) && at('int pw = 1, pr = 1, pk = 0, pn = 1;') < iTry,
    reads: reads.every(([v, k, d]) => {
      const s = v + ' = Preferences.Default.Get(' + k + ', ' + d + ');';
      return count(init, s) === 1 && at(s) > iTry && at(s) < iCatch;
    }),
    compute: tail.test(init) && at('WarmOnIdle = ') > iCatchEnd,
    optInRule: !/SpareKeepShortSleep = S16PassRules\.effectiveFlag/.test(SF) && count(SF, 'PerfB1Rules.effectiveOptIn(') === 1
      && count(SF, 'SpareKeepShortSleep = ') === 2 && count(init, 'SpareKeepShortSleep = ') === 1   // + leaveDevMode's `= false` (#46 r1 B-1)
      && /public static void leaveDevMode\(\)\s*\{\s*SpareKeepShortSleep = false;\s*\}/.test(SF),
    oneLine: count(SF, 'PerfB1Rules.flagsLine(') === 1 && count(init, 'PerfB1Rules.flagsLine(') === 1,
    devKeys: /public static readonly string\[\] PerfB1DevKeys = \{ WarmOnIdleKey, SpareRearmKey, SpareKeepShortSleepKey, PhoneNoEmptyDetailKey \};/.test(SF),
  };
  ok(F(fl).length === 0,
    '★ perfb1 F (P38–P41): SpixiFlags — four keys (absent 1, 1, 0, 1) read in init\'s try; WarmOnIdle / SpareRearm / PhoneNoEmptyDetail default ON through S16PassRules.effectiveFlag; SpareKeepShortSleep default OFF through PerfB1Rules.effectiveOptIn (never effectiveFlag); ONE [FLAGS] line right after the safety line; PerfB1DevKeys in the names\' order — failing: ' + JSON.stringify(F(fl)));

  /* ── RULES ── */
  const namesM = /DevSwitchNames = \{ ([^}]*) \};/.exec(RU);
  const names = namesM ? [...namesM[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  const CSH = raw('scripts/csh/csh.csproj');
  const ru = {
    names: names.join(',') === NAMES.join(','),
    pure: !/using Microsoft\.Maui|using IXICore|Preferences\.|Logging\./.test(RU),
    optIn: /public static bool effectiveOptIn\(bool devMode, int stored\)\s*\{\s*return devMode && stored == 1;\s*\}/.test(RU),
    csh: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S16FixRules\.cs" \/>[^\n]*\n\s*<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/PerfB1Rules\.cs" \/>/.test(CSH),
    tests: existsSync(join(root, 'scripts/csh/PerfB1FlagsTests.cs')) && /\[TestClass\]\s*public class PerfB1FlagsTests/.test(raw('scripts/csh/PerfB1FlagsTests.cs')),
  };
  ok(F(ru).length === 0,
    '★ perfb1 F: PerfB1Rules.cs is pure (no MAUI / Core), names the four switches, effectiveOptIn = devMode && stored == 1, and the harness compiles it (csh.csproj, after S16FixRules) with PerfB1FlagsTests — failing: ' + JSON.stringify(F(ru)));

  /* ── DEV ── */
  const SIG = 'else if (PerfB1Rules.devSwitchVerb(current_url, out int perfIndex, out string perfTail))';
  const CATCHALL = 'else if (current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal))';
  const iB = DP.indexOf(SIG), iG = DP.indexOf(CATCHALL);
  const br = iB < 0 ? '' : body(DP, SIG, iB);
  // every StartsWith literal of a branch that is tested BEFORE this one (derived from the code), plus the safety names
  const earlier = [...DP.slice(0, Math.max(iB, 0)).matchAll(/current_url\.StartsWith\("([^"]*)"/g)].map((m) => m[1]);
  const safe = (() => { const m = /DevSwitchNames = \{ ([^}]*) \};/.exec(SR); return m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => 'ixian:devflash:' + x[1] + ':') : []; })();
  const taken = NAMES.filter((n) => [...earlier, ...safe].some((p) => ('ixian:devflash:' + n + ':0').startsWith(p)));
  const pf = body(DP, 'private void pushFlagsDev()');
  const dv = {
    one: count(DP, 'PerfB1Rules.devSwitchVerb(') === 1 && iB > 0,
    beforeCatchAll: iG > 0 && iB < iG && count(DP, CATCHALL) === 1,
    afterSafety: DP.indexOf('else if (safetySwitchKey(current_url, out string safetyKey, out string safetyTail))') > 0
      && DP.indexOf('else if (safetySwitchKey(current_url, out string safetyKey, out string safetyTail))') < iB,
    gate: /^\{\s*try\s*\{\s*if \(Preferences\.Default\.Get\("devMode", false\) && perfIndex < SpixiFlags\.PerfB1DevKeys\.Length\s*&& S16PassRules\.parseFlagTail\(perfTail, out int value\)\)\s*\{\s*Preferences\.Default\.Set\(SpixiFlags\.PerfB1DevKeys\[perfIndex\], value\);\s*\}\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\("DevPage: flag switch failed: " \+ ex\.GetType\(\)\.Name\);\s*\}\s*pushFlagsDev\(\);\s*\}$/.test(br),
    oneSet: count(br, 'Preferences.Default.Set(') === 1 && count(DP, 'PerfB1DevKeys[') === 1,
    notTakenEarlier: earlier.length > 0 && taken.length === 0,
    noNewPush: pf.length > 0 && !/PerfB1|WarmOnIdle|SpareRearm|SpareKeep|PhoneNoEmptyDetail|warmidle|sparerearm|sparekeep|noemptydetail/.test(pf),
  };
  ok(F(dv).length === 0,
    '★ perfb1 F: DevPage — ONE branch ixian:devflash:<warmidle|sparerearm|sparekeep|noemptydetail>:<0|1> (PerfB1Rules.devSwitchVerb) after the safety branch and BEFORE the catch-all; it stores ONLY with dev mode on and parseFlagTail ("0" / "1"), then the existing pushFlagsDev; no earlier branch takes the four names; pushFlagsDev names none of them (no new push) — failing: ' + JSON.stringify(F(dv)) + (taken.length ? ' taken: ' + taken.join(',') : ''));

  /* ── SHELL ── */
  const shells = ['src/shells/dev.html', 'Spixi/Resources/Raw/html/dev.html'].filter((f) => existsSync(join(root, f)));
  const named = shells.filter((f) => NAMES.some((n) => raw(f).includes(n)));
  ok(shells.includes('src/shells/dev.html') && named.length === 0,
    '★ perfb1 F: dev.html (source and built) names none of the four switch words — no shell change in this batch (the Developer row comes in a later shell batch) — ' + JSON.stringify({ shells, named }));

  /* ── DEV MODE OFF (#46 r1 B-1 / S-5): the opt-in does not outlive dev mode ── */
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const OFFSIG = 'else if (current_url.StartsWith("ixian:disableDevMode", StringComparison.Ordinal))';
  const off = count(HP, OFFSIG) === 1 ? body(HP, OFFSIG) : '';
  const oi = (x) => off.indexOf(x);
  const iSet = oi('Preferences.Default.Set("devMode", false);');
  const iLoop = oi('foreach (string perfKey in SpixiFlags.PerfB1DevKeys)');
  const iLeave = oi('SpixiFlags.leaveDevMode();');
  const iDrop = oi('SpixiContentPage.dropSpareChat("devmode");');
  const { readdirSync } = h;
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const leaveCalls = walk('Spixi').reduce((n, f) => n + count(rd(f), 'SpixiFlags.leaveDevMode()'), 0);
  const leaveFiles = walk('Spixi').filter((f) => count(rd(f), 'SpixiFlags.leaveDevMode()') > 0).sort().join();
  /* #46 r2 R2-1: the account wipe is the second way out of dev mode (Preferences.Clear, the same process goes on) */
  const SPd = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const wipe = body(SPd, 'private void wipeEverything()');
  const TESTS = existsSync(join(root, 'scripts/csh/PerfB1FlagsTests.cs')) ? raw('scripts/csh/PerfB1FlagsTests.cs') : '';
  const dm = {
    found: off.length > 0 && iSet >= 0 && iDrop > 0,
    removesTheFour: /foreach \(string perfKey in SpixiFlags\.PerfB1DevKeys\)\s*\{\s*Preferences\.Default\.Remove\(perfKey\);\s*\}/.test(off) && count(off, 'PerfB1DevKeys') === 1,
    optInOffInProcess: count(off, 'SpixiFlags.leaveDevMode();') === 1,
    bothCallersNoThird: leaveCalls === 2 && leaveFiles === 'Spixi/Pages/Home/HomePage.xaml.cs,Spixi/Pages/Settings/SettingsPage.xaml.cs'
      && count(SPd, 'SpixiFlags.leaveDevMode()') === 1 && count(wipe, 'SpixiFlags.leaveDevMode();') === 1,
    wipeRightAfterTheClear: /try \{ Preferences\.Default\.Clear\(\); \} catch \(Exception ex\) \{[^}]*\}\s*WalletPassStore\.clear\(\);\s*SpixiFlags\.leaveDevMode\(\);/.test(wipe),
    order: iSet >= 0 && iLoop > iSet && iLeave > iLoop && iDrop > iLeave,
    s16Kept: /Preferences\.Default\.Set\("devMode", false\);\s*Preferences\.Default\.Remove\(SpixiFlags\.SecureWalletPassKey\);\s*Preferences\.Default\.Remove\(SpixiFlags\.MediaInputGateKey\);/.test(off),
    harness: /public void leaving_dev_mode_turns_the_opt_in_off_in_process\(\)/.test(TESTS) && /public void after_leaving_dev_mode_a_later_dev_mode_on_revives_nothing\(\)/.test(TESTS)
      && /public void the_account_wipe_alone_leaves_the_opt_in_on_in_process\(\)/.test(TESTS),
  };
  ok(F(dm).length === 0,
    '★ perfb1 F DEV MODE OFF (#46 r1 B-1 / S-5): `ixian:disableDevMode` removes the four PerfB1DevKeys (beside the two S16 keys, after `devMode` false) and turns the opt-in OFF in this process through SpixiFlags.leaveDevMode (init runs once: without it the running app kept the spare over a sleep, and a stored 1 survived to be revived by a later dev-mode-on with nothing on screen showing it) — BEFORE the branch\'s dropSpareChat("devmode"), so a kept spare goes with that drop; leaveDevMode has exactly TWO callers (#46 r2 R2-1) — that branch, and the account wipe right after its `Preferences.Default.Clear()` (+ the WalletPassStore line beside it): the wipe takes dev mode away and the same process goes on with a new account — and no third (executed: PerfB1FlagsTests) — failing: ' + JSON.stringify(F(dm)) + ' ' + JSON.stringify({ leaveCalls, leaveFiles }));
}
