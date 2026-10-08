/**
 * c-wallet-receive — Receive/Request (spec §4, #133; shape per Damir 2026-07-05: ONE
 * surface, matching the send screen's grammar).
 *
 * ★ #1263 (Damir's pick A, 2026-10-08) — the SAME TWO STEPS as Send, over today's
 * request flow:
 *   STEP 1 — who: "Show my address" (the #527 sheet, unchanged: the any-amount QR, no
 *     amount in it, #303) on top, then the W9 multi-select (search, the shared rows, the
 *     rule/count line) and ONE "Continue (n)".
 *   STEP 2 — how much: a "From" chip (stacked avatars + names; tap = back to step 1),
 *     the big amount + the keypad (amount-pad.js — the SAME module Send uses), a one-line
 *     note ("A request is a message…"), and the W9 CTA "Request {a} IXI ({n})". No fee,
 *     no Max, no balance gate: a request is a message, not a spend.
 * UNCHANGED BY #1263 (pins-s11/h-receive.mjs): the send loop — onSendRequest({ contact,
 * amount }) ONCE PER PICK, in roster order, with the CANONICAL amount; partial failure
 * never navigates (the failures stay ticked, the CTA retries exactly the remainder);
 * onRequestsSent({ amount, contacts, text }) only on an all-clear run. The shell's verb
 * stays `ixian:sendrequest:<addr>:<amount>`.
 *
 * ★ #527 SUPERSEDES the QR-first default: the QR/address/copy/Share live in
 * `openAddressSheet` (see the block after the component).
 *
 * ★ W9 (Damir, Windows F5 2026-08-13): "when I sent a request to someone I still
 * remain in the same screen with input active and I can add more … perhaps we can
 * have a multiselect as for group creation and then 1 SEND REQUEST button that then
 * confirms it was sent, and we return to wallet screen."
 *   · The rows are the GROUP-CREATION grammar, verbatim (contacts-shell pickerRow):
 *     role=checkbox + aria-checked + the trailing check circle; the rule/count line
 *     under the heading is the c-contacts__minhint pattern (SAME element, same
 *     height, text swapped — it must never reflow the list under a finger).
 *   · Double-fire protection on the CTA (#72④): `state.sending` latches for the
 *     length of the loop and the CTA is disabled with it.
 *   · The bridge verb stays PER CONTACT (`ixian:sendrequest:<addr>:<amount>`, one
 *     at a time) — this loops the existing verb, it does not invent a batch one.
 *     onSendRequest is called once per selected contact; returning `false` (or
 *     throwing) marks THAT recipient as not sent.
 *   · onRequestsSent({ amount, contacts, text }) fires only on an ALL-CLEAR run;
 *     the shell toasts `text` and closes the takeover ("we return to wallet
 *     screen"). Without it the component keeps its own inline success line (and
 *     returns to step 1), so a standalone mount still confirms.
 * Amount is CANONICALIZED before it leaves ('12.'→'12'; audit M1 — what leaves this
 * surface is what a legacy parser must read).
 *
 * No FE money math here beyond the keypad rules — a request is a message, not a spend;
 * the bridge re-validates when the payer acts on it.
 *
 * createWalletReceive({ address, contacts, strings, host, fiatPrice, onShare,
 *                       onSendRequest, onRequestsSent }) → view
 *   view._stepBack() — ★ #1263: the host's Back on step 2 returns to step 1.
 * Free fn (#44): setRequestAmount(el, amount) — programmatic amount (tests/bridge);
 *   Numbers are expanded to plain decimals first (audit C1: String(1e-7) → '1e-7'
 *   would sanitize into '17' — a silent magnitude change).
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { createSearchField } from './search-field.js';
import { createQrSvg } from './qr.js';                     // #303: setQrValue import dropped — the QR never re-encodes
import { createSheet, openSheet, closeSheet } from './sheet.js';   // #527: the address moved into a bottom sheet · r2: closeAddressSheet
import { canonicalAmount, groupAmountDisplay, toUnits, fiatLine } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping
import { icon } from './icons.js';
import { copyText } from './clipboard.js';   // ★ #993: the shared copy with the file:// fallback
import { createAvatar } from './avatar.js';
import { createContactRow, setContactRowChecked, createGlyphRow, contactDisplayName } from './contact-row.js';   // ★ W-j: the shared directory row
import { createAmountPad, createAmountDisplay } from './amount-pad.js';   // ★ #1263: the keypad Send uses
// F5-5 ③ (#556): the discGrad import is gone with the explainer disc — one glyph level now

/** '0', '0.', '' → not a requestable amount. */
function requestable(amount) {
  return !!amount && /[1-9]/.test(amount);
}

