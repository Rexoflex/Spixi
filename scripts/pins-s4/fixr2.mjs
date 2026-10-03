/* ==== SESSION 4 fix batch — #46 r2 pins (docs/reviews/session-4-fix-r2.md; DECISIONS #1147 / #1148) ====
 * Behaviour first: the BUILT chat shell is booted in jsdom and driven through its real entry points (executeUiCommand);
 * tokens are read as the COMPUTED custom properties of the live root on each ground. The one C# row (the A-M1 guard) is a
 * SOURCE pin: VoIPManager is MAUI / Ixian-Core bound (SPushService, Friend.endCall) and cannot run in scripts/csh.
 * Every pin was broken on purpose before it was believed (the breaks are in the fixer's report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  /* a JPEG HEADER run (SOI · APP0 · SOFn · EOI) of w × h — what C#'s preview starts with */
  const jpegOf = (w, hh) => 'data:image/jpeg;base64,' + Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xC0, 0x00, 0x11, 0x08, hh >> 8, hh & 0xFF, w >> 8, w & 0xFF, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9]).toString('base64');
  const boot = async (file) => {
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
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs };
  };
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();

  console.log('★ Session 4 fix batch — #46 r2 (R2-MAJ1 · R2-m1 · R2-m2 · the mutant survivors M1 · M3 · M4 · the A-M1 guard)');

  /* ——— R2-MAJ1: the photo quiet wait is per PEER (desktop A → B → A in one document) ——— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    const openChat = (addr, id) => {
      push('onChatScreenReady', addr);
      push('setChatMode', '0', '0', '', 'False');
      push('setPhotoPreviews', 'True');
      push('clearMessages', 'false');
      push('addFile', id, addr, 'Me', '', 'f' + id, 'IMG_' + id + '.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
      push('messagesDone');
      push('onChatScreenLoaded');
    };
    const tile = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    const r = {};
    openChat('addrA', 'a1');
    await sleep(30);
    r.firstOpenQuiet = !!tile('a1') && tile('a1').hasAttribute('data-quiet');
    await sleep(700);   // A's window (600 ms) is spent
    /* control: a re-flush of the SAME peer (no onChatScreenReady) inside one open does not wait again — the wait is
       per message, so the reset below is the peer switch's, not any re-render's */
    push('clearMessages', 'false');
    push('addFile', 'a1', 'addrA', 'Me', '', 'fa1', 'IMG_a1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    push('messagesDone');
    await sleep(30);
    r.samePeerReflushNotQuiet = !!tile('a1') && !tile('a1').hasAttribute('data-quiet');
    openChat('addrB', 'b1');
    await sleep(700);
    openChat('addrA', 'a1');   // back to A: its message ids are spent from the first open
    await sleep(30);
    const t = tile('a1');
    const face = t && t.querySelector('.c-mbubble__file');
    r.reopenQuiet = !!t && t.hasAttribute('data-quiet') && t.dataset.state === 'idle';
    r.faceHidden = !!face && W.getComputedStyle(face).opacity === '0';
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r2 R2-MAJ1 (the built chat shell, desktop A → B → A in ONE document): the photo quiet wait (#1147 (5)) is reset per PEER at onChatScreenReady — the reopened A\'s local photo tile stands quiet again (no face: the glyph never shows before its preview swaps in), while a re-flush of the same peer inside one open does not wait again — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ——— R2-m1 · M1: EVERY photo-file tile is square from its first frame and never resizes ——— */
  {
    const { dom, W, push, errs } = await boot('chat.html');
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'o1', 'addrPeer', 'Bob', '', 'fo1', 'IMG_o1.jpg', String(T0), 'False', 'False', 'False', '0', 'False', 'False', 'True');      // offered
    push('addFile', 'd1', 'addrPeer', 'Bob', '', 'fd1', 'IMG_d1.jpg', String(T0 + 1), 'False', 'False', 'False', '40', 'False', 'False', 'True');  // downloading
    push('addFile', 'c1', 'addrPeer', 'Bob', '', 'fc1', 'IMG_c1.jpg', String(T0 + 2), 'False', 'False', 'False', '100', 'True', 'False', 'True');  // complete (received)
    push('addFile', 's1', 'addrPeer', 'Me', '', 'fs1', 'IMG_s1.jpg', String(T0 + 3), 'True', 'False', 'False', '30', 'False', 'False', 'True');    // mine, sending
    push('addFile', 'm1', 'addrPeer', 'Me', '', 'fm1', 'IMG_m1.jpg', String(T0 + 4), 'True', 'True', 'True', '100', 'True', 'False', 'True');     // mine, complete
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(60);
    const tile = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    const box = (el) => (el ? el.getAttribute('style') || '' : 'none');   // the inline geometry (jsdom drops a min() width from .style)
    const SQUARE = /aspect-ratio: 1( \/ 1)?;/;
    const ids = ['o1', 'd1', 'c1', 's1', 'm1'];
    const first = Object.fromEntries(ids.map((id) => [id, box(tile(id))]));
    const r = {};
    r.kinds = ids.map((id) => tile(id) && tile(id).dataset.file).join(',') === 'offer,progress,complete,progress,complete';
    r.squareFirstFrame = ids.every((id) => SQUARE.test(first[id]));
    r.oneSize = ids.every((id) => first[id] === first.m1);
    /* the offer is accepted, downloads, completes in place, takes a 3:2 preview, and its picture LOADS at 300 × 200 —
       the load path (media-bubble.js, no sender dims → fit to the natural size) is the one a completed download used
       to hit (mutant M1) */
    push('updateFile', 'fo1', '20', 'False');
    await sleep(20);
    const accepted = box(tile('o1'));
    push('updateFile', 'fo1', '100', 'True');
    push('updateFile', 'fd1', '100', 'True');
    push('updateFile', 'fs1', '100', 'True');
    await sleep(20);
    const flipped = Object.fromEntries(ids.map((id) => [id, box(tile(id))]));
    for (const id of ids) push('setFileThumb', id, jpegOf(300, 200));
    await sleep(30);
    for (const id of ids) {
      const img = tile(id).querySelector('.c-mbubble__img');
      Object.defineProperty(img, 'naturalWidth', { value: 300 }); Object.defineProperty(img, 'naturalHeight', { value: 200 });
      img.dispatchEvent(new W.Event('load'));
    }
    await sleep(30);
    r.acceptedSame = accepted === first.o1;
    r.flipSame = ids.every((id) => flipped[id] === first[id] && tile(id).dataset.file === 'complete');
    r.loadedSame = ids.every((id) => box(tile(id)) === first[id] && tile(id).dataset.state === 'loaded');
    /* a failed tile (the component, as the shell calls it) is the same square */
    const fr = W.Spixi.createImageFileBubble({ direction: 'received', name: 'IMG_f.jpg', state: 'failed' });
    r.failedSquare = box(fr.querySelector('.c-mbubble')) === first.m1;
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r2 R2-m1 + mutant M1 (the built chat shell): EVERY photo-file tile — offered · downloading · complete · mine sending · mine complete · failed — reserves the one 320 square from its FIRST frame, and nothing resizes it: not the accept, not the in-place flip to complete, not a 3:2 preview header, not the picture loading at its 300 × 200 natural size (a completed download went 294 × 220 → 294 × 294) — ' + JSON.stringify(r) + ' first=' + first.m1 + (errs.length ? ' errs=' + errs.slice(0, 2).join(' | ') : ''));
    dom.window.close();
  }

  /* ——— R2-m2 · M3 · M4: the A2 ring's gap on EVERY ground that has one, computed from the shipped tokens ——— */
  {
    const { dom, W, errs } = await boot('chat.html');
    const rootEl = W.document.documentElement;
    const resolveIn = (v, depth = 0) => {   // a value's var() references, as the live root computes them
      return String(v).replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g, (m, name, fb) => {
        const got = norm(W.getComputedStyle(rootEl).getPropertyValue(name));
        return depth < 8 ? (got ? resolveIn(got, depth + 1) : (fb || '')) : got;
      });
    };
    const tok = (name) => norm(resolveIn('var(' + name + ')'));
    const rgb = (v) => {
      let m = /^#([0-9a-f]{6})$/i.exec(v || '');
      if (m) return { c: [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)), a: 1 };
      m = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(v || '');
      return m ? { c: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) } : null;
    };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (x, y) => { const [p, q] = [lum(x), lum(y)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
    const over = (fg, bg) => fg.c.map((v, i) => Math.round(fg.a * v + (1 - fg.a) * bg[i]));
    /* the ground's colour under the middle of the log: the flat base, or a gradient's MIDDLE stop */
    const midOf = (grad) => {
      const lg = /linear-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)/.exec(grad);
      if (!lg) return rgb(tok('--chat-canvas-base'));
      const stops = lg[1].split(/,\s*(?![^()]*\))/).slice(1).map((s) => s.trim().split(/\s+/)[0]);
      return stops.length === 3 ? rgb(stops[1]) : null;
    };
    const GROUNDS = [['light', 'flat'], ['light', 'gradient'], ['light', 'green'], ['dark', 'flat'], ['dark', 'gradient']];
    const res = {}, r = {};
    const flatGap = {};
    for (const [theme, ground] of GROUNDS) {
      rootEl.setAttribute('data-theme', theme);
      rootEl.setAttribute('data-chat-ground', ground);
      const key = theme + ':' + ground;
      const grad = tok('--gradient-chat');
      const [blue, gap, band] = ['--outline-action-default', '--surface-select-row-gap', '--surface-select-row'].map((n) => rgb(tok(n)));
      const mid = midOf(grad);
      if (!(blue && gap && band && mid)) { r[key] = false; res[key] = 'unresolved ' + grad.slice(0, 80); continue; }
      const bandOnMid = over(band, mid.c);
      if (ground === 'flat') flatGap[theme] = gap.c.join();
      res[key] = { gap: gap.c, bandOnMid, ringOnGap: Math.round(cr(blue.c, gap.c) * 100) / 100, gradient: ground !== 'flat' && /linear-gradient/.test(grad) };
      /* the gap IS the band made opaque over THIS ground (±2 per channel), and the ring clears 3:1 on it */
      r[key] = gap.a === 1 && gap.c.every((v, i) => Math.abs(v - bandOnMid[i]) <= 2) && cr(blue.c, gap.c) >= 3
        && (ground === 'flat' || res[key].gradient);
    }
    /* every gradient has a gap of its own (a missing token inherits the flat one — the dark brand gradient's 1.13:1 seam) */
    r.ownGaps = GROUNDS.filter(([, g]) => g !== 'flat').every(([t, g]) => res[t + ':' + g].gap && res[t + ':' + g].gap.join() !== flatGap[t]);
    r.noErr = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #46 r2 R2-m2 + mutants M3 · M4 (computed, the shipped tokens in the built chat shell): on EVERY chat ground — light flat · brand gradient · green, dark flat · brand gradient — the A2 ring\'s 1 px gap is the select-row band made opaque over that ground (a gradient: its middle stop), its own token (never the flat one inherited), and the blue ring is ≥ 3:1 on it — ' + JSON.stringify(r) + ' ' + JSON.stringify(res));
    dom.window.close();
  }

  /* ——— the A-M1 guard (#46 r2 NIT): C# source pin — VoIPManager is MAUI- and Core-bound, scripts/csh cannot run it ——— */
  {
    const voip = stripCode(rd('Spixi/VoIP/VoIPManager.cs'));
    const end = voip.slice(voip.indexOf('private static void endVoIPSession()'), voip.indexOf('public static void acceptCall('));
    const iTry = end.search(/try\s*\{\s*if \(currentCallContact != null\)\s*\{\s*bool callAccepted =/);
    const iCount = end.indexOf('currentCallContact.metaData.unreadMessageCount++;');
    const iCatch = end.indexOf('Logging.error("Exception occured in endVoIPSession (call card): " + e);');
    const iMissed = end.indexOf('_SL("notification-missed-call")');
    const iReset = end.indexOf('currentCallContact = null;');
    const r = {
      /* the call card (endCall · the stores · the count) runs inside a try whose catch closes BEFORE the notification */
      cardGuarded: iTry > 0 && iCount > iTry && iCatch > iCount && /\}\s*catch \(Exception e\)\s*\{\s*Logging\.error\("Exception occured in endVoIPSession \(call card\): " \+ e\);\s*\}/.test(end),
      notifAfter: iMissed > iCatch && iReset > iMissed,
    };
    ok(Object.values(r).every(Boolean),
      '★ #46 r2 NIT · A-M1 guard (C# source pin — VoIPManager is MAUI- and Core-bound, scripts/csh cannot run it): endVoIPSession\'s call card — Core endCall, the stores and the missed-call count — runs inside its own try/catch, so a throw there can no longer skip the "Missed call" notification A-M1 moved after it, nor the call-field resets — ' + JSON.stringify(r));
  }
}
