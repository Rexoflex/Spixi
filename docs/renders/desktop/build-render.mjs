#!/usr/bin/env node
/* build-render.mjs — builds desktop-render.html (one self-contained page) from parts/ + the tree.
   Reads: ../../../src/styles/tokens.css (the real tokens, inlined as-is)
          ../../../src/components/icons.js (the real icon set)
          ../../../src/assets/fonts/sora-latin-wght-normal.woff2 (the wordmark face)
          img/*.webp (the v1 screenshots) and the *.md docs in this folder (rendered as HTML).
   Run from the repo root:  node docs/renders/desktop/build-render.mjs
   No dependency outside Node. Writes only docs/renders/desktop/desktop-render.html. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const rd = (p) => readFileSync(p, 'utf8');
const b64 = (p) => readFileSync(p).toString('base64');

const tokens = rd(join(root, 'src/styles/tokens.css'));
const { ICONS } = await import(pathToFileURL(join(root, 'src/components/icons.js')).href);
const sora = b64(join(root, 'src/assets/fonts/sora-latin-wght-normal.woff2'));
const kitJs = rd(join(here, 'parts/kit.js'));
const extraN = (kitJs.match(/var EXTRA = \{([\s\S]*?)\n  \};/)[1].match(/^\s+'?[\w-]+'?:/gm) || []).length;

/* a small Markdown subset → HTML (headings, paragraphs, lists, tables, quotes, rules, code, bold, italics, links) */
function inline(s) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = s.split(/(`[^`]+`)/g);
  return parts.map((p) => {
    if (/^`[^`]+`$/.test(p)) return '<code>' + esc(p.slice(1, -1)) + '</code>';
    let t = esc(p);
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
    t = t.replace(/\{k:([^}]+)\}/g, (m, k) => '<span class="kk">' + k.split('+').map((x) => '<span class="k">' + x + '</span>').join('') + '</span>');
    return t;
  }).join('');
}
function md(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  let out = '', i = 0;
  const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.min(4, m[1].length + 1); out += `<h${n}>${inline(m[2])}</h${n}>\n`; i++; continue; }
    if (/^---+\s*$/.test(l)) { out += '<hr>\n'; i++; continue; }
    if (isTable(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const row = (r) => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = row(l); i += 2;
      let t = '<div class="tw"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
      while (i < lines.length && isTable(lines[i])) { t += '<tr>' + row(lines[i]).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>'; i++; }
      out += t + '</tbody></table></div>\n'; continue;
    }
    if (/^>\s?/.test(l)) { let q = []; while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; } out += '<blockquote>' + inline(q.join(' ')) + '</blockquote>\n'; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l); let items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let it = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) { it += ' ' + lines[i].trim(); i++; }
        items.push(it);
      }
      out += (ordered ? '<ol>' : '<ul>') + items.map((x) => '<li>' + inline(x) + '</li>').join('') + (ordered ? '</ol>' : '</ul>') + '\n'; continue;
    }
    let p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|---|\s*([-*]|\d+\.)\s)/.test(lines[i]) && !isTable(lines[i])) { p.push(lines[i].trim()); i++; }
    out += '<p>' + inline(p.join(' ')) + '</p>\n';
  }
  return out;
}

let page = rd(join(here, 'parts/page.html'));
const scripts = ['data.js', 'kit.js', 'np.js', 'dir-a.js', 'dir-b.js', 'dir-c.js', 'page.js']
  .filter((f) => existsSync(join(here, 'parts', f))).map((f) => '/* ---- parts/' + f + ' */\n' + rd(join(here, 'parts', f))).join('\n');
const fill = {
  TOKENS: tokens,
  TOKSIZE: Math.round(tokens.length / 1024) + ' KB',
  SORA: sora,
  PAGECSS: rd(join(here, 'parts/page.css')),
  KITCSS: rd(join(here, 'parts/kit.css')),
  EXTRAN: String(extraN),
  V1A: b64(join(here, 'img/v1-chats.webp')),
  V1B: b64(join(here, 'img/v1-wallet.webp')),
  ICONS: JSON.stringify(ICONS),
  SCRIPTS: scripts.replace(/<\/script/gi, '<\\/script')
};
page = page.replace(/\{\{MD:([\w.-]+)\}\}/g, (m, f) => existsSync(join(here, f)) ? md(rd(join(here, f))) : '<p class="muted">(' + f + ' is missing)</p>');
page = page.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in fill ? fill[k] : m));
/* the repo copy is a full document (opens from disk in standards mode); --artifact prints the body-only form */
const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + page + '\n</html>\n';
writeFileSync(join(here, 'desktop-render.html'), doc);
if (process.argv.includes('--artifact')) writeFileSync(process.argv[process.argv.indexOf('--artifact') + 1], page);
console.log('desktop-render.html · ' + Math.round(page.length / 1024) + ' KB · icons ' + Object.keys(ICONS).length + ' + ' + extraN + ' extras');
