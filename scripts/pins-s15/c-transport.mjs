/* ==== S15 unit B — O-11 (#1293): C#→JS arguments are base64 again, every one, for every page.
 *
 * #340 let Utils.sendUiCommand emit a "data:…;base64,…" argument RAW inside the single-quoted JS literal it builds, behind
 * two gates (the receiver: SpixiContentPage.supportsRawDataUriArgs; the value: the isTransportSafeDataUri whitelist). No
 * exposure was found, but the baseline encoded every argument, so the fast path is removed with both gates (Damir, #1293).
 * native.js keeps its leading-"data:" passthrough: no C# argument can reach it any more (pinned here, both halves).
 *   wire     — ★ photo1a (ruling 1736, 2026-11-18): ONE BUILDER. Comment-stripped UiCommandText.cs: build appends every
 *              non-null argument as '<escape(arg)>' and nothing else (its whole body is one fixed text); escape is
 *              Convert.ToBase64String(UTF-8); Utils.escapeHtmlParameter(string) returns UiCommandText.escape(str); the fast
 *              path's names are gone from every C# file under Spixi/ (stripped).
 *   reach    — ★ photo1a (ruling 1736): UiCommandText.build is the ONLY composer of `executeUiCommand(` in Spixi/ C#
 *              (stripped): EVERY occurrence of the token `executeUiCommand` (a literal, an interpolated or verbatim string,
 *              a string.Concat / string.Format / `+` piece, a nameof) counts, in every file; the one other admitted
 *              occurrence is SpixiContentPage.p1VerbOf's READ of a pushed message, by its exact statement
 *              `const string head = "executeUiCommand(";` with `head` used only by StartsWith and .Length; a string literal
 *              that is a piece of the head (≥ 4 chars of `executeUiCommand(`, a word `UiCommand(`, `executeUi…`) is red
 *              anywhere. Utils.sendUiCommand only sends UiCommandText.build(command, arguments) in its inherited try / catch;
 *              build is declared once (UiCommandText has escape + build only, one class, no alias, no `using static`); its
 *              callers are Utils.cs (1) and SingleChatPage.xaml.cs (3); PhotoOpenRules.uiCommandText is gone.
 *              LIMITS (stated): code hidden on purpose — a head built from chars / a byte array / a resource, a raw string
 *              literal split oddly — is not caught; the C# harness (PhotoOpenTests) executes build and escape.
 *   sites    — ★ photo1a #46 r7 (2026-11-18, F2 / F3 / F4): WHERE the text goes and WHO may name the builder.
 *              (1) every WebView `sendMessage(` call in Spixi/ C# (comment-stripped; strings kept) is held PER FILE:
 *              Utils.cs exactly 1 = `contentPage.sendMessage(UiCommandText.build(command, arguments));`;
 *              SingleChatPage.xaml.cs exactly 1 = `sendMessage(text);` inside sendBuiltCommand (whose callers are exactly 2);
 *              SpixiContentPage.cs its declaration `public void sendMessage(string msg)` and its TWO fixed `__setKbInset`
 *              statements (held by exact text: the only argument is `(int)overlap`); every other file 0.
 *              EXCLUSION RULE: a `sendMessage` whose RECEIVER is a Core network type — `CoreStreamProcessor.`,
 *              `StreamProcessor.` (Spixi's subclass), `NetworkClientManager.` — is the network stream, not the WebView,
 *              and is not counted (the sites today: SPayments.cs 2 and TransferManager.cs 4, all `CoreStreamProcessor.`).
 *              Every other receiver (`contentPage.`, `page.`, `p.`, `this.`, `x?.`, a bare call) counts. A `sendMessage`
 *              token that is NOT a call (a method group, a nameof, a string) counts too: per file the token count must
 *              equal the call + declaration count.
 *              (2) the bare token `UiCommandText` (comment-stripped) per file: Utils.cs 2 (escape + build), SingleChatPage 3
 *              (the three build calls), UiCommandText.cs 1 (the class name), every other file 0 — a use in a page through an
 *              alias, a delegate, `@build`, a `using` is a new token and red.
 *              (3) UiCommandText.cs has exactly the two usings `using System;` and `using System.Text;` and no line that
 *              starts with `#`; no class / struct / record / interface / enum / namespace / `using X =` alias named
 *              UiCommandText, Convert, Encoding or StringBuilder, and no `using static` of them, exists anywhere in Spixi/.
 *              LIMITS (stated, the class #1735 calls a NIT): a builder or a head hidden on purpose — 3-character pieces,
 *              char / byte building, an interpolation hole, a `.Replace` trick, a JS-side concatenation inside ONE literal,
 *              an `Encoding` / `Convert` shadow declared by a name this rule does not list, a receiver variable named like
 *              a Core type, a .cs file under any directory named bin or obj below Spixi (skipped like the build output)
 *              — are NOT caught; the pin reads text, it does not run the page.
 *              ★ RECORDED LIMITS (photo1a #46 r8, Damir's ruling 1746, 2026-11-18 — they exist at the base c0a7617: the S15
 *              pin never held them, so they are legacy; the hardening is the Mission Control item
 *              n-20261118-s15-transport-pin-harden, audit phase). NOT held, also for ORDINARY code:
 *              F1 — a page that reaches the WebView by another call than `sendMessage(`: `_webView.EvaluateJavaScriptAsync(`,
 *              `evaluateJavascript(`, `messageQueue.Enqueue(` (SpixiContentPage.cs; `_webView` is protected, so any page can);
 *              no pin counts these sites and no test covers them (an earlier text here said "the C# harness and the S15
 *              review cover that" — that was not true and is removed).
 *              F2 — the `command` text is raw by contract (UiCommandText.build writes it verbatim): a new `sendUiCommand`
 *              overload that routes a value through `command`, or a raw value written into the command word at a call site
 *              (`Utils.sendUiCommand(this, "x,'" + v + "'")`), is not held; sendViaBuilder reads only the params body.
 *              (S15 #46 r1 MINOR-8, unchanged:)
 *   receive  — EXECUTED through src/bridge/native.js's real dispatcher: what C# now sends (each value base64'd the way
 *              escapeHtmlParameter does) arrives as the exact original string — a data: URI, a quote-and-newline value, a
 *              nickname that begins with "data:", non-ASCII — and null still arrives as ''.
 * Size cost (stated, #1293): a data: URI argument is base64'd a second time again — 4/3 of its length (a 240 KB app icon
 * travels as 320 KB) plus one atob in the shell; every other argument is unchanged (it was always encoded).
 * Deliberate breaks (S15 B): the raw ternary restored in sendUiCommand · supportsRawDataUriArgs restored in SpixiContentPage ·
 * a second executeUiCommand composer in a page · native.js's b64ToUtf8 returning its input undecoded — each fails its key.
 * ★ photo1a (ruling 1736) breaks, each alone in a copy: raw `arg` in build → everyArgEncoded · Encoding.ASCII in escape →
 * encoder · escapeHtmlParameter with its own Convert.ToBase64String → encoder · `+ command` after build in sendUiCommand →
 * sendViaBuilder · sendUiCommand composing its own text again → sendViaBuilder + oneComposer · an interpolated
 * $"executeUiCommand(…" in PhotoOpenRules → oneComposer · string.Concat("executeUiCommand", "(", …) in a page → oneComposer ·
 * a second build overload → oneBuilderName · a 4th build caller in another page → oneBuilderName. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const U = rd('Spixi/Utils/Utils.cs');
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const send = body(U, 'public static void sendUiCommand(SpixiContentPage contentPage, string command, params string[] arguments)');
  /* ★ photo1a (ruling 1736, 2026-11-18): the ONE builder */
  const UCT_FILE = 'Spixi/Utils/UiCommandText.cs';
  const UCT = rd(UCT_FILE);
  const build = body(UCT, 'public static string build(string command, params string?[] arguments)');
  const esc = body(UCT, 'public static string escape(string str)');
  const flat = (s) => s.replace(/\s+/g, ' ').trim();
  const cnt = (s, re) => (s.match(re) || []).length;

  const csFiles = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = rel + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'obj' && e.name !== 'bin') walk(p); continue; }
      if (e.name.endsWith('.cs')) csFiles.push(p);
    }
  };
  walk('Spixi');
  const HEAD = 'executeUiCommand(';
  const READ_STMT = 'const string head = "executeUiCommand(";';   // SpixiContentPage.p1VerbOf: a READ of a pushed message
  const fastPathNames = [];
  const composers = [];      // every file:count with an executeUiCommand token outside the two admitted places
  const fragments = [];      // a literal that is a piece of the head
  const declBuild = [];      // files that declare a class UiCommandText, alias it or import it static
  const buildCalls = {};     // file → count of `UiCommandText.build(`
  const oldName = [];        // files that still name uiCommandText
  let readerOk = false, builderTokens = -1;
  for (const f of csFiles) {
    const t = rd(f);
    if (/\b(?:supportsRawDataUriArgs|isTransportSafeDataUri|raw_data_uri_ok)\b/.test(t)) fastPathNames.push(f);
    const n = cnt(t, /executeUiCommand/g);
    if (f === UCT_FILE) {
      builderTokens = n;
      if (!(n === 1 && cnt(build, /executeUiCommand/g) === 1 && cnt(build, /"executeUiCommand\("/g) === 1)) composers.push(f + ':' + n);
    } else if (f === 'Spixi/Utils/SpixiContentPage.cs') {
      /* admitted: exactly ONE token, on the exact read statement, inside p1VerbOf, `head` used only to compare and skip */
      const lines = t.split('\n').filter((l) => l.includes('executeUiCommand'));
      const verb = body(t, 'internal static string p1VerbOf(string msg)');
      readerOk = n === 1 && lines.length === 1 && lines[0].trim() === READ_STMT && verb.includes(READ_STMT)
        && cnt(verb, /\bhead\b/g) === 3 && verb.includes('msg.StartsWith(head, StringComparison.Ordinal)') && verb.includes('i = head.Length;')
        && !/\bhead\s*\+|\+\s*head\b|\{\s*head\s*\}|Concat\([^)]*\bhead\b|Format\([^)]*\bhead\b/.test(verb);
      if (!readerOk) composers.push(f + ':' + n);
    } else if (n > 0) {
      composers.push(f + ':' + n);
    }
    for (const x of t.matchAll(/(?:\$@|@\$|\$|@)?"((?:[^"\\\n]|\\.)*)"/g)) {
      const L = x[1];
      if (L.length >= 4 && !L.includes('executeUiCommand') && (HEAD.includes(L) || /\bUiCommand\s*\(/.test(L) || /executeUi/i.test(L))) fragments.push(f + ': "' + L + '"');
    }
    if (/\bclass\s+UiCommandText\b/.test(t) && f !== UCT_FILE) declBuild.push(f + ' (class)');
    if (/using\s+static\s+[\w.]*UiCommandText\b/.test(t)) declBuild.push(f + ' (using static)');
    if (/using\s+\w+\s*=\s*[\w.]*UiCommandText\s*;/.test(t)) declBuild.push(f + ' (alias)');
    const bc = cnt(t, /\bUiCommandText\s*\.\s*build\s*\(/g);
    if (bc) buildCalls[f] = bc;
    if (/uiCommandText/.test(t)) oldName.push(f);
  }
  const w = {
    found: send.length > 0 && build.length > 0 && esc.length > 0 && csFiles.length > 50,
    /* build's whole body is ONE fixed text: 4 appends, a non-null arg only as '<escape(arg)>', a null as ,null, no raw path */
    everyArgEncoded: cnt(build, /sb\.Append\(/g) === 4
      && /if \(arg != null\)\s*\{\s*sb\.Append\(","\);\s*sb\.Append\("'" \+ escape\(arg\) \+ "'"\);\s*\}\s*else\s*\{\s*sb\.Append\(",null"\);\s*\}/.test(build)
      && !/\?\s*arg\s*:/.test(build)
      && flat(build) === flat(`{ StringBuilder sb = new StringBuilder("executeUiCommand(" + command); foreach (string? arg in arguments) { if (arg != null) { sb.Append(","); sb.Append("'" + escape(arg) + "'"); } else { sb.Append(",null"); } } sb.Append(");"); return sb.ToString(); }`),
    /* the one escaping, and the transport's escapeHtmlParameter(string) returns it */
    encoder: flat(esc) === '{ return Convert.ToBase64String(Encoding.UTF8.GetBytes(str)); }'
      && /public static string escapeHtmlParameter\(string str\)\s*\{\s*return UiCommandText\.escape\(str\);\s*\}/.test(U),
    fastPathGone: fastPathNames.length === 0,
    oneComposer: composers.length === 0 && builderTokens === 1 && readerOk && fragments.length === 0,
    /* the transport sends the builder's text and composes nothing: the inherited try / catch, one statement */
    sendViaBuilder: flat(send) === flat(`{ try { contentPage.sendMessage(UiCommandText.build(command, arguments)); } catch (Exception e) { Logging.error("Exception occured in sendUiCommand " + e); } }`),
    /* build is declared once (UiCommandText = escape + build, nothing else); callers: Utils.cs 1, SingleChatPage 3 */
    oneBuilderName: cnt(UCT, /\bbuild\s*\(/g) === 1 && cnt(UCT, /\bstatic\b/g) === 3 && cnt(UCT, /\bclass\b/g) === 1
      && /public static class UiCommandText\b/.test(UCT) && !/\bpartial\b/.test(UCT) && declBuild.length === 0
      && JSON.stringify(Object.keys(buildCalls).sort()) === JSON.stringify(['Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Utils/Utils.cs'])
      && buildCalls['Spixi/Utils/Utils.cs'] === 1 && buildCalls['Spixi/Pages/Chat/SingleChatPage.xaml.cs'] === 3
      && oldName.length === 0,
  };
  /* ★ photo1a #46 r7 (2026-11-18) F2 / F3 / F4 — see the `sites` header */
  const NET_RX = /^(?:CoreStreamProcessor|StreamProcessor|NetworkClientManager)$/;
  const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', CP_F = 'Spixi/Utils/SpixiContentPage.cs', UTILS_F = 'Spixi/Utils/Utils.cs';
  const siteList = {};      // file → the WebView sendMessage statements (receiver + call + args, up to the `;`)
  const siteDecl = {};      // file → declarations `void sendMessage(`
  const siteTokens = {};    // file → every `sendMessage` token
  const netSites = {};      // file → Core network receivers (not counted)
  const uctTokens = {};     // file → count of the bare token UiCommandText
  const typeDecls = [];     // a type / namespace / alias named like the builder's names
  const usingStatic = [];
  const NAMES = '(?:UiCommandText|Convert|Encoding|StringBuilder)';
  const typeRx = new RegExp('\\b(?:class|struct|record|interface|enum|namespace)\\s+(?:[\\w.]*\\.)?' + NAMES + '\\b');
  const aliasRx = new RegExp('\\busing\\s+' + NAMES + '\\s*=');
  const aliasToRx = new RegExp('\\busing\\s+\\w+\\s*=\\s*(?:global::)?[\\w.]*\\b' + NAMES + '\\s*;');
  const staticRx = new RegExp('\\busing\\s+static\\s+[\\w.]*\\b' + NAMES + '\\b');
  for (const f of csFiles) {
    const t = rd(f);
    siteTokens[f] = cnt(t, /\bsendMessage\b/g);
    siteDecl[f] = cnt(t, /\bvoid\s+sendMessage\s*\(/g);
    for (const m of t.matchAll(/\bsendMessage\b/g)) {
      const pre = t.slice(0, m.index);
      if (/\bvoid\s+$/.test(pre)) continue;                                        // the declaration
      const rcv = /([A-Za-z_]\w*)\s*\??\s*\.\s*$/.exec(pre);
      if (rcv && NET_RX.test(rcv[1])) { (netSites[f] = netSites[f] || []).push(rcv[1]); continue; }
      const start = rcv ? pre.length - rcv[0].length : pre.length;
      const semi = t.indexOf(';', m.index);
      (siteList[f] = siteList[f] || []).push(flat(t.slice(start, semi < 0 ? m.index + 80 : semi + 1)));
    }
    const u = cnt(t, /\bUiCommandText\b/g);
    if (u) uctTokens[f] = u;
    if (typeRx.test(t) && !(f === UCT_FILE && /\bclass\s+UiCommandText\b/.test(t) && !new RegExp('\\b(?:struct|record|interface|enum|namespace)\\s+(?:[\\w.]*\\.)?' + NAMES + '\\b').test(t) && cnt(t, new RegExp('\\bclass\\s+' + NAMES + '\\b', 'g')) === 1)) typeDecls.push(f);
    if (aliasRx.test(t) || aliasToRx.test(t)) typeDecls.push(f + ' (alias)');
    if (staticRx.test(t)) usingStatic.push(f);
  }
  const sbc = body(rd(SCP_F), 'private void sendBuiltCommand(string text)');
  const scpT = rd(SCP_F);
  const KB1 = 'sendMessage("window.__setKbInset && window.__setKbInset(" + (int)overlap + ")");';
  const KB2 = 'sendMessage("window.__setKbInset && window.__setKbInset(0)");';
  const webviewFiles = Object.keys(siteList).sort();
  const uctUsings = (UCT.match(/^\s*using\s[^;]*;/gm) || []).map(flat);
  const sites = {
    found: csFiles.length > 50 && Object.keys(netSites).length > 0 && siteList[UTILS_F] !== undefined,
    /* the files that call a WebView sendMessage are exactly these three, with exactly these statements */
    files: JSON.stringify(webviewFiles) === JSON.stringify([SCP_F, CP_F, UTILS_F].sort()),
    utils: JSON.stringify(siteList[UTILS_F]) === JSON.stringify(['contentPage.sendMessage(UiCommandText.build(command, arguments));']) && !siteDecl[UTILS_F] && siteTokens[UTILS_F] === 1,
    page: JSON.stringify(siteList[SCP_F]) === JSON.stringify(['sendMessage(text);']) && !siteDecl[SCP_F] && siteTokens[SCP_F] === 1
      && sbc.includes('sendMessage(text);') && cnt(sbc, /\bsendMessage\b/g) === 1,
    builtCallers: cnt(scpT, /\bsendBuiltCommand\s*\(/g) === 3 && cnt(scpT, /\bvoid\s+sendBuiltCommand\s*\(/g) === 1 && cnt(scpT, /\bsendBuiltCommand\b/g) === 3
      && Object.keys(Object.fromEntries(csFiles.filter((f) => f !== SCP_F && /\bsendBuiltCommand\b/.test(rd(f))).map((f) => [f, 1]))).length === 0,
    contentPage: JSON.stringify(siteList[CP_F]) === JSON.stringify([KB1, KB2]) && siteDecl[CP_F] === 1 && siteTokens[CP_F] === 3
      && /public void sendMessage\(string msg\)/.test(rd(CP_F)),
    /* no `sendMessage` token anywhere that is neither a counted call, a declaration, nor a Core-network call (method group, nameof, string) */
    noOtherToken: csFiles.every((f) => siteTokens[f] === (siteList[f] || []).length + (siteDecl[f] || 0) + (netSites[f] || []).length),
    netOnlyCore: JSON.stringify(Object.entries(netSites).map(([f, a]) => [f, [...new Set(a)].join()]).sort()) === JSON.stringify([['Spixi/Data/TransferManager.cs', 'CoreStreamProcessor'], ['Spixi/Utils/SPayments.cs', 'CoreStreamProcessor']]),
    uctTokens: JSON.stringify(Object.entries(uctTokens).sort()) === JSON.stringify([[SCP_F, 3], [UCT_FILE, 1], [UTILS_F, 2]]),
    uctUsings: JSON.stringify(uctUsings) === JSON.stringify(['using System;', 'using System.Text;']) && !/^\s*#/m.test(UCT),
    noShadow: typeDecls.length === 0 && usingStatic.length === 0,
  };
  ok(Object.values(sites).every(Boolean),
    '★ photo1a #46 r7 (F2–F4) O-11 SITES: the WebView `sendMessage(` calls of Spixi/ C# are exactly Utils.sendUiCommand\'s one (`contentPage.sendMessage(UiCommandText.build(command, arguments));`), SingleChatPage.sendBuiltCommand\'s one (`sendMessage(text);`; its callers: 2) and SpixiContentPage\'s two fixed `__setKbInset` statements — no other file, no other receiver (Core network receivers CoreStreamProcessor / StreamProcessor / NetworkClientManager are not the WebView and not counted), no method-group / string use of the name; the bare token UiCommandText stands only in Utils.cs (2), SingleChatPage (3) and UiCommandText.cs (1); UiCommandText.cs has exactly `using System;` + `using System.Text;` and no `#` line; no type, namespace or alias named UiCommandText / Convert / Encoding / StringBuilder and no `using static` of them in Spixi/ — LIMITS stated in the header — ' + JSON.stringify(sites)
      + ' webview sites: ' + JSON.stringify(siteList) + ' net: ' + JSON.stringify(netSites) + ' tokens: ' + JSON.stringify(uctTokens)
      + (typeDecls.length ? ' decls: ' + typeDecls.join(', ') : '') + (usingStatic.length ? ' using static: ' + usingStatic.join(', ') : ''));

  ok(Object.values(w).every(Boolean),
    '★★ S15 O-11 (#1293) · ★ photo1a ONE BUILDER (ruling 1736, 2026-11-18): UiCommandText.build base64-encodes EVERY non-null argument (UiCommandText.escape = Convert.ToBase64String(UTF-8); Utils.escapeHtmlParameter returns it) — the #340 raw data-URI fast path and both its gates (supportsRawDataUriArgs, isTransportSafeDataUri) are gone from every C# file, UiCommandText.build is the only composer of executeUiCommand( in Spixi/ (every token counted; p1VerbOf\'s read admitted by its exact statement), Utils.sendUiCommand only sends build\'s text, build is declared once and called from Utils.cs (1) and SingleChatPage (3) only — ' + JSON.stringify(w)
      + (fastPathNames.length ? ' still named in: ' + fastPathNames.join(', ') : '')
      + (composers.length ? ' composers: ' + composers.join(', ') : '')
      + (fragments.length ? ' head pieces: ' + fragments.join(', ') : '')
      + (declBuild.length ? ' builder decls: ' + declBuild.join(', ') : '')
      + (oldName.length ? ' old name in: ' + oldName.join(', ') : '')
      + ' build calls: ' + JSON.stringify(buildCalls));

  /* executed: what C# now puts on the wire, and what the real dispatcher hands the shell */
  const enc = (s) => Buffer.from(s, 'utf8').toString('base64');   // = Convert.ToBase64String(Encoding.UTF8.GetBytes(s))
  const icon = 'data:image/png;base64,' + Buffer.alloc(3000, 7).toString('base64');
  const SAMPLES = [icon, "x');alert(1);//\n\\`${y}", 'data:;base64,x', 'data:text/html,<b>hi</b>', 'Ćevapi 😀 – ﬁ', ''];
  const wire = SAMPLES.map(enc);
  /* ★ S15 #46 r1 MINOR-8: STATED FACTS of base64 (Node's encoder, not Spixi code) — labelled as such in the key text. */
  const r = {
    neverDataPrefix: wire.every((v) => !v.startsWith('data:')),
    literalSafe: wire.every((v) => /^[A-Za-z0-9+/=]*$/.test(v)),
  };
  const nat = await import(new URL('file://' + join(root, 'src/bridge/native.js')).href + '?s15=' + Date.now());
  const win = {};
  nat.installExecuteUiCommand(win);
  const got = [];
  const fn = (...a) => { got.push(a); };
  const errs = [];
  const ce = console.error; console.error = (...a) => { errs.push(a.join(' ')); };
  try { win.executeUiCommand(fn, ...wire, null); } finally { console.error = ce; }
  r.roundTrip = got.length === 1 && got[0].length === SAMPLES.length + 1 && SAMPLES.every((s, i) => got[0][i] === s) && got[0][SAMPLES.length] === '';
  r.noErr = errs.length === 0;
  r.sizeCost = Math.abs(enc(icon).length / icon.length - 4 / 3) < 0.01;
  ok(Object.values(r).every(Boolean),
    '★ S15 O-11 (#1293): EXECUTED through src/bridge/native.js\'s real dispatcher — what C# now sends (each value base64\'d as escapeHtmlParameter does: a data: URI, a quote/newline/backtick/${ value, a nickname that starts with "data:", non-ASCII) reaches the shell as the exact original string, null → \'\', no error (roundTrip · noErr). STATED FACTS of the base64 alphabet, not Spixi code (Node\'s encoder stands in for Convert.ToBase64String): such a value is literal-safe and never starts with "data:" (so native.js\'s passthrough is unreachable from C#), and costs 4/3 on a data: URI — ' + JSON.stringify(r));
}
