/* ==== #1360 (Damir 2026-10-12, direction A "Polish in place") — the Add contact screen ====
 * On the BUILT index.html (jsdom), through the real path: FAB → New chat picker → "Add contact" → the chooser sheet →
 * "Enter or paste" → the in-shell form; the C# answers are pushed the way the shell receives them (executeUiCommand:
 * onValidAddress · onKnownAddress). Then the BUILT contact_new.html (no roster → the placeholder avatar).
 *   · the label is a real <label> "Address" bound to the input (unique id), the placeholder is "Address";
 *   · the scan button is INSIDE the field box (the box draws the border);
 *   · a bad address ("abc def") → data-invalid on the box + a 2 px error border (rule-resolved) + aria-invalid, and the
 *     error line holds the alert-square-rounded glyph (S20H; was alert-small) + the NEW key's text (addContactBadAddress, not Wallet's badAddress);
 *   · a confirmed ✓ (onValidAddress) → data-valid + the ✓ disc INSIDE the field, before the separator, + the status line;
 *     the bad state is gone;
 *   · already a contact (onKnownAddress 'contact') → ONE row inside the card: a 32 px avatar (the roster's photo via
 *     avatarFor) + the sentence + "View contact"; the ✓ is retired with the line;
 *   · the lead is a caption UNDER the card with the info-circle glyph;
 *   · addContactBadAddress exists in en-us + every locale JSON and differs from badAddress there.
 * Deliberate breaks (#1360 report): setError without data-invalid · the [data-invalid] width 2 → 1 · the ✓ disc appended to
 * the card instead of the field · the known avatar not prepended · the scan button moved out of the box · label.htmlFor
 * dropped · one locale's addContactBadAddress = its badAddress.
 * ★ #46 r1 (R2): + the ✓ retired by the known panel with no input event (break: drop setValid(false) in setKnown) · a long
 * unbroken nick wraps (break: drop overflow-wrap) · a request failure marks the line only (break: setError without
 * { field: false } in the fail path) · no late ✓ over an error (break: drop err.hidden from the ✓ guard) · the 2 px check
 * is blurred + the [data-invalid] rule (break: drop [data-invalid] from the 2 px rule). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join, readdirSync } = h;
  const K = aKit(h);
  const ANN = '4JsLSmAF4yp3j1T5gcrAkiFF2fYJSe4XM7rJBngtPmPUw';
  const NEW = '3Tb8NcWq1mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vy';
  const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const BAD_EN = 'That doesn’t look like a Spixi address.';

  /* rule-resolved: the winning declaration (specificity, then source order) among the non-@media rules that match `el`,
     for any of `props`; var() resolved through the root's tokens. jsdom keeps the authored value of every rule. */
  const spec = (sel) => {
    const s = sel.replace(/::?[\w-]+\([^)]*\)/g, (m) => (/^:not/.test(m) ? m.slice(5, -1) : ' .x'));
    return [(s.match(/#[\w-]+/g) || []).length, (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length, (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length];
  };
  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  const ruleProp = (W, el, props) => {
    let best = null, order = 0;
    for (const sh of W.document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        order++;
        if (!r.selectorText || !r.style) continue;
        for (const sel of r.selectorText.split(',').map((x) => x.trim())) {
          let m = false; try { m = el.matches(sel); } catch (e) { m = false; }
          if (!m) continue;
          for (const p of props) {
            const v = r.style.getPropertyValue(p);
            if (!v) continue;
            const sp = spec(sel);
            if (!best || cmp(sp, best.sp) > 0 || (cmp(sp, best.sp) === 0 && order >= best.order)) best = { sp, order, p, v: v.trim(), sel };
          }
        }
      }
    }
    return best;
  };
  const res = (W, v) => {
    const cs = W.getComputedStyle(W.document.documentElement);
    let x = String(v || '');
    for (let i = 0; i < 8 && /var\(/.test(x); i++) x = x.replace(/var\((--[\w-]+)\)/g, (_, n) => cs.getPropertyValue(n).trim());
    return x.trim();
  };
  const paths = (svg) => (svg ? [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|') : '');

  const r = {};
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1200 });
    const { d, W } = s;
    s.push('addContact', ANN, 'Ann', PHOTO, 'false', '0', 'contact', '');
    await sleep(200);
    d.getElementById('fab').click();
    await sleep(500);
    const row = [...d.querySelectorAll('.c-contacts .c-contacts__action')].find((x) => /Add contact/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(300);
    const enter = d.querySelector('.c-sheet--add-contact .c-contacts-addsheet__item[data-kind="enter"]');
    if (enter) enter.click();
    await sleep(150);
    const panel = d.querySelector('.contacts-takeover .c-contacts-add');
    const card = panel && panel.querySelector('.c-contacts-add__group');
    const field = card && card.querySelector('.c-contacts-add__field');
    const input = panel && panel.querySelector('.c-contacts-add__input');
    const label = card && card.querySelector('label.c-contacts-add__label');
    const scan = panel && panel.querySelector('.c-contacts-add__scan');
    const submit = panel && panel.querySelector('.c-contacts-add__submit');
    const err = card && card.querySelector('.c-contacts-add__error');
    const valid = card && card.querySelector('.c-contacts-add__valid');
    const okDisc = panel && panel.querySelector('.c-contacts-add__ok');
    const known = card && card.querySelector('.c-contacts-add__known');
    r.path = !!panel && !!card && !!field && !!input && !!submit && !!enter;

    /* label · placeholder · binding */
    r.label = !!label && label.textContent === 'Address' && !!input && input.placeholder === 'Address' && !!input.id
      && label.htmlFor === input.id && d.querySelectorAll('[id="' + input.id + '"]').length === 1
      && input.labels && input.labels.length === 1 && input.labels[0] === label && !input.hasAttribute('aria-label');

    /* the scan button lives INSIDE the field box */
    r.scanInField = !!field && !!scan && field.contains(scan) && field.contains(input) && scan.getAttribute('aria-label') === 'Scan';

    /* bad address → the field says it */
    input.value = 'abc def';
    submit.click();
    await sleep(30);
    /* ★ #46 R2-MINOR-2: submit() focuses the input, and :focus-within ALSO draws 2 px — blur first, and the winning
       width rule must be the [data-invalid] one, so the check is about the BAD state, not focus */
    input.blur();
    await sleep(10);
    const bw = field && ruleProp(W, field, ['border-width', 'border-top-width', 'border']);
    const bc = field && ruleProp(W, field, ['border-color', 'border-top-color', 'border']);
    const width = bw ? res(W, bw.p === 'border' ? bw.v.split(/\s+/)[0] : bw.v.split(/\s+/)[0]) : '';
    const color = bc ? res(W, bc.p === 'border' ? bc.v.split(/\s+/).pop() : bc.v) : '';
    r.badMarks = !!field && field.hasAttribute('data-invalid') && input.getAttribute('aria-invalid') === 'true';
    r.badBorder = width === '2px' && !!color && color === res(W, 'var(--outline-error)')
      && !field.matches(':focus-within') && !!bw && /\[data-invalid\]/.test(bw.sel);
    const errSvg = err && err.querySelector('svg');
    const reg = W.SpixiIcons && W.SpixiIcons.icon ? W.SpixiIcons.icon('alert-square-rounded', { size: 16 }) : null;
    r.badLine = !!err && !err.hidden && err.getAttribute('role') === 'alert' && err.textContent === BAD_EN
      && !!errSvg && errSvg.getAttribute('aria-hidden') === 'true' && !!reg && paths(errSvg) === paths(reg) && paths(reg).length > 10
      && err.firstElementChild === errSvg;
    r.badNotWallet = !/Ixian/.test(err ? err.textContent : 'Ixian');

    /* a confirmed ✓, pushed as the shell receives it */
    s.sent.length = 0;
    input.value = NEW;
    input.dispatchEvent(new W.Event('input', { bubbles: true }));
    await sleep(320);
    const asked = s.sent.includes('ixian:checkAddress:' + NEW);
    s.push('onValidAddress', NEW);
    await sleep(40);
    const kids = field ? [...field.children] : [];
    const iOk = kids.indexOf(okDisc), iSep = kids.findIndex((x) => x.classList.contains('c-contacts-add__sep')), iIn = kids.indexOf(input);
    r.valid = asked && !!field && field.hasAttribute('data-valid') && !field.hasAttribute('data-invalid') && !input.hasAttribute('aria-invalid')
      && !!okDisc && !okDisc.hidden && field.contains(okDisc) && iIn >= 0 && iIn < iOk && iOk < iSep && !!okDisc.querySelector('svg')
      && !!valid && !valid.hidden && /Looks like a valid Spixi address/.test(valid.textContent) && err.hidden;

    /* already a contact → ONE row inside the card. ★ #46 R2-NOTE1: the ✓ is SHOWN first (onValidAddress for ANN), then
       onKnownAddress for the same value with NO input event in between — the known panel itself must retire the ✓ */
    input.value = ANN;
    input.dispatchEvent(new W.Event('input', { bubbles: true }));
    await sleep(320);
    s.push('onValidAddress', ANN);
    await sleep(40);
    const tickFirst = field.hasAttribute('data-valid') && !okDisc.hidden && !valid.hidden;
    s.push('onKnownAddress', 'contact', ANN, 'Ann', ANN);
    await sleep(40);
    const av = known && known.querySelector(':scope > .c-avatar');
    const img = av && av.querySelector('img');
    const text = known && known.querySelector(':scope > .c-contacts-add__known-text');
    const btn = known && known.querySelector(':scope > .c-contacts-add__known-btn');
    const kd = known && ruleProp(W, known, ['display']);
    const kf = known && ruleProp(W, known, ['flex-direction']);
    r.known = !!known && !known.hidden && card.contains(known) && known.getAttribute('role') === 'status'
      && !!av && av.dataset.size === '32' && av.style.width === '32px' && av.getAttribute('aria-hidden') === 'true'
      && !!img && img.getAttribute('src') === PHOTO
      && !!text && text.textContent === 'Ann is already in your contacts.'
      && !!btn && !btn.hidden && btn.textContent.trim() === 'View contact' && btn.dataset.type === 'text'
      && known.firstElementChild === av && av.nextElementSibling === text && text.nextElementSibling === btn
      && !!kd && kd.v === 'flex' && (!kf || kf.v === 'row')
      && submit.disabled && !field.hasAttribute('data-valid') && okDisc.hidden && valid.hidden;
    r.knownRetiresTick = tickFirst && !known.hidden && !field.hasAttribute('data-valid') && okDisc.hidden && valid.hidden;

    /* ★ #46 R2-MINOR-1: a long UNBROKEN peer nick wraps inside the text (rule-resolved — jsdom has no layout): the text
       is the flex item that shrinks (min-width 0) and breaks anywhere; View contact keeps its size (flex none) */
    const LONG = 'X'.repeat(96);
    s.push('onKnownAddress', 'contact', ANN, LONG, ANN);
    await sleep(40);
    const text2 = known.querySelector(':scope > .c-contacts-add__known-text');
    const ow = text2 && ruleProp(W, text2, ['overflow-wrap', 'word-wrap']);
    const mw = text2 && ruleProp(W, text2, ['min-width']);
    const fb = btn && ruleProp(W, btn, ['flex']);
    r.longNick = !!text2 && text2.textContent.includes(LONG) && !!ow && ow.v === 'anywhere' && !!mw && /^0(px)?$/.test(mw.v)
      && !!fb && /^(none|0 0 auto)$/.test(fb.v) && text2.nextElementSibling === btn;   // jsdom serialises flex: none as 0 0 auto

    /* ★ #46 R2-MINOR-3: a REQUEST failure (C#: onRequestResult "0" → ctrl.fail) shows the line ONLY — the typed address
       is not marked (no data-invalid, no aria-invalid); ★ R2-NOTE2/3: a late ✓ for the same value never lands over it */
    input.value = NEW;
    input.dispatchEvent(new W.Event('input', { bubbles: true }));
    await sleep(320);
    s.sent.length = 0;
    submit.click();
    await sleep(30);
    const reqSent = s.sent.includes('ixian:request:' + NEW);
    const FAILMSG = 'This is your own address.';
    s.push('onRequestResult', '0', FAILMSG);
    await sleep(40);
    r.failLineOnly = reqSent && !err.hidden && err.textContent === FAILMSG && !!err.querySelector('svg')
      && !field.hasAttribute('data-invalid') && !input.hasAttribute('aria-invalid') && !input.disabled;
    s.push('onValidAddress', NEW);
    await sleep(40);
    r.noTickOverError = !err.hidden && !field.hasAttribute('data-valid') && okDisc.hidden && valid.hidden;

    /* the lead is a caption under the card */
    const note = panel && panel.querySelector('.c-contacts-add__note');
    r.caption = !!note && note.previousElementSibling === card && !card.contains(note) && /Enter their Spixi address to send a contact request\./.test(note.textContent)
      && !!note.querySelector('svg') && paths(note.querySelector('svg')) === paths(W.SpixiIcons.icon('info-circle'));
    r.noErr = K.noErr(s.errs) || JSON.stringify(s.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s && s.close) s.close(); }

  /* the standalone page: no roster → the placeholder avatar (nick initials), still one row */
  let s2 = null;
  try {
    s2 = await K.boot('contact_new.html', { wait: 1200 });
    const { d, W } = s2;
    const input = d.querySelector('.c-contacts-add__input');
    input.value = ANN;
    input.dispatchEvent(new W.Event('input', { bubbles: true }));
    await sleep(320);
    s2.push('onKnownAddress', 'contact', ANN, 'Ann', ANN);
    await sleep(40);
    const known = d.querySelector('.c-contacts-add__known');
    const av = known && known.querySelector(':scope > .c-avatar');
    r.standalone = !!av && av.dataset.size === '32' && !av.querySelector('img') && (av.querySelector('.c-avatar__initials') || {}).textContent === 'A' && !known.hidden
      && d.querySelector('label.c-contacts-add__label').htmlFor === input.id;
  } catch (e) { r.threw2 = e.message; }
  finally { if (s2 && s2.close) s2.close(); }

  const clause = (k, msg) => ok(r[k] === true, msg + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw, threw2: r.threw2 }));
  clause('path', '★ #1360: the real path reaches the form (FAB → New chat → Add contact → the chooser → Enter or paste)');
  clause('label', '★ #1360 (Damir 16:27): the field has a real <label> "Address" bound to the input (unique id, input.labels) and the placeholder "Address" — no aria-label beside it (one name, said once)');
  clause('scanInField', '★ #1360: the scan button sits INSIDE the field box with the input (the box draws the border)');
  clause('badMarks', '★ #1360: a bad address ("abc def") marks the FIELD — data-invalid on the box + aria-invalid on the input');
  clause('badBorder', '★ #1360: the bad field draws a 2 px --outline-error border (rule-resolved; ★ #46 R2-MINOR-2: blurred, and the winning width rule is the [data-invalid] one — not :focus-within)');
  clause('badLine', '★ #1360: the error line (role=alert) leads with the alert-square-rounded glyph (aria-hidden; S20H one warning glyph, was alert-small) and says "That doesn’t look like a Spixi address." — the NEW key addContactBadAddress');
  clause('badNotWallet', '★ #1360: this screen no longer says Wallet\'s "Ixian address" sentence (badAddress stays for Wallet › Send)');
  clause('valid', '★ #1360: a confirmed ✓ (ixian:checkAddress → onValidAddress) → data-valid + the ✓ disc INSIDE the field after the input and before the separator + "Looks like a valid Spixi address"; the bad state is gone');
  clause('known', '★ #1360: already a contact (onKnownAddress "contact") → ONE row inside the card: the 32 px avatar with the roster photo (avatarFor), the sentence, and the "View contact" text button; Send disabled; the ✓ retired');
  clause('knownRetiresTick', '★ #46 R2-NOTE1: a SHOWN ✓ (onValidAddress) is retired by the known panel itself (onKnownAddress for the same value, no input event between) — the two statements are never on screen together');
  clause('longNick', '★ #46 R2-MINOR-1: a 96-char unbroken nick in the known row — the text breaks anywhere (overflow-wrap: anywhere, min-width 0, rule-resolved) and View contact keeps flex none after it');
  clause('failLineOnly', '★ #46 R2-MINOR-3: a request failure (onRequestResult "0" → ctrl.fail) shows the error line with its glyph ONLY — the field is not marked (no data-invalid / aria-invalid; #435(b): a known address is not an error)');
  clause('noTickOverError', '★ #46 R2-NOTE2/3: a late ✓ (onValidAddress for the same value) never lands over a shown error line');
  clause('caption', '★ #1360: the lead is a caption UNDER the card with the info-circle glyph — "Enter their Spixi address to send a contact request."');
  clause('noErr', '★ #1360: the home shell raised no page error on the way');
  clause('standalone', '★ #1360: contact_new.html (no roster, no avatarFor) draws the 32 px placeholder in the known row, and its label is bound too');

  /* strings: the new key in en-us + every locale, never the Wallet sentence */
  const dir = join(root, 'src/strings');
  const codes = readdirSync(dir).filter((f) => /^[a-z]{2}-[a-z]{2}\.json$/.test(f));
  const bad = [];
  for (const f of codes) {
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (!j.addContactBadAddress || !j.badAddress || j.addContactBadAddress === j.badAddress) bad.push(f);
  }
  const en = JSON.parse(readFileSync(join(dir, 'en-us.json'), 'utf8'));
  ok(codes.length === 14 && bad.length === 0 && en.addContactBadAddress === BAD_EN,
    '★ #1360: addContactBadAddress exists in en-us + the 13 locale JSONs and differs from badAddress in every one (' + codes.length + ' files; bad: ' + JSON.stringify(bad) + ')');
}
