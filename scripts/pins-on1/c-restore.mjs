/* ==== ON-1 C (#1420 · #1422 + the ON-1 restore bug fix) — RESTORE: the file stays, the password error is C#'s alone ====
 * On the BUILT intro.html (jsdom, phone UA), restore driven through the real C# pushes:
 *   (1) a WRONG PASSWORD (C#: showPasswordError, then removeLoadingOverlay — the legacy pair): the field turns red
 *       (data-error), the line "That password didn't open the backup." shows, the form re-enables, the typed password
 *       is kept for a retry, and the CHOSEN FILE STAYS (the card keeps data-file-set + the name).
 *   (2) ANY OTHER FAILURE (C#: removeLoadingOverlay ALONE, under its own native alert): the form re-enables
 *       SILENTLY — no password error, no red field. (The bug: the shell painted "didn't open the backup" under an
 *       alert that said something else.)
 *   (3) "Wallet password" appears NOWHERE in restore — not in its text, its labels or its aria-labels; the field
 *       says "Password", the same word as on create.
 * Deliberate breaks (S20 T report): ① the restore fail handler showing the error for an empty reason → (2) fails;
 *   ② the label back to strings.walletPassword → (3) fails; ③ a fail handler that clears st.fileName → (1) fails; ④ (#46 r1) the submit's setWrong(false) removed → (2)
 *   clearedOnSubmit / sameRetrySilent fail. */
import { on1Kit } from './kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, push, typeIn } = s;
    push('setLaunchView', 'restore');
    await sleep(600);
    const v = d.querySelector('[data-launch-view="restore"]');
    const card = v.querySelector('.c-launch__filecard');
    const field = v.querySelector('.c-launch__field');
    const pw = v.querySelector('.c-lock__input');
    const cta = v.querySelector('.c-launch__footer .c-button');
    const err = v.querySelector('.c-lock__error');
    const n0 = s.sent.length;
    card.click();
    await sleep(30);
    const selectVerb = s.sent.slice(n0);
    push('setUploadedFileName', 'C:\\Users\\ana\\AppData\\Local\\Temp\\spixi-backup-2026-10-03.ixi');
    await sleep(30);
    const fileShown = () => card.hasAttribute('data-file-set') && card.querySelector('.c-launch__filecard-title').textContent === 'spixi-backup-2026-10-03.ixi';
    typeIn(pw, 'not the password');

    /* (1) wrong password */
    const n1 = s.sent.length;
    cta.click();
    await sleep(30);
    const verb = s.sent.slice(n1);
    const busy = cta.disabled && !!cta.querySelector('.c-button__spinner') && (cta.querySelector('.c-button__label') || {}).textContent === 'Restoring…';
    push('showPasswordError');
    push('removeLoadingOverlay');
    await sleep(30);
    const r1 = {
      selectVerb: JSON.stringify(selectVerb) === '["ixian:selectfile"]',
      verb: JSON.stringify(verb) === '["ixian:restore:not the password"]',
      busy,
      red: field.hasAttribute('data-error'),
      line: !err.hidden && err.textContent === 'That password didn’t open the backup.',
      reEnabled: !pw.disabled && !cta.disabled && pw.value === 'not the password',
      fileStays: fileShown(),
    };
    ok(Object.values(r1).every(Boolean),
      '★ ON-1 C (#1420): a WRONG password (showPasswordError + removeLoadingOverlay) = the red field + "That password didn’t open the backup.", the form back on with the password kept, and the CHOSEN FILE STAYS — ' + JSON.stringify(r1));

    /* (2) any other failure: removeLoadingOverlay alone — ★ #46 r1: first a retry with the SAME password (no
       typing in between), so a stale wrong-password line would survive if the submit did not clear it */
    const r2 = {};
    cta.click();
    await sleep(30);
    r2.clearedOnSubmit = !field.hasAttribute('data-error') && err.hidden;
    push('removeLoadingOverlay');
    await sleep(30);
    r2.sameRetrySilent = err.hidden && !field.hasAttribute('data-error');
    typeIn(pw, 'another try 1');
    r2.cleared = !field.hasAttribute('data-error') && err.hidden;
    cta.click();
    await sleep(30);
    push('removeLoadingOverlay');
    await sleep(30);
    r2.silent = err.hidden && !field.hasAttribute('data-error');
    r2.reEnabled = !pw.disabled && !cta.disabled && !cta.querySelector('.c-button__spinner') && (cta.querySelector('.c-button__label') || {}).textContent === 'Restore account';
    r2.fileStays = fileShown();
    ok(Object.values(r2).every(Boolean),
      '★ ON-1 C (bug fix): a NON-password failure (removeLoadingOverlay alone, under C#\'s own alert) re-enables the form SILENTLY — no "didn’t open the backup" line, no red field; the file stays — ' + JSON.stringify(r2));

    /* (3) no "Wallet password" anywhere in restore */
    const aria = [...v.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' | ');
    const labels = [...v.querySelectorAll('.c-launch__field-label')].map((e) => e.textContent);
    ok(!/wallet password/i.test(v.textContent) && !/wallet password/i.test(aria) && JSON.stringify(labels) === '["Password"]' && pw.getAttribute('aria-label') === 'Password',
      '★ ON-1 C (Decision 3): "Wallet password" appears nowhere in restore (text, labels, aria-labels) — the field says "Password" — ' + JSON.stringify({ labels, aria }));
    ok(s.errs.length === 0, '★ ON-1 C: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ ON-1 C c-restore threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
