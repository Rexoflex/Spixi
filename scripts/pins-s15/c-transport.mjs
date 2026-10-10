/* ==== S15 unit B — O-11 (#1293): C#→JS arguments are base64 again, every one, for every page.
 *
 * #340 let Utils.sendUiCommand emit a "data:…;base64,…" argument RAW inside the single-quoted JS literal it builds, behind
 * two gates (the receiver: SpixiContentPage.supportsRawDataUriArgs; the value: the isTransportSafeDataUri whitelist). No
 * exposure was found, but the baseline encoded every argument, so the fast path is removed with both gates (Damir, #1293).
 * native.js keeps its leading-"data:" passthrough: no C# argument can reach it any more (pinned here, both halves).
 *   wire     — comment-stripped Utils.cs: sendUiCommand appends every non-null argument as '<escapeHtmlParameter(arg)>' and
 *              nothing else; the fast path's names are gone from every C# file under Spixi/ (stripped); escapeHtmlParameter
 *              is still Convert.ToBase64String(UTF-8).
 *   reach    — sendUiCommand is the ONLY composer of `executeUiCommand(` in Spixi/ C# (stripped). ★ S15 #46 r1 MINOR-8:
 *              that a base64 value never starts with "data:" and never carries a quote, a backslash, a newline or a
 *              backtick is a STATED FACT of the base64 alphabet (checked with Node's encoder standing in for
 *              Convert.ToBase64String) — it executes no Spixi code; the C# half is the `wire` pin above.
 *   receive  — EXECUTED through src/bridge/native.js's real dispatcher: what C# now sends (each value base64'd the way
 *              escapeHtmlParameter does) arrives as the exact original string — a data: URI, a quote-and-newline value, a
 *              nickname that begins with "data:", non-ASCII — and null still arrives as ''.
 * Size cost (stated, #1293): a data: URI argument is base64'd a second time again — 4/3 of its length (a 240 KB app icon
 * travels as 320 KB) plus one atob in the shell; every other argument is unchanged (it was always encoded).
 * Deliberate breaks (S15 B): the raw ternary restored in sendUiCommand · supportsRawDataUriArgs restored in SpixiContentPage ·
 * a second executeUiCommand composer in a page · native.js's b64ToUtf8 returning its input undecoded — each fails its key. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const U = rd('Spixi/Utils/Utils.cs');
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const send = body(U, 'public static void sendUiCommand(SpixiContentPage contentPage, string command, params string[] arguments)');

  const csFiles = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = rel + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'obj' && e.name !== 'bin') walk(p); continue; }
      if (e.name.endsWith('.cs')) csFiles.push(p);
    }
  };
  walk('Spixi');
  const fastPathNames = [];
  const composers = [];
  for (const f of csFiles) {
    const t = rd(f);
    if (/\b(?:supportsRawDataUriArgs|isTransportSafeDataUri|raw_data_uri_ok)\b/.test(t)) fastPathNames.push(f);
    /* a COMPOSER concatenates or interpolates onto the call head; SpixiContentPage's p1VerbOf only READS a pushed
       message against the same head (`const string head = "executeUiCommand(";`), which is not a composer */
    if (/"executeUiCommand\("\s*\+|\$@?"executeUiCommand\(|@?\$"executeUiCommand\(/.test(t)) composers.push(f);
  }
  const w = {
    found: send.length > 0 && csFiles.length > 50,
    everyArgEncoded: (send.match(/sb\.Append\(/g) || []).length === 4
      && /if \(arg != null\)\s*\{\s*sb\.Append\(","\);\s*sb\.Append\("'" \+ escapeHtmlParameter\(arg\) \+ "'"\);\s*\}\s*else\s*\{\s*sb\.Append\(",null"\);\s*\}/.test(send)
      && !/\?\s*arg\s*:/.test(send),
    encoder: /public static string escapeHtmlParameter\(string str\)\s*\{\s*return Convert\.ToBase64String\(Encoding\.UTF8\.GetBytes\(str\)\);\s*\}/.test(U),
    fastPathGone: fastPathNames.length === 0,
    oneComposer: composers.length === 1 && composers[0] === 'Spixi/Utils/Utils.cs' && (send.match(/"executeUiCommand\("/g) || []).length === 1,
  };
  ok(Object.values(w).every(Boolean),
    '★★ S15 O-11 (#1293): Utils.sendUiCommand base64-encodes EVERY non-null argument (escapeHtmlParameter = Convert.ToBase64String(UTF-8)) — the #340 raw data-URI fast path and both its gates (supportsRawDataUriArgs, isTransportSafeDataUri) are gone from every C# file, and sendUiCommand is the only composer of executeUiCommand( in Spixi/ — ' + JSON.stringify(w) + (fastPathNames.length ? ' still named in: ' + fastPathNames.join(', ') : '') + (composers.length !== 1 ? ' composers: ' + composers.join(', ') : ''));

  /* executed: what C# now puts on the wire, and what the real dispatcher hands the shell */
  const enc = (s) => Buffer.from(s, 'utf8').toString('base64');   // = Convert.ToBase64String(Encoding.UTF8.GetBytes(s))
  const icon = 'data:image/png;base64,' + Buffer.alloc(3000, 7).toString('base64');
  const SAMPLES = [icon, "x');alert(1);//\n\\`${y}", 'data:;base64,x', 'data:text/html,<b>hi</b>', 'Ćevapi 😀 – ﬁ', ''];
  const wire = SAMPLES.map(enc);
  /* ★ S15 #46 r1 MINOR-8: STATED FACTS of base64 (Node's encoder, not Spixi code) — labelled as such in the key text. */
  const r = {
    neverDataPrefix: wire.every((v) => !v.startsWith('data:')),
    literalSafe: wire.every((v) => /^[A-Za-z0-9+/=]*$/.test(v)),
  };
  const nat = await import(new URL('file://' + join(root, 'src/bridge/native.js')).href + '?s15=' + Date.now());
  const win = {};
  nat.installExecuteUiCommand(win);
  const got = [];
  const fn = (...a) => { got.push(a); };
  const errs = [];
  const ce = console.error; console.error = (...a) => { errs.push(a.join(' ')); };
  try { win.executeUiCommand(fn, ...wire, null); } finally { console.error = ce; }
  r.roundTrip = got.length === 1 && got[0].length === SAMPLES.length + 1 && SAMPLES.every((s, i) => got[0][i] === s) && got[0][SAMPLES.length] === '';
  r.noErr = errs.length === 0;
  r.sizeCost = Math.abs(enc(icon).length / icon.length - 4 / 3) < 0.01;
  ok(Object.values(r).every(Boolean),
    '★ S15 O-11 (#1293): EXECUTED through src/bridge/native.js\'s real dispatcher — what C# now sends (each value base64\'d as escapeHtmlParameter does: a data: URI, a quote/newline/backtick/${ value, a nickname that starts with "data:", non-ASCII) reaches the shell as the exact original string, null → \'\', no error (roundTrip · noErr). STATED FACTS of the base64 alphabet, not Spixi code (Node\'s encoder stands in for Convert.ToBase64String): such a value is literal-safe and never starts with "data:" (so native.js\'s passthrough is unreachable from C#), and costs 4/3 on a data: URI — ' + JSON.stringify(r));
}
