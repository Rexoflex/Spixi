/* ==== DT-1 A (#1385) — the section plan, the head and the hover bar, through the COMPONENT API on the built shell ====
 * (#46 r1 test audit: the behaviours a-list.mjs did not reach through C# pushes.) On the BUILT index.html (jsdom, desktop),
 * W.Spixi.createChatsList / renderChatsList / patchChatRows / chatsRenderPlan with their own state + opts:
 *   · PLAN: requests count in "Chats"; every chat pinned → no "Chats" head; folding "Chats" hides its rows; a chip other than
 *     All → flat (a fold never hides a filter's results); the head counts are the section's rows;
 *   · HEAD: the labels come from the strings (pinnedSection / chats, not the English fallbacks); the chevron is chevron-down
 *     open and chevron-right folded; Enter-equivalent click keeps the keyboard focus on the replacement head when the
 *     document has focus — and a document WITHOUT focus (desktop: the chat pane's own WebView2 has it) is never focused
 *     (#46 r1 MAJOR, the restoreRowFocus rule); a stale head count in a folded section → the patch refuses (full render);
 *   · BAR: the buttons follow the capabilities (data-acts = their number; no pin / mute when parked; no "more" with
 *     rowMenu false); a muted row offers Unmute (bell), a pinned row Unpin (pinned-off); a handshaking row is wrapped with
 *     NO action (data-acts 0), carries its hover across a full render (#1171) and keeps its time; a list without hover
 *     actions keeps the row button as the unit;
 *   · CSS (cascade on the built sheets): the bar is display:none + pointer-events:none at rest, its buttons take the pointer
 *     back; every rule that shows the bar, hides the time / badges (visually, clip-path — still in the accessible name),
 *     reserves the text column or holds the wrapper's hover paint is inside (hover: hover) and (pointer: fine) with every
 *     selector on :root[data-desktop]; the hidden time / badge column is NOT display:none; request cards share the rows'
 *     gutter and corner on desktop.
 * Deliberate breaks: docs/review-brief-dt1.md §5 (the DT-1 #46 verdict). */
