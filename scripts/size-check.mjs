#!/usr/bin/env node
/* size-check — the R2, R5 and R6 checks of the size rule, and the size table of the head.
 *
 *   node scripts/size-check.mjs [--repo <dir>] --base <rev> --head <rev> [--summary <file>]
 *   node scripts/size-check.mjs [--repo <dir>] --ci [--summary <file>]      base = HEAD^1, head = HEAD
 *
 * Exit 0 = every check passes · 1 = one or more checks fail (one line `FAIL R2` / `FAIL R5` /
 * `FAIL R6` per failing check) · 2 = a usage, git or classifier error, or a path of the diff
 * that is not UTF-8 (fail closed: nothing that cannot be read is a pass). Reads only git
 * objects (no work-tree file) and no network; the script itself reads no environment value
 * (git, which it runs, sees the process environment). --summary appends the same report as
 * Markdown to the named file. The report says which diff was checked: with --ci on a pull
 * request it is what the pull request brings, on a push or a manual run the last commit only.
 *
 * WHAT THIS CHECK IS
 *   The diff is `git diff -U0 --no-renames --text --no-ext-diff --no-textconv base head`
 *   (size-lib gitDiffAdded); only the lines the head ADDS count, removed lines never do.
 *   App C# = Spixi/**\/*.cs (the folder and the extension compared without letter case, so
 *   `SPIXI/x.CS` counts too); R2 and R5 also read the vendored RocksDbSharp folder (the Mac
 *   build compiles it), R6 leaves it out. src = the .js .mjs .css .html under src/; a file that
 *   is linguist-generated / -vendored at BOTH base and head is skipped unless the diff adds it
 *   (a new file is always read, and a file marked generated in the same diff is read too).
 *   A file of the diff that cannot be read (NUL bytes, UTF-16, a symlink, a submodule, or a C#
 *   text whose directive lines the classifier cannot trust: size-lib's `suspect` list) fails:
 *   R5 for app C#, R2 for src.
 *   R2  An added line of app C# or src whose COMMENT part (size-lib's per-line comment text, and
 *       the free text of a #region / #warning / #error / #pragma line; a code token never
 *       counts) matches HISTORY_MARKERS or a batch / session name of the base or head tree
 *       (batchNames) holds marker tokens (markerTokens: each regex hit's text). Token credit:
 *       every removed comment line of the whole diff gives its tokens as credit, and an added
 *       line counts only when at least one of its tokens is left after the credit is spent; so
 *       history may move between files or be reworded inside a pull request, and only marker
 *       tokens the pull request did not remove count (diff-wide on purpose: a file split
 *       passes). A line whose only marker is one decision number does not count (the rule
 *       allows one per member; one per line is the approximation). A line counts once. Fail
 *       when the count is above R2_MAX_MARKER_LINES, or when a src file cannot be read.
 *   R5  An added CODE line of app C# whose store flag is true (not compiled out of a store
 *       build: size-lib's #if evaluator, DEBUG / SPIXI_DEV_COEXIST / SPIXI_CSH false) and
 *       whose code part writes a probe:
 *         a bracket tag of PROBE_TAGS (also with a suffix: [CDPERF2], [P1b]) or of
 *         PROBE_TAG_PATTERNS (DIAG, PERF, PROBE or TIMING anywhere in the tag; a letter with a
 *         number), also when the line's string literals joined spell it ("[" + "CDPERF]"), or
 *         a PROBE_TAGS name of four or more
 *         characters as a whole word anywhere in the code part ($"[{"CDPERF"}]", nameof);
 *         a probe class of PROBE_CALLS or PROBE_CALL_PATTERNS. The P1Perf calls count although
 *         their bodies are empty in a store build: the inventory names the [P1] calls among
 *         the probe lines that ship (§ 7a step 4, § 6c);
 *         a timing log line: a log call with a stopwatch token (Stopwatch, ElapsedMilliseconds,
 *         ElapsedTicks, GetTimestamp, GetElapsedTime, .Elapsed.Total… / .Elapsed.Ticks), or
 *         with a clock read or a duration and a subtraction, on the same line. An edit of an upstream timing log line
 *         fails too (rare: fence it, or say so in the pull request).
 *       One such line fails. An unchanged probe line that the diff takes out of its fence (an
 *       #if / #endif moved or removed, a #define added) or out of a block comment fails too.
 *       A probe line that the same diff removes outside the fence (any file) and adds again
 *       with the same text (white space aside: a pure re-indent) is moved, not new; an edit of
 *       an existing unfenced probe line counts as new, so fence it in the same change.
 *       The probe list was derived from the tree with
 *         git grep -h -o -E '"\[[A-Za-z0-9_\-]{1,30}\]' <rev> -- 'Spixi/*.cs' | sort | uniq -c
 *       and the tags the history added and removed (git log -p over Spixi/*.cs).
 *   R6  Physical lines (size-lib's count: BOM dropped, CRLF = LF, a last line without "\n"
 *       counts) of every app C# file the diff adds or changes: over R6_LIMIT at the base →
 *       must not grow; at most R6_LIMIT at the base, or new → must not end above it. A new
 *       file that git's rename detection (`git diff -M`) pairs with a deleted one keeps that
 *       file's base count, so a moved and edited file is judged as the old one. A deleted
 *       file never fails.
 *   Text: comments and code are matched after foldText (NFKC, zero-width characters and soft
 *   hyphens removed, Cyrillic / Greek look-alike letters mapped to Latin), so a fullwidth ＃
 *   or ［CDPERF］ or a Cyrillic С in a tag is read as the ASCII one; R5 also reads C#'s \u, \U
 *   and \x escapes first (`P1Perf` is P1Perf).
 *   Notes, not failures: the report names a diff that changes a .gitattributes file, and one
 *   that changes the checks or their inputs (scripts/size-*.mjs, the size pins, the workflow,
 *   package.json / package-lock.json / .npmrc / node_modules, a .csproj, Directory.Build.props /
 *   .targets, global.json): those parts need a reading by hand. On a pull request the check runs
 *   the pull request's own copy of these scripts and of the workflow.
 *
 * ITS LIMITS (source-text checks: each a known edge, not a promise)
 *   - R2 reads words, not meaning: a history sentence without a marker word passes ("as the
 *     old code did"), and a what / why comment that uses a marker word in its ordinary
 *     sense counts (a payment "review" step, the "walk" of a list: the regexes leave out
 *     the common ones). The one-decision-number allowance is per line, not per member.
 *   - R2 token credit is diff-wide: a pull request that removes a history comment in one file
 *     may add the same tokens in another.
 *   - R2 batch names come from the base and head trees (scripts/pins-*, docs/handoff-*,
 *     docs/contract-*); a name that is in neither is caught only by the other markers. A batch
 *     name that is an ordinary word makes every use of that word count unless it is in
 *     BATCH_NAME_STOPLIST (the same for a name that is an identifier of the code: quoteBox); the
 *     first part of a dashed name is a name only when it holds a digit.
 *   - R2 reads comments: prose that is not a comment inside a section that is never compiled
 *     (`#if false`) is not read.
 *   - R5 reads one line at a time: a tag or a time value split over several lines, a tag built
 *     in a variable on an earlier line, a short tag (P1, DT) put together from pieces, char
 *     arithmetic, or a log helper with a new name passes. A probe written through a method
 *     that carries [Conditional("DEBUG")] is reported although the compiler drops it.
 *   - R5's string reader starts fresh on each line: inside a verbatim or raw string that
 *     spans lines it may read string text as code (more hits, never fewer for a tag).
 *   - The fence is the file's own #if text; a symbol defined for a store build by the project
 *     file (DefineConstants), not by the source, is not seen.
 *   - Look-alikes outside the mapped Cyrillic / Greek letters (other scripts, combining marks
 *     that NFKC keeps) are not folded.
 *   - On a pull request the check runs the pull request's own copy of these scripts and of the
 *     workflow: a diff that changes them is only as safe as the human reading of that diff (the
 *     NOTE line says when one does).
 *   - R5 counts an edited unfenced probe line as new (fence it in the same change).
 *   - Paths outside Spixi/ and src/ are not checked (a .cs file the project pulls in from
 *     another folder by a <Compile Include>, a symlinked folder).
 *   - A GUARD AGAINST MISTAKES, NOT AGAINST INTENT: a deliberate hiding of code is caught by the
 *     review of the diff, not by this check. C# is read by tree-sitter, which is not the
 *     compiler; where the two read a line differently, a probe written on purpose can pass R5.
 *     The known set is NOT complete. The three MAJOR shapes of review round 3 are open (the
 *     compiler ships each with 0 errors):
 *       `#region x // see /*` — tree-sitter ends the region text before the `/*` and reads a
 *         block comment from there, so the code lines after it, up to the next `*\/`, are
 *         comment to R5;
 *       `$"{x:/*}"` — a format clause that starts with `/*` in an interpolated string is read as
 *         a comment that runs to the next `*\/`, so the lines in between are comment to R5;
 *       a Unicode format character (U+0600–0605, U+06DD, U+070F, U+0890–0891, U+08E2,
 *         U+FFF9–FFFB) inside `P1Perf` or another probe name — the compiler drops it, the probe
 *         patterns do not match the name.
 *     More shapes of the first kind are listed in docs/review-brief-sizerule.md § 5 (S3-1):
 *     `#pragma warning disable 168, @"`, a raw-string opener after U+00A0 / U+3000, and the
 *     C# 14 `a?.b = "/*";`. A check that reads C# as the compiler does (Roslyn) is a later
 *     batch.
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

const HISTORY_MARKERS_G = HISTORY_MARKERS.map((m) => ({ id: m.id, re: new RegExp(m.re.source, `${m.re.flags}g`) }));

/* Batch / session names that are ordinary words, or identifiers of the code (`quoteBox`,
 * `imgUrl`): never used as markers. */
