/* ==== S12 D — ★ #1267: the desktop resize band — the window's XAML root painted with the app ground (Windows CANDIDATE) ====
 * While the window edge is dragged, WebView2 lags the new size and a dark empty band shows. MAUI 10.0.71 sets
 * Window.Content = WindowRootViewContainer (an internal Panel, WindowHandler.Windows.cs:16-17) whose Background is never
 * set. The candidate paints that Panel with ThemeManager.getSurfaceColorString() (the theme-level app ground, never one
 * page's colour — the AND-7 lesson) from the window mapper (first frame) and from every surface pass
 * (SpixiContentPage.applyPageSurfaceColor, which the theme sweep UIHelpers.pushThemeToAllPages runs) — Windows only;
 * `[P1] winground set=<argb8>` once per new value. C# is UNCOMPILED here: source pins, the touched bodies WHOLE
 * (whitespace-normalised, comments out); the [P1] line's grammar runs in csh (S12SaveTests).
 * Deliberate breaks: see the S12 D report. */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCode } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const bodyOf = (sc, head) => {
    const at = sc.indexOf(head);
    if (at < 0) return '';
    let i = sc.indexOf('{', at + head.length - 1);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") { for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; } continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const whole = (body, expected) => body.length > 0 && norm(body) === norm(expected);
  const app = stripCode(rd('Spixi/Platforms/Windows/App.xaml.cs'));
  const scp = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
  const r = {};
  r.apply = whole(bodyOf(app, 'internal static void applyWindowGround(Microsoft.UI.Xaml.Window? only = null)'), `{
      try {
        if (!Microsoft.Maui.ApplicationModel.MainThread.IsMainThread) { Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() => applyWindowGround(only)); return; }
        global::Windows.UI.Color c = Microsoft.Maui.Platform.ColorExtensions.ToWindowsColor(
          Microsoft.Maui.Graphics.Color.FromArgb(SPIXI.ThemeManager.getSurfaceColorString()));
        bool changed = false;
        if (only != null) { changed = paintWindowGround(only, c); }
        else {
          var windows = Microsoft.Maui.Controls.Application.Current?.Windows;
          if (windows == null) { return; }
          foreach (Microsoft.Maui.Controls.Window w in windows) {
            if (w?.Handler?.PlatformView is Microsoft.UI.Xaml.Window xw && paintWindowGround(xw, c)) { changed = true; } } }
        string argb = c.A.ToString("x2") + c.R.ToString("x2") + c.G.ToString("x2") + c.B.ToString("x2");
        if (changed && argb != windowGroundArgb) { windowGroundArgb = argb; SPIXI.P1Perf.line("winground set=" + argb); } }
      catch (Exception e) { IXICore.Meta.Logging.warn("window ground not applied: " + e.GetType().Name); } }`);
  r.paint = whole(bodyOf(app, 'private static bool paintWindowGround(Microsoft.UI.Xaml.Window xw, global::Windows.UI.Color c)'), `{
      if (xw.Content is not Microsoft.UI.Xaml.Controls.Panel root) { return false; }
      if (root.Background is Microsoft.UI.Xaml.Media.SolidColorBrush b
        && b.Color.A == c.A && b.Color.R == c.R && b.Color.G == c.G && b.Color.B == c.B) { return false; }
      root.Background = new Microsoft.UI.Xaml.Media.SolidColorBrush(c);
      return true; }`)
    && /private static string\? windowGroundArgb = null;/.test(app);
  /* the window mapper paints the first frame — its LAST statement, after the size pass */
  const mapAt = app.indexOf('Microsoft.Maui.Handlers.WindowHandler.Mapper.AppendToMapping(nameof(IWindow), (handler, view) =>');
  const mapper = mapAt < 0 ? '' : bodyOf(app.slice(mapAt), '(handler, view) =>');
  r.mapper = /appWindow\.Changed \+= \(sender, args\) =>[\s\S]*\};\s*applyWindowGround\(nativeWindow\);\s*\}$/.test(mapper);
  /* every surface pass re-applies it — in applyPageSurfaceColor, Windows only, OUTSIDE the `_webView != null` block
     (a page without a WebView still follows the theme), and nowhere else in the shared code */
  const surf = bodyOf(scp, 'internal void applyPageSurfaceColor()');
  r.hook = /Logging\.warn\("applyPageSurfaceColor: WebView2 DefaultBackgroundColor not applied: " \+ ex\.Message\);\s*\}\s*#endif\s*\}\s*#if WINDOWS\s*global::Spixi\.WinUI\.App\.applyWindowGround\(\);\s*#endif\s*if \(\(loadedHtmlFileName \?\? ""\) == "lock\.html"\)/.test(surf);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const users = walk('Spixi').filter((f) => /applyWindowGround\(/.test(stripCode(rd(f))));
  r.onlyHere = users.length === 2 && users.includes('Spixi/Platforms/Windows/App.xaml.cs') && users.includes('Spixi/Utils/SpixiContentPage.cs')
    && (scp.match(/applyWindowGround\(/g) || []).length === 1 && (app.match(/applyWindowGround\(/g) || []).length === 3;
  ok(Object.values(r).every((x) => x === true),
    '★ S12 D (#1267) resize band (Windows candidate): the window\'s XAML root Panel (MAUI WindowRootViewContainer) is painted with the THEME-level app ground (ThemeManager.getSurfaceColorString) from the window mapper and on every surface pass (applyPageSurfaceColor, outside the WebView block, #if WINDOWS) — main thread, set only when different, `[P1] winground set=<argb8>` once per new value; nothing on Android / iOS / Mac (bodies WHOLE) — ' + JSON.stringify(r) + ' users: ' + JSON.stringify(users));
}
