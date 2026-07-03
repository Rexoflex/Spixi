/**
 * c-composer — chat input bar (Figma `input` 11306:7242 + `send` 11306:7223;
 * DECISIONS #64). ⊕ attach inside the field, auto-grow textarea, trailing
 * 44px circle: voice flag OFF (v1) → send always visible, disabled-styled when
 * empty; voice ON → mic when empty ⇄ send when text (design's morph).
 * Bridge: ixian:chat / ixian:typing / clearInput (§4); sendfile/sendmedia via attach.
 *
 * createComposer({ placeholder, voice = false, onSend(text), onAttach,
 *                  onTyping, onRecord, strings }) → el
 * clearComposer(el) — bridge clearInput hook (#44 free fn)
 */
import { icon } from './icons.js';

const MAX_LINES = 5;

export function createComposer({
  placeholder = 'Message',
  voice = false,
  onSend,
  onAttach,
  onTyping,
  onRecord,
  strings = {},
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-composer';

  const field = document.createElement('div');
  field.className = 'c-composer__field';

  const attach = document.createElement('button');
  attach.type = 'button';
  attach.className = 'c-composer__attach';
  attach.setAttribute('aria-label', strings.attach || 'Attach');
  attach.append(icon('circle-plus', { size: 24 }));
  if (onAttach) attach.addEventListener('click', onAttach);
  field.append(attach);

  const input = document.createElement('textarea');
  input.className = 'c-composer__input';
  input.rows = 1;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  field.append(input);
  el.append(field);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'c-composer__action';
  el.append(action);

  const sendIcon = () => { action.textContent = ''; action.append(icon('send-2', { size: 20 })); };
  const micIcon = () => { action.textContent = ''; action.append(icon('microphone', { size: 20 })); };

  const hasText = () => input.value.trim().length > 0;

  const syncAction = () => {
    if (voice && !hasText()) {
      micIcon();
      action.dataset.mode = 'mic';
      action.disabled = false;
      action.setAttribute('aria-label', strings.record || 'Record voice message');
    } else {
      sendIcon();
      action.dataset.mode = 'send';
      action.disabled = !hasText();
      action.setAttribute('aria-label', strings.send || 'Send');
    }
  };

  const grow = () => {
    input.style.height = 'auto';
    const cs = getComputedStyle(input);
    const line = parseInt(cs.lineHeight, 10) || 24;
    // border-box: cap must include block padding (audit: 5th line was clipped)
    const pad = (parseInt(cs.paddingTop, 10) || 0) + (parseInt(cs.paddingBottom, 10) || 0);
    input.style.height = Math.min(input.scrollHeight, line * MAX_LINES + pad) + 'px';
  };

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    if (onSend) onSend(text);
    input.value = '';
    grow();
    syncAction();
    input.focus();
  };

  input.addEventListener('input', (e) => {
    grow();
    syncAction();
    // synthetic events (clearComposer) must not emit a spurious ixian:typing
    if (onTyping && e.isTrusted) onTyping(); // shell throttles → ixian:typing
  });
  // Enter sends on keyboard-first devices; Shift+Enter = newline.
  // Touch keyboards keep Enter as newline (send via the button).
  input.addEventListener('keydown', (e) => {
    // IME guard (audit MAJOR): Enter that confirms a CJK composition must not send
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey && matchMedia('(hover: hover)').matches) {
      e.preventDefault();
      send();
    }
  });
  action.addEventListener('click', () => {
    if (action.dataset.mode === 'mic') { if (onRecord) onRecord(); }
    else send();
  });

  syncAction();
  return el;
}

/** Bridge clearInput hook — empties the field and resets height/state. */
export function clearComposer(el) {
  const input = el.querySelector('.c-composer__input');
  if (!input) return;
  input.value = '';
  input.style.height = 'auto';
  input.dispatchEvent(new Event('input'));
}

/* —— batch 3b (§8-GATED #25 — bridge has no reply/edit yet): context strip
   above the field for reply/edit modes. #44 free fns. —— */
const composerCtx = new WeakMap(); // composer el → active ctx

/* cancel = restore: an edit ctx prefilled the field, so cancelling must bring
   the user's pre-edit draft back (audit r3: one stray Send re-posted the OLD
   message text as a new message) */
function cancelComposerContext(el) {
  const c = composerCtx.get(el);
  if (!c) return;
  const input = el.querySelector('.c-composer__input');
  if (c.kind === 'edit' && input) {
    input.value = c._draft || '';
    input.dispatchEvent(new Event('input')); // isTrusted=false → no typing emit
  }
  setComposerContext(el, null);
  if (c.onCancel) c.onCancel();
}

/**
 * setComposerContext(el, ctx | null)
 *   ctx = { kind: 'reply'|'edit', title, text, prefill (edit, default true),
 *           onCancel, strings }
 * The strip renders icon + title/excerpt + cancel ✕; edit prefills the field
 * (synthetic input event — no spurious ixian:typing, isTrusted guard).
 * Esc in the field cancels the active context before it clears text.
 * getComposerContext(el) → active ctx or null (shell reads this on send).
 */
export function setComposerContext(el, ctx) {
  const input = el.querySelector('.c-composer__input');
  const prev = el.querySelector('.c-composer__ctx');
  if (prev) prev.remove();
  if (!ctx) { composerCtx.delete(el); return; }
  composerCtx.set(el, ctx);
  const strings = ctx.strings || {};

  const strip = document.createElement('div');
  strip.className = 'c-composer__ctx';
  strip.dataset.kind = ctx.kind;
  strip.append(icon(ctx.kind === 'edit' ? 'pencil' : 'share-3', { size: 18 }));
  const col = document.createElement('span');
  col.className = 'c-composer__ctx-info';
  const title = document.createElement('span');
  title.className = 'c-composer__ctx-title';
  title.textContent = ctx.title ||
    (ctx.kind === 'edit' ? (strings.editMessage || 'Edit message') : (strings.reply || 'Reply'));
  const text = document.createElement('span');
  text.className = 'c-composer__ctx-text';
  text.textContent = ctx.text || '';
  col.append(title, text);
  strip.append(col);
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'c-composer__ctx-cancel';
  x.setAttribute('aria-label', strings.cancel || 'Cancel');
  x.append(icon('x', { size: 16 }));
  x.addEventListener('click', () => cancelComposerContext(el));
  strip.append(x);
  el.prepend(strip); // flex-wrap row: the strip takes the full first line

  if (input) {
    if (ctx.kind === 'edit' && ctx.prefill !== false) {
      ctx._draft = input.value; // restored on cancel (audit r3)
      input.value = ctx.text || '';
      input.dispatchEvent(new Event('input')); // grow + action sync; isTrusted=false → no typing emit
    }
    // Esc cancels the ACTIVE context (wired once per composer element)
    if (el.dataset.ctxWired === undefined) {
      el.dataset.ctxWired = '';
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && composerCtx.has(el)) cancelComposerContext(el);
      });
    }
    input.focus();
  }
}

export function getComposerContext(el) { return composerCtx.get(el) || null; }
