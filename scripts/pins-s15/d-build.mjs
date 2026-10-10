/* ==== S15 unit D — build config + repo hygiene (#1293): O-27 · O-31 · O-35.
 *
 * Behaviour over source text: the csproj is EVALUATED, not grepped. A minimal MSBuild evaluator below walks the
 * top-level PropertyGroups in file order for the three properties these rows move (SpixiDevCoexist, DefineConstants,
 * CodesignEntitlements; command-line properties win, as in MSBuild), then runs the SpixiStoreReleaseGate target's
 * Error conditions over a matrix of builds. Any condition syntax it does not know THROWS (a pin failure), so a reworded
 * condition cannot slip past as "false".
 *   O-35 — a store build (-p:SpixiStoreRelease=true) is refused when it is not Release, has SpixiDevCoexist=true, or
 *          carries SPIXI_DEV_COEXIST in DefineConstants; it passes clean in Release; without the flag the gate never
 *          runs (a dev Release test build may still opt in); the gate hooks PrepareForBuild and sits BEFORE the strip.
 *   O-31 — iOS Debug signs with Entitlements.plist (aps-environment development), iOS Release with
 *          Entitlements.Release.plist (production); the two plists are equal in every other key; no other TFM gets it.
 *   O-27 — the device captures and `Claude outputs/` are ignored at the repo root by the .gitignore rules, no later `!`
 *          re-includes them, and docs/ + scripts/ stay tracked. ★ S15 #46 r1 MINOR-6: git's own `check-ignore --no-index`
 *          judges every path (the old hand matcher skipped unanchored patterns — `*.md` passed).
 * Deliberate breaks (S15 D), each failed its own key: the Configuration Error removed (refuseDebug) · the SpixiDevCoexist
 * Error removed (refuseCoexist) · the DefineConstants Error removed (refuseSymbol) · the target Condition widened to
 * always run (noFlagNoGate) · the gate moved after the strip target (hookFirst) · the Release CodesignEntitlements
 * condition set to 'Debug' (debugFile/releaseFile) · the Release plist aps-environment set to development (apsRelease) ·
 * the Release plist App Group changed (restEqual) · `/Claude outputs/` removed from .gitignore (caps) · `/mem-*.txt`
 * widened to `/*.md` (keep: README.md ignored). #46 r1 (fixer Z): an UNANCHORED `*.md` appended to .gitignore (keep:
 * README.md + docs/*.md ignored — the old matcher passed it). */
