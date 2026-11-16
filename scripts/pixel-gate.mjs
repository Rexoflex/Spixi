/* ==== P-09 — the PIXEL GATE (NOT a pin module, NOT in smoke, NOT in CI; Playwright / Chromium, lead machine only) ====
 * Proves that a packaged html directory (B) renders EXACTLY like the committed one (A): 0 different pixels on every shot
 * (every shell × light / dark at the Galaxy A52s viewport, sub-pages and a few data states included), and the same CSS
 * rules (a dump of every rule of every stylesheet, inline and linked, recursively) in every loaded page.
 *
 *   PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs \
 *     node scripts/pixel-gate.mjs [--a <htmlDirA>] [--b <htmlDirB>] [--only chat,index~wallet] [--out <dir>] [--shots <dir>] [--repeat N] [--self] [--list]
 *
 *   --a     the reference directory (default: this tree's Spixi/Resources/Raw/html)
 *   --b     the directory under test: a COMPLETE copy with some files transformed (required unless --self / --list)
 *   --only  comma list of shells or shot names (`chat` = every shot of chat.html; `settings~backup` = that shot only)
 *   --out   save, for every failing or unstable shot, both PNG files and a diff image (red = a different pixel)
 *   --self  determinism self-check only: shoot A twice, require 0 px and equal rule dumps between the two runs
 *   --repeat N  shoot A N times per shot (default 2, minimum 2): every A run must equal the first (a stronger self-check)
 *   --shots save, for EVERY shot, A's PNG + its rule dump + the ixian: verbs the shell sent (to look at the states)
 *   --list  print the shot list and exit
 *
 * How a shell is loaded (the same for A and B):
 *   1. The C# load step is simulated: SpixiLocalization.localizeHtml (Spixi/Lang/SpixiLocalization.cs:403-440) runs on
 *      every *.html — each line .NET-Trim()med, empty lines dropped, every *SL{key} replaced by the value of CARRIERS
 *      (below: the en-us language file + the custom strings, platform android, the theme, fixed insets); a key with no
 *      value becomes "" like C# (and is listed once in the output). The other files of the directory are symlinked.
 *   2. Chromium: 412 × 915 CSS px, deviceScaleFactor 2.625, mobile + touch, an Android System WebView UA, colour scheme =
 *      the theme, timezone UTC, locale en-US, Chromium flag --allow-file-access-from-files (so the CSSOM of a linked
 *      file:// sheet is readable). Before any shell script: Date frozen at FIXED_NOW (constructor without arguments and
 *      Date.now), Math.random seeded, a fake bridge (every `ixian:` navigation is recorded, cancelled as C# cancels it,
 *      and answered by the shot's responders with `executeUiCommand(fn,'<b64>',…)` scripts — the Utils.sendUiCommand
 *      shape).
 *   3. Ready = the shell sent its ready verb (`ixian:onload`; intro.html `ixian:introload`). A shell that does not send it
 *      within BOOT_TIMEOUT_MS in A or in B is a BOOT FAILURE (exit 2), never a pass.
 *   4. The shot's steps (pushes / taps), then settle: the responders drained, document.fonts.ready, every <img> loaded
 *      (capped), two frames, a quiet period; then every finite animation / transition is finished and every infinite
 *      loop cancelled BY THE GATE, frames committed; screenshot (Playwright: animations disabled as a belt, caret hidden,
 *      device scale).
 *
 * Proofs per shot: A (run 1) vs A (run 2 … N) = the determinism self-check (a difference = UNSTABLE: the gate cannot judge;
 * never reported as a strip difference) · A vs B = the gate. Pixels: both PNG files are decoded here (node:zlib; IHDR,
 * IDAT, the five filters, 8-bit RGB/RGBA only — anything else fails loud) and every pixel that differs in any channel
 * counts. CSS: the rule dumps must be equal; the first differing rule is printed (sheet, rule path, 200 characters of
 * each side).
 *
 * LIMIT (#46 r1 C-5): the rule dump holds only what Chromium's CSS parser KEEPS — a declaration Chromium drops (a
 * `-webkit-` property it does not support, e.g. `-webkit-touch-callout`, or any invalid one) is not in the CSSOM, so a
 * change to it is invisible here (and in the pixels, which are Chromium's too). GATE 1 (`strip-release --check`) is the
 * byte proof; this gate is the rendering proof for Chromium only.
 *
 * Exit: 0 = every shot 0 px and every rule dump equal · 1 = a difference (pixels, rules or page errors A ≠ B) ·
 *       2 = usage / setup error (A and B the same directory without --self, too), a boot failure, an UNSTABLE shot,
 *       or zero shots compared.
 * The last line is the summary a pin or a doc can quote:
 *   pixel-gate: PASS 50 shots × 0 px · css rules equal on 25 pages (18 shells) · A=<dir> B=<dir> · 412×915@2.625 · <n> s · limit: …
 *
 * Node built-ins + Playwright only (by absolute path, the way the repo's Chromium sweeps import it; never
 * `npx playwright install`). One browser for the whole run, one context per shot. */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, symlinkSync, rmSync, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as zlib from 'node:zlib';
