using IXICore.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
#if IOS || MACCATALYST
using Foundation;
#endif

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ H-14 (#1245, #984; Damir) — A SMALL KEY/VALUE FILE THAT NEVER LEAVES THE DEVICE.
    ///
    /// The app's Preferences are part of the system backup (Android full backup / data extraction, iCloud / iTunes),
    /// so `ignored_requests` (the addresses of DECLINED contact requests, SRequestIgnore) and `push_trace_salt`
    /// (the per-install salt of the push trace tags, SPushPrefsShare) travelled with every device backup. They live
    /// here instead: ONE JSON object of string values in <c>&lt;spixiUserFolder&gt;/localonly.json</c>, excluded from
    /// backups — Android `Resources/xml/backup_rules.xml` + `data_extraction_rules.xml` ("Spixi/localonly.json"),
    /// iOS / Mac `NSUrl.IsExcludedFromBackupKey` on every write. Windows has no device backup.
    ///
    /// Migration: <see cref="getMigrating"/> moves an old Preferences value in ONCE (when the file has no value for
    /// that key yet) and then removes the Preferences key, so the backed-up copy disappears on the first read.
    /// The file name is C#'s own constant; nothing from a WebView reaches it. Writes are atomic (temp + move).
    /// Logs: fixed words + an exception TYPE only (the values are addresses / a salt). Never throws.
    /// </summary>
    public static class SLocalOnlyStore
    {
        public const string FILE_NAME = "localonly.json";

        /// <summary>The folder of the file; the app's user folder. Settable for the C# harness only.</summary>
        public static Func<string> folder = () => Config.spixiUserFolder;

        private static readonly object gate = new object();
        private static Dictionary<string, string>? cache;
        private static readonly HashSet<string> migrated = new HashSet<string>(StringComparer.Ordinal);
        /* ★ S9 A3 #46 r1 (MINOR-3): the deferred writer — a change through setDeferred marks the map dirty and ONE background
         * write follows DeferMs later (coalescing every change in between); `generation` moves on clearAll so a write that
         * was scheduled before an account wipe never brings the file back. */
        public const int DeferMs = 400;
        private static bool dirty = false;
        private static bool flushScheduled = false;
        private static int generation = 0;

        public static string path() => Path.Combine(folder(), FILE_NAME);

        private static Dictionary<string, string> load()
        {
            if (cache != null) return cache;
            Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.Ordinal);
            try
            {
                string p = path();
                if (File.Exists(p))
                {
                    using JsonDocument doc = JsonDocument.Parse(File.ReadAllBytes(p));
                    if (doc.RootElement.ValueKind == JsonValueKind.Object)
                    {
                        foreach (JsonProperty prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.Value.ValueKind == JsonValueKind.String)
                            {
                                map[prop.Name] = prop.Value.GetString() ?? "";
                            }
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("SLocalOnlyStore: the file could not be read (" + e.GetType().Name + ")");
            }
            cache = map;
            return map;
        }

        private static bool save(Dictionary<string, string> map)
        {
            try
            {
                string dir = folder();
                if (!Directory.Exists(dir))
                {
                    // the user folder is created at start (App.xaml.cs); a missing one = a wipe in progress — no file
                    return false;
                }
                string p = path();
                string tmp = p + ".tmp";
                using (MemoryStream ms = new MemoryStream())
                {
                    using (Utf8JsonWriter w = new Utf8JsonWriter(ms))
                    {
                        w.WriteStartObject();
                        foreach (KeyValuePair<string, string> kv in map)
                        {
                            w.WriteString(kv.Key, kv.Value);
                        }
                        w.WriteEndObject();
                    }
                    File.WriteAllBytes(tmp, ms.ToArray());
                }
                File.Move(tmp, p, true);
                excludeFromBackup(p);
                return true;
            }
            catch (Exception e)
            {
                Logging.warn("SLocalOnlyStore: the file could not be written (" + e.GetType().Name + ")");
                return false;
            }
        }

        /// <summary>The value of <paramref name="key"/>, or "" when absent.</summary>
        public static string get(string key)
        {
            if (string.IsNullOrEmpty(key)) return "";
            lock (gate)
            {
                return load().TryGetValue(key, out string? v) ? v : "";
            }
        }

        /// <summary>The value of <paramref name="key"/>; the FIRST call per key (per process) also moves a value from
        /// the Preferences key of the same name into this file (only when the file has none) and removes that
        /// Preferences key. "" when absent.</summary>
        public static string getMigrating(string key)
        {
            if (string.IsNullOrEmpty(key)) return "";
            lock (gate)
            {
                Dictionary<string, string> map = load();
                if (!migrated.Contains(key))
                {
                    try
                    {
                        string old = Microsoft.Maui.Storage.Preferences.Default.Get(key, "");
                        if (!string.IsNullOrEmpty(old) && !map.ContainsKey(key))
                        {
                            map[key] = old;
                            if (!save(map))
                            {
                                // the file could not be written: serve the old value, KEEP the preference, retry next call
                                map.Remove(key);
                                return old;
                            }
                            Logging.info("SLocalOnlyStore: one value moved out of the backed-up preferences");
                        }
                        Microsoft.Maui.Storage.Preferences.Default.Remove(key);
                        migrated.Add(key);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("SLocalOnlyStore: the migration failed (" + e.GetType().Name + ")");
                    }
                }
                return map.TryGetValue(key, out string? v) ? v : "";
            }
        }

        /// <summary>Sets (or, with an empty value, removes) <paramref name="key"/>. True when the file was written.</summary>
        public static bool set(string key, string? value)
        {
            if (string.IsNullOrEmpty(key)) return false;
            lock (gate)
            {
                Dictionary<string, string> map = load();
                if (string.IsNullOrEmpty(value))
                {
                    if (!map.Remove(key)) return true;
                }
                else
                {
                    map[key] = value;
                }
                dirty = false;   // ★ S9 A3: the whole map is written — a pending deferred change rides along
                return save(map);
            }
        }

        public static bool remove(string key) => set(key, null);

        /// <summary>★ S9 A3 #46 r1 (MINOR-3): sets (or, with an empty value, removes) <paramref name="key"/> in memory NOW and
        /// writes the file once, <see cref="DeferMs"/> later, on a background thread — for the per-peer stores whose value is
        /// rewritten on a user action (SAppJoins, SVoicePlayed — up to a few hundred KB —, SPhotoGroups): no file write on the
        /// UI thread, and a burst of changes costs one write. Reads see the new value at once (same in-memory map).</summary>
        public static void setDeferred(string key, string? value)
        {
            if (string.IsNullOrEmpty(key)) return;
            lock (gate)
            {
                Dictionary<string, string> map = load();
                if (string.IsNullOrEmpty(value))
                {
                    if (!map.Remove(key)) return;
                }
                else
                {
                    if (map.TryGetValue(key, out string? old) && old == value) return;
                    map[key] = value;
                }
                dirty = true;
                if (flushScheduled) return;
                flushScheduled = true;
                int g = generation;
                System.Threading.Tasks.Task.Run(async () =>
                {
                    await System.Threading.Tasks.Task.Delay(DeferMs).ConfigureAwait(false);
                    flushIfDirty(g);
                });
            }
        }

        /// <summary>★ S9 A3: write a pending deferred change now (the harness; an app pause may call it). True when nothing
        /// was pending or the write succeeded.</summary>
        public static bool flush()
        {
            lock (gate)
            {
                flushScheduled = false;
                if (!dirty) return true;
                dirty = false;
                return save(load());
            }
        }

        private static void flushIfDirty(int g)
        {
            try
            {
                lock (gate)
                {
                    flushScheduled = false;
                    if (g != generation || !dirty) return;
                    dirty = false;
                    save(load());
                }
            }
            catch (Exception e)
            {
                Logging.warn("SLocalOnlyStore: the deferred write failed (" + e.GetType().Name + ")");
            }
        }

        /// <summary>The account wipe's step: every value goes (the file is deleted).</summary>
        public static void clearAll()
        {
            lock (gate)
            {
                cache = new Dictionary<string, string>(StringComparer.Ordinal);
                generation++;   // ★ S9 A3: a deferred write scheduled before the wipe is dropped
                dirty = false;
                flushScheduled = false;
                try
                {
                    string p = path();
                    if (File.Exists(p)) File.Delete(p);
                    if (File.Exists(p + ".tmp")) File.Delete(p + ".tmp");
                }
                catch (Exception e)
                {
                    Logging.warn("SLocalOnlyStore: the file could not be deleted (" + e.GetType().Name + ")");
                }
            }
        }

        /// <summary>Harness only: forget the in-memory copy and the per-process migration marks.</summary>
        public static void resetForTests()
        {
            lock (gate)
            {
                cache = null;
                migrated.Clear();
                dirty = false;
                flushScheduled = false;
                generation++;
            }
        }

        private static void excludeFromBackup(string p)
        {
#if IOS || MACCATALYST
            try
            {
                using NSUrl url = NSUrl.FromFilename(p);
                if (!url.SetResource(NSUrl.IsExcludedFromBackupKey, NSNumber.FromBoolean(true), out NSError err) && err != null)
                {
                    Logging.warn("SLocalOnlyStore: the backup exclusion failed");
                }
            }
            catch (Exception e)
            {
                Logging.warn("SLocalOnlyStore: the backup exclusion threw (" + e.GetType().Name + ")");
            }
#endif
        }
    }
}
