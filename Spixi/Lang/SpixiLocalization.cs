using IXICore.Meta;
using IXICore.Utils;
using SPIXI.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using Spixi;

namespace SPIXI.Lang
{
    public static class SpixiLocalization
    {
        private static List<string> languages = new List<string> {
            "cn-cn",
            "en-us",
            "es-co",
            "de-de",
            "id-id",
            "fr-fr",
            "it-it",
            "ja-jp",
            "lt-lt",
            "pt-br",
            "ru-ru",
            "sl-si",
            "sr-sp"
        };

        private static bool loaded = false;
        private static string language = "en-us";
        private static Dictionary<string, string> localizedStrings = new Dictionary<string, string>();
        /* ★ Session K — THE DICTIONARY VERSION. Every mutation of what `*SL{}` resolves to
         * (a language load, a custom string) bumps it. `generatePage` keys its localized-HTML
         * cache on (file, version): a chat open re-localizes nothing when nothing changed,
         * and any carrier write invalidates EVERY entry by construction — no per-key
         * bookkeeping.
         *
         * ⚠ #46 A6 — WHAT THIS DOES NOT CLAIM. The old wording here ended "no stale carrier",
         * which overclaims: the version guarantees only that no CACHED DOCUMENT survives a
         * carrier change. A carrier written AFTER a live document was generated (SettingsPage
         * writing SpixiThemeName without reloading settings.html, the runtime
         * devMode toggle, the authoritative AndroidInsetTop from the insets listener) is
         * pre-existing live-document staleness that the shells' own push paths fix — this
         * cache neither causes it nor repairs it. See generatePage's docblock.
         *
         * ★ #46 A5 — MEMORY MODEL. DEFECT: a plain `int` bumped with `++` (a non-atomic
         * read-modify-write) and read with a plain load, while the readers are page
         * constructors on whichever thread builds them. PREVENTS: two concurrent bumps
         * collapsing into one — a version that never changes for the second mutation leaves
         * every cached document keyed to a dictionary that no longer exists — and a reader
         * parked on a register-cached version that never observes the bump at all.
         * REVERSAL: change `Interlocked.Increment(ref dictionaryVersion)` back to
         * `dictionaryVersion++` and `Volatile.Read` back to a bare field read; the cache then
         * has no ordering guarantee between the mutation and the readers that key on it, and
         * a lost bump serves stale localized HTML for the rest of the process. The field is
         * deliberately NOT declared `volatile` — that would make every `ref` pass here
         * CS0420 ("a reference to a volatile field will not be treated as volatile"), which
         * is precisely the guarantee Interlocked already provides. */
        private static int dictionaryVersion = 0;
        public static int getDictionaryVersion() { return System.Threading.Volatile.Read(ref dictionaryVersion); }
        /* ★ AND-7 (#401): AndroidInsetTop is SEEDED here, not only registered by
         * MainActivity. Every shell head carries the carrier now, and an unknown *SL{}
         * key is not silently empty — localizeHtml LOGS an error for it (both `Unknown localization key` sites) on
         * every page load. Seeding "0" means iOS, MacCatalyst and Windows resolve the
         * carrier cleanly to the value that is already correct for them (their chrome
         * reads env(safe-area-inset-top), which the platform populates), and only
         * Android ever overwrites it. */
        private static Dictionary<string, string> customStrings = new Dictionary<string, string>()
        {
            { "AndroidInsetTop", "0" }
        };

