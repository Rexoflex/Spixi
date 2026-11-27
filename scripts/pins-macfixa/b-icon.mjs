/* ==== The home screen's mini-app icons: a small PNG copy that C# made, never the package's own bytes (macfixa item 2,
 * packet P122, switch MacfixaFlags.AppIconReencode; Mission Control n-20261016-miniapp-icon-reencode, DECISIONS #1480).
 * SOURCE PIN (#1735) — LIMITS: HomePage.xaml.cs and AppIconReencode.cs are MAUI-bound and UNCOMPILED here (the Windows branch
 * compiles in redesign-ci; Android / iOS / Mac compile nowhere in the cloud), so the keys hold the comment-stripped TEXT, not
 * bindings: a shadow type named AppIconReencode / AppIconRules / MacfixaFlags / PhotoRules, a `#define`, a csproj `Compile
 * Remove`, reflection, a file op reached through a helper in another file, or a second decoder behind an alias is not seen (the
 * diff review and the Windows compile hold those). What the platform decoders DO with the bytes (BitmapFactory, ImageIO, WIC)
 * is run nowhere here; the order "declared size first, then a bounded decode" is read as text. AppIconRules.cs RUNS in csh
 * (scripts/csh/AppIconTests.cs, 13 tests, beside the real MiniAppManager). b2 holds HomePage.xaml.cs by SHA-256, so ANY later
 * edit of that file re-bases it (the setCaps statement is left out of the hash: the lead's cap word of this batch lives there).
 *   b1 lines    — HomePage.loadApps holds ONE statement `icon = MacfixaFlags.AppIconReencode ? AppIconReencode.homeIcon(app.id,
 *                 icon) : Utils.imageToDataUri(icon);` (ON → the copy, OFF → the base call), right after `icon` was read from
 *                 `Node.MiniAppManager.getAppIconPath(app.id)` and right before the `addApp` push; homeIcon( is called nowhere
 *                 else in Spixi/** and the switch is read nowhere else. Two more tests of loadApps name the class: its early
 *                 return `… && !AppIconReencode.takeReady())` (before clearApps) and its chat-page reload test
 *                 `reloadChatPages(listChanged, AppIconReencode.tookReady() || appsPrePushing)` (after clearAppsDone); no
 *                 other call of the two exists. With the switch OFF homeIcon never runs, so nothing sets the signal and both
 *                 tests read as the base (b5 signal: `ready` is written in homeIcon's Task only).
 *   b2 base     — HomePage.xaml.cs with those THREE statements and the setCaps statement taken out equals the base `ae7b8303`
 *                 file with its three base statements and setCaps taken out (SHA-256, stripCode, whitespace collapsed); the
 *                 file has at most 7,323 lines (size rule R6: the edits are in place).
 *   b3 place    — the copies' folder is `Path.Combine(Config.spixiUserFolder, "html", "Apps", AppIconRules.FolderName)`: the
 *                 formula of MiniAppManager's own apps folder (its constructor + Node.cs) plus the constant "_icons", whose
 *                 first character the app-id rule refuses (SafetyRules.isSafeAppId: `!isAlnum(id[0])`) — no package installs
 *                 into it, and removeAllApps (every folder of html/Apps but Tmp) removes it with the account; the file name is
 *                 `AppIconRules.copyName(appId, size, ticks)` = hex of a SHA-256 (no text of the id, the package or a WebView).
 *   b4 file ops — every file operation of the two new files, by name and first argument, is this list and no other: the
 *                 source (`iconPath`) is only asked for (Exists, FileInfo) and read; every write goes to `copy`, to `copy +
 *                 ".tmp"` (the whole PNG, then ONE File.Move over the mark) or makes the folder; nothing is deleted; a file
 *                 under the copy's name is read only when it is within MaxCopyBytes; AppIconReencode.cs holds none.
 *   b5 thread   — homeIcon passes the literal `false` as get's mayDecode (no thread decodes inside loadApps' locks) and runs
 *                 the handed-back call in Task.Run; a copy made there writes only the class's own `ready`; takeReady moves it
 *                 to `taken`, tookReady clears that; UIHelpers / shouldRefreshApps / MainThread are named in neither file;
 *                 platformCopy is named only as get's argument; get() calls make only behind mayDecode.
 *   b6 decoders — the decoder gets only bytes that make() checked (the size before the read, PNG or JPEG by the first bytes),
 *                 after the mark was written; the steps are 192 → 144 → 120 → 96 → 72 → 48 under the 22,482-byte cap. Android:
 *                 bounds first (InJustDecodeBounds = true), AppIconRules.dimsOk before the pixel decode, the pixel decode with
 *                 InSampleSize, PNG out; iOS / Mac: GetProperties + dimsOk before CreateThumbnail (ImageIO's scaled decode),
 *                 then the thumbnail is DRAWN into a fresh sRGB CGBitmapContext and only that context's image is encoded
 *                 (AsPNG) — no colour profile of the source; Windows: the codec named by id (PNG or JPEG only), dimsOk before
 *                 GetPixelDataAsync with a BitmapTransform and DoNotColorManage, raw pixels to PngEncoderId. No ResizeImage, no
 *                 JPEG encode, no decode of a path (DecodeFile / FromUrl / GetFileFromPathAsync), no System.Drawing.
 *   b7 log      — the only log lines of the two files are `Logging.warn("App icon: no small copy")` and the same words with
 *                 `(" + e.GetType().Name + ")"`; no `.Message`, no `.ToString()`, no path or id variable in them.
 *   b8 harness  — csh.csproj compiles the REAL AppIconRules.cs (no copy, no Compile Remove); AppIconTests.cs holds ≥ 12 tests.
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-macfixa/b-icon`):
 *   HomePage: the two arms of the `?:` swapped → b1 (switch, iconIsCsPath); `&& !AppIconReencode.takeReady()` dropped → b1
 *   (early, signalOnlyHere); `AppIconReencode.tookReady() || ` dropped → b1 (reload, signalOnlyHere); `loadApps(false);` →
 *   `loadApps(true);` in updateScreen → b2 (base); FolderName `"_icons"` → `"icons"` → b3 (folderNotAnAppId); copyName: the hex
 *   → `appId + ".png"` → b3 (name); make: `File.Move(copy + ".tmp", copy, true)` → `File.Move(copy + ".tmp", iconPath, true)` →
 *   b4 (atomicCopy); get: `made.Length <= MaxCopyBytes && ` dropped → b4 (readGuard); homeIcon: `false` → `true` → b5
 *   (neverInline); homeIcon: `Volatile.Write(ref ready, 1)` → `UIHelpers.shouldRefreshApps = true` → b5 (pool, signal); Steps
 *   without `192, ` → b6 (steps); Android `InJustDecodeBounds = true` → `false` → b6 (android); iOS / Mac: `new
 *   UIKit.UIImage(clean.ToImage()!)` → `new UIKit.UIImage(small)` → b6 (appleSrgb); the `clean.ClearRect(…)` line deleted (the fresh
 *   bitmap's memory would not be cleared before the draw) → b6 (appleSrgb); the dimsOk test dropped → b6 (apple);
 *   Windows `CreateAsync(<codec id>, input)` → `CreateAsync(input)` → b6 (windows); `DoNotColorManage` →
 *   `ColorManageToSRgb` → b6 (windows); get's catch: `e.GetType().Name` → `e.Message` → b7 (lines, typeOnly). */
