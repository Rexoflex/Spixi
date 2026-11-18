/* ==== fixb2 item 7 (Mission Control m005; Damir's ruling #1614 "Keep defaults, darken the ring", 2026-11-16; DECISIONS #1345) ====
 * Mechanism: the "ring" is the highlight of a jumped-to row in the chat (chat.html A2 `chat-jump-ring`): a 1 px GAP in
 * `--surface-select-row-gap` (the select band made opaque over the ground) and then 1 px of `--outline-select-ring`, which is
 * `var(--outline-action-default)` (blue) everywhere except light Aurora. On the LIGHT Aurora ground the gap is Damir's #57A4E6 and the ring
 * (primary-600 #3050BD) measured 2.61 : 1 (#1345; the fixr2 pin held >= 2.5).
 * #1614: the six moment defaults of #1343 stay; the ring gets a small colour change. Fix = its OWN token (a first version re-pointed the global
 * `--outline-action-default` in the Aurora block: it moved the reaction outline, the nick field and the media focus too, and the I-2 r2 #358 smoke row
 * read it as a dark value): `--outline-select-ring: var(--outline-action-default)` in the light root and the dark block, and
 * `--outline-select-ring: #2B47A9` in the light Aurora ground block only (hue 226.7° vs 226.4°, S 59 %, L 46.5 → 41.6 %) → 3.05 : 1.
 * Dark Aurora: primary-400 #769DFF on the gap #1A2E68 = 4.92 : 1 (already passes, unchanged).
 * SMOKE pin, computed from the BUILT token sheet (spixi.tokens.css; comment-stripped; #771 declared: the contrast is computed from the
 * tokens as shipped, not rendered):
 *   (1) the colour is READ from the built sheet per theme: the Aurora block's own `--outline-select-ring` when it has one, else the theme's `--outline-select-ring`
 *       resolved through var() (→ --outline-action-default → light primary-600 / dark primary-400); the ground is the Aurora block's
 *       `--surface-select-row-gap` (Damir's value #57A4E6 light, #1A2E68 dark: HELD, the gap is not the thing that changed);
 *   (2) WCAG contrast ring : gap >= 3 : 1 on light Aurora AND on dark Aurora; the light value is the ONE scoped line; the global `--outline-action-default`
 *       is unchanged EVERYWHERE: no Aurora block (nor any chat-ground block) declares it, and it still resolves to primary-600 / primary-400;
 *   (3) the hue is kept: the light ring's HSL hue is within 2° of primary-600's, the colour is darker than primary-600 (the change is darker, not another colour);
 *   (4) every OTHER chat ground keeps its ring (no `--outline-select-ring` in any other ground block, dark Aurora included) —
 *       only the light Aurora block sets it, once; the two default lines (light root, dark block) are `var(--outline-action-default)`; and the built chat shell paints the ring
 *       with it (`chat-jump-ring` and the static reduced-motion ring name `var(--outline-select-ring)`, none names `--outline-action-default`);
 *   (5) the six moment defaults of #1343 stay as built: the files that hold them (`S17MomentRules.cs`, `SMoments.cs`, `moment-sheet.js`, `moment-sheet.css`)
 *       are held whole by SHA-256 (CRLF → LF, BOM off); a later batch that edits them re-bases the hash after a look at its diff.
 * ★ photo1b (#1644): the gap this pin HOLDS moved with Damir's pick (Calmer 2: light #57A4E6 → #6EA2D5, dark #1A2E68 → #1E315F); the ring #2B47A9 measured again on it = 3.02 : 1 (≥ 3), so the ring is NOT re-set; clause (2) holds ≥ 3 on both.
 * Deliberate breaks (#802, fixb2 report; one token in a full temp copy + build-shells): the light Aurora ring `#2B47A9` → `#3050BD` → (2) (3) red; → `#2B8FA9` (hue) → (2) (3) red;
 * the ring token added to the light Gradient block → (4) red; the gap `#57A4E6` → `#4F9BDD` → (1) (2) red; the light root default `var(--outline-action-default)` → a literal
 * `#3050BD` → (4) red; the dark default → a literal `#769DFF` → (4) red; `--outline-action-default: #2B47A9` put back in the Aurora block (the first version) → (3) (4) red;
 * chat.html `chat-jump-ring` back to `--outline-action-default` → (4) red; one character of `S17MomentRules.cs` changed → (5) red. */
