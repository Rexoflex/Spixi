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
 * nothing (Core refuses duplicate ids too). "Remove seeded contacts" removes exactly the
 * fifty addresses, history and metadata included (FriendList.removeFriend), and nothing
 * else — a real contact can never match a seed address.
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
 * to the profile's count (Core refuses the ids already there). THE STORE WRITE IS THE
 * COST TO MEASURE: the status sentence carries the wall time of the whole seed and the
 * per-message average, and every 1000-message contact logs its own [DEVSEED] line with
 * its milliseconds — read them in logcat (the console mirror is on in this build, App.xaml.cs).
 */
#if SPIXI_DEV_COEXIST
using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using System;
using System.Collections.Generic;
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
                        if (present == 0) Logging.warn("[DEVSEED] message " + i + ":" + j + " skipped: " + e.Message);
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
            Logging.info("[DEVSEED] " + status);
            return status;
        }

        /// <summary>Remove exactly the seeded contacts. Returns the status sentence.</summary>
        public static string unseed()
        {
            int removed = 0, missing = 0, refused = 0;
            for (int i = 0; i < Count; i++)
            {
                Friend? friend = FriendList.getFriend(addressFor(i));
                if (friend == null) { missing++; continue; }
                try
                {
                    if (FriendList.removeFriend(friend)) removed++; else refused++;
                }
                catch (Exception e)
                {
                    refused++;
                    Logging.warn("[DEVSEED] remove " + i + " failed: " + e.Message);
                }
            }
            UIHelpers.shouldRefreshContacts = true;
            string status = "Removed " + removed + " seeded contacts (" + missing + " absent, " + refused + " refused).";
            Logging.info("[DEVSEED] " + status);
            return status;
        }

        /// <summary>How many of the fifty are present right now.</summary>
        public static string status()
        {
            int present = 0;
            for (int i = 0; i < Count; i++)
            {
                if (FriendList.getFriend(addressFor(i)) != null) present++;
            }
            return present == 0 ? "Nothing seeded." : present + " of " + Count + " seeded contacts present.";
        }
    }
}
#endif
