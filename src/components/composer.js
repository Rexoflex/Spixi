/**
 * c-composer — chat input bar (Figma `input` 11306:7242 + `send` 11306:7223;
 * DECISIONS #64). ⊕ attach OUTSIDE the field on the leading side (#705 —
 * Damir, Session G; it lived inside the pill until then), auto-grow textarea,
 * trailing 44px circle: voice OFF → send always visible, and it KEEPS
 * the action colour when empty (#705: "livelier than the disabled grey" — the
 * disabled state is still real, only its paint changed); voice ON → mic when
 * empty and no reply / edit context ⇄ send when text (★ #1208 S7: the #64 slot ON,
 * switched live by setComposerVoice; the recording bar = setComposerRecording).
 * Bridge: ixian:chat / ixian:typing / clearInput (§4); sendfile/sendmedia via attach.
 *
 * createComposer({ placeholder, voice = false, onSend(text), onAttach,
 *                  onTyping, onRecord, onVoiceCancel, onVoiceSend, maxLength, onTooLong, strings }) → el
 * clearComposer(el) — bridge clearInput hook (#44 free fn)
 * setComposerVoice(el, on) · setComposerRecording(el, state, ms) · getComposerRecording(el) — ★ #1208
 * setComposerRecLevel(el, level) — ★ S8 (#1239): one live-wave bar per C# voiceRecLevel push
 * setComposerMedia(el, n, { maxLength, onTooLong }) — ★ S10 P1 (#1254): the media strip's photo count
 *
 * maxLength (A7, #302 — legacy parity for the 64 000-char guard, legacy
 *   js/chat.js:401-409): 0 = off (default, byte-for-byte today's behaviour).
 *   When set, send() returns BEFORE onSend and WITHOUT clearing the field, the
 *   action button disables, and a counter appears once the text passes 90% of the
 *   limit. The guard MUST live here and not in the shell: send() clears the
 *   textarea unconditionally after onSend, so a shell-side `return` would block the
 *   send AND destroy what the user typed or pasted. Legacy alerted and kept the
 *   text; a guard that loses 64 000 characters is worse than no guard.
 * onTooLong(len, max) — fired on a blocked send attempt (Enter or the button), so
 *   the shell can toast. The over-limit state is otherwise silent and visual.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, safeImageSrc } from './avatar.js';
import { formatVoiceClock, fillVoiceSlots } from './message-bubble.js';   // ★ #1208: the one m:ss clock (the bubble and the bar agree)
import { fileKind } from './typed-bubbles.js';   // ★ 7b (#1214): the strip's file tile wears the file card's family colours

/* ★ #1065 r2 (break-my-verdict MINOR-3): the message menu can now be open WHILE the composer keeps
   focus (overlay.js keepEditableFocus stamps data-keep-editable on its root, removed synchronously at
   dismiss). Keys typed then belong to the menu, not to the draft. */
const menuOverField = () => !!(typeof document !== 'undefined' && document.querySelector('[data-keep-editable]'));

const MAX_LINES = 5;
const MENTION_MAX = 8;   // rows shown in the @-autocomplete

