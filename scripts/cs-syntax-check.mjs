#!/usr/bin/env node
/* ★ #459 — a REAL syntax gate for the C# half.
 *
 * Six batches have shipped C# that was verified by reading it and by counting braces
 * against HEAD, because the cloud container has no .NET toolchain. The handoff calls
 * that "the single biggest risk in this batch", and it is right: brace counting cannot
 * see a misplaced `}`, a dangling `else`, a half-applied edit that still balances, or a
 * missing semicolon.
 *
 * tree-sitter-c-sharp parses the real grammar and reports ERROR and MISSING nodes. That
 * catches the whole malformed-edit class in about a second.
 *
 * ★★ IT ALSO CHECKS MEMBER CONTEXT NOW (#593 · #647). A member declared INSIDE a method
 * body is not C#, but tree-sitter parses it happily: the grammar reads it as a LOCAL
 * FUNCTION, so there is no ERROR node and no MISSING node. That exact shape shipped once
 * — `groupHasDeliveryReceipt` landed inside `getFriendMessageHelper`, this gate said
 * "140 file(s) parse cleanly", and Damir's build broke.
 *
 * ★ WHAT THE GATE PROMISES ABOUT A MISPLACED MEMBER. Two rules, two DIFFERENT promises.
 * An earlier docblock stated one absolute promise for both, and a reviewer disproved it
 * in a line, so each is now written with its own scope:
 *
 *   1. THE MEMBER-CONTEXT GATE — a nested declaration that carries a modifier C# does
 *      not allow on a local (`private`, `public`, `virtual`, a `static` local variable…).
 *      ★ ALWAYS reported, in any file. The modifier alone is the proof; no name has to
 *        be resolved, so nothing outside the file can change the answer.
 *
 *   2. THE SIBLING-REFERENCE BELT — a nested method with NO modifier at all, caught by
 *      the CALL that follows it into the wrong scope (CS0103).
 *      ⚠ Reported ONLY inside a type this one file can fully account for: no base list,
 *        not `partial`, no `using static` in the file, and the name is not inherited from
 *        `System.Object`. Every page in this tree derives from `SpixiContentPage`, so the
 *        belt is silent there ON PURPOSE — a bare call in such a file may bind to a member
 *        declared in another file, and reporting it would fail a build that is fine.
 *
 * ⚠ The honest complement to both: a nested no-modifier method that nothing outside calls
 * is a legal local function and compiles. There is no defect to report.
 *
 * ⚠ WHAT THIS IS NOT: a type checker. It does not know about usings, namespaces,
 * overload resolution or nullability. A file can pass here and fail to compile. Damir's
 * build stays the compile gate — this one just stops a broken edit from ever reaching it.
 *
 *   npm install --no-save tree-sitter tree-sitter-c-sharp
 *   node scripts/cs-syntax-check.mjs                 # every .cs under Spixi/
 *   node scripts/cs-syntax-check.mjs <file> [...]    # named files
 *
 * Skips LOUDLY and exits 0 when the parser is absent (the jsdom pattern) — a gate that
 * fails the run because a dev tool is missing gets deleted, and then there is no gate.
 *
 * ⚠ TWO KNOWN GRAMMAR GAPS, named rather than hidden. The parser predates C# 14, so it
 * rejects NULL-CONDITIONAL ASSIGNMENT (`a?.b = 0;`); it also rejects a C# 11 NAMED SLICE
 * PATTERN (`if (nums is [.. var rest])`). Both are legal C# that .NET 10 compiles. A file
 * that uses one is NAMED on screen with the construct, never silently ignored, and it is
 * still member-checked. A gap is accepted only when the neutralised re-parse is clean AND
 * every rewritten span lands in the syntax the construct is named after — see
 * GAP_CONSTRUCTS, which carries the broken file that got a tick before test 2 existed.
 * GRAMMAR_GAPS keeps its per-file note for the one file in this tree.
  */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let Parser, CSharp;
