/* ==== V1A-M M3 — THE GROUP EMOJI AVATAR (avatar.js groupEmojiOf + renderPlaceholder, v1-flags.js v1Flag, avatar.css) ====
 * On the BUILT index.html (jsdom; the *SL{SpixiP1} carrier substituted to '1' = a Debug build, or left as-is = Release):
 *   (1) CASES — Spixi.groupEmojiOf on the contract's names: "Weekend in Bled 🏔️" → "🏔️", "🎸 Band practice" → "🎸",
 *       "Family" → '', "👨‍👩‍👧 Home" → the whole ZWJ family, "Trip 🇸🇮" → the flag pair, "👍🏽 Team" → with the skin
 *       tone, "Room 5" → '', "#1 fans" → ''; plus LAST wins over FIRST ("🎸 x 🏔️"), a keycap, a tag-sequence flag, VS16
 *       (❤️ / ☀️ are emoji), text-default pictographs WITHOUT VS16 are not (™, ☀), VS15 (asked-for text) is not, edge
 *       whitespace is trimmed, a long name is read at its ends.
 *   (2) FALLBACK — the same shell booted with Intl.Segmenter DELETED before any script runs (the runtime has none):
 *       every case of (1) gives the same answer, and a differential sweep (≈ 50 emoji × 6 name shapes, incl. ZWJ
 *       sequences with skin tones, flags side by side, keycaps, Indic/decomposed marks) equals the Segmenter answer.
 *   (3) DOM, Debug (data-p1): on the chat list an emoji group row shows ONE `.c-avatar__emoji` (aria-hidden, the
 *       grapheme as text) and NO svg; a plain group shows the `users` glyph; a 1:1 contact named "🎸 Rok" shows the
 *       person fallback, never the emoji (groups only); the gradient disc (data-placeholder + data-hue) stays; a
 *       photo src still wins (an <img>, no emoji).
 *   (4) RELEASE (no data-p1): V1_RELEASE_DEFAULTS.groupavatars === false, v1Flag reads false (true with a document that
 *       carries data-p1), and every group row — emoji names included — shows the glyph; no `.c-avatar__emoji` anywhere.
 *   (5) PERF — one Intl.Segmenter for every groupEmojiOf call (300 distinct names → 0 new constructions after the
 *       first); a repeated name costs no segment() call (cached); the cache is CAPPED (the oldest of 300 names is
 *       segmented again, a recent one is not); a chat-list re-render segments none of its group names again; a
 *       pure-ASCII name never reaches the segmenter.
 *   (6) CSS (CSSOM of the built shell) — `.c-avatar__emoji` = calc(var(--c-avatar-px, var(--size-avatar-48)) * 0.52),
 *       line-height 1.25, clipped to the disc (max-width 100% · overflow hidden · nowrap, #46 r1 C-1), the colour-emoji
 *       stack ("Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji") before
 *       var(--font-ui); every `.c-avatar[data-size="N"]` scale rule resolves to N px; createAvatar stamps an inline
 *       --c-avatar-px on the span EXACTLY for the sizes with no rule (16…160 swept); every CONTEXT rule that resizes a
 *       `.c-avatar[data-size=N]` disc (the desktop list densities) carries the matching --c-avatar-px.
 * DELIBERATE BREAKS (V1A-M Drop 2, agent AVATAR) — each broke exactly its group, then restored:
 *   ① avatar.js groupEmojiOf: FIRST wins over LAST → (1) fails ("🎸 x 🏔️" → 🎸) and (2) with it.
 *   ② avatar.js AV_EXTEND: the skin-tone range removed → (2) fails ("👍🏽 Team" → '' with no Segmenter); (1) stays green.
 *   ③ avatar.js avIsEmojiGrapheme: `AV_PICTO.test(g)` alone → (1) fails ("Acme™" → ™, "Sun ☀" → ☀).
 *   ④ avatar.js renderPlaceholder: `group &&` dropped from the emoji condition → (3) fails ("🎸 Rok" wears 🎸).
 *   ⑤ v1-flags.js: V1_RELEASE_DEFAULTS.groupavatars = true → (4) fails.
 *   ⑥ avatar.js avGetSegmenter: a new Intl.Segmenter per call → (5) fails (300 constructions).
 *   ⑦ avatar.js: the cache cap check removed → (5) fails (the oldest name is still cached).
 *   ⑧ avatar.css: the data-size="44" scale rule removed → (6) fails (44 is stamped inline but listed in AV_EMOJI_SIZES).
 *   ⑨ avatar.css: the dense-density --c-avatar-px rule removed → (6) fails (a context resize without the emoji scale).
 * ★ #46 r1 (C-1 … C-4, C-N1) adds: hostile marks / bidi / trailing-punctuation / length-cap cases to (1) and (2); (6) checks the
 *   clip; (7) RELEASE whole outerHTML of a group avatar (rows + createAvatar at 40/44/80) = the base build's shape, rebuilt from
 *   the c2dd8034 recipe; (8) the chat.html topbar on the built shell (Debug): bot channel mode wears the BOT's emoji, never the
 *   channel's, across a switch; a group wears its own; a 1:1 never. Breaks run (r1), each failed exactly its groups:
 *   ⑩ C-1 whitelist `return false` → `continue` → (1)(2) ("Band 🎸" + 9 × U+0489, "Peak 🏔︎").  ⑪ C-1 the 32-unit cap removed →
 *   (1)(2) (the 12-person ZWJ chain).  ⑫ C-1 `overflow: hidden` removed → (6).  ⑬ C-2 the chat.html channel-mode avatar swap
 *   removed → (8) (bot wears 📢).  ⑭ C-3 AV_EDGE_CTRL = whitespace only → (1)(2) (RLM / PDI / PDF / FEFF cases).  ⑮ C-N1 the
 *   trailing \p{P} strip removed → (1)(2)(8).  ⑯ C-4 a stray `data-probe` on every placeholder → (7).  ⑰ N-5 the fallback joins
 *   after ANY ZWJ again → (2) ("Team ‍🎸"). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const P1 = (t) => t.replace("'*SL{SpixiP1}'==='1'", "'1'==='1'");
  const inject = (code) => (t) => t.replace('<head>', '<head><script>' + code + '</script>');
  const COUNT = 'window.__segNew=0;window.__segArgs=[];(function(){var S=Intl.Segmenter;function C(a,b){window.__segNew++;var s=new S(a,b);var o=s.segment.bind(s);s.segment=function(t){window.__segArgs.push(String(t));return o(t);};return s;}C.prototype=S.prototype;Intl.Segmenter=C;})();';
  const NOSEG = 'delete Intl.Segmenter;window.__noSeg=(typeof Intl.Segmenter);';

  const CASES = [
    ['Weekend in Bled 🏔️', '🏔️'], ['🎸 Band practice', '🎸'], ['Family', ''], ['👨‍👩‍👧 Home', '👨‍👩‍👧'],
    ['Trip 🇸🇮', '🇸🇮'], ['👍🏽 Team', '👍🏽'], ['Room 5', ''], ['#1 fans', ''],
    ['🎸 x 🏔️', '🏔️'], ['1️⃣ first', '1️⃣'], ['England 🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['Love ❤️', '❤️'], ['Sun ☀️', '☀️'],
    ['Acme™', ''], ['Sun ☀', ''], ['Peak 🏔︎', ''], ['  🎉  ', '🎉'], ['Café', ''], ['日本語', ''], ['', ''],
    ['x' + 'a'.repeat(400) + ' 🎸', '🎸'], ['🇸🇮🇭🇷', '🇭🇷'], ['☝🏽 up', '☝🏽'],
    /* #46 r1 C-N1 trailing punctuation · C-3 bidi / format controls · C-1 hostile marks and the length cap */
    ['Party 🎉!', '🎉'], ['Bled 🏔️.', '🏔️'], ['(🎸)', '🎸'], ['Fans 🎸 !?', '🎸'], ['#️⃣ fans', '#️⃣'], ['Room #', ''], ['¡Fiesta!', ''],
    ['\u0639\u0627\u0626\u0644\u0629 🏠\u200F', '🏠'], ['\u2067🎸 band\u2069', '🎸'], ['Band 🎸\u202C', '🎸'], ['\uFEFF\u200B🎸 x', '🎸'], ['Trip 🇸🇮\u2069\u200E ', '🇸🇮'],
    ['🎸' + '\u0336'.repeat(200), ''], ['Band 🎸' + '\u0489'.repeat(9), ''], ['🎸\u0301 hi', ''], ['Team \u200D🎸', '🎸'],
    ['x ' + Array(12).fill('👨').join('\u200D'), ''], ['Kiss 👩🏻‍❤️‍💋‍👨🏼', '👩🏻‍❤️‍💋‍👨🏼'], ['!'.repeat(20000), ''],
  ];
  const E = ['🎸', '🏔️', '🏔', '❤️', '❤', '☀️', '☀', '™', '©️', '👍', '👍🏽', '👍🏿', '☝🏽', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👩🏻‍❤️‍💋‍👨🏼',
    '🧑🏽‍💻', '🏳️‍🌈', '🏴‍☠️', '🇸🇮', '🇭🇷', '🇺🇸', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '1️⃣', '#️⃣', '*️⃣', '🔟', '😀', '🫠', '🧗‍♀️', '🧗🏾‍♂️', '🐻‍❄️',
    '❤️‍🔥', '🙂‍↕️', '🎉', '🍕', '⚽', '⌚', '✈️', '✈', '🕴️', '👁️‍🗨️', 'é', 'e\u0301', 'न', 'स्ते', '가', '#', '5', 'a', 'Ω', '\u200D', '🎸\u0336', '🎉!', '\u200F'];
  const SHAPES = [(a) => a, (a) => a + ' x', (a) => 'x ' + a, (a, b) => a + ' x ' + b, (a, b) => a + b, (a, b) => b + a + b];
  const corpus = [];
  for (let i = 0; i < E.length; i++) for (const sh of SHAPES) corpus.push(sh(E[i], E[(i * 7 + 3) % E.length]));

  const TS = Math.floor(Date.now() / 1000);
  const chat = (a, name, kind) => [a, name, String(TS - 60), '', 'false', 'hi', '', '0', kind, 'False', 'text', ''];
  const ROWS = [['G1', 'Weekend in Bled 🏔️', 'group'], ['G2', '🎸 Band practice', 'group'], ['G3', 'Family', 'group'],
    ['G4', '👨‍👩‍👧 Home', 'group'], ['P1', '🎸 Rok', ''], ['P2', 'Ana Bell', '']];
  const flush = (push) => { push('clearChats'); for (const [a, n, k] of ROWS) push('addChat', ...chat(a, n, k)); push('clearChatsDone'); };
  const face = (d, a) => d.querySelector('.c-chatlist-item[data-address="' + a + '"] .c-avatar');
  const look = (d, a) => {
    const f = face(d, a);
    if (!f) return null;
    const em = f.querySelectorAll('.c-avatar__emoji');
    return { emoji: em.length === 1 ? em[0].textContent : (em.length ? 'MANY' : ''), hidden: em.length === 1 && em[0].getAttribute('aria-hidden') === 'true',
      svg: f.querySelectorAll(':scope > svg').length, ini: !!f.querySelector('.c-avatar__initials'), disc: f.hasAttribute('data-placeholder') && /^\d+$/.test(f.dataset.hue || '') };
  };
  const r = {}, n = {};
  let a = null, b = null, c = null, dd = null, ee = null;
  try {
    /* —— A: Debug + a counting Segmenter —— */
    a = await K.boot('index.html', { html: (t) => inject(COUNT)(P1(t)) });
    const SA = a.W.Spixi, dA = a.d;
    n.p1 = dA.documentElement.hasAttribute('data-p1');
    n.cases = CASES.map(([nm, want]) => [nm.slice(0, 24), SA.groupEmojiOf(nm), want]).filter((x) => x[1] !== x[2]);
    r.cases = n.p1 && typeof SA.groupEmojiOf === 'function' && n.cases.length === 0 && a.W.__segNew >= 1;
    const segAnswers = corpus.map((x) => SA.groupEmojiOf(x));

    /* (3) the chat list, Debug */
    flush(a.push); await sleep(400);
    n.dom = Object.fromEntries(ROWS.map(([ad]) => [ad, look(dA, ad)]));
    const D = n.dom;
    r.dom = !!D.G1 && D.G1.emoji === '🏔️' && D.G1.hidden && D.G1.svg === 0 && D.G1.disc
      && D.G2.emoji === '🎸' && D.G2.svg === 0 && D.G4.emoji === '👨‍👩‍👧' && D.G4.svg === 0
      && D.G3.emoji === '' && D.G3.svg === 1 && !D.G3.ini
      && D.P1.emoji === '' && (D.P1.svg === 1 || D.P1.ini) && D.P2.emoji === '' && D.P2.ini
      && !D.G1.ini && !D.G2.ini;
    const glyphA = face(dA, 'G3').querySelector(':scope > svg').innerHTML;
    const photo = SA.createAvatar({ src: 'data:image/png;base64,iVBORw0KGgo=', name: '🎸 Band', group: true });
    const bare = SA.createAvatar({ name: '🎸 Band', group: true, size: 40 });
    n.photo = { img: !!photo.querySelector('img'), emoji: !!photo.querySelector('.c-avatar__emoji'), bare: (bare.querySelector('.c-avatar__emoji') || {}).textContent };
    r.photo = n.photo.img && !n.photo.emoji && n.photo.bare === '🎸';

    /* (5) perf */
    const newBefore = a.W.__segNew;
    const segCalls = () => a.W.__segArgs.length;
    // a re-render of the SAME rows first (before the 300-name sweep below evicts them from the capped cache)
    const before2 = segCalls();
    flush(a.push); await sleep(400);
    const reSeg = a.W.__segArgs.slice(before2).filter((t) => ROWS.some(([, nm]) => nm.trim() === t));
    const names = Array.from({ length: 300 }, (_, i) => 'Grp ' + i + ' 🎲');
    const c0 = segCalls();
    for (const nm of names) SA.groupEmojiOf(nm);
    const c1 = segCalls();
    SA.groupEmojiOf(names[299]); SA.groupEmojiOf(names[150]);
    const c2 = segCalls();
    SA.groupEmojiOf(names[0]);
    const c3 = segCalls();
    SA.groupEmojiOf('Plain ASCII group ' + Math.random());
    const c4 = segCalls();
    n.perf = { newDelta: a.W.__segNew - newBefore, perName: (c1 - c0) / 300, repeat: c2 - c1, evicted: c3 - c2, ascii: c4 - c3, reSeg: reSeg.length };
    r.perf = n.perf.newDelta === 0 && n.perf.perName > 0 && n.perf.perName <= 2 && n.perf.repeat === 0 && n.perf.evicted > 0
      && n.perf.ascii === 0 && n.perf.reSeg === 0;

    /* (6) the CSS */
    const rules = [];
    const walk = (list) => { for (const ru of list) { if (ru.cssRules && !ru.selectorText) { walk(ru.cssRules); continue; } if (ru.selectorText) rules.push(ru); } };
    for (const sh of dA.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
    const rootCs = a.W.getComputedStyle(dA.documentElement);
    const px = (v) => { v = String(v || '').trim(); const m = /^var\((--[\w-]+)\)$/.exec(v); if (m) v = rootCs.getPropertyValue(m[1]).trim(); return /^\d+px$/.test(v) ? parseInt(v, 10) : NaN; };
    const emo = rules.filter((ru) => ru.selectorText.trim() === '.c-avatar__emoji');
    const fam = emo.map((ru) => ru.style.getPropertyValue('font-family')).find(Boolean) || '';
    const iA = fam.indexOf('Apple Color Emoji'), iS = fam.indexOf('Segoe UI Emoji'), iN = fam.indexOf('Noto Color Emoji'), iU = fam.indexOf('var(--font-ui)');
    n.css = { emo: emo.length, fs: emo.map((ru) => ru.style.getPropertyValue('font-size')).find(Boolean), lh: emo.map((ru) => ru.style.getPropertyValue('line-height')).find(Boolean), fam,
      clip: ['max-width', 'overflow', 'white-space'].map((pr) => emo.map((ru) => ru.style.getPropertyValue(pr)).find(Boolean) || '').join('|') };
    const ladder = new Map();
    const ladderBad = [];
    for (const ru of rules) {
      const m = /^\.c-avatar\[data-size="(\d+)"\]$/.exec(ru.selectorText.trim());
      const v = ru.style.getPropertyValue('--c-avatar-px');
      if (m && v) { ladder.set(Number(m[1]), px(v)); if (px(v) !== Number(m[1])) ladderBad.push(m[1] + '=' + v); }
    }
    const stamp = [];
    for (let s = 16; s <= 160; s += 2) {
      const av = SA.createAvatar({ name: 'Sz 🎲', group: true, size: s });
      const sp = av.querySelector('.c-avatar__emoji');
      const inl = sp ? sp.style.getPropertyValue('--c-avatar-px') : 'NO-SPAN';
      if (ladder.has(s) ? inl !== '' : inl !== s + 'px') stamp.push(s + ':' + inl);
    }
    const ctxBad = [];
    let ctx = 0;
    for (const ru of rules) {
      const sel = ru.selectorText.trim();
      const m = /\.c-avatar\[data-size="(\d+)"\]$/.exec(sel);
      const w = ru.style.getPropertyValue('width');
      if (!m || !w || sel === m[0] || /,/.test(sel)) continue;
      ctx++;
      const twin = rules.find((x) => x.selectorText.trim() === sel && x.style.getPropertyValue('--c-avatar-px'));
      if (!twin || px(twin.style.getPropertyValue('--c-avatar-px')) !== px(w)) ctxBad.push(sel + ' width ' + w);
    }
    n.css.ladder = [...ladder.keys()].sort((x, y) => x - y); n.css.ladderBad = ladderBad; n.css.stamp = stamp; n.css.ctx = ctx; n.css.ctxBad = ctxBad;
    r.css = emo.length >= 1 && /^calc\(var\(--c-avatar-px, var\(--size-avatar-48\)\) \* 0\.52\)$/.test(String(n.css.fs).trim())
      && String(n.css.lh).trim() === '1.25' && n.css.clip === '100%|hidden|nowrap' && iA >= 0 && iS > iA && iN > iS && iU > iN
      && [24, 32, 40, 44, 48, 80].every((s) => ladder.has(s)) && ladderBad.length === 0 && stamp.length === 0
      && ctx >= 2 && ctxBad.length === 0;
    n.errA = a.errs.slice(0, 3);
    r.errA = K.noErr(a.errs);
    a.close(); a = null;

    /* —— B: Debug, NO Intl.Segmenter —— */
    b = await K.boot('index.html', { html: (t) => inject(NOSEG)(P1(t)) });
    const SB = b.W.Spixi;
    n.fbCases = CASES.map(([nm, want]) => [nm.slice(0, 24), SB.groupEmojiOf(nm), want]).filter((x) => x[1] !== x[2]);
    const fbAnswers = corpus.map((x) => SB.groupEmojiOf(x));
    n.diff = corpus.map((x, i) => [x, segAnswers[i], fbAnswers[i]]).filter((x) => x[1] !== x[2]).slice(0, 6);
    n.emojiHits = segAnswers.filter(Boolean).length;
    flush(b.push); await sleep(400);
    const DB = look(b.d, 'G4');
    r.fallback = b.W.__noSeg === 'undefined' && typeof b.W.Intl.Segmenter === 'undefined' && n.fbCases.length === 0
      && n.diff.length === 0 && corpus.length >= 250 && n.emojiHits >= 150 && !!DB && DB.emoji === '👨‍👩‍👧' && DB.svg === 0;
    r.errB = K.noErr(b.errs);
    b.close(); b = null;

    /* —— C: Release (no data-p1) —— */
    c = await K.boot('index.html');
    const SC = c.W.Spixi, dC = c.d;
    flush(c.push); await sleep(400);
    n.rel = Object.fromEntries(ROWS.map(([ad]) => [ad, look(dC, ad)]));
    const fakeDoc = { documentElement: { hasAttribute: (x) => x === 'data-p1' } };
    const glyphC = (face(dC, 'G1') && face(dC, 'G1').querySelector(':scope > svg')) ? face(dC, 'G1').querySelector(':scope > svg').innerHTML : '';
    r.release = !dC.documentElement.hasAttribute('data-p1') && SC.V1_RELEASE_DEFAULTS && SC.V1_RELEASE_DEFAULTS.groupavatars === false
      && SC.v1Flag('groupavatars') === false && SC.v1Flag('groupavatars', fakeDoc) === true && SC.v1Flag('nosuchflag') === false
      && ['G1', 'G2', 'G3', 'G4'].every((ad) => n.rel[ad] && n.rel[ad].emoji === '' && n.rel[ad].svg === 1 && !n.rel[ad].ini)
      && !dC.querySelector('.c-avatar__emoji') && !!glyphC && glyphC === glyphA
      && !SC.createAvatar({ name: '🎸 Band', group: true }).querySelector('.c-avatar__emoji');
    /* #46 r1 C-4: Release = the BASE build's shape, whole outerHTML — rebuilt here the way the c2dd8034 renderPlaceholder
       built a group placeholder (class, data-size, data-placeholder, data-hue, then icon('users', 0.55 × size)) */
    const baseShape = (addr, size) => { const e = dC.createElement('span'); e.className = 'c-avatar'; e.dataset.size = String(size); e.dataset.placeholder = ''; e.dataset.hue = String(SC.identityIndex(addr)); e.append(c.W.SpixiIcons.icon('users', { size: Math.round(size * 0.55) })); return e.outerHTML; };
    n.relShape = ['G1', 'G2', 'G4'].filter((ad) => !face(dC, ad) || face(dC, ad).outerHTML !== baseShape(ad, 48));
    n.relShape2 = [40, 44, 80].filter((sz) => SC.createAvatar({ name: 'Weekend in Bled 🏔️', address: 'Z9', size: sz, group: true }).outerHTML.replace(/ style="[^"]*"/, '') !== baseShape('Z9', sz));
    r.relShape = n.relShape.length === 0 && n.relShape2.length === 0;
    r.errC = K.noErr(c.errs);
    c.close(); c = null;

    /* —— D: the chat.html topbar, Debug (#46 r1 C-2 / C-4) —— */
    dd = await K.boot('chat.html', { html: P1, wait: 900 });
    const dD = dd.d;
    /* #46 r2 NIT-1: count the chat.html swap — it alone calls window.Spixi.createAvatar (createTopbar uses the bundle's own) */
    let swaps = 0;
    { const S0 = dd.W.Spixi, real = S0.createAvatar; S0.createAvatar = (o) => { swaps++; return real(o); }; }
    const sw = () => { const v = swaps; swaps = 0; return v; };
    const top = () => { const av = dD.querySelector('.c-topbar .c-topbar__identity-wrap > .c-avatar'); const em = av ? av.querySelectorAll('.c-avatar__emoji') : []; return { emoji: em.length === 1 ? em[0].textContent : (em.length ? 'MANY' : ''), svg: av ? av.querySelectorAll(':scope > svg').length : -1, ini: !!(av && av.querySelector('.c-avatar__initials')), title: ((dD.querySelector('.c-topbar__name') || {}).textContent || '').trim() }; };
    dd.push('onChatScreenReady', 'BOT1'); dd.push('setNickname', 'Quiz Bot 🤖'); dd.push('setChatMode', '3', '0', '', 'False', '', '', 'False');
    dd.push('setSelectedChannel', '0', '', 'Announcements 📢'); await sleep(200);
    n.chat = { bot1: { ...top(), sw: sw() } };
    dd.push('setSelectedChannel', '1', '', 'Random 🎲'); await sleep(200); n.chat.bot2 = { ...top(), sw: sw() };
    dd.push('setNickname', 'Plain Bot'); await sleep(200); n.chat.bot3 = { ...top(), sw: sw() };
    dd.push('setNickname', 'Dice Bot 🎲'); await sleep(200); n.chat.same = { ...top(), sw: sw() };   // same emoji as the channel → no swap
    dd.push('onChatScreenReady', 'GRP1'); dd.push('setChatMode', '1', '0', '', 'False', '', '', 'False'); dd.push('setNickname', 'Weekend in Bled 🏔️!'); await sleep(200); n.chat.grp = { ...top(), sw: sw() };
    dd.push('onChatScreenReady', 'PEER1'); dd.push('setChatMode', '0', '0', '', 'False'); dd.push('setNickname', '🎸 Rok'); await sleep(200); n.chat.one = { ...top(), sw: sw() };
    const C = n.chat;
    r.chat = C.bot1.emoji === '🤖' && /Announcements/.test(C.bot1.title) && C.bot1.svg === 0 && C.bot1.sw >= 1
      && C.bot2.emoji === '🤖' && /Random/.test(C.bot2.title) && C.bot2.sw >= 1
      && C.bot3.emoji === '' && C.bot3.svg === 1 && /Random/.test(C.bot3.title) && C.bot3.sw >= 1
      && C.same.emoji === '🎲' && C.same.sw === 0
      && C.grp.emoji === '🏔️' && C.grp.svg === 0 && C.grp.sw === 0
      && C.one.emoji === '' && (C.one.svg === 1 || C.one.ini) && C.one.sw === 0;
    r.errD = K.noErr(dd.errs);
    dd.close(); dd = null;

    /* —— E: the chat.html topbar, RELEASE (#46 r2 NIT-1): no swap at all — the avatar is exactly createTopbar's —— */
    ee = await K.boot('chat.html', { wait: 900 });
    let swE = 0;
    { const S0 = ee.W.Spixi, real = S0.createAvatar; S0.createAvatar = (o) => { swE++; return real(o); }; }
    ee.push('onChatScreenReady', 'BOT1'); ee.push('setNickname', 'Quiz Bot 🤖'); ee.push('setChatMode', '3', '0', '', 'False', '', '', 'False');
    ee.push('setSelectedChannel', '0', '', 'Announcements 📢'); await sleep(200);
    ee.push('setSelectedChannel', '1', '', 'Random 🎲'); await sleep(200);
    const avE = ee.d.querySelector('.c-topbar .c-topbar__identity-wrap > .c-avatar');
    const swapsE = swE;
    const wantE = ee.W.Spixi.createAvatar({ src: null, name: '# Random 🎲', address: 'BOT1', size: 40, online: false, group: true }).outerHTML;   // topbar.js's own arguments
    n.rel2 = { swaps: swapsE, p1: ee.d.documentElement.hasAttribute('data-p1'), same: !!avE && avE.outerHTML === wantE, emoji: !!(avE && avE.querySelector('.c-avatar__emoji')) };
    r.chatRel = swapsE === 0 && !n.rel2.p1 && n.rel2.same && !n.rel2.emoji;
    r.errE = K.noErr(ee.errs);
  } catch (e) {
    r.threw = String(e && e.stack || e).slice(0, 300);
  } finally {
    for (const s of [a, b, c, dd, ee]) if (s) s.close();
  }
  ok(r.cases === true, '★ V1A-M M3 (1): groupEmojiOf — LAST emoji grapheme wins over FIRST, whole ZWJ / skin-tone / flag / keycap / tag sequences; no emoji for "Family", "Room 5", "#1 fans", text-default ™ / ☀, VS15; #46 r1: trailing punctuation skipped ("Party 🎉!"), bidi / format controls stripped at both ends, a combining-mark stack or a > 32-unit ZWJ chain is NOT an emoji — misses: ' + JSON.stringify(n.cases) + (r.threw ? ' THREW ' + r.threw : ''));
  ok(r.fallback === true, '★ V1A-M M3 (2): with Intl.Segmenter DELETED the fallback splitter gives every contract answer and equals the Segmenter on a ' + corpus.length + '-name differential sweep (' + n.emojiHits + ' emoji hits) — misses ' + JSON.stringify(n.fbCases) + ' diff ' + JSON.stringify(n.diff));
  ok(r.dom === true, '★ V1A-M M3 (3): Debug chat list — an emoji group row wears ONE aria-hidden .c-avatar__emoji on its gradient disc and no svg; a plain group keeps the users glyph; "🎸 Rok" (1:1) never wears the emoji — ' + JSON.stringify(n.dom));
  ok(r.photo === true, '★ V1A-M M3 (3): a photo src still wins over the emoji (createAvatar) — ' + JSON.stringify(n.photo));
  ok(r.release === true, '★ V1A-M M3 (4): Release (no data-p1) = today — V1_RELEASE_DEFAULTS.groupavatars false, v1Flag false (true only with data-p1), every group row shows the same users glyph, no .c-avatar__emoji anywhere — ' + JSON.stringify(n.rel));
  ok(r.perf === true, '★ V1A-M M3 (5): perf — one Intl.Segmenter across 300 names, ≤ 2 segment() per new name, a cached name costs 0, the cache is capped (oldest re-segmented), a list re-render segments no group name again, ASCII never segments — ' + JSON.stringify(n.perf));
  ok(r.css === true, '★ V1A-M M3 (6): avatar.css — the emoji = 0.52 × --c-avatar-px, line-height 1.25, clipped to its disc (max-width 100%, overflow hidden, nowrap — #46 r1 C-1), the colour-emoji stack first; every data-size scale rule = its own px; createAvatar stamps --c-avatar-px inline exactly for sizes with no rule; every context resize (list density) carries the emoji scale — ' + JSON.stringify(n.css));
  ok(r.relShape === true, '★ V1A-M #46 r1 C-4: Release — a group avatar\'s WHOLE outerHTML (chat-list rows G1/G2/G4 with emoji names, createAvatar at 40/44/80) equals the base build\'s shape (gradient span + the users glyph, nothing else) — rows off ' + JSON.stringify(n.relShape) + ' sizes off ' + JSON.stringify(n.relShape2));
  ok(r.chat === true, '★ V1A-M #46 r1 C-2 / C-4: the chat.html topbar (Debug) — a bot in channel mode wears the BOT\'s emoji (🤖), never the channel\'s (📢 / 🎲), and keeps it across a channel switch; a bot with a plain name keeps the glyph under an emoji channel; a group wears its emoji (trailing "!" skipped); a 1:1 "🎸 Rok" never does; the swap runs ONLY when the bot\'s emoji differs from the channel title\'s (#46 r2: same emoji, group, 1:1 → 0 swaps) — ' + JSON.stringify(n.chat));
  ok(r.chatRel === true, '★ V1A-M #46 r2 NIT-1: the chat.html topbar in RELEASE (no data-p1) — the channel-mode swap never runs (0 extra createAvatar) and the avatar\'s outerHTML is exactly createTopbar\'s (name "# <channel>", glyph) — ' + JSON.stringify(n.rel2));
  ok(r.errA === true && r.errB === true && r.errC === true && r.errD === true && r.errE === true, '★ V1A-M M3: no page errors in the five boots — ' + JSON.stringify(n.errA));
}
