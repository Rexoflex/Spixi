/* ==== ON-1 B (#1420 · #1421 (1)(2)) — ONE create commit, consent ONCE at the welcome tap, the honest line ====
 * On the BUILT intro.html (jsdom, phone UA), C# arms consent with the showTerms push:
 *   (1) `ixian:accept` is sent ONCE, at the welcome "Create new account" tap (before any create verb) — a later
 *       Restore tap, a re-entry and the create commit itself add none.
 *   (2) the create commit is ONE `ixian:create:<nick>:<password>` carrying the step-1 nickname and the step-2
 *       password (a double tap = one verb); the photo is NOT in it — the photo tap sends `ixian:avatar` and C#'s
 *       loadAvatar push paints it on step 1 AND step 2.
 *   (3) creating: the button shows the spinner + "Creating your account…" at once; the honest line ("Making your
 *       keys on this phone…") is hidden before 2 s and shown after 2 s; NO stage list ever (no list element and no
 *       stage / step-list node in the create or restore view while busy, and no setup screen).
 *   (0) ★ #46 r1: the welcome legal line (under the buttons) + both links open the legal sheets; ★ r2 (m3): both
 *       welcome buttons carry aria-describedby = the line's (unique) id.
 *   ★ #46 r1: the consent latch is ONE path — the component's emitAccept, armed by C#'s showTerms through
 *   setLaunchTerms and sent by launch.html's onAcceptTerms (the shell's recordConsent twin is gone).
 * Deliberate breaks (S20 T #46 r1 report): ① emitAccept removed from the welcome Create tap → (1)
 *   fails (acceptAtTap false); ② the honest timer at 0 ms → (3) "hidden before 2 s" fails; ③ launch.html sending the
 *   create verb twice → (2) fails; ④ the welcome legal line not appended → (0) fails; ⑤ the password trimmed
 *   (`pw.input.value.trim()` in submit) → (2) fails; ⑥ (#46 r2) aria-describedby not set on the Restore button →
 *   (0) describedBy fails. */
