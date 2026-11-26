/* ==== photo1a · B — the chat media STORE (PO-3 the 320 px thumbnail · PO-6 the voice peaks): what the C# harness cannot reach — the
 * MAUI call sites, the platform arm, the delete paths, the file names (contract docs/contract-photo1a.md § 4, § 5).
 *
 * The engine RUNS in the harness (scripts/csh/ChatMediaStoreTests.cs, 57 tests, on temp roots: the key and the names, the header check,
 * a stale / foreign file = a miss, delete / deleteChat / wipe remove exactly their files, the bound, the LRU, one test per store call that
 * sits in a pure helper). ChatMediaStore.cs (the glue: `FileSystem.CacheDirectory`, the wallet, `#if ANDROID`), the six delete-path files
 * and SingleChatPage are MAUI-bound and UNCOMPILED here, so these are SOURCE pins — with the limits that come with that (they read text:
 * a hidden `#define`, a shadow class or an alias is not caught; the coldstart1 #1627 limits). Comments are masked first (comments -> spaces,
 * strings kept: the a-extra / coldstart1 mask, copied so that the module stands alone); brace and paren walks use a second mask that
 * blanks string contents too.
 *   b1 deletePaths  — every delete path of contract § 4.4 calls the store EXACTLY ONCE, at its own site, and nowhere else does a file outside
 *                     the two store files and SingleChatPage call a store member (named in the key: UIHelpers.deleteMessage, SingleChatPage.
 *                     deleteMessage, ContactDetails chat-info file delete (sharedDeleteLocal: deleteSource(item.path)) + onRemoveHistory, SContacts.leaveGroup / removeContact /
 *                     purgeFiles / removeHistory, HomePage.onDeclineRequest (deleteChat), Downloads + Settings file delete (deleteSource), SettingsPage.wipeEverything / wipeAccountData /
 *                     onDeleteHistory / onDeleteDownloads, LaunchPage.restoreAccountFile / restoreWalletFile)
 *   b2 platformOn   — `platformOn` is true ONLY under `#if ANDROID` (false under the #else), assigned nowhere else; every member that touches
 *                     disk returns at once when the store is not active (Windows / iOS / Mac stay on the old path)
 *   b3 silent       — the two store files hold no Logging. / Console. / Debug. / Trace., no network, bridge, Preferences or SecureStorage API, no
 *                     `#define` — and the engine file takes only System usings (no MAUI, no Core)
 *   b4 seams        — the harness seams `ChatMediaStore.harnessOn` / `ChatMediaStoreRules.clock` are `internal`, assigned only by their own
 *                     initialisers, and no file under Spixi/ outside the two store files names `harnessOn`, `clock`, `deleteSourceNow`
 *   b5 names        — the root is `Path.Combine(FileSystem.CacheDirectory, "spixi-media1")`; the account / chat / file names are SHA-256 hex
 *                     (their three builder bodies whole), the only Path.Combine argument lists are the allow-listed ones, and no raw input
 *                     (idHex, chat, account, sourceVersion, msgId) reaches a Path / File / Directory call; the account text is the wallet's
 *   b6 offIsOld     — with the switch OFF (or no store, no wallet) chatThumbFor / voiceInfoFor call the old chatThumbOf / voiceInfoOf as their
 *                     first act, and the old bodies are byte-identical to the base 3066e658: the SHA-256 of each masked, whitespace-normalised
 *                     body (chatThumbOf, voiceInfoOf, readHead16, readVoiceFile, enqueueThumb, enqueueVoiceInfo, drainThumbs) equals the base
 *                     value (computed from `git show HEAD:<file>` when this pin was written), and the old cache fields are as they were
 *   b7 pushShapes   — setFileThumb(id, uri) and voiceInfo(id, durMs, peaks) keep their argument lists: no new argument, no new verb, the data
 *                     URI is the old `data:image/jpeg;base64,` + base64, and the store files / PhotoOpenRules name no bridge command
 *   b8 harness      — csh.csproj compiles the REAL ChatMediaStoreRules.cs and ChatMediaStore.cs (once each); ChatMediaStoreTests holds at least the
 *                     78 [TestMethod]s (57 + the round-1 ones) of the contract and covers each delete verb
 *   b9 kindTiedToMakers  — (round 1, S-store m5: Android keeps the cache over an app update) the SHA-256 of Android SThumbnail.makeJpeg's body (+ its
 *                     MaxLongSide) and of the peaks maker (VoiceClips.peaksCsvOf + framesOf + VoiceCodec.peaks / peaksCsv + the const lines they read)
 *                     is frozen WITH the kind text each one is stored under (KindThumbText "t1" / KindPeaksText "v1"): a maker that changes
 *                     without a new kind text — or a kind text that changes without the maker — turns it red; a deliberate change of a maker
 *                     bumps the kind text AND re-bases this pin's pair in the same change
 *   b10 genAtJobCreation — enqueueThumb / enqueueVoiceInfo read ChatMediaStore.generationOf(friend?.walletAddress) only under their switch (OFF =
 *                     ChatGenReadHere, no store call) and put it in the job; processThumb / processVoiceInfo pass `job.gen`; a fresh decode is
 *                     kept (the memory LRU and the disk) only through ChatMediaStore.ifCurrent(chat, gen, …) / putThumb / putPeaks(…, gen), and the
 *                     engine refuses a put / a memory entry whose generation moved (`gen != generationNow`)
 *   b11 sweepOnlyInStore — sweepOrphans / sweepSoon / runLater are named nowhere outside ChatMediaStore.cs and ChatMediaStoreRules.cs; the glue calls
 *                     sweepOrphans once (inside sweepSoon's off-thread work) and sweepSoon once (from engine())
 *   ★ photo1a re-base (2026-11-18, the Fable store fix: G1 · G2 · G3 · G6 · F-2 · NIT-2 are in the tree) — b1 / b3 / b5 / b6 / b10 follow the new code; new keys:
 *   b12 noIoThroughLinks — G1: `linked(chatDir)` (whole) is asked before the first file operation of get / put / discard / deleteMessage; deleteChat asks linkDir(root), linkDir(accountDir) before its one rename
 *   b13 lruOnlyIfCurrent — G6: the page writes its memory LRUs only inside ChatMediaStore.ifCurrentThumb / ifCurrentPeaks; no page names the 3-argument ifCurrent
 *   b14 storeGen0        — F-2: ONE generation read at the top of loadMessages (under the switches, before friend.getMessages), passed only by the two batch loops
 *   b15 offNoProbe       — NIT-2: chatThumbOld / voiceInfoOld return the base call at once when !P1Perf.enabled
 *   b16 storeSwitchKeys  — qt reads PhotoThumbStoreKey, qv reads VoicePeaksStoreKey (a swap is red), each store property is computed from its own local
 * Deliberate breaks (#802): the builder-pins report of batch photo1a (B4), one per key. */
import { createHash } from 'node:crypto';

const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

export const mask = (t, strings = false, fill = ' ') => {
  const out = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const str = (i, verbatim, interp) => {
    const open = i;
    i++;
    const done = (e) => { if (strings) { for (let k = open + 1; k < Math.max(open + 1, e - 1); k++) if (out[k] !== '\n') out[k] = fill; } return e; };
    while (i < n) {
      const c = t[i];
      if (verbatim) {
        if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return done(i + 1); }
      } else {
        if (c === '\\') { i += 2; continue; }
        if (c === '"') return done(i + 1);
        if (c === '\n') return done(i);
      }
      if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
      i++;
    }
    return done(i);
  };
  const code = (i, hole) => {
    let depth = 0;
    while (i < n) {
      const c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
      if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
      if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); if (m && strings) blank(i + 1, i + m[0].length - 1); i += m ? m[0].length : 1; continue; }
      if (c === '"') { i = str(i, false, false); continue; }
      if (c === '@' && d === '"') { i = str(i + 1, true, false); continue; }
      if (c === '$' && d === '"') { i = str(i + 1, false, true); continue; }
      if ((c === '$' && d === '@' || c === '@' && d === '$') && t[i + 2] === '"') { i = str(i + 2, true, true); continue; }
      if (hole) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
      i++;
    }
    return i;
  };
  code(0, false);
  return out.join('');
};
const regionsAt = (src, pos) => {
  const st = [];
  for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
    if (m[1] === 'if') st.push(m[2].trim());
    else if (m[1] === 'endif') st.pop();
    else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
  }
  return st;
};

export const STORE_F = 'Spixi/Utils/ChatMediaStore.cs', ENGINE_F = 'Spixi/Utils/ChatMediaStoreRules.cs', SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs';

/* SHA-256 of the masked, whitespace-normalised body at the base 3066e658 (git show HEAD:Spixi/Pages/Chat/SingleChatPage.xaml.cs) */
export const BASE_BODIES = {
  'private static string? chatThumbOf(FileInfo fi)': '8715e9b9a89eaab4f5e7178cb6c6def3d6f2f5d4ec5226b2a577c95e82377729',
  'private string? voiceInfoOf(FriendMessage fm, string id, out bool notYet)': 'a8abf7fa89a069f3db2a1260769070830fcf5ec9b28d33c3104f4ab65b5f1d99',
  'private static byte[] readHead16(string path)': 'cd7ad6bdd91d21bf52ecb41a2f68d3bfa58474c53caa7057daa226eb3ec92142',
  'private static bool readVoiceFile(string path, out List<byte[]>? packets, out int durMs)': 'd590d714e3677f4ffe38274e5171b9482501487f43ababebbe0d5d674f65f650',
  'private void enqueueThumb(string id, FriendMessage fm)': 'c7d7d7011b43317b2dd701a4f45009e475d05f02a604ad4c180633ecaab4a330',
  'private void enqueueVoiceInfo(string id, FriendMessage fm)': 'f23a83a3c83041f0cf47a992698affee6df0aa93132b0c1e5c97554880791d7b',
  'private void drainThumbs()': '983cc0b2ef565b25babe4a2d5544132b734629118fb4c7e9cdb61e29a820fd22',
};