export function createComposer({
  placeholder = 'Message',
  voice = false,
  onSend,
  onAttach,
  onTyping,
  onRecord,
  onVoiceCancel = null,   // ★ #1208 (S7): the recording bar's ✕ — the shell sends ixian:voicerec:cancel
  onVoiceSend = null,     // ★ #1208 (S7): the recording bar's ➤ (the trailing disc) — the shell sends ixian:voicerec:send
  mentionSource = null,   // () => [{ name, address, avatar }] → enables @-autocomplete (#210); null = off
  maxLength = 0,          // A7: 0 = off. Counted on the TRIMMED text, raw UTF-16 units.
  onTooLong = null,       // (len, max) → shell toasts; the visual state is handled here
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-composer';

  const field = document.createElement('div');
  field.className = 'c-composer__field';

  /* ★ #705 (Session G) put the ⊕ BESIDE the pill; ★ Session I (#735, sheet 5, Damir on
     device: "more premium") puts it back INSIDE, bottom-left of the field, as a 36 disc
     with a 44 hit area (composer.css). The tray/✕ behaviour is untouched: `aria-expanded`
     is the tray's open state (attach-sheet.js writes it) and the glyph still rotates to a
     ✕ through that attribute. Only the housing moved — it is a child of the FIELD now. */
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

  /* A7 length guard. Count the TRIMMED text: C# trims before it prices and sends
     (SingleChatPage.xaml.cs:747), so a 64 001-char message whose last 5 chars are
     newlines should go through. Legacy counted untrimmed innerText — this is the
     same rule, minus that off-by-whitespace. */
  const textLen = () => input.value.trim().length;
  /* ★ S10 P1 (#1254): while the media strip holds photos the text is the CAPTION — its own (smaller) cap wins */
  const mediaN = () => (composerMedia.get(el) || { n: 0 }).n;
  /* ★ S15 F (#1302, Damir 2026-10-10): a strip tile is still being prepared by C# → Send is blocked (disabled + aria-busy) */
  const mediaBusy = () => !!(composerMedia.get(el) || {}).busy;
  const capMax = () => {
    const m = composerMedia.get(el);
    return m && m.n > 0 && m.maxLength > 0 ? (maxLength > 0 ? Math.min(maxLength, m.maxLength) : m.maxLength) : maxLength;
  };
  const overLimit = () => capMax() > 0 && textLen() > capMax();

  /* The counter is the honest way to communicate the limit: it says the number in
     every locale for free, and it appears BEFORE the user commits — the realistic
     trigger here is pasting a large blob, and a toast fired after the tap is the
     bad path. Hidden below 90% so it costs nothing in normal use. */
  let counter = null;
  const syncCounter = () => {
    const max = capMax();
    if (!max) { if (counter) { counter.remove(); counter = null; } return; }
    const len = textLen();
    const show = len > max * 0.9;
    if (!show) { if (counter) { counter.remove(); counter = null; } return; }
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'c-composer__counter t-body-xs';
      counter.setAttribute('aria-hidden', 'true');   // the blocked-send toast carries this for SRs
      field.append(counter);
    }
    const over = len > max;
    counter.textContent = (over ? '−' : '') + Math.abs(max - len).toLocaleString();
    if (over) counter.setAttribute('data-over', ''); else counter.removeAttribute('data-over');
  };

  const syncAction = () => {
    action.removeAttribute('aria-busy');   // ★ S15 F: only the strip's send branch below sets it
    /* ★ #1208 (S7): while the RECORDING BAR is up (C# pushed voiceRec recording / stopped) the trailing disc is
       "Send voice message" — the same 44 disc in the same place, so the bar swap moves nothing. It wins over every
       other mode: the bar hides the field, so neither a draft nor a reply / edit context can be sent from here. */
    if (composerRec.has(el)) {
      delete action.dataset.ctx;
      action.textContent = '';
      action.append(icon('send-2', { size: 20 }));
      action.dataset.mode = 'voicesend';
      action.disabled = false;
      action.setAttribute('aria-label', strings.sendVoice || 'Send voice message');
      return;
    }
    /* ★ #1199 (S6 edit): while an EDIT context is up the trailing button is SAVE — the check glyph and the
       "Save" name (strings.saveEdit), still disabled on an empty (or over-limit) field. Read at every sync
       from the ONE context map, so a context set or cleared from outside re-labels it (setComposerContext
       calls this through composerSync). The click path is unchanged: Save is a send, the shell's onSend
       reads the context and routes it to ixian:chatedit:. */
    const ctxNow = composerCtx.get(el);
    if (ctxNow && ctxNow.kind === 'edit') {
      action.textContent = '';
      action.append(icon('check', { size: 20 }));
      action.dataset.mode = 'send';
      action.dataset.ctx = 'edit';
      /* ★ #1199 r1 (N-6): an UNCHANGED body is not a save — Save stays disabled until the text differs from the original */
      const unchanged = ctxNow.prefillText != null && input.value.trim() === String(ctxNow.prefillText).trim();
      action.disabled = !hasText() || overLimit() || unchanged;
      action.setAttribute('aria-label', strings.saveEdit || 'Save');
      return;
    }
    delete action.dataset.ctx;
    /* ★ #1208 (S7, the #64 slot ON): the mic shows only when the shell says voice is on (setComposerVoice — setCaps
       `voice`), the field is EMPTY and NO reply / edit context is up (a voice message is never a reply and never an
       edit; with a context up the disc stays Send, disabled on an empty field). */
    if (composerVoice.get(el) && !ctxNow && !hasText() && !mediaN()) {   // ★ S10 P1: photos in the strip → the disc is SEND
      micIcon();
      action.dataset.mode = 'mic';
      action.disabled = false;
      action.setAttribute('aria-label', strings.record || 'Record voice message');
    } else {
      sendIcon();
      action.dataset.mode = 'send';
      action.disabled = (!hasText() && !mediaN()) || overLimit() || mediaBusy();   // ★ S10 P1: ≥ 1 photo in the strip sends with no text
      if (mediaBusy()) action.setAttribute('aria-busy', 'true');   // ★ S15 F: photos still preparing
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
    if (!text && !mediaN()) return;   // ★ S10 P1: the strip's photos go with an empty caption
    // A7: bail BEFORE onSend and BEFORE the clear — the text stays on screen, the
    // caret stays, the draft stays. Both entry paths (Enter and the action button)
    // funnel through here, so this one return covers them.
    /* ★ S10 P1: a CAPTION over the strip's cap (MEDIA_CAPTION_MAX) bails the same way, with the shell's caption toast */
    const media = composerMedia.get(el);
    if (media && media.n > 0 && media.busy) return;   // ★ S15 F: Enter while a photo is still preparing — nothing (the caption stays)
    if (media && media.n > 0 && media.maxLength > 0 && text.length > media.maxLength) {
      const cb = media.onTooLong || onTooLong;
      if (cb) { try { cb(text.length, media.maxLength); } catch (_) {} }
      syncCounter();
      syncAction();
      return;
    }
    if (maxLength > 0 && text.length > maxLength) {
      if (onTooLong) { try { onTooLong(text.length, maxLength); } catch (_) {} }
      syncCounter();
      syncAction();
      return;
    }
    /* ★ #1199: an EDIT send ends its context inside onSend, and ending an edit context RESTORES the draft that was in
       the field before the edit (setComposerContext). Clearing the field after that would throw the restored draft
       away — so the clear runs only when the send did not just close an edit. */
    const ctxBefore = composerCtx.get(el);
    // ★ #1199 r1 (N-6): Enter on an unchanged edit does what the disabled Save does — nothing (the edit stays open)
    if (ctxBefore && ctxBefore.kind === 'edit' && ctxBefore.prefillText != null && text === String(ctxBefore.prefillText).trim()) return;
    if (onSend) onSend(text);
    const editClosed = !!ctxBefore && ctxBefore.kind === 'edit' && composerCtx.get(el) !== ctxBefore;
    if (!editClosed) input.value = '';
    grow();
    syncCounter();
    syncAction();
    input.focus();
  };

  input.addEventListener('input', (e) => {
    grow();
    syncCounter();     // fires after paste too — the `input` event covers it
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
      if (menuOverField()) return;   // ★ #1065 r2: never send from under the message menu
      send();
    }
  });
  /* ★ #1208: one mic tap = one start. C# answers with voiceRec (recording / denied / busy / error); a second tap
     before that answer (a double tap, a slow bridge) would otherwise send a second start — MIC_GUARD_MS holds it. */
  let micAt = 0;
  action.addEventListener('click', () => {
    const mode = action.dataset.mode;
    if (mode === 'mic') {
      const t = Date.now();
      if (t - micAt < MIC_GUARD_MS) return;
      micAt = t;
      if (onRecord) onRecord();
      return;
    }
    if (mode === 'voicesend') {
      const rec = composerRec.get(el);
      /* the tap that opened the bar must not also send it: a double tap on the mic lands its second tap on this
         same disc, now ➤ — a send inside SEND_GUARD_MS of the bar opening is ignored */
      if (!rec || rec.pending || Date.now() - rec.openedAt < SEND_GUARD_MS) return;
      markRecPending(el);
      if (onVoiceSend) onVoiceSend();
      return;
    }
    send();
  });

  if (mentionSource) wireMentions(el, input, mentionSource, strings);

  /* ★ #46 r1 NIT: Escape in the composer area (the bar's ✕, the ➤ disc) cancels a recording — the ✕'s own path */
  el.addEventListener('keydown', (e) => {
    const r = composerRec.get(el);
    if (e.key !== 'Escape' || !r || menuOverField()) return;
    e.preventDefault();
    e.stopPropagation();
    r.cancelNow();
  });

  composerVoice.set(el, !!voice);
  composerParts.set(el, { field, input, action, strings, onVoiceCancel });
  composerSync.set(el, () => { syncCounter(); syncAction(); });   // ★ #1199: setComposerContext re-labels the button
  syncCounter();
  syncAction();
  return el;
}

