/* lib-csharp — the shared C# reader of the two quality checks (isolation-check.mjs, bridge-contract.mjs).
 *
 * WHAT IT DOES. It lists Spixi/**.cs (a `bin` or `obj` folder at any depth, in any letter case, is skipped), parses each
 * file with tree-sitter-c-sharp, and builds a small model: the classes and their base lists, the methods with their
 * parameters, and a name index. On top of the model it answers two questions: "which members of which classes name this
 * string literal" and "what does this block of code reach" (a call graph by NAME with a light taint walk, see `reach`).
 *
 * WHAT IT CANNOT SEE — this is a reader, not a compiler. It guards against mistakes, not against an author who hides code:
 *   · No binding. A call is resolved by its NAME: an unqualified call or `this.`/`base.` → the methods of that name in the
 *     class and its bases; `Type.m(…)` with Type a class of the tree → that class; any other receiver → every method of that
 *     name in the tree when there are at most AMBIGUOUS_MAX of them (arity-filtered), else nothing. An overload picked by
 *     type, an extension method, a delegate, an event, an interface dispatch, reflection and Ixian-Core (not in this repo)
 *     are not followed. A call into Ixian-Core is still SEEN by its name (that is how the money/keys lists work).
 *   · `#if` blocks are all read (tree-sitter parses every branch), so a symbol-gated line counts on every platform.
 *   · The taint walk follows locals, `out` arguments and parameters. A value parked in a field, a property, a collection
 *     or a closure that runs later is not followed.
 *   · A file the parser cannot read cleanly (an ERROR or MISSING node) is refused — ReadError, exit 2 — when its text names
 *     a token the checks read (`ixian:`, `WebView`, every mark-list name and every name the caller passes, as a whole word);
 *     a listed parse exception (file + the exact names it holds + a reason) is skipped, and what it holds is not seen.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

/** A check could not read an input: the caller exits 2 (fail closed). */
export class ReadError extends Error {}

export const read = (root, rel) => {
  const p = join(root, rel);
  if (!existsSync(p)) throw new ReadError('missing input: ' + rel);
  try { return readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); } catch (e) { throw new ReadError('cannot read ' + rel + ': ' + e.message); }
};

/** every file under `dir` (relative to root) whose name passes `test`; `bin`/`obj` (any case) and dot-folders skipped; sorted */
export function listFiles(root, dir, test) {
  const out = [];
  const base = join(root, dir);
  if (!existsSync(base)) throw new ReadError('missing input folder: ' + dir);
  const walk = (abs, rel) => {
    for (const name of readdirSync(abs).sort()) {
      if (/^(bin|obj)$/i.test(name) || name.startsWith('.') || name === 'node_modules') continue;
      const a = join(abs, name), r = rel + '/' + name;
      const st = statSync(a);
      if (st.isDirectory()) walk(a, r);
      else if (test(name)) out.push(r);
    }
  };
  walk(base, dir.replace(/\/+$/, ''));
  return out.sort();
}

let PARSER = null;
/** load tree-sitter once (async: tree-sitter-c-sharp is an ES module); every reader below needs it loaded first */
export async function loadParser() {
  if (PARSER) return PARSER;
  let Parser, CSharp;
  try {
    Parser = createRequire(import.meta.url)('tree-sitter');
    CSharp = (await import('tree-sitter-c-sharp/bindings/node/index.js')).default;
  } catch (e) {
    throw new ReadError('tree-sitter / tree-sitter-c-sharp not installed (npm ci): ' + e.message);
  }
  PARSER = new Parser();
  PARSER.setLanguage(CSharp);
  return PARSER;
}
function parser() {
  if (!PARSER) throw new ReadError('lib-csharp: loadParser() was not awaited');
  return PARSER;
}

/* parse cache by content (a pin runs the check on many copies that differ in one file) */
const TREES = new Map();
export function parseCs(src) {
  const key = createHash('sha1').update(src).digest('hex');
  let t = TREES.get(key);
  if (!t) {
    t = parser().parse(src, null, { bufferSize: src.length * 2 + 65536 });
    TREES.set(key, t);
  }
  return t;
}

/* per-tree caches: a node's `tree` is the parsed tree object, shared by every copy of the same content */
const DESC = new WeakMap();
/** node.descendantsOfType(types), cached per tree + span */
export function desc(node, types) {
  let m = DESC.get(node.tree);
  if (!m) { m = new Map(); DESC.set(node.tree, m); }
  const key = node.startIndex + ':' + node.endIndex + ':' + (Array.isArray(types) ? types.join(',') : types);
  let v = m.get(key);
  if (!v) { v = node.descendantsOfType(types); m.set(key, v); }
  return v;
}

