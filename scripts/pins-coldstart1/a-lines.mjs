/* ==== coldstart1 (#1680, #1596) · A — the cold-start marks: developer-only LOG LINES and nothing else.
 *
 * The contract (docs/contract-coldstart1.md § 3, § 3a, § 3b): 33 marks `[P1] cold <token> t=<ms>` (+ the anchor line
 * `[P1] cold logger t=<ms> req=<ms>`), written once each, only in an Android build with SPIXI_DEV_COEXIST. The pure rule
 * (ColdStartRules) runs in the C# harness (scripts/csh/ColdStartTests.cs). ⚠ The cloud cannot compile the Android arm, so
 * these are SOURCE pins on purpose (L189: pin whole bodies, count every mention). Comments are masked first (comments →
 * spaces, newlines kept, strings kept — the a-extra mask); the brace walk uses a second mask that also blanks string and
 * char contents, so a `"{"` cannot move a body's end.
 *   1 DEV ONLY    — ColdStartRules.cs is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif`; every code line of the bodies of
 *                   P1Perf.cold / coldFlush / coldDraw (and the draw listener class) sits inside `#if` regions whose
 *                   terms are ONLY `&&`-joined plain symbols and include SPIXI_DEV_COEXIST and ANDROID (an `#else`,
 *                   `#elif`, `||` or `!` in the stack fails); the three methods exist on every target; ColdMark is declared
 *                   outside every `#if`; the OnPageStarted override is exactly the contract's text, inside
 *                   `#if SPIXI_DEV_COEXIST` and nothing else; every token literal appears ONLY in ColdStartRules.cs, once
 *                   (the words `"page"`, `"draw"` … that the base tree already holds elsewhere are frozen per file and must
 *                   not grow: BASE_LITERALS); no .cs file #defines or #undefs the symbol;
 *   2 CALL SITES  — every mark is called exactly once in the tree, at its file and method, as ONE statement on its own line
 *                   (`P1Perf.cold(ColdMark.X);` or `SPIXI.P1Perf.cold(SPIXI.ColdMark.X);`), at its brace depth, with the
 *                   neighbouring code lines of § 3a (comments and blank lines do not count); `logger` has no call site
 *                   (the flush writes it), `draw` is called once, inside the listener's OnDraw; coldFlush() is called once
 *                   (App()), coldDraw( once (MainActivity.OnCreate); the enum has the 33 members in the order of § 3;
 *   3 NO MOVE     — for each touched body (MainApplication.OnCreate, MauiProgram.CreateMauiApp, App(), MainActivity.OnCreate
 *                   / OnResume, CreateNativeControl, LoadHtml, OnPageFinished) and for the class SpixiWebViewClient: remove
 *                   EXACTLY the batch's lines — each line whose code is exactly one mark statement of that body (with its
 *                   `// ★ coldstart1 …` comment, indentation and line end; nothing else on the line), the flush line, the
 *                   draw line, and the whole `#if SPIXI_DEV_COEXIST … #endif` block that holds OnPageStarted (with the one
 *                   empty line that sets it off from the next member, when empty lines stand on both sides of it) — and the SHA-256
 *                   of the rest (the brace-matched body, comments and whitespace as they are, CRLF → LF) equals the SHA-256
 *                   of the same body on the base cdc4f717 (BASE_BODIES). So only lines were inserted: nothing moved,
 *                   changed, was wrapped or reordered (the riskiest file is App.xaml.cs);
 *   4 NOTHING NEW — the new code (ColdStartRules.cs, the bodies of cold / coldFlush / coldDraw, the draw listener class, the
 *                   override) holds no Thread, Task, async, await, Wait, Sleep, Delay, lock, Monitor, Timer, Preferences,
 *                   SecureStorage, File, `ixian:`, sendUiCommand, Navigation, PostDelayed, PostFrameCallback, Invalidate and
 *                   no `Logging.` (only `line(`); the rules file also no MAUI / Android / Core / Regex / clock; the override
 *                   never reads `url`; the draw code has exactly one `Post(`, one AddOnDrawListener and one RemoveOnDrawListener
 *                   and never `return false`;
 *   5 HARNESS     — csh.csproj compiles ColdStartRules.cs (with SPIXI_DEV_COEXIST) and ColdStartTests holds its tests.
 * The base constants are computed ONCE from the untouched tree (scratch/base-constants.mjs: `analyse()` on the base, the
 * rest-hash of a body with nothing removed IS its raw hash). Deliberate breaks: the coldstart1 builder-pins report.
 * ROUND 2 (#46 r2 reader): (B2-2) row 3 also holds `plainLineEnds` — the RAW bytes of the seven batch files (node's own fs, no
 * CRLF helper) hold none of U+0085, U+2028, U+2029, VT, FF or a lone CR (Roslyn ends a `//` comment at them, so a mark line's tail
 * could hide code), and a removable mark / flush / draw line carries ONLY the exact tail `   // ★ coldstart1 (#1680)` (MARK_TAIL);
 * (B2-1) row 6 freezes Spixi/Utils/P1Perf.cs WHOLE by SHA-256 (`p1PerfWhole`: raw text, BOM stripped, CRLF → LF, as RULES_WHOLE) —
 * a second attribute above a member (a second `Conditional`, `ModuleInitializer`) is caught as a CLASS — plus `Conditional(` = 3 in
 * P1Perf.cs and = 3 tree-wide and no `ModuleInitializer` tree-wide; (B2-3) the coldDrawn field sits inside SPIXI_DEV_COEXIST.
 * ⚠ A later edit of P1Perf.cs (any batch) re-bases P1_WHOLE and the member hashes after a look at the diff (#1596). */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);

/* comments → spaces (newlines kept); strings and char literals kept (strings = false) or their CONTENTS blanked too (strings = true) */
export const mask = (t, strings = false, fill = ' ') => {
  const out = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const str = (i, verbatim, interp) => {
    const open = i;
    i++;
    const done = (e) => { if (strings) { for (let k = open + 1; k < Math.max(open + 1, e - 1); k++) if (out[k] !== '\n') out[k] = fill; } return e; };
    while (i < n) {
      const c = t[i];
      if (verbatim) {
        if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return done(i + 1); }
      } else {
        if (c === '\\') { i += 2; continue; }
        if (c === '"') return done(i + 1);
        if (c === '\n') return done(i);
      }
      if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
      i++;
    }
    return done(i);
  };
  const code = (i, hole) => {
    let depth = 0;
    while (i < n) {
      const c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
      if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
      if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); if (m && strings) blank(i + 1, i + m[0].length - 1); i += m ? m[0].length : 1; continue; }
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
/* the brace-matched body after `sig` (on the string-blanked mask): { at, start, end } — `at` = the signature's index */
const span = (t, sig, from = 0) => {
  const at = t.indexOf(sig, from); if (at < 0) return { at: -1, start: -1, end: -1 };
  const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, start: -1, end: -1 };
  let d = 0;
  for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, start: o, end: k + 1 }; }
  return { at, start: o, end: -1 };
};
/* the open preprocessor regions at a position (the s14 a1-backup-back helper): a stack of #if conditions */
const regionsAt = (src, pos) => {
  const st = [];
  for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
    if (m[1] === 'if') st.push(m[2].trim());
    else if (m[1] === 'endif') st.pop();
    else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
  }
  return st;
};
/* the set of symbols that MUST all be true at a position, or null when any region is not a plain `A && B` conjunction */
const termsAt = (src, pos) => {
  const st = regionsAt(src, pos);
  if (!st.every((c) => /^[A-Z_][A-Z0-9_]*(?:\s*&&\s*[A-Z_][A-Z0-9_]*)*$/.test(c))) return null;
  return new Set(st.flatMap((c) => c.split('&&').map((x) => x.trim())));
};
const hasTerms = (src, pos, need) => { const t = termsAt(src, pos); return t !== null && need.every((x) => t.has(x)); };

