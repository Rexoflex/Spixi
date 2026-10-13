/* ==== S18 D1 (S17 walk CA-PATTERN, Damir 2026-10-12 17:17: "desktop −20 % more; mobile is right") ====
 * On the BUILT shells (jsdom), a DESKTOP boot (?desktop=1 → :root[data-desktop], the #228 platform flag — no width query)
 * against a PHONE boot (?mobile=1), in BOTH themes, on EVERY canvas (the seven CHAT_GROUNDS ids):
 *   · chat.html, the root canvas: --chat-pattern-alpha-1 desktop = 0.8 × phone (and the phone value is today's, untouched:
 *     light 0.1024 · dark 0.0932 · light Aurora 0.192 — ★ S19 option B RE-BASE (Damir pick): dark × 1.12, 0.0832 → 0.0932, so the
 *     desktop dark is 0.07456, was 0.06656); the chat's own opacity is var(--chat-pattern-alpha-1) on both;
 *   · the preview tiles (a descendant with its own data-chat-ground under every root canvas): alpha-1 AND the Background-tile
 *     cap --chat-pattern-tile-max are 0.8 × phone, so a BOOSTED tile, min(tile-max, alpha × boost) (patternLevelVar), is
 *     0.8 × its phone face for both boosts (6 · rings 4.5);
 *   · settings.html, the real Chat appearance screen: every Background tile face resolves to 0.8 × its phone value;
 *   · ΔL* (the #1029 / #1058 / #1351 method): the desktop ink still separates on Mist / the brand gradient / the dark canvas
 *     (floors 5 / 4 / 5 — 0.8 × the phone floors 6 / 5 / 7, rounded down). ★ S19 option B RE-BASE: the dark ΔL* is measured on
 *     the dark Mist GROUND the chat paints (its --gradient-chat #07090B; was the canvas-base #0C0E10, which B leaves for the
 *     chrome) — desktop 5.75 at 0.07456 (A: 5.78 at 0.06656 on #0C0E10; B's ground at the old 0.06656 = 4.85 < 5, the break);
 *   · the token stays defined on bare :root (the orphan-token gate) — the desktop values live in :root[data-desktop] rules.
 * Deliberate breaks (S18 report): the dark desktop rule dropped → the root clause fails (dark 1.0 ×); the desktop tile
 * reset dropped → the tile clause fails (light tiles 1.0 ×). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCssComments } = h;
  const K = aKit(h);
  const GROUNDS = ['flat', 'gradient', 'blue', 'green', 'aurora', 'dusk', 'ocean'];
  const BOOSTS = [6, 4.5];
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const r = {};
  const detail = {};
  /* —— chat.html: root canvases + tiles —— */
  const readChat = async (desktop) => {
    const s = await K.boot('chat.html', { wait: 900, desktop });
    try {
      const R = s.d.documentElement;
      const tok = (el, n) => parseFloat(s.W.getComputedStyle(el).getPropertyValue(n));
      const out = { flag: R.hasAttribute('data-desktop'), opacity: R.style.getPropertyValue('--chat-pattern-opacity'), v: {} };
      const tiles = GROUNDS.map((g) => { const t = s.d.createElement('div'); t.setAttribute('data-chat-ground', g); s.d.body.append(t); return t; });
      for (const th of ['light', 'dark']) {
        if (th === 'dark') R.setAttribute('data-theme', 'dark'); else R.setAttribute('data-theme', 'light');
        for (const g of GROUNDS) {
          R.setAttribute('data-chat-ground', g);
          out.v[th + ':' + g] = { a: tok(R, '--chat-pattern-alpha-1'), m: tok(R, '--chat-pattern-tile-max') };
          tiles.forEach((t, i) => { out.v[th + ':' + g + '>' + GROUNDS[i]] = { a: tok(t, '--chat-pattern-alpha-1'), m: tok(t, '--chat-pattern-tile-max') }; });
        }
      }
      return out;
    } finally { s.close(); }
  };
  try {
    const ph = await readChat(false);
    const dk = await readChat(true);
    r.flags = !ph.flag && dk.flag && ph.opacity === 'var(--chat-pattern-alpha-1)' && dk.opacity === 'var(--chat-pattern-alpha-1)';
    r.phoneToday = ph.v['light:flat'].a === 0.1024 && ph.v['dark:flat'].a === 0.0932 && ph.v['light:aurora'].a === 0.192 && ph.v['dark:aurora'].a === 0.0932;   // ★ S19 option B RE-BASE: dark 0.0832 → 0.0932
    const keys = Object.keys(ph.v);
    const bad = { root: [], tile: [] };
    for (const k of keys) {
      const p = ph.v[k], d = dk.v[k];
      const isTile = k.indexOf('>') > 0;
      const okA = p.a > 0 && near(d.a, 0.8 * p.a);
      const okM = !isTile || near(d.m, 0.8 * p.m);
      const okB = !isTile || BOOSTS.every((b) => near(Math.min(d.m, d.a * b), 0.8 * Math.min(p.m, p.a * b)));
      if (!(okA && okM && okB)) bad[isTile ? 'tile' : 'root'].push(k + ' ' + p.a + '/' + p.m + ' → ' + d.a + '/' + d.m);
    }
    r.root = bad.root.length === 0 && keys.filter((k) => k.indexOf('>') < 0).length === 14;
    r.tile = bad.tile.length === 0 && keys.filter((k) => k.indexOf('>') > 0).length === 98;
    if (!r.root || !r.tile) detail.bad = bad;
    /* ΔL* (the smoke #1029 block's method) at the desktop alpha */
    const tokCss = stripCssComments(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8'));
    const lum = (hex) => { const hh = hex.replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(hh.slice(i, i + 2), 16) / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const Lstar = (hex) => { const y = lum(hex); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
    const mix = (g, i, a) => '#' + [0, 2, 4].map((k) => Math.round(parseInt(g.slice(1 + k, 3 + k), 16) * (1 - a) + parseInt(i.slice(1 + k, 3 + k), 16) * a).toString(16).padStart(2, '0')).join('');
    /* tokens resolved per theme the smoke way (every top-level `:root {` block, then every `[data-theme="dark"] {` over it) */
    const light = {}, darkOnly = {};
    for (const m of tokCss.matchAll(/^(:root|\[data-theme="dark"\]) \{([\s\S]*?)^\}/gm)) { const into = m[1] === ':root' ? light : darkOnly; for (const dd of m[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) into[dd[1]] = dd[2].trim(); }
    const TV = { light, dark: { ...light, ...darkOnly } };
    const res = (th, n, k = 0) => { const v = TV[th][n]; if (!v || k > 10) return null; const mm = /^var\((--[\w-]+)\)$/.exec(v); return mm ? res(th, mm[1], k + 1) : v; };
    const mist = res('light', '--chat-canvas-base'), inkMist = res('light', '--chat-pattern-ink-mist');
    const gradInk = (/\[data-chat-ground='gradient'\] \{[^}]*--chat-pattern-ink: (#[0-9A-Fa-f]{6});/.exec(tokCss) || [])[1];
    const gradMid = (/linear-gradient\(180deg, #[0-9A-Fa-f]{6} 0%, (#[0-9A-Fa-f]{6}) 50%/.exec(tokCss) || [])[1];
    const darkBase = (/:root\[data-theme='dark'\]\[data-chat-ground='flat'\],\s*:root\[data-theme='dark'\] \[data-chat-ground='flat'\] \{[^}]*--gradient-chat: (#[0-9A-Fa-f]{6});/.exec(tokCss) || [])[1];   // ★ S19 option B RE-BASE: the dark Mist ground #07090B (was res('dark', '--chat-canvas-base'))
    const a1 = dk.v['light:flat'].a, d1 = dk.v['dark:flat'].a;
    const dMist = Lstar(mist) - Lstar(mix(mist, inkMist, a1));
    const dGrad = gradInk && gradMid ? Lstar(gradMid) - Lstar(mix(gradMid, gradInk, a1)) : 0;
    const dDark = darkBase ? Lstar(mix(darkBase, res('dark', '--chat-pattern-ink'), d1)) - Lstar(darkBase) : 0;
    detail.dL = [dMist, dGrad, dDark].map((x) => x.toFixed(2)).join(' / ');
    r.deltaL = dMist >= 5 && dGrad >= 4 && dDark >= 5;
    /* the bare-:root definitions stay (orphan-token gate) */
    const bare = [...tokCss.matchAll(/^:root \{([\s\S]*?)^\}/gm)].map((m) => m[1]).join('\n');
    r.bareRoot = /--chat-pattern-alpha-1: 0\.1024;/.test(bare) && /--chat-pattern-tile-max: 1;/.test(bare)
      && /:root\[data-desktop\] \{\s*--chat-pattern-alpha-1: 0\.08192;/.test(tokCss) && !/@media[^{]*width[^{]*\{[^}]*--chat-pattern-alpha-1/.test(tokCss);
  } catch (e) { r.chatThrew = e.message; }
  /* —— settings.html: the real Chat appearance Background tiles —— */
  const readSettings = async (desktop) => {
    /* settings.html has no ?mobile=1 override and jsdom's UA reads desktop: the phone boot stands a phone UA in for the
       head's #228 test (the a-kit `html` transform, the *SL{} stand-in precedent) */
    const s = await K.boot('settings.html', { wait: 900, desktop, html: desktop ? null : (t) => t.split('var u=navigator.userAgent;').join("var u='Mozilla/5.0 (Linux; Android 14) Mobile';") });
    try {
      s.push('setCaps', 'settingsApply');
      await sleep(250);
      const row = s.d.querySelector('[data-setting-key="chatappearance"]');
      if (row) row.click();
      await sleep(500);
      const out = { flag: s.d.documentElement.hasAttribute('data-desktop') };
      for (const th of ['light', 'dark']) {
        s.d.documentElement.setAttribute('data-theme', th);
        for (const f of s.d.querySelectorAll('.c-settings-swatch__canvas')) {
          const cs = s.W.getComputedStyle(f);
          const m = /calc\(var\(--chat-pattern-alpha-1\) \* ([\d.]+)\)/.exec(f.style.getPropertyValue('--chat-pattern-opacity'));
          if (!m) continue;
          const a = parseFloat(cs.getPropertyValue('--chat-pattern-alpha-1')), tm = parseFloat(cs.getPropertyValue('--chat-pattern-tile-max'));
          out[th + ':' + (f.closest('[data-value]') || {}).dataset?.value] = Math.min(tm, a * Number(m[1]));
        }
      }
      return out;
    } finally { s.close(); }
  };
  try {
    const p = await readSettings(false), d = await readSettings(true);
    const ks = Object.keys(p).filter((k) => k !== 'flag');
    r.settingsTiles = p.flag === false && d.flag === true && ks.length >= 4 && ks.every((k) => near(d[k], 0.8 * p[k]));
    if (!r.settingsTiles) detail.settings = { p, d };
  } catch (e) { r.settingsThrew = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★ S18 D1 (CA-PATTERN): a DESKTOP boot (:root[data-desktop]) paints 0.8 × the phone pattern on every canvas in both themes — the root canvas, every preview tile under every canvas (alpha AND the Background-tile cap, so a boosted tile is 0.8 × too) and the real Chat appearance tiles; the phone values are today\'s; ΔL* desktop ' + (detail.dL || '?') + ' (Mist / brand / dark) — ' + JSON.stringify(r) + (Object.keys(detail).length > 1 || detail.bad ? ' ' + JSON.stringify(detail) : ''));
}
