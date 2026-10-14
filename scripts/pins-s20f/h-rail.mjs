/* ==== S20F W-1 (#1409 belt; #46 r1 C-1 / C-2) — the desktop rail re-syncs from the Account pane flag ====
 * On the BUILT index.html (jsdom, desktop rail):
 *   · a pane THIS document saw open (a storage write of the flag = '1') + C#'s selectTab echo lighting Chats: the flag's
 *     storage event, a silent write + window focus, a silent write + a return to visible — each puts the rail back on
 *     Account; without the flag the same events leave Chats;
 *   · C-1: a flag STRANDED before boot (a pane killed without pagehide; a NEW process, so no sessionStorage sighting) is
 *     not a sighting — a tab tap + focus / visible keep the rail on the tab (Chats, then Wallet);
 *   · r2 MINOR-2: the sighting rides sessionStorage `spixi.pane.seen` ('1' after an Account tap, gone after the close
 *     push); a RE-BAKE (a reload of the same WebView: the flag + the bit) keeps it — a Chats tap inside the
 *     reloadShell window + focus → Account again, and the dev line still names the stuck writer;
 *   · a home takeover owns the rail: under one, focus does not re-light Account;
 *   · C-2, the dev line: none for a self-corrected selectTab echo, none for a normal Account → tab tap whose close push
 *     lands; ONE `[RAIL] <writer> lit <id> …` line (+ the `[P1] shell rail-stuck w=<writer> id=<id>` twin on a data-p1
 *     build) when the rail is STILL off Account 1.5 s later (onChange, landOnTab); dev mode off + no data-p1: none.
 * DELIBERATE BREAKS (each run once, failed for exactly that reason, restored — see the S20F home reports):
 *   ① railBelt body → `return;` → storage / focus / visible fail.   ② the focus listener removed → focus fails.
 *   ③ `paneSeen &&` dropped from railBelt → stale fails (C-1).   ④ `homeOverlayLevel() < 2 &&` dropped → takeover fails.
 *   ⑤ the 1.5 s re-check skipped (log at once) → selfCorrected + normalTap fail.   ⑥ railDiag('onChange', id) deleted → stuckTap fails.
 *   ⑦ the gate `!(devModeOn() || …data-p1)` → `!(true || …)` → devOff fails.
 *   ⑩ the storage handler sets `paneSeen = …` directly instead of seePane() → eventSighting fails.
 *   ⑧ the boot read of the sessionStorage bit removed → rebake fails.   ⑨ seePane's sessionStorage SET removed → sighting fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
const KEY = 'spixi.pane.account';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  /* jsdom's file: origin has no sessionStorage — a Map-backed one is installed before any shell script (seeded per run) */
  const ssShim = (seed) => '<head><script>(function(){var m=new Map(' + JSON.stringify(Object.entries(seed || {})) + ');window.__ss=m;Object.defineProperty(window,"sessionStorage",{configurable:true,value:{getItem:function(k){return m.has(k)?m.get(k):null;},setItem:function(k,v){m.set(k,String(v));},removeItem:function(k){m.delete(k);}}});})();</script>';
  const run = async ({ dev, p1 = false, storage = null, session = null }) => {
    const s = await K.boot('index.html', { desktop: true, storage, html: (t) => { t = t.split('*SL{devMode}').join(dev ? 'true' : 'false').replace('<head>', ssShim(session)); return p1 ? t.replace('<html', '<html data-p1') : t; } });
    const { W, d } = s;
    const warns = [];
    const cw = W.console.warn;
    W.console.warn = (...a) => { const m = a.map(String).join(' '); if (/^\[RAIL\]|rail-stuck/.test(m)) warns.push(m); else try { cw.apply(W.console, a); } catch (e) {} };
    const rail = () => { const b = d.querySelector('.c-bottomnav__item[aria-current]'); return b ? b.dataset.id : ''; };
    const tap = (id) => d.querySelector('.c-bottomnav__item[data-id="' + id + '"]').click();
    const sawPane = () => { W.localStorage.setItem(KEY, '1'); W.dispatchEvent(new W.StorageEvent('storage', { key: KEY, newValue: '1' })); };
    return { s, W, d, push: s.push, rail, tap, warns, sawPane };
  };
  const r = {}, n = {};
  const runs = [];
  try {
    /* A: the belt for a pane this document saw */
    const A = await run({ dev: true, p1: true }); runs.push(A);
    const { W, d, push, rail } = A;
    await sleep(50);
    const echo = () => { W.localStorage.removeItem(KEY); push('selectTab', 'tab1'); };
    echo(); n.a0 = rail(); A.sawPane(); n.a1 = rail();
    echo(); W.localStorage.setItem(KEY, '1'); n.b0 = rail(); W.dispatchEvent(new W.Event('focus')); n.b1 = rail();
    echo(); W.localStorage.setItem(KEY, '1'); n.c0 = rail(); d.dispatchEvent(new W.Event('visibilitychange')); n.c1 = rail();
    echo(); W.dispatchEvent(new W.Event('focus')); d.dispatchEvent(new W.Event('visibilitychange')); n.none = rail();
    r.storage = n.a0 === 'chats' && n.a1 === 'account';
    r.focus = n.b0 === 'chats' && n.b1 === 'account';
    r.visible = n.c0 === 'chats' && n.c1 === 'account';
    r.noFlag = n.none === 'chats';
    /* a takeover owns the rail: the pane seen + flag set, C# lands Chats, the topbar Contacts takeover opens, focus */
    A.sawPane(); push('landOnTab', 'chats'); await sleep(20);
    const contacts = [...d.querySelectorAll('#chats-topbar button')].find((b) => /contacts/i.test(b.getAttribute('aria-label') || ''));
    if (contacts) contacts.click();
    await sleep(60);
    n.takeoverUp = !!d.querySelector('.contacts-takeover');
    W.dispatchEvent(new W.Event('focus')); n.takeover = rail();
    r.takeover = n.takeoverUp && n.takeover === 'chats';
    const back = d.querySelector('.contacts-takeover .c-topbar button'); if (back) back.click();
    await sleep(400);
    /* C-2: the dev line */
    await sleep(1600); A.warns.length = 0;
    A.sawPane(); push('selectTab', 'tab2');                       // self-corrected echo
    await sleep(1700); n.selfCorrected = A.warns.slice(); r.selfCorrected = A.warns.length === 0 && rail() === 'account';
    W.localStorage.removeItem(KEY); push('onSettingsClosed'); A.tap('chats'); await sleep(50);
    A.warns.length = 0;
    A.tap('account'); n.seenBit = W.__ss.get('spixi.pane.seen'); W.localStorage.setItem(KEY, '1'); A.tap('chats'); await sleep(200); push('onSettingsClosed');   // the normal tap + its close push
    n.seenBitAfterClose = W.__ss.has('spixi.pane.seen');
    r.sighting = n.seenBit === '1' && n.seenBitAfterClose === false;
    await sleep(1700); n.normalTap = A.warns.slice(); r.normalTap = A.warns.length === 0 && rail() === 'chats';
    A.warns.length = 0;
    A.tap('account'); W.localStorage.setItem(KEY, '1'); A.tap('wallet');   // no close push ever comes
    await sleep(1700); n.stuckTap = A.warns.slice();
    r.stuckTap = A.warns.length === 2 && A.warns.some((m) => m === '[RAIL] onChange lit wallet while the Account pane flag is set') && A.warns.some((m) => m === '[P1] shell rail-stuck w=onchange id=wallet');
    A.warns.length = 0;
    push('landOnTab', 'apps');
    await sleep(1700); n.stuckLand = A.warns.slice();
    r.stuckLand = A.warns.some((m) => m === '[RAIL] landOnTab lit apps while the Account pane flag is set');
    /* r3 N4: a pane C# opened (SettingsPage.openAt — no home tap) is sighted by its flag's storage event alone */
    W.__ss.delete('spixi.pane.seen');
    W.localStorage.setItem(KEY, '1'); W.dispatchEvent(new W.StorageEvent('storage', { key: KEY, newValue: '1' }));
    n.evSet = W.__ss.get('spixi.pane.seen');
    W.localStorage.removeItem(KEY); W.dispatchEvent(new W.StorageEvent('storage', { key: KEY, newValue: null }));
    n.evClear = W.__ss.has('spixi.pane.seen');
    r.eventSighting = n.evSet === '1' && n.evClear === false;
    r.noErrA = K.noErr(A.s.errs);
    /* B: C-1 — a flag stranded before boot (no pane in this process) */
    const B = await run({ dev: true, storage: { [KEY]: '1' } }); runs.push(B);
    await sleep(50);
    B.push('selectTab', 'tab1'); n.sBoot = B.rail();
    B.tap('chats'); await sleep(20); n.sTap = B.rail();
    B.W.dispatchEvent(new B.W.Event('focus')); n.sFocus = B.rail();
    B.d.dispatchEvent(new B.W.Event('visibilitychange')); n.sVisible = B.rail();
    B.tap('wallet'); await sleep(20); B.W.dispatchEvent(new B.W.Event('focus')); n.sWallet = B.rail();
    await sleep(1700); n.sWarns = B.warns.slice();
    r.stale = n.sTap === 'chats' && n.sFocus === 'chats' && n.sVisible === 'chats' && n.sWallet === 'wallet' && B.warns.length === 0;
    /* D: r2 MINOR-2 — a re-bake: the same WebView reloads with the pane pinned (the flag + this WebView's sighting bit) */
    const D = await run({ dev: true, storage: { [KEY]: '1' }, session: { 'spixi.pane.seen': '1' } }); runs.push(D);
    await sleep(50);
    D.push('selectTab', 'tab1'); n.rBoot = D.rail();
    D.tap('chats'); await sleep(20); n.rTap = D.rail();          // inside the reloadShell window C# keeps the pane up
    D.W.dispatchEvent(new D.W.Event('focus')); n.rFocus = D.rail();
    D.tap('wallet'); await sleep(1700); n.rWarns = D.warns.slice();
    r.rebake = n.rBoot === 'account' && n.rTap === 'chats' && n.rFocus === 'account'
      && D.warns.length === 1 && D.warns[0] === '[RAIL] onChange lit wallet while the Account pane flag is set';
    /* C: dev off, no data-p1 — the stuck tap logs nothing */
    const C = await run({ dev: false }); runs.push(C);
    await sleep(50);
    C.tap('account'); C.W.localStorage.setItem(KEY, '1'); C.tap('wallet');
    await sleep(1700); n.offWarns = C.warns.slice();
    r.devOff = C.warns.length === 0;
    r.noErr = runs.every((x) => K.noErr(x.s.errs));
  } catch (e) { r.threw = e.message; } finally { for (const x of runs) x.s.close(); }
  const c = (k, m) => ok(r[k] === true, '★ S20F W-1 (#1409): ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 1000));
  c('storage', 'a pane seen in this document: C#\'s selectTab echo lit Chats, the flag\'s STORAGE event puts the rail back on Account');
  c('focus', 'a pane seen + the flag written without an event + window FOCUS → Account');
  c('visible', 'a pane seen + the flag written without an event + a return to VISIBLE → Account');
  c('noFlag', 'without the flag the same focus / visible events leave Chats');
  c('stale', 'C-1: a flag STRANDED before boot is not a sighting — a tab tap + focus / visible keep the rail on the tab (Chats, Wallet), no dev line');
  c('sighting', 'r2 MINOR-2: an Account tap stores the sighting in sessionStorage (spixi.pane.seen = 1); the close push removes it');
  c('eventSighting', 'r3 N4: the flag\'s storage event (a C#-opened pane, no home tap) stores the sessionStorage sighting bit; a removal event clears it');
  c('rebake', 'r2 MINOR-2: a re-bake (the same WebView reloads: the flag + the sighting bit) keeps the belt — a Chats tap + focus → Account again — and the dev line names the stuck writer');
  c('takeover', 'a home takeover owns the rail — focus under it does not re-light Account');
  c('selfCorrected', 'C-2: a selectTab echo the shell corrects itself logs NO line');
  c('normalTap', 'C-2: a normal Account → tab tap whose close push lands logs NO line');
  c('stuckTap', 'C-2: a tab tap with no close push, the rail still off Account 1.5 s later → ONE [RAIL] line naming onChange + its [P1] shell rail-stuck twin (data-p1)');
  c('stuckLand', 'C-2: a landOnTab under the pane, still off Account 1.5 s later → the [RAIL] line names landOnTab');
  c('devOff', 'dev mode off and no data-p1: no line at all');
  c('noErrA', 'no page error (dev on)');
  c('noErr', 'no page error (every run)');
}