try {
  Parser = (await import('tree-sitter')).default;
  CSharp = (await import('tree-sitter-c-sharp')).default;
} catch {
  console.log('cs-syntax-check: SKIPPED — tree-sitter not installed.');
  console.log('  npm install --no-save tree-sitter tree-sitter-c-sharp');
  process.exit(0);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'obj' || name === 'bin' || name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.cs')) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length ? args : walk(join(root, 'Spixi'));

const parser = new Parser();
parser.setLanguage(CSharp);

/* path suffix → the construct the parser cannot read. Verified minimally:
   `class A { void M() { o?.p = 0; } }` → 2 ERROR nodes; without the `?` → clean. */
const GRAMMAR_GAPS = {
  'Spixi/Meta/SpixiTransactionInclusionCallbacks.cs': 'C# 14 null-conditional assignment (`balances.TryGet(...)?.lastUpdate = 0`)',
};

/* ═══ ★ THE GAPS, BY CONSTRUCT INSTEAD OF BY FILE (MINOR-5) ═══════════════════
 *
 * The file list above says WHICH file is excused. It does not say WHY the parser
 * failed, and it excuses the WHOLE file — which switched the member pass off for that
 * file, because the member pass can only read a tree with no ERROR node. A reviewer
 * found the second gap and the cost of that chain: a NAMED SLICE PATTERN
 * (`if (nums is [.. var rest])`, legal since C# 11) also makes this parser emit an
 * ERROR. Confirmed at source with the installed parser:
 *
 *     nums is [.. var rest]     → 3 ERROR nodes        nums is [var a, ..]  → clean
 *     nums is [_, .. var rest]  → 1 ERROR node         nums is [_, ..]      → clean
 *     nums is [.. int[] r]      → 1 ERROR node         n[1..] · n[..2]      → clean
 *
 * So the failure is `.. NAME`, not list patterns. Nothing in the tree writes it today.
 * The first agent who does would get a red run with no defect behind it, would read the
 * docblock, would add the file to GRAMMAR_GAPS — and would make that file member-blind
 * for ever, by an unnamed route.
 *
 * ★ THE FIX, and it does not widen anything. Each entry below NEUTRALISES exactly one
 * construct in the source text, character for character, so every line and column stays
 * where it was. The file is then RE-PARSED.
 *
 * ★★ TWO ACCEPTANCE TESTS, NOT ONE (MAJOR-4). The first version accepted the gap as soon
 * as the re-parse came back clean, and a reviewer broke it in one line:
 *
 *     class Slip { void M() { int a = 1; Console.WriteLine(a .. int b); } }
 *
 * That is not C#. The slice regex matched `.. int b` in the middle of an argument list,
 * the rewrite turned it into `a _`, which parses as a declaration expression, and the
 * gate printed `~ … named slice pattern` and exited 0 over a file that does not compile.
 * A tick over a broken file is worse than no gate, because it is trusted.
 *
 * So a gap is accepted only when BOTH hold:
 *   1. the re-parse is completely clean — no ERROR node and no MISSING node; AND
 *   2. EVERY rewritten span lands in the syntax the construct is named after. The slice
 *      rewrite must become a `discard` inside a `list_pattern`. The null-conditional
 *      rewrite must become a `member_access_expression` on the LEFT of an
 *      `assignment_expression`. A span that lands anywhere else is not that construct,
 *      the gap is refused, and the file is reported as a parse failure.
 * Test 2 is what separates `[.. var rest]` from `WriteLine(a .. int b)` and from
 * `nums[.. var rest]`, which are both text matches and neither of which is a slice
 * pattern. Verified against all three.
 *
 * ⚠ The re-parsed tree is used for the MEMBER PASS ONLY. The file is still reported by
 * name with the construct that tripped the parser. It is never silently ignored. */
const GAP_CONSTRUCTS = [
  {
    id: 'C# 14 null-conditional assignment (`a?.b = 0`)',
    /* `?.` immediately before `name… =` (and not `==`). A null-conditional READ parses
       fine, so only the assignment form is rewritten, and it is rewritten to the same
       expression without the `?`. */
    re: /\?\.(?=[A-Za-z_@][A-Za-z0-9_.]*\s*=[^=])/g,
    /* `?.` → ` .` — the `?` becomes a space, the member access stays. */
    rewrite: (m) => ' ' + m.slice(1),
    /* The span must now BE a member access that is assigned to. `a?.b = 0` is the only
       shape this entry is named for. */
    accept: (node) => hasAncestor(node, 'member_access_expression', true)
      && hasAncestor(node, 'assignment_expression', true),
  },
  {
    id: 'C# 11 named slice pattern (`[.. var rest]`)',
    /* `..` followed by TWO tokens — a type or `var`, then a name. The range operator
       `n[1..]`, `n[..2]`, `n[a..b]` carries at most one token and never matches. */
    re: /\.\.\s*(?:var|[A-Za-z_][A-Za-z0-9_.]*(?:<[^<>()]*>)?(?:\[\s*\])?)\s+[A-Za-z_][A-Za-z0-9_]*/g,
    /* `.. var rest` → `_` and spaces — a DISCARD pattern of the same length.
       ⚠ Not `..` and spaces: a lone `[..]` is itself rejected by this grammar, so
       blanking the name would trade one gap for another. `[_]` and `[_, _]` parse. */
    rewrite: (m) => '_' + ' '.repeat(m.length - 1),
    /* The `_` must now BE a discard inside a list pattern. In `WriteLine(a .. int b)` it
       becomes a `declaration_expression` in an `argument`; in `nums[.. var rest]` it
       becomes an `identifier` in a `bracketed_argument_list`. Both are refused. */
    accept: (node) => node.type === 'discard' && hasAncestor(node, 'list_pattern', false),
  },
];

/* Is this node, or an ancestor of it, of this type? `self` includes the node itself. */
function hasAncestor(node, type, self) {
  for (let n = self ? node : node.parent; n; n = n.parent) if (n.type === type) return true;
  return false;
}

/* Rewrites each known gap construct in place, same length, so that every later line and
   column is unchanged. Returns the rewritten text, the ids that fired, and the SPAN of
   every rewrite, which acceptance test 2 checks in the re-parsed tree. */
function neutraliseGaps(src) {
  let text = src;
  const hits = [];
  const spans = [];
  for (const g of GAP_CONSTRUCTS) {
    let fired = false;
    text = text.replace(g.re, (m, ...rest) => {
      const at = rest[rest.length - 2];              // match offset, before the whole string
      const out = g.rewrite(m);
      /* Same length, always. A rewrite that changes the length would move every later
         line and column, and the findings would point at the wrong place. */
      if (out.length !== m.length) return m;
      fired = true;
      spans.push({ start: at, end: at + m.length, gap: g });
      return out;
    });
    if (fired) hits.push(g.id);
  }
  return { text, hits, spans };
}

/* ★ ACCEPTANCE TEST 2 — every rewritten span must land in the syntax its construct is
   named after. One span in the wrong place refuses the whole gap. */
function spansAreTheNamedConstruct(rootNode, text, spans) {
  for (const s of spans) {
    /* A rewrite pads with spaces, and a span that ends in padding resolves to the node
       ABOVE the token. Probe the first character the rewrite actually wrote. */
    let at = s.start;
    while (at < s.end && text[at] === ' ') at++;
    if (at >= s.end) return false;
    const node = rootNode.descendantForIndex(at, at);
    if (!node || !s.gap.accept(node)) return false;
  }
  return true;
}

/* ═══ ★★ THE MEMBER-CONTEXT GATE (#657) ═════════════════════════════════════
 *
 * ⚠ WRITTEN BECAUSE THIS SCRIPT SAID "140 file(s) parse cleanly" ON A TREE THAT
 * DID NOT COMPILE. A helper was inserted INSIDE a method body instead of at class
 * level. tree-sitter reported ZERO ERROR nodes and ZERO MISSING nodes, because a
 * LOCAL FUNCTION is legal C# and this grammar tolerates an illegal modifier on one.
 * `dotnet build` answered with CS1513/CS1519 and Damir's build died.
 *
 * THE RULE, and it comes from the real grammar, not from expectation. A member
 * declared inside a method body, a constructor body, a property accessor, a lambda,
 * an anonymous method or a local function body parses as one of exactly two node
 * types — `local_function_statement` (a method) or `local_declaration_statement`
 * (a field, a property, an indexer, an event) — and it carries a `modifier` child
 * that C# does not permit on a local. Those two node types occur ONLY inside a
 * statement body, so the context is structural: no brace counting, no line shapes.
 *
 * ★ WHAT C# PERMITS ON A LOCAL, verified with a probe over every modifier keyword:
 *   local function  → static · extern · unsafe · async
 *   local variable  → const  (and `using` / `ref` / `scoped`, which the grammar
 *                     models as their own nodes, never as a `modifier` child)
 * Everything in MEMBER_ONLY_MODIFIERS below is a MEMBER-only modifier. `static` is
 * the one split case: legal on a local FUNCTION, illegal on a local VARIABLE.
 *
 * ★ NO FALSE POSITIVES is the design rule, because a gate that cries wolf on a
 * correct tree gets deleted. Every identifier hazard was probed against the real
 * grammar: `file`, `required`, `record` and `value` used as variable names produce
 * NO modifier child; a `static` lambda and a `static` anonymous method carry their
 * `static` on the lambda, not on the statement; attributed and `async` local
 * functions are clean. Local functions, lambdas, local consts and nested TYPES
 * inside a class body are legal and are never reported.
 *
 * ⚠ WHAT IT STILL DOES NOT CATCH, stated rather than hidden: a nested member with
 * NO modifier at all (`void Helper() { }` inside a method) is a legal local function
 * and is indistinguishable from a misplaced method. This gate reads MODIFIERS. It is
 * not a compiler. It closes the shape that broke the build, and it is proven both
 * ways — clean on the whole shipped tree, and failing on the reconstructed #647
 * defect and on a nested property, field, accessor member and lambda member. */
const MEMBER_ONLY_MODIFIERS = new Set([
  'public', 'private', 'protected', 'internal', 'file',
  'virtual', 'override', 'abstract', 'sealed', 'partial',
  'volatile', 'readonly', 'required',
]);

/* A real member-declaration node must not sit under a statement body. This is the belt:
   the grammar does not put one there today, but if a future version does, the modifier
   test above would not see it. */
const MEMBER_DECL_TYPES = new Set([
  'method_declaration', 'constructor_declaration', 'destructor_declaration',
  'property_declaration', 'indexer_declaration', 'field_declaration',
  'event_field_declaration', 'event_declaration',
  'operator_declaration', 'conversion_operator_declaration',
]);
/* Bodies that are STATEMENT context — a member may not be declared in one. */
const STATEMENT_BODIES = new Set([
  'block', 'accessor_declaration', 'lambda_expression', 'anonymous_method_expression',
  'arrow_expression_clause', 'local_function_statement', 'switch_section',
]);
/* Bodies that are TYPE context — a member belongs here. */
const TYPE_BODIES = new Set(['declaration_list', 'compilation_unit']);

function declaredName(node) {
  const named = node.childForFieldName && node.childForFieldName('name');
  if (named) return named.text;
  for (let i = 0; i < node.childCount; i++) {
    const c = node.child(i);
    if (c.type === 'variable_declaration') {
      for (let j = 0; j < c.childCount; j++) {
        const d = c.child(j);
        if (d.type === 'variable_declarator') {
          const id = d.child(0);
          if (id) return id.text;
        }
      }
    }
    if (c.type === 'identifier') return c.text;
  }
  return '<unnamed>';
}

/* The enclosing method / constructor / accessor / lambda, for the message. */
function enclosingBody(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'method_declaration') return `method ${declaredName(p)}`;
    if (p.type === 'local_function_statement') return `local function ${declaredName(p)}`;
    if (p.type === 'constructor_declaration') return `constructor ${declaredName(p)}`;
    if (p.type === 'destructor_declaration') return `destructor ${declaredName(p)}`;
    if (p.type === 'accessor_declaration') return `property accessor ${p.child(0) ? p.child(0).text : ''}`.trim();
    if (p.type === 'lambda_expression') return 'a lambda';
    if (p.type === 'anonymous_method_expression') return 'an anonymous method';
  }
  return 'a statement body';
}

