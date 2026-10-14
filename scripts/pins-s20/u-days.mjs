/* ==== S20 U — the wallet DAY GROUPS (J2 tweak 2, DECISIONS #1440) ====
 * WHAT: on the BUILT index.html (jsdom, the clock pinned to Tue 13 Oct 2026 15:00 local) the wallet list opens each
 * day's run of rows with a header — "Today", "Yesterday", then the locale short date ("Oct 11"), with the year only
 * when it is not this year ("Dec 30, 2025") — and each row then shows the TIME alone. The headers are plain blocks in
 * the list (not sticky: no position on them). Search and the filters work across the groups: a search that leaves a
 * day empty drops that day's header; C#'s Sent re-push regroups; a row from an old exe (a pre-formatted time, no epoch)
 * gets no header and keeps its full time text. The day stamp re-renders the list when the date rolls over.
 * DELIBERATE BREAKS (each run once, the pin failed for exactly that reason, then restored — see the S20 U report):
 *   ① wallet-shell.js txDayLabel: `d.getFullYear() === n.getFullYear()` → `true` (never the year) — "Dec 30" for 2025.
 *   ② wallet-shell.js renderWalletTxList: `timeOnly: true` → `timeOnly: false` — rows carry the date again.
 *   ③ wallet-shell.js renderWalletTxList: `if (day && day !== lastDay)` → `if (day)` — a header before every row ("Today" twice).
 *   ④ home.html: delete the ticker's `walletList.dataset.day` re-render — the list keeps "Today" past midnight.
 *   ⑤ wallet-shell.js: `if (day) lastDay = day;` → `lastDay = day;` — "Today" repeats after the dateless row.
 *   ⑥ wallet-shell.js txDayLabel: `diff <= 0` → `diff === 0` — the future row gets a date header.
 *   ⑦ wallet-shell.js: lead = nothing (`txs.filter(() => false)`, the rest = all) — the Pending row gets a header and loses its date.
 *   ⑧ wallet-shell.js: drop the `settled.sort(…)` — the out-of-order push draws "Today" twice.
 *   ⑨ wallet-shell.js: lead = pending OR failed — the Rejected row from Oct 8 is hoisted above Today.
 *   ⑩ wallet-shell.js: lead = the r4 LEADING RUN of pending / failed — the newest Expired row (pushed right after Pending) is hoisted. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  try {
    const at = (y, mo, d, hh, mm) => String(Math.floor(new Date(y, mo, d, hh, mm).getTime() / 1000));
    const now = new Date(2026, 9, 13, 15, 0).getTime();
    s = await K.boot('index.html', { now });
    s.push('selectTab', 'tab2');
    await sleep(100);
    const ROWS = [
      ['t1', '0', 'Ana Kovač', at(2026, 9, 13, 9, 30), '25', '', 'true'],
      ['t2', '1', 'Leo Martins', at(2026, 9, 13, 9, 15), '12', '', 'true'],
      ['t3', '1', 'Marco Bianchi', at(2026, 9, 12, 7, 41), '5', '', 'true'],
      ['t4', '0', 'Sofia Rossi', at(2026, 9, 11, 9, 41), '18.2', '', 'true'],
      ['t5', '0', 'Old Friend', at(2025, 11, 30, 18, 5), '1', '', 'true'],
    ];
    const flush = async (filter, rows) => {
      s.push('clearPaymentActivity', filter);
      for (const r of rows) s.push('addPaymentActivity', ...r);
      s.push('clearPaymentActivityDone');
      await sleep(150);
    };
    await flush('all', ROWS);
    const list = s.d.querySelector('#wallet-scroll .c-wallet-txlist');
    const seq = () => [...list.children].map((c) => (c.classList.contains('c-wallet-day') ? 'H:' + c.textContent : c.dataset.txid || c.className));
    const time = (id) => { const r = list.querySelector('[data-txid="' + id + '"] .c-txlist-item__time'); return r ? r.textContent : ''; };
    const s1 = seq();
    const head = list.querySelector('.c-wallet-day');
    const r1 = {
      seq: s1.join(' '),
      order: s1.join('|') === 'H:Today|t1|t2|H:Yesterday|t3|H:Oct 11|t4|H:Dec 30, 2025|t5',
      timeOnly: /^9:30\s?AM$/.test(time('t1')) && /^7:41\s?AM$/.test(time('t3')) && /^6:05\s?PM$/.test(time('t5')),
      heading: !!head && head.getAttribute('role') === 'heading',
      notSticky: !!head && !/sticky|fixed/.test(s.W.getComputedStyle(head).position),
    };
    ok(r1.order && r1.timeOnly && r1.heading && r1.notSticky,
      '★ S20 J2 (#1440): day headers "Today" · "Yesterday" · the short date · the short date WITH the year when not this year; each row shows the time alone; the header is a heading, not sticky — ' + JSON.stringify(r1));
    /* search across groups: "o" keeps Leo (today), Marco (yesterday), Sofia (Oct 11), Old Friend; "Ana" → one day only */
    const inp = s.d.querySelector('#wallet-scroll .c-wallet-tools .c-search-field input');
    const search = async (v) => { inp.value = v; inp.dispatchEvent(new s.W.Event('input', { bubbles: true })); await sleep(60); };
    await search('Marco');
    const r2 = { marco: seq().join('|') };
    await search('Ana');
    r2.ana = seq().join('|');
    await search('zzz');
    r2.none = seq().join('|');
    await search('');
    r2.back = seq().join('|');
    ok(r2.marco === 'H:Yesterday|t3' && r2.ana === 'H:Today|t1' && !/H:/.test(r2.none) && r2.back === s1.join('|'),
      '★ S20 J2 (#1440): search runs across the groups — a day with no match loses its header, a miss shows no header at all, clearing restores every group — ' + JSON.stringify(r2));
    /* the Sent filter: C# re-pushes the outgoing subset → the groups are rebuilt from it */
    await flush('sent', ROWS.filter((r) => r[1] === '0'));
    const r3 = { sent: seq().join('|') };
    await flush('all', ROWS);
    ok(r3.sent === 'H:Today|t1|H:Oct 11|t4|H:Dec 30, 2025|t5',
      '★ S20 J2 (#1440): the Sent filter regroups the outgoing rows — Yesterday (only a receive) disappears — ' + JSON.stringify(r3));
    /* an old exe's pre-formatted time: no epoch → no header, the full text verbatim */
    await flush('all', [ROWS[0], ['t9', '1', 'Legacy', 'Oct 2, 4:10 PM', '2', '', 'true']]);
    const r4 = { seq: seq().join('|'), text: time('t9') };
    ok(r4.seq === 'H:Today|t1|t9' && r4.text === 'Oct 2, 4:10 PM',
      '★ S20 J2 (#1440): a row with a pre-formatted time (an old exe) gets no header and keeps its full text — ' + JSON.stringify(r4));
    /* #46 r1: a dateless row INSIDE a day's run keeps the run (no second header); a future epoch (clock skew) is Today */
    await flush('all', [['f1', '1', 'Skewed', at(2026, 9, 14, 8, 0), '1', '', 'true'], ROWS[0], ['t9', '1', 'Legacy', 'Oct 2, 4:10 PM', '2', '', 'true'], ROWS[1], ROWS[2]]);
    const r6 = { seq: seq().join('|') };
    ok(r6.seq === 'H:Today|f1|t1|t9|t2|H:Yesterday|t3',
      '★ S20 J2 (#46 r1): a future-dated row (clock skew) groups under "Today", and a row without an epoch between two of today\'s rows does not repeat the header — ' + JSON.stringify(r6));
    /* the date rolls over: the timestamp ticker re-renders the list, Today becomes Yesterday */
    await flush('all', ROWS);
    s.clock.set(new Date(2026, 9, 14, 0, 0, 30).getTime());
    s.resume();
    await sleep(120);
    const r5 = { seq: seq().join('|') };
    ok(r5.seq.startsWith('H:Yesterday|t1|t2|H:Oct 12|t3'),
      '★ S20 J2 (#1440): when the date rolls over the list re-renders (the timestamp ticker reads the stamped day) — "Today" becomes "Yesterday" — ' + JSON.stringify(r5));
    ok(K.noErr(s.errs), '★ S20 J2 (#1440): the day-group pass raised no page error — ' + JSON.stringify(s.errs));
    s.close(); s = null;
    /* ★ #46 r3–r5: the REAL C# push order (HomePage.loadTransactions: Rejected, Reverted, Pending, then the rest newest-first)
       in two time zones. Only PENDING rows lead (no header, full date + time); every failed row (Rejected / Expired — both
       "error") sits in its OWN day group with its failed style; each header once. process.env.TZ is restored in finally. */
    const tz0 = process.env.TZ;
    try {
      const res = {};
      const rowsIn = () => [   // built AFTER the zone is set: the epochs are local wall times in that zone
        ['r1', '0', 'Rejected', at(2026, 9, 8, 23, 30), '4', '', 'error'],   // a Rejected row from another day, pushed FIRST
        ['p1', '0', 'Pending', at(2026, 9, 13, 9, 0), '3', '', 'false'],
        ['e0', '0', 'ExpiredNew', at(2026, 9, 13, 14, 45), '2', '', 'error'],  // #46 r5: the NEWEST of the dated loop is an Expired send
        ['s1', '1', 'Newest', at(2026, 9, 13, 10, 0), '1', '', 'true'],
        ['s3', '1', 'Yday', at(2026, 9, 12, 20, 0), '1', '', 'true'],          // out of date order on purpose
        ['s2', '1', 'Earlier', at(2026, 9, 13, 8, 0), '1', '', 'true'],
        ['s4', '0', 'Old', at(2026, 9, 7, 12, 0), '1', '', 'true'],
        ['e1', '0', 'Expired', at(2026, 8, 3, 14, 0), '2', '', 'error'],      // #46 r4: an Expired send 40 days old
      ];
      for (const tz of ['Europe/Belgrade', 'America/New_York']) {
        process.env.TZ = tz;
        const ALL = rowsIn();
        s = await K.boot('index.html', { now: new Date(2026, 9, 13, 15, 0).getTime() });
        s.push('selectTab', 'tab2');
        await sleep(100);
        const l = () => s.d.querySelector('#wallet-scroll .c-wallet-txlist');
        const seqNow = () => [...l().children].map((c) => (c.classList.contains('c-wallet-day') ? 'H:' + c.textContent : c.dataset.txid)).join('|');
        const t = (id) => { const e = l().querySelector('[data-txid="' + id + '"] .c-txlist-item__time'); return e ? e.textContent : ''; };
        const failed = (id) => { const e = l().querySelector('[data-txid="' + id + '"]'); return !!e && e.dataset.type === 'failed'; };
        await flush('all', ALL);
        const r = { seq: seqNow(), r1: t('r1'), p1: t('p1'), e0: t('e0'), s1: t('s1'), e1: t('e1'), failedStyle: failed('r1') && failed('e0') && failed('e1') };
        await flush('sent', ALL.filter((x) => x[1] === '0'));   // C# re-pushes the Sent subset in the same status order
        r.sent = seqNow();
        res[tz] = r;
        s.close(); s = null;
      }
      const good = (r) => r.seq === 'p1|H:Today|e0|s1|s2|H:Yesterday|s3|H:Oct 8|r1|H:Oct 7|s4|H:Sep 3|e1'
        && r.sent === 'p1|H:Today|e0|H:Oct 8|r1|H:Oct 7|s4|H:Sep 3|e1'
        && /^Oct 13, 9:00\s?AM$/.test(r.p1) && /^11:30\s?PM$/.test(r.r1) && /^2:45\s?PM$/.test(r.e0) && /^10:00\s?AM$/.test(r.s1)
        && /^2:00\s?PM$/.test(r.e1) && r.failedStyle;
      ok(Object.values(res).every(good),
        '★ S20 J2 (#46 r3–r5): in C#\'s real push order (Rejected · Pending · then the rest, newest an Expired send) only the PENDING row leads (no header, full date + time); every failed row — Rejected, Expired — sits in its own day group, failed style, time only; "Today" · "Yesterday" · each date ONCE; the Sent re-push the same — Belgrade and New York — ' + JSON.stringify(res));
    } finally {
      if (tz0 === undefined) delete process.env.TZ; else process.env.TZ = tz0;
    }
  } finally {
    if (s) s.close();
  }
}
