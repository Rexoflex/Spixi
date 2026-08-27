/**
 * c-wallet-send — the send flow, slice 2 (spec §3, #133: ONE screen + review sheet).
 * Replaces the legacy 3-page hop (wallet_send → send2 → sent):
 *
 * ★ W-i (Damir, screenshots 2026-08-23): AMOUNT ON TOP. Both money screens lead
 * with the amount — you decide how much first, and the number stays visible while
 * you browse. Order: amount section (input + Available + fee line + Max) → the
 * recipient section (search → "Send to an address" → the contact list; a picked
 * recipient REPLACES the list) → Review at the bottom.
 *
 * 1. AMOUNT — decimal-sanitized input (≤8 decimals, chain precision), Available line,
 *    Max (balance − fee, #77 truncation), live fee + total; inline insufficient error.
 *    ★ W-k: `enterkeyhint` + Enter/Next/Go → blur(), so the soft keyboard drops and
 *    the contact list under it is browsable right after typing.
 * 2. RECIPIENT — search over contacts OR a raw address input ("Send to an address"
 *    reveal) OR QR (`ixian:sendScan` via onQuickScan; the shell calls setSendAddress /
 *    setSendRecipient with the scan result). Selecting shows a recipient row with ✕.
 *    ★ W-j: the rows are the shared c-contact-row (the Contacts DIRECTORY anatomy:
 *    avatar-48 + name + truncated address + online dot) — contact-row.js.
 * 3. REVIEW = c-sheet (#26 deliberateness step): recipient · amount · fee · total +
 *    explicit Confirm (latched → loading, #29/#72④) / Cancel. onSend(payload, ctrl) —
 *    the bridge runs the real send: ctrl.done() → success morph → onDone(payload)
 *    (shell returns home; the pending row arrives via addPaymentActivity); ctrl.fail(msg)
 *    → inline error in the sheet, Confirm re-enabled (retry stays possible).
 *    ★ W-d: the sheet is the exported `openPaymentReview` — the chat's request-in
 *    Pay opens the SAME sheet (fee quoted live) before the native confirm.
 *
 * Numbers: user input is RAW here (the one surface where FE math is unavoidable —
 * validation + Max + total); display strings still follow #77 (truncate, never round).
 * The bridge remains the source of truth and re-validates on its side.
 * Legacy multi-recipient stays commented out C#-side — payload is single-recipient but
 * shaped plural-ready ({ recipients: [ { address, name? } ] }).
 *
 * createWalletSend({ contacts, balance, fee, strings, host,
 *                    onQuickScan, onSend, onDone }) → view
 * Free fns (#44): setSendAddress(el, address) — QR-scan result lands in the address path.
 *                 setSendRecipient(el, contact) — ★ W-f: programmatic contact pick (a
 *                 scanned address that IS a contact shows nickname + avatar, not raw).
 *
 * ★ W6 (#523): `fee: null` = UNKNOWN. The fee line shows a pending state, Max is
 * disabled, and Continue stays disabled until a quote lands — no invented fee, ever.
 * New opt `onQuote(address, amount)` fires (debounced, deduped) when both recipient
 * and a positive amount exist; the shell answers via the free fn
 * `setSendQuote(el, { fee, balance })`. The displayed fee stays an ESTIMATE — the
 * NATIVE confirm shows C#'s own numbers and is the authority (SECURITY.md).
 * ★ ctrl.fail('') = SILENT re-enable (the user canceled the native confirm — no
 * error text); any non-empty msg renders as before.
 * ★ #255: a contact row with `pending: true` renders a "Request sent" tag — a request
 * you sent that the peer has not accepted. Still pickable (money goes to the
 * address, not the friendship); the tag is the honest signal.
 */
import { getStrings } from './strings-runtime.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { setOverlayOpts, isOverlayOpen, overlayId } from './overlay.js';   // overlayId: the house id mint (F5-6 hint)
import { icon } from './icons.js';
import { createContactRow, createGlyphRow } from './contact-row.js';   // ★ W-j shared row
import { attachAmountKeyboardDismiss } from './amount-keyboard.js';   // ★ #609: moved to a shared module — three consumers now (#143 ②)
import { sanitizeAmount, toUnits, canonicalAmount, amountInputToCanonical, attachAmountPreEdit, groupAmountDisplay, amountCaretAfterFormat } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping

/* fromUnits is wallet-send-only (Max display); its inverse toUnits + the
   sanitize/canonical helpers now live in money.js (#143 dedupe). */