/* Returns the findings for ONE parsed file. Each is a line, ready to print. */
/* Judges ONE node. Called from the single per-file walk below. */
function checkMemberContext(n, rel, found) {
  const type = n.type;
  if (type === 'local_function_statement' || type === 'local_declaration_statement') {
    const isLocalFn = type === 'local_function_statement';
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c.type !== 'modifier') continue;
      const kw = c.text;
      const illegal = MEMBER_ONLY_MODIFIERS.has(kw) || (kw === 'static' && !isLocalFn);
      if (!illegal) continue;
      found.push(`${rel}:${n.startPosition.row + 1}  \`${kw}\` ${isLocalFn ? 'method' : 'member'} `
        + `\`${declaredName(n)}\` declared inside ${enclosingBody(n)} — C# does not allow a member here.`);
      break;                                   // one finding per declaration
    }
  } else if (MEMBER_DECL_TYPES.has(type)) {
    for (let p = n.parent; p; p = p.parent) {
      if (TYPE_BODIES.has(p.type)) break;
      if (STATEMENT_BODIES.has(p.type)) {
        found.push(`${rel}:${n.startPosition.row + 1}  ${n.type} \`${declaredName(n)}\` `
          + `declared inside ${enclosingBody(n)} — C# does not allow a member here.`);
        break;
      }
    }
  }
}

