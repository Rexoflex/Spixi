/* ==== fixb4 item 6 — the Developer log keeps a floor: it can no longer be squeezed to half a row ====
 * What this pins, on the BUILT dev.html (Spixi/Resources/Raw/html/dev.html): (1) its CSS (the inlined settings-app.css, comments stripped) carries
 * `min-height: 60vh` on the `.c-settings-dev__log.u-scroll` rule and no `min-height: 0` there, with `flex: 1 1 auto` kept (it still fills the body when there
 * is room); (2) in jsdom, after the pushes C# makes (setCaps, a few cards, setLog), the element with that class is still the `<pre class="… u-scroll">`, a direct
 * child of `.c-settings__body`, AFTER the cards, with the cascade's computed min-height = 60vh (jsdom's own cascade, no @media in this rule).
 * LIMITS (#1735): jsdom has NO layout and a rule check reads text. This proves the floor is DECLARED on the right rule and wins the cascade; it does NOT
 * prove the log really shows ≥ 15 rows on a phone or a desktop window — that is the Chromium script `scripts/pins-fixb4/d-devlog-render.mjs` (by hand, base vs
 * new, Android 412 × 915 and 360 × 640, Windows 1280 × 800, light and dark). A different rule that happened to carry the same text would fool (1); (2) is what
 * ties the rule to the live element.
 * Deliberate breaks (fixb4 report): ① put `min-height: 0` back on the rule → (1) and (2) fail; ② move the floor to another selector → (1) fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep, stripCssComments } = h;
  const f = join(root, 'Spixi/Resources/Raw/html/dev.html');
  const html = readFileSync(f, 'utf8');

  /* (1) the rule text, comments stripped */
  const css = stripCssComments(html);
  const rules = [...css.matchAll(/\.c-settings-dev__log\.u-scroll\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const decl = (body, p) => { const m = new RegExp('(?:^|[;\\s])' + p + '\\s*:\\s*([^;]+?)\\s*(?:;|$)').exec(body); return m ? m[1] : null; };
  ok(rules.length === 1 && decl(rules[0], 'min-height') === '60vh' && decl(rules[0], 'flex') === '1 1 auto',
    '★ fixb4 item 6: the built dev.html\'s `.c-settings-dev__log.u-scroll` rule (one rule) declares min-height: 60vh and keeps flex: 1 1 auto — ' + JSON.stringify(rules.map((r) => [decl(r, 'min-height'), decl(r, 'flex')])));

  /* (2) the live element */
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
    beforeParse(w) {
      const agent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
      try { Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => agent }); } catch (e) { /* */ }
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) { /* */ }
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    },
  });
  try {
    await sleep(1400);
    const W = dom.window, d = W.document;
    const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    push('setCaps', 'sendlog'); push('setFlashDev', '1,1,1'); push('setContainerDev', 'clip'); push('setFlagsDev', '1,1,1,1');
    push('setLog', Array.from({ length: 50 }, (_, i) => 'line ' + (i + 1)).join('\n'));
    await sleep(200);
    const logs = d.querySelectorAll('.c-settings-dev__log');
    const log = logs[0];
    const body = d.querySelector('.c-settings__body');
    const kids = body ? [...body.children] : [];
    const idx = log ? kids.indexOf(log) : -1;
    const cardsBefore = kids.slice(0, Math.max(idx, 0)).filter((c) => /c-dev-flash|c-dev-container|c-settings__card/.test(c.className)).length;
    const cs = log ? W.getComputedStyle(log) : null;
    ok(logs.length === 1 && log.tagName === 'PRE' && log.classList.contains('u-scroll') && idx > 0 && cardsBefore >= 1 && cs && cs.minHeight === '60vh',
      '★ fixb4 item 6: the log is still the one <pre class="c-settings-dev__log u-scroll"> in .c-settings__body, after the switch cards, and its cascaded min-height is 60vh — ' + JSON.stringify({ n: logs.length, tag: log && log.tagName, idx, cardsBefore, minHeight: cs && cs.minHeight, flex: cs && cs.flex }));
    ok(errs.length === 0, '★ fixb4 d-devlog: no page error — ' + JSON.stringify(errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ fixb4 d-devlog threw: ' + (e && e.stack || e));
  } finally { try { dom.window.close(); } catch (e) { /* */ } }
}
