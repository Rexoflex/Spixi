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

/** Display rule for IXI amounts: ≤2 decimals, truncated (never rounded), EXCEPT
 *  a nonzero amount is never shown as "0" — a sub-0.01 transfer keeps enough
 *  precision to read (#76/#77 amended, Damir 2026-07-07: "show the real amount"
 *  after a payment card rendered a small receipt as "0 IXI"). */
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
  return sign + int + (frac ? '.' + frac : '');
}
