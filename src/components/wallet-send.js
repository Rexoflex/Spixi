/**
 * c-wallet-send — the send flow (spec §3, #133: compose + review sheet).
 * Replaces the legacy 3-page hop (wallet_send → send2 → sent):
 *
 * ★ #1263 (Damir's pick A, "Cash App / Revolut", 2026-10-08) — TWO STEPS. This
 * reverses W-i ("amount on top", #536) and retires the #558 "Select a recipient to
 * use Max" gate: step 2 always has a recipient.
 *   STEP 1 — the recipient, today's picker unchanged: search → "Send to an address"
 *     (reveal + scan) → the contact list (★ W-j: the shared c-contact-row). A pick
 *     moves to step 2.
 *   STEP 2 — the amount: a "To" chip (avatar, name, short #211 address; tap = back to
 *     step 1, unless the recipient is locked #139), a big centred amount that is NOT
 *     an input (amount-pad.js: grey 0.00, caret, IXI unit), a read-only fiat line only
 *     when the host passes a price (`fiatPrice`; none today → no line, #1041), the
 *     Available line + Max, the live fee line, and the keypad + ONE primary Review.
 *     Over balance = the error colour + one line + "Use max", checked in TWO stages:
 *     the amount against the balance at once, amount + fee once the W6 quote lands.
 *     "Use max" and Max open the SAME confirm (#136); nothing fills silently.
 *   The bottom bar (keypad + Review) is the shared sticky .c-money-cta.
 *   No unit toggle, no note: the bridge carries neither (#1263).
 *
 * UNCHANGED BY #1263 (pinned byte-for-byte — pins-s11/h-send.mjs): every callback and
 * payload. onQuote(address, amount) with the canonical amount (and the amount-0 Max/
 * balance quote on a pick), the valid() gate, openPaymentReview with the canonical
 * amount + the quoted fee, onSend(payload, ctrl) with { recipients:[{address,name}],
 * amount, fee }, ctrl.done/fail, onDone. The shell's verbs (`ixian:feeQuery`,
 * `ixian:signSend`, `ixian:sendScan`) and the NATIVE confirm are the shell's and C#'s.
 *
 * 3. REVIEW = c-sheet (#26 deliberateness step): recipient · amount · fee · total +
 *    explicit Confirm (latched → loading, #29/#72④) / Cancel. onSend(payload, ctrl) —
 *    the bridge runs the real send: ctrl.done() → success morph → onDone(payload)
 *    (shell returns home; the pending row arrives via addPaymentActivity); ctrl.fail(msg)
 *    → inline error in the sheet, Confirm re-enabled (retry stays possible).
 *    ★ W-d: the sheet is the exported `openPaymentReview` — the chat's request-in
 *    Pay opens the SAME sheet (fee quoted live) before the native confirm.
 *
 * Numbers: the amount is the keypad's canonical edit string (the one surface where FE
 * math is unavoidable — validation + Max + total); display strings still follow #77
 * (truncate, never round). The bridge remains the source of truth and re-validates.
 * Legacy multi-recipient stays commented out C#-side — payload is single-recipient but
 * shaped plural-ready ({ recipients: [ { address, name? } ] }).
 *
 * createWalletSend({ contacts, balance, fee, strings, host, lockedRecipient, fiatPrice,
 *                    onQuickScan, onQuote, onSend, onDone }) → view
 *   view._stepBack() — ★ #1263: the host's Back on step 2 returns to step 1 (true =
 *   consumed); false on step 1 or for a locked recipient (the host then closes).
 * Free fns (#44): setSendAddress(el, address) — QR-scan result lands in the address path.
 *                 setSendRecipient(el, contact) — ★ W-f: programmatic contact pick (a
 *                 scanned address that IS a contact shows nickname + avatar, not raw).
 *
 * ★ W6 (#523): `fee: null` = UNKNOWN. The fee line shows a pending state, Max is
 * disabled, and Review stays disabled until a quote lands — no invented fee, ever.
 * `onQuote(address, amount)` fires (debounced, deduped) when both recipient
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
import { setOverlayOpts, isOverlayOpen } from './overlay.js';
import { icon } from './icons.js';
import { createContactRow, createGlyphRow } from './contact-row.js';   // ★ W-j shared row
import { createAmountPad, createAmountDisplay } from './amount-pad.js';   // ★ #1263: the in-app keypad (#607/#609 closed by construction)
import { toUnits, canonicalAmount, groupAmountDisplay, fiatLine } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping

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
  fiatPrice = null,         // ★ #1263: IXI → fiat, RAW decimal from C#; absent/zero → no fiat line (#1041)
  onQuickScan, onQuote, onSend, onDone,
} = {}) {
  // NB contract: balance/fee are RAW numerics (number or plain decimal string) — this is
  // the one FE surface doing money math. Pre-formatted display strings (hero-style
  // '923,852.00') are NOT valid inputs here. fee === null → unknown until a quote (#523).
  // ★ #46 r3 MINOR-2: balance === null → UNKNOWN until the first quote carries it (the
  // chat / contact-details Pay covers): no Available figure, no stage-1 over-balance
  // verdict, no Review — never a false "More than your 0 IXI".
  const el = document.createElement('div');
  el.className = 'c-wallet-send';
  const addrFieldId = 'c-wallet-send-addrfield-' + (++walletSendSeq);
  let balU = (balance === null || balance === undefined || balance === '') ? null : toUnits(balance);
  let feeU = (fee === null || fee === undefined) ? null : toUnits(fee);
  const state = { recipient: null, amount: '', sending: false, attempt: 0, review: null, step: 1 };   // review = the ONE open sheet (loop r1 M4)
  let quoteTimer = null;
  let lastQuoteKey = '';
  let quotedKey = '';                                      // the (addr:amount) pair feeU actually ANSWERS
  let maxSendU = null;                                     // C#'s solved max-sendable (amount-0 quote)
  let addrErr = false;                                     // C# rejected the picked address (quote error)
  /* ★★ V-4: `state.amount` is the keypad's edit string and it stays un-canonical, so the
     user can still see a mid-typed `12.`. Every boundary that leaves this component takes
     the CANONICAL form instead (the review's own gate is canonical-only). The quote KEY
     is canonical too: C# echoes back what we sent, and a key built from `12.` could never
     match an echo of `12`. */
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
      // loop NIT fix: re-check the AMOUNT too — a cleared amount must not emit
      // an empty-amount query (and latch its key)
      if (!state.recipient || !state.amount || amountU() <= 0n) return;
      const k = currentKey();
      if (k === lastQuoteKey) return;
      lastQuoteKey = k;
      onQuote(state.recipient.address, canonAmount());
    }, 350);
  }

  /* hidden live region (the receive screen's grammar): announces the pick. At the ROOT,
     not inside step 1 — a region inside a hidden step announces nothing. */
  const live = document.createElement('p');
  live.className = 'c-wallet-send__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  /* ——— STEP 1: the recipient (★ #1263: today's picker, unchanged) ——— */
  const recSec = document.createElement('section');
  recSec.className = 'c-wallet-send__section c-wallet-send__section--recipient';
  const recTitle = document.createElement('h2');
  recTitle.className = 'c-wallet-send__label';
  recTitle.textContent = strings.sendTo || 'Send to';
  recTitle.tabIndex = -1;                                  // ★ #46 r3 NIT-4: step 1's focus target after a touch (no OS keyboard over the list)
  recSec.append(recTitle);

  /* ★ #46 r3 NIT-4: the last input modality INSIDE this view. Step 1 focuses the search
     (which raises the OS keyboard) only for a keyboard user or on desktop; after a touch
     tap (or the Android Back, which follows one) the heading takes focus instead. */
  let modality = null;
  el.addEventListener('pointerdown', (e) => { modality = e.pointerType || 'mouse'; }, true);
  el.addEventListener('keydown', () => { modality = 'keyboard'; }, true);
  const keyboardFocus = () => modality === 'keyboard'
    || (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-desktop'));

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

  /* ——— STEP 2: the amount (★ #1263 render A) ——— */
  const amtSec = document.createElement('section');
  amtSec.className = 'c-wallet-send__section c-wallet-send__section--amount';
  amtSec.hidden = true;

  /* the "To" chip: avatar · name · short address (#211). A BUTTON back to step 1, or a
     plain chip when the recipient is locked (#139 — the peer is fixed, nothing to change).
     It keeps the old picked-row classes (__picked / __pickedname / __pickedaddr) — the
     same facts, the same hooks. */
  const picked = document.createElement(lockedRecipient ? 'div' : 'button');
  picked.className = 'c-wallet-send__picked c-wallet-send__chip';
  if (!lockedRecipient) {
    picked.type = 'button';
    picked.addEventListener('click', () => toStep1());
  } else {
    picked.setAttribute('role', 'group');
  }
  amtSec.append(picked);

  const amtBox = document.createElement('div');
  amtBox.className = 'c-wallet-send__amountbox';
  const amtDisplay = createAmountDisplay({ className: 'c-wallet-send__amount', strings });
  amtDisplay.setAttribute('aria-label', strings.amount || 'Amount');
  const fiat = document.createElement('p');
  fiat.className = 'c-wallet-send__fiat u-tabular';
  fiat.hidden = true;
  amtBox.append(amtDisplay, fiat);
  amtSec.append(amtBox);

  /* sending EVERYTHING deserves a deliberate stop (Damir #136): explicit confirm, safe
     action autofocused (APG), only then the amount fills. ★ #1263: Max AND "Use max"
     both come here — the over-balance way out never fills silently. */
  const maxCeiling = () => (maxSendU !== null ? maxSendU
    : ((balU !== null && feeU !== null && (!quoteFlow || quotedKey === currentKey())) ? balU - feeU : null));
  function askMax() {
    // ★ round-2 MAJOR fix: the onClick fallback MUST use the SAME predicate as the
    // maxBtn.disabled state below — `fresh` honours static-fee mode (!quoteFlow),
    // and a mismatch left Max enabled-but-inert for every static-fee integrator.
    const maxU = maxCeiling();
    if (maxU === null) return;                           // no honest ceiling yet (W6)
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
          pad._set(fromUnits(maxU > 0n ? maxU : 0n));    // exact integer units — never overshoots (→ onChange → sync)
        } },
      ],
    }));
  }

  const amtRow = document.createElement('div');
  amtRow.className = 'c-wallet-send__amountrow';
  const availLine = document.createElement('p');
  availLine.className = 'c-wallet-send__meta u-tabular';
  const renderAvail = () => {
    if (balU === null) { availLine.textContent = ''; return; }   // ★ MINOR-2: unknown until the first quote
    availLine.textContent = (strings.available || 'Available: {b} IXI').split('{b}').join(groupAmountDisplay(fromUnits(balU)));   // ★ I-6 (#360)
  };
  renderAvail();
  const maxBtn = createButton({ label: strings.max || 'Max', type: 'outline', size: 32, onClick: askMax });
  amtRow.append(availLine, maxBtn);
  amtSec.append(amtRow);

  /* over balance (★ #1263): ONE line in the error colour + "Use max" (the same confirm) */
  const overRow = document.createElement('div');
  overRow.className = 'c-wallet-send__over';
  overRow.hidden = true;
  const insuff = document.createElement('p');
  insuff.className = 'c-wallet-send__error';
  insuff.setAttribute('role', 'alert');
  const useMax = createButton({ label: strings.useMax || 'Use max', type: 'tonal', size: 32, onClick: askMax });
  useMax.classList.add('c-wallet-send__usemax');
  overRow.append(insuff, useMax);
  amtSec.append(overRow);

  const feeLine = document.createElement('p');
  feeLine.className = 'c-wallet-send__meta c-wallet-send__fee u-tabular';
  feeLine.setAttribute('role', 'status');                  // the fee arriving IS the unlock signal (loop a11y)
  amtSec.append(feeLine);
  el.append(amtSec);

  function pick(recipient) {
    if (!recipient || !recipient.address) return;          // loop r2 R2-4: no address, no recipient (the F2 rule, Send side)
    state.recipient = recipient;
    errLine.hidden = true;
    addrErr = false;                                       // a new recipient gets a fresh verdict
    maxSendU = null;
    picked.textContent = '';
    const lbl = document.createElement('span');
    lbl.className = 'c-wallet-send__chiplabel';
    lbl.textContent = strings.moneyTo || 'To';
    picked.append(lbl);
    if (recipient.contact) picked.append(createAvatar({ name: recipient.name, address: recipient.address, src: recipient.avatar || null, size: 24, online: false }));
    else {
      const glyph = document.createElement('span');
      glyph.className = 'c-wallet-send__pickedglyph';
      glyph.append(icon('qrcode', { size: 16 }));
      picked.append(glyph);
    }
    // ★ W-b: name + the MUTED TRUNCATED address (#211) on one line — a raw-address pick
    // titles as the truncated address. The FULL address is shown at the decision
    // moment, on the review sheet (#99).
    const pn = document.createElement('span');
    pn.className = 'c-wallet-send__pickedname';
    const hasName = !!recipient.name && recipient.name !== recipient.address;
    pn.textContent = hasName ? recipient.name : truncateAddressMiddle(recipient.address, 9, 6);
    picked.append(pn);
    if (hasName) {
      const pa = document.createElement('span');
      pa.className = 'c-wallet-send__pickedaddr u-tabular';
      pa.textContent = truncateAddressMiddle(recipient.address, 9, 6);
      picked.append(pa);
    }
    if (!lockedRecipient) {
      const chev = document.createElement('span');
      chev.className = 'c-wallet-send__chipchev';
      chev.append(icon('chevron-down', { size: 16 }));
      picked.append(chev);
      picked.setAttribute('aria-label', (strings.changeRecipient || 'Change recipient') + ': ' + pn.textContent);
    } else {
      picked.setAttribute('aria-label', (strings.sendTo || 'Send to') + ': ' + pn.textContent);
    }
    live.textContent = (strings.sendTo || 'Send to') + ': ' + pn.textContent;
    addrRow.setAttribute('aria-expanded', 'false');       // loop r1 A-5: the field is hidden with the picker
    addrField.hidden = true;
    showStep(2);
    sync();
    // W6: a pick with no amount asks for the balance + the SOLVED Max ceiling
    // (amount '0' = the balance/Max quote; the per-amount fee still gates Review)
    if (onQuote && amountU() <= 0n) onQuote(recipient.address, '0');
    // ★ #1263: step 2 takes focus on the amount (no keyboard rises — it is an output);
    // an already-armed Review takes it instead (an amount carried back from step 1).
    focusStep2();
  }
  function focusStep2() {
    if (!cont.disabled) cont.focus();
    else { try { amtDisplay.focus(); } catch (e) { /* jsdom */ } }
  }
  function focusStep1() {
    const si = picker.querySelector('input');
    if (si && keyboardFocus()) si.focus();                 // focus back into the picker (audit m2) — keyboard/desktop only (NIT-4)
    else { try { recTitle.focus(); } catch (e) { /* jsdom */ } }
  }
  /* ★ #46 r3 MINOR-1: the host calls this AFTER it attached the view (a locked pick runs
     in the constructor, before the view is in the document, so its focus went nowhere and
     the shells' "first input" was step 1's HIDDEN address field). Step 2 → Review if armed,
     else the amount output (tabIndex -1, no keyboard); step 1 → the search (NIT-4 rule). */
  el._initialFocus = () => (state.step === 2 ? focusStep2() : focusStep1());
  el._pick = pick;                                         // ★ W-f: setSendRecipient hook
  el._locked = !!lockedRecipient;                          // loop r1 m3: setSendRecipient refuses a locked compose

  /* ★ #1263: back to step 1 = the old ✕ "change recipient" — the recipient and every
     quote answer go (no stale fee for the next pick, loop MAJOR); the AMOUNT stays, so a
     new pick lands on the number already typed. */
  function toStep1() {
    if (lockedRecipient) return false;
    state.recipient = null;
    lastQuoteKey = '';                                     // a new recipient must re-quote (W6)
    quotedKey = '';                                        // …and the old answer is nobody's (loop MAJOR)
    feeU = (fee === null || fee === undefined) ? null : toUnits(fee);
    maxSendU = null;
    addrErr = false;
    if (quoteTimer) { clearTimeout(quoteTimer); quoteTimer = null; }
    live.textContent = '';
    showStep(1);
    sync();
    focusStep1();
    return true;
  }
  el._toStep1 = toStep1;
  el._stepBack = () => (state.step === 2 && !(state.review && state.review.isOpen()) ? toStep1() : false);

  /* ——— keypad + Review: the shared sticky money bar ——— */
  const pad = createAmountPad({
    display: amtDisplay, strings, decimals: 8,
    onChange: (raw) => { state.amount = raw; sync(); },
  });
  el._setAmount = (v) => pad._set(v);                      // QR seeds (setSendAddress / setSendRecipient)
  const cont = createButton({
    label: strings.reviewSend || 'Review', type: 'fill', size: 56, width: 'full',
    icon: icon('arrow-up-right', { size: 20 }),
    onClick: () => openSendReview(),
  });
  cont.disabled = true;
  const contWrap = document.createElement('div');
  contWrap.className = 'c-wallet-send__actions c-money-cta';   // ★ the shared sticky money bar (base.css)
  contWrap.hidden = true;
  contWrap.append(pad, cont);
  el.append(contWrap);

  function showStep(n) {
    state.step = n;
    el.dataset.step = String(n);
    recSec.hidden = n !== 1;
    amtSec.hidden = n !== 2;
    contWrap.hidden = n !== 2;
    // desktop hardware keys drive the pad only while step 2 is on screen and no
    // overlay (the review sheet, the Max confirm) is up
    if (n === 2) pad._keysOn(() => state.step === 2 && !(state.review && state.review.isOpen()), { primary: () => cont });   // Enter = Review when armed (MAJOR-1)
    else pad._keysOff();
  }

  /* exact integer-unit math throughout (audit M1); EXACT strings at the money moments —
     #77 truncation is a feed-display rule, not a confirm-step rule (audit M3) */
  const amountU = () => toUnits(state.amount || '0');
  // Freshness applies only on the QUOTE flow (onQuote wired). A static numeric fee
  // (demos, legacy integrations) keeps the pre-#523 semantics — no pair to answer.
  const quoteFlow = !!onQuote;
  function valid() {
    if (!state.recipient || !state.amount || addrErr) return false;
    if (feeU === null) return false;                       // W6: no quote → no review, ever
    if (balU === null) return false;                       // ★ #46 r3 MINOR-2: nor while the balance is unknown
    if (quoteFlow && quotedKey !== currentKey()) return false;   // ★ loop MAJOR: the fee must answer THIS pair
    const a = amountU();
    return a > 0n && a + feeU <= balU;
  }
  /* ★ #1263: the read-only fiat line — only with a price C# gave, only for a nonzero
     amount; display-only (exact units, the one #1040 fiatLine rule), never an input. */
  const priceU = (() => {
    const t = String(fiatPrice == null ? '' : fiatPrice).trim();
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    const u = toUnits(t);
    return u > 0n ? u : null;
  })();
  function renderFiat(a) {
    if (priceU === null || a <= 0n) { fiat.hidden = true; fiat.textContent = ''; return; }
    const line = fiatLine(fromUnits((a * priceU) / 100000000n), '', fromUnits(a));
    fiat.hidden = !line;
    fiat.textContent = line ? (strings.fiatApprox || '≈ {f}').split('{f}').join(line) : '';
  }
  /* ★ #1263 over-balance, TWO stages: `stage` 1 = the amount alone is over the balance
     (known at once, no fee needed); 2 = amount + the quoted fee is over (the W6 answer). */
  function showOver(stage) {
    const on = !!stage;
    pad._error(on);
    amtRow.hidden = on;                                     // the line + "Use max" replace Available + Max (render A)
    if (!on) { overRow.hidden = true; insuff.textContent = ''; return; }
    overRow.hidden = false;                                 // unhide BEFORE text → alert announces
    insuff.hidden = false;
    insuff.textContent = stage === 1
      ? (strings.sendOverBalance || 'More than your {b} IXI').split('{b}').join(groupAmountDisplay(fromUnits(balU)))
      : (strings.insufficient || 'Not enough IXI to cover this amount plus the network fee.');
  }
  function sync() {
    const a = amountU();
    renderFiat(a);
    const fresh = feeU !== null && (!quoteFlow || quotedKey === currentKey());
    const maxOff = !state.recipient || (maxSendU === null && !fresh);
    const maxDead = maxSendU === null && balU === null;   // ★ #46 r4 NIT-2 (S11): no ceiling and no balance → an enabled Max would do nothing
    maxBtn.disabled = maxOff || maxDead;
    useMax.disabled = maxOff || maxDead;
    if (addrErr) {
      // C# rejected the picked address (quote error:'address') — say it, gate it.
      feeLine.textContent = '';
      pad._error(false);
      amtRow.hidden = false;
      useMax.hidden = true;
      overRow.hidden = false;
      insuff.hidden = false;
      insuff.textContent = strings.badAddress || 'That doesn’t look like an Ixian address.';
      cont.disabled = true;
      return;
    }
    useMax.hidden = false;
    const over1 = balU !== null && a > 0n && a > balU;       // stage 1: no fee needed to know this (skipped while the balance is unknown, MINOR-2)
    if (!fresh) {
      // W6 pending state: the honest line, no numbers invented and no STALE ones —
      // a fee quoted for another (recipient, amount) pair never shows (loop MAJOR).
      feeLine.textContent = (a > 0n && state.recipient)
        ? (strings.feePending || 'Calculating network fee…')
        : (strings.feeNeedsAmount || 'The network fee shows once you enter an amount.');
      showOver(over1 ? 1 : 0);
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
    showOver(over1 ? 1 : (balU !== null && a > 0n && a + feeU > balU) ? 2 : 0);
    cont.disabled = !valid();
  }
  sync();

  // W6 free-fn hook: the shell routes the setSendQuote push here. `address`/`amount`
  // are the ECHO of the asked pair — a fee is applied ONLY when it answers the pair
  // on screen (loop MAJOR: no stale-recipient fee). Calls without an echo (tests,
  // legacy) apply to the current pair.
  // Loop r3 R3-2/R3-3 (the same rule as the review sheet's safeUnits): a bridge value
  // is a number ONLY as a raw canonical decimal — anything else is dropped, never thrown
  // (a throw here stranded the compose on "Calculating…" with Back as the only exit) and
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

  function renderContacts(q) {
    const needle = (q || '').trim().toLocaleLowerCase();
    rows.textContent = '';
    const list = contacts.filter((c) => !needle
      || (c.name || '').toLocaleLowerCase().includes(needle)
      || (c.address || '').toLocaleLowerCase().includes(needle))
      .sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || ''));
    // #142 (Damir 2026-07-05c): NO caps — the #136 window forced you to know
    // the name; the full A–Z list scrolls and search narrows. ★ #1263: a pick moves
    // to step 2, so the list never competes with the amount.
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

  renderContacts('');
  showStep(1);
  if (lockedRecipient) pick({ ...lockedRecipient, contact: !!lockedRecipient.name });   // chat Pay: straight to step 2
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
  // a scan supersedes an already-picked recipient — back to step 1 first so the
  // filled field is actually visible (audit m4; ★ #1263: step 1 is the picker)
  if (typeof el._toStep1 === 'function') el._toStep1();
  const input = el.querySelector('.c-wallet-send__addrinput');
  const field = el.querySelector('.c-wallet-send__addrfield');
  if (field) field.hidden = false;
  const addrRow = el.querySelector('.c-wallet-send__addrrow');
  if (addrRow) addrRow.setAttribute('aria-expanded', 'true');
  if (input) { input.value = address; input.focus(); }
  // ★ #1263: the QR amount seeds the KEYPAD (no input to dispatch into) through
  // pad._set → sanitizeAmount, which is NOT locale-aware: a value with a '.' keeps it
  // as the decimal and drops every ',' (grouping); a value with only ',' takes the
  // FIRST ',' as the decimal. So the canonical '1.500' is 1.5 in every app language
  // (the pad's state is '.'-decimal, never a display string), and a non-canonical
  // QR '1,500' would also read 1.5 — the legacy QR format carries the canonical form.
  if (parts[1] === 'send' && parts[2] && typeof el._setAmount === 'function') el._setAmount(parts[2]);
  return el;
}

