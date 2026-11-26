/* ==== The "Protect your account" step with the keyboard up (#1837): a compact header, both fields + the button ====
 * LIMITS (#1735 — first, as the rule asks): jsdom has NO layout and NO visualViewport. This pin proves the STATE and the
 * wiring on the BUILT intro.html (launch.html `kbState` / `revealResized` / `nextField`, launch-form.css `.c-launch[data-kb]`):
 * the keyboard is modelled as window.innerHeight shrinking by 323 px (Android adjustResize) plus a window resize event, a
 * window change as innerWidth / innerHeight set by hand, the clock of the "a field was just tapped or focused" rule as a
 * stubbed Date.now; the CSS is read through the pins-on1 cascade (rules, not boxes); the pair reveal runs on STUBBED rects.
 * It cannot show that the two fields and the button really end up above a real keyboard, nor that a real tap lands: that
 * is the by-hand Chromium check scripts/pins-fixb5/d-protect-keyboard-render.mjs (sizes, both themes, TAP rows).
 * The Android IME's Next is Chromium's own focus advance (IME_ACTION_NEXT, no keydown): row (4) proves only the Enter path
 * of a hardware or iOS keyboard and the enterkeyhint that makes Gboard show "Next". Not exercised: the visualViewport
 * path, a real IME, the re-check timers as such.
 * Rows:
 *   (1) Android UA, step 2: full height → off; 323 px shorter with the password focused → data-kb on the shell root; the
 *       confirm field → on; the focus moves to the button, to an eye, to body (a tap while the keyboard is still up) →
 *       the state HOLDS; the keyboard closes (taller) → off; shorter with nothing focused → off; a 100 px shrink → off.
 *   (1b) the tallest height PER width: a split screen (same width, shorter, nothing focused) → then a focus → off, and
 *       the keyboard in that window → on; a same-width shrink with a field focused but not tapped or focused within
 *       1.5 s → off; a rotation back to portrait with the keyboard up → on (portrait keeps its own tallest height); with
 *       the state on, a shrink later than 1.5 s (an emoji panel, an autofill strip) → stays on.
 *       Known limits (by design, not rows): a split screen entered with the state on keeps the compact header until the
 *       window grows; a first landscape seen with the keyboard already up, and a keyboard slower than 1.5 s, stay off
 *       (the base layout) until the keyboard closes once.
 *   (2) the CSS of the state: the step-2 photo and the progress bar are display none, the title 20 px with no top margin,
 *       the fields 52 px with an 8 px gap, the footer 4 px on top and 8 px + --safe-bottom under the button; without it
 *       the photo shows, the title is 28 px, the fields 58 px; step 1 never changes.
 *   (3) the pair reveal: with data-kb and the password focused, the body scrolls so that the CONFIRM field (and its 4 px
 *       ring) is inside the body too — not only the focused one; (3b) when the pair does not fit (a taller keyboard), the
 *       FOCUSED field is revealed (the confirm field is never the hidden one).
 *   (4) the Next key: enterkeyhint="next" on the password; Enter moves the focus to the confirm field; an Enter of a
 *       running composition (isComposing, or keyCode 229) does not.
 *   (5) iPhone, Windows WebView2 and Mac Catalyst UAs: the same shrink + focus never sets data-kb; on the two desktop UAs
 *       Enter on the password does not move the focus either (the desktop keeps its old keys); (5b) on iPhone the Enter
 *       move brings the confirm field into the body (the iOS reveal, scrollIntoView nearest on its box).
 * Deliberate breaks (#802): ① the toggle line in kbState removed → (1) (1b) (3) red; ② `hold` forced false → (1) red;
 *   ③ the window-change clause removed → (1b) split red; ④ `tallest.clear()` on a width change → (1b) rotation red;
 *   ⑤ the photo rule removed → (2) red; ⑥ the keydown listener removed → (4) red; ⑦ `e.keyCode !== 229` removed → (4)
 *   red; ⑧ the `resizeModel` guards dropped → (5) red; ⑨ `!was` removed from the window-change clause → (1b) red;
 *   ⑩ the fit check of the pair removed → (3b) red; ⑪ the iOS `revealFocused()` after the move removed → (5b) red. */
