/* bridge-contract — the `ixian:` verb contract, generated from the code (quality research #14; interface I2 / I3 of
 * docs/contract-qtools.md).
 *
 * DEFECT CLASS. A bridge verb added, removed or moved (its C# handler file, or the shells that send it) without a reviewed
 * change of docs/bridge-contract.json. The file is the reviewed record; this script makes it from the code, so a drift
 * shows as a diff.
 *
 * USAGE  node scripts/quality/bridge-contract.mjs [--root <dir>] --write | --check
 *   --write  writes docs/bridge-contract.json (keeps its "parsers" value; exit 1 when a dynamic emit is not listed)
 *   --check  regenerates and compares: exit 0 equal · 1 different (each verb added / removed / moved / changed is named) or
 *            a dynamic emit not listed · 2 an input could not be read (fail closed)
 *   The "parsers" key is the lead's (builder-e's list); --check ignores it and --write carries it over.
 *
 * WHAT IT READS
 *   · the bundle's source list (the FILES array of scripts/build-demo-bundle.mjs) and the shell map (the SHELLS table of
 *     scripts/build-shells.mjs: src/shells/<x>.html → the built name C# loads);
 *   · the JS of every bundle file and the inline <script> of every src/shells/*.html, lexed by scripts/lib/lean-strip.mjs
 *     (scanJs / walkHtml): a string or template TOKEN (never a comment) that starts with `ixian:<name>` is an emit of the verb
 *     <name> (the longest run of [A-Za-z0-9_] after `ixian:`);
 *   · Spixi/**.cs through scripts/quality/lib-csharp.mjs (tree-sitter-c-sharp).
 *
 * THE FIELDS OF A VERB
 *   senders    the BUILT shell names (what C# loads) that can send it. All shells load ONE bundle, so a component does not
 *              belong to a shell by file. The rule: a shell sends a verb when its own inline script emits it, or when its
 *              inline script names an export of a bundle file that emits it — directly, or through a chain of bundle files
 *              each naming an export of the next. LIMIT: naming is not calling — an OVER-approximation, and for the
 *              chat-only rule of the isolation check (ISO-7: "only chat.html sends it") that is the UNSAFE direction: a
 *              second shell that merely names a component makes a chat verb look shared, and ISO-7 then skips it. A
 *              component reached through a computed property (`window[name]`) or a string is not seen (an under-
 *              approximation). Verbs in markup are read too: an `href="ixian:…"` and the JS of an `on…=` attribute.
 *   emitFiles  the src files with an emit site.
 *   handlers   {file, member} of each C# page member (a class that is SpixiContentPage or derives from it) that TESTS the
 *              verb: the literal (or a const that holds it) is an argument or the receiver of StartsWith / Equals / Contains
 *              / EndsWith / IndexOf / string.Compare / Regex.IsMatch / Regex.Match (a `^ixian:` pattern), an operand of == /
 *              !=, a `case` label or a returned value; the branch it guards (an `if` or `?:` whose condition holds it) is
 *              what the marks read, else the whole member. A test inside a helper of a non-page class (S17Rules.isDoneVerb, SMoments.handleVerb …) is lifted to
 *              the page members that call that helper, by name (`Type.m(…)`, a bare call in the class, or `obj.m(…)` when
 *              the tree declares at most AMBIGUOUS_MAX methods named m). A literal inside a log call is a message, not a test. A
 *              literal used only to cut the payload (Substring, Split, .Length, runFencedVerb) is not a test. A PREFIX test
 *              (StartsWith / Contains / IndexOf with `ixian:<name>` and no ':' after it) answers every verb whose name
 *              starts with <name> (CallPage's `ixian:call` answers callMute, callback …): that is what the C# accepts.
 *   payload    the emit shapes, `*` for each computed part (`ixian:sendrequest:*:*`); with no shell emitter, the C# test
 *              literals (`*` after a StartsWith prefix). Several shapes are joined with " | ".
 *   marks      what the handler branches REACH (lib-csharp reach: a call graph by name, depth ≤ RULES.maxDepth):
 *              money — a call named in RULES.money or matching RULES.moneyRe, or `new` of RULES.moneyNew (Ixian-Core's
 *              Transaction constructor signs); keys — RULES.keys / keysRecv / keysMembers / keysStrings; path — a call
 *              on RULES.pathRecv, or `new` of RULES.pathNew, with an argument that carries a value from the URL (taint).
 *
 * A C# file the parser cannot read that names a mark-list name (RULE_TOKENS) is a read error, exit 2, unless
 * PARSE_EXCEPTIONS lists it with every such name; a listed file is not in the call graph.
 *
 * WHAT IT CANNOT SEE: a verb test through a dictionary key or a table of literals (`{ "ixian:x", handler }`), through a
 * variable prefix only, or in a helper the lift does not resolve by name; a call through a listed unparsable file; a verb
 * composed at run time (`'ixian:' + x`, `'ixian:open' + x`: a computed part right after the name)
 * — every such site must be listed in DYNAMIC_EMITS with the
 * verbs it can form, else --check and --write fail; a C# test through a variable prefix only; everything lib-csharp's head
 * lists (no binding, no field taint, no Ixian-Core bodies). It guards against mistakes, not against an author who hides code.
 */
