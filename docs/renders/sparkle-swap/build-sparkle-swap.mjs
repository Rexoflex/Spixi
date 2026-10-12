/**
 * build-sparkle-swap — writes sparkle-swap-render.html (same folder): every scene of the shipped illustration set that
 * draws the four-point sparkle, re-drawn with replacement candidates. READS src/ (never writes it): the art bodies come
 * straight from src/components/illustrations.js + illustrations-s17.js, the motion from src/styles/components/illo.css,
 * the --il-* / --wn-* / --ab-* / --dc-* values from src/styles/tokens.css — so the scenes are the app's own drawings and
 * only the sparkle is swapped (in the page, at render time, by swapArt()).
 *
 *   node docs/renders/sparkle-swap/build-sparkle-swap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---- the art table, exactly as the app builds it ---- */
const s17 = await import(path.join(ROOT, 'src/components/illustrations-s17.js'));
const ilSrc = rd('src/components/illustrations.js');
const a0 = ilSrc.indexOf('const IL_ART = {');
const a1 = ilSrc.indexOf('\n};', a0);
// eslint-disable-next-line no-eval
const IL_ART = (0, eval)('(' + ilSrc.slice(a0 + 15, a1 + 2) + ')');
Object.assign(IL_ART, s17.S17_ART);
IL_ART.moAi = s17.momentAiEntry(4);           // the AI moment, sized for a 4-letter greeting ("Hola")

const USED = ['welcome1', 'welcome2', 'welcome3', 'welcome4', 'restore', 'chatsEmpty', 'contactsEmpty', 'addContact',
  'appsEmpty', 'explore', 'backup', 'rating', 'walletEmptyA', 'walletEmptyB',
  'wnHeroBg', 'wnHeroFg', 'wnReplyBg', 'wnReplyFg', 'wnVoiceBg', 'wnVoiceFg', 'wnPhotosBg', 'wnPhotosFg',
  'wnPrivacyBg', 'wnPrivacyFg', 'wnAppsBg', 'wnAppsFg', 'aboutGlassBg', 'aboutGlassFg', 'heartBg', 'heartFg',
  'moAi', 'moAutodl', 'moFirstixi', 'moMic', 'moApp', 'moPay'];
const ART = {};
for (const k of USED) {
  const a = IL_ART[k];
  if (!a) throw new Error('missing art ' + k);
  ART[k] = { vb: a.vb, cls: a.cls, style: a.style || '', par: a.par || '', b: a.b };
}

/* ---- the theme values the art reads (light = :root block, dark = the dark block) ---- */
const tok = rd('src/styles/tokens.css');
function block(startMarker, endMarker, from) {
  const i = tok.indexOf(startMarker, from);
  const j = tok.indexOf(endMarker, i);
  return { css: tok.slice(i, j), end: j };
}
const L1 = block('--il-glow: #9aa8ff', '--ab-icon-ground', 0).css;          // --il-*, --wn-*, --ch-*, --dc-a/b/c, --rn-*, --ab-*
const D1 = block('--il-glow: #6c63ff', '--ab-bubble-dot: #0a62c4', 0).css;
const DC = tok.slice(tok.indexOf('--dc-spk-0'), tok.indexOf('\n', tok.indexOf('--dc-spk-0')));
const ILLO = rd('src/styles/components/illo.css');

const tpl = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
const out = tpl
  .replace('/*@@ILLO_CSS@@*/', () => ILLO)
  .split('/*@@ART_LIGHT@@*/').join(L1 + '\n' + DC)
  .replace('/*@@ART_DARK@@*/', () => D1)
  .replace('/*@@ART_JSON@@*/', () => 'const ART = ' + JSON.stringify(ART).replace(/<\/script/gi, '<\\/script') + ';');
fs.writeFileSync(path.join(HERE, 'sparkle-swap-render.html'), out);
console.log('wrote sparkle-swap-render.html', (out.length / 1024).toFixed(0) + ' KB');
