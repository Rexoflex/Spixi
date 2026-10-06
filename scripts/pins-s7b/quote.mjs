/* ==== SESSION 7b (S2) — ★ 7b (#1215) THE QUOTE: tile on the RIGHT + the sender always ====
 * EXECUTED on the BUILT chat.html (jsdom; C# pushes via executeUiCommand). In a 1:1 with photo previews on:
 *   · a loaded PHOTO target quotes with the kind glyph until its preview lands, then (setFileThumb AFTER the quote was
 *     drawn) its picture — an <img> with exactly that data: src, the quote's LAST child (the right side)
 *   · a PDF target → the file-type tile ("PDF", the pdf family) on the right · a voice file → the mic glyph on the right
 *   · own target → "You" · a peer target whose row carries no nick → the HEADER name (setNickname; was identity.nick = "")
 *   · fallback (target not loaded): C#'s 1:1 markers "\u0001me" → "You", "\u0001peer" → the header name, any other
 *     value stays text; the kind glyph sits on the right
 *   · the component: a non-data: tile src (https, javascript:) renders NO <img> (glyph instead); a hostile ext → generic
 * Deliberate breaks: see the 7b hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 3600;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.stack || e)); } };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
  const dom = new JSDOM(readFileSync(f, 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
      w.HTMLImageElement.prototype.decode = function () { return Promise.resolve(); };
      const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
      const impl = sym ? w.location[sym] : null;
      if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set() {} });
    },
  });
  await sleep(1600);
  const W = dom.window;
  const d = W.document;
  const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
  const quoteOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-bubble__reply');
  const senderOf = (q) => (q && q.querySelector('.c-bubble__reply-sender') || {}).textContent;
  const last = (q) => (q && q.lastElementChild) || null;
  const isClass = (el, c) => !!el && el.classList.contains(c);
  const t = (m) => String(T0 + m * 60);

  await guard('#1215 loaded', async () => {
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('setNickname', 'Peer Name');
    push('clearMessages', 'false');
    push('addThem', 'aa01', 'addrPeer', '', '', 'no nick on this row', t(1), 'True', 'True', 'True', 'False', 'False');
    push('addFile', 'aa02', 'addrPeer', 'Bob', '', 'f02', 'IMG_0002.jpg', t(2), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '');
    push('addMe', 'aa03', 'addrMe', 'Me', '', 'mine', t(3), 'True', 'True', 'True', 'False', 'False');
    push('addFile', 'aa04', 'addrPeer', 'Bob', '', 'f04', 'Report_Q3.pdf', t(4), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '');
    push('addFile', 'aa05', 'addrPeer', 'Bob', '', 'f05', 'voice-1.ogg', t(5), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1');
    push('addMe', 'bb01', 'addrMe', 'Me', '', 'to the photo', t(6), 'True', 'True', 'True', 'False', 'False', '', 'aa02', '', '', '');
    push('addMe', 'bb02', 'addrMe', 'Me', '', 'to the peer text', t(7), 'True', 'True', 'True', 'False', 'False', '', 'aa01', '', '', '');
    push('addThem', 'bb03', 'addrPeer', 'Bob', '', 'to your text', t(8), 'True', 'True', 'True', 'False', 'False', '', 'aa03', '', '', '');
    push('addMe', 'bb04', 'addrMe', 'Me', '', 'to the pdf', t(9), 'True', 'True', 'True', 'False', 'False', '', 'aa04', '', '', '');
    push('addMe', 'bb05', 'addrMe', 'Me', '', 'to the voice', t(10), 'True', 'True', 'True', 'False', 'False', '', 'aa05', '', '', '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(150);
    const r = {};
    const q1 = quoteOf('bb01');
    r.photoGlyphFirst = isClass(last(q1), 'c-bubble__reply-glyph') && !q1.querySelector('img');
    push('setFileThumb', 'aa02', JPEG);   // the preview lands AFTER the quote was drawn
    await sleep(80);
    const q1b = quoteOf('bb01');
    r.photoThumbRight = isClass(last(q1b), 'c-bubble__reply-thumb') && last(q1b).tagName === 'IMG' && last(q1b).getAttribute('src') === JPEG
      && !q1b.querySelector('.c-bubble__reply-glyph') && isClass(q1b.firstElementChild, 'c-bubble__reply-info');
    r.photoSender = senderOf(q1b) === 'Bob';
    r.peerHeaderName = senderOf(quoteOf('bb02')) === 'Peer Name';   // the row has no nick → the header name
    r.ownYou = senderOf(quoteOf('bb03')) === 'You' && !last(quoteOf('bb03')).matches('img, .c-bubble__reply-tile, .c-bubble__reply-glyph');
    const q4 = quoteOf('bb04');
    r.pdfTileRight = isClass(last(q4), 'c-bubble__reply-tile') && last(q4).textContent === 'PDF' && last(q4).dataset.kind === 'pdf';
    const q5 = quoteOf('bb05');
    r.voiceMicRight = isClass(last(q5), 'c-bubble__reply-glyph') && !!last(q5).querySelector('svg');
    r.noErr = noErr(errs);
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1215) QUOTE on the BUILT chat shell (1:1): the tile sits on the RIGHT (the info column first) — a photo target shows the kind glyph, then its preview <img> (exactly the data: src) once setFileThumb lands after the quote was drawn; a PDF target the "PDF" file tile (pdf family); a voice target the mic glyph; the sender is always there — "You" for mine, the header name (setNickname) for a peer row with no nick — '
      + JSON.stringify(r) + ' ' + errs.slice(0, 2).join(' | '));
  });

  await guard('#1215 fallback', async () => {
    push('addThem', 'cc01', 'addrPeer', 'Bob', '', 'old one', t(20), 'True', 'True', 'True', 'False', 'False', '', 'ff01', '', '\u0001me', '📷 IMG_9.jpg');
    push('addThem', 'cc02', 'addrPeer', 'Bob', '', 'old two', t(21), 'True', 'True', 'True', 'False', 'False', '', 'ff02', '', '\u0001peer', 'hello there');
    push('addThem', 'cc03', 'addrPeer', 'Bob', '', 'old three', t(22), 'True', 'True', 'True', 'False', 'False', '', 'ff03', '', '\u0001other', 'x');
    push('addThem', 'cc04', 'addrPeer', 'Bob', '', 'old four', t(23), 'True', 'True', 'True', 'False', 'False', '', 'ff04', '', 'Ann', '<img src=x onerror=alert(1)>');
    await sleep(120);
    const r = {};
    r.meMarker = senderOf(quoteOf('cc01')) === 'You';
    r.glyphRight = isClass(last(quoteOf('cc01')), 'c-bubble__reply-glyph');
    r.peerMarker = senderOf(quoteOf('cc02')) === 'Peer Name';
    r.otherIsText = senderOf(quoteOf('cc03')) === '\u0001other';
    r.textOnly = senderOf(quoteOf('cc04')) === 'Ann' && !quoteOf('cc04').querySelector('img');
    r.noErr = noErr(errs);
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1215) FALLBACK QUOTE on the BUILT chat shell: C#\'s 1:1 markers map — "\\u0001me" → "You", "\\u0001peer" → the header name; any other quoteName is text as before; the kind glyph sits on the RIGHT; a markup excerpt stays text — '
      + JSON.stringify(r) + ' ' + errs.slice(0, 2).join(' | '));
  });

  await guard('#1215 group', async () => {
    /* a non-blind GROUP (type 1): identity.name is the group's name — a member row with no nick quotes with the
       truncated address, never the group name */
    push('onChatScreenReady', 'addrGroup');
    push('setChatMode', '1', '0', '', 'False');
    push('setNickname', 'The Group');
    push('clearMessages', 'false');
    const addr = '1ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopq';
    push('addThem', 'gg01', addr, '', '', 'member text', t(30), 'True', 'True', 'True', 'False', 'False');
    push('addMe', 'gg02', 'addrMe', 'Me', '', 'reply', t(31), 'True', 'True', 'True', 'False', 'False', '', 'gg01', '', '', '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(150);
    const who = senderOf(quoteOf('gg02'));
    ok(!!who && who !== 'The Group' && who.startsWith(addr.slice(0, 4)) && who.length < addr.length,
      '★ 7b (#1215) QUOTE in a non-blind GROUP on the BUILT chat shell: a member row with no nick quotes with the member\'s truncated address (the tip ladder), never identity.name (the GROUP\'s name) — sender=' + JSON.stringify(who));
  });

  /* #46 r1 M16: a 1:1 whose HEADER name is address-shaped (no nick yet — setNickname echoes the address) — a peer quote
     shows it truncated in the middle (#211), never the full address; both the loaded row and the "\u0001peer" fallback */
  await guard('#1215 address header', async () => {
    const addr = '1ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopq';
    push('onChatScreenReady', 'addrPeer2');
    push('setChatMode', '0', '0', '', 'False');
    push('setNickname', addr);
    push('clearMessages', 'false');
    push('addThem', 'hh01', 'addrPeer2', '', '', 'no nick here', t(40), 'True', 'True', 'True', 'False', 'False');
    push('addMe', 'hh02', 'addrMe', 'Me', '', 'to it', t(41), 'True', 'True', 'True', 'False', 'False', '', 'hh01', '', '', '');
    push('addMe', 'hh03', 'addrMe', 'Me', '', 'to an old one', t(42), 'True', 'True', 'True', 'False', 'False', '', 'ff09', '', '\u0001peer', 'old words');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(150);
    const a = senderOf(quoteOf('hh02'));
    const b = senderOf(quoteOf('hh03'));
    const trunc = (x) => !!x && x !== addr && x.length < addr.length && x.startsWith(addr.slice(0, 6)) && x.endsWith(addr.slice(-6)) && /…/.test(x);
    ok(trunc(a) && trunc(b),
      '★ 7b (#46 r1 M16) QUOTE SENDER in a 1:1 with an ADDRESS-SHAPED header name on the BUILT chat shell: the loaded peer row and the "\\u0001peer" fallback both show the address truncated in the middle (#211), never in full — ' + JSON.stringify([a, b]));
  });

  await guard('#1215 component', async () => {
    const S = W.Spixi;
    const mk = (tile) => S.createMessageBubble({ text: 'x', direction: 'received', reply: { sender: 'A', text: 'q', kind: 'image', tile } });
    const r = {};
    r.dataImg = !!mk({ type: 'image', src: JPEG }).querySelector('.c-bubble__reply > img.c-bubble__reply-thumb');
    r.httpsRefused = !mk({ type: 'image', src: 'https://tracker.example/p.jpg' }).querySelector('img') && !!mk({ type: 'image', src: 'https://tracker.example/p.jpg' }).querySelector('.c-bubble__reply-glyph');
    r.jsRefused = !mk({ type: 'image', src: 'javascript:alert(1)' }).querySelector('img');
    r.svgDataRefused = !mk({ type: 'image', src: 'data:image/svg+xml,<svg onload=alert(1)>' }).querySelector('img');
    r.svgB64Refused = !mk({ type: 'image', src: 'data:image/svg+xml;base64,PHN2Zy8+' }).querySelector('img');   // #46 r1 M18: the base64 form (the shape the allow-list could admit)
    const bad = mk({ type: 'file', ext: '<b>' }).querySelector('.c-bubble__reply-tile');
    r.badExtGeneric = !!bad && !bad.querySelector('b') && !/</.test(bad.textContent);
    const q = mk({ type: 'image', src: JPEG }).querySelector('.c-bubble__reply');
    S.setReplyQuoteTile(q, { type: 'file', ext: 'ZIP' });
    r.patchSwaps = q.querySelectorAll('.c-bubble__reply-thumb, .c-bubble__reply-tile').length === 1 && q.lastElementChild.textContent === 'ZIP';
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1215) QUOTE TILE (the component): an image tile takes a base64 data:image URI ONLY — https, javascript: and an svg data: URI (plain and base64, #46 r1 M18) render no <img> (the kind glyph instead); a hostile extension is not markup (generic tile); setReplyQuoteTile swaps the one tile in place — '
      + JSON.stringify(r));
  });
  dom.window.close();
}
