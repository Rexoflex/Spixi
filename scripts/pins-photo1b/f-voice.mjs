/* ==== photo1b PO-6 shell half — `voiceWaveLite` (agent `tile`): fewer waveform writes, the same painted wave ====
 * Mechanism (docs/photo1b-mechanisms.md P6 / P7): `buildVoiceBody` makes 40 bar spans and `paintVoice` wrote `--voice-h` and
 * `data-played` on ALL 40 at EVERY paint — also for a flat placeholder (no peaks yet: every height 0) and on every voiceInfo
 * repaint. With the cap `voiceWaveLite` (the shell passes `voice.lite`): no `--voice-h` write for a flat placeholder (an unwritten
 * bar reads `var(--voice-h, 0)` = the same 2 px dot), a repaint writes only the bars whose value changed, a played tick writes only
 * the bars between the old and the new played count. The 40 bars STAY (reason in message-bubble.js voiceWaveMemo).
 * This pin drives the BUILT chat.html in jsdom through the shell's own pushes (20 voice rows: 10 inline + 10 voice files, both
 * directions; with and without peaks; played / not) in TWO documents — the cap ON and the cap absent — and
 *   (1) counts the `--voice-h` writes (a spy on CSSStyleDeclaration.prototype.setProperty) and the `data-played` writes (a
 *       MutationObserver): ON = 0 for 20 placeholders; one voiceInfo with peaks = only the non-zero bars; the same peaks again = 0;
 *       3 changed peaks = exactly 3; OFF (cap absent) = today's 40 per paint;
 *   (2) voiceState `playing` at 50 % marks EXACTLY the first 20 bars `data-played` (ON = OFF); a tick to 60 % writes exactly 4
 *       (ON); back to `idle` clears all 40 (ON = OFF);
 *   (3) the PAINTED wave (each bar's --voice-h read as 0 when unwritten, and its data-played) is equal ON vs OFF after every step,
 *       and the peaks → no peaks case (a wave that had peaks and repaints flat) restores the zero heights;
 *   (4) hostile text in a nick / a file name / a message does not become markup (no element made from it).
 * LIMITS: jsdom lays nothing out, so "the same 2 px dot" is proven by the CSS default (`var(--voice-h, 0)`, asserted on the built
 * css text), not by a measured height; the spies count writes through the DOM APIs the component uses (setProperty / dataset /
 * attribute mutations) — a write by another route (cssText, setAttribute('style')) would not be seen.
 * Deliberate breaks (#802) — each ONE token in a full temp copy of the tree (+ build-demo-bundle + build-shells), red keys listed:
 *   message-bubble.js  lite `if (hs[i] !== m.hs[i])` → `if (true)` (always write) ........ (build) (flat placeholder) (peaks arrive) (same peaks) (3 changed) (played tick) (flat clip)
 *   message-bubble.js  `if (hs[i] !== m.hs[i])` → `=== ` ................................. (build) (flat) (peaks) (same) (3 changed) (played) (tick) (painted wave)
 *   message-bubble.js  `const lo = Math.min(played, m.played)` → `0` (rewrite from bar 0) ... (played tick) only
 *   message-bubble.js  lite played loop `i < played` → `i <= played` ....................... (back to idle) (painted wave)
 *   message-bubble.js  lite played loop `else delete bars[i].dataset.played` → `else void 0` ... (back to idle) (painted wave)
 *   message-bubble.js  `Math.max(played, m.played), bars.length)` → `… - 1, bars.length)` ... (played) (played tick) (idle) (painted wave) (flat clip)
 *   chat.html          `lite: !!bridge.cap('voiceWaveLite')` → `lite: false` (cap ignored) ... (build) (flat) (peaks) (same) (3 changed) (played tick) (flat clip)
 *   chat.html          `lite: !!bridge.cap('voiceWaveLite')` → `lite: true` (the absent path goes lite) ... (build) (flat) (peaks) (same) (3 changed)
 *   message-bubble.css `var(--voice-h, 0)` → `var(--voice-h, 50)` (an unwritten bar would be tall) ... (flat placeholder: the css default the lite path relies on)
 * NOT breakable by one token: the "hostile text" key — the lite path never touches a nick / a name / a message (it writes numbers and a
 * flag), so it is a negative control that holds today's guarantee, not a pin of new code. */
