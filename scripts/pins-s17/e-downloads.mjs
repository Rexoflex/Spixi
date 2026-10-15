/* ==== S17 E (#1336) — Account › Downloads (premium) + Contributors (thanks) ====
 * On the BUILT settings.html (jsdom; C# pushes via executeUiCommand; ixian: verbs captured), through the REAL sublevels:
 *   · SUMMARY: "{n} files · {total}" over the WHOLE folder; the storage bar = one segment per kind (photos first, then
 *     by size), the legend names each kind with its size (PDF / ZIP = the one format; Photos); a re-push never replays
 *     the growth (data-grown); the red "Delete all downloads" → the locked confirm → ixian:deleted THEN
 *     ixian:loadDownloads (the list comes back), in that order
 *   · FILTERS: All · Photos · Files only when both kinds are listed (Photos → only grid cells, Files → only rows);
 *     the From chip only with a known sender
 *   · LIST: day groups ("Today" + the day's size); photos = grid cells (aria-label "name, size", a size badge, a
 *     format tag), other files = rows on one card with the kind tile + "from {name} · size · time"; NO per-row
 *     delete / chat buttons; a peer name with markup lands as TEXT
 *   · SELECT: "Select" → data-selecting, a tap toggles aria-pressed (never opens), the bar shows "{n} selected";
 *     "Show in chat" only for ONE picked file with a sender → ixian:showDownloadInChat:<encoded name> and select mode
 *     ends; Delete for two → "Delete 2 files?" → one ixian:deleteDownload:<encoded> per file; a right-click (context
 *     menu) on a file outside select mode enters it with that file picked; a plain tap outside select mode opens
 *     (ixian:openDownload:<encoded>)
 *   · CONTRIBUTORS: the topbar floats over a full-bleed header (two decorative ct-l layers, aria-hidden, no text) and
 *     turns solid once scrolled; "Thank you" + the lead; every name a chip whose initial disc is aria-hidden and whose
 *     NAME span carries the name alone; a tap bounces the chip and throws 8 sparks that clean themselves up; each
 *     credit = a kind tile + the label + the FULL source + the licence pill, and no external-link mark (no verb opens one)
 * Deliberate breaks (S17 report): drop the ixian:loadDownloads send → the summary clause fails; open the file on a tap
 * in select mode → the select clause fails; render the initial inside the name span → the contributors clause fails. */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = dKit(h);
  let s = null;
  try {
    s = await boot('settings.html', { wait: 1500 });
    const { W, d, push, sent } = s;
    push('setCaps', 'settingsApply,downloadsInline');
    push('setNickname', 'Damir');
    await sleep(250);
    const hub = d.querySelector('[data-setting-key="downloads"]');
    if (hub) hub.click();
    await sleep(200);
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const T = Math.floor(now.getTime() / 1000);
    const EVIL = '<img src=x onerror=alert(1)>.pdf';
    const list = (extra = []) => {
      push('clearFiles');
      push('addFile', 'photo-1.jpg', String(T - 60), String(184 * 1024));
      push('addFile', 'paper.pdf', String(T - 120), String(1229 * 1024));
      push('addFile', 'build.zip', String(T - 86400), String(340 * 1024));
      push('addFile', 'photo-2.jpg', String(T - 86400 * 3), String(95 * 1024));
      push('addFile', EVIL, String(T - 86400 * 3 - 60), '2048');
      for (const e of extra) push('addFile', ...e);
    };
    list();
    await sleep(200);
    push('setDownloadSenders', JSON.stringify([['paper.pdf', 'Ana', 's1'], ['photo-1.jpg', 'Ana', 's1'], ['build.zip', 'Bob', 's2']]));
    await sleep(80);
    const el = d.querySelector('.c-settings-dl');
    const q = (x) => el && el.querySelector(x);
    const rowsOf = (sel = '') => (el ? [...el.querySelectorAll('.c-settings-dl__row' + sel)].map((x) => x.dataset.name) : []);
    const openOf = (n) => (el ? [...el.querySelectorAll('.c-settings-dl__row')].find((r) => r.dataset.name === n) : null)?.querySelector('.c-settings-dl__open');
    const confirmLast = async () => { const m = [...d.querySelectorAll('.c-modal')].pop(); const b = m ? m.querySelectorAll('.c-modal__actions .c-button') : []; const t = m ? m.textContent : ''; if (b.length) b[b.length - 1].click(); await sleep(450); return t; };

    /* —— summary —— */
    const legend = q('.c-settings-dl__legend') ? [...q('.c-settings-dl__legend').children].map((x) => x.dataset.kind + ':' + x.textContent) : [];
    const segs = q('.c-settings-dl__bar') ? [...q('.c-settings-dl__bar').children].map((x) => x.dataset.kind) : [];
    const sm = {
      count: (q('.c-settings-dl__count') || {}).textContent === '5 files',
      total: /^· 1\.8 MB$/.test((q('.c-settings-dl__total') || {}).textContent || ''),
      segs: segs.join() === 'image,pdf,archive',
      legend: /^image:Photos · 279 KB$/.test(legend[0] || '') && /^pdf:PDF · 1\.2 MB$/.test(legend[1] || '') && /^archive:ZIP · 340 KB$/.test(legend[2] || ''),
    };
    /* the growth plays on the FIRST painted bar only (the component, fresh); the screen above already had a re-push (senders) */
    {
      const fresh = W.Spixi.createSettingsDownloads({ files: [{ name: 'a.jpg', time: String(T), size: 2048 }, { name: 'b.pdf', time: String(T), size: 4096 }], onBack() {}, strings: {} });
      const b = fresh.querySelector('.c-settings-dl__bar');
      sm.firstNoGrown = !!b && !b.hasAttribute('data-grown') && b.children.length === 2 && /s$/.test(b.children[1].style.animationDelay);
      W.Spixi.setDownloads(fresh, [{ name: 'a.jpg', time: String(T), size: 2048 }]);
      sm.freshRePushGrown = b.hasAttribute('data-grown');
    }
    const segs0 = [...q('.c-settings-dl__bar').children];
    list();
    await sleep(200);
    /* ★ S20G R-5 re-base: a re-push of the SAME files is patched in place — the bar's segments are the same nodes, so
       nothing can replay; a re-push that rebuilds the bar marks it data-grown (as before) */
    { const b = q('.c-settings-dl__bar'), now = [...b.children];
      sm.rePushGrown = b.hasAttribute('data-grown') || (now.length > 0 && now.length === segs0.length && now.every((x, i) => x === segs0[i])); }
    let n0 = sent.length;
    const clear = q('.c-settings-dl__clear');
    if (clear) clear.click();
    await sleep(60);
    const ct = await confirmLast();
    sm.clearConfirm = /Delete all downloads\?/.test(ct);
    sm.clearVerbs = JSON.stringify(sent.slice(n0)) === '["ixian:deleted","ixian:loadDownloads"]';
    ok(Object.values(sm).every(Boolean),
      '★ S17 E (#1336): the Downloads SUMMARY — "5 files · 1.8 MB" over the whole folder, one bar segment per kind (photos first, then by size), the legend names each kind with its size (Photos · PDF · ZIP), a re-push never replays the growth; "Delete all downloads" → the locked confirm → ixian:deleted then ixian:loadDownloads — ' + JSON.stringify({ sm, legend, segs, sent: sent.slice(n0) }));

    /* —— filters + list —— */
    list();
    await sleep(200);
    push('setDownloadSenders', JSON.stringify([['paper.pdf', 'Ana', 's1'], ['photo-1.jpg', 'Ana', 's1'], ['build.zip', 'Bob', 's2']]));
    await sleep(80);
    const chip = (k) => q('.c-settings-dl__chip[data-kind="' + k + '"]');
    const groups = el ? [...el.querySelectorAll('.c-settings-dl__group')] : [];
    const today = groups[0];
    const cell = q('.c-settings-dl__row--th[data-name="photo-1.jpg"] .c-settings-dl__th');
    const paper = q('.c-settings-dl__files > .c-settings-dl__row[data-name="paper.pdf"]');
    const L = {
      kinds: !!chip('all') && chip('all').getAttribute('aria-pressed') === 'true' && !q('.c-settings-dl__kinds').hidden && !q('.c-settings-dl__from-btn').hidden,
      groups: groups.length === 3 && !!today && /^Today/.test(today.querySelector('.c-settings-dl__day').textContent) && /1\.4 MB$/.test(today.querySelector('.c-settings-dl__day').textContent),
      cell: !!cell && cell.getAttribute('aria-label') === 'photo-1.jpg, 184 KB' && (cell.querySelector('.c-settings-dl__sz') || {}).textContent === '184 KB'
        && (cell.querySelector('.c-settings-dl__th-tag') || {}).textContent === 'JPG' && !!cell.closest('.c-settings-dl__grid'),
      row: !!paper && (paper.querySelector('.c-file-tile') || { dataset: {} }).dataset.kind === 'pdf' && /^from Ana · 1\.2 MB · /.test((paper.querySelector('.c-settings-dl__time') || {}).textContent || ''),
      noRowButtons: el.querySelectorAll('.c-settings-dl__row .c-settings-dl__del, .c-settings-dl__row .c-settings-dl__go').length === 0
        && [...el.querySelectorAll('.c-settings-dl__row')].every((r) => r.querySelectorAll('button').length === 1),
      evilText: !el.querySelector('.c-settings-dl__list img') && rowsOf().includes(EVIL) && el.querySelector('.c-settings-dl__list').textContent.includes(EVIL),
    };
    if (chip('photo')) chip('photo').click();
    L.photos = rowsOf().join() === 'photo-1.jpg,photo-2.jpg' && rowsOf(':not(.c-settings-dl__row--th)').length === 0;
    if (chip('file')) chip('file').click();
    L.files = rowsOf().join() === ['paper.pdf', 'build.zip', EVIL].join() && rowsOf('.c-settings-dl__row--th').length === 0;
    if (chip('all')) chip('all').click();
    L.all = rowsOf().length === 5;
    ok(Object.values(L).every(Boolean),
      '★ S17 E (#1336): the Downloads LIST — All · Photos · Files (both kinds listed) + From; day groups ("Today" · 1.4 MB); a photo = a grid cell ("photo-1.jpg, 184 KB", the size badge, JPG); a file = a row with the kind tile + "from Ana · 1.2 MB · time"; no per-row delete / chat buttons; a peer name with markup lands as TEXT; Photos / Files / All filter — ' + JSON.stringify(L));

    /* —— select mode —— */
    const S = {};
    n0 = sent.length;
    if (openOf('paper.pdf')) openOf('paper.pdf').click();
    await sleep(40);
    S.tapOpens = JSON.stringify(sent.slice(n0)) === '["ixian:openDownload:paper.pdf"]';
    const selBtn = q('.c-settings-dl__selbtn');
    const bar = q('.c-settings-dl__selbar');
    const go = q('.c-settings-dl__selbar .c-settings-dl__go');
    S.selectLabel = !!selBtn && selBtn.textContent === 'Select' && !!selBtn.closest('.c-topbar');
    if (selBtn) selBtn.click();
    S.selecting = el.hasAttribute('data-selecting') && selBtn.textContent === 'Cancel' && !bar.hasAttribute('data-on');
    n0 = sent.length;
    openOf('paper.pdf').click();
    await sleep(40);   // a send would land by now (the bridge queue)
    S.tapPicks = sent.length === n0 && openOf('paper.pdf').getAttribute('aria-pressed') === 'true' && bar.hasAttribute('data-on')
      && /^1 selected$/.test(q('.c-settings-dl__selcount').textContent) && !go.hidden;
    openOf(EVIL).click();
    S.twoNoGo = /^2 selected$/.test(q('.c-settings-dl__selcount').textContent) && go.hidden;
    openOf(EVIL).click();
    n0 = sent.length;
    go.click();
    await sleep(40);   // the native bridge drains its queue one navigation per turn
    S.goSends = JSON.stringify(sent.slice(n0)) === '["ixian:showDownloadInChat:paper.pdf"]' && !el.hasAttribute('data-selecting');
    /* the context menu (a right-click / an Android long-press) enters select mode with that file picked */
    const cm = new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    openOf('build.zip').dispatchEvent(cm);
    S.contextPicks = cm.defaultPrevented && el.hasAttribute('data-selecting') && openOf('build.zip').getAttribute('aria-pressed') === 'true';
    openOf(EVIL).click();
    n0 = sent.length;
    q('.c-settings-dl__selbar .c-settings-dl__del').click();
    await sleep(60);
    const dt = await confirmLast();
    await sleep(40);
    S.deleteTwo = /Delete 2 files\?/.test(dt) && JSON.stringify(sent.slice(n0)) === JSON.stringify(['ixian:deleteDownload:build.zip', 'ixian:deleteDownload:' + encodeURIComponent(EVIL)])
      && !el.hasAttribute('data-selecting');
    ok(Object.values(S).every(Boolean),
      '★ S17 E (#1336): Downloads SELECT mode — a tap opens outside it; "Select" (in the bar) → "Cancel", a tap picks (never opens), "{n} selected"; "Show in chat" only for ONE picked file with a sender → ixian:showDownloadInChat:<name>, then select mode ends; a context menu enters it with that file picked; Delete for two → "Delete 2 files?" → one encoded ixian:deleteDownload per file — ' + JSON.stringify({ S, tail: sent.slice(-4) }));
  } catch (e) {
    ok(false, '★ S17 E downloads threw: ' + (e && e.stack || e));
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }

  /* —— Contributors —— */
  try {
    s = await boot('settings.html', { wait: 1500 });
    const { W, d } = s;
    const row = [...d.querySelectorAll('button')].find((x) => /^\s*Contributors/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(300);
    const el = d.querySelector('.c-settings-contrib');
    const bar = el && el.querySelector(':scope > .c-topbar');
    const body = el && el.querySelector(':scope > .c-settings__body');
    const band = el && el.querySelector('.c-settings-contrib__band');
    const layers = band ? [...band.querySelectorAll(':scope > svg.il.ct-l')] : [];
    const chips = el ? [...el.querySelectorAll('.c-settings-contrib__chip')] : [];
    const credits = el ? [...el.querySelectorAll('.c-settings-contrib__credit')] : [];
    const C = {
      floats: !!bar && el.classList.contains('c-settings-contrib--hdr') && W.getComputedStyle(bar).position === 'absolute' && !bar.hasAttribute('data-solid') && body.firstElementChild === band,
      art: layers.length === 2 && band.getAttribute('aria-hidden') === 'true' && !band.querySelector('text'),
      heading: (el.querySelector('.c-settings-contrib__thanks') || {}).textContent === 'Thank you' && /Special thanks/.test((el.querySelector('.c-settings-contrib__lead') || {}).textContent || ''),
      chips: chips.length === 12 && chips.every((c) => { const i = c.querySelector('.c-settings-contrib__initial'); const n = c.querySelector('.c-settings-contrib__name'); return !!i && i.getAttribute('aria-hidden') === 'true' && i.textContent.length >= 1 && !!n && !n.contains(i); })
        && chips[0].querySelector('.c-settings-contrib__name').textContent === 'Lex Scalp' && chips[0].querySelector('.c-settings-contrib__initial').textContent === 'L'
        && chips[3].querySelector('.c-settings-contrib__initial').textContent === '0',
      credits: credits.length === 3 && credits.every((c) => !!c.querySelector('.c-settings-contrib__tile[aria-hidden="true"] svg') && !!c.querySelector('.c-settings-contrib__licence') && !c.querySelector('a'))
        && /creativecommons\.org\/licenses\/by\/4\.0$/.test(credits[2].querySelector('.c-settings-contrib__credit-who').textContent)
        && credits[2].querySelector('.c-settings-contrib__licence').textContent === 'CC-BY 4.0 (subset)',
    };
    body.scrollTop = 400; body.dispatchEvent(new W.Event('scroll'));
    C.solid = bar.hasAttribute('data-solid');
    body.scrollTop = 0; body.dispatchEvent(new W.Event('scroll'));
    C.back = !bar.hasAttribute('data-solid');
    chips[1].click();
    C.burst = chips[1].classList.contains('is-burst') && chips[1].querySelectorAll('.c-settings-contrib__spark').length === 8;
    await sleep(1000);
    C.cleaned = chips[1].querySelectorAll('.c-settings-contrib__spark').length === 0;
    ok(Object.values(C).every(Boolean),
      '★ S17 E (#1336): CONTRIBUTORS — the bar floats over the full-bleed heart header (two decorative layers, no text) and turns solid once scrolled; "Thank you" + the lead; 12 name chips, each initial disc aria-hidden and OUTSIDE the name; a tap bounces the chip and throws 8 sparks that clean themselves up; each credit = a kind tile + label + the FULL source + the licence pill, no link — ' + JSON.stringify(C));
  } catch (e) {
    ok(false, '★ S17 E contributors threw: ' + (e && e.stack || e));
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
}
