/* ==== SESSION 8 (S1) — ★ S8 (#1231) THE GROUP "ADDED YOU" SYSTEM LINE, EXECUTED on the BUILT chat.html (jsdom, a group).
 *   · C# writes the line with the fixed id {7} ("07" — #46 r1 X1: {6} is Core's avatar id) as a standard message: it
 *     renders as the centred event chip (the "connected" line's style, id {1}), not a bubble, with C#'s WHOLE sentence
 *     as text, and it offers NO menu (right-click / long-press opens nothing; a bubble beside it does — C-NIT-2)
 *   · #46 r1 X2 / B-MINOR-1: the id ALONE is the gate (C# drops every peer message with a 1-byte id) — the empty-name
 *     sentence ("You were added to this group"), a sentence in another language, and markup (as TEXT) are all chips
 *   · the SAME sentence under any other id (a peer's ordinary message, and the old {6}) stays a normal bubble
 *   · the id-{1} "connected" chip is unchanged
 * Deliberate breaks: see the S8 S1 hand-back. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { boot, pev, rowOf, noErr, guard, sleep } = k;
  const T0 = Math.floor(Date.now() / 1000) - 3600;

  /* one group chat whose id-{7} line carries `lineText` (only ONE row can hold the fixed id per chat) */
  const group = async (lineText) => {
    const s = await boot();
    const { push } = s;
    push('onChatScreenReady', 'addrGroup');
    push('setChatMode', '1', '0', '', 'False');
    push('clearMessages', 'false');
    push('addThem', '07', 'addrGroup', 'Alice', '', lineText, String(T0), 'True', 'True', 'True', 'False', 'False');
    push('addThem', 'cc01', 'addrBob', 'Bob', '', 'Mallory added you to this group', String(T0 + 60), 'True', 'True', 'True', 'False', 'False');
    push('addThem', '06', 'addrGroup', 'Alice', '', 'Alice added you to this group', String(T0 + 90), 'True', 'True', 'True', 'False', 'False');
    push('addThem', '01', 'addrGroup', 'Alice', '', 'You are now connected with Alice.', String(T0 + 120), 'True', 'True', 'True', 'False', 'False');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    return s;
  };
  const chipsOf = (d) => [...d.querySelectorAll('#messages .chat-event')].map((e) => e.textContent.trim());
  const bubbleHas = (d, re) => [...d.querySelectorAll('#messages .c-bubble')].some((b) => re.test(b.textContent));
  const menuOn = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .chat-event__chip, .chat-event') || r);
    if (!t) return null;
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2, id: 1 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const open = !!d.querySelector('.c-sheet[data-open] .c-msgmenu');
    for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } }
    await sleep(30);
    return open;
  };

  await guard('S8 #1231 sysline', async () => {
    const r = {};
    /* a. the named line + the spoofs + the "connected" chip + the menu */
    let s = await group('Alice added you to this group');
    let { W, d, errs } = s;
    r.chips = chipsOf(d);
    r.addedChip = r.chips.includes('Alice added you to this group');
    r.addedGlyph = [...d.querySelectorAll('#messages .chat-event')].some((e) => /added you/.test(e.textContent) && !!e.querySelector('svg'));
    r.spoofIsBubble = !r.chips.some((c) => /Mallory/.test(c)) && bubbleHas(d, /Mallory added you to this group/);
    r.old06IsBubble = bubbleHas(d, /Alice added you to this group/) && r.chips.filter((c) => c === 'Alice added you to this group').length === 1;
    r.connectedChip = r.chips.includes('You are now connected with Alice.');
    r.lineRow = !!rowOf(d, '07') && !!rowOf(d, '07').querySelector('.chat-event__chip') && !rowOf(d, '07').querySelector('.c-bubble');
    r.lineNoMenu = (await menuOn(W, d, '07')) === false;
    r.bubbleMenu = (await menuOn(W, d, 'cc01')) === true;      // the control: the same gesture on a bubble opens the menu
    r.noErrA = noErr(errs);

    /* b. the empty-name sentence (C#'s chat-group-added-you-noname) */
    s = await group('You were added to this group');
    ({ W, d, errs } = s);
    r.nonameChip = chipsOf(d).includes('You were added to this group') && !!rowOf(d, '07') && !rowOf(d, '07').querySelector('.c-bubble');
    r.nonameNoMenu = (await menuOn(W, d, '07')) === false;

    /* c. another language (a locale change after the line was written) + markup stays TEXT */
    s = await group('<b>Ana</b> te agregó a este grupo');
    ({ W, d, errs } = s);
    r.otherLangChip = chipsOf(d).includes('<b>Ana</b> te agregó a este grupo') && !d.querySelector('#messages .chat-event b')
      && !!rowOf(d, '07') && !rowOf(d, '07').querySelector('.c-bubble');
    r.noErr = r.noErrA && noErr(errs);

    ok(r.addedChip && r.addedGlyph && r.lineRow && r.lineNoMenu && r.bubbleMenu,
      '★ S8 (#1231, #46 r1 X1 / C-NIT-2): the group "added you" line (fixed id {7}) renders as the centred event chip — the "connected" line\'s style — not a bubble, and a right-click / long-press on it opens NO menu (the same gesture on a bubble does) — ' + JSON.stringify(r));
    ok(r.nonameChip && r.nonameNoMenu && r.otherLangChip,
      '★ S8 (#1231, #46 r1 X2 / B-MINOR-1): the id ALONE is the gate — the empty-name sentence and a sentence in another language are still the chip (never a replyable bubble), and C#\'s text is shown whole as TEXT (markup makes no element) — ' + JSON.stringify(r));
    ok(r.spoofIsBubble && r.old06IsBubble && r.connectedChip && r.noErr,
      '★ S8 (#1231): the same sentence under any other id (a peer\'s message, and {6} = Core\'s avatar id) stays an ordinary bubble, and the id-{1} "connected" chip is unchanged — ' + JSON.stringify(r));
  });
}
