/**
 * c-tipsheet — the "#26-lite" amount sheet: chat TIPPING and chat REQUESTS
 * (docs/tipping-spec.md, #136/#138/#139).
 *
 * One machinery, two kinds — both are "small in-context money asks" where the
 * sheet IS the review (recipient avatar+name + amount on the same surface as the
 * single latched confirm whose label carries the amount):
 *   openTipSheet({ …, onTip })         — "Tip {name}" / "Tip {a} IXI"; balance guard ON
 *     (you can't tip what you don't have) in INTEGER 1e-8 units (tip-audit M2).
 *   openRequestSheet({ …, onRequest }) — "Request from {name}" / "Request {a} IXI";
 *     NO balance guard (it's the payer's money) — chat attach → Request (#139,
 *     Damir: sheet over the QR-centric receive screen when the counterparty is known).
 *
 * Presets 1/5/10 IXI (c-chip toggles, aria-pressed) + Custom → decimal input on the
 * shared wallet-send sanitize rules; payload amount is CANONICAL (shared
 * canonicalAmount). The custom slot is GHOSTED not hidden (Damir round 2): space
 * reserved from the start, the sheet never grows under the finger.
 *
 * Dismissal: light dismiss ALLOWED pre-confirm; IN FLIGHT = LOCKED for real
 * (tip-audit C1: live overlay opts — Esc, scrim, back all hold); onDismiss bumps
 * the attempt counter (M1); controls freeze + sync() stands down in flight (M3);
 * ctrl one-shot per attempt (m1); failure alert separate from the guard (m4).
 *
 * Bridge: tip → legacy `ixian:contextAction:tip:MSGID:AMOUNT`; request → the
 * legacy `ixian:sendrequest` family (request = a chat message). §9 asks in spec §4.
 */
import { getStrings } from './strings-runtime.js';
import { attachAmountKeyboardDismiss } from './amount-keyboard.js';   // ★ #609: the amount field's only way out on iOS
import { createAvatar, truncateAddressMiddle, isPseudoAddressNick } from './avatar.js';   // ★ #569: the #211 truncation canon, enforced HERE
import { createButton, setLoading, setSuccess } from './button.js';
import { createChip, setChipSelected } from './chip.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { setOverlayOpts } from './overlay.js';
import { sanitizeAmount, toUnits, canonicalAmount, ungroupAmountInput, amountInputToCanonical, attachAmountPreEdit, groupAmountDisplay, amountCaretAfterFormat } from './money.js';   // #143 shared money module · ★ I-6 (#360) display grouping

/** ★ #569 — the payee name as it may be SHOWN: a real nickname, else the address
 *  in the #211 truncated form. Never the raw base58, and never an empty name when
 *  an address exists ("Request from " with nothing after it was the other half). */
function payeeDisplayName({ name = '', address = '' } = {}) {
  const n = String(name == null ? '' : name).trim();
  const a = String(address == null ? '' : address).trim();
  // isPseudoAddressNick catches C#'s address-echo in every shape it arrives in;
  // the equality test is the belt for an echo the predicate has not seen.
  if (n && n !== a && !isPseudoAddressNick(n)) return n;
  return a ? truncateAddressMiddle(a) : n;
}

function amountSheetCopy(kind, strings) {
  return kind === 'request' ? {
    title: strings.requestName || 'Request from {name}',
    confirm: strings.requestConfirm || 'Request {a} IXI',
    idle: strings.request || 'Request',
    success: strings.requested || 'Requested',
    fail: strings.requestFailed || 'Couldn’t send the request. Check the address and try again.',
  } : {
    title: strings.tipName || 'Tip {name}',
    confirm: strings.tipConfirm || 'Tip {a} IXI',
    idle: strings.tip || 'Tip',
    success: strings.tipped || 'Tipped',
    fail: strings.tipFailed || 'The tip could not be sent. Please try again.',
  };
}

