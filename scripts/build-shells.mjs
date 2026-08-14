/* build-shells.mjs — production shell build (DECISIONS #176, spec docs/build-pipeline-spec.md).
 * Inlines the redesigned demo shells into SELF-CONTAINED HTML and writes them
 * into Spixi/Resources/Raw/html, where MAUI packages Raw/** automatically.
 *
 * Stage 4a (now): demo-backed shells with MOCK data, written to the LEGACY
 * filename each C# page already loads → renders in the real app on Windows with
 * ZERO C# change, fully git-reversible. Stage 4b later swaps native.js + setRoute
 * + the §5 C# repoint.
 *
 * RUN LOCALLY (the sandbox mount corrupts node file round-trips — #175):
 *   node scripts/build-shells.mjs            # default: chat + home (Round-1 targets)
 *   node scripts/build-shells.mjs all        # every mapped shell
 *   node scripts/build-shells.mjs apps settings
 *
 * Prereq: bundles are current — run build-demo-bundle.mjs + build-strings-iife.mjs first.
 * This is ENFORCED: a preflight (below) fails the build when a shell references a
 * window.Spixi symbol the bundle it is about to inline does not export.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineHtml, inlineFonts } from './lib/inline.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'Spixi', 'Resources', 'Raw', 'html');

// key → { in: demo source, out: legacy Resources/Raw/html filename (drop-in), page: C# class }
// (ARCHITECTURE §5 mapping; `out` is the Stage-4a drop-in target = the file that C# page loads today)
//
// LAUNCH is special: the legacy launch flow is FIVE separate C# pages, each loading
// its own HTML file. The ONE production shell (src/shells/launch.html) holds all five
// views and boots at whichever `bootView` we inject per output filename (the shell
// reads window.__LAUNCH_VIEW__). So one source → five drop-in files. ZERO C# change.
const SHELLS = {
  chat:     { in: 'src/shells/chat.html',   out: 'chat.html',        page: 'SingleChatPage' },
  contact_details: { in: 'src/shells/contact_details.html', out: 'contact_details.html', page: 'ContactDetails' },
  contact_new: { in: 'src/shells/contact_new.html', out: 'contact_new.html', page: 'ContactNewPage' },
  home:     { in: 'src/shells/home.html',   out: 'index.html',       page: 'HomePage (chats tab)' },
  apps:     { in: 'src/demo/apps.html',     out: 'apps.html',        page: 'AppsPage' },
  app_details: { in: 'src/shells/app_details.html', out: 'app_details.html', page: 'AppDetailsPage' },
  app_new:  { in: 'src/shells/app_new.html', out: 'app_new.html',    page: 'AppNewPage' },
  settings: { in: 'src/shells/settings.html', out: 'settings.html',   page: 'SettingsPage' },
  settings_backup:     { in: 'src/shells/settings_backup.html',     out: 'settings_backup.html',     page: 'BackupPage' },
  settings_encryption: { in: 'src/shells/settings_encryption.html', out: 'settings_encryption.html', page: 'EncryptionPassword' },
  downloads:    { in: 'src/shells/downloads.html',    out: 'downloads.html',    page: 'DownloadsPage' },
  dev:          { in: 'src/shells/dev.html',          out: 'dev.html',          page: 'DevPage' },
  contributors: { in: 'src/shells/contributors.html', out: 'contributors.html', page: 'ContributorsPage' },
  // launch — the five legacy filenames, one bridge-wired shell, per-file boot view:
  launch:          { in: 'src/shells/launch.html', out: 'intro.html',         page: 'LaunchPage (welcome)',        bootView: 'welcome' },
  'launch-create': { in: 'src/shells/launch.html', out: 'intro_new.html',     page: 'LaunchCreatePage (create)',   bootView: 'create'  },
  'launch-restore':{ in: 'src/shells/launch.html', out: 'intro_restore.html', page: 'LaunchRestorePage (restore)', bootView: 'restore' },
  'launch-retry':  { in: 'src/shells/launch.html', out: 'intro_retry.html',   page: 'LaunchRetryPage (retry)',     bootView: 'retry'   },
  'launch-tail':   { in: 'src/shells/launch.html', out: 'onboarding.html',    page: 'OnboardPage (tail)',          bootView: 'tail'    },
  payments: { in: 'src/demo/wallet.html',   out: 'wallet_send.html', page: 'WalletSendPage' },
  // B3 (#256): transaction details — Stage-4a drop-in over the legacy filename.
  // VIEW-ONLY (no compose/signing — the money path stays C#'s); loaded BOTH as a
  // pushed page (narrow) and swapped into HomePage.rightContent (wide pane).
  wallet_sent: { in: 'src/shells/wallet_sent.html', out: 'wallet_sent.html', page: 'WalletSentPage' },
  // Track C (#186+): scan + lock are now dedicated bridge-wired shells (adapters
  // scan-page.js / lock-page.js in the bundle). Drop in over the legacy filenames
  // the C# ScanPage / LockPage already load — ZERO C# change, frozen bridge.
  scan:     { in: 'src/shells/scan.html',   out: 'scan.html',        page: 'ScanPage' },
  lock:     { in: 'src/shells/lock.html',   out: 'lock.html',        page: 'LockPage' },
  // #248: desktop right-pane resting state (EmptyDetail) — replaces the always-dark
  // legacy page that clashed with light mode. Static, *SL{}-localized.
  empty_detail: { in: 'src/shells/empty_detail.html', out: 'empty_detail.html', page: 'EmptyDetail' },
  // Q4-③ (#270): THE native call surface (ring full-window / in-call top strip),
  // hosted by the new CallPage — the per-pane call-ui broadcasts are gone.
  call: { in: 'src/shells/call.html', out: 'call.html', page: 'CallPage' },
  // contacts still lives INSIDE the chats demo (takeover pattern) — needs a
  // dedicated src/shells/ entry (native.js + setRoute), not a demo drop-in.
};

// `launch` shorthand expands to all five launch filenames (build them as a set).
const LAUNCH_KEYS = ['launch', 'launch-create', 'launch-restore', 'launch-retry', 'launch-tail'];

// #288 review (MAJOR, SECOND occurrence): the five launch drop-ins were not in DEFAULT,
// so every routine `node scripts/build-shells.mjs` left them inlining a STALE artifact —
// #285 and #287 both shipped them one dictionary behind (664 keys vs 665), i.e. English
// copy in the launch language picker for a translated user. The previous review caught the
// identical miss one batch earlier and fixed it by hand; hand-discipline did not hold, so
// the set now builds by DEFAULT. Their five output filenames (intro*/onboarding.html)
// collide with nothing else in the list.
const DEFAULT = ['chat', 'contact_details', 'contact_new', 'home', 'settings', 'app_details', 'app_new',
  'settings_backup', 'settings_encryption', 'scan', 'lock', 'downloads', 'dev', 'contributors',
  'empty_detail', 'wallet_sent', 'call',    // bridge-wired shells (real C# data)
  ...LAUNCH_KEYS];
