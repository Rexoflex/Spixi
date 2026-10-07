/* ★ S10 (#1254 · CONTRACT-S10 §1 P1 · §2 F1 · §3 F4) — the PURE half of the paste / attach strip, the F1 probe token and
 * the F4 haptic fallback (scripts/csh: S10MediaTests.cs). No MAUI, no Core type, no disk — the harness executes every rule.
 * The call sites (SingleChatPage's media region, SpixiContentPage's hold + performHaptic) are pinned by
 * scripts/pins-s10/a-wiring.mjs.
 *
 * SECURITY (CLAUDE.md ★): `ixian:mediaDrop:` carries only a C#-generated batch id and ONE digit — both validated here
 * before C# looks anything up; the file that goes is the one C# recorded for that key (never a WebView value). */
using System;
using System.Collections.Generic;
using System.Globalization;

namespace SPIXI
{
    public static class S10MediaRules
    {
        public const string HapticClick = "click";
        public const string HapticLong = "long";
        public const string HapticSuccess = "success";

        /** The smallest digit 0..MaxBatch-1 not in `used` (an open batch's keys); -1 when every slot is taken. */
        public static int nextKey(IReadOnlyCollection<int> used)
        {
            for (int k = 0; k < PhotoRules.MaxBatch; k++)
            {
                bool taken = false;
                foreach (int u in used)
                {
                    if (u == k)
                    {
                        taken = true;
                        break;
                    }
                }
                if (!taken)
                {
                    return k;
                }
            }
            return -1;
        }

        /** `ixian:mediaDrop:<16hex>:<k>` after the prefix: exactly `^[0-9a-f]{16}:[0-9]$` (the id as isId16). False = refuse. */
        public static bool parseDrop(string? payload, out string batchId, out int k)
        {
            batchId = "";
            k = -1;
            if (payload == null || payload.Length != 18 || payload[16] != ':')
            {
                return false;
            }
            string id = payload.Substring(0, 16);
            char d = payload[17];
            if (!PhotoRules.isId16(id) || d < '0' || d > '9')
            {
                return false;
            }
            batchId = id;
            k = d - '0';
            return true;
        }

        /** F4: buzz through the Vibrator only when the view's own haptic was refused (ok false), the user has NOT switched
         *  touch feedback off (hfe ≠ 0; -1 = unknown) and the predefined effects exist (API 29+). */
        public static bool hapticFallback(bool ok, int hfe, int sdk)
        {
            return !ok && hfe != 0 && sdk >= 29;
        }

        /** F4: the probe word of an `ixian:haptic:` argument — the exact word, or null (unknown = nothing logged). */
        public static string? hapticWord(string? raw)
        {
            switch (raw)
            {
                case HapticClick: return HapticClick;
                case HapticLong: return HapticLong;
                case HapticSuccess: return HapticSuccess;
                default: return null;
            }
        }

        /** F4: long and success play the HEAVY click; click plays the click. */
        public static bool hapticHeavy(string? word)
        {
            return word == HapticLong || word == HapticSuccess;
        }

        /** F1 probe token: an ARGB colour as 8 lowercase hex (the [P1] grammar has no '#' and no uppercase), null → "none". */
        public static string argbToken(int? argb)
        {
            return argb.HasValue ? ((uint)argb.Value).ToString("x8", CultureInfo.InvariantCulture) : "none";
        }
    }
}