const { inflateSync, deflateSync } = zlib;
/* zlib.crc32 exists from Node 22.2; a table fallback for older Node (only the diff image needs it) */
const CRC_T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = zlib.crc32 || ((b) => { let c = 0xffffffff; for (const x of b) c = CRC_T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.now();

/* ───────────────────────────── arguments ───────────────────────────── */
const argv = process.argv.slice(2);
const usage = (msg) => { console.error('pixel-gate: ' + msg + '\nusage: node scripts/pixel-gate.mjs [--a <htmlDirA>] --b <htmlDirB> [--only a,b] [--out <dir>] [--shots <dir>] [--repeat N] [--self] [--list]'); process.exit(2); };
const opt = { a: join(ROOT, 'Spixi/Resources/Raw/html'), b: null, only: null, out: null, shots: null, self: false, list: false, repeat: 2 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  const val = () => { const v = argv[++i]; if (v == null || v.startsWith('--')) usage(k + ' needs a value'); return v; };
  if (k === '--a') opt.a = resolve(val());
  else if (k === '--b') opt.b = resolve(val());
  else if (k === '--only') opt.only = val().split(',').map((s) => s.trim()).filter(Boolean);
  else if (k === '--out') opt.out = resolve(val());
  else if (k === '--shots') opt.shots = resolve(val());
  else if (k === '--self') opt.self = true;
  else if (k === '--repeat') { opt.repeat = Number(val()); if (!Number.isInteger(opt.repeat) || opt.repeat < 2) usage('--repeat needs an integer ≥ 2'); }
  else if (k === '--list') opt.list = true;
  else usage('unknown argument ' + k);
}
if (!opt.self && !opt.list && !opt.b) usage('--b is required (or --self / --list)');

const shellsOf = (dir) => {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) usage('not a directory: ' + dir);
  return readdirSync(dir).filter((n) => n.endsWith('.html') && statSync(join(dir, n)).isFile()).map((n) => n.slice(0, -5)).sort();
};
const SHELLS = shellsOf(opt.a);
if (!SHELLS.length) usage('no *.html in ' + opt.a);
if (opt.b) {
  const sb = shellsOf(opt.b);
  const onlyA = SHELLS.filter((s) => !sb.includes(s)), onlyB = sb.filter((s) => !SHELLS.includes(s));
  if (onlyA.length || onlyB.length) usage('the shell lists differ — only in A: [' + onlyA.join(', ') + '] · only in B: [' + onlyB.join(', ') + ']');
  // #46 r1 C-9: A against itself proves nothing about B — a usage error, unless the run is the self-check (--self ignores --b)
  if (realpathSync(opt.a) === realpathSync(opt.b) && !opt.self) usage('A and B are the same directory (' + realpathSync(opt.a) + ') — a comparison of a folder with itself proves nothing; use --self for the determinism self-check');
}

/* ───────────────────────────── fixed inputs ───────────────────────────── */
const VIEW = { width: 412, height: 915, dpr: 2.625 };   // Galaxy A52s, native DPR
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36';
const FIXED_NOW = Date.UTC(2026, 10, 13, 9, 41, 0);     // 2026-11-13 09:41:00 UTC (no seasonal logotype window)
const NOW_S = Math.floor(FIXED_NOW / 1000);
const BOOT_TIMEOUT_MS = 15000;
const QUIET_MS = 700;
const THEMES = ['light', 'dark'];

/* .NET String.Trim(): Char.IsWhiteSpace (U+FEFF is NOT white space in .NET; JS trim() would remove it). */
const WS = new Set([0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0x85, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000]);
function csTrim(s) {
  let a = 0, b = s.length;
  while (a < b && WS.has(s.charCodeAt(a))) a++;
  while (b > a && WS.has(s.charCodeAt(b - 1))) b--;
  return s.slice(a, b);
}
/* The C# dictionary: the en-us language file (parsed as SpixiLocalization.loadLanguage does) + the custom strings. */
function languageTable() {
  const t = {};
  const p = join(ROOT, 'Spixi/Resources/Raw/lang/en-us.txt');
  for (let line of readFileSync(p, 'utf8').replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    line = csTrim(line);
    if (line === '' || line.startsWith(';')) continue;
    const k = line.indexOf('=');
    if (k < 0) throw new Error('en-us.txt: a line without "=": ' + line.slice(0, 60));
    t[csTrim(line.slice(0, k))] = csTrim(line.slice(k + 1));
  }
  return t;
}
const LANG = languageTable();
const carriersFor = (theme) => ({
  ...LANG,
  // the custom strings (SpixiLocalization.customStrings + the addCustomString writers), Android values:
  AndroidInsetTop: '24', AndroidInsetBottom: '48', AndroidInsetLeft: '0', AndroidInsetRight: '0',
  SpixiPlatform: 'android', SpixiP1: '0', SpixiThemeName: theme,
  hourCycle: 'h23', devMode: 'false', LaunchBootView: 'welcome',
  LockAuthPending: '0',   // the WinUI value: Android holds a boot spinner for an auth that never comes here (lock.html:987)
});

/* SpixiLocalization.localizeHtml(Stream): StreamReader (BOM dropped) · ReadLine (\r\n, \r, \n) · Trim · skip "" ·
   replace every *SL{key} (key = up to the next "}" on the line) · append line + "\n". */
function localizeHtml(text, table, missing) {
  const out = [];
  for (let line of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    line = csTrim(line);
    if (line === '') continue;
    let guard = 0;
    while (line.includes('*SL{')) {
      if (++guard > 1000) throw new Error('localizeHtml: carrier loop on a line');
      const rest = line.slice(line.indexOf('*SL{') + 4);
      const e = rest.indexOf('}');
      if (e < 0) throw new Error('localizeHtml: "*SL{" without "}" on the same line (C# throws here): ' + line.slice(0, 120));
      const key = rest.slice(0, e);
      let v = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
      if (v == null) { missing.add(key); v = ''; }
      line = line.split('*SL{' + key + '}').join(v);
    }
    out.push(line);
  }
  return out.length ? out.join('\n') + '\n' : '';
}

/* ───────────────────────────── PNG (decode for the count, encode for the diff image) ───────────────────────────── */
function decodePng(buf, tag) {
  const fail = (m) => { throw new Error('PNG ' + tag + ': ' + m); };
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) fail('no PNG signature');
  let pos = 8, w = 0, h = 0, bd = 0, ct = -1, il = 0, end = false;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (data.length !== len) fail('truncated chunk ' + type);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; il = data[12]; if (data[10] !== 0 || data[11] !== 0) fail('unknown compression / filter method'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE' || type === 'tRNS') fail('palette / tRNS images are not supported');
    else if (type === 'IEND') { end = true; break; }
    pos += 12 + len;
  }
  if (!end) fail('no IEND');
  if (!w || !h) fail('no IHDR');
  if (bd !== 8) fail('bit depth ' + bd + ' (only 8 is supported)');
  if (ct !== 2 && ct !== 6) fail('colour type ' + ct + ' (only RGB 2 / RGBA 6)');
  if (il !== 0) fail('interlaced images are not supported');
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== h * (stride + 1)) fail('IDAT size ' + raw.length + ' ≠ ' + h * (stride + 1));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[up + x] : 0, c = x >= bpp && y ? px[up + x - bpp] : 0;
      let r;
      if (f === 0) r = v;
      else if (f === 1) r = v + a;
      else if (f === 2) r = v + b;
      else if (f === 3) r = v + ((a + b) >> 1);
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      else fail('filter type ' + f + ' on row ' + y);
      px[dst + x] = r & 255;
    }
  }
  return { w, h, bpp, px };
}
function encodePng(w, h, rgba) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/* → { px: number of different pixels, box: [x0,y0,x1,y1] | null, diffPng(): Buffer } */
function pixelDiff(pngA, pngB, tag) {
  const A = decodePng(pngA, tag + ' (first)'), B = decodePng(pngB, tag + ' (second)');
  if (A.w !== B.w || A.h !== B.h) return { px: Math.max(A.w * A.h, B.w * B.h), box: [0, 0, Math.max(A.w, B.w) - 1, Math.max(A.h, B.h) - 1], size: `${A.w}×${A.h} ≠ ${B.w}×${B.h}`, diffPng: () => null };
  const n = A.w * A.h, mask = new Uint8Array(n);
  let px = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let i = 0; i < n; i++) {
    const ia = i * A.bpp, ib = i * B.bpp;
    let d = A.px[ia] !== B.px[ib] || A.px[ia + 1] !== B.px[ib + 1] || A.px[ia + 2] !== B.px[ib + 2];
    if (!d && (A.bpp === 4 || B.bpp === 4)) d = (A.bpp === 4 ? A.px[ia + 3] : 255) !== (B.bpp === 4 ? B.px[ib + 3] : 255);
    if (d) { mask[i] = 1; px++; const x = i % A.w, y = (i / A.w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return {
    px, box: px ? [x0, y0, x1, y1] : null,
    diffPng: () => {
      const out = Buffer.alloc(n * 4);
      for (let i = 0; i < n; i++) {
        const ia = i * A.bpp, o = i * 4;
        if (mask[i]) { out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; }
        else { const g = (A.px[ia] * 0.3 + A.px[ia + 1] * 0.59 + A.px[ia + 2] * 0.11) * 0.35 + 165; out[o] = out[o + 1] = out[o + 2] = g; }
        out[o + 3] = 255;
      }
      return encodePng(A.w, A.h, out);
    },
  };
}

/* ───────────────────────────── data (fixed, the same for A and B) ───────────────────────────── */
const PEER = 'addrPeer0000000000000000000000000000000000000000';
const SELF = 'addrSelf0000000000000000000000000000000000000000';
const ADDRESS = '1AbCdEfGhJkLmNpQrStUvWxYz23456789aBcDeFgHiJkLmNoP';
const NAMES = ['Ana Kovač', 'Jonas Weber', 'Mira Novak', 'Sven Berg', 'Lea Horvat', 'Tomaž Kranjc', 'Ivana Petrović', 'Luka Zupan', 'Nina Kos', 'Marko Vidmar', 'Eva Lindqvist', 'Pavel Dvořák'];
const hex = (n, w = 32) => n.toString(16).padStart(w, '0');
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const WORDS = 'the a to and of in is it you that for on with this was are be at have not but what all were we when your can said there use each which how their will up other about out many then them these so some would make like into time has look two more write go see number no way could people than first been call who its now find long down day did get come made may part ok yes sure tomorrow tonight meeting coffee lunch project build release photo video file payment wallet node block transfer send received thanks great awesome perfect'.split(' ');
function sentence(r, n) {
  const w = []; for (let i = 0; i < n; i++) w.push(WORDS[Math.floor(r() * WORDS.length)]);
  let s = w.join(' '); s = s[0].toUpperCase() + s.slice(1);
  if (r() < 0.15) s = s.replace(/^(\S+ \S+)/, '*$1*');
  if (r() < 0.08) s += ' https://example.com/' + w[0];
  if (r() < 0.3) s += ' ' + ['😀', '👍', '🎉', '❤️', '✅'][Math.floor(r() * 5)];
  return s + (r() < 0.7 ? '.' : '?');
}
/* the bridge batch grammar (chat addMessages / home addChats): { strs, items:[{ f, a, r? }] }, long strings interned */
function batchJson(items) {
  const strs = [], idx = new Map();
  return JSON.stringify({ strs, items: items.map(({ f, a, r }) => {
    const aa = a.map((x) => { if (typeof x === 'string' && x.length > 40) { if (!idx.has(x)) { idx.set(x, strs.length); strs.push(x); } return idx.get(x); } return x == null ? null : String(x); });
    return r ? { f, a: aa, r } : { f, a: aa };
  }) });
}
function chatRows(count = 24) {
  const r = rng(42), items = [], texts = new Map();
  let ts = NOW_S - 60 - count * 170;
  for (let i = 0; i < count; i++) {
    ts += Math.floor(170 * (0.3 + r() * 1.4));
    const id = hex(0x100000 + i), mine = r() < 0.45;
    const [addr, nick] = mine ? [SELF, 'Me'] : [PEER, 'Ana Kovač'];
    const k = r();
    const text = k < 0.4 ? sentence(r, 1 + Math.floor(r() * 5)) : k < 0.85 ? sentence(r, 10 + Math.floor(r() * 16)) : sentence(r, 12) + ' ' + sentence(r, 14) + ' ' + sentence(r, 9);
    texts.set(id, [nick, text]);
    let replyTo = '', qn = '', qt = '';
    if (i > 3 && i % 7 === 3) { const prev = [...texts.keys()][Math.floor(r() * (texts.size - 1))]; if (prev && prev !== id) { replyTo = prev; [qn, qt] = texts.get(prev); qt = qt.slice(0, 120); } }
    const item = { f: mine ? 'addMe' : 'addThem', a: [id, addr, nick, '', text, String(ts), 'True', 'True', i < count - 3 ? 'True' : 'False', 'False', 'False', mine ? '' : 'contact', replyTo, '', qn, qt, '', ''] };
    if (i % 5 === 2) item.r = [r() < 0.5 ? 'like:❤️:2;' : 'like:👍:1;like:😂:3;', r() < 0.5 ? 'like:❤️;' : '', ''];
    items.push(item);
  }
  return batchJson(items);
}
function chatListRows(n = 14) {
  const r = rng(1234), items = [];
  const kinds = ['text', 'text', 'text', 'photo', 'reply', 'file', 'payment', 'text', 'call', 'reaction'];
  for (let i = 0; i < n; i++) {
    const addr = 'addr' + hex(0xc000 + i, 44), group = i % 9 === 4;
    const name = group ? 'Group ' + (i + 1) : NAMES[i % NAMES.length];
    const ek = kinds[Math.floor(r() * kinds.length)];
    const ex = ek === 'photo' ? 'Photo' : ek === 'file' ? 'report-2026.pdf' : ek === 'payment' ? 'Payment received' : ek === 'call' ? 'Voice call' : sentence(r, 3 + Math.floor(r() * 14));
    const own = r() < 0.4, unread = !own && r() < 0.3 ? String(1 + Math.floor(r() * 12)) : '0';
    items.push({ f: 'addChat', a: [addr, name, String(NOW_S - i * 977 - Math.floor(r() * 500)), '', r() < 0.3 ? 'true' : 'false', ex, own ? 'read' : '', unread, group ? 'group' : '', 'False', ek, group ? 'Ana' : '', 'False', ''] });
  }
  return batchJson(items);
}
const HOME_ONLOAD = [['selectTab', 'tab1'], ['setAddress', ADDRESS], ['setHideBalance', 'False'], ['setCaps', 'composeSend,hints,updateHelp,hintHelp'], ['setBalance', '1234.56789012', '345.67', 'Me'], ['showWarning', '']];
function walletRows(n = 12) {
  const r = rng(77), calls = [['clearPaymentActivity', 'all']];
  for (let i = 0; i < n; i++) {
    const inb = r() < 0.5, cp = r() < 0.6 ? NAMES[i % NAMES.length] : '1' + hex(0xabcdef + i * 7919, 40).replace(/0/g, 'x');
    calls.push(['addPaymentActivity', hex(0xdead0000 + i, 64), inb ? '1' : '0', cp, String(NOW_S - i * 5400), (r() * 500).toFixed(8), (r() * 120).toFixed(2), i < 2 ? 'false' : 'true']);
  }
  calls.push(['clearPaymentActivityDone'], ['setBalance', '1234.56789012', '345.67', 'Me']);
  return calls;
}
const FILES = ['IMG_20261101_120400.jpg', 'report-2026.pdf', 'notes.txt', 'voice_0012.ogg', 'archive.zip', 'clip.mp4', 'contract.docx', 'scan_0007.png'];
const CHAT_EMPTY = [['onChatScreenReady', PEER], ['setNickname', 'Ana Kovač'], ['setChatMode', '0', '0.00000000', '', 'False'], ['setCaps', 'reply,edit,voice,media'], ['clearMessages', 'false'], ['messagesDone'], ['onChatScreenLoaded'], ['setOnlineStatus', 'Online', '']];
const SETTINGS_CAPS = 'settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications,ignoredRequests,callRingtone,paymentAuth,pushProvider,readReceipts,typing,hideOnline,photoAutoDl,rate,hints,photoPreviews';
const settingsOnload = (theme) => [
  ['setCaps', SETTINGS_CAPS], ['setLastBackup', String(NOW_S - 3 * 86400)],
  ['setNotifEnabled', 'True'], ['setNotifSenderName', 'True'], ['setNotifSounds', 'True'], ['setCallRingtone', 'True'],
  ['setPhotoPreviews', 'True'], ['setHintsOff', 'False'], ['setNotifPushProvider', 'True'], ['setPaymentAuth', 'False'],
  ['setNickname', 'Ana Kovač'], ['setAppearance', theme === 'dark' ? '2' : '1'], ['setLockEnabled', 'False'],
  ['setVersion', '0.9.30'], ['setAddress', ADDRESS], ['setLanguage', 'en-us'],
];

/* ───────────────────────────── the shots ───────────────────────────── */
/* A shot: { name, shell, responders: { verb: (theme) => [[fn, ...args], …] }, steps: async (S) => {} }.
   A responder answers a verb the shell SENDS (longest prefix wins; `onload` = the ready signal). */
const BOOT = {
  chat: { onload: () => CHAT_EMPTY },
  index: { onload: () => [...HOME_ONLOAD, ['addChats', batchJson([])]], 'tab:tab2': () => [['clearPaymentActivity', 'all'], ['clearPaymentActivityDone']] },
  contact_details: {
    onload: () => [['setContext', 'chat'], ['setRelation', 'contact'], ['setCaps', 'composeSend,composeRequest'], ['setAddress', PEER], ['setNickname', 'Ana Kovač'], ['showIndicator', 'true', '0'], ['setContactNotifications', 'True'], ['showCallButton', ''], ['clearRecentActivity']],
    sharedGroups: () => [['setSharedGroups', PEER]], sharedItems: () => [['setSharedItems', '[]']],
  },
  downloads: { onload: () => [['clearFiles'], ...FILES.map((f, i) => ['addFile', f, String(NOW_S - i * 7200)])] },
  wallet_sent: { onload: () => [['setHideBalance', 'False'], ['clearEntries'], ['addEntry', PEER, 'Ana Kovač', 'img/spixiavatar.png', '12.50000000', '', String(NOW_S - 3600), 'receive', 'true'], ['setData', '12.50000000', '0.00010000', String(NOW_S - 3600), 'TX' + hex(1, 62), 'true']] },
  settings: { onload: (theme) => settingsOnload(theme), loadDownloads: () => [['clearFiles'], ...FILES.map((f, i) => ['addFile', f, String(NOW_S - i * 7200), String(18000 + i * 93117)])] },
};
const READY = { intro: 'ixian:introload' };
const tap = (sel) => async (S) => { const ok = await S.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); if (!ok) throw new Error('tap: no element ' + sel); };
function buildShots() {
  const shots = SHELLS.map((s) => ({ name: s, shell: s, responders: BOOT[s] || {} }));
  const extra = [
    // data states: more rendered CSS = a stronger proof
    { name: 'chat~messages', shell: 'chat', responders: { onload: () => [['onChatScreenReady', PEER], ['setSelfNick', 'Me'], ['setNickname', 'Ana Kovač'], ['setChatMode', '0', '0.00000000', '', 'False'], ['setCaps', 'tipResult,composeSend,composeRequest,payRequest,reply,edit,voice,media,savePhoto'], ['setReadReceipts', 'True'], ['clearMessages', 'false'], ['addMessages', chatRows(), 'append'], ['messagesDone'], ['onChatScreenLoaded'], ['setOnlineStatus', 'Online', '']] } },
    { name: 'index~chats', shell: 'index', responders: { ...BOOT.index, onload: () => [...HOME_ONLOAD, ['addChats', chatListRows()]] } },
    { name: 'index~wallet', shell: 'index', responders: { ...BOOT.index, 'tab:tab2': () => walletRows() }, steps: tap('.c-bottomnav__item[data-id="wallet"]') },
    { name: 'contact_details~activity', shell: 'contact_details', responders: { ...BOOT.contact_details, onload: () => [...BOOT.contact_details.onload().filter(([f]) => f !== 'clearRecentActivity'), ['clearRecentActivity'], ...[0, 1, 2, 3].map((i) => ['addPaymentActivity', hex(0xbeef00 + i, 64), i % 2 ? 'Received' : 'Sent', String(NOW_S - i * 86400), (12.5 * (i + 1)).toFixed(8), 'true', i % 2 ? 'in' : 'out'])] } },
    // the sub-pages of the settings shell (in-hub sublevels: SettingsPage pushes the backupInline / downloadsInline caps)
    { name: 'settings~appearance', shell: 'settings', responders: BOOT.settings, steps: tap('.c-settings__row[data-setting-key="chatappearance"]') },
    { name: 'settings~backup', shell: 'settings', responders: BOOT.settings, steps: tap('.c-settings__row[data-setting-key="backup"]') },
    { name: 'settings~downloads', shell: 'settings', responders: BOOT.settings, steps: tap('.c-settings__row[data-setting-key="downloads"]') },
  ].filter((x) => SHELLS.includes(x.shell));
  let all = [...shots, ...extra];
  if (opt.only) {
    all = all.filter((x) => opt.only.includes(x.name) || opt.only.includes(x.shell));
    const unknown = opt.only.filter((o) => !all.some((x) => x.name === o || x.shell === o));
    if (unknown.length) usage('--only: no shot or shell named ' + unknown.join(', '));
  }
  return THEMES.flatMap((theme) => all.map((x) => ({ ...x, theme, id: theme + '/' + x.name })));
}
const SHOTS = buildShots();
if (opt.list) { console.log(SHOTS.map((s) => s.id).join('\n') + '\n' + SHOTS.length + ' shots'); process.exit(0); }

/* ───────────────────────────── prepared directories ───────────────────────────── */
const WORK = mkdtempSync(join(tmpdir(), 'pixel-gate-'));
const MISSING = new Set();
function prepare(src, tag) {
  const dirs = {};
  for (const theme of THEMES) {
    const dst = join(WORK, tag, theme);
    mkdirSync(dst, { recursive: true });
    const table = carriersFor(theme);
    for (const name of readdirSync(src)) {
      const from = join(src, name), to = join(dst, name);
      if (name.endsWith('.html') && statSync(from).isFile()) writeFileSync(to, localizeHtml(readFileSync(from, 'utf8'), table, MISSING));
      else symlinkSync(from, to);
    }
    dirs[theme] = dst;
  }
  return dirs;
}

/* ───────────────────────────── in-page: before any shell script ───────────────────────────── */
function initScript({ now, seed }) {
  /* frozen clock: new Date() / Date() / Date.now() = the fixed instant; new Date(x) unchanged */
  const RealDate = Date;
  function FrozenDate(...a) {
    if (!new.target) return new RealDate(now).toString();
    return a.length ? new RealDate(...a) : new RealDate(now);
  }
  FrozenDate.prototype = RealDate.prototype;
  Object.defineProperty(RealDate.prototype, 'constructor', { value: FrozenDate, writable: true, configurable: true });
  FrozenDate.now = () => now; FrozenDate.parse = RealDate.parse; FrozenDate.UTC = RealDate.UTC;
  Object.setPrototypeOf(FrozenDate, RealDate);
  window.Date = FrozenDate;
  /* seeded Math.random (mulberry32) */
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  /* the fake bridge: JS → C# = location.href = 'ixian:…' — record, cancel (C# cancels too), hand to Node */
  const G = window.__PG = { sent: [] };
  navigation.addEventListener('navigate', (e) => {
    const u = e.destination && e.destination.url;
    if (!u || !u.startsWith('ixian:')) return;
    G.sent.push(u);
    if (e.cancelable) e.preventDefault();
    try { window.__pgSend(u); } catch (err) { /* not exposed yet */ }
  });
}
const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const uiCommand = (fn, args) => 'executeUiCommand(' + fn + args.map((a) => (a == null ? ',null' : ",'" + b64(a) + "'")).join('') + ');';

/* in-page: every rule of every stylesheet, in order, recursively */
function dumpRules() {
  const out = [];
  const sheets = [...document.styleSheets].map((s) => ['doc', s]).concat([...(document.adoptedStyleSheets || [])].map((s) => ['adopted', s]));
  sheets.forEach(([kind, s], si) => {
    const owner = s.ownerNode ? s.ownerNode.nodeName.toLowerCase() : kind;
    const label = `#${si} ${owner}${s.href ? ' ' + s.href.split('/').pop() : ''}`;
    out.push([label, '', `media=${s.media ? s.media.mediaText : ''}${s.disabled ? ' DISABLED' : ''}`]);
    let rules;
    try { rules = s.cssRules; } catch (e) { out.push([label, '!', 'UNREADABLE: ' + e.message]); return; }
    const walk = (list, path) => {
      for (let i = 0; i < list.length; i++) {
        const r = list[i], p = path + i;
        const kids = r.cssRules && r.cssRules.length ? r.cssRules : null;
        if (r.styleSheet) { out.push([label, p, r.cssText]); try { walk(r.styleSheet.cssRules, p + '>'); } catch (e) { out.push([label, p, 'UNREADABLE import: ' + e.message]); } continue; }
        if (!kids) { out.push([label, p, r.cssText]); continue; }
        const head = r.constructor.name + ' ' + (r.selectorText != null ? r.selectorText + ' { ' + r.style.cssText + ' }' : r.cssText.slice(0, r.cssText.indexOf('{')).trim());
        out.push([label, p, head]);
        walk(kids, p + '.');
      }
    };
    walk(rules, '');
  });
  return out;
}

/* ───────────────────────────── Playwright ───────────────────────────── */
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('pixel-gate: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs (' + e.message + ')'); rmSync(WORK, { recursive: true, force: true }); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(browser, dir, shot) {
  const ctx = await browser.newContext({
    viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr, isMobile: true, hasTouch: true,
    userAgent: UA, colorScheme: shot.theme, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'no-preference',
  });
  const errors = [], answers = [];
  try {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message || e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
    const push = async (calls) => { for (const [fn, ...a] of calls) { try { await page.evaluate(uiCommand(fn, a)); } catch (e) { errors.push('push ' + fn + ': ' + String(e.message).split('\n')[0].slice(0, 160)); } } };
    const responders = shot.responders || {};
    await page.exposeFunction('__pgSend', (cmd) => {
      const verb = cmd.slice(6);
      const keys = Object.keys(responders).filter((k) => verb === k || verb.startsWith(k + ':')).sort((x, y) => y.length - x.length);
      if (keys.length) answers.push(Promise.resolve().then(() => push(responders[keys[0]](shot.theme))));
    });
    await page.addInitScript(initScript, { now: FIXED_NOW, seed: 20261113 });
    const drain = async () => { for (let i = 0; i < 50; i++) { const n = answers.length; await Promise.all(answers); await sleep(40); if (answers.length === n) return; } };
    const url = pathToFileURL(join(dir, shot.shell + '.html')).href;
    await page.goto(url, { waitUntil: 'load', timeout: BOOT_TIMEOUT_MS });
    const ready = READY[shot.shell] || 'ixian:onload';
    const booted = await page.waitForFunction((v) => window.__PG && window.__PG.sent.includes(v), ready, { timeout: BOOT_TIMEOUT_MS, polling: 25 }).then(() => true, () => false);
    if (!booted) return { boot: false, errors, why: 'no ' + ready + ' within ' + BOOT_TIMEOUT_MS + ' ms' };
    await drain();
    if (shot.steps) { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await shot.steps({ page, push }); }
    const settleOnce = async () => {
      await drain();
      await page.evaluate(async () => {
        await document.fonts.ready;
        const pending = [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }));
        await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 2000))]);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
    };
    await settleOnce();
    await sleep(QUIET_MS);
    await settleOnce();
    /* Stop every animation ourselves and let the compositor commit BEFORE the capture. A finite one is finished (its
       end state); an infinite loop is cancelled (the base style). Measured (2026-11-13): leaving the infinite loops to
       Playwright's `animations: 'disabled'` alone was NOT deterministic — the contributors heart (.il.ct-l .wn-bob →
       ctBob, infinite alternate, illo.css:112/127) differed by ~99 000 px between two runs of the same directory, and
       the twinkles of the empty chat list by 1 px: the cancel landed on the main thread but the captured frame was
       not always the committed one. Up to 3 rounds: a step can start a new animation. */
    const stopped = await page.evaluate(async () => {
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let n = 0;
      for (let round = 0; round < 3; round++) {
        const live = document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'paused' || a.pending);
        if (!live.length) break;
        for (const a of live) {
          try { const t = a.effect && a.effect.getComputedTiming(); if (t && Number.isFinite(t.endTime)) a.finish(); else a.cancel(); n++; } catch (e) { try { a.cancel(); n++; } catch (e2) { /* keep going */ } }
        }
        await frames();
        await new Promise((r) => setTimeout(r, 120));
        await frames();
      }
      await document.fonts.ready;
      await frames();
      return n;
    });
    void stopped;
    const rules = await page.evaluate(dumpRules);
    const png = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'device', type: 'png' });
    const sent = await page.evaluate(() => window.__PG.sent.slice());
    return { boot: true, png, rules, errors, sent };
  } finally { await ctx.close().catch(() => {}); }
}

