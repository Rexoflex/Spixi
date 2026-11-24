/* ==== lockb · B — the lock batch's MAUI-bound C# sites (source pin): App.OnResume's second clock, the twin stamps, the one call
 * `held.promptWindowOpens();`, LockPage's hold pushes / un-animated pop / no-alert rule, the push grammar, the names, the files held.
 * Contract docs/contract-lockb.md § 3; mechanisms docs/lockb-mechanisms.md; the behaviour of the PURE rules runs in the C# harness
 * (scripts/csh/LockShellTests.cs, LockClockTests.cs, over the REAL LockShellRules.cs / LockClockRules.cs / SpixiFlags.cs).
 *
 * LIMITS — read first (DECISIONS 1735 / 1627: the limits of a source pin are stated, not hidden). This is a SOURCE pin: App.xaml.cs and
 * LockPage.xaml.cs are MAUI files that the cloud cannot compile, so this module reads their TEXT. What it does NOT catch:
 *   · anything at RUN time: that OnResume is reached, that the prompt window opens before the post, that the pause lock really pops with no
 *     animation, that the shell holds / reveals (pins-lockb/a-shell runs the BUILT shell), that `SystemClock.ElapsedRealtime()` counts
 *     sleep (the mechanism is in lockb-mechanisms § 5; the device walk proves it), that a stamp is never read stale across threads;
 *   · deliberately hidden code: a masked `#define` / `#if` trick, a `using X = …;` alias, a type that shadows LockbFlags / LockShellRules /
 *     LockClockRules / DefaultsRules / SpixiFlags, a second partial of App or LockPage in another file (a `partial` is not read), reflection
 *     by a name built from pieces, a csproj `Compile Remove`, an identifier written with a `\u` escape or with a Unicode format character;
 *   · a C# 11 raw string literal (`"""…"""`) — the comment mask does not know it. App.xaml.cs, LockPage.xaml.cs, SpixiFlags.cs and the two
 *     rule files have none today; one would make b7 differ from the base and fail closed. `Spixi/Platforms/iOS/iOSWebViewHandler.cs` HAS raw
 *     string literals and b6 reads it: a name hidden inside one of them (or behind a comment mark inside one) is not seen;
 *   · a call written another way than the text pinned here (a method group, a delegate, a local function, `this.` in front, a helper that
 *     calls `promptWindowOpens` or writes a twin): the NAME counts of b2 / b3 / b6 are exact over the code of the files read, not over what a
 *     program builds at run time;
 *   · the pure rules' behaviour (csh), the Ixian-Core files and the platform SDK (Plugin.Fingerprint's `Status`, `SystemClock`);
 *   · files outside Spixi/ (.cs), src/ and Spixi/Resources/Raw/html (b6 reads those three trees).
 * Comments are masked first (comments → spaces, newlines kept, strings kept — the defaultsb / histcs mask, copied here so that this module
 * stands alone); brace walks use a second mask that also blanks string contents. Texts are compared after whitespace collapse (`norm`), so
 * a line break or an indent is free; a COMMENT is free (masked) everywhere except in b7's removed lines' neighbours (b7 holds every other
 * byte) and in SpixiFlags.cs (b7 holds its block by the masked code and the file's remainder by the base's bytes).
 * BASE = 462ba3e4 ("Merge pull request #24 from Rexoflex/work/histcs"). The SHA-256 values in BASE below are FROZEN CONSTANTS, computed
 * from `git show 462ba3e4:<path>` when this pin was written (the pin runs in CI and on tree copies with no git; `sha256sum` of the exact
 * bytes — no CR in any of the three files; App.xaml.cs and LockPage.xaml.cs carry a UTF-8 BOM (EF BB BF) and SpixiFlags.cs does not: the module
 * reads the TEXT with the BOM removed, and `bytesOf` puts the BOM back before hashing, so the frozen values are over the exact bytes of the base).
 *   Inserted-line removal (b7, `restore`): each lockb insertion is one HUNK = (the base line(s) before it, the base line after it, the
 *   base text the region becomes, the EXPECTED CODE of the region). The region between the anchors is cut out of the raw text and replaced
 *   by the base text; the masked code of the region must equal the expected code (so a comment inside is free, a code token is not); then
 *   the SHA-256 of the whole result must be the base's. An insertion that moves, grows, or is changed outside its hunk leaves a remainder
 *   that is not the base (or an anchor that is not found exactly once) → red. A re-base after a reviewed edit of the lockb lines: change
 *   the hunk's expected code (and, if the base is touched by another batch, the BASE hash) after a look at the diff (#1596, #1634).
 *
 * KEYS (each ONE `ok`):
 *   b1 grace       — App.OnResume: the base statement `bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds,
 *                    SpixiFlags.LockDelayOneMinute);` is unchanged and ONE statement; directly after it (comments aside) EXACTLY four statements:
 *                    `bool secondClock = LockbFlags.SecondClock;` `long? nowMono = secondClock ? LockClockRules.nowMs() : null;`
 *                    `long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono;` `if (secondClock && withinGrace) { withinGrace =
 *                    LockClockRules.withinGrace(sinceBackground.TotalSeconds, nowMono, stampMono, SpixiFlags.LockDelayOneMinute); }`; the
 *                    `withinGrace` variable is assigned in exactly those two places and nowhere else; `nowMs()` is read in OnResume exactly once;
 *                    `LockbFlags.SecondClock` is read once in the file; all outside every `#if`; the later reads of `withinGrace` are the base's
 *   b2 twins       — `backgroundedMono` is written at exactly FIVE sites and `unlockedMono` at exactly TWO, each next to its wall stamp: the two
 *                    field initialisers; markBackgrounded (inside the `if (backgroundedDate == null)` block, after the wall stamp); OnResume's
 *                    read + clear right after the wall read + clear; the #500 restore directly before `backgroundedDate = wentAway;`; onUnlock
 *                    (`unlockedMono = LockClockRules.nowMs();` and `backgroundedMono = LockClockRules.keepTwin(backgroundedDate, backgroundedMono);`
 *                    after the stampAfterUnlock line, the whole body); outside every `#if`; the base's five `backgroundedDate` writes unchanged
 *   b3 prompt call — `held.promptWindowOpens();` exists ONCE in the tree (every C# file of Spixi/), in App.OnResume, directly before
 *                    `pendingForegroundAuth = held;`, inside the `#if ANDROID` arm (not the `#else`), after the #500 restore
 *   b4 lockpage    — LockPage: the R1 push directly after `if (authAttempted) revealPasswordForm();` in onLoad; the R2 push directly after
 *                    `authAttempted = true;` in maybeAuthenticate's PROMPT path (before the `try`); `builtDeferred = true;` only inside
 *                    deferAuthentication; promptWindowOpens' body; popOwnModal's R3 `if` / `else` with `PopModalAsync();` / `PopModalAsync(false);`
 *                    (the only two PopModalAsync calls); SetResultAsync: `revealPasswordForm();` then the R4 `if` around the UNCHANGED
 *                    displaySpixiAlert statement; all outside every `#if`; (review r1 M-1) R1 passes `promptWindowOpened || holdReleased`
 *   b5 grammar     — LockPage sends `setAuthPending` only with "False" (revealPasswordForm, as the base) and through the helper
 *                    `sendAuthPending(value)`, whose three callers pass values that come only from LockShellRules.holdPushAtLoad / holdPushAtPrompt;
 *                    LockShellRules returns only the constants "True" / "1" (or null); no NEW `ixian:` string and no NEW sendUiCommand command name
 *                    in LockPage.xaml.cs or App.xaml.cs compared with the base (the sets are frozen from 462ba3e4, counted)
 *   b6 names       — an exact table name → file → count over every C# file of Spixi/ (comments masked, whole words): LockbFlags.HoldWhileDeferred /
 *                    NoAlertNoCredential / SecondClock, LockShellRules.*, LockClockRules.*, promptWindowOpens, sendAuthPending, the three key
 *                    constants; the three key strings only in SpixiFlags.cs; none of them in src/ or Spixi/Resources/Raw/html
 *   b7 rest        — App.xaml.cs and LockPage.xaml.cs with the lockb insertions taken out (the hunks above; App's one changed operand line
 *                    restored to `+ " withinGrace=" + withinGrace);`) equal the base files BYTE FOR BYTE (SHA-256 frozen); SpixiFlags.cs = the base
 *                    + exactly ONE block appended after the last type (`LockbFlags`, by its masked code, frozen) and nothing else
 *   b8 rules       — LockShellRules.cs / LockClockRules.cs: one class each, the usings, no ixian: / sendUiCommand / Preferences / Logging / Task /
 *                    Thread / file / clock-setting word (LockClockRules: `DateTime` only in keepTwin's signature, `Android.OS.SystemClock` only
 *                    inside `#if ANDROID`, no TickCount / Stopwatch); LockbFlags reads exactly the three keys, logs once, writes nothing
 *   b9 harness     — csh.csproj compiles the two rule files; the two test files hold their 17 / 15 tests (counted over the comment-masked text, so a
 *                    commented-out `[TestMethod]` does not count); no `Compile Remove`
 *   b10 release    — (review r1 M-1 / m-1 / m-2) `releaseHold` is declared ONCE in LockPage (the whole body held: the R5 test and `return;` first, then
 *                    `holdReleased = true;`, `revealPasswordForm();`, the fixed `why` set post-resume / pop-failed / not-presented / other, the diag
 *                    line, its own catch with the TYPE only; R5 takes THREE arguments, the last `authDeferred`: review r2 X2 MINOR-1) and called EXACTLY FOUR
 *                    times in the tree, all in App.xaml.cs and outside every `#if` (two more, review r2 S2 MINOR-1: lockOnPause's `ContinueWith` handler,
 *                    `lockPage.releaseHold("not-presented");` after its existing statements, and its catch, `failed?.releaseHold("not-presented");` after its
 *                    existing statements, with `LockPage? failed = pauseLock;` directly after the log line, before `pauseLock = null;`): from
 *                    `releaseDeferredAuth` — inside `if (held == null) {`, on `pauseLock`, with the fixed word `"post-resume"`, BEFORE that block's
 *                    `return;` — and from `dismissPauseLock`'s pop-failed catch with `"pop-failed"`, after the log line; `holdReleased` is written
 *                    only in its field initialiser and in releaseHold and read only in the R1 call
 *
 * PLANNED BREAKS (#802; each ONE mutation in a COPY of the tree — `node scripts/pins-lockb/b-csharp-breaks.mjs` runs them all and prints the
 * red keys; the planned reds are in that file next to each mutation).
 */
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

