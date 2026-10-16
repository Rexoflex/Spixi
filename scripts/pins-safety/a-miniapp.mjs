/* ==== Session Safety · Lane A — the mini-app paths (P33): S-1 H-6 storage table · S-2 MAJOR #10 / H-9 app id · S-3 H-8 picked
 * file name. Flags SafeStorage / SafeAppId / SafePick (SpixiFlags, read once at start; OFF = the old path).
 *
 * The REAL MiniApp.cs / MiniAppStorage.cs / MiniAppManager.cs are EXECUTED in the C# harness (scripts/csh/SafetyAppTests.cs:
 * every proof case of docs/safety-mechanisms.md with the flag ON = refused and OFF = today, incl. the `../..` install that
 * deleted the whole Spixi folder). This module pins what the harness cannot reach (MAUI / Newtonsoft / Android-bound) and the
 * shape of the C# it runs (comment-stripped C#, brace-matched bodies, source ORDER):
 *   ID     — MiniApp ctor `case "id"`: the flag + isSafeAppId refusal (id "" + the fixed warn) comes BEFORE `id = value`;
 *   EMPTY  — every `new MiniApp(` site (start · fetchWithReason · extractAppInfo · installFromPath, and no other in Spixi/)
 *            treats "" as "not an app"; start's ON line is fixed words (no path);
 *   INSTALL— installFromPath: the flag read once; the childPath belt before the update's remove(); a null target cleans the
 *            extract and returns null; created_target = true right after Directory.Move; the catch (ON) deletes only
 *            created_target && isInside(appsPath, …); OFF keeps the old catch;
 *   BELT   — remove / getAppEntryPoint / getAppIconPath: childPath under the flag, the old Path.Combine only in the OFF leg;
 *   STORE  — MiniAppStorage: getStorageCache refuses FIRST (before the cache lock / any entry); safeTablePath = childPath(id) →
 *            childPath(table) → isInside(AppsStorage); writeStorageData re-checks before the cache; get/set handle null;
 *   ACTION — MiniAppActionHandler get/set: the table rule gates the storage call (else-branch); the response shape is kept
 *            (get: r = "null" default + the request id; set: r = the value + the request id);
 *   LEGACY — MiniAppPage's ixian:get/setStorageData use the fixed table "main" (no change needed);
 *   PICK   — AppNewPage.pickAppFileCore: SafePick → tmpPath + AuditRules.packageTempName(); the old `name + ".tmp"` only OFF;
 *            the Android picker: SafePick → SafetyRules.safeBaseName(FileName);
 *   LOGS   — every new log line in the lane is a fixed-word literal (deleteDirQuietly: + the exception TYPE only); no
 *            .Message, no id / table / path operand;
 *   #46 r1 — INSTALL also pins the expected id (installFromUrlAsync passes fetchedAppInfo.id; refused before remove()),
 *            the orphan pre-delete (inside html/Apps, no listed app, not Tmp, right before the Move) and the type-only catch
 *            line; SWEEP pins start()'s Tmp FILE sweep under SafePick (+ extractAppInfo's type-only line); PICK keeps a null
 *            name null; RUNCSH pins run-csh.mjs's missing-Ixian-Core exit 3 before the build.
 *   CSH    — csh.csproj compiles the three REAL MiniApp* files + the Ixian-Core utils (so SafetyAppTests runs the shipped code).
 * Deliberate breaks: each key was broken on purpose in the lane copy and failed for its own reason (Lane A report). */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8');
  const rd = (f) => stripCode(raw(f));
  const sq = (t) => t.replace(/\s+/g, ' ');
  const body = (t, sig, from = 0) => {
    const i = t.indexOf(sig, from); if (i < 0) return '';
    const o = t.indexOf('{', i); if (o < 0) return '';
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const before = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const walk = (d, out = []) => {
    for (const n of readdirSync(join(root, d), { withFileTypes: true })) {
      if (n.name === 'obj' || n.name === 'bin') continue;
      const q = d + '/' + n.name;
      if (n.isDirectory()) walk(q, out); else if (n.name.endsWith('.cs')) out.push(q);
    }
    return out;
  };

  const APP = sq(rd('Spixi/MiniApps/MiniApp.cs'));
  const MGR = sq(rd('Spixi/MiniApps/MiniAppManager.cs'));
  const STO = sq(rd('Spixi/MiniApps/MiniAppStorage.cs'));
  const ACT = sq(rd('Spixi/MiniApps/MiniAppActionHandler.cs'));
  const NEW = sq(rd('Spixi/Pages/MiniApps/AppNewPage.xaml.cs'));
  const PICK = sq(rd('Spixi/Platforms/Android/SFilePicker.cs'));

  /* ── ID: the ctor ── */
  const caseId = APP.slice(APP.indexOf('case "id":'), APP.indexOf('case "publisher":'));
  const id = {
    found: caseId.length > 0,
    refusal: /^case "id": if \(SpixiFlags\.SafeAppId && !SafetyRules\.isSafeAppId\(value\)\) \{ id = ""; Logging\.warn\("MiniApp: refused an unsafe app id"\); break; \} id = value; break; $/.test(caseId),
    using: /using IXICore\.Meta;/.test(APP),
  };
  ok(Object.values(id).every(Boolean),
    '★ Safety S-2 (P33): the MiniApp ctor `case "id"` refuses an id outside SafetyRules.isSafeAppId under SpixiFlags.SafeAppId — id stays "", ONE fixed-word warn, `break` — BEFORE `id = value` (the only assignment) — ' + JSON.stringify(id));

  /* ── EMPTY: every new MiniApp( site treats "" as not an app ── */
  const sites = [];
  for (const f of walk('Spixi')) {
    const t = rd(f);
    for (const m of t.matchAll(/new MiniApp\(/g)) sites.push(f + ':' + m.index);
  }
  const start = body(MGR, 'public void start()');
  const fetchR = body(MGR, 'public async Task<(MiniApp? app, FetchFailure failure)> fetchWithReason(');
  const extract = body(MGR, 'public MiniApp? extractAppInfo(');
  const install = body(MGR, 'private string installFromPathCore(');   // ★ #46 r3: the body moved behind the one-at-a-time wrapper
  const empty = {
    fourSites: sites.length === 4 && sites.every((s) => s.startsWith('Spixi/MiniApps/MiniAppManager.cs:')),
    start: /MiniApp app = new MiniApp\(File\.ReadAllLines\(app_info_path\)\); if \(app\.id == ""\) \{ if \(SpixiFlags\.SafeAppId\) \{ Logging\.error\("App id is empty or unsafe, the app folder was skipped"\); continue; \} Logging\.error\("App id is empty for \{0\}", app_info_path\); continue; \} appList\.Add\(app\.id, app\);/.test(start),
    fetch: /var app = new MiniApp\(app_info, url\); if \(app\.id == ""\) \{ return \(null, FetchFailure\.Invalid\); \}/.test(fetchR),
    extract: /MiniApp app = new MiniApp\(File\.ReadAllLines\(app_info_path\), url\); File\.Delete\(app_info_path\); if \(app\.id == ""\) \{ return null; \}/.test(extract),
    install: /new MiniApp\(File\.ReadAllLines\(Path\.Combine\(source_app_path, "appinfo\.spixi"\)\), url\); if \(app\.id == ""\) \{ if \(safe_app_id\) \{ deleteDirQuietly\(source_app_path\); \} return null; \}/.test(install),
  };
  ok(Object.values(empty).every(Boolean),
    '★ Safety S-2 (P33): the four `new MiniApp(` sites (all in MiniAppManager) treat a refused id ("") as "not an app" — start skips it (ON: a fixed-word line, no path; OFF: the old line), fetchWithReason → Invalid, extractAppInfo → null, installFromPath → null (ON: the extract is cleaned) — ' + JSON.stringify({ ...empty, sites }));

  /* ── INSTALL: the belt, the created-only delete ── */
  const tryPart = install.slice(0, install.indexOf('catch (Exception e)'));
  const catchPart = body(install, 'catch (Exception e)');
  const inst = {
    found: install.length > 0 && catchPart.length > 0,
    readOnce: /bool safe_app_id = SpixiFlags\.SafeAppId; bool created_target = false; try \{/.test(install),
    belt: /if \(safe_app_id\) \{ safe_target_path = SafetyRules\.childPath\(appsPath, app\.id, false\); if \(safe_target_path == null\) \{ Logging\.warn\("MiniApp: refused to install an app outside the apps folder"\); deleteDirQuietly\(source_app_path\); return null; \} if \(expected_id != null && !string\.Equals\(app\.id, expected_id, StringComparison\.Ordinal\)\) \{ Logging\.warn\("MiniApp: refused a package whose id differs from the app info"\); deleteDirQuietly\(source_app_path\); return null; \} string\? caseTwin = null; lock \(appList\) \{ foreach \(string k in appList\.Keys\) \{ if \(!string\.Equals\(k, app\.id, StringComparison\.Ordinal\) && string\.Equals\(k, app\.id, StringComparison\.OrdinalIgnoreCase\)\) \{ caseTwin = k; break; \} \} \} if \(caseTwin != null\) \{ Logging\.warn\("MiniApp: refused a package whose id differs from an installed app only by case"\); deleteDirQuietly\(source_app_path\); return null; \} \}/.test(tryPart),   // ★ #46 r2 (M-A): + the case-variant refusal
    /* ★ #46 r1: the expected id (the fetched app info the user saw) — the signature, the URL install passes it, checked before remove() */
    expected: /public string installFromPath\(string source_path, string\? url = null, string\? expected_id = null\)/.test(MGR)
      && /string app_name = installFromPath\(source_app_file_path, fetchedAppInfo\.url, fetchedAppInfo\.id\);/.test(body(MGR, 'public async Task<string?> installFromUrlAsync('))
      && before(tryPart, 'expected_id != null', 'remove(app.id);') && (MGR.match(/installFromPath\(/g) || []).length === 2
      /* ★ #46 r3 (MINOR-2): with the flag ON one install at a time (the twin check → orphan test → Move → Add in one section) */
      && /public string installFromPath\(string source_path, string\? url = null, string\? expected_id = null\)\s*\{\s*if \(!SpixiFlags\.SafeAppId\)\s*\{\s*return installFromPathCore\(source_path, url, expected_id\);\s*\}\s*lock \(installSync\)\s*\{\s*return installFromPathCore\(source_path, url, expected_id\);\s*\}\s*\}/.test(MGR)
      && /private static readonly object installSync = new object\(\);/.test(MGR),
    /* ★ #46 r1 R1 MINOR-1: the orphan pre-delete — ON, inside html/Apps, NOT a listed app, not Tmp, right before the Move */
    orphan: /target_app_path = safe_app_id \? safe_target_path! : Path\.Combine\(appsPath, app\.id\); bool isOrphan = false; if \(safe_app_id\) \{ lock \(appList\) \{ isOrphan = loaded && !appList\.Keys\.Any\(k => string\.Equals\(k, app\.id, StringComparison\.OrdinalIgnoreCase\)\); \} \} if \(isOrphan && Directory\.Exists\(target_app_path\) && SafetyRules\.isInside\(appsPath, target_app_path\) && !string\.Equals\(app\.id, SafetyRules\.TmpFolderName, StringComparison\.OrdinalIgnoreCase\) && !string\.Equals\(Path\.GetFullPath\(target_app_path\), Path\.GetFullPath\(tmpPath\), StringComparison\.OrdinalIgnoreCase\)\) \{ Logging\.warn\("MiniApp: removed an orphan app folder before the install"\); deleteDirQuietly\(target_app_path\); \} Directory\.Move\(/.test(tryPart),
    /* ★ #46 r5 (NIT): `loaded` = true only as the last step of start()'s fill (under lock(appList)), false again in stop() */
    loadedPlace: /lock \(appList\)\s*\{\s*foreach \(var path in Directory\.EnumerateDirectories\(appsPath\)\)[\s\S]*appList\.Add\(app\.id, app\);\s*\}\s*loaded = true;\s*\}\s*\}\s*$/.test(body(MGR, 'public void start(')) && (MGR.match(/loaded = true;/g) || []).length === 1
      && /appList\.Clear\(\);\s*loaded = false;/.test(body(MGR, 'public void stop(')),
    catchLine: /^\{ Logging\.error\(safe_app_id \? "Error installing app: " \+ e\.GetType\(\)\.Name : "Error installing app: " \+ e\);/.test(catchPart),
    beltBeforeUpdate: before(tryPart, 'SafetyRules.childPath(appsPath, app.id, false)', 'if (appList.ContainsKey(app.id))') && before(tryPart, 'SafetyRules.childPath(appsPath, app.id, false)', 'remove(app.id);'),
    target: /Directory\.Move\(source_app_path, target_app_path\); created_target = true; lock \(appList\)/.test(tryPart),
    onlyOneSet: (install.match(/created_target = true;/g) || []).length === 1,
    catchOn: /if \(safe_app_id\) \{ if \(created_target && SafetyRules\.isInside\(appsPath, target_app_path\) && Directory\.Exists\(target_app_path\)\) \{ Directory\.Delete\(target_app_path, true\); \} \} else if \(target_app_path != "" && Directory\.Exists\(target_app_path\)\) \{ Directory\.Delete\(target_app_path, true\); \} return null;/.test(catchPart),
    oneTargetDelete: (catchPart.match(/Directory\.Delete\(target_app_path, true\);/g) || []).length === 2,
  };
  ok(Object.values(inst).every(Boolean),
    '★ Safety S-2 (P33, MAJOR #10 / H-9): installFromPath reads SafeAppId once; ON the target is SafetyRules.childPath(appsPath, app.id, false), decided BEFORE an update removes the old copy (null → clean the extract, null); created_target is set right after Directory.Move (only there); the catch deletes the target ON only when created_target && isInside(appsPath, …) and logs the exception TYPE only, OFF = the old catch; #46 r1: a package whose id differs from the fetched app info (installFromUrlAsync passes fetchedAppInfo.id) is refused before remove(); an ORPHAN folder (inside html/Apps, no listed app, not Tmp) is removed right before the Move — ' + JSON.stringify(inst));

  /* ── SWEEP (#46 r1 R1 MINOR-3): start() clears the FILES left in Tmp under SafePick ── */
  const sweep = body(MGR, 'private void sweepTmpFiles()');
  const extractCatch = body(extract, 'catch (Exception e)');
  const sw = {
    found: sweep.length > 0,
    startCall: /^\{ if\s?\(started\) \{ Logging\.warn\("Spixi Mini App Manager already started\."\); return; \} started = true; if \(SpixiFlags\.SafePick\) \{ sweepTmpFiles\(\); \} lock \(appList\)/.test(start),
    filesOnly: /foreach \(string file in Directory\.EnumerateFiles\(tmpPath\)\) \{ try \{ File\.Delete\(file\); removed\+\+; \} catch \(Exception\) \{ kept\+\+; \} \}/.test(sweep) && !/Directory\.Delete|EnumerateDirectories|SearchOption/.test(sweep),
    guarded: /^\{ int removed = 0, kept = 0; try \{ if \(!Directory\.Exists\(tmpPath\)\) \{ return; \}/.test(sweep) && /catch \(Exception e\) \{ Logging\.warn\("MiniApp: the temp folder sweep failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\); return; \}/.test(sweep),
    countLine: /Logging\.info\("MiniApp: temp folder swept, removed=" \+ removed \+ " kept=" \+ kept\);/.test(sweep),
    extractLine: /^\{ Logging\.error\(SpixiFlags\.SafeAppId \? "Error extracting app info: " \+ e\.GetType\(\)\.Name : "Error extracting app info: " \+ e\);/.test(extractCatch),
  };
  ok(Object.values(sw).every(Boolean),
    '★ Safety S-3 (#46 r1 R1 MINOR-3): MiniAppManager.start() sweeps the FILES directly in Tmp under SafePick (no folder, nothing outside), each delete guarded, one fixed-word line with counts only; extractAppInfo\'s catch logs the exception TYPE only under SafeAppId — ' + JSON.stringify(sw));

  /* ── BELT: remove / entry point / icon ── */
  const rem = body(MGR, 'public bool remove(string app_id)');
  const entry = body(MGR, 'public string? getAppEntryPoint(string app_id)');
  const icon = body(MGR, 'public string? getAppIconPath(string app_id)');
  const belt = {
    remove: /MiniApp app = appList\[app_id\]; if \(SpixiFlags\.SafeAppId\) \{ string\? app_path = SafetyRules\.childPath\(appsPath, app\.id, false\); if \(app_path == null\) \{ Logging\.warn\("MiniApp: refused to remove an app outside the apps folder"\); return false; \} Directory\.Delete\(app_path, true\); \} else \{ Directory\.Delete\(Path\.Combine\(appsPath, app\.id\), true\); \} appList\.Remove\(app_id\);/.test(rem),
    entry: /if \(SpixiFlags\.SafeAppId\) \{ string\? app_path = SafetyRules\.childPath\(appsPath, app_id, false\); return app_path == null \? null : Path\.Combine\(app_path, "app", "index\.html"\); \} return Path\.Combine\(appsPath, app_id, "app", "index\.html"\);/.test(entry),
    icon: /if \(SpixiFlags\.SafeAppId\) \{ string\? app_path = SafetyRules\.childPath\(appsPath, app_id, false\); if \(app_path == null\) \{ return null; \} path = Path\.Combine\(app_path, "icon\.png"\); \} else \{ path = Path\.Combine\(appsPath, app_id, "icon\.png"\); \} if \(File\.Exists\(path\)\)/.test(icon),
    /* every Path.Combine(appsPath, <id>) sits in an OFF leg (else / after the ON return) — counted: install 1, remove 1, entry 1, icon 1 */
    oldCombines: (MGR.match(/Path\.Combine\(appsPath, app(?:\.id|_id)\b/g) || []).length === 4,
  };
  ok(Object.values(belt).every(Boolean),
    '★ Safety S-2 (P33): remove() refuses (false, nothing deleted) and getAppEntryPoint / getAppIconPath answer null unless SafetyRules.childPath(appsPath, id, false) holds under SafeAppId; the old Path.Combine(appsPath, id) appears only in the four OFF legs — ' + JSON.stringify(belt));

  /* ── STORE: MiniAppStorage belt ── */
  const cache = body(STO, 'private MiniAppDataCache? getStorageCache(string appId, string table)');
  const stp = body(STO, 'private string? safeTablePath(string appId, string table)');
  const wr = body(STO, 'private void writeStorageData(string appId, string table)');
  const gsd = body(STO, 'public byte[]? getStorageData(string appId, string table, string key)');
  const ssd = body(STO, 'public void setStorageData(string appId, string table, string key, byte[] value)');
  const store = {
    found: cache.length > 0 && stp.length > 0 && wr.length > 0 && gsd.length > 0 && ssd.length > 0,
    refuseFirst: /^\{ if \(SpixiFlags\.SafeStorage && safeTablePath\(appId, table\) == null\) \{ Logging\.warn\("MiniAppStorage: refused an unsafe storage name"\); return null; \} lock \(appDataCache\)/.test(cache),
    rule: /^\{ string\? appStoragePath = SafetyRules\.childPath\(appsStoragePath, appId, false\); string\? tableStoragePath = appStoragePath == null \? null : SafetyRules\.childPath\(appStoragePath, table, true\); return tableStoragePath != null && SafetyRules\.isInside\(appsStoragePath, tableStoragePath\) \? tableStoragePath : null; \}$/.test(stp),
    writeFirst: /^\{ string\? safe_table_path = null; if \(SpixiFlags\.SafeStorage\) \{ safe_table_path = safeTablePath\(appId, table\); if \(safe_table_path == null\) \{ Logging\.warn\("MiniAppStorage: refused an unsafe storage name"\); return; \} \} var madc = getStorageCache\(appId, table\); if \(madc == null\) \{ return; \}/.test(wr),
    writeFile: /File\.Open\(safe_table_path \?\? Path\.Combine\(appStoragePath, table\), FileMode\.Create\)/.test(wr),
    getNull: /^\{ var madc = getStorageCache\(appId, table\); if \(madc == null\) \{ return null; \} lock \(madc\)/.test(gsd),
    setNull: /^\{ var madc = getStorageCache\(appId, table\); if \(madc == null\) \{ return; \} lock \(madc\)/.test(ssd),
  };
  ok(Object.values(store).every(Boolean),
    '★ Safety S-1 (P33, H-6): MiniAppStorage refuses an unsafe app id or table under SafeStorage as getStorageCache\'s FIRST statement (before the cache lock — a refused name never gets an entry, so never reaches the write loop); safeTablePath = childPath(AppsStorage, id) → childPath(that, table) → isInside(AppsStorage); writeStorageData re-checks before the cache and opens that checked path; get → null, set → no-op — ' + JSON.stringify(store));

  /* ── ACTION: the SDK verbs ── */
  const sget = body(ACT, 'public string processStorageGet(string data)');
  const sset = body(ACT, 'public string processStorageSet(string data)');
  const action = {
    get: /string table = sga\.t; string key = sga\.k; byte\[\]\? value = null; if \(SpixiFlags\.SafeStorage && !SafetyRules\.isSafeTableName\(table\)\) \{ Logging\.warn\("MiniAppActionHandler: refused an unsafe storage table"\); \} else \{ value = miniAppStorage\.getStorageData\(appId, table, key\); \} string strValue = "null";/.test(sget),
    getShape: /MiniAppActionResponse resp = new MiniAppActionResponse\(\) \{ r = strValue, id = sga\.id \}; return JsonConvert\.SerializeObject\(resp\);/.test(sget),
    set: /string value = ssa\.v; if \(SpixiFlags\.SafeStorage && !SafetyRules\.isSafeTableName\(table\)\) \{ Logging\.warn\("MiniAppActionHandler: refused an unsafe storage table"\); \} else \{ miniAppStorage\.setStorageData\(appId, table, key, Convert\.FromBase64String\(value\)\); \} MiniAppActionResponse resp/.test(sset),
    setShape: /MiniAppActionResponse resp = new MiniAppActionResponse\(\) \{ r = value, id = ssa\.id \}; return JsonConvert\.SerializeObject\(resp\);/.test(sset),
    oneCallEach: (sget.match(/miniAppStorage\./g) || []).length === 1 && (sset.match(/miniAppStorage\./g) || []).length === 1,
  };
  ok(Object.values(action).every(Boolean),
    '★ Safety S-1 (P33, H-6): processStorageGet / processStorageSet call the storage only when SafeStorage is off or the table passes SafetyRules.isSafeTableName; a refusal still answers the SAME shape (get: r = "null" + the request id, as a missing key; set: r = the value + the request id — the SDK\'s pending request resolves) with ONE fixed-word warn — ' + JSON.stringify(action));

  /* ── LEGACY: MiniAppPage's own verbs ── */
  const MAP = sq(rd('Spixi/Pages/MiniApps/MiniAppPage.xaml.cs'));
  const legacy = {
    get: /Node\.MiniAppStorage\.getStorageData\(appId, "main", key\)/.test(MAP),
    set: /Node\.MiniAppStorage\.setStorageData\(appId, "main", key, valueToStore\)/.test(MAP),
    onlyMain: (MAP.match(/Node\.MiniAppStorage\.\w+StorageData\(/g) || []).length === 2,
  };
  ok(Object.values(legacy).every(Boolean),
    '★ Safety S-1 (P33): the legacy ixian:getStorageData / ixian:setStorageData verbs (MiniAppPage) use the FIXED table "main" — no change needed; the app id they pass meets the MiniAppStorage belt — ' + JSON.stringify(legacy));

  /* ── PICK: AppNewPage + the Android picker ── */
  const core = body(NEW, 'Task<(PickAppOutcome outcome, PickedApp? picked)> pickAppFileCore()');
  const pick = {
    temp: /string filepath = SpixiFlags\.SafePick \? Path\.Combine\(Node\.MiniAppManager\.tmpPath, AuditRules\.packageTempName\(\)\) : Path\.Combine\(Node\.MiniAppManager\.tmpPath, name \+ "\.tmp"\); try \{ File\.WriteAllBytes\(filepath, _data\);/.test(core),
    nameOnlyOff: (core.match(/(?<!\.)\bname\b(?! =)/g) || []).length === 1,
    android: /string\? picked_name = SPIXI\.SpixiFlags\.SafePick && fileData\.FileName != null \? SPIXI\.SafetyRules\.safeBaseName\(fileData\.FileName\) : fileData\.FileName; SpixiImageData spixi_img_data = new SpixiImageData\(\) \{ name = picked_name,/.test(PICK),
    onlyFileName: (PICK.match(/fileData\.FileName/g) || []).length === 3,
  };
  ok(Object.values(pick).every(Boolean),
    '★ Safety S-3 (P33, H-8): pickAppFileCore names the temp file in C# under SafePick (Tmp + AuditRules.packageTempName(); the picked name is read only in the OFF leg); the Android picker keeps SafetyRules.safeBaseName(FileName) under SafePick — a null name stays null (#46 r1; LaunchPage shows pickedName ?? filepath) — the provider\'s raw name only OFF — ' + JSON.stringify(pick));

  /* ── LOGS: the lane's new lines are fixed words ── */
  const NEWLOGS = [
    [APP, 'Logging.warn("MiniApp: refused an unsafe app id");'],
    [MGR, 'Logging.error("App id is empty or unsafe, the app folder was skipped");'],
    [MGR, 'Logging.warn("MiniApp: refused to install an app outside the apps folder");'],
    [MGR, 'Logging.warn("MiniApp: refused to remove an app outside the apps folder");'],
    [MGR, 'Logging.warn("installFromPath: a folder was not deleted (" + e.GetType().Name + ")");'],
    [MGR, 'Logging.warn("MiniApp: refused a package whose id differs from the app info");'],
    [MGR, 'Logging.warn("MiniApp: refused a package whose id differs from an installed app only by case");'],   // ★ #46 r2 (M-A)
    [MGR, 'Logging.warn("MiniApp: removed an orphan app folder before the install");'],
    [MGR, 'Logging.warn("MiniApp: the temp folder sweep failed (" + e.GetType().Name + ")");'],
    [MGR, 'Logging.info("MiniApp: temp folder swept, removed=" + removed + " kept=" + kept);'],
    [STO, 'Logging.warn("MiniAppStorage: refused an unsafe storage name");'],
    [ACT, 'Logging.warn("MiniAppActionHandler: refused an unsafe storage table");'],
  ];
  const ON_BLOCKS = [sweep, caseId, inst.found ? tryPart.slice(tryPart.indexOf('if (app.id == "")')) : '', rem, entry, icon, cache.slice(0, cache.indexOf('lock (appDataCache)')), stp, wr.slice(0, wr.indexOf('lock (madc)')), sget, sset, core.slice(core.indexOf('string filepath'), core.indexOf('try {', core.indexOf('string filepath')))];
  const logs = {
    present: NEWLOGS.every(([t, l]) => t.includes(l)),
    deleteQuiet: /private static void deleteDirQuietly\(string path\) \{ try \{ if \(Directory\.Exists\(path\)\) \{ Directory\.Delete\(path, true\); \} \} catch \(Exception e\) \{ Logging\.warn\("installFromPath: a folder was not deleted \(" \+ e\.GetType\(\)\.Name \+ "\)"\); \} \}/.test(MGR),
    /* in the new ON blocks every Logging call is one of the fixed lines above (the old `Newer/Older version of app {0}` lines are the OLD install path, untouched) */
    onlyFixed: ON_BLOCKS.every((b) => (b.match(/Logging\.\w+\([^;]*\);/g) || []).every((c) => NEWLOGS.some(([, l]) => l === c) || /^Logging\.warn\("(?:Newer|Older) version of app \{0\} already installed[^"]*", app\.id\);$/.test(c))),
    noMessage: ON_BLOCKS.every((b) => !/\.Message\b/.test(b)),
  };
  ok(Object.values(logs).every(Boolean),
    '★ Safety (P33, CLAUDE.md log rule): every log line Lane A added is a fixed-word literal (the extract cleanup adds the exception TYPE only); no new block logs an id, a table, a path or ex.Message — ' + JSON.stringify(logs));

  /* ── RUNCSH (#46 r3 n-6): a missing sibling Ixian-Core is a clear SKIP (exit 3), checked before the build ── */
  const RUN = stripCode(raw('scripts/run-csh.mjs'));
  const runcsh = {
    path: /const ixiCore = join\(dir, '\.\.', '\.\.', '\.\.', 'Ixian-Core'\);/.test(RUN),
    exit3: /if \(!existsSync\(ixiCore\)\) \{ console\.log\('run-csh: SKIPPED — Ixian-Core not found at ' \+ ixiCore \+ [^;]*\); process\.exit\(3\); \}/.test(RUN),
    beforeBuild: before(RUN, 'existsSync(ixiCore)', "spawnSync('dotnet', ['run'"),
  };
  ok(Object.values(runcsh).every(Boolean),
    '★ Safety (#46 r3 n-6): run-csh.mjs names the expected Ixian-Core path (the repo\'s sibling) and exits 3 when it is missing, before the build — ' + JSON.stringify(runcsh));

  /* ── CSH: the harness runs the shipped files ── */
  const CSH = raw('scripts/csh/csh.csproj');
  const csh = {
    files: ['../../Spixi/MiniApps/MiniApp.cs', '../../Spixi/MiniApps/MiniAppStorage.cs', '../../Spixi/MiniApps/MiniAppManager.cs',
      '../../../Ixian-Core/Utils/IxiVarInt.cs', '../../../Ixian-Core/Utils/IxiUtils.cs', '../../../Ixian-Core/Utils/ByteArrayComparer.cs',
      '../../Spixi/Utils/SafetyRules.cs', '../../Spixi/Utils/SpixiFlags.cs', '../../Spixi/Utils/AuditRules.cs'].every((f) => CSH.includes('<Compile Include="' + f + '" />')),
    tests: /\[TestClass\]\s*public class SafetyAppTests/.test(raw('scripts/csh/SafetyAppTests.cs')),
  };
  ok(Object.values(csh).every(Boolean),
    '★ Safety (P33): csh.csproj compiles the REAL MiniApp.cs / MiniAppStorage.cs / MiniAppManager.cs (+ the Ixian-Core utils, SafetyRules, SpixiFlags, AuditRules) and SafetyAppTests is a test class — the ON / OFF proof cases run the shipped code — ' + JSON.stringify(csh));
}
