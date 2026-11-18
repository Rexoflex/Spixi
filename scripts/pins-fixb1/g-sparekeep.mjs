/* ==== fixb1 item 7 — SpareKeepShortSleep ON by default; the two fixb1 switches and their ONE [FLAGS] line (P50 / P51).
 *
 * Mechanism: docs/fixb1-mechanisms.md § Notes, item 7 (the switch read its preference with absent = 0 and the opt-in rule
 * "a stored 1 AND dev mode"). Now it takes the rule of the other three: S16PassRules.effectiveFlag (absent = ON, a stored 0
 * turns it off only in dev mode). The REAL SpixiFlags.init runs in csh (FixB1Tests.spare_keep_matrix, spare_keep_fresh_start_line,
 * new_flags_defaults_and_dev_mode; PerfB1FlagsTests). This SOURCE pin (stripCode; brace-matched bodies) holds:
 *   SPAREKEEP — the local `pk = 1` before init's try, the read `Get(SpareKeepShortSleepKey, 1)` inside it, the compute
 *               `S16PassRules.effectiveFlag(dev, pk)` after the catch; no `effectiveOptIn` anywhere (Spixi/**, scripts/csh/**);
 *               the property start value stays `= false` (before init = the old path); leaveDevMode is unchanged
 *               (`SpareKeepShortSleep = false;`, its only statement); the perfb1 [FLAGS] line and its words unchanged (the adb
 *               walk parses it);
 *   NEW FLAGS — the two keys `flagConfirmSafeDefault` / `flagDividerHoverLine`, the two properties `= true`, the two reads
 *               with absent 1 inside the try, both through S16PassRules.effectiveFlag after the catch; ONE
 *               `Logging.info(FixB1Rules.flagsLine(ConfirmSafeDefault, DividerHoverLine))` right after the perfb1 line, the
 *               last statement of init; flagsLine = fixed words and 0|1 only.
 *   FLAGSFILE — ★ #46 r4 (R4-3): SpixiFlags.cs WHOLE by SHA-256 of the exact bytes (a `#if WINDOWS` / `System.OperatingSystem.IsWindows()` arm that sets fc / xc / dev → red).
 * re-based by fixb2 item 4 (SpixiFlags.cs: + the two item-4 keys, properties, reads and computes and ONE `Logging.info(FixB2Rules.flagsLine(…))` after the fixb1 line) — FLAGSFILE hash;
 *               `oneLineAfterPerfb1`: the fixb1 line is followed by nothing but that ONE exact item-4 group (optional here; held in full by pins-fixb2/d-pay-confirm FLAGS);
 *               `compute`: `ConfirmSafeDefault = ` counted as a whole word (the new names end with it).
 * re-based by fixb2 #46 r1 (comment text): the doc comments of PayConfirmSafeDefault / MiniAppConfirmSafeDefault in SpixiFlags.cs now say that the safe path also needs NativeConfirm
 *               (FixB2Rules.useSafeDialog) and that the [FLAGS] line is written on every platform while the switches act only on Windows; no code token changed — FLAGSFILE hash only.
 * Deliberate breaks (#802): fixb1 builder-a report — the read's absent value 1 → 0 → red `readAbsentOn` (+ CSH); the compute
 * back to an opt-in shape (`dev && pk == 1`) → red `computeRule`; the start value `= true` → red `startValueOld`; the fixb1
 * line moved before the perfb1 line → red `oneLineAfterPerfb1`; `dividerline=` → `divider=` → red `lineWords`. Restored. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';
// ★ photo1a #46 r8 (2026-11-18, NIT-1): the tail is now FOUR computes + flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore); the text below is the 2026-11-17 state.
// ★ photo1a re-base (2026-11-17): fixb1 NEW FLAGS (the fixb1 line is no longer init's last statement: an optional EXACT photo1a tail may follow: 2 computes + the one `Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks));`) · fixb1 item 7 FLAGSFILE (new SHA-256 b89f31b4… after a look at `git diff -- Spixi/Utils/SpixiFlags.cs`: pure insertion, 0 deleted lines, no #if — 2 key consts, 2 `{ get; private set; } = false` props, `int qa = 1, qf = 1;`, 2 `Preferences.Default.Get(…, 1)` reads inside the try, 2 `effectiveFlag` computes, ONE flagsLine log line) — same claims, new shape.
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rd = (f) => stripCode(raw(f));
  const span = (t, sig, from = 0) => {
    const at = t.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
    const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, end: k + 1, text: t.slice(o, k + 1) }; }
    return { at, end: -1, text: '' };
  };
  const count = (t, s) => t.split(s).length - 1;
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);

  const SF = rd('Spixi/Utils/SpixiFlags.cs');
  const init = span(SF, 'public static void init()').text;
  const at = (s) => init.indexOf(s);
  const iTry = init.search(/\btry\s*\{/), iCatch = at('catch (Exception ex)');
  const iCatchEnd = iCatch < 0 ? -1 : iCatch + span(init, 'catch (Exception ex)', iCatch).text.length;
  const inTry = (s) => count(init, s) === 1 && at(s) > iTry && at(s) < iCatch;
  const afterCatch = (s) => count(init, s) === 1 && at(s) > iCatchEnd && iCatchEnd > 0;
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const optInLeft = [...walk('Spixi'), ...walk('scripts/csh')].filter((f) => /\beffectiveOptIn\b/.test(rd(f)));
  const PERF_LINE = 'Logging.info(PerfB1Rules.flagsLine(WarmOnIdle, SpareRearm, SpareKeepShortSleep, PhoneNoEmptyDetail));';
  const FIX_LINE = 'Logging.info(FixB1Rules.flagsLine(ConfirmSafeDefault, DividerHoverLine));';
  /* ★ photo1a re-base (2026-11-17): fixb1 NEW FLAGS — the fixb1 line is no longer the LAST statement of init: the lead's photo1a block
   * follows it (two computes + the photo1a [FLAGS] line; pins-photo1a/a-open holds that block). The re-based claim: the fixb1 line is
   * still ONE and still comes right after the perfb1 line, and what may follow it is nothing (the pre-batch shape) or EXACTLY the
   * photo1a block — any other trailing statement is red. */
  const PHOTO_TAIL = ['PhotoMediaAfterPaint = S16PassRules.effectiveFlag(dev, qa);', 'PhotoFewerFileChecks = S16PassRules.effectiveFlag(dev, qf);',
    'PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt) && ChatMediaStore.platformOn;', 'VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;',   // ★ photo1a re-base (2026-11-18): PO-3 / PO-6 are back — 4 computes, the line takes 4 properties
    'Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore));'];
  const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RU = rd('Spixi/Utils/PerfB1Rules.cs');
  const FX = rd('Spixi/Utils/FixB1Rules.cs');

  /* ── SPAREKEEP ── */
  const sk = {
    found: init.length > 0 && iTry > 0 && iCatch > iTry,
    localOn: /int pw = 1, pr = 1, pk = 1, pn = 1;/.test(init) && at('int pw = 1, pr = 1, pk = 1, pn = 1;') < iTry,
    readAbsentOn: inTry('pk = Preferences.Default.Get(SpareKeepShortSleepKey, 1);') && count(SF, 'Get(SpareKeepShortSleepKey') === 1,
    computeRule: afterCatch('SpareKeepShortSleep = S16PassRules.effectiveFlag(dev, pk);') && count(SF, 'SpareKeepShortSleep = ') === 2,
    noOptInLeft: optInLeft.length === 0,
    startValueOld: /public static bool SpareKeepShortSleep \{ get; private set; \} = false;/.test(SF),
    leaveDevModeKept: /public static void leaveDevMode\(\)\s*\{\s*SpareKeepShortSleep = false;\s*\}/.test(SF),
    perfLineKept: count(SF, PERF_LINE) === 1 && afterCatch(PERF_LINE)
      && /public static string flagsLine\(bool warmIdle, bool spareRearm, bool spareKeep, bool noEmptyDetail\)\s*\{\s*return "\[FLAGS\] warmidle=" \+ b\(warmIdle\) \+ " sparerearm=" \+ b\(spareRearm\) \+ " sparekeep=" \+ b\(spareKeep\)\s*\+ " noemptydetail=" \+ b\(noEmptyDetail\);\s*\}/.test(RU),
  };
  ok(F(sk).length === 0,
    '★ fixb1 item 7 SPAREKEEP: SpixiFlags.init reads flagSpareKeepShortSleep with absent = 1 inside its try and computes SpareKeepShortSleep = S16PassRules.effectiveFlag(dev, pk) after the catch (ON by default; a stored 0 acts only in dev mode); PerfB1Rules.effectiveOptIn is gone (Spixi + the harness); the start value stays false (before init = the old path); leaveDevMode still sets it false (the old path in this process); the perfb1 [FLAGS] line and its words are unchanged — failing: ' + JSON.stringify(F(sk)) + (optInLeft.length ? ' optIn in: ' + optInLeft.join(',') : ''));

  /* ── NEW FLAGS ── */
  const nf = {
    keys: /public const string ConfirmSafeDefaultKey = "flagConfirmSafeDefault";/.test(SF) && /public const string DividerHoverLineKey = "flagDividerHoverLine";/.test(SF)
      && count(SF, '"flagConfirmSafeDefault"') === 1 && count(SF, '"flagDividerHoverLine"') === 1,
    props: /public static bool ConfirmSafeDefault \{ get; private set; \} = true;/.test(SF) && /public static bool DividerHoverLine \{ get; private set; \} = true;/.test(SF),
    locals: /int fc = 1, fd = 1;/.test(init) && at('int fc = 1, fd = 1;') < iTry,
    reads: inTry('fc = Preferences.Default.Get(ConfirmSafeDefaultKey, 1);') && inTry('fd = Preferences.Default.Get(DividerHoverLineKey, 1);'),
    compute: afterCatch('ConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fc);') && afterCatch('DividerHoverLine = S16PassRules.effectiveFlag(dev, fd);')
      && (SF.match(/\bConfirmSafeDefault = /g) || []).length === 1 && count(SF, 'DividerHoverLine = ') === 1,   // ★ re-based by fixb2 item 4: a whole word (PayConfirmSafeDefault / MiniAppConfirmSafeDefault end with it)
    oneLineAfterPerfb1: count(SF, 'FixB1Rules.flagsLine(') === 1
      && new RegExp(PERF_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*ConfirmSafeDefault = S16PassRules\\.effectiveFlag\\(dev, fc\\);\\s*DividerHoverLine = S16PassRules\\.effectiveFlag\\(dev, fd\\);\\s*'
        + FIX_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        /* ★ re-based by fixb2 item 4: after the fixb1 line ONLY the item-4 group may follow (pins-fixb2/d-pay-confirm FLAGS holds it in full) · ★ merge with photo1a (2026-11-18): then the optional exact photo1a tail */
        + '(?:\\s*PayConfirmSafeDefault = S16PassRules\\.effectiveFlag\\(dev, fp\\);\\s*MiniAppConfirmSafeDefault = S16PassRules\\.effectiveFlag\\(dev, fm\\);\\s*Logging\\.info\\(FixB2Rules\\.flagsLine\\(PayConfirmSafeDefault, MiniAppConfirmSafeDefault\\)\\);)?'
        + '(?:\\s*' + PHOTO_TAIL.map(reEsc).join('\\s*') + ')?'
        + '\\s*\\}$').test(init),
    lineWords: /public static string flagsLine\(bool confirmDefault, bool dividerLine\)\s*\{\s*return "\[FLAGS\] confirmdefault=" \+ b\(confirmDefault\) \+ " dividerline=" \+ b\(dividerLine\);\s*\}/.test(FX)
      && /private static string b\(bool v\) => v \? "1" : "0";/.test(FX),
    noDevControl: !/ConfirmSafeDefault|DividerHoverLine|confirmdefault|dividerline/.test(rd('Spixi/Pages/Dev/DevPage.xaml.cs')),
  };
  ok(F(nf).length === 0,
    '★ fixb1 NEW FLAGS (P50 / P51): SpixiFlags — flagConfirmSafeDefault + flagDividerHoverLine (int prefs, absent = 1) read in init\'s try, ConfirmSafeDefault / DividerHoverLine default ON through S16PassRules.effectiveFlag after the catch; ONE Logging.info(FixB1Rules.flagsLine(…)) right after the perfb1 line, the last statement of init ("[FLAGS] confirmdefault=<0|1> dividerline=<0|1>"); no Developer-screen control in this batch — failing: ' + JSON.stringify(F(nf)));

  /* ── HARNESS ── */
  const T = existsSync(join(root, 'scripts/csh/FixB1Tests.cs')) ? raw('scripts/csh/FixB1Tests.cs') : '';
  const hz = {
    tests: ['flags_line_text', 'new_flags_defaults_and_dev_mode', 'spare_keep_matrix', 'spare_keep_fresh_start_line']
      .every((m) => new RegExp('\\[TestMethod\\]\\s*public void ' + m + '\\(\\)').test(T)),
    compiled: count(raw('scripts/csh/csh.csproj'), '<Compile Include="../../Spixi/Utils/FixB1Rules.cs" />') === 1,
  };
  ok(F(hz).length === 0,
    '★ fixb1 item 7 HARNESS: FixB1Tests holds the flag-line, new-flag, sparekeep-matrix and fresh-start tests and csh.csproj compiles FixB1Rules.cs — failing: ' + JSON.stringify(F(hz)));

  /* ── FLAGSFILE (★ #46 r4, R4-3): SpixiFlags.cs WHOLE — the design answer is to freeze, not to add patterns ── */
  const FLAGS_FROZEN = 'f9e1abe4b93a418f2339142c38ba36914de70fce94f8ee99eaf776adf42e2722';   // ★ merge with fixb2 (2026-11-18): re-based after a look at the merged diff (fixb2's item-4 block, then photo1a's block; nothing else). Was (photo1a): 71d575ab… · was (fixb2): 8550c50f…
  const flagsGot = createHash('sha256').update(readBytes(join(root, 'Spixi/Utils/SpixiFlags.cs'))).digest('hex');
  ok(flagsGot === FLAGS_FROZEN,
    '★ fixb1 item 7 FLAGSFILE (#46 r4 R4-3): Spixi/Utils/SpixiFlags.cs is held WHOLE by SHA-256 of its EXACT bytes — init() reads every switch there, and a statement the keys above do not name (`#if WINDOWS / dev = true; fc = 0; xc = 0; / #endif` before `SecureWalletPass = …`, `if (System.OperatingSystem.IsWindows()) { fc = 0; }`, a comment line-ended by a lone CR / U+0085 / U+2028 / U+2029) would switch the safety flags per platform where the csh harness never looks. A line-end or BOM change also turns this red. Re-base ONLY after a look at the diff (#1596; pins-perfb1toggle/a-extra counts mentions in this file and does not conflict). want ' + FLAGS_FROZEN.slice(0, 12) + '… got ' + flagsGot);
}
