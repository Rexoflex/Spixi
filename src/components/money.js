/**
 * money.js — shared IXI amount helpers. One home for the amount math + display
 * rules that used to be split across three components, with the chat/tip paths
 * reaching CROSS-FEATURE into the wallet path (sanitizeAmount/toUnits from
 * wallet-send, canonicalAmount from wallet-receive — the 🟡 shared-money-module
 * flag on tip-sheet, #138). DECISIONS #143 (opus-review-brief) named this the
 * dedupe target; consumers now import from here regardless of feature.
 *
 * Rules baked in (audit history — do not "simplify" away):
 *  - sanitizeAmount: with a '.' present, commas are THOUSANDS grouping and are
 *    stripped ('1,000.5' → '1000.5'); with no '.', a comma is the decimal
 *    separator ('12,5' → '12.5') — never a silent magnitude change (#135-M2).
 *    Result is clamped to ≤8 decimals (chain precision).
 *  - toUnits: exact integer 1e-8 units via BigInt (ES2020 floor, #45). Number×1e8
 *    overflows 2^53 at Ixian-scale balances and re-imports the float bug that
 *    falsely rejected exactly-fitting amounts (#135-M1, #138-M2). Callers compare
 *    balances in these units.
 *  - canonicalAmount: the PAYLOAD form of a sanitized amount — no trailing dot,
 *    no bare leading dot, no redundant leading zeros ('12.'→'12', '.5'→'0.5',
 *    '007'→'7'). Guards the QR/bridge payloads against magnitude bugs (#137-C1/M1).
 *  - formatIxiAmount: DISPLAY only — chain carries 8 decimals, the UI shows AT
 *    MOST 2, string-TRUNCATED never rounded (display must not overstate, #76/#77),
 *    trailing zeros trimmed, round numbers show none; grouping from the bridge is
 *    preserved; non-numeric input passes through. EXCEPTION (#76/#77 amended,
 *    Damir 2026-07-07): a NONZERO amount is never shown as "0" — a sub-0.01
 *    value (0-integer, fraction dropped by the 2-dp cap) keeps its full
 *    fractional precision so it stays visible. C# composes the real strings —
 *    this is the reference; mirror the exception there too.
 */

/** Sanitize a decimal string: digits + one separator, ≤8 decimals. */
export function sanitizeAmount(raw) {
  let s = String(raw || '');
  s = s.includes('.') ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  s = s.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
  const [int, dec] = s.split('.');
  return dec != null ? int + '.' + dec.slice(0, 8) : s;
}

/** Exact money math in integer 1e-8 units via BigInt (signed). */
export function toUnits(v) {
  const s = typeof v === 'number' ? v.toFixed(8) : String(v || '0');
  const neg = s.startsWith('-');
  const [i = '0', d = ''] = (neg ? s.slice(1) : s).split('.');
  const u = BigInt(i || '0') * 100000000n + BigInt((d + '00000000').slice(0, 8));
  return neg ? -u : u;
}

/** Canonical payload form of a sanitized amount. */
export function canonicalAmount(amount) {
  let s = String(amount || '');
  if (s.endsWith('.')) s = s.slice(0, -1);
  if (s.startsWith('.')) s = '0' + s;
  s = s.replace(/^0+(?=\d)/, '');
  return s;
}

/* ★ I-6 (#360): locale-aware digit grouping — DISPLAY ONLY (Damir 2026-08-16:
 * APP-GLOBAL, "the appropriate 3,000,000 or 3.000.000"). The wire format
 * (sanitizeAmount → canonicalAmount payloads, #77) never carries separators;
 * everything below is a render-time skin, and ungroupAmountInput is its exact
 * inverse at the input boundary. The locale is the APP LANGUAGE (docLocale(),
 * the same source timestamps use) so dates and amounts always agree with the
 * language on screen. Grouping and the decimal separator travel TOGETHER —
 * "3.000" is three thousand in sl and three point zero in en, so a display
 * that grouped in one convention and kept '.' decimals would be actively
 * misleading. CLDR (Intl.NumberFormat) supplies both, incl. lakh/crore and
 * min-grouping-digits locales, via BigInt so Ixian-scale integers never touch
 * float precision (#135-M1 lesson). */
