/* ==== S10 C — F2 (#1254): the photo grid on the BUILT chat.html + P3 (the two-line created line) ====
 *   · a RECEIVED group of 7 with 3 offers → "Download all (3)" under the grid; a tap → ixian:acceptfile for EACH offer in
 *     group order, once (a second tap asks nothing); the offers' first ticks re-render the bubble without the button;
 *   · ★ S11 G re-base (#1263 a = A): no "+N" any more (the mosaic shows every photo, pins-s11/g-album.mjs) — the fifth CELL
 *     opens the viewer at the fifth photo;
 *   · the viewer's Reply → the composer replies to THE PHOTO ON SCREEN (that member's id);
 *   · DISPLAY: the reply strip / the rendered quote box of the FIRST member of a ≥ 2 group say "📷 7 photos"; a quote of
 *     another member shows that photo's name;
 *   · P3: the id-07 created line keeps C#'s "\n" (the chip carries data-lines; the CSS is white-space: pre-line).
 * Deliberate breaks (C-brk): see the S10 C report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  let s = null;   // the open document — closed in finally (a throw must not leave jsdom timers holding the runner)
  const { ok, root, readFileSync, join, stripCode } = h;
  const K = b1Kit(h);
  const { sleep, JPG, T0 } = K;
  const GID = '0123456789abcdef';
  const OFFERS = [2, 5];   // live offers
  const GONE = 6;          // ★ #46 R3-11: an offer whose file is gone from this device — never counted, never accepted
  const r = {};
  try {
    s = await K.open({ caps: 'reply,edit,voice,media', rows: false });
    const { d, push, W } = s;
    const t = (n) => String(T0 + n);
    for (let i = 0; i < 7; i++) {
      const complete = OFFERS.indexOf(i) === -1 && i !== GONE;
      push('addFile', 'f' + i, 'addrPeer', 'Ana', '', 'x' + i, 'lake' + i + '.jpg', t(30 + i), 'False', 'True', 'True', complete ? '100' : '0', complete ? 'True' : 'False', 'False', 'True', '', i === GONE ? '0' : '1', '', GID + '|' + i + '|7|');
    }
    /* ★ #46 n-4: a group whose index-0 photo is NOT here (h1 = index 1 leads) · R3-15: a ONE-photo group with a caption */
    push('addFile', 'h1', 'addrPeer', 'Ana', '', 'y1', 'hill1.jpg', t(40), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'aaaaaaaaaaaaaaa1|1|3|');
    push('addFile', 'h2', 'addrPeer', 'Ana', '', 'y2', 'hill2.jpg', t(41), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'aaaaaaaaaaaaaaa1|2|3|');
    push('addFile', 'k0', 'addrPeer', 'Ana', '', 'z0', 'solo.jpg', t(42), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'bbbbbbbbbbbbbbb2|0|1|c0ffee02');
    push('addThem', 'c0ffee02', 'addrPeer', 'Ana', '', 'just one', t(43), 'True', 'True', 'True', 'False', 'False');
    /* replies: the FIRST photo, the fourth, the index-1 lead, the one-photo group */
    push('addThem', 'q1', 'addrPeer', 'Ana', '', 'look at these', t(50), 'True', 'True', 'True', 'False', 'False', '', 'f0', '', 'Ana', 'lake0.jpg');
    push('addThem', 'q2', 'addrPeer', 'Ana', '', 'and this one', t(51), 'True', 'True', 'True', 'False', 'False', '', 'f3', '', 'Ana', 'lake3.jpg');
    push('addThem', 'q3', 'addrPeer', 'Ana', '', 'the hill', t(52), 'True', 'True', 'True', 'False', 'False', '', 'h1', '', 'Ana', 'hill1.jpg');
    push('addThem', 'q4', 'addrPeer', 'Ana', '', 'the solo', t(53), 'True', 'True', 'True', 'False', 'False', '', 'k0', '', 'Ana', 'solo.jpg');
    push('messagesDone');
    push('onChatScreenLoaded');
    for (let i = 0; i < 7; i++) if (OFFERS.indexOf(i) === -1 && i !== GONE) push('setFileThumb', 'f' + i, JPG);
    await sleep(300);
    const grp = () => K.rowOf(d, 'f0');
    const dl = () => grp() && grp().querySelector('.c-mgrid__dlall');
    const cellTile = (i) => grp() && grp().querySelectorAll('.c-mgrid__cell')[i].querySelector('.c-mbubble');
    r.button = !!dl() && dl().textContent.trim() === 'Download all (2)';
    r.noMoreButton = !grp().querySelector('.c-mgrid__more') && grp().querySelectorAll('.c-mgrid__cell').length === 7;   /* ★ S11 G re-base (#1263 a): was the "+3" button (moreButton) */
    const quoteText = (id) => { const q = K.rowOf(d, id) && K.rowOf(d, id).querySelector('.c-bubble__reply'); return q ? q.textContent : ''; };
    r.quoteFirst = quoteText('q1').includes('\u{1F4F7} 7 photos') && !quoteText('q1').includes('lake0.jpg');
    r.quoteOther = quoteText('q2').includes('lake3.jpg') && !quoteText('q2').includes('photos');
    r.quoteNoIndex0 = quoteText('q3').includes('hill1.jpg') && !quoteText('q3').includes('photos');
    r.quoteOnePhoto = quoteText('q4').includes('solo.jpg') && !quoteText('q4').includes('photos');
    const acc = () => s.sent.filter((v) => v.startsWith('ixian:acceptfile:'));
    /* ★ #46 m-6: a single-cell accept counts — Download all then asks only the other offer */
    const cell2 = grp().querySelectorAll('.c-mgrid__cell')[2].querySelector('.c-mbubble[data-file="offer"]');
    if (cell2) cell2.click();
    await sleep(40);
    dl().click();
    await sleep(40);
    r.acceptsInOrder = !!cell2 && acc().join() === 'ixian:acceptfile:x2,ixian:acceptfile:x5' && dl().disabled;
    cellTile(5).click();   // offers still offers (no tick yet): inside the guard nothing is asked again — ★ S11 G re-base: the offer cell (was the "+N")
    await sleep(40);
    r.noTwice = acc().length === 2 && !d.querySelector('.c-mviewer') && !s.sent.includes('ixian:acceptfile:x6');
    await sleep(3200);   // the guard ran out with the offers still offers → the button is back
    r.buttonBack = !!dl() && !dl().disabled;
    for (const i of OFFERS) push('updateFile', 'x' + i, '10', 'False');
    await sleep(150);
    r.goneAfterTicks = !!grp() && !dl() && !grp().querySelector('.c-mgrid__foot');   /* ★ S11 G re-base: the footer goes with the button */
    /* ★ S11 G re-base: the fifth CELL → the viewer at the fifth photo (f4: the complete set is f0 f1 f3 f4) */
    for (const im of grp().querySelectorAll('.c-mbubble__img')) if (im.getAttribute('src')) im.dispatchEvent(new W.Event('load'));
    await sleep(60);
    const before = s.sent.length;
    cellTile(4).click();
    await sleep(120);
    const v = d.querySelector('.c-mviewer');
    r.viewerAt5 = !!v && (v.querySelector('.c-mviewer__count') || {}).textContent === '4 / 4' && s.sent.slice(before).includes('ixian:viewImage:f4');
    /* the viewer's Reply → that photo */
    const rb = v && v.querySelector('.c-mviewer__reply');
    r.replyBtn = !!rb && rb.getAttribute('aria-label') === 'Reply' && !rb.hidden;
    if (rb) rb.click();
    await sleep(80);
    const comp = d.querySelector('.c-composer');
    const ctx = W.Spixi.getComposerContext(comp) || {};
    const stripText = () => (d.querySelector('.c-composer__ctx-text') || {}).textContent || '';
    r.replyThatPhoto = ctx.kind === 'reply' && ctx.replyId === 'f4' && stripText() === 'lake4.jpg' && !d.querySelector('.c-mviewer[data-open]');
    /* ★ #46 n-5: the viewer on the FIRST photo → Reply → THAT photo (its name), not the group */
    await sleep(450);
    d.documentElement.dir = 'rtl';   // ★ #46 n-2: the Reply arrow mirrors
    grp().querySelectorAll('.c-mgrid__cell')[0].querySelector('.c-mbubble').click();
    await sleep(120);
    const v2 = [...d.querySelectorAll('.c-mviewer')].pop();
    r.rtlMirrored = /scaleX\(-1\)/.test((v2.querySelector('.c-mviewer__reply svg') || { style: {} }).style.transform || '');
    d.documentElement.dir = '';
    v2.querySelector('.c-mviewer__reply').click();
    await sleep(80);
    r.viewerReplySingle = (W.Spixi.getComposerContext(comp) || {}).replyId === 'f0' && stripText() === 'lake0.jpg';
    /* the cell's menu Reply on the first photo → the strip says the group */
    await sleep(450);
    grp().querySelectorAll('.c-mgrid__cell')[0].querySelector('.c-mbubble').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(150);
    const rep = [...d.querySelectorAll('[role="menuitem"], .c-menu__item, button')].find((b) => /^Reply$/.test((b.textContent || '').trim()));
    if (rep) rep.click();
    await sleep(120);
    r.stripGroup = !!rep && (W.Spixi.getComposerContext(comp) || {}).replyId === 'f0' && stripText() === '\u{1F4F7} 7 photos';
    /* ★ #46 n-3: while the recording bar is up (canReplyRec false) the viewer has no Reply */
    W.Spixi.cancelComposerContext(comp);
    push('voiceRec', 'recording', '1000');
    await sleep(60);
    grp().querySelectorAll('.c-mgrid__cell')[1].querySelector('.c-mbubble').click();
    await sleep(120);
    const v3 = [...d.querySelectorAll('.c-mviewer')].pop();
    const rb3 = v3 && v3.querySelector('.c-mviewer__reply');
    r.noReplyWhileRecording = !!v3 && (!rb3 || rb3.hidden);
    push('voiceRec', 'idle', '0');
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.CDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length > 8 && Object.values(r).every((x) => x === true),
    '★★ S10 C F2 (#1254) the photo grid on the built chat shell: "Download all (n)" under a received group with offers (a gone one not counted) accepts every offer in group order once — a cell tap counts, the button comes back after the 3 s guard — and leaves on the ticks; no "+N" (★ S11 G re-base: every photo a cell; the fifth cell → the viewer at the fifth photo); the viewer\'s Reply replies to the photo on screen; the index-0 member\'s quote / menu reply strip say "📷 7 photos" (a viewer Reply, another member, a group without its index 0 and a one-photo group show the name); no viewer Reply while recording — ' + JSON.stringify(r));

  /* ★ #46 m-7: a group with nothing complete (my photos still sending) opens NOTHING — no openfile on a file not here yet
     ★ S11 G re-base (#1263 a): the fifth sending CELL is tapped (the "+N" is gone) */
  const m7 = {};
  try {
    s = await K.open({ caps: 'reply,media', rows: false });
    for (let i = 0; i < 5; i++) s.push('addFile', 'p' + i, 'addrMe', 'Me', '', 'w' + i, 'pic' + i + '.jpg', String(T0 + 10 + i), 'True', 'True', 'True', '40', 'False', 'False', 'True', '', '1', '', 'cccccccccccccccc|' + i + '|5|');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const cells5 = K.rowOf(s.d, 'p0') ? K.rowOf(s.d, 'p0').querySelectorAll('.c-mgrid__cell') : [];
    const mb = cells5.length === 5 && !K.rowOf(s.d, 'p0').querySelector('.c-mgrid__more') ? cells5[4].querySelector('.c-mbubble') : null;
    const before = s.sent.length;
    if (mb) mb.click();
    await sleep(120);
    m7.nothingOpens = !!mb && !s.d.querySelector('.c-mviewer') && !s.sent.slice(before).some((v) => /openfile|viewImage|acceptfile/.test(v));
    m7.noErr = K.noErr(s.errs);
  } catch (e) { m7.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  ok(Object.values(m7).every((x) => x === true),
    '★ S10 C #46 m-7: a cell of a group with no complete photo opens nothing (no ixian:openfile on a file still sending; ★ S11 G re-base: the cell, the "+N" is gone) — ' + JSON.stringify(m7));

  /* P3: the created line's "\n" is a line break */
  const p = {};
  try {
    s = await K.open({ group: true, caps: 'reply,media', rows: false });
    s.push('addThem', '07', 'addrMe', '', '', 'You created this group\nMembers can see the group now.', String(T0 + 5), 'True', 'True', 'True', 'False', 'False');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(200);
    const chip = s.d.querySelector('#messages .chat-event__chip');
    p.twoLines = !!chip && chip.hasAttribute('data-lines') && chip.textContent.includes('group\nMembers');
    const css = stripCode(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8'));
    p.preLine = /\.chat-event__chip\[data-lines\] \{[^}]*white-space: pre-line;/.test(css);
    p.noErr = K.noErr(s.errs);
  } catch (e) { p.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  ok(Object.values(p).every((x) => x === true),
    '★ S10 C P3 (#1254): the owner\'s created line (id 07) keeps C#\'s "\\n" — the chip is data-lines and the built CSS sets white-space: pre-line on it — ' + JSON.stringify(p));
}
