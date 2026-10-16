/* ==== S20H Drop C — the payment request note keeps the claims scope (L146; Damir 2026-10-15: fix before the freeze) ====
 * `requestIsMessage` ("A request is a message. Nothing moves until they pay.", wallet-receive.js) said "money" / "funds" in
 * de (Geld), ja (お金), ru (Деньги), lt (Pinigai), cn (资金), id (dana). On the BUILT dictionaries the shells load
 * (src/strings/<code>.json — what build-locales ships, the legacy reuse included) and the 13 drafts:
 *   (1) no locale's requestIsMessage contains a money / funds / invest / earn / buy stem (the V1A-M per-locale lexicon + funds);
 *   (2) every locale has a non-empty value and the 13 non-English values differ from the English.
 * Deliberate break (S20H report): de-de requestIsMessage back to "… Geld fließt erst, wenn bezahlt wird." (+ build-locales) → (1)
 *   fails naming de-de. */
const CLAIMS = {
  'en-us': /money|fund|invest|\bearn|\bbuy|\bbought|purchas|profit/i,
  'de-de': /geld|mittel|invest|verdien|kauf|gewinn|rendite/i,
  'es-co': /dinero|fondos|invers|invert|\bgan(?:a|an|ar|as|ancias?|é|ó)\b|\bcompr(?:a|an|ar|as|é|ó|ado|ada)\b|rentab/i,
  'fr-fr': /argent|fonds|invest|gagn|\bgains?\b|achat|achet|achèt|rentab/i,
  'sr-sp': /nova[cč]|novc|novč(?!an)|sredstv|invest|zara[dđ]|kupi|kupov|kupuj|profit/i,
  'sl-si': /denar(?!nic)|sredstv|invest|zasluž|kupi|kupov|kupuj|nakup|dobič/i,
  'ru-ru': /деньг|денег|средств|инвест|заработ|зарабат|купи|купл|покуп|прибыл|доход/i,
  'pt-br': /dinheiro|fundos|invest|\bganh|lucr|\bcompr(?:a|am|ar|e|ou|ado|ada)\b|rentab/i,
  'it-it': /soldi|denaro|fondi|invest|guadagn|acquist|\bcompr(?:a|are|i|ato|ata)\b|profitt/i,
  'id-id': /\buang\b|\bdana\b|invest|menghasilkan|\bbeli\b|membeli|dibeli|pembelian|keuntungan|\blaba\b/i,
  'lt-lt': /pinig(?!in)|lėš|invest|uždirb|uždarb|pirk|peln/i,
  'cn-cn': /钱(?!包)|资金|投资|赚|买|收益|盈利|利润/,
  'ja-jp': /お金|資金|投資|稼|購入|買|儲|利益|収益/,
  'sq-al': /\bpara(?:t|ve)?\b|fond|invest|fitim|\bfito|\bblej|\bbli\b|\bbleni\b/i,
};
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const bad = [], same = [], empty = [];
  const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8')).requestIsMessage;
  for (const [l, re] of Object.entries(CLAIMS)) {
    const files = l === 'en-us' ? ['src/strings/en-us.json'] : ['src/strings/' + l + '.json', 'src/strings/draft/' + l + '.json'];
    for (const f of files) {
      const v = JSON.parse(readFileSync(join(root, f), 'utf8')).requestIsMessage;
      if (!v) { empty.push(f); continue; }
      if (re.test(v)) bad.push(f + ': ' + v);
      if (l !== 'en-us' && v === en) same.push(f);
    }
  }
  ok(bad.length === 0, `★ S20H Drop C (L146, Damir: before the freeze): the payment request note says no money / funds word in any locale (built dictionaries + drafts) — ${JSON.stringify(bad)}`);
  ok(empty.length === 0 && same.length === 0, `★ S20H Drop C: requestIsMessage is present in all 14 locales and translated in the 13 others — ${JSON.stringify({ empty, same })}`);
}
