/* ==== ON-1 A (#1420 · #1421 · #1422) — CREATE IN TWO STEPS: Continue, and BACK FROM STEP 2 ====
 * On the BUILT intro.html (jsdom, phone UA):
 *   (1) Continue is OFF with no nickname (empty or spaces only), ON with one; Enter on the nickname runs it only
 *       while it is on; a ':' in the nickname answers inline and stays on step 1 (the C# split hazard).
 *   (2) Back from step 2 lands on step 1 with EVERY value kept (nickname + both passwords) — by all three routes:
 *       the topbar arrow, launchShellBack (the iOS swipe), and the C#-driven setLaunchView('welcome') push
 *       (Android hardware back: C# switchView sets its view to welcome) — and the C# route RE-REPORTS
 *       `ixian:view:create` so C#'s view is create again (no C# change, #1421/#1422). A second back from step 1
 *       goes to welcome as before and scrubs the passwords (SECURITY §5).
 *   (3) ★ #46 r1: step 1 → welcome scrubs via the arrow and the swipe too.
 *   (4) ★ #46 r1: no submit on an IME Enter; back held while the account is being made.
 *   (5) ★ #46 r2: the hold is step 2 only (busy → retry → welcome → Create → step 1 → the arrow leaves).
 * Deliberate breaks (S20 T report): ① `next.disabled = !name || inFlight` → `= inFlight` → (1) fails;
 *   ② setLaunchView without the createStepBack line → the C#-route clause fails (view = welcome);
 *   ③ createStepBack without the onViewChange re-report → the `ixian:view:create` clause fails;
 *   ④ goStep scrubbing the passwords → the "values kept" clauses fail;
 *   ⑤ the topbar Back handler without scrub() → (3) arrowScrubs fails; ⑥ launchShellBack without its scrub loop →
 *   (3) swipeScrubs fails; ⑦ imeBusy() always false → (4) ime clauses fail; ⑧ the createBusy hold removed from the
 *   topbar handler → (4) heldOnStep2 fails; ⑨ (#46 r2) the hold without `&& st.createStep === 2` → (5) arrowLeaves fails. */
