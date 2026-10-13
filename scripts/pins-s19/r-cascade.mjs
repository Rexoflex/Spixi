/* ==== S19 (R) — a tiny cascade helper for the r-* pins (not a pin module): which declaration WINS for an element in a
 * simulated state. jsdom cannot hover / press / paint a ::before, so the winner is computed the way the browser does it —
 * every style rule in the BUILT document (inside @media blocks too), the selector tested with el.matches() after the
 * simulated state's pseudo-class is removed, the winner = the highest specificity, then the latest rule.
 *   win(el, prop, { hover, pseudo, reduce }) → the winning value ('' when nothing sets it)
 *   · hover: rules with :hover count (the pointer is a mouse: `(hover: hover)` blocks apply); without it they never match
 *   · pseudo: 'before' → only selectors ending ::before, tested on el
 *   · reduce: `prefers-reduced-motion: reduce` blocks apply (else they never do) */
export function cascade(W) {
  const d = W.document;
  const rules = [];
  const walk = (list, media) => {
    for (const r of list) {
      if (r.selectorText) rules.push({ r, media });
      else if (r.cssRules) walk(r.cssRules, r.media ? [...media, String(r.media.mediaText || r.conditionText || '')] : media);
    }
  };
  for (const sh of d.styleSheets) { try { walk(sh.cssRules, []); } catch (e) { /* */ } }
  const splitSel = (s) => { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(' ) depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const spec = (sel) => {
    let s = sel;
    for (let i = 0; i < 5; i++) s = s.replace(/:not\(([^()]*)\)/g, ' $1');
    let a = 0, b = 0, c = 0;
    s = s.replace(/::[\w-]+/g, () => { c++; return ' '; });
    s = s.replace(/#[\w-]+/g, () => { a++; return ' '; });
    s = s.replace(/\[[^\]]*\]/g, () => { b++; return ' '; });
    s = s.replace(/\.[\w-]+/g, () => { b++; return ' '; });
    s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ' '; });
    (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).forEach(() => c++);
    return a * 10000 + b * 100 + c;
  };
  const mediaOk = (media, o) => media.every((m) => {
    if (/prefers-reduced-motion/.test(m)) return !!o.reduce;
    if (/hover:\s*hover/.test(m)) return true;
    if (/prefers-color-scheme/.test(m)) return false;
    return /^\s*$|all|screen/.test(m) && !/max-width|min-width/.test(m);
  });
  const win = (el, prop, o = {}) => {
    let best = null;
    rules.forEach(({ r, media }, idx) => {
      if (!mediaOk(media, o)) return;
      const v = r.style.getPropertyValue(prop) || (prop === 'background-color' ? r.style.getPropertyValue('background') : '');
      if (!v) return;
      for (const sel of splitSel(r.selectorText)) {
        const isPseudo = /::before\s*$/.test(sel);
        if (!!o.pseudo !== isPseudo) continue;
        let t = sel.replace(/::before\s*$/, '');
        if (/:hover/.test(t)) { if (!o.hover) continue; t = t.replace(/:hover/g, ''); }
        if (/::|:active|:focus/.test(t)) continue;
        let m = false; try { m = el.matches(t.trim() || '*'); } catch (e) { m = false; }
        if (!m) continue;
        const sp = spec(sel);
        if (!best || sp > best.sp || (sp === best.sp && idx >= best.idx)) best = { sp, idx, v: v.trim(), sel };
      }
    });
    return best ? best.v : '';
  };
  return { win, rules };
}
