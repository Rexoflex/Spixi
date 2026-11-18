/* ==== photo1b HV-1 (cap `olderInsert`, switch HistoryInsertOnly) — an older page inserts ONLY its own rows, and the log is the full render's ====
 * Behaviour on the BUILT chat.html in jsdom (scripts/pins-photo1b/a-kit.mjs: the shell's own pushes; three test-only probes in memory).
 * Every case runs TWO documents fed the SAME pushes: A with the cap `olderInsert`, B without it (= the old path: every page ends in
 * a full renderLogNow()). After the open and after EVERY page the pin compares, byte for byte, A's `#messages` innerHTML with B's, and
 * the shell's `rows` map (id → the index of its row among the log's children, in map order). It also reads A's dev line
 * `[P1] shell older insert … mode=<insert|full>` per page and the probe count of full renders (an insert page runs NO full render;
 * a refused page runs exactly one), and B's lines (every page mode=full, one full render each).
 * Cases (each: an open of 50 rows, then pages of 100 / 50 / 50 rows with messagesDone("true"), the last "false"):
 *   T  text 1:1 (two senders in runs, several days; seam 1 continues a run on the SAME day → the separator above the old first row goes
 *      and the seam row's group position changes; seam 2 is a day boundary exactly at the seam → the separator stays), reactions on
 *      old and new rows, an old row that QUOTES a row of page 1 (re-built in place: its quote now resolves), an unread divider in the
 *      open, hostile text (`<img src=x onerror=…>`, `</div><script>…`, RTL overrides, 10 kB, an emoji ZWJ) → insert · insert · insert;
 *   G  a group (gutter names), hostile nicks → insert × 3;
 *   P  photo albums: one INSIDE page 1 (→ insert), one ACROSS the seam of page 2 (→ full), hostile file names; page 3 → insert;
 *   Y  a payment request in page 1 whose direct payment (same txid) is on screen → full; a request + its payment both inside page 2 → insert.
 * After every page: no `script` element, no `on*` attribute, no `img[src=x]` in the log; no page error.
 *   ★ fix r1: S1-V1 / V2 / V3 — the pending-contact lock changes (showRequestSentModal '1' after the open · a locked open then '0' ·
 *   a page batch carrying showContactRequest): that page is mode=full, the next ones insert; the reply swipes follow the lock
 *   (probe) · R1 — a voice FILE's length (voiceInfo) lands after the open: the old row quoting it reads "Voice message (0:12)"
 *   after the next page, like the full render (probe) · R3 — an ACTIVE call row in page 1: the old call card loses Call back
 *   (mode=full; probe) · S-3 — hostile quote name / text on the re-quoted row and on a quote whose target never loads, a
 *   hostile payment (title, amount, status, txid) inside an insert page, hostile message ids.
 * LIMITS: jsdom has no layout — every rect is 0, so no anchor fix runs here (b-anchor stubs the geometry) and the fade pass masks
 *   nothing (c-fade); the dev line is read in a developer build (data-p1) — d-lines pins it is absent without it. A row patched IN
 *   PLACE between two renders (a tick, a thumbnail, a voice wave) is compared as it stands: the full render rebuilds it, the insert
 *   keeps the patched node. They are equal in every case here, but NOT in general: an in-place animation mark (c-reactions--in,
 *   data-enter, a tile's own fade class) stays on an old row where a fresh build has none — inert (it styles a finished
 *   animation), accepted by the lead (fix r1 R4). A spent one-shot button ([data-acted]) and a lifted row ([data-menu-lift]) are
 *   NOT inert: the insert refuses while one is in the log.
 *   A photo tile's markup depends on TIME (typed-bubbles.js PHOTO_QUIET_MS: inside 600 ms of its first build it stands quiet,
 *   then its own timer shows the face in place) — so case P compares 750 ms after each push, when both documents are past
 *   the window; inside it the insert keeps the tile built earlier while the full render builds it again (not a seam fault).
 * Deliberate breaks (#802), each in a full temp copy of the tree + build-shells, the pin run with --root (all observed red, 2026-11-18):
 *   (1) renderOlderInsert `const sameDay = newShown.length > 0 && …` → `const sameDay = false && …` (the day separator above the old
 *       first row is kept) → red `★ photo1b HV-1 a-insert T/G/P/Y: …` (page 1: `HTML≠` at the separator, `ROWS≠`);
 *   (2) `const seamRebuild = pos[firstOld] !== posWas[firstOld];` → `… = false;` → red T/G/P/Y (the seam row keeps its old position);
 *   (3) the three seam guards of the photo groups together — the tail-equality loop, the crossing test and the old-group tests —
 *       deleted → red `… a-insert P: …` only (page 2 reads insert, its log differs). EACH ONE ALONE IS AN EQUIVALENT MUTATION (green):
 *       any one of the three refuses that page;
 *   (4) messagesDone `bridge.cap('olderInsert')` → `bridge.cap('olderInsertX')` → red T/G/P/Y (the modes read full, a full render on every
 *       page) — the cap really gates the path;
 *   (5) the re-quote loop `for (const q of requote) …` deleted → red `… a-insert T: …` only (the old row that quotes a page-1 row);
 *   (6) the payment txid test alone deleted → GREEN (equivalent: the tail test and the position test refuse the page); (7) the txid test
 *       + the tail test + the position test deleted together → red `… a-insert Y: …` only;
 *   ★ fix r1 (all red, 2026-11-18): (k1) `String(composerLock || '')` taken out of renderCtxKey → red `… S1-V1`, `S1-V2`, `S1-V3`;
 *   (k2) the re-quote rule back to "targets in the NEW part only" (`!model.has(tid)` → `!newIdSet.has(tid)`) → red `… R1`;
 *   (k3) `call` (liveCallInLog) taken out of renderCtxKey → red `… R3`; (1) / (2) / (4) above are red on all nine cases now, (5)
 *   on T and R1, (3) on P, (7) on Y. */
