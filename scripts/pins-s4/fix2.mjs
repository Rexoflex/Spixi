/* ==== SESSION 4 — fix batch part 2 pins (DECISIONS #1148) ====
 * (1) chip weight 500 · (2) photo tile edge per side · (3) the unread rule (UnreadRule — EXECUTED in scripts/csh,
 * UnreadRuleTests.cs; here: the MAUI-only call sites call it, source pins — nothing can execute them) · (4) the reaction
 * heart (EXECUTED on the built home shell in jsdom: shown with no count, hidden with a count, never in the Unread chip or
 * the nav badge, cleared by the next flush, absent on an older exe's 12-argument push). */
export default async function (h) {
  const { ok, root, stripCode, stripCssComments, readFileSync, existsSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const cs = (p) => stripCode(rd(p));

  /* —— (1) chips 600 → 500 —— */
  {
    const tok = stripCssComments(rd('src/styles/tokens.css'));
    const shipped = rd('Spixi/Resources/Raw/html/spixi.tokens.css');
    const r = {
      src: /--chip-weight:\s*var\(--font-weight-medium\);/.test(tok) && !/--chip-weight:\s*var\(--font-weight-semibold\)/.test(tok),
      medium500: /--font-weight-medium:\s*500;/.test(tok),
      shipped: /--chip-weight:\s*var\(--font-weight-medium\)/.test(shipped),
      chipReads: /\.c-chip\s*\{[^}]*font-weight:\s*var\(--chip-weight\);/.test(stripCssComments(rd('src/styles/components/chip.css'))),
      noSelectedOverride: !/\.c-chip\[aria-pressed="true"\][^{]*\{[^}]*font-weight/.test(stripCssComments(rd('src/styles/components/chip.css'))),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1148 (1) (Damir walk: chip text 600 → 500, supersedes #735 P.S.): --chip-weight = medium (500) in the source and the SHIPPED tokens, every c-chip reads it, and the selected chip sets no weight of its own (its fill shows the state) — ' + JSON.stringify(r));
  }

  /* —— (2) the photo tile edge per side: received = the incoming bubble's edge, mine = the outgoing bubble's —— */
  {
    const mb = stripCssComments(rd('src/styles/components/media-bubble.css'));
    const bub = stripCssComments(rd('src/styles/components/message-bubble.css'));
    const built = rd('Spixi/Resources/Raw/html/chat.html');
    const rule = (css, sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
    const recv = rule(mb, '.c-mbubble[data-file]');
    const sent = rule(mb, '.c-bubble-row[data-direction="sent"] .c-mbubble[data-file]');
    const textRecv = rule(bub, '.c-bubble-row[data-direction="received"] .c-bubble');
    const r = {
      recvFrame: /border:\s*2px solid var\(--surface-bubble-received\);/.test(recv),
      recvEdge: /box-shadow:\s*0 0 0 1px var\(--outline-hairline\), var\(--bubble-elevation\);/.test(recv),
      /* the SAME tokens the incoming text bubble's edge uses (#989 hairline + the Session I lift) */
      sameTokensAsText: /var\(--outline-hairline\)/.test(textRecv) && /var\(--bubble-elevation\)/.test(textRecv) && /var\(--surface-bubble-received\)/.test(textRecv),
      sentFrame: /border:\s*2px solid var\(--surface-bubble-sent\);/.test(sent) && /box-shadow:\s*var\(--bubble-elevation\);/.test(sent) && !/outline-hairline/.test(sent),
      /* the A2 jump ring and the sending scrim still work on the tile */
      a2Ring: /\.c-bubble-row\[data-mention-pulse\] \.c-mbubble, \.c-bubble-row\[data-mention-pulse\] \.c-tcard \{ animation: chat-jump-ring/.test(built),
      scrim: /\.c-mbubble\[data-file="progress"\]\[data-state="loaded"\] \.c-mbubble__file \{[^}]*background: var\(--surface-scrim\);/.test(mb),
      shipped: built.includes('border: 2px solid var(--surface-bubble-received);') && built.includes('border: 2px solid var(--surface-bubble-sent); box-shadow: var(--bubble-elevation);'),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1148 (2) (Damir: "white outline like incoming, blue like outgoing"): a RECEIVED photo tile is framed 2px in the incoming bubble ground with the incoming edge (hairline + lift) outside it, MY tile keeps the sent 2px frame + the lift and no hairline; the A2 ring and the sending scrim are intact; shipped in the built chat shell — ' + JSON.stringify(r));
  }

  /* —— (3) the unread rule: every raise of the count goes through UnreadRule (MAUI-only sites → source pins) —— */
  {
    const node = cs('Spixi/Meta/Node.cs');
    const voip = cs('Spixi/VoIP/VoIPManager.cs');
    const sp = cs('Spixi/Network/StreamProcessor.cs');
    const rule = cs('Spixi/Utils/UnreadRule.cs');
    const proj = rd('scripts/csh/csh.csproj');
    const tests = existsSync(join(root, 'scripts/csh/UnreadRuleTests.cs')) ? rd('scripts/csh/UnreadRuleTests.cs') : '';
    const nodeBlock = (/if \(!UIHelpers\.isChatScreenDisplayed\(friend\)\s*&&\s*!friend_message\.read\)\s*\{([\s\S]*?)friend\.saveMetaData\(\);/.exec(node) || [])[1] || '';
    const r = {
      node: /if \(!oldMessage\s*&&\s*UnreadRule\.countsAsUnread\(type, local_sender, friend_message_with_status\.updated, UnreadRule\.isSystemLineId\(friend_message\.id\)\)\)\s*friend\.metaData\.unreadMessageCount\+\+;/.test(nodeBlock),
      voip: /if \(UnreadRule\.missedCallCounts\(currentCallInitiator, callAccepted, currentCallDeclinedLocally, UIHelpers\.isChatScreenDisplayed\(currentCallContact\)\)\)\s*\{\s*currentCallContact\.metaData\.unreadMessageCount\+\+;/.test(voip),
      late: /if \(UnreadRule\.missedCallCounts\(false, false, false, UIHelpers\.isChatScreenDisplayed\(friend\)\)\)\s*\{\s*friend\.metaData\.unreadMessageCount\+\+;/.test(sp)
        && sp.indexOf('UnreadRule.missedCallCounts(false') > sp.indexOf('stale.type = FriendMessageType.voiceCallEnd;'),
    };
    /* the reaction increment is GONE: the msgReaction case raises no count, and sets the heart through the rule */
    const rx = sp.slice(sp.indexOf('case SpixiMessageCode.msgReaction:'), sp.indexOf('case SpixiMessageCode.leaveConfirmed:'));
    r.reactionNoCount = rx.length > 0 && !/unreadMessageCount/.test(rx);
    r.reactionDot = /UnreadRule\.reactionRaisesDot\(reaction\.reaction, target != null && target\.localSender,/.test(rx) && /SReactionFlags\.set\(friend\.walletAddress\.ToString\(\)\)/.test(rx);
    /* DERIVED: in the whole C# tree, every `unreadMessageCount++` is one of these three rule-gated sites */
    const walk = (d, out = []) => { for (const e of h.readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (!/\/(bin|obj)$/.test(p)) walk(p, out); } else if (p.endsWith('.cs')) out.push(p); } return out; };
    const incs = [];
    for (const f of walk('Spixi')) { const n = (cs(f).match(/unreadMessageCount\+\+/g) || []).length; if (n) incs.push(f.replace('Spixi/', '') + '×' + n); }
    r.onlyRuleSites = incs.sort().join(',') === 'Meta/Node.cs×1,Network/StreamProcessor.cs×1,VoIP/VoIPManager.cs×1';
    /* the rule is pure (no MAUI / Friend) and EXECUTED by the harness */
    r.pure = !/Microsoft\.Maui|Friend\b|FriendList/.test(rule) && /public static bool countsAsUnread\(FriendMessageType type, bool localSender, bool isUpdate, bool isSystemLine = false\)/.test(rule);
    r.harness = proj.includes('<Compile Include="../../Spixi/Utils/UnreadRule.cs" />') && proj.includes('<Compile Include="../../Spixi/Meta/SReactionFlags.cs" />')
      && ['incoming_text_file_payment_request_invite_contact_request_count_1', 'my_own_messages_count_0', 'an_update_counts_0', 'call_cards_and_system_rows_count_0_at_insert', 'the_connected_line_counts_0', 'missed_incoming_call_counts_1', 'outgoing_answered_declined_or_open_chat_call_counts_0', 'receipts_their_message_my_reaction_or_open_chat_set_nothing'].every((m) => tests.includes('public void ' + m + '()'))
      && /public enum FriendMessageType \{ standard, requestAdd, requestFunds, sentFunds, fileHeader, voiceCall, voiceCallEnd, appSession, appSessionEnd, kicked, banned, requestAddSent, reaction \}/.test(rd('scripts/csh/Stubs.cs'));
    /* the stub mirrors Core value for value */
    const core = join(root, '../Ixian-Core/Streaming/Friends/FriendMessage.cs');
    if (existsSync(core)) {
      const m = /enum FriendMessageType\s*\{([^}]*)\}/.exec(readFileSync(core, 'utf8'));
      r.stubMirrorsCore = !!m && m[1].split(',').map((x) => x.trim()).filter(Boolean).join(',') === 'standard,requestAdd,requestFunds,sentFunds,fileHeader,voiceCall,voiceCallEnd,appSession,appSessionEnd,kicked,banned,requestAddSent,reaction';
    }
    ok(Object.values(r).every(Boolean),
      '★★ #1148 (3) (Damir: "an outgoing unanswered call left 2 unread") — source pins (MAUI-only sites; the rule itself is EXECUTED in scripts/csh UnreadRuleTests): Node.addMessageWithType counts only what UnreadRule.countsAsUnread admits (local_sender · updated · the system-line id passed in); VoIPManager.endVoIPSession and the late-call path add 1 only through UnreadRule.missedCallCounts; the msgReaction case raises NO count (C-05) and sets the heart through reactionRaisesDot; every unreadMessageCount++ in the tree is one of these three (' + incs.join(' ') + ') — ' + JSON.stringify(r));
  }

  /* —— (4) the heart's C# plumbing: cleared at the three unread-clear sites, forgotten with the contact / the account —— */
  {
    const scp = cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
    const st = cs('Spixi/Meta/SReactionFlags.cs');
    const sites = (scp.match(/clearReactionFlag\(\);/g) || []).length;
    const loadSite = /UIHelpers\.setContactStatus\(friend\.walletAddress, friend\.online, 0, "", 0\);\s*\}\s*clearReactionFlag\(\);/.test(scp);
    const r = {
      threeClears: sites === 3 && loadSite,
      clearRefreshes: /if \(friend != null && SReactionFlags\.clear\(friend\.walletAddress\.ToString\(\)\)\)\s*\{\s*UIHelpers\.shouldRefreshContacts = true;/.test(scp),
      fixedKey: /private const string KEY = "reaction_flags";/.test(st) && /public const int CAP = 256;/.test(st) && !/spixi\./.test(st),
      logsTypeOnly: (st.match(/Logging\.\w+\([^;]*;/g) || []).every((l) => /GetType\(\)\.Name/.test(l)),
      forgotten: ['Spixi/Utils/SContacts.cs', 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Pages/Home/HomePage.xaml.cs'].every((f) => /SSightingStore\.forget\([^;]*;\s*SReactionFlags\.clear\(/.test(cs(f))),
      wiped: (cs('Spixi/Pages/Settings/SettingsPage.xaml.cs').match(/SReactionFlags\.clearAll\(\)/g) || []).length === 3,   // #46 r1 A-M2: + delete-all-history
      gateRow: /#1148 \(4\)[^\n]*reaction_flags/.test(rd('docs/security-handover-gate.md')),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1148 (4) C# plumbing (source pins — MAUI-only): the heart flag clears at the SAME three sites as the unread count (load · a message in the open chat · back to the foreground) and a real clear re-pushes the rows; ONE fixed app-preference key, capped at 256, type-only log lines; forgotten with the contact (3 sites beside the sighting) and wiped with the account (2); the gate row exists — ' + JSON.stringify(r));
  }

  /* —— (4) EXECUTED on the built home shell —— */
  {
    const f = join(root, 'Spixi/Resources/Raw/html/index.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
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
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    const A = 'AAAheartNoCount1111111111111111111111', B = 'BBBheartAndCount222222222222222222222', C = 'CCCplainRow33333333333333333333333333', D = 'DDDolderExe444444444444444444444444444';
    const now = Math.floor(Date.now() / 1000);
    const flush = (rows) => {
      push('clearChats');
      for (const r of rows) push('addChat', ...r);
      push('clearChatsDone');
    };
    const row = (addr, nick, unread, heart, ts) => {
      const a = [addr, nick, String(ts || now), '', 'False', 'hi', 'default', String(unread), '', 'False', 'text', ''];
      if (heart !== undefined) a.push(heart);
      return a;
    };
    const rowEl = (addr) => W.document.querySelector('.c-chatlist-item[data-address="' + addr + '"]');
    const heartOf = (addr) => { const e = rowEl(addr); return e ? e.querySelector('.c-indicator[data-variant="reaction"]') : null; };
    const countOf = (addr) => { const e = rowEl(addr); const c = e && e.querySelector('.c-indicator[data-variant="count"]'); return c ? c.textContent : ''; };
    const chipCount = () => { const c = W.document.querySelector('.c-chip[data-filter="unread"] .c-chip__count'); return c ? c.textContent : '0'; };
    const navBadge = () => { const b = W.document.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge'); return b && !b.hidden ? b.textContent : '0'; };
    flush([row(A, 'Ana', 0, 'True', now - 1), row(B, 'Bor', 2, 'True', now - 2), row(C, 'Cene', 0, 'False', now - 3), row(D, 'Dora', 0, undefined, now - 4)]);
    await sleep(120);
    const hA = heartOf(A);
    const r = {
      shownNoCount: !!hA && countOf(A) === '' && hA.getAttribute('aria-label') === 'New reaction' && hA.getAttribute('role') === 'img' && !!hA.querySelector('svg') && hA.textContent.trim() === '',
      hiddenWithCount: !heartOf(B) && countOf(B) === '2',
      plainNone: !heartOf(C) && !!rowEl(C),
      olderExeNone: !heartOf(D) && !!rowEl(D),
      notInChip: chipCount() === '1',
      notInNav: navBadge() === '2',
      noUnreadMark: !!rowEl(A) && !rowEl(A).hasAttribute('data-unread'),
    };
    /* the Unread filter lists B only — a heart is not "unread" */
    const chipU = W.document.querySelector('.c-chip[data-filter="unread"]');
    if (chipU) chipU.click();
    await sleep(120);
    r.notInFilter = !!chipU && !rowEl(A) && !!rowEl(B);
    const chipAll = W.document.querySelector('.c-chip[data-filter="all"]');
    if (chipAll) chipAll.click();
    await sleep(120);
    /* the sticky reaction excerpt holds while the heart is up (a presence tick's 0 is not "read") */
    push('addChatReaction', A, 'Ana', 'like:', String(now), '');
    await sleep(60);
    push('setContactStatus', A, 'True', '0', '', '0');
    await sleep(60);
    flush([row(A, 'Ana', 0, 'True', now - 1), row(B, 'Bor', 2, 'True', now - 2), row(C, 'Cene', 0, 'False', now - 3)]);
    await sleep(120);
    const exA = () => { const e = rowEl(A); return e ? (e.querySelector('.c-excerpt') || {}).textContent || '' : ''; };
    r.excerptHolds = /Reacted/.test(exA());
    /* the chat opened → C# clears the flag → the next flush CLEARS the heart (and the sticky line) */
    flush([row(A, 'Ana', 0, 'False', now - 1), row(B, 'Bor', 0, 'False', now - 2), row(C, 'Cene', 0, 'False', now - 3)]);
    await sleep(120);
    r.cleared = !heartOf(A) && !!rowEl(A) && !/Reacted/.test(exA()) && chipCount() === '0' && navBadge() === '0';
    r.noErrors = errs.length === 0;
    ok(Object.values(r).every(Boolean),
      '★★ #1148 (4) EXECUTED on the built home shell (Damir: "not a number but a heart in a neutral or very light blue circle"): addChat\'s 13th arg shows a heart (role img, label "New reaction", no digits) where the count sits when there is NO count; with a count the COUNT wins and the heart hides; an older exe\'s 12-arg push shows none; the heart is never in the Unread chip, the nav badge, the row\'s unread mark or the Unread filter; the sticky "Reacted" line holds while the heart is up; the next flush after the chat opened clears both — ' + JSON.stringify(r) + (errs.length ? ' errs=' + errs.join(' | ') : ''));
    /* the heart's look: both themes from tokens (no literal colour), 20 px disc, 12 px glyph */
    const css = stripCssComments(rd('src/styles/components/chatlist-item.css'));
    const look = {
      disc: /\.c-indicator\[data-variant="reaction"\] \{\s*background: var\(--surface-select-row\);\s*color: var\(--icon-action-default\);/.test(css),
      size: /\.c-chatlist-item__indicators \.c-indicator\[data-variant="reaction"\] \{ width: 20px; \}/.test(css),
      bothThemes: (rd('src/styles/tokens.css').match(/--surface-select-row:/g) || []).length >= 2,
      strings: ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'].every((l) => { const v = JSON.parse(rd('src/strings/' + l + '.json')).newReaction; return !!v && v !== 'New reaction'; }),
    };
    ok(Object.values(look).every(Boolean),
      '★ #1148 (4) the heart\'s look: the selected-row tint (mode-aware token, both themes) + the action ink, a 20 px disc with a 12 px filled heart; "New reaction" translated in all 12 locales (not English) — ' + JSON.stringify(look));
    try { dom.window.close(); } catch (e) {}
  }
}
