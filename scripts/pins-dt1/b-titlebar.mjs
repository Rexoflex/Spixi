/* ==== DT-1 B (Damir 2026-10-12, Q1 "Spixi" only) — THE WINDOWS TITLE BAR IN THE TOKEN COLOURS ====
 * The C# cannot run here (net10.0-windows); the rules run in the C# harness (scripts/csh/DtTitleBarTests.cs). This module:
 *   · PAIRS the colour constants in Spixi/Utils/DtTitleBarRules.cs with tokens.css — each token chain resolved on the BUILT
 *     index.html (jsdom, light and dark) must equal its constant (the railWidthDip precedent: a token re-dial without the
 *     C# fails here, not on Damir's screen);
 *   · the WIRING (raw source, comments stripped): App.CreateWindow calls DtTitleBar.onCreateWindow under #if WINDOWS; the
 *     Windows window mapper calls DtTitleBar.attach(appWindow, nativeWindow); ThemeManager.loadTheme calls DtTitleBar.apply
 *     under #if WINDOWS; SpixiFlags reads the way through DtTitleBarRules.wayThatActs; DevPage routes
 *     ixian:devflash:titlebar: BEFORE the generic ixian:devflash: branch (else the generic one takes it) and pushes the
 *     stored word on Windows only; DtTitleBar.cs never paints the window root (#1276 — no WindowRootViewContainer, no
 *     applyWindowGround) and logs exception TYPES only;
 *   · the DEV CARD on the BUILT dev.html (jsdom): setTitleBarDev('off') mounts a radiogroup of three (off / maui / colors,
 *     off checked — ★ #1392 the default); 'maui' moves the check; a tap on "colors" sends ixian:devflash:titlebar:colors
 *     once; an unknown word mounts nothing;
 *   · ★ #1392: the DEFAULT (off) paints and extends nothing — DtTitleBar creates a MAUI TitleBar only for maui / colors,
 *     subscribes UISettings only off the default, and apply() returns before any dispatch under off.
 * Deliberate breaks (DT-1 report): a constant changed one digit → the pair fails; the DevPage branch moved after the
 * generic one → the order fails; the dev card's word check dropped → the unknown-word clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  let s = null, s2 = null;
  try {
    /* —— the pair —— */
    const rules = rd('Spixi/Utils/DtTitleBarRules.cs');
    const cst = (name) => { const m = new RegExp('const string ' + name + ' = "(#[0-9A-Fa-f]{6})"').exec(rules); return m ? m[1].toUpperCase() : null; };
    const MAP = { Bg: '--surface-screen', Fg: '--text-neutral-01', FgInactive: '--text-neutral-02', HoverBg: '--surface-interactive-hover', PressedBg: '--surface-interactive-pressed' };
    s = await K.boot('index.html', { desktop: true, wait: 900 });
    const R = s.d.documentElement;
    const res = (v) => { let x = String(v || ''); for (let i = 0; i < 12 && /var\(/.test(x); i++) x = x.replace(/var\((--[\w-]+)\)/g, (_, k) => s.W.getComputedStyle(R).getPropertyValue(k).trim()); return x.trim().toUpperCase(); };
    n.pair = {};
    let all = true;
    for (const th of ['light', 'dark']) {
      R.setAttribute('data-theme', th);
      for (const [k, tok] of Object.entries(MAP)) {
        const want = res('var(' + tok + ')');
        const have = cst((th === 'light' ? 'Light' : 'Dark') + k);
        n.pair[th + k] = have + (have === want ? ' = ' : ' ≠ ') + want;
        if (!have || have !== want || !/^#[0-9A-F]{6}$/.test(want)) all = false;
      }
    }
    r.pair = all;
    s.close(); s = null;

    /* —— the wiring —— */
    const app = stripCode(rd('Spixi/App.xaml.cs'));
    const win = stripCode(rd('Spixi/Platforms/Windows/App.xaml.cs'));
    const tm = stripCode(rd('Spixi/Utils/ThemeManager.cs'));
    const fl = stripCode(rd('Spixi/Utils/SpixiFlags.cs'));
    const dev = stripCode(rd('Spixi/Pages/Dev/DevPage.xaml.cs'));
    const dt = stripCode(rd('Spixi/Platforms/Windows/DtTitleBar.cs'));
    const onLoad = (dev.match(/private void onLoad\(\)\s*\{([\s\S]*?)\n        \}/) || ['', ''])[1];
    const pushFn = (dev.match(/private void pushTitleBarDev\(\)\s*\{([\s\S]*?)\n        \}/) || ['', ''])[1];
    const rulesSrc = stripCode(rules);
    const capNames = [...new Set([...rulesSrc.matchAll(/list\.Add\(\("(\w+)"/g)].map((m) => m[1]))];
    n.capNames = capNames;
    n.wire = {
      create: /protected override Window CreateWindow[\s\S]*?#if WINDOWS\s*SPIXI\.DtTitleBar\.onCreateWindow\(window\);\s*#endif/.test(app),
      attach: /AppWindow appWindow = Microsoft\.UI\.Windowing\.AppWindow\.GetFromWindowId\(windowId\);\s*SPIXI\.DtTitleBar\.attach\(appWindow, nativeWindow\);/.test(win),
      /* the apply runs AFTER the new appearance is stored (else it would paint the previous theme) */
      theme: /activeTheme = name;\s*activeAppearance = appearance;\s*Preferences\.Default\.Set\("appearance", \(int\)activeAppearance\);\s*#if WINDOWS\s*DtTitleBar\.apply\(\);\s*#endif/.test(tm)
        && (tm.match(/DtTitleBar\.apply\(\)/g) || []).length === 1,
      flags: /DtTitleBarWay = DtTitleBarRules\.wayThatActs\(dev, tbw\);/.test(fl) && /tbw = Preferences\.Default\.Get\(DtTitleBarRules\.PrefKey, DtTitleBarRules\.WayDefault\);/.test(fl)
        /* ★ #1392: every default in the flag read is WayDefault (= off, the Windows look) — never a hard-coded way */
        && !/WayMaui/.test(fl) && /public const int WayDefault = WayOff;/.test(rulesSrc),
      /* the dev verb: dev mode AND the exact word, then the PARSED way is stored, then the echo */
      devGate: /else if \(current_url\.StartsWith\("ixian:devflash:titlebar:", StringComparison\.Ordinal\)\)\s*\{\s*try\s*\{\s*if \(Preferences\.Default\.Get\("devMode", false\)\s*&& DtTitleBarRules\.parseWayVerb\(current_url\.Substring\("ixian:devflash:titlebar:"\.Length\), out int way\)\)\s*\{\s*Preferences\.Default\.Set\(DtTitleBarRules\.PrefKey, way\);\s*\}\s*\}[\s\S]{0,200}?pushTitleBarDev\(\);\s*\}/.test(dev),
      /* the push: Windows only, the STORED way, as its word; and onLoad calls it */
      push: /^\s*#if WINDOWS[\s\S]*int way = DtTitleBarRules\.WayDefault;[\s\S]*way = Preferences\.Default\.Get\(DtTitleBarRules\.PrefKey, DtTitleBarRules\.WayDefault\);[\s\S]*Utils\.sendUiCommand\(this, "window\.setTitleBarDev", DtTitleBarRules\.wayWord\(way\)\);\s*#endif\s*$/.test(pushFn)
        && /pushTitleBarDev\(\);/.test(onLoad),
      /* way 2: the AppWindow's own extension flag + MAUI's band collapsed; the caption colours only from the pure list */
      way2: /if \(DtTitleBarRules\.systemBar\(way\(\)\)\)\s*\{\s*aw\.TitleBar\.ExtendsContentIntoTitleBar = false;\s*\}/.test(dt)
        /* #46 r2 M-1: the hide waits for the bar's handler (MAUI collapses its band only from OnIsVisibleChanged with a handler) */
        && /else if \(DtTitleBarRules\.systemBar\(w\)\)\s*\{\s*var hidden = new Microsoft\.Maui\.Controls\.TitleBar\(\);\s*hidden\.HandlerChanged \+= \(s, e\) =>\s*\{\s*try\s*\{\s*if \(hidden\.Handler != null && hidden\.IsVisible\)\s*\{\s*hidden\.IsVisible = false;/.test(dt)
        && !/var hidden = new Microsoft\.Maui\.Controls\.TitleBar\(\);\s*hidden\.IsVisible = false;/.test(dt)
        && !/ExtendsContentIntoTitleBar = true|xamlWindow\.ExtendsContentIntoTitleBar/.test(dt),
      captionList: /foreach \(var \(prop, value\) in DtTitleBarRules\.captionColours\(w, dark\)\)\s*\{\s*setColour\(tb, prop, value\);\s*\}/.test(dt)
        && capNames.length === 12 && capNames.every((nm) => new RegExp('case "' + nm + '": tb\\.' + nm + ' = c; break;').test(dt))
        && !/tb\.\w+Color\s*=(?![^;]*\bc;)/.test(dt.replace(/case "\w+": tb\.\w+ = c; break;/g, '')),
      effective: /return DtTitleBarRules\.effectiveWay\(SpixiFlags\.DtTitleBarWay, Environment\.OSVersion\.Version\.Build\);/.test(dt),
      uiSettings: /uiSettings\.ColorValuesChanged \+= \(s, e\) => apply\(\);/.test(dt),
      /* ★ #1392 (#46 r1 B MINOR-1): the DEFAULT (off) paints and extends nothing — the three guards that keep it so */
      offCreate: /if \(w == DtTitleBarRules\.WayMaui\)\s*\{\s*var bar = new Microsoft\.Maui\.Controls\.TitleBar\(\);/.test(dt)
        && (dt.match(/new Microsoft\.Maui\.Controls\.TitleBar\(\)/g) || []).length === 2,
      offUiSettings: /if \(uiSettings == null && way\(\) != DtTitleBarRules\.WayOff\)/.test(dt),
      offApply: /public static void apply\(\)\s*\{\s*if \(way\(\) == DtTitleBarRules\.WayOff\)\s*\{\s*return;/.test(dt),
    };
    const iTb = dev.indexOf('current_url.StartsWith("ixian:devflash:titlebar:"');
    const iGen = dev.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)');
    n.order = { iTb, iGen };
    n.wire.order = iTb > 0 && iGen > 0 && iTb < iGen;
    /* #1276: nothing paints the window root — no Background assignment at all, no root container, no backdrop */
    n.wire.noRoot = !/\.Background\s*=|Content\)?\.Background|WindowRootViewContainer|applyWindowGround|paintWindowGround|SystemBackdrop|RootGrid/.test(dt);
    /* every log call (any level) is one of the fixed forms: a "[DT] titlebar <step> failed: " + the TYPE, or applyLine */
    const logs = dt.match(/Logging\.\w+\([^;]*\);/g) || [];
    n.logs = logs.length;
    n.wire.typesOnly = logs.length >= 5 && logs.every((l) => /^Logging\.warn\("\[DT\] titlebar (create|attach|apply|dispatch|hide) failed: " \+ ex\.GetType\(\)\.Name\);$/.test(l)
      || /^Logging\.info\(DtTitleBarRules\.applyLine\(w, dark, custom\)\);$/.test(l));
    r.wire = Object.values(n.wire).every((v) => v === true);

    /* —— the dev card (built dev.html) —— */
    s2 = await K.boot('dev.html', { desktop: true, wait: 900 });
    const d2 = s2.d;
    s2.push('setTitleBarDev', 'bogus'); await sleep(50);
    n.bogus = d2.querySelectorAll('.c-dev-titlebar').length;
    /* ★ #1392: the default word mounts the card with "off" FIRST and checked */
    s2.push('setTitleBarDev', 'off'); await sleep(50);
    n.offCard = Array.from(d2.querySelectorAll('.c-dev-titlebar [role="radio"]')).map((b) => b.dataset.titlebar + ':' + b.getAttribute('aria-checked'));
    s2.push('setTitleBarDev', 'maui'); await sleep(50);
    const card = d2.querySelector('.c-dev-titlebar');
    const radios = card ? Array.from(card.querySelectorAll('[role="radio"]')) : [];
    n.card = { role: card && card.getAttribute('role'), words: radios.map((b) => b.dataset.titlebar + ':' + b.getAttribute('aria-checked')) };
    s2.sent.length = 0;
    const col = radios.find((b) => b.dataset.titlebar === 'colors');
    if (col) { col.click(); col.click(); }
    n.sent = s2.sent.slice();
    r.devCard = n.bogus === 0 && n.card.role === 'radiogroup' && JSON.stringify(n.offCard) === JSON.stringify(['off:true', 'maui:false', 'colors:false'])
      && JSON.stringify(n.card.words) === JSON.stringify(['off:false', 'maui:true', 'colors:false'])
      && JSON.stringify(n.sent) === JSON.stringify(['ixian:devflash:titlebar:colors']);
    r.noErr = K.noErr(s2.errs);
  } catch (e) { r.threw = e.message; }
  finally { for (const x of [s, s2]) if (x) x.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1400));
  c('pair', '★ DT-1 B: every DtTitleBarRules colour equals its tokens.css chain resolved on the built shell, light and dark (--surface-screen · --text-neutral-01 / -02 · --surface-interactive-hover / -pressed)');
  c('wire', '★ DT-1 B: the wiring — CreateWindow → onCreateWindow (#if WINDOWS) · the window mapper → attach · loadTheme → apply AFTER the appearance is stored (#if WINDOWS, once) · SpixiFlags → wayThatActs · DevPage routes titlebar BEFORE the generic devflash, dev mode AND the exact word, stores the PARSED way, echoes · the push sends the STORED word on Windows only and onLoad calls it · way 2 = AppWindow.TitleBar.ExtendsContentIntoTitleBar false + MAUI\'s band hidden · caption colours only from captionColours (all 12 names handled) · Windows 10 → effectiveWay · re-apply on UISettings colour changes · no root paint (#1276) · every log line a fixed form (type names only)');
  c('devCard', '★ DT-1 B: the dev card (built dev.html) — an unknown word mounts nothing; "off" (★ #1392 the default) mounts a radiogroup of three, off first and checked; "maui" moves the check; a tap on colors sends ixian:devflash:titlebar:colors once');
  c('noErr', '★ DT-1 B: no page error (dev.html)');
}
