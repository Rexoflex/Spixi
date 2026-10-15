/* ==== S20G Q-5 (#1413 ⑥, Damir ruling 3 "the accent is unified"): THE CALL-BACK DISC + THE DETAILS HOVER ON THE CHAT ACCENT ====
 * On the BUILT chat.html (jsdom; the r-cascade winner per element, @supports blocks included) — a missed call (received) and a
 * declined call (sent), each with its call-back disc, and a settled received + sent payment pill with the Details layer:
 *   (1) CHAIN — the call-back disc = --chat-accent-tonal fill, the ink --chat-accent-ink-recv (received) / --chat-accent-ink-sent
 *       (sent); hover + press ink = --chat-accent-ink-strong; the Details layer's hover + press move the medallion ink to
 *       --chat-accent-ink-strong (both pill sides, the stacked label-row medallion); the hover / press rules set NO background
 *       (the #1012 / #1013 grammar: only the ink moves); every remap sits inside the @supports (color-mix) guard (outside it:
 *       today's blue rules, unchanged).
 *   (2) CONTRAST from the token VALUES (color-mix evaluated as the pins-s20f/c-accent walk does) over 7 canvases × (Auto + 6
 *       picks) × 2 themes, both sides: the disc icon at rest / hover / press on its tonal fill, and the medallion ink at hover /
 *       press on --surface-medallion over its card — every icon ≥ 3 : 1 (non-text); the count under 4.5 is reported; the disc
 *       shape on its card is reported (info).
 * Deliberate breaks (S20G B1 report): the sent disc rule deleted → CHAIN (sent ink = recv) · `.c-tcard__call-back { background:
 * var(--chat-accent-tonal-hover) }` on :hover → CHAIN (a hover background) · the medallion hover ink back to --icon-action-hover
 * inside the guard → CHAIN · tokens.css dark --chat-accent-ink 50 % → 10 % white → CONTRAST (the dark disc icon < 3). */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const r = {};
  const got = {};
  const low = [];
  let s = null;
  try {
    s = await K.open({ rows: false });
    const { W, d } = s;
    const S = W.Spixi;
    await sleep(150);
    const host = d.getElementById('messages');
    const n = () => {};
    const add = (row) => { host.append(row); return row; };
    const cR = add(S.createCallBubble({ missed: true, direction: 'received', timestamp: Date.now(), onCallBack: n }));
    const cS = add(S.createCallBubble({ rejected: true, direction: 'sent', timestamp: Date.now(), onCallBack: n }));
    const pR = add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'received', flow: 'in', amount: '12', status: 'completed', onDetails: n }));
    const pS = add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'sent', flow: 'out', amount: '7', status: 'completed', onDetails: n }));
    const C = cascade(W);
    const side = (el) => el.closest('.c-bubble-row').dataset.direction;
    const discs = [cR, cS].map((x) => x.querySelector('.c-tcard__call-back'));
    const meds = [pR, pS].map((x) => x.querySelector('.c-tcard__medallion'));
    const hits = [pR, pS].map((x) => x.querySelector('.c-tcard__hit'));
    const SUPP = /color:\s*color-mix\(in srgb,\s*red 50%,\s*blue\)/;
    const inGuard = (ru) => { for (let p = ru.parentRule; p; p = p.parentRule) if (SUPP.test(p.conditionText || '')) return true; return false; };
    /* :active sits outside the cascade helper — a local winner with :active held (the r-cascade order: specificity, then source) */
    const splitSel = (x) => { const out = []; let dep = 0, cur = ''; for (const ch of x) { if (ch === '(') dep++; if (ch === ')') dep--; if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
    const spec = (sel0) => { let t = sel0; for (let i = 0; i < 5; i++) t = t.replace(/:not\(([^()]*)\)/g, ' $1'); let a = 0, b = 0, c = 0;
      t = t.replace(/::[\w-]+/g, () => { c++; return ' '; }); t = t.replace(/#[\w-]+/g, () => { a++; return ' '; }); t = t.replace(/\[[^\]]*\]/g, () => { b++; return ' '; });
      t = t.replace(/\.[\w-]+/g, () => { b++; return ' '; }); t = t.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ' '; }); (t.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).forEach(() => c++); return a * 10000 + b * 100 + c; };
    const winActive = (el, prop) => { let best = null; C.rules.forEach(({ r: ru, media }, idx) => {
      if (media.some((m) => /prefers-|min-width|max-width/.test(m))) return;
      const v = ru.style.getPropertyValue(prop); if (!v) return;
      for (const sel0 of splitSel(ru.selectorText)) { if (/:hover|::|:focus/.test(sel0)) continue; const t = sel0.replace(/:active/g, ''); let m = false; try { m = el.matches(t.trim()); } catch (e) { m = false; }
        if (!m) continue; const sp = spec(sel0); if (!best || sp > best.sp || (sp === best.sp && idx >= best.idx)) best = { sp, idx, v: v.trim() }; } });
      return best ? best.v : ''; };
    const guardedFor = (selPart) => C.rules.filter(({ r: ru }) => inGuard(ru) && ru.selectorText.split(',').some((x) => x.trim() === selPart)).map(({ r: ru }) => ru);
    const pressInk = (selPart) => { const rs = guardedFor(selPart); return rs.length ? rs[rs.length - 1].style.getPropertyValue('color').trim() : ''; };
    const pressBg = (selPart) => guardedFor(selPart).some((ru) => ru.style.getPropertyValue('background') || ru.style.getPropertyValue('background-color'));
    got.discs = discs.map((b) => b && { side: side(b), bg: C.win(b, 'background'), ink: C.win(b, 'color'), hov: C.win(b, 'color', { hover: true }), hovBg: C.win(b, 'background', { hover: true }) });
    got.press = { disc: discs.map((b) => b && winActive(b, 'color')), discBg: pressBg('.c-bubble-row .c-tcard__call-back:active'), medWin: meds.map((m) => m && winActive(m, 'color')),
      med: pressInk('.c-tcard__hit:active ~ .c-tcard__medallion'), medTop: pressInk('.c-tcard__hit:active ~ .c-tcard__top > .c-tcard__medallion'),
      medBg: pressBg('.c-tcard__hit:active ~ .c-tcard__top > .c-tcard__medallion') };
    /* the hover winner for the medallion is the sibling rule: simulate it by matching through the hit (C.win drops :hover) */
    got.meds = meds.map((m) => m && { side: side(m), rest: C.win(m, 'color'), hov: C.win(m, 'color', { hover: true }), hovBg: C.win(m, 'background', { hover: true }), restBg: C.win(m, 'background') });
    const D = got.discs, M = got.meds, P = got.press;
    r.chain = D.every((x) => !!x && x.bg === 'var(--chat-accent-tonal)' && x.ink === (x.side === 'sent' ? 'var(--chat-accent-ink-sent)' : 'var(--chat-accent-ink-recv)')
        && x.hov === 'var(--chat-accent-ink-strong)' && x.hovBg === 'var(--chat-accent-tonal)')
      && P.disc.every((v) => v === 'var(--chat-accent-ink-strong)') && !P.discBg && P.medWin.every((v) => v === 'var(--chat-accent-ink-strong)') && P.med === 'var(--chat-accent-ink-strong)' && P.medTop === 'var(--chat-accent-ink-strong)' && !P.medBg
      && M.every((x) => !!x && x.hov === 'var(--chat-accent-ink-strong)' && x.hovBg === 'var(--surface-medallion)' && x.restBg === 'var(--surface-medallion)')
      && hits.every(Boolean);
    /* every Q-5 remap is inside the guard (the outside rules are today's blue) */
    const q5 = C.rules.filter(({ r: ru }) => /c-tcard__call-back|c-tcard__hit:(hover|active)/.test(ru.selectorText) && /var\(--chat-accent/.test(ru.style.cssText));
    got.unguarded = q5.filter(({ r: ru }) => !inGuard(ru)).map(({ r: ru }) => ru.selectorText);
    r.guarded = q5.length >= 4 && got.unguarded.length === 0;
    /* (2) contrast from the token values (the pins-s20f/c-accent evaluator) */
    const root = d.documentElement;
    const cs = () => W.getComputedStyle(root);
    const splitTop = (str) => { const out = []; let dep = 0, cur = ''; for (const ch of str) { if (ch === '(') dep++; if (ch === ')') dep--; if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
    const col = (v, k = 0) => {
      v = String(v || '').trim();
      if (k > 12) return null;
      let m = /^var\((--[\w-]+)(?:,\s*(.*))?\)$/.exec(v);
      if (m) { const x = C.win(root, m[1]) || cs().getPropertyValue(m[1]).trim(); return col(x || m[2] || '', k + 1); }
      m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
      if (m) { const hx = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]; return [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16)).concat(1); }
      m = /^rgba?\(([^)]*)\)$/.exec(v);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
      if (/^transparent$/.test(v)) return [0, 0, 0, 0];
      m = /^color-mix\(in srgb,\s*([\s\S]*)\)$/.exec(v);
      if (m) {
        const [a, b] = splitTop(m[1]).map((part) => { const pm = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(part); return pm ? { c: col(pm[1], k + 1), p: +pm[2] } : { c: col(part, k + 1), p: null }; });
        if (!a.c || !b.c) return null;
        let pa = a.p, pb = b.p; if (pa == null && pb == null) { pa = 50; pb = 50; } else if (pa == null) pa = 100 - pb; else if (pb == null) pb = 100 - pa;
        const A = a.c, B = b.c, wa = pa / (pa + pb), wb = pb / (pa + pb);
        const al = A[3] * wa + B[3] * wb;
        const ch = (i) => (al ? (A[i] * A[3] * wa + B[i] * B[3] * wb) / al : 0);
        return [ch(0), ch(1), ch(2), al];
      }
      return null;
    };
    const over = (c, g) => (c[3] >= 1 ? c : [0, 1, 2].map((i) => c[i] * c[3] + g[i] * (1 - c[3])).concat(1));
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    let nCombos = 0, under45 = 0, nChecks = 0;
    got.min = {};
    for (const theme of ['light', 'dark']) {
      root.setAttribute('data-theme', theme);
      for (const g of ['flat', 'gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean']) for (const pick of ['', 'blue', 'violet', 'teal', 'pink', 'orange', 'graphite']) {
        root.setAttribute('data-chat-ground', g);
        if (pick) root.setAttribute('data-chat-sent', pick); else root.removeAttribute('data-chat-sent');
        const tag = theme + '/' + g + '/' + (pick || 'auto');
        const V = {};
        for (const t of ['--chat-accent-tonal', '--chat-accent-ink-recv', '--chat-accent-ink-sent', '--chat-accent-ink-strong', '--surface-medallion']) V[t] = col('var(' + t + ')');
        const recv = col('var(--surface-bubble-received)'), sentCard = col('var(--surface-card-sent)');
        if (!recv || !sentCard || Object.values(V).some((x) => !x)) { low.push(tag + ': unresolved ' + JSON.stringify(Object.keys(V).filter((k) => !V[k]))); continue; }
        nCombos++;
        const chk = (name, v, min) => { nChecks++; got.min[name] = Math.min(got.min[name] == null ? 99 : got.min[name], +v.toFixed(2)); if (v < 4.5) under45++; if (v < 4.5) { got.u45 = got.u45 || {}; got.u45[name] = (got.u45[name] || []).concat(tag.replace(/^(\w)\w+/, '$1')); } if (min != null && !(v >= min)) low.push(tag + ' ' + name + ' ' + v.toFixed(2)); };
        const discR = over(V['--chat-accent-tonal'], recv), discS = over(V['--chat-accent-tonal'], sentCard);
        chk('disc-recv-rest', cr(over(V['--chat-accent-ink-recv'], discR), discR), 3);
        chk('disc-sent-rest', cr(over(V['--chat-accent-ink-sent'], discS), discS), 3);
        chk('disc-recv-hover-press', cr(over(V['--chat-accent-ink-strong'], discR), discR), 3);
        chk('disc-sent-hover-press', cr(over(V['--chat-accent-ink-strong'], discS), discS), 3);
        const medR = over(V['--surface-medallion'], recv), medS = over(V['--surface-medallion'], sentCard);
        chk('med-recv-hover-press', cr(over(V['--chat-accent-ink-strong'], medR), medR), 3);
        chk('med-sent-hover-press', cr(over(V['--chat-accent-ink-strong'], medS), medS), 3);
        const shape = (k, v) => { got.shape = got.shape || {}; if (got.shape[k] == null || v < got.shape[k]) { got.shape[k] = +v.toFixed(2); got.shape[k + 'At'] = tag; } };
        shape('disc-on-recv', cr(discR, recv)); shape('disc-on-sent', cr(discS, sentCard));
      }
    }
    root.removeAttribute('data-chat-sent'); root.setAttribute('data-chat-ground', 'flat'); root.setAttribute('data-theme', 'light');
    got.n = nCombos; got.under45 = under45 + ' / ' + nChecks;
    r.contrast = nCombos === 98 && low.length === 0;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20G Q-5 (#1413 ⑥): the call-back disc takes the chat accent (tonal fill, the side\'s ink, the strong ink on hover / press) and the settled pill\'s Details hover / press moves the medallion ink to the strong accent ink — no background moves, all inside the color-mix guard; every icon state ≥ 3 : 1 over 7 canvases × 7 sent colours × 2 themes, both sides — MIN '
    + JSON.stringify(got.min) + ' under 4.5: ' + got.under45 + ' ' + JSON.stringify(got.u45) + ' shape ' + JSON.stringify(got.shape) + ' ' + JSON.stringify({ r, got: { discs: got.discs, meds: got.meds, press: got.press, unguarded: got.unguarded } }) + (low.length ? ' LOW(' + low.length + '): ' + low.slice(0, 8).join(' | ') : ''));
}
