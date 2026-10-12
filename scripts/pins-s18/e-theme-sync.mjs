/* ==== S18 D2 (S17 walk TH-PICKER-A, Damir 2026-10-12 17:17: Chat appearance showed Dark, Account › Theme showed System) ====
 * MECHANISM (reproduced first on the BUILT settings.html): the phone's Account › Theme sheet committed applyTheme + the verb
 * but never wrote state.theme, so Chat appearance (built from state.theme) opened on the OLD value; and no OPEN picker was
 * ever repainted — a setAppearance push (and, in the pane, a Chat appearance pick beside the hub's Theme row) left the
 * other side showing the old tile. Now ONE value (state.theme), ONE commit, every open picker repaints.
 * On the BUILT settings.html (jsdom), on the PHONE path and the DESKTOP PANE path (?desktop=1 + setPaneMode 1), the real
 * clicks:
 *   · commit in Account › Theme (sheet / pane screen) → Chat appearance opens on the SAME tile;
 *   · commit in Chat appearance → Account › Theme opens on the same tile, and the hub's Theme row says it (pane: at once,
 *     beside the open screen);
 *   · a setAppearance push while Chat appearance is open → its picker shows the pushed tile, and Account › Theme opens on it;
 *   · a setAppearance push while Account › Theme is open → that picker shows it, and the row says it.
 * Deliberate breaks (S18 report): the repaint dropped from setAppearance → the push clauses fail; the hub's sheet commit back
 * to `applyTheme + verb` without state.theme → the phone sheet→Chat appearance clause fails. (The repaint inside commitTheme
 * is a belt: no two pickers are on screen at once, so dropping it alone changes no clause — said in the S18 report.) */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const MODE = ['system', 'light', 'dark'];
  const checked = (root) => { const t = root && root.querySelector('.c-theme-pick__tile[aria-checked="true"]'); return t ? t.dataset.mode : null; };
  const allR = {};
  for (const pane of [false, true]) {
    const r = {};
    let s = null;
    try {
      /* the PHONE boot stands a phone UA in for the head's #228 test (settings.html has no ?mobile=1 override and jsdom's UA
         reads desktop); the PANE boot is the desktop flag + setPaneMode 1 (the Windows / Mac Account pane) */
      s = await K.boot('settings.html', { wait: 900, desktop: pane, html: pane ? null : (t) => t.split('var u=navigator.userAgent;').join("var u='Mozilla/5.0 (Linux; Android 14) Mobile';") });
      r.flag = s.d.documentElement.hasAttribute('data-desktop') === pane;
      const { d, W } = s;
      s.push('setCaps', 'settingsApply');
      if (pane) s.push('setPaneMode', '1');
      s.push('setAppearance', '2');
      await sleep(300);
      const row = (key) => d.querySelector('[data-setting-key="' + key + '"]');
      const rowVal = () => { const t = row('theme'); return t ? (t.textContent || '').replace(/^\s*Theme/, '').trim() : null; };
      const acctPick = () => d.querySelector(pane ? '.c-theme-sheet .c-theme-pick' : '.c-sheet--theme .c-theme-pick');
      const caPick = () => d.querySelector('.c-settings-appearance__card--theme .c-theme-pick');
      const openAcct = async () => { row('theme').click(); await sleep(300); return acctPick(); };
      const closeAcct = async () => { if (!pane) { d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(500); } };
      const openCa = async () => { row('chatappearance').click(); await sleep(500); return caPick(); };
      const closeCa = async () => { if (!pane) { const b = d.querySelector('.c-settings-appearance .c-topbar button[aria-label="Back"]'); if (b) b.click(); await sleep(700); } };
      const sent = (n) => s.sent.includes('ixian:appearance:' + n);
      /* 1 · Account › Theme commit → Chat appearance */
      let a = await openAcct();
      a.querySelector('[data-mode="system"]').click(); await sleep(120);
      r.acctCommit = checked(acctPick()) === 'system' && sent(0) && rowVal() === 'System';
      await closeAcct();
      let c = await openCa();
      r.acctToCa = checked(c) === 'system';
      /* 2 · Chat appearance commit → the row + Account › Theme */
      c.querySelector('[data-mode="light"]').click(); await sleep(120);
      r.caCommit = checked(caPick()) === 'light' && sent(1);
      if (pane) r.caRowNow = rowVal() === 'Light';
      await closeCa();
      a = await openAcct();
      r.caToAcct = checked(a) === 'light' && rowVal() === 'Light';
      await closeAcct();
      /* 3 · a setAppearance push while Chat appearance is open */
      c = await openCa();
      s.push('setAppearance', '2'); await sleep(200);
      r.pushCa = checked(caPick()) === 'dark';
      await closeCa();
      a = await openAcct();
      r.pushCaThenAcct = checked(a) === 'dark' && rowVal() === 'Dark';
      /* 4 · a setAppearance push while Account › Theme is open */
      s.push('setAppearance', '0'); await sleep(200);
      r.pushAcct = checked(acctPick()) === 'system' && rowVal() === 'System';
      await closeAcct();
      c = await openCa();
      r.pushAcctThenCa = checked(c) === MODE[0];
    } catch (e) { r.threw = e.message; }
    finally { if (s) s.close(); }
    allR[pane ? 'pane' : 'phone'] = r;
  }
  ok(Object.values(allR).every((r) => Object.values(r).every((v) => v === true)),
    '★ S18 D2 (TH-PICKER-A): the two theme pickers show ONE value on the phone AND in the desktop pane — a commit in Account › Theme shows in Chat appearance and the reverse (the hub row follows; in the pane at once), and a setAppearance push repaints whichever picker is open and every one opened later — ' + JSON.stringify(allR));
}