/* —— @-mention autocomplete (Damir 2026-07-09, premium mentions #210). Typing
   "@" (at line start or after whitespace) opens an anchored member picker sourced
   from `mentionSource()`; filters as you type, keyboard (↑/↓/Enter/Tab/Esc) + tap,
   inserts "@Name ". Blind-group-safe (the shell simply supplies no members).
   Caret-aware on the textarea; XSS-safe (textContent). */
const MENTION_FRAG_RE = /(?:^|[\s\n])@([\p{L}\p{N}_]*)$/u;
function wireMentions(el, input, mentionSource, strings) {
  let box = null, options = [], active = -1;

  const close = () => {
    if (box) { box.remove(); box = null; }
    options = []; active = -1;
    input.removeAttribute('aria-activedescendant');
    input.removeAttribute('aria-expanded');
  };

  // the active "@fragment" ending at the caret, or null
  const fragment = () => {
    const pos = input.selectionStart;
    if (pos == null || pos !== input.selectionEnd) return null;   // no fragment while a range is selected
    const m = MENTION_FRAG_RE.exec(input.value.slice(0, pos));
    if (!m) return null;
    return { query: m[1], at: pos - m[1].length - 1 };            // index of '@'
  };

  const matches = (query) => {
    let list = [];
    try { list = mentionSource() || []; } catch (_) { list = []; }
    const seen = new Set(); const uniq = [];
    for (const m of list) {                                       // dedupe by name, drop nameless
      if (!m || !m.name) continue;
      const k = m.name.toLowerCase();
      if (seen.has(k)) continue; seen.add(k); uniq.push(m);
    }
    const q = query.toLowerCase();
    if (!q) return uniq.slice(0, MENTION_MAX);
    const starts = uniq.filter((m) => m.name.toLowerCase().startsWith(q));
    const rest = uniq.filter((m) => !m.name.toLowerCase().startsWith(q) && m.name.toLowerCase().includes(q));
    return starts.concat(rest).slice(0, MENTION_MAX);
  };

  const setActive = (i) => {
    active = i;
    const rows = box ? box.querySelectorAll('.c-composer__mention') : [];
    rows.forEach((r, idx) => {
      const on = idx === active;
      r.classList.toggle('is-active', on);
      r.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) { input.setAttribute('aria-activedescendant', r.id); r.scrollIntoView({ block: 'nearest' }); }
    });
  };

  const insert = (member) => {
    const frag = fragment(); if (!frag) { close(); return; }
    const before = input.value.slice(0, frag.at);
    const after = input.value.slice(input.selectionStart);
    const ins = '@' + member.name + ' ';
    input.value = before + ins + after;
    const caret = (before + ins).length;
    close();
    input.dispatchEvent(new Event('input'));       // grow + syncAction (isTrusted=false → no ixian:typing)
    input.focus();
    try { input.setSelectionRange(caret, caret); } catch (_) {}
  };

  const open = (list) => {
    if (!box) {
      box = document.createElement('div');
      box.className = 'c-composer__mentions u-scroll';   // Q15: #41 scrollbar grammar
      box.setAttribute('role', 'listbox');
      box.setAttribute('aria-label', strings.mentionMembers || 'Members');
      el.append(box);                              // el is position:relative; box anchors bottom:100%
      input.setAttribute('aria-expanded', 'true');
    }
    box.textContent = '';
    options = list;
    list.forEach((m, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'c-composer__mention';
      row.id = 'c-mention-opt-' + idx;
      row.setAttribute('role', 'option');
      row.append(createAvatar({ src: m.avatar || null, name: m.name, address: m.address || '', size: 24 }));
      const nm = document.createElement('span');
      nm.className = 'c-composer__mention-name';
      nm.textContent = m.name;
      row.append(nm);
      // mousedown (not click) so the textarea doesn't blur before we insert
      row.addEventListener('mousedown', (e) => { e.preventDefault(); insert(m); });
      box.append(row);
    });
    setActive(0);
  };

  const refresh = () => {
    const frag = fragment();
    if (!frag) { close(); return; }
    const list = matches(frag.query);
    if (!list.length) { close(); return; }
    open(list);
  };

  input.addEventListener('input', refresh);
  input.addEventListener('click', refresh);
  // capture phase → runs BEFORE the send/Enter + ctx-Esc handlers so the picker
  // consumes navigation keys while open (stopImmediatePropagation blocks them).
  input.addEventListener('keydown', (e) => {
    if (!box) return;
    // IME guard (mirror the send handler): an Enter/arrow confirming a CJK
    // composition must not select/navigate the picker (review MAJOR M1).
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); setActive((active + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); setActive((active - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); if (options[active]) insert(options[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  input.addEventListener('blur', () => { setTimeout(close, 120); });   // allow row mousedown to land first
}

/** Bridge clearInput hook — empties the field and resets height/state. */
export function clearComposer(el) {
  const input = el.querySelector('.c-composer__input');
  if (!input) return;
  input.value = '';
  input.style.height = 'auto';
  input.dispatchEvent(new Event('input'));
}

/* —— batch 3b: context strip above the field for reply/edit modes. #44 free fns.
   ★ #1198 / #1199 (S6): LIVE — the shell opens it behind bridge.cap('reply') / cap('edit') (setCaps). —— */
const composerCtx = new WeakMap(); // composer el → active ctx
const composerSync = new WeakMap(); // ★ #1199: composer el → its button/counter re-sync (Save while editing)
const resyncComposer = (el) => { const f = composerSync.get(el); if (f) f(); };

/* cancel = restore: an edit ctx prefilled the field, so cancelling must bring
   the user's pre-edit draft back (audit r3: one stray Send re-posted the OLD
   message text as a new message) */
/* ★ 7b (#1219): exported — the shell's Back (chatBack / the edge swipe) closes the strip through THIS path with
   refocus:false and blurs the field, so a Back never raises the keyboard. Returns true when a context was open. */
export function cancelComposerContext(el, { refocus = true } = {}) {
  const c = el ? composerCtx.get(el) : null;
  if (!c) return false;
  setComposerContext(el, null); // draft restore happens inside (edit ctx)
  if (c.onCancel) c.onCancel();
  /* ★ #1198 r1 (B-8): the ✕ was the focused control and it just left the DOM — focus goes back to the field */
  const input = el.querySelector('.c-composer__input');
  if (input && refocus) { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }
  if (input && !refocus && document.activeElement === input) input.blur();
  return true;
}

/* ★ 7b (#1214 / the S1⇄S2 contract): the tile at the strip's end — a photo / GIF preview (a data: image URI ONLY,
   set as a property; anything else = no tile), a file's extension tile (the file card's family colours), a mic for
   a voice row. null / unknown = none. Decorative: the excerpt names the message. */
const CTX_TILE_SRC_RE = /^data:image\/(?:jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/]+=*$/i;
function ctxTile(tile) {
  if (!tile || typeof tile !== 'object') return null;
  let t = null;
  if (tile.type === 'image') {
    const src = safeImageSrc(String(tile.src || ''));   // ★ O-13: local only (no allowRemote), then the raster test
    if (!src || !CTX_TILE_SRC_RE.test(src)) return null;
    t = document.createElement('img');
    t.alt = '';
    t.decoding = 'async';
    t.src = src;
  } else if (tile.type === 'file') {
    const ext = String(tile.ext || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    t = document.createElement('span');
    t.dataset.file = '';
    t.className = 'c-fbubble__icon';   // the card's tile ground (typed-bubbles.css), resized by composer.css
    t.dataset.kind = ext ? fileKind('f.' + ext.toLowerCase()).family : 'other';
    if (ext) { const lab = document.createElement('span'); lab.className = 'c-fbubble__ext'; lab.textContent = ext; t.append(lab); }
    else t.append(icon('file-isr', { size: 20 }));
  } else if (tile.type === 'voice') {
    t = document.createElement('span');
    t.dataset.voice = '';
    t.append(icon('microphone', { size: 20 }));
  } else return null;
  t.classList.add('c-composer__ctx-tile');
  t.setAttribute('aria-hidden', 'true');
  return t;
}

/* ★★ S8 (#1238, Damir 2026-10-07: "as you wrote") — THE STRIP GROWS, the tx-detail drawer grammar (wallet-shell.js #1056).
   WAAPI on the strip's box: height, block padding, block margins and the hairline go 0 → their resting values, so the
   PILL grows and the slot's ResizeObserver (chat.html) re-pins the log inside its own callback — the bubbles ride up
   with the pill, no dip. OPEN = --duration-200 on --easing-standard, the content hidden for the first 30 % and fading
   in after (it never shows squashed). CLOSE = 0.75 × that (150 ms) on --easing-accelerate, the content gone in the first
   half; a closing strip is `inert` + [data-closing] (no tap, no focus, not read) and leaves the DOM at the end. No
   overshoot. Durations AND easings are READ from the tokens, so reduced motion (the tokens are 0 ms there) and an
   engine without WAAPI are instant — the same end state; the CSS rise (c-composer-ctx-in) is that engine's fallback. */
const ctxAnims = new WeakMap();   // strip → its running Animation
function ctxToken(name, fallback) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
}
function ctxStripMotion(strip, open, done, fromBox) {
  let fired = false;
  const finish = () => {
    if (fired) return;
    fired = true;
    ctxAnims.delete(strip);
    if (open) strip.style.overflow = '';
    if (done) done();
  };
  if (!open) { strip.dataset.closing = ''; strip.setAttribute('inert', ''); }
  const base = parseFloat(ctxToken('--duration-200', '200ms'));
  const ms = Number.isFinite(base) ? Math.round(open ? base : base * 0.75) : 0;
  if (!ms || typeof strip.animate !== 'function' || !strip.offsetHeight) { finish(); return; }
  /* FROM = what is on screen now — a close that lands mid-grow starts from the half-grown box, not from full */
  const cs = getComputedStyle(strip);
  const now = { height: cs.height, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom, borderBottomWidth: cs.borderBottomWidth };
  const fromOpacity = cs.opacity;
  const run = ctxAnims.get(strip);
  if (run) run.cancel();
  const shut = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderBottomWidth: '0px' };
  strip.style.animation = 'none';   // the CSS rise is the no-WAAPI fallback only (never put back: that would replay it)
  strip.style.overflow = 'hidden';
  /* ★ #46 r1 (S8 picks m-5): a strip that REPLACES a closing one opens from that strip's box AS IT IS ON SCREEN
     (fromBox, measured before it left) — the same FROM = on-screen rule as a close mid-grow; from 0 the slot dropped
     32 px in one frame on a close + reopen inside the 150 ms */
  const frames = open
    ? [{ ...(fromBox || shut), opacity: 0, offset: 0 }, { opacity: 0, offset: 0.3 }, { ...now, opacity: 1, offset: 1 }]
    : [{ ...now, opacity: fromOpacity, offset: 0 }, { opacity: 0, offset: 0.5 }, { ...shut, opacity: 0, offset: 1 }];
  let a;
  try {
    a = strip.animate(frames, {
      duration: ms,
      easing: open ? ctxToken('--easing-standard', 'cubic-bezier(0.2, 0, 0, 1)') : ctxToken('--easing-accelerate', 'cubic-bezier(0.3, 0, 1, 1)'),
      fill: open ? 'none' : 'forwards',
    });
  } catch (e) { finish(); return; }
  ctxAnims.set(strip, a);
  a.onfinish = finish;
  /* a timeline that does not tick (a hidden pane) must not leave a strip half-way — the end state lands anyway
     (a PAUSED animation is someone's deliberate hold — devtools, a frame-by-frame render — and is left alone) */
  setTimeout(() => { if (!fired && ctxAnims.get(strip) === a && a.playState !== 'paused') { a.cancel(); finish(); } }, ms + 120);
}

/**
 * setComposerContext(el, ctx | null)
 *   ctx = { kind: 'reply'|'edit', title, text, prefill (edit, default true),
 *           tile (reply: { type:'image', src } | { type:'file', ext } | { type:'voice' } | null), onCancel, strings }
 * ★ 7b (#1214, strip B): the strip is the FIRST LINE INSIDE the pill (.c-composer__field[data-ctx]) — glyph ·
 * title/excerpt · tile · ✕, a hairline under it. Edit prefills the field
 * (synthetic input event — no spurious ixian:typing, isTrusted guard).
 * Esc in the field cancels the active context before it clears text.
 * getComposerContext(el) → active ctx or null (shell reads this on send).
 */
export function setComposerContext(el, ctx) {
  const input = el.querySelector('.c-composer__input');
  const field = el.querySelector('.c-composer__field');
  /* ★ S8 (#1238): a strip still CLOSING is dropped at once (a new context, or a second close, wins). An open strip is
     either SWAPPED in place (Reply ⇄ Edit: no collapse, no grow) or, on a close, collapsed by ctxStripMotion below. */
  let fromBox = null;   // ★ #46 r1 (m-5): the closing strip's box on screen now — a new strip grows FROM it
  for (const old of el.querySelectorAll('.c-composer__ctx[data-closing]')) {
    if (!fromBox && ctx && old.offsetHeight) {
      const cs = getComputedStyle(old);
      fromBox = { height: cs.height, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom, borderBottomWidth: cs.borderBottomWidth };
    }
    const a = ctxAnims.get(old);
    if (a) a.cancel();
    ctxAnims.delete(old);
    old.remove();
  }
  const prev = el.querySelector('.c-composer__ctx');
  const closing = !!prev && !ctx;
  if (prev && !closing) { const a = ctxAnims.get(prev); if (a) a.cancel(); ctxAnims.delete(prev); prev.remove(); }
  if (field && !closing) delete field.dataset.ctx;
  // freeze audit: REPLACING an active edit ctx (e.g. Reply picked mid-edit)
  // must give the pre-edit draft back — else the old message text sends as
  // the new context's body and the draft is lost
  const prevCtx = composerCtx.get(el);
  if (prevCtx && prevCtx.kind === 'edit' && input) {
    input.value = prevCtx._draft || '';
    input.dispatchEvent(new Event('input'));
  }
  if (!ctx) {
    composerCtx.delete(el);
    if (closing) {
      /* the field keeps its wrap while the strip collapses; the value flips to 'closing' at once, so the back mirror
         (chat.html observes data-ctx) learns NOW that no context is open, not 150 ms later */
      if (field) field.dataset.ctx = 'closing';
      ctxStripMotion(prev, false, () => {
        prev.remove();
        if (field && !field.querySelector(':scope > .c-composer__ctx')) delete field.dataset.ctx;
      });
    }
    resyncComposer(el);
    return;
  }
  composerCtx.set(el, ctx);
  const strings = ctx.strings || getStrings();

  const strip = document.createElement('div');
  strip.className = 'c-composer__ctx';
  strip.dataset.kind = ctx.kind;
  if (ctx.quoteKind) strip.dataset.quoteKind = String(ctx.quoteKind);   // ★ #1208: what the reply quotes ('voice', 'file', …) — a style / test hook
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
  /* #46 r1 B-m3: the strip says what it is — a screen reader hears "Reply to Bob" / "Edit message", not a bare name */
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', ctx.kind === 'edit' ? (strings.editMessage || 'Edit message')
    : (ctx.title ? (strings.replyingTo || 'Reply to') + ' ' + ctx.title : (strings.reply || 'Reply')));
  const tile = ctx.kind === 'reply' ? ctxTile(ctx.tile) : null;   // ★ 7b (#1214): an edit has no tile
  if (tile) strip.append(tile);
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'c-composer__ctx-cancel';
  x.setAttribute('aria-label', strings.cancel || 'Cancel');
  x.append(icon('x', { size: 20 }));   // ★ 7b (#1214): 20 glyph in a 32 target ("hard to see" at 16)
  x.addEventListener('click', () => cancelComposerContext(el));
  strip.append(x);
  /* ★ 7b (#1214, strip B): the strip is the pill's FIRST line (Telegram grammar); data-ctx turns the field's wrap on
     (no :has() — the WebView baseline). The COST line (#86) stays a bar line above the pill, so it is still topmost. */
  if (field) { field.dataset.ctx = ctx.kind; field.prepend(strip); }
  else el.prepend(strip);
  if (!prev) ctxStripMotion(strip, true, null, fromBox);   // ★ S8 (#1238): a FRESH strip grows (from a closing one's box, m-5); a swap (Reply over Edit) stays put

  if (input) {
    if (ctx.kind === 'edit' && ctx.prefill !== false) {
      /* ★ #1199: the draft to give back is the one BEFORE any edit — replacing one edit with another must not
         take the first edit's prefill as "the draft" (prevCtx restored it into the field just above) */
      ctx._draft = input.value; // restored on cancel (audit r3)
      /* ★ #1199: the prefill is the message BODY (ctx.prefillText) when the shell gives one; the strip's
         excerpt (ctx.text) is the fallback — the pre-S6 contract */
      input.value = ctx.prefillText != null ? String(ctx.prefillText) : (ctx.text || '');
      input.dispatchEvent(new Event('input')); // grow + action sync; isTrusted=false → no typing emit
      try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}   // caret at the end
    }
    // Esc cancels the ACTIVE context (wired once per composer element)
    if (el.dataset.ctxWired === undefined) {
      el.dataset.ctxWired = '';
      input.addEventListener('keydown', (e) => {
        // ★ #1065 r2: while the message menu is up over the focused field, Esc belongs to the MENU
        // (overlay.js closes it) — one Esc must not also throw away the reply/edit in progress.
        /* ★ #46 r2 NIT: with a recording bar up, Escape belongs to the RECORDING only (the el listener) — a reply strip can
           meet a bar when C# restores a kept clip (voiceRec stopped) while a reply is open; one Escape must not end both */
        if (e.key === 'Escape' && composerCtx.has(el) && !composerRec.has(el) && !menuOverField()) cancelComposerContext(el);
      });
    }
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }   // ★ 7b (#1219): the shell keeps the target row in view
  }
  resyncComposer(el);   // ★ #1199: Save ⇄ Send, and the disabled state, for the context now up
}

