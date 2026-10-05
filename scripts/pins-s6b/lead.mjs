/* Session 6b, the lead — pins for:
 *   #1203 (Damir, Android 2026-10-05): a TALL picture ran out of its chat-info grid cell. The tile's square comes from
 *         `aspect-ratio` alone, so an in-flow `height: 100%` img resolved to its natural height and grew the grid row.
 *         jsdom has no layout, so this is a CSS-rule pin (comments stripped) on the SOURCE and the BUILT css: the tile img is
 *         taken out of the flow (position absolute + inset 0) and still covers (object-fit: cover); the tile keeps 1 / 1,
 *         overflow hidden and position relative (the img's containing block). */
export default async function (h) {
  const { ok, root, stripCssComments, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const rule = (css, sel) => {
    const flat = stripCssComments(css);
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = flat.match(new RegExp('(?:^|[}\\s])' + esc + '\\s*\\{([^}]*)\\}'));
    return m ? m[1] : '';
  };
  const check = (css) => {
    const img = rule(css, '.c-shared__tile img');
    const tile = rule(css, '.c-shared__tile');
    return {
      imgOut: /position:\s*absolute/.test(img) && /inset:\s*0/.test(img),
      imgCovers: /object-fit:\s*cover/.test(img) && /width:\s*100%/.test(img) && /height:\s*100%/.test(img),
      tileSquare: /aspect-ratio:\s*1\s*\/\s*1/.test(tile) && /overflow:\s*hidden/.test(tile) && /position:\s*relative/.test(tile),
    };
  };
  const src = check(rd('src/styles/components/shared-items.css'));
  let built = {};
  try { built = check(rd('Spixi/Resources/Raw/html/contact_details.html')); } catch (e) { built = { err: String(e) }; }
  ok(Object.values(src).every(Boolean) && Object.values(built).every(Boolean) && Object.keys(built).length === 3,
    '★★ #1203 (Damir, Android): a chat-info media tile stays a 1 : 1 square for a TALL picture — the img is out of the flow (absolute, inset 0) and covers, the tile keeps aspect-ratio 1 / 1 + overflow hidden + position relative; source AND built — src=' + JSON.stringify(src) + ' built=' + JSON.stringify(built));

  /* ★ #1203 r1 (B-2): the absolute picture painted OVER the tile's own inset outline → no visible keyboard focus on a
     photo tile. The ring is the tile's ::after, a positioned box LATER than the img and above it (z-index ≥ the img's),
     the focus colour as a BORDER (forced-colors keeps borders, drops box-shadows), click-through; the tile's own outline
     is off (no double ring on a glyph tile) and the tile still rises above its neighbours. CSS-rule pin, source + built. */
  const ring = (css) => {
    const focus = rule(css, '.c-shared__tile:focus-visible');
    const after = rule(css, '.c-shared__tile:focus-visible::after');
    const img = rule(css, '.c-shared__tile img');
    const zOf = (b) => { const m = /z-index:\s*(-?\d+)/.exec(b); return m ? Number(m[1]) : 0; };
    return {
      tileOutlineOff: /outline:\s*none/.test(focus) && /z-index:\s*1/.test(focus),
      afterBox: /content:\s*''/.test(after) && /position:\s*absolute/.test(after) && /inset:\s*1px/.test(after),
      afterRing: /border:\s*var\(--outline-width-2[^;]*solid var\(--outline-focus/.test(after) && !/box-shadow/.test(after),
      afterAboveImg: zOf(after) >= 1 && zOf(after) > zOf(img),
      clickThrough: /pointer-events:\s*none/.test(after),
    };
  };
  const rSrc = ring(rd('src/styles/components/shared-items.css'));
  let rBuilt = {};
  try { rBuilt = ring(rd('Spixi/Resources/Raw/html/contact_details.html')); } catch (e) { rBuilt = { err: String(e) }; }
  ok(Object.values(rSrc).every(Boolean) && Object.values(rBuilt).every(Boolean) && Object.keys(rBuilt).length === 5,
    '★ #1203 r1 (B-2): keyboard focus on a chat-info PHOTO tile is visible — the ring is the tile\'s ::after (absolute, inset 1 px, a 2 px --outline-focus BORDER, z-index above the absolute picture, pointer-events none), the tile\'s own outline off; source AND built — src=' + JSON.stringify(rSrc) + ' built=' + JSON.stringify(rBuilt));

  /* ★ #46 r3 MINOR-2: the desktop reply button shows on KEYBOARD focus only — a rove-focusable row takes focus on a mouse
     click, and a `:focus-within` reveal kept the button up after the mouse left. CSS-rule pin (source + built chat.html). */
  {
    const reveal = (css) => {
      const flat = stripCssComments(css);
      return {
        rowVisible: /:root\[data-desktop\] \.c-bubble-row:focus-visible > \.c-bubble-row__reply/.test(flat),
        btnVisible: /:root\[data-desktop\] \.c-bubble-row:focus-visible > \.c-bubble-row__reply,\s*:root\[data-desktop\] \.c-bubble-row__reply:focus-visible\s*\{\s*opacity:\s*1;\s*pointer-events:\s*auto;/.test(flat),
        noFocusWithin: !/\.c-bubble-row:focus-within > \.c-bubble-row__reply/.test(flat),
      };
    };
    const a = reveal(rd('src/styles/components/message-bubble.css'));
    const b = reveal(rd('Spixi/Resources/Raw/html/chat.html'));
    ok(Object.values(a).every(Boolean) && Object.values(b).every(Boolean),
      '★ #1198 (#46 r3 MINOR-2): the desktop reply button is revealed by keyboard focus only (row :focus-visible or the button\'s own :focus-visible), never by :focus-within (a mouse click focuses the row) — src=' + JSON.stringify(a) + ' built=' + JSON.stringify(b));
  }
}
