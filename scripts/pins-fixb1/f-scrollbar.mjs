/* ==== fixb1 item 6 (#1648, 🟡 dial — Damir judges at the walk) — the language sheet's scroll bar took the colour of the other theme ====
 * Mechanism: the bar on a tall option sheet (the language list, #965) is the DRAWN indicator `.c-scrollind` — the list's native bar is
 * `scrollbar-width: none`. Its thumb was `--icon-neutral-02` (and `--icon-neutral-01` while dragged), an ICON ink: dark in the light theme,
 * light in the dark theme — the reverse of the app's scroll-bar family (#1202 / #1134: the outline tokens). Fix: track `--outline-neutral-01`,
 * thumb `--outline-neutral-03`, dragged thumb `--outline-neutral-04` (light: thumb neutral-300 on the sheet track neutral-100; dark: thumb
 * outline-04 = neutral-500 on the SHEET track outline-sheet-01 = neutral-700, which `.c-sheet` re-points the track to).
 * An earlier design (a `scrollbar-color` on the Android root) was dropped: it recoloured every native overlay thumb, unmeasured.
 * SOURCE pin on the BUILT shells (comment-stripped, #771 declared); the colours are resolved from the BUILT token sheet through the neutral scale.
 *   (1) every built shell that carries the indicator (settings, downloads, dev, contributors, settings_backup, intro) has exactly these rules:
 *       `.c-scrollind { … background: var(--outline-neutral-01); … }` · `.c-scrollind__thumb { … background: var(--outline-neutral-03); … }` (light) ·
 *       `[data-theme="dark"] .c-scrollind__thumb { background: var(--outline-neutral-04); }` (the ONE dark rule, no `:root`: the same specificity as the drag rule, and it comes BEFORE the `[data-drag]` rule in the built CSS, so the later drag rule wins) ·
 *       `.c-scrollind__thumb[data-drag] { … background: var(--outline-neutral-04); }`;
 *   (2) no rule of the `.c-scrollind*` family names an `--icon-*` token (the ink that read as the other theme);
 *   (3) resolved through the scale, per theme (the track token is READ from the built `.c-scrollind` rule and mapped through the built `.c-sheet` scope; so are the thumb and the dragged thumb): the light thumb is LIGHTER than the dark thumb, and thumb ≠ track in BOTH themes, computed (WCAG)
 *       against the track AS IT RENDERS: the indicator lives inside `.c-sheet`, which re-points `--outline-neutral-01` to `--outline-sheet-01`
 *       (overlay.css; dark = neutral-700, not 800) — the pin reads that scope. Floor MIN_RATIO = 1.2 : 1, thumb and dragged thumb, per theme.
 *       Measured: light thumb 1.37 · dragged 1.57; dark thumb 1.33 · dragged 1.33 (dark with outline-neutral-03 was 1.13: too faint);
 *   (4) the base sheet is untouched by this item: every `scrollbar-color` in spixi.base.css sits inside the pointer media
 *       `(hover: hover) and (pointer: fine)`, and none names a data-platform.
 *   (1b) ★ #46 r2 (R2-6): the SET of rules whose selector names `c-scrollind` ANYWHERE in the built CSS (every <style> of every built page, every .css of the
 *       folder; inside an at-rule too) equals EXACTLY the expected list of (selector, declarations), whitespace-normalised, in order: none inside an
 *       at-rule (`@media print` …), none with a combinator or another spelling (`.c-scrollind > .c-scrollind__thumb`, `:root[data-theme='dark'] …` in any
 *       quoting), none with a second `background` declaration after the first (the old reader took the first `background:` it met); the dark-theme
 *       selector is looked for in any quoting (`data-theme=["']?dark`);
 *   (1c) ★ #46 r3 (R3-6): selectors are read with their CSS escapes undone (`.c-scrollin\64 __thumb` is `.c-scrollind__thumb`), so a spelling trick no longer
 *       hides a rule; and the BUILT settings shell is run in jsdom with the language sheet open: every rule of every stylesheet (media rules too) is matched
 *       with `el.matches(selectorText)` against the track and the thumb — light and dark theme, the frame with data-overflow, the thumb with and without
 *       data-drag — and the matching rules are EXACTLY the held list per state (their cssText, whitespace-normalised): a rule that does not name `c-scrollind`
 *       (`[class$="__thumb"][data-drag] { … }`) but still reaches the indicator is red;
 *   (3b) ★ #46 r3 (R3-6): the thumb token and the dragged token go through the same sheet scope as the track (a re-pointing of `--outline-neutral-03/04` there is measured);
 *       and over every built page and every .css of the folder the ONLY rules that declare `--outline-neutral-01…04` or `--outline-sheet-01` are the `:root` and
 *       `[data-theme="dark"]` blocks of spixi.tokens.css and the `.c-sheet, .c-modal` rule, whose whole body is held exactly (the nine sheet re-points, `--outline-neutral-01: var(--outline-sheet-01)` among them) — a re-pointing in `.c-settings__opts-frame` or any other rule is red;
 * Deliberate breaks (fixb1 report): thumb token `--outline-neutral-03` → `--icon-neutral-02` (src/styles/components/settings-shell.css + build-shells)
 *   → (1) and (2) fail; the track → `--outline-neutral-03` (= the thumb) → (1) and (3) fail; the dragged thumb → `--icon-neutral-01` → (1), (2);
 *   the ONE dark rule removed (dark thumb falls back to outline-03, 1.13) → (1) and (3) fail; `:root[data-theme="dark"]` put back in front of the dark rule → (1) fails (#46 r1 fixb1); the dark rule moved AFTER the drag rule → (1) fails (order); the dark `--outline-neutral-04` pointed at the sheet track (`--neutral-700`, contrast 1.0) in src/styles/tokens.css → (3) fails;
 *   a `:root[data-platform="android"] { scrollbar-color: … }` back in base.css → (4) fails.
 *   #46 r2 (R2-6): `:root[data-theme='dark'] .c-scrollind__thumb { background: var(--outline-neutral-03); }` instead of the dark rule; a later
 *   `background: var(--outline-neutral-01);` in the thumb rule; `.c-scrollind > .c-scrollind__thumb { … }` added; the dark rule inside `@media print` → (1b) fails.
 *   #46 r3 (R3-6): `.c-scrollin\64 __thumb` (escaped selector) → (1b); `[class$="__thumb"][data-drag] { background: … }` → (1c); `--outline-neutral-04` re-pointed in `.c-settings__opts-frame`
 *   or added to the `.c-sheet, .c-modal` rule → (3b). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCssComments } = h;
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const flat = (t) => stripCssComments(t).replace(/\s+/g, ' ');
  const styleOf = (t) => [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

  /* CSS escapes undone (`\64 ` = d, `\.` = .) — selectors AND declaration bodies are compared in their plain spelling */
  const unesc = (t) => t.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (m, hx) => String.fromCodePoint(parseInt(hx, 16) || 0xfffd)).replace(/\\(.)/g, '$1');
  /* a small brace walker: every rule with its selector, its body and the at-rules around it */
  const rules = (css) => {
    const out = []; const stack = []; let buf = '';
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (c === '{') { stack.push(buf.trim()); buf = ''; }
      else if (c === '}') { out.push({ sel: unesc(stack[stack.length - 1] || ''), body: unesc(buf.trim()), at: stack.slice(0, -1).filter((x) => x.startsWith('@')) }); stack.pop(); buf = ''; }
      else if (c === ';' && stack.length === 0) buf = '';
      else buf += c;
    }
    return out;
  };
  const bg = (r) => ((/(?:^|;\s*)background:\s*([^;]+)/.exec(r.body) || [])[1] || '').trim();

  const shells = readdirSync(dir).filter((f) => f.endsWith('.html')).filter((f) => /c-scrollind__thumb/.test(readFileSync(join(dir, f), 'utf8')));
  const per = {};
  let iconUsers = [];
  for (const f of shells) {
    const rs = rules(flat(styleOf(readFileSync(join(dir, f), 'utf8'))));
    const one = (sel) => rs.filter((r) => r.sel === sel);
    const t = one('.c-scrollind'), th = one('.c-scrollind__thumb'), dk = one('[data-theme="dark"] .c-scrollind__thumb'), dr = one('.c-scrollind__thumb[data-drag]');
    /* ★ #46 r1 (O-S-1): exactly ONE dark rule, no other rule of the dark selector in any spelling, and it comes BEFORE the drag rule */
    const dkAny = rs.filter((r) => /data-theme\s*=\s*["']?dark/.test(r.sel) && /c-scrollind/.test(r.sel));
    per[f] = { track: t.length === 1 && bg(t[0]), thumb: th.length === 1 && bg(th[0]), darkThumb: dk.length === 1 && dkAny.length === 1 && bg(dk[0]), drag: dr.length === 1 && bg(dr[0]),
      darkBeforeDrag: dk.length === 1 && dr.length === 1 && rs.indexOf(dk[0]) < rs.indexOf(dr[0]) };
    iconUsers.push(...rs.filter((r) => /c-scrollind/.test(r.sel) && /--icon-/.test(r.body)).map((r) => f + ':' + r.sel));
  }
  const rule1 = shells.length >= 6 && Object.values(per).every((p) => p.track === 'var(--outline-neutral-01)' && p.thumb === 'var(--outline-neutral-03)' && p.darkThumb === 'var(--outline-neutral-04)' && p.drag === 'var(--outline-neutral-04)' && p.darkBeforeDrag === true);
  const rule2 = shells.length >= 6 && iconUsers.length === 0;

  /* (1b) ★ #46 r2 (R2-6): the whole set of `c-scrollind` rules, exact */
  const EXPECT_RULES = [
    ' || .c-scrollind { position: absolute; top: var(--spacing-4); bottom: var(--spacing-4); inset-inline-end: 0; width: 4px; border-radius: var(--radius-full); background: var(--outline-neutral-01); display: none; }',
    ' || .c-settings__opts-frame[data-overflow] > .c-scrollind { display: block; }',
    ' || .c-scrollind__thumb { position: absolute; top: 0; left: 0; right: 0; border-radius: var(--radius-full); background: var(--outline-neutral-03); touch-action: none; cursor: grab; }',
    " || .c-scrollind__thumb::before { content: ''; position: absolute; inset: 0 -10px; }",
    ' || [data-theme="dark"] .c-scrollind__thumb { background: var(--outline-neutral-04); }',
    ' || .c-scrollind__thumb[data-drag] { cursor: grabbing; background: var(--outline-neutral-04); }'];
  const tuple = (r) => r.at.join(' > ') + ' || ' + r.sel.replace(/\s+/g, ' ') + ' { ' + r.body.replace(/\s+/g, ' ') + ' }';
  const bgCount = (r) => (r.body.match(/(?:^|;)\s*background(?:-[\w-]+)?\s*:/g) || []).length;
  const allHtml = readdirSync(dir).filter((f) => f.endsWith('.html'));
  const allCss = readdirSync(dir).filter((f) => f.endsWith('.css'));
  const exactPer = {}, otherFiles = [];
  for (const f of allHtml) {
    const css = flat(styleOf(readFileSync(join(dir, f), 'utf8')));
    const rs = rules(css).filter((r) => /c-scrollind/.test(r.sel) || /c-scrollind/.test(r.at.join(' ')));
    if (rs.length || /c-scrollind/.test(css)) exactPer[f] = { same: rs.length === EXPECT_RULES.length && rs.every((r, i) => tuple(r) === EXPECT_RULES[i]) && rs.every((r) => bgCount(r) <= 1), got: rs.map(tuple) };
  }
  for (const f of allCss) if (/c-scrollind/.test(readFileSync(join(dir, f), 'utf8'))) otherFiles.push(f);
  const rule1b = Object.keys(exactPer).length >= 6 && Object.values(exactPer).every((e) => e.same) && otherFiles.length === 0;
  const firstBad = Object.entries(exactPer).find(([, e]) => !e.same);

  const { res, cr } = b2Kit(h).tokens();
  const MIN_RATIO = 1.2;
  /* the sheet scope the indicator renders in: `.c-sheet, .c-modal { --outline-neutral-01: var(--outline-sheet-01) }` */
  const sheetRe = rules(flat(styleOf(readFileSync(join(dir, 'settings.html'), 'utf8')))).filter((r) => /^\.c-sheet, \.c-modal$/.test(r.sel) && /--outline-neutral-01: var\(--outline-sheet-01\)/.test(r.body));
  const sheetScope = sheetRe.length === 1;
  /* the declarations of that scope (`--outline-neutral-01: var(--outline-sheet-01)`): a token the indicator names is re-pointed through them */
  const scopeMap = Object.fromEntries(sheetScope ? [...sheetRe[0].body.matchAll(/(--[\w-]+):\s*var\((--[\w-]+)\)/g)].map((m) => [m[1], m[2]]) : []);
  const lum = (hex) => { const x = String(hex).replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  /* the thumb token each theme really gets, READ from the built rules (no dark rule → the dark thumb falls back to the light rule's token) */
  const tokOf = (x) => (/^var\((--[\w-]+)\)$/.exec(x || '') || [])[1] || '--missing';
  const v = {};
  /* ★ #46 r1 (O-S-1): the track token is READ from the built `.c-scrollind` rule, then re-pointed by the built `.c-sheet` scope (as it renders) */
  const trackTok = tokOf(per['settings.html'].track);
  const scoped = (tok) => scopeMap[tok] || tok;   // ★ #46 r3 (R3-6): the thumb and the dragged thumb are re-pointed through the same scope as the track
  const trackScoped = scoped(trackTok);
  for (const th of ['light', 'dark']) v[th] = { track: res(th, trackScoped), thumb: res(th, scoped(tokOf(th === 'dark' ? (per['settings.html'].darkThumb || per['settings.html'].thumb) : per['settings.html'].thumb))), drag: res(th, scoped(tokOf(per['settings.html'].drag))) };
  const hex = (x) => /^#[0-9a-fA-F]{6}$/.test(x || '');
  const all = ['light', 'dark'].every((th) => hex(v[th].track) && hex(v[th].thumb) && hex(v[th].drag));
  const ratios = all ? Object.fromEntries(['light', 'dark'].map((th) => [th, { thumb: +cr(v[th].thumb, v[th].track).toFixed(2), drag: +cr(v[th].drag, v[th].track).toFixed(2) }])) : null;
  const rule3 = sheetScope && all && lum(v.light.thumb) > lum(v.dark.thumb)
    && ['light', 'dark'].every((th) => ratios[th].thumb > MIN_RATIO && ratios[th].drag > MIN_RATIO);

  const base = rules(flat(readFileSync(join(dir, 'spixi.base.css'), 'utf8'))).filter((r) => /scrollbar-color\s*:/.test(r.body));
  const rule4 = base.length === 2 && base.every((r) => r.at.length === 1 && /^@media \(hover: hover\) and \(pointer: fine\)$/.test(r.at[0]) && !/data-platform/.test(r.sel));

  ok(rule1, `★ fixb1 item 6 (#1648): in all ${shells.length} built shells that carry the indicator, .c-scrollind = outline-neutral-01 (track), its thumb = outline-neutral-03 in light and outline-neutral-04 in dark (the one [data-theme="dark"] rule, before the drag rule), the dragged thumb = outline-neutral-04 — ${JSON.stringify(per)}`);

  /* (3b) ★ #46 r3 (R3-6): who may declare the outline tokens */
  const SHEET_BODY = '--surface-neutral-02: var(--surface-sheet-card); --surface-card: var(--surface-sheet-card); --surface-card-hover: var(--surface-sheet-card-hover); --surface-card-pressed: var(--surface-sheet-card-pressed); --outline-neutral-01: var(--outline-sheet-01); --surface-input: var(--surface-input-sheet); --surface-interactive-hover: var(--surface-interactive-hover-sheet); --surface-interactive-pressed: var(--surface-interactive-pressed-sheet); --surface-settings-card: var(--surface-settings-card-sheet);';
  const TOKEN_DECL = /--outline-(?:neutral-0[1-4]|sheet-01)\s*:/;
  const declarers = [];
  for (const f of readdirSync(dir).filter((x) => /\.(html|css)$/.test(x))) {
    const t = readFileSync(join(dir, f), 'utf8');
    for (const r of rules(flat(f.endsWith('.css') ? t : styleOf(t)))) {
      if (!TOKEN_DECL.test(r.body)) continue;
      const rootBlock = f === 'spixi.tokens.css' && r.at.length === 0 && (r.sel === ':root' || r.sel === '[data-theme="dark"]');
      const sheetRule = f.endsWith('.html') && r.at.length === 0 && r.sel === '.c-sheet, .c-modal' && r.body.replace(/\s+/g, ' ') === SHEET_BODY;
      if (!rootBlock && !sheetRule) declarers.push(f + ': ' + r.at.join(' > ') + ' ' + r.sel + ' { ' + r.body.slice(0, 80) + ' }');
    }
  }
  const rule3b = declarers.length === 0;

  /* (1c) ★ #46 r3 (R3-6): the rules that reach the indicator in jsdom, sheet open */
  const T = '.c-scrollind { position: absolute; top: var(--spacing-4); bottom: var(--spacing-4); inset-inline-end: 0px; width: 4px; border-radius: var(--radius-full); background: var(--outline-neutral-01); display: none; }';
  const TF = '.c-settings__opts-frame[data-overflow] > .c-scrollind { display: block; }';
  const TH = '.c-scrollind__thumb { position: absolute; top: 0px; left: 0px; right: 0px; border-radius: var(--radius-full); background: var(--outline-neutral-03); touch-action: none; cursor: grab; }';
  const THB = '.c-scrollind__thumb::before { content: "" ; position: absolute; inset: 0 -10px; }'.replace('"" ', '""');
  const DK = '[data-theme="dark"] .c-scrollind__thumb { background: var(--outline-neutral-04); }';
  const DR = '.c-scrollind__thumb[data-drag] { cursor: grabbing; background: var(--outline-neutral-04); }';
  const UNI = '*, *::before, *::after { box-sizing: border-box; }';   // the two global rules that reach every element, held as they are
  const FOCUS = ':focus-visible { outline: var(--outline-width-2) solid var(--outline-focus); outline-offset: 2px; }';
  const EXPECT_MATCH = {
    track: [T, TF, UNI, FOCUS],
    thumbLight: [TH, THB, UNI, FOCUS],
    dragLight: [TH, THB, DR, UNI, FOCUS],
    thumbDark: [TH, THB, DK, UNI, FOCUS],
    dragDark: [TH, THB, DK, DR, UNI, FOCUS] };
  const got = {}; const gotMeta = { combos: 0 };
  /* ★ #46 r4 (R4-8): pseudo-elements and state pseudo-classes are cut off each selector before el.matches (a `::after` / `:hover` rule reaches the element too); empty compound → `*` */
  const PSEUDO = /::?(?:before|after|first-line|first-letter|selection|placeholder|marker|backdrop)\b|:(?:hover|active|focus-visible|focus-within|focus)\b/g;
  const plain = (sel) => sel.replace(PSEUDO, '').split(',').map((x) => x.trim()).map((x) => (x === '' ? '*' : x)).join(', ');
  let kitSession = null;
  try {
    const { boot } = b2Kit(h);
    kitSession = await boot('settings.html', { query: 'mobile=1', wait: 900 });
    const { d, push } = kitSession;
    push('setNickname', 'Ana'); await h.sleep(150);
    d.querySelector('.c-settings__row[data-setting-key="language"]').click(); await h.sleep(400);
    const track = d.querySelector('.c-scrollind'), thumb = d.querySelector('.c-scrollind__thumb');
    if (track && thumb) {
      track.parentElement.setAttribute('data-overflow', '');
      const all = (rs, out) => { for (const r of rs) { if (r.selectorText !== undefined) out.push(r); else if (r.cssRules) all(r.cssRules, out); } return out; };
      const rs = []; for (const sh of d.styleSheets) { try { all(sh.cssRules, rs); } catch (e) { /* unreadable sheet */ } }
      const hit = (el) => rs.filter((r) => { try { return el.matches(plain(r.selectorText)); } catch (e) { return false; } }).map((r) => r.cssText.replace(/\s+/g, ' '));
      const root = d.documentElement;
      for (const theme of ['light', 'dark']) for (const plat of ['', 'android', 'ios', 'maccatalyst', 'windows']) for (const desk of [false, true]) {
        root.setAttribute('data-theme', theme);
        if (plat) root.setAttribute('data-platform', plat); else root.removeAttribute('data-platform');
        if (desk) root.setAttribute('data-desktop', ''); else root.removeAttribute('data-desktop');
        thumb.removeAttribute('data-drag');
        const key = theme + '/' + (plat || 'none') + '/' + (desk ? 'desktop' : 'phone');
        const tr = hit(track), th = hit(thumb); thumb.setAttribute('data-drag', ''); const dr = hit(thumb); thumb.removeAttribute('data-drag');
        got[key] = { track: tr, thumb: th, drag: dr }; gotMeta.combos++;
      }
    }
  } catch (e) { got.threw = String(e && e.message || e); }
  finally { try { kitSession && kitSession.dom.window.close(); } catch (e) { /* closed */ } }
  const wantFor = (theme) => ({ track: EXPECT_MATCH.track, thumb: theme === 'light' ? EXPECT_MATCH.thumbLight : EXPECT_MATCH.thumbDark, drag: theme === 'light' ? EXPECT_MATCH.dragLight : EXPECT_MATCH.dragDark });
  const badCombos = Object.entries(got).filter(([k]) => k !== 'threw').filter(([k, v]) => ['track', 'thumb', 'drag'].some((x) => JSON.stringify(v[x]) !== JSON.stringify(wantFor(k.split('/')[0])[x]))).map(([k]) => k);
  const rule1c = !got.threw && gotMeta.combos === 20 && badCombos.length === 0;

  ok(rule1b, `★ fixb1 item 6 (R2-6): the SET of rules whose selector names c-scrollind anywhere in the built CSS (every <style> of every built page, any .css of the folder, inside an at-rule too) is EXACTLY the six expected (selector, declarations) in order — none in an at-rule, none with another combinator or quoting, one background declaration at most per rule — in ${Object.keys(exactPer).length} pages — ${firstBad ? JSON.stringify({ file: firstBad[0], got: firstBad[1].got, want: EXPECT_RULES }) : JSON.stringify({ otherFiles })}`);
  ok(rule1c, `★ fixb1 item 6 (R3-6 / R4-8, 1c): in the built settings shell (jsdom, the language sheet open, frame with data-overflow) the rules that match the track and the thumb through el.matches — pseudo-elements and state pseudo-classes (::before, ::after, :hover, :active, :focus, :focus-visible, :focus-within) cut off each selector first — in light and dark, with the root's data-platform none / android / ios / maccatalyst / windows, with and without data-desktop (${gotMeta.combos} states), the thumb with and without data-drag, are EXACTLY the held list (their cssText) — a rule that reaches the indicator without naming c-scrollind is red — ${JSON.stringify(got.threw ? { threw: got.threw } : { badCombos: badCombos.slice(0, 4), first: badCombos.length ? got[badCombos[0]] : null })}`);
  ok(rule3b, `★ fixb1 item 6 (R3-6, 3b): the ONLY rules of the built CSS (every page, every .css) that declare --outline-neutral-01…04 or --outline-sheet-01 are the :root and [data-theme="dark"] blocks of spixi.tokens.css and the \`.c-sheet, .c-modal\` rule (its whole body held exactly, the one "--outline-neutral-01: var(--outline-sheet-01)" among its sheet re-points); the thumb and dragged-thumb tokens are measured through the same scope as the track — ${JSON.stringify(declarers)}`);
  ok(rule2, `★ fixb1 item 6: no .c-scrollind* rule names an --icon-* token (the ink that read as the other theme) — ${JSON.stringify(iconUsers)}`);
  ok(rule3, `★ fixb1 item 6: resolved through the neutral scale — the light thumb is lighter than the dark thumb, and thumb ≠ track in both themes against the sheet-scoped track (> ${MIN_RATIO} : 1, per theme; light thumb 1.37 / dragged 1.57, dark thumb 1.33 / dragged 1.33 as measured) — ${JSON.stringify({ sheetScope, trackTok, trackScoped, v, ratios })}`);
  ok(rule4, `★ fixb1 item 6: spixi.base.css is untouched — its scrollbar-color rules are the two pointer-media ones, none for a platform — ${JSON.stringify(base)}`);
}
