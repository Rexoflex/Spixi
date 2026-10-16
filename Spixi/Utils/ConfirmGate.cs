/* ★ Session Safety #46 r2/r3 (S-5, P35) — the PURE state machine behind SConfirm (the native confirm before a destructive verb),
 * executed by scripts/csh (ConfirmGateTests.cs). No MAUI; one lock.
 *   · ONE confirm at a time: tryEnter → a token (> 0) or 0 (refused: a confirm is up, or another Spixi alert is up).
 *   · Released ONLY by exit(token) — when the dialog's own task completes (MAUI completes it on dismissal). ★ #46 r3 MAJOR-1:
 *     a time bound (r2) released a confirm that was still ON SCREEN, so a page could wait it out and stack alerts again. There
 *     is NO time bound now: the gate FAILS CLOSED. If a dialog task ever never completed, confirms answer "busy" (nothing
 *     destructive happens) and other alerts are dropped (a dropped OK/Cancel alert answers false = cancel) until restart —
 *     recorded in P35 + a walk row (rotate / background the app with a confirm open, then use a confirm and a payment).
 *   · Other alerts are tracked one by one (tryAlertOpened → a token, alertClosed(token)), so a late close of one alert can never
 *     uncount another (#46 r3 MINOR-1). An unknown or repeated close is ignored. */
using System.Collections.Generic;

namespace SPIXI
{
    public sealed class ConfirmGate
    {
        private readonly object sync = new object();
        private long nextToken = 0;
        private long holder = 0;                                   // the confirm holding the gate (0 = none)
        private readonly HashSet<long> others = new HashSet<long>(); // other alerts on screen

        /** A token > 0 when this caller now holds the gate; 0 when refused (a confirm or another alert is up). */
        public long tryEnter()
        {
            lock (sync)
            {
                if (holder != 0 || others.Count > 0)
                {
                    return 0;
                }
                holder = ++nextToken;
                return holder;
            }
        }

        /** Releases the gate only for its holder (any other token is ignored). */
        public void exit(long token)
        {
            lock (sync)
            {
                if (token != 0 && token == holder)
                {
                    holder = 0;
                }
            }
        }

        /** True while a confirm holds the gate. */
        public bool isOpen
        {
            get { lock (sync) { return holder != 0; } }
        }

        /** ★ #46 r4 (NIT-1): the drop test and the count in ONE step — 0 while a confirm holds the gate (the alert must be
         *  dropped), else the alert's token for alertClosed. */
        public long tryAlertOpened()
        {
            lock (sync)
            {
                if (holder != 0)
                {
                    return 0;
                }
                long t = ++nextToken;
                others.Add(t);
                return t;
            }
        }

        public void alertClosed(long token)
        {
            lock (sync)
            {
                others.Remove(token);
            }
        }

        public bool othersOpen
        {
            get { lock (sync) { return others.Count > 0; } }
        }
    }
}
