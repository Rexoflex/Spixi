/* ==== SESSION 4 — agent NAV pins (DECISIONS #1132 / #1133) ====
 * Levers 10 (Account → tab hand-off on the L14 cover handshake), 2b (the wallet keeps its
 * rows until the burst is done) and the Privacy "Show photo previews in chats" switch.
 * BEHAVIOUR first: the built settings + home shells run in jsdom, and every outbound verb is
 * captured at the bridge sink (the bundle's createNativeBridge is wrapped as window.Spixi is
 * assigned, so the shell's own bridge emits into `sent`, in order, synchronously).
 * Source pins only where nothing can execute here (MAUI-only C#: SettingsPage, the waiter
 * in SpixiContentPage) — each says so. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const PHONE_UA = 'Mozilla/5.0 (Linux; Android 15; motorola edge 50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';

  const boot = async (name, waitMs = 1200) => {
    const f = join(htmlDir, name);
    const sent = [];
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        try { Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => PHONE_UA }); } catch (e) {}
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        let real;
        Object.defineProperty(w, 'Spixi', {
          configurable: true, enumerable: true,
          get: () => real,
          set: (v) => {
            const mk = v.createNativeBridge;
            v.createNativeBridge = (o = {}) => mk({ ...o, emit: o.emit || ((c) => sent.push(c)) });
            real = v;
          },
        });
      },
    });
    await sleep(waitMs);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, sent, errs };
  };
  const CAPS = 'settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications,ignoredRequests,callRingtone,photoPreviews';

  /* ══ LEVER 10 — Account → TAB rides the L14 cover handshake ══════════════════════════ */
  {
    const { W, push, sent, errs, dom } = await boot('settings.html');
    push('setCaps', CAPS);
    push('setNickname', 'Damir');
    push('setLockEnabled', 'False');
    await sleep(200);
    const navBtn = (id) => W.document.querySelector('#settings-nav .c-bottomnav__item[data-id="' + id + '"]');
    const before = sent.length;
    const b = navBtn('wallet');
    if (b) b.click();
    const out = sent.slice(before);
    ok(!!b && out[0] === 'ixian:landtab:wallet' && out.length === 1,   /* ★ S14 re-base (#1284): ONE verb = land + the hand-off (pinned in pins-s14/b-settings.mjs) */
      '★ #1133 lever 10 (EXECUTED, built settings shell): a peer-nav TAB tap from Account sends `ixian:landtab:<id>` — the hand-off exit rides it (★ S14 #1284), never `ixian:back` — so SettingsPage holds the pop for home\'s painted tab (popOnCoverPainted) instead of uncovering the old tab — sent ' + JSON.stringify(out));
    /* a second tap while the exit is in flight emits nothing (the exitSent latch) */
    const before2 = sent.length;
    const c = navBtn('apps');
    if (c) c.click();
    ok(!!c && sent.slice(before2).filter((v) => /^ixian:(back|handoff|save:|apply:|landtab:)/.test(v)).length === 0,   /* ★ S14 re-base (#1284): landtab IS the exit verb now */
      '★ #1133 lever 10 (EXECUTED): a second tab tap during the hand-off sends no second exit verb (exitSent latch) — sent ' + JSON.stringify(sent.slice(before2)));
    ok(errs.length === 0, '★ #1133 lever 10: the settings shell ran the tab hand-off without a page error — ' + errs.join(' | '));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* DIRTY hand-off: app lock toggled (dirtyLock waits for C#'s confirmation), then a tab tap */
    const { W, push, sent, dom } = await boot('settings.html');
    push('setCaps', CAPS);
    push('setNickname', 'Damir');
    push('setLockEnabled', 'False');
    await sleep(200);
    const lock = [...W.document.querySelectorAll('.c-settings__switch')].find((n) => /App lock/.test(n.getAttribute('aria-label') || ''));
    if (lock) lock.click();
    await sleep(30);
    const before = sent.length;
    const b = W.document.querySelector('#settings-nav .c-bottomnav__item[data-id="chats"]');
    if (b) b.click();
    const out = sent.slice(before);
    ok(!!lock && !!b && out.join('|') === 'ixian:landtab:chats:Damir',   /* ★ S14 re-base (#1284): the nick rides the ONE verb (C#: the apply path, then the hand-off) */
      '★ #1133 lever 10 (EXECUTED): a DIRTY tab hand-off persists WITHOUT the pop (★ S14: `ixian:landtab:<id>:<nick>` = the apply path) and still leaves on the hand-off — the popping `ixian:save:` would have skipped the cover — sent ' + JSON.stringify(out));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* an exe without settingsApply: a dirty hand-off — since S14 #46 r1 the same one verb */
    const { W, push, sent, dom } = await boot('settings.html');
    push('setCaps', 'backupInline,downloadsInline,encpass,encpassInline,globalNotifications');
    push('setNickname', 'Damir');
    push('setLockEnabled', 'False');
    await sleep(200);
    const lock = [...W.document.querySelectorAll('.c-settings__switch')].find((n) => /App lock/.test(n.getAttribute('aria-label') || ''));
    if (lock) lock.click();
    await sleep(30);
    const before = sent.length;
    const b = W.document.querySelector('#settings-nav .c-bottomnav__item[data-id="wallet"]');
    if (b) b.click();
    const out = sent.slice(before);
    ok(!!lock && !!b && out.join('|') === 'ixian:landtab:wallet:Damir',   /* ★ S14 #46 r1 (MIN-1) re-base: the ONE verb with or without the cap (the second send ran the exit twice) */
      '★ #1133 lever 10 (EXECUTED) → ★ S14 #46 r1: on an exe WITHOUT the settingsApply cap a dirty hand-off sends the SAME one verb `ixian:landtab:<id>:<nick>` (every exe that ships this html dispatches it) — sent ' + JSON.stringify(out));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* home answers a TAB land with coverpainted — at the 2nd rAF, after the tab is shown */
    const { W, push, sent, errs, dom } = await boot('index.html', 1500);
    const wv = W.document.getElementById('wallet-view');
    const before = sent.length;
    push('landOnTab', 'wallet');
    const sync = sent.slice(before);
    let shownAtAnswer = null;
    let answeredAfterTab = false;
    for (let i = 0; i < 40 && shownAtAnswer === null; i++) {
      await sleep(10);
      const idx = sent.indexOf('ixian:coverpainted', before);
      if (idx >= 0) { shownAtAnswer = !!wv && !wv.hidden; answeredAfterTab = sent.indexOf('ixian:tab:tab2', before) >= 0 && sent.indexOf('ixian:tab:tab2', before) < idx; }
    }
    ok(!sync.includes('ixian:coverpainted') && shownAtAnswer === true && answeredAfterTab,
      '★ #1133 lever 10 (EXECUTED, built home shell): a landOnTab push answers `ixian:coverpainted` — NOT synchronously (the 2nd rAF, so the switched tab is on glass) and after `ixian:tab:<tab>`, with the wallet view visible — sync=' + JSON.stringify(sync) + ' shown=' + shownAtAnswer);
    const n0 = sent.filter((v) => v === 'ixian:coverpainted').length;
    push('landOnTab', 'bogus');
    await sleep(120);
    ok(sent.filter((v) => v === 'ixian:coverpainted').length === n0,
      '★ #1133 lever 10 (EXECUTED): an unknown tab id lands nothing and answers nothing (the waiter then pops at its backstop)');
    ok(errs.length === 0, '★ #1133 lever 10: the home shell ran the tab land without a page error — ' + errs.join(' | '));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* #46 r1 C-j2 — COUNT the frames: rAF is a manual queue here, so the answer's frame is exact.
       Frame 1 lays the switched tab out; only at frame 2 is it on glass → coverpainted. */
    const { W, push, sent, dom } = await boot('index.html', 1500);
    let q = [];
    W.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    const frame = () => { const run = q; q = []; for (const cb of run) { try { cb(16); } catch (e) {} } };
    const has = (from) => sent.indexOf('ixian:coverpainted', from) >= 0;
    const before = sent.length;
    push('landOnTab', 'wallet');
    const f0 = has(before);
    frame();
    const f1 = has(before);
    frame();
    const f2 = has(before);
    ok(!f0 && !f1 && f2,
      '★ #1133 lever 10 (EXECUTED, frames counted, #46 r1 C-j2): a tab land answers `ixian:coverpainted` at the 2nd animation frame — not synchronously, not at the 1st (the tab is laid out but not yet on glass) — sync=' + f0 + ' f1=' + f1 + ' f2=' + f2);
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* SOURCE (MAUI-only — nothing can execute SettingsPage / SpixiContentPage here): the C# half
       the shell relies on. `ixian:handoff` defers the pop to popOnCoverPainted, which pops on
       the cover OR at the 400 ms backstop, so a missing answer never strands Account. */
    const sp = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
    const scp = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
    const pop = scp.slice(scp.indexOf('protected void popOnCoverPainted()'), scp.indexOf('public static void coverPainted()'));
    /* ★ S14 re-base (#1284): the cleanup moved into exitCleanup(deferPop); handoff and landtab both defer · ★ S14 #46 r1 re-base: + the claimExit latch wraps the body (pins-s14/b-settings.mjs) */
    ok(/exitCleanup\(current_url\.Equals\("ixian:handoff", StringComparison\.Ordinal\)\);/.test(sp)
       && /private void exitCleanup\(bool deferPop\)\s*\{[\s\S]*?if \(deferPop\)\s*\{\s*popOnCoverPainted\(\);/.test(sp)
       && /StartsWith\("ixian:landtab:", StringComparison\.Ordinal\)\)\s*\{[\s\S]{0,450}?HomePage\.InstanceOrNull\(\)\?\.landOnTab\(landId\);[\s\S]{0,200}?exitCleanup\(true\);/.test(sp)
       && /await Task\.Delay\(CoverWaitBackstopMs\);\s*releaseCoverWaiter\(seq, "backstop"\);/.test(pop) && /private const int CoverWaitBackstopMs = 400;/.test(scp),
      '★ #1133 lever 10 (SOURCE — MAUI-only): SettingsPage forwards landtab to HomePage, `ixian:handoff` holds the pop in popOnCoverPainted, and the 400 ms backstop releases it when no `coverpainted` arrives — the fallback that keeps a tab hand-off from stranding Account');
  }

  /* ══ LEVER 2b — the wallet list keeps its rows until the burst is done ══════════════ */
  {
    const { W, push, errs, dom } = await boot('index.html', 1500);
    push('landOnTab', 'wallet');
    const rows = () => [...W.document.querySelectorAll('#wallet-view .c-txlist-item')].map((r) => r.dataset.txid || '');
    const add = (id, name, recv = '1') => push('addPaymentActivity', id, recv, name, '1700000000', '12', '', 'true');
    push('clearPaymentActivity', 'all');
    add('aa01', 'Alice'); add('aa02', 'Bob');
    push('clearPaymentActivityDone');
    await sleep(80);
    const first = rows();
    /* a refill burst: clear + one row, NO done yet, several frames pass */
    push('clearPaymentActivity', 'sent');
    await sleep(60);
    const afterClear = rows();
    add('bb01', 'Carol', '0');
    await sleep(60);
    const midBurst = rows();
    push('clearPaymentActivityDone');
    await sleep(60);
    const afterDone = rows();
    ok(first.join() === 'aa01,aa02' || first.join() === 'aa02,aa01',
      '★ #1133 lever 2b premise (EXECUTED): the first feed renders its two rows at clearPaymentActivityDone — ' + JSON.stringify(first));
    ok(afterClear.length === 2 && midBurst.length === 2 && midBurst.every((t) => t.startsWith('aa')),
      '★ #1133 lever 2b (EXECUTED, built home shell): clearPaymentActivity no longer blanks the list — the OLD rows stay on screen through the clear and the mid-burst row pushes (no empty / half-filled frame) — afterClear=' + JSON.stringify(afterClear) + ' mid=' + JSON.stringify(midBurst));
    ok(afterDone.join() === 'bb01',
      '★ #1133 lever 2b (EXECUTED): clearPaymentActivityDone swaps the new set in with one render — ' + JSON.stringify(afterDone));
    /* the net: an exe that never sends done still lands its rows after the quiet window */
    push('clearPaymentActivity', 'all');
    add('cc01', 'Dan');
    await sleep(120);
    const netHeld = rows();
    await sleep(520);
    const netLanded = rows();
    ok(netHeld.join() === 'bb01' && netLanded.join() === 'cc01',
      '★ #1133 lever 2b (EXECUTED): with NO done push the quiet-window net (ZERO_SETTLE_MS after the last row) commits the burst — held=' + JSON.stringify(netHeld) + ' landed=' + JSON.stringify(netLanded));
    /* hide flips mid-burst: the committed rows are masked */
    push('clearPaymentActivity', 'all');
    add('dd01', 'Erin');
    push('setHideBalance', 'True');
    push('clearPaymentActivityDone');
    await sleep(80);
    const row = W.document.querySelector('#wallet-view .c-txlist-item[data-txid="dd01"]');
    ok(!!row && !/Erin/.test(row.textContent) && /••••••/.test(row.textContent),
      '★ #1133 lever 2b (EXECUTED): a hide flip DURING a burst masks the incoming rows too (applyWalletVisibility covers the incoming set) — ' + (row ? JSON.stringify(row.textContent.trim().slice(0, 80)) : 'no row'));
    ok(errs.length === 0, '★ #1133 lever 2b: the wallet bursts ran without a page error — ' + errs.join(' | '));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* the net from an EMPTY list: walletZero is already open there (a clear on an empty surface
       does not shut it), so its own timer renders nothing — the commit net must land the rows */
    const { W, push, dom } = await boot('index.html', 1500);
    push('landOnTab', 'wallet');
    const rows = () => [...W.document.querySelectorAll('#wallet-view .c-txlist-item')].map((r) => r.dataset.txid || '');
    push('clearPaymentActivity', 'all');
    push('clearPaymentActivityDone');
    await sleep(80);
    const empty = rows();
    push('clearPaymentActivity', 'all');
    push('addPaymentActivity', 'ee01', '1', 'Fay', '1700000000', '5', '', 'true');
    await sleep(650);
    ok(empty.length === 0 && rows().join() === 'ee01',
      '★ #1133 lever 2b (EXECUTED): from an EMPTY list, a burst with no done push still lands at the quiet window (the commit net, not walletZero, which stays open on an empty surface) — ' + JSON.stringify(rows()));
    try { dom.window.close(); } catch (e) {}
  }

  {
    /* #46 r1 C-j1 — the net re-arms PER ROW: rows spaced 300 ms (each < ZERO_SETTLE_MS) keep the
       burst open; it commits only ZERO_SETTLE_MS after the LAST row, never 400 ms after the clear. */
    const { W, push, dom } = await boot('index.html', 1500);
    push('landOnTab', 'wallet');
    const rows = () => [...W.document.querySelectorAll('#wallet-view .c-txlist-item')].map((r) => r.dataset.txid || '').sort().join();
    const add = (id) => push('addPaymentActivity', id, '1', 'N' + id, '1700000000', '3', '', 'true');
    push('clearPaymentActivity', 'all'); add('ff00'); push('clearPaymentActivityDone');
    await sleep(80);
    const base = rows();
    push('clearPaymentActivity', 'all');
    add('gg01'); await sleep(300);
    add('gg02'); await sleep(300);
    add('gg03');                       // t = 600 ms after the clear
    await sleep(250);                  // t = 850: 250 ms after the last row — the burst must still be held
    const held = rows();
    await sleep(350);                  // t = 1200: 600 ms after the last row — committed
    const landed = rows();
    ok(base === 'ff00' && held === 'ff00' && landed === 'gg01,gg02,gg03',
      '★ #1133 lever 2b (EXECUTED, rows spaced 300 ms, #46 r1 C-j1): every row re-arms the commit net — the old rows hold until ZERO_SETTLE_MS after the LAST row, then the whole set lands at once — base=' + base + ' held=' + held + ' landed=' + landed);
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* #46 r1 B-4 — the filter chips switch WITH the rows (at the commit), not at the clear;
       a chip tap still shows the pick at once, and an older burst committing underneath does not
       yank the chips off a fresh tap. */
    const { W, push, sent, dom } = await boot('index.html', 1500);
    push('landOnTab', 'wallet');
    const pressed = () => [...W.document.querySelectorAll('#wallet-view .c-wallet-filters .c-chip')].map((c) => c.getAttribute('aria-pressed') === 'true' ? 1 : 0).join('');
    const add = (id, recv) => push('addPaymentActivity', id, recv, 'N' + id, '1700000000', '3', '', 'true');
    push('clearPaymentActivity', 'all'); add('hh01', '1'); add('hh02', '0'); push('clearPaymentActivityDone');
    await sleep(80);
    const c0 = pressed();
    /* a C#-driven refill (no tap) to 'sent' */
    push('clearPaymentActivity', 'sent'); add('hh02', '0');
    await sleep(60);
    const cMid = pressed();
    push('clearPaymentActivityDone');
    await sleep(60);
    const cDone = pressed();
    ok(c0 === '100' && cMid === '100' && cDone === '010',
      '★ #1133 lever 2b (EXECUTED, #46 r1 B-4): a refill burst moves the filter chips at the COMMIT, with the rows — mid-burst the chips still say the filter of the rows on screen — before=' + c0 + ' mid=' + cMid + ' done=' + cDone);
    /* a tap: the chip answers at once; a stale burst committing meanwhile keeps the tap */
    const chipRecv = W.document.querySelectorAll('#wallet-view .c-wallet-filters .c-chip')[2];
    const b0 = sent.length;
    if (chipRecv) chipRecv.click();
    const tapNow = pressed();
    push('clearPaymentActivity', 'all'); add('hh01', '1'); push('clearPaymentActivityDone');   // an older burst lands
    await sleep(60);
    const afterStale = pressed();
    push('clearPaymentActivity', 'received'); add('hh01', '1'); push('clearPaymentActivityDone');
    await sleep(60);
    const afterOwn = pressed();
    const rowsOwn = [...W.document.querySelectorAll('#wallet-view .c-txlist-item')].map((r) => r.dataset.txid).join();
    ok(sent.slice(b0).includes('ixian:filter:received') && tapNow === '001' && afterStale === '001' && afterOwn === '001' && rowsOwn === 'hh01',
      '★ #1133 lever 2b (EXECUTED, #46 r1 B-4): a chip tap selects at once and sends ixian:filter; an older burst committing a DIFFERENT filter leaves the chips on the fresh tap; the tap\'s own burst lands its rows under the same chip — tap=' + tapNow + ' stale=' + afterStale + ' own=' + afterOwn);
    try { dom.window.close(); } catch (e) {}
  }

  {
    /* #46 r2 R2-m6 — the chip TAP is remembered for WALLET_PICK_FRESH_MS (2000) only: a stale burst committing a
       different filter 1.9 s after the tap leaves the chips on the tap; one at 2.1 s (the tap's own burst never came)
       moves the chips to the ROWS on screen — the chips never lie about the rows for longer than the window. */
    const { W, push, dom } = await boot('index.html', 1500);
    push('landOnTab', 'wallet');
    const pressed = () => [...W.document.querySelectorAll('#wallet-view .c-wallet-filters .c-chip')].map((c) => c.getAttribute('aria-pressed') === 'true' ? 1 : 0).join('');
    const add = (id, recv) => push('addPaymentActivity', id, recv, 'N' + id, '1700000000', '3', '', 'true');
    push('clearPaymentActivity', 'all'); add('kk01', '1'); push('clearPaymentActivityDone');
    await sleep(80);
    const realNow = W.Date.now.bind(W.Date);
    let skew = 0;
    W.Date.now = () => realNow() + skew;   // the shell's clock (the pick's age) — jumped, not waited
    const chips = () => W.document.querySelectorAll('#wallet-view .c-wallet-filters .c-chip');
    if (chips()[2]) chips()[2].click();
    const tap1 = pressed();
    skew = 1900;
    push('clearPaymentActivity', 'all'); add('kk01', '1'); push('clearPaymentActivityDone');
    await sleep(60);
    const at1900 = pressed();
    skew = 0;
    if (chips()[1]) chips()[1].click();   // a fresh pick ('sent') — its own burst never comes
    const tap2 = pressed();
    skew = 2100;
    push('clearPaymentActivity', 'all'); add('kk01', '1'); push('clearPaymentActivityDone');
    await sleep(60);
    const at2100 = pressed();
    W.Date.now = realNow;
    ok(tap1 === '001' && at1900 === '001' && tap2 === '010' && at2100 === '100',
      '★ #1133 lever 2b (EXECUTED, #46 r2 R2-m6): a chip tap holds the chips against a stale commit only while FRESH (WALLET_PICK_FRESH_MS = 2000) — a different-filter commit at 1.9 s keeps the tap, one at 2.1 s moves the chips to the rows on screen — tap=' + tap1 + ' 1.9s=' + at1900 + ' tap2=' + tap2 + ' 2.1s=' + at2100);
    try { dom.window.close(); } catch (e) {}
  }

  /* ══ Privacy — "Show photo previews in chats" (#1133, A5 #1124) ═══════════════════ */
  {
    const { W, push, sent, errs, dom } = await boot('settings.html');
    push('setCaps', CAPS);
    push('setPhotoPreviews', 'False');
    await sleep(120);
    const row = W.document.querySelector('[data-setting-key="privacy"]');
    if (row) row.click();
    await sleep(500);
    const sw = () => [...W.document.querySelectorAll('.c-settings__switch[role="switch"]')].find((n) => (n.getAttribute('aria-label') || '') === 'Show photo previews in chats');
    const s0 = sw();
    const sub = s0 ? (s0.closest('.c-settings__row') || {}).textContent || '' : '';
    ok(!!s0 && s0.getAttribute('aria-checked') === 'false' && /Off: every photo stays a file card\./.test(sub),
      '★ #1133 Privacy (EXECUTED, built settings shell): the cap shows "Show photo previews in chats" with its hint, seeded OFF by the setPhotoPreviews push');
    const before = sent.length;
    if (s0) s0.click();
    await sleep(40);
    ok(sent.slice(before).join('|') === 'ixian:photoPreviews:on' && !!sw() && sw().getAttribute('aria-checked') === 'true',
      '★ #1133 Privacy (EXECUTED): a tap sends `ixian:photoPreviews:on` and moves the switch optimistically — sent ' + JSON.stringify(sent.slice(before)));
    push('setPhotoPreviews', 'True');
    await sleep(120);
    const heldOn = !!sw() && sw().getAttribute('aria-checked') === 'true';
    const b2 = sent.length;
    if (sw()) sw().click();
    await sleep(40);
    push('setPhotoPreviews', 'True');   // C# refused the OFF
    await sleep(120);
    ok(heldOn && sent.slice(b2).join('|') === 'ixian:photoPreviews:off' && !!sw() && sw().getAttribute('aria-checked') === 'true',
      '★ #1133 Privacy (EXECUTED): the echo holds the switch; a tap OFF whose echo says True rolls back to the STORED value');
    push('setPhotoPreviews', 'False');   // unsolicited (no tap in flight)
    await sleep(150);
    ok(!!sw() && sw().getAttribute('aria-checked') === 'false',
      '★ #1133 Privacy (EXECUTED): an unsolicited setPhotoPreviews push moves the mounted switch in place');
    ok(errs.length === 0, '★ #1133 Privacy: no page error — ' + errs.join(' | '));
    try { dom.window.close(); } catch (e) {}
  }
  {
    const { W, push, dom } = await boot('settings.html');
    push('setCaps', 'settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications');
    await sleep(120);
    const row = W.document.querySelector('[data-setting-key="privacy"]');
    if (row) row.click();
    await sleep(500);
    const has = [...W.document.querySelectorAll('.c-settings__switch')].some((n) => /photo previews/i.test(n.getAttribute('aria-label') || ''));
    const media = [...W.document.querySelectorAll('.c-settings__switch')].some((n) => /Load pictures/i.test(n.getAttribute('aria-label') || ''));
    ok(!!row && media && !has,
      '★ #1133 Privacy (EXECUTED): without the photoPreviews cap (an exe that cannot store it) there is NO photo-previews row — the media row still renders (the W-g rule: no switch that changes nothing)');
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* SOURCE (MAUI-only): SettingsPage stores + echoes, seeds at onLoad, grants the cap */
    const sp = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
    const verb = sp.slice(sp.indexOf('current_url.StartsWith("ixian:photoPreviews:"'));
    ok(/SChatPrefs\.photoPreviews = status\.Equals\("on", StringComparison\.Ordinal\);\s*Utils\.sendUiCommand\(this, "setPhotoPreviews", SChatPrefs\.photoPreviews\.ToString\(\)\);/.test(verb.slice(0, 400))
       && (sp.match(/Utils\.sendUiCommand\(this, "setPhotoPreviews", SChatPrefs\.photoPreviews\.ToString\(\)\);/g) || []).length === 2
       && /caps \+= ",photoPreviews";\s*Utils\.sendUiCommand\(this, "setCaps", caps\);/.test(sp.replace(/if \(Preferences\.Default\.Get\("devMode", false\)\)\s*\{\s*caps \+= ",dev";\s*\}\s*/, '')),
      '★ #1133 Privacy (SOURCE — MAUI-only): SettingsPage handles `ixian:photoPreviews:` (StartsWith, Ordinal), stores SChatPrefs.photoPreviews ("on" only) and echoes the STORED value; the onLoad seed is the second push; the photoPreviews cap is granted');
    const en = JSON.parse(rd('src/strings/en-us.json'));
    ok(en.photoPreviewsTitle === 'Show photo previews in chats'
       && en.photoPreviewsHint === 'Photos you sent or downloaded show as a picture in the chat. Off: every photo stays a file card.'
       && en.keepOpen === 'Keep Spixi open until the transfer completes',
      '★ #1133 strings: photoPreviewsTitle / photoPreviewsHint carry the contract text in en-us, and keepOpen (reused by the chat tile) is unchanged');
  }
}
