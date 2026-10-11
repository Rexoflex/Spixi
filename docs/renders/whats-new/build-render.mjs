#!/usr/bin/env node
/**
 * build-render.mjs — RENDER ONLY (plan v2, the What's new spotlight). Writes whats-new-render.html next to this
 * file from the real src/styles/tokens.css (scoped :root → .sx, data-theme → data-sxt, so the review page's own
 * theme cannot leak into a device frame), src/styles/components/button.css + illo.css, the Tabler icons, the
 * reused en-us strings, copy.json, parts/art.js + art.css (the six scenes), parts/render.css + render.js +
 * page.html, COMPARE.md + PROPOSAL.md (tiny Markdown → HTML). Also writes whats-new-b-render.html (direction B,
 * parts-b/), art-direction.html (round 1 of the new art direction, parts-d/ + ART-DIRECTION.md), thread-render.html (THREAD, a new illustration language, parts-c/ + THREAD.md) and art/<scene>.svg (each scene as one animated
 * SVG file, open it in a browser). Reads the tree, writes only inside this folder. Nothing ships.
 *   node docs/renders/whats-new/build-render.mjs            (from the repo root)
 *   node docs/renders/whats-new/build-render.mjs <repoRoot>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(process.argv[2] || join(HERE, '..', '..', '..'));
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const here = (p) => readFileSync(join(HERE, p), 'utf8');

/* tokens, scoped */
const tokens = rd('src/styles/tokens.css').replace(/:root/g, '.sx').replace(/data-theme/g, 'data-sxt');
const compCss = ['button.css', 'illo.css'].map((f) => '/* ' + f + ' */\n' + rd('src/styles/components/' + f)).join('\n');

/* icons: only the glyphs the two renders use (ink → currentColor; the logo's brand fill → currentColor) */
const WANT = ['logo', 'x', 'chevron-left', 'chevron-right', 'arrow-left', 'arrow-right', 'arrow-back-up', 'messages', 'wallet', 'apps',
  'apps-filled', 'settings', 'search', 'message-plus', 'rocket', 'info-circle', 'star', 'shield-lock', 'microphone', 'photo', 'eye-off',
  'checks', 'dots', 'heart-filled', 'player-play', 'player-pause', 'code', 'user-circle', 'circle-plus', 'copy', 'pencil', 'trash', 'check', 'send-2',
  'key', 'user-plus', 'qrcode'];
const icons = {};
for (const n of WANT) {
  const f = n === 'logo' ? 'logo.svg' : 'tabler-icon-' + n + '.svg';
  icons[n] = rd('src/assets/icons/' + f).replace(/(fill|stroke)="#131415"/gi, '$1="currentColor"')
    .replace(n === 'logo' ? /fill="#3050BD"/gi : /$^/, 'fill="currentColor"').replace(/\s(width|height)="\d+"/g, '').trim();
}

/* strings: reused en-us keys + the render copy; a +40 % pseudo locale */
const copy = JSON.parse(here('copy.json'));
const en = JSON.parse(rd('src/strings/en-us.json'));
const str = { 'en-us': {} };
for (const k of copy.reuse) str['en-us'][k] = en[k];
Object.assign(str['en-us'], copy.strings['en-us']);
const ACC = { a: 'á', e: 'ë', i: 'ï', o: 'ö', u: 'ü', c: 'ç', n: 'ñ', A: 'Å', E: 'É', O: 'Ø', U: 'Û', y: 'ý' };
const pseudo = (s) => {
  const t = s.replace(/\{0\}/g, '\u0000').replace(/[aeioucnAEOUy]/g, (m) => ACC[m]).replace(/\u0000/g, '{0}');
  const pad = Math.ceil(s.length * 0.4);
  return t + ' ·ŵïðé ŧëẋŧ'.repeat(Math.ceil(pad / 10)).slice(0, pad);
};
str['xx-ps'] = Object.fromEntries(Object.entries(str['en-us']).map(([k, v]) => [k, pseudo(v)]));

