/* ==== SESSION 9 (B2 r1) — THE HOME SHELL: PHOTO EXCERPT + A-FLASH bootDropped ====
 * On the BUILT index.html (jsdom):
 *   · addChat excerptKind "photo" (🟡 NEW value, A1) → the row draws the `photo` glyph (a file keeps the paperclip)
 *     and the PUSHED text ("Photo" / "3 photos" / a caption); a group keeps its sender first
 *   · A-FLASH (🟡 NEW verb `ixian:bootDropped`, A3): sent EXACTLY ONCE per document — when the boot cover's fade
 *     ENDS (transitionend on the cover, before the backstop), or by the 260 ms backstop when no transitionend
 *     comes, or AT ONCE under reduced motion
 * Deliberate breaks: see the S9 B2 r1 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const n = (s) => s.sent.filter((c) => c === 'ixian:bootDropped').length;
  try {
    /* —— photo excerpt —— */
    let s = await boot('index.html');
    const TS = String(Math.floor(Date.now() / 1000));
    const row = (a, name, ex, kind, ek, snd) => { const r = [a, name, TS, 'img/spixiavatar.png', 'false', ex, '', '1', kind, 'False', ek]; if (snd !== undefined) r.push(snd); return r; };
    s.push('clearChats');
    for (const r of [
      row('p1', 'Ana', 'Photo', '', 'photo', ''),
      row('p2', 'Ben', '3 photos', '', 'photo', ''),
      row('g1', 'Hike group', 'Lake at sunrise', 'group', 'photo', 'Cene'),
      row('f1', 'Dora', 'report.pdf', '', 'file', ''),
    ]) s.push('addChat', ...r);
    s.push('clearChatsDone');
    await sleep(350);
    const I = s.W.SpixiIcons;
    const pathOf = (name) => { const i = I && I.icon(name); return i ? [...i.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|') : '?'; };
    const ex = (name) => { const it = [...s.d.querySelectorAll('.c-chatlist-item')].find((x) => (x.querySelector('.c-chatlist-item__name') || {}).textContent === name); return it && it.querySelector('.c-excerpt'); };
    const glyph = (e) => (e ? [...e.querySelectorAll(':scope > svg path, svg path')].map((p) => p.getAttribute('d')).join('|') : '');
    const txt = (e) => ((e && e.querySelector('.c-excerpt__text')) || {}).textContent;
    const a = ex('Ana'), b = ex('Ben'), g = ex('Hike group'), f = ex('Dora');
    ok(!!a && a.dataset.type === 'photo' && glyph(a) === pathOf('photo') && txt(a) === 'Photo' && txt(b) === '3 photos',
      '★ S9 photo excerpt: kind "photo" draws the photo glyph and the pushed text — ' + JSON.stringify([a && a.dataset.type, txt(a), txt(b)]));
    ok(!!g && g.firstElementChild && g.firstElementChild.classList.contains('c-excerpt__sender') && txt(g) === 'Lake at sunrise' && glyph(g) === pathOf('photo'),
      '★ S9 photo excerpt: a group photo keeps its sender first, then the glyph, then the caption');
    ok(!!f && f.dataset.type === 'file' && glyph(f) === pathOf('file-isr') && glyph(f) !== pathOf('photo'),
      '★ S9 photo excerpt: a file row keeps its paperclip (old kinds unchanged)');
    s.dom.window.close();

    /* —— bootDropped: transitionend path (before the backstop) —— */
    s = await boot('index.html', { wait: 0 });
    let cover = null;
    for (let i = 0; i < 400 && !cover; i++) { const c = s.d.getElementById('app-boot'); if (c && c.style.opacity === '0') cover = c; else await sleep(5); }
    const beforeEnd = n(s);
    if (cover) cover.dispatchEvent(new s.W.Event('transitionend', { bubbles: true }));
    await sleep(40);   // the bridge outbox drains one command per macrotask — well inside the 260 ms backstop
    const afterEnd = n(s);
    const gone = !s.d.getElementById('app-boot');
    await sleep(500);
    ok(!!cover && beforeEnd === 0 && afterEnd === 1 && gone && n(s) === 1,
      '★ S9 A-FLASH: ixian:bootDropped goes when the cover fade ENDS (not before), and the 260 ms backstop does not send it twice — ' + JSON.stringify({ found: !!cover, beforeEnd, afterEnd, gone, total: n(s) }));
    s.dom.window.close();

    /* —— bootDropped: backstop path (no transitionend in jsdom) —— */
    s = await boot('index.html', { wait: 0 });
    let faded = false;
    for (let i = 0; i < 400 && !faded; i++) { const c = s.d.getElementById('app-boot'); if (c && c.style.opacity === '0') faded = true; else await sleep(5); }
    const at0 = n(s);
    await sleep(120);
    const at120 = n(s);
    await sleep(400);
    ok(faded && at0 === 0 && at120 === 0 && n(s) === 1,
      '★ S9 A-FLASH: with no transitionend the 260 ms backstop sends ixian:bootDropped once (not at the fade start) — ' + JSON.stringify({ at0, at120, total: n(s) }));
    s.dom.window.close();

    /* —— bootDropped: reduced motion → at once —— */
    s = await boot('index.html', { wait: 0, reduce: true });
    let removed = false;
    for (let i = 0; i < 400 && !removed; i++) { if (s.d.readyState === 'complete' && !s.d.getElementById('app-boot')) removed = true; else await sleep(5); }
    const atRemove = n(s);
    await sleep(500);
    ok(removed && atRemove === 1 && n(s) === 1,
      '★ S9 A-FLASH: reduced motion → the cover goes at once and ixian:bootDropped is sent with it, once — ' + JSON.stringify({ atRemove, total: n(s) }));
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 r1 home pins threw: ' + (e && e.stack || e));
  }
}
