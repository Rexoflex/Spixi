/* ==== Mac: save a backup or a photo to a folder (macfixa item 1, Mission Control n-20261015-mac-save, packet P121) — with the switch
 * MacfixaFlags.MacSaveToFolder on, the Mac SFileOperations.share(path, title) shows a native choice first: Save File (the system
 * save panel, a COPY of C#'s own file), Add to Photos (photos only, by MacSaveRules), Share File (the old share menu), Cancel.
 * SOURCE PIN (#1735) — LIMITS: Spixi/Platforms/MacCatalyst/SFileOperations.cs is ⚠ C# UNCOMPILED here (no Mac Catalyst SDK, no
 * macOS job in CI); the keys hold its comment-stripped TEXT, not its bindings or its behaviour on a Mac. Not seen: a wrong binding
 * name (the Mac build finds it), what Catalyst shows (the walk), a `#define`, reflection, a partial class in another file, whether
 * `PresentingViewController` tracks the chooser, the Photos alert and the share menu on Catalyst the way the poll of show() expects,
 * and that Catalyst calls the save panel's DidPickDocument / WasCancelled exactly when the panel closes (the walk, M-1).
 * The pure half (which buttons, the photo test, the line) runs in csh: scripts/csh/MacSaveTests.cs.
 *   a1 old path  — the body of `static Task shareMenu(string filepath, string title)` is the base `ae7b8303` share() body
 *                  (SHA-256, stripCode, whitespace collapsed): the switch OFF runs exactly today's share menu.
 *   a2 switch    — share() keeps its signature and its body is exactly "switch OFF → shareMenu, else saveChoice on the main thread";
 *                  `MacfixaFlags.MacSaveToFolder` is read there and nowhere else in Spixi/**.
 *   a3 save copy — the ONE UIDocumentPickerViewController is `new UIDocumentPickerViewController(new NSUrl[] {
 *                  NSUrl.FromFilename(filepath) }, true)` (asCopy true) in saveCopy, and `filepath` is share()'s own argument all the
 *                  way down (share → saveChoice → saveCopy); the file has no File. / Directory. call (the OS panel writes the copy).
 *   a4 photos    — the buttons come only from `SPIXI.MacSaveRules.options(name)` with `name = Path.GetFileName(filepath)`; addToPhotos
 *                  runs only on the Photos choice; add-only access (`PHAccessLevel.AddOnly`, no ReadWrite) and ONE
 *                  `PHAssetChangeRequest.FromImage(url)`; no Photos read (no PHAsset.Fetch / PHImageManager).
 *   a5 the end   — 6 TaskCompletionSource, each set on every exit of its step (every chooser button, the panel's pick and cancel,
 *                  the auth answer, the Photos completion, the failure alert's OK, the share menu's completion handler, and show()'s
 *                  poll for every step but the panel; the panel ends only by its delegate: a refused panel sets nothing, fail closed); saveChoice awaits each step inside ONE try with a catch, so its Task ends only after the choice; the one
 *                  delay is show()'s poll of the presentation (no timer frees a step while its controller is presented).
 *   a6 callers   — the bodies of BackupPage shareBackup / waitForAppleShareSheet / appleShareSheetOpen are their base bodies
 *                  (SHA-256); SingleChatPage keeps `_ = SFileOperations.share(path, name);` once, after `path =
 *                  SharedItems.localPathOf(fm);`; HomePage keeps its log-zip line once; 5 `SFileOperations.share(` calls in Spixi/**;
 *                  the Mac file has no `ixian:`, executeUiCommand or sendUiCommand (no WebView value reaches it).
 *   a7 lines     — the Mac file logs exactly two lines (the type-only catch and MacSaveRules.logLine); every string it shows is
 *                  `SL("<key>", "<English>")`; the old keys exist in every C# table; each NEW key is in all 14 tables or in none.
 *   a8 harness   — csh.csproj compiles the REAL MacSaveRules.cs; it names no UIKit / Foundation / Photos / Logging / File;
 *                  MacSaveTests.cs holds ≥ 7 tests.
 *   a9 present   — every presentation of the ON path goes through show(): its body is exact (present, then poll every 300 ms and
 *                  end with `closed` after two polls in a row find the controller not presented; with waitWhenShown (the panel) no
 *                  poll: the step ends only by its delegate, and the panel + delegate are held in `openPanel` until then); the four steps call it with their own controller, completion source and
 *                  closed result (chooser → Cancel, panel → Cancelled with waitWhenShown, Photos error → true, share menu → Done); the chooser is UIAlertControllerStyle.Alert; no other PresentViewController and no ActionSheet.
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-macfixa/a-mac-save`):
 *   (r3) in saveCopy the line `picker.Delegate = del;` moved below the `show(…, true)` call → a5 (panel); `waitWhenShown` line of show()
 *   deleted → a9 (body); `openPanel = (picker, del);` deleted → a5 (panel); the field `static object? openPanel;` replaced by a local in saveCopy
 *   → a5 (panel); the panel's `Cancelled, true)` → `Cancelled)` → a5 + a9.
 *   shareMenu `CheckSystemVersion(8, 0)` → `(9, 0)` → a1 · share `if (!SPIXI.MacfixaFlags` → `if (SPIXI.MacfixaFlags` → a2 ·
 *   saveCopy `}, true);` → `}, false);` → a3 · saveChoice `options(name)` → `options("x.jpg")` → a4 · ExportDelegate WasCancelled
 *   `=> done.TrySetResult(SPIXI.MacSaveRules.Cancelled);` → `{ }` → a5 · BackupPage appleShareSheetOpen `return true;` → `return
 *   false;` → a6 · the catch `e.GetType().Name` → `e.Message` → a7 · csh.csproj the MacSaveRules line removed → a8 · the Photos error
 *   alert `await show(host, a, closed, true);` → `await closed.Task;` → a5 + a9 (the present gone) · the chooser `UIAlertControllerStyle.Alert`
 *   → `.ActionSheet` → a9 · show() `host.PresentViewController(vc, true, null);` deleted → a9 · show() `== null ? gone + 1` →
 *   `!= null ? gone + 1` → a9. */