export function createWalletReceive({
  address = '', contacts = [], strings = getStrings(), host,
  fiatPrice = null,          // ★ #1263: IXI → fiat, RAW decimal from C#; absent/zero → no line (#1041)
  onShare, onSendRequest, onRequestsSent,
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-wallet-receive';
  /* ★ #46 r3 NIT-4: the last input modality inside this view (toStep1's focus rule) */
  let modality = null;
  el.addEventListener('pointerdown', (e) => { modality = e.pointerType || 'mouse'; }, true);
  el.addEventListener('keydown', () => { modality = 'keyboard'; }, true);
  /* W9: `selected` = the addresses ticked in the multi-select; `sending` = the
     one-at-a-time latch (#72④ double-fire guard). ★ #1263: `step` 1 = who, 2 = how much. */
  const state = { amount: '', contactQuery: '', selected: new Set(), sending: false, step: 1, done: false };

  /* guard (audit m2): a receive surface without an address must not present a
     confidently scannable garbage QR */
  if (!String(address).trim()) {
    const none = document.createElement('p');
    none.className = 'c-wallet-receive__none';
    none.setAttribute('role', 'note');
    none.textContent = strings.noOwnAddress || 'Your address isn’t available yet.';
    el.append(none);
    return el;
  }

  /* hidden live region (audit m3/M3): announces the request-sent confirmation —
     not every keystroke (the caption used to be aria-live and spammed) */
  const live = document.createElement('p');
  live.className = 'c-wallet-receive__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  /* ——— STEP 1 ——— */
  const step1 = document.createElement('section');
  step1.className = 'c-wallet-receive__step c-wallet-receive__step--who';
  /* "Show my address" (#527, behaviour unchanged: the address sheet, the any-amount QR).
     ★ #1263 render A: a directory row on top of the list, "QR for any amount" under it. */
  const addrCard = document.createElement('div');
  addrCard.className = 'c-wallet-receive__addrcard';
  const addrBtn = createGlyphRow({
    glyph: 'qrcode', label: strings.showMyAddress || 'Show my address',
    className: 'c-wallet-receive__addrbtn',
    onClick: () => openAddressSheet({ address, strings, host, onShare }),
  });
  const addrSub = document.createElement('span');
  addrSub.className = 'c-contact-row__sub';
  addrSub.textContent = strings.addressAnyAmount || 'QR for any amount';
  const addrCol = addrBtn.querySelector('.c-contact-row__col');
  if (addrCol) addrCol.append(addrSub);
  addrCard.append(addrBtn);
  step1.append(addrCard);
  el.append(step1);

  /* contact strip — request-as-message (legacy ixian:sendrequest → chat payment
   * bubble). ONLY rendered when onSendRequest is wired — omitting the callback HIDES
   * the strip (and step 2) rather than showing a dead action that would falsely
   * confirm "sent" (audit MAJOR, Batch 6). */
  let rows = null;
  let hint = null;
  let result = null;
  let cta = null;
  let ctaLabel = null;
  let next = null;
  let nextLabel = null;
  let step2 = null;
  let chip = null;
  let pad = null;
  let display = null;
  let fiat = null;
  let ctaWrap = null;
  if (onSendRequest) {
    const askBox = document.createElement('div');
    askBox.className = 'c-wallet-receive__ask';
    // W6/W9: the list is never gated as a whole and its rows are never disabled —
    // ticking a name is not a send. The rule/count line states what is still missing.
    const askLabel = document.createElement('h2');
    askLabel.className = 'c-wallet-receive__asklabel';
    askLabel.textContent = strings.requestFromWho || 'Who to request from';
    askLabel.tabIndex = -1;                                // ★ #46 r3 NIT-4: step 1's focus target after a touch
    hint = document.createElement('p');
    hint.className = 'c-wallet-receive__hint';
    // role=status (not note): the line SWAPS between the rule and the live count in
    // place, and that swap is the only feedback a SR user gets for a tick.
    hint.setAttribute('role', 'status');
    askBox.append(askLabel, hint);
    const search = createSearchField({
      placeholder: strings.searchContacts || 'Search contacts',
      onInput: (v) => renderContacts(v),
      /* NO onSubmit. Enter in a search box is a filter/dismiss gesture; wiring it to
         "send to whoever is currently first" fires real money-request messages at an
         arbitrary contact with no confirm step. (#46 audit) */
      strings,
    });
    askBox.append(search);
    rows = document.createElement('div');
    rows.className = 'c-wallet-receive__contacts';
    /* W9: an independent multi-select roster — the container role group creation's
       checkbox list carries. */
    rows.setAttribute('role', 'group');
    rows.setAttribute('aria-label', strings.requestFromWho || 'Who to request from');
    askBox.append(rows);
    step1.append(askBox);

    /* ——— STEP 2 ——— */
    step2 = document.createElement('section');
    step2.className = 'c-wallet-receive__step c-wallet-receive__step--amount';
    step2.hidden = true;
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'c-wallet-receive__chip';
    chip.addEventListener('click', () => toStep1());
    step2.append(chip);
    const amtBox = document.createElement('div');
    amtBox.className = 'c-wallet-receive__amountbox';
    display = createAmountDisplay({ className: 'c-wallet-receive__amount', strings });
    display.setAttribute('aria-label', strings.requestAmount || 'Request an amount');
    fiat = document.createElement('p');
    fiat.className = 'c-wallet-receive__fiat u-tabular';
    fiat.hidden = true;
    amtBox.append(display, fiat);
    step2.append(amtBox);
    const note = document.createElement('p');
    note.className = 'c-wallet-receive__note';
    note.textContent = strings.requestIsMessage || 'A request is a message. Nothing moves until they pay.';
    step2.append(note);
    el.append(step2);

    /* W9 result line — the VISIBLE half of the send outcome (success or partial
       failure). aria-hidden: the hidden live region above is the single announcer.
       At the root, above the bar: a partial failure shows it on step 2, a standalone
       all-clear on step 1. */
    result = document.createElement('p');
    result.className = 'c-wallet-receive__result';
    result.setAttribute('aria-hidden', 'true');
    result.hidden = true;
    el.append(result);

    /* step 1's ONE action: Continue (n) — disabled until someone is ticked */
    next = createButton({
      label: strings.requestContinue || 'Continue ({n})',
      type: 'fill', size: 56, width: 'full', disabled: true,
      onClick: () => { if (selectedContacts().length) toStep2(); },
    });
    next.classList.add('c-wallet-receive__next');
    nextLabel = next.querySelector('.c-button__label');
    /* W9 CTA — ONE primary action carrying BOTH levers it commits: the amount and how
       many people it goes to. "(3)" keeps it one short line in every locale; the full
       sentence lives in aria-label. ★ size 56 = Send's Review (one money control). */
    cta = createButton({
      label: strings.sendRequest || 'Send request',
      type: 'fill', size: 56, width: 'full',
      disabled: true,
      onClick: () => sendRequests(),
    });
    cta.classList.add('c-wallet-receive__cta');
    ctaLabel = cta.querySelector('.c-button__label');
    pad = createAmountPad({
      display, strings, decimals: 8,
      onChange: (raw) => {
        state.amount = raw;
        // W9: a new amount invalidates a stale outcome line; the SELECTION survives
        // (who you are asking is a different axis from how much).
        if (result && !result.hidden) showResult('', 'ok');
        sync();
      },
    });
    /* the shared sticky money bar (base.css), the one Send uses */
    ctaWrap = document.createElement('div');
    ctaWrap.className = 'c-money-cta c-wallet-receive__bar';
    ctaWrap.append(next, pad, cta);
    el.append(ctaWrap);
  }

  function selectedContacts() {
    // filtered from the FULL roster, not the rendered rows: a selection made
    // before a search must not be silently dropped by the search that follows.
    return contacts.filter((c) => c && c.address && state.selected.has(c.address));
  }

  function showStep(n) {
    state.step = n;
    el.dataset.step = String(n);
    if (!step2) return;
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    next.hidden = n !== 1;
    pad.hidden = n !== 2;
    cta.hidden = n !== 2;
    if (n === 2) pad._keysOn(() => state.step === 2, { primary: () => cta });   // Enter = Send request when armed (★ #46 r3 MAJOR-1)
    else pad._keysOff();
  }
  function renderChip() {
    if (!chip) return;
    const picks = selectedContacts();
    chip.textContent = '';
    const lbl = document.createElement('span');
    lbl.className = 'c-wallet-receive__chiplabel';
    lbl.textContent = strings.moneyFrom || 'From';
    const stack = document.createElement('span');
    stack.className = 'c-wallet-receive__stack';
    for (const c of picks.slice(0, 3)) stack.append(createAvatar({ name: c.name || '', address: c.address, src: c.avatar || null, size: 24 }));
    const names = document.createElement('span');
    names.className = 'c-wallet-receive__chipnames';
    names.textContent = picks.map((c) => contactDisplayName(c)).join(', ');
    const chev = document.createElement('span');
    chev.className = 'c-wallet-receive__chipchev';
    chev.append(icon('chevron-down', { size: 16 }));
    chip.append(lbl, stack, names, chev);
    chip.setAttribute('aria-label', (strings.moneyFrom || 'From') + ': ' + names.textContent);
  }
  function toStep2() {
    renderChip();
    showStep(2);
    syncCta();
    try { display.focus(); } catch (e) { /* jsdom */ }
  }
  function toStep1() {
    if (state.step !== 2 || state.sending) return false;
    showStep(1);
    syncCta();
    // ★ #46 r3 NIT-4: the search (OS keyboard) only for a keyboard user / desktop;
    // after a touch tap or the Android Back the heading takes focus instead.
    const si = step1.querySelector('.c-wallet-receive__ask input');
    const kb = modality === 'keyboard' || document.documentElement.hasAttribute('data-desktop');
    if (si && kb) si.focus();
    else { const hd = step1.querySelector('.c-wallet-receive__asklabel'); if (hd) { try { hd.focus(); } catch (e) { /* jsdom */ } } }
    return true;
  }
  /* the host's Back: step 2 → step 1. After an all-clear handed to the host
     (onRequestsSent) the screen is leaving — Back is the host's own close then. */
  el._stepBack = () => (state.done ? false : toStep1());

  function syncCta() {
    const n = state.selected.size;
    const amount = requestable(state.amount) ? canonicalAmount(state.amount) : '';
    const ready = !!amount && n > 0;
    if (hint) {
      // Damir F5 2026-07-29 (contacts-shell precedent): the line STAYS and only
      // changes what it says — hiding it collapses its box and jumps the list.
      hint.textContent = n ? (strings.selectedCount || '{n} selected').split('{n}').join(String(n))
        : (strings.requestPickContacts || 'Pick at least one contact.');
    }
    if (next) {
      next.disabled = n === 0;
      if (nextLabel) nextLabel.textContent = (strings.requestContinue || 'Continue ({n})').split('{n}').join(String(n));
    }
    if (!cta) return;
    cta.disabled = !ready || state.sending;
    if (ctaLabel) {
      ctaLabel.textContent = ready
        ? (strings.requestCta || 'Request {a} IXI ({n})')
          .split('{a}').join(groupAmountDisplay(amount)).split('{n}').join(String(n))
        : (strings.sendRequest || 'Send request');
    }
    cta.setAttribute('aria-label', ready
      ? (strings.requestCtaLabel || 'Request {a} IXI from {n} selected')
        .split('{a}').join(groupAmountDisplay(amount)).split('{n}').join(String(n))
      : (strings.sendRequest || 'Send request'));
  }

  /** W9: outcome line + the single SR announcement. tone 'ok' | 'error'. */
  function showResult(text, tone) {
    live.textContent = text || '';
    if (!result) return;
    result.textContent = text || '';
    result.dataset.tone = tone || 'ok';
    result.hidden = !text;
  }

  /* W9 — the ONE send path. Loops the per-contact legacy verb; never navigates on
   * a partial failure (see docblock). #72④: `state.sending` latches for the loop so
   * a double-tap (or a synthetic click) cannot re-enter it. */
  function sendRequests() {
    if (state.sending) return;                             // #72④: a request is a message — no double fire
    // Explicit guard, not just the disabled attribute: a programmatic/synthetic
    // click must never get a request for "" (or for nobody) off this surface.
    if (!requestable(state.amount)) return;
    const targets = selectedContacts();
    if (!targets.length) return;
    const amount = canonicalAmount(state.amount);
    state.sending = true;
    syncCta();
    showResult('', 'ok');
    const failed = [];
    for (const c of targets) {
      let sent = true;
      // One send per contact. A throw (or an explicit `false`) means THIS
      // recipient did not go — the rest of the loop still runs.
      try { sent = onSendRequest({ contact: c, amount }) !== false; }
      catch (e) { sent = false; }
      if (sent) state.selected.delete(c.address); else failed.push(c);
    }
    state.sending = false;
    const sentCount = targets.length - failed.length;
    renderContacts(state.contactQuery);                    // repaint the ticks (the sent ones cleared)
    if (failed.length) {
      // Stay put (step 2). The failures are still ticked, so the CTA now retries
      // exactly the remainder — and the chip and the count say who that is.
      renderChip();
      showResult(sentCount
        ? (strings.requestSentPartly || 'Sent to {n}. The rest are still selected. Try again.')
          .split('{n}').join(String(sentCount))
        : (strings.requestFailed || 'Couldn’t send the request. Check the address and try again.'),
        'error');
      syncCta();
      return;
    }
    const text = sentCount === 1
      ? (strings.requestSentTo || 'Request for {a} IXI sent to {name}')
        .split('{a}').join(groupAmountDisplay(amount)).split('{name}').join(targets[0].name || targets[0].address)
      : (strings.requestSentToMany || 'Request for {a} IXI sent to {n} contacts')
        .split('{a}').join(groupAmountDisplay(amount)).split('{n}').join(String(sentCount));
    // All clear → the request is spent: clear the amount too, so a surface that
    // stays mounted can never re-fire the same request against a stale number.
    if (pad) pad._set('', { silent: true });
    state.amount = '';
    if (onRequestsSent) {
      // "and we return to wallet screen" — the shell confirms (toast) and closes the
      // takeover; this surface is leaving, so its Back is the host's close now.
      state.done = true;
      sync();
      showResult(text, 'ok');
      onRequestsSent({ amount, contacts: targets, text });
      return;
    }
    // standalone mount: the inline line IS the confirmation; back to a fresh step 1
    showStep(1);
    sync();
    showResult(text, 'ok');
  }

  function renderContacts(q) {
    if (!rows) return;                                   // contact strip omitted (no onSendRequest)
    state.contactQuery = q || '';
    const needle = state.contactQuery.trim().toLocaleLowerCase();
    rows.textContent = '';
    const list = contacts.filter((c) => !needle
      || (c.name || '').toLocaleLowerCase().includes(needle)
      || (c.address || '').toLocaleLowerCase().includes(needle));
    // Damir F5 2026-07-29: the cap is purely a DOM-size guard for very large rosters —
    // high enough that scrolling reaches everyone in practice, with the "keep typing"
    // note below still covering the tail.
    const cap = 50;
    for (const c of list.slice(0, cap)) {
      /* ★ W-j: the shared c-contact-row in its W9 CHECKBOX form — role=checkbox +
         aria-checked + the trailing circle (contacts-shell pickerRow grammar). */
      const b = createContactRow({
        contact: c, strings, select: 'checkbox', checked: state.selected.has(c.address),
        className: 'c-wallet-receive__contact',
      });
      if (b.disabled) { rows.append(b); continue; }        // loop r1 m4/m10: blocked rows never tick
      b.addEventListener('click', () => {
        // A tick is not a send — no gate here, and no latch. Patched in place so the
        // tapped row keeps keyboard focus (contacts-shell rule).
        const on = !state.selected.has(c.address);
        if (on) state.selected.add(c.address); else state.selected.delete(c.address);
        setContactRowChecked(b, on);
        if (result && !result.hidden) showResult('', 'ok');   // a new pick retires a stale outcome line
        syncCta();
      });
      rows.append(b);
    }
    if (list.length > cap) {
      const more = document.createElement('p');
      more.className = 'c-wallet-receive__none';
      more.setAttribute('role', 'note');
      more.textContent = (strings.moreContacts || '{n} more. Keep typing to narrow it down')
        .split('{n}').join(String(list.length - cap));
      rows.append(more);
    }
    if (!list.length && needle) {
      const none = document.createElement('p');
      none.className = 'c-wallet-receive__none';
      none.setAttribute('role', 'note');
      none.textContent = (strings.noContactMatch || 'No contact matches “{q}”. You can paste their address instead.').split('{q}').join(q);
      rows.append(none);
    }
    syncCta();                                             // freshly built rows inherit the current rule/count line
  }

  /* ★ #1263: the read-only fiat line — only with a price C# gave (none today). */
  const priceU = (() => {
    const t = String(fiatPrice == null ? '' : fiatPrice).trim();
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    const u = toUnits(t);
    return u > 0n ? u : null;
  })();
  function sync() {
    if (fiat) {
      const a = toUnits(canonicalAmount(state.amount) || '0');
      const line = (priceU !== null && a > 0n) ? fiatLine(requestUnitsToDecimal((a * priceU) / 100000000n), '', requestUnitsToDecimal(a)) : '';
      fiat.hidden = !line;
      fiat.textContent = line ? (strings.fiatApprox || '≈ {f}').split('{f}').join(line) : '';
    }
    syncCta();
  }
  el._setAmount = (v) => { if (pad) pad._set(v); };      // setRequestAmount's seam

  showStep(1);
  sync();
  renderContacts('');
  return el;
}

/* exact 1e-8 units → a plain decimal (display math only: the fiat line) */
function requestUnitsToDecimal(u) {
  const i = (u / 100000000n).toString();
  const d = (u % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
  return i + (d ? '.' + d : '');
}

/** ★ #527 — the ONE address surface: QR + full address + honest copy + Share +
 *  the "What is this address?" explainer, in a bottom sheet. The wallet Receive
 *  screen opens it from "Show my address"; the Account screen folds into it at
 *  its batch. Share always carries the BARE address (F3, #301) — the sheet knows
 *  no amount, so the old hide-while-amount rule is structural now. */
let addrSheetLive = null;                                  // loop fix: a double tap must not stack two sheets

/* ★ #591 (Damir 2026-08-26): the CONTACT surface opens this same sheet for someone
 * ELSE's address — "the address can show as sheet, same rules as elsewhere".
 * `subject: 'peer'` is the whole difference, and it is not cosmetic: every line of copy
 * here says "YOUR address", and the safety line — "sharing it is safe, it never gives
 * anyone access to your wallet" — is a claim about the READER's wallet. Pointed at a
 * contact it would be reassurance about the wrong person's money on a surface next to a
 * Pay button. So the peer variant re-words the explainer and DROPS the safety line
 * rather than re-wording it into something true but pointless.
 * `title` lets the caller name whose address it is; everything else is identical, which
 * is the point — one address surface, one set of rules (#527). */
export function openAddressSheet({ address = '', strings = getStrings(), host, onShare, subject = 'self', title = '' } = {}) {
  const peer = subject === 'peer';
  // audit m2 holds for the EXPORT too: no address, no confidently scannable garbage QR
  if (!String(address).trim()) return null;
  // loop r1 m9: a sheet torn down WITHOUT dismissOverlay (its screen closed under
  // it) left the latch set and the button dead for the document's life.
  if (addrSheetLive && !addrSheetLive.isConnected) addrSheetLive = null;
  if (addrSheetLive) return addrSheetLive;
  /* ★ W-c (Damir F5 2026-08-23): the sheet SCROLLS INTERNALLY (max-height in
     wallet-receive.css — the desktop dialog cut the chip + explainer, and a short
     phone viewport had no scroll at all), the QR card scales with min(), and the
     surface got the PREMIUM pass — this is the one address surface (Account reuses
     it, #527), so it is polished once: QR card → caption → the address chip →
     Share → the explainer block with its info disc. */
  const content = document.createElement('div');
  content.className = 'c-addr-sheet u-scroll';
  // loop r1 A-8: a capped scroll region must be keyboard-reachable — focusable, named
  content.tabIndex = 0;
  content.setAttribute('role', 'group');
  const sheetTitle = title
    || (peer ? (strings.peerAddressTitle || 'Ixian address')
             : (strings.addressInfoTitle || 'Your Ixian address'));
  content.setAttribute('aria-label', sheetTitle);
  const qrValue = address + ':ixi';                        // legacy receive format (wallet_request parity)

  /* ★★ #589 (Damir F5 2026-08-26) — HIS ORDER, not a re-interview:
   *   the info block ABOVE the QR · the address row · the safety line BELOW it.
   * The explainer used to be ONE two-column grid at the foot, so the sentence that
   * says what the thing on screen IS arrived after the thing itself, and the safety
   * reassurance sat two blocks away from the address it reassures about. Split into
   * two blocks that each sit beside what they explain. Both keep the #575
   * glyph-gutter grammar — one left edge for every line of copy — so the split
   * costs nothing that round bought. */
  /* ⚠ `variant` stamps THREE modifier classes, and only two of them carry paint
     (`__explainicon--safe` = the success tint, `__info--safe` = the stronger ink).
     `__explain--safe` is deliberately paint-free: it is the semantic hook that says
     WHICH block this is, and the order pin reads it. Naming all three from one
     `variant` is what keeps them from drifting apart. */
  const explainRow = ({ glyph, size, text, variant = '' }) => {
    const wrap = document.createElement('div');
    wrap.className = 'c-addr-sheet__explain' + (variant ? ' c-addr-sheet__explain--' + variant : '');
    const g = document.createElement('span');
    g.className = 'c-addr-sheet__explainicon' + (variant ? ' c-addr-sheet__explainicon--' + variant : '');
    g.setAttribute('aria-hidden', 'true');
    g.append(icon(glyph, { size }));
    const line = document.createElement('p');
    line.className = 'c-addr-sheet__info' + (variant ? ' c-addr-sheet__info--' + variant : '');
    line.textContent = text;
    wrap.append(g, line);
    return wrap;
  };

  content.append(explainRow({
    glyph: 'info-circle', size: 20,
    text: peer
      ? (strings.peerAddressBody
        || 'This is their address on the Ixian network. Scan the code or copy the address to send IXI.')
      : (strings.addressInfoBody
        || 'This is your address on the Ixian network. Share it, or let someone scan the code, and they can add you as a contact or send you IXI.'),
  }));

  const qrWrap = document.createElement('div');
  qrWrap.className = 'c-addr-sheet__qrwrap';
  const card = document.createElement('div');
  card.className = 'c-wallet-receive__qrcard c-addr-sheet__qrcard';   // N86 sizing rules ride along
  /* ⚠ the LAST "your" in this sheet, and the audit found it: the QR's accessible label
     is not behind the peer branch by default, so a screen-reader user opening a
     CONTACT's address heard "QR code: your Ixian address" over someone else's wallet,
     on a surface reached from a screen with a Pay button. */
  card.append(createQrSvg(qrValue, {
    label: peer
      ? (strings.peerQrLabel || 'QR code: this contact’s Ixian address')
      : (strings.qrReceiveLabel || 'QR code: your Ixian address'),
  }));
  qrWrap.append(card);
  content.append(qrWrap);

  const caption = document.createElement('p');
  caption.className = 'c-wallet-receive__caption c-addr-sheet__caption';
  caption.textContent = strings.receiveCaption || 'Scan to send IXI to this address';   // true for both subjects
  content.append(caption);

  /* full address + honest copy morph (#99 chip pattern; audit m1/m6 rules kept) */
  /* ⚠ review MINOR-6: the retired hub chip announced copy success and failure through
   * the Account hub's polite live region. Swapping an already-focused button's
   * aria-label is not a reliable announcement on TalkBack/NVDA/VoiceOver — and the
   * failure copy tells the user to "select the address text instead", which they can
   * only act on if they heard it. The sheet carries its own region. */
  const live = document.createElement('p');
  live.className = 'c-addr-sheet__live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  content.append(live);

  const addrRow = document.createElement('div');
  addrRow.className = 'c-wallet-receive__addr c-addr-sheet__addr';
  const addrValue = document.createElement('span');
  addrValue.className = 'c-wallet-receive__addrvalue u-tabular';
  addrValue.textContent = address;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'c-wallet-receive__copy';
  const copyIdle = peer
    ? (strings.copyAddress || 'Copy address')
    : (strings.copy || 'Copy') + ', ' + (strings.yourAddress || 'Your address');
  copy.setAttribute('aria-label', copyIdle);
  copy.append(icon('copy', { size: 18 }));
  let copyTimer = null;
  const copyMorph = (glyph, label) => {
    copy.textContent = '';
    copy.append(icon(glyph, { size: 18 }));
    copy.setAttribute('aria-label', label);
    live.textContent = label;                            // review MINOR-6: announce it
    copy.dataset.state = glyph === 'check' ? 'ok' : 'fail';
    if (copyTimer) clearTimeout(copyTimer);                // overlapping clicks: latest wins (audit m6)
    copyTimer = setTimeout(() => {
      copy.textContent = '';
      copy.append(icon('copy', { size: 18 }));
      copy.setAttribute('aria-label', copyIdle);
      delete copy.dataset.state;
      copyTimer = null;
    }, 1400);
  };
  copy.addEventListener('click', () => {
    // ✓ only when the write actually resolved — this is a payment address, a false
    // "Copied" is a money-adjacent lie (audit m1)
    copyText(address).then((copied) => copied   // ★ #993: + the file:// fallback (was "Couldn't copy" on every iPhone/Mac)
      ? copyMorph('check', strings.txCopied || 'Copied')
      : copyMorph('x', strings.copyFailed || 'Couldn’t copy. Select the address text instead'));
  });
  /* ★ #575 (Damir, D13/F23): SHARE IS AN ICON BESIDE COPY. It used to be a
   * full-width outline row under the chip, which "reads as a too-short bar" — a
   * button the width of the sheet for a secondary action. Copy and Share are the
   * same kind of act on the same value, so they sit together on the chip.
   * ⚠ Its own <button>, not createButton: the chip's controls are 40px icon
   * squares (wallet-receive.css), and a 44px c-button would break that row. */
  addrRow.append(addrValue, copy);
  /* ⚠ `!peer` is a COMPONENT-LEVEL fence, not a caller's discipline (round-2 review).
     `ixian:share` shares the USER'S OWN primary address (HomePage:908-913), so a Share
     control on someone else's address would send the wrong one. The shell already
     declines to pass a handler; this makes a future caller unable to reintroduce it. */
  if (onShare && !peer) {
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'c-wallet-receive__copy c-addr-sheet__sharebtn';
    share.setAttribute('aria-label', strings.shareAddress || 'Share address');
    share.append(icon('share-3', { size: 18 }));
    share.addEventListener('click', () => onShare({ address, amount: null, value: qrValue }));
    addrRow.append(share);
  }
  content.append(addrRow);

  /* the safety line, DIRECTLY under the address block it is about (#589). Same
     glyph-gutter grammar as the info block above the QR; the shield keeps its
     success tint, which is the one place the pair differ. EXACT existing keys —
     extract-strings conflict-gates on drifted fallbacks. */
  // ⚠ the safety line is SELF-ONLY. It reassures the reader about the reader's own
  // wallet; beside a contact's address it would be a true sentence about the wrong
  // person, on a surface that sits next to a Pay button.
  if (!peer) content.append(explainRow({
    glyph: 'shield-lock', size: 16, variant: 'safe',
    text: strings.addressInfoSafety
      || 'Sharing it is safe: it never gives anyone access to your wallet.',
  }));

  const sheet = createSheet({ content, host, strings, title: sheetTitle,
    onDismiss: () => { addrSheetLive = null; } });
  sheet.classList.add('c-sheet--addr');                   // W-c: desktop dialog width cap lives on the sheet
  /* ★ #575 (Damir): an explicit way OUT. The sheet is near-full height on mobile
   * now, so the scrim is a thin strip at the top — "scrim-tap only" stopped being a
   * usable exit the moment the sheet grew. Esc and light dismiss are unchanged;
   * this is an additional control, never the only one.
   * ⚠ dismissOverlay through closeSheet, so the sheet leaves by the ONE route every
   * other exit uses — the latch is cleared by onDismiss above, not here. */
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'c-addr-sheet__dismiss';
  dismiss.setAttribute('aria-label', strings.close || 'Close');
  dismiss.append(icon('x', { size: 20 }));
  dismiss.addEventListener('click', () => { try { closeSheet(sheet); } catch (e) {} });
  /* ⚠ review MINOR-5: FIRST in the DOM, not appended. The focus trap walks
   * querySelectorAll order, so an appended button is the LAST stop — after the scroll
   * region, the address and both explainer paragraphs — while every sighted user sees
   * it top-right and every keyboard user expects it there. */
  sheet.insertBefore(dismiss, sheet.firstChild);
  addrSheetLive = sheet;
  openSheet(sheet);
  return sheet;
}

/** Loop r2 n5: the screen that opened the address sheet closes it on its way out —
 *  a sheet must not outlive its screen (the takeover's Back left it + its scrim on top
 *  of the wallet home). Safe when nothing is open. */
export function closeAddressSheet() {
  const live = addrSheetLive;
  addrSheetLive = null;
  if (live && live.isConnected) { try { closeSheet(live); } catch (e) { /* already dismissing */ } }
}

/** Free fn (#44): set the request amount programmatically (tests / bridge deep-link).
 *  Numbers are expanded to plain decimal first — String(1e-7) is '1e-7', which the
 *  shared sanitizer would strip into '17': a silent magnitude change (audit C1).
 *  ★ #1263: it lands on the keypad (step 2 shows it; step 1 keeps it for later). */
export function setRequestAmount(el, amount) {
  if (!el || typeof el._setAmount !== 'function') return el;
  const plain = typeof amount === 'number'
    ? amount.toFixed(8).replace(/\.?0+$/, '')              // 1e-7 → '0.0000001', 17 → '17'
    : String(amount == null ? '' : amount);
  // ★ #1263: the KEYPAD takes it — its state is the canonical '.'-decimal string, so
  // there is no display form to round-trip and no locale to misread.
  el._setAmount(plain);
  return el;
}
