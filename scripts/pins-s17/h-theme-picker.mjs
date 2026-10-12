/* ==== #1353 (Damir 2026-10-12 12:57, picked A) — ONE theme picker in both places ====
 * On the BUILT settings.html (jsdom, the real click paths):
 *   · Account › Theme opens the sheet `.c-sheet--theme` with the one-line lead and THE picker (`.c-theme-pick`);
 *     Chat appearance › Theme carries THE SAME picker — the two are compared by a STRUCTURE SIGNATURE (per tile: mode,
 *     value, the faces it paints, the check, the name), so a second, drifting picker on either side fails here;
 *   · System paints BOTH faces (light + the dark one clipped on the diagonal), Light / Dark one face each;
 *   · each side COMMITS through the hub's one verb — a pick sends ixian:appearance:<n> and moves the check; the sheet stays
 *     open (#148②).
 * Deliberate break (#1353 report): Chat appearance back on its own phones (the old `.c-settings-appearance__theme`
 * markup) → the signature clause fails; the sheet without the lead → the sheet clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const sig = (root) => (root ? [...root.querySelectorAll('.c-theme-pick__tile')].map((t) => [
    t.dataset.mode, t.dataset.value, t.getAttribute('role'),
    [...t.querySelectorAll('.c-theme-pick__mini > .c-theme-pick__face')].map((f) => f.dataset.face).join('+'),
    t.querySelector('.c-theme-pick__mini > .c-theme-pick__check svg') ? 'check' : 'nocheck',
    t.querySelector('.c-theme-pick__mini').getAttribute('aria-hidden'),
    (t.querySelector('.c-theme-pick__name') || {}).textContent || '',
  ].join('|')).join(' ; ') : '');
  try {
    s = await K.boot('settings.html', { wait: 900 });
    const { d } = s;
    s.push('setCaps', 'settingsApply');
    await sleep(250);
    const rowBy = (name) => [...d.querySelectorAll('#settings-root button.c-settings__row')].find((b) => (b.textContent || '').trim().startsWith(name));
    /* —— the sheet —— */
    const tr = rowBy('Theme');
    if (tr) tr.click();
    await sleep(200);
    const sheet = d.querySelector('.c-sheet--theme');
    const sheetPick = sheet && sheet.querySelector('.c-theme-pick');
    const sheetSig = sig(sheetPick);
    const lead = sheet && sheet.querySelector('.c-theme-sheet__lead');
    const sent0 = s.sent.length;
    const sLight = sheetPick && sheetPick.querySelector('.c-theme-pick__tile[data-mode="light"]');
    if (sLight) sLight.click();
    await sleep(60);
    const sheetCommit = s.sent.slice(sent0).includes('ixian:appearance:1') && !!sLight && sLight.getAttribute('aria-checked') === 'true' && !!d.querySelector('.c-sheet--theme .c-theme-pick');
    /* back to System so the appearance screen opens on the same value */
    const sSys = sheetPick && sheetPick.querySelector('.c-theme-pick__tile[data-mode="system"]');
    if (sSys) sSys.click();
    await sleep(60);
    d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    /* —— Chat appearance —— */
    const ca = rowBy('Chat appearance');
    if (ca) ca.click();
    await sleep(500);
    const card = d.querySelector('.c-settings-appearance__card--theme');
    const caPick = card && card.querySelector('.c-theme-pick');
    const caSig = sig(caPick);
    const sent1 = s.sent.length;
    const cDark = caPick && caPick.querySelector('.c-theme-pick__tile[data-mode="dark"]');
    if (cDark) cDark.click();
    await sleep(60);
    const caCommit = s.sent.slice(sent1).includes('ixian:appearance:2') && !!cDark && cDark.getAttribute('aria-checked') === 'true';
    const r = {
      sheet: !!sheet && !!sheetPick && !!lead && (lead.textContent || '').length > 10,
      same: !!sheetSig && sheetSig === caSig && !card.querySelector('.c-settings-appearance__theme, .c-settings-appearance__phone'),
      system: /^system\|0\|radio\|light\+dark\|check\|true\|/.test(sheetSig) && /light\|1\|radio\|light\|check/.test(sheetSig) && /dark\|2\|radio\|dark\|check/.test(sheetSig),
      sheetCommit, caCommit,
    };
    ok(Object.values(r).every(Boolean),
      '★ #1353 (Damir 12:57, picked A): ONE theme picker — Account › Theme (a taller sheet with a one-line lead) and Chat appearance › Theme render THE SAME component (structure signature equal: modes, faces — System light + dark —, the corner check, the names), and each commits through the hub verb (ixian:appearance:<n>, the check moves, the sheet stays open) — ' + JSON.stringify(r) + ' sheet=' + sheetSig.slice(0, 120));
  } finally {
    if (s && s.close) s.close();
  }
}
