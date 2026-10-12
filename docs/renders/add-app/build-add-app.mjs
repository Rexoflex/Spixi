/**
 * build-add-app — writes add-app-render.html (same folder): the Apps › "Add app" screen TODAY (a faithful redraw of
 * createAppsAdd with discover:false, the production call in home.html + app_new.html) and two directions, as phone
 * frames in light and dark. READS src/ (never writes it): the glyphs come from src/components/icons.js, the Explore art
 * from IL_ART.explore in src/components/illustrations.js (since #1357 the rocket + bokeh dots — Damir's pick). Colour values are the resolved tokens of
 * src/styles/tokens.css (light = :root, dark = [data-theme="dark"]) — copied into the .t-light / .t-dark blocks below.
 *
 *   node docs/renders/add-app/build-add-app.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const { ICONS } = await import(pathToFileURL(path.join(ROOT, 'src/components/icons.js')).href);

/* ---- the Explore art, exactly as the app builds it — since #1357 (Damir 15:03) the source itself carries the rocket in the
   tile and the bokeh dots (the sparkle is gone from src/), so the body is used as it is ---- */
const ilSrc = fs.readFileSync(path.join(ROOT, 'src/components/illustrations.js'), 'utf8');
const a0 = ilSrc.indexOf('const IL_ART = {');
const a1 = ilSrc.indexOf('\n};', a0);
// eslint-disable-next-line no-eval
const IL_ART = (0, eval)('(' + ilSrc.slice(a0 + 15, a1 + 2) + ')');
const EX = IL_ART.explore;
let exSeq = 0;
function exploreArt() {
  exSeq += 1;
  const b = EX.b.split('@@').join('-x' + exSeq);
  return '<svg class="ex-art" viewBox="' + EX.vb + '" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" style="' + EX.style + '">' + b + '</svg>';
}

const ic = (name, size = 24, cls = '') => {
  const e = ICONS[name];
  if (!e) throw new Error('missing icon ' + name);
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="' + e.v + '" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true">' + e.b + '</svg>';
};

/* ---- copy (the shipped strings, src/strings/en-us.json) ---- */
const S = {
  addApp: 'Add app',
  addLead: 'Add a mini app from a link, a QR code, or a file. Or explore the directory below.',
  addLeadTrim: 'Add a mini app from a link, a QR code, or a file.',
  pasteLink: 'Paste link', scanQr: 'Scan QR', pickFile: 'From file',
  appUrlLabel: 'Mini app link', placeholder: 'https://…', getFromUrl: 'Get app',
  miniAppInfo: 'Mini apps are lightweight web apps that run securely inside Spixi. Only add apps from sources you trust.',
  appUrlInvalid: 'That link or file isn’t a valid mini app.',
  appFetchTimeout: 'The link did not respond. Check your connection and try again.',
  exploreTitle: 'Not sure where to start?', exploreCta: 'Explore Spixi Mini Apps',
};
const URL_OK = 'https://apps.spixi.io/tictactoe/appinfo.spixi';
const URL_BAD = 'apps.spixi.io/tictactoe';

/* ---- the phone frame ---- */
function phone(theme, body, o = {}) {
  return '<div class="ph t-' + theme + (o.kb ? ' has-kb' : '') + '">'
    + '<div class="sb"><span>14:48</span><span class="sb-r">5G <i class="sig"></i> 43%</span></div>'
    + '<div class="tb"><span class="tb-back">' + ic('arrow-left', 24) + '</span><span class="tb-title">' + S.addApp + '</span></div>'
    + '<div class="bd ' + (o.bd || '') + '">' + body + '</div>'
    + (o.kb ? keyboard(o.kb) : '')
    + '<div class="hi"></div></div>';
}
function keyboard(chip) {
  const row = (keys, cls = '') => '<div class="kb-row ' + cls + '">' + keys.split('').map((k) => '<span class="kb-k">' + k + '</span>').join('') + '</div>';
  return '<div class="kb"><div class="kb-strip"><span class="kb-chip">' + ic('copy', 16) + '<span>' + chip + '</span></span></div>'
    + row('qwertyuiop') + row('asdfghjkl', 'kb-r2')
    + '<div class="kb-row"><span class="kb-k kb-w">⇧</span>' + 'zxcvbnm'.split('').map((k) => '<span class="kb-k">' + k + '</span>').join('') + '<span class="kb-k kb-w">⌫</span></div>'
    + '<div class="kb-row"><span class="kb-k kb-w2">?123</span><span class="kb-k">/</span><span class="kb-k kb-sp"></span><span class="kb-k">.</span><span class="kb-k kb-w2 kb-go">Go</span></div></div>';
}
const fig = (inner, cap, sub) => '<figure class="fg">' + inner + '<figcaption><b>' + cap + '</b>' + (sub ? ' · ' + sub : '') + '</figcaption></figure>';
const spinner = '<span class="spin" aria-hidden="true"></span>';

