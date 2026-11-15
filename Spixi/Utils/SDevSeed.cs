/* ★ Session I ② — THE SEED HARNESS (Damir, 2026-09-02: "button in About, dev builds only").
 *
 * Fifty deterministic contacts with history, written through the REAL message store —
 * FriendList.addFriend + FriendList.addMessageWithType, the same calls a live contact
 * and a live message take — so the [CDPERF] chat-open stamps, the chats-list rows and
 * the premium-pass screenshots are measured at 50, not at the three contacts a dev
 * wallet has. Nothing crosses the network: Core's addMessageWithType is used directly
 * (Node's wrapper would fetch presence for every offline peer and fire notifications),
 * and every address is a hash, not a key — no message can ever be delivered to one.
 *
 * COMPILED ONLY UNDER `SPIXI_DEV_COEXIST`, the symbol Spixi.csproj defines for a
 * SpixiDevCoexist build (#732 — Debug by default, Release only with -p:SpixiDevCoexist=true).
 * A store build has no symbol: this file is empty, SettingsPage never pushes setDevSeed,
 * the About card never renders and the two verbs are never dispatched. Removed with the
 * rest of SpixiDevCoexist at release hardening (grep SpixiDevCoexist).
 *
 * IDEMPOTENT: addresses derive from SHA-256("spixi-dev-seed:" + i) and message ids from
 * SHA-256("spixi-dev-seed:" + i + ":" + j); a re-tap finds every contact present and adds
 * nothing (Core refuses duplicate ids too). "Remove seeded contacts" removes the 53 seeded
 * contacts (the fifty and the three image chats of the perfb1 seed), history and metadata
 * included (FriendList.removeFriend), their photo-group entries and the photo files C# wrote
 * for them, and nothing else — a real contact can never match a seed address.
 *
 * UNREAD: a third of the contacts end with 1–3 incoming messages stamped AFTER the
 * friend's addedTimestamp, so Core keeps them unread (the unread divider + badge paths
 * are exercised); every older message is stamped before it and Core marks it read.
 *
 * ★ Session J — v2, THE COUNT DIAL (Damir, #747: "we must simulate 1000+ … I want a real
 * load, not 2–40"). Two profiles, one verb with a payload:
 *   light  — Session I's shape: 2..40 messages per contact ("Seed 12" carries the 40).
 *   heavy  — Seed 01–10 carry 1000 messages EACH, Seed 11–50 carry 40: 10 000 + 1 600.
 * The message ids are the same deterministic (i, j) hashes, so heavy over light is a
 * TOP-UP: a contact that already exists is not skipped any more — its history is filled
 * to the profile's count (Core refuses the ids already there — while they are in its in-memory
 * window of 100 messages, Friend.cs:899 / FriendList.cs:258: after an app restart a chat longer
 * than that can take the old messages of Seed 01–10 again, so "Remove, then Seed" is the clean
 * way to a heavy seed over an old one). THE STORE WRITE IS THE
 * COST TO MEASURE: the status sentence carries the wall time of the whole seed and the
 * per-message average, and every 1000-message contact logs its own [DEVSEED] line with
 * its milliseconds — read them in logcat (the console mirror is on in this build, App.xaml.cs).
 *
 * ★ perfb1 seed (Speed batch 1a, item 4) — THE IMAGE CHATS. Both profiles also seed seed index 50, 51, 52 ("Seed 51" …
 * "Seed 53", addressFor(i) like the fifty) with COMPLETED photo messages — received and sent — and ONE received album of
 * six (Seed 52), so the adb walk has a chat with image tiles to scroll. The rows are the app's own shapes: a received
 * photo = StreamProcessor.handleFileHeader's "uid:name:size" row + TransferManager.completeFileTransfer's fields (the
 * file in Downloads/); a sent photo = SingleChatPage.sendPreparedFile's "uid:name" row with its durable copy
 * Sent/<uid>.png (#1200); the album = SPhotoGroups entries (first writer wins). The chat page finds the files through
 * SharedItems.localPathOf and makes the thumbnails itself (SThumbnail) — nothing new on that path. The pure half (plan,
 * names, times, the PNG made in code) is SDevSeedPlan.cs. Every name is built from the seed index; no network.
 * Every image message is OLDER than every Seed 01–50 message of ANY run, so the first rows of the chats list stay as they were:
 * the image chats sit at a FIXED time (SDevSeedPlan.ImageAnchor, 2026-01-01 12:00 UTC), the same on every seed. A photo file is written to a
 * temp leaf in the app's own Sent/ folder (the app's pending-name shape, so its own sweeps clean a leftover) and moved into place; a file
 * with a seed name is kept, deleted or adopted ONLY when its SHA-256 equals that of the deterministic PNG — a foreign file is refused.
 * The Seed 01–50 lines below are unchanged.
 */
