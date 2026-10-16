using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using IXICore.Utils;
using System.IO.Compression;
using System.Net.Http.Headers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;

namespace SPIXI.MiniApps
{
    class MiniAppManager
    {
        string appsPath = "Apps";
        public string tmpPath { get; private set; } = "Tmp";

        Dictionary<string, MiniApp> appList = new Dictionary<string, MiniApp>();

        private Dictionary<byte[], MiniAppPage> appPages = new Dictionary<byte[], MiniAppPage>(new ByteArrayComparer());
        /* ★ A4 (Session AD): a BOUNDED fetch. The default HttpClient timeout is 100 s; the
         * shells' "maybe failed" grace timer used to fire at 8 s while the fetch was still
         * running, and a success up to 92 s later then closed the panel under the user.
         * 15 s is the ceiling; the shells' timer sits ABOVE it, so it only ever fires when
         * no signal came at all. */
        private static readonly HttpClient httpClient = new HttpClient() { Timeout = TimeSpan.FromSeconds(15) };

        /// <summary>★ A4: why a fetch returned null — a fixed vocabulary the shell maps to a
        /// localized line: url · http · size · timeout · invalid · error · network (★ S19 F6: the request
        /// never got an answer — DNS / connection; an older shell shows its generic line for it).</summary>
        public enum FetchFailure { None, Url, Http, Size, Timeout, Invalid, Error, Network }
        /// <summary>The whole-fetch deadline (HEAD + GET); the shells' 20 s grace must stay above it.</summary>
        public const int FETCH_DEADLINE_SECONDS = 15;

        public static string fetchFailureName(FetchFailure f)
        {
            switch (f)
            {
                case FetchFailure.Url: return "url";
                case FetchFailure.Http: return "http";
                case FetchFailure.Size: return "size";
                case FetchFailure.Timeout: return "timeout";
                case FetchFailure.Invalid: return "invalid";
                case FetchFailure.Error: return "error";
                case FetchFailure.Network: return "network";
                default: return "";
            }
        }

        bool started = false;
        bool loaded = false;   // ★ Session Safety #46 r4 (MINOR-2): appList holds what is on disk (set at the end of start()'s fill, under lock(appList))

        public MiniAppManager(string base_app_path)
        {
            appsPath = Path.Combine(base_app_path, "html", "Apps");
            if (!Directory.Exists(appsPath))
            {
                Directory.CreateDirectory(appsPath);
            }

            tmpPath = Path.Combine(appsPath, "Tmp");
            if (!Directory.Exists(tmpPath))
            {
                Directory.CreateDirectory(tmpPath);
            }
        }

        public void start()
        {
            if(started)
            {
                Logging.warn("Spixi Mini App Manager already started.");
                return;
            }
            started = true;

            if (SpixiFlags.SafePick)
            {
                sweepTmpFiles();
            }

            lock (appList)
            {
                foreach (var path in Directory.EnumerateDirectories(appsPath))
                {
                    string app_info_path = Path.Combine(path, "appinfo.spixi");
                    if (!File.Exists(app_info_path))
                    {
                        continue;
                    }
                    MiniApp app = new MiniApp(File.ReadAllLines(app_info_path));
                    if (app.id == "")
                    {
                        /* ★ Session Safety (S-2, P33): flag ON — an unsafe id on disk reaches here as "" (the MiniApp ctor
                         * refused it) and is skipped like an empty one; the line is fixed words (the path holds the folder
                         * name, which a publisher chose). Flag OFF: the old line. */
                        if (SpixiFlags.SafeAppId)
                        {
                            Logging.error("App id is empty or unsafe, the app folder was skipped");
                            continue;
                        }
                        Logging.error("App id is empty for {0}", app_info_path);
                        continue;
                    }

                    appList.Add(app.id, app);
                }
                loaded = true;
            }
        }

