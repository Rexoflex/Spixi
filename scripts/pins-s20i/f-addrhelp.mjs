/* ==== S20I (Damir 2026-10-15 23:25, user testing) — My address row + the "How people find you" moment (Drop D, P32) ====
 * On the BUILT settings.html (jsdom; C# pushes via executeUiCommand; ixian: verbs captured):
 *   (A) the row: with an address, the hub carries ONE `.c-settings__row[data-setting-key="address"]` "My address" with the line
 *       "How people add you", in the SAME card as Contacts and directly ABOVE it; a click opens the ONE address
 *       sheet (.c-addr-sheet, #527) holding the full address; with no address there is no row;
 *   (B) the moment: caps `moments,addrhelp` + setMoments {"seen":[]} on the hub → exactly ONE `ixian:moment:addrhelp`;
 *       momentAnswer "1" → the sheet [data-moment="addrhelp"]: the title "How people find you", the moAddr art, exactly two
 *       buttons (fill "Show my address" · text "Got it"); "Show my address" → the address sheet opens;
 *       a second setMoments with addrhelp seen → no ask; a "0" answer then a NEW push (C#: the page is now on screen) → asked again;
 *   (C) not on the hub (a sub-screen) → no ask until the hub is back; WITHOUT the `addrhelp` cap → no ask ever;
 *   (E) #46 r1 M4: a sheet over the hub (body[data-overlay-open]) → no ask; it closes → exactly one ask;
 *   (F) #46 r1 M3: a LATE yes while the user is on a sub-screen waits and shows on the hub, never over the sub-screen;
 *   (G) #46 r3 N2: a second push while the first ask is still unanswered → no second verb at once; after a "0" for the first,
 *       the retry asks again (the pending retry);
 *   (D) C# source: SettingsPage grants the cap inside the S17Moments block behind S20AddrHelp; HomePage.onOverlayPresented sets
 *       shownToUser + re-pushes setMoments for a SettingsPage; SMoments ignores the ask with the flag off and decides it with
 *       `page is SettingsPage sp && sp.shownToUser` (every account — Damir 23:38); JS MOMENT_IDS == C# Ids.
 * Deliberate breaks (S20I report):
 *   settings-shell.js: the `if (address) me.card.append(settingRow({ … key: 'address' …` block removed     → (A) fails
 *   settings.html addrHelpRow: `hubEl && hubEl.isConnected ? …` → `hubEl ? …` AND addrHelpClear: drop `&& (paneMode || currentView === 'hub')`
 *     → (C) fails (asked on a sub-screen). Either alone holds on the phone (a sub-screen takes the hub out of the document).
 *   settings.html askAddrHelp: drop `!bridge.cap('addrhelp') ||` (THE cap guard, one copy)                  → (C) no-cap clause fails
 *   HomePage.onOverlayPresented: drop `((SettingsPage)overlay).shownToUser = true;`                        → (D) fails
 *   ★ #46 r1: HomePage.onOverlayClosed: drop `((SettingsPage)overlay).shownToUser = false;`               → (D) fails
 *   settings.html addrHelpClear: drop `document.body.dataset.overlayOpen === undefined &&`               → (E) fails
 *   settings.html showAddrHelp: show at once (no addrHelpClear re-check)                                  → (F) fails (sheet over the sub-screen)
 *   ★ #46 r3/r4: askAddrHelp: `if (moments.pending('addrhelp')) return;` before the clear check (return, no retry) → (G) fails.
 *     (Dropping only the `moments.pending('addrhelp') ||` clause does NOT fail G: the not-sent retry — `if (!momentAfterResult(…)
 *     && !moments.seen(…))` — covers it at 1000 ms. That retry has no leg of its own: #1463, recorded.) */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const { boot } = b2Kit(h);
  const ADDR = '425HqzWpMkV3dTgJnS85CQenAbCdEf9XyZ12';
  const SEEN0 = JSON.stringify({ seen: [], apps: [], lang: '', session: false });
  const asks = (sent, n0) => sent.slice(n0).filter((c) => /^ixian:moment:/.test(c));
  const R = {};
  let s = null;
  const close = () => { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } };
  try {
    /* —— (A) the row —— */
    s = await boot('settings.html', { wait: 900 });
    let { W, d, push, sent } = s;
    push('setCaps', 'moments');
    push('setNickname', 'Ana');
    await sleep(150);
    R.noAddrRow = !d.querySelector('.c-settings__row[data-setting-key="address"]');
    push('setAddress', ADDR);
    await sleep(200);
    const row = d.querySelector('.c-settings__row[data-setting-key="address"]');
    const contacts = d.querySelector('.c-settings__row[data-setting-key="contacts"]');
    const rows = row ? [...d.querySelectorAll('.c-settings__row[data-setting-key="address"]')].length : 0;
    const sec = (el) => el && el.closest('.c-settings__section');
    R.row = { one: rows === 1, label: row ? row.textContent : '', sameCard: !!(row && contacts && sec(row).parentElement === sec(contacts).parentElement),
      above: !!(row && contacts && sec(row).nextElementSibling === sec(contacts)) };
    if (row) row.click();
    await sleep(250);
    const sheet = d.querySelector('.c-addr-sheet');
    R.rowSheet = !!sheet && sheet.textContent.replace(/\s+/g, '').includes(ADDR);
    close();

    /* —— (B) the moment —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp');
    push('setNickname', 'Ana'); push('setAddress', ADDR);
    await sleep(150);
    let n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(900);
    R.ask1 = asks(sent, n0);
    push('momentAnswer', 'addrhelp', '', '1', '');
    await sleep(400);
    const mo = d.querySelector('.c-moment[data-moment="addrhelp"]');
    const btns = mo ? [...mo.querySelectorAll('.c-moment__btns button')] : [];
    R.sheet = { has: !!mo, title: mo ? (mo.querySelector('.c-moment__title') || {}).textContent : '', art: !!(mo && mo.querySelector('svg[data-illo="moAddr"]')),
      btns: btns.map((b) => b.dataset.value + ':' + b.textContent.trim()) };
    const show = btns.find((b) => b.dataset.value === 'address');
    if (show) show.click();
    await sleep(700);
    const asheet = d.querySelector('.c-addr-sheet');
    R.showOpens = !!asheet && asheet.textContent.replace(/\s+/g, '').includes(ADDR) && !d.querySelector('.c-moment[data-moment="addrhelp"]');   // #46 r1 M4: the full address, the moment gone
    n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: ['addrhelp'], apps: [], lang: '', session: false }));
    await sleep(900);
    R.seenNoAsk = asks(sent, n0).length === 0;
    close();

    /* —— (B') a "0" (the warm page was hidden) then a NEW push (the page is on screen) → asked again —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp'); push('setAddress', ADDR);
    await sleep(150);
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(900);
    push('momentAnswer', 'addrhelp', '', '0', '');
    await sleep(100);
    const firstAsks = asks(sent, n0).length;
    push('setMoments', SEEN0);
    await sleep(900);
    R.reask = { first: firstAsks, total: asks(sent, n0).length, noSheet: !d.querySelector('.c-moment') };
    close();

    /* —— (C) a sub-screen first: no ask; back on the hub → the ask —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp'); push('setAddress', ADDR);
    await sleep(150);
    const lang = d.querySelector('.c-settings__row[data-setting-key="privacy"]');   // a real sub-screen (Language opens a sheet)
    if (lang) lang.click();
    await sleep(500);
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(1300);
    R.subNoAsk = { lang: !!lang, asks: asks(sent, n0).length };
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const back = [...d.querySelectorAll('.c-topbar button')].find((b) => b.getAttribute('aria-label') === 'Back');
    R.backBtn = !!back;
    if (back) back.click();
    await sleep(1300);
    R.subThenHub = asks(sent, n0).filter((c) => c === 'ixian:moment:addrhelp').length;
    close();

    /* —— (E) #46 r1 M4: a sheet over the hub → no ask; the sheet closes → exactly one ask —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp'); push('setAddress', ADDR);
    await sleep(150);
    d.body.dataset.overlayOpen = '';
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(1300);
    const covered = asks(sent, n0).length;
    delete d.body.dataset.overlayOpen;
    await sleep(800);
    R.overlay = { covered, after: asks(sent, n0).filter((c) => c === 'ixian:moment:addrhelp').length };
    close();

    /* —— (F) #46 r1 M3: a LATE yes while the user is on a sub-screen waits for the hub (no sheet over the sub-screen) —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp'); push('setAddress', ADDR);
    await sleep(150);
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(900);
    const asked = asks(sent, n0).length;
    const priv = d.querySelector('.c-settings__row[data-setting-key="privacy"]');
    if (priv) priv.click();
    await sleep(500);
    push('momentAnswer', 'addrhelp', '', '1', '');
    await sleep(700);
    const onSub = !!d.querySelector('.c-moment[data-moment="addrhelp"]');
    const bk = [...d.querySelectorAll('.c-topbar button')].find((b) => b.getAttribute('aria-label') === 'Back');
    if (bk) bk.click();
    await sleep(1300);
    R.late = { asked, priv: !!priv, onSub, onHub: !!d.querySelector('.c-moment[data-moment="addrhelp"]') };
    close();

    /* —— (G) #46 r3 N2: a push while the ask is pending retries (it does not return for good) —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments,addrhelp'); push('setAddress', ADDR);
    await sleep(150);
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(800);
    const g1 = asks(sent, n0).length;
    push('setMoments', SEEN0);          // the present push lands while the first ask is unanswered
    await sleep(700);
    const g2 = asks(sent, n0).length;
    push('momentAnswer', 'addrhelp', '', '0', '');   // the first ask: Wait (the page was hidden)
    await sleep(1300);
    R.pend = { g1, g2, g3: asks(sent, n0).length };
    close();

    /* —— (C') no addrhelp cap → no ask —— */
    s = await boot('settings.html', { wait: 900 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'moments'); push('setAddress', ADDR);
    await sleep(150);
    n0 = sent.length;
    push('setMoments', SEEN0);
    await sleep(1200);
    R.noCap = asks(sent, n0).length;
  } catch (e) { R.err = String(e && e.stack || e); }
  finally { close(); }

  ok(!R.err && R.noAddrRow && R.row.one && /My address/.test(R.row.label) && /How people add you/.test(R.row.label) && R.row.sameCard && R.row.above && R.rowSheet,
    `★ S20I (A): ONE "My address" row, directly above Contacts in the same card, opens the ONE address sheet; none without an address — ${JSON.stringify(R)}`);
  ok(!R.err && R.ask1 && R.ask1.length === 1 && R.ask1[0] === 'ixian:moment:addrhelp' && R.sheet.has && R.sheet.title === 'How people find you' && R.sheet.art
    && R.sheet.btns.join('|') === 'address:Show my address|dismiss:Got it' && R.showOpens && R.seenNoAsk,
    `★ S20I (B): the hub asks ONE ixian:moment:addrhelp; a yes shows "How people find you" (moAddr art, Show my address · Got it); Show my address opens the address sheet; seen → no ask — ${JSON.stringify({ ask1: R.ask1, sheet: R.sheet, showOpens: R.showOpens, seenNoAsk: R.seenNoAsk, err: R.err })}`);
  ok(!R.err && R.reask && R.reask.first === 1 && R.reask.total === 2 && R.reask.noSheet,
    `★ S20I (B'): a "0" (C#: the warm page is hidden) shows nothing, and the NEXT push (the page is on screen) asks again — ${JSON.stringify(R.reask)}`);
  ok(!R.err && R.pend && R.pend.g1 === 1 && R.pend.g2 === 1 && R.pend.g3 === 2,
    `★ S20I (G, #46 r3 N2): a push while the first ask is pending does not double-ask, and retries after its "0" — ${JSON.stringify(R.pend)}`);
  ok(!R.err && R.overlay && R.overlay.covered === 0 && R.overlay.after === 1 && R.late && R.late.asked === 1 && R.late.priv && !R.late.onSub && R.late.onHub,
    `★ S20I (E/F, #46 r1 M3/M4): no ask while a sheet covers the hub (one ask after it closes); a late yes on a sub-screen waits and shows on the hub — ${JSON.stringify({ overlay: R.overlay, late: R.late })}`);
  ok(!R.err && R.subNoAsk && R.subNoAsk.lang && R.subNoAsk.asks === 0 && R.backBtn && R.subThenHub === 1 && R.noCap === 0,
    `★ S20I (C): no ask on a sub-screen (asked once back on the hub), none without the addrhelp cap — ${JSON.stringify({ sub: R.subNoAsk, backBtn: R.backBtn, back: R.subThenHub, noCap: R.noCap })}`);

  /* —— (D) the C# call sites (source; the rules themselves run in scripts/csh S20ITests) —— */
  const cs = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const sp = cs('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const hp = cs('Spixi/Pages/Home/HomePage.xaml.cs');
  const sm = cs('Spixi/Meta/SMoments.cs');
  const mr = readFileSync(join(root, 'Spixi/Utils/S17MomentRules.cs'), 'utf8');
  const js = readFileSync(join(root, 'src/components/moment-sheet.js'), 'utf8');
  const capBlock = /if \(SpixiFlags\.S17Moments\)\s*\{\s*caps \+= ",moments";\s*if \(SpixiFlags\.S20AddrHelp\)\s*\{\s*caps \+= ",addrhelp";\s*\}\s*\}/.test(sp);
  const present = /if \(overlay is SettingsPage\)\s*\{[^}]*?if \(SpixiFlags\.S17Moments && SpixiFlags\.S20AddrHelp\)\s*\{\s*\(\(SettingsPage\)overlay\)\.shownToUser = true;\s*SMoments\.pushTo\(overlay\);/.test(hp);
  /* #46 r1 security MINOR-1: a CLOSED Account page is parked hidden — the flag goes back to false there */
  const closedReset = /public override void onOverlayClosed\(SpixiContentPage overlay\)\s*\{\s*if \(overlay is SettingsPage\)\s*\{\s*\(\(SettingsPage\)overlay\)\.shownToUser = false;/.test(hp);
  const verbOff = /if \(id == S20IRules\.AddrHelpId && !SpixiFlags\.S20AddrHelp\) return true;/.test(sm);
  const decide = /case S20IRules\.AddrHelpId:\s*eligible = S20IRules\.addrHelpEligible\(SpixiFlags\.S20AddrHelp, page is SettingsPage sp && sp\.shownToUser\);/.test(sm);
  const csIds = (/public static readonly string\[\] Ids = \{([^}]*)\}/.exec(mr) || [, ''])[1].replace(/[\s"]/g, '');
  const jsIds = (/export const MOMENT_IDS = \[([^\]]*)\]/.exec(js) || [, ''])[1].replace(/[\s']/g, '');
  ok(capBlock && present && closedReset && verbOff && decide && csIds === jsIds && /addrhelp/.test(csIds),
    `★ S20I (D): the C# call sites — cap inside S17Moments behind S20AddrHelp ${capBlock} · shownToUser + re-push at present ${present} · reset at close ${closedReset} · flag-off ignore ${verbOff} · the decision ${decide} · JS MOMENT_IDS == C# Ids ${csIds === jsIds} (${jsIds})`);
}