import { writeFileSync, existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanJs, walkHtml } from '../lib/lean-strip.mjs';
import { ReadError, read, listFiles, buildModel, STRING_TYPES, strValue, memberOf, memberName, typeName, callee, ancestor,
  branchOf, inLogCall, reach, taintIn, params, loadParser, desc, perTree, AMBIGUOUS_MAX } from './lib-csharp.mjs';

export const CONTRACT_FILE = 'docs/bridge-contract.json';
export const GENERATOR = 'scripts/quality/bridge-contract.mjs';
export const BASE_PAGE = 'SpixiContentPage';
export const LOG_RECV = new Set(['Logging', 'Console', 'Debug', 'Trace', 'P1Perf']);

/* The mark lists (the defect classes of SECURITY.md § 2–4 and CLAUDE.md "C# touches no risky parts"). A name here is
 * matched on the INVOKED name, any receiver, so a call into Ixian-Core is seen without its body. */
export const RULES = {
  maxDepth: 10,
  /* build, sign or broadcast a transaction */
  money: new Set(['addTransaction', 'sendTransactionFrom', 'prepareTransactionFrom', 'sendTransaction', 'broadcastTransaction', 'signTransaction',
    'addOutgoingTransaction', 'transactionSend', 'getSignature']),
  /* a name of this shape is money too (Ixian-Core's multisig family) */
  moneyRe: /^multisig\w*Transaction$/i,
  /* `new` of these types is money: Ixian-Core's Transaction constructor signs with the wallet key */
  moneyNew: new Set(['Transaction']),
  /* the wallet password, the private key, the seed, the wallet file */
  keys: new Set(['isValidPassword', 'getPrimaryPrivateKey', 'writeWallet', 'readWallet', 'loadWallet', 'generateWallet',
    'addWallet', 'encryptWithPassword', 'decryptWithPassword', 'authWithPassword', 'changePassword']),
  keysRecv: new Set(['WalletPassStore']),
  keysMembers: new Set(['walletFile']),
  keysStrings: new Set(['walletpass', 'wallet.ixi']),
  /* the filesystem, with a value from the URL */
  pathRecv: new Set(['File', 'Directory', 'Path', 'ZipFile', 'FileInfo', 'DirectoryInfo', 'FileSystem']),
  pathNew: new Set(['FileStream', 'StreamReader', 'StreamWriter', 'FileInfo', 'DirectoryInfo', 'ZipArchive', 'FileStreamOptions']),
};

/* Every emit that composes the verb at run time, with the verbs it can form. A NEW one fails --check / --write: it must be
 * read and listed here (the verbs it can form become senders of its shell). */
/* Every name the mark lists match: a C# file the parser cannot read that names one of them is a read error (exit 2), so
 * an unreadable file never hides a mark — unless PARSE_EXCEPTIONS lists that file with every such name it holds. */