function fromUnits(u) {
  const neg = u < 0n;
  const a = neg ? -u : u;
  const i = (a / 100000000n).toString();
  const d = (a % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
  return (neg ? '-' : '') + i + (d ? '.' + d : '');
}


let walletSendSeq = 0;                                     // aria-controls ids (receive-audit n2)

export function createWalletSend({
  contacts = [], balance = 0, fee = 0, strings = getStrings(), host,
  lockedRecipient = null,   // chat Pay (#139): { name?, address } — pre-picked, NO change (the peer is known)
  onQuickScan, onQuote, onSend, onDone,
} = {}) {
  // NB contract: balance/fee are RAW numerics (number or plain decimal string) — this is
  // the one FE surface doing money math. Pre-formatted display strings (hero-style
  // '923,852.00') are NOT valid inputs here. fee === null → unknown until a quote (#523).
  const el = document.createElement('div');
  el.className = 'c-wallet-send';
  const addrFieldId = 'c-wallet-send-addrfield-' + (++walletSendSeq);
  let balU = toUnits(balance);
  let feeU = (fee === null || fee === undefined) ? null : toUnits(fee);
  const state = { recipient: null, amount: '', sending: false, attempt: 0, review: null };   // review = the ONE open sheet (loop r1 M4)
  let quoteTimer = null;
  let lastQuoteKey = '';
  let quotedKey = '';                                      // the (addr:amount) pair feeU actually ANSWERS
  let maxSendU = null;                                     // C#'s solved max-sendable (amount-0 quote)
  let addrErr = false;                                     // C# rejected the picked address (quote error)
  /* ★★ V-4: `state.amount` is the FIELD's value and it stays un-canonical, so the
     user can still see a mid-typed `12.` or `.5`. Every boundary that leaves this
     component takes the CANONICAL form instead. `valid()` accepted `.5` while
     `openPaymentReview`'s own gate rejected it, so Continue was enabled and did
     nothing, forever. The quote KEY is canonical too: C# echoes back what we sent,
     and a key built from `.5` could never match an echo of `0.5`. */
  const canonAmount = () => canonicalAmount(state.amount || '');
  const currentKey = () => (state.recipient ? state.recipient.address + ':' + canonAmount() : '');
  function requestQuote() {
    // W6: ask the shell for a real fee when both halves exist; dedupe on (addr, amount).
    if (!onQuote || !state.recipient) return;
    const a = canonAmount();
    if (!a || amountU() <= 0n) return;
    const key = state.recipient.address + ':' + a;
    if (key === lastQuoteKey) return;
    if (quoteTimer) clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => {
      quoteTimer = null;
      // loop NIT fix: re-check the AMOUNT too — a cleared field must not emit
      // an empty-amount query (and latch its key)
      if (!state.recipient || !state.amount || amountU() <= 0n) return;
      const k = currentKey();
      if (k === lastQuoteKey) return;
      lastQuoteKey = k;
      onQuote(state.recipient.address, canonAmount());
    }, 350);
  }

  /* ——— amount section (★ W-i: FIRST) ——— */
  const amtSec = document.createElement('section');
  amtSec.className = 'c-wallet-send__section c-wallet-send__section--amount';
  const amtTitle = document.createElement('h2');
  amtTitle.className = 'c-wallet-send__label';
  amtTitle.textContent = strings.amount || 'Amount';
  amtSec.append(amtTitle);

  const amtRow = document.createElement('div');
  amtRow.className = 'c-wallet-send__amountrow';
  const amtInput = document.createElement('input');
  amtInput.className = 'c-wallet-send__amount u-tabular';
  amtInput.type = 'text';
  amtInput.inputMode = 'decimal';
  amtInput.placeholder = '0';
  amtInput.setAttribute('aria-label', strings.amount || 'Amount');
  attachAmountKeyboardDismiss(amtInput);                   // ★ W-k
  /* ★★ V-1: the pre-edit snapshot. A select-all-and-paste is the one edit
     whose separators are NOT ours, and only the REPLACED RANGE says so. */
  const readPreEdit = attachAmountPreEdit(amtInput);
  amtInput.addEventListener('input', (e) => {
    // ★ I-6 (#360): the field DISPLAYS the locale's grouping as you type; the
    // canonical '.'-decimal ungrouped value lives in state.amount and is the
    // only thing the wire layer ever sees (#77 untouched). Caret rides the
    // digit count, so inserted separators never displace it.
    // Loop r1 CRITICAL-1: typing/deletion edits take the per-edit inverse
    // (strip OUR separators unconditionally; a just-typed '.'/',' is decimal
    // intent) — pattern-guessing on a mid-edit string mangled magnitudes.
    const disp = amtInput.value;
    const caret = amtInput.selectionStart;
    const v = sanitizeAmount(amountInputToCanonical(disp, caret, e, undefined, !!state.amount, readPreEdit()));   // ★★ V-1: the REPLACED RANGE routes (r2 MAJOR-1 still holds for a partial edit)
    state.amount = v;
    const shown = groupAmountDisplay(v);
    if (shown !== disp) {
      amtInput.value = shown;
      const c = amountCaretAfterFormat(disp, caret, shown);
      try { amtInput.setSelectionRange(c, c); } catch (e) { /* unfocused/unsupported */ }
    }
    sync();
  });
  const unit = document.createElement('span');
  unit.className = 'c-wallet-send__unit';
  unit.textContent = 'IXI';
  const maxBtn = createButton({ label: strings.max || 'Max', type: 'outline', size: 32,
    onClick: () => {
      // sending EVERYTHING deserves a deliberate stop (Damir #136): explicit confirm,
      // safe action autofocused (APG), only then the field fills
      // ★ round-2 MAJOR fix: the onClick fallback MUST use the SAME predicate as the
      // maxBtn.disabled state below — `fresh` honours static-fee mode (!quoteFlow),
      // and a mismatch left Max enabled-but-inert for every static-fee integrator.
      const maxU = maxSendU !== null ? maxSendU
        : ((feeU !== null && (!quoteFlow || quotedKey === currentKey())) ? balU - feeU : null);
      if (maxU === null) return;                         // no honest ceiling yet (W6)
      // #150⑥ grammar (Damir 2026-07-05): the Max stop wears the standing
      // warning STRIP (error-tonal wash + alert glyph) — ADAPTED text: the
      // fill itself is editable, it's the payment that can't be undone
      const maxWarn = document.createElement('p');
      maxWarn.className = 'c-wallet-send__max-warn';
      maxWarn.append(icon('alert-square-rounded', { size: 18 }),
        document.createTextNode(strings.paymentsCannotUndo || 'Payments cannot be undone.'));
      openModal(createModal({
        title: strings.maxTitle || 'Send your entire balance?',
        body: (strings.maxBody || 'This fills in everything you have: {m} IXI after the network fee. You would be left with 0 IXI.')
          .split('{m}').join(groupAmountDisplay(fromUnits(maxU > 0n ? maxU : 0n))),   // ★ I-6 (#360)
        content: maxWarn,
        role: 'alertdialog', host,
        actions: [
          { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
          { label: strings.maxConfirm || 'Yes, I understand', type: 'fill', onClick: () => {
            state.amount = fromUnits(maxU > 0n ? maxU : 0n);   // exact integer units — never overshoots
            amtInput.value = groupAmountDisplay(state.amount); // ★ I-6 (#360): display form in the field
            sync();
          } },
        ],
      }));
    } });
  amtRow.append(amtInput, unit, maxBtn);
  amtSec.append(amtRow);

  /* ★ F5-6 (#558, Damir 2026-08-25 — dial answered: option B). Max stays gated
     until a recipient is picked (#523: Max = balance − fee, the fee needs a
     quote, a quote needs a recipient — no invented numbers). The gate now
     EXPLAINS itself: one quiet hint line while no recipient is set, gone the
     moment one is. aria-describedby ties it to the disabled control. */
  const maxHint = document.createElement('p');
  maxHint.className = 'c-wallet-send__meta c-wallet-send__maxhint';
  maxHint.id = overlayId('c-ws-maxhint');   // house id mint
  maxHint.textContent = strings.maxNeedsRecipient || 'Select a recipient to use Max.';
  amtSec.append(maxHint);

  const availLine = document.createElement('p');
  availLine.className = 'c-wallet-send__meta u-tabular';
  const renderAvail = () => {
    availLine.textContent = (strings.available || 'Available: {b} IXI').split('{b}').join(groupAmountDisplay(fromUnits(balU)));   // ★ I-6 (#360)
  };
  renderAvail();
  amtSec.append(availLine);

  const feeLine = document.createElement('p');
  feeLine.className = 'c-wallet-send__meta u-tabular';
  feeLine.setAttribute('role', 'status');                  // the fee arriving IS the unlock signal (loop a11y)
  amtSec.append(feeLine);

  const insuff = document.createElement('p');
  insuff.className = 'c-wallet-send__error';
  insuff.setAttribute('role', 'alert');
  insuff.hidden = true;
  amtSec.append(insuff);
  el.append(amtSec);

  /* ——— recipient section (★ W-i: SECOND) ——— */
  const recSec = document.createElement('section');
  recSec.className = 'c-wallet-send__section c-wallet-send__section--recipient';
  const recTitle = document.createElement('h2');
  recTitle.className = 'c-wallet-send__label';
  recTitle.textContent = strings.sendTo || 'Send to';
  recSec.append(recTitle);

  /* selected recipient row (hidden until picked). Loop r1 A-6: a focusable GROUP
     with an accessible name, so a pick has a named focus target; the hidden live
     line below announces it (the receive screen's `__live` grammar). */
  const picked = document.createElement('div');
  picked.className = 'c-wallet-send__picked';
  picked.hidden = true;
  picked.tabIndex = -1;
  picked.setAttribute('role', 'group');
  recSec.append(picked);
  const live = document.createElement('p');
  live.className = 'c-wallet-send__live';
  live.setAttribute('aria-live', 'polite');
  recSec.append(live);

  /* picker: search + contact rows + address reveal */
  const picker = document.createElement('div');
  picker.className = 'c-wallet-send__picker';
  const search = createSearchField({
    placeholder: strings.searchContacts || 'Search contacts',
    onInput: (v) => renderContacts(v),
    strings,
  });
  picker.append(search);
  // loop r1 m6: the address row and the contact rows share ONE card, so the glyph
  // and the avatars sit on the same left edge (the directory card grammar).
  const listCard = document.createElement('div');
  listCard.className = 'c-wallet-send__list';
  picker.append(listCard);
  const rows = document.createElement('div');
  rows.className = 'c-wallet-send__contacts';           // appended after the address row below

  // "Send to an address" sits ON TOP of the contacts, aligned with them — a contact-style
  // row whose avatar slot is the qrcode glyph (Damir #136); tapping expands the input below.
  // ★ W-j: built by the shared glyph-row builder, so it is the directory anatomy too.
  const addrRow = createGlyphRow({
    glyph: 'qrcode', label: strings.sendToAddress || 'Send to an address',
    className: 'c-wallet-send__contact c-wallet-send__addrrow',
  });
  addrRow.setAttribute('aria-expanded', 'false');
  addrRow.setAttribute('aria-controls', (addrFieldId));   // reveal linked for AT (receive-audit n2, applied here too)
  listCard.append(addrRow);

  const addrField = document.createElement('div');
  addrField.className = 'c-wallet-send__addrfield';
  addrField.id = addrFieldId;
  addrField.hidden = true;
  const addrInput = document.createElement('input');
  addrInput.className = 'c-wallet-send__addrinput';
  addrInput.type = 'text';
  addrInput.autocomplete = 'off';
  addrInput.spellcheck = false;
  addrInput.placeholder = strings.ixianAddress || 'Ixian address';
  addrInput.setAttribute('aria-label', strings.ixianAddress || 'Ixian address');
  addrField.append(addrInput);
  if (onQuickScan) {                                     // #264 no-dead-buttons: no handler → no scan button
    const scanBtn = document.createElement('button');
    scanBtn.type = 'button';
    scanBtn.className = 'c-wallet-send__scan';
    scanBtn.setAttribute('aria-label', strings.scan || 'Scan');
    scanBtn.append(icon('scan', { size: 20 }));
    scanBtn.addEventListener('click', onQuickScan);      // → ixian:sendScan; result via setSendAddress
    addrField.append(scanBtn);
  }
  const addrUse = createButton({
    label: strings.useAddress || 'Use this address', type: 'outline', size: 44, width: 'full',
    onClick: () => {
      const a = addrInput.value.trim();
      if (a.length < 12) { setSendError(el, strings.badAddress || 'That doesn’t look like an Ixian address.'); return; }
      pick({ address: a });
    },
  });
  addrField.append(addrUse);
  listCard.append(addrField);
  addrRow.addEventListener('click', () => {
    const open = addrField.hidden;
    addrField.hidden = !open;
    addrRow.setAttribute('aria-expanded', String(open));
    if (open) addrInput.focus();
  });

  listCard.append(rows);                                 // contacts BELOW the address row (Damir #136)

  const errLine = document.createElement('p');
  errLine.className = 'c-wallet-send__error';
  errLine.setAttribute('role', 'alert');
  errLine.hidden = true;
  addrField.append(errLine);   // under the input it validates — it rendered BELOW the contacts (Damir bug, round 3)
  recSec.append(picker);
  el.append(recSec);

  function renderContacts(q) {
    const needle = (q || '').trim().toLocaleLowerCase();
    rows.textContent = '';
    const list = contacts.filter((c) => !needle
      || (c.name || '').toLocaleLowerCase().includes(needle)
      || (c.address || '').toLocaleLowerCase().includes(needle))
      .sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || ''));
    // #142 (Damir 2026-07-05c): NO caps — the #136 window forced you to know
    // the name; the full A–Z list scrolls and search narrows. The amount
    // section never competes: picking COLLAPSES the picker to the picked row,
    // and until a recipient exists the amount can't be submitted anyway.
    for (const c of list) {
      // ★ W-j: the shared directory row (avatar-48 + name + truncated address +
      // online dot; #255 pending badge). The surface class stays as an alias for
      // the shells/pins; the anatomy lives in contact-row.css.
      rows.append(createContactRow({
        contact: c, strings, className: 'c-wallet-send__contact',
        onClick: () => pick({ ...c, contact: true }),
      }));
    }
    if (!list.length && needle) {
      const none = document.createElement('p');
      none.className = 'c-wallet-send__none';
      none.setAttribute('role', 'note');
      none.textContent = (strings.noContactMatch || 'No contact matches “{q}”. You can paste their address instead.').split('{q}').join(q);
      rows.append(none);
    }
  }

  function pick(recipient) {
    if (!recipient || !recipient.address) return;          // loop r2 R2-4: no address, no recipient (the F2 rule, Send side)
    state.recipient = recipient;
    errLine.hidden = true;
    addrErr = false;                                       // a new recipient gets a fresh verdict
    maxSendU = null;
    picked.textContent = '';
    picked.hidden = false;
    picker.hidden = true;
    if (recipient.contact) picked.append(createAvatar({ name: recipient.name, address: recipient.address, src: recipient.avatar || null, size: 48, online: !!recipient.online }));
    else {
      const glyph = document.createElement('span');
      glyph.className = 'c-wallet-send__pickedglyph';
      glyph.append(icon('qrcode', { size: 22 }));
      picked.append(glyph);
    }
    // ★ W-b: the picked stack is NAME over the MUTED TRUNCATED address (#211) —
    // a raw-address pick titles as the truncated address with an "Address" sub.
    // The FULL address is shown at the decision moment, on the review sheet (#99).
    const pt = document.createElement('span');
    pt.className = 'c-wallet-send__pickedtext';
    const pn = document.createElement('span');
    pn.className = 'c-wallet-send__pickedname';
    const hasName = !!recipient.name && recipient.name !== recipient.address;
    pn.textContent = hasName ? recipient.name : truncateAddressMiddle(recipient.address, 9, 6);
    pt.append(pn);
    const pa = document.createElement('span');
    pa.className = 'c-wallet-send__pickedaddr u-tabular';
    pa.textContent = hasName ? truncateAddressMiddle(recipient.address, 9, 6) : (strings.address || 'Address');
    pt.append(pa);
    picked.append(pt);
    picked.setAttribute('aria-label', (strings.sendTo || 'Send to') + ': ' + pn.textContent);
    live.textContent = (strings.sendTo || 'Send to') + ': ' + pn.textContent;
    addrRow.setAttribute('aria-expanded', 'false');       // loop r1 A-5: the field is hidden with the picker
    if (!lockedRecipient) {                              // locked = the peer is fixed, no ✕ (#139)
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'c-wallet-send__clear';
      clear.setAttribute('aria-label', strings.changeRecipient || 'Change recipient');
      clear.append(icon('x', { size: 18 }));
      clear.addEventListener('click', () => {
        state.recipient = null;
        lastQuoteKey = '';                               // a new recipient must re-quote (W6)
        quotedKey = '';                                  // …and the old answer is nobody's (loop MAJOR)
        feeU = (fee === null || fee === undefined) ? null : toUnits(fee);
        maxSendU = null;
        addrErr = false;
        if (quoteTimer) { clearTimeout(quoteTimer); quoteTimer = null; }
        picked.hidden = true;
        picker.hidden = false;
        live.textContent = '';
        sync();
        const si = picker.querySelector('input');
        if (si) si.focus();                              // focus back into the picker (audit m2)
      });
      picked.append(clear);
    }
    sync();
    // W6: a pick with no amount asks for the balance + the SOLVED Max ceiling
    // (amount '0' = the balance/Max quote; the per-amount fee still gates Review)
    if (onQuote && amountU() <= 0n) onQuote(recipient.address, '0');
    // ★ W-i: the amount sits ABOVE the list now. Empty amount → the field. With an
    // amount already typed the pick completes the form: Review takes focus when it
    // is ARMED; on the quote flow it is still gated (no fee answers the new pair
    // yet — loop r1 m1/A-2: focus() on a disabled button is a no-op and the focused
    // row was just hidden, so focus fell to <body>), so the named picked GROUP takes
    // it instead. Never back up into the field: that raises the keyboard over the button.
    if (!state.amount) amtInput.focus();
    else if (!cont.disabled) cont.focus();
    else picked.focus();
  }
  el._pick = pick;                                         // ★ W-f: setSendRecipient hook
  el._locked = !!lockedRecipient;                          // loop r1 m3: setSendRecipient refuses a locked compose

  /* ——— continue ——— */
  const cont = createButton({
    label: strings.reviewSend || 'Review', type: 'fill', size: 56, width: 'full',
    icon: icon('arrow-up-right', { size: 20 }),
    onClick: () => openSendReview(),
  });
  cont.disabled = true;
  const contWrap = document.createElement('div');
  contWrap.className = 'c-wallet-send__actions c-money-cta';   // ★ the shared sticky money bar (base.css)
  contWrap.append(cont);
  el.append(contWrap);

  /* exact integer-unit math throughout (audit M1); EXACT strings at the money moments —
     #77 truncation is a feed-display rule, not a confirm-step rule (audit M3) */
  const amountU = () => toUnits(state.amount || '0');
  // Freshness applies only on the QUOTE flow (onQuote wired). A static numeric fee
  // (demos, legacy integrations) keeps the pre-#523 semantics — no pair to answer.
  const quoteFlow = !!onQuote;
  function valid() {
    if (!state.recipient || !state.amount || addrErr) return false;
    if (feeU === null) return false;                       // W6: no quote → no review, ever
    if (quoteFlow && quotedKey !== currentKey()) return false;   // ★ loop MAJOR: the fee must answer THIS pair
    const a = amountU();
    return a > 0n && a + feeU <= balU;
  }
  function sync() {
    const a = amountU();
    const fresh = feeU !== null && (!quoteFlow || quotedKey === currentKey());
    maxBtn.disabled = !state.recipient || (maxSendU === null && !fresh);
    // F5-6 (#558 B): the hint speaks exactly while the RECIPIENT is the reason
    maxHint.hidden = !!state.recipient;
    if (state.recipient) maxBtn.removeAttribute('aria-describedby');
    else maxBtn.setAttribute('aria-describedby', maxHint.id);
    if (addrErr) {
      // C# rejected the picked address (quote error:'address') — say it, gate it.
      feeLine.textContent = '';
      insuff.hidden = false;
      insuff.textContent = strings.badAddress || 'That doesn’t look like an Ixian address.';
      cont.disabled = true;
      return;
    }
    if (!fresh) {
      // W6 pending state: the honest line, no numbers invented and no STALE ones —
      // a fee quoted for another (recipient, amount) pair never shows (loop MAJOR).
      feeLine.textContent = (a > 0n && state.recipient)
        ? (strings.feePending || 'Calculating network fee…')
        : (strings.feeUnknown || 'The network fee shows when the recipient and amount are set.');
      insuff.hidden = true;
      cont.disabled = true;
      requestQuote();
      return;
    }
    const total = a > 0n ? a + feeU : feeU;
    // ★ I-6 r2 (#360, loop r1 MINOR-5): same convention as the available line one
    // row up — a grouped line above an ungrouped '.'-decimal line was the exact
    // mixed convention the money.js header warns against, on one screen.
    feeLine.textContent = (strings.feeAndTotal || 'Network fee {f} IXI · Total {t} IXI')
      .split('{f}').join(groupAmountDisplay(fromUnits(feeU))).split('{t}').join(groupAmountDisplay(fromUnits(total)));
    const over = a > 0n && a + feeU > balU;
    insuff.hidden = !over;                                 // unhide BEFORE text → alert announces
    if (over) insuff.textContent = strings.insufficient || 'Not enough IXI to cover this amount plus the network fee.';
    cont.disabled = !valid();
  }
  sync();

  // W6 free-fn hook: the shell routes the setSendQuote push here. `address`/`amount`
  // are the ECHO of the asked pair — a fee is applied ONLY when it answers the pair
  // on screen (loop MAJOR: no stale-recipient fee). Calls without an echo (tests,
  // legacy) apply to the current pair.
  // Loop r3 R3-2/R3-3 (the same rule as the review sheet's safeUnits): a bridge value
  // is a number ONLY as a raw canonical decimal — anything else is dropped, never thrown
  // (a throw here stranded the compose on "Calculating…" with ✕ as the only exit) and
  // never coerced; the recipient echo compares string-exact.
  const strictUnits = (v) => {
    const t = String(v == null ? '' : v).trim();
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    try { return toUnits(t); } catch (e) { return null; }
  };
  el._applySendQuote = ({ fee: qFee, balance: qBal, max: qMax, address: qAddr, amount: qAmt, error: qErr } = {}) => {
    const b = strictUnits(qBal);
    if (b !== null) { balU = b; renderAvail(); }
    const echoed = qAddr !== undefined;
    const matchesRecipient = !echoed || (state.recipient && String(state.recipient.address) === String(qAddr));
    if (qErr === 'address' && matchesRecipient) { addrErr = true; sync(); return; }
    const mx = strictUnits(qMax);
    if (mx !== null && matchesRecipient) maxSendU = mx;
    const f = strictUnits(qFee);
    if (f !== null) {
      const key = echoed ? String(qAddr) + ':' + (qAmt == null ? '' : String(qAmt)) : currentKey();
      if (!echoed || key === currentKey()) { feeU = f; quotedKey = key; }
    }
    sync();
  };

  /* ——— review sheet (#26) — the shared openPaymentReview, fee KNOWN at open ——— */
  function openSendReview() {
    if (!valid() || state.sending) return;               // per-VIEW in-flight token (audit C1)
    // loop r1 M4: ONE review sheet per compose — a double tap stacked two, and the
    // survivor could fire a second send. Loop r2 R2-3: "one" = one OPEN sheet — a sheet
    // in its exit transition (data-open dropped, removal ~400 ms later) does not block.
    if (state.review && state.review.isOpen()) return;
    if (state.review) state.review = null;
    const r = state.recipient;
    const feeAtOpen = feeU;                              // loop fix: the sheet and the payload use ONE fee
    state.review = openPaymentReview({
      recipient: r, amount: canonAmount(), fee: fromUnits(feeAtOpen), host, strings,   // ★★ V-4: the review's own gate is canonical-only
      onConfirm: (payload, ctrl) => {
        // the per-VIEW token: one send in flight per compose (audit C1)
        state.sending = true;
        const attempt = ++state.attempt;                 // invalidates stale bridge callbacks
        const done = () => { if (attempt !== state.attempt) return; state.sending = false; ctrl.done(); };
        const fail = (msg) => { if (attempt !== state.attempt) return; state.sending = false; ctrl.fail(msg); };
        // loop r1 M3: a throwing bridge call is a failure — the per-view token must
        // not stay latched (the compose could never open a review again)
        try { if (onSend) onSend(payload, { done, fail }); else done(); }
        catch (err) { fail(null); }
      },
      onDone: (payload) => { state.review = null; if (onDone) onDone(payload); },
      onCancel: () => { state.review = null; },
    });
    if (!state.review) return;
  }
  // loop r1 M4: a compose torn down by the shell must not leave a live sheet behind it
  el._closeReview = () => { if (state.review) { state.review.close(true); state.review = null; } };

  renderContacts('');
  if (lockedRecipient) pick({ ...lockedRecipient, contact: !!lockedRecipient.name });   // chat Pay: straight to the amount
  return el;
}

