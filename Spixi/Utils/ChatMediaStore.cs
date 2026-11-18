/* ★ photo1a PO-3 / PO-6 (P67 / P68) — the chat media cache's thin glue: the store ENGINE (ChatMediaStoreRules.cs — every
 * rule and its reasons are written there) over the app's own CACHE folder and the app's own account.
 *   root    = Path.Combine(FileSystem.CacheDirectory, "spixi-media1") — C#'s own folder in the app CACHE area (the OS may
 *             clear it at any time: a missing file is a plain miss);
 *   account = the wallet's own primary address (IxianHandler.getWalletStorage().getPrimaryAddress()). No wallet = every
 *             get is a miss and every put / per-chat delete a no-op (wipe needs no account: it removes the whole root).
 * Android only (platformOn): Windows, iOS and Mac keep the old path — there every member returns at once (a miss / a
 * no-op) and touches no disk. SpixiFlags AND-s the two switches (PhotoThumbStore, VoicePeaksStore) with platformOn.
 * ★ review round 1:
 *   F1 — GENERATIONS, no timer: a caller reads generationOf(chat) BEFORE it resolves and decodes a source and hands the
 *        number back with the put (putThumb / putPeaks) and with its memory entry (ifCurrent); a delete that ran in
 *        between — however long ago — moved the number and the put is refused. Every delete moves the number on the
 *        CALLER's thread, before it returns, and clears the registered memory caches after.
 *   F2 — the ORPHAN SWEEP (sweepSoon): once per process, off the caller's thread, the folders no delete path named go —
 *        every folder in the root that is not this account's, and (only when the app's contact list is loaded and NOT
 *        empty) every chat folder whose chat is not in it.
 * ★ review round 2 (G3) + round 6 (m-2): the chat part runs AGAIN whenever the contact list is not the one the last
 *        store call saw (chatMark: the count and an order-free sum — a contact left, or one left and another joined),
 *        and for an EMPTY list only when it is proven: this process read the list with a contact in it, for this
 *        account (chatsSeenOf) — the last contact left. A list that is not loaded, or an empty one that was never read
 *        with a contact in it, sweeps no chat.
 *   F3 — wipeThumbs: the Privacy switch "photo previews" turned OFF removes every kept thumbnail.
 *   F8 — the tree deletes and the header scan run off the caller's thread (the engine: one rename under its lock).
 *   F9 — the harness's doors (harnessOn, harnessChats, harnessSweepArm, deleteSourceNow) are compiled ONLY into
 *        scripts/csh (SPIXI_CSH); the app has no such member.
 * SECURITY (CLAUDE.md ★; docs/contract-photo1a.md § 4): no WebView value reaches this class (the callers pass the page's
 * own friend address, C#'s own message id and a source version built from C#'s own FileInfo / the stored message text);
 * nothing new crosses the bridge; NO log line — there is no line a path, a name, an id or an address could ride.
 * Every member never throws. */
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;

namespace SPIXI
{
    public static class ChatMediaStore
    {
        /** The platforms the store runs on: Android only (no device proof elsewhere in this session). */
#if ANDROID
        public static readonly bool platformOn = true;
#else
        public static readonly bool platformOn = false;
#endif

#if SPIXI_CSH
        /** The harness's door (scripts/csh: ChatMediaStoreTests.cs): run the glue on a platform where platformOn is false.
         *  ★ F9: compiled only with SPIXI_CSH — the app has no such member. */
        internal static bool harnessOn = false;

        private static bool active
        {
            get { return platformOn || harnessOn; }
        }
#else
        private static bool active
        {
            get { return platformOn; }
        }
#endif

        private static readonly object gate = new object();
        private static ChatMediaStoreRules? engineNow;   // the engine of the account seen last (under gate)
        private static Address? accountRef;              // …and the address object its text came from
        private static string? accountText;
        private static string? engineRoot;               // the root text engineNow was opened with
        private static string? rootNow;
        private static readonly List<Action> memoryClears = new List<Action>();   // under gate

