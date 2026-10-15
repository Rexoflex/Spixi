/* ==== S16 agent a-l8 — L8 (#1312 rule 1, #909, P03): the wallet password moves from the plaintext `walletpass` preference
 * to SecureStorage behind SpixiFlags.SecureWalletPass, + the SpixiFlags dev toggles.
 *
 * The decision core is EXECUTED in the C# harness (scripts/csh/S16PassTests.cs over Spixi/Utils/S16PassRules.cs: the flag
 * rule, the four cold-start sources, verify-then-remove, no plaintext fallback on the secure leg, the reverse copy, the
 * fixed-word lines). This module pins what the harness cannot reach (comment-stripped C#) and EXECUTES the dev row on the
 * BUILT dev.html:
 *   (a) no plaintext write of the password outside WalletPassStore's legacy branch, and no read of it outside the store;
 *   (b) every write site goes through WalletPassStore.write — create · restore · retry (VERIFY FIRST) · both changepass legs;
 *   (c) Node.loadWallet reads via the store; the restore paths open with the verified password;
 *   (d) the wipe and App() with no wallet file call clear();
 *   (e) BackupPage reads via the store and refuses (no zip, no encrypt) unless the value opens the wallet;
 *   (f) every SecureStorage call lives in WalletPassStore, inside a Task.Run, and every wait is bounded;
 *   (g) App(): SpixiFlags.init → prefetch → `new Node()`, after the logger;
 *   (h) iOS / Mac write with AfterFirstUnlockThisDeviceOnly under `#if IOS || MACCATALYST`;
 *   (i) SpixiFlags: the contract keys, default 1, the dev-mode rule, one [FLAGS] line;
 *   (j) the dev toggles: DevPage grammar + push, the built dev.html row (hidden until pushed, two switches, tap, echo,
 *       malformed ignored, says "after a restart").
 * Deliberate breaks (S16 a-l8 report): one per key. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join, sleep } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const walk = (dir, out = []) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const p = dir + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'obj' && e.name !== 'bin') walk(p, out); }
      else if (e.name.endsWith('.cs')) out.push(p);
    }
    return out;
  };
  const CS = walk('Spixi').map((f) => ({ f, t: rd(f) }));
  const STORE_F = 'Spixi/Meta/WalletPassStore.cs';
  const RULES_F = 'Spixi/Utils/S16PassRules.cs';
  const STORE = rd(STORE_F);
  const RULES = rd(RULES_F);

  /* ── (a) plaintext: written only by the store's plainSet, which the core calls only in the legacy branch and the reverse copy ── */
  const plainSets = CS.filter(({ f, t }) => /Preferences\.Default\.Set\(\s*("walletpass"|S16PassRules\.PassKey)\s*,/.test(t)
    || (f === STORE_F && /Preferences\.Default\.Set\(\s*Key\s*,/.test(t))).map(({ f }) => f);
  const passLiteral = CS.filter(({ f, t }) => /"walletpass"/.test(t) && f !== RULES_F).map(({ f, t }) => ({ f, uses: (t.match(/[^\n]*"walletpass"[^\n]*/g) || []).map((l) => l.trim()) }));
  const writeCore = body(RULES, 'public static bool write(bool flagOn, IStore s, string pass, out string? failWord)');
  const coldCore = body(RULES, 'public static string? coldStart(bool flagOn, IStore s, out string line, out string? note)');
  const a = {
    onlyStoreSets: plainSets.length === 1 && plainSets[0] === STORE_F,
    storeSetIsPlainSet: (STORE.match(/Preferences\.Default\.Set\(/g) || []).length === 1
      && /public void plainSet\(string value\)\s*\{\s*Preferences\.Default\.Set\(Key, value\);\s*\}/.test(STORE),
    // the only other "walletpass" literal left: the create path's Remove (the key is S16PassRules.PassKey everywhere else)
    literals: passLiteral.length === 1 && passLiteral[0].f === 'Spixi/Pages/Launch/LaunchPage.xaml.cs'
      && passLiteral[0].uses.length === 1 && /^Preferences\.Default\.Remove\("walletpass"\);$/.test(passLiteral[0].uses[0]),
    key: /public const string PassKey = "walletpass";/.test(RULES) && /private const string Key = S16PassRules\.PassKey;/.test(STORE),
    // write(): the ONE plainSet is the legacy branch, before any secure call; coldStart: only the ReverseCopy leg sets it
    writeLegacyOnly: /^\{\s*failWord = null;\s*if \(!flagOn\)\s*\{\s*s\.plainSet\(pass\);\s*return true;\s*\}/.test(writeCore)
      && (writeCore.match(/plainSet\(/g) || []).length === 1,
    coldPlainSetOnlyInReverse: (coldCore.match(/plainSet\(/g) || []).length === 1
      && coldCore.indexOf('plainSet(') > coldCore.indexOf('default:'),
  };
  ok(Object.values(a).every(Boolean),
    '★ S16 L8-a (#1312): the plaintext password is written ONLY by WalletPassStore.plainSet, which the core calls only on the flag-OFF legacy branch of write() and the reverse copy of the cold start; no other file sets or reads "walletpass" (the create path keeps only its Remove) — ' + JSON.stringify({ ...a, plainSets, passLiteral }));

  /* ── (b) every write site goes through WalletPassStore.write ── */
  const LP = rd('Spixi/Pages/Launch/LaunchPage.xaml.cs');
  const SP = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const EP = rd('Spixi/Pages/Settings/EncryptionPassword.xaml.cs');
  const create = body(LP, 'public void onCreateAccount(string nick, string pass)');
  const prefs = body(LP, 'private static void applyRestorePrefs(string pass)');
  const proceed = body(LP, 'private void proceed(string pass)');
  const slice = (src, from, to) => { const i = src.indexOf(from); const j = i < 0 ? -1 : src.indexOf(to, i); return i < 0 || j < 0 ? '' : src.slice(i, j); };
  const spLeg = slice(SP, 'StartsWith("ixian:changepass:"', 'Equals("ixian:backup"');
  const epLeg = slice(EP, 'StartsWith("ixian:changepass:"', 'protected override bool OnBackButtonPressed');
  const failBlock = (() => { const i = proceed.indexOf('if (wallet_decrypted == false)'); return i < 0 ? '' : body(proceed.slice(i), 'if (wallet_decrypted == false)'); })();
  const leg = (t, shape) => shape.test(t) && (t.match(/WalletPassStore\.write\(/g) || []).length === 1 && !/Preferences\./.test(t)
    && t.indexOf('writeWallet(split_url[2])') >= 0 && t.indexOf('writeWallet(split_url[2])') < t.indexOf('WalletPassStore.write(split_url[2])');
  const b = {
    create: create.indexOf('Node.generateWallet(pass)') >= 0 && create.indexOf('Node.generateWallet(pass)') < create.indexOf('WalletPassStore.write(pass);'),
    restorePrefs: /WalletPassStore\.write\(pass\);\s*\}$/.test(prefs),
    // ★ P03: VERIFY FIRST — the given-password open, then the failure block returns, THEN the store write
    proceedVerifyFirst: /^\{\s*bool wallet_decrypted = Node\.loadWallet\(pass\);/.test(proceed)
      && failBlock.length > 0 && /return;\s*\}$/.test(failBlock) && !/WalletPassStore/.test(failBlock)
      && proceed.indexOf('WalletPassStore.write(pass);') > proceed.indexOf(failBlock) + failBlock.length - 1,
    proceedOnce: (proceed.match(/WalletPassStore\.write\(/g) || []).length === 1,
    // the write sits in the branch where the NEW password opened the re-encrypted wallet, and still reports success
    settingsLeg: leg(spLeg, /if \(!IxianHandler\.getWalletStorage\(\)\.isValidPassword\(split_url\[2\]\)\)\s*\{[^{}]*\}\s*else\s*\{\s*WalletPassStore\.write\(split_url\[2\]\);\s*encResult = "1";\s*\}/),
    encryptionLeg: leg(epLeg, /if \(IxianHandler\.getWalletStorage\(\)\.isValidPassword\(split_url\[2\]\)\)\s*\{\s*WalletPassStore\.write\(split_url\[2\]\);\s*pass_changed = true;\s*\}/),
  };
  ok(Object.values(b).every(Boolean),
    '★ S16 L8-b (#1312): every write site stores through WalletPassStore.write — create (after generateWallet) · applyRestorePrefs (last) · the retry view VERIFIES FIRST (Node.loadWallet(pass); a wrong password returns before any store, P03) · both changepass legs after the isValidPassword(new) check, still answering success — ' + JSON.stringify(b));

  /* ── (c) the cold start reads via the store; restores open with the verified password ── */
  const NODE = rd('Spixi/Meta/Node.cs');
  const lwNone = body(NODE, 'static public bool loadWallet()');
  const lwPass = body(NODE, 'static public bool loadWallet(string password)');
  const c = {
    viaStore: /^\{\s*if \(!WalletPassStore\.readForColdStart\(out string\? password\) \|\| password == null\)\s*return false;\s*return loadWallet\(password\);\s*\}$/.test(lwNone),
    givenBody: /new WalletStorage\(Path\.Combine\(Config\.spixiUserFolder, Config\.walletFile\)\)/.test(lwPass) && /walletStorage\.readWallet\(password\)/.test(lwPass),
    noPrefs: !/Preferences\./.test(lwNone + lwPass),
    restores: (LP.match(/applyRestorePrefs\(pass\);\s*Node\.loadWallet\(pass\);/g) || []).length === 2 && !/Node\.loadWallet\(\);/.test(LP),
  };
  ok(Object.values(c).every(Boolean),
    '★ S16 L8-c (#1312): Node.loadWallet() reads the password ONLY through WalletPassStore.readForColdStart (no value → false → the retry view) and opens via loadWallet(string); both restore paths open with the password verifyWallet accepted — ' + JSON.stringify(c));

  /* ── (d) clear(): the wipe + App() without a wallet file ── */
  const APP = rd('Spixi/App.xaml.cs');
  const ctor = body(APP, 'public App()');
  const noWallet = (() => { const i = ctor.indexOf('if (!wallet_found)'); return i < 0 ? '' : body(ctor.slice(i), 'if (!wallet_found)'); })();
  const d = {
    wipe: /try \{ Preferences\.Default\.Clear\(\); \} catch \(Exception ex\) \{[^}]*\}\s*WalletPassStore\.clear\(\);/.test(SP),   // the wipe stays bounded (waits)
    // ★ #46 r1 MINOR-4: the no-wallet start never waits on the secure remove
    noWallet: /^\{\s*WalletPassStore\.clear\(wait: false\);/.test(noWallet),
    shellClear: /public static void clear\(bool wait = true\)\s*\{\s*invalidatePrefetch\(\);\s*try\s*\{\s*S16PassRules\.clear\(new Store\(false, wait\)\);/.test(STORE),
    // the no-wait remove is awaited FIRST by every later secure call (explicit order, not the semaphore's queue)
    ordered: /if \(!waitRemove\)\s*\{\s*pendingClear = t;\s*return;\s*\}/.test(body(STORE, 'public void secureRemove()'))
      && /^\{\s*await pendingClear\.ConfigureAwait\(false\);\s*await gate\.WaitAsync\(\)/.test(body(STORE, 'private static async Task<SecureResult> secureGetCore()'))
      && /Task\.Run<string\?>\(async \(\) =>\s*\{\s*await pendingClear\.ConfigureAwait\(false\);\s*await gate\.WaitAsync\(\)/.test(body(STORE, 'public bool secureSet(string value, out string? failWord)')),
    clearBoth: /public static void clear\(IStore s\)\s*\{\s*s\.secureRemove\(\);\s*s\.plainRemove\(\);\s*\}/.test(RULES),
  };
  ok(Object.values(d).every(Boolean),
    '★ S16 L8-d (#1312): the wipe calls WalletPassStore.clear() next to Preferences.Default.Clear() (the secure store is its own container), and App() calls it when no wallet file exists (a stale iOS Keychain value survives an uninstall) — ' + JSON.stringify(d));

  /* ── (e) BackupPage refuses unless the stored value opens the wallet ── */
  const BP = rd('Spixi/Pages/Settings/BackupPage.xaml.cs');
  const bk = body(BP, 'public static async Task<bool> backupAccount()');
  const refuse = (() => { const i = bk.indexOf('if (string.IsNullOrEmpty(password) || !IxianHandler.getWalletStorage().isValidPassword(password))'); return i < 0 ? '' : body(bk.slice(i), 'if (string.IsNullOrEmpty(password)'); })();
  const e = {
    read: /string\? password = await Task\.Run\(\(\) => WalletPassStore\.read\(\)\);/.test(bk),
    refuse: refuse.length > 0 && /Logging\.error\("[^"+]*"\);\s*return false;\s*\}$/.test(refuse)
      && /\}\s*return true;\s*\}$/.test(bk) && (bk.match(/return false;/g) || []).length === 1,
    order: bk.indexOf('WalletPassStore.read()') < bk.indexOf('if (string.IsNullOrEmpty(password)')
      && bk.indexOf('if (string.IsNullOrEmpty(password)') < bk.indexOf('ZipFile.Open(')
      && bk.indexOf('ZipFile.Open(') < bk.indexOf('encryptWithPassword(bytes_to_encrypt, password, true)'),
    noPref: !/walletpass|PassKey/.test(BP),
  };
  /* ★ #46 r1 (R2 MAJOR-1): the shells morph "Backed up" optimistically — a refused backup must be told natively, by BOTH
     callers, with a string every language file carries. */
  const LANGS = readdirSync(join(root, 'Spixi/Resources/Raw/lang')).filter((x) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(x));
  const onBk = body(BP, 'private async void onBackupAccount()');
  const alertFn = body(BP, 'public static void alertBackupRefused(SpixiContentPage page)');
  const spBk = slice(SP, 'current_url.Equals("ixian:backupAccount", StringComparison.Ordinal)', 'current_url.Equals("ixian:backupWallet"');
  e.alertBoth = /^\{\s*if \(!await backupAccount\(\)\)\s*\{\s*alertBackupRefused\(this\);\s*\}\s*pushBackupStatus\(this\);\s*\}$/.test(onBk)
    && /runBackupThenPush\(async \(\) =>\s*\{\s*if \(!await BackupPage\.backupAccount\(\)\)\s*\{\s*BackupPage\.alertBackupRefused\(this\);\s*\}\s*\}\);/.test(spBk)
    && !/runBackupThenPush\(BackupPage\.backupAccount\)/.test(SP);
  e.alertKeys = /_SL\("settings-backup-refused-title"\) \?\? "[^"]+"/.test(alertFn) && /_SL\("settings-backup-refused-text"\) \?\? "[^"]+"/.test(alertFn)
    && /displaySpixiAlert\(/.test(alertFn);
  e.langs = LANGS.length === 14 &&   // + sq-al #1368
 LANGS.every((x) => {
    const t = readFileSync(join(root, 'Spixi/Resources/Raw/lang', x), 'utf8');
    return /^settings-backup-refused-title = \S.*$/m.test(t) && /^settings-backup-refused-text = \S.{20,}$/m.test(t);
  });
  ok(Object.values(e).every(Boolean),
    '★ S16 L8-e (#1312): BackupPage.backupAccount reads the password through WalletPassStore.read (off the UI thread) and REFUSES — fixed-word log, return — when it is null/empty or does not open the wallet, BEFORE the zip is built (no unencrypted archive, never encrypted with ""), returns false, and BOTH callers (BackupPage.onBackupAccount, SettingsPage ixian:backupAccount) show the native "Backup not made" alert (settings-backup-refused-* in all 14 lang files) — ' + JSON.stringify(e));

  /* ── (f) SecureStorage: only in the store, only inside Task.Run, every wait bounded ── */
  const ssFiles = CS.filter(({ t }) => /\bSecureStorage\./.test(t)).map(({ f }) => f);
  const runSpans = [];
  for (const m of STORE.matchAll(/Task\.Run(?:<[^>()]*>)?\(/g)) {   // Task.Run( and Task.Run<string?>(
    const o = m.index + m[0].length - 1;
    let dd = 0; for (let k = o; k < STORE.length; k++) { if (STORE[k] === '(') dd++; else if (STORE[k] === ')' && --dd === 0) { runSpans.push([o, k]); break; } }
  }
  const inRun = (i) => runSpans.some(([o, cl]) => i > o && i < cl);
  const coreBody = body(STORE, 'private static async Task<SecureResult> secureGetCore()');
  const coreAt = STORE.indexOf('private static async Task<SecureResult> secureGetCore()');
  const coreOpen = STORE.indexOf('{', coreAt);
  const inCore = (i) => coreAt >= 0 && i > coreOpen && i < coreOpen + coreBody.length;
  const calls = [...STORE.matchAll(/SecureStorage\.Default\.(GetAsync|SetAsync|Remove|RemoveAll)\(/g)].map((m) => ({ k: m[1], i: m.index, ok: inRun(m.index) || inCore(m.index) }));
  const coreRefs = [...STORE.matchAll(/secureGetCore\(\)/g)].map((m) => m.index).filter((i) => i !== STORE.indexOf('secureGetCore()', coreAt));
  const f = {
    onlyStore: ssFiles.length === 1 && ssFiles[0] === STORE_F,
    calls: calls.length >= 3 && calls.every((x) => x.ok) && calls.some((x) => x.k === 'GetAsync') && calls.some((x) => x.k === 'SetAsync') && calls.some((x) => x.k === 'Remove'),
    coreOnlyViaRun: coreRefs.length >= 2 && coreRefs.every((i) => inRun(i) && /Task\.Run\(\(\) => secureGetCore\(\)\)/.test(STORE.slice(i - 25, i + 16))),
    bounded: !/\.Wait\(\)/.test(STORE) && !/GetAwaiter\(\)/.test(STORE) && (STORE.match(/\.Wait\(/g) || []).length === 3
      && /t\.Wait\(ms\)/.test(STORE) && /t\.Wait\(S16PassRules\.SetMs\)/.test(STORE) && /t\.Wait\(S16PassRules\.RemoveMs\)/.test(STORE),
    noAwaitOnCaller: (STORE.match(/await SecureStorage\.Default\.[A-Za-z]+\([^;]*\)\.ConfigureAwait\(false\);/g) || []).length === (STORE.match(/await SecureStorage\./g) || []).length,
    // ★ R4 L8-d / R2 MINOR-1: the bound is CHOSEN by one rule — the cold bound only for the prefetch task taken
    boundChoice: /lock \(prefetchLock\)\s*\{\s*t = prefetchTask;\s*prefetchTask = null;\s*\}\s*\}\s*int ms = S16PassRules\.readBoundMs\(t != null\);\s*if \(t == null\)\s*\{\s*t = Task\.Run\(\(\) => secureGetCore\(\)\);\s*\}\s*return waitGet\(t, ms, out value\);/.test(body(STORE, 'public S16PassRules.Read secureGet(out string? value)'))
      && /return prefetchTaken \? ColdReadMs : ReadBackMs;/.test(RULES) && !/S16PassRules\.ColdReadMs/.test(STORE),
    bounds: /public const int ColdReadMs = 3000;/.test(RULES) && Number((RULES.match(/public const int SetMs = (\d+);/) || [])[1]) + Number((RULES.match(/public const int ReadBackMs = (\d+);/) || [])[1]) <= 3000,
  };
  ok(Object.values(f).every(Boolean),
    '★ S16 L8-f (#1312): every SecureStorage call lives in WalletPassStore, inside a Task.Run (MAUI 10.0.71 Windows awaits DPAPI on the caller\'s SynchronizationContext — a UI-thread block on it could deadlock), awaited with ConfigureAwait(false), and every wait is bounded (cold read 3000 ms; set + read back ≤ 3000 ms) — ' + JSON.stringify({ ...f, calls: calls.map((x) => x.k + ':' + x.ok) }));

  /* ── (g) App(): logger → SpixiFlags.init → prefetch → new Node() ── */
  const at = (s) => ctor.indexOf(s);
  const g = {
    order: at('Logging.start(') > 0 && at('Logging.start(') < at('SpixiFlags.init();') && at('SpixiFlags.init();') < at('WalletPassStore.prefetch(')
      && at('WalletPassStore.prefetch(') < at('_ = new Node();') && at('_ = new Node();') < at('Node.checkForExistingWallet()'),
    once: (ctor.match(/SpixiFlags\.init\(\);/g) || []).length === 1 && (APP.match(/SpixiFlags\.init\(\);/g) || []).length === 1
      && (APP.match(/WalletPassStore\.prefetch\(/g) || []).length === 1
      // ★ #46 r1 MINOR-4: only with a wallet file — the same path Node.checkForExistingWallet tests
      && /WalletPassStore\.prefetch\(File\.Exists\(Path\.Combine\(Config\.spixiUserFolder, Config\.walletFile\)\)\);/.test(ctor),
    firstStart: (() => { const i = ctor.indexOf('if (Node.Instance == null)'); return i >= 0 && i < at('SpixiFlags.init();') && at('SpixiFlags.init();') < body(ctor.slice(i), 'if (Node.Instance == null)').length + i; })(),
    prefetchGated: /if \(!SpixiFlags\.SecureWalletPass \|\| !walletPresent \|\| Preferences\.Default\.ContainsKey\(Key\)\)\s*\{\s*return;\s*\}/.test(body(STORE, 'public static void prefetch(bool walletPresent)')),
  };
  ok(Object.values(g).every(Boolean),
    '★ S16 L8-g (#1312): App() reads the flags ONCE right after the logger, then starts the L8 secure read (flag on, nothing to migrate), both BEFORE `new Node()` and the wallet load that waits for it — ' + JSON.stringify(g));

  /* ── (h) iOS / Mac: ThisDeviceOnly, inside the platform guard ── */
  const setFn = body(STORE, 'public bool secureSet(string value, out string? failWord)');
  const ifAt = setFn.indexOf('#if IOS || MACCATALYST'), elAt = setFn.indexOf('#else', ifAt), enAt = setFn.indexOf('#endif', elAt);
  const iosLeg = ifAt >= 0 && elAt > ifAt ? setFn.slice(ifAt, elAt) : '';
  const elseLeg = elAt >= 0 && enAt > elAt ? setFn.slice(elAt, enAt) : '';
  const hh = {
    guard: iosLeg.length > 0 && elseLeg.length > 0,
    thisDevice: /await SecureStorage\.Default\.SetAsync\(Key, value, global::Security\.SecAccessible\.AfterFirstUnlockThisDeviceOnly\)/.test(iosLeg),
    plainElse: /await SecureStorage\.Default\.SetAsync\(Key, value\)\.ConfigureAwait\(false\);/.test(elseLeg) && !/SecAccessible/.test(elseLeg),
    noOther: (STORE.match(/SecAccessible\.[A-Za-z]+/g) || []).every((x) => x === 'SecAccessible.AfterFirstUnlockThisDeviceOnly'),
    twoLegs: (STORE.match(/SecureStorage\.Default\.SetAsync\(/g) || []).length === 2,
  };
  ok(Object.values(hh).every(Boolean),
    '★ S16 L8-h (#1312): on iOS / Mac the secure write uses SecAccessible.AfterFirstUnlockThisDeviceOnly (never restored to another device from an iCloud / encrypted backup), under `#if IOS || MACCATALYST`; the other platforms the plain SetAsync — ' + JSON.stringify(hh));

  /* ── (i) SpixiFlags ── */
  const FL = rd('Spixi/Utils/SpixiFlags.cs');
  const init = body(FL, 'public static void init()');
  const i9 = {
    keys: /public const string SecureWalletPassKey = "flagSecureWalletPass";/.test(FL) && /public const string MediaInputGateKey = "flagMediaInputGate";/.test(FL),
    defaults: /public static bool SecureWalletPass \{ get; private set; \} = true;/.test(FL) && /public static bool MediaInputGate \{ get; private set; \} = true;/.test(FL),
    reads: /Preferences\.Default\.Get\("devMode", false\)/.test(init) && /Preferences\.Default\.Get\(SecureWalletPassKey, 1\)/.test(init) && /Preferences\.Default\.Get\(MediaInputGateKey, 1\)/.test(init),
    rule: /SecureWalletPass = S16PassRules\.effectiveFlag\(dev, sp\);/.test(init) && /MediaInputGate = S16PassRules\.effectiveFlag\(dev, mg\);/.test(init)
      && /return !\(devMode && stored == 0\);/.test(RULES),
    /* ★ S17 A / F re-base: one [FLAGS] line per flag family — S16's two flags, then S17Bridge, then S17Moments (each a fixed line)
       ★ DT-1 B re-base (#1386): + the Windows-only title bar way line, under #if WINDOWS (pins-dt1/b-titlebar.mjs)
       ★ re-based by S20 S (#1395 · #1376): the title bar line is GONE with the way switch; + the S20 file-size line
       ★ S20G re-base: + the S20G line (pins-s20g/h-csharp) */
    oneLine: (init.match(/Logging\.info\(/g) || []).length === 5 && /Logging\.info\(S16PassRules\.flagsLine\(SecureWalletPass, MediaInputGate\)\);/.test(init)
      && /Logging\.info\(S17Rules\.flagLine\(S17Bridge\)\);/.test(init) && /Logging\.info\(S17MomentRules\.flagLine\(S17Moments\)\);/.test(init)
      && /Logging\.info\(S11MediaRules\.fileSizeFlagLine\(S20FileSize\)\);/.test(init) && /Logging\.info\(S20GRules\.flagLine\(S20G\)\);/.test(init) && !/DtTitleBar/.test(init),
  };
  /* ★ #46 r1 (R2 NIT-2): leaving dev mode drops both switches, so a later dev-mode-on cannot revive a stored 0 */
  const HPd = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const offAt = HPd.indexOf('current_url.StartsWith("ixian:disableDevMode", StringComparison.Ordinal)');
  const offB = offAt < 0 ? '' : body(HPd.slice(offAt), 'current_url.StartsWith("ixian:disableDevMode"');
  i9.devOffDrops = /Preferences\.Default\.Set\("devMode", false\);\s*Preferences\.Default\.Remove\(SpixiFlags\.SecureWalletPassKey\);\s*Preferences\.Default\.Remove\(SpixiFlags\.MediaInputGateKey\);/.test(offB);
  ok(Object.values(i9).every(Boolean),
    '★ S16 FLAGS-i (#1312): SpixiFlags — the contract keys (absent = 1), both default ON, a stored 0 acts only with dev mode on (S16PassRules.effectiveFlag, executed in S16PassTests), one [FLAGS] line; ixian:disableDevMode removes both switch prefs — ' + JSON.stringify(i9));

  /* ── (j) the dev toggles ── */
  const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const verbAt = DP.indexOf('current_url.StartsWith("ixian:devflash:securepass:", StringComparison.Ordinal)');
  const verbB = verbAt < 0 ? '' : body(DP.slice(verbAt), 'current_url.StartsWith("ixian:devflash:securepass:"');
  const pushB = body(DP, 'private void pushFlagsDev()');
  const j = {
    before: verbAt > 0 && verbAt < DP.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)')
      && DP.indexOf('"ixian:devflash:mediagate:", StringComparison.Ordinal)') > verbAt,
    grammar: /if \(Preferences\.Default\.Get\("devMode", false\)\s*&& S16PassRules\.parseFlagTail\(current_url\.Substring\(prefix\.Length\), out int value\)\)\s*\{\s*Preferences\.Default\.Set\(secure \? SpixiFlags\.SecureWalletPassKey : SpixiFlags\.MediaInputGateKey, value\);\s*\}/.test(verbB)
      && /pushFlagsDev\(\);\s*\}$/.test(verbB),
    push: /Utils\.sendUiCommand\(this, "window\.setFlagsDev", \(sp == 0 \? "0" : "1"\) \+ "," \+ \(mg == 0 \? "0" : "1"\)(?: \+ "," \+ \(sb == 0 \? "0" : "1"\))?(?: \+ "," \+ \(sm == 0 \? "0" : "1"\))?\);/.test(pushB)   // ★ S17 A / F re-base: + the S17 digits
      && /Preferences\.Default\.Get\(SpixiFlags\.SecureWalletPassKey, 1\)/.test(pushB),
    seeded: /pushContainerDev\(\);[^\n]*\n\s*pushFlagsDev\(\);/.test(DP),
  };
  const { boot } = b2Kit(h);
  let s = null;
  const close = () => { try { s && s.dom.window.close(); } catch (er) {} s = null; };
  try {
    s = await boot('dev.html');
    await sleep(100);
    const sws = () => [...s.d.querySelectorAll('.c-dev-flags [role="switch"]')];
    j.hiddenFirst = !s.d.querySelector('.c-dev-flags');
    s.push('setFlagsDev', '1,1');
    await sleep(60);
    j.two = sws().length === 2 && sws().every((x) => x.getAttribute('aria-checked') === 'true')
      && sws().map((x) => x.dataset.flag).join() === 'securepass,mediagate';
    j.restart = /restart/i.test((s.d.querySelector('.c-dev-flags .c-settings__note') || {}).textContent || '');
    const b0 = s.sent.length;
    sws()[0].click();
    await sleep(40);
    j.tap = JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:devflash:securepass:0']) && sws()[0].getAttribute('aria-checked') === 'false';
    sws()[1].click();
    await sleep(40);
    j.tapGate = s.sent[s.sent.length - 1] === 'ixian:devflash:mediagate:0';
    s.push('setFlagsDev', '1,0');
    await sleep(40);
    j.echo = sws().map((x) => x.getAttribute('aria-checked')).join() === 'true,false';
    s.push('setFlagsDev', '1');
    s.push('setFlagsDev', '1,2');
    s.push('setFlagsDev', '0,0,0,0,0');   // ★ S17 re-base: 3 and 4 digits are valid now (the S17 flags) — 5 is not
    await sleep(40);
    j.malformed = sws().map((x) => x.getAttribute('aria-checked')).join() === 'true,false';
    j.flashUntouched = !s.d.querySelector('.c-dev-flash');
    j.noErr = s.errs.filter((x) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(x)).length === 0;
  } catch (er) { j.err = er.message; }
  finally { close(); }
  ok(Object.values(j).every((x) => x === true),
    '★ S16 FLAGS-j (#1312): the dev toggles — DevPage stores `ixian:devflash:<securepass|mediagate>:<0|1>` only through the exact grammar and in dev mode (branch before the flash catch-all), echoes and seeds the STORED values; the BUILT dev.html shows the card only after the push, two switches, a tap sends the verb optimistically, the echo sets them, malformed pushes are ignored, and the card says a change acts after a restart — ' + JSON.stringify(j));
}
