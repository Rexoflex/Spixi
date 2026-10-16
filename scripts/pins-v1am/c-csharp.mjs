/* ==== V1A-M (Drop 2, P31) — the MAUI-bound call sites of the first-minute moments' C# (flags SpixiFlags.V1IxiHelp, V1Hints) ====
 * The pure rules are EXECUTED in the C# harness (scripts/csh/V1AMTests.cs: the ixihelp ask grammar + the normal session rule
 * + the log line + the seen push, ixiHelpEligible, WordIds beside TipIds, parseWordTipVerb, wordTipMarksDone, the SHints
 * round trip, the two [FLAGS] lines through the REAL SpixiFlags.init, devFlagsArg). The harness cannot compile MAUI pages,
 * so this module pins their call sites on comment-stripped C#:
 *   caps   — HomePage.onLoaded's ONE setCaps expression is EVALUATED for all 16 flag combinations (S17Bridge · S17Moments ·
 *            V1IxiHelp · V1Hints): `ixihelp` ⇔ S17Moments && V1IxiHelp (after `moments`), `wordtips` ⇔ V1Hints (after it),
 *            every other cap exactly as before; pushHints() still follows;
 *   word   — HomePage.onNavigating: the word branch `V1AMRules.parseWordTipVerb(current_url, …)` sits AFTER ixian:hintHelp: and
 *            BEFORE the S11 `ixian:hint:` branch (so the S11 branch — the only markShown — never sees a word id); its body =
 *            markDone only under wordTipMarksDone(SpixiFlags.V1Hints, action), nothing else, nothing logged;
 *   off    — SMoments.handleVerb returns for `ixihelp` with V1IxiHelp OFF after parseAsk and BEFORE answerAsync (and before the
 *            App details filter); answerAsync's `case V1AMRules.IxiHelpId:` (#46 r1 NIT-1: the const, no second literal) =
 *            ixiHelpEligible(SpixiFlags.V1IxiHelp, page is HomePage); #46 r1 (A-MINOR-1): the session bit and the home
 *            push are set ONLY through takesSession(id, atInstall) (false for ixihelp — executed in csh
 *            m1_session_rule_obeyed_but_never_taken), so the grant never takes the session; a chat's push never carries it
 *            (ChatSeenIds); V1AMRules.IxiHelpId = "ixihelp";
 *   flags  — SpixiFlags: keys flagV1IxiHelp / flagV1Hints, default ON, read with default 1, effectiveFlag, the two lines
 *            logged right after the S20G line, in order;
 *   dev    — DevPage: ixian:devflash:v1ixihelp:<0|1> and :v1hints:<0|1> before the generic devflash branch, the s20g rules
 *            (dev mode + parseFlagTail, the key, echo), and the push window.setFlagsDevV1 = devFlagsArg(vi, vh) from the stored
 *            prefs, after the S20G push. (The dev.html rows are HOME's — pinned there.)
 * DELIBERATE BREAKS (V1A-M CS report): ① the ixihelp cap gated by V1IxiHelp alone → caps fails. ② the word branch moved
 *   below the S11 `ixian:hint:` branch → word fails. ③ the word body's wordTipMarksDone test dropped (markDone always) → word
 *   fails. ④ the handleVerb OFF return moved below answerAsync → off fails. ⑤ the v1hints Logging.info removed from
 *   SpixiFlags.init → flags fails. ⑥ the setFlagsDevV1 push removed → dev fails. #46 r1: ⑦ `sessionMoment = true;` added
 *   in the ixihelp case → off fails (sessionOnlyViaRule). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k >= 0 && k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const SM = rd('Spixi/Meta/SMoments.cs');
  const SF = rd('Spixi/Utils/SpixiFlags.cs');
  const DV = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const V1 = rd('Spixi/Utils/V1AMRules.cs');

  /* caps — the expression, evaluated (only string literals, + ( ) ? : && and SpixiFlags.<Name> are admitted) */
  const ol = body(HP, 'private void onLoaded()');
  const capCalls = [...ol.matchAll(/Utils\.sendUiCommand\(this, "setCaps", ("composeSend[^;]*)\);/g)];
  const expr = capCalls.length === 1 ? capCalls[0][1] : '';
  const NAMES = ['S17Bridge', 'S17Moments', 'V1IxiHelp', 'V1Hints'];
  const c = { one: capCalls.length === 1, pushHintsNext: /Utils\.sendUiCommand\(this, "setCaps", "composeSend[^;]*\);\s*pushHints\(\);/.test(ol) };
  const safe = expr.replace(/"[^"\\]*"/g, '').replace(/SpixiFlags\.(\w+)/g, (m, n) => (NAMES.includes(n) ? '' : '#'));
  c.safe = expr.length > 0 && /^[\s+()?:&]*$/.test(safe);
  const bad = [];
  if (c.safe) {
    const fn = new Function('SpixiFlags', 'return ' + expr + ';');
    for (let b = 0; b < 16; b++) {
      const F = { S17Bridge: !!(b & 1), S17Moments: !!(b & 2), V1IxiHelp: !!(b & 4), V1Hints: !!(b & 8) };
      const caps = String(fn(F)).split(',');
      const want = ['composeSend', 'hints', 'updateHelp', 'hintHelp'];
      if (F.S17Bridge) want.push('whatsnew');
      if (F.S17Moments) want.push('moments');
      if (F.S17Moments && F.V1IxiHelp) want.push('ixihelp');
      if (F.V1Hints) want.push('wordtips');
      if (caps.join(',') !== want.join(',')) bad.push(JSON.stringify(F) + ' → ' + caps.join(','));
    }
  }
  c.matrix = c.safe && bad.length === 0;
  ok(Object.values(c).every(Boolean),
    '★ V1A-M (P31): home\'s setCaps — `ixihelp` only with S17Moments AND V1IxiHelp (after `moments`), `wordtips` only with V1Hints (after it), every other cap unchanged in all 16 flag combinations; pushHints() still follows — ' + JSON.stringify(c) + (bad.length ? ' bad=' + bad.join(' | ') : ''));

  /* word — the dispatch order and the body */
  const nav = body(HP, 'private void onNavigating(object sender, WebNavigatingEventArgs e)');
  const WORD = 'else if (V1AMRules.parseWordTipVerb(current_url, out string wordAction, out string wordId))';
  const iWord = nav.indexOf(WORD);
  const iHelp = nav.indexOf('current_url.StartsWith("ixian:hintHelp:", StringComparison.Ordinal)');
  const iS11 = nav.indexOf('current_url.StartsWith("ixian:hint:", StringComparison.Ordinal)');
  const wb = iWord >= 0 ? body(nav.slice(iWord), WORD) : '';
  const s11 = iS11 >= 0 ? body(nav.slice(iS11), 'current_url.StartsWith("ixian:hint:"') : '';
  const w = {
    found: nav.length > 0 && iWord > 0 && iS11 > 0,
    order: iHelp > 0 && iHelp < iWord && iWord < iS11,
    nothingEarlier: !/ixian:hint[":]/.test(nav.slice(0, iWord).replace(/"ixian:hintHelp:"/g, '')),
    body: /^\{\s*if \(V1AMRules\.wordTipMarksDone\(SpixiFlags\.V1Hints, wordAction\)\)\s*\{\s*SHints\.markDone\(wordId\);\s*\}\s*\}$/.test(wb),
    noLog: wb.length > 0 && !/Logging\.|markShown|current_url/.test(wb),
    /* the S11 branch is the ONLY lastShown writer in HomePage */
    oneShown: (HP.match(/SHints\.markShown\(/g) || []).length === 1 && /SHints\.markShown\(/.test(s11),
    /* the predicate is the S11 grammar + a word id (executed in csh m2_word_verb…) */
    rule: /if \(!S11HintRules\.parseVerb\(url\.Substring\(HintPrefix\.Length\), out string a, out string i\)\) return false;\s*if \(!S11HintRules\.isWordId\(i\)\) return false;/.test(body(V1, 'public static bool parseWordTipVerb('))
      && /public const string HintPrefix = "ixian:hint:";/.test(V1),
  };
  ok(Object.values(w).every(Boolean),
    '★ V1A-M M2 (P31): HomePage takes `ixian:hint:<shown|done>:<word id>` in its OWN branch, after hintHelp and BEFORE the S11 hint branch — `done` → SHints.markDone only under wordTipMarksDone(SpixiFlags.V1Hints, …), `shown` never writes (the S11 branch stays the only markShown), flag OFF drops everything, nothing logged — ' + JSON.stringify(w));

  /* off — the ask with the flag OFF, the case, the chat push */
  const hv = SM.slice(SM.indexOf('public static bool handleVerb('), SM.indexOf('private static async Task answerAsync('));
  const OFF = 'if (id == V1AMRules.IxiHelpId && !SpixiFlags.V1IxiHelp) return true;';
  const ans = body(SM, 'private static async Task answerAsync(');
  const o = {
    found: hv.length > 0 && ans.length > 0,
    place: hv.indexOf(OFF) > hv.indexOf('S17MomentRules.parseAsk(url, out string id, out string arg)') && hv.indexOf('S17MomentRules.parseAsk(') > 0
      && hv.indexOf(OFF) < hv.indexOf('answerAsync(page, id, arg);') && hv.indexOf(OFF) < hv.indexOf('appDetailsAsk'),
    once: hv.split(OFF).length === 2,
    id: /public const string IxiHelpId = "ixihelp";/.test(V1),
    eligible: /case V1AMRules\.IxiHelpId:\s*eligible = V1AMRules\.ixiHelpEligible\(SpixiFlags\.V1IxiHelp, page is HomePage\);\s*break;/.test(ans)
      && !/case "ixihelp"/.test(SM),
    /* #46 r1: the session is taken only by the rule (takesSession(id, atInstall), false for ixihelp) — no other write */
    sessionOnlyViaRule: (ans.match(/sessionMoment = true;/g) || []).length === 1
      && /if \(S17MomentRules\.takesSession\(id, atInstall\)\)\s*\{\s*sessionMoment = true;\s*startSession\(\);\s*\}/.test(ans)
      && /if \(yes && S17MomentRules\.takesSession\(id, atInstall\)\)/.test(ans),
    chatNever: /private static readonly string\[\] ChatSeenIds = \{ "autodl", "offline", "mic", "pay" \};/.test(SM),
  };
  ok(Object.values(o).every(Boolean),
    '★ V1A-M M1 (P31): SMoments — `ixian:moment:ixihelp` with V1IxiHelp OFF returns after parseAsk and BEFORE answerAsync (no answer, no seen, no log); ON, the id\'s own check is ixiHelpEligible(flag, page is HomePage) — home only; it obeys the session rule but never takes the session (only takesSession sets the bit); a chat\'s push never names it — ' + JSON.stringify(o));

  /* flags */
  const init = body(SF, 'public static void init()');
  const at = (s) => init.indexOf(s);
  const f = {
    keys: /public const string V1IxiHelpKey = "flagV1IxiHelp";/.test(SF) && /public const string V1HintsKey = "flagV1Hints";/.test(SF),
    defaults: /public static bool V1IxiHelp \{ get; private set; \} = true;/.test(SF) && /public static bool V1Hints \{ get; private set; \} = true;/.test(SF),
    reads: /int vi = 1, vh = 1;/.test(init) && /vi = Preferences\.Default\.Get\(V1IxiHelpKey, 1\);/.test(init) && /vh = Preferences\.Default\.Get\(V1HintsKey, 1\);/.test(init)
      && at('vh = Preferences.Default.Get(V1HintsKey, 1);') < at('catch (Exception ex)'),
    lines: /Logging\.info\(S20GRules\.flagLine\(S20G\)\);\s*V1IxiHelp = S16PassRules\.effectiveFlag\(dev, vi\);\s*Logging\.info\(V1AMRules\.flagLineIxiHelp\(V1IxiHelp\)\);\s*V1Hints = S16PassRules\.effectiveFlag\(dev, vh\);\s*Logging\.info\(V1AMRules\.flagLineHints\(V1Hints\)\);(?:\s*S20AddrHelp = S16PassRules\.effectiveFlag\(dev, ah\);\s*Logging\.info\(S20IRules\.flagLineAddrHelp\(S20AddrHelp\)\);)?\s*\}$/.test(init),   // ★ S20I re-base: + the s20addrhelp line right after (P32)
  };
  ok(Object.values(f).every(Boolean),
    '★ V1A-M (P31): SpixiFlags — prefs flagV1IxiHelp / flagV1Hints (absent = ON), the S16 rule (a stored 0 acts only in dev mode), `[FLAGS] v1ixihelp=` then `[FLAGS] v1hints=` logged right after the S20G line — ' + JSON.stringify(f));

  /* dev */
  const iG = DV.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)');
  const branch = (name, key) => {
    const sig = 'current_url.StartsWith("ixian:devflash:' + name + ':", StringComparison.Ordinal)';
    const i = DV.indexOf(sig);
    const b = i < 0 ? '' : body(DV.slice(i), sig);
    return i > 0 && iG > 0 && i < iG
      && new RegExp('if \\(Preferences\\.Default\\.Get\\("devMode", false\\)\\s*&& S16PassRules\\.parseFlagTail\\(current_url\\.Substring\\("ixian:devflash:' + name + ':"\\.Length\\), out int value\\)\\)\\s*\\{\\s*Preferences\\.Default\\.Set\\(SpixiFlags\\.' + key + ', value\\);\\s*\\}').test(b)
      && /pushFlagsDev\(\);\s*\}$/.test(b) && /Logging\.warn\("DevPage: flag switch failed: " \+ ex\.GetType\(\)\.Name\);/.test(b);
  };
  const pf = body(DV, 'private void pushFlagsDev()');
  const iV1 = pf.indexOf('Utils.sendUiCommand(this, "window.setFlagsDevV1", V1AMRules.devFlagsArg(vi, vh));');
  const dv = {
    ixihelp: branch('v1ixihelp', 'V1IxiHelpKey'),
    hints: branch('v1hints', 'V1HintsKey'),
    reads: /vi = Preferences\.Default\.Get\(SpixiFlags\.V1IxiHelpKey, 1\);/.test(pf) && /vh = Preferences\.Default\.Get\(SpixiFlags\.V1HintsKey, 1\);/.test(pf),
    push: iV1 > pf.indexOf('"window.setFlagsDevS20G"') && pf.indexOf('"window.setFlagsDevS20G"') > 0,
    arg: /public static string devFlagsArg\(int ixiHelp, int hints\) => \(ixiHelp == 0 \? "0" : "1"\) \+ "," \+ \(hints == 0 \? "0" : "1"\);/.test(V1),
  };
  ok(Object.values(dv).every(Boolean),
    '★ V1A-M (P31): Developer › Release flags — DevPage ixian:devflash:v1ixihelp:<0|1> / v1hints:<0|1> (dev mode + the exact tail, before the generic devflash branch, echo) + the push window.setFlagsDevV1 "<ixihelp>,<hints>" from the stored prefs after the S20G push — ' + JSON.stringify(dv));
}
