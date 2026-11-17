/* ==== fixb2 item 3 (Mission Control n-20261117-win-confirm-no-default-focus; walk W-1 of fixb1) — Windows: the safe-default confirm
 * opens with the KEYBOARD focus and the accent on Cancel.
 *
 * Mechanism: docs/fixb2-mechanisms.md § Item 3 — WinUI gives the default button only PROGRAMMATIC focus at open,
 * drawn as Pointer focus after a mouse click (no ring), and the key input may stay in the WebView2. Fix, inside `#if WINDOWS` and
 * inside the existing SpixiFlags.ConfirmSafeDefault arm (no new switch): SConfirm.showSafeDefaultConfirm adds ONE
 * `dialog.Opened += (s, e) => winFocusCancel(dialog, true);` before ShowAsync; winFocusCancel moves the keyboard focus to the
 * template part FixB2Rules.focusPart names (Close only), only when FixB2Rules.mayTakeFocus says the button shows the Cancel text and
 * not the OK text, applies FixB2Rules.accentState, and runs once more at Low dispatcher priority; everything in a try with an EMPTY
 * catch. The pure rules run in csh (FixB2ConfirmTests); the MAUI / WinUI half is Windows-only C# that this cloud cannot compile or
 * run, so the keys below are a SOURCE READING of it (stripCode; brace-matched bodies; the preprocessor regions computed) — behaviour
 * is proven only by the Windows walk. Keys:
 *   TARGET   — the ONLY `.Focus(` call of SConfirm.cs is `cancelButton.Focus(Microsoft.UI.Xaml.FocusState.Keyboard)`, inside the
 *              `if (cancelButton != null && FixB2Rules.mayTakeFocus(cancelButton.Name, cancelButton.Content as string,
 *              dialog.CloseButtonText, dialog.PrimaryButtonText))` block; the button comes from winFindButton(dialog, part) with
 *              part = FixB2Rules.focusPart((int)dialog.DefaultButton); the helpers name no Primary / Secondary part and no
 *              FocusManager / TryFocusAsync / TryMoveFocus call (nothing else can move the focus);
 *   FAILSAFE — winFocusCancel is ONE try with an EMPTY `catch (Exception) { }` (an event handler of WinUI must not throw); the two
 *              helpers never complete, hide or re-show the dialog (no tcs, TrySet…, Hide(, ShowAsync(, throw), log nothing and start
 *              no timer (no Task.Delay, Timer, TickCount, CancellationToken, Thread.Sleep); the walk is bounded (`seen < 512`) and
 *              answers null when nothing is found; the deferred re-run is ONE `dialog.DispatcherQueue?.TryEnqueue(Low, () =>
 *              winFocusCancel(dialog, false))` behind `if (again)` (it cannot repeat itself);
 *   STYLE    — winDialogStyle is fixb1's body (TryGetValue("DefaultContentDialogStyle") inside a try; TryGetValue on a WinRT map
 *              also finds a MERGED key, docs/fixb2-mechanisms.md § Item 3 (b)), and the order in showSafeDefaultConfirm is `dialog.Style = style;` →
 *              `dialog.Opened += …` → `await dialog.ShowAsync()`;
 *   SCROLL   — (Q-1) the dialog Content is ONE ScrollViewer (vertical Auto, horizontal Disabled, IsTabStop false, AllowFocusOnInteraction
 *              false) holding the same wrapping TextBlock: a long text scrolls, the content never takes the focus or Enter;
 *   DEFAULT  — `DefaultButton =` appears ONCE in the file and names ContentDialogButton.Close; the helpers only READ DefaultButton;
 *              the one GoToState takes only the state FixB2Rules.accentState((int)dialog.DefaultButton, cancelButton.FocusState ==
 *              Keyboard) answered, after the Focus call, inside the same guard; no Primary / Secondary default-state name in the file;
 *   OFF      — switch OFF and every other platform = fixb1's code: the non-Windows projection of SConfirm.cs has fixb1's SHA-256
 *              (the a-confirm SAME constant), askAsync's switch statement is fixb1's ternary, and winFocusCancel is called only by
 *              the Opened line of showSafeDefaultConfirm and by its own deferred re-run (2 calls); the new names appear outside
 *              `#if WINDOWS` only in FixB2Rules.cs and the harness;
 *   RULES    — the item-3 span of Spixi/Utils/FixB2Rules.cs (between `// ── item 3 ──` and `// ── end item 3 ──`, comments stripped,
 *              whitespace collapsed) is exactly the expected text below (focusPart = 3 only; mayTakeFocus = the Close part with the
 *              Cancel text and not the OK text; accentState = Close + keyboard focus only), and FixB2Rules.cs holds no preprocessor
 *              line and no `using` (the csh harness compiles without WINDOWS — one body everywhere); item 4 may add members
 *              OUTSIDE the item-3 span without turning this red;
 *   HARNESS  — csh.csproj compiles FixB2Rules.cs once; FixB2ConfirmTests holds the four test methods.
 * re-based by fixb2 item 4 (FixB2Rules.cs also holds item 4's two pure rules, called from outside this file: `FixB2Rules.flagsLine(` in SpixiFlags.init and
 *              `FixB2Rules.useSafeDialog(` at the four Windows call sites of SPayments.cs / MiniAppPage.xaml.cs) — OFF `namesOnlyOnWindows`: those two call texts are taken out
 *              before the name test (pins-fixb2/d-pay-confirm WINDOWS-ONLY + FLAGS hold where they may stand); every other use of `FixB2Rules`, and item 3's names, stay red.
 * re-based by fixb2 #46 r2 (reader S2): the tree walk of OFF `namesOnlyOnWindows` skips `bin` / `obj` only directly under Spixi/ and matches `.cs` without case — a nested
 *              `Spixi/Pages/obj/X.cs` (compiled by the SDK) that names winFocusCancel / winFindButton / FixB2Rules outside `#if WINDOWS` is red now (break run: red, restored).
 * Deliberate breaks (#802), each a one-token mutation in a full temp copy of the tree, each red on exactly its key, restored (fixb2
 * builder-a report): TARGET — winFindButton `b.Name == name` → `b.Name != name` (the first NON-Close button); FAILSAFE — `if (again)` →
 * `if (true)` (the re-run repeats itself); STYLE —
 * `"DefaultContentDialogStyle"` → `"DefaultContentDialogStyleX"`; SCROLL — `IsTabStop = false,` → `IsTabStop = true,`; DEFAULT — `ContentDialogButton.Close,` → `ContentDialogButton.Primary,`;
 * OFF — the `"cancel"` of askAsync's last log line → `"cancel2"` (outside `#if WINDOWS`); RULES — focusPart `defaultButton == 3` →
 * `defaultButton != 0`; HARNESS — the FixB2Rules.cs Compile line removed from csh.csproj. */
