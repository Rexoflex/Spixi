/* ==== SESSION 8 (S1) — ★ S8 (#1232) EMOJI REACTIONS, EXECUTED on the BUILT chat.html (jsdom, a 1:1; C# pushes via
 * executeUiCommand, outgoing ixian: commands captured at the Location href setter — the s1Kit model).
 *   · the push `like:<emoji>:<n>;` → one pill per emoji with its count; the legacy `like:<n>` → ❤️; my reaction is the own
 *     arg `like:<emoji>` (legacy `like` = ❤️) → that pill is aria-pressed, every other pill aria-disabled
 *   · a peer's emoji is untrusted: ★ #46 r4 the ALLOW-LIST (IDENTICAL to C# ReactionSet.shownEmoji): one of the six, or
 *     👍 + exactly one skin tone — everything else → ❤️ (every entry that folds to ❤️ adds into ONE ❤️ pill); markup /
 *     letters / ":" / other emoji fold, nothing becomes an element
 *   · the long-press menu offers the SIX (QUICK_REACTIONS, in order); a tap sends ixian:contextAction:react:<id>:<index>
 *     and paints my pill pressed at once; reopened (X6), ONLY my emoji is shown — pressed, inert — a tap sends nothing
 *   · a pill tap reacts with THAT pill's emoji (index); a pill outside the six is ALWAYS aria-disabled and sends nothing;
 *     once reacted, nothing sends; no :hover / :active rule reaches an inert pill or scales my menu emoji (X6)
 * Deliberate breaks: see the S8 S1 hand-back. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, pev, rowOf, noErr, guard, sleep } = k;
  const SIX = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const pills = (d, id) => [...(rowOf(d, id) || d).querySelectorAll('.c-reactions__pill:not(.c-reactions__more)')];
  const pillEmoji = (p) => (p.querySelector('.c-reactions__emoji') || {}).textContent;
  const pillCount = (p) => { const n = p.querySelector('.c-reactions__count'); return n ? Number(n.textContent) : 1; };
  const openMenu = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2, id: 1 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    return [...d.querySelectorAll('.c-sheet[data-open] .c-msgmenu')].pop() || null;   // the OPEN one (a closed sheet may linger)
  };
  const closeAll = async (W) => { for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } } await sleep(30); };
  const reactBtns = (m) => (m ? [...m.querySelectorAll('.c-msgmenu__react')] : []);

  await guard('S8 #1232 reactions', async () => {
    const s = await open();
    const { W, d, push, sent, errs } = s;
    const since = (n) => sent.slice(n);
    const r = {};

    /* a. the new form + the legacy form + my own (new form) */
    push('addReactions', 'aa01', 'like:👍:2;like:3;seen:1;', 'like:👍;', '');
    await sleep(40);
    const a = pills(d, 'aa01');
    r.parseTwo = a.length === 2 && pillEmoji(a[0]) === '👍' && pillCount(a[0]) === 2 && pillEmoji(a[1]) === '❤️' && pillCount(a[1]) === 3;
    r.ownPressed = a.length === 2 && a[0].getAttribute('aria-pressed') === 'true' && a[1].getAttribute('aria-pressed') === 'false';
    /* ★ S8 #46 r2 (N1): my own pill is pressed AND aria-disabled (no handler — no hover border), like the menu's emoji */
    r.othersDisabled = a.length === 2 && a[0].getAttribute('aria-disabled') === 'true' && a[1].getAttribute('aria-disabled') === 'true';

    /* b. the legacy own arg `like` = ❤️ */
    push('addReactions', 'aa02', 'like:2;', 'like;', '');
    await sleep(40);
    const b = pills(d, 'aa02');
    r.legacyOwnHeart = b.length === 1 && pillEmoji(b[0]) === '❤️' && pillCount(b[0]) === 2 && b[0].getAttribute('aria-pressed') === 'true';

    /* c. untrusted emoji (★ #46 r4 allow-list): 👍🏽 (👍 + a skin tone, outside the six) is kept; another emoji (🎉),
       markup, too long, a bidi override → ❤️ (folded into ONE ❤️ pill, counts added); nothing becomes an element */
    push('addReactions', 'aa05', 'like:👍🏽:1;like:🎉:1;like:<b>x</b>:1;like:' + 'x'.repeat(28) + ':2;like:‮ab:4;', '', '');
    await sleep(40);
    const c = pills(d, 'aa05');
    r.markupIsText = c.length === 2 && pillEmoji(c[0]) === '👍🏽' && !rowOf(d, 'aa05').querySelector('.c-reactions b');
    r.unsafeIsHeart = c.length === 2 && pillEmoji(c[1]) === '❤️' && pillCount(c[1]) === 8;

    /* c2. ★ #46 r1 X4 — the rule case by case (one emoji per push on aa03; replace-on-repeat). `direct` bypasses the
       base64 bridge (a lone surrogate cannot survive UTF-8) and calls the shell's addReactions with the raw string. */
    const shown = async (raw, direct) => {
      if (direct) W.addReactions('aa03', 'like:' + raw + ':1;', '', '');
      else push('addReactions', 'aa03', 'like:' + raw + ':1;', '', '');
      await sleep(15);
      const p = pills(d, 'aa03');
      return p.length === 1 ? pillEmoji(p[0]) : '<' + p.length + ' pills>';
    };
    /* ★ #46 r4 — the ALLOW-LIST case by case (the SAME list as csh untrusted_emoji_rule): KEPT the six and 👍 + each
       skin tone; → ❤️ everything the category rule of r1–r3 used to keep (a family, ☺️, a keycap, 👋🏽, a flag, 🅰️) and
       every letter-shaped run (🇸🇪🇳🇩, ⼊⾦, ⓈⒺⓃⒹ), plus ❤ without VS16, 😂 + a tone, 👍 VS16 + a tone */
    r.x4 = {};
    const KEEP = {};
    SIX.forEach((e, i) => { KEEP['six' + i] = e; });
    [0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff].forEach((t) => { KEEP['thumb' + t.toString(16)] = '👍' + String.fromCodePoint(t); });
    const FOLD = { bareHeart: '\u2764', laughTone: '😂\u{1F3FD}', thumbVsTone: '👍\ufe0f\u{1F3FD}', thumbTwoTones: '👍\u{1F3FB}\u{1F3FF}',
      zwjFamily: '\u{1F468}\u200d\u{1F469}\u200d\u{1F467}', vs16: '\u263a\ufe0f', keycap: '1\ufe0f\u20e3', waveTone: '👋🏽', party: '🎉',
      flagSI: '\u{1F1F8}\u{1F1EE}', riRunSend: '\u{1F1F8}\u{1F1EA}\u{1F1F3}\u{1F1E9}', kangxi: '\u2f0a\u2fa6', pButton: '\u{1F17F}\ufe0f',
      enclosed: '\u24c8\u24ba\u24c3\u24b9', sendIxi: 'Send IXI', colon: '👍:', riColon: '\u{1F1F8}:', twoThumbs: '👍👍' };
    for (const [k, v] of Object.entries(KEEP)) r.x4[k] = (await shown(v)) === v;
    for (const [k, v] of Object.entries(FOLD)) r.x4[k] = (await shown(v)) === '❤️';
    r.x4.loneHigh = (await shown('\uD83D', true)) === '❤️';
    r.x4.loneLow = (await shown('👍\uDC4D', true)) === '❤️';
    r.x4.thumbLoneHigh = (await shown('👍\uD83CA', true)) === '❤️';
    r.x4bad = Object.keys(r.x4).filter((key) => !r.x4[key]);
    W.addReactions('aa03', '', '', '');
    await sleep(15);

    /* d. a pill outside the six is aria-disabled and sends nothing; the ❤️ pill reacts with index 1, then the row is locked */
    r.foreignDisabled = c.length === 2 && c[0].getAttribute('aria-disabled') === 'true' && !c[1].hasAttribute('aria-disabled');
    let n0 = sent.length;
    c[0].click();
    await sleep(30);
    r.foreignPillNoSend = !since(n0).some((x) => /^ixian:contextAction:/.test(x));
    n0 = sent.length;
    const heartPill = pills(d, 'aa05')[1];
    if (heartPill) heartPill.click();
    await sleep(40);
    r.pillSendsIndex = since(n0).filter((x) => /^ixian:contextAction:/.test(x)).join('|') === 'ixian:contextAction:react:aa05:1';
    const c2 = pills(d, 'aa05');
    r.pillPressedNow = c2.length === 2 && c2[1].getAttribute('aria-pressed') === 'true' && pillCount(c2[1]) === 9
      && c2[0].getAttribute('aria-disabled') === 'true';
    n0 = sent.length;
    c2.forEach((p) => p.click());
    await sleep(30);
    r.lockedNoSend = !since(n0).some((x) => /^ixian:contextAction:/.test(x));

    /* e. the menu: the six, in order, live; 😂 sends index 2 and paints my pill */
    let m = await openMenu(W, d, 'aa04');
    let rb = reactBtns(m);
    r.menuSix = rb.length === 6 && rb.every((btn, i) => btn.textContent === SIX[i]) && rb.every((btn) => !btn.hasAttribute('aria-disabled') && !btn.hasAttribute('aria-pressed'));
    n0 = sent.length;
    rb[2].click();
    await sleep(60);
    await closeAll(W);
    r.menuSendsIndex = since(n0).filter((x) => /^ixian:contextAction:/.test(x)).join('|') === 'ixian:contextAction:react:aa04:2';
    const e = pills(d, 'aa04');
    r.menuOptimistic = e.length === 1 && pillEmoji(e[0]) === '😂' && e[0].getAttribute('aria-pressed') === 'true';

    /* f. reopened (★ X6): ONLY my emoji — pressed + inert — the other five are not rendered; a tap sends nothing (and the
       C# own arg wins the same way) */
    m = await openMenu(W, d, 'aa04');
    rb = reactBtns(m);
    r.menuLocked = rb.length === 1 && rb[0].textContent === '😂' && rb[0].getAttribute('aria-pressed') === 'true'
      && rb[0].getAttribute('aria-disabled') === 'true';
    n0 = sent.length;
    rb.forEach((btn) => btn.click());
    await sleep(40);
    r.menuLockedNoSend = !since(n0).some((x) => /^ixian:contextAction:/.test(x));
    await closeAll(W);
    m = await openMenu(W, d, 'aa01');   // C# said: mine is 👍
    rb = reactBtns(m);
    r.menuFromPush = rb.length === 1 && rb[0].textContent === '👍' && rb[0].getAttribute('aria-pressed') === 'true';
    /* ★ X6 — no hover / press feedback on the inert: every :hover / :active rule in the built shell that matches my
       pressed menu emoji ends at transform none, and none sets a border on an inert pill. Controls: a live menu emoji
       DOES scale and the live ❤️ pill DOES get a hover border (the probe can see a rule). */
    const stateRules = [];
    const walk = (rules) => { for (const ru of rules || []) { if (ru.selectorText) { if (/:hover|:active/.test(ru.selectorText)) stateRules.push(ru); } else if (ru.cssRules) walk(ru.cssRules); } };
    for (const ss of d.styleSheets) { try { walk(ss.cssRules); } catch (e) {} }
    const spec = (sel) => (sel.match(/#[\w-]+/g) || []).length * 100 + (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!not\b)[\w-]+/g) || []).length * 10;
    const finalProp = (el, prop, state) => {
      let best = null; let bestSpec = -1;
      stateRules.forEach((ru) => {
        const v = ru.style.getPropertyValue(prop);
        if (!v) return;
        for (const sel of ru.selectorText.split(',')) {
          if (!sel.includes(state)) continue;
          let hit = false;
          try { hit = el.matches(sel.split(':hover').join('').split(':active').join('')); } catch (e) { hit = false; }
          if (hit && spec(sel) >= bestSpec) { best = v.trim(); bestSpec = spec(sel); }
        }
      });
      return best;
    };
    r.mineHoverTransform = rb[0] ? finalProp(rb[0], 'transform', ':hover') : 'no button';
    await closeAll(W);
    m = await openMenu(W, d, 'aa03');   // not reacted (the X4 cases left no own arg): the six are live
    const liveBtn = reactBtns(m)[0];
    r.liveHoverTransform = liveBtn ? liveBtn.textContent + ' ' + finalProp(liveBtn, 'transform', ':hover') : 'no button';
    await closeAll(W);
    const inert = pills(d, 'aa01')[1];   // ❤️ beside my 👍 — inert
    const minePill = pills(d, 'aa01')[0];   // ★ #46 r2 (N1): my 👍 — pressed, inert
    push('addReactions', 'aa03', 'like:❤️:1;like:👍🏽:1;', '', '');   // a live ❤️ (control) + a foreign 👍🏽 (always inert)
    await sleep(30);
    const [livePill, foreignPill] = pills(d, 'aa03');
    r.inertHover = inert ? [finalProp(inert, 'border-color', ':hover'), finalProp(inert, 'border-color', ':active')] : 'no pill';
    r.mineHover = minePill ? [finalProp(minePill, 'border-color', ':hover'), finalProp(minePill, 'border-color', ':active')] : 'no pill';
    r.foreignHover = foreignPill ? [foreignPill.getAttribute('aria-disabled'), finalProp(foreignPill, 'border-color', ':hover')] : 'no pill';
    r.liveHover = livePill ? finalProp(livePill, 'border-color', ':hover') : 'no pill';
    r.noHoverOnInert = stateRules.length > 0 && r.mineHoverTransform === 'none' && /scale/.test(String(r.liveHoverTransform))
      && Array.isArray(r.inertHover) && r.inertHover[0] === null && r.inertHover[1] === null
      && Array.isArray(r.mineHover) && r.mineHover[0] === null && r.mineHover[1] === null
      && Array.isArray(r.foreignHover) && r.foreignHover[0] === 'true' && r.foreignHover[1] === null
      && typeof r.liveHover === 'string' && r.liveHover.length > 0;
    r.noErr = noErr(errs);

    ok(r.parseTwo && r.ownPressed && r.othersDisabled,
      '★ S8 (#1232): the push `like:<emoji>:<n>;` gives one pill per emoji with its count, the legacy `like:<n>` is ❤️; my reaction (own arg `like:<emoji>`) is aria-pressed and every pill — mine too (#46 r2 N1) — aria-disabled — ' + JSON.stringify(r));
    ok(r.legacyOwnHeart,
      '★ S8 (#1232): the legacy own arg `like` still marks my ❤️ (an exe that has not moved to the emoji form) — ' + JSON.stringify(r));
    ok(r.markupIsText && r.unsafeIsHeart,
      '★ S8 (#1232, #46 r4 allow-list): a peer\'s emoji is untrusted — 👍 + a skin tone is kept, another emoji (🎉) / markup / over 27 UTF-16 units / a bidi char count as ❤️ (folded into one ❤️ pill, counts added) and nothing becomes an element — ' + JSON.stringify(r));
    ok(r.x4bad.length === 0,
      '★ S8 (#46 r4): the emoji ALLOW-LIST, case by case (identical to C#) — KEPT the six and 👍 × 5 skin tones; → ❤️ ❤ without VS16, 😂 + a tone, 👍 VS16 + a tone, a family, ☺️, 1️⃣, 👋🏽, 🎉, the flag 🇸🇮, 🇸🇪🇳🇩, ⼊⾦, 🅿️, ⓈⒺⓃⒹ, "Send IXI", 👍:, RI + :, 👍👍, a lone surrogate (either half). Failing cases: ' + JSON.stringify(r.x4bad));
    ok(r.foreignDisabled && r.foreignPillNoSend && r.pillSendsIndex && r.pillPressedNow && r.lockedNoSend,
      '★ S8 (#1232, X6): a pill tap reacts with THAT pill\'s emoji by index (ixian:contextAction:react:<id>:1 for ❤️) and paints it pressed at once; a pill outside the six is aria-disabled BEFORE any reaction and sends nothing; once reacted no pill sends (one per person, never removed) — ' + JSON.stringify(r));
    ok(r.menuSix && r.menuSendsIndex && r.menuOptimistic,
      '★ S8 (#1232): the long-press menu offers the six QUICK_REACTIONS in order; 😂 sends ixian:contextAction:react:<id>:2 and the pill shows pressed at once — ' + JSON.stringify(r));
    ok(r.menuLocked && r.menuLockedNoSend && r.menuFromPush && r.noErr,
      '★ S8 (#1232, #46 r1 X6): reopened after a reaction (mine, or C#\'s own arg) the menu shows ONLY my emoji — pressed and aria-disabled — the other five are not rendered, and no tap sends a second reaction — ' + JSON.stringify(r));
    ok(r.noHoverOnInert,
      '★ S8 (#46 r1 X6): no hover / press feedback on anything inert — my pressed menu emoji ends at transform none on :hover (a live one scales), and no :hover / :active border rule reaches an inert pill or a foreign (always aria-disabled) one, while a live pill keeps its hover border — ' + JSON.stringify({ mine: r.mineHoverTransform, live: r.liveHoverTransform, inert: r.inertHover, foreign: r.foreignHover, livePill: r.liveHover, rules: stateRules.length }));
  });

  /* c4. ★ S8 #46 r3 (MINOR-2) — THE PARITY PIN: every row of the SHARED table scripts/pins-s8/emoji-cases.json (the csh
     test emoji_rule_shared_case_table runs the same rows through ReactionSet.shownEmoji) through the BUILT chat.html's
     reactionEmoji — the function itself, cut out of the built shell (from `function reactionEmoji(` to `function
     reactToMessage`) and evaluated alone with the BUILT bundle's QUICK_REACTIONS, so a lone surrogate reaches it unchanged.
     ★ #46 r4 (allow-list): the result must equal the row's `shown`. */
  {
    const r4 = { rows: 0, kept: 0, bad: [] };
    try {
      const table = JSON.parse(h.readFileSync(h.join(h.root, 'scripts', 'pins-s8', 'emoji-cases.json'), 'utf8'));
      const raw = h.join(h.root, 'Spixi', 'Resources', 'Raw', 'html');
      const html = h.readFileSync(h.join(raw, 'chat.html'), 'utf8');
      const bundle = h.readFileSync(h.join(raw, 'spixi.bundle.js'), 'utf8');
      const qm = bundle.match(/const QUICK_REACTIONS = (\[[^\]]*\]);/);
      if (!qm) throw new Error('QUICK_REACTIONS not found in the built bundle');
      const quick = JSON.parse(qm[1].replace(/'/g, '"'));
      const a = html.indexOf('function reactionEmoji(');
      const b = html.indexOf('function reactToMessage', a);
      if (a < 0 || b < 0) throw new Error('reactionEmoji not found in the built chat.html');
      const reactionEmoji = new Function('QUICK_REACTIONS', html.slice(a, b) + '\nreturn reactionEmoji;')(quick);
      for (const row of table) {
        r4.rows++;
        if (row.keep) r4.kept++;
        const out = reactionEmoji(row.in);
        if (out !== row.shown) r4.bad.push(row.name + ' (want ' + JSON.stringify(row.shown) + ', got ' + JSON.stringify(out) + ')');
      }
    } catch (e) { r4.bad.push('harness: ' + e.message); }
    ok(r4.rows >= 170 && r4.kept === 12 && r4.bad.length === 0,
      '★ S8 (#46 r3 MINOR-2, r4 allow-list): the SHARED emoji table (scripts/pins-s8/emoji-cases.json, also run by csh against ReactionSet.shownEmoji) — every row through the built chat.html\'s reactionEmoji gives the row\'s `shown` (' + r4.rows + ' rows, ' + r4.kept + ' kept: the six, U+2764, 👍 × 5 tones). Failing rows: ' + JSON.stringify(r4.bad.slice(0, 20)));
  }
}
