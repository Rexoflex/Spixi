/* ==== walktools2 item 1 — THE DEV QUOTE CHAT (seed index 56 = "Seed 57 Mojca Vrabec": 1000 text rows, four of them replies), the source half.
 *
 * LIMITS (#1735, stated in the first version). SOURCE checks only: Spixi/Utils/SDevSeed.cs (the writer) compiles nowhere here (Core, MAUI;
 * ⚠ C# UNCOMPILED — Damir's dev build is the gate), so this pin reads its masked text (comments → spaces, strings kept — the e-image-seed
 * mask; a raw string literal is read as ordinary text) and normalised white space (a change of spaces INSIDE a string literal is not seen).
 * The plan's BEHAVIOUR (1000 rows, the 16-byte ids and the page's id rule, the reply shape through ReplyQuote.compose, the match through
 * ReplyQuote.tryMatch, the depth rule in both states of FirstOlderPage50, the fixed times, the collisions, the top-up) is EXECUTED by
 * scripts/csh/WalkTools2SeedTests.cs — the CSH count is that gate, not this pin. NOT seen here: what Core does with the rows (its in-memory
 * window, its read flag), the chats-list order on a phone, a statement moved inside the same body when its neighbours stay the same
 * (q8 hashes the two new glue bodies whole, so any change there is red). Every reported `file:line` is a line of the raw file. One `ok` per key (8):
 *   q1 devOnly      — both seed files are WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif`, the new code included
 *   q2 hooks        — exactly the THREE one-statement hooks: seed(profile) `status += " " + seedQuoteChat();` right after the file line; unseed()'s
 *                     ONE removal loop ends at QuoteChatFirst + QuoteChats (= FileChatFirst + FileChats + 1, no gap); status() returns the old
 *                     sentence with ", n of 1 quote chat (Seed 57)" before its full stop; the new functions are called from there only
 *   q3 noNetNoDisk  — the quote glue and the plan's § 4 hold no network token, no app send path and no file call (text rows only)
 *   q4 logsTypesOnly — the 2 new log lines start with [DEVSEED] and carry the seed index, j and exception TYPE names only
 *   q5 rows         — addressFor(i), the nick SDevSeedPlan.quoteNick(i), ONE write per planned row through Core's FriendList.addMessageWithType with
 *                     the 16-byte id SDevSeedPlan.quoteRowIdFor(i, m.j), the plan's text / side / time; friend.save() after the chat
 *   q6 topUp        — a PRESENT quote chat follows the file chats' rule: SDevSeedPlan.quoteTopUpAction(presentIds(friend), i) — skip / partial
 *                     ("Remove the seed, then Seed") / write; the rule's body in the plan
 *   q7 planShape    — the plan builds a reply with the app's own code (ReplyQuote.excerptOf(standard, target text, null, false) +
 *                     ReplyQuote.compose("", …): a 1:1 carries no name), the id = the first RealMessageIdLength bytes of messageIdFor(i, j),
 *                     the times from QuoteAnchor = ImageAnchor − 6 h with no clock, the nick in the "Seed NN " shape
 *   q8 glueFrozen   — the WHOLE normalised bodies of seedQuoteChat and quoteChatsPresent as SHA-256 (re-base: look at the diff, copy got=<hash>)
 * Deliberate breaks (#802): one one-token mutation per key in a full copy of the tree (the walktools2 report); a break INSIDE the two glue
 * bodies (q4, q5, q6) also turns q8 red, by design (q8 holds those bodies whole); q1, q2, q3, q7 and q8 go red alone. */
