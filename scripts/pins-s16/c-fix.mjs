/* ==== S16 agent a-fix — #1311 (a) [THEME] lines · (b) RESTORE-B honest copy · (c) re-arm once per transfer id · #1294 (c) the
 * hold-tap shield (Android).
 *
 * The pure rules are EXECUTED in the C# harness (scripts/csh/S16FixTests.cs over Spixi/Utils/S16FixRules.cs: the fixed theme
 * words, the night bits, gen-stale, rearmLeg's order, the RearmLedger claim incl. concurrency). This module pins what the harness
 * cannot reach:
 *   THEME — the four [THEME] lines exist where #1311 (a) needs them (event BEFORE the "System" gate · push at the END of the
 *           sweep · resume in MainActivity.OnResume · gen-stale in generatePage, only when genStale) and every operand of each
 *           line is a fixed-word literal or an allow-listed enum / integer / S16FixRules word — no value-bearing variable;
 *   SHEET — EXECUTED on the BUILT lock shell (Spixi/Resources/Raw/html/lock.html + its co-located bundle, jsdom): the hatch's
 *           sheet names Account › Delete data… › Delete account, has ONE action, and that action closes the sheet with NO
 *           bridge navigation (ixian:change) and the lock still up; every built locale names its OWN labels for that path;
 *   LANG  — the 13 legacy lang files: no "Delete wallet" in en-us.txt, every intro-restore-walletexists-text names that
 *           locale's Delete data… + Delete account labels; LaunchPage's two C# fallbacks equal the en-us.txt value;
 *   REARM — the callback asks rearmLeg FIRST in the localSender branch (before any File.Exists / FileStream); TransferManager's
 *           claim is the ledger, hasOutgoing is exact under the list lock, the claims clear at the stop cleanup; no id in a log;
 *   SHIELD — added in holdStageUntilDrawn before the stage shows, UNDER the stage (Insert at its index), Clickable on its
 *           platform view, excluded from accessibility, never hostGrid.InputTransparent; dropped at EVERY held-stage input-live
 *           write, on close (closeOverlay) and on swap-out; a backstop timer.
 * Deliberate breaks (S16 a-fix, each fails its key): see the session report. */