export default async function (h) {
  const { ok, root, readFileSync, existsSync, join } = h;
  const rd = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '');
  const csproj = rd('Spixi/Spixi.csproj').replace(/<!--[\s\S]*?-->/g, '');

  /* ---- a minimal MSBuild condition / property evaluator (only the shapes this csproj uses) ---- */
  const expand = (s, P) => s
    .replace(/\$\((\w+)\.Contains\('([^']*)'\)\)/g, (_, k, v) => String((P[k] || '').includes(v)))
    .replace(/\$\((\w+)\)/g, (_, k) => P[k] || '');
  const evalCond = (cond, P) => {
    const toks = [];
    const re = /\s*(?:'([^']*)'|(==|!=)|(\(|\))|(!)|\b(and|or|true|false)\b)/iy;
    const src = expand(cond, P).replace(/&quot;/g, '"');
    let i = 0;
    while (i < src.length) {
      if (/\s/.test(src[i])) { i++; continue; }
      re.lastIndex = i; const m = re.exec(src);
      if (!m) throw new Error('unknown condition syntax: ' + cond);
      toks.push(m[1] !== undefined ? { s: m[1] } : (m[2] || m[3] || m[4] || m[5]).toLowerCase()); i = re.lastIndex;
    }
    let p = 0;
    const prim = () => {
      const t = toks[p++];
      if (t === '!') return !prim();
      if (t === '(') { const v = orE(); if (toks[p++] !== ')') throw new Error('paren: ' + cond); return v; }
      if (t === 'true' || t === 'false') return t === 'true';
      if (t && t.s !== undefined) {
        const op = toks[p];
        if (op === '==' || op === '!=') { p++; const r = toks[p++]; if (!r || r.s === undefined) throw new Error('rhs: ' + cond); const eq = t.s.toLowerCase() === r.s.toLowerCase(); return op === '==' ? eq : !eq; }
        if (/^(true|false)$/i.test(t.s)) return t.s.toLowerCase() === 'true';
      }
      throw new Error('unknown condition term in: ' + cond);
    };
    const andE = () => { let v = prim(); while (toks[p] === 'and') { p++; v = prim() && v; } return v; };
    const orE = () => { let v = andE(); while (toks[p] === 'or') { p++; v = andE() || v; } return v; };
    const v = orE(); if (p !== toks.length) throw new Error('trailing tokens: ' + cond); return v;
  };
  const WATCH = ['SpixiDevCoexist', 'DefineConstants', 'CodesignEntitlements'];
  const body = csproj.replace(/<Target\b[\s\S]*?<\/Target>/g, '');
  const evaluate = (globals) => {
    const P = { Configuration: 'Debug', ...globals };
    for (const g of body.matchAll(/<PropertyGroup(?:\s+Condition="([^"]*)")?\s*>([\s\S]*?)<\/PropertyGroup>/g)) {
      const props = [...g[2].matchAll(/<(\w+)(?:\s+Condition="([^"]*)")?\s*>([^<]*)<\/\1>/g)].filter((x) => WATCH.includes(x[1]));
      if (!props.length) continue;
      if (g[1] && !evalCond(g[1], P)) continue;
      for (const [, k, c, v] of props) { if (k in globals) continue; if (c && !evalCond(c, P)) continue; P[k] = expand(v, P); }
    }
    return P;
  };
  const gateM = /<Target\s+Name="SpixiStoreReleaseGate"\s+BeforeTargets="([^"]*)"\s+Condition="([^"]*)"\s*>([\s\S]*?)<\/Target>/.exec(csproj);
  const runGate = (globals) => {
    const P = evaluate(globals);
    if (!gateM || !evalCond(gateM[2], P)) return 'skipped';
    for (const e of gateM[3].matchAll(/<Error\s+Condition="([^"]*)"\s+Text="([^"]*)"/g)) if (evalCond(e[1], P)) return 'refused:' + e[2];
    return 'passed';
  };
  const safe = (f) => { try { return f(); } catch (e) { return 'THROW ' + e.message; } };

  /* ---- O-35 ---- */
  const R = 'Release', S = { SpixiStoreRelease: 'true' };
  const g = {
    storeClean: safe(() => runGate({ Configuration: R, ...S })),
    storeCleanCase: safe(() => runGate({ Configuration: R, SpixiStoreRelease: 'True' })),
    storeDevCoexist: safe(() => runGate({ Configuration: R, ...S, SpixiDevCoexist: 'true' })),
    storeSymbolOnly: safe(() => runGate({ Configuration: R, ...S, DefineConstants: 'TRACE;SPIXI_DEV_COEXIST' })),
    storeDebug: safe(() => runGate({ Configuration: 'Debug', ...S })),
    storeDebugNoCoexist: safe(() => runGate({ Configuration: 'Debug', ...S, SpixiDevCoexist: 'false' })),
    devReleaseOptIn: safe(() => runGate({ Configuration: R, SpixiDevCoexist: 'true' })),
    debugPlain: safe(() => runGate({ Configuration: 'Debug' })),
  };
  const gateAt = csproj.indexOf('<Target Name="SpixiStoreReleaseGate"'), stripAt = csproj.indexOf('<Target Name="SpixiStripReleaseHtml"');
  const hook = gateM ? gateM[1].split(';').map((x) => x.trim()) : [];
  const r35 = {
    exists: !!gateM,
    passClean: g.storeClean === 'passed' && g.storeCleanCase === 'passed',
    refuseCoexist: /^refused:.*SpixiDevCoexist=true in a store build/.test(g.storeDevCoexist),
    refuseSymbol: /^refused:.*SPIXI_DEV_COEXIST is in DefineConstants/.test(g.storeSymbolOnly),
    refuseDebug: g.storeDebug.startsWith('refused:') && /^refused:.*needs Configuration=Release/.test(g.storeDebugNoCoexist),
    noFlagNoGate: g.devReleaseOptIn === 'skipped' && g.debugPlain === 'skipped',
    hookFirst: hook.includes('PrepareForBuild') && gateAt > 0 && stripAt > gateAt,
  };
  ok(Object.values(r35).every(Boolean),
    '★ S15 D (O-35, #1293): the store-release gate EVALUATED — a -p:SpixiStoreRelease=true build passes only as Release with SpixiDevCoexist off and no SPIXI_DEV_COEXIST (clean: ' + g.storeClean + ' · coexist: ' + g.storeDevCoexist.slice(45, 90) + ' · symbol: ' + g.storeSymbolOnly.slice(45, 90) + ' · Debug: ' + g.storeDebugNoCoexist.slice(45, 90) + '); without the flag it never runs (' + g.devReleaseOptIn + '); it hooks PrepareForBuild ahead of the strip — ' + JSON.stringify(r35));

  /* ---- O-31 ---- */
  const ent = (cfg, tf, extra = {}) => safe(() => evaluate({ Configuration: cfg, TargetFramework: tf, ...extra }).CodesignEntitlements || '(none)');   // ★ S15 merge: production only for a STORE build (#807 walk builds keep development)
  const e = { iosDebug: ent('Debug', 'net10.0-ios'), iosWalkRelease: ent('Release', 'net10.0-ios'), iosRelease: ent('Release', 'net10.0-ios', S), android: ent('Release', 'net10.0-android'), mac: ent('Release', 'net10.0-maccatalyst') };
  const plistDict = (f) => {
    const x = rd(f).replace(/<!--[\s\S]*?-->/g, '');
    const d = {}; for (const m of x.matchAll(/<key>([^<]+)<\/key>\s*(<string>[^<]*<\/string>|<array>[\s\S]*?<\/array>|<true\/>|<false\/>)/g)) d[m[1]] = m[2].replace(/\s+/g, '');
    return d;
  };
  const dbgF = 'Spixi/Platforms/iOS/Entitlements.plist', relF = 'Spixi/Platforms/iOS/Entitlements.Release.plist';
  const both = existsSync(join(root, dbgF)) && existsSync(join(root, relF));
  const dD = both ? plistDict(dbgF) : {}, dR = both ? plistDict(relF) : {};
  const rest = (d) => JSON.stringify(Object.keys(d).filter((k) => k !== 'aps-environment').sort().map((k) => [k, d[k]]));
  const r31 = {
    debugFile: e.iosDebug === 'Platforms/iOS/Entitlements.plist' && e.iosWalkRelease === 'Platforms/iOS/Entitlements.plist',
    releaseFile: e.iosRelease === 'Platforms/iOS/Entitlements.Release.plist',
    otherTfms: e.android === '(none)' && e.mac === '(none)',
    filesExist: both,
    apsDebug: dD['aps-environment'] === '<string>development</string>',
    apsRelease: dR['aps-environment'] === '<string>production</string>',
    restEqual: both && rest(dD) === rest(dR) && /group\.com\.ixilabs\.spixi/.test(dR['com.apple.security.application-groups'] || ''),
  };
  ok(Object.values(r31).every(Boolean),
    '★ S15 D (O-31, #1293): aps-environment follows the configuration, EVALUATED — iOS Debug signs with ' + e.iosDebug + ' (development), iOS Release with ' + e.iosRelease + ' (production); android/maccatalyst get none; the two plists are equal in every other key (App Group included) — ' + JSON.stringify(r31));

  /* ---- O-27 ---- */
  /* ★ S15 #46 r1 MINOR-6: git ITSELF answers, against the real .gitignore files of this tree (`git check-ignore --no-index`:
     the index is not consulted, so a tracked file is judged by the rules alone; core.excludesFile is blanked so the
     developer's global excludes cannot hide a gap). The old hand matcher skipped unanchored patterns, so a `*.md` rule
     passed. A path git cannot classify (no git, a fatal) is a pin failure, never "not ignored". */
  const { spawnSync } = await import('node:child_process');
  const ignoredAll = (paths) => {
    const r = spawnSync('git', ['-c', 'core.excludesFile=', 'check-ignore', '--no-index', '--stdin', '-z', '-v', '-n'],
      { cwd: root, input: paths.join('\0') + '\0', encoding: 'utf8' });
    if (r.error || (r.status !== 0 && r.status !== 1)) throw new Error('git check-ignore failed: ' + (r.error ? r.error.code : 'status ' + r.status));
    const f = r.stdout.split('\0'); const out = {};
    for (let i = 0; i + 3 < f.length; i += 4) out[f[i + 3]] = f[i + 2] !== '' && !f[i + 2].startsWith('!');   // source, line, pattern, path
    if (paths.some((p) => !(p in out))) throw new Error('git check-ignore left a path unclassified');
    return out;
  };
  const caps = ['crash-logcat.txt', 'mem-chats.txt', 'mem-seed01.txt', 'f5repro.mjs', 'README-FIRST.txt', 'Claude outputs/walk-session-k.html', 'Claude outputs/session14.patch'];
  const keep = ['docs/security-handover-gate.md', 'docs/freeze-checklist-v1.md', 'scripts/smoke-test.mjs', 'README.md', 'READ-ME-FIRST-WINDOWS-FINDINGS.md', 'docs/mem-notes.txt'];
  const keepMore = ['docs/handoff-2026-10-09b.md', 'scripts/pins-s15/d-build.mjs', 'Spixi/Spixi.csproj', 'DECISIONS.md'];
  let r27;
  try {
    const st = ignoredAll([...caps, ...keep, ...keepMore]);
    r27 = { caps: caps.filter((p) => !st[p]), keep: [...keep, ...keepMore].filter((p) => st[p]) };
  } catch (e) { r27 = { caps: ['THROW ' + e.message], keep: [] }; }
  ok(r27.caps.length === 0 && r27.keep.length === 0,
    '★ S15 D (O-27, #1293): .gitignore ignores the device captures and the session-output folder at the ROOT (' + caps.length + ' paths) and nothing under docs/ or scripts/ (nor a root .md, the csproj, DECISIONS) — asked of `git check-ignore --no-index` (#46 r1 MINOR-6), every pattern counted — not ignored: ' + JSON.stringify(r27.caps) + ' · wrongly ignored: ' + JSON.stringify(r27.keep));
}
