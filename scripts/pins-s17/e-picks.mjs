/* ==== S17 (Damir 20:21 / 20:42) — ONE "picked" mark on the appearance tiles · text buttons in sheets ====
 * On the BUILT settings.html bundle (jsdom):
 *   · Chat appearance › Theme: NO radio under a phone (no other screen uses one); each phone carries the pick mark
 *     (a check in a disc, aria-hidden); the Message preview cards carry the SAME mark; the stylesheet shows the mark
 *     only on the [aria-checked="true"] tile, rim kept
 *   · every secondary button in a SHEET is a text button: the rating nudge's "Not so much…", the member sheet's View
 *     profile / Pay / Request and its injected actions — no outline button is left in either sheet
 * Deliberate breaks (S17 report): put the radio span back → the theme clause fails; set the rating "no" to outline →
 * the sheets clause fails. */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const { boot } = dKit(h);
  let s = null;
  try {
    s = await boot('settings.html', { wait: 1500 });
    const { W, d } = s;
    const S = W.Spixi;
    const ap = S.createChatAppearance({ isDesktop: false, onTheme() {}, onPreviewLines() {}, theme: 0, previewLines: '1' });
    d.body.append(ap);
    const themes = [...ap.querySelectorAll('.c-settings-appearance__theme')];
    const lines = [...ap.querySelectorAll('.c-settings-appearance__line')];
    const mark = (b) => b.querySelector('.c-settings-appearance__pick[aria-hidden="true"] svg');
    const css = readFileSync(join(root, 'Spixi/Resources/Raw/html/settings.html'), 'utf8');
    const T = {
      noRadio: themes.length === 3 && !ap.querySelector('.c-settings-appearance__radio'),
      themeMarks: themes.every((b) => !!mark(b) && !!b.querySelector('.c-settings-appearance__phone > .c-settings-appearance__pick')),
      lineMarks: lines.length === 2 && lines.every((b) => !!mark(b)),
      checkedOne: themes.filter((b) => b.getAttribute('aria-checked') === 'true').length === 1,
      css: /\.c-settings-appearance__theme\[aria-checked="true"\] \.c-settings-appearance__pick,\s*\.c-settings-appearance__line\[aria-checked="true"\] \.c-settings-appearance__pick \{\s*opacity: 1;/.test(css)
        && /\.c-settings-appearance__pick \{[^}]*opacity: 0;/.test(css) && !/\.c-settings-appearance__radio/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')),
    };
    ok(Object.values(T).every(Boolean),
      '★ S17 C (Damir 20:21): the appearance tiles say "picked" ONE way — no radio under the theme phones; a check in a blue disc on every theme phone and Message preview card, shown only on the checked one (the rim kept) — ' + JSON.stringify(T));

    /* the sheets */
    const host = d.createElement('div'); d.body.append(host);
    const rn = S.showRatingNudge({ host, onRate() {}, strings: {} });
    await sleep(30);
    const rBtns = rn ? [...rn.querySelectorAll('.c-button')] : [];
    const ms = S.openMemberSheet({ host, member: { name: 'Ana', address: 'x' }, relation: 'contact', onMessage() {}, onPay() {}, onRequestPayment() {}, onViewContact() {},
      actions: [{ label: 'Remove', glyph: 'trash', destructive: true, onClick() {} }], strings: {} });
    await sleep(30);
    const mBtns = ms ? [...ms.querySelectorAll('.c-button')] : [];
    const type = (b) => b.dataset.type || 'fill';
    const Q = {
      rating: rBtns.length === 2 && type(rBtns[1]) === 'text' && /Not so much/.test(rBtns[1].textContent),
      member: mBtns.length >= 4 && mBtns.filter((b) => /View profile|Pay|Request|Remove/.test(b.textContent)).every((b) => type(b) === 'text'),
      noOutline: [...rBtns, ...mBtns].every((b) => type(b) !== 'outline'),
    };
    ok(Object.values(Q).every(Boolean),
      '★ S17 (Damir 20:42, "consistency"): every secondary button in a sheet is a TEXT button — the rating nudge\'s "Not so much…", the member sheet\'s View profile · Pay · Request and its injected actions; no outline button left in either — ' + JSON.stringify({ Q, r: rBtns.map(type), m: mBtns.map((b) => type(b) + ':' + b.textContent.trim()) }));
  } catch (e) {
    ok(false, '★ S17 picks / sheets threw: ' + (e && e.stack || e));
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
}
