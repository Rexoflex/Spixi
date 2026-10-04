/* ★ #1166 P-03 / P-04 / V-4 (session 5b) — the PURE rules behind the chats list and the group cap.
 *
 * HomePage is MAUI-bound and compiles nowhere outside the app, so the three decisions it now makes are stated HERE
 * (strings / ints in → one answer out) and scripts/csh executes them (#46 r1 M2). No MAUI type, no Core type.
 *
 *   ChatsBatch   — the ONE-push transport for a full chats / contacts flush (the #801 wire, `addMessages` grammar):
 *                  { "strs": [], "items": [ { "f": "<command>", "a": [ …the OLD argument list, in the OLD order… ] } ] }
 *                  The JSON is written by hand (no serializer: the harness has no NuGet, and the app must not depend on
 *                  reflection-based serialization under the iOS trimmer). Every char outside printable ASCII is a
 *                  \uXXXX escape, so the base64 the bridge adds decodes on the shell's ASCII fast path, and a lone
 *                  surrogate in a peer nick survives byte for byte. The object's FIRST key is "strs", so the payload
 *                  can never take Utils.sendUiCommand's raw `data:` fast path (the #801 structural rule).
 *   AvatarLedger — P-04: one `setAvatarFor(address, dataUri)` per address per DOCUMENT, again only when the avatar
 *                  changed. The ledger keeps address → length:hash of the data URI (never the URI itself); reset() when
 *                  the document dies. A row then carries "" in its avatar argument (the position is kept), or the short
 *                  non-data value it always carried (the "img/…" sentinels, a raw-path fallback).
 *   GroupLimit   — V-4 (#1141): Core rejects a createGroup with more than 10 participants
 *                  (Ixian-Core Streaming/Models/CreateGroupMessage.cs:58), the creator is not in the list → 10 picks.
 */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI
{
    internal sealed class ChatsBatch
    {
        private readonly List<KeyValuePair<string, string?[]>> items = new List<KeyValuePair<string, string?[]>>();

        internal int Count => items.Count;

        internal IReadOnlyList<KeyValuePair<string, string?[]>> Items => items;

        internal void add(string cmd, params string?[] args)
        {
            items.Add(new KeyValuePair<string, string?[]>(cmd, args ?? Array.Empty<string?>()));
        }

        internal string toJson()
        {
            StringBuilder sb = new StringBuilder(64 + items.Count * 160);
            sb.Append("{\"strs\":[],\"items\":[");
            for (int i = 0; i < items.Count; i++)
            {
                if (i > 0)
                {
                    sb.Append(',');
                }
                sb.Append("{\"f\":");
                appendString(sb, items[i].Key);
                sb.Append(",\"a\":[");
                string?[] a = items[i].Value;
                for (int j = 0; j < a.Length; j++)
                {
                    if (j > 0)
                    {
                        sb.Append(',');
                    }
                    if (a[j] == null)
                    {
                        sb.Append("null");
                    }
                    else
                    {
                        appendString(sb, a[j]!);
                    }
                }
                sb.Append("]}");
            }
            sb.Append("]}");
            return sb.ToString();
        }

        internal static void appendString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                if (c == '"')
                {
                    sb.Append("\\\"");
                }
                else if (c == '\\')
                {
                    sb.Append("\\\\");
                }
                else if (c < 0x20 || c > 0x7E)
                {
                    sb.Append("\\u");
                    sb.Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                }
                else
                {
                    sb.Append(c);
                }
            }
            sb.Append('"');
        }
    }

    internal sealed class AvatarLedger
    {
        private readonly Dictionary<string, string> sent = new Dictionary<string, string>(StringComparer.Ordinal);
        private readonly object gate = new object();

        internal static bool isDataUri(string? v)
        {
            return v != null && v.StartsWith("data:image/", StringComparison.Ordinal);
        }

        /** The value the ledger keeps for a URI: its length and a hash — never the URI. */
        internal static string signature(string uri)
        {
            unchecked
            {
                ulong h = 14695981039346656037UL;   // FNV-1a 64 — stable across processes, unlike string.GetHashCode
                foreach (char c in uri)
                {
                    h ^= c;
                    h *= 1099511628211UL;
                }
                return uri.Length.ToString(CultureInfo.InvariantCulture) + ":" + h.ToString("x16", CultureInfo.InvariantCulture);
            }
        }

        /** One row is about to be pushed with `avatar` (what Utils.imageToDataUri returned for it).
         *  `push` = the setAvatarFor value to send BEFORE the row (null = nothing to send; "" = forget the old one),
         *  return value = what the row's avatar argument carries. */
        internal string rowArg(string address, string? avatar, out string? push)
        {
            push = null;
            bool data = isDataUri(avatar);
            if (string.IsNullOrEmpty(address))
            {
                return avatar ?? "";   // no key to file it under → the row keeps carrying it (the old shape)
            }
            lock (gate)
            {
                if (data)
                {
                    string sig = signature(avatar!);
                    if (!sent.TryGetValue(address, out string? had) || had != sig)
                    {
                        sent[address] = sig;
                        push = avatar;
                    }
                }
                else if (sent.Remove(address))
                {
                    push = "";   // the photo went away (removed, or no longer readable) → the shell forgets it
                }
            }
            return data ? "" : (avatar ?? "");
        }

        /** The document that heard the pushes is gone (onLoaded · reload · reloadShell). */
        internal void reset()
        {
            lock (gate)
            {
                sent.Clear();
            }
        }

        internal int Count
        {
            get
            {
                lock (gate)
                {
                    return sent.Count;
                }
            }
        }
    }

    internal static class GroupLimit
    {
        /** Picked members a group may have BESIDES the creator (Core: CreateGroupMessage.cs:58, `count.num > 10` throws). */
        internal const int MaxPicked = 10;

        internal static bool exceeds(int picked)
        {
            return picked > MaxPicked;
        }
    }
}