export function getComposerContext(el) { return composerCtx.get(el) || null; }

/* —— ★★ #1208 (S7) — VOICE: the mic slot (#64 ON) and the RECORDING BAR. —————————————————————————————————————
 * Damir's picks: TAP to record (phone and desktop), max 30 s, the bar REPLACES the input — a red dot, the timer
 * "0:07 / 0:30", ✕ cancel and ➤ send (the trailing disc). There is NO audio in this WebView: C# records, and the bar
 * only mirrors C#'s voiceRec pushes (V6): `recording` (at the start and every ~1 s — a resync; the timer runs
 * locally between them), `stopped` (30 s reached, or an interrupt: the clip is kept, the dot goes grey and static,
 * the time freezes — the bar waits for ✕ or ➤), anything else = the bar goes and the input comes back.
 * A11y: the visible timer is aria-hidden; ONE polite status line speaks at the start and at the stop only (never
 * per second). ✕ and ➤ are real buttons with names; the hit areas are 44 px. The bar takes the pill's place and at
 * least the pill's height, so the composer does not move. Free fns (#44). */
const composerVoice = new WeakMap();   // composer el → the shell's "voice is on" answer (setComposerVoice)
const composerRec = new WeakMap();     // composer el → { state, baseMs, baseAt, openedAt, pending, bar, timer, … }
const composerParts = new WeakMap();   // composer el → { field, input, action, strings, onVoiceCancel }
const MIC_GUARD_MS = 800;              // one start per tap burst (C# answers well inside it)
const SEND_GUARD_MS = 400;             // the mic tap's twin cannot be a send
const REC_PENDING_MS = 4000;           // ✕ / ➤ wait this long for C#'s answer, then re-arm (never a dead bar)
const VOICE_REC_MAX_MS = 30000;        // ★ #1208 (1): 30 s total — the same number as VoiceCodec.MaxDurationMs