export const RULE_TOKENS = [...RULES.money, ...RULES.keys, ...RULES.keysRecv, ...RULES.keysMembers, ...RULES.pathRecv, ...RULES.pathNew, ...RULES.moneyNew];
/* The C# files tree-sitter-c-sharp 0.23.5 cannot parse today, with what their text names. A listed file is SKIPPED: its
 * calls are not in the call graph, so a verb that reaches money only through it would show no mark (a stated limit). A
 * new name in a listed file, or a new unparsable file, fails closed. */
export const PARSE_EXCEPTIONS = [
  { file: 'Spixi/Meta/SpixiTransactionInclusionCallbacks.cs', names: ['Transaction', 'addOutgoingTransaction'], reason: 'C# 14 null-conditional assignment (`balances.TryGet(...)?.lastUpdate = 0`, scripts/cs-syntax-check.mjs GRAMMAR_GAPS); the transaction-inclusion callbacks of Ixian-Core — no page and no verb calls into it (blockReorg re-adds the pending outgoing transactions; it is called by the Ixian-Core TransactionInclusion, never from a WebView verb)' },
  { file: 'Spixi/Platforms/MacCatalyst/RocksDbSharp/BinaryComparer.cs', names: [], reason: 'vendored RocksDbSharp (the Mac storage binding); no verb reaches it' },
  { file: 'Spixi/Platforms/MacCatalyst/RocksDbSharp/Options/ColumnFamilyOptions.cs', names: [], reason: 'vendored RocksDbSharp (the Mac storage binding); no verb reaches it' },
];

export const DYNAMIC_EMITS = [
  { file: 'src/bridge/native.js', shape: 'ixian:', verbs: [],
    reason: 'the transport prefix guard `command.startsWith(\'ixian:\')` — a test, not an emit' },
  { file: 'src/shells/contact_details.html', shape: 'ixian:*:*', verbs: ['ban', 'kick'],
    reason: 'onMemberAction sends only when `action === \'kick\' || action === \'ban\'` (the guard on the line above)' },
];

/* ─── the build tables ─── */
export function bundleFiles(root) {
  const t = read(root, 'scripts/build-demo-bundle.mjs');
  const at = t.indexOf('const FILES = [');
  const end = at < 0 ? -1 : t.indexOf('];', at);
  if (at < 0 || end < 0) throw new ReadError('scripts/build-demo-bundle.mjs: no `const FILES = [ … ];` list');
  const files = [...t.slice(at, end).matchAll(/^\s*'(src\/[^']+\.js)'/gm)].map((m) => m[1]);
  if (!files.length) throw new ReadError('scripts/build-demo-bundle.mjs: the FILES list is empty');
  return files;
}

export function shellMap(root) {
  const t = read(root, 'scripts/build-shells.mjs');
  const map = new Map();
  for (const m of t.matchAll(/\bin:\s*'src\/shells\/([^']+\.html)',\s*out:\s*'([^']+\.html)'/g)) map.set(m[1], m[2]);
  if (!map.size) throw new ReadError('scripts/build-shells.mjs: no `in: \'src/shells/…\', out: \'…\'` entry');
  const srcShells = listFiles(root, 'src/shells', (n) => n.endsWith('.html')).map((r) => r.slice('src/shells/'.length));
  for (const s of srcShells) if (!map.has(s)) throw new ReadError('src/shells/' + s + ' is not in the SHELLS table of scripts/build-shells.mjs');
  return { map, srcShells };
}