import { docLocale } from './timestamp.js';

const nfCache = new Map();   // locale → Intl.NumberFormat (integer grouping)
function localeNumberFormat(locale) {
  const loc = locale || docLocale();
  let nf = nfCache.get(loc);
  if (!nf) {
    try { nf = new Intl.NumberFormat(loc); } catch (e) { nf = new Intl.NumberFormat('en-US'); }
    nfCache.set(loc, nf);
  }
  return nf;
}

/** The locale's group + decimal separators (display layer only). */
export function localeSeps(locale) {
  const parts = (() => {
    try { return localeNumberFormat(locale).formatToParts(1234567.8); } catch (e) { return []; }
  })();
  const seps = { group: ',', decimal: '.' };
  for (const p of parts) {
    if (p.type === 'group') seps.group = p.value;
    if (p.type === 'decimal') seps.decimal = p.value;
  }
  return seps;
}

/** Full-precision display grouping: the INT part groups per locale, the decimal
 *  separator becomes the locale's, the fraction is passed through VERBATIM —
 *  callers own the precision rule (inputs keep every typed digit; the ≤2-dp
 *  law lives in formatIxiAmount). Non-amount strings pass through untouched.
 *  Leading-zero ints stay ungrouped (mid-typing '007' must not be rewritten). */
export function groupAmountDisplay(value, locale) {
  const s = String(value == null ? '' : value).trim();
  const m = s.match(/^([+-]?)([\d,]*)(\.(\d*))?$/);
  if (!m || (m[2] === '' && m[3] == null)) return s;
  const seps = localeSeps(locale);
  const digits = m[2].replace(/,/g, '');
  let grouped = digits;
  if (digits.length > 3 && digits[0] !== '0') {
    try { grouped = localeNumberFormat(locale).format(BigInt(digits)); } catch (e) { /* keep plain */ }
  }
  return m[1] + grouped + (m[3] != null ? seps.decimal + (m[4] || '') : '');
}

/** Inverse of the display skin for SETTLED strings only — QR/deeplink seeds,
 *  programmatic sets, pastes: canonical forms, our own display forms, or a
 *  grouped string from outside. Symmetric heuristic, both separator families:
 *  a separator forming exactly-3-digit runs is GROUPING and is stripped; any
 *  other use keeps its decimal meaning. So en '1,500'→1500 but '12,5'→12.5
 *  (#135-M2 preserved via sanitizeAmount), and sl '1.500'→1500 but a canonical
 *  '1500.5' passes through exactly. Whitespace groupers (fr NNBSP, CH
 *  apostrophe) are never decimals and always strip.
 *  ⚠ NOT for per-keystroke reads — a MID-EDIT display ("1,2345", the settled
 *  "1,234" plus one digit) is not a settled pattern, falls through, and the
 *  #135-M2 comma rule then reads it as a decimal: a 10000× error (loop r1
 *  CRITICAL-1). Typing and deletion go through amountEditToCanonical below. */
