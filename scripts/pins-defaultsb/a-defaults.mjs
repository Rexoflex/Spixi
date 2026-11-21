/* ==== defaultsb · A — the Defaults batch (Damir's ruling 1750): a NEW account starts with App lock On and Confirm payments On; the
 * no-auth window after leaving the app is one minute. Contract docs/contract-defaultsb.md § 3 / § 5.
 *
 * LIMITS — read first (DECISIONS 1735 / 1627: the limits of a source pin are stated, not hidden). This is a SOURCE pin. The
 * behaviour of the rules RUNS in the C# harness (scripts/csh/DefaultsTests.cs, over the REAL DefaultsRules.cs and the REAL
 * SpixiFlags.init); the MAUI-bound sites (LaunchPage.xaml.cs, App.xaml.cs) cannot be compiled in the cloud, so this module reads
 * their TEXT. What it does NOT catch:
 *   · deliberately hidden code: a masked `#define` / `#if` trick, a `using X = …;` alias, a type that shadows DefaultsRules /
 *     SpixiFlags / SPayments / Preferences, a second partial of a class, reflection by a name built from pieces, a csproj
 *     `Compile Remove`, an identifier written with a `\u` escape or with a Unicode format character;
 *   · a C# 11 raw string literal (`"""…"""`) — the comment mask does not know it. `Spixi/Platforms/iOS/iOSWebViewHandler.cs` HAS raw
 *     string literals and d3 reads it (d3 scans every C# file of Spixi/): that is a file where a caller of writeNewAccount /
 *     stampAfterUnlock / a switch hidden inside a raw string (or behind a comment mark inside one) would not be seen; none of the
 *     files read by the other keys has one;
 *   · a key name built from pieces (e.g. `"lock" + "enabled"`) or a write from a `[ModuleInitializer]` in another file is not seen by
 *     d3 (reader P MINOR-2: d3 counts whole words and strings, not what a program builds at run time);
 *   · anything a device does: that OnResume is reached, that the lock is drawn, that 61 s away asks and 59 s does not — the walk
 *     rows of docs/walk-defaultsb.md prove those;
 *   · the Ixian-Core files and the platform SDK (Preferences itself);
 *   · files outside Spixi/ (.cs), src/ and Spixi/Resources/Raw/html.
 * What it holds is the text of the tree: the pull request's diff review and the platform compiles hold the rest.
 * Comments are masked first (comments → spaces, newlines kept, strings kept — the coldstart1 / photo1a mask, copied here so that
 * this module stands alone); brace walks use a second mask that also blanks string contents.
 * BASE = 14ae57f2 ("Merge pull request #16 from Rexoflex/work/photo1a"). The SHA-256 values below are FROZEN CONSTANTS, computed
 * from `git show 14ae57f2:<path>` when this pin was written (the pin runs in CI and on tree copies with no git): the five whole
 * files and LaunchPage.xaml.cs by `sha256sum` of the exact bytes; the two App.xaml.cs values by this module's own `appViews`
 * (exported for that) over the base text.
 *   d1 sites        — the two call sites: ONE statement each, the exact text, on its own line directly after the
 *                     `Preferences.Default.Remove("lockenabled");` line — in the create body (`if (Node.generateWallet(pass))`, before
 *                     `Remove("walletpass")`) and as the second statement of applyRestorePrefs; outside every `#if`
 *   d2 sitesRest    — LaunchPage.xaml.cs with those two LINES taken out is the base file BYTE FOR BYTE (nothing moved, nothing else)
 *   d3 names        — an exact table name → file → count over every C# file of Spixi/ (comments masked): writeNewAccount has TWO
 *                     callers and no other; lockEnabledStored / withinGrace / stampAfterUnlock ONE each (App.xaml.cs); each switch
 *                     is read only at its site(s) (LockDelayOneMinute: the grace statement and the unlock statement); the three keys and their strings only in SpixiFlags.cs (declared + read: nothing stores them);
 *                     LOCK_GRACE_SECONDS is gone; `lockenabled` / PAYMENT_AUTH_PREF / `paymentauth` have NO new writer or reader
 *                     (no start, update or migration path writes a default); the three key strings are in no file of src/ or
 *                     Spixi/Resources/Raw/html (C#-only preferences)
 *   d4 isLockEnabled — App.isLockEnabled()'s body is the ONE delegating statement; the signature stays
 *   d5 grace        — OnResume holds the ONE statement `bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds,
 *                     SpixiFlags.LockDelayOneMinute);`, outside every `#if`; `withinGrace` is assigned nowhere else
 *   d6 onResumeRest — OnResume's body with that one statement taken out equals the base body with ITS one statement taken out
 *                     (comments masked, whitespace collapsed; SHA-256): the stamp, the negative-age input, dismissPauseLock, the #500
 *                     re-stamp, the deferred prompt, presentAppLock — all the base's
 *   d7 appRest      — the WHOLE App.xaml.cs with isLockEnabled's body, the one grace statement, the ONE unlock statement (d13)
 *                     and the LOCK_GRACE_SECONDS declaration taken out equals the base the same way: App() and every other
 *                     method are the base's
 *   d8 untouched    — SPayments.cs, SConfirm.cs, SDesktopIdle.cs, LockPage.xaml.cs, SettingsPage.xaml.cs are byte-identical to the base
 *   d9 rulesClean   — DefaultsRules.cs (the RAW text, comments included) holds no `ixian:`, sendUiCommand, SecureStorage,
 *                     WalletPassStore, walletpass, timer, Task, Thread; its code holds no bridge / clock / wait word (`DateTime`
 *                     only as the TYPE, twice, in the ONE signature of stampAfterUnlock — no member of it is read); its usings are
 *                     exactly System, IXICore.Meta, Microsoft.Maui.Storage; it calls Preferences ONLY as ContainsKey(LockKey),
 *                     Get(LockKey, false), Set(LockKey, true), Set(payKey, true) — no Remove, no Clear, no other key
 *   d10 rulesBodies — the six members and three constants of DefaultsRules are the expected text (lockEnabledStored = the old body
 *                     of App.isLockEnabled; withinGrace = `>= 0 && <= graceSeconds(…)`; 60 / 5; stampAfterUnlock = `oneMinute ? null
 *                     : stamp`; each write in its own try; the two fixed log lines; a failed write logs the exception TYPE only)
 *   d11 flags       — SpixiFlags: the three keys, the three properties with the start value `false`, the reads inside init's try with
 *                     absent = 1, S16PassRules.effectiveFlag after the catch, ONE Logging.info(DefaultsRules.flagsLine(…)) directly
 *                     after the photo1a group as the LAST statement of init, outside every `#if`; no Developer-screen control
 *   d12 harness     — csh.csproj compiles DefaultsRules.cs and DefaultsTests.cs holds its 15 tests (the module's row count is now 14: d14 is
 *                     the one added row)
 *   d13 unlock      — ★ #46 round 1 (R1-2): App.onUnlock holds the ONE inserted statement `backgroundedDate =
 *                     DefaultsRules.stampAfterUnlock(backgroundedDate, SpixiFlags.LockDelayOneMinute);` on its own line directly
 *                     after `unlockedDate = DateTime.Now;` — AFTER the `S16SecRules.unlockReleases(e)` guard (only a verified unlock
 *                     clears the leaving stamp), outside every `#if`; the whole body is the base's eight statements plus that one;
 *                     `backgroundedDate` is written at five sites and no other (the field, markBackgrounded, OnResume's clear and
 *                     its #500 re-stamp, this one)
 * Deliberate breaks (#802; builder B1, each ONE mutation in a full copy of the tree, run with --root, then restored and compared):
 * the create call line moved below `Remove("walletpass")` → red d1 only; the restore call's second argument → `true` → red d1 + d2 +
 * d3; `Remove("walletCreatedHere")` → `…Here2` in applyRestorePrefs → red d2 only; a NEW Spixi/Utils file that reads
 * SpixiFlags.LockDelayOneMinute, and one that calls writeNewAccount → red d3 only; `// flagDefaultAppLockOn` in src/bridge/native.js →
 * red d3 only (keysNotInTheWebView); isLockEnabled `return` → `return !` → red d4 only; the grace statement's `sinceBackground` →
 * `sinceUnlock` → red d5 only; OnResume `!dismissPauseLock(held)` → `dismissPauseLock(held)` → red d6 + d7 (the file holds the body);
 * App()'s `if (isLockEnabled())` → `if (!isLockEnabled())` → red d7 only; SPayments `Get(PAYMENT_AUTH_PREF, false)` → `true` → red d8
 * only; a comment line `// timer` in DefaultsRules.cs → red d9 only; a fourth using there → red d9 only; withinGrace `>= 0` → `> 0` →
 * red d10 only (+ CSH); GraceSecondsNew 60 → 600 → red d10 only (+ CSH); the read `Get(LockDelayOneMinuteKey, 1)` → `, 0)` → red d11
 * only (+ CSH, + pins-fixb1/g-sparekeep FLAGSFILE); the start value of DefaultAppLockOn `false` → `true` → red d11 only; a test of
 * DefaultsTests renamed → red d12 only.
 * ★ #46 round 1 (R1-2, the fix builder; the same method): the unlock statement's `SpixiFlags.LockDelayOneMinute` → `true` → red d3 +
 * d13; the unlock line moved ABOVE the guard (the first line of onUnlock) → red d13 only; the unlock line moved below
 * `SpixiContentPage.hidePrivacyShield();` → red d13 only; the unlock line wrapped in `#if ANDROID` … `#endif` → red d7 + d13;
 * a second `backgroundedDate = null;` in dismissPauseLock → red d7 + d13; onUnlock `pauseLock = null;` → `pauseLock = pauseLock;` →
 * red d7 + d13 (the file holds the body); a NEW Spixi/Utils file that calls DefaultsRules.stampAfterUnlock → red d3 only;
 * stampAfterUnlock `oneMinute ? null : stamp` → `oneMinute ? stamp : null` → red d10 only (+ CSH stamp_after_unlock); a statement
 * `DateTime now = DateTime.Now;` in stampAfterUnlock → red d9 + d10; `[TestMethod]` taken off stamp_after_unlock → red d12 only;
 * the unlock line deleted (the fix reverted) → red d3 + d13; its first argument → `null` → red d13 only; its comment `(#1750)` →
 * `(#1751)` → red d13 only; a SECOND unlock statement — in lockOnPause (after onUnlock in the file) or in markBackgrounded (before
 * it: the cut then takes the wrong one and the real one stays in the hash) → red d3 + d7 + d13 both times.
 *   d14 rulesWhole  — ★ #46 round 2 (reader P MAJOR-1 / MINOR-1): Spixi/Utils/DefaultsRules.cs is held WHOLE: the SHA-256 of its exact bytes
 *                     (the file has no BOM and no CR, so the raw bytes and the BOM-stripped, CRLF → LF text are the same — the module's
 *                     other whole-file hashes, d2 / d8, use the raw bytes; so does this one) equals a FROZEN constant, the hash of the
 *                     file as it stood when this key was written (`sha256sum Spixi/Utils/DefaultsRules.cs`). Any edit of the file —
 *                     also a comment — re-bases this hash after a look at its diff (the #1653 precedent). It closes what the text
 *                     patterns of d9 / d10 could not: an attribute inserted above a member (`[System.Diagnostics.Conditional("SPIXI_CSH")]`
 *                     above writeNewAccount compiles both call sites to nothing in a store build, and the harness, which defines the
 *                     symbol, would not notice) and any change of a catch (the App-lock write's catch is not run by the harness).
 *                     d9 ALSO forbids any `[` in the string-blanked code of the file (no attribute at all): a second, independent net.
 * ★ #46 round 2 deliberate breaks (#802; each ONE mutation in a copy of the tree, run with --root): the line
 * `[System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]` above writeNewAccount in DefaultsRules.cs → red d9 + d14 (every other key
 * and the CSH tests stay green: that was the hole); the first `catch (Exception ex)` → `catch (ArgumentNullException ex)` → red d14
 * + d10; a comment-only edit of DefaultsRules.cs → red d14 only. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // the file as it is on disk (no CRLF normalisation; a BOM kept)

const count = (t, s) => t.split(s).length - 1;
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const sha = (s) => createHash('sha256').update(s).digest('hex');
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const words = (t, name) => (t.match(new RegExp('(?<![A-Za-z0-9_])' + esc(name) + '(?![A-Za-z0-9_])', 'g')) || []).length;

/* comments -> spaces (newlines kept); strings and char literals kept (strings = false) or their CONTENTS blanked too (strings = true) */
export const mask = (t, strings = false) => {
  const out = t.split('');
  const n = t.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const str = (i, verbatim, interp) => {
    const open = i;
    i++;
    const done = (e) => { if (strings) blank(open + 1, Math.max(open + 1, e - 1)); return e; };
    while (i < n) {
      const c = t[i];
      if (verbatim) {
        if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return done(i + 1); }
      } else {
        if (c === '\\') { i += 2; continue; }
        if (c === '"') return done(i + 1);
        if (c === '\n') return done(i);
      }
      if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
      i++;
    }
    return done(i);
  };
  const code = (i, hole) => {
    let depth = 0;
    while (i < n) {
      const c = t[i], d = t[i + 1];
      if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
      if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
      if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); if (m && strings) blank(i + 1, i + m[0].length - 1); i += m ? m[0].length : 1; continue; }
      if (c === '"') { i = str(i, false, false); continue; }
      if (c === '@' && d === '"') { i = str(i + 1, true, false); continue; }
      if (c === '$' && d === '"') { i = str(i + 1, false, true); continue; }
      if ((c === '$' && d === '@' || c === '@' && d === '$') && t[i + 2] === '"') { i = str(i + 2, true, true); continue; }
      if (hole) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
      i++;
    }
    return i;
  };
  code(0, false);
  return out.join('');
};
/* the open preprocessor regions at a position: a stack of #if conditions (read on the comment-masked text) */
const regionsAt = (src, pos) => {
  const st = [];
  for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
    if (m[1] === 'if') st.push(m[2].trim());
    else if (m[1] === 'endif') st.pop();
    else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
  }
  return st;
};
/* the brace-matched block that follows `sig`: found on the string-blanked mask, returned from the comment mask (same length) */
const span = (code, bare, sig, from = 0) => {
  const at = bare.indexOf(sig, from); if (at < 0) return { at: -1, end: -1, text: '' };
  const o = bare.indexOf('{', at + sig.length); if (o < 0) return { at, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < bare.length; k++) { if (bare[k] === '{') d++; else if (bare[k] === '}' && --d === 0) return { at, open: o, end: k + 1, text: code.slice(o, k + 1) }; }
  return { at, end: -1, text: '' };
};

