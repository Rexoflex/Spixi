/* ==== S20H F-A — Account on a narrow DESKTOP window (Drop A) ====
 * On the BUILT settings.html: under :root[data-desktop] the body is a ROW (rail + #settings-root). A row flex item with the
 * default min-width:auto cannot shrink below its content — Chat appearance's canvas tile row is 782 px — so a 505 px window
 * cut the right side (Damir's screenshot, 2026-10-15 12:01) and the two-column observer read 782 px (columns at 505 px).
 *   (1) the computed min-width of #settings-root is 0px with data-desktop (jsdom cascade over the built shell's own CSS),
 *       and the body is a row there;
 *   (2) the Chat appearance body still switches to two columns ONLY at ≥ 720 px of its OWN width (the observer rule).
 * The real layout (no element past the right edge at 320 / 360 / 505 / 700 / 1280, a live resize re-lays out) is the
 * Chromium sweep scripts/pins-s20h/a-sweep.mjs (Playwright, not in smoke).
 * Deliberate break (S20H report): the `:root[data-desktop] #settings-root { min-width: 0; }` line removed + build-shells →
 *   (1) fails (auto) and the sweep fails (175 elements past the edge at 320). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const { boot } = b2Kit(h);
  let s = null;
  const r = {};
  try {
    s = await boot('settings.html', { wait: 900 });
    const { W, d } = s;
    d.documentElement.setAttribute('data-desktop', '');
    const sr = d.getElementById('settings-root');
    r.minW = sr ? W.getComputedStyle(sr).minWidth : null;
    r.bodyDir = W.getComputedStyle(d.body).flexDirection;
    d.documentElement.removeAttribute('data-desktop');
    r.minWPhone = sr ? W.getComputedStyle(sr).minWidth : null;
  } catch (e) { r.err = String(e); }
  finally { try { s && s.dom.window.close(); } catch (e) {} }
  ok(r.minW === '0px' && r.bodyDir === 'row' && r.minWPhone !== '0px' && !r.err,   // #46 r1 NIT: the phone (no data-desktop) is untouched
    `★ S20H F-A: on desktop #settings-root may shrink below its content (min-width 0 in the row body) — a narrow window no longer cuts Chat appearance (782 px tile row) — ${JSON.stringify(r)}`);
  const src = stripCode(readFileSync(join(root, 'src/components/settings-screens.js'), 'utf8'));   // #46 r1 NIT: a commented-out copy cannot pass
  ok(/body\.toggleAttribute\('data-cols', w >= 720\)/.test(src) && /ro\.observe\(body\)/.test(src),
    '★ S20H F-A: the Chat appearance columns still follow the body\'s OWN width (≥ 720 px), now that the body can be narrower than its tiles');
}
