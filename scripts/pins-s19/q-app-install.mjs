/* ==== S19 F5 (MO-APP at Install, Damir 2026-10-12 S18 walk) — the app moment on App details, P28 · flag S17Moments ====
 * On the BUILT app_details.html (jsdom, pushes via executeUiCommand, ixian: verbs captured at the href setter):
 *   (a) INSTALL — ★ #46 S19 M4 re-base: ONE question before the install. The Install button → `ixian:moment:app:<id>` FIRST
 *       (no install confirm modal, no `ixian:install` yet); C#'s yes → the app moment sheet REPLACES the confirm: title
 *       "Before you install {app}" (momentAppInstallTitle), the app moment body (momentAppBody), the capability rows C#
 *       answered, the fill button = the Install label; its tap sends `ixian:install` (once) and NO .c-modal opens at any
 *       point (oneDialog). Cancel instead → nothing sent, no modal, the Install button is not loading. When the moment does
 *       NOT show the component's install confirm runs as before (fallback): no answer within ASK_WAIT_MS, C# refused ("0"),
 *       the moment seen (setMoments apps), no `moments` cap (an older exe, the flag OFF) → the confirm modal, and only its
 *       Install sends `ixian:install`. de-de: the sheet title is the de-de draft.
 *   (b) OPEN: an installed, never-opened app — the Open pill asks `app:<id>` first; yes → "Before you open {app}", its
 *       fill sends `ixian:startApp:<id>`; the next tap goes straight on (seen by the same id, no second ask).
 *   (c) C# (reached only by source): AppDetailsPage pushes setCaps "moments" + SMoments.pushTo AFTER init, flag-gated; the
 *       host test admits AppDetailsPage; SMoments refuses anything but `app:<the page's own app id>` from it
 *       (S17MomentRules.appDetailsAsk — executed by csh AppDetails_AsksOnlyItsOwnAppMoment), takes the caps from the page's
 *       own app (momentApp: the INSTALLED app first, #46 S19 MINOR-1; id re-checked), and pushes it an empty seen list,
 *       its own app id only and no language; after a URL install whose installed app differs from the fetched appinfo
 *       (S17MomentRules.installedDiffers, csh AppDetails_InstalledDiffers_UnmarksTheFetchedId) SMoments.unmarkApp drops
 *       that id from moments.apps (validated, fixed log line).
 * Deliberate breaks (S19 Q report; #46 S19 M4 re-based): app_details.html not passing beforeInstall (the modal first,
 * then the moment — the double ask) → (a) askFirst + oneDialog fail; momentBeforeAction ignoring `otherwise` (no sheet =
 * install at once, no confirm) → (a) fallback fails; the install strings override dropped → (a) sheetCopy fails;
 * onLaunch calling launch() directly → (b) openAsks fails; the shell's setCaps handler removed → (a) askFirst fails; the
 * appDetailsAsk filter removed from SMoments.handleVerb → (c) ownOnly fails; the onLoad setCaps push removed → (c)
 * capPush fails; momentApp back to fetched-first → (c) momentApp fails; the post-install unmark removed → (c) unmark fails. */
import { aKit } from '../pins-s11/a-kit.mjs';

const ID = 'com.ixian.chess';
const NAME = 'Chess';

