/* ==== S19 F11 (S18 walk: a blind group hides Photos / Camera / File silently — attachFlags() mirrors C#'s onSendFile
 * refusal `Group && hideParticipantAddresses`) ====
 * On the BUILT chat.html (jsdom, phone): a BLIND group (setChatMode type 2 or 1 with the raw flag "True") shows ONE notice
 * card at the start of history, right after the secure notice, in the system-notice grammar: title = blindGroup
 * ("Blind group"), body = blindGroupNotice. A normal private group, a 1:1 and a bot room flagged hidesAddresses (type 3) show none. setChatMode
 * re-renders it: a normal group answered blind later GAINS the card, answered normal again LOSES it.
 * en-us carries the contract text (typographic ’).
 * ★ #46 S19 (fix round):
 *   · M2 GROUP — the two cards centre as ONE group (rule-resolved margins, r-cascade): the secure notice is marked
 *     data-followed and resolves margin-top auto / margin-bottom 0; the blind card margin-top var(--spacing-12) /
 *     margin-bottom auto; without a blind card the secure notice keeps auto / auto (no data-followed).
 *   · M5 OLDER — with older history pending (clearMessages "true" → showOlder) there is NO blind card (nor the secure
 *     notice: this is not the start); once history is exhausted (messagesDone "false") it appears.
 *   · N1 NAME — the blind card's accessible name is the blindGroup title, not a second "Chat security notice" (the secure
 *     notice keeps systemNotice).
 * Deliberate breaks (S19 report): the setChatMode renderLog line dropped → the re-render clause fails; the predicate
 * without `mode.hidesAddresses` → the normal-group clause fails · #46 S19: the data-followed mark not set → group fails;
 * the `[data-blind-notice]` margin rule deleted → group fails; `!showOlder &&` removed from blindNoticeShown → older
 * fails; the strings override (systemNotice = title) dropped → name fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from './r-cascade.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = b1Kit(h);
  const TEXT = 'Members can’t see each other’s identity. Photos and files can’t be sent in this group.';
  const read = (d) => {
    const box = d.querySelector('#messages');
    const kids = box ? [...box.children] : [];
    const cards = kids.filter((n) => n.hasAttribute('data-blind-notice'));
    const c = cards[0];
    const at = c ? kids.indexOf(c) : -1;
    const sec = kids.find((n) => n.classList.contains('c-sysnotice') && !n.hasAttribute('data-blind-notice'));
    const C = cascade(d.defaultView);
    const mg = (n) => (n ? C.win(n, 'margin-top') + ' / ' + C.win(n, 'margin-bottom') : null);
    return {
      secure: !!sec,
      followed: !!sec && sec.hasAttribute('data-followed'),
      secureMargins: mg(sec),
      blindMargins: mg(c),
      secureName: sec ? sec.getAttribute('aria-label') : null,
      blindName: c ? c.getAttribute('aria-label') : null,
      n: cards.length,
      afterSecure: !!c && at > 0 && kids[at - 1].classList.contains('c-sysnotice') && !kids[at - 1].hasAttribute('data-blind-notice'),
      grammar: !!c && c.classList.contains('c-sysnotice') && !!c.querySelector('.c-sysnotice__card .c-sysnotice__medallion svg, .c-sysnotice__card .c-sysnotice__medallion'),
      title: c ? (c.querySelector('.c-sysnotice__title') || {}).textContent : null,
      text: c ? (c.querySelector('.c-sysnotice__text') || {}).textContent : null,
    };
  };
  const room = async (mode) => {
    const s = await K.open({ group: true, rows: true, caps: 'reply,media,camera' });
    try {
      s.push('setChatMode', ...mode);
      await sleep(200);
      return read(s.d);
    } finally { s.W.close(); }
  };
  const r = {};
  const det = {};
  try {
    const t2 = await room(['2', '0', '', 'False', '', 'True', 'True']);
    const t1b = await room(['1', '0', '', 'False', '', 'True', 'True']);
    det.t2 = t2; det.t1b = t1b;
    r.blindShows = [t2, t1b].every((x) => x.n === 1 && x.afterSecure && x.grammar && x.title === 'Blind group' && x.text === TEXT);
    const t1 = await room(['1', '0', '', 'False', '', 'True', 'False']);
    det.t1 = t1;
    r.normalGroupNone = t1.n === 0;
    /* ★ #46 S19 M2: one group — the rule-resolved margins of the pair; alone, the secure notice keeps auto / auto */
    r.group = [t2, t1b].every((x) => x.followed && /^auto \/ 0(px)?$/.test(x.secureMargins) && x.blindMargins === 'var(--spacing-12) / auto')
      && !t1.followed && t1.secure && t1.secureMargins === 'auto / auto';
    /* ★ #46 S19 N1: the blind card's own accessible name */
    r.name = [t2, t1b].every((x) => x.blindName === 'Blind group' && x.secureName === 'Chat security notice');
    const bot = await room(['3', '0', '', 'False', '', 'True', 'True']);
    det.bot = bot;
    r.botNone = bot.n === 0;
    /* a 1:1 */
    const s1 = await K.open({ group: false, rows: true });
    try { await sleep(150); det.one = read(s1.d); r.oneToOneNone = det.one.n === 0; } finally { s1.W.close(); }
    /* re-rendered on setChatMode, no other push in between */
    const s = await K.open({ group: true, rows: true, caps: 'reply,media,camera' });
    try {
      await sleep(150);
      const n0 = read(s.d).n;
      s.push('setChatMode', '1', '0', '', 'False', '', 'True', 'True');
      await sleep(200);
      const n1 = read(s.d).n;
      s.push('setChatMode', '1', '0', '', 'False', '', 'True', 'False');
      await sleep(200);
      const n2 = read(s.d).n;
      det.rerender = { n0, n1, n2 };
      r.rerender = n0 === 0 && n1 === 1 && n2 === 0;
    } finally { s.W.close(); }
    /* ★ #46 S19 M5: older history pending → no blind card (not the start); exhausted → it appears */
    const so = await K.open({ group: true, rows: true, caps: 'reply,media,camera' });
    try {
      so.push('setChatMode', '2', '0', '', 'False', '', 'True', 'True');
      await sleep(200);
      const before = read(so.d).n;
      so.push('clearMessages', 'true');   // C#: more history exists (showMore)
      so.push('addThem', 'cc09', 'addrAna', 'Ana', '', 'later words', String(K.T0 + 600), 'True', 'True', 'True', 'False', 'False');
      so.push('messagesDone');
      await sleep(300);
      const pending = read(so.d);
      so.push('messagesDone', 'false');   // the load-more answer: history exhausted
      await sleep(400);
      const done = read(so.d);
      det.older = { before, pending: { n: pending.n, secure: pending.secure }, done: { n: done.n, secure: done.secure } };
      r.older = before === 1 && pending.n === 0 && !pending.secure && done.n === 1 && done.secure && done.afterSecure;
    } finally { so.W.close(); }
    const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
    r.enUs = en.blindGroupNotice === TEXT && en.blindGroup === 'Blind group';
    const locs = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];
    r.locales = locs.every((c) => { const L = JSON.parse(readFileSync(join(root, 'src/strings', c + '.json'), 'utf8')); return L.blindGroupNotice && L.blindGroupNotice !== TEXT; });
  } catch (e) { r.threw = e.message; }
  const pass = Object.values(r).every((v) => v === true);
  ok(pass, '★ S19 F11 (blind-group notice): a blind group (type 2, or 1 + the raw flag) shows ONE system-notice card under the secure notice — "Blind group" + why photos and files can’t be sent; normal groups, 1:1 and a flagged bot room show none; setChatMode adds / removes it; ★ #46 S19: the pair centres as ONE group (secure margin-bottom 0 + data-followed, blind margin-top spacing-12), the blind card is named "Blind group" (not a second security notice), and it waits while older history is pending; en-us + 12 drafted locales — ' + JSON.stringify(r) + (pass ? '' : ' ' + JSON.stringify(det)));
}
