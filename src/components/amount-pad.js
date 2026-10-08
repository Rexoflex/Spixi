/* amount-pad.js — the in-app amount keypad + the big amount display (★ S11 H, #1263).
 *
 * Damir's pick A ("Cash App / Revolut"): step 2 of Send and Request is a big centred
 * NUMBER, not a text field, and an in-app keypad that is always visible. One module, two
 * consumers (wallet-send, wallet-receive), because the three bugs this replaces were all
 * the OS keyboard's and not the screen's:
 *   · #607 — a keypad whose decimal key emitted '.' while the field formatted with ','
 *     (or the reverse) put the caret on the wrong side of the separator: 1 , 4 → "14.",
 *     ten times the amount. HERE THE KEY AND THE DISPLAY AGREE BY CONSTRUCTION: the
 *     decimal key is a KEY ID ('dec'), never a character; the state is the canonical
 *     '.'-decimal string; the display and the key label both come from localeSeps().
 *   · #609 — the iOS decimal pad has no return key and the app removes the accessory bar,
 *     so the field had no way out. There is no OS keyboard here, so nothing to dismiss.
 *   · I-6/#360 caret arithmetic — there is no caret to place: digits only ever append.
 *
 * Rules (padApply, pure — pinned): digits append; no leading zeros ('0' then '5' → '5');
 * one decimal mark (a second is ignored; on an empty value it gives '0.'); at most
 * `decimals` digits after it (IXI = 8, chain precision) and at most 15 before it;
 * backspace removes the last character ('0.' → '' so the grey placeholder returns);
 * long-press backspace clears. The value that leaves is canonicalAmount(raw) — the same
 * payload form every money path already uses (#77 untouched).
 *
 * Desktop: hardware keys drive the same padApply while the owner says the pad is live
 * (digits; the LOCALE's decimal mark and the numpad decimal key = 'dec'; the OTHER
 * separator is grouping and is ignored, so en "1,000.50" → 1000.5 and de "1.000" → 1000
 * (★ #46 r3 MINOR-3); Backspace; Delete = clear). Enter when focus is NOT on a pad key
 * or another control = the owner's primary action, only while it is enabled (★ #46 r3
 * MAJOR-1). Never from an editable target, never with a modifier, never while a
 * dialog/sheet holds focus. The listener is bound only while the owner's step is on
 * screen and drops itself once the pad leaves the document.
 * A pointer press on a key never moves focus (mousedown default prevented, ★ #46 r3
 * MAJOR-1): otherwise Enter/Space after a click re-clicked the focused key (5 → 55) on
 * Chromium/WebView2. Tab still reaches the keys; a keyboard-focused key keeps the normal
 * button behaviour.
 *
 * Exports: padApply(raw, key, opts) · createAmountDisplay({ className, strings }) ·
 *          setAmountDisplay(display, raw, { error }) ·
 *          createAmountPad({ display, strings, decimals, onChange }) → element with
 *            _value() · _set(raw) · _press(key) · _keysOn(isLive, { primary }) · _keysOff()
 */
import { getStrings } from './strings-runtime.js';
import { localeSeps, groupAmountDisplay, sanitizeAmount } from './money.js';

const PAD_INT_MAX = 15;                                        // 999 trillion IXI: far past supply, never wraps
const PAD_LONG_PRESS_MS = 550;

/** ★ #1263 — one keypress applied to the canonical edit string ('.'-decimal, maybe a
 *  trailing '.' mid-typing). key ∈ '0'…'9' · 'dec' · 'back' · 'clear'. */
export function padApply(raw, key, { decimals = 8 } = {}) {
  const s = String(raw == null ? '' : raw);
  if (key === 'clear') return '';
  if (key === 'back') {
    const t = s.slice(0, -1);
    return t === '0' ? '' : t;                             // '0.' ← → the placeholder, not a bare 0
  }
  if (key === 'dec') {
    if (decimals <= 0 || s.includes('.')) return s;        // a second mark is ignored
    return (s === '' ? '0' : s) + '.';
  }
  if (!/^[0-9]$/.test(key)) return s;
  const dot = s.indexOf('.');
  if (dot === -1) {
    if (s === '0') return key;                             // no leading zeros: 0 then 5 → 5 (0 then 0 → 0)
    if (s.length >= PAD_INT_MAX) return s;
    return s + key;
  }
  if (s.length - dot - 1 >= decimals) return s;            // precision reached: further digits ignored
  return s + key;
}