/* ═══ ★★ THE NO-MODIFIER HOLE, AND HOW FAR IT CAN HONESTLY BE CLOSED ════════
 *
 * The modifier rule above reads MODIFIERS. Delete the `private` and the same misplaced
 * method parses as a LEGAL LOCAL FUNCTION. A reviewer showed the cost in the exact shape
 * the gate was built for:
 *
 *     class G1 {
 *         void Outer() { static bool groupHasDeliveryReceipt(int m) { return m > 0; } }
 *         void Other() { Console.WriteLine(groupHasDeliveryReceipt(1)); }
 *     }
 *
 * That parses clean and does NOT compile: CS0103, because a local function is visible
 * only inside the body that declares it.
 *
 * ★ THE SIGNAL, and it is not the modifier — it is the CALL. C# scopes a local function
 * to its own member, so a call from ANOTHER member of the same type cannot bind to it.
 *
 * ★★ AND THE FIRST VERSION OF THIS BELT WAS A FALSE-POSITIVE MACHINE (MAJOR-3). It asked
 * only whether the name was declared in the same FILE. A bare call binds to more than
 * that, and a reviewer reproduced both live shapes:
 *
 *     using static System.Math;      // Abs(-2.0) binds to Math.Abs
 *     class Derived : BaseThing { }  // Refresh() binds to the base, declared elsewhere
 *
 * Both compile. The gate failed them and said "will NOT compile". That is the gate's own
 * rule turned against it: a false positive on a correct tree gets the check deleted.
 *
 * ★ THE BELT IS NOW NARROWED TO WHAT ONE FILE CAN PROVE. It fires only inside a type
 * whose whole bare-call name space is visible in this file, which needs all of:
 *
 *   A. The type and every type around it have NO BASE LIST. One `:` and an inherited or
 *      interface-default member could own the name, and it is declared in another file.
 *   B. The type and every type around it are NOT `partial`. Another part of the same
 *      class may declare the member, and this pass sees one file.
 *   C. The file has NO `using static` and NO `global using`. A static import puts names
 *      into bare-call scope from outside. ⚠ Two files in this tree carry
 *      `using static IXICore.Transaction;`, so this condition is live, not theoretical.
 *      The project sets `<ImplicitUsings>disable</ImplicitUsings>` and the tree has no
 *      `global using`, so a file with neither directive imports nothing implicitly.
 *   D. The name is not a member of `System.Object` (`ToString`, `Equals`, `GetHashCode`,
 *      `GetType`, `ReferenceEquals`, `MemberwiseClone`, `Finalize`). Every type inherits
 *      those, base list or not.
 *   E. The call and the declaration are in the SAME type. A second class in the file can
 *      neither see nor explain the name.
 *
 * Then the original five, which stop the ordinary shapes:
 *   1. Only a `local_function_statement` is judged, never a local variable.
 *   2. The reference must be a BARE invocation `name(...)`; `this.name(...)`,
 *      `x.name(...)` and `nameof(name)` are ignored.
 *   3. NO member of that name may be declared in that type or the types around it — the
 *      ordinary overload case stays silent. (The name set is per TYPE, not per file, so
 *      an unrelated class in the same file can no longer silence a real finding.)
 *   4. EVERY occurrence of the name inside the CALLING member must be a bare call. A
 *      parameter, a local, a delegate field or a local function of that name explains
 *      the reference, and it stays silent.
 *   5. The call must FIT the declaration — argument count within the required and total
 *      parameter count, or any count when the last parameter is `params`.
 *
 * ★ WHAT THE BELT PROMISES NOW, exactly, and nothing more: inside a base-less,
 * non-partial type in a file with no static imports, a nested method whose name is still
 * called from another member of that type is reported. That is under-promising on
 * purpose. A missed defect costs one build. A false alarm costs the whole gate.
 *
 * ⚠ WHAT IT CANNOT SEE, named rather than hidden:
 *   · A type with a base list — which is EVERY page in this tree, because they all derive
 *     from `SpixiContentPage`. The #647 file is one of them. The MODIFIER rule still
 *     covers it; the no-modifier spelling in such a file is not reported.
 *   · A `partial` type, including one split across files.
 *   · A file that uses `using static`.
 *   · A nested no-modifier method that NOTHING outside calls. That one is a legal local
 *     function and it compiles: there is no defect to report. */