import { createHash } from 'node:crypto';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const rd = (f) => stripCode(raw(f));
  const span = (t, sig, from = 0) => {
    const at = t.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
    const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, end: k + 1, text: t.slice(o, k + 1) }; }
    return { at, end: -1, text: '' };
  };
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\n]*#[^\S\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { const c = st.pop(); st.push('!' + c); }
    }
    return st;
  };
  /* the non-Windows view (strict, as pins-fixb1/a-confirm): `#if WINDOWS` arms dropped, `#else` arms kept; anything but
   * if WINDOWS / else / endif, or a nested / unbalanced block → BAD */
  const BAD = '<<BAD-PREPROCESSOR>>';
  const nonWindows = (src) => {
    const out = [], st = [];
    for (const line of src.split('\n')) {
      const m = /^\s*#\s*(\w+)\b(.*)$/.exec(line);
      if (m) {
        const name = m[1], rest = m[2].trim();
        if (name === 'if') { if (rest !== 'WINDOWS' || st.length) return BAD; st.push({ arm: true, els: false }); continue; }
        if (name === 'else') { const t = st[st.length - 1]; if (!t || t.els || rest) return BAD; t.arm = false; t.els = true; continue; }
        if (name === 'endif') { if (!st.length || rest) return BAD; st.pop(); continue; }
        return BAD;
      }
      const t = st[st.length - 1];
      if (!t || !t.arm) out.push(line);
    }
    return st.length ? BAD : out.join('\n');
  };

  const SC_F = 'Spixi/Utils/SConfirm.cs';
  const SC = rd(SC_F);
  const SIG_DLG = 'private static Task<bool> showSafeDefaultConfirm(string title, string text, string ok, string cancel)';
  const SIG_FOCUS = 'private static void winFocusCancel(Microsoft.UI.Xaml.Controls.ContentDialog dialog, bool again)';
  const SIG_FIND = 'private static Microsoft.UI.Xaml.Controls.Button? winFindButton(Microsoft.UI.Xaml.DependencyObject root, string name)';
  const SIG_STY = 'private static Microsoft.UI.Xaml.Style? winDialogStyle()';
  const pDlg = span(SC, SIG_DLG), pFocus = span(SC, SIG_FOCUS), pFind = span(SC, SIG_FIND), pSty = span(SC, SIG_STY);
  const dlg = pDlg.text, fc = pFocus.text, fd = pFind.text, sty = pSty.text;
  const helpers = fc + '\n' + fd;
  const winOnly = (p) => p.at > 0 && p.end > 0 && regionsAt(SC, p.at).join('|') === 'WINDOWS' && regionsAt(SC, p.end).join('|') === 'WINDOWS';
  const found = [pDlg, pFocus, pFind, pSty].every((p) => p.text.length > 0) && [SIG_DLG, SIG_FOCUS, SIG_FIND, SIG_STY].every((s) => count(SC, s) === 1);

  /* ── TARGET ── */
  const GUARD = 'if (cancelButton != null && FixB2Rules.mayTakeFocus(cancelButton.Name, cancelButton.Content as string, dialog.CloseButtonText, dialog.PrimaryButtonText))';
  const guardBody = span(fc, GUARD).text;
  const tg = {
    found,
    windowsOnly: winOnly(pFocus) && winOnly(pFind),
    partFromRule: /string\? part = FixB2Rules\.focusPart\(\(int\)dialog\.DefaultButton\);\s*Microsoft\.UI\.Xaml\.Controls\.Button\? cancelButton = part == null \? null : winFindButton\(dialog, part\);/.test(fc),
    oneGuard: count(fc, GUARD) === 1 && guardBody.length > 0,
    onlyFocusCall: count(SC, '.Focus(') === 1 && count(guardBody, 'cancelButton.Focus(Microsoft.UI.Xaml.FocusState.Keyboard);') === 1
      && /^\{\s*cancelButton\.Focus\(Microsoft\.UI\.Xaml\.FocusState\.Keyboard\);/.test(guardBody),
    noOtherMover: !/FocusManager|TryFocusAsync|TryMoveFocus|FocusState\.Programmatic|FocusState\.Pointer|PrimaryButton"|SecondaryButton|"PrimaryButton|IsTabStop/.test(helpers),
    findByName: /if \(d is Microsoft\.UI\.Xaml\.Controls\.Button b && b\.Name == name\)\s*\{\s*return b;\s*\}/.test(fd),
  };
  ok(F(tg).length === 0,
    '★ fixb2 item 3 TARGET: the focus step moves the KEYBOARD focus only to the button winFindButton finds for FixB2Rules.focusPart((int)dialog.DefaultButton) (Close only), only inside the FixB2Rules.mayTakeFocus(Name, shown text, CloseButtonText, PrimaryButtonText) guard; `cancelButton.Focus(FocusState.Keyboard)` is the ONLY .Focus( of SConfirm.cs; no FocusManager / TryFocusAsync / Primary or Secondary part — failing: ' + JSON.stringify(F(tg)));

  /* ── FAILSAFE ── */
  const fs = {
    found,
    oneTryEmptyCatch: /^\{\s*try\s*\{[\s\S]*\}\s*catch \(Exception\)\s*\{\s*\}\s*\}$/.test(fc) && count(fc, 'try') === 1 && count(fc, 'catch') === 1,
    neverCompletes: !/tcs|TrySet|SetResult|SetException|\.Hide\(|ShowAsync\(|\bthrow\b|Environment\.Exit|Application\.Current/.test(helpers),
    noLogNoTimer: !/Logging\.|Task\.Delay|Timer|TickCount|CancellationToken|Thread\.Sleep|while \(true\)/.test(helpers),
    boundedWalk: /while \(todo\.Count > 0 && seen < 512\)/.test(fd) && /\}\s*return null;\s*\}$/.test(fd) && count(fd, 'seen++;') === 1,
    oneRerun: count(fc, 'TryEnqueue(') === 1 && /if \(again\)\s*\{\s*dialog\.DispatcherQueue\?\.TryEnqueue\(Microsoft\.UI\.Dispatching\.DispatcherQueuePriority\.Low, \(\) => winFocusCancel\(dialog, false\)\);\s*\}/.test(fc),
  };
  ok(F(fs).length === 0,
    '★ fixb2 item 3 FAILSAFE: a failure of the focus step leaves the dialog as WinUI opened it — winFocusCancel is ONE try with an EMPTY catch; the helpers never complete, hide or re-show the dialog (no tcs / TrySet… / Hide / ShowAsync / throw), log nothing, start no timer; the tree walk is bounded (512) and answers null; ONE deferred re-run at Low priority behind `if (again)` (it does not repeat) — failing: ' + JSON.stringify(F(fs)));

  /* ── STYLE ── */
  const iStyle = dlg.indexOf('dialog.Style = style;'), iOpened = dlg.indexOf('dialog.Opened += (s, e) => winFocusCancel(dialog, true);'), iShow = dlg.indexOf('await dialog.ShowAsync()');
  const st = {
    found,
    lookupUnchanged: /^\{\s*try\s*\{\s*var res = Microsoft\.UI\.Xaml\.Application\.Current\?\.Resources;\s*if \(res != null && res\.TryGetValue\("DefaultContentDialogStyle", out object\? st\)\)\s*\{\s*return st as Microsoft\.UI\.Xaml\.Style;\s*\}\s*\}\s*catch \(Exception\)\s*\{\s*\}\s*return null;\s*\}$/.test(sty),
    applied: /Microsoft\.UI\.Xaml\.Style\? style = winDialogStyle\(\);\s*if \(style != null\)\s*\{\s*dialog\.Style = style;\s*\}\s*dialog\.Opened \+= \(s, e\) => winFocusCancel\(dialog, true\);\s*Microsoft\.UI\.Xaml\.Controls\.ContentDialogResult result = await dialog\.ShowAsync\(\);/.test(dlg),
    order: iStyle > 0 && iOpened > iStyle && iShow > iOpened && count(dlg, 'Opened +=') === 1,
  };
  ok(F(st).length === 0,
    '★ fixb2 item 3 STYLE: winDialogStyle is fixb1\'s lookup (TryGetValue("DefaultContentDialogStyle") on Application.Resources inside a try — a WinRT map lookup that also finds a merged key) and showSafeDefaultConfirm sets the style, THEN the one Opened focus step, THEN awaits ShowAsync — failing: ' + JSON.stringify(F(st)));

  /* ── SCROLL (Q-1, from builder-d) ── the template's ContentScrollViewer has VerticalScrollBarVisibility="Disabled", which gives its child
   * the FINITE viewport height (ScrollViewer_Partial.cpp:1989 CanVerticallyScroll = visibility != Disabled; ScrollContentPresenter_Partial.cpp
   * :1786-1798 an infinite height only when it can scroll vertically) — a bare TextBlock was CLIPPED. The Content is our own viewer: vertical
   * Auto, horizontal Disabled, holding the same wrapping TextBlock; it can never be focusable (IsTabStop false: uielement.cpp:6426-6433
   * IsFocusable needs IsTabStop) nor take focus on a click (AllowFocusOnInteraction false: FocusSelection.h:18-21 refuses Pointer focus;
   * the viewer's own press handler asks for Pointer focus, ScrollViewer_Partial.cpp:2588-2601), so the content never wins the initial focus
   * over the default button (ContentDialog_Partial.cpp:2008-2048) and never takes Enter. */
  const SV_RE = /Content = new Microsoft\.UI\.Xaml\.Controls\.ScrollViewer\s*\{\s*VerticalScrollBarVisibility = Microsoft\.UI\.Xaml\.Controls\.ScrollBarVisibility\.Auto,\s*HorizontalScrollBarVisibility = Microsoft\.UI\.Xaml\.Controls\.ScrollBarVisibility\.Disabled,\s*IsTabStop = false,\s*AllowFocusOnInteraction = false,\s*Content = new Microsoft\.UI\.Xaml\.Controls\.TextBlock \{ Text = text, TextWrapping = Microsoft\.UI\.Xaml\.TextWrapping\.Wrap \}\s*\},/;
  const sc = {
    found,
    viewer: SV_RE.test(dlg) && count(dlg, 'new Microsoft.UI.Xaml.Controls.ScrollViewer') === 1 && count(dlg, 'Content = ') === 2,
    notFocusable: count(dlg, 'IsTabStop = false,') === 1 && count(dlg, 'AllowFocusOnInteraction = false,') === 1 && !/IsTabStop = true|AllowFocusOnInteraction = true|IsTextSelectionEnabled|IsFocusEngagementEnabled|TabIndex|\.Focus\(/.test(dlg),
    oneTextBlock: count(dlg, 'new Microsoft.UI.Xaml.Controls.TextBlock') === 1 && count(dlg, 'Text = text') === 1,
  };
  ok(F(sc).length === 0,
    '★ fixb2 item 3 SCROLL (Q-1): the dialog Content is ONE ScrollViewer (vertical Auto, horizontal Disabled) holding the same wrapping TextBlock, so a long text (a long peer nickname before the amount) scrolls instead of being clipped by the template\'s Disabled viewer; the viewer is not a tab stop and takes no focus on a click (IsTabStop false, AllowFocusOnInteraction false; no selectable text, no focus engagement) — the initial focus and Enter stay with the Close button — failing: ' + JSON.stringify(F(sc)));

  /* ── DEFAULT ── */
  const df = {
    found,
    closeDefault: count(SC, 'DefaultButton =') === 1 && /DefaultButton = Microsoft\.UI\.Xaml\.Controls\.ContentDialogButton\.Close,/.test(dlg),
    helpersOnlyRead: !/DefaultButton\s*=[^=]/.test(helpers) && count(fc, '(int)dialog.DefaultButton') === 2,
    accentByRule: /cancelButton\.Focus\(Microsoft\.UI\.Xaml\.FocusState\.Keyboard\);\s*string\? state = FixB2Rules\.accentState\(\(int\)dialog\.DefaultButton, cancelButton\.FocusState == Microsoft\.UI\.Xaml\.FocusState\.Keyboard\);\s*if \(state != null\)\s*\{\s*Microsoft\.UI\.Xaml\.VisualStateManager\.GoToState\(dialog, state, false\);\s*\}\s*\}$/.test(guardBody)
      && count(SC, 'GoToState(') === 1,
    noOtherState: !/PrimaryAsDefaultButton|SecondaryAsDefaultButton|NoDefaultButton|CloseAsDefaultButton/.test(SC),
  };
  ok(F(df).length === 0,
    '★ fixb2 item 3 DEFAULT: `DefaultButton = ContentDialogButton.Close` is kept (the ONE assignment in the file); the focus step only reads DefaultButton; the accent comes from ONE GoToState with the state FixB2Rules.accentState((int)DefaultButton, Close has the keyboard focus) answered, after the Focus call, inside the guard; no state name is written in SConfirm.cs — failing: ' + JSON.stringify(F(df)));

  /* ── OFF ── */
  const FIXB1_NONWIN_SHA = 'a2b534b8e703c4ba86a427f4590ddcead8b10c72194b51008dfa4c1a4e91c3f1';   // = pins-fixb1/a-confirm TODAY_SHA (the non-Windows view, normalised)
  const nonWin = nonWindows(SC);
  const CANCEL = 'SpixiLocalization._SL("global-dialog-cancel")';
  const TERN = 'Task<bool>? dialog = SpixiFlags.ConfirmSafeDefault ? showSafeDefaultConfirm(title, text, ok, ' + CANCEL + ') : page.displaySpixiAlert(title, text, ok, ' + CANCEL + ', true);';
  const NEW_NAMES = ['winFocusCancel', 'winFindButton', 'FixB2Rules'];
  /* ★ #46 r2 (reader S2, MAJOR): `bin` / `obj` are skipped ONLY directly under Spixi/ (the SDK's default excludes are the project-root ones; a
   * nested `Spixi/Utils/bin/X.cs` is compiled), and the extension is matched without case (`X.CS` compiles on Windows). */
  const walk = (d, top = true) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    top && (e.name === 'obj' || e.name === 'bin') ? [] : e.isDirectory() ? walk(d + '/' + e.name, false) : (/\.cs$/i.test(e.name) ? [d + '/' + e.name] : []));
  const outside = [];
  for (const f of walk('Spixi')) {
    if (f === 'Spixi/Utils/FixB2Rules.cs' || f.startsWith('Spixi/Platforms/Windows/')) continue;
    /* ★ re-based by fixb2 item 4: its two rule calls are not item 3's names (held by pins-fixb2/d-pay-confirm) */
    const t = ['FixB2Rules.useSafeDialog(', 'FixB2Rules.flagsLine('].reduce((x, c) => x.split(c).join(''), f === SC_F ? nonWin : stripCode(raw(f)));
    for (const n of NEW_NAMES) if (t.includes(n)) outside.push(f + ':' + n);
  }
  const of = {
    projectOk: nonWin !== BAD,
    sameAsFixb1: nonWin !== BAD && sha(norm(nonWin)) === FIXB1_NONWIN_SHA,
    ternary: count(norm(SC), norm(TERN)) === 1,
    twoCalls: count(SC, 'winFocusCancel(') === 3 && count(dlg, 'winFocusCancel(dialog, true)') === 1 && count(fc, 'winFocusCancel(dialog, false)') === 1,
    namesOnlyOnWindows: outside.length === 0,
  };
  ok(F(of).length === 0,
    '★ fixb2 item 3 OFF: switch OFF / iPhone / Mac / Android = fixb1\'s code — the non-Windows view of SConfirm.cs has fixb1\'s SHA-256, askAsync keeps fixb1\'s `ConfirmSafeDefault ? showSafeDefaultConfirm(…) : displaySpixiAlert(…, true)`, winFocusCancel is called only by the Opened line and its own re-run, and its names appear nowhere else outside `#if WINDOWS` but FixB2Rules.cs — failing: ' + JSON.stringify(F(of)) + (outside.length ? ' outside: ' + outside.join(',') : '') + (of.sameAsFixb1 ? '' : ' sha ' + (nonWin === BAD ? BAD : sha(norm(nonWin)))));

  /* ── RULES ── */
  const R_F = 'Spixi/Utils/FixB2Rules.cs';
  const RR = existsSync(join(root, R_F)) ? raw(R_F) : '';
  const a = RR.indexOf('// ── item 3 ──'), b = RR.indexOf('// ── end item 3 ──');
  const item3 = a >= 0 && b > a ? norm(stripCode(RR.slice(a, b))) : '';
  const EXPECTED_ITEM3 = [
    'public const string CancelPart = "CloseButton";',
    'public const string CancelAccentState = "CloseAsDefaultButton";',
    'public static string? focusPart(int defaultButton) { return defaultButton == 3 ? CancelPart : null; }',
    'public static bool mayTakeFocus(string? partName, string? shownText, string? cancelText, string? okText) {',
    'if (partName != CancelPart || string.IsNullOrEmpty(shownText) || string.IsNullOrEmpty(cancelText)) { return false; }',
    'return string.Equals(shownText, cancelText, System.StringComparison.Ordinal) && !string.Equals(shownText, okText, System.StringComparison.Ordinal); }',
    'public static string? accentState(int defaultButton, bool cancelHasKeyboardFocus) { return defaultButton == 3 && cancelHasKeyboardFocus ? CancelAccentState : null; }'].join(' ');
  const firstDiff = (() => { let i = 0; while (i < item3.length && i < EXPECTED_ITEM3.length && item3[i] === EXPECTED_ITEM3[i]) i++; return i; })();
  const RS = stripCode(RR);
  const ru = {
    found: RR.length > 0 && count(RR, '// ── item 3 ──') === 1 && count(RR, '// ── end item 3 ──') === 1,
    item3Exact: item3 === EXPECTED_ITEM3,
    noArms: RR.length > 0 && !/^[^\S\n]*#[^\S\n]*\w+/m.test(RS) && !/^\s*using\s/m.test(RS),
    pure: RR.length > 0 && !/Microsoft\.|IXICore|Preferences|Logging|SpixiFlags|System\.OperatingSystem/.test(RS),
    plainLineEnds: !/[\r\u0085\u2028\u2029\v\f]/.test(RR),
  };
  ok(F(ru).length === 0,
    '★ fixb2 item 3 RULES: the item-3 span of FixB2Rules.cs is exactly the expected text (focusPart: Close = 3 only → "CloseButton"; mayTakeFocus: the Close part showing the Cancel text and not the OK text; accentState: Close default + keyboard focus only → "CloseAsDefaultButton"); the file is pure, has no preprocessor line, no using, no line end but \\n — failing: ' + JSON.stringify(F(ru))
    + (ru.item3Exact ? '' : ' ' + JSON.stringify({ firstDiff, got: item3.slice(Math.max(0, firstDiff - 40), firstDiff + 80), want: EXPECTED_ITEM3.slice(Math.max(0, firstDiff - 40), firstDiff + 80) })));

  /* ── HARNESS ── */
  const CSH = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const T = existsSync(join(root, 'scripts/csh/FixB2ConfirmTests.cs')) ? stripCode(raw('scripts/csh/FixB2ConfirmTests.cs')) : '';
  const TESTS = ['focus_part_only_for_a_close_default', 'may_take_focus_only_the_cancel_text_on_the_close_part', 'may_take_focus_refuses_ok_and_other_parts', 'accent_state_only_for_a_focused_close_default'];
  const hz = {
    compiled: count(CSH, '<Compile Include="../../Spixi/Utils/FixB2Rules.cs" />') === 1,
    testClass: /\[TestClass\]\s*public class FixB2ConfirmTests/.test(T),
    tests: TESTS.every((n) => new RegExp('\\[TestMethod\\]\\s*public void ' + n + '\\(\\)').test(T)),
  };
  ok(F(hz).length === 0,
    '★ fixb2 item 3 HARNESS: csh.csproj compiles FixB2Rules.cs once and FixB2ConfirmTests runs its four tests (' + TESTS.join(', ') + ') — failing: ' + JSON.stringify(F(hz)));
}