/** The big amount (render A): grey placeholder "0.00" in the locale's mark, a caret, the
 *  IXI unit. An <output> (implicit role=status, polite): a screen reader hears the value
 *  change, never the caret. NOT an input — nothing here can raise an OS keyboard. */
export function createAmountDisplay({ className = '', strings = getStrings(), unit = 'IXI' } = {}) {
  const out = document.createElement('output');
  out.className = 'c-amount' + (className ? ' ' + className : '');
  out.setAttribute('aria-live', 'polite');
  out.setAttribute('aria-atomic', 'true');
  out.tabIndex = -1;                                       // the step's focus target (no keyboard to raise)
  const row = document.createElement('span');
  row.className = 'c-amount__row u-tabular';
  const u = document.createElement('span');
  u.className = 'c-amount__unit';
  u.textContent = unit;
  out.append(row, u);
  setAmountDisplay(out, '');
  return out;
}

/** Re-render the display for `raw` (canonical edit form). error → the error colour
 *  (the over-balance state); the shake plays once per entry, never on reduced motion. */
export function setAmountDisplay(display, raw, { error = false } = {}) {
  if (!display) return display;
  const row = display.querySelector('.c-amount__row');
  if (!row) return display;
  const s = String(raw == null ? '' : raw);
  row.textContent = '';
  const caret = document.createElement('span');
  caret.className = 'c-amount__caret';
  caret.setAttribute('aria-hidden', 'true');
  if (!s) {
    const zero = document.createElement('span');
    zero.className = 'c-amount__zero';
    zero.textContent = groupAmountDisplay('0.00');         // the locale's mark: 0,00 in de-de
    row.append(caret, zero);
    display.dataset.empty = '';
  } else {
    const num = document.createElement('span');
    num.className = 'c-amount__num';
    num.textContent = groupAmountDisplay(s);               // grouping + the locale's mark (display skin only)
    row.append(num, caret);
    delete display.dataset.empty;
  }
  const len = s.length;
  display.dataset.size = len > 14 ? 's' : len > 10 ? 'm' : 'l';   // the type steps down, never wraps
  const was = display.dataset.error !== undefined;
  if (error) {
    display.dataset.error = '';
    if (!was) {                                            // one shake on ENTRY (CSS owns it; reduced motion = none)
      display.removeAttribute('data-shake');
      void display.offsetWidth;
      display.dataset.shake = '';
    }
  } else {
    delete display.dataset.error;
    delete display.dataset.shake;
  }
  return display;
}

/* tabler "backspace" (stroke 1.8, currentColor) — the icon set has no backspace glyph */
function padBackspaceGlyph() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M20 6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5-6 5-6zM12 10l4 4m0-4l-4 4');
  svg.append(p);
  return svg;
}

