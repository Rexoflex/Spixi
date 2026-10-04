/* ==== SESSION 5 — #1153 pins: the Windows white window after an incoming call over a MODAL page ====
 * MAUI-only code (Dispose guard, WinUI handler) → source pins, comments stripped. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const cs = (p) => stripCode(readFileSync(join(root, p), 'utf8'));

  {
    const sp = cs('Spixi/Utils/SpixiContentPage.cs');
    const disp = (/public void Dispose\(bool force\)\s*\{\s*try\s*\{([\s\S]*?)disposed = true;/.exec(sp) || [])[1] || '';
    const r = {
      guard: /^\s*if \(force \|\| \(!Navigation\.NavigationStack\.Contains\(this\) && !Navigation\.ModalStack\.Contains\(this\)\)\)\s*\{\s*$/.test(disp),
      overload: /public void Dispose\(\)\s*\{\s*Dispose\(false\);\s*\}/.test(sp),
      forceOnlyCall: (() => { const c = cs('Spixi/Pages/Call/CallPage.xaml.cs'); return /refusing to pop it[\s\S]{0,200}?page\.Dispose\(true\);\s*return;/.test(c) && (c.match(/Dispose\(true\)/g) || []).length === 1; })(),
      devLoadSafe: (() => { const d = cs('Spixi/Pages/Dev/DevPage.xaml.cs'); return /try\s*\{\s*if \(File\.Exists\(destLogPath\)\)[\s\S]*?File\.Copy\(srcLogPath, destLogPath\);[\s\S]*?\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\("DevPage: log read failed: " \+ ex\.GetType\(\)\.Name\);/.test(d); })(),
      onDisappearingStillDisposes: /protected override void OnDisappearing\(\)\s*\{\s*base\.OnDisappearing\(\);\s*Dispose\(\);/.test(sp),
    };
    ok(Object.values(r).every(Boolean), '★★ #1153 (Windows white window): Dispose() keeps the WebView of a page that is still on the MODAL stack (only covered — e.g. DevPage under the incoming-call ring), as it already did for the navigation stack; a really-popped modal is gone from ModalStack before OnDisappearing (MAUI PopModalAsync), so it is still disposed; only the CallPage refuse-to-pop branch forces the old teardown (#46 r1 C-m1); the DevPage log read on every appear cannot throw (C-n3) — ' + JSON.stringify(r));
  }
  {
    const app = cs('Spixi/Platforms/Windows/App.xaml.cs');
    const blk = (/UnhandledException \+= \(sender, e\) =>\s*\{([\s\S]*?)\n        \};/.exec(app) || [])[1] || '';
    const r = {
      afterInit: app.indexOf('InitializeComponent();') > 0 && app.indexOf('UnhandledException += (sender, e) =>') > app.indexOf('InitializeComponent();'),
      typeHrFrame: /Logging\.error\("\[CRASH\] winui " \+ \(ex\?\.GetType\(\)\.FullName \?\? "null"\)\s*\+ " hr=0x" \+ \(ex\?\.HResult \?\? 0\)\.ToString\("X8"\)\s*\+ " inner=" \+ \(ex\?\.InnerException\?\.GetType\(\)\.FullName \?\? "-"\)\s*\+ " at " \+ frame\);/.test(blk),
      noMessage: !/\.Message|ToString\(\)\)|ex\.StackTrace|e\.Message/.test(blk),
      flushes: /Logging\.flush\(\);/.test(blk),
      notHandled: !/Handled\s*=/.test(blk),
    };
    ok(Object.values(r).every(Boolean), '★ #1153: WinUI Application.UnhandledException is logged — exception TYPE, HRESULT, inner type and the first frame (type.method) only, never the message or the full stack (gate rule) — flushed, and NOT marked handled — ' + JSON.stringify(r));
  }
}
