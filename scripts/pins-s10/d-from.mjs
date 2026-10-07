/* ==== SESSION 10 (D) — F7 the Downloads "From" sheet = option C (#1254) ====
 * On the BUILT settings.html (jsdom), through the REAL Downloads sublevel:
 *   · each sender row = a 40 px avatar (the pushed data:image photo, else the gradient initials) + "{n} files ·
 *     last {when}" counted from the list on screen ({when} = the sender's NEWEST file, formatTxTimestamp); "Everyone"
 *     = a tonal people-glyph disc + the total; the selected row is the rich row (tinted by CSS) with the check
 *   · 🟡 setDownloadAvatars(json) validation: [[key, data:image/(png|jpeg|webp);base64,…]] — a remote URL, an svg,
 *     a non-base64 tail, an over-long value, a non-string / over-long key are SKIPPED; a non-array, bad JSON or
 *     > 256 rows change NOTHING; a new setDownloadSenders drops the previous avatars (keys are per scan)
 *   · a pick still filters (the label is the option's label); the search past 8 still filters by the label
 *   · settingsOptionSheet without o.avatar / o.sub builds the exact old row (label + status, no rich class)
 * Deliberate breaks: see the S10 D report. */
import { dKit } from './d-kit.mjs';
import { b2Kit } from '../pins-s9/b2-kit.mjs';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = dKit(h);
  try {
    const s = await boot('settings.html', { wait: 1500 });
    const { W, d, push } = s;
    push('setCaps', 'settingsApply,downloadsInline');
    push('setNickname', 'Damir');
    await sleep(250);
    const hub = d.querySelector('[data-setting-key="downloads"]');
    if (hub) hub.click();
    await sleep(200);
    const T = Math.floor(Date.now() / 1000);
    push('clearFiles');
    push('addFile', 'a.pdf', String(T - 86400), '2048');
    push('addFile', 'b.jpg', String(T - 3600), '10');
    push('addFile', 'c.txt', String(T - 7200), '10');
    push('addFile', 'd.txt', 'Oct 7 2026', '10');   // an old exe's opaque time
    await sleep(200);
    push('setDownloadSenders', JSON.stringify([['a.pdf', 'Ana', 's1'], ['b.jpg', 'Ana', 's1'], ['c.txt', 'Bob', 's2'], ['d.txt', 'Cid', 's3']]));
    push('setDownloadAvatars', JSON.stringify([['s1', PNG], ['s2', 'https://evil.example/a.png'], ['s3', 'data:image/svg+xml;base64,PHN2Zz4=']]));
    await sleep(80);
    const fromBtn = () => d.querySelector('.c-settings-dl__from-btn');
    const close = async () => { if (W.Spixi.dismissTopOverlay) W.Spixi.dismissTopOverlay(); await sleep(400); };
    const sheetRows = async () => {
      if (fromBtn()) fromBtn().click();
      await sleep(80);
      return [...d.querySelectorAll('.c-settings__opt')].map((o) => ({
        o,
        label: (o.querySelector('.c-settings__opt-label') || {}).textContent,
        sub: (o.querySelector('.c-settings__opt-sub') || {}).textContent,
        av: o.querySelector('.c-settings__opt-avatar'),
        img: o.querySelector('.c-settings__opt-avatar .c-avatar__img'),
      }));
    };
    let rows = await sheetRows();
    const by = (l) => rows.find((x) => x.label === l) || {};
    const when = (sec) => W.Spixi.formatTxTimestamp(sec * 1000);
    const r = {
      order: rows.map((x) => x.label).join() === 'Everyone,Ana,Bob,Cid',
      everyone: !!by('Everyone').av && !!by('Everyone').av.querySelector('.c-settings__opt-glyph svg') && by('Everyone').sub === '4 files'
        && by('Everyone').o.getAttribute('aria-checked') === 'true' && by('Everyone').o.classList.contains('c-settings__opt--rich'),
      anaSub: by('Ana').sub === '2 files · last ' + when(T - 3600),     // the NEWEST of her two
      bobSub: by('Bob').sub === '1 file · last ' + when(T - 7200),
      cidNoLast: by('Cid').sub === '1 file',                            // opaque time → no "last"
      avatar40: !!by('Ana').av && (by('Ana').av.querySelector('.c-avatar') || { dataset: {} }).dataset.size === '40',
      anaPhoto: !!by('Ana').img && by('Ana').img.getAttribute('src') === PNG,
      remoteRefused: !by('Bob').img && !!by('Bob').av && !!by('Bob').av.querySelector('.c-avatar'),
      svgRefused: !by('Cid').img,
      avatarHidden: !!by('Ana').av && by('Ana').av.getAttribute('aria-hidden') === 'true',
    };
    /* pick Bob by the label → the list filters; the sheet re-opens with Bob tinted + checked */
    if (by('Bob').o) by('Bob').o.click();
    await sleep(450);
    r.filter = [...d.querySelectorAll('.c-settings-dl__row')].filter((x) => !x.closest('[hidden]')).map((x) => x.dataset.name).join() === 'c.txt';
    rows = await sheetRows();
    r.selected = by('Bob').o && by('Bob').o.getAttribute('aria-checked') === 'true' && by('Bob').o.classList.contains('c-settings__opt--rich')
      && by('Everyone').o.getAttribute('aria-checked') === 'false';
    await close();
    /* validation: per-row skips */
    const longB64 = 'data:image/png;base64,' + 'A'.repeat(200000);
    /* (#46 r1 R3-13) only refusals a user can SEE are claimed here: the key bounds (a string ≤ 128) are defence only —
       a listed sender key is always s<digits> (setDownloadSenders), so no over-long or non-string key can name one. */
    push('setDownloadAvatars', JSON.stringify([['s1', longB64], ['s2', JPG], ['s3', 'data:image/png;base64,AA"><img src=x>']]));
    await sleep(60);
    rows = await sheetRows();
    r.rowSkips = !by('Ana').img && !!by('Bob').img && by('Bob').img.getAttribute('src') === JPG && !by('Cid').img;
    await close();
    /* whole-push refusals: bad JSON · not an array · > 256 rows — the previous avatars stay */
    push('setDownloadAvatars', '{not json');
    push('setDownloadAvatars', JSON.stringify({ s1: PNG }));
    push('setDownloadAvatars', JSON.stringify(Array.from({ length: 257 }, (_, i) => ['s' + i, PNG])));
    await sleep(60);
    rows = await sheetRows();
    r.wholeRefused = !!by('Bob').img && by('Bob').img.getAttribute('src') === JPG && !by('Ana').img;
    await close();
    push('setDownloadAvatars', JSON.stringify(Array.from({ length: 256 }, (_, i) => ['s' + i, PNG])));
    await sleep(60);
    rows = await sheetRows();
    r.cap256Ok = !!by('Ana').img && !!by('Cid').img;
    await close();
    /* a new sender push (a new scan: keys can name other people) drops the old avatars */
    push('setDownloadSenders', JSON.stringify([['a.pdf', 'Ana', 's1'], ['c.txt', 'Bob', 's2']]));
    await sleep(60);
    rows = await sheetRows();
    r.sendersDropAvatars = rows.length === 3 && !rows.some((x) => x.img);
    await close();
    r.noErrors = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every(Boolean),
      '★ S10 F7 (pick C): the From sheet rows carry a 40 px avatar (the pushed photo, else initials) and "{n} files · last {newest}" from the list on screen; Everyone = a people disc + the total; the selected row is the rich (tinted) row; setDownloadAvatars takes only local png/jpeg/webp base64 URIs ≤ 200 000 chars (a long, a remote, an svg, a non-base64 value is skipped), refuses a non-array / bad JSON / > 256 rows whole, and a new setDownloadSenders drops the old avatars — ' + JSON.stringify(r) + ' errs: ' + s.errs.slice(0, 2).join(' | '));

    /* the search past 8 still filters by the LABEL (the sub line is not searched) */
    const many = [];
    for (let i = 0; i < 12; i++) many.push(['f' + i + '.txt', 'Person ' + i, 's' + (i + 10)]);
    push('clearFiles');
    for (let i = 0; i < 12; i++) push('addFile', 'f' + i + '.txt', String(T - i), '10');
    await sleep(250);
    push('setDownloadSenders', JSON.stringify(many));
    await sleep(60);
    if (fromBtn()) fromBtn().click();
    await sleep(80);
    const search = d.querySelector('.c-settings-dl__sender-search input');
    if (search) { search.value = 'file'; search.dispatchEvent(new W.Event('input', { bubbles: true })); }
    await sleep(30);
    const shownA = [...d.querySelectorAll('.c-settings__opt')].filter((o) => !o.hidden).length;
    if (search) { search.value = 'Person 7'; search.dispatchEvent(new W.Event('input', { bubbles: true })); }
    await sleep(30);
    const shownB = [...d.querySelectorAll('.c-settings__opt')].filter((o) => !o.hidden).map((o) => o.querySelector('.c-settings__opt-label').textContent);
    ok(!!search && shownA === 0 && shownB.join() === 'Person 7',
      '★ S10 F7: the From search (past 8) still matches the NAME only — "file" (only in the sub lines) matches nobody — ' + JSON.stringify({ search: !!search, shownA, shownB }));
    await close();

    /* the rich row's CSS (built sheet): tinted when selected, the 40 px slot, the sub line */
    const built = d.documentElement.outerHTML + [...d.querySelectorAll('style')].map((x) => x.textContent).join('\n');
    const css = (h.stripCssComments ? h.stripCssComments(built) : built);
    ok(/\.c-settings__opt--rich\[aria-checked='true'\] \{ background: var\(--surface-action-tonal-default\); \}/.test(css)
      && /\.c-settings__opt--rich \{[^}]*min-height: 64px;/.test(css) && /\.c-settings__opt-avatar \{[^}]*width: 40px;/.test(css)
      && /\.c-settings__opt-sub \{[^}]*color: var\(--text-neutral-02\);/.test(css),
    '★ S10 F7: the built settings shell carries the rich-row CSS — the selected row tinted --surface-action-tonal-default, 64 px rows, a 40 px avatar slot, the sub line in --text-neutral-02');

    /* (#46 r1 R3-16) the "Everyone" disc on the tinted SELECTED row is not the row's own token: computed on the
       built shell, then the contrast from the built token sheet — the disc ≥ 1.3 : 1 off the row, the glyph ≥ 4.5 : 1
       on the disc, in both themes */
    {
      const { tokens } = b2Kit(h);
      const { res, cr } = tokens();
      push('setDownloadSenders', JSON.stringify([['f0.txt', 'Person 0', 's10']]));
      await sleep(60);
      if (fromBtn()) fromBtn().click();
      await sleep(80);
      const ev = [...d.querySelectorAll('.c-settings__opt')].find((o) => (o.querySelector('.c-settings__opt-label') || {}).textContent === 'Everyone');
      const disc = ev && ev.querySelector('.c-settings__opt-glyph');
      const selBg = disc ? W.getComputedStyle(disc).getPropertyValue('background') + ' ' + W.getComputedStyle(disc).getPropertyValue('background-color') : '';
      const tok = (/var\((--[\w-]+)\)/.exec(selBg) || [])[1] || '';
      const rowTok = '--surface-action-tonal-default';
      const m = {};
      for (const th of ['light', 'dark']) {
        const bg = res(th, tok), row = res(th, rowTok), ic = res(th, '--icon-action-default');
        m[th] = [cr(bg, row), cr(ic, bg)].map((x) => Math.round(x * 100) / 100);
      }
      ok(!!disc && ev.getAttribute('aria-checked') === 'true' && !!tok && tok !== rowTok
        && m.light[0] >= 1.3 && m.dark[0] >= 1.3 && m.light[1] >= 4.5 && m.dark[1] >= 4.5,
      '★ S10 #46 r1 R3-16: on the selected (tinted) row the Everyone disc takes ' + tok + ', not the row token — disc/row and glyph/disc ' + JSON.stringify(m));
      await close();
    }

    /* every other caller unchanged: no avatar / sub → the exact old row */
    const sheet = W.Spixi.settingsOptionSheet({ title: 'T', options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', sub: '' }], current: 'a', host: d.body, commit: (v, c) => c.done() });
    await sleep(60);
    const plain = [...sheet.querySelectorAll('.c-settings__opt')];
    ok(plain.length === 2 && plain.every((o) => !o.classList.contains('c-settings__opt--rich') && [...o.children].map((c) => c.className).join() === 'c-settings__opt-label,c-settings__opt-status')
      && plain[0].textContent === 'Alpha',
    '★ S10 F7: settingsOptionSheet without o.avatar / o.sub (an empty sub too) builds the old row — label + status, no rich class');
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S10 D From pins threw: ' + (e && e.stack || e));
  }
}
