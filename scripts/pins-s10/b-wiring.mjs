/* ==== SESSION 10 — agent B: the C# CALL SITES of F3 (a deleted photo's excerpt), F6 (the wallet pre-push), F7 (part files
 * in Downloads/.partial + the setDownloadAvatars push), P2 (the receive cap) and P3 (the two-line created line) (#1254) ====
 * The pure rules (ChatHeal.isLive / deleteLeftLast, S10FixRules, S9FixRules.createdLine) are EXECUTED in scripts/csh
 * (S10FixTests.cs). The call sites are MAUI-bound and compile nowhere in this container, so they are pinned on
 * COMMENT-STRIPPED source (stripCode keeps string literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks — see the agent B report (S10); each failed EXACTLY the named pin. */
import { readdirSync } from 'node:fs';

export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
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
  const count = (s, re) => (s.match(re) || []).length;
  /* every Logging.* line of a body: fixed words + an exception TYPE name only (CLAUDE.md ★ logs) */
  const logsFixed = (b) => [...b.matchAll(/Logging\.(?:info|warn|error)\(([^;]*)\);/g)].every((m) => {
    const a = m[1].replace(/"(?:[^"\\]|\\.)*"/g, '');
    return a.replace(/\s|\+|\(|\)|e\.GetType\(\)\.Name|ex\.GetType\(\)\.Name/g, '') === '';
  });

  const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const CMW = stripCode(rd('Spixi/Utils/CoreMessageWriter.cs'));
  const UIH = stripCode(rd('Spixi/Utils/UIHelpers.cs'));
  const TM = stripCode(rd('Spixi/Data/TransferManager.cs'));
  const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
  const DI = stripCode(rd('Spixi/Utils/DownloadsIndex.cs'));
  const CSPROJ = rd('scripts/csh/csh.csproj');

  /* ———— F3: a deleted photo never stays the chats excerpt ———— */
  await guard('S10 B F3 delete sites', async () => {
    const cd = bodyOf(CMW, 'public static bool clearDeletedLast(Friend friend, byte[] msgId)');
    const del = bodyOf(UIH, 'public static void deleteMessage(Friend friend, int channel, byte[] msgId)');
    const r = {
      overload: /if \(last == null \|\| !ChatHeal\.deleteLeftLast\(last\.id, last\.type == FriendMessageType\.fileHeader, last\.message, msgId\)\)\s*\{\s*return false;\s*\}/.test(cd),
      isLive: /ChatHeal\.newestLive\(list, m => ChatHeal\.isLive\(m\.type, m\.message\), m => m\.id, msgId\)/.test(cd),
      /* the REMOTE delete (StreamProcessor → UIHelpers.deleteMessage): Core's recompute may keep the blanked file row */
      remote: /CoreMessageWriter\.clearDeletedLast\(friend, msgId\);\s*refreshChatRow\(friend\);/.test(del)
        && before(del, 'Utils.getChatPage(friend)?.deleteMessage(msgId, channel);', 'CoreMessageWriter.clearDeletedLast(friend, msgId);'),
    };
    ok(Object.values(r).every(Boolean),
      'S10 B F3: clearDeletedLast replaces a saved excerpt that IS the deleted id even when Core already blanked it, if it is a fileHeader (Core\'s recompute kept it: Friend.cs:964-972), picks the newest row by ChatHeal.isLive (a blanked file row is dead), and the REMOTE delete path runs it before the row re-push — ' + JSON.stringify(r));
  });

  await guard('S10 B F3 excerpt', async () => {
    const g = bodyOf(HOME, 'private FriendMessageHelper? getFriendMessageHelper(Friend friend, out string excerptKind, out string excerptSender)');
    const nl = bodyOf(HOME, 'private static FriendMessage? newestLiveRow(Friend friend, int channel)');
    const lp = bodyOf(HOME, 'private static int livePhotoMembers(Friend friend, int channel, FriendMessage row)');
    const fb = bodyOf(g, 'else if (lastmsg.type == FriendMessageType.fileHeader)');
    const r = {
      dead: /bool s10Dead = false;\s*if \(lastmsg\.type == FriendMessageType\.fileHeader && !ChatHeal\.isLive\(lastmsg\.type, lastmsg\.message\)\)\s*\{\s*FriendMessage\? liveRow = newestLiveRow\(friend, friend\.metaData\.lastMessageChannel\);\s*if \(liveRow != null\)\s*\{\s*lastmsg = liveRow;\s*\}\s*else\s*\{\s*s10Dead = true;\s*\}\s*\}/.test(g)
        /* after the localSender live re-fetch, before the excerpt is read from lastmsg */
        && before(g, 'lastmsg = msg;', 'bool s10Dead = false;') && before(g, 'bool s10Dead = false;', 'string excerpt = lastmsg.message;'),
      empty: /if \(s10Dead\)\s*\{\s*excerpt = "";\s*skipSelfPrefix = true;\s*\}\s*else if \(lastmsg\.type == FriendMessageType\.requestFunds\)/.test(g)
        && /excerptSender = SpixiLocalization\._SL\("index-excerpt-you"\);\s*\}\s*\}\s*if \(s10Dead\)\s*\{\s*excerptSender = "";\s*\}/.test(g),
      /* #46 r1 R3-9: the row AT that index is returned (not a neighbour / not null) */
      newest: /int at = ChatHeal\.newestLive\(list, m => ChatHeal\.isLive\(m\.type, m\.message\), m => m\.id, null\);\s*return at >= 0 \? list\[at\] : null;/.test(nl) && /lock \(list\)/.test(nl),
      count: /\? Math\.Max\(1, livePhotoMembers\(friend, friend\.metaData\.lastMessageChannel, lastmsg\)\)\s*: 0;/.test(fb)
        && /SPhotoGroups\.countOf\(SPhotoGroups\.get\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(lastmsg\.id\)\)\) > 1/.test(fb),
      /* #46 r1 M7: a window around the last message (its index, searched from the end), stopped at the stored count */
      members: /string group = SPhotoGroups\.get\(peer, Crypto\.hashToString\(row\.id\)\);\s*string gid = S10FixRules\.groupIdOf\(group\);\s*int want = SPhotoGroups\.countOf\(group\);/.test(lp)
        && /int anchor = S10FixRules\.lastIndexOfId\(list, row\.id, m => m\.id\);\s*return S10FixRules\.livePhotoCount\(list, gid,\s*m => m\.type == FriendMessageType\.fileHeader && m\.id != null && ChatHeal\.isLive\(m\.type, m\.message\),\s*m => S10FixRules\.groupIdOf\(SPhotoGroups\.get\(peer, Crypto\.hashToString\(m\.id!\)\)\),\s*anchor, S10FixRules\.PhotoWindowRows, want\);/.test(lp)
        && /lock \(list\)/.test(lp),
    };
    ok(Object.values(r).every(Boolean),
      'S10 B F3: a blanked fileHeader lastMessage → the excerpt of the newest LIVE row of its channel (none → the empty excerpt, no sender prefix); "{n} photos" counts the LIVE members of that group still in the list (≥ 1 → "Photo") — ' + JSON.stringify(r));
  });

  /* ———— F6: the wallet pre-push after bootDropped ———— */
  await guard('S10 B F6 pre-push', async () => {
    const boot = HOME.slice(HOME.indexOf('if (current_url.Equals("ixian:bootDropped", StringComparison.Ordinal))'), HOME.indexOf('else if (current_url.Equals("ixian:onload", StringComparison.Ordinal))'));
    const sp = bodyOf(HOME, 'private void scheduleWalletPrePush(bool fromOnLoad)');
    const ol = bodyOf(HOME, 'private void onLoaded()');
    const pr = bodyOf(HOME, 'private void probeFirstWalletVisit()');
    const tab = HOME.slice(HOME.indexOf('if (currentTab == "tab2")'), HOME.indexOf('else if (currentTab == "tab3")'));
    const lt = bodyOf(HOME, 'public void loadTransactions(bool forceRefresh)');
    const r = {
      /* on every platform: OUTSIDE the #if ANDROID block */
      boot: /#endif\s*scheduleWalletPrePush\(false\);\s*(?:scheduleAppsPrePush\(false\);\s*)?\}$/.test(boot.trimEnd()) && count(HOME, /scheduleWalletPrePush\((?:true|false)\);/g) === 2,   /* ★ S11 A2 re-base (#1263, R1-n2): the apps pre-push may follow it (pins-s11/f-wiring) */
      /* #46 r1 M4: onLoaded is the other event (last statement — after its own generation bump) */
      onload: /scheduleWalletPrePush\(true\);\s*\}$/.test(ol) && before(ol, 'Interlocked.Increment(ref txDocGen);', 'scheduleWalletPrePush(true);'),
      once: /int gen = System\.Threading\.Volatile\.Read\(ref txDocGen\);[\s\S]*?if \(!\(fromOnLoad \? prePushGate\.onLoaded\(gen\) : prePushGate\.onDropped\(gen\)\)\)\s*\{\s*return;\s*\}\s*prePushDocGen = gen;/.test(sp)
        && /private readonly S10FixRules\.PrePushGate prePushGate = new S10FixRules\.PrePushGate\(\);/.test(HOME),
      delayMain: /Task\.Delay\(S10FixRules\.PrePushDelayMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>/.test(sp),
      gate: /if \(!running \|\| gen != System\.Threading\.Volatile\.Read\(ref txDocGen\) \|\| !S10FixRules\.walletPrePush\(txPushedToShell, currentTab\)\)\s*\{\s*return;\s*\}/.test(sp)
        && before(sp, 'S10FixRules.walletPrePush(', 'loadTransactions(true);') && count(sp, /loadTransactions\(/g) === 1,
      logs: logsFixed(sp) && /P1Perf\.line\("wallet prepush rows=" \+ System\.Threading\.Volatile\.Read\(ref lastTxRows\) \+ " ms=" \+ P1Perf\.msSince\(t0\)\);/.test(sp),
      probe: /probeFirstWalletVisit\(\);\s*raiseTxDirtyIfRowsStale\(\);\s*loadTransactions\(!txPushedToShell\);/.test(tab)
        && /if \(!P1Perf\.enabled\)\s*\{\s*return;\s*\}/.test(pr) && /if \(tab2ProbeDocGen == gen\)\s*\{\s*return;\s*\}\s*tab2ProbeDocGen = gen;/.test(pr)
        && /P1Perf\.line\("wallet tab2 first prepushed=" \+ \(prePushRanGen == gen \? "1" : "0"\) \+ " rows=" \+ rows \+ " ms=" \+ ms\);/.test(pr),
      rows: /System\.Threading\.Volatile\.Write\(ref lastTxRows, p1Rows\);\s*System\.Threading\.Volatile\.Write\(ref lastTxRowsGen, txGenAtPush\);/.test(lt)
        && before(lt, 'walletLatchAfterBurst(', 'Volatile.Write(ref lastTxRows'),
    };
    ok(Object.values(r).every(Boolean),
      'S10 B F6: ixian:bootDropped (every platform) schedules ONE pre-push per document; PrePushDelayMs later on the main thread, if the document is the same, never fed, and the wallet tab is not current → loadTransactions(true); [P1] `wallet prepush rows= ms=` + `wallet tab2 first prepushed= rows= ms=` (first tab2 visit per document) — ' + JSON.stringify(r));
  });

  /* ———— F7: part files in Downloads/.partial + the start sweep ———— */
  await guard('S10 B F7 part files', async () => {
    const acc = bodyOf(TM, 'public static void acceptFile(Friend friend, string uid)');
    const sw = bodyOf(TM, 'private static void sweepPartFiles()');
    const up = bodyOf(TM, 'public static void onUpdate()');
    const dp = bodyOf(TM, 'private static int deletePartFiles(string partial, bool staleOnly)');
    const done = bodyOf(TM, 'public static void completeFileTransfer(Address sender, string uid)');
    const r = {
      partial: /string partialDir = Path\.Combine\(downloadsPath, S10FixRules\.PartialFolder\);\s*Directory\.CreateDirectory\(partialDir\);\s*transfer\.filePath = Path\.Combine\(partialDir, PhotoRules\.partFileName\(Guid\.NewGuid\(\)\.ToString\("N"\)\)\);/.test(acc)
        && before(acc, 'Directory.CreateDirectory(partialDir);', 'File.Create(transfer.filePath)') && !/Path\.Combine\(downloadsPath, PhotoRules\.partFileName/.test(TM),
      atStart: /^\{\s*sweepPartFiles\(\);/.test(up) && count(TM, /sweepPartFiles\(\);/g) === 1,
      /* #46 r1 M2: the ROOT sweep runs ONCE (the .partial/.root-swept marker), and never through a linked .partial (N1) */
      rootOnce: /if \(Directory\.Exists\(partial\) && S10FixRules\.isReparse\(File\.GetAttributes\(partial\)\)\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return;\s*\}/.test(sw)
        && /string marker = Path\.Combine\(partial, S10FixRules\.RootSweptMarker\);\s*if \(!File\.Exists\(marker\)\)\s*\{\s*foreach \(string f in Directory\.EnumerateFiles\(downloadsPath\)\)\s*\{\s*string leaf = Path\.GetFileName\(f\);\s*if \(S10FixRules\.isPartLeaf\(leaf\)\)\s*\{\s*try \{ File\.Delete\(Path\.Combine\(downloadsPath, leaf\)\); \} catch \(Exception\) \{ \}\s*\}\s*\}\s*Directory\.CreateDirectory\(partial\);\s*File\.WriteAllBytes\(marker, Array\.Empty<byte>\(\)\);\s*\}\s*deletePartFiles\(partial, true\);/.test(sw),
      /* #46 r1 R3-8: the 24 h sweep READS .partial; N1: part leaves only, a linked folder → nothing */
      stale: /if \(!Directory\.Exists\(partial\) \|\| S10FixRules\.isReparse\(File\.GetAttributes\(partial\)\)\)\s*\{\s*return 0;\s*\}/.test(dp)
        && /foreach \(string f in Directory\.EnumerateFiles\(partial\)\)\s*\{\s*string leaf = Path\.GetFileName\(f\);\s*string full = Path\.Combine\(partial, leaf\);/.test(dp)
        && /if \(S10FixRules\.partialDeletes\(leaf, File\.GetLastWriteTimeUtc\(full\), now, staleOnly\)\)\s*\{\s*File\.Delete\(full\);/.test(dp)
        && count(sw + dp, /File\.Delete\(/g) === 2 && !/Directory\.Delete|EnumerateDirectories|SearchOption\.AllDirectories/.test(sw + dp),
      /* #46 r1 M2 (SECURITY): a received file is never stored under a part-file leaf */
      finalLeaf: /string safe_name = S10FixRules\.finalLeaf\(PhotoRules\.SafeFileName\(transfer\.fileName\)\);/.test(done),
      /* #46 r1 M3: Delete downloads takes the part files too, after the transfers are reset */
      deleteAll: /TransferManager\.resetIncomingTransfers\(\);\s*TransferManager\.deleteAllPartFiles\(\);/.test(bodyOf(SET, 'public void onDeleteDownloads()'))
        && /return deletePartFiles\(Path\.Combine\(downloadsPath, S10FixRules\.PartialFolder\), false\);/.test(bodyOf(TM, 'public static int deleteAllPartFiles()')),
      /* #46 r2 m-6: an accepted transfer (its part file open) is never accepted again */
      acceptOnce: /if \(transfer == null\)\s*return;\s*if \(transfer\.fileStream != null\)\s*\{\s*Logging\.info\("[^"]*"\);\s*return;\s*\}/.test(acc)
        && before(acc, 'if (transfer.fileStream != null)', 'File.Create(') && before(acc, 'if (transfer.fileStream != null)', 'CoreStreamProcessor.sendMessage('),
      logs: logsFixed(sw) && logsFixed(acc) && /catch \(Exception e\)\s*\{\s*Logging\.warn\(/.test(sw),
    };
    ok(Object.values(r).every(Boolean),
      'S10 B F7: a received file is written as Downloads/.partial/incoming-<guid>.ixipart (the folder made on demand; the Downloads list reads the root only); the TransferManager thread first sweeps ROOT files of the part-file shape (leaf-named) and .partial files older than 24 h — top level only, fixed-word logs — ' + JSON.stringify(r));
  });

  /* ———— F7: setDownloadAvatars right after every setDownloadSenders ———— */
  await guard('S10 B F7 avatars push', async () => {
    const aj = bodyOf(DI, 'public static void pushJson(IEnumerable<string> fullPaths, out string senders, out string avatars)');
    const pd = bodyOf(SET, 'private void pushDownloadSenders(List<string> paths, int screen)');
    const r = {
      /* #46 r1 N3 / R3-18: both pushes from ONE snapshot, built off the UI thread in BOTH paths */
      pairs: count(SET, /"setDownloadSenders"/g) === 2 && count(SET, /"setDownloadAvatars"/g) === 2
        && /if \(downloadsSendersReady\)\s*\{\s*pushDownloadSenders\(paths, screen\);\s*\}\s*return;/.test(SET)
        && /System\.Threading\.Tasks\.Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*DownloadsIndex\.pushJson\(paths, out string json, out string avatars\);\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>/.test(pd)
        && /if \(screen != page\.downloadsScreen \|\| !page\.downloadsSendersReady\)\s*\{\s*return;\s*\}\s*Utils\.sendUiCommand\(page, "setDownloadSenders", json\);\s*Utils\.sendUiCommand\(page, "setDownloadAvatars", avatars\);/.test(pd)
        && /if \(DownloadsIndex\.build\(\) == null\)\s*\{\s*return;\s*\}\s*DownloadsIndex\.pushJson\(paths, out string json, out string avatars\);/.test(SET)
        && /Utils\.sendUiCommand\(page, "setDownloadSenders", json\);\s*Utils\.sendUiCommand\(page, "setDownloadAvatars", avatars\);/.test(SET.replace(pd, ''))
        && !/DownloadsIndex\.(?:sendersJson|avatarsJson)/.test(SET),
      snapshot: /lock \(indexLock\)\s*\{\s*snap = byPath;\s*\}/.test(aj) && count(aj, /sourceIn\(snap, p\)/g) === 1 && !/sourceOf\(/.test(aj),
      /* DownloadsPage pushes no senders → no avatars there either */
      noOther: !/setDownloadSenders|setDownloadAvatars/.test(stripCode(rd('Spixi/Pages/Downloads/DownloadsPage.xaml.cs'))),
      own: /string\? avatar = IxianHandler\.localStorage\.getAvatarPath\(s\.friend\.walletAddress\.ToString\(\)\);/.test(aj)
        && /string uri = Utils\.imageToDataUri\(avatar\);\s*if \(S10FixRules\.avatarUriOk\(uri\)\)\s*\{\s*faces\.Add\(new string\[\] \{ s\.key, uri \}\);/.test(aj)
        && /if \(faces\.Count >= S10FixRules\.MaxAvatarEntries \|\| !seen\.Add\(s\.key\)\)/.test(aj)
        && !/Http|WebClient|walletAddress\.ToString\(\) \}/.test(aj),
    };
    ok(Object.values(r).every(Boolean),
      'S10 B F7 (🟡 setDownloadAvatars): [[opaque sender key, data URI]] built by C# from its OWN avatar file (no fetch, no address on the wire, sentinels / misses / oversize skipped, ≤ 256, one per key) is pushed right after BOTH setDownloadSenders pushes (the phase-2 one computed off the UI thread) — ' + JSON.stringify(r));
  });

  /* ———— P2: the receive cap is MaxReceiveBytes ———— */
  await guard('S10 B P2 receive cap', async () => {
    const pin = bodyOf(TM, 'public static FileTransfer prepareIncomingFileTransfer(FileTransfer transfer)');
    const acc = bodyOf(TM, 'public static void acceptFile(Friend friend, string uid)');
    ok(/if \(transfer == null \|\| transfer\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)/.test(pin)
      && /if \(transfer\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)/.test(acc) && before(acc, 'MaxReceiveBytes', 'SetLength(')
      && !/MaxFileBytes/.test(TM),
      'S10 B P2: TransferManager refuses an offer (prepare + the accept belt) above PhotoRules.MaxReceiveBytes (the largest tier, 100 MB) — never the removed MaxFileBytes');
  });

  /* ———— P3: the owner's two-line created line ———— */
  await guard('S10 B P3 created line', async () => {
    const w = bodyOf(HOME, 'private static void writeCreatedGroupLine(Friend? group)');
    const langs = readdirSync(join(root, 'Spixi/Resources/Raw/lang')).filter((f) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(f));
    const keyed = langs.filter((f) => /^chat-group-members-see = \S.*$/m.test(rd('Spixi/Resources/Raw/lang/' + f)));
    const en = /^chat-group-members-see = Members can see the group now\.\r?$/m.test(rd('Spixi/Resources/Raw/lang/en-us.txt'));
    const notEnglish = langs.filter((f) => f !== 'en-us.txt' && /^chat-group-members-see = Members can see the group now\.\r?$/m.test(rd('Spixi/Resources/Raw/lang/' + f)));
    ok(/string text = S9FixRules\.createdLine\(SpixiLocalization\._SL\(S9FixRules\.CreatedKey\), SpixiLocalization\._SL\(S9FixRules\.MembersSeeKey\)\);/.test(w)
      && /public const string MembersSeeKey = "chat-group-members-see";/.test(stripCode(rd('Spixi/Utils/S9FixRules.cs')))
      && langs.length === 13 && keyed.length === 13 && en && notEnglish.length === 0
      && /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S10FixRules\.cs" \/>/.test(CSPROJ),
      'S10 B P3: the owner\'s created line = "You created this group" + "\\n" + "Members can see the group now." (both C# keys, chat-group-members-see translated in all 13 lang files: ' + keyed.length + '/' + langs.length + ', en=' + en + ', untranslated=' + notEnglish.length + '); S10FixRules is compiled into scripts/csh');
  });
}
