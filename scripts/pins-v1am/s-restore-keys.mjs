/* ==== V1A-M M4 — the restore question (S20G, #1423 ⑥) in 13 locales + the V1A-M JS string drafts ====
 * On the 14 C# lang files (Spixi/Resources/Raw/lang/<code>.txt) and the 13 draft dictionaries (src/strings/draft/<code>.json):
 *   (1) the 4 S20G alert keys (intro-restore-replace-title / -text / -confirm, intro-restore-stashbusy-text) each exist
 *       EXACTLY ONCE in all 14 files (a duplicate key throws in SpixiLocalization → the whole language is not loaded),
 *       non-empty, no `"` (TRANSLATORS-README: use &quot;); in the 13 non-English files every value DIFFERS from en-us
 *       (no English left behind); the confirm button is ≤ 16 characters in every file (a native alert button at 320 px).
 *   (2) the 7 V1A-M keys are drafted in all 13 drafts: the 5 user-facing ones translated (differ from the English of the
 *       contract), devFlagsV1IxiHelp / devFlagsV1Hints = the English (dev strings stay English, like devFlagsS20G).
 *   (3) L146 claim scope: none of the 4 lang values (14 files) and none of the 5 translated drafts says money / invest /
 *       earn / buy (a per-locale lexicon of STEMS, so inflected forms match too — #46 r1 C-5; IXI is a token).
 *       (2) also refuses an em-dash in the 5 drafts (the smoke N3a gate on the BUILT dictionaries, held before a build).
 *   (4) all 14 lang files keep the UTF-8 BOM and LF line endings (#46 r1 C-5).
 * Deliberate breaks (V1A-M STRINGS report): ① de-de intro-restore-replace-title back to the English → (1) fails naming
 *   de-de.txt; ② fr-fr confirm "Restaurer le compte maintenant" → (1) fails naming fr-fr (length); ③ a second
 *   intro-restore-replace-confirm line in ja-jp.txt → (1) fails naming ja-jp (count).
 *   #46 r1: ④ sr-sp wordTipPhonebook + " bez novca" (oblique case) → (3) fails naming sr-sp (the old /nova[cč]/ missed it);
 *   ⑤ fr-fr momentIxiHelpBody + " Aucun achat." → (3) fails naming fr-fr; ⑥ es-co wordTipRequest + " Sin ganancias." →
 *   (3) fails naming es-co; ⑦ the BOM stripped from sl-si.txt → (4) fails naming sl-si.txt; ⑧ the ru-ru em-dash put back in
 *   momentIxiHelpBody → (2) fails naming ru-ru. */
const KEYS = ['intro-restore-replace-title', 'intro-restore-replace-text', 'intro-restore-replace-confirm', 'intro-restore-stashbusy-text'];
const EN_JS = {
  momentIxiHelpTitle: 'What is IXI?',
  momentIxiHelpBody: 'IXI is the Ixian network’s token. Friends can send you IXI: share your address with them. Payments cannot be undone.',
  momentShowAddress: 'Show my address',
  wordTipRequest: 'A contact request means someone wants to chat with you. You choose: accept or decline.',
  wordTipPhonebook: 'Spixi has no phone book. Add people with their Spixi address or QR code.',
};
const EN_DEV = { devFlagsV1IxiHelp: 'What is IXI moment (V1A)', devFlagsV1Hints: 'New-word tips (V1A)' };
/* L146 per-locale lexicon — stems, so the inflected forms match too (#46 r1 C-5: sr novca/novcem/novcu, fr achat, es ganancia …).
   `\b` is ASCII-only in JS, so a stem that may follow a non-ASCII letter is written without a leading \b. */
