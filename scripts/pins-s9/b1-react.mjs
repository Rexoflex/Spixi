/* ==== S9 B1 r2 (Damir: the reaction pill on the LAST message hung under the composer) — on the BUILT chat.html ====
 *   · exactly ONE row carries data-log-end: the newest message row (a live arrival moves it; a photo group row too)
 *   · its computed padding-bottom = the reaction reserve (the same value a reacted row computes) BEFORE any reaction,
 *     and a reaction on it changes nothing (no double reserve, no growth); an older row without a reaction has none
 * Deliberate breaks (S9 B1 r2 hand-back): `lastMsgRow.dataset.logEnd = ''` dropped → marked · the reactions.css
 *   `.c-bubble-row[data-log-end]` selector dropped → reserved */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, T0 } = K;
  const r = {};
  try {
    const s = await K.open({ caps: 'reply,media' });
    const { d, W, push } = s;
    const pb = (el) => W.getComputedStyle(el).paddingBottom;
    const ends = () => [...d.querySelectorAll('#messages > [data-log-end]')].map((x) => x.dataset.msgid);
    r.marked = JSON.stringify(ends()) === '["cc02"]';
    const last = K.rowOf(d, 'cc02');
    const before = pb(last);
    push('addReactions', 'cc01', 'like:❤️:1;', '');   // an OLDER row with a reaction: the reserve value to match
    await sleep(60);
    const reacted = pb(K.rowOf(d, 'cc01'));
    push('addReactions', 'cc02', 'like:❤️:1;', '');
    await sleep(60);
    r.reserved = before !== '' && before !== '0px' && before === reacted && pb(K.rowOf(d, 'cc02')) === before;
    push('addThem', 'cc03', 'addrPeer', 'Ana', '', 'newer', String(T0 + 300), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    r.moves = JSON.stringify(ends()) === '["cc03"]';
    /* ★ #46 N2: an EVENT CHIP last (the {7} system line) → the reserve stays on the newest MESSAGE row */
    push('addThem', '07', 'addrPeer', 'Ana', '', 'Ana added you to the group', String(T0 + 400), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    r.chipLast = JSON.stringify(ends()) === '["cc03"]';
    r.newestNoReaction = !K.rowOf(d, 'cc03').hasAttribute('data-reactions') && pb(K.rowOf(d, 'cc03')) === before;
    r.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((x) => x === true),
    '★ S9 B1 r2 (Damir) on the built chat shell: the newest message row alone carries data-log-end and the reaction reserve (padding-bottom = a reacted row\'s) with no reaction yet; a reaction on it changes nothing; a newer arrival moves the mark — ' + JSON.stringify(r));
}
