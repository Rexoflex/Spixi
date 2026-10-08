/* ==== S11 A — item 4 (#1262): the update notice as a GLASS CARD, on the BUILT home shell ====
 * Driven through the REAL push C# sends today — showWarning(String.Format(_SL("global-update-available"), v)), every
 * tick — so an older exe needs nothing new:
 *   · the notice becomes ONE card (blue app icon, "Spixi {v} is available", "Update it where you got Spixi.",
 *     "How to update ›" → ★ S11 A2 (#1263) `ixian:updateHelp` (C# owns the URL), ×) — NO Update button, NO orange strip;
 *   · ★ S11 A2 (#1263, R2-m4): only for an exe that declares the `updateHelp` capability — without it the notice is
 *     today's orange banner (an older exe has no ixian:updateHelp branch); the icon is the app's own mark (not a download
 *     arrow); the card is a labelled GROUP, no live region; after its entrance it is [data-held];
 *   · a re-push of the same notice does nothing; the card follows the visible tab (#403: Chats list · under the Wallet
 *     hero · under the Apps bar); × = the #383 rule (in memory: a re-push does not bring it back, no spixi.* key);
 *   · connectivity and every OTHER warning keep their surfaces (title state · the banner);
 *   · LOCALE-PROOF: with the carrier substituted the way localizeHtml does it (de-de here), the German notice is a
 *     card; and the template of EVERY lang file (13) yields the version back through updateVersionOf, while a hole
 *     that is not version-shaped is refused.
 * Deliberate breaks: see the S11 A / A2 reports. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join } = h;
  const K = aKit(h);
  const EN = 'New version of Spixi ({0}) is available. Please update for best experience.';
  const fmt = (tpl, v) => tpl.split('{0}').join(v);
  let s = null;
  const r = {};
  try {
    s = await K.boot('index.html');
    const { d, W } = s;
    const tap = (sel) => d.querySelector(sel).dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    const cards = () => d.querySelectorAll('.c-glass-card[data-variant="update"]');
    const lsBefore = W.localStorage.length;
    /* ★ S11 A2: an exe WITHOUT the updateHelp cap → today's banner for the update notice, no card */
    s.push('setCaps', 'composeSend,hints');
    s.push('showWarning', fmt(EN, '0.9.22'));
    await K.sleep(80);
    const strip0 = d.querySelector('.c-banner[data-open] .c-banner__text');
    r.noCapIsBanner = cards().length === 0 && !!strip0 && strip0.textContent === fmt(EN, '0.9.22');
    s.push('setCaps', 'updateHelp');
    s.push('showWarning', fmt(EN, '0.9.23'));
    await K.sleep(80);
    const card = cards()[0];
    r.bannerGaveWay = !d.querySelector('.c-banner[data-open]') || d.querySelector('.c-banner[data-open] .c-banner__text').textContent !== fmt(EN, '0.9.22');
    r.one = cards().length === 1 && card.parentNode.classList.contains('chats-cards');
    r.copy = !!card && card.querySelector('.c-glass-card__title').textContent === 'Spixi 0.9.23 is available'
      && card.querySelector('.c-glass-card__text').textContent === 'Update it where you got Spixi.'
      && /How to update/.test(card.querySelector('.c-glass-card__link').textContent)
      && !!card.querySelector('.c-glass-card__appicon svg[viewBox="0 0 32 32"]') && !!card.querySelector('.c-glass-card__close')
      && card.getAttribute('role') === 'group' && card.getAttribute('aria-label') === 'Spixi 0.9.23 is available' && !card.closest('[aria-live], [role="status"]');
    r.noUpdateButton = [...card.querySelectorAll('button')].every((b) => !/^\s*Update\s*$/i.test(b.textContent))
      && card.querySelectorAll('button').length === 2;
    r.noStrip = !d.querySelector('.c-banner[data-open]');
    r.aboveList = (() => { const sc = d.getElementById('chat-scroll'); const kids = [...sc.children]; return kids.indexOf(card.parentNode) >= 0 && kids.indexOf(card.parentNode) < kids.indexOf(sc.querySelector('.c-chats-list')); })();
    s.push('showWarning', fmt(EN, '0.9.23'));
    await K.sleep(60);
    r.rePushSame = cards().length === 1 && cards()[0] === card;
    s.sent.length = 0;
    tap('.c-glass-card[data-variant="update"] .c-glass-card__link');
    r.howTo = JSON.stringify(s.sent) === JSON.stringify(['ixian:updateHelp']);
    tap('.c-bottomnav__item[data-id="wallet"]');
    await K.sleep(100);
    r.followsWallet = card.parentNode === d.getElementById('wallet-banner');
    tap('.c-bottomnav__item[data-id="apps"]');
    await K.sleep(100);
    r.followsApps = card.parentNode === d.getElementById('apps-banner');
    tap('.c-bottomnav__item[data-id="chats"]');
    await K.sleep(100);
    r.backOnChats = card.parentNode && card.parentNode.classList.contains('chats-cards');
    s.sent.length = 0;
    tap('.c-glass-card[data-variant="update"] .c-glass-card__close');
    await K.sleep(40);
    r.dismissed = cards().length === 0 && s.sent.filter((x) => !/^ixian:(tab|coverpainted)/.test(x)).length === 0;
    s.push('showWarning', fmt(EN, '0.9.23'));
    await K.sleep(60);
    r.staysDismissed = cards().length === 0 && !d.querySelector('.c-banner[data-open]');
    s.push('showWarning', fmt(EN, '0.9.24'));
    await K.sleep(60);
    r.newerVersionShows = cards().length === 1 && cards()[0].dataset.version === '0.9.24';
    s.push('showWarning', 'Your storage is almost full.');
    await K.sleep(80);
    const strip = d.querySelector('.c-banner[data-open] .c-banner__text');
    r.otherWarningIsStrip = !!strip && strip.textContent === 'Your storage is almost full.' && cards().length === 1;
    s.push('showWarning', 'Connecting to Ixian Platform...');
    await K.sleep(60);
    r.connectivityIsTitle = d.querySelector('#chats-topbar .c-topbar__title').hasAttribute('data-connecting') && cards().length === 1;
    r.noStorage = W.localStorage.length === lsBefore;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A item 4 (#1262) + A2 (#1263): without the updateHelp cap the update notice stays today\'s banner; with it the REAL showWarning push renders ONE glass card above the Chats list (the app mark · Spixi 0.9.23 is available · Update it where you got Spixi. · How to update → ixian:updateHelp · ×; a labelled group, no live region) — no Update button, no orange strip; a re-push is a no-op; it follows Wallet / Apps / Chats (#403); × holds against a re-push in memory (#383, no storage) while a NEWER version shows; any other warning keeps the strip and connectivity keeps the title state — ' + JSON.stringify(r));

  /* ── locale-proof: the carrier substituted the way localizeHtml does it ── */
  const langDir = join(root, 'Spixi/Resources/Raw/lang');
  const tpls = {};
  for (const f of readdirSync(langDir).filter((x) => /\.txt$/.test(x))) {
    const m = /^global-update-available = (.*)$/m.exec(readFileSync(join(langDir, f), 'utf8'));
    if (m) tpls[f] = m[1].trim();
  }
  const de = tpls['de-de.txt'];
  const l = {};
  try {
    s = await K.boot('index.html', { html: (t) => t.split('*SL{global-update-available}').join(de) });
    const { d, W } = s;
    s.push('setCaps', 'composeSend,hints,updateHelp');
    s.push('showWarning', fmt(de, '1.2.0'));
    await K.sleep(80);
    const c = d.querySelector('.c-glass-card[data-variant="update"]');
    l.deCard = !!c && c.dataset.version === '1.2.0' && !d.querySelector('.c-banner[data-open]');
    const bad = [];
    for (const [f, tpl] of Object.entries(tpls)) {
      if (W.Spixi.updateVersionOf(fmt(tpl, '0.9.23'), [tpl]) !== '0.9.23') bad.push(f + ':version');
      if (W.Spixi.updateVersionOf(fmt(tpl, '0.9.23-rc1'), [tpl]) !== '0.9.23-rc1') bad.push(f + ':suffix');
      if (W.Spixi.updateVersionOf(fmt(tpl, '<img src=x>'), [tpl]) !== null) bad.push(f + ':markup');
      if (W.Spixi.updateVersionOf(fmt(tpl, '0.9 now'), [tpl]) !== null) bad.push(f + ':space');
      if (W.Spixi.updateVersionOf(tpl.replace('{0}', ''), [tpl]) !== null) bad.push(f + ':empty');
    }
    l.everyLocale = Object.keys(tpls).length === 13 && bad.length === 0 ? true : bad.join(',') || Object.keys(tpls).length;
    l.notATemplate = W.Spixi.updateVersionOf('Connecting to Ixian Platform...', Object.values(tpls)) === null;
    l.noErr = K.noErr(s.errs);
  } catch (e) { l.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(l).every((x) => x === true),
    '★ S11 A item 4 (#1262): LOCALE-PROOF — with the carrier substituted (de-de) the German notice is a card; all 13 lang templates of global-update-available give the version back (also with a suffix), and a hole that is markup, has a space or is empty is refused — ' + JSON.stringify(l));
}
