/* ==== fixb1 item 4 (P51) — Desktop: the hover / drag line of the chat-list divider (Windows + Mac).
 *
 * Mechanism: docs/fixb1-mechanisms.md § Item 4 (the grip `paneDivider` is a native, transparent 10 px BoxView over the home
 * WebView; nothing showed a hover). Fix: a second BoxView `paneDividerLine` (2 px, centred in the grip [superseded by fixb2 item 2: at the column edge], input-transparent,
 * below it) that shows in the accent of the active theme while the pointer is on the grip and for the whole drag. The state
 * rule is pure (FixB1Rules.DividerLine, executed in csh FixB1Tests); this SOURCE pin (stripCode; brace-matched bodies; the
 * preprocessor regions computed) holds the MAUI-bound half:
 *   XAML   — ONE `paneDividerLine`: Grid.Column 0, WidthRequest 2, End, VerticalOptions Fill, Margin 0,0,4,0 [superseded by fixb2 item 2: 0,0,0,0, key `atEdge`] (centred: right margin +
 *            half the width = half the grip's width), NO ZIndex (neither on the line nor on the grip: the order of declaration alone
 *            puts the line under the grip — #46 r1 O-C-1/2), InputTransparent True, IsVisible False, declared AFTER the WebView and BEFORE
 *            `paneDivider` (under the grip, above the WebView, before any overlay stage); the grip itself unchanged; no code-behind write of
 *            `paneDivider(Line).ZIndex` or `.InputTransparent` anywhere (key SHOW `onlyWriters`, #46 r1 O-C-3);
 *   WIRE   — every line of the feature is inside `#if WINDOWS || MACCATALYST` (phones: nothing); ONE state object; the
 *            hover handlers are added ONLY inside `if (SpixiFlags.DividerHoverLine)` (Windows: a new PointerGestureRecognizer;
 *            Mac: the cursor's own recognizer); Entered + Moved → hoverEnter, Exited → hoverExit;
 *   PAN    — Started and the first Running tick → dragStart; the shared Completed / Canceled arm → dragEnd; each gated by the
 *            switch and followed by applyPaneDividerLine;
 *   SHOW   — applyPaneDividerLine: shown = switch AND paneDivider.IsVisible AND state.visible; the colour is set at EVERY apply while
 *            shown (`if (show)` — a theme flip during a hover or a drag takes the new accent; #46 r1 colour change) from ThemeManager.getResolvedAppearanceName(): "dark" → brand-400, else brand-600 (read from
 *            src/styles/tokens.css); the single-pane site (`paneDivider.IsVisible = false`) hides the line and ends the state;
 *            no other site writes the line's IsVisible;
 *   KEPT   — the Windows ↔ cursor block and the Mac SMacCursor recognizer are today's text.
 *   EXACT   — ★ #46 r2 (R2-2 / R2-3 / R2-4): the attribute reader above saw only `name="value"`, so `ZIndex='500'`, `ZIndex ="500"`, `Opacity="0"`,
 *             `HeightRequest="1" TranslationX="-200"`, a grip `InputTransparent='True'`, `paneDividerLine.ZIndex += 500;`,
 *             `paneDivider.SetValue(VisualElement.ZIndexProperty, -1);`, `paneDivider.InputTransparent |= true;`, a colour read from the line's own
 *             IsVisible, and `private void applyPaneDividerLine() => …; private void applyPaneDividerLine2()` stayed green. Now the WHOLE text is held:
 *             (a) both XAML elements — `<BoxView x:Name="paneDividerLine" … />` and `<BoxView x:Name="paneDivider" … />` — equal their exact
 *             whitespace-normalised text (the grip's is its base text, efcde241), they are the ONLY BoxViews of the page and the only two mentions of
 *             the names in the XAML, and the app's one implicit BoxView style sets only Color; (b) in HomePage.xaml.cs (comments stripped) the LIST of
 *             lines that mention `paneDivider` (any case: `applyPaneDividerLine`, `paneDividerLineState` …) equals the expected list, in order — the
 *             base lines plus the batch's lines; no other file of Spixi/ names it; (c) the exact bodies of `applyPaneDividerLine` and of the
 *             `if (SpixiFlags.DividerHoverLine) { … }` block, with only whitespace between each signature / `if (…)` and its `{`; (d) no line that names
 *             paneDivider also names `ZIndexProperty`, `InputTransparentProperty` or `SetValue(`.
 *   WHOLE   — ★ #46 r4 (R4-4 / R4-5): HomePage.xaml.cs has only \n / \r\n line ends and no \u escape outside a literal; onPaneDividerPan, the D1 block and the single-pane hide block are held exactly.
 * re-based by fixb2 item 2 (the line moved onto the shell's hairline: Margin 0,0,4,0 → 0,0,0,0 in `xamlLine` and LINE_X; `centred` →
 *   `atEdge` (right margin 0 = the column edge = the hairline's inset-inline-end 0; the measured position is pins-fixb2/b-divider + the
 *   Chromium sweep pins-fixb2/b-hairline-sweep); XAML_FROZEN bef9f8f5… → 992a99e2…, after a look at the diff: the margin and its comment only).
 * re-based by fixb2 item 2 (#46 r1 O2: D1_BLOCK — the double-click reset calls `updateInfoPaneWidth();` after storing the width, as the pan's
 *   Running arm does; after a look at the diff: that one statement only).
 * Deliberate breaks (#802): fixb1 builder-a report — the `if (SpixiFlags.DividerHoverLine)` gate removed → red `gated`;
 * the Canceled/Completed dragEnd removed → red `panEnd`; WidthRequest="3" → red `xamlLine`; the hide site's
 * `paneDividerLine.IsVisible = false;` removed → red `hideSite`; "#769DFF" → "#769DFE" → red `colours`; the Mac `pop()` call
 * removed → red `macCursorKept`. #46 r1 (fixb1 fixer): `ZIndex="500"` on the line → red `xamlLine`; `ZIndex="-1"` on the grip → red
 * `gripKept`; `paneDividerLine.ZIndex = 50;` in code → red `onlyWriters`; `VerticalOptions="Start"` on the line → red `xamlLine`;
 * `if (show && !paneDividerLine.IsVisible)` back → red `showRule`. #46 r2 (R2-2…R2-4): every mutation named in EXACT above → red EXACT
 * (XAML: `xamlText` / `gripText`; code: `mentions` / `applyBody` / `hoverBody` / `noPropertyWrites`). Restored. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rd = (f) => stripCode(raw(f));
  const span = (t, sig, from = 0) => {
    const at = t.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
    const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, end: k + 1, text: t.slice(o, k + 1) }; }
    return { at, end: -1, text: '' };
  };
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\n]*#[^\S\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { const c = st.pop(); st.push('!' + c); }
    }
    return st;
  };
  const DESK = 'WINDOWS || MACCATALYST';
  const allAt = (t, s) => { const r = []; let i = t.indexOf(s); while (i >= 0) { r.push(i); i = t.indexOf(s, i + 1); } return r; };

  /* ── XAML ── */
  /* ★ #46 r3 (R3-4): the XAML is read RAW with only the XML comments removed — stripCode is a C# stripper and dropped the text after a `//` inside an attribute value */
  const X = raw('Spixi/Pages/Home/HomePage.xaml').replace(/<!--[\s\S]*?-->/g, '');
  const el = (name) => { const m = new RegExp('<BoxView x:Name="' + name + '"([^>]*)/>').exec(X); return m ? { at: m.index, attrs: Object.fromEntries([...m[1].matchAll(/([\w.:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])) } : null; };
  const line = el('paneDividerLine'), grip = el('paneDivider');
  const iWeb = X.indexOf('<WebView x:Name="webView"');
  const LA = line ? line.attrs : {}, GA = grip ? grip.attrs : {};
  const xm = {
    found: !!line && !!grip && count(X, 'x:Name="paneDividerLine"') === 1,
    xamlLine: LA['Grid.Column'] === '0' && LA.WidthRequest === '2' && LA.HorizontalOptions === 'End' && LA.Margin === '0,0,0,0'
      && LA.VerticalOptions === 'Fill' && !('ZIndex' in LA)
      && LA.InputTransparent === 'True' && LA.IsVisible === 'False' && !('Grid.ColumnSpan' in LA) && !('Color' in LA) && !('BackgroundColor' in LA),
    atEdge: (() => { const m = (LA.Margin || '').split(',').map(Number); return m.length === 4 && m.every((v) => v === 0) && Number(LA.WidthRequest) <= Number(GA.WidthRequest); })(),   // re-based by fixb2 item 2: was `centred` (right margin + half the width = half the grip)
    order: !!line && !!grip && iWeb >= 0 && iWeb < line.at && line.at < grip.at,
    gripKept: GA['Grid.Column'] === '0' && GA.WidthRequest === '10' && GA.HorizontalOptions === 'End' && GA.Color === 'Transparent'
      && GA.BackgroundColor === 'Transparent' && GA.IsVisible === 'False' && !('InputTransparent' in GA) && !('ZIndex' in GA),
  };
  ok(F(xm).length === 0,
    '★ fixb1 item 4 XAML: ONE BoxView paneDividerLine — column 0, 2 px, End, VerticalOptions Fill, no ZIndex, Margin 0,0,0,0 (at the column edge, over the shell hairline — fixb2 item 2), input-transparent, hidden at start, no colour of its own in XAML — declared after the WebView and BEFORE paneDivider (under the grip); the grip is unchanged (no ZIndex) — failing: ' + JSON.stringify(F(xm)) + ' ' + JSON.stringify({ line: LA }));

  /* ── WIRE ── */
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const feat = ['paneDividerLineState', 'paneDividerLine.', 'applyPaneDividerLine(', 'SpixiFlags.DividerHoverLine', 'dividerLineHover', 'FixB1Rules.'];
  const notDesk = feat.flatMap((s) => allAt(HP, s).filter((i) => !regionsAt(HP, i).includes(DESK)).map(() => s));
  const iGate = HP.indexOf('if (SpixiFlags.DividerHoverLine)\n');
  const gate = iGate >= 0 ? span(HP, 'if (SpixiFlags.DividerHoverLine)\n', iGate - 1) : { text: '' };
  const wr = {
    desktopOnly: notDesk.length === 0 && feat.every((x) => count(HP, x) > 0),
    oneState: count(HP, 'new FixB1Rules.DividerLine()') === 1
      && /private readonly FixB1Rules\.DividerLine paneDividerLineState = new FixB1Rules\.DividerLine\(\);/.test(HP),
    gated: gate.text.length > 0 && /^\{\s*#if MACCATALYST\s*PointerGestureRecognizer dividerLineHover = dividerHover;\s*#else\s*PointerGestureRecognizer dividerLineHover = new PointerGestureRecognizer\(\);\s*paneDivider\.GestureRecognizers\.Add\(dividerLineHover\);\s*#endif\s*dividerLineHover\.PointerEntered \+= \(s, ev\) => \{ paneDividerLineState\.hoverEnter\(\); applyPaneDividerLine\(\); \};\s*dividerLineHover\.PointerMoved \+= \(s, ev\) => \{ paneDividerLineState\.hoverEnter\(\); applyPaneDividerLine\(\); \};\s*dividerLineHover\.PointerExited \+= \(s, ev\) => \{ paneDividerLineState\.hoverExit\(\); applyPaneDividerLine\(\); \};\s*\}$/.test(gate.text)
      && count(HP, 'dividerLineHover.') === 3 && count(HP, 'GestureRecognizers.Add(dividerLineHover)') === 1
      && count(HP, 'new PointerGestureRecognizer()') === 2 && count(HP, 'paneDividerLineState.hoverEnter()') === 2 && count(HP, 'paneDividerLineState.hoverExit()') === 1,
    afterMacBlock: (() => { const iMac = HP.indexOf('paneDivider.GestureRecognizers.Add(dividerHover);'); return iMac > 0 && iGate > iMac; })(),
  };
  ok(F(wr).length === 0,
    '★ fixb1 item 4 WIRE: every line of the feature sits inside `#if WINDOWS || MACCATALYST` (phones: nothing); ONE FixB1Rules.DividerLine; the hover handlers exist ONLY inside `if (SpixiFlags.DividerHoverLine)` — Windows adds a new PointerGestureRecognizer to paneDivider, the Mac uses the cursor\'s own recognizer; PointerEntered + PointerMoved → hoverEnter, PointerExited → hoverExit, each then applyPaneDividerLine — failing: ' + JSON.stringify(F(wr)) + (notDesk.length ? ' outside: ' + notDesk.join(',') : ''));

  /* ── PAN ── */
  const pan = span(HP, 'private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e)').text;
  const CALL = (v) => '#if WINDOWS \\|\\| MACCATALYST\\s*if \\(SpixiFlags\\.DividerHoverLine\\) \\{ paneDividerLineState\\.' + v + '\\(\\); applyPaneDividerLine\\(\\); \\}\\s*#endif';
  const pn = {
    found: pan.length > 0,
    panStart: new RegExp('case GestureStatus\\.Started:\\s*panStartPaneWidth = leftPaneWidth;\\s*paneDividerPanning = true;\\s*Logging\\.info\\("\\[DIVIDER\\] pan started"\\);\\s*' + CALL('dragStart') + '\\s*break;').test(pan),
    panFirstRunning: new RegExp('case GestureStatus\\.Running:\\s*if \\(!paneDividerPanning\\)\\s*\\{\\s*panStartPaneWidth = leftPaneWidth;\\s*paneDividerPanning = true;\\s*' + CALL('dragStart') + '\\s*\\}').test(pan),
    panEnd: new RegExp('case GestureStatus\\.Completed:\\s*case GestureStatus\\.Canceled:\\s*paneDividerPanning = false;[\\s\\S]*?' + CALL('dragEnd') + '\\s*break;\\s*\\}\\s*\\}$').test(pan)
      && count(pan, 'case GestureStatus.') === 4,
    counts: count(HP, 'paneDividerLineState.dragStart()') === 2 && count(pan, 'paneDividerLineState.dragEnd()') === 1 && count(HP, 'paneDividerLineState.dragEnd()') === 2,
  };
  ok(F(pn).length === 0,
    '★ fixb1 item 4 PAN: onPaneDividerPan — Started and the first Running tick (WinUI can skip Started) call dragStart; the shared Completed / Canceled arm calls dragEnd (both pan ends; it ends the hover too); each behind the switch, then applyPaneDividerLine — failing: ' + JSON.stringify(F(pn)));

  /* ── SHOW ── */
  const apply = span(HP, 'private void applyPaneDividerLine()');
  const TOK = raw('src/styles/tokens.css');
  const tok = (n) => { const m = new RegExp('--' + n + ':\\s*(#[0-9a-fA-F]{6});').exec(TOK); return m ? m[1].toLowerCase() : ''; };
  const colM = /Microsoft\.Maui\.Graphics\.Color\.FromArgb\(ThemeManager\.getResolvedAppearanceName\(\) == "dark" \? "(#[0-9A-Fa-f]{6})" : "(#[0-9A-Fa-f]{6})"\)/.exec(apply.text);
  const TM = rd('Spixi/Utils/ThemeManager.cs');
  const offSites = allAt(HP, 'paneDivider.IsVisible = false;');
  const sh = {
    found: apply.text.length > 0 && count(HP, 'private void applyPaneDividerLine()') === 1 && regionsAt(HP, apply.at).join('|') === DESK,
    showRule: /^\{\s*bool show = SpixiFlags\.DividerHoverLine && paneDivider\.IsVisible && paneDividerLineState\.visible;\s*if \(show\)\s*\{\s*paneDividerLine\.Color = [^;]+;\s*\}\s*paneDividerLine\.IsVisible = show;\s*\}$/.test(apply.text),
    colours: !!colM && tok('brand-400') !== '' && colM[1].toLowerCase() === tok('brand-400') && colM[2].toLowerCase() === tok('brand-600')
      && /return getActiveAppearanceString\(\) == "spixiui-light" \? "light" : "dark";/.test(TM) && count(HP, 'paneDividerLine.Color') === 1,
    hideSite: offSites.length === 1 && offSites.every((i) => /^paneDivider\.IsVisible = false;\s*#if WINDOWS \|\| MACCATALYST\s*paneDividerLineState\.dragEnd\(\);\s*paneDividerLine\.IsVisible = false;\s*#endif/.test(HP.slice(i))),
    onlyWriters: count(HP, /paneDividerLine\.IsVisible = /g) === 2 && count(HP, 'paneDivider.IsVisible = ') === 2
      && count(HP, /paneDivider(?:Line)?\s*\.\s*(?:ZIndex|InputTransparent)\s*=(?!=)/g) === 0,   // ★ #46 r1 (O-C-3): no code-behind write of the stacking or the input order
  };
  ok(F(sh).length === 0,
    '★ fixb1 item 4 SHOW: applyPaneDividerLine (desktop only) shows the line ONLY with the switch on, the grip shown and the state hover-or-drag; the colour is set at every apply while shown (`if (show)`): "dark" → brand-400, else brand-600 (= tokens.css; ThemeManager answers "light" / "dark"); the single-pane site that hides paneDivider also ends the state and hides the line; no other site writes the line\'s IsVisible, and nothing in the code-behind writes ZIndex / InputTransparent of the line or the grip — failing: ' + JSON.stringify(F(sh)) + ' ' + JSON.stringify({ col: colM ? [colM[1], colM[2]] : null, b400: tok('brand-400'), b600: tok('brand-600'), offSites: offSites.length }));

  /* ── EXACT (★ #46 r2, R2-2 / R2-3 / R2-4): the whole text of what can move the line or the grip ── */
  const nz = (t) => t.replace(/\s+/g, ' ').trim();
  const XB = [...X.matchAll(/<BoxView\b[\s\S]*?\/>/g)].map((m) => nz(m[0]));
  const LINE_X = '<BoxView x:Name="paneDividerLine" Grid.Column="0" WidthRequest="2" HorizontalOptions="End" VerticalOptions="Fill" Margin="0,0,0,0" InputTransparent="True" IsVisible="False" />';   // re-based by fixb2 item 2 (Margin)
  /* the grip: its text at efcde241 (git show efcde241:Spixi/Pages/Home/HomePage.xaml) */
  const GRIP_X = '<BoxView x:Name="paneDivider" Grid.Column="0" WidthRequest="10" HorizontalOptions="End" VerticalOptions="Fill" Color="Transparent" BackgroundColor="Transparent" IsVisible="False" />';
  const treeXaml = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? treeXaml(d + '/' + e.name) : (/\.(cs|xaml)$/.test(e.name) ? [d + '/' + e.name] : []));
  /* ★ #46 r3 (R3-3): EVERY .xaml under Spixi/ (raw, XML comments removed only): the Styles whose TargetType names BoxView — or a base class a BoxView takes setters
   * from (View, VisualElement, Element), in any quoting, with or without `{x:Type …}` and a namespace prefix — are exactly today's one, with exactly its setters */
  const BOX_STYLE = '<Style TargetType="BoxView"> <Setter Property="Color" Value="{AppThemeBinding Light={StaticResource Gray950}, Dark={StaticResource Gray200}}" /> </Style>';
  const TT = /TargetType\s*=\s*(["'])\s*(?:\{\s*(?:\w+:)?Type\s+)?(?:\w+:)?(\w+)\s*\}?\s*\1/;
  const boxStyleTexts = [];
  for (const f of treeXaml('Spixi').filter((x) => x.endsWith('.xaml'))) {
    const t = raw(f).replace(/<!--[\s\S]*?-->/g, '');
    for (const m of t.matchAll(/<(?:\w+:)?Style\b[^>]*?(?:\/>|>[\s\S]*?<\/(?:\w+:)?Style>)/g)) {
      const tt = TT.exec(m[0].split('>')[0]);
      if (tt && ['BoxView', 'View', 'VisualElement', 'Element', 'BindableObject'].includes(tt[2])) boxStyleTexts.push({ file: f, text: nz(m[0]) });
    }
    /* a TargetType given as a property element (`<Style.TargetType>`) or any BoxView-named TargetType the reader above missed */
    boxStyleTexts.push(...(/<(?:\w+:)?Style\.TargetType/.test(t) ? [{ file: f, text: 'Style.TargetType element' }] : []));
  }
  const namers = treeXaml('Spixi').filter((f) => f !== 'Spixi/Pages/Home/HomePage.xaml' && f !== 'Spixi/Pages/Home/HomePage.xaml.cs' && /panedivider/i.test(raw(f)));
  const xt = {
    found: XB.length > 0,
    xamlText: XB[0] === LINE_X,
    gripText: XB[1] === GRIP_X,
    onlyTwoBoxViews: XB.length === 2 && count(X, /<BoxView\b/g) === 2 && count(X, /BoxView/g) === 2,
    onlyTwoMentions: count(X, /panedivider/gi) === 2,
    noXamlStyleOrTrigger: !/<(?:\w+:)?(?:Style|Trigger|DataTrigger|EventTrigger|VisualStateManager|Setter|Behavior)\b|\{(?:x:)?(?:Reference|StaticResource|DynamicResource)\b[^}]*paneDivider/i.test(X) && !/<\w*Resources\b/.test(X),
    implicitBoxViewStyle: boxStyleTexts.length === 1 && boxStyleTexts[0].file === 'Spixi/Resources/Styles/Styles.xaml' && boxStyleTexts[0].text === BOX_STYLE,
    noOtherFile: namers.length === 0,
  };
  const EXPECTED_MENTIONS = [
    'private bool paneDividerPanning = false;',
    'private readonly FixB1Rules.DividerLine paneDividerLineState = new FixB1Rules.DividerLine();',
    'dividerPan.PanUpdated += onPaneDividerPan;',
    'paneDivider.GestureRecognizers.Add(dividerPan);',
    'paneDivider.GestureRecognizers.Add(dividerReset);',
    'paneDivider.HandlerChanged += (s, ev) =>',
    'if (paneDivider.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement el)',
    'Logging.warn("paneDivider cursor: " + ex.Message);',
    'dividerHover.PointerExited += (s, ev) => { Spixi.SMacCursor.hovered = false; if (!paneDividerPanning) Spixi.SMacCursor.pop(); };',
    'paneDivider.GestureRecognizers.Add(dividerHover);',
    'paneDivider.GestureRecognizers.Add(dividerLineHover);',
    'dividerLineHover.PointerEntered += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); };',
    'dividerLineHover.PointerMoved += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); };',
    'dividerLineHover.PointerExited += (s, ev) => { paneDividerLineState.hoverExit(); applyPaneDividerLine(); };',
    'paneDivider.IsVisible = false;',
    'paneDividerLineState.dragEnd();',
    'paneDividerLine.IsVisible = false;',
    'paneDivider.IsVisible = true;',
    'private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e)',
    'paneDividerPanning = true;',
    'if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragStart(); applyPaneDividerLine(); }',
    'if (!paneDividerPanning)',
    'paneDividerPanning = true;',
    'if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragStart(); applyPaneDividerLine(); }',
    'paneDividerPanning = false;',
    'if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragEnd(); applyPaneDividerLine(); }',
    'private void applyPaneDividerLine()',
    'bool show = SpixiFlags.DividerHoverLine && paneDivider.IsVisible && paneDividerLineState.visible;',
    'paneDividerLine.Color = Microsoft.Maui.Graphics.Color.FromArgb(ThemeManager.getResolvedAppearanceName() == "dark" ? "#769DFF" : "#3050BD");',
    'paneDividerLine.IsVisible = show;'];
  const mentionLines = HP.split('\n').filter((l) => /panedivider/i.test(l)).map(nz);
  const APPLY_BODY = '{ bool show = SpixiFlags.DividerHoverLine && paneDivider.IsVisible && paneDividerLineState.visible; if (show) { paneDividerLine.Color = Microsoft.Maui.Graphics.Color.FromArgb(ThemeManager.getResolvedAppearanceName() == "dark" ? "#769DFF" : "#3050BD"); } paneDividerLine.IsVisible = show; }';
  const HOVER_BODY = '{ #if MACCATALYST PointerGestureRecognizer dividerLineHover = dividerHover; #else PointerGestureRecognizer dividerLineHover = new PointerGestureRecognizer(); paneDivider.GestureRecognizers.Add(dividerLineHover); #endif dividerLineHover.PointerEntered += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); }; dividerLineHover.PointerMoved += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); }; dividerLineHover.PointerExited += (s, ev) => { paneDividerLineState.hoverExit(); applyPaneDividerLine(); }; }';
  const APPLY_SIG = 'private void applyPaneDividerLine()';
  const gapOk = (sig, from) => { if (from < 0) return false; const o = HP.indexOf('{', from + sig.length); return o > 0 && HP.slice(from + sig.length, o).trim() === ''; };
  const hoverAts = allAt(HP, 'if (SpixiFlags.DividerHoverLine)');
  const hoverBlocks = hoverAts.filter((i) => /^[ \t]*\n\s*\{/.test(HP.slice(i + 'if (SpixiFlags.DividerHoverLine)'.length)));
  const hv = hoverBlocks.length === 1 ? span(HP, 'if (SpixiFlags.DividerHoverLine)', hoverBlocks[0]) : { text: '', at: -1 };
  const wp = HP.split('\n').filter((l) => /panedivider/i.test(l));
  xt.mentions = mentionLines.length === EXPECTED_MENTIONS.length && mentionLines.every((l, i) => l === EXPECTED_MENTIONS[i]);
  xt.applyBody = apply.at >= 0 && count(HP, APPLY_SIG) === 1 && gapOk(APPLY_SIG, apply.at) && nz(apply.text) === APPLY_BODY;
  xt.hoverBody = hoverBlocks.length === 1 && hv.at === hoverBlocks[0] && nz(hv.text) === HOVER_BODY && /^\s*$/.test(HP.slice(hv.at + 'if (SpixiFlags.DividerHoverLine)'.length, HP.indexOf('{', hv.at)));
  xt.noPropertyWrites = wp.every((l) => !/ZIndexProperty|InputTransparentProperty|SetValue\s*\(|\.ZIndex\b|\.Opacity\b|\.TranslationX\b|\.TranslationY\b|\.Scale|\.HeightRequest|\.WidthRequest|\.Margin\b|\.Rotation/.test(l));
  ok(F(xt).length === 0,
    '★ fixb1 item 4 EXACT (#46 r2): the WHOLE text of what can move the line or the grip — both XAML elements (`paneDividerLine`: ' + LINE_X.length + ' chars; `paneDivider` = its text at efcde241) equal their exact whitespace-normalised text, the only BoxViews and the only two mentions in the XAML (no style / trigger / reference), the app\'s one BoxView style sets only Color, no other file of Spixi names the grip; in HomePage.xaml.cs the LIST of lines that mention paneDivider (any case) equals the expected list in order (' + EXPECTED_MENTIONS.length + ' lines); the exact bodies of applyPaneDividerLine and of the `if (SpixiFlags.DividerHoverLine) { … }` block (only whitespace between signature / `if (…)` and `{`); no line naming paneDivider carries ZIndex / InputTransparent / Opacity / Translation / Size / Margin writes or SetValue( — failing: ' + JSON.stringify(F(xt))
    + (xt.mentions ? '' : ' ' + JSON.stringify({ firstOff: mentionLines.find((l, i) => l !== EXPECTED_MENTIONS[i]), want: EXPECTED_MENTIONS[mentionLines.findIndex((l, i) => l !== EXPECTED_MENTIONS[i])], n: mentionLines.length }))
    + (xt.xamlText && xt.gripText ? '' : ' ' + JSON.stringify({ xaml: XB })));

  /* ── FILES (★ #46 r3, R3-3 / R3-1): HomePage.xaml WHOLE, and the pure rules the line leans on ── */
  const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
  const XAML_FROZEN = '992a99e2c56c8812af4c7d05e8d70b0245de82dc3d4993054f4175be8f3984b8';   // re-based by fixb2 item 2 (was bef9f8f5…: the line's Margin + its XAML comment)
  const RULES_FROZEN = 'e89f42e073f2ace5a34d63e8f8a47da60a9de0914569edc8892489f779262c68';   // the same freeze as pins-fixb1/a-confirm RULES (computed again, nothing imported)
  const hashFile = (f) => createHash('sha256').update(readBytes(join(root, f))).digest('hex');   // ★ #46 r4: the EXACT bytes
  const xamlGot = hashFile('Spixi/Pages/Home/HomePage.xaml');
  const rulesGot = hashFile('Spixi/Utils/FixB1Rules.cs');
  ok(xamlGot === XAML_FROZEN && rulesGot === RULES_FROZEN,
    '★ fixb1 item 4 FILES (#46 r3 R3-3 / R3-1): Spixi/Pages/Home/HomePage.xaml and Spixi/Utils/FixB1Rules.cs (DividerLine) are each held WHOLE by SHA-256 (the EXACT bytes; a comment, a space, a BOM or a line-end change also turns them red) — the XAML reader in this module is a text reader and the csh harness compiles without WINDOWS / MACCATALYST, so neither can be trusted for what they do not read. Re-base a hash ONLY after a look at the diff (#1596). ' + JSON.stringify({ xaml: xamlGot === XAML_FROZEN ? 'ok' : xamlGot, rules: rulesGot === RULES_FROZEN ? 'ok' : rulesGot }));

  /* ── WHOLE (★ #46 r4, R4-4 / R4-5): the code-behind file as the compiler reads it, and the three blocks that wire the line, held exactly ── */
  const HPraw = readBytes(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  /* (a) only \n and \r\n end a line (a lone CR, U+0085, U+2028, U+2029, VT, FF end a `//` comment in C# where stripCode sees none); no \u / \U escape outside a literal */
  const oddEnds = (HPraw.replace(/\r\n/g, '').match(/[\r\u0085\u2028\u2029\v\f]/g) || []).length;
  const escOutside = (() => {
    const t = HPraw; const LE = new RegExp('[\\r\\n\\x85' + String.fromCharCode(0x2028, 0x2029) + ']');
    let n = 0;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === '/' && t[i + 1] === '/') { while (i < t.length && !LE.test(t[i])) i++; continue; }          // a line comment ends at any C# line end
      if (c === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); if (e < 0) break; i = e + 1; continue; }
      if (c === '"' || ((c === '@' || c === '$') && (t[i + 1] === '"' || ((t[i + 1] === '@' || t[i + 1] === '$') && t[i + 2] === '"')))) {
        const verb = c === '@' || t[i + 1] === '@';
        while (t[i] !== '"') i++;
        for (i++; i < t.length; i++) { if (t[i] === '"') { if (verb && t[i + 1] === '"') { i++; continue; } break; } if (!verb && t[i] === '\\') i++; }
        continue;
      }
      if (c === "'") { for (i++; i < t.length && t[i] !== "'"; i++) { if (t[i] === '\\') i++; } continue; }
      if (c === '\\' && (t[i + 1] === 'u' || t[i + 1] === 'U')) n++;
    }
    return n;
  })();
  const nzs = (t) => t.replace(/\s+/g, ' ').trim();
  const HPn = HPraw.replace(/\r\n/g, '\n');
  const d1a = HPn.indexOf('// D1 (#240): divider gestures'), d1b = HPn.indexOf('SizeChanged += OnPageSizeChanged;');
  const D1_BLOCK = "leftPaneWidth = clampLeftPaneWidth(Preferences.Default.Get(\"leftPaneWidth\", leftPaneDefaultWidth)); var dividerPan = new PanGestureRecognizer(); dividerPan.PanUpdated += onPaneDividerPan; paneDivider.GestureRecognizers.Add(dividerPan); var dividerReset = new TapGestureRecognizer { NumberOfTapsRequired = 2 }; dividerReset.Tapped += (s, ev) => { leftPaneWidth = leftPaneDefaultWidth; applyLeftPaneWidth(); Preferences.Default.Set(\"leftPaneWidth\", leftPaneWidth); updateInfoPaneWidth(); }; paneDivider.GestureRecognizers.Add(dividerReset); #if WINDOWS paneDivider.HandlerChanged += (s, ev) => { try { if (paneDivider.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement el) { var prop = typeof(Microsoft.UI.Xaml.UIElement).GetProperty( \"ProtectedCursor\", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public); prop?.SetValue(el, Microsoft.UI.Input.InputSystemCursor.Create( Microsoft.UI.Input.InputSystemCursorShape.SizeWestEast)); } } catch (Exception ex) { Logging.warn(\"paneDivider cursor: \" + ex.Message); } }; #endif #if MACCATALYST var dividerHover = new PointerGestureRecognizer(); dividerHover.PointerEntered += (s, ev) => { Spixi.SMacCursor.hovered = true; Spixi.SMacCursor.pushResizeLeftRight(); }; dividerHover.PointerExited += (s, ev) => { Spixi.SMacCursor.hovered = false; if (!paneDividerPanning) Spixi.SMacCursor.pop(); }; paneDivider.GestureRecognizers.Add(dividerHover); #endif #if WINDOWS || MACCATALYST if (SpixiFlags.DividerHoverLine) { #if MACCATALYST PointerGestureRecognizer dividerLineHover = dividerHover; #else PointerGestureRecognizer dividerLineHover = new PointerGestureRecognizer(); paneDivider.GestureRecognizers.Add(dividerLineHover); #endif dividerLineHover.PointerEntered += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); }; dividerLineHover.PointerMoved += (s, ev) => { paneDividerLineState.hoverEnter(); applyPaneDividerLine(); }; dividerLineHover.PointerExited += (s, ev) => { paneDividerLineState.hoverExit(); applyPaneDividerLine(); }; } #endif";   // re-based by fixb2 item 2 (#46 r1 O2: the reset re-fits the info pane, `updateInfoPaneWidth();`)
  const spA = HPn.indexOf('paneDivider.IsVisible = false;'), spL = HPn.indexOf('paneDividerLine.IsVisible = false;', spA), spE = HPn.indexOf('#endif', spL) + 6;
  const SINGLE_BLOCK = "paneDivider.IsVisible = false; #if WINDOWS || MACCATALYST paneDividerLineState.dragEnd(); paneDividerLine.IsVisible = false; #endif";
  const PAN_BODY = "private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e) { switch (e.StatusType) { case GestureStatus.Started: panStartPaneWidth = leftPaneWidth; paneDividerPanning = true; Logging.info(\"[DIVIDER] pan started\"); #if WINDOWS || MACCATALYST if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragStart(); applyPaneDividerLine(); } #endif break; case GestureStatus.Running: if (!paneDividerPanning) { panStartPaneWidth = leftPaneWidth; paneDividerPanning = true; #if WINDOWS || MACCATALYST if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragStart(); applyPaneDividerLine(); } #endif } leftPaneWidth = clampLeftPaneWidth(panStartPaneWidth + e.TotalX); applyLeftPaneWidth(); updateInfoPaneWidth(); break; case GestureStatus.Completed: case GestureStatus.Canceled: paneDividerPanning = false; Preferences.Default.Set(\"leftPaneWidth\", leftPaneWidth); Logging.info(\"[DIVIDER] pan ended width=\" + (int)leftPaneWidth); #if MACCATALYST if (!Spixi.SMacCursor.hovered) Spixi.SMacCursor.pop(); #endif #if WINDOWS || MACCATALYST if (SpixiFlags.DividerHoverLine) { paneDividerLineState.dragEnd(); applyPaneDividerLine(); } #endif break; } }";
  const panSig = 'private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e)';
  const panAt = HPn.indexOf(panSig), panOpen = HPn.indexOf('{', panAt);
  let panEnd = -1; { let dd = 0; for (let k = panOpen; k < HPn.length; k++) { if (HPn[k] === '{') dd++; else if (HPn[k] === '}' && --dd === 0) { panEnd = k + 1; break; } } }
  const wh2 = {
    lineEnds: oddEnds === 0,
    noEscapeOutsideLiterals: escOutside === 0,
    d1Block: d1a > 0 && d1b > d1a && nzs(stripCode(HPn.slice(d1a, d1b))) === D1_BLOCK,
    singlePaneBlock: spA > 0 && spL > spA && spE > spL && nzs(stripCode(HPn.slice(spA, spE))) === SINGLE_BLOCK,
    panBody: panAt > 0 && panEnd > 0 && count(HPn, panSig) === 1 && nzs(stripCode(HPn.slice(panAt, panEnd))) === PAN_BODY,
  };
  ok(F(wh2).length === 0,
    '★ fixb1 item 4 WHOLE (#46 r4 R4-4 / R4-5): HomePage.xaml.cs is read as the compiler reads it — only \\n and \\r\\n end a line (no lone CR, U+0085, U+2028, U+2029, VT, FF: C# ends a `//` comment at them, the stripper does not) and no \\u / \\U escape stands outside a string or char literal — and three blocks are held EXACTLY (comments stripped, whitespace collapsed): the whole of onPaneDividerPan, the D1 block (from `// D1 (#240): divider gestures` to the line before `SizeChanged += OnPageSizeChanged;`) and the single-pane block that hides the grip and the line (`paneDivider.IsVisible = false;` … the `#endif` after the line hide) — failing: ' + JSON.stringify(F(wh2)) + ' ' + JSON.stringify({ oddEnds, escOutside }));

  /* ── KEPT ── */
  const kp = {
    winCursorKept: /#if WINDOWS\s*paneDivider\.HandlerChanged \+= \(s, ev\) =>\s*\{\s*try\s*\{\s*if \(paneDivider\.Handler\?\.PlatformView is Microsoft\.UI\.Xaml\.UIElement el\)\s*\{\s*var prop = typeof\(Microsoft\.UI\.Xaml\.UIElement\)\.GetProperty\(\s*"ProtectedCursor",\s*System\.Reflection\.BindingFlags\.Instance\s*\| System\.Reflection\.BindingFlags\.NonPublic\s*\| System\.Reflection\.BindingFlags\.Public\);\s*prop\?\.SetValue\(el, Microsoft\.UI\.Input\.InputSystemCursor\.Create\(\s*Microsoft\.UI\.Input\.InputSystemCursorShape\.SizeWestEast\)\);\s*\}\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\("paneDivider cursor: " \+ ex\.Message\);\s*\}\s*\};\s*#endif/.test(HP),
    macCursorKept: /#if MACCATALYST\s*var dividerHover = new PointerGestureRecognizer\(\);\s*dividerHover\.PointerEntered \+= \(s, ev\) => \{ Spixi\.SMacCursor\.hovered = true; Spixi\.SMacCursor\.pushResizeLeftRight\(\); \};\s*dividerHover\.PointerExited \+= \(s, ev\) => \{ Spixi\.SMacCursor\.hovered = false; if \(!paneDividerPanning\) Spixi\.SMacCursor\.pop\(\); \};\s*paneDivider\.GestureRecognizers\.Add\(dividerHover\);\s*#endif/.test(HP)
      && /#if MACCATALYST\s*if \(!Spixi\.SMacCursor\.hovered\) Spixi\.SMacCursor\.pop\(\);\s*#endif/.test(pan) && count(HP, 'dividerHover.') === 2,
  };
  const CSH = raw('scripts/csh/csh.csproj');
  const T = existsSync(join(root, 'scripts/csh/FixB1Tests.cs')) ? raw('scripts/csh/FixB1Tests.cs') : '';
  const RU = rd('Spixi/Utils/FixB1Rules.cs');
  kp.harness = /public sealed class DividerLine/.test(RU) && /public void dragEnd\(\)\s*\{\s*drag = false;\s*hover = false;\s*\}/.test(RU) && /public bool visible => hover \|\| drag;/.test(RU)
    && count(CSH, '<Compile Include="../../Spixi/Utils/FixB1Rules.cs" />') === 1
    && ['divider_line_hover', 'divider_line_stays_for_the_whole_drag', 'divider_line_drag_end_clears_the_hover'].every((m) => new RegExp('\\[TestMethod\\]\\s*public void ' + m + '\\(\\)').test(T));
  ok(F(kp).length === 0,
    '★ fixb1 item 4 KEPT: the Windows ↔ cursor block (ProtectedCursor by reflection) and the Mac SMacCursor recognizer + its pan-end pop are today\'s text; FixB1Rules.DividerLine (dragEnd clears drag AND hover; visible = hover || drag) runs in csh FixB1Tests — failing: ' + JSON.stringify(F(kp)));
}
