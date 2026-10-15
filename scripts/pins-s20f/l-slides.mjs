/* ==== S20F W-5 (#1425 · #1426) — THE WELCOME SLIDES: the order, "Open source", 7 s autoplay, the claims ====
 * On the BUILT intro.html (jsdom, phone UA):
 *   (1) the order: slide i draws art i and reads title / copy key i — welcome2 slide1Title2 slide1Copy3 · welcome1
 *       slide2Title2 slide2Copy2 · welcome3 slide3Title slide3Copy · welcome4 slide4Title2 slide4Copy2 (the painted text
 *       mapped back to its en-us key); under ?lang=de-de the same slides paint the de-de values of those keys.
 *   (2) "Open source" is the element right after the dots — a plain <p> (no link, no button, no role), the en-us
 *       welcomeOpenSource value; shown at L0 / L1, display none at the L2 tight level (data-compact="2", built CSS).
 *       ★ S20G F-3 re-base: "Open source" moved INTO the version line — no separate element; the version line
 *       (a plain <p>) says it before setVersion, at every level L0 / L1 / L2 (the format: pins-s20g/l-version.mjs).
 *   (3) autoplay = ONE interval of 7000 ms, read through a fake setInterval on a fresh shell; its tick pages the
 *       carousel (dot 2 selected); under prefers-reduced-motion no interval at all.
 *   (4) the claims sweep over the 14 dictionaries (src/strings/<code>.json, generated): the welcome keys of (1) + the
 *       oss key never say money / servers / anonymous / forward secrecy (a per-locale lexicon), and "post-quantum"
 *       (quant / kvant / квант / 量子 …) appears on slide2Copy2 ONLY — and there in every locale; ★ #46 r1: slide2Copy2
 *       carries no route paraphrase ("directly, device to device", per-locale lexicon ROUTE).
 * Deliberate breaks (S20F report): ① slide 1 back on illoWelcome1 (the arts swapped back) → (1) fails;
 *   ② the oss line appended before the dots → (2) fails; ③ the interval back to 5000 → (3) fails;
 *   ④ de-de slide1Copy3 given "… anonym …" → (4) banned fails; ⑤ en-us slide1Copy3 given "Post-quantum …" → (4) pq fails;
 *   ⑦ (#46 r1) the ten r0 slide2Copy2 drafts put back (de es pt ru sr sl id cn lt sq) → (4) route lists all ten;
 *   ⑥ the L2 rule `.c-launch__welcome[data-compact="2"] .c-launch__oss { display: none }` removed → (2) L2 fails.
 * ★ S20G F-3 re-base breaks: ⑧ the separate oss <p> appended after the dots again → (2) noSeparate fails;
 *   ⑨ the version line without the oss text → (1) deOss + (2) text fail; ⑩ an L2 rule hiding .c-launch__version → (2) L2 fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
const LOCALES = ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
/* banned (the store wording rule + #702 / #703): money · servers · anonymous · forward secrecy, per locale (the WALLET
   word keeps its money root in sl denarnica / lt piniginė / cn 钱包 — excluded by a lookahead) */
const BANNED = {
  'en-us': /money|server|anonym|forward secrecy/i, 'de-de': /geld|server|anonym|forward secrecy|vorwärts/i,
  'es-co': /dinero|servidor|an[oó]nim|secreto/i, 'fr-fr': /argent|serveur|anonym|confidentialité persistante/i,
  'sr-sp': /nova[cč]|server|anonim|tajnost/i, 'sl-si': /denar(?!nic)|strežnik|server|anonim|tajnost/i,
  'ru-ru': /деньг|денег|сервер|аноним|секретност/i, 'pt-br': /dinheiro|servidor|an[oô]nim|sigilo/i,
  'it-it': /soldi|denaro|server|anonim|segretezza/i, 'id-id': /\buang\b|server|anonim|kerahasiaan/i,
  'lt-lt': /pinig(?!in)|server|anonim|slaptum/i, 'cn-cn': /钱(?!包)|服务器|匿名|前向/, 'ja-jp': /お金|サーバ|匿名|前方秘匿/,
  'sq-al': /\bpara\b|server|anonim|fshehtësi/i,
};
const PQ = /quant|quânt|cuánt|kvant|квант|kuant|量子/i;
/* ★ #46 r1 (MAJOR-1): slide2Copy2 says "sent peer to peer" — never a route claim ("directly, device to device", the "no
   servers" paraphrase #703 / #1425 struck). Where the locale has a peer-to-peer term (de / es / pt / id / cn / en / fr / it /
   ja) "direct" itself is banned; ru / sl / sr / sq / lt keep their glossary "direct(ly between users)" and lose only the
   device-to-device part. */
