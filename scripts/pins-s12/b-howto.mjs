/* ==== S12 B (#1267) — Account › How to use Spixi, design "A, calm expandable list", EXECUTED on the BUILT settings.html ====
 *   · six rows, each a button with aria-expanded + aria-controls over a role=region; ONE open at a time; an open row
 *     shows its S11 art (data-illo) and its text; no "Show me" button
 *   · seen state: "{0} of 6 seen" + a bar; opening a row marks it seen (check badge) and writes localStorage
 *     `spixi.howtoSeen` as a JSON array of 1–6; a garbage value reads as 0 seen
 *   · "Need more help?": the community row (sends ixian:joinBot once) and Help centre (★ S14 #1285: ixian:aboutLink:help)
 * Deliberate breaks: see the S12 B report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const close = () => { if (s) { s.close(); s = null; } };
  const openHowTo = async () => {
    const b = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*How to use Spixi/.test(x.textContent || ''));
    if (b) b.click();
    await sleep(250);
    return s.d.querySelector('.c-settings-howto');
  };
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const a = {};
  const g = {};
  try {
    s = await K.boot('settings.html', { storage: { 'spixi.howtoSeen': '[2,1]' } });
    const el = await openHowTo();
    const heads = el ? [...el.querySelectorAll('button.c-settings-howto__head')] : [];
    const exp = () => heads.map((x) => x.getAttribute('aria-expanded')).join(',');
    const seenTxt = () => txt(el.querySelector('.c-settings-howto__seen'));
    const badges = () => heads.map((x) => (x.querySelector('.c-settings-howto__check').hidden ? 0 : 1)).join('');
    a.intro = txt(el && el.querySelector('.c-settings-howto__intro')) === 'Six things worth knowing. Tap one to see how it works.';
    a.six = heads.length === 6 && heads.map((x) => txt(x)).join('|') === 'Start a chat|Add a contact by QR|Send IXI in a chat|Use mini apps|Back up your account|Stay private';
    a.a11y = heads.every((x) => {
      const reg = s.d.getElementById(x.getAttribute('aria-controls') || '');
      return x.type === 'button' && !!reg && reg.getAttribute('role') === 'region' && reg.getAttribute('aria-labelledby') === x.id && reg.hidden;
    });
    a.closed = exp() === 'false,false,false,false,false,false';
    a.seededSeen = seenTxt() === '2 of 6 seen' && badges() === '110000' && !!el.querySelector('.c-settings-howto__bar');
    heads[2].click();
    await sleep(30);
    const reg3 = s.d.getElementById(heads[2].getAttribute('aria-controls'));
    a.openOne = exp() === 'false,false,true,false,false,false' && !reg3.hidden && !!reg3.querySelector('svg[data-illo="welcome3"]')
      && txt(reg3.querySelector('.c-settings-howto__text')) === 'Tap + in a chat to send or request IXI. You confirm every payment on your device.';
    a.markSeen = seenTxt() === '3 of 6 seen' && badges() === '111000' && s.W.localStorage.getItem('spixi.howtoSeen') === '[1,2,3]';
    heads[3].click();
    await sleep(30);
    a.oneAtATime = exp() === 'false,false,false,true,false,false' && reg3.hidden && reg3.childElementCount === 0;
    heads[3].click();
    await sleep(30);
    a.toggleClose = exp() === 'false,false,false,false,false,false' && seenTxt() === '4 of 6 seen';
    const arts = [];
    for (const x of heads) { x.click(); await sleep(10); const rg = s.d.getElementById(x.getAttribute('aria-controls')); const sv = rg.querySelector('svg[data-illo]'); arts.push(sv ? sv.getAttribute('data-illo') : '-'); }
    a.arts = arts.join(',') === 'chatsEmpty,addContact,welcome3,appsEmpty,backup,welcome1' && seenTxt() === '6 of 6 seen';
    a.noShowMe = ![...el.querySelectorAll('button')].some((b) => /show me/i.test(b.textContent));
    const more = el.querySelector('.c-settings-howto__more');
    const join = more && more.querySelector('button.c-settings-howto__join');
    const help = more && [...more.querySelectorAll('button.c-settings-links__row')].find((b) => /Help Center/.test(b.textContent));
    const b0 = s.sent.length;
    if (join) { join.click(); join.click(); }
    if (help) help.click();
    await sleep(50);
    a.more = txt(more && more.querySelector('.c-settings__label')) === 'Need more help?' && !!join && !!help
      && JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:joinBot', 'ixian:aboutLink:help']);   /* ★ S14 re-base (#1285): a fixed id, C# owns the URL */
    a.noErr = K.noErr(s.errs);
    close();

    /* garbage in the key → 0 seen; the reader refuses everything that is not a JSON array of 1–6 */
    s = await K.boot('settings.html', { storage: { 'spixi.howtoSeen': '{"1":true}' } });
    const el2 = await openHowTo();
    g.garbage = txt(el2 && el2.querySelector('.c-settings-howto__seen')) === '0 of 6 seen'
      && [...el2.querySelectorAll('.c-settings-howto__check')].every((b) => b.hidden);
    const R = s.W.Spixi.readHowToSeen;
    const st = (v) => ({ getItem: () => v });
    g.reader = JSON.stringify(R(st('[3,1,3]'))) === '[1,3]' && R(st(null)).length === 0 && R(st('nope')).length === 0
      && R(st('[1,9]')).length === 0 && R(st('[0]')).length === 0 && R(st('[1.5]')).length === 0 && R(st('["1"]')).length === 0
      && R(st('[1,2,3,4,5,6,1]')).length === 0 && R(st('[1,2]' + ' '.repeat(70))).length === 0 /* ★ r1 R3-NIT-7: > 64 chars, even when JSON.parse would accept it */ && R(st('1')).length === 0 && R({ getItem: () => { throw new Error('denied'); } }).length === 0
      && R(null).length === 0;
    g.noErr = K.noErr(s.errs);
  } catch (e) { a.err = String(e && e.stack || e).slice(0, 300); }
  finally { close(); }
  ok(Object.values(a).every((x) => x === true),
    '★ S12 B (#1267) How to use A (EXECUTED, built settings.html): six rows (button + aria-expanded + region), one open at a time with its S11 art and text, no "Show me"; seen line + badges follow the opens and spixi.howtoSeen holds [1..6]; Need more help = community (ixian:joinBot once) + Help centre (ixian:openLink: help centre) — ' + JSON.stringify(a));
  ok(Object.values(g).length > 0 && Object.values(g).every((x) => x === true),
    '★ S12 B (#1267) How to use A (EXECUTED): a garbage spixi.howtoSeen reads as 0 seen; the reader accepts only a JSON array of distinct-able integers 1–6 (≤ 6 entries), fenced — ' + JSON.stringify(g));
}
