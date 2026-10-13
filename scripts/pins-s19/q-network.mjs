/* ==== S19 F6 (AA-LINK network reason, Damir 2026-10-12 S18 walk) ====
 * The classifier (no HTTP status = DNS / connection / TLS / a platform handler's failure → `network`; a status or a
 * server-side protocol fault → `http`) is PURE and EXECUTED by csh (S19FetchTests — real HttpRequestException shapes).
 *   (a) BUILT index.html (Apps › Add app, the in-shell takeover) and BUILT app_new.html: showUrlError('network') shows the
 *       appFetchTimeout line ("…Check your connection and try again."); 'http' keeps appFetchHttp; 'timeout' keeps its line.
 *   (b) C# (reached only by source): MiniAppManager's HttpRequestException catch returns S19FetchRules.isNetworkFailure(
 *       status, HttpRequestError) ? Network : Http; fetchFailureName(Network) = "network" (the word the shells map); NO log
 *       call in fetchWithReason reads e.Message (it can hold the host name) — the type name + the reason word only.
 * Deliberate breaks (S19 Q report): home's mapping without `network` → (a) home; app_new's → (a) app_new; the catch
 * always returning Http → (b) classify; the Network case removed from fetchFailureName → (b) word; the catch logging
 * e.Message again → (b) noMessage. csh: isNetworkFailure returning false for Unknown → S19FetchTests fails. */
import { aKit } from '../pins-s11/a-kit.mjs';

const TIMEOUT = 'The link did not respond. Check your connection and try again.';
const HTTP = 'The app could not be downloaded from that link.';

export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const K = aKit(h);
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const enUS = JSON.parse(rd('src/strings/en-us.json'));
  const errText = (add) => { const e = add && add.querySelector('.c-apps-add__error'); return e && !e.hidden ? (e.textContent || '').trim() : ''; };

  const a = {};
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1400 });
    const { d, W, push } = s;
    const nav = d.querySelector('.c-bottomnav__item[data-id="apps"]');
    if (nav) nav.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(60);
    const act = [...d.querySelectorAll('#apps-topbar button')].find((b) => /Add app/.test(b.textContent || ''));
    if (act) act.click();
    await sleep(120);
    const add = d.querySelector('.wallet-takeover .c-apps-add');
    const seen = {};
    for (const r of ['network', 'http', 'timeout']) { push('showUrlError', r); await sleep(30); seen[r] = errText(add); }
    a.home = enUS.appFetchTimeout === TIMEOUT && enUS.appFetchHttp === HTTP
      && seen.network === TIMEOUT && seen.http === HTTP && seen.timeout === TIMEOUT;
  } catch (e) { a.homeThrew = e.message; } finally { if (s) s.close(); }
  try {
    s = await K.boot('app_new.html', { wait: 1400 });
    const { d, push } = s;
    const add = d.querySelector('#add-scroll .c-apps-add');
    const seen = {};
    for (const r of ['network', 'http', 'timeout']) { push('showUrlError', r); await sleep(30); seen[r] = errText(add); }
    a.app_new = seen.network === TIMEOUT && seen.http === HTTP && seen.timeout === TIMEOUT;
  } catch (e) { a.appNewThrew = e.message; } finally { if (s) s.close(); }
  ok(Object.keys(a).length === 2 && Object.values(a).every((v) => v === true),
    '★ S19 F6 (AA-LINK): the BUILT home (Add app takeover) and app_new show the "Check your connection" line (appFetchTimeout) for the reason `network`; `http` and `timeout` keep their lines — ' + JSON.stringify(a));

  const b = {};
  try {
    const MAM = stripCode(rd('Spixi/MiniApps/MiniAppManager.cs'));
    const i = MAM.indexOf('public async Task<(MiniApp? app, FetchFailure failure)> fetchWithReason(');
    const fwr = i < 0 ? '' : MAM.slice(i, MAM.indexOf('public async Task<string?> installFromUrlAsync(', i));
    const hre = fwr.slice(fwr.indexOf('catch (HttpRequestException e)'), fwr.indexOf('catch (Exception e)'));
    b.classify = /FetchFailure f = S19FetchRules\.isNetworkFailure\(e\.StatusCode\.HasValue \? \(int\)e\.StatusCode\.Value : \(int\?\)null, e\.HttpRequestError\)\s*\? FetchFailure\.Network : FetchFailure\.Http;/.test(hre)
      && /return \(null, f\);/.test(hre) && !/FetchFailure\.Http\)/.test(hre.replace(/\? FetchFailure\.Network : FetchFailure\.Http;/, ''));
    b.word = /case FetchFailure\.Network: return "network";/.test(MAM) && /public enum FetchFailure \{ None, Url, Http, Size, Timeout, Invalid, Error, Network \}/.test(MAM);
    const logs = [...fwr.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
    b.noMessage = fwr.length > 0 && logs.length >= 4 && logs.every((x) => !/\.Message\b/.test(x))
      && /Logging\.error\("App fetch failed: " \+ e\.GetType\(\)\.Name \+ " " \+ fetchFailureName\(f\)\);/.test(hre);
    b.csh = /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S19FetchRules\.cs" \/>/.test(rd('scripts/csh/csh.csproj'))
      && /public void NoStatus_IsNetwork_AStatusIsHttp\(\)/.test(rd('scripts/csh/S19FetchTests.cs'));
  } catch (e) { b.threw = e.message; }
  ok(Object.keys(b).length === 4 && Object.values(b).every((v) => v === true),
    '★ S19 F6 (AA-LINK): C# — the HttpRequestException catch returns Network when no HTTP status came back (S19FetchRules, csh-executed) and Http otherwise; fetchFailureName says "network"; no fetchWithReason log line reads e.Message (type + reason word only, tighter than base) — ' + JSON.stringify(b));
}
