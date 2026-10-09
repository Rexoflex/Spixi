/* ==== S12 B (#1267) — Account › About, design "B, hero card-led", EXECUTED on the BUILT settings.html (jsdom; C# pushes
 * via executeUiCommand; outgoing ixian: verbs captured) ====
 *   · hero: the inline art (★ S13 B: tile-less, inside the aria-hidden band; the aria-hidden app icon after it), "Spixi", the new tagline, a version chip "Version 0.9.22" from C#'s `spixi-0.9.22` (the prefix
 *     stripped) — and NO chip for a malformed or empty version
 *   · "Why Spixi": three facts, no post-quantum line, no "server" wording
 *   · "Links": Website · Ixian network · Source code, each still sends ixian:openLink: with today's three URLs
 *   · "Legal and support": Privacy · Terms (the in-app doc sheets) · Licences → the existing Contributors credits ·
 *     Rate Spixi ONLY with the `rate` cap, sending exactly ixian:rating:yes
 *   · footer "© Ixian"
 * Deliberate breaks: see the S12 B report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const close = () => { if (s) { s.close(); s = null; } };
  const openAbout = async () => {
    const b = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*About/.test(x.textContent || ''));
    if (b) b.click();
    await sleep(250);
    return s.d.querySelector('.c-settings-about');
  };
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const a = {};
  const r = {};
  try {
    s = await K.boot('settings.html');
    s.push('setVersion', 'spixi-0.9.22');
    s.push('setCaps', 'rate');
    await sleep(150);
    const el = await openAbout();
    const hero = el && el.querySelector('.c-settings-about__hero');
    const art = hero && hero.querySelector('svg.c-settings-about__art');
    a.hero = !!art && art.getAttribute('aria-hidden') === 'true' && art.outerHTML.length <= 7168
      && txt(hero.querySelector('.c-settings-about__app-name')) === 'Spixi'
      && txt(hero.querySelector('.c-settings-about__tagline')) === 'Private messaging and payments on the Ixian network.';
    /* ★ S13 B (Damir's pick, "Banner hero"): the band (aria-hidden) carries the art WITHOUT its tile (no tile rects, no
       mark — aboutHeroArt({ tile: false })); the app icon (aria-hidden, the registry's own logo) is the band's NEXT
       sibling, overlapping its edge; the name, tagline and chip follow in that order; one entrance, then data-held */
    const band = hero && hero.querySelector(':scope > .c-settings-about__band');
    const appIcon = hero && hero.querySelector(':scope > .c-settings-about__appicon');
    const kids = hero ? [...hero.children].map((c) => c.className) : [];
    a.band = !!band && band.getAttribute('aria-hidden') === 'true' && !!art && art.parentElement === band
      && art.querySelectorAll('rect').length === 1   /* only the lock body — the tile, its sheen and its shadow are not drawn */
      && !art.querySelector('.c-settings-about__mark') && !art.querySelector('filter') && !!art.querySelector('text');
    a.appIcon = !!appIcon && appIcon.getAttribute('aria-hidden') === 'true' && band.nextElementSibling === appIcon
      && appIcon.querySelectorAll('svg').length === 1 && !appIcon.textContent.trim()
      && JSON.stringify(kids) === JSON.stringify(['c-settings-about__band', 'c-settings-about__appicon', 'c-settings-about__app-name', 'c-settings-about__tagline', 'c-settings-about__version'])
      && hero.querySelector('h2') === hero.querySelector('.c-settings-about__app-name');
    /* jsdom runs no CSS animation, so this is the backstop path (reduced motion / hidden pane) — the hold still lands */
    a.held = await (async () => { for (let i = 0; i < 70 && hero && !hero.hasAttribute('data-held'); i++) await sleep(50); return !!hero && hero.hasAttribute('data-held'); })();
    a.chip = txt(hero && hero.querySelector('.c-settings-about__version')) === 'Version 0.9.22'
      && txt(hero.querySelector('.c-settings-about__version-num')) === '0.9.22' && !/spixi-/.test(el.textContent);
    const groups = [...el.querySelectorAll('.c-settings-about__group')];
    a.groups = groups.map((g) => txt(g.querySelector('.c-settings__label'))).join('|') === 'Why Spixi|Links|Legal and support';
    const facts = [...el.querySelectorAll('.c-settings-about__fact')];
    a.why = facts.length === 3 && facts.map((f) => txt(f.querySelector('.c-settings-links__label'))).join('|') === 'Decentralized|End-to-end encrypted|Your keys, your device'
      && facts.map((f) => txt(f.querySelector('.c-settings-links__sub'))).join('|') === 'Runs on the Ixian network, peer to peer.||Keys are made and kept on this device.'   /* ★ S13 re-base (#1269 (1)): the E2E row = its title alone (no sub element, txt(null) → '') */
      && !/person you write to/i.test(el.textContent)
      && facts.every((f) => f.tagName !== 'BUTTON' && !!f.querySelector('.c-disc'))
      && !/quantum|server/i.test(el.textContent);
    const linkRows = groups[1] ? [...groups[1].querySelectorAll('button.c-settings-links__row')] : [];
    const b0 = s.sent.length;
    linkRows.forEach((b) => b.click());
    await sleep(50);
    a.links = linkRows.map((b) => txt(b)).join('|') === 'Website|Ixian network|Source code'
      && JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:openLink:https://www.spixi.io', 'ixian:openLink:https://www.ixian.io', 'ixian:openLink:https://github.com/ixian-platform/Spixi']);
    const legalRows = groups[2] ? [...groups[2].querySelectorAll('button.c-settings-links__row')] : [];
    a.legalRows = legalRows.map((b) => txt(b.querySelector('.c-settings-links__label'))).join('|') === 'Privacy Policy|Terms of Use|Licenses|Rate Spixi';
    a.footer = txt(el.querySelector('.c-settings-about__legal')) === '© Ixian';
    const rate = el.querySelector('button.c-settings-about__rate');
    const b1 = s.sent.length;
    if (rate) rate.click();
    await sleep(50);
    a.rate = !!rate && txt(rate.querySelector('.c-settings-links__sub')) === 'Tell others what you think'
      && JSON.stringify(s.sent.slice(b1)) === JSON.stringify(['ixian:rating:yes']);
    /* Terms opens the in-app doc sheet (no verb) */
    const b2 = s.sent.length;
    if (legalRows[1]) legalRows[1].click();
    await sleep(200);
    a.terms = s.sent.length === b2 && !!s.d.querySelector('.c-launch__terms-body, .c-sheet');
    const sheetClose = s.d.querySelector('.c-launch__sheet-close');
    if (sheetClose) sheetClose.click();
    await sleep(400);
    /* Licences → the existing Contributors credits (the screen the hub row opens), no verb */
    const lic = s.d.querySelector('button.c-settings-about__licences');
    const b3 = s.sent.length;
    if (lic) lic.click();
    await sleep(300);
    a.licences = !!lic && !!s.d.querySelector('.c-settings-contrib .c-settings-contrib__credits') && s.sent.slice(b3).every((c) => !/^ixian:(openLink|rating)/.test(c));
    a.noErr = K.noErr(s.errs);
    close();

    /* without the cap: no Rate row; a malformed version: no chip */
    s = await K.boot('settings.html');
    s.push('setVersion', 'spixi-0.9.22 <b>');
    await sleep(150);
    const el2 = await openAbout();
    r.noRate = !!el2 && !el2.querySelector('.c-settings-about__rate') && !/Rate Spixi/.test(el2.textContent);
    r.noChipMalformed = !!el2 && !el2.querySelector('.c-settings-about__version');
    const V = s.W.Spixi.aboutVersionText;
    r.versionRule = V('spixi-0.9.22') === '0.9.22' && V('0.9.22-rc.1+b7') === '0.9.22-rc.1+b7' && V('SPIXI-1.0') === '1.0'
      && V('') === '' && V(null) === '' && V('spixi-') === '' && V('spixi-0.9 22') === '' && V('x'.repeat(33)) === '' && V('spixi-0.9.22<') === '';
    const el3 = s.W.Spixi.createSettingsAbout({ version: 'spixi-', strings: s.W.SL || {}, onOpenLink: () => {} });
    r.noChipEmpty = !el3.querySelector('.c-settings-about__version') && !el3.querySelector('.c-settings-about__licences');
    r.noErr = K.noErr(s.errs);
  } catch (e) { a.err = String(e && e.stack || e).slice(0, 300); }
  finally { close(); }
  ok(Object.values(a).every((x) => x === true),
    '★ S12 B (#1267) About B (EXECUTED, built settings.html): hero art + "Spixi" + the new tagline (★ S13 B "Banner hero": the art inside the aria-hidden band WITHOUT its tile/mark, the aria-hidden app icon right after the band, then name · tagline · chip; one entrance then data-held) + "Version 0.9.22" (spixi- stripped); Why Spixi = three facts (no quantum / server); Links still send ixian:openLink: with today\'s three URLs; Legal = Privacy · Terms (doc sheet) · Licences (→ Contributors credits) · Rate Spixi (cap) → ixian:rating:yes; "© Ixian" — ' + JSON.stringify(a));
  ok(Object.values(r).length > 0 && Object.values(r).every((x) => x === true),
    '★ S12 B (#1267) About B (EXECUTED): no `rate` cap → no Rate row; a malformed / empty version → no chip (only [0-9A-Za-z.+-]{1,32} after the spixi- strip) — ' + JSON.stringify(r));
}
