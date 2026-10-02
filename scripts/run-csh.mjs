/**
 * ★ #46 r1 M2 (session 2): run the C# harness (scripts/csh) — the REAL pure C# rules + their MSTest classes, executed.
 * Run: node scripts/run-csh.mjs   → exit 0 with "CSH pass=N fail=0"; exit 1 on any failure; exit 3 when no .NET SDK.
 * A GATE beside the smoke (docs/process.md G2): the smoke cannot compile C#, and the MSTest project never runs on
 * this branch's CI.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = join(dirname(fileURLToPath(import.meta.url)), 'csh');
const which = spawnSync('dotnet', ['--version'], { encoding: 'utf8' });
if (which.status !== 0) { console.log('run-csh: SKIPPED — no .NET SDK on PATH (install .NET 8+). This gate is NOT passed.'); process.exit(3); }
const r = spawnSync('dotnet', ['run', '--project', dir], { encoding: 'utf8', cwd: dir });
const out = (r.stdout || '') + (r.stderr || '');
const lines = out.split(/\r?\n/).filter((l) => /^\s+[✓✗]|CSH pass=|error/.test(l));
console.log(lines.join('\n'));
const m = /CSH pass=(\d+) fail=(\d+)/.exec(out);
if (!m) { console.log('run-csh: the harness did not run (build error?)\n' + out.slice(-2000)); process.exit(1); }
process.exit(Number(m[2]) === 0 ? 0 : 1);
