/* ==== S17 D (#1331) — THE ILLUSTRATION SET: less shine + the calm one-body chest ====
 * On the BUILT index.html bundle (jsdom):
 *   · LESS SHINE: every gloss sheet (`<x>Gl` / the chest's `chgl`) in all 10 glossed drawings of the TREE (welcome 2–4,
 *     restore, contacts / apps empty, add contact, explore, backup, wallet empty A — the render counted 12) peaks at ≤ .3
 *     and its middle stop is ≤ .05 (was .6 / .08); welcome 1, chats empty, wallet B and the rating art have none
 *   · THE CHEST: the backup art is the calm ONE-BODY chest — the front and the side are the SAME path split by two clips
 *     (one silhouette, so the faces meet edge to edge), no strap / rivet / ray pieces, today's gold lock, the 240 box,
 *     and its entrance pieces are il-* classes, so watchEntrance holds it (data-held) after the entrance
 * Deliberate breaks (S17 report): restore one gloss stop to 0.6 → the gloss clause fails naming that drawing; put the
 * old backup body back → the chest clause fails (no two-clip body); drop `il-` from il-ch-in → no data-held. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  /* the TREE has 10 glossed drawings (the render counted 12): chatsEmpty, walletEmptyB and the rating art carry no gloss sheet */
  const GLOSSED = ['illoWelcome2', 'illoWelcome3', 'illoWelcome4', 'illoRestore', 'illoContactsEmpty',
    'illoAddContact', 'illoAppsEmpty', 'illoExplore', 'illoBackup', 'illoWalletEmptyA'];
  const UNGLOSSED = ['illoWelcome1', 'illoChatsEmpty', 'illoWalletEmptyB', 'illoRating'];
  let s = null;
  try {
    s = await boot('index.html');
    const { W } = s;
    const S = W.Spixi;
    const gloss = {};
    for (const n of GLOSSED) {
      const svg = S[n] && S[n]();
      const gs = svg ? [...svg.querySelectorAll('linearGradient')].filter((g) => /(?:Gl|^chgl)-i\d+$/.test(g.id)) : [];
      const peaks = gs.map((g) => [...g.querySelectorAll('stop')].map((st) => Number(st.getAttribute('stop-opacity') || 1)));
      gloss[n] = gs.length > 0 && peaks.every((p) => Math.max(...p) <= 0.3 && p.length >= 2 && p[1] <= 0.05)
        ? 'ok' : JSON.stringify(peaks);
    }
    const ratingNoGloss = UNGLOSSED.every((n) => { const v = S[n] && S[n](); return !!v && ![...v.querySelectorAll('linearGradient')].some((g) => /(?:Gl|^chgl)-i\d+$/.test(g.id)); });
    const bad = Object.entries(gloss).filter(([, v]) => v !== 'ok');
    ok(Object.keys(gloss).length === 10 && bad.length === 0 && ratingNoGloss,
      '★ S17 D (#1331): LESS SHINE — the gloss sheet of all 10 glossed drawings (welcome 2–4, restore, contacts / apps empty, add contact, explore, backup, wallet A) peaks at ≤ .3 with its middle stop ≤ .05 (was .6 / .08); welcome 1, chats empty, wallet B and the rating art have none — off: ' + JSON.stringify(bad));

    /* the chest */
    const c = S.illoBackup();
    const paths = [...c.querySelectorAll('path')];
    const byD = new Map();
    for (const p of paths) { const dd = p.getAttribute('d') || ''; if (dd.length > 60) byD.set(dd, (byD.get(dd) || 0) + 1); }
    const body = [...byD.entries()].find(([, n]) => n >= 3);            // one silhouette drawn as front + side + shade
    const clips = [...c.querySelectorAll('clipPath')];
    const clipUses = body ? paths.filter((p) => p.getAttribute('d') === body[0]).map((p) => (p.parentElement.getAttribute('clip-path') || '')).filter(Boolean) : [];
    const lock = [...c.querySelectorAll('rect')].some((r) => /url\(#chlk-i\d+\)/.test(r.getAttribute('fill') || ''));
    const classes = new Set([...c.querySelectorAll('[class]')].flatMap((e) => e.getAttribute('class').split(/\s+/)));
    ok(c.getAttribute('viewBox') === '0 0 240 240' && c.getAttribute('data-illo') === 'backup' && !!body && clips.length === 2
      && new Set(clipUses).size === 2 && lock && classes.has('il-ch-in') && classes.has('il-ch-lid') && classes.has('il-ch-rise')
      && ![...classes].some((k) => /strap|rivet|ray/i.test(k)),
      '★ S17 D (#1331): THE CALM CHEST — the backup art is ONE body silhouette drawn as front + side through two clips (faces meet edge to edge), today\'s gold lock, the 240 box, il-ch-* entrance pieces, no straps / rivets / rays — ' + JSON.stringify({ body: !!body, clips: clips.length, clipUses: new Set(clipUses).size, lock, cls: [...classes] }));

    /* held after the entrance: jsdom runs no CSS animation, so drive the events watchEntrance listens to */
    const host = s.d.createElement('div'); s.d.body.append(host); host.append(c);
    const pieces = [...c.querySelectorAll('[class]')].filter((e) => e.getAttribute('class').split(/\s+/).some((k) => /^il-/.test(k) && k !== 'il-ground'));
    for (const p of pieces) p.dispatchEvent(new W.Event('animationstart', { bubbles: true }));
    for (const p of pieces) p.dispatchEvent(new W.Event('animationend', { bubbles: true }));
    await sleep(20);
    ok(pieces.length >= 5 && c.hasAttribute('data-held'),
      '★ S17 D (#1331): the chest is HELD after its entrance — every il-* piece counted by watchEntrance, data-held on the root once each ended (illo.css then pins the end frames; the slow float keeps running) — pieces ' + pieces.length);
  } catch (e) {
    ok(false, '★ S17 D threw: ' + e.message);
  } finally { if (s) { try { s.dom.window.close(); } catch (_) {} s = null; } }
}
