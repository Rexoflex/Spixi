/* ==== photo1b HV-0 / PO-0 — the four shell lines: developer builds only, fixed words + integers ====
 * Behaviour on the BUILT chat.html in jsdom (a-kit.mjs). The rows, the names and the file names carry hostile text.
 *   WITH <html data-p1> (the head carrier as a developer build sets it): an open (2 photo tiles, 1 voice row, text) whose
 *   messagesDone is followed by two setFileThumb pushes (one with a refused value) and one voiceInfo push BEFORE onChatScreenLoaded,
 *   then one older page:
 *     `[CDPERF] chat-shell build=<n> layout=<n> fade=<n> nodes=<n> photo=2 voice=1`
 *     `[CDPERF] chat-shell late thumbs=2 voice=1 js=<n>` (two setFileThumb pushes — one refused by the handler — and one voiceInfo)
 *     `[P1] shell older insert rows=<n> mode=insert build=<n> swap=<n> fix=<n> fade=<n> ms=<n>`
 *     `[P1] shell older frames n=<n> max=<n>` (≥ 600 ms after it)
 *   each EXACTLY once, each matching its grammar with only [a-z=0-9 ] after the prefix (no message text, no name, no id), no warn
 *   line carries a hostile fragment; the two globals the late count wraps are the ORIGINAL functions again after the present send.
 *   WITHOUT data-p1: none of the four lines appears (the older `[CDPERF] chat-shell n=` line still does), and the globals are
 *   never wrapped (the same function object before and after messagesDone).
 * LIMITS: jsdom has no layout, so every ms reads small; the values' size is the harness's job (harness-history.mjs), not this pin's.
 * Deliberate breaks (#802), each in a full temp copy + build-shells, the pin run with --root (observed 2026-11-18):
 *   (1) onChatScreenLoaded `if (devP1) {` (the two new [CDPERF] lines) → `if (true) {` → red `★ photo1b HV-0 / PO-0 d-lines (no data-p1)`;
 *   (2) the split line `' fade=' + r(sp.fade)` → `' fade=' + sp.fade` → red `… d-lines (data-p1)` (a decimal point breaks the grammar);
 *       (the same on `' js=' + r(late.ms)` is EQUIVALENT — green: cdLateEnd already rounds);
 *   (3) cdLateEnd `if (window[name] === wrap) window[name] = orig;` → `if (false && …)` → red `… d-lines (data-p1)` (restored false);
 *   (4) ★ fix r1 (S-2) the wrap `orig.apply(this, a)` → `orig.apply(this, [])` → red `★ photo1b PO-0 d-lines (fix r1 S-2)` (no picture, flat bars).
 * ★ fix r1 (S-2): the EFFECT of the wrapped pushes under data-p1 (the tile's picture, a refused value, the voice bars) must equal the
 *   run without data-p1.
 * ★ fix r2 (S2-2 / R2-5): two more keys — (a) an open with no onChatScreenLoaded: wrapped, then the originals back by 5.3 s;
 *   (b) a re-flush and a peer switch after the first onChatScreenLoaded never wrap, and only the first open writes a late line.
 *   Breaks (observed 2026-11-18): (5) the backstop `cdLate.timer = setTimeout(cdLateEnd, CD_LATE_MAX_MS);` deleted → red
 *   `★ photo1b PO-0 d-lines (fix r2 S2-2 a)`; (6) the gate `|| chatScreenLoadedOnce` removed → red `… (fix r2 S2-2 b)`;
 *   (7) R2-5 reverted (a null count prints zeros) → red `… (fix r2 S2-2 b)`.
 * ★ fix r4 (SR4-1): the two dev-line changes of fix r3 — a page the burst safety timer painted says its rows; an open the timer
 *   painted writes no `chat-shell build=` line. Breaks: (8) `: olderPageTimerRows;` → `: 0;` and (9) `const sp = openSplit;` →
 *   `const sp = openSplit || {};` — each → red `★ photo1b HV-0 / PO-0 d-lines (fix r4 SR4-1)`. */
