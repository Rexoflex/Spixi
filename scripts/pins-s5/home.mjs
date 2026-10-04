/* ==== SESSION 5b — #1166 HOME: P-03 (the chats list patches one row; a full flush is ONE push) · P-04 (one avatar per
 * address per document) · V-4 (the group picker caps at 10, #1141) ====
 * Behaviour is pinned on the BUILT shell (Spixi/Resources/Raw/html/index.html, executed in jsdom); the C# halves are
 * MAUI-bound and are pinned on comment-stripped source (their pure rules — the batch wire, the avatar ledger, the cap —
 * are EXECUTED in scripts/csh/ChatsListRulesTests.cs).
 * Deliberate breaks (#802) — each fails exactly the named pin:
 *   home.html scheduleChatRowPatch → renderChatsNow() always             → P-03 patch
 *   chats-shell patchChatRows: drop the order-key check                  → P-03 patch (the reorder case)
 *   home.html runRowBatch: skip `before()`                               → P-03 batch
 *   home.html avatarFor: ignore the map                                  → P-04 shell
 *   contacts-shell GROUP_MAX_MEMBERS = 11                                → V-4 picker
 *   HomePage.HandlePickSucceeded: drop the GroupLimit guard              → V-4 C# guard
 *   StreamProcessor.handleFriendIsTyping: flag back on                   → P-03 C# */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const f = join(root, 'Spixi/Resources/Raw/html/index.html');
  const html = readFileSync(f, 'utf8');
  const boot = async () => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    vc.on('warn', (m) => { errs.push('warn:' + String(m)); });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      },
    });
    await sleep(1500);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : (String(x).startsWith('data:') ? String(x) : b64(x)))));
    const frame = () => new Promise((r) => W.requestAnimationFrame(() => W.requestAnimationFrame(() => r())));
    return { dom, W, d: W.document, push, frame, errs };
  };
  const now = Math.floor(Date.now() / 1000);
  const A = 'AAApatchRow11111111111111111111111111111111111111111', B = 'BBBpatchRow22222222222222222222222222222222222222222',
    C = 'CCCpatchRow33333333333333333333333333333333333333333', D = 'DDDpatchRow44444444444444444444444444444444444444444',
    E = 'EEEpatchRow55555555555555555555555555555555555555555', R = 'RRRrequest666666666666666666666666666666666666666666';
  const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  // the OLD argument list of addChat (13 args)
  const chatArgs = (addr, nick, ts, avatar, extra = {}) => [addr, nick, String(ts), avatar, extra.online || 'False', extra.excerpt || 'hello ' + nick,
    extra.type || '', String(extra.unread || 0), extra.kind || '', 'False', extra.kind2 || 'text', '', 'False'];
  const rowsSpec = [
    [A, 'Alice', now - 10, PNG1], [B, 'Bob', now - 20, ''], [C, 'Carol', now - 30, ''], [D, 'Dan', now - 40, ''], [E, 'Eve', now - 50, PNG2],
  ];
  const batchJson = (avatarsInBatch) => {
    const items = [];
    for (const [addr, nick, ts, av] of rowsSpec) {
      if (av && avatarsInBatch) items.push({ f: 'setAvatarFor', a: [addr, av] });
      items.push({ f: 'addChat', a: chatArgs(addr, nick, ts, avatarsInBatch ? '' : av) });
    }
    items.push({ f: 'addRequest', a: [R, 'Rita', '', String(now - 25)] });
    return JSON.stringify({ strs: [], items });
  };
  const rowOf = (d, addr) => d.querySelector('.c-chats-list .c-chatlist-item[data-address="' + addr + '"]');
  const topOf = (d, addr) => { const r = rowOf(d, addr); return r ? (r.closest('.c-swipe') || r) : null; };
  const listKids = (d) => Array.from(d.querySelector('.c-chats-list').children);

  /* ── P-03 batch: ONE push renders exactly what the per-row burst rendered ── */
  {
    const s1 = await boot();
    s1.push('clearChats'); s1.push('clearRequests');
    for (const [addr, nick, ts, av] of rowsSpec) s1.push('addChat', ...chatArgs(addr, nick, ts, av));
    s1.push('addRequest', R, 'Rita', '', String(now - 25));
    s1.push('clearChatsDone');
    await s1.frame();
    const oldHtml = s1.d.querySelector('.c-chats-list').innerHTML;
    const oldBadge = (s1.d.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge') || {}).textContent || '';
    const s2 = await boot();
    s2.push('addChats', batchJson(true));
    await s2.frame();
    const newHtml = s2.d.querySelector('.c-chats-list').innerHTML;
    const newBadge = (s2.d.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge') || {}).textContent || '';
    const rowsAfterBatch = listKids(s2.d).length;
    // a second batch is a full re-flush: same picture, the request card included
    s2.push('addChats', batchJson(true));
    await s2.frame();
    const reHtml = s2.d.querySelector('.c-chats-list').innerHTML;
    // allowlist: a smuggled non-row item is refused and inert; an unreadable payload changes nothing
    const before = s2.d.querySelector('.c-chats-list').innerHTML;
    s2.errs.length = 0;
    s2.push('addChats', JSON.stringify({ strs: [], items: [{ f: 'selectTab', a: ['tab2'] }, { f: 'clearChats', a: ['x'] }, { f: 'addChat', a: chatArgs(A, 'Alice', now - 10, '') }] }));
    await s2.frame();
    const smuggleInert = !s2.d.querySelector('#view-wallet:not([hidden])') && s2.errs.some((e) => /addChats dropped=2/.test(e));
    const beforeGarbage = s2.d.querySelector('.c-chats-list').innerHTML;
    s2.push('addChats', '{not json');
    await s2.frame();
    const garbageInert = s2.d.querySelector('.c-chats-list').innerHTML === beforeGarbage && rowOf(s2.d, A) !== null;
    const r = {
      rows: rowsAfterBatch === 6,
      sameHtml: oldHtml.length > 0 && oldHtml === newHtml,
      sameBadge: oldBadge === newBadge,
      reflushSame: reHtml === newHtml,
      photoByAddress: !!(rowOf(s2.d, A) && rowOf(s2.d, A).querySelector('img.c-avatar__img') && rowOf(s2.d, A).querySelector('img.c-avatar__img').getAttribute('src') === PNG1),
      smuggleInert, garbageInert,
      smuggleRowOnly: before.indexOf('Bob') > 0 && listKids(s2.d).length === 1 && !!rowOf(s2.d, A),
    };
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 P-03 (batch): a FULL chats flush is ONE push — addChats(json) renders byte-for-byte the list the per-row burst (clearChats · clearRequests · addChat×N · addRequest · clearChatsDone) rendered, avatars by address (setAvatarFor items, the row arg ""), the nav badge equal; the allowlist refuses a smuggled selectTab / clearChats item (inert, one warn line); an unreadable payload leaves the list as it was — ' + JSON.stringify(r) + ' errs: ' + s2.errs.filter((e) => !/^warn:/.test(e)).slice(0, 2).join(' | '));
    try { s1.dom.window.close(); s2.dom.window.close(); } catch (e) {}
  }

  /* ── P-03 patch: a status tick / typing edge / reaction / new avatar replaces ONE row node; the others keep theirs ── */
  {
    const s = await boot();
    s.push('addChats', batchJson(true));
    await s.frame();
    const snap = () => new Map([A, B, C, D, E].map((a) => [a, topOf(s.d, a)]));
    const changed = (m0) => [A, B, C, D, E].filter((a) => topOf(s.d, a) !== m0.get(a));
    const reqNode0 = s.d.querySelector('.c-chats-list .c-contact-request');
    const r = {};
    // (a) presence + unread tick for B
    let m0 = snap();
    s.push('setContactStatus', B, 'True', '3', '', '0');
    await s.frame();
    r.statusOnlyB = JSON.stringify(changed(m0)) === JSON.stringify([B]);
    r.statusShown = !!rowOf(s.d, B).querySelector('.c-avatar__dot') && (rowOf(s.d, B).querySelector('.c-indicator[data-variant="count"]') || {}).textContent === '3';
    r.requestKept = s.d.querySelector('.c-chats-list .c-contact-request') === reqNode0;
    const badge = s.d.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge');
    r.navBadge = !!badge && !badge.hidden && badge.textContent === '4';   // 3 unread + 1 pending request card (#1150: the card counts on the tab)
    // (b) typing edge for C: a lone addChat with the typing status
    m0 = snap();
    s.push('addChat', ...chatArgs(C, 'Carol', now - 30, '', { type: 'typing', excerpt: 'typing...', kind2: 'typing' }));
    await s.frame();
    r.typingOnlyC = JSON.stringify(changed(m0)) === JSON.stringify([C]);
    r.typingDots = !!rowOf(s.d, C).querySelector('.c-excerpt[data-type="typing"] .c-excerpt__typing');
    // (c) a reaction on D
    m0 = snap();
    s.push('addChatReaction', D, 'Dan', 'like', String(now), '');
    await s.frame();
    r.reactionOnlyD = JSON.stringify(changed(m0)) === JSON.stringify([D]);
    r.reactionShown = !!rowOf(s.d, D).querySelector('.c-excerpt[data-type="reaction"]');
    // (d) a new avatar for E
    m0 = snap();
    s.push('setAvatarFor', E, PNG1);
    await s.frame();
    r.avatarOnlyE = JSON.stringify(changed(m0)) === JSON.stringify([E]);
    r.avatarShown = (rowOf(s.d, E).querySelector('img.c-avatar__img') || { getAttribute: () => '' }).getAttribute('src') === PNG1;
    // (e) a reorder (E gets the newest message) → the full render, E on top
    m0 = snap();
    s.push('addChat', ...chatArgs(E, 'Eve', now + 5, '', { excerpt: 'newest' }));
    await s.frame();
    r.reorderFull = changed(m0).length === 5 && listKids(s.d)[0] === topOf(s.d, E);
    // (f) desktop selection: only the two rows whose highlight moved
    s.push('selectChat', A);
    m0 = snap();
    s.push('selectChat', B);
    r.selectTwo = JSON.stringify(changed(m0).sort()) === JSON.stringify([A, B].sort()) && rowOf(s.d, B).getAttribute('aria-current') === 'true' && !rowOf(s.d, A).hasAttribute('aria-current');
    r.noErrors = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 P-03 (patch): the chats list no longer rebuilds for a small change — a presence/unread tick, a typing edge (a lone addChat), a reaction (addChatReaction) and a new avatar (setAvatarFor) each REPLACE ONE row node and every other row (and the request card) keeps its node; the count, the dots, the reaction line and the photo show; the nav badge follows; a reorder still renders in full (newest on top); the desktop highlight moves by patching the two rows — ' + JSON.stringify(r) + ' errs: ' + s.errs.filter((e) => !/^warn:/.test(e)).slice(0, 2).join(' | '));
    try { s.dom.window.close(); } catch (e) {}
  }

  /* ── P-03: a typing push never resurrects a deleted row (it is not a message); a newer message still does ── */
  {
    const src = stripCode(rd('src/shells/home.html'));
    const r = {
      typingGate: /const typingPush = type === 'typing' \|\| excerptKind === 'typing' \|\| typingEdge === '1';/.test(src)
        && /if \(revived \|\| \(!chatsFlushing && !typingPush\)\)/.test(src),
    };
    /* the tombstone, written the way the user writes it: the row menu → Delete chat → Delete (the CH3 / BUG-1b
       deletedChats map; the verb goes to C#, whose answer is not needed for the row to stay gone this session). */
    const s = await boot();
    s.push('addChats', batchJson(false));
    await s.frame();
    rowOf(s.d, C).dispatchEvent(new s.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    await sleep(300);
    const delItem = Array.from(s.d.querySelectorAll('.c-msgmenu__item')).find((b) => /Delete chat/.test(b.textContent));
    if (delItem) delItem.click();
    await sleep(500);
    const delBtn = Array.from(s.d.querySelectorAll('.c-modal button.c-button, [role=dialog] button.c-button')).find((b) => (b.textContent || '').trim() === 'Delete');
    if (delBtn) delBtn.click();
    await sleep(300);
    await s.frame();
    r.deleted = !rowOf(s.d, C);
    s.push('addChat', ...chatArgs(C, 'Carol', now - 30, '', { type: 'typing', excerpt: 'typing...', kind2: 'typing' }));
    await s.frame();
    r.typingKeepsItGone = !rowOf(s.d, C);
    /* ★ r1 (C-M1): the typing END edge carries the NORMAL tail (no typing kind) — only the 14th-arg marker says it is
       an edge, and it must not resurrect the row either */
    s.push('addChat', ...chatArgs(C, 'Carol', now - 30, '', { excerpt: 'hello Carol' }), '1');
    await s.frame();
    r.typingEndKeepsItGone = !rowOf(s.d, C);
    const hpT = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const uiT = stripCode(rd('Spixi/Utils/UIHelpers.cs'));
    r.csMarksBothEdges = /SReactionFlags\.has\(fmh\.walletAddress\)\.ToString\(\), typingEdge \? "1" : ""\);/.test(hpT)
      && /home\.updateChat\(friend, true\);/.test(uiT)
      && (uiT.match(/\.updateChat\(friend\);/g) || []).length === 4;   // the message-event callers stay unmarked
    r.shellReadsMarker = /typingEdge === '1'/.test(stripCode(rd('src/shells/home.html')));
    s.push('addChat', ...chatArgs(C, 'Carol', now + 9, '', { excerpt: 'new message' }));
    await s.frame();
    r.messageBringsItBack = !!rowOf(s.d, C);
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 P-03: a typing edge now arrives as a LONE row push — it must not resurrect a chat the user deleted (BUG-1b evidence rule: typing is not a message), while a newer message still brings it back — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  }

  /* ── P-04 shell: one photo per address, validated, every row with that address follows ── */
  {
    const s = await boot();
    s.push('addChats', batchJson(true));
    await s.frame();
    const srcOf = (addr) => { const i = rowOf(s.d, addr) && rowOf(s.d, addr).querySelector('img.c-avatar__img'); return i ? i.getAttribute('src') : null; };
    const r = {};
    r.rowArgEmptyUsesMap = srcOf(A) === PNG1 && srcOf(E) === PNG2 && srcOf(B) === null;
    s.push('setAvatarFor', B, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    s.push('setAvatarFor', B, 'javascript:alert(1)');
    s.push('setAvatarFor', B, 'data:image/png;base64,AAA"onerror=x');
    await s.frame();
    r.badUriRefused = srcOf(B) === null;
    s.push('setAvatarFor', A, '');
    await s.frame();
    r.clearForgets = srcOf(A) === null;
    // a later full flush with "" rows keeps the remembered photos (E), and A stays forgotten
    s.push('addChats', JSON.stringify({ strs: [], items: rowsSpec.map(([addr, nick, ts]) => ({ f: 'addChat', a: chatArgs(addr, nick, ts, '') })) }));
    await s.frame();
    r.survivesReflush = srcOf(E) === PNG2 && srcOf(A) === null;
    // the contacts directory reads the same map (addContacts batch, avatar arg "")
    s.push('addContacts', JSON.stringify({ strs: [], items: [
      { f: 'setAvatarFor', a: [B, PNG2] },
      { f: 'addContact', a: [B, 'Bob', '', 'False', '0', 'contact', ''] }, { f: 'setChatMuted', a: [B, '0'] }, { f: 'setChatFavorite', a: [B, '0'] },
      { f: 'addContact', a: [E, 'Eve', '', 'False', '0', 'contact', ''] },
    ] }));
    await s.frame();
    r.chatRowFollowsContactsBatch = srcOf(B) === PNG2;
    s.d.getElementById('fab').click();
    await sleep(400);
    const pick = (addr) => { const row = s.d.querySelector('.c-contacts__row[data-address="' + addr + '"] img.c-avatar__img'); return row ? row.getAttribute('src') : null; };
    r.pickerUsesMap = pick(B) === PNG2 && pick(E) === PNG2;
    r.noErrors = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 P-04 (shell): rows carry "" and read the photo by ADDRESS (setAvatarFor, once per document) — chats rows, and the contacts picker from the same map; only a base64 PNG/JPEG/WebP/GIF data URI is kept (svg / javascript: / a broken body ignored); "" forgets; a later re-flush with "" rows keeps the remembered photo — ' + JSON.stringify(r) + ' errs: ' + s.errs.filter((e) => !/^warn:/.test(e)).slice(0, 2).join(' | '));
    try { s.dom.window.close(); } catch (e) {}
  }

  /* ── P-03 / P-04 C#: the flush is one push, the row sites carry the ledger's argument, small changes push one row ── */
  {
    const hp = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const sp = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
    const ui = stripCode(rd('Spixi/Utils/UIHelpers.cs'));
    const body = (src, sig, end) => { const i = src.indexOf(sig); return i < 0 ? '' : src.slice(i, end ? src.indexOf(end, i) : i + 6000); };
    const loadChats = body(hp, 'private void loadChats()', 'private void warmAccountAfterFirstPaint');
    const loadContacts = body(hp, 'private void loadContacts()', 'private bool hasUnreadMention');
    const updateChat = body(hp, 'public void updateChat(Friend friend, bool typingEdge = false)', 'public void updateChatReaction');
    const typing = body(sp, 'protected void handleFriendIsTyping(', 'private static void handleAppProtocols');
    const reaction = body(sp, 'case SpixiMessageCode.msgReaction:', 'case SpixiMessageCode.leaveConfirmed:');
    const receipt = body(sp, 'case SpixiMessageCode.msgReceived:', 'case SpixiMessageCode.msgDelete:');
    const r = {
      chatsOnePush: /sendBatchOrRows\("addChats", chatsBatch, new\[\] \{ "clearChats", "clearRequests" \}, new\[\] \{ "clearChatsDone" \}\);/.test(loadChats)
        && !/Utils\.sendUiCommand\(this, "(addChat|addRequest|clearChats|clearRequests|clearChatsDone)"/.test(loadChats),
      contactsOnePush: /sendBatchOrRows\("addContacts", contactsBatch, new\[\] \{ "clearContacts" \}/.test(loadContacts)
        && !/Utils\.sendUiCommand\(this, "(addContact|setChatMuted|setChatFavorite|clearContacts)"/.test(loadContacts),
      rowSitesUseLedger: /chatsBatch\.add\("addChat", helper_msg\.walletAddress, helper_msg\.nickname, helper_msg\.timestamp\.ToString\(\), avatarArg\(helper_msg\.walletAddress, helper_msg\.avatar, chatsBatch\)/.test(loadChats)
        && /chatsBatch\.add\("addRequest", rm\.walletAddress, rm\.nickname, avatarArg\(rm\.walletAddress, rm\.avatar, chatsBatch\)/.test(loadChats)
        && /contactsBatch\.add\("addContact", contactAddr, friend\.nickname, avatarArg\(contactAddr, avatar, contactsBatch\)/.test(loadContacts)
        && (updateChat.match(/avatarArg\(fmh\.walletAddress, fmh\.avatar, null\)/g) || []).length === 2
        && (updateChat + loadChats).split(/(?:fmh|helper_msg|rm)\.avatar\b/).length - 1 === 4,   // every use of the row's avatar goes through avatarArg
      ledgerResetPerDocument: (hp.match(/avatarLedger\.reset\(\);/g) || []).length === 3
        && /private void onLoaded\(\)[\s\S]{0,900}avatarLedger\.reset\(\);/.test(hp)
        && /public override void reload\(\)[\s\S]{0,600}avatarLedger\.reset\(\);/.test(hp)
        && /public void reloadShell\(\)[\s\S]{0,1200}avatarLedger\.reset\(\);/.test(hp),
      avatarPushOncePerAddress: /string arg = avatarLedger\.rowArg\(address, avatar, out string\? push\);\s*if \(push != null\)\s*\{\s*if \(batch != null\)\s*\{\s*batch\.add\("setAvatarFor", address, push\);\s*\}\s*else\s*\{\s*Utils\.sendUiCommand\(this, "setAvatarFor", address, push\);/.test(hp),
      typingNoFlag: !/shouldRefreshContacts/.test(typing) && (typing.match(/UIHelpers\.refreshChatRowLive\(friend\);/g) || []).length === 2,
      reactionNoFlag: !/shouldRefreshContacts/.test(reaction) && /UIHelpers\.flagChatsUnlessHomeLive\(\);/.test(reaction),
      receiptOneRow: /UIHelpers\.updateReactions\(friend, ch, fm\.id\);\s*UIHelpers\.flagChatsUnlessHomeLive\(\);/.test(receipt),
      helpersFallBackToFlag: /public static void refreshChatRowLive\(Friend friend\)\s*\{\s*try\s*\{\s*HomePage\? home = liveHome\(\);\s*if \(home != null\)\s*\{\s*home\.updateChat\(friend, true\);\s*return;\s*\}\s*\}\s*catch \(Exception ex\)\s*\{[^}]*\}\s*shouldRefreshContacts = true;/.test(ui)
        && /public static void flagChatsUnlessHomeLive\(\)\s*\{\s*try\s*\{\s*if \(liveHome\(\) != null\)\s*\{\s*return;\s*\}\s*\}\s*catch \(Exception\)\s*\{\s*\}\s*shouldRefreshContacts = true;/.test(ui),
    };
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 P-03 / P-04 (C#): loadChats and loadContacts push ONE batch each (addChats / addContacts — no per-row push left), every row site (chats · requests · contacts · the lone updateChat pair) carries avatarArg (the ledger: setAvatarFor once per address per document, reset in onLoaded · reload · reloadShell), and typing (both edges), reactions and delivery receipts no longer raise the full-flush flag when HomePage is live — the row push is the change, the flag stays the recovery — ' + JSON.stringify(r));
  }

  /* ── r1 (C-N1): the per-row path skips a leaving group / bot exactly as loadChats does ── */
  {
    const hp = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const r = {
      updateChatSkips: /public void updateChat\(Friend friend, bool typingEdge = false\)\s*\{\s*lock \(refreshLock\)\s*\{\s*if \(friend\.pendingDeletion\)\s*\{\s*return;\s*\}\s*var fmh = getFriendMessageHelper\(/.test(hp),
      loadChatsSkips: /foreach \(Friend friend in friends\)\s*\{\s*if \(friend\.pendingDeletion\)\s*\{\s*continue;\s*\}/.test(hp),
    };
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 r1 (C-N1): HomePage.updateChat — the per-row path that typing / receipts / reactions now use — skips a friend with pendingDeletion first, the same rule loadChats applies, so a leaving group / bot row cannot reappear through a lone push — ' + JSON.stringify(r));
  }

  /* ── V-4 picker: 10 picks, a counter, every other row disabled at the cap with the limit line ── */
  {
    const s = await boot();
    const people = Array.from({ length: 12 }, (_, i) => ['P' + String(i).padStart(2, '0') + 'member' + 'x'.repeat(42), 'Person ' + (i + 1)]);
    s.push('addContacts', JSON.stringify({ strs: [], items: people.map(([a, n]) => ({ f: 'addContact', a: [a, n, '', 'False', '0', 'contact', ''] })) }));
    await sleep(200);
    s.d.getElementById('fab').click();
    await sleep(400);
    const createGroup = Array.from(s.d.querySelectorAll('.c-contacts__action')).find((b) => /Create group/.test(b.textContent));
    createGroup.click();
    await sleep(100);
    const rowFor = (a) => s.d.querySelector('.c-contacts__row[data-address="' + a + '"]');
    const hint = s.d.querySelector('.c-contacts__minhint');
    const r = {};
    for (let i = 0; i < 9; i++) rowFor(people[i][0]).click();
    r.counter9 = hint.textContent.trim() === '9 / 10';
    r.noneDisabledAt9 = s.d.querySelectorAll('.c-contacts__row[data-capped]').length === 0 && !rowFor(people[10][0]).disabled;
    rowFor(people[9][0]).click();
    r.limitLineAt10 = hint.textContent.trim() === 'A group can have up to 10 members besides you.' && hint.dataset.cap === 'full';
    const capped = Array.from(s.d.querySelectorAll('.c-contacts__row[data-capped]'));
    r.othersDisabled = capped.length === 2 && capped.every((b) => b.disabled && b.getAttribute('aria-describedby') === hint.id && b.getAttribute('aria-checked') === 'false');
    r.pickedStayEnabled = !rowFor(people[0][0]).disabled && rowFor(people[0][0]).getAttribute('aria-checked') === 'true';
    rowFor(people[10][0]).dispatchEvent(new s.W.MouseEvent('click', { bubbles: true }));
    r.eleventhRefused = rowFor(people[10][0]).getAttribute('aria-checked') === 'false' && s.d.querySelectorAll('.c-contacts__row[aria-checked="true"]').length === 10;
    rowFor(people[3][0]).click();
    r.backTo9 = hint.textContent.trim() === '9 / 10' && s.d.querySelectorAll('.c-contacts__row[data-capped]').length === 0 && !rowFor(people[10][0]).disabled && !rowFor(people[10][0]).hasAttribute('aria-describedby');
    rowFor(people[3][0]).click();
    const confirm = s.d.querySelector('.c-contacts .c-topbar__actions button');
    r.confirmEnabledAt10 = !!confirm && !confirm.disabled;
    confirm.click();
    await sleep(500);
    r.setupHas10 = s.d.querySelectorAll('.c-contacts-group__chips > *').length === 10;
    r.noErrors = s.errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r).every((v) => v === true),
      '★★ #1166 V-4 (#1141, picker EXECUTED): group mode counts "n / 10"; at 10 every unpicked row is disabled (data-capped, described by the rule line) and the line says "A group can have up to 10 members besides you."; an 11th tap is refused; un-picking one re-enables the rest; ✓ takes the 10 into group setup — ' + JSON.stringify(r) + ' errs: ' + s.errs.filter((e) => !/^warn:/.test(e)).slice(0, 2).join(' | '));
    try { s.dom.window.close(); } catch (e) {}
  }

  /* ── V-4 C#: HandlePickSucceeded refuses > 10 with an alert, before CreateGroup ── */
  {
    const hp = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const rules = stripCode(rd('Spixi/Utils/ChatsListRules.cs'));
    const hps = hp.slice(hp.indexOf('private async void HandlePickSucceeded('), hp.indexOf('protected override string systemBarSurfaceColorString'));
    const guard = /if \(GroupLimit\.exceeds\(addresses\.Count\)\)\s*\{\s*await displaySpixiAlert\(SpixiLocalization\._SL\("group-limit-title"\) \?\? "[^"]+",\s*SpixiLocalization\._SL\("group-limit-text"\) \?\? "[^"]+",\s*SpixiLocalization\._SL\("global-dialog-ok"\) \?\? "[^"]+"\);\s*return;\s*\}/.exec(hps);
    const r = {
      guard: !!guard,
      beforeCreate: !!guard && hps.indexOf(guard[0]) < hps.indexOf('GroupChat.CreateGroup(') && hps.indexOf('if (addresses.Count > 1)') < hps.indexOf(guard[0]),
      ten: /internal const int MaxPicked = 10;/.test(rules) && /return picked > MaxPicked;/.test(rules),
      shellSame: /const GROUP_MAX_MEMBERS = 10;/.test(stripCode(rd('src/components/contacts-shell.js'))),
    };
    ok(Object.values(r).every((v) => v === true),
      '★ #1166 V-4 (#1141, C# belt): HandlePickSucceeded refuses more than 10 picked members (GroupLimit.exceeds — Core\'s CreateGroupMessage.cs:58 number, executed in csh) with an alert (??-fallbacks) and returns BEFORE GroupChat.CreateGroup; the shell cap is the same 10 — ' + JSON.stringify(r));
  }
}