/* ★ S10 P1 (#1254): the media strip's photo count. n ≥ 1 → the trailing disc is Send (never the mic) and is enabled with
   an empty field; the text is the caption: `maxLength` caps it (over it = no send, `onTooLong(len, max)` — the shell's
   caption toast). n = 0 → today's composer. */
const composerMedia = new WeakMap();   // composer el → { n, maxLength, onTooLong }
/** setComposerMedia(el, n, { maxLength, onTooLong, busy }) — the shell's strip state (0 = no strip). ★ S15 F (#1302):
 *  busy = a tile is still being prepared → Send disabled + aria-busy, Enter sends nothing. */
export function setComposerMedia(el, n, { maxLength = 0, onTooLong = null, busy = false } = {}) {
  if (!el) return;
  const c = Math.max(0, Number(n) || 0);
  if (c) composerMedia.set(el, { n: c, maxLength: Number(maxLength) || 0, onTooLong, busy: !!busy });
  else composerMedia.delete(el);
  resyncComposer(el);
}

/** setComposerVoice(el, on) — the shell's answer to "may this chat record?" (setCaps `voice` and the room). */
export function setComposerVoice(el, on) {
  if (!el || composerVoice.get(el) === !!on) return;   // unchanged: no repaint (the shell re-derives this after EVERY push)
  composerVoice.set(el, !!on);
  resyncComposer(el);
}