import { photo1bKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = photo1bKit(h);
  const { sleep, NOW } = K;
  const midnight = (() => { const dt = new Date(NOW * 1000); dt.setHours(0, 0, 0, 0); return Math.floor(dt.getTime() / 1000); })();
  const BASE = midnight - 6 * 86400;
  const hid = (p, i) => p + i.toString(16).padStart(4, '0');
  const HOSTILE = ['<img src=x onerror=window.__pwn=1>', '</div><script>window.__pwn=2</script>', '‮evil‬ ‏text', '👩‍👩‍👧‍👦 ZWJ', 'A'.repeat(10240)];

  /* 250 text messages, chronological: 0–99 over three days (99 at 23:59:00), 100–249 from 00:00:30 of the next day, 2 min apart */
  const tsOf = (i) => (i < 100 ? (i === 99 ? BASE + 2 * 86400 + 86340 : BASE + Math.floor(i / 34) * 86400 + 9 * 3600 + (i % 34) * 120) : BASE + 3 * 86400 + 30 + (i - 100) * 120);
  const textHistory = ({ group = false, hostile = true, quote = true, unread = true } = {}) => {
    const all = [];
    for (let i = 0; i < 250; i++) {
      const me = Math.floor(i / 3) % 2 === 0;
      const nick = group ? (i % 2 ? 'Bob <b onmouseover=window.__pwn=3>' : 'Ana ‮redli') : 'Ana';
      const addr = me ? 'addrMe' : (group ? (i % 2 ? 'addrBob' : 'addrAna') : 'addrPeer');
      let text = 'message ' + i;
      if (hostile && i % 23 === 5) text = HOSTILE[(i / 23 | 0) % HOSTILE.length];
      const opt = { nick, addr };
      if (i % 17 === 3) opt.r = ['like:👍:' + (1 + (i % 3)) + ';', i % 2 ? 'like:👍' : '', ''];
      if (unread && !me && i >= 244) opt.read = 'False';
      const it = K.txt(hid('a', i), me, tsOf(i), text, opt);
      if (quote && i === 210) { it.a[12] = hid('a', 150); it.a[14] = '<img src=x onerror=window.__pwn=6>'; it.a[15] = '</div><script>window.__pwn=7</script>'; }   // an old row quoting a page-1 row (hostile quote name / text — S-3)
      if (quote && i === 215) { it.a[12] = 'ffffffff99'; it.a[14] = '\u202Eevil<b>'; it.a[15] = '<svg onload=window.__pwn=9>'; }   // a quote whose target never loads (the fallback, hostile)
      if (hostile && (i === 120 || i === 60)) it.a[0] = 'a"><img src=x onerror=window.__pwn=8>' + i;   // hostile ids (S-3), in pages 1 and 2
      all.push(it);
    }
    return all;
  };
  const slices = (all) => [all.slice(200, 250), all.slice(100, 200), all.slice(50, 100), all.slice(0, 50)];

  const modesOf = (s) => s.warns.filter((w) => /^\[P1\] shell older insert /.test(w)).map((w) => (/ mode=(insert|full) /.exec(w) || [])[1] || '?');
  const hostileIn = (s) => {
    const bad = [];
    for (const el of s.box.querySelectorAll('*')) {
      if (el.tagName === 'SCRIPT') bad.push('script');
      for (const at of el.attributes) if (/^on/i.test(at.name)) bad.push(el.tagName + '@' + at.name);
    }
    if (s.box.querySelector('img[src="x"]')) bad.push('img[src=x]');
    if (s.W.__pwn) bad.push('__pwn=' + s.W.__pwn);
    return bad;
  };

  async function runCase(name, { group = false, parts, expect, settle = 80, pre = null, before = null, probe = null, want = null }) {
    const A = await K.boot({ p1: true });
    const B = await K.boot({ p1: true });
    const res = { name, steps: [], modesA: [], modesB: [], fullA: [], fullB: [], hostile: [], errs: [], probes: [] };
    try {
      K.open(A, { group, caps: 'olderInsert', items: parts[0], pre });
      K.open(B, { group, caps: '', items: parts[0], pre });
      await sleep(settle);
      const cmp = (label) => {
        const eqHtml = A.box.innerHTML === B.box.innerHTML;
        const eqRows = A.rowsSig() === B.rowsSig();
        let at = -1;
        if (!eqHtml) { const x = A.box.innerHTML, y = B.box.innerHTML; at = 0; while (at < x.length && x[at] === y[at]) at++; }
        res.steps.push({ label, eqHtml, eqRows, kids: A.box.children.length, at, near: at >= 0 ? A.box.innerHTML.slice(Math.max(0, at - 80), at + 80) : '' });
        res.hostile.push(...hostileIn(A), ...hostileIn(B));
        if (probe) res.probes.push(probe(B));   // the full render's state at this step (A equals it byte for byte)
      };
      cmp('open');
      for (let p = 1; p < parts.length; p++) {
        const fa = A.W.__p1bFull || 0, fb = B.W.__p1bFull || 0;
        const more = p === parts.length - 1 ? 'false' : 'true';
        if (before) { before(A, p); before(B, p); await sleep(20); }
        K.page(A, parts[p], more);
        K.page(B, parts[p], more);
        res.fullA.push((A.W.__p1bFull || 0) - fa);
        res.fullB.push((B.W.__p1bFull || 0) - fb);
        await sleep(settle);
        cmp('page' + p);
      }
      res.modesA = modesOf(A);
      res.modesB = modesOf(B);
      res.errs = A.errs.concat(B.errs);
    } finally { A.close(); B.close(); }
    const allEq = res.steps.every((s) => s.eqHtml && s.eqRows);
    const modesOk = JSON.stringify(res.modesA) === JSON.stringify(expect)
      && res.fullA.every((n, i) => n === (expect[i] === 'insert' ? 0 : 1))
      && res.modesB.length === expect.length && res.modesB.every((m) => m === 'full') && res.fullB.every((n) => n === 1);
    const probeOk = !want || want(res.probes);
    ok(allEq && modesOk && probeOk && res.hostile.length === 0 && res.errs.length === 0 && res.steps[res.steps.length - 1].kids > 200,
      '★ photo1b HV-1 a-insert ' + name + ': with the cap `olderInsert` every older page leaves the log byte-equal (innerHTML) to the full render of the same model, '
      + 'and the rows map equal (id → its row, in order); the modes read ' + JSON.stringify(expect) + ' (an insert page runs NO full render, a refused one exactly one); '
      + 'without the cap every page is mode=full with one full render (the old path); no script / on* / img[src=x] from hostile text, names or file names — '
      + (want ? '(the case is live: ' + JSON.stringify(res.probes) + ') ' : '')
      + JSON.stringify({ steps: res.steps.map((s) => s.label + ':' + (s.eqHtml ? 'html' : 'HTML≠@' + s.at) + (s.eqRows ? '' : ',ROWS≠') + ',' + s.kids + (s.eqHtml ? '' : ' near=' + s.near)), modesA: res.modesA, modesB: res.modesB, fullA: res.fullA, fullB: res.fullB, hostile: res.hostile.slice(0, 5), errs: res.errs.slice(0, 3) }));
  }

  /* T — text 1:1 (+ S-3: a hostile payment — title, amount, status, txid — inside page 2, an insert page) */
  {
    const all = textHistory();
    all[75] = K.pay(all[75].a[0], '"><img src=x onerror=window.__pwn=10>', 'payment', tsOf(75), { title: '<script>window.__pwn=11</script>', amount: '<b>9</b>', status: '\u202E<i onclick=1>' });
    await runCase('T', { parts: slices(all), expect: ['insert', 'insert', 'insert'] });
  }

  /* G — a group: gutter names, hostile nicks */
  await runCase('G', { group: true, parts: slices(textHistory({ group: true, quote: false, unread: false })), expect: ['insert', 'insert', 'insert'] });

  /* P — photo albums: one inside page 1, one across the seam of page 2 */
  {
    const all = textHistory({ hostile: false, quote: false, unread: false });
    const G1 = '1111111111111111', G2 = '2222222222222222', G0 = '0000000000000000';
    const ph = (i, gid, idx, cnt, name) => K.photo(all[i].a[0], false, tsOf(i), name, gid + '|' + idx + '|' + cnt + '|');
    for (let k = 0; k < 4; k++) all[220 + k] = ph(220 + k, G0, k, 4, 'open' + k + '.jpg');                                   // an album in the open
    for (let k = 0; k < 4; k++) all[140 + k] = ph(140 + k, G1, k, 4, k === 1 ? '"><img src=x onerror=window.__pwn=4>.jpg' : 'in' + k + '.jpg');   // inside page 1
    for (let k = 0; k < 4; k++) all[98 + k] = ph(98 + k, G2, k, 4, 'across' + k + '.jpg');                                  // 98, 99 in page 2 · 100, 101 in page 1
    await runCase('P', { parts: slices(all), expect: ['insert', 'full', 'insert'], settle: 750 });   // past the tiles' 600 ms quiet window (typed-bubbles PHOTO_QUIET_MS)
  }

  /* Y — payments: a request in page 1 whose direct payment is on screen → full; a request + its payment inside page 2 → insert */
  {
    const all = textHistory({ hostile: false, quote: false, unread: false });
    all[150] = K.pay(all[150].a[0], 'tx1', 'request', tsOf(150), { me: true });
    all[230] = K.pay(all[230].a[0], 'tx1', 'payment', tsOf(230));
    all[60] = K.pay(all[60].a[0], 'tx2', 'request', tsOf(60), { me: true });
    all[70] = K.pay(all[70].a[0], 'tx2', 'payment', tsOf(70));
    await runCase('Y', { parts: slices(all), expect: ['full', 'insert', 'insert'] });
  }

  /* ★ fix r1 S-1 — the pending-contact lock (composerLock) is read at BUILD time (isMenuableRec → the menu, the reply swipe, the
     hover button, a file's Cancel). V1: the lock lands after the open; V2: the open is locked, the lock goes; V3: a page batch
     carries showContactRequest (the incoming lock). Each page after a lock change → mode=full; then insert again. */
  {
    const plain = () => slices(textHistory({ hostile: false, quote: false, unread: false }));
    const swipes = (s) => s.box.querySelectorAll(':scope > [data-swipe-reply]').length;
    await runCase('S1-V1', { parts: plain(), expect: ['full', 'insert', 'insert'], before: (s, p) => { if (p === 1) s.push('showRequestSentModal', '1'); },
      probe: swipes, want: (pr) => pr[0] > 20 && pr.slice(1).every((n) => n === 0) });
    await runCase('S1-V2', { parts: plain(), expect: ['full', 'insert', 'insert'], pre: (s) => s.push('showRequestSentModal', '1'), before: (s, p) => { if (p === 1) s.push('showRequestSentModal', '0'); },
      probe: swipes, want: (pr) => pr[0] === 0 && pr.slice(1).every((n) => n > 20) });
    const v3 = plain();
    v3[1] = [{ f: 'showContactRequest', a: ['x'] }].concat(v3[1]);
    await runCase('S1-V3', { parts: v3, expect: ['full', 'insert', 'insert'], probe: swipes, want: (pr) => pr[0] > 20 && pr.slice(1).every((n) => n === 0) });
  }
  /* ★ fix r1 R1 — a voice FILE's length lands (voiceInfo) AFTER the open's render; an old text row quoting it must show
     "Voice message (0:12)" after the next page, as the full render does (the quoting row is re-built in place). */
  {
    const all = textHistory({ hostile: false, quote: false, unread: false });
    all[205] = K.voiceFile(hid('a', 205), false, tsOf(205));
    all[230].a[12] = hid('a', 205); all[230].a[14] = 'Ana'; all[230].a[15] = '\u{1F3A4}';
    const quoteOf = (s) => { const r = s.box.querySelector(':scope > [data-msgid="' + hid('a', 230) + '"] .c-bubble__reply'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; };
    await runCase('R1', { parts: slices(all), expect: ['insert', 'insert', 'insert'], before: (s, p) => { if (p === 1) s.push('voiceInfo', hid('a', 205), '12000', '10,20,30,40'); },
      probe: quoteOf, want: (pr) => !/0:12/.test(pr[0]) && pr.slice(1).every((q) => /0:12/.test(q)) });
  }
  /* ★ fix r1 R3 — liveCallInLog(): an ACTIVE call row in page 1 takes the "Call back" off every call card (full render) */
  {
    const all = textHistory({ hostile: false, quote: false, unread: false });
    all[220] = K.call(hid('a', 220), tsOf(220));
    all[150] = K.call(hid('a', 150), tsOf(150), { active: true });
    const callBacks = (s) => s.box.querySelectorAll('.c-tcard__call-back').length;
    await runCase('R3', { parts: slices(all), expect: ['full', 'insert', 'insert'], pre: (s) => s.push('showCallButton'), probe: callBacks, want: (pr) => pr[0] === 1 && pr.slice(1).every((n) => n === 0) });
  }
}
