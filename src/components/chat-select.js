/**
 * chat-select — multi-select messages: copy + bulk delete + split-paste
 * (#139 Damir · extended for the selection TOPBAR, Damir tonight).
 *
 * Best-practice mimicry (WhatsApp/Telegram), cheapest honest implementation:
 * · message menu → "Select" → SELECTION MODE on the message list: taps toggle
 *   rows, each selectable row grows a leading CHECK CIRCLE (CSS-only, see
 *   chat-select.css — it must survive the shell's full-log re-renders), and the
 *   bar MOUNTS OVER THE CHAT TOPBAR (host = the topbar slot) so it reads as the
 *   native "contextual action bar": ✕ · "N selected" · Copy · Delete.
 *   Esc exits, count 0 exits.
 *
 * SELECTION IS KEYED BY MESSAGE ID, NOT BY DOM NODE. The chat shell rebuilds
 * the WHOLE log (box.replaceChildren) on a status tick, a new message, a delete
 * — every row node is replaced. A node-keyed selection would silently empty
 * itself mid-gesture. Callers re-apply after their render via refresh().
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
 * enterChatSelect(listEl, { initialRow, host, rowSelector, idOf, selectable,
 *                           textOf, senderOf, strings, onCopy, onDelete, onExit })
 *   → { exit, refresh, count }
 *   onCopy(count, ok)  — ok=false means the clipboard REFUSED (file:// WebViews
 *                        have no async clipboard); the caller must say so.
 *   onDelete(items)    — items = [{ id, row, text, sender }] in log order. The
 *                        component does NOT confirm and does NOT exit: bulk
 *                        delete is the CALLER's transaction (confirm dialog +
 *                        bridge verbs), and it may be cancelled.
 *   refresh()          — re-apply selection after the caller re-rendered rows;
 *                        prunes ids whose rows are gone.
 * attachSplitPaste(composerEl, { onSendEach, strings }) → detach()
 * getChatCopyBuffer() → { joined, items: [{ sender, text }] } | null
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { icon } from './icons.js';

let copyBuffer = null;

export function getChatCopyBuffer() { return copyBuffer; }

/* Clipboard write with the legacy fallback. WKWebView on a file:// origin is not
   a secure context → navigator.clipboard is UNDEFINED there, so the async API
   alone silently no-ops on iOS. execCommand('copy') over an off-screen textarea
   still works. Returns true only when something actually copied (settings.html
   shareAddress grammar — never claim a copy we didn't make). */
function execCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const done = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return !!done;
  } catch (e) { return false; }
}

let selKeySeq = 0;