import { createHash } from 'node:crypto';
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8')).replace(/\s+/g, ' ');
  const blocks = [];
  { let stack = [], buf = '';
    for (const c of css) {
      if (c === '{') { stack.push(buf.trim()); buf = ''; }
      else if (c === '}') { blocks.push({ sel: stack[stack.length - 1] || '', body: buf.trim(), depth: stack.length }); stack.pop(); buf = ''; }
      else if (c === ';' && stack.length === 0) buf = '';
      else buf += c;
    } }
  const flat = blocks.filter((b) => b.depth === 1);
  const declIn = (body, name) => { let v = null; for (const m of body.matchAll(/(?:^|;)\s*(--[\w-]+):\s*([^;]+)/g)) if (m[1] === name) v = m[2].trim(); return v; };
  const AUR = { light: /^:root:not\(\[data-theme='dark'\]\)\[data-chat-ground='aurora'\],\s*:root:not\(\[data-theme='dark'\]\) \[data-chat-ground='aurora'\]$/, dark: /^:root\[data-theme='dark'\]\[data-chat-ground='aurora'\],\s*:root\[data-theme='dark'\] \[data-chat-ground='aurora'\]$/ };
  const aur = (th) => flat.filter((b) => AUR[th].test(b.sel));
  /* the theme's global scope: light = every `:root` block; dark = every `[data-theme="dark"]` block, over the light ones */
  const rootBlocks = flat.filter((b) => b.sel === ':root'), darkBlocks = flat.filter((b) => /^\[data-theme=["']dark["']\]$/.test(b.sel));
  const lastDecl = (bs, name) => { let v = null; for (const b of bs) { const d = declIn(b.body, name); if (d !== null) v = d; } return v; };
  const resolve = (th, name, withAurora, depth = 0) => {
    if (depth > 8) return null;
    let v = withAurora ? lastDecl(aur(th), name) : null;
    if (v === null && th === 'dark') v = lastDecl(darkBlocks, name);
    if (v === null) v = lastDecl(rootBlocks, name);
    if (v === null) return null;
    const m = /^var\((--[\w-]+)\)$/.exec(v);
    return m ? resolve(th, m[1], withAurora, depth + 1) : v;
  };
  const rgb = (x) => { const m = /^#([0-9a-f]{6})$/i.exec(x || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((u, v) => v - u); return (p + 0.05) / (q + 0.05); };
  const hsl = (c) => { const [r, g, b] = c.map((x) => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1)); let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360; return [hh, s, l]; };

  const got = {};
  for (const th of ['light', 'dark']) {
    const ring = rgb(resolve(th, '--outline-select-ring', true)), gap = rgb(resolve(th, '--surface-select-row-gap', true));
    got[th] = { ring, gap, ratio: ring && gap ? Math.round(cr(ring, gap) * 100) / 100 : null, own: lastDecl(aur(th), '--outline-select-ring') };
  }
  const gapHeld = got.light.gap && got.light.gap.join() === '110,162,213' && got.dark.gap && got.dark.gap.join() === '30,49,95';   // ★ photo1b (#1644 RE-BASE, Calmer 2): #6EA2D5 · #1E315F (was #57A4E6 · #1A2E68 — Damir's pick moved the gap; the ring #2B47A9 measures 3.02 : 1 on it, NOT re-set)
  ok(aur('light').length === 1 && aur('dark').length === 1 && gapHeld && got.light.ring && got.dark.ring,
    '★ fixb2 item 7 (1): the built token sheet has ONE light and ONE dark Aurora ground block; the ring (--outline-select-ring) and the gap resolve from it; the gaps are the picked Calmer 2 #6EA2D5 (light) and #1E315F (dark) (photo1b #1644; were #57A4E6 / #1A2E68): ' + JSON.stringify(got));

  ok(got.light.ratio >= 3 && got.dark.ratio >= 3,
    '★ fixb2 item 7 (2): the ring (--outline-select-ring) against its gap (--surface-select-row-gap) is >= 3 : 1 on light Aurora (' + got.light.ratio + ', was 2.61) AND dark Aurora (' + got.dark.ratio + ')');

  const g600 = rgb(resolve('light', '--primary-600', false)), g400 = rgb(resolve('dark', '--primary-400', false));
  /* the GLOBAL action outline is untouched EVERYWHERE: it still resolves to primary-600 / primary-400 in the root scopes AND no chat-ground block (Aurora included) declares it */
  const grounds = flat.filter((b) => /data-chat-ground/.test(b.sel));
  const globalsHeld = g600 && g600.join() === '48,80,189' && g400 && g400.join() === '118,157,255'
    && resolve('light', '--outline-action-default', false) === '#3050bd' && resolve('dark', '--outline-action-default', false) === '#769dff'
    && grounds.every((b) => declIn(b.body, '--outline-action-default') === null);
  const hl = hsl(got.light.ring || [0, 0, 0]), hg = hsl(g600 || [0, 0, 0]);
  const dh = Math.min(Math.abs(hl[0] - hg[0]), 360 - Math.abs(hl[0] - hg[0]));
  ok(globalsHeld && dh <= 2 && hl[2] < hg[2] && got.light.own !== null && got.dark.own === null,
    '★ fixb2 item 7 (3): the global --outline-action-default is unchanged everywhere (primary-600 #3050BD / primary-400 #769DFF; no chat-ground block, the Aurora ones included, declares it); the light Aurora ring is the SAME hue (Δ ' + dh.toFixed(1) + '° <= 2) and darker (L ' + hl[2].toFixed(3) + ' < ' + hg[2].toFixed(3) + '); the dark Aurora block does not set it');

  const others = grounds.filter((b) => !AUR.light.test(b.sel) && declIn(b.body, '--outline-select-ring') !== null);
  const setters = grounds.filter((b) => declIn(b.body, '--outline-select-ring') !== null);
  const dflt = lastDecl(rootBlocks, '--outline-select-ring') === 'var(--outline-action-default)' && lastDecl(darkBlocks, '--outline-select-ring') === 'var(--outline-action-default)';
  const chat = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8')).replace(/\s+/g, ' ');
  const ringUses = (chat.match(/0 0 0 2px var\(--outline-select-ring\)/g) || []).length, oldUses = (chat.match(/0 0 0 1px var\(--surface-select-row-gap\), 0 0 0 2px var\(--outline-action-default\)/g) || []).length;
  ok(others.length === 0 && setters.length === 1 && dflt && ringUses === 2 && oldUses === 0,
    '★ fixb2 item 7 (4): ONLY the light Aurora ground block sets the ring token (' + setters.length + '), every other chat ground and dark Aurora keep the default `var(--outline-action-default)` (light root + dark block: ' + dflt + '); the built chat shell paints the A2 ring (keyframe + reduced-motion rule: ' + ringUses + ' of 2) with it and none still with the action token (' + oldUses + '): ' + JSON.stringify(others.map((b) => b.sel)));

  const sha = (f) => createHash('sha256').update(readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n')).digest('hex');
  const HELD = {
    'Spixi/Utils/S17MomentRules.cs': 'bdd5aa147a9c911263a3c40bfd90d0007132038ee974c46333a80fef9559448d',
    'Spixi/Meta/SMoments.cs': '713d2a6e30b8ed59756a51218a81970c5466f068583892b665a114a2a3e73607',
    'src/components/moment-sheet.js': '637e0cdf536ffb24878262cafc6dbcfad446d092eb6e98d6fe7f7f9fa68593d6',
    'src/styles/components/moment-sheet.css': 'ac52fdc18e46b5c5f7242c70c5df1b47e3aa50a787e8176137b6113001aaa681',
  };
  const bad = Object.keys(HELD).filter((f) => sha(f) !== HELD[f]);
  ok(bad.length === 0, '★ fixb2 item 7 (5): the six moment defaults of #1343 stay as built — the four files that hold them are byte-identical (SHA-256, CRLF → LF): ' + JSON.stringify(bad));
}
