/* ==== SESSION 9 (B2) — COPY: the Create screen (#1246 O = A, #1139) + A-10 "End-to-end encrypted" (#1245) ====
 * On the BUILT intro.html / settings.html (jsdom):
 *   · Create: NO "Wallet password" group label (the profile label stays), the two hint lines in order, the new
 *     callout title + body, and an empty password submits to "Choose a password." (no "wallet")
 *     ★ re-based by S20 T (ON-1): the two-step Create — the same intents on the new screen (see the block)
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
    /* —— Create, English —— ★ re-based by S20 T (ON-1, #1420–#1422): create is two steps; the INTENT holds —
       no "Wallet password" anywhere on Create, the length rule up front (now the live "10+ characters" check),
       the write-it-down banner, an empty password never reaches C# and nothing on the screen says "wallet password". */
    let s = await boot('intro.html');
    s.push('setLaunchView', 'create');
    await sleep(250);
    let v = view(s.d);
    const typeIn = (el, val) => { if (el) { el.value = val; el.dispatchEvent(new s.W.Event('input', { bubbles: true })); } };
    const nick = v && v.querySelector('input[data-field="nick"]');
    typeIn(nick, 'Ana');
    const next = v && v.querySelector('[data-step="1"] .c-launch__footer button');
    if (next) next.click();
    await sleep(50);
    const labels = texts(v, '.c-launch__field-label');
    ok(!!v && JSON.stringify(labels) === JSON.stringify(['Nickname', 'Password', 'Confirm password']) && !/wallet password/i.test(v.textContent),
      '★ S9 #1246 O=A (S20 T re-base): the Create screen never says "Wallet password" — the fields say Nickname / Password / Confirm password — ' + JSON.stringify(labels));
    const checks = texts(v, '.c-launch__check');
    ok(JSON.stringify(checks) === JSON.stringify(['10+ characters', 'Passwords match']),
      '★ S9 #1246 O=A (S20 T re-base): the length rule is shown UP FRONT, before any typing — the live check "10+ characters" (ENC_MIN), then the match check — ' + JSON.stringify(checks));
    const cTitle = (v && v.querySelector('.c-launch__banner-title') || {}).textContent;
    const cBody = (v && v.querySelector('.c-launch__banner-body') || {}).textContent;
    const desk = s.d.documentElement.hasAttribute('data-desktop');   // jsdom's UA reads as a desktop OS
    ok(cTitle === 'Write this password down'
      && cBody === 'It unlocks your account and wallet on this ' + (desk ? 'device' : 'phone') + '. Nobody can reset it, not even Spixi.',
    '★ S9 #1246 O=A (S20 T re-base): the banner says "Write this password down" + the reset line (the platform word) — ' + JSON.stringify([cTitle, cBody]));
    /* an empty password → the commit stays OFF (nick filled so the nick step passes) */
    const cta = v && v.querySelector('[data-step="2"] .c-launch__footer button');
    if (cta) cta.click();
    await sleep(50);
    ok(!!cta && cta.disabled, '★ S9 #1246 (S20 T re-base): an empty password cannot commit — "Create my account" is off');
    ok(s.sent.every((c) => !/^ixian:create:/.test(c)), '★ S9 #1246: the empty-password submit sends no create verb');
    /* A-10 on the welcome slides (same document) */
    const all = s.d.body.textContent;
    ok(/End-to-end encrypted and opened only by the person you sent to\./.test(all) && !/Encrypted on your device/i.test(all),
      '★ S9 A-10 (#1245): the welcome slide says "End-to-end encrypted …", never "Encrypted on your device"');
    s.dom.window.close();

    /* —— Create, de-de: the keys come from the drafts —— (★ S20 T re-base: the hint lines are gone; the banner
       title + the field label are the translated keys this screen still reads) */
    s = await boot('intro.html', { query: 'lang=de-de' });
    s.push('setLaunchView', 'create');
    await sleep(250);
    v = view(s.d);
    const deLabels = texts(v, '.c-launch__field-label');
    const deTitle = (v && v.querySelector('.c-launch__banner-title') || {}).textContent;
    ok(deLabels[1] === 'Passwort' && deTitle === 'Schreib dir dieses Passwort auf',
      '★ S9 #1246: the de-de Create screen paints the translated keys from the drafts — ' + JSON.stringify([deLabels[1], deTitle]));
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
    ok(facts.includes('End-to-end encrypted') && !/encrypted on your device/i.test(aboutText),   /* ★ S13 re-base (#1269 (1)): the E2E row = its title alone (the singular line dropped) */
      '★ S9 A-10 (#1245): About says the messages are end-to-end encrypted (not "encrypted on your device") — ' + JSON.stringify(facts));
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 copy pins threw: ' + (e && e.stack || e));
  }
}
