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
  if (seps.decimal === '.') {
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

/** Route an amount-input read to the right inverse. ★ r2 MAJOR-1: the router
 *  keys on PRE-EDIT EMPTINESS, not on inputType — a paste/drop INTO a
 *  non-empty field edits a string whose separators are OURS (the mid-edit
 *  class), so it must take the per-edit strip; inputType routing sent it to
 *  the settled heuristic and re-opened the r1 CRITICAL on the paste path
 *  ("1,234" + pasted "5" → 1.2345). The settled heuristic now runs ONLY when
 *  the field held no amount before the edit (first fill: QR/deeplink seeds,
 *  synthetic dispatches, paste into empty — where outside conventions like
 *  en "12,5" must keep their #135-M2 decimal reading). `hadAmount` is the
 *  caller's pre-edit state.amount truthiness — the canonical mirror of the
 *  field, no extra tracking. InsertText still carries ev.data so a just-typed
 *  separator stays decimal intent. */
export function amountInputToCanonical(display, caret, ev, locale, hadAmount) {
  if (hadAmount) {
    const data = ev && ev.inputType === 'insertText' ? ev.data : null;
    return amountEditToCanonical(display, caret, data, locale);
  }
  return ungroupAmountInput(display, locale);
}

/** Caret restore for a re-formatted amount input: the caret sits after the same
 *  COUNT OF DIGITS it sat after in the old display — separators shift freely
 *  around it, digits never do. */
export function amountCaretAfterFormat(oldDisplay, oldCaret, newDisplay) {
  const o = String(oldDisplay || ''), n = String(newDisplay || '');
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
    if (/\d/.test(n[i])) { seen++; if (seen === digitsBefore) return i + 1; }
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
  return groupAmountDisplay(sign + int.replace(/,/g, '') + (frac ? '.' + frac : ''));
}
