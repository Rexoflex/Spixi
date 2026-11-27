/* ==== imgurl item 2: the trim hook (ImgurlFlags.TrimHook, P115; ruling #1738 (3)). The pure rule runs in csh (LifeTests.cs).
 * Items 3 (the renderer-death handler) and 4 (the Windows page store) left this batch by #1972: d6 holds that nothing of them is
 * left in Spixi/**.
 * SOURCE PIN (#1735) — LIMITS: MainApplication.cs and SpixiContentPage.Life.cs are MAUI-bound and UNCOMPILED here (Android by
 * nobody before Damir's build). The keys hold the comment-stripped TEXT with whitespace collapsed, not bindings: a shadow type
 * named ImgurlFlags, an alias, a `#define`, a csproj `Compile Remove` or reflection is not seen (the diff review and the build hold
 * those). d6 is a list of names: code of items 3 / 4 under another name is not seen. What Android does at a trim level is the
 * platform's; the walk proves it.
 *   d1 trim base first — MainApplication.OnTrimMemory: the first statement is `base.OnTrimMemory(level);`.
 *   d2 trim switch     — `bool on = SPIXI.ImgurlFlags.TrimHook; if (!on) return;` right after base, and only then the one
 *                        `lifeTrim((int)level, on)` call of Spixi/**; the body names no `onLowMemory`.
 *   d3 trim dev only   — every `[TRIM]` line (SpixiContentPage.lifeTrim) sits inside `#if SPIXI_DEV_COEXIST … #endif`; OnTrimMemory
 *                        has no Logging call and no `#if`; `chrome://crash` is named nowhere in Spixi/**.cs (the old test door of
 *                        item 3 is gone).
 *   d4 no path logged  — every Logging call of SpixiContentPage.Life.cs takes TrimRules.line(…).
 *   d5 harness         — csh.csproj compiles the REAL TrimRules.cs; LifeTests.cs holds ≥ 6 tests.
 *   d6 items 3 + 4 out — none of `RendererGone`, `WinStoreFolder`, `WebViewStore`, `WebViewLife`, `OnRenderProcessGone`,
 *                        `ProcessFailed`, `webViewWebContentProcessDidTerminate`, `WEBVIEW2_USER_DATA_FOLDER`, `lifeGone`,
 *                        `lifeRebuild` is named in the comment-stripped Spixi/**.cs or in Spixi.csproj / csh.csproj.
 * DELIBERATE BREAKS (#802; each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-imgurl/d-life`; each gives
 * `RESULT pass=5 fail=1` with only its own row red, except d1 (d1 + d2 red: d2's gate starts with the base call) and d4 (d3 + d4
 * red: d3 wants the exact line call)):
 *   d1 `base.OnTrimMemory(level);` → `;` · d2 `if (!on) return;` → `if (on) return;` · d3 the `#if SPIXI_DEV_COEXIST` / `#endif`
 *   around lifeTrim's `[TRIM]` line deleted · d4 (inside the `#if`) `TrimRules.line(level, dropped)` →
 *   `TrimRules.line(level, dropped) + spareChatOp` · d5 the TrimRules.cs `Compile Include` deleted · d6 a line
 *   `public override bool OnRenderProcessGone(AWebView? view, RenderProcessGoneDetail? detail) => false;` added to
 *   WebViewRenderer.cs. */

const MAIN_F = 'Spixi/Platforms/Android/MainApplication.cs';
const LIFE_F = 'Spixi/Utils/SpixiContentPage.Life.cs';