const LAUNCH_F = 'Spixi/Pages/Launch/LaunchPage.xaml.cs', APP_F = 'Spixi/App.xaml.cs', RULES_F = 'Spixi/Utils/DefaultsRules.cs',
  FLAGS_F = 'Spixi/Utils/SpixiFlags.cs';

/* the texts of the change */
const CALL = 'DefaultsRules.writeNewAccount(SpixiFlags.DefaultAppLockOn, SpixiFlags.DefaultPayConfirmOn, SPayments.paymentAuthSupported(), SPayments.PAYMENT_AUTH_PREF);';
const CALL_LINE = CALL + '   // ★ defaultsb (#1750)';
const REMOVE_LOCK = 'Preferences.Default.Remove("lockenabled");';
const LOCK_SIG = 'public bool isLockEnabled()';
const LOCK_NEW = '{ return DefaultsRules.lockEnabledStored(); }';
const LOCK_OLD = '{ bool locked = false; if (Preferences.Default.ContainsKey("lockenabled")) { locked = (bool)Preferences.Default.Get("lockenabled", false); } return locked; }';   // the base's body (the scratch check of the frozen hashes read it; d10 compares it with DefaultsRules)
const GRACE_NEW = 'bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds, SpixiFlags.LockDelayOneMinute);';
const CONST_OLD = 'private const double LOCK_GRACE_SECONDS = 5;';
const RESUME_SIG = 'protected override void OnResume()';
/* ★ #46 round 1 (R1-2): the ONE statement of App.onUnlock — a verified unlock clears the leaving stamp (d13) */
const UNLOCK_SIG = 'public void onUnlock(object sender, EventArgs e)';
const UNLOCK_NEW = 'backgroundedDate = DefaultsRules.stampAfterUnlock(backgroundedDate, SpixiFlags.LockDelayOneMinute);';
const UNLOCK_LINE = UNLOCK_NEW + '   // ★ defaultsb (#1750): a verified unlock clears the leaving stamp';
const UNLOCK_PREV = 'unlockedDate = DateTime.Now;';
const UNLOCK_GUARD = '{ if (!S16SecRules.unlockReleases(e)) { Logging.error("onUnlock: not a verified unlock - the lock stays"); return; } isLockScreenActive = false; ';
const UNLOCK_BODY = UNLOCK_GUARD + UNLOCK_PREV + ' ' + UNLOCK_NEW + ' SpixiContentPage.hidePrivacyShield(); pauseLock = null; pendingForegroundAuth = null; UIHelpers.refreshAppRequests = true; }';
const STAMP_SIG = 'public static DateTime? stampAfterUnlock(DateTime? stamp, bool oneMinute)';

