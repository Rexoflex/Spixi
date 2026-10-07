/* ★ S8 (#1232) — THE QUICK REACTIONS, the verb's arguments, and the untrusted-emoji rule.
 *
 * The list (both sides, this order): 👍 ❤️ 😂 😮 😢 🔥 — the shell's QUICK_REACTIONS (message-menu.js) is the same list.
 * Verb: `ixian:contextAction:react:<msgIdHex>:<index>`, index one decimal digit 0–5 (validated here; anything else is
 * ignored). The old `ixian:contextAction:like:<msgId>` = index 1 (❤️).
 * Wire: Core's `like:` reaction (Friend.addReaction: one reaction per sender per message, not removable; the whole
 * reaction text ≤ 32 UTF-16 units, Ixian-Core Streaming/Friends/Friend.cs:994). ❤️ is sent as the bare `like:` — exactly
 * what an older app sends — so an old heart and a new heart are the same reaction. Every other quick emoji = `like:<emoji>`.
 * Push: each like entry becomes `like:<emoji>:<count>;` (emoji grouped, first-seen order); my own = `like:<emoji>;`.
 * The emoji in a peer's `like:` is UNTRUSTED. ★ S8 #46 r4 — an ALLOW-LIST (the lead's design change after three rounds of
 * letter-shaped characters slipping through a category rule): v1 only ever SENDS the six, so only these are SHOWN — one
 * of the six, or 👍 + exactly one skin-tone modifier U+1F3FB–1F3FF. Everything else (null / "", ❤ without VS16, any
 * other emoji, flags, letters, `:` / `;`) is shown as ❤️. The shell's reactionEmoji (chat.html) is the same rule and
 * renders it with textContent only; the shared case table scripts/pins-s8/emoji-cases.json pins both sides. The v1.1
 * full picker will widen the list.
 * PURE: no MAUI, no Core type — scripts/csh executes every rule (S8RulesTests.cs). */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    public static class ReactionSet
    {
        public static readonly string[] Quick = { "👍", "❤️", "😂", "😮", "😢", "🔥" };
        public const int HeartIndex = 1;
        public const string Heart = "❤️";
        public const string LikePrefix = "like:";
        public const int MaxIdHexChars = 128;   // 64 bytes — a Spixi message id is far shorter

        /** The verb's index: exactly one char '0'..'5' → 0..5; anything else → -1. */
        public static int parseIndex(string? s)
        {
            if (s == null || s.Length != 1)
            {
                return -1;
            }
            int i = s[0] - '0';
            return i >= 0 && i < Quick.Length ? i : -1;
        }

        /** A message id from the WebView: non-empty, even length, ≤ MaxIdHexChars, hex digits only. */
        public static bool isHexId(string? s)
        {
            if (string.IsNullOrEmpty(s) || s.Length % 2 != 0 || s.Length > MaxIdHexChars)
            {
                return false;
            }
            foreach (char c in s)
            {
                bool hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!hex)
                {
                    return false;
                }
            }
            return true;
        }

        /** The reaction text sent for a quick index (a valid index only): ❤️ → `like:` (the old apps' text), else `like:<emoji>`. */
        public static string wireFor(int index)
        {
            if (index < 0 || index >= Quick.Length)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }
            return index == HeartIndex ? LikePrefix : LikePrefix + Quick[index];
        }

        /** The emoji SHOWN for a stored like's data (Core ReactionData.data: null / "" = the old heart) — the allow-list in
         *  the header: one of Quick, or 👍 + one skin tone (exactly 4 UTF-16 units); else ❤️ (a bare U+2764 included). */
        public static string shownEmoji(string? data)
        {
            if (data == null)
            {
                return Heart;
            }
            if (Array.IndexOf(Quick, data) >= 0)
            {
                return data;
            }
            if (data.Length == 4 && data.StartsWith(Quick[0], StringComparison.Ordinal) && char.IsSurrogatePair(data[2], data[3]))
            {
                int tone = char.ConvertToUtf32(data[2], data[3]);
                if (tone >= 0x1F3FB && tone <= 0x1F3FF)
                {
                    return data;
                }
            }
            return Heart;
        }

        /** The like entries of one message's push: `like:<emoji>:<count>;` per shown emoji, first-seen order. "" when none. */
        public static string likeTokens(IEnumerable<string?> datas)
        {
            List<string> order = new List<string>();
            Dictionary<string, int> counts = new Dictionary<string, int>(StringComparer.Ordinal);
            foreach (string? d in datas)
            {
                string e = shownEmoji(d);
                if (counts.TryGetValue(e, out int n))
                {
                    counts[e] = n + 1;
                }
                else
                {
                    counts[e] = 1;
                    order.Add(e);
                }
            }
            StringBuilder sb = new StringBuilder();
            foreach (string e in order)
            {
                sb.Append(LikePrefix).Append(e).Append(':').Append(counts[e].ToString(CultureInfo.InvariantCulture)).Append(';');
            }
            return sb.ToString();
        }

        /** My own like in the push's own-keys argument: `like:<emoji>;`. */
        public static string ownLikeToken(string? data)
        {
            return LikePrefix + shownEmoji(data) + ";";
        }
    }
}
