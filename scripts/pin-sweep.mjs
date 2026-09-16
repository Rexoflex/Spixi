/**
 * pin-sweep — WHICH PINS READ A FILE THIS BATCH CHANGED?
 *
 * ★★ WHY THIS EXISTS (Session U, #859). Session U retired a pattern renderer, a style, a
 * ground option, a CSS enumeration and a bridge verb, then swept the suite for the TOKEN
 * NAMES it had changed — 'doodles', 'flow', CHAT_GROUNDS, PATTERN_STYLES. Fifteen pins were
 * found and re-based that way, the tree went green, and EIGHT MORE were still red on Damir's
 * run: the #560 inset enumeration, the ADD-APP `ixian:newapp` absence, the Session F :root
 * default, the W5 attribute-selector pair, the E1 flow fallback, the #755 ground read-back
 * and the Session M swatch boost. None of them mentioned a token I had grepped for; every
 * one of them READ A FILE I had edited.
 *
 * That is #798 charged against the person who kept citing it: a sweep written from the
 * author's list of what he thinks he changed is not a sweep. The derivable question is the
 * other one — which pins read the files the commit actually touched — and it has a precise,
 * boring answer that no amount of guessing reproduces (432 read sites, that session).
 *
 * Run:  node scripts/pin-sweep.mjs [baseRef] [headRef]     (defaults: HEAD~1 HEAD)
 *       node scripts/pin-sweep.mjs --working                (uncommitted changes)
 *
 * ⚠ It reports READ SITES, not failures — it cannot know which pin a change invalidates.
 * It tells you where to LOOK, which is the part that was being guessed at.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const working = argv.includes('--working');
const [base = 'HEAD~1', head = 'HEAD'] = argv.filter((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', ['--no-optional-locks', ...a], { cwd: root, encoding: 'utf8' });

let files = (working
  ? git('status', '--short').split('\n').map((l) => l.slice(3).trim())
  : git('diff', '--name-only', base, head).split('\n')
).filter(Boolean);

/* Generated artifacts and assets are excluded: a pin that reads a BUILT file is asserting
   the build, and the build is re-run anyway. The suite itself is excluded — it is the
   subject, not a subject. */
const SKIP = [/^src\/assets\//, /^Spixi\/Resources\//, /^docs\//, /smoke-test\.mjs$/, /^_to_delete\//];
files = files.filter((f) => !SKIP.some((r) => r.test(f)));

const lines = readFileSync(join(root, 'scripts/smoke-test.mjs'), 'utf8').split('\n');
const hits = new Map();
for (const f of files) {
  const at = [];
  lines.forEach((l, i) => { if (l.includes("'" + f + "'")) at.push(i + 1); });
  if (at.length) hits.set(f, at);
}

const total = [...hits.values()].reduce((n, a) => n + a.length, 0);
console.log('\npin-sweep: ' + files.length + ' changed file(s), ' + hits.size
  + ' read by the suite, ' + total + ' read site(s) to review\n');
for (const f of [...hits.keys()].sort()) {
  console.log('  ' + f.padEnd(46) + String(hits.get(f).length).padStart(3) + '  lines ' + hits.get(f).slice(0, 14).join(', ')
    + (hits.get(f).length > 14 ? ' …' : ''));
}
const un = files.filter((f) => !hits.has(f));
if (un.length) console.log('\n  changed and unpinned (nothing asserts these):\n    ' + un.join('\n    '));
console.log('\n⚠ Read sites, not failures. Every one is a place a pin can have gone stale on this change.\n');
