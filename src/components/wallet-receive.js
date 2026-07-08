/**
 * c-wallet-receive — Receive/Request, slice 3 (spec §4, #133; shape per Damir
 * 2026-07-05: ONE progressive surface, matching the send screen's grammar).
 *
 * Default = RECEIVE: QR of the own address in the legacy `address:ixi` format
 * (wallet_request.html parity) on the --surface-qr card (near-white in BOTH themes —
 * scan contrast), the FULL address in the member-sheet chip pattern (#99) with an
 * HONEST copy morph (✓ only after the clipboard write resolves — audit m1), and
 * Share (shell duty via onShare — NO share bridge command exists in the legacy set,
 * §9 ask; shells can use navigator.share where present).
 *
 * "Request an amount" (aria-expanded/-controls row, send-screen grammar) morphs the
 * surface: the amount input follows wallet-send's sanitize rules (shared export),
 * the QR re-encodes IN PLACE to `address:send:amount` — amount CANONICALIZED
 * ('12.'→'12', '.5'→'0.5', '007'→'7'; audit M1: what the QR carries is what a legacy
 * parser must read) — and a contact strip appears: "Send request to a contact" →
 * onSendRequest({ contact, amount }) mirrors the legacy `ixian:sendrequest` payload.
 * onSendRequest is FIRE-AND-FORGET (audit m4): the ✓ morph confirms the intent left
 * this surface, not chain/chat delivery — matching the legacy command's semantics.
 * Collapsing the reveal clears the amount (the visible QR must never encode an
 * amount the user can no longer see — state honesty).
 *
 * Request latch (audit M2/M3/M5 rework): the latch lives in STATE, not on row DOM —
 * search re-renders keep it; the acted row stays ENABLED (focus is not dropped) and
 * carries the ✓; a hidden live region announces the send; changing the amount
 * mid-latch cancels it and resets the morph (no stale "sent" against a new amount).
 *
 * No FE money math here beyond sanitize — a request is a message, not a spend;
 * the bridge re-validates when the payer acts on it.
 *
 * createWalletReceive({ address, contacts, strings, host, onShare, onSendRequest }) → view
 * Free fn (#44): setRequestAmount(el, amount) — programmatic amount (tests/bridge);
 *   Numbers are expanded to plain decimals first (audit C1: String(1e-7) → '1e-7'
 *   would sanitize into '17' — a silent magnitude change).
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { createAvatar } from './avatar.js';
import { createSearchField } from './search-field.js';
import { createQrSvg, setQrValue } from './qr.js';
import { sanitizeAmount, canonicalAmount } from './money.js';   // #143: shared money module
import { icon } from './icons.js';

/** '0', '0.', '' → not a requestable amount (plain receive stays). */
function requestable(amount) {
  return !!amount && /[1-9]/.test(amount);
}

let walletReceiveSeq = 0;                                  // aria-controls ids (audit n2)

