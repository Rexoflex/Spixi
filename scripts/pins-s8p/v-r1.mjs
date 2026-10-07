/* ==== S8 PICKS #46 ROUND 1 (Q-S) — the voice fixes, on the BUILT chat.html (jsdom) + the token / CSS algebra ====
 *   M-1  the voice bubble's 280 floor never beats its own max: at a 300–402 px log the floor ≤ the room beside a group
 *        gutter (the bubble stays inside the log — Chromium: 320 / 360 / 412, 1:1 + group, sent + received, no overflow)
 *   NIT  all 40 bars fit the narrowest bubble wave (40 × min bar + 39 × min gap ≤ the wave's room on a 320 px phone)
 *   M-2  the ACCENT badge only for a received clip that ARRIVED LIVE in this document and has not played; a history row
 *        is neutral, a re-flush keeps a live clip live, playing → neutral, `gone` → neutral (m-7)
 *   m-1  played / unplayed bars ≥ 3:1 in all four cases (light / dark × received / sent), resolved from tokens.css
 *   m-2  the accent badge ≥ 3:1 on the received bubble in both themes, its glyph ≥ 3:1 on the badge
 *   m-3 / m-4  the "{n} s left" hint lies OVER the wave (absolute, inside the wave's track, tabular figures) — it takes no
 *        width from the wave (Chromium: the wave is 83 px at 320 and 175 px at 412 from 0:24 to 0:29, in en / it / fr / ru)
 *   m-6  a history row that says "sending" draws no ring; a live inline send turns, and after 30 s without its tick the
 *        ring stands STILL (full, data-still, no animation)
 *   m-7  the seconds-left hint CEILS (25.4 s → 5, 29.1 s → 1); a deleted run head never puts a second face in a voice
 *        heir's gutter (a text heir still inherits the avatar)
 * Deliberate breaks (Q-S r1 hand-back): min-width back to min(280px, layout max) → m1Fits · the bar min-width 1.5px →
 *   2px + gap 2px → bars40 · `|| !v.live` dropped from heard → historyNeutral · noteLiveVoice's `bursting` test dropped →
 *   historyNeutral · `&& !v.gone` dropped → goneNeutral · the dark unplayed ink back to the meta ink → contrast ·
 *   the accent badge back to --surface-action-default → badge · the hint position static → hintOverlay · `&& v.live` dropped
 *   from the inline ring → historyNoRing · sendStill ignored in paintVoiceRing → stillAfter30 · Math.ceil → Math.floor →
 *   ceil · the `.c-voice__who` heir guard dropped → heirOneFace */
import { kit } from './v-kit.mjs';

/* —— tokens.css → { light, dark } maps (top-level `:root` blocks, then `[data-theme="dark"]` over them) —— */
function topBlocks(css) {
  const out = [];
  let depth = 0, selStart = 0, bodyStart = 0, sel = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') { if (depth === 0) { sel = css.slice(selStart, i).trim(); bodyStart = i + 1; } depth++; }
    else if (c === '}') { depth--; if (depth === 0) { out.push({ sel, body: css.slice(bodyStart, i) }); selStart = i + 1; } }
    else if (c === ';' && depth === 0) selStart = i + 1;
  }
  return out;
}
function tokenMaps(css) {
  const light = new Map();
  const darkOnly = new Map();
  for (const { sel, body } of topBlocks(css)) {
    const target = sel === ':root' ? light : sel === '[data-theme="dark"]' ? darkOnly : null;
    if (!target) continue;
    for (const d of body.split(';')) { const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(d); if (m) target.set(m[1], m[2]); }
  }
  return { light, dark: new Map([...light, ...darkOnly]) };
}
function resolve(map, v, depth = 0) {
  if (depth > 20) return null;
  const s = String(v || '').trim();
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(s);
  if (!m) return s;
  if (map.has(m[1])) return resolve(map, map.get(m[1]), depth + 1);
  return m[2] ? resolve(map, m[2], depth + 1) : null;
}
const lum = (hex) => {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return NaN;
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
/* min(a, b, …) of px / % (of `base`) / var() terms */
const px = (map, term, base) => {
  const t = resolve(map, term);
  if (/^-?[\d.]+px$/.test(t)) return parseFloat(t);
  if (/^-?[\d.]+%$/.test(t)) return parseFloat(t) / 100 * base;
  const mm = /^min\(([\s\S]+)\)$/.exec(t);
  if (mm) return Math.min(...splitTop(mm[1]).map((x) => px(map, x, base)));
  return NaN;
};
function splitTop(s) { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; else if (s[i] === ',' && d === 0) { out.push(s.slice(st, i).trim()); st = i + 1; } } out.push(s.slice(st).trim()); return out; }