const APP_F = 'Spixi/App.xaml.cs', LOCK_F = 'Spixi/Pages/Launch/LockPage.xaml.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs',
  SHELL_F = 'Spixi/Utils/LockShellRules.cs', CLOCK_F = 'Spixi/Utils/LockClockRules.cs';

/* FROZEN from the base 462ba3e4: `git show 462ba3e4:<path> | sha256sum` (the exact bytes) */
const BASE = {
  app: '1e1245f3c4a683747a8ee766863ee5beb313ac70b438978be9487a1a931e6ed5',    // Spixi/App.xaml.cs
  lock: '20e6d1f3cfe24a53bf361b37b8ec175301ebfd0c782d0504941100703b89a1e5',   // Spixi/Pages/Launch/LockPage.xaml.cs
  flags: '1d1ba11efbc3c5bb5917d3509513c7d5880ba4a3f428a5602f9138cd27b53018',  // Spixi/Utils/SpixiFlags.cs
};
/* FROZEN: sha256 of the masked, whitespace-collapsed CODE of the LockbFlags block (from the first line of its leading comment to its closing brace; comments free) */
const FLAGS_BLOCK_CODE = 'fc47b9288f1c14ba7508967fedc524a952281a708985605df1243c8b208196c7';

/* The lockb insertions of the two MAUI files, as hunks (see the header). `after`: the trimmed base line(s) directly before the region (a
   sequence that must occur exactly once); `before`: the trimmed base line directly after it (the FIRST such line below `after`);
   `put`: the base's raw text lines for the region; `code`: the expected masked, whitespace-collapsed code of the region. */
export const APP_HUNKS = [
  { n: 'unlockedMono field', after: ['private DateTime unlockedDate = DateTime.Now; // Store the last time when the app was unlocked via lockscreen'], before: '', put: [],
    code: 'private long? unlockedMono = LockClockRules.nowMs();' },
  { n: 'backgroundedMono field', after: ['private DateTime? backgroundedDate = null;'], before: '', put: [],
    code: 'private long? backgroundedMono = null;' },
  { n: 'markBackgrounded', after: ['if (backgroundedDate == null)', '{', 'backgroundedDate = DateTime.Now;'], before: '}', put: [],
    code: 'backgroundedMono = LockClockRules.nowMs();' },
  { n: 'onUnlock', after: ['backgroundedDate = DefaultsRules.stampAfterUnlock(backgroundedDate, SpixiFlags.LockDelayOneMinute);   // ★ defaultsb (#1750): a verified unlock clears the leaving stamp'],
    before: '/* ★ #438 break-my-verdict MAJOR-2: AUTH IS THE DEFINITIVE RELEASE. Background', put: [],
    code: 'unlockedMono = LockClockRules.nowMs(); backgroundedMono = LockClockRules.keepTwin(backgroundedDate, backgroundedMono);' },
  { n: 'OnResume read+clear', after: ['DateTime? wentAway = backgroundedDate;', 'backgroundedDate = null;'],
    before: 'TimeSpan sinceBackground = wentAway.HasValue ? (DateTime.Now - wentAway.Value) : sinceUnlock;', put: [],
    code: 'long? wentAwayMono = backgroundedMono; backgroundedMono = null;' },
  { n: 'OnResume second clock', after: ['bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds, SpixiFlags.LockDelayOneMinute);'],
    before: '/* ★ F3 (audit MINOR): log the resume UNCONDITIONALLY. Instrumented only inside the', put: [],
    code: 'bool secondClock = LockbFlags.SecondClock; long? nowMono = secondClock ? LockClockRules.nowMs() : null; long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono; '
      + 'if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(sinceBackground.TotalSeconds, nowMono, stampMono, SpixiFlags.LockDelayOneMinute); }' },
  { n: 'OnResume diag tail', after: ['+ " stamped=" + wentAway.HasValue'], before: 'if (!(ownIntentReturn || withinGrace) || !dismissPauseLock(held))',
    put: ['                + " withinGrace=" + withinGrace);'],
    code: '+ " withinGrace=" + withinGrace + LockClockRules.diagSuffix(secondClock, nowMono, stampMono));' },
  { n: '#500 twin', after: ['* was offered to him. */'], before: 'backgroundedDate = wentAway;', put: [],
    code: 'backgroundedMono = wentAwayMono;' },
  { n: 'note before the Android arm', after: ['SLockDiag.mark("resume/lock-stays-up", "releasing deferred auth · stamp restored (#500)");'], before: '#if ANDROID', put: [],
    code: '' },
  { n: 'releaseDeferredAuth backstop', after: ['if (held == null)', '{'], before: 'return;', put: [],
    code: 'LockPage? up = pauseLock; if (up != null) { up.releaseHold("post-resume"); }' },
  { n: 'dismissPauseLock pop-failed', after: ['Logging.error("dismissPauseLock: pop failed: " + e);'], before: '}', put: [],
    code: 'lp.releaseHold("pop-failed");' },
  { n: 'lockOnPause handler release', after: ['pendingForegroundAuth = null;', 'isLockScreenActive = false;', '// AUDIT MINOR-2: hideSurface() already ran. Nothing else re-asserts a', '// live call\'s ring or bar on this path.', 'UIHelpers.refreshAppRequests = true;'], before: '});', put: [],
    code: 'lockPage.releaseHold("not-presented");' },
  { n: 'lockOnPause failed capture', after: ['Logging.error("lockOnPause failed: " + e);'], before: '// ★ F3 (audit MINOR): the deferred-auth handoff dies with the lock. Now that the', put: [],
    code: 'LockPage? failed = pauseLock;' },
  { n: 'lockOnPause catch release', after: ['UIHelpers.refreshAppRequests = true;   // AUDIT MINOR-2, the other failure path'], before: '}', put: [],
    code: 'failed?.releaseHold("not-presented");' },
  { n: 'promptWindowOpens call', after: ['* reasoning about is worse than none. The latch itself is untouched. */'], before: 'pendingForegroundAuth = held;', put: [],
    code: 'held.promptWindowOpens();' },
];
/* the masked, collapsed code of LockPage.releaseHold (review r1): held inside the b7 hunk of the methods and, with its call sites, by b10 */
const RELEASE_HOLD_CODE = 'public void releaseHold(string why) { try { if (!LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred)) { return; } '
  + 'holdReleased = true; revealPasswordForm(); string word = why == "post-resume" || why == "pop-failed" || why == "not-presented" ? why : "other"; '
  + 'SPIXI.Meta.SLockDiag.mark("lock/hold-released", "why=" + word); } catch (Exception e) { Logging.error("LockPage: releaseHold failed (" + e.GetType().Name + ")"); } }';
