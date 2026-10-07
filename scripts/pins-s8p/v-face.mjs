/* ==== S8 PICKS (P-V) — ★ #1240 THE FACE in a voice bubble: a 40 avatar at the trailing end + a mic badge ====
 * On the BUILT chat.html (jsdom), through C#'s pushes only:
 *   · 1:1 received: the chat's avatar (setAvatar); sent: MY avatar (the NEW push setSelfAvatar — a base64 data: image only;
 *     anything else = my initials, no <img>); a later setSelfAvatar / setAvatar repaints the drawn faces IN PLACE
 *   · group received: the sender's picture (setAvatarFor, the gutter's own source); the voice row draws NO gutter avatar
 *     (one face per row), a text row still does; a changed setAvatarFor repaints the voice face in place
 *   · the badge: received + not played in this document = accent; once voiceState says playing / paused = neutral;
 *     mine = neutral; the face is decorative (aria-hidden); the play button keeps its name
 *   · the time + ticks share the line under the wave (the meta lives in .c-voice__foot)
 * Deliberate breaks (S8 picks hand-back): the gutter rule `!(voice && voice.who)` dropped → oneFace · `v.heard = true`
 *   dropped → heardNeutral · setSelfAvatar's AVATAR_URI_RE test dropped → selfInvalidInitials · repaintVoiceFaces in
 *   setAvatarFor dropped → groupRepaint · voiceWho's sent branch → the peer → selfFace */
import { kit } from './v-kit.mjs';
const PNG_A = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_B = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_C = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
export default async function (h) {
  const { ok } = h;
  const K = kit(h);
  const { sleep, T0 } = K;
  const face = (d, id) => { const v = K.voiceOf(d, id); return v ? v.querySelector(':scope > .c-voice__who') : null; };
  const img = (d, id) => { const f = face(d, id); const i = f && f.querySelector('.c-avatar img'); return i ? i.getAttribute('src') : null; };
  const tone = (d, id) => { const f = face(d, id); return f ? f.dataset.tone : null; };
  /* ——— 1:1 ——— */
  try {
    const s = await K.open({ before: (s0) => { s0.push('setSelfNick', 'Damir'); s0.push('setSelfAvatar', PNG_A); s0.push('setAvatar', PNG_B); } });
    const { d, push } = s;
    const r = {};
    push('addThem', 'aa10', 'addrPeer', 'Ana', '', '🎤 0:12', String(T0 + 100), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12000');
    push('addMe', 'aa11', 'addrMe', 'Damir', '', '🎤 0:05', String(T0 + 110), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '5000');
    await sleep(120);
    r.peerFace = img(d, 'aa10') === PNG_B && tone(d, 'aa10') === 'accent';
    r.selfFace = img(d, 'aa11') === PNG_A && tone(d, 'aa11') === 'neutral';
    r.decorative = !!face(d, 'aa10') && face(d, 'aa10').getAttribute('aria-hidden') === 'true' && !!face(d, 'aa10').querySelector('.c-voice__badge svg')
      && /^Play voice message/.test(K.voiceOf(d, 'aa10').querySelector('.c-voice__play').getAttribute('aria-label'));
    r.noGutter1to1 = !K.rowOf(d, 'aa10').querySelector('.c-bubble-row__gutter .c-avatar');
    r.metaInFoot = !!K.voiceOf(d, 'aa11').querySelector('.c-voice__foot > .c-bubble__meta .c-status-icon') && !!K.voiceOf(d, 'aa11').querySelector('.c-voice__foot > .c-voice__time');
    /* played → neutral (in place: the same face node) */
    const f10 = face(d, 'aa10');
    push('voiceState', 'aa10', 'playing', '1000', '12000');
    await sleep(30);
    push('voiceState', 'aa10', 'stopped', '0', '12000');
    await sleep(30);
    r.heardNeutral = tone(d, 'aa10') === 'neutral' && face(d, 'aa10') === f10;
    /* setSelfAvatar: junk → initials; a new picture → repaint in place */
    const vnode = K.voiceOf(d, 'aa11');
    push('setSelfAvatar', 'https://evil.example/me.png');
    await sleep(30);
    r.selfInvalidInitials = !!face(d, 'aa11') && img(d, 'aa11') === null && !!face(d, 'aa11').querySelector('.c-avatar') && K.voiceOf(d, 'aa11') === vnode;
    push('setSelfAvatar', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    await sleep(30);
    r.svgRefused = img(d, 'aa11') === null;
    push('setSelfAvatar', PNG_C);
    await sleep(30);
    r.selfRepaint = img(d, 'aa11') === PNG_C && K.voiceOf(d, 'aa11') === vnode;
    push('setAvatar', PNG_A);
    await sleep(30);
    r.peerRepaint = img(d, 'aa10') === PNG_A && img(d, 'aa11') === PNG_C;
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks (#1240) VOICE FACE 1:1 on the built chat shell: a received voice bubble shows the chat\'s avatar with an ACCENT mic badge (aria-hidden; the play button keeps its name), mine shows MY setSelfAvatar picture with a NEUTRAL badge; no gutter face; the time + ticks share the line under the wave; playing / paused once → the badge goes neutral in place; setSelfAvatar with an http URL or an svg data URI → my initials (no <img>), a new picture repaints in place, setAvatar repaints the peer\'s faces — '
      + JSON.stringify(r));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-face 1:1 THREW: ' + (e && e.stack || e)); }
  /* ——— group ——— */
  try {
    const s = await K.open({ group: true, before: (s0) => { s0.push('setAvatarFor', 'addrAna', PNG_B); s0.push('setAvatarFor', 'addrCene', PNG_C); } });
    const { d, push } = s;
    const r = {};
    push('addThem', 'bb10', 'addrCene', 'Cene', '', '🎤 0:12', String(T0 + 100), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12000');   // first of Cene's run
    push('addThem', 'bb11', 'addrAna', 'Ana', '', 'a text from Ana', String(T0 + 200), 'True', 'True', 'True', 'False', 'False');
    await sleep(150);
    r.senderFace = img(d, 'bb10') === PNG_C && tone(d, 'bb10') === 'accent';
    const g = K.rowOf(d, 'bb10').querySelector('.c-bubble-row__gutter');
    r.oneFace = !!g && !g.querySelector('.c-avatar') && d.querySelectorAll('#messages [data-msgid="bb10"] .c-avatar').length === 1;
    r.textGutterStays = !!K.rowOf(d, 'bb11').querySelector('.c-bubble-row__gutter .c-avatar');
    const vnode = K.voiceOf(d, 'bb10');
    push('setAvatarFor', 'addrCene', PNG_A);
    await sleep(30);
    r.groupRepaint = img(d, 'bb10') === PNG_A && K.voiceOf(d, 'bb10') === vnode;
    push('setAvatarFor', 'addrAna', PNG_C);   // another member: Cene's face stays
    await sleep(30);
    r.otherUntouched = img(d, 'bb10') === PNG_A;
    r.noErr = K.noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ S8 picks (#1240) VOICE FACE in a GROUP on the built chat shell: a received voice bubble shows the sender\'s setAvatarFor picture (accent badge) and its row draws NO gutter avatar — one face per row — while a text row keeps its gutter face; a changed setAvatarFor for that member repaints the voice face in place, another member\'s leaves it — '
      + JSON.stringify(r));
    s.dom.window.close();
  } catch (e) { ok(false, 'S8 picks v-face group THREW: ' + (e && e.stack || e)); }
}