export const RULES_F = 'Spixi/Utils/ColdStartRules.cs', P1_F = 'Spixi/Utils/P1Perf.cs', APPC_F = 'Spixi/Platforms/Android/MainApplication.cs',
  MP_F = 'Spixi/MauiProgram.cs', APP_F = 'Spixi/App.xaml.cs', ACT_F = 'Spixi/Platforms/Android/MainActivity.cs', WV_F = 'Spixi/Platforms/Android/WebViewRenderer.cs';

/* the 33 marks in the order of § 3 (enum names) and their tokens */
export const ENUM = ['AppIn', 'BaseIn', 'MauiIn', 'MauiBuild', 'CtorIn', 'ConfigIn', 'Logger', 'FlagsIn', 'LangIn', 'FilesIn', 'ThemeIn', 'NodeIn', 'WalletIn', 'WalletOut',
  'HomeIn', 'HomeOut', 'CtorOut', 'BaseOut', 'AppOut', 'ActIn', 'ActBase', 'ActHold', 'ActOut', 'ResumeIn', 'ResumeOut', 'WvIn', 'WvNew', 'WvOut', 'NavIn', 'NavOut', 'Page', 'PageEnd', 'Draw'];
export const TOKENS = ('app_in base_in maui_in maui_build ctor_in config_in logger flags_in lang_in files_in theme_in node_in wallet_in wallet_out home_in home_out ctor_out base_out app_out ' +
  'act_in act_base act_hold act_out resume_in resume_out wv_in wv_new wv_out nav_in nav_out page page_end draw').split(' ');

/* the nine bodies whose rest must hash to the base: key → [file, signature, the marks that may be removed from it, extras] */
export const BODIES = {
  maOnCreate: [APPC_F, 'public override void OnCreate()', ['AppIn', 'BaseIn', 'BaseOut', 'AppOut'], {}],
  mpCreate: [MP_F, 'public static MauiApp CreateMauiApp()', ['MauiIn', 'MauiBuild'], {}],
  appCtor: [APP_F, 'public App()', ['CtorIn', 'ConfigIn', 'FlagsIn', 'LangIn', 'FilesIn', 'ThemeIn', 'NodeIn', 'WalletIn', 'WalletOut', 'HomeIn', 'HomeOut', 'CtorOut'], { flush: true }],
  actOnCreate: [ACT_F, 'protected override void OnCreate(Bundle? bundle)', ['ActIn', 'ActBase', 'ActHold', 'ActOut'], { draw: true }],
  actOnResume: [ACT_F, 'protected override void OnResume()', ['ResumeIn', 'ResumeOut'], {}],
  wvCreate: [WV_F, 'protected override SpixiWebview CreateNativeControl()', ['WvIn', 'WvNew', 'WvOut'], {}],
  wvLoad: [WV_F, 'public void LoadHtml(string html, string baseUrl)', ['NavIn', 'NavOut'], {}],
  wvFinished: [WV_F, 'public override void OnPageFinished(global::Android.Webkit.WebView view, string url)', ['PageEnd'], {}],
  wvClient: [WV_F, 'public class SpixiWebViewClient : WebViewClient', ['PageEnd'], { block: true }],
};
const SIG_PAGE_STARTED = 'public override void OnPageStarted(global::Android.Webkit.WebView? view, string? url, global::Android.Graphics.Bitmap? favicon)';

/* ── the frozen base (cdc4f717): SHA-256 of each body's raw text (BOM stripped, CRLF → LF, from `{` to the matching `}`) ── */
const BASE_BODIES = {
  maOnCreate: '2c46ef2f5b2443855f8b5fd2fd9a2073be68b67a5f62a925c399d654e1555e37',
  mpCreate: 'b222d4761253cb279469a32281ad2b51d10fb5b43d89efa65633008dbd695ca4',
  appCtor: '63701501de5ec2003c1ab3b87db26f9be943b4ebcf79f6b5bd3b15f1273723af',
  actOnCreate: '92c0f7a92747b22542945288898b3b8ae4eed09bb8e8f8ffd8cb41a11f1cd6f9',
  actOnResume: '0711f68ba7e720bf4b12c10be3a2da89675044e16bb576dffb9e810cd7f495ac',
  wvCreate: 'd20a29ecf194dc3ec3dce6bbc48e0aecb0e61d817d0ec16d6090d3a4f11c53b8',
  wvLoad: '30beb4d966fffe53aebbbd22c9afea3d39b2433c1bc86650445c68f81178fe94',
  wvFinished: '3ca7cff0ddaa36bd9fe2032cc146c39f208fcfad8af34f61a9c0bcb320e6daac',
  wvClient: 'c922b26279592b5f883977bfc716b4bd00f45f52063691d7ab242f79074ae59e',   // re-based by imgurl: the media branch + mediaResponse (pure insertions in this class, `git diff` read; the renderer-death line left by #1972); was 5da68f59dc6c…
};
/* the token literals the BASE tree already holds outside ColdStartRules.cs: `"literal"@file×n`, sorted (computed once, scratch/base-constants.mjs) */
const BASE_LITERALS = '"page"@Spixi/Utils/P1Perf.cs×5';

/* ── round 1 (P-1 … P-5, F1): frozen texts. Every hash is over the raw text, BOM stripped, CRLF → LF (the `raw()` of the pin). ──
 * BLOCK_PAGE_STARTED = the whole `#if SPIXI_DEV_COEXIST … #endif` block around OnPageStarted (comment lines, the override, nothing else);
 * P1_MEMBERS = each batch member of P1Perf.cs whole, from its doc comment to its closing brace (attribute line included);
 * COLDDRAWN_FIELD = the `#if ANDROID / private static int coldDrawn / #endif` field block; RULES_WHOLE = ColdStartRules.cs whole. */