export const LOCK_HUNKS = [
  { n: 'builtDeferred / promptWindowOpened fields', after: ['private bool authDeferred = false;'], before: '', put: [],
    code: 'private bool builtDeferred = false; private bool promptWindowOpened = false; private bool holdReleased = false;' },
  { n: 'R1 push in onLoad', after: ['if (authAttempted)', 'revealPasswordForm();'], before: '', put: [],
    code: 'string? loadHold = LockShellRules.holdPushAtLoad(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred, promptWindowOpened || holdReleased, authAttempted); if (loadHold != null) sendAuthPending(loadHold);' },
  { n: 'R2 push at the prompt', after: ['authAttempted = true;'], before: '// Show biometric and alternative authentication methods', put: [],
    code: 'string? promptHold = LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, builtDeferred); if (promptHold != null) sendAuthPending(promptHold);' },
  { n: 'R3 pop', after: ['if (Navigation.ModalStack.LastOrDefault() == this)', '{'], before: '// ★ F-4 (#399, audit): the MODAL-FALLBACK leg needs the repaint too.',
    put: ['                    Navigation.PopModalAsync();'],
    code: 'if (LockShellRules.popAnimated(LockbFlags.HoldWhileDeferred, builtDeferred)) { Navigation.PopModalAsync(); } else { Navigation.PopModalAsync(false); }' },
  { n: 'builtDeferred = true', after: ['SPIXI.Meta.SLockDiag.mark("lock/deferAuthentication");', 'authDeferred = true;'], before: '}', put: [],
    code: 'builtDeferred = true;' },
  { n: 'promptWindowOpens + releaseHold methods', after: ['authDeferred = true;', '}', ''], before: '/* #454: the app is in the foreground again — run the prompt that was deferred', put: [],
    code: 'public void promptWindowOpens() { try { string? hold = LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, builtDeferred); if (hold == null) { return; } '
      + 'promptWindowOpened = true; sendAuthPending(hold); } catch (Exception e) { Logging.error("LockPage: promptWindowOpens failed (" + e.GetType().Name + ")"); } } '
      + RELEASE_HOLD_CODE },
  { n: 'sendAuthPending helper', after: ['Logging.error("LockPage: setAuthPending push failed: " + e);', '}', '}', ''],
    before: 'private async Task AuthenticateAsync(string reason, string cancel = null, string fallback = null, string tooFast = null)', put: [],
    code: 'private void sendAuthPending(string value) { try { Utils.sendUiCommand(this, "setAuthPending", value); } catch (Exception e) { Logging.error("LockPage: setAuthPending hold push failed (" + e.GetType().Name + ")"); } }' },
  { n: 'R4 alert', after: ['// (i18n-C#, Session AD: the alert\'s button only dismisses it — the localized Ok)', 'revealPasswordForm();'], before: 'return Task.CompletedTask;',
    put: ['                _ = displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title"), SpixiLocalization._SL("global-lock-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok"));', '            }', ''],
    code: 'if (LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, result.Status.ToString())) { _ = displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title"), SpixiLocalization._SL("global-lock-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok")); } }' },
];

/* cut the hunks out of the raw text: returns the restored text and the names of the hunks that did not match */
export const restore = (raw, hunks) => {
  const code = mask(raw);
  const lines = raw.split('\n'), cl = code.split('\n');
  const bad = [];
  for (const h of hunks) {
    const hits = [];
    for (let i = 0; i + h.after.length <= lines.length; i++) {
      let all = true;
      for (let k = 0; k < h.after.length; k++) if (lines[i + k].trim() !== h.after[k]) { all = false; break; }
      if (all) hits.push(i + h.after.length - 1);
    }
    if (hits.length !== 1) { bad.push(h.n + ' (anchor x' + hits.length + ')'); continue; }
    const ia = hits[0];
    let ib = -1;
    for (let i = ia + 1; i < lines.length; i++) if (lines[i].trim() === h.before) { ib = i; break; }
    if (ib < 0) { bad.push(h.n + ' (no next line)'); continue; }
    if (norm(cl.slice(ia + 1, ib).join('\n')) !== norm(h.code)) bad.push(h.n + ' (code)');
    lines.splice(ia + 1, ib - ia - 1, ...h.put);
    cl.splice(ia + 1, ib - ia - 1, ...h.put);
  }
  return { text: lines.join('\n'), bad };
};

