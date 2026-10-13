/* ==== #1355 (Damir 2026-10-12 13:16–13:56; built 14:08) — the chat's own side follows the canvas colour ====
 * (1) STRUCTURE on the BUILT chat.html: the accent tokens are defined from --surface-bubble-sent (light + dark), and the
 *     five scopes remap inside ONE @supports (color-mix) guard — the composer (send / mic, ⊕ / ×, the recording wave),
 *     the attach tray, the voice message (play disc, unread mic badge, the sent bars), the select-mode row (wash + check).
 *     Outside the guard nothing changes (a WebView without color-mix keeps today's action blue).
 * (2) CONTRAST, computed from the REAL sent colours (jsdom resolves --surface-bubble-sent per canvas and per pick on the
 *     built token sheet; the mixes are evaluated here with the CSS formulas, in sRGB):
 *       white glyph on the accent fill ≥ 4.5 · light ink (the colour) on the white pill ≥ 4.5 and on its tonal disc ≥ 3
 *       · dark ink (50 % toward white) on the dark tray ground ≥ 3, on its tonal disc ≥ 3, and — ★ #46 S19 M1 — the reply /
 *       edit TITLE ink (composer.css --text-action-default = --chat-accent-ink) ≥ 4.5 on the dark composer pill, the pill
 *       RESOLVED per canvas from the built CSS (--surface-composer-pill; was a hard-coded #1E2023 that hid a pill following a
 *       lifted canvas bubble) — all 49 dark combinations (7 canvases × Auto + 6 picks).
 * (3) ORDER: the attach tiles are Photos · Camera · File · App invite · Pay · Request (Damir 13:41).
 * Deliberate breaks (#1355 report; #46 r1 N4: the STRUCTURE clause is what fails for a changed mix value, the contrast
 * clause for a changed pick colour — data-chat-sent, the real attribute): a pick colour made pale → LOW names it; the .c-voice remap removed →
 * the structure clause fails; the old order back → the order clause fails; ★ #46 S19 M1: the dark pill back to
 * var(--surface-bubble-received) (it follows the S19 F10 canvas bubble again) → LOW names `title-on-pill` (Aurora, Ocean, …). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCssComments } = h;
  const K = aKit(h);
  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8') + '\n' + readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8'));
  const SUP = '@supports (color: color-mix(in srgb, red 50%, blue))';
  const blocks = css.split(SUP).slice(1).map((b) => b.slice(0, 2400));
  const inGuard = (re) => blocks.some((b) => re.test(b));
  const S = {
    tokens: inGuard(/--chat-accent: var\(--surface-bubble-sent\);/) && inGuard(/--chat-accent-ink: color-mix\(in srgb, var\(--surface-bubble-sent\), #FFFFFF 50%\);/)
      && inGuard(/--chat-accent-tonal: color-mix\(in srgb, var\(--surface-bubble-sent\) 16%, #FFFFFF\);/) && inGuard(/--chat-accent-band: color-mix\(in srgb, var\(--surface-bubble-sent\) 30%, transparent\);/),
    composer: inGuard(/\.c-composer \{[^}]*--surface-action-default: var\(--chat-accent\);[^}]*--icon-action-default: var\(--chat-accent-ink\);[^}]*--surface-action-tonal-default: var\(--chat-accent-tonal\);/)
      && inGuard(/\.c-composer__rec \{[^}]*--rec-wave-new: var\(--chat-accent-ink\);/),
    tray: inGuard(/\.c-attach \{[^}]*--surface-action-tonal-default: var\(--chat-accent-tonal\);[^}]*--icon-action-default: var\(--chat-accent-ink\);/),
    voice: inGuard(/\.c-voice \{[^}]*--surface-action-default: var\(--chat-accent\);[^}]*--icon-action-default: var\(--chat-accent-ink\);/)
      && inGuard(/\.c-bubble-row\[data-direction="sent"\] \.c-voice__bar \{ background: color-mix\(/),
    select: inGuard(/\[data-selecting\] \.c-bubble-row \{[^}]*--surface-select-check: var\(--chat-accent\);[^}]*--surface-select-row: var\(--chat-accent-band\);/),
    /* nothing outside the guard references the accent (an engine without color-mix must see today's tokens) */
    /* #46 r1 N4: every mix value is pinned (a dark tonal of 90 % no longer passes) + the three r1 contrast fixes */
    values: inGuard(/\[data-theme='dark'\], \[data-theme='dark'\] \[data-chat-ground\], \[data-theme='dark'\] \[data-chat-sent\] \{[^}]*--chat-accent-tonal: color-mix\(in srgb, var\(--surface-bubble-sent\) 38%, #1A1C1F\);/)
      && inGuard(/--chat-accent-band: color-mix\(in srgb, var\(--surface-bubble-sent\) 16%, transparent\);/) && inGuard(/:root, \[data-chat-ground\], \[data-chat-sent\] \{/),
    fixes: inGuard(/\.c-voice__bar \{ background: color-mix\(in srgb, var\(--text-bubble-sent\) 25%, var\(--surface-bubble-sent\)\); \}/)
      && inGuard(/\.c-voice__who\[data-tone="accent"\] \.c-voice__badge \{ background: color-mix\(in srgb, var\(--chat-accent\) 85%, #000000\); \}/)
      && inGuard(/\[data-theme='dark'\] \[data-selecting\] \.c-bubble-row\[data-selected\]::before \{ box-shadow: inset 0 0 0 var\(--outline-width-2\) var\(--chat-accent-ink\); \}/)
      && inGuard(/\.c-composer \{[^}]*--text-action-default: var\(--chat-accent-ink\);/),
    bare: /:root \{\s*--chat-accent: var\(--surface-action-default\);/.test(css),
    guarded: !css.split(SUP).map((b, i) => (i === 0 ? b : b.slice(b.indexOf('\n}\n') + 3))).join('').match(/var\(--chat-accent/),
  };
  /* —— contrast from the real sent colours —— */
  const hex = (v) => { const m = String(v).trim().match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const mix = (a, b, pa) => a.map((x, i) => x * pa + b[i] * (1 - pa));
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const W = [255, 255, 255], TRAY_D = [15, 17, 19], SHEET_D = [26, 28, 31];
  /* ★ #46 S19 M1: the pill as the document resolves it (var() chains followed on the root) */
  const resolveVar = (win, node, name, depth = 0) => {
    const v = String(win.getComputedStyle(node).getPropertyValue(name) || '').replace(/\s+/g, ' ').trim();
    const m = /^var\((--[\w-]+)(?:, *(.*))?\)$/.exec(v);
    return m && depth < 8 ? (resolveVar(win, node, m[1], depth + 1) || m[2] || '') : v;
  };
  let nDark = 0;
  const low = [];
  let n = 0;
  let s = null;
  try {
    s = await K.boot('chat.html', { wait: 700 });
    const { d, W: win } = s;
    const r = d.documentElement;
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') r.setAttribute('data-theme', 'dark'); else r.removeAttribute('data-theme');
      for (const g of ['flat', 'gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean']) for (const pick of ['', 'blue', 'violet', 'teal', 'pink', 'orange', 'graphite']) {
        r.setAttribute('data-chat-ground', g);
        if (pick) r.setAttribute('data-chat-sent', pick); else r.removeAttribute('data-chat-sent');   // #46 r1 M1: the REAL pick attribute
        const c = hex(win.getComputedStyle(r).getPropertyValue('--surface-bubble-sent'));
        if (!c) { low.push(theme + '/' + g + '/' + (pick || 'auto') + ': no sent colour'); continue; }
        n++;
        const tag = theme + '/' + g + '/' + (pick || 'auto');
        const check = (name, v, min) => { if (!(v >= min)) low.push(tag + ' ' + name + ' ' + v.toFixed(2)); };
        check('white-on-fill', cr(W, c), 4.5);
        check('voice-played-vs-unplayed', cr(W, mix(W, c, 0.25)), 3);   // #46 r1 m2
        if (theme === 'light') check('unread-badge-vs-played', cr(mix(c, [0, 0, 0], 0.85), [0xc7, 0xcb, 0xd1]), 3);   // #46 r1 m3 (grey-300 = the played disc)
        if (theme === 'light') {
          check('ink-on-pill', cr(c, W), 4.5);
          check('ink-on-tonal', cr(c, mix(c, W, 0.16)), 3);
        } else {
          const ink = mix(c, W, 0.5);
          check('ink-on-tray', cr(ink, TRAY_D), 3);
          const pill = hex(resolveVar(win, r, '--surface-composer-pill'));
          if (!pill) { low.push(tag + ' no pill colour'); continue; }
          nDark++;
          check('ink-on-pill', cr(ink, pill), 3);
          check('title-on-pill', cr(ink, pill), 4.5);   // ★ #46 S19 M1: the reply / edit title is TEXT
          check('ink-on-tonal', cr(ink, mix(c, SHEET_D, 0.38)), 3);
        }
      }
    }
  } catch (e) { low.push('threw ' + e.message); }
  finally { if (s && s.close) s.close(); }
  /* —— the attach order —— */
  let order = '';
  try {
    const AS = await import('file://' + join(root, 'src/components/attach-sheet.js'));
    order = AS.attachTilesFor({ media: true, camera: true, apps: true, payments: true, files: true }).map((a) => a.id).join(',');
  } catch (e) { order = 'threw ' + e.message; }
  ok(Object.values(S).every(Boolean) && n === 98 && nDark === 49 && low.length === 0 && order === 'photo,camera,file,app,pay,request',
    '★ #1355 (Damir 13:16–13:56): the chat\'s own side follows the canvas colour — composer (send / mic, ⊕ / ×, the recording wave), the attach tray, the voice play disc + unread mic badge + the sent bars, the select wash + check — all from --surface-bubble-sent inside ONE @supports (color-mix) guard; every combination (' + n + ' = 7 canvases × 7 Auto/picks × 2 themes) holds white-on-fill ≥ 4.5 and every icon ink ≥ 3 (light ink ≥ 4.5 on the pill; ★ #46 S19 M1: the dark reply / edit title ink ≥ 4.5 on the pill resolved per canvas, ' + nDark + ' / 49); the tray order is ' + order + ' — ' + JSON.stringify(S) + (low.length ? ' LOW: ' + low.slice(0, 8).join('; ') : ''));
}
