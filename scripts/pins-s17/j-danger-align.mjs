/* ==== #1356 (Damir 2026-10-12 14:11) — Delete data: the Danger zone card's texts start where the rows' texts start ====
 * The rows above carry a 30 px disc + a 16 px gap; the Delete account card had a bare 20 px glyph + a 12 px gap, so its
 * title and line sat 13 px left of the row texts. On the BUILT settings.html (comment-stripped CSS): the glyph has a
 * 5 px padding (a 30 px box, the disc's), the title gap is the rows' 16, the line under it is padded by 30 px + 16, and the
 * card's start padding gives back its 1 px border — so at 360 px the box is 28–58 and both texts start at 74 (measured in
 * Chromium, the #1356 report). Deliberate break: the old `calc(20px + var(--spacing-12))` back → fails. */
export default async function (h) {
  const { ok, readFileSync, join, root, stripCssComments } = h;
  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/settings.html'), 'utf8'));
  const rule = (sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(css); return m ? m[1].replace(/\s+/g, ' ') : ''; };
  const r = {
    glyphBox: /box-sizing: content-box; padding: 5px;/.test(rule('.c-settings-danger__card-title svg')),
    gap: /gap: var\(--spacing-16\);/.test(rule('.c-settings-danger__card-title')),
    sub: /padding-inline-start: calc\(30px \+ var\(--spacing-16\)\);/.test(rule('.c-settings-danger__card-sub')),
    border: /padding-inline-start: calc\(var\(--spacing-12\) - var\(--outline-width-1\)\);/.test(rule('.c-settings-danger__card')),
  };
  ok(Object.values(r).every(Boolean),
    '★ #1356 (Damir 14:11): on Delete data the Danger zone card aligns with the rows — its glyph sits in the disc\'s 30 px box, the 16 px gap, the line under it padded 30 + 16, the border given back — ' + JSON.stringify(r));
}