const norm = (t) => t.replace(/\s+/g, ' ').trim();
const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return '';
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return t.slice(o, k + 1);
  }
  return '';
};
const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length));

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^\uFEFF/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => t.split(s).length - 1;
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const all = csFiles.map((f) => [f, rd(f)]);
  const across = (s) => all.reduce((n, [, t]) => n + count(t, s), 0);
  const filesWith = (s) => all.filter(([, t]) => t.includes(s)).map(([f]) => f);

  /* d1 · d2 · d3 — the trim hook */
  const trim = bodyOf(rd(MAIN_F), 'public override void OnTrimMemory([GeneratedEnum] Android.Content.TrimMemory level)');
  const T = norm(trim);
  ok(T.startsWith('{ base.OnTrimMemory(level);'), 'imgurl d1: OnTrimMemory calls base first (the MAUI lifecycle lambda keeps running)');
  const gate = '{ base.OnTrimMemory(level); bool on = SPIXI.ImgurlFlags.TrimHook; if (!on) return;';
  const callAt = T.indexOf('SPIXI.SpixiContentPage.lifeTrim((int)level, on)');
  ok(T.startsWith(gate) && callAt > gate.length && across('lifeTrim(') === 2 && !T.includes('onLowMemory'),
    'imgurl d2: the trim drop runs only with TrimHook ON (read once, `if (!on) return;` right after base, before the one lifeTrim call); no Node.onLowMemory from the new levels');
  const devOf = (t) => [...t.matchAll(/#if SPIXI_DEV_COEXIST([\s\S]*?)#endif/g)].map((m) => m[1]).join('\n');
  const outOf = (t) => t.replace(/#if SPIXI_DEV_COEXIST[\s\S]*?#endif/g, '');
  const lifeTrim = bodyOf(rd(LIFE_F), 'internal static int lifeTrim(int level, bool flagOn)');
  ok(lifeTrim !== '' && devOf(lifeTrim).includes('Logging.info(TrimRules.line(level, dropped));') && !outOf(lifeTrim).includes('TrimRules.line(') && !outOf(lifeTrim).includes('Logging.')
    && !T.includes('Logging.') && !T.includes('#if') && filesWith('chrome://').length === 0,
    'imgurl d3: the [TRIM] line is dev-build only (inside #if SPIXI_DEV_COEXIST); OnTrimMemory logs nothing; chrome:// is named nowhere in Spixi/**.cs');

  /* d4 — no path, no URL, no content in a log line */
  const bad = [...norm(rd(LIFE_F)).matchAll(/Logging\.(?:info|warn|error)\((.*?)\);/g)].map((m) => m[1]).filter((a) => a !== 'TrimRules.line(level, dropped)');
  ok(bad.length === 0 && count(norm(rd(LIFE_F)), 'Logging.') === 1, 'imgurl d4: the one log call of SpixiContentPage.Life.cs is TrimRules.line(level, dropped)' + (bad.length ? ' — ' + bad.join(' | ') : ''));

  /* d5 — the harness runs the real rule */
  const csproj = raw('scripts/csh/csh.csproj');
  const tests = count(raw('scripts/csh/LifeTests.cs'), '[TestMethod]');
  ok(csproj.includes('<Compile Include="../../Spixi/Utils/TrimRules.cs" />') && tests >= 6,
    'imgurl d5: csh compiles the REAL TrimRules.cs; LifeTests.cs holds ' + tests + ' tests (≥ 6)');

  /* d6 — nothing of items 3 and 4 is left (#1972) */
  const gone = ['RendererGone', 'WinStoreFolder', 'WebViewStore', 'WebViewLife', 'OnRenderProcessGone', 'ProcessFailed', 'webViewWebContentProcessDidTerminate', 'WEBVIEW2_USER_DATA_FOLDER', 'lifeGone', 'lifeRebuild'];
  const projText = raw('Spixi/Spixi.csproj') + raw('scripts/csh/csh.csproj');
  const left = gone.filter((n) => filesWith(n).length > 0 || projText.includes(n)).map((n) => n + ' @ ' + (filesWith(n).join(',') || 'csproj'));
  ok(left.length === 0, 'imgurl d6: nothing of items 3 (the renderer-death handler) and 4 (the Windows page store) is left in Spixi/**.cs or the two csproj files (#1972)' + (left.length ? ' — ' + left.join(' | ') : ''));
}
