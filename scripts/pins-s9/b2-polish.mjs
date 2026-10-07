/* ==== SESSION 9 (B2) — POLISH (#1247 V-18) + PRIVACY ICONS (Damir's pick A) ====
 * On the BUILT shells (jsdom computed style — the cascade the WebView gets; no layout here, the 390 / 320 px
 * measurements are the Chromium renders in the S9 B2 report):
 *   · U-01: the wallet filter chips (and the scrolling Chats filter chips) do not shrink (flex-shrink 0) — the
 *     #841 chip default (min-width 0) made them squeeze to "A" / "S." / "R…" and fit() never saw an overflow
 *   · U-05: a group excerpt's sender does not shrink and caps at 40% of the line
 *   · Privacy = A: "Load pictures and GIFs" draws world-download, "Show photo previews" draws photo, and both discs
 *     keep the colours they had (the render Damir picked)
 *   · H-16 f: dark in-sheet pressed fills keep action text ≥ 4.5:1 and stay a visible step past hover (≥ 1.11)
 * Deliberate breaks: see the S9 B2 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot, tokens } = b2Kit(h);
  try {
    /* —— index.html: wallet + chats chips, group excerpt —— */
    let s = await boot('index.html');
    const cs = (el) => s.W.getComputedStyle(el);
    const wChips = [...s.d.querySelectorAll('.c-wallet-filters > .c-chip')];
    ok(wChips.length === 3 && wChips.every((c) => cs(c).flexShrink === '0'),
      '★ S9 U-01 (#1247): the wallet filter chips keep their width (flex-shrink 0) — ' + JSON.stringify(wChips.map((c) => cs(c).flexShrink)));
    const cChips = [...s.d.querySelectorAll('.c-chats-header__filters > .c-chip')];
    ok(cChips.length >= 4 && cChips.every((c) => cs(c).flexShrink === '0' && cs(c).maxWidth === 'none'),
      '★ S9 U-01 family: the scrolling Chats filter chips keep their width and stay uncapped — ' + JSON.stringify(cChips.map((c) => cs(c).flexShrink + '/' + cs(c).maxWidth)));
    const TS = String(Math.floor(Date.now() / 1000));
    s.push('clearChats');
    s.push('addChat', 'g1', 'Team room', TS, 'img/spixiavatar.png', 'false', 'Are we still on for Saturday?', '', '1', 'group', 'False', 'text', 'Hannah');
    s.push('clearChatsDone');
    await sleep(300);
    const snd = s.d.querySelector('.c-excerpt__sender');
    ok(!!snd && snd.textContent === 'Hannah:' && cs(snd).flexShrink === '0' && cs(snd).maxWidth === '40%',
      '★ S9 U-05 (#1247): a group excerpt sender does not shrink and caps at 40% — ' + JSON.stringify(snd && [snd.textContent, cs(snd).flexShrink, cs(snd).maxWidth]));
    s.dom.window.close();

    /* —— settings.html: Privacy icons = A —— */
    s = await boot('settings.html');
    s.push('setCaps', 'photoPreviews');
    await sleep(200);
    const pr = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(250);
    const S = s.W.Spixi, I = s.W.SpixiIcons;
    const pathOf = (name) => { const i = I && I.icon(name); return i ? [...i.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|') : '?'; };
    const rowOf = (label) => [...s.d.querySelectorAll('.c-settings-privacy .c-disc')].map((dd) => dd.closest('label, .c-settings__row, [data-pref], div')).find((r) => r && r.textContent.includes(label));
    const discOf = (r) => r && r.querySelector('.c-disc');
    const drawn = (r) => { const dd = discOf(r); return dd ? [...dd.querySelectorAll('svg path')].map((p) => p.getAttribute('d')).join('|') : ''; };
    const load = rowOf('Load pictures and GIFs'), prev = rowOf('Show photo previews in chats');
    ok(!!load && drawn(load) === pathOf('world-download') && !!prev && drawn(prev) === pathOf('photo'),
      '★ S9 privacy icons = A: "Load pictures and GIFs" draws world-download and "Show photo previews" draws photo');
    ok(discOf(load).dataset.grad === String(S.discGrad('photo')) && discOf(prev).dataset.grad === String(S.discGrad('eye'))
      && discOf(load).dataset.grad !== String(S.discGrad('world-download')),
    '★ S9 privacy icons = A: both discs keep the colour they had (the picked render) — ' + JSON.stringify([discOf(load).dataset.grad, discOf(prev).dataset.grad]));
    s.dom.window.close();

    /* —— H-16 f: dark in-sheet pressed contrast (built token sheet) —— */
    const { res, cr } = tokens();
    const act = res('dark', '--text-action-default');
    const r = {
      cardPressed: cr(act, res('dark', '--surface-sheet-card-pressed')),
      ctrlPressed: cr(act, res('dark', '--surface-interactive-pressed-sheet')),
      pastHover: cr(res('dark', '--surface-sheet-card-pressed'), res('dark', '--surface-sheet-card-hover')),
      pastHoverCtrl: cr(res('dark', '--surface-interactive-pressed-sheet'), res('dark', '--surface-interactive-hover-sheet')),
      lightSame: res('light', '--surface-sheet-card-pressed') === res('light', '--neutral-200'),
    };
    ok(r.cardPressed >= 4.5 && r.ctrlPressed >= 4.5 && r.pastHover >= 1.11 && r.pastHoverCtrl >= 1.11 && r.lightSame,
      '★ S9 H-16 f (#1247): dark in-sheet pressed fills keep action text ≥ 4.5:1 and stay ≥ 1.11 past hover; light untouched — '
      + JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? v.toFixed(2) : v]))));
  } catch (e) {
    ok(false, '★ S9 B2 polish pins threw: ' + (e && e.stack || e));
  }
}