const data = {
  version: '1.0',
  slides: copy.slides,
  str,
  locName: { 'en-us': 'English', 'xx-ps': 'Pseudo +40 %' },
  sheet: {
    hero: { loop: 'Background: four aurora glows drift (14–23 s, alternate) under a twinkling star field.', entrance: 'Once: rings bloom, the phone rises, four chips fly in from the phone (reply · voice · album · privacy = cards 2–5), then bob gently.' },
    reply: { loop: 'Background: outlined bubbles float up and back (9–18 s).', entrance: 'Once: the bubble swipes right (the reply gesture), the reply with its quote rises, the reaction bar pops, a heart drops on the bubble, the sent line re-writes (the edit), a pencil badge pops.' },
    voice: { loop: 'Background: a full-bleed waveform breathes (2.6 s, staggered).', entrance: 'Once: the mic pops and sends three pulse rings, the voice bubble slides in, its bars light up one by one (it plays).' },
    photos: { loop: 'Background: a wall of photos pans slowly (28 s, alternate).', entrance: 'Once: the album rises, its four tiles pop in, a location pin drops and is struck out, then fades back.' },
    privacy: { loop: 'Background: a node grid with a slow ripple (6 s).', entrance: 'Once: the panel rises, the three switches go off one by one (receipts · typing · online), the eye-off badge pops.' },
    apps: { loop: 'Background: two rings of app tiles orbit in opposite directions (70–90 s).', entrance: 'Once: the invite card rises, Accept pops with a tap ripple, three apps fly out of the chat and bob.' },
  },
};