/** getComposerRecording(el) → 'recording' | 'stopped' | null */
export function getComposerRecording(el) {
  const r = el ? composerRec.get(el) : null;
  return r ? r.state : null;
}

function markRecPending(el) {
  const r = composerRec.get(el);
  if (!r) return;
  r.pending = true;
  r.bar.dataset.pending = '';
  clearTimeout(r.pendingTimer);
  r.pendingTimer = setTimeout(() => {
    const now = composerRec.get(el);
    if (now !== r) return;
    r.pending = false;
    delete r.bar.dataset.pending;
  }, REC_PENDING_MS);
}

/** releaseComposerRecording(el) — C# answered a ✕ / ➤ without changing the bar's state (voiceRec sendfail): the
 *  controls work again at once. */
export function releaseComposerRecording(el) {
  const r = el ? composerRec.get(el) : null;
  if (!r) return;
  r.pending = false;
  clearTimeout(r.pendingTimer);
  delete r.bar.dataset.pending;
}

function recElapsed(r) {
  const ms = r.state === 'recording' ? r.baseMs + (Date.now() - r.baseAt) : r.baseMs;
  return Math.min(VOICE_REC_MAX_MS, Math.max(0, ms));
}
/* ★ S8 (#1239 R1): the last 5 s — the TIMER turns the warning colour and "{n} s left" shows over the wave's leading end.
   ★ #46 r1 (S8 picks NIT): the DOT stays red (the universal "recording" sign) — only the timer + the hint warn.
   ★ #46 r1 (m-3 / m-4): the hint is LAID OVER the wave (composer.css), it takes no width from it — the wave keeps one
   width from 0:00 to 0:30 in every locale, in tabular figures. The seconds are CEILED: 25.4 s → "5 s left", 29.1 s → "1".
   The timer KEEPS "0:07 / 0:30" (Damir: the limit always visible). The hint is aria-hidden like the timer (no per-second
   speech); the polite status line still speaks at the start and the stop only. */