/* ─── JS ─── */
const LEX = new Map();
export const lexJs = (code, file) => {
  const k = createHash('sha1').update(code).digest('hex');
  if (LEX.has(k)) return LEX.get(k);
  try { const t = scanJs(code, { file }).tokens; LEX.set(k, t); return t; } catch (e) { throw new ReadError(file + ': the JS lexer refused: ' + String(e.message || e).split('\n')[0]); }
};
const tplShape = (v) => {
  let out = '', i = 1, n = v.length - 1;
  while (i < n) {
    if (v[i] === '\\') { out += v.slice(i, i + 2); i += 2; continue; }
    if (v[i] === '$' && v[i + 1] === '{') {
      let d = 1; i += 2;
      while (i < n && d) { if (v[i] === '{') d++; else if (v[i] === '}') d--; i++; }
      out += '*';
      continue;
    }
    out += v[i++];
  }
  return out;
};
const OPERAND_END = new Set(['+', ')', ',', ';', ']', '}', '?', ':', '||', '&&', '??', '===', '!==', '==', '!=']);
function stringShape(code, tokens, i) {
  let s = code.slice(tokens[i].start + 1, tokens[i].end - 1);
  let j = i + 1;
  while (tokens[j] && tokens[j].type === 'punct' && tokens[j].value === '+') {
    const nx = tokens[j + 1];
    if (!nx) break;
    if (nx.type === 'string' && !(tokens[j + 2] && tokens[j + 2].type === 'punct' && ['.', '[', '('].includes(tokens[j + 2].value))) {
      s += code.slice(nx.start + 1, nx.end - 1); j += 2; continue;
    }
    s += '*';
    let k = j + 1, d = 0;
    for (; k < tokens.length; k++) {
      const v = code.slice(tokens[k].start, tokens[k].end);
      if (d === 0 && tokens[k].type === 'punct' && OPERAND_END.has(v)) break;
      if (tokens[k].type === 'punct') {
        if (v === '(' || v === '[' || v === '{' || v.endsWith('${')) d++;
        if (v === ')' || v === ']' || v === '}') d--;
      }
      if (tokens[k].type === 'template' && v.startsWith('}')) d--;
      if (d < 0) break;
    }
    j = k;
  }
  return s;
}
const EXPORT_RE = /^export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;

/** emits + the names a piece of code uses */
const FACTS_JS = new Map();
export function jsFacts(code, file) {
  const k = createHash('sha1').update(code).digest('hex');
  if (!FACTS_JS.has(k)) FACTS_JS.set(k, jsFactsRaw(code, file));
  return FACTS_JS.get(k);
}
function jsFactsRaw(code, file) {
  const tokens = lexJs(code, file);
  const emits = [];
  const names = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'name') { names.add(t.value); continue; }
    if (t.type !== 'string' && t.type !== 'template') continue;
    const raw = t.type === 'template' ? t.value : code.slice(t.start, t.end);
    if (!/^['"`]ixian:/.test(raw)) continue;
    const shape = (t.type === 'template' ? tplShape(raw) : stringShape(code, tokens, i)).replace(/\*+/g, '*');
    const m = /^ixian:([A-Za-z0-9_]*)/.exec(shape);
    emits.push({ verb: m[1], shape, at: t.start });
  }
  return { emits, names };
}

/** the `ixian:` verbs of one markup piece: `href="ixian:…"` and the JS of every `on…=` attribute (entities &quot; &#39;
 *  &amp; decoded; other entities are not) */
