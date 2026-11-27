using IXICore.Meta;

namespace SPIXI;

/* The hidden WebViews at a trim (ImgurlFlags.TrimHook: MainApplication.OnTrimMemory). Main thread. */
public partial class SpixiContentPage
{
#if ANDROID
    /** The trim hook's drop (TrimRules.drops; the caller read the switch). Returns the bits really dropped: 1 = the spare,
     *  2 = the parked page. A spare kept over a short sleep (Kept / Proving) counts as kept. */
    internal static int lifeTrim(int level, bool flagOn)
    {
        int dropped;
        lock (preloadLock)
        {
            bool kept = spareKeepOp != null && spareKeepOp == spareChatOp && (spareKeepState == SpareKeepRules.Kept || spareKeepState == SpareKeepRules.Proving);
            dropped = TrimRules.drops(flagOn, level, kept) & ((spareChatOp != null ? TrimRules.DropSpare : 0) | (parkedOverlay != null ? TrimRules.DropParked : 0));
        }
        if ((dropped & TrimRules.DropSpare) != 0) dropSpareChat("trim");   // the fixed word of TrimRules.Why (a literal: every drop site passes one)
        if ((dropped & TrimRules.DropParked) != 0) disposeParkedOverlay();
#if SPIXI_DEV_COEXIST
        Logging.info(TrimRules.line(level, dropped));   // dev build only (R5)
#endif
        return dropped;
    }
#endif
}
