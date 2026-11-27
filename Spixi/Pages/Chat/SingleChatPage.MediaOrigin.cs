using IXICore;
using Microsoft.Maui.Controls;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI
{
    /* The chat page's half of the media origin (switch ImgurlFlags.MediaOrigin, packet P113): a photo preview and the viewer
     * picture reach the shell as a MediaGrants URL in the existing pushes setFileThumb(id, value) / viewerImage(token, value),
     * so their JPEG bytes stay in C# and the WebView's handler serves them. No new verb, push or argument; two cap words.
     *   · The bytes are C#'s own JPEG from the same sources as the data: path (the preview store / LRU / bounded decoder,
     *     ViewerImage); the id is C#'s own message id; no WebView value reaches a file op or a grant.
     *   · A URL goes only to the document whose setCaps declared mediaOrigin while this WebView's handler serves
     *     (MediaPushRules.urlPath); a refused grant pushes the data: URI of the same bytes; switch OFF = the old calls.
     *   · Grants are bound to this page's WebView and its document (beginDocument at each onLoad) and revoked at the
     *     teardown; a page holds ONE conversation (attach refuses a second), so no grant outlives its conversation.
     *   · No log line. */
    public partial class SingleChatPage
    {
        private volatile int mediaUrlDoc = -1;   // the document whose setCaps declared mediaOrigin; -1 = none
        private WeakReference<WebView>? mediaOwner;   // the WebView the current document's grants are bound to
        // the preview bytes of the URL path where the preview store is not used (chatThumbOf's cache, in bytes)
        private static readonly ChatMediaLru<string, byte[]?> mediaThumbOld = new ChatMediaLru<string, byte[]?>(ChatThumbCacheMax, StringComparer.Ordinal);

        /** onLoad, right after thumbDoc++: every grant of this WebView made for another document is revoked. Main thread. */
        private void mediaBeginDocument()
        {
            WebView? owner = _webView;
            if (!ImgurlFlags.MediaOrigin || owner == null) return;
            mediaOwner = new WeakReference<WebView>(owner);
            MediaGrants.beginDocument(owner, thumbDoc);
        }

        /** The page is torn down: every grant of its WebView goes. Main thread. */
        private void mediaRevoke()
        {
            if (Interlocked.Exchange(ref mediaOwner, null) is WeakReference<WebView> had && had.TryGetTarget(out WebView? owner)) MediaGrants.revokeOwner(owner);
        }

        /** The cap words of this document's setCaps; records the document they declare. Main thread (onLoad). */
        private string mediaOriginCaps()
        {
            bool on = ImgurlFlags.MediaOrigin, serving = on && mediaServing();
            mediaUrlDoc = serving ? thumbDoc : -1;
            return MediaPushRules.capsText(on, serving, on && ImgurlFlags.MediaKeep);
        }

        private bool mediaServing() => _webView is WebView owner && MediaGrants.serving(owner);

        /** Does a push of document `doc` take the URL path? Any thread. */
        private bool mediaUrlFor(int doc) => MediaPushRules.urlPath(ImgurlFlags.MediaOrigin, ImgurlFlags.MediaOrigin && mediaServing(), mediaUrlDoc, doc);

        /** The value of a push on the URL path: the grant URL of `jpeg`, or the data: URI of the same bytes; null = no picture. */
        private string? mediaValue(int doc, MediaKind kind, string idHex, int px, byte[]? jpeg)
            => MediaPushRules.valueOf(jpeg != null && _webView is WebView owner ? MediaGrants.grant(owner, doc, kind, idHex, px, jpeg) : null, jpeg);

        /** processThumb on the URL path. Drainer thread. */
        private string? mediaThumbValue(FileInfo fi, ThumbJob job, out bool hit) => mediaValue(job.doc, MediaKind.Thumb, job.id, ChatThumbPx, chatThumbJpeg(fi, job.id, job.gen, out hit));

        /** onViewImage on the URL path: ViewerImage's bytes form; an unwanted tap gets nothing. Pool thread. */
        private async Task<string?> viewerValueAsync(int doc, string hexId, string file, Func<bool> stillWanted)
        {
            byte[]? jpeg = await ViewerImage.jpegOfAsync(file, stillWanted).ConfigureAwait(false);
            return jpeg == null || !stillWanted() ? null : mediaValue(doc, MediaKind.Viewer, hexId, ViewerImage.MaxEdge, jpeg);
        }

        /* chatThumbFor's steps in the same order, answering the JPEG bytes instead of a data: URI: the source cap and first-bytes
         * sniff before any cache; with the preview store (PhotoThumbStore, a wallet, a key) the memory LRU, the young "no
         * preview" mark, the store, then the decode — kept only when the file is still the keyed version and no delete moved the
         * generation; without the store mediaThumbOld, then the decode. Never throws. */
        private byte[]? chatThumbJpeg(FileInfo fi, string idHex, long gen, out bool hit)
        {
            hit = false;
            try
            {
                Address? chat = friend?.walletAddress;
                bool store = SpixiFlags.PhotoThumbStore && chatThumbStoreFits && chat != null;
                if (store && gen == ChatGenReadHere) gen = ChatMediaStore.generationOf(chat);
                long length = fi.Length;
                if (length <= 0 || length > ChatThumbSourceMax || !ImageSniff.looksLikeImage(readHead16(fi.FullName))) return null;
                long ticks = fi.LastWriteTimeUtc.Ticks;
                string version = ChatMediaStoreRules.fileVersion(fi.FullName, length, ticks);
                string? key = store ? ChatMediaStore.thumbKeyOf(chat, idHex, version) : null;
                if (key == null)
                {
                    if (mediaThumbOld.tryGet(version, out byte[]? old)) { hit = true; return old; }
                    byte[]? fresh = madeChatThumb(fi.FullName);
                    mediaThumbOld.put(version, fresh);
                    return fresh;
                }
                if (chatThumbLru.tryGet(key, out byte[] held) && held != null) { hit = true; return held; }
                if (chatThumbMisses.has(key, Environment.TickCount64)) { hit = true; return null; }
                byte[] kept = ChatMediaStore.getThumb(chat, idHex, version) ?? Array.Empty<byte>();
                if (kept.Length > 0)
                {
                    hit = true;
                    ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, kept));
                    return kept;
                }
                byte[] made = madeChatThumb(fi.FullName) ?? Array.Empty<byte>();
                if (made.Length == 0) { chatThumbMisses.note(key, Environment.TickCount64); return null; }
                FileInfo now = new FileInfo(fi.FullName);
                if (now.Exists && now.Length == length && now.LastWriteTimeUtc.Ticks == ticks
                    && ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, made)))
                {
                    ChatMediaStore.putThumb(chat, idHex, version, made, gen);
                }
                return made;
            }
            catch (Exception) { return null; }
        }

        /** The bounded platform decode at ChatThumbPx; a result above ChatThumbMaxBytes is none. The caller sniffed the source. */
        private static byte[]? madeChatThumb(string fullPath)
        {
            byte[]? jpeg = Spixi.SThumbnail.makeJpeg(fullPath, ChatThumbPx);
            return jpeg != null && jpeg.Length > 0 && jpeg.Length <= ChatThumbMaxBytes ? jpeg : null;
        }
    }
}