export function createWalletReceive({
  address = '', contacts = [], strings = getStrings(), host,
  onShare, onSendRequest,
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-wallet-receive';
  const state = { amount: '', contactQuery: '', latch: null };   // latch: { address, timer }

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

  const qrLabel = () => requestable(state.amount)
    ? (strings.qrRequestLabel || 'QR code — payment request for {a} IXI').split('{a}').join(canonicalAmount(state.amount))
    : (strings.qrReceiveLabel || 'QR code — your Ixian address');
  const qrValue = () => requestable(state.amount)
    ? address + ':send:' + canonicalAmount(state.amount)   // legacy request format — setSendAddress parses it
    : address + ':ixi';                                    // legacy receive format (wallet_request parity)

  /* ——— QR card ——— */
  const card = document.createElement('div');
  card.className = 'c-wallet-receive__qrcard';
  const qr = createQrSvg(qrValue(), { label: qrLabel() });
  card.append(qr);
  el.append(card);

  const caption = document.createElement('p');
  caption.className = 'c-wallet-receive__caption';         // visible copy — announcements go to the live region
  el.append(caption);

  /* hidden live region (audit m3/M3): announces MODE TRANSITIONS and the request-sent
     confirmation — not every keystroke (the caption used to be aria-live and spammed) */
  const live = document.createElement('p');
  live.className = 'c-wallet-receive__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  /* ——— address (member-sheet chip pattern, #99: FULL address, honest copy) ——— */
  const addrLabel = document.createElement('div');
  addrLabel.className = 'c-wallet-receive__addrlabel';
  addrLabel.textContent = strings.yourAddress || 'Your address';
  const addrRow = document.createElement('div');
  addrRow.className = 'c-wallet-receive__addr';
  const addrValue = document.createElement('span');
  addrValue.className = 'c-wallet-receive__addrvalue u-tabular';
  addrValue.textContent = address;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'c-wallet-receive__copy';
  const copyIdle = (strings.copy || 'Copy') + ' — ' + (strings.yourAddress || 'Your address');
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
        () => copyMorph('x', strings.copyFailed || 'Couldn’t copy — select the address text instead'),
      );
    } else {
      copyMorph('x', strings.copyFailed || 'Couldn’t copy — select the address text instead');
    }
  });
  addrRow.append(addrValue, copy);
  el.append(addrLabel, addrRow);

  /* ——— share (shell duty — no legacy bridge command; §9) ——— */
  if (onShare) {
    el.append(createButton({
      label: strings.shareAddress || 'Share address', type: 'outline', size: 44, width: 'full',
      icon: icon('share-3', { size: 18 }),
      onClick: () => onShare({
        address,
        amount: requestable(state.amount) ? canonicalAmount(state.amount) : null,
        value: qrValue(),
      }),
    }));
  }

  /* ——— request an amount (progressive reveal, send-screen row grammar) ——— */
  const boxId = 'c-wallet-receive-reqbox-' + (++walletReceiveSeq);
  const reqRow = document.createElement('button');
  reqRow.type = 'button';
  reqRow.className = 'c-wallet-receive__reqrow';
  reqRow.setAttribute('aria-expanded', 'false');
  reqRow.setAttribute('aria-controls', boxId);             // reveal is programmatically linked (audit n2)
  const reqGlyph = document.createElement('span');
  reqGlyph.className = 'c-wallet-receive__reqglyph';
  reqGlyph.append(icon('arrow-down-left', { size: 20 }));
  const reqLabel = document.createElement('span');
  reqLabel.className = 'c-wallet-receive__reqlabel';
  reqLabel.textContent = strings.requestAmount || 'Request an amount';
  reqRow.append(reqGlyph, reqLabel, icon('chevron-down', { size: 18 }));
  el.append(reqRow);

  const reqBox = document.createElement('div');
  reqBox.className = 'c-wallet-receive__reqbox';
  reqBox.id = boxId;
  reqBox.hidden = true;
  el.append(reqBox);

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
  reqBox.append(amtRow);

  /* contact strip — request-as-message (legacy ixian:sendrequest → chat payment
   * bubble). ONLY rendered when onSendRequest is wired: the home wallet tab
   * (HomePage) has NO ixian:sendrequest verb (it's a WalletReceivePage verb), so
   * omitting the callback HIDES the strip rather than showing a dead action that
   * would falsely confirm "sent" (audit MAJOR, Batch 6). The amount-request QR
   * above is client-side and stays available regardless. */
  let askBox = null;
  let rows = null;
  if (onSendRequest) {
    askBox = document.createElement('div');
    askBox.className = 'c-wallet-receive__ask';
    askBox.hidden = true;
    const askLabel = document.createElement('h2');
    askLabel.className = 'c-wallet-receive__asklabel';
    askLabel.textContent = strings.sendRequestTo || 'Send request to a contact';
    askBox.append(askLabel);
    const search = createSearchField({
      placeholder: strings.searchContacts || 'Search contacts',
      onInput: (v) => renderContacts(v),
      strings,
    });
    askBox.append(search);
    rows = document.createElement('div');
    rows.className = 'c-wallet-receive__contacts';
    askBox.append(rows);
    reqBox.append(askBox);
  }

  /* latch helpers (audit M2/M5): state-held so re-renders keep it, amount edits kill it */
  function clearLatch(rerender) {
    if (!state.latch) return;
    clearTimeout(state.latch.timer);
    state.latch = null;
    if (rerender) renderContacts(state.contactQuery);      // resets morphs + re-enables rows
  }

  function renderContacts(q) {
    if (!rows) return;                                   // contact strip omitted (no onSendRequest)
    state.contactQuery = q || '';
    const needle = state.contactQuery.trim().toLocaleLowerCase();
    rows.textContent = '';
    const list = contacts.filter((c) => !needle
      || (c.name || '').toLocaleLowerCase().includes(needle)
      || (c.address || '').toLocaleLowerCase().includes(needle));
    const cap = needle ? 8 : 5;                            // #136③ scaling: search is the path through hundreds
    for (const c of list.slice(0, cap)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-wallet-receive__contact';
      b.append(createAvatar({ name: c.name, address: c.address, size: 40 }));
      const t = document.createElement('span');
      t.className = 'c-wallet-receive__contactname';
      t.textContent = c.name || c.address;
      const go = document.createElement('span');
      go.className = 'c-wallet-receive__contactgo';
      b.append(t, go);
      if (state.latch && state.latch.address === c.address) {
        // the acted row survives re-renders with its ✓ (audit M2) and stays ENABLED —
        // disabling the focused control would drop keyboard focus to body (audit M3)
        b.dataset.acted = '';
        go.append(icon('check', { size: 18 }));
      } else {
        go.append(icon('send-2', { size: 18 }));
        if (state.latch) b.disabled = true;                // one request in flight at a time
      }
      b.addEventListener('click', () => {
        if (state.latch) return;                           // #72④: a request is a message — no double fire
        const amount = canonicalAmount(state.amount);
        state.latch = {
          address: c.address,
          timer: setTimeout(() => { state.latch = null; renderContacts(state.contactQuery); }, 1600),
        };
        b.dataset.acted = '';
        go.textContent = '';
        go.append(icon('check', { size: 18 }));
        for (const row of rows.querySelectorAll('button')) { if (row !== b) row.disabled = true; }
        live.textContent = (strings.requestSentTo || 'Request for {a} IXI sent to {name}')
          .split('{a}').join(amount).split('{name}').join(c.name || c.address);
        if (onSendRequest) onSendRequest({ contact: c, amount });
      });
      rows.append(b);
    }
    if (list.length > cap) {
      const more = document.createElement('p');
      more.className = 'c-wallet-receive__none';
      more.setAttribute('role', 'note');
      more.textContent = (strings.moreContacts || '{n} more — keep typing to narrow it down')
        .split('{n}').join(String(list.length - cap));
      rows.append(more);
    }
    if (!list.length && needle) {
      const none = document.createElement('p');
      none.className = 'c-wallet-receive__none';
      none.setAttribute('role', 'note');
      none.textContent = (strings.noContactMatch || 'No contact matches “{q}” — you can paste their address instead.').split('{q}').join(q);
      rows.append(none);
    }
  }

  let wasActive = false;
  function sync() {
    const active = requestable(state.amount);
    setQrValue(qr, qrValue(), { label: qrLabel() });       // re-encode in place — no node swap
    caption.textContent = active
      ? (strings.requestingCaption || 'Requesting {a} IXI — scanning fills the amount in').split('{a}').join(canonicalAmount(state.amount))
      : (strings.receiveCaption || 'Scan to send IXI to this address');
    if (askBox) askBox.hidden = !active;
    if (active !== wasActive) {                            // transitions announce; keystrokes don't (audit m3)
      wasActive = active;
      live.textContent = active
        ? (strings.requestModeAnnounce || 'QR now requests a specific amount')
        : (strings.receiveModeAnnounce || 'QR shows your plain address again');
    }
  }

  amtInput.addEventListener('input', () => {
    const v = sanitizeAmount(amtInput.value);
    if (v !== amtInput.value) amtInput.value = v;
    state.amount = v;
    clearLatch(true);                                      // a new amount invalidates a pending "sent ✓" (audit M5)
    sync();
  });

  reqRow.addEventListener('click', () => {
    const open = reqBox.hidden;
    reqBox.hidden = !open;
    reqRow.setAttribute('aria-expanded', String(open));
    if (open) { amtInput.focus(); return; }
    // collapsing the section clears the request — the visible QR must never encode
    // an amount the user can no longer see (state honesty)
    amtInput.value = '';
    state.amount = '';
    clearLatch(true);
    sync();
  });

  sync();
  renderContacts('');
  return el;
}

/** Free fn (#44): set the request amount programmatically (tests / bridge deep-link).
 *  Numbers are expanded to plain decimal first — String(1e-7) is '1e-7', which the
 *  shared sanitizer would strip into '17': a silent magnitude change (audit C1). */
export function setRequestAmount(el, amount) {
  if (!el) return el;
  const row = el.querySelector('.c-wallet-receive__reqrow');
  const box = el.querySelector('.c-wallet-receive__reqbox');
  const input = el.querySelector('.c-wallet-receive__amount');
  if (!row || !box || !input) return el;
  if (box.hidden) { box.hidden = false; row.setAttribute('aria-expanded', 'true'); }
  const plain = typeof amount === 'number'
    ? amount.toFixed(8).replace(/\.?0+$/, '')              // 1e-7 → '0.0000001', 17 → '17'
    : String(amount == null ? '' : amount);
  input.value = plain;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return el;
}