/* App.xaml.cs reduced to "everything but the four edits". The body of isLockEnabled, the ONE `bool withinGrace = …;` statement and
   the FIRST `backgroundedDate = DefaultsRules.stampAfterUnlock(…);` statement (★ #46 round 1, R1-2; the base has none, so the cut
   changes nothing there) are cut out WHATEVER they say (d4 / d5 / d13 hold what they say and where), so that a change inside them
   is red on its own key and a change anywhere else is red on d6 / d7; `now` = false also takes the base's LOCK_GRACE_SECONDS
   declaration out. Exported: the two frozen
   APP hashes below are this function over `git show 14ae57f2:Spixi/App.xaml.cs` (now = false). */
const GRACE_CUT = /bool withinGrace = [^;]*;/g;
const UNLOCK_CUT = /backgroundedDate = DefaultsRules\.stampAfterUnlock\([^;]*; /;   // not global: ONE statement goes, a second one stays in the hash
export const appViews = (text, now) => {
  const code = mask(text.replace(/^\uFEFF/, '')), bare = mask(text.replace(/^\uFEFF/, ''), true);
  const resume = span(code, bare, RESUME_SIG);
  const lock = span(code, bare, LOCK_SIG);
  const unlock = span(code, bare, UNLOCK_SIG);
  const resumeN = norm(resume.text);
  const fileN = norm(code);
  const one = (t, x) => count(t, x) === 1;
  const lockOk = lock.end > 0 && one(bare, LOCK_SIG);
  let rest = lockOk ? norm(code.slice(0, lock.open) + '<LOCK>' + code.slice(lock.end)).replace(GRACE_CUT, '<GRACE>').replace(UNLOCK_CUT, '') : '<<NO isLockEnabled>>';
  if (!now) rest = rest.replace(CONST_OLD + ' ', '');
  return {
    found: resume.text.length > 0 && one(fileN, RESUME_SIG) && lockOk,
    lockBody: norm(lock.text),
    graceCuts: (fileN.match(GRACE_CUT) || []).length,
    graceCutsInResume: (resumeN.match(GRACE_CUT) || []).length,
    oneConst: now ? count(fileN, 'LOCK_GRACE_SECONDS') === 0 : one(fileN, CONST_OLD),
    resumeRest: sha(resumeN.replace(GRACE_CUT, '<GRACE>')),
    fileRest: sha(rest),
    lockAt: lock.at, resumeAt: resume.at, code, bare, fileN, resumeN,
    unlockFound: unlock.end > 0 && one(bare, UNLOCK_SIG),
    unlockN: norm(unlock.text),
    unlockCuts: (fileN.match(new RegExp(UNLOCK_CUT.source, 'g')) || []).length,
  };
};

/* FROZEN from the base 14ae57f2 (see the header) */
const BASE = {
  launchBytes: 'a8e3754b38cad494e5874119b0e9344cf449abfd285ab5f3e23428b9fc5f4acc',   // LaunchPage.xaml.cs, the exact bytes (a BOM)
  resumeRest: '4c4e5345c24792894ff0fe188d6682b94a5505d3e1b6d75e9d9cc9a75eecc02b',   // appViews(base, false).resumeRest
  appRest: '31be087bdb199c72b7bcc67af4ddcfb608d4e2f00182715eccf2d0487452727c',       // appViews(base, false).fileRest
  whole: {
    'Spixi/Utils/SPayments.cs': 'a43f7fa143366a994ae68536fcdc107892600bcbc6db8468cd4a728b0c2c8851',
    'Spixi/Utils/SConfirm.cs': '6b76e4a7e7ec7b93390de84b229a52115c29f9294b67fec1d8d5a4dc368a7e8f',
    'Spixi/Platforms/Windows/SDesktopIdle.cs': '008747db82b5319e1eaf803494eb41f1eb6aac4f04298fba576164a343186103',
    'Spixi/Pages/Launch/LockPage.xaml.cs': '20e6d1f3cfe24a53bf361b37b8ec175301ebfd0c782d0504941100703b89a1e5',
    'Spixi/Pages/Settings/SettingsPage.xaml.cs': '1a4a7b068c99944cbdb7a61a9756279501005e014e3baa1b077716dbc086839d',
  },
};

/* ★ #46 round 2 (d14): FROZEN — `sha256sum Spixi/Utils/DefaultsRules.cs` of the file as it stood when d14 was written (no BOM, no CR: raw bytes). A new
   value goes in only after a look at the diff of the file. */
const RULES_WHOLE = '3184bb273b182e4d3e203144e69b162a8db9ddd7bc29255319710b2163bde99a';

/* name → file → count, over the comment-masked code of every C# file of Spixi/ (whole words; a name inside a string counts) */
const NAMES = {
  writeNewAccount: { [LAUNCH_F]: 2, [RULES_F]: 1 },                       // the two call sites; the declaration
  lockEnabledStored: { [APP_F]: 1, [RULES_F]: 1 },
  withinGraceCall: { [APP_F]: 1 },                                        // `DefaultsRules.withinGrace(` (counted as text)
  stampAfterUnlock: { [APP_F]: 1, [RULES_F]: 1 },                         // ★ #46 r1 (R1-2): ONE caller (App.onUnlock); the declaration
  DefaultsRules: { [APP_F]: 3, [LAUNCH_F]: 2, [FLAGS_F]: 1, [RULES_F]: 1 },
  DefaultAppLockOn: { [LAUNCH_F]: 2, [FLAGS_F]: 3 },                      // the two reads; the property, its compute, the [FLAGS] argument
  DefaultPayConfirmOn: { [LAUNCH_F]: 2, [FLAGS_F]: 3 },
  LockDelayOneMinute: { [APP_F]: 2, [FLAGS_F]: 3 },                       // the grace statement (d5) and the unlock statement (d13)
  DefaultAppLockOnKey: { [FLAGS_F]: 2 },                                  // declared + read; nothing stores it
  DefaultPayConfirmOnKey: { [FLAGS_F]: 2 },
  LockDelayOneMinuteKey: { [FLAGS_F]: 2 },
  flagDefaultAppLockOn: { [FLAGS_F]: 1 },
  flagDefaultPayConfirmOn: { [FLAGS_F]: 1 },
  flagLockDelayOneMinute: { [FLAGS_F]: 1 },
  LOCK_GRACE_SECONDS: {},
  GraceSecondsOld: { [RULES_F]: 2 },
  GraceSecondsNew: { [RULES_F]: 2 },
  graceSeconds: { [RULES_F]: 2 },
  LockKey: { [RULES_F]: 4 },                                              // the constant, ContainsKey, Get, Set
  lockenabled: { [LAUNCH_F]: 2, 'Spixi/Pages/Settings/SettingsPage.xaml.cs': 3, [RULES_F]: 1 },   // the base's five + the ONE constant
  PAYMENT_AUTH_PREF: { [LAUNCH_F]: 2, 'Spixi/Pages/Settings/SettingsPage.xaml.cs': 2, 'Spixi/Utils/SPayments.cs': 2 },   // the base's four + the two call sites
  paymentauth: { 'Spixi/Utils/SPayments.cs': 1 },
};
const KEY_STRINGS = ['flagDefaultAppLockOn', 'flagDefaultPayConfirmOn', 'flagLockDelayOneMinute'];

export default async function (h) {
  const { ok, root, readdirSync, existsSync, join } = h;
  const exact = (f) => (existsSync(join(root, f)) ? readBytes(join(root, f)) : Buffer.alloc(0));
  const text = (f) => exact(f).toString('utf8').replace(/^﻿/, '');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const walk = (dir, keep, skipTop, out = [], top = true) => {
    if (!existsSync(join(root, dir))) return out;
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) { if (!(top && skipTop.includes(e.name.toLowerCase()))) walk(rel, keep, skipTop, out, false); }
      else if (keep.test(e.name)) out.push(rel);
    }
    return out;
  };

  /* ───────────────────────── d1 · d2 — the two call sites ───────────────────────── */
  const launchRaw = text(LAUNCH_F);
  const lCode = mask(launchRaw), lBare = mask(launchRaw, true);
  const lN = norm(lCode);
  const create = span(lCode, lBare, 'if (Node.generateWallet(pass))');
  const restore = span(lCode, lBare, 'private static void applyRestorePrefs(string pass)');
  const createN = norm(create.text), restoreN = norm(restore.text);
  const rawLines = launchRaw.split('\n');
  const callLines = rawLines.map((l, i) => [l, i]).filter(([l]) => l.includes('writeNewAccount'));
  const siteAt = [lCode.indexOf(CALL), lCode.lastIndexOf(CALL)];
  const d1 = {
    found: launchRaw.length > 0 && create.text.length > 0 && restore.text.length > 0
      && count(lBare, 'if (Node.generateWallet(pass))') === 1 && count(lBare, 'private static void applyRestorePrefs(string pass)') === 1,
    twoStatements: count(lN, CALL) === 2 && words(lCode, 'writeNewAccount') === 2,
    exactLines: callLines.length === 2 && callLines.every(([l]) => l.trim() === CALL_LINE),
    rightAfterTheRemove: callLines.length === 2 && callLines.every(([, i]) => i > 0 && rawLines[i - 1].trim() === REMOVE_LOCK)
      && count(lN, REMOVE_LOCK + ' ' + CALL) === 2 && count(lN, REMOVE_LOCK) === 2,
    inCreate: count(createN, CALL) === 1 && createN.includes(REMOVE_LOCK + ' ' + CALL + ' Preferences.Default.Remove("walletpass");'),
    inRestore: count(restoreN, CALL) === 1 && restoreN.startsWith('{ ' + REMOVE_LOCK + ' ' + CALL + ' Preferences.Default.Set("backupReminderTimestamp", Clock.getTimestamp().ToString());'),
    fixedArguments: !/writeNewAccount\((?!SpixiFlags\.DefaultAppLockOn, SpixiFlags\.DefaultPayConfirmOn, SPayments\.paymentAuthSupported\(\), SPayments\.PAYMENT_AUTH_PREF\);)/.test(lN),
    outsideEveryIf: siteAt[0] > 0 && siteAt[1] > siteAt[0] && regionsAt(lCode, siteAt[0]).length === 0 && regionsAt(lCode, siteAt[1]).length === 0,
  };
  ok(F(d1).length === 0,
    '★ defaultsb d1 sites: LaunchPage.xaml.cs holds the call `' + CALL + '` exactly TWICE, each ONE statement on its own line directly after the `Preferences.Default.Remove("lockenabled");` line — in the create body (`if (Node.generateWallet(pass))`, before `Remove("walletpass")`) and as the second statement of applyRestorePrefs (the A-13 boundary: after the wallet verified); the four arguments are the two switches, SPayments.paymentAuthSupported() and the constant SPayments.PAYMENT_AUTH_PREF — no WebView value, no password; outside every `#if` — failing: ' + JSON.stringify(F(d1)));

  const cutLines = rawLines.filter((l) => l.trim() !== CALL_LINE);
  const launchBack = Buffer.concat([exact(LAUNCH_F).subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF])) ? Buffer.from([0xEF, 0xBB, 0xBF]) : Buffer.alloc(0), Buffer.from(cutLines.join('\n'), 'utf8')]);
  const d2 = {
    twoLinesOut: rawLines.length - cutLines.length === 2,
    sameBytesAsBase: sha(launchBack) === BASE.launchBytes,
  };
  ok(F(d2).length === 0,
    '★ defaultsb d2 sitesRest: Spixi/Pages/Launch/LaunchPage.xaml.cs with its two inserted lines taken out is the base file BYTE FOR BYTE (SHA-256 of the exact bytes at 14ae57f2): nothing moved, nothing else changed — the wipe of the old keys, the password store, the verify-before-write order of both restore paths — failing: ' + JSON.stringify(F(d2)) + ' got ' + sha(launchBack));

  /* ───────────────────────── d3 — who names what ───────────────────────── */
  const csFiles = walk('Spixi', /\.cs$/i, ['bin', 'obj']);
  const got = {};
  for (const n of Object.keys(NAMES)) got[n] = {};
  for (const f of csFiles) {
    const c = mask(text(f));
    for (const n of Object.keys(NAMES)) {
      const k = n === 'withinGraceCall' ? count(c, 'DefaultsRules.withinGrace(') : words(c, n);
      if (k) got[n][f] = k;
    }
  }
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  const wrongNames = Object.keys(NAMES).filter((n) => !same(NAMES[n], got[n]));
  const webFiles = [...walk('src', /\.(html|js|mjs|css|json)$/i, ['node_modules']), ...walk('Spixi/Resources/Raw/html', /\.(html|js|mjs|css|json)$/i, [])];
  const leaked = webFiles.filter((f) => { const t = exact(f).toString('utf8'); return KEY_STRINGS.some((k) => t.includes(k)); });
  const d3 = {
    walked: csFiles.length > 100 && csFiles.includes(LAUNCH_F) && csFiles.includes(APP_F) && csFiles.includes(RULES_F) && csFiles.includes(FLAGS_F),
    exactTable: wrongNames.length === 0,
    webWalked: webFiles.length > 20,
    keysNotInTheWebView: leaked.length === 0,
  };
  ok(F(d3).length === 0,
    '★ defaultsb d3 names: over every C# file of Spixi/ (comments masked, whole words) the names match the exact table — DefaultsRules.writeNewAccount has TWO callers (the create body, applyRestorePrefs) and no other; lockEnabledStored, DefaultsRules.withinGrace( and stampAfterUnlock are called once each (App.xaml.cs); each switch is read only at its site(s) (LockDelayOneMinute: the grace statement and the unlock statement); the three keys and their strings live only in SpixiFlags.cs (declared + read: nothing stores them); LOCK_GRACE_SECONDS is gone; `lockenabled`, PAYMENT_AUTH_PREF and `paymentauth` have no new reader or writer (no start, update or migration path writes a default); the three key strings are in no file of src/ or Spixi/Resources/Raw/html — failing: ' + JSON.stringify(F(d3))
    + ' ' + JSON.stringify(Object.fromEntries(wrongNames.map((n) => [n, got[n]]))) + (leaked.length ? ' web: ' + JSON.stringify(leaked.slice(0, 5)) : ''));

  /* ───────────────────────── d4 – d7 — App.xaml.cs ───────────────────────── */
  const appRaw = text(APP_F);
  const av = appViews(appRaw, true);
  const d4 = {
    found: av.found,
    oneDelegatingStatement: av.lockBody === LOCK_NEW && count(av.fileN, LOCK_SIG + ' ' + LOCK_NEW) === 1,
    noStoreReadLeftInApp: !/Preferences\.Default\.(ContainsKey|Get|Set|Remove)\("lockenabled"/.test(av.fileN) && !/lockenabled/.test(av.fileN),
    outsideEveryIf: av.lockAt > 0 && regionsAt(av.code, av.lockAt).length === 0,
  };
  ok(F(d4).length === 0,
    '★ defaultsb d4 isLockEnabled: `public bool isLockEnabled()` in App.xaml.cs is the ONE statement `return DefaultsRules.lockEnabledStored();` (the old body moved to DefaultsRules unchanged — the harness runs it: absent = Off); the signature its nine callers use stays; App.xaml.cs names `lockenabled` nowhere else — failing: ' + JSON.stringify(F(d4)) + ' ' + JSON.stringify(av.lockBody.slice(0, 200)));

  const graceAt = av.code.indexOf('bool withinGrace =');
  const d5 = {
    found: av.found,
    oneStatement: count(av.fileN, GRACE_NEW) === 1 && count(av.resumeN, GRACE_NEW) === 1 && av.graceCuts === 1 && av.graceCutsInResume === 1,
    assignedOnce: (norm(av.bare).match(/(?<![A-Za-z0-9_.])withinGrace\s*(?:[-+*/|&^]?=)(?!=)/g) || []).length === 1,   // string contents blanked: the log text `" withinGrace="` is no assignment
    inOnResume: graceAt > av.resumeAt && av.resumeAt > 0,
    outsideEveryIf: graceAt > 0 && regionsAt(av.code, graceAt).length === 0,
    constGone: av.oneConst,
    measuredFromTheBackground: av.resumeN.includes('TimeSpan sinceBackground = wentAway.HasValue ? (DateTime.Now - wentAway.Value) : sinceUnlock; ' + GRACE_NEW),
  };
  ok(F(d5).length === 0,
    '★ defaultsb d5 grace: OnResume holds the ONE statement `' + GRACE_NEW + '` right after `sinceBackground` is read (the absence since the app LEFT, #496), outside every `#if`; withinGrace is assigned nowhere else and LOCK_GRACE_SECONDS is gone — the bound (60 s with the switch, 5 s without, never a negative absence) is DefaultsRules.withinGrace, run by the harness; it only says whether a lock that is already up needs an auth (L157) — failing: ' + JSON.stringify(F(d5)));

  const d6 = { found: av.found && av.graceCutsInResume === 1, restOfOnResume: av.resumeRest === BASE.resumeRest };
  ok(F(d6).length === 0,
    '★ defaultsb d6 onResumeRest: the body of App.OnResume with the one grace statement taken out equals the base body with ITS one statement taken out (comments masked, whitespace collapsed; SHA-256 against 14ae57f2) — the stamp read once and cleared, the fall back to sinceUnlock, dismissPauseLock only within the grace or an own-intent return, the #500 re-stamp when the lock stays up, the deferred prompt, presentAppLock: all the base\'s — failing: ' + JSON.stringify(F(d6)) + ' got ' + av.resumeRest);

  const d7 = { found: av.found && av.graceCuts === 1, restOfTheFile: av.fileRest === BASE.appRest };
  ok(F(d7).length === 0,
    '★ defaultsb d7 appRest: the WHOLE App.xaml.cs with isLockEnabled\'s body, the one grace statement, the ONE unlock statement of d13 and the LOCK_GRACE_SECONDS declaration taken out equals the base the same way (comments masked, whitespace collapsed; SHA-256 against 14ae57f2) — App() (the cold start always locks when the lock is on), markBackgrounded, the rest of onUnlock, lockOnPause, lockOnIdle, dismissPauseLock, OnSleep and every other member are the base\'s — failing: ' + JSON.stringify(F(d7)) + ' got ' + av.fileRest);

  /* ───────────────────────── d13 — ★ #46 round 1 (R1-2): the ONE statement of App.onUnlock ───────────────────────── */
  const unlockAt = av.code.indexOf(UNLOCK_NEW);
  const appLines = appRaw.split('\n');
  const stampLines = appLines.map((l, i) => [l, i]).filter(([l]) => l.includes('stampAfterUnlock'));
  const stampWrites = (norm(av.bare).match(/(?<![A-Za-z0-9_])backgroundedDate\s*(?:[-+*/|&^?]{0,2}=)(?!=)/g) || []).length;
  const d13 = {
    found: av.found && av.unlockFound,
    oneStatement: count(av.fileN, UNLOCK_NEW) === 1 && count(av.unlockN, UNLOCK_NEW) === 1 && av.unlockCuts === 1 && words(av.code, 'stampAfterUnlock') === 1,
    exactLine: stampLines.length === 1 && stampLines[0][0].trim() === UNLOCK_LINE,
    directlyAfterTheUnlockTime: stampLines.length === 1 && stampLines[0][1] > 0 && appLines[stampLines[0][1] - 1].trim() === UNLOCK_PREV
      && count(av.unlockN, UNLOCK_PREV + ' ' + UNLOCK_NEW) === 1 && count(av.unlockN, UNLOCK_PREV) === 1,
    afterTheVerifiedGuard: av.unlockN.startsWith(UNLOCK_GUARD + UNLOCK_PREV + ' ' + UNLOCK_NEW) && count(av.unlockN, 'return;') === 1
      && av.unlockN.indexOf('S16SecRules.unlockReleases(e)') > 0 && av.unlockN.indexOf('S16SecRules.unlockReleases(e)') < av.unlockN.indexOf(UNLOCK_NEW),
    wholeBody: av.unlockN === UNLOCK_BODY,
    outsideEveryIf: unlockAt > 0 && regionsAt(av.code, unlockAt).length === 0,
    stampWrittenAtFiveSites: stampWrites === 5,
  };
  ok(F(d13).length === 0,
    '★ defaultsb d13 unlock (#46 round 1, R1-2): App.onUnlock holds the ONE inserted statement `' + UNLOCK_NEW + '` on its own line directly after `unlockedDate = DateTime.Now;` — AFTER the `if (!S16SecRules.unlockReleases(e)) { … return; }` guard, so only a VERIFIED unlock clears the leaving stamp (a lock that stays up keeps it: the #500 re-stamp of OnResume, d6); outside every `#if`; the whole body is the base\'s eight statements plus that one; `backgroundedDate` is written at five sites and no other (the field, markBackgrounded, OnResume\'s clear and re-stamp, this one); the rule itself (`oneMinute ? null : stamp`: switch off = the stamp is kept, the old path) is d10 and the harness — failing: ' + JSON.stringify(F(d13)) + ' writes=' + stampWrites + ' ' + JSON.stringify(av.unlockN.slice(0, 420)));

  /* ───────────────────────── d8 — the files this batch must not touch ───────────────────────── */
  const moved = Object.keys(BASE.whole).filter((f) => sha(exact(f)) !== BASE.whole[f]);
  ok(moved.length === 0,
    '★ defaultsb d8 untouched: SPayments.cs, SConfirm.cs, SDesktopIdle.cs, LockPage.xaml.cs and SettingsPage.xaml.cs are byte-identical to the base (SHA-256 of the exact bytes at 14ae57f2): no reader of `lockenabled` / `paymentauth`, no lock page, no payment confirm and no Settings row changed — an existing account keeps its behaviour — changed: ' + JSON.stringify(moved.map((f) => f + ' ' + sha(exact(f)))));

  /* ───────────────────────── d9 · d10 — DefaultsRules.cs ───────────────────────── */
  const rulesRaw = text(RULES_F);
  const rCode = mask(rulesRaw), rBare = mask(rulesRaw, true);
  const rN = norm(rCode);
  const prefCalls = (rN.match(/Preferences\.Default\.\w+\([^;]*;/g) || []).sort();
  const d9 = {
    found: rulesRaw.length > 0,
    noRiskyWordAnywhere: !/ixian:|sendUiCommand|SecureStorage|WalletPassStore|walletpass|timer|Task|Thread/i.test(rulesRaw),
    noBridgeClockOrWaitInCode: !/executeUiCommand|EvaluateJavaScript|WebView|\bawait\b|\basync\b|Delay|Sleep|Stopwatch|DateTime|Clock|Environment\.|File\.|Directory\.|System\.IO|Reflection|typeof|dynamic\b/.test(rN.replace(STAMP_SIG, '<STAMP>')),
    dateTimeOnlyAsTheStampType: count(rN, STAMP_SIG) === 1 && count(rN, 'DateTime') === 2 && !/DateTime\s*\./.test(rN),   // ★ #46 r1 (R1-2): the TYPE in the one signature; no member (Now, UtcNow …) is read
    usings: JSON.stringify((rCode.match(/^\s*using\s+[^;]+;/gm) || []).map((u) => norm(u)).sort()) === JSON.stringify(['using IXICore.Meta;', 'using Microsoft.Maui.Storage;', 'using System;']),
    onlyTheFourPreferenceCalls: JSON.stringify(prefCalls) === JSON.stringify([
      'Preferences.Default.ContainsKey(LockKey)) { locked = (bool)Preferences.Default.Get(LockKey, false);',
      'Preferences.Default.Set(LockKey, true);',
      'Preferences.Default.Set(payKey, true);']) && count(rN, 'Preferences.') === 4,
    noDirective: !/^\s*#/m.test(rCode),
    noAttribute: !rBare.includes('['),   // ★ #46 r2 (MAJOR-1): no `[` in the code (strings blanked) = no attribute, e.g. [Conditional(…)] above a member; a second net beside d14
    oneClass: count(rN, 'public static class DefaultsRules') === 1 && count(rN, 'class ') === 1 && /^using IXICore\.Meta; using Microsoft\.Maui\.Storage; using System; namespace SPIXI \{ public static class DefaultsRules \{/.test(rN),
  };
  ok(F(d9).length === 0,
    '★ defaultsb d9 rulesClean: Spixi/Utils/DefaultsRules.cs — its RAW text (comments included) holds no `ixian:`, sendUiCommand, SecureStorage, WalletPassStore, walletpass, timer, Task or Thread; its code holds no bridge, clock, wait, file or reflection word, no preprocessor line and no `[` at all (no attribute: a `[Conditional(…)]` above a member would compile its calls away — #46 round 2) (`DateTime` only as the type, twice, in the one signature of stampAfterUnlock — no member of it is read); the usings are exactly System, IXICore.Meta, Microsoft.Maui.Storage; it calls Preferences only as ContainsKey(LockKey) / Get(LockKey, false) (the reader) and Set(LockKey, true) / Set(payKey, true) (the two FIXED defaults) — no Remove, no Clear, no other key, nothing from a WebView — failing: ' + JSON.stringify(F(d9)) + ' ' + JSON.stringify(prefCalls));

  const body = (sig) => norm(span(rCode, rBare, sig).text);
  const WRITE = '{ bool lockWritten = false; bool payWritten = false; '
    + 'if (appLockOn) { try { Preferences.Default.Set(LockKey, true); lockWritten = true; } catch (Exception ex) { Logging.warn("[DEFAULTS] applock write failed (" + ex.GetType().Name + ")"); } } '
    + 'if (payConfirmOn && paySupported) { try { Preferences.Default.Set(payKey, true); payWritten = true; } catch (Exception ex) { Logging.warn("[DEFAULTS] pay write failed (" + ex.GetType().Name + ")"); } } '
    + 'Logging.info("[DEFAULTS] new account: applock=" + (lockWritten ? "1" : "0") + " pay=" + (payWritten ? "1" : "0")); }';
  const d10 = {
    constants: count(rN, 'public const string LockKey = "lockenabled";') === 1 && count(rN, 'public const double GraceSecondsOld = 5;') === 1 && count(rN, 'public const double GraceSecondsNew = 60;') === 1,
    lockEnabledStored: body('public static bool lockEnabledStored()') === '{ bool locked = false; if (Preferences.Default.ContainsKey(LockKey)) { locked = (bool)Preferences.Default.Get(LockKey, false); } return locked; }',
    theOldBodyOfApp: LOCK_OLD.split('"lockenabled"').join('LockKey') === '{ bool locked = false; if (Preferences.Default.ContainsKey(LockKey)) { locked = (bool)Preferences.Default.Get(LockKey, false); } return locked; }',
    graceSeconds: body('public static double graceSeconds(bool oneMinute)') === '{ return oneMinute ? GraceSecondsNew : GraceSecondsOld; }',
    withinGrace: body('public static bool withinGrace(double secondsAway, bool oneMinute)') === '{ return secondsAway >= 0 && secondsAway <= graceSeconds(oneMinute); }',
    writeNewAccount: body('public static void writeNewAccount(bool appLockOn, bool payConfirmOn, bool paySupported, string payKey)') === WRITE,
    stampAfterUnlock: body(STAMP_SIG) === '{ return oneMinute ? null : stamp; }' && count(rN, STAMP_SIG) === 1,
    flagsLine: body('public static string flagsLine(bool appLock, bool pay, bool delay)') === '{ return "[FLAGS] defaultsb applock=" + (appLock ? "1" : "0") + " paydefault=" + (pay ? "1" : "0") + " lockdelay=" + (delay ? "60" : "5"); }',
    sixMembers: (rN.match(/public static [\w?]+ \w+\(/g) || []).length === 6 && count(rN, 'static ') === 7,   // the class + the six; `DateTime?` is the one return type with a `?`
    twoInfoTwoWarn: count(rN, 'Logging.') === 3 && count(rN, 'Logging.info(') === 1 && count(rN, 'Logging.warn(') === 2,
  };
  ok(F(d10).length === 0,
    '★ defaultsb d10 rulesBodies: DefaultsRules — LockKey = "lockenabled", GraceSecondsOld = 5, GraceSecondsNew = 60; lockEnabledStored() is the old body of App.isLockEnabled() (ContainsKey, then Get(…, false): absent = Off); graceSeconds = 60 with the switch, 5 without; withinGrace = `secondsAway >= 0 && secondsAway <= graceSeconds(oneMinute)` (the old expression, the bound the only variable); stampAfterUnlock = `return oneMinute ? null : stamp;` (the switch clears the stamp, off keeps the same one — it lays none, reads no clock, unlocks nothing); writeNewAccount writes `lockenabled = true` behind appLockOn and `payKey = true` behind payConfirmOn && paySupported, each in its own try (a throw logs the exception TYPE only), then ONE fixed line of what was written; flagsLine = fixed words; six members, no other — failing: ' + JSON.stringify(F(d10)));

  /* ───────────────────────── d14 — ★ #46 round 2: DefaultsRules.cs held whole ───────────────────────── */
  const rulesHash = sha(exact(RULES_F));
  const d14 = { found: rulesRaw.length > 0, sameBytesAsFrozen: rulesHash === RULES_WHOLE };
  ok(F(d14).length === 0,
    '★ defaultsb d14 rulesWhole (#46 round 2): Spixi/Utils/DefaultsRules.cs equals the FROZEN SHA-256 of its exact bytes — any edit of the file, a comment too, re-bases this hash after a look at the diff (#1653). It closes what the text patterns of d9 / d10 could not hold: an attribute inserted above a member such as `[System.Diagnostics.Conditional("SPIXI_CSH")]` (a store build would compile the writes away, the harness defines the symbol and would not see it) and any change of a catch (the App-lock write\'s catch is not run by the harness) — failing: ' + JSON.stringify(F(d14)) + ' got ' + rulesHash);

  /* ───────────────────────── d11 — the three switches ───────────────────────── */
  const flagsRaw = text(FLAGS_F);
  const fCode = mask(flagsRaw), fBare = mask(flagsRaw, true);
  const fN = norm(fCode);
  const initS = span(fCode, fBare, 'public static void init()');
  const init = norm(initS.text);
  const iTry = init.search(/\btry \{/), iCatch = init.indexOf('catch (Exception ex)');
  const iCatchEnd = iCatch < 0 ? -1 : init.indexOf('}', iCatch) + 1;
  const inTry = (s) => count(init, s) === 1 && init.indexOf(s) > iTry && init.indexOf(s) < iCatch;
  const afterCatch = (s) => count(init, s) === 1 && iCatchEnd > 0 && init.indexOf(s) > iCatchEnd;
  const PHOTO_LINE = 'Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore));';
  const TAIL = PHOTO_LINE + ' DefaultAppLockOn = S16PassRules.effectiveFlag(dev, da); DefaultPayConfirmOn = S16PassRules.effectiveFlag(dev, dp); '
    + 'LockDelayOneMinute = S16PassRules.effectiveFlag(dev, dl); Logging.info(DefaultsRules.flagsLine(DefaultAppLockOn, DefaultPayConfirmOn, LockDelayOneMinute)); }';
  const devPage = mask(text('Spixi/Pages/Dev/DevPage.xaml.cs'));
  const lineAt = fCode.indexOf('Logging.info(DefaultsRules.flagsLine(');
  const d11 = {
    found: init.length > 0 && iTry > 0 && iCatch > iTry,
    keys: count(fN, 'public const string DefaultAppLockOnKey = "flagDefaultAppLockOn";') === 1 && count(fN, 'public const string DefaultPayConfirmOnKey = "flagDefaultPayConfirmOn";') === 1
      && count(fN, 'public const string LockDelayOneMinuteKey = "flagLockDelayOneMinute";') === 1,
    startValueFalse: count(fN, 'public static bool DefaultAppLockOn { get; private set; } = false;') === 1 && count(fN, 'public static bool DefaultPayConfirmOn { get; private set; } = false;') === 1
      && count(fN, 'public static bool LockDelayOneMinute { get; private set; } = false;') === 1,
    localsOn: count(init, 'int da = 1, dp = 1, dl = 1;') === 1 && init.indexOf('int da = 1, dp = 1, dl = 1;') < iTry,
    absentIsOne: inTry('da = Preferences.Default.Get(DefaultAppLockOnKey, 1);') && inTry('dp = Preferences.Default.Get(DefaultPayConfirmOnKey, 1);') && inTry('dl = Preferences.Default.Get(LockDelayOneMinuteKey, 1);'),
    computeRule: afterCatch('DefaultAppLockOn = S16PassRules.effectiveFlag(dev, da);') && afterCatch('DefaultPayConfirmOn = S16PassRules.effectiveFlag(dev, dp);')
      && afterCatch('LockDelayOneMinute = S16PassRules.effectiveFlag(dev, dl);')
      && count(fN, 'DefaultAppLockOn = ') === 1 && count(fN, 'DefaultPayConfirmOn = ') === 1 && count(fN, 'LockDelayOneMinute = ') === 1,
    localsNotWrittenAgain: (init.match(/\b(?:da|dp|dl) = /g) || []).length === 6,   // the declaration and the read, three times
    oneLineLast: count(fN, 'DefaultsRules.flagsLine(') === 1 && init.endsWith(TAIL),
    outsideEveryIf: lineAt > 0 && regionsAt(fCode, lineAt).length === 0,
    noDevControl: devPage.length > 0 && !/DefaultAppLockOn|DefaultPayConfirmOn|LockDelayOneMinute|defaultsb|paydefault|lockdelay/.test(devPage),
  };
  ok(F(d11).length === 0,
    '★ defaultsb d11 flags: SpixiFlags — flagDefaultAppLockOn / flagDefaultPayConfirmOn / flagLockDelayOneMinute (int prefs) read in init\'s try with absent = 1; DefaultAppLockOn / DefaultPayConfirmOn / LockDelayOneMinute start `false` (before init: the old path) and are set once, through S16PassRules.effectiveFlag after the catch (absent = ON; a stored 0 acts only in dev mode), each from its own local; ONE Logging.info(DefaultsRules.flagsLine(…)) directly after the photo1a group, the LAST statement of init, outside every `#if`; no Developer-screen control — failing: ' + JSON.stringify(F(d11)) + ' …' + JSON.stringify(init.slice(-330)));

  /* ───────────────────────── d12 — the harness ───────────────────────── */
  const csproj = text('scripts/csh/csh.csproj');
  const tests = mask(text('scripts/csh/DefaultsTests.cs'));
  const TESTS = ['lock_absent_reads_off', 'lock_stored_reads_back', 'new_account_writes_both', 'switch_off_leaves_the_key_absent', 'pay_not_supported_writes_no_paymentauth',
    'writes_touch_no_other_key', 'a_failed_write_does_not_escape', 'create_after_a_wipe_writes_again', 'within_grace_bounds', 'stamp_after_unlock', 'flags_line_text', 'init_absent_is_on',
    'init_stored_zero_acts_only_in_dev_mode', 'init_each_switch_its_own_key', 'call_site_arguments_end_to_end'];
  const d12 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/DefaultsRules.cs" />') === 1 && count(csproj, '<Compile Include="../../Spixi/Utils/SpixiFlags.cs" />') === 1,
    fifteenTests: (tests.match(/\[TestMethod\]/g) || []).length === TESTS.length && TESTS.every((t) => new RegExp('\\[TestMethod\\]\\s*public void ' + t + '\\(\\)').test(tests)),
    testClass: /\[TestClass\]\s*public class DefaultsTests\b/.test(tests),
    realRules: !/class DefaultsRules|class SpixiFlags/.test(tests),
  };
  ok(F(d12).length === 0,
    '★ defaultsb d12 harness: scripts/csh/csh.csproj compiles the REAL Spixi/Utils/DefaultsRules.cs (and SpixiFlags.cs), and scripts/csh/DefaultsTests.cs holds its 15 tests (the reader, the two defaults, the switches off, no `paymentauth` on Windows, no other key, a failed write, a create after a wipe, the grace bounds, the stamp after an unlock, the [FLAGS] line, the three init rules, the call-site arguments end to end) with no copy of the rules — failing: ' + JSON.stringify(F(d12)));
}
