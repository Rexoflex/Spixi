/* ==== macfixa item 4 (MC n-20261015-mac-rail-start) — the rail marks the screen that is shown at every start ====
 * BEHAVIOUR on the BUILT home shell (index.html) in jsdom with the mock bridge. The desktop rail runs twice, with the Mac
 * marker (data-desktop + data-platform maccatalyst) and the Windows marker (data-platform windows); the phone bottom bar
 * runs once (no data-desktop, data-platform ios). A Map-backed sessionStorage is installed before any shell script
 * (jsdom's file: origin has none) and seeded per run: empty = a new process / a new WebView; the map of an earlier run =
 * a reload of the same WebView (a re-bake, reloadAllPages). C#'s onLoaded echo is the push selectTab(currentTab).
 *   strandedMac / strandedWin / strandedPhone — the pane flag `spixi.pane.account` left by a quit with Account open +
 *        a fresh boot: after the echo selectTab('tab1') the rail marks Chats over the shown Chats view, the flag is gone.
 *   tapMac / tapWin / tapPhone — then a tap on Wallet marks Wallet, and focus, a return to visible and the echo
 *        selectTab('tab2') keep Wallet.
 *   reloadAfterStrand — a reload of that WebView (its sessionStorage + its localStorage) on Wallet: the echo marks Wallet.
 *   rebakeSeen — #589: the flag + this WebView's sighting (`spixi.pane.seen`, a pane seen open) → the echo marks Account.
 *   rebakeMark — #589: a pane opened with no sighting in home (no storage event reached it): a first document boots, the
 *        pane writes the flag in silence, the same WebView reloads → the echo marks Account (the boot mark held it).
 *   paneOpen — a real pane: an Account tap (one ixian:settings) + the flag's write → Account; focus and visible keep it.
 *   paneClose — the close push (onSettingsClosed, the flag removed) → the rail marks the tab the user was on (Wallet).
 *   noErr — no page error in any run.
 * DELIBERATE BREAKS (#802; one token each in a full copy, then `node scripts/run-pins.mjs --root <copy> pins-macfixa/d-rail`):
 *   ① the boot clear `clearAccountPaneFlag();` → `0;` → stranded* + tap* (the tab echo) + reloadAfterStrand red.
 *   ② `if (!paneSeen && sessionStorage` → `if (sessionStorage` → rebakeSeen red.
 *   ③ the boot mark `sessionStorage.setItem(HOME_BOOT_KEY, '1');` → `0;` → rebakeMark red.
 *   ④ onSettingsClosed's `syncNav();` → `0;` → paneClose red. */