const arg = process.argv.slice(2);
// #288 review: `all` used to include the two still-LEGACY demo drop-ins — apps.html and
// wallet_send.html, the MONEY page — silently overwriting them with demo markup (#284 had
// to restore both from HEAD). They stay buildable when named explicitly; `all` skips them.
const LEGACY_DEMO_KEYS = ['apps', 'payments'];
let keys = arg.length === 0 ? DEFAULT
  : arg.includes('all') ? Object.keys(SHELLS).filter((k) => !LEGACY_DEMO_KEYS.includes(k))
  : arg;
// `launch` alone means the whole launch set (all five drop-in files)
keys = keys.flatMap((k) => (k === 'launch' && arg.length && !arg.includes('all')) ? LAUNCH_KEYS : [k]);
keys = [...new Set(keys)];

/* ─────────────────────────────────────────────────────────────────────────────
 * BUNDLE PREFLIGHT — "bundle BEFORE shells", enforced.
 *
 * Every shell consumes the component library as a destructure off the IIFE
 * global:  `const { createTopbar, attachCallUi, … } = window.Spixi;`  (plus the
 * odd `window.Spixi.x` member access). The bundle is inlined verbatim by the
 * inliner, so a STALE src/demo/spixi.iife.js — e.g. build-demo-bundle.mjs threw
 * and nobody noticed — silently yields `undefined` for the new symbols, and the
 * FIRST call throws while the initial view is still hidden: the app boots BLANK
 * with only a console error (Damir F5 2026-07-11 — a bundle without attachCallUi
 * blanked the whole home pane).
 *
 * Ruling (#46 loop over Batch A): FAIL LOUD here — never a runtime
 * `typeof x === 'function'` guard in the shells, which would silently ship a
 * feature-less app. Verified against the ARTIFACT we are about to inline (not
 * re-derived from sources) — staleness is exactly what we are hunting.
 *
 * False positives are the enemy: an unreadable destructure SKIPS that shell with
 * a warning instead of failing the build.
 * ─────────────────────────────────────────────────────────────────────────── */