export const BATCH_NAME_STOPLIST = Object.freeze(['safety', 'tooling', 'launch', 'office', 'orch', 'smooth', 'quotebox', 'imgurl']);

/* The diagnostic, timing and temporary log tags of app C#: the live ones and the retired ones
 * (so that none comes back unfenced). Subsystem tags such as [FLAGS] [CONFIRM] [RESTORE]
 * [DEFAULTS] [INFOPANE] [DEVSEED] [CRASH] [CHATS] [UNREAD] [WEBVIEW] are log lines, not probes. */
export const PROBE_TAGS = Object.freeze([
  'APNSDIAG', 'CALLSWAP', 'CDPERF', 'CRASHDIAG', 'DIVIDER', 'DT', 'EXCERPTDIAG', 'KBTRAY', 'L14', 'L8',
  'LANDTAB', 'LOCKDIAG', 'M5', 'M6', 'MEMDIAG', 'MO', 'NICK', 'NOTIFDIAG', 'P0', 'P1', 'PAINTDIAG',
  'PRESENCE', 'RCPT', 'RESTOREDIAG', 'SCANDIAG', 'SPEAKER', 'STARTDIAG', 'THEME', 'WALLETDIAG', 'WV2',
  'cam-perm',
]);

/* Tags a future probe will most likely carry: DIAG, PERF, PROBE or TIMING anywhere in the tag
 * ([NavPerf], [PERF-nav]), and a letter with a number ([P0] [P1] [L8] [M5]) with at most a
 * lower-case letter or a `-` / `_` part after it ([P1b], [L8-x]). */