/* ================= TODAY — createAppsAdd({ discover:false }) ================= */
function todayBody(state) {
  const tiles = '<div class="t0-methods">'
    + '<span class="t0-tile"><span class="t0-disc">' + ic('link', 24) + '</span><span class="t0-lab">' + S.pasteLink + '</span></span>'
    + '<span class="t0-tile"><span class="t0-disc">' + ic('scan', 24) + '</span><span class="t0-lab">' + S.scanQr + '</span></span>'
    + '<span class="t0-tile"><span class="t0-disc">' + ic('file-isr', 24) + '</span><span class="t0-lab">' + S.pickFile + '</span></span></div>';
  let field = '';
  if (state === 'error' || state === 'checking') {
    const bad = state === 'error';
    field = '<div class="t0-field"><span class="t0-label">' + S.appUrlLabel + '</span>'
      + '<span class="t0-input' + (bad ? ' is-bad' : '') + '">' + (bad ? URL_BAD : URL_OK) + '</span>'
      + (bad ? '<span class="t0-err">' + S.appUrlInvalid + '</span>' : '')
      + '<span class="btn btn-fill btn-56">' + (state === 'checking' ? spinner : ic('download', 20)) + S.getFromUrl + '</span></div>';
  }
  const info = '<div class="t0-info">' + ic('info-circle', 20) + '<span>' + S.miniAppInfo + '</span></div>';
  return '<p class="t0-lead">' + S.addLead + '</p>' + tiles + field + info;
}

/* ================= A — LINK FIRST ================= */
function aBody(state) {
  const focus = state === 'focus';
  const bad = state === 'error';
  const busy = state === 'checking';
  const val = bad ? URL_BAD : busy ? URL_OK : '';
  const input = '<span class="a-input' + (focus ? ' is-focus' : '') + (bad ? ' is-bad' : '') + '">'
    + ic('link', 20, 'a-input-ic')
    + (val ? '<span class="a-val">' + val + '</span>' : '<span class="a-ph">' + (focus ? '<i class="caret"></i>' : '') + S.placeholder + '</span>')
    + '</span>';
  const err = bad ? '<span class="a-err">' + ic('alert-small', 20) + '<span>' + S.appUrlInvalid + '</span></span>' : '';
  const card1 = '<section class="card a-link"><label class="a-label">' + S.appUrlLabel + '</label>' + input + err
    + '<span class="btn btn-fill btn-56 a-get">' + (busy ? spinner : ic('download', 20)) + S.getFromUrl + '</span></section>';
  const trust = '<p class="a-trust">' + ic('shield-lock', 18) + '<span>' + S.miniAppInfo + '</span></p>';
  const row = (hub, glyph, label, end) => '<span class="a-row"><span class="disc hub-' + hub + '">' + ic(glyph, 20) + '</span><span class="a-row-l">' + label + '</span>' + ic(end, 20, 'a-row-end') + '</span>';
  const card2 = '<section class="card a-ways">'
    + row(8, 'scan', S.scanQr, 'chevron-right')
    + row(10, 'file-isr', S.pickFile, 'chevron-right')
    + row(7, 'apps', S.exploreCta, 'external-link') + '</section>';
  return card1 + trust + card2;
}

