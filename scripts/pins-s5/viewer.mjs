/* ==== SESSION 5b — ★ #1166 V-3 (VIEWER): the in-app viewer for a chat-info media tile (#1144 / #1145 (1)) +
 * "Delete from this device" / "Show in Downloads" on the long-press sheet (#1154) ====
 * Behaviour on the BUILT shells (jsdom: contact_details.html · downloads.html — the outgoing ixian: commands are
 * captured at the Location impl, the C# answers are executeUiCommand pushes); the C# guards (MAUI-bound, nothing can
 * execute them here) are pinned on stripCode source; the pure rules they call are EXECUTED by scripts/csh
 * (ViewerRulesTests.cs). Deliberate breaks (#802): see the hand-back. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const cs = (p) => stripCode(rd(p));
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const boot = async (name, waitMs = 1500) => {
    const f = join(htmlDir, name);
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        /* the bridge's sink is `location.href = "ixian:…"`: record it at the Location impl (the wrapper is unforgeable) */
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        /* the display-state mirror (cdoverlay) and the present signal are not commands under test */
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (!/^ixian:(cdoverlay|downloadsoverlay|painted|onload)/.test(c)) sent.push(c); } });
      },
    });
    await sleep(waitMs);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs, sent };
  };
  const T = Math.floor(Date.now() / 1000);
  /* a pin whose code under test is broken may THROW (a missing viewer / row) — that is a failure of that pin, never a crash */
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.message)); } };

  /* ——— 1. the viewer on the BUILT contact_details shell: tap → viewer + verb; viewerImage → picture / failure ——— */
  await guard('V-3 pin 1', async () => {
    const { dom, W, push, errs, sent } = await boot('contact_details.html');
    const d = W.document;
    push('setContext', 'chat'); push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); push('setNickname', 'Ana');
    await sleep(400);
    push('setSharedItems', JSON.stringify([
      ['a1', 0, 'media', 'IMG_1.jpg', 1000, T - 10, 1, PNG, 1],     // received, local
      ['a3', 0, 'media', 'IMG_3.jpg', 1000, T - 30, 0, null, 1],    // received, NOT on this device
    ]));
    await sleep(400);
    const tile = (id) => [...d.querySelectorAll('.c-shared__tile')][id === 'a1' ? 0 : 1];
    const viewer = () => [...d.querySelectorAll('.c-mviewer')].pop() || null;
    const r = {};
    r.labelOpen = /^Open: IMG_1\.jpg$/.test(tile('a1').getAttribute('aria-label') || '') && /^Show in chat: IMG_3\.jpg$/.test(tile('a3').getAttribute('aria-label') || '');
    sent.length = 0;
    tile('a1').click();
    await sleep(60);
    let v = viewer();
    r.tapOpensViewer = !!v && sent.join() === 'ixian:sharedView:a1:0';
    if (!v) { ok(false, '★ #1166 V-3 VIEWER: a local media tile tap opened no viewer — ' + JSON.stringify(r) + ' sent=' + sent.join()); return; }
    const img = v.querySelector('.c-mviewer__img');
    r.loading = !!v && v.getAttribute('aria-busy') === 'true' && !!v.querySelector('.c-mviewer__loading .c-mviewer__spinner') && !!img && img.getAttribute('src') === PNG;
    r.findOpen = W.Spixi.findOpenViewer('a1:0') === v && W.Spixi.findOpenViewer('a3:0') === null && W.Spixi.findOpenViewer('') === null;
    push('viewerImage', 'zz:0', JPEG);   // another token: lands nowhere
    r.otherTokenIgnored = img.getAttribute('src') === PNG && v.getAttribute('aria-busy') === 'true';
    push('viewerImage', 'a1:0', 'data:image/svg+xml;base64,PHN2Zz4=');   // not the jpeg shape → failure, the thumbnail stays
    r.badUriRefused = img.getAttribute('src') === PNG && v.getAttribute('aria-busy') === null && v.dataset.failed !== undefined;
    await sleep(80);
    r.failToast = [...d.querySelectorAll('.c-toast')].some((t) => /This image could not be opened\./.test(t.textContent));
    W.Spixi.dismissOverlay(v);
    await sleep(50);
    tile('a1').click();
    await sleep(60);
    v = viewer();
    const img2 = v.querySelector('.c-mviewer__img');
    push('viewerImage', 'a1:0', JPEG);
    r.setsPicture = img2.getAttribute('src') === JPEG && v.getAttribute('aria-busy') === null && !v.querySelector('.c-mviewer__loading');
    W.Spixi.dismissOverlay(v);
    await sleep(50);
    r.closedIsGone = W.Spixi.findOpenViewer('a1:0') === null;
    push('viewerImage', 'a1:0', '');   // late answer after close: nothing, no error
    sent.length = 0;
    tile('a3').click();
    await sleep(60);
    r.notLocalStillJumps = sent.join() === 'ixian:sharedOpen:a3:0' && !d.querySelector('.c-mviewer[aria-busy]');
    r.noErrors = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every((x) => x === true),
      '★ #1166 V-3 (#1144) VIEWER on the BUILT contact_details shell: a LOCAL media tile ("Open: …") opens the in-app viewer showing its thumbnail with a loading state (aria-busy, spinner) and sends ONLY `ixian:sharedView:<id>:<n>`; viewerImage lands only on the viewer open for THAT token (another token / a closed viewer = nothing); a data:image/jpeg URI replaces the thumbnail and ends the loading; "" or any other shape = failed: the thumbnail stays + the viewerFailed toast; a tile not on this device still jumps (sharedOpen) — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 2. the long-press sheet: Show in Downloads + Delete from this device for RECEIVED + LOCAL only; delete asks first ——— */
  await guard('V-3 pin 2', async () => {
    const { dom, W, push, errs, sent } = await boot('contact_details.html');
    const d = W.document;
    push('setContext', 'chat'); push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); push('setNickname', 'Ana');
    await sleep(400);
    const S = W.Spixi;
    const rows = [
      ['a1', 0, 'media', 'IMG_1.jpg', 1000, T - 10, 1, PNG, 1],   // received + local
      ['a2', 0, 'media', 'IMG_2.jpg', 1000, T - 20, 1, PNG, 0],   // SENT + local (my original)
      ['a3', 0, 'media', 'IMG_3.jpg', 1000, T - 30, 0, null, 1],  // received, not local
      ['b1', 0, 'file', 'doc.pdf', 1000, T - 40, 1, null, 1],     // received file + local
      ['a4', 0, 'media', 'IMG_4.jpg', 1000, T - 50, 1, PNG],      // an OLDER exe: 8 fields
    ];
    const items = S.parseSharedItems(JSON.stringify(rows));
    const actionsOf = (it) => {
      const sh = S.openSharedItemMenu({ item: it, host: d.body, strings: {}, onAction() {} });
      const a = [...sh.querySelectorAll('.c-msgmenu__item')].map((b) => b.dataset.action + (b.dataset.destructive !== undefined ? '!' : ''));
      S.closeSheet(sh);
      return a.join(',');
    };
    const r = {
      parsed: items.map((x) => x.received).join() === 'true,false,true,true,false',
      receivedLocal: actionsOf(items[0]) === 'open,show,downloads,delete!',
      sentNever: actionsOf(items[1]) === 'open,show',
      notLocal: actionsOf(items[2]) === 'show',
      file: actionsOf(items[3]) === 'open,show,downloads,delete!',
      olderExe: actionsOf(items[4]) === 'open,show',
    };
    await sleep(500);
    /* the shell's own menu (the long press = contextmenu) on the received local tile */
    push('setSharedItems', JSON.stringify(rows));
    await sleep(400);
    const tileA1 = () => d.querySelector('.c-shared__tile');
    const press = () => {   // a new gesture (pointerdown resets the menu's click swallow), then the long press
      tileA1().dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true, button: 2 }));
      tileA1().dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    };
    const item = (a) => [...d.querySelectorAll('.c-sheet .c-msgmenu__item')].filter((b) => b.dataset.action === a).pop();
    sent.length = 0;
    press(); await sleep(80);
    item('downloads').click(); await sleep(80);
    r.downloadsVerb = sent.join() === 'ixian:sharedShowInDownloads:a1:0';
    await sleep(500);
    sent.length = 0;
    press(); await sleep(80);
    item('delete').click(); await sleep(120);
    const modal = [...d.querySelectorAll('.c-modal[role="alertdialog"]')].pop();
    const btn = (m, re) => [...m.querySelectorAll('button')].find((b) => re.test(b.textContent));
    if (!modal || !btn(modal, /^Delete$/) || !btn(modal, /^Cancel$/)) { r.asksFirst = false; ok(false, '★ #1166 V-3 (#1154): "Delete from this device" opened no confirm with Cancel + Delete — ' + JSON.stringify(r) + ' sent=' + sent.join()); return; }
    r.asksFirst = !!modal && sent.length === 0 && /IMG_1\.jpg/.test(modal.textContent) && /Delete from this device\?/.test(modal.textContent);
    r.destructiveFill = !!modal && !!btn(modal, /^Delete$/) && btn(modal, /^Delete$/).dataset.intent === 'destructive';
    if (modal) btn(modal, /^Cancel$/).click();
    await sleep(500);
    r.cancelSendsNothing = sent.length === 0;
    press(); await sleep(80);
    item('delete').click(); await sleep(120);
    const modal2 = [...d.querySelectorAll('.c-modal[role="alertdialog"]')].pop();
    if (modal2) btn(modal2, /^Delete$/).click();
    await sleep(120);
    r.deleteVerb = sent.join() === 'ixian:sharedDeleteLocal:a1:0';
    /* C#'s re-push after the delete: the tile is no longer local (glyph, "Show in chat") */
    push('setSharedItems', JSON.stringify([['a1', 0, 'media', 'IMG_1.jpg', 1000, T - 10, 0, null, 1]].concat(rows.slice(1))));
    await sleep(500);
    r.rePushed = !!tileA1() && tileA1().dataset.glyph !== undefined && /^Show in chat:/.test(tileA1().getAttribute('aria-label') || '');
    r.noErrors = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every((x) => x === true),
      '★ #1166 V-3 (#1154) the chat-info long-press sheet on the BUILT shell: "Show in Downloads" + "Delete from this device" (destructive, last) ONLY for a RECEIVED item with a local copy (the appended 9th wire field; an older exe\'s 8-field row and a SENT original get neither); Open now also for a local image; Show in Downloads sends only `ixian:sharedShowInDownloads:<id>:<n>`; Delete asks first (alertdialog, the name, Cancel sends nothing, Delete = destructive fill) then sends only `ixian:sharedDeleteLocal:<id>:<n>`; the re-push repaints the tile — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 3. today's callers keep today's viewer (chat media bubbles, the chat-info avatar hero): no token = no loading ——— */
  await guard('V-3 pin 3', async () => {
    const { dom, W, errs } = await boot('chat.html', 1800);
    const d = W.document;
    const S = W.Spixi;
    const v = S.openMediaViewer({ host: d.body, src: PNG, alt: 'x', strings: {} });
    const img = v.querySelector('.c-mviewer__img');
    const r = {
      plain: img.getAttribute('src') === PNG && v.getAttribute('aria-busy') === null && !v.querySelector('.c-mviewer__loading') && v.dataset.loading === undefined,
      notFindable: S.findOpenViewer('') === null && S.findOpenViewer('undefined') === null,
      api: typeof v.setSrc === 'function' && typeof v.setFailed === 'function' && typeof S.findOpenViewer === 'function',
      /* the component's OWN belt: setSrc takes only the jpeg data URI shape, whatever a caller passes */
      setSrcRefuses: (() => { const e = S.openMediaViewer({ host: d.body, src: PNG, token: 'ef', strings: {} }); const t = e.setSrc('data:image/svg+xml;base64,PHN2Zz4=') === false && e.setSrc('javascript:alert(1)') === false && e.querySelector('.c-mviewer__img').getAttribute('src') === PNG && e.setSrc(JPEG) === true; S.dismissOverlay(e); return t; })(),
      emptyThumbNoSrc: (() => { const e = S.openMediaViewer({ host: d.body, src: '', token: 'ab', strings: {} }); const ok2 = !e.querySelector('.c-mviewer__img').hasAttribute('src') && S.findOpenViewer('ab') === e; S.dismissOverlay(e); return ok2; })(),
      newestWins: (() => { const a = S.openMediaViewer({ host: d.body, src: PNG, token: 'cd', strings: {} }); const b = S.openMediaViewer({ host: d.body, src: PNG, token: 'cd', strings: {} }); const w = S.findOpenViewer('cd') === b; S.dismissOverlay(b); const w2 = S.findOpenViewer('cd') === a; S.dismissOverlay(a); return w && w2; })(),
      /* the loading spinner: reduced motion = static (no animation at all) */
      reducedStatic: (() => { for (const sh of [...d.styleSheets]) for (const x of [...(sh.cssRules || [])]) if (x.media && /prefers-reduced-motion: reduce/.test(x.media.mediaText)) for (const y of [...x.cssRules]) if (y.selectorText === '.c-mviewer__spinner' && y.style.getPropertyValue('animation') === 'none') return true; return false; })(),
      noErrors: errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0,
    };
    S.dismissOverlay(v);
    ok(Object.values(r).every((x) => x === true),
      '★ #1166 V-3 media-viewer.js (the §3.1 API MEDIA calls from chat.html): openMediaViewer WITHOUT a token is today\'s viewer (no loading state — the chat media bubbles and the chat-info avatar hero are unchanged); with a token it is findable by findOpenViewer (the newest open one; never after close) and an empty thumbnail sets no src; el.setSrc / el.setFailed exist; the spinner is static under reduced motion — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 4. highlightDownload on the BUILT downloads shell ——— */
  await guard('V-3 pin 4', async () => {
    const { dom, W, push, errs } = await boot('downloads.html');
    const d = W.document;
    push('clearFiles');
    push('addFile', 'a.pdf', String(T - 3));
    push('addFile', 'IMG_1.jpg', String(T - 2));
    push('addFile', 'old-IMG_1.jpg', String(T - 4));   // a name that CONTAINS the key: never marked
    push('highlightDownload', 'IMG_1.jpg');
    push('addFile', 'c.txt', String(T - 1));   // a row after the highlight push (the second onLoad burst order)
    await sleep(300);
    const marked = () => [...d.querySelectorAll('.c-settings-dl__row[data-highlight]')].map((x) => x.dataset.name).join();
    const r = { one: marked() === 'IMG_1.jpg' };
    push('clearFiles'); push('addFile', 'a.pdf', String(T - 3)); push('addFile', 'IMG_1.jpg', String(T - 2));
    await sleep(300);
    r.survivesRePush = marked() === 'IMG_1.jpg';
    push('highlightDownload', 'nope"]*');
    await sleep(300);
    r.unknownNameMarksNothing = marked() === '' && errs.length === 0;
    r.css = /\.c-settings-dl__row\[data-highlight\]\s*\{\s*background-color: var\(--surface-action-tonal-default\);\s*\}/.test(rd('Spixi/Resources/Raw/html/downloads.html'));
    ok(Object.values(r).every((x) => x === true),
      '★ #1166 V-3 (#1154) Show in Downloads on the BUILT downloads shell: highlightDownload(<the list\'s own row key — the file name>) marks exactly that row after the settled list (string equality, never a selector built from the name), survives the second onLoad re-push, and an unknown name marks nothing — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 5. C# guards (MAUI-bound — source pins; the rules themselves run in scripts/csh) ——— */
  await guard('V-3 pin 5', async () => {
    const cd = cs('Spixi/Pages/Contacts/ContactDetails.xaml.cs');
    const view = cd.slice(cd.indexOf('else if (current_url.StartsWith("ixian:sharedView:"'), cd.indexOf('else if (current_url.StartsWith("ixian:sharedDeleteLocal:"'));
    const del = cd.slice(cd.indexOf('else if (current_url.StartsWith("ixian:sharedDeleteLocal:"'), cd.indexOf('else if (current_url.StartsWith("ixian:sharedShowInDownloads:"'));
    const dl = cd.slice(cd.indexOf('else if (current_url.StartsWith("ixian:sharedShowInDownloads:"'), cd.indexOf('else if (current_url.StartsWith("ixian:signSend:"'));
    const logs = (t) => (t.match(/Logging\.\w+\(([^;]*)\);/g) || []);
    const r = {
      anchors: view.length > 200 && del.length > 200 && dl.length > 100,
      viewTokenGrammar: /string token = current_url\.Substring\("ixian:sharedView:"\.Length\);\s*if \(!ViewerRules\.isItemToken\(token\)\)/.test(view),
      /* (#46 r1 A-M1) the path is resolved FRESH inside the task from the message (localPathOf), never the scan's item.path */
      viewFreshPath: /string\? path = item != null && item\.message != null && ViewerRules\.mayView\(item\.kind, item\.path != null\)\s*\? SharedItems\.localPathOf\(item\.message\) : null;/.test(view)
        && view.indexOf('SharedItems.localPathOf(item.message)') > view.indexOf('Task.Run(') && !/dataUriOf\w*\(item\.path/.test(view),
      /* the decode is INSIDE Task.Run, the push INSIDE BeginInvokeOnMainThread behind the isDisposed check */
      /* the decode is INSIDE Task.Run (async, the gate AWAITED, #46 r1 A-M2), latest-token-wins, the push INSIDE BeginInvokeOnMainThread behind the isDisposed check */
      viewOffUi: /viewerLatest = token;\s*System\.Threading\.Tasks\.Task\.Run\(async \(\) =>\s*\{\s*Func<bool> stillWanted = \(\) => token == page\.viewerLatest && !page\.isDisposed;/.test(view)
        && /string uri = path != null \? \(await ViewerImage\.dataUriOfAsync\(path, stillWanted\) \?\? ""\) : "";\s*if \(!stillWanted\(\)\)\s*\{\s*return;\s*\}\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(page\.isDisposed\)\s*\{\s*return;\s*\}\s*Utils\.sendUiCommand\(page, "viewerImage", token, uri\);/.test(view)
        && (view.match(/ViewerImage\.dataUriOf/g) || []).length === 1 && /private volatile string\? viewerLatest = null;/.test(cd),
      delOffUi: /System\.Threading\.Tasks\.Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*if \(!SharedItems\.deleteLocal\(item\)\)/.test(del)
        && /string json = SharedItems\.toJson\(SharedItems\.scan\(scanned\)\);/.test(del) && /if \(page\.isDisposed\)\s*\{\s*return;\s*\}\s*Utils\.sendUiCommand\(page, "setSharedItems", json\);/.test(del)
        && !/File\.Delete/.test(del),
      dlNameOnly: /string\? name = SharedItems\.downloadsNameOf\(item\);/.test(dl) && /pushPageLoaded\(new DownloadsPage\(name\)\);/.test(dl) && !/item\.path/.test(dl),
      /* no path, name, label or id in a push or a log of the three verbs */
      noPathInPushes: !/sendUiCommand\([^;]*(path|label|item\.id|name)\b/.test(view + del) ,
      logsTypeOrLen: [view, del, dl].every((t) => logs(t).every((l) => !/\b(path|label|name|item\.id|token\))\b/.test(l.replace(/"[^"]*"/g, '')) || /token\.Length/.test(l))),
    };
    const si = cs('Spixi/Utils/SharedItems.cs');
    const dfn = si.slice(si.indexOf('public static bool deleteLocal('), si.indexOf('public static string? downloadsNameOf('));
    const nfn = si.slice(si.indexOf('public static string? downloadsNameOf('), si.indexOf('public static SharedItem? resolve('));
    Object.assign(r, {
      receivedOnly: /if \(item == null \|\| item\.message == null \|\| item\.message\.localSender\)\s*\{\s*return false;\s*\}/.test(dfn),
      downloadsRoot: /bool inside = p != null && TransferManager\.isInsideDownloadsRoot\(p\);\s*if \(!ViewerRules\.mayDeleteLocal\(item\.kind, item\.received, p != null, inside\) \|\| p == null\)\s*\{\s*return false;\s*\}/.test(dfn),
      stillThisFile: /if \(!File\.Exists\(p\) \|\| !fileMatches\(item\.message, p\)\)\s*\{\s*return false;\s*\}\s*File\.Delete\(p\);\s*return true;/.test(dfn),
      oneDeleteInFile: (si.match(/File\.Delete\(/g) || []).length === 1,
      /* SharedItems logs counts only (the #1106 rule): an IO failure throws to ContactDetails, which logs the TYPE */
      delLogType: !/Logging\./.test(dfn) && /catch \(Exception ex\)\s*\{\s*Logging\.warn\("ixian:sharedDeleteLocal: " \+ ex\.GetType\(\)\.Name\);/.test(del),
      nameRule: /item\.message\.localSender/.test(nfn) && /ViewerRules\.mayShowInDownloads\(item\.kind, item\.received, p != null, inside\)/.test(nfn) && /string name = Path\.GetFileName\(p\);/.test(nfn),
      tupleAppended: /new object\?\[\] \{ x\.id, x\.n, x\.kind, x\.label, x\.size, x\.ts, x\.local \? 1 : 0, x\.thumb, x\.received \? 1 : 0 \}/.test(si) && /received = !fm\.localSender, message = fm,/.test(si)
        && /\[JsonIgnore\] public FriendMessage\? message = null;/.test(si),
    });
    const vi = cs('Spixi/Utils/ViewerImage.cs');
    Object.assign(r, {
      viSignature: /public const int MaxEdge = 1600;/.test(vi) && /public const long SourceMax = SharedItems\.ThumbSourceMax;/.test(vi) && /public const int MaxJpegBytes = 1_200_000;/.test(vi) && /public static string\? dataUriOf\(string path\)/.test(vi),
      viSniffCapFirst: vi.indexOf('ViewerRules.viewerSourceOk(SharedItems.readHead(fi.FullName), fi.Length, SourceMax)') > -1
        && /string\? full = sourceOf\(path\);/.test(vi.slice(vi.indexOf('dataUriOf(string path)'))) && /string\? full = sourceOf\(path\);/.test(vi.slice(vi.indexOf('dataUriOfAsync('))),
      viOneAtATime: /if \(full == null \|\| !decodeGate\.Wait\(GateWaitMs\)\)\s*\{\s*return null;\s*\}/.test(vi) && /finally\s*\{\s*decodeGate\.Release\(\);\s*\}/.test(vi),
      /* (#46 r1 A-M2) the async form AWAITS the gate (no parked pool thread) and asks stillWanted AFTER holding it: an unwanted tap releases and decodes nothing */
      viAsyncGate: /public static async System\.Threading\.Tasks\.Task<string\?> dataUriOfAsync\(string path, Func<bool> stillWanted\)/.test(vi)
        && /if \(!await decodeGate\.WaitAsync\(GateWaitMs\)\.ConfigureAwait\(false\)\)\s*\{\s*return null;\s*\}\s*bool wanted;\s*try\s*\{\s*wanted = stillWanted\(\);\s*\}\s*catch \(Exception\)\s*\{\s*wanted = false;\s*\}\s*if \(!wanted\)\s*\{\s*decodeGate\.Release\(\);\s*return null;\s*\}\s*return decodeHeld\(full\);/.test(vi)   /* #46 r2 NIT-1 re-base: a throwing stillWanted releases the slot */
        && !/decodeGate\.Wait\(/.test(vi.slice(vi.indexOf('dataUriOfAsync('), vi.indexOf('private static string? sourceOf('))),
      /* (#46 r1 C-N4) every close path clears the wait timer and drops the viewer from openViewers */
      mvCloseCleans: /const onClosed = \(\) => \{\s*if \(waitT\) \{ clearTimeout\(waitT\); waitT = 0; \}\s*openViewers\.delete\(el\);\s*\};\s*setOverlayOpts\(el, \{ host, lightDismiss: true, escDismiss: true, onDismiss: onClosed \}\);/.test(stripCode(rd('src/components/media-viewer.js'))),
      viResultCap: /if \(jpeg == null \|\| !ViewerRules\.viewerJpegOk\(jpeg\.Length, MaxJpegBytes\)\)/.test(vi) && /return "data:image\/jpeg;base64," \+ Convert\.ToBase64String\(jpeg\);/.test(vi),
      viNoLog: !/Logging\./.test(vi),
    });
    /* the four platform decoders: the viewer entry exists, bounded, q82 */
    const and = cs('Spixi/Platforms/Android/SThumbnail.cs');
    const ios = cs('Spixi/Platforms/iOS/SThumbnail.cs');
    const mac = cs('Spixi/Platforms/MacCatalyst/SThumbnail.cs');
    const win = cs('Spixi/Platforms/Windows/SThumbnail.cs');
    const sig = /public static byte\[\]\? makeViewerJpeg\(string path, int maxEdge\)/;
    Object.assign(r, {
      allFour: [and, ios, mac, win].every((t) => sig.test(t)),
      androidBounded: /int decodeCap = Math\.Min\(maxEdge \* 2, MaxLongSide\);\s*int sample = 1;\s*while \(longSide \/ sample > decodeCap\)/.test(and) && /InJustDecodeBounds = true/.test(and.slice(and.indexOf('makeViewerJpeg')))
        && /applyOrientation\(m, exifOrientation\(path\)\);/.test(and) && /Compress\(Bitmap\.CompressFormat\.Jpeg!, 82, ms\)/.test(and),
      appleBounded: [ios, mac].every((t) => /MaxPixelSize = Math\.Min\(maxEdge, MaxLongSide\),/.test(t) && /CreateThumbnailWithTransform = true,/.test(t.slice(t.indexOf('makeViewerJpeg'))) && /AsJPEG\(0\.82f\)/.test(t)),
      windowsBounded: /ScaledWidth = sw,\s*ScaledHeight = sh,/.test(win.slice(win.indexOf('makeViewerAsync'))) && /SPIXI\.ViewerRules\.orientBgra\(raw, \(int\)sw, \(int\)sh, orientation, out int ow, out int oh\)/.test(win)
        && /new BitmapTypedValue\(0\.82, Windows\.Foundation\.PropertyType\.Single\)/.test(win),
    });
    const dp = cs('Spixi/Pages/Downloads/DownloadsPage.xaml.cs');
    r.downloadsOneShot = /if \(highlightName != null\)\s*\{\s*string name = highlightName;\s*highlightName = null;\s*Utils\.sendUiCommand\(this, "highlightDownload", name\);/.test(dp);
    ok(Object.values(r).every((x) => x === true),
      '★ #1166 V-3 C# guards: sharedView echoes only a token of the item grammar and decodes C#\'s OWN path (resolve → mayView) OFF the UI thread, pushing viewerImage on the main thread unless the page is torn down; sharedDeleteLocal deletes ONLY a RECEIVED file (a sent original never) inside the Downloads root that is still this message\'s file — one File.Delete in SharedItems, rescan + re-push off the UI thread; Show in Downloads opens DownloadsPage with the list\'s own key (a file NAME, never a path) one-shot; the 9th tuple field is APPENDED; ViewerImage = sniff + 20 MB cap BEFORE the decode, one decode at a time, ≤ 1.2 MB, no log; makeViewerJpeg on all four platforms, bounded, q82; no path / name / id in a push or a log — ' + JSON.stringify(r));
  });
}