const OBJECT_MEMBERS = new Set([
  'ToString', 'Equals', 'GetHashCode', 'GetType', 'ReferenceEquals', 'MemberwiseClone', 'Finalize',
]);
const TYPE_DECLS = new Set([
  'class_declaration', 'struct_declaration', 'record_declaration',
  'record_struct_declaration', 'interface_declaration', 'enum_declaration',
]);

/* The type declaration this node sits in, or null at file level. */
function owningType(node) {
  for (let n = node.parent; n; n = n.parent) if (TYPE_DECLS.has(n.type)) return n;
  return null;
}

/* Condition A + B, for the type and every type around it. */
function typeChainIsSelfContained(typeDecl) {
  for (let t = typeDecl; t; t = owningType(t)) {
    for (let i = 0; i < t.childCount; i++) {
      const c = t.child(i);
      if (c.type === 'base_list') return false;                        // A
      if (c.type === 'modifier' && c.text === 'partial') return false; // B
    }
  }
  return true;
}

/* Condition 3's name set: the members of this type and of the types around it. */
function visibleMemberNames(typeDecl) {
  const names = new Set();
  for (let t = typeDecl; t; t = owningType(t)) {
    for (let i = 0; i < t.childCount; i++) {
      const body = t.child(i);
      if (body.type !== 'declaration_list') continue;
      for (let j = 0; j < body.childCount; j++) {
        const m = body.child(j);
        if (!m.type.endsWith('_declaration')) continue;
        names.add(declaredName(m));
        if (m.type === 'field_declaration' || m.type === 'event_field_declaration') {
          for (let k = 0; k < m.childCount; k++) {
            const vd = m.child(k);
            if (vd.type !== 'variable_declaration') continue;
            for (let q = 0; q < vd.childCount; q++) {
              const d = vd.child(q);
              if (d.type === 'variable_declarator' && d.child(0)) names.add(d.child(0).text);
            }
          }
        }
      }
    }
  }
  return names;
}

