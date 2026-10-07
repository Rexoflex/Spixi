/* ==== SESSION 8 (S2) — ★ S8 (#1231) THE OWNER'S GROUP PHOTO BADGE + (#1204 b) MEMBERS FIRST IN A SMALL ROOM ====
 * On the BUILT contact_details.html (jsdom), fed by the C# pushes (setGroupInfo · addMember · setSharedItems):
 *   · #1231: a group I OWN shows the camera badge on the hero (a sibling of the avatar, never nested in the viewer
 *     button) named "Change group photo"; a tap sends exactly ixian:groupPhoto. Not the owner → no badge, no verb.
 *     A bot room never shows it (C# owner gate)
 *   · #1204 b: ≤ 11 members (MEMBERS_FIRST_MAX) → the roster sits ABOVE the shared section; 12+ → the roster stays
 *     LAST, ONE "Members (n)" row sits right above the shared section, and its tap scrolls the roster into view and
 *     focuses the roster label (not the search field). No shared items → no jump row
 * Deliberate breaks: see the S8 S2 hand-back. */
import { uiKit } from './ui-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = uiKit(h);
  const NAMES = ['Ana', 'Bor', 'Cene', 'Dora', 'Eva', 'Filip', 'Gaja', 'Hana', 'Ivo', 'Jure', 'Katja', 'Luka', 'Maja', 'Nina'];
  const room = async ({ n, amOwner = '1', kind = 'group', shared = true }) => {
    const s = await boot('contact_details.html', { mobile: true, wait: 1200 });
    const { push } = s;
    push('setContext', 'chat');
    push('setAddress', 'Gggg1111111111111111111111111111111111');
    push('setNickname', 'Weekend trip');
    push('setGroupInfo', String(n), 'False', 'False', 'True', 'Aaaa1111111111111111111111111111111111', kind, amOwner);
    push('clearMembers');
    NAMES.slice(0, n).forEach((nm, i) => push('addMember', String.fromCharCode(65 + i).repeat(4) + '1111111111111111111111111111111111', nm, '', i === 0 ? 'owner' : '', 'contact'));
    if (shared) {
      const N = Math.floor(Date.now() / 1000);
      push('setSharedItems', JSON.stringify([['aa000001', 1, 'file', 'Tickets.pdf', 230000, N - 9000, 1, null, 1], ['aa000002', 1, 'link', 'https://example.com/cabin', 0, N - 9500, 1, null, 1]]));
    }
    await sleep(700);
    return s;
  };
  const order = (d) => [...d.querySelector('.c-chat-info__body').children].map((e) =>
    e.classList.contains('c-shared') ? 'shared' : e.classList.contains('c-chat-info__members') ? 'members'
      : e.classList.contains('c-chat-info__members-jump') ? 'jump' : 'x');
  try {
    /* owner, 6 members */
    let s = await room({ n: 6 });
    let d = s.d;
    const badge = d.querySelector('.c-chat-info__hero .c-chat-info__photo-badge');
    const r = {
      badge: !!badge && badge.tagName === 'BUTTON' && badge.getAttribute('aria-label') === 'Change group photo',
      notNested: !!badge && !badge.closest('.c-chat-info__avatar-view') && !badge.parentElement.closest('button'),
    };
    const n0 = s.sent.length;
    if (badge) badge.click();
    await s.W.Promise.resolve();
    await sleep(20);
    r.verb = JSON.stringify(s.sent.slice(n0).filter((c) => c !== 'ixian:painted'));
    const o6 = order(d);
    r.small = o6.indexOf('members') !== -1 && o6.indexOf('members') < o6.indexOf('shared') && !o6.includes('jump');
    ok(r.badge && r.notNested, '★ S8 #1231 group info: the owner sees a "Change group photo" badge button on the hero, outside the viewer button');
    ok(r.verb === '["ixian:groupPhoto"]', '★ S8 #1231 group info: the badge tap sends exactly ixian:groupPhoto — got ' + r.verb);
    ok(r.small, '★ S8 #1204b group info: 6 members → the roster sits above the shared section, no jump row — ' + o6.join(','));
    s.dom.window.close();

    /* owner, 11 members (the edge) */
    s = await room({ n: 11 });
    const o11 = order(s.d);
    ok(o11.indexOf('members') < o11.indexOf('shared') && !o11.includes('jump'), '★ S8 #1204b group info: 11 members (MEMBERS_FIRST_MAX) → still roster first — ' + o11.join(','));
    s.dom.window.close();

    /* ★ S8 r1 (C-MAJOR-2): the other side of the edge — 12 members (MEMBERS_FIRST_MAX + 1) → the jump row */
    s = await room({ n: 12 });
    const o12 = order(s.d);
    const j12 = s.d.querySelector('.c-chat-info__members-jump button');
    ok(o12.indexOf('jump') !== -1 && o12.indexOf('jump') === o12.indexOf('shared') - 1 && o12.indexOf('members') > o12.indexOf('shared')
      && !!j12 && j12.textContent.trim() === 'Members (12)',
    '★ S8 #1204b group info: 12 members (MEMBERS_FIRST_MAX + 1) → the "Members (12)" jump row, roster last — ' + o12.join(','));
    s.dom.window.close();

    /* ★ S8 r1 (B-NIT): a kick that takes a room from 12 to 11 re-runs the placement at once — no rebuild.
       Mounted from the bundle's createChatInfo: kick is bot-room only (#248) and contact_details gives a bot room no
       shared section today (#1106), so the shell cannot reach the case yet — the component must still be right. */
    s = await room({ n: 1, shared: false });
    d = s.d;
    const N2 = Math.floor(Date.now() / 1000);
    const mem = NAMES.slice(0, 12).map((nm, i) => ({ name: nm, address: String.fromCharCode(65 + i).repeat(4) + '1111111111111111111111111111111111', owner: i === 0, admin: false, relation: 'contact' }));
    const acted = [];
    const panel = s.W.Spixi.createChatInfo({
      kind: 'bot', context: 'chat', name: 'Room', address: 'Gggg1111111111111111111111111111111111',
      memberCount: 12, members: mem, host: d.body, strings: {},
      shared: s.W.Spixi.parseSharedItems(JSON.stringify([['aa000001', 1, 'file', 'Tickets.pdf', 230000, N2 - 9000, 1, null, 1]])),
      capabilities: { notifications: true, admin: true },
      onMemberAction: (act, m, ctrl) => { acted.push(act + ':' + m.name); ctrl.done(); },
    });
    const mount = d.createElement('div');
    d.body.append(mount);
    mount.append(panel);
    const ord = () => [...panel.querySelector('.c-chat-info__body').children].map((e) =>
      e.classList.contains('c-shared') ? 'shared' : e.classList.contains('c-chat-info__members') ? 'members'
        : e.classList.contains('c-chat-info__members-jump') ? 'jump' : 'x');
    const before = ord();
    const target = [...panel.querySelectorAll('.c-chat-info__member')].find((x) => /Bor/.test(x.textContent));
    if (target) target.click();
    await sleep(50);
    const kickBtn = [...d.querySelectorAll('.c-sheet .c-button')].find((b) => b.textContent.trim() === 'Kick');
    if (kickBtn) kickBtn.click();
    await sleep(50);
    const km = [...d.querySelectorAll('.c-modal')].pop();
    const kb = km ? km.querySelectorAll('.c-modal__actions .c-button') : [];
    if (kb.length) kb[kb.length - 1].click();
    await sleep(450);
    const oK = ord();
    const label11 = (panel.querySelector('.c-chat-info__members .c-chat-info__label') || {}).textContent || '';
    ok(before.includes('jump') && acted.join() === 'kick:Bor' && oK.indexOf('members') !== -1 && oK.indexOf('members') < oK.indexOf('shared')
      && !oK.includes('jump') && !panel.querySelector('.c-chat-info__members-jump') && /\(11\)/.test(label11),
    '★ S8 #1204b group info: a kick from 12 to 11 drops the jump row and moves the roster above the shared section at once — '
      + before.join(',') + ' → ' + acted.join() + ' → ' + oK.join(',') + ' / ' + label11);
    s.dom.window.close();

    /* owner, 14 members */
    s = await room({ n: 14 });
    d = s.d;
    const o14 = order(d);
    const big = o14.indexOf('jump') !== -1 && o14.indexOf('jump') === o14.indexOf('shared') - 1 && o14.indexOf('members') > o14.indexOf('shared');
    const jump = d.querySelector('.c-chat-info__members-jump button');
    const jumpText = jump ? jump.textContent.trim() : '';
    s.W.__scrolled.length = 0;
    if (jump) jump.click();
    const sec = d.querySelector('.c-chat-info__members');
    const label = sec && sec.querySelector('.c-chat-info__label');
    const scrolled = s.W.__scrolled.includes(sec);
    const focused = !!label && d.activeElement === label;
    ok(big && jumpText === 'Members (14)', '★ S8 #1204b group info: 14 members → "Members (14)" row right above the shared section, roster last — ' + o14.join(',') + ' / ' + jumpText);
    ok(scrolled && focused, '★ S8 #1204b group info: the jump row scrolls the roster into view and focuses its label (scrolled ' + scrolled + ', focused ' + focused + ')');
    s.dom.window.close();

    /* 14 members, no shared items → no jump row */
    s = await room({ n: 14, shared: false });
    ok(!s.d.querySelector('.c-chat-info__members-jump'), '★ S8 #1204b group info: no shared section → no jump row');
    s.dom.window.close();

    /* not the owner → no badge; a bot room I "own" → no badge */
    s = await room({ n: 6, amOwner: '0' });
    ok(!s.d.querySelector('.c-chat-info__photo-badge'), '★ S8 #1231 group info: a member who is not the owner sees no photo badge');
    s.dom.window.close();
    s = await room({ n: 6, kind: 'bot' });
    ok(!s.d.querySelector('.c-chat-info__photo-badge'), '★ S8 #1231 group info: a bot room never shows the photo badge');
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S8 group info: pin threw — ' + (e && e.stack || e));
  }
}
