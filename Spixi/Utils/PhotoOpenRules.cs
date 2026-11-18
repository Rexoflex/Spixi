/* ★ photo1a (Photo open 1a, #1478: one switch per change; contract docs/contract-photo1a.md § 3 / § 5) — the PURE half of
 * PO-0 (the developer-only [P1] chat lines), PO-1 (SpixiFlags.PhotoMediaAfterPaint: the media of a chat open waits for the
 * shell's paint signal; each push is built off the main thread) and PO-5 (SpixiFlags.PhotoFewerFileChecks: one file-check
 * pass per file row, the 1:1 avatar and the two re-checked preferences once per load). No MAUI type, no Core type: the harness runs it
 * (scripts/csh/PhotoOpenTests.cs). SingleChatPage, SharedItems and SpixiFlags.init call these rules.
 * Log text: fixed words + integers only (the handover-gate log rule); P1Perf.line adds the "[P1] " prefix and drops a body
 * that fails the grammar. */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    public static class PhotoOpenRules
    {
        private static string b(bool v)
        {
            return v ? "1" : "0";
        }

        private static string n(long v)
        {
            return (v < 0 ? 0 : v).ToString(CultureInfo.InvariantCulture);
        }

        /** The one start line of this batch (SpixiFlags.init, all builds): fixed words and 0|1 only. */
        public static string flagsLine(bool mediaAfterPaint, bool fewerChecks, bool thumbStore, bool voiceStore)
        {
            return "[FLAGS] photo1a mediaafterpaint=" + b(mediaAfterPaint) + " fewerchecks=" + b(fewerChecks)
                + " thumbstore=" + b(thumbStore) + " voicestore=" + b(voiceStore);
        }

        /* ---- PO-0: the bodies of the three [P1] chat lines (P1Perf.line adds "[P1] "; a negative number is written as 0) ---- */

        /** `chat onload-main ms=<n>`: onLoad's main-thread part, from its first statement to the Task.Run. */
        public static string onloadMainBody(long ms)
        {
            return "chat onload-main ms=" + n(ms);
        }

        /** `chat read rows=<r> passes=<p> ms=<n>`: loadMessages' disk read (the getMessages passes, the guard, the trim). */
        public static string readBody(int rows, int passes, long ms)
        {
            return "chat read rows=" + n(rows) + " passes=" + n(passes) + " ms=" + n(ms);
        }

        /** `chat media thumbs=<a> hit=<b> pre=<c> voice=<d> vpre=<e> held=<f> q=<g>`. */
        public static string mediaBody(int thumbs, int hit, int pre, int voice, int vpre, bool held, int queued)
        {
            return "chat media thumbs=" + n(thumbs) + " hit=" + n(hit) + " pre=" + n(pre) + " voice=" + n(voice)
                + " vpre=" + n(vpre) + " held=" + b(held) + " q=" + n(queued);
        }

        /* ---- PO-1: the UI command text, built OFF the main thread ---- */

        /** The exact text Utils.sendUiCommand(page, command, arguments) hands to page.sendMessage: every argument base64 of its
         *  UTF-8 (Utils.escapeHtmlParameter) inside single quotes, a null argument as `null`. The drainer thread builds it; the
         *  main thread only calls sendMessage. Keep in step with Utils.sendUiCommand (PhotoOpenTests holds both). */
        public static string uiCommandText(string command, params string?[] arguments)
        {
            string cmd_str = "executeUiCommand(" + command;
            StringBuilder sb = new StringBuilder(cmd_str);
            foreach (string? arg in arguments)
            {
                if (arg != null)
                {
                    sb.Append(",");
                    sb.Append("'" + Convert.ToBase64String(Encoding.UTF8.GetBytes(arg)) + "'");
                }
                else
                {
                    sb.Append(",null");
                }
            }
            sb.Append(");");
            return sb.ToString();
        }

        /* ---- PO-1: the media hold ----
         * open(doc): a chat OPEN starts (onLoad, main thread) — the hold holds this document's media; an older document's
         * held items are dropped. tryHold(doc, item): the load (a pool thread) asks to hold one item; false = enqueue it now
         * (no hold open, another document, or the hold was released already: a release before the hold = pass-through).
         * release(doc): the paint signal or the backstop (main thread) — the held items of THAT document, in order, once;
         * the hold closes. drop(): no hold for the new document (the paint was seen already) — nothing is held, the old items
         * go. Thread-safe (one lock). */
        public sealed class MediaHold<T>
        {
            private readonly object gate = new object();
            private readonly List<T> held = new List<T>();
            private int doc = 0;
            private bool opened = false;

            public void open(int d)
            {
                lock (gate)
                {
                    held.Clear();
                    doc = d;
                    opened = true;
                }
            }

            public void drop()
            {
                lock (gate)
                {
                    held.Clear();
                    opened = false;
                }
            }

            public bool tryHold(int d, T item)
            {
                lock (gate)
                {
                    if (!opened || d != doc)
                    {
                        return false;
                    }
                    held.Add(item);
                    return true;
                }
            }

            public List<T> release(int d)
            {
                lock (gate)
                {
                    if (!opened || d != doc)
                    {
                        return new List<T>();
                    }
                    opened = false;
                    List<T> go = new List<T>(held);
                    held.Clear();
                    return go;
                }
            }

            public bool isOpen
            {
                get
                {
                    lock (gate)
                    {
                        return opened;
                    }
                }
            }

            public int count
            {
                get
                {
                    lock (gate)
                    {
                        return held.Count;
                    }
                }
            }
        }

        /* ---- PO-1: WHEN the hold opens and releases (SingleChatPage calls these at its four points; `on` = the switch) ----
         * load     — onLoad, a new document: the paint not seen yet → the hold opens for `doc`; the paint seen already (a
         *            reload: paintedSeen is reset only at the spare attach) → no hold, the media go at once. Either way an
         *            older document's held items go.
         * tryHold  — loadMessages after messagesDone: a load-more PREPEND never holds; false = enqueue now.
         * paint    — onPainted (the shell's paint signal), AFTER the present: the held items, in order.
         * armed    — armPresentOnPainted: with the paint seen already it presents at once, so the media go too; without it
         *            NOTHING is released (the media wait for the paint or the backstop).
         * backstop — the present's 400 ms backstop: the held items (a shell that never signals still gets its media).
         * Switch OFF: nothing opens, nothing is held, every release is empty. Main thread except tryHold (the load's thread). */
        public sealed class MediaGate<T>
        {
            private readonly MediaHold<T> hold = new MediaHold<T>();

            public void load(bool on, bool paintedSeen, int doc)
            {
                if (!on)
                {
                    return;
                }
                if (paintedSeen)
                {
                    hold.drop();
                }
                else
                {
                    hold.open(doc);
                }
            }

            public bool tryHold(bool on, bool prepend, int doc, T item)
            {
                return on && !prepend && hold.tryHold(doc, item);
            }

            public List<T> paint(bool on, int doc)
            {
                return on ? hold.release(doc) : new List<T>();
            }

            public List<T> armed(bool on, bool paintedSeen, int doc)
            {
                return on && paintedSeen ? hold.release(doc) : new List<T>();
            }

            public List<T> backstop(bool on, int doc)
            {
                return on ? hold.release(doc) : new List<T>();
            }

            public bool isOpen
            {
                get { return hold.isOpen; }
            }

            public int heldCount
            {
                get { return hold.count; }
            }
        }

        /* ---- PO-0: the per-document media counts (the `chat media` line) ----
         * reset(doc) at onLoad; painted(doc) at the paint signal; thumb / voice when a push is SENT (the main thread, after the
         * page's own checks); held(doc) when PO-1 held an item of the document; takeLine(doc, q) once per document (null =
         * another document or written already). Counts of another document are ignored. Thread-safe (one lock). */
        public sealed class MediaCounts
        {
            private readonly object gate = new object();
            private int doc = int.MinValue;
            private bool paintSeen = false;
            private bool heldAny = false;
            private bool written = false;
            private int thumbs = 0, hits = 0, pre = 0, voices = 0, vpre = 0;

            public void reset(int d)
            {
                lock (gate)
                {
                    doc = d;
                    paintSeen = false;
                    heldAny = false;
                    written = false;
                    thumbs = 0;
                    hits = 0;
                    pre = 0;
                    voices = 0;
                    vpre = 0;
                }
            }

            public void painted(int d)
            {
                lock (gate)
                {
                    if (d == doc)
                    {
                        paintSeen = true;
                    }
                }
            }

            public void held(int d)
            {
                lock (gate)
                {
                    if (d == doc)
                    {
                        heldAny = true;
                    }
                }
            }

            public void thumb(int d, bool hit)
            {
                lock (gate)
                {
                    if (d != doc)
                    {
                        return;
                    }
                    thumbs++;
                    if (hit)
                    {
                        hits++;
                    }
                    if (!paintSeen)
                    {
                        pre++;
                    }
                }
            }

            public void voice(int d)
            {
                lock (gate)
                {
                    if (d != doc)
                    {
                        return;
                    }
                    voices++;
                    if (!paintSeen)
                    {
                        vpre++;
                    }
                }
            }

            public string? takeLine(int d, int queued)
            {
                lock (gate)
                {
                    if (d != doc || written)
                    {
                        return null;
                    }
                    written = true;
                    return mediaBody(thumbs, hits, pre, voices, vpre, heldAny, queued);
                }
            }
        }

        /* ---- PO-5 (b): the re-check rule of recheckBurstFileRows ----
         * The load re-checks its "1" file rows only when an in-app delete notification (refreshFileRow / refreshHeldFileRows /
         * deleteMessage, or SingleChatPage.noteFileDeleted for a delete that notifies no page — each moves the PROCESS-WIDE
         * delete generation, #46 r1 C-open MINOR-1) came while the load ran. Switch OFF = always (today). A file deleted
         * outside the app moves nothing: an accepted loss (the base shows the same state a few ms after its re-check). */
        public static bool recheckFileRows(bool fewerChecks, int deleteGenAtStart, int deleteGenNow)
        {
            return !fewerChecks || deleteGenAtStart != deleteGenNow;
        }

        /* ---- PO-5 (a): one file-check pass per file row ----
         * localArgOnce = SharedItems.localArgOf(fm, out pathCase) (FileRowRules.localPathCase + localArg over localPathOf), and
         * it hands back the path it resolved, so fileSizeArgOnce reads the length of THAT path instead of asking localPathOf
         * again. `resolve` = localPathOf(fm) (C#'s own rule), asked at most once and only for a complete row; `cacheDir` =
         * FileSystem.CacheDirectory (asked only where the old code asked it). A throw = "" (unknown), as today. */
        public static string localArgOnce(bool localSender, bool completed, string? storedPath, Func<string?> resolve,
            Func<string?> cacheDir, out string pathCase, out string? path)
        {
            pathCase = FileRowRules.CaseNone;
            path = null;
            try
            {
                if (!completed)
                {
                    pathCase = FileRowRules.CasePending;
                    return "";
                }
                path = resolve();
                pathCase = FileRowRules.localPathCase(storedPath, path != null, cacheDir());
                return FileRowRules.localArg(localSender, completed, pathCase);
            }
            catch (Exception)
            {
                path = null;
                return "";
            }
        }

        /** addFile arg 20 with the path localArgOnce resolved (SingleChatPage.fileSizeArgOf without its second localPathOf):
         *  sent + unfinished = the live outgoing transfer's size (`outgoingOf(id)`: the exact-uid match, 0 = none), else the
         *  length of C#'s own copy (`resolve`: localArgOf does not look at an unfinished row); sent + done + fLocal "1" = the
         *  length of `resolvedPath`; anything else reads nothing. A throw → no size (S11MediaRules.fileSizeArg's "" case). */
        public static string fileSizeArgOnce(bool localSender, bool completed, ulong headerBytes, string fLocal, string? resolvedPath,
            string? transferId, Func<string, ulong> outgoingOf, Func<string?> resolve, Func<string, long> lengthOf)
        {
            ulong outgoing = 0;
            long local = -1;
            try
            {
                if (localSender && !completed)
                {
                    string id = transferId ?? "";
                    if (id.Length > 0)
                    {
                        outgoing = outgoingOf(id);
                    }
                    if (outgoing == 0)
                    {
                        string? p = resolve();
                        if (p != null)
                        {
                            local = lengthOf(p);
                        }
                    }
                }
                else if (localSender && fLocal == "1")
                {
                    if (resolvedPath != null)
                    {
                        local = lengthOf(resolvedPath);
                    }
                }
            }
            catch (Exception)
            {
                outgoing = 0;
                local = -1;
            }
            return S11MediaRules.fileSizeArg(localSender, completed, headerBytes, outgoing, local);
        }

        /* ---- PO-5 (c): the avatar argument of a RECEIVED row of a 1:1 chat ----
         * insertMessage: getAvatarPath(address) ?? the sentinel → Utils.imageToDataUri → avatarForRow, which for a 1:1 chat
         * returns "" for a data: URI (the header avatar is this picture) and the value itself otherwise. Resolved ONCE per
         * load per address (LoadOnce.once) — the same string. */
        public const string AvatarSentinel = "img/spixiavatar.png";

        /** Is a received row's avatar taken from the load's once-values? Only in a batch load (the switch ON) of a 1:1 chat:
         *  a group / bot room row goes through avatarForRow (its once-per-sender setAvatarFor push), as before. */
        public static bool oneToOneAvatarOnce(bool batchLoad, bool bot, bool group)
        {
            return batchLoad && !(bot || group);
        }

        public static string oneToOneRowAvatar(string? avatarPath, Func<string, string> toDataUri)
        {
            string avatar = avatarPath ?? AvatarSentinel;
            avatar = toDataUri(avatar);
            if (string.IsNullOrEmpty(avatar) || !avatar.StartsWith("data:", StringComparison.Ordinal))
            {
                return avatar;
            }
            return "";
        }

        /* ---- PO-5 (c)(d): values read once per load (the load's own thread; locked anyway) ----
         * once(key, compute): the first answer for `key` in this load (a throw stores nothing and goes to the caller);
         * flag(slot, read): a preference read at most once per load, at the first row that needs it (lazily — a load with
         * no such row reads nothing, as before). ★ #46 r1 (C-open MINOR-3): a slot only for a preference that is read LIVE
         * again before its effect (photoPreviews, loadPictures: the drainers re-read both before a push). A preference with an
         * outbound network effect and no later re-check (SPrivacyPrefs.readReceipts → msgRead) has NO slot: it is read per
         * row, so a flip during a load acts at the next row, as at the base. */
        public sealed class LoadOnce
        {
            public const int PhotoPreviews = 0;
            public const int LoadPictures = 1;
            private const int Slots = 2;

            private readonly object gate = new object();
            private readonly Dictionary<string, string> memo = new Dictionary<string, string>(StringComparer.Ordinal);
            private readonly bool?[] flags = new bool?[Slots];

            public string once(string key, Func<string> compute)
            {
                lock (gate)
                {
                    if (memo.TryGetValue(key, out string? v))
                    {
                        return v;
                    }
                }
                string value = compute();
                lock (gate)
                {
                    memo[key] = value;
                }
                return value;
            }

            public bool flag(int slot, Func<bool> read)
            {
                lock (gate)
                {
                    bool? v = flags[slot];
                    if (v.HasValue)
                    {
                        return v.Value;
                    }
                }
                bool value = read();
                lock (gate)
                {
                    flags[slot] = value;
                }
                return value;
            }
        }
    }
}