/** ★ W-f (Damir F5 2026-08-23): a scanned address that IS a contact picks the
 *  contact — nickname + avatar on the chip, not the raw-address glyph. The
 *  shell looks the scan up in its roster and calls this on a hit (setSendAddress
 *  on a miss). `scanned` may carry the QR tail (`:send:<amount>`) — the amount is
 *  seeded exactly as setSendAddress does. Returns false when el is not a compose. */
export function setSendRecipient(el, contact, scanned) {
  if (!el || typeof el._pick !== 'function' || !contact || !contact.address) return false;
  if (el._locked) return false;                            // loop r1 m3: the #139 locked peer is never redirected
  if (typeof el._toStep1 === 'function') el._toStep1();    // a scan supersedes the current pick
  const field = el.querySelector('.c-wallet-send__addrfield');
  if (field) field.hidden = true;
  const addrRow = el.querySelector('.c-wallet-send__addrrow');
  if (addrRow) addrRow.setAttribute('aria-expanded', 'false');   // loop r1 A-5
  const parts = String(scanned || '').split(':');
  if (parts[1] === 'send' && parts[2] && typeof el._setAmount === 'function') el._setAmount(parts[2]);
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
  // ★ #1263: step 1 (the picker open) → the address field's own line; step 2 → the
  // amount section's line, which is the visible one there. Never an invisible error.
  const picker = el && el.querySelector('.c-wallet-send__picker');
  const step1 = picker && !picker.closest('[hidden]');
  const err = el && (step1 ? el.querySelector('.c-wallet-send__addrfield .c-wallet-send__error') : el.querySelector('.c-wallet-send__section--amount .c-wallet-send__error'))
    || (el && el.querySelector('.c-wallet-send__error'));
  if (!err) return el;
  if (!step1) { const row = err.closest('.c-wallet-send__over'); if (row) row.hidden = !msg; }
  err.hidden = !msg;                                     // unhide BEFORE text → alert announces (audit m3)
  err.textContent = msg || '';
  return el;
}