import { on1Kit, PHONE_UA } from '../pins-on1/kit.mjs';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const KB = 323;
export default async function (h) {
  const { ok, sleep } = h;
  const { boot, cascade } = on1Kit(h);

  /* boot the create view, a nickname, Continue → step 2; a writable innerWidth / innerHeight and a stubbed clock */
  const toStep2 = async (ua) => {
    const s = await boot({ ua, query: 'view=create' });
    const { d, W, typeIn } = s;
    let iw = 360, ih = 800, now = 1e6;
    Object.defineProperty(W, 'innerWidth', { configurable: true, get: () => iw });
    Object.defineProperty(W, 'innerHeight', { configurable: true, get: () => ih });
    W.Date.now = () => now;
    W.dispatchEvent(new W.Event('resize'));          // the tallest height of width 360 = 800
    const v = d.querySelector('[data-launch-view="create"]');
    typeIn(v.querySelector('.c-launch__step[data-step="1"] input'), 'Alex');
    v.querySelector('.c-launch__step[data-step="1"] .c-launch__footer button').click();
    await sleep(50);
    const [pw, rp] = [...v.querySelectorAll('.c-launch__step[data-step="2"] .c-lock__input')];
    const setH = async (x, w) => { ih = x; if (w) iw = w; W.dispatchEvent(new W.Event('resize')); await sleep(20); };
    const later = () => { now += 5000; };            // past the 1.5 s of "a field was just tapped or focused"
    return { s, d, W, v, pw, rp, setH, later, kb: () => s.shell.hasAttribute('data-kb') };
  };

  let t = null;
  try {
    /* ---- (1) the state on the Android UA ---- */
    t = await toStep2(PHONE_UA);
    {
      const { d, W, v, pw, rp, setH, later, kb } = t;
      const r = {};
      r.onStep2 = v.dataset.createStep === '2' && d.activeElement === pw;
      await setH(800); r.fullOff = !kb();
      await setH(800 - KB); r.shortOn = kb();
      t.s.typeIn(pw, 'correct horse 1'); t.s.typeIn(rp, 'correct horse 1');
      rp.focus(); await sleep(20); r.confirmOn = kb() && d.activeElement === rp;
      const cta = v.querySelector('.c-launch__step[data-step="2"] .c-launch__footer button');
      cta.focus(); await sleep(20); r.holdButton = kb() && d.activeElement === cta;
      const eye = v.querySelector('.c-launch__step[data-step="2"] .c-lock__reveal');
      eye.focus(); await sleep(20); r.holdEye = kb() && d.activeElement === eye;
      eye.blur(); await sleep(20); r.holdBody = kb() && d.activeElement === d.body;
      await setH(800); r.closedOff = !kb();
      pw.focus(); await sleep(20); r.focusTallOff = !kb();
      pw.blur(); later(); await setH(800 - KB); r.noFocusOff = !kb();
      await setH(800); pw.focus(); await setH(800 - 100); r.smallShrinkOff = !kb();
      await setH(800 - KB); r.again = kb();
      await setH(800);
      ok(Object.values(r).every(Boolean),
        'fixb5 protect (1): Android UA — data-kb on the shell root while a launch field is focused AND the viewport is ≥ 120 px shorter than the tallest seen (the keyboard); a focus move to the button, an eye or body HOLDS it while the viewport is short (a tap lands where it was aimed); off when the keyboard closes, with nothing focused, for a 100 px shrink — ' + JSON.stringify(r));

      /* ---- (1b) the tallest height per width ---- */
      const r1 = {};
      pw.blur(); later(); await setH(700);            // a split screen: same width, shorter, nothing focused
      pw.focus(); await sleep(20); r1.splitThenFocusOff = !kb();
      await setH(700 - KB); r1.splitKeyboardOn = kb();
      await setH(700); later(); await setH(500);      // the window shrinks again while the password keeps focus, no tap
      r1.splitFocusedOff = !kb();
      await setH(800); pw.blur(); later();
      await setH(360, 800); pw.focus(); await sleep(20);   // landscape
      later(); await setH(800 - KB, 360);              // back to portrait with the keyboard up
      r1.rotateBackOn = kb();
      later(); await setH(800 - KB - 60);              // with the state on, a later shrink (an emoji panel) keeps it
      r1.laterShrinkKeepsOn = kb();
      await setH(800);
      ok(Object.values(r1).every(Boolean),
        'fixb5 protect (1b): the tallest height is kept PER width — a split screen made with nothing focused is the new tallest (a focus there is off, the keyboard there is on); a same-width shrink with a field focused but not tapped or focused within 1.5 s is a window change (off); a rotation back to portrait with the keyboard up is on; with the state on a shrink more than 1.5 s after the focus (an emoji panel) keeps it on — ' + JSON.stringify(r1));

      /* ---- (2) the CSS of the state ---- */
      const q = (sel) => v.querySelector(sel);
      const photo2 = q('.c-launch__step[data-step="2"] .c-launch__photo');
      const title2 = q('.c-launch__step[data-step="2"] .c-launch__hero-title');
      const foot2 = q('.c-launch__step[data-step="2"] .c-launch__footer');
      const fields2 = q('.c-launch__step[data-step="2"] .c-launch__fields');
      const field2 = q('.c-launch__step[data-step="2"] .c-launch__field');
      const prog = q(':scope > .c-launch__progress');
      const photo1 = q('.c-launch__step[data-step="1"] .c-launch__photo');
      const title1 = q('.c-launch__step[data-step="1"] .c-launch__hero-title');
      const field1 = q('.c-launch__step[data-step="1"] .c-launch__field');
      const css = (el, p) => String(cascade(W, el, p, { width: 360, height: 640 - KB }));
      const had = t.s.shell.hasAttribute('data-kb');
      const read = () => ({ photo: css(photo2, 'display'), prog: css(prog, 'display'), title: css(title2, 'font-size'), titleTop: css(title2, 'margin-top'),
        gap: css(fields2, 'gap'), field: css(field2, 'min-height'), footTop: css(foot2, 'padding-top'), footBottom: css(foot2, 'padding-bottom'),
        photo1: css(photo1, 'display'), title1: css(title1, 'font-size'), field1: css(field1, 'min-height') });
      t.s.shell.setAttribute('data-kb', '');           // the CSS row reads the rules of the state, set by hand
      const on = read();
      t.s.shell.removeAttribute('data-kb');
      const off = read();
      t.s.shell.toggleAttribute('data-kb', had);
      const r2 = {
        photoHidden: on.photo === 'none', progHidden: on.prog === 'none', titleSmall: on.title === '20px', titleTop0: /^0(px)?$/.test(on.titleTop),
        gap8: /^(8px|var\(--spacing-8\))$/.test(on.gap), field52: on.field === '52px', footTop4: /^(4px|var\(--spacing-4\))$/.test(on.footTop),
        footKeepsNavBar: /safe-(area-inset-)?bottom/.test(on.footBottom) && /spacing-8|8px/.test(on.footBottom),
        step1Same: on.photo1 !== 'none' && on.title1 === '28px' && on.field1 === '58px',
        offPhoto: off.photo !== 'none', offProg: off.prog !== 'none', offTitle: off.title === '28px', offField: off.field === '58px',
      };
      ok(Object.values(r2).every(Boolean),
        'fixb5 protect (2): the CSS of the state (rules through the cascade, not boxes) — with data-kb the step-2 photo and the progress bar are hidden, the title 20 px with no top margin, the fields 52 px with an 8 px gap, the footer 4 px on top and 8 px + --safe-bottom (the nav-bar strip behind the keyboard) under the button; without it the photo shows, the title is 28 px, the fields 58 px; step 1 is never touched — ' + JSON.stringify({ r2, on, off }));

    /* ---- (3) the pair reveal on stubbed rects ---- */
      const body = v.querySelector('.c-launch__step[data-step="2"] .c-launch__body');
      const [f1, f2] = [...body.querySelectorAll('.c-launch__field')];
      const k = { st: 0 };
      Object.defineProperty(body, 'scrollTop', { configurable: true, get: () => k.st, set: (x) => { k.st = x; } });
      body.getBoundingClientRect = () => ({ top: 100, bottom: 300, left: 0, right: 360, width: 360, height: 200 });
      f1.getBoundingClientRect = () => ({ top: 250 - k.st, bottom: 308 - k.st, left: 24, right: 336, width: 312, height: 58 });
      f2.getBoundingClientRect = () => ({ top: 320 - k.st, bottom: 378 - k.st, left: 24, right: 336, width: 312, height: 58 });
      pw.blur(); pw.focus(); await setH(800 - KB);   // a fresh focus: the keyboard opens right after it
      /* the pair 250–378 grown by the 4 px ring = 246–382 vs the body 100–300 → up by 82 (the password alone: 12) */
      const r3 = { kb: kb(), st: k.st, confirmInside: f2.getBoundingClientRect().bottom + 4 <= 300, pwInside: f1.getBoundingClientRect().top - 4 >= 100 };
      ok(r3.kb && r3.st === 82 && r3.confirmInside && r3.pwInside,
        'fixb5 protect (3): with data-kb and the password focused the body scrolls by the PAIR (both fields and their rings inside the body: +82, the password alone would be +12) — ' + JSON.stringify(r3));
      /* (3b) a taller keyboard: the body 100–200 is shorter than the pair + rings (136) → the FOCUSED confirm field alone is
         revealed (its box 316–382 with the ring → up by 182); the pair rule would stop at the password (+146, confirm hidden) */
      body.getBoundingClientRect = () => ({ top: 100, bottom: 200, left: 0, right: 360, width: 360, height: 100 });
      k.st = 0; rp.focus(); await sleep(20); W.dispatchEvent(new W.Event('resize')); await sleep(20);
      const r3b = { kb: kb(), active: d.activeElement === rp, st: k.st, confirmInside: f2.getBoundingClientRect().top - 4 >= 100 && f2.getBoundingClientRect().bottom + 4 <= 200 };
      ok(r3b.kb && r3b.active && r3b.st === 182 && r3b.confirmInside,
        'fixb5 protect (3b): when the pair does not fit the body (a taller keyboard), the focused confirm field is revealed, not the pair top — ' + JSON.stringify(r3b));
    }

    /* ---- (4) the Next key ---- */
    {
      const { d, W, pw, rp } = t;
      pw.focus();
      const hint = pw.getAttribute('enterkeyhint');
      pw.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));
      const ime229 = new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(ime229, 'keyCode', { get: () => 229 });
      pw.dispatchEvent(ime229);
      const stayed = d.activeElement === pw;
      const ev = new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      pw.dispatchEvent(ev);
      const r4 = { hint, stayedWhileComposing: stayed, moved: d.activeElement === rp, prevented: ev.defaultPrevented };
      ok(r4.hint === 'next' && r4.stayedWhileComposing && r4.moved && r4.prevented,
        'fixb5 protect (4): the password carries enterkeyhint="next" and its Enter moves the focus to the confirm field (the hardware / iOS path; the Gboard Next is Chromium\'s own); an Enter while composing (isComposing or keyCode 229) does not — ' + JSON.stringify(r4));
      ok(t.s.errs.length === 0, 'fixb5 protect: no page error (Android UA) — ' + JSON.stringify(t.s.errs.slice(0, 3)));
    }
    t.s.close(); t = null;

    /* ---- (5) other platforms: nothing changes ---- */
    for (const [label, ua] of [['iPhone', IPHONE_UA], ['Windows WebView2', WIN_UA], ['Mac Catalyst', MAC_UA]]) {
      t = await toStep2(ua);
      const { pw, rp, setH, kb } = t;
      pw.focus(); await setH(800 - KB);
      const a = kb();
      rp.focus(); await sleep(20);
      const b = kb();
      let keys = true;
      if (label === 'iPhone') {
        /* (5b) the Enter move on iOS brings the confirm field into the body (the iOS reveal: scrollIntoView nearest on its box) */
        const pane = t.v.querySelector('.c-launch__step[data-step="2"]');
        const body = pane.querySelector('.c-launch__body');
        const f2 = pane.querySelectorAll('.c-launch__field')[1];
        const calls = [];
        t.W.Element.prototype.scrollIntoView = function (o) { calls.push([this === f2, JSON.stringify(o)]); };
        body.getBoundingClientRect = () => ({ top: 64, bottom: 315, left: 0, right: 375, width: 375, height: 251 });
        f2.getBoundingClientRect = () => ({ top: 337, bottom: 395, left: 24, right: 351, width: 327, height: 58 });
        pw.focus();
        pw.dispatchEvent(new t.W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        const r5b = { moved: t.d.activeElement === rp, calls };
        ok(r5b.moved && calls.length === 1 && calls[0][0] && calls[0][1] === '{"block":"nearest"}',
          'fixb5 protect (5b): iPhone UA — Enter on the password moves to the confirm field and brings it into the body (scrollIntoView nearest on its field box, once) — ' + JSON.stringify(r5b));
      }
      if (label !== 'iPhone') {
        pw.focus();
        pw.dispatchEvent(new t.W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        keys = t.d.activeElement === pw && !pw.hasAttribute('enterkeyhint');
      }
      ok(!a && !b && keys && t.s.errs.length === 0,
        'fixb5 protect (5): ' + label + ' UA — the same 323 px shrink with a password field focused never sets data-kb (the layout stays as before)' + (label !== 'iPhone' ? '; Enter on the password keeps the focus and no enterkeyhint is set (desktop keys unchanged)' : '') + ' — ' + JSON.stringify({ a, b, keys, errs: t.s.errs.slice(0, 2) }));
      t.s.close(); t = null;
    }
  } catch (e) {
    ok(false, 'fixb5 protect threw: ' + (e && e.stack || e));
  } finally { if (t) t.s.close(); }
}
