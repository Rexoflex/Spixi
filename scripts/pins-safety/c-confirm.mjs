/* ==== Session Safety — lane C: native confirms (S-5, m168, P35) + the safety dev switches (P33–P37 dev surface) ====
 * The pure rules run in scripts/csh/SafetyRulesTests.cs (dialogName, confirmLine, needsConfirm, devFlagsArg, the [FLAGS] line).
 * This module pins the MAUI-bound call sites (comment-stripped C#, brace-matched bodies, ORDER) and runs the BUILT shells:
 *   CHAT    — SingleChatPage kick / ban / leave: flag ON → confirmMemberAction / confirmLeave; OFF → the old calls; the action
 *             runs only AFTER `await SConfirm.askAsync` answered true; kick / ban parse the address in a try BEFORE the dialog;
 *   INFO    — ContactDetails removecontact / removehistory / leave / kick / ban: the same split; confirmThen awaits the dialog
 *             first, a Cancel answers the verb's EXISTING result push with SafetyRules.CancelledStatus (removecontact ·
 *             removehistory · leave), kick / ban push nothing;
 *   HOME    — Safety Dials q1 = A (D5 as told to BE): HomePage's removecontact / removehistory / leavegroup have NO native step;
 *   SCONF   — one dialog app-wide (the ConfirmGate token first, released in finally; no clock), the 4-argument displaySpixiAlert (OK + Cancel), the
 *             only log lines = SafetyRules.confirmLine + a type-name warn;
 *   SHELL   — the built contact_details.html: removeContactResult(<a>, "cancelled") shows NO toast; "fail" still does (control);
 *   STRINGS — the four new keys in all 14 lang files ({0} in both titles); every legacy key SConfirm reads exists in all 14;
 *   DEV     — dev.html setFlagsDevSafety: six switches named = SafetyRules.DevSwitchNames, a click sends
 *             ixian:devflash:<name>:<0|1>, a malformed push is ignored; DevPage maps the six names to the six keys in order and
 *             pushes setFlagsDevSafety after setFlagsDevV1.
 * Deliberate breaks: the mutation sets C1–C19, R2M1–R2M8, R4a–c, R5a–c (docs/review-brief-safety.md §5) — all caught. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join, sleep } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const blockFrom = (t, at) => {
    if (at < 0) return '';
    const o = t.indexOf('{', at); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const body = (t, sig) => blockFrom(t, t.indexOf(sig));
  const before = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const F = (v) => Object.entries(v).filter(([, x]) => !x).map(([k]) => k);

  /* ── CHAT: SingleChatPage ── */
  const SC = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  const kick = body(SC, 'else if (current_url.StartsWith("ixian:kick:"))');
  const ban = body(SC, 'else if (current_url.StartsWith("ixian:ban:"))');
  const leave = body(SC, 'else if(current_url.Equals("ixian:leave", StringComparison.Ordinal))');
  const cma = body(SC, 'private async void confirmMemberAction(SafetyRules.ConfirmVerb verb, string str_address)');
  const cl = body(SC, 'private async void confirmLeave()');
  const chat = {
    found: !!(kick && ban && leave && cma && cl),
    kickSplit: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.Kick\)\)\s*\{\s*confirmMemberAction\(SafetyRules\.ConfirmVerb\.Kick, str_address\);\s*\}\s*else\s*\{\s*Address address = new Address\(str_address\);\s*onKickUser\(address\);\s*\}/.test(kick),
    banSplit: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.Ban\)\)\s*\{\s*confirmMemberAction\(SafetyRules\.ConfirmVerb\.Ban, str_address\);\s*\}\s*else\s*\{\s*Address address = new Address\(current_url\.Substring\("ixian:ban:"\.Length\)\);\s*onBanUser\(address\);\s*\}/.test(ban),
    leaveSplit: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.Leave\)\)\s*\{\s*confirmLeave\(\);\s*\}\s*else\s*\{\s*leaveRoomNow\(\);\s*\}/.test(leave)
      && !/SContacts\.leaveGroup/.test(leave),
    parseFirst: before(cma, 'address = new Address(str_address);', 'SConfirm.askAsync(') && /catch \(Exception ex\)\s*\{\s*Logging\.warn\(SafetyRules\.verbWord\(verb\) \+ ": invalid address payload: " \+ ex\.GetType\(\)\.Name\);\s*return;\s*\}/.test(cma),
    awaitThenAct: /if \(!await SConfirm\.askAsync\(this, verb, t\.title, t\.text, t\.ok\)\)\s*\{\s*return;\s*\}\s*if \(verb == SafetyRules\.ConfirmVerb\.Kick\)\s*\{\s*onKickUser\(address\);/.test(cma),
    leaveAfter: /if \(!await SConfirm\.askAsync\(this, SafetyRules\.ConfirmVerb\.Leave, t\.title, t\.text, t\.ok\)\)\s*\{\s*return;\s*\}\s*leaveRoomNow\(\);/.test(cl),
    leaveBody: /SContacts\.leaveGroup\(friend\)/.test(body(SC, 'private void leaveRoomNow()')),
    /* the only action calls sit AFTER the dialog (C2: an action moved above the await is caught here) */
    actAfterOnly: ['onKickUser(', 'onBanUser('].every((c) => (cma.match(new RegExp(c.replace('(', '\\('), 'g')) || []).length === 1 && cma.indexOf(c) > cma.indexOf('SConfirm.askAsync('))
      && (cl.match(/leaveRoomNow\(\)/g) || []).length === 1 && cl.indexOf('leaveRoomNow()') > cl.indexOf('SConfirm.askAsync('),
    /* ★ #46 r2 (n-1): the peer-timed bot-not-ready alert goes through the counted / dropped displaySpixiAlert with the flag ON */
    botAlert: /if \(SpixiFlags\.NativeConfirm\)\s*\{\s*_ = displaySpixiAlert\(SpixiLocalization\._SL\("chat-bot-not-ready-title"\), SpixiLocalization\._SL\("chat-bot-not-ready-body"\), SpixiLocalization\._SL\("global-dialog-ok"\)\);\s*\}\s*else\s*\{\s*Microsoft\.Maui\.Controls\.Application\.Current\?\.MainPage\?\.DisplayAlert\(/.test(SC)
      && (SC.match(/\.DisplayAlert\(/g) || []).length === 1,
    onlyCallers: (SC.match(/\bleaveRoomNow\(\)/g) || []).length === 3 && (SC.match(/\bconfirmMemberAction\(/g) || []).length === 3,
  };
  ok(F(chat).length === 0, '★ Safety S-5 chat: kick / ban / leave confirm natively with the flag ON (the action only after `await SConfirm.askAsync` is true; kick / ban parse the address in a try BEFORE the dialog); OFF = the old calls — ' + JSON.stringify(chat));

  /* ── INFO: ContactDetails ── */
  const CD = rd('Spixi/Pages/Contacts/ContactDetails.xaml.cs');
  const rc = body(CD, 'else if (current_url.StartsWith("ixian:removecontact:", StringComparison.Ordinal))');
  const rh = body(CD, 'else if (current_url.Equals("ixian:removehistory", StringComparison.Ordinal))');
  const lv = body(CD, 'else if (current_url.Equals("ixian:leave", StringComparison.Ordinal))');
  const ki = body(CD, 'else if (current_url.StartsWith("ixian:kick:"))');
  const bn = body(CD, 'else if (current_url.StartsWith("ixian:ban:"))');
  const ct = body(CD, 'private async void confirmThen(');
  const split = (b, verb, push, act, offCall) => new RegExp('if \\(SafetyRules\\.needsConfirm\\(SpixiFlags\\.NativeConfirm, SafetyRules\\.ConfirmVerb\\.' + verb + '\\)\\)\\s*\\{\\s*confirmThen\\(SafetyRules\\.ConfirmVerb\\.' + verb + ', ' + push + ', ' + act + '\\);\\s*\\}\\s*else\\s*\\{\\s*' + offCall + ';\\s*\\}').test(b);
  const info = {
    found: !!(rc && rh && lv && ki && bn && ct),
    /* ★ #46 r2 (m-4): with the leave flag the native text names the shared-group count */
    removecontact: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.RemoveContact\)\)\s*\{\s*int alsoLeave = 0;\s*if \(leaveArg == "1" && !friend\.bot && friend\.type != FriendType\.Group\)\s*\{\s*try \{ alsoLeave = SContacts\.sharedGroups\(friend\)\.Count \/ 2; \} catch \(Exception\) \{ alsoLeave = 0; \}\s*\}\s*confirmThen\(SafetyRules\.ConfirmVerb\.RemoveContact, "removeContactResult", \(\) => removeContactNow\(leaveArg\), alsoLeaveGroups: alsoLeave\);\s*\}\s*else\s*\{\s*removeContactNow\(leaveArg\);\s*\}/.test(rc)
      && !/SContacts\.removeContact/.test(rc) && /var t = SConfirm\.textsFor\(verb, who, fallback \?\? friend\.walletAddress\.ToString\(\), alsoLeaveGroups\);/.test(ct),
    removehistory: split(rh, 'RemoveHistory', '"removeHistoryResult"', 'onRemoveHistory', 'onRemoveHistory\\(\\)'),
    leave: split(lv, 'Leave', '"leaveGroupResult"', 'leaveRoomNow', 'leaveRoomNow\\(\\)') && !/SContacts\.leaveGroup/.test(lv),
    kick: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.Kick\)\)\s*\{\s*confirmMember\(SafetyRules\.ConfirmVerb\.Kick, kickArg, \(\) => kickNow\(kickArg\)\);\s*\}\s*else\s*\{\s*kickNow\(kickArg\);\s*\}/.test(ki) && !/sendBotAction/.test(ki),
    ban: /if \(SafetyRules\.needsConfirm\(SpixiFlags\.NativeConfirm, SafetyRules\.ConfirmVerb\.Ban\)\)\s*\{\s*confirmMember\(SafetyRules\.ConfirmVerb\.Ban, banArg, \(\) => banNow\(banArg\)\);\s*\}\s*else\s*\{\s*banNow\(banArg\);\s*\}/.test(bn) && !/sendBotAction/.test(bn),
    /* ★ #46 r1 (R2 MAJOR-1 / MINOR-1): the member address is parsed BEFORE any dialog (a malformed payload = the fixed warn,
       no dialog); the dialog fallback is the PARSED address; a Cancel re-sends the roster */
    memberParseFirst: (() => { const cm = body(CD, 'private void confirmMember(SafetyRules.ConfirmVerb verb, string strAddress, Action act)');
      return /a = new Address\(strAddress\);\s*\}\s*catch \(Exception ex\)\s*\{\s*Logging\.warn\(SafetyRules\.verbWord\(verb\) \+ ": invalid address payload: " \+ ex\.GetType\(\)\.Name\);\s*return;\s*\}/.test(cm)
        && before(cm, 'a = new Address(strAddress);', 'confirmThen(') && /confirmThen\(verb, null, act, nick, a\.ToString\(\), \(\) =>\s*\{\s*if \(friend\.users != null && !isDisposed\)\s*\{\s*loadMembers\(Utils\.hidesParticipants\(friend\)\);/.test(cm); })(),
    awaitFirst: before(ct, 'await SConfirm.askAsync(', 'act();') && /if \(!await SConfirm\.askAsync\(this, verb, t\.title, t\.text, t\.ok\)\)\s*\{\s*if \(cancelPush != null\)\s*\{\s*try \{ Utils\.sendUiCommand\(this, cancelPush, friend\.walletAddress\.ToString\(\), SafetyRules\.CancelledStatus\); \} catch \(Exception\) \{ \}\s*\}\s*if \(onCancel != null\)\s*\{\s*try \{ onCancel\(\); \} catch \(Exception\) \{ \}\s*\}\s*return;\s*\}\s*act\(\);/.test(ct),

    bodies: /SContacts\.removeContact\(friend, leaveShared, out removeBlockers\)/.test(body(CD, 'private void removeContactNow(string leaveArg)'))
      && /SContacts\.leaveGroup\(friend\)/.test(body(CD, 'private void leaveRoomNow()'))
      && /SpixiBotActionCode\.kickUser/.test(body(CD, 'private void kickNow(string verbArg)'))
      && /SpixiBotActionCode\.banUser/.test(body(CD, 'private void banNow(string verbArg)')),
    actOnce: (ct.match(/\bact\(\)/g) || []).length === 1 && ct.indexOf('act()') > ct.indexOf('SConfirm.askAsync('),
    catchType: /catch \(Exception ex\)\s*\{\s*Logging\.error\("\[CONFIRM\] " \+ SafetyRules\.verbWord\(verb\) \+ " failed \(" \+ ex\.GetType\(\)\.Name \+ "\)"\);/.test(ct),
  };
  ok(F(info).length === 0, '★ Safety S-5 chat info: removecontact / removehistory / leave / kick / ban confirm natively with the flag ON (confirmThen awaits the dialog BEFORE act; a Cancel answers the verb\'s existing result push with "cancelled"; kick / ban push nothing); OFF = the moved bodies at once — ' + JSON.stringify(info));

  /* ── HOME: q1 = A (D5) ── */
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const homeBranches = ['current_url.StartsWith("ixian:removehistory:", StringComparison.Ordinal)', 'current_url.StartsWith("ixian:removecontact:", StringComparison.Ordinal)', 'current_url.StartsWith("ixian:leavegroup:", StringComparison.Ordinal)'].map((s) => body(HP, s));
  const home = { found: homeBranches.every((b) => b.length > 0), noConfirm: homeBranches.every((b) => !/SConfirm|needsConfirm|NativeConfirm/.test(b)) && !/SConfirm\./.test(HP) };
  ok(F(home).length === 0, '★ Safety S-5 home (Safety Dials q1 = A, BE sheet D5 as written): HomePage\'s removecontact / removehistory / leavegroup keep the page sheet only — no native step — ' + JSON.stringify(home));

  /* ── SCONF ── */
  const SF = rd('Spixi/Utils/SConfirm.cs');
  const ask = body(SF, 'public static async Task<bool> askAsync(');
  const logs = [...SF.matchAll(/Logging\.(info|warn|error)\(([^;]*)\);/g)].map((m) => m[2]);
  const sconf = {
    /* ★ #46 r2: the gate is the pure ConfirmGate (executed in csh ConfirmGateTests); askAsync takes a token first, refuses on 0 */
    gateFirst: /^\{\s*long token = gate\.tryEnter\(\);\s*if \(token == 0\)\s*\{\s*Logging\.info\(SafetyRules\.confirmLine\(verb, "busy"\)\);\s*return false;\s*\}/.test(ask)
      && /private static readonly ConfirmGate gate = new ConfirmGate\(\);/.test(SF) && /public static bool isOpen => gate\.isOpen;/.test(SF)
      && /public static long tryNoteAlertOpened\(\) => gate\.tryAlertOpened\(\);/.test(SF) && /public static void noteAlertClosed\(long token\) => gate\.alertClosed\(token\);/.test(SF)
      && !/TickCount|BoundMs|DateTime|Stopwatch/.test(rd('Spixi/Utils/ConfirmGate.cs')) && !/BoundMs|isOpen\(Environment/.test(SF),   // ★ #46 r3 MAJOR-1: the gate has no clock (fail closed)
    oneReset: (ask.match(/gate\.exit\(token\)/g) || []).length === 1 && /finally\s*\{\s*gate\.exit\(token\);\s*\}/.test(ask) && !/Interlocked/.test(SF),
    returnsAnswer: /Logging\.info\(SafetyRules\.confirmLine\(verb, yes \? "ok" : "cancel"\)\);\s*return yes;\s*\}$/.test(ask) && (ask.match(/return true/g) || []).length === 0
      && !/yes = true/.test(ask) && /yes = dialog != null && await dialog;/.test(ask),
    okCancel: /page\.displaySpixiAlert\(title, text, ok, SpixiLocalization\._SL\("global-dialog-cancel"\), true\)/.test(ask),
    /* ★ #46 r1/r2 (R2 MINOR-2, r2 m-3): the lock is checked BEFORE the dialog and AFTER it (a yes after the lock came up = no) */
    refusesOverOthers: /if \(lockUp\(\)\)\s*\{\s*Logging\.info\(SafetyRules\.confirmLine\(verb, "busy"\)\);\s*return false;\s*\}/.test(ask) && before(ask, 'if (lockUp())', 'page.displaySpixiAlert(') && /yes = dialog != null && await dialog;\s*if \(yes && lockUp\(\)\)\s*\{\s*yes = false;/.test(ask)
      && /private static bool lockUp\(\) => \(Application\.Current as global::Spixi\.App\)\?\.isAppLockActive == true;/.test(SF),
    logsFixed: (() => { const L = [...SF.matchAll(/Logging\.(info|warn|error)\(([^;]*)\);/g)].map((m) => m[2]);
      return L.length === 5 && L.every((a) => /^SafetyRules\.confirmLine\(verb, (?:"busy"|"fast"|yes \? "ok" : "cancel")\)$/.test(a) || a === '"[CONFIRM] the dialog failed (" + ex.GetType().Name + ")"'); })(),
    /* ★ #46 r4 (MINOR-1): an OK faster than SafetyRules.MinConfirmMs after the ask = Cancel (a timed double tap) */
    tooFast: /long asked = Environment\.TickCount64;\s*Task<bool>\? dialog = page\.displaySpixiAlert\(/.test(ask)
      && /if \(yes && SafetyRules\.tooFast\(Environment\.TickCount64 - asked\)\)\s*\{[^}]*Logging\.info\(SafetyRules\.confirmLine\(verb, "fast"\)\);\s*return false;\s*\}/.test(ask)
      && before(ask, 'SafetyRules.tooFast(', 'finally'),
    textsPure: /SafetyRules\.confirmTexts\(verb, name, fallback, SpixiLocalization\._SL, alsoLeaveGroups\)/.test(SF) && !/string\.Format/.test(SF),
  };
  /* ★ #46 r1 (R2 MAJOR-2): SpixiContentPage.displaySpixiAlert — every OTHER alert is dropped while a confirm is up and
     counted while it is up (both overloads); the confirm's own call passes nativeConfirm = true */
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const a4 = body(SCP, 'public Task<bool> displaySpixiAlert(string title, string message, string ok, string cancel, bool nativeConfirm = false)');
  const a3 = body(SCP, 'public Task displaySpixiAlert(string title, string message, string cancel)');
  sconf.alertGate4 = /if \(!nativeConfirm && SpixiFlags\.NativeConfirm\)\s*\{\s*counted = SConfirm\.tryNoteAlertOpened\(\);[^\n]*\n\s*if \(counted == 0\)\s*\{\s*Logging\.warn\("\[CONFIRM\] an alert was dropped while a confirm is up"\);\s*tcs\.TrySetResult\(false\);\s*return;\s*\}\s*\}/.test(a4)
    && before(a4, 'counted = SConfirm.tryNoteAlertOpened();', 'await alertHost.DisplayAlert(') && /finally\s*\{\s*if \(counted != 0\) SConfirm\.noteAlertClosed\(counted\);\s*\}/.test(a4)
    /* ★ #46 r4 (NIT-5): ONLY SConfirm skips the gate (nativeConfirm = true) */
    && (() => { const hits = []; const walk = (d) => { for (const n of readdirSync(join(root, d), { withFileTypes: true })) { if (n.name === 'obj' || n.name === 'bin') continue; const q = d + '/' + n.name; if (n.isDirectory()) walk(q); else if (q.endsWith('.cs')) { const t = rd(q); if (/displaySpixiAlert\([^;]*,\s*true\)/.test(t) || /nativeConfirm:\s*true/.test(t)) hits.push(q); } } }; walk('Spixi'); return hits.join(',') === 'Spixi/Utils/SConfirm.cs'; })();
  sconf.alertGate3 = /long counted = SpixiFlags\.NativeConfirm \? SConfirm\.tryNoteAlertOpened\(\) : 0;[^\n]*\n\s*if \(SpixiFlags\.NativeConfirm && counted == 0\)\s*\{\s*Logging\.warn\("\[CONFIRM\] an alert was dropped while a confirm is up"\);\s*tcs\.TrySetResult\(Task\.CompletedTask\);\s*return;\s*\}/.test(a3)
    && before(a3, 'SConfirm.tryNoteAlertOpened()', 'alertHost.DisplayAlert(')
    && /long token = counted;\s*if \(result == null\)\s*\{\s*SConfirm\.noteAlertClosed\(token\);[^\n]*\n\s*\}\s*else\s*\{\s*result\.ContinueWith\(\(_\) => SConfirm\.noteAlertClosed\(token\), TaskScheduler\.Default\);\s*\}/.test(a3)
    /* ★ #46 r6 (NIT-1): ONE regex from the drop's return to the token block — nothing that can throw sits outside the try */
    && /tcs\.TrySetResult\(Task\.CompletedTask\);\s*return;\s*\}\s*Task result;\s*try\s*\{\s*Page alertHost = \(Application\.Current\?\.MainPage\) \?\? \(Page\)this;\s*result = alertHost\.DisplayAlert\(title, message, cancel\);\s*\}\s*catch \(Exception\)\s*\{\s*if \(counted != 0\) SConfirm\.noteAlertClosed\(counted\);[^\n]*\n\s*throw;\s*\}\s*if \(counted != 0\)\s*\{\s*long token = counted;/.test(a3);   // ★ #46 r2 (m-2)
  ok(F(sconf).length === 0, '★ Safety S-5 SConfirm: one native dialog app-wide (the ConfirmGate token first, released in finally; no time bound), an OK under 600 ms = Cancel, OK + Cancel through displaySpixiAlert\'s 4-argument form, only fixed log lines, the name through SafetyRules.dialogName — ' + JSON.stringify(sconf));

  /* ── STRINGS ── */
  const langDir = 'Spixi/Resources/Raw/lang';
  const langs = readdirSync(join(root, langDir)).filter((f) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(f));
  const need = ['safety-confirm-removecontact-title', 'safety-confirm-removecontact-leave', 'safety-confirm-leave-title', 'safety-confirm-leave-text', 'contact-details-delete-contact-modal-subtitle',
    'contact-details-delete-contact-modal-confirm', 'contact-details-delete-history-modal-title', 'contact-details-delete-history-modal-subtitle',
    'contact-details-delete-history-modal-confirm', 'chat-bot-leave', 'chat-modal-kick-title', 'chat-modal-kick-body', 'chat-modal-kick-kick-button',
    'chat-modal-ban-title', 'chat-modal-ban-body', 'chat-modal-ban-ban-button', 'global-dialog-cancel'];
  const missing = [];
  for (const f of langs) {
    const t = raw(langDir + '/' + f);
    for (const k of need) {
      const m = new RegExp('^' + k + ' = (.+)$', 'm').exec(t);
      if (!m || !m[1].trim()) missing.push(f + ':' + k);
      else if (/-title$/.test(k) && k.startsWith('safety-') && !m[1].includes('{0}')) missing.push(f + ':' + k + '(no {0})');
    }
    if (/\b(money|anonymous)\b/i.test((t.match(/^safety-.*$/gm) || []).join('\n'))) missing.push(f + ':claims');
  }
  ok(langs.length === 14 && missing.length === 0, '★ Safety S-5 strings: the four new safety-confirm keys in all 14 lang files (titles keep {0}), every legacy key SConfirm reads present in all 14, no claims word — ' + JSON.stringify({ langs: langs.length, missing }));

  /* ── SHELL: contact_details.html, built ── */
  const { boot } = b2Kit(h);
  const shell = {};
  let s = null;
  try {
    s = await boot('contact_details.html', { wait: 1200 });
    const { d, push } = s;
    const toasts = () => d.querySelectorAll('.c-toast').length;
    const t0 = toasts();
    push('removeContactResult', 'AAAA', 'cancelled');
    await sleep(250);
    shell.cancelNoToast = toasts() === t0;
    /* ★ #46 r1 (R3 mutation 4): "cancelled" never reaches the ok / left branch (which wipes the peer's local data) */
    const CDH = raw('src/shells/contact_details.html');
    shell.cancelBranch = /if \(st === 'ok' \|\| st === 'left'\) \{ forgetPeerStorage\(addr, 'contact'\); return; \}\s*\/\/[^\n]*\n\s*if \(st === 'cancelled'\) return;/.test(CDH);
    push('removeContactResult', 'AAAA', 'fail');
    await sleep(250);
    shell.failToast = toasts() > t0;
    shell.errs = s.errs.length === 0;
  } catch (e) {
    shell.threw = String(e && e.message);
  } finally {
    if (s) { try { s.dom.window.close(); } catch (_) {} }
  }
  ok(shell.cancelNoToast === true && shell.failToast === true && shell.cancelBranch === true && !shell.threw, '★ Safety S-5 shell (built contact_details.html): removeContactResult "cancelled" shows NO toast (the user said Cancel in the native dialog); "fail" still shows one (control) — ' + JSON.stringify(shell));

  /* ── DEV: the six switches ── */
  const RULES = rd('Spixi/Utils/SafetyRules.cs');
  const namesM = /DevSwitchNames = \{ ([^}]*) \};/.exec(RULES);
  const NAMES = namesM ? [...namesM[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const ssk = body(DP, 'private static bool safetySwitchKey(string url, out string key, out string tail)');
  const pf = body(DP, 'private void pushFlagsDev()');
  const dev = {
    names: NAMES.join(',') === 'safeappid,safestorage,safepick,nativeconfirm,historylock,winappmarker',
    keysOrder: /string\[\] keys = \{ SpixiFlags\.SafeAppIdKey, SpixiFlags\.SafeStorageKey, SpixiFlags\.SafePickKey,\s*SpixiFlags\.NativeConfirmKey, SpixiFlags\.HistoryLockKey, SpixiFlags\.WinAppMarkerKey \};/.test(ssk),
    devModeGate: /if \(Preferences\.Default\.Get\("devMode", false\) && S16PassRules\.parseFlagTail\(safetyTail, out int value\)\)\s*\{\s*Preferences\.Default\.Set\(safetyKey, value\);\s*\}/.test(body(DP, 'else if (safetySwitchKey(current_url, out string safetyKey, out string safetyTail))')),
    pushAfterV1: before(pf, '"window.setFlagsDevV1"', '"window.setFlagsDevSafety", SafetyRules.devFlagsArg(xi, xs, xp, xc, xh, xw)'),
  };
  try {
    s = await boot('dev.html', { wait: 1000 });
    const { d, push, sent } = s;
    push('setFlagsDev', '1,1,1,1');
    push('setFlagsDevSafety', '1,0,1,1,1,1');
    await sleep(200);
    const sw = [...d.querySelectorAll('.c-dev-flags [data-flag]')].map((b) => b.dataset.flag);
    dev.rows = NAMES.every((n) => sw.includes(n));
    const st = d.querySelector('.c-dev-flags [data-flag="safestorage"]');
    dev.state = !!st && st.getAttribute('aria-checked') === 'false';
    const nc = d.querySelector('.c-dev-flags [data-flag="nativeconfirm"]');
    const n0 = sent.length;
    if (nc) nc.click();
    await sleep(50);
    dev.click = sent.slice(n0).includes('ixian:devflash:nativeconfirm:0');
    push('setFlagsDevSafety', '1,1,1');
    await sleep(150);
    const st2 = d.querySelector('.c-dev-flags [data-flag="safestorage"]');
    dev.malformedIgnored = !!st2 && st2.getAttribute('aria-checked') === 'false';
  } catch (e) {
    dev.threw = String(e && e.message);
  } finally {
    if (s) { try { s.dom.window.close(); } catch (_) {} }
  }
  ok(F(dev).length === 0 && !dev.threw, '★ Safety dev surface: dev.html shows the six safety switches (names = SafetyRules.DevSwitchNames, state from setFlagsDevSafety, a malformed push ignored), a click sends ixian:devflash:<name>:<0|1>; DevPage maps the names to the six SpixiFlags keys in order, stores only in dev mode, and pushes setFlagsDevSafety after setFlagsDevV1 — ' + JSON.stringify(dev));
}
