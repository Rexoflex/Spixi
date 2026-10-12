/* ==== S17 F (#1340) — THE MOMENT SHEETS, the #46 r1 / r2 fixes EXECUTED (jsdom, the BUILT shells) — P28 ====
 *   · CHAT: Cancel on the app moment (and back on the pay moment) RELEASES the card's one-shot Join / Pay (#46 r2 MAJOR-1)
 *   · SETTINGS: a pending language is NOT asked while a sheet is open; it is asked once the sheet closes (#46 r1 MINOR-1)
 *   · THE CLIENT: the session ENDS — C#'s sessionMs runs out → sessionTaken() false + onSessionEnd (#46 r2 MINOR-A)
 *   · CHAT APPEARANCE: the theme phones and the chat-list tiles answer the arrow keys (#46 r1 M1); a picked bubble colour
 *     never lands on the canvas tiles (each shows its OWN colour, #46 r1 m1)
 * Deliberate breaks (S17 report): stop: null on the app moment → the Join clause fails; drop radioArrows(g) on the theme
 * group → the keyboard clause fails; drop the overlay test in askLangMoment → the settings clause fails. */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const k = s1Kit(h);
  const { boot: chatBoot, rowOf, guard } = k;
  const { boot } = dKit(h);
  const btn = (row, label) => row && [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === label);

  await guard('S17 F moments r2 · chat Join latch', async () => {
    const s = await chatBoot();
    const { push, d, sent } = s;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setCaps', 'moments');
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: '', session: false }));
    push('clearMessages', 'false');
    const T = String(Math.floor(Date.now() / 1000) - 600);
    push('addAppRequest', 'mj01', 'app.chess', 'Chess', '', 'addrPeer', 'Bob', '', T, 'False', 'True', 'False', '', '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(250);
    const r = {};
    let join = btn(rowOf(d, 'mj01'), 'Join');
    r.hasJoin = !!join;
    const n0 = sent.length;
    if (join) join.click();
    await sleep(60);
    r.asks = sent.slice(n0).filter((c) => /moment|joinApp/.test(c)).join() === 'ixian:moment:app:app.chess';
    push('momentAnswer', 'app', 'app.chess', '1', 'Storage');
    await sleep(120);
    const sh = d.querySelector('.c-moment__sheet[data-moment="app"]');
    r.sheet = !!sh && /Before you open Chess/.test(sh.textContent);
    if (sh) sh.querySelector('.c-button[data-value="dismiss"]').click();
    await sleep(600);
    join = btn(rowOf(d, 'mj01'), 'Join');
    r.joinBack = !!join && !join.disabled && !sent.slice(n0).some((c) => /joinApp/.test(c));
    /* the second open: no moment (seen) — straight to the verb */
    const n1 = sent.length;
    if (join) join.click();
    await sleep(80);
    r.secondStraight = sent.slice(n1).filter((c) => /moment|joinApp/.test(c)).join() === 'ixian:joinApp:app.chess';
    try { s.dom.window.close(); } catch (e) {}
    ok(Object.values(r).every(Boolean), '★ S17 F (#46 r2 MAJOR-1): CHAT — Join on an invite asks the app moment ("Before you open Chess"); Cancel RELEASES the card (Join enabled again, nothing joined); the next Join goes straight to ixian:joinApp — ' + JSON.stringify(r));
  });

  await guard('S17 F moments r2 · settings clear screen', async () => {
    const s = await boot('settings.html', { wait: 1500 });
    const { W, d, push, sent } = s;
    const r = {};
    push('setCaps', 'moments');
    /* a sheet is open: no ask */
    const S = W.Spixi;
    const content = d.createElement('div'); content.textContent = 'x';
    const sheet = S.createSheet({ content, host: d.body });
    S.openSheet(sheet);
    await sleep(100);
    const n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: [], apps: [], lang: 'de-de', session: false }));
    await sleep(1200);
    r.waits = !sent.slice(n0).some((c) => /moment/.test(c));
    S.closeSheet(sheet);
    await sleep(1200);
    r.asksAfter = sent.slice(n0).filter((c) => /moment/.test(c)).join() === 'ixian:moment:lang:de-de';
    try { s.dom.window.close(); } catch (e) {}
    ok(Object.values(r).every(Boolean), '★ S17 F (#46 r1 MINOR-1): SETTINGS — a pending language is NOT asked while a sheet is open (C# stores seen at its yes — the sheet must be able to show at once); it is asked once the sheet closes — ' + JSON.stringify(r));
  });

  await guard('S17 F moments r2 · the session ends', async () => {
    const s = await boot('index.html', { wait: 1200 });
    const { W } = s;
    let ended = 0;
    const c = W.Spixi.createMomentClient({ bridge: { cap: () => true, send() {} }, onSessionEnd: () => { ended += 1; } });
    c.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: true, sessionMs: 250 }));
    const r = { taken: c.sessionTaken() };
    await sleep(400);
    r.ended = !c.sessionTaken() && ended === 1;
    /* #46 r4: the expiry seen INSIDE sessionTaken() (a sleeping phone: the deadline passed, no timer yet) calls back LATER, never
       inside the caller (home's hintBlocked → pumpHint re-entry) */
    let inside = 0;
    const c2 = W.Spixi.createMomentClient({ bridge: { cap: () => true, send() {} }, onSessionEnd: () => { inside += 1; } });
    c2.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: true, sessionMs: 30 }));
    const t0 = Date.now(); while (Date.now() - t0 < 50) { /* the timer cannot run: past the deadline */ }
    r.notNested = c2.sessionTaken() === false && inside === 0;
    await sleep(20);
    r.calledLater = inside === 1;
    c.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: true, sessionMs: 3000000000 }));   // out of range → the full 6 h, never forever
    await sleep(60);   // #46 r4: setTimeout converts its delay as a WebIDL long — 3e9 wraps NEGATIVE (fires at once) if it is not clamped
    r.clamped = c.sessionTaken();
    c.setState(JSON.stringify({ seen: [], apps: [], lang: '', session: true, sessionMs: 0 }));   // 0 left = ends now
    r.zeroEnds = !c.sessionTaken();
    try { s.dom.window.close(); } catch (e) {}
    ok(Object.values(r).every(Boolean), '★ S17 F (#46 r2 MINOR-A): the moment session ENDS in the shell too — C#\'s sessionMs runs out → sessionTaken() is false and onSessionEnd runs once (home lets its held cards go) — ' + JSON.stringify(r));
  });

  await guard('S17 C r1 · keyboard + canvas tiles', async () => {
    const s = await boot('settings.html', { wait: 1500, storage: { 'spixi.chat.ground': 'dusk' } });
    const { W, d, push, sent } = s;
    push('setTheme', '1');
    await sleep(100);
    const row = [...d.querySelectorAll('button.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(400);
    const el = d.querySelector('.c-settings-appearance');
    const r = {};
    const key = (target, k2) => target.dispatchEvent(new W.KeyboardEvent('keydown', { key: k2, bubbles: true }));
    const themes = el ? [...el.querySelectorAll('.c-settings-appearance__theme')] : [];
    const tChecked = () => { const b = themes.find((x) => x.getAttribute('aria-checked') === 'true'); return b ? b.dataset.value : null; };
    const t0 = tChecked();
    const n0 = sent.length;
    const cur = themes.find((x) => x.getAttribute('aria-checked') === 'true');
    if (cur) key(cur, 'ArrowRight');
    await sleep(40);
    r.themeArrow = themes.length === 3 && tChecked() !== t0 && sent.slice(n0).some((c) => /^ixian:appearance:/.test(c));
    const lines = el ? [...el.querySelectorAll('.c-settings-appearance__line')] : [];
    const lc = lines.find((x) => x.getAttribute('aria-checked') === 'true');
    const l0 = lc ? lc.dataset.value : null;
    if (lc) key(lc, 'End');
    await sleep(40);
    const l1 = lines.find((x) => x.getAttribute('aria-checked') === 'true');
    r.linesEnd = lines.length === 2 && !!l1 && l1 === lines[1] && (l0 !== '2' ? l1.dataset.value === '2' : true);
    /* a picked colour never lands on the canvas tiles */
    const violet = el && [...el.querySelectorAll('.c-settings-appearance__colour')].find((x) => x.dataset.value === 'violet');
    if (violet) violet.click();
    await sleep(40);
    const faces = el ? [...el.querySelectorAll('.c-settings-appearance__dot-face')] : [];
    r.tilesOwn = faces.length === 7 && faces.every((f) => !f.hasAttribute('data-chat-sent'))
      && el.querySelector('.c-settings-appearance__preview').getAttribute('data-chat-sent') === 'violet';
    try { s.dom.window.close(); } catch (e) {}
    ok(Object.values(r).every(Boolean), '★ S17 C (#46 r1 M1 · m1): the theme phones and the chat-list tiles are real radio groups (an arrow / End moves AND picks — the theme commit is sent); a picked bubble colour paints the preview but NEVER the canvas tiles (each shows its own Auto colour, which the canvas pick gives) — ' + JSON.stringify(r));
  });
}
