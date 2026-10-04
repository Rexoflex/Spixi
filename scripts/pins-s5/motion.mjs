/* ==== SESSION 5b — #1166 MOTION (V-1): lever 12 · lever 9 · lever 7 · lever 4 probe ====
 * Lever 12 (#1165 (4)): the subscreen slide is 220 / 160 ms on BOTH sides — the CSS (executed: the computed
 *   `animation` on the BUILT shell), the component's backstop clock (the built bundle) and the C# native slide
 *   (ScreenSlideInMs / ScreenSlideOutMs, stripCode — nothing executes C# here). Close < open.
 * Lever 9 (#1165 (6)): the call card is laid out FROM THE TOP at --call-card-h (= CallPage.cardHeightDip), so the
 *   bar's painted signal no longer waits for the viewport to shrink (EXECUTED on the built call shell: a tall
 *   viewport, no resize event, the signal arrives after the double rAF — before it waited for the 450 ms timer).
 * Lever 7 (#1165 (3)): the desktop info pane — col 2 animates on the slide clock (InfoPaneMotion = "width"), the
 *   fallback "push" is the same code with one token changed; [P1] stamps. C# only → stripCode structure.
 * Lever 4 (#1165 (2)): ONE dev-only probe of what runs in the 600 ms after a SPARE chat present. No fix.
 * Deliberate breaks (#802) are listed in the session hand-back, one per pin. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const PHONE_UA = 'Mozilla/5.0 (Linux; Android 15; motorola edge 50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
  const msOf = (v) => { const m = /(\d+(?:\.\d+)?)(ms|s)\b/.exec(String(v || '')); return m ? Math.round(Number(m[1]) * (m[2] === 's' ? 1000 : 1)) : -1; };
  const scp = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
  const home = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const between = (t, a, b) => { const i = t.indexOf(a); if (i < 0) return ''; const j = t.indexOf(b, i + a.length); return j < 0 ? '' : t.slice(i, j); };

  /* —— LEVER 12 ① the CSS durations, EXECUTED: the computed `animation` on the built settings shell (phone) —— */
  const css12 = await (async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/settings.html');
    const dom = new JSDOM(readFileSync(f, 'utf8'), { url: 'file://' + f, pretendToBeVisual: true });
    const W = dom.window, d = W.document;
    const probe = (cls) => { const el = d.createElement('div'); el.className = 'c-subslide ' + cls; d.body.append(el); const a = W.getComputedStyle(el).animation; el.remove(); return a; };
    const aIn = probe('c-subslide--in'), aOut = probe('c-subslide--out');
    d.documentElement.setAttribute('data-desktop', '');
    const dIn = probe('c-subslide--in'), dOut = probe('c-subslide--out');
    try { W.close(); } catch (e) {}
    return { aIn, aOut, dIn, dOut };
  })();
  const cssIn = msOf(css12.aIn), cssOut = msOf(css12.aOut);
  {
    const r = {
      cssIn: cssIn === 220 && /c-subslide-in\b/.test(css12.aIn) && /var\(--easing-standard\)/.test(css12.aIn),
      cssOut: cssOut === 160 && /c-subslide-out\b/.test(css12.aOut) && /var\(--easing-accelerate\)/.test(css12.aOut),
      closeFaster: cssOut > 0 && cssOut < cssIn,
      desktopNone: css12.dIn === 'none' && css12.dOut === 'none',   /* #704 unchanged: desktop never slides in-shell */
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 12 (EXECUTED, built settings shell): the in-shell subscreen slide computes to 220 ms in (--easing-standard) and 160 ms out (--easing-accelerate) — was 300 / 220; close stays faster than open; desktop still none — ' + JSON.stringify({ r, css12 }));
  }

  /* —— LEVER 12 ② ONE PAIR everywhere: the built component's clocks and the C# native slide equal the CSS —— */
  {
    const bundle = stripCode(rd('Spixi/Resources/Raw/html/spixi.bundle.js'));
    const jsIn = Number((/const ENTER_MS = (\d+);/.exec(bundle) || [])[1]);
    const jsOut = Number((/const EXIT_MS = (\d+);/.exec(bundle) || [])[1]);
    const csIn = Number((/private const uint ScreenSlideInMs = (\d+);/.exec(scp) || [])[1]);
    const csOut = Number((/private const uint ScreenSlideOutMs = (\d+);/.exec(scp) || [])[1]);
    const co = between(scp, 'private static void closeOverlay(PreloadOp op, bool slideOut = false)', 'private static void cancelPreload');
    const slide = between(scp, 'private static async Task slideStageIn(PreloadOp op)', 'private static void cancelPreload');
    const r = {
      jsIn: jsIn === cssIn, jsOut: jsOut === cssOut,
      csIn: csIn === cssIn, csOut: csOut === cssOut,
      /* the mirror exit reads the named constant (it was a literal 220 twice) — and no literal duration is left there */
      csOutUsed: /op\.stage\.TranslateTo\(w \* SlideTravel, 0, ScreenSlideOutMs, Easing\.CubicIn\),\s*op\.stage\.FadeTo\(0, ScreenSlideOutMs, Easing\.CubicIn\)\);/.test(co)
        && !/TranslateTo\(w \* SlideTravel, 0, \d+,/.test(co) && !/FadeTo\(0, \d+, Easing\.CubicIn\)/.test(co),
      csInUsed: /stage\.TranslateTo\(0, 0, ScreenSlideInMs, ScreenSlideEasing\),\s*stage\.FadeTo\(1, ScreenSlideInMs, ScreenSlideEasing\)\);/.test(slide),
      inputDead: Number((/private const int SlideInputDeadMs = (\d+);/.exec(scp) || [])[1]) < csIn / 4,   /* R2-2 still a small fraction of the entry */
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 12: ONE pair — subscreen-slide.js ENTER_MS / EXIT_MS (the backstop clocks, built bundle) and the C# ScreenSlideInMs / ScreenSlideOutMs (the native overlay slide + its mirror exit, named, no literal left) all equal the executed CSS 220 / 160 — ' + JSON.stringify({ r, jsIn, jsOut, csIn, csOut }));
  }

  /* —— LEVER 9: the call card from the top; the bar's painted signal does not wait for the resize (EXECUTED) —— */
  {
    const f = join(root, 'Spixi/Resources/Raw/html/call.html');
    const html = readFileSync(f, 'utf8');
    const sent = [];
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        try { Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => PHONE_UA }); } catch (e) {}
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        let real;
        Object.defineProperty(w, 'Spixi', {
          configurable: true, enumerable: true,
          get: () => real,
          set: (v) => { const mk = v.createNativeBridge; v.createNativeBridge = (o = {}) => mk({ ...o, emit: o.emit || ((c) => sent.push(c)) }); real = v; },
        });
      },
    });
    await sleep(1200);
    const W = dom.window, d = W.document;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    const tallH = W.innerHeight;   // the viewport has NOT shrunk to the card (jsdom: 768)
    push('setCallUi', 'incall', 'Ana', '', 'In call', '0', '77', '');
    d.body.dataset.mode = 'bar';
    const t0 = Date.now();
    push('callAwaitPaint', '4242', 'bar', '0');
    let at = -1;
    for (let i = 0; i < 40 && at < 0; i++) { await sleep(10); if (sent.includes('ixian:callPainted:4242')) at = Date.now() - t0; }
    /* the bar box: from the top, the card's own height — computed on the built shell */
    const bar = d.querySelector('.c-callbar') || (() => { const e = d.createElement('div'); e.className = 'c-callbar'; d.body.append(e); return e; })();
    const cs = W.getComputedStyle(bar);
    const box = { top: cs.top, bottom: cs.bottom, height: cs.height };
    const cardTok = /--call-card-h:\s*(\d+)px/.exec(html);
    const cardDip = /private const double cardHeightDip = (\d+);/.exec(stripCode(rd('Spixi/Pages/Call/CallPage.xaml.cs')));
    try { W.close(); } catch (e) {}
    const r = {
      tall: tallH > 120,
      paintedFast: at >= 0 && at < 250,   /* double rAF; the 450 ms timer is the old path */
      fromTop: box.top === '0px' && box.bottom === 'auto' && /var\(--call-card-h\)|^64px$/.test(box.height),
      oneHeight: !!cardTok && !!cardDip && Number(cardTok[1]) === Number(cardDip[1]),
      noErrors: errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0,
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 9 (EXECUTED, built call shell): the minimised card is laid out FROM THE TOP at --call-card-h (= CallPage.cardHeightDip), so in a viewport that has not shrunk yet (no resize event) the bar answers ixian:callPainted after its double rAF instead of waiting for the resize (212–223 ms, #1123 (4)) or the 450 ms timer — ' + JSON.stringify({ r, at, tallH, box, errs: errs.slice(0, 2) }));
  }

  /* —— LEVER 7 ① the host side: one token, two paths, the slide clock, [P1] stamps (stripCode, C#) —— */
  {
    const tok = /private const string InfoPaneMotion = "(width|push)";/.exec(home);
    const anim = between(home, 'private void animateInfoColumn(bool open, double to, ContactDetails pane)', 'public override void startOverlayColumnExit');
    const pres = between(home, 'public override void onOverlayPresented(SpixiContentPage overlay)', 'public void exitAccountForChat()');
    const r = {
      token: !!tok && tok[1] === 'width',
      modeMap: /return InfoPaneMotion == "push" \? ColumnMotion\.Push : ColumnMotion\.Width;/.test(home),
      clock: /uint ms = open \? SpixiContentPage\.slideInMs : SpixiContentPage\.slideOutMs;/.test(anim)
        && /Easing easing = open \? SpixiContentPage\.slideInEasing : Easing\.CubicIn;/.test(anim),
      /* width: the column is written on every tick; push: no tick writes, ONE widen at the end of an open, the column goes first on a close */
      widthTicks: /mode == ColumnMotion\.Width\s*\?\s*\(Action<double>\)\(v => \{ writes\+\+; mainGrid\.ColumnDefinitions\[2\]\.Width = new GridLength\(Math\.Max\(0, v\)\); \}\)\s*:\s*\(Action<double>\)\(v => \{ \}\);/.test(anim),
      pushOnce: /if \(open && mode == ColumnMotion\.Push\)\s*\{\s*writes\+\+;\s*mainGrid\.ColumnDefinitions\[2\]\.Width = new GridLength\(to\);/.test(anim)
        && /if \(!open && mode == ColumnMotion\.Push\)\s*\{\s*mainGrid\.ColumnDefinitions\[2\]\.Width = new GridLength\(0\);/.test(anim),
      release: /if \(open\)\s*\{\s*SpixiContentPage\.releaseStageWidth\(pane\);/.test(anim),
      /* the present no longer snaps the column to the pane width on the sliding path */
      presentAnimates: /if \(willSlide\)\s*\{\s*animateInfoColumn\(true, paneW, cd\);/.test(pres)
        && (pres.match(/ColumnDefinitions\[2\]\.Width = /g) || []).length === 0,
      /* every other write of col 2 stops a running motion first (no tick overwrites a collapse / a resize) */
      oneSetter: /private void setInfoColumnNow\(double width\)\s*\{\s*try \{ this\.AbortAnimation\(InfoPaneAnim\); \} catch \(Exception\) \{ \}\s*mainGrid\.ColumnDefinitions\[2\]\.Width = new GridLength\(width\);/.test(home)
        && (home.match(/mainGrid\.ColumnDefinitions\[2\]\.Width = /g) || []).length === 5,
      p1: /P1Perf\.line\("infopane " \+ \(open \? "open" : "close"\) \+ " motion=" \+ \(mode == ColumnMotion\.Push \? "push" : "width"\)/.test(anim)
        && /P1Perf\.framesAfter\(open \? "infopane" : "infopane-close"\);/.test(anim)
        && /P1Perf\.line\("infopane done " \+ \(open \? "open" : "close"\) \+ " ms=" \+ P1Perf\.msSince\(p1T0\)/.test(anim)
        && /if \(P1Perf\.enabled\)\s*\{\s*P1Perf\.line\("infopane " \+/.test(anim),
      exit: /public override void startOverlayColumnExit\(SpixiContentPage overlay, ColumnMotion motion\)\s*\{\s*if \(overlay is ContactDetails cd && ReferenceEquals\(cd, infoPaneCol2Page\) && motion != ColumnMotion\.None\)\s*\{[\s\S]{0,120}?animateInfoColumn\(false, 0, cd\);/.test(home),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 7 (C#, stripCode): the desktop info pane\'s col 2 moves on the slide clock (220 ms house curve in, 160 ms CubicIn out) — InfoPaneMotion = "width" writes the column every tick, the "push" fallback is the SAME code with one token changed (no tick writes, one widen at the end); every other col-2 write stops the motion first; dev-only [P1] `infopane open|close motion=` + `frames infopane|infopane-close` + `infopane done ms= writes=` — ' + JSON.stringify(r));
  }

  /* —— LEVER 7 ② the stage side: laid out at the pane width and clipped, fade (width) or full travel (push) —— */
  {
    const reveal = between(scp, 'private static void revealStage(PreloadOp op)', 'private static async Task liftStageInput(PreloadOp op)');
    const co = between(scp, 'private static void closeOverlay(PreloadOp op, bool slideOut = false)', 'private static void cancelPreload');
    const r = {
      hook: /public virtual ColumnMotion overlayColumnMotion\(SpixiContentPage overlay, bool entering, out double paneWidth\)\s*\{\s*paneWidth = 0;\s*return ColumnMotion\.None;/.test(scp),
      pin: /op\.stage\.WidthRequest = width;\s*op\.stage\.HorizontalOptions = alignEnd \? LayoutOptions\.End : LayoutOptions\.Start;/.test(scp)
        && /op\.stage\.WidthRequest = -1;\s*op\.stage\.HorizontalOptions = LayoutOptions\.Fill;/.test(scp),
      entry: /if \(op\.slideIn\)\s*\{\s*try \{ colMotion = op\.host\.overlayColumnMotion\(op\.target, true, out colPaneW\); \}/.test(reveal)
        && /pinStageWidth\(op, colPaneW, colMotion == ColumnMotion\.Push\);\s*op\.stage\.TranslationX = colMotion == ColumnMotion\.Push \? colPaneW : 0;\s*op\.stage\.Opacity = colMotion == ColumnMotion\.Push \? 1 : 0;\s*_ = slideStageIn\(op\);/.test(reveal),
      /* the default (every other overlay) is today's 40% slide + fade, unchanged */
      defaultKept: /else if \(slideFrom > 0\)\s*\{\s*op\.stage\.TranslationX = slideFrom \* SlideTravel;\s*op\.stage\.Opacity = 0;/.test(reveal),
      exit: /pinStageWidth\(op, w, exitMotion == ColumnMotion\.Push\);\s*try \{ op\.host\.startOverlayColumnExit\(op\.target, exitMotion\); \}/.test(co)
        && /if \(exitMotion == ColumnMotion\.Push\)\s*\{\s*await op\.stage\.TranslateTo\(w, 0, ScreenSlideOutMs, Easing\.CubicIn\);\s*\}\s*else\s*\{\s*await op\.stage\.FadeTo\(0, ScreenSlideOutMs, Easing\.CubicIn\);/.test(co)
        && co.indexOf('pinStageWidth(op, w,') < co.indexOf('startOverlayColumnExit('),
      hostAnswers: /if \(!infoPaneCol2Pending \|\| !infoPaneFitsCol2\(cd, out paneWidth\)\)/.test(home)
        && /if \(!infoPaneCol2Open \|\| !ReferenceEquals\(cd, infoPaneCol2Page\)\)/.test(home),
      /* ★ #1166 r1 (C-M2): desktop only — the whole answer sits under WINDOWS || MACCATALYST, every other TFM (a wide
         Android / iOS tablet) answers None */
      desktopOnly: (() => {
        const m = /public override ColumnMotion overlayColumnMotion\(SpixiContentPage overlay, bool entering, out double paneWidth\)\s*\{\s*paneWidth = 0;\s*#if WINDOWS \|\| MACCATALYST[ \t]*\r?\n([\s\S]*?)#else\s*return ColumnMotion\.None;\s*#endif\s*\}/.exec(home);
        return !!m && /infoPaneMotionMode\(\)/.test(m[1]) && !/#if|#else|#endif/.test(m[1]);
      })(),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 7 (C#, stripCode): SpixiContentPage lets the host own a column overlay\'s motion — the stage is laid out at the pane width (Start = clipped by the growing column, End = its trailing edge on the window edge) and does only its half on the same clock: Width = fade, no travel; Push = opaque, full pane-width travel; the exit pins first, then the host collapses its column; every other overlay keeps the 40% slide + fade — ' + JSON.stringify(r));
  }

  /* —— LEVER 4: the spare-after probe — dev-only, spare opens only, 600 ms, the P-1 grammar, ONE SingleChatPage tag —— */
  {
    const chat = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const send = between(scp, 'public void sendMessage(string msg)', 'messageQueue.Enqueue(msg);');
    const arm = between(scp, 'internal void p1SpareAfterArm()', 'internal void p1SpareAfterWork(string what)');
    const verb = between(scp, 'internal static string p1VerbOf(string msg)', 'private void p1SpareAfterPush(string msg, bool queued)');
    const lit = [...(between(scp, 'private const long P1SpareAfterWindowMs', 'private static void presentPreload(') + send).matchAll(/P1Perf\.line\(([^;]*)\);/g)].map((m) => m[1]);
    const words = lit.flatMap((a) => [...a.matchAll(/"([^"]*)"/g)].map((m) => m[1]));
    const r = {
      onlySpare: (scp.match(/p1FromSpare = true;/g) || []).length === 1
        && /public void p1MarkSpare\(\) \{ p1Start = P1Perf\.now\(\); p1FromSpare = true; \}/.test(scp)
        && (scp.match(/\.p1MarkSpare\(\);/g) || []).length === 1
        && between(scp, 'public string? pushSpareChat(', 'private const bool SPARE_CLAIM_WARMING').includes('op.p1MarkSpare();')
        && /if \(op\.p1FromSpare\)\s*\{\s*op\.target\.p1SpareAfterArm\(\);/.test(scp),
      devOnly: /if \(!P1Perf\.enabled\)\s*\{\s*return;\s*\}/.test(arm) && /if \(P1Perf\.enabled\)\s*\{\s*try \{ p1SpareAfterPush\(msg,/.test(send),
      window: /private const long P1SpareAfterWindowMs = 600;/.test(scp) && /return ms <= P1SpareAfterWindowMs \? ms : -1;/.test(scp),
      /* the verb is the code-defined function name, cut to [a-z0-9_]{1,30}; anything else is "js" — never an argument */
      verbSafe: /if \(\(c >= 'a' && c <= 'z'\) \|\| \(c >= '0' && c <= '9'\) \|\| c == '_'\)/.test(verb) && /sb\.Length < 30/.test(verb) && /: "js";/.test(verb),
      grammar: words.length >= 6 && words.every((w) => /^[a-z0-9_.=\- ]*$/.test(w)),
      oneTag: (chat.match(/p1SpareAfterWork\(/g) || []).length === 1
        && /public void loadApps\(\)\s*\{\s*p1SpareAfterWork\("loadapps"\);/.test(chat),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1166 lever 4 PROBE (dev-only, no fix): after a SPARE chat present only, for 600 ms, each C#→shell push of that page is stamped `[P1] spare-after push=<verb> t= q=` and loadApps (the ONE SingleChatPage tag) as `spare-after work=loadapps t=`; closed by `spare-after end n=`; fixed words + the code-defined verb cut to [a-z0-9_] — ' + JSON.stringify({ r, words }));
  }
}
