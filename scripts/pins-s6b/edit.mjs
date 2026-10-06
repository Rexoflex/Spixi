/* ==== SESSION 6b — ★ #1199 EDIT (S6): the shell half of message editing, EXECUTED on the BUILT chat.html (jsdom;
 * C# pushes via executeUiCommand; outgoing ixian: commands captured at the Location href setter).
 *   · the offer: Edit only with setCaps `edit`, only on MY text < 24 h — never on a received text, a file card, a
 *     GIF / image URL tile, a failed send, a message older than 24 h
 *   · edit mode: the strip ("Edit message"), the input PREFILLED with the body and focused, the button named "Save"
 *     (disabled on an empty field), Save sends EXACTLY ixian:chatedit:<id>:<urlenc>, the earlier draft comes back;
 *     Escape cancels and restores the earlier draft; an unchanged body sends nothing; no optimistic repaint (a
 *     refused edit = C# re-pushes the current state → the row shows what C# says)
 *   · the "edited" marker: from addMe arg 14 and from updateMessage arg 8 (the new text replaces the old on a SENT
 *     row — past the surgical tick path); a later 7-arg status updateMessage (old exe) KEEPS it; an 11-arg push with
 *     edited "" (C#'s explicit answer) drops it — the DECIDED rule (upsertText `fullForm`)
 * Deliberate breaks: see the hand-back (each named key went red, restored green). */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;

  const boot = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    vc.on('error', (...a) => { const m = a.map(String).join(' '); if (/dispatch failed|Error/.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d: W.document, push, errs, sent };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.stack || e)); } };
  const closeAll = (W) => { for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } } };
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const strip = (d) => d.querySelector('.c-composer__ctx');
  const input = (d) => d.querySelector('.c-composer__input');
  const action = (d) => d.querySelector('.c-composer__action');
  const menuItems = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    if (!t) return [];
    const init = { bubbles: true, cancelable: true, clientX: 5, clientY: 5, button: 2, pointerType: 'mouse', pointerId: 1 };
    const pd = typeof W.PointerEvent === 'function' ? new W.PointerEvent('pointerdown', init) : new W.MouseEvent('pointerdown', init);
    if (pd.pointerType !== 'mouse') Object.defineProperty(pd, 'pointerType', { value: 'mouse' });
    t.dispatchEvent(pd);
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const sheets = [...d.querySelectorAll('.c-msgmenu')];
    const m = sheets[sheets.length - 1];
    return m ? [...m.querySelectorAll('.c-msgmenu__item')] : [];
  };
  const hasEdit = async (W, d, id) => { const l = (await menuItems(W, d, id)).map((b) => b.textContent.trim()); closeAll(W); await sleep(650); return l.includes('Edit'); };
  const pickEdit = async (W, d, id) => {
    const it = (await menuItems(W, d, id)).find((b) => b.textContent.trim() === 'Edit');
    if (it) it.click();
    await sleep(60);
    closeAll(W);
    await sleep(20);
    return !!it;
  };
  const type = (W, d, v) => { input(d).value = v; input(d).dispatchEvent(new W.Event('input')); };

  const open = async (caps) => {
    const s = await boot();
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    if (caps) s.push('setCaps', caps);
    s.push('clearMessages', 'false');
    s.push('addThem', 'ee01', 'addrPeer', 'Bob', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'ee02', 'addrMe', 'Me', '', 'my first words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    s.push('addMe', 'ee03', 'addrMe', 'Me', '', 'yesterday words', String(NOW - 25 * 3600), 'True', 'True', 'True', 'False', 'False');
    s.push('addFile', 'ee04', 'addrMe', 'Me', '', 'f04', 'mine.pdf', String(T0 + 120), 'True', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
    s.push('addMe', 'ee05', 'addrMe', 'Me', '', 'https://media.tenor.com/abc/x.gif', String(T0 + 180), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'ee06', 'addrMe', 'Me', '', 'did not go', String(T0 + 240), 'False', 'False', 'False', 'False', 'True');
    s.push('addMe', 'ee07', 'addrMe', 'Me', '', 'edited before', String(T0 + 300), 'True', 'True', 'True', 'False', 'False', '', '', '1', '', '');
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(350);
    return s;
  };

  /* ——— 1. who is offered Edit ——— */
  await guard('#1199 offer', async () => {
    const r = {};
    {
      const s = await open('reply');
      r.offNone = !(await hasEdit(s.W, s.d, 'ee02'));
      r.offNoErr = noErr(s.errs);
      s.dom.window.close();
    }
    {
      const s = await open('reply,edit');
      const { W, d } = s;
      r.rows = ['ee01', 'ee02', 'ee03', 'ee04', 'ee05', 'ee06', 'ee07'].every((id) => !!rowOf(d, id));
      r.ownText = await hasEdit(W, d, 'ee02');
      r.notReceived = !(await hasEdit(W, d, 'ee01'));
      r.notOver24h = !(await hasEdit(W, d, 'ee03'));
      r.notFile = !(await hasEdit(W, d, 'ee04'));
      r.notGif = !(await hasEdit(W, d, 'ee05'));
      r.notFailed = !(await hasEdit(W, d, 'ee06'));
      r.editedAgain = await hasEdit(W, d, 'ee07');
      /* ★ r2 (MAJOR-2): the C# "newest messages" rule mirrored — ee02 has 4 newer message rows; 20 more = 24 → Edit;
         one more = 25 → no Edit (an event chip does not count) */
      for (let i = 0; i < 20; i++) s.push('addThem', 'nw' + i, 'addrPeer', 'Bob', '', 'newer ' + i, String(T0 + 400 + i), 'True', 'True', 'True', 'False', 'False');
      await sleep(120);
      r.newer24Edit = await hasEdit(W, d, 'ee02');
      s.push('addThem', 'nwX', 'addrPeer', 'Bob', '', 'one more', String(T0 + 500), 'True', 'True', 'True', 'False', 'False');
      await sleep(120);
      r.newer25NoEdit = !(await hasEdit(W, d, 'ee02'));
      r.newestStillEdit = await hasEdit(W, d, 'ee07');
      r.onNoErr = noErr(s.errs);
      s.dom.window.close();
    }
    ok(Object.values(r).every((x) => x === true),
      '★★ #1199 EDIT OFFER on the built chat shell: no setCaps `edit` → no Edit anywhere; with `edit` → Edit on MY text inside 24 h (an already-edited one too), and NOT on a received text, my text older than 24 h, my file card, my GIF URL tile, or my failed send; r2: not once 25 or more message rows are newer (24 still offers it) — ' + JSON.stringify(r));
  });

  /* ——— 2. edit mode: prefill · Save · Escape · the draft ——— */
  await guard('#1199 mode', async () => {
    const s = await open('reply,edit');
    const { W, d, push } = s;
    const r = {};
    let refusals = 0;   // every "can no longer be edited" toast that APPEARS (the toast host queues, so count insertions)
    new W.MutationObserver((muts) => { for (const m of muts) for (const nd of m.addedNodes) if (nd.nodeType === 1 && /can no longer be edited/.test(nd.textContent || '')) refusals++; })
      .observe(d.body, { childList: true, subtree: true });
    type(W, d, 'my unsent draft');
    r.picked = await pickEdit(W, d, 'ee02');
    const st = strip(d);
    r.strip = !!st && st.dataset.kind === 'edit' && /Edit message/.test(st.textContent) && /my first words/.test(st.textContent);
    r.prefill = input(d).value === 'my first words';
    r.focus = d.activeElement === input(d);
    r.saveName = action(d).getAttribute('aria-label') === 'Save';
    r.unchangedDisabled = action(d).disabled === true;   // ★ r1 (N-6): the untouched body is not a save
    type(W, d, 'my first words!');
    r.changedEnabled = action(d).disabled === false;
    type(W, d, '   ');
    r.emptyDisables = action(d).disabled === true;
    type(W, d, 'my better words & more');
    const before = s.sent.length;
    action(d).click();
    await sleep(40);
    const out = s.sent.slice(before).filter((c) => !/^ixian:chatoverlay:/.test(c));   // ★ 7b (#1219) re-base: the strip's close re-syncs the back mirror
    r.saveExact = out.length === 1 && out[0] === 'ixian:chatedit:ee02:' + encodeURIComponent('my better words & more');
    r.draftBack = input(d).value === 'my unsent draft' && !strip(d);
    r.sendNameBack = action(d).getAttribute('aria-label') === 'Send';
    r.noOptimistic = /my first words/.test(rowOf(d, 'ee02').textContent) && !rowOf(d, 'ee02').querySelector('.c-bubble__edited');
    /* C# REFUSED: it re-pushes the row's current state (11 args, edited "") → the row shows exactly that */
    push('updateMessage', 'ee02', 'my first words', 'True', 'True', 'True', 'False', 'False', '', '', '', '');
    await sleep(80);
    r.refusedShowsCsharp = /my first words/.test(rowOf(d, 'ee02').textContent) && !rowOf(d, 'ee02').querySelector('.c-bubble__edited');
    /* ★★ r2 (MAJOR-2): that re-push carried a DIFFERENT body than the Save — C# refused: the toast, and the typed text back
       in the field ABOVE the draft the edit had given back (nothing the user typed is lost) */
    r.csRefusalToast = refusals === 1;
    r.csRefusalText = input(d).value === 'my better words & more\nmy unsent draft' && !strip(d);
    /* a Save C# ACCEPTS: the updateMessage carries the sent body → no toast, the field untouched */
    type(W, d, '');
    await pickEdit(W, d, 'ee07');
    type(W, d, 'edited before, now better');
    action(d).click();
    await sleep(40);
    push('updateMessage', 'ee07', 'edited before, now better', 'True', 'True', 'True', 'False', 'False', '1', '', '', '');
    await sleep(3300);
    r.acceptNoToast = refusals === 1 && input(d).value === '';
    /* ★ #46 r3 MINOR-1: a QUOTE-SHAPED edit lands as its BODY (C# turns the quote line into the box) → still accepted */
    await pickEdit(W, d, 'ee07');
    type(W, d, '> Ann: hi there\nquoted now');
    action(d).click();
    await sleep(40);
    push('updateMessage', 'ee07', 'quoted now', 'True', 'True', 'True', 'False', 'False', '1', '', 'Ann', 'hi there');
    await sleep(3300);
    r.quoteShapedAccepted = refusals === 1 && input(d).value === '';
    /* ★ #46 r4 MINOR-1 (+ NIT-1): an edit that only ADDS a quote line above the UNCHANGED body, refused by C# (it re-pushes
       the old body with no quote) → still a refusal; the same edit landing (the answer carries the quote) → accepted */
    await pickEdit(W, d, 'ee07');
    type(W, d, '> Ann: hi there\nquoted now');
    r.unchangedBodyQuoteEnabled = action(d).disabled === false;
    action(d).click();
    await sleep(40);
    push('updateMessage', 'ee07', 'quoted now', 'True', 'True', 'True', 'False', 'False', '1', '', '', '');
    await sleep(80);
    r.quoteOnlyRefused = refusals === 2 && /^> Ann: hi there\nquoted now/.test(input(d).value);
    type(W, d, '');
    await pickEdit(W, d, 'ee07');
    type(W, d, '> Ann: hi there\nquoted now');
    action(d).click();
    await sleep(40);
    push('updateMessage', 'ee07', 'quoted now', 'True', 'True', 'True', 'False', 'False', '1', '', 'Ann', 'hi there');
    await sleep(3300);
    r.quoteOnlyLanded = refusals === 2 && input(d).value === '';
    /* a Save C# NEVER answers: refused after 3 s */
    await pickEdit(W, d, 'ee07');
    type(W, d, 'third version');
    action(d).click();
    await sleep(2500);
    r.silentNotYet = refusals === 2;
    await sleep(800);
    r.silentRefused = refusals === 3 && input(d).value === 'third version';
    /* Escape cancels: the draft that was in the field comes back */
    type(W, d, 'second draft');
    await pickEdit(W, d, 'ee02');
    r.prefill2 = input(d).value === 'my first words';
    type(W, d, 'abandoned change');
    input(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(20);
    r.escRestores = input(d).value === 'second draft' && !strip(d) && action(d).getAttribute('aria-label') === 'Send';
    /* an unchanged body sends nothing: Save is disabled and the edit stays open */
    await pickEdit(W, d, 'ee02');
    const before2 = s.sent.length;
    action(d).click();
    await sleep(40);
    r.unchangedNoSend = action(d).disabled && s.sent.slice(before2).filter((c) => /^ixian:(chatedit|chat):/.test(c)).length === 0 && !!strip(d) && input(d).value === 'my first words';
    /* ★ r1 (B-8): ✕ cancels and focus goes to the input */
    d.querySelector('.c-composer__ctx-cancel').focus();
    d.querySelector('.c-composer__ctx-cancel').click();
    await sleep(20);
    r.xFocusesInput = !strip(d) && d.activeElement === input(d) && input(d).value === 'second draft';
    /* ★★ r1 (B-4): a Save the SHELL refuses — the row FAILED while the user typed — keeps the typed text in the field as
       an ordinary draft (the edit ends), with a toast; nothing is sent */
    await pickEdit(W, d, 'ee02');
    type(W, d, 'words I typed for nothing');
    push('updateMessage', 'ee02', 'my first words', 'False', 'False', 'False', 'False', 'True');   // C#: the row is a failed send now
    await sleep(80);
    const before3 = s.sent.length;
    const toastsBefore = d.querySelectorAll('.c-toast').length;
    action(d).click();
    await sleep(60);
    r.refusedNoSend = s.sent.slice(before3).filter((c) => /^ixian:(chatedit|chat):/.test(c)).length === 0;
    r.refusedKeepsText = input(d).value === 'words I typed for nothing\nsecond draft' && !strip(d) && action(d).getAttribute('aria-label') === 'Send';
    void toastsBefore;
    for (let i = 0; i < 25 && refusals < 3; i++) await sleep(200);   // the toast host may still be showing the previous one
    r.refusedToast = refusals === 3;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1199 EDIT MODE on the built chat shell: Edit opens the strip ("Edit message" + the original), PREFILLS the input with the body and focuses it, the button is "Save", disabled while the body is unchanged or empty; Save sends EXACTLY ixian:chatedit:<id>:<urlenc body> and gives the earlier draft back (the button "Send" again); nothing repaints until C# answers, and a refused edit (C# re-pushes the current state) shows what C# says; Escape cancels and restores the earlier draft; an unchanged body cannot be saved (Save disabled, the edit stays — r1 N-6); ✕ returns focus to the input (r1 B-8); a Save the shell refuses (the row failed meanwhile) sends nothing, keeps the typed text as an ordinary draft (above the earlier draft) and toasts (r1 B-4); r2 MAJOR-2: C#\'s re-push with a DIFFERENT body = refused (the toast + the typed text back above the draft), the SAME body = accepted (no toast), no answer in 3 s = refused — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 3. the "edited" marker: addMe arg 14 · updateMessage arg 8 · the 7-arg status push keeps it · edited "" drops it ——— */
  await guard('#1199 marker', async () => {
    const s = await open('reply,edit');
    const { d, push } = s;
    const r = {};
    const marked = (id) => !!(rowOf(d, id) && rowOf(d, id).querySelector('.c-bubble__meta .c-bubble__edited'));
    r.fromAddMe = marked('ee07') && !marked('ee02');
    /* addThem arg 14 too (a peer's edited message, re-flushed) */
    push('addThem', 'ee08', 'addrPeer', 'Bob', '', 'their fixed words', String(NOW - 60), 'True', 'True', 'True', 'False', 'False', '', '', '1', '', '');
    await sleep(80);
    r.fromAddThem = marked('ee08');
    /* updateMessage arg 8 on MY sent row, same status: the new text AND the marker paint (past the surgical tick path) */
    push('updateMessage', 'ee02', 'my edited words', 'True', 'True', 'True', 'False', 'False', '1', '', '', '');
    await sleep(80);
    r.fromUpdate = marked('ee02') && /my edited words/.test(rowOf(d, 'ee02').textContent) && !/my first words/.test(rowOf(d, 'ee02').textContent);
    /* a later status-only updateMessage (7 args — an old exe, a tick) keeps the marker */
    push('updateMessage', 'ee02', 'my edited words', 'True', 'True', 'True', 'False', 'False');
    await sleep(80);
    r.statusKeeps = marked('ee02');
    /* C#'s explicit edited "" (the 11-arg form) is its current answer and drops it */
    push('updateMessage', 'ee02', 'my edited words', 'True', 'True', 'True', 'False', 'False', '', '', '', '');
    await sleep(80);
    r.explicitEmptyDrops = !marked('ee02');
    /* an edited REPLY keeps its quote (updateMessage args 9–11, the same parse) */
    push('addMe', 'ee09', 'addrMe', 'Me', '', 'reply body', String(NOW - 30), 'True', 'True', 'True', 'False', 'False', '', 'ee01', '', 'Bob', 'their words');
    await sleep(80);
    push('updateMessage', 'ee09', 'reply body fixed', 'True', 'True', 'True', 'False', 'False', '1', 'ee01', 'Bob', 'their words');
    await sleep(80);
    const q = rowOf(d, 'ee09') && rowOf(d, 'ee09').querySelector('.c-bubble__reply');
    r.editedReplyKeepsQuote = !!q && /their words/.test(q.textContent) && marked('ee09') && /reply body fixed/.test(rowOf(d, 'ee09').textContent);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1199 EDITED MARKER on the built chat shell: addMe / addThem arg 14 "1" → "edited" in the meta; updateMessage arg 8 "1" on my sent row repaints the NEW text with the marker (not the tick-only path); a later 7-arg status updateMessage KEEPS it; C#\'s explicit edited "" (11-arg form) drops it (DECIDED: absent = keep, present = C#\'s answer); an edited reply keeps its quote — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