export default async function (h) {
  const { ok, root, stripCode, stripCssComments, readFileSync, existsSync, join, JSDOM, VirtualConsole, sleep } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const body = (t, sig, from = 0) => {
    const i = t.indexOf(sig, from); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  /* the argument text of the call that starts at `at` (string-aware paren match) */
  const callArgs = (t, at) => {
    const o = t.indexOf('(', at); if (at < 0 || o < 0) return null;
    let d = 0, q = null;
    for (let k = o; k < t.length; k++) {
      const c = t[k];
      if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '(') d++; else if (c === ')' && --d === 0) return t.slice(o + 1, k);
    }
    return null;
  };
  /* top-level `+` operands (outside strings and parens) */
  const operands = (args) => {
    const out = []; let d = 0, q = null, cur = '';
    for (let k = 0; k < args.length; k++) {
      const c = args[k];
      if (q) { cur += c; if (c === '\\') { cur += args[++k]; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') d++; else if (c === ')') d--;
      if (c === '+' && d === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  /* ONE allow-list for every [THEME] operand: a fixed-word literal, an AppTheme enum, the pick as an int, an S16FixRules word /
     bit / cfg pair, or a local proven (below) to hold one of those. Anything else is a value-bearing variable. */
  const ALLOWED = [
    /^"[\[\]A-Za-z =-]*"$/,
    /^(a|Current|Microsoft\.Maui\.Controls\.Application\.Current\?)\.RequestedTheme$/,
    /^\(int\)ThemeManager\.getActiveAppearance\(\)$/,
    /^(SPIXI\.)?S16FixRules\.themeWord\((SpixiLocalization\.getLocalizedString\("SpixiThemeName"\)|themeName)\)$/,
    /^(SPIXI\.)?S16FixRules\.bit\(isInForeground\)$/,
    /^(SPIXI\.)?S16FixRules\.androidCfgWords\(this\)$/,
    /^(cfg|pushed|baked|live)$/,
  ];
  const themeLine = (t, head) => {
    const at = t.indexOf('Logging.info("[THEME] ' + head);
    const args = at < 0 ? null : callArgs(t, at);
    const ops = args ? operands(args) : [];
    const bad = ops.filter((o) => !ALLOWED.some((re) => re.test(o)));
    const lit = ops.filter((o) => o.startsWith('"')).map((o) => o.slice(1, -1)).join('§');
    return { at, ops, bad, lit, n: t.split('Logging.info("[THEME] ' + head).length - 1 };
  };

  /* ── THEME ── */
  {
    const APP = rd('Spixi/App.xaml.cs');
    const lamAt = APP.indexOf('Current.RequestedThemeChanged += (s, a) =>');
    const lam = body(APP, 'Current.RequestedThemeChanged += (s, a) =>');
    const ev = themeLine(lam, 'event ');
    const gateAt = lam.indexOf('if (ThemeManager.getActiveAppearance() != ThemeAppearance.automatic)');
    const UH = rd('Spixi/Utils/UIHelpers.cs');
    const sweep = body(UH, 'public static void pushThemeToAllPages()');
    const push = themeLine(sweep, 'push ');
    const MA = rd('Spixi/Platforms/Android/MainActivity.cs');
    const resumeB = body(MA, 'protected override void OnResume()');
    const res = themeLine(resumeB, 'resume ');
    const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
    const gen = body(SCP, 'public WebViewSource generatePage(string html_file_name)');
    const gs = themeLine(gen, 'gen-stale ');
    const RULES = rd('Spixi/Utils/S16FixRules.cs');
    const t = {
      found: lamAt > 0 && ev.at >= 0 && push.at >= 0 && res.at >= 0 && gs.at >= 0,
      once: [ev, push, res, gs].every((x) => x.n === 1),
      noValues: [ev, push, res, gs].every((x) => x.bad.length === 0 && x.ops.length >= 3),
      eventKeys: ev.lit === '[THEME] event arg=§ req=§ pick=§ baked=§ fg=§ ',
      eventBeforeGate: gateAt > 0 && ev.at < gateAt,
      eventCfg: /string cfg;\s*#if ANDROID\s*cfg = SPIXI\.S16FixRules\.androidCfgWords\(Microsoft\.Maui\.ApplicationModel\.Platform\.CurrentActivity\);\s*#else\s*cfg = SPIXI\.S16FixRules\.cfgWords\(null, null\);\s*#endif/.test(lam),
      pushKeys: push.lit === '[THEME] push name=§ pages=' && /int pushed = 0;/.test(sweep)
        && /Utils\.sendUiCommand\(page, "setTheme", themeName\);\s*pushed\+\+;/.test(sweep)
        && sweep.indexOf('Logging.info("[THEME] push ') > sweep.lastIndexOf('SpixiContentPage.disposeParkedOverlay();'),
      resumeKeys: res.lit === '[THEME] resume req=§ baked=§ ' && /base\.OnResume\(\);\s*applyRecentsPrivacy\(\);\s*try\s*\{\s*Logging\.info\("\[THEME\] resume /.test(resumeB),
      genGuard: gs.lit === '[THEME] gen-stale baked=§ live=' && gen.indexOf('Logging.info("[THEME] gen-stale') < gen.indexOf('int version = SpixiLocalization.getDictionaryVersion();')
        && /string baked = S16FixRules\.themeWord\(SpixiLocalization\.getLocalizedString\("SpixiThemeName"\)\);\s*string live = S16FixRules\.themeWord\(ThemeManager\.getResolvedAppearanceName\(\)\);\s*if \(S16FixRules\.genStale\(baked, live\)\)\s*\{\s*Logging\.info\("\[THEME\] gen-stale /.test(gen),
      androidRead: /#if ANDROID\s*public static string androidCfgWords\(Android\.App\.Activity\? activity\)[\s\S]*?return cfgWords\(act, app\);\s*\}\s*#endif/.test(RULES),
    };
    ok(Object.values(t).every(Boolean),
      '★ S16 THEME (#1311 (a)): the four [THEME] mechanism lines — `event` at the RequestedThemeChanged entry BEFORE the "System" gate (arg / req / pick / baked / fg / cfgAct / cfgApp), `push` at the END of pushThemeToAllPages (name / pages), `resume` in MainActivity.OnResume, `gen-stale` in generatePage only when the baked carrier ≠ the live theme — and every operand is a fixed-word literal, an AppTheme enum, an int or an S16FixRules word (executed in S16FixTests): no value-bearing variable — ' + JSON.stringify(t) + ' bad=' + JSON.stringify([ev, push, res, gs].flatMap((x) => x.bad)));
  }

  /* ── SHEET (executed on the BUILT lock shell) ── */
  {
    const f = join(root, 'Spixi/Resources/Raw/html/lock.html');
    const r = { built: existsSync(f) };
    if (r.built) {
      const html = readFileSync(f, 'utf8').replace(/\*SL\{language-code\}/g, 'en-us').replace(/\*SL\{LockAuthPending\}/g, '0')
        .replace(/\*SL\{SpixiThemeName\}/g, 'dark').replace(/\*SL\{[A-Za-z]+\}/g, '0');
      const vc = new VirtualConsole();
      let navs = 0;
      vc.on('jsdomError', (e) => { if (/navigation/.test(String(e && e.message))) navs++; });
      const dom = new JSDOM(html, { url: 'file://' + f, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
      await Promise.race([new Promise((res) => dom.window.addEventListener('load', res)), sleep(20000)]);
      await sleep(300);
      const d = dom.window.document;
      const hatch = d.querySelector('.c-lock__hatch');
      r.mounted = !!d.querySelector('.c-lock') && !!hatch && !hatch.hidden && navs >= 1;   // ixian:onload went out = the counter sees the bridge
      if (r.mounted) {
        hatch.click();
        const m = d.querySelector('.c-modal');
        const text = m ? m.textContent : '';
        const title = m && m.querySelector('.c-modal__title');
        const body = m && m.querySelector('.c-modal__body');
        const bt = body ? body.textContent : '';
        const paras = bt.split('\n\n');
        /* ★ #1311 (b) option 2 (Damir's pick): a statement title; TWO paragraphs in the one body node, shown as two
           (pre-line on this sheet) — the way when you can unlock, then the per-platform way when you cannot */
        r.title = !!title && title.textContent === 'One account per device';
        r.twoParas = paras.length === 2 && !!body && dom.window.getComputedStyle(body).whiteSpace === 'pre-line';
        r.saysTheWay = /Account › Delete data… › Delete account\.$/.test(paras[0] || '') && !/go to setup/i.test(bt);
        /* ★ #46 r1 (R3 M1): every platform clause is TRUE — Android: clear the storage (Auto Backup brings an uninstalled
           wallet back); iPhone: delete the app; Windows / Mac: the Documents Spixi folder (Config.spixiUserFolder) survives an
           uninstall. No reinstall advice. */
        r.truePerPlatform = /^Forgot the password\? Remove Spixi’s data from this device: /.test(paras[1] || '')
          && /Android: clear Spixi’s storage in Settings; /.test(paras[1] || '') && /iPhone: delete the app; /.test(paras[1] || '')
          && /Windows or Mac: delete the Spixi folder in Documents\./.test(paras[1] || '') && !/reinstall/i.test(bt);
        const btns = m ? [...m.querySelectorAll('.c-modal__actions .c-button')] : [];
        r.oneAction = btns.length === 1;
        const before = navs;
        if (btns.length) btns[btns.length - 1].click();
        await sleep(600);
        r.closes = !!m && !dom.window.Spixi.isOverlayOpen(m);
        r.noBridge = navs === before;
        r.lockStays = !!d.querySelector('.c-lock') && d.querySelector('.c-lock').isConnected;
      }
      dom.window.close();
    }
    /* every built locale names its OWN labels for the path (the words the user sees on Account) */
    const en = JSON.parse(raw('src/strings/en-us.json'));
    r.enKey = typeof en.otherWalletWayBody === 'string' && en.otherWalletWayTitle === 'One account per device' && !('otherWalletCta' in en) && !('otherWalletTitle' in en);
    const codes = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
    const miss = [];
    for (const c of ['en-us', ...codes]) {
      const j = c === 'en-us' ? en : JSON.parse(raw('src/strings/' + c + '.json'));
      const b = j.otherWalletWayBody || '';
      if (b === en.otherWalletWayBody && c !== 'en-us') miss.push(c + ':english');
      else if (!b.includes(j.account) || !b.includes(j.deleteData) || !b.includes(j.deleteAccount)) miss.push(c);
      else if (!['Android', 'iPhone', 'Windows', 'Mac'].every((w) => b.includes(w))) miss.push(c + ':platforms');   // ★ #46 r1 (R3 M1): the per-platform way, in every locale
      else if (b.split('\n\n').length !== 2 || !j.otherWalletWayTitle || (c !== 'en-us' && j.otherWalletWayTitle === en.otherWalletWayTitle)) miss.push(c + ':shape');   // option 2: two paragraphs + its own title
    }
    r.locales = miss.length === 0;
    const LS = stripCode(raw('src/components/lock-shell.js'));
    r.noNavCall = !/onUseAnotherWallet\(\)/.test(LS);
    ok(Object.values(r).every(Boolean),
      '★ S16 SHEET (#1311 (b), Damir picked RESTORE-B): on the BUILT lock shell the "Use a different wallet…" link opens "One account per device" (option 2): paragraph 1 = delete this account first (Account › Delete data… › Delete account), paragraph 2 = forgot the password → remove Spixi’s data per platform (Android: clear the storage · iPhone: delete the app · Windows / Mac: the Spixi folder in Documents; never “reinstall”) and its ONE action CLOSES it — no ixian:change navigation, the lock stays; every built locale names its own Account / Delete data… / Delete account labels — ' + JSON.stringify(r) + (miss.length ? ' miss=' + miss.join(',') : ''));
  }

  /* ── SCAN (#1304, Damir picked A) — EXECUTED on the BUILT bundle (Spixi/Resources/Raw/html/spixi.bundle.js), frozen clock ── */
  {
    const W = new JSDOM('<!doctype html><html lang="en-us"><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true }).window;
    W.eval(raw('Spixi/Resources/Raw/html/spixi.icons.js'));
    W.eval(raw('Spixi/Resources/Raw/html/spixi.bundle.js'));
    const S = W.Spixi;
    let T = 0;
    W.Date.now = () => T;                                   // the frozen clock the component reads
    const SLOW = 'Spixi may feel slower until this is done';
    const O = 1000000;
    /* 250 headers every 3 s (the TIV step) for `toMs`, against `target`; returns the row */
    const feed = (el, target, toMs, origin = O, from = 0) => {
      for (let t = from, k = from / 3000; t <= toMs; t += 3000, k++) { T = t; S.setScanProgress(el, { current: O + 250 * k, target, origin, strings: {} }); }
      return el;
    };
    const GONE = { hidden: true, textContent: '(no second line)', closest: () => null, previousElementSibling: null, parentElement: { classList: { contains: () => false } } };
    const sub = (el) => el.querySelector('.c-scanprog__sub') || GONE;   // a missing line fails its key, never crashes the module
    const unit = (n, u) => new W.Intl.NumberFormat('en-us', { style: 'unit', unit: u, unitDisplay: 'short' }).format(n);
    const r = {};
    /* 5 min = 25 000 headers at 5 000 / min; 900 000 left = exactly 3 h */
    const a = S.createScanProgress({ strings: {} });
    W.document.body.append(a);
    feed(a, O + 925000, 297000);
    r.noEtaUnder5min = !sub(a).hidden && sub(a).textContent === SLOW;
    feed(a, O + 925000, 300000, O, 300000);
    r.hours = sub(a).textContent === 'About ' + unit(3, 'hour') + ' left · ' + SLOW;
    T = 303000; S.setScanProgress(a, { current: O + 25250, target: O + 925002, origin: O, strings: {} });
    r.creepKeeps = /^About /.test(sub(a).textContent);      // a target that creeps (new blocks) is the same catch-up
    T = 306000; S.setScanProgress(a, { current: O + 25500, target: O + 925002, origin: O + 1, strings: {} });
    r.newOriginResets = sub(a).textContent === SLOW;       // a new catch-up: no ETA until 5 more minutes
    /* the title line and the live region are untouched */
    const live = a.querySelector('[aria-live]');
    r.notLive = !!live && live.textContent === 'Checking for your transactions' && sub(a) !== GONE && !live.contains(sub(a)) && !sub(a).closest('[aria-live]');
    r.underTitle = sub(a).previousElementSibling === live && sub(a).parentElement.classList.contains('c-scanprog__col');
    /* 22 min left → rounded UP to 25; 4 min left → no ETA */
    const b = feed(S.createScanProgress({ strings: {} }), O + 25000 + 110000, 300000);
    r.minutes = sub(b).textContent === 'About ' + unit(25, 'minute') + ' left · ' + SLOW;
    const c = feed(S.createScanProgress({ strings: {} }), O + 25000 + 20000, 300000);
    r.under5left = sub(c).textContent === SLOW;
    /* indeterminate and done: no second line */
    T = 309000; S.setScanProgress(b, { current: 0, target: 0, origin: 0, strings: {} });
    r.unknownNone = b.dataset.state === 'unknown' && sub(b).hidden;
    T = 312000; S.setScanProgress(c, { current: O + 45000, target: O + 45000, origin: O, strings: {} });
    r.doneNone = c.hidden && sub(c).hidden && sub(c).textContent === '';
    /* Intl missing → the fixed fallback, which is the rendered "About 3 h left" */
    const d = S.createScanProgress({ strings: {} });
    const NF = W.Intl.NumberFormat;
    W.Intl.NumberFormat = function () { throw new Error('no Intl'); };
    feed(d, O + 925000, 300000);
    W.Intl.NumberFormat = NF;
    r.fallback = sub(d).textContent === 'About 3 h left · ' + SLOW;
    /* the format rule itself */
    const f = S.formatScanEta;
    r.format = typeof f === 'function' && f(299999) === '' && f(5 * 60000) === unit(5, 'minute') && f(56 * 60000) === unit(1, 'hour')
      && f(90 * 60000) === unit(2, 'hour') && f(Infinity) === '';
    /* the strings: the en dictionary = the fallbacks; no #440 forbidden words; CSS = wraps, secondary, body-sm */
    const en = JSON.parse(raw('src/strings/en-us.json'));
    r.strings = en.chainScanSlow === SLOW && en.chainScanSlowEta === 'About {t} left · ' + SLOW && en.chainScanTitle === 'Checking for your transactions'
      && !/blockchain|sync/i.test(en.chainScanSlow + en.chainScanSlowEta);
    const css = stripCssComments(raw('src/styles/components/scan-progress.css'));
    const subRule = (css.match(/\.c-scanprog__sub\s*\{([^}]*)\}/) || [])[1] || '';
    r.css = /color:\s*var\(--text-neutral-02\)/.test(subRule) && /font-size:\s*var\(--font-size-body-sm\)/.test(subRule)
      && !/nowrap|ellipsis|display/.test(subRule);
    W.close();
    ok(Object.values(r).every(Boolean),
      '★ S16 SCAN (#1304, Damir picked A): while the wallet row is SCANNING it shows a second line under the unchanged title — "About {t} left · Spixi may feel slower until this is done" with a credible ETA, else just the slow line; the ETA needs a ≥ 5-min sliding window of (time, height) samples and a positive rate, ≥ 1 h = whole hours, < 1 h = minutes up to the next 5, < 5 min = none (Intl unit, fixed fallback); a new origin resets the samples, a creeping target does not; the line is outside the aria-live title, wraps, secondary text; none when indeterminate or done — ' + JSON.stringify(r) + ' sample=' + JSON.stringify(unit(3, 'hour')));
  }

  /* ── LANG ── */
  {
    const codes = ['en-us', 'cn-cn', 'de-de', 'es-co', 'fr-fr', 'id-id', 'it-it', 'ja-jp', 'lt-lt', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp'];
    const bad = [];
    let enVal = '';
    for (const c of codes) {
      const t = raw('Spixi/Resources/Raw/lang/' + c + '.txt');
      const v = (t.match(/^intro-restore-walletexists-text = (.+)$/m) || [])[1] || '';
      const j = JSON.parse(raw('src/strings/' + c + '.json'));
      if (c === 'en-us') enVal = v.trim();
      if (!v || !v.includes(j.deleteData) || !v.includes(j.deleteAccount)) bad.push(c);
    }
    const en = raw('Spixi/Resources/Raw/lang/en-us.txt');
    const LP = raw('Spixi/Pages/Launch/LaunchPage.xaml.cs');
    const fb = [...LP.matchAll(/_SL\("intro-restore-walletexists-text"\) \?\? "([^"]+)"/g)].map((m) => m[1]);
    const l = {
      files: bad.length === 0,
      noDeleteWallet: !/Delete wallet/.test(en) && !/Delete wallet/.test(LP),
      enPath: /open Account › Delete data… › Delete account, then open Restore again\.$/.test(enVal),
      fallbacks: fb.length === 2 && fb.every((x) => x === enVal),
    };
    ok(Object.values(l).every(Boolean),
      '★ S16 LANG (#1311 (b)): the restore-conflict alert names the REAL path in all 13 lang files — each intro-restore-walletexists-text carries that locale\'s own "Delete data…" and "Delete account" labels (the stale "Delete wallet" card is gone since #545); LaunchPage\'s two C# fallbacks equal the en-us.txt value — ' + JSON.stringify(l) + (bad.length ? ' bad=' + bad.join(',') : ''));
  }

  /* ── REARM ── */
  {
    const CB = rd('Spixi/Meta/SpixiLocalStorageCallbacks.cs');
    const pm = body(CB, 'public void processMessage(');
    const sender = body(pm, 'if (friendMessage.localSender)');
    const TM = rd('Spixi/Data/TransferManager.cs');
    const claimB = body(TM, 'public static bool claimRearm(string uid)');
    const hasB = body(TM, 'public static bool hasOutgoing(string uid)');
    const upd = body(TM, 'public static void onUpdate()');
    const logs = [...pm.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
    const r = {
      first: /^\{\s*if \(S16FixRules\.rearmLeg\(friendMessage\.transferId, TransferManager\.hasOutgoing, TransferManager\.claimRearm\) != S16FixRules\.RearmLeg\.Arm\)\s*\{\s*return;\s*\}/.test(sender),
      beforeIo: sender.indexOf('S16FixRules.rearmLeg(') > -1 && sender.indexOf('S16FixRules.rearmLeg(') < sender.indexOf('File.Exists(')
        && sender.indexOf('S16FixRules.rearmLeg(') < sender.indexOf('new FileStream('),
      ledger: /private static readonly S16FixRules\.RearmLedger rearmClaims = new S16FixRules\.RearmLedger\(\);/.test(TM)
        && /^\{\s*return rearmClaims\.claim\(uid\);\s*\}$/.test(claimB),
      exactLocked: /lock \(outgoingTransfers\)\s*\{\s*return outgoingTransfers\.Exists\(x => x\.uid == uid\);\s*\}/.test(hasB) && !/Contains\(/.test(hasB),
      clears: /outgoingTransfers\.Clear\(\);\s*\}\s*rearmClaims\.clear\(\);\s*rearmLogged\.clear\(\);/.test(upd),
      /* ★ #46 r1 (R3 m1 / n6): the file op sits in its own try; its catch disposes the stream and asks rearmFailed (claim kept
         only for a FINAL failure, released otherwise — executed in S16FixTests), and logs only the first failure of the id;
         after a successful prepare the transfer owns the stream (fs = null) */
      opInTry: /FileStream\? fs = null;\s*try\s*\{[^]*?fs = new FileStream\(path, FileMode\.Open, FileAccess\.Read, FileShare\.Read\);[^]*?\}\s*catch \(Exception e\)\s*\{\s*try \{ fs\?\.Dispose\(\); \} catch \(Exception\) \{ \}\s*if \(TransferManager\.rearmFailed\(friendMessage\.transferId, e\)\)\s*\{\s*Logging\.error\(/.test(sender),
      ownership: /if \(ft == null\)\s*\{\s*fs\.Dispose\(\);[^}]*return;\s*\}\s*fs = null;/.test(sender),
      failedTM: /private static readonly S16FixRules\.RearmLedger rearmLogged = new S16FixRules\.RearmLedger\(\);/.test(TM)
        && /^\{\s*return S16FixRules\.rearmFailure\(uid, e, rearmClaims, rearmLogged\);\s*\}$/.test(body(TM, 'public static bool rearmFailed(string uid, Exception e)')),
      rule: /^\{\s*if \(!rearmKeepsClaim\(e\)\)\s*\{\s*claims\.release\(uid\);\s*\}\s*return logged\.claim\(uid\);\s*\}$/.test(body(rd('Spixi/Utils/S16FixRules.cs'), 'public static bool rearmFailure('))
        && /return e is System\.IO\.FileNotFoundException \|\| e is System\.IO\.DirectoryNotFoundException;/.test(rd('Spixi/Utils/S16FixRules.cs'))
        && /return !string\.IsNullOrEmpty\(uid\) && ids\.TryRemove\(uid, out _\);/.test(rd('Spixi/Utils/S16FixRules.cs')),
      noIdLogged: logs.length >= 2 && logs.every((a) => !/transferId|uid|path|t_file_name|friend\./.test(a)),
    };
    ok(Object.values(r).every(Boolean),
      '★ S16 REARM (#1311 (c)): an unfinished SENT file is re-armed ONCE per transfer id per session — the callback asks S16FixRules.rearmLeg FIRST (no id / already outgoing / already tried → return, before any File.Exists or FileStream), TransferManager.claimRearm is the ledger (TryAdd, executed in S16FixTests), hasOutgoing is the EXACT id under the list lock, the claims clear with the outgoing list at the stop cleanup, and no log line carries the id or a path; ★ #46 r1: a TRANSIENT failure releases the claim (only a gone source keeps it), the error line is written once per id, and the stream is disposed on every failure after the open — ' + JSON.stringify(r));
  }

  /* ── SHIELD ── */
  {
    const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
    const hold = body(SCP, 'private static void holdStageUntilDrawn(PreloadOp op)');
    const add = body(SCP, 'private static void addHoldShield(PreloadOp op)');
    const dropFor = body(SCP, 'private static void dropHoldShieldFor(PreloadOp op, int seq)');
    const drop = body(SCP, 'private static void dropHoldShield(PreloadOp op)');
    const rel = body(SCP, 'private static void releaseHeld(');
    const close = body(SCP, 'private static void closeOverlay(PreloadOp op, bool slideOut = false)');
    const closeMain = close.slice(close.indexOf('MainThread.BeginInvokeOnMainThread(async () =>'));
    /* every write that makes a HELD stage input-live is followed, in its own block, by the drop */
    const liveSites = [...SCP.matchAll(/held\.stage\.InputTransparent = false;/g)].map((m) => m.index);
    const liveDrops = liveSites.map((i) => /^[^{}]*\}\s*(?:\}\s*)?catch \(Exception\) \{ \}\s*(?:\}\s*)?dropHoldShieldFor\(held, seq\);/.test(SCP.slice(i + 'held.stage.InputTransparent = false;'.length, i + 400)));
    const addAt = SCP.indexOf('private static void addHoldShield(PreloadOp op)');
    const ifAt = SCP.lastIndexOf('#if ANDROID', addAt);
    const endAt = SCP.lastIndexOf('#endif', addAt);
    const dropAt = SCP.indexOf('private static void dropHoldShield(PreloadOp op)');
    const s = {
      field: /public View\? holdShield = null;/.test(SCP),
      addedBeforeShow: hold.indexOf('addHoldShield(op);') > hold.indexOf('setHoldGrounds(op, native, true);') && hold.indexOf('addHoldShield(op);') < hold.indexOf('op.stage.Opacity = 1;'),
      under: /int at = op\.hostGrid\.Children\.IndexOf\(op\.stage\);/.test(add) && /op\.hostGrid\.Children\.Insert\(at, shield\);/.test(add) && add.indexOf('op.holdShield = shield;') < add.indexOf('op.hostGrid.Children.Insert(at, shield);'),
      geometry: ['Column', 'ColumnSpan', 'Row', 'RowSpan'].every((k) => add.includes('Grid.Set' + k + '(shield, Grid.Get' + k + '(op.stage));')) && /Margin = op\.stage\.Margin,/.test(add),
      consumes: /InputTransparent = false,/.test(add) && /shield\.HandlerChanged \+= \(s, e\) =>/.test(add)
        && /if \(shield\.Handler\?\.PlatformView is Android\.Views\.View v\)\s*\{\s*v\.Clickable = true;/.test(add),
      a11y: /v\.ImportantForAccessibility = Android\.Views\.ImportantForAccessibility\.NoHideDescendants;/.test(add),
      neverHostFlag: !/hostGrid\.InputTransparent/.test(add + drop + dropFor),
      idempotent: /^\{\s*if \(op\.holdShield != null\)\s*\{\s*return;\s*\}/.test(add) && /try\s*\{\s*op\.hostGrid\.Children\.Remove\(shield\);/.test(drop),
      /* ★ #46 r1 (R3 n1): a failed Remove leaves the shield INERT (input-transparent, hidden; on Android not clickable, Gone),
         and the field is nulled only AFTER the Remove / the fallback — never a live shield the op has forgotten */
      inertOnFail: /\}\s*catch \(Exception\)\s*\{\s*try \{ shield\.InputTransparent = true; shield\.IsVisible = false; \} catch \(Exception\) \{ \}\s*#if ANDROID[^]*?v\.Clickable = false;\s*v\.Visibility = Android\.Views\.ViewStates\.Gone;[^]*?#endif\s*\}\s*op\.holdShield = null;\s*\}$/.test(drop)
        && drop.indexOf('op.holdShield = null;') > drop.indexOf('op.hostGrid.Children.Remove(shield);'),
      backstop: /Task\.Delay\(HoldShieldBackstopMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(op\.holdShield == placed\)/.test(add)
        && Number((SCP.match(/private const int HoldShieldBackstopMs = (\d+);/) || [])[1]) > 250 + 400
        /* ★ #46 r1 (R4 FX-d): an UPPER bound too — a lost release must not leave a tap-eating view for long — and the timer uses
           the named constant, once */
        && Number((SCP.match(/private const int HoldShieldBackstopMs = (\d+);/) || [])[1]) <= 2000
        && (SCP.match(/HoldShieldBackstopMs/g) || []).length === 2 && (add.match(/Task\.Delay\(/g) || []).length === 1,
      ownedDrop: /^\{\s*if \(!S11ChatRules\.deferredOwns\(seq, op\.holdSeq\)\)\s*\{\s*return;\s*\}\s*dropHoldShield\(op\);\s*\}$/.test(dropFor),
      everyLiveSite: liveSites.length === 3 && liveDrops.every(Boolean),
      releaseBoth: (rel.match(/dropHoldShieldFor\(held, seq\);/g) || []).length === 2,
      onClose: closeMain.indexOf('dropHoldShield(op);') > -1 && closeMain.indexOf('dropHoldShield(op);') < closeMain.indexOf('if (parked)'),
      onSwapOut: /s\.swappedOut = true;\s*try \{ s\.stage\.InputTransparent = true; \} catch \(Exception\) \{ \}\s*dropHoldShield\(s\);/.test(SCP),
      platforms: ifAt > endAt && dropAt > SCP.indexOf('#endif', addAt),   // add = Android only; drop compiles everywhere (shared close / swap-out)
    };
    ok(Object.values(s).every(Boolean),
      '★ S16 SHIELD (#1294 (c), Android): a tap during the ~250 ms hold no longer falls through to the chats list — holdStageUntilDrawn adds a transparent, input-consuming sibling (Clickable platform view, hidden from accessibility, same column / row / span / margin) just UNDER the held stage, before the stage shows; it is removed at EVERY held-stage input-live write (owned by that hold), on close, on swap-out, and by a backstop; hostGrid\'s InputTransparent is never touched — ' + JSON.stringify(s) + ' live=' + JSON.stringify(liveDrops));
  }
}
