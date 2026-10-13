/* ==== S19 F13 (S18 walk, Damir 21:40: the transfer line says which way the bytes go) ====
 * On the BUILT chat.html (jsdom, phone, previews ON): a transfer in progress shows the keep-open line BY DIRECTION, on
 * both faces —
 *   · the photo tile (.c-mbubble__hint): MY photo sending → keepOpenSent "Keep Spixi open until it’s sent."; a received
 *     photo downloading → keepOpenReceived "Comes directly from the sender’s device. Keep Spixi open.";
 *   · the file card (.c-fbubble__hint, a PDF): the same pair;
 *   · the line still goes when the transfer completes (the card's hint is progress-only);
 *   · en-us carries both values (typographic ’), keepOpen is retired, and all 12 locales have both keys drafted.
 * Deliberate breaks (S19 report): keepOpenText ignores the direction (always the received line) → the sent clauses fail;
 * the photo tile passes no direction (fileFace(…, undefined)) → the sent-tile clause fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const SENT = 'Keep Spixi open until it’s sent.';
  const RECV = 'Comes directly from the sender’s device. Keep Spixi open.';
  const r = {};
  const det = {};
  try {
    const s = await K.open({ rows: false, hist: (x) => {
      /* addFile(id, address, nick, avatar, fileid, name, time, me, sent, read, progress, complete, paid, relaySent, transfer) */
      x.push('addFile', 'pS', '', '', '', 'fpS', 'mine.jpg', String(T0), 'True', 'True', 'False', '10', 'False', 'False', 'True');
      x.push('addFile', 'pR', 'addrPeer', 'Ana', '', 'fpR', 'theirs.jpg', String(T0 + 10), 'False', 'True', 'True', '10', 'False', 'False', 'True');
      x.push('addFile', 'dS', '', '', '', 'fdS', 'mine.pdf', String(T0 + 20), 'True', 'True', 'False', '10', 'False', 'False', 'True');
      x.push('addFile', 'dR', 'addrPeer', 'Ana', '', 'fdR', 'theirs.pdf', String(T0 + 30), 'False', 'True', 'True', '10', 'False', 'False', 'True');
    } });
    try {
      const { d, push } = s;
      await sleep(150);
      const txt = (id, sel) => { const row = K.rowOf(d, id); const el = row && row.querySelector(sel); return el ? el.textContent : null; };
      const now = {
        tileSent: txt('pS', '.c-mbubble[data-file] .c-mbubble__hint'),
        tileRecv: txt('pR', '.c-mbubble[data-file] .c-mbubble__hint'),
        cardSent: txt('dS', '.c-fbubble .c-fbubble__hint'),
        cardRecv: txt('dR', '.c-fbubble .c-fbubble__hint'),
      };
      det.now = now;
      r.tileSent = now.tileSent === SENT;
      r.tileRecv = now.tileRecv === RECV;
      r.cardSent = now.cardSent === SENT;
      r.cardRecv = now.cardRecv === RECV;
      push('updateFile', 'fdR', '100', 'True');
      push('updateFile', 'fpR', '100', 'True');
      await sleep(150);
      det.done = { card: txt('dR', '.c-fbubble__hint'), tile: txt('pR', '.c-mbubble__hint') };
      r.goneOnComplete = det.done.card === null && det.done.tile === null;
    } finally { s.W.close(); }
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    r.enUs = en.keepOpenSent === SENT && en.keepOpenReceived === RECV && !('keepOpen' in en);
    const locs = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
    r.locales = locs.every((c) => { const L = JSON.parse(readFileSync(join(root, 'src/strings', c + '.json'), 'utf8')); return L.keepOpenSent && L.keepOpenSent !== SENT && L.keepOpenReceived && L.keepOpenReceived !== RECV; });
  } catch (e) { r.threw = e.message; }
  const pass = Object.values(r).every((v) => v === true);
  ok(pass, '★ S19 F13 (transfer text): the keep-open line is by direction on the photo tile AND the file card — mine "Keep Spixi open until it’s sent.", received "Comes directly from the sender’s device. Keep Spixi open."; gone on complete; en-us + 12 locales, keepOpen retired — ' + JSON.stringify(r) + (pass ? '' : ' ' + JSON.stringify(det)));
}
