namespace SPIXI
{
    /* ★ #1177 / #1178 — the file-message rules. PURE (no MAUI, no Core type), so scripts/csh EXECUTES them
     * (FileRowRulesTests.cs). The call sites (SingleChatPage addFile, Node's notification text) are MAUI-bound;
     * scripts/pins-s6/cs.mjs pins that each site calls these rules. */
    public static class FileRowRules
    {
        /** ★ #1177: an accepted incoming transfer with no packet for longer than this is shown as "Paused" (its last %),
         *  not as live. 15 s: a moving transfer asks for a packet per received packet (TransferManager.receiveFileData →
         *  requestFileData), so even a slow link refreshes lastTimeStamp many times in 15 s; and it is well below
         *  Config.packetRequestTimeout (60 s), after which TransferManager.onUpdate re-requests the stalled packet — a
         *  locked phone's transfer is minutes old by the time the chat is reopened. A wrong guess only costs the label
         *  until the next updateFile tick (the shell's live percentage replaces it). */
        public const long PausedAfterSeconds = 15;

        /** ★ #1177: the percentage the receiver last saw — TransferManager.requestFileData's own formula
         *  ((packet - 1) * 100 / (fileSize / packetSize), 0 for packet 0 or a file under one packet), on lastPacket
         *  (the NEXT packet asked for, = updateActivity's argument). Capped at 99: a transfer still listed is not done. */
        public static int receivedPercent(ulong lastPacket, ulong fileSize, int packetSize)
        {
            if (packetSize <= 0)
            {
                return 0;
            }
            ulong totalPackets = fileSize / (ulong)packetSize;
            if (lastPacket == 0 || totalPackets == 0)
            {
                return 0;
            }
            ulong fp = (lastPacket - 1) * 100 / totalPackets;
            return fp > 99 ? 99 : (int)fp;
        }

        /** ★ #1177: addFile's TRAILING argument (the 15th) for a file row C# rebuilds — "live:<pct>" / "paused:<pct>",
         *  or "" when there is nothing to say (outgoing, completed, no transfer, an offer not accepted yet). The shell
         *  shows a progress tile for live / paused instead of the offer; an OLDER shell ignores the argument. */
        public static string transferStateArg(bool incoming, bool completed, bool transferKnown, bool accepted,
            ulong lastPacket, ulong fileSize, int packetSize, long lastActivity, long now)
        {
            if (!incoming || completed || !transferKnown || !accepted || lastActivity <= 0)
            {
                return "";
            }
            int pct = receivedPercent(lastPacket, fileSize, packetSize);
            bool paused = now - lastActivity > PausedAfterSeconds;
            return (paused ? "paused:" : "live:") + pct;
        }

        /* ★★ #1190 (#1173 (3) + (4), #1188 render b) — IS THE FILE OF A FILE ROW ON THIS DEVICE? Only C# can look at the disk;
         * the shell gets ONE word as addFile's 16th argument (`fLocal`): "1" present · "0" not on this device · "" unknown
         * (an older exe sends no argument → "" → today's row). Two pure steps, EXECUTED by scripts/csh (FileRowRulesTests):
         *   localPathCase — WHICH case a row's stored path is (the dev-only [P1] filelocal line names it; never the path);
         *   localArg      — the argument itself.
         * Walk #1172 A-PREVIEW (Damir, Android): my SENT photos lost their preview. A sent file's only record is
         * FriendMessage.filePath = what the picker handed onSendFile (SingleChatPage.onSendFile): the PHOTO button →
         * MainActivity.OnActivityResult `uri.Path` — the PATH PART of a content:// URI ("/document/image:12",
         * "/external/images/media/12", "/picker/0/…") — never a file; the FILE button → MAUI FilePicker FileResult.FullPath,
         * which on Android is a COPY in the app cache (FileSystem.CacheDirectory) when the provider gives no physical path —
         * a cache the OS may clear. Either way SharedItems.localPathOf (Path.IsPathRooted + File.Exists) finds nothing. */

        /** ★ #1190: the case words (fixed lowercase tokens — the [P1] grammar). */
        public const string CaseExists = "exists";
        public const string CaseNone = "none";               // no stored path at all
        public const string CaseBare = "bare";               // a bare name: the live insert before onSendFile sets the path, or the
                                                             // legacy header rebuild (insertMessage, transferId == "") — unknown
        public const string CaseContentUri = "content-uri";  // a content:// URI or its path part (the Android PHOTO button)
        public const string CaseCacheMissing = "cache-missing";   // a copy in the app cache that is gone
        public const string CaseMissing = "missing";         // a real absolute path whose file is gone
        public const string CasePending = "pending";         // ★ #46 r4 m1: not complete (an offer / in flight) — no disk check

