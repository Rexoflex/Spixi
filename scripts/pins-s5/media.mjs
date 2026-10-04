/* ==== SESSION 5b — #1166 MEDIA (contract §2 MEDIA row · §3.1 chat half · §3.2 chat half · §3.7) ====
 * Behaviour on the BUILT chat shell (jsdom, executeUiCommand pushes) wherever the behaviour is in a shell; the C# guards
 * on stripCode source (nothing executes C# here). One ok() per item; every key named in the hand-back's break list.
 *   V-3   the viewer, chat half: a photo tile showing its preview → openMediaViewer({ token }) + ixian:viewImage:<id>;
 *         viewerImage(token, uri) → setSrc / setFailed + the viewerFailed toast; cards / offers / no-preview tiles → openfile
 *   P-04  setAvatarFor(address, uri) once per address — rows reference the picture by address; a later push repaints
 *   R3-N2 a preview landing in a re-flush's clear → add gap is held for its row (not dropped while C# counts it sent)
 *   R3-N3 a re-flush mid-transfer keeps the live ring (no 0 %, no offer again, no Cancel again)
 *   NIT-1 card and tile name a file by ONE rule (typed-bubbles fileNameAria), the live tick path too
 *   PILL  the composer pill reads the received-bubble token (dark = ink-750)
 *   C#    viewImage guards · A-N4 the transfer's channel · P-04 avatarForRow */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const BIG = JPEG.replace('/9j/', '/9j/AAAA');          // a different, valid-alphabet JPEG data: URI (the viewer's "bigger picture")
  const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const PNG2 = PNG1.replace('iVBOR', 'iVBORAAAA');

  /* boot the BUILT chat shell; every bridge.send is captured (window.Spixi.createNativeBridge gets an emit sink) */
  const boot = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const toasts = [];   // every showToast text the shell asks for (the toast host queues them one at a time)
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        let real;
        Object.defineProperty(w, 'Spixi', {
          configurable: true,
          get() { return real; },
          set(v) {
            const mk = v && v.createNativeBridge;
            if (mk) v.createNativeBridge = (o) => mk(Object.assign({}, o || {}, { emit: (c) => sent.push(c) }));
            const st = v && v.showToast;
            if (st) v.showToast = (o) => { toasts.push(String((o && o.text) || '')); return st(o); };
            real = v;
          },
        });
      },
    });
    await sleep(1800);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    const raw = (fn, ...a) => W.executeUiCommand(W[fn], ...a);   // a data: URI rides raw (the native fast path)
    return { dom, W, d: W.document, push, raw, sent, toasts, errs };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const tileOf = (d, id) => { const r = rowOf(d, id); return r ? r.querySelector('.c-mbubble[data-file]') : null; };
  const cardOf = (d, id) => { const r = rowOf(d, id); return r ? r.querySelector('.c-fbubble') : null; };
  const settle = async (d, W) => {   // a local data: picture has no network: say it loaded (jsdom does not decode images)
    for (const img of d.querySelectorAll('#messages .c-mbubble__img[src]')) img.dispatchEvent(new W.Event('load'));
    await sleep(80);
  };
  const viewer = (d) => [...d.querySelectorAll('.c-mviewer')].pop() || null;   // the newest (a dismissed one may still fade out)
  const verbs = (list) => list.filter((c) => /^ixian:(viewImage|openfile|acceptfile):/.test(c));

  /* ———————————— V-3: the viewer, chat half ———————————— */
  {
    const { dom, W, d, push, raw, sent, toasts, errs } = await boot();
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'aa01', 'addrPeer', 'Bob', '', 'fid1', 'IMG_1.jpg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'aa02', 'addrPeer', 'Bob', '', 'fid2', 'report.pdf', String(T0 + 10), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'aa03', 'addrPeer', 'Bob', '', 'fid3', 'IMG_3.jpg', String(T0 + 20), 'False', 'True', 'True', '100', 'True', 'False', 'True');   // complete, NO preview
    push('addFile', 'aa04', 'addrPeer', 'Bob', '', 'fid4', '<img src=x onerror=alert(1)>.png', String(T0 + 30), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    raw('setFileThumb', b64('aa01'), JPEG);
    raw('setFileThumb', b64('aa04'), JPEG);
    await sleep(100);
    await settle(d, W);
    const r = {};
    const s0 = sent.length;
    (tileOf(d, 'aa01') || d.createElement('i')).click();
    await sleep(50);
    const v1 = viewer(d);
    const vImg = v1 && v1.querySelector('.c-mviewer__img');
    r.tapOpensViewer = !!v1 && !!vImg && vImg.getAttribute('src') === JPEG;   // the preview at once
    r.tapSendsViewImage = verbs(sent.slice(s0)).join('|') === 'ixian:viewImage:aa01';  // the id only — never openfile
    r.caption = !!v1 && !!v1.querySelector('.c-mviewer__caption') && v1.querySelector('.c-mviewer__caption').textContent === 'IMG_1.jpg';
    /* C#'s answer for ANOTHER token changes nothing; the right token swaps in the bigger picture */
    raw('viewerImage', b64('aa99'), BIG);
    r.otherTokenIgnored = !!vImg && vImg.getAttribute('src') === JPEG;
    raw('viewerImage', b64('aa01'), BIG);
    r.setSrc = !!vImg && vImg.getAttribute('src') === BIG;
    /* a failure: the viewer keeps the preview and a toast says so */
    W.Spixi.dismissTopOverlay && W.Spixi.dismissTopOverlay();
    await sleep(650);   // past the tile's 500 ms re-entry guard
    (tileOf(d, 'aa01') || d.createElement('i')).click();
    await sleep(50);
    const v2 = viewer(d);
    const v2Img = v2 && v2.querySelector('.c-mviewer__img');
    push('viewerImage', 'aa01', '');
    await sleep(50);
    const failText = (W.SL && W.SL.viewerFailed) || 'This image could not be opened.';
    const said = () => toasts.filter((t) => t === failText).length;
    r.failToast = said() === 1 && !!v2Img && v2Img.getAttribute('src') === JPEG;
    /* a value that is not a base64 JPEG data: URI is a failure too — never an <img src> */
    W.Spixi.dismissTopOverlay && W.Spixi.dismissTopOverlay();
    await sleep(650);   // past the tile's 500 ms re-entry guard
    (tileOf(d, 'aa01') || d.createElement('i')).click();
    await sleep(50);
    const v3Img = viewer(d) && viewer(d).querySelector('.c-mviewer__img');
    raw('viewerImage', b64('aa01'), PNG1);
    await sleep(50);
    r.nonJpegRefused = !!v3Img && v3Img.getAttribute('src') === JPEG && said() === 2;
    W.Spixi.dismissTopOverlay && W.Spixi.dismissTopOverlay();
    await sleep(650);   // past the tile's 500 ms re-entry guard
    /* every other file keeps ixian:openfile — a card (PDF) and a photo tile with no preview */
    const s1 = sent.length;
    const nV = d.querySelectorAll('.c-mviewer').length;
    (cardOf(d, 'aa02') || d.createElement('i')).click();
    await sleep(30);
    (tileOf(d, 'aa03') || d.createElement('i')).click();
    await sleep(30);
    r.othersOpenFile = verbs(sent.slice(s1)).join('|') === 'ixian:openfile:fid2|ixian:openfile:fid3' && d.querySelectorAll('.c-mviewer').length === nV;
    /* the caption is text, never markup */
    (tileOf(d, 'aa04') || d.createElement('i')).click();
    await sleep(50);
    const v4 = viewer(d);
    r.captionIsText = !!v4 && v4.querySelector('.c-mviewer__caption').textContent === '<img src=x onerror=alert(1)>.png' && !v4.querySelector('.c-mviewer__bar img');
    r.noErrors = noErr(errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 V-3 (chat half) EXECUTED on the BUILT chat shell: a tap on a photo tile showing its preview opens the viewer ON that preview (caption = the file name as text) and sends ixian:viewImage:<id> only; viewerImage(<that id>, jpeg) swaps the picture, another token changes nothing, "" or a non-JPEG keeps the preview + the viewerFailed toast; a card and a tile with no preview keep ixian:openfile — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  }

  /* ———————————— P-04: a sender's avatar once per document, rows reference it by address ———————————— */
  {
    const { dom, W, d, push, raw, errs } = await boot();
    push('onChatScreenReady', 'groupAddr');
    push('setChatMode', '1', '0', '', 'False');
    push('clearMessages', 'false');
    raw('setAvatarFor', b64('addrA'), PNG1);            // C# sends it BEFORE the rows that use it
    push('addThem', 'p1', 'addrA', 'Ann', '', 'hi', String(T0));
    push('addThem', 'p2', 'addrA', 'Ann', '', 'there', String(T0 + 100));
    push('addThem', 'p3', 'addrB', 'Ben', '', 'yo', String(T0 + 200));
    push('addThem', 'p4', 'addrC', 'Cy', PNG1, 'old exe', String(T0 + 300));   // an OLDER exe: the picture on the row still shows
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const avOf = (id) => { const r0 = rowOf(d, id); const i = r0 && r0.querySelector('.c-avatar__img'); return i ? i.getAttribute('src') : null; };
    const anyAv = (id) => { const r0 = rowOf(d, id); return !!(r0 && r0.querySelector('.c-avatar')); };
    const r = {};
    /* a group run shows the avatar on its FIRST row: p1 for addrA (rows carry "" — the picture is the address's) */
    r.byAddress = avOf('p1') === PNG1;
    r.otherSenderInitials = anyAv('p3') && avOf('p3') === null;
    r.olderExeRowArg = avOf('p4') === PNG1;
    /* a CHANGED picture repaints the rows already drawn */
    raw('setAvatarFor', b64('addrA'), PNG2);
    await sleep(100);
    r.repaint = avOf('p1') === PNG2;
    /* only a base64 data: image is kept — anything else drops the entry (initials) */
    push('setAvatarFor', 'addrA', 'file:///etc/passwd');
    await sleep(100);
    r.refusesNonData = avOf('p1') === null;
    raw('setAvatarFor', b64('addrB'), 'data:image/svg+xml;base64,PHN2Zy8+');
    await sleep(100);
    r.refusesSvg = avOf('p3') === null;
    /* the map survives a re-flush (C# sends each address once per DOCUMENT) */
    raw('setAvatarFor', b64('addrA'), PNG1);
    push('clearMessages', 'false');
    push('addThem', 'p1', 'addrA', 'Ann', '', 'hi', String(T0));
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    r.survivesReflush = avOf('p1') === PNG1;
    /* …and is reset per peer (onChatScreenReady — C# resets its set in the same onLoad) */
    push('onChatScreenReady', 'groupAddr2');
    push('clearMessages', 'false');
    push('addThem', 'q1', 'addrA', 'Ann', '', 'hi', String(T0));
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    r.resetPerPeer = avOf('q1') === null;
    r.noErrors = noErr(errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 P-04 (chat half) EXECUTED on the BUILT chat shell: setAvatarFor(address, uri) gives every row of that address its picture (rows carry ""), another sender keeps the initials, an older exe\'s per-row picture still shows, a changed picture repaints the drawn rows, a non-data / SVG value drops the entry, the map survives a re-flush and is reset per peer — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  }
  {
    /* P-04 C#: the row's avatar goes through avatarForRow — a data: URI is pushed ONCE per address per document
       (setAvatarFor, before the row) and the row carries ""; a 1:1 row carries "" (the header avatar is that picture) */
    const cs = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const ins = cs.slice(cs.indexOf('private void insertMessage(FriendMessage message, int channel, UiBatch? batch)'));
    const afr = cs.slice(cs.indexOf('private string avatarForRow('), cs.indexOf('private void insertMessage(FriendMessage message, int channel, UiBatch? batch)'));
    const onLoad = cs.slice(cs.indexOf('private void onLoad()'), cs.indexOf('private void onLoad()') + 4000);
    const r = {
      routed: /avatar = Utils\.imageToDataUri\(avatar\);\s*avatar = avatarForRow\(avatar, resolvedSender\);/.test(ins),
      onlyData: /if \(string\.IsNullOrEmpty\(avatar\) \|\| !avatar\.StartsWith\("data:", StringComparison\.Ordinal\)\)\s*\{\s*return avatar;/.test(afr),
      oneToOne: /if \(!\(friend\.bot \|\| friend\.type == FriendType\.Group\) \|\| sender == null\)\s*\{\s*return "";/.test(afr),
      oncePerChange: /avatarSent\.TryGetValue\(address, out string\? sent\) && sent == mark\)\s*\{\s*return "";\s*\}\s*avatarSent\[address\] = mark;/.test(afr),
      pushThenEmpty: /Utils\.sendUiCommand\(this, "setAvatarFor", address, avatar\);\s*return "";\s*\}$/.test(afr.trim()),
      resetPerDoc: /lock \(avatarSent\)\s*\{\s*avatarSent\.Clear\(\);/.test(onLoad),
      noLog: !/Logging\./.test(afr),
    };
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 P-04 (C#): insertMessage routes the row avatar through avatarForRow — only a data: URI, pushed as setAvatarFor ONCE per address per document (again only when it changed), the row then carries ""; a 1:1 row carries "" (the header avatar); the set resets in onLoad; no log line — ' + JSON.stringify(r));
  }

  /* ———————————— R3-N2: a preview in the re-flush gap is held for its row ———————————— */
  {
    const { dom, W, d, push, raw, errs } = await boot();
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    /* before any clearMessages: an unknown id is ignored, as always */
    raw('setFileThumb', b64('nn01'), JPEG);
    push('clearMessages', 'false');
    push('addFile', 'bb01', 'addrPeer', 'Bob', '', 'fb1', 'IMG_B.jpg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'nn01', 'addrPeer', 'Bob', '', 'fn1', 'IMG_N.jpg', String(T0 + 5), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const srcOf = (id) => { const t = tileOf(d, id); const i = t && t.querySelector('.c-mbubble__img'); return i ? (i.getAttribute('src') || '') : null; };
    const r = {};
    r.unknownOutsideIgnored = srcOf('nn01') === '';
    /* the OFF → ON re-flush: clearMessages, the preview lands, THEN the rows (the batch transport) */
    push('clearMessages', 'false');
    raw('setFileThumb', b64('bb01'), JPEG);
    push('addMessages', JSON.stringify({ strs: [], items: [{ f: 'addFile', a: ['bb01', 'addrPeer', 'Bob', '', 'fb1', 'IMG_B.jpg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True'] }] }), 'append');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    r.heldForRow = srcOf('bb01') === JPEG;
    /* the burst is over: an unknown id is refused again, never parked (the A5 rule) */
    raw('setFileThumb', b64('zz01'), JPEG);
    push('addFile', 'zz01', 'addrPeer', 'Bob', '', 'fz1', 'IMG_Z.jpg', String(T0 + 40), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    await sleep(100);
    r.refusedAfterBurst = srcOf('zz01') === '';
    /* a held value is claimed only while previews are ON — the switch turned OFF in the gap drops it (ON again later
       shows no stale picture: C# re-sends on its own ON re-flush) */
    push('clearMessages', 'false');
    raw('setFileThumb', b64('cc01'), JPEG);
    push('setPhotoPreviews', 'False');
    push('addFile', 'cc01', 'addrPeer', 'Bob', '', 'fc1', 'IMG_C.jpg', String(T0 + 9), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'bb01', 'addrPeer', 'Bob', '', 'fb1', 'IMG_B.jpg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    push('setPhotoPreviews', 'True');
    await sleep(200);
    r.offNotKept = !!tileOf(d, 'cc01') && srcOf('cc01') === '';
    r.noErrors = noErr(errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 R3-N2 EXECUTED on the BUILT chat shell: a preview C# pushes between a re-flush\'s clearMessages and its rows is HELD and lands on the row when it arrives (C# counts it sent once per document); outside a re-flush an unknown id stays ignored; a held value only ever goes to an image-file row — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  }

  /* ———————————— R3-N3: a re-flush mid-transfer keeps the live ring ———————————— */
  {
    const { dom, W, d, push, errs } = await boot();
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    /* previews OFF: file CARDS (the same rule drives the tile) */
    const load = (rcvComplete, sentComplete) => {
      push('clearMessages', 'false');
      push('addFile', 'dd01', 'addrPeer', 'Bob', '', 'fd1', 'big.zip', String(T0), 'False', 'True', 'True', rcvComplete ? '100' : '0', rcvComplete ? 'True' : 'False', 'False', 'True');
      push('addFile', 'ee01', '', '', '', 'fe1', 'mine.zip', String(T0 + 10), 'True', 'True', 'False', sentComplete ? '100' : '0', sentComplete ? 'True' : 'False', 'False', 'True');
      if (typeof W.messagesDone === 'function') push('messagesDone');
      push('onChatScreenLoaded');
    };
    load(false, false);
    await sleep(300);
    const st = (id) => { const c = cardOf(d, id); return c ? c.dataset.state : null; };
    const pct = (id) => { const c = cardOf(d, id); const t = c && c.querySelector('.c-fbubble__track'); return t ? t.getAttribute('aria-valuenow') : null; };
    const cancelOf = (id) => { const r0 = rowOf(d, id); return !!(r0 && r0.querySelector('.c-fbubble__cancel')); };
    const r = {};
    r.before = st('dd01') === 'offer' && st('ee01') === 'progress' && cancelOf('ee01');
    push('updateFile', 'fd1', '37', 'False');   // the user accepted, the download runs
    push('updateFile', 'fe1', '0', 'False');    // the peer accepted my file: the FIRST packet tick is 0 % (big files floor at 0)
    await sleep(100);
    r.live = st('dd01') === 'progress' && pct('dd01') === '37' && pct('ee01') === '0' && !cancelOf('ee01');
    load(false, false);                         // a re-flush (C# knows only 0 / 100)
    await sleep(300);
    r.keptReceived = st('dd01') === 'progress' && pct('dd01') === '37';
    r.keptSent = st('ee01') === 'progress' && pct('ee01') === '0' && !cancelOf('ee01');   // started: Cancel stays gone at 0 %
    /* the live ring is never LOWERED, but a higher value from C# would win; the final tick forgets the transfer */
    push('updateFile', 'fd1', '100', 'True');
    await sleep(50);
    load(true, false);
    await sleep(300);
    r.finalWins = st('dd01') === 'complete';
    r.noErrors = noErr(errs);
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 R3-N3 EXECUTED on the BUILT chat shell: a re-flush while a transfer runs keeps the live progress — a download stays "downloading" at its % (not an offer again), my sending file keeps its % and never re-shows Cancel; a final state from C# wins — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  }

  /* ———————————— NIT-1: one naming rule for card, tile and the live tick ———————————— */
  {
    const { dom, W, d, errs } = await boot();
    const S = W.Spixi;
    const str = { 'status-sent': 'Sent', 'status-delivered': 'Delivered', 'status-sending': 'Sending' };
    const card = (state, status) => S.createFileBubble({ direction: 'sent', name: 'a.zip', state, status, timestamp: Date.now(), strings: str }).querySelector('.c-fbubble');
    const tile = (state, status) => S.createImageFileBubble({ direction: 'sent', name: 'a.jpg', state, status, timestamp: Date.now(), strings: str }).querySelector('.c-mbubble');
    const lbl = (el) => el.getAttribute('aria-label') || '';
    const base = (el) => el.dataset.ariaBase || '';
    const r = {};
    for (const [nm, mk] of [['card', card], ['tile', tile]]) {
      const a = mk('progress', 'sent'); const b = mk('progress', 'delivered'); const c = mk('complete', 'sent');
      r[nm + 'SendingPlain'] = lbl(a) === base(a) && S.fileNameAria(a) === lbl(a);
      r[nm + 'SendingDelivered'] = lbl(b) === base(b) + ', Delivered';
      r[nm + 'FinalTakesTick'] = lbl(c) === base(c) + ', Sent';
    }
    /* the live path (setMessageStatus → the one rule): a sending card takes "Delivered" at once, a plain change stays out */
    const rowC = S.createFileBubble({ direction: 'sent', name: 'b.zip', state: 'progress', status: 'sending', timestamp: Date.now(), strings: str });
    d.body.append(rowC);
    const cc = rowC.querySelector('.c-fbubble');
    S.setMessageStatus(rowC, 'sent', str);
    const livePlain = lbl(cc) === base(cc);
    S.setMessageStatus(rowC, 'delivered', str);
    r.live = livePlain && lbl(cc) === base(cc) + ', Delivered';
    const tb = rd('src/components/typed-bubbles.js');
    const mb = rd('src/components/message-bubble.js');
    r.oneRule = !/function fileTileAria/.test(tb) && /fb\.setAttribute\('aria-label', fileNameAria\(fb\)\);/.test(stripCode(mb))
      && (stripCode(tb).match(/data-file="progress"/g) || []).length === 1;
    r.noErrors = noErr(errs);
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 r5 NIT-1 EXECUTED (bundle): the file card and the photo tile take their accessible name from ONE helper (fileNameAria — the element\'s own state, base and tick): sending + a plain tick = the base alone, sending + delivered = base + tick, final = base + tick; the live tick path uses the same helper — ' + JSON.stringify(r));
    try { dom.window.close(); } catch (e) {}
  }

  /* ———————————— PILL: the composer pill follows the received bubble ———————————— */
  {
    const tk = rd('src/styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const darkAt = tk.indexOf('[data-theme="dark"] {');
    const light = tk.slice(0, darkAt);
    const dark = tk.slice(darkAt, tk.indexOf('}', darkAt));
    const val = (blk, name) => { const m = new RegExp('--' + name + ':\\s*([^;]+);').exec(blk); return m ? m[1].trim() : null; };
    /* resolve a token in a theme: the theme block first, then :root (the light block) */
    const resolve = (blk, name, n = 0) => {
      const v = val(blk, name) || val(light, name);
      const m = v && /^var\(--([\w-]+)\)$/.exec(v);
      return m && n < 8 ? resolve(blk, m[1], n + 1) : v;
    };
    const cc = stripCode(rd('src/styles/components/composer.css'));
    const field = cc.slice(cc.indexOf('.c-composer__field {'), cc.indexOf('}', cc.indexOf('.c-composer__field {')));
    const r = {
      lightRef: val(light, 'surface-composer-pill') === 'var(--surface-bubble-received)',
      darkRef: val(dark, 'surface-composer-pill') === 'var(--surface-bubble-received)',
      lightWhite: (resolve(light, 'surface-composer-pill') || '').toLowerCase() === '#ffffff',
      darkInk750: (resolve(dark, 'surface-composer-pill') || '').toUpperCase() === '#1E2023',
      consumes: /background: var\(--surface-composer-pill\);/.test(field),
    };
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 (#1159 / #1165 (11)): the composer pill reads the received-bubble token in BOTH themes (light = white, unchanged; dark = ink-750 #1E2023, was ink-800) and composer.css consumes the pill token — ' + JSON.stringify(r));
  }

  /* ———————————— C#: the viewImage guards ———————————— */
  {
    const cs = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const branch = cs.slice(cs.indexOf('current_url.StartsWith("ixian:viewImage:"'), cs.indexOf('current_url.StartsWith("ixian:chatreply:"'));
    const vi = cs.slice(cs.indexOf('private void onViewImage(string hexId)'), cs.indexOf('private void pushViewerImage('));
    const pv = cs.slice(cs.indexOf('private void pushViewerImage('), cs.indexOf('public void updateGroupChatNicks('));
    const hx = cs.slice(cs.indexOf('private static bool isHexMsgId('), cs.indexOf('private void onViewImage(string hexId)'));
    const run = vi.slice(vi.indexOf('Task.Run('));
    const beforeRun = vi.slice(0, vi.indexOf('Task.Run('));
    const r = {
      verb: /onViewImage\(current_url\.Substring\("ixian:viewImage:"\.Length\)\);/.test(branch),
      grammar: /if \(!isHexMsgId\(hexId\)\)\s*\{\s*return;/.test(vi) && /s\.Length > ViewImageIdMaxHex/.test(hx) && /\(c >= '0' && c <= '9'\) \|\| \(c >= 'a' && c <= 'f'\) \|\| \(c >= 'A' && c <= 'F'\)/.test(hx),
      /* the message is C#'s own lookup in the SHOWN channel; image-only; local-only by the chat preview's rule */
      ownLookup: /friend\.getMessage\(selectedChannel, Crypto\.stringToHash\(hexId\)\)/.test(vi),
      imageOnly: /fm\.type == FriendMessageType\.fileHeader && \(fm\.completed \|\| fm\.localSender\)\s*&& SharedItems\.parseFileHeader\(fm\.message, out string name, out _\) && SharedItems\.isImageName\(name\)/.test(vi),
      localOnly: /path = SharedItems\.localPathOf\(fm\);/.test(vi) && !/hexId[^;]*File|File[^;]*hexId|Path\.Combine/.test(vi),
      /* ★ #46 r1 A-M2 re-base: the decode only inside the Task (OFF the UI thread), AWAITED on ViewerImage's own gate (no
         blocking Wait, no per-page gate); LATEST TAP WINS — set per tap, checked by the decode and again before and at the push */
      offThread: !/dataUriOf/.test(beforeRun) && /Task\.Run\(async \(\) =>/.test(run)
        && /uri = await ViewerImage\.dataUriOfAsync\(file, stillWanted\);/.test(run),
      noBlockingWait: !/\.Wait\(/.test(vi) && !/viewDecodeGate|SemaphoreSlim/.test(cs.slice(cs.indexOf('private const int ViewImageIdMaxHex'), cs.indexOf('public void updateGroupChatNicks('))),
      latestWins: /viewerLatest = hexId;/.test(beforeRun) && /private volatile string\? viewerLatest/.test(cs)
        && /Func<bool> stillWanted = \(\) => hexId == viewerLatest && !isDisposed && doc == thumbDoc;/.test(vi)
        && /if \(!stillWanted\(\)\)\s*\{\s*return;\s*\}/.test(run)
        && /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(stillWanted\(\)\)\s*\{\s*pushViewerImage\(doc, hexId, answer\);/.test(run),
      /* the push: the token + the URI ("" on failure) — never the path */
      push: /if \(isDisposed \|\| doc != thumbDoc\)\s*\{\s*return;\s*\}\s*Utils\.sendUiCommand\(this, "viewerImage", hexId, uri\);/.test(pv)
        && (cs.match(/"viewerImage"/g) || []).length === 1 && /pushViewerImage\(doc, hexId, ""\);/.test(beforeRun) && !/pushViewerImage\([^)]*(path|file)/.test(vi),
      logsTypeOnly: (vi.match(/Logging\.\w+\(([^;]*)\);/g) || []).every((l) => /^Logging\.warn\("[^"]+" \+ e\.GetType\(\)\.Name\);$/.test(l)) && (vi.match(/Logging\./g) || []).length === 2,
    };
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 V-3 (C#): ixian:viewImage:<hex> — a bounded hex id only; C# looks the message up itself in the SHOWN channel, requires a fileHeader + an image name + a local file by SharedItems.localPathOf (completed or mine); ViewerImage.dataUriOfAsync is AWAITED inside Task.Run (no blocking Wait, no per-page gate) and the LATEST tap wins (an older tap pushes nothing); the push viewerImage(<hex>, uri|"") goes back on the main thread and never carries the path; logs are the exception TYPE only — ' + JSON.stringify(r));
  }

  /* ———————————— C#: A-N4 — the transfer's own channel ———————————— */
  {
    const cs = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const tm = stripCode(rd('Spixi/Data/TransferManager.cs'));
    const taf = cs.slice(cs.indexOf('private void thumbAfterTransfer(string uid, int channel)'), cs.indexOf('private void enqueueThumb('));
    const r = {
      signature: /public void updateFile\(string uid, string progress, bool complete, int channel\)\s*\{\s*Utils\.sendUiCommand\(this, "updateFile", uid, progress, complete\.ToString\(\)\);\s*if \(complete\)\s*\{\s*thumbAfterTransfer\(uid, channel\);/.test(cs),
      ownChannel: /friend\.getMessages\(channel\)/.test(taf) && !/getMessages\(selectedChannel\)/.test(taf) && /channel != selectedChannel\)/.test(taf),
      callers: (tm.match(/chat_page\.updateFile\(uid, [^;]*, transfer\.channel\);/g) || []).length === 3 && !/chat_page\.updateFile\(uid, [^,;]+, [^,;]+\);/.test(tm),
      sendPath: /thumbAfterTransfer\(transfer\.uid, transfer\.channel\);/.test(cs) && /updateFile\(ft\.uid, "0", false, ft\.channel\);/.test(cs),
    };
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 A-N4 (C#): updateFile carries the TRANSFER\'s channel (TransferManager passes transfer.channel at all three sites — an incoming transfer has left its list when it completes) and thumbAfterTransfer looks the message up in THAT channel, queuing nothing for a channel the page does not show — ' + JSON.stringify(r));
  }
}
