/* ==== S8 PICKS (P-V) — ★ #1239 S-A THE SEND RING (inside the play disc) + ★ #1240 the Telegram-low wave ====
 * On the BUILT chat.html (jsdom), through C#'s pushes only:
 *   · an inline voice of MINE before its sent tick (addMe sent False) → data-sending="inline", a ring with a turning arc,
 *     the play button aria-busy, no loading spinner; the tick (updateMessage sent True) removes it IN PLACE (same node)
 *   · MY voice FILE while it uploads → data-sending="file", the arc's dash = updateFile's percentage (30 → 60, in place);
 *     complete → no ring, idle; the 7b "loading" state is kept for the upload (pins-s7 uploadLoading)
 *   · a RECEIVED voice row never gets a ring; reduced motion stops the turn and draws the FULL ring (CSSOM rule)
 *   · the wave: a 20 px box; played bars in the bubble's strong ink, the rest in its muted ink (received: --text-bubble-
 *     received / --voice-bar-unplayed; sent: --text-bubble-sent / --primary-500 — #46 r1 m-1); 40 bars (VOICE_BARS = VoiceCodec.PeakCount)
 * Deliberate breaks (S8 picks hand-back): the upsertText paintVoiceRow on a status flip dropped → inlineEndsOnTick ·
 *   sendPct from rec.progress → 0 → filePct · the `rec.direction === 'sent'` gate dropped → receivedNoRing ·
 *   the reduced-motion full-ring rule dropped → reducedFull · the wave box back to 28px → box20 · played / muted inks
 *   swapped → inks */
import { kit } from './v-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = kit(h);
  const { sleep, T0 } = K;
  const PEAKS = Array.from({ length: 40 }, (_, i) => String((i * 13) % 100)).join(',');
  try {
    const s = await K.open();
    const { W, d, push } = s;
    const r = {};
    const ring = (id) => { const v = K.voiceOf(d, id); return v ? v.querySelector('.c-voice__play > .c-voice__ring') : null; };
    const dash = (id) => { const g = ring(id); return g ? g.querySelector('.c-voice__ring-arc').getAttribute('stroke-dasharray') : null; };
    /* inline, before the tick */
    push('addMe', 'dd10', 'addrMe', 'Me', '', '🎤 0:06', String(T0 + 100), 'False', 'False', 'False', 'False', 'False', '', '', '', '', '', '6000');
    push('addThem', 'dd11', 'addrPeer', 'Ana', '', '🎤 0:04', String(T0 + 110), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '4000');
    await sleep(120);
    const v10 = K.voiceOf(d, 'dd10');
    r.inlineRing = !!v10 && v10.dataset.sending === 'inline' && !!ring('dd10') && ring('dd10').dataset.mode === 'inline'
      && v10.querySelector('.c-voice__play').getAttribute('aria-busy') === 'true' && !v10.querySelector('.c-voice__spin');
    r.receivedNoRing = !!K.voiceOf(d, 'dd11') && !K.voiceOf(d, 'dd11').hasAttribute('data-sending') && !ring('dd11');
    push('updateMessage', 'dd10', '🎤 0:06', 'True', 'False', 'False', 'False', 'False');
    await sleep(60);
    r.inlineEndsOnTick = K.voiceOf(d, 'dd10') === v10 && !v10.hasAttribute('data-sending') && !ring('dd10') && !v10.querySelector('.c-voice__play').hasAttribute('aria-busy');
    /* a voice FILE upload */
    push('addFile', 'dd20', 'addrMe', 'Me', '', 'fd20', 'voice-1.ogg', String(T0 + 200), 'True', 'True', 'False', '30', 'False', 'False', 'True', '', '1', '1');
    await sleep(120);
    const v20 = K.voiceOf(d, 'dd20');
    r.fileRing = !!v20 && v20.dataset.sending === 'file' && v20.dataset.state === 'loading' && !v20.querySelector('.c-voice__spin');
    r.filePct = dash('dd20') === '30 100';
    push('updateFile', 'fd20', '60', 'False');
    await sleep(40);
    r.fileTick = K.voiceOf(d, 'dd20') === v20 && dash('dd20') === '60 100';
    push('updateFile', 'fd20', '100', 'True');
    await sleep(80);
    const v20b = K.voiceOf(d, 'dd20');
    r.fileDone = !!v20b && !v20b.hasAttribute('data-sending') && !v20b.querySelector('.c-voice__ring') && v20b.dataset.state === 'idle';
    /* reduced motion: the CSSOM rule stops the turn and draws the full ring */
    const red = K.rulesFor(d, '.c-voice__ring[data-mode="inline"] .c-voice__ring-arc').filter((x) => /reduced-motion/.test(x.media));
    const redTurn = K.rulesFor(d, '.c-voice__ring[data-mode="inline"]').filter((x) => /reduced-motion/.test(x.media));
    r.reducedFull = red.some((x) => /^100 0$/.test(x.style.getPropertyValue('stroke-dasharray').trim()))
      && redTurn.some((x) => /none/.test(x.style.getPropertyValue('animation') + x.style.getPropertyValue('animation-name')));
    /* the wave */
    push('voiceInfo', 'dd11', '4000', PEAKS);
    push('voiceState', 'dd11', 'paused', '2000', '4000');
    push('voiceInfo', 'dd10', '6000', PEAKS);
    push('voiceState', 'dd10', 'paused', '3000', '6000');
    await sleep(60);
    const wv = K.voiceOf(d, 'dd11').querySelector('.c-voice__wave');
    r.box20 = W.getComputedStyle(wv).getPropertyValue('height') === '20px';
    r.forty = wv.querySelectorAll('.c-voice__bar').length === 40;
    const bg = (x) => W.getComputedStyle(x).getPropertyValue('background') + W.getComputedStyle(x).getPropertyValue('background-color');
    const rp = wv.querySelector('.c-voice__bar[data-played]');
    const ru = wv.querySelector('.c-voice__bar:not([data-played])');
    const sw = K.voiceOf(d, 'dd10').querySelector('.c-voice__wave');
    const sp = sw.querySelector('.c-voice__bar[data-played]');
    const su = sw.querySelector('.c-voice__bar:not([data-played])');
    r.inks = !!rp && !!ru && !!sp && !!su
      && /--text-bubble-received\)/.test(bg(rp)) && /--voice-bar-unplayed/.test(bg(ru))
      && /--text-bubble-sent\)/.test(bg(sp)) && /--primary-500/.test(bg(su));   // ★ #46 r1 (m-1): the quieter unplayed inks (v-r1 pins the ratios)
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks (#1239 S-A / #1240) on the built chat shell: my inline voice before its tick carries a turning ring in the disc (aria-busy, no spinner) and the sent tick removes it in place; my voice FILE shows the upload percentage as the arc (30 → 60 in place) and complete clears it; a received row never has a ring; reduced motion = a still, FULL ring; the wave is a 20 px box of 40 bars, played in the strong ink and the rest in the muted ink (both directions) — '
      + JSON.stringify(r));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-ring THREW: ' + (e && e.stack || e)); }
}