import { kit } from './e-kit.mjs';
export default async function (h) {
  const { ok, root, join, readFileSync, sleep } = h;
  const K = kit(h);
  const html = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const T = K.T0;
  const hex = (i) => (0xa000 + i).toString(16).padStart(32, '0');
  const PEAKS = Array.from({ length: 40 }, (_, i) => (i * 7) % 101);
  const peaksCsv = (a) => a.join(',');
  const nonZero = (a) => a.filter((v) => v !== 0).length;
  /* 10 inline voice rows (5 received / 5 sent) + 10 voice files (5 / 5), all complete + local */
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const mine = i % 2 === 1;
    rows.push([mine ? 'addMe' : 'addThem', hex(i), mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Bob', '', '🎤 0:08 (voice message)', String(T + i * 60),
      'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '8000']);
  }
  for (let i = 10; i < 20; i++) {
    const mine = i % 2 === 1;
    rows.push(['addFile', hex(i), mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Bob', '', 'vf' + i, 'voice-' + i + '.ogg', String(T + i * 60),
      mine ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1']);
  }
  const run = async (caps) => {
    const spy = { h: 0, played: 0 };
    const s = await K.open(html, {
      caps, rows, settle: 300,
      before: (z) => {
        const proto = z.W.CSSStyleDeclaration.prototype;
        const orig = proto.setProperty;
        proto.setProperty = function (name, ...r) { if (name === '--voice-h') spy.h++; return orig.call(this, name, ...r); };
        z.mo = new z.W.MutationObserver((recs) => { for (const r of recs) if (r.attributeName === 'data-played') spy.played++; });
        z.mo.observe(z.d.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-played'] });
      },
    });
    const wave = (id) => [...K.rowOf(s.d, id).querySelectorAll('.c-voice__bar')].map((b) => (b.style.getPropertyValue('--voice-h') || '0') + (b.hasAttribute('data-played') ? 'p' : ''));
    const all = () => Array.from({ length: 20 }, (_, i) => wave(hex(i)).join(','));
    const lap = async (fn) => { await sleep(20); s.mo.takeRecords(); spy.h = 0; spy.played = 0; fn(); await sleep(30); const r = { h: spy.h, played: spy.played + s.mo.takeRecords().filter((x) => x.attributeName === 'data-played').length }; return r; };
    const r = { s, wave, all, lap, spy, steps: {} };
    r.steps.build = { h: spy.h };   // the writes of the 20 builds (the spies were armed before the open)
    r.steps.placeholder = { wave: all(), bars: K.rowOf(s.d, hex(0)).querySelectorAll('.c-voice__bar').length, rows: s.d.querySelectorAll('#messages .c-voice').length };
    /* (1) 20 builds happened before the spies were reset: count a fresh PLACEHOLDER repaint on 10 rows (voiceInfo with no peaks, a length only) */
    r.steps.flatRepaint = await lap(() => { for (let i = 0; i < 10; i++) s.push('voiceInfo', hex(i), '9000', ''); });
    r.steps.flatWave = all();
    /* one voiceInfo with peaks on rows 0..9 */
    r.steps.peaks = await lap(() => { for (let i = 0; i < 10; i++) s.push('voiceInfo', hex(i), '9000', peaksCsv(PEAKS)); });
    r.steps.peaksWave = all();
    /* the same peaks again */
    r.steps.same = await lap(() => { for (let i = 0; i < 10; i++) s.push('voiceInfo', hex(i), '9000', peaksCsv(PEAKS)); });
    /* 3 changed peaks on rows 0..9 (indexes 5, 10, 15 → new values) */
    const P2 = PEAKS.slice(); P2[5] = 99; P2[10] = 1; P2[15] = 50;
    r.steps.three = await lap(() => { for (let i = 0; i < 10; i++) s.push('voiceInfo', hex(i), '9000', peaksCsv(P2)); });
    r.steps.threeWave = all();
    /* played 50 % of 9000 ms on row 2 (peaks known) */
    r.steps.half = await lap(() => s.push('voiceState', hex(2), 'playing', '4500', '9000'));
    r.steps.halfWave = wave(hex(2));
    r.steps.halfPlayedIdx = wave(hex(2)).map((x, i) => (x.endsWith('p') ? i : -1)).filter((i) => i >= 0);
    r.steps.sixty = await lap(() => s.push('voiceState', hex(2), 'playing', '5400', '9000'));
    r.steps.sixtyN = wave(hex(2)).filter((x) => x.endsWith('p')).length;
    r.steps.same60 = await lap(() => s.push('voiceState', hex(2), 'playing', '5400', '9000'));
    r.steps.idle = await lap(() => s.push('voiceState', hex(2), 'stopped', '0', '9000'));
    r.steps.idleN = wave(hex(2)).filter((x) => x.endsWith('p')).length;
    /* a placeholder row (no peaks ever) played: the wave stays flat, the played bars are marked */
    r.steps.flatPlay = await lap(() => s.push('voiceState', hex(15), 'playing', '2250', '9000'));
    r.steps.flatPlayWave = wave(hex(15));
    r.steps.final = all();
    return r;
  };
  const on = await run('voice,voiceWaveLite');
  const off = await run('voice');
  const cssHas = /\.c-voice__bar \{[^}]*height: calc\(2px \+ var\(--voice-h, 0\) \* 0\.18px\)/.test(readFileSync(html, 'utf8').replace(/\s+/g, ' '));
  const nPeaks = nonZero(PEAKS);

  ok(on.steps.placeholder.rows === 20 && on.steps.placeholder.bars === 40 && off.steps.placeholder.rows === 20 && off.steps.placeholder.bars === 40,
    '★ photo1b PO-6: the shell builds 20 voice rows of 40 bars each with the cap ON and absent (the 40 bars stay) — ' + JSON.stringify({ on: [on.steps.placeholder.rows, on.steps.placeholder.bars], off: [off.steps.placeholder.rows, off.steps.placeholder.bars] }));
  ok(on.steps.build.h === 0 && off.steps.build.h >= 20 * 40 && off.steps.build.h % 40 === 0,
    '★ photo1b PO-6 (the build): the open of 20 placeholder voice rows writes NO --voice-h with the cap ON and at least 20 × 40 = 800 (whole paints of 40) with the cap absent — ' + JSON.stringify({ on: on.steps.build.h, off: off.steps.build.h }));
  ok(cssHas && on.steps.flatRepaint.h === 0 && off.steps.flatRepaint.h === 10 * 40,
    '★ photo1b PO-6 (flat placeholder): a voiceInfo that brings no peaks repaints 10 flat rows with NO --voice-h write when the cap is ON (an unwritten bar reads var(--voice-h, 0) in the built css) and 10 × 40 = 400 writes when the cap is absent — ' + JSON.stringify({ cssHas, on: on.steps.flatRepaint, off: off.steps.flatRepaint }));
  ok(on.steps.peaks.h === 10 * nPeaks && off.steps.peaks.h === 10 * 40,
    '★ photo1b PO-6 (peaks arrive): voiceInfo with 40 peaks on 10 rows writes only the non-zero bars when ON (10 × ' + nPeaks + ') and 10 × 40 when absent — ' + JSON.stringify({ on: on.steps.peaks.h, off: off.steps.peaks.h, nPeaks }));
  ok(on.steps.same.h === 0 && off.steps.same.h === 10 * 40,
    '★ photo1b PO-6 (a repaint with the same peaks): ON writes nothing, absent writes 10 × 40 — ' + JSON.stringify({ on: on.steps.same.h, off: off.steps.same.h }));
  ok(on.steps.three.h === 10 * 3 && off.steps.three.h === 10 * 40,
    '★ photo1b PO-6 (3 peaks changed): ON writes exactly the 3 changed bars per row (10 × 3), absent 10 × 40 — ' + JSON.stringify({ on: on.steps.three.h, off: off.steps.three.h }));
  ok(on.steps.halfPlayedIdx.join() === Array.from({ length: 20 }, (_, i) => i).join() && off.steps.halfPlayedIdx.join() === on.steps.halfPlayedIdx.join()
     && on.steps.halfWave.join() === off.steps.halfWave.join(),
    '★ photo1b PO-6 (played): voiceState playing at 50 % marks EXACTLY the first 20 bars data-played, ON = absent, the whole wave the same — ' + JSON.stringify({ on: on.steps.halfPlayedIdx.length, off: off.steps.halfPlayedIdx.length, first: on.steps.halfPlayedIdx[0], last: on.steps.halfPlayedIdx[on.steps.halfPlayedIdx.length - 1] }));
  ok(on.steps.half.played === 20 && on.steps.sixty.played === 4 && on.steps.sixtyN === 24 && off.steps.sixtyN === 24 && on.steps.same60.played === 0 && on.steps.same60.h === 0,
    '★ photo1b PO-6 (a played tick): 0 → 50 % writes the 20 bars, 50 → 60 % writes exactly the 4 bars in between (24 marked, ON = absent), the same position again writes nothing, no --voice-h write at all — ' + JSON.stringify({ half: on.steps.half, sixty: on.steps.sixty, same60: on.steps.same60, n: [on.steps.sixtyN, off.steps.sixtyN] }));
  ok(on.steps.idleN === 0 && off.steps.idleN === 0 && on.steps.idle.played === 24,
    '★ photo1b PO-6 (back to idle): every played mark is cleared (ON = absent = 0 left; ON clears exactly the 24 it had set) — ' + JSON.stringify({ idle: on.steps.idle, on: on.steps.idleN, off: off.steps.idleN }));
  ok(on.steps.flatWave.join('|') === off.steps.flatWave.join('|') && on.steps.peaksWave.join('|') === off.steps.peaksWave.join('|')
     && on.steps.threeWave.join('|') === off.steps.threeWave.join('|') && on.steps.final.join('|') === off.steps.final.join('|')
     && on.steps.placeholder.wave.join('|') === off.steps.placeholder.wave.join('|'),
    '★ photo1b PO-6 (the PAINTED wave is equal): every row of 40 bars (--voice-h read as 0 when unwritten, + data-played) is the same cap ON and absent after the build, the flat repaint, the peaks, the 3 changes and the end — ' + JSON.stringify({ same: [on.steps.flatWave, on.steps.peaksWave, on.steps.threeWave, on.steps.final].map((w, i) => w.join('|') === [off.steps.flatWave, off.steps.peaksWave, off.steps.threeWave, off.steps.final][i].join('|')) }));
  ok(on.steps.flatPlayWave.filter((x) => x.endsWith('p')).length === 10 && off.steps.flatPlayWave.filter((x) => x.endsWith('p')).length === 10
     && on.steps.flatPlayWave.every((x) => /^0/.test(x)) && on.steps.flatPlay.h === 0,
    '★ photo1b PO-6 (a flat clip being played): 25 % of the clip marks 10 bars, the wave stays flat, no --voice-h write (ON) — ' + JSON.stringify({ on: on.steps.flatPlayWave.filter((x) => x.endsWith('p')).length, h: on.steps.flatPlay.h }));

  /* (4) hostile text — a cap-ON document, a nick / a name / a message full of markup */
  {
    const evil = '<img src=x onerror=alert(1)><b>x</b>"\'';
    const s = await K.open(html, {
      caps: 'voice,voiceWaveLite',
      rows: [['addThem', hex(30), 'addrPeer', evil, '', evil, String(T), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '8000'],
        ['addFile', hex(31), 'addrPeer', evil, '', 'vf', evil + '.ogg', String(T + 60), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1']],
      settle: 300,
    });
    s.push('voiceInfo', hex(30), '9000', peaksCsv(PEAKS));
    s.push('voiceInfo', hex(31), '9000', evil);
    await sleep(60);
    const log = s.d.getElementById('messages');
    ok(log.querySelectorAll('.c-voice').length === 2 && !log.querySelector('img[src="x"], [onerror], b') && s.errs.filter((e) => /TypeError|ReferenceError|dispatch failed/.test(e)).length === 0,
      '★ photo1b PO-6 (hostile text): a nick, a file name and a message made of markup stay text in a cap-ON voice chat — no <img>, no onerror attribute, no <b> in the log, no page error — ' + JSON.stringify({ voice: log.querySelectorAll('.c-voice').length, errs: s.errs.length }));
    s.dom.window.close();
  }
  on.s.dom.window.close();
  off.s.dom.window.close();
}