/* ★ ONE WALK PER FILE. Three passes used to traverse the tree separately; on 141 files
   that cost most of a second. Everything is gathered here in a single traversal. */
function analyseTree(rootNode, rel) {
  const errs = [];
  const misplaced = [];
  const localFns = [];
  const bareCalls = [];
  /* Condition C — one `using static` or one `global using` anywhere in the file puts
     names into bare-call scope from outside it, and turns the belt off for the file. */
  let staticImport = false;
  (function visit(n, parentType) {
    const t = n.type;
    if (t === 'ERROR' || n.isMissing) {
      errs.push(`${n.isMissing ? 'MISSING ' : 'ERROR '}${t} at line ${n.startPosition.row + 1}`);
    }
    checkMemberContext(n, rel, misplaced);
    if (t === 'local_function_statement') localFns.push(n);
    else if (t === 'invocation_expression') {
      const fn = (n.childForFieldName && n.childForFieldName('function')) || n.child(0);
      if (fn && fn.type === 'identifier') bareCalls.push({ node: n, name: fn.text });
    }
    else if (t === 'using_directive' && !staticImport) {
      for (let i = 0; i < n.childCount; i++) {
        const k = n.child(i).type;
        if (k === 'static' || k === 'global') staticImport = true;
      }
    }
    for (let i = 0; i < n.childCount; i++) visit(n.child(i), t);
  })(rootNode, '');
  for (const m of siblingReferenceFindings({ localFns, bareCalls, staticImport }, rel)) misplaced.push(m);
  return { errs, misplaced };
}