import { on1Kit } from './kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = on1Kit(h);
  let s = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, push, typeIn } = s;
    push('showTerms');
    await sleep(50);
    const [goCreate, goRestore] = [...d.querySelectorAll('.c-launch__ctas .c-button')];
    /* (0) ★ #46 r1: the legal line sits on WELCOME, under the buttons whose tap records consent; both links open
       the in-app legal sheets; opening them records nothing */
    const legal = d.querySelector('.c-launch__welcome .c-launch__legal');
    const links = legal ? [...legal.querySelectorAll('button.c-launch__link')] : [];
    const r0 = {
      line: !!legal && legal.textContent === 'By continuing, you agree to the Terms of Use and Privacy Policy.',
      underButtons: !!legal && !!(d.querySelector('.c-launch__ctas').compareDocumentPosition(legal) & s.W.Node.DOCUMENT_POSITION_FOLLOWING),
      twoLinks: links.length === 2 && links[0].textContent === 'Terms of Use' && links[1].textContent === 'Privacy Policy',
    };
    const sheetFor = async (b) => { b.click(); await sleep(60); const body = d.querySelector('.c-launch__terms-body'); const t = body ? body.textContent : ''; s.W.Spixi.dismissTopOverlay(); await sleep(450); return t; };
    if (links.length === 2) {
      const tTerms = await sheetFor(links[0]);
      const tPriv = await sheetFor(links[1]);
      r0.termsSheet = /This document is provided in English only\./.test(tTerms) && /Agreement/.test(tTerms);
      r0.privacySheet = /This document is provided in English only\./.test(tPriv) && tPriv !== tTerms;
    }
    r0.noAcceptYet = !s.sent.includes('ixian:accept');
    /* ★ #46 r2 (m3): the consent text is announced with the two buttons that record it */
    r0.describedBy = !!legal && !!legal.id && [goCreate, goRestore].every((b) => (b.getAttribute('aria-describedby') || '').split(/\s+/).includes(legal.id)) && d.querySelectorAll('#' + legal.id).length === 1;
    ok(Object.values(r0).every(Boolean),
      '★ ON-1 B (#46 r1, Damir: the legal line stays where the tap records it): welcome shows "By continuing, you agree to the Terms of Use and Privacy Policy." under the two buttons; both links open the in-app legal sheets; reading them records nothing — ' + JSON.stringify(r0));
    const n0 = s.sent.length;
    goCreate.click();
    await sleep(50);
    const afterTap = s.sent.slice(n0);
    await sleep(600);
    const v = d.querySelector('[data-launch-view="create"]');
    /* the photo: ixian:avatar, then C#'s loadAvatar paints both steps */
    const photo = v.querySelector('.c-launch__photo:not([data-size])');
    const nA = s.sent.length;
    photo.click();
    await sleep(30);
    const avatarVerb = s.sent.slice(nA);
    const PIC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    push('loadAvatar', PIC);
    await sleep(30);
    const photoOn = [...v.querySelectorAll('.c-launch__photo img')].filter((i) => i.getAttribute('src') === PIC).length === 2;

    typeIn(v.querySelector('input[data-field="nick"]'), 'Ana');
    v.querySelector('[data-step="1"] .c-launch__footer .c-button').click();
    await sleep(30);
    const [pw, rp] = [...v.querySelectorAll('.c-lock__input')];
    typeIn(pw, '  correct horse battery  '); typeIn(rp, '  correct horse battery  ');   // spaces around: a password is never trimmed
    const cta = v.querySelector('[data-step="2"] .c-launch__footer .c-button');
    const honest = v.querySelector('.c-launch__honest');
    const n1 = s.sent.length;
    cta.click(); cta.click();
    await sleep(60);
    const commits = s.sent.slice(n1);
    const label = (cta.querySelector('.c-button__label') || {}).textContent;
    const busy = !!cta.querySelector('.c-button__spinner') && cta.getAttribute('aria-busy') === 'true';
    const noStages = (root) => !root.querySelector('ul, ol, [class*="stage"], [class*="setup"]');
    const r3 = { busy, label: label === 'Creating your account…', honestHiddenEarly: honest.hidden, noStagesCreate: noStages(v) };
    await sleep(1500);
    r3.honestHiddenAt1_6s = honest.hidden;
    await sleep(700);
    r3.honestShownAfter2s = !honest.hidden && /Making your keys on this phone/.test(honest.textContent);
    r3.stillNoStages = noStages(v) && d.querySelectorAll('.c-launch__view').length === 3;

    const r1 = {
      acceptAtTap: JSON.stringify(afterTap.filter((c) => c === 'ixian:accept')) === '["ixian:accept"]' && afterTap.indexOf('ixian:accept') < afterTap.indexOf('ixian:view:create'),
      onceOverall: s.sent.filter((c) => c === 'ixian:accept').length === 1,
      noneAtCommit: commits.every((c) => c !== 'ixian:accept'),
    };
    /* a later Restore tap adds no second accept (a fresh boot keeps the create commit above clean) */
    push('removeLoadingOverlay'); await sleep(30);
    push('setLaunchView', 'welcome'); await sleep(30);
    push('setLaunchView', 'welcome'); await sleep(600);
    goRestore.click(); await sleep(600);
    r1.restoreTapNoSecond = s.sent.filter((c) => c === 'ixian:accept').length === 1;
    const rv = d.querySelector('[data-launch-view="restore"]');
    push('setUploadedFileName', 'C:\\x\\spixi-backup.ixi'); await sleep(30);
    typeIn(rv.querySelector('.c-lock__input'), 'whatever1');
    rv.querySelector('.c-launch__footer .c-button').click(); await sleep(30);
    r3.noStagesRestore = noStages(rv) && !!rv.querySelector('.c-launch__footer .c-button__spinner');

    ok(Object.values(r1).every(Boolean),
      '★ ON-1 B (#1421 (1)): ixian:accept is sent ONCE, at the welcome Create tap (before the view report) — none at the create commit, none on a later Restore tap — ' + JSON.stringify({ r1, afterTap }));
    ok(JSON.stringify(commits.filter((c) => /^ixian:create:/.test(c))) === '["ixian:create:Ana:  correct horse battery  "]'
       && JSON.stringify(avatarVerb) === '["ixian:avatar"]' && photoOn,
      '★ ON-1 B (#1420): ONE create commit carries the step-1 nickname + the step-2 password UNCHANGED (leading / trailing spaces kept — never trimmed; a double tap = one verb); the photo is not in it — the photo tap sends ixian:avatar and C#\'s loadAvatar paints step 1 AND step 2 — ' + JSON.stringify({ commits, avatarVerb, photoOn }));
    ok(Object.values(r3).every(Boolean),
      '★ ON-1 B (#1421 (2)): creating = the solid button with the spinner + "Creating your account…" at once; the honest line stays hidden before 2 s and shows after 2 s; NO stage list and no setup screen, on create or restore — ' + JSON.stringify(r3));
    ok(s.errs.length === 0, '★ ON-1 B: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
  } catch (e) {
    ok(false, '★ ON-1 B b-commit threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