        /* ★ Session Safety (S-3, P33 · #46 r1 R1 MINOR-3): with SafePick every picked package is a fresh C#-named file in Tmp
         * (AuditRules.packageTempName), so a pick that never reached Install (the details screen closed, the app killed) left
         * one more file each time. Nothing installs at start, so the FILES directly in Tmp are removed here (folders — the
         * `<package>.dir` extracts — are left alone; installFromPath clears its own). Each delete is guarded; the line is fixed
         * words + counts. Flag OFF: nothing is swept (today). */
        private void sweepTmpFiles()
        {
            int removed = 0, kept = 0;
            try
            {
                if (!Directory.Exists(tmpPath))
                {
                    return;
                }
                foreach (string file in Directory.EnumerateFiles(tmpPath))
                {
                    try
                    {
                        File.Delete(file);
                        removed++;
                    }
                    catch (Exception)
                    {
                        kept++;
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("MiniApp: the temp folder sweep failed (" + e.GetType().Name + ")");
                return;
            }
            if (removed > 0 || kept > 0)
            {
                Logging.info("MiniApp: temp folder swept, removed=" + removed + " kept=" + kept);
            }
        }

        public void stop()
        {
            if (!started)
            {
                Logging.warn("Spixi Mini App Manager already stopped.");
                return;
            }

            started = false;

            lock (appList)
            {
                // TODO maybe stop all apps
                appList.Clear();
                loaded = false;   // ★ #46 r4 (MINOR-2)
            }
        }

        public async Task<MiniApp?> fetch(string url, long maxSizeBytes = 1 * 1024 * 1024) // 1 MB default limit
        {
            var (app, _) = await fetchWithReason(url, maxSizeBytes);
            return app;
        }

        /// <summary>★ A4 (Session AD): the same fetch, with the REASON a null carries.</summary>
        public async Task<(MiniApp? app, FetchFailure failure)> fetchWithReason(string url, long maxSizeBytes = 1 * 1024 * 1024)
        {
            if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out Uri uri) || uri.Scheme != Uri.UriSchemeHttps)
            {
                Logging.error("Invalid or insecure app URL: " + url);
                return (null, FetchFailure.Url);
            }

            // ★ A4 (#46 loop m5): ONE deadline over BOTH round trips (HEAD + GET). Each request
            // also has the client's per-request ceiling, so the whole fetch is bounded by
            // FETCH_DEADLINE_SECONDS — and the shells' fallback timer (20 s) fires AFTER it,
            // so a slow server never closes the panel under a late success.
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(FETCH_DEADLINE_SECONDS));
            try
            {
                using var headRequest = new HttpRequestMessage(HttpMethod.Head, url);

                httpClient.DefaultRequestHeaders.CacheControl = new CacheControlHeaderValue() { NoCache = true, NoStore = true, MustRevalidate = true };

                using HttpResponseMessage headResponse = await httpClient.SendAsync(headRequest, deadline.Token);
                headResponse.EnsureSuccessStatusCode();

                long contentLength = headResponse.Content.Headers.ContentLength ?? 0;
                if (contentLength > maxSizeBytes)
                {
                    Logging.error("App content size exceeds limit: " + contentLength + " bytes");
                    return (null, FetchFailure.Size);
                }

                byte[] data = await httpClient.GetByteArrayAsync(url, deadline.Token);

                string content = Encoding.UTF8.GetString(data);
                string[] app_info = content.Replace("\r\n", "\n").Split('\n');

                var app = new MiniApp(app_info, url);
                if (app.id == "")
                {
                    return (null, FetchFailure.Invalid);
                }
                return (app, FetchFailure.None);
            }
            catch (OperationCanceledException e)
            {
                // the deadline above, or the client's per-request ceiling — HttpClient reports
                // both as a cancellation (TaskCanceledException derives from this one)
                Logging.error("App fetch timed out: " + e.GetType().Name);
                return (null, FetchFailure.Timeout);
            }
            catch (HttpRequestException e)
            {
                /* ★ S19 F6 (AA-LINK): no HTTP status = DNS / connection → `network` (S19FetchRules, csh); a status → `http`.
                   The line names the exception TYPE and the reason word only — e.Message can hold the host name (tighter
                   than base, gate row). */
                FetchFailure f = S19FetchRules.isNetworkFailure(e.StatusCode.HasValue ? (int)e.StatusCode.Value : (int?)null, e.HttpRequestError)
                    ? FetchFailure.Network : FetchFailure.Http;
                Logging.error("App fetch failed: " + e.GetType().Name + " " + fetchFailureName(f));
                return (null, f);
            }
            catch (Exception e)
            {
                Logging.error("App fetch failed: " + e.GetType().Name);   // ★ S19 F6: the type only, as above
                return (null, FetchFailure.Error);
            }
        }

