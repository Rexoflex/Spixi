/* ==== S20G Q-1 — chat info › Files in the Downloads look: ONE file type tile, ONE type scale ====
 * On the BUILT shells (jsdom):
 *   (1) CHAT INFO (contact_details.html, setSharedItems): every Files row leads with the shared tile — span.c-file-tile
 *       [data-kind] (pdf / archive / other …), aria-hidden, a glyph, the format tag (PDF; none without an extension) —
 *       the name is .c-file-name (semibold 15.5 — the cascade), the meta .c-file-meta (13.5) and keeps "Not on this
 *       device" for a file that is not local; the row's accessible name is unchanged (the label + the meta).
 *   (2) DOWNLOADS (settings.html): the SAME builder — the row's tile is .c-file-tile with the same kind + tag for the same
 *       name (byte-identical outerHTML to chat info's tile for that name), the name / meta carry the shared classes.
 *   (3) ONE CSS: the tile rules live in file-tile.css only (★ S20G B-5: not in shared-items.css, not in settings-app.css),
 *       and they SHIP in all three built shells (contact_details, settings, downloads); settings + downloads no longer
 *       ship shared-items.css (its .c-shared rules are absent from the built shell); the tag stands on its card's ground
 *       (Downloads sets --file-tile-ground to the settings card).
 *   (4) ★ S20G C-m4: a long name (quarterly-financial-report-final.pdf) in chat info › Files is SPLIT by fillFileName —
 *       .c-file-name.c-fname = a stem span (ellipsis) + a tail span (the last 4 stem characters + ".pdf", flex none),
 *       together the full name, the full name in title.
 *   (5) ★ S20G NIT (#46 r1): the tag's ground follows the row — the built contact_details sheet sets --file-tile-ground
 *       to the card's hover ground on .c-shared__row--file:hover (inside the hover media gate) and to the pressed ground
 *       on :active.
 * DELIBERATE BREAKS (S20G B3 Q-1 report): ① sharedFileRow back to icon('file-isr') → (1) + (2) fail; ② the file-tile.css
 * link removed from settings.html → (3) fails (and the W-h gate); ③ settings-app.js back to its own tile builder
 * (.c-settings-dl__tile) → (2) fails; ④ (C-m4) sharedFileRow `t.textContent = item.label` instead of fillFileName → (4)
 * fails; ⑤ (B-5) settings.html links shared-items.css again → (3) fails; ⑥ (NIT) the row's --file-tile-ground rules
 * removed → (5) fails. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const { boot } = b2Kit(h);
  const r = {}, n = {};
  let s = null, s2 = null;
  try {
    s = await boot('contact_details.html', { wait: 1500 });
    const T = Math.floor(Date.now() / 1000);
    s.push('setContext', 'chat'); s.push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); s.push('setNickname', 'Ana');
    await sleep(300);
    const f = (i, name, local) => ['cf' + i, 0, 'file', name, 2400000, T - i * 90000, local, '', 1];
    s.push('setSharedItems', JSON.stringify([f(1, 'report.pdf', 1), f(2, 'backup.zip', 0), f(3, 'README', 1), f(4, 'quarterly-financial-report-final.pdf', 1)]));
    await sleep(400);
    const cs = (e) => s.W.getComputedStyle(e);
    const all = [...s.d.querySelectorAll('.c-shared__row--file')];
    const rows = all.slice(0, 3);
    /* (4) C-m4: the long name is split into stem + tail */
    const LONG = 'quarterly-financial-report-final.pdf';
    const lr = all.find((x) => x.getAttribute('aria-label') && x.getAttribute('aria-label').startsWith(LONG + ','));
    const ln = lr && lr.querySelector('.c-file-name');
    const st = ln && ln.querySelector(':scope > .c-fname__stem'), tl = ln && ln.querySelector(':scope > .c-fname__tail');
    n.long = ln ? { cls: ln.className, kids: ln.children.length, stem: st && st.textContent, tail: tl && tl.textContent, title: ln.title,
      stemCut: st && [cs(st).overflow, cs(st).textOverflow, cs(st).whiteSpace].join(' '), tailNone: tl && cs(tl).flexShrink, flex: cs(ln).display } : null;
    r.long = !!n.long && /\bc-fname\b/.test(n.long.cls) && n.long.kids === 2 && n.long.stem + n.long.tail === LONG && n.long.tail === 'inal.pdf'
      && n.long.title === LONG && n.long.stemCut === 'hidden ellipsis nowrap' && n.long.tailNone === '0' && n.long.flex === 'flex';
    n.ci = rows.map((row) => {
      const t = row.querySelector(':scope > .c-file-tile'), nm = row.querySelector('.c-file-name'), mt = row.querySelector('.c-file-meta');
      return { kind: t && t.dataset.kind, tag: t && (t.querySelector('.c-file-tile__tag') || {}).textContent || '-', hidden: t && t.getAttribute('aria-hidden'), svg: !!(t && t.querySelector('svg')),
        name: nm && [cs(nm).fontSize, cs(nm).fontWeight, nm.textContent].join(' '), meta: mt && [cs(mt).fontSize, mt.textContent].join(' '), aria: row.getAttribute('aria-label') };
    });
    r.chatInfo = n.ci.length === 3 && n.ci.map((x) => x.kind + ':' + x.tag).join() === 'pdf:PDF,archive:ZIP,other:-'
      && n.ci.every((x) => x.hidden === 'true' && x.svg && /^15\.5px (600|var\(--font-weight-semibold\)) /.test(x.name || '') && /^13\.5px /.test(x.meta || ''))
      && /Not on this device$/.test(n.ci[1].meta) && !/Not on this device/.test(n.ci[0].meta)
      && n.ci[1].aria === 'backup.zip, ' + n.ci[1].meta.replace(/^13\.5px /, '');
    const ct = rows[0] && rows[0].querySelector('.c-file-tile');
    const ciTile = ct ? ct.outerHTML : null;
    /* (2) Downloads */
    s2 = await boot('settings.html', { wait: 1500 });
    s2.push('setCaps', 'settingsApply,downloadsInline'); s2.push('setNickname', 'Damir');
    await sleep(250);
    const b = s2.d.querySelector('[data-setting-key="downloads"]'); if (b) b.click(); await sleep(80);
    s2.push('clearFiles'); s2.push('addFile', 'report.pdf', String(T - 10), '2400000');
    await sleep(250);
    const row = s2.d.querySelector('.c-settings-dl__row[data-name="report.pdf"]');
    const dt = row && row.querySelector('.c-file-tile');
    n.dl = { tile: !!dt && !!ciTile && dt.outerHTML === ciTile, old: !!(row && row.querySelector('.c-settings-dl__tile')), name: !!(row && row.querySelector('.c-settings-dl__name.c-file-name')), meta: !!(row && row.querySelector('.c-settings-dl__time.c-file-meta')),
      ground: s2.W.getComputedStyle(s2.d.querySelector('.c-settings-dl')).getPropertyValue('--file-tile-ground').trim() };
    r.downloads = n.dl.tile === true && !n.dl.old && n.dl.name && n.dl.meta && n.dl.ground === 'var(--surface-settings-card)';
    /* (3) one CSS, shipped in the three shells */
    const unc = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '');
    const sa = unc(readFileSync(join(root, 'src/styles/components/settings-app.css'), 'utf8')), si = unc(readFileSync(join(root, 'src/styles/components/shared-items.css'), 'utf8'));
    const ft = readFileSync(join(root, 'src/styles/components/file-tile.css'), 'utf8');
    const built = ['contact_details.html', 'settings.html', 'downloads.html'].map((x) => readFileSync(join(root, 'Spixi/Resources/Raw/html', x), 'utf8'));
    n.css = { saTile: /\.c-settings-dl__tile|\.c-settings-dl__tag|\.c-file-tile/.test(sa), siTile: /\.c-file-tile|\.c-file-name \{|\.c-file-meta \{/.test(si),
      ftTile: /\.c-file-tile\[data-kind="pdf"\] \{ background: var\(--dl-tile-pdf\); \}/.test(ft) && /\.c-file-tile__tag \{/.test(ft) && /\.c-file-name \{/.test(ft) && /\.c-file-meta \{/.test(ft),
      shipped: built.map((x) => /\.c-file-tile\[data-kind="pdf"\]/.test(x) && /\.c-file-tile__tag \{/.test(x) && /\.c-file-name \{/.test(x)),
      /* B-5: the .c-shared section rules (shared-items.css) ship in contact_details only */
      shared: built.map((x) => /\.c-shared__chips \{/.test(x)) };
    r.css = !n.css.saTile && !n.css.siTile && n.css.ftTile && n.css.shipped.every(Boolean) && n.css.shared.join() === 'true,false,false';
    /* (5) NIT: the tag ground follows the row's hover / pressed ground (the built contact_details sheet) */
    const cd = built[0];
    n.hov = { hover: /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.c-shared__row--file:hover \{ --file-tile-ground: var\(--surface-card-hover\); \}/.test(cd),
      active: /\.c-shared__row--file:active \{ --file-tile-ground: var\(--surface-card-pressed\); \}/.test(cd) };
    r.hover = n.hov.hover && n.hov.active;
    r.noErr = s.errs.length === 0 && s2.errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    n.errs = s.errs.concat(s2.errs).slice(0, 3);
  } catch (e) { r.threw = e.message; } finally { for (const x of [s, s2]) if (x) { try { x.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, '★ S20G Q-1: ' + m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, n }).slice(0, 1400));
  c('chatInfo', '(1) chat info › Files rows lead with the shared kind tile (PDF / ZIP tag, none without an extension; aria-hidden), the name 15.5 semibold, the meta 13.5 with "Not on this device" kept; the row name unchanged');
  c('downloads', '(2) the Downloads row builds the SAME tile (identical markup for the same name) and carries the shared name / meta classes; the tag stands on the settings card');
  c('css', '(3) the tile CSS lives in file-tile.css only and ships in contact_details, settings and downloads; settings + downloads no longer ship shared-items.css (B-5)');
  c('long', '(4) C-m4: a long name in chat info › Files splits into the ellipsized stem + the kept tail (extension), the full name in title');
  c('hover', '(5) NIT: the format tag stands on the row\'s hover / pressed ground (--file-tile-ground follows the row)');
  c('noErr', 'no page error');
}
