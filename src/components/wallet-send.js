/**
 * c-wallet-send — the send flow, slice 2 (spec §3, #133: ONE screen + review sheet).
 * Replaces the legacy 3-page hop (wallet_send → send2 → sent):
 *
 * 1. RECIPIENT — search over contacts (deterministic avatars) OR a raw address input
 *    ("Send to an address" reveal) OR QR (`ixian:quickscan` via onQuickScan; the shell
 *    calls setSendAddress with the scan result). Selecting shows a recipient row with ✕.
 * 2. AMOUNT — decimal-sanitized input (≤8 decimals, chain precision), Available line,
 *    Max (balance − fee, #77 truncation), live fee + total; inline insufficient error.
 * 3. REVIEW = c-sheet (#26 deliberateness step): recipient · amount · fee · total +
 *    explicit Confirm (latched → loading, #29/#72④) / Cancel. onSend(payload, ctrl) —
 *    the bridge runs the real send: ctrl.done() → success morph → onDone(payload)
 *    (shell returns home; the pending row arrives via addPaymentActivity); ctrl.fail(msg)
 *    → inline error in the sheet, Confirm re-enabled (retry stays possible).
 *
 * Numbers: user input is RAW here (the one surface where FE math is unavoidable —
 * validation + Max + total); display strings still follow #77 (truncate, never round).
 * The bridge remains the source of truth and re-validates on its side.
 * Legacy multi-recipient stays commented out C#-side — payload is single-recipient but
 * shaped plural-ready ({ recipients: [ { address, name? } ] }).
 *
 * createWalletSend({ contacts, balance, fee, strings, host,
 *                    onQuickScan, onSend, onDone }) → view
 * Free fn (#44): setSendAddress(el, address) — QR-scan result lands in the address path.
 *
 * ★ W6 (#523): `fee: null` = UNKNOWN. The fee line shows a pending state, Max is
 * disabled, and Continue stays disabled until a quote lands — no invented fee, ever.
 * New opt `onQuote(address, amount)` fires (debounced, deduped) when both recipient
 * and a positive amount exist; the shell answers via the free fn
 * `setSendQuote(el, { fee, balance })`. The displayed fee stays an ESTIMATE — the
 * NATIVE confirm shows C#'s own numbers and is the authority (SECURITY.md).
 * ★ ctrl.fail('') = SILENT re-enable (the user canceled the native confirm — no
 * error text); any non-empty msg renders as before.
 * ★ #255: a contact row with `pending: true` renders a "Pending" tag — a request
 * you sent that the peer has not accepted. Still pickable (money goes to the
 * address, not the friendship); the tag is the honest signal.
 */