const BUNDLE_REL = 'src/demo/spixi.iife.js';

/** Loud stop — generators never ship a half-wired artifact (DECISIONS #46). */
function die(lines) {
  console.error('\n✗ build-shells FAILED\n  ' + lines.join('\n  ') + '\n');
  process.exit(1);
}

/** Strip JS comments so commented-out code can't fake a reference, and a comment
 *  inside a destructure can't fake a symbol. `://` in URLs is preserved. */
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Names the BUILT bundle exposes = its generated `window.Spixi = { a: a, … };` map. */
function readBundleExports() {
  let text = '';
  try {
    text = readFileSync(join(root, BUNDLE_REL), 'utf8');
  } catch {
    die([`${BUNDLE_REL} not found — the shells have no component library to inline.`,
      'Fix: node scripts/build-demo-bundle.mjs   (bundle BEFORE shells)']);
  }
  const maps = [...text.matchAll(/window\.Spixi\s*=\s*\{([^{}]*)\}/g)];
  const names = new Set();
  if (maps.length) {
    for (const part of maps[maps.length - 1][1].split(',')) {
      const key = part.split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(key)) names.add(key);
    }
  }
  if (!names.size) {
    die([`could not read the export map out of ${BUNDLE_REL}.`,
      'Expected the generated `window.Spixi = { name: name, … };` line — the file looks',
      'corrupt, truncated or hand-edited, and inlining it would ship a dead app.',
      'Fix: node scripts/build-demo-bundle.mjs   (bundle BEFORE shells)']);
  }
  return names;
}

/** Bundle symbols a shell SOURCE references. `null` = the destructure is not
 *  machine-readable here → caller skips this shell (never fail a healthy tree). */
