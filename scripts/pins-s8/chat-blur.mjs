/* ==== SESSION 8 (S1) — ★ S8 (#1235) DESKTOP LIGHT-DISMISS ACROSS PANES, the chat shell's part, EXECUTED on the BUILT
 * chat.html (jsdom; the s1Kit model).
 *   · desktop (data-desktop): a window `blur` (a click in another pane = another WebView) closes the bot CHANNEL SELECTOR,
 *     the long-press MESSAGE MENU and the reactions INSPECT sheet (both opened with blurDismiss — overlay.js, S2);
 *     the inspect sheet is opened FIRST in a fresh boot (#46 r1 C-MINOR-3: it must not lean on the menu's listener)
 *   · mobile (no data-desktop): the same blur closes none of them
 * ⚠ The menu and inspect-sheet rows need S2's overlay.js `blurDismiss` (the merged tree); the selector row is chat.html's own.
 * Deliberate breaks: see the S8 S1 hand-back. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, pev, rowOf, noErr, guard, sleep } = k;

  const run = async (desktop) => {
    const s = await open({ desktop });
    const { W, d, push, errs } = s;
    const r = {};
    /* the reactions inspect sheet ("+N" past three emoji types) — ★ #46 r1 C-MINOR-3: FIRST, in a FRESH boot, so no
       earlier blurDismiss overlay (the menu) has installed overlay.js's one blur listener for it — the sheet's own
       open must carry the flag (blurDismiss set before / at openSheet, never after). */
    push('addReactions', 'aa05', 'like:👍:1;like:😂:1;like:😮:1;like:🔥:1;', '', '');
    await sleep(40);
    const more = rowOf(d, 'aa05').querySelector('.c-reactions__more');
    if (more) more.click();
    await sleep(60);
    r.inspectOpen = !!d.querySelector('.c-sheet[data-open] .c-reactmenu');
    W.dispatchEvent(new W.Event('blur'));
    await sleep(60);
    r.inspectAfter = !!d.querySelector('.c-sheet[data-open] .c-reactmenu');
    for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } }
    await sleep(30);
    /* the message menu (right-click opens the same openMessageMenu as a long-press) */
    const t = rowOf(d, 'aa01').querySelector('.c-bubble');
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2, id: 1 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    r.menuOpen = !!d.querySelector('.c-sheet[data-open] .c-msgmenu');
    W.dispatchEvent(new W.Event('blur'));
    await sleep(60);
    r.menuAfter = !!d.querySelector('.c-sheet[data-open] .c-msgmenu');
    for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } }
    await sleep(30);
    /* the bot channel selector (title tap in a bot room with channels) */
    push('setChatMode', '3', '0', '', 'False', '', 'True', 'False');
    push('setSelectedChannel', '0', '', 'general');
    await sleep(60);
    const title = d.querySelector('.c-topbar__identity-wrap');
    if (title) title.click();
    await sleep(60);
    r.selectorOpen = !!d.querySelector('.chat-channel-overlay');
    W.dispatchEvent(new W.Event('blur'));
    await sleep(320);   // the close detaches after its slide (≤ 260 ms)
    r.selectorAfter = !!d.querySelector('.chat-channel-overlay');
    r.noErr = noErr(errs);
    return r;
  };

  await guard('S8 #1235 blur', async () => {
    const dt = await run(true);
    const mb = await run(false);
    ok(dt.selectorOpen && !dt.selectorAfter && mb.selectorOpen && mb.selectorAfter && dt.noErr && mb.noErr,
      '★ S8 (#1235): on DESKTOP a window blur (a click in another pane) closes the bot channel selector; on mobile the same blur leaves it open — ' + JSON.stringify({ dt, mb }));
    ok(dt.menuOpen && !dt.menuAfter && dt.inspectOpen && !dt.inspectAfter && mb.menuOpen && mb.menuAfter && mb.inspectOpen && mb.inspectAfter,
      '★ S8 (#1235): on DESKTOP a window blur closes the message menu and the reactions inspect sheet (blurDismiss, overlay.js); on mobile both stay — ' + JSON.stringify({ dt, mb }));
  });
}
