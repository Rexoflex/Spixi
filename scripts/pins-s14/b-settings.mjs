/* ==== S14 B — Settings: #1284 the tab hand-off is ONE verb · #1285 the About / How-to links send a fixed id ====
 * #1284 MECHANISM: a tab tap sent `ixian:landtab:<id>` then `ixian:handoff` (or `apply:` + `handoff`) one macrotask
 * apart; on the new phone the FIRST navigation never reached ShouldOverrideUrlLoading (a later renderer navigation
 * superseded it) → no land, the pane closed on the 400 ms backstop. Now `ixian:landtab:<id>[:<nick>]` = land + hand-off.
 * #1285 (security OURS-OPEN row 16): the rows send `ixian:aboutLink:<id>`; C# maps the id to its own Config URL; the
 * SettingsPage `ixian:openLink:` branch is deleted.
 * BEHAVIOUR on the BUILT settings.html (jsdom, the commands captured at the Location href setter = what the WebView
 * would navigate, after the outbox drained); the C# landtab body is SLICED and EXECUTED as JS (the GATE 30 model);
 * the rest of the C# (MAUI-bound) is source.
 * Deliberate breaks: see the S14 B report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, sleep } = h;
  const K = aKit(h);
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const CAPS = 'settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications,ignoredRequests';
  const r = {};
  let s = null;
  const close = () => { if (s) { try { s.close(); } catch (e) {} s = null; } };
  const navBtn = (id) => s.d.querySelector('#settings-nav .c-bottomnav__item[data-id="' + id + '"]');
  const lockSw = () => [...s.d.querySelectorAll('.c-settings__switch')].find((n) => /App lock/.test(n.getAttribute('aria-label') || ''));
  const verbs = (from) => s.sent.slice(from).filter((c) => /^ixian:/.test(c));
  const fresh = async (caps, nick) => {
    close();
    s = await K.boot('settings.html');
    s.push('setCaps', caps);
    s.push('setNickname', nick);
    s.push('setLockEnabled', 'False');
    await sleep(200);
  };
  try {
    /* ① a clean tab tap = exactly ONE ixian: command, the landtab verb (no handoff / back behind it) */
    await fresh(CAPS, 'Damir');
    let b0 = s.sent.length;
    const w = navBtn('wallet');
    if (w) w.click();
    await sleep(300);
    r.tabOne = !!w && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:landtab:wallet']);
    /* a second tap while the exit is in flight sends nothing at all (the exitSent latch now guards the land too) */
    b0 = s.sent.length;
    const a2 = navBtn('apps');
    if (a2) a2.click();
    await sleep(200);
    r.secondTapSilent = !!a2 && verbs(b0).length === 0;

    /* ② dirty (App lock toggled; the nick holds ':') → the nick RIDES the one verb, after the id's ':' */
    await fresh(CAPS, 'Da:mir');
    const lk = lockSw();
    if (lk) lk.click();
    await sleep(60);
    b0 = s.sent.length;
    const c = navBtn('chats');
    if (c) c.click();
    await sleep(300);
    r.dirtyRides = !!lk && !!c && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:landtab:chats:Da:mir']);

    /* ③ Account › Contacts = the same ONE verb */
    await fresh(CAPS, 'Damir');
    const ct = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Contacts/.test(x.textContent || ''));
    b0 = s.sent.length;
    if (ct) ct.click();
    await sleep(300);
    r.contactsOne = !!ct && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:landtab:contacts']);

    /* ④ #46 r1 MIN-1: an exe WITHOUT settingsApply (e.g. before setCaps arrives) sends the SAME one verb — the old
       second send (`handoff` / `save:`) ran SettingsPage's exit twice (avatar-tmp deleted before the save) */
    await fresh('backupInline,downloadsInline,encpass,encpassInline', 'Damir');
    b0 = s.sent.length;
    const w2 = navBtn('wallet');
    if (w2) w2.click();
    await sleep(300);
    const legacyClean = verbs(b0);
    await fresh('backupInline,downloadsInline,encpass,encpassInline', 'Damir');
    const lk2 = lockSw();
    if (lk2) lk2.click();
    await sleep(60);
    b0 = s.sent.length;
    const w3 = navBtn('wallet');
    if (w3) w3.click();
    await sleep(300);
    r.noCapOneVerb = JSON.stringify(legacyClean) === JSON.stringify(['ixian:landtab:wallet'])
      && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:landtab:wallet:Damir']);

    /* ⑨ #46 r1 MAJ-1: the nick editor is open, the user taps an exit — the input BLURS first (autoSave sends
       `ixian:apply:<nick>`, dirty cleared), the exit follows; #1284 may lose that FIRST navigation, so the LAST
       verb must carry the nick (tab / Contacts row → landtab:<id>:<nick>; hardware back → save:<nick>) */
    const NICK = 'Al:ice+1';
    const editNick = async () => {
      await fresh(CAPS, 'Bob');
      const pen = s.d.querySelector('.c-settings__nick-edit');
      if (pen) pen.click();
      await sleep(40);
      const inp = s.d.querySelector('.c-settings__nick-input');
      if (inp) inp.value = NICK;
      return !!pen && !!inp;
    };
    const blurTap = async (target) => {
      const b = s.sent.length;
      if (target) { target.focus(); target.click(); }
      await sleep(300);
      return verbs(b);
    };
    let okEd = await editNick();
    const tabSeq = await blurTap(navBtn('wallet'));
    okEd = okEd && await editNick();
    const ctRow = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Contacts/.test(x.textContent || ''));
    const ctSeq = await blurTap(ctRow);
    okEd = okEd && await editNick();
    b0 = s.sent.length;
    const inp3 = s.d.querySelector('.c-settings__nick-input');
    if (inp3) inp3.blur();
    s.push('onBack');
    await sleep(300);
    const backSeq = verbs(b0);
    r.blurCarries = okEd && !!ctRow && !!inp3
      && JSON.stringify(tabSeq) === JSON.stringify(['ixian:apply:' + NICK, 'ixian:landtab:wallet:' + NICK])
      && JSON.stringify(ctSeq) === JSON.stringify(['ixian:apply:' + NICK, 'ixian:landtab:contacts:' + NICK])
      && JSON.stringify(backSeq) === JSON.stringify(['ixian:apply:' + NICK, 'ixian:save:' + NICK]);
    /* the carry is bounded: an apply older than the window, and no edit at all, leave the plain verbs */
    await editNick();
    const inp4 = s.d.querySelector('.c-settings__nick-input');
    if (inp4) inp4.blur();
    await sleep(1200);
    b0 = s.sent.length;
    navBtn('wallet').click();
    await sleep(300);
    const staleSeq = verbs(b0);
    await fresh(CAPS, 'Bob');
    b0 = s.sent.length;
    s.push('onBack');
    await sleep(300);
    r.carryBounded = !!inp4 && JSON.stringify(staleSeq) === JSON.stringify(['ixian:landtab:wallet'])
      && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:back']);

    /* ⑤ #1285 About › Links + How to use › Help Center: each row emits ixian:aboutLink:<id>, never a URL */
    await fresh(CAPS, 'Damir');
    const row = (label) => [...s.d.querySelectorAll('button.c-settings__row')].find((x) => new RegExp('^\\s*' + label).test(x.textContent || ''));
    const ab = row('About');
    if (ab) ab.click();
    await sleep(250);
    const links = [...s.d.querySelectorAll('.c-settings-about button.c-settings-links__row')].filter((x) => x.querySelector('.c-settings-links__label') && /Website|Ixian network|Source code/.test(x.textContent));
    b0 = s.sent.length;
    links.forEach((x) => x.click());
    await sleep(200);
    const aboutSent = verbs(b0);
    close();
    await fresh(CAPS, 'Damir');
    const ht = row('How to use');
    if (ht) ht.click();
    await sleep(250);
    const help = [...s.d.querySelectorAll('.c-settings-howto button.c-settings-links__row')].find((x) => /Help Center/.test(x.textContent));
    b0 = s.sent.length;
    if (help) help.click();
    await sleep(200);
    r.aboutLinkIds = links.length === 3 && !!help
      && JSON.stringify(aboutSent) === JSON.stringify(['ixian:aboutLink:website', 'ixian:aboutLink:network', 'ixian:aboutLink:source'])
      && JSON.stringify(verbs(b0)) === JSON.stringify(['ixian:aboutLink:help']);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = String(e && e.stack || e).slice(0, 300); }
  finally { close(); }

  /* ⑥ no `ixian:openLink` anywhere in the built settings shell (code OR comment) */
  const built = rd('Spixi/Resources/Raw/html/settings.html');
  r.noOpenLinkShell = !/ixian:openLink/.test(built) && !/ixian:openLink/.test(rd('src/shells/settings.html'));

  /* ⑦ C# landtab: the branch body is SLICED by brace match, transliterated, and EXECUTED */
  const SP = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
  const sliceBody = (src, head) => {
    const at = src.indexOf(head);
    if (at < 0) return '';
    const open = src.indexOf('{', at + head.length);
    let d = 0;
    for (let k = open; k < src.length; k++) {
      if (src[k] === '{') d++;
      else if (src[k] === '}' && --d === 0) return src.slice(open + 1, k);
    }
    return '';
  };
  const landBody = sliceBody(SP, 'else if (current_url.StartsWith("ixian:landtab:", StringComparison.Ordinal))');
  const js = landBody
    .replace(/HomePage\.InstanceOrNull\(\)\?\.landOnTab\(/g, 'HP.landOnTab(')
    .replace(/\.Substring\(/g, '.__sub(').replace(/\.IndexOf\(/g, '.indexOf(').replace(/\.Length\b/g, '.length')
    .replace(/\bstring /g, 'let ').replace(/\bint /g, 'let ')
    .replace(/("[^"]*"|\b\w+)\.__sub\(/g, '__sub($1, ');
  const RESIDUE = /\.Substring\(|\.IndexOf\(|StringComparison|\bstring\b|\bint\b|\?\.|Logging|=>/;
  const HP_SRC = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const ids = ((HP_SRC.match(/LAND_TAB_IDS = \{([^}]*)\}/) || [])[1] || '').match(/"([a-z]+)"/g);
  const LAND = (ids || []).map((x) => x.slice(1, -1));
  const landM = sliceBody(HP_SRC, 'public void landOnTab(string id)');
  r.landGuard = JSON.stringify(LAND) === JSON.stringify(['chats', 'wallet', 'apps', 'contacts'])
    && /if \(id == null \|\| Array\.IndexOf\(LAND_TAB_IDS, id\) < 0\)\s*\{\s*Logging\.warn\("landOnTab: unknown tab id \(other\) — ignored"\);\s*return;\s*\}\s*Utils\.sendUiCommand\(this, "landOnTab", id\);/.test(landM);
  let run = null;
  const __sub = (x, a, b) => (b === undefined ? String(x).slice(a) : String(x).slice(a, a + b));
  if (landBody.length > 50 && !RESIDUE.test(js)) {
    try {
      const fn = new Function('current_url', 'HP', 'saveSettingsCore', 'exitCleanup', '__sub', 'claimExit', js);
      run = (url, claim = () => true, log = []) => {
        fn(url, { landOnTab: (id) => log.push(LAND.includes(id) ? 'land:' + id : 'other') }, (n) => log.push('save:' + n), (d) => log.push('exit:' + d), __sub, claim);
        return log.join('|');
      };
    } catch (e) { run = null; }
  }
  try {
    r.csParse = !!run
      && run('ixian:landtab:wallet') === 'land:wallet|exit:true'                     // clean: land, then the hand-off
      && run('ixian:landtab:chats:Damir') === 'land:chats|save:Damir|exit:true'     // dirty: land, apply, hand-off (the old order)
      && run('ixian:landtab:chats:Da:mir') === 'land:chats|save:Da:mir|exit:true'   // the nick may hold ':' — only the FIRST splits
      && run('ixian:landtab:contacts:') === 'land:contacts|save:|exit:true'         // a present-but-empty nick is still the apply path
      && run('ixian:landtab:bogus') === 'other|exit:true'                            // unknown id: no land, still the hand-off
      && run('ixian:landtab:') === 'other|exit:true'
      && run('ixian:landtab:x:Nick') === 'other|save:Nick|exit:true'
      && run('ixian:landtab:wallet:Nick', () => false) === '';                     // #46 r1 MIN-1: a latched present does NOTHING
  } catch (e) { r.csParse = false; }

  /* ⑦b #46 r1 MIN-1 — the per-present EXIT LATCH, EXECUTED: claimExit's body sliced + run against a fake tick; the
     back/handoff and save bodies sliced + run through the SAME latch → the legacy pair (landtab, then save:) runs
     ONE exit; onLoad + onRepresentedNative reset it; the window sits below the shell's pane heal (EXIT_HEAL_MS) */
  const claimB = sliceBody(SP, 'private bool claimExit()');
  const latchMs = +((SP.match(/private const int ExitLatchMs = (\d+);/) || [])[1] || NaN);
  const healMs = +((stripCode(rd('src/shells/settings.html')).match(/const EXIT_HEAL_MS = (\d+);/) || [])[1] || NaN);
  const tr = (b) => b.replace(/\blong /g, 'let ').replace(/Environment\.TickCount64/g, 'ENV.tick').replace(/Logging\.warn\(/g, 'LOG(')
    .replace(/\bexitLatchTick\b/g, 'S.t').replace(/\bExitLatchMs\b/g, 'S.ms')
    .replace(/current_url\.Equals\("ixian:handoff", StringComparison\.Ordinal\)/g, '(current_url === "ixian:handoff")')
    .replace(/current_url\.Substring\("ixian:save:"\.Length\)/g, 'current_url.slice("ixian:save:".length)').replace(/\bstring /g, 'let ');
  const backB = sliceBody(SP, '|| current_url.Equals("ixian:handoff", StringComparison.Ordinal))');
  const saveB = sliceBody(SP, 'else if (current_url.StartsWith("ixian:save:", StringComparison.Ordinal))');
  try {
    const S = { t: 0, ms: latchMs };
    const ENV = { tick: 0 };
    const logs = [];
    const claimFn = new Function('S', 'ENV', 'LOG', tr(claimB));
    const claim = () => claimFn(S, ENV, (m) => logs.push(m));
    const out = [];
    const backFn = new Function('current_url', 'claimExit', 'exitCleanup', tr(backB));
    const saveFn = new Function('current_url', 'claimExit', 'onSaveSettings', tr(saveB));
    const back = (u) => backFn(u, claim, (d) => out.push('exit:' + d));
    const save = (u) => saveFn(u, claim, (n) => out.push('saveExit:' + n));
    ENV.tick = 5000; run('ixian:landtab:wallet', claim, out);   // the legacy pair: landtab …
    ENV.tick = 5004; save('ixian:save:Damir');                     // … then save: one macrotask later → ignored
    ENV.tick = 5010; back('ixian:handoff');                        // … any further exit verb → ignored
    const first = out.join('|');
    S.t = 0;                                                       // a re-present (the reset lines are pinned below)
    out.length = 0; ENV.tick = 6000; save('ixian:save:Bob');
    ENV.tick = 6000 + latchMs; back('ixian:back');                // past the window (the pane heal re-sends at 2500 ms)
    r.csLatch = latchMs > 0 && latchMs < healMs
      && first === 'land:wallet|exit:true' && out.join('|') === 'saveExit:Bob|exit:false'
      && logs.length === 2 && logs.every((m) => m === 'Settings exit: a second exit verb in one present (other) — ignored');
  } catch (e) { r.csLatch = 'threw ' + String(e).slice(0, 120); }
  const onLoadB = sliceBody(SP, 'private void onLoad()');
  const reprB = sliceBody(SP, 'protected internal override void onRepresentedNative()');
  r.csLatchReset = /^\s*lastPushedUnread = -1;\s*exitLatchTick = 0;/.test(onLoadB) && /^\s*BackupPage\.pushBackupStatus\(this\);\s*exitLatchTick = 0;/.test(reprB)   /* the reset sits right after the #314 push (that pin anchors the push first) */
    && (SP.match(/^\s*exitLatchTick = 0;/gm) || []).length === 2 && /private long exitLatchTick = 0;/.test(SP) && (SP.match(/\bclaimExit\(\)/g) || []).length === 4;
  r.csNoLog = landBody.length > 0 && !/Logging\.|P1Perf/.test(landBody);   // the nick is never logged on this path
  const exitM = sliceBody(SP, 'private void exitCleanup(bool deferPop)');
  r.csExit = /File\.Delete\(source_file_path\);[\s\S]*resetLanguage\(\);\s*closeSublevelOverlays\(\);\s*if \(deferPop\)\s*\{\s*popOnCoverPainted\(\);\s*\}\s*else\s*\{\s*popPageAsync\(\);\s*\}\s*$/.test(exitM)
    && /\|\| current_url\.Equals\("ixian:handoff", StringComparison\.Ordinal\)\)\s*\{\s*if \(claimExit\(\)\)\s*\{\s*exitCleanup\(current_url\.Equals\("ixian:handoff", StringComparison\.Ordinal\)\);\s*\}\s*\}/.test(SP);

  /* ⑧ C# aboutLink: a FIXED id map (4 ids → 4 Config constants), the SAME URL the FE row shows, an unknown id = a
     fixed-word warn; no `ixian:openLink:` dispatch left on SettingsPage */
  const CFG = stripCode(rd('Spixi/Meta/Config.cs'));
  const cfgVal = (name) => (CFG.match(new RegExp('public static readonly string ' + name + ' = "([^"]*)";')) || [])[1];
  const mapM = sliceBody(SP, 'internal static string? aboutLinkUrl(string id)');
  const cases = [...mapM.matchAll(/case "([a-z]+)": return Config\.(\w+);/g)].map((m) => [m[1], cfgVal(m[2])]);
  const APP = rd('src/components/settings-app.js');
  const feUrl = (id) => (APP.match(new RegExp("\\{ id: '" + id + "', label: [^}]*?url: '([^']+)'")) || [])[1];
  r.csMap = cases.length === 4 && JSON.stringify(cases.map((c) => c[0])) === JSON.stringify(['website', 'network', 'source', 'help'])
    && cases.every(([id, url]) => typeof url === 'string' && /^https:\/\/[^@\s]+$/.test(url) && url === feUrl(id))
    && (mapM.match(/\breturn\b/g) || []).length === 5 && /default: return null;/.test(mapM)
    && !/current_url|Substring|\+/.test(mapM);
  const aboutB = sliceBody(SP, 'else if (current_url.StartsWith("ixian:aboutLink:", StringComparison.Ordinal))');
  r.csAbout = /^\s*string\? aboutUrl = aboutLinkUrl\(current_url\.Substring\("ixian:aboutLink:"\.Length\)\);\s*if \(aboutUrl == null\)\s*\{\s*Logging\.warn\("aboutLink: unknown id \(other\) — ignored"\);\s*\}\s*else\s*\{\s*Utils\.openExternal\(aboutUrl\);\s*\}\s*$/.test(aboutB);
  r.csNoOpenLink = !/"ixian:openLink:"/.test(SP);

  ok(Object.values(r).length > 0 && Object.values(r).every((x) => x === true),
    '★ S14 B (#1284 + #1285) Settings (EXECUTED, built settings.html + the sliced C# landtab body): a tab tap / Contacts emits exactly ONE ixian: command, `ixian:landtab:<id>` (a second tap: nothing); dirty → `ixian:landtab:<id>:<nick>` (the nick may hold ":"); an exe without settingsApply keeps landtab + handoff / save:; C# splits at the FIRST ":" → land (fixed id set, else "other") → apply (only with a ":") → the hand-off cleanup, never logging the nick; About / How-to rows emit `ixian:aboutLink:<website|network|source|help>`, C# maps exactly those four ids to Config URLs equal to the rows\' own, an unknown id is a fixed-word warn, and neither the shell nor SettingsPage carries `ixian:openLink` — ' + JSON.stringify(r));
}
