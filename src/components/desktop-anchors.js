/**
 * Desktop overlay anchoring (Batch C, #256 M6) — the desktop demo's PROVEN
 * recipe (desktop.html:1127-1162 context menus · :1244-1258 attach popover)
 * promoted to a shared component so the production shells get the same
 * grammar without forking the demo layer.
 *
 * PRESENTATION-ONLY: the #56 overlay stack / host / dismissal grammar and the
 * #205 a11y wiring (focus trap, focus restore, Esc, scrim) are untouched — we
 * only TAG ([data-dt-anchor]) and inline-POSITION a sheet the moment it mounts;
 * overlay.css's :root[data-desktop] block carries the visual variants. The
 * money sheet's locks are JS-side (lightDismiss/escDismiss) and unaffected.
 *
 * Everything NO-OPS when :root[data-desktop] is absent — mobile untouched.
 *
 * attachContextMenuAnchors({ host, rows }) → detach()
 *   Right-click (contextmenu) on an element matching `rows` records the
 *   pointer; the NEXT `.c-sheet` mounting into `host` that contains a
 *   `.c-msgmenu` (message menu AND chats-row menu both use it) within 600ms is
 *   tagged [data-dt-anchor="menu"], positioned at the pointer / source-row
 *   bottom edge, and the source row highlights ([data-dt-ctx-source]) until
 *   the sheet leaves the DOM. A menu opened any OTHER way (long-press,
 *   keyboard) has no recent contextmenu → presents as the centered dialog,
 *   deliberately (the demo's 600ms rule).
 *
 * anchorSheetAbove(sheet, trigger, { host, width }) → sheet
 *   Tags an already-open sheet as [data-dt-anchor="up"] — a popover rising
 *   from a trigger (the composer ⊕ attach grid), left-aligned with it.
 */
export function isDesktopPresentation() {
  return document.documentElement.hasAttribute('data-desktop');
}

const CTX_FRESH_MS = 600;   // demo rule: only a just-right-clicked menu anchors
const CTX_MENU_W = 300;     // demo dropdown width (desktop.html:1150)

/* Damir 2026-07-12 (#268): desktop CONTEXTUAL menus (right-click dropdown ·
 * composer ⊕ popover) carry NO backdrop wash — the anchored menu + the source
 * highlight are the affordance; a full-viewport dim reads modal. The scrim
 * ELEMENT stays (outside-click dismissal, the #56 stack/a11y grammar, Esc —
 * all untouched): overlay.js mounts it as the sheet's previous sibling, we
 * only TAG it and overlay.css makes it transparent. Centered dialogs/modals
 * keep their wash. */
function clearScrimFor(sheet) {
  const prev = sheet.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains('c-scrim')) prev.dataset.dtClear = '';
}

export function attachContextMenuAnchors({ host = document.body, rows = '.c-bubble-row, .c-chatlist-item' } = {}) {
  if (!isDesktopPresentation()) return () => {};
  let ctx = null;    // { x, y, row, at } — recorded at contextmenu time (capture)
  let open = null;   // { sheet, row } — the open dropdown + its highlighted source row

  const onCtx = (e) => {
    const row = e.target.closest(rows);
    if (row) ctx = { x: e.clientX, y: e.clientY, row, at: Date.now() };
  };
  host.addEventListener('contextmenu', onCtx, true);

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.removedNodes) {
        if (open && n === open.sheet) {
          delete open.row.dataset.dtCtxSource;
          open = null;
        }
      }
      for (const n of m.addedNodes) {
        if (!n.classList || !n.classList.contains('c-sheet')
          || !n.querySelector || !n.querySelector('.c-msgmenu')) continue;
        if (!ctx || Date.now() - ctx.at > CTX_FRESH_MS) continue;   // not pointer-opened → centered dialog
        n.dataset.dtAnchor = 'menu';
        clearScrimFor(n);                                           // #268: no backdrop wash on anchored menus
        const fr = host.getBoundingClientRect();
        const rr = ctx.row.getBoundingClientRect();
        n.style.width = CTX_MENU_W + 'px';
        n.style.left = Math.round(Math.max(8, Math.min(ctx.x - fr.left, (fr.width || 1e4) - CTX_MENU_W - 8))) + 'px';
        // adjacent to the SOURCE — dropping from the row's bottom edge (06d ②)
        n.style.top = Math.round(Math.max(8, Math.min((rr.bottom || ctx.y) - fr.top + 4, (fr.height || 1e4) - 420))) + 'px';
        ctx.row.dataset.dtCtxSource = '';
        open = { sheet: n, row: ctx.row };
        ctx = null;
      }
    }
  });
  mo.observe(host, { childList: true });

  return () => {
    host.removeEventListener('contextmenu', onCtx, true);
    mo.disconnect();
    if (open) { delete open.row.dataset.dtCtxSource; open = null; }
  };
}

export function anchorSheetAbove(sheet, trigger, { host = document.body, width = 380 } = {}) {
  if (!isDesktopPresentation() || !sheet || !trigger) return sheet;
  sheet.dataset.dtAnchor = 'up';
  clearScrimFor(sheet);                                             // #268: no backdrop wash on the ⊕ popover
  const fr = host.getBoundingClientRect();
  const r = trigger.getBoundingClientRect();
  sheet.style.left = Math.max(8, r.left - fr.left) + 'px';
  sheet.style.top = 'auto';
  sheet.style.bottom = Math.max(8, (fr.bottom || 0) - r.top + 8) + 'px';
  sheet.style.width = width + 'px';
  return sheet;
}