import { createHash } from 'node:crypto';

export const MAC_F = 'Spixi/Platforms/MacCatalyst/SFileOperations.cs';
export const BACKUP_F = 'Spixi/Pages/Settings/BackupPage.xaml.cs';
export const CHAT_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs';
export const HOME_F = 'Spixi/Pages/Home/HomePage.xaml.cs';
/* SHA-256 at the base ae7b8303 (git show ae7b8303:<file>; stripCode; whitespace collapsed) */
export const BASE = {
  share: 'da2466d1f5ca5d6c34651eb8a8d61ca61f3ed299feec58f28f2f8a7948eead13',
  shareBackup: 'a515bb32efdb53e2ba4003ff53ae688cbb096948b25c6060618ed3eff2fa3986',
  waitSheet: '116b56c90d433d37202a0a7e051cdd7f41f6ef5107cef53f2efe78f37d1e02bb',
  sheetOpen: '59d26cd011cf4641ab6d3349fda74182882fa8a003d49a29cc5e1f60b017a791',
};
export const SWITCH_BODY = '{ if (!SPIXI.MacfixaFlags.MacSaveToFolder) { return shareMenu(filepath, title); } return Microsoft.Maui.ApplicationModel.MainThread.InvokeOnMainThreadAsync(() => saveChoice(filepath, title)); }';
export const SHOW_BODY = '{ host.PresentViewController(vc, true, null); if (waitWhenShown) return await done.Task; for (int gone = 0; gone < 2 && !done.Task.IsCompleted; gone = vc.PresentingViewController == null ? gone + 1 : 0) { await Task.Delay(300); } done.TrySetResult(closed); return await done.Task; }';
export const SHOW_CALLS = ['choice = await show(host, alert, picked, SPIXI.MacSaveRules.Cancel);', 'string r = await show(host, picker, done, SPIXI.MacSaveRules.Cancelled, true);',
  'await show(host, a, closed, true);', 'return show(host, menu, done, SPIXI.MacSaveRules.Done);'];
