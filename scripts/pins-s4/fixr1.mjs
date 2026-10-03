/* ==== SESSION 4 fix batch — #46 r1 pins (docs/reviews/session-4-fix-r1.md; DECISIONS #1147 / #1148) ====
 * Behaviour first: the BUILT chat and home shells are booted in jsdom and driven through their real entry points
 * (executeUiCommand). CSS is asserted as the COMPUTED value of the live element (jsdom 29 resolves the cascade —
 * specificity and order), never as "some rule mentions it" (B-M1: that `includes` let a losing rule pass). Reduced
 * motion is emulated by UNWRAPPING the document's own `@media (prefers-reduced-motion: reduce)` blocks in place
 * (same position, same order — the cascade jsdom then computes is the one a reduced-motion device computes).
 * The C# rows (A-M1 · A-M2 · A-M3) are SOURCE pins: VoIPManager, SContacts and the pages are MAUI / Ixian-Core
 * bound (SPushService, FriendList, Preferences) and cannot run in scripts/csh; each names the rule it guards.
 * Every pin was broken on purpose before it was believed (the breaks are in the fixer's report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  /* a JPEG HEADER run (SOI · APP0 · SOFn · EOI) of w × h — what C#'s preview starts with */
  const jpegOf = (w, hh) => 'data:image/jpeg;base64,' + Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xC0, 0x00, 0x11, 0x08, hh >> 8, hh & 0xFF, w >> 8, w & 0xFF, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]).toString('base64');

  const boot = async (file, theme) => {
    const f = join(root, 'Spixi/Resources/Raw/html', file);
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
    if (theme) W.document.documentElement.setAttribute('data-theme', theme);
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs };
  };
  /* reduced motion, faithfully: each RM @media block is replaced IN PLACE by its own rules */
  const unwrapReducedMotion = (W) => {
    let n = 0;
    for (const sh of Array.from(W.document.styleSheets)) {
      let list; try { list = sh.cssRules; } catch (e) { continue; }
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (r.type === 4 && /prefers-reduced-motion:\s*reduce/.test(r.media.mediaText)) {
          const kids = Array.from(r.cssRules).map((k) => k.cssText);
          sh.deleteRule(i);
          kids.forEach((t, k) => sh.insertRule(t, i + k));
          n += 1;
        }
      }
    }
    return n;
  };
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();

  console.log('★ Session 4 fix batch — #46 r1 (B-M1 · B-M2 · B-m1…m4 · A-M1…M3 · the five mutant survivors)');

  /* ——— B-M1 · B-m1 · B-m3 · M8: the jump highlight under REDUCED MOTION, computed on every kind, both sides ——— */
  const RING = '0 0 0 1px var(--surface-select-row-gap), 0 0 0 2px var(--outline-action-default)';
  const KEEP_SENT_CARD = 'inset 0 0 0 1px var(--outline-card-sent), inset 0 1px 0 var(--highlight-top)';
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addThem', 't1', 'addrPeer', 'Bob', '', 'received text', String(T0));
    push('addMe', 't2', 'addrPeer', 'Me', '', 'sent text', String(T0 + 1), 'True', 'True', 'True', 'False', 'False');
    push('addFile', 'f1', 'addrPeer', 'Bob', '', 'ff1', 'report.pdf', String(T0 + 2), 'False', 'False', 'False', '0', 'False', 'False', 'True');
    push('addFile', 'f2', 'addrPeer', 'Me', '', 'ff2', 'notes.pdf', String(T0 + 3), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'p1', 'addrPeer', 'Bob', '', 'fp1', 'IMG_r.jpg', String(T0 + 4), 'False', 'False', 'False', '100', 'True', 'False', 'True');
    push('addFile', 'p2', 'addrPeer', 'Me', '', 'fp2', 'IMG_s.jpg', String(T0 + 5), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    push('addFile', 'p3', 'addrPeer', 'Me', '', 'fp3', 'IMG_x.jpg', String(T0 + 6), 'True', 'False', 'False', '30', 'False', 'False', 'True');
    push('addPaymentRequest', 'c1', '', 'addrPeer', 'Bob', '', 'Payment request', '5', 'Pending', 'fa-clock', String(T0 + 7), '', 'False', 'False', 'True', 'request', 'pending', '', 'False');
    push('addPaymentRequest', 'c2', '', 'addrPeer', 'Me', '', 'Payment request', '5', 'Pending', 'fa-clock', String(T0 + 8), 'True', 'False', 'True', 'True', 'request', 'pending', '', 'False');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(200);
    const KINDS = '.c-bubble, .c-fbubble, .c-mbubble, .c-tcard';
    const ids = ['t1', 't2', 'f1', 'f2', 'p1', 'p2', 'p3', 'c1', 'c2'];
    const rowOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"]');
    const unwrapped = unwrapReducedMotion(W);
    const per = {};
    const r = { unwrapped: unwrapped > 0, everyKind: true, sides: '', bandStatic: true, radius12: true, keepOnSentCards: true, edgeRaised: true, ringBeatsEdgeRule: true };
    const sides = new Set();
    for (const id of ids) {
      const row = rowOf(id);
      const bub = row && row.querySelector(KINDS);
      if (!bub) { r.everyKind = false; per[id] = 'missing'; continue; }
      row.setAttribute('data-mention-pulse', '');
      const cs = W.getComputedStyle(bub), rcs = W.getComputedStyle(row);
      const shadow = norm(cs.boxShadow);
      const sentCard = row.dataset.direction === 'sent' && (bub.classList.contains('c-tcard') || bub.classList.contains('c-fbubble'));
      per[id] = row.dataset.direction + ' ' + bub.className.split(' ')[0] + ': ' + shadow;
      sides.add(row.dataset.direction + ':' + bub.className.split(' ')[0]);
      /* B-M1: the WINNING box-shadow is the ring (gap + blue) on every kind — the sent photo tile's (0,4,0) edge rule included */
      r.everyKind = r.everyKind && shadow.startsWith(RING + ', ') && norm(cs.animationName) === 'none';
      /* B-m3: a sent card keeps its own (raised) edge under the ring; the lit row raises it (#993) */
      if (sentCard) {
        r.keepOnSentCards = r.keepOnSentCards && norm(cs.getPropertyValue('--jump-keep')) === KEEP_SENT_CARD && shadow === RING + ', var(--jump-keep, 0 0 0 0 transparent)';
        r.edgeRaised = r.edgeRaised && norm(rcs.getPropertyValue('--outline-card-sent')) === 'var(--outline-card-sent-selected)';
      }
      /* M8: the static band keeps the selected-row radius (a reduced-motion border-radius: 0 would square it) */
      r.bandStatic = r.bandStatic && norm(rcs.backgroundColor) === 'var(--surface-select-row)' && norm(rcs.animationName) === 'none';
      r.radius12 = r.radius12 && norm(rcs.borderRadius) === 'var(--radius-12)';   // (jsdom keeps a var() shorthand unexpanded)
      row.removeAttribute('data-mention-pulse');
      /* the edge rule is really what it beats: unlit, the same element computes its own (non-ring) shadow */
      r.ringBeatsEdgeRule = r.ringBeatsEdgeRule && !norm(W.getComputedStyle(bub).boxShadow).startsWith(RING);
    }
    r.sides = ['received:c-bubble', 'sent:c-bubble', 'received:c-fbubble', 'sent:c-fbubble', 'received:c-mbubble', 'sent:c-mbubble', 'received:c-tcard', 'sent:c-tcard'].every((k) => sides.has(k));
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r1 B-M1 · B-m1 · B-m3 · M8 (COMPUTED, reduced motion, the built chat shell): a jump lights EVERY kind on BOTH sides — text · file card · photo tile (mine too: the (0,4,0) sent-tile edge rule no longer wins) · typed card — with the WINNING box-shadow = a 1 px band-coloured gap + the 1 px blue ring, no animation; a sent card keeps its own edge under the ring and the lit row raises it (--outline-card-sent-selected, #993); the static band is the selected-row tint at --radius-12 — ' + JSON.stringify(r) + ' ' + JSON.stringify(per) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ——— B-m1: the ring's contrast, COMPUTED from the shipped tokens in both themes (sent + received bubbles, the band) ——— */
  {
    const { dom, W, errs } = await boot('chat.html');
    const root = W.document.documentElement;
    const resolve = (name, depth = 0) => {   // a custom property through its var() chain, as the document computes it
      const v = norm(W.getComputedStyle(root).getPropertyValue(name));
      const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
      return m && depth < 8 ? (resolve(m[1], depth + 1) || m[2] || '') : v;
    };
    const rgb = (v) => {
      let m = /^#([0-9a-f]{6})$/i.exec(v || '');
      if (m) return { c: [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)), a: 1 };
      m = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(v || '');
      return m ? { c: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) } : null;
    };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (x, y) => { const [p, q] = [lum(x), lum(y)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
    const over = (fg, bg) => fg.c.map((v, i) => Math.round(fg.a * v + (1 - fg.a) * bg[i]));
    const res = {};
    const r = {};
    for (const theme of ['light', 'dark']) {
      root.setAttribute('data-theme', theme);
      const [blue, gap, band, ground, sent, recv] = ['--outline-action-default', '--surface-select-row-gap', '--surface-select-row', '--chat-canvas-base', '--surface-bubble-sent', '--surface-bubble-received'].map((n) => rgb(resolve(n)));
      if (!(blue && gap && band && ground && sent && recv)) { r[theme] = false; res[theme] = 'unresolved'; continue; }
      const bandOnGround = over(band, ground.c);
      const n = { ringOnGap: cr(blue.c, gap.c), ringOnBand: cr(blue.c, bandOnGround), gapOnSent: cr(gap.c, sent.c), gapOnRecv: cr(gap.c, recv.c), oldRingOnSent: cr(blue.c, sent.c), oldRingOnRecv: cr(blue.c, recv.c) };
      res[theme] = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Math.round(v * 100) / 100]));
      /* the gap IS the band (opaque, composited over the ground — ±2 per channel), the ring clears 3:1 on it, and the gap
         now stands between the ring and my bubble (light: the ring touched it at 1.17:1) */
      r[theme] = gap.a === 1 && gap.c.every((v, i) => Math.abs(v - bandOnGround[i]) <= 2) && n.ringOnGap >= 3 && n.ringOnBand >= 3 && n.gapOnSent > 1.5;
    }
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★ #46 r1 B-m1 (computed contrast, the shipped tokens in the built chat shell): in BOTH themes the A2 ring\'s gap is the band itself made opaque (the select-row tint over the chat ground), the blue ring is ≥ 3:1 on it (and on the band), and the gap separates the ring from the sent bubble it used to touch — ' + JSON.stringify(r) + ' ' + JSON.stringify(res));
    dom.window.close();
  }

  /* ——— B-M2 · B-m2 · B-m4 · M1 · M2 · M3: the photo tile on the built chat shell ——— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'h1', 'addrPeer', 'Me', '', 'fh1', 'IMG_h1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');   // mine, from the history load
    push('addFile', 'h2', 'addrPeer', 'Bob', '', 'fh2', 'IMG_h2.jpg', String(T0 + 1), 'False', 'False', 'False', '40', 'False', 'False', 'True');   // a download in flight
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(150);
    const tile = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    const box = (el) => (el ? el.getAttribute('style') || '' : 'none');   // the inline geometry (jsdom drops a min() width from .style)
    const r = {};
    /* B-M2: the quiet tile reserves C#'s SQUARE from its first frame, and the preview landing — even one whose header
       says 3:2, even one smaller than the crop — changes nothing */
    const t1 = tile('h1');
    const first = box(t1);
    r.squareFirstFrame = !!t1 && t1.hasAttribute('data-quiet') && /aspect-ratio: 1( \/ 1)?;/.test(first);   // (jsdom drops the min() width; Chromium: 310 × 310 before and after)
    push('setFileThumb', 'h1', jpegOf(300, 200));
    await sleep(30);
    const img1 = tile('h1').querySelector('.c-mbubble__img');
    Object.defineProperty(img1, 'naturalWidth', { value: 200 }); Object.defineProperty(img1, 'naturalHeight', { value: 133 });
    img1.dispatchEvent(new W.Event('load'));
    await sleep(30);
    r.unchangedAcrossThumb = box(tile('h1')) === first && tile('h1').dataset.state === 'loaded';
    /* a download that completes in place keeps the square it had from its first frame (#46 r2 R2-m1: every photo-file
       tile is square, a download included — it used to take the square only at the flip) */
    const t2 = tile('h2');
    const before2 = box(t2);
    push('updateFile', 'fh2', '100', 'True');
    await sleep(30);
    const flipped = box(tile('h2'));
    push('setFileThumb', 'h2', jpegOf(320, 180));
    await sleep(30);
    r.flipTakesSquare = before2 === first && flipped === first && box(tile('h2')) === first;
    /* B-m2: the picture COVERS the tile (contain left a 1 px sliver of ground inside the 2 px frame) */
    r.cover = W.getComputedStyle(img1).objectFit === 'cover';
    /* B-m4: a LIVE insert (my just-sent photo) never waits quiet — its face (the progress ring) shows at once */
    push('addFile', 'l1', 'addrPeer', 'Me', '', 'fl1', 'IMG_l1.jpg', String(T0 + 50), 'True', 'False', 'False', '0', 'False', 'False', 'True');
    await sleep(60);
    const tl = tile('l1');
    r.liveNoQuiet = !!tl && tl.dataset.file === 'progress' && !tl.hasAttribute('data-quiet') && !!tl.querySelector('.c-mbubble__ring');
    /* …and stays so across a re-render inside the old window (another live row rebuilds the log) */
    push('addThem', 'l2', 'addrPeer', 'Bob', '', 'nice', String(T0 + 51));
    await sleep(60);
    r.liveNoQuietRerender = !!tile('l1') && !tile('l1').hasAttribute('data-quiet');

    /* the quiet machine itself (the bundle's createImageFileBubble, as the shell calls it) */
    const S = W.Spixi;
    const mk = (key, thumb) => { const row = S.createImageFileBubble({ direction: 'sent', name: 'IMG_q.jpg', state: 'complete', thumb, quietKey: key }); d.body.append(row); return row.querySelector('.c-mbubble'); };
    /* M2: a picture that fails to decode brings the face back at once (not after the wait) */
    const q2 = mk('m2', jpegOf(320, 320));
    const wasQuiet2 = q2.hasAttribute('data-quiet') && q2.dataset.state === 'loading';
    q2.querySelector('.c-mbubble__img').dispatchEvent(new W.Event('error'));
    r.failedDecodeUnquiets = wasQuiet2 && !q2.hasAttribute('data-quiet') && q2.dataset.state === 'idle';
    /* M3 · M1 (setup): a picture still DECODING past the wait keeps the quiet (its own load or error ends it) */
    const q3 = mk('m3', jpegOf(320, 320));
    const k0 = mk('evict-0', null);
    const k0Quiet = k0.hasAttribute('data-quiet');
    await sleep(700);
    r.decodingKeepsQuiet = q3.hasAttribute('data-quiet') && q3.dataset.state === 'loading';
    r.idleUnquietsAfterWait = k0Quiet && !k0.hasAttribute('data-quiet');
    /* M1: the per-message window is BOUNDED (256, oldest out): spent → a rebuild is not quiet; evicted → it starts again */
    r.spentNotQuiet = !mk('evict-0', null).hasAttribute('data-quiet');
    for (let i = 1; i <= 256; i++) mk('evict-' + i, null);
    r.evictedStartsAgain = mk('evict-0', null).hasAttribute('data-quiet');
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r1 B-M2 · B-m2 · B-m4 + mutants M1 · M2 · M3 (the built chat shell): a LOCAL photo tile reserves C#\'s square (SThumbnail.makeJpeg is a centre crop on all four platforms, 320) from its FIRST quiet frame and the preview landing — a 3:2 header, a smaller picture — does not resize it; a download that completes in place keeps the same square (#46 r2 R2-m1: square from its first frame); the picture COVERS (no sliver); a LIVE insert (my just-sent photo) never waits quiet, not even across a re-render; a failed decode brings the face back at once; a picture still decoding past 600 ms stays quiet; an idle one shows its face after the wait; the per-message window is bounded (256, oldest out — an evicted message waits again) — ' + JSON.stringify(r) + ' first=' + first + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ——— M7: the home shell takes the 13th addChat arg in either casing ——— */
  {
    const { dom, W, push, errs } = await boot('index.html');
    const A = 'AAAlowerTrue11111111111111111111111111', B = 'BBBlowerFalse2222222222222222222222222';
    const now = Math.floor(Date.now() / 1000);
    push('clearChats');
    push('addChat', A, 'Ana', String(now - 1), '', 'False', 'hi', 'default', '0', '', 'False', 'text', '', 'true');
    push('addChat', B, 'Bor', String(now - 2), '', 'False', 'hi', 'default', '0', '', 'False', 'text', '', 'false');
    push('clearChatsDone');
    await sleep(150);
    const heartOf = (a) => { const e = W.document.querySelector('.c-chatlist-item[data-address="' + a + '"]'); return e ? e.querySelector('.c-indicator[data-variant="reaction"]') : undefined; };
    const r = { lowerTrue: !!heartOf(A), lowerFalse: heartOf(B) === null, noErr: errs.length === 0 };
    ok(Object.values(r).every(Boolean),
      '★ #46 r1 mutant M7 (the built home shell): addChat\'s 13th arg "true" (lower case) shows the reaction heart like "True"; "false" shows none — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ——— A-M1 · A-M2 · A-M3: C# source pins (MAUI / Ixian-Core bound — nothing here can execute them) ——— */
  {
    const cs = (p) => stripCode(rd(p));
    const voip = cs('Spixi/VoIP/VoIPManager.cs');
    const end = voip.slice(voip.indexOf('private static void endVoIPSession()'), voip.indexOf('public static void acceptCall('));
    const iCount = end.indexOf('currentCallContact.metaData.unreadMessageCount++;');
    const iMissed = end.indexOf('_SL("notification-missed-call")');
    const iReset = end.indexOf('currentCallContact = null;');
    const sc = cs('Spixi/Utils/SContacts.cs');
    const leave = sc.slice(sc.indexOf('bool removed = FriendList.removeFriend(group);'), sc.indexOf('return removed;'));
    const rmHist = sc.slice(sc.indexOf('public static bool removeHistory(Friend friend)'));
    const cd = cs('Spixi/Pages/Contacts/ContactDetails.xaml.cs');
    const cdHist = cd.slice(cd.indexOf('private void onRemoveHistory()'));
    const sp = cs('Spixi/Pages/Settings/SettingsPage.xaml.cs');
    const spHist = sp.slice(sp.indexOf('public void onDeleteHistory()'));
    const r = {
      /* A-M1: the missed call is COUNTED before its notification is posted (its badge reads the count), and both run
         before the call fields are reset */
      countBeforeBadge: iCount > 0 && iMissed > iCount && iReset > iMissed,
      /* A-M2: the three delete-history paths clear the heart */
      histOne: /if \(!friend\.deleteHistory\(\)\)\s*\{\s*return false;\s*\}\s*SReactionFlags\.clear\(friend\.walletAddress\?\.ToString\(\)\);/.test(rmHist),
      histDetails: /if\(friend\.deleteHistory\(\)\)\s*\{\s*SReactionFlags\.clear\(friend\.walletAddress\.ToString\(\)\);/.test(cdHist),
      histAll: /public void onDeleteHistory\(\)\s*\{\s*FriendList\.deleteEntireHistory\(\);\s*SReactionFlags\.clearAll\(\);/.test(spHist),
      /* A-M3: leaving a group, and both pendingDeletion heals (a re-added contact), clear it */
      leaveGroup: /else\s*\{[^}]*SReactionFlags\.clear\(group\.walletAddress\?\.ToString\(\)\);/.test(leave),
      healAdd: /existing\.pendingDeletion\)\s*\{\s*FriendList\.removeFriend\(existing\);\s*SReactionFlags\.clear\(existing\.walletAddress\?\.ToString\(\)\);/.test(cs('Spixi/Utils/SpixiContentPage.cs')),
      healNew: /old_friend\.pendingDeletion\)\s*\{\s*FriendList\.removeFriend\(old_friend\);\s*SReactionFlags\.clear\(old_friend\.walletAddress\?\.ToString\(\)\);/.test(cs('Spixi/Pages/Contacts/ContactNewPage.xaml.cs')),
    };
    ok(Object.values(r).every(Boolean),
      '★ #46 r1 A-M1 · A-M2 · A-M3 (C# source pins — VoIPManager / SContacts / the pages are MAUI- and Core-bound, scripts/csh cannot run them): endVoIPSession COUNTS a missed call before it posts the "Missed call" notification whose badge reads that count (both before the call fields reset); the reaction heart is cleared by all three delete-history paths (one contact · contact details · delete all) and when leaving a group or healing a pendingDeletion contact on re-add (2 sites) — ' + JSON.stringify(r));
  }
}
