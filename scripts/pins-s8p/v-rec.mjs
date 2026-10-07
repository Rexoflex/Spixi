/* ==== S8 PICKS (P-V) — ★ #1239 R1 THE RECORDING BAR: trash (Discard) · dot · "0:07 / 0:30" · the LIVE WAVE · ➤ ====
 * On the BUILT chat.html (jsdom), driven only through C#'s pushes (voiceRec + the NEW voiceRecLevel):
 *   · the ✕ is the trash "Discard recording" (the verb is still ixian:voicerec:cancel); the timer keeps "m:ss / 0:30"
 *   · voiceRecLevel(n): one bar per push at the END (the oldest leaves the start, the count stays), rounded + clamped to
 *     0..100; a non-number is dropped; a level for a stopped / closed bar changes nothing; no level ever leaves as a verb
 *   · the wave is decorative (aria-hidden) and NOT red: the newest bars resolve to the strong tier, the oldest to the
 *     quiet one (light 600 / 300, dark 300 / 600); stopped = neutral ink; the dot stays the error red
 *   · the last 5 s: data-near, "3 s left" over the wave's leading end, the TIMER in the warning colour — the dot stays
 *     the error red (★ #46 r1 NIT: the universal "recording" sign); before: nothing
 * Deliberate breaks (S8 picks hand-back): the state check in setComposerRecLevel dropped → stoppedIgnores ·
 *   the clamp dropped → clamped · REC_NEAR_MS = the max → near · the trash name back to cancelRecording → discard ·
 *   the voiceRecLevel handler's digits test inverted → levels · the newest tier rule dropped → tiers */
import { kit } from './v-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = kit(h);
  const { sleep } = K;
  try {
    const s = await K.open();
    const { W, d, push } = s;
    const r = {};
    const bar = () => d.querySelector('.c-composer__rec');
    const bars = () => [...d.querySelectorAll('.c-composer__rec-wave > .c-composer__rec-bar')];
    const hOf = (b) => b.style.getPropertyValue('--rec-h');
    push('voiceRec', 'recording', '0');
    await sleep(30);
    const b = bar();
    const cancel = b && b.querySelector('.c-composer__rec-cancel');
    r.discard = !!cancel && cancel.getAttribute('aria-label') === 'Discard recording';
    r.timer = !!b && b.querySelector('.c-composer__rec-time').textContent === '0:00 / 0:30';
    const wave = b && b.querySelector('.c-composer__rec-wave');
    r.waveHidden = !!wave && wave.getAttribute('aria-hidden') === 'true';
    const n0 = bars().length;
    r.manyBars = n0 >= 120;
    r.flatAtStart = bars().every((x) => hOf(x) === '' || hOf(x) === '0');
    /* the levels: one bar each at the END, in order */
    const first = bars()[0];
    const before = s.sent.length;
    for (const v of ['10', '50', '100', '250', '-5', 'abc', '', '37.6', 'NaN']) push('voiceRecLevel', v);
    await sleep(20);
    const tail = bars().slice(-6).map(hOf);
    r.levels = JSON.stringify(tail) === JSON.stringify(['10', '50', '100', '100', '0', '38']);
    r.clamped = tail[3] === '100' && tail[4] === '0';
    r.countKept = bars().length === n0 && bars()[0] !== first;
    r.noVerb = s.sent.slice(before).filter((c) => /level|voicerec/i.test(c)).length === 0;
    /* tiers: the newest bar = the strong tier, the oldest = the quiet one; never the error red */
    const bgOf = (x) => W.getComputedStyle(x).getPropertyValue('background') + W.getComputedStyle(x).getPropertyValue('background-color');
    const all = bars();
    r.tiers = /--rec-wave-new/.test(bgOf(all[all.length - 1])) && /--rec-wave-old/.test(bgOf(all[0])) && /--rec-wave-mid/.test(bgOf(all[all.length - 20]));
    r.notRed = all.every((x) => !/error/.test(bgOf(x)));
    const tok = (sel) => { const rs = K.rulesFor(d, sel); return rs.map((x) => x.style.getPropertyValue('--rec-wave-new') + '|' + x.style.getPropertyValue('--rec-wave-old')).join(' '); };
    r.themeTiers = /--primary-600\)\|var\(--primary-300/.test(tok('.c-composer__rec')) && /--primary-300\)\|var\(--primary-600/.test(tok('[data-theme="dark"] .c-composer__rec'));
    r.dotRed = /--icon-error/.test(W.getComputedStyle(b.querySelector('.c-composer__rec-dot')).getPropertyValue('background') + W.getComputedStyle(b.querySelector('.c-composer__rec-dot')).getPropertyValue('background-color'));
    /* the last 5 s */
    const hint = b.querySelector('.c-composer__rec-hint');
    push('voiceRec', 'recording', '7000');
    await sleep(20);
    r.notNearAt7 = !b.hasAttribute('data-near') && hint.textContent === '' && W.getComputedStyle(hint).display === 'none';
    push('voiceRec', 'recording', '27000');
    await sleep(20);
    r.near = b.hasAttribute('data-near') && hint.textContent === '3 s left' && hint.getAttribute('aria-hidden') === 'true'
      && b.querySelector('.c-composer__rec-time').textContent === '0:27 / 0:30'
      && /--text-warning/.test(W.getComputedStyle(b.querySelector('.c-composer__rec-time')).getPropertyValue('color'))
      && /--icon-error/.test(W.getComputedStyle(b.querySelector('.c-composer__rec-dot')).getPropertyValue('background') + W.getComputedStyle(b.querySelector('.c-composer__rec-dot')).getPropertyValue('background-color'));
    /* stopped: frozen — a level changes nothing, the near hint goes, the bars go neutral */
    push('voiceRec', 'stopped', '30000');
    await sleep(20);
    const snap = bars().map(hOf).join(',');
    push('voiceRecLevel', '90');
    await sleep(20);
    r.stoppedIgnores = bars().map(hOf).join(',') === snap;
    r.stoppedNotNear = !b.hasAttribute('data-near') && hint.textContent === '';
    r.stoppedNeutral = /--icon-neutral-03/.test(bgOf(bars()[bars().length - 1]));
    /* closed: no bar, a level is harmless */
    push('voiceRec', 'idle', '0');
    await sleep(20);
    push('voiceRecLevel', '55');
    await sleep(20);
    r.closedHarmless = !bar();
    /* the trash still sends the one cancel verb */
    push('voiceRec', 'recording', '1000');
    await sleep(500);
    const b2 = s.sent.length;
    bar().querySelector('.c-composer__rec-cancel').click();
    await sleep(20);
    r.cancelVerb = JSON.stringify(s.sent.slice(b2).filter((c) => /^ixian:voice/.test(c))) === JSON.stringify(['ixian:voicerec:cancel']);
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks (#1239 R1) RECORDING BAR on the built chat shell: the trash "Discard recording" (still ixian:voicerec:cancel), "m:ss / 0:30" kept; voiceRecLevel = one bar at the END per push (rounded, clamped 0..100, a non-number dropped, the count kept, no verb out); the wave is aria-hidden and NOT red (newest = the strong tier, oldest = the quiet tier, light 600/300 · dark 300/600), the dot stays red; the last 5 s → data-near + "3 s left" + the warning timer, the dot still red (#46 r1 NIT) (not at 0:07); stopped = frozen, neutral, a level ignored; closed = harmless — '
      + JSON.stringify(r));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-rec THREW: ' + (e && e.stack || e)); }
}