export function enterChatSelect(listEl, {
  initialRow = null, host, rowSelector = '.c-bubble-row',
  idOf = (row) => row.dataset.msgid || '',
  textOf = (row) => row.dataset.copytext || '',
  senderOf = (row) => row.dataset.sender || '',
  selectable = null,                       // default below: anything with copyable text
  strings = getStrings(), onCopy, onDelete, onExit,
} = {}) {
  if (!listEl || listEl.dataset.selecting !== undefined) return null;
  listEl.dataset.selecting = '';
  const hostEl = host || listEl;
  hostEl.classList.add('c-chatselect-host');   // positioning context: the bar covers the host (= the topbar slot)
  const canSelect = selectable || ((row) => !!textOf(row));
  const keys = new Set();                      // SELECTED message ids (survives re-render)
  /* W9-④ desktop drag-to-extend state (armed far below, declared here because
     setCount reads it — a gesture in flight must not auto-exit at 0). */
  let drag = null;                             // { anchor, on, moved, baseline: Set }
  let dragSwallowClick = false;

  /* A row without a bridge id (demo fixtures, synthetic rows) still needs a
     stable handle for the session; stamping one keeps toggle/refresh uniform.
     Such a key cannot survive a re-render — correct, the node is the identity. */
  const keyOf = (row) => {
    const id = idOf(row);
    if (id) return String(id);
    if (!row.dataset.selkey) row.dataset.selkey = 'k' + (++selKeySeq);
    return row.dataset.selkey;
  };

  const bar = document.createElement('header');
  bar.className = 'c-chatselect-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', strings.selectMessages || 'Select messages');
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'c-chatselect-bar__cancel';
  cancel.setAttribute('aria-label', strings.cancel || 'Cancel');
  cancel.append(icon('x', { size: 20 }));
  cancel.addEventListener('click', () => exit());
  const count = document.createElement('span');
  count.className = 'c-chatselect-bar__count u-tabular';
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');               // count changes are announced
  const actions = document.createElement('div');
  actions.className = 'c-chatselect-bar__actions';
  // Icon-only, topbar grammar (the bar IS the topbar while selecting). Copy is
  // always offered; Delete only when the caller can actually perform one.
  const copyBtn = createButton({
    type: 'text', size: 44,
    icon: icon('copy'),
    ariaLabel: strings.copy || 'Copy',
    onClick: () => copySelected(),
  });
  actions.append(copyBtn);
  let deleteBtn = null;
  if (onDelete) {
    deleteBtn = createButton({
      type: 'text', size: 44, intent: 'destructive',
      icon: icon('trash'),
      ariaLabel: strings.delete || 'Delete',
      onClick: () => { const items = selectedItems(); if (items.length) onDelete(items); },
    });
    actions.append(deleteBtn);
  }
  bar.append(cancel, count, actions);
  hostEl.append(bar);

  const allRows = () => [...listEl.querySelectorAll(rowSelector)];
  const selectedRows = () => allRows().filter((r) => keys.has(keyOf(r)));
  const selectedItems = () => selectedRows().map((row) => ({
    id: idOf(row), row, text: textOf(row) || '', sender: senderOf(row) || '',
  }));

  const setCount = () => {
    const rows = selectedRows();
    const n = rows.length;
    count.textContent = (strings.selectedCount || '{n} selected').split('{n}').join(String(n));
    // Copy is only honest when at least one selected row HAS text (a lone file
    // card has nothing to put on the clipboard); Delete works on any selection.
    copyBtn.disabled = !rows.some((r) => !!textOf(r));
    if (deleteBtn) deleteBtn.disabled = n === 0;
    // W9-④: a drag that momentarily crosses zero (deselecting a range on its way
    // to a smaller one) must NOT tear the mode down under the moving pointer —
    // the count is only "done" once the gesture has finished.
    if (n === 0 && !drag) exit();                          // 0 = done, like the natives
  };

  /* Mark one row's visual + a11y state. role=checkbox + aria-checked is the
     honest reading of "tap toggles"; tabindex makes the log keyboard-operable
     while selecting (rows are not focusable otherwise). */
  const paint = (row) => {
    const on = keys.has(keyOf(row));
    if (on) row.dataset.selected = '';
    else delete row.dataset.selected;
    row.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  const arm = (row) => {
    row.setAttribute('role', 'checkbox');
    row.tabIndex = 0;
    paint(row);
  };
  const disarm = (row) => {
    row.removeAttribute('role');
    row.removeAttribute('aria-checked');
    row.removeAttribute('tabindex');
    delete row.dataset.selected;
  };

  const toggle = (row) => {
    if (!canSelect(row)) return;                           // not a selectable row — tap does nothing
    const k = keyOf(row);
    if (keys.has(k)) keys.delete(k); else keys.add(k);
    paint(row);
    setCount();
  };

  // capture phase: in selection mode EVERY row tap toggles — bubbles, cards and
  // links must not act underneath (same swallow pattern as the long-press menu)
  const onClick = (e) => {
    const row = e.target.closest(rowSelector);
    if (!row || !listEl.contains(row)) return;
    e.preventDefault();
    e.stopPropagation();
    // W9-④: a click is the tail of a drag-range — the range already painted it.
    if (dragSwallowClick) { dragSwallowClick = false; return; }
    toggle(row);
  };
  const onRowKey = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const row = e.target.closest(rowSelector);
    if (!row || !listEl.contains(row)) return;
    e.preventDefault();
    e.stopPropagation();
    toggle(row);
  };
  const onKeydown = (e) => { if (e.key === 'Escape') exit(); };

  /* ——— W9-④ · DESKTOP DRAG-TO-EXTEND (Damir, Windows F5 2026-08-13: "I would
   * like auto select on windows if I click and drag a whole message or multiple")
   *
   * Scope, and why it is this narrow:
   *  · ONLY inside selection mode. A drag that STARTS outside it must keep doing
   *    what it does today — native text selection across bubbles, which is the
   *    primary desktop reading gesture and Damir's "drag a whole message" case
   *    when he just wants the text. Letting a drag ENTER selection mode would
   *    take that away on every stray mouse-down in the log.
   *  · ONLY for pointerType 'mouse' (+ primary button). Touch/pen drags in the
   *    log are SCROLLS; preventDefault on those would wedge the conversation.
   *    This is a capability test, not a viewport one — no media query, and no
   *    :root[data-desktop] read either, because a mouse plugged into a phone
   *    should get the same behaviour.
   *  · Inside selection mode a text drag has nothing to give (taps already toggle
   *    rows and Copy takes whole messages), so suppressing text selection FOR THE
   *    DURATION OF THE DRAG costs nothing and is what makes the range readable.
   *
   * Grammar: press = anchor. The anchor's NEW state (the one a plain tap would
   * have given it) becomes the state painted across the whole [anchor…current]
   * range, so a drag from an unticked row selects and a drag from a ticked row
   * deselects — the sheet-fill convention. Rows outside the range are untouched:
   * a drag never clears a selection made somewhere else. The click that follows
   * the drag is swallowed, or it would immediately undo the anchor. */
  const rowsBetween = (a, b) => {
    const all = allRows();
    const i = all.indexOf(a), j = all.indexOf(b);
    if (i < 0 || j < 0) return [];
    return all.slice(Math.min(i, j), Math.max(i, j) + 1);
  };
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const row = e.target.closest(rowSelector);
    if (!row || !listEl.contains(row) || !canSelect(row)) return;
    // baseline = the selection as it stands, so re-crossing rows repaints the
    // range from truth instead of accumulating toggles.
    drag = { anchor: row, on: !keys.has(keyOf(row)), moved: false, baseline: new Set(keys) };
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const row = e.target.closest(rowSelector);
    if (!row || !listEl.contains(row) || !canSelect(row)) return;
    if (row === drag.anchor && !drag.moved) return;         // still on the press target — a tap, not a drag
    if (!drag.moved) {
      drag.moved = true;
      listEl.dataset.dragselect = '';                       // CSS kills text selection for the drag
      const sel = document.getSelection && document.getSelection();
      if (sel && sel.removeAllRanges) { try { sel.removeAllRanges(); } catch (_) {} }
    }
    e.preventDefault();                                     // no text selection while ranging
    const range = rowsBetween(drag.anchor, row);
    const inRange = new Set(range.map(keyOf));
    keys.clear();
    for (const k of drag.baseline) keys.add(k);             // everything outside the range keeps its state
    for (const k of inRange) { if (drag.on) keys.add(k); else keys.delete(k); }
    for (const r of allRows()) paint(r);
    setCount();
  };
  const endDrag = () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    delete listEl.dataset.dragselect;
    if (moved) dragSwallowClick = true;                     // the trailing click must not re-toggle the anchor
    if (!keys.size) exit();                                 // the deferred 0 = done, now that the gesture ended
  };

  listEl.addEventListener('click', onClick, true);
  listEl.addEventListener('keydown', onRowKey, true);
  listEl.addEventListener('pointerdown', onPointerDown, true);
  listEl.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);
  document.addEventListener('keydown', onKeydown);

  /** Re-apply after the caller re-rendered the log (new row NODES, same ids). */
  function refresh() {
    if (listEl.dataset.selecting === undefined) return;
    const live = new Set();
    for (const row of allRows()) {
      if (!canSelect(row)) { disarm(row); continue; }
      live.add(keyOf(row));
      arm(row);
    }
    for (const k of [...keys]) if (!live.has(k)) keys.delete(k);   // rows that went away (deleted / chat switched)
    setCount();
  }

  function copySelected() {
    const items = selectedItems().filter((it) => it.text);
    if (!items.length) return;
    // single = raw text; multiple = "Sender: text" lines (Damir pick)
    const joined = items.length === 1 ? items[0].text
      : items.map((it) => (it.sender ? it.sender + ': ' : '') + it.text).join('\n');
    copyBuffer = { joined, items: items.map((it) => ({ sender: it.sender, text: it.text })) };
    // Exit either way (natives close the bar on Copy) — but report the TRUTH, so
    // the caller can toast "Couldn't copy" instead of a false confirmation.
    const finish = (ok) => { if (onCopy) onCopy(items.length, ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(joined).then(() => finish(true), () => finish(execCopy(joined)));
    } else finish(execCopy(joined));
    exit();
  }

  function exit() {
    if (listEl.dataset.selecting === undefined) return;
    delete listEl.dataset.selecting;
    for (const r of allRows()) disarm(r);
    keys.clear();
    listEl.removeEventListener('click', onClick, true);
    listEl.removeEventListener('keydown', onRowKey, true);
    listEl.removeEventListener('pointerdown', onPointerDown, true);
    listEl.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', endDrag, true);
    document.removeEventListener('pointercancel', endDrag, true);
    document.removeEventListener('keydown', onKeydown);
    drag = null;
    dragSwallowClick = false;
    delete listEl.dataset.dragselect;
    hostEl.classList.remove('c-chatselect-host');
    bar.remove();
    if (onExit) onExit();
  }

  for (const row of allRows()) { if (canSelect(row)) arm(row); }
  if (initialRow) toggle(initialRow);
  // No initial row — or one that turned out not to be selectable: setCount lands
  // on 0 and exits, so a selection can never open with nothing in it.
  if (!keys.size) setCount();
  return { exit, refresh, count: () => keys.size };
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
