using SPIXI.Meta;

namespace SPIXI
{
    /** The peer's local stores forgotten, then (switch on, #1966 (3)) the Sent sweep, so my Sent copies named in the removed rows go too. */
    public static class SentSweepOnForget
    {
        public static void forget(string? peer)
        {
            SPeerLocalStores.forget(peer);
            if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();
        }
    }
}
