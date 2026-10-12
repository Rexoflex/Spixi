/* ==== #1358 (Damir 2026-10-12 14:54, Direction A) — the address sheet is ONE identity card ====
 * On the BUILT settings.html (jsdom), through the real path (Account › Show QR):
 *   · the card holds, in order, the band → the avatar + the name (Account passes them) → the explainer line → the QR plate
 *     → the address group; Share is the full-width filled button UNDER the card, then the safety line (the #589 order of the
 *     explainer / QR / address / safety hooks is kept);
 *   · the address is ONE start…end group: the first 8 + " … " + the last 8; the FULL value stays in the DOM (a screen reader
 *     reads it); a tap shows it in full (data-full, aria-expanded true) and a tap on the full value folds it back;
 *   · Copy is a LABELLED pill ("Copy"), and its label morphs on success;
 *   · the peer subject (openAddressSheet with subject 'peer') keeps its fences: no Share, no safety line, no identity unless
 *     a name is given.
 *   · ★ S18 D1 RE-BASE (S17 walk AD-CARD, Damir 17:17): the REAL peer path — contact_details.html, the hero address row →
 *     openPeerAddressSheet — passes the contact's name + the header's photo: a named contact's sheet shows the avatar (the
 *     setAvatar src) + the name and still has no Share / no safety line; an address-shaped nickname (the Friend.nickname
 *     echo) shows NEITHER and the sheet keeps the 'Ixian address' title.
 * Deliberate break (#1358 report): the short form built from 6 + 6 → the group clause fails; Share appended back into the
 * address row → the order clause fails. ★ S18 D1: `name: peerName` dropped from openPeerAddressSheet → the peer clause fails
 * (peerNamed false); the guard dropped (name: state.name) → the peer clause fails (peerAddr false). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const ADDR = '4JsLSmAF4yp3j1T5gcrAkiFF2fYJSe4XM7rJBngtPmPUw2kL5AXKvvwg5yYbncdFa';
  let s = null;
  const r = {};
  try {
    s = await K.boot('settings.html', { wait: 900 });
    const { d, W } = s;
    s.push('setAddress', ADDR);
    s.push('setNickname', 'Shang Tsung');
    await sleep(300);
    const qr = [...d.querySelectorAll('.c-settings__hero button')].find((x) => /Show QR/i.test(x.getAttribute('aria-label') || ''));
    if (qr) qr.click();
    await sleep(300);
    const sheet = d.querySelector('.c-addr-sheet');
    const card = sheet && sheet.querySelector('.c-addr-sheet__card');
    const kids = card ? [...card.children].map((c) => (c.className.match(/c-addr-sheet__[a-z]+/) || [c.className])[0]) : [];
    r.cardOrder = kids.join('>') === 'c-addr-sheet__band>c-addr-sheet__avatar>c-addr-sheet__name>c-addr-sheet__explain>c-addr-sheet__qrwrap>c-addr-sheet__addr'
      && (card.querySelector('.c-addr-sheet__name') || {}).textContent === 'Shang Tsung';
    const after = sheet ? [...sheet.children].map((c) => (c.className.match(/c-addr-sheet__[a-z]+/) || [''])[0]).filter((x) => x && x !== 'c-addr-sheet__live') : [];   // the polite live region is not a visual block
    /* jsdom boots this shell as DESKTOP (the W9 rule: no distinct Share there) — the phone path is checked through the bundle below */
    r.underCard = after.join('>') === 'c-addr-sheet__card>c-addr-sheet__explain' && !!sheet.querySelector('.c-addr-sheet__explain--safe')
      && !sheet.querySelector('.c-addr-sheet__addr .c-addr-sheet__sharebtn');
    const row = card && card.querySelector('.c-addr-sheet__addr');
    const short = row && row.querySelector('.c-addr-sheet__short');
    const val = row && row.querySelector('.c-wallet-receive__addrvalue');
    r.group = !!short && short.textContent === ADDR.slice(0, 8) + ' … ' + ADDR.slice(-8) && short.getAttribute('aria-label') === ADDR
      && !!val && val.textContent === ADDR && !row.hasAttribute('data-full');
    if (short) short.click();
    const opened = row && row.hasAttribute('data-full') && short.getAttribute('aria-expanded') === 'true';
    if (val) val.click();
    r.toggle = !!opened && !row.hasAttribute('data-full') && short.getAttribute('aria-expanded') === 'false';
    const copy = row && row.querySelector('.c-addr-sheet__copy');
    r.copyPill = !!copy && /Copy/.test((copy.querySelector('.c-addr-sheet__copytext') || {}).textContent || '') && !!copy.querySelector('svg');
    /* the phone path (a Share handler), straight through the bundle: Share is the full-width filled action UNDER the card */
    W.Spixi.closeAddressSheet();
    await sleep(450);
    const own = W.Spixi.openAddressSheet({ address: ADDR, host: d.body, name: 'Shang Tsung', onShare() {} });
    await sleep(100);
    const oc = own ? [...own.querySelector('.c-addr-sheet').children].map((c) => (c.className.match(/c-addr-sheet__[a-z]+/) || [''])[0]).filter((x) => x && x !== 'c-addr-sheet__live') : [];
    r.share = oc.join('>') === 'c-addr-sheet__card>c-addr-sheet__sharebtn>c-addr-sheet__explain'
      && own.querySelector('.c-addr-sheet__sharebtn').dataset.width === 'full' && own.querySelector('.c-addr-sheet__sharebtn').dataset.type === 'fill'
      && !own.querySelector('.c-addr-sheet__addr .c-addr-sheet__sharebtn');
    W.Spixi.closeAddressSheet();
    await sleep(450);
    /* the peer subject */
    const peer = W.Spixi.openAddressSheet({ address: ADDR, subject: 'peer', host: d.body, onShare() {} });
    await sleep(100);
    r.peer = !!peer && !peer.querySelector('.c-addr-sheet__sharebtn') && !peer.querySelector('.c-addr-sheet__explain--safe')
      && !peer.querySelector('.c-addr-sheet__avatar') && !!peer.querySelector('.c-addr-sheet__card .c-addr-sheet__short');
    W.Spixi.closeAddressSheet();
  } catch (e) { r.threw = e.message; }
  finally { if (s && s.close) s.close(); }
  /* ★ S18 D1 (AD-CARD): the real peer path on the BUILT contact_details.html — a named contact, then an address-shaped nick */
  const peerPath = async (nick) => {
    const c = await K.boot('contact_details.html', { wait: 900 });
    try {
      c.push('setAddress', ADDR); c.push('setNickname', nick); c.push('setAvatar', 'Avatars/liu-kang.png');
      await sleep(400);
      const row = c.d.querySelector('.c-chat-info__addr-row');
      if (row) row.click();
      await sleep(200);
      const sh = c.d.querySelector('.c-addr-sheet');
      const av = sh && sh.querySelector('.c-addr-sheet__card > .c-addr-sheet__avatar');
      const img = av && av.querySelector('img');
      const nm = sh && sh.querySelector('.c-addr-sheet__card > .c-addr-sheet__name');
      return { sheet: !!sh, avatar: img ? img.getAttribute('src') : (av ? 'placeholder' : null), name: nm ? nm.textContent : null,
        title: sh ? sh.getAttribute('aria-label') : null,
        fences: !!sh && !sh.querySelector('.c-addr-sheet__sharebtn') && !sh.querySelector('.c-addr-sheet__explain--safe') };
    } finally { c.close(); }
  };
  try {
    const named = await peerPath('Liu Kang');
    r.peerNamed = named.sheet && named.avatar === 'Avatars/liu-kang.png' && named.name === 'Liu Kang' && named.title === 'Ixian address'   /* re-based by #46 r2 MINOR-2: the name sits in the card once; the heading says what the sheet is */ && named.fences;
    const echo = await peerPath(ADDR);
    r.peerAddr = echo.sheet && echo.avatar === null && echo.name === null && echo.title === 'Ixian address' && echo.fences;
    if (!r.peerNamed || !r.peerAddr) r.peerDetail = JSON.stringify({ named, echo });
  } catch (e) { r.peerThrew = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★ #1358 (Damir 14:54, Direction A): the address sheet is ONE identity card (band · avatar + name · explainer line · QR · the address) with the full-width Share and the safety line under it; the address is ONE start…end group (8 … 8) whose full value stays in the DOM and opens / folds on a tap; Copy is a labelled pill; a contact\'s sheet keeps its fences (no Share, no safety line); ★ S18 D1 (AD-CARD): through the real contact page a NAMED contact shows its photo + name, an address-shaped nickname shows neither — ' + JSON.stringify(r));
}
