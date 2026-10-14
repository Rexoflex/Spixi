/* ==== S20 Q — J4 (#1440, the v3 doc's I4 — Damir confirms at the build render): the app cards, the header row gone ====
 * Through the REAL component in the built chat.html (jsdom):
 *   · no "App invite" / "App session" header on ANY state (no .c-tcard__head / title, the words absent);
 *   · the full card: a 48 px icon, then the 13 px line (sub) ABOVE the 18 px bold name, and the time at the END of the
 *     name's line;
 *   · every state keeps its buttons and handlers: invite Decline + Join · invited Cancel + Launch app · missing Decline +
 *     Get app · in-session End session + Resume · joined Open again; declined / canceled / ended (and a joined card with
 *     no handler) stay the compact pill, unchanged.
 * Deliberate breaks (S20 Q report): the header put back (card(dir, title, …)) → noHeader · the sub appended AFTER the name
 * line → layout · Join wired to onDecline → handlers. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const r = {};
  const got = {};
  try {
    const s = await K.open({ rows: false });
    try {
      const { W, d } = s;
      const S = W.Spixi;
      await sleep(100);
      const host = d.createElement('div'); d.body.append(host);
      const calls = [];
      const hd = (n) => () => calls.push(n);
      const all = { onJoin: hd('join'), onDecline: hd('decline'), onCancel: hd('cancel'), onLaunch: hd('launch'), onGet: hd('get'), onResume: hd('resume'), onEnd: hd('end'), onOpenAgain: hd('again') };
      const STATES = ['invite', 'invited', 'missing', 'in-session', 'joined', 'declined', 'canceled', 'ended'];
      const rows = {};
      for (const st of STATES) { rows[st] = S.createAppBubble({ name: 'Blitz Chess', state: st, timestamp: Date.now(), strings: {}, ...all }); host.append(rows[st]); }
      const joinedBare = S.createAppBubble({ name: 'Blitz Chess', state: 'joined', direction: 'sent', timestamp: Date.now(), strings: {} });
      host.append(joinedBare);
      r.noHeader = Object.values(rows).concat(joinedBare).every((row) => !row.querySelector('.c-tcard__head, .c-tcard__title') && !/App invite|App session/.test(row.textContent));
      /* buttons + handlers per state: click each, record what fired */
      const EXPECT = { invite: 'Decline>decline,Join>join', invited: 'Cancel>cancel,Launch app>launch', missing: 'Decline>decline,Get app>get', 'in-session': 'End session>end,Resume>resume', joined: 'Open again>again' };
      const seen = {};
      for (const st of STATES) {
        seen[st] = [...rows[st].querySelectorAll('.c-button')].map((b) => { calls.length = 0; b.click(); return b.textContent.trim() + '>' + calls.join('+'); }).join(',');
      }
      got.seen = seen;
      r.handlers = Object.entries(EXPECT).every(([st, v]) => seen[st] === v) && ['declined', 'canceled', 'ended'].every((st) => seen[st] === '' && rows[st].querySelector('.c-tcard').dataset.layout === 'compact')
        && joinedBare.querySelector('.c-tcard').dataset.layout === 'compact' && /You joined this app/.test(joinedBare.textContent);
      /* the layout of the full card */
      const card = rows.invite.querySelector('.c-tcard');
      const info = card.querySelector('.c-tcard__app-info');
      const kids = info ? [...info.children].map((c) => c.className) : [];
      const line = card.querySelector('.c-tcard__app-line');
      const cs = (el) => W.getComputedStyle(el);
      const rootVar = (v, k = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(String(v || '').trim()); if (!m || k > 8) return String(v || '').trim(); return rootVar(W.getComputedStyle(d.documentElement).getPropertyValue(m[1]).trim(), k + 1); };   // jsdom keeps var() — resolve through the root (#46 r1 MINOR-6 tokens)
      got.kids = kids; got.line = line ? [...line.children].map((c) => c.tagName + '.' + c.className.split(' ')[0]) : null;
      got.sizes = [cs(card.querySelector('.c-tcard__app-icon')).width, cs(card.querySelector('.c-tcard__app-sub')).fontSize, cs(card.querySelector('.c-tcard__app-name')).fontSize, cs(card.querySelector('.c-tcard__app-name')).fontWeight].map((v) => rootVar(v));
      got.invitedSub = (rows.invited.querySelector('.c-tcard__app-sub') || {}).textContent;
      r.layout = kids.join() === 'c-tcard__app-sub,c-tcard__app-line' && (got.line || []).join() === 'SPAN.c-tcard__app-name,TIME.c-tcard__time'
        && got.sizes[0] === '48px' && got.sizes[1] === '13px' && got.sizes[2] === '18px' && /^(700|bold)$/.test(got.sizes[3])
        && got.invitedSub === 'Invite sent' && !!card.querySelector(':scope > .c-tcard__app + .c-tcard__actions');
      r.noErr = K.noErr(s.errs);
    } finally { s.W.close(); }
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★★ S20 Q J4 (#1440) the app cards: no "App invite" / "App session" header on any state; the 48 px icon, the 13 px line over the 18 px bold name with the time at its end, the buttons under the icon row; every state keeps its buttons and handlers (invite · invited · missing · in-session · joined) and the compact pills stay — '
    + JSON.stringify({ r, got }));
}
