/* ==== DT-1 B → #1392 → ★ #1395 (S20, re-based by S20 S) — THE WINDOWS TITLE BAR IS THE WINDOWS LOOK ONLY ====
 * The two token-coloured ways (`maui`, `colors`) failed the DT-1 walk (#1391) and are DELETED with their dev verb, push,
 * Developer card, palette, log lines and 4 strings. The C# cannot run here (net10.0-windows); DtTitleBarRules is executed
 * in the C# harness (scripts/csh/DtTitleBarTests.cs: it holds the caption "Spixi" and nothing else). This module:
 *   · the WIRING (raw source, comments stripped): App.CreateWindow calls DtTitleBar.onCreateWindow under #if WINDOWS, and
 *     DtTitleBar.cs only sets window.Title = DtTitleBarRules.Title (no MAUI TitleBar, no AppWindow colours, no content
 *     extension, no UISettings, no root paint #1276; its one log line a type name);
 *   · NOTHING ELSE IS LEFT: no attach in the Windows window mapper, no apply in ThemeManager, no way in SpixiFlags, no
 *     `ixian:devflash:titlebar:` branch or setTitleBarDev push in DevPage — and no C# file reads the old preference
 *     `devTitleBarWay`, so a value a DT-1 build stored (Damir's PC: `colors`) acts as nothing → the Windows look;
 *   · the DEV SHELL (built dev.html, jsdom): no setTitleBarDev handler; an old push mounts no card; no control sends the
 *     old verb; the 4 strings are gone from the built shell.
 * Deliberate breaks (S20 S report): the ThemeManager apply call put back → `left` fails; window.Title set from a
 * hard-coded "Spixi IM" in DtTitleBar → `wire` fails; the setTitleBarDev handler put back in dev.html → `devShell` fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCode, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  let s2 = null;
  try {
    /* —— the wiring —— */
    const app = stripCode(rd('Spixi/App.xaml.cs'));
    const dt = stripCode(rd('Spixi/Platforms/Windows/DtTitleBar.cs'));
    const rules = stripCode(rd('Spixi/Utils/DtTitleBarRules.cs'));
    n.wire = {
      create: /protected override Window CreateWindow[\s\S]*?#if WINDOWS\s*SPIXI\.DtTitleBar\.onCreateWindow\(window\);\s*#endif/.test(app),
      title: /public const string Title = "Spixi";/.test(rules),
      onlyTitle: /public static void onCreateWindow\(Microsoft\.Maui\.Controls\.Window window\)\s*\{\s*try\s*\{\s*window\.Title = DtTitleBarRules\.Title;\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\("\[DT\] titlebar create failed: " \+ ex\.GetType\(\)\.Name\);\s*\}\s*\}/.test(dt)
        && (dt.match(/public static void/g) || []).length === 1,
      nothingPainted: !/TitleBar\(\)|AppWindow|ExtendsContentIntoTitleBar|UISettings|BackgroundColor|ForegroundColor|\.Background\s*=|WindowRootViewContainer|applyWindowGround|SystemBackdrop/.test(dt),
    };
    r.wire = Object.values(n.wire).every((v) => v === true);

    /* —— nothing else is left (every C# file under Spixi/, comments stripped) —— */
    const csFiles = [];
    const walk = (dir) => {
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        const p = dir + '/' + e.name;
        if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); }
        else if (e.name.endsWith('.cs')) csFiles.push(p);
      }
    };
    walk('Spixi');
    const offenders = [];
    for (const p of csFiles) {
      const src = stripCode(rd(p));
      if (/devTitleBarWay|DtTitleBarWay|WayMaui|WayColors|devflash:titlebar|setTitleBarDev|DtTitleBar\.(apply|attach)\b/.test(src)) offenders.push(p);
      if (p !== 'Spixi/App.xaml.cs' && p !== 'Spixi/Platforms/Windows/DtTitleBar.cs' && /\bDtTitleBar\./.test(src)) offenders.push(p + ' (DtTitleBar call)');
    }
    n.left = { files: csFiles.length, offenders };
    r.left = csFiles.length > 100 && offenders.length === 0;

    /* —— the dev shell (built dev.html) —— */
    const built = rd('Spixi/Resources/Raw/html/dev.html');
    n.strings = ['devTitleBarTitle', 'devTitleBarOff', 'devTitleBarMaui', 'devTitleBarColors'].filter((k) => built.includes(k));
    s2 = await K.boot('dev.html', { desktop: true, wait: 900 });
    const d2 = s2.d;
    n.handler = typeof s2.W.setTitleBarDev;
    try { s2.push('setTitleBarDev', 'off'); } catch (e) { /* an unknown push is the dispatcher's "not a function" */ }
    s2.push('setFlagsDev', '1,1,1,1');
    await sleep(60);
    n.card = d2.querySelectorAll('.c-dev-titlebar, [data-titlebar]').length;
    s2.sent.length = 0;
    d2.querySelectorAll('button, [role="switch"], [role="radio"]').forEach((b) => { try { b.click(); } catch (e) {} });
    await sleep(60);
    n.verb = s2.sent.filter((v) => /^ixian:devflash:titlebar:/.test(v));
    r.devShell = n.handler === 'undefined' && n.card === 0 && n.verb.length === 0 && n.strings.length === 0
      && !/setTitleBarDev|devflash:titlebar|c-dev-titlebar/.test(built);
    r.noErr = K.noErr(s2.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s2) s2.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1400));
  c('wire', '★ #1395: the Windows title bar = the Windows look — CreateWindow → DtTitleBar.onCreateWindow (#if WINDOWS), which only sets window.Title = DtTitleBarRules.Title ("Spixi"); no MAUI TitleBar, no AppWindow colours, no extension, no UISettings, no root paint (#1276); its log line a type name');
  c('left', '★ #1395: the way switch is gone from every C# file — no attach / apply call, no SpixiFlags way, no devflash:titlebar branch, no setTitleBarDev push, no reader of the old `devTitleBarWay` preference (a stored DT-1 value acts as nothing → the Windows look)');
  c('devShell', '★ #1395: the built dev.html has no title bar card — no setTitleBarDev handler (an old push mounts nothing), no control sends ixian:devflash:titlebar:, the 4 devTitleBar* strings are gone');
  c('noErr', '★ #1395: no page error (dev.html)');
}
