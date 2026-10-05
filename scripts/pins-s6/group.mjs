/* ==== SESSION 6 — ★ #1170 GROUP TILE HEAD: received GIF / remote-media tiles and file / photo tiles carry the SAME
 * sender head (label + avatar) a text row carries — the D-19b ladder, the W8 #348 blind gate, the #99 member-sheet
 * tap, the #63 / #756 run grouping. Behaviour on the BUILT chat shell (jsdom, executeUiCommand pushes).
 * Deliberate breaks (#802): see the hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  const GIF = 'https://media.tenor.com/abcDEF123/tenor.gif';
  const GIF2 = 'https://media.tenor.com/xyzXYZ789/tenor.gif';

  const boot = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
      },
    });
    await sleep(1800);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, d: W.document, push, errs };
  };
  /* one chat: type (0 1:1 · 1 group · 2 blind group · 3 bot), then the rows */
  const open = async (type, rows) => {
    const s = await boot();
    const { W, push } = s;
    push('onChatScreenReady', type === 0 ? 'addrPeer' : 'groupAddr');
    push('setChatMode', String(type), '0', '', 'False', '', 'True', type === 2 ? 'True' : 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    for (const r of rows) push(...r);
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    return s;
  };
  const them = (id, addr, nick, text, ts) => ['addThem', id, addr, nick, '', text, String(ts), 'True', 'True', 'True', 'False', 'False'];
  const me = (id, text, ts) => ['addMe', id, 'addrMe', 'Me', '', text, String(ts), 'True', 'True', 'True', 'False', 'False'];
  const file = (id, addr, nick, name, ts, mine = false) => ['addFile', id, addr, nick, '', 'fid' + id, name, String(ts), mine ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True'];
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  /* the head of a row: label (tag, text, classes minus the tile modifier), avatar (wrapped in the #99 button?) */
  const headOf = (d, id) => {
    const r = rowOf(d, id);
    if (!r) return { missing: true };
    const lab = r.querySelector('.c-bubble__sender');
    const g = r.querySelector(':scope > .c-bubble-row__gutter');
    return {
      label: lab ? lab.textContent : null,
      labelTag: lab ? lab.tagName : null,
      labelCls: lab ? [...lab.classList].filter((c) => c !== 'c-bubble__sender--tile').join(' ') : null,
      avatar: !!(g && g.querySelector('.c-avatar')),
      avatarBtn: !!(g && g.querySelector('.c-bubble-row__avatar-btn .c-avatar')),
      gutter: !!g,
      dataGutter: r.hasAttribute('data-gutter'),
      position: r.dataset.position,
    };
  };
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.message)); } };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  /* ——— 1. GROUP: a received GIF tile, a photo-file tile and a file card carry the text row's head; tap = member sheet ——— */
  await guard('#1170 pin 1', async () => {
    const { dom, W, d, errs } = await open(1, [
      them('t1', 'addrT', 'Tess', 'hello', T0),
      them('g1', 'addrA', 'Ann', GIF, T0 + 1000),
      file('p1', 'addrB', 'Ben', 'IMG_1.jpg', T0 + 2000),
      file('f1', 'addrC', 'Cy', 'report.pdf', T0 + 3000),
    ]);
    const t = headOf(d, 't1'); const g = headOf(d, 'g1'); const p = headOf(d, 'p1'); const f = headOf(d, 'f1');
    const r = {};
    r.textRow = t.label === 'Tess' && t.labelTag === 'BUTTON' && t.avatarBtn;   // the reference (unchanged)
    r.gifIsTile = !!(rowOf(d, 'g1') && rowOf(d, 'g1').querySelector('.c-mbubble[data-kind="gif"]'));
    r.photoIsTile = !!(rowOf(d, 'p1') && rowOf(d, 'p1').querySelector('.c-mbubble[data-file]'));
    r.gifHead = g.label === 'Ann' && g.avatarBtn && g.dataGutter;
    r.photoHead = p.label === 'Ben' && p.avatarBtn && p.dataGutter;
    r.cardHead = f.label === 'Cy' && f.avatarBtn && !!rowOf(d, 'f1').querySelector('.c-tile-col > .c-fbubble');
    r.sameFace = g.labelTag === t.labelTag && g.labelCls === t.labelCls && p.labelCls === t.labelCls && f.labelCls === t.labelCls && t.dataGutter;
    r.labelAboveTile = !!rowOf(d, 'g1').querySelector('.c-mbubble-anchor > .c-bubble__sender + .c-mbubble');
    /* the #99 tap: the label and the avatar open the member sheet */
    (rowOf(d, 'g1').querySelector('.c-bubble__sender') || { click() {} }).click();   // a missing label fails the pin, never throws
    await sleep(120);
    r.labelTapSheet = !!d.querySelector('.c-member');
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1170 GROUP HEAD on the BUILT chat shell: in a group, a received GIF tile, a photo-file tile and a file card each show the sender label (the text row\'s own .c-bubble__sender button, same classes) above the tile and the avatar (#99 button) in the gutter, the row on the text rows\' data-gutter inset; tapping the label opens the member sheet — ' + JSON.stringify(r) + ' ' + JSON.stringify({ t, g, p, f }) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 2. BLIND GROUP: a nameless sender's tiles read "Hidden member", never an address, and have no tap ——— */
  await guard('#1170 pin 2', async () => {
    const ADDR = '1BlindAddrXyzQ9w8e7r6t5y4u3i2o1p';
    const { dom, W, d, errs } = await open(2, [
      them('t1', ADDR, '', 'text', T0),
      them('g1', ADDR, '', GIF, T0 + 1000),
      file('p1', ADDR, '', 'IMG_1.jpg', T0 + 2000),
      them('g2', 'addrNick', 'Nina', GIF2, T0 + 3000),
    ]);
    const t = headOf(d, 't1'); const g = headOf(d, 'g1'); const p = headOf(d, 'p1'); const n = headOf(d, 'g2');
    const leaks = (id) => { const r0 = rowOf(d, id); return !r0 || r0.outerHTML.includes(ADDR) || r0.outerHTML.includes(ADDR.slice(0, 6)); };
    const r = {
      textRow: t.label === 'Hidden member' && t.labelTag === 'SPAN',
      gifHidden: g.label === 'Hidden member' && g.labelTag === 'SPAN' && g.avatar && !g.avatarBtn,
      photoHidden: p.label === 'Hidden member' && p.labelTag === 'SPAN' && p.avatar && !p.avatarBtn,
      nickWins: n.label === 'Nina' && n.labelTag === 'SPAN' && !n.avatarBtn,   // D-19b: a nick shows in a blind room, still no tap
      noAddress: !leaks('g1') && !leaks('p1'),
    };
    (rowOf(d, 'g1').querySelector('.c-bubble__sender') || { click() {} }).click();   // a missing label fails the pin, never throws
    await sleep(120);
    r.noSheet = !d.querySelector('.c-member');
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1170 BLIND GROUP on the BUILT chat shell: a nameless sender\'s GIF and photo tiles carry "Hidden member" as a plain span (no button, no member sheet), an avatar without the #99 button, and NO trace of the address anywhere in the row; a nick still wins (D-19b) — ' + JSON.stringify(r) + ' ' + JSON.stringify({ t, g, p, n }) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 3. 1:1 and SENT tiles: no head (unchanged); a BOT room: the text row's head (bots are multi, #99 tap) ——— */
  await guard('#1170 pin 3', async () => {
    const one = await open(0, [
      them('g1', 'addrPeer', 'Bob', GIF, T0),
      file('p1', 'addrPeer', 'Bob', 'IMG_1.jpg', T0 + 1000),
      me('s1', GIF2, T0 + 2000),
    ]);
    const none = (s, id) => { const x = headOf(s.d, id); return !x.missing && x.label === null && !x.avatar && !x.dataGutter; };
    const r = {
      oneGif: none(one, 'g1'), onePhoto: none(one, 'p1'), oneSent: none(one, 's1'),
    };
    const oneErrs = one.errs; try { one.dom.window.close(); } catch (e) {}
    const grp = await open(1, [me('s1', GIF2, T0), file('s2', 'addrMe', 'Me', 'IMG_2.jpg', T0 + 1000, true)]);
    r.groupSentGif = none(grp, 's1');
    r.groupSentPhoto = none(grp, 's2');
    const grpErrs = grp.errs; try { grp.dom.window.close(); } catch (e) {}
    const bot = await open(3, [them('t1', 'addrK', 'Kim', 'hi', T0), them('g1', 'addrA', 'Ann', GIF, T0 + 1000)]);
    const bt = headOf(bot.d, 't1'); const bg = headOf(bot.d, 'g1');
    r.botParity = bt.label === 'Kim' && bg.label === 'Ann' && bg.labelTag === bt.labelTag && bg.avatarBtn === bt.avatarBtn && bg.avatar;
    const botErrs = bot.errs; try { bot.dom.window.close(); } catch (e) {}
    ok(Object.values(r).every((x) => x === true) && noErr(oneErrs) && noErr(grpErrs) && noErr(botErrs),
      '★ #1170 NO HEAD where text rows have none on the BUILT chat shell: a 1:1 received GIF / photo tile and every SENT tile (1:1 and group) carry no label, no avatar and no data-gutter (unchanged); a BOT room tile carries the same head as its text rows (bots are multi chats) — ' + JSON.stringify(r) + ' ' + JSON.stringify({ bt, bg }));
  });

  /* ——— 4. RUN GROUPING: two consecutive tiles from one sender = ONE run: label + avatar once, on the FIRST (#756) ——— */
  await guard('#1170 pin 4', async () => {
    const { dom, W, d, errs } = await open(1, [
      them('g1', 'addrA', 'Ann', GIF, T0),
      them('g2', 'addrA', 'Ann', GIF2, T0 + 60),
      file('p1', 'addrB', 'Ben', 'IMG_1.jpg', T0 + 600),
      file('p2', 'addrB', 'Ben', 'IMG_2.jpg', T0 + 660),
      them('t1', 'addrB', 'Ben', 'and text', T0 + 700),
    ]);
    const g1 = headOf(d, 'g1'); const g2 = headOf(d, 'g2'); const p1 = headOf(d, 'p1'); const p2 = headOf(d, 'p2'); const t1 = headOf(d, 't1');
    const r = {
      gifRun: g1.position === 'first' && g1.label === 'Ann' && g1.avatar && g2.position === 'last' && g2.label === null && !g2.avatar && g2.gutter && g2.dataGutter,
      /* a FILE / photo tile never joins a run (GATE 47 ③: a card never joins a run) — each one carries its own head */
      photoAlone: p1.position === 'single' && p1.label === 'Ben' && p1.avatar && p2.position === 'single' && p2.label === 'Ben' && p2.avatar,
      textAfterAlone: t1.position === 'single' && t1.label === 'Ben' && t1.avatar,
    };
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1170 RUN GROUPING on the BUILT chat shell: two GIF tiles from one sender within the run window are first / last with ONE label + ONE avatar on the first (the #756 text-row rule), the second keeps the empty gutter; a photo-file tile never joins a run (GATE 47 ③) — each photo, and the text after it, carries its own head — ' + JSON.stringify(r) + ' ' + JSON.stringify({ g1, g2, p1, p2, t1 }) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 5. #46 r1 m2 / r2 (5): the file-card COLUMN has a definite width (the card rail), so reactions.js measureOverlapFloor
     (the parent's clientWidth) can grow a short card for its pills (#570) — source css, comment-stripped ——— */
  {
    const css = h.stripCssComments(readFileSync(join(root, 'src/styles/components/media-bubble.css'), 'utf8'));
    const i = css.indexOf('.c-tile-col {');
    const body = i < 0 ? '' : css.slice(i, css.indexOf('}', i));
    ok(/\bwidth: min\(var\(--bubble-max-pct\), var\(--layout-card-max\)\);/.test(body) && /max-width: 100%;/.test(body),
      '★ #1170 (#46 r1 m2): .c-tile-col has a DEFINITE width = the card rail (a shrink-wrapped column capped the #570 pill floor at the card) — ' + JSON.stringify(body.slice(0, 200)));
  }
}
