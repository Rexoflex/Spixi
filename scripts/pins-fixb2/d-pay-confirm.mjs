/* ==== fixb2 item 4 (n-20261117-win-confirm-enter-payment-miniapp, Damir's ruling #1633) — Windows: Enter alone never confirms a
 * payment or a mini-app action.
 *
 * Mechanism (docs/fixb1-mechanisms.md § Item 1, P50): MAUI's DisplayAlert on WinUI is a ContentDialog with the accept text on the
 * PRIMARY button and no DefaultButton, so the primary button has the focus at open and Enter presses it. The payment send confirm
 * (SPayments.confirmAndAuth — no auth step follows it on WinUI) and the three mini-app confirms (MiniAppPage.handleAction) were
 * still that dialog. Fix: inside `#if WINDOWS`, each call site with its OWN switch (SpixiFlags.PayConfirmSafeDefault /
 * MiniAppConfirmSafeDefault, with NativeConfirm: FixB2Rules.useSafeDialog) calls SConfirm.askPlainSafeWinAsync — the SAME dialog code
 * as the destructive confirm (SConfirm.showSafeDefaultConfirm: OK text = Primary, Cancel text = Close, DefaultButton = Close, only
 * ContentDialogResult.Primary is yes, the item-3 focus step); `#else` and the switch-OFF arm are the old displaySpixiAlert call.
 * The pure rules and the REAL SpixiFlags.init / ConfirmGate run in csh (scripts/csh/FixB2PayTests.cs). The Windows C# cannot be
 * compiled or run in the cloud: this is a SOURCE pin (stripCode; brace-matched bodies; the preprocessor views computed) — what it
 * proves is the text of the Windows arm, not its behaviour on a Windows machine (the walk rows do that).
 *   PAY-OFF   — SPayments.cs with the `#if WINDOWS` arm dropped (the view every other platform compiles) is the base file BYTE FOR
 *               BYTE (SHA-256 of the exact bytes at 06a4845d); the directives are only `#if WINDOWS` / `#else` / `#endif`, none
 *               hidden in a comment;
 *   PAY-ON    — the Windows arm in confirmAndAuth is ONE statement: `var alertTask = FixB2Rules.useSafeDialog(SpixiFlags.
 *               PayConfirmSafeDefault, SpixiFlags.NativeConfirm) ? SConfirm.askPlainSafeWinAsync(<args>) : page.displaySpixiAlert(
 *               <args>);` — both arms take the SAME argument text, and it is the base call's (title, body, the two button texts);
 *   PAY-REST  — the WHOLE Windows view of SPayments.cs with that one statement taken out equals the base file with its one
 *               statement taken out (comments stripped, whitespace collapsed; SHA-256 against the base, for the method body AND for
 *               the file): the texts, the catch, `if (!ok)`, the auth step, the WinUI rule, every caller and every other payment
 *               path are the base's; exactly ONE preprocessor block in the file;
 *   APP-OFF   — MiniAppPage.xaml.cs with the three `#if WINDOWS` arms dropped is the base file byte for byte (as PAY-OFF);
 *   APP-ON    — the three Windows arms in handleAction, in the order name actions · payment · any other action: `if (!await (
 *               FixB2Rules.useSafeDialog(SpixiFlags.MiniAppConfirmSafeDefault, SpixiFlags.NativeConfirm) ? SConfirm.
 *               askPlainSafeWinAsync(<args>) : displaySpixiAlert(<args>)))` — both arms the SAME argument text = the base call's;
 *   APP-AFTER — the WHOLE Windows view of MiniAppPage.xaml.cs with its three `if (!await …)` conditions taken out equals the base
 *               file with its three taken out (comments stripped, whitespace collapsed; SHA-256 against the base, for handleAction
 *               AND for the file): what runs after a no (`return;` · `sendActionRejected(…, "rejected"); return;`) and after a yes
 *               (addTransaction, the HTTP post, the alerts) is the base's;
 *   ENTRY     — SConfirm.askPlainSafeWinAsync, only inside `#if WINDOWS`: its WHOLE body is the expected text — the gate first
 *               (tryEnter; refused → false), then showSafeDefaultConfirm(title, text, ok, cancel), `return dialog != null && await
 *               dialog;`, every throw → false, the gate released in finally; no `true` literal, no timer, no lock check and no
 *               600 ms rule (the old path of these call sites has neither); two fixed log lines, no dialog text in them;
 *   FLAGS     — SpixiFlags: the two keys (int prefs), both properties `= true`, both reads with absent = 1 inside init's try, both
 *               through S16PassRules.effectiveFlag after the catch, ONE Logging.info(FixB2Rules.flagsLine(…)) right after the fixb1
 *               line as the LAST statement of init; the line's fixed words; no Developer-screen control;
 *   WINDOWS-ONLY — the four new names appear outside `#if WINDOWS` in no file of Spixi/ but SpixiFlags.cs and FixB2Rules.cs; and
 *               (★ #46 r1, reader S MAJOR) in EVERY C# file of Spixi/, ALL preprocessor regions included, the BARE names (whole
 *               words in the comment-stripped text) match an EXACT table name → file → count: the entry has exactly FOUR callers
 *               (SPayments ×1, MiniAppPage ×3) for these spellings of a fifth: a call, a call with a space, a method group, a
 *               nameof, a string that holds the whole name; each switch is read only at its own call sites; the key constants and
 *               preference names only in SpixiFlags.cs; no `\u` identifier escape and (★ #46 r2) no Unicode FORMAT character (Cf)
 *               outside a literal in Spixi/; (★ #46 r2, reader S2 MAJOR) the walk skips `bin` / `obj` only directly under Spixi/
 *               and matches `.cs` without case. NOT held here (the #1627 class, accepted for source pins): a `://` inside code
 *               that stripCode reads as no comment and so drops a live line inside a later block comment; a reflection name
 *               built from string pieces; the Ixian-Core files that Spixi.csproj imports (Core is BE-only);
 *   RULES     — the item-4 span of FixB2Rules.cs is the expected text (flagsLine; useSafeDialog = ownSwitch && alertDropOn) and
 *               FixB2PayTests holds its six tests.
 * LIMITS (as #1627 / P50): a text pin holds text, not bindings — a directive hidden in a multi-line string literal, a type that
 * shadows Task / SConfirm, or a csproj `Compile Remove` is not seen here; the pull request's diff review and the Windows compile hold
 * those. SConfirm.cs and SpixiFlags.cs are also held WHOLE by SHA-256 (pins-fixb1/a-confirm FILE, g-sparekeep FLAGSFILE).
 * Deliberate breaks (#802; fixb2 builder-d report, each in a full temp copy of the tree, then restored): the `#else` arm's
 * "wallet-send2-confirm" → "wallet-send2-info" → red PAY-OFF only; the Windows ON arm's `title, body,` → `body, title,` → red
 * PAY-ON only; `ok = true;` added after the statement inside the Windows arm → red PAY-REST only; the mini-app payment `#else`
 * arm's "rejected" → "error" → red APP-OFF only; the first Windows ON arm's `global-dialog-ok` → `global-dialog-cancel` → red
 * APP-ON only; the Windows payment arm's block without its `sendActionRejected(…);` line → red APP-AFTER only; the entry's busy
 * `return false;` → `return true;` → red ENTRY only (+ pins-fixb1/a-confirm FILE); the read `Get(PayConfirmSafeDefaultKey, 1)` →
 * `, 0)` → red FLAGS only (+ CSH, + g-sparekeep FLAGSFILE); `private static bool leak => SpixiFlags.PayConfirmSafeDefault;` added to
 * Utils.cs (outside `#if WINDOWS`) → red WINDOWS-ONLY only; useSafeDialog's `&&` → `||` → red RULES only (+ CSH).
 * #46 r1 (the WINDOWS-ONLY table; each in a full temp copy, red on WINDOWS-ONLY only, restored): G1 (control) a plain fifth call
 * `_ = SConfirm.askPlainSafeWinAsync("a", "b", "c", "d");` inside `#if WINDOWS` in Utils.cs; G2 the same as a METHOD GROUP
 * (`System.Func<string, string, string, string, System.Threading.Tasks.Task<bool>> g = SConfirm.askPlainSafeWinAsync; _ = g("a", "b", "c", "d");`);
 * G3 the same with a SPACE before `(`; G4 a second reader `bool r = SpixiFlags.MiniAppConfirmSafeDefault;` inside `#if WINDOWS` in Utils.cs;
 * G5 `Preferences.Default.Set(SpixiFlags.PayConfirmSafeDefaultKey, 0);` inside `#if WINDOWS` in Utils.cs (a store of the key);
 * G6 the call written with an identifier escape (`SConfirm.\u0061skPlainSafeWinAsync(…)`) → red `noIdentifierEscape`.
 * #46 r2 (each in a full temp copy, red on WINDOWS-ONLY only, restored): H1 a new `Spixi/Utils/bin/Fifth.cs` with a plain call of the entry
 * inside `#if WINDOWS`; H2 a new `Spixi/Pages/obj/R.cs` that reads SpixiFlags.PayConfirmSafeDefault inside `#if WINDOWS`; H3 a new
 * `Spixi/Utils/Fifth.CS` with the call; H4 a fifth call in Utils.cs with U+200B inside the entry's name → red `noFormatCharacter`. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // the file as it is on disk (no CRLF normalisation; a BOM kept)
export default async function (h) {
  const { ok, root, stripCode, readdirSync, existsSync, join } = h;
  const exact = (f) => (existsSync(join(root, f)) ? readBytes(join(root, f)).toString('utf8') : '');
  const rd = (f) => stripCode(exact(f).replace(/^\uFEFF/, ''));
  const span = (t, sig, from = 0) => {
    const at = t.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
    const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, end: k + 1, text: t.slice(o, k + 1) }; }
    return { at, end: -1, text: '' };
  };
  /* the argument text of the call that opens at `open` (the index of its `(`): balanced, string literals skipped */
  const args = (t, open) => {
    let d = 0;
    for (let k = open; k < t.length; k++) {
      const c = t[k];
      if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
      if (c === '(') d++; else if (c === ')' && --d === 0) return { text: t.slice(open + 1, k), end: k + 1 };
    }
    return { text: '', end: -1 };
  };
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directives = (src) => src.split('\n').map((l) => /^\s*#\s*(\w+)\b(.*)$/.exec(l)).filter(Boolean).map((m) => m[1] + (m[2].trim() ? ' ' + m[2].trim() : ''));
  /* one platform's view of a file, STRICT: only `#if WINDOWS` / `#else` / `#endif`, not nested — anything else answers BAD (a
   * sentinel no comparison equals). win = true keeps the `#if WINDOWS` arms, win = false the `#else` arms; the directive lines go. */
  const BAD = '<<BAD-PREPROCESSOR>>';
  const view = (src, win) => {
    const out = []; let st = null;
    for (const line of src.split('\n')) {
      const m = /^\s*#\s*(\w+)\b(.*)$/.exec(line);
      if (m) {
        const name = m[1], rest = m[2].trim();
        if (name === 'if') { if (rest !== 'WINDOWS' || st) return BAD; st = { arm: true, els: false }; continue; }
        if (name === 'else') { if (!st || st.els || rest) return BAD; st.arm = false; st.els = true; continue; }
        if (name === 'endif') { if (!st || rest) return BAD; st = null; continue; }
        return BAD;
      }
      if (!st || (win ? st.arm : !st.arm)) out.push(line);
    }
    return st ? BAD : out.join('\n');
  };
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const PLAIN = (t) => !/[\r\u0085\u2028\u2029\v\f]/.test(t);   // for C# a line also ends at these; the line-based views could not see them

  /* ───────────────────────── the payment confirm ───────────────────────── */
  const PAY_F = 'Spixi/Utils/SPayments.cs';
  const PAY_BASE_BYTES = '8e55cff34421efd755072f709aecfb320e83dc76ada69d682243f476a6567f10';   // SPayments.cs at 06a4845d, the exact bytes
  const PAY_CONF_REST = '39b46dede84988f1f1d885756c66ae93cc3234916ec18ee2ec2dd677c89cf34c';    // base confirmAndAuth body, the one statement as <CONFIRM>
  const PAY_FILE_REST = 'df4ee415a8305e98681abbccaf59bf344578a8fc256e9c097d64a76e29110258';    // base file (stripped, normalised), the one statement as <CONFIRM>
  const CONF_SIG = 'private static async Task<bool> confirmAndAuth(SpixiContentPage page, string address, IxiNumber amount, IxiNumber fee)';
  const PAY_ARGS = 'title, body, SpixiLocalization._SL("wallet-send2-confirm"), SpixiLocalization._SL("global-dialog-cancel")';
  const PAY_SEL = 'FixB2Rules.useSafeDialog(SpixiFlags.PayConfirmSafeDefault, SpixiFlags.NativeConfirm)';
  const PAY_TERN = 'var alertTask = ' + PAY_SEL + ' ? SConfirm.askPlainSafeWinAsync(' + PAY_ARGS + ') : page.displaySpixiAlert(' + PAY_ARGS + ');';
  const PAY_BASE_STMT = 'var alertTask = page.displaySpixiAlert(' + PAY_ARGS + ');';
  const payExact = exact(PAY_F), payCode = rd(PAY_F);
  const payNonExact = view(payExact, false);
  const DIR1 = ['if WINDOWS', 'else', 'endif'];

  /* ── PAY-OFF ── */
  const po = {
    found: payExact.length > 0,
    onlyWindowsArms: payNonExact !== BAD && directives(payExact).length % 3 === 0 && directives(payExact).every((d, i) => d === DIR1[i % 3]),
    noneHiddenInAComment: sameList(directives(payExact), directives(payCode)),
    plainLineEnds: PLAIN(payExact),
    sameBytesAsBase: payNonExact !== BAD && sha(payNonExact) === PAY_BASE_BYTES,
  };
  ok(F(po).length === 0,
    '★ fixb2 item 4 PAY-OFF: Spixi/Utils/SPayments.cs with its `#if WINDOWS` arm dropped — what iPhone, Mac and Android compile, and the text of the switch-OFF call — is the base file BYTE FOR BYTE (SHA-256 of the exact bytes at 06a4845d: the texts, the amounts, the auth step, the order confirm → auth → send, every other payment path); the only directives are `#if WINDOWS` / `#else` / `#endif` and none sits in a comment — failing: ' + JSON.stringify(F(po))
    + (po.sameBytesAsBase ? '' : ' got ' + (payNonExact === BAD ? BAD : sha(payNonExact))));

  /* ── PAY-ON ── */
  const payWin = view(payCode, true);
  const confWin = payWin === BAD ? '' : span(payWin, CONF_SIG).text;
  const confN = norm(confWin);
  const iEntry = confN.indexOf('SConfirm.askPlainSafeWinAsync(');
  const a1 = iEntry < 0 ? { text: '', end: -1 } : args(confN, iEntry + 'SConfirm.askPlainSafeWinAsync'.length);
  const OLD = ' : page.displaySpixiAlert';
  const a2 = a1.end > 0 && confN.startsWith(OLD + '(', a1.end) ? args(confN, a1.end + OLD.length) : { text: '', end: -1 };
  const pn = {
    found: confWin.length > 0,
    oneStatement: count(confN, PAY_TERN) === 1,
    ownSwitchAndDrop: count(confN, PAY_SEL + ' ? SConfirm.askPlainSafeWinAsync(') === 1 && count(payCode, 'PayConfirmSafeDefault') === 1 && count(payCode, 'useSafeDialog(') === 1,
    oneEntryCall: count(payCode, 'askPlainSafeWinAsync(') === 1,
    sameArgsBothArms: a1.text.length > 0 && a1.text === a2.text,
    theBaseArgs: a2.text === PAY_ARGS,
    oldCallIsTheOffArm: count(confN, 'page.displaySpixiAlert(' + PAY_ARGS + ')') === 1 && count(confN, 'displaySpixiAlert(') === 1,
    stillNative: !/sendUiCommand|executeUiCommand|EvaluateJavaScript/.test(confWin),
  };
  ok(F(pn).length === 0,
    '★ fixb2 item 4 PAY-ON: on Windows the payment confirm in SPayments.confirmAndAuth is ONE statement — `var alertTask = FixB2Rules.useSafeDialog(SpixiFlags.PayConfirmSafeDefault, SpixiFlags.NativeConfirm) ? SConfirm.askPlainSafeWinAsync(<args>) : page.displaySpixiAlert(<args>);` — the ON arm takes the SAME argument text as the OFF arm, and that is the base call\'s (title, body, _SL("wallet-send2-confirm"), _SL("global-dialog-cancel")): the same title, body and button texts, a native dialog on both arms, the switch read once — failing: ' + JSON.stringify(F(pn))
    + ' ' + JSON.stringify({ on: a1.text.slice(0, 160), off: a2.text.slice(0, 160) }));

  /* ── PAY-REST ── */
  const payWinN = payWin === BAD ? BAD : norm(payWin);
  /* the ONE `var alertTask = …;` statement is cut out whatever it says (PAY-ON holds what it says): the rest is compared */
  const CUT_PAY = /var alertTask = [^;]*;/g;
  const confRest = confN.replace(CUT_PAY, '<CONFIRM>');
  const fileRest = payWinN.replace(CUT_PAY, '<CONFIRM>');
  const AUTH = '<CONFIRM> ok = alertTask != null && await alertTask; } catch (Exception ex) { Logging.error("SPayments confirm failed: " + ex.Message); ok = false; } '
    + 'if (!ok) { return false; } if (!paymentAuthEnabled()) { return true; } if (Device.RuntimePlatform == Device.WinUI) { return true; } '
    + 'try { bool available = await CrossFingerprint.Current.IsAvailableAsync(true); if (!available) { return true; } '
    + 'var dialogConfig = new AuthenticationRequestConfiguration("SPIXI", title) { AllowAlternativeAuthentication = true, ConfirmationRequired = true }; '
    + 'var result = await CrossFingerprint.Current.AuthenticateAsync(dialogConfig); return result.Authenticated; } '
    + 'catch (Exception ex) { Logging.error("SPayments auth failed: " + ex.Message); return false; } }';
  const pr = {
    oneBlock: sameList(directives(payCode), DIR1),
    oneStatement: payWinN !== BAD && count(payWinN, 'var alertTask = ') === 1 && count(confRest, '<CONFIRM>') === 1 && count(fileRest, '<CONFIRM>') === 1,
    restOfTheMethod: sha(confRest) === PAY_CONF_REST,
    restOfTheFile: payWinN !== BAD && sha(fileRest) === PAY_FILE_REST,
    confirmThenAuth: confRest.endsWith(AUTH) && /bool ok = false; try \{ <CONFIRM> ok = alertTask != null && await alertTask; \}/.test(confRest),
    winUiRule: /public static bool paymentAuthSupported\(\) \{ return Device\.RuntimePlatform != Device\.WinUI; \}/.test(payWinN),
  };
  ok(F(pr).length === 0,
    '★ fixb2 item 4 PAY-REST: the WHOLE Windows view of SPayments.cs, the ONE confirm statement aside, is the base file (comments stripped, whitespace collapsed; SHA-256 against 06a4845d for the body of confirmAndAuth and for the file) — the title and body texts, `ok = alertTask != null && await alertTask`, the catch, `if (!ok) return false`, the auth step (paymentAuthEnabled → the WinUI rule → CrossFingerprint; an auth error fails closed), paymentAuthSupported, every caller of confirmAndAuth and every other payment path; exactly ONE preprocessor block in the file — failing: ' + JSON.stringify(F(pr))
    + ' ' + JSON.stringify({ method: sha(confRest), file: payWinN === BAD ? BAD : sha(fileRest) }));

  /* ───────────────────────── the three mini-app confirms ───────────────────────── */
  const APP_F = 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs';
  const APP_BASE_BYTES = '4250a1e3bb9d07c37b4ae339f3c9995e0248c3a16529066496d789358dc0adfb';   // MiniAppPage.xaml.cs at 06a4845d, the exact bytes (a BOM)
  const APP_HA_REST = '982be72c1c9cdf81a7483d2426e821f6f82ecc4f0ca676289c57ead348559825';      // base handleAction body, its three conditions as <CONFIRM>
  const APP_FILE_REST = '315ab9128c58c6d7b569b3b9a2dea909e7396223bb9fdc1bad86d3e281a21f60';    // base file (stripped, normalised), its three conditions as <CONFIRM>
  const HA_SIG = 'private async void handleAction(string action)';
  const T_OK_CANCEL = 'SpixiLocalization._SL("global-dialog-ok"), SpixiLocalization._SL("global-dialog-cancel")';
  const A_DATA = 'SpixiLocalization._SL("app-action-title"), string.Format(SpixiLocalization._SL("app-action-response-confirmation"), actionResponse), ' + T_OK_CANCEL;
  const A_PAY = 'SpixiLocalization._SL("app-action-title"), string.Format(SpixiLocalization._SL("app-action-response-payment-user-confirmation"), nick, tx.toList.Values.First().amount.ToString() + " IXI"), ' + T_OK_CANCEL;
  const APP_SEL = 'FixB2Rules.useSafeDialog(SpixiFlags.MiniAppConfirmSafeDefault, SpixiFlags.NativeConfirm)';
  const appTern = (a) => 'if (!await (' + APP_SEL + ' ? SConfirm.askPlainSafeWinAsync(' + a + ') : displaySpixiAlert(' + a + ')))';
    const appExact = exact(APP_F), appCode = rd(APP_F);
  const appNonExact = view(appExact, false);

  /* ── APP-OFF ── */
  const ao = {
    found: appExact.length > 0,
    onlyWindowsArms: appNonExact !== BAD && directives(appExact).length % 3 === 0 && directives(appExact).every((d, i) => d === DIR1[i % 3]),
    noneHiddenInAComment: sameList(directives(appExact), directives(appCode)),
    plainLineEnds: PLAIN(appExact),
    sameBytesAsBase: appNonExact !== BAD && sha(appNonExact) === APP_BASE_BYTES,
  };
  ok(F(ao).length === 0,
    '★ fixb2 item 4 APP-OFF: Spixi/Pages/MiniApps/MiniAppPage.xaml.cs with its `#if WINDOWS` arms dropped — what iPhone, Mac and Android compile, and the text of the three switch-OFF calls — is the base file BYTE FOR BYTE (SHA-256 of the exact bytes at 06a4845d: the three confirm calls with their texts, `sendActionRejected(…, "rejected")` on a no, addTransaction, the HTTP post); the only directives are `#if WINDOWS` / `#else` / `#endif` and none sits in a comment — failing: ' + JSON.stringify(F(ao))
    + (ao.sameBytesAsBase ? '' : ' got ' + (appNonExact === BAD ? BAD : sha(appNonExact))));

  /* ── APP-ON ── */
  const appWin = view(appCode, true);
  const haWin = appWin === BAD ? '' : span(appWin, HA_SIG).text;
  const haN = norm(haWin);
  const sites = [];
  for (let i = haN.indexOf('SConfirm.askPlainSafeWinAsync('); i >= 0; i = haN.indexOf('SConfirm.askPlainSafeWinAsync(', i + 1)) {
    const on = args(haN, i + 'SConfirm.askPlainSafeWinAsync'.length);
    const OLDA = ' : displaySpixiAlert';
    const off = on.end > 0 && haN.startsWith(OLDA + '(', on.end) ? args(haN, on.end + OLDA.length) : { text: '', end: -1 };
    sites.push({ on: on.text, off: off.text, head: haN.slice(Math.max(0, i - ('if (!await (' + APP_SEL + ' ? ').length), i), tail: off.end > 0 ? haN.slice(off.end, off.end + 2) : '' });
  }
  const WANT_ARGS = [A_DATA, A_PAY, A_DATA];
  const an = {
    found: haWin.length > 0,
    threeSites: sites.length === 3 && count(appCode, 'askPlainSafeWinAsync(') === 3,
    ownSwitchAndDrop: sites.length === 3 && sites.every((s) => s.head === 'if (!await (' + APP_SEL + ' ? ' && s.tail === '))') && count(appCode, 'MiniAppConfirmSafeDefault') === 3 && count(appCode, 'useSafeDialog(') === 3,
    sameArgsBothArms: sites.length === 3 && sites.every((s) => s.on.length > 0 && s.on === s.off),
    theBaseArgsInOrder: sites.length === 3 && sites.every((s, i) => s.off === WANT_ARGS[i]),
    exactShape: count(haN, appTern(A_DATA)) === 2 && count(haN, appTern(A_PAY)) === 1,
    branchOrder: /NAME_ALLOW_SUBNAMES\) \{ if \(!await \(FixB2Rules/.test(haN) && haN.indexOf(appTern(A_PAY)) > haN.indexOf(appTern(A_DATA)) && haN.lastIndexOf(appTern(A_DATA)) > haN.indexOf(appTern(A_PAY))
      && new RegExp('\\} else \\{ ' + esc(appTern(A_DATA)) + ' \\{ return; \\} \\} HttpResponseMessage\\? response = null;').test(haN),
  };
  ok(F(an).length === 0,
    '★ fixb2 item 4 APP-ON: on Windows each of the three mini-app confirms in MiniAppPage.handleAction (name actions · the payment · any other action, in that order) is `if (!await (FixB2Rules.useSafeDialog(SpixiFlags.MiniAppConfirmSafeDefault, SpixiFlags.NativeConfirm) ? SConfirm.askPlainSafeWinAsync(<args>) : displaySpixiAlert(<args>)))` — the ON arm takes the SAME argument text as the OFF arm, and that is the base call\'s (the title, the same string.Format text, OK, Cancel); the switch is read at these three sites only — failing: ' + JSON.stringify(F(an))
    + ' ' + JSON.stringify(sites.map((s) => ({ same: s.on === s.off, on: s.on.slice(40, 150) }))));

  /* ── APP-AFTER ── */
  /* every `if (!await <condition>)` is cut out whatever it says (APP-ON holds what the three say): the rest is compared */
  const cutIfs = (t) => {
    let out = '', from = 0, n = 0;
    for (let i = t.indexOf('if (!await '); i >= 0; i = t.indexOf('if (!await ', from)) {
      const c = args(t, i + 3);
      if (c.end < 0) return { text: BAD, n: -1 };
      out += t.slice(from, i) + '<CONFIRM>'; from = c.end; n++;
    }
    return { text: out + t.slice(from), n };
  };
  const appWinN = appWin === BAD ? BAD : norm(appWin);
  const haCut = cutIfs(haN), fileCut = appWinN === BAD ? { text: BAD, n: -1 } : cutIfs(appWinN);
  const haBack = haCut.text, fileBack = fileCut.text;
  const aa = {
    threeBlocks: sameList(directives(appCode), [...DIR1, ...DIR1, ...DIR1]),
    threeConditions: haCut.n === 3 && fileCut.n === 3,
    restOfTheMethod: haBack.length > 0 && haBack !== BAD && sha(haBack) === APP_HA_REST,
    restOfTheFile: fileBack !== BAD && sha(fileBack) === APP_FILE_REST,
    nameNoReturns: count(haBack, '<CONFIRM> { return; }') === 2,
    payNoRejects: count(haBack, '<CONFIRM> { sendActionRejected(jsonResult.c, jsonResult.id, "rejected"); return; }') === 1,
    payYesAsBefore: haBack.includes('<CONFIRM> { sendActionRejected(jsonResult.c, jsonResult.id, "rejected"); return; } if (string.IsNullOrEmpty(jsonResult.responseUrl)) { if (IxianHandler.addTransaction(tx, tx.toList.Keys.Skip(1).ToList(), null, null, true)) { Utils.sendUiCommand(this, "SpixiAppSdk.ar", actionResponse); return; }'),
  };
  ok(F(aa).length === 0,
    '★ fixb2 item 4 APP-AFTER: the WHOLE Windows view of MiniAppPage.xaml.cs, its three `if (!await …)` conditions aside, is the base file (comments stripped, whitespace collapsed; SHA-256 against 06a4845d for the body of handleAction and for the file) — after a no: `return;` (name actions, any other action) and `sendActionRejected(jsonResult.c, jsonResult.id, "rejected"); return;` (the payment); after a yes: the base\'s addTransaction branch, HTTP post and alerts; exactly THREE preprocessor blocks — failing: ' + JSON.stringify(F(aa))
    + ' ' + JSON.stringify({ method: sha(haBack), file: fileBack === BAD ? BAD : sha(fileBack) }));

  /* ───────────────────────── the entry ───────────────────────── */
  const SC_F = 'Spixi/Utils/SConfirm.cs';
  const SC = rd(SC_F);
  const ENTRY_SIG = 'internal static async Task<bool> askPlainSafeWinAsync(string title, string text, string ok, string cancel)';
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\n]*#[^\S\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { const c = st.pop(); st.push('!' + c); }
    }
    return st;
  };
  const ent = span(SC, ENTRY_SIG);
  const entN = norm(ent.text);
  const EXPECTED_ENTRY = [
    '{ long token = gate.tryEnter();',
    'if (token == 0) { Logging.info("[CONFIRM] plain busy"); return false; }',
    'try { Task<bool>? dialog = showSafeDefaultConfirm(title, text, ok, cancel); return dialog != null && await dialog; }',
    'catch (Exception ex) { Logging.warn("[CONFIRM] the dialog failed (" + ex.GetType().Name + ")"); return false; }',
    'finally { gate.exit(token); } }'].join(' ');
  const entDiff = (() => { let i = 0; while (i < entN.length && i < EXPECTED_ENTRY.length && entN[i] === EXPECTED_ENTRY[i]) i++; return i; })();
  const en = {
    found: ent.text.length > 0 && count(SC, ENTRY_SIG) === 1 && count(SC, 'askPlainSafeWinAsync') === 1,
    windowsOnly: ent.at > 0 && regionsAt(SC, ent.at).join('|') === 'WINDOWS' && regionsAt(SC, ent.end).join('|') === 'WINDOWS',
    bodyExact: entN === EXPECTED_ENTRY,
    gateFirstRefusedIsNo: /^\{ long token = gate\.tryEnter\(\); if \(token == 0\) \{ [^{}]*return false; \}/.test(entN),
    sameDialogCode: count(entN, 'showSafeDefaultConfirm(title, text, ok, cancel)') === 1 && !/ContentDialog|DisplayAlert|displaySpixiAlert/.test(entN),
    nullTaskIsNo: /return dialog != null && await dialog;/.test(entN),
    everyThrowIsNo: /catch \(Exception ex\) \{ [^{}]*return false; \}/.test(entN) && !/catch \(Exception ex\) when|\bthrow\b/.test(entN),
    releasedInFinally: /finally \{ gate\.exit\(token\); \} \}$/.test(entN) && count(entN, 'gate.') === 2,
    noYesLiteral: !/\btrue\b|TrySetResult|SetResult/.test(entN),
    noTimer: !/Task\.Delay|Timer|TickCount|CancellationToken|Thread\.Sleep/.test(entN),
    noLockNo600ms: !/lockUp|tooFast|MinConfirmMs/.test(entN),
    fixedLogLines: count(entN, 'Logging.') === 2 && !/Logging\.\w+\([^;]*\b(title|text|ok|cancel)\b[^;]*\);/.test(entN.replace(/"[^"]*"/g, '""')),
  };
  ok(F(en).length === 0,
    '★ fixb2 item 4 ENTRY: SConfirm.askPlainSafeWinAsync(title, text, ok, cancel) exists once, ONLY inside `#if WINDOWS`, and its WHOLE body is the expected text — the gate first (`gate.tryEnter()`; refused = a confirm or another alert is up → one fixed line, false), then the SAME dialog code as the destructive confirm (`showSafeDefaultConfirm(title, text, ok, cancel)`: only ContentDialogResult.Primary is yes), `return dialog != null && await dialog;` (a null task → false), every throw → one fixed line with the exception TYPE, false; the gate released in finally; no `true` literal, no timer (L157), no app-lock check and no 600 ms rule (the old path of these call sites has neither), no dialog text in a log line — failing: ' + JSON.stringify(F(en))
    + (en.bodyExact ? '' : ' ' + JSON.stringify({ entDiff, got: entN.slice(Math.max(0, entDiff - 50), entDiff + 90), want: EXPECTED_ENTRY.slice(Math.max(0, entDiff - 50), entDiff + 90) })));

  /* ───────────────────────── the switches and the [FLAGS] line ───────────────────────── */
  const SF = rd('Spixi/Utils/SpixiFlags.cs');
  const init = span(SF, 'public static void init()').text;
  const at = (s) => init.indexOf(s);
  const iTry = init.search(/\btry\s*\{/), iCatch = at('catch (Exception ex)');
  const iCatchEnd = iCatch < 0 ? -1 : iCatch + span(init, 'catch (Exception ex)', iCatch).text.length;
  const inTry = (s) => count(init, s) === 1 && at(s) > iTry && at(s) < iCatch;
  const afterCatch = (s) => count(init, s) === 1 && at(s) > iCatchEnd && iCatchEnd > 0;
  const FIX1_LINE = 'Logging.info(FixB1Rules.flagsLine(ConfirmSafeDefault, DividerHoverLine));';
  const FIX2_LINE = 'Logging.info(FixB2Rules.flagsLine(PayConfirmSafeDefault, MiniAppConfirmSafeDefault));';
  const FR = rd('Spixi/Utils/FixB2Rules.cs');
  const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const fg = {
    found: init.length > 0 && iTry > 0 && iCatch > iTry,
    keys: /public const string PayConfirmSafeDefaultKey = "flagPayConfirmSafeDefault";/.test(SF) && /public const string MiniAppConfirmSafeDefaultKey = "flagMiniAppConfirmSafeDefault";/.test(SF)
      && count(SF, '"flagPayConfirmSafeDefault"') === 1 && count(SF, '"flagMiniAppConfirmSafeDefault"') === 1,
    propsOn: /public static bool PayConfirmSafeDefault \{ get; private set; \} = true;/.test(SF) && /public static bool MiniAppConfirmSafeDefault \{ get; private set; \} = true;/.test(SF),
    localsOn: /int fp = 1, fm = 1;/.test(init) && at('int fp = 1, fm = 1;') > 0 && at('int fp = 1, fm = 1;') < iTry,
    absentOn: inTry('fp = Preferences.Default.Get(PayConfirmSafeDefaultKey, 1);') && inTry('fm = Preferences.Default.Get(MiniAppConfirmSafeDefaultKey, 1);')
      && count(SF, 'Get(PayConfirmSafeDefaultKey') === 1 && count(SF, 'Get(MiniAppConfirmSafeDefaultKey') === 1,
    computeRule: afterCatch('PayConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fp);') && afterCatch('MiniAppConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fm);')
      && count(SF, 'PayConfirmSafeDefault = ') === 1 && count(SF, 'MiniAppConfirmSafeDefault = ') === 1,
    oneLineLast: count(SF, 'FixB2Rules.flagsLine(') === 1
      /* ★ merge with photo1a (2026-11-18, re-based after a look at the merged init): after the fixb2 line ONLY the exact
         photo1a group may follow (4 computes + its ONE [FLAGS] line; pins-photo1a/a-open a3 / a9 hold it in full) */
      && new RegExp(esc(FIX1_LINE) + '\\s*PayConfirmSafeDefault = S16PassRules\\.effectiveFlag\\(dev, fp\\);\\s*MiniAppConfirmSafeDefault = S16PassRules\\.effectiveFlag\\(dev, fm\\);\\s*' + esc(FIX2_LINE)
        + '(?:\\s*' + ['PhotoMediaAfterPaint = S16PassRules.effectiveFlag(dev, qa);', 'PhotoFewerFileChecks = S16PassRules.effectiveFlag(dev, qf);',
          'PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt) && ChatMediaStore.platformOn;', 'VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;',
          'Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore));'].map(esc).join('\\s*')
        /* ★ defaultsb re-base (2026-11-18, after a look at `git diff -- Spixi/Utils/SpixiFlags.cs`: a pure insertion, 24 lines added, 0 deleted, no #if — 3 key consts, 3 `{ get; private set; } = false` props, `int da = 1, dp = 1, dl = 1;`, 3 `Preferences.Default.Get(…, 1)` reads inside the try, 3 `effectiveFlag` computes and ONE `Logging.info(DefaultsRules.flagsLine(…))` after the photo1a line): after the photo1a group ONLY the exact defaultsb group may follow (pins-defaultsb/a-defaults d11 holds it in full) */
        + '(?:\\s*' + ['DefaultAppLockOn = S16PassRules.effectiveFlag(dev, da);', 'DefaultPayConfirmOn = S16PassRules.effectiveFlag(dev, dp);', 'LockDelayOneMinute = S16PassRules.effectiveFlag(dev, dl);', 'Logging.info(DefaultsRules.flagsLine(DefaultAppLockOn, DefaultPayConfirmOn, LockDelayOneMinute));'].map(esc).join('\\s*') + ')?' + ')?'
        + '\\s*\\}$').test(init),
    olderLinesKept: count(SF, FIX1_LINE) === 1 && count(SF, 'Logging.info(PerfB1Rules.flagsLine(WarmOnIdle, SpareRearm, SpareKeepShortSleep, PhoneNoEmptyDetail));') === 1,
    lineWords: /public static string flagsLine\(bool payConfirmDefault, bool appConfirmDefault\)\s*\{\s*return "\[FLAGS\] payconfirmdefault=" \+ \(payConfirmDefault \? "1" : "0"\) \+ " appconfirmdefault=" \+ \(appConfirmDefault \? "1" : "0"\);\s*\}/.test(FR),
    noDevControl: DP.length > 0 && !/PayConfirmSafeDefault|MiniAppConfirmSafeDefault|payconfirmdefault|appconfirmdefault/.test(DP),
    noStoreAnywhere: count(SF, 'PayConfirmSafeDefaultKey') === 2 && count(SF, 'MiniAppConfirmSafeDefaultKey') === 2,
  };
  ok(F(fg).length === 0,
    '★ fixb2 item 4 FLAGS: SpixiFlags — flagPayConfirmSafeDefault + flagMiniAppConfirmSafeDefault (int prefs) read in init\'s try with absent = 1, PayConfirmSafeDefault / MiniAppConfirmSafeDefault `= true` and through S16PassRules.effectiveFlag after the catch (absent = ON; a stored 0 acts only in dev mode); ONE Logging.info(FixB2Rules.flagsLine(…)) right after the fixb1 line, the LAST statement of init ("[FLAGS] payconfirmdefault=<0|1> appconfirmdefault=<0|1>"); the perfb1 and fixb1 lines stay; the keys are only declared and read (nothing stores them); no Developer-screen control — failing: ' + JSON.stringify(F(fg)));

  /* ───────────────────────── the names live only on Windows ───────────────────────── */
  const NAMES = ['PayConfirmSafeDefault', 'MiniAppConfirmSafeDefault', 'askPlainSafeWinAsync', 'useSafeDialog'];
  /* the lines of a file that a NON-Windows build compiles (loose: any directive form; only an `#if WINDOWS` arm is dropped) */
  const nonWindowsLoose = (src) => {
    const out = [], st = [];
    for (const line of src.split('\n')) {
      const m = /^\s*#\s*(\w+)\b(.*)$/.exec(line);
      if (m && m[1] === 'if') { st.push({ w: m[2].trim() === 'WINDOWS', arm: true }); continue; }
      if (m && (m[1] === 'else' || m[1] === 'elif')) { const t = st[st.length - 1]; if (t) t.arm = false; continue; }
      if (m && m[1] === 'endif') { st.pop(); continue; }
      if (st.every((e) => !(e.w && e.arm))) out.push(line);
    }
    return out.join('\n');
  };
  /* ★ #46 r2 (reader S2, MAJOR): `bin` / `obj` are skipped ONLY directly under Spixi/ (the SDK's default excludes are the project-root ones; a
   * nested `Spixi/Utils/bin/X.cs` is compiled), and the extension is matched without case (`X.CS` compiles on Windows). */
  const walk = (d, top = true) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    top && (e.name === 'obj' || e.name === 'bin') ? [] : e.isDirectory() ? walk(d + '/' + e.name, false) : (/\.cs$/i.test(e.name) ? [d + '/' + e.name] : []));
  /* ★ #46 r1 (reader S, MAJOR): the old key counted the call text `askPlainSafeWinAsync(` and `SpixiFlags.<switch>` and looked for the names only
   * OUTSIDE `#if WINDOWS`, so a FIFTH caller inside `#if WINDOWS` in another file, spelled as a method group (`Func<…> f = SConfirm.askPlainSafeWinAsync;
   * f(a, b, c, d)`) or with a space (`SConfirm.askPlainSafeWinAsync (a, b, c, d)`), stayed green. Now: on the comment-stripped text of EVERY C# file
   * under Spixi/ — ALL preprocessor regions, the Windows arms included — the BARE names are counted (whole words: a call, a method group, a nameof,
   * a string) and compared with this EXACT table (name → file → count). Any other file, any other count = red. A name written with a `\u` identifier
   * escape would not be a whole-word match: such an escape outside a string or char literal is red anywhere in Spixi/ (there is none today).
   * ★ #46 r2 (m-1): the same for a Unicode FORMAT character (Cf) inside an identifier — the compiler drops it, so `askPlain<U+200B>SafeWinAsync` binds
   * to the entry and is no whole-word match: any Cf character (U+00AD, U+061C, U+180E, U+200B–U+200F, U+202A–U+202E, U+2060–U+2064, U+2066–U+206F,
   * U+FEFF but the BOM at offset 0) outside a string or char literal is red anywhere in Spixi/ (today the tree holds none at all, comments and
   * literals included). What this key does NOT hold is named in the header (the `://` comment trick, a literal-built reflection name, Ixian-Core). */
  const WANT = {
    askPlainSafeWinAsync: { 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs': 3, 'Spixi/Utils/SConfirm.cs': 1, 'Spixi/Utils/SPayments.cs': 1 },   // three + one callers; the declaration
    useSafeDialog: { 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs': 3, 'Spixi/Utils/FixB2Rules.cs': 1, 'Spixi/Utils/SPayments.cs': 1 },         // the four sites; the declaration
    PayConfirmSafeDefault: { 'Spixi/Utils/SPayments.cs': 1, 'Spixi/Utils/SpixiFlags.cs': 3 },                    // the one read; the property, its compute, the [FLAGS] argument
    MiniAppConfirmSafeDefault: { 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs': 3, 'Spixi/Utils/SpixiFlags.cs': 3 },   // the three reads; the property, its compute, the [FLAGS] argument
    PayConfirmSafeDefaultKey: { 'Spixi/Utils/SpixiFlags.cs': 2 },        // the constant and its ONE read (nothing stores it)
    MiniAppConfirmSafeDefaultKey: { 'Spixi/Utils/SpixiFlags.cs': 2 },
    flagPayConfirmSafeDefault: { 'Spixi/Utils/SpixiFlags.cs': 1 },       // the preference name, once (no second spelling of the key)
    flagMiniAppConfirmSafeDefault: { 'Spixi/Utils/SpixiFlags.cs': 1 },
  };
  const LITERALS = /@"(?:[^"]|"")*"|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])+'/g;
  const FORMAT_CHARS = /[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/;   // Unicode Cf
  const outside = [], got = {}, escaped = [], formatChars = [];
  for (const f of walk('Spixi')) {
    const t = rd(f);
    if (f !== 'Spixi/Utils/SpixiFlags.cs' && f !== 'Spixi/Utils/FixB2Rules.cs') {
      const nw = nonWindowsLoose(t);
      for (const n of NAMES) if (nw.includes(n)) outside.push(f + ':' + n);
    }
    for (const n of Object.keys(WANT)) { const c = (t.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length; if (c) (got[n] = got[n] || {})[f] = c; }
    if (/\\[uU][0-9a-fA-F]{4}/.test(t.replace(LITERALS, '""'))) escaped.push(f);
    if (FORMAT_CHARS.test(t.replace(LITERALS, '""'))) formatChars.push(f);   // rd() took the BOM at offset 0 away
  }
  const flat = (o) => Object.keys(o).sort().flatMap((n) => Object.keys(o[n]).sort().map((f) => n + ' @ ' + f + ' = ' + o[n][f]));
  const wantFlat = flat(WANT), gotFlat = flat(got);
  const tableDiff = [...gotFlat.filter((x) => !wantFlat.includes(x)).map((x) => 'got ' + x), ...wantFlat.filter((x) => !gotFlat.includes(x)).map((x) => 'want ' + x)];
  const only = (n) => !tableDiff.some((d) => d.replace(/^(?:got|want) /, '').startsWith(n + ' @ '));
  const wo = {
    namesOnlyOnWindows: outside.length === 0,
    exactTable: gotFlat.length === wantFlat.length && tableDiff.length === 0,
    fourCallers: only('askPlainSafeWinAsync'),
    selectorAtTheSitesOnly: only('useSafeDialog'),
    payReadOnce: only('PayConfirmSafeDefault'),
    appReadThrice: only('MiniAppConfirmSafeDefault'),
    keysDeclaredAndReadOnly: only('PayConfirmSafeDefaultKey') && only('MiniAppConfirmSafeDefaultKey') && only('flagPayConfirmSafeDefault') && only('flagMiniAppConfirmSafeDefault'),
    noIdentifierEscape: escaped.length === 0,
    noFormatCharacter: formatChars.length === 0,
  };
  ok(F(wo).length === 0,
    '★ fixb2 item 4 WINDOWS-ONLY (#46 r1: an EXACT table over every region; r2: nested bin / obj and .CS files are walked): PayConfirmSafeDefault, MiniAppConfirmSafeDefault, askPlainSafeWinAsync and useSafeDialog appear outside `#if WINDOWS` in no file of Spixi/ but SpixiFlags.cs (the switches) and FixB2Rules.cs (the pure rule); and in EVERY C# file of Spixi/, every preprocessor region included, the BARE names (whole words in the comment-stripped text: a call, a call with a space, a method group, a nameof, a string that holds the whole name) stand exactly where this table says — askPlainSafeWinAsync: MiniAppPage.xaml.cs 3, SPayments.cs 1, SConfirm.cs 1 (the declaration); useSafeDialog: the same four sites + FixB2Rules.cs 1; PayConfirmSafeDefault: SPayments.cs 1 + SpixiFlags.cs 3; MiniAppConfirmSafeDefault: MiniAppPage.xaml.cs 3 + SpixiFlags.cs 3; the two key constants (2 each) and the two preference names (1 each) only in SpixiFlags.cs — a FIFTH caller of the entry or another reader of a switch in one of those spellings, in any region, in any compiled folder (only Spixi/bin and Spixi/obj are skipped; `.cs` in any case), is red; no `\\u` identifier escape and no Unicode FORMAT character (Cf) outside a literal in Spixi/. NOT held (the #1627 class): the `://` comment trick of stripCode, a reflection name built from string pieces, Ixian-Core files — failing: ' + JSON.stringify(F(wo))
    + ' ' + JSON.stringify({ outside, tableDiff, escaped, formatChars }));

  /* ───────────────────────── the pure rule and the harness ───────────────────────── */
  const FRraw = exact('Spixi/Utils/FixB2Rules.cs');
  const i4a = FRraw.indexOf('// ── item 4 ──'), i4b = FRraw.indexOf('// ── end item 4 ──');
  const item4 = i4a >= 0 && i4b > i4a ? norm(stripCode(FRraw.slice(i4a, i4b))) : '';
  const EXPECTED_ITEM4 = [
    'public static string flagsLine(bool payConfirmDefault, bool appConfirmDefault) { return "[FLAGS] payconfirmdefault=" + (payConfirmDefault ? "1" : "0") + " appconfirmdefault=" + (appConfirmDefault ? "1" : "0"); }',
    'public static bool useSafeDialog(bool ownSwitch, bool alertDropOn) { return ownSwitch && alertDropOn; }'].join(' ');
  const T = existsSync(join(root, 'scripts/csh/FixB2PayTests.cs')) ? stripCode(exact('scripts/csh/FixB2PayTests.cs')) : '';
  const TESTS = ['pay_flags_line_text', 'use_safe_dialog_needs_both_switches', 'only_the_confirm_button_is_yes', 'pay_flags_defaults_and_dev_mode',
    'pay_flags_leave_the_older_lines_alone', 'plain_confirm_holds_the_gate_like_a_confirm'];
  const CSH = exact('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const ru = {
    found: count(FRraw, '// ── item 4 ──') === 1 && count(FRraw, '// ── end item 4 ──') === 1 && FRraw.indexOf('// ── end item 3 ──') < i4a,
    item4Exact: item4 === EXPECTED_ITEM4,
    bothSwitches: /public static bool useSafeDialog\(bool ownSwitch, bool alertDropOn\) \{ return ownSwitch && alertDropOn; \}/.test(norm(FR)),
    oneOfEach: count(FR, 'flagsLine(') === 1 && count(FR, 'useSafeDialog(') === 1,
    compiled: count(CSH, '<Compile Include="../../Spixi/Utils/FixB2Rules.cs" />') === 1,
    testClass: /\[TestClass\]\s*public class FixB2PayTests/.test(T),
    tests: TESTS.every((n) => new RegExp('\\[TestMethod\\]\\s*public void ' + n + '\\(\\)').test(T)),
  };
  ok(F(ru).length === 0,
    '★ fixb2 item 4 RULES: the item-4 span of Spixi/Utils/FixB2Rules.cs (after item 3\'s) is exactly the expected text — flagsLine (fixed words and 0|1) and useSafeDialog = `ownSwitch && alertDropOn` (the safe dialog only with the call site\'s own switch AND the alert drop on; anything else = the old path); csh.csproj compiles the file and FixB2PayTests runs its six tests (' + TESTS.join(', ') + ') — failing: ' + JSON.stringify(F(ru))
    + (ru.item4Exact ? '' : ' ' + JSON.stringify({ got: item4.slice(0, 400) })));
}
