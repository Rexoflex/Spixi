/**
 * c-file-tile — the FILE TYPE TILE (★ S20G Q-1, #1414 queue, Damir): ONE builder for the Downloads rows (settings-app.js)
 * and chat info › Files (shared-items.js).
 *
 * createKindTile(name) → span.c-file-tile[data-kind] (aria-hidden): the 44 px tile on its kind gradient (--dl-tile-*),
 *   a white glyph, the format tag (PDF, ZIP) on its corner. Classified by typed-bubbles' fileKind (the chat's own family
 *   table). Decoration only: the row's name is the file name.
 *
 * ★ S20G B-5 (#46 r1): its own module + its own stylesheet (file-tile.css) so a shell that only shows the tile (settings,
 * downloads) links ~2 KB instead of all of shared-items.css (+9–10 KB dead CSS). The W-h gate derives the link from
 * this module: every shell whose bundle code reaches createKindTile must link file-tile.css.
 */
import { icon } from './icons.js';
import { fileKind } from './typed-bubbles.js';   // pure: one file classifier (no typed-bubbles CSS)

export const DL_GLYPH = { image: 'photo', pdf: 'file-text', doc: 'file-text', archive: 'file-zip', audio: 'volume', video: 'player-play', code: 'code', other: 'file-isr' };
export function createKindTile(name) {
  const { family, label } = fileKind(String(name == null ? '' : name));
  const tile = document.createElement('span');
  tile.className = 'c-file-tile';
  tile.dataset.kind = family;
  tile.setAttribute('aria-hidden', 'true');
  tile.append(icon(DL_GLYPH[family] || DL_GLYPH.other, { size: 22 }));
  if (label) {
    const tag = document.createElement('em');
    tag.className = 'c-file-tile__tag';
    tag.textContent = label;
    tile.append(tag);
  }
  return tile;
}
