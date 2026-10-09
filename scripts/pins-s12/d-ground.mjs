/* ==== S12 D → ★ S13 (#1275, Damir 2026-10-09 09:59): the window-root ground is REMOVED ====
 * S12 painted MAUI's WindowRootViewContainer (Window.Content, a Panel) with the app ground to hide the resize band. The band
 * did not change (#1272: a WinUI 3 platform defect), and in LIGHT mode the light root sat under MAUI's title bar, so the
 * system (dark) title bar and its white caption went light-on-light ("Spixi IM" invisible). This pin now holds the REMOVAL:
 * no C# file paints the window root (no applyWindowGround / paintWindowGround, no `root.Background =` on a Window.Content Panel).
 * Deliberate break (S13 lead): put the applyPageSurfaceColor call back → onlyGone false. */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCode } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const files = walk('Spixi');
  const users = files.filter((f) => /\b(applyWindowGround|paintWindowGround|windowGroundArgb)\b/.test(stripCode(rd(f))));
  const app = stripCode(rd('Spixi/Platforms/Windows/App.xaml.cs'));
  const r = {
    onlyGone: users.length === 0,
    noRootPaint: !/xw\.Content is not Microsoft\.UI\.Xaml\.Controls\.Panel root/.test(app) && !/\broot\.Background = new Microsoft\.UI\.Xaml\.Media\.SolidColorBrush/.test(app),
    mapperKept: /Microsoft\.Maui\.Handlers\.WindowHandler\.Mapper\.AppendToMapping\(nameof\(IWindow\), \(handler, view\) =>/.test(app),
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S13 (#1275): the S12 window-root ground is gone — no C# paints MAUI\'s WindowRootViewContainer (it lightened the Windows title bar in light mode; the resize band is a platform defect, #1272); the window mapper stays — ' + JSON.stringify(r));
}