const REC_NEAR_MS = VOICE_REC_MAX_MS - 5000;
function paintRecTime(r) {
  const ms = recElapsed(r);
  r.time.textContent = fillVoiceSlots(r.strings.recordingTime || '{0} / {1}', formatVoiceClock(ms), formatVoiceClock(VOICE_REC_MAX_MS));
  const near = r.state === 'recording' && ms >= REC_NEAR_MS;
  if (near) r.bar.dataset.near = ''; else delete r.bar.dataset.near;
  const hint = near ? fillVoiceSlots(r.strings.voiceSecondsLeft || '{0} s left', String(Math.max(0, Math.ceil((VOICE_REC_MAX_MS - ms) / 1000)))) : '';
  if (r.hint.textContent !== hint) r.hint.textContent = hint;
  /* ★ #46 picks r2 (MINOR-1): one line beside ≥ 48 px of wave, or not at all (the timer still warns) */
  const cramped = !!hint && r.hint.scrollWidth > r.hint.clientWidth + 1;
  if (cramped !== r.hint.hasAttribute('data-cramped')) { if (cramped) r.hint.dataset.cramped = ''; else delete r.hint.dataset.cramped; }   // written on a change only
}

/* ★★ S8 (#1239 R1) — THE LIVE WAVE. C# pushes voiceRecLevel(0..100) about 10 times a second (one per 100 ms slot, the peak since the last push — #46 picks r1) while it records (the mic level,
   never audio); each push is ONE new bar at the END, the older bars move one step towards the start and fall off it
   (the box clips at the START — justify-content: flex-end). Only while the bar is RECORDING: a level for a stopped bar,
   a closed bar or another composer is dropped. A non-number is dropped; a number is rounded and clamped to 0..100. The
   bar count covers a wide desktop pill (180 × 4 px); a narrow pill shows only the newest. One push = one node moved
   (the oldest bar leaves the start, a new one joins the end) — the tier colours ride on the position (composer.css). */
const REC_WAVE_BARS = 180;
export function setComposerRecLevel(el, level) {
  const r = el ? composerRec.get(el) : null;
  if (!r || r.state !== 'recording') return;
  const n = Number(level);
  if (level === null || level === '' || typeof level === 'boolean' || !Number.isFinite(n)) return;
  const b = r.wave.firstElementChild;
  if (!b) return;
  b.style.setProperty('--rec-h', String(Math.max(0, Math.min(100, Math.round(n)))));
  r.wave.append(b);   // the oldest bar becomes the newest
}

/**
 * setComposerRecording(el, state, elapsedMs)
 *   state 'recording' | 'stopped' → the bar is up (built on the first one); anything else → the bar goes.
 *   elapsedMs = C#'s clock (an int string or number); bounded to 0..30 000.
 */
