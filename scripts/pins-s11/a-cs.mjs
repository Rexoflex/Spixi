/* ==== S11 A — the C# call sites of items 4 + 5 (#1262), read from source with comments stripped (the C# is
 * uncompiled in the cloud; the pure rules + the store are EXECUTED in scripts/csh/S11HintTests.cs) ====
 *   HomePage: setCaps "composeSend,hints" then pushHints() in onLoaded (a fresh document — firstSeen is written there);
 *     pushHints sends setHints with SHints.pushJson; `ixian:hint:` validates through S11HintRules.parseVerb BEFORE it
 *     writes (markShown / markDone) and logs nothing.
 *   ★ S11 A2 (#1263): the hint dispatch is pinned as a WHOLE BODY (R3-MAJOR-6: `if (hintAction == ActionShown) markShown
 *     else markDone` — a swapped or dropped arm is a different body); HomePage has NO `ixian:openLink:` dispatch any more
 *     (R1-M2) — `ixian:updateHelp` (Equals, no argument) calls only Utils.openExternal(Config.updateHelpUrl), the URL is a
 *     Config constant, the cap list carries updateHelp, and the home shell sends the bare verb (no URL in the document).
 *   SettingsPage: `,hints` in the caps (above photoPreviews), the setHintsOff seed, `ixian:hintsoff:` → parseOff → SHints.off,
 *     the echo, then HomePage.InstanceOrNull()?.pushHints(); the wipe line still carries SLocalOnlyStore.clearAll()
 *     (the hint keys live in that file).
 *   SHints: only SLocalOnlyStore (never Preferences, never a WebView key), keys prefixed `hints.`.
 * Deliberate breaks: see the S11 A report. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const SP = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const SH = rd('Spixi/Meta/SHints.cs');
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
  const ol = branch(HP, 'private void onLoaded()');
  r.capsThenPush = /Utils\.sendUiCommand\(this, "setCaps", "composeSend,hints,updateHelp"\);\s*pushHints\(\);/.test(ol);
  r.pushBody = /Utils\.sendUiCommand\(this, "setHints", SHints\.pushJson\(SHints\.nowMs\(\)\)\);/.test(branch(HP, 'public void pushHints()'));
  const hint = branch(HP, 'current_url.StartsWith("ixian:hint:", StringComparison.Ordinal)');
  /* ★ S11 A2 (#1263, R3-MAJOR-6): the WHOLE branch body — validate, then shown → markShown(now) else markDone(id) */
  r.hintValidatesFirst = /^\{\s*if \(S11HintRules\.parseVerb\(current_url\.Substring\("ixian:hint:"\.Length\), out string hintAction, out string hintId\)\)\s*\{\s*if \(hintAction == S11HintRules\.ActionShown\)\s*\{\s*SHints\.markShown\(SHints\.nowMs\(\)\);\s*\}\s*else\s*\{\s*SHints\.markDone\(hintId\);\s*\}\s*\}\s*\}$/.test(hint);
  r.hintLogsNothing = hint.length > 0 && !/Logging\.|current_url[^.]/.test(hint.replace(/current_url\.Substring\("ixian:hint:"\.Length\)/, ''));
  /* ★ S11 A2 (#1263, R1-M2): no openLink dispatch on HomePage; the update link is a C#-owned constant */
  r.noOpenLinkOnHome = !/"ixian:openLink:"/.test(HP);
  const uh = branch(HP, 'current_url.Equals("ixian:updateHelp", StringComparison.Ordinal)');
  r.updateHelpOnlyTheGate = /^\{\s*Utils\.openExternal\(Config\.updateHelpUrl\);\s*\}$/.test(uh);
  r.urlIsAConfigConstant = /public static readonly string updateHelpUrl = "https:\/\/www\.spixi\.io\/download";/.test(rd('Spixi/Meta/Config.cs'));
  const homeShell = stripCode(readFileSync(join(root, 'src/shells/home.html'), 'utf8'));
  r.shellSendsTheBareVerb = /onHowTo: \(\) => bridge\.send\('ixian:updateHelp'\),/.test(homeShell)
    && !/ixian:openLink:/.test(homeShell) && !/spixi\.io\/download/.test(homeShell);
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A (#1262) + A2 (#1263) HomePage: setCaps composeSend,hints,updateHelp then pushHints() on every fresh document; setHints carries SHints.pushJson; ixian:hint: is ONE body — parseVerb first, then shown → markShown(now) else markDone(id) — and logs nothing; HomePage has no ixian:openLink: dispatch; ixian:updateHelp calls only Utils.openExternal(Config.updateHelpUrl) (a Config constant), and the home shell sends the bare verb (no URL in the document) — ' + JSON.stringify(r));

  const s = {};
  s.capAbovePhotoPreviews = /caps \+= ",hints";\s*caps \+= ",photoPreviews";/.test(SP);
  s.seed = /Utils\.sendUiCommand\(this, "setHintsOff", SHints\.off\.ToString\(\)\);/.test(branch(SP, 'private void onLoad()') || SP);
  const off = branch(SP, 'current_url.StartsWith("ixian:hintsoff:", StringComparison.Ordinal)');
  s.offVerb = /^\{\s*if \(S11HintRules\.parseOff\(current_url\.Substring\("ixian:hintsoff:"\.Length\), out bool hintsOff\)\)\s*\{\s*SHints\.off = hintsOff;\s*\}\s*Utils\.sendUiCommand\(this, "setHintsOff", SHints\.off\.ToString\(\)\);\s*HomePage\.InstanceOrNull\(\)\?\.pushHints\(\);\s*\}$/.test(off);
  s.wipe = /SLocalOnlyStore\.clearAll\(\);/.test(SP);
  s.storeOnlyLocal = !/Preferences|localStorage|spixi\./.test(SH) && /"hints\.firstSeen"/.test(SH) && /"hints\.lastShown"/.test(SH) && /"hints\.done"/.test(SH) && /"hints\.off"/.test(SH)
    && (SH.match(/SLocalOnlyStore\.(get|setDeferred)\(/g) || []).length >= 6;
  ok(Object.values(s).every((x) => x === true),
    '★ S11 A (#1262) SettingsPage + SHints: the hints cap sits above photoPreviews; setHintsOff seeds the switch; ixian:hintsoff: → parseOff → SHints.off → echo → the home shell re-pushed; the wipe still clears SLocalOnlyStore (the hint keys live there); SHints touches only SLocalOnlyStore under hints.* — ' + JSON.stringify(s));
}
