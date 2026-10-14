/* ==== S20 G (#1379, the S19 open item "the details ask has no loading morph") — App details: Install shows its LOADING MORPH while
 * the app moment ask is on its way (≤ ASK_WAIT_MS 1.5 s) ====
 * On the BUILT app_details.html (jsdom, pushes via executeUiCommand, ixian: verbs captured), an app that is not installed:
 *   · wait: the Install tap sends ONE `ixian:moment:app:<id>` and the button is in the setLoading morph AT ONCE (data-loading,
 *     aria-busy="true", disabled — a second tap cannot ask again), nothing installed yet;
 *   · sheet: C#'s yes → the moment sheet shows and the button is back to rest (not loading, not disabled) — the sheet is the step;
 *     its Install → `ixian:install` and the install morph (loading again);
 *   · refused: C#'s "0" → the install confirm modal and the button at rest;
 *   · late: no answer within ASK_WAIT_MS → loading for the whole wait (still loading at 1.2 s), then the modal and the button
 *     at rest;
 *   · no cap (an older exe / the flag off): the modal at once and the button NEVER entered the morph (no flash).
 * Deliberate breaks (S20 R report): apps-details.js without `setLoading(installBtn, true)` on the wait → wait + late fail;
 * app_details.html without the `shown` hook → sheet fails (the button stays loading under the sheet). */
import { aKit } from '../pins-s11/a-kit.mjs';
const ID = 'com.ixian.chess';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const STATE = JSON.stringify({ seen: [], apps: [], lang: '', session: false });
  const bootApp = async (caps = 'moments') => {
    const s = await K.boot('app_details.html', { wait: 1400 });
    s.push('init', 'Chess', '', 'Ixian', 'A chess game.', '1.0', 'https://apps.example.org/chess/appinfo.spixi', '120 KB',
      'multiUser,storage', ID, 'False', 'True', 'False', 'False', 'True');
    if (caps) { s.push('setCaps', caps); s.push('setMoments', STATE); }
    await sleep(80);
    return s;
  };
  const btn = (s) => s.d.querySelector('.c-app-details__actions .c-button');
  const state = (b) => b ? { loading: b.hasAttribute('data-loading'), busy: b.getAttribute('aria-busy'), disabled: b.disabled } : null;
  const loading = (b) => !!b && b.hasAttribute('data-loading') && b.getAttribute('aria-busy') === 'true' && b.disabled === true;
  const atRest = (b) => !!b && !b.hasAttribute('data-loading') && !b.hasAttribute('aria-busy') && b.disabled === false;
  const asks = (s) => s.sent.filter((c) => /^ixian:moment:app:/.test(c)).length;
  const installs = (s) => s.sent.filter((c) => c === 'ixian:install').length;
  const sheet = (s) => s.d.querySelector('.c-moment__sheet[data-moment="app"]');
  const r = {}, n = {};
  let s = null;
  try {
    s = await bootApp();
    btn(s).click();
    await sleep(30);
    n.wait = state(btn(s));
    btn(s).click();                                  // a second tap while loading
    await sleep(30);
    r.wait = asks(s) === 1 && installs(s) === 0 && loading(btn(s)) && !sheet(s) && !s.d.querySelector('.c-modal');
    s.push('momentAnswer', 'app', ID, '1', 'Storage');
    await sleep(120);
    n.sheet = state(btn(s));
    const restUnderSheet = !!sheet(s) && atRest(btn(s));
    const fill = sheet(s) && sheet(s).querySelector('.c-button[data-value="open"]');
    if (fill) fill.click();
    await sleep(600);   // the sheet's close runs before go() (the q-app-install timing)
    n.afterFill = state(btn(s));
    r.sheet = restUnderSheet && installs(s) === 1 && !!btn(s) && btn(s).hasAttribute('data-loading');
    s.close();

    s = await bootApp();
    btn(s).click();
    await sleep(30);
    const wasLoading = loading(btn(s));
    s.push('momentAnswer', 'app', ID, '0', '');
    await sleep(120);
    n.refused = state(btn(s));
    r.refused = wasLoading && !!s.d.querySelector('.c-modal') && atRest(btn(s)) && installs(s) === 0;
    s.close();

    s = await bootApp();
    btn(s).click();
    await sleep(1200);
    const mid = loading(btn(s)) && !s.d.querySelector('.c-modal');
    await sleep(500);
    n.late = state(btn(s));
    r.late = mid && !!s.d.querySelector('.c-modal') && atRest(btn(s)) && installs(s) === 0;
    s.close();

    s = await bootApp('');
    const seen = { loading: 0 };
    const mo = new s.W.MutationObserver((recs) => { for (const x of recs) if (x.attributeName === 'data-loading' && x.target.hasAttribute('data-loading')) seen.loading++; });
    mo.observe(btn(s), { attributes: true });
    btn(s).click();
    await sleep(120);
    n.noCap = { ...state(btn(s)), flashes: seen.loading };
    r.noCap = asks(s) === 0 && !!s.d.querySelector('.c-modal') && seen.loading === 0 && atRest(btn(s));
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; } finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true, n: n[k] } : { [k]: r[k], threw: r.threw, n }).slice(0, 1200));
  c('wait', '★ S20 G (#1379): App details — the Install tap asks once (ixian:moment:app:<id>) and the button is in the loading morph at once (data-loading, aria-busy, disabled — a second tap does not ask again)');
  c('sheet', '★ S20 G: C#\'s yes → the moment sheet shows and the button is at rest again; the sheet\'s Install sends ixian:install and runs the install morph');
  c('refused', '★ S20 G: C# refuses → the install confirm modal and the button at rest');
  c('late', '★ S20 G: no answer → loading through the wait (1.2 s in), then at ASK_WAIT_MS the modal with the button at rest');
  c('noCap', '★ S20 G: no moments cap → the modal at once and the button never enters the morph (no flash)');
  c('noErr', '★ S20 G: no page error');
}