/* The rules proof. Every differing entry is classified: COMMENT-ONLY = the two texts are equal once every comment is
   removed and white space collapsed. Measured 2026-11-13 (Chromium of Playwright 1.5x): a comment INSIDE a declaration
   whose value holds var() survives in the CSSOM — the value is kept as its original text until substitution — so
   cssText (and getPropertyValue) still shows it; a comment strip then changes the serialization and nothing that is
   drawn. Such entries still FAIL the gate (the dump must be equal: the decision to waive them is the lead's), but the
   report names them as comment-only. The first entry printed is the first NON-comment-only one when one exists. */
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').replace(/\s*([,;:{}()])\s*/g, '$1').trim();
function ruleDiff(ra, rb) {
  const n = Math.max(ra.length, rb.length);
  let total = 0, commentOnly = 0, first = null, firstReal = null;
  for (let i = 0; i < n; i++) {
    const a = ra[i], b = rb[i];
    if (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) continue;
    total++;
    const co = !!(a && b && a[0] === b[0] && a[1] === b[1] && noComments(a[2]) === noComments(b[2]));
    if (co) commentOnly++;
    const where = a ? `sheet ${a[0]} · rule ${a[1] === '' ? '(sheet header)' : a[1]}` : `sheet ${b[0]} · rule ${b[1]}`;
    const text = `entry ${i} of ${ra.length} / ${rb.length} — ${where}${co ? ' [COMMENT-ONLY]' : ''}\n      A: ${a ? JSON.stringify(a[2].slice(0, 200)) : '(none)'}\n      B: ${b ? JSON.stringify(b[2].slice(0, 200)) : '(none)'}`;
    if (!first) first = text;
    if (!co && !firstReal) firstReal = text;
    if (ra.length !== rb.length && !co) break;   // the entries are out of step from here on
  }
  return total ? { total, commentOnly, text: firstReal || first } : null;
}
const firstRuleDiff = (ra, rb) => { const d = ruleDiff(ra, rb); return d ? d.text : null; };
const rulesKey = (r) => JSON.stringify(r);

