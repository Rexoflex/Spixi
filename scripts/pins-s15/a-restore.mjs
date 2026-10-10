/* ==== S15 unit A — #1297 the restore is all or nothing, the wipe takes the restore's files, the backup packs the real avatar.
 *
 * The S14 walk (android-s14.txt 13:09:42): delete account → restore with the CORRECT password threw IO_FileExists on a root
 * avatar.jpg AFTER Acc and account.ixi had moved (a half restore); every retry then failed on account.ixi with the "free
 * space" alert. The moves themselves are EXECUTED in the C# harness (scripts/csh/S15RestoreTests.cs: leftover avatar, half
 * restore + retry, mid-failure rollback, wallet conflict, avatar path). This module pins the MAUI-bound call sites the
 * harness cannot reach (comment-stripped C#):
 *   wiring  — restoreAccountFile moves ONLY through RestoreMoves (the one File.Move left is the zip-slip rehome inside
 *             tmp_zip), the own-avatar target is Core's getOwnAvatarPath(false), a WalletConflict shows the existing
 *             "account already on this device" strings and returns FailedReported (no second, wrong alert);
 *   wipe    — wipeEverything deletes the root avatar.jpg, the staged envelope (+ .zip), tmp_zip, the park folder and the Acc
 *             root, each under its own try;
 *   backup  — the zip's avatar.jpg entry comes from getOwnAvatarPath(false), never the user-folder root.
 * Deliberate breaks (S15 A): a File.Move of account.ixi back in restoreAccountFile · the conflict branch without its alert ·
 * the avatar target back to the root · the wipe without the root avatar · the backup reading the root avatar — each fails its key.
 * ★ S15 #46 r1: (MINOR-1) the backup packs the real avatar as "own_avatar.jpg" (RestoreMoves.OwnAvatarEntry) and the plan
 * reads ONLY that entry; (R3 M1) the exact `!= Done` guard ends in `return RestoreOutcome.Failed;` before the prefs;
 * (R3 MINOR-7) the Acc-root delete is pinned as its whole guarded statement; (R2 m-2) a successful create pushes the
 * existing wipeLocalState before its navigation. Breaks (S15 #46 r1): the plan back on "avatar.jpg" · the backup entry back
 * on "avatar.jpg" · the guard narrowed to `== WalletConflict` · the Failed return dropped · the Acc delete unguarded · the
 * create push removed — each fails its key. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const LP = rd('Spixi/Pages/Launch/LaunchPage.xaml.cs');
  const SP = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const BP = rd('Spixi/Pages/Settings/BackupPage.xaml.cs');
  const RM = rd('Spixi/Utils/RestoreMoves.cs');
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const restore = body(LP, 'private RestoreOutcome restoreAccountFile(string source_path, string pass)');
  const wipe = body(SP, 'private void wipeEverything()');
  const backup = body(BP, 'public static async Task backupAccount()');
  const conflictAt = restore.indexOf('if (moveResult == RestoreMoves.Result.WalletConflict)');
  const conflict = conflictAt >= 0 ? body(restore.slice(conflictAt), 'if (moveResult == RestoreMoves.Result.WalletConflict)') : '';
  const w = {
    found: restore.length > 0 && wipe.length > 0 && backup.length > 0,
    onlyRehomeMove: (restore.match(/File\.Move\(/g) || []).length === 1 && /File\.Move\(strayFile, rehomed\);/.test(restore)
      && !/Directory\.Move\(/.test(restore),
    planned: /RestoreMoves\.plan\(tmpDirectory, Config\.spixiUserFolder,\s*IxianHandler\.localStorage\.getOwnAvatarPath\(false\), Config\.walletFile\)/.test(restore)
      && /RestoreMoves\.apply\(moves, Path\.Combine\(Config\.spixiUserFolder, RestoreStashFolder\), out string\? moveFail\)/.test(restore),
    movesBeforePrefs: (() => {   // ★ S15 #46 r1 (R3 M1): the exact guard, ending in the Failed return, before the prefs
      const g = 'if (moveResult != RestoreMoves.Result.Done)';
      const gi = restore.indexOf(g), pi = restore.indexOf('applyRestorePrefs(pass);');
      const gb = gi >= 0 ? body(restore.slice(gi), g) : '';
      return gi > restore.indexOf('var moveResult = RestoreMoves.apply(') && restore.indexOf('var moveResult = RestoreMoves.apply(') >= 0
        && pi > gi && gi + gb.length < pi && /return RestoreOutcome\.Failed;\s*\}$/.test(gb);
    })(),
    conflictAlert: /_SL\("intro-restore-walletexists-title"\)/.test(conflict) && /_SL\("intro-restore-walletexists-text"\)/.test(conflict)
      && /removeLoadingOverlay/.test(conflict) && /return RestoreOutcome\.FailedReported;/.test(conflict) && !/free space/i.test(conflict),
    incompleteLog: /moveFail\.StartsWith\(RestoreMoves\.RollbackIncomplete, StringComparison\.Ordinal\)/.test(restore) && /the rollback is INCOMPLETE/.test(restore),   // ★ #46 r2 M-1: never "rolled back" when it was not
    planAvatar: /src = Path\.Combine\(tmpDir, OwnAvatarEntry\), dst = ownAvatarDest/.test(RM)
      && /public const string OwnAvatarEntry = "own_avatar\.jpg";/.test(RM) && !/"avatar\.jpg"/.test(RM)
      && /dst = Path\.Combine\(userFolder, walletFileName\), required = true, neverClear = true/.test(RM),
  };
  ok(Object.values(w).every(Boolean),
    '★ S15 A (#1297): restoreAccountFile moves ONLY through RestoreMoves (plan → apply, all or nothing; the one File.Move left is the zip-slip rehome), the own avatar goes to getOwnAvatarPath(false), the moves run before any preference changes, and a wallet already in place shows "Account already on this device" and touches nothing — never "free space" — ' + JSON.stringify(w));
  const tryLine = (re) => wipe.split('\n').some((l) => /try \{/.test(l) && re.test(l));
  const x = {
    rootAvatar: /new\[\] \{ "avatar\.jpg", Config\.walletFile \+ "\.tmp", Config\.walletFile \+ "\.tmp\.zip" \}/.test(wipe)
      && tryLine(/File\.Delete\(sp\)/),
    scratch: /new\[\] \{ "tmp_zip", LaunchPage\.RestoreStashFolder \}/.test(wipe) && tryLine(/Directory\.Delete\(sd, true\)/),
    // ★ S15 #46 r1 (R3 MINOR-7): the whole guarded statement, not tokens
    accRoot: /try \{ string accRoot = Path\.Combine\(Config\.spixiUserFolder, "Acc"\); if \(Directory\.Exists\(accRoot\)\) \{ Directory\.Delete\(accRoot, true\); \} \} catch \(Exception ex\) \{ Logging\.error\("wipe: Acc root threw: " \+ ex\.GetType\(\)\.Name\); \}/.test(wipe),
    afterShutdown: wipe.indexOf('IxianHandler.shutdown()') >= 0 && wipe.indexOf('"avatar.jpg"') > wipe.indexOf('IxianHandler.shutdown()'),
    typeOnlyLogs: !/Logging\.error\("wipe: restore (leftover|scratch) threw: " \+ ex\)/.test(wipe),
  };
  ok(Object.values(x).every(Boolean),
    '★ S15 A (#1297): the account wipe takes every file the restore writes outside Core\'s folders — the root avatar.jpg (the S14 half-restore cause), the staged envelope + its .zip, tmp_zip, the park folder, the Acc root — each under its own try, after the shutdown, type-only logs — ' + JSON.stringify(x));
  const b = {
    real: /string ownAvatar = IxianHandler\.localStorage\.getOwnAvatarPath\(false\);\s*if \(File\.Exists\(ownAvatar\)\)\s*\{\s*archive\.CreateEntryFromFile\(ownAvatar, RestoreMoves\.OwnAvatarEntry\);/.test(backup),
    noRoot: !/Path\.Combine\(Config\.spixiUserFolder, "avatar\.jpg"\)/.test(backup),
    noLegacyEntry: !/"avatar\.jpg"/.test(backup),   // ★ S15 #46 r1 (MINOR-1): the legacy entry name is never written
  };
  ok(Object.values(b).every(Boolean),
    '★ S15 A (#1297, Damir 2026-10-10; #46 r1 MINOR-1): the backup packs the REAL own avatar (getOwnAvatarPath(false)) under the NEW entry own_avatar.jpg — the only one the restore reads — never the user-folder root and never the legacy avatar.jpg entry name — ' + JSON.stringify(b));

  /* ★ S15 O-04 (#1293): a launch with NO wallet file starts from a clean WebView store. C# side: LaunchPage.onLoad pushes
     the existing wipeLocalState only when the wallet file is absent (never on the retry view / LockPage "change" path).
     Shell side, EXECUTED on the BUILT intro.html: the push removes every spixi.* key + the QR cache and nothing else.
     Breaks (S15 O-04): the push unguarded · the handler removed from launch.html · the sweep widened to every key. */
  const onLoad = body(LP, 'private void onLoad()');
  const o4 = {
    guarded: /if \(!File\.Exists\(Path\.Combine\(Config\.spixiUserFolder, Config\.walletFile\)\)\)\s*\{\s*Utils\.sendUiCommand\(this, "wipeLocalState"\);\s*\}/.test(onLoad),
    // ★ S15 #46 r1 (R2 m-2): exactly two pushes — onLoad's guarded one and the successful create's, first in its block
    twice: (LP.match(/"wipeLocalState"/g) || []).length === 2,
    create: /if \(Node\.generateWallet\(pass\)\)\s*\{\s*Utils\.sendUiCommand\(this, "wipeLocalState"\);/.test(body(LP, 'public void onCreateAccount(string nick, string pass)')),
  };
  let s4 = null;
  try {
    s4 = await b2Kit(h).boot('intro.html');
    const W = s4.dom.window;
    // jsdom gives a file:// page an opaque origin (no localStorage): a Map-backed Storage stands in, defined on the window
    const m = new Map();
    const fake = { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: (k) => { m.delete(k); }, clear: () => m.clear() };
    Object.defineProperty(W, 'localStorage', { configurable: true, get: () => fake });
    W.localStorage.setItem('spixi.draft.abc', 'x'); W.localStorage.setItem('spixi.appearance', '1');
    W.localStorage.setItem('HTML5_QRCODE_DATA', 'q'); W.localStorage.setItem('other.key', 'keep');
    W.executeUiCommand(W.wipeLocalState);
    const left = []; for (let i = 0; i < W.localStorage.length; i++) left.push(W.localStorage.key(i));
    o4.swept = JSON.stringify(left.sort()) === '["other.key"]';
    o4.noErr = s4.errs.length === 0;
  } catch (e) { o4.threw = e.message; } finally { if (s4) { try { s4.dom.window.close(); } catch (_) {} } }
  ok(o4.guarded && o4.twice && o4.create && o4.swept === true && o4.noErr === true,
    '★ S15 O-04 (#1293; #46 r1 R2 m-2): a launch with no wallet file clears the shared WebView store — LaunchPage.onLoad pushes the existing wipeLocalState only when the wallet file is absent, a successful create pushes it too (a new wallet has no live store), and the BUILT intro.html removes every spixi.* key + the QR cache and keeps everything else — ' + JSON.stringify(o4));
}