export const PROBE_TAG_PATTERNS = Object.freeze([
  { id: 'tag-diag-perf', re: /\[[A-Za-z0-9_-]*(?:DIAG|PERF|PROBE|TIMING)[A-Za-z0-9_-]*\]/i },
  { id: 'tag-letter-number', re: /\[[A-Z]\d{1,3}(?:[a-z]|[-_][A-Za-z0-9]+)?\]/ },
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

/* A timing line: a log call and a time measure in the code outside string literals. A stopwatch
 * token is enough; a clock read counts only with a subtraction on the line; a duration
 * property only with a subtraction (a Stopwatch on the line is the strong case). */
const LOG_CALL_RE = /\b(?:Logging\s*\.\s*(?:info|warn|error|verbose|debug|trace|log)|Console\s*\.\s*(?:Write|WriteLine)|Console\s*\.\s*Error\s*\.\s*Write\w*|Trace\s*\.\s*(?:Write|WriteLine|TraceInformation|TraceWarning|TraceError)|Log\s*\.\s*(?:Debug|Info|Warn|Error|Verbose|Wtf|WriteLine)|Debugger\s*\.\s*Log)\s*\(/;
const TIMING_STRONG_RE = /\b(?:Stopwatch|ElapsedMilliseconds|ElapsedTicks|GetTimestamp|GetElapsedTime)\b|\bElapsed\s*\.\s*(?:Total\w+|Ticks)\b/;
const TIMING_CLOCK_RE = /\b(?:TickCount64|TickCount|getTimestampMillis|[Ee]lapsedRealtime|UtcNow)\b|\bDateTime\s*\.\s*Now\b/;
const TIMING_WEAK_RE = /\b(?:TotalMilliseconds|Elapsed)\b/;

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

/** One line of tree text made safe to print: no control or bidi character, no "::" and no "##["
 * (so it cannot become a workflow command), at most 200 characters. The caller adds a fixed
 * prefix. */
export function sanitizeLine(s) {
  let t = String(s).replace(/\t/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\u200e\u200f\u061c]/g, '');
  const cps = [...t];
  if (cps.length > 200) t = cps.slice(0, 200).join('') + '…';
  return t.replace(/:(?=:)/g, ': ').replace(/#(?=#)/g, '# ');
}

/** sanitizeLine + Markdown escapes for a table cell. */
export function markdownCell(s) {
  return sanitizeLine(s).replace(/\\/g, '\\\\').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

/* A listed tag, also with a suffix ([CDPERF2], [P1b]). A listed name that ends in a letter (MO,
 * DT) takes a suffix only after a digit, `-` or `_`, so [MODE] and [DTO] stay ordinary words. */
const tagAlt = (t) => {
  const e = t.replace(/[-]/g, '\\-');
  return /[A-Za-z]$/.test(t) && t.length <= 2 ? `${e}(?:[0-9_-][A-Za-z0-9_-]*)?` : `${e}[A-Za-z0-9_-]*`;
};
const PROBE_TAG_EXACT_RE = new RegExp(`\\[(?:${PROBE_TAGS.map(tagAlt).join('|')})\\]`, 'i');
/* A probe tag name of four or more characters anywhere in the code part, strings and nameof
 * included: catches a tag put together from pieces ($"[{"CDPERF"}]", string.Format). Short
 * names (P1, DT, MO) are ordinary words or indexes and keep the bracket form. */
const PROBE_TAG_NAME_RE = new RegExp(
  `(?<![\\w-])(?:${PROBE_TAGS.filter((t) => t.length >= 4).map((t) => t.replace(/[-]/g, '\\-')).join('|')})(?![\\w-])`);
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
  if (LOG_CALL_RE.test(code)) {
    const minus = code.includes('-');
    if (TIMING_STRONG_RE.test(code)) hits.add('timing');
    else if (minus && (TIMING_CLOCK_RE.test(code) || TIMING_WEAK_RE.test(code))) hits.add('timing');
  }
  if (PROBE_TAG_NAME_RE.test(text)) hits.add('tag-name');
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
    const head = name.split('-')[0];
    // The first part of a dashed name stands alone only when it holds a digit (dt1-p1 → dt1;
    // mac-fix does not make "mac" a name).
    for (const n of /\d/.test(head) ? [name, head] : [name]) {
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

/** Any C# file under Spixi/, the vendored RocksDbSharp folder included (the Mac build compiles
 * it): R2 and R5 read it; R6 and the counter leave it out. */
export function isAppCsAny(p) {
  return /^spixi\//i.test(p) && /\.cs$/i.test(p);
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
  return isAppCsAny(path) ? lib.classifyCs(text) : lib.classifyWeb(text, extOf(path));
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

/* The changed paths of the whole diff (names only), for the notes on .gitattributes and on the
 * files the checks themselves depend on. */
function gitChangedNames(repo, base, head) {
  const r = spawnSync('git', ['-C', repo, '-c', 'core.quotePath=false', 'diff', '--name-only', '-z', '--no-renames',
    '--no-ext-diff', '--end-of-options', base, head], { maxBuffer: 1024 * 1024 * 1024, encoding: 'buffer', env: { ...process.env, LC_ALL: 'C' } });
  if (r.error || r.status !== 0) {
    const msg = r.error ? r.error.message : String(r.stderr).trim().split('\n')[0];
    throw new lib.GitError(`git diff --name-only: ${msg}`);
  }
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
}

/* git's own rename pairs among app C# files → Map<new path, old path>, so that a moved and
 * edited file keeps its base count for R6. */
function gitRenames(repo, base, head) {
  const r = spawnSync('git', ['-C', repo, '-c', 'core.quotePath=false', 'diff', '-M', '--diff-filter=R', '--name-status', '-z',
    '--no-ext-diff', '--end-of-options', base, head, '--', APP_PATHSPEC], { maxBuffer: 1024 * 1024 * 1024, encoding: 'buffer', env: { ...process.env, LC_ALL: 'C' } });
  if (r.error || r.status !== 0) {
    const msg = r.error ? r.error.message : String(r.stderr).trim().split('\n')[0];
    throw new lib.GitError(`git diff -M: ${msg}`);
  }
  const f = r.stdout.toString('utf8').split('\0');
  const map = new Map();
  for (let i = 0; i + 2 < f.length; i += 3) {
    if (!/^R\d*$/.test(f[i])) break;
    map.set(f[i + 2], f[i + 1]);
  }
  return map;
}

/* Files whose change asks for a reading by hand: the checks, their pins, the workflow, the
 * attributes, the installed tools and their sources, and the build settings of the app. */
const WATCHED_RE = /^(?:scripts\/size-[^/]*\.mjs|scripts\/pins-sizerule\/.*|scripts\/pins-leanfollow\/d-ci\.mjs|\.github\/workflows\/.*|(?:.*\/)?\.gitattributes|package\.json|package-lock\.json|(?:.*\/)?node_modules\/.*|(?:.*\/)?\.npmrc|.*\.csproj|(?:.*\/)?Directory\.Build\.(?:props|targets)|(?:.*\/)?global\.json)$/;

/* Why a file of the diff cannot be classified, or null. size-lib marks NUL and UTF-16 texts;
 * a symlink or a submodule is not a blob gitFiles returns. */
function unreadableWhy(f) {
  if (!f) return 'a symlink or a submodule, not a file';
  if (f.unreadable) return String(f.unreadable);
  if (f.text.includes('\u0000')) return 'NUL bytes (UTF-16 or binary)';
  if (f.text.startsWith('\ufffd\ufffd')) return 'a UTF-16 byte order mark';
  return null;
}

const tokenKey = (id, s) => `${id}:${squash(s).toLowerCase()}`;

/** The marker tokens of one comment text: one `<id>:<matched text>` per regex hit (lower case,
 * white space squashed). */
export function markerTokens(commentText, nameRe) {
  if (!commentText) return [];
  const text = foldText(commentText);
  const out = [];
  for (const m of HISTORY_MARKERS_G) for (const x of text.matchAll(m.re)) out.push(tokenKey(m.id, x[0]));
  if (nameRe) {
    const g = new RegExp(nameRe.source, nameRe.flags.includes('g') ? nameRe.flags : `${nameRe.flags}g`);
    for (const x of text.matchAll(g)) out.push(tokenKey('batch-name', x[0]));
  }
  return out;
}

/** True when a line's only marker is one decision number (the rule allows one per member). */
export function isSingleDecisionNumber(tokens) {
  return tokens.length === 1 && tokens[0].startsWith('decision-number:');
}

/** Runs R2, R5 and R6 on the diff base..head → the result object (see the module header). */
export function runChecks({ repo = '.', base, head }) {
  const baseId = lib.gitResolve(repo, base);
  const headId = lib.gitResolve(repo, head);
  const pathspecs = [APP_PATHSPEC, ...SRC_PATHSPECS];
  const diff = lib.gitDiffAdded(repo, baseId, headId, pathspecs);
  const removedLines = gitDiffRemoved(repo, baseId, headId, pathspecs);
  const changed = gitChangedNames(repo, baseId, headId);
  const renames = gitRenames(repo, baseId, headId);
  for (const p of [...diff.keys(), ...removedLines.keys(), ...changed, ...renames.keys(), ...renames.values()]) {
    if (p.includes('\ufffd')) throw new Error(`a path of the diff is not UTF-8 text, so it cannot be checked: ${p}`);
  }

  const touched = [...diff.keys()];
  const srcWeb = touched.filter(isSrcWebPath);
  const genHead = lib.gitGenerated(repo, headId, srcWeb);
  const genBase = lib.gitGenerated(repo, baseId, srcWeb);
  const skippedGenerated = (p) => diff.get(p).status !== 'A' && genHead.has(p) && genBase.has(p);
  const inScope = (p) => isAppCsAny(p) || (isSrcWebPath(p) && !skippedGenerated(p));

  const headPaths = touched.filter((p) => diff.get(p).status !== 'D' && inScope(p));
  const basePaths = touched.filter((p) => diff.get(p).status !== 'A' && inScope(p));
  const headFiles = new Map(lib.gitFiles(repo, headId, headPaths).map((f) => [f.path, f]));
  const baseFiles = new Map(lib.gitFiles(repo, baseId, basePaths).map((f) => [f.path, f]));

  const names = [...new Set([...batchNames(treePaths(repo, baseId)), ...batchNames(treePaths(repo, headId))])].sort();
  const nameRe = batchNameRe(names);

  // What the diff removes: the marker tokens of every removed comment line (the credit), and
  // probe code lines outside the fence.
  const credit = new Map();
  const removedProbes = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  const take = (m, k) => {
    const n = m.get(k) || 0;
    if (n <= 0) return false;
    m.set(k, n - 1);
    return true;
  };
  const baseAnalysis = new Map();
  for (const p of basePaths) {
    const f = baseFiles.get(p);
    if (unreadableWhy(f)) continue;
    const lines = removedLines.get(p);
    if (!(lines && lines.length) && !isAppCsAny(p)) continue;
    const r = analyze(p, f.text);
    baseAnalysis.set(p, r);
    if (!lines) continue;
    for (const ln of lines) {
      const i = ln - 1;
      if (i < 0 || i >= r.kinds.length) continue;
      for (const t of markerTokens(commentOf(r, ln, isAppCsAny(p)), nameRe)) bump(credit, t);
      if (isAppCsAny(p) && r.kinds[i] === 'code' && r.store[i] && probeHits(r.codeText[i]).length) {
        bump(removedProbes, squash(r.codeText[i]));
      }
    }
  }

  const r2 = {
    count: 0, max: R2_MAX_MARKER_LINES, pass: true, lines: [], app: 0, src: 0,
    credited: 0, singleDecision: 0, unreadable: [], names,
  };
  const r5 = { pass: true, lines: [], moved: 0, probes: 0, unreadable: 0 };
  const r6 = { pass: true, mode: R6_MODE, files: [], limit: R6_LIMIT };
  const notes = {
    gitattributes: changed.filter((p) => /(?:^|\/)\.gitattributes$/.test(p)),
    watched: changed.filter((p) => WATCHED_RE.test(p)),
  };

  for (const p of [...headPaths].sort()) {
    const entry = diff.get(p);
    const app = isAppCsAny(p);
    const f = headFiles.get(p);
    const why = unreadableWhy(f);
    if (why) {
      if (app) r5.lines.push({ path: p, line: 0, text: `unreadable: ${why}`, hits: ['unreadable'] });
      else r2.unreadable.push({ path: p, why });
      continue;
    }
    const text = f.text;
    const r = analyze(p, text);
    const suspect = app ? (r.suspect || []) : [];
    if (suspect.length) {
      const s = suspect[0];
      const more = suspect.length > 1 ? ` (and ${suspect.length - 1} more)` : '';
      r5.lines.push({ path: p, line: s.line, text: `unreadable: ${s.reason} at line ${s.line}${more}`, hits: ['unreadable', s.reason] });
    }
    // An unchanged probe line that the diff takes out of its fence (an #if / #endif moved or
    // removed, a #define added) or out of a block comment ships as surely as a new one.
    const rb = app && !suspect.length && entry.status === 'M' ? baseAnalysis.get(p) : null;
    if (rb) {
      const addedSet = new Set(entry.added);
      const removedSet = new Set(removedLines.get(p) || []);
      let j = 1;
      for (let ln = 1; ln <= r.kinds.length; ln++) {
        while (removedSet.has(j)) j++;
        if (addedSet.has(ln)) continue;
        const i = ln - 1;
        if (r.kinds[i] === 'code' && r.store[i] && j - 1 < rb.kinds.length) {
          const how = rb.kinds[j - 1] !== 'code' ? 'uncommented' : !rb.store[j - 1] ? 'unfenced' : null;
          if (how) {
            const hits = probeHits(r.codeText[i]);
            if (hits.length) r5.lines.push({ path: p, line: ln, text: r.codeText[i].trim(), hits: [how, ...hits] });
          }
        }
        j++;
      }
    }
    for (const ln of entry.added) {
      const i = ln - 1;
      if (i < 0 || i >= r.kinds.length) continue;
      const comment = commentOf(r, ln, app).trim();
      const tokens = markerTokens(comment, nameRe);
      if (tokens.length) {
        if (isSingleDecisionNumber(tokens)) r2.singleDecision++;
        else {
          const fresh = tokens.filter((t) => !take(credit, t));
          if (fresh.length === 0) r2.credited++;
          else {
            r2.lines.push({ path: p, line: ln, text: comment, hits: historyHits(comment, nameRe), tokens: fresh });
            if (app) r2.app++; else r2.src++;
          }
        }
      }
      if (app && !suspect.length && r.kinds[i] === 'code' && r.store[i]) {
        const hits = probeHits(r.codeText[i]);
        if (hits.length) {
          if (take(removedProbes, squash(r.codeText[i]))) r5.moved++;
          else r5.lines.push({ path: p, line: ln, text: r.codeText[i].trim(), hits });
        }
      }
    }
    if (isAppCsPath(p)) {
      const headLines = linesOf(text);
      let baseLines = 0;
      let renamedFrom = null;
      const bf = baseFiles.get(p);
      if (entry.status === 'M' && bf && !unreadableWhy(bf)) baseLines = linesOf(bf.text);
      else if (entry.status === 'A' && renames.has(p)) {
        renamedFrom = renames.get(p);
        const of = baseFiles.get(renamedFrom);
        if (of && !unreadableWhy(of)) baseLines = linesOf(of.text);
      }
      const breach = baseLines > R6_LIMIT ? headLines > baseLines : headLines > R6_LIMIT;
      if (breach) r6.files.push({ path: p, base: baseLines, head: headLines, status: entry.status, renamedFrom });
    }
  }
  r5.lines.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  r2.count = r2.lines.length;
  r2.pass = r2.count <= R2_MAX_MARKER_LINES && r2.unreadable.length === 0;
  r5.unreadable = r5.lines.filter((l) => l.hits[0] === 'unreadable').length;
  r5.probes = r5.lines.length - r5.unreadable;
  r5.pass = r5.lines.length === 0;
  r6.pass = R6_MODE === 'report' ? true : r6.files.length === 0;
  return { base: baseId, head: headId, r2, r5, r6, notes, pass: r2.pass && r5.pass && r6.pass };
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

/** The sentence that says which diff was checked. */
export function scopeLine(res, ci) {
  const range = `${res.base.slice(0, 12)}..${res.head.slice(0, 12)}`;
  return ci
    ? `checked: the diff ${range} = HEAD^1..HEAD (on a pull request: what it brings; on a push or a manual run: the last commit only)`
    : `checked: the diff ${range} (the --base and --head given)`;
}

function r2Line(r2) {
  return `R2 history markers in added comment lines: ${r2.count} (app C# ${r2.app}, src ${r2.src}; ${r2.credited} credited by removed markers, ${r2.singleDecision} with one decision number only; ${r2.unreadable.length} unreadable), max ${r2.max}: ${r2.pass ? 'pass' : 'FAIL'}`;
}

function r2Fail(r2) {
  const why = [];
  if (r2.count > r2.max) why.push(`${r2.count} added comment lines hold a history marker (max ${r2.max}): a comment says what or why, never history`);
  if (r2.unreadable.length) why.push(`${r2.unreadable.length} src file(s) of the diff cannot be read`);
  return `FAIL R2 ${why.join('; ')}`;
}

function r5Fail(r5) {
  const why = [];
  if (r5.probes) why.push(`${r5.probes} new probe line(s) outside #if SPIXI_DEV_COEXIST / DEBUG / SPIXI_CSH`);
  if (r5.unreadable) why.push(`${r5.unreadable} file(s) unreadable or suspect`);
  return `FAIL R5 ${why.join(' · ')}`;
}

function textReport(res, sizes, ci) {
  const out = [];
  out.push(`size-check: base ${res.base.slice(0, 12)} head ${res.head.slice(0, 12)}`);
  out.push(scopeLine(res, ci));
  if (res.notes.gitattributes.length) {
    out.push('NOTE the diff changes .gitattributes: the generated / vendored set of src may differ between base and head');
    for (const p of res.notes.gitattributes) out.push(`${P}${sanitizeLine(p)}`);
  }
  if (res.notes.watched.length) {
    out.push('NOTE the pull request changes the size checks or their inputs: review that part by hand');
    for (const p of res.notes.watched) out.push(`${P}${sanitizeLine(p)}`);
  }
  if (sizes) {
    out.push('SIZE (head, delta against the base)');
    for (const [k, v, dv] of sizeRows(sizes.head, sizes.delta)) out.push(`  ${k.padEnd(36)} ${String(v).padStart(8)}  ${dv}`);
  }
  const { r2, r5, r6 } = res;
  out.push(r2Line(r2));
  for (const u of r2.unreadable) out.push(`${P}${sanitizeLine(`${u.path}: unreadable: ${u.why}`)}`);
  for (const l of r2.lines) out.push(`${P}${sanitizeLine(`${l.path}:${l.line} [${l.hits.join(',')}] ${l.text}`)}`);
  out.push(`R5 new probe lines outside the dev fence: ${r5.probes} (${r5.moved} moved, not counted; ${r5.unreadable} file(s) unreadable or suspect): ${r5.pass ? 'pass' : 'FAIL'}`);
  for (const l of r5.lines) out.push(`${P}${sanitizeLine(`${l.path}:${l.line} [${l.hits.join(',')}] ${l.text}`)}`);
  out.push(`R6 app C# files over ${R6_LIMIT} lines that grew, or new past it: ${r6.files.length} (mode ${r6.mode}): ${r6.files.length === 0 ? 'pass' : r6.mode === 'fail' ? 'FAIL' : 'report only'}`);
  for (const f of r6.files) out.push(`${P}${sanitizeLine(`${f.path}: ${f.base} -> ${f.head} lines${f.renamedFrom ? ` (renamed from ${f.renamedFrom})` : ''}`)}`);
  if (!r2.pass) out.push(r2Fail(r2));
  if (!r5.pass) out.push(r5Fail(r5));
  if (!r6.pass) out.push(`FAIL R6 ${r6.files.length} app C# file(s) grew while over ${R6_LIMIT} lines or crossed it`);
  out.push(`size-check: ${res.pass ? 'PASS' : 'FAIL'}`);
  return out.join('\n') + '\n';
}

const SUMMARY_ROWS = 200;

function markdownReport(res, sizes, ci) {
  const out = [];
  const st = (ok) => (ok ? 'pass' : '**FAIL**');
  out.push(`## Size (R2 · R5 · R6) — ${res.pass ? 'pass' : '**FAIL**'}`, '');
  out.push(markdownCell(scopeLine(res, ci)), '');
  if (res.notes.gitattributes.length) {
    out.push(`**Note:** the diff changes .gitattributes (${res.notes.gitattributes.map(markdownCell).join(', ')}): the generated / vendored set of src may differ between base and head.`, '');
  }
  if (res.notes.watched.length) {
    out.push(`**Note:** the pull request changes the size checks or their inputs (${res.notes.watched.map(markdownCell).join(', ')}): review that part by hand.`, '');
  }
  if (sizes) {
    out.push('| Size of the head | Lines | Delta |', '|---|---:|---:|');
    for (const [k, v, dv] of sizeRows(sizes.head, sizes.delta)) out.push(`| ${k} | ${v} | ${dv} |`);
    out.push('');
  }
  const { r2, r5, r6 } = res;
  out.push('| Check | Result | Count | Detail |', '|---|---|---:|---|');
  out.push(`| R2 history markers in added comments (max ${r2.max}) | ${st(r2.pass)} | ${r2.count} | app C# ${r2.app} · src ${r2.src} · ${r2.credited} credited by removed markers · ${r2.singleDecision} with one decision number only · ${r2.unreadable.length} unreadable |`);
  out.push(`| R5 new probe lines outside the dev fence | ${st(r5.pass)} | ${r5.probes} | ${r5.moved} moved, not counted · ${r5.unreadable} file(s) unreadable or suspect |`);
  out.push(`| R6 files over ${R6_LIMIT} lines (mode ${r6.mode}) | ${r6.files.length === 0 ? 'pass' : r6.mode === 'fail' ? '**FAIL**' : 'report only'} | ${r6.files.length} | |`);
  out.push('');
  const table = (title, head, rows) => {
    if (!rows.length) return;
    out.push(`### ${title}`, '', head, head.replace(/[^|]+/g, '---'));
    for (const r of rows.slice(0, SUMMARY_ROWS)) out.push(r);
    if (rows.length > SUMMARY_ROWS) out.push(`| … ${rows.length - SUMMARY_ROWS} more in the job log | | |`);
    out.push('');
  };
  table('R2 unreadable src files', '| File | Why |',
    r2.unreadable.map((u) => `| ${markdownCell(u.path)} | ${markdownCell(u.why)} |`));
  table('R2 marker lines', '| Line | Markers | Comment |',
    r2.lines.map((l) => `| ${markdownCell(`${l.path}:${l.line}`)} | ${markdownCell(l.hits.join(', '))} | ${markdownCell(l.text)} |`));
  table('R5 probe lines', '| Line | Kind | Code |',
    r5.lines.map((l) => `| ${markdownCell(`${l.path}:${l.line}`)} | ${markdownCell(l.hits.join(', '))} | ${markdownCell(l.text)} |`));
  table('R6 files', '| File | Base | Head | Renamed from |',
    r6.files.map((f) => `| ${markdownCell(f.path)} | ${f.base} | ${f.head} | ${f.renamedFrom ? markdownCell(f.renamedFrom) : ''} |`));
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
    process.stdout.write(textReport(res, sizes, o.ci));
    if (o.summary) appendFileSync(o.summary, markdownReport(res, sizes, o.ci));
    return res.pass ? 0 : 1;
  } catch (e) {
    process.stderr.write(`size-check: ERROR ${sanitizeLine(e && e.message ? e.message : String(e))}\n`);
    return 2;
  }
}

function invokedDirectly() {
  try {
    return Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (invokedDirectly()) process.exitCode = main(process.argv.slice(2));
