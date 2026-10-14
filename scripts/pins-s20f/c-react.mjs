/* ==== S20F W-13 (Damir 2026-10-14 16:18, the #1355 / #1443 rule): MY REACTION PILL ON THE CHAT ACCENT ====
 * Damir's screenshot: on a Meadow canvas my placed pill was the global blue tonal + blue border. On the BUILT chat.html
 * (jsdom; the r-cascade winner per element, @supports included), with reactions pushed through the shell (overlap, both
 * directions) and a received-inside row (the component, placement 'inside'):
 *   (1) CHAIN — my pill (aria-pressed) in the overlap and the received-inside placements paints background
 *       --chat-accent-tonal-hover, border --chat-accent-ink-deep, the count --chat-accent-ink-strong (once I reacted, my
 *       pill is inert too: one reaction, never removed — #1232); a LIVE pill (a row I have not reacted on) keeps its resting
 *       border and takes --chat-accent-ink-strong on hover and :active; every remap inside the color-mix guard;
 *   (2) UNCHANGED — the sent-inside pills keep the bubble wash (--surface-wash-on-hero-pressed + --text-bubble-sent-meta),
 *       an INERT (aria-disabled) pill keeps its resting border on hover (#46 r1 X6), the unpressed pill keeps --surface-menu;
 *   (3) CONTRAST from the token VALUES, 7 canvases × (Auto + 6 picks) × 2 themes: the count ≥ 4.5 on the pill; the border
 *       ≥ 3 against every stop of the canvas gradient (overlap — the pill hangs over the canvas) and against the received
 *       bubble (inside); the pressed fill ≠ the unpressed pill: ≥ 1.1 : 1 (dark Graphite excepted — a grey pick on grey
 *       pills; its border ≥ 3 carries the state; measured 1.02, today's blue 1.08).
 * Measured in Chromium (scratch c-react.mjs, the ground sampled under the pill): count ≥ 4.70, border ≥ 3.48 (today's
 * blue 2.47 on light Aurora), fill vs unpressed light ≥ 1.37 · dark ≥ 1.15 (Graphite 1.02).
 * Deliberate breaks (S20F report): the pressed background back to --surface-action-tonal-default → CHAIN · the border to
 * --chat-accent-ink-recv → LOW names border-on-canvas (light Aurora 2.08) · the pressed fill to --chat-accent-band →
 * LOW names fill-vs-unpressed · the hover rule losing `:not([aria-disabled="true"])` → UNCHANGED (inert). */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const r = {};
  const got = {};
  const low = [];
  let s = null;
  try {
    s = await K.open({ rows: false, hist: (x) => {
      x.push('addThem', 'rr', 'addrPeer', 'Ana', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
      x.push('addMe', 'rs', 'addrMe', 'Me', '', 'my words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
      x.push('addThem', 'ri', 'addrPeer', 'Ana', '', 'inside', String(T0 + 120), 'True', 'True', 'True', 'False', 'False');
      x.push('addThem', 'rl', 'addrPeer', 'Ana', '', 'not reacted yet', String(T0 + 150), 'True', 'True', 'True', 'False', 'False');
      x.push('addMe', 'si', 'addrMe', 'Me', '', 'sent inside', String(T0 + 180), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    } });
    const { W, d } = s;
    s.push('addReactions', 'rr', 'like:👍:2;like:❤️:1;', 'like:👍', '');
    s.push('addReactions', 'rs', 'like:👍:1;like:😂:1;', 'like:👍', '');
    s.push('addReactions', 'rl', 'like:👍:1;', '', '');   // I have NOT reacted here: the pill is live (hover / press)
    await sleep(120);
    const rowOf = (id) => K.rowOf(d, id);
    for (const id of ['ri', 'si']) W.Spixi.addReactions(rowOf(id), { reactions: [{ emoji: '👍', count: 2, own: true }, { emoji: '❤️', count: 1 }], placement: 'inside', onToggle() {}, onInspect() {} });
    W.Spixi.addReactions(rowOf('rr'), { reactions: [{ emoji: '👍', count: 2, own: true }, { emoji: '❤️', count: 1 }, { emoji: '😂', count: 1 }], placement: 'overlap', locked: true, onToggle() {}, onInspect() {} });
    const C = cascade(W);
    const own = (id) => rowOf(id) && rowOf(id).querySelector('.c-reactions__pill[aria-pressed="true"]');
    const other = (id) => rowOf(id) && rowOf(id).querySelector('.c-reactions__pill:not([aria-pressed="true"])');
    const inert = rowOf('rr') && rowOf('rr').querySelector('.c-reactions__pill[aria-disabled="true"]:not([aria-pressed="true"])');   // after my one reaction the others are inert (#1232)
    const live = rowOf('rl') && rowOf('rl').querySelector('.c-reactions__pill:not([aria-disabled="true"])');
    const paint = (el) => el && [C.win(el, 'background'), C.win(el, 'border-color'), C.win(C.win(el, 'color') ? el : el, 'color')].join(' | ');
    const WANT = 'var(--chat-accent-tonal-hover) | var(--chat-accent-ink-deep) | var(--chat-accent-ink-strong)';
    got.paint = { recvOverlap: paint(own('rr')), sentOverlap: paint(own('rs')), recvInside: paint(own('ri')), sentInside: paint(own('si')) };
    const activeRule = C.rules.find(({ r: ru }) => /\.c-reactions\[data-placement="overlap"\] \.c-reactions__pill:not\(\[aria-disabled="true"\]\):active/.test(ru.selectorText));
    got.states = { hover: live && C.win(live, 'border-color', { hover: true }), rest: live && C.win(live, 'border-color'), active: activeRule && activeRule.r.style.getPropertyValue('border-color').trim() };
    const SUPP = /color:\s*color-mix\(in srgb,\s*red 50%,\s*blue\)/;
    const inGuard = (ru) => { for (let p = ru.parentRule; p; p = p.parentRule) if (SUPP.test(p.conditionText || '')) return true; return false; };
    const remaps = C.rules.filter(({ r: ru }) => /c-reactions__pill/.test(ru.selectorText) && /var\(--chat-accent/.test(ru.style.cssText));
    got.unguarded = remaps.filter(({ r: ru }) => !inGuard(ru)).map(({ r: ru }) => ru.selectorText);
    r.chain = got.paint.recvOverlap === WANT && got.paint.sentOverlap === WANT && got.paint.recvInside === WANT
      && got.states.hover === 'var(--chat-accent-ink-strong)' && got.states.rest === 'var(--outline-neutral-01)' && got.states.active === 'var(--chat-accent-ink-strong)'
      && remaps.length >= 3 && got.unguarded.length === 0;
    got.inert = inert && [inert.getAttribute('aria-pressed'), C.win(inert, 'border-color'), C.win(inert, 'border-color', { hover: true })];
    got.other = other('rs') && C.win(other('rs'), 'background');
    r.unchanged = /--surface-wash-on-hero-pressed/.test(got.paint.sentInside) && /--text-bubble-sent-meta/.test(got.paint.sentInside)
      && !!got.inert && got.inert[0] !== 'true' && got.inert[1] === got.inert[2] && got.inert[2] === 'var(--outline-neutral-01)' && got.other === 'var(--surface-menu)';
    /* (3) contrast from the token values */
    const root = d.documentElement;
    const cs = () => W.getComputedStyle(root);
    const splitTop = (str) => { const out = []; let dep = 0, cur = ''; for (const ch of str) { if (ch === '(') dep++; if (ch === ')') dep--; if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
    const col = (v, k = 0) => {
      v = String(v || '').trim();
      if (k > 12) return null;
      let m = /^var\((--[\w-]+)(?:,\s*(.*))?\)$/.exec(v);
      if (m) { const x = C.win(root, m[1]) || cs().getPropertyValue(m[1]).trim(); return col(x || m[2] || '', k + 1); }
      if (v === 'transparent') return [0, 0, 0, 0];
      m = /^#([0-9a-f]{6})$/i.exec(v);
      if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
      m = /^rgba?\(([^)]*)\)$/.exec(v);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
      m = /^color-mix\(in srgb,\s*([\s\S]*)\)$/.exec(v);
      if (m) {
        const [a, b] = splitTop(m[1]).map((part) => { const pm = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(part); return pm ? { c: col(pm[1], k + 1), p: +pm[2] } : { c: col(part, k + 1), p: null }; });
        if (!a.c || !b.c) return null;
        let pa = a.p, pb = b.p; if (pa == null && pb == null) { pa = 50; pb = 50; } else if (pa == null) pa = 100 - pb; else if (pb == null) pb = 100 - pa;
        const wa = pa / (pa + pb), wb = pb / (pa + pb), al = a.c[3] * wa + b.c[3] * wb;
        return [0, 1, 2].map((i) => (al ? (a.c[i] * a.c[3] * wa + b.c[i] * b.c[3] * wb) / al : 0)).concat(al);
      }
      return null;
    };
    const over = (c, g) => (c[3] >= 1 ? c : [0, 1, 2].map((i) => c[i] * c[3] + g[i] * (1 - c[3])).concat(1));
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const pillOwn = own('rr');
    const decl = (p) => C.win(pillOwn, p);   // the WIRED tokens (a break in the css moves the measured pair)
    const unp = other('rr');
    let n = 0; got.min = {};
    for (const theme of ['light', 'dark']) {
      root.setAttribute('data-theme', theme);
      for (const g of ['flat', 'gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean']) for (const pick of ['', 'blue', 'violet', 'teal', 'pink', 'orange', 'graphite']) {
        root.setAttribute('data-chat-ground', g);
        if (pick) root.setAttribute('data-chat-sent', pick); else root.removeAttribute('data-chat-sent');
        const tag = theme + '/' + g + '/' + (pick || 'auto');
        const recv = col('var(--surface-bubble-received)');
        const bg = col(decl('background')), bd = col(decl('border-color')), ink = col(decl('color')), menu = col(C.win(unp, 'background'));
        const stops = []; for (const m of String(C.win(root, '--gradient-chat') || '').matchAll(/#[0-9a-f]{6}\b|var\(--[\w-]+\)/gi)) { const c = col(m[0]); if (c) stops.push(c); }
        if (!recv || !bg || !bd || !ink || !menu || !stops.length) { low.push(tag + ' unresolved'); continue; }
        n++;
        const chk = (name, v, min) => { got.min[name] = Math.min(got.min[name] == null ? 99 : got.min[name], +v.toFixed(2)); if (min != null && !(v >= min)) low.push(tag + ' ' + name + ' ' + v.toFixed(2)); };
        for (const ground of [recv, ...stops]) {
          const pill = over(bg, ground);
          chk('count-on-pill', cr(over(ink, pill), pill), 4.5);
          chk('fill-vs-unpressed', cr(pill, over(menu, ground)), theme === 'dark' && pick === 'graphite' ? null : 1.1);
        }
        for (const st of stops) chk('border-on-canvas', cr(over(bd, st), st), 3);
        chk('border-on-bubble', cr(over(bd, recv), recv), 3);
      }
    }
    root.removeAttribute('data-chat-sent'); root.setAttribute('data-chat-ground', 'flat'); root.setAttribute('data-theme', 'light');
    got.n = n;
    r.contrast = n === 98 && low.length === 0;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20F W-13 (Damir 16:18): my reaction pill on the chat accent — the overlap + received-inside pressed pill paints --chat-accent-tonal-hover / --chat-accent-ink-deep / the count --chat-accent-ink-strong, the live hover + press borders the strong ink, all guarded; the sent-inside wash pills, the inert pill and the unpressed pill unchanged; over ' + got.n + ' / 98 combinations the count ≥ 4.5, the border ≥ 3 on every canvas stop and on the bubble, the fill ≠ the unpressed pill — MIN ' + JSON.stringify(got.min) + ' '
    + JSON.stringify({ r, got: { paint: got.paint, states: got.states, inert: got.inert, other: got.other, unguarded: got.unguarded } }) + (low.length ? ' LOW(' + low.length + '): ' + low.slice(0, 12).join('; ') : ''));
}
