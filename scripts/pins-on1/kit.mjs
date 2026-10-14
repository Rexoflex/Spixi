/* ==== ON-1 (#1420–#1422) — the shared kit for the pins-on1 modules. Not a pin module. ====
 * boot(): the BUILT intro.html in jsdom with a phone or a desktop user agent (the launch shell's own data-desktop
 * sniff runs at parse), C# pushes via executeUiCommand, outgoing ixian: commands captured at the Location href
 * setter (the pins-s9/b2-kit.mjs model).
 * cascade(): jsdom's getComputedStyle does the cascade but IGNORES @media — this reads the BUILT sheets through
 * the CSSOM for one element + property at a given window width (min/max-width, prefers-reduced-motion), picks
 * the winner by !important → specificity → order, and resolves var() through the element's custom properties.
 * Colour maths: WCAG 2.1 relative luminance over alpha-composited layers. */
import { createHash } from 'node:crypto';

/* ★ #46 r2 (m2) → r3 → ★ r4 (MINOR-2): the SOURCES that shape the ring geometry the d-look pin replays
   (ring-geometry.json). r3 hashed the whole built page + bundle, which went stale on almost every build (any other
   owner's component lands in the bundle). Now: only the launch inputs — the launch component, its sheets, the
   shared sheets the launch views draw with (base / button / topbar / avatar / lock-shell for the password eye), the
   launch font files, the tokens launch block, and the en-us values of the string keys launch-shell.js reads (the
   fixture is captured in English). Per-input hashes, so a stale message can NAME what changed. CRLF-normalised. */
