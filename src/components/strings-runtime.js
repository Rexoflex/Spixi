/* i18n runtime — the active per-shell string dictionary lives on `window.SL`
 * (ARCHITECTURE §7). Every component's `strings` parameter defaults to
 * getStrings(), so markup localizes from window.SL with no per-call threading;
 * an explicit `strings` argument still overrides (parents thread their own dict
 * down unchanged). window.SL absent → {} → the English `|| 'fallback'` literals
 * render, so this is fully backward-compatible.
 *
 * setStrings() swaps the active locale at runtime (demos + the future §8-gated
 * `getStrings` bridge command; mirrors ARCHITECTURE §7's "instant switch").
 * In the file:// demo bundle these two names live in the shared IIFE scope
 * (build-demo-bundle.mjs strips the imports); under Vite they resolve as ESM.
 */
export function getStrings() {
  return (typeof window !== 'undefined' && window.SL) || {};
}

export function setStrings(dict) {
  if (typeof window !== 'undefined') window.SL = dict || {};
  return getStrings();
}
