/* ★ S15 F (#1302, Damir 2026-10-10: "both") — the PURE half of "tiles at once" for the photo strip (scripts/csh:
 * S15MediaTests.cs). No MAUI, no disk — the harness executes every rule. The call sites (SingleChatPage: onPickPhotos →
 * the early mediaPicked with one placeholder per picked photo, photoReady → the per-photo update, finishPick → the final
 * push, onMediaDrop → a pending tile's ✕) are MAUI-bound — scripts/pins-s15/f-strip.mjs.
 *
 * The model: the open batch's `shown` list is the strip in order. A picked photo enters it at once as a PLACEHOLDER
 * (pending = true, no thumb, its key reserved up front); when the photo is prepared its placeholder is REPLACED in place
 * (same key, same position); when it fails — or its tile was ✕-ed while it was still being prepared — the placeholder is
 * gone and the prepared file is discarded. A key is "still wanted" only while its placeholder is in the list, so a
 * dropped key never comes back. Every push is pickedJson(shown): the placeholders carry `"pending":"1"` (the 🟡 contract
 * field). */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    public static class S15MediaRules
    {
        /** A placeholder item for key k: no thumb, no size, pending. */
        public static PhotoRules.PickedItem placeholder(int k)
        {
            return new PhotoRules.PickedItem
            {
                k = k.ToString(System.Globalization.CultureInfo.InvariantCulture),
                thumb = "",
                w = 0,
                h = 0,
                kb = 0,
                pending = true,
            };
        }

        /** The keys a batch's list holds (ready AND pending) — the slots a new pick may not take. */
        public static List<int> keysOf(IEnumerable<PhotoRules.PickedItem> shown)
        {
            List<int> keys = new List<int>();
            foreach (PhotoRules.PickedItem it in shown)
            {
                if (it != null && it.k.Length == 1 && it.k[0] >= '0' && it.k[0] <= '9')
                {
                    keys.Add(it.k[0] - '0');
                }
            }
            return keys;
        }

        /** Reserve up to `want` keys beside `used` (each the smallest free one — S10MediaRules.nextKey); fewer when the
         *  batch runs out of slots (the rest = tooMany). */
        public static List<int> reserveKeys(IEnumerable<int> used, int want)
        {
            List<int> taken = new List<int>(used);
            List<int> got = new List<int>();
            for (int i = 0; i < want; i++)
            {
                int k = S10MediaRules.nextKey(taken);
                if (k < 0)
                {
                    break;
                }
                taken.Add(k);
                got.Add(k);
            }
            return got;
        }

        /** The index of key k's PLACEHOLDER in the list, or -1 (no such key, or that key is a ready photo). */
        public static int pendingIndex(IList<PhotoRules.PickedItem> shown, int k)
        {
            string key = k.ToString(System.Globalization.CultureInfo.InvariantCulture);
            for (int i = 0; i < shown.Count; i++)
            {
                if (shown[i] != null && shown[i].pending && shown[i].k == key)
                {
                    return i;
                }
            }
            return -1;
        }

        /** The per-photo update: key k's photo is ready (`ready` ≠ null) or failed (null). Ready → it REPLACES its
         *  placeholder in place (its key set to k); failed → the placeholder goes. Returns false when k has no placeholder
         *  any more (its tile was ✕-ed, or the batch ended) — the caller DISCARDS the prepared file and pushes nothing. */
        public static bool applyReady(IList<PhotoRules.PickedItem> shown, int k, PhotoRules.PickedItem? ready)
        {
            int at = pendingIndex(shown, k);
            if (at < 0)
            {
                return false;
            }
            if (ready == null)
            {
                shown.RemoveAt(at);
                return true;
            }
            ready.k = k.ToString(System.Globalization.CultureInfo.InvariantCulture);
            ready.pending = false;
            shown[at] = ready;
            return true;
        }

        /** A pending tile's ✕ (mediaDrop for a key with no prepared photo yet): its placeholder goes → true; the photo,
         *  when it is ready later, finds no placeholder (applyReady → false) and is discarded. */
        public static bool dropPending(IList<PhotoRules.PickedItem> shown, int k)
        {
            int at = pendingIndex(shown, k);
            if (at < 0)
            {
                return false;
            }
            shown.RemoveAt(at);
            return true;
        }

        /** How many placeholders the list still holds. */
        public static int pendingCount(IEnumerable<PhotoRules.PickedItem> shown)
        {
            int n = 0;
            foreach (PhotoRules.PickedItem it in shown)
            {
                if (it != null && it.pending)
                {
                    n++;
                }
            }
            return n;
        }

        /** The end of a prepare: every placeholder still in the list (the worker stopped early) goes → how many went. */
        public static int dropAllPending(List<PhotoRules.PickedItem> shown)
        {
            return shown.RemoveAll(x => x != null && x.pending);
        }

        /** The [P1] body (P1Perf.line adds "[P1] "): fixed words + integers; first = ms to the first ready photo, -1 when
         *  none was ready. */
        public static string prepareLine(int n, long totalMs, long firstMs)
        {
            return "media prepare n=" + Math.Max(0, n).ToString(System.Globalization.CultureInfo.InvariantCulture)
                + " ms=" + Math.Max(0, totalMs).ToString(System.Globalization.CultureInfo.InvariantCulture)
                + " first=" + (firstMs < 0 ? -1 : firstMs).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }
    }
}
