/* ==== S12 D — ★ #1266 / #1267: the viewer's Save on Windows — the PROBE + the CANDIDATE (C#) ====
 * WALK #1266: on Windows the viewer's Save sent `ixian:savePhoto:<id>` 8× and C# logged and showed nothing (Android
 * works). C# is UNCOMPILED here and MAUI / WinUI-bound: these pins read the source (stripCode — comments out) and pin
 * the touched bodies WHOLE (whitespace-normalised, the S11 g-cs.mjs rule — any one-token edit fails). The pure half
 * (S11MediaRules.savePhotoLine · saveOutcome) is EXECUTED by the C# harness (scripts/csh/S12SaveTests.cs).
 *   PROBE     · onSavePhoto names every exit ONCE — `[P1] savephoto r=parse|nomsg|notfile|nopath|lookup|start|fail`
 *               (noteSavePhoto: dev builds only, a known code only — never the id, the name or a path);
 *   OBSERVED  · Windows keeps the saveAs task and observes it (observeSavePhoto → r=ok|cancel|fail, an exception's TYPE);
 *   CANDIDATE · Windows SFileOperations.saveAs: a share-tolerant open (FileShare.ReadWrite | Delete), FileSaver on the
 *               UI thread (marshalled when off it — the BackupPage.xaml.cs:210 shape), a cancel = no toast, a failure =
 *               its TYPE logged + the toast kept, IOException or UnauthorizedAccessException on the open → its TYPE + fail (D2 #46 R1-MINOR-2); `share` keeps its Task<Task<bool>>
 *               shape for the backup (BackupPage.shareBackup unchanged) and is true only for SaveOk.
 * Deliberate breaks: see the S12 D report. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const bodyOf = (sc, head) => {
    const at = sc.indexOf(head);
    if (at < 0) return '';
    let i = sc.indexOf('{', at + head.length - 1);
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
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const whole = (body, expected) => body.length > 0 && norm(body) === norm(expected);
  const count = (t, re) => (t.match(re) || []).length;
  const cs = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const win = stripCode(rd('Spixi/Platforms/Windows/SFileOperations.cs'));
  const rules = stripCode(rd('Spixi/Utils/S11MediaRules.cs'));
  const bp = stripCode(rd('Spixi/Pages/Settings/BackupPage.xaml.cs'));
  const r = {};

  /* PROBE — onSavePhoto, WHOLE: one reason per exit, Windows keeps the task, the other platforms' calls unchanged */
  r.onSave = whole(bodyOf(cs, 'private void onSavePhoto(string tail)'), `{
      if (!S11MediaRules.parseSavePhoto(tail, out string hexId)) { noteSavePhoto("parse"); return; }
      string? path = null; string name = ""; string reason;
      try { FriendMessage? fm = friend == null ? null : friend.getMessage(selectedChannel, Crypto.stringToHash(hexId));
        if (fm == null) { reason = "nomsg"; }
        else if (fm.type == FriendMessageType.fileHeader && (fm.completed || fm.localSender)
          && SharedItems.parseFileHeader(fm.message, out string n, out _) && SharedItems.isImageName(n))
        { path = SharedItems.localPathOf(fm); name = n; reason = "nopath"; }
        else { reason = "notfile"; } }
      catch (Exception e) { Logging.warn("savePhoto lookup failed: " + e.GetType().Name); path = null; reason = "lookup"; }
      if (path == null) { noteSavePhoto(reason); return; }
#if WINDOWS
      Task<string>? saving = null;
#endif
      string started = "start";
      try {
#if ANDROID
        SFileOperations.saveFile(path, name, S11MediaRules.imageMimeOf(name));
#elif WINDOWS
        saving = SFileOperations.saveAs(path);
#elif IOS || MACCATALYST
        _ = SFileOperations.share(path, name);
#endif
      }
      catch (Exception e) { Logging.warn("savePhoto failed: " + e.GetType().Name); started = S11MediaRules.SaveFail; }
      noteSavePhoto(started);
#if WINDOWS
      if (saving != null) { _ = observeSavePhoto(saving); }
#endif
    }`);
  r.note = whole(bodyOf(cs, 'private static void noteSavePhoto(string code)'), `{
      if (!P1Perf.enabled) { return; }
      string? line = S11MediaRules.savePhotoLine(code);
      if (line != null) { P1Perf.line(line); } }`);
  r.observe = whole(bodyOf(cs, 'private static async Task observeSavePhoto(Task<string> saving)'), `{
      string outcome;
      try { outcome = await saving; }
      catch (OperationCanceledException) { outcome = S11MediaRules.SaveCancel; }
      catch (Exception e) { Logging.warn("savePhoto failed: " + e.GetType().Name); outcome = S11MediaRules.SaveFail; }
      noteSavePhoto(outcome); }`)
    /* the observer exists for Windows only, and it is the ONLY consumer of the task */
    && /#if WINDOWS\s*private static async Task observeSavePhoto\(Task<string> saving\)/.test(cs)
    && count(cs, /observeSavePhoto\(/g) === 2 && count(cs, /noteSavePhoto\(/g) === 5 && count(cs, /SFileOperations\.saveAs\(/g) === 1;

  /* CANDIDATE — Windows SFileOperations, WHOLE */
  r.share = whole(bodyOf(win, 'public static async Task<Task<bool>> share(string filepath, string title)'), `{
      string outcome = await saveAs(filepath);
      return Task.FromResult(outcome == S11MediaRules.SaveOk); }`);
  r.saveAs = whole(bodyOf(win, 'public static async Task<string> saveAs(string filepath)'), `{
      try { string fileName = Path.GetFileName(filepath);
        using FileStream fileStream = new FileStream(filepath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        FileSaverResult fileSaverResult = MainThread.IsMainThread
          ? await FileSaver.Default.SaveAsync(fileName, fileStream, CancellationToken.None)
          : await MainThread.InvokeOnMainThreadAsync(async () => await FileSaver.Default.SaveAsync(fileName, fileStream, CancellationToken.None));
        string outcome = S11MediaRules.saveOutcome(fileSaverResult.IsSuccessful, fileSaverResult.Exception is OperationCanceledException);
        if (outcome == S11MediaRules.SaveFail) {
          Logging.warn("share failed: " + (fileSaverResult.Exception?.GetType().Name ?? "none"));
          try { await Toast.Make("The file was not saved. Error: " + (fileSaverResult.Exception?.Message ?? "")).Show(CancellationToken.None); }
          catch (Exception e) { Logging.warn("share toast failed: " + e.GetType().Name); } }
        return outcome; }
      catch (Exception e) when (e is IOException || e is UnauthorizedAccessException) { Logging.warn("share failed: " + e.GetType().Name); return S11MediaRules.SaveFail; } }`)
    && !/File\.OpenRead\(/.test(win) && !/\.Exception\.Message/.test(win);
  /* the backup caller is UNCHANGED (BackupPage.xaml.cs:166-175) */
  r.backup = whole(bodyOf(bp, 'private static async Task<bool?> shareBackup(string path, string title)'), `{
#if WINDOWS
      return await (await SFileOperations.share(path, title));
#elif ANDROID
      return await SFileOperations.share(path, title);
#else
      await SFileOperations.share(path, title);
      return null;
#endif
    }`);
  /* every log line in the touched C# = a fixed text + an exception TYPE (never a message, an id, a name or a path) */
  const logs = [bodyOf(cs, 'private void onSavePhoto(string tail)'), bodyOf(cs, 'private static async Task observeSavePhoto(Task<string> saving)'),
    bodyOf(win, 'public static async Task<string> saveAs(string filepath)')].join('\n').match(/Logging\.\w+\([^;]*\);/g) || [];
  r.logsTypeOnly = logs.length === 6 && logs.every((l) => /^Logging\.warn\("[^"]+" \+ (?:e\.GetType\(\)\.Name|\(fileSaverResult\.Exception\?\.GetType\(\)\.Name \?\? "none"\))\);$/.test(l));

  /* the pure half: whole, and the harness runs it */
  r.rules = whole(bodyOf(rules, 'public static string saveOutcome(bool successful, bool cancelled)'), `{ return successful ? SaveOk : (cancelled ? SaveCancel : SaveFail); }`)
    && whole(bodyOf(rules, 'public static string? savePhotoLine(string? code)'), `{ if (code == null || Array.IndexOf(savePhotoCodes, code) < 0) { return null; } return "savephoto r=" + code; }`)
    /* ★ S12 D2 (#46 R1-NIT-5): the whitelist array is PRIVATE; callers get a read-only wrapper */
    && /private static readonly string\[\] savePhotoCodes = \{ "parse", "nomsg", "notfile", "nopath", "lookup", "start", SaveOk, SaveCancel, SaveFail \};/.test(rules)
    && /public static readonly IReadOnlyList<string> SavePhotoCodes = Array\.AsReadOnly\(savePhotoCodes\);/.test(rules)
    && !/public static readonly string\[\]/.test(bodyOf(rules, 'public static class S11MediaRules'))
    && /public const string SaveOk = "ok";\s*public const string SaveCancel = "cancel";\s*public const string SaveFail = "fail";/.test(rules);
  r.csh = /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S11MediaRules\.cs" \/>/.test(rd('scripts/csh/csh.csproj'))
    && /\[TestClass\]\s*public class S12SaveTests/.test(rd('scripts/csh/S12SaveTests.cs'));
  ok(Object.values(r).every((x) => x === true),
    '★ S12 D (#1266 / #1267) Windows Save: onSavePhoto names every exit once (`[P1] savephoto r=parse|nomsg|notfile|nopath|lookup|start|fail`, a known code only); Windows keeps the saveAs task and observes it (r=ok|cancel|fail, an exception TYPE); saveAs opens share-tolerant, runs FileSaver on the UI thread, toasts nothing on a cancel, logs a failure\'s TYPE only; share keeps Task<Task<bool>> for the unchanged backup caller (bodies WHOLE) — ' + JSON.stringify(r));
}
