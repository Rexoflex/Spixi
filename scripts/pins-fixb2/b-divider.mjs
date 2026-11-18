/* ==== fixb2 item 2 (MC n-20261117-desktop-divider-line-align, Windows walk of Fix batch 1, row W-3) — Desktop: the 2 px accent line of
 * the chat-list divider covers the shell's hairline, and the double-click reset gives a wider list (Windows + Mac).
 *
 * Mechanism: work copy `_mechanism.md` (fixb2 builder-b) — MEASURED by scripts/pins-fixb2/b-hairline-sweep.mjs on the built home shell
 * (Chromium, W 400 / 440, scale 1 / 1.5, light / dark): the visible hairline is the home shell's `:root[data-desktop] body::after`
 * (src/shells/home.html), a fixed 1 CSS px strip at inset-inline-end 0 = the LAST CSS px of the home WebView; the WebView is the only
 * content of Grid.Column 0 (Fill, no margin), so its trailing edge IS the column edge, the trailing edge of the grip. The line had
 * `Margin="0,0,4,0"` (centred in the 10 px grip) → DIP [W−6, W−4], 4 px left of the hairline [W−1, W]. Fix: margin 0 → [W−2, W]: the
 * line's trailing edge = the hairline's, the hairline covered whole (1 CSS px = 1 DIP at zoom 100 %; WebView2: logical size ×
 * RasterizationScale = raw pixels; WebKit: one CSS px = one point). Reset width: 400 → 440 (the dial, 🟡 Damir judges at the walk), one
 * constant = the first-run default and the reset.
 * This SOURCE pin (the position is DERIVED from the shell CSS + the tokens + the XAML, not from a constant of its own):
 *   HAIRLINE — in src/shells/home.html AND the built index.html: exactly ONE `body::after` rule, `:root[data-desktop] body::after`, with
 *              content '' · position fixed · top 0 · bottom 0 · inset-inline-end <e> · width var(--outline-width-1) and no margin / border /
 *              box-shadow / transform / left / right / translate of its own; <e> and the token (src/styles/tokens.css and the built
 *              spixi.tokens.css) give the hairline's span from the trailing edge [e, e + t];
 *   COLUMN   — the WebView is in Grid.Column 0 with Fill / Fill and no Margin / ColumnSpan, column 0 is the first column; the grip is End in
 *              column 0 with no Margin (the window's trailing edge = the column edge = the grip's trailing edge);
 *   POSITION — the line is End in column 0; from its Margin (right mR) and WidthRequest w its span from the trailing edge is [mR, mR + w]:
 *              covers = mR ≤ e AND mR + w ≥ e + t; sameEdge = mR = e; inside the grip = mR + w ≤ grip width; atEveryScale (★ #46 r1 N-1,
 *              was true by construction) = the device-pixel model of WinUI layout rounding (offset and size rounded apart, every drag
 *              width min…max, scale 1 / 1.25 / 1.5 / 1.75 / 2, round half up; the reset width also half to even): never undershoots;
 *   KEPT     — the line keeps x:Name, WidthRequest="2", InputTransparent="True", IsVisible="False" (contract § 3);
 *   RESET    — ONE `private const double leftPaneDefaultWidth = 440;` (= the old 400 + 40, inside [leftPaneMinWidth, leftPaneMaxWidth]);
 *              the double-click handler sets `leftPaneWidth = leftPaneDefaultWidth;`, applies and stores it, then `updateInfoPaneWidth();`
 *              (★ #46 r1 O2, key refitsInfoPane: the same re-fit after applyLeftPaneWidth as the pan's Running arm — with chat info open a
 *              wider list must never squeeze the conversation below detailMinWidth); the first-run read and the NaN fallback take the
 *              same constant; no other literal is written to leftPaneWidth;
 *   OFF      — switch DividerHoverLine OFF = no line: the XAML starts it hidden; every write of `paneDividerLine.IsVisible` is `= false` or
 *              `= show`, and `show` (read from applyPaneDividerLine and EVALUATED for every state with the switch false) is never true;
 *              the hover handlers exist only inside `if (SpixiFlags.DividerHoverLine)`.
 * Deliberate breaks (#802, fixb2 builder-b report; each a one-token mutation in a full temp copy, then restored): see the report. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const px = (v) => { const m = /^\s*(-?\d+(?:\.\d+)?)(px)?\s*$/.exec(String(v)); return m ? Number(m[1]) : NaN; };

  /* ── HAIRLINE: the rule that paints it, in the source shell and in the built shell ── */
  const cssOf = (html) => stripCode([...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n'));
  const rulesFor = (css, needle) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes(needle)).map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), decl: Object.fromEntries(m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; })) }));
  const tokenPx = (f, name) => { const m = new RegExp('--' + name + ':\\s*([^;]+);').exec(stripCode(raw(f))); return m ? px(m[1]) : NaN; };
  const hair = (f, tokFile) => {
    const all = rulesFor(cssOf(raw(f)), 'body::after');
    const r = all.length === 1 && all[0].sel === ':root[data-desktop] body::after' ? all[0].decl : null;
    const allowed = ['content', 'position', 'top', 'bottom', 'inset-inline-end', 'width', 'background', 'z-index', 'pointer-events'];
    const tokName = r ? (/^var\(--([\w-]+)\)$/.exec(r.width || '') || [])[1] : undefined;
    const t = tokName ? tokenPx(tokFile, tokName) : NaN;
    const good = !!r && r.content === "''" && r.position === 'fixed' && px(r.top) === 0 && px(r.bottom) === 0 && Number.isFinite(px(r['inset-inline-end']))
      && tokName === 'outline-width-1' && t > 0 && Object.keys(r).every((k) => allowed.includes(k));
    return { good, e: r ? px(r['inset-inline-end']) : NaN, t, rules: all.length, keys: r ? Object.keys(r) : [] };
  };
  const hs = hair('src/shells/home.html', 'src/styles/tokens.css');
  const hb = hair('Spixi/Resources/Raw/html/index.html', 'Spixi/Resources/Raw/html/spixi.tokens.css');
  const hr = { source: hs.good, built: hb.good, sameInBoth: hs.e === hb.e && hs.t === hb.t };
  ok(F(hr).length === 0,
    '★ fixb2 item 2 HAIRLINE: the visible divider hairline is ONE rule `:root[data-desktop] body::after` (content \'\' · fixed · top 0 · bottom 0 · inset-inline-end e · width var(--outline-width-1), nothing else that moves it) in src/shells/home.html AND the built index.html, the same e and token width t in both — failing: ' + JSON.stringify(F(hr)) + ' ' + JSON.stringify({ hs, hb }));

  /* ── COLUMN + POSITION: the XAML ── */
  const X = raw('Spixi/Pages/Home/HomePage.xaml').replace(/<!--[\s\S]*?-->/g, '');
  const attrsOf = (src) => Object.fromEntries([...src.matchAll(/([\w.:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
  const el = (re) => { const m = re.exec(X); return m ? attrsOf(m[1]) : null; };
  const WA = el(/<WebView x:Name="webView"([^>]*)\/>/) || {}, LA = el(/<BoxView x:Name="paneDividerLine"([^>]*)\/>/) || {}, GA = el(/<BoxView x:Name="paneDivider"([^>]*)\/>/) || {};
  const cols = [...(/<Grid\.ColumnDefinitions>([\s\S]*?)<\/Grid\.ColumnDefinitions>/.exec(X) || ['', ''])[1].matchAll(/<ColumnDefinition\b/g)].length;
  const margin = (s) => { if (s === undefined) return [0, 0, 0, 0]; const v = String(s).split(',').map(Number); return v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v; };
  const co = {
    webviewIsColumn0: WA['Grid.Column'] === '0' && WA.HorizontalOptions === 'Fill' && WA.VerticalOptions === 'Fill' && !('Margin' in WA) && !('Grid.ColumnSpan' in WA) && !('WidthRequest' in WA) && cols === 3,
    gripAtColumnEdge: GA['Grid.Column'] === '0' && GA.HorizontalOptions === 'End' && !('Margin' in GA) && !('TranslationX' in GA) && px(GA.WidthRequest) > 0,
  };
  ok(F(co).length === 0,
    '★ fixb2 item 2 COLUMN: the home WebView fills Grid.Column 0 (no margin, no span, no width of its own) — its trailing edge, where the shell\'s inset-inline-end 0 lands, IS the column edge; the grip is End in column 0 with no margin (its trailing edge is the same edge) — failing: ' + JSON.stringify(F(co)) + ' ' + JSON.stringify({ WA, GA, cols }));

  const HP = stripCode(raw('Spixi/Pages/Home/HomePage.xaml.cs'));
  const num = (n) => { const m = new RegExp('private const double ' + n + ' = (\\d+(?:\\.\\d+)?);').exec(HP); return m ? Number(m[1]) : NaN; };
  const [, , mR] = margin(LA.Margin);
  const w = px(LA.WidthRequest), gw = px(GA.WidthRequest), e = hb.e, t = hb.t;
  /* ★ #46 r1 N-1: the device-pixel model, WinUI layout rounding (UseLayoutRounding: the OFFSET and the SIZE of each element are rounded
   * apart, left to right from the column start). Column 0 width W (DIP, any width the drag can give: min…max in 0.1 steps), scale s:
   *   WebView  right R  = r(W·s)                          → the hairline paints the device columns that overlap (R − t·s, R − e·s)
   *   line     left  Ld = r((W − mR − w)·s), right Rd = Ld + r(w·s)
   * PASS = the line never UNDERSHOOTS: Rd ≥ the hairline's last painted column + 1 and Ld ≤ its first painted column, for every W at
   * s 1 · 1.25 · 1.5 · 1.75 · 2 with r = round half up (floor(x + 0.5), the rule this pin assumes for WinUI); AND at the reset width
   * with r = round half to even as well. Measured beside it, not asserted: the overshoot past R (≤ 1 device column) and the share of
   * widths a half-to-even rounding would undershoot (reported in the failure text and the fixb2 report: 1.25 → half the widths). */
  const halfUp = (x) => Math.floor(x + 0.5 + 1e-9);
  const halfEven = (x) => { const f = Math.floor(x + 1e-9), d = x - f; return Math.abs(d - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); };
  const fits = (W, s, r) => {
    const R = r(W * s), hFirst = Math.floor(R - (e + t) * s + 1e-9), hLast = Math.ceil(R - e * s - 1e-9) - 1;
    const Ld = r((W - mR - w) * s), Rd = Ld + r(w * s);
    return { ok: Ld <= hFirst && Rd >= hLast + 1, over: Rd - R };
  };
  const SCALES = [1, 1.25, 1.5, 1.75, 2];
  const widths = []; for (let k = Math.round(num('leftPaneMinWidth') * 10); k <= Math.round(num('leftPaneMaxWidth') * 10); k++) widths.push(k / 10);
  const resetW = num('leftPaneDefaultWidth');
  const scaleRows = SCALES.map((s) => ({ s, under: widths.filter((W) => !fits(W, s, halfUp).ok).length, maxOver: Math.max(...widths.map((W) => fits(W, s, halfUp).over)), evenUnder: widths.filter((W) => !fits(W, s, halfEven).ok).length }));
  const scaleOk = widths.length > 1000 && scaleRows.every((x) => x.under === 0) && SCALES.every((s) => fits(resetW, s, halfUp).ok && fits(resetW, s, halfEven).ok);
  const dev = (s) => { const R = halfUp(resetW * s), Ld = halfUp((resetW - mR - w) * s); return { W: resetW, R, line: [Ld, Ld + halfUp(w * s)] }; };
  const po = {
    lineEndInColumn0: LA['Grid.Column'] === '0' && LA.HorizontalOptions === 'End' && !('TranslationX' in LA) && !('Grid.ColumnSpan' in LA),
    covers: Number.isFinite(mR) && mR <= e && mR + w >= e + t,
    sameEdge: mR === e,
    insideGrip: mR >= 0 && mR + w <= gw,
    atEveryScale: scaleOk,
  };
  ok(F(po).length === 0,
    '★ fixb2 item 2 POSITION: the 2 px line paneDividerLine (End, column 0) spans [mR, mR + w] from the trailing edge; the hairline spans [e, e + t] (shell CSS + token); the line COVERS the hairline and shares its trailing edge, stays under the grip, and in device pixels (WinUI rounding: offset and size apart, every drag width, scale 1 / 1.25 / 1.5 / 1.75 / 2) never undershoots the hairline — failing: ' + JSON.stringify(F(po)) + ' ' + JSON.stringify({ line: [mR, mR + w], hairline: [e, e + t], grip: gw, margin: LA.Margin, dev15: dev(1.5), scaleRows }));

  /* ── KEPT (contract § 3) ── */
  const kp = { name: count(X, 'x:Name="paneDividerLine"') === 1, width2: LA.WidthRequest === '2', inputTransparent: LA.InputTransparent === 'True', hiddenAtStart: LA.IsVisible === 'False' };
  ok(F(kp).length === 0, '★ fixb2 item 2 KEPT: paneDividerLine keeps its name, WidthRequest="2", InputTransparent="True", IsVisible="False" (only its position changes) — failing: ' + JSON.stringify(F(kp)));

  /* ── RESET ── */
  const OLD_RESET = 400, DIAL = 40;   // the dial of the item: today's reset value + 40 px (🟡 Damir judges at the walk)
  const cm = [...HP.matchAll(/private const double leftPaneDefaultWidth = (\d+(?:\.\d+)?);/g)];
  const val = cm.length === 1 ? Number(cm[0][1]) : NaN;
  const writes = [...HP.matchAll(/\bleftPaneWidth\s*=(?!=)\s*([^;]+);/g)].map((m) => m[1].trim());
  const rs = {
    oneConstant: cm.length === 1 && count(HP, /\bleftPaneDefaultWidth\s*=(?!=)/g) === 1,
    dialValue: val === OLD_RESET + DIAL,
    inRange: val >= num('leftPaneMinWidth') && val <= num('leftPaneMaxWidth'),
    resetHandler: /dividerReset\.Tapped \+= \(s, ev\) =>\s*\{\s*leftPaneWidth = leftPaneDefaultWidth;\s*applyLeftPaneWidth\(\);\s*Preferences\.Default\.Set\("leftPaneWidth", leftPaneWidth\);\s*updateInfoPaneWidth\(\);\s*\};/.test(HP),
    /* ★ #46 r1 O2: the reset re-fits the info pane (col 2) exactly as the pan's Running arm does — both paths change col 0, both call the
     * ONE re-fit (#247: the conversation keeps >= detailMinWidth; the pane shrinks or closes) right after applyLeftPaneWidth */
    refitsInfoPane: (() => {
      const body = (/dividerReset\.Tapped \+= \(s, ev\) =>\s*\{([^}]*)\};/.exec(HP) || ['', ''])[1];
      const run = (/case GestureStatus\.Running:([\s\S]*?)break;/.exec(HP) || ['', ''])[1];
      const after = (t) => { const a = t.indexOf('applyLeftPaneWidth();'), u = t.indexOf('updateInfoPaneWidth();'); return a >= 0 && u > a && count(t, 'updateInfoPaneWidth();') === 1; };
      return after(body) && after(run) && /private void updateInfoPaneWidth\(\)\s*\{\s*if \(!infoPaneCol2Open\)\s*\{\s*return;\s*\}\s*double avail = Width - mainGrid\.ColumnDefinitions\[0\]\.Width\.Value - detailMinWidth;/.test(HP);
    })(),
    firstRunSame: count(HP, 'Preferences.Default.Get("leftPaneWidth", leftPaneDefaultWidth)') === 1 && /private double leftPaneWidth = leftPaneDefaultWidth;/.test(HP),
    nanFallbackSame: /if \(double\.IsNaN\(w\) \|\| double\.IsInfinity\(w\)\)\s*\{\s*return leftPaneDefaultWidth;\s*\}/.test(HP),
    noOtherLiteral: writes.every((v) => !/^\d/.test(v)),
  };
  ok(F(rs).length === 0,
    '★ fixb2 item 2 RESET: ONE constant leftPaneDefaultWidth = ' + (OLD_RESET + DIAL) + ' (today ' + OLD_RESET + ' + the dial ' + DIAL + ', inside min / max); the double-click sets the list to it, stores it and re-fits the info pane (as the pan does); the first-run default and the NaN fallback are the same constant; no literal is written to leftPaneWidth — failing: ' + JSON.stringify(F(rs)) + ' ' + JSON.stringify({ val, writes }));

  /* ── OFF: switch DividerHoverLine OFF = no line (the show rule EVALUATED with the switch false) ── */
  const apply = (/private void applyPaneDividerLine\(\)\s*\{([\s\S]*?)\n\s*\}\n/.exec(HP) || ['', ''])[1];
  const showExpr = (/bool show = ([^;]+);/.exec(apply) || ['', ''])[1];
  const idents = [...new Set(showExpr.match(/[A-Za-z_][\w.]*/g) || [])];
  const evalShow = (env) => { if (!/^[\w.\s&|!()]+$/.test(showExpr)) return null; let js = showExpr; for (const id of idents.sort((a, b) => b.length - a.length)) js = js.split(id).join('ENV[' + JSON.stringify(id) + ']'); return Function('ENV', 'return !!(' + js + ');')(env); };
  const states = [];
  for (const g of [false, true]) for (const v of [false, true]) states.push({ 'SpixiFlags.DividerHoverLine': false, 'paneDivider.IsVisible': g, 'paneDividerLineState.visible': v });
  const visWrites = [...HP.matchAll(/paneDividerLine\.IsVisible\s*=(?!=)\s*([^;]+);/g)].map((m) => m[1].trim());
  const hoverAdds = [...HP.matchAll(/dividerLineHover\.Pointer\w+ \+=/g)].map((m) => m.index);
  const gateAt = HP.indexOf('if (SpixiFlags.DividerHoverLine)\n');
  const gateEnd = (() => { const o = HP.indexOf('{', gateAt); let d = 0; for (let k = o; k < HP.length; k++) { if (HP[k] === '{') d++; else if (HP[k] === '}' && --d === 0) return k; } return -1; })();
  const of = {
    hiddenInXaml: LA.IsVisible === 'False',
    showReadsTheSwitch: idents.includes('SpixiFlags.DividerHoverLine') && idents.length === 3,
    neverShownWhenOff: states.every((s) => evalShow(s) === false),
    shownWhenOnAndHovered: evalShow({ 'SpixiFlags.DividerHoverLine': true, 'paneDivider.IsVisible': true, 'paneDividerLineState.visible': true }) === true,
    onlyWrites: visWrites.length === 2 && visWrites.every((v) => v === 'show' || v === 'false'),
    handlersInsideGate: gateAt > 0 && hoverAdds.length === 3 && hoverAdds.every((i) => i > gateAt && i < gateEnd),
  };
  ok(F(of).length === 0,
    '★ fixb2 item 2 OFF: switch DividerHoverLine OFF = no line — the XAML starts it hidden, every write of paneDividerLine.IsVisible is `false` or `show`, the show rule of applyPaneDividerLine EVALUATED with the switch false is false in every grip / hover state (and true with it on, the grip shown and a hover), the hover handlers exist only inside `if (SpixiFlags.DividerHoverLine)` — failing: ' + JSON.stringify(F(of)) + ' ' + JSON.stringify({ showExpr, visWrites }));
}
