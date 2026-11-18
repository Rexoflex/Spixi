/* ★ photo1a PO-3 / PO-6 (P67 / P68) — THE STORE ENGINE of the chat media cache: a 320 px chat thumbnail and a voice
 * message's "<durMs>|<40 peaks>" are made ONCE and kept in the app's CACHE area; the next open reads them instead of
 * decoding the photo / the Opus clip again. Pure .NET (System.IO + SHA-256; no MAUI, no Core type): the harness runs
 * every rule on a temp folder (scripts/csh: ChatMediaStoreTests.cs). The thin MAUI glue is ChatMediaStore.cs; the two
 * callers are SingleChatPage.chatThumbFor / voiceInfoFor.
 *
 * THE RULES (docs/contract-photo1a.md § 4; CLAUDE.md ★ "C# touches no risky parts"):
 *   1. NAMES — C# names every file from its OWN values, hashed:
 *        <root>/<acct16>/<chat16>/<msg64>.t1|.v1
 *        acct16 = hex of the first 8 bytes of SHA-256("spixi-media-acct:" + own primary address)
 *        chat16 = hex of the first 8 bytes of SHA-256("spixi-media-chat:" + acct16 + ":" + chat address)
 *        msg64  = hex of SHA-256("spixi-media-msg:" + chat16 + ":" + idHex + ":" + kind)
 *      A message id is SENDER-CHOSEN bytes: it is only ever hashed into a name (lower-case hex of a hash — no case
 *      twin on a case-blind disk). No name, path or id from the WebView or from the network is ever used as text in a
 *      path. The root is one folder of its own, named RootFolderName, and nothing else is ever deleted or written.
 *   2. NEVER STALE, NEVER FOREIGN — correctness before speed. Each file starts with a header:
 *        magic "SPM1" · kind · SHA-256 of the FULL key text · source tag · payload length · SHA-256 of the payload
 *      The key text is `acct|chat|idHex|kind|sourceVersion|dim` (kind = "t1" / "v1"; dim = 320, the thumbnail edge /
 *      40, the bar count). sourceVersion = for a file `fullPath|size|mtimeTicks` (fileVersion), for an inline voice row
 *      `t|length|SHA-256 of the text` (inlineVersion). A free text (the key text, a peer's message text, a path) is
 *      hashed by its UTF-16 code units — one text, one hash, whatever it holds. So: the source changed
 *      (size, write time, path, text) → another key hash → a MISS; a file of another account or chat under the right
 *      name → another key hash → a MISS; two rows with the same (sender-chosen) id but different files → they never
 *      share a picture. A read checks the magic, the kind, the key hash, the source tag, the length, the payload hash and the payload's
 *      own shape (a thumbnail: ≤ ThumbMaxBytes, starts FF D8 FF · peaks: peaksInfoOk — today's exact grammar). ANY
 *      mismatch = a miss AND the file is deleted. A missing file, a folder the OS cleared, an IO error = a plain miss.
 *      ★ Two header fields more than the contract's four, both only ever make a read STRICTER or a delete WIDER:
 *        · the payload hash — a torn write (power loss between the rename and the data reaching the disk) can leave a
 *          file of the right length with wrong bytes; without the hash it would show as a broken picture;
 *        · the source tag (first 16 bytes of SHA-256("spixi-media-src:" + acct16 + ":" + full path); zeros for an
 *          inline row) — "this file was deleted from the device" can remove its previews WITHOUT knowing the message
 *          (deleteSource; the Downloads list deletes a file by its path, no message at hand).
 *   3. WRITES — a C#-named temp file in the same folder (<32 hex>.tmp, never read), then a move over the final name. A
 *      failed write leaves no file that passes the read checks. Writes and deletes run under ONE lock.
 *   4. DELETES — deleteMessage (both kinds of one message), deleteChat (the chat's folder), deleteSource, wipe (the whole
 *      root, every account), wipeKind (every thumbnail), sweepOrphans (what no delete path named). ★ GENERATIONS — a put
 *      that was being made when a delete ran must not put the file back, however long it takes (review round 1, F1: the
 *      guard was a 60 s timer; a decode that finished later wrote a deleted chat's preview back). Every delete draws a
 *      new number from ONE counter (seq) and writes it — a chat's generation (deleteChat, deleteMessage, the sweep) or the
 *      account's (deleteSource, wipe, wipeKind, the sweep of a whole account folder); a chat's generation NOW is the
 *      greater of the two. The caller reads it (generation) BEFORE it resolves and decodes the source and hands it back
 *      with the put: a put — on disk, and the caller's memory entry through ifCurrent — is refused when the number moved.
 *      No clock is read: there is no time after which a late put is taken. A deleted message is remembered by name as
 *      well (bounded; for the process): a job that only STARTS after its message's delete is refused too.
 *      A folder leaves by ONE rename under the lock (to a trash name of C#'s own inside the root), and the tree delete
 *      runs off the caller's thread; no enumeration and no tree delete ever follows a link (a reparse point).
 *      ★ review round 6 (M-1): every folder is listed WHOLE and ON ITS OWN (entriesOf) before anything in it is renamed
 *      or deleted. The source scan and the thumbnail wipe walk the account off the lock, beside the sweep and the chat
 *      deletes: a folder that left after its parent was listed is "no entries" — never the end of the walk (a scan that
 *      ended there left a deleted file's previews at rest). (n-3): the tree delete of what a sweep or a wipe renamed
 *      runs whatever ended that sweep or wipe early.
 *   5. BOUND — at most MaxFilesPerAccount files AND MaxBytesPerAccount bytes in an account folder. Before a write that
 *      would pass either, the prune runs: every file that is not a store name goes (a temp a kill left), then the OLDEST
 *      store files (by write time, then name) until PruneKeep files and PruneKeepBytes bytes are left. The count is taken
 *      once per process and kept in step.
 *   6. NOTHING ELSE — no log line (no path, name, id or address can leak: there is no line), no network, nothing
 *      crosses the bridge that did not before. Every public member never throws.
 * ★ A change of what the thumbnail maker (SThumbnail.makeJpeg) or the peaks maker emits must bump KindThumbText /
 * KindPeaksText (and the file extension): Android keeps the cache over an app update, and an old picture would be served. */
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI
{
    /** A small thread-safe LRU: a hit moves the entry to the fresh end; over the capacity the OLDEST entry goes. */
    public sealed class ChatMediaLru<TKey, TValue> where TKey : notnull
    {
        private readonly int capacity;
        private readonly Dictionary<TKey, LinkedListNode<KeyValuePair<TKey, TValue>>> map;
        private readonly LinkedList<KeyValuePair<TKey, TValue>> order = new LinkedList<KeyValuePair<TKey, TValue>>();   // First = the freshest

        public ChatMediaLru(int capacity, IEqualityComparer<TKey>? comparer = null)
        {
            this.capacity = Math.Max(1, capacity);
            map = new Dictionary<TKey, LinkedListNode<KeyValuePair<TKey, TValue>>>(comparer);
        }

        public int count
        {
            get { lock (order) { return map.Count; } }
        }

        /** true = held (the value may itself be null: "known to have none"); the entry is now the freshest. */
        public bool tryGet(TKey key, out TValue value)
        {
            lock (order)
            {
                if (key != null && map.TryGetValue(key, out LinkedListNode<KeyValuePair<TKey, TValue>>? node))
                {
                    order.Remove(node);
                    order.AddFirst(node);
                    value = node.Value.Value;
                    return true;
                }
            }
            value = default!;
            return false;
        }

        /** Insert or replace; the entry is the freshest; over the capacity the oldest entries go. */
        public void put(TKey key, TValue value)
        {
            if (key == null)
            {
                return;
            }
            lock (order)
            {
                if (map.TryGetValue(key, out LinkedListNode<KeyValuePair<TKey, TValue>>? had))
                {
                    order.Remove(had);
                    map.Remove(key);
                }
                map[key] = order.AddFirst(new KeyValuePair<TKey, TValue>(key, value));
                while (map.Count > capacity && order.Last != null)
                {
                    map.Remove(order.Last.Value.Key);
                    order.RemoveLast();
                }
            }
        }

        public void clear()
        {
            lock (order)
            {
                map.Clear();
                order.Clear();
            }
        }
    }

    /** ★ photo1a review round 1 (F4): "this key had no preview" (the decoder gave nothing) — remembered for at most
     *  keepMs and NEVER refreshed: a hit does not move the time, a second note of a key that is still held does not
     *  either. So a decode that failed for a passing reason (memory, a file still being written) is tried again after
     *  keepMs at the latest — before, a null sat in the LRU for the whole process and every hit made it the freshest.
     *  The caller passes the time (milliseconds that never go back: Environment.TickCount64). Bounded; thread-safe. */
    public sealed class ChatMediaMisses
    {
        private readonly int capacity;
        private readonly long keepMs;
        private readonly Dictionary<string, long> notedAt = new Dictionary<string, long>(StringComparer.Ordinal);

        public ChatMediaMisses(int capacity, long keepMs)
        {
            this.capacity = Math.Max(1, capacity);
            this.keepMs = Math.Max(1, keepMs);
        }

        public int count
        {
            get { lock (notedAt) { return notedAt.Count; } }
        }

        private bool live(long at, long nowMs)
        {
            long age = nowMs - at;
            return age >= 0 && age < keepMs;
        }

        /** true = this key failed less than keepMs ago: do not decode it again yet. An entry whose time is over goes. */
        public bool has(string? key, long nowMs)
        {
            if (key == null)
            {
                return false;
            }
            lock (notedAt)
            {
                if (!notedAt.TryGetValue(key, out long at))
                {
                    return false;
                }
                if (live(at, nowMs))
                {
                    return true;   // NOT refreshed: the time of the failure stays
                }
                notedAt.Remove(key);
                return false;
            }
        }

        /** The decoder gave nothing for this key, now. A key that is still held keeps its FIRST time. */
        public void note(string? key, long nowMs)
        {
            if (key == null)
            {
                return;
            }
            lock (notedAt)
            {
                if (notedAt.TryGetValue(key, out long at) && live(at, nowMs))
                {
                    return;
                }
                notedAt.Remove(key);
                if (notedAt.Count >= capacity)
                {
                    // bounded: the entries whose time is over go; still full → the oldest one
                    List<string> over = new List<string>();
                    string? oldest = null;
                    long oldestAt = long.MaxValue;
                    foreach (KeyValuePair<string, long> kv in notedAt)
                    {
                        if (!live(kv.Value, nowMs))
                        {
                            over.Add(kv.Key);
                        }
                        else if (kv.Value < oldestAt)
                        {
                            oldestAt = kv.Value;
                            oldest = kv.Key;
                        }
                    }
                    foreach (string k in over)
                    {
                        notedAt.Remove(k);
                    }
                    if (notedAt.Count >= capacity && oldest != null)
                    {
                        notedAt.Remove(oldest);
                    }
                }
                notedAt[key] = nowMs;
            }
        }

        public void clear()
        {
            lock (notedAt)
            {
                notedAt.Clear();
            }
        }
    }

    public sealed class ChatMediaStoreRules
    {
        public const string RootFolderName = "spixi-media1";
        public const char KindThumb = 't';
        public const char KindPeaks = 'v';
        public const string KindThumbText = "t1";   // in the key text and the name hash; the extension is "." + this
        public const string KindPeaksText = "v1";
        public const string TempExtension = ".tmp";

        public const int ThumbPx = 320;                    // = SingleChatPage.ChatThumbPx (the caller refuses the store when they differ)
        public const int ThumbMaxBytes = 64 * 1024;        // = SingleChatPage.ChatThumbMaxBytes
        public const int PeaksMaxBytes = 4096;
        public const int MaxFilesPerAccount = 4096;
        public const int PruneKeep = 3072;                 // what a prune leaves: the next 1024 writes need no prune
        public const long MaxBytesPerAccount = 64L * 1024 * 1024;   // ★ review round 1 (F10): 4096 files of 64 KB would be 268 MB — the folder is bounded in bytes too
        public const long PruneKeepBytes = 48L * 1024 * 1024;       // what a prune leaves in bytes
        public const int MemoryThumbs = 128;               // the page's memory LRU (JPEG bytes)
        public const int MemoryPeaks = 256;                // the page's memory LRU of "<durMs>|<csv>" texts kept by the store's key
        public const int MemoryMisses = 256;               // ★ F4: keys whose decode gave nothing (ChatMediaMisses)
        public const long MissKeepMs = 2 * 60 * 1000;      // ★ F4: …each remembered for at most this long, never refreshed
        public const long NoGeneration = -1;               // ★ F1: "no store / no such chat" — a put that carries it is refused
        public const string TrashPrefix = "del-";          // ★ F8: <root>/del-<32 hex> — a folder on its way out (C#'s own name)
        public const long StrayMinAgeMs = 10 * 60 * 1000;  // a file that is not a store name is left alone while this young (a write in flight)
        private const int DeadNamesMax = 4096;
        private const int ChatGensMax = 1024;
        private const int MaxIdHexChars = 128;
        private const int MaxAddressChars = 128;
        private const int MaxVersionChars = 8192;

        // —— the header ——
        public const int MagicAt = 0, KindAt = 4, KeyHashAt = 5, SourceTagAt = 37, LengthAt = 53, PayloadHashAt = 57, HeaderLength = 89;
        private static readonly byte[] magic = { (byte)'S', (byte)'P', (byte)'M', (byte)'1' };

        /** ONE lock for every write and delete of every store instance (a wipe is root-wide; an instance is per account). */
        private static readonly object writeLock = new object();
        /** ★ F1: the ONE counter every generation is drawn from (under writeLock). It only grows, so two deletes never
         *  write the same number and "the greater of the chat's and the account's" names the LAST delete that concerns a chat. */
        private static long seq = 0;

        public readonly string root;          // the store root (full path; its leaf is RootFolderName)
        public readonly string account;       // the own primary address, as text
        public readonly string accountFolder; // acct16
        private readonly string accountDir;
        private readonly int maxFiles, pruneKeep;
        private readonly long maxBytes, pruneKeepBytes;

        /** What the process knows of ONE account folder — shared by every instance over that folder (under writeLock). */
        private sealed class State
        {
            public int fileCount = -1;   // files in the account folder; -1 = not counted yet
            public long byteCount = 0;   // …and their bytes (valid while fileCount >= 0)
            /* ★ F1 + review round 2 (G2): the two generation stores are WRITTEN under writeLock and READ without it
             * (generation(): Volatile + a concurrent table) — a read never waits for the disk work the lock is held across. */
            public long floor;           // the ACCOUNT's generation (a number of seq): no chat of it is older than this
            public readonly ConcurrentDictionary<string, long> chatGen = new ConcurrentDictionary<string, long>(StringComparer.Ordinal);   // chat16 → the chat's own generation
            public volatile bool evicted;   // dropped from `states`: an instance that still holds it asks for the folder's state again
            public readonly HashSet<string> deadNames = new HashSet<string>(StringComparer.Ordinal);   // "<chat16>/<file name>" of deleted messages
            public readonly Queue<string> deadNamesOrder = new Queue<string>();
        }

        private const int StatesMax = 64;   // the app has one account folder per process; the harness makes many
        private static readonly Dictionary<string, State> states = new Dictionary<string, State>(StringComparer.Ordinal);   // account folder path → its state (under writeLock)
        private volatile State st;   // written under writeLock (state()); read without it by generation()

        /** The state of one account folder — made on first use with a NEW account generation. Over StatesMax every state is
         *  dropped AND marked: its holders come here again, and the new state's generation is above every number handed
         *  out before, so a put that carries an old one is refused (never taken by mistake). Under writeLock. */
        private static State stateOf(string accountDir)
        {
            if (!states.TryGetValue(accountDir, out State? had))
            {
                if (states.Count >= StatesMax)
                {
                    foreach (State s in states.Values)
                    {
                        s.evicted = true;
                    }
                    states.Clear();
                }
                had = new State();
                Volatile.Write(ref had.floor, ++seq);
                states[accountDir] = had;
            }
            return had;
        }

        /** This instance's state. Under writeLock. */
        private State state()
        {
            if (st.evicted)
            {
                st = stateOf(accountDir);
            }
            return st;
        }

        private ChatMediaStoreRules(string root, string account, int maxFiles, int pruneKeep, long maxBytes, long pruneKeepBytes)
        {
            this.root = root;
            this.account = account;
            accountFolder = accountFolderOf(account);
            accountDir = Path.Combine(root, accountFolder);
            this.maxFiles = maxFiles;
            this.pruneKeep = pruneKeep;
            this.maxBytes = maxBytes;
            this.pruneKeepBytes = pruneKeepBytes;
            lock (writeLock)
            {
                st = stateOf(accountDir);
            }
        }

        /** A store over `root` for the account `account` (the own primary address as text); null = refused (a root that is
         *  not a rooted path ending in RootFolderName, an account that is not plain letters and digits). Creates nothing. */
        public static ChatMediaStoreRules? open(string? root, string? account)
        {
            return openWith(root, account, MaxFilesPerAccount, PruneKeep, MaxBytesPerAccount, PruneKeepBytes);
        }

#if SPIXI_CSH
        /** The harness's door (★ review round 1, F9: compiled ONLY into scripts/csh — SPIXI_CSH): small bounds, so the
         *  prune runs on a handful of files. */
        public static ChatMediaStoreRules? open(string? root, string? account, int maxFiles, int pruneKeep, long maxBytes = MaxBytesPerAccount, long pruneKeepBytes = PruneKeepBytes)
        {
            return openWith(root, account, maxFiles, pruneKeep, maxBytes, pruneKeepBytes);
        }

        /** The harness's door: what runs "off the caller's thread" (null = the app's own way, a pool task). */
        internal static Action<Action>? harnessLater;

        /** The harness's door (★ review round 6, M-1 / n-3): called with a folder's full path right AFTER that folder was
         *  listed (entriesOf) — a test takes a chat folder away, or puts a link in its place, "between the listing and
         *  the scan". true = "this listing broke off" (the caller is told: not whole); an exception it throws stands for
         *  a fault the caller of the listing sees. */
        internal static Func<string, bool>? harnessListed;
#endif

        private static ChatMediaStoreRules? openWith(string? root, string? account, int maxFiles, int pruneKeep, long maxBytes, long pruneKeepBytes)
        {
            try
            {
                string? full = storeRootOf(root);
                if (full == null || !isAddressText(account) || maxFiles < 2 || pruneKeep < 1 || pruneKeep >= maxFiles
                    || pruneKeepBytes < 1 || pruneKeepBytes >= maxBytes)
                {
                    return null;
                }
                return new ChatMediaStoreRules(full, account!, maxFiles, pruneKeep, maxBytes, pruneKeepBytes);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** Run `work` off the caller's thread (★ F8: a tree delete, a header scan). `work` never throws. */
        private static void later(Action work)
        {
#if SPIXI_CSH
            Action<Action>? h = harnessLater;
            if (h != null)
            {
                h(work);
                return;
            }
#endif
            try
            {
                Task.Run(work);
            }
            catch (Exception)
            {
                try { work(); } catch (Exception) { }   // no pool: here and now — the work is never dropped
            }
        }

        /** Off the caller's thread, for the glue (the orphan sweep). */
        internal static void runLater(Action work)
        {
            later(() => { try { work(); } catch (Exception) { } });
        }

        // ———————————————————————————— names and keys (pure) ————————————————————————————

        /** The full path of a store root, or null: only a ROOTED path whose last part is exactly RootFolderName — a wipe
         *  deletes this folder with everything in it, so nothing else may ever be taken for it. */
        public static string? storeRootOf(string? root)
        {
            try
            {
                if (string.IsNullOrEmpty(root) || !Path.IsPathRooted(root))
                {
                    return null;
                }
                string full = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
                return string.Equals(Path.GetFileName(full), RootFolderName, StringComparison.Ordinal) ? full : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** An address as text: 1–128 ASCII letters and digits (base58 is a part of that) — so it can never carry the key
         *  text's separator, a path character or a line break. */
        public static bool isAddressText(string? s)
        {
            if (string.IsNullOrEmpty(s) || s.Length > MaxAddressChars)
            {
                return false;
            }
            foreach (char c in s)
            {
                if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')))
                {
                    return false;
                }
            }
            return true;
        }

        /** C#'s message id text (Crypto.hashToString: lower-case hex) → the same in lower case, or null (not 1–128 hex digits). */
        public static string? idHexOf(string? idHex)
        {
            if (string.IsNullOrEmpty(idHex) || idHex.Length > MaxIdHexChars)
            {
                return null;
            }
            char[] o = new char[idHex.Length];
            for (int i = 0; i < idHex.Length; i++)
            {
                char c = idHex[i];
                if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))
                {
                    o[i] = c;
                }
                else if (c >= 'A' && c <= 'F')
                {
                    o[i] = (char)(c + 32);
                }
                else
                {
                    return null;
                }
            }
            return new string(o);
        }

        /** The message id bytes → the text Crypto.hashToString gives (two lower-case hex digits per byte); null = no id. */
        public static string? idHexOfBytes(byte[]? id)
        {
            if (id == null || id.Length == 0 || id.Length * 2 > MaxIdHexChars)
            {
                return null;
            }
            return Convert.ToHexString(id).ToLowerInvariant();
        }

        public static string? kindTextOf(char kind)
        {
            return kind == KindThumb ? KindThumbText : kind == KindPeaks ? KindPeaksText : null;
        }

        /** The key's last field: what the payload was made FOR (the thumbnail edge · the number of bars). */
        public static int dimOf(char kind)
        {
            return kind == KindThumb ? ThumbPx : VoiceCodec.PeakCount;
        }

        private static string hex(byte[] bytes, int count)
        {
            return Convert.ToHexString(bytes, 0, count).ToLowerInvariant();
        }

        private static byte[] sha(string text)
        {
            return SHA256.HashData(Encoding.UTF8.GetBytes(text));
        }

        /** The hash of a text by its UTF-16 code units: one text = one hash, whatever it holds (a peer's text can hold a
         *  lone surrogate, which a UTF-8 encoder would replace — two texts, one hash). */
        private static byte[] shaOfChars(string text)
        {
            return SHA256.HashData(MemoryMarshal.AsBytes(text.AsSpan()));
        }

        public static string accountFolderOf(string account)
        {
            return hex(sha("spixi-media-acct:" + account), 8);
        }

        public static string chatFolderOf(string accountFolder, string chat)
        {
            return hex(sha("spixi-media-chat:" + accountFolder + ":" + chat), 8);
        }

        /** "<64 hex>.t1" / "<64 hex>.v1" — idHex is already idHexOf's output. */
        public static string fileNameOf(string chatFolder, string idHex, char kind)
        {
            string kt = kindTextOf(kind)!;
            return hex(sha("spixi-media-msg:" + chatFolder + ":" + idHex + ":" + kt), 32) + "." + kt;
        }

        /** Is `name` a name this store gives (64 lower-case hex digits + ".t1" / ".v1")? */
        public static bool isStoreName(string? name)
        {
            if (name == null || name.Length != 64 + 3 || name[64] != '.')
            {
                return false;
            }
            string ext = name.Substring(65);
            if (!string.Equals(ext, KindThumbText, StringComparison.Ordinal) && !string.Equals(ext, KindPeaksText, StringComparison.Ordinal))
            {
                return false;
            }
            for (int i = 0; i < 64; i++)
            {
                char c = name[i];
                if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')))
                {
                    return false;
                }
            }
            return true;
        }

        /** `acct|chat|idHex|kind|sourceVersion|dim`, or null (an input the store refuses). Only sourceVersion can hold the
         *  separator; the four fields before it and the one after it cannot — so two different inputs never give one text. */
        public static string? keyText(string? account, string? chat, string? idHex, char kind, string? sourceVersion)
        {
            string? id = idHexOf(idHex);
            string? kt = kindTextOf(kind);
            if (!isAddressText(account) || !isAddressText(chat) || id == null || kt == null
                || string.IsNullOrEmpty(sourceVersion) || sourceVersion.Length > MaxVersionChars)
            {
                return null;
            }
            return account + "|" + chat + "|" + id + "|" + kt + "|" + sourceVersion + "|" + dimOf(kind).ToString(CultureInfo.InvariantCulture);
        }

        /** The source version of a FILE: the old memory cache's key — the full path, the size, the write time. */
        public static string fileVersion(string fullPath, long length, long lastWriteUtcTicks)
        {
            return fullPath + "|" + length.ToString(CultureInfo.InvariantCulture) + "|" + lastWriteUtcTicks.ToString(CultureInfo.InvariantCulture);
        }

        /** The source version of an INLINE voice row: "t|<length>|<SHA-256 hex of the text>". Never rooted, so it is never
         *  taken for a file version. */
        public static string inlineVersion(string text)
        {
            return "t|" + text.Length.ToString(CultureInfo.InvariantCulture) + "|" + hex(shaOfChars(text), 32);
        }

        /** The path inside a fileVersion (everything before its last two number fields), or null (an inline version, or
         *  not that shape). */
        public static string? sourcePathOf(string? sourceVersion)
        {
            if (string.IsNullOrEmpty(sourceVersion))
            {
                return null;
            }
            int b = sourceVersion.LastIndexOf('|');
            int a = b > 0 ? sourceVersion.LastIndexOf('|', b - 1) : -1;
            if (a <= 0 || !allDigits(sourceVersion, a + 1, b) || !allDigits(sourceVersion, b + 1, sourceVersion.Length))
            {
                return null;
            }
            string path = sourceVersion.Substring(0, a);
            try
            {
                return Path.IsPathRooted(path) ? path : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static bool allDigits(string s, int from, int to)
        {
            if (to <= from)
            {
                return false;
            }
            for (int i = from; i < to; i++)
            {
                if (s[i] < '0' || s[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        /** The 16-byte tag of a source FILE of this account (the path as the file system spells it); null = no path. */
        public static byte[]? sourceTagOf(string accountFolder, string? path)
        {
            try
            {
                if (string.IsNullOrEmpty(path) || !Path.IsPathRooted(path))
                {
                    return null;
                }
                byte[] tag = new byte[16];
                Buffer.BlockCopy(shaOfChars("spixi-media-src:" + accountFolder + ":" + Path.GetFullPath(path)), 0, tag, 0, 16);
                return tag;
            }
            catch (Exception)
            {
                return null;
            }
        }

        // ———————————————————————————— the payload rules (pure) ————————————————————————————

        /** A thumbnail the store keeps and serves: 3 … ThumbMaxBytes bytes, a JPEG by its first bytes (FF D8 FF). */
        public static bool thumbOk(byte[]? jpeg)
        {
            return jpeg != null && jpeg.Length >= 3 && jpeg.Length <= ThumbMaxBytes
                && jpeg[0] == 0xFF && jpeg[1] == 0xD8 && jpeg[2] == 0xFF;
        }

        /** "<durMs>|<csv>" EXACTLY as SingleChatPage.voiceInfoOf builds it: durMs = an invariant integer 0 … VoiceCodec.
         *  ParseMaxDurationMs with no sign and no leading zero; csv = VoiceCodec.peaksCsv of VoiceCodec.peaks(…, PeakCount):
         *  exactly PeakCount integers 0 … 100, the same digits, one comma between two. Nothing else passes. */
        public static bool peaksInfoOk(string? info)
        {
            if (string.IsNullOrEmpty(info) || info.Length > PeaksMaxBytes)
            {
                return false;
            }
            int bar = info.IndexOf('|');
            if (bar < 1 || !plainNumber(info, 0, bar, VoiceCodec.ParseMaxDurationMs))
            {
                return false;
            }
            int count = 0;
            int from = bar + 1;
            while (true)
            {
                int comma = info.IndexOf(',', from);
                int to = comma < 0 ? info.Length : comma;
                if (!plainNumber(info, from, to, 100))
                {
                    return false;
                }
                count++;
                if (comma < 0)
                {
                    break;
                }
                from = comma + 1;
            }
            return count == VoiceCodec.PeakCount;
        }

        /** s[from, to) is 1–5 ASCII digits, no leading zero (but "0"), value ≤ max. */
        private static bool plainNumber(string s, int from, int to, int max)
        {
            int n = to - from;
            if (n < 1 || n > 5 || (n > 1 && s[from] == '0'))
            {
                return false;
            }
            int v = 0;
            for (int i = from; i < to; i++)
            {
                char c = s[i];
                if (c < '0' || c > '9')
                {
                    return false;
                }
                v = v * 10 + (c - '0');
            }
            return v <= max;
        }

        private static int maxPayloadOf(char kind)
        {
            return kind == KindThumb ? ThumbMaxBytes : PeaksMaxBytes;
        }

        private static bool payloadOk(char kind, byte[] payload)
        {
            if (kind == KindThumb)
            {
                return thumbOk(payload);
            }
            if (kind != KindPeaks || payload.Length < 1 || payload.Length > PeaksMaxBytes)
            {
                return false;
            }
            foreach (byte b in payload)
            {
                if (b >= 0x80)
                {
                    return false;   // the grammar is ASCII
                }
            }
            return peaksInfoOk(Encoding.ASCII.GetString(payload));
        }

        // ———————————————————————————— the file image (pure) ————————————————————————————

        /** header + payload — what a put writes. */
        public static byte[] encode(char kind, byte[] keyHash, byte[]? sourceTag, byte[] payload)
        {
            byte[] file = new byte[HeaderLength + payload.Length];
            Buffer.BlockCopy(magic, 0, file, MagicAt, magic.Length);
            file[KindAt] = (byte)kind;
            Buffer.BlockCopy(keyHash, 0, file, KeyHashAt, 32);
            if (sourceTag != null)
            {
                Buffer.BlockCopy(sourceTag, 0, file, SourceTagAt, 16);
            }
            int n = payload.Length;
            file[LengthAt] = (byte)n;
            file[LengthAt + 1] = (byte)(n >> 8);
            file[LengthAt + 2] = (byte)(n >> 16);
            file[LengthAt + 3] = (byte)(n >> 24);
            Buffer.BlockCopy(SHA256.HashData(payload), 0, file, PayloadHashAt, 32);
            Buffer.BlockCopy(payload, 0, file, HeaderLength, n);
            return file;
        }

        /** The payload of a file image when EVERY check passes for this kind, this key hash and this source tag (null = an
         *  inline row: sixteen zeros); else null. */
        public static byte[]? decode(char kind, byte[] keyHash, byte[]? sourceTag, byte[]? file)
        {
            if (file == null || keyHash == null || keyHash.Length != 32 || kindTextOf(kind) == null
                || file.Length <= HeaderLength || file.Length > HeaderLength + maxPayloadOf(kind))
            {
                return null;
            }
            for (int i = 0; i < magic.Length; i++)
            {
                if (file[MagicAt + i] != magic[i])
                {
                    return null;
                }
            }
            if (file[KindAt] != (byte)kind)
            {
                return null;
            }
            for (int i = 0; i < 32; i++)
            {
                if (file[KeyHashAt + i] != keyHash[i])
                {
                    return null;
                }
            }
            for (int i = 0; i < 16; i++)
            {
                if (file[SourceTagAt + i] != (sourceTag != null && sourceTag.Length == 16 ? sourceTag[i] : (byte)0))
                {
                    return null;
                }
            }
            long n = (long)file[LengthAt] | ((long)file[LengthAt + 1] << 8) | ((long)file[LengthAt + 2] << 16) | ((long)file[LengthAt + 3] << 24);
            if (n != file.Length - HeaderLength)
            {
                return null;
            }
            byte[] payload = new byte[(int)n];
            Buffer.BlockCopy(file, HeaderLength, payload, 0, payload.Length);
            byte[] sum = SHA256.HashData(payload);
            for (int i = 0; i < 32; i++)
            {
                if (file[PayloadHashAt + i] != sum[i])
                {
                    return null;
                }
            }
            return payloadOk(kind, payload) ? payload : null;
        }

        // ———————————————————————————— one entry's place ————————————————————————————

        private sealed class Place
        {
            public string chatFolder = "";
            public string chatDir = "";
            public string name = "";
            public string path = "";
            public byte[] keyHash = Array.Empty<byte>();
            public byte[]? sourceTag;
        }

        private Place? placeOf(char kind, string? chat, string? idHex, string? sourceVersion)
        {
            string? key = keyText(account, chat, idHex, kind, sourceVersion);
            if (key == null)
            {
                return null;
            }
            Place p = new Place();
            p.chatFolder = chatFolderOf(accountFolder, chat!);
            p.chatDir = Path.Combine(accountDir, p.chatFolder);
            p.name = fileNameOf(p.chatFolder, idHexOf(idHex)!, kind);
            p.path = Path.Combine(p.chatDir, p.name);
            p.keyHash = shaOfChars(key);
            p.sourceTag = sourceTagOf(accountFolder, sourcePathOf(sourceVersion));
            return p;
        }

        /** The hex of the key hash — what a MEMORY cache keys this entry by (the account, the chat, the message, the kind,
         *  the source version and the size are all in it; no path or id as text). null = an input the store refuses. */
        public string? memoryKey(char kind, string? chat, string? idHex, string? sourceVersion)
        {
            try
            {
                string? key = keyText(account, chat, idHex, kind, sourceVersion);
                return key == null ? null : hex(shaOfChars(key), 32);
            }
            catch (Exception)
            {
                return null;
            }
        }

        // ———————————————————————————— get ————————————————————————————

        /** The kept payload of exactly this key, or null (none, or a file that failed a check — that file is deleted). */
        public byte[]? get(char kind, string? chat, string? idHex, string? sourceVersion)
        {
            string? path = null;
            string chatDirOfPath = "";
            try
            {
                Place? p = placeOf(kind, chat, idHex, sourceVersion);
                if (p == null)
                {
                    return null;
                }
                if (linked(p.chatDir))
                {
                    return null;   // ★ G1: a link in the entry's path — a plain miss; nothing is read and nothing is discarded
                }
                if (isLink(new FileInfo(p.path)))
                {
                    lock (writeLock)
                    {
                        if (!linked(p.chatDir))
                        {
                            removeLink(p.path);   // ★ G1: a FILE link under the entry's name goes as a link; its target is never read
                            state().fileCount = -1;
                        }
                    }
                    return null;
                }
                path = p.path;
                chatDirOfPath = p.chatDir;
                byte[]? file = readBounded(path, HeaderLength + maxPayloadOf(kind));
                if (file == null)
                {
                    return null;   // not there: a plain miss
                }
                byte[]? payload = decode(kind, p.keyHash, p.sourceTag, file);
                if (payload == null)
                {
                    discard(path, chatDirOfPath);   // stale, foreign, torn or not ours: it goes, the caller makes it again
                }
                return payload;
            }
            catch (Exception)
            {
                if (path != null)
                {
                    discard(path, chatDirOfPath);   // an IO error mid-read: a miss; a file that cannot be read is not kept
                }
                return null;
            }
        }

        /** The whole file when it is there; an EMPTY array when it is longer than `max` (so the caller deletes it); null
         *  when it does not exist. Reads at most max + 1 bytes — never a length a file claims. */
        private static byte[]? readBounded(string path, int max)
        {
            try
            {
                using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    byte[] buf = new byte[max + 1];
                    int n = 0;
                    int r;
                    while (n < buf.Length && (r = fs.Read(buf, n, buf.Length - n)) > 0)
                    {
                        n += r;
                    }
                    if (n > max)
                    {
                        return Array.Empty<byte>();
                    }
                    Array.Resize(ref buf, n);
                    return buf;
                }
            }
            catch (FileNotFoundException)
            {
                return null;
            }
            catch (DirectoryNotFoundException)
            {
                return null;
            }
        }

        private void discard(string path, string chatDir)
        {
            try
            {
                lock (writeLock)
                {
                    State s = state();
                    if (linked(chatDir))
                    {
                        return;   // ★ G1: never a delete through a link
                    }
                    FileInfo f = new FileInfo(path);
                    if (isLink(f))
                    {
                        removeLink(path);
                        s.fileCount = -1;
                    }
                    else if (f.Exists)
                    {
                        long length = 0;
                        try { length = f.Length; } catch (Exception) { s.fileCount = -1; }
                        f.Delete();
                        if (s.fileCount > 0)
                        {
                            s.fileCount--;
                            s.byteCount = Math.Max(0, s.byteCount - length);
                        }
                    }
                }
            }
            catch (Exception)
            {
            }
        }

        // ———————————————————————————— the generations (★ review round 1, F1) ————————————————————————————

        /** A chat's generation NOW: the greater of its own and its account's. Needs NO lock (★ G2): every number comes
         *  from the one growing counter, a write is finished before its delete returns, and the account's number is
         *  written BEFORE the chat table is emptied — so a read that starts after a delete returned sees that delete, and
         *  a read that overlaps one gives either the number before it (the put is then refused) or the number after. */
        private static long generationNow(State s, string chatFolder)
        {
            long floor = Volatile.Read(ref s.floor);
            return s.chatGen.TryGetValue(chatFolder, out long g) && g > floor ? g : floor;
        }

        /** A delete that concerns ONE chat: the chat gets a new number. (A full table: the account does — every chat of it
         *  moves, which is only wider.) Under writeLock. */
        private static void bumpChat(State s, string chatFolder)
        {
            long g = ++seq;
            if (s.chatGen.Count >= ChatGensMax && !s.chatGen.ContainsKey(chatFolder))
            {
                Volatile.Write(ref s.floor, g);   // first the account's number…
                s.chatGen.Clear();                // …then the table: no reader sees an older number in between
                return;
            }
            s.chatGen[chatFolder] = g;
        }

        /** A delete that concerns the whole ACCOUNT folder (a source file of any chat, a wipe, the sweep): every chat of
         *  it moves. Under writeLock. */
        private static void bumpAccount(State s)
        {
            Volatile.Write(ref s.floor, ++seq);
            s.chatGen.Clear();
        }

        /** ★ F1 — what a caller reads BEFORE it resolves and decodes a source of `chat`, and hands back with its put: the
         *  number of the last delete that concerns this chat (in this process). NoGeneration = a chat the store refuses.
         *  ★ review round 2 (G2): LOCK-FREE — it is called on the main thread and inside the page's message lock, and the
         *  store's lock is held across disk work (the first count, a prune, a sweep's listing). A put and ifCurrent still
         *  compare under the lock. */
        public long generation(string? chat)
        {
            try
            {
                if (!isAddressText(chat))
                {
                    return NoGeneration;
                }
                string chatFolder = chatFolderOf(accountFolder, chat!);
                State s = st;
                if (!s.evicted)
                {
                    return generationNow(s, chatFolder);
                }
                lock (writeLock)   // only after the process dropped this state (over 64 account folders: the harness)
                {
                    return generationNow(state(), chatFolder);
                }
            }
            catch (Exception)
            {
                return NoGeneration;
            }
        }

        /** ★ F1 (reader n1) — the caller's MEMORY entry for `chat`: `remember` runs (under the store's lock) only when no
         *  delete moved the chat's generation since `gen` was read. A delete moves the number first and clears the memory
         *  after: an entry put here is either before the number moved (the delete's clear takes it) or refused. */
        public bool ifCurrent(string? chat, long gen, Action? remember)
        {
            return ifCurrentFor('\0', chat, null, gen, remember);
        }

        /** ★ review round 2 (G6) — the same for the entry of ONE message: a message that was deleted (remembered by name)
         *  gets no memory entry either, also when its job only started after the delete. */
        public bool ifCurrent(char kind, string? chat, string? idHex, long gen, Action? remember)
        {
            string? id = idHexOf(idHex);
            if (id == null || kindTextOf(kind) == null)
            {
                return false;
            }
            return ifCurrentFor(kind, chat, id, gen, remember);
        }

        private bool ifCurrentFor(char kind, string? chat, string? id, long gen, Action? remember)
        {
            try
            {
                if (gen < 0 || remember == null || !isAddressText(chat))
                {
                    return false;
                }
                string chatFolder = chatFolderOf(accountFolder, chat!);
                lock (writeLock)
                {
                    State s = state();
                    if (gen != generationNow(s, chatFolder)
                        || (id != null && s.deadNames.Contains(chatFolder + "/" + fileNameOf(chatFolder, id, kind))))
                    {
                        return false;
                    }
                    remember();
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }

#if SPIXI_CSH
        /** The harness's door (★ G2's test): run `inside` while the store's lock is held. */
        internal static void harnessHoldLock(Action inside)
        {
            lock (writeLock)
            {
                inside();
            }
        }
#endif

        // ———————————————————————————— put ————————————————————————————

#if SPIXI_CSH
        /** The harness's short form: read the generation now and put (no decode in between). Not in the app (★ F9): there
         *  every put carries the generation its caller read before the decode. */
        public bool put(char kind, string? chat, string? idHex, string? sourceVersion, byte[]? payload)
        {
            return put(kind, chat, idHex, sourceVersion, payload, generation(chat));
        }
#endif

        /** Keep `payload` for exactly this key. `gen` = generation(chat) as the caller read it BEFORE it resolved and
         *  decoded the source. false = not kept (a refused input or payload, a delete that moved the generation since, a
         *  deleted message, a full folder that could not be pruned, an IO error) — never an error for the caller: it shows
         *  what it made. */
        public bool put(char kind, string? chat, string? idHex, string? sourceVersion, byte[]? payload, long gen)
        {
            string? temp = null;
            try
            {
                if (gen < 0 || payload == null || !payloadOk(kind, payload))
                {
                    return false;
                }
                Place? p = placeOf(kind, chat, idHex, sourceVersion);
                if (p == null)
                {
                    return false;
                }
                byte[] file = encode(kind, p.keyHash, p.sourceTag, payload);
                if (file.Length > maxBytes)
                {
                    return false;   // it could never fit: nothing is pruned for it
                }
                lock (writeLock)
                {
                    State s = state();
                    if (gen != generationNow(s, p.chatFolder) || s.deadNames.Contains(p.chatFolder + "/" + p.name))
                    {
                        return false;   // deleted while this was being made (whenever that was): it is not put back
                    }
                    if (linked(p.chatDir))
                    {
                        return false;   // ★ G1: a link in the entry's path — nothing is counted, pruned or written through it
                    }
                    if (isLink(new FileInfo(p.path)))
                    {
                        removeLink(p.path);   // ★ G1: a FILE link under the entry's name goes as a link before the write
                        s.fileCount = -1;
                    }
                    if (s.fileCount < 0)
                    {
                        countAndSweep(s);
                    }
                    long had = lengthOf(p.path);   // -1 = no file under this name yet
                    if (s.fileCount >= 0 && overBound(s, had, file.Length))
                    {
                        prune(s);
                        had = lengthOf(p.path);   // the prune may have taken it
                    }
                    if (s.fileCount < 0 || overBound(s, had, file.Length))
                    {
                        return false;   // the bounds hold even when the prune could not run or could not make room
                    }
                    Directory.CreateDirectory(p.chatDir);
                    temp = Path.Combine(p.chatDir, Guid.NewGuid().ToString("N") + TempExtension);   // C#'s own name
                    using (FileStream fs = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                    {
                        fs.Write(file, 0, file.Length);
                    }
                    File.Move(temp, p.path, true);
                    temp = null;
                    if (had < 0)
                    {
                        s.fileCount++;
                        s.byteCount += file.Length;
                    }
                    else
                    {
                        s.byteCount = Math.Max(0, s.byteCount - had) + file.Length;
                    }
                    return true;
                }
            }
            catch (Exception)
            {
                if (temp != null)
                {
                    try { File.Delete(temp); } catch (Exception) { }
                }
                return false;
            }
        }

        /** The length of the file at `path`; -1 = there is none. */
        private static long lengthOf(string path)
        {
            FileInfo f = new FileInfo(path);
            return f.Exists ? f.Length : -1;
        }

        /** Would this write pass a bound? A NEW name counts one file more; an overwrite only its byte difference. */
        private bool overBound(State s, long had, long length)
        {
            if (had < 0)
            {
                return s.fileCount >= maxFiles || s.byteCount + length > maxBytes;
            }
            return s.byteCount - had + length > maxBytes;
        }

        // ———————————————————————————— the bound ————————————————————————————

        /** ★ review round 1 (F7): a link (a symlink, a junction — FileAttributes.ReparsePoint; .NET reports it for a Unix
         *  symlink too: S10FixRules.isReparse, the tree's own precedent) is never followed. Cannot tell = a link. */
        private static bool isLink(FileSystemInfo e)
        {
            try
            {
                FileAttributes a = e.Attributes;
                return (int)a != -1 && (a & FileAttributes.ReparsePoint) != 0;   // -1 = nothing is there (not a link)
            }
            catch (Exception)
            {
                return true;
            }
        }

        /** ★ review round 2 (G1) — is the folder at `dir` a link? (A fresh look at the disk each time.) */
        private static bool linkDir(string dir)
        {
            return isLink(new DirectoryInfo(dir));
        }

        /** ★ review round 2 (G1) — the PER-KEY paths (<root>/<acct16>/<chat16>/<file>): true when the root, the account
         *  folder or the chat folder of this entry is a link. Then nothing is read, written or deleted under it: a link
         *  planted there would lead a get's discard, a put or a message delete OUTSIDE the root. */
        private bool linked(string chatDir)
        {
            return linkDir(root) || linkDir(accountDir) || linkDir(chatDir);
        }

        /** Remove a link ITSELF (never what it points at). */
        private static void removeLink(string path)
        {
            try { File.Delete(path); } catch (Exception) { }
            try
            {
                DirectoryInfo d = new DirectoryInfo(path);
                if (d.Exists && isLink(d))
                {
                    Directory.Delete(path, false);   // a directory link on Windows: the link goes, its target stays
                }
            }
            catch (Exception)
            {
            }
        }

        /** ★ review round 6 (M-1) — the entries of ONE folder, listed WHOLE before the caller acts on any of them. A folder
         *  that cannot be listed counts as NO entries and is never an exception: it left by a rename or a delete after the
         *  caller's own listing named it (a chat folder on its way to the trash while a source scan or a thumbnail wipe
         *  walks the account, off the lock), the OS cleared the cache, an IO error. One folder that is gone must not end
         *  the caller's walk over the others — a scan that stopped there left a deleted file's previews at rest.
         *  `whole` = false when the listing stopped on anything but "it is not there": a caller that COUNTS then says
         *  "could not tell"; a caller that deletes goes on with what was listed. No link is listed through: the folder's
         *  place is looked at afresh here (the caller's own look can be as old as its parent's listing). */
        private static List<FileSystemInfo> entriesOf(DirectoryInfo d, out bool whole)
        {
            List<FileSystemInfo> entries = new List<FileSystemInfo>();
            whole = true;
            try
            {
                // a FRESH look at the folder's place, right before it is opened: `d` often comes from the PARENT's listing,
                // and what that listing saw is kept in the object — a link put there since would be listed THROUGH
                if (isLink(new DirectoryInfo(d.FullName)))
                {
                    return entries;   // a link is never listed (and never counted): no entries
                }
                foreach (FileSystemInfo e in d.EnumerateFileSystemInfos())
                {
                    entries.Add(e);
                }
            }
            catch (DirectoryNotFoundException)
            {
                entries.Clear();   // not there (any more): no entries
            }
            catch (Exception)
            {
                whole = false;     // could not be read to its end: what was listed, and the caller is told
            }
#if SPIXI_CSH
            Func<string, bool>? h = harnessListed;
            if (h != null && h(d.FullName))
            {
                whole = false;
            }
#endif
            return entries;
        }

        /** Every file of the account folder, in the store's OWN shape — <acct>/<file> and <acct>/<chat>/<file> — two
         *  levels, no deeper, and no link is followed or listed (★ F7; it was a recursive enumeration). ★ M-1: each
         *  folder is listed on its own (entriesOf) — a chat folder that left after the account folder was listed gives no
         *  files and the others are still listed. `whole` = false: a folder could not be read to its end. */
        private List<FileInfo> listFiles(out bool whole)
        {
            List<FileInfo> files = new List<FileInfo>();
            whole = true;
            DirectoryInfo dir = new DirectoryInfo(accountDir);
            if (!dir.Exists || isLink(dir) || linkDir(root))
            {
                return files;
            }
            List<FileSystemInfo> top = entriesOf(dir, out whole);
            foreach (FileSystemInfo e in top)
            {
                if (isLink(e))
                {
                    continue;
                }
                if (e is FileInfo f)
                {
                    files.Add(f);
                }
                else if (e is DirectoryInfo d)
                {
                    List<FileSystemInfo> inner = entriesOf(d, out bool all);
                    foreach (FileSystemInfo e2 in inner)
                    {
                        if (e2 is FileInfo f2 && !isLink(e2))
                        {
                            files.Add(f2);
                        }
                    }
                    whole = whole && all;
                }
            }
            return files;
        }

        private static bool isStray(FileInfo f, DateTime nowUtc)
        {
            if (isStoreName(f.Name))
            {
                return false;
            }
            double ageMs = (nowUtc - f.LastWriteTimeUtc).TotalMilliseconds;
            return ageMs < 0 || ageMs >= StrayMinAgeMs;   // a young one can be a write in flight (it is under the lock, but be safe)
        }

        private static long lengthOr0(FileInfo f)
        {
            try { return f.Length; } catch (Exception) { return 0; }
        }

        /** The first count of the process (files and bytes); a file that is not a store name (a temp a kill left) goes on
         *  the way. Sets s.fileCount (-1 = could not tell) and s.byteCount. Under writeLock. */
        private void countAndSweep(State s)
        {
            try
            {
                int n = 0;
                long bytes = 0;
                DateTime nowUtc = DateTime.UtcNow;
                List<FileInfo> all = listFiles(out bool whole);
                foreach (FileInfo f in all)
                {
                    if (isStray(f, nowUtc))
                    {
                        try { f.Delete(); continue; } catch (Exception) { }
                    }
                    n++;
                    bytes += lengthOr0(f);
                }
                s.fileCount = whole ? n : -1;   // ★ M-1: a folder that could not be read to its end = could not tell (no put until a count works)
                s.byteCount = bytes;
            }
            catch (Exception)
            {
                s.fileCount = -1;
            }
        }

        /** The folder is at a bound: strays go, then the OLDEST store files (write time, then name) until pruneKeep files
         *  AND pruneKeepBytes bytes are left; empty chat folders go. Sets s.fileCount / s.byteCount to what is really there
         *  (-1 = could not tell). Under writeLock. */
        private void prune(State s)
        {
            try
            {
                DateTime nowUtc = DateTime.UtcNow;
                List<KeyValuePair<DateTime, FileInfo>> kept = new List<KeyValuePair<DateTime, FileInfo>>();
                int others = 0;
                long bytes = 0;
                List<FileInfo> all = listFiles(out bool whole);
                foreach (FileInfo f in all)
                {
                    if (!isStoreName(f.Name))
                    {
                        if (isStray(f, nowUtc))
                        {
                            try { f.Delete(); continue; } catch (Exception) { }
                        }
                        others++;
                        bytes += lengthOr0(f);
                        continue;
                    }
                    DateTime at;
                    try { at = f.LastWriteTimeUtc; } catch (Exception) { at = DateTime.MinValue; }
                    kept.Add(new KeyValuePair<DateTime, FileInfo>(at, f));
                    bytes += lengthOr0(f);
                }
                kept.Sort((a, b) =>
                {
                    int c = a.Key.CompareTo(b.Key);
                    return c != 0 ? c : string.CompareOrdinal(a.Value.FullName, b.Value.FullName);
                });
                int left = kept.Count;
                for (int i = 0; i < kept.Count && (left + others > pruneKeep || bytes > pruneKeepBytes); i++)
                {
                    try
                    {
                        long length = lengthOr0(kept[i].Value);
                        kept[i].Value.Delete();
                        left--;
                        bytes -= length;
                    }
                    catch (Exception)
                    {
                    }
                }
                s.fileCount = whole ? left + others : -1;   // ★ M-1: a folder that could not be read to its end = could not tell
                s.byteCount = Math.Max(0, bytes);
                try
                {
                    if (linkDir(root) || linkDir(accountDir))
                    {
                        return;
                    }
                    foreach (FileSystemInfo d in entriesOf(new DirectoryInfo(accountDir), out _))
                    {
                        if (!(d is DirectoryInfo) || isLink(d))
                        {
                            continue;
                        }
                        try { Directory.Delete(d.FullName, false); } catch (Exception) { }   // only an EMPTY chat folder goes
                    }
                }
                catch (Exception)
                {
                }
            }
            catch (Exception)
            {
                s.fileCount = -1;
            }
        }

        // ———————————————————————————— the deletes ————————————————————————————

        /** A message is deleted: the chat's generation moves (a put that was being made is refused), its thumbnail and its
         *  peaks go, and it is remembered by name — a put for it is refused for the rest of the process (a job that only
         *  starts after the delete). Never throws. */
        public void deleteMessage(string? chat, string? idHex)
        {
            try
            {
                string? id = idHexOf(idHex);
                if (!isAddressText(chat) || id == null)
                {
                    return;
                }
                string chatFolder = chatFolderOf(accountFolder, chat!);
                lock (writeLock)
                {
                    State s = state();
                    bumpChat(s, chatFolder);
                    bool viaLink = linked(Path.Combine(accountDir, chatFolder));   // ★ G1: marked and moved, but no file is touched through a link
                    foreach (char kind in new[] { KindThumb, KindPeaks })
                    {
                        string name = fileNameOf(chatFolder, id, kind);
                        string dead = chatFolder + "/" + name;
                        if (s.deadNames.Add(dead))
                        {
                            s.deadNamesOrder.Enqueue(dead);
                            while (s.deadNamesOrder.Count > DeadNamesMax)
                            {
                                s.deadNames.Remove(s.deadNamesOrder.Dequeue());
                            }
                        }
                        if (viaLink)
                        {
                            continue;
                        }
                        try
                        {
                            FileInfo f = new FileInfo(Path.Combine(accountDir, chatFolder, name));
                            if (isLink(f))
                            {
                                removeLink(f.FullName);
                                s.fileCount = -1;
                            }
                            else if (f.Exists)
                            {
                                long length = lengthOr0(f);
                                f.Delete();
                                if (s.fileCount > 0)
                                {
                                    s.fileCount--;
                                    s.byteCount = Math.Max(0, s.byteCount - length);
                                }
                            }
                        }
                        catch (Exception)
                        {
                            s.fileCount = -1;
                        }
                    }
                }
            }
            catch (Exception)
            {
            }
        }

        /** A chat's history is deleted / the contact is removed / the group is left: the chat's generation moves (no put
         *  that was being made is taken, however late), and the chat's folder leaves by one rename — both under the lock,
         *  on the caller's thread; the tree delete runs off it (★ F8). Never throws. */
        public void deleteChat(string? chat)
        {
            try
            {
                if (!isAddressText(chat))
                {
                    return;
                }
                string chatFolder = chatFolderOf(accountFolder, chat!);
                string chatDir = Path.Combine(accountDir, chatFolder);
                string? trash;
                lock (writeLock)
                {
                    State s = state();
                    bumpChat(s, chatFolder);
                    s.fileCount = -1;   // counted again at the next put
                    if (linkDir(root))
                    {
                        return;   // ★ G1: the root's place holds a link: nothing is done through it (a wipe removes the link)
                    }
                    if (linkDir(accountDir))
                    {
                        removeLink(accountDir);   // ★ G1: the account folder's place holds a link: the link goes AS a link — never <target>/<chat16>
                        return;
                    }
                    trash = toTrash(root, chatDir);
                }
                if (trash != null)
                {
                    string gone = trash;
                    later(() => deleteTree(gone, 0));
                }
            }
            catch (Exception)
            {
            }
        }

        /** A source FILE was deleted from the device: the ACCOUNT's generation moves (the file can belong to a message of
         *  any chat: no put that was being made is taken), then every kept payload made from that path goes. Returns the
         *  number deleted. Never throws. */
        public int deleteSource(string? path)
        {
            try
            {
                byte[]? tag = sourceMoved(path);
                return tag == null ? 0 : scanSource(tag);
            }
            catch (Exception)
            {
                return 0;
            }
        }

        /** The app's form of deleteSource: the generation moves NOW, on the caller's thread; the header scan runs off it. */
        public void deleteSourceSoon(string? path)
        {
            try
            {
                byte[]? tag = sourceMoved(path);
                if (tag != null)
                {
                    byte[] moved = tag;
                    later(() => { scanSource(moved); });
                }
            }
            catch (Exception)
            {
            }
        }

        private byte[]? sourceMoved(string? path)
        {
            byte[]? tag = sourceTagOf(accountFolder, path);
            if (tag == null)
            {
                return null;
            }
            lock (writeLock)
            {
                bumpAccount(state());
            }
            return tag;
        }

        /** Reads headers only, OUTSIDE the lock (a delete is always safe; the moved generation stops a late put).
         *  ★ review round 6 (M-1): it runs beside the sweep and the chat deletes, which rename chat folders away under the
         *  lock — a folder that left after the account folder was listed is "no files" (listFiles / entriesOf) and the
         *  scan goes on over the others; what was in that folder goes with its own delete. */
        private int scanSource(byte[] tag)
        {
            int deleted = 0;
            try
            {
                byte[] head = new byte[HeaderLength];
                List<FileInfo> all = listFiles(out _);
                foreach (FileInfo f in all)
                {
                    try
                    {
                        if (!isStoreName(f.Name) || !headerHasTag(f.FullName, head, tag))
                        {
                            continue;
                        }
                        lock (writeLock)
                        {
                            File.Delete(f.FullName);
                            state().fileCount = -1;
                        }
                        deleted++;
                    }
                    catch (Exception)
                    {
                    }
                }
            }
            catch (Exception)
            {
            }
            return deleted;
        }

        private static bool headerHasTag(string path, byte[] head, byte[] tag)
        {
            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            {
                int n = 0;
                int r;
                while (n < head.Length && (r = fs.Read(head, n, head.Length - n)) > 0)
                {
                    n += r;
                }
                if (n < head.Length)
                {
                    return false;
                }
            }
            for (int i = 0; i < magic.Length; i++)
            {
                if (head[MagicAt + i] != magic[i])
                {
                    return false;
                }
            }
            for (int i = 0; i < 16; i++)
            {
                if (head[SourceTagAt + i] != tag[i])
                {
                    return false;
                }
            }
            return true;
        }

        /** Every state under `full` (a store root): its account generation moves, its count is taken again. Under writeLock. */
        private static void bumpRoot(string full)
        {
            foreach (KeyValuePair<string, State> kv in states)
            {
                if (kv.Key.StartsWith(full + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                {
                    bumpAccount(kv.Value);
                    kv.Value.fileCount = -1;
                }
            }
        }

        /** Delete all histories / the account wipe / the account restore / a new account: every account's generation
         *  under this root moves (no put that was being made is taken, however late), and every folder in the root leaves
         *  by a rename — under the lock, on the caller's thread; the tree deletes run off it (★ F8), then the empty root
         *  goes. Needs no account. Never throws. */
        public static void wipe(string? root)
        {
            string? full = null;
            bool there = false;   // the root is a real folder: its entries were (or were being) taken out
            List<string> trash = new List<string>();
            try
            {
                full = storeRootOf(root);
                if (full == null)
                {
                    return;
                }
                lock (writeLock)
                {
                    bumpRoot(full);
                    DirectoryInfo r = new DirectoryInfo(full);
                    if (isLink(r))
                    {
                        removeLink(full);   // the root's place holds a link: the link goes, nothing behind it is touched
                        return;
                    }
                    if (!r.Exists)
                    {
                        return;
                    }
                    there = true;
                    foreach (FileSystemInfo e in entriesOf(r, out _))   // ★ M-1 / n-3: listed whole BEFORE the first rename — the listing cannot end between two renames
                    {
                        try
                        {
                            if (isLink(e))
                            {
                                removeLink(e.FullName);
                            }
                            else if (!(e is DirectoryInfo))
                            {
                                e.Delete();
                            }
                            else if (e.Name.StartsWith(TrashPrefix, StringComparison.Ordinal))
                            {
                                trash.Add(e.FullName);   // a folder an earlier delete (or a kill) left on its way out
                            }
                            else
                            {
                                string? t = toTrash(full, e.FullName);
                                if (t != null)
                                {
                                    trash.Add(t);
                                }
                            }
                        }
                        catch (Exception)
                        {
                        }
                    }
                }
            }
            catch (Exception)
            {
            }
            if (full == null || !there)
            {
                return;
            }
            try
            {
                // ★ review round 6 (n-3): OUTSIDE the try above — whatever ended the renames early, the folders that DID
                // leave their place are still tree-deleted in this process (they waited for the next one's sweep)
                string gone = full;
                later(() =>
                {
                    foreach (string t in trash)
                    {
                        deleteTree(t, 0);
                    }
                    lock (writeLock)
                    {
                        try { Directory.Delete(gone, false); } catch (Exception) { }   // only when EMPTY: a put after the wipe may have made a folder
                    }
                });
            }
            catch (Exception)
            {
            }
        }

        /** ★ review round 1 (F3): every kept payload of ONE kind under this root goes (the Privacy switch "photo previews"
         *  turned OFF: every thumbnail; the peaks stay). Every account's generation moves first (under the lock, on the
         *  caller's thread); the file deletes run off it. Never throws. */
        public static void wipeKind(string? root, char kind)
        {
            try
            {
                string? full = storeRootOf(root);
                string? kt = kindTextOf(kind);
                if (full == null || kt == null)
                {
                    return;
                }
                lock (writeLock)
                {
                    bumpRoot(full);
                }
                later(() =>
                {
                    // ★ review round 6 (M-1): this walk runs off the lock, beside the sweep and the chat deletes. It was
                    // ONE try around three nested enumerations — a chat folder renamed to the trash after its account
                    // folder was listed ended the whole wipe and every other chat's thumbnails stayed. Now each folder
                    // is listed on its own (entriesOf: gone = no entries) and the walk goes on, folder by folder.
                    try
                    {
                        DirectoryInfo r = new DirectoryInfo(full);
                        string ext = "." + kt;
                        List<FileSystemInfo> accts = r.Exists && !isLink(r) ? entriesOf(r, out _) : new List<FileSystemInfo>();
                        foreach (FileSystemInfo acct in accts)
                        {
                            try
                            {
                                if (!(acct is DirectoryInfo a) || isLink(acct))
                                {
                                    continue;
                                }
                                foreach (FileSystemInfo chat in entriesOf(a, out _))
                                {
                                    try
                                    {
                                        if (!(chat is DirectoryInfo c) || isLink(chat))
                                        {
                                            continue;
                                        }
                                        foreach (FileSystemInfo f in entriesOf(c, out _))
                                        {
                                            if (!(f is FileInfo) || isLink(f) || !isStoreName(f.Name) || !f.Name.EndsWith(ext, StringComparison.Ordinal))
                                            {
                                                continue;
                                            }
                                            lock (writeLock)
                                            {
                                                try { f.Delete(); } catch (Exception) { }
                                            }
                                        }
                                    }
                                    catch (Exception)
                                    {
                                    }
                                }
                            }
                            catch (Exception)
                            {
                            }
                        }
                    }
                    catch (Exception)
                    {
                    }
                    lock (writeLock)
                    {
                        foreach (KeyValuePair<string, State> kv in states)
                        {
                            if (kv.Key.StartsWith(full + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                            {
                                kv.Value.fileCount = -1;   // counted again at the next put
                            }
                        }
                    }
                });
            }
            catch (Exception)
            {
            }
        }

        /** ★ review round 1 (F2) — THE ORPHAN SWEEP: what no delete path named (a request declined on the Chats list, a
         *  room the server dissolved, a contact a heal removed, a seed that was removed, a folder a kill left on its way
         *  out) still leaves the device. Inside the store root ONLY (every path is a child the root's own listing gave):
         *   · `others` = true: every folder in the root that is not THIS account's folder goes (another account's, a
         *     trash folder) — the account generation of each moves first;
         *   · `chats` = the chats the app has now, as the texts the store names folders from (null or EMPTY = this part
         *     does not run — an empty list can be a load that failed, and it must never empty the store): every chat
         *     folder of this account that none of them names goes — its chat generation moves first.
         *   · `provenEmpty` (★ review round 6, m-2) = true: an EMPTY `chats` is the app's list as it IS — the caller read
         *     it loaded and non-empty earlier in this process, for this account, and reads it loaded and empty now (the
         *     last contact left) — so every chat folder of this account goes. Never set for a list that was not read.
         *  The listing, the generations and the renames run under the lock; the tree deletes after it, on THIS thread
         *  (the caller is already off the UI thread). No link is followed. Returns the folders removed. Never throws. */
        public int sweepOrphans(bool others, ICollection<string>? chats, bool provenEmpty = false)
        {
            int removed = 0;
            List<string> trash = new List<string>();
            try
            {
                HashSet<string>? keep = null;
                if (chats != null && (chats.Count > 0 || provenEmpty))
                {
                    keep = new HashSet<string>(StringComparer.Ordinal);
                    foreach (string c in chats)
                    {
                        if (!isAddressText(c))
                        {
                            keep = null;   // a chat the store cannot name: its folder cannot be told from an orphan — no chat sweep
                            break;
                        }
                        keep.Add(chatFolderOf(accountFolder, c));
                    }
                }
                lock (writeLock)
                {
                    DirectoryInfo r = new DirectoryInfo(root);
                    if (others && r.Exists && !isLink(r))
                    {
                        foreach (FileSystemInfo e in entriesOf(r, out _))   // ★ M-1 / n-3: listed whole BEFORE the first rename (a rename adds a del-… entry to this very folder)
                        {
                            try
                            {
                                bool link = isLink(e);
                                if (!link && (!(e is DirectoryInfo) || string.Equals(e.Name, accountFolder, StringComparison.Ordinal)))
                                {
                                    continue;   // this account's own folder · a file in the root (the wipe's)
                                }
                                if (states.TryGetValue(e.FullName, out State? other))
                                {
                                    bumpAccount(other);
                                    other.fileCount = -1;
                                }
                                if (link)
                                {
                                    removeLink(e.FullName);
                                }
                                else if (e.Name.StartsWith(TrashPrefix, StringComparison.Ordinal))
                                {
                                    trash.Add(e.FullName);
                                }
                                else
                                {
                                    string? t = toTrash(root, e.FullName);
                                    if (t != null)
                                    {
                                        trash.Add(t);
                                    }
                                }
                                removed++;
                            }
                            catch (Exception)
                            {
                            }
                        }
                    }
                    DirectoryInfo a = new DirectoryInfo(accountDir);
                    if (keep != null && r.Exists && !isLink(r) && a.Exists && !isLink(a))
                    {
                        State s = state();
                        foreach (FileSystemInfo e in entriesOf(a, out _))
                        {
                            try
                            {
                                bool link = isLink(e);
                                if (!link && (!(e is DirectoryInfo) || keep.Contains(e.Name)))
                                {
                                    continue;   // a chat the app has · a file beside the chat folders (the prune's)
                                }
                                bumpChat(s, e.Name);
                                s.fileCount = -1;
                                if (link)
                                {
                                    removeLink(e.FullName);
                                }
                                else
                                {
                                    string? t = toTrash(root, e.FullName);
                                    if (t != null)
                                    {
                                        trash.Add(t);
                                    }
                                }
                                removed++;
                            }
                            catch (Exception)
                            {
                            }
                        }
                    }
                }
            }
            catch (Exception)
            {
            }
            // ★ review round 6 (n-3): OUTSIDE the try — whatever ended the listing or the renames early, the folders that
            // DID leave their place are tree-deleted now (they waited in <root>/del-… for the next process's sweep)
            foreach (string t in trash)
            {
                deleteTree(t, 0);
            }
            return removed;
        }

        /** ★ F8 — `dir` (a folder inside the root) leaves its place by ONE rename to <root>/del-<32 hex> (C#'s own name;
         *  the same volume): a later put for the same chat makes a NEW folder and is never touched by the tree delete that
         *  follows. Returns the trash path for that delete; null = nothing is left to delete (no folder there · a link,
         *  removed as a link · the rename failed and the tree was deleted in place). Under writeLock. */
        private static string? toTrash(string root, string dir)
        {
            try
            {
                DirectoryInfo d = new DirectoryInfo(dir);
                if (isLink(d))
                {
                    removeLink(dir);
                    return null;
                }
                if (!d.Exists)
                {
                    return null;
                }
                string trash = Path.Combine(root, TrashPrefix + Guid.NewGuid().ToString("N"));
                try
                {
                    Directory.Move(dir, trash);
                    return trash;
                }
                catch (Exception)
                {
                    deleteTree(dir, 0);   // no rename (a file held open on another platform): here and now, as before
                    return null;
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        private const int TreeDepthMax = 8;   // the store is two folders deep; nothing of ours is deeper

        /** The folder and everything in it, entry by entry — what can go, goes. ★ F7: a link inside is removed as a link
         *  and NEVER followed (it was Directory.Delete(dir, true) and a recursive enumeration). Never throws. */
        private static void deleteTree(string dir, int depth)
        {
            try
            {
                DirectoryInfo d = new DirectoryInfo(dir);
                if (isLink(d))
                {
                    removeLink(dir);
                    return;
                }
                if (!d.Exists || depth > TreeDepthMax)
                {
                    return;
                }
                foreach (FileSystemInfo e in entriesOf(d, out _))   // listed whole, then deleted entry by entry
                {
                    try
                    {
                        if (isLink(e))
                        {
                            removeLink(e.FullName);
                        }
                        else if (e is DirectoryInfo)
                        {
                            deleteTree(e.FullName, depth + 1);
                        }
                        else
                        {
                            e.Delete();
                        }
                    }
                    catch (Exception)
                    {
                    }
                }
                Directory.Delete(dir, false);
            }
            catch (Exception)
            {
            }
        }
    }
}
