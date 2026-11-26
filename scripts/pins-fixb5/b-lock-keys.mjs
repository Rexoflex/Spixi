/* ==== fixb5 · B2 — every `*SL{key}` token of the lock page is a key that C# resolves on the lock page (the log line "Unknown localization key; …") ====
 *
 * LIMITS — read first. This is a SOURCE / TEXT pin (DECISIONS 1735): it reads files and models; it executes no C# and no WebView.
 *   · The tokens are read from the lock page (src/shells/lock.html and the BUILT Spixi/Resources/Raw/html/lock.html) the way
 *     SpixiLocalization.localizeHtml reads them (a copy of its loop: per trimmed line, the first `*SL{`, the key up to the first `}`, comments
 *     NOT skipped). That the C# loop still reads them that way is checked by the source text of its two loops (the `Unknown localization key` sites), not run.
 *   · "C# resolves the key on the lock page" is modelled by SOURCE: (1) the keys SEEDED in SpixiLocalization.customStrings, (2) the keys registered
 *     with addCustomString in LockPage.xaml.cs and ThemeManager.cs (the lock page's own carrier and the theme carrier), (3) the keys that EVERY locale
 *     file of Spixi/Resources/Raw/lang holds. Other code that registers a key at run time is not seen (such a key would be flagged: add it here
 *     on purpose); the ORDER of the registrations (the theme carrier before the lock page loads) and the values are NOT proven.
 *   · It does not prove the dictionary at run time; only that a token cannot name a key that no source supplies (the "…" of an example in a comment).
 *
 * KEYS (one `ok` each):
 *   fixb5 k1 the model finds the tokens (≥ the 9 known carriers in the built page) and the key sources are not empty (the regexes did not go blind)
 *   fixb5 k2 every `*SL{key}` of the BUILT lock.html is a seeded / registered / locale key
 *   fixb5 k3 the same for the SOURCE src/shells/lock.html
 *   fixb5 k4 the two localizeHtml loops of SpixiLocalization.cs still read `*SL{` per line, key up to the first `}`, comments included (the model above is a copy of them)
 * DELIBERATE BREAK (#802) — in a COPY of the tree: put the old words back into the comment of src/shells/lock.html (and the built lock.html):
 *   "written as live localization tokens on purpose" → "written as live `*SL{…}` tokens on purpose" → k2 and k3 red (key "…")
 */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join } = h;
  const read = (p) => readFileSync(join(root, p), 'utf8');

  /* a copy of localizeHtml's loop, with the value replaced by a marker that holds no `*SL{`: the keys it would look up, in order */
  function tokenKeys(text) {
    const keys = [];
    for (const raw of text.split('\n')) {
      let line = raw.trim();
      if (line === '') continue;
      let guard = 0;
      while (line.includes('*SL{') && guard++ < 1000) {
        const rest = line.slice(line.indexOf('*SL{') + 4);
        const end = rest.indexOf('}');
        if (end < 0) { keys.push('<unterminated: ' + rest.slice(0, 20) + '>'); break; }
        const key = rest.slice(0, end);
        keys.push(key);
        line = line.split('*SL{' + key + '}').join('');
      }
    }
    return keys;
  }

  const loc = read('Spixi/Lang/SpixiLocalization.cs');
  const seedStart = loc.indexOf('customStrings = new Dictionary<string, string>()');
  const seedBody = loc.slice(seedStart, loc.indexOf('};', seedStart));
  const seeded = [...seedBody.replace(/\/\/[^\n]*/g, '').matchAll(/\{\s*"([A-Za-z0-9_-]+)"\s*,/g)].map((m) => m[1]);
  const registered = ['Spixi/Pages/Launch/LockPage.xaml.cs', 'Spixi/Utils/ThemeManager.cs']
    .flatMap((f) => [...read(f).replace(/\/\/[^\n]*/g, '').matchAll(/addCustomString\(\s*"([A-Za-z0-9_-]+)"/g)].map((m) => m[1]));
  const langDir = 'Spixi/Resources/Raw/lang';
  const langFiles = readdirSync(join(root, langDir)).filter((f) => f.endsWith('.txt'));
  const langKeyLists = langFiles.map((f) => new Set(read(langDir + '/' + f).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith(';') && l.includes('=')).map((l) => l.slice(0, l.indexOf('=')).trim())));
  const inEveryLocale = (k) => langKeyLists.length > 0 && langKeyLists.every((s) => s.has(k));
  const resolves = (k) => seeded.includes(k) || registered.includes(k) || inEveryLocale(k);

  const built = tokenKeys(read('Spixi/Resources/Raw/html/lock.html'));
  const source = tokenKeys(read('src/shells/lock.html'));
  const known = ['LockAuthPending', 'SpixiThemeName', 'SpixiPlatform', 'SpixiP1', 'AndroidInsetTop', 'AndroidInsetBottom', 'AndroidInsetLeft', 'AndroidInsetRight', 'language-code'];

  ok(known.every((k) => built.includes(k)) && seeded.includes('AndroidInsetTop') && seeded.includes('SpixiPlatform') && registered.includes('LockAuthPending')
     && registered.includes('SpixiThemeName') && langFiles.length >= 14 && inEveryLocale('language-code'),
    'fixb5 k1 the model is not blind: the built page holds the known carriers (' + known.filter((k) => !built.includes(k)).join(',') + ' missing), seeded=' + seeded.length + ' registered=' + registered.length + ' locales=' + langFiles.length);
  const bad = (keys) => [...new Set(keys.filter((k) => !resolves(k)))];
  ok(bad(built).length === 0, 'fixb5 k2 every *SL{key} of the BUILT lock.html is a key C# resolves on the lock page (seeded, registered by the lock page / theme, or a key of every locale) — unknown: ' + JSON.stringify(bad(built)));
  ok(bad(source).length === 0, 'fixb5 k3 the same for src/shells/lock.html — unknown: ' + JSON.stringify(bad(source)));
  const sites = loc.split('while (line.Contains("*SL{"))').length - 1;
  ok(sites === 2 && (loc.match(/string key = line\.Substring\(line\.IndexOf\("\*SL\{"\) \+ 4\);\s*key = key\.Substring\(0, key\.IndexOf\("\}"\)\);/g) || []).length === 2 && (loc.match(/Logging\.error\("Unknown localization key; " \+ key\);/g) || []).length === 2,
    'fixb5 k4 the two localizeHtml loops of SpixiLocalization.cs still read `*SL{` per line with the key up to the first `}` (' + sites + ' loops) — the model above is a copy of them');
}