/* ───────────────────────────── run ───────────────────────────── */
let code = 0;
const rows = [];
const bootFails = [], unstable = [], diffs = [], ruleDiffs = [], errDiffs = [], unreadable = [];
let compared = 0;
const ruleEqualPages = new Set(), ruleEqualShells = new Set();
const save = (shot, tag, buf) => { if (!opt.out || !buf) return; mkdirSync(opt.out, { recursive: true }); writeFileSync(join(opt.out, shot.id.replace(/[\/~]/g, '_') + '.' + tag + '.png'), buf); };
try {
  const dirA = prepare(opt.a, 'a');
  const dirB = opt.self ? null : prepare(opt.b, 'b');
  console.log(`pixel-gate: ${SHOTS.length} shots · A=${opt.a}${opt.self ? ' (self-check only)' : ' · B=' + opt.b} · A shot ${opt.repeat}× per shot · ${VIEW.width}×${VIEW.height}@${VIEW.dpr} · Date=${new Date(FIXED_NOW).toISOString()}`);
  console.log('pixel-gate: carriers with no value (→ "" as in C#): ' + ([...MISSING].sort().map((k) => '*SL{' + k + '}').join(' ') || 'none'));
  let browser;
  try { browser = await pw.chromium.launch({ args: ['--allow-file-access-from-files', '--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text'] }); }
  catch (e) { console.error('pixel-gate: Chromium did not start — ' + e.message.split('\n')[0]); throw Object.assign(new Error('setup'), { exit: 2 }); }
  try {
    for (const shot of SHOTS) {
      const t = Date.now();
      const a1 = await shoot(browser, dirA[shot.theme], shot);
      const b = dirB ? await shoot(browser, dirB[shot.theme], shot) : null;
      let a2 = await shoot(browser, dirA[shot.theme], shot);
      for (let k = 2; k < opt.repeat && a2.boot; k++) {   // --repeat: every further A run must equal the first one too
        const ak = await shoot(browser, dirA[shot.theme], shot);
        if (!ak.boot || pixelDiff(a1.png, ak.png, shot.id + ' A/A' + (k + 1)).px || rulesKey(a1.rules) !== rulesKey(ak.rules)) { a2 = ak; break; }
      }
      const row = { id: shot.id, ms: Date.now() - t };
      if (!a1.boot || !a2.boot || (b && !b.boot)) {
        row.state = 'BOOT FAIL';
        row.note = [!a1.boot || !a2.boot ? 'A: ' + (a1.why || a2.why) : null, b && !b.boot ? 'B: ' + b.why : null].filter(Boolean).join(' · ') + ((b && b.errors.length) ? ' · B errors: ' + b.errors.slice(0, 2).join(' | ') : '');
        bootFails.push(row); rows.push(row); console.log(`  ✗ ${shot.id.padEnd(34)} BOOT FAIL  ${row.note}`); continue;
      }
      if (opt.shots) {
        mkdirSync(opt.shots, { recursive: true });
        const f = join(opt.shots, shot.id.replace(/[\/~]/g, '_'));
        writeFileSync(f + '.png', a1.png);
        writeFileSync(f + '.rules.txt', a1.rules.map((x) => x.join(' \u2502 ')).join('\n') + '\n');
        writeFileSync(f + '.sent.txt', a1.sent.join('\n') + '\n' + (a1.errors.length ? '\nerrors:\n' + a1.errors.join('\n') + '\n' : ''));
      }
      for (const [tag, r] of [['A', a1], ['B', b]]) if (r && r.rules.some((x) => x[1] === '!')) unreadable.push(shot.id + ' ' + tag + ': ' + r.rules.find((x) => x[1] === '!')[2]);
      const self = pixelDiff(a1.png, a2.png, shot.id + ' A/A');
      const selfRules = rulesKey(a1.rules) === rulesKey(a2.rules);
      if (self.px || !selfRules) {
        row.state = 'UNSTABLE';
        row.note = (self.px ? `A vs A: ${self.px} px box ${JSON.stringify(self.box)}` : '') + (!selfRules ? ' A vs A rules: ' + firstRuleDiff(a1.rules, a2.rules) : '');
        unstable.push(row); rows.push(row);
        save(shot, 'A1', a1.png); save(shot, 'A2', a2.png); save(shot, 'A-self-diff', self.diffPng());
        console.log(`  ? ${shot.id.padEnd(34)} UNSTABLE   ${row.note}`); continue;
      }
      if (!b) { row.state = 'stable'; row.px = 0; rows.push(row); compared++; ruleEqualPages.add(shot.id); ruleEqualShells.add(shot.shell); console.log(`  ✓ ${shot.id.padEnd(34)} A = A (0 px, ${a1.rules.length} rule entries)  ${row.ms} ms`); continue; }
      compared++;
      const d = pixelDiff(a1.png, b.png, shot.id + ' A/B');
      const rd = rulesKey(a1.rules) === rulesKey(b.rules) ? null : ruleDiff(a1.rules, b.rules);
      const errA = a1.errors.join('\n'), errA2 = a2.errors.join('\n'), errB = b.errors.join('\n');
      row.px = d.px; row.box = d.box;
      if (d.px) { diffs.push(row); save(shot, 'A', a1.png); save(shot, 'B', b.png); save(shot, 'diff', d.diffPng()); }
      if (rd) ruleDiffs.push({ id: shot.id, ...rd });
      else { ruleEqualPages.add(shot.id); ruleEqualShells.add(shot.shell); }
      if (errA === errA2 && errA !== errB) errDiffs.push({ id: shot.id, a: a1.errors, b: b.errors });
      rows.push(row);
      console.log(`  ${d.px || rd ? '✗' : '✓'} ${shot.id.padEnd(34)} ${String(d.px).padStart(7)} px${d.box ? ' box ' + JSON.stringify(d.box) : ''}${d.size ? ' size ' + d.size : ''} · rules ${rd ? `DIFFER (${rd.total} entr${rd.total === 1 ? 'y' : 'ies'}, ${rd.commentOnly} comment-only)` : 'equal (' + a1.rules.length + ')'}  ${row.ms} ms`);
    }
  } finally { await browser.close().catch(() => {}); }

  /* ── report ── */
  const secs = Math.round((Date.now() - T0) / 1000);
  if (bootFails.length) { console.log('\nBOOT FAILURES (an error, never a pass):'); for (const r of bootFails) console.log('  ' + r.id + ' — ' + r.note); }
  if (unstable.length) { console.log('\nUNSTABLE (A shot twice differs — the gate cannot judge these; NOT a strip difference):'); for (const r of unstable) console.log('  ' + r.id + ' — ' + r.note); }
  if (unreadable.length) { console.log('\nUNREADABLE stylesheets (the rules proof cannot see them):'); for (const u of unreadable) console.log('  ' + u); }
  if (diffs.length) {
    console.log('\nPIXEL DIFFERENCES (A vs B):\n  shot                                different px   bounding box [x0,y0,x1,y1] (device px)');
    for (const r of diffs) console.log('  ' + r.id.padEnd(36) + String(r.px).padStart(12) + '   ' + JSON.stringify(r.box));
    if (opt.out) console.log('  PNG files (A, B, diff) in ' + opt.out);
  }
  if (ruleDiffs.length) { console.log('\nCSS RULE DUMPS DIFFER (A vs B) — per page: differing entries (comment-only), then the first differing rule (the first NOT comment-only one when there is one):'); for (const r of ruleDiffs) console.log(`  ${r.id}: ${r.total} entr${r.total === 1 ? 'y' : 'ies'} (${r.commentOnly} comment-only) · ${r.text}`); }
  if (errDiffs.length) { console.log('\nPAGE ERRORS DIFFER (A vs B; A was the same in both runs):'); for (const r of errDiffs) console.log('  ' + r.id + '\n    A: ' + JSON.stringify(r.a.slice(0, 3)) + '\n    B: ' + JSON.stringify(r.b.slice(0, 3))); }

  const where = 'A=' + opt.a + (opt.self ? ' (self)' : ' B=' + opt.b);
  const tail = `${VIEW.width}×${VIEW.height}@${VIEW.dpr} · ${secs} s`;
  if (bootFails.length || unstable.length || unreadable.length || compared === 0) {
    code = 2;
    console.log(`\npixel-gate: ERROR ${bootFails.length} boot failure(s) · ${unstable.length} unstable · ${unreadable.length} unreadable sheet(s) · ${compared} of ${SHOTS.length} shots compared · ${where} · ${tail}`);
  } else if (diffs.length || ruleDiffs.length || errDiffs.length) {
    code = 1;
    console.log(`\npixel-gate: FAIL ${diffs.length} of ${compared} shots differ (max ${Math.max(0, ...diffs.map((r) => r.px))} px) · css rules differ on ${ruleDiffs.length} page(s)${ruleDiffs.length ? ` (${ruleDiffs.filter((r) => r.commentOnly === r.total).length} of them comment-only)` : ''} · page errors differ on ${errDiffs.length} · ${where} · ${tail}`);
  } else {
    console.log(`\npixel-gate: PASS ${compared} shots × 0 px · css rules equal on ${ruleEqualPages.size} pages (${ruleEqualShells.size} shells) · ${where} · ${tail} · limit: the rule dump holds only what Chromium's parser keeps (a property it drops is invisible here); GATE 1 is the byte proof`);
  }
} catch (e) {
  if (e.exit) code = e.exit;
  else { console.error('pixel-gate: setup error — ' + (e.stack || e.message)); code = 2; }
} finally {
  rmSync(WORK, { recursive: true, force: true });
}
process.exit(code);
