/* ==== fixb4 · B — the two page defaults of a NEW account (Damir's ruling 1750; items 3 + 4; contract docs/contract-fixb4.md § 3):
 * P1 "Load pictures and GIFs" starts Off (`spixi.media.autoload = 'off'`), and A9 "List density" starts Compact on the DESKTOP only
 * (`spixi.chat.listdensity = 'compact'`). Written when an account is created or restored, never by an update; one switch per
 * default (SpixiFlags.DefaultMediaTapToLoad / DefaultListCompact), the old path = the fallback (no push).
 *
 * LIMITS — read first (#1735 / #1627: the limits of a source pin are stated, not hidden).
 *   · Key (a) is BEHAVIOUR: the BUILT intro.html (src/shells/launch.html → Spixi/Resources/Raw/html/intro.html, build-shells.mjs) in
 *     jsdom; the push text is the EXACT text C# sends (UiCommandText.build — scripts/csh/PageDefaultsTests.cs asserts the same three
 *     strings from the real C#), wrapped the way SpixiContentPage.evaluateJavascript wraps it, and evaluated in the page. jsdom gives
 *     a file:// page an opaque origin with no localStorage, so a Map-backed Storage stands in on the window (the S15 O-04 pin's way):
 *     the real WebView store (WebView2 / WKWebView / Android WebView, ONE store shared by every shell) is NOT exercised — that every
 *     shell reads the value the launch shell wrote is the walk's row, and the readers are unchanged (chat.html mediaAutoloadOn,
 *     settings.html mediaAutoloadPref / readChatPrefs, home.html's head ladder).
 *   · Keys (b)–(e) are SOURCE pins over C# the cloud cannot compile (LaunchPage.xaml.cs is MAUI-bound: ⚠ C# UNCOMPILED there). They
 *     read the TEXT with comments masked (the defaultsb mask). They do NOT catch: deliberately hidden code (a `#define` / `#if` trick,
 *     a `using X = …;` alias, a type that shadows PageDefaultsRules / SpixiFlags / Utils, a second partial of LaunchPage, reflection by
 *     a name built from pieces, a csproj `Compile Remove`, a `\u` escape in an identifier, a raw string literal); a call reached by a
 *     delegate or an event; what a device does (that the push is evaluated before the page goes, that Home reads the key) — the
 *     walk proves those; the thread a site runs on (read by hand: the builder's report); Ixian-Core and the platform SDK.
 *   · The platform test (desktop = WinUI or MacCatalyst) is pinned equal to HomePage.isDesktopPlatform's body, not executed.
 * Keys:
 *   a1 push           — '1','1' writes exactly the two keys with exactly 'off' / 'compact'; '1','0' and '0','1' write one; '0','0',
 *                       'true','x', no argument and null arguments write nothing; other spixi.* keys and a non-spixi key are
 *                       untouched; no ixian: verb is sent; nothing is logged; no page error
 *   b1 sites          — LaunchPage: pushNewAccountPageDefaults is declared ONCE and called THREE times, each its own statement
 *                       directly after its anchor: `DefaultsRules.writeNewAccount(…);` in the create body (before
 *                       `Remove("walletpass")`), `applyRestorePrefs(pass);` in restoreAccountFile and in restoreWalletFile (each
 *                       before `Node.loadWallet(pass);`); every call BEFORE the navigation that follows it (the create body's
 *                       MainThread.BeginInvokeOnMainThread, goHome()); outside every `#if`
 *   b2 nowhere-else   — proceed, onLoad, onNavigating, applyRestorePrefs hold no call; across every C# file of Spixi/ the names
 *                       PageDefaultsRules.newAccountArgs / .logLine / .PushName and SpixiFlags.DefaultMediaTapToLoad /
 *                       .DefaultListCompact are used ONLY in the helper (and declared in their own files); the string
 *                       "setNewAccountDefaults" is in PageDefaultsRules.cs only
 *   b3 helper         — the helper's body is the expected text (whitespace collapsed, comments masked): the platform test, the
 *                       args from the two switches, ONE Logging.info(logLine(args)), the push only when args != null, a catch that
 *                       logs the exception TYPE only
 *   b4 desktop        — the platform test equals HomePage.isDesktopPlatform's expression (WinUI || MacCatalyst)
 *   b5 mirror         — ★ review round 1 (reader S MINOR-1): `SAutoDownload.loadPictures = …` is written in Spixi/**.cs only by
 *                       SettingsPage (the existing `ixian:photoAutoDl:` verb) and by the helper — there ONCE, `= false`, inside
 *                       `if (args != null)` and inside `if (PageDefaultsRules.mirrorLoadPicturesOff(args))`; the string
 *                       `photoAutoDlLoadPictures` is in SAutoDownload.cs only (code, comments masked). LIMIT: a source pin — a write through another name
 *                       (an alias, reflection, Preferences.Default.Set with a key built from pieces) is not seen; the RULE's
 *                       truth table runs in PageDefaultsTests.mirror_load_pictures_off; that the auto-download then stays off
 *                       is the walk's row (SAutoDownload / SingleChatPage are not compiled in the harness)
 *   c1 rules          — PageDefaultsRules.cs has no using, no Preferences, no sendUiCommand, no `ixian:`, no `[` attribute, no
 *                       thread / timer / clock word; its PushName is "setNewAccountDefaults"
 *   d1 flags          — SpixiFlags: `readFixb4();` is called ONCE, directly after `readPhoto1b();` in init, outside every `#if`; the
 *                       two keys are read only inside readFixb4 (absent = 1) and nothing writes them
 *   e1 shell          — src/shells/launch.html holds the handler ONCE with the expected text; it is the only setItem of the file;
 *                       the header comment's Pushes list names it
 * Deliberate breaks (#802; the fixb4 defaults builder, each ONE mutation in a full scratch copy of the tree, run with
 * `node scripts/run-pins.mjs` there, then restored; the red keys in brackets): the BUILT intro.html `density === '1'` →
 * `density !== '0'` [a1 only]; the account-zip call moved below `Node.loadWallet(pass);` [b1, + pins-defaultsb d2]; a NEW
 * Spixi/Utils file that reads SpixiFlags.DefaultListCompact [b2 only]; the helper's catch `ex.GetType().Name` → `ex.Message`
 * [b3, + pins-defaultsb d2]; HomePage.isDesktopPlatform `MacCatalyst` → `iOS` [b4 only]; `using System;` in PageDefaultsRules.cs
 * [c1 only]; `readFixb4();` moved above `readPhoto1b();` [d1, + pins-defaultsb d11]; the src handler `'compact'` → `'dense'`
 * without a rebuild [e1 only].
 * ★ review round 1 breaks (b5, the same method): a NEW Spixi/Utils file that writes `SAutoDownload.loadPictures = false;` [b5 only];
 * a NEW file holding the string "photoAutoDlLoadPictures" [b5 only]; the helper's mirror write `= false` → `= true` [b5 + b3]; the
 * helper's rule guard → `if (true)` [b5 + b3 + b2] (b3 holds the whole helper text, so every helper edit is also red there). */
