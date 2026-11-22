using System.Threading;

namespace SPIXI
{
    /* ★ fixb3 item 2 (#1744 (3), n-20261113-delete-history-chat-info-media) — the chat-info shared-items SCAN GATE.
     * What: a generation counter for one ContactDetails page's shared-items scans. begin() hands out a new token, strictly
     * larger than every token before; isLatest(token) is true only for the token of the LAST begin().
     * Why: after "Delete history" the page re-runs its own scan and pushes setSharedItems again (the existing push; the scan
     * of an empty history is []). The boot scan (ixian:sharedItems) runs off the UI thread and may still be in flight — its
     * late, OLDER answer must not land after the new one and paint the deleted media again. Each scan takes a token before
     * its Task.Run and pushes only while its token is still the latest (checked on the main thread, right before the push).
     * A hole-closing fix (#1321: deleted data that stays visible), so NO switch: the old path IS the fault.
     * PURE (no MAUI, no Core type, no log), thread-safe (Interlocked / Volatile), so scripts/csh EXECUTES it
     * (FixB3ChatInfoTests.cs). The call sites (ContactDetails.pushSharedItems) are MAUI-bound: scripts/pins-fixb3/b-delete-history.mjs. */
    public sealed class SharedScanGate
    {
        private int latest = 0;

        /** A new token, strictly larger than every token before (wraps only after 2^31 - 1 scans of one page). */
        public int begin()
        {
            return Interlocked.Increment(ref latest);
        }

        /** True only for the token of the last begin(). */
        public bool isLatest(int token)
        {
            return token != 0 && Volatile.Read(ref latest) == token;
        }
    }
}