        public static bool loadLanguage(string lang)
        {
            loaded = false;

            // N4 (#379, loop r1 MINOR-3): remember the RESOLVED file code, not the
            // requested one. A variant culture (it-ch, de-at, pt-pt) prefix-resolves
            // to a shipped file, but storing the raw request made getCurrentLanguage()
            // return a code the Utils.cs culture gate and the pickers do not know:
            // translated UI + en-convention amounts + a raw-code picker row.
            string resolved_lang = lang;
            Stream? file_stream = null;
            try
            {
                string lang_file_path = "";
                if (languages.Contains(lang))
                {
                    lang_file_path = Path.Combine("lang", lang + ".txt");
                }
                else
                {
                    string lang_part = lang.Substring(0, lang.IndexOf('-'));
                    string found_lang_part = languages.Find(x => x.StartsWith(lang_part))!;
                    if (found_lang_part != null)
                    {
                        lang_file_path = Path.Combine("lang", found_lang_part + ".txt");
                        resolved_lang = found_lang_part;
                    }
                }
                if(lang_file_path != "")
                {
                    file_stream = SPlatformUtils.getAsset(lang_file_path);
                }
            }
            catch(Exception)
            {
                file_stream = null;
            }
            if (file_stream == null)
            {
                Logging.error("Unknown language " + lang);
                return false;
            }

            Dictionary<string, string> localized_strings = new();

            StreamReader sr = new(file_stream);
            string last_key = "";

            bool success = true;

            // N65 (#385): the parse must never fail SILENTLY and must never throw out
            // of here. Both used to happen: a malformed line returned false with no
            // log line at all (the caller in SettingsPage then did nothing, said
            // nothing), and a DUPLICATE key made Dictionary.Add throw straight out of
            // loadLanguage — through the WebView Navigating handler that calls it —
            // leaking the open stream on the way. Every failure now names the file and
            // the line, so one ixian.log answers "did the pick fail, and where".
            int line_number = 0;
            try
            {
                while (!sr.EndOfStream)
                {
                    line_number++;
                    string line = sr.ReadLine()!.Trim();
                    if (line == "" || line.StartsWith(";"))
                    {
                        continue;
                    }

                    int sep_index = line.IndexOf("=");
                    if (sep_index == -1)
                    {
                        Logging.error("Language file " + lang + " error on line " + line_number + ": missing '=' separator");
                        success = false;
                        break;
                    }

                    last_key = line.Substring(0, sep_index).Trim();
                    string value = line.Substring(sep_index + 1).Trim();
                    if (last_key == "")
                    {
                        Logging.error("Language file " + lang + " error on line " + line_number + ": empty key");
                        success = false;
                        break;
                    }
                    localized_strings.Add(last_key, value);
                }
            }
            catch (Exception ex)
            {
                Logging.error("Language file " + lang + " failed to parse on line " + line_number + " (key '" + last_key + "'): " + ex.Message);
                success = false;
            }
            finally
            {
                // N65 (#385, review NIT-5): the close belongs in a finally. Leaving it
                // after the catch means a throw from the logging call above still leaks
                // the very stream this batch set out to stop leaking.
                try { sr.Close(); sr.Dispose(); } catch (Exception) { }
                try { file_stream.Close(); file_stream.Dispose(); } catch (Exception) { }
            }

            foreach (var customString in customStrings)
            {
                localized_strings.AddOrReplace(customString.Key, customString.Value);
            }

            if (!success)
            {
                Logging.error("Language " + lang + " was NOT loaded; the previous language stays active.");
                return false;
            }

            loaded = true;
            localizedStrings = localized_strings;
            language = resolved_lang;
            System.Threading.Interlocked.Increment(ref dictionaryVersion);   // ★ Session K: every cached localized document is stale now · #46 A5: atomic

            return true;
        }

        public static void addCustomString(string key, string value)
        {
            customStrings.AddOrReplace(key, value);
            localizedStrings.AddOrReplace(key, value);
            System.Threading.Interlocked.Increment(ref dictionaryVersion);   // ★ Session K: a carrier changed — see getDictionaryVersion · #46 A5: atomic
        }

        public static string getLocalizedString(string key)
        {
            if(!loaded)
            {
                loadLanguage(language);
            }
            if(localizedStrings.ContainsKey(key))
            {
                return localizedStrings[key];
            }
            return null;
        }

        public static string _SL(string key)
        {
            return getLocalizedString(key);
        }

        public static string getCurrentLanguage()
        {
            return language;
        }

