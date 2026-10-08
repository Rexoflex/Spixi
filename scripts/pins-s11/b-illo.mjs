/* ==== S11 B (#1262) — THE ILLUSTRATION SET, INLINE: the factories + every HOME-shell site ====
 * On the BUILT index.html (jsdom; the bundle the shell really runs):
 *   · every factory returns an SVG-namespace <svg>, decorative (aria-hidden="true" focusable="false"), with drawn
 *     children; its gradient/filter ids are UNIQUE PER CALL — two copies of one art (and two empty states on one page)
 *     share no id, and every url(#…) / href="#…" inside an svg resolves to an id inside THAT svg
 *   · illustrationFor(): each legacy path a host still passes names its drawing; an unknown path → null (the <img>
 *     ladder stays for it)
 *   · the sites: chats zero state (pushed clearChats → clearChatsDone), Explore banner, apps zero state, contacts
 *     picker zero state, the add-contact sheet, the backup + rating nudges (rating = version D, rn-once), the wallet
 *     zero state (art BACK — overrides #453 — CTA "Show my address" kept, F5 slot drop kept for an explicit null)
 *   · the built settings_backup.html hero draws the backup art
 * Deliberate breaks: see the S11 B report. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const NAMES = ['illoWelcome1', 'illoWelcome2', 'illoWelcome3', 'illoWelcome4', 'illoRestore', 'illoChatsEmpty',
    'illoContactsEmpty', 'illoAddContact', 'illoAppsEmpty', 'illoExplore', 'illoBackup', 'illoRating', 'illoWalletEmpty'];
  const SVGNS = 'http://www.w3.org/2000/svg';
  /* every reference inside an svg points at an id that lives in the SAME svg */
  const refsLocal = (svg) => {
    const own = new Set([...svg.querySelectorAll('[id]')].map((e) => e.id));
    const refs = [];
    for (const e of svg.querySelectorAll('*')) {
      for (const a of e.getAttributeNames()) {
        const v = e.getAttribute(a) || '';
        for (const m of v.matchAll(/url\(#([^)]+)\)/g)) refs.push(m[1]);
        if (/href$/.test(a) && v.startsWith('#')) refs.push(v.slice(1));
      }
    }
    return refs.length > 0 && refs.every((r) => own.has(r));
  };
  const deco = (svg) => !!svg && svg.namespaceURI === SVGNS && svg.getAttribute('aria-hidden') === 'true'
    && svg.getAttribute('focusable') === 'false' && svg.children.length > 1;
  const dupIds = (d) => { const ids = [...d.querySelectorAll('[id]')].map((e) => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i); };
  let s = null;
  try {
    s = await boot('index.html');
    const { d, W } = s;
    const S = W.Spixi;

    /* —— factories —— */
    const f = {};
    for (const n of NAMES) {
      const a = S[n] && S[n]({ className: 'x-probe' });
      const b = S[n] && S[n]();
      const idsA = a ? [...a.querySelectorAll('[id]')].map((e) => e.id) : [];
      const idsB = b ? [...b.querySelectorAll('[id]')].map((e) => e.id) : [];
      f[n] = deco(a) && deco(b) && a.classList.contains('x-probe') && !b.classList.contains('x-probe')
        && idsA.length > 0 && idsA.every((x) => !idsB.includes(x)) && refsLocal(a) && refsLocal(b);
    }
    ok(Object.values(f).length === 13 && Object.values(f).every(Boolean),
      '★ S11 B (#1262): all 13 illustration factories return a decorative SVG-namespace <svg> (aria-hidden + focusable=false) whose ids are UNIQUE PER CALL and whose every url(#…)/href ref resolves inside the same svg — ' + JSON.stringify(f));

    const legacy = {
      'images/onboarding/step1.png': 'welcome1', 'images/onboarding/step4.png': 'welcome4', 'images/onboarding/restore.png': 'restore',
      'images/chats-es.png': 'chatsEmpty', 'images/contacts-es.svg': 'contactsEmpty', 'images/apps-es.png': 'appsEmpty',
      'images/explore-banner.png': 'explore', 'images/add-contact.png': 'addContact', 'images/backup.png': 'backup',
      'images/onboarding/rate.png': 'rating', 'images/wallet-es.png': 'walletEmpty',
    };
    const res = {};
    for (const [p, want] of Object.entries(legacy)) { const fn = S.illustrationFor(p); res[p] = !!fn && fn().getAttribute('data-illo') === want; }
    ok(Object.values(res).every(Boolean) && S.illustrationFor('images/nope.png') === null && S.illustrationFor('') === null
       && S.illustrationFor(null) === null && S.illustrationFor(S.illoBackup) === S.illoBackup,
      '★ S11 B: illustrationFor() maps every legacy path a host still passes to ITS drawing, passes a factory through, and returns null for an unknown path (that host keeps the <img> ladder) — ' + JSON.stringify(res));

    /* —— chats zero state (the real push sequence) + no duplicate id on the page —— */
    s.push('clearChats');
    s.push('clearChatsDone');
    await sleep(500);
    const chatsArt = d.querySelector('.c-chats-list .c-empty-state__illo > svg[data-illo="chatsEmpty"]');
    ok(deco(chatsArt) && chatsArt.classList.contains('c-empty-state__illo-img') && !d.querySelector('.c-chats-list .c-empty-state__illo img')
       && chatsArt.parentElement.getAttribute('aria-hidden') === 'true',
      '★ S11 B: the HOME chats zero state draws the inline chats art (round 3) in the aria-hidden slot — no <img>, no fetch');

    const host = d.createElement('div');
    d.body.append(host);
    host.append(S.createEmptyState({ illustration: 'images/chats-es.png', title: 'a' }), S.createEmptyState({ illustration: 'images/chats-es.png', title: 'b' }));
    const two = [...host.querySelectorAll('svg[data-illo="chatsEmpty"]')];
    ok(two.length === 2 && dupIds(d).length === 0 && two.every(refsLocal),
      '★ S11 B: TWO empty states with the same art on ONE page share no gradient/filter id (document-wide duplicates: ' + JSON.stringify(dupIds(d).slice(0, 4)) + ')');
    host.remove();

    /* —— Explore banner (the production exploreImage path) + apps zero state —— */
    const hdr = S.createAppsHeader({ exploreImage: 'images/explore-banner.png' });
    const ex = hdr.querySelector('.c-apps-explore > svg.c-apps-explore__illo');
    ok(deco(ex) && ex.getAttribute('data-illo') === 'explore' && ex.getAttribute('preserveAspectRatio') === 'xMaxYMax meet'
       && ex.previousElementSibling && ex.previousElementSibling.classList.contains('c-apps-explore__text') && !hdr.querySelector('img'),
      '★ S11 B: the Explore banner draws the inline art as the FLEX SIBLING of the copy, pinned bottom-right (xMaxYMax = the old object-position)');
    const apps = S.createAppsList({ apps: [], query: '', layout: 'list' }, { strings: {}, emptyIllustration: 'images/apps-es.png', onAddApp: () => {} });
    ok(deco(apps.querySelector('.c-empty-state__illo > svg[data-illo="appsEmpty"]')),
      '★ S11 B: the apps zero state (home passes images/apps-es.png) draws the inline apps art (round 1)');

    /* —— contacts picker zero state + the add-contact sheet —— */
    const picker = S.createContactsPicker({ contacts: [], purpose: 'start', onAddContact: () => {} });
    d.body.append(picker);
    ok(deco(picker.querySelector('.c-contacts__zero svg[data-illo="contactsEmpty"]')),
      '★ S11 B: the contacts zero state draws the inline contacts art (round 1)');
    picker.remove();
    const sheet = S.createAddContactSheet ? S.createAddContactSheet({ strings: {}, onScan: () => {}, onEnter: () => {} }) : null;
    const addArt = sheet && sheet.querySelector('.c-contacts-addsheet__art > svg[data-illo="addContact"]');
    ok(deco(addArt) && !sheet.querySelector('.c-contacts-addsheet__art img') && !sheet.querySelector('.c-contacts-addsheet__art[data-placeholder]'),
      '★ S11 B: the add-contact sheet draws the inline add-contact art (round 1) — the PNG and its glyph-tile ladder are gone');

    /* —— the nudges, as home calls them —— */
    const bn = S.showBackupNudge({ host: d.body, illustration: 'images/backup.png' });
    const bArt = bn.querySelector('svg.c-backup-nudge__illo[data-illo="backup"]');
    ok(deco(bArt) && bn.querySelector('.c-backup-nudge__disc').hidden === true && !bn.querySelector('img'),
      '★ S11 B: the backup nudge (home passes images/backup.png) leads with the inline backup art (round 3) and hides the disc');
    const rn = S.showRatingNudge({ host: d.body, illustration: 'images/onboarding/rate.png' });
    const rArt = rn.querySelector('svg.c-rating-nudge__illo[data-illo="rating"]');
    ok(deco(rArt) && rArt.classList.contains('rn-illo') && rArt.classList.contains('rn-once') && rArt.getAttribute('viewBox') === '0 0 320 210'
       && rArt.querySelectorAll('.rn-rise').length === 4 && rArt.querySelectorAll('.rn-pop').length > 0 && rn.querySelector('.c-rating-nudge__disc').hidden === true,
      '★ S11 B: the rating nudge (home passes images/onboarding/rate.png) draws version D "Phone" — rn-once, the bubbles (rn-pop) and the four rising hearts (rn-rise) — and hides the disc');

    /* —— the wallet zero state: art BACK in the compact block, CTA kept —— */
    const tx = S.createWalletTxList ? S.createWalletTxList({ txs: [], filter: 'all', query: '' }, { onReceive: () => {} }) : d.createElement('div');
    tx.classList.add('c-wallet-txlist');
    S.renderWalletTxList(tx, { txs: [], filter: 'all', query: '' }, { onReceive: () => {} });
    const wes = tx.querySelector('.c-empty-state');
    const wArt = wes && wes.querySelector('.c-empty-state__illo > svg[data-illo="walletEmpty"]');
    const cta = wes && wes.querySelector('.c-empty-state__action .c-button');
    const tx2 = d.createElement('div');
    S.renderWalletTxList(tx2, { txs: [], filter: 'all', query: '' }, { onReceive: () => {}, emptyArt: null });
    ok(!!wes && wes.dataset.compact !== undefined && deco(wArt) && !!cta && /Show my address/.test(cta.textContent)
       && !!tx2.querySelector('.c-empty-state') && !tx2.querySelector('.c-empty-state__illo'),
      '★ S11 B (overrides #453): the wallet zero state draws the wallet art (round 1) in the COMPACT block and keeps "Show my address"; an explicit emptyArt: null still drops the slot whole (F5)');
    ok(s.errs.length === 0, '★ S11 B: the home shell raised no page error while drawing the set — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S11 B b-illo threw: ' + e.message);
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }

  /* —— the Backup screen hero (settings_backup.html as built) —— */
  try {
    s = await boot('settings_backup.html');
    const hero = s.d.querySelector('.c-settings-backup__art > svg.c-settings-backup__illustration[data-illo="backup"]');
    ok(deco(hero) && !s.d.querySelector('.c-settings-backup__art img'),
      '★ S11 B: the built Backup screen draws the SAME backup art (round 3) in its 128 hero slot (the shell still passes images/backup.png)');
  } catch (e) {
    ok(false, '★ S11 B settings_backup threw: ' + e.message);
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
}
