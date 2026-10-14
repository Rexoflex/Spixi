/* ==== S20 S — E (#1376, P29): the file size in BOTH directions, C# side, behind SpixiFlags.S20FileSize ====
 * The pure rule (S11MediaRules.fileSizeArg: received = the header size · sent in flight = the outgoing transfer · sent
 * and done = the local copy's length) runs in the C# harness (scripts/csh/S11MediaTests.cs). The call site is MAUI-bound
 * and UNCOMPILED here, so this module reads the comment-stripped source:
 *   · addFile arg 20 = the S20 rule when the flag is on, the S11 offerSizeArg (received offers only) otherwise;
 *   · fileSizeArgOf, WHOLE: the transfer looked up only for a non-empty id and kept only on an EXACT uid match
 *     (getOutgoingTransfer matches with Contains); the disk read = one FileInfo.Length on SharedItems.localPathOf (C#'s own
 *     path, never a WebView value) — for a finished sent row only when localArgOf said "1", for an unfinished sent row only
 *     when no live transfer answered (★ #46 S20 r1, auditor B MINOR: the restart case); any throw → ""; fileSize never written;
 *   · the flag: default ON, the int pref `flagS20FileSize`, a stored 0 acts only in dev mode (S16PassRules.effectiveFlag),
 *     one fixed [FLAGS] line; DevPage `ixian:devflash:s20size:<0|1>` (dev mode + the exact tail) routed BEFORE the generic
 *     devflash branch, and its own guarded push `setFlagsDevS20` (the 4-digit setFlagsDev stays as it was).
 * Deliberate breaks (S20 S report): the exact-uid test dropped → `body` fails; (#46 r1) the restart fallback dropped →
 * `body` fails; the s20size branch moved after the generic
 * devflash branch → `dev` fails; the flag's default set to false → `flag` fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
  const cs = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  const fl = rd('Spixi/Utils/SpixiFlags.cs');
  const dev = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const rules = rd('Spixi/Utils/S11MediaRules.cs');
  const bodyOf = (sc, head) => {
    const at = sc.indexOf(head);
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
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const r = {}, n = {};
  /* the call site */
  r.site = /string fSize = SpixiFlags\.S20FileSize \? fileSizeArgOf\(message, fBytes, fLocal\) : S11MediaRules\.offerSizeArg\(message\.localSender, message\.completed, fBytes\);/.test(cs)
    && /push\(batch, "addFile",[^;]*fGroup, fPlayed, fSize\);/.test(cs)
    && cs.indexOf('string fLocal = SharedItems.localArgOf(message, out string fCase);') < cs.indexOf('string fSize = SpixiFlags.S20FileSize');
  /* the helper, WHOLE */
  const body = bodyOf(cs, 'private static string fileSizeArgOf(FriendMessage message, ulong headerBytes, string fLocal)');
  n.body = norm(body).slice(0, 200);
  r.body = norm(body) === norm(`{ ulong outgoing = 0; long local = -1;
      try { if (message.localSender && !message.completed) { string id = message.transferId ?? ""; if (id.Length > 0) {
          FileTransfer? t = TransferManager.getOutgoingTransfer(id); if (t != null && t.uid == id) { outgoing = t.fileSize; } }
          if (outgoing == 0) { string? path = SharedItems.localPathOf(message); if (path != null) { local = new FileInfo(path).Length; } } }
        else if (message.localSender && fLocal == "1") { string? path = SharedItems.localPathOf(message); if (path != null) { local = new FileInfo(path).Length; } } }
      catch (Exception) { outgoing = 0; local = -1; }
      return S11MediaRules.fileSizeArg(message.localSender, message.completed, headerBytes, outgoing, local); }`)
    && !/fileSize\s*=/.test(body.replace(/outgoing = t\.fileSize;/, ''));
  r.rule = /public static string fileSizeArg\(bool localSender, bool completed, ulong headerBytes, ulong outgoingBytes, long localFileBytes\)/.test(rules)
    && /public static string fileSizeFlagLine\(bool on\) => "\[FLAGS\] s20filesize=" \+ \(on \? "1" : "0"\);/.test(rules);
  /* the flag */
  const init = bodyOf(fl, 'public static void init()');
  r.flag = /public const string S20FileSizeKey = "flagS20FileSize";/.test(fl) && /public static bool S20FileSize \{ get; private set; \} = true;/.test(fl)
    && /fs = Preferences\.Default\.Get\(S20FileSizeKey, 1\);/.test(init) && /S20FileSize = S16PassRules\.effectiveFlag\(dev, fs\);/.test(init)
    && /Logging\.info\(S11MediaRules\.fileSizeFlagLine\(S20FileSize\)\);/.test(init);
  /* the dev switch */
  const iS = dev.indexOf('current_url.StartsWith("ixian:devflash:s20size:", StringComparison.Ordinal)');
  const iG = dev.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)');
  const vb = iS < 0 ? '' : bodyOf(dev.slice(iS), 'current_url.StartsWith("ixian:devflash:s20size:"');
  const pf = bodyOf(dev, 'private void pushFlagsDev()');
  n.dev = { iS, iG };
  r.dev = iS > 0 && iG > 0 && iS < iG
    && /if \(Preferences\.Default\.Get\("devMode", false\)\s*&& S16PassRules\.parseFlagTail\(current_url\.Substring\("ixian:devflash:s20size:"\.Length\), out int value\)\)\s*\{\s*Preferences\.Default\.Set\(SpixiFlags\.S20FileSizeKey, value\);\s*\}/.test(vb)
    && /pushFlagsDev\(\);\s*\}$/.test(vb)
    && /fs = Preferences\.Default\.Get\(SpixiFlags\.S20FileSizeKey, 1\);/.test(pf)
    && /Utils\.sendUiCommand\(this, "window\.setFlagsDevS20", fs == 0 \? "0" : "1"\);/.test(pf)
    && /Utils\.sendUiCommand\(this, "window\.setFlagsDev", \(sp == 0 \? "0" : "1"\) \+ "," \+ \(mg == 0 \? "0" : "1"\) \+ "," \+ \(sb == 0 \? "0" : "1"\) \+ "," \+ \(sm == 0 \? "0" : "1"\)\);/.test(pf);
  const c = (k, m) => ok(r[k] === true, m + (r[k] === true ? '' : ' — ' + JSON.stringify({ [k]: r[k], n }).slice(0, 900)));
  c('site', '★ S20 E (#1376, P29): addFile arg 20 = fileSizeArgOf when SpixiFlags.S20FileSize, else the S11 offerSizeArg (the OFF path), after localArgOf');
  c('body', '★ S20 E (P29): fileSizeArgOf — the outgoing transfer only for a non-empty id AND an exact uid; one FileInfo.Length on SharedItems.localPathOf only when fLocal is "1" (finished) or no live transfer answered (unfinished, #46 r1); a throw → ""; message.fileSize never written');
  c('rule', '★ S20 E (P29): the pure rule + the fixed [FLAGS] line live in S11MediaRules (executed in csh S11MediaTests)');
  c('flag', '★ S20 E (P29): SpixiFlags.S20FileSize — default ON, pref flagS20FileSize, a stored 0 only in dev mode (effectiveFlag), one [FLAGS] line');
  c('dev', '★ S20 E (P29): DevPage ixian:devflash:s20size:<0|1> — before the generic devflash branch, dev mode + the exact tail, echo; its own push setFlagsDevS20; setFlagsDev keeps 4 digits');
}