import { on1Kit } from './kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W, push, typeIn } = s;
    s.push('setLaunchView', 'create');
    await sleep(600);
    const v = d.querySelector('[data-launch-view="create"]');
    const nick = v.querySelector('input[data-field="nick"]');
    const [pw, rp] = [...v.querySelectorAll('.c-lock__input')];
    const p1 = v.querySelector('.c-launch__step[data-step="1"]');
    const p2 = v.querySelector('.c-launch__step[data-step="2"]');
    const next = p1.querySelector('.c-launch__footer .c-button');
    const back = v.querySelector('.c-topbar .c-button');
    const onStep = () => (!p1.hidden && p2.hidden ? 1 : p1.hidden && !p2.hidden ? 2 : 0);

    /* (1) Continue */
    const r1 = {};
    r1.emptyOff = next.disabled;
    next.click(); r1.emptyStays = onStep() === 1;
    typeIn(nick, '   '); r1.spacesOff = next.disabled;
    nick.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); r1.enterOffStays = onStep() === 1;
    typeIn(nick, 'An:a'); next.click();
    const e1 = p1.querySelector('.c-lock__error');
    r1.colonInline = onStep() === 1 && !e1.hidden && e1.textContent.includes(':');
    typeIn(nick, 'Ana'); r1.on = !next.disabled;
    nick.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(30);
    r1.enterGoes = onStep() === 2;
    ok(Object.values(r1).every(Boolean),
      '★ ON-1 A (#1420): Continue is OFF with no nickname (empty or spaces), ON with one; Enter runs it only while it is on; a ":" answers inline on step 1 — ' + JSON.stringify(r1));

    /* (2) back from step 2, three routes */
    typeIn(pw, 'correct horse battery'); typeIn(rp, 'correct horse battery');
    const kept = () => nick.value === 'Ana' && pw.value === 'correct horse battery' && rp.value === 'correct horse battery';
    const r2 = {};
    back.click(); await sleep(30);
    r2.arrowStep1 = s.shell.dataset.view === 'create' && onStep() === 1 && kept();
    next.click(); await sleep(30);
    r2.forwardAgain = onStep() === 2 && kept();
    W.Spixi.launchShellBack(s.shell); await sleep(30);
    r2.swipeStep1 = s.shell.dataset.view === 'create' && onStep() === 1 && kept();
    next.click(); await sleep(30);
    const n0 = s.sent.length;
    push('setLaunchView', 'welcome'); await sleep(50);
    r2.csharpStep1 = s.shell.dataset.view === 'create' && onStep() === 1 && kept();
    r2.reReport = JSON.stringify(s.sent.slice(n0)) === '["ixian:view:create"]';
    /* from step 1 the next back leaves to welcome as before, and scrubs the passwords */
    push('setLaunchView', 'welcome'); await sleep(600);
    r2.step1ToWelcome = s.shell.dataset.view === 'welcome' && pw.value === '' && rp.value === '' && nick.value === 'Ana';
    ok(Object.values(r2).every(Boolean),
      '★ ON-1 A (#1421/#1422): back from step 2 lands on step 1 with every value kept — the arrow, the iOS swipe (launchShellBack) and the C# hardware-back push (setLaunchView welcome), which re-reports ixian:view:create so C# stays on create; from step 1 back goes to welcome and scrubs the passwords — ' + JSON.stringify(r2));
    /* (3) ★ #46 r1 (auditor C): step 1 → welcome SCRUBS the passwords by the ARROW and by the SWIPE too (the C#
       route above is a third, separate code path) */
    const welcomeCreate = () => d.querySelectorAll('.c-launch__ctas .c-button')[0];
    const toStep2With = async () => {
      welcomeCreate().click(); await sleep(600);
      next.click(); await sleep(30);
      typeIn(pw, 'correct horse battery'); typeIn(rp, 'correct horse battery');
      back.click(); await sleep(30);                       // step 2 → step 1, values kept
      return onStep() === 1 && kept();
    };
    const r3 = {};
    r3.arrowSetup = await toStep2With();
    back.click(); await sleep(600);
    r3.arrowScrubs = s.shell.dataset.view === 'welcome' && pw.value === '' && rp.value === '';
    r3.swipeSetup = await toStep2With();
    W.Spixi.launchShellBack(s.shell); await sleep(600);
    r3.swipeScrubs = s.shell.dataset.view === 'welcome' && pw.value === '' && rp.value === '';
    ok(Object.values(r3).every(Boolean),
      '★ ON-1 A (#46 r1): from step 1, the topbar arrow AND the iOS swipe (launchShellBack) leave to welcome and SCRUB both passwords (SECURITY §5) — ' + JSON.stringify(r3));

    /* (4) ★ #46 r1: an Enter that closes an IME composition is not a submit; back is HELD while the account is being
       made (the user stays on step 2 with the spinner — a later fail(msg) lands on the step on screen) */
    welcomeCreate().click(); await sleep(600);
    const r4 = {};
    typeIn(nick, 'Ana');
    nick.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    const k229 = new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }); Object.defineProperty(k229, 'keyCode', { value: 229 });
    nick.dispatchEvent(k229); await sleep(20);
    r4.imeNoContinue = onStep() === 1;
    next.click(); await sleep(30);
    typeIn(pw, 'correct horse battery'); typeIn(rp, 'correct horse battery');
    const n1 = s.sent.length;
    rp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })); await sleep(20);
    r4.imeNoCreate = !s.sent.slice(n1).some((c) => /^ixian:create:/.test(c));
    rp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(20);
    r4.enterCreates = s.sent.slice(n1).filter((c) => /^ixian:create:/.test(c)).length === 1;
    back.click(); await sleep(30);
    W.Spixi.launchShellBack(s.shell); await sleep(30);
    const n2 = s.sent.length;
    push('setLaunchView', 'welcome'); await sleep(50);
    r4.heldOnStep2 = s.shell.dataset.view === 'create' && onStep() === 2 && !!v.querySelector('[data-step="2"] .c-button__spinner');
    r4.csharpReReport = JSON.stringify(s.sent.slice(n2)) === '["ixian:view:create"]';
    push('removeLoadingOverlay'); await sleep(30);
    back.click(); await sleep(30);
    r4.backAfterFail = onStep() === 1;
    ok(Object.values(r4).every(Boolean),
      '★ ON-1 A (#46 r1): Enter during an IME composition (isComposing / keyCode 229) neither continues nor creates; while the account is being made every back (arrow, swipe, C# push) keeps step 2 with the spinner and C# hears create again; after the failure back works — ' + JSON.stringify(r4));
    /* (5) ★ #46 r2 (n2): the hold is for STEP 2 only — the reviewer's path: busy on step 2 → C# moves to retry (the
       lockout) → welcome → Create again lands on step 1, and the arrow there must leave to welcome */
    const r5 = {};
    next.click(); await sleep(30);
    typeIn(pw, 'correct horse battery'); typeIn(rp, 'correct horse battery');
    v.querySelector('[data-step="2"] .c-launch__footer .c-button').click(); await sleep(30);
    r5.busy = !!v.querySelector('[data-step="2"] .c-button__spinner');
    push('setLaunchView', 'retry'); await sleep(600);
    push('setLaunchView', 'welcome'); await sleep(600);
    welcomeCreate().click(); await sleep(600);
    r5.reenteredStep1 = s.shell.dataset.view === 'create' && onStep() === 1;
    back.click(); await sleep(600);
    r5.arrowLeaves = s.shell.dataset.view === 'welcome';
    ok(Object.values(r5).every(Boolean),
      '★ ON-1 A (#46 r2): the in-flight back hold covers STEP 2 only — after busy → retry → welcome → Create, the arrow on step 1 leaves to welcome — ' + JSON.stringify(r5));
    ok(s.errs.length === 0, '★ ON-1 A: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ ON-1 A a-steps threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
