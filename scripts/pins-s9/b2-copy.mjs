/* ==== SESSION 9 (B2) — COPY: the Create screen (#1246 O = A, #1139) + A-10 "End-to-end encrypted" (#1245) ====
 * On the BUILT intro.html / settings.html (jsdom):
 *   · Create: NO "Wallet password" group label (the profile label stays), the two hint lines in order, the new
 *     callout title + body, and an empty password submits to "Choose a password." (no "wallet")
 *   · the same screen under ?lang=de-de paints the de-de DRAFTS of the new keys (the keys reach the dictionaries)
 *   · A-10: the welcome slide and the About text say "End-to-end encrypted" and never "on your device" for messages
 * Deliberate breaks: see the S9 B2 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const view = (d) => d.querySelector('[data-launch-view="create"]');
  const texts = (el, sel) => (el ? [...el.querySelectorAll(sel)].map((e) => e.textContent) : []);
  try {
    /* —— Create, English —— */
    let s = await boot('intro.html');
    s.push('setLaunchView', 'create');
    await sleep(250);
    let v = view(s.d);
    const labels = texts(v, '.c-launch__group-label');
    ok(!!v && labels.length === 1 && labels[0] === 'Your profile',
      '★ S9 #1246 O=A: the Create screen has no password group label — only "Your profile" — ' + JSON.stringify(labels));
    const hints = texts(v, '.c-launch__hint');
    ok(JSON.stringify(hints) === JSON.stringify(['Use at least 10 characters.', 'Use a long phrase that is easy for you to remember.']),
      '★ S9 #1246 O=A: the two hint lines, length first, then the phrase line — ' + JSON.stringify(hints));
    const cTitle = (v && v.querySelector('.c-launch__callout-title') || {}).textContent;
    const cBody = (v && v.querySelector('.c-launch__callout-body') || {}).textContent;
    ok(cTitle === 'Write this password down'
      && cBody === 'It protects your account and wallet on this device. Nobody can reset it, not even Spixi.',
    '★ S9 #1246 O=A: the callout says "Write this password down" + the reset line — ' + JSON.stringify([cTitle, cBody]));
    /* an empty password → the new error (nick filled so the nick check passes) */
    const nick = v && v.querySelector('input[data-field="nick"]');
    if (nick) { nick.value = 'Ana'; nick.dispatchEvent(new s.W.Event('input', { bubbles: true })); }
    const cta = v && [...v.querySelectorAll('.c-launch__footer button')].pop();
    if (cta) cta.click();
    await sleep(50);
    const errEl = v && v.querySelector('.c-launch__body [role="alert"]');
    const errText = errEl && !errEl.hidden ? errEl.textContent : '';
    ok(errText === 'Choose a password.', '★ S9 #1246: an empty password says "Choose a password." (no "wallet") — ' + JSON.stringify(errText));
    ok(s.sent.every((c) => !/^ixian:create:/.test(c)), '★ S9 #1246: the empty-password submit sends no create verb');
    /* A-10 on the welcome slides (same document) */
    const all = s.d.body.textContent;
    ok(/End-to-end encrypted and opened only by the person you sent to\./.test(all) && !/Encrypted on your device/i.test(all),
      '★ S9 A-10 (#1245): the welcome slide says "End-to-end encrypted …", never "Encrypted on your device"');
    s.dom.window.close();

    /* —— Create, de-de: the new keys come from the drafts —— */
    s = await boot('intro.html', { query: 'lang=de-de' });
    s.push('setLaunchView', 'create');
    await sleep(250);
    v = view(s.d);
    const deHints = texts(v, '.c-launch__hint');
    const deTitle = (v && v.querySelector('.c-launch__callout-title') || {}).textContent;
    ok(deHints[1] === 'Nimm einen langen Satz, den du dir leicht merken kannst.' && deTitle === 'Schreib dir dieses Passwort auf',
      '★ S9 #1246: the de-de Create screen paints the NEW keys from the drafts — ' + JSON.stringify([deHints[1], deTitle]));
    s.dom.window.close();

    /* —— A-10 in Settings → About —— */
    s = await boot('settings.html');
    const about = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*About/.test(x.textContent || ''));
    if (about) about.click();
    await sleep(250);
    /* ★ S12 B re-base (#1267): About B has no description paragraph any more — the claim moved to the "Why Spixi"
       fact rows. Same assertion on the new home: the E2E fact says end-to-end, and the screen never says "encrypted on
       your device". */
    const facts = [...s.d.querySelectorAll('.c-settings-about__fact')].map((f) => [...f.querySelectorAll('.c-settings-links__label, .c-settings-links__sub')].map((x) => x.textContent).join(' '));
    const aboutText = (s.d.querySelector('.c-settings-about') || {}).textContent || '';
    ok(facts.includes('End-to-end encrypted Only the person you write to can read it.') && !/encrypted on your device/i.test(aboutText),
      '★ S9 A-10 (#1245): About says the messages are end-to-end encrypted (not "encrypted on your device") — ' + JSON.stringify(facts));
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 copy pins threw: ' + (e && e.stack || e));
  }
}