import { aKit } from '../pins-s11/a-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep, root, join } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null, s2 = null;
  try {
    const { ICONS } = await import(join(root, 'src/components/icons.js'));
    s = await K.boot('index.html', { desktop: true, wait: 1200 });
    const { W, d } = s;
    const sp = W.Spixi;
    /* the registry glyph as THIS engine serialises it (jsdom rewrites self-closing tags) */
    const glyph = (name) => { const g = d.createElementNS('http://www.w3.org/2000/svg', 'svg'); g.innerHTML = ICONS[name].b; return g.innerHTML; };
    const base = () => ({ capabilities: { pin: true, mute: true }, host: d.body, sections: true, hoverActions: true });
    const mk = (chats, extra = {}) => ({ chats: chats.map((c) => ({ ...c })), requests: [], filter: 'all', query: '', ...extra });
    const plan = (st, op = base()) => sp.chatsRenderPlan(st, op).map((e) => (e.kind === 'section' ? 'S:' + e.key + ':' + e.count + (e.folded ? ':f' : '') : (e.kind === 'request' ? 'R:' : '') + e.item.address));
    const C3 = [{ address: 'P1', name: 'p', pinned: true, timestamp: 9 }, { address: 'C1', name: 'c', timestamp: 8, unread: 1 }, { address: 'C2', name: 'c2', timestamp: 7 }];

    /* —— PLAN —— */
    n.req = plan(mk(C3, { requests: [{ address: 'Q1', name: 'q', timestamp: 7.5 }] }));
    r.requestsInChats = JSON.stringify(n.req) === JSON.stringify(['S:pinned:1', 'P1', 'S:chats:3', 'C1', 'R:Q1', 'C2']);
    n.allPinned = plan(mk([{ address: 'P1', pinned: true, timestamp: 2 }, { address: 'P2', pinned: true, timestamp: 1 }]));
    r.allPinned = JSON.stringify(n.allPinned) === JSON.stringify(['S:pinned:2', 'P1', 'P2']);
    n.foldChats = plan(mk(C3, { fold: { chats: true } }));
    r.foldChats = JSON.stringify(n.foldChats) === JSON.stringify(['S:pinned:1', 'P1', 'S:chats:2:f']);
    const C3u = C3.map((c) => (c.address === 'P1' ? { ...c, unread: 2 } : c));   // a pinned AND an unpinned row pass the chip
    n.unreadChip = plan(mk(C3u, { filter: 'unread', fold: { chats: true, pinned: true } }));
    r.chipFlat = JSON.stringify(n.unreadChip) === JSON.stringify(['P1', 'C1']);

    /* —— HEAD —— */
    const strs = { pinnedSection: 'PX', chats: 'CX' };
    const L = sp.createChatsList(mk(C3), { ...base(), strings: strs });
    d.body.append(L);
    n.labels = Array.from(L.querySelectorAll('.c-chats-section__label')).map((x) => x.textContent);
    r.labelsFromStrings = JSON.stringify(n.labels) === JSON.stringify(['PX', 'CX']);
    const svgOf = (el) => (el.querySelector('svg') || {}).innerHTML;
    const st = mk(C3);
    const op = base();
    const L2 = sp.createChatsList(st, op);
    d.body.append(L2);
    const headOf = (key) => L2.querySelector('.c-chats-section[data-section="' + key + '"]');
    r.chevronOpen = svgOf(headOf('chats')) === glyph('chevron-down');
    /* the focus hand-back: with document focus, then without */
    let focusOn = true;
    W.Document.prototype.hasFocus = function () { return focusOn; };
    headOf('chats').focus();
    headOf('chats').click();
    n.afterFold = { active: d.activeElement && d.activeElement.dataset ? d.activeElement.dataset.section : null, exp: headOf('chats').getAttribute('aria-expanded') };
    r.chevronFolded = svgOf(headOf('chats')) === glyph('chevron-right');
    r.focusBack = n.afterFold.active === 'chats' && n.afterFold.exp === 'false';
    focusOn = false;
    headOf('chats').focus();
    const was = headOf('chats');
    sp.renderChatsList(L2, st, op);   // a flush while the chat pane's WebView2 has the focus
    n.noFocus = { same: headOf('chats') === was, active: d.activeElement === headOf('chats') };
    r.noFocusSteal = n.noFocus.same === false && n.noFocus.active === false;
    focusOn = true;
    /* a stale count in the folded Chats section → the patch refuses */
    st.chats.push({ address: 'C3', name: 'c3', timestamp: 1 });
    n.patchStale = sp.patchChatRows(L2, st, ['C1'], op);
    r.patchStaleCount = n.patchStale === false;

    /* —— BAR —— */
    const wrapIn = (list, a) => Array.from(list.querySelectorAll('.c-chatlist-row')).find((x) => x.dataset.rowAddress === a);
    const L3 = sp.createChatsList(mk([{ address: 'M1', name: 'm', muted: true, pinned: true, timestamp: 3 }, { address: 'M2', name: 'm2', timestamp: 2 }]),
      { ...base(), capabilities: { pin: false, mute: true } });
    d.body.append(L3);
    const w1 = wrapIn(L3, 'M1');
    n.caps = { acts: w1.dataset.acts, list: Array.from(w1.querySelectorAll('.c-chatlist-row__act')).map((b) => b.dataset.action + ':' + b.getAttribute('aria-label') + ':' + (b.querySelector('svg') || {}).innerHTML.length) };
    r.capsAndMuted = n.caps.acts === '3' && n.caps.list.length === 3 && n.caps.list[0].startsWith('mute:Unmute:')
      && w1.querySelector('[data-action="mute"] svg').innerHTML === glyph('bell') && !w1.querySelector('[data-action="pin"]');
    const L4 = sp.createChatsList(mk([{ address: 'U1', name: 'u', pinned: true, timestamp: 3 }]), { ...base(), rowMenu: false });
    d.body.append(L4);
    const w4 = wrapIn(L4, 'U1');
    r.noMoreAndUnpin = w4.dataset.acts === '3' && !w4.querySelector('[data-action="more"]')
      && w4.querySelector('[data-action="pin"]').getAttribute('aria-label') === 'Unpin'
      && w4.querySelector('[data-action="pin"] svg').innerHTML === glyph('pinned-off');
    /* a handshaking row is its own hover unit */
    const stH = mk([{ address: 'H1', name: 'h', handshaking: true, timestamp: 3, excerpt: { type: 'typing', text: '…' } }, { address: 'N1', name: 'n', timestamp: 2 }]);
    const opH = base();
    const L5 = sp.createChatsList(stH, opH);
    d.body.append(L5);
    const hs = L5.querySelector('.c-chatlist-item[data-handshaking]');
    const Ev = W.PointerEvent || W.MouseEvent;
    hs.dispatchEvent(new Ev('pointerover', { bubbles: true, pointerType: 'mouse' }));
    sp.renderChatsList(L5, stH, opH);
    const hs2 = L5.querySelector('.c-chatlist-item[data-handshaking]');
    const unit2 = hs2 && hs2.closest('.c-chatlist-row');
    /* its time stays (no bar to make room for): the time-hiding rule skips data-acts="0" */
    const csH = cascade(W);
    n.hsTime = csH.win(hs2.querySelector('.c-chatlist-item__right'), 'position');
    r.handshakeKeepsTime = n.hsTime === '';
    /* a list WITHOUT hover actions (a phone, a tablet with a mouse): the row button is the hover unit (#1171 unchanged) */
    const stP = mk([{ address: 'Y1', name: 'y', timestamp: 3 }, { address: 'Y2', name: 'y2', timestamp: 2 }]);
    const opP = { capabilities: { pin: true, mute: true }, host: d.body };
    const L6 = sp.createChatsList(stP, opP);
    d.body.append(L6);
    const y1 = L6.querySelector('.c-chatlist-item[data-address="Y1"]');
    y1.dispatchEvent(new Ev('pointerover', { bubbles: true, pointerType: 'mouse' }));
    sp.renderChatsList(L6, stP, opP);
    const y1b = L6.querySelector('.c-chatlist-item[data-address="Y1"]');
    r.plainUnit = !!y1b && y1b !== y1 && y1b.hasAttribute('data-hover') && !L6.querySelector('.c-chatlist-row') && L6.querySelectorAll('[data-hover]').length === 1;
    r.handshakeUnit = !!hs2 && hs2 !== hs && !!unit2 && unit2.hasAttribute('data-hover') && unit2.querySelectorAll('.c-chatlist-row__act').length === 0
      && unit2.dataset.acts === '0' && L5.querySelectorAll('[data-hover]').length === 1;

    /* —— CSS —— */
    const { win, rules } = cascade(W);
    const bar = w4.querySelector('.c-chatlist-row__acts');
    const act = w4.querySelector('.c-chatlist-row__act');
    n.rest = { disp: win(bar, 'display'), pe: win(bar, 'pointer-events'), actPe: win(act, 'pointer-events') };
    r.barRest = n.rest.disp === 'none' && n.rest.pe === 'none' && n.rest.actPe === 'auto';
    const isRowRule = (sel) => /\.c-chatlist-row/.test(sel);
    const showing = rules.filter(({ r: rr }) => isRowRule(rr.selectorText) && (
      (/c-chatlist-row__acts/.test(rr.selectorText) && rr.style.getPropertyValue('display') === 'flex') || rr.style.getPropertyValue('clip-path') || rr.style.getPropertyValue('padding-inline-end')
      || (/>\s*\.c-chatlist-item:not/.test(rr.selectorText) && rr.style.getPropertyValue('background-color'))));
    n.showing = showing.length;
    const kinds = {
      flex: showing.some(({ r: rr }) => rr.style.getPropertyValue('display') === 'flex'),
      clip: showing.some(({ r: rr }) => /c-chatlist-item__right/.test(rr.selectorText) && rr.style.getPropertyValue('clip-path')),
      reserve: showing.filter(({ r: rr }) => rr.style.getPropertyValue('padding-inline-end')).length === 4,
      paint: showing.some(({ r: rr }) => rr.style.getPropertyValue('background-color')),
    };
    n.kinds = kinds;
    r.cssGatedAll = Object.values(kinds).every(Boolean) && showing.every(({ r: rr, media }) => media.some((m) => /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(m))
      && rr.selectorText.split(',').every((x) => x.trim().startsWith(':root[data-desktop]')));
    /* behaviour, not presence: a CARRIED hover (data-hover on the wrapper, no :hover) paints the row and reserves the bar */
    w1.setAttribute('data-hover', '');
    const w2 = wrapIn(L3, 'M2');
    w2.setAttribute('data-hover', '');
    const it2 = w2.querySelector('.c-chatlist-item');
    const w4p = wrapIn(L2, 'P1');   // caps pin + mute + the menu → 4 buttons
    w4p.setAttribute('data-hover', '');
    n.carried = { paint: win(it2, 'background-color'), reserve3: win(w1.querySelector('.c-chatlist-item__content'), 'padding-inline-end'), acts4: w4p.dataset.acts, reserve4: win(w4p.querySelector('.c-chatlist-item__content'), 'padding-inline-end') };
    r.carriedPaintReserve = n.carried.paint === 'var(--surface-interactive-hover)'
      && /^calc\(3 \* \(var\(--spacing-24\) \+ var\(--spacing-4\)\) \+ 2 \* var\(--spacing-2\)\)$/.test(n.carried.reserve3)
      && /^calc\(4 \* \(var\(--spacing-24\) \+ var\(--spacing-4\)\) \+ 3 \* var\(--spacing-2\)\)$/.test(n.carried.reserve4);
    r.rightNotDisplayNone = !rules.some(({ r: rr }) => /c-chatlist-row[\s\S]*c-chatlist-item__right/.test(rr.selectorText) && rr.style.getPropertyValue('display') === 'none');
    const req = sp.createChatsList(mk([], { requests: [{ address: 'Q9', name: 'q', timestamp: 1 }] }), base());
    d.body.append(req);
    const card = req.querySelector('.c-contact-request');
    n.card = card ? { m: win(card, 'margin-inline'), rad: win(card, 'border-radius') } : null;
    r.requestInset = !!n.card && n.card.m === 'var(--spacing-8)' && n.card.rad === 'var(--radius-12)';
    r.noErr = K.noErr(s.errs);
    s.close(); s = null;

    /* —— the fold seed is strict: only `true` folds —— */
    s2 = await K.boot('index.html', { desktop: true, wait: 1200, storage: { 'spixi.pins': '["A1"]', 'spixi.chats.fold': '{"pinned":"yes","chats":1}' } });
    const TS = Math.floor(Date.now() / 1000);
    s2.push('clearChats');
    s2.push('addChat', 'A1', 'a', String(TS - 5), 'img/spixiavatar.png', 'false', 'x', '', '0', '', 'False', 'text', '');
    s2.push('addChat', 'B1', 'b', String(TS - 9), 'img/spixiavatar.png', 'false', 'y', '', '0', '', 'False', 'text', '');
    s2.push('clearChatsDone');
    await sleep(300);
    n.seed = Array.from(s2.d.querySelectorAll('.c-chats-section')).map((x) => x.dataset.section + ':' + x.getAttribute('aria-expanded'));
    r.seedStrict = JSON.stringify(n.seed) === JSON.stringify(['pinned:true', 'chats:true']);
  } catch (e) { r.threw = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { for (const x of [s, s2]) if (x) x.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1400));
  c('requestsInChats', '★ DT-1 A (plan): a request counts in "Chats" (S:chats:3 with two chats + one request, in recency order)');
  c('allPinned', '★ DT-1 A (plan): every chat pinned → "Pinned · n" alone, no empty "Chats" head');
  c('foldChats', '★ DT-1 A (plan): folding "Chats" hides its rows (the head stays, with its count)');
  c('chipFlat', '★ DT-1 A (plan): under a chip other than All the list is flat — a fold never hides the filter\'s own results');
  c('labelsFromStrings', '★ DT-1 A (head): the labels come from the strings (pinnedSection · chats), not the English fallbacks');
  c('chevronOpen', '★ DT-1 A (head): an open head shows chevron-down');
  c('chevronFolded', '★ DT-1 A (head): a folded head shows chevron-right');
  c('focusBack', '★ DT-1 A (head): a fold by the keyboard keeps the focus on the replacement head (aria-expanded false)');
  c('noFocusSteal', '★ DT-1 A (head, #46 r1 MAJOR): a document WITHOUT focus (the chat pane\'s WebView2 has it) is never focused by a re-render');
  c('patchStaleCount', '★ DT-1 A (patch): a new row in a FOLDED section changes the head count → the one-row patch refuses (full render)');
  c('capsAndMuted', '★ DT-1 A (bar): the buttons follow the capabilities (pin parked → none; data-acts 3) and the state (a muted row offers Unmute with the bell)');
  c('noMoreAndUnpin', '★ DT-1 A (bar): rowMenu false → no "more"; a pinned row offers Unpin with pinned-off');
  c('handshakeUnit', '★ DT-1 A (bar, #46 r1): a handshaking row has a wrapper with NO action (data-acts 0) — the same hover unit — and is rebuilt with data-hover (#1171)');
  c('handshakeKeepsTime', '★ DT-1 A (#46 r2): a hovered handshaking row keeps its time (the time-hiding rule skips data-acts="0")');
  c('plainUnit', '★ DT-1 A (#46 r2): a list without hover actions (phone / tablet with a mouse) keeps the row button as its hover unit — #1171 unchanged');
  c('barRest', '★ DT-1 A (CSS): at rest the bar is display:none and pointer-events:none; its buttons take the pointer back (auto) — the gaps fall through to the row');
  c('cssGatedAll', '★ DT-1 A (CSS): every rule that shows the bar, hides the time / badges (clip-path), reserves the text column (4 rules) or holds the wrapper\'s hover paint is inside (hover: hover) and (pointer: fine) and starts with :root[data-desktop]');
  c('carriedPaintReserve', '★ DT-1 A (CSS): a CARRIED hover (data-hover on the wrapper) paints the row --surface-interactive-hover and reserves the text column for the bar (3 and 4 buttons)');
  c('rightNotDisplayNone', '★ DT-1 A (CSS, #46 r1): the hovered row\'s time / badge column is visually hidden, never display:none (it stays in the accessible name)');
  c('requestInset', '★ DT-1 A (CSS, #46 r1): a request card shares the rows\' gutter (--spacing-8) and corner (--radius-12) on desktop');
  c('noErr', '★ DT-1 A (component API): no page error');
  c('seedStrict', '★ DT-1 A (store): the fold seed is strict — "yes" / 1 are not true, so both heads open');
}
