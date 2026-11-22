/* ==== fixb3 item 1 (n-20261113-miniapp-action-before-onload, Damir's ruling #1744 (4), packet P84) — a mini-app action before
 * `ixian:onload` is refused, and no log line of MiniAppPage.handleAction carries the action text or the exception's text.
 *
 * Mechanism (docs/fixb3-mechanisms.md § 2): miniAppActionHandler is set only in onLoad, so an action before onload threw a
 * NullReferenceException; the outer catch logged the WHOLE action and the whole exception, the response catch the whole exception
 * of the POST to the mini-app-supplied responseUrl. Fix (no switch, #1321): the FIRST statement of handleAction is the guard
 * `FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, <peek>, sendActionRejected)`; both catches log
 * `FixB3Rules.<actionFailedLine|responseFailedLine>(<command>, e)` = fixed words + a NAME from the list + the exception TYPE word.
 * BEHAVIOUR is in csh (scripts/csh/FixB3GuardTests.cs: the guard, the names, the hostile inputs, the type word). MiniAppPage is a
 * MAUI file the cloud cannot compile: the keys below are SOURCE keys over it, and each states its limit (#1735) —
 *   k1 NAMES   — the string literals of the FixB3Rules.MiniAppActionNames initializer = the values of the `public const string`
 *                members of `MiniAppCommands` (Spixi/MiniApps/MiniAppActionHandler.cs): the same set, eleven each, no duplicate;
 *                the initializer holds ONLY plain literals and the class holds ONLY plain `const string X = "…";` members (any
 *                other form fails closed); the harness compiles FixB3Rules.cs. LIMIT: a text read — a value built in another
 *                way (a concatenation, a `static readonly`) is refused, not evaluated.
 *   k2 GUARD   — handleAction's FIRST statement is exactly `if (FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, () =>
 *                { var p = JsonConvert.DeserializeObject<MiniAppActionBase>(action); return (p?.c, p?.id); }, sendActionRejected))
 *                { return; }` (comments stripped, whitespace collapsed; no directive before it); the guard is called ONCE in the
 *                file; the peek is the SAME JsonConvert call as the main path's; miniAppActionHandler is assigned ONCE, in onLoad.
 *                LIMIT: a text read — the binding of the names (a shadowing type, a csproj Compile Remove) is held by the Windows
 *                compile and the diff review.
 *   k3 LOGS    — in the comment-stripped body of handleAction there are exactly TWO `Logging.<x>(…)` calls and their argument
 *                texts are exactly `FixB3Rules.responseFailedLine(jsonResult.c, e)` (first) and
 *                `FixB3Rules.actionFailedLine(jsonResult?.c, e)` (second); none takes `action`, `e` / `ex` as a whole, `.Message`,
 *                `.ToString()`, `.StackTrace` or an interpolated string; no Console / Debug / Trace write. LIMIT: only calls written
 *                `Logging.<x>(` inside handleAction — an alias (`using L = …Logging`), a helper that logs, a log inside a callee
 *                (processAction, sendActionRejected) or reflection is not seen here (k5 holds the rest of this file whole).
 *   k4 REST    — the body of handleAction with its first statement cut out when it is an `if` (k2 holds what it says) and every
 *                `Logging.<x>(…);` statement cut out (k3 holds what they say) is the base body (14ae57f2) with the same cuts:
 *                comments removed, lines right-trimmed, empty lines dropped, everything else EXACT — SHA-256. This holds the three
 *                fixb2 confirm sites, every alert, `sendActionRejected(jsonResult.c, jsonResult.id, e.Message)` (legacy, P84) and
 *                where the two log statements sit. LIMIT: comments and blank lines inside handleAction are not held.
 *   k5 FILE    — MiniAppPage.xaml.cs, the EXACT bytes (BOM kept), with the body of handleAction replaced by one placeholder, is the
 *                base file (14ae57f2) — SHA-256. LIMIT: none beyond the text (comments outside handleAction ARE held).
 *   k6 RULES   — (#46 r1 S M-1) Spixi/Utils/FixB3Rules.cs WHOLE: the SHA-256 of its code with every comment removed (the lexer
 *                below; string literals kept) and every run of whitespace collapsed to one space = RULES_WHOLE, frozen at the
 *                batch's reviewed text; and FixB3GuardTests.cs holds ≥ GUARD_TESTS `[TestMethod]`s (O2 NIT 4: a test deleted
 *                is seen). An edit of the rules file re-bases RULES_WHOLE only after a look at its diff (the #1653 way;
 *                pins-coldstart1/a-lines.mjs holds ColdStartRules.cs whole the same way). LIMIT: comments and the amount of
 *                whitespace (also inside a literal) are not held; what the code DOES is csh's (FixB3GuardTests: the exact lines
 *                with hostile Message / InnerException chains / AggregateException / Source / HelpLink / Data).
 *   k7 HANDLER — (fixer-f3, #46 r2 S n-5) Spixi/MiniApps/MiniAppActionHandler.cs (processAction and its helpers — the callee k3
 *                cannot see): every `Logging.<x>(…)` call there takes ONLY plain string literals (each top-level argument, split at
 *                `,` and `+`, is one "…" literal — no $ / @, no identifier, no call); today TWO, both
 *                `Logging.warn("<fixed text>")`; `Logging` is named in the code nowhere else (no method group, no alias use); no
 *                Console / Debug / Trace write. LIMIT: a text read of that one file — an alias declared in another file (`global
 *                using`), a `using static` call without the `Logging.` prefix, a logging helper in another class or reflection is
 *                not seen; what Core's Logging does with a literal is Core's.
 * The C# lexer here masks comments, "…", @"…", $"…" (holes with a nested "…" are followed) and '…'; a raw string literal
 * ("""…""") is not lexed — MiniAppPage has none; one would make k4 / k5 differ from the base and fail closed.
 * Deliberate breaks (#802; builder-a of fixb3, each in a full temp copy of the tree, then deleted): see the fixb3 builder-a report
 * (k1 `"ds"` → `"dz"` in FixB3Rules.cs; k2 `!=` → `==` in the guard; k3 `jsonResult?.c` → `action` in the outer catch's line;
 * k4 the payment no's `"rejected"` → `"error"` in the `#else` arm; k5 `e = error` → `e = id` in sendActionRejected).
 * fixer-12 (#46 r1 S M-1): k6 `+ (e?.InnerException?.Message ?? "")` appended in actionFailedLine → rulesWhole red (and csh
 * failed_lines_never_carry_inner_source_helplink_or_data red); k6 one `[TestMethod]` of FixB3GuardTests.cs removed → guardTests red.
 * fixer-f3 (#46 r2 S n-5): k7 `Logging.info("x " + actionData);` as the first statement of processAction → onlyLiterals red. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // the exact bytes (no CRLF normalisation; a BOM kept)

/* The C# lexer: one pass over t. full = t with every comment and literal blanked (same length, newlines kept);
 * code = t with the comments removed; codeMask = code with its literals blanked (same length as code). */
