/* The trim hook's rule (ImgurlFlags.TrimHook): which hidden WebView the app frees at a trim level. Android 14+ delivers only
 * UI_HIDDEN (20) and BACKGROUND (40) to an app (MauiProgram's RUNNING_LOW / RUNNING_CRITICAL lambda never fires there);
 * older Android also delivers MODERATE (60) and COMPLETE (80) to a background app.
 * Pure: no MAUI type, no Core type. scripts/csh executes it (LifeTests.cs); SpixiContentPage.lifeTrim calls it. */
namespace SPIXI;

internal static class TrimRules
{
    internal const int Background = 40;
    internal const int Moderate = 60;
    internal const int DropSpare = 1;
    internal const int DropParked = 2;

    /** The chat spare's drop word: neither a re-arm nor a cancel word of SpareRearmRules, so a re-arm left pending by the
     *  sleep drop stays pending. */
    internal const string Why = "trim";

    /** The bits to drop. Below BACKGROUND (UI_HIDDEN at every app switch, the RUNNING_* levels): nothing — App.OnSleep owns
     *  the spare at the switch (with its short-sleep keep, SpareKeepShortSleep), the parked Account is the warm return, and
     *  MauiProgram's lambda keeps RUNNING_LOW / RUNNING_CRITICAL. BACKGROUND: the parked page, and the spare unless it is
     *  kept for a short sleep (the keep has its own limit and proof). MODERATE and above (near the kill end of the LRU
     *  list): both. Switch off: nothing. */
    internal static int drops(bool flagOn, int level, bool spareKept)
    {
        if (!flagOn || level < Background) return 0;
        return level >= Moderate || !spareKept ? DropSpare | DropParked : DropParked;
    }

    /** The dev line: fixed words, the level number and what was really dropped. */
    internal static string line(int level, int dropped) => "[TRIM] level=" + level + " spare=" + (dropped & DropSpare) + " parked=" + ((dropped & DropParked) >> 1);
}
