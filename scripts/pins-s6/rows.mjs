/* ==== SESSION 6 — agent G: #1190 (#1173 (3) + (4), #1188 render b) — a file row whose file is NOT on this device ====
 * Behaviour on the BUILT chat.html (jsdom; pushes via executeUiCommand; outgoing ixian: commands captured at the Location
 * impl) first; the C# halves are MAUI-bound and pinned on comment-stripped source (the pure rule — FileRowRules
 * localPathCase / localArg / isDeletedReceived — is EXECUTED by scripts/csh, FileRowRulesTests).
 * Deliberate breaks (#802) — each fails exactly the named pin (recorded in the hand-back):
 *   chat.html buildFileRow: `rec.localGone && rec.fstate === 'complete'` → `false && …`        → #1190 shell rows + live delete
 *   chat.html upsertFile: drop `if (rec.localGone) dropFileThumb(id);`                         → #1190 shell live delete
 *   typed-bubbles.js createFileBubble: `const gone = !!unavailable && …` → `const gone = false;` → #1190 shell rows (no "Not available")
 *   SingleChatPage addFile push: drop `, fLocal`                                                → #1190 C# addFile
 *   SharedItems.scan: drop the isDeletedReceived `continue`                                     → #1190 C# chat info
 *   ContactDetails sharedDeleteLocal: drop the insertMessage re-push                            → #1190 C# delete re-push
 * #46 r4 (each red alone, restored green):
 *   ContactDetails: refreshFileRow → insertMessage                                              → #1190 C# chat info + re-push (repush)
 *   SingleChatPage loadMessages: drop `fileRowsShown.Clear()` (!prepend)                        → #1190 C# re-push only a held row (resetOnFullLoad)
 *   SharedItems.localArgOf: `if (!fm.completed)` → `if (false)`                                 → #1190 C# localArgOf cost (earlyReturn)
 *   typed-bubbles createFileBubble: ariaBase `name + ', ' + meta` → `name`                      → #1190 shell a11y + menu (nameSaysUnavailable)
 *   typed-bubbles createFileGoneBubble: class 'c-fbubble c-fbubble--gone' → 'c-fbubble--gone'  → #1190 shell a11y + menu (goneIsFbubble, menuOnBubble)
 *   chat.html buildFileRow (unavailable): status → null                                         → #1190 shell a11y + menu (tickKept, ariaSuffix)
 *   contact_details landSharedDeleteFocus: `if (!f) return;` → `return;`                        → #1190 shell chat-info delete focus */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const bootChat = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:(openfile|viewImage|acceptfile)/.test(c)) sent.push(c); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const frame = () => new Promise((r) => W.requestAnimationFrame(() => W.requestAnimationFrame(() => r())));
    return { dom, W, d: W.document, push, frame, errs, sent };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const T0 = Math.floor(Date.now() / 1000) - 900;
  // addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer, local)
  const fileArgs = (id, name, t, mine, complete, extra) => ['addFile', id, 'addrPeer', 'Bob', '', 'f' + id, name, String(T0 + t),
    mine ? 'True' : 'False', 'True', 'False', complete ? '100' : '0', complete ? 'True' : 'False', 'False', 'True', ...extra];
  const open = async () => {
    const s = await bootChat();
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    s.push('setPhotoPreviews', 'True');
    s.push('clearMessages', 'false');
    return s;
  };
  const done = async (s) => { if (typeof s.W.messagesDone === 'function') s.push('messagesDone'); s.push('onChatScreenLoaded'); await sleep(250); };
  const rowOf = (s, id) => s.d.querySelector('#messages [data-msgid="' + id + '"]');

  /* ———— #1190 shell (4) + (3): fLocal "0" on a complete row → mine = the compact card, received = the deleted bubble;
     "" / no argument / "1" → today's photo tile; an offer is never touched ———— */
  await guard('#1190 shell rows', async () => {
    const s = await open();
    s.push(...fileArgs('s1', 'Screenshot_20261002-1.png', 0, true, true, ['', '0']));        // mine, gone
    s.push(...fileArgs('s2', 'IMG_2.jpg', 5, true, true, ['', '1']));                        // mine, here
    s.push(...fileArgs('s3', 'IMG_3.jpg', 10, true, true, ['']));                            // an older exe: 15 args
    s.push(...fileArgs('s4', 'IMG_4.jpg', 15, true, true, ['', '']));                        // unknown
    s.push(...fileArgs('s5', '<b>x</b>.png', 20, true, true, ['', '0']));                    // a hostile name: textContent only
    s.push(...fileArgs('s6', 'notes.pdf', 22, true, true, ['', '1']));                      // mine, a card, here (the control)
    s.push(...fileArgs('r1', 'IMG_r1.jpg', 25, false, true, ['', '0']));                     // received photo, deleted here
    s.push(...fileArgs('r2', 'report.pdf', 30, false, true, ['', '0']));                     // received file, deleted here
    s.push(...fileArgs('r3', 'IMG_r3.jpg', 35, false, false, ['', '0']));                    // an offer: never "deleted"
    s.push('setFileThumb', 's2', JPEG);
    await done(s);
    const txt = (id) => { const r = rowOf(s, id); return r ? r.textContent : ''; };
    const q = (id, sel) => { const r = rowOf(s, id); return r ? r.querySelector(sel) : null; };
    const r = {};
    const c1 = q('s1', '.c-fbubble');
    r.mineCompact = !!c1 && c1.dataset.unavailable !== undefined && c1.dataset.state === 'complete' && !q('s1', '.c-mbubble')
      && /Not available on this device/.test(txt('s1')) && !/Open file/.test(txt('s1')) && c1.getAttribute('aria-disabled') === 'true'
      && !/^Open /.test(c1.getAttribute('aria-label') || '');
    r.mineTileHere = !!q('s2', '.c-mbubble[data-file]') && !q('s2', '[data-unavailable]') && !/Not available/.test(txt('s2'));
    r.olderExeUnchanged = !!q('s3', '.c-mbubble[data-file]') && !/Not available/.test(txt('s3'));
    r.unknownUnchanged = !!q('s4', '.c-mbubble[data-file]') && !/Not available/.test(txt('s4'));
    r.hostileText = !!q('s5', '[data-unavailable]') && !q('s5', 'b') && /<b>x<\/b>/.test(txt('s5'));
    const g1 = q('r1', '.c-fbubble--gone');
    r.recvPhotoGone = !!g1 && g1.tagName === 'DIV' && /Photo deleted from this device/.test(txt('r1')) && !q('r1', '.c-mbubble') && !q('r1', 'button')
      && !!q('r1', '.c-fbubble__gone') && !/IMG_r1/.test(txt('r1'));
    r.recvFileGone = !!q('r2', '.c-fbubble--gone') && /File deleted from this device/.test(txt('r2')) && !q('r2', 'button');
    r.offerUntouched = !q('r3', '.c-fbubble--gone') && !/deleted/.test(txt('r3')) && /(Tap|Click) to download/.test(txt('r3'));
    /* the italic grey ground: the gone line's own rule (built CSS) */
    r.italicCss = [...s.d.styleSheets].some((sh) => [...(sh.cssRules || [])].some((x) => x.selectorText === '.c-fbubble__gone' && x.style.getPropertyValue('font-style') === 'italic'));
    /* a click on either sends nothing — no openfile, no viewer */
    s.sent.length = 0;
    c1.click(); g1.click(); q('r2', '.c-fbubble--gone').click();
    await sleep(600);
    r.clickSendsNothing = s.sent.length === 0 && !s.d.querySelector('.c-mviewer');
    /* control: a card whose file IS here still opens (the same click path) */
    q('s6', '.c-fbubble').click();
    await sleep(60);
    r.controlOpens = s.sent.some((c) => /^ixian:openfile:fs6$/.test(c));
    ok(Object.values(r).every(Boolean) && noErr(s.errs),
      '#1190 shell: addFile arg 16 "0" on a complete row → mine = the compact card "Not available on this device" (no photo square, no Open, a click sends nothing), received = the italic "Photo / File deleted from this device" bubble (no tap); "" / no arg / "1" → today\'s photo tile; an offer unchanged — '
      + JSON.stringify(r) + ' ' + s.errs.join('|').slice(0, 300));
    s.dom.window.close();
  });

  /* ———— #1190 shell live delete (#1173 (3)): the open chat holds a preview; C#'s re-push with "0" (ContactDetails
     sharedDeleteLocal → insertMessage) turns it into the deleted bubble AND forgets the preview — a later "1" (never
     expected) would draw the tile WITHOUT the old picture; the viewer never opens ———— */
  await guard('#1190 shell live delete', async () => {
    const s = await open();
    s.push(...fileArgs('d1', 'IMG_d1.jpg', 0, false, true, ['', '1']));
    s.push('setFileThumb', 'd1', JPEG);
    await done(s);
    const q = (sel) => { const r = rowOf(s, 'd1'); return r ? r.querySelector(sel) : null; };
    const r = {};
    r.beforePicture = !!q('.c-mbubble[data-file]') && !!q('img') && (q('img').getAttribute('src') || '') === JPEG;
    s.push(...fileArgs('d1', 'IMG_d1.jpg', 0, false, true, ['', '0']));
    await s.frame(); await sleep(80);
    r.afterGone = !!q('.c-fbubble--gone') && !q('.c-mbubble') && /Photo deleted from this device/.test(rowOf(s, 'd1').textContent);
    s.sent.length = 0;
    q('.c-fbubble--gone').click();
    await sleep(80);
    r.noViewer = s.sent.length === 0 && !s.d.querySelector('.c-mviewer');
    s.push(...fileArgs('d1', 'IMG_d1.jpg', 0, false, true, ['', '1']));
    await s.frame(); await sleep(80);
    r.previewForgotten = !!q('.c-mbubble[data-file]') && !(q('img') && (q('img').getAttribute('src') || '') === JPEG);
    ok(Object.values(r).every(Boolean) && noErr(s.errs),
      '#1190 shell: a received photo deleted while its chat is open — the "0" re-push draws the deleted bubble, drops the held preview (never redrawn) and the viewer never opens — '
      + JSON.stringify(r) + ' ' + s.errs.join('|').slice(0, 300));
    s.dom.window.close();
  });

  /* ———— #1190 (#46 r4 T2 / T3 / T5): the not-available card SAYS so to a screen reader and keeps my sent tick (+ its aria
     suffix); the deleted bubble stays a c-fbubble (the message menu's target) and its long press opens the menu ———— */
  await guard('#1190 shell a11y + menu', async () => {
    const s = await open();
    s.push(...fileArgs('u1', 'IMG_u1.jpg', 0, true, true, ['', '0']));    // mine, not on this device (delivered: confirmed True, relay True)
    s.push(...fileArgs('g1', 'IMG_g1.jpg', 5, false, true, ['', '0']));   // received, deleted from this device
    await done(s);
    const W = s.W, d = s.d;
    const r = {};
    const c = rowOf(s, 'u1') && rowOf(s, 'u1').querySelector('.c-fbubble');
    const name = c ? c.getAttribute('aria-label') || '' : '';
    r.nameSaysUnavailable = /Not available on this device/.test(name);                                      // T2
    const tick = c && c.querySelector('.c-fbubble__stamp .c-status-icon');
    const tl = tick ? tick.getAttribute('aria-label') || '' : '';
    r.tickKept = !!tick && tick.dataset.tone === 'delivered' && !!tl;                                        // T5
    r.ariaSuffix = !!tl && name === c.dataset.ariaBase + ', ' + tl;                                             // T5
    const g = rowOf(s, 'g1') && rowOf(s, 'g1').querySelector('.c-fbubble--gone');
    r.goneIsFbubble = !!g && g.classList.contains('c-fbubble');                                                 // T3
    const pev = (type) => {
      const init = { bubbles: true, cancelable: true, clientX: 5, clientY: 5, button: 2, pointerType: 'mouse', pointerId: 1 };
      const e = typeof W.PointerEvent === 'function' ? new W.PointerEvent(type, init) : new W.MouseEvent(type, init);
      if (e.pointerType !== 'mouse') Object.defineProperty(e, 'pointerType', { value: 'mouse' });
      return e;
    };
    const before = d.querySelectorAll('.c-msgmenu').length;
    if (g) { g.dispatchEvent(pev('pointerdown')); g.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }
    await sleep(80);
    r.menuOpens = d.querySelectorAll('.c-msgmenu').length === before + 1;                                     // T3
    r.menuOnBubble = !!g && g.dataset.menuTarget !== undefined;   // T3: the menu's target (tint) IS the deleted bubble, not the bare row
    ok(Object.values(r).every(Boolean) && noErr(s.errs),
      '#1190 (#46 r4 T2/T3/T5) shell: my not-available card\'s accessible name contains "Not available on this device" and keeps the sent tick (delivered) with its aria suffix; the received deleted bubble keeps class c-fbubble and a mouse right click (pointerdown + contextmenu) opens the message menu ON it (its menu target) — '
      + JSON.stringify(r) + ' name=' + JSON.stringify(name) + ' ' + s.errs.join('|').slice(0, 300));
    s.dom.window.close();
  });

  /* ———— #1190 (#46 r4 C1): chat info "Delete from this device" — the re-push DROPS the tile; focus lands on the tile now
     at its place (not <body>) ———— */
  await guard('#1190 shell chat-info delete focus', async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/contact_details.html');
    const errs = [];
    const sentCd = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((x) => x.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:shared/.test(c)) sentCd.push(c); } });
      },
    });
    await sleep(1500);
    const W = dom.window, d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => b64(x)));
    const T = Math.floor(Date.now() / 1000);
    const item = (i) => ['cd' + i, 0, 'media', 'IMG_' + i + '.jpg', 1000, T - i * 10, 1, JPEG, 1];
    push('setContext', 'chat'); push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); push('setNickname', 'Ana');
    await sleep(300);
    push('setSharedItems', JSON.stringify([item(0), item(1), item(2)]));
    await sleep(400);
    const r = {};
    const tiles = () => Array.from(d.querySelectorAll('.c-shared__panel .c-shared__tile'));
    r.three = tiles().length === 3;
    const t1 = tiles()[1];
    t1.focus();
    const pe = (type) => { const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 2, clientX: 5, clientY: 5 }); Object.defineProperty(e, 'pointerType', { value: 'mouse' }); return e; };
    t1.dispatchEvent(pe('pointerdown'));
    t1.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(350);
    const del = d.querySelector('.c-msgmenu__item[data-action="delete"]');
    r.menuDelete = !!del;
    if (del) del.click();
    await sleep(450);
    const confirm = Array.from(d.querySelectorAll('.c-modal button')).find((b) => /^Delete$/.test((b.textContent || '').trim()));
    r.confirm = !!confirm;
    if (confirm) confirm.click();
    await sleep(450);
    r.sent = sentCd.some((c) => /^ixian:sharedDeleteLocal:cd1:0$/.test(c));
    push('setSharedItems', JSON.stringify([item(0), item(2)]));   // C#'s rescan: the deleted received file is dropped
    await sleep(500);
    const now = tiles();
    r.dropped = now.length === 2;
    r.focusNotBody = d.activeElement !== d.body && !!d.activeElement && d.activeElement.isConnected;
    r.focusOnNextTile = d.activeElement === now[1];
    ok(Object.values(r).every(Boolean) && noErr(errs),
      '#1190 (#46 r4 C1) shell: chat info "Delete from this device" (long press → Delete → confirm) — the re-push drops the tile and focus lands on the tile now at its place, not <body> — '
      + JSON.stringify(r) + ' active=' + (d.activeElement ? d.activeElement.className || d.activeElement.tagName : 'null') + ' ' + errs.join('|').slice(0, 300));
    dom.window.close();
  });

  /* ———— #1190 C#: addFile carries fLocal LAST (arg 16) from SharedItems.localArgOf; the dev line logs the case word only ———— */
  await guard('#1190 C# addFile', async () => {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const last = /string fLocal\s*=\s*SharedItems\.localArgOf\(message,\s*out string fCase\);/.test(sc)
      && /push\(batch,\s*"addFile",[^;]*fSent\.ToString\(\),\s*fTransfer,\s*fLocal\);/.test(sc);
    const devLine = /if\s*\(message\.localSender\s*&&\s*SharedItems\.isImageName\(name\)\)\s*\{\s*P1Perf\.line\("filelocal sent-image "\s*\+\s*fCase\);\s*\}/.test(sc);
    const si = stripCode(rd('Spixi/Utils/SharedItems.cs'));
    const fn = si.slice(si.indexOf('public static string localArgOf('), si.indexOf('public static string localArgOf(') + 1200);
    const helper = /pathCase\s*=\s*FileRowRules\.localPathCase\(fm\.filePath,\s*localPathOf\(fm\)\s*!=\s*null,\s*cacheDirOnce\.Value\);\s*return FileRowRules\.localArg\(fm\.localSender,\s*fm\.completed,\s*pathCase\);/.test(fn)
      && /catch\s*\(Exception\)\s*\{\s*return "";/.test(fn);
    const csh = /Spixi\/Utils\/FileRowRules\.cs/.test(rd('scripts/csh/csh.csproj')) && /local_arg_and_deleted_received/.test(rd('scripts/csh/FileRowRulesTests.cs'))
      && /local_path_case_words/.test(rd('scripts/csh/FileRowRulesTests.cs'));
    ok(last && devLine && helper && csh,
      '#1190 C#: addFile arg 16 = SharedItems.localArgOf (FileRowRules, csh-executed; a throw = ""); the dev [P1] filelocal line carries the case word only — '
      + JSON.stringify({ last, devLine, helper, csh }));
  });

  /* ———— #1190 (#46 r4 m1) C#: localArgOf runs per file row on the UI thread — the cache dir is read ONCE (a static
     Lazy), and a row that is not complete (an offer / in flight) returns "" BEFORE any disk check ———— */
  await guard('#1190 C# localArgOf cost', async () => {
    const si = stripCode(rd('Spixi/Utils/SharedItems.cs'));
    const fn = si.slice(si.indexOf('public static string localArgOf('), si.indexOf('public static string localArgOf(') + 1200);
    const lazyOnce = /private static readonly Lazy<string\?> cacheDirOnce = new Lazy<string\?>\(\(\) =>\s*\{\s*try \{ return Microsoft\.Maui\.Storage\.FileSystem\.CacheDirectory; \} catch \(Exception\) \{ return null; \}\s*\}\);/.test(si)
      && (si.match(/FileSystem\.CacheDirectory/g) || []).length === 1;
    const iNot = fn.search(/if \(!fm\.completed\)\s*\{\s*pathCase = FileRowRules\.CasePending;\s*return "";\s*\}/);
    const iDisk = fn.indexOf('localPathOf(fm)');
    const earlyReturn = iNot > 0 && iDisk > iNot;
    const fr = stripCode(rd('Spixi/Utils/FileRowRules.cs'));
    const rule = /public static string localArg\(bool localSender, bool completed, string pathCase\)\s*\{\s*if \(!completed\)\s*\{\s*return "";\s*\}/.test(fr)
      && /public const string CasePending = "pending";/.test(fr);
    const t = rd('scripts/csh/FileRowRulesTests.cs');
    const csh = /Assert\.AreEqual\("", FileRowRules\.localArg\(true, false, "exists"\)/.test(t) && /Assert\.AreEqual\("", FileRowRules\.localArg\(true, false, "missing"\)/.test(t);
    ok(lazyOnce && earlyReturn && rule && csh,
      '#1190 (#46 r4 m1) C#: SharedItems.localArgOf reads FileSystem.CacheDirectory ONCE (a static Lazy) and returns "" for a row that is not complete BEFORE localPathOf touches the disk; FileRowRules.localArg agrees ("" for any not-complete row, csh-executed) — '
      + JSON.stringify({ lazyOnce, earlyReturn, rule, csh }));
  });

  /* ———— #1190 C#: chat info drops a deleted received file; the delete re-pushes the open chat's row ———— */
  await guard('#1190 C# chat info + re-push', async () => {
    const si = stripCode(rd('Spixi/Utils/SharedItems.cs'));
    const scan = si.slice(si.indexOf('string? local = localPathOf(fm);'), si.indexOf('string? local = localPathOf(fm);') + 600);
    const drop = /if\s*\(local\s*==\s*null\s*&&\s*!fm\.localSender\s*&&\s*fm\.completed\s*&&\s*FileRowRules\.isDeletedReceived\(fm\.localSender,\s*fm\.completed,\s*localArgOf\(fm,\s*out _\)\)\)\s*\{\s*continue;\s*\}\s*all\.Add\(new SharedItem/.test(scan);
    const cd = stripCode(rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
    const del = cd.slice(cd.indexOf('ixian:sharedDeleteLocal:", StringComparison'), cd.indexOf('ixian:sharedShowInDownloads:", StringComparison'));
    const repush = /if\s*\(!SharedItems\.deleteLocal\(item\)\)\s*\{[^}]*\}\s*else\s*\{\s*deleted\s*=\s*true;\s*\}/.test(del)
      && /MainThread\.BeginInvokeOnMainThread\(\(\)\s*=>\s*\{\s*if\s*\(deleted\s*&&\s*item\.message\s*!=\s*null\)\s*\{\s*try\s*\{\s*Utils\.getChatPage\(scanned\)\?\.refreshFileRow\(item\.message,\s*item\.channel\);/.test(del)
      && !/insertMessage/.test(del);
    const noPathLog = !/Logging\.\w+\([^;]*(item\.path|\.filePath|item\.label)/.test(del);
    ok(drop && repush && noPathLog,
      '#1190 C#: SharedItems.scan drops a received + downloaded file no longer on this device (isDeletedReceived); sharedDeleteLocal re-pushes the open chat\'s row via refreshFileRow on the main thread; no path / name in a log — '
      + JSON.stringify({ drop, repush, noPathLog }));
  });

  /* ———— #1190 (#46 r4 M1) C#: the re-push reaches ONLY a row the open chat already holds, and runs no read-status side
     effect — SingleChatPage.fileRowsShown (filled by the file branch's push, reset by a full load, an id dropped by a
     delete) gates refreshFileRow, which returns right after the addFile push ———— */
  await guard('#1190 C# re-push only a held row', async () => {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const r = {};
    r.set = /private readonly HashSet<string> fileRowsShown = new HashSet<string>\(StringComparer\.Ordinal\);/.test(sc);
    r.recorded = /push\(batch,\s*"addFile",[^;]*fTransfer,\s*fLocal\);\s*noteThumbCandidate\(message, name, batch\);\s*lock \(fileRowsShown\)\s*\{\s*fileRowsShown\.Add\(Crypto\.hashToString\(message\.id\)\);\s*\}\s*if \(fileRowOnly\)\s*\{\s*return;\s*\}/.test(sc);
    const ldAt = sc.indexOf('public void loadMessages()');
    const ld = sc.slice(ldAt, sc.indexOf('lastLoadPushed = 0;', ldAt));
    r.resetOnFullLoad = /if \(!prepend\)\s*\{\s*lock \(fileRowsShown\)\s*\{\s*fileRowsShown\.Clear\(\);\s*\}\s*\}\s*$/.test(ld.trimEnd() + '\n')
      && (ld.match(/fileRowsShown\.Clear\(\)/g) || []).length === 2;   // + the empty-history path
    r.dropOnDelete = /lock \(fileRowsShown\)\s*\{\s*fileRowsShown\.Remove\(Crypto\.hashToString\(msg_id\)\);\s*\}\s*Utils\.sendUiCommand\(this, "deleteMessage"/.test(sc);
    r.gate = /public bool refreshFileRow\(FriendMessage\? message, int channel\)\s*\{\s*if \(message == null \|\| message\.type != FriendMessageType\.fileHeader \|\| !hasLoadedFileRow\(message\.id, channel\)\)\s*\{\s*return false;\s*\}\s*fileRowOnlyPass = true;\s*try\s*\{\s*insertMessage\(message, channel, null\);\s*\}\s*finally\s*\{\s*fileRowOnlyPass = false;\s*\}\s*return true;\s*\}/.test(sc)
      && /\[ThreadStatic\] private static bool fileRowOnlyPass;/.test(sc);
    r.held = /public bool hasLoadedFileRow\(byte\[\]\? id, int channel\)\s*\{\s*if \(id == null \|\| channel != selectedChannel\)\s*\{\s*return false;\s*\}\s*lock \(fileRowsShown\)\s*\{\s*return fileRowsShown\.Contains\(Crypto\.hashToString\(id\)\);/.test(sc);
    r.fileOnly = /private void insertMessage\(FriendMessage message, int channel, UiBatch\? batch\)\s*\{\s*if\(channel != selectedChannel\)\s*\{\s*return;\s*\}\s*bool fileRowOnly = fileRowOnlyPass;\s*if \(fileRowOnly && message\.type != FriendMessageType\.fileHeader\)\s*\{\s*return;\s*\}/.test(sc);
    /* the only path from a fileRowOnly call to updateMessageReadStatus would pass the early return above */
    const body = sc.slice(sc.indexOf('private void insertMessage(FriendMessage message, int channel, UiBatch? batch)'));
    const fileBranch = body.slice(body.indexOf('if (message.type == FriendMessageType.fileHeader)'), body.indexOf('if (message.type == FriendMessageType.appSession)'));
    r.noReadInFileBranch = fileBranch.length > 0 && !/updateMessageReadStatus/.test(fileBranch);
    r.publicLiveKept = /public void insertMessage\(FriendMessage message, int channel\)\s*\{\s*insertMessage\(message, channel, null\);/.test(sc);
    ok(Object.values(r).every(Boolean),
      '#1190 (#46 r4 M1) C#: the chat-info delete re-push goes through SingleChatPage.refreshFileRow — only for a file row THIS document holds (fileRowsShown: added at the addFile push, cleared by a full load, an id dropped by deleteMessage; another channel / outside the window → nothing), and the row\'s push only (no updateMessageReadStatus; a ThreadStatic flag, the private signature kept) — '
      + JSON.stringify(r));
  });
}
