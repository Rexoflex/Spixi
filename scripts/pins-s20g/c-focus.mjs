/* ==== S20G R-6: A TOUCH SEND THAT CARRIED PHOTOS LEAVES THE FIELD UNFOCUSED (no Android keyboard over the photos just sent) ====
 * On the BUILT chat.html (the b1 boot; C# pushes via executeUiCommand, outgoing ixian: captured). Each activation is modelled the
 * way the platform delivers it — focus moves to the disc, then a pointerdown (pointerType touch / mouse) + a click with detail 1;
 * a keyboard activation is a click with detail 0 and no pointerdown; Enter is a keydown in the field (hover: hover only):
 *   (1) PHOTOS + TOUCH — mediaPicked with two ready photos + a caption, a touch tap on Send: ONE ixian:mediaSend went out and the
 *       field does NOT hold focus afterwards (composer.js `send(byTouch)` skipped its input.focus()).
 *   (2) PHOTOS, NO CAPTION + PEN — the same with an empty field and a pen tap: mediaSend, the field not focused.
 *   (3) TEXT ONLY + TOUCH — a typed message, touch Send: ixian:chat went out and the field IS focused again (type on).
 *   (4) PHOTOS + MOUSE — r1 B-2: a mouse click on Send: mediaSend, the field IS focused (else the focus sits on the disc, now
 *       the mic, and Space starts a recording).
 *   (5) PHOTOS + KEYBOARD — Space / Enter on the focused disc (click detail 0, no pointerdown): mediaSend, the field focused.
 *   (6) PHOTOS + ENTER IN THE FIELD (desktop matchMedia hover): mediaSend, the field focused.
 *   (7) STALE TOUCH — a touch pointerdown that never clicked, then a keyboard click: the field focused (the press is consumed / dated).
 *   (6) is a guard (the strip closing must not steal the focus from the field) — Enter never moves the focus, so no
 *       composer.js break flips it on its own.
 * Deliberate breaks (S20G r1 fixer, each run on the rebuilt shell): `!(hadMedia && byTouch)` → `!hadMedia` → mouse + keyboard
 * + stale fail · → `input.focus()` always → touch + pen fail · hadMedia read AFTER onSend → touch + pen fail · `e.detail > 0 &&`
 * dropped → stale fails · `|| downType === 'pen'` dropped → pen fails · the focus line deleted → text + mouse + keyboard + stale fail. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { JPG } = K;
  const R = (k) => ({ k: String(k), thumb: JPG, w: '2048', h: '1536', kb: '400', kind: 'photo' });
  const r = {};
  const got = {};
  let s = null;
  try {
    s = await K.open({ caps: 'reply,edit,voice,media' });
    const { d, push, W } = s;
    const action = () => d.querySelector('.c-composer__action');
    const input = () => d.querySelector('.c-composer__input');
    const strip = () => d.querySelector('#chat-composer > .c-mstrip');
    const type = (t) => { input().focus(); input().value = t; input().dispatchEvent(new W.Event('input', { bubbles: true })); };
    const press = async (pointerType) => {
      action().focus();
      if (pointerType) action().dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true, pointerType }));
      action().dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, detail: pointerType ? 1 : 0 }));
      await sleep(60);
    };
    const count = (re) => s.sent.filter((v) => re.test(v)).length;
    let n = 0;
    const pick = async (k) => { push('mediaPicked', '0f0f0f0f0f0f0f' + String(10 + (n++)), JSON.stringify(k.map(R))); await sleep(80); };
    /* one media send through `how`; returns { strip, sent, focusInput } */
    const mediaCase = async (how, caption) => {
      await pick([0, 1]);
      if (caption) type(caption); else input().blur();
      const m0 = count(/^ixian:mediaSend:/);
      const g = { strip: !!strip(), mode: action().dataset.mode };
      await how();
      g.sent = count(/^ixian:mediaSend:/) - m0; g.focusInput = d.activeElement === input(); g.onAction = d.activeElement === action(); g.stripAfter = !!strip();
      return g;
    };
    /* (1) photos + a caption, touch */
    got.touch = await mediaCase(() => press('touch'), 'look at these');
    r.touch = got.touch.strip && got.touch.sent === 1 && !got.touch.focusInput && !got.touch.onAction && !got.touch.stripAfter;   // r2 M-1: nor left on the disc (now the mic)
    /* (2) photos, no caption, pen */
    got.pen = await mediaCase(() => press('pen'), '');
    r.pen = got.pen.strip && got.pen.sent === 1 && !got.pen.focusInput && !got.pen.onAction;
    /* (3) text only, touch */
    type('hello there');
    const c0 = count(/^ixian:chat:/);
    await press('touch');
    got.t = { sent: count(/^ixian:chat:/) - c0, focusInput: d.activeElement === input(), value: input().value };
    r.text = got.t.sent === 1 && got.t.focusInput && got.t.value === '';
    /* (4) photos, mouse click */
    got.mouse = await mediaCase(() => press('mouse'), 'by mouse');
    r.mouse = got.mouse.strip && got.mouse.sent === 1 && got.mouse.focusInput;
    /* (5) photos, keyboard on the disc */
    got.key = await mediaCase(() => press(''), '');
    r.keyboard = got.key.strip && got.key.sent === 1 && got.key.focusInput;
    /* (6) photos, Enter in the field (keyboard-first matchMedia) */
    const mm = W.matchMedia;
    W.matchMedia = (q) => ({ matches: /hover:\s*hover/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    got.enter = await mediaCase(async () => {
      input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await sleep(60);
    }, 'by enter');
    W.matchMedia = mm;
    r.enter = got.enter.strip && got.enter.sent === 1 && got.enter.focusInput;
    /* (7) a touch press that never clicked, then a keyboard click */
    got.stale = await mediaCase(async () => {
      action().dispatchEvent(new W.PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      await press('');
    }, '');
    r.stale = got.stale.strip && got.stale.sent === 1 && got.stale.focusInput;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20G R-6 (+ r1 B-2): a TOUCH / PEN Send that carries the strip\'s photos sends ONE ixian:mediaSend and leaves the field unfocused (no keyboard on Android); a text-only Send, a mouse click, a keyboard press on the disc, Enter in the field and a stale touch press all keep the focus on the field — ' + JSON.stringify({ r, got }));
}
