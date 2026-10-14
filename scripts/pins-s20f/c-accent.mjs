/* ==== S20F W-3 (#1443 · #1444): EVERY IN-BUBBLE CONTROL ON THE CHAT ACCENT ====
 * On the BUILT chat.html (jsdom; the r-cascade winner per element, @supports blocks included):
 *   (1) CHAIN — every in-bubble .c-button (Pay / Decline · Cancel request · Retry · Join / Decline · Cancel / Launch app ·
 *       Decline / Get app · End session / Resume · Open again) takes its private palette from the --chat-accent* chain, for
 *       every state button.css paints: --_fill / -hover / -pressed = --chat-accent / -hover / -pressed, --_on-fill =
 *       --chat-accent-on, --_ink = --chat-accent-ink-recv (received) / --chat-accent-ink-sent (sent card), --_ink-hover /
 *       -pressed / --_outline = var(--_ink), --_tonal = --chat-accent-tonal; the type rules still paint from the private
 *       palette (fill: var(--_fill), hover var(--_fill-hover); outline: var(--_ink) + var(--_outline)); never
 *       --surface-action-default. The file card's download badge + the on-tile ✕ = --chat-accent / --chat-accent-on, the
 *       transfer fill + "Tap to download" = --chat-accent-ink-recv, the photo tile's offer line + ring fill + Download all =
 *       --chat-accent-ink-recv. Every remap sits inside the @supports (color-mix) guard (outside it: today's blue).
 *   (2) EXCEPTIONS — a destructive .c-button in a card keeps --surface-destructive-default / --text-error; the FAILED file
 *       badge keeps --error-600; a disabled Pay keeps --surface-action-disabled.
 *   (3) CONTRAST from the token VALUES: the --chat-accent* winners on :root (light / dark) are EVALUATED (color-mix in sRGB,
 *       var() resolved per canvas + pick on the built token sheet) over 7 canvases × (Auto + 6 picks) × 2 themes, both card
 *       sides: labels ≥ 4.5 (white on the fill / hover / pressed; the ink on the received card and the sent ink on the sent
 *       card; the CTA on the received card), outlines ≥ 3 (the button edge on both sides, the transfer fill on its track).
 *   ★ #46 r1: (1) hover / pressed ink = --chat-accent-ink-strong (no longer var(--_ink): the plain accent read 3.82 on its
 *       own 16 % tint), walked on the REAL grounds — --surface-interactive-hover (outline hover) and var(--_tonal) (outline
 *       press), both sides, and Download all's tonal hover / active ground; (3) the filled shape ≥ 1.5 : 1 on the received
 *       card (--chat-accent-fill: dark Graphite / Teal / Blue lift; was 1.06); (4a) the photo tile's text Cancel (on the
 *       CANVAS) = ink-strong / ink-deep — never under today's blue on any canvas stop, pressed ≥ rest; (5) the transfer fill
 *       on the SENT card's track and the photo ring on its track, the tracks read as the cascade paints them.
 * Deliberate breaks (S20F report): `--_fill: var(--chat-accent)` → var(--surface-action-default) → CHAIN · tokens.css
 * --chat-accent-ink-sent 22 % → 0 % (the plain accent on the sent tint) → LOW names light sent-ink · the `:not([data-intent=
 * "destructive"])` dropped from both rules → EXCEPTIONS (destructive) · the badge selector rewritten without the failed
 * exclusion at the failed rule's weight (`.c-bubble-row .c-fbubble .c-fbubble__badge`) → EXCEPTIONS (failed badge = the accent)
 * · media-bubble.css's guard turned into `@media all` → GUARDED · (r1) `--_ink-hover / -pressed: var(--_ink)` back → CHAIN ·
 * (r1) --chat-accent-ink-strong 22 % → 0 % → LOW names recv- / sent- / dlall-hover-pressed (250) · (r1) Download all :active →
 * the plain ink → FILES · (r1) the Graphite fill lift removed → LOW names fill-vs-recv-card ×7 (1.06–1.19) · (r1) the photo
 * Cancel back to the plain ink → FILES · (r1) the dark sent-card track / the dark ring track → neutral-300 → LOW names
 * fill-on-sent-track / ring-on-track (49 each). */
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
      /* addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local, voice, group, played, size) */
      x.push('addFile', 'fo', 'addrPeer', 'Ana', '', 'ffo', 'Itinerary.pdf', String(T0), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '', '', '', '', '');   // no size: the "Tap to download" line (data-cta)
      x.push('addFile', 'fp', 'addrPeer', 'Ana', '', 'ffp', 'Photos.zip', String(T0 + 10), 'False', 'True', 'False', '45', 'False', 'False', 'True', '', '', '', '', '', '18874368');
      x.push('addFile', 'fs', 'addrMe', 'Me', '', 'ffs', 'Notes.zip', String(T0 + 20), 'True', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '', '', '', '18874368');
      x.push('addFile', 'fz', 'addrMe', 'Me', '', 'ffz', 'mine.jpg', String(T0 + 25), 'True', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '', '', '', '2516582');   // MY photo, pre-accept: the text Cancel beside the tile
      x.push('addFile', 'ft', 'addrPeer', 'Ana', '', 'fft', 'beach.jpg', String(T0 + 30), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '', '', '', '', '2516582');
      x.push('addFile', 'fq', 'addrPeer', 'Ana', '', 'ffq', 'hill.jpg', String(T0 + 40), 'False', 'True', 'False', '40', 'False', 'False', 'True', '', '', '', '', '', '2516582');
      x.push('addFile', 'g0', 'addrPeer', 'Ana', '', 'xg0', 'a0.jpg', String(T0 + 50), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '', '', 'fedcba9876543210|0|2|', '', '2516582');
      x.push('addFile', 'g1', 'addrPeer', 'Ana', '', 'xg1', 'a1.jpg', String(T0 + 51), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '', '', 'fedcba9876543210|1|2|', '', '2516582');
    } });
    const { W, d } = s;
    const S = W.Spixi;
    await sleep(150);
    const host = d.getElementById('messages');
    const n = () => {};
    const add = (row) => { host.append(row); return row; };
    add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'request-in', flow: 'out', amount: '1', status: 'actionable', onPay: n, onDecline: n }));
    add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'request-in', flow: 'out', amount: '9', status: 'actionable', insufficient: true, onPay: n, onDecline: n }));
    add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'request-out', flow: 'in', amount: '2', status: 'pending', onCancel: n }));
    add(S.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'sent', flow: 'out', amount: '3', status: 'failed', onRetry: n }));
    const all = { onJoin: n, onDecline: n, onCancel: n, onLaunch: n, onGet: n, onResume: n, onEnd: n, onOpenAgain: n };
    for (const st of ['invite', 'invited', 'missing', 'in-session', 'joined']) add(S.createAppBubble({ name: 'Chess', state: st, direction: st === 'invited' ? 'sent' : undefined, timestamp: Date.now(), strings: {}, ...all }));
    add(S.createFileBubble({ direction: 'received', name: 'Broken.zip', state: 'failed', size: 1000, timestamp: Date.now(), strings: {}, onRetry: n })).dataset.msgid = 'ff';   // the failed card: its badge keeps error-600
    const sentProg = add(S.createFileBubble({ direction: 'sent', name: 'Up.zip', state: 'progress', progress: 40, size: 1000, timestamp: Date.now(), strings: {} }));   // r1 MINOR-5: the SENT card's track
    const destr = add(S.createAppBubble({ name: 'Chess', state: 'invite', timestamp: Date.now(), strings: {}, onJoin: n, onDecline: n })).querySelector('.c-button');
    destr.setAttribute('data-intent', 'destructive');
    const C = cascade(W);
    const btns = [...host.querySelectorAll('.c-tcard .c-button')].filter((b) => b !== destr);
    const side = (el) => (el.closest('.c-bubble-row') || {}).dataset ? el.closest('.c-bubble-row').dataset.direction : '?';
    got.labels = btns.map((b) => b.textContent.trim() + '/' + side(b));
    /* r1 (#46 MAJOR-1): hover / pressed take the DEEPER ink (was var(--_ink) — the plain accent read 3.82 on its own 16 % tint) */
    const want = (b) => ({ '--_fill': 'var(--chat-accent-fill)', '--_fill-hover': 'var(--chat-accent-hover)', '--_fill-pressed': 'var(--chat-accent-pressed)', '--_on-fill': 'var(--chat-accent-on)',
      '--_ink': side(b) === 'sent' ? 'var(--chat-accent-ink-sent)' : 'var(--chat-accent-ink-recv)', '--_ink-hover': 'var(--chat-accent-ink-strong)', '--_ink-pressed': 'var(--chat-accent-ink-strong)', '--_outline': 'var(--_ink)', '--_tonal': 'var(--chat-accent-tonal)' });
    const chainBad = [];
    for (const b of btns) {
      for (const [p, v] of Object.entries(want(b))) { const w = C.win(b, p); if (w !== v) chainBad.push(b.textContent.trim() + '/' + side(b) + ' ' + p + '=' + w); }
      const t = b.dataset.type;
      if (t === 'fill' && !b.disabled && (C.win(b, 'background') !== 'var(--_fill)' || C.win(b, 'background', { hover: true }) !== 'var(--_fill-hover)' || C.win(b, 'color') !== 'var(--_on-fill)')) chainBad.push(b.textContent.trim() + ' fill paint ' + C.win(b, 'background'));
      if (t === 'outline' && (C.win(b, 'color') !== 'var(--_ink)' || !/var\(--_outline\)/.test(C.win(b, 'border')))) chainBad.push(b.textContent.trim() + ' outline paint ' + C.win(b, 'color') + ' ' + C.win(b, 'border'));
    }
    const sides = new Set(btns.map(side));
    const labelsSeen = got.labels.join('|');
    r.coverage = btns.length >= 14 && sides.has('sent') && sides.has('received')
      && ['Pay 1 IXI', 'Decline', 'Cancel request', 'Retry', 'Join', 'Launch app', 'Get app', 'Resume', 'End session', 'Open again'].every((l) => labelsSeen.includes(l + '/'));
    const one = (sel) => host.querySelector(sel);
    const offerCard = one('[data-msgid="fo"] .c-fbubble');
    const badge = offerCard && offerCard.querySelector('.c-fbubble__badge');
    const fill = one('[data-msgid="fp"] .c-fbubble__fill');
    const cta = offerCard && offerCard.querySelector('.c-fbubble__meta[data-cta]');
    const tileX = one('[data-msgid="fs"] .c-fbubble__cancel[data-on-tile]');
    const mcta = one('[data-msgid="ft"] .c-mbubble__cta');
    const ring = one('[data-msgid="fq"] .c-mbubble__ring-fill');
    const dlall = one('.c-mgrid__dlall');
    const tileCancel = host.querySelector('.c-bubble-row > .c-fbubble__cancel:not([data-on-tile])');   // r1 MINOR-4 (a): MY photo's pre-accept text Cancel
    /* :active is outside the cascade helper (it skips the pseudo) — the pressed rules are read from the guarded sheet by selector */
    const activeInk = (sel) => (C.rules.find(({ r: ru }) => ru.selectorText.split(',').some((x) => x.trim() === sel) && /color/.test(ru.style.cssText) && ru.parentRule) || { r: { style: { getPropertyValue: () => '' } } }).r.style.getPropertyValue('color').trim();
    got.media = { badge: badge && [C.win(badge, 'background'), C.win(badge, 'color')], tileX: tileX && [C.win(tileX, 'background'), C.win(tileX, 'color')], fill: fill && C.win(fill, 'background'), cta: cta && C.win(cta, 'color'),
      mcta: mcta && C.win(mcta, 'color'), ring: ring && C.win(ring, 'stroke'), dlall: dlall && [C.win(dlall, 'color'), C.win(dlall, '--surface-action-tonal-default'), C.win(dlall, 'color', { hover: true }), activeInk('.c-mgrid__dlall:active')],
      tileCancel: tileCancel && [C.win(tileCancel, 'color'), C.win(tileCancel, 'color', { hover: true }), activeInk('.c-bubble-row > .c-fbubble__cancel:active')] };
    const M = got.media;
    r.files = !!M.badge && M.badge.join() === 'var(--chat-accent-fill),var(--chat-accent-on)' && !!M.tileX && M.tileX.join() === 'var(--chat-accent-fill),var(--chat-accent-on)'
      && M.fill === 'var(--chat-accent-ink-recv)' && M.cta === 'var(--chat-accent-ink-recv)' && M.mcta === 'var(--chat-accent-ink-recv)' && M.ring === 'var(--chat-accent-ink-recv)'
      && !!M.dlall && M.dlall.join() === 'var(--chat-accent-ink-recv),var(--chat-accent-tonal),var(--chat-accent-ink-strong),var(--chat-accent-ink-strong)'
      && !!M.tileCancel && M.tileCancel.join() === 'var(--chat-accent-ink-strong),var(--chat-accent-ink-deep),var(--chat-accent-ink-deep)';
    /* every remap rule is inside the color-mix guard */
    const SUPP = /color:\s*color-mix\(in srgb,\s*red 50%,\s*blue\)/;
    const remapRules = C.rules.filter(({ r: ru }) => [...Array.from({ length: ru.style.length }, (_, i) => ru.style[i])].some((p) => /^--_(fill|ink|on-fill|outline|tonal)/.test(p)) && /\.c-tcard/.test(ru.selectorText)
      || /var\(--chat-accent/.test(ru.style.cssText) && /c-fbubble|c-mbubble|c-mgrid/.test(ru.selectorText));
    const inGuard = (ru) => { for (let p = ru.parentRule; p; p = p.parentRule) if (SUPP.test(p.conditionText || '')) return true; return false; };   // r1: a nested (hover) block counts
    got.unguarded = remapRules.filter(({ r: ru }) => !inGuard(ru)).map(({ r: ru }) => ru.selectorText);
    r.guarded = remapRules.length >= 5 && got.unguarded.length === 0;
    got.chainBad = chainBad.slice(0, 6);
    r.chain = chainBad.length === 0;
    /* (2) exceptions */
    const failBadge = one('[data-msgid="ff"] .c-fbubble__badge');
    const poor = btns.find((b) => b.disabled && /Pay 9/.test(b.textContent));
    got.exc = { destr: [C.win(destr, '--_fill'), C.win(destr, '--_ink'), C.win(destr, '--_outline')], failBadge: failBadge && C.win(failBadge, 'background'), failState: failBadge && failBadge.closest('.c-fbubble').dataset.state, poor: poor && C.win(poor, 'background') };
    r.exceptions = got.exc.destr.join() === 'var(--surface-destructive-default),var(--text-error),var(--outline-error)'
      && got.exc.failBadge === 'var(--error-600)' && got.exc.failState === 'failed' && got.exc.poor === 'var(--surface-action-disabled)';
    /* (3) contrast from the token values */
    const root = d.documentElement;
    const cs = () => W.getComputedStyle(root);
    const splitTop = (str) => { const out = []; let dep = 0, cur = ''; for (const ch of str) { if (ch === '(') dep++; if (ch === ')') dep--; if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
    const col = (v, k = 0) => {
      v = String(v || '').trim();
      if (k > 12) return null;
      let m = /^var\((--[\w-]+)(?:,\s*(.*))?\)$/.exec(v);
      if (m) { const x = C.win(root, m[1]) || cs().getPropertyValue(m[1]).trim(); return col(x || m[2] || '', k + 1); }   // the cascade winner on :root (@supports included), else jsdom's computed value
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
        const ch = (i) => (al ? (A[i] * A[3] * wa + B[i] * B[3] * wb) / al : 0);   // premultiplied, as CSS color-mix
        return [ch(0), ch(1), ch(2), al];
      }
      return null;
    };
    const over = (c, g) => (c[3] >= 1 ? c : [0, 1, 2].map((i) => c[i] * c[3] + g[i] * (1 - c[3])).concat(1));
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const tokenOf = (name) => C.win(root, name);   // the WINNING declaration text on :root (the @supports one in the built sheet)
    let nCombos = 0;
    got.min = {};
    const worst = { label: 99, outline: 99, shape: 99, info: 99, info2: 99 };
    const TOK = { '--chat-accent-fill': '--chat-accent', '--chat-accent-hover': null, '--chat-accent-pressed': null, '--chat-accent-on': null, '--chat-accent-ink-recv': null, '--chat-accent-ink-sent': null,
      '--chat-accent-ink-strong': '--chat-accent-ink-recv', '--chat-accent-tonal': null, '--chat-accent-ink-deep': '--chat-accent-ink-strong' };   // name → its fallback (a tree without the r1 token measures what it paints)
    const stops = () => { const g = String(C.win(root, '--gradient-chat') || '').trim(); const out = []; for (const m of g.matchAll(/#[0-9a-f]{6}\b|var\(--[\w-]+\)/gi)) { const c = col(m[0]); if (c) out.push(c); } return out; };
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') root.setAttribute('data-theme', 'dark'); else root.setAttribute('data-theme', 'light');
      for (const g of ['flat', 'gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean']) for (const pick of ['', 'blue', 'violet', 'teal', 'pink', 'orange', 'graphite']) {
        root.setAttribute('data-chat-ground', g);
        if (pick) root.setAttribute('data-chat-sent', pick); else root.removeAttribute('data-chat-sent');
        const tag = theme + '/' + g + '/' + (pick || 'auto');
        const V = {};
        for (const [t, fb] of Object.entries(TOK)) { let v = tokenOf(t); if (!v && fb) v = tokenOf(fb) || (TOK[fb] ? tokenOf(TOK[fb]) : ''); V[t] = col(v); }
        const recv = col('var(--surface-bubble-received)'), sentCard = col('var(--surface-card-sent)'), hov = col('var(--surface-interactive-hover)');
        /* the tracks as the CASCADE paints them (r1 MINOR-5: + the SENT card's track, typed-bubbles.css :348, and the photo ring's, media-bubble.css :264-265) */
        const trackR = col(C.win(host.querySelector('[data-msgid="fp"] .c-fbubble__track'), 'background'));
        const trackS = col(C.win(sentProg.querySelector('.c-fbubble__track'), 'background'));
        const trackRing = col(C.win(host.querySelector('[data-msgid="fq"] .c-mbubble__ring-track'), 'stroke'));
        const canvas = stops();
        if (!recv || !sentCard || !hov || !trackR || !trackS || !trackRing || !canvas.length || Object.values(V).some((x) => !x)) { low.push(tag + ': unresolved ' + JSON.stringify({ recv: !!recv, sentCard: !!sentCard, hov: !!hov, canvas: canvas.length, V: Object.keys(V).filter((k) => !V[k]) })); continue; }
        nCombos++;
        const chk = (name, v, min, kind) => { const nm = name.replace(/@\d+$/, ''); got.min[nm] = Math.min(got.min[nm] == null ? 99 : got.min[nm], +v.toFixed(2)); if (v < worst[kind]) { worst[kind] = v; worst[kind + 'At'] = tag + ' ' + name; } if (min != null && !(v >= min)) low.push(tag + ' ' + name + ' ' + v.toFixed(2)); };
        const on = V['--chat-accent-on'], strong = V['--chat-accent-ink-strong'];
        const fillR = over(V['--chat-accent-fill'], recv);
        for (const f of ['--chat-accent-fill', '--chat-accent-hover', '--chat-accent-pressed']) chk('white-on' + f.replace('--chat-accent', ''), cr(on, over(V[f], recv)), 4.5, 'label');
        /* rest */
        chk('recv-ink', cr(over(V['--chat-accent-ink-recv'], recv), recv), 4.5, 'label');
        chk('sent-ink', cr(over(V['--chat-accent-ink-sent'], sentCard), sentCard), 4.5, 'label');
        /* ★ r1 MAJOR-1: hover (button.css :115 — the ink on --surface-interactive-hover) + pressed (:122 — on var(--_tonal)), both sides;
           Download all hover / active (its tonal ground, media-bubble.css :435 / :437) */
        const hovR = over(hov, recv), hovS = over(hov, sentCard), tonR = over(V['--chat-accent-tonal'], recv), tonS = over(V['--chat-accent-tonal'], sentCard);
        chk('recv-hover', cr(over(strong, hovR), hovR), 4.5, 'label');
        chk('recv-pressed', cr(over(strong, tonR), tonR), 4.5, 'label');
        chk('sent-hover', cr(over(strong, hovS), hovS), 4.5, 'label');
        chk('sent-pressed', cr(over(strong, tonS), tonS), 4.5, 'label');
        chk('dlall-hover-pressed', cr(over(strong, tonR), tonR), 4.5, 'label');
        /* ★ r1 MINOR-4 (a): the photo tile's text Cancel sits on the CANVAS (beside the tile) — every stop of the canvas gradient */
        /* ★ r1 MINOR-4 (a): the photo tile's text Cancel sits on the CANVAS (beside the tile); a coloured ink cannot hold 4.5 on the
           saturated light canvases (today's blue fails 42 of 161 light stops), so the floor is NEVER WORSE THAN TODAY'S BLUE at rest,
           per stop, and pressed ≥ rest */
        const today = col('var(--text-action-default)');
        for (const [i, cv] of canvas.entries()) {
          const t0 = cr(over(today, cv), cv), a0 = cr(over(strong, cv), cv), a1 = cr(over(V['--chat-accent-ink-deep'], cv), cv);
          chk('canvas-cancel@' + i, a0, Math.min(4.5, t0 - 0.01), 'info2');
          chk('canvas-cancel-pressed@' + i, a1, Math.min(4.5, a0 - 0.01), 'info2');
          got.cvLow = (got.cvLow || 0) + (a0 < 4.5 ? 1 : 0); got.cvToday = (got.cvToday || 0) + (t0 < 4.5 ? 1 : 0); got.cvN = (got.cvN || 0) + 1;
        }
        chk('recv-outline', cr(over(V['--chat-accent-ink-recv'], recv), recv), 3, 'outline');
        chk('sent-outline', cr(over(V['--chat-accent-ink-sent'], sentCard), sentCard), 3, 'outline');
        chk('fill-on-track', cr(over(V['--chat-accent-ink-recv'], recv), over(trackR, recv)), 3, 'outline');
        /* ★ r1 MINOR-5: the SENT file card's track and the photo ring's track (the tile stands on the received ground) */
        chk('fill-on-sent-track', cr(over(V['--chat-accent-ink-recv'], sentCard), over(trackS, sentCard)), 3, 'outline');
        chk('ring-on-track', cr(over(V['--chat-accent-ink-recv'], recv), over(trackRing, recv)), 3, 'outline');
        /* ★ r1 MINOR-3: a FILLED button must read as a shape on the received card (Graphite dark measured 1.06) */
        chk('fill-vs-recv-card', cr(fillR, recv), 1.5, 'shape');
        chk('fill-vs-sent-card', cr(over(V['--chat-accent-fill'], sentCard), sentCard), null, 'info');
      }
    }
    root.removeAttribute('data-chat-sent'); root.setAttribute('data-chat-ground', 'flat'); root.setAttribute('data-theme', 'light');
    got.n = nCombos; got.worst = { label: +worst.label.toFixed(2), at: worst.labelAt, outline: +worst.outline.toFixed(2), oAt: worst.outlineAt, shape: +worst.shape.toFixed(2), sAt: worst.shapeAt, fillVsSent: +worst.info.toFixed(2), iAt: worst.infoAt };
    got.cvMin = +worst.info2.toFixed(2);
    r.contrast = nCombos === 98 && low.length === 0;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20F W-3 (#1443 · #1444): every in-bubble control on the chat accent — the card buttons (both sides, every listed action) take --_fill / -hover / -pressed / --_on-fill / --_ink(-sent) / --_outline / --_tonal from --chat-accent*, the badge + on-tile ✕ + transfer fill + Tap to download + the photo tile line / ring / Download all too, all inside the color-mix guard; destructive, the failed badge and disabled Pay keep theirs; the token VALUES give labels ≥ 4.5 and outlines ≥ 3 over ' + got.n + ' / 98 combinations (worst ' + JSON.stringify(got.worst) + ') — '
    + ' MIN ' + JSON.stringify(got.min) + ' canvas Cancel below 4.5: ' + got.cvLow + ' / ' + got.cvN + ' stops (today\'s blue ' + got.cvToday + ', min ' + got.cvMin + ') ' + JSON.stringify({ r, got: { chainBad: got.chainBad, media: got.media, exc: got.exc, unguarded: got.unguarded, labels: Object.values(r).every((v) => v === true) ? undefined : got.labels } }) + (low.length ? ' LOW(' + low.length + '): ' + low.slice(0, 400).join('; ') : ''));
}
