/* ==== SESSION 7b — ★ 7b (#1214) STRIP B: the reply / edit strip is the FIRST LINE INSIDE the pill, EXECUTED on the BUILT
 * chat.html (jsdom).
 *   · a reply (menu or swipe) puts .c-composer__ctx as the FIRST child of .c-composer__field, the field carries data-ctx
 *     (its wrap turns on: computed flex-wrap wrap ⇄ nowrap without), the title is the SENDER alone ("Bob", no "Reply to"),
 *     the ctx carries the `tile` key through (the S1⇄S2 contract), the cost line (#86) stays a bar line above the pill
 *   · the tile per kind (setComposerContext on the built bundle): image = <img> with the data: src as a PROPERTY; a non-data
 *     src (https:, javascript:, data:text/html) = no tile; file = span[data-file] whose text is the ext (sanitised ≤ 4
 *     upper-case), the family kind for the card colours; '' = the generic glyph; voice = span[data-voice]; an EDIT ctx
 *     never shows a tile; unknown type = none
 *   · ✕ closes the strip, data-ctx goes; an edit's ✕ (and Escape) gives the draft back
 * Deliberate breaks: see the hand-back. */
import { s1Kit } from './s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, rowOf, strip, input, field, composer, swipe, pick, type, noErr, guard, sleep } = k;

  await guard('#1214 strip', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, push } = s;
    const r = {};
    const S = W.Spixi;
    const cs = (el) => W.getComputedStyle(el);
    r.wrapOffAtRest = cs(field(d)).flexWrap !== 'wrap' && field(d).dataset.ctx === undefined;
    /* a. the menu Reply on Bob's text */
    r.picked = await pick(W, d, 'aa01', 'Reply');
    const st = strip(d);
    r.inField = !!st && st.parentElement === field(d) && field(d).firstElementChild === st;
    r.dataCtx = field(d).dataset.ctx === 'reply';
    r.wrapOn = cs(field(d)).flexWrap === 'wrap';
    r.title = !!st && st.querySelector('.c-composer__ctx-title').textContent === 'Bob';
    r.a11yName = !!st && st.getAttribute('role') === 'group' && st.getAttribute('aria-label') === 'Reply to Bob';   // #46 r1 B-m3
    r.excerpt = !!st && st.querySelector('.c-composer__ctx-text').textContent === 'hello from Bob';
    const c1 = S.getComposerContext(composer(d));
    r.tileKeyPassed = !!c1 && Object.prototype.hasOwnProperty.call(c1, 'tile');   // S2's replySourceFor fills it; null until then
    r.cancelGlyph20 = !!st && st.querySelector('.c-composer__ctx-cancel svg').getAttribute('width') === '20';
    /* b. ✕ → gone, data-ctx gone */
    st.querySelector('.c-composer__ctx-cancel').click();
    await sleep(20);
    r.closed = !strip(d) && field(d).dataset.ctx === undefined && cs(field(d)).flexWrap !== 'wrap';
    /* c. the swipe path lands in the same place */
    await swipe(W, d, 'aa03', 90);
    r.swipeInField = !!strip(d) && strip(d).parentElement === field(d) && /report\.pdf/.test(strip(d).textContent);
    d.querySelector('.c-composer__ctx-cancel').click();
    await sleep(20);
    /* d. the cost line stays ABOVE the pill (a bar line), the strip inside the pill */
    S.setComposerCost(composer(d), 'Sending messages costs 0.1 IXI per kB');
    await pick(W, d, 'aa01', 'Reply');
    const cost = d.querySelector('.c-composer__cost');
    r.costAbove = !!cost && cost.parentElement === composer(d) && composer(d).firstElementChild === cost && strip(d).parentElement === field(d);
    d.querySelector('.c-composer__ctx-cancel').click();
    S.setComposerCost(composer(d), '');
    await sleep(20);

    /* e. the tile per kind — the composer half of the contract, on the built bundle */
    const comp = composer(d);
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const tileOf = (tile, kind = 'reply') => {
      S.setComposerContext(comp, { kind, title: 'Bob', text: 'x', tile });
      const t = d.querySelector('.c-composer__ctx .c-composer__ctx-tile');
      return t;
    };
    let t = tileOf({ type: 'image', src: PNG });
    r.imgTile = !!t && t.tagName === 'IMG' && t.src === PNG && t.getAttribute('alt') === '' && t.getAttribute('aria-hidden') === 'true'
      && t.nextElementSibling === d.querySelector('.c-composer__ctx-cancel') && t.previousElementSibling === d.querySelector('.c-composer__ctx-info');
    r.httpsRejected = !tileOf({ type: 'image', src: 'https://evil.example/x.png' });
    r.jsRejected = !tileOf({ type: 'image', src: 'javascript:alert(1)' });
    r.htmlDataRejected = !tileOf({ type: 'image', src: 'data:text/html;base64,PHNjcmlwdD4=' });
    r.svgDataRejected = !tileOf({ type: 'image', src: 'data:image/svg+xml;base64,PHN2Zy8+' });
    t = tileOf({ type: 'file', ext: 'PDF' });
    r.fileTile = !!t && t.tagName === 'SPAN' && t.hasAttribute('data-file') && t.textContent === 'PDF' && t.dataset.kind === 'pdf';
    t = tileOf({ type: 'file', ext: '<b>docx</b>' });
    r.extSanitised = !!t && t.textContent === 'BDOC' && !t.querySelector('b');
    t = tileOf({ type: 'file', ext: 'zip' });
    r.extUpper = !!t && t.textContent === 'ZIP' && t.dataset.kind === 'archive';
    t = tileOf({ type: 'file', ext: '' });
    r.genericFile = !!t && t.textContent === '' && !!t.querySelector('svg') && t.dataset.kind === 'other';
    t = tileOf({ type: 'voice' });
    r.voiceTile = !!t && t.hasAttribute('data-voice') && !!t.querySelector('svg');
    r.nullNone = !tileOf(null) && !tileOf({ type: 'nope' });
    r.editNoTile = !tileOf({ type: 'image', src: PNG }, 'edit');
    S.setComposerContext(comp, null);
    await sleep(20);

    /* f. an EDIT: title "Edit message", ✕ gives the draft back; Escape the same */
    type(W, d, 'my unsent draft');
    r.editPicked = await pick(W, d, 'aa02', 'Edit');
    const se = strip(d);
    r.editInField = !!se && se.parentElement === field(d) && field(d).dataset.ctx === 'edit' && /Edit message/.test(se.textContent) && input(d).value === 'my own words';
    r.editA11yName = !!se && se.getAttribute('aria-label') === 'Edit message';
    se.querySelector('.c-composer__ctx-cancel').click();
    await sleep(20);
    r.editCancelDraft = !strip(d) && input(d).value === 'my unsent draft' && field(d).dataset.ctx === undefined;
    await pick(W, d, 'aa02', 'Edit');
    input(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(20);
    r.editEscDraft = !strip(d) && input(d).value === 'my unsent draft';
    /* #46 r1 B-m2: `replyingTo` is a live key again (composer.js sweeps it) — every shipped locale carries it, so the
       shell's hover-button label (replyButtonLabel) and the strip's name translate */
    const strJs = h.readFileSync(h.join(h.root, 'Spixi/Resources/Raw/html/spixi.strings.js'), 'utf8');
    const enJson = JSON.parse(h.readFileSync(h.join(h.root, 'src/strings/en-us.json'), 'utf8'));
    r.keyLive = enJson.replyingTo === 'Reply to' && (strJs.match(/"replyingTo":/g) || []).length >= 13 && /"replyingTo":\s*"Antwort an"/.test(strJs);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1214) STRIP B on the built chat shell: the reply / edit strip is the FIRST child of the pill (.c-composer__field[data-ctx] — the wrap turns on only then, no :has()), the title is the sender alone and the strip is a group named "Reply to Bob" / "Edit message" (replyingTo live in every locale, #46 r1 B-m2/m3), the ctx carries `tile` through (S1⇄S2), the cost line stays above the pill; the tile: a data: raster image as an <img> property (https / javascript / data:text/html / svg rejected), a file ext tile (sanitised ≤ 4 upper-case, the family kind), a generic file glyph, a voice mic, none for an edit / null / unknown; ✕ and Escape close it and an edit gives the draft back — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* #46 r1 B-m1: recording with a strip open — the strip stays in view above the bar (no display:none ancestor in the
     built CSS), the input line hides, the bar is up; Back closes the strip (no ixian:back) and the bar stays */
  await guard('#46 r1 B-m1 rec strip', async () => {
    const s = await open({ caps: 'reply,edit,voice' });
    const { W, d, push, sent } = s;
    const r = {};
    const shown = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { if (W.getComputedStyle(n).display === 'none') return false; } return !!el; };
    await swipe(W, d, 'aa01', 90);
    push('voiceRec', 'recording', '0');
    await sleep(30);
    const bar = d.querySelector('.c-composer__rec');
    r.barUp = !!bar && composer(d).hasAttribute('data-rec') && shown(bar);
    r.stripShown = !!strip(d) && strip(d).parentElement === field(d) && shown(strip(d)) && /hello from Bob/.test(strip(d).textContent);
    r.inputHidden = !shown(input(d));
    r.ownLine = W.getComputedStyle(field(d)).flexBasis === '100%' || /^0 0 100%/.test(W.getComputedStyle(field(d)).flex);
    const n0 = sent.length;
    push('chatBack');
    await sleep(30);
    r.backClosed = !strip(d) && !sent.slice(n0).includes('ixian:back') && !!d.querySelector('.c-composer__rec');
    r.fieldHiddenAgain = !shown(field(d));
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#46 r1 B-m1) RECORDING WITH A STRIP on the built chat shell: an open reply strip stays in view above the recording bar (no display:none ancestor — the pill keeps only the strip, a line of its own), the input line hides, the bar is up; Back closes the strip (no ixian:back) and the bar stays — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
