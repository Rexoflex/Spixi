/* ==== S8 PICKS — agent P-C: the C# CALL SITES of #1239 (the live mic level → `voiceRecLevel`) · #1240 (my avatar →
 * `setSelfAvatar`) · r5 NIT-2 (the group photo's 128 px null guard) ====
 * The pure rules (VoiceLevel.fromPcm16 / fromPcm16Bytes / fromRms, VoiceLevel.Gate) are EXECUTED in scripts/csh
 * (S8PicksTests.cs). The call sites are MAUI-bound and compile nowhere in this container, so they are pinned on
 * comment-stripped source (stripCode keeps string literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks (#802) — run by agent P-C; each failed exactly the named pin (see the P-C report):
 *   Android encode: `tapVoiceLevel(shortsBuffer, num_bytes);` moved ABOVE the muted Array.Clear       → L1 recorder tap
 *   iOS tapVoiceLevel: drop `!voiceMode ||`                                                           → L1 recorder tap
 *   Windows tapVoiceLevel: add `Logging.info("level " + …)`                                           → L4 never logged
 *   VoiceClips.startRecording: drop the setOnVoiceLevel line                                          → L2 VoiceClips
 *   VoiceClips.onRecLevel: drop `gen != recGen ||`                                                    → L2 VoiceClips
 *   VoiceClips.onRecLevel: push `level` instead of `send` (no throttle)                                → L2 VoiceClips
 *   SingleChatPage.pushVoiceRecLevel: drop `(stillValid == null || stillValid())`                     → L3 page push
 *   onLoad: the 3-line selfAvatar sequence moved after `loadMessages();` inside the Task            → A1 self avatar order
 *   pushSelfAvatar: drop the `uri == null ||` return                                                 → A2 self avatar value
 *   SettingsPage.onRemoveAvatar: drop the onSelfAvatarChanged loop                                   → A3 self avatar change
 *   ContactDetails.changeGroupPhotoAsync: drop the `small == null` return                            → N2 group photo guard
 * #46 r1 (agent Q-C) breaks — each failed exactly the named pin / test, then restored:
 *   VoiceLevel.Gate.offer: drop `cell <= lastCell ||`                       → csh gate_releases_on_a_fixed_100ms_grid… + …same_10_per_second…
 *   VoiceLevel.Gate.offer: drop `|| nowMs - lastMs < MinGapMs`              → csh gate_never_sends_two_pushes_closer_than_50ms…
 *   VoiceLevel.Gate.offer: `send = l` (the newest, not the peak)            → csh gate_releases_on_a_fixed_100ms_grid…
 *   pushSelfAvatar: `selfAvatarMake(...)` called directly (main thread)     → A4 off the main thread
 *   pushSelfAvatar: drop `req != selfAvatarReq` in the late re-check        → A4 off the main thread
 *   Node.start: drop the warmSelfAvatar line                                → A4 off the main thread
 *   tellSelfAvatar: null always returns (no "" after a picture)             → A2 self avatar value
 *   SettingsPage.applyAvatar: the loop moved back above broadcastAvatarChange → A3 self avatar change
 *   onSelfAvatarChanged: drop `isDisposed ||`                               → A3 self avatar change
 *   Windows SAudioRecorder.stop: drop `voiceLevel = null;`                  → L5 stop drops the level callback */
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
  const allCs = () => {
    const out = [];
    const walk = (d) => {
      for (const n of readdirSync(join(root, d))) {
        const p = d + '/' + n;
        if (n === 'bin' || n === 'obj') continue;
        const st = statSync(join(root, p));
        if (st.isDirectory()) walk(p);
        else if (n.endsWith('.cs')) out.push(p);
      }
    };
    walk('Spixi');
    return out;
  };
  const count = (s, re) => (s.match(re) || []).length;
  const PLAT = ['Android', 'iOS', 'MacCatalyst', 'Windows'];
  const recOf = (p) => stripCode(rd('Spixi/Platforms/' + p + '/SAudioRecorder.cs'));
  const VC = stripCode(rd('Spixi/VoIP/VoiceClips.cs'));
  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
  const CD = stripCode(rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
  const IFACE = stripCode(rd('Spixi/VoIP/IAudioRecorder.cs'));

  /* ———— L1: every platform recorder taps the level in the VOICE mode only, after the encoder got the (muted) PCM ———— */
  await guard('S8p L1 recorder tap', async () => {
    const iface = /void setOnVoiceLevel\(Action<int>\? on_level\);/.test(IFACE);
    const per = {};
    for (const p of PLAT) {
      const r = recOf(p);
      const android = p === 'Android';
      const enc = bodyOf(r, android ? 'private void encode(int num_bytes, bool use_shorts)' : 'private void encode(byte[] buffer, int offset, int size)');
      const tap = bodyOf(r, android ? 'private void tapVoiceLevel(short[] pcm, int count)' : 'private void tapVoiceLevel(byte[] pcm, int offset, int size)');
      const callRe = android
        ? /if \(muted\)\s*\{\s*Array\.Clear\(shortsBuffer, 0, num_bytes\);\s*\}\s*audioEncoder\.encode\(shortsBuffer, 0, num_bytes\);\s*tapVoiceLevel\(shortsBuffer, num_bytes\);/
        : /if \(muted\)\s*\{\s*Array\.Clear\(buffer, offset, size\);\s*\}\s*audioEncoder\.encode\(buffer, offset, size\);\s*tapVoiceLevel\(buffer, offset, size\);/;
      const math = android ? /on_level\(SPIXI\.VoiceLevel\.fromPcm16\(pcm, 0, count\)\);/ : /on_level\(SPIXI\.VoiceLevel\.fromPcm16Bytes\(pcm, offset, size\)\);/;
      per[p] = {
        set: /public void setOnVoiceLevel\(Action<int>\? on_level\)\s*\{\s*voiceLevel = on_level;\s*\}/.test(r) && /volatile Action<int>\? voiceLevel = null;/.test(r),
        call: callRe.test(enc) && count(r, /tapVoiceLevel\(/g) === 2,   // the definition + ONE call (the encode path)
        gate: /^\{\s*Action<int>\? on_level = voiceLevel;\s*if \(!voiceMode \|\| on_level == null\)\s*\{\s*return;\s*\}\s*try\s*\{/.test(tap) && math.test(tap)
          && /catch \(Exception\)\s*\{\s*\}\s*\}$/.test(tap),
        /* a call never sets it: start(codec) still clears the voice mode (pins-s7 pins the rest of the call path) */
        callMode: /voiceMode\s*=\s*false;/.test(bodyOf(r, 'public void start(string codec)')),
      };
    }
    /* only VoiceClips registers a level callback — VoIPManager (the call) never does */
    const setters = [];
    for (const f of allCs()) { const n = count(stripCode(rd(f)), /\.setOnVoiceLevel\(/g); if (n) setters.push(f + ':' + n); }
    const only = setters.join(',') === 'Spixi/VoIP/VoiceClips.cs:1';
    ok(iface && PLAT.every((p) => Object.values(per[p]).every(Boolean)) && only,
      'S8p L1 recorder tap (#1239): IAudioRecorder.setOnVoiceLevel; each of the 4 platform recorders reads the level AFTER the mute zeroing and the encoder call (the PCM is only read), ONCE per captured buffer, and only in the voice mode (`!voiceMode` returns first; start(codec) clears it), through SPIXI.VoiceLevel with the same buffer bounds, a throw swallowed on the audio thread; only VoiceClips registers a callback — '
      + JSON.stringify({ iface, per, setters }));
  });

  /* ———— L2: VoiceClips — the live recording's level only, throttled, pushed through the host with the live re-check ———— */
  await guard('S8p L2 VoiceClips', async () => {
    const sr = bodyOf(VC, 'public static VoiceRecStart startRecording(IVoiceHost host)');
    const reg = /r\.setOnSoundDataReceived\(\(data\) => onRecData\(gen, data\)\);\s*r\.setOnVoiceLevel\(\(level\) => onRecLevel\(gen, level\)\);\s*r\.startVoiceMessage\(/.test(sr);
    const pub = /recTimer = new Timer\(\(_\) => recTick\(gen\), null, RecTickMs, RecTickMs\);\s*recLevelGate = new VoiceLevel\.Gate\(\);\s*published = true;/.test(sr);
    const cl = /recLevelGate = null;/.test(bodyOf(VC, 'private static void clearRecordingLocked()'));
    const lv = bodyOf(VC, 'private static void onRecLevel(int gen, int level)');
    const live = /lock \(gate\)\s*\{\s*if \(gen != recGen \|\| recorder == null \|\| recHost == null \|\| recClock == null \|\| recLevelGate == null\)\s*\{\s*return;\s*\}\s*if \(!recLevelGate\.offer\(recClock\.ElapsedMilliseconds, level, out send\)\)\s*\{\s*return;\s*\}\s*h = recHost;\s*\}\s*h\.pushVoiceRecLevel\(send, \(\) => isLiveRecording\(gen\)\);\s*\}$/.test(lv);
    const host = /void pushVoiceRecLevel\(int level, Func<bool>\? stillValid = null\);/.test(VC);
    const quiet = !/Logging\./.test(lv) && !/sendUiCommand|executeUiCommand/.test(VC);
    ok(reg && pub && cl && live && host && quiet,
      'S8p L2 VoiceClips (#1239): the level callback is registered (with this recording\'s generation) BEFORE startVoiceMessage; onRecLevel acts only for the LIVE recording of that generation (a starting / ending / stale one = nothing), throttles through VoiceLevel.Gate on the recording clock (one push per 100 ms cell = 10/s on every platform, ≥ 50 ms apart, the PEAK since the last push — the grid itself is executed in csh), and hands ONE integer to IVoiceHost.pushVoiceRecLevel with the isLiveRecording re-check; the gate is made at publish and cleared with the recording; no log, VoiceClips pushes nothing itself — '
      + JSON.stringify({ reg, pub, cl, live, host, quiet }));
  });

  /* ———— L3 + L4: the page's push — one clamped integer, main thread, torn-down page = nothing; never logged ———— */
  await guard('S8p L3 page push', async () => {
    const m = bodyOf(SCP, 'public void pushVoiceRecLevel(int level, Func<bool>? stillValid = null)');
    const push = /^\{\s*string lv = Math\.Max\(0, Math\.Min\(100, level\)\)\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\);\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(!isDisposed && \(stillValid == null \|\| stillValid\(\)\)\)\s*\{\s*Utils\.sendUiCommand\(this, "voiceRecLevel", lv\);\s*\}\s*\}\);\s*\}$/.test(m);
    let sites = 0;
    for (const f of allCs()) sites += count(stripCode(rd(f)), /"voiceRecLevel"/g);
    ok(push && sites === 1,
      'S8p L3 page push (#1239): SingleChatPage.pushVoiceRecLevel sends `voiceRecLevel(<0–100 invariant digits>)` — the only argument — posted to the main thread, nothing for a torn-down page, and only while stillValid (the live recording) holds THERE; the one "voiceRecLevel" site in the C# tree — '
      + JSON.stringify({ push, sites }));
  });

  await guard('S8p L4 never logged', async () => {
    const bodies = { onRecLevel: bodyOf(VC, 'private static void onRecLevel(int gen, int level)'), page: bodyOf(SCP, 'public void pushVoiceRecLevel(int level, Func<bool>? stillValid = null)') };
    for (const p of PLAT) {
      const r = recOf(p);
      bodies[p] = bodyOf(r, p === 'Android' ? 'private void tapVoiceLevel(short[] pcm, int count)' : 'private void tapVoiceLevel(byte[] pcm, int offset, int size)')
        + bodyOf(r, 'public void setOnVoiceLevel(Action<int>? on_level)');
    }
    const logged = Object.entries(bodies).filter(([, b]) => b === '' || /Logging\.|Console\.|Debug\.|P1Perf\.|Preferences|File\./.test(b)).map(([k]) => k);
    const vl = stripCode(rd('Spixi/Utils/VoiceLevel.cs'));
    const pure = !/Logging|Console|Microsoft\.Maui|IXICore|File\.|Preferences/.test(vl);
    ok(logged.length === 0 && pure,
      'S8p L4 never logged / stored (security handover gate): the level\'s path (4 recorder taps, VoiceClips.onRecLevel, the page push) has no log, console, P1, preference or file call, and VoiceLevel.cs is pure — ' + JSON.stringify({ logged, pure }));
  });

  /* ———— A1–A3: setSelfAvatar — once per document BEFORE the history, a small C#-made URI, again on a change ———— */
  await guard('S8p A1 self avatar order', async () => {
    const ol = bodyOf(SCP, 'private void onLoad()');
    const iReady = ol.indexOf('Utils.sendUiCommand(this, "onChatScreenReady"');
    const iSelf = ol.indexOf('selfAvatarPushed = null;');
    const seq = /selfAvatarPushed = null;\s*selfAvatarDoc = true;\s*pushSelfAvatar\(\);/.test(ol);
    const iTask = ol.indexOf('Task.Run(async () =>');
    const iLoad = ol.indexOf('loadMessages();');
    const order = iReady >= 0 && iSelf > iReady && iTask > iSelf && iLoad > iSelf && count(ol, /pushSelfAvatar\(\);/g) === 1;
    ok(seq && order,
      'S8p A1 self avatar order (#1240): onLoad resets this document\'s told value and asks for setSelfAvatar ONCE, after onChatScreenReady (the shell\'s reset) and BEFORE the history (the Task.Run that runs loadMessages): a cached / known value is told synchronously there (A4), a value still being made lands later — '
      + JSON.stringify({ seq, iReady, iSelf, iTask, iLoad }));
  });

  await guard('S8p A2 self avatar value', async () => {
    const pk = bodyOf(SCP, 'private static bool selfAvatarPeek(out string? uri, out string path, out string key)');
    const peek = /path = IxianHandler\.localStorage\.getOwnAvatarPath\(false\);/.test(pk)
      && /if \(!fi\.Exists\)\s*\{\s*uri = "";\s*return true;\s*\}/.test(pk)
      && /if \(fi\.Length <= 0 \|\| fi\.Length > SelfAvatarSourceMax\)\s*\{\s*uri = null;\s*return true;\s*\}/.test(pk)
      && /if \(selfAvatarKey == key\)\s*\{\s*uri = selfAvatarUri;\s*return true;\s*\}/.test(pk)
      && !/ReadAllBytes|ResizeImage/.test(pk);   // a STAT only: safe on the main thread
    const mk = bodyOf(SCP, 'private static string? selfAvatarMake(string path, string key)');
    const make = /byte\[\]\? small = SFilePicker\.ResizeImage\(File\.ReadAllBytes\(path\), SelfAvatarPx, SelfAvatarPx, 100\);\s*if \(small != null && small\.Length > 0\)\s*\{\s*uri = "data:image\/jpeg;base64," \+ Convert\.ToBase64String\(small\);\s*\}/.test(mk)
      && /catch \(Exception e\)\s*\{\s*Logging\.warn\("[^"]*" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}/.test(mk)
      && /if \(uri != null\)\s*\{\s*selfAvatarKey = key;\s*selfAvatarUri = uri;\s*\}/.test(mk)
      && /private const int SelfAvatarPx = 128;/.test(SCP);
    /* NIT-2: null after a picture → "" (initials), never a stale face; null with nothing / initials told → nothing */
    const tell = /^\{\s*if \(uri == null\)\s*\{\s*if \(string\.IsNullOrEmpty\(selfAvatarPushed\)\)\s*\{\s*return;\s*\}\s*uri = "";\s*\}\s*if \(uri == selfAvatarPushed\)\s*\{\s*return;\s*\}\s*selfAvatarPushed = uri;\s*Utils\.sendUiCommand\(this, "setSelfAvatar", uri\);\s*\}$/.test(bodyOf(SCP, 'private void tellSelfAvatar(string? uri)'));
    let sites = 0;
    for (const f of allCs()) sites += count(stripCode(rd(f)), /"setSelfAvatar"/g);
    ok(peek && make && tell && sites === 1,
      'S8p A2 self avatar value (#1240; #46 r1 A NIT-2): my avatar = Core\'s own avatar.jpg (C#\'s path, no WebView value) resized to 128 px JPEG (the setAvatarFor thumb rule) as a data:image/jpeg URI, cached by the file key; no file = "" (initials); the size rule / a read / resize failure = null (a type-only warn) = nothing pushed, or "" when this document already shows a picture of mine (never stale); pushed only when this document has not got this one; one "setSelfAvatar" site — '
      + JSON.stringify({ peek, make, tell, sites }));
  });

  /* ———— A4: #46 r1 A MINOR-2 — the resize NEVER on the main thread; a known answer at once; a late one re-checked ———— */
  await guard('S8p A4 self avatar off the main thread', async () => {
    /* the ONLY ResizeImage / ReadAllBytes of the avatar is selfAvatarMake, and its ONLY call is inside Task.Run */
    const makeCalls = count(SCP, /selfAvatarMake\(/g);
    const inRun = /selfAvatarTask = Task\.Run\(\(\) => selfAvatarMake\(path, key\)\);/.test(SCP);
    const as = bodyOf(SCP, 'private static Task<string?> selfAvatarDataUriAsync()');
    const shared = /if \(selfAvatarPeek\(out string\? known, out string path, out string key\)\)\s*\{\s*return Task\.FromResult\(known\);\s*\}/.test(as)
      && /if \(selfAvatarTask != null && selfAvatarTaskKey == key\)\s*\{\s*return selfAvatarTask;\s*\}/.test(as)
      && /catch \(Exception e\)\s*\{\s*Logging\.warn\("[^"]*" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*return Task\.FromResult<string\?>\(null\);\s*\}/.test(as);
    const ps = bodyOf(SCP, 'private void pushSelfAvatar()');
    const push = /^\{\s*if \(isDisposed\)\s*\{\s*return;\s*\}\s*int req = \+\+selfAvatarReq;\s*int doc = thumbDoc;\s*Task<string\?> t = selfAvatarDataUriAsync\(\);\s*if \(t\.IsCompleted\)\s*\{\s*tellSelfAvatar\([^;]*\);\s*return;\s*\}\s*t\.ContinueWith\(/.test(ps)
      && /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(isDisposed \|\| doc != thumbDoc \|\| req != selfAvatarReq\)\s*\{\s*return;\s*\}\s*tellSelfAvatar\(uri\);\s*\}\);/.test(ps)
      && !/\.Wait\(|GetAwaiter\(\)\.GetResult/.test(ps);   // never blocks the main thread on the resize
    const warm = /public static void warmSelfAvatar\(\)\s*\{\s*_ = selfAvatarDataUriAsync\(\);\s*\}/.test(SCP);
    const node = stripCode(rd('Spixi/Meta/Node.cs'));
    const nodeOk = count(node, /SingleChatPage\.warmSelfAvatar\(\);/g) === 1
      && node.indexOf('SingleChatPage.warmSelfAvatar();') > node.indexOf('Logging.info("Node started");')
      && node.indexOf('SingleChatPage.warmSelfAvatar();') < node.indexOf('startCounter++;', node.indexOf('Logging.info("Node started");'));
    ok(makeCalls === 2 && inRun && shared && push && warm && nodeOk,
      'S8p A4 self avatar off the main thread (#46 r1 A MINOR-2): the read + resize (selfAvatarMake) runs ONLY inside Task.Run (one shared task per avatar file, a second caller joins it); a known answer (cached URI / no file) is a stat and is told AT ONCE (onLoad: before the history); otherwise the answer is told later on the main thread only if the page is alive, the document is the same and no newer request came; nothing blocks on the task; the cache is warmed at Node.start (after "Node started", before startCounter++) — '
      + JSON.stringify({ makeCalls, inRun, shared, push, warm, nodeOk }));
  });

  await guard('S8p A3 self avatar change', async () => {
    const loop = /foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onSelfAvatarChanged\(\);/;
    const apply = bodyOf(SET, 'public void applyAvatar()');
    /* NIT-1: AFTER the copy and AFTER FriendList.broadcastAvatarChange(), inside try / catch with a type-only log; warm first */
    const applyOk = /FriendList\.broadcastAvatarChange\(\);\s*try\s*\{\s*SingleChatPage\.warmSelfAvatar\(\);\s*foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onSelfAvatarChanged\(\);\s*\}\s*catch \(Exception e\)\s*\{\s*Logging\.warn\("[^"]*" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}$/.test(apply)
      && apply.search(loop) > apply.indexOf('File.Copy(source_file_path, file_path);') && count(apply, /onSelfAvatarChanged/g) === 1;
    const rem = bodyOf(SET, 'public void onRemoveAvatar()');
    const remOk = /if \(IxianHandler\.localStorage\.deleteOwnAvatar\(\)\)\s*\{[^{}]*try\s*\{\s*foreach \(var chat_page in Utils\.getChatPages\(\)\) chat_page\.onSelfAvatarChanged\(\);\s*\}\s*catch \(Exception e\)\s*\{\s*Logging\.warn\("[^"]*" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*\}/.test(rem);
    const on = bodyOf(SCP, 'public void onSelfAvatarChanged()');
    /* NIT-6: a torn-down page is skipped */
    const onOk = /if \(isDisposed \|\| friend == null \|\| !selfAvatarDoc\)\s*\{\s*return;\s*\}\s*pushSelfAvatar\(\);/.test(on) && /catch \(Exception e\)\s*\{\s*Logging\.warn\("onSelfAvatarChanged failed: " \+ e\.GetType\(\)\.Name\);/.test(on);
    ok(applyOk && remOk && onOk,
      'S8p A3 self avatar change (#1240; #46 r1 A NIT-1 / NIT-6): SettingsPage tells every live chat page after the avatar is saved — after the copy AND after FriendList.broadcastAvatarChange(), the URI warmed off the main thread first, all inside try / catch with a type-only log — and after it is removed (also guarded); the page re-pushes only when it is not torn down and its document has loaded (else onLoad tells it), and catches its own failure — '
      + JSON.stringify({ applyOk, remOk, onOk }));
  });

  /* ———— L5: #46 r1 A NIT-3 — each recorder's stop() drops the level callback with the session ———— */
  await guard('S8p L5 stop drops the level callback', async () => {
    const per = {};
    for (const p of PLAT) {
      const st = bodyOf(recOf(p), 'public void stop()');
      per[p] = /^\{\s*if \(!running\)\s*\{\s*return;\s*\}\s*voiceFlushing = voiceMode;\s*running = false;\s*voiceLevel = null;/.test(st);
    }
    ok(PLAT.every((p) => per[p]),
      'S8p L5 stop drops the level callback (#46 r1 A NIT-3): each of the 4 platform recorders clears voiceLevel in stop(), right after running = false (like voiceInterrupted) — no level reaches a finished clip — ' + JSON.stringify(per));
  });

  /* ———— N2: r5 NIT-2 — no 128 px copy → no local setAvatar (Core deletes first: it would wipe the group photo), no send ———— */
  await guard('S8p N2 group photo guard', async () => {
    const ch = bodyOf(CD, 'changeGroupPhotoAsync()');
    const iSmall = ch.indexOf('byte[]? small = SFilePicker.ResizeImage(full, 128, 128, 100);');
    const g = /byte\[\]\? small = SFilePicker\.ResizeImage\(full, 128, 128, 100\);\s*if \(small == null \|\| small\.Length == 0\)\s*\{\s*return;\s*\}/.test(ch);
    const iSet = ch.indexOf('FriendList.setAvatar(groupAddress, full, small, null);');
    const iSend = ch.indexOf('StreamProcessor.sendAvatar(pf, groupAddress);');
    const inTry = ch.indexOf('try') >= 0 && ch.indexOf('try') < iSmall && /finally\s*\{\s*System\.Threading\.Interlocked\.Exchange\(ref groupPhotoBusy, 0\);/.test(ch);
    ok(g && iSmall >= 0 && iSet > iSmall && iSend > iSet && inTry,
      'S8p N2 group photo guard (r5 NIT-2): a null / empty 128 px resize RETURNS before FriendList.setAvatar (which deletes the stored photo first) and before any member send; the return is inside the try, so finally releases the busy flag — '
      + JSON.stringify({ g, iSmall, iSet, iSend, inTry }));
  });
}
