/* ==== S18 D1 (S17 walk DL-SCREEN, Damir 2026-10-12 17:17: "From: TempestNova777Tempest…" ran off the screen) ====
 * On the BUILT settings.html (jsdom, phone path), Account › Downloads with a 64-character sender picked in the From sheet:
 *   · the From chip carries the FULL "From: <name>" in its title AND its accessible name (the text content; no aria-label
 *     that could hold a cut copy), while the visible label is the one text carrier;
 *   · the rule chain (jsdom has no layout, so the cascade is read, not measured) lets the chip SHRINK into the 360 px row:
 *     flex-shrink ≥ 1, min-width 0, a max-width cap, nowrap — and the LABEL clips: max-width, overflow hidden, text-overflow
 *     ellipsis, nowrap; the kind chips stay flex: none (they keep their size, the From chip gives way); the chevron never
 *     shrinks. A flex row whose only shrinkable item has min-width 0 can never be wider than its box (CSS Flexbox §9.7).
 *   · the row arithmetic at 360 px: the box is 360 − 2 × 16 px padding, so a 64-char label (≈ 7 px a glyph at 14 px) of
 *     ≈ 450 px is wider than the row — only the shrink + clip keep it in.
 * Deliberate breaks (S18 report): `flex: none` back on the From chip → the chip clause fails; the label's text-overflow
 * dropped → the label clause fails; the `title` line dropped → the name clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const NAME = 'TempestNova777TempestNova777TempestNova777TempestNova777Tempest7';   // 64 characters
  let s = null;
  const r = {};
  try {
    s = await K.boot('settings.html', { wait: 1200 });
    const { W, d, push } = s;
    r.len = NAME.length === 64;
    push('setCaps', 'settingsApply,downloadsInline');
    push('setNickname', 'Damir');
    await sleep(250);
    const hub = d.querySelector('[data-setting-key="downloads"]');
    if (hub) hub.click();
    await sleep(250);
    const T = Math.floor(Date.now() / 1000);
    push('clearFiles');
    push('addFile', 'a.pdf', String(T - 60), '2048');
    push('addFile', 'b.jpg', String(T - 120), '4096');
    await sleep(150);
    push('setDownloadSenders', JSON.stringify([['a.pdf', NAME, 's1'], ['b.jpg', 'Ana', 's2']]));
    await sleep(100);
    const chip = d.querySelector('.c-settings-dl__from-btn');
    if (chip) chip.click();
    await sleep(120);
    const opt = [...d.querySelectorAll('.c-settings__opt')].find((o) => ((o.querySelector('.c-settings__opt-label') || {}).textContent || '') === NAME);
    if (opt) opt.click();
    await sleep(450);
    const lab = chip && chip.querySelector('.c-settings-dl__from-label');
    const full = 'From: ' + NAME;
    r.picked = !!chip && chip.hasAttribute('data-active');
    r.name = !!lab && lab.textContent === full && chip.title === full && !chip.hasAttribute('aria-label') && chip.textContent.trim() === full
      && !chip.hasAttribute('aria-labelledby');
    /* the rule chain */
    const cs = (el) => W.getComputedStyle(el);
    const c = chip ? cs(chip) : {};
    const shrink = parseFloat(c.flexShrink || (c.flex || '').split(' ')[1]);
    r.chip = !!chip && shrink >= 1 && /^0(px)?$/.test(c.minWidth) && /%|px$/.test(c.maxWidth) && c.maxWidth !== 'none' && c.whiteSpace === 'nowrap';
    r.chipDetail = r.chip || JSON.stringify({ flex: c.flex, flexShrink: c.flexShrink, minWidth: c.minWidth, maxWidth: c.maxWidth, ws: c.whiteSpace });
    const l = lab ? cs(lab) : {};
    r.label = !!lab && /^0(px)?$/.test(l.minWidth) && l.maxWidth === '100%' && l.overflow === 'hidden' && l.textOverflow === 'ellipsis' && l.whiteSpace === 'nowrap';
    r.labelDetail = r.label || JSON.stringify({ minWidth: l.minWidth, maxWidth: l.maxWidth, overflow: l.overflow, to: l.textOverflow, ws: l.whiteSpace });
    const kind = d.querySelector('.c-settings-dl__kinds');
    const svg = chip && chip.querySelector('svg');
    r.others = !!kind && /^none$|^0 0 auto$/.test(cs(kind).flex || 'none') && !!svg && (cs(svg).flex === 'none' || cs(svg).flexShrink === '0');
    /* the row box at 360 px vs the label's natural width */
    const row = d.querySelector('.c-settings-dl__controls');
    const pad = row ? cs(row) : {};
    const box = 360 - parseFloat(pad.paddingLeft || pad.paddingInlineStart || '16') - parseFloat(pad.paddingRight || pad.paddingInlineEnd || '16');
    r.wouldOverflow = full.length * 7 > box;   // the case is real: without the shrink + clip the chip leaves the screen
    if (r.chipDetail === true) delete r.chipDetail;
    if (r.labelDetail === true) delete r.labelDetail;
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S18 D1 (DL-SCREEN): a 64-character sender in the From chip stays inside the 360 px row — the chip shrinks (flex-shrink, min-width 0, a max-width cap, nowrap), the label clips with an ellipsis (max-width, overflow hidden, ellipsis, nowrap), the kind chips and the chevron keep their size; the FULL "From: <name>" stays in the title and the accessible name — ' + JSON.stringify(r));
}
