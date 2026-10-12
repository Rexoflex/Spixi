/* ==== #1359 (Damir 2026-10-12, Add app = Direction B WITHOUT the Explore banner) + #1362 (the selected Paste link tile) ====
 * On the BUILT index.html (jsdom) through the real path (Apps tab › topbar "Add app" → openAppsAdd, the in-shell takeover),
 * and on the BUILT app_new.html (the desktop pane page):
 *   · the screen sits on the settings ground (home: the takeover body · app_new: the scroller under the topbar);
 *   · three tiles Paste link · Scan QR · From file, each a settings card with a hub disc whose fill resolves (computed) to
 *     --disc-hub-7 · -8 · -10 in that order — three DIFFERENT fills, none the old neutral disc (--surface-neutral-02);
 *     the Paste-link disc's svg IS the `link` glyph (#710 — R1-M1: the smoke #710 clause was vacuous);
 *   · no Explore banner (no .c-apps-explore, no exploreTitle / exploreCta text) and no Discover block with discover:false;
 *   · the lead is the trimmed addLead; the trust line is a caption with the shield-lock glyph + miniAppInfo (no grey box);
 *   · Paste link → the field (a settings card) is shown and placed AFTER the tiles; the tile carries aria-expanded=true +
 *     data-selected (aria-controls = the field) and its rule-resolved ring / label ink are the action tokens; a 2nd tap keeps
 *     the field open and the tile selected (focus goes to the input, bound to the label by for/id);
 *   · showUrlError (bad link, then timeout) → the error line shows the text AND the alert-small glyph (the glyph survives the
 *     text change), the input is aria-invalid + aria-describedby the line; typing clears all three;
 *   · setScannedData (setAddUrl) and showUrlError (setAddError) on a FRESH mount also open the field and select the tile.
 * Deliberate breaks (#1359 report): Scan's hub 8 → 7 → the fill clause fails; the link tile's glyph 'link' → 'world' →
 * linkGlyph fails; the light hover back to the row-hover fill → hoverLifts fails; the Explore banner appended → the no-banner
 * clause fails; openAddField not marking data-selected → the paste clause fails; setAddError writing textContent on the
 * whole line → the error-glyph clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';

const LEAD = 'Add a mini app from a link, a QR code, or a file.';
const TRUST = 'Mini apps are lightweight web apps that run securely inside Spixi. Only add apps from sources you trust.';
const BAD = 'That link or file isn’t a valid mini app.';
const TIMEOUT = 'The link did not respond. Check your connection and try again.';
const URL = 'https://apps.spixi.io/tictactoe/appinfo.spixi';

export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = aKit(h);
  const enUS = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));

  /* the shared reads — computed values (jsdom keeps the var() reference unresolved, so the TOKEN NAME is the fill) */
  const fillOf = (W, el) => { if (!el) return ''; const c = W.getComputedStyle(el); return String(c.background || '') + ' ' + String(c.backgroundImage || ''); };
  const hubOf = (W, el) => { const m = fillOf(W, el).match(/var\(--disc-hub-(\d+)\)/); return m ? +m[1] : null; };
  const tokenVal = (W, name) => String(W.getComputedStyle(W.document.documentElement).getPropertyValue(name) || '').trim();
  const sameGlyph = (W, svg, name) => !!svg && svg.innerHTML === W.SpixiIcons.icon(name).innerHTML;
  const statics = (W, d, scope, groundEl) => {
    const add = scope.querySelector('.c-apps-add');
    const tiles = add ? [...add.querySelectorAll('.c-apps-add__methods > .c-apps-add__method')] : [];
    const hubs = tiles.map((t) => hubOf(W, t.querySelector('.c-apps-add__method-icon')));
    const fills = hubs.map((n) => (n == null ? '' : tokenVal(W, '--disc-hub-' + n)));
    const trust = add && add.querySelector('.c-apps-add__trust');
    const txt = scope.textContent || '';
    return {
      ground: !!groundEl && /var\(--surface-settings-ground\)/.test(W.getComputedStyle(groundEl).backgroundColor + ' ' + W.getComputedStyle(groundEl).background),
      tiles: tiles.map((t) => t.dataset.method).join(',') === 'link,scan,file'
        && tiles.every((t) => /var\(--surface-settings-card\)/.test(W.getComputedStyle(t).backgroundColor + ' ' + W.getComputedStyle(t).background)),
      fills: hubs.join(',') === '7,8,10' && new Set(fills).size === 3 && fills.every((f) => /linear-gradient/.test(f))
        && tiles.every((t) => !/surface-neutral/.test(fillOf(W, t.querySelector('.c-apps-add__method-icon')))),
      glyphWhite: tiles.every((t) => /255, 255, 255|#fff/i.test(W.getComputedStyle(t.querySelector('.c-apps-add__method-icon')).color)),
      /* ★ #710 (R1-M1): the Paste-link tile's disc wears the rendered `link` glyph — not world (the Language row's) */
      linkGlyph: !!add && sameGlyph(W, add.querySelector('.c-apps-add__method[data-method="link"] .c-apps-add__method-icon svg'), 'link')
        && !sameGlyph(W, add.querySelector('.c-apps-add__method[data-method="link"] .c-apps-add__method-icon svg'), 'world'),
      noBanner: !scope.querySelector('.c-apps-explore') && !scope.querySelector('.c-apps-add__discover')
        && !txt.includes(enUS.exploreCta || 'Explore Spixi Mini Apps') && !txt.includes(enUS.exploreTitle || 'Not sure where to start?'),
      lead: enUS.addLead === LEAD && !!add && (add.querySelector('.c-apps-add__lead') || {}).textContent === LEAD,
      trust: !!trust && sameGlyph(W, trust.querySelector('svg'), 'shield-lock') && trust.textContent === TRUST
        && !/var\(--surface-neutral/.test(W.getComputedStyle(trust).backgroundColor + ' ' + W.getComputedStyle(trust).background),
    };
  };
  /* ★ #46 R1-M2: the tile's hover, read from the CSSOM (jsdom matches no :hover) — @media blocks walked. Light hover
     keeps the card fill (no background in an unscoped :hover rule) and lifts one elevation step (--_lift → --elevation-2,
     which the base and the selected box-shadow both read); dark keeps its row-hover fill; pressed keeps the pressed fill. */
  const hoverRule = (W, add) => {
    const all = [];
    const walk = (rules) => { for (const x of rules) { if (x.cssRules && !x.selectorText) walk(x.cssRules); else if (x.selectorText) all.push(x); } };
    for (const sh of W.document.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
    const bySel = (re) => all.filter((x) => x.selectorText.split(',').some((t) => re.test(t.trim())));
    const hov = bySel(/^\.c-apps-add__method:hover$/);
    const darkHov = bySel(/^\[data-theme=['"]?dark['"]?\] \.c-apps-add__method:hover$/);
    const press = bySel(/^\.c-apps-add__method:active$/);
    const tile = add && add.querySelector('.c-apps-add__method');
    const link = add && add.querySelector('.c-apps-add__method[data-method="link"]');
    const sel = bySel(/^\.c-apps-add__method\[data-selected\]$/).map((x) => x.style.getPropertyValue('box-shadow')).join(' ');
    /* re-based in the S18 smoke (#882 card rule): the hover paints the CARD pair in both themes + lifts; no dark-only
       override; pressed = the card pressed fill */
    return hov.length > 0 && hov.every((x) => /^var\(--surface-card-hover\)$/.test(x.style.getPropertyValue('background').trim()))
      && hov.some((x) => x.style.getPropertyValue('--_lift').trim() === 'var(--elevation-2)')
      && darkHov.length === 0
      && press.some((x) => /var\(--surface-card-pressed\)/.test(x.style.getPropertyValue('background')))
      && !!tile && /var\(--_lift\)/.test(W.getComputedStyle(tile).boxShadow) && /var\(--_lift\)/.test(sel) && !!link;
  };
  const tileState = (add) => {
    const link = add.querySelector('.c-apps-add__method[data-method="link"]');
    const field = add.querySelector('.c-apps-add__field');
    return { link, field, open: !!field && !field.hidden, sel: !!link && link.getAttribute('aria-expanded') === 'true' && link.hasAttribute('data-selected') };
  };
  const errState = (W, add, text) => {
    const err = add.querySelector('.c-apps-add__error');
    const input = add.querySelector('.c-apps-add__input');
    const svgs = err ? err.querySelectorAll('svg') : [];
    return !!err && !err.hidden && (err.textContent || '').trim() === text && svgs.length === 1 && sameGlyph(W, svgs[0], 'alert-small')
      && input.getAttribute('aria-invalid') === 'true' && input.getAttribute('aria-describedby') === err.id && !!err.id;
  };

  /* ===================== home.html (index.html) — the real path ===================== */
  let s = null;
  const r = {};
  try {
    s = await K.boot('index.html', { wait: 1400 });
    const { d, W, push } = s;
    const openAdd = async () => {
      const nav = d.querySelector('.c-bottomnav__item[data-id="apps"]');
      if (nav) nav.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleep(60);
      const act = [...d.querySelectorAll('#apps-topbar button')].find((b) => /Add app/.test(b.textContent || ''));
      if (act) act.click();
      await sleep(120);
      return d.querySelector('.wallet-takeover .c-apps-add');
    };
    const add = await openAdd();
    const over = add && add.closest('.wallet-takeover');
    const st = add ? statics(W, d, over, add.parentElement) : { mounted: false };
    Object.assign(r, Object.fromEntries(Object.entries(st).map(([k, v]) => ['home.' + k, v])));
    r['home.hoverLifts'] = hoverRule(W, add);
    /* before: closed, not selected, the tile controls the field */
    const t0 = add ? tileState(add) : {};
    r['home.before'] = !!t0.link && !t0.open && t0.link.getAttribute('aria-expanded') === 'false' && !t0.link.hasAttribute('data-selected')
      && t0.link.getAttribute('aria-controls') === (t0.field && t0.field.id) && !!t0.field.id;
    /* Paste link → open, AFTER the tiles, selected, the ring + label ink rule-resolved, focus in the labelled input */
    if (t0.link) t0.link.click();
    await sleep(30);
    const t1 = add ? tileState(add) : {};
    const methods = add && add.querySelector('.c-apps-add__methods');
    const input = add && add.querySelector('.c-apps-add__input');
    const label = add && add.querySelector('.c-apps-add__label');
    const cs = t1.link ? W.getComputedStyle(t1.link) : null;
    r['home.paste'] = !!t1.open && !!t1.sel && !!methods && methods.nextElementSibling === t1.field
      && !!(methods.compareDocumentPosition(t1.field) & W.Node.DOCUMENT_POSITION_FOLLOWING)
      && /var\(--outline-action-default\)/.test(cs ? cs.boxShadow : '')
      && /var\(--text-action-default\)/.test(W.getComputedStyle(t1.link.querySelector('.c-apps-add__method-label')).color)
      && /var\(--surface-settings-card\)/.test(W.getComputedStyle(t1.field).backgroundColor + ' ' + W.getComputedStyle(t1.field).background)
      && !!label && label.htmlFor === input.id && d.activeElement === input
      && !!input.parentElement.querySelector('.c-apps-add__input-icon') && sameGlyph(W, input.parentElement.querySelector('svg'), 'link');
    /* a 2nd tap only focuses — the field never closes */
    input.blur();
    t1.link.click();
    await sleep(30);
    const t2 = tileState(add);
    r['home.secondTap'] = t2.open && t2.sel && d.activeElement === input;
    /* the shell's error hook: a bad link, then a timeout — the glyph survives the text change */
    push('showUrlError', 'url');
    await sleep(30);
    const bad = errState(W, add, BAD);
    push('showUrlError', 'timeout');
    await sleep(30);
    r['home.error'] = bad && errState(W, add, TIMEOUT) && tileState(add).sel;
    input.value = 'h';
    input.dispatchEvent(new W.Event('input', { bubbles: true }));
    const err = add.querySelector('.c-apps-add__error');
    r['home.errorClears'] = err.hidden && !input.hasAttribute('aria-invalid') && !input.hasAttribute('aria-describedby');
    /* setAddUrl on a FRESH mount (the QR answer) also opens + selects */
    push('closeAddApp');
    await sleep(60);
    const add2 = await openAdd();
    const fresh = add2 ? tileState(add2) : {};
    const wasClosed = !!add2 && add2 !== add && !fresh.open && !fresh.sel;
    push('setScannedData', URL);
    await sleep(30);
    const t3 = add2 ? tileState(add2) : {};
    r['home.scanSelects'] = wasClosed && t3.open && t3.sel && add2.querySelector('.c-apps-add__input').value === URL;
  } catch (e) { r['home.threw'] = e.message; }
  finally { if (s && s.close) s.close(); }

  /* ===================== app_new.html — the desktop pane page ===================== */
  let a = null;
  try {
    a = await K.boot('app_new.html', { wait: 1400 });
    const { d, W, push } = a;
    const scroll = d.getElementById('add-scroll');
    const add = scroll && scroll.querySelector('.c-apps-add');
    const st = add ? statics(W, d, scroll, scroll) : { mounted: false };
    Object.assign(r, Object.fromEntries(Object.entries(st).map(([k, v]) => ['app_new.' + k, v])));
    const t0 = add ? tileState(add) : {};
    const closed = !!t0.link && !t0.open && !t0.sel;
    /* setAddError on a FRESH mount (the C# showUrlError push) opens the field and selects the tile */
    push('showUrlError', 'timeout');
    await sleep(30);
    const t1 = add ? tileState(add) : {};
    r['app_new.errorSelects'] = closed && t1.open && t1.sel && errState(W, add, TIMEOUT);
  } catch (e) { r['app_new.threw'] = e.message; }
  finally { if (a && a.close) a.close(); }

  ok(Object.keys(r).length >= 20 && Object.values(r).every((v) => v === true),
    '★ #1359 (Damir 2026-10-12, Add app = B without the Explore banner) + #1362: on the BUILT home (Apps › Add app → the takeover) and app_new, the screen sits on the settings ground; three settings-card tiles whose hub discs resolve to --disc-hub-7 · 8 · 10 (three different gradients, none the old neutral disc, white glyph; the Paste-link disc is the link glyph; hover keeps the card and lifts to --elevation-2 — #46 R1-M2); no Explore banner / Discover; the trimmed lead; the shield-lock trust caption (no grey box); Paste link opens the field card AFTER the tiles and selects the tile (aria-expanded + data-selected, the action ring + label ink), a 2nd tap only focuses the labelled input; showUrlError shows the text WITH the alert-small glyph (kept across bad link → timeout), aria-invalid + aria-describedby, and typing clears them; setScannedData / showUrlError on a fresh mount also open + select — ' + JSON.stringify(r));
}