/** ★ W-d — THE review sheet, exported. Recipient · amount · fee · total + Confirm/
 *  Cancel (#26). Used by the compose (fee known at open) AND by the chat's
 *  request-in Pay (fee: null → quoted live through `setQuote`; Confirm stays
 *  disabled until a fee answers, and an insufficient balance shows inline).
 *
 *  openPaymentReview({ recipient: { name?, address, avatar?, contact? }, amount,
 *                      fee, balance?, host, strings, onQuote, onConfirm, onDone,
 *                      onCancel, title }) → { sheet, setQuote(q), close() }
 *    onConfirm(payload, ctrl) — the bridge runs the real send; ctrl.done() →
 *      success morph → onDone(payload); ctrl.fail(msg) → inline error, retry;
 *      ctrl.fail('') → silent re-enable (native confirm canceled).
 *    onQuote(address, amount) fires once at open when fee is null.
 *    setQuote({ fee, balance, error, address, amount }) — the shell's answer; an
 *      echo for another pair is dropped (the W6 loop-MAJOR rule holds here too).
 *    onCancel() fires when the user closes the sheet without sending. */
export function openPaymentReview({
  recipient = {}, amount = '', fee = null, balance = null, host, strings = getStrings(),
  onQuote, onConfirm, onDone, onCancel, title, quoteTimeoutMs = 15000,
} = {}) {
  const r = recipient || {};
  // loop r1 m7: the amount is SANITIZED here, not trusted — a grouped/localized or
  // empty value must not throw before the sheet exists (the caller's controller
  // would never be assigned and the card latch would never release).
  // Loop r2 R2-2: the guard GATES, it does not coerce — only a raw canonical decimal
  // (digits, one '.') is a number here; 'abc', '1e3', '-1', a grouped '1,234' are
  // null. C# pushes IxiNumber.ToString() (invariant) — anything else is not a fee.
  const safeUnits = (v) => {
    const t = String(v == null ? '' : v).trim();
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    try { return toUnits(t); } catch (e) { return null; }
  };
  const aU = safeUnits(amount);
  if (aU === null || aU <= 0n) return null;              // loop r1 A-4: a zero/unparseable amount has no sheet
  let feeU = (fee === null || fee === undefined || fee === '') ? null : safeUnits(fee);
  let balU = (balance === null || balance === undefined || balance === '') ? null : safeUnits(balance);
  let sending = false;
  let attempt = 0;
  let sent = false;                                      // terminal: done() ran (loop r1 M5)
  let failedAttempt = 0;                                 // the attempt fail() retired (loop r1 M5)
  let quoteWait = 0;
  let quoteDead = false;                                 // the quote answered EMPTY or timed out (loop r1 A-4)
  const content = document.createElement('div');
  content.className = 'c-sendreview';

  const who = document.createElement('div');
  who.className = 'c-sendreview__who';
  if (r.contact || r.name) who.append(createAvatar({ name: r.name, address: r.address, src: r.avatar || null, size: 48 }));
  const wt = document.createElement('div');
  wt.className = 'c-sendreview__whotext';
  const wn = document.createElement('div');
  wn.className = 'c-sendreview__name';
  wn.textContent = (r.name && r.name !== r.address) ? r.name : (strings.address || 'Address');
  const wa = document.createElement('div');
  wa.className = 'c-sendreview__addr u-tabular';
  wa.textContent = r.address || '';
  wt.append(wn, wa);
  who.append(wt);
  content.append(who);

  const rowsBox = document.createElement('div');
  rowsBox.className = 'c-sendreview__rows';
  const row = (label) => {
    const rr = document.createElement('div');
    rr.className = 'c-sendreview__row';
    const l = document.createElement('span'); l.className = 'c-sendreview__rowlabel'; l.textContent = label;
    const v = document.createElement('span'); v.className = 'c-sendreview__rowvalue u-tabular';
    rr.append(l, v);
    rowsBox.append(rr);
    return v;
  };
  // EXACT values at the confirm moment (audit M3) — what you approve is what is sent.
  // ★ I-6 (#360): grouped for READING, full precision kept — separators are the
  // user's only defence against a mistyped zero at exactly this moment.
  const amountVal = row(strings.amount || 'Amount');
  const feeVal = row(strings.fee || 'Fee');
  const totalVal = row(strings.total || 'Total');
  amountVal.textContent = groupAmountDisplay(fromUnits(aU)) + ' IXI';
  content.append(rowsBox);

  const sheetErr = document.createElement('p');
  sheetErr.className = 'c-wallet-send__error';
  sheetErr.setAttribute('role', 'alert');
  sheetErr.hidden = true;
  content.append(sheetErr);
  const showErr = (msg) => { sheetErr.hidden = false; sheetErr.textContent = msg; };   // unhide BEFORE text → alert announces
  const clearErr = () => { sheetErr.hidden = true; sheetErr.textContent = ''; };

  const actions = document.createElement('div');
  actions.className = 'c-sendreview__actions';
  let sheet = null;
  const cancel = createButton({ label: strings.cancel || 'Cancel', type: 'text', size: 44,
    onClick: () => { if (!sending) closeSheet(sheet); } });
  const confirm = createButton({ label: strings.confirmSend || 'Confirm & send', type: 'fill', size: 44,
    icon: icon('arrow-up-right', { size: 18 }),
    onClick: (e) => {
      if (e.currentTarget.dataset.acted !== undefined || sending || sent || feeU === null) return;   // #72④ latch + fee gate
      e.currentTarget.dataset.acted = '';
      sending = true;
      const my = ++attempt;                              // invalidates stale bridge callbacks
      // money in flight → the sheet must NOT be dismissible (audit C1): no Esc, no
      // scrim, Cancel disabled; fail() restores the safe-dismiss paths for retry
      cancel.disabled = true;
      setOverlayOpts(sheet, { host, lightDismiss: false, escDismiss: false });
      clearErr();
      setLoading(confirm, true);
      const payload = { recipients: [{ address: r.address, name: r.name }], amount: fromUnits(aU), fee: fromUnits(feeU) };
      const done = () => {
        if (my !== attempt || sent || failedAttempt === my) return;   // stale, already done, or retired by fail() (loop r1 M5)
        sending = false;
        sent = true;                                     // TERMINAL: a second done() is a no-op, onDone fires once
        setLoading(confirm, false);
        setSuccess(confirm, { label: strings.sent || 'Sent' });
        setTimeout(() => { closeSheet(sheet); if (onDone) onDone(payload); }, 900);
      };
      const fail = (msg) => {
        if (my !== attempt || sent || failedAttempt === my) return;
        failedAttempt = my;                              // this attempt is over — a late done() cannot revive it (loop r1 M5)
        sending = false;
        setLoading(confirm, false);
        delete confirm.dataset.acted;                    // retry stays possible
        cancel.disabled = false;
        setOverlayOpts(sheet, { host, lightDismiss: false, escDismiss: true });
        if (msg === '') {                                // #523: native-confirm cancel — silent re-enable
          clearErr();
          return;
        }
        showErr(msg || strings.sendFailed || 'The payment could not be sent. Please try again.');
      };
      // loop r1 M3: a throwing hand-off must not brick the sheet with every exit
      // locked — the throw is a failure, and fail() restores the dismiss paths.
      try { if (onConfirm) onConfirm(payload, { done, fail }); else done(); }
      catch (err) { fail(null); }
    } });
  actions.append(cancel, confirm);                                 // #60: two short labels side-by-side
  content.append(actions);

  /* the fee/total rows + the Confirm gate. fee null → the honest pending line and
     a disabled Confirm (W6: no invented fee, ever). A known balance that cannot
     cover amount + fee shows the insufficient error and keeps the gate shut.
     loop r1 M1: NEVER while a send is in flight — a late quote must not rewrite
     the numbers under the spinner or touch a loading button.
     loop r1 M2: the error is RETRACTED when a later quote clears it. */
  let overShown = false;
  function render() {
    if (sending || sent) return;
    if (quoteDead) {
      feeVal.textContent = '—';
      totalVal.textContent = '—';
      confirm.disabled = true;
      return;
    }
    if (feeU === null) {
      feeVal.textContent = strings.feePending || 'Calculating network fee…';
      totalVal.textContent = '—';
      confirm.disabled = true;
      return;
    }
    feeVal.textContent = groupAmountDisplay(fromUnits(feeU)) + ' IXI';
    totalVal.textContent = groupAmountDisplay(fromUnits(aU + feeU)) + ' IXI';
    const over = balU !== null && aU + feeU > balU;
    if (over) { showErr(strings.insufficient || 'Not enough IXI to cover this amount plus the network fee.'); overShown = true; }
    else if (overShown) { clearErr(); overShown = false; }
    confirm.disabled = over;
  }
  render();

  // lightDismiss OFF from the start — a money confirmation is explicit (#56 modal
  // philosophy); Esc stays a safe dismiss until the send is actually in flight
  sheet = createSheet({ content, host, strings, lightDismiss: false,
    title: title || strings.reviewTitle || 'Review payment',
    onDismiss: () => { if (quoteWait) { clearTimeout(quoteWait); quoteWait = 0; } if (!sent && onCancel) onCancel(); } });
  openSheet(sheet);
  // loop r1 A-4: a quote that never answers (or answers EMPTY — C#'s "no estimate"
  // grammar) must not hang the sheet on "Calculating…" with Cancel as the only exit.
  const quoteFailed = () => {
    if (sending || sent || feeU !== null) return;
    quoteDead = true;
    showErr(strings.feeUnavailable || 'The network fee could not be estimated. Close this and try again.');
    render();
  };
  if (feeU === null && onQuote) {
    onQuote(r.address, fromUnits(aU));
    quoteWait = setTimeout(() => { quoteWait = 0; quoteFailed(); }, quoteTimeoutMs);
  }

  const ctrl = {
    sheet,
    setQuote({ fee: qFee, balance: qBal, error: qErr, address: qAddr, amount: qAmt } = {}) {
      // the echo pair must be THIS pair — a quote for another recipient/amount is dropped
      if (qAddr !== undefined && String(qAddr) !== String(r.address || '')) return;   // loop r2 R2-4: string-exact
      if (qAmt !== undefined && qAmt !== null && String(qAmt) !== '') {
        const echoedU = safeUnits(qAmt);                 // loop r1 m2: a non-numeric echo never throws
        if (echoedU === null || echoedU !== aU) return;
      }
      if (sending || sent) return;                       // loop r1 M1: nothing changes under an in-flight send
      if (quoteWait) { clearTimeout(quoteWait); quoteWait = 0; }
      if (qBal !== null && qBal !== undefined && qBal !== '') { const b = safeUnits(qBal); if (b !== null) balU = b; }
      if (qErr === 'address') {
        quoteDead = true;
        showErr(strings.badAddress || 'That doesn\u2019t look like an Ixian address.');
        render();                                        // loop r1 M2: the fee row leaves "Calculating…"
        return;
      }
      const f = (qFee !== null && qFee !== undefined && qFee !== '') ? safeUnits(qFee) : null;
      if (f !== null) { feeU = f; if (quoteDead) { quoteDead = false; clearErr(); } }   // loop r2 n1: only a QUOTE error is the quote's to clear
      else if (feeU === null) { quoteFailed(); return; } // an echo-matched EMPTY fee = no estimate (loop r1 A-4)
      render();
    },
    close(force) { if (!sending || force) closeSheet(sheet); },
    isSending() { return sending; },
    // loop r2 R2-3 / r3 R3-1: "open" = on the overlay stack (removed synchronously at
    // dismissal) — not the DOM node (lingers ~400 ms) and not data-open (lands 2 frames in)
    isOpen() { return isOverlayOpen(sheet); },
  };
  return ctrl;
}

