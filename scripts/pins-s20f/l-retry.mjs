/* ==== S20F W-8 (#1426) — RETRY on the restore form frame, its behaviour kept ====
 * On the BUILT intro.html (jsdom; ?view=retry = C#'s cold-unlock boot carrier):
 *   (1) the frame: the view is .c-launch__view.c-launch__form (no data-progress), the topbar heading "Unlock your
 *       wallet", the hero = the restore art (its OWN illoRestore build, not restore's node) + "Welcome back"
 *       (restoreHeroTitle) + retryCopy, ONE launch field labelled "Wallet password", the "Unlock" CTA in the footer
 *       right after the body — and the body does not grow on the phone (flex-grow 0: the CTA sits under the field),
 *       on a ≥ 900 px desktop the footer is grid row 5 under the fields (row 4); the W15 640 px cap is gone.
 *   (2) the behaviour kept: the password is sent NOT trimmed, once (a second submit while in flight — Enter on the field — sends nothing); C#'s
 *       removeLoadingOverlay = the silent restore (no error line, no red field, the value kept, the field focused);
 *       an empty password = the inline "Enter your wallet password." and no verb.
 *   (3) the ctrl: fail(msg) = the inline line with that text + the red field; done() = setSuccess "Unlocked" + scrub.
 *   (4) back scrubs (value gone, re-masked, the label back down: data-empty) and reports welcome (ixian:view:welcome)
 *       + opts.onBack('retry'); ★ #46 r1: window pagehide clears the retry password (its scrub is in st.scrubs);
 *       done() leaves data-empty; the empty-password answer leaves no data-error.
 * Deliberate breaks (S20F report): ① buildRetry back to `c-launch__view` alone → (1) fails; ② `const p =
 *   pw.input.value.trim()` → (2) notTrimmed fails; ③ the inFlight guard removed → (2) once fails; ④ the back handler
 *   without scrub() → (4) fails; ⑤ the retry body rule removed from launch-form.css → (1) bodyNoGrow fails;
 *   ⑥ (r1) the scrub without pwF.sync() → (3) done / (4) scrubbed + pagehide fail; ⑦ (r1) the empty answer red
 *   (setError(…, true)) → (2) empty fails; ⑧ (r1) `st.scrubs.push(scrub)` deleted in buildRetry → (4) pagehide fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join } = h;
  const { boot, cascade } = on1Kit(h);
  const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  let s = null, k = null;
  try {
    s = await boot({ ua: 'phone', query: 'view=retry' });
    const { d, W, push, typeIn } = s;
    const v = d.querySelector('[data-launch-view="retry"]');
    const rv = d.querySelector('[data-launch-view="restore"]');
    const body = v.querySelector(':scope > .c-launch__body');
    const footer = v.querySelector(':scope > .c-launch__footer');
    const cta = footer && footer.querySelector('.c-button');
    const art = v.querySelector('.c-launch__hero > svg.c-launch__hero-illo');
    const pw = v.querySelector('.c-lock__input');
    const err = v.querySelector('.c-launch__ferr');
    const field = v.querySelector('.c-launch__field');
    const r1 = {
      onScreen: s.shell.dataset.view === 'retry' && !v.hidden,
      frame: v.classList.contains('c-launch__view') && v.classList.contains('c-launch__form') && !v.hasAttribute('data-progress'),
      heading: (v.querySelector('.c-topbar .c-launch__head-title') || {}).textContent === 'Unlock your wallet',
      art: !!art && art.getAttribute('data-illo') === 'restore' && art !== rv.querySelector('.c-launch__hero-illo'),
      hero: (v.querySelector('.c-launch__hero-title') || {}).textContent === en.restoreHeroTitle && en.restoreHeroTitle === 'Welcome back'
        && (v.querySelector('.c-launch__hero-copy') || {}).textContent === en.retryCopy,
      field: v.querySelectorAll('.c-launch__field').length === 1 && (v.querySelector('.c-launch__field-label') || {}).textContent === 'Wallet password' && !!field && field.contains(pw),
      cta: !!cta && cta.textContent.includes('Unlock') && !!body && body.nextElementSibling === footer,
      bodyNoGrow: cascade(W, body, 'flex-grow', { width: 390 }) === '0',
    };
    /* desktop: the grid rows + no W15 cap */
    k = await boot({ ua: 'desktop', query: 'view=retry' });
    const kv = k.d.querySelector('[data-launch-view="retry"]');
    r1.deskRows = cascade(k.W, kv.querySelector('.c-launch__fields'), 'grid-row', { width: 1280 }) === '4' && cascade(k.W, kv.querySelector(':scope > .c-launch__footer'), 'grid-row', { width: 1280 }) === '5';
    r1.noW15 = cascade(k.W, kv.querySelector('.c-launch__fields'), 'max-width', { width: 800 }) !== '640px' && cascade(k.W, kv.querySelector(':scope > .c-launch__footer'), 'max-width', { width: 800 }) !== '640px';
    k.close(); k = null;
    ok(Object.values(r1).every(Boolean),
      '★ S20F W-8 (#1426): retry rides the restore form frame — the form class, "Unlock your wallet", its own restore art + "Welcome back" + retryCopy, one "Wallet password" field, "Unlock" right under it (the body does not grow on the phone; grid rows 4 / 5 on desktop), no W15 cap — ' + JSON.stringify(r1));

    /* (2) the behaviour */
    const n0 = s.sent.length;
    typeIn(pw, '  two words  ');
    cta.click();
    pw.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));   // a second submit while in flight (the disabled button cannot carry one)
    await sleep(20);
    const verbs = s.sent.slice(n0).filter((c) => /^ixian:proceed:/.test(c));
    const r2 = { notTrimmed: verbs[0] === 'ixian:proceed:  two words  ', once: verbs.length === 1, busy: pw.disabled && !!cta.querySelector('.c-button__spinner') };
    push('removeLoadingOverlay'); await sleep(20);
    r2.silent = err.hidden && !field.hasAttribute('data-error') && !pw.disabled && pw.value === '  two words  ' && d.activeElement === pw && !cta.querySelector('.c-button__spinner');
    typeIn(pw, '');
    const n1 = s.sent.length;
    cta.click(); await sleep(20);
    r2.empty = !err.hidden && err.textContent === 'Enter your wallet password.' && !s.sent.slice(n1).some((c) => /^ixian:proceed:/.test(c))
      && !field.hasAttribute('data-error');   // ★ #46 r1 (MINOR-2): the empty answer does not redden the field
    typeIn(pw, 'x');
    r2.clearedOnInput = err.hidden;
    ok(Object.values(r2).every(Boolean),
      '★ S20F W-8: the retry behaviour is kept — the password goes NOT trimmed, once per submit; removeLoadingOverlay = the silent restore (value kept, focus back, no red line); an empty password answers inline — ' + JSON.stringify({ r2, verbs }));

    /* (3) the ctrl, on a direct shell */
    const ctrls = [];
    let backs = [];
    const sh = W.Spixi.createLaunchShell({ view: 'retry', onRetry: (p, c) => ctrls.push([p, c]), onBack: (x) => backs.push(x) });
    d.body.append(sh);
    const sv = sh.querySelector('[data-launch-view="retry"]');
    const spw = sv.querySelector('.c-lock__input'), scta = sv.querySelector('.c-launch__footer .c-button');
    const serr = sv.querySelector('.c-launch__ferr'), sfield = sv.querySelector('.c-launch__field');
    typeIn(spw, 'bad pass'); scta.click(); await sleep(10);
    if (ctrls[0]) ctrls[0][1].fail('That did not unlock it.');
    const r3 = { inline: !serr.hidden && serr.textContent === 'That did not unlock it.' && sfield.hasAttribute('data-error') && spw.value === 'bad pass' };
    scta.click(); await sleep(10);
    if (ctrls[1]) ctrls[1][1].done();
    await sleep(20);
    r3.done = ctrls.length === 2 && /Unlocked/.test(scta.textContent) && spw.value === '' && sfield.hasAttribute('data-empty');   // ★ r1: the label drops back
    /* (4) back scrubs + reports */
    const sh2 = W.Spixi.createLaunchShell({ view: 'retry', onBack: (x) => backs.push(x) });
    d.body.append(sh2);
    const bpw = sh2.querySelector('[data-launch-view="retry"] .c-lock__input');
    typeIn(bpw, 'typed secret');
    sh2.querySelector('[data-launch-view="retry"] .c-lock__reveal').click();
    const revealed = bpw.type === 'text';
    sh2.querySelector('[data-launch-view="retry"] .c-topbar .c-button').click(); await sleep(10);
    const r4 = { scrubbed: revealed && bpw.value === '' && bpw.type === 'password' && bpw.closest('.c-launch__field').hasAttribute('data-empty'), welcome: sh2.dataset.view === 'welcome', onBack: backs.join() === 'retry' };
    sh.remove(); sh2.remove();
    const n2 = s.sent.length;
    typeIn(pw, 'left behind');
    v.querySelector('.c-topbar .c-button').click(); await sleep(20);
    r4.hostReport = s.sent.slice(n2).includes('ixian:view:welcome') && pw.value === '';
    /* ★ #46 r1 (MINOR-2, auditor C #12): the retry scrub is in st.scrubs — window pagehide clears the retry password */
    const sh3 = W.Spixi.createLaunchShell({ view: 'retry' });
    d.body.append(sh3);
    const ppw = sh3.querySelector('[data-launch-view="retry"] .c-lock__input');
    typeIn(ppw, 'typed then backgrounded');
    W.dispatchEvent(new W.Event('pagehide'));
    r4.pagehide = ppw.value === '' && ppw.closest('.c-launch__field').hasAttribute('data-empty');
    sh3.remove();
    ok(Object.values(r3).every(Boolean) && Object.values(r4).every(Boolean),
      '★ S20F W-8: fail(msg) paints that line inline with the red field, done() = "Unlocked" + scrub; Back scrubs (re-masked) and reports welcome + onBack(\'retry\') — ' + JSON.stringify({ r3, r4 }));
    ok(s.errs.length === 0, '★ S20F W-8: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ S20F W-8 l-retry threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (k) k.close(); }
}