const ROUTE = {
  'en-us': /direct|device to device/i, 'de-de': /direkt|von Gerät zu Gerät|zwischen Geräten/i,
  'es-co': /direct|de dispositivo a dispositivo/i, 'fr-fr': /direct|d[’']appareil à appareil/i,
  'pt-br': /diret|de aparelho para aparelho|de dispositivo para dispositivo/i, 'it-it': /dirett|da dispositivo a dispositivo/i,
  'id-id': /langsung|antarperangkat|perangkat ke perangkat/i, 'cn-cn': /直接|设备到设备|设备之间/, 'ja-jp': /直接|端末から端末|端末間/,
  'ru-ru': /от устройства к устройству|между устройствами/i, 'sl-si': /med napravam|od naprave do naprave/i,
  'sr-sp': /od uređaja do uređaja|između uređaja/i, 'sq-al': /nga pajisja në pajisje|mes pajisjeve/i, 'lt-lt': /tarp įrenginių|iš įrenginio į įrenginį/i,
};
export default async function (h) {
  const { ok, sleep, root, readFileSync, join } = h;
  const { boot, cascade } = on1Kit(h);
  const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  const keyOf = (text) => Object.keys(en).filter((k) => en[k] === text);
  let s = null, g = null;
  try {
    /* (1) the order */
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    const slides = [...d.querySelectorAll('.c-launch__slide')];
    const got = slides.map((sl) => [
      (sl.querySelector('.c-launch__illo-img') || { getAttribute: () => null }).getAttribute('data-illo'),
      keyOf((sl.querySelector('.c-launch__slide-title') || {}).textContent).join('/'),
      keyOf((sl.querySelector('.c-launch__slide-copy') || {}).textContent).join('/'),
    ]);
    const WANT = [['welcome2', 'slide1Title2', 'slide1Copy3'], ['welcome1', 'slide2Title2', 'slide2Copy2'],
      ['welcome3', 'slide3Title', 'slide3Copy'], ['welcome4', 'slide4Title2', 'slide4Copy2']];
    g = await boot({ ua: 'phone', query: 'lang=de-de' });
    const de = JSON.parse(readFileSync(join(root, 'src/strings/de-de.json'), 'utf8'));
    const dePainted = [...g.d.querySelectorAll('.c-launch__slide')].map((sl) => [sl.querySelector('.c-launch__slide-title').textContent, sl.querySelector('.c-launch__slide-copy').textContent]);
    const deWant = WANT.map((x) => [de[x[1]], de[x[2]]]);
    const deOss = (g.d.querySelector('.c-launch__version') || {}).textContent;   // ★ S20G F-3 re-base: in the version line
    g.close(); g = null;
    ok(JSON.stringify(got) === JSON.stringify(WANT) && JSON.stringify(dePainted) === JSON.stringify(deWant) && deOss === de.welcomeOpenSource,
      '★ S20F W-5 (#1425): the welcome order — slide 1 the ID-card art + "Private chat. No phone number.", slide 2 the orbit art + the post-quantum line, slide 3 unchanged, slide 4 "Play and plan together."; de-de paints the same keys — ' + JSON.stringify({ got, deOss }));

    /* (2) "Open source" — ★ S20G F-3 re-base: inside the version line (no separate caption under the dots) */
    const wv = d.querySelector('.c-launch__welcome');
    const dots = d.querySelector('.c-launch__dots');
    const oss = d.querySelector('.c-launch__version');
    const disp = (lvl) => { if (lvl) wv.dataset.compact = lvl; else delete wv.dataset.compact; const x = cascade(W, oss, 'display'); delete wv.dataset.compact; return x || 'block'; };
    const r2 = {
      noSeparate: !d.querySelector('.c-launch__oss') && dots.nextElementSibling && dots.nextElementSibling.classList.contains('c-launch__ctas'),
      plain: !!oss && oss.tagName === 'P' && !oss.querySelector('a, button') && !oss.hasAttribute('role') && !oss.hasAttribute('tabindex'),
      text: !!oss && oss.textContent === en.welcomeOpenSource && en.welcomeOpenSource === 'Open source',
      L0: disp('') !== 'none', L1: disp('1') !== 'none', L2: disp('2') !== 'none',
    };
    ok(Object.values(r2).every(Boolean),
      '★ S20F W-5 (#1426) → ★ S20G F-3: "Open source" is plain text in the version line (not a link, no separate caption under the dots), shown at every level L0 / L1 / L2 — ' + JSON.stringify(r2));

    /* (3) the autoplay interval, through a fake timer */
    const rec = [];
    const realSI = W.setInterval;
    W.setInterval = (fn, ms) => { rec.push({ fn, ms }); return 0; };
    let sh = null, shR = null, recR = [];
    try {
      sh = W.Spixi.createLaunchShell({ view: 'welcome' });
      d.body.append(sh);
      const realMM = W.matchMedia;
      W.matchMedia = (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      const before = rec.length;
      shR = W.Spixi.createLaunchShell({ view: 'welcome' });
      recR = rec.slice(before);
      W.matchMedia = realMM;
    } finally { W.setInterval = realSI; }
    const auto = rec.filter((r) => r.ms >= 1000);
    if (auto[0]) auto[0].fn();
    const sel = sh ? [...sh.querySelectorAll('.c-launch__dot')].map((b) => b.getAttribute('aria-selected')).join(',') : '';
    if (sh) sh.remove();
    const r3 = { one: auto.length === 1 && recR.filter((r) => r.ms >= 1000).length === 0, ms: auto[0] && auto[0].ms, ticked: sel === 'false,true,false,false' };
    ok(r3.one && r3.ms === 7000 && r3.ticked,
      '★ S20F W-5 (#1425): autoplay pages every 7000 ms (one interval, read through a fake setInterval; its tick selects dot 2); none under reduced motion — ' + JSON.stringify(r3));

    /* (4) the claims sweep */
    const welcomeKeys = [...new Set(WANT.flatMap((x) => [x[1], x[2]]).concat('welcomeOpenSource'))];
    const banned = [], pqWrong = [], pqMissing = [], route = [];
    for (const code of LOCALES) {
      const dict = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
      for (const k of welcomeKeys) {
        const t = String(dict[k] || '');
        if (BANNED[code].test(t)) banned.push(code + ':' + k);
        if (k !== 'slide2Copy2' && PQ.test(t)) pqWrong.push(code + ':' + k);
      }
      if (!PQ.test(String(dict.slide2Copy2 || ''))) pqMissing.push(code);
      if (ROUTE[code].test(String(dict.slide2Copy2 || ''))) route.push(code);
    }
    ok(banned.length === 0 && pqWrong.length === 0 && pqMissing.length === 0 && route.length === 0,
      '★ S20F W-5 (#1425 claims): in all 14 dictionaries the welcome copy never says money / servers / anonymous / forward secrecy, and "post-quantum" sits on slide2Copy2 only (and there in every locale), and slide2Copy2 makes no "directly, device to device" route claim — ' + JSON.stringify({ banned, pqWrong, pqMissing, route }));
    ok(s.errs.length === 0, '★ S20F W-5: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F W-5 l-slides threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (g) g.close(); }
}
