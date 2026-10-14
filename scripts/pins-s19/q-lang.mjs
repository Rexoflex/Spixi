/* ==== S19 F4 (MO-LANG = once per language per SESSION, Damir 2026-10-12 S18 walk), P28 · flag S17Moments ====
 * The decision is C#'s; its pure parts (decide / why / takesSession / exemptFromSession / langEligible / SessionLangs) are
 * EXECUTED by csh (S17MomentTests.Lang_OncePerLanguagePerSession_ExemptAndNeverTakesTheSession + the re-based AskLine test).
 *   (a) BUILT settings.html: a pending language asks `ixian:moment:lang:<code>` even in a push whose session is TAKEN (the
 *       shell never holds the language back — C# answers, and it now grants in a taken session); C#'s yes shows the sheet;
 *       a SECOND language in the same document asks again (`lang:fr-fr`); a push with no pending language asks nothing.
 *   (b) C# glue (reached only by source): SMoments reads and writes the language's "seen" through the in-memory
 *       sessionLangs ONLY — never `moments.langs` (no SLocalOnlyStore write of KeyLangs anywhere; the one remaining
 *       KeyLangs use is the dev reset's remove of an S17 / S18 value); pushJson's pending language is filtered by
 *       sessionLangs; the eligibility is S17MomentRules.langEligible (Settings, the pending code, never English); the
 *       session bit and the home push follow takesSession (false for lang); the dev reset clears sessionLangs; the rules
 *       file exempts lang from the session + card rule in decide AND why (the log line's why), and the csh test exists.
 *   (c) ★ #46 S19 N2 — the SHELL's session bit (the built bundle's createMomentClient, a fake bridge): a yes to `lang`
 *       does NOT take the session (sessionTaken() stays false, like firstixi — C#'s takesSession), a yes to `mic` does
 *       (the control). Break: the `&& id !== 'lang'` test removed from moment-sheet.js answer() → (c) shellSession fails.
 * Deliberate breaks (S19 Q report): markSeen writing moments.langs again → (b) noStore; isSeen reading moments.langs →
 * (b) memory; decide back to `id != "firstixi"` → (b) rules (+ csh fails); the reset without sessionLangs.clear() →
 * (b) reset; the moment client refusing an ask in a taken session (moment-sheet.js) → (a) takenAsks. */
import { aKit } from '../pins-s11/a-kit.mjs';