export function setComposerRecording(el, state, elapsedMs) {
  const parts = el ? composerParts.get(el) : null;
  if (!parts) return;
  const { field, action, strings, onVoiceCancel } = parts;
  const ms = Math.min(VOICE_REC_MAX_MS, Math.max(0, parseInt(elapsedMs, 10) || 0));
  let r = composerRec.get(el);
  if (state !== 'recording' && state !== 'stopped') {
    if (!r) return;
    clearInterval(r.timer);
    clearTimeout(r.pendingTimer);
    const hadFocus = r.bar.contains(document.activeElement);
    r.bar.remove();
    composerRec.delete(el);
    delete el.dataset.rec;
    resyncComposer(el);
    /* the ✕ that had focus just left the DOM — the trailing disc (now the mic again) takes it; never the field,
       which would raise the phone keyboard after a voice send */
    if (hadFocus) { try { action.focus({ preventScroll: true }); } catch (e) { action.focus(); } }
    return;
  }
  if (!r) {
    const bar = document.createElement('div');
    bar.className = 'c-composer__rec';
    /* no layout shift: the bar is at least the pill's CSS height, and at least what the pill measures right now
       (a multi-line draft under a restored clip keeps its height too) */
    const ctxStrip = field.querySelector(':scope > .c-composer__ctx');   // ★ 7b (#1214): the strip is inside the pill now — not part of the input line's height
    const h = field.offsetHeight - (ctxStrip ? ctxStrip.offsetHeight : 0);
    if (h > 0) bar.style.minHeight = h + 'px';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'c-composer__rec-cancel';
    /* ★ S8 (#1239 R1): DISCARD — the trash glyph and its name (the clip is thrown away; the verb is still voicerec:cancel) */
    cancel.setAttribute('aria-label', strings.discardRecording || 'Discard recording');
    cancel.append(icon('trash', { size: 20 }));
    const dot = document.createElement('span');
    dot.className = 'c-composer__rec-dot';
    dot.setAttribute('aria-hidden', 'true');
    const time = document.createElement('span');
    time.className = 'c-composer__rec-time u-tabular';
    time.setAttribute('aria-hidden', 'true');   // the status line below speaks; a per-second count would spam
    const live = document.createElement('span');
    live.className = 'c-composer__rec-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    /* ★ S8 (#1239 R1): the live wave (decorative — aria-hidden) and the near-limit hint */
    const wave = document.createElement('span');
    wave.className = 'c-composer__rec-wave';
    wave.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < REC_WAVE_BARS; i++) {
      const b = document.createElement('span');
      b.className = 'c-composer__rec-bar';
      wave.append(b);
    }
    const hint = document.createElement('span');
    hint.className = 'c-composer__rec-hint u-tabular';
    hint.setAttribute('aria-hidden', 'true');
    /* ★ #46 r1 (S8 picks m-3 / m-4): the wave and the hint share ONE track — the hint lies over the wave's leading end
       (absolute), so it never takes width from the wave (it squeezed it to 0 px at 320 px in it / fr / ru) */
    const track = document.createElement('span');
    track.className = 'c-composer__rec-track';
    track.append(wave, hint);
    bar.append(cancel, dot, time, track, live);
    r = { state: '', baseMs: 0, baseAt: Date.now(), openedAt: Date.now(), pending: false, pendingTimer: 0, timer: 0, bar, time, live, strings, wave, hint };
    const cancelNow = () => {
      const cur = composerRec.get(el);
      if (!cur || cur.pending) return;
      markRecPending(el);
      if (onVoiceCancel) onVoiceCancel();
    };
    cancel.addEventListener('click', cancelNow);
    r.cancelNow = cancelNow;
    field.after(bar);
    composerRec.set(el, r);
    el.dataset.rec = '';
    resyncComposer(el);   // the disc becomes ➤
  }
  const prev = r.state;
  /* ★ #46 r1 NIT: a resync never runs the clock BACKWARDS (the local tick may be a little ahead of C#'s count) */
  const shown = prev === 'recording' && state === 'recording' ? recElapsed(r) : 0;
  r.state = state;
  r.baseMs = Math.max(ms, shown);
  r.baseAt = Date.now();
  /* a new push is C#'s answer to a pending ✕ / ➤ only when it changes the state; a resync keeps the wait */
  if (prev !== state && r.pending) { r.pending = false; clearTimeout(r.pendingTimer); delete r.bar.dataset.pending; }
  r.bar.dataset.state = state;
  clearInterval(r.timer);
  r.timer = 0;
  if (state === 'recording') {
    r.timer = setInterval(() => {
      if (composerRec.get(el) !== r) { clearInterval(r.timer); return; }
      paintRecTime(r);
    }, 250);
  }
  paintRecTime(r);
  if (prev !== state) {
    const words = state === 'recording'
      ? (strings.recordingVoice || 'Recording voice message')
      : fillVoiceSlots(strings.recordingStoppedAt || 'Recording stopped, {0}', formatVoiceClock(ms));
    /* a region inserted WITH its text is often not announced — the first words land a beat after the bar */
    if (prev === '') setTimeout(() => { if (composerRec.get(el) === r && r.state === state) r.live.textContent = words; }, 100);
    else r.live.textContent = words;
  }
}

/** Bot-chat cost hint (#86, bridge setChatMode cost/costText): slim standing
 *  line above the field — a money fact must not disappear while typing.
 *  Falsy costText removes it. #44 free fn.
 *
 *  A2 (#302): costText is rendered VERBATIM. C# already sends a COMPLETE localized
 *  sentence — String.Format(_SL("chat-message-cost-bar"), cost + " IXI")
 *  (SingleChatPage.xaml.cs:610) → "Sending messages costs 0.1 IXI per kB". The old
 *  `strings.costPerMessage + ' ' + costText` prefix produced "Each message costs
 *  Sending messages costs 0.1 IXI per kB" the moment a real bot was wired, and the
 *  prefix was also factually wrong: the charge is per kB and length-dependent
 *  (friend.getMessagePrice(str.Length), :757), not flat per message. Callers that
 *  have only a bare amount compose their own sentence before calling. */
export function setComposerCost(el, costText, strings = getStrings()) {
  const prev = el.querySelector('.c-composer__cost');
  if (prev) prev.remove();
  if (!costText) return;
  const line = document.createElement('div');
  line.className = 'c-composer__cost';
  line.append(icon('wallet', { size: 14 }));
  const t = document.createElement('span');
  t.textContent = String(costText);
  line.append(t);
  el.prepend(line); // always topmost (above any reply/edit ctx strip)
}