const MEMO = new WeakMap();
/** fn() cached per parsed tree and key — for facts that depend on ONE file's content only */
export function perTree(tree, key, fn) {
  let m = MEMO.get(tree);
  if (!m) { m = new Map(); MEMO.set(tree, m); }
  if (!m.has(key)) m.set(key, fn());
  return m.get(key);
}

export const STRING_TYPES = ['string_literal', 'verbatim_string_literal', 'interpolated_string_expression', 'raw_string_literal'];
const MEMBER_TYPES = new Set(['method_declaration', 'constructor_declaration', 'destructor_declaration', 'operator_declaration',
  'conversion_operator_declaration', 'property_declaration', 'indexer_declaration', 'event_declaration', 'field_declaration']);
const TYPE_DECLS = ['class_declaration', 'struct_declaration', 'record_declaration', 'interface_declaration'];

/** the characters inside the quotes of a C# string node (prefix test only: escapes are not decoded) */
export function strValue(node) {
  const t = node.text;
  const m = /^(?:\$+@?|@\$*|u8)?("+)/.exec(t) || /^(?:\$+@?|@\$*)?("+)/.exec(t);
  if (!m) return '';
  const q = m[1].length;
  return t.slice(m[0].length, t.length - q >= m[0].length ? t.length - q : t.length);
}

export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const IDS = /[A-Za-z_][A-Za-z0-9_]*/g;
export const idents = (text) => String(text).match(IDS) || [];
const mentions = (text, set) => { if (!set.size) return false; for (const w of idents(text)) if (set.has(w)) return true; return false; };

/** name + receiver of an invocation_expression */
export function callee(inv) {
  const fn = inv.childForFieldName('function');
  if (!fn) return { name: '', recv: '' };
  const nameOf = (n) => {
    if (!n) return '';
    if (n.type === 'identifier') return n.text;
    if (n.type === 'generic_name') return (n.namedChildren.find((c) => c.type === 'identifier') || n).text;
    return n.text;
  };
  if (fn.type === 'identifier' || fn.type === 'generic_name') return { name: nameOf(fn), recv: '' };
  if (fn.type === 'member_access_expression') return { name: nameOf(fn.childForFieldName('name')), recv: (fn.childForFieldName('expression') || {}).text || '' };
  if (fn.type === 'conditional_access_expression') {
    const mb = fn.namedChildren.find((c) => c.type === 'member_binding_expression');
    const head = fn.namedChildren[0];
    return { name: mb ? nameOf(mb.childForFieldName('name') || mb.namedChildren[mb.namedChildren.length - 1]) : '', recv: head && head !== mb ? head.text : '' };
  }
  if (fn.type === 'member_binding_expression') return { name: nameOf(fn.childForFieldName('name') || fn.namedChildren[fn.namedChildren.length - 1]), recv: '?' };
  return { name: '', recv: fn.text };
}

export const argNodes = (inv) => {
  const al = inv.childForFieldName('arguments') || inv.namedChildren.find((c) => c.type === 'argument_list');
  return al ? al.namedChildren.filter((c) => c.type === 'argument') : [];
};

/** the outermost member (method, constructor, property, field …) that holds `node`, and its type declaration */
export function memberOf(node) {
  return perTree(node.tree, 'memberOf:' + node.startIndex + ':' + node.endIndex + ':' + node.type, () => memberOfRaw(node));
}
function memberOfRaw(node) {
  let member = null, type = null;
  for (let p = node.parent; p; p = p.parent) {
    if (!type && MEMBER_TYPES.has(p.type)) member = p;
    if (TYPE_DECLS.includes(p.type)) { type = p; break; }
  }
  return { member, type };
}

export function memberName(member) {
  if (!member) return '(type body)';
  const n = member.childForFieldName('name');
  if (n) return n.text;
  if (member.type === 'field_declaration' || member.type === 'event_declaration') {
    const d = member.descendantsOfType('variable_declarator')[0];
    const id = d && d.namedChildren.find((c) => c.type === 'identifier');
    return id ? id.text : '(field)';
  }
  if (member.type === 'indexer_declaration') return 'this[]';
  return '(' + member.type + ')';
}

export const typeName = (t) => (t && t.childForFieldName('name') ? t.childForFieldName('name').text : '');

/** the nearest ancestor (below `stop`) of one of `types` */
export function ancestor(node, types, stop = null) {
  for (let p = node.parent; p && p !== stop; p = p.parent) if (types.includes(p.type)) return p;
  return null;
}