#if SPIXI_DEV_COEXIST
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace SPIXI
{
    public static class SDevSeed
    {
        public const int Count = 50;
        public const int HeavyContacts = 10;      // ★ Session J: Seed 01–10 take the heavy count
        public const int HeavyMessages = 1000;    // ★ Session J: per heavy contact
        public const int MediumMessages = 40;     // ★ Session J: Seed 11–50 under the heavy profile
        private const string Salt = "spixi-dev-seed:";

        private static readonly string[] Names = {
            "Ana Kovač", "Luka Novak", "Maja Horvat", "Nik Zupan", "Eva Krajnc", "Jan Vidmar",
            "Sara Potočnik", "Tim Kos", "Nina Mlakar", "Žan Božič", "Lea Turk", "Filip Kralj",
            "Zala Petek", "Matej Bizjak", "Tina Rozman", "Aljaž Hribar", "Neža Lah", "Rok Golob",
            "Lara Jerman", "Miha Kavčič", "Ema Pirc", "Gal Šuštar", "Iza Kastelic", "Vid Oblak",
            "Julija Tomšič", "Anže Jereb", "Hana Zajc", "Domen Sever", "Klara Pavlin", "Bor Erjavec",
            "Mia Furlan", "Jure Medved", "Lucija Perko", "Maks Cerar", "Taja Logar", "Nejc Rupnik",
            "Brina Kern", "Jaka Gregorič", "Ajda Vrhovnik", "Lan Štrukelj", "Pia Kolar", "Blaž Cvetko",
            "Ula Ramšak", "Tilen Mrak", "Kaja Jenko", "Oskar Lešnik", "Vita Kobal", "Urban Dolinar",
            "Nika Žagar", "Marko Rebernik",
        };

        private static readonly string[] Lines = {
            "Hey, did you get the file I sent yesterday?",
            "Yes! Looking at it now, the second page needs a fix though.",
            "Give me ten minutes.",
            "Sure, no rush. I will be around until six.",
            "Also — are we still on for Thursday? The room is booked from two, and I can bring the projector if the office one is still broken.",
            "👍",
            "Sent you the IXI for lunch, check your wallet.",
            "Got it, thanks!",
            "Can you resend the address? The QR did not scan.",
            "Here you go. Let me know when it lands.",
            "Running late, start without me.",
            "No problem. We saved you a seat.",
            "What time does the call start tomorrow?",
            "Nine sharp. I will send the link in the morning.",
            "🎉🎉🎉",
            "That was quick. Nice work.",
            "Do you still have the backup file from last month?",
            "Yes, it is on the external drive. I can bring it Monday.",
            "Perfect.",
            "See you then!",
        };

        private static Address addressFor(int i)
        {
            byte[] h = SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i));
            byte[] raw = new byte[33];
            raw[0] = 0;                       // address version 0
            Array.Copy(h, 0, raw, 1, 32);
            return new Address(raw, null, false);
        }

        private static byte[] messageIdFor(int i, int j)
        {
            return SHA256.HashData(Encoding.UTF8.GetBytes(Salt + i + ":" + j));
        }

        /// <summary>★ Session J: the count dial. "light" = Session I's 2..40; "heavy" = 10 × 1000 + 40 × 40.</summary>
        private static int countFor(string profile, int i)
        {
            if (profile == "heavy")
            {
                return i < HeavyContacts ? HeavyMessages : MediumMessages;
            }
            return 2 + ((i * 7) % 39);            // light: "Seed 12" is the longest (40)
        }

        /// <summary>Seed (Session I shape). Kept for the old verb; = seed("light").</summary>
        public static string seed()
        {
            return seed("light");
        }

        /// <summary>Seed under a profile. Returns a fixed English status sentence for the About card,
        /// carrying the store-write cost (wall ms, ms per message).</summary>
        public static string seed(string profile)
        {
            if (profile != "heavy") profile = "light";
            int added = 0, present = 0, messages = 0, refused = 0;
            long now = Clock.getTimestamp();
            var clock = System.Diagnostics.Stopwatch.StartNew();
            for (int i = 0; i < Count; i++)
            {
                Address address = addressFor(i);
                string nick = "Seed " + (i + 1).ToString("00") + " " + Names[i % Names.Length];
                Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.Approved, address, null, nick, null, null, 0, true);
                if (friend == null)
                {
                    // ★ Session J: already there — TOP UP instead of skipping, so heavy over
                    // light fills the history in place (the ids are the same hashes; Core
                    // refuses the ones it already holds and counts as refused below).
                    friend = FriendList.getFriend(address);
                    if (friend == null) { refused++; continue; }
                    present++;
                }
                else
                {
                    added++;
                }
                // history over the last 30 days, alternating direction, stamped BEFORE
                // addedTimestamp so Core marks them read; the profile decides the count
                int count = countFor(profile, i);
                long first = now - 30L * 86400 + (i * 3600L) % 86400;
                long step = Math.Max(1, (now - 3600 - first) / Math.Max(1, count));
                int unreadTail = (i % 3 == 0) ? 1 + (i % 3 + i / 3) % 3 : 0;
                long contactStart = clock.ElapsedMilliseconds;
                int contactMessages = 0;
                for (int j = 0; j < count; j++)
                {
                    bool local = (i + j) % 2 == 0;
                    bool tail = j >= count - unreadTail;
                    if (tail) local = false;                         // an unread tail is always incoming
                    long ts = tail ? now + 1 + (j - (count - unreadTail)) : first + j * step;
                    string text = Lines[(i + j) % Lines.Length];
                    try
                    {
                        FriendList.addMessageWithType(messageIdFor(i, j), FriendMessageType.standard, address, 0, text,
                            local, null, ts, false, 0);
                        messages++;
                        contactMessages++;
                    }
                    catch (Exception e)
                    {
                        refused++;
                        if (present == 0) Logging.warn("[DEVSEED] message " + i + ":" + j + " skipped: " + e.GetType().Name);   // ★ #46 r1 S-1: the TYPE only (an IO message holds a full path)
                    }
                }
                if (unreadTail > 0)
                {
                    friend.metaData.unreadMessageCount = unreadTail;
                    friend.saveMetaData();
                }
                friend.save();
                if (count >= HeavyMessages)
                {
                    // ★ Session J: the number Damir asked for — the store write of 1000 messages
                    Logging.info("[DEVSEED] contact " + (i + 1).ToString("00") + ": " + contactMessages + " messages written in "
                        + (clock.ElapsedMilliseconds - contactStart) + " ms");
                }
            }
            clock.Stop();
            UIHelpers.shouldRefreshContacts = true;
            double perMsg = messages > 0 ? (double)clock.ElapsedMilliseconds / messages : 0;
            string status = "Seeded " + profile + ": " + added + " contacts added, " + present + " topped up, " + messages
                + " messages written in " + clock.ElapsedMilliseconds + " ms (" + perMsg.ToString("0.00") + " ms/msg"
                + (refused > 0 ? ", " + refused + " already present" : "") + ").";
            status += " " + seedImageChats();   // ★ perfb1 seed: after the clock stopped — the ms/msg above stays the fifty's
            Logging.info("[DEVSEED] " + status);
            return status;
        }

        /* ★ perfb1 seed: the image chats (SDevSeedPlan.imagePlan). Runs on the seed's own thread (SettingsPage Task.Run).
         * A re-seed is a top-up like the fifty: Core refuses an id it holds (FriendList.cs:258), a photo file that is
         * there with OUR bytes is kept (SDevSeedPlan.fileState / fileAction: SHA-256), so nothing is written twice; a file
         * with our name and other bytes is refused (counted, never overwritten, never adopted). Never throws; the
         * log lines carry the seed index and exception TYPES only — never a path, a name or a message. */
        private static string seedImageChats()
        {
            int added = 0, present = 0, photos = 0, texts = 0, files = 0, refused = 0;
            var clock = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                string sentDir = Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName);
                string recvDir = TransferManager.downloadsPath;
                bool dirsOk = Path.IsPathRooted(sentDir) && Path.IsPathRooted(recvDir);   // TransferManager.start set the root
                if (dirsOk)
                {
                    Directory.CreateDirectory(sentDir);
                    Directory.CreateDirectory(recvDir);
                }
                for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)
                {
                    Address address = addressFor(i);
                    Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.Approved, address, null, SDevSeedPlan.imageNick(i), null, null, 0, true);
                    if (friend == null)
                    {
                        friend = FriendList.getFriend(address);   // already there: top up
                        if (friend == null) { refused++; continue; }
                        present++;
                    }
                    else
                    {
                        added++;
                    }
                    string peer = address.ToString();
                    string album = SDevSeedPlan.albumId(i);
                    List<KeyValuePair<string, string>> albumRows = new List<KeyValuePair<string, string>>();
                    foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i))
                    {
                        byte[] id = messageIdFor(i, m.j);
                        try
                        {
                            if (!m.photo)
                            {
                                if (FriendList.addMessageWithType(id, FriendMessageType.standard, address, 0, m.text, m.local, null, m.ts, false, 0) != null) texts++;
                                continue;
                            }
                            if (!dirsOk) { refused++; continue; }
                            string dir = m.local ? sentDir : recvDir;
                            string leaf = SDevSeedPlan.localLeaf(i, m);
                            string path = Path.Combine(dir, leaf);
                            long size = SDevSeedPlan.pngLength(m.width, m.height);
                            if ((m.local && PhotoRules.sentFileName(SDevSeedPlan.transferUid(i, m.j), ".png") != leaf)
                                || (!m.local && !TransferManager.isInsideDownloadsRoot(path)))
                            {
                                refused++;   // fail closed: the name is not the shape the app's own rules accept
                                continue;
                            }
                            int wrote = ensurePhoto(sentDir, dir, leaf, i, m);
                            if (wrote < 0) { refused++; continue; }
                            files += wrote;
                            FriendMessage? fm = FriendList.addMessageWithType(id, FriendMessageType.fileHeader, address, 0, SDevSeedPlan.headerText(i, m, size),
                                m.local, null, m.ts, false, 0);
                            if (m.albumIndex >= 0)
                            {
                                albumRows.Add(new KeyValuePair<string, string>(Crypto.hashToString(id), PhotoRules.groupArg(album, m.albumIndex, m.albumCount, "")));
                            }
                            if (fm == null)
                            {
                                continue;   // already there (a top-up): Core refused the id, its stored fields stay
                            }
                            // the fields a COMPLETED transfer leaves (TransferManager.completeFileTransfer; handleFileHeader)
                            // ★ #46 r1 B-5: `completed` BEFORE `filePath`, as TransferManager.completeFileTransfer sets them (:923-924) —
                            // Core's writer thread reads the row without a lock, and a SENT row with a filePath and completed == false is
                            // re-armed as a transfer on read
                            fm.transferId = SDevSeedPlan.transferUid(i, m.j);
                            if (!m.local)
                            {
                                fm.fileSize = (ulong)size;
                            }
                            fm.completed = true;
                            fm.filePath = path;
                            photos++;
                        }
                        catch (Exception e)
                        {
                            refused++;
                            Logging.warn("[DEVSEED] image message " + i + ":" + m.j + " skipped (" + e.GetType().Name + ")");
                        }
                    }
                    if (albumRows.Count > 0)
                    {
                        SPhotoGroups.setMany(peer, albumRows, peer);   // a RECEIVED album: from = the peer (handleFileHeader's 1:1 case)
                    }
                    IxianHandler.localStorage.requestWriteMessages(address, 0);   // the file fields set above reach the disk
                    friend.save();
                }
            }
            catch (Exception e)
            {
                refused++;
                Logging.warn("[DEVSEED] image chats stopped (" + e.GetType().Name + ")");
            }
            clock.Stop();
            UIHelpers.shouldRefreshContacts = true;
            return "Image chats (Seed 51-53): " + added + " added, " + present + " topped up, " + photos + " photos and " + texts
                + " texts written, " + files + " files written in " + clock.ElapsedMilliseconds + " ms"
                + (refused > 0 ? ", " + refused + " refused" : "") + ".";
        }

        /** ★ perfb1 seed: what is on disk under a seed name — absent / OURS (the SHA-256 of the file = that of the deterministic PNG, read only when
         *  the length matches) / foreign (SDevSeedPlan.fileState). FileInfo.Length: SettingsPage.xaml.cs:2075; File.ReadAllBytes: Utils.cs:175. */
        private static string stateOf(string path, int i, SDevSeedPlan.ImageMsg m)
        {
            FileInfo fi = new FileInfo(path);
            return SDevSeedPlan.fileState(fi.Exists, fi.Exists ? fi.Length : 0, SDevSeedPlan.pngLength(m.width, m.height),
                () => File.ReadAllBytes(path), () => SDevSeedPlan.png(i, m.j, m.width, m.height));
        }

        /** ★ perfb1 seed: 1 = written (a temp leaf in Sent/, then a move), 0 = there with OUR bytes (kept), -1 = a foreign file holds the name
         *  (never overwritten, never adopted). The temp is in the app's own Sent/ folder for BOTH directions — never in Downloads/, where a peer
         *  names the files. File.Move without overwrite throws if a file appeared meanwhile (counted by the caller). Both folders are children of
         *  Config.spixiUserFolder (PhotoRules.SentFolderName; TransferManager.cs:355 — Downloads), so the move is a rename on one volume
         *  (SingleChatPage.xaml.cs:3395 and TransferManager.cs:878 move between folders the same way). An IO error throws to the caller
         *  (counted, its type logged); the temp is deleted on the way out (a kill leaves it: the startup pending sweep and the account wipe take it). */
        private static int ensurePhoto(string sentDir, string dir, string leaf, int i, SDevSeedPlan.ImageMsg m)
        {
            string path = Path.Combine(dir, leaf);
            string action = SDevSeedPlan.fileAction(stateOf(path, i, m));
            if (action == SDevSeedPlan.FileKeep)
            {
                return 0;
            }
            if (action != SDevSeedPlan.FileWrite)
            {
                return -1;
            }
            string tmp = Path.Combine(sentDir, SDevSeedPlan.tmpLeaf(i, m.j));
            try
            {
                File.WriteAllBytes(tmp, SDevSeedPlan.png(i, m.j, m.width, m.height));   // truncates a temp of OUR name left by a kill (SingleChatPage.xaml.cs:3097)
                File.Move(tmp, path);
            }
            catch (Exception)
            {
                try { deleteOwnTmp(sentDir, i, m.j); } catch (Exception) { }
                throw;
            }
            return 1;
        }

        /** ★ perfb1 seed: delete the temp leaf of (i, j) in Sent/ — only the exact name the plan builds, only in the Sent/ folder. 1 = deleted. */
        private static int deleteOwnTmp(string sentDir, int i, int j)
        {
            string tmpName = SDevSeedPlan.tmpLeaf(i, j);
            string tmp = Path.Combine(sentDir, tmpName);
            if (SDevSeedPlan.mayDeleteTmp(tmpName, i, j) && File.Exists(tmp))
            {
                File.Delete(tmp);
                return 1;
            }
            return 0;
        }

        /** ★ perfb1 seed: after unseed's ONE removal loop removed the image chats' contacts (Core deletes their history):
         *  their photo-group entries, and every file C# wrote for them (by the names the plan builds; a photo ONLY when its content is
         *  ours — SHA-256, SDevSeedPlan.mayDelete; a file with our name and other bytes is counted as refused and stays; the temp leaf
         *  of (i, j) in Sent/ only by its exact name, SDevSeedPlan.mayDeleteTmp). */
        private static string unseedImageChats()
        {
            int refused = 0, deleted = 0;
            try
            {
                string sentDir = Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName);
                string recvDir = TransferManager.downloadsPath;
                bool dirsOk = Path.IsPathRooted(sentDir) && Path.IsPathRooted(recvDir);
                for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)
                {
                    Address address = addressFor(i);
                    if (FriendList.getFriend(address) != null)
                    {
                        refused++;   // the contact is still there (its removal was refused): its files stay with it
                        continue;
                    }
                    SPhotoGroups.clear(address.ToString());
                    if (!dirsOk)
                    {
                        continue;
                    }
                    foreach (SDevSeedPlan.ImageMsg m in SDevSeedPlan.imagePlan(i))
                    {
                        if (!m.photo)
                        {
                            continue;
                        }
                        try
                        {
                            string dir = m.local ? sentDir : recvDir;
                            string leaf = SDevSeedPlan.localLeaf(i, m);
                            string path = Path.Combine(dir, leaf);
                            deleted += deleteOwnTmp(sentDir, i, m.j);   // a temp a kill left in Sent/ (its exact name only)
                            if (!m.local && !TransferManager.isInsideDownloadsRoot(path))
                            {
                                continue;
                            }
                            string state = stateOf(path, i, m);
                            if (SDevSeedPlan.mayDelete(state))
                            {
                                File.Delete(path);
                                deleted++;
                            }
                            else if (state == SDevSeedPlan.StateForeign)
                            {
                                refused++;   // a file with our name and not our bytes: never deleted
                            }
                        }
                        catch (Exception e)
                        {
                            refused++;
                            Logging.warn("[DEVSEED] image file " + i + ":" + m.j + " not removed (" + e.GetType().Name + ")");
                        }
                    }
                }
            }
            catch (Exception e)
            {
                refused++;
                Logging.warn("[DEVSEED] image chats removal stopped (" + e.GetType().Name + ")");
            }
            return "Image chats (Seed 51-53): " + deleted + " files deleted" + (refused > 0 ? ", " + refused + " refused" : "") + ".";
        }

        /// <summary>Remove exactly the seeded contacts. Returns the status sentence.</summary>
        public static string unseed()
        {
            int removed = 0, missing = 0, refused = 0;
            // ★ perfb1 seed: the same ONE removal walks the image chats too (seed index 50–52 follow the fifty)
            for (int i = 0; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)
            {
                Friend? friend = FriendList.getFriend(addressFor(i));
                if (friend == null) { missing++; continue; }
                try
                {
                    // ★ S15 (O-06, #1293): a seeded contact muted during a measure run leaves no mute key behind
                    if (FriendList.removeFriend(friend)) { removed++; SPIXI.Meta.SNotificationPrefs.forgetContact(friend.walletAddress.ToString()); } else refused++;
                }
                catch (Exception e)
                {
                    refused++;
                    Logging.warn("[DEVSEED] remove " + i + " failed: " + e.GetType().Name);   // ★ #46 r1 S-1: the TYPE only
                }
            }
            string status = "Removed " + removed + " seeded contacts (" + missing + " absent, " + refused + " refused).";
            status += " " + unseedImageChats();   // ★ perfb1 seed: Seed 51–53, their photo groups and their files
            UIHelpers.shouldRefreshContacts = true;
            Logging.info("[DEVSEED] " + status);
            return status;
        }

        /// <summary>How many of the fifty are present right now (★ perfb1 seed: and of the three image chats).</summary>
        public static string status()
        {
            int present = 0;
            for (int i = 0; i < Count; i++)
            {
                if (FriendList.getFriend(addressFor(i)) != null) present++;
            }
            int images = 0;
            for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)
            {
                if (FriendList.getFriend(addressFor(i)) != null) images++;
            }
            if (present == 0 && images == 0)
            {
                return "Nothing seeded.";
            }
            return present + " of " + Count + " seeded contacts present, " + images + " of " + SDevSeedPlan.ImageChats + " image chats (Seed 51-53).";
        }
    }
}
#endif
