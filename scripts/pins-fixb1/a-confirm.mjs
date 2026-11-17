/* ==== fixb1 item 1 (P50, #1645) — Windows: Enter must not confirm the destructive native confirm.
 *
 * Mechanism: docs/fixb1-mechanisms.md § Item 1 (MAUI's DisplayAlert on WinUI = a ContentDialog with OK as the PRIMARY button
 * and no DefaultButton → the primary button has the focus at open and Enter presses it). Fix: inside `#if WINDOWS` and
 * only with SpixiFlags.ConfirmSafeDefault ON, SConfirm.askAsync shows its OWN ContentDialog: OK = Primary, Cancel = the CLOSE
 * button, DefaultButton = Close; only Primary is OK (FixB1Rules.confirmIsOk, executed in csh FixB1Tests). The pure rule is in
 * the harness; this SOURCE pin (stripCode; brace-matched bodies; the preprocessor regions computed) holds the MAUI-bound half:
 *   SWITCH  — in askAsync, under `#if WINDOWS`: `SpixiFlags.ConfirmSafeDefault ? showSafeDefaultConfirm(…, the cancel text)
 *             : <today's call>`; `#else` = today's call; `asked` is taken right before the dialog statement on both paths;
 *   DIALOG  — showSafeDefaultConfirm (and its two helpers) live ONLY inside `#if WINDOWS`: Primary = ok, Close = cancel,
 *             DefaultButton = Close, no Secondary button; the answer is ONLY FixB1Rules.confirmIsOk((int)result); no XamlRoot
 *             → false; a throw faults the task (askAsync's catch: the fixed line, Cancel); on the main thread; no log line;
 *   SAME    — outside `#if WINDOWS` the file is today's file (the non-Windows projection, comment-stripped and whitespace-
 *             normalised, has today's SHA-256 — BRITTLE ON PURPOSE: switch off / iPhone / Mac / Android = byte for byte);
 *             the Windows projection of askAsync equals the non-Windows one except the ONE dialog statement (the gate, the
 *             lock checks, the 600 ms rule and the [CONFIRM] lines are the same on Windows); the new names appear nowhere
 *             outside `#if WINDOWS` in the tree but SpixiFlags (the switch) and the harness.
 *   BODY    — ★ #46 r1 (S-C-1): the WHOLE body of showSafeDefaultConfirm (comments stripped, whitespace collapsed) equals the expected
 *             text written in this pin, character for character — so `tcs.SetResult(true)`, an `Opened +=` / `KeyDown +=` handler, a
 *             second completion, a timer, any extra statement turns it red; the descriptive keys of DIALOG stay as well; the helper block
 *             holds exactly the three members (nothing else lives between `#if WINDOWS` and `#endif`);
 *   EMPTY   — ★ #46 r1 (S-C-4): the body answers false for a null XamlRoot, an EMPTY ok text and an EMPTY cancel text, before the
 *             dialog is made (an empty text hides that WinUI button, and DefaultButton = Close would name a button that is not there);
 *   DIRECTIVES — ★ #46 r1 (S-C-2 / S-C-3): the preprocessor directives of SConfirm.cs are EXACTLY `#if WINDOWS`, `#else`, `#endif`,
 *             `#if WINDOWS`, `#endif`, in that order (a `# if` is read like `#if`; no `#elif`, `#define`, `#undef`, `#region`, other `#if`);
 *             `project()` answers a sentinel (so every key that reads it is red) on any `#elif`, any directive but if / else / endif,
 *             any `#if` whose condition is not exactly `WINDOWS`, a nested or unbalanced block;
 *   WHOLE   — ★ #46 r1 (S-C-2): the WHOLE Windows projection of the file — the helper block (the second `#if WINDOWS … #endif`)
 *             removed and the one ternary dialog statement replaced by the base's one-line call — equals the WHOLE non-Windows
 *             projection (normalised): a Windows-only change to lockUp, the gate field, isOpen, tryNoteAlertOpened, noteAlertClosed, the 600 ms
 *             rule, the log lines or any other line fails it.
 *   FILE    — ★ #46 r2 (R2-1; the L204 rule: freeze security glue WHOLE): the WHOLE of Spixi/Utils/SConfirm.cs by SHA-256 (CRLF read as LF; comments and
 *             whitespace are part of the hash). The span-based keys above find a body by its signature and the first `{` after it, so
 *             `…string cancel) => Task.Delay(700).ContinueWith(t => true); private static Task<bool> showSafeDefaultConfirm2(…` (an expression-bodied
 *             stand-in that confirms after 700 ms with no dialog) or `winXamlRoot() => null; … winXamlRoot2()` kept them green; this key does not.
 *             ANY edit of the file, a comment too, is red until the hash is re-based after a look at the diff (#1596; as pins-perfb1toggle/a-extra
 *             and b-walk do). Keep the other keys: they say WHY a red file is red.
 *   RULES   — ★ #46 r3 (R3-1): the csh harness compiles WITHOUT `WINDOWS`, so a Windows-only arm in a pure rule (`#if WINDOWS / confirmIsOk(r) => r >= 0 / #else /
 *             today / #endif`) is never run by CSH. FixB1Rules.cs is held WHOLE by SHA-256 (CRLF read as LF; a BOM, a lone CR, a Unicode line end, a
 *             comment or a space also turns it red — re-base only after a look at the diff, #1596);
 *   NOARMS  — ★ #46 r3 (R3-1): Spixi/Utils/SafetyRules.cs, ConfirmGate.cs, S16PassRules.cs and FixB1Rules.cs hold NO preprocessor line at all (comments
 *             stripped; `^\s*#\s*\w+`): the rules the confirm and the flags lean on have one body on every platform, the one the harness runs.
 *   PERIMETER — ★ #46 r4 (R4-1 / R4-2): SafetyRules.cs, ConfirmGate.cs, S16PassRules.cs each WHOLE by SHA-256 of the exact bytes (the design answer: freeze whole,
 *             not more patterns); NOARMS stays. FILE and RULES hash the exact bytes too (one rule for the batch; the files are LF today).
 * Deliberate breaks (#802): fixb1 builder-a report — DefaultButton = Primary → red `defaultClose`; CloseButtonText = ok → red
 * `closeIsCancel`; `confirmIsOk((int)result)` → `result != 0` → red `answerByRule`; the `#if WINDOWS` around the helpers moved
 * below the first helper → red `windowsOnly`; a stray `;` outside `#if WINDOWS` → red `sameElsewhere`; the Windows OFF arm
 * without `, true` → red `switchShape`. #46 r1 (fixb1 fixer): `tcs.SetResult(true);` before the XamlRoot line, `dialog.Opened += (s, e) =>
 * tcs.SetResult(true);`, a `dialog.KeyDown += …` handler → red BODY; `#if WINDOWS` / `private static bool lockUp() => false;` / `#else` / today's
 * line / `#endif` around the lockUp line → red DIRECTIVES + WHOLE (+ sameElsewhere); the same with `#elif true` after the `#if WINDOWS` → red
 * DIRECTIVES + WHOLE + sameElsewhere (project() answers the sentinel); `|| string.IsNullOrEmpty(cancel)` removed → red BODY + EMPTY + DIALOG. #46 r2: the expression-bodied `showSafeDefaultConfirm(…) =>
 * Task.Delay(700).ContinueWith(t => true);` + a renamed `showSafeDefaultConfirm2` copy, and `winXamlRoot() => null;` + `winXamlRoot2`, → red FILE (+ BODY /
 * DIALOG); a comment edit → red FILE (intended). #46 r3 (R3-1): `#if WINDOWS / confirmIsOk(int r) => r >= 0 / #else / today / #endif` in FixB1Rules.cs → red RULES + NOARMS;
 * a Windows arm of `tooFast` (SafetyRules.cs), `tryEnter` (ConfirmGate.cs), `effectiveFlag` (S16PassRules.cs) → red NOARMS; `DividerLine.visible => true` under
 * `#if WINDOWS || MACCATALYST` → red RULES + NOARMS. #46 r4: `&& !System.OperatingSystem.IsWindows()` in tooFast / tryEnter, an `if (System.OperatingSystem.IsWindows()) { return false; }`
 * in effectiveFlag, `// one body\r#if WINDOWS\r…` and U+0085 line-end spellings → red PERIMETER. Restored. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // the file as it is on disk (CRLF read as LF, a BOM kept) — for the FILE hash
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
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
  /* the open preprocessor regions at a position: a stack of conditions, an #else arm as '!<cond>' */
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\n]*#[^\S\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { const c = st.pop(); st.push('!' + c); }
    }
    return st;
  };
  /* one platform's view of a file: `#if WINDOWS` arms kept (win = true) or dropped (win = false), the directive lines go.
   * strict (★ #46 r1, S-C-3: used for SConfirm.cs): ANYTHING but `#if WINDOWS` / `#else` / `#endif` — an `#elif`, a `#define`, an `#if` whose condition is
   * not exactly `WINDOWS`, a nested or unbalanced block, a second `#else` — answers BAD (a sentinel no comparison can equal), so a key that reads it is red.
   * drop = n (strict, win view): the n-th `#if WINDOWS … #endif` block (0-based) is removed whole (the helper block).
   * Not strict (the tree walk): an `#elif` after `#if WINDOWS` ends the Windows arm like `#else` does (the elif arm counts as outside). */
  const BAD = '<<BAD-PREPROCESSOR>>';
  const project = (src, win, o = {}) => {
    const out = [], st = []; let nth = -1;
    for (const line of src.split('\n')) {
      const m = /^\s*#\s*(\w+)\b(.*)$/.exec(line);
      const name = m ? m[1] : '', rest = m ? m[2].trim() : '';
      if (o.strict && m) {
        if (name === 'if') { if (rest !== 'WINDOWS' || st.length > 0) return BAD; st.push({ arm: true, n: ++nth, els: false }); continue; }
        if (name === 'else') { const t = st[st.length - 1]; if (!t || t.els || rest !== '') return BAD; t.arm = false; t.els = true; continue; }
        if (name === 'endif') { if (!st.length || rest !== '') return BAD; st.pop(); continue; }
        return BAD;
      }
      if (!o.strict && m && name === 'if') { st.push({ w: rest === 'WINDOWS', arm: true }); if (rest === 'WINDOWS') continue; out.push(line); continue; }
      if (!o.strict && m && (name === 'else' || name === 'elif')) { const top = st[st.length - 1]; if (top) top.arm = false; if (top && top.w && name === 'else') continue; out.push(line); continue; }
      if (!o.strict && m && name === 'endif') { const top = st.pop(); if (top && top.w) continue; out.push(line); continue; }
      let live;
      if (o.strict) {
        const t = st[st.length - 1];
        live = !t || (win ? (t.arm && t.n !== o.drop) : !t.arm);
      } else live = st.every((e) => !e.w || (win ? e.arm : !e.arm));
      if (live) out.push(line);
    }
    if (o.strict && st.length) return BAD;
    return out.join('\n');
  };

  const SC_F = 'Spixi/Utils/SConfirm.cs';
  const SC = rd(SC_F);
  const ask = span(SC, 'public static async Task<bool> askAsync(');
  const CANCEL = 'SpixiLocalization._SL("global-dialog-cancel")';
  const TODAY = 'page.displaySpixiAlert(title, text, ok, ' + CANCEL + ', true)';
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ── SWITCH ── */
  const swRe = new RegExp('long asked = Environment\\.TickCount64;\\s*#if WINDOWS\\s*Task<bool>\\? dialog = SpixiFlags\\.ConfirmSafeDefault\\s*\\?\\s*showSafeDefaultConfirm\\(title, text, ok, '
    + esc(CANCEL) + '\\)\\s*:\\s*' + esc(TODAY) + ';\\s*#else\\s*Task<bool>\\? dialog = ' + esc(TODAY) + ';\\s*#endif\\s*yes = dialog != null && await dialog;');
  const iSw = ask.text.indexOf('SpixiFlags.ConfirmSafeDefault');
  const sw = {
    found: ask.text.length > 0,
    switchShape: swRe.test(ask.text) && count(ask.text, 'SpixiFlags.ConfirmSafeDefault') === 1 && count(ask.text, 'showSafeDefaultConfirm(') === 1
      && count(ask.text, TODAY) === 2,
    switchOnWindowsOnly: iSw > 0 && regionsAt(SC, SC.indexOf('SpixiFlags.ConfirmSafeDefault')).join('|') === 'WINDOWS'
      && count(SC, 'SpixiFlags.ConfirmSafeDefault') === 1,
  };
  ok(F(sw).length === 0,
    '★ fixb1 item 1 SWITCH: askAsync — under `#if WINDOWS` the dialog is `SpixiFlags.ConfirmSafeDefault ? showSafeDefaultConfirm(title, text, ok, <the cancel text>) : <today\'s displaySpixiAlert(…, true)>`; `#else` = today\'s call; `asked` is taken right before it on both paths and `yes = dialog != null && await dialog` follows — failing: ' + JSON.stringify(F(sw)));

  /* ── DIALOG ── */
  const SIGS = ['private static Task<bool> showSafeDefaultConfirm(string title, string text, string ok, string cancel)',
    'private static Microsoft.UI.Xaml.XamlRoot? winXamlRoot()', 'private static Microsoft.UI.Xaml.Style? winDialogStyle()'];
  const parts = SIGS.map((s) => span(SC, s));
  const [dlg, xr, sty] = parts.map((p) => p.text);
  const tryBody = span(dlg, 'try').text;
  const dg = {
    found: parts.every((p) => p.text.length > 0) && SIGS.every((s) => count(SC, s) === 1),
    windowsOnly: parts.every((p) => regionsAt(SC, p.at).join('|') === 'WINDOWS' && regionsAt(SC, p.end).join('|') === 'WINDOWS'),
    mainThread: /^\{\s*var tcs = new TaskCompletionSource<bool>\(\);\s*Microsoft\.Maui\.ApplicationModel\.MainThread\.BeginInvokeOnMainThread\(async \(\) =>\s*\{\s*try\s*\{/.test(dlg)
      && /\}\s*\);\s*return tcs\.Task;\s*\}$/.test(dlg),
    noRootCancel: /Microsoft\.UI\.Xaml\.XamlRoot\? root = winXamlRoot\(\);\s*if \(root == null \|\| string\.IsNullOrEmpty\(ok\) \|\| string\.IsNullOrEmpty\(cancel\)\)\s*\{\s*tcs\.TrySetResult\(false\);\s*return;\s*\}/.test(tryBody),   // ★ #46 r1 (S-C-4): an empty OK / Cancel text → Cancel too
    primaryIsOk: /PrimaryButtonText = ok,/.test(dlg) && count(dlg, 'PrimaryButtonText') === 1,
    closeIsCancel: /CloseButtonText = cancel,/.test(dlg) && count(dlg, 'CloseButtonText') === 1,
    defaultClose: /DefaultButton = Microsoft\.UI\.Xaml\.Controls\.ContentDialogButton\.Close,/.test(dlg) && count(dlg, 'DefaultButton') === 1,
    noSecondary: !/SecondaryButton|IsPrimaryButtonEnabled\s*=\s*true|PrimaryButtonClick|CloseButtonClick/.test(dlg),
    dialogShape: /var dialog = new Microsoft\.UI\.Xaml\.Controls\.ContentDialog\s*\{\s*Title = title,\s*Content = new Microsoft\.UI\.Xaml\.Controls\.TextBlock \{ Text = text, TextWrapping = Microsoft\.UI\.Xaml\.TextWrapping\.Wrap \},\s*PrimaryButtonText = ok,\s*CloseButtonText = cancel,\s*DefaultButton = Microsoft\.UI\.Xaml\.Controls\.ContentDialogButton\.Close,\s*XamlRoot = root\s*\};/.test(dlg),
    answerByRule: /Microsoft\.UI\.Xaml\.Controls\.ContentDialogResult result = await dialog\.ShowAsync\(\);\s*tcs\.TrySetResult\(FixB1Rules\.confirmIsOk\(\(int\)result\)\);\s*\}\s*catch \(Exception ex\)\s*\{\s*tcs\.TrySetException\(ex\);\s*\}/.test(dlg)
      && count(dlg, 'TrySetResult(') === 2 && !/TrySetResult\(true|TrySetResult\(!|TrySetCanceled/.test(dlg) && count(dlg, 'ShowAsync(') === 1,
    styleNeverThrows: /^\{\s*try\s*\{\s*var res = Microsoft\.UI\.Xaml\.Application\.Current\?\.Resources;\s*if \(res != null && res\.TryGetValue\("DefaultContentDialogStyle", out object\? st\)\)\s*\{\s*return st as Microsoft\.UI\.Xaml\.Style;\s*\}\s*\}\s*catch \(Exception\)\s*\{\s*\}\s*return null;\s*\}$/.test(sty)
      && /Microsoft\.UI\.Xaml\.Style\? style = winDialogStyle\(\);\s*if \(style != null\)\s*\{\s*dialog\.Style = style;\s*\}/.test(dlg),
    xamlRootOrder: /^\{\s*var app = Application\.Current;\s*if \(app\?\.MainPage\?\.Handler\?\.PlatformView is Microsoft\.UI\.Xaml\.UIElement el && el\.XamlRoot != null\)\s*\{\s*return el\.XamlRoot;\s*\}\s*if \(app != null && app\.Windows\.Count > 0 && app\.Windows\[0\]\.Handler\?\.PlatformView is Microsoft\.UI\.Xaml\.Window w\s*&& w\.Content\?\.XamlRoot != null\)\s*\{\s*return w\.Content\.XamlRoot;\s*\}\s*return null;\s*\}$/.test(xr),
    noLog: !/Logging\./.test(dlg + xr + sty) && count(SC, 'Logging.') === 5,
    noTimer: !/Task\.Delay|Timer|TickCount|CancellationToken/.test(dlg + xr + sty),
  };
  ok(F(dg).length === 0,
    '★ fixb1 item 1 DIALOG: showSafeDefaultConfirm + winXamlRoot + winDialogStyle exist once, ONLY inside `#if WINDOWS`; on the main thread a ContentDialog with Title, a wrapping TextBlock, Primary = ok, Close = cancel, DefaultButton = Close, no Secondary button; no XamlRoot → false, and an empty OK or Cancel text → false (S-C-4); the answer is ONLY FixB1Rules.confirmIsOk((int)result); a throw faults the task (askAsync\'s catch logs its fixed line and answers Cancel); the WinUI default style through TryGetValue inside a try; no log line, no timer (L157) — failing: ' + JSON.stringify(F(dg)));

  /* ── BODY (★ #46 r1, S-C-1): the WHOLE body of showSafeDefaultConfirm, exactly — comments stripped, whitespace runs collapsed to one space.
   * Any extra statement turns this red: `tcs.SetResult(true)`, `dialog.Opened += …`, `dialog.KeyDown += …`, a timer, a second completion.
   * The expected text is the body as of the S-C-4 guard (an empty ok or cancel answers false). A change to this method re-bases THIS text, on purpose. */
  const EXPECTED_BODY = [
    '{ var tcs = new TaskCompletionSource<bool>();',
    'Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(async () => {',
    'try {',
    'Microsoft.UI.Xaml.XamlRoot? root = winXamlRoot();',
    'if (root == null || string.IsNullOrEmpty(ok) || string.IsNullOrEmpty(cancel)) { tcs.TrySetResult(false); return; }',
    'var dialog = new Microsoft.UI.Xaml.Controls.ContentDialog {',
    'Title = title,',
    'Content = new Microsoft.UI.Xaml.Controls.TextBlock { Text = text, TextWrapping = Microsoft.UI.Xaml.TextWrapping.Wrap },',
    'PrimaryButtonText = ok,',
    'CloseButtonText = cancel,',
    'DefaultButton = Microsoft.UI.Xaml.Controls.ContentDialogButton.Close,',
    'XamlRoot = root };',
    'Microsoft.UI.Xaml.Style? style = winDialogStyle();',
    'if (style != null) { dialog.Style = style; }',
    'Microsoft.UI.Xaml.Controls.ContentDialogResult result = await dialog.ShowAsync();',
    'tcs.TrySetResult(FixB1Rules.confirmIsOk((int)result)); }',
    'catch (Exception ex) { tcs.TrySetException(ex); } });',
    'return tcs.Task; }'].join(' ');
  const bodyN = norm(dlg);
  const firstDiff = (() => { let i = 0; while (i < bodyN.length && i < EXPECTED_BODY.length && bodyN[i] === EXPECTED_BODY[i]) i++; return i; })();
  /* the helper block (the second `#if WINDOWS … #endif`) holds exactly the three members and nothing else (no field, no static constructor, no hook) */
  const helperBlock = (() => {
    const lines = SC.split('\n'); let nIf = -1, inB = false; const keep = [];
    for (const l of lines) {
      const m = /^\s*#\s*(\w+)\b(.*)$/.exec(l);
      if (m && m[1] === 'if') { nIf++; if (nIf === 1) { inB = true; continue; } }
      if (m && m[1] === 'endif' && inB) { inB = false; continue; }
      if (inB) keep.push(l);
    }
    return keep.join('\n');
  })();
  const helperRest = parts.reduce((t, p) => { const q = span(t, SIGS[parts.indexOf(p)]); return q.end > 0 ? t.slice(0, q.at) + t.slice(q.end) : t; }, helperBlock);
  const bd = {
    found: dlg.length > 0,
    bodyExact: bodyN === EXPECTED_BODY,
    onlyThreeMembers: helperBlock.length > 0 && helperRest.trim() === '',
  };
  ok(F(bd).length === 0,
    '★ fixb1 item 1 BODY (#46 r1 S-C-1): the WHOLE body of showSafeDefaultConfirm (comments stripped, whitespace collapsed) is exactly the expected text — the answer is ONLY `tcs.TrySetResult(false)` (no XamlRoot / empty text / thrown) or `tcs.TrySetResult(FixB1Rules.confirmIsOk((int)result))` after `dialog.ShowAsync()`; no other statement, no Opened / KeyDown / Closing handler, no timer, no second completion; and the helper block holds exactly showSafeDefaultConfirm, winXamlRoot and winDialogStyle — failing: ' + JSON.stringify(F(bd))
    + (bd.bodyExact ? '' : ' ' + JSON.stringify({ sha: sha(bodyN), firstDiff, got: bodyN.slice(Math.max(0, firstDiff - 50), firstDiff + 90), want: EXPECTED_BODY.slice(Math.max(0, firstDiff - 50), firstDiff + 90) })));

  /* ── EMPTY (★ #46 r1, S-C-4) ── */
  const em = {
    found: dlg.length > 0,
    guard: /Microsoft\.UI\.Xaml\.XamlRoot\? root = winXamlRoot\(\);\s*if \(root == null \|\| string\.IsNullOrEmpty\(ok\) \|\| string\.IsNullOrEmpty\(cancel\)\)\s*\{\s*tcs\.TrySetResult\(false\);\s*return;\s*\}\s*var dialog = new Microsoft\.UI\.Xaml\.Controls\.ContentDialog/.test(dlg),
    both: count(dlg, 'string.IsNullOrEmpty(ok)') === 1 && count(dlg, 'string.IsNullOrEmpty(cancel)') === 1 && count(dlg, 'IsNullOrEmpty(') === 2,
    beforeDialog: dlg.indexOf('string.IsNullOrEmpty(cancel)') > 0 && dlg.indexOf('string.IsNullOrEmpty(cancel)') < dlg.indexOf('new Microsoft.UI.Xaml.Controls.ContentDialog'),
  };
  ok(F(em).length === 0,
    '★ fixb1 item 1 EMPTY (#46 r1 S-C-4): the dialog body refuses an EMPTY ok text and an EMPTY cancel text (and a null XamlRoot) with `tcs.TrySetResult(false); return;` BEFORE the ContentDialog is made — WinUI hides a button with an empty text, and DefaultButton = Close would name a button that is not there; the OFF arm cancels too (MAUI throws on an empty cancel → askAsync\'s catch) — failing: ' + JSON.stringify(F(em)));

  /* ── SAME ── */
  const nonWin = norm(project(SC, false, { strict: true }));
  const win = project(SC, true, { strict: true });
  const askNon = span(project(SC, false, { strict: true }), 'public static async Task<bool> askAsync(').text;
  const askWin = span(win, 'public static async Task<bool> askAsync(').text;
  const DIALOG_NON = /Task<bool>\? dialog = [^;]*;/;
  /* today's SConfirm.cs (efcde241), comment-stripped and whitespace-normalised */
  const TODAY_SHA = 'a2b534b8e703c4ba86a427f4590ddcead8b10c72194b51008dfa4c1a4e91c3f1';
  const names = ['ConfirmSafeDefault', 'showSafeDefaultConfirm', 'winXamlRoot', 'winDialogStyle', 'ContentDialog', 'FixB1Rules.confirmIsOk'];
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const outside = [];
  for (const f of walk('Spixi')) {
    if (f === 'Spixi/Utils/SpixiFlags.cs' || f === 'Spixi/Utils/FixB1Rules.cs' || f.startsWith('Spixi/Platforms/Windows/')) continue;
    const t = project(rd(f), false);
    for (const n of names) if (n === 'ContentDialog' ? (f !== 'Spixi/Utils/SConfirm.cs' ? false : t.includes(n)) : t.includes(n)) outside.push(f + ':' + n);
  }
  const sm = {
    sameElsewhere: sha(nonWin) === TODAY_SHA,
    sameOnWindows: askNon.length > 0 && askWin.length > 0 && count(askNon, 'Task<bool>? dialog = ') === 1 && count(askWin, 'Task<bool>? dialog = ') === 1
      && norm(askNon.replace(DIALOG_NON, '<DIALOG>')) === norm(askWin.replace(DIALOG_NON, '<DIALOG>')),
    gateLockFast: /long token = gate\.tryEnter\(\);/.test(askWin) && /if \(lockUp\(\)\)\s*\{\s*Logging\.info\(SafetyRules\.confirmLine\(verb, "busy"\)\);\s*return false;\s*\}\s*long asked = Environment\.TickCount64;\s*Task<bool>\? dialog = /.test(askWin)
      && /yes = dialog != null && await dialog;\s*if \(yes && lockUp\(\)\)\s*\{\s*yes = false;\s*\}\s*if \(yes && SafetyRules\.tooFast\(Environment\.TickCount64 - asked\)\)/.test(askWin)
      && /finally\s*\{\s*gate\.exit\(token\);\s*\}/.test(askWin),
    namesOnlyOnWindows: outside.length === 0,
  };
  ok(F(sm).length === 0,
    '★ fixb1 item 1 SAME: outside `#if WINDOWS` SConfirm.cs is today\'s file (the comment-stripped, whitespace-normalised non-Windows view has today\'s SHA-256 — switch OFF and every other platform = today\'s code); on Windows askAsync is the same method but the ONE dialog statement (the gate token, the lock check before and after, `asked` right before the dialog, the 600 ms rule, the release in finally); the new names appear in no other file outside `#if WINDOWS` — failing: ' + JSON.stringify(F(sm)) + (outside.length ? ' outside: ' + outside.join(',') : '') + (sm.sameElsewhere ? '' : ' sha ' + sha(nonWin)));

  /* ── DIRECTIVES + WHOLE (★ #46 r1, S-C-2 / S-C-3) ── */
  const directives = SC.split('\n').map((l) => /^\s*#\s*(\w+)\b(.*)$/.exec(l)).filter(Boolean).map((m) => m[1] + (m[2].trim() ? ' ' + m[2].trim() : ''));
  const WANT_DIRS = ['if WINDOWS', 'else', 'endif', 'if WINDOWS', 'endif'];
  const dr = {
    exactList: directives.length === WANT_DIRS.length && directives.every((d, i) => d === WANT_DIRS[i]),
    noElif: !directives.some((d) => /^(elif|define|undef|region|endregion|pragma|nullable|error|warning|line)\b/.test(d)),
    projectOk: project(SC, true, { strict: true }) !== BAD && project(SC, false, { strict: true }) !== BAD,
    plainLineEnds: !/[\r\u0085\u2028\u2029\v\f]/.test(readFileSync(join(root, SC_F), 'utf8').replace(/\r\n/g, '\n')),   // for C# a line also ends at these: the line-based reading above could not see them
  };
  ok(F(dr).length === 0,
    '★ fixb1 item 1 DIRECTIVES (#46 r1 S-C-2 / S-C-3): the preprocessor directives of SConfirm.cs are EXACTLY `#if WINDOWS`, `#else`, `#endif`, `#if WINDOWS`, `#endif` in that order (a `# if` counts as `#if`; no `#elif`, `#define`, `#undef`, `#region`, other `#if`; every condition exactly `WINDOWS`; no nesting; no line end but \\n) — failing: ' + JSON.stringify(F(dr)) + ' ' + JSON.stringify(directives));

  const winNoHelper = norm(project(SC, true, { strict: true, drop: 1 }));
  const TERN = norm('Task<bool>? dialog = SpixiFlags.ConfirmSafeDefault ? showSafeDefaultConfirm(title, text, ok, ' + CANCEL + ') : ' + TODAY + ';');
  const BASE = norm('Task<bool>? dialog = ' + TODAY + ';');
  const winAsBase = winNoHelper.split(TERN).join(BASE);
  const nonN = norm(project(SC, false, { strict: true }));
  const diffAt = (() => { let i = 0; while (i < winAsBase.length && i < nonN.length && winAsBase[i] === nonN[i]) i++; return i; })();
  const wh = {
    notBad: winNoHelper !== BAD && nonN !== BAD,
    oneTernary: count(winNoHelper, TERN) === 1,
    same: winNoHelper !== BAD && nonN !== BAD && winAsBase === nonN,
  };
  ok(F(wh).length === 0,
    '★ fixb1 item 1 WHOLE (#46 r1 S-C-2): the WHOLE Windows projection of SConfirm.cs — the helper block (the second `#if WINDOWS … #endif`) removed, and the one ternary dialog statement replaced by the base\'s one-line `displaySpixiAlert(…, true)` call — equals the WHOLE non-Windows projection (comments stripped, whitespace collapsed): a Windows-only change of lockUp, the gate field, isOpen, tryNoteAlertOpened, noteAlertClosed, the 600 ms rule, a log line or any other line fails it — failing: ' + JSON.stringify(F(wh))
    + (wh.same ? '' : ' ' + JSON.stringify({ diffAt, win: winAsBase.slice(Math.max(0, diffAt - 60), diffAt + 100), non: nonN.slice(Math.max(0, diffAt - 60), diffAt + 100) })));

  /* ── FILE (★ #46 r2, R2-1): the WHOLE file, by SHA-256 ── */
  const FILE_FROZEN = 'b9b4d3b127a880724d105fb461ca4606addd893145ae47dbd7f6f9bb64dc3b2c';
  const hashFile = (f) => createHash('sha256').update(readBytes(join(root, f))).digest('hex');   // ★ #46 r4: the EXACT bytes (no CRLF read as LF; a BOM or any line end counts)
  const fileGot = hashFile(SC_F);
  ok(fileGot === FILE_FROZEN,
    '★ fixb1 item 1 FILE (#46 r2 R2-1): Spixi/Utils/SConfirm.cs is held WHOLE by SHA-256 (the EXACT bytes; comments and whitespace included) — the span keys above find a body by its signature and the first `{`, so an expression-bodied stand-in (`… string cancel) => Task.Delay(700).ContinueWith(t => true); private static Task<bool> showSafeDefaultConfirm2(…`) or `winXamlRoot() => null; … winXamlRoot2()` could slip past them. ANY edit of the file, a comment too — and a BOM, a lone CR or a Unicode line-end change — is red here (the exact bytes are hashed: a line-end or BOM change also turns it red): re-base this hash ONLY after a look at the diff (#1596; the other keys of this module say what changed). want ' + FILE_FROZEN.slice(0, 12) + '… got ' + fileGot);

  /* ── RULES + NOARMS (★ #46 r3, R3-1) ── */
  const RULES_FROZEN = 'e89f42e073f2ace5a34d63e8f8a47da60a9de0914569edc8892489f779262c68';
  const rulesGot = hashFile('Spixi/Utils/FixB1Rules.cs');
  ok(rulesGot === RULES_FROZEN,
    '★ fixb1 item 1 RULES (#46 r3 R3-1): Spixi/Utils/FixB1Rules.cs is held WHOLE by SHA-256 (the EXACT bytes; a comment, a space, a BOM, a CRLF or a lone CR / Unicode line end also turns it red) — the csh harness compiles WITHOUT `WINDOWS`, so a `#if WINDOWS` arm of confirmIsOk or DividerLine would never run there. Re-base this hash ONLY after a look at the diff (#1596). want ' + RULES_FROZEN.slice(0, 12) + '… got ' + rulesGot);
  const NOARM_FILES = ['Spixi/Utils/SafetyRules.cs', 'Spixi/Utils/ConfirmGate.cs', 'Spixi/Utils/S16PassRules.cs', 'Spixi/Utils/FixB1Rules.cs'];
  const withDirectives = NOARM_FILES.filter((f) => !existsSync(join(root, f)) || /^[^\S\n]*#[^\S\n]*\w+/m.test(rd(f)));
  ok(NOARM_FILES.every((f) => existsSync(join(root, f))) && withDirectives.length === 0,
    '★ fixb1 item 1 NOARMS (#46 r3 R3-1): SafetyRules.cs, ConfirmGate.cs, S16PassRules.cs and FixB1Rules.cs hold NO preprocessor line (comments stripped) — the pure rules the confirm and the switches use have one body on every platform, the one csh runs; a `#if WINDOWS` arm of tooFast / tryEnter / effectiveFlag / confirmIsOk / DividerLine.visible is red — failing: ' + JSON.stringify(withDirectives));

  /* ── PERIMETER (★ #46 r4, R4-1 / R4-2): the three pure rules the confirm leans on, WHOLE ── */
  const PERIM = { 'Spixi/Utils/SafetyRules.cs': '10cde1ec5cc00c5b35b3207f22161f9e61a171e711b320f158d586fc2a54247b', 'Spixi/Utils/ConfirmGate.cs': '6019bb6a613476953ff65b4c9e865bd7f3f4cca50f7af4ec9c06a8a14c291290', 'Spixi/Utils/S16PassRules.cs': '40507d4be88b1465b71425cab1a513c8a3555b81d05036ecfd2b6e4e2c29cd51' };
  const perimBad = Object.entries(PERIM).filter(([f, want]) => hashFile(f) !== want).map(([f, want]) => f + ' want ' + want.slice(0, 12) + '… got ' + hashFile(f).slice(0, 12) + '…');
  ok(perimBad.length === 0,
    '★ fixb1 item 1 PERIMETER (#46 r4 R4-1 / R4-2): SafetyRules.cs, ConfirmGate.cs and S16PassRules.cs are each held WHOLE by SHA-256 of their EXACT bytes — a run-time OS arm (`System.OperatingSystem.IsWindows()`), a Windows-only statement, a comment line-ended by a lone CR / U+0085 / U+2028 / U+2029 (C# ends a `//` comment there; the stripper does not), a `\\u` identifier escape: the csh harness runs none of them. A line-end or BOM change also turns this red. Re-base a hash ONLY after a look at the diff (#1596) — failing: ' + JSON.stringify(perimBad));

  /* ── HARNESS ── */
  const CSH = raw('scripts/csh/csh.csproj');
  const T = existsSync(join(root, 'scripts/csh/FixB1Tests.cs')) ? raw('scripts/csh/FixB1Tests.cs') : '';
  const RU = rd('Spixi/Utils/FixB1Rules.cs');
  const hz = {
    rule: /public static bool confirmIsOk\(int contentDialogResult\)\s*\{\s*return contentDialogResult == 1;\s*\}/.test(RU),
    pure: !/^\s*using\s/m.test(RU) && !/Microsoft\.|IXICore|Preferences|Logging|SpixiFlags/.test(RU),
    compiled: count(CSH, '<Compile Include="../../Spixi/Utils/FixB1Rules.cs" />') === 1,
    tests: /\[TestClass\]\s*public class FixB1Tests/.test(T) && /\[TestMethod\]\s*public void confirm_is_ok_only_for_primary\(\)/.test(T),
  };
  ok(F(hz).length === 0,
    '★ fixb1 item 1 HARNESS: FixB1Rules.confirmIsOk = (result == 1) only, FixB1Rules.cs is pure (no using, no MAUI / Core), csh.csproj compiles it, FixB1Tests.confirm_is_ok_only_for_primary runs it — failing: ' + JSON.stringify(F(hz)));
}