export function ungroupAmountInput(display, locale) {
  const seps = localeSeps(locale);
  // \s covers the NBSP/NNBSP/thin-space groupers (fr); ' is the CH grouper.
  let s = String(display == null ? '' : display).replace(/[\s']/g, '');
  const dotLocale = seps.decimal === '.';
  /* ★★ V-1(b) — THE OTHER HALF, and it fires on a paste into an EMPTY field too.
   * A string in the OTHER convention was read in NEITHER: `1,234.56` in de/fr/ru/sl/
   * pt/es/sr became 1.23456, and `1.234,56` in en became 1.23456. Both are 1000x UNDER
   * the intended 1234.56. That is not the #135-M2 comma-is-decimal rule; it is the
   * second separator losing all meaning in sanitizeAmount.
   * The rule below is deliberately NARROW: it applies ONLY when the string cannot be
   * read in the LOCAL convention at all, and can be read in the other one. A locally
   * valid string never changes meaning, so the ambiguous pairs stay exactly as they
   * were — `1,500` still reads 1.5 in de and 1500 in en, and `12,5` still reads 12.5
   * everywhere. Reaching the foreign branch needs TWO separators in the foreign
   * arrangement, which no local reading accepts. */
  const localOk = dotLocale ? /^[+-]?(\d{1,3}(,\d{3})+|\d*)(\.\d*)?$/.test(s)
                            : /^[+-]?(\d{1,3}(\.\d{3})+|\d*)(,\d*)?$/.test(s);
  const foreignOk = dotLocale ? /^[+-]?\d{1,3}(\.\d{3})+(,\d*)?$/.test(s)
                              : /^[+-]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s);
  if (!localOk && foreignOk) {
    return dotLocale ? s.replace(/\./g, '').replace(/,/g, '.')
                     : s.replace(/,/g, '');
  }
  if (dotLocale) {
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) s = s.replace(/,/g, '');
  } else {
    if (/^[+-]?\d{1,3}(\.\d{3})+(,\d*)?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(/,/g, '.');
  }
  return s;
}

/** Per-EDIT inverse (loop r1 CRITICAL-1): the field's separators are OURS —
 *  the display layer wrote them — so on a typing or deletion edit every locale
 *  group separator is stripped unconditionally; no pattern-guessing on a
 *  mid-edit string. The ONE ambiguous character is a separator the user JUST
 *  typed ('.' or ','): that is DECIMAL INTENT regardless of locale (a sl
 *  numpad emits '.', an en habit types ','), so the caller passes
 *  InputEvent.data and the just-typed char at caret-1 is marked before the
 *  strip and restored as '.'. Deletions (data == null) cannot create decimal
 *  intent — plain strip. Result feeds sanitizeAmount; the wire (#77) is
 *  untouched. */
export function amountEditToCanonical(display, caret, data, locale) {
  const seps = localeSeps(locale);
  let s = String(display == null ? '' : display);
  const c = caret | 0;
  const MARK = '\u0000';   // not whitespace, not a grouper: survives both strips below
  if ((data === ',' || data === '.') && c > 0 && s[c - 1] === data) {
    s = s.slice(0, c - 1) + MARK + s.slice(c);
  }
  s = s.split(seps.group).join('').replace(/[\s']/g, '');
  if (seps.decimal !== '.') s = s.split(seps.decimal).join('.');
  s = s.split(MARK).join('.');
  return s;
}

/** Pre-edit snapshot of an amount field: the value and the SELECTED RANGE as
 *  they were BEFORE the edit that the `input` event reports.
 *
 *  ★★ V-1 (#46 loop 2026-08-29 — A SILENT WRONG-AMOUNT DEFECT, on every money
 *  surface and in every shipped locale): the router below has to know whether
 *  the separators in the field are OURS. Neither `inputType` nor "the field was
 *  not empty" answers that question. A select-all-and-paste leaves a field that
 *  is non-empty before the edit and holds a FOREIGN string after it — de-de
 *  field `5`, select all, paste `12.75` put 127 500 000 000 units on the wire.
 *  The REPLACED RANGE answers it exactly, and only a pre-edit listener can see
 *  that range.
 *
 *  `beforeinput` is the canonical signal. It covers paste, drop, dictation and
 *  IME. The other four events are the BELT: they all land before the `input`
 *  that reports the edit, so a runtime that does not fire `beforeinput` on an
 *  <input> still gets a correct snapshot instead of falling back to the defect.
 *
 *  Returns a READER. The reader gives the snapshot ONCE and then goes stale, so
 *  a later synthetic `input` dispatch (a QR seed, a test) can never consume a
 *  snapshot that belongs to a different edit. A stale read returns null, and
 *  null routes exactly as this module routed before this change. */
export function attachAmountPreEdit(input) {
  const pre = { value: '', start: 0, end: 0, fresh: false };
  const snap = () => {
    try {
      pre.value = String(input.value == null ? '' : input.value);
      pre.start = input.selectionStart;
      pre.end = input.selectionEnd;
      pre.fresh = true;
    } catch (e) { pre.fresh = false; }   // detached or unsupported selection API
  };
  for (const t of ['beforeinput', 'keydown', 'paste', 'cut', 'drop']) {
    try { input.addEventListener(t, snap); } catch (e) { /* no listener support */ }
  }
  return () => {
    if (!pre.fresh) return null;
    pre.fresh = false;
    return { value: pre.value, start: pre.start, end: pre.end };
  };
}

/** TRUE when the edit replaced the WHOLE previous value — the only case in
 *  which the string now in the field can be a foreign convention. An empty
 *  previous value is the same case (nothing of ours survives). */
function replacedWholeValue(pre) {
  if (!pre) return false;
  const v = String(pre.value == null ? '' : pre.value);
  if (!v) return true;
  const s = pre.start, e = pre.end;
  if (s == null || e == null) return false;
  return Math.min(s, e) === 0 && Math.max(s, e) === v.length;
}

/** Route an amount-input read to the right inverse.
 *
 *  ★ r2 MAJOR-1: the router must NOT key on inputType. A paste INTO a
 *  non-empty field, at the caret, edits a string whose separators are OURS
 *  (the mid-edit class), so it takes the per-edit strip; inputType routing
 *  sent it to the settled heuristic and re-opened the r1 CRITICAL
 *  ("1,234" + pasted "5" → 1.2345). That rule stands.
 *
 *  ★★ V-1: "the field was not empty" is not the same fact. It made the router
 *  strip a PASTED string's own separators as if we had written them. The
 *  settled heuristic now runs when the edit REPLACED THE WHOLE PREVIOUS VALUE
 *  — a select-all paste, a first fill, an empty field — and the per-edit strip
 *  runs for every partial edit. `pre` is the reader's snapshot from
 *  attachAmountPreEdit; `hadAmount` stays the fallback for a synthetic
 *  dispatch that has no snapshot (QR/deeplink seeds, tests), where the field
 *  always holds a DISPLAY form and both paths agree.
 *  InsertText still carries ev.data so a just-typed separator stays decimal
 *  intent. */
export function amountInputToCanonical(display, caret, ev, locale, hadAmount, pre) {
  if (hadAmount && !replacedWholeValue(pre)) {
    const data = ev && ev.inputType === 'insertText' ? ev.data : null;
    return amountEditToCanonical(display, caret, data, locale);
  }
  return ungroupAmountInput(display, locale);
}

/** Caret restore for a re-formatted amount input: the caret sits after the same
 *  COUNT OF DIGITS it sat after in the old display — separators shift freely
 *  around it, digits never do.
 *
 *  ★★ #607 (device row 5c, iPhone 15 — A SILENT WRONG-AMOUNT DEFECT):
 *  "digits never move" is true and it was not sufficient. A caret sitting AFTER a
 *  trailing separator has exactly the same digit count as one sitting BEFORE it, so
 *  the rule above could only ever put it before — and the next digit then landed on
 *  the INTEGER side.
 *      type  1 , 4   →  field "14."   →  canonical 14      (the user meant 1.4)
 *  Ten times the amount, on the money path, with nothing on screen to say so.
 *
 *  It fires whenever the character the keypad emits is not the character `Intl`
 *  derives from `<html lang>` — the re-format that repaints the separator is the same
 *  step that loses the caret. Direction does not matter: en-us + typed ',' gives
 *  "14.", de-de + typed '.' gives "14,". Both were reachable.
 *
 *  The fix carries the SEPARATOR RUN across as well as the digit count. A run is only
 *  ever non-zero when the character just typed (or just left behind) is a separator,
 *  and it advances the caret past at most that many separators in the new string — so
 *  a deletion that happens to leave the caret behind a GROUP separator cannot jump it
 *  over one, because the new display has no separator at that position to jump.
 *  ⚠ Written from the property, not from a fixture: the test drives real keystroke
 *  sequences through the handler shape and asserts the PARSED VALUE. */
export function amountCaretAfterFormat(oldDisplay, oldCaret, newDisplay) {
  const o = String(oldDisplay || ''), n = String(newDisplay || '');
  const isSep = (ch) => ch === '.' || ch === ',';
  let sepRun = 0;
  for (let i = (oldCaret | 0) - 1; i >= 0 && i < o.length && isSep(o[i]); i--) sepRun++;
  /* advance past at most `sepRun` separators that the re-format put at this seam */
  const pastSeps = (p) => {
    let k = 0;
    while (k < sepRun && p < n.length && isSep(n[p])) { p++; k++; }
    return p;
  };
  let digitsBefore = 0;
  for (let i = 0; i < Math.min(oldCaret | 0, o.length); i++) if (/\d/.test(o[i])) digitsBefore++;
  if (!digitsBefore) {
    // loop r1 MAJOR-2: a caret with no digit before it must NOT slam to 0 —
    // typing '.' first in a ','-decimal locale reformats to ',' and the old
    // `return 0` then built the number BACKWARDS ('.','5','2' → "52,").
    // Land after the leading non-digit run (i.e. just before the first digit),
    // capped by where the caret actually was.
    if ((oldCaret | 0) === 0) return 0;
    let lead = 0;
    while (lead < n.length && !/\d/.test(n[lead])) lead++;
    return lead;
  }
  let seen = 0;
  for (let i = 0; i < n.length; i++) {
    if (/\d/.test(n[i])) { seen++; if (seen === digitsBefore) return pastSeps(i + 1); }
  }
  return n.length;
}

/** Display rule for IXI amounts: ≤2 decimals, truncated (never rounded), EXCEPT
 *  a nonzero amount is never shown as "0" — a sub-0.01 transfer keeps enough
 *  precision to read (#76/#77 amended, Damir 2026-07-07: "show the real amount"
 *  after a payment card rendered a small receipt as "0 IXI").
 *  ★ I-6 (#360): the result now renders in the APP LANGUAGE's convention —
 *  integer part locale-grouped, decimal separator the locale's. Bridge commas
 *  in the input are treated as grouping and re-grouped per locale. */
export function formatIxiAmount(value) {
  const m = String(value).trim().match(/^([+-]?)([\d,]+)(?:\.(\d+))?$/);
  if (!m) return String(value);
  const sign = m[1], int = m[2], rawFrac = m[3] || '';
  let frac = rawFrac.slice(0, 2).replace(/0+$/, '');
  // rescue the "nonzero rounds to 0" case: integer part is 0 AND the 2-dp cap
  // dropped the whole fraction, but there are significant digits deeper — show
  // the full fractional part (trailing zeros trimmed) so the value is visible.
  // Amounts ≥ 0.01 (or with a nonzero integer part) keep the 2-dp display.
  if (!frac && int.replace(/,/g, '') === '0') {
    const full = rawFrac.replace(/0+$/, '');
    if (full) frac = full;
  }
  // N32 (Damir): an ABSOLUTE-ZERO amount reads "0.00", not "0" — the bare zero
  // looked broken on the wallet hero. The trailing-zero trim stays for every
  // nonzero value; the C# alert mirror (#360) is untouched — a zero never
  // reaches the insufficient-balance sentences this way.
  if (!frac && /^0+$/.test(int.replace(/,/g, ''))) frac = '00';
  return groupAmountDisplay(sign + int.replace(/,/g, '') + (frac ? '.' + frac : ''));
}

/** N32 — TRUE for an amount string whose numeric value is exactly zero
 *  ("0", "0.0", "0,00", "+0"). Non-numeric and empty strings are NOT zero —
 *  the hero keeps its empty-until-pushed state. */
export function zeroAmount(value) {
  const m = String(value == null ? '' : value).trim().match(/^([+-]?)([\d,]+)(?:\.(\d+))?$/);
  if (!m) return false;
  return /^0*$/.test(m[2].replace(/,/g, '')) && /^0*$/.test(m[3] || '');
}
