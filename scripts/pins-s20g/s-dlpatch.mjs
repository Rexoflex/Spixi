/* ==== S20G R-5 — the Downloads list is never rebuilt by phase 2; its Intl work is cached ====
 * On the BUILT settings.html (jsdom, the REAL Downloads sublevel, 30 files over 4 days):
 *   (1) PATCH: phase 2 (setDownloadSenders) on an unchanged row set keeps EVERY row node (no rebuild) and fills each row's
 *       "from {name}" line + data-sender in place; the size · time part of the line is kept as it was.
 *   (2) RE-PATCH: a second phase 2 that renames a sender and drops another patches those rows only (same nodes, the new
 *       name, the dropped row's line back to "size · time" with no "from").
 *   (3) A CHANGED row set (a new file) is a full render (new nodes, the new row listed).
 *   (4) FILTER: with a From filter in force, a phase 2 whose senders no longer include that person clears the filter and
 *       shows every file (the full-render path — the shown set depends on the senders).
 *   (5) INTL: a full paint of the 30 rows builds AT MOST two Intl.DateTimeFormat (the cached clock + timestamp.js's memoised hour-cycle probe; 0 calls to
 *       Date#toLocaleTimeString) and calls Date#toLocaleDateString at most once per day group (not per file); the time
 *       text equals toLocaleTimeString(lang, timeOpts) — the cache changes no output.
 *   (6) SIGNATURE (★ S20G C-m3, #46 r1): the row signature is name · time · size — a re-push of the SAME names with one
 *       photo's size changed is a full render: the photo cell's size badge and its day group's total show the new size.
 *   (7) STALE TEXT (★ S20G B-6, #46 r1): a same-rows re-push (the patch path — every node kept) after midnight and after
 *       an hour-cycle change re-labels the day group (Today → Yesterday) and re-writes each row's clock in the new cycle.
 * Measured (Chromium, S20F method — 412×915 dpr 2.6, CPU × 4, 60 rows; S20G B3 report): phase 2 120 → 5 ms script,
 * 169 → 20 ms with layout; frame max with phase 2 mid-scroll 217–367 → 33–50 ms.
 * DELIBERATE BREAKS (S20G B3 report): ① render's patch branch disabled (`if (false && sig === rowSig …`) → (1) + (2) fail
 * (rows rebuilt); ② patchSenders skips fillTimeLine → (1) fails (no from line); ③ fileRow back to
 * `new Date(…).toLocaleTimeString(docLocale(), timeOpts())` → (5) fails; ④ the day label back inside the per-file loop
 * (dayBucketLabel per file, no memo) → (5) fails; ⑤ sigOf names only (`f.name` alone) → (6) fails (the patch path keeps
 * the old photo badge + day total); ⑥ patchSenders without the day-label loop → (7) fails (still "Today"); ⑦ patchSenders
 * re-derives no row parts (the sender compare only) → (7) fails (the clock keeps the old hour cycle). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await boot('settings.html', { wait: 1500 });
    const { W, d, push } = s;
    push('setCaps', 'settingsApply,downloadsInline');
    push('setNickname', 'Damir');
    await sleep(250);
    const b = d.querySelector('[data-setting-key="downloads"]'); if (b) b.click(); await sleep(80);
    const T = Math.floor(Date.now() / 1000);
    const name = (i) => 'doc-' + i + '.pdf';
    /* (5) count the Intl work of ONE full paint */
    const cnt = { dtf: 0, lts: 0, lds: 0 };
    const DTF = W.Intl.DateTimeFormat, lts = W.Date.prototype.toLocaleTimeString, lds = W.Date.prototype.toLocaleDateString;
    W.Intl.DateTimeFormat = function (...a) { cnt.dtf++; return new DTF(...a); };
    W.Intl.DateTimeFormat.prototype = DTF.prototype; W.Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
    W.Date.prototype.toLocaleTimeString = function (...a) { cnt.lts++; return lts.apply(this, a); };
    W.Date.prototype.toLocaleDateString = function (...a) { cnt.lds++; return lds.apply(this, a); };
    push('clearFiles');
    for (let i = 0; i < 30; i++) push('addFile', name(i), String(T - i * 3 * 3600), String(10000 + i * 1000));   // 30 files, 3 h apart → 4 day groups
    await sleep(250);
    W.Intl.DateTimeFormat = DTF; W.Date.prototype.toLocaleTimeString = lts; W.Date.prototype.toLocaleDateString = lds;
    const rows = () => [...d.querySelectorAll('.c-settings-dl__row')];
    const rowOf = (nm) => rows().find((x) => x.dataset.name === nm);
    const line = (nm) => { const x = rowOf(nm); const t = x && x.querySelector('.c-settings-dl__time'); return t ? t.textContent : ''; };
    n.groups = d.querySelectorAll('.c-settings-dl__group').length;
    n.cnt = { ...cnt };
    const today = rows()[0];
    const ep = T;   // doc-0 = now
    const want = new Date(ep * 1000).toLocaleTimeString(W.Spixi.docLocale(), W.Spixi.timeOpts());
    n.t0 = line(name(0)); n.want = want;
    r.intl = rows().length === 30 && n.groups >= 2 && cnt.dtf <= 2 && cnt.lts === 0 && cnt.lds <= n.groups && n.t0.endsWith(want) && !!today;
    /* (1) phase 2 patches */
    const before = rows();
    const parts0 = line(name(5));
    push('setDownloadSenders', JSON.stringify([[name(0), 'Ana', 's1'], [name(5), 'Bob', 's2'], [name(7), 'Ana', 's1']]));
    await sleep(60);
    const after = rows();
    n.p1 = { same: after.length === before.length && after.every((x, i) => x === before[i]), l5: line(name(5)), parts0, sender: rowOf(name(5)).dataset.sender };
    r.patch = n.p1.same && n.p1.l5 === 'from Bob · ' + parts0 && n.p1.sender === 's2' && /^from Ana · /.test(line(name(0))) && !('sender' in rowOf(name(1)).dataset);
    /* (2) re-patch: Bob → Bobby, doc-7 loses its sender */
    push('setDownloadSenders', JSON.stringify([[name(0), 'Ana', 's1'], [name(5), 'Bobby', 's2']]));
    await sleep(60);
    const again = rows();
    n.p2 = { same: again.every((x, i) => x === before[i]), l5: line(name(5)), l7: line(name(7)), s7: 'sender' in rowOf(name(7)).dataset };
    r.repatch = n.p2.same && n.p2.l5 === 'from Bobby · ' + parts0 && !/from/.test(n.p2.l7) && n.p2.l7.length > 0 && !n.p2.s7;
    /* (4) a From filter in force: pick Ana, then a phase 2 without Ana → the filter clears, every file shows */
    d.querySelector('.c-settings-dl__from-btn').click(); await sleep(350);
    const opt = [...d.querySelectorAll('.c-settings__opt')].find((o) => /Ana/.test(o.textContent || ''));
    if (opt) opt.click();
    await sleep(400);
    n.f1 = rows().map((x) => x.dataset.name).sort().join();
    push('setDownloadSenders', JSON.stringify([[name(5), 'Bobby', 's2']]));
    await sleep(80);
    n.f2 = rows().length;
    r.filter = n.f1 === [name(0)].join() && n.f2 === 30 && !('active' in d.querySelector('.c-settings-dl__from-btn').dataset);
    /* (3) a changed row set = a full render */
    const keep = rows();
    push('addFile', 'new.zip', String(T - 10), '5000');
    await sleep(250);
    const full = rows();
    r.full = full.length === 31 && !!rowOf('new.zip') && !full.some((x) => keep.includes(x));
    /* (6) C-m3: the same names, one photo's size changed → the new size text shows (badge + the day total) */
    const S = W.Spixi, str = S.getStrings();
    const pushList = (list) => { push('clearFiles'); for (const [nm, t, sz] of list) push('addFile', nm, String(t), String(sz)); };
    const base = [['pic.jpg', T - 60, 10000], ['note.txt', T - 120, 20000]];
    pushList(base); await sleep(250);
    const badge = () => { const x = rowOf('pic.jpg'); const b = x && x.querySelector('.c-settings-dl__sz'); return b ? b.textContent : ''; };
    const dayTot = () => { const g = d.querySelector('.c-settings-dl__day-size'); return g ? g.textContent : ''; };
    n.sig0 = { badge: badge(), tot: dayTot() };
    pushList([['pic.jpg', T - 60, 3000000], ['note.txt', T - 120, 20000]]); await sleep(250);
    n.sig1 = { badge: badge(), tot: dayTot(), want: S.formatFileSize(3000000, str), wantTot: S.formatFileSize(3020000, str) };
    r.sig = n.sig0.badge === S.formatFileSize(10000, str) && n.sig1.badge === n.sig1.want && n.sig1.tot === n.sig1.wantTot && n.sig0.tot !== n.sig1.tot;
    /* (7) B-6: a same-rows re-push after midnight + an hour-cycle change → the patch path re-labels and re-clocks */
    const de = d.documentElement, hc0 = de.dataset.hourCycle;
    const lab = () => { const x = d.querySelector('.c-settings-dl__day > span'); return x ? x.textContent : ''; };
    const clk = () => line('note.txt');
    const keep7 = rows();
    n.b0 = { lab: lab(), clk: clk() };
    const realNow = W.Date.now;
    const cyc = /\b(AM|PM)\b/i.test(n.b0.clk) ? 'h23' : 'h12';
    try {
      W.Date.now = () => realNow.call(W.Date) + 86400000;   // the next day
      de.dataset.hourCycle = cyc;
      push('setDownloadSenders', '[]');                    // phase 2, nobody named: the same rows → the patch path
      await sleep(60);
      const wantClk = new Date((T - 120) * 1000).toLocaleTimeString(S.docLocale(), S.timeOpts());
      n.b1 = { lab: lab(), clk: clk(), wantClk, cyc, same: rows().length === keep7.length && rows().every((x, i) => x === keep7[i]) };
      r.stale = n.b1.same && n.b0.lab === (str.today || 'Today') && n.b1.lab === (str.yesterday || 'Yesterday') && n.b1.clk.endsWith(' · ' + wantClk) && n.b1.clk !== n.b0.clk;
    } finally { W.Date.now = realNow; if (hc0 === undefined) delete de.dataset.hourCycle; else de.dataset.hourCycle = hc0; }
    r.noErr = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  } catch (e) { r.threw = e.message; } finally { if (s) { try { s.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, '★ S20G R-5: ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 1200));
  c('intl', '(5) a full paint of 30 rows builds ≤ 2 Intl.DateTimeFormat (the cached clock + timestamp.js one-time hour-cycle probe), 0 toLocaleTimeString, ≤ 1 toLocaleDateString per day group; the time text is unchanged');
  c('patch', '(1) phase 2 keeps every row node and fills "from {name}" + data-sender in place (the size · time part kept)');
  c('repatch', '(2) a second phase 2 patches the renamed sender and the dropped one — same nodes');
  c('filter', '(4) a From filter whose person leaves the senders is cleared and every file shows again (the full-render path)');
  c('full', '(3) a changed row set is a full render — new nodes, the new file listed');
  c('sig', '(6) C-m3: the row signature carries the size — the same names with a changed photo size show the new size (badge + day total)');
  c('stale', '(7) B-6: a same-rows re-push (nodes kept) after midnight + an hour-cycle change shows "Yesterday" and the clock in the new cycle');
  c('noErr', 'no page error');
}
