/* ==== S10 C — P1 (#1254, pick A): the paste / attach STRIP on the BUILT chat.html (C#'s pushes only) ====
 *   · mediaPicked(16-hex id, json) → the strip above the composer: a tile per valid item + "+" + "{n} of 10"; the send disc
 *     is SEND and enabled with no text (voice ON: never the mic); the same id again REPLACES the tiles (no mediaCancel);
 *   · ✕ → ixian:mediaDrop:<id>:<k>; the last ✕ → mediaCancel and NO mediaDrop; Send → exactly one
 *     ixian:mediaSend:<id>:<keys in strip order>:<b64url caption>, the composer cleared, the strip gone, no mediaCancel;
 *   · Escape / chatBack → mediaCancel; a newer id cancels the older; 10 items → no "+"; "+" → ixian:sendmedia;
 *     a paste while open → ixian:pasteImage; a bad id / invalid json → nothing shown; an EDIT ends at open, a REPLY stays
 *     and is not carried; a caption over 4096 → no send + the caption toast; the back mirror reports the strip;
 *   · mediaError fileTooBig → the 50 MB text; no S9 sheet token anywhere in the built shells or the bundle (code only).
 * Deliberate breaks (C-brk): see the S10 C report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  let s = null;   // the open document — closed in finally (a throw must not leave jsdom timers holding the runner)
  const { ok, root, readFileSync, readdirSync, join, stripCode } = h;
  const K = b1Kit(h);
  const { sleep, JPG } = K;
  const BID = '00112233aabbccdd';
  const items = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ k: String(from + i), thumb: JPG, w: '1600', h: '1200', kb: '300', kind: 'photo' }));
  const fromB64url = (t) => Buffer.from(t.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const r = {};
  try {
    s = await K.open({ caps: 'reply,edit,voice,media' });
    const { d, push, W } = s;
    const strip = () => d.querySelector('#chat-composer > .c-mstrip');
    const tiles = () => [...d.querySelectorAll('.c-mstrip__tile')];
    const action = () => d.querySelector('.c-composer__action');
    const input = () => d.querySelector('.c-composer__input');
    const plus = () => d.querySelector('.c-mstrip__add');
    const countTxt = () => (d.querySelector('.c-mstrip__count') || {}).textContent;
    const nSent = (v) => s.sent.filter((x) => x === v).length;
    r.micBefore = action().dataset.mode === 'mic';
    push('mediaPicked', 'zz', JSON.stringify(items(2)));
    push('mediaPicked', 'abababababababab', '{not json');
    push('mediaPicked', 'AABBCCDDEEFF0011', JSON.stringify(items(2)));   // ★ #46 n-6: upper case is not C#'s id shape
    await sleep(60);
    r.badNothing = !strip() && !s.sent.some((v) => /mediaSend|mediaDrop|AABBCCDDEEFF0011/.test(v));
    const list = items(3).concat([
      { k: '1', thumb: JPG, kind: 'photo' },                            // duplicate key
      { k: '7', thumb: 'data:image/png;base64,AAAA', kind: 'photo' },   // not a JPEG
      { k: 'x', thumb: JPG, kind: 'photo' },                            // bad key
      { k: '8', thumb: JPG, kind: 'video' },                            // not a photo
      { k: '9', thumb: 'https://evil.example/a.jpg', kind: 'photo' },   // ★ #46 R3-14: remote → the glyph, never loaded
    ]);
    push('mediaPicked', BID, JSON.stringify(list));
    await sleep(100);
    const glyphOnly = (k) => { const t = tiles().find((x) => x.dataset.k === k); return !!t && !t.querySelector('img') && !!t.querySelector('.c-mstrip__glyph svg'); };
    r.shows3 = !!strip() && tiles().length === 5 && !plus().hidden && countTxt() === '5 of 10'
      && tiles().map((t) => t.dataset.k).join() === '0,1,2,7,9' && glyphOnly('7') && glyphOnly('9')
      && [...strip().querySelectorAll('img')].length === 3 && [...strip().querySelectorAll('img')].every((i) => i.getAttribute('src') === JPG)
      && !d.querySelector('img[src^="https:"]')
      && tiles()[1].querySelector('.c-mstrip__remove').getAttribute('aria-label') === 'Remove photo 2'
      && plus().getAttribute('aria-label') === 'Add photos';
    r.sendNoText = action().dataset.mode === 'send' && !action().disabled && input().value === '';
    await sleep(30);
    r.mirrorOpen = s.sent.filter((v) => v.startsWith('ixian:chatoverlay:')).pop() === 'ixian:chatoverlay:1';
    /* the same id again with the batch's longer full list → REPLACED, not doubled, no cancel */
    push('mediaPicked', BID, JSON.stringify(items(5)));
    await sleep(60);
    r.replaced = tiles().length === 5 && countTxt() === '5 of 10' && tiles().map((t) => t.dataset.k).join() === '0,1,2,3,4'
      && nSent('ixian:mediaCancel:' + BID) === 0 && d.querySelectorAll('.c-mstrip').length === 1;
    /* ✕ on k = 1 → mediaDrop */
    tiles()[1].querySelector('.c-mstrip__remove').click();
    await sleep(40);
    r.drop = nSent('ixian:mediaDrop:' + BID + ':1') === 1 && tiles().length === 4 && countTxt() === '4 of 10';
    /* ★ #46 m-2 + m-3: C#'s list from BEFORE the drop (k 1, same thumb) is stale → k 1 stays out; the focus on k 2's ✕ survives */
    tiles()[1].querySelector('.c-mstrip__remove').focus();
    push('mediaPicked', BID, JSON.stringify(items(5)));
    await sleep(60);
    r.staleDropFiltered = tiles().map((t) => t.dataset.k).join() === '0,2,3,4';
    r.focusKept = d.activeElement === tiles()[1].querySelector('.c-mstrip__remove') && tiles()[1].dataset.k === '2';
    /* a NEW photo in the freed slot (another thumb under k 1) is shown; ✕ it again */
    const JPG2 = JPG.replace(/AAAAAAAAAA==$/, 'AAAAAAAABA==');
    push('mediaPicked', BID, JSON.stringify(items(5).map((it) => (it.k === '1' ? { ...it, thumb: JPG2 } : it))));
    await sleep(60);
    r.newInSlot = JPG2 !== JPG && tiles().map((t) => t.dataset.k).join() === '0,1,2,3,4';
    tiles()[1].querySelector('.c-mstrip__remove').click();
    await sleep(30);
    /* "+" → the picker */
    plus().click();
    r.plusPicks = s.sent[s.sent.length - 1] === 'ixian:sendmedia';
    /* Send with a caption */
    input().value = '  Lake day ✓ ~~?? ';
    input().dispatchEvent(new W.Event('input', { bubbles: true }));
    action().click();
    await sleep(60);
    const sends = s.sent.filter((v) => v.startsWith('ixian:mediaSend:'));
    const m = sends.length === 1 ? /^ixian:mediaSend:([0-9a-f]{16}):([0-9,]+):([A-Za-z0-9_=-]*)$/.exec(sends[0]) : null;
    r.sendVerb = !!m && m[1] === BID && m[2] === '0,2,3,4' && fromB64url(m[3]) === 'Lake day ✓ ~~??' && !/[+/]/.test(m[3]);
    r.sendCloses = !strip() && input().value === '' && nSent('ixian:mediaCancel:' + BID) === 0 && !s.sent.some((v) => /^ixian:chat:/.test(v));
    r.micAfter = action().dataset.mode === 'mic';
    await sleep(30);
    r.mirrorClosed = s.sent.filter((v) => v.startsWith('ixian:chatoverlay:')).pop() === 'ixian:chatoverlay:0';
    /* ★ #46 m-1: a late push for the batch just SENT is ignored (no strip, no answer) */
    const before1 = s.sent.length;
    push('mediaPicked', BID, JSON.stringify(items(2)));
    await sleep(40);
    r.endedIgnored = !strip() && s.sent.slice(before1).filter((v) => v.indexOf(BID) !== -1).length === 0;
    /* the LAST ✕ → mediaCancel, never mediaDrop */
    const B2 = 'bbbbbbbbbbbbbbbb';
    push('mediaPicked', B2, JSON.stringify(items(1, 3)));
    await sleep(60);
    tiles()[0].querySelector('.c-mstrip__remove').focus();   // the keyboard is ON the ✕ (m-3: it must not fall to the body)
    tiles()[0].querySelector('.c-mstrip__remove').click();
    await sleep(40);
    r.lastX = nSent('ixian:mediaCancel:' + B2) === 1 && !s.sent.some((v) => v.startsWith('ixian:mediaDrop:' + B2)) && !strip()
      && d.activeElement === input();   // ★ #46 m-3: focus lands in the field
    /* Escape in the composer → mediaCancel */
    const B3 = 'cccccccccccccccc';
    push('mediaPicked', B3, JSON.stringify(items(2)));
    await sleep(60);
    input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true }));   // ★ #46 m-4: the IME's
    await sleep(30);
    r.imeEscKeeps = nSent('ixian:mediaCancel:' + B3) === 0 && !!strip();
    tiles()[0].querySelector('.c-mstrip__remove').focus();
    tiles()[0].querySelector('.c-mstrip__remove').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(40);
    r.esc = nSent('ixian:mediaCancel:' + B3) === 1 && !strip() && d.activeElement === input();
    /* hardware back (chatBack) → mediaCancel */
    const B4 = 'dddddddddddddddd';
    push('mediaPicked', B4, JSON.stringify(items(2)));
    await sleep(60);
    push('chatBack');
    await sleep(40);
    r.back = nSent('ixian:mediaCancel:' + B4) === 1 && !strip();
    /* a newer batch cancels the older; 10 items → no "+" */
    const B5 = 'eeeeeeeeeeeeeeee', B6 = 'ffffffffffffffff';
    push('mediaPicked', B5, JSON.stringify(items(2)));
    await sleep(40);
    push('mediaPicked', B6, JSON.stringify(items(10)));
    await sleep(60);
    r.newer = nSent('ixian:mediaCancel:' + B5) === 1 && nSent('ixian:mediaCancel:' + B6) === 0 && tiles().length === 10
      && plus().hidden && countTxt() === '10 of 10';
    /* a paste while open → pasteImage */
    const ev = new W.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { types: ['image/png'], items: [] } });
    input().dispatchEvent(ev);
    r.paste = s.sent[s.sent.length - 1] === 'ixian:pasteImage';
    /* a caption over 4096 → no send + the caption toast (Enter on a keyboard device) */
    input().value = 'x'.repeat(4097);
    input().dispatchEvent(new W.Event('input', { bubbles: true }));
    r.capDisabled = action().disabled === true;
    W.matchMedia = (q) => ({ matches: /hover: hover/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await sleep(60);
    r.capToast = !s.sent.some((v) => v.startsWith('ixian:mediaSend:' + B6)) && input().value.length === 4097
      && [...d.querySelectorAll('.c-toast')].some((t) => t.textContent.includes('This caption is too long.'));
    input().value = '';
    input().dispatchEvent(new W.Event('input', { bubbles: true }));
    push('chatBack');
    await sleep(40);
    /* an EDIT ends when the strip opens; a REPLY stays and is not carried */
    const comp = d.querySelector('.c-composer');
    W.Spixi.setComposerContext(comp, { kind: 'edit', title: 'Edit', text: 'my words', prefillText: 'my words', editId: 'cc02' });
    push('mediaPicked', '1212121212121212', JSON.stringify(items(1)));
    await sleep(60);
    r.editEnds = !W.Spixi.getComposerContext(comp) && input().value === '';
    push('chatBack');
    await sleep(40);
    /* ★ #46 m-5: an image paste while an EDIT is open is refused */
    W.Spixi.setComposerContext(comp, { kind: 'edit', title: 'Edit', text: 'my words', prefillText: 'my words', editId: 'cc02' });
    const pv = new W.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pv, 'clipboardData', { value: { types: ['image/png'], items: [] } });
    const before5 = s.sent.length;
    input().dispatchEvent(pv);
    r.editPasteRefused = !s.sent.slice(before5).includes('ixian:pasteImage');
    W.Spixi.cancelComposerContext(comp);
    /* ★ #46 m-4: with the attach tray open, Escape is the tray's — the strip stays */
    push('mediaPicked', '5656565656565656', JSON.stringify(items(2)));
    await sleep(60);
    W.Spixi.openAttachTray({ composerEl: comp, media: true, instant: true, onAction() {} });
    await sleep(30);
    const trayUp = W.Spixi.isAttachTrayOpen(comp);
    input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(40);
    r.trayEscKeeps = !trayUp || (nSent('ixian:mediaCancel:5656565656565656') === 0 && !!strip());
    r.trayWasUp = trayUp;
    push('chatBack');
    push('chatBack');
    await sleep(40);
    W.Spixi.setComposerContext(comp, { kind: 'reply', title: 'Ana', text: 'their words', replyId: 'cc01' });
    push('mediaPicked', '3434343434343434', JSON.stringify(items(2)));
    await sleep(60);
    const replyUp = (W.Spixi.getComposerContext(comp) || {}).kind === 'reply';
    action().click();
    await sleep(60);
    r.replyStays = replyUp && nSent('ixian:mediaSend:3434343434343434:0,1:') === 1 && !s.sent.some((v) => v.startsWith('ixian:chatreply:'))
      && (W.Spixi.getComposerContext(comp) || {}).kind === 'reply';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.CDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length > 10 && Object.values(r).every((x) => x === true),
    '★★ S10 C P1 (#1254, pick A) the paste / attach STRIP on the built chat shell: mediaPicked shows n tiles + "+" + "n of 10", Send enabled with no text (never the mic); the same id REPLACES (no cancel); ✕ → ixian:mediaDrop:<id>:<k>; the last ✕ → mediaCancel, no mediaDrop; Send → ONE mediaSend:<id>:<keys>:<b64url caption>, composer cleared, strip gone; Esc / Back / a newer id → mediaCancel; 10 → no "+"; "+" → sendmedia; paste → pasteImage; bad id / json → nothing; an edit ends, a reply stays (not carried); a caption over 4096 → no send + toast; the back mirror follows — ' + JSON.stringify(r));

  /* mediaError fileTooBig → the 50 MB send text */
  const t = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    s.push('mediaError', 'fileTooBig');
    await sleep(60);
    t.text50 = [...s.d.querySelectorAll('.c-toast')].map((x) => x.textContent).join('').includes('This file is over 50 MB and can’t be sent.');
    t.noErr = K.noErr(s.errs);
  } catch (e) { t.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  /* the S9 sheet is gone from every built shell and the bundle (code, comments stripped) */
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const files = readdirSync(dir).filter((f) => /\.html$/.test(f) || f === 'spixi.bundle.js');
  const hits = files.filter((f) => /media-send-sheet|openMediaSendSheet|closeMediaSendSheet|c-msend|c-media-sheet/.test(stripCode(readFileSync(join(dir, f), 'utf8'))));
  t.noSheet = files.length > 10 && hits.length === 0;
  /* ★ #46 n-1: the ✕ target is 44 px (the size token) while its disc stays 22 px — as BUILT into chat.html */
  const chatCss = h.stripCssComments(readFileSync(join(dir, 'chat.html'), 'utf8'));
  const rm = (/\.c-mstrip__remove \{([^}]*)\}/.exec(chatCss) || [])[1] || '';
  const disc = (/\.c-mstrip__remove::before \{([^}]*)\}/.exec(chatCss) || [])[1] || '';
  t.target44 = /width: var\(--size-target-min\);/.test(rm) && /height: var\(--size-target-min\);/.test(rm) && /width: 22px;/.test(disc) && /height: 22px;/.test(disc);
  ok(Object.values(t).every((x) => x === true),
    '★ S10 C P1/P2: mediaError fileTooBig → "This file is over 50 MB and can’t be sent."; no S9 preview-sheet token in any built shell or the bundle — ' + JSON.stringify(t) + ' hits: ' + hits.join(','));
}
