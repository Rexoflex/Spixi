/* ==== filewalk item S — THE DEV FILE SEED (seed index 53 documents, 54 voice, 55 the 100-message photo chat), the source half.
 *
 * Spixi/Utils/SDevSeed.cs seeds the three file chats (seedFileChats / unseedFileChats / fileChatsPresent and the helpers
 * fileChatStateOf, ensureFileChatFile, deleteFileChatTmp); Spixi/Utils/SDevSeedPlan.cs § 3 is their pure half, EXECUTED by
 * scripts/csh/FileWalkSeedTests.cs. SDevSeed.cs compiles nowhere here, so these are SOURCE checks on the masked text (comments →
 * spaces, strings kept — the e-image-seed mask); every reported `file:line` is a line of the raw file. One `ok` per key (18):
 *   a1  devOnly        — both seed files are WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif`, the new code included
 *   a2  noNetwork      — no network token in the file-chat glue or the plan's § 3
 *   a3  fileCalls      — the file-chat glue makes EXACTLY its listed file calls
 *   a4  pathsFromRoots — every variable those calls take is assigned only from C#'s roots (Config.spixiUserFolder + "Sent" /
 *                        SDevSeedPlan.VoiceFolderName, TransferManager.downloadsPath) and the plan's leaf builders
 *   a5  planNames      — the plan builds every name from (i, j), fixed words, SHA-256 hex and the row's FIXED time; § 3 touches no disk
 *   a6  nameGuard      — the seed refuses (fail closed) a leaf that is not the shape the app's own rule builds, before any write
 *   a7  proofBeforeDelete — each of the glue's 2 File.Delete calls sits behind the content proof (mayDelete) or the exact temp leaf
 *   a8  stateFromContent  — the state comes from SDevSeedPlan.fileState over the file's bytes only; the write is refused unless absent
 *   a9  tmpInSent      — the temp leaf lives in Sent/ only, with its OWN salt ("filetmp:") and the app's pending-name shape
 *   a10 hooks          — exactly ONE added statement in seed(profile), unseed() and status(), each where the contract says
 *   a11 logsTypesOnly  — every new log line starts with [DEVSEED] and carries indexes and exception TYPE names only
 *   a12 nicks          — the three nicks, built by the "Seed NN " shape
 *   a13 rows           — addressFor(i) / SDevSeedPlan.rowIdFor(i, m) (walktools item 4; was messageIdFor(i, m.j)), the app's row shapes, `completed` before `filePath`, the exact
 *                        fileSize of a received row, requestWriteMessages + friend.save() after each chat
 *   a14 unseedRemoves  — unseed's ONE removal loop (removeFriend + forgetContact) covers the file chats (its bound = FileChatFirst +
 *                        FileChats, which follow the image chats without a gap); unseedFileChats removes no contact and touches the
 *                        files of a REMOVED chat only
 *   a15 fixedTimes     — the file half reads no clock; the newest message of chat k = ImageAnchor − (3 + k) h
 *   a16 voiceApp       — the voice bytes use the app's own codec calls: the F8 FF FE packet, muxOgg with the app's pre-skip and the
 *                        plan's serial, the inline text = humanLine + "\n" + encodeInline
 *   a17 glueFrozen     — (#46 r1 S-S-3) the WHOLE normalised bodies of every new glue method, as SHA-256 (the e-image-seed row 11 method)
 *   a18 completeSkip   — (#46 r1 C-S-1, r2 B2-5) a PRESENT file chat is written only with an EMPTY Core list; its newest row there →
 *                        skip; otherwise partial (no write, "Remove the seed, then Seed") — the rule is SDevSeedPlan.topUpAction (CSH)
 * Deliberate breaks (#802, the filewalk report): one one-token mutation per key in a full copy of the tree, each red for that key only. */
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const mask = (t) => {
    const out = t.split('');
    const n = t.length;
    const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
    const str = (i, verbatim, interp) => {
      i++;
      while (i < n) {
        const c = t[i];
        if (verbatim) { if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return i + 1; } }
        else { if (c === '\\') { i += 2; continue; } if (c === '"') return i + 1; if (c === '\n') return i; }
        if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
        i++;
      }
      return i;
    };
    const code = (i, hole) => {
      let depth = 0;
      while (i < n) {
        const c = t[i], d = t[i + 1];
        if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
        if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
        if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); i += m ? m[0].length : 1; continue; }
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
  const lineOf = (t, i) => t.slice(0, i).split('\n').length;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* the method (signature + body) that starts at the regex match; '' when absent */
  const method = (src, re) => {
    const m = re.exec(src); if (!m) return '';
    const k = src.indexOf('{', m.index); let depth = 0;
    for (let x = k; x < src.length; x++) { if (src[x] === '{') depth++; else if (src[x] === '}') { depth--; if (depth === 0) return src.slice(m.index, x + 1); } }
    return '';
  };
  const bodyN = (src, re) => { const t = method(src, re); const k = t.indexOf('{'); return k < 0 ? '' : norm(t.slice(k + 1, -1)); };

  const SEED = 'Spixi/Utils/SDevSeed.cs', PLAN = 'Spixi/Utils/SDevSeedPlan.cs';
  const S = mask(raw(SEED)), P = mask(raw(PLAN));
  const G = {
    seed: method(S, /private static string seedFileChats\(\)/), state: method(S, /private static string fileChatStateOf\(/),
    ensure: method(S, /private static int ensureFileChatFile\(/), delTmp: method(S, /private static int deleteFileChatTmp\(/),
    unseed: method(S, /private static string unseedFileChats\(\)/), present: method(S, /private static int fileChatsPresent\(\)/),
    ids: method(S, /private static List<byte\[\]\?>\? presentIds\(Friend friend\)/),
  };
  const glue = Object.values(G).join('\n');
  const planSec = (() => { const a = P.indexOf('public const int FileChatFirst ='), b = P.indexOf('private static readonly byte[] Signature'); return a < 0 || b < a ? '' : P.slice(a, b); })();
  const glueOk = Object.values(G).every((x) => x.length > 100) && planSec.length > 5000;
  const at = (src, f, idx) => f + ':' + lineOf(src, idx);

  /* ── a1 devOnly ── */
  {
    const r = {};
    for (const [f, t] of [[SEED, S], [PLAN, P]]) {
      const lines = t.split('\n');
      const dir = lines.map((l, k) => [k + 1, l.trim()]).filter(([, l]) => /^#(if|elif|else|endif)\b/.test(l));
      const firstCode = lines.findIndex((l) => l.trim().length > 0) + 1;
      let lastCode = 0; lines.forEach((l, k) => { if (l.trim().length > 0) lastCode = k + 1; });
      let depth = 0, closes = 0, other = 0;
      for (const [, l] of dir) { if (/^#if\b/.test(l)) depth++; else if (/^#endif\b/.test(l)) { depth--; if (depth === 0) closes++; } else other++; }
      const opens = dir.length > 0 && dir[0][0] === firstCode && /^#if SPIXI_DEV_COEXIST\s*$/.test(dir[0][1]);
      const last = dir.length > 0 && dir[dir.length - 1][0] === lastCode && /^#endif\b/.test(dir[dir.length - 1][1]);
      r[f] = opens && last && closes === 1 && depth === 0 && other === 0;
    }
    const inside = (t, needle) => { const i = t.indexOf(needle), a = t.indexOf('#if SPIXI_DEV_COEXIST'), b = t.lastIndexOf('#endif'); return i > a && a >= 0 && i < b; };
    r.newCodeInside = glueOk && inside(S, 'private static string seedFileChats()') && inside(S, 'private static string unseedFileChats()') && inside(P, 'public static List<FileMsg> filePlan(int i)');
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a1 devOnly): SDevSeed.cs and SDevSeedPlan.cs are WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif` (one outer block, opened on the first code line, closed on the last, nothing else at its level) and the file-chat code sits inside it — a store build compiles none of it — ' + JSON.stringify(r));
  }

  /* ── a2 noNetwork ── */
  {
    const NET = /https?:|\bHttpClient\b|\bWebRequest\b|\bWebClient\b|\bSocket\b|\bTcpClient\b|\bUdpClient\b|\bSystem\.Net\b|\bDns\.|\bLauncher\b|\bBrowser\.|\bNode\.|\bStreamProcessor\.|\bCoreStreamProcessor\.|\bsendChatMessage\b|\bgetPresence/g;
    const hits = [...(glue + '\n' + planSec).matchAll(NET)].map((m) => m[0]);
    ok(glueOk && hits.length === 0, '★ filewalk seed (a2 noNetwork): the file-chat glue and the plan\'s § 3 hold no network token (no URL, HttpClient, WebRequest, WebClient, Socket, Dns, Launcher, Browser) and no app send path (Node., StreamProcessor., CoreStreamProcessor., sendChatMessage, getPresence) — Core\'s FriendList.addMessageWithType stores the rows locally — ' + JSON.stringify({ glueOk, hits }));
  }

  /* ── a3 fileCalls ── */
  const callAt = (src, start) => { const k = src.indexOf('(', start); let depth = 0; for (let x = k; x < src.length; x++) { if (src[x] === '(') depth++; else if (src[x] === ')') { depth--; if (depth === 0) return norm(src.slice(start, x + 1)); } } return norm(src.slice(start)); };
  {
    const ops = [...glue.matchAll(/\b(?:File|Directory)\.\w+\s*\(|\bnew\s+(?:FileInfo|DirectoryInfo|FileStream|StreamWriter|StreamReader)\s*\(|\bFileMode\.|\bStream\b/g)].map((m) => callAt(glue, m.index));
    const WANT = {
      'Directory.CreateDirectory(fSent)': 1, 'Directory.CreateDirectory(fRecv)': 1, 'Directory.CreateDirectory(fVoice)': 1,
      'new FileInfo(fPath)': 1, 'File.ReadAllBytes(fPath)': 1, 'File.WriteAllBytes(fTmp, fBytes)': 1,
      'File.Move(fTmp, fPath)': 1, 'File.Exists(fTmp)': 1, 'File.Delete(fTmp)': 1, 'File.Delete(fPath)': 1,
    };
    const got = {}; for (const o of ops) got[o] = (got[o] || 0) + 1;
    const exact = JSON.stringify(Object.keys(got).sort().map((k) => [k, got[k]])) === JSON.stringify(Object.keys(WANT).sort().map((k) => [k, WANT[k]]));
    ok(glueOk && exact, '★ filewalk seed (a3 fileCalls): the file-chat glue makes EXACTLY its listed file calls — create the Sent / Downloads / Voice folders, read the size and the bytes of a file under our name, write the temp leaf, move it into place (two arguments — on Unix a stat + rename that can replace a file that appeared between the two, so a8 proves the content again after the move), test and delete our temp, delete a proven file — ' + JSON.stringify({ exact, got }));
  }

  /* ── a4 pathsFromRoots ── */
  {
    const ALLOWED = {
      fPresent: ['false', 'true'], fTopUp: ['SDevSeedPlan.topUpAction(presentIds(friend), i)'], fBytes: ['SDevSeedPlan.fileBytes(i, m)'],
      fSent: ['Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName)'],
      fRecv: ['TransferManager.downloadsPath'],
      fVoice: ['Path.Combine(Config.spixiUserFolder, SDevSeedPlan.VoiceFolderName)'],
      fDirsOk: ['Path.IsPathRooted(fSent) && Path.IsPathRooted(fRecv) && Path.IsPathRooted(fVoice)'],
      fFolder: ['SDevSeedPlan.folderOf(m)'],
      fDir: ['fFolder == SDevSeedPlan.FolderSent ? fSent : fFolder == SDevSeedPlan.FolderVoice ? fVoice : fRecv'],
      fLeaf: ['SDevSeedPlan.fileLeaf(i, m)'],
      fPath: ['Path.Combine(fDir, fLeaf)'],
      fTmp: ['Path.Combine(fSent, SDevSeedPlan.fileTmpLeaf(i, m.j))', 'Path.Combine(fSent, fTmpName)'],
      fTmpName: ['SDevSeedPlan.fileTmpLeaf(i, j)'],
      fInfo: ['new FileInfo(fPath)'], fState: ['fileChatStateOf(fPath, i, m)'], fAction: ['SDevSeedPlan.fileAction(fileChatStateOf(fPath, i, m))'],
    };
    const bad = []; let assigns = 0;
    /* the one parameter default (fileChatStateOf's `byte[]? fWant = null`: the bytes just written, else the plan's) is not an assignment */
    const sigOk = (glue.match(/private static string fileChatStateOf\(string fPath, int i, SDevSeedPlan\.FileMsg m, byte\[\]\? fWant = null\)/g) || []).length === 1;
    const glueA = glue.replace('byte[]? fWant = null)', 'byte[]? fWant)');
    for (const m of glueA.matchAll(/(?<![\w.])(?:string|bool)?\s*\b(f[A-Z]\w*)\s*=(?!=)\s*([^;]+);/g)) {
      assigns++;
      if (!ALLOWED[m[1]] || !ALLOWED[m[1]].includes(norm(m[2]))) bad.push(m[1] + ' = ' + norm(m[2]));
    }
    /* the helpers' path parameters are only ever these arguments */
    const calls = [...S.matchAll(/(?<!(?:int|string) )\b(ensureFileChatFile|fileChatStateOf|deleteFileChatTmp)\s*\(/g)].map((m) => callAt(S, m.index));
    const CALLS = ['ensureFileChatFile(fSent, fPath, i, m)', 'fileChatStateOf(fPath, i, m)', 'fileChatStateOf(fPath, i, m, fBytes)', 'deleteFileChatTmp(fSent, i, m.j)'];
    const callsOk = calls.length === 6 && calls.every((c) => CALLS.includes(c));
    const verbs = [...S.matchAll(/public\s+static\s+string\s+(\w+)\s*\(([^)]*)\)/g)].map((m) => m[1] + '(' + norm(m[2]) + ')');
    const r = { assigns, bad, calls, callsOk, verbs: JSON.stringify(verbs) === JSON.stringify(['seed()', 'seed(string profile)', 'unseed()', 'status()']) };
    ok(glueOk && sigOk && assigns === 26 && bad.length === 0 && callsOk && r.verbs, '★ filewalk seed (a4 pathsFromRoots): every path of the file-chat glue is built from C#\'s own roots — Config.spixiUserFolder + PhotoRules.SentFolderName / SDevSeedPlan.VoiceFolderName, TransferManager.downloadsPath — and the plan\'s leaf builders (fileLeaf, fileTmpLeaf); the helpers take only those values; the public verbs still take no string but `profile` (no WebView value reaches a file call) — ' + JSON.stringify(r));
  }

  /* ── a5 planNames ── */
  {
    const planIo = [...planSec.matchAll(/\bSystem\.IO\b|\b(?:File|Directory|Path)\.\w+|\bFileStream\b|\bFileInfo\b|\bStream\b/g)].map((m) => m[0]);
    const W = {
      fileName: 'if (m.kind == KindVoiceFile) { return VoiceCodec.voiceFileName(DateTimeOffset.FromUnixTimeSeconds(m.ts).UtcDateTime); } return FileTag + "-" + (i + 1).ToString("00", CultureInfo.InvariantCulture) + "-" + m.j.ToString("000", CultureInfo.InvariantCulture) + m.ext;',
      fileLeaf: 'return m.local && m.kind != KindVoiceFile ? transferUid(i, m.j) + m.ext : fileName(i, m);',
      folderOf: 'if (!hasFile(m)) { return ""; } if (!m.local) { return FolderDownloads; } return m.kind == KindVoiceFile ? FolderVoice : FolderSent;',
      fileHeaderText: 'string head = transferUid(i, m.j) + ":" + fileName(i, m); return m.local ? head : head + ":" + fileLength(m).ToString(CultureInfo.InvariantCulture);',
    };
    const got = {
      fileName: bodyN(P, /public static string fileName\(int i, FileMsg m\)/), fileLeaf: bodyN(P, /public static string fileLeaf\(int i, FileMsg m\)/),
      folderOf: bodyN(P, /public static string folderOf\(FileMsg m\)/), fileHeaderText: bodyN(P, /public static string fileHeaderText\(int i, FileMsg m\)/),
    };
    const r = Object.fromEntries(Object.keys(W).map((k) => [k, got[k] === W[k]]));
    r.voiceFolder = /public const string VoiceFolderName = "Voice";/.test(P);
    r.exts = /private static readonly string\[\] DocExts = \{ "\.pdf", "\.docx", "\.xlsx", "\.pptx", "\.txt", "\.csv", "\.zip", "\.odt", "\.epub", "\.mp3" \};/.test(P);
    r.photoExt = /ext = "\.png", width = SizeW\[s\], height = SizeH\[s\]/.test(planSec) && /ext = "\.ogg", seconds = VoiceFileSeconds\[fileNo\+\+\]/.test(planSec);
    r.noIo = planSec.length > 5000 && planIo.length === 0;
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a5 planNames): the plan builds every name from the seed index, j, fixed words, SHA-256 hex (transferUid) and the row\'s FIXED time (VoiceCodec.voiceFileName of the planned ts) — fileName, fileLeaf, folderOf and fileHeaderText are pinned whole, the folder literal is the app\'s "Voice", the extensions are the fixed list (no video), § 3 touches no disk — ' + JSON.stringify({ ...r, planIo, got: Object.fromEntries(Object.keys(W).filter((k) => !r[k]).map((k) => [k, got[k]])) }));
  }

  /* ── a6 nameGuard ── */
  {
    const s = norm(G.seed);
    const GUARD = 'string fPath = Path.Combine(fDir, fLeaf); long size = SDevSeedPlan.fileLength(m); if (!SDevSeedPlan.leafShapeOk(i, m, fLeaf) || (fFolder == SDevSeedPlan.FolderSent && PhotoRules.sentFileName(SDevSeedPlan.transferUid(i, m.j), m.ext) != fLeaf) || (m.kind == SDevSeedPlan.KindVoiceFile && !VoiceCodec.isVoiceFileName(fLeaf)) || (fFolder == SDevSeedPlan.FolderDownloads && !TransferManager.isInsideDownloadsRoot(fPath))) { refused++; continue; } int wrote = ensureFileChatFile(fSent, fPath, i, m); if (wrote < 0) { refused++; continue; }';
    const plan = bodyN(P, /public static bool leafShapeOk\(int i, FileMsg m, string\? leaf\)/);
    const PW = 'if (leaf == null || !hasFile(m) || leaf != fileLeaf(i, m) || PhotoRules.sentExtension(leaf) != m.ext || m.ext.Length == 0) { return false; } string folder = folderOf(m); if (folder == FolderSent) { return PhotoRules.sentFileName(transferUid(i, m.j), m.ext) == leaf && PhotoRules.isSentCopyName(leaf); } if (m.kind == KindVoiceFile) { return VoiceCodec.isVoiceFileName(leaf); } return folder == FolderDownloads && PhotoRules.SafeFileName(leaf) == leaf && !PhotoRules.isVideoName(leaf);';
    const u = norm(G.unseed);
    const r = { seedGuard: s.includes(GUARD), planRule: plan === PW, unseedGuard: u.includes('if (!SDevSeedPlan.leafShapeOk(i, m, fLeaf) || (fFolder == SDevSeedPlan.FolderDownloads && !TransferManager.isInsideDownloadsRoot(fPath))) { continue; } string fState = fileChatStateOf(fPath, i, m);') };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a6 nameGuard): fail closed BEFORE any write — the seed refuses a file row whose leaf is not the plan\'s and the shape of the app\'s own rule for its folder (Sent/: PhotoRules.sentFileName with an allow-listed extension; a voice file: VoiceCodec.isVoiceFileName; Downloads/: inside TransferManager.isInsideDownloadsRoot, unchanged by the receive sanitizer, no video name); the unseed checks the same before it reads a file — ' + JSON.stringify({ ...r, planGot: r.planRule ? 'equal' : plan }));
  }

  /* ── a7 proofBeforeDelete ── */
  {
    const dels = [...glue.matchAll(/File\.Delete\(/g)].map((m) => norm(glue.slice(Math.max(0, m.index - 200), m.index + 30)));
    const r = {
      count: dels.length === 2 && (S.match(/File\.Delete\(/g) || []).length === 4,
      tmp: dels.some((d) => /if \(SDevSeedPlan\.mayDeleteFileTmp\(fTmpName, i, j\) && File\.Exists\(fTmp\)\) \{ File\.Delete\(fTmp\);/.test(d)),
      proof: dels.some((d) => /string fState = fileChatStateOf\(fPath, i, m\); if \(SDevSeedPlan\.mayDelete\(fState\)\) \{ File\.Delete\(fPath\);/.test(d))
        && norm(G.unseed).includes('if (SDevSeedPlan.mayDelete(fState)) { File.Delete(fPath); deleted++; } else if (fState == SDevSeedPlan.StateForeign) { refused++; }'),
      planRule: /public static bool mayDelete\(string state\)\s*\{\s*return state == StateOurs;\s*\}/.test(P),
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a7 proofBeforeDelete): the glue\'s two File.Delete calls sit behind the proof — a file only when SDevSeedPlan.mayDelete(state) (its SHA-256 = our bytes; a foreign file is counted as refused and stays), the temp only by its exact leaf in Sent/ (mayDeleteFileTmp) — ' + JSON.stringify({ ...r, dels }));
  }

  /* ── a8 stateFromContent ── */
  {
    const W = {
      state: 'FileInfo fInfo = new FileInfo(fPath); return SDevSeedPlan.fileState(fInfo.Exists, fInfo.Exists ? fInfo.Length : 0, SDevSeedPlan.fileLength(m), () => File.ReadAllBytes(fPath), () => fWant ?? SDevSeedPlan.fileBytes(i, m));',
      ensure: 'string fAction = SDevSeedPlan.fileAction(fileChatStateOf(fPath, i, m)); if (fAction == SDevSeedPlan.FileKeep) { return 0; } if (fAction != SDevSeedPlan.FileWrite) { return -1; } string fTmp = Path.Combine(fSent, SDevSeedPlan.fileTmpLeaf(i, m.j)); byte[] fBytes = SDevSeedPlan.fileBytes(i, m); try { File.WriteAllBytes(fTmp, fBytes); File.Move(fTmp, fPath); } catch (Exception) { try { deleteFileChatTmp(fSent, i, m.j); } catch (Exception) { } throw; } return fileChatStateOf(fPath, i, m, fBytes) == SDevSeedPlan.StateOurs ? 1 : -1;',
    };
    const got = { state: bodyN(G.state, /private static string fileChatStateOf\(/), ensure: bodyN(G.ensure, /private static int ensureFileChatFile\(/) };
    const r = { state: got.state === W.state, ensure: got.ensure === W.ensure, noReplace: !/File\.Copy|File\.Replace|FileMode\.|overwrite/.test(glue) };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a8 stateFromContent): the state of a file under our name comes from SDevSeedPlan.fileState over its length and its BYTES only (read only when the length matches), and the write happens only when it is absent: keep ours, refuse a foreign one (-1: never written over, never adopted — the caller stores no row); after the move the content proof runs AGAIN and only a file that is ours gives a row (#46 r1 S-S-1: File.Move is no atomic no-replace on Unix); a failed write deletes only our temp, then throws; no copy, replace or create-mode call — ' + JSON.stringify({ ...r, got: Object.fromEntries(Object.keys(W).filter((k) => !r[k]).map((k) => [k, got[k]])) }));
  }

  /* ── a9 tmpInSent ── */
  {
    const tmpBody = bodyN(P, /public static string fileTmpLeaf\(int i, int j\)/);
    const r = {
      salt: tmpBody.startsWith('string? leaf = PhotoRules.pendingFileName(hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "filetmp:" + i + ":" + j)), 8), 0, ".src");'),
      mayDel: bodyN(P, /public static bool mayDeleteFileTmp\(string\? leaf, int i, int j\)/) === 'return leaf != null && isFileChat(i) && PhotoRules.isPendingName(leaf) && leaf == fileTmpLeaf(i, j);',
      onlySent: [...glue.matchAll(/fileTmpLeaf\(|\bfTmp\w*\s*=/g)].every((m) => { const st = glue.slice(m.index, glue.indexOf(';', m.index)); return !/fRecv|fVoice|fDir\b|downloadsPath/.test(st); })
        && (glue.match(/Path\.Combine\(fSent, (?:SDevSeedPlan\.fileTmpLeaf\(i, m\.j\)|fTmpName)\)/g) || []).length === 2,
      delTmp: bodyN(G.delTmp, /private static int deleteFileChatTmp\(/) === 'string fTmpName = SDevSeedPlan.fileTmpLeaf(i, j); string fTmp = Path.Combine(fSent, fTmpName); if (SDevSeedPlan.mayDeleteFileTmp(fTmpName, i, j) && File.Exists(fTmp)) { File.Delete(fTmp); return 1; } return 0;',
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a9 tmpInSent): the temp leaf is the app\'s pending name (pending-<16 hex>-0.src) with its OWN salt "filetmp:" (never an image-seed temp), joined to Sent/ only — never to Downloads/ or Voice/ — and deleted only by its exact name — ' + JSON.stringify(r));
  }

  /* ── a10 hooks ── */
  {
    const seed1 = bodyN(S, /public static string seed\(string profile\)/), uns = bodyN(S, /public static string unseed\(\)/), st = bodyN(S, /public static string status\(\)/);
    /* ★ walktools2 re-base: the same ONE statement gains `|| quoteChatsPresent() > 0` and ", n of 1 quote chat (Seed 57)" (pins-walktools2/a-quote-seed q2) */
    const STATUS = 'if (present > 0 || images > 0 || fileChatsPresent() > 0 || quoteChatsPresent() > 0) return present + " of " + Count + " seeded contacts present, " + images + " of " + SDevSeedPlan.ImageChats + " image chats (Seed 51-53), " + fileChatsPresent() + " of " + SDevSeedPlan.FileChats + " file chats (Seed 54-56), " + quoteChatsPresent() + " of " + SDevSeedPlan.QuoteChats + " quote chat (Seed 57)."; if (present == 0 && images == 0) { return "Nothing seeded."; }';
    const r = {
      seed: seed1.endsWith('status += " " + seedImageChats(); status += " " + seedFileChats(); status += " " + seedQuoteChat(); Logging.info("[DEVSEED] " + status); return status;'),   // ★ walktools2 re-base: + the quote-chat hook after the file line (pins-walktools2/a-quote-seed q2)
      unseed: uns.includes('status += " " + unseedImageChats(); status += " " + unseedFileChats(); UIHelpers.shouldRefreshContacts = true;'),
      status: st.includes(STATUS) && (st.match(/fileChatsPresent\(\)/g) || []).length === 2,
      once: (S.match(/\bseedFileChats\(\)/g) || []).length === 2 && (S.match(/\bunseedFileChats\(\)/g) || []).length === 2 && (S.match(/\bfileChatsPresent\(\)/g) || []).length === 3,
    };
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a10 hooks): exactly ONE added statement each — seed(profile): `status += " " + seedFileChats();` right after the image line (after the clock stopped); unseed(): `status += " " + unseedFileChats();` right after the image line; status(): one `if (present > 0 || images > 0 || fileChatsPresent() > 0) return <the old sentence with ", n of 3 file chats (Seed 54-56)">;` before the old "Nothing seeded." test; each new function is called from there only — ' + JSON.stringify(r));
  }

  /* ── a11 logsTypesOnly ── */
  {
    const logs = [...glue.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => norm(m[1]));
    const bad = logs.filter((a) => !/^"\[DEVSEED\] [^"]*"/.test(a) || /\b(fPath|fLeaf|fTmp|fTmpName|fDir|fSent|fRecv|fVoice|fFolder|address|friend|text|Message|ToString|StackTrace|InnerException)\b/.test(a.replace(/"[^"]*"/g, '""'))
      || /\be\b/.test(a.replace(/\be\.GetType\(\)\.Name\b/g, '')) || !/^("[^"]*"|\bi\b|\bm\.j\b|\be\.GetType\(\)\.Name\b|\s|\+)+$/.test(a));
    ok(glueOk && logs.length === 4 && bad.length === 0, '★ filewalk seed (a11 logsTypesOnly): the 4 new log lines start with [DEVSEED] and carry fixed words, the seed index, j and exception TYPE names only — never a path, a leaf, an address, a text or an exception message — ' + JSON.stringify({ n: logs.length, bad }));
  }

  /* ── a12 nicks ── */
  {
    const r = {
      names: /private static readonly string\[\] FileNames = \{ "Tjaša Kranjc", "Rok Mlinar", "Maja Debeljak" \};/.test(P),
      nick: bodyN(P, /public static string fileNick\(int i\)/).endsWith('return "Seed " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + " " + FileNames[i - FileChatFirst];'),
      range: /public const int FileChatFirst = ImageChatFirst \+ ImageChats;/.test(P) && /public const int FileChats = 3;/.test(P),
      used: /FriendList\.addFriend\(FriendType\.Normal, FriendState\.Approved, address, null, SDevSeedPlan\.fileNick\(i\), null, null, 0, true\)/.test(G.seed),
    };
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a12 nicks): seed index 53, 54, 55 (after the image chats) are "Seed 54 Tjaša Kranjc", "Seed 55 Rok Mlinar", "Seed 56 Maja Debeljak" — the "Seed NN " shape of every seed contact — ' + JSON.stringify(r));
  }

  /* ── a13 rows ── */
  {
    const s = norm(G.seed);
    const LOOP = 'for (int i = SDevSeedPlan.FileChatFirst; i < SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats; i++) { Address address = addressFor(i);';
    const r = {
      loop: s.includes(LOOP) && s.includes('foreach (SDevSeedPlan.FileMsg m in SDevSeedPlan.filePlan(i)) { byte[] id = SDevSeedPlan.rowIdFor(i, m);'),
      text: s.includes('if (!SDevSeedPlan.hasFile(m)) { if (FriendList.addMessageWithType(id, FriendMessageType.standard, address, 0, SDevSeedPlan.rowText(m), m.local, null, m.ts, false, 0) != null) texts++; continue; }'),
      file: s.includes('FriendMessage? fm = FriendList.addMessageWithType(id, FriendMessageType.fileHeader, address, 0, SDevSeedPlan.fileHeaderText(i, m), m.local, null, m.ts, false, 0); if (fm == null) { continue; }'),
      completed: s.includes('fm.transferId = SDevSeedPlan.transferUid(i, m.j); if (!m.local) { fm.fileSize = (ulong)size; } fm.completed = true; fm.filePath = fPath; rows++;') && (s.match(/fm\.filePath = /g) || []).length === 1,
      size: s.includes('long size = SDevSeedPlan.fileLength(m);'),
      write: s.includes('IxianHandler.localStorage.requestWriteMessages(address, 0); friend.save(); } }'),
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a13 rows): the file chats take addressFor(i) and the row id SDevSeedPlan.rowIdFor(i, m) (walktools item 4: messageIdFor(i, m.j) for every row but a voice row, whose id is its first 16 bytes) like every seed contact; a row without a file = Core\'s standard row with the plan\'s text (an inline voice text included); a file row = the app\'s fileHeader text with the completed-transfer fields — `completed` BEFORE `filePath` (#46 r1 B-5), fileSize = the exact length for a received row; requestWriteMessages + friend.save() after each chat — ' + JSON.stringify(r));
  }

  /* ── a14 unseedRemoves ── */
  {
    const u = norm(G.unseed);
    const uns = bodyN(S, /public static string unseed\(\)/);
    const r = {
      /* ★ walktools2 re-base: the bound ends at the quote chat (QuoteChatFirst = FileChatFirst + FileChats: the file chats are still inside it) */
      loop: uns.startsWith('int removed = 0, missing = 0, refused = 0; for (int i = 0; i < SDevSeedPlan.QuoteChatFirst + SDevSeedPlan.QuoteChats; i++) { Friend? friend = FriendList.getFriend(addressFor(i)); if (friend == null) { missing++; continue; } try { if (FriendList.removeFriend(friend)) { removed++; SPIXI.Meta.SNotificationPrefs.forgetContact(friend.walletAddress.ToString()); } else refused++; }'),
      noGap: /public const int FileChatFirst = ImageChatFirst \+ ImageChats;/.test(P) && /public const int ImageChatFirst = Count;/.test(P),
      onlyRemoved: u.includes('for (int i = SDevSeedPlan.FileChatFirst; i < SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats; i++) { Address address = addressFor(i); if (FriendList.getFriend(address) != null) { refused++; continue; } SPeerLocalStores.forget(address.ToString()); if (!fDirsOk) { continue; } foreach (SDevSeedPlan.FileMsg m in SDevSeedPlan.filePlan(i)) { if (!SDevSeedPlan.hasFile(m)) { continue; }'),
      order: u.indexOf('deleteFileChatTmp(') >= 0 && u.indexOf('deleteFileChatTmp(') < u.indexOf('File.Delete(fPath)'),
      sites: (S.match(/FriendList\.removeFriend\(/g) || []).length === 1 && !/removeFriend|forgetContact/.test(glue),
      noAlbum: !/SPhotoGroups/.test(glue),
      forgetOnce: (glue.match(/SPeerLocalStores\.forget\(/g) || []).length === 1,
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a14 unseedRemoves): unseed\'s ONE removal loop (FriendList.removeFriend + SNotificationPrefs.forgetContact — the only removeFriend site of the file) runs 0 … FileChatFirst + FileChats − 1, and the file chats follow the image chats without a gap, so it removes Seed 54–56 too; unseedFileChats removes no contact; for a chat whose contact is GONE (a refused removal keeps its files) it forgets that address\'s per-contact stores (SPeerLocalStores.forget — SAppJoins, SVoicePlayed, SPhotoGroups, as the app\'s own removal; #46 r1 C-S-2), then deletes its files the temp by its exact name before the proven file; no photo group (no album) — ' + JSON.stringify(r));
  }

  /* ── a15 fixedTimes ── */
  {
    const fp = method(P, /public static List<FileMsg> filePlan\(int i\)/).replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    const g = glue.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    const r = {
      anchor: /long at = ImageAnchor - \(3 \+ k\) \* 3600L;\s*for \(int x = l\.Count - 1; x >= 0; x--\)\s*\{\s*l\[x\]\.ts = at;\s*at -= GapSeconds;\s*\}/.test(fp),
      planNoClock: fp.length > 1000 && !/\bnow\b|Clock|DateTime\.(?:Now|UtcNow|Today)|getTimestamp|Stopwatch/.test(fp) && !/DateTime\.(?:Now|UtcNow|Today)|Clock\.|getTimestamp/.test(planSec),
      glueNoClock: !/\bnow\b|Clock\.|DateTime\.(?:Now|UtcNow|Today)|getTimestamp/.test(g),
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a15 fixedTimes): the file chats sit at FIXED times — filePlan(i) takes no time and reads no clock, the newest message of file chat k = ImageAnchor − (3 + k) h with GapSeconds before each earlier one; the glue reads no clock (a top-up on a later day moves nothing) — ' + JSON.stringify(r));
  }

  /* ── a16 voiceApp ── */
  {
    const r = {
      packet: /private static readonly byte\[\] VoicePacket = \{ 0xF8, 0xFF, 0xFE \};/.test(P),
      preSkip: /public const int VoicePreSkip = VoiceCodec\.DefaultPreSkip;/.test(P),
      mux: bodyN(P, /public static byte\[\] fileBytes\(int i, FileMsg m\)/).includes('if (m.kind == KindVoiceFile) { return VoiceCodec.muxOgg(voicePackets(m.seconds), VoicePreSkip, oggSerial(i, m.j)); }'),
      inline: bodyN(P, /public static string rowText\(FileMsg m\)/).includes('string? payload = VoiceCodec.encodeInline(p); if (payload == null) { throw new InvalidOperationException("voice inline"); } return VoiceCodec.humanLine(p.Count * VoiceCodec.FrameMs) + "\\n" + payload;'),
      serial: bodyN(P, /public static uint oggSerial\(int i, int j\)/).startsWith('byte[] h = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "ogg:" + i + ":" + j));'),
    };
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a16 voiceApp): the voice rows use the app\'s own codec — every packet F8 FF FE (one 20 ms frame), a voice file = VoiceCodec.muxOgg(packets, the app\'s pre-skip VoiceCodec.DefaultPreSkip, the plan\'s serial from (i, j)), an inline row = VoiceCodec.humanLine(durMs) + "\\n" + VoiceCodec.encodeInline(packets) — ' + JSON.stringify(r));
  }

  /* ── a17 glueFrozen (#46 r1 S-S-3): the WHOLE bodies of the new glue methods, normalised (comments stripped, white space collapsed), as
        SHA-256 — a2 / a11 read token lists only. RE-BASE: after an intended edit, look at the diff of that body, copy got=<hash> from the
        message into WANT and name the change in the DECISIONS row. ── */
  {
    const { createHash } = await import('node:crypto');
    const sha = (x) => createHash('sha256').update(x, 'utf8').digest('hex');
    const NAMES = { seedFileChats: /private static string seedFileChats\(\)/, unseedFileChats: /private static string unseedFileChats\(\)/,
      fileChatsPresent: /private static int fileChatsPresent\(\)/, fileChatStateOf: /private static string fileChatStateOf\(/,
      ensureFileChatFile: /private static int ensureFileChatFile\(/, deleteFileChatTmp: /private static int deleteFileChatTmp\(/,
      presentIds: /private static List<byte\[\]\?>\? presentIds\(Friend friend\)/ };
    const WANT = {
      seedFileChats: '6a2bb9d9299c6d581735e3011cf1e21042476e77de26ea9d1fe817de8b6dc5c6', unseedFileChats: '814af502a139574b65b56452ff57c6f7903ecae60ececb11beca85d9611c00bf',
      fileChatsPresent: 'be1f248bcea032d16b7578f15ef1a503b940480bf6ceb87136223988ff221ab4', fileChatStateOf: '5db07df9a5c5a43aa0b42e6cf451e803109c22df00835b08bcbdcdb0453a0ae0',
      ensureFileChatFile: 'db6ce5b651a2044b72efc985353a9f2327a92ea1d55a736f98217c56be64c22f', deleteFileChatTmp: 'fa6c5e58e74259df7d75f25b0725d0df8357d4cffd615344868e2bd9f2a8b4df',
      presentIds: '731d40ef75b3c60390159cba7f590a98fa8bd162c637a1b598db9889dd472596',
    };
    const got = Object.fromEntries(Object.entries(NAMES).map(([k, re]) => [k, sha(bodyN(S, re))]));
    const bodies = Object.fromEntries(Object.entries(NAMES).map(([k, re]) => [k, bodyN(S, re).length]));
    /* every private static method that is not Seed 01–53 code is one of NAMES (a new helper must be added here) */
    /* ★ walktools2 re-base: + the quote chat's two methods (not file-chat glue; frozen by pins-walktools2/a-quote-seed q8) */
    const OLD = ['addressFor', 'messageIdFor', 'countFor', 'seedImageChats', 'stateOf', 'ensurePhoto', 'deleteOwnTmp', 'unseedImageChats', 'seedQuoteChat', 'quoteChatsPresent'];
    const priv = [...S.matchAll(/private static [\w<>\[\]?, ]+? (\w+)\(/g)].map((m) => m[1]).filter((n) => !OLD.includes(n));
    const r = Object.fromEntries(Object.keys(WANT).map((k) => [k, got[k] === WANT[k] && bodies[k] > 40]));
    r.allNamed = JSON.stringify(priv.slice().sort()) === JSON.stringify(Object.keys(NAMES).sort());
    ok(Object.values(r).every(Boolean), '★ filewalk seed (a17 glueFrozen) (#46 r1 S-S-3): the WHOLE normalised bodies of the new glue methods (seedFileChats, unseedFileChats, fileChatsPresent, fileChatStateOf, ensureFileChatFile, deleteFileChatTmp, presentIds) equal their SHA-256 and no other new private method exists — a changed argument, an added statement or a new log text is red. Re-base: look at the diff of that body, then copy got=<hash> — ' + JSON.stringify({ ...r, priv, got: Object.entries(got).filter(([k]) => !r[k]).map(([k, v]) => k + ' got=' + v) }));
  }

  /* ── a18 completeSkip (#46 r1 C-S-1) ── */
  {
    const s = norm(G.seed);
    const SKIP = 'bool fPresent = false; if (friend == null) { friend = FriendList.getFriend(address); if (friend == null) { refused++; continue; } present++; fPresent = true; } else { added++; } if (fPresent) { string fTopUp = SDevSeedPlan.topUpAction(presentIds(friend), i); if (fTopUp == SDevSeedPlan.TopUpSkip) { newest++; continue; } if (fTopUp != SDevSeedPlan.TopUpWrite) { partly++; continue; } } foreach (SDevSeedPlan.FileMsg m in SDevSeedPlan.filePlan(i))';
    const cc = bodyN(P, /public static bool chatComplete\(IEnumerable<byte\[\]\?> presentIds, int i\)/);
    const r = {
      skip: s.includes(SKIP),
      plan: cc === 'List<FileMsg> l = filePlan(i); if (l.Count == 0 || presentIds == null) { return false; } byte[] newest = rowIdFor(i, l[l.Count - 1]); foreach (byte[]? id in presentIds) { if (id != null && id.Length == newest.Length && isOurs(id, newest)) { return true; } } return false;',
      ids: norm(method(S, /private static List<byte\[\]\?>\? presentIds\(Friend friend\)/)).includes('List<FriendMessage>? msgs = friend.getMessages(0); if (msgs == null) { return null; } List<byte[]?> ids = new List<byte[]?>(); lock (msgs) { foreach (FriendMessage fmsg in msgs) { ids.Add(fmsg.id); } } return ids;'),
      topUp: bodyN(P, /public static string topUpAction\(IReadOnlyCollection<byte\[\]\?>\? presentIds, int i\)/) === 'if (presentIds == null || filePlan(i).Count == 0) { return TopUpPartial; } if (presentIds.Count == 0) { return TopUpWrite; } return chatComplete(presentIds, i) ? TopUpSkip : TopUpPartial;',
      partialStatus: norm(G.seed).includes('(partly > 0 ? "; " + partly + " partial: Remove the seed, then Seed" : "")') && !/complete, skipped/.test(G.seed),
      once: (S.match(/SDevSeedPlan\.topUpAction\(/g) || []).length === 1 && !/SDevSeedPlan\.chatComplete\(/.test(S),
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ filewalk seed (a18 completeSkip) (#46 r1 C-S-1, r2 B2-5): a PRESENT file chat is never topped up through Core\'s in-memory list (after loadMessages ~51 rows, not the 100 of Seed 56) — SDevSeedPlan.topUpAction: an EMPTY list → write; the plan\'s newest row there → skip (status "with the newest row", never "complete"); otherwise (newest absent, unreadable list) → partial: no row, no file, the status says "Remove the seed, then Seed" (#1571) — ' + JSON.stringify({ ...r, planGot: r.plan ? 'equal' : cc }));
  }
}
