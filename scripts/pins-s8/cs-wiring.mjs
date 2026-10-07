/* ==== SESSION 8 — agent CS: the C# CALL SITES of #1229 (probe) · #1231 (groups) · #1232 (reactions) · #1233 (mini-app
 * accept / decline) · #1234 (privacy) · #1236 (reply excerpt) ====
 * The pure rules (PushFetchProbe, GroupAvatarRule, ReactionSet, AppInviteRules, SAppDeclines, PrivacyRules, SPrivacyPrefs,
 * PresenceDisplay's hiding, SpixiProtocols.ids(bool), UnreadRule {7}, SystemLineRules) are EXECUTED in scripts/csh (S8RulesTests.cs). The
 * call sites are MAUI-bound and compile nowhere in this container, so they are pinned on comment-stripped source
 * (stripCode keeps string literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks (#802) — run by the session-8 agent CS; each failed exactly the named pin (see the report):
 *   receiveData: `endpoint == null ? PushFetchProbe.note(bytes)` → `PushFetchProbe.note(bytes)`        → P1 note site
 *   Node loop: drop `|| PushFetchProbe.touched`                                                       → P1 callers
 *   Android SPushService: drop `PushFetchProbe.begin();`                                              → P1 callers
 *   avatar case: the GroupAvatarRule test moved AFTER FriendList.setAvatar                           → G1 owner-only avatar
 *   writeAddedToGroupLine: fire_local_notification `false, false)` → `true, false)`                  → G2 added line
 *   ContactDetails.onGroupPhoto: drop the `!amGroupOwner()` return                                    → G3 group photo
 *   onContextAction react: drop `|| !ReactionSet.isHexId(msg_id_hex)`                                 → R1 react verb
 *   like case: sendReaction(…, `wire`, …) → `"like:"`                                                 → R1 react verb
 *   updateReactions: drop the showsReactionKey `continue`                                             → R2 push format
 *   sendJoinAccept: drop `&& AppInviteRules.claimAccept(peer, sessionHex)`                            → A1 join accept
 *   onAppDecline: the reject's push flag `true, true, false, false` → `true, true, true, false`       → A2 decline
 *   insertMessage: drop the SAppDeclines.has block                                                    → A3 declined state
 *   updateMessageReadStatus: `PrivacyRules.sendsReadReceipt(…)` → `!friend.bot`                      → PR1 receipts
 *   SettingsPage hideOnline: drop `SpixiProtocols.resetAsks();`                                       → PR3 settings verbs
 *   HomePage: drop `excerptKind = "reply";`                                                          → X1 reply excerpt
 * #46 round 1 (fixer CS) — new / re-shaped pins, each broken on purpose (see the r1 report):
 *   writeAddedToGroupLine: `addedLineText(friend.nickname)` → `addedLineText(group.nickname ?? friend.nickname)` → G2 (J1)
 *   markDeclinedByPeer: `m.localSender` → `!m.localSender` in the isMyInviteForSession call            → A3 (J2)
 *   chat case: drop the SystemLineRules.isReservedId(message.id) return                               → G4 reserved ids
 *   chatStream: `csm.Sequence == 0 &&` → `csm.Sequence == 1 &&`                                       → G4 reserved ids
 *   PushFetchProbe.note: add `P1Perf.line("k=" + bytesKey);`                                          → P1 probe log rule (C14)
 *   PushFetchProbe.noteCode: drop the `!P1Perf.enabled ||` guard                                      → P1 probe log rule
 *   Node: drop `&& !UnreadRule.isAddedToGroupLineId(friend_message.id);` from soundable              → G5 Node guards
 *   SettingsPage typingIndicators: drop the onPrivacyChanged loop                                      → PR4 privacy reaches chats
 *   SingleChatPage.onPrivacyChanged: drop `|| typingTurnedOff`                                        → PR4 privacy reaches chats
 *   ContactDetails.onGroupPhoto: drop the CompareExchange busy return                                 → G3 group photo
 * #46 round 2 (fixer F2):
 *   writeAddedToGroupLine: `null, sentTimestamp, false, false)` → `null, 0, false, false)`            → G2 added line (M3)
 *   chatStream: `if (SystemLineRules.isReservedId(` → `if (csm.Sequence == 0 && SystemLineRules.isReservedId(` → G4 reserved ids (M1)
 *   SingleChatPage.OnAppearing: drop `pushReadReceipts();`                                             → PR5 re-appear (N4)
 * #46 round 4 (fixer F4):
 *   HomePage remove: drop `SAppDeclines.clear(friend.walletAddress.ToString());`                       → A4 per-contact declines (MINOR-3) */