import { getStrings } from './strings-runtime.js';
import { createAvatar } from './avatar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { setOverlayOpts } from './overlay.js';
import { icon } from './icons.js';
import { sanitizeAmount, toUnits, amountInputToCanonical, groupAmountDisplay, amountCaretAfterFormat } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping

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
  const state = { recipient: null, amount: '', sending: false, attempt: 0 };
  let quoteTimer = null;
  let lastQuoteKey = '';
  let quotedKey = '';                                      // the (addr:amount) pair feeU actually ANSWERS
  let maxSendU = null;                                     // C#'s solved max-sendable (amount-0 quote)
  let addrErr = false;                                     // C# rejected the picked address (quote error)
  const currentKey = () => (state.recipient ? state.recipient.address + ':' + (state.amount || '') : '');
  function requestQuote() {
    // W6: ask the shell for a real fee when both halves exist; dedupe on (addr, amount).
    if (!onQuote || !state.recipient) return;
    const a = state.amount || '';
    if (!a || amountU() <= 0n) return;
    const key = state.recipient.address + ':' + a;
    if (key === lastQuoteKey) return;
    if (quoteTimer) clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => {
      quoteTimer = null;
      // loop NIT fix: re-check the AMOUNT too — a cleared field must not emit
      // an empty-amount query (and latch its key)
      if (!state.recipient || !state.amount || amountU() <= 0n) return;
      const k = state.recipient.address + ':' + state.amount;
      if (k === lastQuoteKey) return;
      lastQuoteKey = k;
      onQuote(state.recipient.address, state.amount);
    }, 350);
  }

  /* ——— recipient section ——— */
  const recSec = document.createElement('section');
  recSec.className = 'c-wallet-send__section';
  const recTitle = document.createElement('h2');
  recTitle.className = 'c-wallet-send__label';
  recTitle.textContent = strings.sendTo || 'Send to';
  recSec.append(recTitle);

  /* selected recipient row (hidden until picked) */
  const picked = document.createElement('div');
  picked.className = 'c-wallet-send__picked';
  picked.hidden = true;
  recSec.append(picked);

  /* picker: search + contact rows + address reveal */
  const picker = document.createElement('div');
  picker.className = 'c-wallet-send__picker';
  const search = createSearchField({
    placeholder: strings.searchContacts || 'Search contacts',
    onInput: (v) => renderContacts(v),
    strings,
  });
  picker.append(search);
  const rows = document.createElement('div');
  rows.className = 'c-wallet-send__contacts';           // appended after the address row below

  // "Send to an address" sits ON TOP of the contacts, aligned with them — a contact-style
  // row whose avatar slot is the qrcode glyph (Damir #136); tapping expands the input below
  const addrRow = document.createElement('button');
  addrRow.type = 'button';
  addrRow.className = 'c-wallet-send__contact';
  addrRow.setAttribute('aria-expanded', 'false');
  addrRow.setAttribute('aria-controls', (addrFieldId));   // reveal linked for AT (receive-audit n2, applied here too)
  const addrGlyph = document.createElement('span');
  addrGlyph.className = 'c-wallet-send__addrglyph';
  addrGlyph.append(icon('qrcode', { size: 20 }));
  const addrLabel = document.createElement('span');
  addrLabel.className = 'c-wallet-send__contactname';
  addrLabel.textContent = strings.sendToAddress || 'Send to an address';
  addrRow.append(addrGlyph, addrLabel);
  picker.append(addrRow);

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
    scanBtn.addEventListener('click', onQuickScan);      // → ixian:quickscan; result via setSendAddress
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
  picker.append(addrField);
  addrRow.addEventListener('click', () => {
    const open = addrField.hidden;
    addrField.hidden = !open;
    addrRow.setAttribute('aria-expanded', String(open));
    if (open) addrInput.focus();
  });

  picker.append(rows);                                   // contacts BELOW the address row (Damir #136)

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
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-wallet-send__contact';
      b.append(createAvatar({ name: c.name, address: c.address, size: 40 }));
      const t = document.createElement('span');
      t.className = 'c-wallet-send__contactname';
      t.textContent = c.name || c.address;
      b.append(t);
      if (c.pending) {                                   // #255: honest "request pending" tag
        const tag = document.createElement('span');
        tag.className = 'c-wallet-send__pendingtag';
        tag.textContent = strings.pendingContact || 'Request pending';
        b.append(tag);
      }
      b.addEventListener('click', () => pick({ ...c, contact: true }));
      rows.append(b);
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
    state.recipient = recipient;
    errLine.hidden = true;
    addrErr = false;                                       // a new recipient gets a fresh verdict
    maxSendU = null;
    picked.textContent = '';
    picked.hidden = false;
    picker.hidden = true;
    if (recipient.contact) picked.append(createAvatar({ name: recipient.name, address: recipient.address, src: recipient.avatar || null, size: 40 }));
    else {
      const glyph = document.createElement('span');
      glyph.className = 'c-wallet-send__pickedglyph';
      glyph.append(icon('qrcode', { size: 20 }));
      picked.append(glyph);
    }
    const pt = document.createElement('span');
    pt.className = 'c-wallet-send__pickedtext';
    const pn = document.createElement('span');
    pn.className = 'c-wallet-send__pickedname';
    pn.textContent = recipient.name || (strings.address || 'Address');
    pt.append(pn);
    const pa = document.createElement('span');
    pa.className = 'c-wallet-send__pickedaddr u-tabular';
    pa.textContent = recipient.address;
    pt.append(pa);
    picked.append(pt);
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
    amtInput.focus();                                    // picker collapses under you — focus flows to the amount (audit m2)
  }

  /* ——— amount section ——— */
  const amtSec = document.createElement('section');
  amtSec.className = 'c-wallet-send__section';
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
    const v = sanitizeAmount(amountInputToCanonical(disp, caret, e, undefined, !!state.amount));   // r2 MAJOR-1: pre-edit emptiness routes
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

  /* ——— continue ——— */
  const cont = createButton({
    label: strings.reviewSend || 'Review', type: 'fill', size: 56, width: 'full',
    icon: icon('arrow-up-right', { size: 20 }),
    onClick: () => openSendReview(),
  });
  cont.disabled = true;
  const contWrap = document.createElement('div');
  contWrap.className = 'c-wallet-send__actions';
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
    if (addrErr) {
      // C# rejected the picked address (quote error:'address') — say it, gate it.
      feeLine.textContent = '';
      insuff.hidden = false;
      insuff.textContent = strings.badAddress || 'That doesn\u2019t look like an Ixian address.';
      cont.disabled = true;
      return;
    }
    if (!fresh) {
      // W6 pending state: the honest line, no numbers invented and no STALE ones —
      // a fee quoted for another (recipient, amount) pair never shows (loop MAJOR).
      feeLine.textContent = (a > 0n && state.recipient)
        ? (strings.feePending || 'Calculating network fee\u2026')
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
    feeLine.textContent = (strings.feeAndTotal || 'Network fee {f} IXI \u00b7 Total {t} IXI')
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
  el._applySendQuote = ({ fee: qFee, balance: qBal, max: qMax, address: qAddr, amount: qAmt, error: qErr } = {}) => {
    if (qBal !== null && qBal !== undefined && qBal !== '') { balU = toUnits(qBal); renderAvail(); }
    const echoed = qAddr !== undefined;
    const matchesRecipient = !echoed || (state.recipient && state.recipient.address === qAddr);
    if (qErr === 'address' && matchesRecipient) { addrErr = true; sync(); return; }
    if (qMax !== null && qMax !== undefined && qMax !== '' && matchesRecipient) maxSendU = toUnits(qMax);
    if (qFee !== null && qFee !== undefined && qFee !== '') {
      const key = echoed ? qAddr + ':' + (qAmt == null ? '' : String(qAmt)) : currentKey();
      if (!echoed || key === currentKey()) { feeU = toUnits(qFee); quotedKey = key; }
    }
    sync();
  };

  /* ——— review sheet (#26) ——— */
  function openSendReview() {
    if (!valid() || state.sending) return;               // per-VIEW in-flight token (audit C1)
    const r = state.recipient;
    const aU = amountU();
    const feeAtOpen = feeU;                              // loop fix: the sheet and the payload use ONE fee
    const content = document.createElement('div');
    content.className = 'c-sendreview';

    const who = document.createElement('div');
    who.className = 'c-sendreview__who';
    if (r.contact) who.append(createAvatar({ name: r.name, address: r.address, src: r.avatar || null, size: 48 }));
    const wt = document.createElement('div');
    wt.className = 'c-sendreview__whotext';
    const wn = document.createElement('div');
    wn.className = 'c-sendreview__name';
    wn.textContent = r.name || (strings.address || 'Address');
    const wa = document.createElement('div');
    wa.className = 'c-sendreview__addr u-tabular';
    wa.textContent = r.address;
    wt.append(wn, wa);
    who.append(wt);
    content.append(who);

    const rowsBox = document.createElement('div');
    rowsBox.className = 'c-sendreview__rows';
    const row = (label, value) => {
      const rr = document.createElement('div');
      rr.className = 'c-sendreview__row';
      const l = document.createElement('span'); l.className = 'c-sendreview__rowlabel'; l.textContent = label;
      const v = document.createElement('span'); v.className = 'c-sendreview__rowvalue u-tabular'; v.textContent = value;
      rr.append(l, v);
      return rr;
    };
    // EXACT values at the confirm moment (audit M3) — what you approve is what is sent.
    // ★ I-6 (#360): grouped for READING, full precision kept — separators are the
    // user's only defence against a mistyped zero at exactly this moment.
    rowsBox.append(
      row(strings.amount || 'Amount', groupAmountDisplay(fromUnits(aU)) + ' IXI'),
      row(strings.fee || 'Fee', groupAmountDisplay(fromUnits(feeAtOpen)) + ' IXI'),
      row(strings.total || 'Total', groupAmountDisplay(fromUnits(aU + feeAtOpen)) + ' IXI'),
    );
    content.append(rowsBox);

    const sheetErr = document.createElement('p');
    sheetErr.className = 'c-wallet-send__error';
    sheetErr.setAttribute('role', 'alert');
    sheetErr.hidden = true;
    content.append(sheetErr);

    const actions = document.createElement('div');
    actions.className = 'c-sendreview__actions';
    const cancel = createButton({ label: strings.cancel || 'Cancel', type: 'text', size: 44,
      onClick: () => { if (!state.sending) closeSheet(sheet); } });
    const confirm = createButton({ label: strings.confirmSend || 'Confirm & send', type: 'fill', size: 44,
      icon: icon('arrow-up-right', { size: 18 }),
      onClick: (e) => {
        if (e.currentTarget.dataset.acted !== undefined || state.sending) return;   // #72④ latch + view token
        e.currentTarget.dataset.acted = '';
        state.sending = true;
        const attempt = ++state.attempt;                 // invalidates stale bridge callbacks
        // money in flight → the sheet must NOT be dismissible (audit C1): no Esc, no
        // scrim, Cancel disabled; fail() restores the safe-dismiss paths for retry
        cancel.disabled = true;
        setOverlayOpts(sheet, { host, lightDismiss: false, escDismiss: false });
        sheetErr.hidden = true;
        setLoading(confirm, true);
        const payload = { recipients: [{ address: r.address, name: r.name }], amount: state.amount, fee: fromUnits(feeAtOpen) };
        const done = () => {
          if (attempt !== state.attempt) return;         // stale callback from a superseded attempt
          state.sending = false;
          setLoading(confirm, false);
          setSuccess(confirm, { label: strings.sent || 'Sent' });
          setTimeout(() => { closeSheet(sheet); if (onDone) onDone(payload); }, 900);
        };
        const fail = (msg) => {
          if (attempt !== state.attempt) return;
          state.sending = false;
          setLoading(confirm, false);
          delete confirm.dataset.acted;                  // retry stays possible
          cancel.disabled = false;
          setOverlayOpts(sheet, { host, lightDismiss: false, escDismiss: true });
          if (msg === '') {                              // #523: native-confirm cancel — silent re-enable
            sheetErr.hidden = true;
            sheetErr.textContent = '';
            return;
          }
          sheetErr.hidden = false;                       // unhide BEFORE text → alert announces
          sheetErr.textContent = msg || strings.sendFailed || 'The payment could not be sent. Please try again.';
        };
        if (onSend) onSend(payload, { done, fail }); else done();
      } });
    actions.append(cancel, confirm);                               // #60: two short labels side-by-side
    content.append(actions);

    // lightDismiss OFF from the start — a money confirmation is explicit (#56 modal
    // philosophy); Esc stays a safe dismiss until the send is actually in flight
    const sheet = createSheet({ content, host, strings, lightDismiss: false,
      title: strings.reviewTitle || 'Review payment' });
    openSheet(sheet);
    return sheet;
  }

  renderContacts('');
  if (lockedRecipient) pick({ ...lockedRecipient, contact: !!lockedRecipient.name });   // chat Pay: straight to the amount
  return el;
}

/** QR-scan result lands here (shell wires `ixian:quickscan` → setSendAddress). Accepts
 *  the legacy QR formats `addr`, `addr:ixi`, `addr:send:amount`. */
export function setSendAddress(el, scanned) {
  if (!el) return el;
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

/** W6 (#523): a fee/balance quote lands here (shell wires the `setSendQuote` push).
 *  Values are RAW decimal strings from C# (never display-formatted). Missing/empty
 *  members leave that half unchanged. */
export function setSendQuote(el, quote) {
  if (el && typeof el._applySendQuote === 'function') el._applySendQuote(quote || {});
  return el;
}

/** Inline error on the send view (shell hook parity with apps-add's setAddError). */
export function setSendError(el, msg) {
  const err = el && el.querySelector('.c-wallet-send__error');
  if (!err) return el;
  err.hidden = !msg;                                     // unhide BEFORE text → alert announces (audit m3)
  err.textContent = msg || '';
  return el;
}