function parameterArity(fnNode) {
  let list = null;
  for (let i = 0; i < fnNode.childCount; i++) if (fnNode.child(i).type === 'parameter_list') list = fnNode.child(i);
  if (!list) return { min: 0, max: 0 };
  let min = 0, max = 0, variadic = false;
  for (let i = 0; i < list.childCount; i++) {
    const p = list.child(i);
    if (p.type !== 'parameter') continue;
    max++;
    let optional = false, isParams = false;
    for (let j = 0; j < p.childCount; j++) {
      if (p.child(j).type === 'equals_value_clause') optional = true;
      if (p.child(j).type === 'modifier' && p.child(j).text === 'params') isParams = true;
    }
    if (isParams) { variadic = true; max--; }
    else if (!optional) min++;
  }
  return { min, max: variadic ? Infinity : max };
}

function argumentCount(callNode) {
  for (let i = 0; i < callNode.childCount; i++) {
    const a = callNode.child(i);
    if (a.type !== 'argument_list') continue;
    let n = 0;
    for (let j = 0; j < a.childCount; j++) if (a.child(j).type === 'argument') n++;
    return n;
  }
  return 0;
}

/* The declaration this node belongs to at TYPE level — the ancestor whose parent is a
   type body. Two nodes with the same owner are in one scope. */
function owningMember(node) {
  let n = node;
  while (n.parent && !TYPE_BODIES.has(n.parent.type)) n = n.parent;
  return n;
}

function siblingReferenceFindings({ localFns, bareCalls, staticImport }, rel) {
  if (!localFns.length || !bareCalls.length) return [];
  if (staticImport) return [];                              // condition C

  const found = [];
  for (const fn of localFns) {
    const name = declaredName(fn);
    if (!name || name === '<unnamed>') continue;
    if (OBJECT_MEMBERS.has(name)) continue;                 // condition D
    const type = owningType(fn);
    if (!type) continue;
    if (!typeChainIsSelfContained(type)) continue;          // conditions A and B
    if (visibleMemberNames(type).has(name)) continue;       // condition 3
    /* A declaration the modifier rule already reports needs no second finding. */
    let alreadyReported = false;
    for (let i = 0; i < fn.childCount; i++) {
      const c = fn.child(i);
      if (c.type === 'modifier' && MEMBER_ONLY_MODIFIERS.has(c.text)) alreadyReported = true;
    }
    if (alreadyReported) continue;
    const home = owningMember(fn);
    const arity = parameterArity(fn);

    for (const call of bareCalls) {
      if (call.name !== name) continue;
      const callerType = owningType(call.node);
      if (!callerType || callerType.startIndex !== type.startIndex) continue;   // condition E
      const caller = owningMember(call.node);
      if (caller.startIndex === home.startIndex) continue;  // same member: in scope, legal
      const args = argumentCount(call.node);
      if (args < arity.min || args > arity.max) continue;   // condition 5
      /* condition 4 — every use of the name inside the caller must be a bare call */
      let explainable = false;
      (function scan(n) {
        if (explainable) return;
        if (n.type === 'identifier' && n.text === name) {
          const p = n.parent;
          const target = p && p.type === 'invocation_expression'
            ? ((p.childForFieldName && p.childForFieldName('function')) || p.child(0)) : null;
          const isCallTarget = !!target && target.startIndex === n.startIndex && target.endIndex === n.endIndex;
          if (!isCallTarget) explainable = true;
        }
        for (let i = 0; i < n.childCount; i++) scan(n.child(i));
      })(caller);
      if (explainable) continue;

      found.push(`${rel}:${fn.startPosition.row + 1}  local function \`${name}\` is called from `
        + `${describeMember(caller)} at line ${call.node.startPosition.row + 1}, which cannot see it — `
        + `a member was declared inside ${describeMember(home)}. C# scopes a local function to its own body.`);
      break;
    }
  }
  return found;
}