import { createHash } from 'node:crypto';

export const HP_F = 'Spixi/Pages/Home/HomePage.xaml.cs', GLUE_F = 'Spixi/Utils/AppIconReencode.cs', RULES_F = 'Spixi/Utils/AppIconRules.cs';
export const LINE = 'icon = MacfixaFlags.AppIconReencode ? AppIconReencode.homeIcon(app.id, icon) : Utils.imageToDataUri(icon);';
export const BASE_LINE = 'icon = Utils.imageToDataUri(icon);';
export const EARLY = 'if (!forceRefresh && !UIHelpers.shouldRefreshApps && !AppIconReencode.takeReady())';
export const RELOAD = 'if (S11AppsRules.reloadChatPages(listChanged, AppIconReencode.tookReady() || appsPrePushing))';
/* SHA-256 of rest(HomePage.xaml.cs) at the base ae7b8303 (git show ae7b8303:<file>; stripCode; the icon statement and the
 * setCaps statement taken out; whitespace collapsed) */
export const BASE_HP = '93dbb752e6dc66a2122438ec68a50504c3e68a7293540f3cec9b1f9cf0e60f03';
export const MAX_HP_LINES = 7323;
export const FILE_OPS = [
  'File.Exists(iconPath', 'new FileInfo(iconPath', 'File.Exists(copy', 'File.Exists(copy', 'new FileInfo(copy', 'File.ReadAllBytes(copy',
  'File.Exists(copy', 'Directory.CreateDirectory(Path.GetDirectoryName(copy', 'File.WriteAllBytes(copy', 'new FileInfo(iconPath', 'File.ReadAllBytes(iconPath',
  'File.WriteAllBytes(copy + ".tmp"', 'File.Move(copy + ".tmp"',
];

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return { o: -1, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return { o, end: k + 1, text: t.slice(o, k + 1) };
  }
  return { o, end: -1, text: '' };
};
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
/* HomePage (comment-stripped) with the three touched statements of loadApps — the icon statement, the early-return test and
 * the chat-page reload test, whatever they say — and the setCaps statement taken out, whitespace collapsed */
