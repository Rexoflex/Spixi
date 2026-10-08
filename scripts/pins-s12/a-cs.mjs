/* ==== S12 A (#1267) — the C# side of tip 1's Learn more, read from source with comments stripped (the C# is uncompiled
 * in the cloud; helpUrlFor + TipIds are EXECUTED in scripts/csh/S11HintTests.cs) ====
 *   HomePage: `ixian:hintHelp:` is ONE whole body — helpUrlFor(the tail) → if non-null Utils.openExternal(it) — logs
 *     nothing, sits ABOVE the `ixian:hint:` branch (StartsWith("ixian:hint:") cannot match "ixian:hintHelp:" anyway);
 *     the caps literal ends with hintHelp.
 *   S11HintRules.helpUrlFor: one exact Ordinal arm (network → Config.networkHelpUrl), else null.
 *   Config.networkHelpUrl is a readonly compile-time https literal; the harness stub carries the SAME literal.
 *   TipIds (C#) = HINT_IDS (the built bundle) — the whitelist and the shell's list cannot drift.
 * Deliberate breaks: see the S12 A report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const HR = rd('Spixi/Utils/S11HintRules.cs');
  const CF = rd('Spixi/Meta/Config.cs');
  const ST = rd('scripts/csh/Stubs.cs');
  const branch = (src, head) => {
    const i = src.indexOf(head);
    if (i < 0) return '';
    const open = src.indexOf('{', i);
    let depth = 0;
    for (let j = open; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) return src.slice(open, j + 1);
    }
    return '';
  };
  const r = {};
  const HEAD = 'current_url.StartsWith("ixian:hintHelp:", StringComparison.Ordinal)';
  const hh = branch(HP, HEAD);
  r.wholeBody = /^\{\s*string\? u = S11HintRules\.helpUrlFor\(current_url\.Substring\("ixian:hintHelp:"\.Length\)\);\s*if \(u != null\)\s*\{\s*Utils\.openExternal\(u\);\s*\}\s*\}$/.test(hh);
  r.oneBranch = HP.split('"ixian:hintHelp:"').length - 1 === 2;            // the head + the Substring, nowhere else
  r.logsNothing = hh.length > 0 && !/Logging\./.test(hh);
  r.aboveHint = HP.indexOf(HEAD) > 0 && HP.indexOf(HEAD) < HP.indexOf('current_url.StartsWith("ixian:hint:", StringComparison.Ordinal)');
  r.elseIf = new RegExp('\\}\\s*else if \\(' + HEAD.replace(/[.()[\]?*+^$|\\]/g, '\\$&') + '\\)').test(HP);
  r.caps = /Utils\.sendUiCommand\(this, "setCaps", "composeSend,hints,updateHelp,hintHelp"\);/.test(branch(HP, 'private void onLoaded()'));
  const hu = branch(HR, 'public static string? helpUrlFor(string? id)');
  r.helpUrlForBody = /^\{\s*if \(string\.Equals\(id, "network", StringComparison\.Ordinal\)\) return Config\.networkHelpUrl;\s*return null;\s*\}$/.test(hu);
  const lit = /public static readonly string networkHelpUrl = "(https:\/\/[^"]+)";/.exec(CF);
  const stub = /public static readonly string networkHelpUrl = "([^"]+)";/.exec(ST);
  r.configConstant = !!lit && lit[1] === 'https://www.ixian.io';
  r.stubSameLiteral = !!lit && !!stub && stub[1] === lit[1];
  const tip = /public static readonly string\[\] TipIds = \{([^}]*)\};/.exec(HR);
  const csIds = tip ? [...tip[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]) : [];
  let jsIds = [];
  let sh = null;
  try {
    sh = await aKit(h).boot('index.html', { wait: 600 });
    jsIds = Array.from(sh.W.Spixi.HINT_IDS || []);              // the BUILT shell's own list
  } catch (e) { r.err = e.message; }
  finally { if (sh) sh.close(); }
  r.whitelistEqualsShell = csIds.length === 8 && JSON.stringify(csIds) === JSON.stringify(jsIds) && !csIds.includes('e2e');
  ok(Object.values(r).every((x) => x === true),
    '★ S12 A (#1267) C#: ixian:hintHelp: is ONE else-if body above ixian:hint: — helpUrlFor(tail) → Utils.openExternal only when non-null, nothing logged; caps end with hintHelp; helpUrlFor maps only "network" (Ordinal) to Config.networkHelpUrl = "https://www.ixian.io" (a readonly literal; the csh stub has the same one); C# TipIds = the built shell\'s HINT_IDS (8, no e2e) — ' + JSON.stringify(r) + ' cs=' + csIds.join(',') + ' js=' + jsIds.join(','));
}
