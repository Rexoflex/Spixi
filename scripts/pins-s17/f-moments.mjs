/* ==== S17 F (#1340) — THE MOMENT SHEETS (MOMENTS.md + moments-render.html; Damir 17:12 / 17:36 / 20:37 / 20:42) — P28 ====
 * On the BUILT shells (jsdom; C# pushes via executeUiCommand; ixian: verbs captured):
 *   · THE SHEET: one component for the seven — the art FULL-BLEED at the top (Damir 20:37: the sheet's corners clip it, the
 *     handle sits on it), the copy of the render, 1–3 buttons and NO outline button (20:42: a secondary choice is a text
 *     button); every close path (a button · Esc · the scrim) calls back ONCE, the quiet ones as 'dismiss'
 *   · THE CLIENT: no cap / no state = no ask and the action goes on at once; an ask sends the exact verb; "1" shows, "0" or
 *     no answer within ASK_WAIT_MS goes on; a seen moment is never asked again; a bad argument is never sent
 *   · HOME: the first IXI received asks `firstixi` (on a clear screen) and its "Back up now" opens Backup; a hint / update card
 *     tells C# (`ixian:moment:card`); the backup card is SAFETY and still shows in a session that had a moment (#46 r1)
 *   · SETTINGS: a pending language asks `lang:<code>` and the sheet speaks the NEW language (title + the greeting pill)
 *   · CHAT: the first mic tap shows the mic moment BEFORE `ixian:voicerec:start` (Continue = record, Not now = nothing)
 *   · SOURCE: the hosts wire the moments (app · pay · autodl · offline); the native payment confirm is untouched
 * Deliberate breaks (S17 report): an outline secondary → the sheet clause fails; drop `noteMomentCard` from the update card
 * → the home clause fails; let the app-id test accept anything → the client clause fails (an app id with a space is asked). */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const { boot } = dKit(h);
  const rd = (f) => readFileSync(join(root, f), 'utf8');
  let s = null;
  const close = () => { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } };

  /* —— the sheet + the client, on the built home document —— */
  try {
    s = await boot('index.html', { wait: 1500 });
    const { W, d } = s;
    const S = W.Spixi;
    const R = {};
    const shown = {};
    for (const id of S.MOMENT_IDS) {
      let got = [];
      const sh = S.showMomentSheet({ id, host: d.body, strings: {}, ctx: { name: 'Ana', app: 'Chess', invitedBy: 'Ana', caps: ['Storage', 'SingleUser', 'MultiUser'] }, onClose: (v) => got.push(v) });
      await sleep(30);
      const btns = [...sh.querySelectorAll('.c-moment__btns .c-button')];
      shown[id] = { title: (sh.querySelector('.c-moment__title') || {}).textContent, btns: btns.map((b) => b.dataset.type + ':' + b.textContent.trim()) };
      const kids = [...sh.children];
      R[id] = sh.classList.contains('c-moment__sheet') && sh.classList.contains('c-sheet') && sh.getAttribute('role') === 'dialog'
        && kids[0] && kids[0].classList.contains('c-sheet__handle')                                     // the handle, laid over the art (CSS)
        && !!sh.querySelector('.c-sheet__content > .c-moment > .c-moment__art:first-child svg.il')       // the art FIRST, full bleed
        && btns.length >= 1 && btns.length <= 3 && btns[0].dataset.type === 'fill'
        && btns.every((b) => b.dataset.type !== 'outline');
      /* a quiet close (Esc) = 'dismiss', once */
      d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(500);
      R[id + 'Esc'] = got.join() === 'dismiss' && !sh.isConnected;
    }
    /* the copy = the render's (English) */
    const C = {
      lang: shown.lang.title === 'Translated with AI' && shown.lang.btns.join() === 'fill:I understand',
      autodl: shown.autodl.btns.join() === 'fill:Open Settings,text:Not now',   // #46 security r1 MAJOR-1 (Damir 22:2x): the chat never writes the setting
      offline: shown.offline.title === 'Waiting for Ana' && shown.offline.btns.join() === 'fill:OK',
      firstixi: shown.firstixi.title === 'You received your first IXI' && shown.firstixi.btns.join() === 'fill:Back up now,text:Later',
      mic: shown.mic.btns.join() === 'fill:Continue,text:Not now',
      app: shown.app.title === 'Before you open Chess' && shown.app.btns.join() === 'fill:Open,text:Cancel',
      pay: shown.pay.title === 'Before you pay' && shown.pay.btns.join() === 'fill:Continue',
    };
    /* the app moment: the app's own capability rows (known names, the details page's order; SingleUser never) + the invite line */
    let v1 = [];
    const ap = S.showMomentSheet({ id: 'app', host: d.body, strings: {}, ctx: { app: 'Chess', invitedBy: 'Ana', caps: ['MultiUser', 'SingleUser', 'Storage', '<b>'] }, onClose: (v) => v1.push(v) });
    await sleep(30);
    C.caps = [...ap.querySelectorAll('.c-moment__cap')].map((x) => x.dataset.cap).join() === 'Storage,MultiUser'
      && /^Ana invited you to this app\. It runs inside Spixi/.test(ap.querySelector('.c-moment__body').textContent) && ap.querySelector('.c-moment[data-caps]') !== null;
    ap.querySelector('.c-button[data-value="open"]').click();
    ap.querySelector('.c-button[data-value="open"]').click();   // the latch: one choice
    await sleep(500);
    C.openOnce = v1.join() === 'open';
    /* the AI drawing: "Hello" + the greeting of the language (textContent, never markup) */
    const ai = S.showMomentSheet({ id: 'lang', host: d.body, strings: { momentHello: '<i>Hallo</i>' }, onClose: () => {} });
    await sleep(30);
    C.aiPills = (ai.querySelector('[data-say="hello"]') || {}).textContent === 'Hello' && (ai.querySelector('[data-say="greet"]') || {}).textContent === '<i>Hallo</i>' && !ai.querySelector('.c-moment__art i');
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(450);
    ok(Object.values(R).every(Boolean) && Object.values(C).every(Boolean),
      '★ S17 F (#1340): ONE sheet for the seven moments — the art FULL-BLEED first under the sheet\'s own handle (Damir 20:37), the render\'s copy, 1–3 buttons led by a fill and NEVER an outline (20:42: a secondary choice is a text button), Esc = \'dismiss\' once; the app moment lists the app\'s own known capabilities (SingleUser and unknown names never) after "Ana invited you"; the AI drawing carries "Hello" + the greeting as text — ' + JSON.stringify({ R, C, shown }));

    /* —— the client —— */
    const sentB = [];
    const fakeBridge = (caps) => ({ cap: (c) => caps.indexOf(c) >= 0, send: (v) => sentB.push(v) });
    const K = {};
    let calls = [];
    const c0 = S.createMomentClient({ bridge: fakeBridge([]) });
    c0.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    c0.ask('mic', '', () => calls.push('yes'), () => calls.push('no'));
    K.noCap = calls.join() === 'no' && sentB.length === 0;
    calls = [];
    const c1 = S.createMomentClient({ bridge: fakeBridge(['moments']) });
    c1.ask('mic', '', () => calls.push('yes'), () => calls.push('no'));
    K.noState = calls.join() === 'no' && sentB.length === 0;
    c1.setState('{bad');
    K.badState = c1.state === null;
    calls = [];
    c1.setState(JSON.stringify({ seen: ['pay', 'evil'], apps: ['com.chess', 'a b'], lang: 'de-de', session: false }));
    K.validated = c1.state.seen.join() === 'pay' && c1.state.apps.join() === 'com.chess' && c1.state.lang === 'de-de';
    c1.ask('pay', '', () => calls.push('yes'), () => calls.push('no'));
    c1.ask('app', 'com.chess', () => calls.push('yes'), () => calls.push('no'));
    c1.ask('lang', 'DE-DE', () => calls.push('yes'), () => calls.push('no'));
    c1.ask('app', 'a b', () => calls.push('yes'), () => calls.push('no'));
    c1.ask('lang', 'fr-fr', () => calls.push('yes'), () => calls.push('no'));   // only the pending language asks
    K.seenAndBad = calls.join() === 'no,no,no,no,no' && sentB.length === 0;
    calls = [];
    c1.ask('mic', '', (caps) => calls.push('yes:' + caps.join('+')), () => calls.push('no'));
    c1.ask('app', 'com.dice', (caps) => calls.push('app:' + caps.join('+')), () => calls.push('no'));
    c1.ask('lang', 'de-de', () => calls.push('lang'), () => calls.push('no'));
    K.verbs = sentB.join() === 'ixian:moment:mic,ixian:moment:app:com.dice,ixian:moment:lang:de-de';
    K.pending = c1.pending('mic') && !c1.pending('pay');
    c1.answer('mic', '', '1', '');
    c1.answer('app', 'com.dice', '1', 'Storage,MultiUser');
    c1.answer('lang', 'de-de', '0', '');
    K.answers = calls.join() === 'yes:,app:Storage+MultiUser,no' && c1.seen('mic') && c1.seen('app', 'com.dice') && c1.sessionTaken();
    calls = [];
    c1.ask('mic', '', () => calls.push('yes'), () => calls.push('no'));
    K.neverTwice = calls.join() === 'no' && sentB.length === 3;
    /* no answer → on after ASK_WAIT_MS; a late yes after that does not run the action twice */
    calls = [];
    c1.ask('offline', '', () => calls.push('yes'), () => calls.push('no'));
    await sleep(S.ASK_WAIT_MS + 150);
    c1.answer('offline', '', '1', '');
    K.timeout = calls.join() === 'no';
    /* momentBeforeAction: a yes shows the sheet — the fill = go, a quiet close = stop; a no = go at once */
    let acts = [];
    S.momentBeforeAction(c0, { id: 'pay', host: d.body, strings: {}, go: () => acts.push('go'), stop: () => acts.push('stop') });
    K.beforeNo = acts.join() === 'go';
    acts = [];
    const c2 = S.createMomentClient({ bridge: fakeBridge(['moments']) });
    c2.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    S.momentBeforeAction(c2, { id: 'pay', host: d.body, strings: {}, go: () => acts.push('go'), stop: () => acts.push('stop') });
    S.momentBeforeAction(c2, { id: 'pay', host: d.body, strings: {}, go: () => acts.push('go2'), stop: () => acts.push('stop2') });   // a second tap STOPS (#46 r1: the host's latch is released, never stranded)
    c2.answer('pay', '', '1', '');
    await sleep(40);
    const paySheet = d.querySelector('.c-moment__sheet[data-moment="pay"]');
    K.beforeShows = !!paySheet && acts.join() === 'stop2' && paySheet.getAttribute('aria-labelledby') === paySheet.querySelector('.c-moment__title').id && paySheet.getAttribute('aria-describedby') === paySheet.querySelector('.c-moment__body').id;
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    K.beforeStop = acts.join() === 'stop2,stop';
    /* momentAfterResult: a LATE yes (after ASK_WAIT_MS) still shows — the user's action is long done (#46 r1 NIT) */
    let late = [];
    const c3 = S.createMomentClient({ bridge: fakeBridge(['moments']) });
    c3.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    S.momentAfterResult(c3, 'offline', '', () => late.push('show'));
    await sleep(S.ASK_WAIT_MS + 150);
    c3.answer('offline', '', '1', '');
    K.lateShows = late.join() === 'show';
    ok(Object.values(K).every(Boolean),
      '★ S17 F (#1340): the moment client — no cap or no state = no ask and the action goes on; setMoments is validated (ids, app ids, a lower-case code); a seen moment, a non-pending language and a bad argument are never asked; the asks are the exact verbs (ixian:moment:mic · :app:<id> · :lang:<code>); "1" shows (with the app\'s caps), "0" goes on; no answer within ASK_WAIT_MS goes on and a late yes does not run it twice; momentBeforeAction: a yes holds the action behind the sheet (a second tap waits), a quiet close stops it — ' + JSON.stringify(K));
    close();

    /* —— HOME: the first IXI, the card note, the session hold —— */
    s = await boot('index.html', { wait: 1500 });
    let { push, sent } = s;
    let dd = s.d;
    const Hm = {};
    push('setCaps', 'moments');
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    await sleep(100);
    let n0 = sent.length;
    push('clearPaymentActivity', '0');
    push('addPaymentActivity', 'tx1', '1', 'Ana', String(Math.floor(Date.now() / 1000)), '25', '0.09', 'true');
    push('clearPaymentActivityDone');
    await sleep(200);
    Hm.asks = sent.slice(n0).filter((c) => /moment/.test(c)).join() === 'ixian:moment:firstixi';
    push('momentAnswer', 'firstixi', '', '1', '');
    await sleep(900);
    const fx = dd.querySelector('.c-moment__sheet[data-moment="firstixi"]');
    Hm.shows = !!fx;
    n0 = sent.length;
    if (fx) fx.querySelector('.c-button[data-value="backup"]').click();
    await sleep(600);
    Hm.backup = sent.slice(n0).indexOf('ixian:backup') >= 0;
    /* the update card tells C# once */
    push('setCaps', 'updateHelp');   // the update CARD needs the exe's updateHelp cap (else today's banner)
    n0 = sent.length;
    push('showWarning', 'New version of Spixi (9.9.9) is available. Please update for best experience.');
    await sleep(200);
    Hm.card = sent.slice(n0).filter((c) => /moment/.test(c)).join() === 'ixian:moment:card';
    close();
    /* #46 r1: the backup card is SAFETY — it shows even in a session that had a moment (C# stamps at the push; a held card
       would be lost for 30 days); the rating sheet waits */
    s = await boot('index.html', { wait: 1500 });
    ({ push, sent } = s);
    dd = s.d;
    push('setCaps', 'moments');
    push('setMoments', JSON.stringify({ seen: ['mic'], apps: [], lang: '', session: true }));
    push('toggleAnimatedSlider', 'backup-prompt');
    await sleep(900);
    Hm.backupSafety = !!dd.querySelector('.c-backup-nudge');
    close();
    ok(Object.values(Hm).every(Boolean),
      '★ S17 F (#1340): HOME — a received payment in the wallet asks ixian:moment:firstixi once (only on a clear screen); C#\'s "1" shows the sheet and "Back up now" opens Backup (ixian:backup); the update card tells C# a card stood (ixian:moment:card); the backup card is safety and still shows in a moment session — ' + JSON.stringify(Hm));

    /* —— SETTINGS: the AI translation moment, in the new language —— */
    s = await boot('settings.html', { wait: 1500 });
    ({ push, sent } = s);
    dd = s.d;
    const St = {};
    push('setCaps', 'moments');
    push('setLocale', 'de-de');
    await sleep(100);
    n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: 'de-de', session: false }));
    await sleep(800);   // #46 r1: asked only once the screen is clear (the language sheet's close), ~400 ms after the push
    St.asks = sent.slice(n0).filter((c) => /moment/.test(c)).join() === 'ixian:moment:lang:de-de';
    push('momentAnswer', 'lang', 'de-de', '1', '');
    await sleep(900);
    const lg = dd.querySelector('.c-moment__sheet[data-moment="lang"]');
    St.shows = !!lg && lg.querySelector('.c-moment__title').textContent === 'Mit KI übersetzt'
      && (lg.querySelector('[data-say="greet"]') || {}).textContent === 'Hallo' && (lg.querySelector('[data-say="hello"]') || {}).textContent === 'Hello';
    n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: true }));
    await sleep(800);
    St.noPending = sent.slice(n0).filter((c) => /moment/.test(c)).length === 0;
    close();
    ok(Object.values(St).every(Boolean),
      '★ S17 F (#1340): SETTINGS — a pending language (pushed AFTER setLocale) asks ixian:moment:lang:<code>; the sheet opens in the NEW language ("Mit KI übersetzt", the pills "Hello" + "Hallo"); no pending language, no ask — ' + JSON.stringify(St));

    /* —— CHAT: the mic moment before the recorder —— */
    s = await boot('chat.html', { wait: 1800 });
    ({ push, sent } = s);
    dd = s.d;
    const Ch = {};
    push('setCaps', 'voice,moments');
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    await sleep(200);
    const mic = dd.querySelector('.c-composer [data-mode="mic"]');
    n0 = sent.length;
    if (mic) mic.click();
    await sleep(80);
    Ch.asks = !!mic && sent.slice(n0).filter((c) => /moment|voicerec/.test(c)).join() === 'ixian:moment:mic';
    push('momentAnswer', 'mic', '', '1', '');
    await sleep(120);
    const ms = dd.querySelector('.c-moment__sheet[data-moment="mic"]');
    Ch.beforeRecord = !!ms && !sent.slice(n0).some((c) => /voicerec/.test(c));
    if (ms) ms.querySelector('.c-button[data-value="continue"]').click();
    await sleep(600);
    Ch.continueRecords = sent.slice(n0).filter((c) => /voicerec/.test(c)).join() === 'ixian:voicerec:start';
    close();
    ok(Object.values(Ch).every(Boolean),
      '★ S17 F (#1340): CHAT — the first mic tap asks ixian:moment:mic and the sheet stands BEFORE ixian:voicerec:start (C# answers yes only while the permission is not granted, never for an unpackaged Windows exe); Continue records — ' + JSON.stringify(Ch));
  } catch (e) { close(); ok(false, '★ S17 F moments threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }

  /* —— SOURCE: the hosts and the C# glue —— */
  try {
    const home = stripCode(rd('src/shells/home.html'));
    const chat = stripCode(rd('src/shells/chat.html'));
    const cd = stripCode(rd('src/shells/contact_details.html'));
    const ws = stripCode(rd('src/components/wallet-send.js'));
    const cs = (f) => rd(f);
    const smom = cs('Spixi/Meta/SMoments.cs');
    const X = {
      homeApp: /appMoment\(app, \(\) => \{/.test(home) && /appMoment\(app, \(\) => openContacts\('app', app\.id\)\)/.test(home),
      homePay: /onBeforeReview: \(go, stop\) => momentBeforeAction\(moments, \{ id: 'pay'/.test(home),
      chatPay: /onBeforeReview: \(go, stop\) => momentBeforeAction\(moments, \{ id: 'pay'/.test(chat) && /function openPayRequestReview\(rec\) \{\s*if \(chatPayReview\) return;\s*momentBeforeAction\(moments, \{ id: 'pay'/.test(chat),
      cdPay: /onBeforeReview: \(go, stop\) => momentBeforeAction\(moments, \{ id: 'pay'/.test(cd),
      chatApp: (chat.match(/chatAppMoment\(/g) || []).length >= 4,
      chatAutoDl: /rec\.manualAccept && !rec\.voiceFile\s*&& isPhotoFileName\(rec\.name\) && mediaAutoloadOn\(\)/.test(chat) && /if \(m\.id === 'autodl' && v === 'settings'\) bridge\.send\('ixian:openPrivacy'\);/.test(chat)
        && !/ixian:photoAutoDl/.test(chat),   // #46 security r1 MAJOR-1: the UNTRUSTED chat never writes the setting
      chatTip: /function openTipForMessage\(rec\) \{\s*momentBeforeAction\(moments, \{ id: 'pay'/.test(chat),
      clearScreen: /function chatMomentClear\(\) \{[\s\S]{0,300}chatOverlayLive\(\)/.test(chat) && /function tryFirstIxiMoment\(\) \{\s*if \(!firstIxiWanted \|\| firstIxiAsked \|\| !momentContextClear\(\)\) return;/.test(home),
      chatOffline: /armOfflineMoment\(rec\);/.test(chat) && /const OFFLINE_MOMENT_MS = 10000;/.test(chat),
      /* the review and the native confirm are unchanged: the hook only DELAYS openSendReviewNow, whose body keeps the W5 contract */
      review: /function openSendReviewNow\(\) \{\s*if \(!valid\(\) \|\| state\.sending\) return;/.test(ws) && !/S17/.test(cs('Spixi/Utils/SPayments.cs')),
      /* C#: the flag gates every cap; the verbs only from the four hosts, never a mini app; seen is stored BEFORE the answer */
      caps: /SpixiFlags\.S17Moments \? ",moments" : ""/.test(cs('Spixi/Pages/Home/HomePage.xaml.cs')) && /if \(SpixiFlags\.S17Moments\)\s*\{\s*caps \+= ",moments";/.test(cs('Spixi/Pages/Settings/SettingsPage.xaml.cs'))
        && /if \(SpixiFlags\.S17Moments\)\s*\{\s*caps \+= ",moments";/.test(cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs')) && /SpixiFlags\.S17Moments \? ",moments" : ""/.test(cs('Spixi/Pages/Contacts/ContactDetails.xaml.cs')),
      hosts: /if \(hasGeneratedContent && \(this is HomePage \|\| this is SingleChatPage \|\| this is SettingsPage \|\| this is ContactDetails\)\)\s*\{\s*SMoments\.handleVerb\(this, url\);/.test(cs('Spixi/Utils/SpixiContentPage.cs')),
      flagOff: /if \(!SpixiFlags\.S17Moments\) return true;/.test(smom) && /public static void pushTo\(SpixiContentPage page\)\s*\{\s*if \(!SpixiFlags\.S17Moments\) return;/.test(smom),
      seenFirst: smom.indexOf('markSeen(id, arg);') > 0 && smom.indexOf('markSeen(id, arg);') < smom.indexOf('"momentAnswer"'),
      openPrivacy: /else if \(current_url\.Equals\("ixian:openPrivacy", StringComparison\.Ordinal\)\)\s*\{\s*if \(SpixiFlags\.S17Moments && SMoments\.takePrivacyOpen\(this\)\)[^\n]*\s*\{\s*SettingsPage\.openAt\("privacy"\);/.test(cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs'))
        && /if \(!owner\) return false;[^\n]*\s*privacyOpen = null;\s*return nowMs\(\) <= privacyOpenUntil;/.test(smom) && /if \(Environment\.TickCount64 - pendingScreenAt > 15000\) return;/.test(cs('Spixi/Pages/Settings/SettingsPage.xaml.cs'))
        && !/ixian:photoAutoDl/.test(cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs')) && !/autoDlOffer/.test(smom)
        && /bool taken = sessionTaken;/.test(smom)
        && /internal static void openAt\(string screen\)\s*\{\s*if \(screen != "privacy"\) return;/.test(cs('Spixi/Pages/Settings/SettingsPage.xaml.cs'))
        && /openScreen\(id\) \{\s*if \(String\(id\) !== 'privacy'\) return;/.test(stripCode(rd('src/shells/settings.html'))),
      langAfterLocale: /"setLocale", lang\);[\s\S]{0,400}SMoments\.noteLanguage\(SpixiLocalization\.getCurrentLanguage\(\)\);\s*SMoments\.pushTo\(this\);/.test(cs('Spixi/Pages/Settings/SettingsPage.xaml.cs'))
        && /!S17MomentRules\.isEnglish\(code\)/.test(smom),
      backupSafety: !/SMoments\.sessionTaken/.test(cs('Spixi/Pages/Home/HomePage.xaml.cs')) && /public const long SessionMs = S17MomentRules\.MaxSessionMs;/.test(smom) && /public const long MaxSessionMs = 6L \* 60 \* 60 \* 1000;/.test(rd('Spixi/Utils/S17MomentRules.cs')),
      restoreConsumes: /eligible = !\(page is HomePage\) \? S17MomentRules\.Eligible\.Wait\s*: \(BackupPage\.lastBackupTimestamp\(\) > 0 \? S17MomentRules\.Eligible\.Consume : S17MomentRules\.Eligible\.Yes\);/.test(smom)   // #46 r2: never keyed on the nudge stamp
        && /#if IOS \|\| MACCATALYST[\s\S]{0,300}if \(st == PermissionStatus\.Denied\) return S17MomentRules\.Eligible\.Consume;/.test(smom),
      micWindows: /#if WINDOWS\s*if \(AppInfo\.Current\.PackagingModel == AppPackagingModel\.Unpackaged\) return S17MomentRules\.Eligible\.Consume;/.test(smom),
      flag: /S17Moments = S16PassRules\.effectiveFlag\(dev, sm\);/.test(cs('Spixi/Utils/SpixiFlags.cs')) && /ixian:devflash:s17m:/.test(cs('Spixi/Pages/Dev/DevPage.xaml.cs')),
      csh: /S17MomentRules\.cs/.test(rd('scripts/csh/csh.csproj')),
      css: /\.c-moment__art \{[^}]*margin-inline: calc\(-1 \* var\(--spacing-16\)\)/.test(rd('src/styles/components/moment-sheet.css')) && /\.c-sheet\.c-moment__sheet \{ padding-top: 0; \}/.test(rd('src/styles/components/moment-sheet.css'))
        && /prefers-reduced-motion: reduce[\s\S]*\.il \.il-mo-ring \{ stroke-dashoffset: 0; \}/.test(rd('src/styles/components/illo.css')),
    };
    ok(Object.values(X).every(Boolean),
      '★ S17 F (#1340, P28): the wiring — Apps (single + multi) and the chat\'s invite / attach opens ask `app`; Wallet · chat · contact Pay ask `pay` BEFORE the review (the review and SPayments\' native confirm are unchanged); the first manual photo asks `autodl` and its button only OPENS Settings › Privacy (ixian:openPrivacy — the untrusted chat never writes the setting, #46 security r1); a tip asks `pay` too; the after-the-result moments are asked only on a clear screen; a manual download with no tick for 10 s asks `offline`; C#: the flag gates every cap / push / verb, the verbs only from the four hosts (never a mini app), seen is stored BEFORE the answer (every close path counts), the language is noted after setLocale and never for English, the backup card is safety (a moment never holds it; a session ends after 6 h), a restored account and an iOS / Mac refusal are consumed, an unpackaged Windows exe never gets the mic sheet; the art is full-bleed, reduced motion = the end frame — ' + JSON.stringify(X));
  } catch (e) { ok(false, '★ S17 F source threw: ' + e.message); }
}