import { readdirSync, statSync } from 'node:fs';

export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  /* the body of the FIRST member whose header matches `head`, by brace depth (string / char literals skipped) */
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") { for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; } continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  const before = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b); return i >= 0 && j >= 0 && i < j; };

  const SP = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  const NODE = stripCode(rd('Spixi/Meta/Node.cs'));
  const AND = stripCode(rd('Spixi/Platforms/Android/SPushService.cs'));
  const IOS = stripCode(rd('Spixi/Platforms/iOS/SPushService.cs'));
  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const CD = stripCode(rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
  const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
  const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));

  /* ———— P1: the probe notes ONLY the null-endpoint (mailbox) path, at the TOP (before the ignore filter and Core) ———— */
  await guard('S8 P1 note site', async () => {
    const rcv = bodyOf(SP, 'public override ReceiveDataResponse? receiveData(');
    ok(/int p1Cls = endpoint == null \? PushFetchProbe\.note\(bytes\) : PushFetchProbe\.ClsOff;/.test(rcv)
      && before(rcv, 'PushFetchProbe.note(bytes)', 'isIgnoredRequest(bytes)') && before(rcv, 'isIgnoredRequest(bytes)', 'base.receiveData(bytes, endpoint)')
      && /if \(p1Cls != PushFetchProbe\.ClsOff && rdr\.spixiMessage != null\)\s*\{\s*PushFetchProbe\.noteCode\(p1Cls, \(int\)rdr\.spixiMessage\.type\);/.test(rcv),
      'S8 P1 note site: receiveData notes the mailbox bytes first (endpoint == null only) and the type code after Core (#1229)');
  });

  /* ———— P1: the three callers — begin() before the fetch; the loop skips only the cooldown no-op; the push lane always prints ———— */
  await guard('S8 P1 callers', async () => {
    const loop = NODE.slice(NODE.indexOf('PushFetchProbe.begin();') - 200, NODE.indexOf('PushFetchProbe.line("loop"') + 80);
    const loopOk = before(loop, 'PushFetchProbe.begin();', 'OfflinePushMessages.fetchPushMessages(false, fireLocalNotification, false)')
      && /if \(p1Ran \|\| p1Got > 0 \|\| PushFetchProbe\.touched\)\s*\{\s*PushFetchProbe\.line\("loop", p1Ran, p1Got\);/.test(loop);
    const lane = (s) => before(s, 'SPIXI.PushFetchProbe.begin();', 'OfflinePushMessages.fetchPushMessages(true, true)')
      && (!/fetchTaken/.test(s) || /ref fetchTaken\);\s*if \(fetchTaken\)\s*\{\s*SPIXI\.PushFetchProbe\.begin\(\);\s*\}/.test(s))   /* Android: only while the lock is ours (smoke PIN-N4 keeps `else { ulong p1Before` adjacent) */
      && /if \(SPIXI\.P1Perf\.enabled\)\s*\{\s*SPIXI\.PushFetchProbe\.line\("push", fetched, OfflinePushMessages\.receivedOfflineMessages - p1Before\);\s*\}/.test(s);
    ok(loopOk && lane(AND) && lane(IOS) && !/push fetch got=/.test(NODE + AND + IOS),
      'S8 P1 callers: Node loop / Android / iOS — begin() before the fetch, one PushFetchProbe.line each (loop: ran || got || touched; push: always) (#1229)');
  });

  /* ———— G1: a group's picture from its owner only — the rule runs BEFORE Core stores it, and drops ———— */
  await guard('S8 G1 owner-only avatar', async () => {
    const at = SP.indexOf('case SpixiMessageCode.avatar:');
    const cas = SP.slice(at, SP.indexOf('case SpixiMessageCode.requestFunds:', at));
    ok(/if \(friend != null && !GroupAvatarRule\.accept\(friend\.type == FriendType\.Group, group_sender_address\?\.addressNoChecksum, groupOwnerBytes\(friend\)\)\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*break;\s*\}/.test(cas)
      && before(cas, 'GroupAvatarRule.accept(', 'FriendList.setAvatar(')
      && /return friend\.users\?\.getOwner\(\)\?\.addressNoChecksum;/.test(bodyOf(SP, 'private static byte[]? groupOwnerBytes(')),
      'S8 G1 owner-only avatar: StreamProcessor drops a non-owner group picture before FriendList.setAvatar (#1231)');
  });

  /* ———— G2: the added-to-group line — empty group only, id {7}, my nickname for the sender (or the no-name text), no notification ———— */
  await guard('S8 G2 added line', async () => {
    const w = bodyOf(SP, 'private static void writeAddedToGroupLine(');
    const cg = SP.slice(SP.indexOf('case SpixiMessageCode.createGroup:'), SP.indexOf('case SpixiMessageCode.leave:'));
    /* ★ S8 #46 r2 (M3): the line carries the createGroup send time (0 = receive time → sorted below the drained messages) */
    ok(/writeAddedToGroupLine\(friend, spixi_message\.data, message\.timestamp\);/.test(cg)
      && /private static void writeAddedToGroupLine\(Friend\? friend, byte\[\]\? data, long sentTimestamp\)/.test(SP)
      && /GroupChat\.DeriveGroupAddress\(new Address\(friend\.publicKey\), cgm\.randomId\)/.test(w)
      && /if \(!GroupAvatarRule\.writesAddedLine\(true, stored\?\.Count \?\? -1, group\.metaData\.lastMessage != null\)\)\s*\{\s*return;/.test(w)
      /* #46 r1 (C-MAJOR-3 J1): the key + arg come from the PURE GroupAvatarRule.addedLineText (csh), fed with THIS device's
         nickname for the sender contact — exactly `friend.nickname`, nothing else (no group text, no fallback chain) */
      && /GroupAvatarRule\.AddedLine line = GroupAvatarRule\.addedLineText\(friend\.nickname\);\s*string text = string\.Format\(SpixiLocalization\._SL\(line\.key\) \?\? line\.fallback, line\.arg\);/.test(w)
      && (w.match(/nickname/g) || []).length === 1
      && /Node\.addMessageWithType\(new byte\[\] \{ UnreadRule\.AddedToGroupLineId \}, FriendMessageType\.standard, group\.walletAddress, 0, text, false, null, sentTimestamp, false, false\);/.test(w)
      && /public const byte AddedToGroupLineId = 7;/.test(stripCode(rd('Spixi/Utils/UnreadRule.cs')))
      && /^chat-group-added-you = \{0\} added you to this group$/m.test(rd('Spixi/Resources/Raw/lang/en-us.txt'))
      && /^chat-group-added-you-noname = You were added to this group$/m.test(rd('Spixi/Resources/Raw/lang/en-us.txt')),
      'S8 G2 added line: createGroup writes "{0} added you to this group" / "You were added to this group" (id {7}, no notification) only into an empty group, the name = friend.nickname through addedLineText, stamped with the createGroup send time (not 0) (#1231, #46 r1, r2 M3)');
  });

  /* ———— G3: ixian:groupPhoto — owner only, the own-avatar picker + resize, no file path, sent to every member contact ———— */
  await guard('S8 G3 group photo', async () => {
    const verb = /else if \(current_url\.Equals\("ixian:groupPhoto", StringComparison\.Ordinal\)\)\s*\{\s*onGroupPhoto\(\);\s*\}/.test(CD);
    const on = bodyOf(CD, 'private void onGroupPhoto()');
    const ch = bodyOf(CD, 'changeGroupPhotoAsync()');
    ok(verb && /if \(!amGroupOwner\(\)\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return;\s*\}/.test(on)
      && /await SFilePicker\.PickImageAsync\(\)/.test(ch) && /SFilePicker\.ResizeImage\(ms\.ToArray\(\), 960, 960, 80\)/.test(ch)
      && /if \(full\.Length >= 500000\)/.test(ch) && /FriendList\.setAvatar\(groupAddress, full, small, null\);/.test(ch)
      && /StreamProcessor\.sendAvatar\(pf, groupAddress\);/.test(ch)
      && !/Path\.|File\.|FileStream|current_url/.test(ch)
      /* #46 r1 (A-NIT-5): one picker at a time (the busy flag, released in finally) and the picked stream disposed */
      && /if \(System\.Threading\.Interlocked\.CompareExchange\(ref groupPhotoBusy, 1, 0\) != 0\)\s*\{\s*return;\s*\}\s*_ = changeGroupPhotoAsync\(\);/.test(on)
      && /finally\s*\{\s*System\.Threading\.Interlocked\.Exchange\(ref groupPhotoBusy, 0\);\s*\}\s*\}$/.test(ch)
      && /using \(System\.IO\.Stream src = picked\.stream\)\s*using \(System\.IO\.MemoryStream ms = new System\.IO\.MemoryStream\(\)\)\s*\{\s*src\.CopyTo\(ms\);/.test(ch),
      'S8 G3 group photo: owner check, the native picker + resize, Core stores it, sendAvatar to each member — no WebView data, no file path (#1231)');
  });

  /* ———— R1: react:<id>:<index> — validated, then ONE writer (the like case) for both verbs with the ReactionSet wire ———— */
  await guard('S8 R1 react verb', async () => {
    const oc = bodyOf(SCP, 'private void onContextAction(');
    const like = oc.slice(oc.indexOf('case "like":'));
    ok(/int quickIndex = ReactionSet\.HeartIndex;\s*switch\s*\(action\)/.test(oc)
      && /case "react":\s*\{\s*int index = ReactionSet\.parseIndex\(data\);\s*if \(index < 0 \|\| !ReactionSet\.isHexId\(msg_id_hex\)\)\s*\{[^}]*break;\s*\}\s*quickIndex = index;\s*\}\s*goto case "like";/.test(oc)
      && /case "like":\s*string wire = ReactionSet\.wireFor\(quickIndex\);/.test(oc)
      && /friend\.addReaction\(address, new ReactionMessage\(msg_id, wire\), selectedChannel\)/.test(like)
      && /sendSilentReaction\(friend, msg_id, wire, selectedChannel\);/.test(like)   /* ★ S9 A3 r1 re-base (silent reactions): Core's push-TRUE sendReaction → the Spixi silent sender, same wire */
      && !/"like:"/.test(oc),
      'S8 R1 react verb: like = index 1; react validates hex id + index 0–5 and joins the like writer; the stored and sent text is ReactionSet.wireFor (#1232)');
  });

  /* ———— R2: the addReactions push — like:<emoji>:<n>; my like:<emoji>; no seen while receipts are off ———— */
  await guard('S8 R2 push format', async () => {
    const ur = bodyOf(SCP, 'private void updateReactions(FriendMessage fm, UiBatch? batch)');
    ok(/if \(!PrivacyRules\.showsReactionKey\(receiptsOn, reaction\.Key\)\)\s*\{\s*continue;\s*\}/.test(ur)
      && /if \(reaction\.Key == "like"\)\s*\{\s*reactions_str \+= ReactionSet\.likeTokens\(reaction\.Value\.Select\(rd => rd\?\.data\)\);/.test(ur)
      && /own_reactions_str \+= reaction\.Key == "like" \? ReactionSet\.ownLikeToken\(own_rd\.data\) : reaction\.Key \+ ";";/.test(ur)
      && /"addReactions", Crypto\.hashToString\(fm\.id\), reactions_str, own_reactions_str, tip_total_str\)/.test(ur),
      'S8 R2 push format: the like entries go through ReactionSet (untrusted emoji filtered), my own carries its emoji (#1232 / #1234)');
  });

  /* ———— A1: Join accepts an INCOMING invite once per (peer, session) per run, with the shared session-id helper ———— */
  await guard('S8 A1 join accept', async () => {
    const j = bodyOf(SCP, 'public void onJoinApp(string app_id)');
    const s = bodyOf(SCP, 'private void sendJoinAccept(');
    ok(/^\{\s*FriendMessage\? joinRow = findJoinRow\(app_id\);[\s\S]{0,400}?if \(!reopen\)\s*\{\s*sendJoinAccept\(app_id\);/.test(j)   /* ★ S9 A3 #46 r1 re-base (MINOR-2): Join still accepts first — except "Open again" on an already-joined row (S9FixRules.joinIsReopen) */
      && /byte\[\] sessionId = MiniAppPage\.sessionIdFor\(app_id\);/.test(s)
      && /if \(AppInviteRules\.joinSendsAccept\(app_id, newest != null, newest != null && !newest\.localSender, AppInviteRules\.wasAccepted\(peer, sessionHex\)\)\s*&& AppInviteRules\.claimAccept\(peer, sessionHex\)\)\s*\{\s*StreamProcessor\.sendAppRequestAccept\(friend, sessionId\);/.test(s)
      && /sessionId = sessionIdFor\(app_id\);/.test(stripCode(rd('Spixi/Pages/MiniApps/MiniAppPage.xaml.cs'))),
      'S8 A1 join accept: Join sends appRequestAccept for an incoming invite, once per peer + session (#1233)');
  });

  /* ———— A2: Decline — the hex id, an incoming invite row, a SILENT reject (push off) for a 1:1 only, the stored state ———— */
  await guard('S8 A2 decline', async () => {
    const d = bodyOf(SCP, 'private void onAppDecline(');
    ok(/else if \(current_url\.StartsWith\("ixian:appDecline:", StringComparison\.Ordinal\)\)\s*\{\s*onAppDecline\(current_url\.Substring\("ixian:appDecline:"\.Length\)\);/.test(SCP)
      && /!ReactionSet\.isHexId\(msgIdHex\)/.test(d) && before(d, 'ReactionSet.isHexId(msgIdHex)', 'Crypto.stringToHash(msgIdHex)')
      && /AppInviteRules\.canDecline\(row\.type == FriendMessageType\.appSession, row\.localSender, row\.message\)/.test(d)
      && /if \(friend\.type == FriendType\.Normal\)\s*\{[^}]*SpixiMessageCode\.appRequestReject[^}]*StreamProcessor\.sendSpixiMessage\(friend, reject, null, null, true, true, false, false\);\s*\}/.test(d)
      && before(d, 'SAppDeclines.add(', 'refreshAppRow(row, selectedChannel)'),
      'S8 A2 decline: ixian:appDecline validated, silent reject (pending + server, push OFF) for a 1:1, stored + re-pushed (#1233)');
  });

  /* ———— A3: the stored decline reaches the card on both sides; the inviter marks its own row on a reject ———— */
  await guard('S8 A3 declined state', async () => {
    const ins = SCP.slice(SCP.indexOf('if (message.type == FriendMessageType.appSession)'), SCP.indexOf('push(batch, "addAppRequest"'));
    const rej = bodyOf(SP, 'public static void handleAppRequestReject(');
    const mk = bodyOf(SP, 'private static void markDeclinedByPeer(');
    /* ★ S9 A3 re-base (8-APP #1247): the declined read now feeds the ONE state rule S9FixRules.appState (Declined first —
       csh S9FixTests.app_state_order), beside the new joined read. Was: `if (… SAppDeclines.has(…)) { app_state = "Declined"; }`. */
    ok(/string rowHex = message\.id != null \? Crypto\.hashToString\(message\.id\) : "";\s*string peerKey = friend\.walletAddress\.ToString\(\);\s*app_state = S9FixRules\.appState\(app_state == "Missing", app_state == "Minimized",\s*rowHex\.Length > 0 && SAppJoins\.has\(peerKey, rowHex\),\s*rowHex\.Length > 0 && SAppDeclines\.has\(peerKey, rowHex\)\);/.test(ins)
      && before(rej, 'VoIPManager.hasSession(session_id)', 'markDeclinedByPeer(sender_address, session_id)')
      && /friend\.type != FriendType\.Normal/.test(mk)
      /* #46 r1 (C-MAJOR-3 J2/J3): the row predicate is the PURE AppInviteRules.isMyInviteForSession (csh), given the row's
         OWN flag and the session derived from the row's app id by the one helper */
      && /row = rows\.FindLast\(m => m\.id != null && AppInviteRules\.isMyInviteForSession\(m\.type, m\.localSender,\s*m\.type == FriendMessageType\.appSession && AppInviteRules\.appIdOf\(m\.message\)\.Length > 0 \? MiniAppPage\.sessionIdFor\(AppInviteRules\.appIdOf\(m\.message\)\) : null,\s*session_id\)\);/.test(mk)
      && !/SequenceEqual|localSender\s*&&|!m\.localSender/.test(mk)
      && /SAppDeclines\.add\(/.test(mk) && /refreshAppRow\(declined, 0\)/.test(mk),
      'S8 A3 declined state: addAppRequest pushes app_state "Declined" from SAppDeclines; a peer reject marks my own newest invite row (#1233)');
  });

  /* ———— PR1/PR2: receipts + typing, both directions ———— */
  await guard('S8 PR1 receipts + typing', async () => {
    const urs = bodyOf(SCP, 'private void updateMessageReadStatus(') || bodyOf(SCP, 'void updateMessageReadStatus(');
    const dt = bodyOf(SCP, 'private void deliveryTicks(');
    const ty = SP.slice(SP.indexOf('case SpixiMessageCode.msgTyping:'), SP.indexOf('case SpixiMessageCode.avatar:'));
    ok(/if \(PrivacyRules\.sendsReadReceipt\(SPrivacyPrefs\.readReceipts, friend\.bot, UnreadRule\.isAddedToGroupLineId\(message\.id\)\)\)\s*\{[^}]*SpixiMessageCode\.msgRead/.test(urs)
      && /PrivacyRules\.shownStatus\(SPrivacyPrefs\.readReceipts, ref sent, ref confirmed, ref read\);/.test(dt)
      && /type = PrivacyRules\.shownStatus\(SPrivacyPrefs\.readReceipts, "read"\);/.test(HOME)
      && /if \(PrivacyRules\.sendsTyping\(SPrivacyPrefs\.typingIndicators\)\)\s*\{\s*StreamProcessor\.sendTyping\(friend\);/.test(SCP)
      && /if \(PrivacyRules\.showsTyping\(SPrivacyPrefs\.typingIndicators\)\)\s*\{\s*handleFriendIsTyping\(friend, group_sender_address\);/.test(ty),
      'S8 PR1 receipts + typing: no msgRead / typing sent while off, and none shown (bubbles, chats row; the card pushes keep raw flags their shells discard — smoke L2) (#1234)');
  });

  /* ———— PR3: the Settings verbs — store, echo the stored value, caps; hideOnline resets the ask cache; the answer carries the id ———— */
  await guard('S8 PR3 settings verbs', async () => {
    const v = (verb, prop, push) => new RegExp('else if \\(current_url\\.StartsWith\\("ixian:' + verb + ':", StringComparison\\.Ordinal\\)\\)\\s*\\{\\s*SPrivacyPrefs\\.' + prop
      + ' = current_url\\.Substring\\("ixian:' + verb + ':"\\.Length\\)\\.Equals\\("on", StringComparison\\.Ordinal\\);\\s*Utils\\.sendUiCommand\\(this, "' + push + '", SPrivacyPrefs\\.' + prop + '\\.ToString\\(\\)\\);').test(SET);
    const ho = SET.slice(SET.indexOf('"ixian:hideOnline:"'), SET.indexOf('"ixian:lock:"'));
    ok(v('readReceipts', 'readReceipts', 'setReadReceipts') && v('typingIndicators', 'typingIndicators', 'setTypingIndicators') && v('hideOnline', 'hideOnline', 'setHideOnline')
      && /caps \+= ",readReceipts,typing,hideOnline";/.test(SET) && /SpixiProtocols\.resetAsks\(\);/.test(ho)
      && /CoreStreamProcessor\.sendAppProtocols\(friend!, SpixiProtocols\.ids\(\)\);/.test(SP)
      && /public static List<byte\[\]> ids\(\)\s*\{\s*return ids\(SPIXI\.Meta\.SPrivacyPrefs\.hideOnline\);\s*\}/.test(stripCode(rd('Spixi/Utils/SpixiProtocols.cs'))),
      'S8 PR3 settings verbs: three verbs echo the stored value, three caps, hideOnline resets the ask cache, the answer adds presence-hidden (#1234)');
  });

  /* ———— X1: a stripped reply on a text row → excerptKind "reply" ———— */
  await guard('S8 X1 reply excerpt', async () => {
    ok(/bool s8Reply = lastmsg\.type == FriendMessageType\.standard && ReplyQuote\.looksLikeReply\(lastmsg\.message\);/.test(HOME)
      && /if \(s8Reply && excerptKind == "text" && lastmsg\.type == FriendMessageType\.standard\)\s*\{\s*excerptKind = "reply";\s*\}/.test(HOME),
      'S8 X1 reply excerpt: the chats row of a reply carries excerptKind "reply" (#1236)');
  });

  /* ———— G4 (#46 r1 X2, r2 M1): a peer cannot write a one-byte-id row — chat and EVERY chatStream under one are dropped before Core ———— */
  await guard('S8 G4 reserved ids', async () => {
    const chat = SP.slice(SP.indexOf('case SpixiMessageCode.chat:'), SP.indexOf('case SpixiMessageCode.chatStream:'));
    const cs = bodyOf(SP, 'case SpixiMessageCode.chatStream:');
    const chatDrop = /^case SpixiMessageCode\.chat:\s*if \(SystemLineRules\.isReservedId\(message\.id\)\)\s*\{\s*Logging\.warn\("[^"+]*"\);\s*return null;\s*\}\s*Node\.addMessageWithType\(message\.id, FriendMessageType\.standard,/.test(chat);
    /* ★ S8 #46 r2 (M1): the BROAD form — no sequence / room condition beside the id test (a bot-room replace with sequence ≥ 1 is a new row in Core) */
    const csDrop = /var csm = new ChatStreamMessage\(spixi_message\.data\);\s*if \(SystemLineRules\.isReservedId\(csm\.MessageId\)\)\s*\{\s*Logging\.warn\("[^"+]*"\);\s*return null;\s*\}/.test(cs)
      && before(cs, 'SystemLineRules.isReservedId(csm.MessageId)', 'Node.addMessageWithType(');
    ok(chatDrop && csDrop && /return id != null && id\.Length == 1;/.test(stripCode(rd('Spixi/Utils/SystemLineRules.cs'))),
      'S8 G4 reserved ids (#46 r1 X2, r2 M1): an incoming chat with a one-byte id, and a chatStream under one at ANY sequence, are dropped before Node.addMessageWithType — no receipt, no id in the log — ' + JSON.stringify({ chatDrop, csDrop }));
  });

  /* ———— G5 (#46 r1 C-NIT-3): Node's notification + in-app sound guards skip the added-to-group line, the unread rule skips every system line ———— */
  await guard('S8 G5 Node guards', async () => {
    const notif = /if \(!friend_message\.id\.SequenceEqual\(new byte\[\] \{ 4 \}\) && !friend_message\.id\.SequenceEqual\(new byte\[\] \{ 5 \}\)\s*&& !UnreadRule\.isAddedToGroupLineId\(friend_message\.id\)\)/.test(NODE);
    const sound = /&& !friend_message\.id\.SequenceEqual\(new byte\[\] \{ 4 \}\)\s*&& !friend_message\.id\.SequenceEqual\(new byte\[\] \{ 5 \}\)\s*&& !UnreadRule\.isAddedToGroupLineId\(friend_message\.id\);/.test(NODE);
    const unread = /UnreadRule\.countsAsUnread\(type, local_sender, friend_message_with_status\.updated, UnreadRule\.isSystemLineId\(friend_message\.id\)\)/.test(NODE);
    ok(notif && sound && unread, 'S8 G5 Node guards (#46 r1 C-NIT-3): no notification, no in-app sound and no unread for the added-to-group line {7} — ' + JSON.stringify({ notif, sound, unread }));
  });

  /* ———— P1 log rule (#46 r1 C-MINOR-1): every PushFetchProbe entry point is a no-op unless P1Perf.enabled; the ONE log call is in line(), built from counters + codes ———— */
  await guard('S8 P1 probe log rule', async () => {
    const PF = stripCode(rd('Spixi/Utils/PushFetchProbe.cs'));
    const heads = { begin: 'internal static void begin()', note: 'internal static int note(', noteCode: 'internal static void noteCode(', touched: 'internal static bool touched', line: 'internal static void line(' };
    const guarded = {};
    for (const [k, h] of Object.entries(heads)) {
      let b = bodyOf(PF, h);
      if (k === 'touched') b = bodyOf(b, 'get');
      guarded[k] = /^\{\s*if \(!P1Perf\.enabled(\)| \|\| )[^{]*\{\s*return( [A-Za-z]+)?;\s*\}/.test(b);
    }
    const lineBody = bodyOf(PF, 'internal static void line(');
    const logCalls = (PF.match(/Logging\.|P1Perf\.line\(|Console\.|Debug\.|Trace\./g) || []).length;
    const lineOnly = /^\{\s*if \(!P1Perf\.enabled\)\s*\{\s*return;\s*\}\s*string body;\s*lock \(gate\)\s*\{\s*body = format\(where, ran, got, nNew, nRep, nReid, nFix, codes\);\s*\}\s*P1Perf\.line\(body\);\s*\}$/.test(lineBody);
    const fmtSig = /internal static string format\(string where, bool ran, ulong got, int newCount, int repCount, int reidCount, int fixCount, IList<int> codeList\)/.test(PF);
    const usingCore = /^\s*using IXICore;\s*$/m.test(PF);
    ok(Object.values(guarded).every(Boolean) && logCalls === 1 && lineOnly && fmtSig && usingCore,
      'S8 P1 probe log rule (#46 r1 C-MINOR-1 / A-MAJOR-1): begin / note / noteCode / touched / line return at once unless P1Perf.enabled; the ONLY log call is P1Perf.line(body) in line(), body = format(counters, codes) — no key, id or hash can reach a log; `using IXICore;` (StreamMessage) — ' + JSON.stringify({ guarded, logCalls, lineOnly, fmtSig, usingCore }));
  });

  /* ———— PR4 (#46 r1 X5 / A-MINOR-5): the privacy switches reach every open chat ———— */
  await guard('S8 PR4 privacy reaches chats', async () => {
    const verb = (v) => { const a = SET.indexOf('"ixian:' + v + ':"'); const b = SET.indexOf('else if', a + 10); return SET.slice(a, b); };
    const loop = /foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onPrivacyChanged\(\);/;
    const verbs = { readReceipts: loop.test(verb('readReceipts')), typingIndicators: loop.test(verb('typingIndicators')), hideOnline: loop.test(verb('hideOnline')) };
    const ol = bodyOf(SCP, 'private void onLoad()');
    const onLoadOk = /readReceiptsPushed = null;\s*pushReadReceipts\(\);\s*typingShownKnown = SPrivacyPrefs\.typingIndicators;/.test(ol) && before(ol, 'pushReadReceipts();', 'loadMessages();');
    const push = bodyOf(SCP, 'private void pushReadReceipts()');
    const pushOk = /Utils\.sendUiCommand\(this, "setReadReceipts", on \? "True" : "False"\);/.test(push) && /bool on = SPrivacyPrefs\.readReceipts;/.test(push);
    const pc = bodyOf(SCP, 'public void onPrivacyChanged()');
    const pcOk = /bool receiptsChanged = readReceiptsPushed != SPrivacyPrefs\.readReceipts;/.test(pc)
      && /bool typingTurnedOff = typingShownKnown && !typingNow;/.test(pc)
      && /if \(receiptsChanged \|\| typingTurnedOff\)\s*\{\s*loadMessages\(\);\s*\}/.test(pc)
      && before(pc, 'bool receiptsChanged', 'pushReadReceipts();') && before(pc, 'pushReadReceipts();', 'loadMessages();');
    ok(Object.values(verbs).every(Boolean) && onLoadOk && pushOk && pcOk,
      'S8 PR4 privacy reaches chats (#46 r1 X5): setReadReceipts("True"|"False") before the first history push; each of the 3 switches calls onPrivacyChanged on every live chat, which re-tells the switch and re-flushes the rows (ticks, seen counts, typing pill) when receipts changed or typing went off — ' + JSON.stringify({ verbs, onLoadOk, pushOk, pcOk }));
  });

  /* ———— PR5 (★ S8 #46 r2 N4): a chat page kept alive under Account re-tells a CHANGED receipts switch when it re-appears
     (onPrivacyChanged may have run while it was not the live page) — before reloadScreen re-flushes the ticks ———— */
  await guard('S8 PR5 re-appear', async () => {
    const oa = bodyOf(SCP, 'protected override void OnAppearing()');
    const reOk = /if \(friend != null && readReceiptsPushed != null\)\s*\{\s*pushReadReceipts\(\);\s*\}/.test(oa)
      && before(oa, 'pushReadReceipts();', 'reloadScreen();') && before(oa, 'pushReadReceipts();', 'presentedFromPreload = false;');
    ok(reOk, 'S8 PR5 re-appear (#46 r2 N4): OnAppearing calls pushReadReceipts() (told once loaded) before the preload return and reloadScreen');
  });

  /* ———— A4 (★ S8 #46 r4 MINOR-3): the declined invite rows leave PER CONTACT wherever the reaction heart does — every
     statement `SReactionFlags.clear(<x>);` (remove contact / leave group / delete history / re-add over pendingDeletion;
     NOT the `if (… SReactionFlags.clear(…))` of a chat being read) is followed at once by `SAppDeclines.clear(<x>);` ———— */
  await guard('S8 A4 per-contact declines', async () => {
    const files = [];
    const walk = (dir) => { for (const n of readdirSync(join(root, dir))) { const p = dir + '/' + n; const st = statSync(join(root, p)); if (st.isDirectory()) { if (n !== 'bin' && n !== 'obj') walk(p); } else if (n.endsWith('.cs')) files.push(p); } };
    walk('Spixi');
    const sites = [];
    const miss = [];
    let declineCalls = 0;
    for (const f of files) {
      const sc = stripCode(rd(f));
      declineCalls += (sc.match(/SAppDeclines\.clear\(/g) || []).length;
      const re = /^[ \t]*SReactionFlags\.clear\(([^;]*)\);[ \t]*\n[ \t]*(\S[^\n]*)/gm;
      let m;
      while ((m = re.exec(sc))) {
        sites.push(f.split('/').pop());
        if (m[2].trim() !== 'SAppDeclines.clear(' + m[1] + ');') miss.push(f + ': ' + m[1]);
      }
    }
    ok(sites.length >= 8 && miss.length === 0 && declineCalls === sites.length,
      'S8 A4 per-contact declines (#46 r4 MINOR-3): each per-contact SReactionFlags.clear statement is followed by SAppDeclines.clear of the same address — ' + JSON.stringify({ sites: sites.length, declineCalls, miss }));
  });
}