/** QR-scan result lands here (shell wires `ixian:sendScan` → setSendAddress). Accepts
 *  the legacy QR formats `addr`, `addr:ixi`, `addr:send:amount`. */
export function setSendAddress(el, scanned) {
  if (!el) return el;
  if (el._locked) return el;                               // loop r1 m3: the locked peer is never redirected
  const raw = String(scanned || '');
  const parts = raw.split(':');
  const address = parts[0] || '';
  // a scan supersedes an already-picked recipient — restore the picker first so the
  // filled field is actually visible (audit m4)
  const clearBtn = el.querySelector('.c-wallet-send__clear');
  if (clearBtn) clearBtn.click();
  const input = el.querySelector('.c-wallet-send__addrinput');
  const field = el.querySelector('.c-wallet-send__addrfield');
  if (field) field.hidden = false;
  const addrRow = el.querySelector('.c-wallet-send__addrrow');
  if (addrRow) addrRow.setAttribute('aria-expanded', 'true');
  if (input) { input.value = address; input.focus(); }
  if (parts[1] === 'send' && parts[2]) {
    const amt = el.querySelector('.c-wallet-send__amount');
    // ★ I-6 (#360): seed the field with the DISPLAY form — the input handler
    // ungroups what it reads, and a raw canonical '1.500' (one-and-a-half with
    // typed zeros) dropped straight into a ','-decimal locale would read as
    // grouping (1500, a 1000× error). The display form round-trips exactly.
    if (amt) { amt.value = groupAmountDisplay(parts[2]); amt.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  return el;
}

/** ★ W-f (Damir F5 2026-08-23): a scanned address that IS a contact picks the
 *  contact — nickname + avatar on the picked row, not the raw-address glyph. The
 *  shell looks the scan up in its roster and calls this on a hit (setSendAddress
 *  on a miss). `scanned` may carry the QR tail (`:send:<amount>`) — the amount is
 *  seeded exactly as setSendAddress does. Returns false when el is not a compose. */
export function setSendRecipient(el, contact, scanned) {
  if (!el || typeof el._pick !== 'function' || !contact || !contact.address) return false;
  if (el._locked) return false;                            // loop r1 m3: the #139 locked peer is never redirected
  const clearBtn = el.querySelector('.c-wallet-send__clear');
  if (clearBtn) clearBtn.click();                          // a scan supersedes the current pick
  const field = el.querySelector('.c-wallet-send__addrfield');
  if (field) field.hidden = true;
  const addrRow = el.querySelector('.c-wallet-send__addrrow');
  if (addrRow) addrRow.setAttribute('aria-expanded', 'false');   // loop r1 A-5
  const parts = String(scanned || '').split(':');
  if (parts[1] === 'send' && parts[2]) {
    const amt = el.querySelector('.c-wallet-send__amount');
    if (amt) { amt.value = groupAmountDisplay(parts[2]); amt.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  el._pick({ ...contact, contact: true });
  return true;
}

/** W6 (#523): a fee/balance quote lands here (shell wires the `setSendQuote` push).
 *  Values are RAW decimal strings from C# (never display-formatted). Missing/empty
 *  members leave that half unchanged. */
export function setSendQuote(el, quote) {
  if (el && typeof el._applySendQuote === 'function') el._applySendQuote(quote || {});
  return el;
}

/** Inline error on the send view (shell hook parity with apps-add's setAddError). */
export function setSendError(el, msg) {
  // ★ W-i: the amount section (and ITS error line) now sits ABOVE the address
  // field — target the address field's own line while the picker is OPEN; once a
  // recipient is picked that field is hidden (loop r1 n5), so the VISIBLE amount-
  // section line takes the message instead. Never an invisible error.
  const picker = el && el.querySelector('.c-wallet-send__picker');
  const err = el && ((picker && !picker.hidden) ? el.querySelector('.c-wallet-send__addrfield .c-wallet-send__error') : el.querySelector('.c-wallet-send__section--amount .c-wallet-send__error'))
    || (el && el.querySelector('.c-wallet-send__error'));
  if (!err) return el;
  err.hidden = !msg;                                     // unhide BEFORE text → alert announces (audit m3)
  err.textContent = msg || '';
  return el;
}

