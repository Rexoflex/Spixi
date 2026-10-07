/* ==== S9 B1 — the S8 fix rows + polish on the BUILT chat.html: 8-FACE played · 8-APP Joined · A-7 tip count · A-19 hour ·
 * A-10 notice · 8-GROW desktop caret ====
 *   · 8-FACE (#1247): addThem / updateMessage `played` "1" → the mic badge neutral (even live); "0" → accent (even from the
 *     history load — "no flag = not played"); then playing → neutral; absent / "" (an old exe) → the #1240 rule (history
 *     neutral, live accent)
 *   · 8-APP: app_state "Joined" → ONE button "Open again" → ixian:joinApp:<appId>, no Decline; "Declined" still wins
 *   · A-7: the tip pill says "Tipped ×3" — never an amount (the 4th arg is not read)
 *   · A-19: timeOpts() → hour "numeric" for h12 / h11, "2-digit" for h23; "9:05 AM" not "09:05 AM"
 *   · A-10: the secure notice says "end-to-end encrypted"
 *   · 8-GROW: on DESKTOP a focus taken from the input right after Reply comes back (the frame / 100 ms re-focus); on MOBILE
 *     it does not (unchanged: one focus)
 * Deliberate breaks (S9 B1 hand-back): voiceHeard's `p === '0'` leg → old rule → played0Accent · appStateFrom's Joined line
 *   dropped → joined · the tip label's `' ×' + tipCount` → total → tipCount · timeOpts' numeric rule dropped → h12 ·
 *   focusStripInput's `if (!desk) return;` → always → mobileUnchanged · (#46 r1) hapticMenuOpen's send dropped → hapticLong ·
 *   the N4 `moved ||` dropped → userWins */
