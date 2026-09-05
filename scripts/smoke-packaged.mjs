#!/usr/bin/env node
/**
 * smoke-packaged.mjs — GATE 2 of the comment-strip fork (Session N; strip-release.mjs
 * carries gate 1 and the rationale). Runs the WHOLE smoke suite over a PACKAGED tree —
 * i.e. what a Release build ships after strip-release.mjs — at least once per release.
 *
 * Why a separate runner: ~4 000 pins read the COMMITTED artifacts under
 * Spixi/Resources/Raw/html (55 sources do so directly), and after the fork those are no
 * longer what ships. Gate 1 proves the strip was deterministic; only running the suite
 * over the stripped tree proves it was HARMLESS — a pin that reads prose out of an
 * allowlisted stylesheet, or a shell that depends on a comment surviving, is found here
 * and nowhere else.
 *
 * What it does, in a FULL copy (never the working tree, never cp -al):
 *   1. copies the repo (minus .git and node_modules) into a temp dir, symlinks node_modules
 *   2. runs the copy's strip-release.mjs --out over its own Raw/html  (the package)
 *   3. runs THIS tree's strip-release.mjs --check against it            (gate 1, standalone)
 *   4. runs the copy's smoke-test.mjs with SPIXI_PACKAGED_FROM=<this Raw/html>, which
 *      makes the in-suite artifact gate ask gate 1's question instead of build-shells'
 *   5. prints the copy's verdict line and exits with its status
 *
 * USAGE   node scripts/smoke-packaged.mjs [--keep]     (--keep leaves the temp copy for inspection)
 * Takes as long as the suite (~5 min in the container). Record the verdict in DECISIONS
 * with the release it covers.
 */
import { mkdtempSync, rmSync, symlinkSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
const tmp = mkdtempSync(join(tmpdir(), 'spixi-packaged-'));
const copy = join(tmp, 'Spixi');
const q = JSON.stringify;

try {
  console.log('smoke-packaged: copying the tree → ' + copy);
  // Node's own copy, so the same script runs on Damir's PC (no tar/mkdir -p in cmd)
  mkdirSync(copy, { recursive: true });
  // #46 auditor B: obj/ bin/ local-nuget/ _to_delete/ are excluded too — hundreds of MB per run on the PC otherwise
  cpSync(root, copy, { recursive: true, filter: (p) => !/[\\/](?:\.git|node_modules|obj|bin|local-nuget|_to_delete)(?:[\\/]|$)/.test(p.slice(root.length)) });
  if (existsSync(join(root, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(copy, 'node_modules'), 'junction');

  const copyRaw = join(copy, 'Spixi', 'Resources', 'Raw', 'html');
  console.log('smoke-packaged: stripping the copy in place (the package)');
  execSync(q(process.execPath) + ' ' + q(join(copy, 'scripts', 'strip-release.mjs')) + ' --out ' + q(copyRaw), { stdio: 'inherit' });

  console.log('smoke-packaged: GATE 1 from the committed tree');
  execSync(q(process.execPath) + ' ' + q(join(root, 'scripts', 'strip-release.mjs')) + ' --check ' + q(copyRaw), { stdio: 'inherit' });

  console.log('smoke-packaged: GATE 2 — the suite over the packaged tree (this takes as long as the suite)');
  const r = spawnSync(process.execPath, [join(copy, 'scripts', 'smoke-test.mjs')], {
    cwd: copy,
    env: { ...process.env, SPIXI_PACKAGED_FROM: join(root, 'Spixi', 'Resources', 'Raw', 'html') },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = (r.stdout || '').trim().split('\n');
  const reds = lines.filter((l) => /✗/.test(l));
  console.log(reds.map((l) => '  ' + l.slice(0, 220)).join('\n'));
  const verdict = lines.reverse().find((l) => /BASELINE OK|smoke test CLEAN/.test(l));
  console.log('smoke-packaged: ' + (verdict || '(no verdict line — see FAILED below)'));
  if (r.stderr && r.status !== 0) console.error(r.stderr.trim().split('\n').slice(-12).join('\n'));
  if (r.status !== 0) { console.error('smoke-packaged: GATE 2 FAILED — the packaged tree does not pass the suite'); process.exit(1); }
  console.log('smoke-packaged: GATE 2 OK — the packaged tree passes the suite');
} finally {
  if (keep) console.log('smoke-packaged: copy kept at ' + tmp);
  else rmSync(tmp, { recursive: true, force: true });
}
