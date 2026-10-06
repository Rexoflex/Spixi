/* ==== SESSION 6b — agent C: the C# seams of #1197 (capability answer) · #1198 (reply) · #1199 (edit) · #1202 (#1190 items) ====
 * The pure rules (SpixiProtocols, ReplyQuote, EditRules) are EXECUTED in scripts/csh (SpixiProtocolsTests.cs,
 * ReplyQuoteTests.cs, EditRulesTests.cs). The call sites are MAUI-bound and compile nowhere here, so they are pinned on
 * comment-stripped source (stripCode keeps string literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks (#802) — each fails exactly the named pin (recorded in the session report):
 *   StreamProcessor getAppProtocols: `friend.approved` → `true`                       → #1197 answer
 *   StreamProcessor chatStream guard: `return null;` dropped                         → #1199 drop guard
 *   Node: `&& !friend_message_with_status.updated` dropped                             → #1199 no alert on update
 *   Node: the setLastMessage re-copy dropped                                          → #1199 chats-row excerpt
 *   SingleChatPage setCaps: `if (!friend.bot)` → `if (true)`                           → #1198/#1199 caps
 *   SingleChatPage onEditMessage: `if (verdict != EditVerdict.ok)` → `if (false)`      → #1199 chatedit
 *   SingleChatPage onQuoteJump: requestJump(f, idHex, …)                               → #1198 quotejump
 *   SingleChatPage insertMessage: drop `quoteText` from the addMe/addThem push        → arg counts
 *   SingleChatPage updateMessage: drop `edited`                                       → arg counts
 *   SingleChatPage onSend: composeReply moved after the bot price                     → #1198 onSend
 *   HomePage getFriendMessageHelper: the strip dropped                                → #1198 excerpt strip
 *   SettingsPage deleteDownload: sourceOf after File.Delete                           → #1202 downloads delete
 *   (#46 r1) replyNameOf: the room branch → friend.nickname · replyCandidateOf: drop the memo sequence test · matchReply: `self` → "" ·
 *   loadMessages: the prefetch moved inside the lock · HomePage rowTime → lastmsg.timestamp · SharedItems: strip dropped · onQuoteJump: the busy flag
 *   SingleChatPage recheckBurstFileRows: `!= "1"` → `== "1"`                            → #1202 delete-during-load */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };

  /* the body of the FIRST member whose header matches `head` (a string), by brace depth on stripped source
     (string / char literals are skipped so "{0}" never counts) */
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") {
        for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; }
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  /* the top-level argument list of the call that starts at `idx` (idx = the index of the call name) */
  const argsAt = (sc, idx) => {
    let i = sc.indexOf('(', idx);
    const args = [];
    let depth = 0, cur = '';
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") {
        let j = i + 1;
        for (; j < sc.length && sc[j] !== c; j++) { if (sc[j] === '\\') j++; }
        if (depth >= 1) cur += sc.slice(i, j + 1);
        i = j;
        continue;
      }
      if (c === '(') { depth++; if (depth === 1) continue; }
      else if (c === ')') { depth--; if (depth === 0) { args.push(cur.trim()); return args; } }
      else if (c === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    return args;
  };
  const allCs = () => {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        const p = dir + '/' + e.name;
        if (e.isDirectory()) { if (!/\/(bin|obj|Platforms)$/.test(p)) walk(p); }
        else if (e.name.endsWith('.cs')) out.push(p);
      }
    };
    walk('Spixi');
    return out;
  };

  const SP = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  const NODE = stripCode(rd('Spixi/Meta/Node.cs'));
  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));

  /* ———— #1197: getAppProtocols is answered ONLY through the rule + limiter, with the Core sender ———— */
  await guard('#1197 answer', async () => {
    const at = SP.indexOf('case SpixiMessageCode.getAppProtocols:');
    const cs = at >= 0 ? SP.slice(at, SP.indexOf('break;', at) + 6) : '';
    const claim = /if\s*\(\s*SpixiProtocols\.claimAnswer\(\s*friend\?\.walletAddress\.ToString\(\),\s*friend\s*!=\s*null,\s*friend\s*!=\s*null\s*&&\s*friend\.type\s*==\s*FriendType\.Normal,\s*friend\s*!=\s*null\s*&&\s*friend\.bot,\s*friend\s*!=\s*null\s*&&\s*friend\.approved\s*&&\s*friend\.state\s*==\s*FriendState\.Approved,\s*Environment\.TickCount64\)\s*\)\s*\{\s*CoreStreamProcessor\.sendAppProtocols\(friend!,\s*SpixiProtocols\.ids\(\)\);\s*\}/.test(cs);
    const onlySend = (SP.match(/sendAppProtocols\(/g) || []).length === 1;
    const csh = /Spixi\/Utils\/SpixiProtocols\.cs/.test(rd('scripts/csh/csh.csproj'));
    ok(at >= 0 && claim && onlySend && csh,
      '#1197 C#: case getAppProtocols answers ONLY when SpixiProtocols.claimAnswer(address, known, Normal, bot, approved && state Approved — #46 r1 A MINOR-4, TickCount64) says so, with CoreStreamProcessor.sendAppProtocols(friend, ids()); the one send site; the rule is executed by csh — '
      + JSON.stringify({ case: at >= 0, claim, onlySend, csh }));
  });

  /* ———— #1199: an edit (replace, seq > 0) of a message this device does not hold is DROPPED before Core is asked ———— */
  await guard('#1199 drop guard', async () => {
    const at = SP.indexOf('case SpixiMessageCode.chatStream:');
    const cs = bodyOf(SP, 'case SpixiMessageCode.chatStream:');
    const lookup = /FriendMessage\?\s*existing\s*=\s*friend\s*!=\s*null\s*&&\s*csm\.Sequence\s*>\s*0\s*&&\s*csm\.MessageId\s*!=\s*null\s*&&\s*\(\s*!csm\.IsStream\s*\|\|\s*!friend\.bot\s*\)\s*\?\s*friend\.getMessage\(spixi_message\.channel,\s*csm\.MessageId\)\s*:\s*null;/.test(cs);
    /* #46 r3 MINOR-3: the belt covers a STREAM chunk too (non-bot): never onto a system line or a non-text row */
    const g = cs.search(/if\s*\(\s*friend\s*!=\s*null\s*&&\s*!friend\.bot\s*&&\s*csm\.Sequence\s*>\s*0\s*&&\s*\(\s*\(\s*!csm\.IsStream\s*&&\s*existing\s*==\s*null\s*\)\s*\|\|\s*\(\s*existing\s*!=\s*null\s*&&\s*\(\s*existing\.type\s*!=\s*FriendMessageType\.standard\s*\|\|\s*UnreadRule\.isSystemLineId\(existing\.id\)\s*\)\s*\)\s*\)\s*\)\s*\{\s*Logging\.warn\([^;]*\);\s*sendReceivedConfirmation\(friend,\s*message\.id,\s*spixi_message\.channel\);\s*return null;\s*\}/);
    const add = cs.indexOf('Node.addMessageWithType(');
    const parse = cs.indexOf('new ChatStreamMessage(spixi_message.data)');
    /* #46 r2 MAJOR-1: a REPLACE passes the existing row's own time (Core writes it back), never the envelope's edit time */
    const keepTime = /long csmTime\s*=\s*existing\s*!=\s*null\s*&&\s*!csm\.IsStream\s*\?\s*existing\.timestamp\s*:\s*message\.timestamp;\s*var fm\s*=\s*Node\.addMessageWithType\(FriendMessageType\.standard,\s*sender_address,\s*spixi_message\.channel,\s*csm,\s*false,\s*group_sender_address,\s*csmTime,/.test(cs);
    ok(at >= 0 && lookup && g > parse && parse >= 0 && add > g && keepTime,
      '#1199 C#: the chatStream case drops a non-bot replace (!IsStream, Sequence > 0) whose id the channel does not hold, or a replace OR stream chunk (#46 r3 MINOR-3) onto a row that is not a text row (#46 r1 A MINOR-6) or is a local system line (#46 r2 MINOR-1) — receipt sent; a replace keeps the row\'s time (existing.timestamp, #46 r2 MAJOR-1), return null — BEFORE Node.addMessageWithType (Core would ADD it as a new message / rewrite a file or payment row) — '
      + JSON.stringify({ case: at >= 0, lookup, parse, guard: g, add, keepTime }));
  });

  /* ———— #1199: an UPDATE raises no notification, no flash, no sound; the chats row gets the new text ———— */
  await guard('#1199 node', async () => {
    const m = bodyOf(NODE, 'public static FriendMessage? addMessageWithType(FriendMessageType type, Address wallet_address, int channel, ChatStreamMessage chat_stream_message');
    const gateAt = m.search(/if\s*\(\s*oldMessage\s*==\s*false\s*&&\s*!friend_message_with_status\.updated\s*\)\s*\{/);
    const alerts = gateAt >= 0 ? bodyOf(m, 'if', gateAt) : '';
    const inside = /SPushService\.showLocalNotification\(/.test(alerts) && /SSystemAlert\.flash\(\);/.test(alerts) && /SSounds\.messageReceived\(\);/.test(alerts);
    const outside = m.replace(alerts, '');
    const noneOutside = !/showLocalNotification\(|SSystemAlert\.flash\(|SSounds\.message/.test(outside);
    const upd = m.search(/if\s*\(\s*friend_message_with_status\.updated\s*\)\s*\{/);
    const updBody = upd >= 0 ? bodyOf(m, 'if', upd) : '';
    const recopy = /FriendMessage\?\s*last\s*=\s*friend\.metaData\.lastMessage;\s*if\s*\(\s*!friend\.bot\s*&&\s*last\s*!=\s*null\s*&&\s*last\.id\s*!=\s*null\s*&&\s*friend_message\.id\s*!=\s*null\s*&&\s*friend\.metaData\.lastMessageChannel\s*==\s*channel\s*&&\s*last\.id\.SequenceEqual\(friend_message\.id\)\s*\)\s*\{\s*friend\.metaData\.setLastMessage\(friend_message,\s*channel\);\s*friend\.saveMetaData\(\);\s*\}/.test(updBody);
    const order = updBody.indexOf('setLastMessage(') >= 0 && updBody.indexOf('setLastMessage(') < updBody.indexOf('UIHelpers.updateMessage(friend, channel, friend_message);');
    ok(gateAt >= 0 && inside && noneOutside && recopy && order,
      '#1199 C#: Node.addMessageWithType — the notification, SSystemAlert.flash and the SND-1 sound sit inside `oldMessage == false && !updated`; an updated LAST message is re-copied into metaData.lastMessage BEFORE the row push — '
      + JSON.stringify({ gate: gateAt >= 0, inside, noneOutside, recopy, order }));
  });

  /* ———— #1198 / #1199: setCaps — reply everywhere, edit not in a bot room; the M1 block is gone ———— */
  await guard('#1198/#1199 caps', async () => {
    /* ★ #1208 re-base (session 7): the voice cap (V1, pins-s7/cs.mjs) sits between the edit block and the push */
    const caps = /string caps\s*=\s*"tipResult,composeSend,composeRequest,payRequest,reply";\s*if\s*\(\s*!friend\.bot\s*\)\s*\{\s*caps\s*\+=\s*",edit";\s*\}\s*if\s*\(\s*voiceCapFor\(friend\)\s*\)\s*\{\s*caps\s*\+=\s*",voice";\s*\}\s*Utils\.sendUiCommand\(this,\s*"setCaps",\s*caps\);/.test(SCP);
    const one = (SCP.match(/"setCaps"/g) || []).length === 1;
    const raw = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
    const m1gone = !/do NOT add ",reply"|THE CARRIER IS NOT HERE|carrier is not landed/.test(raw) && /★★ #1198 \/ #1199 \(session 6b\): REPLY and EDIT are declared here/.test(raw);
    ok(caps && one && m1gone,
      '#1198/#1199 C#: setCaps declares reply for every chat and edit unless friend.bot (one setCaps site); the M1 "do NOT add ,reply" / carrier blocks are replaced by the ★ #1198 comment — ' + JSON.stringify({ caps, one, m1gone }));
  });

  /* ———— #1199: ixian:chatedit — parsed, re-checked by EditRules, refused → re-push; allowed → local replace, then send ———— */
  await guard('#1199 chatedit', async () => {
    const at = SCP.indexOf('current_url.StartsWith("ixian:chatedit:", StringComparison.Ordinal)');
    const branch = at >= 0 ? bodyOf(SCP, ')', at) : '';
    const parse = /string payload\s*=\s*current_url\.Substring\("ixian:chatedit:"\.Length\);\s*int sep\s*=\s*payload\.IndexOf\(':'\);\s*if\s*\(\s*sep\s*>\s*0\s*\)\s*\{\s*onEditMessage\(payload\.Substring\(0,\s*sep\),\s*payload\.Substring\(sep\s*\+\s*1\)\);\s*\}/.test(branch);
    const beforeChat = at >= 0 && at < SCP.indexOf('current_url.StartsWith("ixian:chat:")');
    const m = bodyOf(SCP, 'private void onEditMessage(string idHex, string newText)');
    /* #46 r1: the window runs from the ORIGINAL time (Damir P1); the unchanged check is against the BODY a quote-shaped text
       shows, and its quote line is kept (C W3) */
    const body = /string\?\s*quoteLine\s*=\s*null;\s*string currentBody\s*=\s*msg\.message\s*\?\?\s*"";\s*if\s*\(\s*ReplyQuote\.splitShape\(msg\.message,\s*out string line,\s*out string shownBody\)\s*\)\s*\{\s*quoteLine\s*=\s*line;\s*currentBody\s*=\s*shownBody;\s*\}\s*EditVerdict verdict/.test(m);
    const check = body && /EditVerdict verdict\s*=\s*EditRules\.canEdit\(msg\.localSender,\s*msg\.type,\s*UnreadRule\.isSystemLineId\(msg\.id\),\s*msg\.message,\s*friend\.bot,\s*Clock\.getTimestamp\(\),\s*msg\.timestamp,\s*msg\.sequence,\s*newer,\s*newText,\s*currentBody,\s*quoteLine,\s*CoreConfig\.maxChatMessageSize\);\s*if\s*\(\s*verdict\s*!=\s*EditVerdict\.ok\s*\)\s*\{\s*Logging\.info\([^;]*\);\s*repushRefusedEdit\(msg,\s*channel\);\s*return;\s*\}/.test(m);
    /* #46 r2 MAJOR-2: EVERY refusal after the row was found re-pushes it (verdict, Core's local refusal, a throw); before it
       (unusable id, not in memory) nothing is pushed */
    const iFound = m.indexOf('if (msg == null)');
    const pre = m.slice(0, iFound);
    const repushes = (m.match(/repushRefusedEdit\(msg,\s*channel\);/g) || []).length === 3
      && /if\s*\(\s*replaced\s*==\s*null\s*\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*repushRefusedEdit\(msg,\s*channel\);\s*return;\s*\}/.test(m)
      && /catch\s*\(Exception e\)\s*\{\s*Logging\.warn\([^;]*\);\s*if\s*\(\s*msg\s*!=\s*null\s*\)\s*\{\s*try\s*\{\s*repushRefusedEdit\(msg,\s*channel\);\s*\}/.test(m)
      && !/repushRefusedEdit|updateMessage/.test(pre) && !/updateMessage\(/.test(m)
      && /private void repushRefusedEdit\(FriendMessage msg, int channel\)\s*\{\s*updateMessage\(msg,\s*channel\);\s*\}/.test(SCP);
    const csm = /new IXICore\.Streaming\.Models\.ChatStreamMessage\(msg\.id,\s*full,\s*msg\.sequence\s*\+\s*1,\s*false\)/.test(m);
    const local = /Node\.addMessageWithType\(FriendMessageType\.standard,\s*friend\.walletAddress,\s*channel,\s*csm,\s*true,\s*IxianHandler\.getWalletStorage\(\)\.getPrimaryAddress\(\),\s*msg\.timestamp,\s*false,\s*false,\s*len\)/.test(m);   // #46 r2 MAJOR-1: the own replace keeps the row's time
    const send = /CoreStreamProcessor\.sendSpixiMessage\(friend,\s*sm,\s*null,\s*null,\s*true,\s*true,\s*false,\s*false\);/.test(m);
    const order = m.indexOf('EditRules.canEdit(') < m.indexOf('Node.addMessageWithType(') && m.indexOf('Node.addMessageWithType(') < m.indexOf('if (replaced == null)')
      && m.indexOf('if (replaced == null)') < m.indexOf('CoreStreamProcessor.sendSpixiMessage(');
    const ownList = /friend\.getMessages\(channel\)/.test(m) && /newer\s*=\s*mem\.Count\s*-\s*1\s*-\s*idx;/.test(m);
    const csh = /Spixi\/Utils\/EditRules\.cs/.test(rd('scripts/csh/csh.csproj'));
    ok(at >= 0 && parse && beforeChat && check && repushes && csm && local && send && order && ownList && csh,
      '#1199 C#: ixian:chatedit:<id>:<text> → onEditMessage: C#\'s own copy + depth, EditRules.canEdit re-check (refused → updateMessage re-push), then the local replace with our primary address, then the chatStream send (new envelope id, push OFF) — '
      + JSON.stringify({ branch: at >= 0, parse, beforeChat, check, repushes, csm, local, send, order, ownList, csh }));
  });

  /* ———— #1198: ixian:quotejump — C# looks the id up itself and jumps with ITS OWN hex ———— */
  await guard('#1198 quotejump', async () => {
    const at = SCP.indexOf('current_url.StartsWith("ixian:quotejump:", StringComparison.Ordinal)');
    const branch = at >= 0 ? bodyOf(SCP, ')', at) : '';
    const call = /onQuoteJump\(current_url\.Substring\("ixian:quotejump:"\.Length\)\);/.test(branch);
    const m = bodyOf(SCP, 'private void onQuoteJump(string idHex)');
    const parse = /byte\[\]\?\s*id\s*=\s*parseMessageIdHex\(idHex\);\s*if\s*\(\s*id\s*==\s*null\s*\)\s*\{[^}]*return;\s*\}/.test(m);
    const jumps = [...m.matchAll(/requestJump\(/g)].map((x) => argsAt(m, x.index));
    const ownHex = jumps.length === 2 && jumps.every((a) => a.length === 3 && a[1] !== 'idHex' && !/idHex/.test(a.join(',')))
      && /Crypto\.hashToString\(mem\[idx\]\.id\)/.test(jumps[0][1]) && jumps[1][1] === 'ownHex' && /string ownHex\s*=\s*Crypto\.hashToString\(disk\[at\]\.id\);/.test(m);
    const bounded = /readLastMessages\(f,\s*channel,\s*0,\s*SharedItems\.JumpCap\)/.test(m) && /Task\.Run\(/.test(m) && /MainThread\.BeginInvokeOnMainThread\(\(\)\s*=>\s*requestJump\(/.test(m)
      // #46 r1 A NIT-3: one disk read at a time (a tap while one runs is dropped; the flag clears in a finally)
      && /if\s*\(\s*Interlocked\.CompareExchange\(ref quoteJumpBusy,\s*1,\s*0\)\s*!=\s*0\s*\)\s*\{\s*return;/.test(m) && /finally\s*\{\s*Interlocked\.Exchange\(ref quoteJumpBusy,\s*0\);\s*\}/.test(m)
      && m.indexOf('Interlocked.CompareExchange') < m.indexOf('Task.Run(');
    ok(at >= 0 && call && parse && ownHex && bounded,
      '#1198 C#: ixian:quotejump:<id> → onQuoteJump: the id parsed, looked up in C#\'s own list (else the newest JumpCap rows on disk, off the UI thread), requestJump with C#\'s OWN hex — never the WebView\'s — '
      + JSON.stringify({ branch: at >= 0, call, parse, ownHex, bounded, jumps }));
  });

  /* ———— #1198: onSend composes the quote BEFORE the bot price and the send ———— */
  await guard('#1198 onSend', async () => {
    const m = bodyOf(SCP, 'public void onSend(string str, string reply_to_id_hex = "")');
    const comp = m.search(/if\s*\(\s*!string\.IsNullOrEmpty\(reply_to_id_hex\)\s*\)\s*\{\s*string\?\s*composed\s*=\s*composeReply\(reply_to_id_hex,\s*str,\s*out string replyTargetHex\);\s*if\s*\(\s*composed\s*!=\s*null\s*\)\s*\{\s*str\s*=\s*composed;\s*replyMessageId\s*=\s*Guid\.NewGuid\(\)\.ToByteArray\(\);\s*replyTargetForSend\s*=\s*replyTargetHex;\s*\}\s*\}/);
    // #46 r2 NIT: remembered only after the bot price, right before the store; forgotten if the store failed
    const iRem = m.search(/if\s*\(\s*replyMessageId\s*!=\s*null\s*&&\s*replyTargetForSend\s*!=\s*null\s*\)\s*\{\s*rememberReplyTarget\(Crypto\.hashToString\(replyMessageId\),\s*replyTargetForSend\);\s*\}\s*FriendMessage friend_message\s*=\s*Node\.addMessageWithType\(replyMessageId,/);
    const forget = /if\s*\(\s*friend_message\s*==\s*null\s*\)\s*\{\s*if\s*\(\s*replyMessageId\s*!=\s*null\s*\)\s*\{\s*replyTargets\.TryRemove\(Crypto\.hashToString\(replyMessageId\),\s*out _\);\s*\}/.test(m);
    // #46 r1 C M-1: the composed reply's id exists BEFORE Core stores it, so this device's match prefers the remembered target
    const ownId = /Node\.addMessageWithType\(replyMessageId,\s*FriendMessageType\.standard,/.test(m) && /byte\[\]\?\s*replyMessageId\s*=\s*null;/.test(m);
    const price = m.indexOf('friend.getMessagePrice(str.Length)');
    const send = m.indexOf('new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(str), selectedChannel)');
    const c = bodyOf(SCP, 'private string? composeReply(string idHex, string body, out string targetHex)');
    const compose = /ReplyQuote\.compose\(replyNameOf\(target\),\s*excerpt,\s*body\)/.test(c) && /findChannelMessage\(selectedChannel,\s*id\)/.test(c)
      && /if\s*\(\s*text\.Length\s*>\s*CoreConfig\.maxChatMessageSize\s*\)/.test(c);
    ok(comp >= 0 && price > comp && send > price && compose && ownId && iRem > price && forget && (m.match(/rememberReplyTarget\(/g) || []).length === 1,
      '#1198 C#: onSend composes the quote line (composeReply: C#\'s own target in this channel, ReplyQuote.compose, the size bound) before the bot price and the chat send — ' + JSON.stringify({ comp, price, send, compose, ownId, iRem, forget }));
  });

  /* ———— #1198 / #1199: EVERY addMe / addThem / updateMessage builder carries the new args ———— */
  await guard('arg counts', async () => {
    const sites = [];
    for (const f of allCs()) {
      const sc = stripCode(rd(f));
      for (const x of sc.matchAll(/\bpush\(\s*batch\s*,\s*prefix\s*,/g)) sites.push({ f, kind: 'row', a: argsAt(sc, x.index) });
      for (const x of sc.matchAll(/(?:sendUiCommand|push)\([^;]*?"(addMe|addThem)"/g)) sites.push({ f, kind: 'literal-' + x[1], a: argsAt(sc, x.index) });
      for (const x of sc.matchAll(/sendUiCommand\(\s*this\s*,\s*"updateMessage"/g)) sites.push({ f, kind: 'update', a: argsAt(sc, x.index) });
    }
    const rows = sites.filter((s) => s.kind === 'row');
    const updates = sites.filter((s) => s.kind === 'update');
    const literal = sites.filter((s) => s.kind.startsWith('literal'));
    const prefixOnly = /string prefix\s*=\s*"addMe";/.test(SCP) && /prefix\s*=\s*"addThem";/.test(SCP) && (SCP.match(/prefix\s*=\s*"/g) || []).length === 2;
    // push(batch, prefix, id, address, nick, avatar, text, ts, sent, confirmed, read, paid, err, relation, replyTo, edited, quoteName, quoteText)
    /* ★ #1208 re-base (session 7): + arg 17 `rowVoice` (V2) on the row, + arg 12 `voice` on updateMessage */
    const rowOk = rows.length === 1 && rows.every((s) => s.a.length === 19 && s.a[6] === 'rowText' && s.a[7] === 'rowTime.ToString()' && s.a[14] === 'reply_to' && s.a[15] === 'edited' && s.a[16] === 'quoteName' && s.a[17] === 'quoteText' && s.a[18] === 'rowVoice');
    // sendUiCommand(this, "updateMessage", id, message, sent, confirmed, read, paid, errorSending, edited, replyTo, quoteName, quoteText)
    const updOk = updates.length === 1 && updates.every((s) => s.a.length === 14 && s.a[3] === 'rowText' && s.a[9] === 'edited' && s.a[10] === 'replyTo' && s.a[11] === 'quoteName' && s.a[12] === 'quoteText' && s.a[13] === 'voice');
    const ins = bodyOf(SCP, 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)');
    const upd = bodyOf(SCP, 'public void updateMessage(FriendMessage message, int channel)');
    const matchIns = /if\s*\(\s*matchReply\(message,\s*channel,\s*batch\?\.replyIndex,\s*out ReplyQuote\.Match\?\s*rm\)\s*&&\s*rm\s*!=\s*null\s*\)\s*\{\s*rowText\s*=\s*rm\.body;\s*reply_to\s*=\s*rm\.targetIdHex;\s*quoteName\s*=\s*rm\.quoteName;\s*quoteText\s*=\s*rm\.quoteText;\s*\}\s*string edited\s*=\s*EditRules\.isEdited\(message\.type,\s*message\.sequence,\s*friend\.bot\)\s*\?\s*"1"\s*:\s*"";\s*long rowTime\s*=\s*message\.timestamp;/.test(ins);
    const matchUpd = /if\s*\(\s*matchReply\(message,\s*channel,\s*null,\s*out ReplyQuote\.Match\?\s*rm\)\s*&&\s*rm\s*!=\s*null\s*\)\s*\{\s*rowText\s*=\s*rm\.body;\s*replyTo\s*=\s*rm\.targetIdHex;\s*quoteName\s*=\s*rm\.quoteName;\s*quoteText\s*=\s*rm\.quoteText;\s*\}\s*string edited\s*=\s*EditRules\.isEdited\(message\.type,\s*message\.sequence,\s*friend\.bot\)\s*\?\s*"1"\s*:\s*"";/.test(upd);
    ok(literal.length === 0 && prefixOnly && rowOk && updOk && matchIns && matchUpd,
      'P1/P2: every addMe / addThem builder carries 16 args (text = the matched BODY, 13 replyTo, 14 edited, 15 quoteName, 16 quoteText) and every updateMessage builder 11 (2 = body, 8 edited, 9 replyTo, 10 quoteName, 11 quoteText), both from matchReply + EditRules.isEdited — '
      + JSON.stringify({ literal: literal.length, prefixOnly, rows: rows.map((s) => s.f + ':' + s.a.length), updates: updates.map((s) => s.f + ':' + s.a.length), rowOk, updOk, matchIns, matchUpd }));
  });

  /* ———— #1198 / #46 r1 A MAJOR-1: the match never REPLACES Core's cache; the ONE deeper read happens only on the load path,
     before `lock (messages)`, off the UI thread; a live push / the UI thread read nothing; one index per load ———— */
  await guard('#1198 match source', async () => {
    const snap = bodyOf(SCP, 'private List<FriendMessage> channelSnapshot(int channel)');
    const pre = bodyOf(SCP, 'private void prefetchReplyDeep(int channel)');
    const snapOk = /mem\s*=\s*friend\.getMessages\(channel\);/.test(snap) && /lock\s*\(\s*mem\s*\)\s*\{\s*return new List<FriendMessage>\(mem\);\s*\}/.test(snap);
    const preOk = /if\s*\(\s*MainThread\.IsMainThread\s*\)\s*\{\s*return;\s*\}/.test(pre) && /readLastMessages\(friend,\s*channel,\s*0,\s*ReplyQuote\.DeepSearchMax\)/.test(pre)
      && pre.indexOf('MainThread.IsMainThread') < pre.indexOf('readLastMessages(');
    const reads = (SCP.match(/ReplyQuote\.DeepSearchMax/g) || []).length === 1;
    const callers = [...SCP.matchAll(/prefetchReplyDeep\(/g)].length === 2;   // the definition + ONE call
    const lm = bodyOf(SCP, 'public void loadMessages()');
    const iShape = lm.search(/headRun\s*=\s*CoreMessageWriter\.arrivals\.sameSecondHeadRun\(messages\);\s*anyReplyShaped\s*=\s*messages\.Exists\(m\s*=>\s*m\.type\s*==\s*FriendMessageType\.standard\s*&&\s*ReplyQuote\.looksLikeReply\(m\.message\)\);/);
    const iPre = lm.search(/UiBatch batch = new UiBatch\(\);\s*if\s*\(\s*anyReplyShaped\s*\)\s*\{\s*prefetchReplyDeep\(readChannel\);\s*\}/);
    const iBuildLock = lm.indexOf('System.Diagnostics.Stopwatch buildClock');
    const iIdx = lm.search(/lastLoadPushed = 0;\s*if\s*\(\s*anyReplyShaped\s*\)\s*\{\s*batch\.replyIndex\s*=\s*buildReplyIndex\(readChannel,\s*messages\);\s*\}/);
    const order = iShape > 0 && iShape < iPre && iPre > 0 && iPre < iBuildLock && iIdx > iBuildLock && iIdx < lm.indexOf('foreach (FriendMessage message in messages)');
    const bi = bodyOf(SCP, 'private ReplyQuote.Index buildReplyIndex(int channel, List<FriendMessage> mem)');
    const noRead = /replyDeepCached\(channel\)/.test(bi) && !/readLastMessages|prefetchReplyDeep/.test(bi)
      && !/readLastMessages|prefetchReplyDeep/.test(bodyOf(SCP, 'private bool matchReply(FriendMessage message, int channel, ReplyQuote.Index? index, out ReplyQuote.Match? match)'))
      && !/readLastMessages|prefetchReplyDeep/.test(bodyOf(SCP, 'private FriendMessage? findChannelMessage(int channel, byte[] id)'));
    const liveWins = /if\s*\(\s*d\.id\s*!=\s*null\s*&&\s*!live\.Contains\(Crypto\.hashToString\(d\.id\)\)\s*\)/.test(bi);
    const reset = /resetReplyDeep\(\);/.test(bodyOf(SCP, 'private void onLoad()'));
    const csh = /Spixi\/Utils\/ReplyQuote\.cs/.test(rd('scripts/csh/csh.csproj'));
    ok(snapOk && preOk && reads && callers && order && noRead && liveWins && reset && csh,
      '#1198 C# (#46 r1 A MAJOR-1): candidates = a copy of Friend.getMessages(channel) (never a replacing read) + the CACHED deeper read (a live row wins); the ONE readLastMessages(DeepSearchMax) is prefetchReplyDeep, called only by loadMessages BEFORE lock(messages), never on the UI thread; the load builds ONE index inside the lock; matchReply / findChannelMessage / buildReplyIndex never read — '
      + JSON.stringify({ snapOk, preOk, reads, callers, iShape, iPre, iBuildLock, iIdx, order, noRead, liveWins, reset, csh }));
  });

  /* ———— #46 r1 A MAJOR-1 / C M-1 / M-2 / W1 / W4: the memo, the remembered target, the original time, the self skip, isImage ———— */
  await guard('#1198 candidates', async () => {
    const rc = bodyOf(SCP, 'private ReplyQuote.Candidate? replyCandidateOf(FriendMessage? m)');
    const memo = /if\s*\(\s*replyMemo\.TryGetValue\(idHex,\s*out ReplyQuote\.Candidate\?\s*memo\)\s*&&\s*memo\.sequence\s*==\s*m\.sequence\s*&&\s*memo\.type\s*==\s*m\.type\s*&&\s*string\.Equals\(memo\.text,\s*m\.message,\s*StringComparison\.Ordinal\)\s*&&\s*string\.Equals\(memo\.nameKey,\s*rawName,\s*StringComparison\.Ordinal\)\s*\)\s*\{\s*return memo;\s*\}/.test(rc)
      && /rawName\s*=\s*replyNameOf\(m\)\s*\?\?\s*"";/.test(rc);   // #46 r2 NIT: a roster nick change rebuilds the candidate
    const time = /timestamp\s*=\s*m\.timestamp,/.test(rc);
    const image = /if\s*\(\s*m\.type\s*==\s*FriendMessageType\.fileHeader\s*&&\s*SharedItems\.parseFileHeader\(m\.message,\s*out string name,\s*out _\)\s*\)\s*\{\s*c\.fileName\s*=\s*name;\s*c\.isImage\s*=\s*SharedItems\.isImageName\(name\);\s*\}/.test(rc);
    const expected = /c\.nameKey\s*=\s*rawName;\s*c\.expectedName\s*=\s*ReplyQuote\.nameFor\(rawName\);/.test(rc);
    const bounded = /if\s*\(\s*replyMemo\.Count\s*>=\s*ReplyMemoMax\s*\)/.test(rc);
    const mr = bodyOf(SCP, 'private bool matchReply(FriendMessage message, int channel, ReplyQuote.Index? index, out ReplyQuote.Match? match)');
    const shapeFirst = mr.search(/if\s*\(\s*message\.type\s*!=\s*FriendMessageType\.standard\s*\|\|\s*!ReplyQuote\.looksLikeReply\(message\.message\)\s*\)\s*\{\s*return false;\s*\}/) >= 0
      && mr.indexOf('looksLikeReply') < mr.indexOf('buildReplyIndex');
    const self = /string self\s*=\s*message\.id\s*!=\s*null\s*\?\s*Crypto\.hashToString\(message\.id\)\s*:\s*"";/.test(mr)
      && /ReplyQuote\.tryMatch\(message\.message,\s*replyTime,\s*self,\s*idx,\s*preferred,\s*out match\)/.test(mr)
      && /replyTargets\.TryGetValue\(self,\s*out string\?\s*preferred\);/.test(mr)
      && /long replyTime\s*=\s*message\.timestamp;/.test(mr);
    const fallback = /match\s*=\s*ReplyQuote\.fallbackOf\(message\.message\);\s*return match\s*!=\s*null;\s*\}$/.test(mr.trim());
    ok(memo && time && image && expected && bounded && shapeFirst && self && fallback,
      '#1198 C# (#46 r1): candidates are memoised by id + sequence + text (bounded) with the ORIGINAL time, a photo tested by SharedItems.isImageName, the expected sender name; matchReply checks the shape first, skips the reply itself, prefers the remembered compose target, and falls back to Damir P2\'s box — '
      + JSON.stringify({ memo, time, image, expected, bounded, shapeFirst, self, fallback }));
  });

  /* ———— #46 r1 A MAJOR-2 (privacy): the quote NAME is never the user's private alias ———— */
  await guard('#1198 quote name', async () => {
    const rn = bodyOf(SCP, 'private string replyNameOf(FriendMessage target)');
    const oneToOne = /^\{\s*if\s*\(\s*!\(\s*friend\.bot\s*\|\|\s*friend\.type\s*==\s*FriendType\.Group\s*\)\s*\)\s*\{\s*return "";\s*\}/.test(rn.trim());
    const own = /if\s*\(\s*target\.localSender\s*\)\s*\{\s*return IxianHandler\.localStorage\.nickname\s*\?\?\s*"";\s*\}/.test(rn);
    const room = /if\s*\(\s*!string\.IsNullOrEmpty\(target\.senderNick\)\s*\)\s*\{\s*return target\.senderNick;\s*\}[\s\S]*?friend\.users\.getUser\(who\)\?\.getNick\(\)\s*\?\?\s*"";\s*\}\s*return "";\s*\}$/.test(rn.trim());
    const noAlias = !/\.nickname\b/.test(rn.split('IxianHandler.localStorage.nickname').join('')) && !/FriendList\.getFriend|resolveNick|userDefinedNick|setUserDefinedNick/.test(rn);
    const noReflection = !/System\.Reflection|GetField\(|"_nick"/.test(stripCode(SCP));
    const used = /ReplyQuote\.compose\(replyNameOf\(target\),/.test(SCP);
    ok(oneToOne && own && room && noAlias && noReflection && used,
      '#1198 C# (#46 r1 A MAJOR-2, the lead\'s r1 change): the quote name = NONE in a 1:1 (either side) · in a room my own nick for my message, else the message\'s senderNick or the roster member\'s own nick — never Friend.nickname (it returns the private alias), FriendList.getFriend(..).nickname, resolveNick, and no reflection read of Core\'s private _nick — '
      + JSON.stringify({ oneToOne, own, room, noAlias, noReflection, used }));
  });

  /* ———— Damir P1 (#46 r2 MAJOR-1): ONE clock — Core's `timestamp`, which every replace keeps; no second time source ———— */
  await guard('P1 original time', async () => {
    const hm = bodyOf(HOME, 'private FriendMessageHelper? getFriendMessageHelper(Friend friend, out string excerptKind, out string excerptSender)');
    const row = /FriendMessageHelper helper_msg\s*=\s*new\(friend\.walletAddress\.ToString\(\),\s*friend\.nickname,\s*lastmsg\.timestamp,/.test(hm);
    const si = stripCode(rd('Spixi/Utils/SharedItems.cs'));
    const links = /List<string> links\s*=\s*LinkRule\.extract\(ReplyQuote\.stripForExcerpt\(fm\.message\)\);/.test(si) && /kind = "link", label = u, ts = fm\.timestamp,/.test(si);
    const files = ['Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Pages/Home/HomePage.xaml.cs', 'Spixi/Utils/SharedItems.cs', 'Spixi/Utils/EditRules.cs', 'Spixi/Utils/ReplyQuote.cs', 'Spixi/Network/StreamProcessor.cs'];
    const noSecondClock = files.every((f) => !/displayTime|receivedTimestamp/.test(stripCode(rd(f))));
    ok(row && links && noSecondClock,
      'Damir P1 (#46 r2 MAJOR-1): the chats row and chat info\'s links use Core\'s `timestamp` (an edit keeps it — the replace passes it back); no displayTime / receivedTimestamp (this device\'s arrival clock) anywhere in the reply / edit path; links from the BODY — ' + JSON.stringify({ row, links, noSecondClock }));
  });

  /* ———— #1198: the chats-list excerpt shows the BODY of a reply ———— */
  await guard('#1198 excerpt strip', async () => {
    const m = bodyOf(HOME, 'private FriendMessageHelper? getFriendMessageHelper(Friend friend, out string excerptKind, out string excerptSender)');
    const strip = /string excerpt\s*=\s*lastmsg\.message;\s*if\s*\(\s*lastmsg\.type\s*==\s*FriendMessageType\.standard\s*\)\s*\{\s*excerpt\s*=\s*ReplyQuote\.stripForExcerpt\(excerpt\);\s*\}/.test(m);
    ok(strip, '#1198 C#: HomePage.getFriendMessageHelper strips the quote line of a standard last message (ReplyQuote.stripForExcerpt) — ' + JSON.stringify({ strip }));
  });

  /* ———— #1202 (#1190 TODO): the Downloads delete and the contact purge refresh an OPEN chat's file rows ———— */
  await guard('#1202 downloads delete', async () => {
    const at = SET.indexOf('current_url.StartsWith("ixian:deleteDownload:", StringComparison.Ordinal)');
    const b = at >= 0 ? bodyOf(SET, ')', at) : '';
    const src = b.indexOf('deletedSrc = DownloadsIndex.sourceOf(path);');
    const del = b.indexOf('File.Delete(path);');
    const refresh = /if\s*\(\s*deletedSrc\s*!=\s*null\s*&&\s*path\s*!=\s*null\s*&&\s*!File\.Exists\(path\)\s*\)\s*\{\s*try\s*\{\s*Utils\.getChatPage\(deletedSrc\.friend\)\?\.refreshHeldFileRow\(deletedSrc\.message\);/.test(b);
    const failed = /catch\s*\(Exception ex\)\s*\{\s*deletedSrc\s*=\s*null;/.test(b);
    const held = /public bool refreshHeldFileRow\(FriendMessage\? message\)\s*\{\s*return refreshFileRow\(message,\s*selectedChannel\);\s*\}/.test(SCP);
    const purge = /int deleted\s*=\s*SContacts\.purgeFiles\(files,\s*owner\);[\s\S]{0,400}if\s*\(\s*deleted\s*>\s*0\s*&&\s*owner\s*!=\s*null\s*\)\s*\{\s*Address ownerAddress\s*=\s*owner;\s*MainThread\.BeginInvokeOnMainThread\(\(\)\s*=>\s*\{\s*try\s*\{\s*Friend\?\s*of\s*=\s*FriendList\.getFriend\(ownerAddress\);\s*if\s*\(\s*of\s*!=\s*null\s*\)\s*\{\s*Utils\.getChatPage\(of\)\?\.refreshHeldFileRows\(\);/.test(HOME);
    const todo = !/TODO\(#1190/.test(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs') + rd('Spixi/Utils/SContacts.cs'));
    ok(at >= 0 && src >= 0 && del > src && refresh && failed && held && purge && todo,
      '#1202 C#: deleteDownload resolves the row (DownloadsIndex.sourceOf) BEFORE File.Delete and, after a delete that happened, re-pushes the open chat\'s held row; the purge re-pushes the owner\'s held rows on the main thread; no TODO(#1190) left — '
      + JSON.stringify({ branch: at >= 0, src, del, refresh, failed, held, purge, todo }));
  });

  /* ———— #1202 (#1190 #46 r5 MINOR): a file deleted DURING a load is re-pushed AFTER the load's batch ———— */
  await guard('#1202 delete during load', async () => {
    const lm = bodyOf(SCP, 'public void loadMessages()');
    const iDone = lm.lastIndexOf('Utils.sendUiCommand(this, "messagesDone");');
    const iDoneP = lm.lastIndexOf('Utils.sendUiCommand(this, "messagesDone", show_more);');
    const iRe = lm.search(/enqueueThumb\(t\.Key,\s*t\.Value\);\s*\}\s*recheckBurstFileRows\(batch,\s*readChannel\);\s*foreach\s*\(KeyValuePair<string, FriendMessage> v in batch\.voices\)\s*\{\s*enqueueVoiceInfo\(v\.Key,\s*v\.Value\);\s*\}\s*\}\s*if\s*\(\s*zeroedUnread\s*\)/);   /* ★ #1208 re-base: the voice waveforms queue right after the re-check */
    const after = iRe > iDone && iRe > iDoneP && iDone > 0 && iDoneP > 0 && (lm.match(/recheckBurstFileRows\(/g) || []).length === 1;
    const rec = /string fLocal\s*=\s*SharedItems\.localArgOf\(message,\s*out string fCase\);[\s\S]{0,400}?batch\?\.fileRows\.Add\(new KeyValuePair<FriendMessage, string>\(message,\s*fLocal\)\);[\s\S]{0,900}?push\(batch,\s*"addFile",[^;]*fTransfer,\s*fLocal,\s*fVoice\);/.test(SCP);   /* ★ #1208 re-base: + arg 17 fVoice (and its comment) */
    const re = bodyOf(SCP, 'private void recheckBurstFileRows(UiBatch batch, int channel)');
    const rule = /foreach\s*\(KeyValuePair<FriendMessage, string> row in batch\.fileRows\)\s*\{\s*try\s*\{\s*if\s*\(\s*row\.Value\s*==\s*"1"\s*&&\s*SharedItems\.localArgOf\(row\.Key,\s*out _\)\s*!=\s*"1"\s*\)\s*\{\s*refreshFileRow\(row\.Key,\s*channel\);\s*\}/.test(re);
    const field = /public readonly List<KeyValuePair<FriendMessage, string>> fileRows = new\(\);/.test(bodyOf(SCP, 'private sealed class UiBatch'));
    ok(after && rec && rule && field,
      '#1202 C#: every file row a load batches is recorded with the fLocal it carried; AFTER the batch\'s pushes (clearMessages · addMessages · messagesDone, or the prepend) the load re-checks each "1" row and re-pushes one whose file is gone through refreshFileRow — the fresh "0" lands after the stale batch — '
      + JSON.stringify({ iDone, iDoneP, iRe, after, rec, rule, field }));
  });
}