const BLOCK_PAGE_STARTED = '176fb38c24511ee879d93bdbcf7875b24c7404e371fd48e16ab284998686fa19';
const P1_MEMBERS = { cold: 'fe539e68709a95252372ad28494dfd5d71f7e37bf72559a92bfe0161b48f76b9', coldFlush: '10cecd16f7cd0eaa142aac1ffa650f3fb53df46579b7b066737d63dc363d9eb5', coldDraw: 'e637eda059dea18a9348ecf85e0e9eb249c22f16b1883379ff1b8ac2e3091921', ColdDrawL: '6d67d350cff26511b18620a32aabb420d0da626f9ef9eb1ecf23ac80088fee4c' };
const COLDDRAWN_FIELD = 'de748d93432172842c43e9492c0204c507b7055f26064a749779f4ba3e11cf4b';
const RULES_WHOLE = 'e91e0cf144404e9fabd720691a24d89eecef0fe54833ac4599e83bef3e773f3b';
/* round 2 (B2-1): Spixi/Utils/P1Perf.cs WHOLE (same convention as RULES_WHOLE); a later edit of the file re-bases it after a look at the diff (#1596) */
const P1_WHOLE = '5dcd04127a8b07618253f586fdc8de58c5b14542904ce4599e7817186158ca92';
/* `Conditional(` occurrences in the comment-masked tree: the three members of P1Perf.cs and nowhere else (computed on this tree, 2026-11-16) */
const CONDITIONAL_COUNT = 3;
/* round 2 (B2-2): the ONLY tail a removable mark / flush / draw line may carry (exact text, three spaces before the slashes) */
const MARK_TAIL = '   // ★ coldstart1 (#1680)';
/* every string literal (regular, verbatim, each part of an interpolated one) under Spixi/ outside ColdStartRules.cs: no `cold <token>`, no `[P1] cold`,
 * no token as a whole word — except the words the BASE tree already holds (cdc4f717), frozen here; the set must not grow (P-4). */
const BASE_LITERAL_WORDS = '';
const COLD_ATTR = '[System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]';

/* the call-site table of § 3a: [mark, body, the code line before, the code line after, brace depth inside the body].
 * '{' / '}' = the body's own braces; '§draw' = the coldDraw line; '§ActHold' = the ActHold mark. Strings are kept in the text. */
const FLUSH_PREV = 'flushStartupDiagnostics();';
export const SITES = [
  ['AppIn', 'maOnCreate', '{', 'try', 1],
  ['BaseIn', 'maOnCreate', '}', 'base.OnCreate();', 1],
  ['BaseOut', 'maOnCreate', 'base.OnCreate();', 'try', 1],
  ['AppOut', 'maOnCreate', '}', '}', 1],
  ['MauiIn', 'mpCreate', '{', 'var builder = MauiApp.CreateBuilder();', 1],
  ['MauiBuild', 'mpCreate', '});', 'return builder.Build();', 1],
  ['CtorIn', 'appCtor', '{', 'InitializeComponent();', 1],
  ['ConfigIn', 'appCtor', 'InitializeComponent();', 'Config.init();', 1],
  ['FlagsIn', 'appCtor', '}', 'SpixiFlags.init();', 2],
  ['LangIn', 'appCtor', '}', 'if (Preferences.Default.ContainsKey("language"))', 2],
  ['FilesIn', 'appCtor', '}', 'movePersonalFiles();', 2],
  ['ThemeIn', 'appCtor', 'movePersonalFiles();', 'Current.UserAppTheme = AppTheme.Unspecified;', 2],
  ['NodeIn', 'appCtor', '};', '_ = new Node();', 2],
  ['WalletIn', 'appCtor', '_ = new Node();', 'bool wallet_found = Node.checkForExistingWallet();', 2],
  ['WalletOut', 'appCtor', '}', 'if (wallet_decrypted == false)', 3],
  ['HomeIn', 'appCtor', 'homeIsBootRoot = true;', 'MainPage = new NavigationPage(HomePage.Instance());', 5],
  ['HomeOut', 'appCtor', 'MainPage = new NavigationPage(HomePage.Instance());', '}', 5],
  ['CtorOut', 'appCtor', 'NavigationPage.SetHasNavigationBar(MainPage, false);', '}', 2],
  ['ActIn', 'actOnCreate', '{', 'Instance = this;', 1],
  ['ActBase', 'actOnCreate', 'base.OnCreate(bundle);', 'OnBackPressedDispatcher.AddCallback(this, new SpixiBackCallback(this));', 1],
  ['ActHold', 'actOnCreate', '§draw', 'startBootHold(rootView);', 1],
  ['ActOut', 'actOnCreate', 'Permissions.RequestAsync<Permissions.StorageWrite>();', 'handleNotificationIntent(Intent);', 1],
  ['ResumeIn', 'actOnResume', '{', 'base.OnResume();', 1],
  ['ResumeOut', 'actOnResume', '}', '}', 1],
  ['WvIn', 'wvCreate', '{', 'var webView = new SpixiWebview(Context);', 1],
  ['WvNew', 'wvCreate', 'var webView = new SpixiWebview(Context);', 'webView.Settings.SetSupportMultipleWindows(true);', 1],
  ['WvOut', 'wvCreate', 'webView.Settings.SetSupportMultipleWindows(true);', 'return webView;', 1],
  ['NavIn', 'wvLoad', '_eventState = WebNavigationEvent.NewPage;', 'Control.LoadDataWithBaseURL(baseUrl ?? AssetBaseUrl, html, "text/html", "UTF-8", null);', 1],
  ['NavOut', 'wvLoad', 'Control.LoadDataWithBaseURL(baseUrl ?? AssetBaseUrl, html, "text/html", "UTF-8", null);', '}', 1],
  ['PageEnd', 'wvFinished', '{', 'if (_renderer.Element == null)', 1],
];
/* the flush line sits in App(): directly after the `flushStartupDiagnostics();` that follows DevLogTail, before `Logging.info("Starting Spixi …")` */
const FLUSH_SITE = ['appCtor', FLUSH_PREV, 'Logging.info("Starting Spixi {0} ({1})", Config.version, CoreConfig.version);', 2];
const DRAW_SITE = ['actOnCreate', '}', '§ActHold', 1];

const markStmt = (name) => new RegExp('^(?:SPIXI\\.)?P1Perf\\.cold\\((?:SPIXI\\.)?ColdMark\\.' + name + '\\);$');
const ANY_MARK = /^(?:SPIXI\.)?P1Perf\.cold\((?:SPIXI\.)?ColdMark\.(\w+)\);$/;
const FLUSH_STMT = /^(?:SPIXI\.)?P1Perf\.coldFlush\(\);$/;
const DRAW_STMT = /^(?:SPIXI\.)?P1Perf\.coldDraw\(this\);$/;   // round 1 (R-1 / S-1): the argument is `this`; the decor is read INSIDE the dev body
/* the RAW line of a removable statement: indentation, the statement, then EITHER nothing OR exactly MARK_TAIL (round 2, B2-2: no `[^\n]*` — nothing can hide in a tail) */
const rawLine = (stmtRe) => new RegExp('^[ \\t]*' + stmtRe.source.replace(/^\^/, '').replace(/\$$/, '') + '(?:' + MARK_TAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')?$');
const RAW_MARK = rawLine(ANY_MARK), RAW_FLUSH = rawLine(FLUSH_STMT), RAW_DRAW = rawLine(DRAW_STMT);

