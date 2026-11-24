/* ==== perfb1 (Speed batch 1a) item 4 — THE DEV IMAGE SEED, the source half.
 *
 * Spixi/Utils/SDevSeed.cs seeds three image chats (seed index 50–52) with completed photo messages and one album;
 * Spixi/Utils/SDevSeedPlan.cs is its pure half (the plan, the names, the times, the PNG made in code), EXECUTED by
 * scripts/csh/PerfB1SeedTests.cs. SDevSeed.cs itself calls Core and MAUI and compiles nowhere here, so these are SOURCE
 * checks. Comments are masked first (the a-thumb-type mask: comments → spaces, newlines kept, strings kept), so every
 * reported `file:line` is a line of the RAW file. What it holds (8 rows):
 *   1 — each seed file is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif`: only comments before the opening line, the
 *       matching `#endif` is the last thing in the file, and the nesting never closes the outer block early;
 *   2 — no network in either file: no `http:` / `https:`, HttpClient, WebRequest, WebClient, Socket, TcpClient,
 *       UdpClient, `System.Net`, Dns, Launcher, Browser;
 *   3 — C# names its files: SDevSeed.cs's file calls are exactly the listed ones, and every variable they take is
 *       assigned only from C#'s own roots (Config.spixiUserFolder + PhotoRules.SentFolderName, TransferManager.downloadsPath; the file chats
 *       also Config.spixiUserFolder + SDevSeedPlan.VoiceFolderName — their variables are pinned by pins-filewalk/a-file-seed a4)
 *       and SDevSeedPlan's leaf builders; the public verbs take no string but `profile`; SDevSeedPlan.cs touches no disk
 *       (no System.IO) and builds every name from the seed index, fixed words and SHA-256 hex;
 *   4 — the Seed 01–50 rules are the SAME statements in SDevSeed.cs and in SDevSeedPlan.cs (each exactly once in each
 *       file) — the harness freezes the plan's values, this row ties SDevSeed's own lines to them;
 *   5 — the image chats take addressFor(i) / messageIdFor(i, j) like every seed contact, seed, unseed and status all walk
 *       them, and the new log lines carry the `[DEVSEED]` word and exception TYPES only (no path, leaf, text, address);
 *   6 — Spixi/Spixi.csproj still holds the O-35 store-release gate that refuses SPIXI_DEV_COEXIST (read only).
 *   7 — (#46 r1 B-2) every File.Delete sits behind the proof by CONTENT (SHA-256 of the file = the deterministic PNG's) or the exact
 *       temp leaf; the state comes from the content proof only; a foreign file is refused; the temp lives in Sent/, never Downloads/;
 *   8 — (#46 r1 B-3) the image chats sit at the FIXED ImageAnchor: no time passed to imagePlan, no clock in the image half.
 *   9 — (#46 r1 C-3) the Seed 01–50 rules of SDevSeed.cs are EQUAL, body for body, to their copy in the plan (addressFor / messageIdFor / countFor, the
 *       constants), and the seed loop's statements from `Address address = addressFor(i);` to the addMessageWithType call are pinned contiguous;
 *   10 — (#46 r1 C-4) the image-seed glue (ensurePhoto, stateOf, deleteOwnTmp, the seed and unseed loops) is pinned whole, with a named key per guard.
 *   11 — (#46 r2 R2-2 / r3 R3-1) the Names array, the Lines array and the WHOLE bodies of seed(), seed(string profile), unseed() and status() are frozen as SHA-256 hashes.
 *   Row 5 also holds (#46 r1 S-1 / B-5): no [DEVSEED] line and nothing handleDevSeedVerb pushes carries an exception message,
 *   ToString or a bare exception; `completed` is set before `filePath`.
 * BRITTLE ON PURPOSE (rows 9, 10 and 11): the glue that the app runs for Seed 01–50 and for the image chats is pinned as whole normalised bodies, because the
 * cloud can neither compile nor run these files — an intended edit of one of them must re-base the matching literal. The `harness` key of the other pin
 * modules in this folder holds test NAMES, not assertions: for the pure rules the CSH count (`CSH pass=… fail=0`) is the gate.
 * ROW 11 is the same kind of pin for the REST of Seed 01–50 (the Names and Lines arrays and the WHOLE bodies of seed(), seed(string profile), unseed() and status(),
 * each frozen as a SHA-256 of its normalised text — the base a54808c plus only the S-1 type-only log lines, the image-chat status lines, the unseed loop bound and status()'s image half): when you edit one of them on purpose, run the pin, copy the `got=<hash>` of the failing key from its message into
 * the constant, and say why in the DECISIONS row — the Seed 01–50 numbers are the adb walk's contract.
 * Known limits: the normalisation collapses white space INSIDE string literals too, so a change of spaces inside a `Names` / `Lines` text is not seen (cosmetic; no id or count depends on it); text, not a compile (⚠ the app is UNCOMPILED here — Damir's build is the gate); a raw string literal is
 * read as ordinary text by the mask.
 * ★ filewalk RE-BASE (2026-11-16, item S of docs/contract-filewalk.md — the file chats Seed 54–56, seed index 53–55): SDevSeed.cs GAINED
 * seedFileChats / unseedFileChats / fileChatsPresent and the helpers fileChatStateOf / ensureFileChatFile / deleteFileChatTmp, plus ONE statement in
 * each of seed(string profile), unseed() and status() (the diff of the three bodies is exactly that one line each), and unseed()'s loop bound (below).
 * Fix round: unseed()'s ONE removal loop now ends at the file chats (bound `i < SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats`; the file chats
 * follow the image chats without a gap) — so unseed() = base + its earlier named lines + this bound + the hook line; removeFriend stays ONE site.
 * Re-based keys ONLY: row 3 WANT_OPS (+ the glue's 10 file calls), row 5 `unseed` (the loop bound regex; still 1 removeFriend site), row 7 `behind`
 * (File.Delete 2 → 4, the guard regex also names mayDeleteFileTmp) and `stateFromContent` (fileAction calls 1 → 2), row 11 seedBody / unseed /
 * status hashes and `endsAtStatus`. Rows 1, 2, 4, 6, 8, 9, 10 and the Names / Lines / seed() hashes are UNCHANGED and green. The new code's own
 * rules (variables, guards, logs, hooks) are pinned by scripts/pins-filewalk/a-file-seed.mjs.
 * Deliberate breaks (the perfb1 report): a statement moved below the final `#endif` → row 1 red; the salt mutated in
 * SDevSeed.cs only → row 4 red; `e.Message` back into the remove log line → row 5 red; `filePath` before `completed` → row 5 red;
 * a File.Delete without its guard → row 7 red; `now` back into imagePlan → row 8 red. */