const within = (n, outer) => n.startIndex >= outer.startIndex && n.endIndex <= outer.endIndex;

/** an `if` whose CONDITION holds `node` → its consequence; a `case` label / switch arm → its section; else null */
export function branchOf(node) {
  return perTree(node.tree, 'branchOf:' + node.startIndex + ':' + node.endIndex + ':' + node.type, () => branchOfRaw(node));
}
function branchOfRaw(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (MEMBER_TYPES.has(p.type)) return null;
    if (p.type === 'if_statement') {
      const c = p.childForFieldName('condition');
      if (c && within(node, c)) return p.childForFieldName('consequence');
    }
    if (p.type === 'switch_section') return p;
    if (p.type === 'switch_expression_arm') return p;
    if (p.type === 'conditional_expression') {
      const c = p.childForFieldName('condition');
      if (c && within(node, c)) return p.childForFieldName('consequence');
    }
  }
  return null;
}

/** parameter names of a method-like node, and how many are required */
export function params(m) {
  const pl = m.childForFieldName('parameters') || m.namedChildren.find((c) => c.type === 'parameter_list');
  const names = [];
  let required = 0, variadic = false, seenParams = false;
  if (pl) {
    for (const c of pl.children) {
      if (c.type === 'params') { seenParams = true; continue; }
      if (c.type === 'parameter') {
        const id = c.childForFieldName('name') || [...c.namedChildren].reverse().find((x) => x.type === 'identifier');
        names.push(id ? id.text : '?');
        if (!/=/.test(c.text) && !/^params\b/.test(c.text)) required++;
        if (/^params\b/.test(c.text)) variadic = true;
      } else if (seenParams && c.type === 'identifier') { names.push(c.text); variadic = true; }
    }
  }
  return { names, required, variadic };
}

/**
 * The C# model of the tree. `guardTokens`: a file with a parse error whose text names one of these is refused (ReadError),
 * unless `parseExceptions` lists that file with every token it names ({ file, names, reason }): a listed file is skipped,
 * so what it holds is not seen — the list says which names that hides.
 * → { files: [{ rel, src, tree }], classes: Map name → [{ rel, node, bases: [names] }], methods: [...], byName, byClass,
 *     isA(cls, base), classesOf(rel) }
 */
/** a base-list entry → { name: its last identifier, full: the dotted type name } (generic and constructor arguments cut) */
export function baseName(text) {
  let t = String(text), d = 0, out = '';
  for (const ch of t) { if (ch === '<' || ch === '(') d++; else if (ch === '>' || ch === ')') d--; else if (d === 0) out += ch; }
  const full = out.replace(/\s+/g, '').replace(/^global::/, '');
  return { name: full.split('.').pop(), full };
}

export function buildModel(root, guardTokens = [], parseExceptions = []) {
  const rels = listFiles(root, 'Spixi', (n) => n.endsWith('.cs'));
  if (!rels.length) throw new ReadError('no C# file under Spixi/');
  const files = [];
  const classes = new Map();
  const methods = [];
  const byName = new Map();
  const byClass = new Map();
  for (const rel of rels) {
    const src = read(root, rel);
    const tree = parseCs(src);
    if (tree.rootNode.hasError) {
      const hits = [...new Set([...['ixian:', 'WebView'].filter((t) => src.includes(t)), ...guardTokens.filter((t) => new RegExp('\\b' + t + '\\b').test(src))])].sort();
      const ex = parseExceptions.find((e) => e.file === rel);
      const unlisted = hits.filter((h) => !(ex && ex.names.includes(h)));
      if (unlisted.length) throw new ReadError(rel + ': the C# parser reports an ERROR or MISSING node, and the file names "' + unlisted.join('", "') + '" — cannot read it with certainty' + (ex ? ' (its listed exception names only ' + ex.names.join(', ') + ')' : ''));
      continue;
    }
    const f = { rel, src, tree };
    files.push(f);
    for (const t of desc(tree.rootNode, TYPE_DECLS)) {
      const name = typeName(t);
      const bl = t.namedChildren.find((c) => c.type === 'base_list');
      const bases = bl ? bl.namedChildren.map((c) => baseName(c.text).name).filter(Boolean) : [];
      const baseFull = bl ? bl.namedChildren.map((c) => baseName(c.text).full).filter(Boolean) : [];
      if (!classes.has(name)) classes.set(name, []);
      classes.get(name).push({ rel, node: t, bases, baseFull });
    }
    for (const m of desc(tree.rootNode, ['method_declaration', 'constructor_declaration', 'local_function_statement'])) {
      const n = m.childForFieldName('name');
      const owner = ancestor(m, TYPE_DECLS);
      const rec = { rel, node: m, name: n ? n.text : '', cls: typeName(owner), key: rel + ':' + m.startIndex, ...params(m),
        body: m.childForFieldName('body') || m.namedChildren.find((c) => c.type === 'block' || c.type === 'arrow_expression_clause') };
      methods.push(rec);
      if (!byName.has(rec.name)) byName.set(rec.name, []);
      byName.get(rec.name).push(rec);
      if (!byClass.has(rec.cls)) byClass.set(rec.cls, []);
      byClass.get(rec.cls).push(rec);
    }
  }
  const basesOf = (cls) => {
    const out = new Set();
    for (const d of classes.get(cls) || []) for (const b of d.bases) out.add(b);
    return [...out];
  };
  const isA = (cls, base, seen = new Set()) => {
    if (cls === base) return true;
    if (seen.has(cls)) return false;
    seen.add(cls);
    return basesOf(cls).some((b) => classes.has(b) && isA(b, base, seen));
  };
  const lineage = (cls) => {
    const out = [];
    const go = (c) => { if (!c || out.includes(c) || !classes.has(c)) return; out.push(c); for (const b of basesOf(c)) go(b); };
    go(cls);
    return out;
  };
  return { root, files, classes, methods, byName, byClass, isA, lineage };
}

