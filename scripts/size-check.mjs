#!/usr/bin/env node
/* size-check — the R2, R5 and R6 checks of the size rule, and the size table of the head.
 *
 *   node scripts/size-check.mjs [--repo <dir>] --base <rev> --head <rev> [--summary <file>]
 *   node scripts/size-check.mjs [--repo <dir>] --ci [--summary <file>]      base = HEAD^1, head = HEAD
 *
 * Exit 0 = every check passes · 1 = one or more checks fail (one line `FAIL R2` / `FAIL R5` /
 * `FAIL R6` per failing check) · 2 = a usage, git or classifier error (fail closed: nothing that
 * cannot be read is a pass). Reads only git objects (no work-tree file), no network, no
 * environment value; --summary appends the same report as Markdown to the named file.
 *
 * WHAT THIS CHECK IS
 *   The diff is `git diff -U0 --no-renames --text --no-ext-diff --no-textconv base head`
 *   (size-lib gitDiffAdded); only the lines the head ADDS count, removed lines never do.
 *   App C# = Spixi/**\/*.cs without the vendored RocksDbSharp folder (the folder and the
 *   extension compared without letter case, so `SPIXI/x.CS` counts too); src = the .js .mjs
 *   .css .html under src/ that are not linguist-generated / -vendored at BOTH base and head
 *   (a pull request that marks a hand-written file generated is still checked in that pull
 *   request).
 *   R2  An added line of app C# or src whose COMMENT part (size-lib's per-line comment text;
 *       a code token never counts) matches one of HISTORY_MARKERS or a batch / session name
 *       of the head tree (batchNames) is one marker line; a line counts once. A marker line
 *       whose comment text is the same as that of a line the same diff removes (in any file
 *       of the diff) is MOVED, not new, and does not count: a file split or a code change
 *       next to an old comment does not score. The free text of a #region / #warning / #error /
 *       #pragma line is read as comment text. Fail when the count is above R2_MAX_MARKER_LINES.
 *   R5  An added CODE line of app C# whose store flag is true (not compiled out of a store
 *       build: size-lib's #if evaluator, DEBUG / SPIXI_DEV_COEXIST / SPIXI_CSH false) and
 *       whose code part writes a probe: a tag of PROBE_TAGS or PROBE_TAG_PATTERNS (also when
 *       the line's string literals joined spell it, "[" + "CDPERF]"), a probe class of
 *       PROBE_CALLS or PROBE_CALL_PATTERNS, or a timing log line (a log call with a stopwatch
 *       token on the same line). One such line fails. An unchanged probe line that the diff
 *       takes out of its fence (an #if / #endif moved or removed, a #define added) fails too.
 *       A probe line that the same diff removes outside the fence (any file) and adds again is
 *       moved, not new. An app C# path the head holds as a symlink or submodule, or whose text
 *       holds a NUL (UTF-16 or binary), cannot be read and fails R5.
 *   R6  Physical lines (size-lib's count: BOM dropped, CRLF = LF, a last line without "\n"
 *       counts) of every app C# file the diff adds or changes: over R6_LIMIT at the base →
 *       must not grow; at most R6_LIMIT at the base, or new → must not end above it. A new
 *       file whose text equals a file the diff deletes is that file renamed (its base count).
 *       A deleted file never fails.
 *   Text: comments and code are matched after foldText (NFKC, zero-width characters and soft
 *   hyphens removed, Cyrillic / Greek look-alike letters mapped to Latin), so a fullwidth ＃
 *   or ［CDPERF］ or a Cyrillic С in a tag is read as the ASCII one; R5 also reads C#'s \u, \U
 *   and \x escapes first (`P1\u0050erf` is P1Perf).
 *
 * ITS LIMITS (source-text checks: each a known edge, not a promise)
 *   - R2 reads words, not meaning: a history sentence without a marker word passes ("as the
 *     old code did"), and a what / why comment that uses a marker word in its ordinary
 *     sense counts (a payment "review" step, the "walk" of a list: the regexes leave out
 *     the common ones).
 *   - R2 batch names come from the head tree (scripts/pins-*, docs/handoff-*, docs/contract-*);
 *     a name that is not in one of them yet is caught only by the other markers.
 *   - R5 reads one line at a time: a tag or a stopwatch value split over several lines, a tag
 *     built in a variable on an earlier line, char arithmetic, string.Concat / Format pieces
 *     on separate lines, or a log helper with a new name passes. A probe written through a
 *     method that carries [Conditional("DEBUG")] is reported although the compiler drops it.
 *   - R5's string reader starts fresh on each line: inside a verbatim or raw string that
 *     spans lines it may read string text as code (more hits, never fewer for a tag).
 *   - The fence is the file's own #if text; a symbol defined for a store build by the project
 *     file (DefineConstants), not by the source, is not seen.
 *   - Look-alikes outside the mapped Cyrillic / Greek letters (other scripts, combining marks
 *     that NFKC keeps) are not folded.
 *   - Paths outside Spixi/ and src/ are not checked (a .cs file the project pulls in from
 *     another folder by a <Compile Include>, a symlinked folder).
 */
import { appendFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as lib from './size-lib.mjs';

// ─────────────────────────────── the constants ───────────────────────────────

/** R2 fails when a pull request adds more marker lines than this. */
export const R2_MAX_MARKER_LINES = 5;

/** R6: the physical line limit of one app C# file. */
export const R6_LIMIT = 1500;

/** R6: 'fail' turns a breach red; 'report' only prints it. */
export const R6_MODE = 'fail';

/* The history markers of a comment (inventory § 13.3 categories). Each `re` is tested on the
 * folded comment text of one line; any hit makes the line a marker line. */
export const HISTORY_MARKERS = Object.freeze([
  // decision and issue numbers: #46, #1750 (not C#10, &#123;, a colour of 5+ digits)
  { id: 'decision-number', re: /(?<![\w&#])#\d{2,4}(?![\w-])/ },
  { id: 'decisions-file', re: /\bDECISIONS\b/ },
  { id: 'decision-word', re: /\b(?:decisions?|rulings?)\s+#?\d{2,4}\b|\brulings?\b/i },
  { id: 'star', re: /[\u2605\u2606\u2729-\u2730\u2b50]/ },
  // round codes r1 … r19 (lower case; R1 is a rule name) and "round 3"
  { id: 'round-code', re: /(?<![\w.$-])r[1-9]\d?(?![\w(\[=.-])(?!\s*=)/ },
  { id: 'round-word', re: /\brounds?\s*[-#]?\s*\d+\b(?![.,]\d)|\b(?:device|review|audit|fix|reader)\s+rounds?\b/i },
  // a reader in the review sense (not a screen reader, a StreamReader, the reader of a value)
  {
    id: 'reader',
    re: /\b(?:fresh|security|fable|opus|#46|adversarial|break-my-verdict|second|third|final)\s+(?:#46\s+)?readers?\b(?!\s*(?:thread|lock|loop|task|side|writer|buffer|stream|queue|of)\b)|\b(?:the|a|every|each)\s+readers?\s+(?:found|said|saw|asked|flagged|noted|caught|marked|wanted|verdict|pass|round)\b|\breaders?'s\s+(?:verdict|finding|round|pass)\b/i,
  },
  { id: 'reader-code', re: /\breaders?\s+[A-Z][A-Z0-9]?(?![\w'])/ },
  {
    id: 'finding',
    re: /\bfindings\b|\b(?:the|a|this|that|each|every|one|no|review|audit|reader|walk|#46|major|minor|nit)\s+finding\b(?!\s+(?:the|a|an|its|their|out|it|them)\b)|\bfinding\s+[A-Z]{1,3}-?\d/i,
  },
  { id: 'review-grade', re: /\b(?:MAJOR|MINOR|NIT)(?:-\d+)?\b|\bNOTE-\d+\b/ },
  // finding and row codes: S-1, R2-14, B3-2, HV-5, P-28, W-4 (upper case only)
  { id: 'finding-code', re: /(?<![\w-])[A-Z]{1,2}\d{0,2}-\d{1,2}(?![\w-])/ },
  { id: 'packet', re: /\bP\d{2,3}\b/ },
  { id: 'lesson', re: /\bL\d{2,3}\b/ },
  {
    id: 'walk',
    re: /\bwalk(?:s|ed)?[- ](?:sheets?|rows?|steps?|legs?|debt|results?|block|day|page|run|verdict|ids?|[A-Z]-?\d)\b|(?<!\b(?:after|during|in|of)\s)\b(?:the|next|last|device|phone|home|windows|android|iphone|mac|first|second|on-device)\s+walk\b(?!\s+(?:the|over|through|up|down|of|each|all|every|back|in|into|from|to|its|their|straight)\b)|\bwalk-[a-z0-9-]+\.md\b/i,
  },
  { id: 'walk-upper', re: /\bWALK\b/ },
  // a date, not a date-time value (a seed's timestamp is data)
  { id: 'date', re: /\b20\d\d-[01]\d-[0-3]\d\b(?![T ]\d\d:\d\d)/ },
  // the session handoff doc (not the `ixian:handoff` verb or an OS hand-off)
  { id: 'handoff', re: /\bhandoff\s*(?:§|says|doc|notes?)|docs\/handoff-|\bhandoff-20\d\d|\b(?:in|per|see|from)\s+the\s+handoff\b|\bhandoffs\b/i },
  { id: 'contract', re: /\bcontract-[a-z0-9]+\b|\bcontract\s+(?:docs\/|§)/i },
  // the review of a change (not the payment review sheet or step of the wallet)
  { id: 'review', re: /(?<!\b(?:send|payment|native|the|armed|no|legal)\s|\+\s)\breview(?:er|ers|-brief)?\b(?!\s*(?:sheet|step|rows?|screen|surface|card|page|stays|button|modal|state|mode|title|panel|view|amount|then|is\s+gated|url|link|prompt|if))/i },
  { id: 'mechanisms-doc', re: /\bmechanisms?\s+(?:docs?\s+)?§|\bmechanism[- ]first\b|-mechanisms\.md\b/i },
  {
    id: 'session',
    re: /\bsession[- ](?:\d{1,2}[a-z]?|S\d{1,2}[a-z]?)\b(?!\s*(?:ms|s|seconds?|bytes?|calls?|peers?)\b)|\bSession\s+(?:[A-Z][a-z]+\s+){1,3}(?:batch|tools|fix|lean)\b/,
  },
  {
    id: 'batch-word',
    re: /\b(?:fix|speed|lock|docs|defaults|page|history|cold[- ]start|walk|photo|home)\s+batch(?:\s+\d+[a-z]?)?\b|\bbatch\s+\d+[a-z]?\b(?!\s*(?:rows?|messages?|items?|ms|s|bytes?|files?|of|entries)\b)/i,
  },
  { id: 'pull-request', re: /\bpull request\s+#?\d+|\bPR\s*#?\d+\b/ },
  { id: 'agent', re: /\bbuilder-[a-d]\b|\bsub-?agents?\b/i },
  { id: 'person', re: /\bDamir\b/ },
]);

/* Batch / session names that are ordinary words: never used as markers. */
export const BATCH_NAME_STOPLIST = Object.freeze(['safety', 'tooling', 'launch', 'office', 'orch']);

/* The diagnostic, timing and temporary log tags of app C#: the live ones and the retired ones
 * (so that none comes back unfenced). Subsystem tags such as [FLAGS] [CONFIRM] [RESTORE]
 * [DEFAULTS] [INFOPANE] [DEVSEED] [CRASH] [CHATS] [UNREAD] [WEBVIEW] are log lines, not probes. */
export const PROBE_TAGS = Object.freeze([
  'APNSDIAG', 'CALLSWAP', 'CDPERF', 'CRASHDIAG', 'DIVIDER', 'DT', 'EXCERPTDIAG', 'KBTRAY', 'L14', 'L8',
  'LANDTAB', 'LOCKDIAG', 'M5', 'M6', 'MEMDIAG', 'MO', 'NICK', 'NOTIFDIAG', 'P0', 'P1', 'PAINTDIAG',
  'PRESENCE', 'RCPT', 'RESTOREDIAG', 'SCANDIAG', 'SPEAKER', 'STARTDIAG', 'THEME', 'WALLETDIAG', 'WV2',
  'cam-perm',
]);

/* Tags a future probe will most likely carry: …DIAG, …PERF, …PROBE, …TIMING, and a letter with
 * a number ([P0] [P1] [L8] [M5]). */
export const PROBE_TAG_PATTERNS = Object.freeze([
  { id: 'tag-diag-perf', re: /\[[A-Za-z0-9_-]*(?:DIAG|PERF|PROBE|TIMING)\]/i },
  { id: 'tag-letter-number', re: /\[[A-Z]\d{1,3}\]/ },
]);

/* The whole-file probe classes and the probe classes nested in pages: any use of the name
 * (a member call, `using static`, an alias, a `new`) is a probe line outside the fence. */
export const PROBE_CALLS = Object.freeze([
  'P1Perf', 'SLockDiag', 'PushFetchProbe', 'CdperfFrameProbe', 'S11FlashProbe', 'FrameProbe',
]);

/* A probe class with a new name: a member access, a call or a `new` of a type whose name
 * ends in Diag, Probe or Perf. */
export const PROBE_CALL_PATTERNS = Object.freeze([
  { id: 'call-diag-probe-perf', re: /\b[A-Z]\w*(?:Diag|Probe|Perf)\s*(?:\.\s*[A-Za-z_]|\()/ },
  { id: 'new-diag-probe-perf', re: /\bnew\s+[\w.]*(?:Diag|Probe|Perf)\b/ },
  { id: 'using-diag-probe-perf', re: /\busing\s+(?:static\s+)?(?:\w+\s*=\s*)?[\w.]*(?:Diag|Probe|Perf)\s*;/ },
]);

/* A timing line: a log call and a stopwatch token, both in the code outside string literals. */
const LOG_CALL_RE = /\b(?:Logging\s*\.\s*(?:info|warn|error|verbose|debug|trace|log)|Console\s*\.\s*(?:Write|WriteLine)|Console\s*\.\s*Error\s*\.\s*Write\w*|Trace\s*\.\s*(?:Write|WriteLine|TraceInformation|TraceWarning|TraceError)|Log\s*\.\s*(?:Debug|Info|Warn|Error|Verbose|Wtf|WriteLine)|Debugger\s*\.\s*Log)\s*\(/;
const TIMING_TOKEN_RE = /\b(?:ElapsedMilliseconds|ElapsedTicks|Elapsed|Stopwatch|GetTimestamp|GetElapsedTime|TotalMilliseconds)\b/;

// ─────────────────────────────── text helpers ───────────────────────────────

const ZERO_WIDTH_RE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g;
const LOOKALIKE = new Map(Object.entries({
  // Cyrillic
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
  'У': 'Y', 'І': 'I', 'Ј': 'J', 'Ѕ': 'S', 'Ԁ': 'D', 'Ԍ': 'G', 'Ԛ': 'Q', 'Ԝ': 'W', 'Ү': 'Y',
  'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd',
  'ԛ': 'q', 'ԝ': 'w', 'һ': 'h', 'ӏ': 'l',
  // Greek
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P',
  'Τ': 'T', 'Υ': 'Y', 'Χ': 'X', 'ο': 'o', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'τ': 't', 'υ': 'u',
}));
const LOOKALIKE_RE = new RegExp(`[${[...LOOKALIKE.keys()].join('')}]`, 'g');

/** The text the markers and probe patterns are tested on: NFKC, no zero-width characters,
 * look-alike letters as Latin. */
export function foldText(s) {
  return String(s).normalize('NFKC').replace(ZERO_WIDTH_RE, '').replace(LOOKALIKE_RE, (c) => LOOKALIKE.get(c));
}

const squash = (s) => foldText(s).replace(/\s+/g, ' ').trim();

/** One line of tree text made safe to print: no control character, no "::" and no "##[" (so it
 * cannot become a workflow command), at most 200 characters. The caller adds a fixed prefix. */
export function sanitizeLine(s) {
  let t = String(s).replace(/\t/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '');
  const cps = [...t];
  if (cps.length > 200) t = cps.slice(0, 200).join('') + '…';
  return t.replace(/:(?=:)/g, ': ').replace(/#(?=#)/g, '# ');
}

/** sanitizeLine + Markdown escapes for a table cell. */
export function markdownCell(s) {
  return sanitizeLine(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|').replace(/`/g, '\\`').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

/* Splits one C# code line (comments already blanked) into its string-literal text and the
 * code outside string literals; interpolation holes stay code. Starts outside any string. */
export function splitCsStrings(line) {
  let code = '';
  const strs = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === '\'') {
      // a char literal: 'x', '\n', '\u0041'
      let j = i + 1;
      if (line[j] === '\\') j += 2; else j += 1;
      while (j < n && line[j] !== '\'' && j - i < 12) j++;
      code += ' ';
      i = j + 1;
      continue;
    }
    let p = i;
    let interp = false;
    let verbatim = false;
    while (line[p] === '$' || line[p] === '@') {
      if (line[p] === '$') interp = true; else verbatim = true;
      p++;
    }
    if (line[p] !== '"') {
      code += c;
      i++;
      continue;
    }
    // raw string literal: three or more quotes
    let q = 0;
    while (line[p + q] === '"') q++;
    if (q >= 3) {
      const fence = '"'.repeat(q);
      const end = line.indexOf(fence, p + q);
      const stop = end === -1 ? n : end;
      strs.push(line.slice(p + q, stop));
      code += ' ';
      i = end === -1 ? n : end + q;
      continue;
    }
    let j = p + 1;
    let s = '';
    let depth = 0;
    while (j < n) {
      const d = line[j];
      if (depth > 0) {
        if (d === '{') depth++;
        else if (d === '}') { depth--; if (depth === 0) { code += ' '; j++; continue; } }
        code += d;
        j++;
        continue;
      }
      if (interp && d === '{') {
        if (line[j + 1] === '{') { s += '{'; j += 2; continue; }
        depth = 1;
        code += ' ';
        j++;
        continue;
      }
      if (interp && d === '}' && line[j + 1] === '}') { s += '}'; j += 2; continue; }
      if (verbatim) {
        if (d === '"' && line[j + 1] === '"') { s += '"'; j += 2; continue; }
        if (d === '"') break;
      } else {
        if (d === '\\') { s += line.slice(j, j + 2); j += 2; continue; }
        if (d === '"') break;
      }
      s += d;
      j++;
    }
    strs.push(s);
    code += ' ';
    i = j + 1;
  }
  return { code, strings: strs };
}

/* C# reads \uXXXX and \UXXXXXXXX in identifiers and strings alike, so `P1\u0050erf` is P1Perf and
 * "\u005BCDPERF]" is "[CDPERF]"; \x escapes are read too (in a string they are characters). */
export function decodeCsEscapes(s) {
  return String(s)
    .replace(/\\U([0-9a-fA-F]{8})/g, (m, h) => { const c = parseInt(h, 16); return c <= 0x10ffff ? String.fromCodePoint(c) : m; })
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{1,4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}

const PROBE_TAG_EXACT_RE = new RegExp(
  `\\[(?:${PROBE_TAGS.map((t) => t.replace(/[-]/g, '\\-')).join('|')})\\]`, 'i');
const PROBE_CALL_NAME_RE = new RegExp(`\\b(?:${PROBE_CALLS.join('|')})\\b`);
// A tag in code: not an indexer such as arr[P1] or m[i][DT].
const NOT_INDEXER = (re) => new RegExp(`(?<![\\w\\])])${re.source}`, re.flags);
const TAG_IN_CODE = [
  { id: 'tag', re: NOT_INDEXER(PROBE_TAG_EXACT_RE) },
  ...PROBE_TAG_PATTERNS.map((p) => ({ id: p.id, re: NOT_INDEXER(p.re) })),
];
const TAG_IN_STRINGS = [{ id: 'tag', re: PROBE_TAG_EXACT_RE }, ...PROBE_TAG_PATTERNS];

/** The probe kinds one C# code line writes (its code part, comments blanked) → ids, [] = none. */
export function probeHits(codeText) {
  const text = foldText(decodeCsEscapes(codeText));
  const hits = new Set();
  for (const p of TAG_IN_CODE) if (p.re.test(text)) hits.add(p.id);
  const { code, strings } = splitCsStrings(text);
  const joined = strings.join('');
  if (hits.size === 0) for (const p of TAG_IN_STRINGS) if (p.re.test(joined)) hits.add(`${p.id}-joined`);
  if (PROBE_CALL_NAME_RE.test(code)) hits.add('call');
  for (const p of PROBE_CALL_PATTERNS) if (p.re.test(code)) hits.add(p.id);
  if (LOG_CALL_RE.test(code) && TIMING_TOKEN_RE.test(code)) hits.add('timing');
  return [...hits];
}

/** The history markers one comment text holds → ids, [] = none. `nameRe` = batchNameRe(…) or null. */
export function historyHits(commentText, nameRe) {
  if (!commentText) return [];
  const text = foldText(commentText);
  const hits = [];
  for (const m of HISTORY_MARKERS) if (m.re.test(text)) hits.push(m.id);
  if (nameRe && nameRe.test(text)) hits.push('batch-name');
  return hits;
}

/** The batch and session names of a tree: scripts/pins-<name>/, docs/handoff-<date>-<name>.md,
 * docs/contract-<name>.md, without BATCH_NAME_STOPLIST. */
export function batchNames(paths) {
  const names = new Set();
  for (const p of paths) {
    let m = /^scripts\/pins-([a-z0-9][a-z0-9-]*)\//i.exec(p);
    if (!m) m = /^docs\/handoff-\d{4}-\d{2}-\d{2}[a-z]?-([a-z0-9][a-z0-9-]*)\.md$/i.exec(p);
    if (!m) m = /^docs\/contract-([a-z0-9][a-z0-9-]*)\.md$/i.exec(p);
    if (!m) continue;
    const name = m[1].toLowerCase();
    for (const n of [name, name.split('-')[0]]) {
      if (n.length >= 2 && !BATCH_NAME_STOPLIST.includes(n)) names.add(n);
    }
  }
  return [...names].sort();
}

/** One RegExp of whole-word batch names (any letter case), or null for no names. */
export function batchNameRe(names) {
  if (!names.length) return null;
  const alt = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[-]/g, '\\-')).join('|');
  return new RegExp(`(?<![\\w-])(?:${alt})(?![\\w-])`, 'i');
}

// ─────────────────────────────── paths and git ───────────────────────────────

const APP_PATHSPEC = ':(glob,icase)spixi/**/*.cs';
const SRC_PATHSPECS = ['js', 'mjs', 'css', 'html'].map((x) => `:(glob,icase)src/**/*.${x}`);

/** App C# by size-lib, and the same path in another letter case (a case-blind file system
 * builds `SPIXI/x.CS` into the app). */
export function isAppCsPath(p) {
  if (lib.isAppCs(p)) return true;
  return /^spixi\//i.test(p) && /\.cs$/i.test(p) && !/^spixi\/platforms\/maccatalyst\/rocksdbsharp\//i.test(p);
}

function isSrcWebPath(p) {
  return /^src\//i.test(p) && /\.(?:js|mjs|css|html)$/i.test(p);
}

function extOf(p) {
  return p.slice(p.lastIndexOf('.')).toLowerCase();
}

/* The base line numbers each file loses → Map<base path, number[]>. size-lib's gitDiffAdded
 * gives only the count; the moved-line rule needs the lines. Same diff options. */
function gitDiffRemoved(repo, base, head, pathspecs) {
  const args = ['-C', repo, '-c', 'core.quotePath=false', 'diff', '-U0', '--no-renames', '--text', '--no-ext-diff',
    '--no-textconv', '--no-color', '--src-prefix=a/', '--dst-prefix=b/', '--end-of-options', base, head, '--', ...pathspecs];
  const r = spawnSync('git', args, { maxBuffer: 1024 * 1024 * 1024, encoding: 'buffer', env: { ...process.env, LC_ALL: 'C' } });
  if (r.error || r.status !== 0) {
    const msg = r.error ? r.error.message : String(r.stderr).trim().split('\n')[0];
    throw new lib.GitError(`git diff (removed lines): ${msg}`);
  }
  const map = new Map();
  let minus = null;
  let cur = null;
  let header = true;
  for (const line of r.stdout.toString('utf8').split('\n')) {
    if (line.startsWith('diff --git ')) { header = true; minus = null; cur = null; continue; }
    if (header && line.startsWith('--- ')) {
      let s = line.slice(4).replace(/\t$/, '');
      if (s === '/dev/null') minus = null;
      else {
        if (s.startsWith('"')) s = unquoteCPath(s);
        minus = s.startsWith('a/') ? s.slice(2) : s;
      }
      continue;
    }
    if (header && line.startsWith('+++ ')) {
      header = false;
      cur = minus === null ? null : (map.get(minus) || []);
      if (cur) map.set(minus, cur);
      continue;
    }
    const h = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/.exec(line);
    if (h && cur) {
      const a = Number(h[1]);
      const b = h[2] === undefined ? 1 : Number(h[2]);
      for (let k = 0; k < b; k++) cur.push(a + k);
    }
  }
  return map;
}

/* A path git printed in C quotes ("a\tb\303\251") → the path; octal escapes are UTF-8 bytes. */
function unquoteCPath(q) {
  const bytes = [];
  const map = { n: 10, t: 9, r: 13, a: 7, b: 8, f: 12, v: 11, '\\': 92, '"': 34 };
  for (let i = 1; i < q.length - 1; i++) {
    const c = q[i];
    if (c !== '\\') { for (const b of Buffer.from(c, 'utf8')) bytes.push(b); continue; }
    const d = q[++i];
    if (/[0-7]/.test(d)) { bytes.push(parseInt(q.slice(i, i + 3), 8)); i += 2; continue; }
    bytes.push(map[d] !== undefined ? map[d] : d.charCodeAt(0));
  }
  return Buffer.from(bytes).toString('utf8');
}

function treePaths(repo, rev) {
  const paths = [];
  lib.gitFiles(repo, rev, (p) => { paths.push(p); return false; });
  return paths;
}

function analyze(path, text) {
  return isAppCsPath(path) ? lib.classifyCs(text) : lib.classifyWeb(text, extOf(path));
}

/* The free text of a #region / #endregion / #warning / #error / #pragma line: not a comment token,
 * but read by a person as one, so R2 reads it. */
const DIRECTIVE_TEXT_RE = /^\s*#\s*(?:region|endregion|warning|error|pragma)\b(.*)$/;
function commentOf(r, ln, app) {
  const c = r.comments[ln - 1] || '';
  if (!app || !r.directives) return c;
  if (!r.directiveSet) r.directiveSet = new Set(r.directives);
  if (!r.directiveSet.has(ln)) return c;
  const m = DIRECTIVE_TEXT_RE.exec(r.codeText[ln - 1]);
  return m ? `${m[1]} ${c}` : c;
}

function linesOf(text) {
  return lib.physicalLines(text);
}

// ─────────────────────────────── the checks ───────────────────────────────

/** Runs R2, R5 and R6 on the diff base..head → the result object (see the module header). */
export function runChecks({ repo = '.', base, head }) {
  const baseId = lib.gitResolve(repo, base);
  const headId = lib.gitResolve(repo, head);
  const pathspecs = [APP_PATHSPEC, ...SRC_PATHSPECS];
  const diff = lib.gitDiffAdded(repo, baseId, headId, pathspecs);
  const removedLines = gitDiffRemoved(repo, baseId, headId, pathspecs);

  const touched = [...diff.keys()];
  const srcWeb = touched.filter(isSrcWebPath);
  const genHead = lib.gitGenerated(repo, headId, srcWeb);
  const genBase = lib.gitGenerated(repo, baseId, srcWeb);
  const inScope = (p) => isAppCsPath(p) || (isSrcWebPath(p) && !(genHead.has(p) && genBase.has(p)));

  const headPaths = touched.filter((p) => diff.get(p).status !== 'D' && inScope(p));
  const basePaths = touched.filter((p) => diff.get(p).status !== 'A' && inScope(p));
  const headText = new Map(lib.gitFiles(repo, headId, headPaths).map((f) => [f.path, f.text]));
  const baseText = new Map(lib.gitFiles(repo, baseId, basePaths).map((f) => [f.path, f.text]));

  const names = batchNames(treePaths(repo, headId));
  const nameRe = batchNameRe(names);

  // What the diff removes: comment texts with a marker, and probe code lines outside the fence.
  const removedComments = new Map();
  const removedProbes = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  const baseAnalysis = new Map();
  for (const p of basePaths) {
    const lines = removedLines.get(p);
    const text = baseText.get(p);
    if (text === undefined || text.includes('\u0000')) continue;
    if (!(lines && lines.length) && !isAppCsPath(p)) continue;
    const r = analyze(p, text);
    baseAnalysis.set(p, r);
    if (!lines) continue;
    for (const ln of lines) {
      const i = ln - 1;
      if (i < 0 || i >= r.kinds.length) continue;
      const c = commentOf(r, ln, isAppCsPath(p)).trim();
      if (c && historyHits(c, nameRe).length) bump(removedComments, squash(c));
      if (isAppCsPath(p) && r.kinds[i] === 'code' && r.store[i] && probeHits(r.codeText[i]).length) {
        bump(removedProbes, squash(r.codeText[i]));
      }
    }
  }
  const takeMoved = (m, k) => {
    const n = m.get(k) || 0;
    if (n <= 0) return false;
    m.set(k, n - 1);
    return true;
  };

  const r2 = { count: 0, max: R2_MAX_MARKER_LINES, pass: true, lines: [], moved: 0, app: 0, src: 0, names };
  const r5 = { pass: true, lines: [], moved: 0 };
  const r6 = { pass: true, mode: R6_MODE, files: [], limit: R6_LIMIT };

  // Deleted texts, for a rename found by equal content.
  const deletedByText = new Map();
  for (const p of touched) {
    if (diff.get(p).status === 'D' && isAppCsPath(p) && baseText.has(p)) {
      const t = lib.normalizeText(baseText.get(p));
      if (!deletedByText.has(t)) deletedByText.set(t, p);
    }
  }

  for (const p of [...headPaths].sort()) {
    const entry = diff.get(p);
    const app = isAppCsPath(p);
    const text = headText.get(p);
    if (text === undefined || text.includes('\u0000')) {
      if (app) {
        r5.lines.push({ path: p, line: 0, text: text === undefined ? '(not a readable file: a symlink or a submodule)' : '(holds NUL bytes: UTF-16 or binary, cannot be read)', hits: ['unreadable'] });
      }
      continue;
    }
    const r = analyze(p, text);
    // An unchanged probe line that the diff takes out of its fence (an #if / #endif moved or
    // removed, a #define added) ships as surely as a new one.
    const rb = app && entry.status === 'M' ? baseAnalysis.get(p) : null;
    if (rb) {
      const addedSet = new Set(entry.added);
      const removedSet = new Set(removedLines.get(p) || []);
      let j = 1;
      for (let ln = 1; ln <= r.kinds.length; ln++) {
        while (removedSet.has(j)) j++;
        if (addedSet.has(ln)) continue;
        const i = ln - 1;
        if (r.kinds[i] === 'code' && r.store[i] && j - 1 < rb.store.length && !rb.store[j - 1]) {
          const hits = probeHits(r.codeText[i]);
          if (hits.length) r5.lines.push({ path: p, line: ln, text: r.codeText[i].trim(), hits: ['unfenced', ...hits] });
        }
        j++;
      }
    }
    for (const ln of entry.added) {
      const i = ln - 1;
      if (i < 0 || i >= r.kinds.length) continue;
      const comment = commentOf(r, ln, app).trim();
      if (comment) {
        const hits = historyHits(comment, nameRe);
        if (hits.length) {
          if (takeMoved(removedComments, squash(comment))) r2.moved++;
          else {
            r2.lines.push({ path: p, line: ln, text: comment.trim(), hits });
            if (app) r2.app++; else r2.src++;
          }
        }
      }
      if (app && r.kinds[i] === 'code' && r.store[i]) {
        const hits = probeHits(r.codeText[i]);
        if (hits.length) {
          if (takeMoved(removedProbes, squash(r.codeText[i]))) r5.moved++;
          else r5.lines.push({ path: p, line: ln, text: r.codeText[i].trim(), hits });
        }
      }
    }
    if (app) {
      const headLines = linesOf(text);
      let baseLines = 0;
      let renamedFrom = null;
      if (entry.status === 'M' && baseText.has(p)) baseLines = linesOf(baseText.get(p));
      else if (entry.status === 'A') {
        renamedFrom = deletedByText.get(lib.normalizeText(text)) || null;
        if (renamedFrom) baseLines = linesOf(baseText.get(renamedFrom));
      }
      const breach = baseLines > R6_LIMIT ? headLines > baseLines : headLines > R6_LIMIT;
      if (breach) r6.files.push({ path: p, base: baseLines, head: headLines, status: entry.status, renamedFrom });
    }
  }
  r5.lines.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  r2.count = r2.lines.length;
  r2.pass = r2.count <= R2_MAX_MARKER_LINES;
  r5.pass = r5.lines.length === 0;
  r6.pass = R6_MODE === 'report' ? true : r6.files.length === 0;
  return { base: baseId, head: headId, r2, r5, r6, pass: r2.pass && r5.pass && r6.pass };
}

// ─────────────────────────────── the report ───────────────────────────────

const P = '  | ';

function sizeRows(t, d) {
  const sgn = (n) => (n > 0 ? `+${n}` : `${n}`);
  return [
    ['app C# files', t.app.files, sgn(d.app.files)],
    ['app C# code lines', t.app.code, sgn(d.app.code)],
    ['app C# comment lines', t.app.comment, sgn(d.app.comment)],
    ['app C# blank lines', t.app.blank, sgn(d.app.blank)],
    ['app C# code lines in a store build', t.app.store, sgn(d.app.store)],
    ['switches', t.app.switches, sgn(d.app.switches)],
    [`files over ${R6_LIMIT} lines`, t.app.over1500.length, sgn(d.app.over1500Count)],
    ['src files', t.src.files, sgn(d.src.files)],
    ['src code lines', t.src.code, sgn(d.src.code)],
    ['src comment lines', t.src.comment, sgn(d.src.comment)],
    ['src blank lines', t.src.blank, sgn(d.src.blank)],
  ];
}

function textReport(res, sizes) {
  const out = [];
  out.push(`size-check: base ${res.base.slice(0, 12)} head ${res.head.slice(0, 12)}`);
  if (sizes) {
    out.push('SIZE (head, delta against the base)');
    for (const [k, v, dv] of sizeRows(sizes.head, sizes.delta)) out.push(`  ${k.padEnd(36)} ${String(v).padStart(8)}  ${dv}`);
  }
  const { r2, r5, r6 } = res;
  out.push(`R2 history markers in added comment lines: ${r2.count} (app C# ${r2.app}, src ${r2.src}; ${r2.moved} moved, not counted), max ${r2.max}: ${r2.pass ? 'pass' : 'FAIL'}`);
  for (const l of r2.lines) out.push(`${P}${sanitizeLine(`${l.path}:${l.line} [${l.hits.join(',')}] ${l.text}`)}`);
  out.push(`R5 new probe lines outside the dev fence: ${r5.lines.length} (${r5.moved} moved, not counted): ${r5.pass ? 'pass' : 'FAIL'}`);
  for (const l of r5.lines) out.push(`${P}${sanitizeLine(`${l.path}:${l.line} [${l.hits.join(',')}] ${l.text}`)}`);
  out.push(`R6 app C# files over ${R6_LIMIT} lines that grew, or new past it: ${r6.files.length} (mode ${r6.mode}): ${r6.files.length === 0 ? 'pass' : r6.mode === 'fail' ? 'FAIL' : 'report only'}`);
  for (const f of r6.files) out.push(`${P}${sanitizeLine(`${f.path}: ${f.base} -> ${f.head} lines${f.renamedFrom ? ` (renamed from ${f.renamedFrom})` : ''}`)}`);
  if (!r2.pass) out.push(`FAIL R2 ${r2.count} added comment lines hold a history marker (max ${r2.max}): a comment says what or why, never history`);
  if (!r5.pass) out.push(`FAIL R5 ${r5.lines.length} new probe line(s) outside #if SPIXI_DEV_COEXIST / DEBUG / SPIXI_CSH`);
  if (!r6.pass) out.push(`FAIL R6 ${r6.files.length} app C# file(s) grew while over ${R6_LIMIT} lines or crossed it`);
  out.push(`size-check: ${res.pass ? 'PASS' : 'FAIL'}`);
  return out.join('\n') + '\n';
}

const SUMMARY_ROWS = 200;

function markdownReport(res, sizes) {
  const out = [];
  const st = (ok) => (ok ? 'pass' : '**FAIL**');
  out.push(`## Size (R2 · R5 · R6) — ${res.pass ? 'pass' : '**FAIL**'}`, '');
  out.push(`Base \`${res.base.slice(0, 12)}\` · head \`${res.head.slice(0, 12)}\``, '');
  if (sizes) {
    out.push('| Size of the head | Lines | Delta |', '|---|---:|---:|');
    for (const [k, v, dv] of sizeRows(sizes.head, sizes.delta)) out.push(`| ${k} | ${v} | ${dv} |`);
    out.push('');
  }
  const { r2, r5, r6 } = res;
  out.push('| Check | Result | Count |', '|---|---|---:|');
  out.push(`| R2 history markers in added comments (max ${r2.max}) | ${st(r2.pass)} | ${r2.count} |`);
  out.push(`| R5 new probe lines outside the dev fence | ${st(r5.pass)} | ${r5.lines.length} |`);
  out.push(`| R6 files over ${R6_LIMIT} lines (mode ${r6.mode}) | ${r6.files.length === 0 ? 'pass' : r6.mode === 'fail' ? '**FAIL**' : 'report only'} | ${r6.files.length} |`);
  out.push('');
  const table = (title, head, rows) => {
    if (!rows.length) return;
    out.push(`### ${title}`, '', head, head.replace(/[^|]+/g, '---'));
    for (const r of rows.slice(0, SUMMARY_ROWS)) out.push(r);
    if (rows.length > SUMMARY_ROWS) out.push(`| … ${rows.length - SUMMARY_ROWS} more in the job log | | |`);
    out.push('');
  };
  table('R2 marker lines', '| Line | Markers | Comment |',
    r2.lines.map((l) => `| ${markdownCell(`${l.path}:${l.line}`)} | ${markdownCell(l.hits.join(', '))} | ${markdownCell(l.text)} |`));
  table('R5 probe lines', '| Line | Kind | Code |',
    r5.lines.map((l) => `| ${markdownCell(`${l.path}:${l.line}`)} | ${markdownCell(l.hits.join(', '))} | ${markdownCell(l.text)} |`));
  table('R6 files', '| File | Base | Head |',
    r6.files.map((f) => `| ${markdownCell(f.path)} | ${f.base} | ${f.head} |`));
  return out.join('\n') + '\n';
}

// ─────────────────────────────── the command ───────────────────────────────

const USAGE = 'usage: node scripts/size-check.mjs [--repo <dir>] (--base <rev> --head <rev> | --ci) [--summary <file>]';

class UsageError extends Error {}

function parseArgs(argv) {
  const o = { repo: '.', base: null, head: null, ci: false, summary: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v === '' || v.startsWith('--')) throw new UsageError(`${a} needs a value`);
      return v;
    };
    if (a === '--repo') o.repo = val();
    else if (a === '--base') o.base = val();
    else if (a === '--head') o.head = val();
    else if (a === '--summary') o.summary = val();
    else if (a === '--ci') o.ci = true;
    else throw new UsageError(`unknown argument: ${sanitizeLine(a)}`);
  }
  if (o.ci && (o.base || o.head)) throw new UsageError('--ci takes no --base / --head');
  if (!o.ci && (!o.base || !o.head)) throw new UsageError('give --base and --head, or --ci');
  return o;
}

/** The command line; returns the exit code. */
export function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`size-check: ${e.message}\n${USAGE}\n`);
    return 2;
  }
  try {
    let base = o.base;
    let head = o.head;
    if (o.ci) {
      head = lib.gitResolve(o.repo, 'HEAD');
      try {
        base = lib.gitResolve(o.repo, 'HEAD^1');
      } catch {
        throw new lib.GitError('--ci: HEAD has no first parent (fetch depth 2 is needed)');
      }
    }
    const res = runChecks({ repo: o.repo, base, head });
    const baseSize = lib.countTree(o.repo, res.base);
    const headSize = lib.countTree(o.repo, res.head);
    const sizes = { head: headSize, delta: lib.countDelta(baseSize, headSize) };
    process.stdout.write(textReport(res, sizes));
    if (o.summary) appendFileSync(o.summary, markdownReport(res, sizes));
    return res.pass ? 0 : 1;
  } catch (e) {
    process.stderr.write(`size-check: ERROR ${sanitizeLine(e && e.message ? e.message : String(e))}\n`);
    return 2;
  }
}

function invokedDirectly() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) process.exitCode = main(process.argv.slice(2));