import { b1Kit } from './b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, T0 } = K;
  const tone = (d, id) => { const r = K.rowOf(d, id); const f = r && r.querySelector('.c-voice .c-voice__who'); return f ? f.dataset.tone : null; };
  const v = (id, played, ts) => ['addThem', id, 'addrPeer', 'Ana', '', '🎤 0:12', String(ts), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12000'].concat(played === undefined ? [] : [played]);
  const f = {};
  try {
    const s = await K.open({ caps: 'reply,voice', rows: false, hist: (s0) => {
      s0.push(...v('aa01', '0', T0 + 1));
      s0.push(...v('aa02', '1', T0 + 2));
      s0.push(...v('aa03', '', T0 + 3));
      s0.push(...v('aa04', undefined, T0 + 4));
      /* voice clips received as FILES: addFile arg 17 "1" (voice) · arg 19 played */
      const vf = (id, played) => ['addFile', id, 'addrPeer', 'Ana', '', 'v' + id, 'clip.ogg', String(T0 + 7), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1', '', played];
      s0.push(...vf('ab01', '0'));
      s0.push(...vf('ab02', '1'));
    } });
    const { d, push } = s;
    await sleep(400);   // the load burst is over: the next rows arrive LIVE
    push(...v('aa05', '1', T0 + 5));
    push(...v('aa06', undefined, T0 + 6));
    await sleep(150);
    f.played0Accent = tone(d, 'aa01') === 'accent';
    f.played1Neutral = tone(d, 'aa02') === 'neutral' && tone(d, 'aa05') === 'neutral';
    f.oldRuleHistory = tone(d, 'aa03') === 'neutral' && tone(d, 'aa04') === 'neutral';
    f.oldRuleLive = tone(d, 'aa06') === 'accent';
    f.fileArg19 = tone(d, 'ab01') === 'accent' && tone(d, 'ab02') === 'neutral';
    push('voiceState', 'aa01', 'playing', '1000', '12000');
    await sleep(40);
    f.playedNow = tone(d, 'aa01') === 'neutral';
    push('updateMessage', 'aa06', '🎤 0:12', 'True', 'True', 'True', 'False', 'False', '', '', '', '', '12000', '1');
    await sleep(120);
    f.updateArg13 = tone(d, 'aa06') === 'neutral';
    f.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { f.err = e.message; }
  ok(Object.values(f).every((x) => x === true),
    '★★ S9 B1 8-FACE (#1247) on the built chat shell: C#\'s stored `played` (addThem arg 18 / updateMessage arg 13 / addFile arg 19 for a voice FILE) drives the mic badge — "1" neutral even live, "0" ACCENT even from history until it plays, then neutral; absent / "" = the #1240 per-document rule — ' + JSON.stringify(f));

  const a = {};
  try {
    const s = await K.open({ caps: 'reply' });
    const { d, push } = s;
    push('addAppRequest', 'ab01', 'app.one', 'Board', '', 'addrPeer', 'Ana', '', String(T0 + 100), 'False', 'True', 'True', 'Joined', '');
    push('addAppRequest', 'ab02', 'app.two', 'Chess', '', 'addrPeer', 'Ana', '', String(T0 + 110), 'False', 'True', 'True', 'Declined', '');
    await sleep(150);
    const row = K.rowOf(d, 'ab01');
    const btns = row ? [...row.querySelectorAll('button')].filter((b) => (b.textContent || '').trim()) : [];
    a.joined = btns.length === 1 && btns[0].textContent.trim() === 'Open again' && /You joined this app/.test(row.textContent);
    if (btns[0]) btns[0].click();
    await sleep(60);
    a.joinVerb = s.sent.includes('ixian:joinApp:app.one');
    a.declinedWins = /You declined this invite/.test((K.rowOf(d, 'ab02') || {}).textContent || '');
    /* A-7 */
    push('addReactions', 'cc01', 'tip:3;like:1;', '', '15');
    await sleep(80);
    const pills = (K.rowOf(d, 'cc01') || d).textContent;
    a.tipCount = /Tipped ×3/.test(pills) && !/IXI/.test(pills) && !/15/.test(pills.replace(/\d{1,2}:\d{2}/g, ''));
    /* A-10 */
    const notice = (d.querySelector('#messages') || {}).textContent || '';
    a.e2e = /end-to-end encrypted/.test(notice) && !/sealed on your device/.test(notice);
    /* A-19 */
    const W = s.W;
    const fmt = () => new W.Date(2026, 0, 5, 9, 5).toLocaleTimeString('en-US', W.Spixi.timeOpts());
    d.documentElement.dataset.hourCycle = 'h12';
    a.h12 = W.Spixi.timeOpts().hour === 'numeric' && /^9:05/.test(fmt());
    d.documentElement.dataset.hourCycle = 'h23';
    a.h23 = W.Spixi.timeOpts().hour === '2-digit' && /^09:05/.test(fmt());
    a.callerHour = W.Spixi.timeOpts({ hour: '2-digit' }).hour === '2-digit';
    a.noErr = K.noErr(s.errs);
    s.W.close();
  } catch (e) { a.err = e.message; }
  ok(Object.values(a).every((x) => x === true),
    '★★ S9 B1 on the built chat shell: 8-APP app_state "Joined" = one "Open again" (ixian:joinApp, no Decline), "Declined" still wins · A-7 the tip pill = "Tipped ×3", no amount · A-10 the notice says "end-to-end encrypted" · A-19 timeOpts: h12 → hour numeric ("9:05"), h23 → 2-digit ("09:05"), a caller\'s own hour kept — ' + JSON.stringify(a));

  /* 8-GROW: the caret after Reply */
  const g = {};
  const replyAndSteal = async (s) => {
    const { d, W } = s;
    const bub = K.rowOf(d, 'cc01').querySelector('.c-bubble');
    bub.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(120);
    const rb = [...d.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Reply');
    if (rb) rb.click();
    const inp = d.querySelector('.c-composer__input');
    const focused0 = d.activeElement === inp;
    inp.blur();   // the host takes focus right after the tap (WebView2 / the native page)
    await sleep(160);
    return { focused0, after: d.activeElement === inp, ctx: !!d.querySelector('[data-ctx="reply"]') };
  };
  try {
    /* ★ #46 M6 (D-04): a TOUCH long-press menu → ixian:haptic:long; a right click → none; a quick-reaction pick → haptic:click */
    const h0 = await K.open({ caps: 'reply' });
    const bub0 = K.rowOf(h0.d, 'cc01').querySelector('.c-bubble');
    bub0.dispatchEvent(new h0.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));   // mouse: no pointerdown touch
    await sleep(120);
    const noMouse = !h0.sent.includes('ixian:haptic:long');
    h0.d.dispatchEvent(new h0.W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    const pd = new h0.W.Event('pointerdown', { bubbles: true });
    Object.defineProperty(pd, 'pointerType', { value: 'touch' });
    bub0.dispatchEvent(pd);
    bub0.dispatchEvent(new h0.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(120);
    g.hapticLong = noMouse && h0.sent.filter((v) => v === 'ixian:haptic:long').length === 1;
    /* #46 r2 n3: a touch, then a KEY, then a menu (Shift+F10 path) → no long haptic */
    h0.d.dispatchEvent(new h0.W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    const pd2 = new h0.W.Event('pointerdown', { bubbles: true });
    Object.defineProperty(pd2, 'pointerType', { value: 'touch' });
    bub0.dispatchEvent(pd2);
    h0.d.dispatchEvent(new h0.W.KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
    bub0.dispatchEvent(new h0.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(120);
    g.keyNoHaptic = h0.sent.filter((v) => v === 'ixian:haptic:long').length === 1;
    h0.d.dispatchEvent(new h0.W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    bub0.dispatchEvent(new h0.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));   // reopen for the reaction pick below
    await sleep(120);
    const heart = [...h0.d.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '❤️');
    if (heart) heart.click();
    await sleep(80);
    g.hapticClick = h0.sent.includes('ixian:haptic:click');
    h0.W.close();
    /* ★ #46 N4: a press on a row inside the 100 ms window keeps the user's focus (no desktop re-focus) */
    const n4 = await K.open({ caps: 'reply', mobile: false });
    {
      const bub = K.rowOf(n4.d, 'cc01').querySelector('.c-bubble');
      bub.dispatchEvent(new n4.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      await sleep(120);
      const rb = [...n4.d.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Reply');
      if (rb) rb.click();
      const row = K.rowOf(n4.d, 'cc02');
      row.dispatchEvent(new n4.W.Event('pointerdown', { bubbles: true }));
      row.focus();
      await sleep(160);
      g.userWins = n4.d.activeElement === row;
    }
    n4.W.close();
    const s = await K.open({ caps: 'reply', mobile: false });
    const x = await replyAndSteal(s);
    g.desktopBack = x.focused0 && x.after && x.ctx;
    g.noErr = K.noErr(s.errs);
    s.W.close();
    const m = await K.open({ caps: 'reply', mobile: true });
    const y = await replyAndSteal(m);
    g.mobileUnchanged = y.focused0 && !y.after && y.ctx;
    m.W.close();
  } catch (e) { g.err = e.message; }
  ok(Object.values(g).every((x) => x === true),
    '★ S9 B1 8-GROW (#1243 / #1247) on the built chat shell: Reply focuses the input on every path; on DESKTOP a focus the host takes right after comes back (frame + 100 ms), on MOBILE it does not (unchanged) — ' + JSON.stringify(g));
}