/* round 1 (S-store m5): the SHA-256 of each maker's masked, whitespace-normalised text, joined with the kind text it is kept under */
export const MAKER_PAIRS = {
  thumb: 'fb35db5768833e47941aafb3d605a76fea24e28c3af22fc079fa934fd7cb3d9e:t1',
  peaks: '588415d1d7e43bdcc2b9beba87c7d611698fc4159e9ab3c0fde945e6f703a417:v1',
};

export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const load = (f) => { const r = raw(f); return { f, r, m: mask(r, false), b: mask(r, true) }; };
  const body = (x, sig) => {
    if (count(x.m, sig) !== 1) return '';
    const at = x.m.indexOf(sig);
    const o = x.b.indexOf('{', at + sig.length);
    if (o < 0) return '';
    let d = 0;
    for (let k = o; k < x.b.length; k++) { if (x.b[k] === '{') d++; else if (x.b[k] === '}' && --d === 0) return x.m.slice(o, k + 1); }
    return '';
  };
  const ST = load(STORE_F), EN = load(ENGINE_F), SCP = load(SCP_F);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const FILES = walk('Spixi');
  const TREE = FILES.map((f) => ({ f, m: f === STORE_F ? ST.m : f === ENGINE_F ? EN.m : f === SCP_F ? SCP.m : mask(raw(f), false) }));
  const OUTSIDE = TREE.filter((x) => x.f !== STORE_F && x.f !== ENGINE_F);
  const storeCallsIn = (m) => [...m.matchAll(/\bChatMediaStore\.(\w+)\(/g)].map((x) => x[1]);

  /* ── b1 · every delete path calls the store exactly once, at its site ── */
  const P = (file, sig, verb, shape, n = 1, k = 1) => ({ file, sig, verb, shape, n, k });   // n = store calls in the body; k = how many of `verb`
  const PATHS = {
    'UIHelpers.deleteMessage (a message deleted: mine or the peer\'s, no chat page needed)': P('Spixi/Utils/UIHelpers.cs', 'public static void deleteMessage(Friend friend, int channel, byte[] msgId)', 'deleteMessage',
      /Utils\.getChatPage\(friend\)\?\.deleteMessage\(msgId, channel\);\s*ChatMediaStore\.deleteMessage\(friend\.walletAddress, msgId\);\s*CoreMessageWriter\.clearDeletedLast\(friend, msgId\);/),
    'SingleChatPage.deleteMessage (the open page\'s delete notification)': P(SCP_F, 'public void deleteMessage(byte[] msg_id, int channel)', 'deleteMessage',
      /Interlocked\.Increment\(ref fileDeleteGen\);\s*ChatMediaStore\.deleteMessage\(friend\?\.walletAddress, msg_id\);\s*\}$/),
    'ContactDetails chat-info "Delete from this device" (sharedDeleteLocal)': P('Spixi/Pages/Contacts/ContactDetails.xaml.cs', 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'deleteSource',
      /deleted = true;\s*\}\s*if \(deleted\) \{ ChatMediaStore\.deleteSource\(item\.path\); \}/),   // round 1 (F6): the FILE left, the message stays — by the path
    'ContactDetails.onRemoveHistory (a chat history deleted)': P('Spixi/Pages/Contacts/ContactDetails.xaml.cs', 'private void onRemoveHistory()', 'deleteChat',
      /^\{\s*if \(SContacts\.removeHistory\(friend\)\)\s*\{/, 0, 0),   // ★ fixb3 re-base (item 2, P85): ONE body — the page calls SContacts.removeHistory (its row below holds the ONE deleteChat), so no store call of its own
    'SContacts.leaveGroup (a group left)': P('Spixi/Utils/SContacts.cs', 'public static bool leaveGroup(Friend group)', 'deleteChat',
      /scheduleSentSweep\(\);\s*ChatMediaStore\.deleteChat\(group\.walletAddress\);/),
    'SContacts.removeContact (a contact removed)': P('Spixi/Utils/SContacts.cs', 'public static string removeContact(Friend friend, bool leaveSharedGroups, out List<string> blockers)', 'deleteChat',
      /scheduleSentSweep\(\);\s*ChatMediaStore\.deleteChat\(friend\.walletAddress\);/),
    'SContacts.purgeFiles (the per-contact file purge)': P('Spixi/Utils/SContacts.cs', 'public static int purgeFiles(List<string> paths, Address? owner)', 'deleteChat',
      /\}\s*ChatMediaStore\.deleteChat\(owner\);\s*return deleted;\s*\}$/),   // round 1 (F1): AFTER the file deletes
    'SContacts.removeHistory (a chat history deleted)': P('Spixi/Utils/SContacts.cs', 'public static bool removeHistory(Friend friend)', 'deleteChat',
      /scheduleSentSweep\(\);\s*ChatMediaStore\.deleteChat\(friend\.walletAddress\);/),
    'DownloadsPage file delete (Downloads list)': P('Spixi/Pages/Downloads/DownloadsPage.xaml.cs', 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'deleteSource',
      /File\.Delete\(path\);\s*SingleChatPage\.noteFileDeleted\(\);\s*ChatMediaStore\.deleteSource\(path\);/),
    'SettingsPage file delete (Settings downloads list)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'deleteSource',
      /File\.Delete\(path\);\s*SingleChatPage\.noteFileDeleted\(\);\s*ChatMediaStore\.deleteSource\(path\);/, 2),   // ★ photo1a re-base (2026-11-18): PO-5's noteFileDeleted() sits between the delete and the store call, as in DownloadsPage
    'SettingsPage photo previews OFF (ixian:photoPreviews, wipeThumbs)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'wipeThumbs',
      /foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onPhotoPreviewsChanged\(\);[^\n]*\s*if \(!SChatPrefs\.photoPreviews\) ChatMediaStore\.wipeThumbs\(\);/, 2),
    /* ★ fixb5 re-base (2026-11-25, #1963 (5), P104): the Home decline, success branch, behind SmallFixFlags.DeclineClears — after the Sent sweep, as SContacts.removeContact */
    'HomePage.onDeclineRequest (a contact request declined on Home, success branch)': P('Spixi/Pages/Home/HomePage.xaml.cs', 'private void onDeclineRequest(string address)', 'deleteChat',
      /if \(SmallFixFlags\.DeclineClears\) SContacts\.scheduleSentSweep\(\);[^\n]*\s*if \(SmallFixFlags\.DeclineClears\) ChatMediaStore\.deleteChat\(friend\.walletAddress\);/),
    'SingleChatPage ixian:undorequest (the declined / undone request, success branch)': P(SCP_F, 'private void onNavigating(object sender, WebNavigatingEventArgs e)', 'deleteChat',
      /if \(requestRemoved\)\s*\{[^{}]*SNotificationPrefs\.forgetContact\(friend\.walletAddress\.ToString\(\)\);[^\n]*\s*ChatMediaStore\.deleteChat\(friend\.walletAddress\);[^\n]*\s*\}/),
    'SingleChatPage bot-room report (the reported row is blanked)': P(SCP_F, 'private void onContextAction(string action, string msg_id_hex)', 'deleteMessage',
      /friend\.deleteMessage\(msg_id, selectedChannel\);\s*ChatMediaStore\.deleteMessage\(friend\.walletAddress, msg_id\);[^\n]*\s*CoreMessageWriter\.clearDeletedLast\(friend, msg_id\);/, 2, 2),
    'SingleChatPage bot-room own delete (my Sent copy left)': P(SCP_F, 'private void onContextAction(string action, string msg_id_hex)', 'deleteMessage',
      /deleteSentCopyOf\(del_msg\);\s*\}\s*if \(del_msg != null && del_msg\.type == FriendMessageType\.fileHeader && del_msg\.localSender\) ChatMediaStore\.deleteMessage\(friend\.walletAddress, msg_id\);/, 2, 2),
    'SettingsPage.wipeEverything (the account wipe)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'private void wipeEverything()', 'wipe', /ChatMediaStore\.wipe\(\);\s*try \{ CoreMessageWriter\.arrivals\.clear\(\);/),
    'SettingsPage.wipeAccountData (delete account data)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'private void wipeAccountData()', 'wipe', /ChatMediaStore\.wipe\(\);\s*CoreMessageWriter\.arrivals\.clear\(\);/),
    'SettingsPage.onDeleteHistory (delete all histories)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'public void onDeleteHistory()', 'wipe', /ChatMediaStore\.wipe\(\);\s*CoreMessageWriter\.arrivals\.clear\(\);/),
    'SettingsPage.onDeleteDownloads (delete all downloads)': P('Spixi/Pages/Settings/SettingsPage.xaml.cs', 'public void onDeleteDownloads()', 'wipe', /\}\s*ChatMediaStore\.wipe\(\);[^\n]*\s*SingleChatPage\.noteFileDeleted\(\);\s*\}$/),
    'LaunchPage.onCreateAccount (a NEW account)': P('Spixi/Pages/Launch/LaunchPage.xaml.cs', 'public void onCreateAccount(string nick, string pass)', 'wipe', /Utils\.sendUiCommand\(this, "wipeLocalState"\);\s*ChatMediaStore\.wipe\(\);/),
    'LaunchPage.restoreAccountFile (the account restore)': P('Spixi/Pages/Launch/LaunchPage.xaml.cs', 'private RestoreOutcome restoreAccountFile(string source_path, string pass)', 'wipe', /ChatMediaStore\.wipe\(\);\s*applyRestorePrefs\(pass\);/),
    'LaunchPage.restoreWalletFile (the wallet-file restore)': P('Spixi/Pages/Launch/LaunchPage.xaml.cs', 'private bool restoreWalletFile(string source_path, string pass)', 'wipe', /File\.Move\(source_path, target_filepath\);\s*ChatMediaStore\.wipe\(\);\s*applyRestorePrefs\(pass\);/),
  };
  const b1 = {};
  const byFile = {};
  for (const [name, p] of Object.entries(PATHS)) {
    const x = p.file === SCP_F ? SCP : load(p.file);
    const bd = body(x, p.sig);
    const calls = storeCallsIn(bd);
    b1[name] = bd.length > 20 && calls.length === p.n && (p.n === 0 || calls.includes(p.verb)) && p.shape.test(bd) && count(bd, 'ChatMediaStore.' + p.verb + '(') === p.k;
    if (p.n > 0) (byFile[p.file] = byFile[p.file] || []).push(p.verb);   // ★ fixb3 re-base: a row with n = 0 reaches the store through another row's body (no call of its own to count)
  }
  /* no other call of a delete verb anywhere outside the two store files: the per-file totals equal the table; the page's own non-delete calls are the cache ones */
  const DELETE_VERBS = ['deleteMessage', 'deleteChat', 'deleteSource', 'deleteSourceNow', 'wipe', 'wipeThumbs'];
  const totals = {};
  for (const x of OUTSIDE) { for (const v of storeCallsIn(x.m)) if (DELETE_VERBS.includes(v)) { (totals[x.f] = totals[x.f] || []).push(v); } }
  const sameList = (a, b) => (a || []).slice().sort().join() === (b || []).slice().sort().join();
  b1.noOtherDeleteCalls = Object.keys({ ...byFile, ...totals }).every((f) => sameList(byFile[f], totals[f]));
  b1.pageCacheCalls = ['thumbKeyOf', 'getThumb', 'putThumb', 'peaksKeyOf', 'getPeaks', 'putPeaks', 'onDelete', 'generationOf', 'ifCurrentThumb', 'ifCurrentPeaks'].every((v) => storeCallsIn(SCP.m).includes(v))
    && storeCallsIn(SCP.m).every((v) => ['thumbKeyOf', 'getThumb', 'putThumb', 'peaksKeyOf', 'getPeaks', 'putPeaks', 'onDelete', 'generationOf', 'ifCurrentThumb', 'ifCurrentPeaks', 'deleteMessage', 'deleteChat'].includes(v)   /* ★ photo1a re-base (2026-11-18, G6): the page reaches the memory LRUs through ifCurrentThumb / ifCurrentPeaks; the 3-argument ifCurrent is not in this list (b13 holds that) */);
  /* the delete verbs inside SingleChatPage are exactly the four sites of the table (undorequest, the two bot-room ones, deleteMessage) */
  b1.pageDeleteSites = storeCallsIn(SCP.m).filter((v) => DELETE_VERBS.includes(v)).sort().join() === 'deleteChat,deleteMessage,deleteMessage,deleteMessage';
  /* ★ fixb5 re-base (2026-11-25, #1963 (5), P104): the Home decline now calls deleteChat at its own site (its row above), behind
     its switch; it is the ONLY store call of HomePage (was: none — the orphan sweep alone cleared a declined chat) */
  b1.homePageNone = storeCallsIn(OUTSIDE.find((x) => x.f === 'Spixi/Pages/Home/HomePage.xaml.cs').m).join() === 'deleteChat';
  ok(F(b1).length === 0,
    '★ photo1a b1 deletePaths (PO-3 / PO-6, contract § 4.4): every delete path calls the store EXACTLY ONCE at its own site — a message deleted (UIHelpers.deleteMessage + SingleChatPage.deleteMessage: deleteMessage), the chat-info "Delete from this device" (ContactDetails sharedDeleteLocal: `ChatMediaStore.deleteSource(item.path)`, only when the delete worked — the FILE left, the message stays; ★ photo1a re-base 2026-11-18: this text said deleteMessage, the code and the shape always were deleteSource), a chat history deleted (SContacts.removeHistory: deleteChat; ★ fixb3 re-base: ContactDetails.onRemoveHistory calls it first and holds no store call of its own), a group left / a contact removed / a contact\'s files purged (SContacts.leaveGroup / removeContact / purgeFiles: deleteChat), a contact request declined on Home (HomePage.onDeclineRequest: deleteChat, behind DeclineClears; the branch is held by pins-fixb5/e-small-fixes e1), a file deleted from Downloads or Settings (deleteSource, right after File.Delete), delete all histories / the account wipe / delete all downloads (SettingsPage.wipeEverything / wipeAccountData / onDeleteHistory / onDeleteDownloads: wipe), the account and wallet-file restore (LaunchPage.restoreAccountFile / restoreWalletFile: wipe, before the restored prefs) — and no other file calls a delete verb; the page\'s other store calls are the cache ones — failing: ' + JSON.stringify(F(b1)));

  /* ── b2 · platformOn is Android only ── */
  const isAt = ST.m.indexOf('platformOn = true;'), isFalse = ST.m.indexOf('platformOn = false;');
  const guards = ['public static void deleteMessage(Address? chat, byte[]? msgId)', 'public static void deleteChat(Address? chat)', 'public static void deleteSource(string? path)',
    'internal static int deleteSourceNow(string? path)', 'public static void wipe()', 'public static void wipeThumbs()'].map((s) => norm(body(ST, s)));
  const b2 = {
    found: isAt > 0 && isFalse > 0,
    androidArm: isAt > 0 && JSON.stringify(regionsAt(ST.m, isAt)) === '["ANDROID"]' && JSON.stringify(regionsAt(ST.m, isFalse)) === '["#else "]'
      && /#if ANDROID\s*public static readonly bool platformOn = true;\s*#else\s*public static readonly bool platformOn = false;\s*#endif/.test(ST.m),
    onlyAssignment: count(ST.m, /\bplatformOn\s*=[^=]/g) === 2 && OUTSIDE.every((x) => !/\bplatformOn\s*=[^=]/.test(x.m)) && !/\bplatformOn\s*=[^=]/.test(EN.m),
    noDefine: TREE.every((x) => !/^\s*#\s*(define|undef)\b/m.test(x.m)),
    active: /#if SPIXI_CSH[^#]*private static bool active\s*\{\s*get\s*\{\s*return platformOn \|\| harnessOn;\s*\}\s*\}\s*#else/.test(ST.m),
    engineOff: /private static ChatMediaStoreRules\? engineOf\(\)\s*\{\s*if \(!active\)\s*\{\s*return null;\s*\}/.test(ST.m)
      && /^\{ ChatMediaStoreRules\? e = engineOf\(\);[\s\S]*return e; \}$/.test(norm(body(ST, 'private static ChatMediaStoreRules? engine()'))),   // round 1 (F2): engine() = engineOf() (the old engine(), gated) + the sweep's safe point (b11 owns the sweep call)
    activeApp: /#else\s*private static bool active\s*\{\s*get\s*\{\s*return platformOn;\s*\}\s*\}\s*#endif/.test(ST.m),   // the app: platformOn alone — harnessOn does not exist there (F9)
    membersOff: guards.every((g) => g.startsWith('{ if (!active')),
    consumer: /PhotoThumbStore = S16PassRules\.effectiveFlag\(dev, qt\) && ChatMediaStore\.platformOn;/.test(mask(raw('Spixi/Utils/SpixiFlags.cs'))) && /VoicePeaksStore = S16PassRules\.effectiveFlag\(dev, qv\) && ChatMediaStore\.platformOn;/.test(mask(raw('Spixi/Utils/SpixiFlags.cs'))),
  };
  ok(F(b2).length === 0,
    '★ photo1a b2 platformOn (§ 4.7): `ChatMediaStore.platformOn` is `true` only inside `#if ANDROID` (its #else is `false`), assigned nowhere else, no file defines or undefines a symbol; the store is `active` only on platformOn (or the harness door), engine() returns null and every delete member returns before it touches disk when it is not (Windows / iOS / Mac keep the old path); SpixiFlags AND-s PhotoThumbStore and VoicePeaksStore with it — failing: ' + JSON.stringify(F(b2)));

  /* ── b3 · the store logs nothing and reaches nothing ── */
  const FORBID = /\bLogging\b|\bConsole\b|\bDebug\.|\bTrace\.|\bHttpClient\b|\bWebClient\b|\bSocket\b|\bProcess\.|\bexecuteUiCommand\b|\bsendUiCommand\b|\bsendMessage\b|\bPreferences\b|\bSecureStorage\b|\bWebView\b|"ixian:|"spixi\./;
  const directives = (m) => [...m.matchAll(/^[^\S\r\n]*#[^\S\r\n]*(\w+)([^\r\n]*)$/gm)].map((x) => '#' + x[1] + (x[1] === 'if' ? ' ' + x[2].trim().split(/\s+/)[0] : ''));
  const usings = (m) => [...m.matchAll(/^\s*using\s+([\w.]+)\s*;/gm)].map((x) => x[1]);
  const b3 = {
    found: ST.m.length > 2000 && EN.m.length > 10000,
    storeSilent: !FORBID.test(ST.m) && !/\bLog\w*\s*\(/.test(ST.m),
    engineSilent: !FORBID.test(EN.m) && !/\bLog\w*\s*\(/.test(EN.m),
    engineUsings: usings(EN.m).every((u) => /^System(\.(Collections\.Concurrent|Collections\.Generic|Globalization|IO|Runtime\.InteropServices|Security\.Cryptography|Text|Threading|Threading\.Tasks))?$/.test(u)),   // ★ photo1a re-base (2026-11-18, Fable round 2): + Collections.Concurrent (chatGen) and Threading (Volatile) — still System only, no MAUI, no Core;   // round 1: + Tasks (the off-thread deletes)
    storeUsings: usings(ST.m).every((u) => /^(IXICore|IXICore\.Meta|IXICore\.Streaming|Microsoft\.Maui\.Storage|System(\.(Collections\.Generic|IO|Threading|Threading\.Tasks))?)$/.test(u)),   // round 1: + Streaming (the contact list) + Threading (the sweep bits)
    /* the only directives are the platform arm (`#if ANDROID` / `#else` / `#endif`) and the harness arm (`#if SPIXI_CSH` / `#else` / `#endif`); never a define / undef / region */
    noDefines: directives(ST.m).every((d) => /^#(if (ANDROID|SPIXI_CSH)|else|endif)$/.test(d)) && directives(EN.m).every((d) => /^#(if SPIXI_CSH|endif)$/.test(d)) && !/^\s*#\s*(define|undef|region)\b/m.test(ST.m + EN.m),
  };
  ok(F(b3).length === 0,
    '★ photo1a b3 silent (§ 4.5): ChatMediaStore.cs and ChatMediaStoreRules.cs hold no `Logging.` / Console / Debug / Trace call and no log helper (a failure is silent — no line a path, a name, an id or an address could ride), no network, bridge (executeUiCommand / sendUiCommand / sendMessage / ixian: / spixi.), Preferences or SecureStorage API; the engine takes only System usings (no MAUI, no Core), the glue only IXICore / Maui.Storage / System; no #define — failing: ' + JSON.stringify(F(b3)));

  /* ── b4 · the harness seams stay in the harness (round 1, F9: compiled ONLY under `#if SPIXI_CSH`; the clock seam is gone) ── */
  const seamRe = /\b(harnessOn|deleteSourceNow|harnessChats|harnessSweepArm|harnessLater)\b|\bChatMediaStoreRules\.clock\b/;
  const csh = (x, re) => { const m = re.exec(x.m); return m ? JSON.stringify(regionsAt(x.m, m.index)) === '["SPIXI_CSH"]' : false; };
  const b4 = {
    found: ST.m.length > 2000,
    harnessInternal: /internal static bool harnessOn = false;/.test(ST.m) && count(ST.m, /\bharnessOn\s*=[^=]/g) === 1 && csh(ST, /internal static bool harnessOn = false;/),
    clockGone: !/\bclock\b/i.test(ST.m + EN.m) && !/\bChatMediaStoreRules\.clock\b/.test(TREE.map((x) => x.m).join('\n')),
    deleteNowInternal: /internal static int deleteSourceNow\(string\? path\)/.test(ST.m) && csh(ST, /internal static int deleteSourceNow\(string\? path\)/),
    seamsOnlyInCsh: csh(ST, /internal static Func<List<string>\?>\? harnessChats;/) && csh(ST, /internal static void harnessSweepArm\(bool armed\)/)
      && csh(EN, /internal static Action<Action>\? harnessLater;/) && csh(EN, /public static ChatMediaStoreRules\? open\(string\? root, string\? account, int maxFiles/)
      && csh(EN, /public bool put\(char kind, string\? chat, string\? idHex, string\? sourceVersion, byte\[\]\? payload\)/)
      && count(ST.m, /\bharnessOn\b/g) === [...ST.m.matchAll(/\bharnessOn\b/g)].filter((x) => JSON.stringify(regionsAt(ST.m, x.index)) === '["SPIXI_CSH"]').length,
    noPublicSeam: !/public static[^;(]*\b(harnessOn|harnessChats|harnessLater)\b/.test(ST.m + EN.m),
    nobodyAssigns: OUTSIDE.every((x) => !seamRe.test(x.m)) && !seamRe.test(raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '').replace(/SPIXI_CSH/g, '')),
    cshOnlyDefines: count(raw('scripts/csh/csh.csproj'), '<DefineConstants>$(DefineConstants);SPIXI_CSH</DefineConstants>') === 1 && !/SPIXI_CSH/.test(raw('Spixi/Spixi.csproj')),
    noFriendAssembly: TREE.every((x) => !/InternalsVisibleTo/.test(x.m)) && !/InternalsVisibleTo/.test(raw('Spixi/Spixi.csproj')),
  };
  ok(F(b4).length === 0,
    '★ photo1a b4 seams: the harness seams `ChatMediaStore.harnessOn` / `harnessChats` / `harnessSweepArm` / `deleteSourceNow` and the engine\'s `harnessLater`, the small-bound `open` and the short `put` are compiled ONLY under `#if SPIXI_CSH` (csh.csproj defines it, Spixi.csproj never; round 1 F9) and are `internal` where not public-by-design; the old `ChatMediaStoreRules.clock` seam is gone; no file under Spixi/ outside the two store files names any of them; no InternalsVisibleTo opens them to another assembly — failing: ' + JSON.stringify(F(b4)));

  /* ── b5 · the root and the names ── */
  const callsOf = (x, re) => {   // [{ name, args }] for each `re`( … ) call, the argument text balanced on the string-blanked mask
    const out = [];
    for (const m of x.m.matchAll(re)) {
      const o = m.index + m[0].length - 1;
      let d = 0, e = -1;
      for (let k = o; k < x.b.length; k++) { if (x.b[k] === '(') d++; else if (x.b[k] === ')' && --d === 0) { e = k; break; } }
      if (e > 0) out.push({ name: m[1], args: norm(x.m.slice(o + 1, e)) });
    }
    return out;
  };
  const IO = /\b((?:Path|File|Directory)\.\w+|new FileStream|new FileInfo|new DirectoryInfo)\(/g;
  const ioCalls = [...callsOf(ST, IO), ...callsOf(EN, IO)];
  const combines = ioCalls.filter((c) => c.name === 'Path.Combine').map((c) => c.args).sort();
  const COMBINES = ['accountDir, chatFolder', 'accountDir, chatFolder' /* ★ photo1a re-base (2026-11-18, G1): deleteMessage's `linked(Path.Combine(accountDir, chatFolder))` — the second use of the same two names */, 'accountDir, chatFolder, name', 'accountDir, p.chatFolder', 'dir, ChatMediaStoreRules.RootFolderName', 'p.chatDir, Guid.NewGuid().ToString("N") + TempExtension', 'p.chatDir, p.name', 'root, accountFolder', 'root, TrashPrefix + Guid.NewGuid().ToString("N")'].sort();   // round 1: + the trash rename (a fixed prefix + a Guid: no input)
  const RAW_INPUT = /\b(idHex|idHexOf|chat|account|sourceVersion|version|msgId|text|key|keyText)\b/;
  const rootOf = norm(body(ST, 'private static string? rootOf()'));
  const b5 = {
    found: ioCalls.length > 20,
    rootName: /public const string RootFolderName = "spixi-media1";/.test(EN.m) && count(EN.m, '"spixi-media1"') === 1 && treeHas(TREE, '"spixi-media1"') === 1
      && rootOf.includes('string dir = FileSystem.CacheDirectory;') && rootOf.includes('r = string.IsNullOrEmpty(dir) ? null : Path.Combine(dir, ChatMediaStoreRules.RootFolderName);') && count(ST.m, 'FileSystem.CacheDirectory') === 1,
    combineAllowList: JSON.stringify(combines) === JSON.stringify(COMBINES),
    noRawInputInIo: ioCalls.every((c) => !RAW_INPUT.test(c.args)),
    hashedNames: norm(body(EN, 'public static string accountFolderOf(string account)')) === '{ return hex(sha("spixi-media-acct:" + account), 8); }'
      && norm(body(EN, 'public static string chatFolderOf(string accountFolder, string chat)')) === '{ return hex(sha("spixi-media-chat:" + accountFolder + ":" + chat), 8); }'
      && norm(body(EN, 'public static string fileNameOf(string chatFolder, string idHex, char kind)')) === '{ string kt = kindTextOf(kind)!; return hex(sha("spixi-media-msg:" + chatFolder + ":" + idHex + ":" + kt), 32) + "." + kt; }'
      && norm(body(EN, 'private static byte[] sha(string text)')) === '{ return SHA256.HashData(Encoding.UTF8.GetBytes(text)); }'
      && norm(body(EN, 'private static string hex(byte[] bytes, int count)')) === '{ return Convert.ToHexString(bytes, 0, count).ToLowerInvariant(); }',
    placeFromHashes: /p\.chatFolder = chatFolderOf\(accountFolder, chat!\);\s*p\.chatDir = Path\.Combine\(accountDir, p\.chatFolder\);\s*p\.name = fileNameOf\(p\.chatFolder, idHexOf\(idHex\)!, kind\);\s*p\.path = Path\.Combine\(p\.chatDir, p\.name\);/.test(EN.m)
      && /accountFolder = accountFolderOf\(account\);\s*accountDir = Path\.Combine\(root, accountFolder\);/.test(EN.m),
    accountFromWallet: /Address\? own = IxianHandler\.getWalletStorage\(\)\?\.getPrimaryAddress\(\);/.test(ST.m) && /string text = own\.ToString\(\);/.test(ST.m) && /ChatMediaStoreRules\.open\(root, text\)/.test(ST.m),
    wipeOnlyRoot: /return string\.Equals\(Path\.GetFileName\(full\), RootFolderName, StringComparison\.Ordinal\) \? full : null;/.test(EN.m),
    trashFixed: /public const string TrashPrefix = "del-";/.test(EN.m) && count(EN.m, 'TrashPrefix') >= 2,   // round 1: the trash folder's name is a fixed prefix + a Guid
    fileExt: /return hex\(sha\("spixi-media-msg:" \+ chatFolder/.test(EN.m),   // the extension is the kind text (`"." + kt`); the kind texts themselves are pinned WITH their makers in b9
  };
  ok(F(b5).length === 0,
    '★ photo1a b5 names (§ 4.1, § 4.2): the store root is `Path.Combine(FileSystem.CacheDirectory, "spixi-media1")` (the one place the cache folder is read); the account folder, the chat folder and the file name are SHA-256 hex of fixed-prefix texts (their builder bodies whole: `spixi-media-acct:` / `spixi-media-chat:` / `spixi-media-msg:`, then `.t1` / `.v1`); the Path.Combine argument lists of both files are exactly the allow-listed ones (root + account hash, account dir + chat hash + file hash, the temp name `Guid.NewGuid().ToString("N") + TempExtension`) and no raw input — idHex, chat, account, sourceVersion, msgId, a key or a text — appears in any Path / File / Directory / FileStream call; the account text is the wallet\'s own primary address; a wipe deletes only a rooted path whose last part is `spixi-media1` — failing: ' + JSON.stringify(F(b5)));

  /* ── b6 · OFF = the old path, byte for byte ── */
  const cthumb = norm(body(SCP, 'private string? chatThumbFor(FileInfo fi, string idHex, long gen, out bool hit)'));   // round 1: the form with the caller's generation does the work; the 3-argument form only reads it HERE
  const vinfo = norm(body(SCP, 'private string? voiceInfoFor(FriendMessage fm, string idHex, long gen, out bool notYet, out bool hit)'));
  const oldThumb = norm(body(SCP, 'private static string? chatThumbOld(FileInfo fi, out bool hit)'));
  const oldVoice = norm(body(SCP, 'private string? voiceInfoOld(FriendMessage fm, string idHex, out bool notYet, out bool hit)'));
  /* round 1 (F1): enqueueThumb / enqueueVoiceInfo gained ONE statement (the generation, read only under the switch) and one constructor argument;
     with exactly those two edits taken out again (whatever the statement says — b10 owns its content), the body is the base's, byte for byte (OFF = the old statements) */
  /* ★ photo1a re-base (2026-11-18, Fable round 2, F-2): the base body of enqueueThumb / enqueueVoiceInfo is now the 3-ARGUMENT form `(id, fm, long gen)` (the batch loops pass the load's one generation);
     with `, gen` taken out of the constructor call it is the base's, byte for byte. The 2-argument forms only read the generation under their switch and delegate (held whole by b10). */
  const GEN_EDITS = {
    'private void enqueueThumb(string id, FriendMessage fm)': (t) => t.replace(/new ThumbJob\(thumbDoc, id, fm, gen\)/, 'new ThumbJob(thumbDoc, id, fm)'),
    'private void enqueueVoiceInfo(string id, FriendMessage fm)': (t) => t.replace(/new VoiceInfoJob\(thumbDoc, id, fm, gen\)/, 'new VoiceInfoJob(thumbDoc, id, fm)'),
  };
  const BODY_SIG = {
    'private void enqueueThumb(string id, FriendMessage fm)': 'private void enqueueThumb(string id, FriendMessage fm, long gen)',
    'private void enqueueVoiceInfo(string id, FriendMessage fm)': 'private void enqueueVoiceInfo(string id, FriendMessage fm, long gen)',
  };
  const bodyHashes = Object.entries(BASE_BODIES).map(([sig, want]) => [sig, sha((GEN_EDITS[sig] || ((t) => t))(norm(body(SCP, BODY_SIG[sig] || sig)))) === want]);
  const fieldLines = ['private const int ChatThumbCacheMax = 64;', 'private static readonly object chatThumbLock = new object();',
    'private static readonly Dictionary<string, string?> chatThumbCache = new Dictionary<string, string?>(StringComparer.Ordinal);', 'private static readonly Queue<string> chatThumbOrder = new Queue<string>();',
    'private const int VoiceInfoCacheMax = 256;', 'private static readonly object voiceInfoCacheLock = new object();',
    'private static readonly Dictionary<string, string> voiceInfoCache = new Dictionary<string, string>(StringComparer.Ordinal);', 'private static readonly Queue<string> voiceInfoCacheOrder = new Queue<string>();'];
  const NSC = norm(SCP.m);
  const b6 = {
    found: cthumb.length > 300 && vinfo.length > 300 && oldThumb.length > 100 && oldVoice.length > 100,
    thumbOff: cthumb.startsWith('{ hit = false; try { Address? chat = friend?.walletAddress; if (!SpixiFlags.PhotoThumbStore || !chatThumbStoreFits || chat == null || fi == null) { return chatThumbOld(fi!, out hit); }')
      && count(cthumb, 'chatThumbOld(') === 2 && /^\{ hit = false; if \(!P1Perf\.enabled\) \{ return chatThumbOf\(fi\); \} try \{ string key = fi\.FullName[\s\S]*\} catch \(Exception\) \{ hit = false; \} return chatThumbOf\(fi\); \}$/.test(oldThumb),
    voiceOff: vinfo.startsWith('{ hit = false; Address? chat = friend?.walletAddress; if (!SpixiFlags.VoicePeaksStore || chat == null || fm == null) { return voiceInfoOld(fm!, idHex, out notYet, out hit); }')
      && count(vinfo, 'voiceInfoOld(') === 2 && /catch \(Exception\) \{ hit = false; \} return voiceInfoOf\(fm, idHex, out notYet\); \}$/.test(oldVoice),
    oldBodies: bodyHashes.every(([, v]) => v),
    callers: count(SCP.m, 'chatThumbOf(') === 3 && count(SCP.m, 'voiceInfoOf(') === 3   /* def + the two returns of the old path (the NIT-2 early one and the probe one) */ && count(SCP.m, 'chatThumbFor(') === 4 && count(SCP.m, 'voiceInfoFor(') === 4   // def + call of the job's form, def + delegation of the short one
      && norm(body(SCP, 'private string? chatThumbFor(FileInfo fi, string idHex, out bool hit)')) === '{ return chatThumbFor(fi, idHex, ChatGenReadHere, out hit); }'
      && norm(body(SCP, 'private string? voiceInfoFor(FriendMessage fm, string idHex, out bool notYet, out bool hit)')) === '{ return voiceInfoFor(fm, idHex, ChatGenReadHere, out notYet, out hit); }',
    fields: fieldLines.every((l) => NSC.includes(l)),
    switchesOnlyInFor: count(cthumb, 'SpixiFlags.PhotoThumbStore') === 1 && count(vinfo, 'SpixiFlags.VoicePeaksStore') === 1,
  };
  ok(F(b6).length === 0,
    '★ photo1a b6 offIsOld (PO-3 / PO-6): with the switch OFF (or the store off here, or no wallet) chatThumbFor and voiceInfoFor call the old chatThumbOf / voiceInfoOld→voiceInfoOf FIRST (their only extra work is the old memory-cache `hit` probe) and the old bodies are byte-identical to the base 3066e658 — the SHA-256 of the masked, whitespace-normalised body of chatThumbOf, voiceInfoOf, readHead16, readVoiceFile, enqueueThumb, enqueueVoiceInfo and drainThumbs equals the base value, and the old cache fields (64 / 256 entries, the FIFO queues) are as they were — failing: ' + JSON.stringify(F(b6)) + ' ' + JSON.stringify(bodyHashes.filter(([, v]) => !v).map(([s]) => s.slice(0, 50))));

  /* ── b7 · the pushes keep their shapes ── */
  const argsOf = (re) => callsOf(SCP, re);
  const sendUi = argsOf(/Utils\.(sendUiCommand)\(/g).map((c) => c.args);
  const cmdText = argsOf(/UiCommandText\.(build)\(/g).map((c) => c.args);
  const RULES_SRC = mask(raw('Spixi/Utils/PhotoOpenRules.cs'));
  /* round 1: the OFF statement sends the closure's `plainUri` (the same data URI) */
  const b7 = {
    found: sendUi.length > 20,
    thumbArgs: sendUi.filter((a) => a.startsWith('this, "setFileThumb"')).join('|') === 'this, "setFileThumb", id, plainUri!' && cmdText.filter((a) => a.startsWith('"setFileThumb"')).join('|') === '"setFileThumb", id, uri',
    voiceArgs: sendUi.filter((a) => a.startsWith('this, "voiceInfo"')).join('|') === 'this, "voiceInfo", id, info.Substring(0, bar), info.Substring(bar + 1)'
      && cmdText.filter((a) => a.startsWith('"voiceInfo"')).join('|') === '"voiceInfo", id, info.Substring(0, builtBar), info.Substring(builtBar + 1)',
    voiceState: sendUi.filter((a) => a.startsWith('this, "voiceState", id, "error"')).every((a) => a === 'this, "voiceState", id, "error", "0", "0"') && cmdText.filter((a) => a.startsWith('"voiceState"')).join('|') === '"voiceState", id, "error", "0", "0"',
    dataUri: norm(body(SCP, 'private static string chatThumbUri(byte[] jpeg)')) === '{ return "data:image/jpeg;base64," + Convert.ToBase64String(jpeg); }'
      && /jpeg != null && jpeg\.Length > 0 && jpeg\.Length <= ChatThumbMaxBytes\s*\? "data:image\/jpeg;base64," \+ Convert\.ToBase64String\(jpeg\)/.test(body(SCP, 'private static string? chatThumbOf(FileInfo fi)')),
    noNewCommand: !/"(set|window\.set)[A-Za-z]*"|ixian:/.test(ST.m + EN.m) && !/ixian:|"window\./.test(RULES_SRC),
    storeCallsNoPush: !/sendUiCommand|sendMessage/.test(ST.m + EN.m),
  };
  ok(F(b7).length === 0,
    '★ photo1a b7 pushShapes (§ 4.5): nothing new crosses the bridge — `setFileThumb(id, uri)` (2 arguments), `voiceInfo(id, durMs, peaks)` (3) and `voiceState(id, "error", "0", "0")` keep their argument lists in both the old Utils.sendUiCommand statements and the UiCommandText.build calls (the one builder, ruling 1736), the thumbnail value is still `data:image/jpeg;base64,` + base64 of the JPEG, and the store files and the rules file name no bridge command — failing: ' + JSON.stringify(F(b7)));

  /* ── b9 · a maker of the kept bytes and the kind text it is kept under change together ── */
  const bodyOf2 = (f, sig) => body(load(f), sig);
  const constLine = (f, name) => { const m = new RegExp('^[^\\n]*\\b' + name + '\\s*=[^\\n]*$', 'm').exec(load(f).m); return m ? norm(m[0]) : ''; };
  const thumbMaker = [norm(bodyOf2('Spixi/Platforms/Android/SThumbnail.cs', 'public static byte[]? makeJpeg(string path, int maxPx)')), constLine('Spixi/Platforms/Android/SThumbnail.cs', 'MaxLongSide')].join('\n');
  const peaksMaker = [norm(bodyOf2('Spixi/VoIP/VoiceClips.cs', 'public static string? peaksCsvOf(List<byte[]>? packets)')), norm(bodyOf2('Spixi/VoIP/VoiceClips.cs', 'private static byte[] framesOf(List<byte[]> packets, ref int next, long untilMs)')),
    norm(bodyOf2('Spixi/Utils/VoiceCodec.cs', 'public static int[] peaks(short[] pcm, int count)')), norm(bodyOf2('Spixi/Utils/VoiceCodec.cs', 'public static string peaksCsv(int[] peaks)')),
    constLine('Spixi/Utils/VoiceCodec.cs', 'SampleRate'), constLine('Spixi/Utils/VoiceCodec.cs', 'MaxPackets'), constLine('Spixi/Utils/VoiceCodec.cs', 'PeakCount'), constLine('Spixi/VoIP/VoiceClips.cs', 'MaxPcmSamples')].join('\n');
  const kindT = (/public const string KindThumbText = "([^"]*)";/.exec(EN.m) || [])[1], kindP = (/public const string KindPeaksText = "([^"]*)";/.exec(EN.m) || [])[1];
  const b9 = {
    found: thumbMaker.length > 800 && peaksMaker.length > 1500 && !!kindT && !!kindP,
    thumbPair: sha(thumbMaker) + ':' + kindT === MAKER_PAIRS.thumb,
    peaksPair: sha(peaksMaker) + ':' + kindP === MAKER_PAIRS.peaks,
    kindsDiffer: kindT !== kindP && /^[a-z][0-9]$/.test(kindT) && /^[a-z][0-9]$/.test(kindP),
  };
  ok(F(b9).length === 0,
    '★ photo1a b9 kindTiedToMakers (S-store m5): the kept bytes are made by Android SThumbnail.makeJpeg (the body + MaxLongSide) and by the peaks maker (VoiceClips.peaksCsvOf, framesOf, VoiceCodec.peaks / peaksCsv and the const lines they read); the SHA-256 of each is frozen WITH the kind text it is kept under (KindThumbText / KindPeaksText in ChatMediaStoreRules) — a maker that changes while its kind text stays (the cache would serve the old picture or waveform after an update), or a kind text that changes while its maker stays, turns this red; a deliberate maker change bumps the kind text and re-bases the pair here in the same change — failing: ' + JSON.stringify(F(b9)));

  /* ── b10 · the generation is read when the JOB is made and checked before anything is kept ──
     ★ photo1a re-base (2026-11-18, Fable round 2: G2, G6, F-2): the page has the 2-argument enqueue forms (the live paths: they read the generation under the switch and
     delegate) and the 3-argument ones (the job with the generation its caller read); the memory entries go through ifCurrentThumb / ifCurrentPeaks (b13); the engine's
     refusal is in ifCurrentFor and put (the generation is compared under the writeLock) */
  const enqT2 = norm(body(SCP, 'private void enqueueThumb(string id, FriendMessage fm)')), enqV2 = norm(body(SCP, 'private void enqueueVoiceInfo(string id, FriendMessage fm)'));
  const enqT = norm(body(SCP, 'private void enqueueThumb(string id, FriendMessage fm, long gen)')), enqV = norm(body(SCP, 'private void enqueueVoiceInfo(string id, FriendMessage fm, long gen)'));
  const procT = norm(body(SCP, 'private void processThumb(ThumbJob job)')), procV = norm(body(SCP, 'private void processVoiceInfo(VoiceInfoJob job)'));
  const gThumb = norm(body(SCP, 'private string? chatThumbFor(FileInfo fi, string idHex, long gen, out bool hit)')), gVoice = norm(body(SCP, 'private string? voiceInfoFor(FriendMessage fm, string idHex, long gen, out bool notYet, out bool hit)'));
  const engPut = norm(body(EN, 'public bool put(char kind, string? chat, string? idHex, string? sourceVersion, byte[]? payload, long gen)')), engIf = norm(body(EN, 'private bool ifCurrentFor(char kind, string? chat, string? id, long gen, Action? remember)'));
  const gluePutT = norm(body(ST, 'public static void putThumb(Address? chat, string idHex, string sourceVersion, byte[]? jpeg, long gen)')), gluePutP = norm(body(ST, 'public static void putPeaks(Address? chat, string idHex, string sourceVersion, string? info, long gen)'));
  const b10 = {
    found: enqT.length > 50 && enqV.length > 100 && enqT2.length > 50 && enqV2.length > 50 && procT.length > 300 && procV.length > 300 && gThumb.length > 300 && gVoice.length > 300 && engPut.length > 300,
    thumbJobGen: enqT2 === '{ enqueueThumb(id, fm, SpixiFlags.PhotoThumbStore ? ChatMediaStore.generationOf(friend?.walletAddress) : ChatGenReadHere); }'
      && enqT.includes('thumbQueue.Enqueue(new ThumbJob(thumbDoc, id, fm, gen));') && count(enqT, 'generationOf(') === 0 && count(SCP.m, 'new ThumbJob(') === 1,
    voiceJobGen: enqV2 === '{ enqueueVoiceInfo(id, fm, SpixiFlags.VoicePeaksStore ? ChatMediaStore.generationOf(friend?.walletAddress) : ChatGenReadHere); }'
      && enqV.includes('voiceInfoQueue.Enqueue(new VoiceInfoJob(thumbDoc, id, fm, gen));') && count(enqV, 'generationOf(') === 0 && count(SCP.m, 'new VoiceInfoJob(') === 1,
    jobsPassGen: procT.includes('chatThumbFor(fi, job.id, job.gen, out bool hit)') && procV.includes('voiceInfoFor(job.fm, job.id, job.gen, out notYet, out _)')
      && count(SCP.m, 'chatThumbFor(fi, job.id, job.gen,') === 1 && count(SCP.m, 'voiceInfoFor(job.fm, job.id, job.gen,') === 1,
    /* the reads of the store's generation in the page: loadMessages' one (storeGen0, b14), the two live-path enqueues, and the "no generation given" fallback of the two For() forms after their switch check */
    onlyHereReads: count(SCP.m, 'ChatMediaStore.generationOf(') === 5 && count(gThumb, 'ChatMediaStore.generationOf(chat)') === 1 && count(gVoice, 'ChatMediaStore.generationOf(chat)') === 1
      && gThumb.includes('if (gen == ChatGenReadHere) { gen = ChatMediaStore.generationOf(chat);') && gVoice.includes('if (gen == ChatGenReadHere) { gen = ChatMediaStore.generationOf(chat);')
      && gThumb.indexOf('PhotoThumbStore') < gThumb.indexOf('generationOf(') && gVoice.indexOf('VoicePeaksStore') < gVoice.indexOf('generationOf('),
    keptOnlyIfCurrent: count(SCP.m, 'chatThumbLru.put(') === 2 && count(SCP.m, 'voiceInfoLru.put(') === 2
      && count(gThumb, 'ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, kept));') === 1 && count(gThumb, '&& ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, jpeg))) { ChatMediaStore.putThumb(chat, idHex, version, jpeg, gen);') === 1
      && count(gVoice, 'ChatMediaStore.ifCurrentPeaks(chat, idHex, gen, () => voiceInfoLru.put(key, kept));') === 1 && count(gVoice, 'if (ChatMediaStore.ifCurrentPeaks(chat, idHex, gen, () => voiceInfoLru.put(key, info))) { ChatMediaStore.putPeaks(chat, idHex, version, info, gen);') === 1
      && count(SCP.m, 'ChatMediaStore.putThumb(') === 1 && count(SCP.m, 'ChatMediaStore.putPeaks(') === 1,
    glueCarries: gluePutT.includes('engine()?.put(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, sourceVersion, jpeg, gen);') && gluePutP.includes('System.Text.Encoding.ASCII.GetBytes(info!), gen);')
      && norm(body(ST, 'public static bool ifCurrentThumb(Address? chat, string idHex, long gen, Action remember)')) === '{ try { return engine()?.ifCurrent(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, gen, remember) ?? false; } catch (Exception) { return false; } }'
      && norm(body(ST, 'public static bool ifCurrentPeaks(Address? chat, string idHex, long gen, Action remember)')) === '{ try { return engine()?.ifCurrent(ChatMediaStoreRules.KindPeaks, textOf(chat), idHex, gen, remember) ?? false; } catch (Exception) { return false; } }',
    engineRefuses: /if \(gen < 0 \|\| payload == null/.test(engPut) && /if \(gen != generationNow\(s, p\.chatFolder\)/.test(engPut) && engPut.indexOf('lock (writeLock)') < engPut.indexOf('gen != generationNow(')
      && /if \(gen < 0 \|\| remember == null/.test(engIf) && engIf.indexOf('lock (writeLock)') < engIf.indexOf('gen != generationNow(') && engIf.indexOf('gen != generationNow(') < engIf.indexOf('remember();')
      && !/public bool put\(char kind, string\? chat, string\? idHex, string\? sourceVersion, byte\[\]\? payload\)/.test(mask(EN.r).split('#if SPIXI_CSH').map((q, i) => i === 0 ? q : q.slice(q.indexOf('#endif'))).join('')),
  };
  ok(F(b10).length === 0,
    '★ photo1a b10 genAtJobCreation (round 1, F1): the store\'s delete generation of the chat is read when the media JOB is MADE — enqueueThumb / enqueueVoiceInfo call `ChatMediaStore.generationOf(friend?.walletAddress)` once each, ONLY under PhotoThumbStore / VoicePeaksStore (OFF = ChatGenReadHere: no store call) — and rides in ThumbJob / VoiceInfoJob; processThumb / processVoiceInfo hand `job.gen` on; the only other reads are the "no generation given" fallback of chatThumbFor / voiceInfoFor after their switch check; a fresh decode is kept (memory LRU AND disk) only through `ChatMediaStore.ifCurrentThumb / ifCurrentPeaks(chat, idHex, gen, …)` (★ photo1a re-base 2026-11-18) / `putThumb` / `putPeaks(…, gen)`, which carry the number to the engine, and the engine refuses a put or a memory entry whose generation moved (under its write lock) — failing: ' + JSON.stringify(F(b10)));

  /* ── b11 · the orphan sweep belongs to the store ── */
  const sweepNames = /\b(sweepOrphans|sweepSoon|runLater|chatsKnown|chatsNow|takeSweep|giveSweepBack)\b/;
  const b11 = {
    found: ST.m.length > 2000 && EN.m.length > 10000,
    notOutside: TREE.every((x) => x.f === STORE_F || x.f === ENGINE_F || !sweepNames.test(x.m)) && !/\b(sweepOrphans|sweepSoon|runLater)\b/.test(raw('scripts/csh/csh.csproj')),
    oneCallEach: count(ST.m, 'sweepSoon(') === 2 && count(ST.m, 'e.sweepOrphans(') === 1 && count(ST.m, 'sweepOrphans(') === 1 && count(ST.m, 'ChatMediaStoreRules.runLater(') === 1
      && norm(body(ST, 'private static ChatMediaStoreRules? engine()')).includes('sweepSoon(e);') && count(EN.m, 'public int sweepOrphans(') === 1 && count(EN.m, /\bsweepOrphans\(/g) === 1,
    offThread: /ChatMediaStoreRules\.runLater\(\(\) =>\s*\{[\s\S]*e\.sweepOrphans\(/.test(norm(body(ST, 'private static void sweepSoon(ChatMediaStoreRules e)')).replace(/ /g, ' ')) || /runLater\(\(\) => \{[^]*e\.sweepOrphans\(/.test(norm(body(ST, 'private static void sweepSoon(ChatMediaStoreRules e)'))),
  };
  ok(F(b11).length === 0,
    '★ photo1a b11 sweepOnlyInStore (round 1, F2): the orphan sweep is the store\'s own — `sweepOrphans` / `sweepSoon` / `runLater` (and the helpers chatsKnown / chatsNow / takeSweep / giveSweepBack) are named in no file outside ChatMediaStore.cs and ChatMediaStoreRules.cs (no page, no delete path, no csh project item calls them); the glue calls `sweepSoon` from engine() only and `sweepOrphans` once, inside the off-thread work that `runLater` starts — failing: ' + JSON.stringify(F(b11)));

  /* ── b12 · G1 (Fable round 2): no file operation through a link at the account / chat folder ──
     The engine's `linked(chatDir)` (the root, the account folder or the chat folder is a link) comes BEFORE every file operation of get, put, discard and deleteMessage;
     deleteChat looks at the root and the account folder (linkDir) before it renames anything. The first-IO test is a list of the operation names, applied to each body. */
  const IO_RE = /\b(new FileInfo\(|new DirectoryInfo\(|File\.\w+\(|Directory\.\w+\(|new FileStream\(|readBounded\(|discard\(|removeLink\(|lengthOf\(|countAndSweep\(|prune\(|toTrash\(|deleteTree\()/;
  const firstIo = (t) => { const m = IO_RE.exec(t); return m ? m.index : -1; };
  const eGet = norm(body(EN, 'public byte[]? get(char kind, string? chat, string? idHex, string? sourceVersion)'));
  const ePut = norm(body(EN, 'public bool put(char kind, string? chat, string? idHex, string? sourceVersion, byte[]? payload, long gen)'));
  const eDisc = norm(body(EN, 'private void discard(string path, string chatDir)'));
  const eDelMsg = norm(body(EN, 'public void deleteMessage(string? chat, string? idHex)'));
  const eDelChat = norm(body(EN, 'public void deleteChat(string? chat)'));
  const b12 = {
    found: eGet.length > 300 && ePut.length > 300 && eDisc.length > 100 && eDelMsg.length > 200 && eDelChat.length > 200,
    linkedWhole: norm(body(EN, 'private bool linked(string chatDir)')) === '{ return linkDir(root) || linkDir(accountDir) || linkDir(chatDir); }'
      && norm(body(EN, 'private static bool linkDir(string dir)')) === '{ return isLink(new DirectoryInfo(dir)); }',
    getFirst: eGet.indexOf('if (linked(p.chatDir)) { return null;') > 0 && eGet.indexOf('if (linked(p.chatDir)) { return null;') < firstIo(eGet.slice(eGet.indexOf('Place? p = placeOf('))) + eGet.indexOf('Place? p = placeOf(')
      && eGet.indexOf('if (linked(p.chatDir))') < eGet.indexOf('isLink(new FileInfo(p.path))') && eGet.indexOf('isLink(new FileInfo(p.path))') < eGet.indexOf('readBounded(path')
      && count(eGet, 'linked(') === 2 && /if \(isLink\(new FileInfo\(p\.path\)\)\) \{ lock \(writeLock\) \{ if \(!linked\(p\.chatDir\)\) \{ removeLink\(p\.path\);/.test(eGet),   // a file link under the name goes as a link, never read
    putFirst: ePut.indexOf('lock (writeLock)') > 0 && ePut.indexOf('if (linked(p.chatDir)) { return false;') > ePut.indexOf('lock (writeLock)') && count(ePut, 'linked(') === 1
      && ePut.indexOf('if (linked(p.chatDir))') < firstIo(ePut.slice(ePut.indexOf('lock (writeLock)'))) + ePut.indexOf('lock (writeLock)')
      && ePut.indexOf('if (linked(p.chatDir))') < ePut.indexOf('isLink(new FileInfo(p.path))') && ePut.indexOf('isLink(new FileInfo(p.path))') < ePut.indexOf('countAndSweep(s)')
      && ePut.indexOf('countAndSweep(s)') < ePut.indexOf('Directory.CreateDirectory(p.chatDir)') && ePut.indexOf('Directory.CreateDirectory(p.chatDir)') < ePut.indexOf('new FileStream(temp'),
    discardFirst: eDisc.indexOf('if (linked(chatDir)) { return;') > 0 && eDisc.indexOf('if (linked(chatDir))') < firstIo(eDisc.slice(eDisc.indexOf('lock (writeLock)'))) + eDisc.indexOf('lock (writeLock)') && count(eDisc, 'linked(') === 1,
    deleteMsgFirst: eDelMsg.indexOf('bool viaLink = linked(Path.Combine(accountDir, chatFolder));') > 0 && count(eDelMsg, 'linked(') === 1
      && eDelMsg.indexOf('bool viaLink = linked(') < eDelMsg.indexOf('if (viaLink) { continue; }') && eDelMsg.indexOf('if (viaLink) { continue; }') < eDelMsg.indexOf('new FileInfo(Path.Combine(accountDir, chatFolder, name))')
      && eDelMsg.indexOf('bool viaLink = linked(') < firstIo(eDelMsg.slice(eDelMsg.indexOf('foreach (char kind'))) + eDelMsg.indexOf('foreach (char kind'),
    deleteChatFirst: eDelChat.indexOf('if (linkDir(root)) { return;') > 0 && eDelChat.indexOf('if (linkDir(root)) { return;') < eDelChat.indexOf('if (linkDir(accountDir)) { removeLink(accountDir); return; }')
      && eDelChat.indexOf('if (linkDir(accountDir)) { removeLink(accountDir); return; }') < eDelChat.indexOf('trash = toTrash(root, chatDir);') && count(eDelChat, 'toTrash(') === 1,
  };
  ok(F(b12).length === 0,
    '★ photo1a b12 noIoThroughLinks (G1, Fable round 2): the engine looks for a link BEFORE any file operation — `linked(chatDir)` (= linkDir(root) || linkDir(accountDir) || linkDir(chatDir), whole; linkDir = isLink(new DirectoryInfo(dir))) is asked before the first IO of get (a plain miss; a file link under the entry\'s name goes AS a link and is never read), put (inside the writeLock, before the count, the prune, the CreateDirectory and the stream), discard (inside the lock, before the delete) and deleteMessage (`viaLink`: the name is remembered, no file is touched); deleteChat asks linkDir(root) and then linkDir(accountDir) before its one rename into the trash — failing: ' + JSON.stringify(F(b12)));

  /* ── b13 · G6 (Fable round 2): the page reaches the memory LRUs only through ifCurrentThumb / ifCurrentPeaks ── */
  const b13 = {
    found: count(SCP.m, 'chatThumbLru') >= 4 && count(SCP.m, 'voiceInfoLru') >= 4,
    putsOnlyThere: count(SCP.m, /\bchatThumbLru\.put\(/g) === 2 && count(SCP.m, /ChatMediaStore\.ifCurrentThumb\(chat, idHex, gen, \(\) => chatThumbLru\.put\(key, (kept|jpeg)\)\)/g) === 2
      && count(SCP.m, /\bvoiceInfoLru\.put\(/g) === 2 && count(SCP.m, /ChatMediaStore\.ifCurrentPeaks\(chat, idHex, gen, \(\) => voiceInfoLru\.put\(key, (kept|info)\)\)/g) === 2,
    noOtherUse: count(SCP.m, /\bchatThumbLru\b/g) === 4 && count(SCP.m, /\bvoiceInfoLru\b/g) === 4   // the declaration, tryGet, the two puts in each
      && count(SCP.m, /\bchatThumbLru\.tryGet\(/g) === 1 && count(SCP.m, /\bvoiceInfoLru\.tryGet\(/g) === 1
      && /private static readonly ChatMediaLru<string, byte\[\]> chatThumbLru = newChatThumbLru\(\);/.test(SCP.m) && /private static readonly ChatMediaLru<string, string> voiceInfoLru = newVoiceInfoLru\(\);/.test(SCP.m),
    noThreeArg: count(SCP.m, 'ChatMediaStore.ifCurrent(') === 0 && count(SCP.m, 'ChatMediaStore.ifCurrentThumb(') === 2 && count(SCP.m, 'ChatMediaStore.ifCurrentPeaks(') === 2
      && OUTSIDE.every((x) => x.f === SCP_F || count(x.m, 'ChatMediaStore.ifCurrent(') === 0),
    engineKind: norm(body(EN, 'public bool ifCurrent(char kind, string? chat, string? idHex, long gen, Action? remember)')).includes('string? id = idHexOf(idHex); if (id == null || kindTextOf(kind) == null) { return false; } return ifCurrentFor(kind, chat, id, gen, remember);')
      && /s\.deadNames\.Contains\(chatFolder \+ "\/" \+ fileNameOf\(chatFolder, id, kind\)\)/.test(norm(body(EN, 'private bool ifCurrentFor(char kind, string? chat, string? id, long gen, Action? remember)'))),
  };
  ok(F(b13).length === 0,
    '★ photo1a b13 lruOnlyIfCurrent (G6, Fable round 2): the page writes the memory LRUs (chatThumbLru, voiceInfoLru) ONLY inside `ChatMediaStore.ifCurrentThumb(chat, idHex, gen, …)` / `ifCurrentPeaks(…)` — the 4 puts, each with its own kind and nothing else touches the LRU but its declaration and tryGet — the 3-argument `ChatMediaStore.ifCurrent` is named by no page; the engine\'s per-message form refuses a message that was deleted (its dead name) as well as a moved generation — failing: ' + JSON.stringify(F(b13)));

  /* ── b14 · F-2 (Fable round 2): the load's ONE store generation ── */
  const loadMF = body(SCP, 'public void loadMessages()');
  const b14 = {
    found: loadMF.length > 1000,
    readOnce: count(SCP.m, 'long storeGen0 =') === 1 && count(loadMF, 'long storeGen0 = (SpixiFlags.PhotoThumbStore || SpixiFlags.VoicePeaksStore) ? ChatMediaStore.generationOf(friend?.walletAddress) : ChatGenReadHere;') === 1
      && count(SCP.m, /\bstoreGen0\s*=[^=]/g) === 1,
    beforeRows: loadMF.indexOf('long storeGen0 =') > 0 && loadMF.indexOf('long storeGen0 =') < loadMF.indexOf('friend.getMessages(') && loadMF.indexOf('long storeGen0 =') < loadMF.indexOf('UiBatch batch')
      && loadMF.indexOf('int deleteGen0 = Volatile.Read(ref fileDeleteGen);') < loadMF.indexOf('long storeGen0 =') && loadMF.indexOf('long storeGen0 =') < loadMF.indexOf('bool exhausted = false;'),
    passedByLoops: count(SCP.m, /\bstoreGen0\b/g) === 5 && count(loadMF, /\bstoreGen0\b/g) === 5
      && count(loadMF, 'enqueueThumb(t.Key, t.Value, storeGen0)') === 2 && count(loadMF, 'enqueueVoiceInfo(v.Key, v.Value, storeGen0)') === 2,
    twoArgDelegate: count(SCP.m, /\benqueueThumb\([^()]*,[^()]*,\s*[^()]*\)/g) >= 2   // the 3-argument calls exist: the two loops (a2/a4 hold them); the live callers use the 2-argument form
      && count(SCP.m, 'enqueueThumb(id, message);') === 1 && count(SCP.m, 'enqueueThumb(Crypto.hashToString(fm.id), fm);') === 1
      && count(SCP.m, 'enqueueVoiceInfo(id, message);') === 1 && count(SCP.m, 'enqueueVoiceInfo(Crypto.hashToString(friend_message.id), friend_message);') === 1 && count(SCP.m, 'enqueueVoiceInfo(idHex, fm!);') === 1,
  };
  ok(F(b14).length === 0,
    '★ photo1a b14 storeGen0 (F-2, Fable round 2): loadMessages reads the store\'s generation of the chat ONCE — `long storeGen0 = (PhotoThumbStore || VoicePeaksStore) ? ChatMediaStore.generationOf(friend?.walletAddress) : ChatGenReadHere;` (no store call with both switches OFF) — after the delete-generation sample and BEFORE the first friend.getMessages( / UiBatch, assigned nowhere else, and passed ONLY by the two batch loops (thumbnails, waveforms; each twice: the held lambda and the else) to the 3-argument enqueue forms; the live callers keep the 2-argument forms, which read the generation under their switch (b10) — failing: ' + JSON.stringify(F(b14)));

  /* ── b15 · NIT-2 (Fable round 2): a store build with the switch OFF and no [P1] counts is EXACTLY the base call ── */
  const oldT = norm(body(SCP, 'private static string? chatThumbOld(FileInfo fi, out bool hit)')), oldV = norm(body(SCP, 'private string? voiceInfoOld(FriendMessage fm, string idHex, out bool notYet, out bool hit)'));
  const b15 = {
    found: oldT.length > 100 && oldV.length > 100,
    thumbEarly: oldT.startsWith('{ hit = false; if (!P1Perf.enabled) { return chatThumbOf(fi); } try {') && count(oldT, 'chatThumbOf(') === 2 && count(oldT, 'P1Perf.enabled') === 1,
    voiceEarly: oldV.startsWith('{ hit = false; if (!P1Perf.enabled) { return voiceInfoOf(fm, idHex, out notYet); } try {') && count(oldV, 'voiceInfoOf(') === 2 && count(oldV, 'P1Perf.enabled') === 1,
    /* the two Old forms are reached only from the For forms' OFF branches (b6: the switch, the fits-check, no wallet, no id key) */
    onlyFromFor: count(SCP.m, 'chatThumbOld(') === 3 && count(SCP.m, 'voiceInfoOld(') === 3,
  };
  ok(F(b15).length === 0,
    '★ photo1a b15 offNoProbe (NIT-2, Fable round 2): chatThumbOld / voiceInfoOld return the BASE call at once — `if (!P1Perf.enabled) { return chatThumbOf(fi); }` / `{ return voiceInfoOf(fm, idHex, out notYet); }` right after `hit = false;` — when no dev [P1] count is wanted, so a store build with the switch OFF runs exactly the old statement (the cache probe only feeds the dev line); the probe path keeps its one base call at the end — failing: ' + JSON.stringify(F(b15)));

  /* ── b16 · the two store switches read the right pref keys (round-6 reader) ── */
  const SFR = mask(raw('Spixi/Utils/SpixiFlags.cs'), false);
  const initF = norm(body({ m: SFR, b: mask(raw('Spixi/Utils/SpixiFlags.cs'), true) }, 'public static void init()'));
  const b16 = {
    found: initF.length > 800,
    readKeys: count(initF, 'qt = Preferences.Default.Get(PhotoThumbStoreKey, 1);') === 1 && count(initF, 'qv = Preferences.Default.Get(VoicePeaksStoreKey, 1);') === 1
      && count(initF, 'PhotoThumbStoreKey') === 1 && count(initF, 'VoicePeaksStoreKey') === 1,
    computes: count(initF, 'PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt) && ChatMediaStore.platformOn;') === 1 && count(initF, 'VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;') === 1
      && count(initF, /\bqt\b/g) === 3 && count(initF, /\bqv\b/g) === 3,   // the declaration, the read, the compute
    keyStrings: /public const string PhotoThumbStoreKey = "flagPhotoThumbStore";/.test(SFR) && /public const string VoicePeaksStoreKey = "flagVoicePeaksStore";/.test(SFR),
  };
  ok(F(b16).length === 0,
    '★ photo1a b16 storeSwitchKeys (round 6): SpixiFlags.init reads `qt` from PhotoThumbStoreKey ("flagPhotoThumbStore") and `qv` from VoicePeaksStoreKey ("flagVoicePeaksStore") — each key once, in its own statement, default 1 — and each store property is computed from ITS OWN local (`PhotoThumbStore = effectiveFlag(dev, qt) && platformOn`, `VoicePeaksStore = effectiveFlag(dev, qv) && platformOn`): swapping the two keys, or the two locals, turns it red — failing: ' + JSON.stringify(F(b16)));

  /* ── b8 · the harness runs the real files ── */
  const csproj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/ChatMediaStoreTests.cs')) ? raw('scripts/csh/ChatMediaStoreTests.cs') : '';
  const b8 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/ChatMediaStoreRules.cs" />') === 1 && count(csproj, '<Compile Include="../../Spixi/Utils/ChatMediaStore.cs" />') === 1,
    tests: count(tests, /\[TestMethod\]/g) >= 78 && count(tests, /\[TestClass\]/g) >= 1 && /public class ChatMediaStore\w*Tests/.test(tests),
    verbs: ['deleteMessage', 'deleteChat', 'deleteSource', 'wipe'].every((v) => count(tests, 'ChatMediaStore.' + v + '(') > 0 || count(tests, 'ChatMediaStoreRules.' + v + '(') > 0 || count(tests, '.' + v + '(') > 0),
  };
  ok(F(b8).length === 0,
    '★ photo1a b8 harness (PO-3 / PO-6): csh.csproj compiles the REAL ChatMediaStoreRules.cs and ChatMediaStore.cs once each, the ChatMediaStore*Tests classes hold at least the 78 [TestMethod]s (the 57 of the contract + the round-1 ones) and exercise deleteMessage / deleteChat / deleteSource / wipe — failing: ' + JSON.stringify(F(b8)));
}

function treeHas(tree, s) { return tree.reduce((a, x) => a + count(x.m, s), 0); }
