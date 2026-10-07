/* ==== SESSION 10 — agent A (C#): the CALL SITES of #1254 P1 (the strip's append batches + ixian:mediaDrop), F1 (the chat's
 * MAUI WebView ground), F4 (the haptic probe + Vibrator fallback + VIBRATE) and P2 (the per-tier send cap) ====
 * The pure rules (S10MediaRules: nextKey / parseDrop / hapticFallback / hapticWord / argbToken; PhotoRules: FileTier /
 * maxFileBytes / MaxReceiveBytes) are EXECUTED in scripts/csh (S10MediaTests.cs). The call sites are MAUI-bound and compile
 * nowhere in this container, so they are pinned on comment-stripped source (stripCode keeps string literals). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, existsSync, join } = h;
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

  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const SCB = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
  const PR = stripCode(rd('Spixi/Utils/PhotoRules.cs'));
  const MAN = rd('Spixi/Platforms/Android/AndroidManifest.xml').replace(/<!--[\s\S]*?-->/g, '');

  /* ———— P1-a: the 🟡 verb — an Ordinal prefix next to mediaCancel, the payload straight to onMediaDrop ———— */
  await guard('S10 A P1 mediaDrop verb', async () => {
    ok(/else if \(current_url\.StartsWith\("ixian:mediaDrop:", StringComparison\.Ordinal\)\)\s*\{\s*onMediaDrop\(current_url\.Substring\("ixian:mediaDrop:"\.Length\)\);\s*\}/.test(SCP)
      && before(SCP, 'StartsWith("ixian:mediaCancel:"', 'StartsWith("ixian:mediaDrop:"') && count(SCP, /"ixian:mediaDrop:"/g) === 2,
      'S10 A P1: ixian:mediaDrop:<16hex>:<k> is an Ordinal-prefix verb beside mediaCancel, handed whole to onMediaDrop');
  });

  /* ———— P1-b: a pick while the batch is open APPENDS (free slots only, a full batch opens no picker); never drops it ———— */
  await guard('S10 A P1 append pick', async () => {
    const pick = bodyOf(SCP, 'private async Task onPickPhotos(string route)');
    ok(/MediaBatch\? target = mediaBatch;\s*if \(target != null && \(friend == null \|\| target\.peer != friend\.walletAddress\.ToString\(\) \|\| target\.channel != selectedChannel\)\)\s*\{\s*target = null;\s*\}/.test(pick)
      && /int free = target != null \? PhotoRules\.MaxBatch - target\.items\.Count : PhotoRules\.MaxBatch;\s*if \(free <= 0\)\s*\{\s*Utils\.sendUiCommand\(this, "mediaError", PhotoRules\.ErrTooMany\);\s*return;\s*\}/.test(pick)
      && before(pick, 'if (free <= 0)', 'SFilePicker.PickImagesAsync(') && before(pick, 'if (free <= 0)', 'CapturePhotoAsync(') && before(pick, 'if (free <= 0)', 'SClipboardImage.readAsync(')
      && /picks = await SFilePicker\.PickImagesAsync\(free\) \?\? new List<SpixiImageData>\(\);/.test(pick)
      && !/dropMediaBatch\(/.test(pick)
      && /MediaBatch batch = new MediaBatch\s*\{\s*id = batchId,\s*peer = friend\.walletAddress\.ToString\(\),\s*channel = selectedChannel,\s*route = route,\s*\};/.test(pick)   /* #46 R3-10 */
      && /int take = Math\.Min\(picks\.Count, free\);\s*if \(picks\.Count > free\)\s*\{\s*batch\.errors\.Add\(PhotoRules\.ErrTooMany\);\s*\}/.test(pick)
      && /_ = Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*prepareBatch\(batch, picks, take\);\s*\}[\s\S]*?onMain\(\(\) => finishPick\(batch, target, doc, chat\)\);\s*\}\);/.test(pick)
      && /for \(int k = 0; k < take && k < picks\.Count && k < PhotoRules\.MaxBatch; k\+\+\)/.test(bodyOf(SCP, 'private static void prepareBatch(MediaBatch batch, List<SpixiImageData> picks, int take)'))
      && /public int count = PhotoRules\.MaxBatch;/.test(bodyOf(SCP, 'private sealed class MediaBatch')) && !/count = Math\.Min\(picks\.Count/.test(SCP),
      'S10 A P1: a pick while this chat + channel has an open batch appends — the picker asks for the FREE slots only (camera / paste = 1), a full batch pushes mediaError tooMany and opens no picker, extras → tooMany; a new pick NEVER drops the open batch; every batch counts 10 key slots');
  });

  /* ———— P1-c: finishPick appends with the smallest free key and pushes the FULL list under the target's id ———— */
  await guard('S10 A P1 finishPick append', async () => {
    const fin = bodyOf(SCP, 'private void finishPick(MediaBatch batch, MediaBatch? target, int doc, Friend chat)');
    const app = fin.slice(fin.indexOf('if (target != null && ReferenceEquals(mediaBatch, target)'), fin.indexOf('else\n', fin.indexOf('"mediaPicked", target.id')));
    ok(/if \(isDisposed \|\| doc != thumbDoc \|\| friend != chat \|\| batch\.peer != friend\.walletAddress\.ToString\(\)\)\s*\{\s*foreach \(MediaItem it in batch\.items\)\s*\{\s*deleteOwnMediaFile\(it\.path\);\s*\}\s*return;\s*\}/.test(fin)
      && /if \(target != null && ReferenceEquals\(mediaBatch, target\) && target\.peer == batch\.peer && target\.channel == selectedChannel\)/.test(fin)
      && /int k = S10MediaRules\.nextKey\(used\);\s*if \(k < 0 \|\| shown == null\)\s*\{\s*deleteOwnMediaFile\(it\.path\);\s*if \(k < 0 && !batch\.errors\.Contains\(PhotoRules\.ErrTooMany\)\)\s*\{\s*batch\.errors\.Add\(PhotoRules\.ErrTooMany\);\s*\}\s*continue;\s*\}/.test(app)
      && /shown\.k = k\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\);\s*target\.items\.Add\(new MediaItem \{ k = k, path = it\.path \}\);\s*target\.shown\.Add\(shown\);/.test(app)
      && /string oldKey = it\.k\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\);\s*PhotoRules\.PickedItem\? shown = batch\.shown\.Find\(x => x\.k == oldKey\);/.test(app)   /* #46 R3-7 */
      && /foreach \(MediaItem t in target\.items\)\s*\{\s*used\.Add\(t\.k\);\s*\}/.test(app) && before(app, 'used.Add(t.k);', 'S10MediaRules.nextKey(used)')
      && /Utils\.sendUiCommand\(this, "mediaPicked", target\.id, PhotoRules\.pickedJson\(target\.shown\)\);/.test(app)
      && /else\s*\{\s*dropMediaBatch\(\);\s*mediaBatch = batch;\s*Utils\.sendUiCommand\(this, "mediaPicked", batch\.id, PhotoRules\.pickedJson\(batch\.shown\)\);\s*\}/.test(fin)
      && count(SCP, /"mediaPicked"/g) === 2 && count(SCP, /finishPick\(/g) === 2 && count(SCP, /prepareBatch\(/g) === 2
      && /Interlocked\.Exchange\(ref mediaBusy, 0\);/.test(fin),
      'S10 A P1: finishPick appends to the batch the pick was aimed at only while it is STILL the open batch of this chat + channel — each new photo takes S10MediaRules.nextKey (none free → its file goes + tooMany) and mediaPicked carries the target id + its FULL list; a target that is gone → the new photos become the open batch');
  });

  /* ———— P1-d: onMediaDrop — parsed first, this page's open batch only, C#'s recorded file, fixed-word logs, one mediaDropped confirm ———— */
  await guard('S10 A P1 onMediaDrop', async () => {
    const md = bodyOf(SCP, 'private void onMediaDrop(string payload)');
    ok(/if \(!S10MediaRules\.parseDrop\(payload, out string batchId, out int k\)\)\s*\{\s*Logging\.warn\("ixian:mediaDrop: malformed"\);\s*return;\s*\}/.test(md)
      && before(md, 'S10MediaRules.parseDrop(', 'mediaBatch')
      && /MediaBatch\? b = mediaBatch;\s*if \(b == null \|\| !string\.Equals\(b\.id, batchId, StringComparison\.Ordinal\)\)\s*\{\s*Logging\.warn\("ixian:mediaDrop: no such batch"\);\s*return;\s*\}/.test(md)
      && /MediaItem\? it = b\.items\.Find\(x => x\.k == k\);\s*if \(it == null\)\s*\{\s*Logging\.warn\("ixian:mediaDrop: no such photo"\);\s*return;\s*\}/.test(md)
      && /string key = k\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\);\s*b\.items\.Remove\(it\);\s*b\.shown\.RemoveAll\(x => x\.k == key\);\s*deleteOwnMediaFile\(it\.path\);\s*Utils\.sendUiCommand\(this, \"mediaDropped\", b\.id, key\);/.test(md)   /* #46 R3-6 · #46 r3: the drop is confirmed with C#'s own id + key, last */
      && count(md, /sendUiCommand/g) === 1 && !/dropMediaBatch|payload\)\s*\+|\+ payload|\+ batchId|sendUiCommand\([^)]*batchId/.test(md)
      && count(md, /Logging\.warn\("[^"]*"\);/g) === 3 && count(md, /Logging\./g) === 3,
      'S10 A P1: ixian:mediaDrop is parsed (exact 16-hex id + one digit) before anything is looked up; only the open batch with that id loses the item with that key — its entry + its C#-recorded file (deleteOwnMediaFile: Sent/ only); unknown → one fixed-word warn; the drop is confirmed with mediaDropped(C#\'s own id, key) (#46 r3)');
  });

  /* ———— P2: the send sites use maxFileBytes(Free), the receive site MaxReceiveBytes; MaxFileBytes is gone ———— */
  await guard('S10 A P2 tiers', async () => {
    const mk = bodyOf(SCP, 'private static DurableCopy makeDurableCopy(Stream picked, string? pickedName, string uid)');
    const onAcc = bodyOf(SCP, 'public void onAcceptFile(int selected_channel, FriendMessage message)');
    ok(!/MaxFileBytes/.test(SCP) && !/MaxFileBytes/.test(PR)
      && /if \(known > PhotoRules\.maxFileBytes\(PhotoRules\.FileTier\.Free\)\)\s*\{\s*r\.tooBig = true;\s*return r;\s*\}/.test(mk)
      && /PhotoRules\.copyBounded\(picked, dest, PhotoRules\.maxFileBytes\(PhotoRules\.FileTier\.Free\), out readFailed\)/.test(mk)
      && /if \(message\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)\s*\{[^}]*"mediaError", PhotoRules\.ErrFileTooBigIn\);\s*return;\s*\}/.test(onAcc)
      && /public enum FileTier \{ Free, Premium \}/.test(PR) && /public const long MaxReceiveBytes = 100L \* 1024 \* 1024;/.test(PR)
      && /public static long maxFileBytes\(FileTier t\)/.test(PR),
      'S10 A P2: "Send file" refuses / bounds its copy at maxFileBytes(Free) = 50 MiB (mediaError fileTooBig as before); an offer is refused above MaxReceiveBytes (100 MiB, the largest tier); PhotoRules.MaxFileBytes no longer exists');
  });

  /* ———— F1: the chat's MAUI WebView ground (= the native base on the compat renderer) is Transparent once, never written by the hold ———— */
  await guard('S10 A F1 chat ground', async () => {
    const surf = bodyOf(SCB, 'internal void applyPageSurfaceColor()');
    const grounds = bodyOf(SCB, 'private static void setHoldGrounds(PreloadOp op, Android.Webkit.WebView? native, bool held)');
    ok(/private bool keepsMauiWebViewTransparent\s*\{\s*get\s*\{\s*#if ANDROID\s*return keepsNativeWebViewTransparent;\s*#else\s*return false;\s*#endif\s*\}\s*\}/.test(SCB)
      && /if \(!keepsMauiWebViewTransparent\)\s*\{\s*_webView\.BackgroundColor = pageSurfaceColor;\s*\}\s*else if \(!Colors\.Transparent\.Equals\(_webView\.BackgroundColor\)\)\s*\{\s*_webView\.BackgroundColor = Colors\.Transparent;\s*\}/.test(surf)
      && count(surf, /_webView\.BackgroundColor = /g) === 2
      && /if \(op\.target\._webView != null && !op\.target\.keepsNativeWebViewTransparent\)\s*\{\s*op\.target\._webView\.BackgroundColor = ground;\s*\}/.test(grounds)
      && count(grounds, /_webView\.BackgroundColor = /g) === 1
      && /op\.stage\.BackgroundColor = ground;\s*op\.targetContent\.BackgroundColor = ground;/.test(grounds),
      'S10 A F1: on Android the chat\'s MAUI WebView BackgroundColor (VisualElementRenderer → ViewHandler.MapBackground → the SpixiWebview = a native base change = the grey re-raster) is set Transparent ONCE by applyPageSurfaceColor (compared first, never the surface colour) and NEVER by setHoldGrounds; stage + content still carry the #248 backing; every other page unchanged');
  });

  /* ———— F1 probe [P1]: the native base before the hold and after release (8 hex / none — the grammar has no '#') ———— */
  await guard('S10 A F1 probe', async () => {
    const hold = bodyOf(SCB, 'private static void holdStageUntilDrawn(PreloadOp op)');
    const cb = hold.slice(hold.indexOf('PresentHold.start('));
    const tok = bodyOf(SCB, 'private static string nativeGroundToken(Android.Webkit.WebView? native)');
    const gt = bodyOf(SCB, 'private static string groundTokenOf(Android.Graphics.Drawables.Drawable? d)');
    const L = 'P1Perf.line("hold nbg pre=" + nbgPre + " post=" + nativeGroundToken(heldView) + " vg=" + groundTokenOf((heldView?.Parent as Android.Views.View)?.Background));';
    ok(/string nbgPre = P1Perf\.enabled \? nativeGroundToken\(native\) : "none";\s*setHoldGrounds\(op, native, true\);/.test(hold)
      && before(cb, 'setHoldGrounds(held, heldView, false);', L)
      && /P1Perf\.line\("hold release bg=" \+ \(held\.target\.keepsNativeWebViewTransparent \|\| heldView == null \? "kept" : "set"\)\);/.test(cb)
      && /return groundTokenOf\(native\?\.Background\);/.test(tok)
      && /if \(d is Android\.Graphics\.Drawables\.ColorDrawable cd\)\s*\{\s*return S10MediaRules\.argbToken\(cd\.Color\.ToArgb\(\)\);\s*\}/.test(gt)
      && /return S10MediaRules\.argbToken\(null\);/.test(gt) && !/SetBackground|BackgroundColor =/.test(tok + gt),
      'S10 A F1 [P1] (TEMPORARY): holdStageUntilDrawn logs `hold nbg pre=<8hex|none> post=<8hex|none> vg=<8hex|none>` — the native SpixiWebview Background (a ColorDrawable) at hold start and after release, plus its parent renderer ViewGroup (#46 r1 M6), read-only; `hold release bg=` kept');
  });

  /* ———— F4: the probe line, the fallback only on a refusal while touch feedback is not off, API 29+, the predefined effects ———— */
  await guard('S10 A F4 haptic', async () => {
    const g = bodyOf(SCB, 'protected bool onNavigatingGlobal(string url)');
    const ph = bodyOf(SCB, 'private static void performHaptic(S9FixRules.Haptic kind, string? word)');
    const pa = bodyOf(SCB, 'private static void performHapticAndroid(S9FixRules.Haptic kind, string word)');
    ok(/if \(hasGeneratedContent && App\.isInForeground\)\s*\{\s*string hapticArg = url\.Substring\("ixian:haptic:"\.Length\);\s*performHaptic\(S9FixRules\.hapticKind\(hapticArg\), S10MediaRules\.hapticWord\(hapticArg\)\);\s*\}/.test(g)
      && /if \(kind == S9FixRules\.Haptic\.None \|\| word == null\)\s*\{\s*return;\s*\}/.test(ph) && /#if ANDROID\s*performHapticAndroid\(kind, word\);\s*#elif IOS/.test(ph)
      && /bool ok = act\?\.Window\?\.DecorView\?\.PerformHapticFeedback\(kind == S9FixRules\.Haptic\.LongPress\s*\? global::Android\.Views\.FeedbackConstants\.LongPress\s*: global::Android\.Views\.FeedbackConstants\.ContextClick\) == true;/.test(pa)
      && /hfe = Android\.Provider\.Settings\.System\.GetInt\(act\?\.ContentResolver, "haptic_feedback_enabled", -1\);/.test(pa)
      && /P1Perf\.line\("haptic k=" \+ word \+ " ok=" \+ \(ok \? "1" : "0"\) \+ " hfe=" \+ hfe\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\)\s*\+ " sdk=" \+ sdk\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\)\);/.test(pa)
      && /if \(!S10MediaRules\.hapticFallback\(ok, hfe, sdk\) \|\| !OperatingSystem\.IsAndroidVersionAtLeast\(29\)\)\s*\{\s*return;\s*\}/.test(pa)
      && before(pa, 'P1Perf.line("haptic k="', 'S10MediaRules.hapticFallback(') && before(pa, 'S10MediaRules.hapticFallback(', 'GetSystemService(')
      && /Android\.Content\.Context ctx = Spixi\.SPlatformUtils\.appContext\(\);/.test(pa)
      && /if \(OperatingSystem\.IsAndroidVersionAtLeast\(31\)\)\s*\{\s*Android\.OS\.VibratorManager\? vm = ctx\.GetSystemService\(Android\.Content\.Context\.VibratorManagerService\) as Android\.OS\.VibratorManager;\s*vib = vm\?\.DefaultVibrator;\s*\}/.test(pa)
      && /vib = ctx\.GetSystemService\(Android\.Content\.Context\.VibratorService\) as Android\.OS\.Vibrator;/.test(pa)
      && /if \(vib == null \|\| !vib\.HasVibrator\)\s*\{\s*return;\s*\}/.test(pa)
      && /Android\.OS\.VibrationEffect effect = Android\.OS\.VibrationEffect\.CreatePredefined\(S10MediaRules\.hapticHeavy\(word\)\s*\? Android\.OS\.VibrationEffect\.EffectHeavyClick\s*: Android\.OS\.VibrationEffect\.EffectClick\);/.test(pa)
      /* #46 r1 N2: API 33+ = TOUCH usage (the enum value — the UsageTouch const is Obsolete(error) in .NET for Android) */
      && /if \(OperatingSystem\.IsAndroidVersionAtLeast\(33\)\)\s*\{\s*vib\.Vibrate\(effect, Android\.OS\.VibrationAttributes\.CreateForUsage\(Android\.OS\.VibrationAttributesUsageType\.Touch\)\);\s*\}\s*else\s*\{\s*vib\.Vibrate\(effect\);\s*\}/.test(pa)
      && !/VibrationAttributes\.UsageTouch/.test(SCB) && !/CreateForUsage\(\(int\)/.test(SCB)   /* #46 r2 MAJOR-1: an int cast does not compile (the parameter is the enum) */ && count(SCB, /VibrationAttributes\.CreateForUsage\(/g) === 1
      && !/IgnoreGlobalSetting|FLAG_IGNORE|FeedbackFlags/.test(SCB),
      'S10 A F4: every Android haptic logs [P1] `haptic k=<word> ok=<0|1> hfe=<n> sdk=<n>`; only a REFUSED view haptic with touch feedback not OFF (hfe ≠ 0) on API 29+ falls back to the Vibrator (31+: VibratorManager.DefaultVibrator) playing the predefined click / heavy click (API 33+ tagged USAGE_TOUCH); the global setting is never ignored');
  });

  /* ———— #46 r1 M1: mediaSend SKIPS a key the batch no longer holds (a ✕ that raced the send); no known key → refused ———— */
  await guard('S10 A r1 mediaSend skip', async () => {
    const ms = bodyOf(SCP, 'private void onMediaSend(string payload)');
    ok(/foreach \(int k in keys\)\s*\{\s*MediaItem\? it = b\.items\.Find\(x => x\.k == k\);\s*if \(it != null\)\s*\{\s*chosen\.Add\(it\);\s*\}\s*\}\s*if \(chosen\.Count == 0\)\s*\{\s*Logging\.warn\("ixian:mediaSend: no key is a prepared photo"\);\s*dropMediaBatch\(\);\s*return;\s*\}/.test(ms)
      && /mediaBatch = null;\s*deleteBatchFiles\(b, keys\);\s*sendMediaBatch\(b, chosen, caption\);/.test(ms),
      'S10 A #46 r1 M1: a mediaSend key that is not (any more) a prepared photo is skipped — the photos that ARE there are sent; only a send that names none of them is refused and drops the batch');
  });

  /* ———— #46 r1 M5: a theme flip re-colours the staged chat's stage + content (its WebView stays transparent) ———— */
  await guard('S10 A r1 theme grounds', async () => {
    const rc = bodyOf(SCB, 'internal static void recolourStagedGrounds(SpixiContentPage page)');
    const grounds = bodyOf(SCB, 'private static void setHoldGrounds(PreloadOp op, Android.Webkit.WebView? native, bool held)');
    const UH = stripCode(rd('Spixi/Utils/UIHelpers.cs'));
    const sweep = bodyOf(UH, 'public static void pushThemeToAllPages()');
    ok(/if \(!page\.keepsMauiWebViewTransparent\)\s*\{\s*return;\s*\}/.test(rc)
      && /lock \(preloadLock\)\s*\{\s*ops\.AddRange\(overlayStack\.FindAll\(o => o\.target == page\)\);\s*if \(activePreload != null && activePreload\.target == page && !ops\.Contains\(activePreload\)\)/.test(rc)
      && /if \(op\.groundsHeld \|\| op\.target\.ownsStageGround\)\s*\{\s*continue;\s*\}\s*op\.stage\.BackgroundColor = page\.pageSurfaceColor;\s*op\.targetContent\.BackgroundColor = page\.pageSurfaceColor;/.test(rc)
      && !/_webView|SetBackgroundColor/.test(rc)
      && /op\.groundsHeld = held;\s*Color ground = held \? Colors\.Transparent : op\.target\.pageSurfaceColor;/.test(grounds)
      && /try \{ page\.applyPageSurfaceColor\(\); \}\s*catch \(Exception ex\) \{[^}]*\}\s*try \{ SpixiContentPage\.recolourStagedGrounds\(page\); \}/.test(sweep)
      && count(UH, /recolourStagedGrounds\(/g) === 1,
      'S10 A #46 r1 M5: after each page\'s surface pass the theme sweep re-colours the stage + moved content of every op that stages / shows the chat (MAUI views only, never the WebView), except while a hold keeps them transparent; other pages untouched');
  });

  /* ———— F4: VIBRATE, once (a normal permission) ———— */
  await guard('S10 A F4 VIBRATE', async () => {
    ok(count(MAN, /<uses-permission android:name="android\.permission\.VIBRATE" \/>/g) === 1 && count(MAN, /VIBRATE/g) === 1,
      'S10 A F4: AndroidManifest.xml declares android.permission.VIBRATE exactly once (the fallback\'s Vibrator.vibrate needs it)');
  });

  /* ———— csh: the pure half is compiled + executed ———— */
  await guard('S10 A csh', async () => {
    const proj = rd('scripts/csh/csh.csproj');
    const t = existsSync(join(root, 'scripts/csh/S10MediaTests.cs')) ? rd('scripts/csh/S10MediaTests.cs') : '';
    ok(/<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S10MediaRules\.cs" \/>/.test(proj) && /\[TestClass\]\s*public class S10MediaTests/.test(t)
      && count(t, /\[TestMethod\]/g) === 6,
      'S10 A csh: S10MediaRules.cs is compiled by the C# harness and executed by S10MediaTests (6 tests; run: node scripts/run-csh.mjs)');
  });
}
