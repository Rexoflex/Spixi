/* ==== SESSION 5 — P0 #1155 pins: no message lost when a chat opens during Core's delayed write ====
 * The guard itself (Spixi/Utils/ArrivalGuard.cs) is EXECUTED in scripts/csh (ArrivalGuardTests.cs: Damir's case, the
 * dropped-request case, the read race, deletes, the 200-seed stress test, each with a BREAK twin that must lose the
 * message). Its call sites are MAUI-only and compile nowhere here → source pins, comments stripped. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const cs = (p) => stripCode(rd(p));
  const walk = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) return (e.name === 'bin' || e.name === 'obj') ? [] : walk(p);
    return e.name.endsWith('.cs') ? [p] : [];
  });
  const all = walk('Spixi');

  /* (1) every message Spixi adds is noted FIRST in Node.addMessageWithType */
  {
    const node = cs('Spixi/Meta/Node.cs');
    const body = (/public static FriendMessage\? addMessageWithType\(FriendMessageType type,[\s\S]*?if \(friend_message != null\)\s*\{([\s\S]{0,400})/.exec(node) || [])[1] || '';
    const r = {
      first: /^\s*CoreMessageWriter\.arrivals\.note\(wallet_address\.ToString\(\), channel, friend_message, CoreMessageWriter\.nowMs\(\), friend_message_with_status\.updated\);/.test(body),
      coreAddOnlyHere: all.filter((p) => /FriendList\.addMessageWithType\(/.test(cs(p))).join(',') === 'Spixi/Meta/Node.cs,Spixi/Utils/SDevSeed.cs',
    };
    ok(Object.values(r).every(Boolean), '★★ P0 #1155 (1): Node.addMessageWithType notes EVERY added message (with Core\'s `updated` flag) as its FIRST step, before any branch can return; the only other FriendList.addMessageWithType caller is the dev seed — ' + JSON.stringify(r));
  }

  /* (2) the ONE replacing read is guarded on both sides */
  {
    const sc = cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
    const lm = (/public void loadMessages\(\)\s*\{([\s\S]*?)\n        \}\n/.exec(sc) || [])[1] || '';
    const iBefore = lm.indexOf('CoreMessageWriter.arrivals.beforeReread(arrivalKey, readChannel, CoreMessageWriter.instance);');
    const iLoop = lm.indexOf('for (int pass = 0; pass < LOAD_WINDOW_MAX_PASSES; pass++)');
    const iRead = lm.indexOf('messages = friend.getMessages(readChannel, window);');
    const iTrim = lm.indexOf('CoreMessageWriter.arrivals.trimSameSecondHead(messages, !exhausted, visibleSurplus);');
    const iAfter = lm.indexOf('CoreMessageWriter.arrivals.afterReread(arrivalKey, readChannel, messages, CoreMessageWriter.nowMs(), CoreMessageWriter.instance)');
    const iNull = lm.indexOf('if (messages == null\n');
    const twoArg = all.filter((p) => /\.getMessages\([^()]*,[^()]*\)/.test(cs(p)));
    const r = {
      key: /string arrivalKey = friend\.walletAddress\.ToString\(\);\s*int readChannel = selectedChannel;/.test(lm),
      headRunFits: /headRun = CoreMessageWriter\.arrivals\.sameSecondHeadRun\(messages\);[\s\S]{0,900}?if \(exhausted \|\| \(visibleNow > want && \(headRun <= visibleNow - want \|\| window > 4 \* want\)\)\)\s*\{\s*break;\s*\}\s*window = visibleNow > want\s*\? window \+ headRun\s*: Math\.Max\(window \* 2, window \+ \(want \+ 1 - visibleNow\)\);/.test(lm),
      order: iBefore > 0 && iBefore < iLoop && iLoop < iRead && iRead < iTrim && iTrim < iAfter && iAfter < iNull,
      surplusVisible: /visibleNow = messages\.Count\(m => !rendersNothing\(m\)\);[\s\S]{0,400}?visibleSurplus = visibleNow - want;/.test(lm) && (lm.match(/lock \(messages\)/g) || []).length === 2,
      afterGuarded: /if \(messages != null\)\s*\{\s*CoreMessageWriter\.arrivals\.trimSameSecondHead\(messages, !exhausted, visibleSurplus\);\s*int reattached = CoreMessageWriter\.arrivals\.afterReread/.test(lm),
      logNoAddress: /Logging\.warn\("\[P0\] reattach n=" \+ reattached\);/.test(lm),
      oneReplacingRead: twoArg.join(',') === 'Spixi/Pages/Chat/SingleChatPage.xaml.cs' && (sc.match(/\.getMessages\([^()]*,[^()]*\)/g) || []).length === 1,
    };
    ok(Object.values(r).every(Boolean), '★★ P0 #1155 (2): loadMessages writes the channel BEFORE the replacing read loop (beforeReread), trims a same-second head to a second boundary (only the VISIBLE surplus over `want`, #46 r1 M-2), and puts back a lost arrival AFTER it (afterReread, before the empty-history branch; a count-only [P0] line); it is the ONLY two-argument getMessages in Spixi — a new replacing read must be guarded too — ' + JSON.stringify(r));
  }

  /* (3) every push fetch is followed by afterPushBatch; low memory writes dirty first and keeps recent chats */
  {
    const sites = all.flatMap((p) => {
      const t = cs(p); const out = [];
      let i = -1;
      while ((i = t.indexOf('OfflinePushMessages.fetchPushMessages(', i + 1)) >= 0) {
        const after = t.slice(i, i + 420);
        out.push(p + ':' + /arrivals\.afterPushBatch\((SPIXI\.)?CoreMessageWriter\.instance\);/.test(after));
      }
      return out;
    });
    const node = cs('Spixi/Meta/Node.cs');
    const low = (/public static void onLowMemory\(\)\s*\{([\s\S]*?)FriendList\.onLowMemory\(excludeAddresses\);/.exec(node) || [])[1] || '';
    const r = {
      pushSites: sites.length === 3 && sites.every((s) => s.endsWith(':true')),
      lowWritesFirst: /^\s*CoreMessageWriter\.arrivals\.afterPushBatch\(CoreMessageWriter\.instance\);\s*IxianHandler\.localStorage\?\.flush\(\);/.test(low),
      lowKeepsRecent: /var recent = CoreMessageWriter\.arrivals\.recentAddresses\(CoreMessageWriter\.nowMs\(\)\);[\s\S]*recent\.Contains\(f\.walletAddress\.ToString\(\)\)[\s\S]*excludeAddresses\.Add\(f\.walletAddress\);/.test(low),
    };
    ok(Object.values(r).every(Boolean), '★★ P0 #1155 (3): each of the 3 push fetches (Node loop, Android, iOS) is followed by afterPushBatch — even when the fetch returns false; Node.onLowMemory writes every dirty channel before its flush and never frees a chat with an arrival in the last RECENT_MS — ' + JSON.stringify({ ...r, sites }));
  }

  /* (4) a delete / a cleared history is never put back */
  {
    const del = all.flatMap((p) => {
      const t = cs(p); const out = []; let i = -1;
      while ((i = t.indexOf('friend.deleteMessage(', i + 1)) >= 0) {
        out.push(p + ':' + /CoreMessageWriter\.arrivals\.forgetMessage\(friend\.walletAddress\.ToString\(\), msg_id\);\s*CoreMessageWriter\.arrivals\.markDirty\(friend\.walletAddress\.ToString\(\), selectedChannel\);\s*(if \()?$/.test(t.slice(Math.max(0, i - 300), i)));
      }
      return out;
    });
    const hist = all.flatMap((p) => {
      const t = cs(p); const out = []; let i = -1;
      while ((i = t.indexOf('.deleteHistory()', i + 1)) >= 0) {
        out.push(p + ':' + /CoreMessageWriter\.arrivals\.forgetAddress\(friend\.walletAddress\.ToString\(\)\);/.test(t.slice(i, i + 600)));
      }
      return out;
    });
    const rm = all.filter((p) => p !== 'Spixi/Utils/SDevSeed.cs').flatMap((p) => {
      const t = cs(p); const out = []; let i = -1;
      while ((i = t.indexOf('FriendList.removeFriend(', i + 1)) >= 0) {
        /* after the call, or (the two decline sites, whose try/finally shape is pinned by #985) the declined address right before it */
        out.push(p + ':' + (/CoreMessageWriter\.arrivals\.forgetAddress\(\w+\.walletAddress\.ToString\(\)\);/.test(t.slice(i, i + 260))
          || /CoreMessageWriter\.arrivals\.forgetAddress\(declinedAddr\);\s*bool listed = /.test(t.slice(Math.max(0, i - 400), i))));
      }
      return out;
    });
    const set = cs('Spixi/Pages/Settings/SettingsPage.xaml.cs');
    const entire = (set.match(/FriendList\.deleteEntireHistory\(\)/g) || []).length;
    const clears = (set.match(/CoreMessageWriter\.arrivals\.clear\(\)/g) || []).length;
    const r = {
      deletes: del.length === 2 && del.every((s) => s.endsWith(':true')),
      histories: hist.length === 2 && hist.every((s) => s.endsWith(':true')),
      wipes: entire === 3 && clears === 3,
      removals: rm.length === 6 && rm.every((s) => s.endsWith(':true')),
      sentAndReactions: (cs('Spixi/Network/SpixiPendingMessageProcessor.cs').match(/setMessageSent\([^;]*\);\s*CoreMessageWriter\.arrivals\.markDirty\(/g) || []).length === 2
        && (cs('Spixi/Pages/Chat/SingleChatPage.xaml.cs').match(/friend\.addReaction\([\s\S]{0,160}?\)\)\s*\{\s*CoreMessageWriter\.arrivals\.markDirty\(/g) || []).length === 2,
      remoteDelete: /public static void deleteMessage\(Friend friend, int channel, byte\[\] msgId\)\s*\{\s*CoreMessageWriter\.arrivals\.markDirty\(friend\.walletAddress\.ToString\(\), channel\);/.test(cs('Spixi/Utils/UIHelpers.cs')),
    };
    ok(Object.values(r).every(Boolean), '★★ P0 #1155 (4): both local delete sites forget the message BEFORE Core deletes it, both history clears forget the address, all 3 whole-history wipes clear the guard, all 6 contact / room removals forget the address (#46 r1 B-m2: a quick re-add or re-join gets nothing put back) — nothing deleted can be put back — ' + JSON.stringify({ ...r, del, hist, entire, clears, rm }));
  }

  /* (5) the adapter uses Core's own API only, and the harness executes the guard with its BREAK twins */
  {
    const ad = cs('Spixi/Utils/CoreMessageWriter.cs');
    const proj = rd('scripts/csh/csh.csproj');
    const t = existsSync(join(root, 'scripts/csh/ArrivalGuardTests.cs')) ? rd('scripts/csh/ArrivalGuardTests.cs') : '';
    const r = {
      request: /IxianHandler\.localStorage\?\.requestWriteMessages\(new Address\(address\), channel\);/.test(ad),
      flush: /public void flush\(\)\s*\{\s*IxianHandler\.localStorage\?\.flush\(\);\s*\}/.test(ad),
      catchType: /Logging\.warn\("\[P0\] write request skipped: " \+ e\.GetType\(\)\.Name\);/.test(ad),
      idOrder: /new ArrivalGuard<FriendMessage>\(m => m\.id, m => m\.receivedTimestamp\)/.test(ad),
      compiled: proj.includes('<Compile Include="../../Spixi/Utils/ArrivalGuard.cs" />') && !proj.includes('CoreMessageWriter.cs'),
      breaks: /BREAK_without_the_guard_the_open_loses_the_unwritten_message/.test(t) && /STRESS_200_seeds_no_loss_with_the_guard_and_loss_without_it/.test(t),
    };
    ok(Object.values(r).every(Boolean), '★★ P0 #1155 (5): CoreMessageWriter reaches Core only through LocalStorage.requestWriteMessages + flush (a failed request logs the exception TYPE only), orders by receivedTimestamp (Core\'s write order); scripts/csh compiles the REAL ArrivalGuard.cs and runs its BREAK + stress tests — ' + JSON.stringify(r));
  }
}
