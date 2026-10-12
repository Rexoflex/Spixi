/* ==== S17 A (#1338) — WHAT'S NEW: the spotlight card, the queue, the About row, the bar ink (#1339) — P26 ====
 * On the BUILT index.html and settings.html (jsdom; C# pushes via executeUiCommand; ixian: verbs captured):
 *   · HOME: with the `whatsnew` cap a valid setWhatsNew {version, show:true} opens the card through the nudge queue (at its
 *     head, before a waiting backup card): 6 slides, the eyebrow names the version, Next × 5 then "Got it"; EVERY close path
 *     sends ixian:whatsnew:done exactly once (Got it · × · Esc); only the shown slide runs its loops (.wn-paused on the
 *     others — never keyed on aria-hidden); no cap / bad JSON / a bad version / show:false change nothing; a release with
 *     no slide table sends ixian:whatsnew:done at once and shows nothing (#1143); a second push while it stands is ignored
 *   · ABOUT: the push gives the "What's new" row its "New" badge; a tap opens the same card, its close sends the verb and
 *     the badge is gone; the About header tells C# the bar ink (ixian:topsurface:about), the hub takes it back (plain)
 *   · C# (source): the flag gates the caps, the push and both verbs; LaunchPage writes no seen (Damir 20:43: a fresh
 *     install gets the card); the FE table names THIS build's Config.version (a version bump without a table is caught)
 * Deliberate breaks (S17 report): skip the verb on × → the close clause fails; key the loop pause on aria-hidden → the
 * loop clause fails; drop the table row → the table clause fails. */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const { boot } = dKit(h);
  const rd = (f) => readFileSync(join(root, f), 'utf8');
  const VALID = JSON.stringify({ version: '0.9.22', show: true });
  let s = null;
  const close = () => { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } };
  try {
    /* —— no cap → nothing; then the guards —— */
    s = await boot('index.html', { wait: 1500 });
    let { W, d, push, sent } = s;
    const card = () => d.querySelector('.c-whatsnew');
    push('setWhatsNew', VALID);
    await sleep(400);
    const G = { noCap: !card() };
    push('setCaps', 'whatsnew');
    for (const bad of ['{', '[]', JSON.stringify({ version: '0.9.22' }), JSON.stringify({ version: '0.9.22', show: false }), JSON.stringify({ version: '0.9.22"}', show: true }), JSON.stringify({ version: 1, show: true })]) push('setWhatsNew', bad);
    await sleep(400);
    G.badIgnored = !card() && !sent.some((c) => /whatsnew/.test(c));
    let n0 = sent.length;
    push('setWhatsNew', JSON.stringify({ version: '9.9.9', show: true }));
    await sleep(400);
    G.noTableSilentBump = !card() && JSON.stringify(sent.slice(n0)) === '["ixian:whatsnew:done"]';
    ok(Object.values(G).every(Boolean), '★ S17 A (#1338): setWhatsNew is guarded — no cap, bad JSON, a missing / non-boolean show, show:false or a version that is not digits and dots change nothing; a release with no slide table bumps seen at once (ixian:whatsnew:done) and shows nothing (#1143) — ' + JSON.stringify(G));

    /* —— the card through the queue —— */
    push('setWhatsNew', VALID);
    await sleep(600);
    const el = card();
    const slides = el ? [...el.querySelectorAll('.c-whatsnew__slide')] : [];
    const C = {
      opens: !!el && el.getAttribute('role') === 'dialog' && el.getAttribute('aria-modal') === 'true',
      six: slides.map((x) => x.dataset.slide).join() === 'hero,reply,voice,photos,privacy,apps',
      eyebrow: !!el && (el.querySelector('.c-whatsnew__eyebrow') || {}).textContent === 'New in Spixi 0.9.22',
      art: !!slides[0] && slides[0].querySelectorAll('.c-whatsnew__art svg.il.wn-l').length === 2 && slides[0].querySelector('.c-whatsnew__art').getAttribute('aria-hidden') === 'true',
      labelled: !!el && el.getAttribute('aria-labelledby') === slides[0].querySelector('.c-whatsnew__title').id,
    };
    /* the loops: only the shown slide runs them */
    const primary = el && el.querySelector('.c-whatsnew__primary');
    const paused = () => slides.map((x) => x.querySelector('.c-whatsnew__art').classList.contains('wn-paused') ? 1 : 0).join('');
    C.loops0 = paused() === '011111';
    push('setWhatsNew', VALID);   // a second push while it stands
    await sleep(300);
    C.oneCard = d.querySelectorAll('.c-whatsnew').length === 1;
    primary.click(); await sleep(50);
    C.loops1 = paused() === '101111' && slides[1].querySelectorAll('svg.il.wn-l').length === 2;
    n0 = sent.length;
    for (let i = 0; i < 4; i++) { primary.click(); await sleep(30); }
    C.gotIt = /Got it/.test(primary.textContent) && sent.length === n0;
    primary.click();
    await sleep(500);
    C.gotItDone = sent.slice(n0).filter((c) => /whatsnew/.test(c)).join() === 'ixian:whatsnew:done' && !d.querySelector('.c-whatsnew[data-open]');
    ok(Object.values(C).every(Boolean), '★ S17 A (#1338): the card — a modal dialog of six slides (hero · reply · voice · photos · privacy · apps), "New in Spixi 0.9.22", each scene two decorative layers built when its slide is near; ONLY the shown slide runs its loops (.wn-paused on the others); a second push while it stands opens nothing; Next × 5 then "Got it" sends ixian:whatsnew:done once — ' + JSON.stringify(C));
    close();

    /* —— × and Esc are close paths too; the queue head —— */
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'whatsnew');
    push('setWhatsNew', VALID);
    await sleep(600);
    n0 = sent.length;
    d.querySelector('.c-whatsnew__x').click();
    await sleep(500);
    const wnOnly = (a) => a.filter((c) => /whatsnew/.test(c)).join();   // the overlay mirror (ixian:homeoverlay:*) rides along
    const X = { x: wnOnly(sent.slice(n0)) === 'ixian:whatsnew:done' };
    close();
    s = await boot('index.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'whatsnew');
    push('setWhatsNew', VALID);
    await sleep(600);
    n0 = sent.length;
    if (W.Spixi.dismissTopOverlay) W.Spixi.dismissTopOverlay();   // the back gesture / Esc path
    await sleep(500);
    X.esc = wnOnly(sent.slice(n0)) === 'ixian:whatsnew:done' && !d.querySelector('.c-whatsnew[data-open]');
    const home = stripCode(rd('src/shells/home.html'));
    X.headOfQueue = /const NUDGE_RANK = \{ whatsnew: 0, backup: 1, rating: 2 \};/.test(home);
    X.hintsWait = /return !!updateCard \|\| nudgeOpen !== null\s*(?:\|\| moments\.sessionTaken\(\)\s*)?\|\| nudgeQueue\.some/.test(home);   // ★ S17 F: + the moment session
    ok(Object.values(X).every(Boolean), '★ S17 A (#1338): every close path sends ixian:whatsnew:done once — × and the back / Esc path as well as "Got it"; the card stands at the HEAD of the nudge queue (before backup and rating) and a hint card waits while it is queued or open — ' + JSON.stringify(X));
    close();

    /* —— About: the row, the badge, the same card; the bar ink —— */
    s = await boot('settings.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'settingsApply,whatsnew,topsurface');
    push('setVersion', 'spixi-0.9.22');
    push('setWhatsNew', VALID);
    await sleep(300);
    n0 = sent.length;
    const aboutRow = [...d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*About/.test(x.textContent || ''));
    if (aboutRow) aboutRow.click();
    await sleep(400);
    const A = { topAbout: sent.slice(n0).includes('ixian:topsurface:about') };
    const row = d.querySelector('.c-settings-about__wn-row');
    A.badge = !!row && !!row.querySelector('.c-settings-about__new');
    if (row) row.click();
    await sleep(500);
    A.opens = !!d.querySelector('.c-whatsnew') && !row.querySelector('.c-settings-about__new');
    n0 = sent.length;
    const x = d.querySelector('.c-whatsnew__x');
    if (x) x.click();
    await sleep(500);
    A.done = sent.slice(n0).includes('ixian:whatsnew:done');
    n0 = sent.length;
    const back = d.querySelector('.c-settings-about .c-topbar button');
    if (back) back.click();
    await sleep(400);
    A.topPlain = sent.slice(n0).includes('ixian:topsurface:plain');
    close();
    s = await boot('settings.html', { wait: 1500 });
    ({ W, d, push, sent } = s);
    push('setCaps', 'settingsApply');   // no caps → no row, no bar ink verb
    push('setWhatsNew', VALID);
    await sleep(200);
    const aboutRow2 = [...d.querySelectorAll('button.c-settings__row')].find((x2) => /^\s*About/.test(x2.textContent || ''));
    if (aboutRow2) aboutRow2.click();
    await sleep(400);
    A.noCapNoRow = !d.querySelector('.c-settings-about__wn-row') && !sent.some((c) => /topsurface/.test(c));
    ok(Object.values(A).every(Boolean), '★ S17 A (#1338 / #1339): About — the push gives the "What\'s new" row its "New" badge; a tap opens the SAME card (badge gone) and its close sends ixian:whatsnew:done; the header asks C# for the band\'s bar ink (ixian:topsurface:about) and the hub gives it back (plain); without the caps there is no row and no verb — ' + JSON.stringify(A));
    close();
  } catch (e) {
    ok(false, '★ S17 A threw: ' + (e && e.stack || e));
    close();
  }

  /* —— C# (source) —— */
  try {
    const cs = (f) => stripCode(rd(f));
    const hp = cs('Spixi/Pages/Home/HomePage.xaml.cs'), sp = cs('Spixi/Pages/Settings/SettingsPage.xaml.cs'), fl = cs('Spixi/Utils/SpixiFlags.cs');
    const lp = cs('Spixi/Pages/Launch/LaunchPage.xaml.cs');
    const cfg = rd('Spixi/Meta/Config.cs').match(/public static readonly string version = "spixi-([0-9.]+)";/);
    const wn = rd('src/components/whats-new.js');
    const R = {
      flag: /public const string S17BridgeKey = "flagS17Bridge";/.test(fl) && /S17Bridge = S16PassRules\.effectiveFlag\(dev, sb\);/.test(fl),
      homeCap: /"composeSend,hints,updateHelp,hintHelp" \+ \(SpixiFlags\.S17Bridge \? ",whatsnew" : ""\)/.test(hp) && /pushHints\(\);\s*pushWhatsNew\(\);/.test(hp),
      homePushGated: /internal static void pushWhatsNewTo\(SpixiContentPage page\)\s*\{\s*if \(!SpixiFlags\.S17Bridge\)\s*\{\s*return;/.test(hp)
        && /S17Rules\.pushJson\(v, S17Rules\.shouldShow\(SLocalOnlyStore\.get\(S17Rules\.SeenKey\), v\)\)/.test(hp),
      homeVerb: /else if \(S17Rules\.isDoneVerb\(current_url\)\)\s*\{\s*markWhatsNewSeen\(\);/.test(hp)
        && /internal static void markWhatsNewSeen\(\)\s*\{\s*if \(!SpixiFlags\.S17Bridge\)/.test(hp),
      settings: /if \(SpixiFlags\.S17Bridge\)\s*\{\s*caps \+= ",whatsnew,topsurface";/.test(sp) && /HomePage\.pushWhatsNewTo\(this\);/.test(sp)
        && /else if \(S17Rules\.isDoneVerb\(current_url\)\)\s*\{\s*HomePage\.markWhatsNewSeen\(\);/.test(sp)
        && /if \(SpixiFlags\.S17Bridge && S17Rules\.parseTopSurface\(current_url, out int topKind\) && topKind != topSurfaceKind\)/.test(sp)
        && /string\? c = SpixiFlags\.S17Bridge \? S17Rules\.topSurfaceColor\(topSurfaceKind,/.test(sp),
      launchWritesNothing: !/whatsnew|S17Rules/.test(lp),
      tableNamesThisBuild: !!cfg && new RegExp("'" + cfg[1].replace(/\./g, '\\.') + "': Object\\.freeze\\(\\[").test(wn),
      /* #46 r1 m8: the About row's "· 6 new things" is a STRING — it must name this release's slide count (update it with the table) */
      subCount: (() => { try { const t = wn.match(new RegExp("'" + (cfg ? cfg[1] : 'x').replace(/\./g, '\\.') + "': Object\\.freeze\\(\\[([^\\]]*)\\]")); const n = t ? t[1].split(',').filter((x) => x.trim()).length : -1; return n > 0 && JSON.parse(rd('src/strings/en-us.json')).whatsNewSub.indexOf('· ' + n + ' ') > 0; } catch (e) { return false; } })(),
    };
    ok(Object.values(R).every(Boolean), '★ S17 A (#1338 / #1339, P26) C#: the S17Bridge flag (dev switch, the S16 rule) gates the whatsnew cap, the setWhatsNew push (show = the stored seen version differs), both verbs and the topsurface override; LaunchPage writes NO seen (Damir 20:43: a fresh install — create or restore — gets the card once); the FE slide table names THIS build\'s Config.version — ' + JSON.stringify({ R, version: cfg && cfg[1] }));
  } catch (e) {
    ok(false, '★ S17 A C# threw: ' + e.message);
  }
}
