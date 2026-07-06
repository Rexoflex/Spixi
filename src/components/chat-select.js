/**
 * chat-select — multi-select messages: copy + split-paste (#139, Damir).
 *
 * Best-practice mimicry (WhatsApp/Telegram), cheapest honest implementation:
 * · message menu → "Select" → SELECTION MODE on the message list: taps toggle
 *   rows (only rows the caller can extract text from), a count bar overlays the
 *   top of the host with Copy + Cancel, Esc exits, count 0 exits.
 * · COPY: single message → raw text (cleanest paste anywhere); multiple →
 *   "Sender: text" one per line (Damir pick — Telegram-style provenance without
 *   timestamp noise). Written to the system clipboard AND kept in an internal
 *   buffer for split-paste.
 * · SPLIT-PASTE (Damir pick: offer, don't auto-split): attachSplitPaste watches a
 *   composer input — when its value matches the buffer's joined text (covers ⌘V,
 *   context-menu paste, anything), an inline offer appears: "Send as N separate
 *   messages". Taking it clears the input and fires onSendEach(items) — RAW texts,
 *   re-sent as the user's own messages (not quotes). Ignoring it and sending keeps
 *   the standard one-multiline-message behaviour every other app has.
 *
 * The buffer is module-level (chat A copy → chat B paste in the same WebView).
 * Clipboard write is fire-and-forget here: the BUFFER is the source of truth for
 * split-paste; onCopy(count) lets shells confirm (toast) once the write resolves.
 *
 * enterChatSelect(listEl, { initialRow, host, rowSelector, textOf, senderOf,
 *                           strings, onCopy, onExit }) → { exit }
 * attachSplitPaste(composerEl, { onSendEach, strings }) → detach()
 * getChatCopyBuffer() → { joined, items: [{ sender, text }] } | null
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { icon } from './icons.js';

let copyBuffer = null;

export function getChatCopyBuffer() { return copyBuffer; }

export function enterChatSelect(listEl, {
  initialRow = null, host, rowSelector = '.c-bubble-row',
  textOf = (row) => row.dataset.copytext || '',
  senderOf = (row) => row.dataset.sender || '',
  strings = getStrings(), onCopy, onExit,
} = {}) {
  if (!listEl || listEl.dataset.selecting !== undefined) return null;
  listEl.dataset.selecting = '';
  const hostEl = host || listEl;

  const bar = document.createElement('div');
  bar.className = 'c-chatselect-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', strings.selectMessages || 'Select messages');
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'c-chatselect-bar__cancel';
  cancel.setAttribute('aria-label', strings.cancel || 'Cancel');
  cancel.append(icon('x', { size: 20 }));
  const count = document.createElement('span');
  count.className = 'c-chatselect-bar__count u-tabular';
  count.setAttribute('aria-live', 'polite');               // count changes are announced
  const copyBtn = createButton({
    label: strings.copy || 'Copy', type: 'fill', size: 32,
    icon: icon('copy', { size: 16 }),
    onClick: () => copySelected(),
  });
  bar.append(cancel, count, copyBtn);
  hostEl.append(bar);

  const selected = () => [...listEl.querySelectorAll(rowSelector)].filter((r) => r.dataset.selected !== undefined);

  const setCount = () => {
    const n = selected().length;
    count.textContent = (strings.selectedCount || '{n} selected').split('{n}').join(String(n));
    copyBtn.disabled = n === 0;
    if (n === 0) exit();                                   // 0 = done, like the natives
  };

  const toggle = (row) => {
    if (!textOf(row)) return;                              // nothing copyable on this row (media/cards — v2)
    if (row.dataset.selected !== undefined) delete row.dataset.selected;
    else row.dataset.selected = '';
    setCount();
  };

  // capture phase: in selection mode EVERY row tap toggles — bubbles, cards and
  // links must not act underneath (same swallow pattern as the long-press menu)
  const onClick = (e) => {
    const row = e.target.closest(rowSelector);
    if (!row || !listEl.contains(row)) return;
    e.preventDefault();
    e.stopPropagation();
    toggle(row);
  };
  const onKeydown = (e) => { if (e.key === 'Escape') exit(); };
  listEl.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown);

  function copySelected() {
    const items = selected().map((row) => ({ sender: senderOf(row) || '', text: textOf(row) }));
    if (!items.length) return;
    // single = raw text; multiple = "Sender: text" lines (Damir pick)
    const joined = items.length === 1 ? items[0].text
      : items.map((it) => (it.sender ? it.sender + ': ' : '') + it.text).join('\n');
    copyBuffer = { joined, items };
    const finish = () => { if (onCopy) onCopy(items.length); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(joined).then(finish, finish);   // buffer is the split-paste truth either way
    } else finish();
    exit();
  }

  function exit() {
    if (listEl.dataset.selecting === undefined) return;
    delete listEl.dataset.selecting;
    for (const r of selected()) delete r.dataset.selected;
    listEl.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeydown);
    bar.remove();
    if (onExit) onExit();
  }

  if (initialRow) toggle(initialRow);
  else setCount();
  return { exit };
}

/** Watch a composer for a paste of the multi-copy buffer → offer to split.
 *  Value-match (not paste-event-only) covers every paste path incl. mobile menus. */
export function attachSplitPaste(composerEl, { onSendEach, strings = getStrings() } = {}) {
  const input = composerEl && composerEl.querySelector('.c-composer__input');
  if (!input) return () => {};
  let offer = null;

  const removeOffer = () => { if (offer) { offer.remove(); offer = null; } };
  const check = () => {
    const buf = copyBuffer;
    const match = buf && buf.items.length > 1 && input.value.trim() === buf.joined.trim();
    if (!match) { removeOffer(); return; }
    if (offer) return;
    offer = document.createElement('div');
    offer.className = 'c-splitpaste';
    offer.setAttribute('role', 'status');                  // the offer announces itself
    const label = document.createElement('span');
    label.className = 'c-splitpaste__label';
    label.textContent = (strings.splitPasteLabel || 'Pasted {n} copied messages').split('{n}').join(String(buf.items.length));
    const go = createButton({
      label: (strings.splitPasteAction || 'Send as {n} separate messages').split('{n}').join(String(buf.items.length)),
      type: 'outline', size: 32,
      onClick: () => {
        const items = buf.items.slice();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));   // composer resyncs (send btn state, autosize)
        removeOffer();
        if (onSendEach) onSendEach(items);                 // RAW texts — re-sent, not quoted
      },
    });
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'c-splitpaste__dismiss';
    dismiss.setAttribute('aria-label', strings.dismiss || 'Dismiss');
    dismiss.append(icon('x', { size: 16 }));
    dismiss.addEventListener('click', removeOffer);
    offer.append(label, go, dismiss);
    composerEl.prepend(offer);                             // sits above the input row
  };

  input.addEventListener('input', check);
  input.addEventListener('paste', () => setTimeout(check, 0));
  return () => { removeOffer(); input.removeEventListener('input', check); };
}
