/**
 * c-fmtbar — the composer's "Aa" format bar (S20 F, DECISIONS #1378; input A + C).
 *
 * Typing the marks always works (A). This adds C: an "Aa" toggle inside the pill (trailing side) that opens a small bar
 * ABOVE the composer — the @-autocomplete's surface family (composer.css .c-composer__mentions) — with Bold · Italic ·
 * Strike · Code. A button wraps the selection in the mark (or inserts a pair and puts the caret between); pressed on a
 * selection that is already wrapped, it unwraps it. Desktop (data-desktop): Ctrl+B / Ctrl+I / Ctrl+Shift+X (Cmd on a Mac).
 *
 * The bar is position:absolute on the composer root (format-bar.css), like the @ popover: it never changes the
 * composer's height, so the list reserve (P's composer ↔ list motion) never moves when it opens or closes.
 *
 * a11y: the toggle is aria-pressed; the bar is a role=toolbar with labelled buttons; Esc closes it and focus returns to
 * the textarea. Buttons take mousedown/preventDefault so a mouse or touch press never blurs the field (the keyboard
 * stays up on a phone and the selection is kept).
 *
 * mountFormatBar(composerEl, { field, input, strings }) → { open, close, apply, toggle, bar, button }
 * applyFormat(input, kind) — kind ∈ 'bold' | 'italic' | 'strike' | 'code'; exported for the shortcuts and the pins.
 */
import { icon } from './icons.js';
import { formatSpans } from './msg-format.js';

const FMT_MARK = { bold: '*', italic: '_', strike: '~', code: '`' };
const FMT_KINDS = ['bold', 'italic', 'strike', 'code'];
const FMT_TAG = { bold: 'b', italic: 'i', strike: 's', code: 'code' };
let fmtSeq = 0;

function fmtIsMacLike() {
  try { return /Mac|iPhone|iPad/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || ''); } catch (_) { return false; }
}

/* Replace [s, e) with text and select [selS, selE). execCommand('insertText') keeps the field's undo history (Ctrl+Z
   undoes the wrap); where it is missing or refused, setRangeText + a synthetic input event does the same edit. */
function fmtReplaceRange(input, s, e, text, selS, selE) {
  const expected = input.value.slice(0, s) + text + input.value.slice(e);
  try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
  input.setSelectionRange(s, e);
  let ok = false;
  try { ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text); } catch (_) { ok = false; }
  if (!ok || input.value !== expected) {
    input.value = expected;
    input.dispatchEvent(new Event('input', { bubbles: true }));   // grow + the send state (isTrusted=false → no ixian:typing)
  }
  try { input.setSelectionRange(selS, selE); } catch (_) {}
}

/** Wrap / unwrap the selection of `input` in the mark for `kind` (see the header). */
export function applyFormat(input, kind) {
  const M = FMT_MARK[kind];
  if (!M || !input) return false;
  const v = input.value;
  let s = input.selectionStart == null ? v.length : input.selectionStart;
  let e = input.selectionEnd == null ? s : input.selectionEnd;
  // the marks must hug text (#1378 grammar: an opener is followed by a non-space, a closer preceded by one)
  while (s < e && /\s/.test(v[s])) s++;
  while (e > s && /\s/.test(v[e - 1])) e--;
  if (s === e) {                                               // nothing selected: a pair, the caret between
    fmtReplaceRange(input, s, s, M + M, s + 1, s + 1);
    return true;
  }
  const sel = v.slice(s, e);
  /* ★ #46 r1 MINOR-2: unwrap ONLY a pair the grammar really matched as ONE node of this kind (marks just outside the
     selection, or the selection's own outer marks) — never a literal star of `a*b*c` or two nodes of `*a* and *b*` */
  const tag = FMT_TAG[kind];
  const spans = formatSpans(v);
  const isNode = (a, b) => spans.some((sp) => sp[0] === tag && sp[1] === a && sp[2] === b);
  if (s > 0 && isNode(s - 1, e + 1)) {                         // already wrapped (marks just outside) → unwrap
    fmtReplaceRange(input, s - 1, e + 1, sel, s - 1, e - 1);
    return true;
  }
  if (isNode(s, e)) {                                          // the marks inside the selection → unwrap
    fmtReplaceRange(input, s, e, sel.slice(1, -1), s, e - 2);
    return true;
  }
  if (kind === 'code' && (sel.includes('\n') || sel.includes('`'))) {   // several lines, or backticks inside → a ``` block
    if (sel.includes('```')) return false;                     // a fence inside cannot be wrapped as code at all
    const lead = s === 0 || v[s - 1] === '\n' ? '' : '\n';
    const tail = e === v.length || v[e] === '\n' ? '' : '\n';
    const text = lead + '```\n' + sel + '\n```' + tail;
    const at = s + lead.length + 4;
    fmtReplaceRange(input, s, e, text, at, at + sel.length);
    return true;
  }
  if (sel.includes('\n')) {                                    // a mark never spans a line: wrap each line's text
    const text = sel.split('\n').map((line) => {
      const m = /^(\s*)(.*?)(\s*)$/.exec(line);
      return m && m[2] ? m[1] + M + m[2] + M + m[3] : line;
    }).join('\n');
    fmtReplaceRange(input, s, e, text, s, s + text.length);
    return true;
  }
  fmtReplaceRange(input, s, e, M + sel + M, s + 1, e + 1);
  return true;
}

