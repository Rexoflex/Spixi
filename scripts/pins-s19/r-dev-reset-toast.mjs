/* ==== S19 F8 (#1371, Damir S18 walk: Developer › Reset moment sheets gave no sign it worked — he tapped it 10× in 1.5 s) ====
 * On the BUILT dev.html (jsdom, the clock PINNED — aKit `now`), through the real pushes (setFlagsDev 4 digits, then the cap):
 *   · a tap sends EXACTLY `ixian:devmoments:reset` and shows ONE toast (role=status) whose text is the dictionary's
 *     devResetMomentsDone "Reset sent. Restart the app." in the INFO tone (#46 S19 security N2 re-base: the toast shows before
 *     C# acts, so it claims no success — was "Moment sheets reset. Restart the app.", tone success);
 *   · taps inside the next second are IGNORED — no second verb, no second toast — also after a flags push REMOUNTS the card
 *     (the window lives on the module, not the button);
 *   · after the second, a tap acts again (one more verb);
 *   · the toast is STYLED: the built dev.html carries the .c-toast rule (toast.css linked — the #314 lesson);
 *   · devResetMomentsDone is a DEV string: English in en-us and in every locale JSON (the #301 rule).
 * Deliberate breaks (S19 F8 report): the quiet test removed (quiet fails) · the showToast call removed (toast fails) · the
 * toast.css link removed (styled fails) · #46 S19 N2: the old text back in dev.html's fallback → toast fails; tone 'success'
 * back → toast fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
const VERB = 'ixian:devmoments:reset';
export default async function (h) {
  const { ok, sleep, readFileSync, readdirSync, join, root } = h;
  const K = aKit(h);
  const EN = 'Reset sent. Restart the app.';
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('dev.html', { wait: 1400, now: Date.UTC(2026, 9, 12, 21, 0, 0) });
    const { d, W } = s;
    s.push('setFlagsDev', '1,1,1,1');
    s.push('setCaps', 'devmoments');
    await sleep(60);
    const row = () => d.querySelector('.c-dev-flags [data-dev-reset="moments"]');
    const toasts = () => [...d.querySelectorAll('.c-toast')];
    const b0 = s.sent.length;
    row().click();
    await sleep(40);
    n.first = s.sent.slice(b0);
    const t = toasts();
    r.toast = JSON.stringify(n.first) === JSON.stringify([VERB]) && t.length === 1 && t[0].getAttribute('role') === 'status'
      && (t[0].querySelector('.c-toast__text') || {}).textContent === EN && t[0].getAttribute('data-tone') === 'info';
    /* inside the quiet window: three more taps over 900 ms + a remount */
    for (let i = 0; i < 3; i++) { s.clock.add(300); row().click(); await sleep(20); }
    s.push('setFlagsDev', '1,1,1,1');
    await sleep(40);
    row().click();
    await sleep(40);
    n.quiet = { sent: s.sent.slice(b0), toasts: toasts().length };
    r.quiet = JSON.stringify(n.quiet.sent) === JSON.stringify([VERB]) && n.quiet.toasts === 1;
    s.clock.add(200);   // 1100 ms after the first tap
    row().click();
    await sleep(40);
    n.after = s.sent.slice(b0);
    r.after = JSON.stringify(n.after) === JSON.stringify([VERB, VERB]);
    /* styled: the built document carries the toast rule */
    let styled = false;
    const walk = (list) => { for (const x of list) { if (x.selectorText && /(^|,)\s*\.c-toast\s*(,|$)/.test(x.selectorText) && x.style.getPropertyValue('position')) styled = true; else if (x.cssRules) walk(x.cssRules); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* */ } }
    r.styled = styled;
    r.noErr = K.noErr(s.errs) && !s.errs.some((x) => /ReferenceError|TypeError/.test(x));
    void W;
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  /* the dev string stays English everywhere (#301) — EXCEPT sq-al (re-based S19 on #1368): Albanian is DRAFT_FIRST and
     translates its dev strings (its devResetMoments is Albanian), so its Done line is Albanian too, never empty / English */
  const dir = join(root, 'src/strings');
  const locs = readdirSync(dir).filter((f) => /^[a-z]{2}-[a-z]{2}\.json$/.test(f));
  n.locales = locs.length;
  const val = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).devResetMomentsDone;
  const bad = locs.filter((f) => f !== 'sq-al.json' && val(f) !== EN);
  const sq = locs.includes('sq-al.json') ? val('sq-al.json') : null;
  if (!(typeof sq === 'string' && sq && sq !== EN)) bad.push('sq-al.json');
  r.english = locs.length === 14 && bad.length === 0;
  n.badLocales = bad;
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }));
  c('toast', '★ S19 F8 (#1371): a tap on Reset moment sheets sends exactly `' + VERB + '` and shows ONE status toast "' + EN + '" (info tone: sent, not confirmed — #46 S19 N2)');
  c('quiet', '★ S19 F8: taps inside the next second (3 more + one after a flags push remounted the card) send nothing and toast nothing');
  c('after', '★ S19 F8: after the second a tap acts again (one more verb)');
  c('styled', '★ S19 F8: the built dev.html carries the .c-toast rule (toast.css linked — an unstyled toast renders in document flow, #314)');
  c('english', '★ S19 F8: devResetMomentsDone is a dev string — English in en-us and every locale JSON (#301), Albanian in sq-al (#1368)');
  c('noErr', '★ S19 F8: no page error');
}
