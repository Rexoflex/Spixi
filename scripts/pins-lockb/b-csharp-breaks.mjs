/* ==== lockb · B — the deliberate breaks of pins-lockb/b-csharp.mjs (#802), by hand — NOT in the smoke.
 * usage: node scripts/pins-lockb/b-csharp-breaks.mjs [--root <tree>] [--only <n>]
 * It makes ONE temp copy of Spixi/, src/ and scripts/csh/ of the tree (hard links where the file system allows, else a copy; the original
 * is never written: a mutated file is written to a NEW inode), and for each mutation below: writes the mutated file into the copy, runs
 * b-csharp.mjs over it, prints the keys that went red, compares them with the PLANNED list of this file, and puts the file back. The first
 * row is the unmutated copy (all ten keys green). Exit code 1 when a row differs from its plan.
 * A mutation = { n, file, from, to } (the FIRST occurrence of `from` is replaced; `from` must exist) or { n, add: { file, text } } (a new file).
 * `red` = the keys that must be red, exactly (the planned list). */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let only = null;
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--root') root = argv[++i]; else if (argv[i] === '--only') only = Number(argv[++i]); }

const APP = 'Spixi/App.xaml.cs', LOCK = 'Spixi/Pages/Launch/LockPage.xaml.cs', FLAGS = 'Spixi/Utils/SpixiFlags.cs', SHELL = 'Spixi/Utils/LockShellRules.cs', CLOCK = 'Spixi/Utils/LockClockRules.cs',
  CSPROJ = 'scripts/csh/csh.csproj', SHELLT = 'scripts/csh/LockShellTests.cs';