/* the three frozen base shapes of the push grammar: counts over the base's masked code */
const LOCK_SEND_BASE = { '"setJustConfirm"': 1, '"setAppLock"': 1, '"setAuthPending"': 1 };      // sendUiCommand(this, <name>, …) in LockPage.xaml.cs at 462ba3e4
const LOCK_IXIAN_BASE = { 'ixian:onload': 2, 'ixian:back': 1, 'ixian:unlock': 2, 'ixian:change': 2 };   // `ixian:<verb>` in the code of LockPage.xaml.cs at 462ba3e4
const verbs = (c) => { const o = {}; for (const m of c.matchAll(/ixian:[A-Za-z0-9_]*/g)) o[m[0]] = (o[m[0]] || 0) + 1; return o; };
const sends = (c) => { const o = {}; for (const m of c.matchAll(/sendUiCommand\(\s*[^,()]+,\s*("[^"]*"|[^,)]+)/g)) o[m[1]] = (o[m[1]] || 0) + 1; return o; };

/* name → file → count, over the comment-masked code of every C# file of Spixi/ (whole words; a name inside a string counts) */
const NAMES = {
  'LockbFlags.HoldWhileDeferred': { [LOCK_F]: 5 },                 // R1, R2 (loadHold, promptHold), promptWindowOpens, R3, releaseHold (R5)
  'LockbFlags.NoAlertNoCredential': { [LOCK_F]: 1 },               // R4
  'LockbFlags.SecondClock': { [APP_F]: 1 },                        // OnResume, once
  'LockbFlags': { [APP_F]: 1, [LOCK_F]: 6, [FLAGS_F]: 1 },         // the five HoldWhileDeferred reads + the one NoAlert read of LockPage, App's one; the class
  'LockShellRules.holdPushAtLoad': { [LOCK_F]: 1 },
  'LockShellRules.holdPushAtPrompt': { [LOCK_F]: 2 },              // maybeAuthenticate, promptWindowOpens
  'LockShellRules.popAnimated': { [LOCK_F]: 1 },
  'LockShellRules.alertAfterPrompt': { [LOCK_F]: 1 },
  'LockShellRules.releaseHoldWithoutPrompt': { [LOCK_F]: 1 },      // R5, in releaseHold
  'LockShellRules': { [LOCK_F]: 6, [SHELL_F]: 1 },                 // the six calls (holdPushAtPrompt twice) + the class
  'LockClockRules.nowMs': { [APP_F]: 4 },                          // the unlockedMono initialiser, markBackgrounded, onUnlock, OnResume
  'LockClockRules.withinGrace': { [APP_F]: 1 },
  'LockClockRules.keepTwin': { [APP_F]: 1 },
  'LockClockRules.diagSuffix': { [APP_F]: 1 },
  'LockClockRules': { [APP_F]: 7, [CLOCK_F]: 1 },                  // the seven App sites + the class
  promptWindowOpens: { [LOCK_F]: 2, [APP_F]: 1 },                  // the declaration + the word in its log text; the one call
  sendAuthPending: { [LOCK_F]: 4 },                                // the declaration and the three callers
  promptWindowOpened: { [LOCK_F]: 3 },                             // the field, R1's argument, promptWindowOpens' write
  releaseHold: { [LOCK_F]: 2, [APP_F]: 4 },                        // the declaration + the word in its log text; the four calls (backstop, pop-failed, lockOnPause's handler and catch)
  releaseHoldWithoutPrompt: { [LOCK_F]: 1, [SHELL_F]: 1 },         // R5's call; its declaration
  holdReleased: { [LOCK_F]: 3 },                                   // the field, releaseHold's write, R1's argument
  builtDeferred: { [LOCK_F]: 7, [SHELL_F]: 8 },                    // LockPage: the field, R1, R2, R3, promptWindowOpens, deferAuthentication, releaseHold; the rules' parameters + R5's two
  backgroundedMono: { [APP_F]: 7 },
  unlockedMono: { [APP_F]: 3 },
  wentAwayMono: { [APP_F]: 3 },                                    // the read, the #500 restore, the stampMono use
  stampMono: { [APP_F]: 3, [CLOCK_F]: 6 },                         // App: the local, the rule's argument, the diag suffix
  nowMono: { [APP_F]: 3, [CLOCK_F]: 6 },                           // App: the local, the rule's argument, the diag suffix
  secondClock: { [APP_F]: 4 },                                     // the local, the nowMono test, the `if`, the diag suffix argument
  HoldWhileDeferredKey: { [FLAGS_F]: 2 },                          // declared + read; nothing stores it
  NoAlertNoCredentialKey: { [FLAGS_F]: 2 },
  SecondClockKey: { [FLAGS_F]: 2 },
  flagLockHoldWhileDeferred: { [FLAGS_F]: 1 },
  flagLockNoAlertNoCredential: { [FLAGS_F]: 1 },
  flagLockSecondClock: { [FLAGS_F]: 1 },
  HoldDeferred: { [SHELL_F]: 2 },                                  // the constant, R1's return
  HoldWindowOpen: { [SHELL_F]: 3 },                                // the constant, R1's else, R2's return
};
const KEY_STRINGS = ['flagLockHoldWhileDeferred', 'flagLockNoAlertNoCredential', 'flagLockSecondClock'];

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
  const view = (f) => { const raw = text(f); return { raw, code: mask(raw), bare: mask(raw, true) }; };
  const M = (c) => norm(c);
  const ARRAY = (...a) => a.join(' ');

  const app = view(APP_F), lock = view(LOCK_F);
  const appN = M(app.code), lockN = M(lock.code);
  const resume = span(app.code, app.bare, 'protected override void OnResume()');
  const resumeN = M(resume.text);
  const GRACE = 'bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds, SpixiFlags.LockDelayOneMinute);';
  const SECOND = ARRAY('bool secondClock = LockbFlags.SecondClock;', 'long? nowMono = secondClock ? LockClockRules.nowMs() : null;',
    'long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono;',
    'if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(sinceBackground.TotalSeconds, nowMono, stampMono, SpixiFlags.LockDelayOneMinute); }');
  const writes = (t, name) => (t.match(new RegExp('(?<![A-Za-z0-9_.])' + esc(name) + '\\s*(?:[-+*/|&^?]{0,2}=)(?!=)', 'g')) || []).length;
  const at = (c, s) => c.indexOf(s);

  /* ───────────────────────── b1 — the grace statement and the second clock ───────────────────────── */
  const graceAt = at(app.code, 'bool withinGrace =');
  const after = resumeN.indexOf(GRACE);
  const b1 = {
    found: resume.text.length > 0 && count(appN, 'protected override void OnResume()') === 1,
    baseStatement: count(resumeN, GRACE) === 1 && count(appN, GRACE) === 1 && (appN.match(/bool withinGrace =/g) || []).length === 1,
    exactlyFourAfterIt: after >= 0 && resumeN.indexOf(GRACE + ' ' + SECOND + ' ') === after && count(resumeN, SECOND) === 1,
    nextStatementIsTheBases: resumeN.includes(SECOND + ' SLockDiag.mark("resume/entered"'),
    assignedTwice: writes(norm(app.bare), 'withinGrace') === 2 && count(resumeN, 'withinGrace = LockClockRules.withinGrace(') === 1 && count(resumeN, GRACE) === 1,
    oneClockRead: count(resumeN, 'LockClockRules.nowMs()') === 1 && count(appN, 'LockbFlags.SecondClock') === 1,
    onlyMoreLocks: count(resumeN, 'if (secondClock && withinGrace) { withinGrace = ') === 1 && !/withinGrace = (?:true|!|LockClockRules\.withinGrace\([^;]*\) \|\|)/.test(resumeN),
    outsideEveryIf: graceAt > resume.at && regionsAt(app.code, graceAt).length === 0 && regionsAt(app.code, app.code.indexOf('LockbFlags.SecondClock')).length === 0
      && regionsAt(app.code, app.code.indexOf('LockClockRules.withinGrace(')).length === 0,
    laterReadsAreTheBases: count(appN, '!withinGrace &&') === 1 && count(resumeN, '!(ownIntentReturn || withinGrace) || !dismissPauseLock(held)') === 1,
  };
  ok(F(b1).length === 0,
    '★ lockb b1 grace: App.OnResume keeps the ONE base statement `' + GRACE + '` and directly after it (comments aside) exactly four statements — `bool secondClock = LockbFlags.SecondClock;`, `long? nowMono = secondClock ? LockClockRules.nowMs() : null;`, `long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono;` and `if (secondClock && withinGrace) { withinGrace = LockClockRules.withinGrace(…); }` — so the second clock can only turn a base "inside" into "outside" (more locks, never fewer); `withinGrace` is assigned in those two places and nowhere else, the second clock is read once per resume, all outside every `#if`; the later reads (`!(ownIntentReturn || withinGrace)`, presentAppLock\'s `!withinGrace`) are the base\'s — failing: ' + JSON.stringify(F(b1)));

  /* ───────────────────────── b2 — the twin stamps ───────────────────────── */
  const mark = span(app.code, app.bare, 'private void markBackgrounded()');
  const unlock = span(app.code, app.bare, 'public void onUnlock(object sender, EventArgs e)');
  const unlockN = M(unlock.text), markN = M(mark.text);
  const UNLOCK_BODY = '{ if (!S16SecRules.unlockReleases(e)) { Logging.error("onUnlock: not a verified unlock - the lock stays"); return; } isLockScreenActive = false; unlockedDate = DateTime.Now; '
    + 'backgroundedDate = DefaultsRules.stampAfterUnlock(backgroundedDate, SpixiFlags.LockDelayOneMinute); unlockedMono = LockClockRules.nowMs(); '
    + 'backgroundedMono = LockClockRules.keepTwin(backgroundedDate, backgroundedMono); SpixiContentPage.hidePrivacyShield(); pauseLock = null; pendingForegroundAuth = null; UIHelpers.refreshAppRequests = true; }';
  const siteAt = (s) => app.code.indexOf(s);
  const b2 = {
    found: mark.end > 0 && unlock.end > 0 && resume.end > 0,
    backgroundedMonoFiveWrites: writes(norm(app.bare), 'backgroundedMono') === 5 && words(app.code, 'backgroundedMono') === 7,
    unlockedMonoTwoWrites: writes(norm(app.bare), 'unlockedMono') === 2 && words(app.code, 'unlockedMono') === 3,
    fieldInitialisers: count(appN, 'private DateTime unlockedDate = DateTime.Now; private long? unlockedMono = LockClockRules.nowMs();') === 1
      && count(appN, 'private DateTime? backgroundedDate = null; private long? backgroundedMono = null;') === 1,
    markBackgrounded: markN === '{ if (!locksOnBackground) { return; } if (backgroundedDate == null) { backgroundedDate = DateTime.Now; backgroundedMono = LockClockRules.nowMs(); } }',
    resumeReadAndClear: count(resumeN, 'DateTime? wentAway = backgroundedDate; backgroundedDate = null; long? wentAwayMono = backgroundedMono; backgroundedMono = null; TimeSpan sinceBackground = ') === 1
      && count(resumeN, 'backgroundedDate = null;') === 1 && count(resumeN, 'backgroundedMono = null;') === 1,
    restoreNo500: count(resumeN, 'backgroundedMono = wentAwayMono; backgroundedDate = wentAway; SLockDiag.mark("resume/lock-stays-up"') === 1
      && count(resumeN, 'backgroundedDate = wentAway;') === 1 && count(resumeN, 'backgroundedMono = wentAwayMono;') === 1,
    onUnlockWholeBody: unlockN === UNLOCK_BODY,
    stampMonoFromTheRightTwin: count(resumeN, 'long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono;') === 1,
    wallStampsAreTheBases: writes(norm(app.bare), 'backgroundedDate') === 5 && writes(norm(app.bare), 'unlockedDate') === 2,
    outsideEveryIf: ['private long? unlockedMono', 'private long? backgroundedMono', 'backgroundedMono = LockClockRules.nowMs();', 'long? wentAwayMono', 'backgroundedMono = wentAwayMono;', 'unlockedMono = LockClockRules.nowMs();\n', 'LockClockRules.keepTwin(']
      .every((s) => { const p = siteAt(s.trim()); return p > 0 && regionsAt(app.code, p).length === 0; }),
  };
  ok(F(b2).length === 0,
    '★ lockb b2 twins: the second-clock twins `backgroundedMono` / `unlockedMono` are written ONLY at the five / two sites of the diff, each directly beside its wall stamp — the field initialisers; markBackgrounded (inside the `if (backgroundedDate == null)` block, so a twin is laid only with its wall stamp); OnResume (read ONCE and cleared right after the wall read + clear); the #500 restore (directly before `backgroundedDate = wentAway;`); onUnlock (`unlockedMono = LockClockRules.nowMs();` and `backgroundedMono = LockClockRules.keepTwin(backgroundedDate, backgroundedMono);` right after the stampAfterUnlock line, after the verified-unlock guard) — so a twin never outlives its wall stamp and is never younger than it (a younger twin would read a long absence as a short one: the unsafe direction); the base\'s five `backgroundedDate` writes and two `unlockedDate` writes are unchanged; all outside every `#if` — failing: ' + JSON.stringify(F(b2)));

  /* ───────────────────────── b3 — the one call of promptWindowOpens ───────────────────────── */
  const csFiles = walk('Spixi', /\.cs$/i, ['bin', 'obj']);
  const callers = [];
  for (const f of csFiles) { const c = mask(text(f)); const n = count(c, '.promptWindowOpens(') + count(c, ' promptWindowOpens(') + count(c, '\tpromptWindowOpens(') - count(c, 'void promptWindowOpens('); if (n > 0) callers.push(f + ':' + n); }
  const callAt = app.code.indexOf('held.promptWindowOpens();');
  const reg = callAt > 0 ? regionsAt(app.code, callAt) : ['?'];
  const b3 = {
    walked: csFiles.length > 100 && csFiles.includes(APP_F) && csFiles.includes(LOCK_F),
    onceInTheTree: JSON.stringify(callers) === JSON.stringify([APP_F + ':1']) && count(appN, 'held.promptWindowOpens();') === 1 && words(app.code, 'promptWindowOpens') === 1,
    inOnResume: callAt > resume.at && callAt < resume.end,
    directlyBeforeTheLatch: count(resumeN, 'held.promptWindowOpens(); pendingForegroundAuth = held; #else') === 1 && count(appN, 'pendingForegroundAuth = held;') === 1,
    insideTheAndroidArm: reg.length === 1 && reg[0] === 'ANDROID',
    afterThe500Restore: count(resumeN, 'backgroundedDate = wentAway; SLockDiag.mark("resume/lock-stays-up", "releasing deferred auth · stamp restored (#500)"); #if ANDROID held.promptWindowOpens(); pendingForegroundAuth = held;') === 1,
    elseArmIsTheBases: count(resumeN, '#else held.onForegroundReturned(); #endif') === 1,
    declared: count(lockN, 'public void promptWindowOpens()') === 1,
  };
  ok(F(b3).length === 0,
    '★ lockb b3 prompt call: `held.promptWindowOpens();` exists exactly ONCE in the whole tree (every C# file of Spixi/, comments masked) — in App.OnResume\'s "lock stays up" branch, inside the `#if ANDROID` arm only (the `#else` keeps `held.onForegroundReturned();`), directly BEFORE `pendingForegroundAuth = held;` and after the #500 restore + the `resume/lock-stays-up` mark — LockPage.promptWindowOpens is declared once; nothing else calls it — failing: ' + JSON.stringify(F(b3)) + ' callers ' + JSON.stringify(callers) + ' regions ' + JSON.stringify(reg));

  /* ───────────────────────── b4 — LockPage ───────────────────────── */
  const sp = (sig) => span(lock.code, lock.bare, sig);
  const onLoad = sp('private void onLoad()'), maybe = sp('private async void maybeAuthenticate()'), pop = sp('private void popOwnModal(string leg)'),
    defer = sp('public void deferAuthentication()'), pw = sp('public void promptWindowOpens()'), setRes = sp('private Task SetResultAsync(FingerprintAuthenticationResult result)'),
    send = sp('private void sendAuthPending(string value)');
  const inside = (s, x) => s.end > 0 && lock.code.indexOf(x) > s.at && lock.code.indexOf(x) < s.end;
  const lockWrites = (name) => writes(norm(lock.bare), name);
  const popCalls = (lock.code.match(/PopModalAsync\(/g) || []).length;
  const R1 = 'if (authAttempted) revealPasswordForm(); string? loadHold = LockShellRules.holdPushAtLoad(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred, promptWindowOpened || holdReleased, authAttempted); if (loadHold != null) sendAuthPending(loadHold); uiReady = true;';
  const R2 = 'authAttempted = true; string? promptHold = LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, builtDeferred); if (promptHold != null) sendAuthPending(promptHold); try {';
  const R3 = 'if (Navigation.ModalStack.LastOrDefault() == this) { if (LockShellRules.popAnimated(LockbFlags.HoldWhileDeferred, builtDeferred)) { Navigation.PopModalAsync(); } else { Navigation.PopModalAsync(false); }';
  const R4 = 'revealPasswordForm(); if (LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, result.Status.ToString())) { _ = displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title"), SpixiLocalization._SL("global-lock-invalidpassword-text"), SpixiLocalization._SL("global-dialog-ok")); } } return Task.CompletedTask; }';
  const lockSites = ['string? loadHold =', 'string? promptHold =', 'LockShellRules.popAnimated(', 'LockShellRules.alertAfterPrompt(', 'builtDeferred = true;', 'private void sendAuthPending(', 'promptWindowOpened = true;', 'holdReleased = true;', 'public void releaseHold('];
  const b4 = {
    found: [onLoad, maybe, pop, defer, pw, setRes, send].every((s) => s.end > 0),
    r1AfterTheReveal: count(M(onLoad.text), R1) === 1 && count(lockN, R1) === 1 && count(lockN, 'if (authAttempted) revealPasswordForm();') === 1,
    r2AfterThePromptLatch: count(M(maybe.text), R2) === 1 && count(lockN, 'authAttempted = true;') === 1,
    builtDeferredOnlyInDefer: lockWrites('builtDeferred') === 2 && count(M(defer.text), 'builtDeferred = true;') === 1 && count(lockN, 'builtDeferred = true;') === 1
      && M(defer.text) === '{ SPIXI.Meta.SLockDiag.mark("lock/deferAuthentication"); authDeferred = true; builtDeferred = true; }',
    promptWindowOpensBody: M(pw.text) === '{ try { string? hold = LockShellRules.holdPushAtPrompt(LockbFlags.HoldWhileDeferred, builtDeferred); if (hold == null) { return; } promptWindowOpened = true; sendAuthPending(hold); } catch (Exception e) { Logging.error("LockPage: promptWindowOpens failed (" + e.GetType().Name + ")"); } }'
      && lockWrites('promptWindowOpened') === 2,
    r3Pop: count(M(pop.text), R3) === 1 && popCalls === 2 && count(lockN, 'PopModalAsync();') === 1 && count(lockN, 'PopModalAsync(false);') === 1,
    r4Alert: count(M(setRes.text), R4) === 1 && count(lockN, 'displaySpixiAlert(SpixiLocalization._SL("global-lock-invalidpassword-title")') === 1
      && count(lockN, 'LockShellRules.alertAfterPrompt(') === 1 && words(lock.code, 'NotAvailable') === 0 && words(lock.code, 'Denied') === 0,
    sendHelper: M(send.text) === '{ try { Utils.sendUiCommand(this, "setAuthPending", value); } catch (Exception e) { Logging.error("LockPage: setAuthPending hold push failed (" + e.GetType().Name + ")"); } }',
    outsideEveryIf: lockSites.every((s) => { const p = lock.code.indexOf(s); return p > 0 && regionsAt(lock.code, p).length === 0; }) && !/^[^\S\r\n]*#/m.test(lock.code.replace(/^[^\S\r\n]*#(?:if|elif|else|endif)\b.*$/gm, '')),
  };
  ok(F(b4).length === 0,
    '★ lockb b4 lockpage: LockPage.xaml.cs — R1: the hold push stands directly after `if (authAttempted) revealPasswordForm();` in onLoad (a state, sent at every load; `loadHold != null` guards it); R2: directly after `authAttempted = true;` in maybeAuthenticate\'s PROMPT path, before the `try`; `builtDeferred = true;` is written only inside deferAuthentication (so only the Android pause lock is "built deferred"); promptWindowOpens() = holdPushAtPrompt → null returns, else marks the window and pushes, in its own try / catch with the exception TYPE only; popOwnModal\'s R3 `if` / `else` — `PopModalAsync();` with the animation when R3 says so, `PopModalAsync(false);` otherwise (these are the only two calls); SetResultAsync: `revealPasswordForm();` first, then the R4 `if` around the UNCHANGED displaySpixiAlert statement (the form opens either way; no other status name is tested in this file); none of it inside a `#if` — failing: ' + JSON.stringify(F(b4)));

  /* ───────────────────────── b10 — releaseHold: the reveal when no prompt will come (review r1 M-1 / m-1 / m-2) ───────────────────────── */
  const rel = sp('public void releaseHold(string why)');
  const rda = span(app.code, app.bare, 'public void releaseDeferredAuth()');
  const dpl = span(app.code, app.bare, 'private bool dismissPauseLock(LockPage lp)');
  const relCallers = [];
  for (const f of csFiles) { const c = mask(text(f)); const n = count(c, '.releaseHold(') + count(c, ' releaseHold(') + count(c, '\treleaseHold(') - count(c, 'void releaseHold('); if (n > 0) relCallers.push(f + ':' + n); }
  const lop = span(app.code, app.bare, 'public void lockOnPause()');
  const rdaN = M(rda.text), dplN = M(dpl.text), lopN = M(lop.text);
  const call3At = app.code.indexOf('lockPage.releaseHold("not-presented");'), call4At = app.code.indexOf('failed?.releaseHold("not-presented");');
  const call1At = app.code.indexOf('up.releaseHold("post-resume");'), call2At = app.code.indexOf('lp.releaseHold("pop-failed");');
  const HELD_NULL = 'if (held == null) { LockPage? up = pauseLock; if (up != null) { up.releaseHold("post-resume"); } return; } SLockDiag.mark("resume/deferred-auth-released"';
  const b10 = {
    found: rel.end > 0 && rda.end > 0 && dpl.end > 0 && lop.end > 0 && call3At > lop.at && call4At > call3At && call4At < lop.end,
    declaredOnce: count(lockN, 'public void releaseHold(string why)') === 1 && words(lock.code, 'releaseHold') === 2,
    bodyIsHeld: M(rel.text) === RELEASE_HOLD_CODE.slice(RELEASE_HOLD_CODE.indexOf('{')),   // the R5 test + `return;` first; holdReleased; the reveal; the fixed set; the diag; the catch
    fixedWhySet: count(M(rel.text), 'string word = why == "post-resume" || why == "pop-failed" || why == "not-presented" ? why : "other";') === 1 && count(M(rel.text), '"why=" + word') === 1 && words(lock.bare.slice(rel.open, rel.end), 'why') === 4,   // `why` (outside strings) only in the one mapping — it reaches the log only as the fixed word
    r5IsTheOnlyGate: count(M(rel.text), 'LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred)') === 1 && count(lockN, 'LockShellRules.releaseHoldWithoutPrompt(') === 1,
    fourCallsInTheTree: JSON.stringify(relCallers) === JSON.stringify([APP_F + ':4']) && words(app.code, 'releaseHold') === 4,
    backstopCall: count(rdaN, HELD_NULL) === 1 && count(rdaN, 'releaseHold(') === 1 && call1At > rda.at && call1At < rda.end,
    popFailedCall: count(dplN, 'Logging.error("dismissPauseLock: pop failed: " + e); lp.releaseHold("pop-failed"); } });') === 1 && count(dplN, 'releaseHold(') === 1 && call2At > dpl.at && call2At < dpl.end,
    lockOnPauseHandler: count(lopN, 'pauseLock = null; pendingForegroundAuth = null; isLockScreenActive = false; UIHelpers.refreshAppRequests = true; lockPage.releaseHold("not-presented"); }); });') === 1 && count(lopN, 'releaseHold(') === 2,
    lockOnPauseCatch: count(lopN, 'Logging.error("lockOnPause failed: " + e); LockPage? failed = pauseLock; pauseLock = null; pendingForegroundAuth = null; isLockScreenActive = false; UIHelpers.refreshAppRequests = true; failed?.releaseHold("not-presented"); } }') === 1 && count(lopN, 'LockPage? failed = pauseLock;') === 1 && count(appN, 'LockPage? failed') === 1,
    outsideEveryIf: call1At > 0 && call2At > 0 && call3At > 0 && call4At > 0 && [call1At, call2At, call3At, call4At].every((x) => regionsAt(app.code, x).length === 0),
    holdReleasedOnlyHere: words(lock.code, 'holdReleased') === 3 && lockWrites('holdReleased') === 2 && count(M(rel.text), 'holdReleased = true;') === 1
      && count(lockN, 'private bool holdReleased = false;') === 1 && count(lockN, 'promptWindowOpened || holdReleased') === 1,
  };
  ok(F(b10).length === 0,
    '★ lockb b10 release: `LockPage.releaseHold(why)` is declared ONCE (body held: the R5 test `LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred)` and `return;` first — the switch off or a lock not built deferred is the base — then `holdReleased = true;`, `revealPasswordForm();` (the base\'s "False"), the diag line with `why` mapped to the fixed set post-resume / pop-failed / other, its own catch logging the exception TYPE only; no unlock, no pop, no other latch) and is called EXACTLY FOUR times in the tree, all in App.xaml.cs outside every `#if` (the R5 gate takes THREE arguments — the switch, builtDeferred, authDeferred: a consumed hand-off is never revealed; the fixed word set is post-resume / pop-failed / not-presented, "other" for any other text): `releaseDeferredAuth` — inside `if (held == null) {`, on `pauseLock`, with "post-resume", BEFORE that block\'s `return;` (the pause with no stop, or a throw in OnResume before the hand-off: nothing handed over, the lock up) — and `dismissPauseLock`\'s pop-failed catch with "pop-failed", after the log line; lockOnPause\'s `ContinueWith` handler — `lockPage.releaseHold("not-presented");` the LAST statement, after `UIHelpers.refreshAppRequests = true;` — and its catch — `LockPage? failed = pauseLock;` directly after the log line, BEFORE `pauseLock = null;`, and `failed?.releaseHold("not-presented");` the last statement; `holdReleased` is written only in its field initialiser and in releaseHold, read only in the R1 call — failing: ' + JSON.stringify(F(b10)) + ' callers ' + JSON.stringify(relCallers));

  /* ───────────────────────── b5 — the push grammar ───────────────────────── */
  const shell = view(SHELL_F);
  const shellStrings = [...shell.code.matchAll(/"([^"\n]*)"/g)].map((m) => m[1]).sort();
  const lockSend = sends(lock.code), appSend = sends(app.code), lockVerbs = verbs(lock.code), appVerbs = verbs(app.code);
  const sendAll = (lock.code.match(/sendUiCommand\(/g) || []).length;
  const callersOfHelper = [...lock.code.matchAll(/(?<![A-Za-z0-9_])sendAuthPending\(\s*([^)]*)\)/g)].map((m) => m[1].trim());
  const sameMap = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  const b5 = {
    onlyFalseAndTheHelper: lockSend['"setAuthPending"'] === 2 && count(lockN, 'Utils.sendUiCommand(this, "setAuthPending", "False");') === 1 && count(lockN, 'Utils.sendUiCommand(this, "setAuthPending", value);') === 1
      && count(M(sp('private void revealPasswordForm()').text), '"False"') === 1,
    commandNamesAreTheBases: sameMap({ ...lockSend, '"setAuthPending"': 1 }, LOCK_SEND_BASE) && sendAll === 4 && Object.keys(appSend).length === 0 && !/sendUiCommand|executeUiCommand/.test(app.code),
    noNewIxianVerb: sameMap(lockVerbs, LOCK_IXIAN_BASE) && Object.keys(appVerbs).length === 0,
    helperCallers: JSON.stringify(callersOfHelper.sort()) === JSON.stringify(['hold', 'loadHold', 'promptHold', 'string value'].sort()),
    helperValuesFromTheRules: count(lockN, 'string? loadHold = LockShellRules.holdPushAtLoad(') === 1 && count(lockN, 'string? promptHold = LockShellRules.holdPushAtPrompt(') === 1 && count(lockN, 'string? hold = LockShellRules.holdPushAtPrompt(') === 1,
    rulesReturnOnlyTheTwoConstants: count(norm(shell.code), 'public const string HoldDeferred = "True"; public const string HoldWindowOpen = "1";') === 1
      && JSON.stringify(shellStrings) === JSON.stringify(['1', 'Denied', 'NotAvailable', 'True'])
      && (norm(shell.bare).match(/return [^;]*;/g) || []).sort().join('|') === ['return !(on && builtDeferred);', 'return on && builtDeferred && authDeferred;', 'return !(string.Equals(status, " ", System.StringComparison.Ordinal) || string.Equals(status, " ", System.StringComparison.Ordinal));',
        'return authDeferred && !windowOpened ? HoldDeferred : HoldWindowOpen;', 'return null;', 'return on && builtDeferred ? HoldWindowOpen : null;', 'return true;'].sort().join('|'),
  };
  ok(F(b5).length === 0,
    '★ lockb b5 grammar: no new bridge surface (the frozen bridge) — LockPage.xaml.cs sends `setAuthPending` only with "False" (revealPasswordForm, the base) and through the helper `sendAuthPending(value)` whose three callers pass only what LockShellRules.holdPushAtLoad / holdPushAtPrompt returned; LockShellRules returns only the two existing "pending" constants "True" / "1" (or null, or a bool) and its only other strings are the two enum NAMES of R4; the set of `ixian:` verbs of LockPage / App is the base\'s and the set of sendUiCommand command names too (`setJustConfirm`, `setAppLock`, `setAuthPending` — the last now at two call sites; App.xaml.cs sends none, so it names none) — failing: ' + JSON.stringify(F(b5)) + ' sends ' + JSON.stringify(lockSend) + ' verbs ' + JSON.stringify(lockVerbs) + ' callers ' + JSON.stringify(callersOfHelper));

  /* ───────────────────────── b6 — who names what ───────────────────────── */
  const got = {};
  for (const n of Object.keys(NAMES)) got[n] = {};
  for (const f of csFiles) {
    const c = mask(text(f));
    for (const n of Object.keys(NAMES)) { const k = words(c, n); if (k) got[n][f] = k; }
  }
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  const wrongNames = Object.keys(NAMES).filter((n) => !same(NAMES[n], got[n]));
  const webFiles = [...walk('src', /\.(html|js|mjs|css|json)$/i, ['node_modules']), ...walk('Spixi/Resources/Raw/html', /\.(html|js|mjs|css|json)$/i, [])];
  const leaked = webFiles.filter((f) => { const t = exact(f).toString('utf8'); return KEY_STRINGS.some((k) => t.includes(k)) || /LockbFlags|promptWindowOpens/.test(t); });
  const keyHolders = csFiles.filter((f) => { const c = mask(text(f)); return KEY_STRINGS.some((k) => c.includes(k)); });
  const b6 = {
    walked: csFiles.length > 100 && csFiles.includes(SHELL_F) && csFiles.includes(CLOCK_F) && csFiles.includes(FLAGS_F),
    exactTable: wrongNames.length === 0,
    keysOnlyInSpixiFlags: JSON.stringify(keyHolders) === JSON.stringify([FLAGS_F]),
    webWalked: webFiles.length > 20,
    notInTheWebView: leaked.length === 0,
  };
  ok(F(b6).length === 0,
    '★ lockb b6 names: over every C# file of Spixi/ (comments masked, whole words) the names match the exact table — LockbFlags.HoldWhileDeferred (4 reads in LockPage) / NoAlertNoCredential (1) / SecondClock (1, App.OnResume); LockShellRules.* and LockClockRules.* only at their call sites; `promptWindowOpens` declared once and called once; `sendAuthPending` declared once with three callers; the twins `backgroundedMono` (7 words) / `unlockedMono` (3); the three key constants declared + read in SpixiFlags.cs only; the three key strings only in SpixiFlags.cs; none of them, and no `LockbFlags` / `promptWindowOpens`, in any file of src/ or Spixi/Resources/Raw/html (C#-only switches) — failing: ' + JSON.stringify(F(b6))
    + ' ' + JSON.stringify(Object.fromEntries(wrongNames.map((n) => [n, got[n]]))) + (leaked.length ? ' web: ' + JSON.stringify(leaked.slice(0, 5)) : '') + ' keys in ' + JSON.stringify(keyHolders));

  /* ───────────────────────── b7 — the rest of the three files = the base ───────────────────────── */
  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  const hasBom = (f) => exact(f).subarray(0, 3).equals(BOM);   // App.xaml.cs and LockPage.xaml.cs carry a BOM (the hash is over the exact bytes)
  const bytesOf = (f, t) => Buffer.concat([hasBom(f) ? BOM : Buffer.alloc(0), Buffer.from(t, 'utf8')]);
  const appBack = restore(app.raw, APP_HUNKS), lockBack = restore(lock.raw, LOCK_HUNKS);
  const flagsRaw = text(FLAGS_F), flagsCode = mask(flagsRaw), flagsBare = mask(flagsRaw, true);
  const lf = flagsRaw.split('\n');
  const startLine = lf.map((l, i) => [l, i]).filter(([l]) => l.trim().startsWith('/* ★ lockb (Lock batch')).map(([, i]) => i);
  const lb = span(flagsCode, flagsBare, 'public static class LockbFlags');
  const flagsBefore = flagsRaw.slice(0, lb.at >= 0 ? lb.at : 0);
  const lineOf = (pos) => flagsRaw.slice(0, pos).split('\n').length - 1;
  let flagsRest = '<<no block>>', blockCode = '<<none>>';
  if (startLine.length === 1 && lb.end > 0 && lineOf(lb.at) > startLine[0] && lf[startLine[0] - 1].trim() === '') {
    const endLine = lineOf(lb.end - 1);
    const cl2 = flagsCode.split('\n');
    blockCode = norm(cl2.slice(startLine[0], endLine + 1).join('\n'));
    flagsRest = [...lf.slice(0, startLine[0] - 1), ...lf.slice(endLine + 1)].join('\n');
  }
  const flagsRestLines = flagsRest.split('\n');
  const b7 = {
    appHunksFound: appBack.bad.length === 0,
    appBytes: sha(bytesOf(APP_F, appBack.text)) === BASE.app,
    lockHunksFound: lockBack.bad.length === 0,
    lockBytes: sha(bytesOf(LOCK_F, lockBack.text)) === BASE.lock,
    flagsBlockCode: sha(blockCode) === FLAGS_BLOCK_CODE,
    flagsBytes: sha(bytesOf(FLAGS_F, flagsRest)) === BASE.flags,
    flagsBlockIsLast: lb.end > 0 && flagsRaw.slice(lb.end).replace(/\s+/g, '') === '}' && flagsRestLines.length > 3,
    oneBlockOnly: startLine.length === 1 && count(norm(flagsBare), 'class LockbFlags') === 1,
  };
  ok(F(b7).length === 0,
    '★ lockb b7 rest: Spixi/App.xaml.cs and Spixi/Pages/Launch/LockPage.xaml.cs with the lockb insertions taken out (' + APP_HUNKS.length + ' / ' + LOCK_HUNKS.length + ' regions, each found by its base neighbours and holding exactly the expected CODE — comments inside are free; App\'s one changed operand line restored to `+ " withinGrace=" + withinGrace);`; LockPage\'s popOwnModal and SetResultAsync restored to their one base statement) are the base files BYTE FOR BYTE (SHA-256 of the exact bytes at 462ba3e4): nothing moved, nothing else changed — the stamp, the negative-age guard, dismissPauseLock, the #500 re-stamp, the deferred prompt, presentAppLock, every other member; Spixi/Utils/SpixiFlags.cs = the base + exactly ONE block (the LockbFlags class, held by its masked code) appended after the last type, init() untouched — failing: ' + JSON.stringify(F(b7))
    + ' app ' + JSON.stringify(appBack.bad) + ' ' + sha(bytesOf(APP_F, appBack.text)) + ' lock ' + JSON.stringify(lockBack.bad) + ' ' + sha(bytesOf(LOCK_F, lockBack.text)) + ' flags ' + sha(bytesOf(FLAGS_F, flagsRest)) + ' block ' + sha(blockCode));

  /* ───────────────────────── b8 — the two rule files and the switch block ───────────────────────── */
  const clock = view(CLOCK_F);
  const sN = norm(shell.code), cN = norm(clock.code), cB = norm(clock.bare);
  const RISKY = /ixian:|sendUiCommand|executeUiCommand|SecureStorage|WalletPassStore|walletpass|Preferences|Logging|Task|Thread|\bawait\b|\basync\b|Sleep|Delay|Timer|File\.|Directory\.|System\.IO|Reflection|typeof|dynamic\b|Plugin\.|Microsoft\.Maui|MainThread/;
  const usingsOf = (c) => JSON.stringify((c.match(/^\s*using\s+[^;]+;/gm) || []).map((u) => norm(u)).sort());
  const clockNoAndroid = norm(clock.code.replace(/#if ANDROID[\s\S]*?#else/m, '#if ANDROID #else'));
  const flagsBlock = flagsCode.slice(lb.at >= 0 ? lb.at : 0, lb.end > 0 ? lb.end : 0), flagsBlockBare = flagsBare.slice(lb.at >= 0 ? lb.at : 0, lb.end > 0 ? lb.end : 0);
  const b8 = {
    shellClean: !RISKY.test(shell.code) && usingsOf(shell.code) === '[]' && count(sN, 'public static class LockShellRules') === 1 && count(sN, 'class ') === 1 && !/^\s*#/m.test(shell.code) && !shell.bare.includes('['),
    clockClean: !RISKY.test(clockNoAndroid) && usingsOf(clock.code) === JSON.stringify(['using System.Globalization;', 'using System;']) && count(cN, 'public static class LockClockRules') === 1 && count(cN, 'class ') === 1,
    clockNoSetterNoOtherClock: !/TickCount|Stopwatch|DateTime\s*\.|Environment\.|SetTime|ElapsedRealtimeNanos|UptimeMillis/.test(cB) && count(cB, 'DateTime') === 1 && count(cN, 'DateTime? wallStamp') === 1,
    androidOnlyInTheIf: count(cN, 'global::Android.OS.SystemClock.ElapsedRealtime()') === 1 && count(cN, '#if ANDROID') === 1 && count(cN, '#else') === 1 && count(cN, '#endif') === 1
      && regionsAt(clock.code, clock.code.indexOf('Android.OS.SystemClock')).join('|') === 'ANDROID' && regionsAt(clock.code, clock.code.indexOf('return null;')).join('|').trim() === '#else',
    clockNoPlatformTypeOutsideIf: count(cB.replace(/#if ANDROID[\s\S]*?#else/, ''), 'Android') === 0,
    withinGraceStartsWithTheWallRule: count(cN, 'public static bool withinGrace(double wallSecondsAway, long? nowMono, long? stampMono, bool oneMinute) { if (!DefaultsRules.withinGrace(wallSecondsAway, oneMinute)) { return false;') === 1,
    flagsBlockReads: count(flagsBlock, 'Preferences.Default.Get(') === 4 && (flagsBlock.match(/Preferences\.Default\.(Set|Remove|Clear)\(/g) || []).length === 0
      && count(flagsBlock, 'S16PassRules.effectiveFlag(dev,') === 3 && count(flagsBlock, 'Logging.info(') === 1 && !/Logging\.(warn|error|debug)\(/.test(flagsBlock) && !/#/.test(flagsBlockBare.replace(/"[^"]*"/g, '')),
    flagsNotFromInit: !/LockbFlags\./.test(norm(span(flagsCode, flagsBare, 'public static void init()').text)) && count(norm(flagsBare), 'LockbFlags.read(') === 0,
  };
  ok(F(b8).length === 0,
    '★ lockb b8 rules: LockShellRules.cs and LockClockRules.cs are ONE static class each and pure — no `ixian:`, sendUiCommand, Preferences, Logging, Task, Thread, file, MAUI or Plugin word; LockShellRules has no using and no attribute; LockClockRules uses only System and System.Globalization, `DateTime` only as the type in keepTwin\'s signature (no `DateTime.Now`, no TickCount / Stopwatch — they stop in sleep: the unsafe direction), `Android.OS.SystemClock.ElapsedRealtime()` only inside `#if ANDROID` with `return null;` in the `#else`, and `withinGrace` begins with the base\'s own wall rule; the LockbFlags block reads exactly its three keys (+ devMode) with `Preferences.Default.Get`, writes / removes / clears none, applies S16PassRules.effectiveFlag three times (a stored 0 acts only in dev mode), logs ONCE at Info and is NOT called from SpixiFlags.init() (L269) — failing: ' + JSON.stringify(F(b8)));

  /* ───────────────────────── b9 — the harness ───────────────────────── */
  const csproj = text('scripts/csh/csh.csproj');
  const tests = (f) => (mask(text(f)).match(/\[TestMethod\]/g) || []).length;   // review r1 P-m3: over the comment-masked text
  const b9 = {
    shellCompiled: count(csproj, '<Compile Include="../../Spixi/Utils/LockShellRules.cs" />') === 1,
    clockCompiled: count(csproj, '<Compile Include="../../Spixi/Utils/LockClockRules.cs" />') === 1,
    flagsCompiledRealFile: count(csproj, '<Compile Include="../../Spixi/Utils/SpixiFlags.cs" />') === 1,
    noCompileRemove: !/<Compile\s+Remove=/.test(csproj),
    shellTests: tests('scripts/csh/LockShellTests.cs') === 17,
    clockTests: tests('scripts/csh/LockClockTests.cs') === 15,
  };
  ok(F(b9).length === 0,
    '★ lockb b9 harness: csh.csproj compiles the REAL LockShellRules.cs, LockClockRules.cs and SpixiFlags.cs (no copy of the types, no `Compile Remove`), LockShellTests.cs holds its 17 tests and LockClockTests.cs its 15 (counted over the comment-masked text: a commented-out `[TestMethod]` is not a test) — the pure rules run there (the 32 rows of CSH 898); this module reads the MAUI-bound text — failing: ' + JSON.stringify(F(b9)));
}
