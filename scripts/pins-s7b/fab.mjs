/* ==== SESSION 7b (S2) — ★ 7b (#1218 F2) THE FAB LAYER + (#1217 H2) THE HOVER REPLY DISC ====
 * On the BUILT chat.html (jsdom):
 *   · #1218: the computed z-index of .c-scroll-latest and .chat-mention-fab (resolved through the tokens) is ABOVE the
 *     computed z-index of a photo tile's stamp / picture and the hover reply disc (the same stacking context: the canvas
 *     and the scroller are z-index auto) and BELOW the composer, the mention list, the scrim, the lifted row and sheets;
 *     plus a source sweep: EVERY z-index in the built CSS on a bubble-internal selector (c-mbubble · c-bubble · c-voice ·
 *     c-fbubble · c-tcard · reaction) is a plain integer below the FAB's — a new one cannot climb over it silently
 *   · #1217: on desktop the hover disc resolves to the menu surface + elevation 2 + the action icon colour, 36 × 36, and
 *     placeReplyButton centres it from its MEASURED width (a 36 px disc beside a 60 px bubble → y = top + 12)
 * Deliberate breaks: see the 7b hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 3600;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  try {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const html = readFileSync(f, 'utf8');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
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
    d.documentElement.setAttribute('data-desktop', '');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const rootCs = () => W.getComputedStyle(d.documentElement);
    const resolve = (v, depth = 0) => {   // var(--x[, fb]) → the token's value, recursively
      const m = /^var\((--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(String(v).trim());
      if (!m || depth > 8) return String(v).trim();
      const t = rootCs().getPropertyValue(m[1]).trim();
      return resolve(t || (m[2] || '').trim(), depth + 1);
    };
    const z = (el) => (el ? Number(resolve(W.getComputedStyle(el).getPropertyValue('z-index'))) : NaN);
    const tok = (name) => Number(resolve('var(' + name + ')'));
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setCaps', 'reply');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'pp01', 'addrMe', 'Me', '', 'fp1', 'IMG_1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '');
    push('addMe', 'tt01', 'addrMe', 'Me', '', 'hello', String(T0 + 60), 'True', 'True', 'True', 'False', 'False');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(120);
    push('setFileThumb', 'pp01', JPEG);
    await sleep(120);
    const fab = d.querySelector('.c-scroll-latest');
    const mfab = d.querySelector('.chat-mention-fab');
    const tile = d.querySelector('#messages [data-msgid="pp01"] .c-mbubble');
    const stamp = tile && tile.querySelector('.c-mbubble__stamp, .c-mbubble__time');
    const img = tile && tile.querySelector('.c-mbubble__img');
    const textRow = d.querySelector('#messages [data-msgid="tt01"]');
    const btn = textRow && textRow.querySelector(':scope > .c-bubble-row__reply');
    const zf = z(fab);
    const r = {
      fabIsToken: zf === tok('--z-10'),
      mentionSame: z(mfab) === zf,
      overStamp: z(stamp) >= 1 && zf > z(stamp),
      overPicture: z(img) >= 1 && zf > z(img),
      overHoverDisc: z(btn) >= 1 && zf > z(btn),
      underComposer: zf < tok('--z-20') && zf < tok('--z-30') && zf < tok('--z-40') && zf < tok('--z-42') && zf < tok('--z-44'),
    };
    /* the source sweep over the built CSS */
    const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    const internals = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const zm = /(?:^|;)\s*z-index\s*:\s*([^;]+)/.exec(m[2]);
      if (zm && /c-mbubble|c-bubble|c-voice|c-fbubble|c-tcard|reaction/.test(m[1])) internals.push([m[1].trim(), zm[1].trim()]);
    }
    const climbers = internals.filter(([, v]) => !/^-?\d+$/.test(v) || Number(v) >= zf);
    r.sweep = internals.length >= 4 && climbers.length === 0;
    /* #1217 H2 */
    const bs = btn ? W.getComputedStyle(btn) : null;
    r.h2Surface = !!bs && /var\(--surface-menu\)/.test(bs.getPropertyValue('background') + bs.getPropertyValue('background-color'));
    r.h2Lift = !!bs && /var\(--elevation-2\)/.test(bs.getPropertyValue('box-shadow'));
    r.h2Icon = !!bs && /var\(--icon-action-default\)/.test(bs.getPropertyValue('color'));
    r.h2Size = !!bs && bs.getPropertyValue('width') === '36px' && bs.getPropertyValue('height') === '36px';
    /* #46 r1 M27: the disc's states from the BUILT CSSOM — :hover (inside the hover-capable media) = --icon-action-hover,
       :active = --icon-action-pressed (jsdom applies no :hover, so the rules themselves are read) */
    const flat = [];
    const walk = (rules, media) => { for (const ru of Array.from(rules || [])) { if (ru.cssRules && ru.media) walk(ru.cssRules, ru.media.mediaText); else if (ru.selectorText) flat.push({ sel: ru.selectorText, color: ru.style.getPropertyValue('color'), media }); } };
    for (const sh of Array.from(d.styleSheets)) { try { walk(sh.cssRules, ''); } catch (e) {} }
    const stateRule = (pseudo) => flat.filter((x) => x.sel.split(',').some((s) => s.trim() === ':root[data-desktop] .c-bubble-row__reply' + pseudo));
    const hov = stateRule(':hover');
    const act = stateRule(':active');
    r.m27Hover = hov.length === 1 && /var\(--icon-action-hover\)/.test(hov[0].color) && /hover:\s*hover/.test(hov[0].media) && /pointer:\s*fine/.test(hov[0].media);
    r.m27Active = act.length === 1 && /var\(--icon-action-pressed\)/.test(act[0].color);
    let place = '';
    if (btn) {
      const bubble = W.Spixi.messageMenuTarget(textRow);
      const rect = (o) => () => ({ left: o.left, top: o.top, right: o.left + o.width, bottom: o.top + o.height, width: o.width, height: o.height, x: o.left, y: o.top });
      textRow.getBoundingClientRect = rect({ left: 0, top: 0, width: 400, height: 80 });
      if (bubble) bubble.getBoundingClientRect = rect({ left: 200, top: 10, width: 180, height: 60 });
      Object.defineProperty(btn, 'offsetWidth', { configurable: true, get: () => parseFloat(W.getComputedStyle(btn).width) || 0 });
      W.Spixi.placeReplyButton(textRow);
      place = textRow.style.getPropertyValue('--reply-btn-x') + ',' + textRow.style.getPropertyValue('--reply-btn-y');
    }
    r.h2Centred = place === '160px,22px';   // sent: 200 − 36 − 4 = 160 · 10 + (60 − 36) / 2 = 22
    r.noErr = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1218 F2 + #1217 H2) on the BUILT chat shell: the scroll-to-latest chevron and the @ FAB sit on --z-10 — above a photo tile\'s stamp and picture and the hover reply disc (z-index 1, the same stacking context: the bug was the time pill over the chevron), below the composer, menus, scrim, lifted row and sheets; every bubble-internal z-index in the built CSS is an integer below it; the desktop hover disc is the menu surface + elevation 2 + the action icon, 36 × 36, centred from its measured width; its :hover (hover-capable media) is --icon-action-hover and its :active --icon-action-pressed (#46 r1 M27) — '
      + JSON.stringify(r) + ' z=' + [zf, z(mfab), z(stamp), z(img), z(btn)].join('/') + ' place=' + place + ' climbers=' + JSON.stringify(climbers) + ' ' + errs.slice(0, 2).join(' | '));
    dom.window.close();
  } catch (e) { ok(false, '#1218 fab THREW: ' + (e && e.stack || e)); }
}
