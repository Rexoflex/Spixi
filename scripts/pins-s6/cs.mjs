/* ==== SESSION 6 — agent C: the C# items #1175 · #1176 · #1177 · #1178 ====
 * Behaviour on the BUILT shells first (Spixi/Resources/Raw/html/*.html in jsdom); the C# halves are MAUI-bound and are
 * pinned on comment-stripped source (their pure rules — InfoPaneRules, FileRowRules — are EXECUTED in scripts/csh).
 * Deliberate breaks (#802) — each fails exactly the named pin:
 *   home.html addChat: `Number(unread) || 0` → `|| 1`                         → #1175 shell (a lone zero clears)
 *   SingleChatPage.updateMessagesReadStatus: drop pushZeroedChatRow()        → #1175 C#
 *   UIHelpers.pushChatRowLive: drop the `return;` after home.updateChat       → #1175 C# (#46 F1-2: no full flush when live)
 *   SingleChatPage.updateMessagesReadStatus: drop the literal-0 setContactStatus → #1175 C# (#46 F1-1)
 *   chat.html markPausedTile: drop `rec.transferStarted ||`                  → #1177 shell (Paused never returns on a re-render)
 *   chat.html markPausedTile: drop the aria-label rewrite                     → #1177 shell (the card's name says Paused)
 *   ContactDetails.showInChat: drop the `return;` after the rule             → #1176 C#
 *   chat.html fileStateFrom: drop `if (transfer) return 'progress';`         → #1177 shell (paused / live)
 *   SingleChatPage addFile push: drop the fTransfer argument                 → #1177 C#
 *   en-us.txt notification-file = File received                              → #1178 copy
 *   Node: fileHeader back to notificationTextForType                          → #1178 C# */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  const bootShell = async (file) => {
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
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const frame = () => new Promise((r) => W.requestAnimationFrame(() => W.requestAnimationFrame(() => r())));
    return { dom, W, d: W.document, push, frame, errs };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  /* ———— #1175: a group row with unread 1 → ONE lone addChat with unread 0 (C#'s refreshChatRow after the zero) clears
     the row badge, the Unread + Groups chip counts and the Chats tab badge ———— */
  await guard('#1175 shell', async () => {
    const s = await bootShell('index.html');
    const now = Math.floor(Date.now() / 1000);
    const G = 'GGGgroupRow1175111111111111111111111111111111111111';
    // addChat(wallet, from, timestamp, avatar, online, excerpt, type, unread, kind, mention, excerptKind, excerptSender, reactionDot, typingEdge)
    const args = (unread) => [G, 'Team', String(now - 5), '', 'False', 'hi', '', String(unread), 'group', 'False', 'text', 'Ann', 'False', ''];
    s.push('clearChats'); s.push('clearRequests'); s.push('addChat', ...args(1)); s.push('clearChatsDone');
    await s.frame(); await sleep(50);
    const look = () => {
      const row = s.d.querySelector('.c-chats-list .c-chatlist-item[data-address="' + G + '"]');
      const chip = (id) => ((s.d.querySelector('.c-chats-header .c-chip[data-filter="' + id + '"] .c-chip__count') || {}).textContent || '0');
      const nav = s.d.querySelector('.c-bottomnav__item[data-id="chats"] .c-bottomnav__badge');
      const badge = row && row.querySelector('[data-variant="count"]');
      return { row: !!row, rowFlag: !!row && row.hasAttribute('data-unread'), rowBadge: badge ? badge.textContent : '0',
        unread: chip('unread'), groups: chip('groups'), nav: nav && !nav.hidden ? nav.textContent : '0' };
    };
    const before = look();
    s.push('addChat', ...args(0));   // the LONE push — not inside a clearChats … clearChatsDone burst
    await s.frame(); await sleep(50);
    const after = look();
    ok(before.row && before.rowFlag && before.rowBadge === '1' && before.unread === '1' && before.groups === '1' && before.nav === '1'
      && after.row && !after.rowFlag && after.rowBadge === '0' && after.unread === '0' && after.groups === '0' && after.nav === '0' && noErr(s.errs),
      '#1175 shell: a lone addChat with unread 0 clears the group row badge, the Unread / Groups chips and the Chats tab badge — '
      + JSON.stringify({ before, after }));
    s.dom.window.close();
  });

  /* ———— #1175 C#: after the zero + save, BOTH sites push the literal 0 into the status cache AND the true row
     (UIHelpers.pushChatRowLive: a lone addChat when HomePage is live, the flag ONLY when it is not — #46 F1-1/F1-2) ———— */
  await guard('#1175 C#', async () => {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const load = sc.slice(sc.indexOf('public void loadMessages()'), sc.indexOf('private void pushZeroedChatRow()'));
    const zeroBlock = /friend\.metaData\.unreadMessageCount\s*=\s*0;\s*friend\.saveMetaData\(\);\s*zeroedUnread\s*=\s*true;\s*UIHelpers\.setContactStatus\(friend\.walletAddress,\s*friend\.online,\s*0,\s*"",\s*0\);/.test(load);
    const afterLock = /lock\s*\(messages\)[\s\S]*\}\s*if\s*\(zeroedUnread\)\s*\{\s*pushZeroedChatRow\(\);\s*\}\s*\}\s*$/.test(load);
    const helper = /private void pushZeroedChatRow\(\)\s*\{\s*try\s*\{\s*UIHelpers\.pushChatRowLive\(friend\);\s*\}\s*catch\s*\(Exception e\)\s*\{\s*UIHelpers\.shouldRefreshContacts\s*=\s*true;/.test(sc);
    const ui = stripCode(rd('Spixi/Utils/UIHelpers.cs'));
    const live = /public static void pushChatRowLive\(Friend friend\)\s*\{\s*try\s*\{\s*HomePage\? home\s*=\s*liveHome\(\);\s*if\s*\(home\s*!=\s*null\)\s*\{\s*home\.updateChat\(friend,\s*false\);\s*return;\s*\}\s*\}\s*catch\s*\(Exception ex\)\s*\{\s*Logging\.warn\("pushChatRowLive: "\s*\+\s*ex\.GetType\(\)\.Name\);\s*\}\s*shouldRefreshContacts\s*=\s*true;\s*\}/.test(ui);
    const urs = sc.slice(sc.indexOf('public void updateMessagesReadStatus()'));
    const readStatus = /if\s*\(friend\.metaData\.unreadMessageCount\s*>\s*0\)\s*\{\s*friend\.metaData\.unreadMessageCount\s*=\s*0;\s*friend\.saveMetaData\(\);\s*UIHelpers\.setContactStatus\(friend\.walletAddress,\s*friend\.online,\s*0,\s*"",\s*0\);\s*pushZeroedChatRow\(\);\s*\}/.test(urs.slice(0, 1500));
    ok(zeroBlock && afterLock && helper && live && readStatus,
      '#1175 C#: loadMessages + updateMessagesReadStatus push the literal 0 + the true row after the zero (pushChatRowLive: no full flush when HomePage is live; outside lock(messages)) — '
      + JSON.stringify({ zeroBlock, afterLock, helper, live, readStatus }));
  });

  /* ———— #1176 C#: Show in chat beside the open chat = the jump only ———— */
  await guard('#1176 C#', async () => {
    const cd = stripCode(rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
    const hp = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const show = cd.slice(cd.indexOf('ixian:sharedShow:'), cd.indexOf('ixian:sharedOpen:", StringComparison'));
    const open = cd.slice(cd.indexOf('ixian:sharedOpen:", StringComparison'), cd.indexOf('ixian:sharedGroups'));
    const bothSites = /showInChat\(item\);/.test(show) && /showInChat\(item\);/.test(open) && !/popPageAsync|requestJump/.test(show) && !/popPageAsync|requestJump/.test(open);
    const helper = /private void showInChat\(SharedItem item\)\s*\{\s*SingleChatPage\.requestJump\(friend,\s*item\.id,\s*item\.depth\);\s*bool beside\s*=\s*HomePage\.InstanceOrNull\(\)\?\.isInfoPaneBeside\(this\)\s*==\s*true;\s*if\s*\(!InfoPaneRules\.showInChatClosesInfo\(beside,\s*Utils\.getChatPage\(friend\)\s*!=\s*null\)\)\s*\{\s*return;\s*\}\s*popPageAsync\(\);\s*HomePage\.Instance\(\)\?\.onChat\(friend\.walletAddress,\s*null\);\s*\}/.test(cd);
    const home = /public bool isInfoPaneBeside\(ContactDetails cd\)\s*\{\s*return infoPaneCol2Open\s*&&\s*ReferenceEquals\(cd,\s*infoPaneCol2Page\);\s*\}/.test(hp);
    const csproj = /Spixi\/Utils\/InfoPaneRules\.cs/.test(rd('scripts/csh/csh.csproj'));
    ok(bothSites && helper && home && csproj,
      '#1176 C#: sharedShow + the sharedOpen jump go through showInChat; beside the open chat only requestJump runs; the rule is executed by csh — '
      + JSON.stringify({ bothSites, helper, home, csproj }));
  });

  /* ———— #1177 shell: an accepted incoming transfer C# still holds is a progress tile after a re-built document ———— */
  await guard('#1177 shell', async () => {
    const s = await bootShell('chat.html');
    const T0 = Math.floor(Date.now() / 1000) - 600;
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    s.push('setPhotoPreviews', 'True');
    s.push('clearMessages', 'false');
    const file = (id, fid, name, t, extra) => s.push('addFile', id, 'addrPeer', 'Bob', '', fid, name, String(T0 + t), 'False', 'False', 'False', '0', 'False', 'False', 'True', ...extra);
    file('pp01', 'fp1', 'big.zip', 0, ['paused:41']);   // card, paused
    file('pp02', 'fp2', 'IMG_9.jpg', 5, ['paused:7']);  // photo tile, paused
    file('pp03', 'fp3', 'live.zip', 10, ['live:63']);   // card, live
    file('pp04', 'fp4', 'offer.zip', 15, []);           // an older exe / an offer: no argument
    file('pp05', 'fp5', 'junk.zip', 20, ['paused:<b>x</b>']);   // a malformed argument = no argument
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(300);
    const rowOf = (id) => s.d.querySelector('#messages [data-msgid="' + id + '"]');
    const card = (id) => { const r = rowOf(id); return r ? r.querySelector('.c-fbubble') : null; };
    const txt = (id) => { const r = rowOf(id); return r ? r.textContent : ''; };
    const tile = (id) => { const r = rowOf(id); return r ? r.querySelector('.c-mbubble[data-file]') : null; };
    const r = {
      pausedCard: !!card('pp01') && card('pp01').dataset.state === 'progress' && /Paused · 41%/.test(txt('pp01')) && !/(Tap|Click) to download/.test(txt('pp01')),
      pausedTile: !!tile('pp02') && tile('pp02').dataset.file === 'progress' && /Paused · 7%/.test(txt('pp02')) && !/(Tap|Click) to download/.test(txt('pp02')),
      liveCard: !!card('pp03') && card('pp03').dataset.state === 'progress' && /63%/.test(txt('pp03')) && !/Paused/.test(txt('pp03')),
      offerUnchanged: !!card('pp04') && card('pp04').dataset.state === 'offer' && /(Tap|Click) to download/.test(txt('pp04')),
      junkIsOffer: !!card('pp05') && card('pp05').dataset.state === 'offer' && !/<b>/.test(rowOf('pp05') ? rowOf('pp05').innerHTML : '<b>'),
    };
    /* #46 F1-4: the accessible name says Paused too (the card's / tile's explicit aria-label + the progressbar) */
    const aria = (el) => (el ? el.getAttribute('aria-label') || '' : '');
    const bar = (id) => { const x = rowOf(id); return x ? x.querySelector('[role="progressbar"]') : null; };
    r.ariaPausedCard = /^Paused big\.zip$/.test(aria(card('pp01'))) && aria(bar('pp01')) === 'Paused';
    r.ariaPausedTile = /^Paused IMG_9\.jpg$/.test(aria(tile('pp02'))) && aria(bar('pp02')) === 'Paused';
    r.ariaLiveCard = /^Downloading live\.zip$/.test(aria(card('pp03')));
    /* the first live tick replaces the Paused label with the live percentage — and the accessible name with Downloading */
    const row1 = rowOf('pp01');
    s.push('updateFile', 'fp1', '42', 'False');
    await sleep(80);
    r.tickClears = /42%/.test(txt('pp01')) && !/Paused/.test(txt('pp01'));
    r.tickAria = /^Downloading big\.zip$/.test(aria(card('pp01'))) && aria(bar('pp01')) === 'Downloading';
    /* #46 F1-5: a LATER re-render (another row lands → renderLogNow rebuilds every row) must not bring Paused back */
    file('pp06', 'fp6', 'after.zip', 25, []);
    await s.frame(); await sleep(80);
    r.rerendered = !!rowOf('pp01') && rowOf('pp01') !== row1 && !!rowOf('pp06');
    r.rerenderNoPaused = /42%/.test(txt('pp01')) && !/Paused/.test(txt('pp01')) && !/Paused/.test(aria(card('pp01')));
    r.rerenderUntickedStillPaused = /Paused · 7%/.test(txt('pp02'));
    ok(Object.values(r).every(Boolean) && noErr(s.errs), '#1177 shell: addFile arg 15 paused/live → a progress tile (Paused + last %, its accessible name too), never the offer; no arg → the offer; a live tick + a later re-render never show Paused — ' + JSON.stringify(r) + ' ' + s.errs.join('|').slice(0, 300));
    s.dom.window.close();
  });

  /* ———— #1177 C#: addFile carries incomingTransferArg LAST; the empty-uid guard; the rule decides ———— */
  await guard('#1177 C#', async () => {
    const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
    const pushLast = /string fTransfer\s*=\s*incomingTransferArg\(message,\s*uid\);\s*deliveryTicks\([^;]*;\s*push\(batch,\s*"addFile",[^;]*fSent\.ToString\(\),\s*fTransfer,\s*fLocal,\s*fVoice\);/.test(sc);   // ★ #1190 re-base: + arg 16 fLocal · ★ #1208 re-base: + arg 17 fVoice
    const fn = sc.slice(sc.indexOf('private static string incomingTransferArg('), sc.indexOf('private static string incomingTransferArg(') + 1200);
    const guardUid = /if\s*\(message\.localSender\s*\|\|\s*message\.completed\s*\|\|\s*string\.IsNullOrEmpty\(uid\)\)\s*\{\s*return "";\s*\}/.test(fn);
    const rule = /TransferManager\.getIncomingTransfer\(uid\)/.test(fn) && /t\.uid\s*!=\s*uid/.test(fn) && /FileRowRules\.transferStateArg\(true,\s*t\.completed,\s*true,\s*t\.fileStream\s*!=\s*null,/.test(fn) && /catch\s*\(Exception\)\s*\{\s*return "";\s*\}/.test(fn);
    ok(pushLast && guardUid && rule, '#1177 C#: addFile arg 15 = incomingTransferArg (empty uid never asked; FileRowRules decides; a throw = "") — ' + JSON.stringify({ pushLast, guardUid, rule }));
  });

  /* ———— #1178 copy: every locale has the six keys; the room keys keep {0}; en-us never says "received" ———— */
  await guard('#1178 copy', async () => {
    const LOCS = ['cn-cn', 'de-de', 'en-us', 'es-co', 'fr-fr', 'id-id', 'it-it', 'ja-jp', 'lt-lt', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp'];
    const KEYS = ['notification-file', 'notification-photo', 'notification-file-group', 'notification-photo-group', 'notification-file-neutral', 'notification-photo-neutral'];
    const bad = [];
    let en = {};
    for (const loc of LOCS) {
      const t = rd('Spixi/Resources/Raw/lang/' + loc + '.txt').replace(/^﻿/, '');
      const map = {};
      for (const line of t.split(/\r?\n/)) { const m = /^([a-z0-9-]+)\s*=\s*(.*)$/.exec(line); if (m) map[m[1]] = m[2]; }
      for (const k of KEYS) {
        if (!map[k]) bad.push(loc + ':' + k + ' missing');
        else if (/-group$/.test(k) && !map[k].includes('{0}')) bad.push(loc + ':' + k + ' no {0}');
        else if (!/-group$/.test(k) && /\{\d\}/.test(map[k])) bad.push(loc + ':' + k + ' a stray {n}');
      }
      if (loc === 'en-us') en = map;
    }
    const noReceived = KEYS.every((k) => en[k] && !/received/i.test(en[k]));
    ok(bad.length === 0 && noReceived && en['notification-file'] === 'Sent you a file' && en['notification-photo-group'] === '{0} sent a photo',
      '#1178 copy: 13 locales × 6 keys, {0} in the room keys, en-us never "received" — ' + JSON.stringify({ bad: bad.slice(0, 8), noReceived }));
  });

  /* ———— #1178 C#: the offer path uses the new keys; never the file name ———— */
  await guard('#1178 C#', async () => {
    const nd = stripCode(rd('Spixi/Meta/Node.cs'));
    const site = /string notifText\s*=\s*type\s*==\s*FriendMessageType\.fileHeader\s*\?\s*\(voiceFileNotificationText\(friend,\s*friend_message\)\s*\?\?\s*fileOfferNotificationText\(friend,\s*friend_message,\s*sender_address\)\)\s*:\s*voiceNotificationText\(friend,\s*type,\s*friend_message\)\s*\?\?\s*notificationTextForType\(type\);/.test(nd);   // ★ #1208 re-base: an inline voice text gets its own label (pins-s7/core.mjs)
    const fnStart = nd.indexOf('private static string fileOfferNotificationText(');
    const fn = nd.slice(fnStart, nd.indexOf('public static FriendMessage? addMessageWithType(FriendMessageType type', fnStart));
    const body = /SharedItems\.isImageName\(fileName\)/.test(fn) && /bool showSender\s*=\s*SNotificationPrefs\.showSenderName;/.test(fn)
      && /FileRowRules\.fileNotificationKey\(isPhoto,\s*isRoom,\s*showSender,\s*member,\s*out string\? memberArg\)/.test(fn)
      && /return FileRowRules\.fileNotificationText\(key,\s*SpixiLocalization\._SL\(key\),\s*memberArg\);/.test(fn)
      && (fn.match(/fileName/g) || []).length === 2;   // parsed + tested for a picture — never placed in the text
    const noOld = !/"File received"/.test(nd);
    const csproj = /Spixi\/Utils\/FileRowRules\.cs/.test(rd('scripts/csh/csh.csproj'));
    ok(site && body && noOld && csproj, '#1178 C#: a file offer notifies through fileOfferNotificationText (FileRowRules keys, photo by extension, no file name) — ' + JSON.stringify({ site, body, noOld, csproj }));
  });
}