export function lexCs(t) {
  let full = '', code = '', cmask = '';
  const n = t.length;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const lit = (s) => { full += blank(s); code += s; cmask += blank(s); };
  let i = 0;
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; full += blank(t.slice(i, e)); i = e; continue; }
    if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; full += blank(t.slice(i, e)); i = e; continue; }
    const verb = (c === '@' && d === '"') || (c === '@' && d === '$' && t[i + 2] === '"') || (c === '$' && d === '@' && t[i + 2] === '"');
    const interp = (c === '$' && d === '"') || (c === '@' && d === '$') || (c === '$' && d === '@');
    if (verb || interp || c === '"') {
      let k = i + (c === '"' ? 1 : (t[i + 1] === '"' ? 2 : 3));
      let depth = 0;
      while (k < n) {
        const x = t[k];
        if (interp && x === '{') { if (depth === 0 && t[k + 1] === '{') { k += 2; continue; } depth++; k++; continue; }
        if (interp && depth > 0) {
          if (x === '}') { depth--; k++; continue; }
          if (x === '"') { k++; while (k < n && t[k] !== '"' && t[k] !== '\n') { if (t[k] === '\\') k++; k++; } k++; continue; }
          k++; continue;
        }
        if (interp && x === '}' && t[k + 1] === '}') { k += 2; continue; }
        if (verb) { if (x === '"') { if (t[k + 1] === '"') { k += 2; continue; } k++; break; } k++; continue; }
        if (x === '\\') { k += 2; continue; }
        if (x === '"' || x === '\n') { k++; break; }
        k++;
      }
      lit(t.slice(i, Math.min(k, n))); i = Math.min(k, n); continue;
    }
    if (c === "'") {
      let k = i + 1; if (t[k] === '\\') k += 2; else k += 1;
      while (k < n && t[k] !== "'" && t[k] !== '\n' && k - i < 12) k++;
      k = Math.min(k + 1, n); lit(t.slice(i, k)); i = k; continue;
    }
    full += c; code += c; cmask += c; i++;
  }
  return { full, code, cmask };
}

