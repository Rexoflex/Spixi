/* ==== S11 A — item 5 (#1262) + ★ S11 A2 (#1263, R2-M1 / R3-MAJOR-6): the hint cards (tips 5–9), on the BUILT home shell ====
 *   · pickHint (pure, the bundle's own): never in the first 3 days after setup · at most one every 7 days · never
 *     while blocked (the update card / the backup or rating prompt) · never with hints off · the FIRST tip not done,
 *     in list order (backup → wallet → apps → addcontact → tip) · a clock moved back past lastShown never freezes it;
 *     parseHintsState refuses a malformed push and keeps only whitelisted ids;
 *   · ★ A2 TIMING, in the REAL C# order (setCaps → setHints → showWarning('') → showRatingPrompt()): nothing before the
 *     SETTLE window ends; a too-early rating (fewer than 5 opens) does not block; `shown` goes only after the card STOOD;
 *     a rating that WILL show blocks — no card, no `shown` — and the card comes once it is answered; a backup nudge
 *     arriving before the card stood removes it WITHOUT `shown`, and it comes back (and is reported) after the nudge;
 *     never on another tab (it comes back on Chats); × before it stood counts it as seen (shown, then done);
 *     a re-push MERGES (no second tip in the same week); resume re-checks with C#'s now + the time since the push;
 *   · Learn more reports done AND navigates with EXISTING navigation (Wallet / Apps = the nav's own path →
 *     ixian:tab:tab2 / tab3, Settings › Backup = ixian:backup, Add contact = the directory's own Add contact); tip 9 has
 *     no Learn more; an update card arriving removes an open hint; hints OFF removes it; nothing lands in localStorage.
 *   Timers: a-kit timeScale 20 (SETTLE 4 s → 200 ms, STAND 3 s → 150 ms); the order of the timers is the real one.
 * Deliberate breaks: see the S11 A / A2 reports. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  const DAY = 24 * 60 * 60 * 1000;
  let s = null;

  /* ── the pure rules ── */
  const p = {};
  try {
    s = await K.boot('index.html', { now: Date.UTC(2026, 9, 20, 12) });
    const { W } = s;
    const S = W.Spixi;
    const now = Date.UTC(2026, 9, 20, 12);
    const st = (o) => ({ firstSeen: now - 10 * DAY, lastShown: 0, done: [], off: false, now, ...o });
    const pick = (o, opt = {}) => S.pickHint(st(o), { now, ...opt });
    p.order = JSON.stringify(S.HINT_IDS) === '["backup","wallet","apps","addcontact","tip"]';
    p.first = pick({}) === 'backup';
    p.grace = pick({ firstSeen: now - 3 * DAY + 1 }) === null && pick({ firstSeen: now - 3 * DAY }) === 'backup';
    p.noFirstSeen = pick({ firstSeen: 0 }) === null && pick({ firstSeen: now + DAY }) === null;
    p.gap = pick({ lastShown: now - 7 * DAY + 1 }) === null && pick({ lastShown: now - 7 * DAY }) === 'backup';
    p.clockBack = pick({ lastShown: now + 30 * DAY }) === 'backup';
    p.blocked = pick({}, { blocked: true }) === null;
    p.off = pick({ off: true }) === null;
    p.nextNotDone = pick({ done: ['backup', 'wallet'] }) === 'apps' && pick({ done: ['backup', 'wallet', 'apps', 'addcontact'] }) === 'tip';
    p.allDone = pick({ done: ['backup', 'wallet', 'apps', 'addcontact', 'tip'] }) === null;
    p.parse = JSON.stringify(S.parseHintsState('{"firstSeen":5,"lastShown":0,"done":["tip","evil","tip"],"off":true,"now":9}'))
      === '{"firstSeen":5,"lastShown":0,"done":["tip"],"off":true,"now":9}';
    p.parseBad = ['', 'x', '[]', '{"firstSeen":-1,"now":1}', '{"firstSeen":"a","now":1}', '{"firstSeen":1}', 'null']
      .every((x) => S.parseHintsState(x) === null);
    p.offIsStrict = S.parseHintsState('{"firstSeen":5,"now":9,"off":"true"}').off === false;
  } catch (e) { p.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(p).every((x) => x === true),
    '★ S11 A item 5 (#1262): pickHint — nothing in the first 3 days, nothing within 7 days of the last one, nothing while blocked or off, else the FIRST tip not done (backup → wallet → apps → addcontact → tip); a clock moved back never freezes it; parseHintsState refuses malformed pushes and keeps only whitelisted ids — ' + JSON.stringify(p));

  /* ── ★ S11 A2: the timing, through the REAL C# boot order ── */
  const TS = 20;                      // a-kit timeScale: SETTLE 200 ms · STAND 150 ms
  const SETTLE = 4000 / TS, STAND = 3000 / TS;
  const state = (o = {}) => JSON.stringify({ firstSeen: Date.now() - 10 * DAY, lastShown: 0, done: [], off: false, now: Date.now(), ...o });
  const hint = (d) => d.querySelector('.c-glass-card[data-variant="hint"]');
  const shown = (S) => S.sent.filter((x) => /^ixian:hint:shown:/.test(x));
  const tap = (W, el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  /* the sheet close + the nudge gap is not a fixed delay — poll (10 ms) for the card, up to 3 s */
  const waitCard = async (d) => { for (let i = 0; i < 300 && !hint(d); i++) await K.sleep(10); return hint(d); };
  const bootOrder = async (S, o = {}, rating = true) => {
    S.push('setCaps', 'composeSend,hints,updateHelp');
    S.push('setHints', state(o));
    S.push('showWarning', '');
    if (rating) S.push('showRatingPrompt');
  };
  const r = {};
  try {
    s = await K.boot('index.html', { timeScale: TS });
    const { d, W } = s;
    const lsBefore = W.localStorage.length;
    s.push('setHints', state());
    await K.sleep(SETTLE + 80);
    r.noCapNoCard = !hint(d);                                     // an exe without the cap never gets a hint verb
    s.sent.length = 0;
    await bootOrder(s);                                           // 1 open < 5 → the rating is too early: no blocker
    await K.sleep(SETTLE / 2);
    r.notBeforeSettle = !hint(d) && shown(s).length === 0;
    await K.sleep(SETTLE / 2 + 120);
    const c = hint(d);
    r.afterSettle = !!c && c.dataset.tip === 'backup' && shown(s).length === 0;   // up, but not yet reported
    r.copy = !!c && /Did you know\?/.test(c.querySelector('.c-glass-card__eyebrow').textContent)
      && c.querySelector('.c-glass-card__title').textContent === 'Your backup is your account'
      && c.querySelector('.c-glass-card__text').textContent === 'Only your backup can restore a lost phone.'
      && /Learn more/.test(c.querySelector('.c-glass-card__link').textContent) && c.getAttribute('role') === 'note'
      && c.parentNode.classList.contains('chats-cards') && c.parentNode.nextElementSibling === d.querySelector('#chat-scroll .c-chats-list');
    await K.sleep(STAND + 80);
    r.shownAfterStand = JSON.stringify(shown(s)) === '["ixian:hint:shown:backup"]' && hint(d) === c;
    s.push('setHints', state());                                  // the switch re-push: lastShown 0 from C# (older copy)
    await K.sleep(STAND + 80);
    r.rePushNoSecondShown = shown(s).length === 1 && d.querySelectorAll('.c-glass-card[data-variant="hint"]').length === 1;
    s.sent.length = 0;
    tap(W, hint(d).querySelector('.c-glass-card__close'));
    await K.sleep(40);
    r.closeIsDone = !hint(d) && JSON.stringify(s.sent) === '["ixian:hint:done:backup"]';
    s.push('setHints', state({ done: ['backup'] }));             // C# still says lastShown 0 — the merge keeps this week's
    await K.sleep(SETTLE + STAND + 120);
    r.mergeKeepsTheWeek = !hint(d) && shown(s).length === 0;
    r.noStorage = W.localStorage.length === lsBefore;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A2 (#1263, R2-M1): in the REAL boot order (setCaps → setHints → showWarning("") → showRatingPrompt, the rating too early) no card before the settle window; then tip 5 ("Your backup is your account" · "Only your backup can restore a lost phone." · Learn more, a note above the list) WITHOUT a shown verb; ixian:hint:shown:backup only after it STOOD; a re-push sends no second shown; × = done; a re-push from an older C# copy MERGES (no second tip this week); no card without the cap; no localStorage — ' + JSON.stringify(r));

  /* ── blockers that WILL show: the rating (5+ opens), the backup nudge before the card stood, another tab ── */
  const b = {};
  try {
    s = await K.boot('index.html', { timeScale: TS, storage: { 'spixi.rating.opens': '9', 'spixi.rating.lastopen': '1' } });
    const { d, W } = s;
    await bootOrder(s);
    await K.sleep(SETTLE + STAND + 200);
    const rs = d.querySelector('.c-rating-nudge__sheet');
    b.ratingBlocks = !!rs && !hint(d) && shown(s).length === 0;
    const yes = rs && rs.querySelector('.c-button');
    if (yes) tap(W, yes);                                          // answered → closeNudge → the queue's turn → the hint
    b.cardAfterRating = !!(await waitCard(d)) && shown(s).length === 0;
    await K.sleep(STAND + 80);
    b.shownAfterRating = JSON.stringify(shown(s)) === '["ixian:hint:shown:backup"]';
    b.noErr = K.noErr(s.errs);
  } catch (e) { b.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  try {
    s = await K.boot('index.html', { timeScale: TS });
    const { d, W } = s;
    await bootOrder(s);
    await K.sleep(SETTLE + 80);
    b.upBeforeNudge = !!hint(d);
    s.push('toggleAnimatedSlider', 'backup-prompt');            // the backup reminder lands before the card stood
    await K.sleep(STAND + 200);
    const bn = d.querySelector('.c-backup-nudge');
    b.nudgeDisplaces = !!bn && !hint(d) && shown(s).length === 0;
    const skip = bn && [...bn.closest('.c-sheet').querySelectorAll('.c-button')][1];
    if (skip) tap(W, skip);
    b.backAfterNudge = !!(await waitCard(d)) && shown(s).length === 0;
    await K.sleep(STAND + 80);
    b.shownOnceAfterNudge = shown(s).length === 1;
    tap(W, d.querySelector('.c-bottomnav__item[data-id="wallet"]'));
    await K.sleep(60);
    b.notOnAnotherTab = !hint(d);
    tap(W, d.querySelector('.c-bottomnav__item[data-id="chats"]'));
    await K.sleep(STAND + 80);
    b.backOnChatsNoSecondShown = !!hint(d) && shown(s).length === 1;
  } catch (e) { b.err2 = e.message; }
  finally { if (s) { s.close(); s = null; } }
  try {
    s = await K.boot('index.html', { timeScale: TS });
    const { d, W } = s;
    await bootOrder(s, {}, false);
    await K.sleep(SETTLE + 80);
    s.sent.length = 0;
    tap(W, hint(d).querySelector('.c-glass-card__close'));       // × before it stood: it WAS seen
    await K.sleep(40);
    b.earlyCloseCountsSeen = JSON.stringify(s.sent) === '["ixian:hint:shown:backup","ixian:hint:done:backup"]';
  } catch (e) { b.err3 = e.message; }
  finally { if (s) { s.close(); s = null; } }
  try {
    /* a TOO-EARLY rating that cannot even be dropped yet (the queue waits for a clear context: a focused field) is
       no blocker — it will never show, so it must not cost the tip */
    s = await K.boot('index.html', { timeScale: TS });
    const { d } = s;
    const field = d.querySelector('#chats-view input');
    if (field) field.focus();
    await bootOrder(s);
    await K.sleep(SETTLE + STAND + 120);
    b.tooEarlyQueuedNoBlock = !!field && d.activeElement === field && !!hint(d) && shown(s).length === 1;
  } catch (e) { b.err4 = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(b).every((x) => x === true),
    '★ S11 A2 (#1263, R2-M1 / R3-MAJOR-6): a rating that WILL show (9 opens) blocks — no card, no shown — and the card comes after it is answered, then shown once; a backup nudge before the card stood removes it WITHOUT shown, and it comes back (then shown once) after "Not now"; never on another tab (back on Chats without a second shown); × before it stood sends shown then done; a too-early rating stuck in the queue (a focused field) blocks nothing — ' + JSON.stringify(b));

  /* ── resume: C#'s now + the time since the push, re-checked (a desktop window open for a week) ── */
  const w = {};
  try {
    const T0 = Date.UTC(2026, 9, 20, 12);
    s = await K.boot('index.html', { timeScale: TS, now: T0 });
    const { d } = s;
    s.push('setCaps', 'hints');
    s.push('setHints', JSON.stringify({ firstSeen: T0 - 10 * DAY, lastShown: T0 - 6 * DAY, done: [], off: false, now: T0 }));
    await K.sleep(SETTLE + STAND + 120);
    w.insideTheWeek = !hint(d);
    s.clock.add(DAY + 1000);
    s.resume();
    await K.sleep(40);
    w.resumeAfterTheWeek = !!hint(d) && hint(d).dataset.tip === 'backup';
  } catch (e) { w.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(w).every((x) => x === true),
    '★ S11 A2 (#1263): the hint clock is C#\'s pushed now + the time since the push — 6 days after the last tip nothing shows; a day later a resume re-checks and the next tip shows — ' + JSON.stringify(w));

  /* ── Learn more: existing navigation only ── */
  const n = {};
  const flow = async (done, check) => {
    s = await K.boot('index.html', { timeScale: TS });
    try {
      await bootOrder(s, { done }, false);
      await K.sleep(SETTLE + 80);
      return await check(s);
    } finally { s.close(); s = null; }
  };
  try {
    n.wallet = await flow(['backup'], async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'wallet') return 'tip=' + (c && c.dataset.tip);
      const copy = c.querySelector('.c-glass-card__text').textContent === 'Send IXI to a contact in a chat.';
      S.sent.length = 0;
      c.querySelector('.c-glass-card__link').dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
      await K.sleep(120);
      return copy && S.sent[0] === 'ixian:hint:shown:wallet' && S.sent[1] === 'ixian:hint:done:wallet' && S.sent.includes('ixian:tab:tab2')
        && !d.getElementById('wallet-view').hidden && !hint(d)
        && d.querySelector('.c-bottomnav__item[data-id="wallet"]').getAttribute('aria-current') === 'page' ? true : JSON.stringify(S.sent);
    });
    n.apps = await flow(['backup', 'wallet'], async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'apps') return 'tip=' + (c && c.dataset.tip);
      S.sent.length = 0;
      c.querySelector('.c-glass-card__link').dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
      await K.sleep(120);
      return S.sent.includes('ixian:hint:done:apps') && S.sent.includes('ixian:tab:tab3') && !d.getElementById('apps-view').hidden ? true : JSON.stringify(S.sent);
    });
    n.backup = await flow([], async (S) => {
      const { d, W } = S;
      await K.sleep(STAND + 80);
      S.sent.length = 0;
      hint(d).querySelector('.c-glass-card__link').dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
      await K.sleep(40);
      return JSON.stringify(S.sent) === '["ixian:hint:done:backup","ixian:backup"]' ? true : JSON.stringify(S.sent);
    });
    n.addcontact = await flow(['backup', 'wallet', 'apps'], async (S) => {
      const { d, W } = S;
      const c = hint(d);
      if (!c || c.dataset.tip !== 'addcontact') return 'tip=' + (c && c.dataset.tip);
      c.querySelector('.c-glass-card__link').dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
      await K.sleep(500);
      return !!d.querySelector('.c-contacts') && !!d.querySelector('.c-contacts-addsheet') ? true : 'no directory / add sheet';
    });
    n.tipHasNoLink = await flow(['backup', 'wallet', 'apps', 'addcontact'], async (S) => {
      const c = hint(S.d);
      return !!c && c.dataset.tip === 'tip' && !c.querySelector('.c-glass-card__link')
        && c.querySelector('.c-glass-card__text').textContent === 'Open a message’s menu and choose Tip.' ? true : 'tip card';
    });
    n.updateWins = await flow([], async (S) => {
      S.push('showWarning', 'New version of Spixi (0.9.30) is available. Please update for best experience.');
      await K.sleep(60);
      return !hint(S.d) && !!S.d.querySelector('.c-glass-card[data-variant="update"]') ? true : 'both';
    });
    n.offRemoves = await flow([], async (S) => {
      S.push('setHints', state({ off: true }));
      await K.sleep(40);
      return !hint(S.d) ? true : 'still there';
    });
  } catch (e) { n.err = e.message; }
  ok(Object.values(n).every((x) => x === true),
    '★ S11 A item 5 (#1262) + A2 (#1263): Learn more = done + EXISTING navigation — Wallet ("Send IXI to a contact in a chat.") and Apps go through the nav\'s own path (ixian:tab:tab2 / tab3, the item lit), Backup sends ixian:backup, Add contact opens the directory and its own Add contact; tip 9 ("Open a message’s menu and choose Tip.") has no Learn more; an arriving update card removes an open hint; hints OFF removes it — ' + JSON.stringify(n));
}