export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const K = aKit(h);
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const enUS = JSON.parse(rd('src/strings/en-us.json'));
  const deDE = JSON.parse(rd('src/strings/de-de.json'));
  const STATE = (apps = []) => JSON.stringify({ seen: [], apps, lang: '', session: false });

  /* boot the built page with one app; caps / state optional */
  const bootApp = async ({ installed = false, caps = 'moments', apps = [], lang = '' } = {}) => {
    const s = await K.boot('app_details.html', { wait: 1400, html: lang ? (t) => t.split('*SL{language-code}').join(lang) : null });
    s.push('init', NAME, '', 'Ixian', 'A chess game.', '1.0', 'https://apps.example.org/chess/appinfo.spixi', '120 KB',
      'multiUser,storage', ID, 'False', 'True', installed ? 'True' : 'False', 'False', 'True');
    if (caps) s.push('setCaps', caps);
    if (caps) s.push('setMoments', STATE(apps));
    await sleep(80);
    return s;
  };
  const moVerbs = (s) => s.sent.filter((c) => /^ixian:moment:/.test(c));
  const installs = (s) => s.sent.filter((c) => c === 'ixian:install').length;
  const installBtn = (s) => s.d.querySelector('.c-app-details__actions .c-button');
  /* ★ #46 S19 M4: the Install CTA alone (the moment comes first) · the install confirm modal's own Install (the fallback) */
  const tapInstall = async (s) => {
    const b = installBtn(s);
    if (b) b.click();
    await sleep(120);
  };
  const modalOf = (s) => s.d.querySelector('.c-modal');
  const confirmModal = async (s) => {
    const modal = modalOf(s);
    const label = (s.W.SL && s.W.SL.install) || enUS.install || 'Install';   // the page's own locale
    const act = modal && [...modal.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === label);
    if (act) act.click();
    await sleep(80);
    return !!act;
  };
  /* every .c-modal that ever enters the document (a MutationObserver — a modal that opens and closes still counts) */
  const watchModals = (s) => {
    const seen = { n: 0 };
    const mo = new s.W.MutationObserver((recs) => { for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1 && (n.matches('.c-modal') || n.querySelector('.c-modal'))) seen.n++; });
    mo.observe(s.d.body, { childList: true, subtree: true });
    return seen;
  };
  const sheetOf = (s) => s.d.querySelector('.c-moment__sheet[data-moment="app"]');
  const sheetCopy = (sh) => sh ? {
    title: (sh.querySelector('.c-moment__title') || {}).textContent,
    body: (sh.querySelector('.c-moment__body') || {}).textContent,
    caps: [...sh.querySelectorAll('.c-moment__cap')].map((li) => li.dataset.cap).join(','),
    fill: ((sh.querySelector('.c-button[data-value="open"]') || {}).textContent || '').trim(),
  } : null;

  const a = {};
  /* —— (a) INSTALL —— */
  let s = null;
  try {
    s = await bootApp();
    const modals = watchModals(s);
    await tapInstall(s);
    a.askFirst = moVerbs(s).join() === 'ixian:moment:app:' + ID && installs(s) === 0 && !modalOf(s);
    s.push('momentAnswer', 'app', ID, '1', 'MultiUser,Storage');
    await sleep(120);
    const c = sheetCopy(sheetOf(s));
    a.sheetCopy = !!c && enUS.momentAppInstallTitle === 'Before you install {app}' && c.title === 'Before you install ' + NAME
      && c.body === enUS.momentAppBody && c.caps === 'Storage,MultiUser' && c.fill === (enUS.install || 'Install') && installs(s) === 0;
    const fill = sheetOf(s) && sheetOf(s).querySelector('.c-button[data-value="open"]');
    if (fill) fill.click();
    await sleep(500);
    a.installGoes = installs(s) === 1 && !!installBtn(s) && installBtn(s).hasAttribute('data-loading');   // straight into the install morph
    a.oneDialog = modals.n === 0 && !modalOf(s);   // ★ #46 S19 M4: the moment REPLACED the confirm — never two questions
  } catch (e) { a.threwInstall = e.message; } finally { if (s) s.close(); }

  /* Cancel → nothing sent, no modal, the button is not loading (it never entered the morph) */
  try {
    s = await bootApp();
    const modals = watchModals(s);
    await tapInstall(s);
    s.push('momentAnswer', 'app', ID, '1', 'Storage');
    await sleep(120);
    const cancel = sheetOf(s) && sheetOf(s).querySelector('.c-button[data-value="dismiss"]');
    if (cancel) cancel.click();
    await sleep(600);
    const b = installBtn(s);
    a.cancel = !!cancel && installs(s) === 0 && !!b && !b.hasAttribute('data-loading') && !b.disabled
      && modals.n === 0 && !modalOf(s) && !sheetOf(s);
  } catch (e) { a.threwCancel = e.message; } finally { if (s) s.close(); }

  /* ★ #46 S19 M4 — the FALLBACK: no sheet → today's install confirm, and only ITS Install sends ixian:install.
     no answer within ASK_WAIT_MS (a late yes shows nothing) · C# refused · seen (same app id, no ask) · no cap (no ask) */
  const fb = {};
  try {
    s = await bootApp();
    await tapInstall(s);
    await sleep(1700);
    s.push('momentAnswer', 'app', ID, '1', '');
    await sleep(100);
    fb.noAnswer = moVerbs(s).length === 1 && installs(s) === 0 && !!modalOf(s) && !sheetOf(s) && (await confirmModal(s)) && installs(s) === 1;
    s.close();
    s = await bootApp();
    await tapInstall(s);
    s.push('momentAnswer', 'app', ID, '0', '');
    await sleep(120);
    fb.refused = moVerbs(s).length === 1 && installs(s) === 0 && !!modalOf(s) && !sheetOf(s) && (await confirmModal(s)) && installs(s) === 1;
    s.close();
    s = await bootApp({ apps: [ID] });
    await tapInstall(s);
    fb.seen = moVerbs(s).length === 0 && installs(s) === 0 && !!modalOf(s) && (await confirmModal(s)) && installs(s) === 1;
    s.close();
    s = await bootApp({ caps: '' });
    await tapInstall(s);
    fb.noCap = moVerbs(s).length === 0 && installs(s) === 0 && !!modalOf(s) && (await confirmModal(s)) && installs(s) === 1;
  } catch (e) { fb.threw = e.message; } finally { if (s) s.close(); }
  a.fallback = Object.keys(fb).length === 4 && Object.values(fb).every((v) => v === true) ? true : fb;

  /* de-de: the title is the draft, {app} filled */
  try {
    s = await bootApp({ lang: 'de-de' });
    await tapInstall(s);
    s.push('momentAnswer', 'app', ID, '1', '');
    await sleep(120);
    const c = sheetCopy(sheetOf(s));
    a.deDE = !!c && deDE.momentAppInstallTitle === 'Bevor du {app} installierst' && c.title === 'Bevor du ' + NAME + ' installierst';
  } catch (e) { a.threwDe = e.message; } finally { if (s) s.close(); }

  /* —— (b) OPEN — an installed app never opened —— */
  try {
    s = await bootApp({ installed: true });
    const pill = s.d.querySelector('.c-app-details__openpill');
    if (pill) pill.click();
    await sleep(60);
    a.openAsks = moVerbs(s).join() === 'ixian:moment:app:' + ID && !s.sent.some((c) => /^ixian:startApp/.test(c));
    s.push('momentAnswer', 'app', ID, '1', 'MultiUser');
    await sleep(120);
    const c = sheetCopy(sheetOf(s));
    a.openSheet = !!c && c.title === 'Before you open ' + NAME && c.fill === (enUS.open || 'Open');
    const fill = sheetOf(s) && sheetOf(s).querySelector('.c-button[data-value="open"]');
    if (fill) fill.click();
    await sleep(500);
    const starts = () => s.sent.filter((x) => x === 'ixian:startAppMulti:' + ID).length;
    const first = starts();
    const pill2 = s.d.querySelector('.c-app-details__openpill');
    if (pill2) pill2.click();
    await sleep(60);
    a.openOnce = first === 1 && starts() === 2 && moVerbs(s).length === 1;   // seen by the same id: no second ask
  } catch (e) { a.threwOpen = e.message; } finally { if (s) s.close(); }

  ok(Object.keys(a).length === 10 && Object.values(a).every((v) => v === true),
    '★ S19 F5 (MO-APP at Install, P28) + #46 S19 M4: the BUILT app_details — the Install button asks `ixian:moment:app:<id>` FIRST (no confirm modal, no `ixian:install`); a yes shows "Before you install {app}" (momentAppInstallTitle, de-de draft too) with the app moment body + the answered capability rows and an Install fill that sends ixian:install once — and NO modal ever opens (one question); Cancel sends nothing, no modal; when no sheet shows (no answer / refused / seen / no cap) the install confirm runs as before and only its Install sends ixian:install; the Open pill of a never-opened app asks first ("Before you open {app}") and the next tap goes straight on — ' + JSON.stringify(a));

  /* —— (c) C#, by source (the logic is csh) —— */
  const c = {};
  try {
    const ADP = stripCode(rd('Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs'));
    const SM = stripCode(rd('Spixi/Meta/SMoments.cs'));
    const SCP = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
    const RU = stripCode(rd('Spixi/Utils/S17MomentRules.cs'));
    const onLoad = ADP.slice(ADP.indexOf('private void onLoad()'), ADP.indexOf('private void onInstall()'));
    c.capPush = onLoad.indexOf('"init"') > 0
      && /if \(SpixiFlags\.S17Moments\)\s*\{\s*Utils\.sendUiCommand\(this, "setCaps", "moments"\);\s*SMoments\.pushTo\(this\);\s*\}/.test(onLoad)
      && onLoad.indexOf('"setCaps", "moments"') > onLoad.indexOf('"init"');
    /* ★ #46 S19 MINOR-1: the INSTALLED app first (Open launches it), the fetched appinfo only when nothing is installed */
    c.momentApp = /public MiniApp\? momentApp\s*\{\s*get\s*\{\s*return Node\.MiniAppManager\?\.getApp\(selectedAppId\) \?\? fetchedApp;\s*\}\s*\}/.test(ADP);
    /* ★ #46 S19 MINOR-1 (b): after a URL install, an installed app that differs from the fetched appinfo loses its seen mark */
    const inst = ADP.slice(ADP.indexOf('private void onInstall()'), ADP.indexOf('private void onUninstall()'));
    const um = SM.slice(SM.indexOf('public static void unmarkApp('), SM.indexOf('private static bool isSeen('));
    c.unmark = /installFromUrlAsync\(fetchedApp\);[\s\S]*?if \(app_name != null\)\s*\{[\s\S]*?MiniApp\? installed = fetchedApp\.id != null \? Node\.MiniAppManager\.getApp\(fetchedApp\.id\) : null;\s*if \(S17MomentRules\.installedDiffers\(fetchedApp\.id, capNames\(fetchedApp\), installed\?\.id, capNames\(installed\)\)\)\s*\{\s*SMoments\.unmarkApp\(fetchedApp\.id\);/.test(inst)
      && inst.indexOf('unmarkApp') < inst.indexOf('showInstallSuccess')
      && /if \(!SpixiFlags\.S17Moments \|\| !S17MomentRules\.isAppId\(appId\)\) return;/.test(um)
      && /SLocalOnlyStore\.setDeferred\(S17MomentRules\.KeyApps, S17MomentRules\.removeFromList\(SLocalOnlyStore\.get\(S17MomentRules\.KeyApps\), appId!, S17MomentRules\.isAppId\)\);/.test(um)
      && /Logging\.info\("\[MO\] app moment: the installed app differs, asks again"\);/.test(um)
      && /public void AppDetails_InstalledDiffers_UnmarksTheFetchedId\(\)/.test(rd('scripts/csh/S17MomentTests.cs'));
    c.host = /this is ContactDetails \|\| this is AppDetailsPage\)\)\s*\{\s*SMoments\.handleVerb\(this, url\);/.test(SCP);
    const hv = SM.slice(SM.indexOf('public static bool handleVerb('), SM.indexOf('private static async Task answerAsync('));
    c.ownOnly = /if \(page is AppDetailsPage details && !S17MomentRules\.appDetailsAsk\(id, arg, details\.selectedAppId\)\) return true;/.test(hv)
      && hv.indexOf('appDetailsAsk') > hv.indexOf('parseAsk') && hv.indexOf('appDetailsAsk') < hv.indexOf('answerAsync(page, id, arg)')
      && /public static bool appDetailsAsk\(string\? id, string\? arg, string\? pageAppId\) =>\s*id == "app" && isAppId\(pageAppId\) && string\.Equals\(arg, pageAppId, StringComparison\.Ordinal\);/.test(RU);
    const ans = SM.slice(SM.indexOf('case "app":'), SM.indexOf('case "pay":'));
    c.caps = /if \(page is AppDetailsPage details\)\s*\{\s*app = details\.momentApp;\s*if \(app != null && !string\.Equals\(app\.id, arg, StringComparison\.Ordinal\)\) app = null;/.test(ans)
      && /!\(page is HomePage \|\| page is SingleChatPage \|\| page is AppDetailsPage\)/.test(ans);
    const pj = SM.slice(SM.indexOf('public static string pushJson('), SM.indexOf('public static void pushTo('));
    c.pushOwn = /else if \(details\)\s*\{\s*string own = \(\(AppDetailsPage\)page!\)\.selectedAppId;\s*seen = new List<string>\(\);\s*apps = apps\.Where\(x => string\.Equals\(x, own, StringComparison\.Ordinal\)\)\.ToList\(\);/.test(pj)
      && /\(!chat && !details && pendingLang\.Length > 0/.test(pj);
    c.csh = /public void AppDetails_AsksOnlyItsOwnAppMoment\(\)/.test(rd('scripts/csh/S17MomentTests.cs'));
  } catch (e) { c.threw = e.message; }
  ok(Object.keys(c).length === 8 && Object.values(c).every((v) => v === true),
    '★ S19 F5 (P28): C# — AppDetailsPage declares the `moments` cap and pushes setMoments after init (flag-gated); the host test admits App details; SMoments refuses everything from it but `app:<its own app id>` (appDetailsAsk, csh) before the answer, takes the caps from the page\'s own app — the INSTALLED app first (#46 S19 MINOR-1) — with the id re-checked, and pushes it no seen ids, only its own app id, no language; after a URL install an installed app that differs (id / caps, installedDiffers, csh) is unmarked (unmarkApp: validated id, fixed log line) — ' + JSON.stringify(c));
}
