/* ==== S20H X-1 + X-2 — the C# text keys and the iOS purpose strings (Drop A) ====
 *   (1) X-1 (Mission Control m009): EVERY `_SL("<literal>")` in Spixi/**\/*.cs (comment-stripped) names a key that exists in
 *       Spixi/Resources/Raw/lang/en-us.txt. A key C# adds at run time with addCustomString is allowed only when it is named in
 *       RUNTIME_KEYS below AND the code really adds it. An unknown key made the lock screen's wrong-password alert blank
 *       (LockPage.doUnlock, legacy since the fork point: _SL returns null → no title, no text).
 *   (2) X-1: LockPage.doUnlock's failure branch asks for intro-retry-invalidpassword-title / -text (the same case LaunchPage
 *       uses) and both exist in ALL 14 lang files, non-empty; it does NOT use global-lock-invalidpassword-* (that is the
 *       failed-fingerprint alert, LockPage's own other case).
 *   (3) X-2: the iOS Info.plist declares NO NSLocation* purpose string (Spixi never uses location; the old text named push
 *       as the reason, which is false — App Review 5.1.1). The Mac plist has none either. If the office binary check finds
 *       CoreLocation symbols, the keys come back with an honest text and THIS clause changes with that decision.
 * Deliberate breaks (S20H report): ① LockPage back to intro-restore-file-invalidpassword-title → (1) fails naming that key
 *   and (2) fails; ② NSLocationWhenInUseUsageDescription put back in the iOS plist → (3) fails naming it. */
const RUNTIME_KEYS = ['LockAuthPending', 'SpixiThemeName', 'LaunchBootView', 'devMode', 'miniAppsStartNoteHidden', 'AndroidInsetLeft', 'AndroidInsetTop', 'AndroidInsetRight', 'AndroidInsetBottom', 'apps-not-sure-text', 'Platform', 'hourCycle'];
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const langDir = join(root, 'Spixi/Resources/Raw/lang');
  const keysOf = (file) => {
    const m = new Map();
    for (const line of readFileSync(join(langDir, file), 'utf8').replace(/^﻿/, '').split('\n')) {
      const x = /^\s*([^=#\s][^=]*?)\s*=\s*(.*)$/.exec(line);
      if (x) m.set(x[1].trim(), x[2].trim());
    }
    return m;
  };
  const en = keysOf('en-us.txt');
  const csFiles = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) { if (!/^(bin|obj)$/.test(e.name)) walk(rel); }
      else if (e.name.endsWith('.cs')) csFiles.push(rel);
    }
  };
  walk('Spixi');
  const added = new Set();
  const missing = [];
  const gaps = [];
  const locales = readdirSync(langDir).filter((x) => x.endsWith('.txt')).map((x) => [x, keysOf(x)]);
  let calls = 0;
  for (const f of csFiles) {
    const raw = readFileSync(join(root, f), 'utf8');
    for (const m of raw.matchAll(/addCustomString\(\s*"([^"]+)"/g)) added.add(m[1]);
    const code = stripCode(raw);
    /* #46 r1 (MINOR-2): every string literal INSIDE the _SL( … ) argument (a ternary's two keys too), and a call with no
       `??` fallback after it must find its key in EVERY lang file (there is no en-us fallback in SpixiLocalization). */
    for (const m of code.matchAll(/_SL\(/g)) {
      let i = m.index + 4, dep = 1;
      while (i < code.length && dep) { const c = code[i]; if (c === '(') dep++; else if (c === ')') dep--; else if (c === '"') { i++; while (i < code.length && code[i] !== '"') { if (code[i] === '\\') i++; i++; } } i++; }
      const arg = code.slice(m.index + 4, i - 1);
      const fallback = /^\s*\?\?/.test(code.slice(i, i + 8));
      for (const lit of arg.matchAll(/"([^"\\]+)"/g)) {
        const k = lit[1];
        if (!/^[A-Za-z][\w-]*$/.test(k)) continue;   // a key, not a sentence
        calls++;
        if (RUNTIME_KEYS.includes(k) && added.has(k)) continue;
        if (!en.has(k)) { missing.push(k + ' @ ' + f); continue; }
        if (!fallback) for (const [lf, km] of locales) if (!km.has(k)) gaps.push(k + ' @ ' + f + ' ∉ ' + lf);
      }
    }
  }
  ok(calls > 300 && missing.length === 0 && gaps.length === 0,
    `★ S20H X-1 (m009): every key literal inside _SL( … ) in Spixi/**/*.cs (ternary branches too) is in en-us.txt (or a named addCustomString key), and a call with no ?? fallback finds its key in EVERY lang file — an unknown key renders as null (the blank lock alert) — ${JSON.stringify({ files: csFiles.length, calls, missing, gaps: gaps.slice(0, 6), gapN: gaps.length })}`);

  const lock = stripCode(readFileSync(join(root, 'Spixi/Pages/Launch/LockPage.xaml.cs'), 'utf8'));
  const du = lock.indexOf('void doUnlock(');
  const branch = du < 0 ? '' : lock.slice(du, lock.indexOf('else', lock.indexOf('verifyWallet', du)));
  const alertKeys = [...branch.matchAll(/_SL\("([^"]+)"\)/g)].map((m) => m[1]);
  const files = readdirSync(langDir).filter((f) => f.endsWith('.txt'));
  const absent = [];
  for (const f of files) { const k = keysOf(f); for (const key of ['intro-retry-invalidpassword-title', 'intro-retry-invalidpassword-text']) if (!k.get(key)) absent.push(f + ':' + key); }
  ok(alertKeys[0] === 'intro-retry-invalidpassword-title' && alertKeys[1] === 'intro-retry-invalidpassword-text' && !alertKeys.some((k) => /global-lock-invalidpassword/.test(k)) && files.length >= 14 && absent.length === 0,
    `★ S20H X-1: the lock screen's wrong-password alert asks for intro-retry-invalidpassword-title / -text (LaunchPage's case), present and non-empty in all 14 lang files; not the fingerprint alert's keys — ${JSON.stringify({ alertKeys, files: files.length, absent })}`);

  const plist = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8').replace(/<!--[\s\S]*?-->/g, '') : null);
  const ios = plist('Spixi/Platforms/iOS/Info.plist');
  const mac = plist('Spixi/Platforms/MacCatalyst/Info.plist');
  const locKeys = (s) => (s ? [...s.matchAll(/<key>\s*(NSLocation\w*)\s*<\/key>/g)].map((m) => m[1]) : ['(file missing)']);
  ok(!!ios && locKeys(ios).length === 0 && locKeys(mac).length === 0 && /NSCameraUsageDescription/.test(ios),
    `★ S20H X-2: no NSLocation* purpose string in the iOS (or Mac) Info.plist — Spixi uses no location, and the old "push notifications" reason was false (App Review 5.1.1); the camera key is still there — ${JSON.stringify({ ios: locKeys(ios), mac: locKeys(mac) })}`);
}