function markupEmits(text, file) {
  const out = [];
  for (const m of text.matchAll(/\s(href|on[a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const v = (m[2] !== undefined ? m[2] : m[3]).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
    if (m[1].toLowerCase() === 'href') {
      const h = /^\s*ixian:([A-Za-z0-9_]*)/.exec(v);
      if (h) out.push({ verb: h[1], shape: v.trim(), at: m.index });
    } else if (v.includes('ixian:')) {
      for (const e of jsFacts(v, file).emits) out.push({ ...e, at: m.index });
    }
  }
  return out;
}

export function readJs(root) {
  const files = bundleFiles(root);
  const comp = new Map();
  for (const f of files) {
    const code = read(root, f);
    const exportsOf = [...code.matchAll(EXPORT_RE)].map((m) => m[1]);
    comp.set(f, { ...jsFacts(code, f), exports: exportsOf });
  }
  const { map, srcShells } = shellMap(root);
  const shells = new Map();
  for (const s of srcShells) {
    const rel = 'src/shells/' + s;
    const html = read(root, rel);
    shells.set(s, { rel, out: map.get(s), ...inlineFacts(html, rel) });
  }
  /* the reference graph: file A → file B when A names an export of B */
  const owner = new Map();
  for (const [f, c] of comp) for (const e of c.exports) if (!owner.has(e)) owner.set(e, f);
  const refs = (names, self) => { const out = new Set(); for (const n of names) { const o = owner.get(n); if (o && o !== self) out.add(o); } return out; };
  const edges = new Map([...comp].map(([f, c]) => [f, refs(c.names, f)]));
  for (const [, s] of shells) {
    const seen = new Set();
    const todo = [...refs(s.names, null)];
    while (todo.length) { const f = todo.pop(); if (seen.has(f)) continue; seen.add(f); for (const g of edges.get(f) || []) todo.push(g); }
    s.reached = seen;
  }
  return { files, comp, shells };
}

const INLINE = new Map();
export function inlineFacts(html, file) {
  const k = createHash('sha1').update(html).digest('hex');
  if (!INLINE.has(k)) INLINE.set(k, inlineFactsRaw(html, file));
  return INLINE.get(k);
}
function inlineFactsRaw(html, file) {
  let parts;
  try { parts = walkHtml(html, { file }).parts; } catch (e) { throw new ReadError(file + ': the HTML walker refused: ' + String(e.message || e).split('\n')[0]); }
  const emits = [], names = new Set();
  const markup = [];
  let at = 0;
  for (const p of parts) {
    if (p.kind === 'script') {
      if (p.text.trim()) {
        if (!p.classicJs) throw new ReadError(file + ': an inline <script> that is not a classic script (line ' + p.line + ') — the lexer reads classic scripts only');
        const f = jsFacts(p.text, file);
        for (const e of f.emits) emits.push({ ...e, at: at + e.at });
        for (const n of f.names) names.add(n);
      }
    } else if (p.kind !== 'style') {
      markup.push(p.text);
      for (const e of markupEmits(p.text, file)) emits.push({ ...e, at: at + e.at });
    }
    at += p.text.length;
  }
  return { emits, names, markup: markup.join('') };
}

/* ─── C# ─── */
const TEST_FNS = new Set(['StartsWith', 'Equals', 'Contains', 'EndsWith', 'IndexOf', 'Compare', 'CompareOrdinal', 'IsMatch', 'Match']);
const PREFIX_FNS = new Set(['StartsWith', 'Contains', 'IndexOf', 'IsMatch', 'Match']);
/** how a literal (or a const reference) is used: 'test' (a dispatch test), 'prefix' (a test that a longer verb also
 *  passes: StartsWith / Contains / IndexOf with `ixian:<name>` and no ':' after it) or '' (a payload cut, a label …) */
function useOf(node, value) {
  let n = node;
  while (n.parent && n.parent.type === 'parenthesized_expression') n = n.parent;
  const p = n.parent;
  if (!p) return '';
  /* the literal as the receiver: "ixian:x".Equals(url) */
  if (p.type === 'member_access_expression' && p.childForFieldName('expression') && p.childForFieldName('expression').startIndex === n.startIndex
    && p.parent && p.parent.type === 'invocation_expression') {
    const c = callee(p.parent);
    if (TEST_FNS.has(c.name)) return PREFIX_FNS.has(c.name) && /^ixian:[A-Za-z0-9_]+$/.test(value) ? 'prefix' : 'test';
    return '';
  }
  if (p.type === 'argument') {
    const inv = ancestor(p, ['invocation_expression']);
    const c = inv ? callee(inv) : { name: '' };
    if (!TEST_FNS.has(c.name)) return '';
    return PREFIX_FNS.has(c.name) && /^ixian:[A-Za-z0-9_]+$/.test(value) ? 'prefix' : 'test';
  }
  if (p.type === 'binary_expression' && /^(==|!=)$/.test((p.childForFieldName('operator') || {}).text || p.children[1].text)) return 'test';
  if (p.type === 'constant_pattern' || p.type === 'case_switch_label' || p.type === 'switch_label' || p.type === 'case_pattern_switch_label') return 'test';
  if (p.type === 'arrow_expression_clause' || p.type === 'return_statement') return 'test';
  return '';
}

function csSites(model) {
  const consts = [];
  const sites = [];
  for (const f of model.files) {
    if (!f.src.includes('ixian:')) continue;
    const lits = perTree(f.tree, 'ixian-literals', () => {
      const out = [];
      for (const s of desc(f.tree.rootNode, STRING_TYPES)) {
        const v = strValue(s);
        const m = /^\^?ixian:([A-Za-z0-9_]+)/.exec(v);
        if (!m || inLogCall(s, LOG_RECV)) continue;
        if (v.startsWith('^')) { const tail = v.slice(1); out.push({ node: s, verb: m[1], value: tail, use: useOf(s, tail) }); continue; }
        const decl = ancestor(s, ['variable_declarator']);
        const fd = decl && ancestor(decl, ['field_declaration']);
        if (fd && /\b(const|static\s+readonly|readonly\s+static)\b/.test(fd.text.split('=')[0])) {
          const id = decl.namedChildren.find((c) => c.type === 'identifier');
          const { type } = memberOf(s);
          const init = decl.text.slice(decl.text.indexOf('=') + 1).trim();
          if (id && init === s.text) { out.push({ isConst: true, cls: typeName(type), name: id.text, verb: m[1], value: v }); continue; }
        }
        out.push({ node: s, verb: m[1], value: v, use: useOf(s, v) });
      }
      return out;
    });
    for (const l of lits) (l.isConst ? consts : sites).push(l.isConst ? l : { rel: f.rel, ...l });
  }
  for (const c of consts) {
    for (const f of model.files) {
      if (!f.src.includes(c.name)) continue;
      const refs = perTree(f.tree, 'const-ref:' + c.cls + '.' + c.name, () => desc(f.tree.rootNode, ['member_access_expression', 'identifier']).filter((n) => {
        const t = n.text;
        const hit = n.type === 'member_access_expression' ? (t === c.cls + '.' + c.name || t.endsWith('.' + c.cls + '.' + c.name))
          : (t === c.name && n.parent && n.parent.type !== 'member_access_expression' && n.parent.type !== 'variable_declarator' && typeName(memberOf(n).type) === c.cls);
        return hit && !inLogCall(n, LOG_RECV);
      }).map((n) => ({ node: n, use: useOf(n, c.value) })));
      for (const r of refs) sites.push({ rel: f.rel, node: r.node, verb: c.verb, value: c.value, use: r.use });
    }
  }
  return sites.filter((x) => x.use);
}

/** the page members that hold a test, with the branch it guards; a test in a non-page class is lifted to the page
 *  members that call its member, by name (depth ≤ 4) */
function lift(model, rel, node, depth = 0, seen = new Set()) {
  const { member, type } = memberOf(node);
  const cls = typeName(type);
  if (!member) return [];
  if (model.isA(cls, BASE_PAGE)) {
    const branch = branchOf(node) || (depth ? node : member);
    return [{ rel, cls, member, name: memberName(member), branch }];
  }
  if (depth >= 4) return [];
  const mname = memberName(member);
  const key = cls + '.' + mname;
  if (seen.has(key)) return [];
  seen.add(key);
  const out = [];
  for (const f of model.files) {
    if (!f.src.includes(mname)) continue;
    const calls = perTree(f.tree, 'calls-named:' + mname, () => desc(f.tree.rootNode, 'invocation_expression')
      .map((inv) => ({ inv, c: callee(inv) })).filter((x) => x.c.name === mname)
      .map((x) => ({ inv: x.inv, last: x.c.recv.split('.').pop(), bare: !x.c.recv, callerCls: typeName(memberOf(x.inv).type) })));
    for (const x of calls) {
      /* Type.m(…), a bare call inside the class, or obj.m(…) when the tree declares at most AMBIGUOUS_MAX methods named m */
      const byName = !x.bare && x.last !== cls && (model.byName.get(mname) || []).length <= AMBIGUOUS_MAX && !model.classes.has(x.last);
      if (!(x.last === cls || (x.bare && x.callerCls === cls) || byName)) continue;
      out.push(...lift(model, f.rel, x.inv, depth + 1, seen));
    }
  }
  return out;
}

/** the whole model; `guardTokens`: a C# file the parser cannot read that names one of these is a read error (exit 2) */
export async function analyze(root, { guardTokens = [] } = {}) {
  const js = readJs(root);
  await loadParser();
  const model = buildModel(root, [...RULE_TOKENS, ...guardTokens], PARSE_EXCEPTIONS);
  const verbs = new Map();
  const V = (v) => { if (!verbs.has(v)) verbs.set(v, { senders: new Set(), emitFiles: new Set(), shapes: new Set(), csShapes: new Set(), handlers: new Map(), marks: new Set(), why: new Map() }); return verbs.get(v); };
  const dynamic = [];
  const take = (file, emits, senders) => {
    for (const e of emits) {
      if (!e.verb || /^ixian:[A-Za-z0-9_]*\*/.test(e.shape)) {
        const listed = DYNAMIC_EMITS.find((d) => d.file === file && d.shape === e.shape);
        dynamic.push({ file, shape: e.shape, listed: !!listed });
        if (listed) for (const v of listed.verbs) { const r = V(v); r.emitFiles.add(file); r.shapes.add(e.shape.replace(/^ixian:\*/, 'ixian:' + v)); for (const s of senders) r.senders.add(s); }
        continue;
      }
      const r = V(e.verb);
      r.emitFiles.add(file);
      r.shapes.add(e.shape);
      for (const s of senders) r.senders.add(s);
    }
  };
  for (const [f, c] of js.comp) take(f, c.emits, [...js.shells.values()].filter((s) => s.reached.has(f)).map((s) => s.out));
  for (const [, s] of js.shells) take(s.rel, s.emits, [s.out]);

  const memo = new Map();
  const taintMemo = new Map();
  const sites = csSites(model);
  for (const site of sites) V(site.verb).csShapes.add(site.value + (site.use === 'prefix' || /:$/.test(site.value) ? '*' : ''));
  for (const site of sites) {
    /* a prefix test answers every verb whose name starts with its name */
    const targets = site.use === 'prefix' ? [...verbs.keys()].filter((v) => v.startsWith(site.verb)) : [site.verb];
    for (const h of lift(model, site.rel, site.node)) {
      const tk = h.rel + ':' + h.member.startIndex;
      let tainted = taintMemo.get(tk);
      if (!tainted) { tainted = taintIn(h.member, h.rel, params(h.member).names); taintMemo.set(tk, tainted); }
      const got = reach(model, RULES, h.branch, { rel: h.rel, cls: h.cls, tainted }, 0, memo);
      for (const v of targets) {
        const r = V(v);
        const k = h.rel + '\u0000' + h.name;
        if (!r.handlers.has(k)) r.handlers.set(k, { file: h.rel, member: h.name, cls: h.cls, line: site.node.startPosition.row + 1, marks: new Set(), why: new Map() });
        const hm = r.handlers.get(k);
        for (const x of got.marks) { hm.marks.add(x); if (!hm.why.has(x)) hm.why.set(x, h.cls + '.' + h.name + ' → ' + got.why.get(x)); }
        for (const x of got.marks) { r.marks.add(x); if (!r.why.has(x)) r.why.set(x, h.cls + '.' + h.name + ' → ' + got.why.get(x)); }
      }
    }
  }
  return { js, model, verbs, dynamic };
}

const sorted = (it) => [...it].sort();
export function toContract(a, parsers = []) {
  const verbs = {};
  for (const v of sorted(a.verbs.keys())) {
    const r = a.verbs.get(v);
    verbs[v] = {
      senders: sorted(r.senders),
      emitFiles: sorted(r.emitFiles),
      handlers: [...r.handlers.values()].map(({ file, member }) => ({ file, member })).sort((x, y) => { const a = x.file + '\u0000' + x.member, b = y.file + '\u0000' + y.member; return a < b ? -1 : a > b ? 1 : 0; }),
      payload: sorted(r.shapes.size ? r.shapes : r.csShapes).join(' | '),
      marks: sorted(r.marks),
    };
  }
  return { schema: 1, generator: GENERATOR, verbs, parsers };
}

export async function generate(root) {
  return toContract(await analyze(root));
}

/** the differences between two contracts, verb by verb (the "parsers" key is not compared) */
export function diff(oldC, newC) {
  const out = [];
  const o = (oldC && oldC.verbs) || {}, n = newC.verbs;
  for (const v of sorted(new Set([...Object.keys(o), ...Object.keys(n)]))) {
    if (!(v in o)) { out.push({ verb: v, kind: 'added' }); continue; }
    if (!(v in n)) { out.push({ verb: v, kind: 'removed' }); continue; }
    const a = o[v], b = n[v];
    const J = (x) => JSON.stringify(x);
    const fields = [];
    const files = (x) => sorted(new Set((x.handlers || []).map((h) => h.file)));
    if (J(files(a)) !== J(files(b))) fields.push('handler file');
    if (J(a.senders) !== J(b.senders)) fields.push('senders');
    const moved = fields.length > 0;
    for (const k of ['handlers', 'emitFiles', 'payload', 'marks']) if (J(a[k]) !== J(b[k]) && !(k === 'handlers' && fields.includes('handler file'))) fields.push(k);
    if (fields.length) out.push({ verb: v, kind: moved ? 'moved' : 'changed', fields });
  }
  if (oldC && (oldC.schema !== newC.schema || oldC.generator !== newC.generator)) out.push({ verb: '(file)', kind: 'changed', fields: ['schema/generator'] });
  return out;
}

export const stringify = (c) => JSON.stringify(c, null, 2) + '\n';

async function main(argv) {
  let root = fileURLToPath(new URL('../..', import.meta.url));
  const a = [...argv];
  const ri = a.indexOf('--root');
  if (ri >= 0) { root = a[ri + 1]; a.splice(ri, 2); }
  const mode = a.includes('--write') ? 'write' : a.includes('--check') ? 'check' : '';
  if (!mode) { console.error('usage: node scripts/quality/bridge-contract.mjs [--root <dir>] --write | --check'); return 2; }
  let an;
  try { an = await analyze(root); } catch (e) {
    if (e instanceof ReadError) { console.error('bridge-contract: CANNOT READ — ' + e.message); return 2; }
    throw e;
  }
  const unlisted = an.dynamic.filter((d) => !d.listed);
  for (const d of unlisted) console.log('bridge-contract: DYNAMIC EMIT not listed in DYNAMIC_EMITS: ' + d.file + ' `' + d.shape + '` — read it and list the verbs it can form');
  const file = join(root, CONTRACT_FILE);
  let old = null;
  if (existsSync(file)) {
    try { old = JSON.parse(read(root, CONTRACT_FILE)); } catch (e) { if (mode === 'check') { console.error('bridge-contract: CANNOT READ ' + CONTRACT_FILE + ' — ' + e.message); return 2; } }
  }
  const fresh = toContract(an, (old && Array.isArray(old.parsers)) ? old.parsers : []);
  if (mode === 'write') {
    if (unlisted.length) return 1;
    writeFileSync(file, stringify(fresh));
    console.log('bridge-contract: wrote ' + CONTRACT_FILE + ' — ' + Object.keys(fresh.verbs).length + ' verbs');
    return 0;
  }
  if (!old) { console.error('bridge-contract: CANNOT READ ' + CONTRACT_FILE + ' — missing'); return 2; }
  const d = diff(old, fresh);
  for (const x of d) console.log('bridge-contract: ' + x.kind.toUpperCase() + ' ' + x.verb + (x.fields ? ' (' + x.fields.join(', ') + ')' : ''));
  if (d.length || unlisted.length) { console.log('bridge-contract: FAIL — ' + d.length + ' verb difference(s), ' + unlisted.length + ' unlisted dynamic emit(s); review, then --write'); return 1; }
  console.log('bridge-contract: OK — ' + Object.keys(fresh.verbs).length + ' verbs, equal to ' + CONTRACT_FILE);
  return 0;
}

const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) process.exitCode = await main(process.argv.slice(2));