export default async function (h) {
  const { ok, sleep, readFileSync, join, root, stripCode } = h;
  const K = aKit(h);
  const rd = (p) => readFileSync(join(root, p), 'utf8');

  const a = {};
  let s = null;
  try {
    s = await K.boot('settings.html', { wait: 1500 });
    const { push, sent, d } = s;
    const asks = (n0) => sent.slice(n0).filter((c) => /^ixian:moment:/.test(c)).join();
    push('setCaps', 'moments');
    push('setLocale', 'de-de');
    await sleep(100);
    let n0 = sent.length;
    /* a moment already took the session (e.g. Pay) — the language still asks */
    push('setMoments', JSON.stringify({ seen: ['pay'], apps: [], lang: 'de-de', session: true, sessionMs: 3600000 }));
    await sleep(800);
    a.takenAsks = asks(n0) === 'ixian:moment:lang:de-de';
    push('momentAnswer', 'lang', 'de-de', '1', '');
    await sleep(900);
    const lg = d.querySelector('.c-moment__sheet[data-moment="lang"]');
    a.shows = !!lg;
    if (lg) lg.querySelector('.c-button[data-value="ok"]').click();
    await sleep(700);
    /* a second language in the same session asks once too */
    push('setLocale', 'fr-fr');
    await sleep(100);
    n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: ['pay'], apps: [], lang: 'fr-fr', session: true, sessionMs: 3500000 }));
    await sleep(800);
    a.secondLang = asks(n0) === 'ixian:moment:lang:fr-fr';
    push('momentAnswer', 'lang', 'fr-fr', '0', '');
    await sleep(100);
    /* C# sends no pending language for a language already shown this session (or English) → no ask */
    n0 = sent.length;
    push('setMoments', JSON.stringify({ seen: ['pay'], apps: [], lang: '', session: true, sessionMs: 3400000 }));
    await sleep(800);
    a.noPending = asks(n0) === '';
  } catch (e) { a.threw = e.message; } finally { if (s) s.close(); }
  ok(Object.keys(a).length === 4 && Object.values(a).every((v) => v === true),
    '★ S19 F4 (MO-LANG): the BUILT settings.html asks the pending language even in a TAKEN session (C# now grants it there), shows the sheet on yes, asks a second language once too, and asks nothing without a pending language — ' + JSON.stringify(a));

  /* —— (c) ★ #46 S19 N2: the shell's session bit follows C#'s takesSession (lang / firstixi never take it) —— */
  const cs = {};
  try {
    s = await K.boot('settings.html', { wait: 1200 });
    const Sp = s.W.Spixi;
    const mk = () => {
      const sentV = [];
      const cl = Sp.createMomentClient({ bridge: { send: (v) => sentV.push(v), cap: () => true } });
      cl.setState(JSON.stringify({ seen: [], apps: [], lang: 'de-de', session: false, sessionMs: 0 }));
      return { cl, sentV };
    };
    const yes = async (id, arg) => {
      const { cl, sentV } = mk();
      let shown = false;
      cl.ask(id, arg, () => { shown = true; }, null, { late: true });
      cl.answer(id, arg, '1', '');
      await sleep(20);
      return { asked: sentV.join(), shown, taken: cl.sessionTaken() };
    };
    cs.lang = await yes('lang', 'de-de');
    cs.mic = await yes('mic', '');
    cs.firstixi = await yes('firstixi', '');
    cs.shellSession = cs.lang.asked === 'ixian:moment:lang:de-de' && cs.lang.shown && cs.lang.taken === false
      && cs.mic.shown && cs.mic.taken === true && cs.firstixi.shown && cs.firstixi.taken === false;
  } catch (e) { cs.threw = e.message; } finally { if (s) s.close(); }
  ok(cs.shellSession === true,
    '★ #46 S19 N2 (MO-LANG): the shell\'s moment client does NOT set its session bit on a lang yes (C# no longer gives lang the session) — like firstixi; a mic yes still takes it — ' + JSON.stringify(cs));

  const b = {};
  try {
    const SM = stripCode(rd('Spixi/Meta/SMoments.cs'));
    const RU = stripCode(rd('Spixi/Utils/S17MomentRules.cs'));
    const body = (src, head, next) => { const i = src.indexOf(head); const j = next ? src.indexOf(next, i + 1) : -1; return i < 0 ? '' : src.slice(i, j > i ? j : undefined); };
    const isSeen = body(SM, 'private static bool isSeen(', 'private static void markSeen(');
    const markSeen = body(SM, 'private static void markSeen(', null);
    const reset = body(SM, 'public static void resetForDev()', 'private static bool isSeen(');
    const pj = body(SM, 'public static string pushJson(', 'public static void pushTo(');
    const ans = body(SM, 'private static async Task answerAsync(', 'private static async Task<S17MomentRules.Eligible> micEligible()');
    b.memory = /if \(id == "lang"\) return sessionLangs\.has\(arg, nowMs\(\)\);/.test(isSeen)
      && /if \(id == "lang"\)\s*\{\s*sessionLangs\.add\(arg, nowMs\(\)\);\s*\}/.test(markSeen)
      && /private static readonly S17MomentRules\.SessionLangs sessionLangs = new S17MomentRules\.SessionLangs\(\);/.test(SM);
    /* moments.langs is never written; its one use left is the reset's remove */
    const keyLangsUses = (SM.match(/S17MomentRules\.KeyLangs/g) || []).length;
    b.noStore = keyLangsUses === 1 && /stored &= SLocalOnlyStore\.remove\(S17MomentRules\.KeyLangs\);/.test(reset)
      && !/SLocalOnlyStore\.(set|setDeferred)\([^;]*KeyLangs/.test(SM);
    b.push = /\(!chat && !details && pendingLang\.Length > 0 && !sessionLangs\.has\(pendingLang, nowMs\(\)\)\) \? pendingLang : ""/.test(pj) && !/KeyLangs/.test(pj);
    b.eligible = /case "lang":\s*eligible = S17MomentRules\.langEligible\(page is SettingsPage, arg, pendingLang\);\s*break;/.test(ans)
      && /public static Eligible langEligible\(bool onSettings, string\? arg, string\? pendingLang\) =>\s*onSettings && isLangCode\(arg\) && !isEnglish\(arg!\) && string\.Equals\(arg, pendingLang, StringComparison\.Ordinal\)/.test(RU);
    /* the session bit and the home push follow takesSession — never taken by lang */
    /* ★ re-based by S20 S (#1379 G): takesSession(id, atInstall) — lang is still never taking it (exemptFromSession(id) below) */
    b.session = (ans.match(/S17MomentRules\.takesSession\(id, atInstall\)/g) || []).length === 2
      && /if \(S17MomentRules\.takesSession\(id, atInstall\)\)\s*\{\s*sessionMoment = true;\s*startSession\(\);\s*\}/.test(ans);
    b.reset = /sessionLangs\.clear\(\);/.test(reset) && /pendingLang = "";/.test(reset);
    b.rules = /public static bool exemptFromSession\(string id\) => id == "firstixi" \|\| id == "lang";/.test(RU)
      && /public static bool takesSession\(string id\) => !exemptFromSession\(id\);/.test(RU)
      /* ★ re-based by S20 S (#1379 G): the 6-argument decide / why read exemptFromSession(id, installMoment), which keeps lang */
      && /if \(!exemptFromSession\(id, installMoment\) && \(sessionMoment \|\| sessionCard\)\) return Decision\.Refuse;/.test(RU)
      && /if \(!exemptFromSession\(id, installMoment\)\)\s*\{\s*if \(sessionMoment\) return Why\.Session;\s*if \(sessionCard\) return Why\.Card;/.test(RU)
      && /public static bool exemptFromSession\(string id, bool installMoment\) => exemptFromSession\(id\) \|\| \(installMoment && id == "app"\);/.test(RU)
      && !/id != "firstixi"/.test(RU);
    b.csh = /public void Lang_OncePerLanguagePerSession_ExemptAndNeverTakesTheSession\(\)/.test(rd('scripts/csh/S17MomentTests.cs'));
  } catch (e) { b.threw = e.message; }
  ok(Object.keys(b).length === 8 && Object.values(b).every((v) => v === true),
    '★ S19 F4 (MO-LANG, P28): C# — the language is seen once per SESSION in memory (sessionLangs: isSeen / markSeen / the push filter), moments.langs is never written (only the dev reset removes an old value), the eligibility is langEligible (Settings, the pending code, never English), lang never takes the session (the session bit and the home push follow takesSession), the dev reset clears the set, and decide / why exempt lang like firstixi (csh executes it) — ' + JSON.stringify(b));
}