        /** C#'s own folder in the app CACHE area; null = not known. Read once per process in the app (a fixed string). */
        private static string? rootOf()
        {
            string? r = rootNow;
#if SPIXI_CSH
            if (harnessOn)
            {
                r = null;   // the harness moves the cache folder between tests: read it every time
            }
#endif
            if (r != null)
            {
                return r;
            }
            try
            {
                string dir = FileSystem.CacheDirectory;
                r = string.IsNullOrEmpty(dir) ? null : Path.Combine(dir, ChatMediaStoreRules.RootFolderName);
            }
            catch (Exception)
            {
                r = null;
            }
            rootNow = r;
            return r;
        }

        /** The engine for the account that is loaded NOW; null = the store is off here, or there is no wallet. */
        private static ChatMediaStoreRules? engine()
        {
            ChatMediaStoreRules? e = engineOf();
            if (e != null)
            {
                sweepSoon(e);   // ★ F2: the orphan sweep's safe point — a wallet is loaded (once per process; cheap after)
            }
            return e;
        }

        private static ChatMediaStoreRules? engineOf()
        {
            if (!active)
            {
                return null;
            }
            try
            {
                Address? own = IxianHandler.getWalletStorage()?.getPrimaryAddress();   // throws when no wallet is loaded
                string? root = rootOf();
                if (own == null || root == null)
                {
                    return null;
                }
                lock (gate)
                {
                    bool sameRoot = string.Equals(root, engineRoot, StringComparison.Ordinal);
                    if (engineNow != null && sameRoot && ReferenceEquals(own, accountRef))
                    {
                        return engineNow;   // the same wallet object as last time: its text is not built again
                    }
                    string text = own.ToString();
                    if (engineNow == null || !sameRoot || !string.Equals(text, accountText, StringComparison.Ordinal))
                    {
                        engineNow = ChatMediaStoreRules.open(root, text);   // null = refused (never a half-made engine)
                    }
                    accountRef = engineNow != null ? own : null;
                    accountText = engineNow != null ? text : null;
                    engineRoot = engineNow != null ? root : null;
                    return engineNow;
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static string? textOf(Address? chat)
        {
            try
            {
                return chat?.ToString();
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** A page-side MEMORY cache of what this store keeps gives its clear here: every delete below runs it, so the
         *  bytes leave the memory with the files. (SingleChatPage's thumbnail LRU, its peaks LRU, its "no preview" marks.) */
        public static void onDelete(Action clear)
        {
            if (clear == null)
            {
                return;
            }
            lock (gate)
            {
                memoryClears.Add(clear);
            }
        }

        private static void clearMemory()
        {
            Action[] clears;
            lock (gate)
            {
                clears = memoryClears.ToArray();
            }
            foreach (Action c in clears)
            {
                try { c(); } catch (Exception) { }
            }
        }

        // ———————————————————————————— the generation (★ review round 1, F1) ————————————————————————————

        /** What a caller reads BEFORE it resolves and decodes a source of `chat` — as early as it can: when the job is
         *  made from a row it knows to be there — and hands back with putThumb / putPeaks / ifCurrent. Any delete that
         *  concerns the chat after this read (the message, the chat, a source file, a wipe, the sweep) moves the number:
         *  the put is refused, whenever it comes. ChatMediaStoreRules.NoGeneration (-1) = no store here / no wallet / no
         *  chat: a put with it is refused. Cheap (one lock, no disk). */
        public static long generationOf(Address? chat)
        {
            try { return engine()?.generation(textOf(chat)) ?? ChatMediaStoreRules.NoGeneration; } catch (Exception) { return ChatMediaStoreRules.NoGeneration; }
        }

        /** The caller's MEMORY entry (reader n1): `remember` runs only when no delete moved `chat`'s generation since
         *  `gen` was read — under the store's lock, so a delete either sees the entry (and clears it) or refuses it.
         *  true = it ran. */
        public static bool ifCurrent(Address? chat, long gen, Action remember)
        {
            try { return engine()?.ifCurrent(textOf(chat), gen, remember) ?? false; } catch (Exception) { return false; }
        }

        /** ★ review round 2 (G6) — the memory entry of ONE message's thumbnail / peaks: as ifCurrent, and refused as well
         *  when the message was deleted (the store remembers it by name) — a job that only starts after the delete keeps
         *  nothing, on disk or in memory. */
        public static bool ifCurrentThumb(Address? chat, string idHex, long gen, Action remember)
        {
            try { return engine()?.ifCurrent(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, gen, remember) ?? false; } catch (Exception) { return false; }
        }

        public static bool ifCurrentPeaks(Address? chat, string idHex, long gen, Action remember)
        {
            try { return engine()?.ifCurrent(ChatMediaStoreRules.KindPeaks, textOf(chat), idHex, gen, remember) ?? false; } catch (Exception) { return false; }
        }

        // ———————————————————————————— the 320 px chat thumbnail (PO-3) ————————————————————————————

        /** What a memory cache keys this thumbnail by (ChatMediaStoreRules.memoryKey); null = no store here / no wallet. */
        public static string? thumbKeyOf(Address? chat, string idHex, string sourceVersion)
        {
            try { return engine()?.memoryKey(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, sourceVersion); } catch (Exception) { return null; }
        }

        /** The kept JPEG of THIS chat's message `idHex` made from exactly `sourceVersion`, or null (a miss). */
        public static byte[]? getThumb(Address? chat, string idHex, string sourceVersion)
        {
            try { return engine()?.get(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, sourceVersion); } catch (Exception) { return null; }
        }

        /** `gen` = generationOf(chat) as the caller read it before the decode (★ F1). */
        public static void putThumb(Address? chat, string idHex, string sourceVersion, byte[]? jpeg, long gen)
        {
            try { engine()?.put(ChatMediaStoreRules.KindThumb, textOf(chat), idHex, sourceVersion, jpeg, gen); } catch (Exception) { }
        }

        // ———————————————————————————— a voice message's duration + peaks (PO-6) ————————————————————————————

        public static string? peaksKeyOf(Address? chat, string idHex, string sourceVersion)
        {
            try { return engine()?.memoryKey(ChatMediaStoreRules.KindPeaks, textOf(chat), idHex, sourceVersion); } catch (Exception) { return null; }
        }

        /** The kept "<durMs>|<peaksCsv>" of THIS chat's message `idHex` made from exactly `sourceVersion`, or null. */
        public static string? getPeaks(Address? chat, string idHex, string sourceVersion)
        {
            try
            {
                byte[]? b = engine()?.get(ChatMediaStoreRules.KindPeaks, textOf(chat), idHex, sourceVersion);
                return b == null ? null : System.Text.Encoding.ASCII.GetString(b);   // the read checked the grammar: ASCII digits, ',' and '|'
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** `gen` = generationOf(chat) as the caller read it before the decode (★ F1). */
        public static void putPeaks(Address? chat, string idHex, string sourceVersion, string? info, long gen)
        {
            try
            {
                if (!ChatMediaStoreRules.peaksInfoOk(info))
                {
                    return;
                }
                engine()?.put(ChatMediaStoreRules.KindPeaks, textOf(chat), idHex, sourceVersion, System.Text.Encoding.ASCII.GetBytes(info!), gen);
            }
            catch (Exception)
            {
            }
        }

        // ———————————————————————————— the deletes (docs/contract-photo1a.md § 4.4) ————————————————————————————

        /** A message is deleted (mine, or the peer's delete): its thumbnail and its peaks go. */
        public static void deleteMessage(Address? chat, byte[]? msgId)
        {
            if (!active)
            {
                return;
            }
            try { engine()?.deleteMessage(textOf(chat), ChatMediaStoreRules.idHexOfBytes(msgId)); } catch (Exception) { }
            clearMemory();
        }

        /** A chat's history is deleted, the contact is removed, the group is left, a request is declined, the contact's
         *  files are purged. The generation moves and the folder leaves its place before this returns; the tree delete
         *  runs off the caller's thread (★ F8). */
        public static void deleteChat(Address? chat)
        {
            if (!active)
            {
                return;
            }
            try { engine()?.deleteChat(textOf(chat)); } catch (Exception) { }
            clearMemory();
        }

        /** A file was deleted from the device by its PATH (the Downloads list, chat info "Delete from this device":
         *  C#'s own resolved path, no message at hand): what was made from that file goes. The generation moves before
         *  this returns; the header scan runs off the caller's thread. */
        public static void deleteSource(string? path)
        {
            if (!active || string.IsNullOrEmpty(path))
            {
                return;
            }
            try { engine()?.deleteSourceSoon(path); } catch (Exception) { }
            clearMemory();
        }

#if SPIXI_CSH
        /** The harness's door to the same call, the scan on the caller's thread (★ F9: SPIXI_CSH only). */
        internal static int deleteSourceNow(string? path)
        {
            if (!active || string.IsNullOrEmpty(path))
            {
                return 0;
            }
            int n = 0;
            try { n = engine()?.deleteSource(path) ?? 0; } catch (Exception) { n = 0; }
            clearMemory();
            return n;
        }
#endif

        /** Delete all histories / all downloads, the account wipe, the account restore, a NEW account: the whole store
         *  goes — every account's folder. Needs no wallet. Every generation moves and every folder leaves its place before
         *  this returns; the tree deletes run off the caller's thread (★ F8). */
        public static void wipe()
        {
            if (!active)
            {
                return;
            }
            try
            {
                lock (gate)
                {
                    engineNow = null;
                    accountRef = null;
                    accountText = null;
                    engineRoot = null;
                }
                ChatMediaStoreRules.wipe(rootOf());
            }
            catch (Exception)
            {
            }
            clearMemory();
        }

        /** ★ review round 1 (F3) — the Privacy switch "photo previews" went OFF: every kept THUMBNAIL goes (every
         *  account), and the memory caches are cleared. The peaks stay: a waveform is not a photo preview, and the switch
         *  does not turn it off. Needs no wallet. The generations move before this returns (a thumbnail that is being
         *  made is not kept); the file deletes run off the caller's thread. */
        public static void wipeThumbs()
        {
            if (!active)
            {
                return;
            }
            try { ChatMediaStoreRules.wipeKind(rootOf(), ChatMediaStoreRules.KindThumb); } catch (Exception) { }
            clearMemory();
        }

        // ———————————————————————————— the orphan sweep (★ review round 1, F2) ————————————————————————————

        /* What is still owed, as bits: 1 = the folders in the root that are not this account's · 2 = this account's chat
         * folders whose chat the app does not have. Each part runs once per process — the chat part again whenever the
         * contact list CHANGED since the last store call (G3 / m-2, below). The safe point: a store call that found a
         * wallet (engine()) — the first one runs part 1; part 2 waits for a call at which the app's contact list is
         * loaded AND not empty (FriendList.contactsLoaded, FriendList.friends — an empty list can be a load that failed,
         * #565 / #584: an empty list that was never seen with a contact in it never empties the store; a user with no
         * contact at all keeps what is there until a delete path or a wipe names it). An EMPTY list sweeps only when it
         * is PROVEN (chatsSeenOf, below). Off the caller's thread; never on the UI thread. */
        private const int SweepOthers = 1, SweepChats = 2;
        private static int sweepOwed = SweepOthers | SweepChats;
        private static int sweepChatTries = 3;   // part 2 is given back at most this often (a list that could not be read)

#if SPIXI_CSH
        /** The harness's doors (★ F9: SPIXI_CSH only): the app's contact list as address texts (null = not loaded), and
         *  "a new process" for the sweep (armed = false: no sweep runs — the other glue tests keep two accounts in one root). */
        internal static Func<List<string>?>? harnessChats;
        private static bool harnessSweepOff = false;   // harnessSweepArm(false): no sweep at all, not even the re-arm (tests that keep two accounts in one root)

        internal static void harnessSweepArm(bool armed)
        {
            Interlocked.Exchange(ref sweepOwed, armed ? (SweepOthers | SweepChats) : 0);
            Interlocked.Exchange(ref sweepChatTries, 3);
            Interlocked.Exchange(ref chatMarkSeen, 0);
            chatsSeenOf = null;
            harnessSweepOff = !armed;
        }
#endif

        /** What the app's contact list looks like NOW — cheap: no lock, no copy, no text built (every store call asks,
         *  also on the main thread). `loaded`, `count` (0 = not loaded, or EMPTY) and the returned MARK: 0 = not loaded;
         *  else a number made of the count and an ORDER-FREE sum over the entries (the last 8 bytes of each address — an
         *  address is hash output). It moves when a contact leaves OR joins — also when one left and another joined
         *  between two store calls (★ review round 6, m-2: the count alone stayed equal there) — and not when the list
         *  is only sorted again. Read without the list's lock: a read that overlaps a change can give a number that is
         *  neither the old nor the new one — then the mark moved, which is all it has to say; the sweep reads the list
         *  again, under its lock (chatsNow). */
        private static long chatMark(out int count, out bool loaded)
        {
            count = 0;
            loaded = false;
            try
            {
                ulong sum = 0;
                int n;
#if SPIXI_CSH
                List<string>? list = harnessChats?.Invoke();
                if (list == null)
                {
                    return 0;
                }
                n = list.Count;
                for (int i = 0; i < n; i++)
                {
                    ulong v = 0;
                    foreach (char ch in list[i] ?? "")
                    {
                        v = unchecked(v * 1099511628211UL + ch);
                    }
                    sum = unchecked(sum + v * 0x9E3779B97F4A7C15UL + 0x632BE59BD9B4E019UL);
                }
#else
                if (!FriendList.contactsLoaded)
                {
                    return 0;
                }
                List<Friend> list = FriendList.friends;   // the reference ONCE: Core puts a new list in the field when it sorts
                n = list.Count;
                for (int i = 0; i < n; i++)
                {
                    byte[]? a = list[i]?.walletAddress?.addressNoChecksum;
                    ulong v = 0;
                    if (a != null)
                    {
                        for (int k = Math.Max(0, a.Length - 8); k < a.Length; k++)
                        {
                            v = (v << 8) | a[k];
                        }
                    }
                    sum = unchecked(sum + v * 0x9E3779B97F4A7C15UL + 0x632BE59BD9B4E019UL);
                }
#endif
                loaded = true;
                count = n;
                return unchecked((long)((sum << 1) | 1UL));   // never 0: "loaded" differs from "not loaded", also when EMPTY
            }
            catch (Exception)
            {
                count = 0;
                loaded = false;
                return -1;   // the list changed under the read: "not the list the last call saw" — the next call reads again
            }
        }

        /* ★ review round 2 (G3 / F-3) + round 6 (m-2): the list's MARK as the last store call saw it. When it MOVED — a
         * contact, a request or a room left the list (also by a path in a file this batch may not edit: the Chats list's
         * decline, Core's own removals, the heals, the dev unseed), or one left and another joined — the chat part of the
         * sweep is owed AGAIN, so that chat's folder goes at this store call and not at the next process start. (A contact
         * that only joined moves it too: that sweep finds nothing — the sweep, not the mark, says what is an orphan.)
         * The bit stays owed across a drop to NO contact; whether an empty list may sweep is chatsSeenOf's question. */
        private static long chatMarkSeen = 0;

        /* ★ review round 6 (m-2): the account (its folder name) for which THIS process READ the contact list loaded with at
         * least one entry (chatsNow, under the list's lock); null = never. Only then is a later "loaded and EMPTY" a
         * proven list — the last contact left — and the chat sweep runs with an empty keep-set (the last contact's
         * orphan folder waited for the next process). An empty list in a process that never read a contact, a list that
         * is not loaded, a list read for another account: never — it sweeps no chat. */
        private static volatile string? chatsSeenOf = null;

        private static bool chatsSeenFor(ChatMediaStoreRules e)
        {
            return string.Equals(chatsSeenOf, e.accountFolder, StringComparison.Ordinal);
        }

        /** The chats the app has NOW, as the texts the store names chat folders from (Address.ToString — textOf, the same
         *  call every put and get of a page's friend makes); null = not loaded, or one of them cannot be named: then no
         *  chat folder is swept. An EMPTY list = loaded, no contact (★ m-2: the caller sweeps with it only when it is
         *  proven — chatsSeenFor). Read as the app reads the list elsewhere: a copy under the list's own lock. */
        private static List<string>? chatsNow()
        {
            try
            {
                List<string> texts = new List<string>();
#if SPIXI_CSH
                List<string>? list = harnessChats?.Invoke();
                if (list == null)
                {
                    return null;
                }
                texts.AddRange(list);
#else
                if (!FriendList.contactsLoaded)
                {
                    return null;
                }
                List<Friend> friends;
                lock (FriendList.friends)
                {
                    friends = new List<Friend>(FriendList.friends);
                }
                foreach (Friend f in friends)
                {
                    string? text = textOf(f?.walletAddress);
                    if (text == null)
                    {
                        return null;
                    }
                    texts.Add(text);
                }
#endif
                return texts;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** Take the bits of `want` that are still owed (each bit is taken once). */
        private static int takeSweep(int want)
        {
            while (true)
            {
                int owed = Volatile.Read(ref sweepOwed);
                int take = owed & want;
                if (take == 0)
                {
                    return 0;
                }
                if (Interlocked.CompareExchange(ref sweepOwed, owed & ~take, owed) == owed)
                {
                    return take;
                }
            }
        }

        private static void giveSweepBack(int bits)
        {
            while (true)
            {
                int owed = Volatile.Read(ref sweepOwed);
                if (Interlocked.CompareExchange(ref sweepOwed, owed | bits, owed) == owed)
                {
                    return;
                }
            }
        }

        private static void sweepSoon(ChatMediaStoreRules e)
        {
            try
            {
#if SPIXI_CSH
                if (harnessSweepOff)
                {
                    return;
                }
#endif
                long mark = chatMark(out int count, out bool loaded);
                if (Interlocked.Exchange(ref chatMarkSeen, mark) != mark)
                {
                    Interlocked.Exchange(ref sweepChatTries, 3);
                    giveSweepBack(SweepChats);   // ★ G3 / m-2: not the list the last store call saw — a contact may have left it
                }
                if (Volatile.Read(ref sweepOwed) == 0)
                {
                    return;   // both parts ran and the list did not change since
                }
                // the chat part runs for a list with a contact in it, or for a PROVEN empty one; else it stays owed
                bool chatsReady = count > 0 || (loaded && chatsSeenFor(e));
                int take = takeSweep(chatsReady ? (SweepOthers | SweepChats) : SweepOthers);
                if (take == 0)
                {
                    return;
                }
                ChatMediaStoreRules.runLater(() =>
                {
                    if (!ReferenceEquals(engineOf(), e))
                    {
                        giveSweepBack(take);   // the account changed in between: nothing is swept with the old one
                        return;
                    }
                    List<string>? chats = (take & SweepChats) != 0 ? chatsNow() : null;
                    bool provenEmpty = false;
                    if (chats != null && chats.Count > 0)
                    {
                        chatsSeenOf = e.accountFolder;   // ★ m-2: this process read the list with a contact in it, for this account
                    }
                    else if (chats != null)
                    {
                        provenEmpty = chatsSeenFor(e);   // loaded and EMPTY: a list only when a contact was read before
                        if (!provenEmpty)
                        {
                            chats = null;                // …else it can be a load that failed: no chat folder is swept
                        }
                    }
                    if ((take & SweepChats) != 0 && chats == null && Interlocked.Decrement(ref sweepChatTries) >= 0)
                    {
                        giveSweepBack(SweepChats);   // the list could not be read this time: a later store call asks again
                    }
                    if (e.sweepOrphans((take & SweepOthers) != 0, chats, provenEmpty) > 0)
                    {
                        clearMemory();
                    }
                });
            }
            catch (Exception)
            {
            }
        }
    }
}