export const rest = (hp) => {
  const caps = /Utils\.sendUiCommand\(this, "setCaps",[^\n]*;/g;
  return norm(hp.split(BASE_LINE).join('').replace(/icon = MacfixaFlags\.AppIconReencode\b[^;\n]*;/g, '')
    .replace(/if \(!forceRefresh && !UIHelpers\.shouldRefreshApps\b[^\n]*/g, '').replace(/if \(S11AppsRules\.reloadChatPages\([^\n]*/g, '').replace(caps, ''));
};

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const HP = rd(HP_F), GLUE = rd(GLUE_F), RULES = rd(RULES_F);
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const texts = csFiles.map((f) => [f, f === HP_F ? HP : f === GLUE_F ? GLUE : f === RULES_F ? RULES : rd(f)]);
  const sum = (re) => texts.reduce((n, [, t]) => n + count(t, re), 0);
  const filesWith = (re) => texts.filter(([, t]) => count(t, re) > 0).map(([f]) => f).sort().join();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ── b1 · the one line: ON → the copy, OFF → the base call ── */
  const la = bodyOf(HP, 'private void loadApps(bool forceRefresh)');
  const b1 = {
    switch: count(la, LINE) === 1 && count(HP, LINE) === 1,
    oneStatement: count(HP, /MacfixaFlags\.AppIconReencode\b/g) === 1 && count(HP, /AppIconReencode\.homeIcon\(/g) === 1 && count(la, /\bicon = /g) === 3,
    iconIsCsPath: new RegExp('string icon = Node\\.MiniAppManager\\.getAppIconPath\\(app\\.id\\);\\s*if \\(icon == null\\)\\s*\\{\\s*icon = "";\\s*\\}\\s*'
      + esc(LINE) + '\\s*Utils\\.sendUiCommand\\(this, "addApp", app\\.id, app\\.name, icon, ').test(la),
    appIsCsList: /var apps = Node\.MiniAppManager\.getInstalledApps\(\);\s*lock \(apps\)\s*\{\s*foreach \(var app_arr in apps\)\s*\{\s*MiniApp app = app_arr\.Value;/.test(la),
    onlyCallSite: sum(/\bhomeIcon\(/g) === 2 && filesWith(/\bhomeIcon\(/g) === [HP_F, GLUE_F].sort().join() && count(GLUE, 'public static string homeIcon(string appId, string iconPath)') === 1,
    switchReadOnce: sum(/MacfixaFlags\.AppIconReencode\b/g) === 1,
    early: count(la, EARLY) === 1 && count(la, /shouldRefreshApps\b[^\n]*\)\s*\{\s*return;/g) === 1 && la.indexOf(EARLY) < la.indexOf('Utils.sendUiCommand(this, "clearApps");'),
    reload: count(la, RELOAD) === 1 && count(la, /reloadChatPages\(/g) === 1 && la.indexOf(RELOAD) > la.indexOf('"clearAppsDone"'),
    signalOnlyHere: sum(/AppIconReencode\.takeReady\(/g) === 1 && sum(/AppIconReencode\.tookReady\(/g) === 1 && sum(/\btookReady\(/g) === 2 && count(HP, /AppIconReencode\./g) === 3,
  };
  ok(F(b1).length === 0,
    '★ macfixa b1 lines (P122, #1480): HomePage.loadApps holds ONE statement `' + LINE + '` — switch ON → C#\'s small copy, OFF → the base call — right after `icon` was read from Node.MiniAppManager.getAppIconPath(app.id) and right before the addApp push; homeIcon( has no other call site and the switch no other reader; its early return also asks AppIconReencode.takeReady() and its chat-page reload test AppIconReencode.tookReady() (a push that runs only for new copies reloads no chat page), each once — failing: ' + JSON.stringify(F(b1)));

  /* ── b2 · everything else in HomePage is the base ── */
  const got = sha(rest(HP));
  const lines = raw(HP_F).split('\n').length - (raw(HP_F).endsWith('\n') ? 1 : 0);
  const b2 = { base: got === BASE_HP, notLonger: lines > 0 && lines <= MAX_HP_LINES };
  ok(F(b2).length === 0,
    '★ macfixa b2 base (R6): HomePage.xaml.cs with the three touched statements of loadApps (the icon statement, the early-return test, the reload test) and the setCaps statement taken out is the base ae7b8303 file with the same four taken out (SHA-256), and the file has at most ' + MAX_HP_LINES + ' lines (' + lines + ') — failing: ' + JSON.stringify(F(b2)) + ' got ' + got);

  /* ── b3 · C#'s own folder and name ── */
  const mam = rd('Spixi/MiniApps/MiniAppManager.cs'), node = rd('Spixi/Meta/Node.cs'), safety = rd('Spixi/Utils/SafetyRules.cs');
  const folder = (/public const string FolderName = "([^"]*)";/.exec(RULES) || [])[1] || '';
  const wipe = bodyOf(mam, 'public int removeAllApps()');
  const b3 = {
    dir: count(GLUE, 'AppIconRules.get(Path.Combine(Config.spixiUserFolder, "html", "Apps", AppIconRules.FolderName), appId, iconPath, ') === 1 && count(GLUE, /Path\.Combine\(/g) === 1,
    sameAsManager: count(mam, 'appsPath = Path.Combine(base_app_path, "html", "Apps");') === 1 && count(node, 'MiniAppManager = new MiniAppManager(Config.spixiUserFolder);') === 1,
    folderNotAnAppId: folder.length > 1 && !/^[A-Za-z0-9]/.test(folder) && /^[A-Za-z0-9_]+$/.test(folder) && folder.toLowerCase() !== 'tmp'
      && /if \(!isAlnum\(id\[0\]\) \|\| !isAlnum\(id\[id\.Length - 1\]\)\) return false;/.test(bodyOf(safety, 'public static bool isSafeAppId(string? id)')),
    wipedWithTheAccount: /foreach \(string path in Directory\.EnumerateDirectories\(appsPath\)\)\s*\{\s*if \(string\.Equals\(path, tmpPath, StringComparison\.Ordinal\)\)\s*\{\s*continue;\s*\}\s*try\s*\{\s*Directory\.Delete\(path, true\);/.test(wipe),
    name: /public static string copyName\(string appId, long size, long ticks\) =>\s*Convert\.ToHexString\(SHA256\.HashData\(Encoding\.UTF8\.GetBytes\(appId \+ "\\n" \+ size \+ "\\n" \+ ticks\)\), 0, 20\)\.ToLowerInvariant\(\) \+ "\.png";/.test(RULES),
    nameUse: count(RULES, 'string copy = Path.Combine(dir, copyName(appId, source.Length, source.LastWriteTimeUtc.Ticks));') === 1
      && count(RULES, /Path\.Combine\(/g) === 1 && count(RULES, /\bcopy = /g) === 1 && count(RULES, 'FileInfo source = new FileInfo(iconPath);') === 1,
  };
  ok(F(b3).length === 0,
    '★ macfixa b3 place: the copies lie in Path.Combine(Config.spixiUserFolder, "html", "Apps", "' + folder + '") — MiniAppManager\'s own apps folder plus a constant the app-id rule refuses (no package installs into it; removeAllApps removes it with the account) — under AppIconRules.copyName = 40 hex of a SHA-256 over the id and the source\'s size and time: no text of a package or a WebView is in the path — failing: ' + JSON.stringify(F(b3)));

  /* ── b4 · the file operations ── */
  const opsOf = (t) => [...t.matchAll(/\b(?:File|Directory)\.\w+\([^,)]*|new (?:FileStream|FileInfo|StreamWriter|StreamReader)\([^,)]*/g)].map((m) => norm(m[0]));
  const rulesOps = opsOf(RULES), glueOps = opsOf(GLUE);
  const b4 = {
    ops: rulesOps.slice().sort().join(' | ') === FILE_OPS.slice().sort().join(' | '),
    glueHasNone: glueOps.length === 0 && !/\bFile\b|\bDirectory\b/.test(GLUE.replace(/using System\.IO;/, '')),
    noDeleteNoMove: !/File\.(?:Delete|Copy|Replace|Open\w*|Create\w*|Append\w*)\(|Directory\.(?:Move|Delete|Enumerate\w*|Get\w*)\(|new FileStream\(/.test(RULES),
    atomicCopy: /if \(!copyOk\(png\)\) IXICore\.Meta\.Logging\.warn\("App icon: no small copy"\);\s*else File\.WriteAllBytes\(copy \+ "\.tmp", png!\);\s*if \(copyOk\(png\)\) File\.Move\(copy \+ "\.tmp", copy, true\);\s*\}\s*\}$/.test(bodyOf(RULES, 'private static void make(string iconPath, string copy, Func<byte[], int, byte[]?> decode)')),
    readGuard: count(RULES, 'return made.Exists && made.Length <= MaxCopyBytes ? uriOf(File.ReadAllBytes(copy)) : "";') === 1 && count(RULES, /File\.ReadAllBytes\(copy\)/g) === 1,
    noBridge: !/onNavigating|sendUiCommand|executeUiCommand|HttpUtility|WebView|EvaluateJavaScript/.test(RULES + GLUE),
  };
  ok(F(b4).length === 0,
    '★ macfixa b4 file ops: the two new files touch the disk only through this list — the source icon is only asked for and read; every write goes to `copy` or `copy + ".tmp"` (C#\'s names in C#\'s folder; the `.tmp` is moved over `copy`) or makes that folder; nothing is deleted or listed; AppIconReencode.cs holds no file operation and neither file names a bridge or WebView member — failing: ' + JSON.stringify(F(b4)) + ' got ' + JSON.stringify(rulesOps));

  /* ── b5 · no decode on the UI thread ── */
  const hi = bodyOf(GLUE, 'public static string homeIcon(string appId, string iconPath)');
  const getB = bodyOf(RULES, 'public static string get(string dir, string appId, string iconPath, bool mayDecode, Func<byte[], int, byte[]?> decode, out Func<bool>? later)');
  const b5 = {
    neverInline: count(hi, 'string uri = AppIconRules.get(Path.Combine(Config.spixiUserFolder, "html", "Apps", AppIconRules.FolderName), appId, iconPath, false, platformCopy, out Func<bool>? later);') === 1
      && count(GLUE, /AppIconRules\.get\(/g) === 1 && !/MainThread|IsMainThread/.test(GLUE),
    pool: /if \(later != null\) Task\.Run\(\(\) => \{ if \(later\(\)\) System\.Threading\.Volatile\.Write\(ref ready, 1\); \}\);\s*return uri;\s*\}$/.test(hi) && count(GLUE, /later\(\)/g) === 1,
    signal: count(GLUE, 'private static int ready, taken;') === 1 && count(GLUE, /\bready\b/g) === 3 && count(GLUE, /\btaken\b/g) === 3 && !/shouldRefreshApps|UIHelpers/.test(GLUE + RULES)
      && count(GLUE, 'public static bool takeReady() => (taken = System.Threading.Interlocked.Exchange(ref ready, 0)) != 0;') === 1
      && count(GLUE, 'public static bool tookReady() => System.Threading.Interlocked.Exchange(ref taken, 0) != 0;') === 1,
    decoderOnlyAsArgument: count(GLUE, /private static byte\[\]\? platformCopy\(byte\[\] data, int side\)/g) === 3 && count(GLUE, /\bplatformCopy\b/g) === 4,
    neverThrows: /^\{\s*later = null;\s*try\s*\{[\s\S]*\}\s*catch \(Exception e\)\s*\{[\s\S]*return "";\s*\}\s*\}$/.test(getB),
    gate: /if \(!File\.Exists\(copy\) && !mayDecode\) later = \(\) => get\(dir, appId, iconPath, true, decode, out _\) != "";\s*else if \(!File\.Exists\(copy\)\) make\(iconPath, copy, decode\);/.test(getB)
      && count(RULES, /\bmake\(/g) === 2 && count(RULES, /\bmayDecode\b/g) === 2,
  };
  ok(F(b5).length === 0,
    '★ macfixa b5 thread: homeIcon gives get the literal `false` as mayDecode — loadApps holds appsPushLock and the app list lock, so NO thread decodes inline: "" now and the same call as `later` in Task.Run — and a copy made there raises only AppIconReencode\'s own `ready` (taken by loadApps\' early return, then by its reload test), never UIHelpers.shouldRefreshApps; the platform decoder is named only as that argument; get calls make only behind mayDecode — failing: ' + JSON.stringify(F(b5)));

  /* ── b6 · the three decoders: checked bytes, declared size first, a bounded decode, PNG out ── */
  const branch = (from, to) => { const a = GLUE.indexOf(from, GLUE.indexOf('public static string homeIcon(')), b = GLUE.indexOf(to, a + from.length); return a > 0 && b > a ? GLUE.slice(a, b) : ''; };
  const AND = branch('#if ANDROID', '#elif IOS || MACCATALYST'), APL = branch('#elif IOS || MACCATALYST', '#elif WINDOWS'), WIN = branch('#elif WINDOWS', '#endif');
  const order = (t, ...parts) => { let at = -1; for (const p of parts) { const i = t.indexOf(p, at + 1); if (i < 0 || count(t, p) !== 1) return false; at = i; } return true; };
  const mk = bodyOf(RULES, 'private static void make(string iconPath, string copy, Func<byte[], int, byte[]?> decode)');
  const b6 = {
    checkedBytesOnly: order(mk, 'lock (gate)', 'if (File.Exists(copy)) return;', 'File.WriteAllBytes(copy, Array.Empty<byte>());',
      'byte[]? data = new FileInfo(iconPath).Length <= MaxSourceBytes ? File.ReadAllBytes(iconPath) : null;',
      'for (int i = 0; i < Steps.Length && sourceOk(data) && !copyOk(png) && (i == 0 || png != null); i++) png = decode(data!, Steps[i]);')
      && count(RULES, /\bdecode\(/g) === 1,
    sourceRule: /public static bool sourceOk\(byte\[\]\? d\) => d != null && d\.Length >= 16 && d\.Length <= MaxSourceBytes && \(isPng\(d\) \|\| \(d\[0\] == 0xFF && d\[1\] == 0xD8 && d\[2\] == 0xFF\)\);/.test(RULES),
    android: order(AND, 'InJustDecodeBounds = true', 'AG.BitmapFactory.DecodeByteArray(data, 0, data.Length, bounds);', 'if (!AppIconRules.dimsOk(bounds.OutWidth, bounds.OutHeight)) return null;',
      'AG.BitmapFactory.DecodeByteArray(data, 0, data.Length, new AG.BitmapFactory.Options { InSampleSize = PhotoRules.decodeSample(Math.Max(bounds.OutWidth, bounds.OutHeight), side) });',
      'AppIconRules.fit(full.Width, full.Height, side);', 'AG.Bitmap.CompressFormat.Png!')
      && count(AND, /\bDecode\w*\(/g) === 2,
    apple: order(APL, 'CGImageSource.FromData(raw);', 'src?.GetProperties(0);', 'if (src == null || !AppIconRules.dimsOk(props?.PixelWidth ?? 0, props?.PixelHeight ?? 0)) return null;',
      'src.CreateThumbnail(0, new CGImageThumbnailOptions { MaxPixelSize = side, CreateThumbnailFromImageAlways = true,', 'image.AsPNG();')
      && count(APL, /\bCreate(?:Thumbnail|Image)\(/g) === 1,
    appleSrgb: order(APL, 'src.CreateThumbnail(0,', 'CoreGraphics.CGColorSpace srgb = CoreGraphics.CGColorSpace.CreateSrgb();',
      'new CoreGraphics.CGBitmapContext(null, small.Width, small.Height, 8, 0, srgb, CoreGraphics.CGImageAlphaInfo.PremultipliedLast);',
      'clean.ClearRect(new CoreGraphics.CGRect(0, 0, small.Width, small.Height));', 'clean.DrawImage(new CoreGraphics.CGRect(0, 0, small.Width, small.Height), small);', 'new UIKit.UIImage(clean.ToImage()!);', 'image.AsPNG();')
      && count(APL, /new UIKit\.UIImage\(/g) === 1 && count(APL, /AsPNG\(/g) === 1,
    windows: order(WIN, 'BitmapDecoder.CreateAsync(AppIconRules.isPng(data) ? BitmapDecoder.PngDecoderId : BitmapDecoder.JpegDecoderId, input);',
      'if (!AppIconRules.dimsOk((int)decoder.PixelWidth, (int)decoder.PixelHeight)) return null;', 'AppIconRules.fit((int)decoder.PixelWidth, (int)decoder.PixelHeight, side);',
      'decoder.GetPixelDataAsync(', 'new BitmapTransform { ScaledWidth = (uint)w, ScaledHeight = (uint)h,', 'ColorManagementMode.DoNotColorManage);', 'BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, output);', 'encoder.SetPixelData(')
      && count(WIN, /BitmapDecoder\.CreateAsync\(/g) === 1 && !/GetSoftwareBitmapAsync|GetFrameAsync/.test(WIN),
    steps: count(RULES, 'public static readonly int[] Steps = { 192, 144, 120, 96, 72, 48 };') === 1 && count(RULES, 'public const int MaxCopyBytes = (30000 - 22) / 4 * 3;') === 1,
    noOtherDecoder: !/ResizeImage|SFilePicker|SThumbnail|System\.Drawing|Jpeg(?!DecoderId)|AsJPEG|DecodeFile|DecodeStream|FromUrl|FromFile|GetFileFromPathAsync|PlatformImage/.test(GLUE),
  };
  ok(F(b6).length === 0,
    '★ macfixa b6 decoders: a decoder gets only bytes make() checked (the size before the read, PNG or JPEG by the first bytes) after the mark is on disk; Android reads the bounds, checks them, then decodes with InSampleSize; iOS / Mac read the properties, check them, then take ImageIO\'s scaled thumbnail; Windows names the PNG or JPEG codec by id, checks the size and asks for the scaled frame; each writes a PNG; no other decoder, no path decode, no JPEG out — failing: ' + JSON.stringify(F(b6)));

  /* ── b7 · the log lines ── */
  const logs = [...(RULES + '\n' + GLUE).matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => norm(m[0]));
  const b7 = {
    lines: logs.join(' | ') === 'Logging.warn("App icon: no small copy (" + e.GetType().Name + ")"); | Logging.warn("App icon: no small copy");',
    typeOnly: !/\.Message\b|\.StackTrace\b|\.ToString\(\)|\+ e\)|\+ ex\)/.test(RULES + GLUE),
    noConsole: !/Console\.|Debug\.Write|Trace\./.test(RULES + GLUE),
  };
  ok(F(b7).length === 0,
    '★ macfixa b7 log: the two new files log the fixed words `App icon: no small copy`, alone or with an exception TYPE name in brackets; no message, no stack, no path, no app id — failing: ' + JSON.stringify(F(b7)) + ' got ' + JSON.stringify(logs));

  /* ── b8 · the harness runs the REAL rules ── */
  const csproj = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const tests = stripCode(raw('scripts/csh/AppIconTests.cs'));
  const b8 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/AppIconRules.cs" />') === 1,
    noRemove: !/Compile Remove/.test(csproj),
    tests: count(tests, /\[TestMethod\]/g) >= 12 && /AppIconRules\.get\(/.test(tests) && /new MiniAppManager\(/.test(tests),
  };
  ok(F(b8).length === 0,
    '★ macfixa b8 harness: csh.csproj compiles the REAL Spixi/Utils/AppIconRules.cs and AppIconTests.cs holds ≥ 12 tests over real files and the real MiniAppManager — failing: ' + JSON.stringify(F(b8)));
}
