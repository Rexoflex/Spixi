/* ==== walktools2 · D — the lockfile of the test tools (ruling #1831; contract item 4, interface I-4).
 * RULE (k9): the WHOLE tree of the lock is held, not only the five tools. k9 hashes the sorted list `path@version@integrity` of every package entry of
 * package-lock.json (122 rows today). An `npm update`, an `npm i <x>` or a hand edit that moves ANY package under the five tools turns k9 red. A deliberate
 * change of the tree re-bases WANT_TREE_SHA256 below, after a look at the diff of the lock and a full smoke (#1634); it is never re-based to "make it green".
 * Before this batch the five tools came from
 * `npm i --no-save <five name@version>` and every package UNDER them was whatever the registry served that day. Now package.json (the five at EXACT
 * versions) + package-lock.json (lockfileVersion 3, made by npm 10.9.9 / Node 22) + `npm ci` pin the whole tree, and jsdom stays 29.1.1 (L160).
 *
 * LIMITS. Pure node, SOURCE pins on three committed files (package.json, package-lock.json, .github/workflows/redesign-ci.yml) plus one READ of the
 * installed tree (node_modules/<name>/package.json of the five). Nothing here runs npm, reaches the network, or proves that a registry tarball matches its
 * `integrity` (npm ci does that when it installs; a hash is checked there, not here). The workflow is cut by lines, not parsed as YAML (no YAML package is
 * installed); GitHub Actions did not run this file. k8 reads the five installed versions only: a transitive package changed by hand in node_modules is NOT
 * seen (npm ci replaces node_modules, so the proof that `npm ci` installs the tree of the old line was made BY HAND with a compare script, in the
 * builder's report). The smoke always runs after an install: with no node_modules k8 FAILS, it never skips. The expected versions are held in WANT below;
 * moving a pin means editing package.json, the lock and WANT together, after a full smoke on the new version.
 *   k1 devDeps    — package.json devDependencies = exactly the five names at the exact versions (no ^ ~ > < * x range, no tag, no URL); `dependencies` absent or empty
 *   k2 shape      — "private": true, no "type", no other dependency block (optional / peer / bundled / overrides), no script that runs on install or on pack; the KEY SET is frozen: exactly name, private, description, devDependencies (so `imports`, `exports`, `packageManager`, `engines`, `devEngines`, `scripts`, `main`, `bin` … are red)
 *   k3 lockRoot   — the lock's root entry packages[""] has devDependencies equal to package.json's, and nothing else that installs (no dependencies block)
 *   k4 version    — lockfileVersion is 3 and the packages map is there
 *   k5 jsdom      — node_modules/jsdom in the lock is 29.1.1, and so is each of the other four at its WANT version
 *   k6 integrity  — every package entry of the lock has `resolved` (https://registry.npmjs.org/ only) and `integrity` (sha512), and none is a link
 *   k7 ci         — the install step of redesign-ci.yml is exactly `run: npm ci`; no `npm i` / `npm install` / `--no-save` line in the workflow
 *   k8 installed  — node_modules/<name>/package.json of the five reads the same version as the lock entry (absent node_modules = FAIL)
 *   k9 tree       — SHA-256 of the sorted list `path@version@integrity` of every lock package entry (122 rows) = WANT_TREE_SHA256: the transitive tree is held (ruling #1831)
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a full copy of the tree (node scripts/run-pins.mjs --root <copy>). */
const WANT = { eslint: '10.14.0', globals: '17.14.0', jsdom: '29.1.1', 'tree-sitter': '0.25.1', 'tree-sitter-c-sharp': '0.23.5' };
const NAMES = Object.keys(WANT);
const EXACT = /^\d+\.\d+\.\d+$/;
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare', 'prepack', 'postpack'];
const REGISTRY = 'https://registry.npmjs.org/';
/* k9: SHA-256 of the sorted `path@version@integrity` rows (one per lock entry except the root, joined by "\n"). Base 2026-11-23, 122 rows, npm 10.9.9.
 * A change of the tree re-bases this constant AFTER a look at the diff of package-lock.json and a full smoke (#1634); do not run `npm audit fix` to move it. */
const WANT_TREE_SHA256 = '390165c10fe01b45650d62a8605281fc53a397a89716bc21d85813b385fcfc81';
const WANT_TREE_ROWS = 122;
const PKG_KEYS = ['name', 'private', 'description', 'devDependencies'];

