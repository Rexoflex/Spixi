/* ==== fixb1 item 5 (#1539 Dial 1 = B, #1647) — the Account header shows the photo and the name only ====
 * Damir's ruling: the header of the Account hub carries the photo and the name and NOTHING of the address — no truncated
 * address, no Copy, no QR button, no "Your Ixian address · What is this?" caption (#1007 / #1091 are superseded) — on the phone and
 * in the desktop pane. The "My address" row (S20I) is the way in: it opens the ONE address sheet (#527), which holds the QR code,
 * the full address, its OWN Copy and the explainer (addressInfoBody + addressInfoSafety).
 * EXECUTED on the BUILT settings.html (jsdom; C# pushes via executeUiCommand), three forms: the phone (?mobile=1), the desktop
 * window (?desktop=1) and the desktop PANE (?pane=1&desktop=1). Per form:
 *   (A) the header (.c-settings__hero): the avatar button + the name; NO .c-settings__addr* element, NO [data-addr] anywhere in the hub,
 *       NO button but the avatar and the nickname pencil, NO caption text ("Your Ixian address", "What is this?"), no part of the address in its text;
 *   (B) the "My address" row exists (key `address`, above Contacts) — and with NO address pushed there is no row;
 *   (C) a click on the row opens the sheet (.c-addr-sheet) holding: the QR code (an <svg> in .c-addr-sheet__qrcard), the FULL address
 *       (.c-wallet-receive__addrvalue, ≠ the short form), a Copy control that copies the full address (a stubbed native copy receives it exactly
 *       and the pill morphs to ✓), and the explainer (the info line = SL.addressInfoBody, the safety line = SL.addressInfoSafety).
 *   (A2) ★ #46 r1 (S-S-3): with the sheet closed, NO attribute value of ANY element inside `.c-settings__hero` (the hero itself and every
 *       descendant; every attribute: title, aria-*, data-*, src, class, style …) contains the address, its first 6 or its last 6 characters —
 *       the text check above cannot see a `title` / `aria-label` / `data-*` that a hover or a screen reader would still show;
 *       (createAvatar writes only a numeric data-hue from the address, no address text).
 *   (A3) ★ #46 r2 (R2-5): the hero is a WHITELIST — its element set (tag + class list, in document order, with the depth) is held exactly:
 *       the avatar button and its children (the avatar, its initials, the edit dot + its icon), the name row (the ghost, the name, the nickname
 *       pencil button + its icon) and the nickname error line; no form control (input, textarea, select, output) inside it;
 *   (A4) ★ #46 r2 (R2-5): with the sheet closed, the whole hub text (the body without scripts and styles), every form-control value in the document
 *       (value property and attribute), every attribute value of every element, every <style> text and the root's style attribute — each with
 *       whitespace and the usual truncation marks (… · • * . - _ :) removed — contain NO 6-character window of the test address and NO
 *       `first k + last k` join of it (k = 3…10: `slice(0,5) + '…' + slice(-5)` reads as the 10 characters once the mark is gone);
 *   (A5) ★ #46 r3 (R3-5): before the window test EVERY character that is not [A-Za-z0-9] is dropped (a zero-width space or any other separator
 *       every 5 characters no longer hides the address); every stylesheet of the document is read through `document.styleSheets[*].cssRules[*].cssText`
 *       (try / catch per sheet) as well as the <style> texts (a rule put in by `insertRule` into an empty <style> has no text node); and the EXACT textContent of each
 *       whitelisted hero element is held as the built output has it (the avatar initials "A", the name "Ana", the ghost "Ana", the error line empty …).
 *       STATED LIMIT: this is the page as jsdom builds it, sheet closed, after the pushes of this module; an insert gated by a timer, a layout read or a
 *       later event is not seen by jsdom — the walk rows W-4 / A-4 look at the real screen.
 *   (A6) ★ #46 r4 (R4-6 / R4-7): no element of the hub has a shadow root; the hero has no style attribute and exactly the one style attribute it has today (the
 *       avatar's 80 px size); base64 runs (≥ 16 characters) in any value are decoded and tested too; every join first-i + last-j (i, j = 3…10) is tested; and a second
 *       leg per form pushes the address with an EMPTY nickname (a `name || address` fallback would show it).
 * Deliberate breaks (fixb1 report): the retired block restored in settings-shell.js (a `.c-settings__addr` div appended to the hero)
 *   → (A) fails in all three forms; the `if (address) { … key: 'address' …` row removed → (B)/(C) fail; the explainer row dropped from
 *   openAddressSheet (wallet-receive.js) → (C) explainer fails; the Copy `addrRow.append(shortBtn, addrValue, copy)` without `copy` → (C) copy fails.
 *   #46 r2 (R2-5), each rebuilt: a read-only <input> holding the address in the hero → (A3) + (A4); a <p> with the full address right after the hero → (A4)
 *   text; the address in groups of 4 → (A4) text; `slice(0,5) + '…' + slice(-5)` → (A4) text; a <style> with `.c-settings__hero::after{content:"<address>"}` →
 *   (A4) style; a custom property carrying the address on the root → (A4) root. Restored.
 *   #46 r1 (fixb1 fixer): `hero.title = address` (settings-shell.js, in the hero build) → (A2) fails in all three forms. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const ADDR = '425HqzWpMkV3dTgJnS85CQenAbCdEf9XyZ12';
  const FORMS = [['phone', 'mobile=1'], ['desktop', 'desktop=1'], ['pane', 'pane=1&desktop=1']];
  /* the whitelist: depth + tag + class list of every element of the hero, in document order (built settings.html, all three forms alike) */
  const HERO_SET = ['0 div.c-settings__hero', '1 button.c-settings__avatar', '2 span.c-avatar', '3 span.c-avatar__initials', '2 span.c-settings__avatar-edit', '3 svg.', '4 path.',
    '1 div.c-settings__name-row', '2 span.c-settings__nick-ghost', '2 span.c-settings__name', '2 button.c-button.c-settings__nick-edit', '3 svg.c-button__icon', '4 path.', '1 span.c-settings__nick-error'];
  /* the exact textContent of each of those elements, same order (nickname pushed: "Ana"; the error line and every icon empty) */
  const HERO_TEXT = ['AAna', 'A', 'A', 'A', '', '', '', 'Ana', '', 'Ana', '', '', '', ''];
  /* ★ #46 r3/r4: only letters and digits count; every 6-character window of the address; every join first-i + last-j (i, j = 3…10, asymmetric too:
   * `slice(0,5) + '…' + slice(-4)`); and every base64 run (≥ 16 characters of [A-Za-z0-9+/=]) in a value is decoded and the decoded text tested too */
  const strip = (t) => String(t).replace(/[^A-Za-z0-9]+/g, '');
  const wins = []; for (let i = 0; i + 6 <= ADDR.length; i++) wins.push(ADDR.slice(i, i + 6));
  for (let i = 3; i <= 10; i++) for (let j = 3; j <= 10; j++) wins.push(ADDR.slice(0, i) + ADDR.slice(-j));
  const leakIn = (t) => { const c = strip(t); return wins.find((w) => c.includes(w)) || ''; };
  const leakOf = (t) => {
    const x = String(t); const direct = leakIn(x); if (direct) return direct;
    for (const m of x.matchAll(/[A-Za-z0-9+/=]{16,}/g)) {
      let buf; try { buf = Buffer.from(m[0], 'base64'); } catch (e) { continue; }
      const hit = leakIn(buf.toString('latin1')) || leakIn(buf.toString('utf8')) || leakIn(buf.toString('utf16le'));
      if (hit) return hit;
    }
    return '';
  };
  /* what the closed hub shows: the shadow roots, the style attributes of the hero and the hero's own text */
  const probe = (d, hero) => {
    const clone = d.body.cloneNode(true); clone.querySelectorAll('script, style').forEach((e) => e.remove());
    const heroEls = hero ? [hero, ...hero.querySelectorAll('*')] : [];
    return {
      shadow: [...d.querySelectorAll('*')].filter((e) => e.shadowRoot !== null).length,
      heroStyles: heroEls.map((e, i) => (e.hasAttribute('style') ? [i, e.getAttribute('style')] : null)).filter(Boolean),
      leakText: leakOf(clone.textContent), leakHero: hero ? leakOf(hero.textContent + ' ' + heroEls.flatMap((e) => [...e.attributes].map((a) => a.value)).join(' ')) : '',
    };
  };
  const HERO_STYLES = [[2, 'width: 80px; height: 80px;']];   // the avatar's own size, as built today; the hero itself carries none
  const R = {};
  for (const [form, query] of FORMS) {
    let s = null;
    const r = {};
    try {
      s = await boot('settings.html', { query, wait: 900 });
      const { W, d, push } = s;
      /* no address pushed yet → no row (B, negative leg) */
      push('setNickname', 'Ana');
      await sleep(150);
      r.noAddrNoRow = !d.querySelector('.c-settings__row[data-setting-key="address"]');
      push('setAddress', ADDR);
      await sleep(250);
      /* (A) the header */
      const hero = d.querySelector('.c-settings__hero');
      const heroBtns = hero ? [...hero.querySelectorAll('button')] : [];
      const heroText = hero ? hero.textContent : '';
      const avatar = hero && hero.querySelector('.c-settings__avatar');
      const name = hero && hero.querySelector('.c-settings__name');
      r.header = {
        hero: !!hero, avatar: !!avatar && avatar.tagName === 'BUTTON', name: !!name && name.textContent === 'Ana',
        noAddrEl: !d.querySelector('[class*="c-settings__addr"]'),
        noDataAddr: !d.querySelector('[data-addr]'),
        onlyAvatarAndPencil: heroBtns.length >= 1 && heroBtns.every((b) => b.classList.contains('c-settings__avatar') || b.classList.contains('c-settings__nick-edit')),
        noCaption: !/Your Ixian address|What is this/i.test(heroText),
        noAddrText: !heroText.includes(ADDR.slice(0, 6)) && !heroText.includes(ADDR.slice(-6)),
        noCopyQrLabel: !heroBtns.some((b) => /copy|qr/i.test(b.getAttribute('aria-label') || '')),
      };
      /* (A2) ★ #46 r1 (S-S-3): no attribute of any element in the hero carries the address or a 6-character end of it (the sheet is still closed) */
      const frags = [ADDR, ADDR.slice(0, 6), ADDR.slice(-6)];
      const attrLeaks = [];
      if (hero) for (const el of [hero, ...hero.querySelectorAll('*')]) for (const a of [...el.attributes]) {
        if (frags.some((x) => a.value.includes(x))) attrLeaks.push(el.tagName.toLowerCase() + '[' + a.name + ']');
      }
      r.attrs = { hero: !!hero, elements: hero ? hero.querySelectorAll('*').length + 1 : 0, leaks: attrLeaks };
      /* (A3) ★ #46 r2: the hero's element set — exactly the whitelist; no form control */
      const heroSet = hero ? [hero, ...hero.querySelectorAll('*')].map((el) => { let dep = 0; for (let p = el; p && p !== hero; p = p.parentElement) dep++; return dep + ' ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.'); }) : [];
      /* (A4) ★ #46 r2: nothing of the address anywhere in the closed hub, in any shape */
      const clone = d.body.cloneNode(true); clone.querySelectorAll('script, style').forEach((e) => e.remove());
      const attrVals = [...d.querySelectorAll('*')].flatMap((e) => [...e.attributes].map((a) => a.value));
      const ctlVals = [...d.querySelectorAll('input, textarea, select')].flatMap((e) => [e.value, e.getAttribute('value') || '']);
      r.deep = {
        heroSet, heroSetOk: heroSet.length === HERO_SET.length && heroSet.every((x, i) => x === HERO_SET[i]),
        heroTextOk: hero ? ([hero, ...hero.querySelectorAll('*')].length === HERO_TEXT.length && [hero, ...hero.querySelectorAll('*')].every((e, i) => e.textContent === HERO_TEXT[i])) : false,
        noControl: !hero || hero.querySelectorAll('input, textarea, select, output, option').length === 0,
        shadow: probe(d, hero).shadow, heroStyles: probe(d, hero).heroStyles,
        leakText: leakOf(clone.textContent), leakCtl: ctlVals.map(leakOf).find(Boolean) || '', leakAttr: attrVals.map(leakOf).find(Boolean) || '',
        leakStyle: [...d.querySelectorAll('style')].map((e) => leakOf(e.textContent)).find(Boolean) || '',
        leakRules: (() => { let hit = ''; for (const sh of d.styleSheets) { try { for (const ru of sh.cssRules) { hit = leakOf(ru.cssText) || hit; } } catch (e) { /* a sheet that cannot be read: skipped, the <style> text above covers it */ } } return hit; })(),
        heroTexts: hero ? [hero, ...hero.querySelectorAll('*')].map((e) => e.textContent) : [], leakRoot: leakOf(d.documentElement.getAttribute('style') || ''),
        nStyles: d.querySelectorAll('style').length,
      };
      /* (B) the row */
      const row = d.querySelector('.c-settings__row[data-setting-key="address"]');
      const contacts = d.querySelector('.c-settings__row[data-setting-key="contacts"]');
      const sec = (el) => el && el.closest('.c-settings__section');
      r.row = { one: d.querySelectorAll('.c-settings__row[data-setting-key="address"]').length === 1, label: row ? row.textContent.includes('My address') : false,
        aboveContacts: !!(row && contacts && sec(row).nextElementSibling === sec(contacts)), dialog: !!row && row.getAttribute('aria-haspopup') === 'dialog' };
      /* (C) the sheet, through the row */
      const copied = [];
      W.__spixiNativeCopy = (t) => { copied.push(t); return Promise.resolve(true); };   // the shell's copy path hands the text to C# first (clipboard.js #1028); the stub answers 'copied'
      if (row) row.click();
      await sleep(350);
      const sheet = d.querySelector('.c-addr-sheet');
      const qr = sheet && sheet.querySelector('.c-addr-sheet__qrcard svg');
      const full = sheet && sheet.querySelector('.c-wallet-receive__addrvalue');
      const short = sheet && sheet.querySelector('.c-addr-sheet__short');
      const copy = sheet && sheet.querySelector('.c-addr-sheet__copy');
      const infos = sheet ? [...sheet.querySelectorAll('.c-addr-sheet__info')] : [];
      const SLd = W.SL || {};
      const bodyTxt = SLd.addressInfoBody || 'This is your address on the Ixian network.';
      const safeTxt = SLd.addressInfoSafety || 'Sharing it is safe';
      r.sheet = {
        open: !!sheet,
        qr: !!qr && qr.querySelectorAll('rect, path').length > 0,
        fullAddress: !!full && full.textContent === ADDR && !!short && short.textContent !== ADDR,
        copyControl: !!copy && /Copy/.test(copy.textContent),
        explainer: infos.length === 2 && infos[0].textContent.trim() === bodyTxt.trim() && !infos[0].classList.contains('c-addr-sheet__info--safe')
          && infos[1].classList.contains('c-addr-sheet__info--safe') && infos[1].textContent.trim() === safeTxt.trim(),
      };
      if (copy) copy.click();
      await sleep(300);
      r.sheet.copyWalk = copied.length === 1 && copied[0] === ADDR && !!copy && copy.dataset.state === 'ok';
    } catch (e) { r.threw = String(e && e.message || e); }
    finally { try { s && s.dom.window.close(); } catch (e) {} }
    /* ★ #46 r4 (R4-7): the same form with the address pushed and an EMPTY nickname — a name that falls back to the address (`name || address`) must not show it */
    let s2 = null;
    try {
      s2 = await boot('settings.html', { query, wait: 900 });
      s2.push('setNickname', ''); await sleep(150); s2.push('setAddress', ADDR); await sleep(250);
      const hero2 = s2.d.querySelector('.c-settings__hero');
      const pr = probe(s2.d, hero2);
      r.empty = { hero: !!hero2, shadow: pr.shadow, leakText: pr.leakText, leakHero: pr.leakHero, heroText: hero2 ? hero2.textContent : null };
    } catch (e) { r.empty = { threw: String(e && e.message || e) }; }
    finally { try { s2 && s2.dom.window.close(); } catch (e) {} }
    R[form] = r;
    const hd = r.header || {}, rw = r.row || {}, sh = r.sheet || {};
    ok(!r.threw && hd.hero && hd.avatar && hd.name && hd.noAddrEl && hd.noDataAddr && hd.onlyAvatarAndPencil && hd.noCaption && hd.noAddrText && hd.noCopyQrLabel,
      `★ fixb1 item 5 (#1539, #1647) — ${form}: the Account header is the photo (avatar button) and the name (+ the nickname pencil) only — no address, Copy, QR button or "What is this?" caption — ${JSON.stringify(r.threw || hd)}`);
    const at = r.attrs || {};
    ok(!r.threw && at.hero === true && at.elements >= 4 && at.leaks.length === 0,
      `★ fixb1 item 5 (S-S-3) — ${form}: with the sheet closed, no attribute value of any element inside .c-settings__hero contains the address, its first 6 or its last 6 characters — ${JSON.stringify(r.threw || at)}`);
    const dp = r.deep || {};
    ok(!r.threw && dp.heroSetOk === true && dp.heroTextOk === true && dp.noControl === true,
      `★ fixb1 item 5 (R2-5) — ${form}: the hero's element set is exactly the whitelist (the avatar button + its children, the name row with the pencil, the nickname error line) and holds no form control, and each element's textContent is exactly what the built page has (R3-5) — ${JSON.stringify(r.threw || { heroSet: dp.heroSet, heroTexts: dp.heroTexts, noControl: dp.noControl })}`);
    const em = r.empty || {};
    ok(!em.threw && em.hero === true && em.shadow === 0 && !em.leakText && !em.leakHero,
      `★ fixb1 item 5 (R4-7) — ${form}: with the address pushed and an EMPTY nickname, the hero text (and its attributes) and the whole hub hold no window of the address — ${JSON.stringify(em)}`);
    ok(!r.threw && dp.nStyles > 0 && dp.shadow === 0 && JSON.stringify(dp.heroStyles) === JSON.stringify(HERO_STYLES) && !dp.leakText && !dp.leakCtl && !dp.leakAttr && !dp.leakStyle && !dp.leakRules && !dp.leakRoot,
      `★ fixb1 item 5 (R2-5) — ${form}: with the sheet closed, the whole hub text, every form-control value, every attribute value, every <style> text and the root's style attribute (whitespace and … · • * . - _ : removed) hold no 6-character window of the test address and no first-k + last-k join of it (k = 3…10) — ${JSON.stringify(r.threw || { shadow: dp.shadow, heroStyles: dp.heroStyles, text: dp.leakText, ctl: dp.leakCtl, attr: dp.leakAttr, style: dp.leakStyle, rules: dp.leakRules, root: dp.leakRoot, nStyles: dp.nStyles })}`);
    ok(!r.threw && r.noAddrNoRow === true && rw.one && rw.label && rw.aboveContacts && rw.dialog,
      `★ fixb1 item 5 — ${form}: the "My address" row exists once (above Contacts, opens a dialog) when an address is known, and not without one — ${JSON.stringify(r.threw || { noAddrNoRow: r.noAddrNoRow, ...rw })}`);
    ok(!r.threw && sh.open && sh.qr && sh.fullAddress && sh.copyControl && sh.explainer && sh.copyWalk,
      `★ fixb1 item 5 — ${form}: the row opens the address sheet with the QR code, the FULL address, a Copy control (copies the full address, ✓) and the explainer (info + safety line) — ${JSON.stringify(r.threw || sh)}`);
  }
}