export const RING_INPUTS = [
  'src/components/launch-shell.js', 'src/styles/components/launch-form.css', 'src/styles/components/launch-shell.css',
  'src/styles/launch-font.css', 'src/shells/launch.html', 'src/styles/base.css', 'src/styles/components/button.css',
  'src/styles/components/topbar.css', 'src/styles/components/avatar.css', 'src/styles/components/lock-shell.css',
  'src/assets/fonts/sora-latin-wght-normal.woff2', 'src/assets/fonts/sora-latin-ext-wght-normal.woff2',
];
export function ringInputHashes(readFileSync, join, root) {
  const out = {};
  const hash = (x) => createHash('sha256').update(x).digest('hex').slice(0, 12);
  for (const p of RING_INPUTS) {
    let body;
    try { body = /\.woff2$/.test(p) ? readFileSync(join(root, p)) : String(readFileSync(join(root, p), 'utf8')).replace(/\r\n/g, '\n'); }
    catch (e) { body = 'MISSING'; }
    out[p] = hash(body);
  }
  const tok = String(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8')).replace(/\r\n/g, '\n');
  const a = tok.indexOf('--gradient-launch-form:'), b = tok.indexOf('--launch-ring-stroke:');
  out['tokens.css (launch block)'] = hash(a >= 0 && b > a ? tok.slice(a, tok.indexOf('\n', b)) : 'MISSING');
  const ls = String(readFileSync(join(root, 'src/components/launch-shell.js'), 'utf8'));
  const keys = [...new Set([...ls.matchAll(/strings\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
  let en = {}; try { en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8')); } catch (e) {}
  out['en-us strings (launch keys)'] = hash(keys.map((k) => k + '=' + (en[k] == null ? '' : en[k])).join('\n'));
  return out;
}
export function ringInputsHash(readFileSync, join, root) {
  const all = ringInputHashes(readFileSync, join, root);
  return createHash('sha256').update(Object.keys(all).sort().map((k) => k + ':' + all[k]).join('\n')).digest('hex').slice(0, 16);
}

export const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
export const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
export const ANDROID_TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export function on1Kit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async ({ ua = 'phone', query = '', wait = 1400, reduce = false, html = null } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html/intro.html');
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(html != null ? html : readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + f + (query ? '?' + query : ''), virtualConsole: vc,
      beforeParse(w) {
        const agent = ua === 'phone' ? PHONE_UA : ua === 'desktop' ? DESKTOP_UA : String(ua);   // or a raw UA (a tablet)
        try { Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => agent }); } catch (e) {}
        w.matchMedia = (q) => ({ matches: !!reduce && /prefers-reduced-motion:\s*reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const shell = d.querySelector('.c-launch');
    const typeIn = (el, v) => { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); };
    const close = () => { try { W.close(); } catch (e) {} };
    return { dom, W, d, push, errs, sent, shell, typeIn, close };
  };

  /* —— the media-aware cascade —— */
  const splitSel = (t) => { const out = []; let depth = 0, cur = ''; for (const ch of t) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const specificity = (sel) => {
    let s = sel.replace(/::?(before|after)\b/g, ' ');
    let a = 0, b = 0, c = 0;
    s = s.replace(/:(?:not|is|where)\(([^()]*)\)/g, (m, inner) => { const [x, y, z] = specificity(inner); a += x; b += y; c += z; return ' '; });
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?/g) || []).length;
    c += (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?/g, ' ').match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
    return [a, b, c];
  };
  const cmpSpec = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);
  const mediaHolds = (text, { width, height = 844, reduce }) => String(text).split(',').some((q) => q.split(/\band\b/).every((part) => {
    const p = part.trim();
    if (!p || p === 'all' || p === 'screen') return true;
    let m;
    if ((m = /\(\s*min-width:\s*(\d+)px\s*\)/.exec(p))) return width >= +m[1];
    if ((m = /\(\s*max-width:\s*(\d+)px\s*\)/.exec(p))) return width <= +m[1];
    if ((m = /\(\s*min-height:\s*(\d+)px\s*\)/.exec(p))) return height >= +m[1];
    if ((m = /\(\s*max-height:\s*(\d+)px\s*\)/.exec(p))) return height <= +m[1];
    if (/prefers-reduced-motion:\s*reduce/.test(p)) return !!reduce;
    return false;
  }));
  const cascade = (W, el, prop, { width = 390, height = 844, reduce = false, pseudo = '' } = {}) => {
    let best = null, order = 0;
    const visit = (rules) => {
      for (const r of rules) {
        if (r.type === 4) { if (mediaHolds(r.media.mediaText, { width, height, reduce })) visit(r.cssRules); continue; }
        if (r.type !== 1) continue;
        order++;
        const v = r.style.getPropertyValue(prop);
        if (!v) continue;
        const imp = r.style.getPropertyPriority(prop) === 'important';
        for (const sel of splitSel(r.selectorText)) {
          const hasPseudo = /::?(before|after)\b/.test(sel);
          if (pseudo ? !sel.endsWith(pseudo) : hasPseudo) continue;
          const bare = pseudo ? sel.slice(0, -pseudo.length) : sel;
          let hit = false; try { hit = el.matches(bare); } catch (e) { hit = false; }
          if (!hit) continue;
          const spec = specificity(sel);
          if (!best || (imp && !best.imp) || (imp === best.imp && (cmpSpec(spec, best.spec) > 0 || (cmpSpec(spec, best.spec) === 0 && order >= best.order)))) best = { v, imp, spec, order, sel };
        }
      }
    };
    for (const sh of W.document.styleSheets) { try { visit(sh.cssRules); } catch (e) {} }
    return best ? resolve(W, el, best.v) : '';
  };
  const resolve = (W, el, v, depth = 0) => {
    if (depth > 16) return v;
    return String(v).replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, name, fb) => {
      const got = W.getComputedStyle(el).getPropertyValue(name).trim();
      return resolve(W, el, got || (fb || '').trim(), depth + 1);
    });
  };
  const computed = (W, el, prop) => resolve(W, el, W.getComputedStyle(el).getPropertyValue(prop));

  /* —— colour —— */
  const parseColor = (s) => {
    s = String(s || '').trim();
    let m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
    if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
    if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s))) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
    return null;
  };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /* the backdrop points a gradient can paint: each linear stop, alone and under each radial's centre colour */
  const gradientPoints = (g) => {
    const layers = []; let depth = 0, cur = '';
    for (const ch of String(g)) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { layers.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) layers.push(cur.trim());
    const colorsIn = (l) => (l.match(/#[0-9a-f]{6}\b|rgba?\([^)]*\)/gi) || []).map(parseColor).filter(Boolean);
    const radials = layers.filter((l) => /^radial-gradient/.test(l)).map((l) => colorsIn(l)[0]).filter(Boolean);
    const stops = layers.filter((l) => /^linear-gradient/.test(l)).flatMap(colorsIn);
    const pts = [];
    for (const s of stops) { pts.push(s); for (const r of radials) pts.push(over(r, s)); }   // the radials sit at different places — each one alone over each stop (a conservative set)
    return pts;
  };
  return { boot, b64, cascade, computed, resolve, parseColor, over, contrast, gradientPoints, specificity };
}