import { createHash } from 'node:crypto';
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
  const method = (src, re) => {
    const m = re.exec(src); if (!m) return '';
    const k = src.indexOf('{', m.index); let depth = 0;
    for (let x = k; x < src.length; x++) { if (src[x] === '{') depth++; else if (src[x] === '}') { depth--; if (depth === 0) return src.slice(m.index, x + 1); } }
    return '';
  };
  const bodyN = (src, re) => { const t = method(src, re); const k = t.indexOf('{'); return k < 0 ? '' : norm(t.slice(k + 1, -1)); };
  const count = (t, re) => (t.match(re) || []).length;

  const SEED = 'Spixi/Utils/SDevSeed.cs', PLAN = 'Spixi/Utils/SDevSeedPlan.cs';
  const S = mask(raw(SEED)), P = mask(raw(PLAN));
  const G = { seed: method(S, /private static string seedQuoteChat\(\)/), present: method(S, /private static int quoteChatsPresent\(\)/) };
  const glue = G.seed + '\n' + G.present;
  const sec = (() => { const a = P.indexOf('public const int QuoteChatFirst ='), b = P.indexOf('private static readonly byte[] Signature'); return a < 0 || b < a ? '' : P.slice(a, b); })();
  const glueOk = G.seed.length > 500 && G.present.length > 100 && sec.length > 2000;

  /* ── q1 devOnly ── */
  {
    const r = {};
    for (const [f, t] of [[SEED, S], [PLAN, P]]) {
      const lines = t.split('\n');
      const dir = lines.map((l, k) => [k + 1, l.trim()]).filter(([, l]) => /^#(if|elif|else|endif)\b/.test(l));
      const firstCode = lines.findIndex((l) => l.trim().length > 0) + 1;
      let lastCode = 0; lines.forEach((l, k) => { if (l.trim().length > 0) lastCode = k + 1; });
      let depth = 0, closes = 0, other = 0;
      for (const [, l] of dir) { if (/^#if\b/.test(l)) depth++; else if (/^#endif\b/.test(l)) { depth--; if (depth === 0) closes++; } else other++; }
      r[f] = dir.length > 0 && dir[0][0] === firstCode && /^#if SPIXI_DEV_COEXIST\s*$/.test(dir[0][1]) && dir[dir.length - 1][0] === lastCode && /^#endif\b/.test(dir[dir.length - 1][1]) && closes === 1 && depth === 0 && other === 0;
    }
    const inside = (t, needle) => { const i = t.indexOf(needle), a = t.indexOf('#if SPIXI_DEV_COEXIST'), b = t.lastIndexOf('#endif'); return a >= 0 && i > a && i < b; };
    r.newCodeInside = glueOk && inside(S, 'private static string seedQuoteChat()') && inside(S, 'private static int quoteChatsPresent()') && inside(P, 'public static List<QuoteMsg> quotePlan(int i)') && inside(P, 'public static byte[] quoteRowIdFor(int i, int j)');
    ok(Object.values(r).every(Boolean), '★ walktools2 quote seed (q1 devOnly): SDevSeed.cs and SDevSeedPlan.cs are WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif` (one outer block, opened on the first code line, closed on the last, nothing else at its level) and the quote-chat code sits inside it — a store build compiles none of it — ' + JSON.stringify(r));
  }

  /* ── q2 hooks ── */
  {
    const seed1 = bodyN(S, /public static string seed\(string profile\)/), uns = bodyN(S, /public static string unseed\(\)/), st = bodyN(S, /public static string status\(\)/);
    const STATUS = 'if (present > 0 || images > 0 || fileChatsPresent() > 0 || quoteChatsPresent() > 0) return present + " of " + Count + " seeded contacts present, " + images + " of " + SDevSeedPlan.ImageChats + " image chats (Seed 51-53), " + fileChatsPresent() + " of " + SDevSeedPlan.FileChats + " file chats (Seed 54-56), " + quoteChatsPresent() + " of " + SDevSeedPlan.QuoteChats + " quote chat (Seed 57)."; if (present == 0 && images == 0) { return "Nothing seeded."; }';
    const r = {
      seed: seed1.endsWith('status += " " + seedImageChats(); status += " " + seedFileChats(); status += " " + seedQuoteChat(); Logging.info("[DEVSEED] " + status); return status;'),
      unseed: uns.startsWith('int removed = 0, missing = 0, refused = 0; for (int i = 0; i < SDevSeedPlan.QuoteChatFirst + SDevSeedPlan.QuoteChats; i++) { Friend? friend = FriendList.getFriend(addressFor(i));')
        && uns.includes('status += " " + unseedImageChats(); status += " " + unseedFileChats(); UIHelpers.shouldRefreshContacts = true;'),
      noGap: /public const int QuoteChatFirst = FileChatFirst \+ FileChats;/.test(P) && /public const int QuoteChats = 1;/.test(P) && /public const int FileChatFirst = ImageChatFirst \+ ImageChats;/.test(P),
      status: st.includes(STATUS) && count(st, /quoteChatsPresent\(\)/g) === 2,
      once: count(S, /\bseedQuoteChat\(\)/g) === 2 && count(S, /\bquoteChatsPresent\(\)/g) === 3 && !/unseedQuoteChat/.test(S),
      oneRemoval: count(S, /FriendList\.removeFriend\(/g) === 1 && !/removeFriend|forgetContact|SPeerLocalStores|SPhotoGroups/.test(glue),
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ walktools2 quote seed (q2 hooks): exactly THREE one-statement hooks — seed(profile): `status += " " + seedQuoteChat();` right after the file-chat line (after the clock stopped, both profiles); unseed(): its ONE removal loop (the only removeFriend site) now runs 0 … QuoteChatFirst + QuoteChats − 1 and the quote chat follows the file chats without a gap, so it removes Seed 57 and nothing else is added; status(): `if (… || quoteChatsPresent() > 0) return <the old sentence with ", n of 1 quote chat (Seed 57)" before its full stop>;`; the new functions are called from there only — ' + JSON.stringify(r));
  }

  /* ── q3 noNetNoDisk ── */
  {
    const NET = /https?:|\bHttpClient\b|\bWebRequest\b|\bWebClient\b|\bSocket\b|\bTcpClient\b|\bUdpClient\b|\bSystem\.Net\b|\bDns\.|\bLauncher\b|\bBrowser\.|\bNode\.|\bStreamProcessor\.|\bCoreStreamProcessor\.|\bsendChatMessage\b|\bgetPresence/g;
    const IO = /\bSystem\.IO\b|\b(?:File|Directory|Path)\.\w+|\bFileStream\b|\bFileInfo\b|\bStream\b|\bfilePath\b|\brequestWriteMessages\b|\bPreferences\b/g;
    const hits = [...(glue + '\n' + sec).matchAll(NET)].map((m) => m[0]).concat([...(glue + '\n' + sec).matchAll(IO)].map((m) => m[0]));
    ok(glueOk && hits.length === 0, '★ walktools2 quote seed (q3 noNetNoDisk): the quote-chat glue and the plan\'s § 4 hold no network token (no URL, HttpClient, WebRequest, WebClient, Socket, Dns, Launcher, Browser), no app send path (Node., StreamProcessor., CoreStreamProcessor., sendChatMessage, getPresence) and no file or store call of their own (File / Directory / Path / FileInfo / Stream / filePath / Preferences) — text rows through Core\'s FriendList.addMessageWithType only — ' + JSON.stringify({ glueOk, hits }));
  }

  /* ── q4 logsTypesOnly ── */
  {
    const logs = [...glue.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => norm(m[1]));
    const bad = logs.filter((a) => !/^"\[DEVSEED\] [^"]*"/.test(a) || !/^("[^"]*"|\bi\b|\bm\.j\b|\be\.GetType\(\)\.Name\b|\browsRefused\b|\browFirst\b|\s|\+)+$/.test(a));
    const all = [...S.matchAll(/Logging\.\w+\(([^;]*)\);/g)].length;
    ok(glueOk && logs.length === 2 && bad.length === 0 && all === 15, '★ walktools2 quote seed (q4 logsTypesOnly): the 2 new log lines (the skipped rows: the FIRST one only — index, j and exception TYPE — plus one count after the loop; the chat stopped) start with [DEVSEED] and carry fixed words, the seed index, j, a count and exception TYPE names only — never a text, an address, a name or an exception message; SDevSeed.cs holds 15 log calls (13 of the base + these 2) — ' + JSON.stringify({ n: logs.length, all, bad }));
  }

  /* ── q5 rows ── */
  {
    const s = norm(G.seed);
    const r = {
      loop: s.includes('for (int i = SDevSeedPlan.QuoteChatFirst; i < SDevSeedPlan.QuoteChatFirst + SDevSeedPlan.QuoteChats; i++) { Address address = addressFor(i); Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.Approved, address, null, SDevSeedPlan.quoteNick(i), null, null, 0, true);'),
      write: s.includes('foreach (SDevSeedPlan.QuoteMsg m in SDevSeedPlan.quotePlan(i)) { try { if (FriendList.addMessageWithType(SDevSeedPlan.quoteRowIdFor(i, m.j), FriendMessageType.standard, address, 0, m.text, m.local, null, m.ts, false, 0) != null) texts++; }'),
      oneWrite: count(G.seed, /FriendList\.addMessageWithType\(/g) === 1 && count(S, /SDevSeedPlan\.quoteRowIdFor\(/g) === 1 && !/\bmessageIdFor\(|\browIdFor\(/.test(G.seed),
      save: s.includes('friend.save(); } }') && !/saveMetaData|unreadMessageCount/.test(G.seed),
      present: norm(G.present) === 'private static int quoteChatsPresent() { int n = 0; for (int i = SDevSeedPlan.QuoteChatFirst; i < SDevSeedPlan.QuoteChatFirst + SDevSeedPlan.QuoteChats; i++) { if (FriendList.getFriend(addressFor(i)) != null) n++; } return n; }',
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ walktools2 quote seed (q5 rows): the quote chat takes addressFor(i) and the nick SDevSeedPlan.quoteNick(i) like every seed contact; each planned row is ONE Core FriendList.addMessageWithType of a standard row with the 16-byte id SDevSeedPlan.quoteRowIdFor(i, m.j) (#1882 — never the 32-byte messageIdFor), the plan\'s text, side and FIXED time; no unread count (every row is older than the contact); friend.save() after the chat; quoteChatsPresent counts the contact — ' + JSON.stringify(r));
  }

  /* ── q6 topUp ── */
  {
    const s = norm(G.seed);
    const r = {
      branch: s.includes('if (friend == null) { friend = FriendList.getFriend(address); if (friend == null) { refused++; continue; } present++; string qTopUp = SDevSeedPlan.quoteTopUpAction(presentIds(friend), i); if (qTopUp == SDevSeedPlan.TopUpSkip) { newest++; continue; } if (qTopUp != SDevSeedPlan.TopUpWrite) { partly++; continue; } } else { added++; } foreach'),
      status: s.includes('return "Quote chat (Seed 57): " + added + " added, " + present + " present (" + newest + " with the newest row, skipped" + (partly > 0 ? "; " + partly + " partial: Remove the seed, then Seed" : "") + "), " + texts + " texts written in " + clock.ElapsedMilliseconds + " ms" + (refused > 0 ? ", " + refused + " refused" : "") + ".";'),
      rule: bodyN(P, /public static string quoteTopUpAction\(IReadOnlyCollection<byte\[\]\?>\? presentIds, int i\)/) === 'List<QuoteMsg> l = quotePlan(i); if (presentIds == null || l.Count == 0) { return TopUpPartial; } if (presentIds.Count == 0) { return TopUpWrite; } byte[] qNewest = quoteRowIdFor(i, l[l.Count - 1].j); foreach (byte[]? id in presentIds) { if (id != null && id.Length == qNewest.Length && isOurs(id, qNewest)) { return TopUpSkip; } } return TopUpPartial;',
      once: count(S, /SDevSeedPlan\.quoteTopUpAction\(/g) === 1 && count(S, /SDevSeedPlan\.topUpAction\(/g) === 1,
    };
    ok(glueOk && Object.values(r).every(Boolean), '★ walktools2 quote seed (q6 topUp): a PRESENT quote chat is never topped up through Core\'s in-memory window (#1571, #46 r2 B2-5 of the file chats): SDevSeedPlan.quoteTopUpAction(presentIds(friend), i) — an EMPTY list → write; the plan\'s newest 16-byte id there → skip ("with the newest row, skipped"); anything else → partial, no row ("Remove the seed, then Seed") — ' + JSON.stringify(r));
  }

  /* ── q7 planShape ── */
  {
    const qp = bodyN(P, /public static List<QuoteMsg> quotePlan\(int i\)/);
    const noStr = (x) => x.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    const r = {
      excerpt: qp.includes('string? excerpt = ReplyQuote.excerptOf(IXICore.Streaming.FriendMessageType.standard, target.text, null, false); if (excerpt == null) { throw new InvalidOperationException("quote target"); }'),
      compose: qp.includes('reply.text = ReplyQuote.compose("", excerpt, ReplyBodies[r]);') && count(sec, /ReplyQuote\.compose\(/g) === 1 && !/LinePrefix|"> "/.test(sec),
      id: bodyN(P, /public static byte\[\] quoteRowIdFor\(int i, int j\)/) === 'byte[] qFull = messageIdFor(i, j); byte[] qId = new byte[RealMessageIdLength]; Array.Copy(qFull, 0, qId, 0, RealMessageIdLength); return qId;',
      times: /public const long QuoteAnchor = ImageAnchor - 6 \* 3600L;/.test(sec) && qp.includes('long qAt = QuoteAnchor; for (int x = l.Count - 1; x >= 0; x--) { l[x].ts = qAt; qAt -= GapSeconds; } return l;'),
      noClock: sec.length > 2000 && !/\bnow\b|Clock|DateTime|getTimestamp|Stopwatch|Random\b|Guid\./.test(noStr(sec)),
      nick: bodyN(P, /public static string quoteNick\(int i\)/).endsWith('return "Seed " + (i + 1).ToString("00", CultureInfo.InvariantCulture) + " " + QuoteNames[i - QuoteChatFirst];') && /private static readonly string\[\] QuoteNames = \{ "Mojca Vrabec" \};/.test(sec),
      count: /public const int QuoteMessages = 1000;/.test(sec) && qp.includes('for (int j = 0; j < QuoteMessages; j++)'),
    };
    ok(Object.values(r).every(Boolean), '★ walktools2 quote seed (q7 planShape): the plan builds each reply with the app\'s own code — ReplyQuote.excerptOf(standard, the target\'s text, null, false) then ReplyQuote.compose("", excerpt, body) (a 1:1 carries no name; no hand-made "> " line) — the row id = the first RealMessageIdLength bytes of messageIdFor(i, j), the times count back from QuoteAnchor = ImageAnchor − 6 h by GapSeconds with no clock, QuoteMessages = 1000, the nick "Seed 57 Mojca Vrabec" — ' + JSON.stringify(r));
  }

  /* ── q8 glueFrozen: the WHOLE normalised bodies of the two new glue methods as SHA-256. RE-BASE: after an intended edit, look at the diff
        of that body, copy got=<hash> from the message into WANT and name the change in the DECISIONS row. ── */
  {
    const sha = (x) => createHash('sha256').update(x, 'utf8').digest('hex');
    const NAMES = { seedQuoteChat: /private static string seedQuoteChat\(\)/, quoteChatsPresent: /private static int quoteChatsPresent\(\)/ };
    const WANT = {
      seedQuoteChat: '6e9b026226d0518a250c2259ea392844ac653c3c80bc952f15d200fc2d278f4d', quoteChatsPresent: '168bc931a3ebe14799e17c9a14929e7a4f6b9c6deba28a9833407dd3515be148',
    };
    const got = Object.fromEntries(Object.entries(NAMES).map(([k, re]) => [k, sha(bodyN(S, re))]));
    const r = Object.fromEntries(Object.keys(WANT).map((k) => [k, got[k] === WANT[k]]));
    const at = Object.fromEntries(Object.entries(NAMES).map(([k, re]) => { const m = re.exec(S); return [k, m ? SEED + ':' + lineOf(S, m.index) : 'absent']; }));
    ok(glueOk && Object.values(r).every(Boolean), '★ walktools2 quote seed (q8 glueFrozen): the WHOLE normalised bodies of seedQuoteChat and quoteChatsPresent equal their SHA-256 — a changed argument, an added statement or a new log text is red. Re-base: look at the diff of that body, then copy got=<hash> — ' + JSON.stringify({ ...r, at, got: Object.entries(got).filter(([k]) => !r[k]).map(([k, v]) => k + ' got=' + v) }));
  }
}
