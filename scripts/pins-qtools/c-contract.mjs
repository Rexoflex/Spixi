/* ==== qtools c-contract — docs/bridge-contract.json (I3) equals a fresh generate of scripts/quality/bridge-contract.mjs (I2)
 * on the tree, and the --check names each verb a deliberate break adds, removes or moves (#802, a permanent self-test).
 *
 * HOW. The breaks run in ONE mkdtemp copy of the files the checks read (the isolation pin's `copyTree`); each writes one
 * file, regenerates in-process, compares with the committed contract by `diff()` (the --check comparison) and writes the
 * file back. Two rows run the CLI itself as a child process: the clean tree exits 0 (run in parallel with the rest), the
 * renamed shell verb exits 1 and prints the verb. The temp tree is removed at the end, also on a throw.
 *
 * LIMITS (#1735). It proves the generator is deterministic on this tree and that the comparison sees the shapes below; it
 * does not prove the generator finds every spelling of a verb (bridge-contract.mjs's head lists what it cannot see). The
 * C# is never compiled. The "parsers" key is the lead's: this pin only checks that --check ignores it.
 *
 * BREAKS (expected difference ← edit):
 *   viewexplorer2 ADDED + viewexplorer MOVED (senders)       ← src/shells/wallet_sent.html sends 'ixian:viewexplorer2'
 *   viewexplorer2 ADDED + viewexplorer MOVED (handler file)  ← WalletSentPage tests "ixian:viewexplorer2"
 *   viewcontact MOVED + viewexplorer MOVED (handler file)    ← ContactNewPage's test moves from viewcontact to viewexplorer
 *   typing + typingIndicators CHANGED (marks)                ← SingleChatPage's typing branch calls IxianHandler.addTransaction
 *                                                              (its test is the PREFIX `ixian:typing`, so both verbs pass it)
 *   an unlisted DYNAMIC emit                                 ← contact_details.html composes 'ixian:' + action + '::'
 *   a read error (exit 2 path)                               ← scripts/build-shells.mjs loses its SHELLS entries */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate, analyze, toContract, diff, stringify, CONTRACT_FILE } from '../quality/bridge-contract.mjs';
import { ReadError } from '../quality/lib-csharp.mjs';
import { copyTree, edit } from './c-isolation.mjs';

const CLI = fileURLToPath(new URL('../quality/bridge-contract.mjs', import.meta.url));
const SENT_SRC = 'src/shells/wallet_sent.html', SENT = 'Spixi/Pages/Wallet/WalletSentPage.xaml.cs', CNEW = 'Spixi/Pages/Contacts/ContactNewPage.xaml.cs',
  CHAT = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', CD = 'src/shells/contact_details.html', BUILD_SHELLS = 'scripts/build-shells.mjs';

export const BREAKS = [
  { name: 'shell rename', file: SENT_SRC, from: "bridge.send('ixian:viewexplorer')", to: "bridge.send('ixian:viewexplorer2')",
    want: ['viewexplorer2:added', 'viewexplorer:moved:senders'] },
  { name: 'native rename', file: SENT, from: 'current_url.Equals("ixian:viewexplorer"', to: 'current_url.Equals("ixian:viewexplorer2"',
    want: ['viewexplorer2:added', 'viewexplorer:moved:handler file'] },
  { name: 'handler moved', file: CNEW, from: 'current_url.StartsWith("ixian:viewcontact:"', to: 'current_url.StartsWith("ixian:viewexplorer:"',
    want: ['viewcontact:moved:handler file', 'viewexplorer:moved:handler file'] },
  { name: 'marks', file: CHAT, from: 'else if (current_url.StartsWith("ixian:typing"))\n            {', to: 'else if (current_url.StartsWith("ixian:typing"))\n            {\n                IxianHandler.addTransaction(null, true);',
    want: ['typing:changed:marks', 'typingIndicators:changed:marks'] },
];

const shape = (d) => d.map((x) => x.verb + ':' + x.kind + (x.kind === 'moved' ? ':' + x.fields[0] : x.kind === 'changed' ? ':' + x.fields.join('+') : '')).sort();