        /** ★ #1190: Android content-provider URI PATHS (Uri.Path of MediaStore / DocumentsProvider / the photo picker / Google
         *  Photos) — rooted like a file path but never one. A real Android file path starts /storage, /sdcard, /data or /mnt. */
        private static readonly string[] providerPathPrefixes = { "/document/", "/external/", "/external_primary/", "/internal/", "/picker/", "/picker_get_content/", "/-1/", "/tree/" };

        /** ★ #1190: is `path` absolute? Unix ("/…"), Windows drive ("C:\…", "C:/…") or UNC ("\\…") — decided on the text,
         *  not on the running OS (Path.IsPathRooted differs per platform). */
        public static bool looksAbsolute(string path)
        {
            if (string.IsNullOrEmpty(path))
            {
                return false;
            }
            if (path[0] == '/' || path.StartsWith("\\\\", System.StringComparison.Ordinal))
            {
                return true;
            }
            return path.Length >= 3 && char.IsLetter(path[0]) && path[1] == ':' && (path[2] == '\\' || path[2] == '/');
        }

        /** ★ #1190: which case a stored path is. `resolved` = C#'s own rule found the file (SharedItems.localPathOf);
         *  `cacheDir` = FileSystem.CacheDirectory (null / "" = unknown). Pure text tests — no disk access here. */
        public static string localPathCase(string? storedPath, bool resolved, string? cacheDir)
        {
            if (resolved)
            {
                return CaseExists;
            }
            if (string.IsNullOrEmpty(storedPath))
            {
                return CaseNone;
            }
            if (storedPath.StartsWith("content:", System.StringComparison.OrdinalIgnoreCase))
            {
                return CaseContentUri;
            }
            if (!looksAbsolute(storedPath))
            {
                return CaseBare;
            }
            if (!string.IsNullOrEmpty(cacheDir))
            {
                string dir = cacheDir.TrimEnd('/', '\\');
                if (dir.Length > 0 && storedPath.Length > dir.Length
                    && storedPath.StartsWith(dir, System.StringComparison.Ordinal)
                    && (storedPath[dir.Length] == '/' || storedPath[dir.Length] == '\\'))
                {
                    return CaseCacheMissing;
                }
            }
            if (storedPath[0] == '/')
            {
                foreach (string pre in providerPathPrefixes)
                {
                    if (storedPath.StartsWith(pre, System.StringComparison.Ordinal))
                    {
                        return CaseContentUri;
                    }
                }
            }
            return CaseMissing;
        }

        /** ★ #1190: addFile's 16th argument. "" (say nothing — today's row) for a file not completed (an offer, a download,
         *  my own send in flight — #46 r4 m1: the shell reads "0" on a complete row only) and for a path that says nothing (none / bare: the live insert of my
         *  own send before onSendFile sets the real path, a legacy rebuild). "1" when the file is there, "0" otherwise.
         *  The shell: "0" on a complete row → mine = the compact card "Not available on this device" (no tap); a received
         *  one = "Photo / File deleted from this device" (no tap) — isDeletedReceived. */
        public static string localArg(bool localSender, bool completed, string pathCase)
        {
            if (!completed)
            {
                return "";   // ★ #46 r4 m1: either direction — the shell draws "0" only on a complete row; no disk check for it
            }
            if (pathCase == CaseExists)
            {
                return "1";
            }
            if (pathCase == CaseNone || pathCase == CaseBare)
            {
                return "";
            }
            return "0";
        }

        /** ★ #1190 (#1173 (3)): a RECEIVED file that was downloaded (completed) and whose copy is no longer on this device =
         *  deleted from this device (chat info "Delete from this device" #1154, the Downloads page, the purge on remove, the
         *  OS). Chat info drops it from Media / Files (SharedItems.scan); the chat shows the deleted bubble. */
        public static bool isDeletedReceived(bool localSender, bool completed, string localArgValue)
        {
            return !localSender && completed && localArgValue == "0";
        }

        /** ★ #1178 (#46 F1-3): the longest member name placed in an OS notification; longer → the first MaxMemberNameChars + "…". */
        public const int MaxMemberNameChars = 32;