function shellBundleSymbols(src) {
  const code = stripJsComments(src);
  const names = new Set();
  for (const m of code.matchAll(/(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*window\.Spixi\b/g)) {
    for (const raw of m[1].split(',')) {
      const entry = raw.trim();
      if (!entry) continue;
      if (entry.startsWith('...')) continue;            // rest element — nothing to verify
      const name = entry.split(/[:=]/)[0].trim();       // `{ a: b }` / `{ a = fallback }`
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) return null; // exotic form → skip this shell
      names.add(name);
    }
  }
  for (const m of code.matchAll(/window\.Spixi\.([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

{
  const exposed = readBundleExports();
  const problems = [];
  const seen = new Set();
  for (const key of keys) {
    const s = SHELLS[key];
    if (!s || seen.has(s.in)) continue;                 // launch: 5 outputs, ONE source
    seen.add(s.in);
    let src;
    try { src = readFileSync(join(root, s.in), 'utf8'); } catch { continue; } // the build loop reports it
    if (!src.includes('spixi.iife.js')) continue;       // shell doesn't use the bundle (e.g. empty_detail)
    const used = shellBundleSymbols(src);
    if (!used) {
      console.warn(`  ! ${s.in}: window.Spixi destructure not machine-readable — preflight SKIPPED for this shell`);
      continue;
    }
    const missing = [...used].filter((n) => !exposed.has(n));
    if (missing.length) problems.push(`${s.in}  →  ${missing.join(', ')}`);
  }
  if (problems.length) {
    die([
      `these shells reference symbols that ${BUNDLE_REL} does NOT export:`,
      '',
      ...problems.map((p) => '    ' + p),
      '',
      'The bundle on disk is STALE (or a component export was renamed/removed).',
      'A missing export lands as `undefined` in the shell\'s `const { … } = window.Spixi;`',
      'and the first call throws before the view is revealed → the app boots BLANK.',
      '',
      'Fix: node scripts/build-demo-bundle.mjs   ← bundle BEFORE shells, then re-run this script.',
      'Nothing was written.',
    ]);
  }
  console.log(`  · bundle preflight OK — ${exposed.size} exports cover every shell reference`);

  /* STRINGS-IIFE PREFLIGHT (Q3 review, #269 loop) — "build-strings-iife BEFORE shells".
   * The shells inline src/demo/strings.iife.js verbatim, and the DOCUMENT LOCALE is set
   * there (SpixiStrings.get → setDocLang → document.documentElement.lang), which is what
   * timestamp.js docLocale() reads for every Intl/toLocale* call. A stale strings IIFE
   * therefore ships silently: correct translated copy, but en-US weekday/month names and
   * 12-hour clocks in every locale — the exact class of bug this loop just fixed, and it
   * fails INVISIBLY (no missing symbol, no console error). Fail loud instead. */
  const STRINGS_REL = 'src/demo/strings.iife.js';
  try {
    const stringsIife = readFileSync(join(root, STRINGS_REL), 'utf8');
    if (!/setDocLang/.test(stringsIife)) {
      die([
        `${STRINGS_REL} is STALE — it does not carry setDocLang (the document-locale side effect).`,
        '',
        'The shells inline it verbatim, so the built app would keep <html lang="en"> and render',
        'en-US dates/times in EVERY locale (timestamp.js docLocale reads documentElement.lang).',
        'This ships silently: the copy translates, the dates do not.',
        '',
        'Fix: node scripts/build-strings-iife.mjs   ← before this script. Nothing was written.',
      ]);
    }
    console.log('  · strings-iife preflight OK — the document-locale side effect is present');
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      die([`${STRINGS_REL} is MISSING. Fix: node scripts/build-strings-iife.mjs`, 'Nothing was written.']);
    }
    throw e;
  }

  // Soft signal (never fatal): component/bridge source newer than the bundle means
  // the shells would inline stale component CODE even when every symbol resolves.
  try {
    const bundleMs = statSync(join(root, BUNDLE_REL)).mtimeMs;
    const newest = (dir) => readdirSync(join(root, dir), { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.js') && !f.name.endsWith('.iife.js'))
      .reduce((max, f) => Math.max(max, statSync(join(root, dir, f.name)).mtimeMs), 0);
    if (Math.max(newest('src/components'), newest('src/bridge')) > bundleMs) {
      console.warn(`  ! WARNING: a component/bridge source is NEWER than ${BUNDLE_REL} — the shells`);
      console.warn('    would inline STALE component code. Run `node scripts/build-demo-bundle.mjs` first.');
    }
  } catch { /* a stat/readdir hiccup must never block a build */ }
  console.log('');
}

mkdirSync(OUT_DIR, { recursive: true });

/* ————————————————————————————————————————————————————————————————————————————
 * #345 SHARED EXTERNALS — the measured fix for slow screen entry.
 *
 * THE MEASUREMENT (Damir's Galaxy A52 5G, PerfTrace, not a guess). Opening a chat
 * cost 498 ms; 453 ms of it happened BEFORE the shell announced itself:
 *   generatePage(chat.html) = 172 ms   read asset + localizeHtml + MAUI base64
 *   loadPage -> shell onLoad = 281 ms  data: URL handover, decode, parse, execute
 * and generatePage is LINEAR in file size — 222 KB = 16 ms, 1625 KB = 114 ms,
 * 2019 KB = 172 ms (~0.08 ms/KB).
 *
 * THE CAUSE. Every shell inlined the SAME ~1.3 MB of shared payload: the component
 * bundle, the strings dictionary, the icon sprite and the base/token CSS. Across 22
 * shells that is ~26 MB of identical bytes, and Android re-read, re-localized and
 * re-base64-encoded all of it on EVERY navigation.
 *
 * THE FIX. Emit those six once, beside the shells, and reference them. chat.html
 * falls from ~2019 KB to ~370 KB, so its generatePage leg should fall to ~30 ms.
 * Per-shell CSS and per-shell page script stay INLINE — they are not shared, so
 * externalising them would only add requests.
 *
 * WHY THIS IS SAFE ON EVERY PLATFORM. Android loads the document with a BaseUrl
 * (loadDataWithBaseURL), so relative refs resolve; `AllowFileAccess` and
 * `AllowFileAccessFromFileURLs` are already true. iOS, MacCatalyst and Windows load
 * from a directory that already receives the whole html tree (symlink on Apple,
 * copy on Windows). The `images/` folder beside the shells has worked this way
 * since #176 — this is the same mechanism, not a new one.
 *
 * WHAT IS DELIBERATELY NOT DONE. The Android WebView keeps `CacheMode.NoCache`.
 * Caching these files would be a further win, but a cached stale bundle after an
 * app update is exactly the #285/#287/#288 shipped-stale-artefact class. The 140 ms
 * above does not depend on caching. Chase the cache later, with a measurement and a
 * content-hashed filename.
 * ———————————————————————————————————————————————————————————————————————————— */
const EXTERNALS = [
  { src: 'src/demo/spixi.iife.js',        out: 'spixi.bundle.js',       ref: '../demo/spixi.iife.js' },
  { src: 'src/demo/strings.iife.js',      out: 'spixi.strings.js',      ref: '../demo/strings.iife.js' },
  { src: 'src/components/icons.iife.js',  out: 'spixi.icons.js',        ref: '../components/icons.iife.js' },
  { src: 'src/styles/tokens.css',         out: 'spixi.tokens.css',      ref: '../styles/tokens.css',      css: true },
  { src: 'src/styles/base.css',           out: 'spixi.base.css',        ref: '../styles/base.css',        css: true },
  { src: 'src/styles/chat-pattern.css',   out: 'spixi.chat-pattern.css', ref: '../styles/chat-pattern.css', css: true },
];
const externalMap = new Map();
{
  let shared = 0;
  for (const e of EXTERNALS) {
    const abs = join(root, e.src);
    if (!existsSync(abs)) { console.warn(`  ! external missing, will stay inline: ${e.src}`); continue; }
    let body = readFileSync(abs, 'utf8');
    // CSS keeps its fonts inlined as data: URIs — the font is 44 KB and lives in
    // exactly one shared file now, so there is nothing to gain by a second request.
    if (e.css) body = inlineFonts(body, dirname(abs));
    writeFileSync(join(OUT_DIR, e.out), body);
    externalMap.set(e.ref, e.out);
    shared += body.length;
    console.log(`  · external  ${e.out.padEnd(24)} ${(body.length / 1024).toFixed(0).padStart(5)} KB   ← ${e.src}`);
  }
  console.log(`  · ${(shared / 1024).toFixed(0)} KB shared once instead of ${(shared * 22 / 1024 / 1024).toFixed(1)} MB duplicated across 22 shells\n`);
}

// Copy the demos' runtime illustrations (referenced from JS as images/… — not
// static <img>, so the inliner can't reach them). With them beside the shells,
// relative `images/…` refs resolve; missing ones already fail-soft in-component.
const IMAGES_SRC = join(root, 'src', 'demo', 'images');
if (existsSync(IMAGES_SRC)) {
  cpSync(IMAGES_SRC, join(OUT_DIR, 'images'), { recursive: true });
  console.log('  · copied src/demo/images → Resources/Raw/html/images\n');
}

console.log('Building shells → Spixi/Resources/Raw/html  (Stage 4a: mock data, drop-in)\n');
let n = 0;
for (const key of keys) {
  const s = SHELLS[key];
  if (!s) { console.warn(`  ? unknown shell "${key}" — known: ${Object.keys(SHELLS).join(', ')}`); continue; }
  let html = inlineHtml(join(root, s.in), { device: true, strict: true, external: externalMap }); // strict: throws on unresolved refs
  /* #345 BOOT GUARD. The bundle now arrives at RUNTIME, so a missing or blocked
     file turns `const { … } = window.Spixi` into a TypeError behind a blank screen —
     the exact failure the build-time preflight below was written to prevent, moved
     from build time to device time. This says so on screen instead. It costs one
     line and it is the difference between "the app is broken" and a fixable report. */
  // ⚠ Only shells that ACTUALLY reference the bundle get the guard. empty_detail.html
  // never carried it (it is icons + base + tokens only, 9 KB), so an unconditional
  // guard fired a false alarm in the desktop detail pane — Damir saw the red panel
  // beside a perfectly healthy chats list on the first Windows run.
  if (html.includes('spixi.bundle.js')) html = html.replace(/<\/body>/i,
    '<script>if(!window.Spixi){console.error("SPIXI: bundle did not load");'
    + 'document.documentElement.innerHTML='
    + '\'<pre style="margin:0;padding:24px;font:13px/1.5 monospace;color:#f66;background:#13171b">'
    + 'Spixi could not load spixi.bundle.js.\\n\\nThe shell and its shared assets must sit in the '
    + 'SAME folder.\\nRe-run: node scripts/build-shells.mjs</pre>\';}</script>\n</body>');
  // launch: inject the per-file boot view BEFORE any script runs (the shell reads
  // window.__LAUNCH_VIEW__ to pick welcome/create/restore/retry/tail).
  if (s.bootView) {
    html = html.replace(/<body[^>]*>/i, (m) => `${m}\n<script>window.__LAUNCH_VIEW__=${JSON.stringify(s.bootView)};</script>`);
  }
  const outPath = join(OUT_DIR, s.out);
  writeFileSync(outPath, html);
  n++;
  console.log(`  ✓ ${s.out.padEnd(20)} (${(html.length / 1024).toFixed(0)} KB)  ← ${s.in}   [${s.page}]`);
}
console.log(`\n${n} shell(s) written. These OVERWRITE the legacy files of the same name — restore with \`git checkout -- Spixi/Resources/Raw/html\`.`);
console.log('Next: build/run the net10.0-windows target and walk maui-integration-test-plan §7.');