/** The 3×4 keypad (render A): 1–9, the locale's decimal mark, 0, backspace. */
export function createAmountPad({ display = null, strings = getStrings(), decimals = 8, onChange } = {}) {
  const pad = document.createElement('div');
  pad.className = 'c-amount-pad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', strings.padLabel || 'Number pad');
  let raw = '';
  let error = false;
  const set = (next, { silent = false } = {}) => {
    raw = next;
    if (display) setAmountDisplay(display, raw, { error });
    if (!silent && onChange) onChange(raw);
  };
  const press = (key) => {
    const next = padApply(raw, key, { decimals });
    if (next !== raw) set(next);
  };

  const mark = localeSeps().decimal;
  const groupMark = localeSeps().group;   // ★ #46 r4 (S11): only THIS locale's real grouping character is dropped
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'dec', '0', 'back'];
  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-amount-pad__key';
    b.dataset.key = k;
    if (k === 'dec') {
      b.textContent = mark;                                // ★ the SAME source the display uses (#607 closed by construction)
      b.setAttribute('aria-label', strings.padDecimal || 'Decimal mark');
      if (decimals <= 0) b.disabled = true;
    } else if (k === 'back') {
      b.append(padBackspaceGlyph());
      b.setAttribute('aria-label', strings.padDelete || 'Delete digit');
    } else {
      b.textContent = k;
    }
    b.addEventListener('contextmenu', (e) => e.preventDefault());   // Android long-press: no callout
    // ★ #46 r3 MAJOR-1: a mouse/touch press never moves focus onto the key — a focused
    // key would take the next Enter/Space as a second click (5 → 55). Click still fires.
    b.addEventListener('mousedown', (e) => e.preventDefault());
    if (k === 'back') {
      let timer = 0;
      let cleared = false;
      const stop = () => { if (timer) { clearTimeout(timer); timer = 0; } };
      b.addEventListener('pointerdown', () => {
        cleared = false;
        stop();
        timer = setTimeout(() => { timer = 0; cleared = true; press('clear'); }, PAD_LONG_PRESS_MS);
      });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointercancel', stop);
      b.addEventListener('pointerleave', stop);
      b.addEventListener('click', () => {
        if (cleared) { cleared = false; return; }          // the long press already cleared — the lift is not a backspace
        press('back');
      });
    } else {
      b.addEventListener('click', () => press(k));
    }
    pad.append(b);
  }

  /* desktop hardware keys — bound while the owner's step is live */
  let keyFn = null;
  let sweep = 0;
  const off = () => {
    if (keyFn) document.removeEventListener('keydown', keyFn);
    keyFn = null;
    if (sweep) { clearInterval(sweep); sweep = 0; }
  };
  pad._keysOn = (isLive = () => true, { primary = null } = {}) => {
    off();
    keyFn = (e) => {
      if (!pad.isConnected) { off(); return; }
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (!isLive()) return;
      const t = e.target;
      if (t && typeof t.closest === 'function'
        && t.closest('input, textarea, select, [contenteditable], [role="dialog"], [role="alertdialog"], .c-sheet, .c-modal')) return;
      if (e.key === 'Enter') {
        // ★ #46 r3 MAJOR-1: a pad key or any other control keeps its own Enter (native);
        // from the amount / the page, Enter is the owner's primary action — if enabled.
        if (e.repeat || !t || typeof t.closest !== 'function'
          || t.closest('button, a[href], [role="button"], [role="link"], summary')) return;
        const p = typeof primary === 'function' ? primary() : null;
        if (!p || p.disabled || p.hidden || p.getAttribute('aria-disabled') === 'true') return;
        e.preventDefault();
        p.click();
        return;
      }
      let key = null;
      if (/^[0-9]$/.test(e.key)) key = e.key;
      else if (e.key === 'Decimal' || e.code === 'NumpadDecimal' || e.key === mark) key = 'dec';
      else if (e.key === groupMark) return;      // ★ #46 r3 MINOR-3: the locale's grouping key (en ',' · de '.') is ignored
      /* ★ #46 r4 MAJOR (S11): fr / ru / lt group with a (narrow) no-break space, so '.' and ',' there can only mean the
         decimal mark — dropping them turned "2.5" into 25. Any '.' or ',' that is not this locale's grouping = the decimal key. */
      else if (e.key === '.' || e.key === ',') key = 'dec';
      else if (e.key === 'Backspace') key = 'back';
      else if (e.key === 'Delete') key = 'clear';
      if (!key) return;
      e.preventDefault();
      press(key);
    };
    document.addEventListener('keydown', keyFn);
    sweep = setInterval(() => { if (!pad.isConnected) off(); }, 2000);   // the #609 belt: a removed pad never keeps a document listener
  };
  pad._keysOff = off;
  pad._value = () => raw;
  pad._press = press;
  /** programmatic value (Max fill, a QR seed, setRequestAmount): sanitized to the pad's
   *  own rules — digits, one '.', ≤ decimals — and pushed through onChange like a key. */
  pad._set = (v, opts) => {
    let s = sanitizeAmount(v == null ? '' : String(v));
    const dot = s.indexOf('.');
    let int = dot === -1 ? s : s.slice(0, dot);
    const frac = dot === -1 ? null : s.slice(dot + 1, dot + 1 + Math.max(0, decimals));
    int = int.replace(/^0+(?=\d)/, '');                    // ★ #46 r3 NIT-3: '00.5' → '0.5', '007' → '7'
    if (frac !== null && int === '') int = '0';             // '.5' → '0.5'
    if (int.length > PAD_INT_MAX) s = '';                   // ★ NIT-3: past the pad's 15-digit cap → nothing seeded (never a silently shorter number)
    else s = frac === null ? int : (decimals > 0 ? int + '.' + frac : int);
    set(s, opts);
  };
  pad._error = (on) => {
    on = !!on;
    if (on === error) return;
    error = on;
    if (display) setAmountDisplay(display, raw, { error });
  };
  return pad;
}
