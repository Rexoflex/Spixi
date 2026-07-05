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
 */
import { createAvatar } from './avatar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { setOverlayOpts } from './overlay.js';
import { icon } from './icons.js';

/** Sanitize a decimal string: digits + one separator, ≤8 decimals (chain precision).
 *  Comma handling (audit M2): with a '.' present commas are THOUSANDS grouping and are
 *  stripped ('1,000.5' → '1000.5'); with no '.' the comma is a decimal separator
 *  ('12,5' → '12.5') — never a silent magnitude change.
 *  Exported (slice 3): wallet-receive's request amount follows the SAME rules. */
export function sanitizeAmount(raw) {
  let s = String(raw || '');
  s = s.includes('.') ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  s = s.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
  const [int, dec] = s.split('.');
  return dec != null ? int + '.' + dec.slice(0, 8) : s;
}

/* —— exact money math in integer 1e-8 units via BigInt (ES2020 floor, #45; audit M1:
      binary floats falsely rejected exactly-fitting amounts and Max could overshoot;
      Number×1e8 overflows 2^53 at Ixian-scale balances) —— */
/** Exported (#138): the tip sheet's balance guard compares in the same units —
 *  Number comparison re-imports the audit-M1 float bug at ≥1e8 IXI balances. */
export function toUnits(v) {
  const s = typeof v === 'number' ? v.toFixed(8) : String(v || '0');
  const neg = s.startsWith('-');
  const [i = '0', d = ''] = (neg ? s.slice(1) : s).split('.');
  const u = BigInt(i || '0') * 100000000n + BigInt((d + '00000000').slice(0, 8));
  return neg ? -u : u;
}
function fromUnits(u) {
  const neg = u < 0n;
  const a = neg ? -u : u;
  const i = (a / 100000000n).toString();
  const d = (a % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
  return (neg ? '-' : '') + i + (d ? '.' + d : '');
}

let walletSendSeq = 0;                                     // aria-controls ids (receive-audit n2)

export function createWalletSend({
  contacts = [], balance = 0, fee = 0, strings = {}, host,
  lockedRecipient = null,   // chat Pay (#139): { name?, address } — pre-picked, NO change (the peer is known)
  onQuickScan, onSend, onDone,
} = {}) {
  // NB contract: balance/fee are RAW numerics (number or plain decimal string) — this is
  // the one FE surface doing money math. Pre-formatted display strings (hero-style
  // '923,852.00') are NOT valid inputs here.
  const el = document.createElement('div');
  el.className = 'c-wallet-send';
  const addrFieldId = 'c-wallet-send-addrfield-' + (++walletSendSeq);
  const balU = toUnits(balance);
  const feeU = toUnits(fee);
  const state = { recipient: null, amount: '', sending: false, attempt: 0 };

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
  const scanBtn = document.createElement('button');
  scanBtn.type = 'button';
  scanBtn.className = 'c-wallet-send__scan';
  scanBtn.setAttribute('aria-label', strings.scan || 'Scan');
  scanBtn.append(icon('scan', { size: 20 }));
  if (onQuickScan) scanBtn.addEventListener('click', onQuickScan);   // → ixian:quickscan; result via setSendAddress
  addrField.append(addrInput, scanBtn);
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
      b.addEventListener('click', () => pick({ ...c, contact: true }));
      rows.append(b);
    }
    if (!list.length && needle) {
      const none = document.createElement('p');
      none.className = 'c-wallet-send__none';
      none.setAttribute('role', 'note');
      none.textContent = (strings.noContactMatch || 'No contact matches “{q}” — you can paste their address instead.').split('{q}').join(q);
      rows.append(none);
    }
  }

  function pick(recipient) {
    state.recipient = recipient;
    errLine.hidden = true;
    picked.textContent = '';
    picked.hidden = false;
    picker.hidden = true;
    if (recipient.contact) picked.append(createAvatar({ name: recipient.name, address: recipient.address, size: 40 }));
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
        picked.hidden = true;
        picker.hidden = false;
        sync();
        const si = picker.querySelector('input');
        if (si) si.focus();                              // focus back into the picker (audit m2)
      });
      picked.append(clear);
    }
    sync();
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
  amtInput.addEventListener('input', () => {
    const v = sanitizeAmount(amtInput.value);
    if (v !== amtInput.value) amtInput.value = v;
    state.amount = v;
    sync();
  });
  const unit = document.createElement('span');
  unit.className = 'c-wallet-send__unit';
  unit.textContent = 'IXI';
  const maxBtn = createButton({ label: strings.max || 'Max', type: 'outline', size: 32,
    onClick: () => {
      // sending EVERYTHING deserves a deliberate stop (Damir #136): explicit confirm,
      // safe action autofocused (APG), only then the field fills
      const maxU = balU - feeU;
      openModal(createModal({
        title: strings.maxTitle || 'Send your entire balance?',
        body: (strings.maxBody || 'This fills in everything you have — {m} IXI after the network fee. You would be left with 0 IXI.')
          .split('{m}').join(fromUnits(maxU > 0n ? maxU : 0n)),
        role: 'alertdialog', host,
        actions: [
          { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
          { label: strings.maxConfirm || 'Yes, I understand', type: 'fill', onClick: () => {
            state.amount = fromUnits(maxU > 0n ? maxU : 0n);   // exact integer units — never overshoots
            amtInput.value = state.amount;
            sync();
          } },
        ],
      }));
    } });
  amtRow.append(amtInput, unit, maxBtn);
  amtSec.append(amtRow);

  const availLine = document.createElement('p');
  availLine.className = 'c-wallet-send__meta u-tabular';
  availLine.textContent = (strings.available || 'Available: {b} IXI').split('{b}').join(fromUnits(balU));
  amtSec.append(availLine);

  const feeLine = document.createElement('p');
  feeLine.className = 'c-wallet-send__meta u-tabular';
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
  function valid() {
    if (!state.recipient || !state.amount) return false;
    const a = amountU();
    return a > 0n && a + feeU <= balU;
  }
  function sync() {
    const a = amountU();
    const total = a > 0n ? a + feeU : feeU;
    feeLine.textContent = (strings.feeAndTotal || 'Network fee {f} IXI · Total {t} IXI')
      .split('{f}').join(fromUnits(feeU)).split('{t}').join(fromUnits(total));
    const over = a > 0n && a + feeU > balU;
    insuff.hidden = !over;                                 // unhide BEFORE text → alert announces
    if (over) insuff.textContent = strings.insufficient || 'Not enough IXI to cover this amount plus the network fee.';
    cont.disabled = !valid();
  }
  sync();

  /* ——— review sheet (#26) ——— */
  function openSendReview() {
    if (!valid() || state.sending) return;               // per-VIEW in-flight token (audit C1)
    const r = state.recipient;
    const aU = amountU();
    const content = document.createElement('div');
    content.className = 'c-sendreview';

    const who = document.createElement('div');
    who.className = 'c-sendreview__who';
    if (r.contact) who.append(createAvatar({ name: r.name, address: r.address, size: 48 }));
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
    // EXACT values at the confirm moment (audit M3) — what you approve is what is sent
    rowsBox.append(
      row(strings.amount || 'Amount', fromUnits(aU) + ' IXI'),
      row(strings.fee || 'Fee', fromUnits(feeU) + ' IXI'),
      row(strings.total || 'Total', fromUnits(aU + feeU) + ' IXI'),
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
        const payload = { recipients: [{ address: r.address, name: r.name }], amount: state.amount, fee: fromUnits(feeU) };
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
    if (amt) { amt.value = parts[2]; amt.dispatchEvent(new Event('input', { bubbles: true })); }
  }
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
