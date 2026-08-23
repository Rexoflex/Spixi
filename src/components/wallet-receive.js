/**
 * c-wallet-receive — Receive/Request, slice 3 (spec §4, #133; shape per Damir
 * 2026-07-05: ONE progressive surface, matching the send screen's grammar).
 *
 * ★ #527 SUPERSEDES the QR-first default below: the surface is REQUEST-FIRST and
 * the QR/address/copy/Share moved into `openAddressSheet` (see the block after the
 * imports). The W9 grammar below is unchanged.
 * (Historical shape, kept for context:) QR of the own address in the legacy
 * `address:ixi` format on the --surface-qr card, the FULL address in the
 * member-sheet chip pattern (#99) with an HONEST copy morph (audit m1), and
 * Share (shell duty via onShare — NO share bridge command in the legacy set).
 *
 * "Request an amount" (aria-expanded/-controls row, send-screen grammar): the amount
 * input follows wallet-send's sanitize rules (shared export), then a MULTI-SELECT
 * contact list and ONE primary CTA.
 *
 * ★ W9 (Damir, Windows F5 2026-08-13): "when I sent a request to someone I still
 * remain in the same screen with input active and I can add more … perhaps we can
 * have a multiselect as for group creation and then 1 SEND REQUEST button that then
 * confirms it was sent, and we return to wallet screen."
 *   · The rows are the GROUP-CREATION grammar, verbatim (contacts-shell pickerRow):
 *     role=checkbox + aria-checked + the trailing check circle; the rule/count line
 *     under the heading is the c-contacts__minhint pattern (SAME element, same
 *     height, text swapped — it must never reflow the list under a finger).
 *   · The per-row send arrow is GONE, and with it the whole per-row latch (state
 *     .latch / [data-acted] / the ✓ morph / the [data-needs-amount] arrow gate).
 *     Selecting is not sending, so nothing on a row needs gating any more; the
 *     amount rule moved onto the CTA, which is the only thing that can send.
 *   · Double-fire protection SURVIVES, on the CTA (#72④): `state.sending` latches
 *     for the length of the loop and the CTA is disabled with it.
 *   · The bridge verb stays PER CONTACT (`ixian:sendrequest:<addr>:<amount>`, one
 *     at a time) — this loops the existing verb, it does not invent a batch one.
 *     onSendRequest is called once per selected contact; returning `false` (or
 *     throwing) marks THAT recipient as not sent. PARTIAL FAILURE never navigates:
 *     the ones that went are deselected, the ones that did not stay selected, and
 *     the result line says so — so "try again" retries exactly the remainder.
 *   · onRequestsSent({ amount, contacts, text }) fires only on an ALL-CLEAR run;
 *     the shell toasts `text` and closes the takeover ("we return to wallet
 *     screen"). Without it the component keeps its own inline success line, so a
 *     standalone mount still confirms.
 * Amount is CANONICALIZED before it leaves ('12.'→'12', '.5'→'0.5', '007'→'7';
 * audit M1 — what leaves this surface is what a legacy parser must read).
 * ★ #303 (Damir, 2026-08-04 F5): the QR NEVER re-encodes to `address:send:amount` —
 * amount-request QRs aren't a supported flow, so the QR is constant `address:ixi`
 * and an entered amount drives ONLY the contact list (receiving/scanning
 * `address:send:` QRs from elsewhere is untouched — setSendAddress still parses it).
 * Collapsing the reveal clears the amount AND the selection (fresh state next open):
 * the visible QR must never encode an amount the user can no longer see.
 *
 * No FE money math here beyond sanitize — a request is a message, not a spend;
 * the bridge re-validates when the payer acts on it.
 *
 * createWalletReceive({ address, contacts, strings, host, onShare, onSendRequest,
 *                       onRequestsSent }) → view
 * Free fn (#44): setRequestAmount(el, amount) — programmatic amount (tests/bridge);
 *   Numbers are expanded to plain decimals first (audit C1: String(1e-7) → '1e-7'
 *   would sanitize into '17' — a silent magnitude change).
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { createAvatar } from './avatar.js';
import { createSearchField } from './search-field.js';
import { createQrSvg } from './qr.js';                     // #303: setQrValue import dropped — the QR never re-encodes
import { createSheet, openSheet } from './sheet.js';       // #527: the address moved into a bottom sheet
import { sanitizeAmount, canonicalAmount, amountInputToCanonical, groupAmountDisplay, amountCaretAfterFormat } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping
import { icon } from './icons.js';

/* ★ #527 (Damir, 2026-08-23) — RECEIVE INVERTED. The surface is REQUEST-FIRST:
 * the amount input and the W9 contact multi-select render open by default (no
 * reveal row, no collapse machinery). The QR + full address + copy + Share moved
 * into `openAddressSheet` behind a small "Show my address" button — the SAME
 * sheet surface the Account screen folds into later (one surface, #522 scope).
 * The old `el._reqOpen` hook is gone with the reveal; `setRequestAmount` now
 * only seeds the always-visible input. */