        /** ★ #1178 (#46 F1-3): a group member nickname is PEER-CONTROLLED and lands in an OS notification. Remove every
         *  control character (char.IsControl: a newline / tab would forge a second notification line) and the bidi
         *  controls (U+202A–U+202E embeddings + overrides, U+2066–U+2069 isolates, U+200E / U+200F marks, U+061C ALM:
         *  an RLO would reverse the text around it — "Ann sent a file" spoofed into another sentence), then trim.
         *  NOT capped here — the address-like test needs the full length. */
        public static string sanitizeMemberName(string? name)
        {
            if (string.IsNullOrEmpty(name))
            {
                return "";
            }
            var sb = new System.Text.StringBuilder(name.Length);
            foreach (char c in name)
            {
                System.Globalization.UnicodeCategory cat = char.GetUnicodeCategory(c);
                if (char.IsControl(c)
                    || cat == System.Globalization.UnicodeCategory.LineSeparator        // #46 r2 (4): U+2028 draws a line break
                    || cat == System.Globalization.UnicodeCategory.ParagraphSeparator   //   U+2029
                    || cat == System.Globalization.UnicodeCategory.Format               //   Cf: ZW(N)J, U+2060–2064, U+FEFF, the bidi marks
                    || (c >= '\u202A' && c <= '\u202E')
                    || (c >= '\u2066' && c <= '\u2069')
                    || c == '\u200E' || c == '\u200F' || c == '\u061C')
                {
                    continue;
                }
                sb.Append(c);
            }
            return sb.ToString().Trim();
        }

        /** ★ #1178: a member name that may stand on a lock screen — empty (after sanitizing), or an address echoed as a
         *  nick (long, no space), is no name. The address-like test is SNotificationPrefs.displayNameFor's own
         *  (Length > 24 && no ' '). WHERE THEY DIFFER (#46 F1-3): displayNameFor middle-truncates an address-like name and
         *  still shows it, and neither strips controls nor caps; here an address-like member is NOT usable (the neutral
         *  text), the test runs on the SANITIZED name, and a usable name is capped (memberNameForNotification). */
        public static bool usableMemberName(string? name)
        {
            string n = sanitizeMemberName(name);
            if (n.Length == 0)
            {
                return false;
            }
            return !(n.Length > 24 && n.IndexOf(' ') < 0);
        }

        /** ★ #1178 (#46 F1-3): the {0} value — sanitized, capped at MaxMemberNameChars + "…" (never splitting a
         *  surrogate pair). Call only for a usableMemberName. */
        public static string memberNameForNotification(string? name)
        {
            string n = sanitizeMemberName(name);
            if (n.Length <= MaxMemberNameChars)
            {
                return n;
            }
            int cut = MaxMemberNameChars;
            if (char.IsHighSurrogate(n[cut - 1]))
            {
                cut--;
            }
            return n.Substring(0, cut).TrimEnd() + "…";
        }

        /** ★ #1178: the notification text KEY for a file OFFER (nothing is received yet — never "File received", never
         *  the file name). showSender = the user's sender-name preference (SNotificationPrefs.showSenderName):
         *   off            → the neutral noun ("New file" / "New photo") — like every other type with the pref off
         *                    ("Payment received", "New Message"): no subject, no name;
         *   on, a 1:1      → "Sent you a file" / "Sent you a photo" (Node prefixes "<Name>: ");
         *   on, a room     → "{0} sent a file" / "{0} sent a photo" with {0} = the member (Node prefixes "<Group>: ");
         *                    a member with no usable name → the neutral noun.
         *  memberArg = the {0} value for the room keys, else null. */
        public static string fileNotificationKey(bool isPhoto, bool isRoom, bool showSender, string? memberName, out string? memberArg)
        {
            memberArg = null;
            string kind = isPhoto ? "photo" : "file";
            if (!showSender)
            {
                return "notification-" + kind + "-neutral";
            }
            if (!isRoom)
            {
                return "notification-" + kind;
            }
            if (!usableMemberName(memberName))
            {
                return "notification-" + kind + "-neutral";
            }
            memberArg = memberNameForNotification(memberName);   // ★ #46 F1-3: sanitized + capped (peer-controlled)
            return "notification-" + kind + "-group";
        }

        /** ★ #1178: the English fallback for each key (a locale without the key — _SL returns null). */
        public static string fileNotificationFallback(string key)
        {
            switch (key)
            {
                case "notification-file": return "Sent you a file";
                case "notification-photo": return "Sent you a photo";
                case "notification-file-group": return "{0} sent a file";
                case "notification-photo-group": return "{0} sent a photo";
                case "notification-photo-neutral": return "New photo";
                default: return "New file";
            }
        }

        /** ★ #1178: the final text — a room key's {0} filled by plain replacement (a translator's stray brace can never
         *  throw, unlike string.Format); a room template that lost its {0} falls back to the English one. */
        public static string fileNotificationText(string key, string? template, string? memberArg)
        {
            string t = string.IsNullOrEmpty(template) ? fileNotificationFallback(key) : template;
            if (memberArg == null)
            {
                return t;
            }
            if (!t.Contains("{0}"))
            {
                t = fileNotificationFallback(key);
            }
            return t.Replace("{0}", memberArg);
        }
    }
}