export const AMBIGUOUS_MAX = 3;
const fits = (m, n) => n >= m.required && (m.variadic || n <= m.names.length);

/** the methods a call may land in (see the head) */
export function resolve(model, fromCls, inv) {
  const { name, recv } = callee(inv);
  if (!name) return [];
  const n = argNodes(inv).length;
  const r = recv.replace(/^global::/, '');
  let cands = [];
  if (!r || r === 'this' || r === 'base') {
    for (const c of model.lineage(fromCls)) cands.push(...(model.byClass.get(c) || []).filter((m) => m.name === name));
    if (!cands.length) cands = (model.byName.get(name) || []).filter((m) => m.node.type === 'local_function_statement');
  } else {
    const last = idents(r).pop();
    if (model.classes.has(last) && /^[A-Za-z_][A-Za-z0-9_.]*$/.test(r)) {
      for (const c of model.lineage(last)) cands.push(...(model.byClass.get(c) || []).filter((m) => m.name === name));
    } else {
      const all = (model.byName.get(name) || []).filter((m) => m.node.type !== 'local_function_statement');
      if (all.length <= AMBIGUOUS_MAX) cands = all;
    }
  }
  return cands.filter((m) => fits(m, n) && m.body);
}

/* ═══ reach: what a block of code reaches ═══════════════════════════════════════════════════════════════════════════
 * marks: 'money' — an invocation named in rules.money or matching rules.moneyRe, or `new` of a type in rules.moneyNew; 'keys' — an invocation named in rules.keys, a receiver named in
 * rules.keysRecv, a member access named in rules.keysMembers or a string literal in rules.keysStrings; 'path' — a call
 * on a receiver in rules.pathRecv, or `new` of a type in rules.pathNew, with an argument that names a TAINTED value.
 * Taint starts at the names passed in and moves through `var x = <tainted>`, `x = <tainted>`, an `out` argument of a call
 * with a tainted argument, and a tainted argument into the matching parameter of a resolved callee. */
