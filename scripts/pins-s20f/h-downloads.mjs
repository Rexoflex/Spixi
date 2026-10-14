/* ==== S20F W-12 (#1409; #46 r1 C-3 / C-4 / C-8 + survivors #3 / #4) — the Downloads list loads without jitter ====
 * On the BUILT settings.html (jsdom, the REAL Downloads sublevel):
 *   (1) APPEND: after clearFiles, files pushed SLOWER than the 80 ms settle (150 ms apart) all stay; the same name twice =
 *       one row; only clearFiles starts a new list.
 *   (2) FIRST LOAD: no empty state on a fresh screen, nor ever while a first file comes 250 ms after clearFiles; a
 *       clearFiles alone paints the empty state only after the 400 ms quiet window (not at 200, yes at 600).
 *   (3) RE-PUSH (C-8): on a screen that already painted, a clearFiles alone (delete / Delete all) is the 80 ms settle —
 *       the empty state is up at 200 ms.
 *   (4) RESERVED: a photos-only list shows the controls row from its first paint with the From chip laid out but
 *       COMPUTED visibility: hidden + disabled + aria-hidden; phase 2 fills that chip and nothing above the list appears
 *       or disappears (the avatar push neither). A RE-OPENED screen reserves again until ITS phase 2 (#4).
 *   (5) THE TRADES: phase 2 with no sender collapses the row (C-3, the one remaining move); no phase 2 at all → the row is
 *       released 12 s after the first non-empty paint (C-4 / r2 MINOR-3: still reserved at 11.5 s, gone at 12.5 s).
 * DELIBERATE BREAKS (each run once, failed for exactly that reason, restored — see the S20F home reports):
 *   ① addFile `dlBuf = dlLast.slice()` → `dlBuf = []` → append.   ② DL_EMPTY_MS 400 → 80 → firstLoad.
 *   ③ settings-app.js `const reserve = …` → `false` → reserved.   ④ the `dlFirst &&` dropped from the wait → rePush.
 *   ⑤ the new screen's `dlSendersIn = false` dropped → reopen.   ⑥ settings-app.css `[data-reserved] { visibility: hidden }`
 *   deleted → reserved (computed visibility).   ⑦ the backstop setTimeout removed → backstop.   ⑧ the backstop back to 4 s → backstop (released at 11.5 s). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await boot('settings.html', { wait: 1500 });
    const { W, d, push } = s;
    push('setCaps', 'settingsApply,downloadsInline');
    push('setNickname', 'Damir');
    await sleep(250);
    const open = async () => {
      const back = d.querySelector('.c-settings-dl .c-topbar button'); if (back) { back.click(); await sleep(350); }
      const b = d.querySelector('[data-setting-key="downloads"]'); if (b) b.click(); await sleep(60);
    };
    const shown = (sel) => { const e = d.querySelector(sel); return !!e && !e.hidden && !e.closest('[hidden]'); };
    const names = () => [...d.querySelectorAll('.c-settings-dl__row')].map((x) => x.dataset.name).sort().join();
    const chip = () => d.querySelector('.c-settings-dl__from-btn');
    const reservedNow = () => !!chip() && 'reserved' in chip().dataset && chip().disabled && chip().getAttribute('aria-hidden') === 'true' && !chip().hidden
      && W.getComputedStyle(chip()).visibility === 'hidden' && shown('.c-settings-dl__controls');
    const above = () => { const list = d.querySelector('.c-settings-dl__list'); const out = []; for (let e = list && list.previousElementSibling; e; e = e.previousElementSibling) if (!e.hidden) out.push(e.className); return out.join('|'); };
    const T = Math.floor(Date.now() / 1000);
    const photos = () => { push('clearFiles'); push('addFile', 'p1.jpg', String(T - 10), '2048'); push('addFile', 'p2.jpg', String(T - 20), '2048'); };
    /* (2) first load, a file behind the clear */
    await open();
    n.e0 = shown('.c-settings-dl__empty');
    let emptyEver = false;
    const mo = new W.MutationObserver(() => { if (shown('.c-settings-dl__empty')) emptyEver = true; });
    mo.observe(d.body, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    push('clearFiles');
    await sleep(250); push('addFile', 'late.pdf', String(T - 5), '2048');
    await sleep(250); n.late = names(); n.emptyEver = emptyEver; mo.disconnect();
    /* (2) first load, nothing behind the clear */
    await open();
    push('clearFiles');
    await sleep(200); n.e200 = shown('.c-settings-dl__empty');
    await sleep(400); n.e600 = shown('.c-settings-dl__empty');
    r.firstLoad = n.e0 === false && n.emptyEver === false && n.late === 'late.pdf' && n.e200 === false && n.e600 === true;
    /* (1) slow pushes append; (3) the re-push is quick */
    await open();
    push('clearFiles');
    push('addFile', 'a.pdf', String(T - 10), '2048');
    await sleep(150); push('addFile', 'b.pdf', String(T - 20), '2048');
    await sleep(150); push('addFile', 'c.pdf', String(T - 30), '2048');
    await sleep(150); push('addFile', 'b.pdf', String(T - 20), '4096');
    await sleep(150); n.slow = names();
    push('clearFiles'); push('addFile', 'z.pdf', String(T - 40), '10');
    await sleep(150); n.fresh = names();
    r.append = n.slow === 'a.pdf,b.pdf,c.pdf' && n.fresh === 'z.pdf';
    push('clearFiles');
    await sleep(200); n.rePush200 = shown('.c-settings-dl__empty'); n.rePushRows = names();
    r.rePush = n.rePush200 === true && n.rePushRows === '';
    /* (4) reserved from the first paint; phase 2 fills it */
    await open();
    photos(); await sleep(150);
    n.before = { reserved: reservedNow(), vis: chip() && W.getComputedStyle(chip()).visibility, above: above() };
    push('setDownloadSenders', JSON.stringify([['p1.jpg', 'Ana', 's1'], ['p2.jpg', 'Bob', 's2']]));
    await sleep(60);
    n.after = { filled: !!chip() && !('reserved' in chip().dataset) && !chip().disabled && !chip().hasAttribute('aria-hidden') && !chip().hidden && W.getComputedStyle(chip()).visibility !== 'hidden' && /Everyone/.test(chip().textContent), above: above() };
    push('setDownloadAvatars', JSON.stringify([['s1', 'data:image/png;base64,iVBORw0KGgo=']]));
    await sleep(60); n.avatars = above();
    r.reserved = n.before.reserved && n.after.filled && shown('.c-settings-dl__controls') && n.before.above === n.after.above && n.avatars === n.after.above;
    /* (4) #4: a re-opened screen reserves again until ITS phase 2 */
    await open();
    photos(); await sleep(150);
    n.reopen0 = reservedNow();
    push('setDownloadSenders', JSON.stringify([['p1.jpg', 'Ana', 's1']]));
    await sleep(60);
    n.reopen1 = !!chip() && !('reserved' in chip().dataset) && !chip().hidden;
    r.reopen = n.reopen0 === true && n.reopen1 === true;
    /* (5) C-3: phase 2 with no sender collapses the row */
    await open();
    photos(); await sleep(150);
    n.ns0 = reservedNow();
    push('setDownloadSenders', '[]'); await sleep(60);
    n.ns1 = shown('.c-settings-dl__controls');
    r.noSender = n.ns0 === true && n.ns1 === false;
    /* (5) C-4: no phase 2 at all → released by the backstop */
    await open();
    photos(); await sleep(150);
    n.bs0 = reservedNow();
    await sleep(11350); n.bs36 = reservedNow();
    await sleep(1000); n.bs44 = { reserved: !!chip() && 'reserved' in chip().dataset, controls: shown('.c-settings-dl__controls'), chip: !!chip() && !chip().hidden };
    r.backstop = n.bs0 === true && n.bs36 === true && !n.bs44.reserved && !n.bs44.controls && !n.bs44.chip;
    r.noErr = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  } catch (e) { r.threw = e.message; } finally { if (s) { try { s.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, '★ S20F W-12 (#1409): ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 1000));
  c('firstLoad', 'first load: no empty state on the fresh screen, none while a file comes 250 ms after clearFiles; a clearFiles alone paints it only after the 400 ms window (not at 200, yes at 600)');
  c('append', 'files pushed 150 ms apart (slower than the settle) ALL stay — a settled paint is appended to, the same name replaces its row, only clearFiles starts a new list');
  c('rePush', 'C-8: a re-push on a screen that already painted (delete / Delete all) is the 80 ms settle — the empty state is up at 200 ms');
  c('reserved', 'the From row is reserved from the first paint of a photos-only list (computed visibility hidden, disabled, aria-hidden) and phase 2 fills it — nothing above the list appears or disappears, the avatar push neither');
  c('reopen', '#4: a re-opened Downloads screen reserves the From row again until ITS phase 2');
  c('noSender', 'C-3 (the recorded trade): phase 2 with no sender collapses the reserved row');
  c('backstop', 'C-4 / r2 MINOR-3: no phase 2 at all → the reserve holds at 11.5 s and is released by 12.5 s (the 12 s backstop)');
  c('noErr', 'no page error');
}
