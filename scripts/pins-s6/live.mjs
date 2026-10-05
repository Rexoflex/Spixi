/* Session 6 part B, agent H — pins for:
 *   #1191 (#1173 (5), W-AVATAR)  an OPEN group chat repaints a MEMBER's changed avatar in place (setAvatarFor, the
 *                                existing push) — built chat.html executed + the C# shape (StreamProcessor → SingleChatPage)
 *   #1192 (#1173 (6), pick c)    the reaction heart sits BESIDE the unread count, left of it — built index.html executed
 *   #1193 (#1168 A)              the sending photo's face: a darker scrim 0.72 + a stronger ring track 0.28 (tokens,
 *                                mode-less), contrast COMPUTED over a white photo
 * One ok() per item; each key is named in the hand-back's break list. */
export default async function (h) {
  const { ok, root, stripCode, stripCssComments, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 3600;
  const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const PNG2 = PNG1.replace('iVBOR', 'iVBORAAAA');
  const PNGY = PNG1.replace('iVBOR', 'iVBORBBBB');

  const boot = async (file) => {
    const f = join(root, 'Spixi/Resources/Raw/html/' + file);
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
    const raw = (fn, ...a) => W.executeUiCommand(W[fn], ...a);
    return { dom, W, d: W.document, push, raw, errs };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  /* ———— #1191: a member's changed avatar repaints IN PLACE in the open group (built chat.html) ———— */
  try {
    const { dom, W, d, push, raw, errs } = await boot('chat.html');
    push('onChatScreenReady', 'groupAddr');
    push('setChatMode', '1', '0', '', 'False');
    push('clearMessages', 'false');
    raw('setAvatarFor', b64('addrX'), PNG1);
    raw('setAvatarFor', b64('addrY'), PNGY);
    push('addThem', 'x1', 'addrX', 'Xena', '', 'one', String(T0));
    push('addThem', 'y1', 'addrY', 'Yuri', '', 'two', String(T0 + 100));
    push('addThem', 'x2', 'addrX', 'Xena', '', 'three', String(T0 + 200));
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const rowOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    const avOf = (id) => { const r0 = rowOf(id); const i = r0 && r0.querySelector('.c-bubble-row__gutter .c-avatar__img'); return i ? i.getAttribute('src') : null; };
    const r = {};
    r.before = avOf('x1') === PNG1 && avOf('x2') === PNG1 && avOf('y1') === PNGY;
    const rowsBefore = ['x1', 'y1', 'x2'].map(rowOf);
    const yDisc = rowOf('y1') && rowOf('y1').querySelector('.c-avatar');
    raw('setAvatarFor', b64('addrX'), PNG2);   // C# re-sends it to the OPEN group (refreshMemberAvatar)
    await sleep(150);
    r.bothNew = avOf('x1') === PNG2 && avOf('x2') === PNG2;
    r.otherUnchanged = avOf('y1') === PNGY && rowOf('y1').querySelector('.c-avatar') === yDisc;
    r.inPlace = ['x1', 'y1', 'x2'].every((id, i) => rowOf(id) === rowsBefore[i] && !!rowsBefore[i]);   // no re-render: the same row nodes
    r.tapKept = !!(rowOf('x1') && rowOf('x1').querySelector('.c-bubble-row__avatar-btn .c-avatar__img'));   // #99: still inside the member-sheet button
    r.oneDisc = rowOf('x1').querySelectorAll('.c-bubble-row__gutter .c-avatar').length === 1;
    r.noErr = noErr(errs);
    ok(Object.values(r).every(Boolean),
      '★★ #1191 (#1173 (5), W-AVATAR) on the built chat shell: an OPEN group with two runs from member X — setAvatarFor(X, new) swaps the disc of BOTH X bubbles in place (same row nodes, no re-render, the member-sheet button kept); member Y unchanged (same disc node) — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  } catch (e) { ok(false, '★★ #1191 shell pin threw: ' + (e && e.stack || e)); }

  /* ———— #1191 (#46 r4 T1 / T4 / T6): the in-place swap keeps the row's gates — a BLIND room (setChatMode type 2) whose
     sender's "nick" is its address shows no initials of it and gains no member-sheet button; a #1170 group TILE head
     (a received photo file) swaps in place too; the disc keeps its size ———— */
  try {
    const ADDR = 'BlindQpT7vKzm3NwR5bYc8LdE2fGh4JkPq9';   // starts with a LETTER: avatar.js initials() would draw one
    const rowOfD = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    const discOf = (d, id) => { const r0 = rowOfD(d, id); return r0 ? r0.querySelector(':scope > .c-bubble-row__gutter .c-avatar') : null; };
    const sizeOf = (el) => el ? [el.dataset.size, el.style.width, el.style.height].join('/') : null;
    const r = {};
    /* T1 — the blind room */
    {
      const { dom, W, d, push, raw, errs } = await boot('chat.html');
      push('onChatScreenReady', 'blindGroup');
      push('setChatMode', '2', '0', '', 'False', '', 'True', 'True');
      push('clearMessages', 'false');
      raw('setAvatarFor', b64(ADDR), PNG1);
      push('addThem', 'b1', ADDR, ADDR, '', 'hello', String(T0));
      if (typeof W.messagesDone === 'function') push('messagesDone');
      push('onChatScreenLoaded');
      await sleep(300);
      const row = rowOfD(d, 'b1');
      const before = discOf(d, 'b1');
      r.blindBefore = !!before && !row.querySelector('.c-bubble-row__avatar-btn');
      raw('setAvatarFor', b64(ADDR), b64('not-a-data-uri'));   // the picture is withdrawn → the swap draws the placeholder
      await sleep(150);
      const after = discOf(d, 'b1');
      const ini = row.querySelector('.c-avatar__initials');
      r.blindSwapped = !!after && after !== before && rowOfD(d, 'b1') === row;
      r.blindNoInitials = !ini || !ADDR.toUpperCase().includes(String(ini.textContent || '').toUpperCase().trim());
      r.blindNoInitialsAtAll = !ini;
      r.blindNoButton = !row.querySelector('.c-bubble-row__avatar-btn');
      r.blindNoErr = noErr(errs);
      dom.window.close();
    }
    /* T6 + T4 — a group TILE head (a received photo file, #1170) and the disc size */
    {
      const { dom, W, d, push, raw, errs } = await boot('chat.html');
      push('onChatScreenReady', 'groupAddr');
      push('setChatMode', '1', '0', '', 'False');
      push('setPhotoPreviews', 'True');
      push('clearMessages', 'false');
      raw('setAvatarFor', b64('addrX'), PNG1);
      push('addFile', 't1', 'addrX', 'Xena', '', 'ft1', 'IMG_t1.jpg', String(T0), 'False', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
      push('addThem', 'x1', 'addrX', 'Xena', '', 'one', String(T0 + 100));
      if (typeof W.messagesDone === 'function') push('messagesDone');
      push('onChatScreenLoaded');
      await sleep(300);
      const tileRow = rowOfD(d, 't1');
      const tBefore = discOf(d, 't1');
      const xBefore = discOf(d, 'x1');
      r.tileHead = !!tileRow && !!tileRow.querySelector('.c-mbubble[data-file]') && !!tBefore && (tBefore.querySelector('img') || {}).getAttribute?.('src') === PNG1;
      const tSize = sizeOf(tBefore), xSize = sizeOf(xBefore);
      raw('setAvatarFor', b64('addrX'), PNG2);
      await sleep(150);
      const tAfter = discOf(d, 't1'), xAfter = discOf(d, 'x1');
      r.tileSwapped = rowOfD(d, 't1') === tileRow && !!tAfter && tAfter !== tBefore && !!tAfter.querySelector('img') && tAfter.querySelector('img').getAttribute('src') === PNG2;
      r.tileButtonKept = !!tileRow.querySelector('.c-bubble-row__avatar-btn .c-avatar__img');
      r.sizeTile = !!tSize && sizeOf(tAfter) === tSize;
      r.sizeText = !!xSize && sizeOf(xAfter) === xSize;
      r.sizeNot24 = !!tSize && tSize.split('/')[0] !== '24';   // jsdom resolves --bubble-avatar-size (32): a hard-coded 24 would show
      r.tileNoErr = noErr(errs);
      dom.window.close();
    }
    ok(Object.values(r).every((x) => x === true),
      '★★ #1191 (#46 r4 T1/T4/T6) the in-place avatar swap keeps the row\'s gates: in a BLIND room (type 2) a sender whose nick is its address — the swapped disc shows NO initials (of the address or at all) and no member-sheet button appears; a #1170 group TILE head (a received photo file) swaps in place (same row, the button kept); the disc keeps its size (tile + text) — ' + JSON.stringify(r));
  } catch (e) { ok(false, '★★ #1191 r4 T1 pin threw: ' + (e && e.stack || e)); }

  /* ———— #1191 C# shape (MAUI-only — source pins) ———— */
  try {
    const sp = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
    const av = sp.slice(sp.indexOf('case SpixiMessageCode.avatar:'), sp.indexOf('case SpixiMessageCode.requestFunds:'));
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const m = sc.slice(sc.indexOf('public void refreshMemberAvatar(Address member)'));
    const body = m.slice(0, m.indexOf('\n        }\n') + 10);
    const r = {
      /* the address Core stored the picture under (FriendList.setAvatar: the real sender for a bot room, else the sender) */
      storedAddress: /Address memberAddress = \(friend != null && friend\.bot && group_sender_address != null\) \? group_sender_address : sender_address;/.test(av),
      afterStore: av.indexOf('FriendList.setAvatar(') >= 0 && av.indexOf('memberAddress') > av.indexOf('FriendList.setAvatar('),
      mainThread: /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*try\s*\{\s*foreach \(SingleChatPage page in Utils\.getChatPages\(\)\)\s*\{\s*page\.refreshMemberAvatar\(memberAddress\);/.test(av),
      noAddrLog: !/Logging\.\w+\([^;]*memberAddress/.test(av),
      multiOnly: /if \(friend == null \|\| !\(friend\.bot \|\| friend\.type == FriendType\.Group\) \|\| member == null\)\s*\{\s*return;/.test(body),
      gate: /if \(!known && \(Utils\.hidesParticipants\(friend\) \|\| friend\.users == null \|\| !friend\.users\.hasUser\(member\)\)\)\s*\{\s*return;/.test(body),
      known: /lock \(avatarSent\)\s*\{\s*known = avatarSent\.ContainsKey\(address\);/.test(body),
      sameRowPath: /avatarForRow\(Utils\.imageToDataUri\(path\), member\);/.test(body),
      noNewVerb: !/sendUiCommand/.test(body),
      headerKept: /if \(group_sender_address == null && friend != null\)/.test(av) && /pushHeaderAvatar\(\)/.test(av),
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1191 C# shape: StreamProcessor `case avatar` re-pushes a member\'s picture to every open chat (UI thread, the address Core stored it under, no address in a log); SingleChatPage.refreshMemberAvatar: multi chats only, a member this page already sent a picture for or (not blind) on its roster, through avatarForRow → the EXISTING setAvatarFor (no new verb); the 1:1 / group header push kept — ' + JSON.stringify(r));
  } catch (e) { ok(false, '★★ #1191 C# pin threw: ' + (e && e.stack || e)); }

  /* ———— #1192: the heart BESIDE the count, left of it (built index.html) ———— */
  try {
    const { dom, W, d, push, errs } = await boot('index.html');
    const A = 'AAAheartAndCount1111111111111111111111', B = 'BBBheartOnly2222222222222222222222222', C = 'CCCcountOnly3333333333333333333333333';
    const now = Math.floor(Date.now() / 1000);
    const row = (addr, nick, unread, heart, ts) => [addr, nick, String(ts), '', 'False', 'hi', 'default', String(unread), '', 'False', 'text', '', heart];
    push('clearChats');
    push('addChat', ...row(A, 'Ana', 2, 'True', now - 1));
    push('addChat', ...row(B, 'Bor', 0, 'True', now - 2));
    push('addChat', ...row(C, 'Cene', 2, 'False', now - 3));
    push('clearChatsDone');
    await sleep(150);
    const inds = (a) => { const e = d.querySelector('.c-chatlist-item[data-address="' + a + '"] .c-chatlist-item__indicators'); return e ? [...e.children].map((c) => c.dataset.variant + (c.dataset.variant === 'count' ? ':' + c.textContent : '')) : []; };
    const chip = () => { const c = d.querySelector('.c-chip[data-filter="unread"] .c-chip__count'); return c ? c.textContent : '0'; };
    const nav = () => { const b = d.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge'); return b && !b.hidden ? b.textContent : '0'; };
    const exA = () => { const e = d.querySelector('.c-chatlist-item[data-address="' + A + '"] .c-excerpt'); return e ? e.textContent : ''; };
    const r = {
      heartFirst: JSON.stringify(inds(A)) === JSON.stringify(['reaction', 'count:2']),
      heartOnly: JSON.stringify(inds(B)) === JSON.stringify(['reaction']),
      countOnly: JSON.stringify(inds(C)) === JSON.stringify(['count:2']),
      notInChip: chip() === '2',
      notInNav: nav() === '4',
      excerptKept: /hi/.test(exA()),
      noErr: noErr(errs),
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1192 (#1173 (6), Damir pick c #1188) on the built home shell: unread 2 + a reaction → the heart AND the count, heart LEFT of the count; unread 0 + a reaction → the heart only; unread 2, no reaction → the count only; the heart is never in the Unread chip (2) or the nav badge (4); the excerpt keeps the last message — ' + JSON.stringify(r) + ' A=' + JSON.stringify(inds(A)) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  } catch (e) { ok(false, '★★ #1192 pin threw: ' + (e && e.stack || e)); }

  /* ———— #1193: the sending photo's face — darker scrim + stronger track, COMPUTED over a white photo ———— */
  try {
    const tokRaw = stripCssComments(rd('src/styles/tokens.css'));
    const css = stripCssComments(rd('src/styles/components/media-bubble.css'));
    const built = rd('Spixi/Resources/Raw/html/chat.html'), builtTok = rd('Spixi/Resources/Raw/html/spixi.tokens.css');
    const tv = {};   // every mode-less :root block (the dark blocks are [data-theme="dark"] / media — not read: the face is mode-less)
    for (const b of tokRaw.matchAll(/^:root \{([\s\S]*?)^\}/gm)) for (const dd of b[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) tv[dd[1]] = dd[2].trim();
    const tok = (v, k = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(String(v || '').trim()); return !m ? v : k > 12 ? null : tok(tv[m[1]], k + 1); };
    const rgba = (c) => { c = String(c || '').trim(); let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
      m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
    const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const lum = (c) => { const v = c.slice(0, 3).map((u) => u / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const faceRe = /\.c-mbubble\[data-file="progress"\]\[data-state="loaded"\] \.c-mbubble__file \{[^}]*background: var\((--[\w-]+)\);[^}]*color: var\(--text-on-scrim\);/;
    const trackRe = /\.c-mbubble\[data-file="progress"\]\[data-state="loaded"\] \.c-mbubble__ring-track \{ stroke: var\((--[\w-]+)\); \}/;
    const fillRe = /\.c-mbubble\[data-file="progress"\]\[data-state="loaded"\] \.c-mbubble__ring-fill \{ stroke: var\((--icon-on-scrim)\); \}/;
    const face = faceRe.exec(css), track = trackRe.exec(css), fill = fillRe.exec(css);
    const scrim = rgba(tok(face && 'var(' + face[1] + ')')), wash = rgba(tok(track && 'var(' + track[1] + ')'));
    const ink = rgba(tok('var(--text-on-scrim)')), fillC = rgba(tok(fill && 'var(' + fill[1] + ')'));
    const WHITE = [255, 255, 255, 1];
    const ground = scrim && over(scrim, WHITE);
    const text = ground && ink ? +cr(over(ink, ground), ground).toFixed(2) : 0;
    const ring = ground && wash && fillC ? +cr(over(fillC, ground), over(wash, ground)).toFixed(2) : 0;
    const defs = (n) => (rd('src/styles/tokens.css').match(new RegExp('^\\s*' + n + ':', 'gm')) || []).length;
    const r = {
      roleTokens: !!face && face[1] === '--surface-scrim-strong' && !!track && track[1] === '--surface-wash-on-scrim-strong',
      values: tv['--surface-scrim-strong'] === 'rgba(17, 18, 19, 0.72)' && tv['--surface-wash-on-scrim-strong'] === 'rgba(255, 255, 255, 0.28)',
      modeLess: defs('--surface-scrim-strong') === 1 && defs('--surface-wash-on-scrim-strong') === 1,
      textOnWhite: text >= 4.5 && text >= 7 && text <= 8,
      ringOnWhite: ring >= 3 && ring >= 3.5 && ring <= 4,
      baseScrimKept: tv['--surface-scrim'] === 'rgba(17, 18, 19, 0.6)',   // the viewer / call stage / tiles keep 0.6
      inBuilt: /--surface-scrim-strong:\s*rgba\(17, 18, 19, 0\.72\)/.test(builtTok) && /\.c-mbubble__file \{[^}]*background: var\(--surface-scrim-strong\);/.test(built)
        && /\.c-mbubble__ring-track \{ stroke: var\(--surface-wash-on-scrim-strong\); \}/.test(built),
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1193 (#1168 A, Damir pick #1188): the SENDING photo face uses role tokens --surface-scrim-strong (0.72) + --surface-wash-on-scrim-strong (0.28), mode-less (one :root definition); over a WHITE photo the on-scrim text reads ≥ 4.5:1 (≈ 7.5) and the white ring fill on its track ≥ 3:1 (≈ 3.7); --surface-scrim stays 0.6 for the other surfaces; in the built chat shell — ' + JSON.stringify(r) + ' text=' + text + ' ring=' + ring);
  } catch (e) { ok(false, '★★ #1193 pin threw: ' + (e && e.stack || e)); }
}