const FACTS = new WeakMap();
function facts(node) {
  let byTree = FACTS.get(node.tree);
  if (!byTree) { byTree = new Map(); FACTS.set(node.tree, byTree); }
  const key = node.startIndex + ':' + node.endIndex;
  let f = byTree.get(key);
  if (f) return f;
  const flow = [...desc(node, ['variable_declarator', 'assignment_expression', 'argument', 'foreach_statement'])].sort((a, b) => a.startIndex - b.startIndex).map((n) => {
    if (n.type === 'variable_declarator') {
      const id = n.namedChildren.find((c) => c.type === 'identifier');
      const rest = n.text.indexOf('=');
      return id && rest >= 0 ? { kind: 'decl', name: id.text, from: n.text.slice(rest + 1) } : null;
    }
    if (n.type === 'assignment_expression') {
      const l = n.childForFieldName('left'), r = n.childForFieldName('right');
      return l && r && l.type === 'identifier' ? { kind: 'decl', name: l.text, from: r.text } : null;
    }
    if (n.type === 'foreach_statement') {
      const l = n.childForFieldName('left'), r = n.childForFieldName('right');
      return l && r ? { kind: 'decl', name: idents(l.text).pop(), from: r.text } : null;
    }
    if (/^out\b/.test(n.text)) {
      const inv = ancestor(n, ['invocation_expression', 'object_creation_expression']);
      if (!inv) return null;
      const others = argNodes(inv).filter((a) => a !== n && a.startIndex !== n.startIndex).map((a) => a.text).join(' ');
      return { kind: 'decl', name: idents(n.text).pop(), from: others + ' ' + (callee(inv).recv || '') };
    }
    return null;
  }).filter(Boolean);
  const calls = desc(node, 'invocation_expression').map((inv) => ({ inv, ...callee(inv), args: argNodes(inv).map((a) => a.text) }));
  const news = desc(node, 'object_creation_expression').map((n) => ({ type: idents((n.childForFieldName('type') || n).text).pop() || '', args: n.text }));
  const members = new Set(desc(node, 'member_access_expression').map((m) => (m.childForFieldName('name') || m).text));
  const strings = new Set(desc(node, STRING_TYPES).map(strValue));
  f = { flow, calls, news, members, strings };
  byTree.set(key, f);
  return f;
}

export function taintIn(node, rel, seeds) {
  const t = new Set(seeds);
  const { flow } = facts(node);
  for (let pass = 0; pass < 2; pass++) for (const s of flow) if (s.name && mentions(s.from, t)) t.add(s.name);
  return t;
}

/** → { marks: Set, why: Map mark → the first chain found ('A.m → B.n → call'), via: Set of 'Class.method' it went through } */
export function reach(model, rules, start, { rel, cls, tainted }, depth = 0, memo = new Map(), stack = new Set()) {
  const out = { marks: new Set(), why: new Map(), via: new Set() };
  const mark = (m, why) => { out.marks.add(m); if (!out.why.has(m)) out.why.set(m, why); };
  if (depth > rules.maxDepth) return out;
  const t = taintIn(start, rel, tainted);
  const { calls, news, members, strings } = facts(start);
  for (const c of calls) {
    const recvLast = idents(c.recv).pop() || '';
    if (rules.money.has(c.name) || (rules.moneyRe && rules.moneyRe.test(c.name))) mark('money', c.name + '()');
    if (rules.keys.has(c.name) || rules.keysRecv.has(recvLast)) mark('keys', (c.recv ? recvLast + '.' : '') + c.name + '()');
    if (rules.pathRecv.has(recvLast) && c.args.some((a) => mentions(a, t))) mark('path', recvLast + '.' + c.name + '(<url value>)');
    for (const m of resolve(model, cls, c.inv)) {
      const tp = m.names.filter((_, i) => c.args[i] !== undefined && mentions(c.args[i], t));
      if (m.variadic && c.args.slice(m.names.length - 1).some((a) => mentions(a, t))) tp.push(m.names[m.names.length - 1]);
      const key = m.key + '|' + [...new Set(tp)].sort().join(',');
      if (stack.has(key)) continue;
      let sub = memo.get(key);
      if (!sub) {
        stack.add(key);
        sub = reach(model, rules, m.body, { rel: m.rel, cls: m.cls, tainted: tp }, depth + 1, memo, stack);
        stack.delete(key);
        memo.set(key, sub);
      }
      out.via.add(m.cls + '.' + m.name);
      for (const x of sub.marks) mark(x, m.cls + '.' + m.name + ' → ' + sub.why.get(x));
      for (const x of sub.via) out.via.add(x);
    }
  }
  for (const n of news) if (rules.moneyNew && rules.moneyNew.has(n.type)) mark('money', 'new ' + n.type + '(…)');
  for (const n of news) if (rules.pathNew.has(n.type) && mentions(n.args.replace(/^new\s+[A-Za-z_.<>]+/, ''), t)) mark('path', 'new ' + n.type + '(<url value>)');
  for (const m of rules.keysMembers) if (members.has(m)) mark('keys', '.' + m);
  for (const s of rules.keysStrings) if (strings.has(s)) mark('keys', '"' + s + '"');
  return out;
}

/** a node sits inside a log / console call (its text is a message, not a dispatch) */
export function inLogCall(node, logRecv) {
  for (let p = node.parent; p; p = p.parent) {
    if (MEMBER_TYPES.has(p.type)) return false;
    if (p.type === 'invocation_expression') {
      const { recv } = callee(p);
      if (logRecv.has(idents(recv).pop() || '')) return true;
    }
  }
  return false;
}
