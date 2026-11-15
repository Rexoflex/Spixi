/* ==== perfb1 P-13 (SpixiFlags.PhoneNoEmptyDetail) — no EmptyDetail page on a phone until the layout is wide.
 *
 * Mechanism (tree + research): the EmptyDetail page (empty_detail.html, the resting right pane of the wide layout) was
 * built in HomePage's field initializer and its WebView booted on the first attach (rightContent, a 0-width column on a
 * phone) — one renderer that a phone never shows (OnPageSizeChanged: `Width < 700 || isPhoneDisplay()`). The pure rule
 * (Spixi/Utils/EmptyDetailRules.cs) is executed by scripts/csh (PerfB1EmptyDetailTests.cs). This SOURCE pin (stripCode;
 * brace-matched bodies; the sites derived from a sweep of Spixi/**\/*.cs, #771) holds the MAUI-bound call sites:
 *   1 GATE     — every `new EmptyDetail()` in the tree sits behind the rule: the field initializer
 *                (constructAtStart ? new : null), the first-wide hook (constructNow) and removeDetailContent (rebuild);
 *                there is no other one;
 *   2 LAZY     — the first-wide hook has ONE caller, in the WIDE arm of OnPageSizeChanged (the SizeChanged handler, main
 *                thread), before the pane is shown; the rule's `exists` input is the field itself (once, never twice);
 *   3 NULLSAFE — every use of `defaultDetailContent` is in a null-safe shape (a derived sweep: no use is left outside
 *                the listed shapes), and the readers in UIHelpers / SettingsPage reach it only through the null-safe
 *                accessors, which construct nothing;
 *   4 DESKTOP  — Windows / Mac / tablets build at start: the "phone" input is `SpixiFlags.PhoneNoEmptyDetail &&
 *                isPhoneDisplay()` (the display is not read with the switch OFF), isPhoneDisplay refuses every platform
 *                but Android / iOS first, and the rule defers only for (switch ON && phone display).
 * Deliberate breaks (#802): `? new EmptyDetail() : null` → `: new EmptyDetail()` (built at start on a phone) → red
 * GATE `startGated` + `oneSitePerGate` (and NULLSAFE `allUsesNullSafe`); `defaultDetailContent?.reload()` → `.reload()` →
 * red NULLSAFE `allUsesNullSafe`; the ctor's `if (defaultDetailContent != null)` → `if (true)` → red GATE
 * `ctorAttachGuarded`; the hook call removed from the wide arm → red LAZY `wideArmCalls` + `oneCaller`; in the rule
 * `return flagOn && phoneDisplay` → `return false && …` → red DESKTOP `ruleDefersOnlyPhoneOn` (and 3 CSH tests). Restored. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return '';
    const o = t.indexOf('{', at); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig));
  const count = (t, re) => (t.match(re) || []).length;
  const F = (v) => Object.entries(v).filter(([, x]) => !x).map(([k]) => k);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const tree = walk('Spixi').map((f) => [f, rd(f)]);
  const HPF = 'Spixi/Pages/Home/HomePage.xaml.cs';
  const HP = rd(HPF);

  /* ── 1: GATE ── */
  const FIELD = /private SpixiContentPage\? defaultDetailContent = EmptyDetailRules\.constructAtStart\(SpixiFlags\.PhoneNoEmptyDetail, phoneForEmptyDetail\(\)\) \? new EmptyDetail\(\) : null;/;
  const hook = body(HP, 'private void buildDefaultDetailOnFirstWide()');
  const HOOK = /^\{\s*if \(!EmptyDetailRules\.constructNow\(SpixiFlags\.PhoneNoEmptyDetail, phoneForEmptyDetail\(\), true, defaultDetailContent != null\)\)\s*\{\s*return;\s*\}\s*defaultDetailContent = new EmptyDetail\(\);\s*rightContent\.Content = defaultDetailContent\.Content;\s*\}$/;
  const remove = body(HP, 'public void removeDetailContent(bool setDefault = true)');
  const setDef = body(remove, 'if (setDefault)');
  const REBUILD = /^\{\s*bool hadDefault = defaultDetailContent != null;\s*if \(defaultDetailContent != null\)\s*\{\s*defaultDetailContent\.Dispose\(\);\s*\}\s*if \(EmptyDetailRules\.rebuild\(SpixiFlags\.PhoneNoEmptyDetail, phoneForEmptyDetail\(\), hadDefault\)\)\s*\{\s*defaultDetailContent = new EmptyDetail\(\);\s*rightContent\.Content = defaultDetailContent\.Content;\s*\}\s*Utils\.sendUiCommand\(this, "selectChat", ""\);\s*\}$/;
  const sites = tree.flatMap(([f, t]) => [...t.matchAll(/\bnew EmptyDetail\s*\(/g)].map(() => f));
  const fieldLine = (HP.match(/^.*\bdefaultDetailContent = EmptyDetailRules.*$/m) || [''])[0];
  const gate = {
    startGated: FIELD.test(HP) && count(fieldLine, /new EmptyDetail\(/g) === 1,
    hookGated: HOOK.test(hook),
    rebuildGated: REBUILD.test(setDef),
    oneSitePerGate: sites.length === 3 && sites.every((f) => f === HPF)
      && count(hook, /new EmptyDetail\(/g) === 1 && count(setDef, /new EmptyDetail\(/g) === 1,
    ctorAttachGuarded: /webView\.Opacity = 0;[\s\S]*?loadPage\(webView, "index\.html"\);\s*if \(defaultDetailContent != null\)\s*\{\s*rightContent\.Content = defaultDetailContent\.Content;\s*\}/.test(body(HP, 'private HomePage()')),
  };
  ok(F(gate).length === 0,
    '★ perfb1 P-13 GATE [failing: ' + JSON.stringify(F(gate)) + '] — every `new EmptyDetail()` in Spixi/**/*.cs sits behind EmptyDetailRules — the field initializer (constructAtStart ? new : null), the first-wide hook (constructNow, `exists` = the field) and removeDetailContent (rebuild, `existed` read before the dispose); three sites, all in HomePage; the constructor attaches the page only when it exists — sites: ' + JSON.stringify(sites));

  /* ── 2: LAZY ── */
  const size = body(HP, 'private void OnPageSizeChanged(');
  const elseAt = size.search(/\}\s*else\s*\{/);
  const narrowArm = elseAt > 0 ? size.slice(0, elseAt) : '';
  const wideArm = elseAt > 0 ? size.slice(elseAt) : '';
  const hookCalls = tree.reduce((n, [, t]) => n + count(t, /\bbuildDefaultDetailOnFirstWide\(\)/g), 0);
  const lazy = {
    firstStatement: /^\{\s*if \(Width < 700 \|\| isPhoneDisplay\(\)\)\s*\{/.test(size),
    wideArmCalls: /mainGrid\.ColumnDefinitions\[1\]\.Width = GridLength\.Star;\s*buildDefaultDetailOnFirstWide\(\);\s*rightContent\.IsVisible = true;/.test(wideArm),
    notNarrow: !/buildDefaultDetailOnFirstWide/.test(narrowArm),
    oneCaller: hookCalls === 2 && count(size, /\bbuildDefaultDetailOnFirstWide\(\);/g) === 1,
    sizeHandler: count(HP, /SizeChanged \+= OnPageSizeChanged;/g) === 1 && count(HP, /\bOnPageSizeChanged\b/g) === 2,
  };
  ok(F(lazy).length === 0,
    '★ perfb1 P-13 LAZY [failing: ' + JSON.stringify(F(lazy)) + '] — the deferred page is built in ONE place, buildDefaultDetailOnFirstWide, whose one caller is the WIDE arm of OnPageSizeChanged (the SizeChanged handler: main thread), right before `rightContent.IsVisible = true;` — never in the narrow (phone) arm; the handler still starts with `if (Width < 700 || isPhoneDisplay())` — hookMentions=' + hookCalls);

  /* ── 3: NULLSAFE ── */
  const SAFE = [
    FIELD,
    /if \(defaultDetailContent != null\)\s*\{\s*rightContent\.Content = defaultDetailContent\.Content;\s*\}/,   // the ctor (also the tail of the hook / rebuild: matched by their own shapes first)
    /public SpixiContentPage\? getDefaultDetailContent\(\)\s*\{\s*return defaultDetailContent;\s*\}/,
    /public void reloadDefaultDetail\(\)\s*\{\s*try\s*\{\s*defaultDetailContent\?\.reload\(\);\s*\}/,
  ];
  let masked = HP;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  if (hook && HOOK.test(hook)) masked = masked.replace(hook, blank(hook));
  if (setDef && REBUILD.test(setDef)) masked = masked.replace(setDef, blank(setDef));
  const shapeHits = SAFE.map((re) => { const m = re.exec(masked); if (m) masked = masked.slice(0, m.index) + blank(m[0]) + masked.slice(m.index + m[0].length); return !!m; });
  const leftover = count(masked, /\bdefaultDetailContent\b/g);
  const outside = tree.filter(([f, t]) => f !== HPF && /\bdefaultDetailContent\b/.test(t)).map(([f]) => f);
  const getCalls = tree.flatMap(([f, t]) => [...t.matchAll(/^.*\bgetDefaultDetailContent\(\).*$/gm)].map((m) => [f, m[0].trim()]))
    .filter(([f, l]) => !(f === HPF && /^public SpixiContentPage\? getDefaultDetailContent\(\)$/.test(l)));
  const reloadCalls = tree.flatMap(([f, t]) => [...t.matchAll(/^.*\breloadDefaultDetail\(\).*$/gm)].map((m) => [f, m[0].trim()]))
    .filter(([f, l]) => !(f === HPF && /^public void reloadDefaultDetail\(\)$/.test(l)));
  const UH = rd('Spixi/Utils/UIHelpers.cs');
  const add = body(UH, 'void add(Page? p)');
  const readers = body(HP, 'public SpixiContentPage? getDefaultDetailContent()') + body(HP, 'public void reloadDefaultDetail()');
  const nullsafe = {
    allUsesNullSafe: shapeHits.every(Boolean) && leftover === 0,
    privateToHome: outside.length === 0,
    getReaders: getCalls.length === 1 && getCalls[0][0] === 'Spixi/Utils/UIHelpers.cs'
      && getCalls[0][1] === 'add(HomePage.InstanceOrNull()?.getDefaultDetailContent());'
      && /^\{\s*if \(p is SingleChatPage blankChat && blankChat\.friend == null\)\s*\{\s*return;\s*\}\s*if \(p is SpixiContentPage sp && sp\.hasGeneratedContent && !pages\.Contains\(sp\)\)\s*\{\s*pages\.Add\(sp\);\s*\}\s*\}$/.test(add),
    reloadReaders: reloadCalls.length >= 1 && reloadCalls.every(([, l]) => /\?\.reloadDefaultDetail\(\);$/.test(l)),
    readersBuildNothing: readers.length > 0 && !/\bnew\b/.test(readers),
  };
  ok(F(nullsafe).length === 0,
    '★ perfb1 P-13 NULLSAFE [failing: ' + JSON.stringify(F(nullsafe)) + '] — every use of HomePage.defaultDetailContent is in a null-safe shape (the gated field · the guarded attach · the hook · the rebuild · `return` from the nullable accessor · `?.reload()`) and none is left outside them (a derived sweep); no other file names the field; UIHelpers passes the accessor into add(Page?), whose type patterns drop a null, and every reloadDefaultDetail call is `?.`; the accessors construct nothing — ' + JSON.stringify({ leftover, shapeHits, outside, getCalls, reloadCalls }));

  /* ── 4: DESKTOP (and the rule) ── */
  const rules = raw('Spixi/Utils/EmptyDetailRules.cs');
  const rulesC = stripCode(rules);
  const proj = raw('scripts/csh/csh.csproj');
  const tests = existsSync(join(root, 'scripts/csh/PerfB1EmptyDetailTests.cs')) ? raw('scripts/csh/PerfB1EmptyDetailTests.cs') : '';
  const phone = body(HP, 'private static bool phoneForEmptyDetail()');
  const isPhone = body(HP, 'private static bool isPhoneDisplay()');
  const desk = {
    phoneInput: /^\{\s*return SpixiFlags\.PhoneNoEmptyDetail && isPhoneDisplay\(\);\s*\}$/.test(phone)
      && count(HP, /\bphoneForEmptyDetail\(\)/g) === 4,
    mobileOnly: /^\{\s*if \(DeviceInfo\.Platform != DevicePlatform\.Android && DeviceInfo\.Platform != DevicePlatform\.iOS\)\s*\{\s*return false;\s*\}/.test(isPhone),
    ruleDefersOnlyPhoneOn: /internal static bool defers\(bool flagOn, bool phoneDisplay\)\s*\{\s*return flagOn && phoneDisplay;\s*\}/.test(rulesC)
      && /internal static bool constructAtStart\(bool flagOn, bool phoneDisplay\)\s*\{\s*return !defers\(flagOn, phoneDisplay\);\s*\}/.test(rulesC)
      && /internal static bool constructNow\(bool flagOn, bool phoneDisplay, bool wide, bool exists\)\s*\{\s*if \(exists\)\s*\{\s*return false;\s*\}\s*return wide \|\| constructAtStart\(flagOn, phoneDisplay\);\s*\}/.test(rulesC)
      && /internal static bool rebuild\(bool flagOn, bool phoneDisplay, bool existed\)\s*\{\s*return existed \|\| constructAtStart\(flagOn, phoneDisplay\);\s*\}/.test(rulesC),
    rulePure: !/^\s*using\s/m.test(rulesC) && !/Microsoft\.Maui|IXICore|SpixiFlags|DeviceInfo/.test(rulesC),
    flagShape: /public static bool PhoneNoEmptyDetail \{ get; private set; \} = true;/.test(rd('Spixi/Utils/SpixiFlags.cs')),
    harness: /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/EmptyDetailRules\.cs" \/>/.test(proj) && /\[TestClass\]\s*public class PerfB1EmptyDetailTests/.test(tests)
      && /not_a_phone_display_is_built_at_start_no_change/.test(tests) && /switch_off_is_todays_path_on_every_idiom/.test(tests)
      && /the_first_wide_layout_builds_it_once_never_twice/.test(tests),
  };
  ok(F(desk).length === 0,
    '★ perfb1 P-13 DESKTOP [failing: ' + JSON.stringify(F(desk)) + '] — Windows / Mac / tablets build the page at start as before — the "phone" input is `SpixiFlags.PhoneNoEmptyDetail && isPhoneDisplay()` (no display read with the switch OFF; used by the field, the hook and the rebuild), isPhoneDisplay refuses every platform but Android / iOS FIRST, and EmptyDetailRules defers only for (switch ON && phone display); the rule is pure and executed in scripts/csh (PerfB1EmptyDetailTests)');
}