        /* ★★ #46 A1 (MAJOR, measured on Windows 2026-09-03) — THE WRITE IS NOW REPORTABLE.
         *
         * DEFECT: this returned `void`. A missing source logged `Logging.error` and returned
         * WITHOUT WRITING; a throw part-way through the copy left a HALF-WRITTEN file behind
         * and propagated out of a page constructor. `generatePage` therefore had no way to
         * distinguish "wrote it" from "did not", and fell back to
         * `File.Exists(localized_file_path)` — which is TRUE for an `ll_*.html` that a
         * PREVIOUS build left in `Documents\Spixi\html`, a folder that survives every wipe.
         *
         * PREVENTS, precisely: (a) marking a stale previous-build document "fresh" for the
         * rest of the process, which serves a completely normal-LOOKING but wrong page — the
         * observed symptom was a LIGHT Account pane under a dark system theme; and (b) a
         * never-deployed page yielding a bare `ERR_FILE_NOT_FOUND`. Session K's version map
         * made this worse, not better: it cut the error line from once per open to once per
         * (file, dictionary version) per process, quieting exactly the failure that fails
         * silently.
         *
         * CONTRACT: `true` ONLY after the writer has flushed and closed — i.e. only when a
         * complete document is on disk. `false` after the existing missing-source
         * `Logging.error`, and `false` from the catch, because a HALF-WRITTEN file must never
         * count as written. Existing callers that ignore the return value stay valid.
         *
         * REVERSAL: change the return type back to `void`, delete the try/catch, and delete
         * the three `return` values. Every caller still compiles (they discard the value),
         * and `generatePage` is forced back onto `File.Exists` — i.e. straight back to
         * serving a previous build's document as if it were this build's, and back to
         * throwing an IO exception out of a page constructor on the UI thread. */
        public static bool localizeHtml(string html_file_path, string localized_file_path)
        {
            if(!File.Exists(html_file_path))
            {
                Logging.error("HTML File doesn't exist: " + html_file_path);
                return false;
            }
            /* ★ r3 R3-6: `?` because null is the DECLARED state on both — the finally below
             * and the `sr = null` / `sw = null` hand-offs after a successful close both depend
             * on it (Spixi.csproj:20 is <Nullable>enable</Nullable>; CS8600 otherwise). */
            StreamReader? sr = null;
            StreamWriter? sw = null;
            /* ★ #46 r2 R2-7: did THIS CALL truncate the target? Only then may the catch delete
             * it. See the catch. */
            bool truncatedTarget = false;
            try
            {
                sr = File.OpenText(html_file_path);
                sw = File.CreateText(localized_file_path);
                truncatedTarget = true;   // CreateText returned: the target is now this call's, and empty

                while (!sr.EndOfStream)
                {
                    string line = sr.ReadLine().Trim();
                    if(line == "")
                    {
                        continue;
                    }
                    while (line.Contains("*SL{"))
                    {
                        string key = line.Substring(line.IndexOf("*SL{") + 4);
                        key = key.Substring(0, key.IndexOf("}"));
                        string value = _SL(key);
                        if (value == null)
                        {
                            Logging.error("Unknown localization key; " + key);
                            value = "";
                        }
                        line = line.Replace("*SL{" + key + "}", value);
                    }
                    sw.WriteLine(line);
                }

                sr.Close();
                sr.Dispose();
                sr = null;

                sw.Flush();
                sw.Close();
                sw.Dispose();
                sw = null;

                return true;   // ⚠ the ONLY true: the writer has flushed and closed
            }
            catch (Exception ex)
            {
                Logging.error("localizeHtml failed writing " + localized_file_path + " from " + html_file_path + ": " + ex);
                /* ★ #46 r2 (pin pass): DELETE the partial file — BUT ONLY THE ONE THIS CALL
                 * TRUNCATED (r2 R2-7). A throw part-way through the copy leaves a TRUNCATED
                 * ll_*.html behind, and the finally below closes it — so it exists.
                 * generatePage then reads `stalePresent = File.Exists(...)` as true and, if the
                 * stream fallback also fails, serves that URL on the "a previous build's
                 * complete document beats a blank app" argument. That argument does NOT cover a
                 * half-written document: it is not a previous build's, it is this run's garbage,
                 * and the two are indistinguishable on disk. Removing it collapses the case to
                 * "nothing there", which the fallback ladder already handles honestly with a
                 * page that names the file.
                 * ⚠ R2-7 — THE GUARD IS `truncatedTarget`, NOT `File.Exists`. Exactly one throw
                 * in this try happens BEFORE `File.CreateText` returns: `File.OpenText(
                 * html_file_path)`, taken after `File.Exists` above already said the source is
                 * there — a sharing violation, an AV lock, a TOCTOU delete. In that case the
                 * writer was never opened and the target is untouched; deleting on File.Exists
                 * alone destroyed a STANDING, COMPLETE previous-build `ll_` file. generatePage
                 * would then read `stalePresent` false and serve the built-in error page
                 * instead of the working document rung ② exists to serve — this catch turning a
                 * transient read failure into a permanent one. `File.CreateText` either returns
                 * with the target created/truncated or throws without touching it, so the flag
                 * is set on the line after it and means exactly what it says.
                 * REVERSAL: drop the delete and a mid-copy failure can render half a screen —
                 * the worst outcome in the ladder, because it looks like a layout bug rather
                 * than a build one. Drop the `truncatedTarget` guard and a locked SOURCE file
                 * deletes a good target. */
                try
                {
                    if (sw != null) { try { sw.Close(); sw.Dispose(); } catch (Exception) { } sw = null; }
                    if (truncatedTarget && File.Exists(localized_file_path)) { File.Delete(localized_file_path); }
                }
                catch (Exception delEx)
                {
                    Logging.error("localizeHtml could not remove the partial file " + localized_file_path + ": " + delEx);
                }
                return false;
            }
            finally
            {
                // The success path nulled both out already; this closes whatever a throw left open.
                try { sr?.Close(); sr?.Dispose(); } catch (Exception) { }
                try { sw?.Close(); sw?.Dispose(); } catch (Exception) { }
            }
        }