export const PICKER = 'new UIDocumentPickerViewController(new NSUrl[] { NSUrl.FromFilename(filepath) }, true)';
export const OLD_KEYS = ['global-share-choose', 'global-share-savefile', 'global-share-sharefile', 'global-dialog-cancel', 'global-dialog-error', 'global-dialog-ok'];
export const NEW_KEYS = ['global-share-addphotos', 'global-share-addphotos-failed'];

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(norm(t), 'utf8').digest('hex');
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return '';
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === "'") { k++; while (k < t.length && t[k] !== "'") { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return t.slice(o, k + 1);
  }
  return '';
};
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length));

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const MAC = rd(MAC_F);
  const share = bodyOf(MAC, 'public static Task share(string filepath, string title)');
  const menu = bodyOf(MAC, 'static Task shareMenu(string filepath, string title)');
  const choice = bodyOf(MAC, 'static async Task saveChoice(string filepath, string title)');
  const copy = bodyOf(MAC, 'static async Task<string> saveCopy(UIViewController host, string filepath)');
  const photos = bodyOf(MAC, 'static async Task<string> addToPhotos(UIViewController host, string filepath)');
  const shareWait = bodyOf(MAC, 'static Task<string> shareAndWait(UIViewController host, string filepath, string title, string name)');
  const exportDel = bodyOf(MAC, 'class ExportDelegate(TaskCompletionSource<string> done) : UIDocumentPickerDelegate');
  const showBody = bodyOf(MAC, 'static async Task<T> show<T>(UIViewController host, UIViewController vc, TaskCompletionSource<T> done, T closed, bool waitWhenShown = false)');

  /* ── a1 · switch OFF = the base share() body ── */
  ok(menu.length > 100 && sha(menu) === BASE.share,
    '★ macfixa a1 old path (P121): shareMenu() is the base ae7b8303 share() body (SHA-256) — with the switch OFF the Mac shows exactly today\'s share menu — got ' + sha(menu).slice(0, 12));

  /* ── a2 · the switch, read in share() only ── */
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const texts = csFiles.map((f) => [f, rd(f)]);
  const sum = (re) => texts.reduce((n, [, t]) => n + count(t, re), 0);
  const a2 = {
    signature: count(MAC, 'public static Task share(string filepath, string title)') === 1 && count(MAC, /\bshare\s*\(/g) === 1,
    body: norm(share) === SWITCH_BODY,
    readOnce: sum(/\bMacfixaFlags\.MacSaveToFolder\b/g) === 1 && count(share, 'MacfixaFlags.MacSaveToFolder') === 1,
    menuCalledOnce: count(MAC, /\bshareMenu\s*\(/g) === 2,
  };
  ok(F(a2).length === 0,
    '★ macfixa a2 switch (P121): share(string filepath, string title) keeps its signature and is exactly `if (!MacfixaFlags.MacSaveToFolder) return shareMenu(...); return MainThread.InvokeOnMainThreadAsync(() => saveChoice(filepath, title));`; the switch is read there and nowhere else in Spixi/** — failing: ' + JSON.stringify(F(a2)));

  /* ── a3 · the save panel writes a COPY of C#'s own file ── */
  const a3 = {
    onePicker: count(MAC, /UIDocumentPickerViewController\s*\(/g) === 1 && count(copy, PICKER) === 1,
    fromShare: count(choice, 'await saveCopy(host, filepath)') === 1 && count(share, 'saveChoice(filepath, title)') === 1 && count(MAC, /\bsaveCopy\s*\(/g) === 2,
    noOtherMode: !/UIDocumentPickerMode|forOpening|asCopy\s*:\s*false|\.Import\b|\.MoveToService\b/.test(MAC),
    noFileOp: !/\bFile\.|\bDirectory\.|\bFileStream\b|\bNSFileManager\b/.test(MAC),
  };
  ok(F(a3).length === 0,
    '★ macfixa a3 save copy (P121): the ONE document picker is `' + PICKER + '` (asCopy true: the source stays, the user picks the place in the OS panel) from share()\'s own path; no other picker mode; the Mac file writes no file itself — failing: ' + JSON.stringify(F(a3)));

  /* ── a4 · Add to Photos only for photos, by the rules, add-only ── */
  const a4 = {
    nameIsLeaf: count(choice, 'string name = System.IO.Path.GetFileName(filepath);') === 1,
    buttonsFromRules: count(choice, 'foreach (string opt in SPIXI.MacSaveRules.options(name))') === 1 && count(MAC, /UIAlertAction\.Create\(/g) === 2,
    photosOnChoice: count(MAC, /\baddToPhotos\s*\(/g) === 2 && count(norm(choice), 'choice == SPIXI.MacSaveRules.Photos ? await addToPhotos(host, filepath)') === 1,
    addOnly: count(photos, 'PHAccessLevel.AddOnly') === 1 && !/ReadWrite/.test(MAC) && count(MAC, 'PHAssetChangeRequest.FromImage(url)') === 1 && count(photos, 'PHAssetChangeRequest.FromImage(url)') === 1,
    noRead: !/PHAsset\.Fetch|PHImageManager|PHAssetCreationRequest|AddResource|UIImage\.From|new UIImage/.test(MAC),
    urlOnlyFromRules: count(shareWait, 'SPIXI.MacSaveRules.isPhoto(name) ? new NSObject[] { url }') === 1 && count(MAC, /shareAndWait\(host, filepath, title, name\)/g) === 1,
  };
  ok(F(a4).length === 0,
    '★ macfixa a4 photos (P121): the chooser\'s buttons come only from MacSaveRules.options(Path.GetFileName(filepath)) (the leaf of C#\'s path; for a received file the peer\'s name after SafeFileName); addToPhotos runs only on the Photos choice with add-only access and ONE PHAssetChangeRequest.FromImage(url) (Photos decodes, Spixi decodes nothing); no Photos read; the URL-only share item by the rules — failing: ' + JSON.stringify(F(a4)));

  /* ── a5 · the Task ends when the choice is finished ── */
  const nc = norm(choice);
  const a5 = {
    six: count(MAC, /new TaskCompletionSource</g) === 6 && count(MAC, /TaskCreationOptions\.RunContinuationsAsynchronously/g) === 6,
    chooser: /alert\.AddAction\(UIAlertAction\.Create\([^;]*_ => picked\.TrySetResult\(opt\)\)\);/.test(nc) && count(nc, SHOW_CALLS[0]) === 1,
    panel: /override void DidPickDocument\(UIDocumentPickerViewController controller, NSUrl\[\] urls\) => done\.TrySetResult\(SPIXI\.MacSaveRules\.Done\);/.test(norm(exportDel))
      && /override void WasCancelled\(UIDocumentPickerViewController controller\) => done\.TrySetResult\(SPIXI\.MacSaveRules\.Cancelled\);/.test(norm(exportDel))
      && count(copy, SHOW_CALLS[1]) === 1 && count(copy, 'picker.Delegate = del;') === 1 && count(copy, /\.Delegate\s*=/g) === 1
      && copy.indexOf('picker.Delegate = del;') < copy.indexOf(SHOW_CALLS[1])
      && count(MAC, 'static object? openPanel;') === 1 && count(MAC, /\bopenPanel\b/g) === 3 && count(copy, 'openPanel = (picker, del);') === 1 && count(copy, 'openPanel = null;') === 1 && copy.indexOf('openPanel = (picker, del);') < copy.indexOf(SHOW_CALLS[1]) && copy.indexOf(SHOW_CALLS[1]) < copy.indexOf('openPanel = null;'),   // the delegate is set before the panel is shown (with waitWhenShown a later set would hang Save File)
    photosEnd: count(photos, 's => auth.TrySetResult(s)') === 1 && count(photos, '(ok, err) => added.TrySetResult(ok)') === 1 && count(photos, '_ => closed.TrySetResult(true)') === 1
      && count(photos, SHOW_CALLS[2]) === 1,
    shareEnd: /menu\.CompletionWithItemsHandler = \(type, completed, returned, error\) => done\.TrySetResult\(/.test(norm(shareWait)) && count(shareWait, SHOW_CALLS[3]) === 1,
    oneTry: count(choice, /\btry\s*\{/g) === 1 && count(choice, 'catch (Exception e)') === 1 && nc.indexOf('try {') < nc.indexOf(SHOW_CALLS[0]) && nc.lastIndexOf('await shareAndWait') < nc.indexOf('catch (Exception e)'),
    noTimer: !/Task\.Delay|Timer|Task\.FromResult/.test(MAC.replace(menu, '').replace(showBody, '')) && count(showBody, 'await Task.Delay(300);') === 1,
  };
  ok(F(a5).length === 0,
    '★ macfixa a5 the end (P121): every step\'s TaskCompletionSource is set on each of its exits (each chooser button, the panel\'s pick and cancel, the auth answer, the Photos completion, the failure alert\'s OK, the share menu\'s handler, show()\'s poll) and saveChoice awaits them inside one try/catch — share()\'s Task ends after the whole choice; the only delay is show()\'s poll — failing: ' + JSON.stringify(F(a5)));

  /* ── a9 · every presentation goes through show() ── */
  const a9 = {
    body: norm(showBody) === SHOW_BODY,
    calls: SHOW_CALLS.every((c) => count(MAC, c) === 1) && count(MAC, /\bshow\s*\(/g) === 4 && count(MAC, /\bshow<T>\(/g) === 1
      && count(choice, SHOW_CALLS[0]) === 1 && count(copy, SHOW_CALLS[1]) === 1 && count(photos, SHOW_CALLS[2]) === 1 && count(shareWait, SHOW_CALLS[3]) === 1,
    onePresent: count(MAC.replace(menu, ''), /PresentViewController/g) === 1 && count(showBody, 'PresentViewController') === 1,
    alertStyle: count(choice, 'var alert = UIAlertController.Create(SL("global-share-choose", "Choose Action"), null, UIAlertControllerStyle.Alert);') === 1
      && count(photos, 'UIAlertControllerStyle.Alert);') === 1 && !/ActionSheet/.test(MAC),
  };
  ok(F(a9).length === 0,
    '★ macfixa a9 present (P121): every presentation of the switch-ON path is show(host, vc, done, closed) — present, then end the step with its closed result after two polls in a row find vc not presented (a refused present, a share menu that skipped its handler); the save panel is not polled and ends only by its delegate — called once per step (chooser → Cancel, panel → Cancelled, Photos error → true, share menu → Done); the chooser is an Alert; no other present, no ActionSheet — failing: ' + JSON.stringify(F(a9)));

  /* ── a6 · the callers are unchanged; no WebView value ── */
  const BK = rd(BACKUP_F), CH = rd(CHAT_F), HM = rd(HOME_F);
  const nch = norm(CH);
  const a6 = {
    shareBackup: sha(bodyOf(BK, 'private static async Task<bool?> shareBackup(string path, string title)')) === BASE.shareBackup,
    waitSheet: sha(bodyOf(BK, 'private static async Task waitForAppleShareSheet(CancellationToken ct)')) === BASE.waitSheet,
    sheetOpen: sha(bodyOf(BK, 'private static bool appleShareSheetOpen()')) === BASE.sheetOpen,
    chat: count(CH, '_ = SFileOperations.share(path, name);') === 1 && nch.indexOf('path = SharedItems.localPathOf(fm);') > 0
      && nch.indexOf('path = SharedItems.localPathOf(fm);') < nch.indexOf('#elif IOS || MACCATALYST _ = SFileOperations.share(path, name);'),
    home: count(HM, 'SFileOperations.share(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"), "Share Spixi Log File");') === 1,
    five: sum(/\bSFileOperations\.share\s*\(/g) === 5,
    noBridge: !/ixian:|executeUiCommand|sendUiCommand|WebView/.test(MAC),
  };
  ok(F(a6).length === 0,
    '★ macfixa a6 callers (P121): BackupPage shareBackup / waitForAppleShareSheet / appleShareSheetOpen are their base bodies (SHA-256), the chat Save passes C#\'s own localPathOf path, HomePage keeps its log-zip line, 5 share calls in Spixi/**, and the Mac file has no bridge name — failing: ' + JSON.stringify(F(a6))
    + ' got ' + ['private static async Task<bool?> shareBackup(string path, string title)', 'private static async Task waitForAppleShareSheet(CancellationToken ct)', 'private static bool appleShareSheetOpen()'].map((s) => sha(bodyOf(BK, s)).slice(0, 12)).join(' '));

  /* ── a7 · two log lines, fixed words; C#'s own strings ── */
  const langDir = 'Spixi/Resources/Raw/lang';
  const tables = existsSync(join(root, langDir)) ? readdirSync(join(root, langDir)).filter((f) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(f)) : [];
  const has = (f, k) => new RegExp('^' + k.replace(/-/g, '\\-') + '\\s*=', 'm').test(raw(langDir + '/' + f));
  const slArgs = [...MAC.matchAll(/\bSL\(\s*("[a-z-]+"|SPIXI\.MacSaveRules\.keyOf\(opt\)|string key),/g)].map((m) => m[1]);
  const keyLits = slArgs.filter((a) => a.startsWith('"')).map((a) => a.slice(1, -1)).concat((rd('Spixi/Utils/MacSaveRules.cs').match(/"global-[a-z-]+"/g) || []).map((a) => a.slice(1, -1)));
  const a7 = {
    twoLines: count(MAC, /\bLogging\./g) === 2 && count(MAC, 'Logging.warn("[MACSAVE] failed (" + e.GetType().Name + ")");') === 1 && count(MAC, 'Logging.info(SPIXI.MacSaveRules.logLine(choice, result));') === 1,
    noMessage: !/\.Message\b|\.ToString\(\)|StackTrace|filepath\s*\+|\+\s*filepath|\+\s*name\b|\+\s*title\b/.test(MAC),
    slHelper: count(MAC, 'static string SL(string key, string english) => SPIXI.Lang.SpixiLocalization._SL(key) ?? english;') === 1 && count(MAC, /SpixiLocalization/g) === 1,
    slKeys: slArgs.length === 6 && count(MAC, /\bSL\(/g) === 6 && keyLits.length === 8 && keyLits.every((k) => OLD_KEYS.includes(k) || NEW_KEYS.includes(k)),
    oldKeys: tables.length === 14 && OLD_KEYS.every((k) => tables.every((f) => has(f, k))),
    newKeysAllOrNone: NEW_KEYS.every((k) => { const n = tables.filter((f) => has(f, k)).length; return n === 0 || n === tables.length; }),
  };
  ok(F(a7).length === 0,
    '★ macfixa a7 lines (P121): the Mac file logs two lines (`[MACSAVE] failed (<Type>)` and MacSaveRules.logLine — fixed words), no message, path or name; its strings are C#\'s own (SL(key, English)); the old keys exist in all 14 tables, each new key (' + NEW_KEYS.join(', ') + ') in all or none — failing: ' + JSON.stringify(F(a7)));

  /* ── a8 · the harness runs the REAL rules ── */
  const csproj = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const rules = rd('Spixi/Utils/MacSaveRules.cs');
  const a8 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/MacSaveRules.cs" />') === 1,
    pure: rules.length > 200 && !/using (UIKit|Foundation|Photos)|\bLogging\b|\bFile\.|\bPreferences\b/.test(rules),
    tests: count(stripCode(raw('scripts/csh/MacSaveTests.cs')), /\[TestMethod\]/g) >= 7,
  };
  ok(F(a8).length === 0,
    '★ macfixa a8 harness (P121): csh.csproj compiles the REAL Spixi/Utils/MacSaveRules.cs (pure: no UIKit, Foundation, Photos, log or file), and MacSaveTests.cs holds ≥ 7 tests — failing: ' + JSON.stringify(F(a8)));
}
