/* ==== S15 agent A — the native security rows (#1293): O-06 · O-19 · O-29 · O-30 (O-04 STOPPED: the launch shell has no
 * wipeLocalState handler — see the S15 report).
 *
 * The pure rules are EXECUTED in the C# harness (scripts/csh/S15SecTests.cs over Spixi/Utils/S15SecRules.cs: the ~60 s
 * window and its negative-age guard, the idle read failing CLOSED, the unchecked tick wrap, the dev-mode gate). This
 * module pins the MAUI / WinUI-bound call sites the harness cannot reach (comment-stripped C#):
 *   O-29 — App.xaml.cs: the consume AND the peek ask S15SecRules.ownIntentWithinWindow; no minute literal is left;
 *   O-30 — SDesktopIdle.idleFor: a false GetLastInputInfo and a throw both give S15SecRules.IdleUnknown (never Zero), the
 *          success path goes through idleFromTicks; the docblock says "fails CLOSED for the lock";
 *   O-19 — DevPage.onSendLog: the dev-mode gate (the "devMode" preference HomePage's enableDevMode verb writes) runs
 *          BEFORE the first file op; Windows calls the app's one save helper (SFileOperations.saveAs → FileSaver) and
 *          never names Downloads; mobile keeps the share sheet;
 *   O-06 — a WALK over every FriendList.removeFriend( call in Spixi/**.cs: each is followed, on its success path, by
 *          SNotificationPrefs.forgetContact on the same record; forgetContact removes the key through setContactMuted's
 *          Remove branch; a history delete (SPeerLocalStores.forget, removeHistory) does NOT unmute.
 * Deliberate breaks (S15 A): window back to `TotalMinutes < 5` in the peek · idleFor's false branch back to
 * `return TimeSpan.Zero;` · the dev-mode gate moved after File.Copy · the Windows leg back to a Downloads copy · one
 * forgetContact line removed (HomePage decline) · forgetContact added to SPeerLocalStores.forget — each fails its key.
 * ★ S15 #46 r1 (fixer Z) adds: the age direction (O-29) · the loop's one-lock-per-unknown-streak decision (O-30, MINOR-3)
 * · the Android viewer's early release of the decode (NIT-4). Breaks: `ownIntentStamp - DateTime.Now` in the peek · the
 * loop back to `idle >= window` · the identity guard dropped — each fails its key. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };

  /* ── O-29 ── */
  const APP = rd('Spixi/App.xaml.cs');
  const RULES = rd('Spixi/Utils/S15SecRules.cs');
  const consume = body(APP, 'private static bool consumeOwnIntentSuppression()');
  const peek = body(APP, 'private static bool ownIntentFresh()');
  const win = Number((RULES.match(/public const int OwnIntentWindowSeconds = (\d+);/) || [])[1]);
  const o29 = {
    found: consume.length > 0 && peek.length > 0,
    consume: /ownIntentStamp = DateTime\.MinValue;\s*return S15SecRules\.ownIntentWithinWindow\(age\);/.test(consume),
    peek: /return S15SecRules\.ownIntentWithinWindow\(age\);/.test(peek) && !/ownIntentStamp = /.test(peek),
    noMinutes: !/TotalMinutes/.test(consume + peek),
    window: win >= 30 && win <= 90,
    rule: /return age\.TotalSeconds >= 0 && age\.TotalSeconds < OwnIntentWindowSeconds;/.test(RULES),
    /* ★ S15 #46 r1 NIT B-a: the age DIRECTION (now − stamp). Reversed, every age is negative and the round trip of the
       app's own picker relocks — the harness executes the rule, not this subtraction, so it is pinned here, in both. */
    ageDirection: [consume, peek].every((b) => /TimeSpan age = DateTime\.Now - ownIntentStamp;/.test(b) && !/ownIntentStamp - DateTime/.test(b)),
  };
  ok(Object.values(o29).every(Boolean),
    '★ S15 O-29 (#1293): the own-intent lock suppression is ONE named window of ~60 s (was 5 min) — the resume consume and the pause peek both ask S15SecRules.ownIntentWithinWindow (negative age never suppresses; executed in S15SecTests), and the peek still does not consume — ' + JSON.stringify(o29));

  /* ── O-30 ── */
  const IDLE_RAW = raw('Spixi/Platforms/Windows/SDesktopIdle.cs');
  const IDLE = stripCode(IDLE_RAW);
  const idleFor = body(IDLE, 'public static TimeSpan idleFor()');
  const loopB = body(IDLE, 'private static async Task loop()');
  const docAt = IDLE_RAW.indexOf('public static TimeSpan idleFor()');
  const doc = IDLE_RAW.slice(Math.max(0, docAt - 700), docAt).replace(/\s*\/\/\/\s*/g, ' ').replace(/\s+/g, ' ');
  const o30 = {
    found: idleFor.length > 0,
    noZero: !/TimeSpan\.Zero/.test(idleFor),
    read: /bool read = GetLastInputInfo\(ref info\);/.test(idleFor)
      && /return SPIXI\.S15SecRules\.idleFromTicks\(read, now, info\.dwTime\);/.test(idleFor),
    catchClosed: /catch \(Exception\)\s*\{\s*return SPIXI\.S15SecRules\.IdleUnknown;\s*\}/.test(idleFor),
    unknownIsMax: /public static readonly TimeSpan IdleUnknown = TimeSpan\.MaxValue;/.test(RULES)
      && /if \(!callSucceeded\)\s*\{\s*return IdleUnknown;\s*\}/.test(RULES),
    docClosed: /fails CLOSED for the lock/.test(doc) && !/fails SAFE: no idle, no lock/.test(doc),
    /* ★ S15 #46 r1 MINOR-3: the loop decides through S15SecRules.idleLockDue (one lock per unknown streak — executed in
       S15SecTests) with the real inputs and the watcher's one state field; no second idle comparison is left in the loop,
       and the lock dispatch sits behind the decision. */
    lockLeg: /if \(!SPIXI\.S15SecRules\.idleLockDue\(idle, gap, window,\s*app != null && app\.isLockEnabled\(\), app != null && app\.isAppLockActive, ref unknownSpent\)\)\s*\{\s*continue;\s*\}/.test(loopB)
      && !/idle >=|>= window|unknownSpent =/.test(loopB) && loopB.indexOf('idleLockDue(') < loopB.indexOf('lockOnIdle()')
      && /private static bool unknownSpent = false;/.test(IDLE),
    streakRule: /bool untouched = unknown \? !unknownSpent : idle >= window;/.test(RULES)
      && /bool due = lockEnabled && !lockActive && \(slept \|\| untouched\);/.test(RULES),
  };
  ok(Object.values(o30).every(Boolean),
    '★ S15 O-30 (#1293): SDesktopIdle.idleFor FAILS CLOSED for the lock — a false GetLastInputInfo and a throw both return S15SecRules.IdleUnknown (TimeSpan.MaxValue, which satisfies every clamped window, so `idle >= window` may lock), never the old fail-OPEN Zero; the docblock says so; and (#46 r1 MINOR-3) an unknown idle locks ONCE per unknown streak, not on every poll — the loop asks S15SecRules.idleLockDue — ' + JSON.stringify(o30));

  /* ── #46 r1 NIT-4 (S15 F's derive, Android) ── the full decode is released before `derive` runs, never when
     CreateBitmap answered the same bitmap (an identity matrix on an immutable source returns the SOURCE). */
  const THUMB = rd('Spixi/Platforms/Android/SThumbnail.cs');
  const viewer = body(THUMB, 'public static byte[]? makeViewerJpeg(string path, int maxEdge, Action<Func<int, byte[]?>>? derive)');
  const rel = viewer.indexOf('decoded.Recycle();');
  const n4 = {
    notUsing: /Bitmap\? decoded = BitmapFactory\.DecodeFile\(path, new BitmapFactory\.Options \{ InSampleSize = sample \}\);\s*try\s*\{/.test(viewer) && !/using Bitmap\? decoded/.test(viewer),
    guarded: /if \(!ReferenceEquals\(oriented, decoded\) && !oriented\.Equals\(decoded\)\)\s*\{\s*decoded\.Recycle\(\);\s*decoded\.Dispose\(\);\s*decoded = null;\s*\}/.test(viewer),
    order: rel > viewer.indexOf('oriented.Compress(') && rel < viewer.indexOf('derive((edge)'),
    finallyDisposes: /finally\s*\{\s*decoded\?\.Dispose\(\);\s*\}\s*\}\s*catch \(Exception\)\s*\{\s*return null;\s*\}\s*\}$/.test(viewer),
  };
  ok(Object.values(n4).every(Boolean),
    '★ S15 #46 r1 NIT-4: Android makeViewerJpeg releases the full decoded bitmap (Recycle + Dispose) after `oriented` is encoded and BEFORE `derive` scales from it, guarded by identity (CreateBitmap may answer the source itself, then it stays alive); a finally disposes it on every other path — ' + JSON.stringify(n4));

  /* ── O-19 ── */
  const DEV = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const HOME = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const send = body(DEV, 'private async void onSendLog()');
  const gateAt = send.indexOf('S15SecRules.devLogExportAllowed(Preferences.Default.Get("devMode", false))');
  const winLeg = (send.match(/#if WINDOWS([\s\S]*?)#else/) || [])[1] || '';
  const mobLeg = (send.match(/#else([\s\S]*?)#endif/) || [])[1] || '';
  const o19 = {
    gate: gateAt > 0 && /if \(!S15SecRules\.devLogExportAllowed\(Preferences\.Default\.Get\("devMode", false\)\)\)\s*\{\s*Logging\.warn\("DevPage: sendlog refused, dev mode is off"\);\s*return;\s*\}/.test(send),
    gateFirst: gateAt > 0 && gateAt < send.indexOf('File.Copy(') && gateAt < send.indexOf('Path.Combine('),
    sourceOfTruth: /current_url\.StartsWith\("ixian:enableDevMode", StringComparison\.Ordinal\)\)\s*\{\s*Preferences\.Default\.Set\("devMode", true\);/.test(HOME),
    saveDialog: /await Spixi\.SFileOperations\.saveAs\(shareLogPath\);/.test(winLeg),
    noDownloads: !/Downloads|SpecialFolder|File\.Copy\(/.test(winLeg),
    share: /Share\.RequestAsync\(new ShareFileRequest/.test(mobLeg),
    helper: /FileSaver\.Default\.SaveAsync\(fileName, fileStream, CancellationToken\.None\)/.test(rd('Spixi/Platforms/Windows/SFileOperations.cs')),
  };
  ok(Object.values(o19).every(Boolean),
    '★ S15 O-19 (#1293): DevPage.onSendLog refuses unless dev mode is on (C#\'s own record of the ten-tap gate, the "devMode" preference ixian:enableDevMode writes), before any file op; Windows asks for the destination in the FileSaver "Save as" dialog (SFileOperations.saveAs, the app\'s one save helper) and never writes into Downloads; Android/iOS keep the share sheet — ' + JSON.stringify(o19));

  /* ── O-06 ── */
  const csFiles = [];
  const walk = (d) => {
    for (const e of readdirSync(join(root, d), { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); }
      else if (e.name.endsWith('.cs')) csFiles.push(p);
    }
  };
  walk('Spixi');
  const sites = [];
  for (const f of csFiles) {
    const t = rd(f); let i = -1;
    while ((i = t.indexOf('FriendList.removeFriend(', i + 1)) >= 0) {
      const v = (t.slice(i).match(/^FriendList\.removeFriend\((\w+)\)/) || [])[1];
      const after = t.slice(i, i + 1600);
      const re = new RegExp('SNotificationPrefs\\.forgetContact\\(' + v + '\\.walletAddress\\??\\.ToString\\(\\)\\);');
      sites.push(f.split('/').pop() + ':' + v + ':' + re.test(after));
    }
  }
  const NP = rd('Spixi/Meta/SNotificationPrefs.cs');
  const PLS = rd('Spixi/Meta/SPeerLocalStores.cs');
  const SC = rd('Spixi/Utils/SContacts.cs');
  const o06 = {
    sites: sites.length === 7 && sites.every((s) => s.endsWith(':true')),
    helper: /public static void forgetContact\(string\? address\)\s*\{\s*setContactMuted\(address, false\);\s*\}/.test(NP),
    removes: /else\s*\{\s*Preferences\.Default\.Remove\(muteKey\(address\)\);\s*\}/.test(body(NP, 'public static void setContactMuted(string? address, bool muted)')),
    historyKeepsMute: !/forgetContact/.test(PLS) && !/forgetContact/.test(body(SC, 'public static bool removeHistory(Friend friend)')),
  };
  ok(Object.values(o06).every(Boolean),
    '★ S15 O-06 (#1293): the per-contact mute key (a peer wallet address in a native preference name) leaves with the contact — a WALK over every FriendList.removeFriend( in Spixi/**.cs finds SNotificationPrefs.forgetContact on the same record after each one (remove · leave group · both re-add heals · both declines · dev unseed); forgetContact removes through setContactMuted\'s Remove branch; a history delete keeps the mute — ' + JSON.stringify(o06) + ' ' + sites.join(' | '));
}
