/* Amount-field keyboard behaviour — the ONE way out of the numeric keyboard.
 *
 * ★★ #609 (device row 5b, iPhone 15, 2026-08-27). It lived in wallet-send.js and was
 * shared with wallet-receive by a cross-feature import; the tip sheet then needed it
 * too, and `#143 ②` is explicit that a shared helper belongs in a shared module rather
 * than in whichever feature happened to write it first. So it has one.
 *
 * WHY THE FIELD NEEDS THIS AT ALL, and it took a device to see it. Every amount input
 * in the app is `inputMode="decimal"`, which on iOS is the DECIMAL PAD — a keypad with
 * no return key of any kind. The app also swizzles `inputAccessoryView` to nil
 * process-wide (iOSWebViewHandler, for the chat composer's sake), so there is no Done
 * button either. Between them the field had literally no dismiss affordance: Damir's
 * "it's difficult to choose the recipient" on wallet Send, and a tip sheet whose own
 * numeric pad covered the sheet that summoned it.
 */
/** Give an amount input every way out that its platform can offer.
 *  · `enterkeyhint="done"` + Enter -> blur, for the keyboards that HAVE a return key
 *    (Android, and any desktop browser). IME-guarded, and desktop-exempt: there is no
 *    soft keyboard to drop there, and ejecting a keyboard user to <body> on the commit
 *    key is a regression, not a feature.
 *  · a tap on any NON-interactive part of the page -> blur. This is the platform
 *    convention and, on the iOS decimal pad, the only affordance that can exist.
 *    ⚠ Non-interactive ONLY. Blurring on `pointerdown` over a button would trade one
 *    defect for a worse one: the keyboard collapses, the layout it was holding up
 *    moves, and the button slides out from under the finger before `click` is
 *    delivered. A tap on a control keeps focus and behaves exactly as it does today.
 *  · the listener is bound on FOCUS and dropped on BLUR, so a screen with no amount
 *    field on it never carries a document-level handler. */
export function attachAmountKeyboardDismiss(input) {
  if (!input) return input;
  input.setAttribute('enterkeyhint', 'done');
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    if (document.documentElement.hasAttribute('data-desktop')) return;
    e.preventDefault();
    try { input.blur(); } catch (err) { /* jsdom / unfocused */ }
  });
  /* ⚠ ROUND 2 (adversarial review, MEDIUM-2): act on the LIFT, not on the press.
   * `pointerdown` cannot tell a tap from the first event of a scroll. #608 reserves the
   * keyboard's height so the content it covers can be SCROLLED to — and the drag that
   * performs that scroll fired this handler on its first event, dropping the keyboard
   * and collapsing the reserved space by that height, mid-gesture, under the finger,
   * with inertia already in flight. So the press only ARMS, movement past a small slop
   * disarms, and the blur happens on release. */
  const SLOP_PX = 8;
  input.addEventListener('focus', () => {
    if (document.documentElement.hasAttribute('data-desktop')) return;
    let armed = false, x0 = 0, y0 = 0;
    const interactive = 'input, textarea, select, button, a, label, [role="button"], [contenteditable]';
    const down = (e) => {
      armed = false;
      const t = e && e.target;
      if (!t || t === input) return;
      /* never on an interactive target: blurring over a button collapses the keyboard,
         moves the layout it was holding up, and the button leaves the finger before
         `click` is delivered — one defect traded for a worse one. */
      if (typeof t.closest === 'function' && t.closest(interactive)) return;
      armed = true; x0 = e.clientX || 0; y0 = e.clientY || 0;
    };
    const move = (e) => {
      if (!armed) return;
      if (Math.abs((e.clientX || 0) - x0) > SLOP_PX || Math.abs((e.clientY || 0) - y0) > SLOP_PX) armed = false;
    };
    const up = () => {
      if (!armed) return;
      armed = false;
      try { input.blur(); } catch (err) { /* jsdom */ }
    };
    const off = () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', off, true);
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    input.addEventListener('blur', off, { once: true });
    /* ⚠ belt for the one path where no blur ever comes: the field is REMOVED while
     * focused (a sheet closing with focus still inside it). Chromium fires blur on
     * removal and self-cleans; WebKit was not testable here, and a leaked capture
     * listener would retain the detached subtree for the life of the document. */
    const sweep = setInterval(() => {
      if (!input.isConnected) { off(); clearInterval(sweep); }
    }, 2000);
    input.addEventListener('blur', () => clearInterval(sweep), { once: true });
  });
  return input;
}