        public static string localizeHtml(Stream stream)
        {
            StreamReader sr = new StreamReader(stream);
            /* AND-2 (#330, first Android run 2026-08-11): `lines += line` was
             * QUADRATIC — each += recopies the whole accumulated document, and the
             * redesigned shells are ~22,000 lines / ~1.3MB, so one page load did
             * gigabytes of memory copying ON THE UI THREAD: the 30s+ splash hang
             * and the language-change ANR, both this loop (language re-runs
             * generatePage). Legacy pages were small enough to hide it; the file
             * overload below always streamed (linear), which is why only Android —
             * the sole consumer of this overload — ever hurt. StringBuilder =
             * linear, same output byte-for-byte. */
            var lines = new System.Text.StringBuilder(
                stream.CanSeek ? (int)Math.Min(stream.Length + (stream.Length / 4), int.MaxValue / 2) : 1 << 21);
            while (!sr.EndOfStream)
            {
                string line = sr.ReadLine().Trim();
                if (line == "")
                {
                    continue;
                }
                while (line.Contains("*SL{"))
                {
                    string key = line.Substring(line.IndexOf("*SL{") + 4);
                    key = key.Substring(0, key.IndexOf("}"));
                    string value = _SL(key);
                    if (value == null)
                    {
                        Logging.error("Unknown localization key; " + key);
                        value = "";
                    }
                    line = line.Replace("*SL{" + key + "}", value);
                }
                lines.Append(line);
                lines.Append('\n');
            }

            sr.Close();
            sr.Dispose();

            return lines.ToString();
        }

        private static Dictionary<string, (int argCount, string localizedString)>? testFile(string path)
        {
            Dictionary<string, (int, string)>? keys = new Dictionary<string, (int, string)>();

            Stream file_stream = SPlatformUtils.getAsset(path);

            StreamReader sr = new StreamReader(file_stream);

            int line_count = 0;

            string last_key;

            while (!sr.EndOfStream)
            {
                line_count++;
                string? line = sr.ReadLine()?.Trim();
                if (line == null
                    || line == ""
                    || line.StartsWith(";"))
                {
                    continue;
                }

                int sep_index = line.IndexOf("=");
                if (sep_index == -1)
                {
                    Logging.error("Language file " + path + " error on line: " + line_count + ", missing '=' separator");
                    keys = null;
                    break;
                }

                last_key = line.Substring(0, sep_index).Trim();
                string value = line.Substring(sep_index + 1).Trim();
                if (last_key == "")
                {
                    Logging.error("Language file " + path + " error on line: " + line_count + ", key is empty/null");
                    keys = null;
                    break;
                }

                if(last_key.Contains("\"") || value.Contains("\""))
                {
                    Logging.error("Language file " + path + " error on line: " + line_count + ", '\"' character was used");
                    keys = null;
                    break;
                }

                int arg_count = 0;
                while (value.Contains("{" + arg_count + "}"))
                {
                    arg_count++;
                }
                keys.Add(last_key, (arg_count, value));
            }

            sr.Close();
            sr.Dispose();

            file_stream.Close();
            file_stream.Dispose();

            if (keys?.Count == 0)
            {
                return null;
            }

            return keys;
        }

        public static bool testLanguageFiles(string ref_language)
        {
            var ref_keys = testFile(Path.Combine("lang", ref_language + ".txt"));
            if (ref_keys == null || ref_keys.Count == 0)
            {
                Logging.error("Reference language file " + ref_language + " is empty or invalid");
                return false;
            }
            bool success = true;
            foreach(var language in languages)
            {
                if(language == ref_language)
                {
                    continue;
                }
                var test_keys = testFile(Path.Combine("lang", language + ".txt"));
                if (test_keys == null || test_keys.Count == 0)
                {
                    Logging.error(language + " is empty or invalid");
                    success = false;
                    continue;
                }
                foreach (var ref_key in ref_keys)
                {
                    if(!test_keys.ContainsKey(ref_key.Key))
                    {
                        Logging.error(language + " error, missing key: " + ref_key.Key);
                        success = false;
                        continue;
                    }
                    if (ref_key.Value.localizedString != ""
                        && test_keys[ref_key.Key].localizedString == "")
                    {
                        Logging.error(language + " error, empty value for key: " + ref_key.Key);
                        success = false;
                        continue;
                    }
                    if (test_keys[ref_key.Key].argCount != ref_key.Value.argCount)
                    {
                        Logging.error(language + " error, invalid number of arguments for key " + ref_key.Key);
                        success = false;
                        continue;
                    }
                    if (test_keys[ref_key.Key].localizedString == ref_key.Value.localizedString)
                    {
                        var refValue = ref_key.Value.localizedString.ToLower();
                        if (refValue != "spixi"
                            && refValue != "..."
                            && refValue != ""
                            && refValue != "id"
                            && refValue != "min"
                            && refValue != "1 min")
                        {
                            Logging.warn(language + " warn, value is the same as reference value for key " + ref_key.Key + " = " + ref_key.Value.localizedString);
                        }
                    }
                }
            }
            return success;
        }
    }
}
