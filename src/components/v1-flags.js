/* ★ V1A-M (Session V1A-M Drop 2, M3) — JS-only V1 feature flags.
 *
 * Why this file exists: every runtime flag so far is C# (SpixiFlags int prefs, a stored 0 acts only in devMode)
 * and reaches a shell as a setCaps cap. A flag for a pure-JS change (the group emoji avatar) has no C# side, so it
 * needs a JS switch. There is no build-time JS constant either — the committed bundle is identical in Debug and
 * Release (strip-release.mjs touches CSS only). So the switch is:
 *   · DEBUG  = ON: `<html data-p1>` is present. Every shell's head sets it when `*SL{SpixiP1}` === '1', and C# seeds
 *     SpixiP1 = "1" only under SPIXI_DEV_COEXIST (SpixiLocalization.cs P1_FLAG; Spixi.csproj sets it for Debug).
 *   · RELEASE = the source constant below (V1_RELEASE_DEFAULTS). Flip it to ship a flag ON in Release.
 * ⚠ TIED TO THE [P1] RETIREMENT. data-p1 is labelled "TEMPORARY, retire with the [P1] set" (p1.js, SpixiLocalization.cs).
 *   When the P1 carrier is retired, this function needs another Debug signal (or the flags go to their Release value);
 *   grep `v1Flag(` for the callers. Also: a Release test build made with -p:SpixiDevCoexist=true carries data-p1, so
 *   it shows the Debug value (Spixi.csproj comment).
 * The read is a plain attribute test, every call — no cache, no layout read. A flag name not in the table is OFF in
 * Release. */

export const V1_RELEASE_DEFAULTS = { groupavatars: false };

export function v1Flag(name, doc = (typeof document !== 'undefined' ? document : null)) {
  try {
    if (doc && doc.documentElement && doc.documentElement.hasAttribute('data-p1')) return true;
  } catch (e) { /* no document (node import) → the Release value */ }
  return Object.prototype.hasOwnProperty.call(V1_RELEASE_DEFAULTS, name) && V1_RELEASE_DEFAULTS[name] === true;
}
