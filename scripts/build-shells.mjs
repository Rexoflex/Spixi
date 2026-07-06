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
const SHELLS = {
  chat:     { in: 'src/shells/chat.html',   out: 'chat.html',        page: 'SingleChatPage' },
  home:     { in: 'src/shells/home.html',   out: 'index.html',       page: 'HomePage (chats tab)' },
  apps:     { in: 'src/demo/apps.html',     out: 'apps.html',        page: 'AppsPage' },
  settings: { in: 'src/demo/settings.html', out: 'settings.html',    page: 'SettingsPage' },
  launch:   { in: 'src/demo/launch.html',   out: 'intro.html',       page: 'LaunchPage (welcome)' },
  payments: { in: 'src/demo/wallet.html',   out: 'wallet_send.html', page: 'WalletSendPage' },
  // scan / contacts / lock live INSIDE other demos (takeover pattern) — they need
  // dedicated src/shells/ entries at Stage 4b (native.js + setRoute), not a demo drop-in.
};

const DEFAULT = ['chat', 'home'];
const arg = process.argv.slice(2);
const keys = arg.length === 0 ? DEFAULT : arg.includes('all') ? Object.keys(SHELLS) : arg;

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
  const html = inlineHtml(join(root, s.in), { device: true, strict: true }); // strict: throws on unresolved refs
  const outPath = join(OUT_DIR, s.out);
  writeFileSync(outPath, html);
  n++;
  console.log(`  ✓ ${s.out.padEnd(20)} (${(html.length / 1024).toFixed(0)} KB)  ← ${s.in}   [${s.page}]`);
}
console.log(`\n${n} shell(s) written. These OVERWRITE the legacy files of the same name — restore with \`git checkout -- Spixi/Resources/Raw/html\`.`);
console.log('Next: build/run the net10.0-windows target and walk maui-integration-test-plan §7.');