import { aKit } from '../pins-s11/a-kit.mjs';
const KEY = 'spixi.pane.account', SEEN = 'spixi.pane.seen', MARK = 'spixi.home.booted';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const ssShim = (seed) => '<head><script>(function(){var m=new Map(' + JSON.stringify(Object.entries(seed || {})) + ');window.__ss=m;Object.defineProperty(window,"sessionStorage",{configurable:true,value:{getItem:function(k){return m.has(k)?m.get(k):null;},setItem:function(k,v){m.set(k,String(v));},removeItem:function(k){m.delete(k);}}});})();</script>';
  const run = async ({ platform, storage = null, session = null }) => {
    const desktop = platform !== 'ios';
    const s = await K.boot('index.html', { desktop, storage, html: (t) => t.split('*SL{SpixiPlatform}').join(platform).replace('<head>', ssShim(session)) });
    const { W, d } = s;
    const rail = () => { const b = d.querySelector('.c-bottomnav__item[aria-current]'); return b ? b.dataset.id : ''; };
    const tap = (id) => d.querySelector('.c-bottomnav__item[data-id="' + id + '"]').click();
    const shown = () => ['chats', 'wallet', 'apps'].find((v) => { const e = d.getElementById(v + '-view'); return e && !e.hidden; }) || '';
    const session0 = () => Object.fromEntries(W.__ss);
    const marks = () => ({ desk: d.documentElement.hasAttribute('data-desktop'), plat: d.documentElement.getAttribute('data-platform') || '', rail: !!d.querySelector('.c-bottomnav--rail') });
    return { s, W, d, push: s.push, rail, tap, shown, session0, marks };
  };
  const r = {}, n = {};
  const runs = [];
  const go = async (fn) => { try { await fn(); } catch (e) { r.threw = (r.threw ? r.threw + ' | ' : '') + e.message; } };
  try {
    for (const [tag, platform] of [['Mac', 'maccatalyst'], ['Win', 'windows'], ['Phone', 'ios']]) {
      await go(async () => {
        const A = await run({ platform, storage: { [KEY]: '1' } }); runs.push(A);
        await sleep(50);
        n['marks' + tag] = A.marks();
        A.push('selectTab', 'tab1'); await sleep(20);
        n['boot' + tag] = A.rail(); n['flag' + tag] = A.W.localStorage.getItem(KEY);
        r['stranded' + tag] = n['boot' + tag] === 'chats' && n['flag' + tag] === null && A.shown() === 'chats'
          && n['marks' + tag].plat === platform && n['marks' + tag].desk === (platform !== 'ios');
        A.tap('wallet'); await sleep(20); const t0 = A.rail();
        A.W.dispatchEvent(new A.W.Event('focus')); const t1 = A.rail();
        A.d.dispatchEvent(new A.W.Event('visibilitychange')); const t2 = A.rail();
        A.push('selectTab', 'tab2'); await sleep(20); const t3 = A.rail();
        n['tap' + tag] = [t0, t1, t2, t3];
        r['tap' + tag] = [t0, t1, t2, t3].every((x) => x === 'wallet') && A.shown() === 'wallet';
        if (tag === 'Mac') {
          /* the same WebView reloads on Wallet (an OS theme flip): its sessionStorage and its localStorage go with it */
          const ls = A.W.localStorage.getItem(KEY);
          const B = await run({ platform, storage: ls == null ? {} : { [KEY]: ls }, session: A.session0() }); runs.push(B);
          await sleep(50);
          B.push('selectTab', 'tab2'); await sleep(20);
          n.reload = B.rail();
          r.reloadAfterStrand = n.reload === 'wallet' && B.shown() === 'wallet';
        }
      });
    }
    await go(async () => {
      const C = await run({ platform: 'maccatalyst', storage: { [KEY]: '1' }, session: { [SEEN]: '1' } }); runs.push(C);
      await sleep(50);
      C.push('selectTab', 'tab1'); await sleep(20);
      n.rebakeSeen = [C.rail(), C.W.localStorage.getItem(KEY)];
      r.rebakeSeen = n.rebakeSeen[0] === 'account' && n.rebakeSeen[1] === '1';
    });
    await go(async () => {
      const D1 = await run({ platform: 'windows' }); runs.push(D1);
      await sleep(50);
      const ss = D1.session0();                                    // the pane's write reaches no home listener
      const D2 = await run({ platform: 'windows', storage: { [KEY]: '1' }, session: ss }); runs.push(D2);
      await sleep(50);
      D2.push('selectTab', 'tab1'); await sleep(20);
      n.rebakeMark = [ss[MARK] || null, D2.rail()];
      r.rebakeMark = n.rebakeMark[0] === '1' && n.rebakeMark[1] === 'account';
    });
    await go(async () => {
      const E = await run({ platform: 'maccatalyst' }); runs.push(E);
      await sleep(50);
      E.push('selectTab', 'tab1'); await sleep(20);
      E.tap('wallet'); await sleep(20);
      E.tap('account'); await sleep(120);
      E.W.localStorage.setItem(KEY, '1'); E.W.dispatchEvent(new E.W.StorageEvent('storage', { key: KEY, newValue: '1' }));
      const o0 = E.rail();
      E.W.dispatchEvent(new E.W.Event('focus')); const o1 = E.rail();
      E.d.dispatchEvent(new E.W.Event('visibilitychange')); const o2 = E.rail();
      n.paneOpen = [o0, o1, o2, E.s.sent.filter((c) => c === 'ixian:settings').length];
      r.paneOpen = o0 === 'account' && o1 === 'account' && o2 === 'account' && n.paneOpen[3] === 1;
      E.W.localStorage.removeItem(KEY); E.W.dispatchEvent(new E.W.StorageEvent('storage', { key: KEY, newValue: null }));
      E.push('onSettingsClosed'); await sleep(20);
      n.paneClose = E.rail();
      r.paneClose = n.paneClose === 'wallet' && E.shown() === 'wallet';
    });
    r.noErr = runs.length === 8 && runs.every((x) => K.noErr(x.s.errs));
    if (!r.noErr) n.errs = runs.map((x) => x.s.errs.slice(0, 2));
  } catch (e) { r.threw = e.message; } finally { for (const x of runs) x.s.close(); }
  const c = (k, m) => ok(r[k] === true, '★ macfixa 4 (rail at start): ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 900));
  c('strandedMac', 'Mac: a pane flag left by a quit with Account open + a fresh boot → the rail marks Chats, the flag is cleared');
  c('strandedWin', 'Windows: the same stranded flag + a fresh boot → Chats, the flag is cleared');
  c('strandedPhone', 'phone bottom bar: the same stranded flag + a fresh boot → Chats');
  c('tapMac', 'Mac: then a Wallet tap → Wallet; focus, visible and the selectTab echo keep Wallet');
  c('tapWin', 'Windows: then a Wallet tap → Wallet; focus, visible and the selectTab echo keep Wallet');
  c('tapPhone', 'phone: then a Wallet tap → Wallet; focus, visible and the selectTab echo keep Wallet');
  c('reloadAfterStrand', 'a reload of the same WebView on Wallet after that start → the echo keeps Wallet');
  c('rebakeSeen', '#589: a re-bake (the flag + the sighting in sessionStorage) → Account stays lit, the flag kept');
  c('rebakeMark', '#589: a re-bake with no sighting (the boot mark only) → Account stays lit');
  c('paneOpen', 'a real pane open (Account tap + the flag) → Account; focus and visible keep it');
  c('paneClose', 'the close push → the rail marks the tab the user was on (Wallet)');
  c('noErr', 'no page error (8 runs)');
}