/* ================= B — TILES, PREMIUM PASS ================= */
function bBody(state) {
  const open = state === 'checking' || state === 'error';
  const bad = state === 'error';
  const tile = (hub, glyph, label, sel) => '<span class="b-tile' + (sel ? ' is-sel' : '') + '"><span class="disc disc-44 hub-' + hub + '">' + ic(glyph, 22) + '</span><span class="b-lab">' + label + '</span></span>';
  const tiles = '<div class="b-methods">' + tile(7, 'link', S.pasteLink, open) + tile(8, 'scan', S.scanQr) + tile(10, 'file-isr', S.pickFile) + '</div>';
  const field = open ? '<section class="card b-field"><label class="a-label">' + S.appUrlLabel + '</label>'
    + '<span class="a-input' + (bad ? ' is-bad' : '') + '">' + ic('link', 20, 'a-input-ic') + '<span class="a-val">' + (bad ? URL_BAD : URL_OK) + '</span></span>'
    + (bad ? '<span class="a-err">' + ic('alert-small', 20) + '<span>' + S.appFetchTimeout + '</span></span>' : '')
    + '<span class="btn btn-fill btn-56">' + (bad ? ic('download', 20) : spinner) + S.getFromUrl + '</span></section>' : '';
  const trust = '<p class="a-trust">' + ic('shield-lock', 18) + '<span>' + S.miniAppInfo + '</span></p>';
  const banner = '<span class="ex"><span class="ex-t"><span class="ex-title">' + S.exploreTitle + '</span><span class="ex-cta">' + S.exploreCta + ' ' + ic('arrow-right', 20) + '</span></span>' + exploreArt() + '</span>';
  return '<p class="t0-lead">' + S.addLeadTrim + '</p>' + tiles + field + trust + '<div class="b-push"></div>' + banner;
}

const TODAY = [
  fig(phone('light', todayBody('idle'), { bd: 'bd-t0' }), 'Idle', 'light (Damir’s screenshot)'),
  fig(phone('dark', todayBody('idle'), { bd: 'bd-t0' }), 'Idle', 'dark'),
  fig(phone('light', todayBody('error'), { bd: 'bd-t0' }), 'Paste link → bad link', 'light'),
  fig(phone('dark', todayBody('checking'), { bd: 'bd-t0' }), 'Checking the link', 'dark'),
].join('');
const A = [
  fig(phone('light', aBody('idle'), { bd: 'bd-g' }), 'Idle', 'light'),
  fig(phone('dark', aBody('idle'), { bd: 'bd-g' }), 'Idle', 'dark'),
  fig(phone('light', aBody('focus'), { bd: 'bd-g', kb: 'apps.spixi.io/tictactoe/…' }), 'Field tapped', 'keyboard offers the copied link'),
  fig(phone('dark', aBody('checking'), { bd: 'bd-g' }), 'Checking the link', 'dark'),
  fig(phone('light', aBody('error'), { bd: 'bd-g' }), 'Bad link', 'light'),
  fig(phone('dark', aBody('error'), { bd: 'bd-g' }), 'Bad link', 'dark'),
].join('');
const B = [
  fig(phone('light', bBody('idle'), { bd: 'bd-g bd-col' }), 'Idle', 'light'),
  fig(phone('dark', bBody('idle'), { bd: 'bd-g bd-col' }), 'Idle', 'dark'),
  fig(phone('light', bBody('checking'), { bd: 'bd-g bd-col' }), 'Paste link open · checking', 'light'),
  fig(phone('dark', bBody('error'), { bd: 'bd-g bd-col' }), 'Link timed out', 'dark'),
].join('');

const tpl = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
const out = tpl.replace('<!--@@TODAY@@-->', () => TODAY).replace('<!--@@A@@-->', () => A).replace('<!--@@B@@-->', () => B);
fs.writeFileSync(path.join(HERE, 'add-app-render.html'), out);
console.log('wrote add-app-render.html', (out.length / 1024).toFixed(0) + ' KB');