        /* ★ C-04 (#1245): the package download is ASYNC (no `.Result`), bounded (headers ≤ 30 s, the whole download
         * ≤ 120 s), streamed to disk with the 100 MB cap counted on the bytes actually read, https ONLY, and saved
         * under C#'s own GUID name in Tmp (never a name derived from the URL). Log lines are fixed words + numbers. */
        private static readonly HttpClient installClient = new HttpClient() { Timeout = TimeSpan.FromSeconds(AuditRules.MiniAppHeadersTimeoutSeconds) };

        public async Task<string?> installFromUrlAsync(MiniApp fetchedAppInfo)
        {
            if (!AuditRules.isHttpsUrl(fetchedAppInfo.contentUrl) || !IxiUtils.IsValidUrl(fetchedAppInfo.contentUrl))
            {
                Logging.error("installFromUrl: the content URL is not a valid https URL");
                return null;
            }

            string source_app_file_path = Path.Combine(tmpPath, AuditRules.packageTempName());
            try
            {
                using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(AuditRules.MiniAppDownloadDeadlineSeconds));
                using var request = new HttpRequestMessage(HttpMethod.Get, fetchedAppInfo.contentUrl);
                request.Headers.CacheControl = new CacheControlHeaderValue() { NoCache = true, NoStore = true, MustRevalidate = true };
                using HttpResponseMessage response = await installClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token).ConfigureAwait(false);
                response.EnsureSuccessStatusCode();
                long? declared = response.Content.Headers.ContentLength;
                if (declared != null && declared.Value > AuditRules.MaxMiniAppPackageBytes)
                {
                    Logging.error("installFromUrl: the package is over the size cap (" + declared.Value + " bytes declared)");
                    return null;
                }
                long written;
                using (Stream src = await response.Content.ReadAsStreamAsync(deadline.Token).ConfigureAwait(false))
                using (FileStream dst = new FileStream(source_app_file_path, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    written = await AuditRules.copyCappedAsync(src, dst, AuditRules.MaxMiniAppPackageBytes, deadline.Token).ConfigureAwait(false);
                }
                if (written < 0)
                {
                    Logging.error("installFromUrl: the package went over the size cap while downloading");
                    deleteQuietly(source_app_file_path);
                    return null;
                }
                fetchedAppInfo.contentSize = written;
                string file_checksum = Crypto.sha256OfFile(source_app_file_path);
                if (file_checksum != fetchedAppInfo.checksum)
                {
                    Logging.error("installFromUrl: the package checksum does not match the app info");
                    deleteQuietly(source_app_file_path);
                    return null;
                }
            }
            catch (OperationCanceledException)
            {
                Logging.error("installFromUrl: the download timed out");
                deleteQuietly(source_app_file_path);
                return null;
            }
            catch (Exception e)
            {
                Logging.error("installFromUrl: the download failed (" + e.GetType().Name + ")");
                deleteQuietly(source_app_file_path);
                return null;
            }

