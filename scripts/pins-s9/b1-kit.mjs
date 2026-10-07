/* ==== S9 B1 — the shared boot for the b1-*.mjs chat-shell pins (NOT a pin module: the registered modules import it) ====
 * The BUILT chat.html in jsdom (the pins-s8/ui-kit.mjs model): C# pushes through executeUiCommand, outgoing ixian: verbs
 * captured at the Location href setter. `open({ group, caps, mobile, desktop, before })` = a 1:1 (type 0) or a group
 * (type 1) with one text row each way, previews ON. */
import { uiKit } from '../pins-s8/ui-kit.mjs';
export function b1Kit(h) {
  const { sleep } = h;
  const { boot, b64 } = uiKit(h);
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;
  const open = async ({ group = false, caps = 'reply,edit,voice,media', mobile = true, before = null, rows = true, hist = null } = {}) => {
    const s = await boot('chat.html', { mobile });
    s.push('onChatScreenReady', group ? 'addrGroup' : 'addrPeer');
    s.push('setChatMode', group ? '1' : '0', '0', '', 'False');
    if (caps) s.push('setCaps', caps);
    s.push('setPhotoPreviews', 'True');
    if (before) before(s);
    s.push('clearMessages', 'false');
    if (rows) {
      s.push('addThem', 'cc01', group ? 'addrAna' : 'addrPeer', 'Ana', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
      s.push('addMe', 'cc02', 'addrMe', 'Me', '', 'my words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    }
    if (hist) hist(s);   // history rows inside the load burst
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(300);
    return s;
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(e)).length === 0;
  const rowOf = (d, id) => d.querySelector('#messages > [data-msgid="' + id + '"]');
  /* a 1×1 JPEG data: URI (FILE_THUMB_RE shape) */
  const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAA==';
  return { b64, NOW, T0, boot, open, noErr, rowOf, JPG, sleep };
}
