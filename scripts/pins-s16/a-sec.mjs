/* ==== S16 agent a-sec — the security batch (#1320 flags F1 · F2 · F3/F4 · F5 · F8, #1313 MAJOR #9) + the #46 r1 fixes.
 *
 * The pure rules are EXECUTED in the C# harness (scripts/csh/S16SecTests.cs over Spixi/Utils/S16SecRules.cs: the change
 * legs, the unlock release, the 5 s staging bound, the WHOLE mic / clipboard gate combination, the card-exact decline rule,
 * the marker-keyed Android capture rule). This module pins the MAUI / Android-bound call sites (comment-stripped C#,
 * brace-matched bodies, source ORDER):
 *   F1 — LockPage `ixian:change`: the refusal is the branch's FIRST statement; only the confirm-Cancel leg is left (the
 *        cold-start leg went, r1 n6), the only (false) raise; performUnlock raises (true); the ctor stores appLockMode;
 *        the lock bridge sends the verb from Cancel only; App.onUnlock: the unlockReleases guard comes first;
 *   F2 — pushPageLoaded: the staging refusal (monotonic stamp, r1 n1) sits after the #230 check and before the supersede;
 *        isLockStaging answers the live op first; cancelPreload returns early for a modal LockPage op before tryFinish;
 *   F3/F4 — the gate helper passes each primitive by name (r1 M2: + no modal, + overlay host on top); it runs before
 *        startRecording / takeForSend / the clipboard read; a refusal answers the state as it is (r1 n4);
 *   F5 — onDeclineRequest: removeFriend only inside the card-predicate branch (r1 n5); the warn holds no verb literal;
 *   F8 — DownloadsPage + 2 SettingsPage twins log exception TYPES; mutechat = literals + verb.Length (operand allow-list);
 *   MAJOR #9 — Android OnPermissionRequest keys on the ClassId "scan" marker (ScanPage.xaml only; r1 M1), never the URL;
 *        r2: no C# ClassId assignment by any spelling, no ScanMarker outside the rule, ScanPage refuses file: on Android.
 * Deliberate breaks: each check was broken on purpose and failed for its own key (see the S16 a-sec r1 report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return { s: -1, e: -1, text: '' };
    const o = t.indexOf('{', at); if (o < 0) return { s: -1, e: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { s: o, e: k + 1, text: t.slice(o, k + 1) }; }
    return { s: -1, e: -1, text: '' };
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig)).text;
  const before = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const walk = (d, out = []) => {
    for (const n of readdirSync(join(root, d), { withFileTypes: true })) {
      if (n.name === 'obj' || n.name === 'bin') continue;
      const q = d + '/' + n.name;
      if (n.isDirectory()) walk(q, out); else if (n.name.endsWith('.cs')) out.push(q);
    }
    return out;
  };
  const RULES = rd('Spixi/Utils/S16SecRules.cs');

  /* ── F1: LockPage ixian:change ── */
  const LOCK = rd('Spixi/Pages/Launch/LockPage.xaml.cs');
  const chg = body(LOCK, 'else if (current_url.Equals("ixian:change", StringComparison.Ordinal))');
  const ctor = body(LOCK, 'public LockPage(bool justConfirm, bool appLock)');
  const perf = body(LOCK, 'private async void performUnlock()');
  const falseRaises = (LOCK.match(/new SPIXI\.EventArgs<bool>\(false\)/g) || []).length;
  const f1lock = {
    found: chg.length > 0 && ctor.length > 0 && perf.length > 0,
    first: /^\{\s*if \(S16SecRules\.changeLeg\(justConfirmAction, appLockMode\) == S16SecRules\.ChangeLeg\.Refuse\)\s*\{\s*Logging\.warn\("LockPage: ixian:change refused \(no Cancel on this lock\)"\);\s*return;\s*\}/.test(chg),
    beforeClosing: before(chg, 'S16SecRules.changeLeg(', 'lockClosing = true;') && before(chg, 'S16SecRules.changeLeg(', 'authSucceeded('),
    noUncancel: !/e\.Cancel = false/.test(chg),
    /* ★ #46 r1 (R1-n6): the cold-start leg is gone — the branch is the Cancel leg only, no LaunchPage, no other leg */
    cancelOnly: !/LaunchPage|removePage|justConfirmAction\)\s*\{/.test(chg.slice(chg.indexOf('return;'))) && /popOwnModal\("cancel"\);/.test(chg),
    rule: /return justConfirm && !appLock \? ChangeLeg\.Cancel : ChangeLeg\.Refuse;/.test(RULES) && /public enum ChangeLeg \{ Refuse, Cancel \}/.test(RULES)
      && !/ToLaunch/.test(RULES + LOCK),
    /* ★ #46 r1 (R4-6/7): the inputs and the two raises the guards depend on */
    ctorMode: /justConfirmAction = justConfirm;\s*appLockMode = appLock;/.test(ctor),
    unlockTrue: /if \(authSucceeded != null\)\s*\{\s*authSucceeded\(this, new SPIXI\.EventArgs<bool>\(true\)\);\s*\}/.test(perf),
    oneFalse: falseRaises === 1 && /authSucceeded\(this, new SPIXI\.EventArgs<bool>\(false\)\);/.test(chg),
  };
  ok(Object.values(f1lock).every(Boolean),
    '★ S16 F1 (#1320): LockPage refuses `ixian:change` on every lock with no Cancel (an APP lock, and since #46 r1 the cold-start lock — its LaunchPage leg has no sender) as the branch\'s FIRST statement, before `lockClosing = true` and authSucceeded(false); the only (false) raise in the file is that Cancel leg, performUnlock raises (true), and the ctor stores appLockMode — ' + JSON.stringify(f1lock));

  const LPJS = stripCode(raw('src/bridge/lock-page.js'));
  const f1shell = {
    noHatchVerb: !/onUseAnotherWallet/.test(LPJS),
    cancelKept: /onCancel\(\) \{ br\.send\('ixian:change'\); \}/.test(LPJS) && (LPJS.match(/ixian:change'/g) || []).length === 1,
  };
  ok(Object.values(f1shell).every(Boolean),
    '★ S16 F1 #46 r1 (R1-n6): the lock bridge sends `ixian:change` from confirm-mode Cancel only — the cold-start onUseAnotherWallet adapter is gone — ' + JSON.stringify(f1shell));

  const APP = rd('Spixi/App.xaml.cs');
  const unl = body(APP, 'public void onUnlock(object sender, EventArgs e)');
  const f1app = {
    found: unl.length > 0,
    guardFirst: /^\{\s*if \(!S16SecRules\.unlockReleases\(e\)\)\s*\{\s*Logging\.error\("[^"]*"\);\s*return;\s*\}/.test(unl),
    beforeRelease: before(unl, 'S16SecRules.unlockReleases(e)', 'isLockScreenActive = false;') && before(unl, 'S16SecRules.unlockReleases(e)', 'hidePrivacyShield()'),
    rule: /return e is EventArgs<bool> r && r\.Value;/.test(RULES),
  };
  ok(Object.values(f1app).every(Boolean),
    '★ S16 F1 (#1320): App.onUnlock releases the lock only on a TRUE authSucceeded — the unlockReleases guard (fixed-word error + return) runs before `isLockScreenActive = false` and the shield drop — ' + JSON.stringify(f1app));

  /* ── F2: no navigation over a STAGING lock ── */
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const ppl = body(SCP, 'public void pushPageLoaded(SpixiContentPage target');
  const REF = 'if (S16SecRules.overlayRefused(isLockStaging(), Environment.TickCount64 - lockPreloadPendingAt))';
  const refAt = ppl.indexOf(REF);
  const refBlock = blockFrom(ppl, refAt).text;
  const lockBody = blockFrom(ppl, ppl.indexOf('lock (preloadLock)'));
  const staging = body(SCP, 'public static bool isLockStaging()');
  const f2 = {
    found: ppl.length > 0 && refAt > 0 && staging.length > 0,
    afterInPlace: ppl.indexOf('if (modalOverlayOp != null)') >= 0 && ppl.indexOf('if (modalOverlayOp != null)') < refAt,
    beforeSupersede: refAt < ppl.indexOf('superseded = activePreload;') && refAt < ppl.indexOf('if (preloadPending || activePreload != null)'),
    insideLock: refAt > lockBody.s && refAt < lockBody.e,
    drops: /warmPending = false; warmClaimRequested = false;/.test(refBlock) && /Logging\.warn\("pushPageLoaded: lock staging - dropped " \+ target\.GetType\(\)\.Name\);/.test(refBlock)
      && /try \{ target\.Dispose\(\); \} catch \{ \}\s*return;\s*\}$/.test(refBlock),
    /* ★ #46 r1 (R1-n1): monotonic at every reader and the one writer */
    stamp: /lockPreloadPending = target is LockPage;\s*lockPreloadPendingAt = Environment\.TickCount64;/.test(body(SCP, 'public void pushModalLoaded(SpixiContentPage target'))
      && /private static long lockPreloadPendingAt = 0;/.test(SCP)
      && (SCP.match(/lockPreloadPendingAt/g) || []).length === 4 && !/DateTime[^;\n]*lockPreloadPendingAt|lockPreloadPendingAt[^;\n]*DateTime/.test(SCP),
    /* ★ #46 r1 (R4-5): isLockStaging's FIRST answer is the live staging op (the F2 refusal and the F3/F4 lock term read it) */
    stagingOp: /^\{\s*lock \(preloadLock\)\s*\{\s*PreloadOp\? op = activePreload;\s*if \(op != null && op\.modalMode && op\.target is LockPage\)\s*\{\s*return true;\s*\}/.test(staging)
      && /double age = \(Environment\.TickCount64 - lockPreloadPendingAt\) \/ 1000\.0;/.test(staging),
    rule: /return staging && stagingAgeMs < StagingRefuseMs;/.test(RULES) && /public const double StagingRefuseMs = 5000;/.test(RULES),
  };
  ok(Object.values(f2).every(Boolean),
    '★ S16 F2 (#1320): pushPageLoaded DROPS a navigation while a lock is STAGING (< 5 s from the lock\'s reservation, a MONOTONIC stamp) — inside the lock, after the #230 in-place check, BEFORE the supersede that would cancel the lock; the target disposed, the warm flags reset, a type-name warn; isLockStaging answers the live staging op first — ' + JSON.stringify(f2));

  const cp = body(SCP, 'private static void cancelPreload(PreloadOp op)');
  const f2b = {
    found: cp.length > 0,
    backstopFirst: /^\{\s*if \(op\.modalMode && op\.target is LockPage\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return;\s*\}/.test(cp),
    beforeFinish: before(cp, 'op.target is LockPage', 'op.tryFinish()'),
  };
  ok(Object.values(f2b).every(Boolean),
    '★ S16 F2 (#1320) backstop: cancelPreload never cancels a staging LOCK (modal LockPage op) — it returns before tryFinish, so the lock presents on its own path — ' + JSON.stringify(f2b));

  /* ── F3 / F4: the mic and the clipboard ── */
  const CHAT = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  const gate = body(CHAT, 'private string? mediaInputRefusal()');
  const asIs = body(CHAT, 'private void pushVoiceRecAsItIs()');
  const vrs = body(CHAT, 'private void onVoiceRecStart()');
  const vsd = body(CHAT, 'private void onVoiceSend()');
  const vRef = vrs.indexOf('string? why = mediaInputRefusal();');
  const sRef = vsd.indexOf('string? why = mediaInputRefusal();');
  const vBlock = blockFrom(vrs, vrs.indexOf('if (why != null)')).text;
  const sBlock = blockFrom(vsd, vsd.indexOf('if (why != null)')).text;
  const once = (b, name) => (b.match(new RegExp('\\b' + name + ' = ', 'g')) || []).length === 1 && !new RegExp('\\b' + name + ' (\\+|-|\\?\\?)?= (?!mediaInputRefusal\\(\\);)').test(b);
  let startCalls = 0, takeCalls = 0;
  for (const f of walk('Spixi')) { const t = rd(f); startCalls += (t.match(/VoiceClips\.startRecording\(/g) || []).length; takeCalls += (t.match(/VoiceClips\.takeForSend\(/g) || []).length; }
  /* ★ #46 r1 (R1-M2, R4-3): the helper hands EACH primitive to the rule by name; the rule holds the whole combination */
  /* ★ #46 r2 (m1): the WHOLE helper, anchored — each primitive's source expression, in order; a constant in any one fails */
  const GATE_BODY = /^\{\s*Microsoft\.Maui\.Controls\.INavigation\? rootNav = \(Microsoft\.Maui\.Controls\.Application\.Current\?\.MainPage as Microsoft\.Maui\.Controls\.NavigationPage\)\?\.Navigation;\s*return S16SecRules\.mediaInputRefusal\(\s*gateOn: SpixiFlags\.MediaInputGate,\s*foreground: App\.isInForeground,\s*appLock: Microsoft\.Maui\.Controls\.Application\.Current is App app && app\.isAppLockActive,\s*inPlaceLock: SpixiContentPage\.hasModalOverlay\(\),\s*lockStaging: SpixiContentPage\.isLockStaging\(\),\s*chatOnTop: isShownChat\(\),\s*infoCovers: SpixiContentPage\.getTopOverlay\(\) is ContactDetails cd && !\(homePage != null && homePage\.isInfoPaneBesideNow\(cd\)\),\s*viaOverlay: SpixiContentPage\.getTopOverlay\(\) != null,\s*hostIsNavTop: rootNav != null && rootNav\.NavigationStack\.LastOrDefault\(\) == SpixiContentPage\.getOverlayHost\(\),\s*modalOpen: rootNav == null \|\| rootNav\.ModalStack\.Count > 0\);\s*\}$/;
  /* the "chatOnTop" input is isShownChat (the 1 Hz tick's rule, pins-s7) — pinned WHOLE here too, anchored */
  const SHOWN = /^\{\s*SpixiContentPage\? top = SpixiContentPage\.getTopOverlay\(\);\s*if \(top != null\)\s*\{\s*return top == this \|\| \(top is ContactDetails && SpixiContentPage\.getOverlayPages\(\)\.Contains\(this\)\);\s*\}\s*Page\? navTop = Microsoft\.Maui\.Controls\.Application\.Current\?\.MainPage\?\.Navigation\.NavigationStack\.LastOrDefault\(\);\s*return navTop == this;\s*\}$/;
  const BESIDE = /^\{\s*return infoPaneCol2Open && ReferenceEquals\(cd, infoPaneCol2Page\);\s*\}$/;
  /* ★ #46 r3 (M1): the gate's "beside" also needs the right column SHOWN (a narrowed window stacks the pane over the chat) */
  const BESIDE_NOW = /^\{\s*return rightContent\.IsVisible && isInfoPaneBeside\(cd\);\s*\}$/;
  const f3 = {
    found: gate.length > 0 && vrs.length > 0 && vRef > 0 && vsd.length > 0 && sRef > 0 && asIs.length > 0,
    helper: GATE_BODY.test(gate) && SHOWN.test(body(CHAT, 'private bool isShownChat()')) && BESIDE.test(body(rd('Spixi/Pages/Home/HomePage.xaml.cs'), 'public bool isInfoPaneBeside(ContactDetails cd)'))
      && BESIDE_NOW.test(body(rd('Spixi/Pages/Home/HomePage.xaml.cs'), 'public bool isInfoPaneBesideNow(ContactDetails cd)')),
    ruleCombines: /if \(appLock \|\| inPlaceLock \|\| lockStaging\)\s*\{\s*return RefuseLocked;\s*\}/.test(RULES)
      && /if \(!chatOnTop \|\| infoCovers \|\| modalOpen \|\| \(viaOverlay && !hostIsNavTop\)\)\s*\{\s*return RefuseHidden;\s*\}/.test(RULES),
    beforeStart: vRef < vrs.indexOf('VoiceClips.startRecording(this)'),
    beforeTake: sRef < vsd.indexOf('VoiceClips.takeForSend(this)') && sRef < vsd.indexOf('voiceCapFor('),
    silentState: /Logging\.warn\("Voice: recording refused \(" \+ why \+ "\)"\);\s*pushVoiceRecAsItIs\(\);\s*return;\s*\}$/.test(vBlock)
      && /Logging\.warn\("Voice: send refused \(" \+ why \+ "\)"\);\s*pushVoiceRecAsItIs\(\);\s*return;\s*\}$/.test(sBlock),
    /* ★ #46 r1 (R1-n4): a chat that is recording answers `recording` */
    asIs: /^\{\s*int recNow = VoiceClips\.recordingMs\(this\);\s*if \(recNow >= 0\)\s*\{\s*pushVoiceRec\("recording", recNow\);\s*return;\s*\}\s*int keptNow = VoiceClips\.keptMs\(voiceChatKey\);\s*pushVoiceRec\(keptNow > 0 \? "stopped" : "idle", keptNow\);\s*\}$/.test(asIs),
    whyOnce: once(vrs, 'why') && once(vsd, 'why'),
    oneStart: startCalls === 1 && takeCalls === 1,
    lockStops: ['public void lockOnPause()', 'private bool presentAppLock(string cycleName)'].every((sig) => {
      const b = body(APP, sig);
      return /SPIXI\.VoIP\.VoiceClips\.interruptAll\("lock"\);/.test(b) && before(b, 'isLockScreenActive = true;', 'VoiceClips.interruptAll("lock")') && before(b, 'VoiceClips.interruptAll("lock")', 'new LockPage(true, true)');
    }),
    gateOffNull: /if \(!gateOn\)\s*\{\s*return null;\s*\}/.test(RULES),
  };
  ok(Object.values(f3).every(Boolean),
    '★ S16 F3 (#1320, Damir a1; #46 r1): `ixian:voicerec:start` AND `voicerec:send` ask the media gate (flag MediaInputGate: foreground · no lock — latched, in place or staging · this chat on top, no chat-info page covering it (r2: only the desktop col-2 pane is beside), no modal, and for an overlay chat its host on top of the navigation stack — the helper and isShownChat pinned whole — every primitive passed by name, combined in S16SecRules) BEFORE startRecording (its OS permission request) / takeForSend (the only calls); a refusal takes nothing and answers the state as it is (recording · stopped · idle); both app-lock present sites stop a running recording — ' + JSON.stringify(f3));

  const pick = body(CHAT, 'private async Task onPickPhotos(string route)');
  const pasteAt = pick.indexOf('else if (route == PhotoRules.RoutePaste)');
  const paste = blockFrom(pick, pasteAt).text;
  const pRef = paste.indexOf('string? pasteRefusal = mediaInputRefusal();');
  const pBlock = blockFrom(paste, paste.indexOf('if (pasteRefusal != null)')).text;
  let clipReads = 0;
  for (const f of walk('Spixi')) if (!/\/SClipboardImage\.cs$/.test(f)) clipReads += (rd(f).match(/SClipboardImage\.readAsync\(/g) || []).length;
  const f4 = {
    found: pasteAt > 0 && pRef > 0,
    beforeRead: pRef < paste.indexOf('SClipboardImage.readAsync('),
    beforeAwait: pRef < paste.indexOf('await '),
    silent: /^\{\s*Logging\.warn\("Media: paste refused \(" \+ pasteRefusal \+ "\)"\);\s*return;\s*\}$/.test(pBlock),
    refusalOnce: once(pick, 'pasteRefusal'),
    oneRead: clipReads === 1,
  };
  ok(Object.values(f4).every(Boolean),
    '★ S16 F4 (#1320, Damir a1): the paste route asks the same media gate BEFORE the clipboard read (and before its first await, still on the main thread); the refusal is assigned once; a refusal reads nothing and pushes nothing; it is the app\'s only clipboard-image read — ' + JSON.stringify(f4));

  /* ── F5: the home decline ── */
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const dec = body(HP, 'private void onDeclineRequest(string address)');
  const G5 = 'if (!S16SecRules.declineAllowed(friend.approved,';
  const gAt = dec.indexOf(G5);
  const refuseB = blockFrom(dec, gAt);
  const afterRefuse = dec.slice(refuseB.e);
  const elseB = /^\s*else\s*\{/.test(afterRefuse) ? blockFrom(dec, refuseB.e) : { s: -1, e: -1, text: '' };
  const rmCount = (dec.match(/FriendList\.removeFriend\(/g) || []).length;
  const CARD = /if \(!friend\.approved && lm != null && lm\.type == FriendMessageType\.requestAdd && !lm\.localSender\)/g;
  const f5 = {
    found: gAt > 0,
    afterPredicate: dec.indexOf('bool declinedIncoming = ') < gAt,
    /* ★ #46 r1 (R1-n5): the card's own predicate — the SAME three facts both card sites test */
    cardArgs: /var declineLast = friend\.metaData\.lastMessage;\s*if \(!S16SecRules\.declineAllowed\(friend\.approved,\s*declineLast != null && declineLast\.type == FriendMessageType\.requestAdd,\s*declineLast != null && declineLast\.localSender\)\)/.test(dec)
      && (HP.match(CARD) || []).length === 2,
    refusal: /Logging\.warn\("declineRequest refused: not an incoming request"\);\s*UIHelpers\.shouldRefreshContacts = true;/.test(refuseB.text)
      && !/removeFriend|SRequestIgnore|status = |"ixian:/.test(refuseB.text),
    removeGuarded: elseB.text.length > 0 && rmCount === 1 && /FriendList\.removeFriend\(friend\)/.test(elseB.text)
      && /bool listed = declinedIncoming && SRequestIgnore\.add\(declinedAddr\);/.test(elseB.text) && /forgetAddress\(declinedAddr\)/.test(elseB.text) && /status = "ok";/.test(elseB.text),
    rule: /return !approved && lastIsRequestAdd && !lastFromMe;/.test(RULES),
  };
  ok(Object.values(f5).every(Boolean),
    '★ S16 F5 (#1320; #46 r1): home `ixian:declineRequest:` removes exactly what the request CARD shows (not approved · their requestAdd last) — FriendList.removeFriend (and the ignore-list add on its own incoming test, the arrival forget, status "ok") run only inside the declineAllowed branch; a refusal warns with fixed words (no verb literal), re-flushes the list and leaves status "fail" — ' + JSON.stringify(f5));

  /* ── F8: type-only logs ── */
  const DL = rd('Spixi/Pages/Downloads/DownloadsPage.xaml.cs');
  const SET = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const dlLogs = [...DL.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
  const mute = blockFrom(HP, HP.indexOf('else if (current_url.StartsWith("ixian:mutechat:", StringComparison.Ordinal))')).text;
  const muteWarn = ((mute.match(/Logging\.warn\(("ixian:mutechat: unrecognised state[^;]*)\);/) || [])[1]) || '';
  /* ★ #46 r1 (R4-10): an operand ALLOW-list — string literals and `verb.Length` only */
  const operands = muteWarn.split(/\s*\+\s*/).map((o) => o.trim());
  const f8 = {
    found: dlLogs.length > 0 && muteWarn.length > 0,
    noWholeEx: dlLogs.every((a) => !/\+ (ex|e)\s*$/.test(a.trim()) && !/\+ (ex|e)\.(Message|ToString\(\))/.test(a)),
    threeTypes: ['opening a download', 'deleting a download', 'unescape a download file name'].every((w) => dlLogs.some((a) => a.includes(w) && /\+ ex\.GetType\(\)\.Name$/.test(a.trim()))),
    muteLen: operands.length === 3 && operands.every((o) => /^"[^"]*"$/.test(o) || o === 'verb.Length') && operands.includes('verb.Length'),
    /* ★ #46 r1 (R1-n3): the two Settings twins */
    settings: /Logging\.error\("wipe: downloads threw: " \+ ex\.GetType\(\)\.Name\);/.test(SET) && /Logging\.warn\("Could not unescape a download file name: " \+ ex\.GetType\(\)\.Name\);/.test(SET)
      && !/"wipe: downloads threw: " \+ ex\)|"Could not unescape a download file name: " \+ ex\)/.test(SET),
  };
  ok(Object.values(f8).every(Boolean),
    '★ S16 F8 (#1320): DownloadsPage + the two SettingsPage twins log exception TYPES only (open / delete / unescape / the wipe — the message can carry the peer file name or path); the mutechat warn is literals + verb.Length only, never the token — ' + JSON.stringify(f8));

  /* ── MAJOR #9: the Android capture grant ── */
  const WVR = rd('Spixi/Platforms/Android/WebViewRenderer.cs');
  const opr = body(WVR, 'public override void OnPermissionRequest(PermissionRequest? request)');
  const crAt = opr.indexOf('refusal = SPIXI.S16SecRules.captureRefusal(element != null, element?.ClassId, request.GetResources(), request.Origin?.Scheme, element != null && SPIXI.ScanPage.isScanWebView(element));');
  /* ★ #46 r4 (m1): the identity registry — ONE assignment, in ScanPage's constructor, of its own webView, right after InitializeComponent */
  const SCANCS0 = rd('Spixi/Pages/Scan/ScanPage.xaml.cs');
  let regAll = 0, tokScan = 0, tokElse = 0; for (const f of walk('Spixi')) { const t = stripCode(rd(f)); regAll += (t.match(/\bscanWebView\s*=(?!=)/g) || []).length; const k = (t.match(/\bscanWebView\b/g) || []).length; if (f === 'Spixi/Pages/Scan/ScanPage.xaml.cs') tokScan += k; else tokElse += k; }
  /* ★ #46 r5 (n1): every spelling (SetTarget, ??=, Interlocked) needs the token — exactly 4 in ScanPage (field, two reads, the ctor write), 0 elsewhere */
  const scanReg = regAll === 1 && tokScan === 4 && tokElse === 0 && /public ScanPage\(\)\s*\{\s*InitializeComponent\(\);\s*scanWebView = new WeakReference<WebView>\(webView\);/.test(SCANCS0)
    && /internal static bool isScanWebView\(object\? view\)\s*\{\s*return view != null && scanWebView != null && scanWebView\.TryGetTarget\(out WebView\? w\) && ReferenceEquals\(w, view\);\s*\}/.test(SCANCS0);
  const grantIdx = [...opr.matchAll(/\.Grant\(/g)].map((m) => m.index);
  const nullB = blockFrom(opr, opr.indexOf('if (refusal == null)'));
  let grantAll = 0;
  const scanAssign = [];
  for (const f of walk('Spixi')) grantAll += (rd(f).match(/Grant\(\s*request\.GetResources\(\)\s*\)/g) || []).length;
  /* ★ #46 r2 (m2): the markers are XAML-only — walked over EVERY spelling a C# file could use to set or name one */
  const codeAssign = [], forge = [], xamlTok = [];
  const walkX = (d) => { for (const n of readdirSync(join(root, d), { withFileTypes: true })) { if (n.name === 'obj' || n.name === 'bin') continue; const q = d + '/' + n.name; if (n.isDirectory()) walkX(q); else if (/\.(cs|xaml)$/.test(n.name)) { const t = rd(q);
    for (const m of t.matchAll(/ClassId\s*=\s*"scan"/g)) scanAssign.push(q);
    if (/\.cs$/.test(n.name)) { for (const m of t.matchAll(/\bClassId\s*=(?!=)/g)) codeAssign.push(q); if (/ClassIdProperty/.test(t)) forge.push(q + ':ClassIdProperty'); if (/\bScanMarker\b/.test(t) && q !== 'Spixi/Utils/S16SecRules.cs') forge.push(q + ':ScanMarker'); }
    else { if (/Property\s*=\s*["']ClassId["']|x:Static[^}]*ScanMarker/.test(t)) forge.push(q + ':xaml');
      /* ★ #46 r3 (m1): EVERY XAML spelling (double / single quotes, a property element, a setter) — the only ClassId tokens
         outside comments are MiniAppPage's "miniapp" and ScanPage's "scan" attributes */
      const xt = t.replace(/<!--[\s\S]*?-->/g, '');
      for (const m of xt.matchAll(/\bClassId\b/g)) xamlTok.push(q); } } } };
  walkX('Spixi');
  const SCANX = rd('Spixi/Pages/Scan/ScanPage.xaml');
  const SCANCS = rd('Spixi/Pages/Scan/ScanPage.xaml.cs');
  const m9 = {
    found: opr.length > 0 && crAt > 0,
    scanReg,
    noGrantAll: grantAll === 0,
    /* ★ #46 r1 (R1-M1, R4-2): the C# marker decides, never the document */
    marker: (SCANX.match(/<WebView /g) || []).length === 1 && /<WebView x:Name="webView" ClassId="scan" /.test(SCANX)
      && scanAssign.length === 1 && scanAssign[0] === 'Spixi/Pages/Scan/ScanPage.xaml'
      && codeAssign.length === 0 && forge.length === 0
      && xamlTok.length === 2 && xamlTok.includes('Spixi/Pages/MiniApps/MiniAppPage.xaml') && xamlTok.includes('Spixi/Pages/Scan/ScanPage.xaml')
      && !/currentDocumentUrl|\.Url\b/.test(opr) && !/currentDocumentUrl/.test(WVR) && !/isScanDocument|documentUrl/.test(RULES),
    /* ★ #46 r2 (n1): the camera follows the scan WebView on Android, so it may not navigate to a local document */
    scanNav: /else if \(current_url\.Trim\(\)\.StartsWith\("file:", StringComparison\.OrdinalIgnoreCase\)\)\s*\{\s*#if ANDROID\s*IXICore\.Meta\.Logging\.warn\("ScanPage: a file navigation was refused"\);\s*e\.Cancel = true;\s*return;\s*#else\s*e\.Cancel = false;\s*return;\s*#endif\s*\}/.test(SCANCS)
      && (SCANCS.match(/e\.Cancel = false/g) || []).length === 1,
    grantBelow: grantIdx.length === 1 && grantIdx.every((i) => i > crAt && i > nullB.s && i < nullB.e),
    videoOnly: /request\.Grant\(new string\[\] \{ PermissionRequest\.ResourceVideoCapture \}\);\s*return;/.test(nullB.text),
    denies: /IXICore\.Meta\.Logging\.warn\("WebView capture DENIED reason=" \+ refusal\);\s*request\.Deny\(\);/.test(opr)
      && /catch \(Exception\)\s*\{\s*refusal = "gate-error";\s*\}/.test(opr) && /catch \(Exception\)\s*\{\s*try \{ request\.Deny\(\); \} catch \(Exception\) \{ \}\s*\}/.test(opr),
    ruleOrder: before(RULES, 'return "untrusted-host";', 'return "capture-type";') && before(RULES, 'return "capture-type";', 'return "remote-origin";')
      && before(RULES, 'return "remote-origin";', 'return "not-the-scan-page";')
      && /if \(!hostKnown \|\| string\.Equals\(classId, MiniAppMarker, StringComparison\.Ordinal\)\)/.test(RULES)
      && /if \(!string\.Equals\(classId, ScanMarker, StringComparison\.Ordinal\) \|\| !scanPageView\)/.test(RULES)
      && /public const string ScanMarker = "scan";/.test(RULES) && /public const string MiniAppMarker = "miniapp";/.test(RULES),
  };
  ok(Object.values(m9).every(Boolean),
    '★ S16 MAJOR #9 (#1313; #46 r1 + r2 + r4): the Android WebView no longer grants every capture request — no Grant(request.GetResources()) anywhere; OnPermissionRequest asks S16SecRules.captureRefusal with the C# MARKER (ClassId "scan", assigned ONLY on ScanPage.xaml\'s one WebView; "miniapp" / an unknown host = untrusted) — never the document URL ("about:blank" on Android) — plus exactly [VIDEO] and a non-http(s) origin; its ONE Grant sits below that call, in the null branch, granting VIDEO only — and only when the requesting element IS the WebView ScanPage registered by identity in its constructor (r4: a forged marker by any spelling is refused); refusals and throws Deny with a fixed reason word; no C# file sets a ClassId by any spelling (= / ClassIdProperty) or names ScanMarker outside the rule; the Android scan WebView refuses every file: navigation — ' + JSON.stringify(m9));
}