export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const K = kit(h);
  const { sleep, T0 } = K;
  const tokCss = stripCssComments(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8'));
  const T = tokenMaps(tokCss);

  /* ——— ① CSS algebra on the BUILT shell's CSSOM + tokens: M-1, 40 bars, m-1, m-2 ——— */
  try {
    const s = await K.boot();
    const { d } = s;
    const r = {};
    const one = (sel, prop) => { const rs = K.rulesFor(d, sel).filter((x) => !x.media).map((x) => x.style.getPropertyValue(prop).trim()).filter(Boolean); return rs.length ? rs[rs.length - 1] : ''; };
    const L = T.light;
    const minW = one('.c-bubble[data-voice]', 'min-width');
    const gutter = px(L, 'var(--bubble-avatar-size)') + px(L, 'var(--spacing-8)');
    const fits = [];
    for (const log of [300, 310, 350, 402]) {
      const content = log - px(L, 'var(--bubble-avatar-inset)') - px(L, 'var(--spacing-16)');   // a group row: the avatar inset + the end inset
      fits.push(px(L, minW, content) <= content - gutter + 0.01);
    }
    r.m1Fits = !!minW && fits.every(Boolean);
    /* the narrowest 1:1 voice bubble on a 320 px phone (the log is 310 px there, measured in Chromium) → its wave's room;
       40 bars at their minimum must fit */
    const c11 = 310 - 2 * px(L, 'var(--spacing-16)');
    const bubble = Math.min(px(L, minW, c11), px(L, 'var(--bubble-max-pct)', c11));
    const room = bubble - 2 * px(L, 'var(--bubble-pad-x)') - 40 - 2 * px(L, one('.c-voice', 'gap')) - px(L, 'var(--size-avatar-40)');
    const barMin = parseFloat(one('.c-voice__bar', 'min-width')) || parseFloat(one('.c-voice__bar', 'width'));
    const gapMin = parseFloat(one('.c-voice__wave', 'gap'));
    r.bars40 = Number.isFinite(room) && 40 * barMin + 39 * gapMin <= room && one('.c-voice__wave', 'justify-content') === 'space-between';
    /* m-1 contrast: played vs unplayed, all four cases (read the RULES, resolve the tokens) */
    const unRecvL = one('.c-voice', '--voice-bar-unplayed');
    const unRecvD = one('[data-theme="dark"] .c-voice', '--voice-bar-unplayed') || unRecvL;
    const unSent = one('.c-bubble-row[data-direction="sent"] .c-voice__bar', 'background');
    const plRecv = one('.c-bubble-row[data-direction="received"] .c-voice__bar[data-played]', 'background');
    const plSent = one('.c-bubble-row[data-direction="sent"] .c-voice__bar[data-played]', 'background');
    const recvUsesVar = /--voice-bar-unplayed/.test(one('.c-bubble-row[data-direction="received"] .c-voice__bar', 'background'));
    const cr = {
      lightRecv: ratio(resolve(T.light, plRecv), resolve(T.light, unRecvL)),
      darkRecv: ratio(resolve(T.dark, plRecv), resolve(T.dark, unRecvD)),
      lightSent: ratio(resolve(T.light, plSent), resolve(T.light, unSent)),
      darkSent: ratio(resolve(T.dark, plSent), resolve(T.dark, unSent)),
    };
    r.contrast = recvUsesVar && Object.values(cr).every((x) => x >= 3);
    /* m-2: the accent badge on the received bubble, and its glyph on the badge */
    const acc = '.c-voice__who[data-tone="accent"] .c-voice__badge';
    const bg = one(acc, 'background'), fg = one(acc, 'color');
    const bd = {
      light: ratio(resolve(T.light, bg), resolve(T.light, 'var(--surface-bubble-received)')),
      dark: ratio(resolve(T.dark, bg), resolve(T.dark, 'var(--surface-bubble-received)')),
      lightGlyph: ratio(resolve(T.light, bg), resolve(T.light, fg)),
      darkGlyph: ratio(resolve(T.dark, bg), resolve(T.dark, fg)),
    };
    r.badge = Object.values(bd).every((x) => x >= 3);
    /* ★ #46 picks r2 MINOR-3 / r3 MINOR-B (pinned at r4): the PLAYED (neutral) badge is the QUIET one in both themes — the accent
       ≥ 3:1 against it, its glyph ≥ 3:1 on it, and in dark it is no louder on the bubble than the accent */
    const neu = '.c-bubble-row[data-direction="received"] .c-voice__who:not([data-tone="accent"]) .c-voice__badge';
    const nL = one(':root:not([data-theme="dark"]) ' + neu, 'background'), nD = one('[data-theme="dark"] ' + neu, 'background');
    const gL = one(':root:not([data-theme="dark"]) ' + neu, 'color'), gD = one('[data-theme="dark"] ' + neu, 'color');
    const nb = !nL || !nD ? null : {
      accVsNeuL: ratio(resolve(T.light, bg), resolve(T.light, nL)), accVsNeuD: ratio(resolve(T.dark, bg), resolve(T.dark, nD)),
      glyphL: ratio(resolve(T.light, nL), resolve(T.light, gL)), glyphD: ratio(resolve(T.dark, nD), resolve(T.dark, gD)),
    };
    r.neutralQuiet = !!nb && Object.values(nb).every((x) => x >= 3)
      && ratio(resolve(T.dark, nD), resolve(T.dark, 'var(--surface-bubble-received)')) < ratio(resolve(T.dark, bg), resolve(T.dark, 'var(--surface-bubble-received)'));
    /* ★ #46 picks r4: the reply / edit strip title stays ONE line with an ellipsis (the LAST white-space of its rule wins) */
    { const css = stripCssComments(readFileSync(join(root, 'src/styles/components/composer.css'), 'utf8'));
      const rule = (css.match(/\.c-composer__ctx-title \{[^}]*\}/) || [''])[0];
      const ws = rule.match(/white-space:\s*([a-z-]+)/g) || [];
      r.ctxTitleOneLine = ws.length >= 1 && /nowrap$/.test(ws[ws.length - 1]) && /text-overflow:\s*ellipsis/.test(rule)
        && one('.c-composer__ctx-title', 'white-space') === 'nowrap'; }
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks #46 r1 (M-1 · NIT · m-1 · m-2) VOICE BUBBLE ALGEBRA on the built chat shell + tokens.css: the voice bubble\'s 280 px floor is capped by its own max (82 % / the layout max), so at a 300–402 px log it fits beside a group gutter (at 320 px it ran 18 px past the log); all 40 bars fit the narrowest wave (gaps → 1 px, bars → 1.5 px, space-between); played / unplayed bars ≥ 3:1 in light / dark × received / sent; the accent mic badge ≥ 3:1 on the received bubble and under its glyph, both themes — '
      + JSON.stringify({ r, minW, room: Math.round(room), cr, bd }));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-r1 algebra THREW: ' + (e && e.stack || e)); }

  /* ——— ② the badge tone (M-2, gone) and the send ring (m-6) — history vs live ——— */
  try {
    const s = await K.boot();
    const { W, d, push } = s;
    const r = {};
    const tone = (id) => { const v = K.voiceOf(d, id); const f = v && v.querySelector(':scope > .c-voice__who'); return f ? f.dataset.tone : null; };
    const ring = (id) => { const v = K.voiceOf(d, id); return v ? v.querySelector('.c-voice__play > .c-voice__ring') : null; };
    const load = (rows) => {
      push('clearMessages', 'false');
      rows();
      push('messagesDone');
      push('onChatScreenLoaded');
    };
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setCaps', 'reply,edit,voice');
    const history = () => {
      push('addThem', 'ee01', 'addrPeer', 'Ana', '', '🎤 0:12', String(T0), 'True', 'True', 'False', 'False', 'False', '', '', '', '', '', '12000');
      push('addMe', 'ee02', 'addrMe', 'Me', '', '🎤 0:05', String(T0 + 10), 'False', 'False', 'False', 'False', 'False', '', '', '', '', '', '5000');
    };
    load(history);
    await sleep(200);
    r.historyNeutral = tone('ee01') === 'neutral';
    r.historyNoRing = !!K.voiceOf(d, 'ee02') && !ring('ee02') && !K.voiceOf(d, 'ee02').hasAttribute('data-sending');
    /* live */
    const timers = [];
    const realST = W.setTimeout;
    W.setTimeout = function (fn, ms, ...a) { if (ms >= 29900 && ms <= 30100) { timers.push(fn); return 0; } return realST.call(W, fn, ms, ...a); };
    push('addThem', 'ee03', 'addrPeer', 'Ana', '', '🎤 0:07', String(T0 + 100), 'True', 'True', 'False', 'False', 'False', '', '', '', '', '', '7000');
    push('addMe', 'ee04', 'addrMe', 'Me', '', '🎤 0:04', String(T0 + 110), 'False', 'False', 'False', 'False', 'False', '', '', '', '', '', '4000');
    await sleep(150);
    r.liveAccent = tone('ee03') === 'accent';
    r.liveTurns = !!ring('ee04') && ring('ee04').dataset.mode === 'inline' && !ring('ee04').hasAttribute('data-still')
      && ring('ee04').querySelector('.c-voice__ring-arc').getAttribute('stroke-dasharray') === '25 100';
    /* 30 s with no tick → the ring stands still (the scheduled repaint, the clock moved on) */
    const realNow = W.Date.now;
    W.Date.now = () => realNow.call(W.Date) + 31000;
    r.stillTimer = timers.length >= 1;
    for (const fn of timers.splice(0)) fn();
    await sleep(30);
    const g = ring('ee04');
    r.stillAfter30 = !!g && g.hasAttribute('data-still') && g.querySelector('.c-voice__ring-arc').getAttribute('stroke-dasharray') === '100 100'
      && K.voiceOf(d, 'ee04').dataset.sending === 'inline'
      && K.rulesFor(d, '.c-voice__ring[data-still]').some((x) => /none/.test(x.style.getPropertyValue('animation') + x.style.getPropertyValue('animation-name')));
    W.Date.now = realNow;
    /* a re-flush (C# reloads the window) keeps a live clip live and a history clip neutral */
    load(() => { history(); push('addThem', 'ee03', 'addrPeer', 'Ana', '', '🎤 0:07', String(T0 + 100), 'True', 'True', 'False', 'False', 'False', '', '', '', '', '', '7000'); });
    await sleep(200);
    r.reflushKeeps = tone('ee03') === 'accent' && tone('ee01') === 'neutral';
    /* played → neutral */
    push('voiceState', 'ee03', 'playing', '1000', '7000');
    await sleep(30);
    r.playedNeutral = tone('ee03') === 'neutral';
    /* gone (a live received voice FILE not on this device) → neutral */
    push('addFile', 'ee05', 'addrPeer', 'Ana', '', 'fe05', 'voice-2.ogg', String(T0 + 300), 'False', 'True', 'False', '100', 'True', 'False', 'True', '', '0', '1');
    await sleep(150);
    const v5 = K.voiceOf(d, 'ee05');
    r.goneNeutral = !!v5 && v5.hasAttribute('data-gone') && tone('ee05') === 'neutral';
    r.noErr = K.noErr(s.errs);
    W.setTimeout = realST;
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks #46 r1 (M-2 · m-6 · m-7 gone) on the built chat shell: a received clip from the HISTORY load wears the NEUTRAL badge and my history row that still says "sending" draws NO ring; a clip that arrives LIVE wears the ACCENT badge (kept across a clearMessages re-flush) until it plays; a live inline send turns its ring and, 30 s without the tick, the ring stands STILL (data-still, a full arc, no animation); a clip not on this device (gone) is neutral — '
      + JSON.stringify(r));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-r1 tone/ring THREW: ' + (e && e.stack || e)); }

  /* ——— ③ the recording hint (m-3 / m-4 / m-7 ceil) and the gutter heir (m-7) ——— */
  try {
    const s = await K.open();
    const { W, d, push } = s;
    const r = {};
    push('voiceRec', 'recording', '25400');
    await sleep(30);
    const bar = d.querySelector('.c-composer__rec');
    const hint = bar && bar.querySelector('.c-composer__rec-hint');
    const wave = bar && bar.querySelector('.c-composer__rec-wave');
    const t1 = hint ? hint.textContent : null;
    push('voiceRec', 'recording', '29100');
    await sleep(30);
    const t2 = hint ? hint.textContent : null;
    r.ceil = t1 === '5 s left' && t2 === '1 s left';
    const track = hint && hint.parentElement;
    const cs = (e, p) => W.getComputedStyle(e).getPropertyValue(p);
    r.hintOverlay = !!track && track.classList.contains('c-composer__rec-track') && wave.parentElement === track
      && cs(hint, 'position') === 'absolute' && cs(track, 'position') === 'relative' && hint.classList.contains('u-tabular')
      && [...bar.children].indexOf(track) === [...bar.children].indexOf(bar.querySelector('.c-composer__rec-time')) + 1;
    /* ★ #46 picks r2 (MINOR-1): one line beside ≥ 48 px of wave, or hidden — the CSS (max-width 100% − 48 px, nowrap, a
       cramped hint is visibility:hidden) and the flag from the hint's own overflow (jsdom has no layout: the widths are stubbed) */
    { const css = h.stripCssComments(h.readFileSync(h.join(h.root, 'src/styles/components/composer.css'), 'utf8'));
      const rule = (css.match(/\.c-composer__rec-hint \{[^}]*\}/) || [''])[0];
      const ws = rule.match(/white-space:\s*([a-z-]+)/g) || [];   /* the LAST declaration wins — #46 picks r3: a later `normal` cancelled it */
      r.hintCss = /max-width: calc\(100% - 48px\);/.test(rule) && ws.length >= 1 && /nowrap$/.test(ws[ws.length - 1])
        && /\.c-composer__rec-hint\[data-cramped\] \{ visibility: hidden; \}/.test(css); }
    Object.defineProperty(hint, 'scrollWidth', { configurable: true, get: () => 90 });
    Object.defineProperty(hint, 'clientWidth', { configurable: true, get: () => 35 });
    push('voiceRec', 'recording', '27000');
    await sleep(30);
    const cramped = hint.hasAttribute('data-cramped') && cs(hint, 'visibility') === 'hidden';
    Object.defineProperty(hint, 'scrollWidth', { configurable: true, get: () => 35 });
    push('voiceRec', 'recording', '27500');
    await sleep(30);
    r.hintCramped = cramped && !hint.hasAttribute('data-cramped');
    push('voiceRec', 'idle', '0');
    /* the heir: a run head (text, with the gutter face) deleted → the voice heir keeps ONE face; a text heir inherits */
    const S = W.Spixi;
    const host = d.createElement('div');
    d.body.append(host);
    const run = (heirVoice) => {
      host.textContent = '';
      const a = S.createMessageBubble({ direction: 'received', position: 'first', text: 'head', showAvatar: true, name: 'Ana', address: 'addrAna' });
      const b = S.createMessageBubble({ direction: 'received', position: 'last', text: heirVoice ? '' : 'tail', showAvatar: true, name: 'Ana', address: 'addrAna',
        voice: heirVoice ? { durMs: 5000, who: { name: 'Ana', address: 'addrAna' } } : null });
      host.append(a, b);
      S.removeMessage(a);
      return { pos: b.dataset.position, gutterFace: !!b.querySelector('.c-bubble-row__gutter .c-avatar'), faces: b.querySelectorAll('.c-avatar').length };
    };
    const hv = run(true);
    const ht = run(false);
    r.heirOneFace = hv.pos === 'single' && !hv.gutterFace && hv.faces === 1;
    r.textHeirInherits = ht.pos === 'single' && ht.gutterFace && ht.faces === 1;
    host.remove();
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks #46 r1 (m-3 · m-4 · m-7) on the built chat shell: the near-limit hint CEILS the seconds (25.4 s → "5 s left", 29.1 s → "1 s left") and lies OVER the wave — absolute inside the wave\'s own track (position: relative), right after the timer, in tabular figures — so it takes no width from the wave; a deleted run head never puts a second face in a VOICE heir\'s gutter (the face is in the bubble), while a text heir still inherits the avatar — '
      + JSON.stringify({ r, t1, t2, hv, ht }));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-r1 hint/heir THREW: ' + (e && e.stack || e)); }
}