/* PROPOSAL.md → HTML */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
function md(src) {
  const out = []; const L = src.split('\n'); let i = 0;
  while (i < L.length) {
    const line = L[i];
    if (/^#{1,3} /.test(line)) { const n = line.match(/^#+/)[0].length; out.push('<h' + n + '>' + inline(line.slice(n + 1)) + '</h' + n + '>'); i++; continue; }
    if (/^\|/.test(line)) {
      const rows = []; while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push('<div class="tw"><table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\d+\. /.test(line)) { const it = []; while (i < L.length && /^\d+\. /.test(L[i])) it.push(L[i++].replace(/^\d+\. /, '')); out.push('<ol>' + it.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>'); continue; }
    if (/^- /.test(line)) { const it = []; while (i < L.length && /^- /.test(L[i])) it.push(L[i++].slice(2)); out.push('<ul>' + it.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>'); continue; }
    if (!line.trim()) { i++; continue; }
    const para = []; while (i < L.length && L[i].trim() && !/^(#|\||- |\d+\. )/.test(L[i])) para.push(L[i++]);
    out.push('<p>' + inline(para.join(' ')) + '</p>');
  }
  return out.join('\n');
}

const artJs = here('parts/art.js');
const artCss = here('parts/art.css');
const page = here('parts/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@COMPONENT_CSS@*/', () => compCss)
  .replace('/*@ART_CSS@*/', () => artCss)
  .replace('/*@RENDER_CSS@*/', () => here('parts/render.css'))
  .replace('<!--@PROPOSAL@-->', () => md(here('COMPARE.md')) + md(here('PROPOSAL.md')))
  .replace('/*@DATA@*/', () => 'const DATA = ' + JSON.stringify(data) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';')
  .replace('/*@ART_JS@*/', () => artJs)
  .replace('/*@RENDER_JS@*/', () => here('parts/render.js'));
writeFileSync(join(HERE, 'whats-new-render.html'), page);

/* direction B — live UI stories (same tokens, frames and strings; no art) */
data.sheetB = {
  hero: 'The chat list builds itself row by row; a tap opens a chat.',
  reply: 'Swipe a bubble → the quote lands in the composer → typed and sent → hold → ❤️ → hold your own → Edit → “edited”.',
  voice: 'Tap the mic → the recording bar counts 0:03 / 0:30 → send → the voice bubble plays.',
  photos: 'Tap + → pick 6 of 10 → Send → one album bubble → “Location removed from 6 photos”.',
  privacy: 'Settings › Privacy with the real labels: receipts off, typing off, hide online on.',
  apps: 'An invite card → Accept → “Joined” → the mini app slides up and the game starts.',
};
const pageB = here('parts-b/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@COMPONENT_CSS@*/', () => compCss)
  .replace('/*@RENDER_CSS@*/', () => here('parts/render.css'))
  .replace('/*@STORY_CSS@*/', () => here('parts-b/story.css'))
  .replace('<!--@COMPARE@-->', () => md(here('COMPARE.md')))
  .replace('/*@DATA@*/', () => 'const DATA = ' + JSON.stringify(data) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';')
  .replace('/*@STORY_JS@*/', () => here('parts-b/story.js'));
writeFileSync(join(HERE, 'whats-new-b-render.html'), pageB);

/* THREAD — the proposed new illustration + motion language, in the direction-A spotlight */
const pageC = here('parts-c/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@COMPONENT_CSS@*/', () => compCss)
  .replace('/*@ART_CSS@*/', () => artCss)
  .replace('/*@RENDER_CSS@*/', () => here('parts/render.css'))
  .replace('/*@THREAD_CSS@*/', () => here('parts-c/thread.css'))
  .replace('<!--@THREAD_MD@-->', () => md(here('THREAD.md')))
  .replace('/*@DATA@*/', () => 'const DATA = ' + JSON.stringify(data) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';')
  .replace('/*@ART_JS@*/', () => artJs)
  .replace('/*@THREAD_JS@*/', () => here('parts-c/thread.js'))
  .replace('/*@RENDER_JS@*/', () => here('parts/render.js'))
  .replace('/*@EXTRA_JS@*/', () => here('parts-c/extra.js'));
writeFileSync(join(HERE, 'thread-render.html'), pageC);

/* ART DIRECTION round 1 (Damir 13:12): LENS · PRESS · SPARK, grown from the logo (parts-d/ + ART-DIRECTION.md) */
const pageD = here('parts-d/page.html')
  .replace('/*@DIR_CSS@*/', () => here('parts-d/directions.css'))
  .replace('<!--@AD_MD@-->', () => md(here('ART-DIRECTION.md')))
  .replace('/*@DIR_JS@*/', () => here('parts-d/directions.js'))
  .replace('/*@PAGE_JS@*/', () => here('parts-d/page.js'));
writeFileSync(join(HERE, 'art-direction.html'), pageD);

/* THE KIT (Damir 13:28, round 2 13:39): the original set improved — theme-native grounds, the full-bleed About
   header, the backup chest redrawn. The CURRENT chest is read from src/components/illustrations.js (read only) for
   the before / after, and the nudge copy from the real backupNudge* strings. */
const ilCtx = {}; vm.createContext(ilCtx);
vm.runInContext(rd('src/components/illustrations.js').replace(/^export /gm, '') + '\nthis.OLD = IL_ART.backup;', ilCtx);
const kitData = { oldChest: { vb: ilCtx.OLD.vb, b: ilCtx.OLD.b }, nudge: Object.fromEntries(Object.keys(en).filter((k) => k.startsWith('backupNudge')).sort().map((k) => [k, en[k]])) };
const pageE = here('parts-e/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@COMPONENT_CSS@*/', () => compCss)
  .replace('/*@ART_CSS@*/', () => artCss)
  .replace('/*@RENDER_CSS@*/', () => here('parts/render.css'))
  .replace('/*@KIT_CSS@*/', () => here('parts-e/kit.css'))
  .replace('<!--@KIT_MD@-->', () => md(here('KIT.md')))
  .replace('/*@DATA@*/', () => 'const DATA = ' + JSON.stringify(data) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';\nconst KITDATA = ' + JSON.stringify(kitData) + ';')
  .replace('/*@KIT_JS@*/', () => here('parts-e/art2.js'))
  .replace('/*@RENDER_JS@*/', () => here('parts/render.js'))
  .replace('/*@SHEET_JS@*/', () => here('parts-e/sheet.js'));
writeFileSync(join(HERE, 'kit-render.html'), pageE);

/* CHAT APPEARANCE (Damir 14:27): a premium Chat appearance screen, live (parts-f/ + APPEARANCE.md) */
const apKeys = ['chatAppearance', 'textSize', 'chatGround', 'groundFlat', 'groundBrandGradient', 'groundBlueGradient', 'groundGreenGradient', 'patternStyle', 'patternNone',
  'patternStyleContours', 'previewIncoming', 'previewOutgoing', 'theme', 'themeSystem', 'themeLight', 'themeDark', 'chatPreviewLines', 'previewLinesOne', 'previewLinesTwo', 'hintsSwitch', 'today'];
const apStr = Object.fromEntries(apKeys.map((k) => [k, en[k]]));
Object.assign(apStr, { groundFlat: 'Mist', groundBrandGradient: 'Iris', groundBlueGradient: 'Spixi', groundGreenGradient: 'Meadow', groundAurora: 'Aurora', groundDusk: 'Dusk', groundOcean: 'Ocean', patternWaves: 'Waves', bubbleColour: 'Bubble colour', bubbleColourAuto: 'Auto', bubbleCorners: 'Bubble corners' });
const pageF = here('parts-f/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@APPEAR_CSS@*/', () => here('parts-f/appear.css'))
  .replace('<!--@AP_MD@-->', () => md(here('APPEARANCE.md')))
  .replace('/*@AP_DATA@*/', () => 'const AP = ' + JSON.stringify({ str: apStr }) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';')
  .replace('/*@APPEAR_JS@*/', () => here('parts-f/appear.js'));
writeFileSync(join(HERE, 'appearance-render.html'), pageF);

/* THE SET (Damir 14:48): welcome A / B and the 13 drawings with less shine (parts-g/ + SET.md) */
const setStrKeys = ['slide1Title', 'slide1Copy2', 'slide2Title', 'slide2Copy', 'slide3Title', 'slide3Copy', 'slide4Title', 'slide4Copy', 'createCta', 'restoreCta'];
const ilAllCtx = {}; vm.createContext(ilAllCtx);
vm.runInContext(rd('src/components/illustrations.js').replace(/^export /gm, '') + '\nthis.ALL = IL_ART;', ilAllCtx);
const setData = { il: JSON.parse(JSON.stringify(ilAllCtx.ALL)), str: Object.fromEntries(setStrKeys.map((k) => [k, en[k]])) };
const pageG = here('parts-g/page.html')
  .replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@ILLO_CSS@*/', () => rd('src/styles/components/illo.css'))
  .replace('/*@ART_CSS@*/', () => artCss)
  .replace('/*@KIT_CSS@*/', () => here('parts-e/kit.css'))
  .replace('/*@SET_CSS@*/', () => here('parts-g/set.css'))
  .replace('<!--@SET_MD@-->', () => md(here('SET.md')))
  .replace('/*@SET_DATA@*/', () => 'const SET = ' + JSON.stringify(setData) + ';\nconst ICONS = ' + JSON.stringify(icons) + ';')
  .replace('/*@KIT_JS@*/', () => here('parts-e/art2.js'))
  .replace('/*@SET_JS@*/', () => here('parts-g/set.js'));
writeFileSync(join(HERE, 'set-render.html'), pageG);

/* DELETE DATA icons (Damir 15:30): today vs two options (parts-h/). Strings: the screen's visible copy as on Damir's 15:27 screenshot. */
const ddData = { icons: JSON.parse(here('parts-h/icons.json')), str: { title: 'Delete data…', free: 'Free up space', hist: 'Delete all chat history',
  histSub: 'Messages go from this device. Contacts keep theirs.', dl: 'Delete downloads', dlSub: 'Files received in chats go from this device.',
  danger: 'Danger zone', acc: 'Delete account', accSub: 'Removes everything from this device: wallet, contacts, chats, files and settings.' } };
writeFileSync(join(HERE, 'deletedata-render.html'), here('parts-h/page.html').replace('/*@TOKENS@*/', () => tokens).replace('/*@DATA@*/', () => 'const DD = ' + JSON.stringify(ddData) + ';'));

/* DOWNLOADS + CONTRIBUTORS (Damir 15:34): premium renders (parts-i/ + DC.md) */
const dcKeys = ['downloads', 'searchDownloads', 'downloadsCount', 'clearDownloads', 'downloadsFromChip', 'downloadsAllSenders', 'downloadsFrom', 'all', 'photos', 'sharedFiles',
  'today', 'yesterday', 'select', 'cancel', 'selectedCount', 'delete', 'contributors', 'contributorsLead', 'creditsTitle', 'creditSounds', 'creditIcons', 'creditFlags'];
const dcStr = Object.fromEntries(dcKeys.map((k) => [k, en[k]]));
Object.assign(dcStr, { thanks: 'Thank you', showInChat: 'Show in chat' });
const dcCtx = {}; vm.createContext(dcCtx);
{ const sa = rd('src/components/settings-app.js'); const grab = (name) => { const a = sa.indexOf('export const ' + name); const s = sa.indexOf('[', a); let d = 0, i = s; for (; i < sa.length; i++) { if (sa[i] === '[') d++; else if (sa[i] === ']' && --d === 0) break; } return sa.slice(s, i + 1); };
  vm.runInContext('this.C = ' + grab('ASSET_CREDITS') + '; this.N = ' + grab('CONTRIBUTORS') + ';', dcCtx); }
const dcData = { str: dcStr, icons: JSON.parse(here('parts-i/icons.json')), credits: JSON.parse(JSON.stringify(dcCtx.C)), names: JSON.parse(JSON.stringify(dcCtx.N)) };
writeFileSync(join(HERE, 'downloads-contributors-render.html'), here('parts-i/page.html').replace('/*@TOKENS@*/', () => tokens).replace('/*@DC_CSS@*/', () => here('parts-i/dc.css'))
  .replace('<!--@DC_MD@-->', () => md(here('DC.md'))).replace('/*@DC_DATA@*/', () => 'const DC = ' + JSON.stringify(dcData) + ';').replace('/*@DC_JS@*/', () => here('parts-i/dc.js')));

/* MOMENT SHEETS (Damir 17:12 / 17:18 / 17:36): seven one-time sheets (parts-j/ + MOMENTS.md). Reused keys come from the string
   files; the new copy is the proposal (MOMENTS.md "New strings"). 1 is shown in German and French from de-de / fr-fr. */
const de = JSON.parse(rd('src/strings/de-de.json')), fr = JSON.parse(rd('src/strings/fr-fr.json'));
const moStr = { autoTitle: en.photoAutoDlTitle + '?', autoBody: 'Photos from your contacts download when they arrive, up to 10 MB each. You can change this in Settings › Privacy.',
  wifi: en.photoAutoDlWifi, always: en.photoAutoDlAlways, notNow: en.backupNudgeSkip, offWait: 'Waiting for Ana', offTitle: 'Waiting for Ana', offBody: 'Files come directly from Ana’s device. The download continues by itself when Ana is online again.',
  ixiTitle: 'You received your first IXI', ixiBody: 'Your wallet is only on this device. A backup is one file, locked with your password, that brings it back on a new phone.',
  backupNow: en.backupNudgeCta, later: 'Later', micTitle: 'Send voice messages', micBody: 'To record, Spixi needs your microphone. Your phone asks you next. Spixi uses it only while you record.',
  cont: 'Continue', appTitle: 'Before you open Chess', appBody: 'Ana invited you to this app. It runs inside Spixi. Only open apps from people you trust.', open: en.openApp, cancel: en.cancel || 'Cancel',
  payTitle: 'Before you pay', payBody: en.paymentsCannotUndo + ' Check the contact and the amount on the next screen. The small network fee goes to the Ixian network, not to Spixi.' };
const moLang = { de: { title: 'Mit KI übersetzt', body: de.languageAiNote, ok: 'Verstanden', hello: 'Hallo', langTitle: de.language, langs: [['English'], ['Deutsch', 1], ['Français'], ['Русский']] },
  fr: { title: 'Traduit avec l’IA', body: fr.languageAiNote, ok: 'J’ai compris', hello: 'Bonjour', langTitle: fr.language, langs: [['English'], ['Deutsch'], ['Français', 1], ['Русский']] } };
const moCaps = [[en.cap_Storage, en.capx_Storage, 'database'], [en.cap_MultiUser, en.capx_MultiUser, 'users'], [en.cap_TransactionSigning, en.capx_TransactionSigning, 'key']];
writeFileSync(join(HERE, 'moments-render.html'), here('parts-j/page.html').replace('/*@TOKENS@*/', () => tokens)
  .replace('/*@BUTTON_CSS@*/', () => rd('src/styles/components/button.css')).replace('/*@MO_CSS@*/', () => here('parts-j/mo.css'))
  .replace('<!--@MO_MD@-->', () => md(here('MOMENTS.md')))
  .replace('/*@MO_DATA@*/', () => 'const MO = ' + JSON.stringify({ str: moStr, lang: moLang, caps: moCaps, icons: JSON.parse(here('parts-j/icons.json')) }) + ';')
  .replace('/*@MO_JS@*/', () => here('parts-j/mo.js')));

/* art/<scene>.svg — each scene as ONE self-contained animated SVG (background + foreground + its motion CSS) */
const ctx = { ICONS: icons }; vm.createContext(ctx);
vm.runInContext(artJs + '\nthis.WN_ART = WN_ART;', ctx);
const illoCss = rd('src/styles/components/illo.css');
mkdirSync(join(HERE, 'art'), { recursive: true });
let artBytes = 0;
for (const id of copy.slides) {
  const sc = ctx.WN_ART.scene(id);
  const h = id === 'hero' ? 300 : 240;
  const inner = (s, y, hh) => s.replace(/ class="wnL[^"]*"/, '').replace(/^<svg[^>]*?viewBox="([^"]+)"[^>]*>/, (m, vb) => '<svg x="0" y="' + y + '" width="400" height="' + hh + '" viewBox="' + vb + '" preserveAspectRatio="' + (/slice/.test(m) ? 'xMidYMid slice' : 'xMidYMid meet') + '">');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ' + h + '" width="800" height="' + h * 2 + '"><style>' + illoCss + artCss + '</style>'
    + inner(sc.bg, 0, h) + inner(sc.fg, id === 'hero' ? 12 : 0, id === 'hero' ? 252 : 240) + '</svg>';
  artBytes += sc.bg.length + sc.fg.length;
  writeFileSync(join(HERE, 'art', id + '.svg'), svg);
}
console.log('built: whats-new-render.html · whats-new-b-render.html · thread-render.html · art-direction.html · kit-render.html · appearance-render.html · set-render.html · deletedata-render.html · downloads-contributors-render.html · moments-render.html · art/*.svg (six scenes, ' + (artBytes / 1024).toFixed(0) + ' KB of SVG)');