import { createHash } from 'node:crypto';
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

  /* comments → spaces (newlines kept); strings and char literals kept (the a-thumb-type mask) */
  const mask = (t) => {
    const out = t.split('');
    const n = t.length;
    const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
    const str = (i, verbatim, interp) => {
      i++;
      while (i < n) {
        const c = t[i];
        if (verbatim) {
          if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return i + 1; }
        } else {
          if (c === '\\') { i += 2; continue; }
          if (c === '"') return i + 1;
          if (c === '\n') return i;
        }
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

  const SEED = 'Spixi/Utils/SDevSeed.cs', PLAN = 'Spixi/Utils/SDevSeedPlan.cs';
  const files = { [SEED]: mask(raw(SEED)), [PLAN]: mask(raw(PLAN)) };

  /* ── 1: wholly inside #if SPIXI_DEV_COEXIST ── */
  for (const f of [SEED, PLAN]) {
    const t = files[f];
    const lines = t.split('\n');
    const dir = lines.map((l, k) => [k + 1, l.trim()]).filter(([, l]) => /^#(if|elif|else|endif)\b/.test(l));
    const firstCode = lines.findIndex((l) => l.trim().length > 0) + 1;
    let lastCode = 0;
    lines.forEach((l, k) => { if (l.trim().length > 0) lastCode = k + 1; });
    let depth = 0, closedAt = 0, early = [];
    for (const [ln, l] of dir) {
      if (/^#if\b/.test(l)) depth++;
      else if (/^#endif\b/.test(l)) { depth--; if (depth === 0) { if (closedAt) early.push(f + ':' + closedAt); closedAt = ln; } }
      else if (depth === 1) early.push(f + ':' + ln + ' (' + l + ' on the outer block)');
    }
    const r = {
      opens: dir.length > 0 && dir[0][0] === firstCode && /^#if SPIXI_DEV_COEXIST\s*$/.test(dir[0][1]),
      closesLast: closedAt === lastCode && depth === 0,
      noEarlyClose: early.length === 0,
      firstCode: f + ':' + firstCode, lastCode: f + ':' + lastCode, outerEndif: f + ':' + closedAt, early,
    };
    ok(r.opens && r.closesLast && r.noEarlyClose,
      '★ perfb1 seed (1): ' + f + ' is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif` — the first code line is that #if, its matching #endif is the last code line, nothing closes or splits the outer block early (a store build compiles none of it; the O-35 gate refuses the symbol there) — ' + JSON.stringify(r));
  }

  /* ── 2: no network ── */
  {
    const NET = /https?:|\bHttpClient\b|\bWebRequest\b|\bHttpWebRequest\b|\bWebClient\b|\bSocket\b|\bTcpClient\b|\bUdpClient\b|\bSystem\.Net\b|\bDns\.|\bLauncher\b|\bBrowser\./g;
    const hits = [];
    for (const f of [SEED, PLAN]) for (const m of files[f].matchAll(NET)) hits.push(f + ':' + lineOf(files[f], m.index) + ' ' + m[0]);
    ok(hits.length === 0, '★ perfb1 seed (2): no network in the seed files — no http(s) URL, HttpClient, WebRequest, WebClient, Socket, TcpClient, UdpClient, System.Net, Dns, Launcher, Browser (comments masked; a string counts) — ' + JSON.stringify({ hits }));
  }

  /* ── 3: C# names its files ── */
  {
    const t = files[SEED];
    const callAt = (src, start) => {           // the call text from `start` to its matching `)`
      let k = src.indexOf('(', start), depth = 0;
      for (let x = k; x < src.length; x++) { if (src[x] === '(') depth++; else if (src[x] === ')') { depth--; if (depth === 0) return norm(src.slice(start, x + 1)); } }
      return norm(src.slice(start));
    };
    const ops = [...t.matchAll(/\b(?:File|Directory)\.\w+\s*\(|\bnew\s+(?:FileInfo|DirectoryInfo|FileStream|StreamWriter)\s*\(/g)].map((m) => callAt(t, m.index));
    const WANT_OPS = {
      'Directory.CreateDirectory(sentDir)': 1, 'Directory.CreateDirectory(recvDir)': 1, 'new FileInfo(path)': 1, 'File.ReadAllBytes(path)': 1,
      'File.Exists(tmp)': 1, 'File.Delete(tmp)': 1, 'File.WriteAllBytes(tmp, SDevSeedPlan.png(i, m.j, m.width, m.height))': 1,
      'File.Move(tmp, path)': 1, 'File.Delete(path)': 1,
      /* ★ filewalk re-base (the file chats of Seed 54–56): the same file calls of the file-chat glue — their variables (fSent,
         fRecv, fVoice, fPath, fTmp, fTmpName) and where they come from are pinned by scripts/pins-filewalk/a-file-seed.mjs (a3, a4) */
      'Directory.CreateDirectory(fSent)': 1, 'Directory.CreateDirectory(fRecv)': 1, 'Directory.CreateDirectory(fVoice)': 1,
      'new FileInfo(fPath)': 1, 'File.ReadAllBytes(fPath)': 1, 'File.WriteAllBytes(fTmp, fBytes)': 1,   /* #46 r2 B2-7: the array just written is the proof's expected bytes */
      'File.Move(fTmp, fPath)': 1, 'File.Exists(fTmp)': 1, 'File.Delete(fTmp)': 1, 'File.Delete(fPath)': 1,
    };
    const got = {};
    for (const o of ops) got[o] = (got[o] || 0) + 1;
    const opsExact = JSON.stringify(Object.keys(got).sort().map((k) => [k, got[k]])) === JSON.stringify(Object.keys(WANT_OPS).sort().map((k) => [k, WANT_OPS[k]]));
    const ALLOWED = {
      sentDir: ['Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName)'],
      recvDir: ['TransferManager.downloadsPath'],
      dir: ['m.local ? sentDir : recvDir'],
      leaf: ['SDevSeedPlan.localLeaf(i, m)'],
      path: ['Path.Combine(dir, leaf)'],
      /* ★ #46 r1 B-2: the temp is ALWAYS in sentDir (the app's own Sent/ folder — only C# writes there), for both directions */
      tmp: ['Path.Combine(sentDir, SDevSeedPlan.tmpLeaf(i, m.j))', 'Path.Combine(sentDir, tmpName)'],
      tmpName: ['SDevSeedPlan.tmpLeaf(i, j)'],
    };
    const bad = [];
    let assigns = 0;
    for (const m of t.matchAll(/(?<![\w.])(?:string\s+)?(sentDir|recvDir|dir|leaf|path|tmp|tmpName)\s*=(?!=)\s*([^;]+);/g)) {
      assigns++;
      if (!ALLOWED[m[1]].includes(norm(m[2]))) bad.push(SEED + ':' + lineOf(t, m.index) + ' ' + m[1] + ' = ' + norm(m[2]));
    }
    const ensureCalls = [...t.matchAll(/(?<!int )\bensurePhoto\s*\(/g)].map((m) => callAt(t, m.index));   // the calls, not the declaration
    const ensureDecl = /private static int ensurePhoto\(string sentDir, string dir, string leaf, int i, SDevSeedPlan\.ImageMsg m\)/.test(t);
    const verbs = [...t.matchAll(/public\s+static\s+string\s+(\w+)\s*\(([^)]*)\)/g)].map((m) => m[1] + '(' + norm(m[2]) + ')');
    const p = files[PLAN];
    const planIo = [...p.matchAll(/\bSystem\.IO\b|\b(?:File|Directory|Path)\.\w+|\bFileStream\b|\bFileInfo\b/g)].map((m) => PLAN + ':' + lineOf(p, m.index) + ' ' + m[0]);
    const ret = (name) => { const m = new RegExp('public static string ' + name + '\\(([^)]*)\\)\\s*\\{\\s*return ([^;]+);').exec(p); return m ? norm(m[1]) + ' => ' + norm(m[2]) : ''; };
    const names = {
      photoName: ret('photoName') === 'int i, int j => FileTag + "-" + (i + 1).ToString("00", CultureInfo.InvariantCulture) + "-" + j.ToString("000", CultureInfo.InvariantCulture) + ".png"',
      transferUid: ret('transferUid') === 'int i, int j => hex(SHA256.HashData(Encoding.UTF8.GetBytes(Salt + "file:" + i + ":" + j)), 16)',
      localLeaf: ret('localLeaf') === 'int i, ImageMsg m => m.local ? transferUid(i, m.j) + ".png" : photoName(i, m.j)',
      /* the temp leaf = the app's own pending name (Sent/pending-<16 hex>-0.src), its id a hash of the seed index and j */
      tmpLeaf: /public static string tmpLeaf\(int i, int j\)\s*\{\s*string\? leaf = PhotoRules\.pendingFileName\(hex\(SHA256\.HashData\(Encoding\.UTF8\.GetBytes\(Salt \+ "tmp:" \+ i \+ ":" \+ j\)\), 8\), 0, "\.src"\);/.test(p),
      fileTag: /public const string FileTag = "devseed";/.test(p) && !/TmpSuffix|\.devseed-tmp/.test(p) && !/TmpSuffix|\.devseed-tmp/.test(t),
    };
    const r = {
      opsExact, assigns, bad,
      ensureOnce: ensureDecl && ensureCalls.length === 1 && ensureCalls[0] === 'ensurePhoto(sentDir, dir, leaf, i, m)',
      verbs: JSON.stringify(verbs) === JSON.stringify(['seed()', 'seed(string profile)', 'unseed()', 'status()']),
      planIo, names,
    };
    const good = opsExact && assigns === 14 && bad.length === 0 && r.ensureOnce && r.verbs && planIo.length === 0 && Object.values(names).every(Boolean);
    if (!good) { r.ops = got; r.verbList = verbs; }
    ok(good, '★ perfb1 seed (3): C# names its files — SDevSeed.cs makes exactly its listed file calls (create the Sent / Downloads folders, write a temp leaf in Sent/, move it, delete), every path they take is built from Config.spixiUserFolder + "Sent" (or + SDevSeedPlan.VoiceFolderName for the file chats) or TransferManager.downloadsPath and SDevSeedPlan.localLeaf / tmpLeaf (the file chats: fileLeaf / fileTmpLeaf, pin a4), the public verbs take no string but `profile`; SDevSeedPlan.cs touches no disk and builds every name from the seed index, fixed words and SHA-256 hex — ' + JSON.stringify(r));
  }

  /* ── 4: the Seed 01–50 rules — the same statements in both files ── */
  {
    const STMTS = [
      'const string Salt = "spixi-dev-seed:";',
      'public const int Count = 50;', 'public const int HeavyContacts = 10;', 'public const int HeavyMessages = 1000;', 'public const int MediumMessages = 40;',
      'byte[] h = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i));', 'byte[] raw = new byte[33];', 'raw[0] = 0;', 'Array.Copy(h, 0, raw, 1, 32);',
      'return SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i + ":" + j));',
      'if (profile == "heavy")', 'return i < HeavyContacts ? HeavyMessages : MediumMessages;', 'return 2 + ((i * 7) % 39);',
      'long first = now - 30L * 86400 + (i * 3600L) % 86400;', 'long step = Math.Max(1, (now - 3600 - first) / Math.Max(1, count));',
      'int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0;',
      'bool local = (i + j) % 2 == 0;', 'bool tail = j >= count - unreadTail;', 'if (tail) local = false;',
      'long ts = tail ? now + 1 + (j - (count - unreadTail)) : first + j * step;',
    ];
    const count = (t, s) => t.split(s).length - 1;
    const ns = norm(files[SEED]), np = norm(files[PLAN]);
    const off = [];
    for (const s of STMTS) {
      const a = count(ns, s), b = count(np, s);
      const want = s === 'int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0;' ? [1, 2] : [1, 1];   // the plan has it in unreadTailFor + messageTime
      if (a !== want[0] || b !== want[1]) off.push(s + ' — SDevSeed ×' + a + ', plan ×' + b);
    }
    const uses = {
      address: /return new Address\(raw, null, false\);/.test(files[SEED]),
      countLoop: /for \(int i = 0; i < Count; i\+\+\)/.test(files[SEED]) && /int count = countFor\(profile, i\);/.test(files[SEED]) && /for \(int j = 0; j < count; j\+\+\)/.test(files[SEED]),
    };
    ok(off.length === 0 && Object.values(uses).every(Boolean), '★ perfb1 seed (4): the Seed 01–50 rules (salt, the four counts, the address bytes, the message id, the count dial, the times, the direction, the unread tail) are the SAME statements in SDevSeed.cs and in SDevSeedPlan.cs, once each — the harness freezes the plan\'s values from the base, so a change to a Seed 01–50 id, count or time is red in one of the two — ' + JSON.stringify({ off, uses }));
  }

  /* ── 5: the image chats take the seed's own address / id rules; the log lines ── */
  {
    const t = files[SEED];
    const body = (name) => {
      const m = new RegExp('private static (?:string|int) ' + name + '\\(').exec(t);
      if (!m) return '';
      let k = t.indexOf('{', m.index), depth = 0;
      for (let x = k; x < t.length; x++) { if (t[x] === '{') depth++; else if (t[x] === '}') { depth--; if (depth === 0) return t.slice(m.index, x + 1); } }
      return '';
    };
    const sIn = body('seedImageChats'), uIn = body('unseedImageChats'), eIn = body('ensurePhoto');
    const LOOP = 'for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)';
    const logs = [...(sIn + uIn + eIn).matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => norm(m[1]));
    const badLogs = logs.filter((a) => !/^"\[DEVSEED\] [^"]*"/.test(a) || /\b(path|leaf|tmp|dir|sentDir|recvDir|text|peer|address|Message|ToString)\b/.test(a.replace(/e\.GetType\(\)\.Name/g, '')));
    /* ★ #46 r1 S-1: NO `[DEVSEED]` line in either seed file, and nothing handleDevSeedVerb pushes or logs, carries an exception's
       message, ToString or a bare exception object — a .NET IO message holds the FULL PATH (an OS user name and an address) and ixian.log
       can be shared from the Developer screen. Only `e.GetType().Name` is allowed. */
    const SP = 'Spixi/Pages/Settings/SettingsPage.xaml.cs';
    const spT = mask(raw(SP));
    const hv = (() => {
      const m = /private bool handleDevSeedVerb\(/.exec(spT);
      if (!m) return '';
      const k = spT.indexOf('{', m.index);
      let depth = 0;
      for (let x = k; x < spT.length; x++) { if (spT[x] === '{') depth++; else if (spT[x] === '}') { depth--; if (depth === 0) return spT.slice(m.index, x + 1); } }
      return '';
    })();
    const devLogs = [...t.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => ({ at: SEED + ':' + lineOf(t, m.index), a: norm(m[1]) }))
      .concat([...hv.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => ({ at: SP + ':' + lineOf(spT, spT.indexOf(hv) + m.index), a: norm(m[1]) })));
    const leaks = (a) => /\.Message\b|\.ToString\(\)|\.StackTrace\b|\.InnerException\b/.test(a) || /\b(e|ex)\b/.test(a.replace(/\b(e|ex)\.GetType\(\)\.Name\b/g, ''));
    const leakLines = devLogs.filter((l) => /\[DEVSEED\]/.test(l.a) && leaks(l.a)).map((l) => l.at + ' ' + l.a);
    const hvPush = hv.replace(/\b(e|ex)\.GetType\(\)\.Name\b/g, '').replace(/catch \(Exception ex\)/g, 'catch (Exception)');   // the declaration and the type name are the only allowed uses of `ex`
    const hvLeaks = [...hvPush.matchAll(/[^;{}]*\bex\b[^;{}]*[;{}]/g)].map((m) => SP + ' ' + norm(m[0]));
    const noMessageLeak = hv.length > 200 && /catch \(Exception ex\)/.test(hv) && /GetType\(\)\.Name/.test(hv) && devLogs.length >= 8 && leakLines.length === 0 && hvLeaks.length === 0;
    const r = {
      noMessageLeak,
      seedLoop: sIn.includes(LOOP) && /Address address = addressFor\(i\);/.test(sIn) && /byte\[\] id = messageIdFor\(i, m\.j\);/.test(sIn)
        && /FriendList\.addMessageWithType\(id, FriendMessageType\.fileHeader, address, 0, SDevSeedPlan\.headerText\(i, m, size\),\s*m\.local, null, m\.ts, false, 0\)/.test(sIn)
        && /FriendList\.addMessageWithType\(id, FriendMessageType\.standard, address, 0, m\.text, m\.local, null, m\.ts, false, 0\)/.test(sIn),
      /* ★ #46 r1 B-5: `completed` BEFORE `filePath` — TransferManager.completeFileTransfer's order (:923-924); Core's writer thread reads the row without a lock and a SENT row with a filePath and completed == false is re-armed as a transfer on read */
      completed: /fm\.transferId = SDevSeedPlan\.transferUid\(i, m\.j\);[\s\S]{0,300}?fm\.completed = true;\s*fm\.filePath = path;/.test(sIn) && (sIn.match(/fm\.completed = true;/g) || []).length === 1 && (sIn.match(/fm\.filePath = path;/g) || []).length === 1,
      album: /SPhotoGroups\.setMany\(peer, albumRows, peer\);/.test(sIn) && /PhotoRules\.groupArg\(album, m\.albumIndex, m\.albumCount, ""\)/.test(sIn),
      seedCalls: /status \+= " " \+ seedImageChats\(\);/.test(t),
      /* the ONE removal loop of unseed walks 0 … 56 — the fifty, the image chats, the file chats (filewalk) and the quote chat (walktools2) — (a second FriendList.removeFriend site would break the S15 O-06 walk,
         scripts/pins-s15/b-native.mjs: 7 sites); unseedImageChats then clears the groups and the files of a REMOVED chat only */
      /* ★ filewalk re-base: the bound now ends at the file chats (FileChatFirst = ImageChatFirst + ImageChats, no gap; pin a14) — still ONE site */
      /* ★ walktools2 re-base: … and the quote chat (QuoteChatFirst = FileChatFirst + FileChats, no gap; pins-walktools2/a-quote-seed q2) — still ONE site */
      unseed: /public static string unseed\(\)\s*\{\s*int removed = 0, missing = 0, refused = 0;\s*for \(int i = 0; i < SDevSeedPlan\.QuoteChatFirst \+ SDevSeedPlan\.QuoteChats; i\+\+\)/.test(t)
        && (t.match(/FriendList\.removeFriend\(/g) || []).length === 1
        && uIn.includes(LOOP) && /if \(FriendList\.getFriend\(address\) != null\)\s*\{\s*refused\+\+;[^}]*continue;\s*\}\s*SPhotoGroups\.clear\(address\.ToString\(\)\);/.test(uIn)
        && /status \+= " " \+ unseedImageChats\(\);/.test(t),
      status: (t.match(new RegExp(LOOP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length === 3,
      logs: logs.length >= 4 && badLogs.length === 0,
    };
    ok(Object.values(r).every(Boolean), '★ perfb1 seed (5): no [DEVSEED] line and no status handleDevSeedVerb pushes carries an exception message / ToString / bare exception (type name only — an IO message holds a full path); the image chats (seed index SDevSeedPlan.ImageChatFirst …) take addressFor(i) and messageIdFor(i, j) like every seed contact, store through Core\'s FriendList.addMessageWithType with the completed-transfer fields and the album through SPhotoGroups.setMany; seed, unseed (contact, photo groups, files) and status all walk them; every new log line starts with [DEVSEED] and carries indexes and exception TYPES only — ' + JSON.stringify({ ...r, badLogs, leakLines, hvLeaks }));
  }

  /* ── 6: the O-35 store-release gate (read only) ── */
  {
    const cp = raw('Spixi/Spixi.csproj');
    const lines = cp.split('\n');
    const at = (re) => lines.findIndex((l) => re.test(l)) + 1;
    const target = at(/<Target Name="SpixiStoreReleaseGate" BeforeTargets="PrepareForBuild" Condition="'\$\(SpixiStoreRelease\)' == 'true'">/);
    const sym = at(/<Error Condition="\$\(DefineConstants\.Contains\('SPIXI_DEV_COEXIST'\)\)" Text="Spixi store-release gate \(O-35\): SPIXI_DEV_COEXIST is in DefineConstants in a store build\. Remove it\." \/>/);
    const prop = at(/<Error Condition="'\$\(SpixiDevCoexist\)' == 'true'" Text="Spixi store-release gate \(O-35\): SpixiDevCoexist=true in a store build\./);
    const end = lines.findIndex((l, k) => k >= target && /<\/Target>/.test(l)) + 1;
    const r = { target: 'Spixi/Spixi.csproj:' + target, symbolError: 'Spixi/Spixi.csproj:' + sym, propertyError: 'Spixi/Spixi.csproj:' + prop, end: 'Spixi/Spixi.csproj:' + end };
    ok(target > 0 && sym > target && prop > target && end > sym && end > prop,
      '★ perfb1 seed (6): Spixi/Spixi.csproj still holds the O-35 store-release gate — a store build (SpixiStoreRelease=true) is REFUSED when SPIXI_DEV_COEXIST is in DefineConstants or SpixiDevCoexist is true, so the seed files never reach a store build — ' + JSON.stringify(r));
  }
  /* ── 7: ★ #46 r1 B-2 — every delete sits behind the proof by CONTENT; the temp is only in Sent/ ── */
  {
    const t = files[SEED], p = files[PLAN];
    const deletes = [...t.matchAll(/File\.Delete\(/g)].map((m) => ({ at: SEED + ':' + lineOf(t, m.index), before: norm(t.slice(Math.max(0, m.index - 260), m.index)) }));
    const guard = { photo: /if \(SDevSeedPlan\.mayDelete\(state\)\)\s*\{\s*File\.Delete\(path\);/.test(t), tmp: /if \(SDevSeedPlan\.mayDeleteTmp\(tmpName, i, j\) && File\.Exists\(tmp\)\)\s*\{\s*File\.Delete\(tmp\);/.test(t) };
    /* ★ filewalk re-base: 2 → 4 — the file chats' two deletes sit behind mayDelete(fState) and mayDeleteFileTmp (pin a7) */
    const behind = deletes.length === 4 && deletes.every((d) => /if \(SDevSeedPlan\.mayDelete(?:Tmp|FileTmp)?\([^)]*\)[^{]*\)\s*\{\s*$/.test(d.before));
    const r = {
      deletes: deletes.map((d) => d.at), behind, guard,
      /* the state comes from the content proof ONLY, and the action from the state */
      stateFromContent: (t.match(/string state = stateOf\(path, i, m\);/g) || []).length === 1 && /SDevSeedPlan\.fileAction\(stateOf\(path, i, m\)\)/.test(t) && (t.match(/SDevSeedPlan\.fileAction\(/g) || []).length === 2 && /SDevSeedPlan\.fileAction\(fileChatStateOf\(fPath, i, m\)\)/.test(t)   /* ★ filewalk re-base: 1 → 2 (ensureFileChatFile, pin a8) */
        && /return SDevSeedPlan\.fileState\(fi\.Exists, fi\.Exists \? fi\.Length : 0, SDevSeedPlan\.pngLength\(m\.width, m\.height\),\s*\(\) => File\.ReadAllBytes\(path\), \(\) => SDevSeedPlan\.png\(i, m\.j, m\.width, m\.height\)\);/.test(t),
      /* no length-only rule is left in the plan; the proof hashes both sides; foreign is refused, only ours is deleted */
      planProof: !/fileAction\(bool|mayDelete\(bool|FileKeep : FileRefuse;\s*\}\s*\/\*\* unseed/.test(p) && /public static string fileState\(bool exists, long length, long expectedLength, Func<byte\[\]> read, Func<byte\[\]> expected\)/.test(p)
        && /return have\.Length == want\.Length && hex\(SHA256\.HashData\(have\), 32\) == hex\(SHA256\.HashData\(want\), 32\);/.test(p)
        && /public static bool mayDelete\(string state\)\s*\{\s*return state == StateOurs;\s*\}/.test(p)
        && /return state == StateOurs \? FileKeep : FileRefuse;/.test(p)
        && /return leaf != null && PhotoRules\.isPendingName\(leaf\) && leaf == tmpLeaf\(i, j\);/.test(p),
      /* a failed write removes only OUR temp, through the same guard; File.Move has no overwrite flag */
      failPath: /catch \(Exception\)\s*\{\s*try \{ deleteOwnTmp\(sentDir, i, m\.j\); \} catch \(Exception\) \{ \}\s*throw;\s*\}/.test(t) && !/File\.Move\([^)]*,[^)]*,/.test(t) && !/File\.Copy|File\.Replace|FileMode\.Create|overwrite/.test(t),
      /* the temp is never joined to recvDir / Downloads */
      tmpNeverInDownloads: !/tmp[^;]*recvDir|recvDir[^;]*tmp|tmpLeaf\([^)]*\)[^;]*recvDir|Downloads[^;]*tmpLeaf/.test(t),
    };
    ok(r.behind && r.guard.photo && r.guard.tmp && r.stateFromContent && r.planProof && r.failPath && r.tmpNeverInDownloads,
      '★ perfb1 seed (7) (#46 r1 B-2): the seed and the unseed touch only what they can PROVE is theirs — each of the 4 File.Delete calls (2 of the image chats, 2 of the file chats) sits behind SDevSeedPlan.mayDelete (the file\'s SHA-256 = the deterministic PNG\'s) or mayDeleteTmp / mayDeleteFileTmp (the exact temp leaf, in Sent/), the state comes from the content proof only (a name or a length is never one), a foreign file is refused (never overwritten, never adopted), the temp lives in the app\'s own Sent/ folder for both directions and never in Downloads/ — ' + JSON.stringify(r));
  }

  /* ── 8: ★ #46 r1 B-3 — the image chats sit at a FIXED time ── */
  {
    const t = files[SEED], p = files[PLAN];
    const body = (src, re) => { const m = re.exec(src); if (!m) return ''; let k = src.indexOf('{', m.index), depth = 0; for (let x = k; x < src.length; x++) { if (src[x] === '{') depth++; else if (src[x] === '}') { depth--; if (depth === 0) return src.slice(m.index, x + 1); } } return ''; };
    const noStr = (x) => x.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');   // a string literal ("Sending a few now.") is text, not a clock
    const plan = noStr(body(p, /public static List<ImageMsg> imagePlan\(/));
    const imgSeed = noStr(body(t, /private static string seedImageChats\(/) + body(t, /private static string unseedImageChats\(/));
    const r = {
      anchor: /public const long ImageAnchor = 1767268800;/.test(p) && /long t = ImageAnchor - k \* 3600L;/.test(plan),
      planHasNoNow: plan.length > 500 && /public static List<ImageMsg> imagePlan\(int i\)/.test(plan) && !/\bnow\b|Clock|DateTime|getTimestamp|ImageAgeSeconds/.test(plan) && !/ImageAgeSeconds/.test(p),
      imageHalfHasNoNow: imgSeed.length > 500 && !/\bnow\b|Clock|getTimestamp/.test(imgSeed) && /private static string seedImageChats\(\)/.test(t),
      seedClockOnce: (t.match(/long now = Clock\.getTimestamp\(\);/g) || []).length === 1,
    };
    ok(Object.values(r).every(Boolean),
      '★ perfb1 seed (8) (#46 r1 B-3): the image chats sit at ImageAnchor (2026-01-01 12:00 UTC), never at `now − …` — imagePlan(i) takes no time, the image half of SDevSeed reads no clock, so a top-up on a later day moves nothing and Seed 51–53 stay older than every Seed 01–50 message of any run — ' + JSON.stringify(r));
  }
  /* ── 9: ★ #46 r1 C-3 — the Seed 01–50 rules of SDevSeed.cs are the plan's copy, BODY FOR BODY (an added statement, a changed argument or a
        changed call site goes red; row 4 only counted that each statement is present once) ── */
  {
    const S = files[SEED], P = files[PLAN];
    const bodyOf = (src, re) => { const m = re.exec(src); if (!m) return null; const k = src.indexOf('{', m.index); let depth = 0; for (let x = k; x < src.length; x++) { if (src[x] === '{') depth++; else if (src[x] === '}') { depth--; if (depth === 0) return norm(src.slice(k + 1, x)); } } return null; };
    const between = (src, a, b) => { const i = src.indexOf(a); const j = i < 0 ? -1 : src.indexOf(b, i); return i < 0 || j < 0 ? null : norm(src.slice(i, j + b.length)); };
    const addrS = bodyOf(S, /private static Address addressFor\(int i\)/), addrP = bodyOf(P, /public static byte\[\] addressBytes\(int i\)/);
    const TAIL_S = 'return new Address(raw, null, false);', TAIL_P = 'return raw;';
    const idS = bodyOf(S, /private static byte\[\] messageIdFor\(int i, int j\)/), idP = bodyOf(P, /public static byte\[\] messageIdFor\(int i, int j\)/);
    const cntS = bodyOf(S, /private static int countFor\(string profile, int i\)/), cntP = bodyOf(P, /public static int countFor\(string profile, int i\)/);
    const consts = (src) => Object.fromEntries([...src.matchAll(/\bconst (?:int|string) (Count|HeavyContacts|HeavyMessages|MediumMessages|Salt) = ([^;]+);/g)].map((m) => [m[1], norm(m[2])]));
    const cS = consts(S), cP = consts(P);
    const seedBody = bodyOf(S, /public static string seed\(string profile\)/) || '';
    const LOOP = "Address address = addressFor(i); string nick = \"Seed \" + (i + 1).ToString(\"00\") + \" \" + Names[i % Names.Length]; Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.Approved, address, null, nick, null, null, 0, true); if (friend == null) { friend = FriendList.getFriend(address); if (friend == null) { refused++; continue; } present++; } else { added++; } int count = countFor(profile, i); long first = now - 30L * 86400 + (i * 3600L) % 86400; long step = Math.Max(1, (now - 3600 - first) / Math.Max(1, count)); int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0; long contactStart = clock.ElapsedMilliseconds; int contactMessages = 0; for (int j = 0; j < count; j++) { bool local = (i + j) % 2 == 0; bool tail = j >= count - unreadTail; if (tail) local = false; long ts = tail ? now + 1 + (j - (count - unreadTail)) : first + j * step; string text = Lines[(i + j) % Lines.Length]; try { FriendList.addMessageWithType(messageIdFor(i, j), FriendMessageType.standard, address, 0, text, local, null, ts, false, 0); messages++; contactMessages++;";
    const loop = between(seedBody, 'Address address = addressFor(i);', 'contactMessages++;');
    const r = {
      addressBody: !!addrS && !!addrP && addrS.endsWith(TAIL_S) && addrP.endsWith(TAIL_P) && addrS.slice(0, -TAIL_S.length).trim() === addrP.slice(0, -TAIL_P.length).trim() && addrS.length > 100,
      addressTail: !!addrS && addrS.endsWith(' ' + TAIL_S) && !!addrP && addrP.endsWith(' ' + TAIL_P),
      messageIdBody: !!idS && idS === idP && idS === 'return SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i + ":" + j));',
      countBody: !!cntS && cntS === cntP && cntS.length > 80,
      constants: Object.keys(cS).length === 5 && JSON.stringify(cS) === JSON.stringify(cP) && cS.Count === '50' && cS.HeavyContacts === '10' && cS.HeavyMessages === '1000' && cS.MediumMessages === '40' && cS.Salt === '"spixi-dev-seed:"',
      seedLoop: loop === LOOP,
    };
    ok(Object.values(r).every(Boolean), '★ perfb1 seed (9) (#46 r1 C-3): the Seed 01–50 rules the APP runs (SDevSeed.cs) equal their harness copy (SDevSeedPlan.cs) body for body — addressFor (the common part; the Address wrapper pinned as the one differing tail), messageIdFor, countFor, the constants — and the seed loop from `Address address = addressFor(i);` to its addMessageWithType call is contiguous exact text, so an added statement, a changed argument or a changed call site (addressFor(i + 1)) is red — ' + JSON.stringify({ ...r, loopGot: r.seedLoop ? 'equal' : loop, idGot: r.messageIdBody ? 'equal' : [idS, idP], countGot: r.countBody ? 'equal' : [cntS, cntP], cS, cP }));
  }

  /* ── 10: ★ #46 r1 C-4 — the image-seed glue cannot skip its own rules (whole bodies, one named key per guard) ── */
  {
    const S = files[SEED];
    const bodyOf = (src, re) => { const m = re.exec(src); if (!m) return ''; const k = src.indexOf('{', m.index); let depth = 0; for (let x = k; x < src.length; x++) { if (src[x] === '{') depth++; else if (src[x] === '}') { depth--; if (depth === 0) return norm(src.slice(k + 1, x)); } } return ''; };
    const span = (src, a, b) => { const i = src.indexOf(a); const j = i < 0 ? -1 : src.indexOf(b, i); return i < 0 || j < 0 ? '' : norm(src.slice(i, j + b.length)); };
    const ens = bodyOf(S, /private static int ensurePhoto\(/), st = bodyOf(S, /private static string stateOf\(/), dt = bodyOf(S, /private static int deleteOwnTmp\(/);
    const sImg = bodyOf(S, /private static string seedImageChats\(/), uImg = bodyOf(S, /private static string unseedImageChats\(/);
    const sSpan = span(sImg, 'string sentDir = Path.Combine(', 'friend.save(); } }'), uSpan = span(uImg, 'string sentDir = Path.Combine(', 'removal stopped (" + e.GetType().Name + ")"); }');
    const W = {
  "ensure": "string path = Path.Combine(dir, leaf); string action = SDevSeedPlan.fileAction(stateOf(path, i, m)); if (action == SDevSeedPlan.FileKeep) { return 0; } if (action != SDevSeedPlan.FileWrite) { return -1; } string tmp = Path.Combine(sentDir, SDevSeedPlan.tmpLeaf(i, m.j)); try { File.WriteAllBytes(tmp, SDevSeedPlan.png(i, m.j, m.width, m.height)); File.Move(tmp, path); } catch (Exception) { try { deleteOwnTmp(sentDir, i, m.j); } catch (Exception) { } throw; } return 1;",
  "stateOf": "FileInfo fi = new FileInfo(path); return SDevSeedPlan.fileState(fi.Exists, fi.Exists ? fi.Length : 0, SDevSeedPlan.pngLength(m.width, m.height), () => File.ReadAllBytes(path), () => SDevSeedPlan.png(i, m.j, m.width, m.height));",
  "delTmp": "string tmpName = SDevSeedPlan.tmpLeaf(i, j); string tmp = Path.Combine(sentDir, tmpName); if (SDevSeedPlan.mayDeleteTmp(tmpName, i, j) && File.Exists(tmp)) { File.Delete(tmp); return 1; } return 0;",
  "seedSpan": "string sentDir = Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName); string recvDir = TransferManager.downloadsPath; bool dirsOk = Path.IsPathRooted(sentDir) && Path.IsPathRooted(recvDir); if (dirsOk) { Directory.CreateDirectory(sentDir); Directory.CreateDirectory(recvDir); } for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++) { Address address = addressFor(i); Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.Approved, address, null, SDevSeedPlan.imageNick(i), null, null, 0, true); if (friend == null) { friend = FriendList.getFriend(address); if (friend == null) { refused++; continue; } present++; } else { added++; } string peer = address.ToString(); string album = SDevSeedPlan.albumId(i); List<KeyValuePair<string, string>> albumRows = new List<KeyValuePair<string, string>>(); foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i)) { byte[] id = messageIdFor(i, m.j); try { if (!m.photo) { if (FriendList.addMessageWithType(id, FriendMessageType.standard, address, 0, m.text, m.local, null, m.ts, false, 0) != null) texts++; continue; } if (!dirsOk) { refused++; continue; } string dir = m.local ? sentDir : recvDir; string leaf = SDevSeedPlan.localLeaf(i, m); string path = Path.Combine(dir, leaf); long size = SDevSeedPlan.pngLength(m.width, m.height); if ((m.local && PhotoRules.sentFileName(SDevSeedPlan.transferUid(i, m.j), \".png\") != leaf) || (!m.local && !TransferManager.isInsideDownloadsRoot(path))) { refused++; continue; } int wrote = ensurePhoto(sentDir, dir, leaf, i, m); if (wrote < 0) { refused++; continue; } files += wrote; FriendMessage? fm = FriendList.addMessageWithType(id, FriendMessageType.fileHeader, address, 0, SDevSeedPlan.headerText(i, m, size), m.local, null, m.ts, false, 0); if (m.albumIndex >= 0) { albumRows.Add(new KeyValuePair<string, string>(Crypto.hashToString(id), PhotoRules.groupArg(album, m.albumIndex, m.albumCount, \"\"))); } if (fm == null) { continue; } fm.transferId = SDevSeedPlan.transferUid(i, m.j); if (!m.local) { fm.fileSize = (ulong)size; } fm.completed = true; fm.filePath = path; photos++; } catch (Exception e) { refused++; Logging.warn(\"[DEVSEED] image message \" + i + \":\" + m.j + \" skipped (\" + e.GetType().Name + \")\"); } } if (albumRows.Count > 0) { SPhotoGroups.setMany(peer, albumRows, peer); } IxianHandler.localStorage.requestWriteMessages(address, 0); friend.save(); } }",
  "unseedSpan": "string sentDir = Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName); string recvDir = TransferManager.downloadsPath; bool dirsOk = Path.IsPathRooted(sentDir) && Path.IsPathRooted(recvDir); for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++) { Address address = addressFor(i); if (FriendList.getFriend(address) != null) { refused++; continue; } SPhotoGroups.clear(address.ToString()); if (!dirsOk) { continue; } foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i)) { if (!m.photo) { continue; } try { string dir = m.local ? sentDir : recvDir; string leaf = SDevSeedPlan.localLeaf(i, m); string path = Path.Combine(dir, leaf); deleted += deleteOwnTmp(sentDir, i, m.j); if (!m.local && !TransferManager.isInsideDownloadsRoot(path)) { continue; } string state = stateOf(path, i, m); if (SDevSeedPlan.mayDelete(state)) { File.Delete(path); deleted++; } else if (state == SDevSeedPlan.StateForeign) { refused++; } } catch (Exception e) { refused++; Logging.warn(\"[DEVSEED] image file \" + i + \":\" + m.j + \" not removed (\" + e.GetType().Name + \")\"); } } } } catch (Exception e) { refused++; Logging.warn(\"[DEVSEED] image chats removal stopped (\" + e.GetType().Name + \")\"); }"
};
    const r = {
      ensureWhole: ens === W.ensure,                       // E12 / E13: the inputs of fileAction, the refuse branch, the keep branch, the temp, the move
      ensureRefuse: ens.includes('if (action != SDevSeedPlan.FileWrite) { return -1; }') && ens.includes('SDevSeedPlan.fileAction(stateOf(path, i, m))'),
      stateOfWhole: st === W.stateOf, deleteOwnTmpWhole: dt === W.delTmp,
      seedWhole: sSpan === W.seedSpan,
      seedIterates: sImg.includes('for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++) { Address address = addressFor(i);') && sImg.includes('foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i)) { byte[] id = messageIdFor(i, m.j);'),   // E11
      seedNameGuard: sImg.includes('if ((m.local && PhotoRules.sentFileName(SDevSeedPlan.transferUid(i, m.j), ".png") != leaf) || (!m.local && !TransferManager.isInsideDownloadsRoot(path))) { refused++; continue; } int wrote = ensurePhoto(sentDir, dir, leaf, i, m);'),   // E8
      seedCompleted: sImg.includes('fm.transferId = SDevSeedPlan.transferUid(i, m.j); if (!m.local) { fm.fileSize = (ulong)size; } fm.completed = true; fm.filePath = path; photos++;'),   // E15 (B-5 order)
      seedWritesToDisk: sImg.includes('SPhotoGroups.setMany(peer, albumRows, peer); } IxianHandler.localStorage.requestWriteMessages(address, 0); friend.save(); } }'),   // E10
      unseedWhole: uSpan === W.unseedSpan,
      unseedIterates: uImg.includes('foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i)) { if (!m.photo) { continue; }'),   // E11
      unseedDownloadsGuard: uImg.includes('if (!m.local && !TransferManager.isInsideDownloadsRoot(path)) { continue; } string state = stateOf(path, i, m);'),   // E9
      unseedDeleteGuard: uImg.includes('if (SDevSeedPlan.mayDelete(state)) { File.Delete(path); deleted++; } else if (state == SDevSeedPlan.StateForeign) { refused++; }'),   // E7
    };
    const got = (k, a, b) => (r[k] ? 'equal' : a);
    ok(Object.values(r).every(Boolean), '★ perfb1 seed (10) (#46 r1 C-4): the image-seed glue cannot skip its own rules — ensurePhoto, stateOf, deleteOwnTmp and the folder-guard-to-File.Delete spans of seedImageChats / unseedImageChats are pinned as whole normalised text, with a named key for each guard: the loops iterate SDevSeedPlan.imagePlan(i) with their own i, the name-shape / Downloads-root guards of seed and unseed, the delete guard (mayDelete), requestWriteMessages after the loop, `completed` set for every photo before `filePath`, fileAction fed by the content proof with its refuse branch — ' + JSON.stringify({ ...r, ensureGot: r.ensureWhole ? 'equal' : ens, seedGot: r.seedWhole ? 'equal' : sSpan, unseedGot: r.unseedWhole ? 'equal' : uSpan }));
  }
  /* ── 11: ★ #46 r2 R2-2 + r3 R3-1 — the REST of Seed 01–50 is frozen: the Names array, the Lines array and the WHOLE bodies of seed(), seed(string profile),
        unseed() and status(), each as the SHA-256 of its normalised text (comments stripped, white space normalised). Relative to the BASE (a54808c): Names, Lines and the
        no-argument seed() are byte-identical; seed(string profile) = base + the S-1 log line (`skipped: " + e.GetType().Name`, base `e.Message`) + `status += " " + seedImageChats();`;
        unseed() = base + the loop bound (`i < Count` → `i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats`) + the S-1 remove log line (`e.GetType().Name`) +
        `status += " " + unseedImageChats();`; status() = base + the image half (`images`, its loop over the three image chats, the combined return).
        ★ filewalk re-base: seed(profile) + `status += " " + seedFileChats();`, unseed() + `status += " " + unseedFileChats();` and its loop bound
        `i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats` → `i < SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats`, status() + the ONE
        `if (present > 0 || images > 0 || fileChatsPresent() > 0) return … file chats (Seed 54-56).";` line before the "Nothing seeded." test. ── */
  {
    const S = files[SEED];
    const sha = (x) => createHash('sha256').update(x, 'utf8').digest('hex');
    const arr = (name) => { const i = S.indexOf('string[] ' + name + ' = {'); const j = i < 0 ? -1 : S.indexOf('};', i); return i < 0 || j < 0 ? '' : norm(S.slice(i, j + 2)); };
    const bodyOf = (re) => { const m = re.exec(S); if (!m) return ''; const k = S.indexOf('{', m.index); let depth = 0; for (let x = k; x < S.length; x++) { if (S[x] === '{') depth++; else if (S[x] === '}') { depth--; if (depth === 0) return norm(S.slice(k + 1, x)); } } return ''; };
    const seed1 = bodyOf(/public static string seed\(string profile\)/);
    const WANT = {
      names: 'd126dcf2e31f16f0c1820517d3f6889b27b44c95acd54bdd3f89cc6708441d76', lines: 'a29100b33df4512dd26da5a9d0abb6d8fd6c8809bdb3c91cec67774ca2460489',
      seed0: '932b132d96d1e310fd69c5274e27935b129a1fda3c1f352f7d92dc0f4d67a325', seedBody: 'a1f7266372f1c01b6f6236da315d2893210fb593064846b39f0a47b04d0bb4ac',   // ★ filewalk re-base: + `status += " " + seedFileChats();` · ★ walktools2 re-base: + `status += " " + seedQuoteChat();`
      unseed: '0193d7ee2519c00a94ebd09601945344a8c357a6d90889282945357f151ffc6f', status: '0720fb8c4506167ec1aa90e69bf9f89f53a6f86f39e8abca67d1a5fcfdebd56a',   /* ★ walktools2 re-base: unseed's loop bound → QuoteChatFirst + QuoteChats; status's ONE return statement + `|| quoteChatsPresent() > 0` and ", n of 1 quote chat (Seed 57)" (pins-walktools2/a-quote-seed q2) */   // ★ filewalk re-base: + one hook statement each (unseed: `status += " " + unseedFileChats();` + the loop bound FileChatFirst + FileChats; status: the `if (… fileChatsPresent() > 0) return …;` line)
    };
    const got = {
      names: sha(arr('Names')), lines: sha(arr('Lines')), seed0: sha(bodyOf(/public static string seed\(\)/)), seedBody: sha(seed1),
      unseed: sha(bodyOf(/public static string unseed\(\)/)), status: sha(bodyOf(/public static string status\(\)/)),
    };
    const r = Object.fromEntries(Object.keys(WANT).map((k) => [k, got[k] === WANT[k]]));
    r.endsAtStatus = seed1.startsWith('if (profile != "heavy") profile = "light";') && seed1.endsWith('status += " " + seedImageChats(); status += " " + seedFileChats(); status += " " + seedQuoteChat(); Logging.info("[DEVSEED] " + status); return status;');   // ★ filewalk re-base · ★ walktools2 re-base: + `status += " " + seedQuoteChat();`
    ok(Object.values(r).every(Boolean), '★ perfb1 seed (11) (#46 r2 R2-2 + r3 R3-1): the rest of Seed 01–50 is frozen — the Names and Lines arrays and the WHOLE bodies of seed(), seed(string profile), unseed() and status() equal their SHA-256; relative to the base a54808c: Names, Lines and seed() are identical; seed(profile) = base + the S-1 log line + `status += … seedImageChats()`; unseed() = base + the loop bound (now over 57 indexes: the fifty, the image chats, the file chats and the quote chat) + the S-1 log line + `status += … unseedImageChats()` + `status += … unseedFileChats()`; status() = base + the image half. A changed loop start, unread count, saveMetaData, text, name, an added statement after the status line, an unseed address or a status loop bound is red. Re-base: copy got=<hash> — ' + JSON.stringify({ ...r, got: Object.entries(got).filter(([k]) => !r[k]).map(([k, v]) => k + ' got=' + v) }));
  }
}