export default async function (h) {
  const { ok, root } = h;
  const t0 = Date.now();
  /* the clean CLI run goes in parallel with the in-process rows (it only reads the tree) */
  const cleanRunP = new Promise((res) => {
    const c = spawn(process.execPath, [CLI, '--root', root, '--check'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { out += d; });
    c.on('close', (status) => res({ status, out }));
  });
  const committed = JSON.parse(readFileSync(join(root, CONTRACT_FILE), 'utf8'));
  const fresh = await generate(root);
  const d0 = diff(committed, fresh);
  ok(d0.length === 0, 'QTOOLS c-contract: ' + CONTRACT_FILE + ' equals a fresh generate — ' + (d0.length ? shape(d0).slice(0, 6).join(' ') : 'equal'));
  const again = await generate(root);
  ok(stringify(again) === stringify(fresh), 'QTOOLS c-contract: two generates give the same bytes (deterministic: sorted keys, no line numbers)');
  ok(committed.schema === 1 && committed.generator === 'scripts/quality/bridge-contract.mjs' && Array.isArray(committed.parsers) && Object.keys(committed.verbs).length >= 150
    && Object.keys(committed.verbs).join('\n') === Object.keys(committed.verbs).sort().join('\n') && !/"line"|:\d+"/.test(JSON.stringify(committed.verbs)),
  'QTOOLS c-contract: the file has the I3 shape (schema 1, generator, verbs sorted, parsers array, no line numbers)');
  const withParsers = { ...committed, parsers: ['some/parser.js'] };
  ok(diff(withParsers, fresh).length === 0, 'QTOOLS c-contract: --check ignores the "parsers" key (the lead fills it)');

  let dir = null;
  try {
    dir = copyTree(root, 'qtools-contract-');
    const ctl = diff(committed, await generate(dir));
    ok(ctl.length === 0, 'QTOOLS c-contract: the copy generates the committed contract (control) — ' + shape(ctl).join(' '));
    for (const b of BREAKS) {
      const p = join(dir, b.file);
      const orig = readFileSync(p, 'utf8');
      const next = edit(orig, b.from, b.to);
      if (next === null) { ok(false, 'QTOOLS c-contract: break "' + b.name + '" — the anchor is not where the pin expects it in ' + b.file); continue; }
      writeFileSync(p, next);
      try {
        const got = shape(diff(committed, await generate(dir)));
        ok(got.join(' ') === [...b.want].sort().join(' '), 'QTOOLS c-contract: break "' + b.name + '" is named exactly — want [' + [...b.want].sort().join(' ') + '] got [' + got.join(' ') + ']');
        if (b.name === 'shell rename') {
          const run = spawnSync(process.execPath, [CLI, '--root', dir, '--check'], { encoding: 'utf8' });
          ok(run.status === 1 && /ADDED viewexplorer2\b/.test(run.stdout) && /MOVED viewexplorer \(senders/.test(run.stdout),
            'QTOOLS c-contract: the CLI --check exits 1 and prints the added and the moved verb — status ' + run.status + ' ' + run.stdout.trim().split('\n').slice(0, 2).join(' / '));
        }
      } finally { writeFileSync(p, orig); }
    }
    /* an unlisted dynamic emit */
    const cdp = join(dir, CD);
    const cd = readFileSync(cdp, 'utf8');
    const cd2 = edit(cd, "bridge.send('ixian:' + action + ':' + m.address);", "bridge.send('ixian:' + action + '::' + m.address);");
    if (cd2 === null) ok(false, 'QTOOLS c-contract: break "dynamic" — the anchor is not where the pin expects it in ' + CD);
    else {
      writeFileSync(cdp, cd2);
      try {
        const an = await analyze(dir);
        const un = an.dynamic.filter((x) => !x.listed);
        ok(un.length === 1 && un[0].file === CD && un[0].shape === 'ixian:*::*', 'QTOOLS c-contract: break "dynamic" — an unlisted run-time verb is reported (--check / --write exit 1) — ' + JSON.stringify(un));
        const lost = shape(diff(committed, toContract(an)));
        ok(lost.join(' ') === 'ban:moved:senders kick:moved:senders', 'QTOOLS c-contract: break "dynamic" — the verbs the listed site formed lose that sender — [' + lost.join(' ') + ']');
      } finally { writeFileSync(cdp, cd); }
    }
    /* fail closed */
    const bp = join(dir, BUILD_SHELLS);
    const bs = readFileSync(bp, 'utf8');
    writeFileSync(bp, bs.replace(/\bin:\s*'src\/shells\//g, "src: 'src/shells/"));
    let threw = null;
    try { await generate(dir); } catch (e) { threw = e; }
    ok(threw instanceof ReadError, 'QTOOLS c-contract: a build table it cannot read is a read error (exit 2), not an empty contract — ' + (threw ? threw.message.slice(0, 120) : 'no error'));
    writeFileSync(bp, bs);
    ok(diff(committed, await generate(dir)).length === 0, 'QTOOLS c-contract: every break was written back (the copy generates the committed contract again)');
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  const cleanRun = await cleanRunP;
  ok(cleanRun.status === 0 && /OK/.test(cleanRun.out), 'QTOOLS c-contract: `bridge-contract.mjs --check` exits 0 on the tree — status ' + cleanRun.status + ' ' + cleanRun.out.trim().split('\n').pop());
  ok(Date.now() - t0 < 60000, 'QTOOLS c-contract: the module ran in ' + (Date.now() - t0) + ' ms');
}