/* the body of `sig` in `text`: raw / comment-masked / string-blanked slices of the SAME range (the masks keep every position) */
const bodyOf = (text, sig) => {
  const M = mask(text, false), B = mask(text, true);
  const sp = span(B, sig);
  const ok = sp.end > 0 && count(B, sig) === 1;
  return { ok, at: sp.at, start: sp.start, end: sp.end, M, B,
    raw: ok ? text.slice(sp.start, sp.end) : '', m: ok ? M.slice(sp.start, sp.end) : '', b: ok ? B.slice(sp.start, sp.end) : '' };
};
/* remove EXACTLY the batch's lines from a body; returns the rest, what was removed and what stayed */
const strip = (body, allowed, extra) => {
  const rl = body.raw.split('\n'), ml = body.m.split('\n');
  const drop = new Set(), removed = [];
  let blocks = 0, flushes = 0, draws = 0;
  if (extra.block) {
    for (let i = 0; i < ml.length; i++) {
      if (!/^#[^\S\r\n]*if[^\S\r\n]+SPIXI_DEV_COEXIST$/.test(ml[i].trim())) continue;
      let d = 0, j = i;
      for (; j < ml.length; j++) { const t = ml[j].trim(); if (/^#[^\S\r\n]*if\b/.test(t)) d++; else if (/^#[^\S\r\n]*endif\b/.test(t) && --d === 0) break; }
      if (j < ml.length && ml.slice(i, j + 1).some((l) => l.includes('OnPageStarted('))) {
        for (let k = i; k <= j; k++) drop.add(k);
        blocks++;
        /* a block set off by an empty line on BOTH sides leaves one empty line behind, as the base had: the second is the block's own (raw lines: a comment is no empty line) */
        if (i > 0 && rl[i - 1].trim() === '' && j + 1 < rl.length && rl[j + 1].trim() === '') drop.add(j + 1);
      }
    }
  }
  for (let i = 0; i < ml.length; i++) {
    if (drop.has(i)) continue;
    const code = ml[i].trim(), m = ANY_MARK.exec(code);
    if (m && allowed.includes(m[1]) && RAW_MARK.test(rl[i])) { drop.add(i); removed.push(m[1]); }
    else if (extra.flush && FLUSH_STMT.test(code) && RAW_FLUSH.test(rl[i])) { drop.add(i); flushes++; }
    else if (extra.draw && DRAW_STMT.test(code) && RAW_DRAW.test(rl[i])) { drop.add(i); draws++; }
  }
  const rest = rl.filter((_, i) => !drop.has(i)).join('\n');
  return { rest, removed, blocks, flushes, draws, left: count(rest, /P1Perf\.cold(?:Flush|Draw)?\(/g) };
};

/* everything that reads the tree: `read(f)` gives the text with the BOM stripped and CRLF → LF */
export const analyse = (read) => {
  const out = {};
  for (const [key, [f, sig, allowed, extra]] of Object.entries(BODIES)) {
    const b = bodyOf(read(f), sig);
    const s = b.ok ? strip(b, allowed, extra) : { rest: '', removed: [], blocks: 0, flushes: 0, draws: 0, left: 0 };
    out[key] = { body: b, rawHash: b.ok ? sha(b.raw) : 'absent', restHash: b.ok ? sha(s.rest) : 'absent', strip: s };
  }
  return out;
};

export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const TREE = walk('Spixi').map((f) => [f, mask(raw(f))]);
  const perFile = (re, skip) => TREE.filter(([g]) => g !== skip).map(([g, x]) => [g, count(x, new RegExp(re.source, 'g'))]).filter(([, n]) => n > 0).map(([g, n]) => g + '×' + n).sort().join(',');

  const RU = existsSync(join(root, RULES_F)) ? mask(raw(RULES_F)) : '';
  const P1raw = raw(P1_F), P1 = mask(P1raw), P1B = mask(P1raw, true);
  const WVraw = raw(WV_F), WV = mask(WVraw);
  const A = analyse(raw);
  const lineStarts = (b) => { let off = b.start; return b.m.split('\n').map((l) => { const o = off; off += l.length + 1; return [l, o]; }); };

  /* the P1Perf members of the batch (each is looked up by its signature; the masks are the file's own) */
  const reSpan = (re) => { const m = re.exec(P1B); if (!m) return { ok: false, at: -1, start: -1, end: -1, raw: '', m: '', b: '' }; const sp = span(P1B, m[0]); return { ok: sp.end > 0, at: sp.at, start: sp.start, end: sp.end, raw: P1raw.slice(sp.start, sp.end), m: P1.slice(sp.start, sp.end), b: P1B.slice(sp.start, sp.end), sig: m[0] }; };
  const P1_COLD = reSpan(/\binternal static void cold\(ColdMark \w+\)/), P1_FLUSH = reSpan(/\binternal static void coldFlush\(\)/), P1_DRAW = reSpan(/\binternal static void coldDraw\([^)]*\)/);
  const listeners = [...P1B.matchAll(/\bclass\s+\w+\b[^{;]*\bIOnDrawListener\b[^{;]*/g)].map((m) => reSpan(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
  /* the code lines of a P1Perf member that sit outside the needed regions (directives, blanks and the member's own braces do not count) */
  const outside = (sp, need) => {
    if (!sp.ok) return ['absent'];
    const ls = lineStarts(sp), bad = [];
    if (ls[0][0].trim() !== '{' || ls[ls.length - 1][0].trim() !== '}') bad.push('braces');
    let code = 0;
    ls.forEach(([l, o], i) => { const t = l.trim(); if (i === 0 || i === ls.length - 1 || !t || t.startsWith('#')) return; code++; if (!hasTerms(P1, o, need)) bad.push(i); });
    if (code === 0) bad.push('empty');
    return bad;
  };
  const NEED = ['SPIXI_DEV_COEXIST', 'ANDROID'];

  /* the override and its block */
  const OV = bodyOf(WVraw, SIG_PAGE_STARTED);
  const ovText = OV.ok ? WV.slice(OV.at, OV.end).replace(/\s+/g, ' ').trim() : '';
  const OV_WANT = SIG_PAGE_STARTED + ' { base.OnPageStarted(view, url, favicon); SPIXI.P1Perf.cold(SPIXI.ColdMark.Page); }';

  /* ── 1: DEV ONLY ── */
  const literal = (t) => '"' + t + '"';
  {
    const lines = RU.split('\n');
    const dir = lines.map((l, k) => [k + 1, l.trim()]).filter(([, l]) => /^#[^\S\r\n]*(if|elif|else|endif)\b/.test(l));
    const firstCode = lines.findIndex((l) => l.trim().length > 0) + 1;
    let lastCode = 0;
    lines.forEach((l, k) => { if (l.trim().length > 0) lastCode = k + 1; });
    let depth = 0, closedAt = 0;
    const early = [];
    for (const [ln, l] of dir) {
      if (/^#[^\S\r\n]*if\b/.test(l)) depth++;
      else if (/^#[^\S\r\n]*endif\b/.test(l)) { depth--; if (depth === 0) { if (closedAt) early.push(ln); closedAt = ln; } }
      else if (depth === 1) early.push(ln + ' (' + l + ')');
    }
    const defines = TREE.filter(([, t]) => /^[^\S\r\n]*#[^\S\r\n]*(define|undef)[^\S\r\n]+SPIXI_DEV_COEXIST\b/m.test(t)).map(([f]) => f);
    const enumSp = reSpan(/\binternal enum ColdMark\b/);
    const lit = TOKENS.map((t) => [t, count(RU, literal(t))]);
    const others = literalsOutside(TREE);
    const g = {
      rulesExist: RU.length > 0,
      rulesOpens: dir.length > 0 && dir[0][0] === firstCode && /^#if SPIXI_DEV_COEXIST\s*$/.test(dir[0][1]),
      rulesClosesLast: closedAt > 0 && closedAt === lastCode && depth === 0,
      rulesNoEarlyClose: early.length === 0,
      noDefine: defines.length === 0,
      enumEverywhere: enumSp.at >= 0 && regionsAt(P1, enumSp.at).length === 0 && P1.indexOf('namespace SPIXI') >= 0,
      methodsEverywhere: [P1_COLD, P1_FLUSH, P1_DRAW].filter((s) => s !== P1_DRAW).every((s) => s.ok && regionsAt(P1, s.at).length === 0),
      drawIsAndroid: P1_DRAW.ok && hasTerms(P1, P1_DRAW.at, ['ANDROID']),
      coldBodyDev: outside(P1_COLD, NEED).length === 0,
      coldFlushBodyDev: outside(P1_FLUSH, NEED).length === 0,
      coldDrawBodyDev: outside(P1_DRAW, NEED).length === 0,
      listenerDev: listeners.length === 1 && listeners[0].ok && hasTerms(P1, listeners[0].at, NEED) && outside(listeners[0], NEED).length === 0,
      androidOnlyApi: [...P1.matchAll(/\bViewTreeObserver\b|\bOnDrawListener\b|\bAddOnDrawListener\b|\bRemoveOnDrawListener\b|\bIOnDrawListener\b/g)].every((m) => hasTerms(P1, m.index, NEED)),
      overrideOnce: count(WV, /\boverride void OnPageStarted\b/g) === 1 && count(WV, 'OnPageStarted(') === 2 && inTreeCount(TREE, 'OnPageStarted') === WV_F + '×2',
      overrideText: ovText === OV_WANT,
      overrideDev: OV.ok && regionsAt(WV, OV.at).join('|') === 'SPIXI_DEV_COEXIST' && regionsAt(WV, OV.end).join('|') === 'SPIXI_DEV_COEXIST',
      tokensInRules: lit.every(([, n]) => n === 1),
      tokensNowhereElse: others === BASE_LITERALS,
      coldWordInRules: count(RU, '"cold "') === 1,
    };
    ok(F(g).length === 0,
      '★ coldstart1 A (1) DEV ONLY: ' + RULES_F + ' is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif`; every code line of P1Perf.cold / coldFlush / coldDraw and of the draw listener sits inside regions that are plain `&&` conjunctions holding SPIXI_DEV_COEXIST and ANDROID (the three methods and ColdMark exist on every target); the OnPageStarted override is the contract\'s exact text inside `#if SPIXI_DEV_COEXIST` only; the 33 token literals and "cold " are written only in ColdStartRules.cs (the words the base tree already holds elsewhere are frozen and must not grow); no .cs file defines the symbol — failing: ' + JSON.stringify(F(g)) + ' ' + JSON.stringify({ firstCode, lastCode, closedAt, early, defines, others: others === BASE_LITERALS ? 'base' : others, bodyBad: { cold: outside(P1_COLD, NEED), flush: outside(P1_FLUSH, NEED), draw: outside(P1_DRAW, NEED) }, ovText: ovText === OV_WANT ? 'ok' : ovText }));
  }

  /* ── 2: CALL SITES ── */
  {
    const enumSp = reSpan(/\binternal enum ColdMark\b/);
    const members = enumSp.ok ? (enumSp.m.match(/[A-Za-z_]\w*/g) || []) : [];
    const site = (mark, bodyKey, prev, next, depth) => {
      const b = A[bodyKey].body;
      if (!b.ok) return false;
      const ml = b.m.split('\n'), rl = b.raw.split('\n'), bl = b.b.split('\n');
      const re = typeof mark === 'string' && mark[0] !== '§' ? markStmt(mark) : mark === '§draw' ? DRAW_STMT : mark === '§flush' ? FLUSH_STMT : null;
      const hits = ml.map((l, i) => [l.trim(), i]).filter(([c]) => re.test(c)).map(([, i]) => i);
      if (hits.length !== 1) return false;
      const i = hits[0];
      const nb = (from, dir) => { for (let k = from; k >= 0 && k < ml.length; k += dir) { const t = ml[k].trim(); if (t) return t; } return ''; };
      const eq = (code, want) => (want === '§draw' ? DRAW_STMT.test(code) : want === '§ActHold' ? markStmt('ActHold').test(code) : code === want);
      let d = 0;
      for (let k = 0; k < i; k++) d += count(bl[k], '{') - count(bl[k], '}');
      const rawOk = (mark === '§draw' ? RAW_DRAW : mark === '§flush' ? RAW_FLUSH : RAW_MARK).test(rl[i]);
      return rawOk && eq(nb(i - 1, -1), prev) && eq(nb(i + 1, 1), next) && d === depth;
    };
    const c = {};
    for (const [mark, bodyKey, prev, next, depth] of SITES) c[mark] = site(mark, bodyKey, prev, next, depth);
    c.Page = OV.ok && count(OV.m, /\bColdMark\.Page\b/g) === 1 && OV.m.indexOf('base.OnPageStarted(view, url, favicon);') > 0
      && OV.m.indexOf('base.OnPageStarted(view, url, favicon);') < OV.m.indexOf('ColdMark.Page') && /^(?:SPIXI\.)?P1Perf\.cold\((?:SPIXI\.)?ColdMark\.Page\);$/m.test(OV.m.split('\n').map((l) => l.trim()).join('\n'));
    c.flush = site('§flush', FLUSH_SITE[0], FLUSH_SITE[1], FLUSH_SITE[2], FLUSH_SITE[3]);
    c.draw = site('§draw', DRAW_SITE[0], DRAW_SITE[1], DRAW_SITE[2], DRAW_SITE[3]);
    /* every mention of every member, tree-wide: one each (31 call sites + `draw` in the listener's OnDraw), none for `logger` */
    const perMember = ENUM.map((e) => [e, perFile(new RegExp('\\bColdMark\\.' + e + '\\b'))]);
    const want = (e) => (e === 'Logger' ? '' : e === 'Draw' ? P1_F + '×1' : SITES.concat([['Page', 'x']]).filter(([m]) => m === e).map(([, k]) => (e === 'Page' ? WV_F : BODIES[k][0]) + '×1').join(','));
    c.oneMentionEach = perMember.every(([e, got]) => got === want(e) || (e === 'Logger' && got === RULES_F + '×1'));   // the rule may name its own anchor slot
    c.noOtherCold = perFile(/\bP1Perf\.cold\(/, P1_F) === [APP_F, ACT_F, APPC_F, MP_F, WV_F].map((f) => [f, SITES.filter(([, k]) => BODIES[k][0] === f).length + (f === WV_F ? 1 : 0)]).sort(([a], [b]) => (a < b ? -1 : 1)).map(([f, n]) => f + '×' + n).join(',');
    c.noCast = perFile(/\(ColdMark\)|\bEnum\.(?:Parse|ToObject|GetValues)\(typeof\(ColdMark\)/) === '';
    c.drawInOnDraw = (() => { const od = listeners.length === 1 ? reSpan(/\bvoid OnDraw\(\)/) : { ok: false }; return od.ok && count(od.m, 'cold(ColdMark.Draw);') === 1 && count(P1, /\bcold\(ColdMark\.Draw\)/g) === 1; })();
    c.coldFlushMentions = perFile(/\bcoldFlush\s*\(/) === [APP_F + '×1', P1_F + '×1'].sort().join(',') && count(raw(APP_F), /\bP1Perf\.coldFlush\(\);/g) === 1;
    c.coldDrawMentions = perFile(/\bcoldDraw\s*\(/) === [ACT_F + '×1', P1_F + '×1'].sort().join(',') && count(raw(ACT_F), /\bP1Perf\s*\.\s*coldDraw\(this\);/g) === 1;
    c.enumOrder = members.length === 34 && members[0] === 'ColdMark' ? members.slice(1).join(',') === ENUM.join(',') : members.join(',') === ENUM.join(',');
    c.enumImplicit = enumSp.ok && !/=/.test(enumSp.m);
    ok(F(c).length === 0,
      '★ coldstart1 A (2) CALL SITES: each of the 31 marks of § 3a is called exactly ONCE in the tree, as one statement on its own line (`P1Perf.cold(ColdMark.X);` or the SPIXI.-prefixed form, an optional `// ★ coldstart1` comment), in its file and method, at its brace depth, between the two code lines the table names; the OnPageStarted override is `base.OnPageStarted(view, url, favicon);` + the Page mark; `draw` is called once, in the listener\'s OnDraw; `logger` has no call site; coldFlush() is called once (App(), directly after the flushStartupDiagnostics() that follows DevLogTail), coldDraw( once (MainActivity.OnCreate, directly before the ActHold mark); ColdMark has the 33 members in the order of § 3, implicit values, no cast — failing: ' + JSON.stringify(F(c)) + ' ' + JSON.stringify({ mentions: perMember.filter(([e, got]) => got !== want(e)).map(([e, got]) => e + ' ' + got) }));
  }

  /* ── 3: NO MOVE ── */
  {
    const n = {};
    const detail = {};
    for (const key of Object.keys(BODIES)) {
      const a = A[key];
      n[key] = a.body.ok && a.restHash === BASE_BODIES[key] && a.strip.left === 0
        && a.strip.removed.length === new Set(a.strip.removed).size
        && (!BODIES[key][3].block || a.strip.blocks === 1)
        && (!BODIES[key][3].flush || a.strip.flushes === 1)
        && (!BODIES[key][3].draw || a.strip.draws === 1);
      if (n[key] !== true) detail[key] = { rest: a.restHash.slice(0, 12), base: BASE_BODIES[key].slice(0, 12), removed: a.strip.removed.length, left: a.strip.left, blocks: a.strip.blocks, flushes: a.strip.flushes, draws: a.strip.draws };
    }
    /* round 2 (B2-2): the RAW bytes of the seven batch files — for C# a line, and so a `//` comment, also ends at U+0085 / U+2028 / U+2029 (VT, FF, a lone CR are line-like too), which the `\n` masks cannot see */
    const oddEnds = [P1_F, RULES_F, APPC_F, MP_F, APP_F, ACT_F, WV_F].flatMap((g) => [...readBytes(join(root, g), 'utf8').matchAll(/[\u0085\u2028\u2029\u000B\u000C]|\r(?!\n)/g)]
      .map((m) => g + '@' + m.index + ' U+' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')));
    n.plainLineEnds = oddEnds.length === 0;
    if (!n.plainLineEnds) detail.plainLineEnds = oddEnds;
    ok(F(n).length === 0,
      '★ coldstart1 A (3) NO MOVE (the riskiest file is App.xaml.cs): for each touched body — MainApplication.OnCreate, MauiProgram.CreateMauiApp, App(), MainActivity.OnCreate / OnResume, CreateNativeControl, LoadHtml, OnPageFinished — and the class SpixiWebViewClient: remove EXACTLY the batch\'s lines (a line whose code is one mark statement of that body, the flush line, the draw line — each with indentation, line end and EXACTLY the tail `   // ★ coldstart1 (#1680)` (or none) and NOTHING else on it — and the whole `#if SPIXI_DEV_COEXIST … #endif` block that holds OnPageStarted) and the SHA-256 of the rest (comments and whitespace as they are) equals the SHA-256 of the same body on the base cdc4f717; so only lines were inserted: no existing statement moved, changed, was wrapped or reordered; and the RAW bytes of the seven batch files (P1Perf, ColdStartRules, MainApplication, MauiProgram, App.xaml.cs, MainActivity, WebViewRenderer; read with node\'s own fs) hold none of U+0085, U+2028, U+2029, VT, FF or a lone CR (key plainLineEnds: Roslyn ends a `//` comment there, so a mark line\'s tail could hide code) — failing: ' + JSON.stringify(F(n)) + ' ' + JSON.stringify(detail));
  }

  /* ── 4: NOTHING NEW ── */
  {
    const FORBID = /\bThread(?!ing\b)\w*|\bTask\b|\basync\b|\bawait\b|\bWait\w*|\bSleep\b|Delay|\block\b|\bMonitor\b|\bTimer\b|Preferences|SecureStorage|\bFile\b|\bFile\.|FileStream|FileInfo|System\.IO|ixian:|sendUiCommand|Navigation|PostDelayed|PostFrameCallback|Choreographer|Invalidate|\bLogging\./;
    const RULES_ONLY = /Microsoft\.Maui|\bAndroid\b|IXICore|Regex|\bConsole\b|Stopwatch|\bDebug\.|SPIXI\.Meta|\bP1Perf\b/;
    const draw = [P1_DRAW.m, ...listeners.map((l) => l.m)].join('\n');
    const newCode = { rules: RU, cold: P1_COLD.m, flush: P1_FLUSH.m, draw: P1_DRAW.m, listener: listeners.map((l) => l.m).join('\n'), override: OV.ok ? WV.slice(OV.at, OV.end) : '' };
    const usings = [...RU.matchAll(/^[^\S\r\n]*using\s+([\w.]+)\s*;/gm)].map((m) => m[1]);
    const urlUse = [...(newCode.override.matchAll(/\burl\b/g))].length;
    const v = {
      found: RU.length > 0 && P1_COLD.ok && P1_FLUSH.ok && P1_DRAW.ok && listeners.length === 1 && OV.ok,
      noForbidden: Object.entries(newCode).every(([, t]) => !FORBID.test(t)),
      rulesPure: !RULES_ONLY.test(RU) && usings.every((u) => ['System', 'System.Collections.Generic', 'System.Threading', 'System.Globalization'].includes(u)),
      lineOnly: /\bline\(/.test(P1_COLD.m) && /\bline\(/.test(P1_FLUSH.m) && count(P1_COLD.m, /\bline\(/g) === 1 && count(P1_FLUSH.m, /\bline\(/g) === 2,   // coldFlush: the stored marks, then the anchor LAST
      overrideNeverReadsUrl: urlUse === 2,
      oneDrawPost: count(draw, /\.Post\(/g) === 1 && count(draw, /\bRemoveOnDrawListener\(/g) === 1 && count(draw, /\bAddOnDrawListener\(/g) === 1,
      neverFalse: !/\breturn\s+false\b/.test(draw),
      tryCatch: [P1_COLD, P1_FLUSH, P1_DRAW].every((s) => /\btry\b/.test(s.m) && /catch\s*\(Exception\)/.test(s.m)),
    };
    ok(F(v).length === 0,
      '★ coldstart1 A (4) NOTHING NEW: the new code (ColdStartRules.cs, the bodies of P1Perf.cold / coldFlush / coldDraw, the draw listener class, the OnPageStarted override) holds no Thread, Task, async, await, Wait, Sleep, Delay, lock, Monitor, Timer, Preferences, SecureStorage, File, `ixian:`, sendUiCommand, Navigation, PostDelayed, PostFrameCallback, Choreographer, Invalidate and no `Logging.` (only `line(`: once in cold, twice in coldFlush — the marks and the anchor); the rules file also no MAUI / Android / Core / Regex / clock / log and only the usings System, Collections.Generic, Threading (Interlocked), Globalization; every P1Perf entry is `try { … } catch (Exception)`; the override names `url` twice only (the parameter and the base call); the draw code has exactly one `.Post(`, one AddOnDrawListener, one RemoveOnDrawListener and never `return false` — failing: ' + JSON.stringify(F(v)) + ' ' + JSON.stringify({ forbidden: Object.entries(newCode).filter(([, t]) => FORBID.test(t)).map(([k, t]) => k + ':' + (FORBID.exec(t) || [''])[0]), urlUse }));
  }

  /* ── 6: ROUND 1 (P-1 … P-5, F1) ── */
  {
    const RAW_TREE = TREE.map(([f]) => [f, raw(f)]);
    /* P-1: the dev-only block around OnPageStarted equals its exact text */
    const wl = WVraw.split('\n');
    const blocks = [];
    for (let i = 0; i < wl.length; i++) {
      if (!/^[^\S\r\n]*#[^\S\r\n]*if[^\S\r\n]+SPIXI_DEV_COEXIST[^\S\r\n]*$/.test(wl[i])) continue;
      let d = 0, j = i;
      for (; j < wl.length; j++) { if (/^[^\S\r\n]*#[^\S\r\n]*if\b/.test(wl[j])) d++; else if (/^[^\S\r\n]*#[^\S\r\n]*endif\b/.test(wl[j]) && --d === 0) break; }
      blocks.push(wl.slice(i, j + 1).join('\n'));
    }
    const pageBlocks = blocks.filter((b) => b.includes('OnPageStarted'));
    const pageCtl = (WVraw.match(/^[^\S\r\n]*#[^\S\r\n]*(?:else|elif)\b.*$/gm) || []).length;
    /* P-2: the members whole, the listener class, the field block */
    const mem = {
      cold: memberText(P1raw, P1B, /\binternal static void cold\(ColdMark \w+\)/),
      coldFlush: memberText(P1raw, P1B, /\binternal static void coldFlush\(\)/),
      coldDraw: memberText(P1raw, P1B, /\binternal static void coldDraw\([^)]*\)/),
      ColdDrawL: memberText(P1raw, P1B, /\bclass ColdDrawL\b[^{;]*/),
    };
    const fields = P1raw.match(/^[^\S\n]*#if ANDROID\n[^\n]*\bcoldDrawn\b[^\n]*\n[^\S\n]*#endif\n/gm) || [];
    const sigAttr = (name) => new RegExp(COLD_ATTR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*internal static void ' + name + '\\(').test(P1);
    /* P-5 + F1: counts and arguments */
    const inP1cold = count(P1, /\bcold\s*\(/g);
    const calls = RAW_TREE.filter(([f]) => f !== P1_F).flatMap(([f]) => {
      const M = mask(raw(f)), res = [];
      for (const m of M.matchAll(/\bP1Perf\s*\.\s*(cold|coldFlush|coldDraw)\s*\(([^()]*)\)/g)) res.push([f, m[1], m[2].trim()]);
      return res;
    });
    const allCold = RAW_TREE.filter(([f]) => f !== P1_F).reduce((n, [f]) => n + count(mask(raw(f)), /\bP1Perf\s*\.\s*cold\s*\(/g), 0);
    const argsOk = calls.every(([, k, a]) => (k === 'cold' && /^(?:SPIXI\.)?ColdMark\.[A-Za-z]+$/.test(a)) || (k === 'coldFlush' && a === '') || (k === 'coldDraw' && a === 'this'));
    const q = {
      pageBlockOnce: pageBlocks.length === 1,
      pageBlockExact: pageBlocks.length === 1 && sha(pageBlocks[0]) === BLOCK_PAGE_STARTED,
      noElseInFile: pageCtl === 0 || !pageBlocks.some((b) => /^[^\S\r\n]*#[^\S\r\n]*(?:else|elif)\b/m.test(b)),
      coldFrozen: sha(mem.cold) === P1_MEMBERS.cold,
      coldFlushFrozen: sha(mem.coldFlush) === P1_MEMBERS.coldFlush,
      coldDrawFrozen: sha(mem.coldDraw) === P1_MEMBERS.coldDraw,
      listenerFrozen: sha(mem.ColdDrawL) === P1_MEMBERS.ColdDrawL,
      p1PerfWhole: sha(P1raw) === P1_WHOLE,
      conditionalInP1: count(P1, /\bConditional(?:Attribute)?\s*\(/g) === CONDITIONAL_COUNT,
      conditionalTree: TREE.reduce((k, [, x]) => k + count(x, /\bConditional(?:Attribute)?\s*\(/g), 0) === CONDITIONAL_COUNT,
      noModuleInitializer: TREE.every(([, x]) => !/\bModuleInitializer(?:Attribute)?\b/.test(x)),
      coldDrawnDev: P1.indexOf('coldDrawn') >= 0 && hasTerms(P1, P1.indexOf('coldDrawn'), NEED),
      fieldFrozen: fields.length === 1 && sha(fields[0]) === COLDDRAWN_FIELD && count(P1, /\bcoldDrawn\b/g) === 2,
      rulesFrozen: sha(raw(RULES_F)) === RULES_WHOLE,
      literalWordsFrozen: literalWords(RAW_TREE) === BASE_LITERAL_WORDS,
      onlyDeclAndListenerCall: inP1cold === 2,
      treeWideCold: allCold === SITES.length + 1,
      flushOnceOutside: calls.filter(([, k]) => k === 'coldFlush').length === 1 && perFile(/\bcoldFlush\s*\(/, P1_F) === APP_F + '×1',
      drawOnceThis: calls.filter(([, k]) => k === 'coldDraw').length === 1 && calls.filter(([, k]) => k === 'coldDraw')[0][2] === 'this',
      argsOk,
      attrCold: sigAttr('cold'), attrFlush: sigAttr('coldFlush'), attrDraw: sigAttr('coldDraw'),
    };
    ok(F(q).length === 0,
      '★ coldstart1 A (6) ROUND 1 FREEZE: the dev-only block around OnPageStarted equals its exact text (no `#else` / `#elif`, no second member, no second block); P1Perf.cold / coldFlush / coldDraw (attribute line and doc comment included), the class ColdDrawL and the coldDrawn field block, and ColdStartRules.cs WHOLE equal their frozen SHA-256; P1Perf.cs is ALSO frozen WHOLE by SHA-256 (key p1PerfWhole: a second attribute line above a member, e.g. a second `Conditional` — two are OR-ed, so a store build would compile every call again — or `[ModuleInitializer]`, is caught as a class; a later edit of P1Perf.cs needs a re-base after a look at the diff, #1596), `Conditional(` appears exactly 3 times in P1Perf.cs and 3 times in the whole tree, no `ModuleInitializer` anywhere, and the coldDrawn field sits inside SPIXI_DEV_COEXIST and ANDROID; the three methods carry exactly `[System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]`; every string literal under Spixi/ outside the rules file holds no `cold <token>`, no `[P1] cold` and no token word beyond the base tree\'s own (frozen); `cold(` appears twice in P1Perf.cs (declaration + the one call in ColdDrawL); outside P1Perf every call is `P1Perf.cold(ColdMark.X)` (31 of them), `P1Perf.coldFlush()` once or `P1Perf.coldDraw(this)` once — failing: ' + JSON.stringify(F(q)) + ' ' + JSON.stringify({ literalWords: literalWords(RAW_TREE), pageBlocks: pageBlocks.length, inP1cold, allCold, calls: calls.filter(([, k, a]) => k !== 'cold').concat(calls.filter(([, k, a]) => k === 'cold' && !/^(?:SPIXI\.)?ColdMark\.[A-Za-z]+$/.test(a))) }));
  }

  /* ── 5: HARNESS ── */
  {
    const CSH = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
    const TF = 'scripts/csh/ColdStartTests.cs';
    const T = existsSync(join(root, TF)) ? mask(raw(TF)) : '';
    const TESTS = ['names_are_the_enum_names_in_order', 'every_token_passes_the_grammar_and_the_length', 'every_body_passes_the_p1_line_rule_at_the_two_ends',
      'out_of_range_ms_and_a_bad_id_give_null', 'marks_before_the_flush_return_null_and_come_out_in_enum_order_with_the_right_t', 'a_native_stopwatch_frequency_gives_the_same_ms',
      'a_mark_before_the_flush_with_t_out_of_range_is_not_written', 'a_fractional_stamp_is_rounded_to_the_nearest_ms', 'one_shot_before_and_after_the_flush', 'the_flush_runs_once_and_the_logger_comes_out_once',
      'after_the_flush_a_mark_returns_its_body_at_once', 'req_is_present_only_in_range', 'no_body_holds_anything_but_the_fixed_words_and_integers',
      'concurrent_marks_of_one_id_write_exactly_once', 'reset_for_tests_clears_the_slots_and_the_live_state'];
    const missing = TESTS.filter((m) => !new RegExp('\\[TestMethod\\]\\s*public void ' + m + '\\(\\)').test(T));
    const hz = {
      compiles: count(CSH, '<Compile Include="../../Spixi/Utils/ColdStartRules.cs" />') === 1 && count(CSH, '<Compile Include="../../Spixi/Utils/P1Perf.cs" />') === 1
        && /<DefineConstants>\$\(DefineConstants\);SPIXI_DEV_COEXIST<\/DefineConstants>/.test(CSH),
      testClass: /\[TestClass\]\s*public class ColdStartTests/.test(T),
      tests: missing.length === 0 && count(T, /\[TestMethod\]/g) === TESTS.length,
      realIsValidLine: count(T, 'P1Perf.isValidLine(') >= 3 && count(T, 'ColdStartRules.flush(') >= 5 && count(T, 'ColdStartRules.anchor(') >= 5,
    };
    ok(F(hz).length === 0,
      '★ coldstart1 A (5) HARNESS: csh.csproj compiles the REAL ColdStartRules.cs and P1Perf.cs with SPIXI_DEV_COEXIST, and ColdStartTests holds its ' + TESTS.length + ' tests (the 33 names = the enum, the grammar, every body through the real isValidLine at 0 and MaxMs, out-of-range / bad id, store-before-flush in enum order with the right t, one-shot before and after, the flush once, req= only in range, the fixed words, a race on one slot, the reset) — failing: ' + JSON.stringify(F(hz)) + (missing.length ? ' missing: ' + missing.join(',') : ''));
  }
}
/* the literal runs of a source text: each maximal run of string / char CONTENT chars (positions where the comment-masked text and the string-blanked mask differ) */
export function literalRuns(text) {
  /* ★ lead (round 1): the string contents are marked with U+0001, not with spaces — with a space fill a run broke at
   * every space of a literal, so `cold <token>` and `[P1] cold` could never match (a green break). */
  const M = mask(text, false), B = mask(text, true, '\u0001'), runs = [];
  let cur = '';
  for (let k = 0; k < M.length; k++) { if (B[k] === '\u0001') cur += M[k]; else if (cur) { runs.push(cur); cur = ''; } }
  if (cur) runs.push(cur);
  return runs;
}
/* P-4: `literal-hit@file×n` for every file (outside the rules file) whose literals hold `cold <token>`, `[P1] cold` or a token as a whole word */
export function literalWords(files) {
  const alt = TOKENS.join('|');
  /* ★ lead (round 1): the bare-word scan takes only the tokens WITH an underscore (wallet_out, home_in, …): they occur in
   * no literal of the base tree, so the frozen set is empty and a later batch in another session's files (a "page"
   * literal in SettingsPage.xaml.cs, SDevSeed.cs) cannot turn this row red; the plain words (logger, page, draw) are
   * held by the `cold <token>` and `[P1] cold` scans and by row 1's exact-literal count. */
  const bare = TOKENS.filter((t) => t.includes('_')).join('|');
  const reCold = new RegExp('cold (?:' + alt + ')'), reBare = new RegExp('(?<![A-Za-z0-9_])(?:' + bare + ')(?![A-Za-z0-9_])', 'g');
  const out = [];
  for (const [f, t] of files) {
    if (f === RULES_F) continue;
    for (const r of literalRuns(t)) {
      if (reCold.test(r)) out.push('cold@' + f);
      if (r.includes('[P1] cold')) out.push('p1cold@' + f);
      for (const m of r.matchAll(reBare)) out.push('"' + m[0] + '"@' + f);
    }
  }
  const tally = {}; for (const k of out) tally[k] = (tally[k] || 0) + 1;
  return Object.entries(tally).map(([k, n]) => k + '×' + n).sort().join(',');
}
/* P-1 / P-2: the text of a member of P1Perf.cs from its doc comment (the last `/*` before the signature that is not separated by code) to its closing brace */
export function memberText(P1raw, P1B, sigRe, kind) {
  const m = sigRe.exec(P1B); if (!m) return '';
  const sp = span(P1B, m[0]); if (sp.end < 0) return '';
  const head = P1raw.lastIndexOf('/*', sp.at);
  return head < 0 ? '' : P1raw.slice(P1raw.lastIndexOf('\n', head) + 1, sp.end);
}
/* every token literal (and "cold ") in the files OTHER than ColdStartRules.cs: `"literal"@file×n`, sorted — the base tree's own words are frozen in BASE_LITERALS */
export function literalsOutside(TREE) {
  return [...TOKENS, 'cold '].flatMap((t) => TREE.filter(([g]) => g !== RULES_F).map(([g, x]) => [t, g, count(x, '"' + t + '"')]).filter(([, , n]) => n > 0)
    .map(([tt, g, n]) => '"' + tt + '"@' + g + '×' + n)).sort().join(',');
}
/* `file×n` for the files of the tree that mention `s` (comment-masked) — the a-extra inTree */
function inTreeCount(TREE, s) { return TREE.filter(([, t]) => t.includes(s)).map(([f, t]) => f + '×' + count(t, s)).sort().join(','); }
