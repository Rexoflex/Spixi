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
         * and a LaunchBootView / devMode / theme-name write before the next generatePage
         * invalidates every entry by construction — no per-key bookkeeping, no stale carrier. */
        private static int dictionaryVersion = 0;
        public static int getDictionaryVersion() { return dictionaryVersion; }
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
            dictionaryVersion++;   // ★ Session K: every cached localized document is stale now

            return true;
        }

        public static void addCustomString(string key, string value)
        {
            customStrings.AddOrReplace(key, value);
            localizedStrings.AddOrReplace(key, value);
            dictionaryVersion++;   // ★ Session K: a carrier changed — see getDictionaryVersion
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

        public static void localizeHtml(string html_file_path, string localized_file_path)
        {
            if(!File.Exists(html_file_path))
            {
                Logging.error("HTML File doesn't exist: " + html_file_path);
                return;
            }
            StreamReader sr = File.OpenText(html_file_path);
            StreamWriter sw = File.CreateText(localized_file_path);

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

            sw.Flush();
            sw.Close();
            sw.Dispose();
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
