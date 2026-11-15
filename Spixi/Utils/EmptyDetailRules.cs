/* ★ perfb1 P-13 (SpixiFlags.PhoneNoEmptyDetail, default ON) — no EmptyDetail page on a phone until the layout is wide.
 *
 * The EmptyDetail page (empty_detail.html) is the resting right pane of the wide layout. A phone is never wide
 * (HomePage.OnPageSizeChanged: `Width < 700 || isPhoneDisplay()`), but today the page is built in HomePage's field
 * initializer and its WebView boots on the first attach: one more renderer (~4.6–5.0 MB PSS) on the one renderer thread
 * that all Android WebViews share. With the switch ON and a phone display, the page is built at the first WIDE layout
 * (a foldable that opens), once. Switch OFF, or not a phone display (tablet, Windows, Mac): built at start, as today.
 *
 * Pure: the call sites pass the switch, "phone display" (HomePage.isPhoneDisplay, read only with the switch ON), "wide"
 * and "exists" in. No MAUI type, no Core type. Executed by scripts/csh (PerfB1EmptyDetailTests.cs).
 */
namespace SPIXI
{
    internal static class EmptyDetailRules
    {
        /** The deferral applies only with the switch ON and a phone display. */
        internal static bool defers(bool flagOn, bool phoneDisplay)
        {
            return flagOn && phoneDisplay;
        }

        /** HomePage's field initializer: build the page at start? Switch OFF or not a phone display → true (today). */
        internal static bool constructAtStart(bool flagOn, bool phoneDisplay)
        {
            return !defers(flagOn, phoneDisplay);
        }

        /** A layout pass: build the page NOW? Never when one exists (once, never twice); else when the layout is wide or
         *  the rule does not defer. */
        internal static bool constructNow(bool flagOn, bool phoneDisplay, bool wide, bool exists)
        {
            if (exists)
            {
                return false;
            }
            return wide || constructAtStart(flagOn, phoneDisplay);
        }

        /** HomePage.removeDetailContent(true): today it disposes the page and always builds a new one. Build a new one when
         *  one existed (as today) or the rule does not defer; a deferred page that was never built stays unbuilt. */
        internal static bool rebuild(bool flagOn, bool phoneDisplay, bool existed)
        {
            return existed || constructAtStart(flagOn, phoneDisplay);
        }
    }
}
