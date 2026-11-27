using System;

namespace SPIXI
{
    /* The chat page's rule for a picture push (setFileThumb, viewerImage) when the media origin may carry it (switch
     * ImgurlFlags.MediaOrigin; the URLs are MediaGrants'): which value goes into the existing push, and which cap words the
     * page's setCaps declares. Why one rule: the shell admits a URL only after it heard `mediaOrigin` in THIS document, so a
     * URL is pushed only for the document whose caps declared it, while its WebView's handler serves; every other case is
     * today's data: URI of the same JPEG bytes. Pure: no MAUI type, no MediaGrants call, no log line (scripts/csh:
     * MediaPushTests.cs). */
    public static class MediaPushRules
    {
        public const string JpegDataPrefix = "data:image/jpeg;base64,";
        public const string OriginCap = ",mediaOrigin", KeepCap = ",mediaKeep";

        /** The URL path for a push of document `doc`: the switch on, the handler serving, and `declaredDoc` (the document whose
         *  setCaps carried mediaOrigin; -1 = none) is `doc`. */
        public static bool urlPath(bool switchOn, bool serving, int declaredDoc, int doc) => switchOn && serving && declaredDoc >= 0 && declaredDoc == doc;

        /** The value of the push: the grant URL when there is one, else the data: URI of the SAME bytes; null = no picture. */
        public static string? valueOf(string? grantUrl, byte[]? jpeg) => jpeg == null || jpeg.Length == 0 ? null : grantUrl ?? JpegDataPrefix + Convert.ToBase64String(jpeg);

        /** The words appended to setCaps: mediaOrigin only with the switch on and the handler serving; mediaKeep only beside it. */
        public static string capsText(bool originOn, bool serving, bool keepOn) => !(originOn && serving) ? "" : keepOn ? OriginCap + KeepCap : OriginCap;
    }
}