import { photo1bKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = photo1bKit(h);
  const { sleep, NOW } = K;
  const T = NOW - 3 * 86400;
  const HOST = ['<img src=x onerror=1>', '</div><script>x</script>', '‮evil', 'Mallory<b>'];
  const items = [];
  for (let i = 0; i < 40; i++) items.push(K.txt('d' + i.toString(16).padStart(4, '0'), i % 3 === 0, T + i * 300, i % 5 === 0 ? HOST[i % 4] : 'text ' + i, { nick: HOST[3] }));
  items.push(K.photo('e0001', false, T + 50 * 300, HOST[0] + '.jpg', '', { nick: HOST[3] }));
  items.push(K.photo('e0002', true, T + 51 * 300, 'b.jpg', ''));
  const voice = K.txt('e0003', false, T + 52 * 300, '', { nick: HOST[3] });
  voice.a[16] = '1200';
  items.push(voice);
  const older = [];
  for (let i = 0; i < 30; i++) older.push(K.txt('f' + i.toString(16).padStart(4, '0'), i % 2 === 0, T - 3000 + i * 60, HOST[i % 4], { nick: HOST[3] }));
  const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAA==';

  const run = async (p1) => {
    const s = await K.boot({ p1 });
    try {
      s.push('onChatScreenReady', 'addrPeer');
      s.push('setChatMode', '0', '0', '', 'False');
      s.push('setCaps', 'reply,edit,voice,media,olderInsert');
      s.push('setPhotoPreviews', 'True');
      s.push('clearMessages', 'true');
      s.push('addMessages', JSON.stringify({ strs: [], items }), 'append');
      const g0 = { t: s.W.setFileThumb, v: s.W.voiceInfo };
      s.push('messagesDone');
      const g1 = { t: s.W.setFileThumb, v: s.W.voiceInfo };
      s.push('setFileThumb', 'e0001', JPG);
      s.push('setFileThumb', 'e0002', 'javascript:window.__pwn=1');   // a refused value (not a data: JPEG) — through the wrap too
      s.push('voiceInfo', 'e0003', '1200', '10,20,30');
      s.push('onChatScreenLoaded');
      await sleep(300);
      const g2 = { t: s.W.setFileThumb, v: s.W.voiceInfo };
      /* ★ fix r1 (S-2): what the wrapped pushes DID — the tile's picture, the refused one's, the wave's bar heights */
      const rowQ = (id, sel) => s.d.querySelector('#messages [data-msgid="' + id + '"] ' + sel);
      const img = rowQ('e0001', 'img');
      const img2 = rowQ('e0002', 'img');
      const bars = [...s.d.querySelectorAll('#messages [data-msgid="e0003"] .c-voice__bar')].map((b) => b.style.getPropertyValue('--voice-h')).join(',');
      const effect = { src: img ? img.getAttribute('src') || '' : null, refused: img2 ? img2.getAttribute('src') || '' : null, bars, pwn: !!s.W.__pwn };
      K.page(s, older, 'true');
      await sleep(900);
      return { warns: s.warns.slice(), errs: s.errs.slice(), wrapped: g1.t !== g0.t || g1.v !== g0.v, restored: g2.t === g0.t && g2.v === g0.v, p1: s.d.documentElement.hasAttribute('data-p1'), effect };
    } finally { s.close(); }
  };
  const on = await run(true);
  const off = await run(false);
  const GRAM = {
    split: /^\[CDPERF\] chat-shell build=\d+ layout=\d+ fade=\d+ nodes=\d+ photo=\d+ voice=\d+$/,
    late: /^\[CDPERF\] chat-shell late thumbs=\d+ voice=\d+ js=\d+$/,
    insert: /^\[P1\] shell older insert rows=\d+ mode=(insert|full) build=\d+ swap=\d+ fix=\d+ fade=\d+ ms=\d+$/,
    frames: /^\[P1\] shell older frames n=\d+ max=\d+$/,
  };
  const PREFIX = {
    split: /^\[CDPERF\] chat-shell build=/, late: /^\[CDPERF\] chat-shell late /, insert: /^\[P1\] shell older insert /, frames: /^\[P1\] shell older frames /,
  };
  const pick = (warns) => Object.fromEntries(Object.keys(PREFIX).map((k) => [k, warns.filter((w) => PREFIX[k].test(w))]));
  const L = pick(on.warns);
  const charsOk = (line) => /^(\[CDPERF\] chat-shell|\[P1\] shell) [a-z=0-9 ]+$/.test(line);
  const hostileHit = on.warns.concat(off.warns).filter((w) => /onerror|<script|‮|Mallory|<b>|e0001|e0003|addrPeer/.test(w));
  const vals = {
    split: L.split[0] && /photo=(\d+) voice=(\d+)/.exec(L.split[0]),
    late: L.late[0] && /thumbs=(\d+) voice=(\d+)/.exec(L.late[0]),
    insert: L.insert[0] && / mode=(\w+) /.exec(L.insert[0]),
  };
  ok(on.p1 && Object.keys(GRAM).every((k) => L[k].length === 1 && GRAM[k].test(L[k][0]) && charsOk(L[k][0]))
     && vals.split && vals.split[1] === '2' && vals.split[2] === '1' && vals.late && vals.late[1] === '2' && vals.late[2] === '1'
     && vals.insert && vals.insert[1] === 'insert' && on.wrapped && on.restored && hostileHit.length === 0 && on.errs.length === 0,
    '★ photo1b HV-0 / PO-0 d-lines (data-p1): each of the four shell lines appears exactly once in its grammar, only [a-z=0-9 ] after its prefix — the open\'s split (photo=2 voice=1), the late media pushes (thumbs=2 voice=1: every push counts, the refused one too), the older page (mode=insert) and its frames line — no hostile text, name or id in any warn line, and the two wrapped globals are the original functions again after the present — '
    + JSON.stringify({ lines: L, wrapped: on.wrapped, restored: on.restored, hostileHit, errs: on.errs.slice(0, 3) }));
  const Loff = pick(off.warns);
  ok(!off.p1 && Object.values(Loff).every((a) => a.length === 0) && off.warns.some((w) => /^\[CDPERF\] chat-shell n=/.test(w)) && !off.wrapped && off.errs.length === 0,
    '★ photo1b HV-0 / PO-0 d-lines (no data-p1): none of the four lines appears (the older `[CDPERF] chat-shell n=` line still does) and setFileThumb / voiceInfo are never wrapped — '
    + JSON.stringify({ lines: Loff, older: off.warns.filter((w) => /CDPERF|\[P1\]/.test(w)).slice(0, 4), wrapped: off.wrapped }));
  /* ★ fix r1 (S-2): the dev wraps pass every argument through — the pushes' effects under data-p1 equal the run without it */
  const flat = (b) => !b || new Set(b.split(',')).size <= 1;
  ok(!!on.effect && !!off.effect && JSON.stringify(on.effect) === JSON.stringify(off.effect) && on.effect.src === JPG && on.effect.refused !== 'javascript:window.__pwn=1'
     && !flat(on.effect.bars) && !on.effect.pwn,
    '★ photo1b PO-0 d-lines (fix r1 S-2): under data-p1 the wrapped setFileThumb / voiceInfo pushes do exactly what they do without it — the photo tile shows the pushed JPEG, a refused value (javascript:) stays refused, the voice row\'s bars take the pushed peaks — ' + JSON.stringify({ on: on.effect, off: off.effect }));

  /* ★ fix r2 (S2-2 / R2-5): the late count wraps the two globals ONLY on a document's first open, and never for long.
     (a) an open with NO onChatScreenLoaded: wrapped after messagesDone, the originals back after the 5 s backstop (5.3 s);
     (b) after the first onChatScreenLoaded, a re-flush (clearMessages → addMessages → messagesDone) and a peer switch
         (onChatScreenReady → … → messagesDone → onChatScreenLoaded) never wrap them, and no second `late` line is written
         (no count ran — no fixed zeros). */
  {
    const s = await K.boot({ p1: true });
    let a = null;
    try {
      const g0 = { t: s.W.setFileThumb, v: s.W.voiceInfo };
      s.push('onChatScreenReady', 'addrPeer');
      s.push('clearMessages', 'true');
      s.push('addMessages', JSON.stringify({ strs: [], items: items.slice(0, 10) }), 'append');
      s.push('messagesDone');
      const wrapped = s.W.setFileThumb !== g0.t && s.W.voiceInfo !== g0.v;
      await sleep(5300);
      a = { wrapped, back: s.W.setFileThumb === g0.t && s.W.voiceInfo === g0.v, late: s.warns.filter((w) => /^\[CDPERF\] chat-shell late /.test(w)).length };
    } finally { s.close(); }
    ok(a && a.wrapped && a.back && a.late === 0,
      '★ photo1b PO-0 d-lines (fix r2 S2-2 a): an open whose onChatScreenLoaded never comes wraps setFileThumb / voiceInfo at messagesDone and puts the originals back by the 5 s backstop (read at 5.3 s); no late line — ' + JSON.stringify(a));
  }
  {
    const s = await K.boot({ p1: true });
    let b = null;
    try {
      s.push('onChatScreenReady', 'addrPeer');
      s.push('clearMessages', 'true');
      s.push('addMessages', JSON.stringify({ strs: [], items: items.slice(0, 10) }), 'append');
      s.push('messagesDone');
      s.push('onChatScreenLoaded');
      await sleep(300);
      const g0 = { t: s.W.setFileThumb, v: s.W.voiceInfo };
      const seen = [];
      s.push('clearMessages', 'true');   // a re-flush of the same chat
      s.push('addMessages', JSON.stringify({ strs: [], items: items.slice(0, 12) }), 'append');
      s.push('messagesDone');
      seen.push(s.W.setFileThumb === g0.t && s.W.voiceInfo === g0.v);
      s.push('onChatScreenReady', 'addrOther');   // a peer switch (the desktop reuses the document)
      s.push('clearMessages', 'true');
      s.push('addMessages', JSON.stringify({ strs: [], items: items.slice(0, 8) }), 'append');
      s.push('messagesDone');
      seen.push(s.W.setFileThumb === g0.t && s.W.voiceInfo === g0.v);
      s.push('onChatScreenLoaded');
      await sleep(300);
      b = { neverWrapped: seen.every(Boolean), seen, late: s.warns.filter((w) => /^\[CDPERF\] chat-shell late /.test(w)).length };
    } finally { s.close(); }
    ok(b && b.neverWrapped && b.late === 1,
      '★ photo1b PO-0 d-lines (fix r2 S2-2 b): after the first onChatScreenLoaded a re-flush and a peer switch never wrap setFileThumb / voiceInfo, and only the first open writes a late line — ' + JSON.stringify(b));
  }

  /* ★ fix r4 (SR4-1): the two dev-line behaviours of fix r3 — (a) an older page the 250 ms burst SAFETY TIMER painted before its
     messagesDone says its own row count (`rows=30`, never `rows=0`: R3-4 `olderPageTimerRows`); (b) an open the timer painted
     before messagesDone writes NO `[CDPERF] chat-shell build=` line (no fixed zeros: the `if (sp)` guard), while the control open
     (pushed without a pause) writes exactly one. */
  {
    let c = null;
    const s = await K.boot({ p1: true });
    try {
      s.push('onChatScreenReady', 'addrPeer');
      s.push('setChatMode', '0', '0', '', 'False');
      s.push('setCaps', 'reply,edit,voice,media,olderInsert');
      s.push('setPhotoPreviews', 'True');
      s.push('clearMessages', 'true');
      s.push('addMessages', JSON.stringify({ strs: [], items: items.slice(0, 20) }), 'append');
      await sleep(450);   // > the 250 ms safety timer: the open paints without messagesDone
      s.push('messagesDone');
      s.push('onChatScreenLoaded');
      await sleep(300);
      const openTimer = s.warns.filter((w) => /^\[CDPERF\] chat-shell build=/.test(w)).length;
      s.push('addMessages', JSON.stringify({ strs: [], items: older }), 'prepend');
      await sleep(450);   // > the safety timer: the page paints without messagesDone
      const w0 = s.warns.length;
      s.push('messagesDone', 'true');
      await sleep(50);
      const pageLines = s.warns.slice(w0).filter((w) => /^\[P1\] shell older insert /.test(w));
      c = { openTimer, openControl: on.warns.filter((w) => /^\[CDPERF\] chat-shell build=/.test(w)).length, pageLines };
    } finally { s.close(); }
    ok(c && c.openTimer === 0 && c.openControl === 1 && c.pageLines.length === 1 && / rows=30 /.test(c.pageLines[0]),
      '★ photo1b HV-0 / PO-0 d-lines (fix r4 SR4-1): a page the burst safety timer painted says rows=30 (its own rows); an open the timer painted writes no chat-shell build= line (the control open writes one) — ' + JSON.stringify(c));
  }
}