import { mask } from '../pins-defaultsb/a-defaults.mjs';
import { b2Kit } from '../pins-s9/b2-kit.mjs';

export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, sleep } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = (t, name) => (t.match(new RegExp('(?<![A-Za-z0-9_])' + esc(name) + '(?![A-Za-z0-9_])', 'g')) || []).length;
  /* the brace-matched block after `sig`, found on the string-blanked mask, returned from the comment mask */
  const span = (code, bare, sig, from = 0) => {
    const at = bare.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
    const o = bare.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < bare.length; k++) { if (bare[k] === '{') d++; else if (bare[k] === '}' && --d === 0) return { at, open: o, end: k + 1, text: code.slice(o, k + 1) }; }
    return { at, end: -1, text: '' };
  };
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim()); else if (m[1] === 'endif') st.pop(); else { st.pop(); st.push('#' + m[1]); }
    }
    return st;
  };

  /* ── a1 · the push, EXECUTED on the BUILT launch shell ── */
  const TEXT = {   // UiCommandText.build(PushName, a, b) — the same three strings PageDefaultsTests.push_text_is_the_pinned_text asserts
    '1,1': "executeUiCommand(setNewAccountDefaults,'MQ==','MQ==');",
    '1,0': "executeUiCommand(setNewAccountDefaults,'MQ==','MA==');",
    '0,1': "executeUiCommand(setNewAccountDefaults,'MA==','MQ==');",
  };
  const a1 = {};
  let s = null;
  try {
    const kit = b2Kit(h);
    s = await kit.boot('intro.html');
    const W = s.dom.window;
    const m = new Map();
    const fake = { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: (k) => { m.delete(k); }, clear: () => m.clear() };
    Object.defineProperty(W, 'localStorage', { configurable: true, get: () => fake });
    const logs = [];
    for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const o = W.console[k]; W.console[k] = (...x) => { logs.push(k + ':' + x.join(' ')); if (o) try { o.apply(W.console, x); } catch (_) {} }; }
    const BEFORE = [['spixi.chat.theme', 'dark'], ['spixi.draft.abc', 'x'], ['other.key', 'keep']];
    const run = async (doPush) => {
      m.clear(); for (const [k, v] of BEFORE) m.set(k, v);
      const sent0 = s.sent.length, log0 = logs.length;
      doPush();
      await sleep(60);
      const after = Object.fromEntries([...m.entries()].filter(([k]) => !BEFORE.some(([b]) => b === k)));
      const kept = BEFORE.every(([k, v]) => m.get(k) === v) && m.size === BEFORE.length + Object.keys(after).length;
      return JSON.stringify({ after, kept, verbs: s.sent.length - sent0, logs: logs.length - log0 });
    };
    const wrapped = (t) => () => W.eval('try{ ' + t + ' }catch(e){  }');   // SpixiContentPage.evaluateJavascript's own wrapping
    const viaKit = (...a) => () => s.push('setNewAccountDefaults', ...a);   // b2Kit: base64 per argument, null stays null
    const want = (after) => JSON.stringify({ after, kept: true, verbs: 0, logs: 0 });
    a1.both = (await run(wrapped(TEXT['1,1']))) === want({ 'spixi.media.autoload': 'off', 'spixi.chat.listdensity': 'compact' });
    a1.media = (await run(wrapped(TEXT['1,0']))) === want({ 'spixi.media.autoload': 'off' });
    a1.density = (await run(wrapped(TEXT['0,1']))) === want({ 'spixi.chat.listdensity': 'compact' });
    a1.zeros = (await run(viaKit('0', '0'))) === want({});
    a1.words = (await run(viaKit('true', 'x'))) === want({});
    a1.ones = (await run(viaKit(' 1', '1 '))) === want({});
    a1.none = (await run(() => W.executeUiCommand(W.setNewAccountDefaults))) === want({});
    a1.nulls = (await run(viaKit(null, null))) === want({});
    a1.noErr = s.errs.length === 0;
    if (!Object.values(a1).every(Boolean)) a1.sample = await run(wrapped(TEXT['1,1']));
  } catch (e) { a1.threw = e.message; } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
  ok(Object.keys(a1).length >= 9 && Object.values(a1).every((v) => v === true),
    '★ fixb4 a1 (#1750): the BUILT launch shell\'s setNewAccountDefaults, through the exact text C# sends — \'1\',\'1\' writes exactly spixi.media.autoload = off and spixi.chat.listdensity = compact; \'1\',\'0\' / \'0\',\'1\' write one; \'0\',\'0\', \'true\',\'x\', \' 1\',\'1 \', no argument and nulls write nothing; other keys untouched; no ixian: verb; nothing logged — ' + JSON.stringify(a1));

  /* ── b · LaunchPage.xaml.cs (source; ⚠ C# UNCOMPILED) ── */
  const LP_RAW = raw('Spixi/Pages/Launch/LaunchPage.xaml.cs');
  const LP = mask(LP_RAW), LPB = mask(LP_RAW, true);
  const NAME = 'pushNewAccountPageDefaults';
  const CALL = NAME + '();';
  const create = span(LP, LPB, 'if (Node.generateWallet(pass))');
  const zip = span(LP, LPB, 'private RestoreOutcome restoreAccountFile(string source_path, string pass)');
  const file = span(LP, LPB, 'private bool restoreWalletFile(string source_path, string pass)');
  const helper = span(LP, LPB, 'private void ' + NAME + '()');
  const after = (body, anchorRe, nextRe) => new RegExp(anchorRe + '[^\\S\\n]*\\n[^\\S\\n]*' + esc(CALL) + '[^\\S\\n]*\\n\\s*' + nextRe).test(body);
  const callsIn = (b) => words(b.text, NAME);
  const outsideIf = [...LP.matchAll(new RegExp(esc(CALL), 'g'))].every((x) => regionsAt(LP, x.index).length === 0);
  const b1 = {
    found: create.end > 0 && zip.end > 0 && file.end > 0 && helper.end > 0,
    declaredOnce: (LP.match(new RegExp('private void ' + NAME + '\\(\\)', 'g')) || []).length === 1,
    threeCalls: words(LP, NAME) === 4 && (LP.match(new RegExp(esc(CALL), 'g')) || []).length === 3,
    perSite: callsIn(create) === 1 && callsIn(zip) === 1 && callsIn(file) === 1,
    createAnchor: after(create.text, esc('DefaultsRules.writeNewAccount(SpixiFlags.DefaultAppLockOn, SpixiFlags.DefaultPayConfirmOn, SPayments.paymentAuthSupported(), SPayments.PAYMENT_AUTH_PREF);'), esc('Preferences.Default.Remove("walletpass");')),
    zipAnchor: after(zip.text, esc('applyRestorePrefs(pass);'), esc('Node.loadWallet(pass);')),
    fileAnchor: after(file.text, esc('applyRestorePrefs(pass);'), esc('Node.loadWallet(pass);')),
    createBeforeNav: create.text.indexOf(CALL) >= 0 && create.text.indexOf(CALL) < create.text.indexOf('MainThread.BeginInvokeOnMainThread('),
    zipBeforeHome: zip.text.indexOf(CALL) >= 0 && zip.text.indexOf(CALL) < zip.text.indexOf('goHome();'),
    fileBeforeHome: file.text.indexOf(CALL) >= 0 && file.text.indexOf(CALL) < file.text.indexOf('goHome();'),
    outsideIf,
  };
  ok(Object.values(b1).every(Boolean),
    '★ fixb4 b1 (#1750): LaunchPage sends the page defaults from the THREE new-account sites only — one call each, directly after DefaultsRules.writeNewAccount in the create body and after applyRestorePrefs(pass) in both restore paths, each before the navigation to Home, outside every #if — ' + JSON.stringify(b1));

  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const uses = {};
  const NAMES = ['PageDefaultsRules.newAccountArgs', 'PageDefaultsRules.logLine', 'PageDefaultsRules.PushName', 'PageDefaultsRules.mirrorLoadPicturesOff', 'SpixiFlags.DefaultMediaTapToLoad', 'SpixiFlags.DefaultListCompact', 'readFixb4', NAME];
  for (const f of csFiles) {
    const c = mask(raw(f));
    for (const n of NAMES) { const k = words(c, n); if (k) uses[n + '@' + f.split('/').pop()] = k; }
    if (raw(f).includes('setNewAccountDefaults')) uses['"setNewAccountDefaults"@' + f.split('/').pop()] = 1;
  }
  const WANT_USES = {
    'PageDefaultsRules.newAccountArgs@LaunchPage.xaml.cs': 1, 'PageDefaultsRules.logLine@LaunchPage.xaml.cs': 1,
    'PageDefaultsRules.PushName@LaunchPage.xaml.cs': 1, 'SpixiFlags.DefaultMediaTapToLoad@LaunchPage.xaml.cs': 1,
    'SpixiFlags.DefaultListCompact@LaunchPage.xaml.cs': 1, 'readFixb4@SpixiFlags.cs': 2, [NAME + '@LaunchPage.xaml.cs']: 4,
    '"setNewAccountDefaults"@PageDefaultsRules.cs': 1, 'PageDefaultsRules.mirrorLoadPicturesOff@LaunchPage.xaml.cs': 1,
  };
  const sorted = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
  const noneIn = ['private void proceed(string pass)', 'private void onLoad()', 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'private static void applyRestorePrefs(string pass)']
    .map((sig) => span(LP, LPB, sig)).map((b) => b.end > 0 && words(b.text, NAME) === 0 && !/PageDefaultsRules|setNewAccountDefaults/.test(b.text));
  const helperHasFlags = words(helper.text, 'SpixiFlags.DefaultMediaTapToLoad') === 1 && words(helper.text, 'SpixiFlags.DefaultListCompact') === 1 && words(helper.text, 'PageDefaultsRules.newAccountArgs') === 1;
  const b2 = { noneInOthers: noneIn.every(Boolean), table: sorted(uses) === sorted(WANT_USES), helperHasFlags };
  if (!b2.table) b2.got = uses;
  ok(b2.noneInOthers && b2.table && b2.helperHasFlags,
    '★ fixb4 b2 (#1750): nothing else sends or reads the page defaults — proceed, onLoad, onNavigating and applyRestorePrefs hold no call; across Spixi/**/*.cs the rules, the two switches and the push name are used only in the helper (no start, update or migration path) — ' + JSON.stringify(b2));

  const HELPER_WANT = '{ try { bool desktop = Microsoft.Maui.Devices.DeviceInfo.Platform == Microsoft.Maui.Devices.DevicePlatform.WinUI || Microsoft.Maui.Devices.DeviceInfo.Platform == Microsoft.Maui.Devices.DevicePlatform.MacCatalyst; string[]? args = PageDefaultsRules.newAccountArgs(SpixiFlags.DefaultMediaTapToLoad, SpixiFlags.DefaultListCompact, desktop); Logging.info(PageDefaultsRules.logLine(args)); if (args != null) { Utils.sendUiCommand(this, PageDefaultsRules.PushName, args[0], args[1]); if (PageDefaultsRules.mirrorLoadPicturesOff(args)) { SAutoDownload.loadPictures = false; } } } catch (Exception ex) { Logging.warn("[DEFAULTS] new account page failed (" + ex.GetType().Name + ")"); } }';
  const b3 = { body: norm(helper.text) === HELPER_WANT };
  if (!b3.body) b3.got = norm(helper.text).slice(0, 600);
  ok(b3.body,
    '★ fixb4 b3 (#1750): the helper is the contract text — the platform test, the args from the two switches, ONE [DEFAULTS] line, the push only when there is something to write, a catch that logs the exception TYPE only (the create / restore never fails by it) — ' + JSON.stringify(b3));

  const HP_RAW = raw('Spixi/Pages/Home/HomePage.xaml.cs');
  const hp = span(mask(HP_RAW), mask(HP_RAW, true), 'private static bool isDesktopPlatform()');
  const b4 = {
    home: norm(hp.text) === '{ return DeviceInfo.Platform == DevicePlatform.WinUI || DeviceInfo.Platform == DevicePlatform.MacCatalyst; }',
    same: norm(helper.text).includes('bool desktop = Microsoft.Maui.Devices.DeviceInfo.Platform == Microsoft.Maui.Devices.DevicePlatform.WinUI || Microsoft.Maui.Devices.DeviceInfo.Platform == Microsoft.Maui.Devices.DevicePlatform.MacCatalyst;'),
  };
  ok(b4.home && b4.same,
    '★ fixb4 b4 (#1750): "desktop" is the app\'s own platform test (HomePage.isDesktopPlatform: WinUI or MacCatalyst — the platforms whose shells set data-desktop); the phone and the tablet never get the density write — ' + JSON.stringify(b4));

  /* ── b5 · ★ review round 1 (reader S MINOR-1): C#'s own mirror of P1 is written Off by the helper, ONLY behind the rule ── */
  const MIRROR_W = /\bSAutoDownload\s*\.\s*loadPictures\s*=(?!=)/g;
  const writers = {}, keyStr = {};
  for (const f of csFiles) {
    const c = mask(raw(f)), short = f.split('/').pop();
    const k = (c.match(MIRROR_W) || []).length; if (k) writers[short] = k;
    const s2 = (c.match(/photoAutoDlLoadPictures/g) || []).length; if (s2) keyStr[short] = s2;   // comments masked, strings kept
  }
  const hN = norm(helper.text);
  const guardAt = hN.indexOf('if (args != null) {'), ruleAt = hN.indexOf('if (PageDefaultsRules.mirrorLoadPicturesOff(args)) { SAutoDownload.loadPictures = false; }');
  const b5 = {
    writers: sorted(writers) === sorted({ 'LaunchPage.xaml.cs': 1, 'SettingsPage.xaml.cs': 1 }),
    keyOnlyInStore: sorted(keyStr) === sorted({ 'SAutoDownload.cs': 1 }),
    inHelper: (helper.text.match(MIRROR_W) || []).length === 1,
    guarded: guardAt > 0 && ruleAt > guardAt && (hN.match(/SAutoDownload\.loadPictures = false;/g) || []).length === 1,
    fixedValue: !/SAutoDownload\s*\.\s*loadPictures\s*=(?!=)\s*(?!\s|false;)/.test(mask(LP_RAW)),
  };
  if (!b5.writers || !b5.keyOnlyInStore) Object.assign(b5, { gotWriters: writers, gotKey: keyStr });
  ok(b5.writers && b5.keyOnlyInStore && b5.inHelper && b5.guarded && b5.fixedValue,
    '★ fixb4 b5 (r1, reader S MINOR-1): the C# mirror of "Load pictures and GIFs" (SAutoDownload.loadPictures) is written by the Settings verb (existing) and by the fixb4 helper ONLY — there once, the fixed value false, inside `if (args != null)` and behind PageDefaultsRules.mirrorLoadPicturesOff(args) (the rule runs in PageDefaultsTests); the key string lives only in SAutoDownload.cs — ' + JSON.stringify(b5));

  /* ── c1 · PageDefaultsRules.cs ── */
  const R_RAW = raw('Spixi/Utils/PageDefaultsRules.cs');
  const R = mask(R_RAW), RB = mask(R_RAW, true);
  const c1 = {
    noUsing: !/^\s*using\s/m.test(R),
    noBridge: !/Preferences|sendUiCommand|sendMessage|ixian:|Logging|SecureStorage|WalletPassStore/.test(R),
    noAttr: !/\[/.test(RB.replace(/string\[\]\??|new string\[\]|args!?\[[01]\]/g, '')),
    noClock: !/\b(Thread|Task|Timer|DateTime|Clock|Delay|async|await)\b/.test(R),
    name: /public const string PushName = "setNewAccountDefaults";/.test(R),
  };
  ok(Object.values(c1).every(Boolean),
    '★ fixb4 c1 (#1750): PageDefaultsRules.cs is pure — no using, no storage, no bridge, no log call, no attribute, no clock or thread; the push name is the contract\'s — ' + JSON.stringify(c1));

  /* ── d1 · SpixiFlags.cs ── */
  const F_RAW = raw('Spixi/Utils/SpixiFlags.cs');
  const F = mask(F_RAW), FB = mask(F_RAW, true);
  const init = span(F, FB, 'public static void init()');
  const rd = span(F, FB, 'private static void readFixb4()');
  const tail = /readPhoto1b\(\);\s*readFixb4\(\);\s*\}$/.test(init.text.trim());
  const keyUse = (k) => words(F, k) === 2 && words(rd.text, k) === 1 && new RegExp('Preferences\\.Default\\.Get\\(' + k + ', 1\\)').test(rd.text);
  const d1 = {
    tail,
    once: (F.match(/readFixb4\(\);/g) || []).length === 1,
    outsideIf: regionsAt(F, F.indexOf('readFixb4();')).length === 0,
    keys: /public const string DefaultMediaTapKey = "flagDefaultMediaTap";/.test(F) && /public const string DefaultListCompactKey = "flagDefaultListCompact";/.test(F)
      && keyUse('DefaultMediaTapKey') && keyUse('DefaultListCompactKey'),
    noWrite: !/Set\(DefaultMediaTapKey|Set\(DefaultListCompactKey|"flagDefaultMediaTap"\s*,|"flagDefaultListCompact"\s*,/.test(F),
    startFalse: /public static bool DefaultMediaTapToLoad \{ get; private set; \} = false;/.test(F) && /public static bool DefaultListCompact \{ get; private set; \} = false;/.test(F),
  };
  ok(Object.values(d1).every(Boolean),
    '★ fixb4 d1 (#1750): SpixiFlags reads the two switches once — readFixb4() directly after readPhoto1b() at the end of init, outside every #if; the two keys read only there (absent = 1), never written; start value false — ' + JSON.stringify(d1));

  /* ── e1 · src/shells/launch.html ── */
  const L = raw('src/shells/launch.html');
  const H_WANT = "setNewAccountDefaults(media, density) { if (media === '1') { try { localStorage.setItem('spixi.media.autoload', 'off'); } catch (e) { /* storage unavailable */ } } if (density === '1') { try { localStorage.setItem('spixi.chat.listdensity', 'compact'); } catch (e) { /* storage unavailable */ } } },";
  const e1 = {
    handler: norm(L).split(H_WANT).length - 1 === 1,
    oneName: (L.match(/setNewAccountDefaults\(/g) || []).length === 2,   // the header comment's list + the handler
    onlySetItems: (L.match(/setItem\(/g) || []).length === 2,
    listed: /Pushes:[\s\S]{0,600}?★ fixb4 \(#1750\): setNewAccountDefaults\(media, density\)/.test(L),
  };
  ok(Object.values(e1).every(Boolean),
    '★ fixb4 e1 (#1750): src/shells/launch.html holds the one handler with the contract text (each write in its own try, nothing else), the only setItem of the shell, and its header lists the push — ' + JSON.stringify(e1));
}