function openAmountSheet({
  message = {}, recipient = {}, balance = null,
  presets = ['1', '5', '10'], strings = getStrings(), host, onSubmit,
} = {}, kind) {
  const copy = amountSheetCopy(kind, strings);
  const content = document.createElement('div');
  content.className = 'c-tipsheet';
  content.dataset.kind = kind;
  const state = { amount: '', sending: false, attempt: 0 };
  const balU = balance != null ? toUnits(balance) : null;

  /* head — recipient VISIBLE at the confirm moment (#26-lite) */
  const head = document.createElement('div');
  head.className = 'c-tipsheet__head';
  // #342 (Damir F5 item (d)): the recipient's photo at the confirm moment.
  // Option: recipient.avatar — an image source, or null for the gradient. This head
  // is the one place the user checks WHO is about to be paid, so a gradient where every
  // other surface shows a face is the worst place to drop it. The caller now supplies
  // `avatar`; `|| null` keeps the gradient for a contact with no stored photo.
  /* ⚠ review NIT: the AVATAR is a #211 survivor too. initials() takes any leading
   * letter, so C#'s address echo produced a one-letter disc instead of the person
   * glyph. The resolver decides the name once, for both the disc and the title. */
  const payeeName = payeeDisplayName(recipient);
  head.append(createAvatar({ name: isPseudoAddressNick(payeeName) ? '' : payeeName, address: recipient.address, src: recipient.avatar || null, size: 40 }));
  const htext = document.createElement('div');
  htext.className = 'c-tipsheet__headtext';
  /* ★ #569 (Damir screenshot, desktop): the header rendered the RAW 65-character
   * base58 when the sender has no nickname, and the unbroken string forced the
   * sheet's horizontal scrollbar.
   *
   * Mechanism: C#'s resolveNick ECHOES the address into the nickname for a nameless
   * contact, so `identity.name` IS the address. chat.html guards that echo on the
   * group rung (#370 B-6) but the 1:1 rung passes `identity.name` straight through.
   *
   * ⚠ The guard belongs HERE, not at that one caller. This sheet is the payment
   * confirm moment, every entry point reaches this line, and #211 is a canon with no
   * survivors — a caller added later must not be able to reintroduce the leak. */
  const title = document.createElement('h2');
  title.className = 'c-tipsheet__title';
  /* ★★ #589 (round-2 review) — DAMIR'S RULE IS ABOUT THE NAME, AND MY FIRST CUT APPLIED
   * IT TO THE WHOLE SENTENCE. The title is a template, and the name is NOT always last:
   *   de-de  "{name} Trinkgeld geben"      ru-ru  "Чаевые {name}"
   *   sl-si  "Napitnina za {name}"         fr-fr  "Donner un pourboire à {name}"
   * With `nowrap` + ellipsis on the sentence, German ate the VERB — a money confirm
   * sheet reading "SuperLongNickname…" with no indication of what the action is.
   *
   * The name gets its own inline span and the ellipsis rides THAT; the sentence around
   * it wraps freely. So a long nick truncates at its end, the action always survives,
   * and the anti-sideways-scroll guarantee holds because the span cannot exceed its
   * line box. Built by splitting on the placeholder so every locale's word order is
   * honoured wherever it puts {name}. */
  {
    const parts = copy.title.split('{name}');
    /* ★★ #610 round 2: the ACTION gets an element of its own, not a bare text node.
     * A weight step alone is a subtle difference on San Francisco, and the complaint was
     * that "Testan…oo  Trinkgeld geben" read as ONE string with the verb repeated after
     * the name. Name and action are two things; they now look like two things — the name
     * in the title's own ink and weight, the action a step back in both. */
    const verb = (txt) => {
      const v = document.createElement('span');
      v.className = 'c-tipsheet__titleverb';
      v.textContent = txt;
      return v;
    };
    title.append(verb(parts[0] || ''));
    const nameEl = document.createElement('span');
    nameEl.className = 'c-tipsheet__payee';
    nameEl.textContent = payeeName;
    /* the recovery path for a truncated name — this is the payment confirm moment, and
       two contacts differing only past the cut would otherwise render identically.
       ⚠ Desktop-only by nature (a title tooltip does not exist on touch); the wrapping
       sentence is what keeps the phone case readable. Screen readers are unaffected
       either way — the full name is in textContent. */
    nameEl.title = payeeName;
    title.append(nameEl);
    for (let i = 1; i < parts.length; i++) {
      title.append(verb(parts[i] || ''));
      if (i < parts.length - 1) { const n2 = nameEl.cloneNode(true); title.append(n2); }
    }
  }
  htext.append(title);
  if (message.excerpt) {
    const ex = document.createElement('p');
    ex.className = 'c-tipsheet__excerpt';
    ex.textContent = message.excerpt;                      // which message this lands on
    htext.append(ex);
  }
  head.append(htext);
  content.append(head);

  /* presets + Custom (c-chip toggles, aria-pressed carries state) */
  const chipRow = document.createElement('div');
  chipRow.className = 'c-tipsheet__chips';
  chipRow.setAttribute('role', 'group');
  chipRow.setAttribute('aria-label', strings.tipAmount || 'Amount');
  const chips = [];
  const selectChip = (chip) => { for (const c of chips) setChipSelected(c, c === chip); };
  for (const p of presets) {
    const chip = createChip({
      label: p + ' IXI',
      onClick: (e) => {
        if (state.sending) return;                         // frozen in flight (tip-audit M3)
        selectChip(e.currentTarget);
        customRow.dataset.ghost = '';                      // back to reserved slot — sheet height constant
        customInput.value = '';                            // preset supersedes → stale custom cleared (m3)
        state.amount = String(p);
        sync();
      },
      strings,
    });
    chips.push(chip);
    chipRow.append(chip);
  }
  const customChip = createChip({
    label: strings.custom || 'Custom',
    onClick: (e) => {
      if (state.sending) return;
      selectChip(e.currentTarget);
      delete customRow.dataset.ghost;                      // slot was always there — just becomes visible
      state.amount = sanitizeAmount(ungroupAmountInput(customInput.value));   // ★ I-6 (#360): SETTLED read — the field holds a display form, not a mid-edit
      sync();
      customInput.focus();
    },
    strings,
  });
  chips.push(customChip);
  chipRow.append(customChip);
  content.append(chipRow);

  /* custom amount — GHOSTED slot (Damir round 2): reserved space, no reflow */
  const customRow = document.createElement('div');
  customRow.className = 'c-tipsheet__customrow';
  customRow.dataset.ghost = '';
  const customInput = document.createElement('input');
  customInput.className = 'c-tipsheet__custom u-tabular';
  customInput.type = 'text';
  customInput.inputMode = 'decimal';
  customInput.placeholder = '0';
  customInput.setAttribute('aria-label', strings.tipAmount || 'Amount');
  /* ★★ V-1: the pre-edit snapshot. A select-all-and-paste is the one edit
     whose separators are NOT ours, and only the REPLACED RANGE says so. */
  const readPreEdit = attachAmountPreEdit(customInput);
  customInput.addEventListener('input', (e) => {
    if (state.sending) return;
    // ★ I-6 (#360): locale-grouped display in the field; canonical in state —
    // the money-safety surface Damir named first ("easy to know how much we
    // are sending"). Wire layer (#77) untouched. Loop r1 CRITICAL-1: per-edit
    // inverse for typing/deletion; settled heuristic only for paste/synthetic.
    const disp = customInput.value;
    const caret = customInput.selectionStart;
    const v = sanitizeAmount(amountInputToCanonical(disp, caret, e, undefined, !!state.amount, readPreEdit()));   // ★★ V-1: the REPLACED RANGE routes (r2 MAJOR-1 still holds for a partial edit)
    const shown = groupAmountDisplay(v);
    if (shown !== disp) {
      customInput.value = shown;
      const c = amountCaretAfterFormat(disp, caret, shown);
      try { customInput.setSelectionRange(c, c); } catch (e) { /* unfocused/unsupported */ }
    }
    state.amount = v;
    sync();
  });
  /* ★★ #620 (Damir, device 2026-08-28) — ENTER MUST NEVER SPEND. A MONEY DEFECT, MINE.
   *
   * His report: "when I want to tip and select custom, then enter the amount and tap
   * DONE on the keyboard to hide the keyboard, IT AUTO CONFIRMS THE TIP."
   *
   * There was an `Enter -> confirm.click()` here, and #609 then attached the shared
   * keyboard dismissal to the same field — which sets `enterkeyhint="done"`. So the one
   * key a user presses to put the keyboard away became the key that sends the money,
   * and #609 is what labelled it "Done" and invited the press.
   *
   * ⚠ THE COMMENT #609 SHIPPED WITH SAID: "the iOS decimal pad has no return key … so
   * Enter above can never fire here on a phone." That reasoned about iOS and called it
   * "a phone". ANDROID's decimal keypad has an action key, and it fires Enter. The
   * sentence was not wrong about iOS; it was wrong about the word it generalised to,
   * and it sat directly above the line it was excusing.
   *
   * So the handler is GONE rather than guarded. A confirm key and a dismiss key cannot
   * share one keystroke on a field that spends: any guard is a race between two
   * listeners on one event, and the failure mode is a payment the user did not make.
   * Committing a tip now takes a deliberate press of the Confirm button, which is the
   * only affordance that says what it does. `attachAmountKeyboardDismiss` still gives
   * Enter its dismissal, so nothing is lost from the keyboard's point of view.
   *
   * ⚠ This also covers the REQUEST sheet, which shares this input through
   * `openAmountSheet` — same keystroke, same silent commit. */
  attachAmountKeyboardDismiss(customInput);
  const unit = document.createElement('span');
  unit.className = 'c-tipsheet__unit';
  unit.textContent = 'IXI';
  customRow.append(customInput, unit);
  content.append(customRow);

  /* insufficient guard and send-failure alert are SEPARATE elements (tip-audit m4) */
  const guard = document.createElement('p');
  guard.className = 'c-tipsheet__error';
  guard.setAttribute('role', 'alert');
  guard.hidden = true;
  content.append(guard);
  const sendErr = document.createElement('p');
  /* ★ V-2: a MODIFIER, so the send error is addressable. The balance guard above
     carries the same class and the same role, and a test or a later author reaching
     for "the error on the tip sheet" would have found whichever came first. */
  sendErr.className = 'c-tipsheet__error c-tipsheet__error--send';
  sendErr.setAttribute('role', 'alert');
  sendErr.hidden = true;
  content.append(sendErr);

  /* ONE confirm — label carries the amount (the sheet IS the review) */
  const confirm = createButton({
    label: copy.idle, type: 'fill', size: 44, width: 'full',
    onClick: (e) => {
      if (e.currentTarget.dataset.acted !== undefined || state.sending || !valid()) return;   // #72④ latch + in-flight token
      e.currentTarget.dataset.acted = '';
      state.sending = true;
      const attempt = ++state.attempt;
      let settled = false;                                 // ctrl one-shot per attempt (tip-audit m1)
      setFrozen(true);
      // money in flight → no dismiss paths; live overlay opts make this REAL (C1)
      setOverlayOpts(sheet, { lightDismiss: false, escDismiss: false });
      sendErr.hidden = true;
      setLoading(confirm, true);
      // #528: the attach-Request path has NO source message (the peer is the
      // context) — messageId is '' there; the tip path still carries its id.
      // (message defaults to {}, so the truthy-check alone was dead — loop NIT.)
      const payload = { messageId: (message && message.id) || '', amount: canonicalAmount(state.amount) };
      const done = () => {
        if (settled || attempt !== state.attempt) return;  // one-shot + stale-attempt guard
        settled = true;
        state.sending = false;
        setLoading(confirm, false);
        setSuccess(confirm, { label: copy.success });
        setTimeout(() => closeSheet(sheet), 900);          // the result lands via the bridge (#65 pill / request bubble)
      };
      const fail = (msg) => {
        if (settled || attempt !== state.attempt) return;
        settled = true;
        state.sending = false;
        setLoading(confirm, false);
        delete confirm.dataset.acted;                      // retry stays possible
        setFrozen(false);
        setOverlayOpts(sheet, { lightDismiss: true, escDismiss: true });
        /* ★★ V-2: an EMPTY message is a SILENT re-enable, exactly as openPaymentReview
           already treats it. The tip now waits on a native confirm, and a user who taps
           Cancel there has not had a failure — telling them the tip "could not be sent"
           would be a lie about their own decision. Only '' is silent: undefined and null
           still carry the generic copy, so a dropped answer still says something. */
        if (msg === '') {
          sendErr.hidden = true;
          sendErr.textContent = '';
          return;
        }
        sendErr.hidden = false;                            // unhide BEFORE text → alert announces
        sendErr.textContent = msg || copy.fail;
      };
      if (onSubmit) onSubmit(payload, { done, fail }); else done();
    },
  });
  confirm.disabled = true;
  content.append(confirm);

  function setFrozen(f) {                                  // amount controls freeze in flight (M3)
    for (const c of chips) c.disabled = f;
    customInput.disabled = f;
  }
  function valid() {
    if (!state.amount || !/[1-9]/.test(state.amount)) return false;
    if (balU != null && toUnits(canonicalAmount(state.amount)) > balU) return false;   // integer 1e-8 units (M2)
    return true;
  }
  function sync() {
    if (state.sending) return;                             // in flight: nothing re-enables the confirm (M3)
    const a = canonicalAmount(state.amount);
    const over = !!a && /[1-9]/.test(a) && balU != null && toUnits(a) > balU;
    guard.hidden = !over;
    if (over) guard.textContent = strings.tipInsufficient || 'Not enough IXI for this tip.';
    confirm.disabled = !valid();
    const label = confirm.querySelector('.c-button__label') || confirm;
    // ★ I-6 r2 (#360, loop r1 MINOR-5): the confirm label reads in the field's own
    // convention (the PAYLOAD stays canonical — `a` is what leaves the sheet).
    label.textContent = valid() ? copy.confirm.split('{a}').join(groupAmountDisplay(a)) : copy.idle;
  }
  sync();

  // pre-confirm: light dismiss allowed (speed — spec §3); flips off in flight.
  // onDismiss: ANY dismissal voids pending bridge callbacks (tip-audit M1)
  const sheet = createSheet({
    content, host, strings, lightDismiss: true,
    onDismiss: () => { state.attempt++; state.sending = false; },
  });
  sheet.setAttribute('aria-label', title.textContent);
  openSheet(sheet);
  return sheet;
}

export function openTipSheet({ onTip, ...opts } = {}) {
  return openAmountSheet({ ...opts, onSubmit: onTip }, 'tip');
}

/** Chat attach → Request (#139): the counterparty is known — a sheet beats the
 *  QR-centric receive screen. No balance guard: the AMOUNT is the payer's problem. */
export function openRequestSheet({ onRequest, ...opts } = {}) {
  return openAmountSheet({ ...opts, balance: null, onSubmit: onRequest }, 'request');
}