            // ★ Session Safety (S-2, #46 r1): the package must carry the id the user saw on the details screen (SafeAppId ON)
            string app_name = installFromPath(source_app_file_path, fetchedAppInfo.url, fetchedAppInfo.id);
            deleteQuietly(source_app_file_path);
            return app_name;
        }

        private static void deleteQuietly(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch (Exception e)
            {
                Logging.warn("installFromUrl: the temp package was not deleted (" + e.GetType().Name + ")");
            }
        }

        /* ★ Session Safety (S-2, P33): a refused install cleans its own extract in Tmp (C#-named, `<package>.dir`) — and (#46 r1)
         * an orphan folder at the target — and never throws from the cleanup; the line is fixed words + the exception type. */
        private static void deleteDirQuietly(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
            }
            catch (Exception e)
            {
                Logging.warn("installFromPath: a folder was not deleted (" + e.GetType().Name + ")");
            }
        }

        public MiniApp? extractAppInfo(string source_path, string? url = null)
        {
            string app_name = "";

            try
            {
                using (ZipArchive archive = ZipFile.Open(source_path, ZipArchiveMode.Read))
                {
                    // extract the app to tmp location
                    var entry = archive.GetEntry("appinfo.spixi");
                    if (entry == null)
                    {
                        return null;
                    }
                    var app_info_path = Path.Combine(tmpPath, "appinfo.spixi.tmp");
                    entry.ExtractToFile(app_info_path, true);

                    entry = archive.GetEntry("icon.png");
                    if (entry == null)
                    {
                        return null;
                    }
                    var icon_png_path = Path.Combine(tmpPath, "icon.png");
                    entry.ExtractToFile(icon_png_path, true);

                    // read app info
                    MiniApp app = new MiniApp(File.ReadAllLines(app_info_path), url);
                    File.Delete(app_info_path);
                    if (app.id == "")
                    {
                        return null;
                    }

                    if (appList.ContainsKey(app.id))
                    {
                        if (UpdateVerify.compareVersionsWithSuffix(appList[app.id].version, app.version) > 0)
                        {
                            Logging.warn("Newer version of app {0} already installed.", app.id);
                            return null;
                        }
                    }

                    app.contentSize = new FileInfo(source_path).Length;
                    app.checksum = Crypto.sha256OfFile(source_path);
                    app.image = icon_png_path;
                    app_name = app.name;

                    return app;
                }
            }
            catch (Exception e)
            {
                // ★ Session Safety (S-2, #46 r1): ON — the exception TYPE only (its message and stack carry paths). OFF: as before.
                Logging.error(SpixiFlags.SafeAppId ? "Error extracting app info: " + e.GetType().Name : "Error extracting app info: " + e);

                return null;
            }
        }

        /* ★ Session Safety (S-2, #46 r1): `expected_id` = the id the user saw before Install (installFromUrlAsync passes the
         * fetched app info's id; the picked-file path passes null = no check). SafeAppId ON: a package whose own appinfo.spixi
         * names a DIFFERENT id is refused before any remove() / Move (a publisher could otherwise show app A and replace app B). */
        /* ★ Session Safety #46 r3 (MINOR-2, P33): with SafeAppId ON one install runs at a time — the case-twin check, the orphan
         * test, the Move and the Add form one critical section, so two installs racing on a case-insensitive file system
         * (com.foo.app + COM.FOO.APP) can never both land in one folder. The orphan pre-delete also needs a STARTED manager
         * (stopped, appList is empty and every installed app would look like an orphan — #46 r2 n-4). OFF = as before. */
        private static readonly object installSync = new object();

        public string installFromPath(string source_path, string? url = null, string? expected_id = null)
        {
            if (!SpixiFlags.SafeAppId)
            {
                return installFromPathCore(source_path, url, expected_id);
            }
            lock (installSync)
            {
                return installFromPathCore(source_path, url, expected_id);
            }
        }

        private string installFromPathCore(string source_path, string? url, string? expected_id)
        {
            string app_name = "";

            string source_app_path = Path.Combine(tmpPath, source_path.Split('/').Last().Split('\\').Last() + ".dir");
            string target_app_path = "";
            /* ★ Session Safety (S-2, P33 — MAJOR #10 / H-9): the target was Path.Combine(appsPath, app.id) and the catch
             * deleted it recursively whenever it existed — a Move onto an EXISTING folder throws, so a package with id
             * `../..` deleted the whole Spixi user folder (wallet.ixi, Acc/) in one Install tap. Flag ON: the id is checked
             * (ctor) and re-checked here as ONE folder inside html/Apps (SafetyRules.childPath), and the catch deletes the
             * target ONLY when this call created it (the Move succeeded) and it lies inside html/Apps. Read once per call.
             * Flag OFF: the old target and the old catch. */
            bool safe_app_id = SpixiFlags.SafeAppId;
            bool created_target = false;
            try
            {
                using (ZipArchive archive = ZipFile.Open(source_path, ZipArchiveMode.Read))
                {
                    if (Directory.Exists(source_app_path))
                    {
                        Directory.Delete(source_app_path, true);
                    }
                    Directory.CreateDirectory(source_app_path);

                    // extract the app to tmp location
                    archive.ExtractToDirectory(source_app_path);

                    // read app info
                    MiniApp app = new MiniApp(File.ReadAllLines(Path.Combine(source_app_path, "appinfo.spixi")), url);
                    if (app.id == "")
                    {
                        if (safe_app_id)
                        {
                            deleteDirQuietly(source_app_path);   // ★ S-2: a refused id leaves no extract behind
                        }
                        return null;
                    }

                    // ★ S-2 belt (flag ON): the target is ONE folder inside html/Apps, decided BEFORE an update removes the old copy
                    string? safe_target_path = null;
                    if (safe_app_id)
                    {
                        safe_target_path = SafetyRules.childPath(appsPath, app.id, false);
                        if (safe_target_path == null)
                        {
                            Logging.warn("MiniApp: refused to install an app outside the apps folder");
                            deleteDirQuietly(source_app_path);
                            return null;
                        }
                        // ★ #46 r1: the package must be the app the user saw (installFromUrlAsync) — before any remove() / Move
                        if (expected_id != null && !string.Equals(app.id, expected_id, StringComparison.Ordinal))
                        {
                            Logging.warn("MiniApp: refused a package whose id differs from the app info");
                            deleteDirQuietly(source_app_path);
                            return null;
                        }
                        /* ★ #46 r2 (M-A): Windows (NTFS) and the Mac (APFS) are case-INSENSITIVE, appList is not. `COM.FOO.APP`
                         * would skip the update branch (no version check) and land in com.foo.app's own folder and storage. A
                         * case variant of an installed id is refused outright. */
                        string? caseTwin = null;
                        lock (appList)
                        {
                            foreach (string k in appList.Keys)
                            {
                                if (!string.Equals(k, app.id, StringComparison.Ordinal) && string.Equals(k, app.id, StringComparison.OrdinalIgnoreCase))
                                {
                                    caseTwin = k;
                                    break;
                                }
                            }
                        }
                        if (caseTwin != null)
                        {
                            Logging.warn("MiniApp: refused a package whose id differs from an installed app only by case");
                            deleteDirQuietly(source_app_path);
                            return null;
                        }
                    }

                    if (appList.ContainsKey(app.id))
                    {
                        if (UpdateVerify.compareVersionsWithSuffix(appList[app.id].version, app.version) > 0)
                        {
                            Logging.warn("Newer version of app {0} already installed.", app.id);

                            if (Directory.Exists(source_app_path))
                            {
                                Directory.Delete(source_app_path, true);
                            }
                            return null;
                        }
                        else
                        {
                            Logging.warn("Older version of app {0} already installed, updating...", app.id);
                            remove(app.id);
                        }
                    }

                    app.contentSize = new FileInfo(source_path).Length;
                    app.checksum = Crypto.sha256OfFile(source_path);
                    if (url != null)
                    {
                        app.url = url;
                    }
                    app_name = app.name;

                    // TODO sig check

                    target_app_path = safe_app_id ? safe_target_path! : Path.Combine(appsPath, app.id);

                    /* ★ Session Safety (S-2, #46 r1 R1 MINOR-1): ON — a folder at the target that NO installed app owns (an
                     * orphan, e.g. left by a remove() whose delete half-failed) would make every later Move throw, so the app
                     * could never be installed again. It is removed first — only inside html/Apps, never Tmp, never the folder
                     * of an app in the list (the catch below still never deletes a folder this call did not create). */
                    bool isOrphan = false;
                    if (safe_app_id)
                    {
                        lock (appList)   // ★ #46 r4 (MINOR-2): "not in the list" only means something once the list is loaded
                        {
                            isOrphan = loaded && !appList.Keys.Any(k => string.Equals(k, app.id, StringComparison.OrdinalIgnoreCase));   // ★ #46 r3: case-insensitive
                        }
                    }
                    if (isOrphan && Directory.Exists(target_app_path) && SafetyRules.isInside(appsPath, target_app_path)
                        && !string.Equals(app.id, SafetyRules.TmpFolderName, StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(Path.GetFullPath(target_app_path), Path.GetFullPath(tmpPath), StringComparison.OrdinalIgnoreCase))
                    {
                        Logging.warn("MiniApp: removed an orphan app folder before the install");
                        deleteDirQuietly(target_app_path);
                    }

                    // move to apps directory
                    Directory.Move(source_app_path, target_app_path);
                    created_target = true;   // ★ S-2: from here on the target is this call's own folder

                    lock (appList)
                    {
                        // add app to the list
                        appList.Add(app.id, app);
                    }

                    app.writeAppInfoFile(Path.Combine(target_app_path, "appinfo.spixi"));
                }
            }
            catch (Exception e)
            {
                // ★ Session Safety (S-2, #46 r1): ON — the exception TYPE only (its message and stack carry paths). OFF: as before.
                Logging.error(safe_app_id ? "Error installing app: " + e.GetType().Name : "Error installing app: " + e);

                if (Directory.Exists(source_app_path))
                {
                    Directory.Delete(source_app_path, true);
                }

                if (safe_app_id)
                {
                    // ★ S-2: never a folder that existed before this call (a failed Move), never one outside html/Apps
                    if (created_target && SafetyRules.isInside(appsPath, target_app_path) && Directory.Exists(target_app_path))
                    {
                        Directory.Delete(target_app_path, true);
                    }
                }
                else if (target_app_path != "" && Directory.Exists(target_app_path))
                {
                    Directory.Delete(target_app_path, true);
                }

                return null;
            }

            return app_name;
        }

        public bool remove(string app_id)
        {
            lock (appList)
            {
                if (!appList.ContainsKey(app_id))
                {
                    return false;
                }
                MiniApp app = appList[app_id];
                if (SpixiFlags.SafeAppId)
                {
                    /* ★ Session Safety (S-2, P33 — MAJOR #10): the recursive delete only for ONE folder inside html/Apps
                     * (SafetyRules.childPath); anything else is refused and nothing is deleted. Flag OFF: the old delete. */
                    string? app_path = SafetyRules.childPath(appsPath, app.id, false);
                    if (app_path == null)
                    {
                        Logging.warn("MiniApp: refused to remove an app outside the apps folder");
                        return false;
                    }
                    Directory.Delete(app_path, true);
                }
                else
                {
                    Directory.Delete(Path.Combine(appsPath, app.id), true);
                }
                appList.Remove(app_id);
                return true;
            }
        }

        /* ★ #585 rider (Damir, 2026-08-26): "wiping the account leaves the mini app
         * installed, and a create or restore inherits it." The wipe enumerates every other
         * data class; this is the missing one.
         * ⚠ ONE lock for the whole sweep, and a snapshot of the keys: `remove` mutates
         * appList, so enumerating it live would throw. Each delete is wrapped on its own —
         * one app whose directory is held open must not skip the rest, which is the same
         * per-item rule wipeEverything already applies to every other step. */
        public int removeAllApps()
        {
            int removed = 0;
            lock (appList)
            {
                /* ★★ round-2 MAJOR-2: SWEEP THE DISK, not the dictionary. The first cut
                 * enumerated `appList`, and the wipe's step 1 (`IxianHandler.shutdown()` →
                 * `Node.stop()` → `MiniAppManager.stop()`) has ALREADY cleared it — so the
                 * loop never ran, nothing was deleted, the method returned 0, and the next
                 * `start()` re-enumerated the surviving directories and handed every app
                 * back to the new account. The no-op even looked clean in the log.
                 * The directory listing is the authoritative state, and it also collects
                 * apps orphaned by an earlier crash. */
                appList.Clear();
                if (string.IsNullOrEmpty(appsPath) || !Directory.Exists(appsPath))
                {
                    return 0;
                }
                foreach (string path in Directory.EnumerateDirectories(appsPath))
                {
                    // The scratch directory belongs to the manager, not to an app.
                    if (string.Equals(path, tmpPath, StringComparison.Ordinal))
                    {
                        continue;
                    }
                    try
                    {
                        Directory.Delete(path, true);
                        removed++;
                    }
                    catch (Exception e)
                    {
                        // One directory held open must not skip the rest — the per-item
                        // rule wipeEverything applies to every other step.
                        Logging.error("Could not remove mini app directory {0}: {1}", path, e);
                    }
                }
            }
            return removed;
        }

        public MiniApp? getApp(string app_id)
        {
            lock(appList)
            {
                if (appList.ContainsKey(app_id))
                {
                    return appList[app_id];
                }
                return null;
            }
        }

        public string? getAppEntryPoint(string app_id)
        {
            if(getApp(app_id) != null)
            {
                if (SpixiFlags.SafeAppId)
                {
                    // ★ Session Safety (S-2, P33): the entry point only inside the app's own folder under html/Apps; else null
                    string? app_path = SafetyRules.childPath(appsPath, app_id, false);
                    return app_path == null ? null : Path.Combine(app_path, "app", "index.html");
                }
                return Path.Combine(appsPath, app_id, "app", "index.html");
            }
            return null;
        }

        public string? getAppIconPath(string app_id)
        {
            if (getApp(app_id) != null)
            {
                string path;
                if (SpixiFlags.SafeAppId)
                {
                    // ★ Session Safety (S-2, P33): the icon only inside the app's own folder under html/Apps; else null
                    string? app_path = SafetyRules.childPath(appsPath, app_id, false);
                    if (app_path == null)
                    {
                        return null;
                    }
                    path = Path.Combine(app_path, "icon.png");
                }
                else
                {
                    path = Path.Combine(appsPath, app_id, "icon.png");
                }
                if (File.Exists(path))
                {
                    return path;
                }
            }
            return null;
        }

        public string? getAppInstallURL(string app_id)
        {
            MiniApp mini_app = getApp(app_id);
            if (mini_app != null)
            {
                return mini_app.url;
            }
            return null;
        }

        public string? getAppName(string app_id)
        {
            MiniApp? mini_app = getApp(app_id);
            if (mini_app != null)
            {
                return mini_app.name;
            }
            return null;
        }

        public string getAppInfo(string app_id)
        {
            MiniApp mini_app = getApp(app_id);
            if (mini_app != null)
            {
                // C7(b): append the app image URL so the receiver can show a real icon for
                // an app it doesn't have (mini_app.image is absolute for URL-installed apps).
                // Trailing, ||-delimited, backward-compatible — old receivers ignore the extra
                // segment; new receivers guard the index (SingleChatPage app_id_data.Length>3).
                // ★ Sweep F2/B-2: the icon goes through the gate BEFORE it is joined.
                // `mini_app.image` is whatever the package's appinfo.spixi declared, so an
                // outgoing invite must not carry a local file path or a URL form the
                // receiver cannot classify. Gating the field rather than the joined string
                // also means an app NAME containing "||" cannot make the gate edit the
                // wrong segment.
                return $"{app_id}||{mini_app.url}||{mini_app.name}||{safeAppIconUrl(mini_app.image)}"; // TODO pack this information better
            }
            return app_id;
        }

        /* ★★ HANDOVER SWEEP F2 / B-2 — THE APP-INVITE ICON GATE, AND WHY IT MUST BE HERE.
         *
         * The invite is a `||`-delimited string, and its 4th field (added by C7(b), absent
         * at the fork point) becomes an `<img src>` in the CHAT document. It is chosen by
         * the SENDER — a hostile peer writes the stream message itself — so it is peer
         * input on the receiving side, not publisher metadata.
         *
         * THE DEFECT WAS A DISAGREEMENT BETWEEN TWO PREDICATES. The C# receiver admitted
         * the field on `StartsWith("http")`, while the shell decides "is this remote, and
         * therefore subject to the privacy gate" with /^https?:\/\//i. The string
         * `http:/host/x.gif` — ONE slash — passes the first and FAILS the second, so the
         * shell filed it as a LOCAL icon, which is never gated, and the browser then
         * normalised it back into a real remote request. The gate could be stepped over by
         * choosing a URL form.
         *
         * The fix is to remove the disagreement at the source: the field is either a
         * CANONICAL absolute https URL, or it is empty. `Uri.AbsoluteUri` is the parser's
         * own normal form, so whatever `Uri` accepts is emitted in the one shape both
         * predicates read the same way, and whatever it refuses is emitted as empty — the
         * receiver already renders a placeholder for an empty field. This is fail-closed:
         * the default is the refusal.
         *
         * `https` only, and the precedent is in this file: `fetch()` has always required
         * `uri.Scheme == Uri.UriSchemeHttps` for the same publisher's own metadata. A
         * plaintext icon is also a broken tile on Android and Windows already, because
         * `Utils.IsAllowedURL` refuses everything that is not https there.
         *
         * ⚠ BOTH ENDS use the same predicate. getAppInfo above gates the field it builds;
         * sanitizeAppInvite gates the field a PEER built, at the point where their bytes
         * become a stored message (StreamProcessor.handleAppRequest). The second one is
         * what closes the hole — a peer never runs getAppInfo. sanitizeAppInvite rewrites
         * segment 3 because that is the segment the reader uses as the icon
         * (SingleChatPage.loadMessages, app_id_data[3]), so the gate and the reader agree
         * on which field they are talking about. */
        public static string sanitizeAppInvite(string app_info)
        {
            if (string.IsNullOrEmpty(app_info))
            {
                return "";
            }
            string[] parts = app_info.Split("||");
            if (parts.Length < 4)
            {
                return app_info;   // no icon field — the pre-C7(b) shape, unchanged
            }
            parts[3] = safeAppIconUrl(parts[3]);
            return string.Join("||", parts);   // every other segment is preserved exactly
        }

        // The icon predicate. Returns the parser's canonical form of an absolute https
        // URL, or an empty string. It refuses anything else, so an unknown shape is
        // dropped rather than admitted.
        private static string safeAppIconUrl(string image)
        {
            if (string.IsNullOrWhiteSpace(image))
            {
                return "";
            }
            if (!Uri.TryCreate(image.Trim(), UriKind.Absolute, out Uri uri) || uri.Scheme != Uri.UriSchemeHttps)
            {
                return "";
            }
            string canonical = uri.AbsoluteUri;
            if (canonical.Contains("|"))
            {
                // a "|" would add or move a field and re-shape the invite for every reader
                return "";
            }
            return canonical;
        }

        public Dictionary<string, MiniApp> getInstalledApps()
        {
            return appList;
        }

        public MiniAppPage? getAppPage(Address sender_address, byte[] session_id)
        {
            lock (appPages)
            {
                if (appPages.ContainsKey(session_id))
                {
                    if (appPages[session_id].hasUser(sender_address))
                    {
                        return appPages[session_id];
                    }
                }
                return null;
            }
        }

        public MiniAppPage? getAppPageByProtocol(Address sender_address, byte[] protocol_id)
        {
            lock (appPages)
            {
                foreach (var kv in appPages)
                {
                    var page = kv.Value;
                    if (page.hasUser(sender_address)
                        && getApp(page.appId).hasProtocol(protocol_id))
                    {
                        return page;
                    }
                }
                return null;
            }
        }

        public MiniAppPage? getAppPage(Address sender_address, string app_id)
        {
            lock (appPages)
            {
                var pages = appPages.Values.Where(x => x.appId.SequenceEqual(app_id) && x.hasUser(sender_address));
                if (pages.Any())
                {
                    return getAppPage(sender_address, pages.First().sessionId);
                }
                return null;
            }
        }

        public MiniAppPage? getAppPage(Address sender_address)
        {
            lock (appPages)
            {
                var pages = appPages.Values.Where(x => x.hasUser(sender_address));
                if (pages.Any())
                {
                    return getAppPage(sender_address, pages.First().sessionId);
                }
                return null;
            }
        }

        public Dictionary<byte[], MiniAppPage> getAppPages()
        {
            return appPages;
        }

        public void addAppPage(MiniAppPage page)
        {
            lock (appPages)
            {
                appPages.Add(page.sessionId, page);
            }
        }

        public bool removeAppPage(byte[] session_id)
        {
            lock (appPages)
            {
                return appPages.Remove(session_id);
            }
        }

        public MiniAppPage? acceptAppRequest(Address sender_address, byte[] session_id)
        {
            MiniAppPage? app_page = getAppPage(sender_address, session_id);
            if (app_page != null)
            {
                app_page.accepted = true;
                StreamProcessor.sendAppRequestAccept(FriendList.getFriend(sender_address), session_id);
            }
            return app_page;
        }

        public void rejectAppRequest(Address sender_address, byte[] session_id)
        {
            MiniAppPage? app_page = getAppPage(sender_address, session_id);
            if (app_page != null)
            {
                if (removeAppPage(session_id))
                {
                    StreamProcessor.sendAppRequestReject(FriendList.getFriend(sender_address), session_id);
                }
            }
        }

    }
}
