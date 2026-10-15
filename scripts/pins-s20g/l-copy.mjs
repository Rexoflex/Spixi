/* ==== S20G Q-2 · Q-3 · the "money" hint (#1406) — the welcome copy line height, the CTA labels, hintWalletTitle ====
 * On the BUILT intro.html (jsdom; the media-aware cascade of pins-on1/kit.mjs) and the 14 generated dictionaries:
 *   (1) Q-2: the slide copy line height is the body-sm token — 20 px on the phone, 18 px on the desktop (data-desktop).
 *   (2) Q-3: de-de restoreCta "Konto wiederherstellen", ru-ru "Восстановить аккаунт", fr-fr "Restaurer un compte" (the
 *       three that measured past the 320 px label box; the Chromium sweep l-sweep.mjs measures all 14); the built CSS
 *       gives the welcome CTAs and the form footer CTAs the two-line net (white-space normal, height auto, a 56 px
 *       min-height, the label balanced) and the L2 tight level a 44 px FLOOR (not a fixed height); a button outside
 *       the launch keeps button.css (nowrap, 56 px).
 *   (3) #1406: hintWalletTitle = that locale's slide3Title without its trailing full stop, in all 14 locales (the
 *       en-us value comes from glass-card.js's fallback — its own clause); never the money word (per-locale lexicon).
 * Deliberate breaks (S20G report): ① the slide-copy line-height removed → (1) fails; ② de-de restoreCta back to
 *   "Bestehendes Konto wiederherstellen" → (2) fails; ③ the net's white-space: normal removed → (2) css fails;
 *   ④ the L2 rule back to height: 44px → (2) l2 fails; ⑤ ru-ru hintWalletTitle back to "Деньги как сообщение" → (3) fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
const LOCALES = ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
const MONEY = {
  'en-us': /money/i, 'de-de': /geld/i, 'es-co': /dinero/i, 'fr-fr': /argent/i, 'sr-sp': /nova[cč]/i, 'sl-si': /denar(?!nic)/i,
  'ru-ru': /деньг|денег/i, 'pt-br': /dinheiro/i, 'it-it': /soldi|denaro/i, 'id-id': /\buang\b/i, 'lt-lt': /pinig(?!in)/i,
  'cn-cn': /钱(?!包)|转账/, 'ja-jp': /お金/, 'sq-al': /\bpara\b/i,
};
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const { boot, cascade } = on1Kit(h);
  let s = null, g = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    /* (1) Q-2 */
    const copy = d.querySelector('.c-launch__slide-copy');
    const phone = cascade(W, copy, 'line-height');
    g = await boot({ ua: 'desktop' });
    const desk = cascade(g.W, g.d.querySelector('.c-launch__slide-copy'), 'line-height');
    g.close(); g = null;
    ok(phone === '20px' && desk === '18px',
      '★ S20G Q-2: the welcome slide copy runs on the body-sm line height — 20 px phone, 18 px desktop (was the inherited 24 px) — ' + JSON.stringify({ phone, desk }));

    /* (2) Q-3 */
    const dict = (c) => JSON.parse(readFileSync(join(root, 'src/strings', c + '.json'), 'utf8'));
    const labels = { de: dict('de-de').restoreCta, ru: dict('ru-ru').restoreCta, fr: dict('fr-fr').restoreCta };
    const wv = d.querySelector('.c-launch__welcome');
    const cta = d.querySelector('.c-launch__ctas .c-button[data-type="outline"]');
    const foot = d.querySelector('.c-launch__step[data-step="1"] .c-launch__footer .c-button');
    const net = (b) => ({ ws: cascade(W, b, 'white-space'), h: cascade(W, b, 'height'), min: cascade(W, b, 'min-height'), wrap: cascade(W, b.querySelector('.c-button__label'), 'text-wrap') });
    const css = { cta: net(cta), foot: net(foot) };
    wv.dataset.compact = '2';
    css.l2 = { h: cascade(W, cta, 'height'), min: cascade(W, cta, 'min-height') };
    delete wv.dataset.compact;
    const other = d.createElement('button'); other.className = 'c-button'; other.dataset.size = '56'; other.dataset.type = 'outline';
    d.body.append(other);
    css.other = { ws: cascade(W, other, 'white-space'), h: cascade(W, other, 'height') };
    other.remove();
    const okNet = (x) => x.ws === 'normal' && x.h === 'auto' && x.min === '56px' && x.wrap === 'balance';
    const r2 = {
      labels: labels.de === 'Konto wiederherstellen' && labels.ru === 'Восстановить аккаунт' && labels.fr === 'Restaurer un compte',
      cta: okNet(css.cta), foot: okNet(css.foot),
      l2: css.l2.h === 'auto' && css.l2.min === '44px',
      others: css.other.ws === 'nowrap' && css.other.h === '56px',
    };
    ok(Object.values(r2).every(Boolean),
      '★ S20G Q-3: the shorter restore labels (de / ru / fr) and the two-line net on the launch CTAs only (wrap balanced, the button grows from a 56 px floor; L2 a 44 px floor); other buttons keep one line — ' + JSON.stringify({ r2, labels, css }));

    /* (3) #1406 hintWalletTitle */
    const bad = {}, money = [];
    for (const code of LOCALES) {
      const x = dict(code);
      const want = String(x.slide3Title || '').replace(/[.。]\s*$/, '');
      if (code !== 'en-us' && x.hintWalletTitle !== want) bad[code] = x.hintWalletTitle;
      if (MONEY[code].test(String(x.hintWalletTitle))) money.push(code);
    }
    ok(Object.keys(bad).length === 0 && money.filter((c) => c !== 'en-us').length === 0,
      '★ S20G #1406: hintWalletTitle is each locale\'s slide-3 title without its full stop ("Send IXI like a message") in the 13 translated locales, never "money" — ' + JSON.stringify({ bad, money }));
    const en = dict('en-us');
    ok(en.hintWalletTitle === 'Send IXI like a message' && !MONEY['en-us'].test(en.hintWalletTitle),
      '★ S20G #1406 (en-us): hintWalletTitle "Send IXI like a message" — the en-us value is extracted from src/components/glass-card.js:68 (`strings.hintWalletTitle || …`), the fallback must change there — ' + JSON.stringify(en.hintWalletTitle));
    ok(s.errs.length === 0, '★ S20G Q-2 / Q-3: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20G l-copy threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (g) g.close(); }
}