function fmtShortcutKind(e, mac) {
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod || e.altKey) return null;
  const k = String(e.key || '').toLowerCase();
  if (!e.shiftKey && k === 'b') return 'bold';
  if (!e.shiftKey && k === 'i') return 'italic';
  if (e.shiftKey && k === 'x') return 'strike';
  return null;
}

export function mountFormatBar(el, { field, input, strings = {} } = {}) {
  if (!el || !field || !input) return null;
  const id = 'c-fmtbar-' + (++fmtSeq);
  /* ★ #46 r1 MINOR-3: an IME composition owns the field until it commits — an edit inside it (`hello wor` + Bold →
     `hello wor**`) is lost or doubled by the commit. While composing, the bar and the shortcuts do nothing. */
  let composing = false;
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
  input.addEventListener('blur', () => { composing = false; });
  const mac = fmtIsMacLike();
  const desktop = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-desktop');
  const labels = {
    bold: strings.formatBold || 'Bold',
    italic: strings.formatItalic || 'Italic',
    strike: strings.formatStrike || 'Strikethrough',
    code: strings.formatCode || 'Code',
  };
  const keys = { bold: 'B', italic: 'I', strike: 'Shift+X' };

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'c-fmtbar-toggle';
  toggle.setAttribute('aria-label', strings.formatText || 'Text formatting');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-controls', id);
  const aa = document.createElement('span');
  aa.className = 'c-fmtbar-toggle__glyph';
  aa.setAttribute('aria-hidden', 'true');
  aa.textContent = 'Aa';
  toggle.append(aa);
  field.append(toggle);

  const bar = document.createElement('div');
  bar.className = 'c-fmtbar';
  bar.id = id;
  bar.hidden = true;
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', strings.formatText || 'Text formatting');
  for (const kind of FMT_KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-fmtbar__btn';
    b.dataset.fmt = kind;
    b.setAttribute('aria-label', labels[kind]);
    if (kind === 'code') b.append(icon('code', { size: 20 }));
    else {
      const g = document.createElement('span');
      g.className = 'c-fmtbar__glyph';
      g.setAttribute('aria-hidden', 'true');
      g.textContent = kind === 'bold' ? 'B' : kind === 'italic' ? 'I' : 'S';
      b.append(g);
    }
    if (keys[kind] && desktop()) {
      const combo = (mac ? '⌘' : 'Ctrl+') + keys[kind];
      b.title = labels[kind] + ' (' + combo + ')';
      b.setAttribute('aria-keyshortcuts', (mac ? 'Meta+' : 'Control+') + keys[kind]);
    }
    b.addEventListener('mousedown', (e) => e.preventDefault());   // keep the field's focus + selection
    b.addEventListener('click', () => { if (!composing) applyFormat(input, kind); });   // ★ #46 r1 MINOR-3: never mid-IME
    bar.append(b);
  }
  // DOM order = tab order: the field (… input, Aa) → the bar → the send disc
  el.insertBefore(bar, field.nextSibling);

  const isOpen = () => !bar.hidden;
  const open = () => {
    bar.hidden = false;
    toggle.setAttribute('aria-pressed', 'true');
    el.setAttribute('data-fmt-open', '');
  };
  const close = ({ refocus = false } = {}) => {
    if (!isOpen()) return;
    bar.hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
    el.removeAttribute('data-fmt-open');
    if (refocus) { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } }
  };
  const flip = () => (isOpen() ? close() : open());

  toggle.addEventListener('mousedown', (e) => e.preventDefault());
  toggle.addEventListener('click', flip);

  // Esc closes the bar (before the reply / edit strip's own Esc — capture, after the @ picker's, which wired first)
  const onEsc = (e) => {
    if (e.key !== 'Escape' || !isOpen() || e.isComposing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    close({ refocus: true });
  };
  input.addEventListener('keydown', onEsc, true);
  bar.addEventListener('keydown', onEsc);
  toggle.addEventListener('keydown', onEsc);

  // desktop shortcuts — on the field only, so Ctrl+B elsewhere keeps its own meaning
  input.addEventListener('keydown', (e) => {
    if (!desktop() || composing || e.isComposing || e.keyCode === 229) return;
    const kind = fmtShortcutKind(e, mac);
    if (!kind) return;
    e.preventDefault();
    applyFormat(input, kind);
  });

  /* the bar goes away when focus MOVES to another control outside the composer (Tab out, a click on a focusable
     control). ★ #46 r1: no settle timer — focusout's relatedTarget already names where focus goes; focus going nowhere
     (a tap on the list, the window losing focus: relatedTarget null) keeps the bar, which is a toggle. */
  el.addEventListener('focusout', (e) => {
    const to = e.relatedTarget;
    if (to && !el.contains(to)) close();
  });

  return { open, close, toggle: flip, apply: (kind) => applyFormat(input, kind), bar, button: toggle };
}