const M = [
  /* b1 */
  { n: 'b1 the `if` loses `&& withinGrace`', file: APP, from: 'if (secondClock && withinGrace)', to: 'if (secondClock)', red: ['b1', 'b7'] },
  { n: 'b1 stampMono reads the wrong twin', file: APP, from: 'long? stampMono = wentAway.HasValue ? wentAwayMono : unlockedMono;', to: 'long? stampMono = wentAway.HasValue ? unlockedMono : wentAwayMono;', red: ['b1', 'b2', 'b7'] },
  { n: 'b1 the base statement measures from the unlock', file: APP, from: 'bool withinGrace = DefaultsRules.withinGrace(sinceBackground.TotalSeconds,', to: 'bool withinGrace = DefaultsRules.withinGrace(sinceUnlock.TotalSeconds,', red: ['b1', 'b7'] },
  { n: 'b1 a second assignment of withinGrace', file: APP, from: 'if (!(ownIntentReturn || withinGrace) || !dismissPauseLock(held))', to: 'withinGrace = true; if (!(ownIntentReturn || withinGrace) || !dismissPauseLock(held))', red: ['b1', 'b7'] },
  { n: 'b1 a later read of withinGrace changed', file: APP, from: '!(ownIntentReturn || withinGrace)', to: '!(ownIntentReturn && withinGrace)', red: ['b1', 'b7'] },
  /* b2 */
  { n: 'b2 the #500 restore puts a null twin back', file: APP, from: 'backgroundedMono = wentAwayMono;', to: 'backgroundedMono = null;', red: ['b2', 'b6', 'b7'] },
  { n: 'b2 onUnlock keeps no twin (keepTwin gets null)', file: APP, from: 'LockClockRules.keepTwin(backgroundedDate, backgroundedMono)', to: 'LockClockRules.keepTwin(backgroundedDate, null)', red: ['b2', 'b6', 'b7'] },
  { n: 'b2 a sixth write of backgroundedMono (lockOnPause side)', file: APP, from: 'pendingForegroundAuth = null;', to: 'pendingForegroundAuth = null; backgroundedMono = null;', red: ['b2', 'b6', 'b7'] },
  { n: 'b2 markBackgrounded writes a constant', file: APP, from: 'backgroundedMono = LockClockRules.nowMs();   // ★ lockb (#1825 (3)): the twin, at the SAME', to: 'backgroundedMono = 0;   // ★ lockb (#1825 (3)): the twin, at the SAME', red: ['b2', 'b6', 'b7'] },
  { n: 'b2 the twin is written outside the first-edge block', file: APP, from: '            backgroundedMono = LockClockRules.nowMs();   // ★ lockb (#1825 (3)): the twin, at the SAME', to: '        }\n        {\n            backgroundedMono = LockClockRules.nowMs();   // ★ lockb (#1825 (3)): the twin, at the SAME', red: ['b2', 'b7'] },
  /* b3 */
  { n: 'b3 the prompt call is gone', file: APP, from: 'held.promptWindowOpens();   // ★ lockb (#1825 (1)): the note above this Android block', to: '', red: ['b3', 'b6', 'b7'] },
  { n: 'b3 the call moves into the #else arm', file: APP, from: 'held.promptWindowOpens();   // ★ lockb (#1825 (1)): the note above this Android block\n                pendingForegroundAuth = held;\n#else', to: 'pendingForegroundAuth = held;\n#else\n                held.promptWindowOpens();', red: ['b3', 'b7'] },
  { n: 'b3 a second call in the #else arm', file: APP, from: 'held.onForegroundReturned();', to: 'held.onForegroundReturned(); held.promptWindowOpens();', red: ['b3', 'b6', 'b7'] },
  { n: 'b3 the call moves below the latch', file: APP, from: 'held.promptWindowOpens();   // ★ lockb (#1825 (1)): the note above this Android block\n                pendingForegroundAuth = held;', to: 'pendingForegroundAuth = held;\n                held.promptWindowOpens();', red: ['b3', 'b7'] },
  { n: 'b3 a second caller in a new file', add: { file: 'Spixi/Utils/ZzCaller.cs', text: 'namespace SPIXI { public static class ZzCaller { public static void f(LockPage p) { p.promptWindowOpens(); } } }\n' }, red: ['b3', 'b6'] },
  /* b4 */
  { n: 'b4 builtDeferred set in maybeAuthenticate too', file: LOCK, from: '            authAttempted = true;\n', to: '            authAttempted = true; builtDeferred = true;\n', red: ['b4', 'b6', 'b7'] },
  { n: 'b4 R3 pops animated on both arms', file: LOCK, from: 'Navigation.PopModalAsync(false);   // ★ lockb', to: 'Navigation.PopModalAsync();   // ★ lockb', red: ['b4', 'b7'] },
  { n: 'b4 R4 gets a constant status', file: LOCK, from: 'result.Status.ToString())', to: '"NotAvailable")', red: ['b4', 'b7'] },
  { n: 'b4 R1 loses its authAttempted argument', file: LOCK, from: 'promptWindowOpened || holdReleased, authAttempted);', to: 'promptWindowOpened || holdReleased, false);', red: ['b4', 'b7'] },
  { n: 'b4 R1 does not pass holdReleased (a reload of a released lock would send "True": no belt)', file: LOCK, from: 'promptWindowOpened || holdReleased, authAttempted);', to: 'promptWindowOpened, authAttempted);', red: ['b4', 'b6', 'b7', 'b10'] },
  { n: 'b4 R2 ignores the switch', file: LOCK, from: 'holdPushAtPrompt(LockbFlags.HoldWhileDeferred, builtDeferred);   // ★ lockb (#1825 (1))\n            if (promptHold', to: 'holdPushAtPrompt(true, builtDeferred);   // ★ lockb (#1825 (1))\n            if (promptHold', red: ['b4', 'b6', 'b7'] },
  { n: 'b4 the alert is dropped for every status', file: LOCK, from: 'if (LockShellRules.alertAfterPrompt(LockbFlags.NoAlertNoCredential, result.Status.ToString()))', to: 'if (false)', red: ['b4', 'b6', 'b7'] },
  /* b10 (review r1: releaseHold) */
  { n: 'b10 the backstop call in releaseDeferredAuth is removed', file: APP, from: 'up.releaseHold("post-resume");   // ★ lockb (#1825 (1))', to: '', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 the backstop call stands AFTER the `return;` (dead code)', file: APP, from: 'up.releaseHold("post-resume");   // ★ lockb (#1825 (1))\n                }\n                return;', to: '}\n                return; up.releaseHold("post-resume");', red: ['b7', 'b10'] },
  { n: 'b10 the backstop tests `up == null` (fires for no lock, never for the lock)', file: APP, from: 'if (up != null)   // ★ lockb (#1825 (1))', to: 'if (up == null)   // ★ lockb (#1825 (1))', red: ['b7', 'b10'] },
  { n: 'b10 a second backstop call outside `if (held == null)` (after the hand-off)', file: APP, from: 'held.onForegroundReturned();\n        }\n        catch (Exception e)\n        {\n            // A failure here must not take down the resume.', to: 'held.onForegroundReturned(); pauseLock?.releaseHold("post-resume");\n        }\n        catch (Exception e)\n        {\n            // A failure here must not take down the resume.', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 the backstop passes a non-fixed word', file: APP, from: 'up.releaseHold("post-resume");', to: 'up.releaseHold("post-resume " + up);', red: ['b7', 'b10'] },
  { n: 'b10 the pop-failed call passes the exception text', file: APP, from: 'lp.releaseHold("pop-failed");', to: 'lp.releaseHold("pop-failed " + e);', red: ['b7', 'b10'] },
  { n: 'b10 the pop-failed call is removed', file: APP, from: 'lp.releaseHold("pop-failed");   // ★ lockb (#1825 (1))', to: '', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 releaseHold logs the caller text (no fixed set)', file: LOCK, from: 'string word = why == "post-resume" || why == "pop-failed" || why == "not-presented" ? why : "other";', to: 'string word = why;', red: ['b7', 'b10'] },
  { n: 'b10 releaseHold has no R5 gate', file: LOCK, from: 'if (!LockShellRules.releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred))', to: 'if (false)', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 releaseHold never sets holdReleased', file: LOCK, from: 'holdReleased = true;   // ★ lockb', to: '   // ★ lockb', red: ['b4', 'b6', 'b7', 'b10'] },
  { n: 'b10 holdReleased is also written in promptWindowOpens', file: LOCK, from: 'promptWindowOpened = true;   // ★ lockb', to: 'promptWindowOpened = true; holdReleased = true;   // ★ lockb', red: ['b4', 'b6', 'b7', 'b10'] },
  { n: 'b10 releaseHold also pops the lock', file: LOCK, from: 'revealPasswordForm();   // ★ lockb (#1825 (1)): the base\'s reveal; the shell never hides the form again', to: 'revealPasswordForm(); Navigation.PopModalAsync(false);   // ★ lockb (#1825 (1)): the base\'s reveal; the shell never hides the form again', red: ['b4', 'b7', 'b10'] },
  { n: 'b10 a third caller in a new file', add: { file: 'Spixi/Utils/ZzRel.cs', text: 'namespace SPIXI { public static class ZzRel { public static void f(LockPage p) { p.releaseHold("post-resume"); } } }\n' }, red: ['b6', 'b10'] },
  { n: 'b10 R5 is called without authDeferred (a consumed hand-off would be revealed)', file: LOCK, from: 'releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred, authDeferred))', to: 'releaseHoldWithoutPrompt(LockbFlags.HoldWhileDeferred, builtDeferred, true))', red: ['b7', 'b10'] },
  { n: 'b10 the not-presented word is not in the fixed set', file: LOCK, from: ' || why == "not-presented" ? why', to: ' ? why', red: ['b7', 'b10'] },
  { n: 'b10 lockOnPause handler: the not-presented call is removed', file: APP, from: 'lockPage.releaseHold("not-presented");   // ★ lockb (#1825 (1))', to: '', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 lockOnPause handler: the call moves BEFORE an existing statement (refreshAppRequests)', file: APP, from: "UIHelpers.refreshAppRequests = true;\n                    /* ★ lockb (#1825 (1), review r2 S2 MINOR-1): pauseLock is dropped above, so no backstop finds this\n                     * page again. If any of it is on screen, its form is held by R1's \"True\" (no belt): reveal it (the\n                     * base's state). A reveal only; a no-op on a page that never showed; never throws. */\n                    lockPage.releaseHold(\"not-presented\");   // ★ lockb (#1825 (1))", to: "lockPage.releaseHold(\"not-presented\");   // ★ lockb (#1825 (1))\n                    UIHelpers.refreshAppRequests = true;\n                    /* ★ lockb (#1825 (1), review r2 S2 MINOR-1): pauseLock is dropped above, so no backstop finds this\n                     * page again. If any of it is on screen, its form is held by R1's \"True\" (no belt): reveal it (the\n                     * base's state). A reveal only; a no-op on a page that never showed; never throws. */\n", red: ['b7', 'b10'] },
  { n: 'b10 lockOnPause catch: the not-presented call is removed', file: APP, from: 'failed?.releaseHold("not-presented");   // ★ lockb (#1825 (1))', to: '', red: ['b6', 'b7', 'b10'] },
  { n: 'b10 lockOnPause catch: the call moves BEFORE an existing statement (refreshAppRequests)', file: APP, from: "UIHelpers.refreshAppRequests = true;   // AUDIT MINOR-2, the other failure path\n            /* ★ lockb (#1825 (1), review r2 S2 MINOR-1): the same as the handler above — no backstop finds this page\n             * again; reveal its form if it is on screen. A reveal only; null (the throw came before the lock was built)\n             * or a page that never showed = nothing. Never throws. */\n            failed?.releaseHold(\"not-presented\");   // ★ lockb (#1825 (1))", to: "failed?.releaseHold(\"not-presented\");   // ★ lockb (#1825 (1))\n            UIHelpers.refreshAppRequests = true;   // AUDIT MINOR-2, the other failure path\n            /* ★ lockb (#1825 (1), review r2 S2 MINOR-1): the same as the handler above — no backstop finds this page\n             * again; reveal its form if it is on screen. A reveal only; null (the throw came before the lock was built)\n             * or a page that never showed = nothing. Never throws. */\n", red: ['b7', 'b10'] },
  { n: 'b10 lockOnPause catch: the capture is removed', file: APP, from: '            LockPage? failed = pauseLock;   // ★ lockb (#1825 (1), review r2 S2 MINOR-1): taken BEFORE the line below drops it\n', to: '', red: ['b7', 'b10'] },
  { n: 'b10 lockOnPause catch: the call reads pauseLock after it was nulled (always null)', file: APP, from: 'failed?.releaseHold("not-presented");', to: 'pauseLock?.releaseHold("not-presented");', red: ['b7', 'b10'] },
  { n: 'b10 R5 returns on its own (the rule loses `&& builtDeferred && authDeferred`)', file: SHELL, from: 'return on && builtDeferred && authDeferred;', to: 'return on;', red: ['b5', 'b6'] },   // the SEMANTICS of R5 is the C# harness's (r5_table_8, r5_is_r2_while_deferred); this pin sees the shape and the name count
  { n: 'b10 R5 loses only `&& authDeferred`', file: SHELL, from: 'return on && builtDeferred && authDeferred;', to: 'return on && builtDeferred;', red: ['b5'] },   // the shape only; the semantics: csh (run by hand, see the report)
  /* b5 */
  { n: 'b5 the helper pushes another command', file: LOCK, from: 'Utils.sendUiCommand(this, "setAuthPending", value);', to: 'Utils.sendUiCommand(this, "setAuthPending2", value);', red: ['b4', 'b5', 'b7'] },
  { n: 'b5 a hold constant changes ("True" → "true")', file: SHELL, from: 'HoldDeferred = "True"', to: 'HoldDeferred = "true"', red: ['b5'] },
  { n: 'b5 a new ixian: verb', file: LOCK, from: '"ixian:unlock', to: '"ixian:unlockhold', red: ['b5', 'b7'] },
  { n: 'b5 a new push name in App', file: APP, from: 'pendingForegroundAuth = null;', to: 'pendingForegroundAuth = null; Utils.sendUiCommand(null, "setHold", "1");', red: ['b5', 'b7'] },
  { n: 'b5 the rules return a third value', file: SHELL, from: 'return authDeferred && !windowOpened ? HoldDeferred : HoldWindowOpen;', to: 'return authDeferred && !windowOpened ? HoldDeferred : "2";', red: ['b5', 'b6'] },
  /* b6 */
  { n: 'b6 a key string leaks into a web file', add: { file: 'src/zz-leak.js', text: '// flagLockSecondClock\n' }, red: ['b6'] },
  { n: 'b6 a second read of a switch', file: APP, from: 'pendingForegroundAuth = null;', to: 'pendingForegroundAuth = null; bool zz = LockbFlags.SecondClock;', red: ['b1', 'b6', 'b7'] },
  { n: 'b6 a key string in a second C# file', add: { file: 'Spixi/Utils/ZzKey.cs', text: 'namespace SPIXI { public static class ZzKey { public const string K = "flagLockSecondClock"; } }\n' }, red: ['b6'] },
  /* b7 */
  { n: 'b7 a base line of LockPage changes', file: LOCK, from: 'Logging.error("LockPage: setAuthPending push failed: " + e);', to: 'Logging.error("LockPage: setAuthPending push failed");', red: ['b7'] },
  { n: 'b7 a comment INSIDE a lockb region is free (positive control)', file: APP, from: 'the SECOND-CLOCK TWIN of `unlockedDate`', to: 'the SECOND-CLOCK TWINS of `unlockedDate`', red: [] },
  { n: 'b7 a comment line of the BASE in App changes', file: APP, from: 'AUTH IS THE DEFINITIVE RELEASE.', to: 'AUTH IS THE DEFINITIVE RELEASE!', red: ['b7'] },
  { n: 'b7 SpixiFlags: a comment of the base part changes', file: FLAGS, from: 'namespace SPIXI', to: '// x\nnamespace SPIXI', red: ['b7'] },
  { n: 'b7 SpixiFlags: the absent value of a switch', file: FLAGS, from: 'c = Preferences.Default.Get(SecondClockKey, 1);', to: 'c = Preferences.Default.Get(SecondClockKey, 0);', red: ['b7'] },
  { n: 'b7 SpixiFlags: init() calls the switch', file: FLAGS, from: 'readPhoto1b();', to: 'readPhoto1b(); bool zz = LockbFlags.SecondClock;', red: ['b6', 'b7', 'b8'] },
  /* b8 */
  { n: 'b8 the clock rule reads TickCount64', file: CLOCK, from: 'return FailedRead;   // the platform', to: 'return System.Environment.TickCount64;   // the platform', red: ['b8'] },
  { n: 'b8 the shell rules gain a using', file: SHELL, from: 'namespace SPIXI', to: 'using Microsoft.Maui.Storage;\nnamespace SPIXI', red: ['b8'] },
  { n: 'b8 the Android arm flips', file: CLOCK, from: '#if ANDROID', to: '#if !ANDROID', red: ['b8'] },
  { n: 'b8 LockbFlags stores a preference', file: FLAGS, from: 'hold = S16PassRules.effectiveFlag(dev, h);', to: 'Preferences.Default.Set(HoldWhileDeferredKey, 1); hold = S16PassRules.effectiveFlag(dev, h);', red: ['b6', 'b7', 'b8'] },
  /* b9 */
  { n: 'b9 csh.csproj stops compiling the clock rule', file: CSPROJ, from: 'LockClockRules.cs" />', to: 'LockClockRules2.cs" />', red: ['b9'] },
  { n: 'b9 a test loses its [TestMethod]', file: SHELLT, from: '[TestMethod]', to: '', red: ['b9'] },
  { n: 'b9 a test is commented out (`// [TestMethod]`: still counted in the raw text, not in the masked one)', file: SHELLT, from: '[TestMethod]', to: '// [TestMethod]', red: ['b9'] },
];

const tmp = join(dirname(root), '.b-csharp-breaks-' + process.pid);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
for (const d of ['Spixi', 'src', 'scripts/csh']) {
  mkdirSync(dirname(join(tmp, d)), { recursive: true });
  try { execFileSync('cp', ['-al', join(root, d), join(tmp, d)]); } catch { execFileSync('cp', ['-a', join(root, d), join(tmp, d)]); }
}
const mod = await import(pathToFileURL(join(root, 'scripts/pins-lockb/b-csharp.mjs')).href);
const run = async () => {
  const rows = [];
  await mod.default({ ok: (c, m) => rows.push([!!c, String(m).match(/lockb (b\d+)/)[1]]), root: tmp, readdirSync, existsSync, join });
  return rows.filter(([c]) => !c).map(([, k]) => k).sort();
};
const put = (f, text) => { const p = join(tmp, f), t = p + '.new'; writeFileSync(t, text); renameSync(t, p); };
let bad = 0;
const report = (name, red, plan) => {
  const same = JSON.stringify(red) === JSON.stringify([...plan].sort());
  if (!same) bad++;
  console.log((same ? '  ok   ' : '  DIFF ') + name + ' → red: [' + red.join(' ') + ']' + (same ? '' : '   PLANNED [' + [...plan].sort().join(' ') + ']'));
};
report('(unmutated copy)', await run(), []);
let i = 0;
for (const m of M) {
  i++;
  if (only !== null && only !== i) continue;
  if (m.add) {
    put(m.add.file, m.add.text);
    report(m.n, await run(), m.red);
    rmSync(join(tmp, m.add.file));
    continue;
  }
  const orig = readFileSync(join(tmp, m.file), 'utf8');
  const at = orig.indexOf(m.from);
  if (at < 0) { console.log('  BAD  ' + m.n + ' — `from` not found'); bad++; continue; }
  put(m.file, orig.slice(0, at) + m.to + orig.slice(at + m.from.length));
  report(m.n, await run(), m.red);
  put(m.file, orig);
}
report('(restored copy)', await run(), []);
rmSync(tmp, { recursive: true, force: true });
console.log(bad ? 'BREAKS: ' + bad + ' row(s) differ from the plan' : 'BREAKS: every row as planned (' + M.length + ' mutations)');
process.exit(bad ? 1 : 0);
