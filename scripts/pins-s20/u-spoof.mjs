/* ==== S20 U — the wallet join cannot be SPOOFED by a nickname (#46 security pass, F1 MAJOR + F3, DECISIONS #1440) ====
 * WHAT: C# sends a contact's NICKNAME as the payment counterparty, and a peer chooses its own nickname. On the BUILT
 * index.html (jsdom, phone → the in-page tx sheet):
 *   · contact X sets its nickname to ALICE's exact address and pays → X's row wears NO photo of Alice (the wallet disc),
 *     and the tx sheet does not name Alice nor show her photo (enrichTx returns the tx unchanged);
 *   · a second contact copies Alice's NICKNAME → the row shows the monogram and the sheet does not join either one
 *     (enrichTx joins a nickname only when ONE person carries it);
 *   · control: Alice's own payment (her nickname, unique) still shows her photo and "Alice" in the sheet;
 *   · F3: a person and a group with the same name → the person's face (people first; a group only when no person matches).
 * DELIBERATE BREAKS (each run once, the pin failed for exactly that reason, then restored — see the S20 U F1 report):
 *   ① home.html faceOf: drop `|| (r.address && txAddrSpoofed(r.address))` — X's row wears Alice's photo.
 *   ② home.html enrichTx: drop the `txAddrSpoofed(raw.address)) return tx;` guard — the sheet says "Alice" with her photo.
 *   ③ home.html enrichTx: `named.length === 1 ? named[0] : null` → `named[0] || null` — the copied nickname joins Alice.
 *   ⑤ home.html enrichTx: drop `!isGroupContact(c) && ` from the name leg — the sheet joins the group (fence).
 *   ④ home.html faceOf: drop the people-first step (`hits = ppl.length ? ppl : …`) — the person loses its face (F3). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const ALICE = '3X7kq9PmWvR2tYb8NcLd4Hs6ZuJf5gAe1oQi9KxM2yTr4UoPb7VnDc3LhS8FwEjGq';   // 65 chars, base58 (no "l": cannot contain "Alice")
  try {
    s = await K.boot('index.html', { now: new Date(2026, 9, 13, 15, 0).getTime() });
    s.push('selectTab', 'tab2');
    await sleep(100);
    const t = String(Math.floor(new Date(2026, 9, 13, 9, 30).getTime() / 1000));
    const W = s.W;
    const row = (id) => s.d.querySelector('#wallet-scroll .c-txlist-item[data-txid="' + id + '"]');
    const photo = (el) => [...(el ? el.querySelectorAll('img') : [])].map((i) => i.getAttribute('src'));
    const sheetOf = async (id) => {
      for (const sh of s.d.querySelectorAll('.c-sheet')) sh.remove();
      const r = row(id); if (r) r.click();
      await sleep(80);
      const sh = s.d.querySelector('.c-sheet');
      return { text: sh ? sh.textContent : '', imgs: photo(sh) };
    };
    const roster = (list) => { s.push('clearContacts'); for (const c of list) s.push('addContact', ...c); };
    const flush = async (rows) => {
      s.push('clearPaymentActivity', 'all');
      for (const r of rows) s.push('addPaymentActivity', ...r);
      s.push('clearPaymentActivityDone');
      await sleep(200);
    };
    /* ① X's nickname = Alice's address */
    roster([[ALICE, 'Alice', PNG, 'false', '0', 'contact', ''], ['XAddr1', ALICE, PNG2, 'false', '0', 'contact', '']]);
    await sleep(120);
    await flush([['sx', '1', ALICE, t, '5', '', 'true'], ['sa', '1', 'Alice', t, '7', '', 'true']]);
    const xs = await sheetOf('sx');
    const as = await sheetOf('sa');
    const r1 = {
      xRowNoAlice: !!row('sx') && !photo(row('sx')).includes(PNG) && !!row('sx').querySelector('.c-txlist-item__wallet'),
      xSheetNoAlice: !!xs.text && !/Alice/.test(xs.text) && !xs.imgs.includes(PNG),
      ctrlRow: photo(row('sa')).includes(PNG),
      ctrlSheet: /Alice/.test(as.text) && as.imgs.includes(PNG),
    };
    ok(Object.values(r1).every(Boolean),
      '★ S20 #46 F1 (#1440): a contact whose NICKNAME is Alice\'s address pays → its row shows no Alice photo (the wallet disc) and the tx sheet neither names Alice nor shows her photo; Alice\'s own payment still joins — ' + JSON.stringify(r1));
    /* ② a second contact copies Alice's NICKNAME → no join on either side */
    roster([[ALICE, 'Alice', PNG, 'false', '0', 'contact', ''], ['XAddr2', 'Alice', '', 'false', '0', 'contact', '']]);
    await sleep(250);
    const ds = await sheetOf('sa');
    const r2 = { rowMono: !photo(row('sa')).includes(PNG) && !!row('sa').querySelector('.c-avatar__initials'), sheetNoPhoto: !ds.imgs.includes(PNG), sheetNoAddr: !ds.text.includes(ALICE) };
    ok(Object.values(r2).every(Boolean),
      '★ S20 #46 F1 (#1440): two contacts share the nickname "Alice" → the row shows the monogram and the sheet joins neither (no photo, no address) — ' + JSON.stringify(r2));
    /* ③ F3: a person and a group named the same → the person's face */
    roster([['TeamP', 'Team', PNG, 'false', '0', 'contact', ''], ['TeamG', 'Team', PNG2, 'false', '0', 'contact', 'group']]);
    await sleep(120);
    await flush([['st', '1', 'Team', t, '1', '', 'true'], ['sg', '1', 'Solo Group', t, '1', '', 'true']]);
    const r3 = { person: photo(row('st')).includes(PNG) && !photo(row('st')).includes(PNG2) };
    roster([['GrpAddrQ7', 'Solo Group', PNG2, 'false', '0', 'contact', 'group']]);
    await sleep(250);
    r3.groupOnly = photo(row('sg')).includes(PNG2);
    const gs = await sheetOf('sg');
    r3.fence = !!gs.text && !gs.text.includes('GrpAddrQ7') && !gs.imgs.includes(PNG2);   // the sheet never joins a GROUP (money fence, #255)
    ok(r3.person && r3.groupOnly && r3.fence,
      '★ S20 #46 F3 (#1440): people first — a person and a group with one name → the person\'s face; a group face only when no person matches; the tx SHEET never joins a group (no group address or photo — the #255 money fence) — ' + JSON.stringify(r3));
    ok(K.noErr(s.errs), '★ S20 #46 F1: the spoof pass raised no page error — ' + JSON.stringify(s.errs));
  } finally {
    if (s) s.close();
  }
}
