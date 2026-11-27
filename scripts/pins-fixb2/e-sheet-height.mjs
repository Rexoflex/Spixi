/* ==== fixb2 item 5 (Mission Control n-20261117-desktop-address-sheet-small-window; Windows walk of Fix batch 1, row W-4) ====
 * Mechanism (work/e/_mechanism.md): every CENTRED desktop sheet shares ONE cap, `:root[data-desktop] .c-sheet { max-height: 76% }`
 * (overlay.css): a fixed 12 % of the host stays free above and below, so in a short window the "Your Ixian address" sheet
 * (and the moment sheets, the pickers) scrolled with free space left. The fix is ONE rule below it:
 *   `:root[data-desktop] .c-sheet:not([data-dt-anchor]) { max-height: max(76%, min(calc(100% - 2 * var(--spacing-24)), 608px)); }`
 * SMOKE pin on the BUILT css (every <style> of every built page, every .css of the folder; comment-stripped; #771 declared: the
 * layout is not run here, the cap EXPRESSION is read from the built rule and EVALUATED at host heights by a small evaluator
 * (min / max / calc / var / % / px); the Chromium measurement of the real box is in _mechanism.md and the renders).
 *   (1) the built shells that carry the base centred rule (`:root[data-desktop] .c-sheet`) carry the new rule too, exactly ONCE each, and the
 *       base rule is untouched (`max-height: 76%`, `width: min(480px, 92%)`): the anchored dropdowns keep their 76 % (the new rule names `:not([data-dt-anchor])`);
 *   (2) the LARGE window = today's: evaluated at host heights 800 · 900 · 1080 · 1440 the cap equals 0.76 × H (the box of today);
 *   (3) the SMALL window uses the free height (and 528…780 = min(H − 48, 608), so the 608 is held): at 360 (the Windows window minimum, `MinHeightDip`, App.xaml.cs:38) and 328 (the same minus
 *       a 32 px title bar) the cap is H − 48 (a --spacing-24 margin each side), larger than 0.76 × H, and never above H − 48 at any height 300…800;
 *       the cap is monotone (never shrinks when the host grows) and never below 0.76 × H;
 *   (4) no other rule of ANY built page — inside an at-rule at any depth too (`@media (hover: hover) … { … .c-sheet--addr { max-height: 76% } }`) — that names `data-desktop`
 *       and a sheet class sets a `height` / `max-height` other than none / auto, apart from the held ones: BASE and NEW (top level), the chat app picker's `height` (see (6)), and the Windows
 *       call-card decline sheet (call.html `calc(100% - 48px)`: a real centred .c-sheet in the call WebView, deliberately taller than the shared cap — H − 48 is never under it; held exactly);
 *   (5) the inner scroller of the address sheet is unchanged: `:root[data-desktop] .c-addr-sheet { … max-height: none; }` and
 *       `:root[data-desktop] .c-sheet--addr { overflow-y: hidden; }` (the one scroller binds against the dialog).
 *   (6) the chat app picker's fixed `height` is `min(560px, <the shared cap>)` (360 → 312, 800 → 560).
 * Deliberate breaks (#802, fixb2 report; one token of src/styles/components/overlay.css in a full temp copy + build-shells): the cap 608px → 400px → (3) red (the
 *   528…780 growth region); 608px → 800px → (2) and (3) red; `calc(100% - 2 * var(--spacing-24))` → `100%` (no margin) → (3) red; the new rule's selector renamed
 *   (= the rule gone) → (1) (2) (3) (4) red; `:not([data-dt-anchor])` dropped (the rule then collides with the base selector) → (1) (2) (3) red; a
 *   `max-height: 76%` added to `:root[data-desktop] .c-sheet--addr` (wallet-receive.css) → (4) red; the same inside `@media (hover: hover) and (pointer: fine) { … }` → (4) red (fixb2 #46 r1 m-1);
 *   chat.html picker `height: min(560px, <cap>)` → `min(560px, 76%)` → (6) red; → `min(480px, <cap>)` → (6) red (m-2); call.html decline sheet `calc(100% - 48px)` → `76%` → (4) red.  */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCssComments } = h;
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const flat = (t) => stripCssComments(t).replace(/\s+/g, ' ');
  const styleOf = (t) => [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const rules = (css) => {
    const out = []; const stack = []; let buf = '';
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (c === '{') { stack.push(buf.trim()); buf = ''; }
      else if (c === '}') { out.push({ sel: (stack[stack.length - 1] || '').replace(/\s+/g, ' '), body: buf.trim(), at: stack.slice(0, -1).filter((x) => x.startsWith('@')) }); stack.pop(); buf = ''; }
      else if (c === ';' && stack.length === 0) buf = '';
      else buf += c;
    }
    return out;
  };
  const decl = (r, p) => { const m = new RegExp('(?:^|;)\\s*' + p + ':\\s*([^;]+)').exec(r.body); return m ? m[1].trim() : null; };
  const BASE = ':root[data-desktop] .c-sheet', NEW = ':root[data-desktop] .c-sheet:not([data-dt-anchor])';
  const files = readdirSync(dir).filter((f) => f.endsWith('.html') || f.endsWith('.css'));
  const css = (f) => flat(f.endsWith('.html') ? styleOf(readFileSync(join(dir, f), 'utf8')) : readFileSync(join(dir, f), 'utf8'));
  const tokens = flat(readFileSync(join(dir, 'spixi.tokens.css'), 'utf8'));
  const vars = {};
  for (const m of tokens.matchAll(/(--spacing-\d+):\s*(\d+)px/g)) vars[m[1]] = Number(m[2]);

  /* a small evaluator: min() max() calc() var() % px + − × — H is the host height in px */
  const evalCap = (expr, H) => {
    const t = expr.replace(/var\((--[\w-]+)\)/g, (m, n) => (n in vars ? vars[n] + 'px' : 'NaN')).match(/min\(|max\(|calc\(|\(|\)|,|[+\-*/]|[\d.]+(?:%|px)?/g);
    if (!t) return NaN;
    let i = 0;
    const num = (s) => (s.endsWith('%') ? (parseFloat(s) / 100) * H : parseFloat(s));
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

  const per = {}; const strays = []; const picker = []; let capExpr = null;
  const PICKER = ':root[data-desktop] .c-sheet.chat-app-picker-sheet[data-tall]', DECLINE = ':root[data-platform="windows"][data-desktop] .c-declinemsg-sheet';
  for (const f of files) {
    const all = rules(css(f));                       // EVERY rule, at any depth (an @media / @supports block included)
    const rs = all.filter((r) => !r.at.length);
    /* (4) every rule — at-rule scoped or not — that names data-desktop and a sheet class and sets a height / max-height other than none / auto is a stray, unless it is one of the
       held ones: the shared BASE and NEW rules (top level, max-height; BASE 76 % and NEW are checked in (1)); the chat app picker's height (checked in (6)); the Windows call-card
       decline sheet (call.html, `calc(100% - 48px)`, a real centred .c-sheet inside the call WebView, whose whole window is the card: the cap is H − 48, never under the shared one; held exactly) */
    for (const r of all) {
      if (!(/data-desktop\]/.test(r.sel) && !/:not\(\[data-desktop\]\)/.test(r.sel) && /sheet/i.test(r.sel))) continue;
      for (const prop of ['height', 'max-height']) {
        const v = decl(r, prop);
        if (!v || /^(none|auto)$/.test(v)) continue;
        const top = !r.at.length;
        if (top && prop === 'max-height' && (r.sel === BASE || r.sel === NEW)) continue;
        if (top && f === 'chat.html' && r.sel === PICKER && prop === 'height') { picker.push(v); continue; }
        if (top && f === 'call.html' && r.sel === DECLINE && prop === 'max-height' && v === 'calc(100% - 48px)') continue;
        if (top && r.sel === ':root[data-desktop] .c-sheet.c-sheet--addr' && prop === 'max-height' && v === 'calc(100% - 2 * var(--spacing-16))') continue;   // macfixa item 5 re-base: the address dialog may use the window minus 16 px (H − 32 is never under the shared cap for H ≥ 134); held exactly (pins-macfixa/e-addr-fit e1)
        strays.push(f + ' → ' + (r.at.length ? r.at.join(' ') + ' { ' : '') + r.sel + ' { ' + prop + ': ' + v);
      }
    }
    const base = rs.filter((r) => r.sel === BASE);
    if (!base.length) continue;
    const nw = rs.filter((r) => r.sel === NEW);
    per[f] = { baseCap: base.length === 1 && decl(base[0], 'max-height') === '76%' && /width:\s*min\(480px, 92%\)/.test(base[0].body), newCount: nw.length, newCap: nw.length === 1 ? decl(nw[0], 'max-height') : null, onlyCap: nw.length === 1 && nw[0].body.replace(/;\s*$/, '').split(';').length === 1 };
    if (per[f].newCap) capExpr = per[f].newCap;
  }
  const names = Object.keys(per);
  const r1 = names.length >= 8 && names.every((f) => per[f].baseCap && per[f].newCount === 1 && per[f].onlyCap) && new Set(names.map((f) => per[f].newCap)).size === 1;
  ok(r1, '★ fixb2 item 5 (1): every built page that carries the centred sheet rule `' + BASE + '` (' + names.length + ' pages) keeps its `max-height: 76%` + `width: min(480px, 92%)` AND carries the ONE new rule `' + NEW + '` with a single max-height declaration — the anchored dropdowns are not named by it: ' + JSON.stringify(Object.fromEntries(names.filter((f) => !(per[f].baseCap && per[f].newCount === 1 && per[f].onlyCap)).map((f) => [f, per[f]]))) + ' cap=' + capExpr);

  const cap = (H) => (capExpr ? evalCap(capExpr, H) : NaN);
  const eq = (a, b) => Math.abs(a - b) < 0.01;
  const large = [800, 900, 1080, 1440].map((H) => [H, cap(H), 0.76 * H]);
  ok(large.every(([, c, t]) => eq(c, t)), '★ fixb2 item 5 (2): the LARGE window is today\'s — at host heights 800 · 900 · 1080 · 1440 the built cap `' + capExpr + '` evaluates to 76 % of the host: ' + JSON.stringify(large));

  const small = [360, 328].map((H) => [H, cap(H), H - 48, 0.76 * H]);
  let mono = true, bounded = true, floor = true, prev = -1;
  for (let H = 300; H <= 1600; H += 4) {
    const c = cap(H);
    if (!(c >= prev - 1e-9)) mono = false;
    prev = c;
    if (!(c >= 0.76 * H - 1e-9)) floor = false;
    if (H <= 800 && !(c <= H - 48 + 1e-9)) bounded = false;
  }
  /* the growth region below 800: the cap is min(H − 48, 608) — the 608 (= 76 % of 800) is what makes 800 and up today's */
  const mid = [528, 560, 668, 700, 780].map((H) => [H, cap(H), Math.min(H - 48, 608)]);
  const midOk = mid.every(([, c, want]) => eq(c, want));
  ok(small.every(([, c, want, today]) => eq(c, want) && c > today) && mono && bounded && floor && midOk,
    '★ fixb2 item 5 (3): the SMALL window uses its free height — at the Windows minimum 360 (App.xaml.cs MinHeightDip) and at 328 (minus a title bar) the cap is H − 48 (a --spacing-24 margin on each side), larger than today\'s 76 %; over 300…1600 the cap never shrinks as the host grows (' + mono + '), never exceeds H − 48 up to 800 (' + bounded + '), never falls under 76 % (' + floor + '); between 528 and 780 it is min(H − 48, 608) (' + midOk + '): ' + JSON.stringify(small) + JSON.stringify(mid));

  ok(strays.length === 0, '★ fixb2 item 5 (4): no other desktop sheet rule of any built page (at-rule scoped ones included) sets a height / max-height (a per-sheet cap would defeat the fix for that sheet): ' + JSON.stringify(strays));

  const settings = rules(css('settings.html')).filter((r) => !r.at.length);
  const inner = settings.filter((r) => r.sel === ':root[data-desktop] .c-addr-sheet');
  const clip = settings.filter((r) => r.sel === ':root[data-desktop] .c-sheet--addr' && /overflow-y:\s*hidden/.test(r.body));
  ok(inner.length === 1 && /max-height:\s*none/.test(inner[0].body) && /min-height:\s*0/.test(inner[0].body) && clip.length === 1,
    '★ fixb2 item 5 (5): the address sheet\'s inner scroller is unchanged in the built settings shell — `.c-addr-sheet { min-height: 0; max-height: none }` and the dialog clips (`overflow-y: hidden`), so the one scroller binds against the taller dialog');

  /* (6) the chat app picker (chat.html `.chat-app-picker-sheet[data-tall]`, a centred desktop sheet with a FIXED height that out-ranks max-height): its height is `min(560px, <the shared cap>)`,
     so at a 800 px host it is 560 (today's) and at 360 it is 312 (was 273.6) */
  const pk = picker.length === 1 ? picker[0] : null;
  const pkAt = (H) => (pk ? evalCap(pk, H) : NaN);
  const pkWant = (H) => Math.min(560, cap(H));
  const pkSet = [[360, 312], [800, 560], [1000, 560], [668, 560]].map(([H, w]) => [H, pkAt(H), w]);
  ok(pk === `min(560px, ${capExpr})` && pkSet.every(([, g, w]) => eq(g, w)) && [300, 360, 480, 528, 600, 700, 800, 1000].every((H) => eq(pkAt(H), pkWant(H))),
    '★ fixb2 item 5 (6): the chat app picker\'s fixed height follows the shared cap — `' + pk + '` = min(560px, the cap of (1)); evaluated at 360 → 312 (was 273.6), 800 → 560 and 1000 → 560 (today\'s): ' + JSON.stringify(pkSet));
}