/** '0', '0.', '' → not a requestable amount (plain receive stays). */
function requestable(amount) {
  return !!amount && /[1-9]/.test(amount);
}

export function createWalletReceive({
  address = '', contacts = [], strings = getStrings(), host,
  onShare, onSendRequest, onRequestsSent,
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-wallet-receive';
  /* W9: `selected` = the addresses ticked in the multi-select; `sending` = the
     one-at-a-time latch that replaced the per-row one (#72④ double-fire guard). */
  const state = { amount: '', contactQuery: '', selected: new Set(), sending: false };

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

  /* ——— header row (#527): the request heading + the small "Show my address"
   * button. The QR, the full address, copy, Share and the explainer all live in
   * the sheet now — one surface, reused by Account later. */
  const head = document.createElement('div');
  head.className = 'c-wallet-receive__head';
  const reqLabel = document.createElement('h2');
  reqLabel.className = 'c-wallet-receive__asklabel';
  reqLabel.textContent = strings.requestAmount || 'Request an amount';
  const addrBtn = createButton({
    label: strings.showMyAddress || 'Show my address', type: 'outline', size: 32,
    icon: icon('qrcode', { size: 16 }),
    onClick: () => openAddressSheet({ address, strings, host, onShare }),
  });
  addrBtn.classList.add('c-wallet-receive__addrbtn');
  head.append(reqLabel, addrBtn);
  el.append(head);

  /* hidden live region (audit m3/M3): announces the request-sent confirmation —
     not every keystroke (the caption used to be aria-live and spammed) */
  const live = document.createElement('p');
  live.className = 'c-wallet-receive__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  const amtRow = document.createElement('div');
  amtRow.className = 'c-wallet-receive__amountrow';
  const amtInput = document.createElement('input');
  amtInput.className = 'c-wallet-receive__amount u-tabular';
  amtInput.type = 'text';
  amtInput.inputMode = 'decimal';                          // mobile decimal pad (#136④ parity)
  amtInput.placeholder = '0';
  amtInput.setAttribute('aria-label', strings.requestAmount || 'Request an amount');
  const unit = document.createElement('span');
  unit.className = 'c-wallet-receive__unit';
  unit.textContent = 'IXI';
  amtRow.append(amtInput, unit);
  el.append(amtRow);

  /* contact strip — request-as-message (legacy ixian:sendrequest → chat payment
   * bubble). ONLY rendered when onSendRequest is wired: the home wallet tab
   * (HomePage) has NO ixian:sendrequest verb (it's a WalletReceivePage verb), so
   * omitting the callback HIDES the strip rather than showing a dead action that
   * would falsely confirm "sent" (audit MAJOR, Batch 6). The amount-request QR
   * above is client-side and stays available regardless. */
  let askBox = null;
  let rows = null;
  let hint = null;
  let result = null;
  let cta = null;
  let ctaLabel = null;
  if (onSendRequest) {
    askBox = document.createElement('div');
    askBox.className = 'c-wallet-receive__ask';
    // W6/W9: the list is never gated as a whole and its rows are never disabled —
    // ticking a name is not a send, so it costs nothing before an amount exists.
    // The rule/count line below states what is still missing (c-contacts__minhint
    // grammar), and the CTA is the only thing that can actually fire.
    const askLabel = document.createElement('h2');
    askLabel.className = 'c-wallet-receive__asklabel';
    askLabel.textContent = strings.requestFromWho || 'Who to request from';
    hint = document.createElement('p');
    hint.className = 'c-wallet-receive__hint';
    // role=status (not note): the line SWAPS between the unmet rule and the live
    // count in place, and that swap is the only feedback a SR user gets for a tick.
    hint.setAttribute('role', 'status');
    hint.textContent = strings.requestNeedsAmount || 'Enter an amount to send a request';
    askBox.append(askLabel, hint);
    const search = createSearchField({
      placeholder: strings.searchContacts || 'Search contacts',
      onInput: (v) => renderContacts(v),
      /* NO onSubmit. §W6 says "same for Enter-to-send IF the search field
         supports it" — a permission to extend an EXISTING path, not to mint
         one. Enter in a search box is a filter/dismiss gesture; wiring it to
         "send to whoever is currently first" fires real money-request messages
         at an arbitrary contact with no confirm step (an empty query sends to
         the first contact in the roster, and a soft keyboard's Go key fires it
         too). Sending stays the explicit CTA press below. (#46 audit) */
      strings,
    });
    askBox.append(search);
    rows = document.createElement('div');
    rows.className = 'c-wallet-receive__contacts';   // scrolls (Damir F5); NO card/.u-scroll — both added padding inside the request box
    /* W9: an independent multi-select roster — the same container role group
       creation's checkbox list carries (contacts-shell renders bare checkbox rows
       for the group case; radiogroup is the app-pick single-select variant). */
    rows.setAttribute('role', 'group');
    rows.setAttribute('aria-label', strings.requestFromWho || 'Who to request from');
    askBox.append(rows);
    /* W9 result line — the VISIBLE half of the send outcome (success or partial
       failure). aria-hidden: the hidden live region above is the single announcer,
       so a screen reader hears the outcome once, not twice. */
    result = document.createElement('p');
    result.className = 'c-wallet-receive__result';
    result.setAttribute('aria-hidden', 'true');
    result.hidden = true;
    askBox.append(result);
    /* W9 CTA — ONE primary action, carrying BOTH levers it commits: the amount and
       how many people it goes to. On a money surface the button is the last thing
       the eye is on, so it restates the number the user typed (a mistyped amount
       stays visible at the moment of commitment) and the count (a stray tick is
       visible too). "(3)" keeps it one short line in every locale; the full
       sentence lives in aria-label. */
    cta = createButton({
      label: strings.sendRequest || 'Send request',
      type: 'fill', size: 44, width: 'full',
      disabled: true,
      onClick: () => sendRequests(),
    });
    cta.classList.add('c-wallet-receive__cta');
    ctaLabel = cta.querySelector('.c-button__label');
    askBox.append(cta);
    el.append(askBox);                                     // #527: always visible — no reveal box
  }

  /* W9: the CTA is the whole gate now. Applied IN PLACE (no re-render) so a
   * keystroke never rebuilds 50 avatars or drops the list's scroll position —
   * the same reason applyAmountGate existed before it. */
  function selectedContacts() {
    // filtered from the FULL roster, not the rendered rows: a selection made
    // before a search must not be silently dropped by the search that follows.
    return contacts.filter((c) => c && c.address && state.selected.has(c.address));
  }
  function syncCta() {
    const n = state.selected.size;
    const amount = requestable(state.amount) ? canonicalAmount(state.amount) : '';
    const ready = !!amount && n > 0;
    if (hint) {
      // Damir F5 2026-07-29 (contacts-shell precedent): the line STAYS and only
      // changes what it says — hiding it collapses its box and jumps the list.
      hint.textContent = !amount
        ? (strings.requestNeedsAmount || 'Enter an amount to send a request')
        : (n ? (strings.selectedCount || '{n} selected').split('{n}').join(String(n))
          : (strings.requestPickContacts || 'Pick at least one contact.'));
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
   * a partial failure (see docblock). #72④ lives here now: `state.sending` latches
   * for the loop so a double-tap (or a synthetic click) cannot re-enter it. */
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
      // recipient did not go — the rest of the loop still runs, so one bad
      // address cannot swallow the requests queued behind it.
      try { sent = onSendRequest({ contact: c, amount }) !== false; }
      catch (e) { sent = false; }
      if (sent) state.selected.delete(c.address); else failed.push(c);
    }
    state.sending = false;
    const sentCount = targets.length - failed.length;
    renderContacts(state.contactQuery);                    // repaint the ticks (the sent ones cleared)
    if (failed.length) {
      // Stay put. The failures are still ticked, so the CTA now retries exactly
      // the remainder — and the count in its label says how many that is.
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
    state.amount = '';
    amtInput.value = '';
    sync();
    showResult(text, 'ok');
    // "and we return to wallet screen" — the shell confirms (toast) and closes the
    // takeover. No onRequestsSent (standalone mount) → the inline line above IS
    // the confirmation and the surface stays.
    if (onRequestsSent) onRequestsSent({ amount, contacts: targets, text });
  }

  function renderContacts(q) {
    if (!rows) return;                                   // contact strip omitted (no onSendRequest)
    state.contactQuery = q || '';
    const needle = state.contactQuery.trim().toLocaleLowerCase();
    rows.textContent = '';
    const list = contacts.filter((c) => !needle
      || (c.name || '').toLocaleLowerCase().includes(needle)
      || (c.address || '').toLocaleLowerCase().includes(needle));
    // Damir F5 2026-07-29: the old 5/8 cap meant the roster visibly "cut off" and the
    // only way to anyone else was to type. The strip scrolls now (wallet-receive.css),
    // so the cap is purely a DOM-size guard for very large rosters — high enough that
    // scrolling reaches everyone in practice, with the "keep typing" note below still
    // covering the tail.
    const cap = 50;
    for (const c of list.slice(0, cap)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-wallet-receive__contact';
      // #342 (Damir F5 item (d)): pass the photo. Option: contacts[].avatar. The roster that feeds this picker
      // carries `avatar` (home.html requestableContacts → contactsRoster), and every
      // other contact row in the app shows it. Only this one dropped the argument, so
      // the request-from-a-contact list was all gradients while the chats list beside
      // it showed real faces. `|| null` keeps the gradient fallback for a contact with
      // no stored avatar, which is the correct render, not a failure.
      b.append(createAvatar({ name: c.name, address: c.address, src: c.avatar || null, size: 40 }));
      const t = document.createElement('span');
      t.className = 'c-wallet-receive__contactname';
      t.textContent = c.name || c.address;
      /* W9 — the group-creation row grammar (contacts-shell pickerRow): an
         independent multi-select roster is role=checkbox + aria-checked (NOT
         aria-pressed, which is for toggle buttons), with the trailing check
         circle as the affordance. */
      const check = document.createElement('span');
      check.className = 'c-wallet-receive__check';
      check.setAttribute('aria-hidden', 'true');
      check.append(icon('check', { size: 16 }));
      b.append(t, check);
      b.setAttribute('role', 'checkbox');
      b.setAttribute('aria-checked', String(state.selected.has(c.address)));
      b.addEventListener('click', () => {
        // A tick is not a send — no amount gate here, and no latch. Patched in
        // place so the tapped row keeps keyboard focus (contacts-shell rule).
        const on = !state.selected.has(c.address);
        if (on) state.selected.add(c.address); else state.selected.delete(c.address);
        b.setAttribute('aria-checked', String(on));
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

  function sync() {
    // #527: the QR/Share honesty rules moved into the sheet (bare address, always).
    // W6/W9: askBox is NEVER hidden by the amount — the list stays browsable and
    // tickable; only the CTA reacts.
    syncCta();
  }

  amtInput.addEventListener('input', (e) => {
    // ★ I-6 (#360): locale-grouped display in the field; canonical value in
    // state (#77 wire untouched). Caret follows the digit count. Loop r1
    // CRITICAL-1: per-edit inverse for typing/deletion, settled heuristic
    // only for paste/synthetic dispatches.
    const disp = amtInput.value;
    const caret = amtInput.selectionStart;
    const v = sanitizeAmount(amountInputToCanonical(disp, caret, e, undefined, !!state.amount));   // r2 MAJOR-1: pre-edit emptiness routes
    const shown = groupAmountDisplay(v);
    if (shown !== disp) {
      amtInput.value = shown;
      const c = amountCaretAfterFormat(disp, caret, shown);
      try { amtInput.setSelectionRange(c, c); } catch (e) { /* unfocused/unsupported */ }
    }
    state.amount = v;
    // W9: a new amount invalidates a stale outcome line (audit M5's honesty rule,
    // now on the result line — there is no per-row ✓ left to go stale). The
    // SELECTION survives: who you are asking is a different axis from how much.
    if (result && !result.hidden) showResult('', 'ok');
    sync();
  });

  sync();
  renderContacts('');
  return el;
}

/** ★ #527 — the ONE address surface: QR + full address + honest copy + Share +
 *  the "What is this address?" explainer, in a bottom sheet. The wallet Receive
 *  screen opens it from "Show my address"; the Account screen folds into it at
 *  its batch. Share always carries the BARE address (F3, #301) — the sheet knows
 *  no amount, so the old hide-while-amount rule is structural now. */
let addrSheetLive = null;                                  // loop fix: a double tap must not stack two sheets

export function openAddressSheet({ address = '', strings = getStrings(), host, onShare } = {}) {
  // audit m2 holds for the EXPORT too: no address, no confidently scannable garbage QR
  if (!String(address).trim()) return null;
  if (addrSheetLive) return addrSheetLive;
  const content = document.createElement('div');
  content.className = 'c-addr-sheet';
  const qrValue = address + ':ixi';                        // legacy receive format (wallet_request parity)

  const card = document.createElement('div');
  card.className = 'c-wallet-receive__qrcard';             // N86 sizing rules ride along unchanged
  card.append(createQrSvg(qrValue, { label: strings.qrReceiveLabel || 'QR code: your Ixian address' }));
  content.append(card);

  const caption = document.createElement('p');
  caption.className = 'c-wallet-receive__caption';
  caption.textContent = strings.receiveCaption || 'Scan to send IXI to this address';
  content.append(caption);

  /* full address + honest copy morph (#99 chip pattern; audit m1/m6 rules kept) */
  const addrRow = document.createElement('div');
  addrRow.className = 'c-wallet-receive__addr';
  const addrValue = document.createElement('span');
  addrValue.className = 'c-wallet-receive__addrvalue u-tabular';
  addrValue.textContent = address;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'c-wallet-receive__copy';
  const copyIdle = (strings.copy || 'Copy') + ', ' + (strings.yourAddress || 'Your address');
  copy.setAttribute('aria-label', copyIdle);
  copy.append(icon('copy', { size: 16 }));
  let copyTimer = null;
  const copyMorph = (glyph, label) => {
    copy.textContent = '';
    copy.append(icon(glyph, { size: 16 }));
    copy.setAttribute('aria-label', label);
    if (copyTimer) clearTimeout(copyTimer);                // overlapping clicks: latest wins (audit m6)
    copyTimer = setTimeout(() => {
      copy.textContent = '';
      copy.append(icon('copy', { size: 16 }));
      copy.setAttribute('aria-label', copyIdle);
      copyTimer = null;
    }, 1400);
  };
  copy.addEventListener('click', () => {
    // ✓ only when the write actually resolved — this is a payment address, a false
    // "Copied" is a money-adjacent lie (audit m1)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).then(
        () => copyMorph('check', strings.txCopied || 'Copied'),
        () => copyMorph('x', strings.copyFailed || 'Couldn’t copy. Select the address text instead'),
      );
    } else {
      copyMorph('x', strings.copyFailed || 'Couldn’t copy. Select the address text instead');
    }
  });
  addrRow.append(addrValue, copy);
  content.append(addrRow);

  if (onShare) {
    content.append(createButton({
      label: strings.shareAddress || 'Share address', type: 'outline', size: 44, width: 'full',
      icon: icon('share-3', { size: 18 }),
      onClick: () => onShare({ address, amount: null, value: qrValue }),
    }));
  }

  /* the folded-in explainer (ONE surface — no second address-info sheet).
     EXACT existing keys — extract-strings conflict-gates on drifted fallbacks. */
  const info = document.createElement('p');
  info.className = 'c-addr-sheet__info';
  info.textContent = strings.addressInfoBody
    || 'This is your address on the Ixian network. Share it, or let someone scan the code, and they can add you as a contact or send you IXI.';
  content.append(info);
  const safety = document.createElement('p');
  safety.className = 'c-addr-sheet__info';
  safety.textContent = strings.addressInfoSafety
    || 'Sharing it is safe: it never gives anyone access to your wallet.';
  content.append(safety);

  const sheet = createSheet({ content, host, strings, title: strings.addressInfoTitle || 'Your Ixian address',
    onDismiss: () => { addrSheetLive = null; } });
  addrSheetLive = sheet;
  openSheet(sheet);
  return sheet;
}

/** Free fn (#44): set the request amount programmatically (tests / bridge deep-link).
 *  Numbers are expanded to plain decimal first — String(1e-7) is '1e-7', which the
 *  shared sanitizer would strip into '17': a silent magnitude change (audit C1).
 *  #527: the input is always visible now — no reveal to open first. */
export function setRequestAmount(el, amount) {
  if (!el) return el;
  const input = el.querySelector('.c-wallet-receive__amount');
  if (!input) return el;
  const plain = typeof amount === 'number'
    ? amount.toFixed(8).replace(/\.?0+$/, '')              // 1e-7 → '0.0000001', 17 → '17'
    : String(amount == null ? '' : amount);
  // ★ I-6 (#360): seed the DISPLAY form — the handler ungroups what it reads,
  // and a raw '.'-decimal canonical in a ','-decimal locale could misread.
  input.value = groupAmountDisplay(plain);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return el;
}
