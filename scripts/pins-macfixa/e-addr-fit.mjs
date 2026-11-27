/* ==== macfixa item 5 (#1358, walk row S17-AD-CARD) — the "Your Ixian address" dialog fits a desktop window ====
 * BUILT-CSS PIN — LIMITS FIRST: jsdom does not lay out, and its getComputedStyle neither keeps `min()` with `dvh` (width reads
 * `auto`) nor honours the `:root[data-desktop]` scope reliably, so no key reads a box or a cascaded value. The keys read the
 * comment-stripped <style> text of the BUILT shells that open the sheet (settings = Account, index = Wallet › Receive,
 * contact_details = a contact), work out the CASCADE by hand for the few rules that can reach the desktop dialog (specificity,
 * then source order; top level only; an @media / @supports rule, !important or an inline style is not modelled), and EVALUATE
 * the winning expressions at window heights (min / max / calc / var / % / dvh / vw / px; % = the viewport, the dialog's
 * containing block, #589). What the boxes do with them in Blink is measured by the by-hand render
 * scripts/pins-macfixa/e-addr-fit-render.mjs (the numbers are the proof); WKWebView and WebView2 are not run anywhere.
 *   e1 cap    — the winning desktop max-height of the address dialog is `calc(100% - 2 * var(--spacing-16))` (it beats the shared
 *               centred cap of overlay.css, which stops at 608 px): 768 at H 800, 636 at 668, 328 at 360; the dialog still clips
 *               (overflow-y hidden) and the region is the one scroller (flex 1 1 auto, min-height 0, max-height none).
 *   e2 code   — on desktop the code is min(its base width `min(216px, 40dvh, 62vw, 100%)`, its max-width): with a name (Account,
 *               [data-who]) `max(185px, 100dvh - 484px)`: 216 at H 800, 185 at 668 and 640; without (Wallet › Receive)
 *               `max(185px, 100dvh - 405px)`: 216 at 668 and 640, 185 at 560. The max-width never goes under the 185 px scan
 *               floor (#509) at any height 300…1600 (the base 40dvh term below 463 px is not this fix's).
 *   e3 phone  — on a phone the dialog cap, the region and the code keep the base rules (`calc(100% - var(--safe-top, 0px) -
 *               var(--kb-inset, 0px))`, `max-height: none`, `min(216px, 40dvh, 62vw, 100%)`) and no max-width reaches the code.
 *   e4 shells — each of the three shells carries the three desktop rules exactly once.
 * DELIBERATE BREAKS (#802; one token each of src/styles/components/wallet-receive.css in a full copy + build-shells,
 * `node scripts/run-pins.mjs --root <copy> pins-macfixa/e-addr-fit`): `var(--spacing-16)` → `var(--spacing-8)` in the cap → e1;
 * `.c-sheet.c-sheet--addr { max-height` → `.c-sheet--addr { max-height` (0,3,0 loses to the shared 0,4,0 cap) → e1 (+ e4, its
 * text is gone); `100dvh - 484px` → `100dvh - 300px` → e2; `max(185px` → `max(144px` in the Wallet rule → e2; the `[data-who]` code rule's `:root[data-desktop] ` dropped (it reaches
 * the phone) → e3 (+ e2: it loses on desktop; + e4); the cap rule written twice → e4. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const vars = {};
  for (const m of readFileSync(join(dir, 'spixi.tokens.css'), 'utf8').matchAll(/(--spacing-\d+):\s*(\d+)px/g)) vars[m[1]] = Number(m[2]);
  /* a length expression at a W × H window */
  const ev = (expr, H, W = 1280) => {
    const t = String(expr).replace(/var\((--[\w-]+)\)/g, (m, n) => (n in vars ? vars[n] + 'px' : 'NaN'))
      .match(/min\(|max\(|calc\(|\(|\)|,|[+\-*/]|[\d.]+(?:%|px|dvh|vw)?|NaN/g);
    if (!t) return NaN;
    let i = 0;
    const num = (s) => (/%|dvh$/.test(s) ? parseFloat(s) / 100 * H : s.endsWith('vw') ? parseFloat(s) / 100 * W : parseFloat(s));
    const list = () => { const a = [sum()]; while (t[i] === ',') { i++; a.push(sum()); } return a; };
    const atom = () => {
      const s = t[i++];
      if (s === 'min(') { const a = list(); i++; return Math.min(...a); }
      if (s === 'max(') { const a = list(); i++; return Math.max(...a); }
      if (s === 'calc(' || s === '(') { const v = sum(); i++; return v; }
      return num(s);
    };
    const prod = () => { let v = atom(); while (t[i] === '*' || t[i] === '/') { const o = t[i++]; const r = atom(); v = o === '*' ? v * r : v / r; } return v; };
    const sum = () => { let v = prod(); while (t[i] === '+' || t[i] === '-') { const o = t[i++]; const r = prod(); v = o === '+' ? v + r : v - r; } return v; };
    const v = sum();
    return i === t.length ? v : NaN;
  };
  /* every rule in source order: { sel, body, top } (top = not inside an at-rule) */
  const rules = (css) => {
    const out = []; const stack = []; let buf = '';
    for (const c of css) {
      if (c === '{') { stack.push(buf.trim()); buf = ''; }
      else if (c === '}') { out.push({ sel: (stack[stack.length - 1] || '').replace(/\s+/g, ' '), body: buf.trim(), top: stack.length === 1 }); stack.pop(); buf = ''; }
      else if (c === ';' && stack.length === 0) buf = '';
      else buf += c;
    }
    return out;
  };
  const decl = (r, p) => { const m = new RegExp('(?:^|;)\\s*' + p + ':\\s*([^;]+)').exec(r.body); return m ? m[1].trim() : null; };
  /* specificity of one selector: [ids, classes + attributes + pseudo-classes (a :not() counts its argument), types] */
  const spec = (s) => {
    const x = s.replace(/:not\(([^)]*)\)/g, ' $1');
    const ids = (x.match(/#[\w-]+/g) || []).length;
    const cls = (x.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
    const types = (x.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return ids * 1e6 + cls * 1e3 + types;
  };
  const DESK = /^:root\[data-desktop\] /;
  /* the winning top-level declaration of `prop` among the selectors that reach the element on desktop / on a phone */
  const win = (rs, prop, reaches) => {
    let best = null;
    rs.forEach((r, i) => {
      if (!r.top) return;
      const v = decl(r, prop);
      if (v == null) return;
      for (const s of r.sel.split(',').map((x) => x.trim())) {
        if (!reaches(s)) continue;
        const k = spec(s);
        if (!best || k > best.k || (k === best.k && i > best.i)) best = { k, i, v, s };
      }
    });
    return best;
  };
  const onDesk = (s) => !/:not\(\[data-desktop\]\)/.test(s) && !/\[data-landscape-rail\]/.test(s);   // unscoped rules reach the desktop too
  const onPhone = (s) => !/\[data-desktop\]/.test(s.replace(/:not\(\[data-desktop\]\)/g, '')) && !/\[data-landscape-rail\]/.test(s);
  /* the selectors that can reach each element: the last compound names it, every compound before it is a root scope
     (or, for the code, the card / [data-who]); a rule with any other ancestor is not modelled */
  const split = (s) => { const p = s.trim().split(/\s+/); return [p.pop(), p]; };
  const rootOnly = (p) => p.every((x) => /^(html)?:root/.test(x));
  const dialog = (s) => { const [l, p] = split(s); return /\.c-sheet/.test(l) && /^(\.c-sheet|\.c-sheet--addr|:not\(\[data-dt-anchor\]\)|\[data-open\])+$/.test(l) && rootOnly(p); };
  const region = (s) => { const [l, p] = split(s); return /^\.c-addr-sheet(\.u-scroll)?$/.test(l) && rootOnly(p); };
  const code = (who) => (s) => {
    const [l, p] = split(s);
    return /^\.c-(addr-sheet|wallet-receive)__qrcard$/.test(l) && p.every((x) => /^(html)?:root|^\.c-addr-sheet(__card)?$/.test(x) || (who && x === '[data-who]'));
  };
  const and = (a, b) => (s) => a(s) && b(s);

  const per = {};
  for (const f of ['settings.html', 'index.html', 'contact_details.html']) {
    const css = stripCssComments([...readFileSync(join(dir, f), 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n'));
    const rs = rules(css);
    per[f] = {
      cap: win(rs, 'max-height', and(onDesk, dialog)), clip: win(rs, 'overflow-y', and(onDesk, dialog)),
      rMax: win(rs, 'max-height', and(onDesk, region)), rMin: win(rs, 'min-height', and(onDesk, region)), rFlex: win(rs, 'flex', and(onDesk, region)),
      codeId: win(rs, 'width', and(onDesk, code(true))), codeAnon: win(rs, 'width', and(onDesk, code(false))),
      maxId: win(rs, 'max-width', and(onDesk, code(true))), maxAnon: win(rs, 'max-width', and(onDesk, code(false))),
      pCap: win(rs, 'max-height', and(onPhone, dialog)), pMax: win(rs, 'max-height', and(onPhone, region)),
      pCode: win(rs, 'width', and(onPhone, code(true))), pCodeAnon: win(rs, 'width', and(onPhone, code(false))),
      pMaxW: win(rs, 'max-width', and(onPhone, code(true))) || win(rs, 'max-width', and(onPhone, code(false))),
      once: [':root[data-desktop] .c-sheet.c-sheet--addr {', ':root[data-desktop] .c-addr-sheet__qrcard {', ':root[data-desktop] [data-who] .c-addr-sheet__qrcard {']
        .map((r) => css.replace(/\s+/g, ' ').split(r).length - 1),
    };
  }
  const v = (b) => (b ? b.v : null);
  const near = (a, b) => Math.abs(a - b) <= 0.5;
  const all = (fn) => Object.values(per).every(fn);
  const show = (keys) => JSON.stringify(Object.fromEntries(Object.entries(per).map(([f, p]) => [f, Object.fromEntries(keys.map((k) => [k, Array.isArray(p[k]) ? p[k] : p[k] && p[k].s + ' → ' + p[k].v]))])));

  ok(all((p) => v(p.cap) === 'calc(100% - 2 * var(--spacing-16))' && near(ev(v(p.cap), 800), 768) && near(ev(v(p.cap), 668), 636) && near(ev(v(p.cap), 360), 328)
    && v(p.clip) === 'hidden' && v(p.rMax) === 'none' && v(p.rMin) === '0' && v(p.rFlex) === '1 1 auto'),
  'macfixa e1: the desktop address dialog may use the window minus two 16 px margins (768 at H 800, 636 at 668, 328 at 360), still clips, and the region is the one scroller — ' + show(['cap', 'clip', 'rMax', 'rMin', 'rFlex']));

  const size = (p, who, H) => Math.min(ev(v(p[who ? 'codeId' : 'codeAnon']), H), ev(v(p[who ? 'maxId' : 'maxAnon']), H));
  const floor = (p) => { for (let H = 300; H <= 1600; H += 4) if (!(ev(v(p.maxId), H) >= 185 && ev(v(p.maxAnon), H) >= 185)) return false; return true; };
  ok(all((p) => v(p.codeId) === 'min(216px, 40dvh, 62vw, 100%)' && v(p.codeAnon) === v(p.codeId)
    && v(p.maxId) === 'max(185px, 100dvh - 484px)' && v(p.maxAnon) === 'max(185px, 100dvh - 405px)' && floor(p)
    && near(size(p, true, 800), 216) && near(size(p, true, 668), 185) && near(size(p, true, 640), 185)
    && near(size(p, false, 668), 216) && near(size(p, false, 640), 216) && near(size(p, false, 560), 185)),
  'macfixa e2: on desktop the code shrinks before the safety line leaves the dialog, never under the 185 px scan floor (Account 216 / 185 / 185 at H 800 / 668 / 640; Wallet 216 at 640, 185 at 560) — ' + show(['codeId', 'maxId', 'maxAnon']) + ' at ' + JSON.stringify(Object.values(per).map((p) => [800, 668, 640, 560].map((H) => [size(p, true, H), size(p, false, H)]))[0]));

  ok(all((p) => v(p.pCap) === 'calc(100% - var(--safe-top, 0px) - var(--kb-inset, 0px))' && v(p.pMax) === 'none'
    && v(p.pCode) === 'min(216px, 40dvh, 62vw, 100%)' && v(p.pCodeAnon) === v(p.pCode) && p.pMaxW === null),
  'macfixa e3: the phone sheet keeps the base rules (its cap, the region, the code size) — ' + show(['pCap', 'pMax', 'pCode', 'pCodeAnon', 'pMaxW']));

  ok(all((p) => p.once.every((n) => n === 1)), 'macfixa e4: each shell with the address sheet carries the three desktop rules exactly once — ' + show(['once']));
}