const CLAIMS = {
  'en-us': /money|invest|\bearn|\bbuy|\bbought|purchas|profit/i,
  'de-de': /geld|invest|verdien|kauf|gewinn|rendite/i,
  'es-co': /dinero|invers|invert|\bgan(?:a|an|ar|as|ancias?|é|ó)\b|\bcompr(?:a|an|ar|as|é|ó|ado|ada)\b|rentab/i,
  'fr-fr': /argent|invest|gagn|\bgains?\b|achat|achet|achèt|rentab/i,
  'sr-sp': /nova[cč]|novc|novč(?!an)|invest|zara[dđ]|kupi|kupov|kupuj|profit/i,
  'sl-si': /denar(?!nic)|invest|zasluž|kupi|kupov|kupuj|nakup|dobič/i,
  'ru-ru': /деньг|денег|инвест|заработ|зарабат|купи|купл|покуп|прибыл|доход/i,
  'pt-br': /dinheiro|invest|\bganh|lucr|\bcompr(?:a|am|ar|e|ou|ado|ada)\b|rentab/i,
  'it-it': /soldi|denaro|invest|guadagn|acquist|\bcompr(?:a|are|i|ato|ata)\b|profitt/i,
  'id-id': /\buang\b|invest|menghasilkan|\bbeli\b|membeli|dibeli|pembelian|keuntungan|\blaba\b/i,
  'lt-lt': /pinig(?!in)|invest|uždirb|uždarb|pirk|peln/i,
  'cn-cn': /钱(?!包)|转账|投资|赚|买|收益|盈利|利润/,
  'ja-jp': /お金|投資|稼|購入|買|儲|利益|収益/,
  'sq-al': /\bpara(?:t|ve)?\b|invest|fitim|\bfito|\bblej|\bbli\b|\bbleni\b/i,
};
const EM_DASH = '\u2014';   // the N3a gate (smoke): a BUILT dictionary carries no em-dash — held here on the drafts, before a build
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join } = h;
  const langDir = join(root, 'Spixi/Resources/Raw/lang');
  const files = readdirSync(langDir).filter((x) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(x)).sort();
  /* the SpixiLocalization rule: split at the FIRST '=', trim both sides; ';' starts a comment */
  const parse = (t) => {
    const m = new Map();
    for (const raw of t.replace(/^\uFEFF/, '').split('\n')) {
      const line = raw.trim(); if (!line || line.startsWith(';')) continue;
      const eq = line.indexOf('='); if (eq < 0) continue;
      const k = line.slice(0, eq).trim(); const v = line.slice(eq + 1).trim();
      if (!m.has(k)) m.set(k, []); m.get(k).push(v);
    }
    return m;
  };
  const lang = Object.fromEntries(files.map((x) => [x.slice(0, -4), parse(readFileSync(join(langDir, x), 'utf8'))]));
  const en = lang['en-us'] || new Map();
  const bad = { count: [], empty: [], quote: [], english: [], confirmLen: [], claims: [] };
  for (const code of Object.keys(lang)) {
    for (const key of KEYS) {
      const vs = lang[code].get(key) || [];
      if (vs.length !== 1) { bad.count.push(code + ':' + key + '×' + vs.length); continue; }
      const v = vs[0];
      if (!v) bad.empty.push(code + ':' + key);
      if (v.includes('"')) bad.quote.push(code + ':' + key);
      if (code !== 'en-us' && en.get(key) && v === en.get(key)[0]) bad.english.push(code + ':' + key);
      if (key === 'intro-restore-replace-confirm' && [...v].length > 16) bad.confirmLen.push(code + ':' + [...v].length);
      if (CLAIMS[code] && CLAIMS[code].test(v)) bad.claims.push(code + ':' + key);
    }
  }
  ok(files.length === 14 && Object.values(bad).slice(0, 5).every((a) => a.length === 0),
    '★ V1A-M M4 (1): the restore question (title · text · confirm) + the stash-busy text exist ONCE in all 14 lang files, non-empty, no ", translated in the 13 non-English files (none equals en-us), confirm ≤ 16 chars — ' + JSON.stringify({ files: files.length, ...bad, claims: undefined }));

  const draftDir = join(root, 'src/strings/draft');
  const codes = files.map((x) => x.slice(0, -4)).filter((c) => c !== 'en-us');
  const dbad = { missing: [], english: [], devNotEnglish: [], emDash: [], claims: [] };
  for (const code of codes) {
    let d = {};
    try { d = JSON.parse(readFileSync(join(draftDir, code + '.json'), 'utf8')); } catch (e) { dbad.missing.push(code + ':parse'); continue; }
    for (const [k, enV] of Object.entries(EN_JS)) {
      const v = d[k];
      if (typeof v !== 'string' || !v.trim()) { dbad.missing.push(code + ':' + k); continue; }
      if (v === enV) dbad.english.push(code + ':' + k);
      if (v.includes(EM_DASH)) dbad.emDash.push(code + ':' + k);
      if (CLAIMS[code] && CLAIMS[code].test(v)) dbad.claims.push(code + ':' + k);
    }
    for (const [k, enV] of Object.entries(EN_DEV)) if (d[k] !== enV) dbad.devNotEnglish.push(code + ':' + k);
  }
  ok(codes.length === 13 && dbad.missing.length === 0 && dbad.english.length === 0 && dbad.devNotEnglish.length === 0 && dbad.emDash.length === 0,
    '★ V1A-M M4 (2): the 7 V1A-M keys are drafted in all 13 drafts — the 5 user-facing ones translated (no em-dash, the N3a rule), the 2 dev-switch labels English — ' + JSON.stringify({ ...dbad, claims: undefined }));

  /* (4) the file format the translators' README fixes: UTF-8 WITH a BOM, LF only (a Buffer read: no CRLF normalisation) */
  const fmt = { noBom: [], cr: [] };
  for (const x of files) {
    const b = readFileSync(join(langDir, x));
    if (!(b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF)) fmt.noBom.push(x);
    if (b.includes(0x0D)) fmt.cr.push(x);
  }
  ok(files.length === 14 && fmt.noBom.length === 0 && fmt.cr.length === 0,
    '★ V1A-M M4 (4): all 14 lang files keep the UTF-8 BOM and LF line endings (#46 r1 C-5) — ' + JSON.stringify(fmt));
  ok(bad.claims.length === 0 && dbad.claims.length === 0,
    '★ V1A-M M4 (3) L146: the restore texts and the IXI / word-tip drafts keep the English claim scope — no money / invest / earn / buy word in any locale (IXI is a token) — ' + JSON.stringify({ lang: bad.claims, drafts: dbad.claims }));
}
