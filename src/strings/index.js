/* Strings provider — the demo/runtime shape of the i18n channel (ARCHITECTURE §7).
 *
 * Components read `strings.KEY || 'English fallback'`, so an empty object yields
 * pure English. This module supplies the canonical en-us dictionary and a
 * pseudo-locale used for leak testing. Real locales arrive via the SL token
 * channel / a future `getStrings` bridge in Phase 3 — same shape, new source.
 */
import enUS from './en-us.js';

export { enUS };

/* Every key access returns a bracketed marker — including dynamic strings[expr]
 * keys — so any plain English still rendered under this locale is a hardcoded
 * (un-i18n'd) string. Keys never fall through to their English fallback. */
export function pseudoStrings() {
  return new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? '⟦' + k + '⟧' : undefined) });
}

export function resolveStrings(mode) {
  return mode === 'pseudo' ? pseudoStrings() : enUS;
}

export default enUS;
