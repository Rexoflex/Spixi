/* ==== V1A-M (M1, Damir's dial 2026-10-15: title A "What is IXI?" + the coin art) — THE "WHAT IS IXI?" MOMENT — P31 ====
 * On the BUILT home shell (jsdom; C# pushes via executeUiCommand; ixian: verbs captured):
 *   · cap `moments,ixihelp` + setMoments {"seen":[]} → the FIRST Wallet tab open sends exactly ONE `ixian:moment:ixihelp`
 *   · it is asked only on a CLEAR screen: with an overlay open the Wallet open asks nothing; the overlay's close asks
 *   · momentAnswer "1" → the sheet: the title "What is IXI?", the coin art (svg.il), exactly two buttons
 *     (fill "Show my address" · text "Got it"); "Show my address" → the Wallet's address sheet (.c-addr-sheet) opens
 *   · a second Wallet open → no second ask; a refused ask ("0") is never asked again in the document (once per document)
 *   · WITHOUT the `ixihelp` cap (flag V1IxiHelp off) → no ask verb, no sheet (the Wallet open path of today)
 *   · dev.html: setFlagsDevV1 "<0|1>,<0|1>" (exactly) → the two switch rows after S20G; a tap = ixian:devflash:v1ixihelp|v1hints:<0|1>
 *   · ★ #46 r2 MINOR-1: no ask before this document's first wallet flush (clearPaymentActivityDone) — or a bounded 2 s wait
 *     on an exe without it; with an immediate "1" and the txs 50 ms later the first IXI shows and ixihelp is never asked ·
 *     NIT-6 the ask follows ixian:tab:tab2 · NIT-4 a seen ixihelp latches (no more pumps)
 *   · ★ #46 r1: the session — a yes for ixihelp does NOT take it (pay does) · B-MINOR-4 the ask is never sent inside the tab
 *     tap (after the paint) · B-MINOR-2 a document where the first IXI was wanted never asks ixihelp; when both are granted the
 *     first IXI shows FIRST, its "Back up now" holds the waiting ixihelp until the next Wallet entry; "Got it" opens nothing
 * The ixihelp-cap guard: ONE, in showView (caps are add-only; #46 r1 B-MINOR-7 dropped the second copy in tryIxiHelpMoment,
 * which hid a break of either one). The `moments` cap guard is the client's on() (pins-s17/f-moments K.noCap).
 * Deliberate breaks (V1A-M HOME report):
 *   home.html showView: `ixiHelpWanted = isWallet` (THE cap guard dropped)           → the flag-OFF clause fails (an ask is sent)
 *   home.html pumpMoment onClose: drop the `v === 'address'` → openWalletAddressSheet line → the sheet clause fails (no .c-addr-sheet)
 *   home.html tryIxiHelpMoment: drop `ixiHelpAsked = true`                              → the once-per-document clause fails ("0" → asked again)
 *   dev.html setFlagsDevV1: the regex without `$` (accepts "1,0,1")                      → the dev-surface clause fails (junk not ignored)
 *   ★ #46 r1 (one per fix):
 *   moment-sheet.js answer(): drop `id !== 'ixihelp' &&`                                → sessionFree fails (ixihelp takes the session)
 *   home.html tryIxiHelpMoment: the ask without deferToPaint                            → deferred fails (the verb inside the tap)
 *   home.html tryIxiHelpMoment: drop `if (firstIxiWanted) return;` (the one guard)      → notAfterFirstIxi fails
 *   home.html pumpMoment: drop the firstixi-first findIndex                             → firstIxiFirst fails
 *   home.html firstixi backup close: drop `ixiHelpHold = true;`                         → heldAfterBackup fails
 *   ★ #46 r2 (one per fix):
 *   home.html tryIxiHelpMoment: drop the first-flush wait (`if (!walletFlushedOnce …) {…}`) → realTiming fails (ixihelp first)
 *   home.html tryIxiHelpMoment: `deferToPaint(() => setTimeout(…))` → `deferToPaint(…)`   → afterTabVerb fails (before tab2)
 *   home.html tryIxiHelpMoment: drop the `seen` latch (`ixiHelpAsked = true` on seen)      → the NIT-4 clause fails (pumps go on) */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = dKit(h);
  const ADDR = '1X2gKo8UEn7Lhbz5qFqvPdWTB4vGFzBpwUyC6Jwz3gQ7TJmDb';
  const SEEN0 = JSON.stringify({ seen: [], apps: [], lang: '', session: false });
  /* r2 MINOR-1: C#'s reply to a Wallet entry (ixian:tab:tab2 → loadTransactions) ends with clearPaymentActivityDone — ixihelp
     waits for this document's first such flush */
  const wflush = (p) => { p('clearPaymentActivity', '0'); p('clearPaymentActivityDone'); };
  let s = null;
  const close = () => { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } };
  const asks = (sent, n0) => sent.slice(n0).filter((c) => /^ixian:moment:/.test(c));
  const tab = (d, id) => { const b = d.querySelector('.c-bottomnav__item[data-id="' + id + '"]'); if (b) b.click(); return !!b; };
  const esc = (W, d) => d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const R = {};
  try {
    /* —— ON: the first Wallet open asks once; yes → the sheet; Show my address → the address sheet; no second ask —— */
    s = await boot('index.html', { wait: 1500 });
    let { W, d, push, sent } = s;
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    push('setAddress', ADDR);
    await sleep(100);
    /* a sheet / overlay is open: the Wallet open asks nothing yet (the screen is not clear) */
    let n0 = sent.length;
    d.body.dataset.overlayOpen = '';
    R.tabFound = tab(d, 'wallet');
    wflush(push);
    await sleep(300);
    R.notWhileOverlay = asks(sent, n0).length === 0;
    delete d.body.dataset.overlayOpen;                         // the overlay closes → the body observer pumps the moment
    await sleep(300);
    R.asksOnce = asks(sent, n0).join() === 'ixian:moment:ixihelp';
    push('momentAnswer', 'ixihelp', '', '1', '');
    await sleep(400);
    const sh = d.querySelector('.c-moment__sheet[data-moment="ixihelp"]');
    const btns = sh ? [...sh.querySelectorAll('.c-moment__btns .c-button')].map((b) => b.dataset.type + ':' + b.textContent.trim() + ':' + b.dataset.value) : [];
    R.sheet = !!sh && (sh.querySelector('.c-moment__title') || {}).textContent === 'What is IXI?'
      && !!sh.querySelector('.c-moment__art svg.il')
      && /^IXI is the Ixian network’s token\./.test((sh.querySelector('.c-moment__body') || {}).textContent || '');
    R.twoButtons = btns.join('|') === 'fill:Show my address:address|text:Got it:dismiss';
    if (sh) sh.querySelector('.c-button[data-value="address"]').click();
    await sleep(700);
    R.addressSheet = !!d.querySelector('.c-addr-sheet') && !d.querySelector('.c-moment__sheet[data-moment="ixihelp"]');
    esc(W, d);
    await sleep(500);
    n0 = sent.length;
    tab(d, 'chats');
    await sleep(150);
    tab(d, 'wallet');
    await sleep(400);
    R.noSecondAsk = asks(sent, n0).length === 0 && !d.querySelector('.c-moment__sheet');
    close();

    /* —— a refused ask ("0": a session moment already, a card) is still the one ask of this document —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    await sleep(100);
    n0 = sent.length;
    wflush(push);                                              // the wallet PRE-PUSH already landed (S10 walletPrePush) …
    tab(d, 'wallet');                                          // … so the Wallet tap may ask at once (after the paint)
    R.deferred = asks(sent, n0).length === 0;                  // B-MINOR-4: nothing inside the tap (iOS-34) …
    await sleep(300);
    R.deferred = R.deferred && asks(sent, n0).join() === 'ixian:moment:ixihelp';   // … the ask after the paint
    /* r2 NIT-6: and AFTER the tab verb (C# enters the tab first) */
    R.afterTabVerb = sent.indexOf('ixian:tab:tab2', n0) >= 0 && sent.indexOf('ixian:tab:tab2', n0) < sent.indexOf('ixian:moment:ixihelp', n0);
    push('momentAnswer', 'ixihelp', '', '0', '');
    await sleep(200);
    tab(d, 'chats');
    await sleep(150);
    tab(d, 'wallet');
    await sleep(400);
    R.oncePerDocument = asks(sent, n0).join() === 'ixian:moment:ixihelp' && !d.querySelector('.c-moment__sheet');
    close();

    /* —— a seen id (C# stored it in an earlier run) is never asked —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', JSON.stringify({ seen: ['ixihelp'], apps: [], lang: '', session: false }));
    await sleep(100);
    n0 = sent.length;
    tab(d, 'wallet');
    wflush(push);
    await sleep(400);
    R.seenNotAsked = asks(sent, n0).length === 0;

    /* —— #46 r1 design: a yes for ixihelp RESPECTS the session but never TAKES it (pay does) —— */
    {
      const S = W.Spixi;
      const fb = { cap: (c) => c === 'moments', send: () => {} };
      const c = S.createMomentClient({ bridge: fb });
      c.setState(SEEN0);
      c.ask('ixihelp', '', () => {}, () => {});
      c.answer('ixihelp', '', '1', '');
      const free = !c.sessionTaken() && c.seen('ixihelp');
      c.ask('pay', '', () => {}, () => {});
      c.answer('pay', '', '1', '');
      R.sessionFree = free && c.sessionTaken();
    }
    close();

    /* —— B-MINOR-2: a document where the first IXI was wanted never asks ixihelp —— */
    const tx = (p) => { p('clearPaymentActivity', '0'); p('addPaymentActivity', 'tx1', '1', 'Ana', String(Math.floor(Date.now() / 1000)), '25', '0.09', 'true'); p('clearPaymentActivityDone'); };
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    await sleep(100);
    n0 = sent.length;
    tx(push);                                                  // on Chats: the first IXI is wanted (and asked)
    await sleep(200);
    tab(d, 'wallet');
    await sleep(400);
    R.notAfterFirstIxi = asks(sent, n0).join() === 'ixian:moment:firstixi';
    close();

    /* —— both granted while the screen is busy: the first IXI (SAFETY) shows first; its Back up holds ixihelp until the next
       Wallet entry; then ixihelp shows and "Got it" opens nothing —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    push('setAddress', ADDR);
    await sleep(100);
    n0 = sent.length;
    tab(d, 'wallet');
    wflush(push);                                              // the Wallet's flush: no received payment yet
    await sleep(300);                                          // ixihelp asked
    tx(push);                                                  // then a first payment arrives → the first IXI asked on the clear Wallet
    await sleep(200);
    const both = asks(sent, n0).join() === 'ixian:moment:ixihelp,ixian:moment:firstixi';
    d.body.dataset.overlayOpen = '';                           // a sheet is up: both yeses wait
    push('momentAnswer', 'ixihelp', '', '1', '');
    push('momentAnswer', 'firstixi', '', '1', '');
    await sleep(100);
    delete d.body.dataset.overlayOpen;
    await sleep(300);
    const first = d.querySelector('.c-moment__sheet');
    R.firstIxiFirst = both && !!first && first.dataset.moment === 'firstixi';
    n0 = sent.length;
    const bk = first && first.querySelector('.c-button[data-value="backup"]');
    if (bk) bk.click();
    await sleep(1200);                                         // the sheet's close + the nudge gap (600 ms) + a margin
    R.heldAfterBackup = sent.slice(n0).indexOf('ixian:backup') >= 0 && !d.querySelector('.c-moment__sheet');
    tab(d, 'chats');
    await sleep(150);
    tab(d, 'wallet');
    await sleep(500);
    const ih = d.querySelector('.c-moment__sheet[data-moment="ixihelp"]');
    R.heldAfterBackup = R.heldAfterBackup && !!ih;
    const gi = ih && ih.querySelector('.c-button[data-value="dismiss"]');
    if (gi) gi.click();
    await sleep(700);
    R.gotItNothing = !!ih && !d.querySelector('.c-addr-sheet') && !d.querySelector('.c-moment__sheet');
    close();

    /* —— r2 MINOR-1, the REAL timing: an immediate "1" for ixihelp (C# answers without I/O) and the Wallet's txs 50 ms later
       → the first IXI first, ixihelp never asked in this document (not even after the bounded wait) —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    await sleep(100);
    n0 = sent.length;
    tab(d, 'wallet');
    /* C# answers an ask at once (no I/O): a "1" the moment ixian:moment:ixihelp is out; the txs come 50 ms after the tap */
    let answered = false;
    for (let i = 0; i < 10; i++) {
      await sleep(5);
      if (!answered && sent.indexOf('ixian:moment:ixihelp', n0) >= 0) { push('momentAnswer', 'ixihelp', '', '1', ''); answered = true; }
    }
    tx(push);                                                  // the reply to ixian:tab:tab2: a received payment
    await sleep(300);
    push('momentAnswer', 'firstixi', '', '1', '');
    await sleep(300);
    const fs = d.querySelector('.c-moment__sheet');
    const firstSheet = fs ? fs.dataset.moment : '';
    await sleep(2300);                                         // past IXIHELP_FLUSH_WAIT_MS
    R.realTiming = firstSheet === 'firstixi' && asks(sent, n0).join() === 'ixian:moment:firstixi'
      && !d.querySelector('.c-moment__sheet[data-moment="ixihelp"]');
    close();

    /* —— an exe that never sends clearPaymentActivityDone: a bounded wait, then the ask —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,ixihelp');
    push('setMoments', SEEN0);
    await sleep(100);
    n0 = sent.length;
    tab(d, 'wallet');
    await sleep(500);
    const noneYet = asks(sent, n0).length === 0;
    await sleep(2000);
    R.boundedWait = noneYet && asks(sent, n0).join() === 'ixian:moment:ixihelp';
    close();

    /* —— OFF: no `ixihelp` cap → no ask verb, no sheet —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments');
    push('setMoments', SEEN0);
    await sleep(100);
    n0 = sent.length;
    tab(d, 'wallet');
    wflush(push);
    await sleep(400);
    push('momentAnswer', 'ixihelp', '', '1', '');           // even an unasked "1" shows nothing
    await sleep(300);
    R.flagOff = asks(sent, n0).length === 0 && !d.querySelector('.c-moment__sheet');
    close();
    ok(Object.values(R).every(Boolean),
      '★ V1A-M M1 (P31): "What is IXI?" — with the caps moments + ixihelp the FIRST Wallet open asks exactly one ixian:moment:ixihelp, after the paint (never inside the tap, #46 r1 B-MINOR-4) and only on a clear screen (an open overlay holds it; its close asks); C#\'s "1" shows the sheet (title "What is IXI?", the coin art, fill "Show my address" + text "Got it"); "Show my address" opens the Wallet address sheet, "Got it" nothing; a second Wallet open, a refused ask and a seen id never ask again; a yes does NOT take the session (#46 r1 design); a document where the first IXI was wanted never asks it, and when both are granted the first IXI shows first and its Back up holds ixihelp until the next Wallet entry (B-MINOR-2); WITHOUT the ixihelp cap no ask and no sheet — ' + JSON.stringify(R));
  } catch (e) { close(); ok(false, '★ V1A-M M1 h-ixihelp threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }

  /* —— r2 NIT-4: once ixihelp is SEEN the ask latches — the body observer stops pumping (count home's seen('ixihelp') reads
     through a wrapper on the bundle's createMomentClient, installed before the home script) —— */
  const lt = {};
  let q = null;
  try {
    const { aKit } = await import('../pins-s11/a-kit.mjs');
    const K = aKit(h);
    const WRAP = '<script>(function(){var C=window.Spixi.createMomentClient;window.__seenIxi=0;window.Spixi.createMomentClient=function(o){var c=C(o);var s=c.seen;'
      + 'c.seen=function(id){if(id==="ixihelp")window.__seenIxi++;return s.apply(this,arguments);};return c;};})();</script>';
    q = await K.boot('index.html', { html: (t) => t.replace('<script src="spixi.bundle.js"></script>', '$&' + WRAP) });
    const { W, d, push } = q;
    push('setCaps', 'moments,ixihelp');
    push('setMoments', JSON.stringify({ seen: ['ixihelp'], apps: [], lang: '', session: false }));
    await K.sleep(100);
    const b = d.querySelector('.c-bottomnav__item[data-id="wallet"]');
    if (b) b.click();
    wflush(push);
    await K.sleep(300);
    const c0 = W.__seenIxi;
    for (let i = 0; i < 5; i++) { const x = d.createElement('div'); d.body.append(x); await K.sleep(20); x.remove(); await K.sleep(20); }
    lt.wrapped = c0 >= 1;
    lt.latched = W.__seenIxi === c0;
    lt.n = [c0, W.__seenIxi];
  } catch (e) { lt.threw = e.message; } finally { if (q) q.close(); }
  ok(lt.wrapped && lt.latched,
    '★ V1A-M #46 r2 NIT-4: a SEEN ixihelp latches the ask on the first Wallet pump — later body mutations read nothing (the body observer\'s ixihelp clause goes false) — ' + JSON.stringify(lt));

  /* —— the dev surface (dev.html): setFlagsDevV1 "<ixihelp 0|1>,<hints 0|1>" exactly → two switch rows after the S20G row;
     a tap sends ixian:devflash:v1ixihelp|v1hints:<0|1> —— */
  const dv = {};
  let k = null;
  try {
    const { aKit } = await import('../pins-s11/a-kit.mjs');
    const K = aKit(h);
    k = await K.boot('dev.html', { wait: 900 });
    const { W, d, push } = k;
    push('setFlagsDev', '1,1,1,1');
    push('setFlagsDevS20G', '1');
    dv.noneBefore = !d.querySelector('[data-flag="v1ixihelp"], [data-flag="v1hints"]');
    for (const junk of ['1', '1,0,1', '2,0', '1,0 ', '']) push('setFlagsDevV1', junk);
    dv.junkIgnored = !d.querySelector('[data-flag="v1ixihelp"], [data-flag="v1hints"]');
    push('setFlagsDevV1', '1,0');
    const flags = [...d.querySelectorAll('.c-dev-flags [data-flag]')].map((x) => x.dataset.flag);
    const ih = d.querySelector('[data-flag="v1ixihelp"]');
    const hi = d.querySelector('[data-flag="v1hints"]');
    dv.rows = flags.slice(-3).join() === 's20g,v1ixihelp,v1hints' && ih.getAttribute('aria-checked') === 'true' && hi.getAttribute('aria-checked') === 'false'
      && ih.getAttribute('aria-label') === 'What is IXI moment (V1A)' && hi.getAttribute('aria-label') === 'New-word tips (V1A)';
    k.sent.length = 0;
    ih.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    await sleep(120);                                          // the native bridge sends one verb per turn
    hi.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    await sleep(120);
    dv.verbs = k.sent.join() === 'ixian:devflash:v1ixihelp:0,ixian:devflash:v1hints:1';
    dv.noErr = K.noErr(k.errs);
  } catch (e) { dv.threw = e.message; } finally { if (k) k.close(); }
  ok(dv.noneBefore && dv.junkIgnored && dv.rows && dv.verbs && dv.noErr,
    '★ V1A-M (P31) dev surface: Developer › Release flags shows the V1IxiHelp + V1Hints switches only after the exact push setFlagsDevV1 "<0|1>,<0|1>" (anything else ignored), after the S20G row, with the stored values; a tap sends ixian:devflash:v1ixihelp|v1hints:<0|1> — ' + JSON.stringify(dv));
}
