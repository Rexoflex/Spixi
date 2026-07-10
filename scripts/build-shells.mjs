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
 */
import { writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineHtml } from './lib/inline.mjs';

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
  // Track C (#186+): scan + lock are now dedicated bridge-wired shells (adapters
  // scan-page.js / lock-page.js in the bundle). Drop in over the legacy filenames
  // the C# ScanPage / LockPage already load — ZERO C# change, frozen bridge.
  scan:     { in: 'src/shells/scan.html',   out: 'scan.html',        page: 'ScanPage' },
  lock:     { in: 'src/shells/lock.html',   out: 'lock.html',        page: 'LockPage' },
  // #248: desktop right-pane resting state (EmptyDetail) — replaces the always-dark
  // legacy page that clashed with light mode. Static, *SL{}-localized.
  empty_detail: { in: 'src/shells/empty_detail.html', out: 'empty_detail.html', page: 'EmptyDetail' },
  // contacts still lives INSIDE the chats demo (takeover pattern) — needs a
  // dedicated src/shells/ entry (native.js + setRoute), not a demo drop-in.
};

// `launch` shorthand expands to all five launch filenames (build them as a set).
const LAUNCH_KEYS = ['launch', 'launch-create', 'launch-restore', 'launch-retry', 'launch-tail'];

const DEFAULT = ['chat', 'contact_details', 'contact_new', 'home', 'settings', 'app_details', 'app_new',
  'settings_backup', 'settings_encryption', 'scan', 'lock', 'downloads', 'dev', 'contributors',
  'empty_detail'];   // bridge-wired shells (real C# data)
const arg = process.argv.slice(2);
let keys = arg.length === 0 ? DEFAULT : arg.includes('all') ? Object.keys(SHELLS) : arg;
// `launch` alone means the whole launch set (all five drop-in files)
keys = keys.flatMap((k) => (k === 'launch' && arg.length && !arg.includes('all')) ? LAUNCH_KEYS : [k]);
keys = [...new Set(keys)];

mkdirSync(OUT_DIR, { recursive: true });

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
  let html = inlineHtml(join(root, s.in), { device: true, strict: true }); // strict: throws on unresolved refs
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