/* A short name for a type-level declaration, for the finding text. */
function describeMember(node) {
  const kind = node.type.replace('_declaration', '').replace(/_/g, ' ');
  const name = declaredName(node);
  return `${kind} \`${name}\``;
}

let bad = 0;
const skipped = [];
const misplaced = [];
for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch (e) { console.log(`? ${f} — ${e.message}`); bad++; continue; }
  if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);   // BOM: every file in this tree has one
  const rel = relative(root, f).split('\\').join('/');
  const tree = parser.parse(src);
  const first = analyseTree(tree.rootNode, rel);
  const errs = first.errs;

  /* ★★ THE MEMBER PASS ONLY SPEAKS ABOUT A CLEAN TREE, and the one file in this repo
     with ERROR nodes is why. An ERROR node DESYNCS the nesting: in
     SpixiTransactionInclusionCallbacks.cs the C# 14 null-conditional assignment breaks
     the parse mid-method, and every CLASS-LEVEL member after it becomes a child of that
     method in the tree — six findings, all false. A tree that did not parse cannot
     answer a question about where a member sits.
     ★ So a file whose errors are a KNOWN GAP CONSTRUCT is re-parsed with that construct
     blanked out (see neutraliseGaps). If the re-parse is completely clean, the member
     pass reads THAT tree, and the file keeps its member check instead of losing it. */
  let trusted = errs.length === 0 ? first : null;
  let gapHits = null;
  if (errs.length) {
    const { text, hits, spans } = neutraliseGaps(src);
    if (hits.length) {
      const retryTree = parser.parse(text);
      const retry = analyseTree(retryTree.rootNode, rel);
      /* BOTH tests, or no gap: a clean re-parse AND every rewritten span sitting in the
         syntax its construct is named after. */
      if (retry.errs.length === 0 && spansAreTheNamedConstruct(retryTree.rootNode, text, spans)) {
        gapHits = hits;
        trusted = retry;
      }
    }
  }
  if (trusted) for (const m of trusted.misplaced) misplaced.push(m);

  if (errs.length) {
    /* ⚠ The file list is a LABEL now, not a licence. A listed file is excused only when
       the neutralised re-parse proves a known construct caused every error in it; an
       unexplained error in a listed file is reported like any other. */
    const gap = Object.keys(GRAMMAR_GAPS).find((k) => rel.endsWith(k));
    if (gapHits) { skipped.push(`${rel} — ${gap ? GRAMMAR_GAPS[gap] : gapHits.join(' · ')}`); continue; }
    bad++;
    console.log(`✗ ${relative(root, f)}`);
    for (const e of errs.slice(0, 12)) console.log('    ' + e);
    if (errs.length > 12) console.log(`    … ${errs.length - 12} more`);
  }
}

for (const s of skipped) console.log(`~ ${s}`);

if (misplaced.length) {
  for (const m of misplaced) console.log(`✗ ${m}`);
}
if (bad || misplaced.length) {
  if (bad) console.error(`\ncs-syntax-check: ${bad} file(s) do not parse.`);
  if (misplaced.length) {
    console.error(`cs-syntax-check: ${misplaced.length} member(s) declared inside a non-type body`
      + ` — this PARSES but will NOT compile.`);
  }
  process.exit(1);
}
/* ⚠ NO TICK OVER NOTHING (MAJOR-4). "0 file(s) parse cleanly ✓" reads as a pass, and a
   run where every file was excused has proved nothing. The tick is printed only when at
   least one file actually parsed. The exit code stays 0, because a file that uses a named
   grammar gap is legal C# and failing it would be the false positive this gate exists to
   avoid — the line says what happened instead of implying a clean parse. */
const clean = files.length - skipped.length;
const gapNote = skipped.length ? ` · ${skipped.length} skipped for a known grammar gap` : '';
if (clean === 0 && skipped.length) {
  console.log(`cs-syntax-check: NO file parsed cleanly${gapNote} — nothing was verified.`);
} else {
  console.log(`cs-syntax-check: ${clean} file(s) parse cleanly ✓${gapNote}`);
}
