/* ==== S15 unit E v2 — #1301 (Damir 15:53: "a moving effect like WhatsApp, moving in from the direction of the composer"):
 * MY send RISES on the BUILT chat.html (jsdom, C#'s pushes only). jsdom has no layout, so the log box gets a stub layout
 * (scrollHeight = 40 px a row, clientHeight 800): the rise height is the scrollHeight the render ADDED (measured).
 * Behaviour, executed:
 *   send    — typing + Send emits ixian:chat:<text>; C#'s addMe → #messages[data-rise] with --rise-h = the added 40 px and
 *             the on-screen rows (the new one included) carry data-rise-row;
 *   history — the open paints my old rows with no rise; a load-more PREPEND between my send and its addMe neither rises
 *             nor spends the window;
 *   replay  — a re-render ~60 ms in re-marks the REBUILT rows and sets a negative --rise-delay (continue, not restart);
 *   done    — after the 200 ms the attribute + vars are gone; an incoming row never starts a rise; a second sent row
 *             (another device) without a new send never starts one;
 *   strip   — ★ S15 #46 r1 E MINOR-4 (behaviour now): the strip's Send (mediaPicked → the disc → ixian:mediaSend) opens a
 *             MULTI window — two rows C# pushes back one after the other both rise; the device walk row S15-RISE checks
 *             the photos;
 *   ★ S15 #46 r1 — exact --rise-h = 40px; per-row stub rects: a row above (screen + h) stays unmarked, every other row is
 *             marked; the stub scrollHeight grows by --rise-h while rows carry data-rise-row (a transform grows the
 *             scrollable box) → a send DURING a rise starts from h + what is left (m-1); guards: an incoming row while
 *             armed (no rise, the window kept), a row taller than the screen (cap), a re-flush and a peer switch STOP a
 *             running rise (m-3) and a peer switch spends the window;
 *   scrolled— scrolled up (not pinned) → no rise; reflush / quiet window / reduced motion → none; the built CSS carries
 *             the keyframes on [data-rise-row] and its own reduced-motion animation:none.
 * Deliberate breaks (S15 E v2): see the S15 handoff. ==== */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = b2Kit(h);
  const { JPG } = b1Kit(h);   // the vetted strip thumb (FILE_THUMB_RE)
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;
  const me = (id, text, ts) => ['addMe', id, 'addrMe', 'Me', '', text, String(ts), 'True', 'True', 'True', 'False', 'False'];
  const them = (id, text, ts) => ['addThem', id, 'addrPeer', 'Bob', '', text, String(ts), 'True', 'True', 'True', 'False', 'False'];
  const docs = [];
  const open = async (opts = {}) => {
    const s = await K.boot('chat.html', opts);
    docs.push(s);
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    s.push('clearMessages', 'false');
    const items = [them('h1', 'hello', T0), me('h2', 'my old words', T0 + 60), me('h3', 'more old words', T0 + 120)].map(([f, ...a]) => ({ f, a }));
    s.push('addMessages', JSON.stringify({ strs: [], items }), 'append');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(120);
    return s;
  };
  const row = (s, id) => s.d.querySelector('#messages [data-msgid="' + id + '"]');
  /* a stub layout: 40 px a row (a row with msgid "big" = 900), an 800 px screen, box top 0; scrollTop clamps like a browser;
     ★ S15 #46 r1 m-1: while rows carry data-rise-row their transform grows the scrollable box by --rise-h (the inflation a
     re-render must not measure); each child's rect = its offset − scrollTop (per-row rects for markRise's stop) */
  const hOf = (n) => (n.dataset && n.dataset.msgid === 'big' ? 900 : 40);
  const lay = (s) => {
    const box = s.d.getElementById('messages');
    const flow = () => { let y = 0; for (const n of box.children) y += hOf(n); return y; };
    let st = 0;
    Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => flow() + (box.querySelector(':scope > [data-rise-row]') ? (parseFloat(box.style.getPropertyValue('--rise-h')) || 0) : 0) });
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 800 });
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => st, set: (v) => { st = Math.max(0, Math.min(Number(v) || 0, box.scrollHeight - box.clientHeight)); } });
    /* the scrollTop markRise measured at: the boot re-pin (#334, a rAF that a real tap cancels — click() sends no
       pointer event) may move it after the mark */
    const setA = box.setAttribute.bind(box);
    box.setAttribute = (k, v) => { if (k === 'data-rise') box.markSt = st; return setA(k, v); };
    const base = s.W.Element.prototype.getBoundingClientRect;
    s.W.Element.prototype.getBoundingClientRect = function () {
      if (this === box) return { top: 0, bottom: 800, left: 0, right: 400, width: 400, height: 800 };
      if (this.parentNode === box) {
        let y = 0; for (const n of box.children) { if (n === this) break; y += hOf(n); }
        const top = y - st; return { top, bottom: top + hOf(this), left: 0, right: 400, width: 400, height: hOf(this) };
      }
      return base.call(this);
    };
    return box;
  };
  const rectsOk = (s) => {   // every child marked iff its bottom reaches (screen top − h); at least one row above stays unmarked
    const box = s.d.getElementById('messages');
    const h = parseFloat(riseH(s));
    let unmarked = 0;
    for (const n of box.children) {
      const want = n.getBoundingClientRect().bottom + box.scrollTop - box.markSt >= -h;
      if (want !== n.hasAttribute('data-rise-row')) return false;
      if (!want) unmarked++;
    }
    return unmarked > 0;
  };
  const many = (n) => Array.from({ length: n }, (_, i) => me('L' + i, 'line ' + i, T0 + 200 + i)).map(([f, ...a]) => ({ f, a }));
  const rising = (s) => s.d.getElementById('messages').hasAttribute('data-rise');
  const riseH = (s) => s.d.getElementById('messages').style.getPropertyValue('--rise-h');
  const riseDelay = (s) => parseFloat(s.d.getElementById('messages').style.getPropertyValue('--rise-delay') || '0');
  const marked = (s, id) => { const r = row(s, id); return !!r && r.hasAttribute('data-rise-row'); };
  const send = (s, text) => {
    const input = s.d.querySelector('.c-composer__input');
    input.value = text;
    input.dispatchEvent(new s.W.Event('input', { bubbles: true }));
    s.d.querySelector('.c-composer__action').click();
  };
  const r = {};
  try {
    {
      const s = await open(); lay(s);
      r.historyNone = !!row(s, 'h2') && !rising(s);
      send(s, 'fresh words');
      r.verb = s.sent.includes('ixian:chat:' + encodeURIComponent('fresh words'));
      s.push('addMessages', JSON.stringify({ strs: [], items: [{ f: 'addMe', a: me('p1', 'much older words', T0 - 4000).slice(1) }] }), 'prepend');
      s.push('messagesDone', 'false');
      await sleep(40);
      r.prependNone = !!row(s, 'p1') && !rising(s);
      s.push(...me('n1', 'fresh words', NOW));
      await sleep(40);
      r.sendRise = rising(s) && riseH(s) === '40px' && marked(s, 'n1') && marked(s, 'h2');   // ★ S15 #46 r1: exactly the added 40 px
      const firstNode = row(s, 'n1');
      await sleep(20);
      s.push(...them('x1', 'their reply', NOW + 1));   // a re-render ~60 ms in (every row node is rebuilt)
      await sleep(30);
      const d1 = riseDelay(s);
      r.replay = row(s, 'n1') !== firstNode && marked(s, 'n1') && d1 < -20 && d1 > -200;
      await sleep(260);
      r.done = !rising(s) && !riseH(s) && !s.d.querySelector('#messages [data-rise-row]');
      s.push(...them('x2', 'later', NOW + 3));
      await sleep(40);
      r.incomingNone = !!row(s, 'x2') && !rising(s);
      s.push(...me('n2', 'from my other device', NOW + 4));   // no new send
      await sleep(40);
      r.onceNone = !!row(s, 'n2') && !rising(s);
      r.errs = s.errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    }
    {
      const s = await open(); lay(s);
      send(s, 'reflushed');
      s.push('clearMessages', 'false');
      const items = [them('h1', 'hello', T0), me('h2', 'my old words', T0 + 60), me('r1', 'reflushed', NOW)].map(([f, ...a]) => ({ f, a }));
      s.push('addMessages', JSON.stringify({ strs: [], items }), 'append');
      s.push('messagesDone');
      await sleep(60);
      r.reflushNone = !!row(s, 'r1') && !rising(s);
    }
    {
      const s = await open(); lay(s);
      s.push('clearMessages', 'false');
      s.push(...me('h2', 'my old words', T0 + 60));
      await sleep(320);
      send(s, 'early');
      s.push(...me('q1', 'early', NOW));
      await sleep(40);
      r.quietNone = !!row(s, 'q1') && !rising(s);
    }
    {
      const s = await open(); const box = lay(s);
      Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => 40 * 400 + box.children.length * 40 });   // a long history, read from the top (the new row still ADDS 40 px)
      box.scrollTop = 0;
      send(s, 'while reading');
      s.push(...me('u1', 'while reading', NOW));
      await sleep(40);
      r.scrolledNone = !!row(s, 'u1') && !rising(s);
    }
    {
      const s = await open({ reduce: true }); lay(s);
      send(s, 'calm');
      s.push(...me('m1', 'calm', NOW));
      await sleep(40);
      r.reduceNone = !!row(s, 'm1') && !rising(s);
      const html = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
      r.css = /@keyframes c-send-rise \{ from \{ transform: translateY\(var\(--rise-h, 0px\)\); \} to \{ transform: none; \} \}/.test(html)
        && /#messages\[data-rise\] > \[data-rise-row\]:not\(\[data-mention-pulse\]\) \{\s*animation: c-send-rise var\(--duration-200\) var\(--easing-decelerate\) both;\s*animation-delay: var\(--rise-delay, 0ms\);/.test(html)
        && /@media \(prefers-reduced-motion: reduce\) \{\s*#messages\[data-rise\] > \[data-rise-row\]:not\(\[data-mention-pulse\]\) \{ animation: none; \}\s*\}/.test(html)   /* ★ S15 #46 r1 n-1: the same specificity */
        && !/opacity/.test((html.match(/@keyframes c-send-rise[^}]*\}[^}]*\}/) || [''])[0]);
    }
    /* ★ S15 #46 r1 — the new cases */
    {   // per-row rects: a long log (> a screen) — only rows reaching (screen top − h) rise
      const s = await open(); lay(s);
      s.push('addMessages', JSON.stringify({ strs: [], items: many(30) }), 'append');
      s.push('messagesDone');
      await sleep(60);
      /* the shell's clock at 1/10 speed for this case (jsdom timers overshoot under load; the 200 ms must not run out
         between the two sends) — riseClear's own setTimeout is real time: 260 ms, after the checks below */
      /* ★ #46 r2 (M-2): the shell's clock FROZEN for this case, moved by hand — the rise height of the second send is then
         exact: at e = 20 ms of a 40 px rise, cubic-bezier(0,0,0,1) (x = t³, y = 3t² − 2t³) leaves 40·(1 − y) = 22.15 px,
         so h2 = 62.15 (a linear remainder gives 76, none gives 40) */
      const pf = s.W.performance; const t0 = pf.now(); let clock = t0;
      pf.now = () => clock;
      send(s, 'tall log');
      s.push(...me('t1', 'tall log', NOW));
      await sleep(20);
      r.rects = rising(s) && riseH(s) === '40px' && rectsOk(s);
      /* m-1: a second send early in the rise — measured on the un-inflated box, it starts from 40 + what is left */
      clock = t0 + 20;
      send(s, 'second');
      s.push(...me('t2', 'second', NOW + 1));
      await sleep(20);   // its render (a rAF) lands well inside the first rise's 200 ms
      const h2 = parseFloat(riseH(s));
      r.riseDuring = rising(s) && Math.abs(h2 - 62.15) < 1 && riseDelay(s) === 0 && marked(s, 't2') && rectsOk(s);
    }
    {   // an incoming row while armed: no rise, the window is NOT spent — my row after it still rises
      const s = await open(); lay(s);
      send(s, 'armed');
      s.push(...them('i1', 'their words', NOW));
      await sleep(40);
      const quiet = !!row(s, 'i1') && !rising(s);
      s.push(...me('i2', 'armed', NOW + 1));
      await sleep(30);
      r.armedIncoming = quiet && rising(s) && marked(s, 'i2');
    }
    {   // the cap: a row taller than the screen never rises
      const s = await open(); lay(s);
      send(s, 'huge');
      s.push(...me('big', 'huge', NOW));
      await sleep(40);
      r.capNone = !!row(s, 'big') && !rising(s);
    }
    {   // m-3: a re-flush STOPS a running rise at once (and its re-render does not continue it)
      const s = await open(); lay(s);
      send(s, 'then reflush');
      s.push(...me('f1', 'then reflush', NOW));
      await sleep(20);
      const was = rising(s);
      s.push('clearMessages', 'false');
      const stopped = !rising(s) && !s.d.querySelector('#messages [data-rise-row]');
      const items = [them('h1', 'hello', T0), me('f1', 'then reflush', NOW)].map(([f, ...a]) => ({ f, a }));
      s.push('addMessages', JSON.stringify({ strs: [], items }), 'append');
      s.push('messagesDone');
      await sleep(40);
      r.reflushStops = was && stopped && !!row(s, 'f1') && !rising(s);
    }
    {   // m-3: a peer switch stops a running rise; a send armed for peer A never animates the next row
      const s = await open(); lay(s);
      send(s, 'to A');
      s.push(...me('a1', 'to A', NOW));
      await sleep(20);
      const was = rising(s);
      s.push('onChatScreenReady', 'addrOther');
      const stopped = !rising(s) && !s.d.querySelector('#messages [data-rise-row]');
      send(s, 'to A again');
      s.push('onChatScreenReady', 'addrPeer');
      s.push(...me('a2', 'to A again', NOW + 1));
      await sleep(40);
      r.peerNone = was && stopped && !!row(s, 'a2') && !rising(s);
    }
    {   // E MINOR-4: the strip's Send opens a MULTI window — two rows pushed back one by one both rise
      const s = await open(); lay(s);
      s.push('setCaps', 'reply,edit,voice,media');
      const R = (k) => ({ k: String(k), thumb: JPG, w: '2048', h: '1536', kb: '400', kind: 'photo' });
      s.push('mediaPicked', '0f0f0f0f0f0f0f0f', JSON.stringify([R(0), R(1)]));
      await sleep(60);
      const strip = !!s.d.querySelector('#chat-composer > .c-mstrip');
      s.d.querySelector('.c-composer__action').click();
      await sleep(20);
      const went = s.sent.some((v) => v.startsWith('ixian:mediaSend:0f0f0f0f0f0f0f0f:0,1:'));
      s.push(...me('s1', 'photo one', NOW));
      await sleep(30);
      const first = rising(s) && marked(s, 's1');
      await sleep(260);
      s.push(...me('s2', 'photo two', NOW + 1));
      await sleep(30);
      r.stripMulti = strip && went && first && rising(s) && marked(s, 's2');
    }
  } catch (e) {
    r.threw = String(e && e.stack || e);
  } finally {
    for (const s of docs) { try { s.dom.window.close(); } catch (e) {} }
  }
  const keys = ['historyNone', 'verb', 'prependNone', 'sendRise', 'replay', 'done', 'incomingNone', 'onceNone', 'errs', 'reflushNone', 'quietNone', 'scrolledNone', 'reduceNone', 'css',
    'rects', 'riseDuring', 'armedIncoming', 'capNone', 'reflushStops', 'peerNone', 'stripMulti'];   // ★ S15 #46 r1
  ok(!r.threw && keys.every((k) => r[k] === true),
    '★ S15 E v2 (#1301, Damir "like WhatsApp, from the composer") on the BUILT chat shell: the row C# pushes back for MY send RISES — #messages[data-rise] with --rise-h = the height it added and every on-screen row marked (the older rows move up with it, no fade); a re-render inside the 200 ms re-marks the rebuilt rows with a negative --rise-delay; after it everything is cleared; a history batch, a prepend, an incoming row, another device\'s sent row, a re-flush, an old-transport quiet window, a scrolled-up log and reduced motion never rise — ' + JSON.stringify(r));
}