import { createHash } from 'node:crypto';

export default async function ({ ok, root, readFileSync, existsSync, join }) {
  const jsonAt = (rel) => {
    const p = join(root, rel);
    if (!existsSync(p)) return { v: null, err: rel + ' is missing' };
    try { return { v: JSON.parse(readFileSync(p, 'utf8')), err: '' }; } catch (e) { return { v: null, err: rel + ' does not parse: ' + e.message }; }
  };
  const same = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort());
  const key = (id, what, gaps) => ok(gaps.length === 0, '★ walktools2 D (' + id + '): ' + what + (gaps.length ? ' — GAPS: ' + gaps.slice(0, 6).join(' | ') + (gaps.length > 6 ? ' | … (+' + (gaps.length - 6) + ')' : '') : ''));
  const P = jsonAt('package.json'); const L = jsonAt('package-lock.json');
  const pkg = P.v || {}; const lock = L.v || {}; const lp = lock.packages && typeof lock.packages === 'object' ? lock.packages : {};

  /* k1 */
  { const g = []; if (P.err) g.push(P.err);
    const dd = pkg.devDependencies || {};
    for (const n of NAMES) { if (!(n in dd)) g.push(n + ' missing'); else if (!EXACT.test(String(dd[n]))) g.push(n + ' is "' + dd[n] + '" (not an exact version)'); else if (dd[n] !== WANT[n]) g.push(n + ' is ' + dd[n] + ', want ' + WANT[n]); }
    for (const n of Object.keys(dd)) if (!NAMES.includes(n)) g.push('extra devDependency ' + n);
    if (pkg.dependencies && Object.keys(pkg.dependencies).length) g.push('dependencies is not empty');
    key('k1 devDeps', 'package.json devDependencies = the five tools (eslint, globals, jsdom, tree-sitter, tree-sitter-c-sharp) at exact versions, nothing in dependencies', g); }

  /* k2 */
  { const g = []; if (P.err) g.push(P.err);
    if (pkg.private !== true) g.push('"private" is not true');
    if ('type' in pkg) g.push('"type" is set');
    for (const k of Object.keys(pkg)) if (!PKG_KEYS.includes(k)) g.push('key "' + k + '" is not allowed (only ' + PKG_KEYS.join(', ') + ')');
    if (typeof pkg.name !== 'string' || !pkg.name) g.push('no name');
    if (typeof pkg.description !== 'string' || !pkg.description || /[\r\n]/.test(pkg.description)) g.push('description is not one line');
    for (const b of ['optionalDependencies', 'peerDependencies', 'bundleDependencies', 'bundledDependencies', 'overrides', 'resolutions', 'workspaces']) if (b in pkg) g.push(b + ' is set');
    for (const s of Object.keys(pkg.scripts || {})) if (INSTALL_HOOKS.includes(s)) g.push('script "' + s + '" runs on install / pack');
    key('k2 shape', 'package.json is private, has no "type", no other dependency block, no script that runs on install, and holds exactly the keys name, private, description, devDependencies', g); }

  /* k3 */
  { const g = []; if (L.err) g.push(L.err); if (P.err) g.push(P.err);
    const r = lp[''];
    if (!r) g.push('the lock has no root entry packages[""]');
    else {
      if (!same(r.devDependencies, pkg.devDependencies)) g.push('root devDependencies ' + JSON.stringify(r.devDependencies) + ' ≠ package.json ' + JSON.stringify(pkg.devDependencies));
      for (const b of ['dependencies', 'optionalDependencies', 'peerDependencies']) if (r[b] && Object.keys(r[b]).length) g.push('root entry holds ' + b);
    }
    if (lock.name !== undefined && lock.name !== pkg.name) g.push('lock name "' + lock.name + '" ≠ package.json name "' + pkg.name + '"');
    key('k3 lockRoot', 'the root entry of package-lock.json lists the same devDependencies as package.json (and no dependencies)', g); }

  /* k4 */
  { const g = []; if (L.err) g.push(L.err);
    if (lock.lockfileVersion !== 3) g.push('lockfileVersion is ' + lock.lockfileVersion + ', want 3');
    if (Object.keys(lp).length < 2) g.push('no packages map');
    key('k4 version', 'package-lock.json is lockfileVersion 3 with a packages map', g); }

  /* k5 */
  { const g = []; if (L.err) g.push(L.err);
    for (const n of NAMES) { const e = lp['node_modules/' + n]; if (!e) g.push('node_modules/' + n + ' not in the lock'); else if (e.version !== WANT[n]) g.push('node_modules/' + n + ' is ' + e.version + ', want ' + WANT[n]); }
    key('k5 jsdom', 'the lock holds jsdom 29.1.1 (L160, ruling #1831) and the other four tools at their pinned versions', g); }

  /* k6 */
  { const g = []; if (L.err) g.push(L.err); let n = 0;
    for (const [k, e] of Object.entries(lp)) {
      if (k === '') continue; n++;
      if (e.link) g.push(k + ' is a link');
      if (typeof e.resolved !== 'string' || !e.resolved.startsWith(REGISTRY)) g.push(k + ' resolved ' + (e.resolved === undefined ? 'missing' : 'is not ' + REGISTRY));
      if (typeof e.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(e.integrity)) g.push(k + ' integrity ' + (e.integrity === undefined ? 'missing' : 'is not sha512'));
    }
    if (n === 0) g.push('the lock has no package entry');
    key('k6 integrity', 'every package entry of the lock (' + n + ') has resolved from registry.npmjs.org and a sha512 integrity, none is a link', g); }

  /* k7 */
  { const g = []; const wf = '.github/workflows/redesign-ci.yml'; const p = join(root, wf);
    if (!existsSync(p)) g.push(wf + ' is missing');
    else {
      const t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n').split('\n');
      const live = t.map((l) => l.replace(/(^|\s)#.*$/, ''));
      const at = t.findIndex((l) => /^    - name: Install test tools/.test(l));
      if (at < 0) g.push('no install step ("- name: Install test tools…")');
      else {
        let end = t.findIndex((l, i) => i > at && /^    - name:/.test(l)); if (end < 0) end = t.length;
        const body = t.slice(at + 1, end).filter((l) => l.trim() !== '' && !/^\s*#/.test(l));
        if (body.length !== 1 || body[0] !== '      run: npm ci') g.push('the install step body is ' + JSON.stringify(body) + ', want exactly ["      run: npm ci"]');
      }
      live.forEach((l, i) => { if (/\bnpm\s+(i|install|add|update|up)\b/.test(l)) g.push('line ' + (i + 1) + ' runs npm i / install / add / update'); });
      t.forEach((l, i) => { if (/--no-save/.test(l)) g.push('line ' + (i + 1) + ' names --no-save'); });
      const ci = live.filter((l) => /\bnpm\s+ci\b/.test(l)).length; if (ci !== 1) g.push('npm ci appears on ' + ci + ' live lines, want 1');
    }
    key('k7 ci', 'the install step of redesign-ci.yml is exactly `npm ci`, and the workflow holds no npm i / npm install / --no-save line', g); }

  /* k8 */
  { const g = []; const nm = join(root, 'node_modules');
    if (!existsSync(nm)) g.push('node_modules is ABSENT: the smoke always runs after `npm ci`; nothing installed to read');
    else for (const n of NAMES) {
      const f = join('node_modules', n, 'package.json'); const I = jsonAt(f);
      if (I.err) { g.push(I.err); continue; }
      const e = lp['node_modules/' + n];
      if (!e) g.push(n + ' not in the lock');
      else if (I.v.version !== e.version) g.push(n + ' installed ' + I.v.version + ' ≠ lock ' + e.version);
    }
    key('k8 installed', 'node_modules/<name>/package.json of the five tools reads the version of the lock entry (' + NAMES.map((n) => n + ' ' + WANT[n]).join(', ') + ')', g); }

  /* k9 */
  { const g = []; if (L.err) g.push(L.err);
    const rows = Object.entries(lp).filter(([k]) => k !== '').map(([k, e]) => k + '@' + e.version + '@' + e.integrity).sort();
    const h = createHash('sha256').update(rows.join('\n')).digest('hex');
    if (rows.length !== WANT_TREE_ROWS) g.push(rows.length + ' package entries, want ' + WANT_TREE_ROWS);
    if (h !== WANT_TREE_SHA256) g.push('tree hash ' + h.slice(0, 16) + '… ≠ ' + WANT_TREE_SHA256.slice(0, 16) + '… (a package moved, was added or was removed; re-base only after a look at the diff, #1634)');
    key('k9 tree', 'the whole tree of package-lock.json (' + WANT_TREE_ROWS + ' package entries: path@version@integrity, sorted) hashes to the frozen SHA-256', g); }
}
