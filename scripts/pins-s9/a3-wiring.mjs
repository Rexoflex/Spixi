/* ==== SESSION 9 — agent A3: the C# CALL SITES of the S8 fix rows (#1243 / #1247: 8-GRP-ADD · 8-APP · 8-FACE), A-7 (#1245),
 * the desktop rows (#1179 (a) the info pane follows a chat switch · #1173 (8) the Downloads dialog), D-04 haptics and the
 * language report link (#1246) ====
 * The pure rules (S9FixRules, SAppJoins, SVoicePlayed) are EXECUTED in scripts/csh (S9FixTests.cs). The call sites are
 * MAUI-bound and compile nowhere in this container, so they are pinned on comment-stripped source (stripCode keeps string
 * literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks (#802) — run by agent A3 in a scratch copy (/tmp/claude-0/s9/a3/mutate.py); each failed EXACTLY the named pin:
 *   HandlePickSucceeded: comment out `writeCreatedGroupLine(g);`                                  → GRP-ADD
 *   writeCreatedGroupLine: fire_local_notification `0, false, false)` → `0, true, false)`          → GRP-ADD
 *   ja-jp.txt: rename the `chat-group-you-created` key                                            → GRP-ADD
 *   markJoined: marksJoin(…, `m.localSender` → `false`, …)                                        → APP
 *   onJoinApp: drop `watchAppPageClose(miniAppPage, joinedRow);`                                  → APP
 *   addAppRequest: the SAppJoins.has term → `false`                                               → APP
 *   onVoicePlay: noteVoicePlayCandidate(ownHex, `fm.localSender` → `false`)                       → FACE
 *   pushVoiceState: `state == "playing"` → `"stopped"`                                            → FACE
 *   updateMessage: drop the `voicePlayedArg(message, voice)` arg                                  → FACE
 *   updateReactions: an IxiNumber amount written into tip_total_str                              → A-7
 *   onChat: the unconditional closeContactDetailsOverlays() back                                  → #1179 (a)
 *   overlayColumnMotion: `if (infoPaneSwapNoMotion)` → `if (false)`                              → #1179 (a)
 *   onOverlayClosed: the closesInfoPaneOnChatClose test → `if (true)`                            → #1179 (a)
 *   ContactDetails: `DownloadsPage.create(name)` → `new DownloadsPage(name)`                      → #1173 (8)
 *   pushPageLoaded stage: the ownsStageGround ternary dropped                                     → #1173 (8)
 *   wrapAsDialog: the scrim tap → `{ }`                                                           → #1173 (8)
 *   onNavigatingGlobal haptic: drop `hasGeneratedContent &&`                                      → D-04
 *   openTranslationReport: openExternal(`url` → `langCode`, …)                                    → #1246
 *   LaunchPage: the branch calls Utils.openExternal(<the WebView code>) instead                   → #1246
 *   SContacts: `SAppJoins.clear(` renamed at one site                                             → stores
 *   SettingsPage wipe: drop the SAppJoins/SVoicePlayed clearAll line (and: drop SVoicePlayed only) → stores
 *   csh.csproj: drop the SVoicePlayed.cs Compile line                                             → csh
 * Survivors: none (one survivor in the first run — the clearAll pairing looked 400 chars ahead and reached the NEXT
 * method's pair; fixed to the next line). */
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
  /* every Logging.* line of a body: its argument must be fixed words, an exception TYPE name or a number — never a name,
     an address, a path, a code or text (CLAUDE.md ★ logs) */
  const logsFixed = (b) => [...b.matchAll(/Logging\.(?:info|warn|error)\(([^;]*)\);/g)].every((m) => {
    const a = m[1].replace(/"(?:[^"\\]|\\.)*"/g, '');
    return a.replace(/\s|\+|\(|\)|e\.GetType\(\)\.Name|ex\.GetType\(\)\.Name/g, '') === '';
  });

  const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const SCB = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
  const DL = stripCode(rd('Spixi/Pages/Downloads/DownloadsPage.xaml.cs'));
  const CD = stripCode(rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
  const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
  const LAUNCH = stripCode(rd('Spixi/Pages/Launch/LaunchPage.xaml.cs'));
  const UT = stripCode(rd('Spixi/Utils/Utils.cs'));

  /* ———— GRP-ADD: the owner writes the {7} "You created this group" line right after the createGroup send ———— */
  await guard('S9 A3 GRP-ADD owner line', async () => {
    const hps = HOME.slice(HOME.indexOf('private async void HandlePickSucceeded('), HOME.indexOf('private static void writeCreatedGroupLine('));
    const w = bodyOf(HOME, 'private static void writeCreatedGroupLine(Friend? group)');
    const langs = readdirSync(join(root, 'Spixi/Resources/Raw/lang')).filter((f) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(f));
    const keyed = langs.filter((f) => /^chat-group-you-created = \S.*$/m.test(rd('Spixi/Resources/Raw/lang/' + f)));
    const en = /^chat-group-you-created = You created this group\r?$/m.test(rd('Spixi/Resources/Raw/lang/en-us.txt'));
    ok(/CoreStreamProcessor\.sendSpixiMessage\(g, cgm\);\s*writeCreatedGroupLine\(g\);/.test(hps)
      && /if \(!S9FixRules\.writesCreatedLine\(true, stored\?\.Count \?\? -1, group\.metaData\.lastMessage != null\)\)\s*\{\s*return;\s*\}/.test(w)
      && /string text = S9FixRules\.createdLine\(SpixiLocalization\._SL\(S9FixRules\.CreatedKey\), SpixiLocalization\._SL\(S9FixRules\.MembersSeeKey\)\);/.test(w)   // ★ S10 P3 (#1254): the two-line form
      && /Node\.addMessageWithType\(new byte\[\] \{ UnreadRule\.AddedToGroupLineId \}, FriendMessageType\.standard, group\.walletAddress, 0, text, false, null, 0, false, false\);/.test(w)
      && before(w, 'S9FixRules.writesCreatedLine(', 'Node.addMessageWithType(') && !/string\.Format/.test(w) && logsFixed(w)
      && langs.length === 13 && keyed.length === 13 && en,
      'S9 A3 GRP-ADD: createGroup → the owner\'s OWN {7} line (id 07: no unread / notification / receipt; no format; only into an empty new group) so the chats list shows the group — key chat-group-you-created in all 13 lang files (' + keyed.length + '/' + langs.length + ', en=' + en + ')');
  });

  /* ———— APP: Join marks the newest INCOMING invite row (SAppJoins), the card reads Joined after the page closes ———— */
  await guard('S9 A3 APP joined', async () => {
    const j = bodyOf(SCP, 'public void onJoinApp(string app_id)');
    const m = bodyOf(SCP, 'private FriendMessage? findJoinRow(string? app_id)') + bodyOf(SCP, 'private FriendMessage? markJoined(FriendMessage? row)');
    const wch = bodyOf(SCP, 'private void watchAppPageClose(MiniAppPage? page, FriendMessage? row)');
    const ins = SCP.slice(SCP.indexOf('if (message.type == FriendMessageType.appSession)'), SCP.indexOf('push(batch, "addAppRequest"'));
    /* #46 r1 (MINOR-2): "Open again" (the row is already joined) reopens — no accept, no mark; the desktop page is found by
       ITS session; the close watcher stays through a covering page and leaves once the page left MiniAppManager */
    ok(/^\{\s*FriendMessage\? joinRow = findJoinRow\(app_id\);\s*bool reopen = S9FixRules\.joinIsReopen\(joinRow\?\.id != null, joinRow\?\.id != null && SAppJoins\.has\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(joinRow!\.id!\)\)\);\s*FriendMessage\? joinedRow = joinRow;\s*if \(!reopen\)\s*\{\s*sendJoinAccept\(app_id\);\s*joinedRow = markJoined\(joinRow\);\s*\}/.test(j)
      && count(j, /sendJoinAccept\(/g) === 1 && count(j, /markJoined\(/g) === 1
      && /byte\[\] session = homePage\.onJoinApp\(app_id, friend\);\s*watchAppPageClose\(Node\.MiniAppManager\.getAppPage\(friend\.walletAddress, session\), joinedRow\);\s*refreshAppRow\(joinedRow, selectedChannel\);\s*return;/.test(j)
      && /Node\.MiniAppManager\.addAppPage\(miniAppPage\);\s*watchAppPageClose\(miniAppPage, joinedRow\);\s*refreshAppRow\(joinedRow, selectedChannel\);/.test(j)
      && /if \(friend == null \|\| friend\.bot \|\| string\.IsNullOrEmpty\(app_id\)\)/.test(m)
      && /return rows\.FindLast\(m => m\.id != null && S9FixRules\.marksJoin\(m\.type == FriendMessageType\.appSession, m\.localSender, AppInviteRules\.appIdOf\(m\.message\), app_id\)\);/.test(m)
      && /SAppJoins\.add\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(row\.id\)\)/.test(m) && logsFixed(m)
      && /bool closed = page\.sessionId == null \|\| Node\.MiniAppManager\.getAppPage\(friend\.walletAddress, page\.sessionId\) != page;\s*if \(closed\)\s*\{\s*page\.Disappearing -= handler;\s*\}\s*if \(!isDisposed\)\s*\{\s*refreshAppRow\(row, selectedChannel\);/.test(wch) && /page\.Disappearing \+= handler;/.test(wch)
      && /app_state = S9FixRules\.appState\(app_state == "Missing", app_state == "Minimized",\s*rowHex\.Length > 0 && SAppJoins\.has\(peerKey, rowHex\),\s*rowHex\.Length > 0 && SAppDeclines\.has\(peerKey, rowHex\)\);/.test(ins),
      'S9 A3 APP: Join stores the newest INCOMING invite row of that app as joined (S9FixRules.marksJoin: never my own invite, never the call app), re-pushes it now and once more when the mini-app page leaves the screen; the push reads S9FixRules.appState (Declined > Missing > Minimized > Joined > invite)');
  });

  /* ———— FACE: the played flag is stored on C#'s own `playing` of a RECEIVED clip the user tapped; pushed as arg 18 / 13 ———— */
  await guard('S9 A3 FACE played', async () => {
    const pv = bodyOf(SCP, 'public void pushVoiceState(string idHex, string state, int posMs, int durMs)');
    const play = bodyOf(SCP, 'private void onVoicePlay(string idHex)');
    const note = bodyOf(SCP, 'private void noteVoicePlayCandidate(string ownHex, bool localSender)');
    const store = bodyOf(SCP, 'private void storeVoicePlayed(string idHex)');
    const arg = bodyOf(SCP, 'private string voicePlayedArg(FriendMessage message, string voiceArg)');
    const upd = bodyOf(SCP, 'public void updateMessage(FriendMessage message, int channel)');
    ok(/^\{\s*if \(state == "playing"\)\s*\{\s*storeVoicePlayed\(idHex\);\s*\}/.test(pv)
      && /clearPendingVoicePlay\(ownHex\);\s*noteVoicePlayCandidate\(ownHex, fm\.localSender\);/.test(play) && !/noteVoicePlayCandidate\(idHex/.test(play)
      && /if \(localSender \|\| string\.IsNullOrEmpty\(ownHex\)\)\s*\{\s*return;\s*\}/.test(note)
      && /candidate = voicePlayCandidates\.Remove\(idHex\);/.test(store) && /if \(candidate && friend != null && SVoicePlayed\.add\(friend\.walletAddress\.ToString\(\), idHex\)\)/.test(store) && logsFixed(store)
      && /SVoicePlayed\.has\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(message\.id\)\)/.test(arg) && /return S9FixRules\.playedArg\(isVoice, message\.localSender, stored\);/.test(arg)
      && /string rowPlayed = voicePlayedArg\(message, rowVoice\);\s*push\(batch, prefix,[^;]*quoteText, rowVoice, rowPlayed\);/.test(SCP)
      && /"updateMessage",[^;]*quoteText, voice, voicePlayedArg\(message, voice\)\);/.test(upd),
      'S9 A3 FACE: `ixian:voiceplay` notes a RECEIVED clip (C#\'s own hex), C#\'s `playing` push stores it (SVoicePlayed) — no new verb; addMe / addThem arg 18 and updateMessage arg 13 carry `played` (S9FixRules.playedArg: no flag = "0")');
  });

  /* ———— A-7: a tip is a COUNT — no amount is summed into the 4th addReactions arg ———— */
  await guard('S9 A3 A-7 tip count', async () => {
    const ur = bodyOf(SCP, 'private void updateReactions(FriendMessage fm, UiBatch? batch)');
    ok(ur.length > 200 && !/IxiNumber/.test(ur) && !/\brd\.data\b/.test(ur) && count(ur, /\btip_total_str\s*=/g) === 1 && /string tip_total_str = "";/.test(ur)
      && /reactions_str \+= reaction\.Key \+ ":" \+ reaction\.Value\.Count\(\) \+ ";";/.test(ur),
      'S9 A3 A-7: updateReactions reads no tip amount (the tippers\' claims) — the `tip:<n>;` count token is the whole tip; arg 4 stays in place, always ""');
  });

  /* ———— #1179 (a): the desktop pane beside the chat follows a switch — no close, a no-motion swap, the chat-close guard ———— */
  await guard('S9 A3 info pane follows', async () => {
    const oc = bodyOf(HOME, 'public void onChat(Address friend_address, WebNavigatingEventArgs? ev)');
    const keep = bodyOf(HOME, 'private bool keepInfoPaneForSwitch(Friend target)');
    const fol = bodyOf(HOME, 'private void followInfoPane(SingleChatPage presentedChat)');
    const mot = bodyOf(HOME, 'public override ColumnMotion overlayColumnMotion(SpixiContentPage overlay, bool entering, out double paneWidth)');
    const ovc = HOME.slice(HOME.indexOf('else if (overlay is SingleChatPage)', HOME.indexOf('public override void onOverlayClosed(SpixiContentPage overlay)')));
    const ovp = bodyOf(HOME, 'public override void onOverlayPresented(SpixiContentPage overlay)');
    ok(/if \(!keepInfoPaneForSwitch\(friend\)\)\s*\{\s*closeContactDetailsOverlays\(\);\s*\}/.test(oc) && count(oc, /closeContactDetailsOverlays\(\)/g) === 1
      && /if \(!S9FixRules\.infoPaneFollowsChat\(isDesktopPlatform\(\), rightContent\.IsVisible, paneBeside\)\)/.test(keep)
      && /ContactDetails\? beside = infoPaneCol2Open \? infoPaneCol2Page : null;/.test(keep)
      && /if \(infoPaneFollow\.closesPanesOnChatClose\(followChatOpen\)\)\s*\{\s*endInfoPaneFollow\(\);\s*closeContactDetailsOverlays\(\);\s*\}/.test(ovc.slice(0, 3000))
      /* #46 r1 (MAJOR-1): the follow is consumed at pane B's PRESENT, never at chat B's present (the sequence: csh S9FixTests) */
      && /if \(!infoPaneFollow\.onChatPresented\(follow\)\)\s*\{\s*return;\s*\}/.test(fol) && !/infoPaneFollow\.end\(\)|endInfoPaneFollow\(\);\s*\}?\s*infoPaneCol2Pending = true/.test(fol)
      && /if \(infoPaneFollow\.onPanePresented\(cd\.friendAddressString\(\)\)\)/.test(ovp)
      && /followInfoPane\(presentedChat\);\s*return;/.test(ovp)
      && /infoPaneCol2Pending = true;\s*infoPaneSwapNoMotion = true;\s*pushPageLoaded\(new ContactDetails\(presentedChat\.friend, true, "2", true\), 4000, "chatinfo", -1,/.test(fol)
      && /revealDelayMs: 0, slideIn: false\);/.test(fol)
      && /if \(infoPaneSwapNoMotion\)\s*\{\s*return ColumnMotion\.None;\s*\}/.test(mot)
      && /infoPaneCol2Pending = false;\s*infoPaneSwapNoMotion = false;/.test(ovp),
      'S9 A3 #1179 (a): on desktop (wide) the info pane beside the chat is kept on a switch; the new chat\'s present stages the new peer\'s pane (its own WebView) in col 2 with no slide and no column motion, and the old chat\'s close does not close it mid-swap');
  });

  /* ———— #1173 (8): every Downloads entry uses the one constructor; desktop = a centred dialog over a native scrim ———— */
  await guard('S9 A3 downloads dialog', async () => {
    const ctor = bodyOf(DL, 'public DownloadsPage(string? highlight = null, bool dialog = false)');
    const create = bodyOf(DL, 'public static DownloadsPage create(string? highlight = null)');
    const wrap = bodyOf(DL, 'private void wrapAsDialog()');
    const load = bodyOf(DL, 'private void onLoad()');
    const stageAt = SCB.indexOf('ContentView stage = new ContentView', SCB.indexOf('public void pushPageLoaded(SpixiContentPage target'));
    const stage = SCB.slice(stageAt, SCB.indexOf('};', stageAt));
    const surf = bodyOf(SCB, 'internal void applyPageSurfaceColor()');
    const all = [CD, SET, HOME].map((t) => count(t, /new DownloadsPage\(/g)).reduce((a, b) => a + b, 0);
    ok(/pushPageLoaded\(DownloadsPage\.create\(name\)\);/.test(CD) && /pushPageLoaded\(DownloadsPage\.create\(\)\);/.test(SET) && /pushPageLoaded\(DownloadsPage\.create\(\)\);/.test(HOME) && all === 0
      && /DeviceInfo\.Platform == DevicePlatform\.WinUI \|\| DeviceInfo\.Platform == DevicePlatform\.MacCatalyst/.test(create) && /S9FixRules\.downloadsDialog\(desktop\)/.test(create)
      && before(ctor, 'loadPage(webView, "downloads.html");', 'wrapAsDialog();')
      && /internal override bool ownsStageGround\s*\{\s*get \{ return dialogMode; \}\s*\}/.test(DL)
      && /tap\.Tapped \+= \(s, e\) => onBack\(\);/.test(wrap) && /HorizontalOptions = LayoutOptions\.Center,\s*VerticalOptions = LayoutOptions\.Center,\s*Content = inner,/.test(wrap)
      && /S9FixRules\.dialogSize\(root\.Width, root\.Height, out double w, out double h\);/.test(DL)
      && /if \(dialogMode\)\s*\{\s*Utils\.sendUiCommand\(this, "setPresentation", "dialog"\);\s*\}\s*loadFiles\(\);/.test(load)
      && /BackgroundColor = target\.ownsStageGround \? Colors\.Transparent : target\.pageSurfaceColor,/.test(stage)
      && /if \(Content != null && !ownsStageGround\)/.test(surf) && /internal virtual bool ownsStageGround\s*\{\s*get \{ return false; \}\s*\}/.test(SCB),
      'S9 A3 #1173 (8): chat info / Account / Home open Downloads through DownloadsPage.create — desktop = a card ≤ 600 × 640 centred over a native scrim (the stage transparent, the WebView card-sized — the CallPage Windows model), click-out → back, `setPresentation(\'dialog\')` pushed on load; phones keep the full page');
  });

  /* ———— D-04: `ixian:haptic:<kind>` — our shells only, foreground only, exact kinds, no permission ———— */
  await guard('S9 A3 haptic verb', async () => {
    const g = bodyOf(SCB, 'protected bool onNavigatingGlobal(string url)');
    const ph = bodyOf(SCB, 'private static void performHaptic(S9FixRules.Haptic kind, string? word)');
    const man = rd('Spixi/Platforms/Android/AndroidManifest.xml');
    ok(/else if \(url\.StartsWith\("ixian:haptic:", StringComparison\.Ordinal\)\)\s*\{\s*if \(hasGeneratedContent && App\.isInForeground\)\s*\{\s*string hapticArg = url\.Substring\("ixian:haptic:"\.Length\);\s*performHaptic\(S9FixRules\.hapticKind\(hapticArg\), S10MediaRules\.hapticWord\(hapticArg\)\);\s*\}\s*\}/.test(g)
      && /if \(kind == S9FixRules\.Haptic\.None \|\| word == null\)\s*\{\s*return;\s*\}/.test(ph)
      && /#if ANDROID\s*performHapticAndroid\(kind, word\);/.test(ph)
      && /#elif IOS\s*Microsoft\.Maui\.Devices\.HapticFeedback\.Default\.Perform\(/.test(ph) && !/WINDOWS|MACCATALYST/.test(ph)
      && (man.match(/android\.permission\.VIBRATE/g) || []).length === 1,   /* ★ S10 F4 re-base (#1254): the Vibrator fallback needs VIBRATE, declared once (behaviour: pins-s10/a-wiring.mjs) */
      'S9 A3 D-04: ixian:haptic is answered for our own shells only (not a mini-app), in the foreground, for click / long / success only; Android uses the view\'s own haptic (S10: + the Vibrator fallback when refused, VIBRATE declared), iOS MAUI HapticFeedback, desktop nothing');
  });

  /* ———— #1246: the report link — a CODE in, C#\'s own mailto out, through the one gate (MailCompose) ———— */
  await guard('S9 A3 report translation', async () => {
    const sb = SET.slice(SET.indexOf('else if (current_url.StartsWith("ixian:reportTranslation:", StringComparison.Ordinal))'), SET.indexOf('else if (current_url.StartsWith("ixian:openLink:", StringComparison.Ordinal))'));
    const lb = bodyOf(LAUNCH, 'else if (verb.StartsWith("ixian:reportTranslation:", StringComparison.Ordinal))');
    const fn = bodyOf(UT, 'public static bool openTranslationReport(string? langCode)');
    ok(sb.length > 0 && /^else if \(current_url\.StartsWith\("ixian:reportTranslation:", StringComparison\.Ordinal\)\)\s*\{\s*Utils\.openTranslationReport\(current_url\.Substring\("ixian:reportTranslation:"\.Length\)\);\s*\}\s*$/.test(sb.trim())
      && /^\{\s*Utils\.openTranslationReport\(verb\.Substring\("ixian:reportTranslation:"\.Length\)\);\s*\}$/.test(lb.trim())
      && /string\? url = S9FixRules\.translationReportMailto\(langCode, SPIXI\.Lang\.SpixiLocalization\.getLanguageCodes\(\)\);/.test(fn)
      && /if \(url == null\)\s*\{\s*Logging\.warn\("reportTranslation: the language code was refused"\);\s*return false;\s*\}\s*return openExternal\(url, ExternalTarget\.MailCompose\);/.test(fn)
      && count(fn, /openExternal\(/g) === 1 && logsFixed(fn),
      'S9 A3 #1246: ixian:reportTranslation (Settings + Launch) carries a language code only; C# checks it against the app\'s languages and builds mailto:support@spixi.io with the fixed subject itself, opened through Utils.openExternal(…, MailCompose) — no WebView URL is opened');
  });

  /* ———— the two stores leave with a contact / its history / the account, beside every SAppDeclines site ———— */
  await guard('S9 A3 store clears', async () => {
    const files = ['Spixi/Utils/SContacts.cs', 'Spixi/Utils/SpixiContentPage.cs', 'Spixi/Pages/Contacts/ContactDetails.xaml.cs', 'Spixi/Pages/Contacts/ContactNewPage.xaml.cs',
      'Spixi/Pages/Settings/SettingsPage.xaml.cs', 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Pages/Home/HomePage.xaml.cs', 'Spixi/Network/StreamProcessor.cs'];
    let decl = 0, paired = 0, all = 0, allPaired = 0;
    for (const f of files) {
      const t = stripCode(rd(f));
      for (const m of t.matchAll(/SAppDeclines\.clear\(([^;]*)\);/g)) {
        decl++;
        const next = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
        const a = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        /* ★ A3 fix r1: the three S9 per-peer stores are forgotten in ONE call (SPeerLocalStores.forget) — keeps the P0 #1155 removal window */
        if (new RegExp('^\\s*SPeerLocalStores\\.forget\\(' + a + '\\);').test(next)) paired++;
      }
      for (const m of t.matchAll(/SAppDeclines\.clearAll\(\);/g)) {
        all++;
        /* the NEXT line (stripCode keeps the line breaks) — a window would reach the next wipe method's pair */
        const eol = t.indexOf('\n', m.index);
        const nextLine = eol < 0 ? '' : t.slice(eol + 1, t.indexOf('\n', eol + 1) < 0 ? t.length : t.indexOf('\n', eol + 1));
        if (/SAppJoins\.clearAll\(\); SVoicePlayed\.clearAll\(\);/.test(nextLine)) allPaired++;
      }
    }
    const fg = bodyOf(stripCode(rd('Spixi/Meta/SPeerLocalStores.cs')), 'public static void forget(string? peer)');
    const fgOk = /^\{\s*SAppJoins\.clear\(peer\);\s*SVoicePlayed\.clear\(peer\);\s*SPhotoGroups\.clear\(peer\);\s*\}$/.test(fg);
    ok(decl >= 7 && paired === decl && all >= 3 && allPaired === all && fgOk,
      'S9 A3 stores: every SAppDeclines.clear site also forgets that peer in SAppJoins + SVoicePlayed + SPhotoGroups through SPeerLocalStores.forget (' + paired + '/' + decl + ', forget=' + fgOk + '), every clearAll site wipes them (' + allPaired + '/' + all + ')');
  });

  /* ———— r1 SILENT REACTIONS (Damir): every reaction we send goes out with the push flag OFF ———— */
  await guard('S9 A3 r1 silent reactions', async () => {
    const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
      e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
    const coreCalls = walk('Spixi').filter((f) => /\.sendReaction\s*\(/.test(stripCode(rd(f))));
    const sr = bodyOf(SCP, 'private static void sendSilentReaction(Friend friend, byte[] msg_id, string reaction, int channel)');
    const like = SCP.slice(SCP.indexOf('case "like":'));
    ok(coreCalls.length === 0
      && /SpixiMessage spixi_message = new SpixiMessage\(SpixiMessageCode\.msgReaction, new ReactionMessage\(msg_id, reaction\)\.getBytes\(\), channel\);\s*StreamProcessor\.sendSpixiMessage\(friend, spixi_message, null, null, true, true, false, false\);/.test(sr)
      && /sendSilentReaction\(friend, msg_id, wire, selectedChannel\);/.test(like) && /sendSilentReaction\(friend, msgIdForTip, tipToken, channelForTip\);/.test(SCP)
      && count(SCP, /sendSilentReaction\(/g) === 3,
      'S9 A3 r1 silent reactions: no Spixi file calls Core\'s push-TRUE sendReaction (' + (coreCalls.join(', ') || 'none') + '); the like and the tip send the SAME msgReaction through sendSpixiMessage(…, true, true, false, false) — pending + server copy, push OFF (the #1128 sendSilentMsgDelete pattern)');
  });

  /* ———— r1 A-FLASH C2 (#1205): the chat's NATIVE WebView base never changes around the hold ———— */
  await guard('S9 A3 r1 hold keeps the chat base', async () => {
    const surf = bodyOf(SCB, 'internal void applyPageSurfaceColor()');
    const grounds = bodyOf(SCB, 'private static void setHoldGrounds(PreloadOp op, Android.Webkit.WebView? native, bool held)');
    const hold = bodyOf(SCB, 'private static void holdStageUntilDrawn(PreloadOp op)');
    ok(/private bool keepsNativeWebViewTransparent\s*\{\s*get \{ return this is SingleChatPage; \}\s*\}/.test(SCB)
      && /if \(nativeWebView != null && !keepsNativeWebViewTransparent\)\s*\{\s*nativeWebView\.SetBackgroundColor\(/.test(surf)
      && /if \(native != null && !op\.target\.keepsNativeWebViewTransparent\)\s*\{\s*native\.SetBackgroundColor\(/.test(grounds)
      && /op\.stage\.BackgroundColor = ground;\s*op\.targetContent\.BackgroundColor = ground;/.test(grounds)
      && count(SCB, /\.SetBackgroundColor\(/g) === 2
      && /P1Perf\.line\("hold release bg=" \+ \(held\.target\.keepsNativeWebViewTransparent \|\| heldView == null \? "kept" : "set"\)\);/.test(hold),
      'S9 A3 r1 A-FLASH C2: SingleChatPage keeps its native WebView base transparent (the renderer\'s AND-19 value) — neither the surface pass nor the hold start / release sets it (a base-colour change = a Chromium re-raster = the grey frame); the MAUI grounds still move; [P1] hold release bg=kept|set');
  });

  /* ———— r1 A-FLASH C1 (#1205): the first draw waits for home's boot cover (ixian:bootDropped), capped, once ———— */
  await guard('S9 A3 r1 boot hold', async () => {
    const MA = stripCode(rd('Spixi/Platforms/Android/MainActivity.cs'));
    const APP = stripCode(rd('Spixi/App.xaml.cs'));
    const start = bodyOf(MA, 'private void startBootHold(View? rootView)');
    const oc = bodyOf(MA, 'protected override void OnCreate(Bundle? bundle)');
    const rel = bodyOf(MA, 'public void release(string why)');
    ok(/private const int BootHoldCapMs = 1500;/.test(MA)
      && /if \(bootHoldUsed \|\| rootView == null \|\| !global::Spixi\.App\.homeIsBootRoot\)\s*\{\s*return;\s*\}\s*bootHoldUsed = true;/.test(start)
      /* #46 r1 (MINOR-4): a NATIVE cover on the decor view (the window splash drawable), the content keeps drawing under it — no pre-draw block */
      /* #46 r2 (M1): API 31+ = the SYSTEM splash's background colour only (from the theme); below 31 = the layer-list window splash */
      && /if \(OperatingSystem\.IsAndroidVersionAtLeast\(31\)\)\s*\{\s*cover\.SetBackgroundColor\(splashBackgroundColor\(\)\);\s*\}\s*else\s*\{\s*Android\.Graphics\.Drawables\.Drawable\? ground = null;\s*try \{ ground = ContextCompat\.GetDrawable\(this, Resource\.Layout\.splash_screen\); \} catch \(Exception\) \{ \}\s*if \(ground != null\)\s*\{\s*cover\.Background = ground;/.test(start)
      && /Theme\.ResolveAttribute\(Android\.Resource\.Attribute\.WindowSplashScreenBackground, tv, true\)/.test(bodyOf(MA, 'private Android.Graphics.Color splashBackgroundColor()'))
      && !/spixi_splash_icon|Resource\.Drawable\.splash/.test(start)
      /* #46 r2 (n1): the deferred store write lands on sleep (every platform) */
      && ((sl) => /IxianHandler\.localStorage\?\.flush\(\);\s*try \{ SPIXI\.Meta\.SLocalOnlyStore\.flush\(\); \} catch \(Exception\) \{ \}\s*Node\.pause\(\);/.test(sl)
          && before(sl, 'SpixiContentPage.showPrivacyShield();', 'SLocalOnlyStore.flush()') && count(sl, /SLocalOnlyStore\.flush\(/g) === 1)(bodyOf(APP, 'protected override void OnSleep()'))   /* #46 r3: after the #438 shield, right before Node.pause */
      && /decor\.AddView\(cover, new ViewGroup\.LayoutParams\(ViewGroup\.LayoutParams\.MatchParent, ViewGroup\.LayoutParams\.MatchParent\)\);\s*cover\.BringToFront\(\);\s*bootHold = new BootCover\(decor, cover\);\s*new Handler\(Looper\.MainLooper!\)\.PostDelayed\(\(\) => releaseBootHold\("cap"\), BootHoldCapMs\);/.test(start)
      && !/OnPreDraw|PreDrawListener/.test(MA)
      && /released = true;\s*try\s*\{\s*parent\.RemoveView\(cover\);/.test(rel) && /"boot hold ms=" \+ \(System\.Environment\.TickCount64 - t0\) \+ " why=" \+ why/.test(rel)
      && /startBootHold\(rootView\);/.test(oc)
      && count(APP, /homeIsBootRoot = true;/g) === 1 && /homeIsBootRoot = true;\s*MainPage = new NavigationPage\(HomePage\.Instance\(\)\);/.test(APP)
      && /if \(current_url\.Equals\("ixian:bootDropped", StringComparison\.Ordinal\)\)\s*\{\s*#if ANDROID\s*global::Spixi\.MainActivity\.releaseBootHold\("dropped"\);\s*#endif\s*scheduleWalletPrePush\(false\);\s*\}/.test(HOME),   // ★ S10 F6 (#1254): + the wallet pre-push (pins-s10/b-wiring)
      'S9 A3 r1 A-FLASH C1: on a cold start straight into home (no lock / first run / retry), Android covers the drawing content with a native splash view until home.html (cover removed) sends ixian:bootDropped, capped at 1500 ms, once per process; [P1] boot hold ms= why=dropped|cap');
  });

  /* ———— #46 r1 MINOR-3: the three per-peer stores live in the backup-excluded file, written deferred ———— */
  await guard('S9 A3 r1 local-only stores', async () => {
    const files = ['Spixi/Meta/SAppJoins.cs', 'Spixi/Meta/SVoicePlayed.cs', 'Spixi/Meta/SPhotoGroups.cs'].map((f) => stripCode(rd(f)));
    const LO = stripCode(rd('Spixi/Meta/SLocalOnlyStore.cs'));
    const sd = bodyOf(LO, 'public static void setDeferred(string key, string? value)');
    const ca = bodyOf(LO, 'public static void clearAll()');
    const fl = bodyOf(LO, 'private static void flushIfDirty(int g)');
    ok(files.every((t) => !/Preferences\.Default\.(Set|Get)\(/.test(t) && /parse\(SLocalOnlyStore\.getMigrating\(KEY\)\)/.test(t)
        && /private static void persist\(List<string> l\)\s*\{\s*SLocalOnlyStore\.setDeferred\(KEY, (SAppDeclines\.)?serialize\(l, CAP\)\);\s*\}/.test(t)
        && count(t, /persist\(/g) >= 2 && /SLocalOnlyStore\.setDeferred\(KEY, null\);/.test(t))
      && /System\.Threading\.Tasks\.Task\.Run\(async \(\) =>\s*\{\s*await System\.Threading\.Tasks\.Task\.Delay\(DeferMs\)\.ConfigureAwait\(false\);\s*flushIfDirty\(g\);/.test(sd)
      && /if \(flushScheduled\) return;/.test(sd) && /generation\+\+;/.test(ca) && /if \(g != generation \|\| !dirty\) return;/.test(fl),
      'S9 A3 r1 local-only stores: SAppJoins / SVoicePlayed / SPhotoGroups read through SLocalOnlyStore.getMigrating (one move out of Preferences) and write through setDeferred — one coalesced background write, dropped after a wipe (behaviour: csh S9FixTests / S9MediaTests)');
  });

  /* ———— #46 r1 MAJOR-2: a mailto goes to the system launcher (iOS / Mac's in-app browser opens http(s) only) ———— */
  await guard('S9 A3 r1 mail sink', async () => {
    const g = bodyOf(UT, 'public static bool openExternal(string? url, ExternalTarget kind)');
    ok(/\(kind == ExternalTarget\.MailCompose \? Launcher\.Default\.OpenAsync\(target\) : Browser\.Default\.OpenAsync\(target\)\)\.ContinueWith\(/.test(g)
      && /return openExternal\(url, ExternalTarget\.MailCompose\);/.test(bodyOf(UT, 'public static bool openTranslationReport(string? langCode)'))
      && /Utils\.openExternal\(action_url, Utils\.ExternalTarget\.MailCompose\);/.test(HOME),
      'S9 A3 r1 mail sink: the report link and the rating prompt\'s mail (MailCompose) open through Launcher.Default.OpenAsync, a web link through Browser — inside the ONE gate');
  });

  /* ———— the harness compiles the three files and runs S9FixTests ———— */
  await guard('S9 A3 csh', async () => {
    const proj = rd('scripts/csh/csh.csproj');
    const t = stripCode(rd('scripts/csh/S9FixTests.cs'));
    ok(['Spixi/Utils/S9FixRules.cs', 'Spixi/Meta/SAppJoins.cs', 'Spixi/Meta/SVoicePlayed.cs'].every((f) => proj.includes('<Compile Include="../../' + f + '" />'))
      && count(t, /\[TestMethod\]/g) >= 10 && /translationReportMailto/.test(t) && /playedArg/.test(t) && /appState/.test(t),
      'S9 A3 csh: S9FixRules + SAppJoins + SVoicePlayed are compiled by the C# harness and executed by S9FixTests (run: node scripts/run-csh.mjs)');
  });
}