/* the {…} block whose `{` is the first after `sig` (searched in mask): [open, close] indices, or null */
export function blockAfter(mask, sig, from = 0) {
  const at = mask.indexOf(sig, from); if (at < 0) return null;
  const o = mask.indexOf('{', at + sig.length); if (o < 0) return null;
  let d = 0;
  for (let k = o; k < mask.length; k++) { if (mask[k] === '{') d++; else if (mask[k] === '}' && --d === 0) return { at, open: o, close: k }; }
  return null;
}
const parenEnd = (mask, open) => { let d = 0; for (let k = open; k < mask.length; k++) { if (mask[k] === '(') d++; else if (mask[k] === ')' && --d === 0) return k; } return -1; };

export const HA_SIG = 'private async void handleAction(string action)';
const lineView = (s) => s.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.length > 0).join('\n');

/* k4's view of handleAction: { <GUARD> … } with the first `if` statement cut and every Logging statement as <LOG> */
export function restOfHandleAction(src) {
  const { code, cmask } = lexCs(src);
  const b = blockAfter(cmask, HA_SIG);
  if (!b) return { text: '', logs: -1, guardCut: false };
  let body = code.slice(b.open, b.close + 1), bm = cmask.slice(b.open, b.close + 1);
  /* the first statement */
  let s = 1; while (s < bm.length && /\s/.test(bm[s])) s++;
  let guardCut = false, gEnd = s;
  if (/^if\s*\(/.test(bm.slice(s))) {
    const po = bm.indexOf('(', s), pc = parenEnd(bm, po);
    let k = pc + 1; while (k < bm.length && /\s/.test(bm[k])) k++;
    if (pc > 0 && bm[k] === '{') { const g = blockAfter(bm, '', k); if (g) { gEnd = g.close + 1; guardCut = true; } }
    else if (pc > 0) { const semi = bm.indexOf(';', k); if (semi > 0) { gEnd = semi + 1; guardCut = true; } }
  }
  let e = gEnd; while (e < bm.length && /\s/.test(bm[e])) e++;
  body = '{<GUARD>' + body.slice(e); bm = '{<GUARD>' + bm.slice(e);
  /* every Logging statement */
  let out = '', from = 0, logs = 0;
  const re = /\bLogging\s*\.\s*\w+\s*\(/g;
  for (let m = re.exec(bm); m; m = re.exec(bm)) {
    const pc = parenEnd(bm, m.index + m[0].length - 1);
    if (pc < 0) return { text: '<BAD>', logs: -1, guardCut };
    let k = pc + 1; while (k < bm.length && /\s/.test(bm[k])) k++;
    if (bm[k] !== ';') return { text: '<BAD>', logs: -1, guardCut };
    out += body.slice(from, m.index) + '<LOG>'; from = k + 1; logs++; re.lastIndex = k + 1;
  }
  return { text: lineView(out + body.slice(from)), logs, guardCut };
}

/* k5's view: the exact file with the body of handleAction as one placeholder */
export function fileOutsideHandleAction(src) {
  const { full } = lexCs(src);
  const b = blockAfter(full, HA_SIG);
  if (!b) return '';
  return src.slice(0, b.open) + '{<HANDLEACTION>}' + src.slice(b.close + 1);
}

export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');

export default async function (h) {
  const { ok, root, existsSync, join } = h;
  const exact = (f) => (existsSync(join(root, f)) ? readBytes(join(root, f)).toString('utf8') : '');
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const MAP_F = 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs';
  const BASE_REST = 'd5dc5023260322b7d4bf17425c96dc73840a918b5edf7977df27562425ad60ae';   // k4: restOfHandleAction(base 14ae57f2)
  const BASE_FILE = '8db7b4a44bca3e6bc9f2afd2e3e54e4f181fef4c36889af4d079c5f1c78d05d2';   // k5: fileOutsideHandleAction(base 14ae57f2)
  const RULES_WHOLE = '1caddfbdcf4c4031f112a48d01eb1ed3bd6f74e5d5483a4ffc33f3386b07b8cc';   // k6: rulesView(FixB3Rules.cs) at the reviewed text (fixer-12, #46 r1 S M-1)
  const GUARD_TESTS = 9;   // k6: the [TestMethod]s of FixB3GuardTests.cs (8 of builder-a + 1 of fixer-12)

  const mapSrc = exact(MAP_F).replace(/^\uFEFF/, '');
  const mapLex = lexCs(mapSrc);
  const ha = blockAfter(mapLex.cmask, HA_SIG);
  const haCode = ha ? mapLex.code.slice(ha.open, ha.close + 1) : '';
  const haMask = ha ? mapLex.cmask.slice(ha.open, ha.close + 1) : '';

  /* ── k1 NAMES ── */
  const MAH = lexCs(exact('Spixi/MiniApps/MiniAppActionHandler.cs').replace(/^\uFEFF/, ''));
  const cls = blockAfter(MAH.cmask, 'public static class MiniAppCommands');
  const clsCode = cls ? MAH.code.slice(cls.open + 1, cls.close) : '';
  const consts = [...clsCode.matchAll(/\bpublic\s+const\s+string\s+(\w+)\s*=\s*"([^"\\]*)"\s*;/g)].map((m) => m[2]);
  const clsRest = clsCode.replace(/\bpublic\s+const\s+string\s+(\w+)\s*=\s*"([^"\\]*)"\s*;/g, '').trim();
  const R = lexCs(exact('Spixi/Utils/FixB3Rules.cs').replace(/^\uFEFF/, ''));
  const decl = blockAfter(R.cmask, 'public static readonly string[] MiniAppActionNames =');
  const initItems = decl ? R.code.slice(decl.open + 1, decl.close).split(',').map((x) => x.trim()) : [];
  if (initItems.length && initItems[initItems.length - 1] === '') initItems.pop();
  const names = initItems.map((x) => (/^"([^"\\]*)"$/.exec(x) || [])[1]);
  const setEq = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
  const csproj = exact('scripts/csh/csh.csproj');
  const k1 = {
    commandsFound: cls !== null && consts.length === 11 && clsRest === '',
    initializerFound: decl !== null && count(R.cmask, 'MiniAppActionNames') >= 2 && /^\s*\{\s*$/.test(R.cmask.slice(decl.at + 'public static readonly string[] MiniAppActionNames ='.length, decl.open + 1)),
    onlyPlainLiterals: names.length === 11 && names.every((x) => typeof x === 'string'),
    noDuplicate: new Set(names).size === names.length && new Set(consts).size === consts.length,
    sameSet: setEq(names, consts),
    harnessCompilesIt: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/FixB3Rules\.cs" \/>/.test(csproj) && existsSync(join(root, 'scripts/csh/FixB3GuardTests.cs')),
  };
  ok(F(k1).length === 0,
    '★ fixb3 item 1 k1 NAMES: FixB3Rules.MiniAppActionNames (the ONLY names a mini-app log line may carry) = the eleven `public const string` values of MiniAppCommands in Spixi/MiniApps/MiniAppActionHandler.cs — the same set, eleven each, no duplicate; the initializer holds only plain literals, the class only plain const members; the harness compiles FixB3Rules.cs beside FixB3GuardTests.cs. LIMIT: a text read (another form of a value is refused, not evaluated) — failing: ' + JSON.stringify(F(k1)) + ' ' + JSON.stringify({ names, consts, clsRest: clsRest.slice(0, 80) }));

  /* ── k2 GUARD ── */
  const GUARD = 'if (FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, () => { var p = JsonConvert.DeserializeObject<MiniAppActionBase>(action); return (p?.c, p?.id); }, sendActionRejected)) { return; }';
  const onLoad = blockAfter(mapLex.cmask, 'private void onLoad(string sdkVersion)');
  const assigns = [...mapLex.cmask.matchAll(/\bminiAppActionHandler\s*=(?!=)/g)].map((m) => m.index);
  const k2 = {
    found: haCode.length > 0 && count(mapLex.cmask, HA_SIG) === 1,
    firstStatementIsTheGuard: norm(haCode.slice(1)).startsWith(GUARD + ' '),
    calledOnce: count(mapLex.cmask, 'refuseBeforeOnload') === 1 && count(norm(haCode), GUARD) === 1,
    samePeekAsTheMainPath: count(haCode, 'JsonConvert.DeserializeObject<MiniAppActionBase>(action)') === 2,
    handlerSetOnlyInOnLoad: onLoad !== null && assigns.length === 1 && assigns[0] > onLoad.open && assigns[0] < onLoad.close,
  };
  ok(F(k2).length === 0,
    '★ fixb3 item 1 k2 GUARD: the FIRST statement of MiniAppPage.handleAction is `if (FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, () => { var p = JsonConvert.DeserializeObject<MiniAppActionBase>(action); return (p?.c, p?.id); }, sendActionRejected)) { return; }` — before onload the action is refused (one fixed line, the "not ready" reply) and returns; called once; the peek is the main path\'s JsonConvert call; miniAppActionHandler is assigned once, in onLoad. LIMIT: a text read (comments stripped, whitespace collapsed) — the binding of the names is held by the Windows compile and the diff review — failing: ' + JSON.stringify(F(k2)) + ' ' + JSON.stringify(norm(haCode.slice(1)).slice(0, 240)));

  /* ── k3 LOGS ── */
  /* the top-level pieces of an argument text, split at `,` and `+` outside any (…) */
  const topLevel = (s) => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; if (d === 0 && (ch === ',' || ch === '+')) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  const calls = [];
  const reL = /\bLogging\s*\.\s*(\w+)\s*\(/g;
  for (let m = reL.exec(haMask); m; m = reL.exec(haMask)) {
    const o = m.index + m[0].length - 1, c = parenEnd(haMask, o);
    calls.push({ kind: m[1], args: c < 0 ? '<BAD>' : norm(haCode.slice(o + 1, c)), at: m.index });
  }
  const WANT = [{ kind: 'error', args: 'FixB3Rules.responseFailedLine(jsonResult.c, e)' }, { kind: 'error', args: 'FixB3Rules.actionFailedLine(jsonResult?.c, e)' }];
  const leaks = calls.filter((x) => /\baction\b/.test(x.args) || /\.\s*(Message|StackTrace|InnerException)\b/.test(x.args) || /\.ToString\s*\(/.test(x.args) || /\$@?"|@\$"/.test(x.args)
    || topLevel(x.args).some((p) => /^\(*\s*(e|ex)\s*\)*$/.test(p)) || /"/.test(x.args));
  const k3 = {
    twoCalls: calls.length === 2,
    theTwoBuilders: calls.length === 2 && calls.every((x, i) => x.kind === WANT[i].kind && x.args === WANT[i].args),
    noLeakingArgument: leaks.length === 0,
    noOtherSink: !/\b(Console|Debug|Trace)\s*\.\s*Write/.test(haMask) && !/System\.Diagnostics/.test(haMask),
  };
  ok(F(k3).length === 0,
    '★ fixb3 item 1 k3 LOGS: in the comment-stripped body of handleAction there are exactly two Logging calls — `Logging.error(FixB3Rules.responseFailedLine(jsonResult.c, e))` (the response catch) then `Logging.error(FixB3Rules.actionFailedLine(jsonResult?.c, e))` (the outer catch): fixed words, a name from the list, the exception TYPE word; none takes `action`, `e` / `ex` whole, `.Message`, `.ToString()`, `.StackTrace`, a literal or an interpolated string; no Console / Debug / Trace write. LIMIT: only `Logging.<x>(` calls written inside handleAction (an alias, a logging helper, a callee or reflection is not seen; k5 holds the rest of the file) — failing: ' + JSON.stringify(F(k3)) + ' ' + JSON.stringify(calls.map((x) => x.kind + '(' + x.args.slice(0, 80) + ')')));

  /* ── k4 REST ── */
  const rest = restOfHandleAction(mapSrc);
  const k4 = {
    guardIsTheFirstStatement: rest.guardCut === true,
    twoLogStatements: rest.logs === 2,
    restIsTheBase: sha(rest.text) === BASE_REST,
  };
  ok(F(k4).length === 0,
    '★ fixb3 item 1 k4 REST: the body of handleAction with its first statement (the guard; k2 holds it) and its Logging statements (k3 holds them) cut out is the base body of 14ae57f2 with the same cuts — SHA-256, comments removed, lines right-trimmed, empty lines dropped, everything else exact: the three fixb2 confirm sites, every alert (the error alert with the action text stays: legacy, P84), `sendActionRejected(jsonResult.c, jsonResult.id, e.Message)` (to the same mini app: legacy, P84) and where the two log statements sit. LIMIT: comments and blank lines inside handleAction are not held — failing: ' + JSON.stringify(F(k4)) + ' got ' + sha(rest.text));

  /* ── k5 FILE ── */
  const outside = fileOutsideHandleAction(exact(MAP_F));
  const k5 = {
    found: outside.length > 0 && outside.includes('{<HANDLEACTION>}'),
    restOfTheFileIsTheBase: sha(outside) === BASE_FILE,
  };
  ok(F(k5).length === 0,
    '★ fixb3 item 1 k5 FILE: MiniAppPage.xaml.cs outside the body of handleAction is the base file of 14ae57f2 BYTE FOR BYTE (the exact bytes, BOM kept; SHA-256): onLoad (where the handler is set), sendActionRejected, the bridge verbs, every other method and comment. LIMIT: none beyond the text — failing: ' + JSON.stringify(F(k5)) + ' got ' + sha(outside));

  /* ── k6 RULES ── */
  const rulesView = lexCs(exact('Spixi/Utils/FixB3Rules.cs').replace(/^\uFEFF/, '')).code.replace(/\s+/g, ' ').trim();
  const guardTests = count(exact('scripts/csh/FixB3GuardTests.cs'), '[TestMethod]');
  const k6 = {
    found: rulesView.length > 1000 && /public static class FixB3Rules\b/.test(rulesView),
    rulesWhole: sha(rulesView) === RULES_WHOLE,
    guardTests: guardTests >= GUARD_TESTS,
  };
  /* ── k7 HANDLER (fixer-f3, #46 r2 S n-5): the callee's logs carry fixed text only ── */
  /* the top-level pieces (split at `,` and `+` outside (…), found on the MASK so a literal's own `,` / `+` never splits it) */
  const piecesOf = (mask, code) => { const out = []; let d = 0, from = 0; for (let k = 0; k < mask.length; k++) { const ch = mask[k]; if (ch === '(') d++; else if (ch === ')') d--; else if (d === 0 && (ch === ',' || ch === '+')) { out.push(code.slice(from, k).trim()); from = k + 1; } } out.push(code.slice(from).trim()); return out; };
  const mahLogs = [];
  const reM = /\bLogging\s*\.\s*(\w+)\s*\(/g;
  for (let m = reM.exec(MAH.cmask); m; m = reM.exec(MAH.cmask)) {
    const o = m.index + m[0].length - 1, c = parenEnd(MAH.cmask, o);
    mahLogs.push(c < 0 ? { kind: m[1], args: '<BAD>', pieces: [] } : { kind: m[1], args: norm(MAH.code.slice(o + 1, c)), pieces: piecesOf(MAH.cmask.slice(o + 1, c), MAH.code.slice(o + 1, c)) });
  }
  const plainLit = (p) => /^"(?:[^"\\\n]|\\.)*"$/.test(p);
  const k7 = {
    found: MAH.code.length > 1000 && /public string\? processAction\(string command, string actionData\)/.test(MAH.cmask),
    twoWarns: mahLogs.length === 2 && mahLogs.every((x) => x.kind === 'warn'),
    onlyLiterals: mahLogs.length > 0 && mahLogs.every((x) => x.args !== '<BAD>' && x.args.length > 0 && x.pieces.every(plainLit)),
    noOtherUse: count(MAH.cmask.replace(/\bLogging\s*\.\s*\w+\s*\(/g, ''), 'Logging') === 0,
    noOtherSink: !/\b(Console|Debug|Trace)\s*\.\s*Write/.test(MAH.cmask) && !/System\.Diagnostics/.test(MAH.cmask),
  };
  ok(F(k7).length === 0,
    '★ fixb3 item 1 k7 HANDLER (fixer-f3, #46 r2 S n-5): in Spixi/MiniApps/MiniAppActionHandler.cs (processAction — the callee of handleAction that k3 cannot see) every Logging call takes ONLY plain string literals — today two `Logging.warn("<fixed text>")` — Logging is named nowhere else in the code, and there is no Console / Debug / Trace write: no action text, value or exception reaches the log from there. LIMIT: a text read of that file (a `global using` alias, a `using static` call, a helper in another class, reflection are not seen) — failing: ' + JSON.stringify(F(k7)) + ' ' + JSON.stringify(mahLogs.map((x) => x.kind + '(' + x.args.slice(0, 80) + ')')));

  ok(F(k6).length === 0,
    '★ fixb3 item 1 k6 RULES (#46 r1 S M-1): Spixi/Utils/FixB3Rules.cs is held WHOLE — SHA-256 of its code with comments removed and whitespace collapsed = the reviewed text (an edit re-bases only after a look at its diff) — and FixB3GuardTests.cs holds ≥ ' + GUARD_TESTS + ' tests. LIMIT: comments and whitespace amounts are not held; behaviour is csh\'s — failing: ' + JSON.stringify(F(k6)) + ' got ' + sha(rulesView) + ' tests=' + guardTests);
}
