/* ★ #1132 (session 4, the ranked P-1 levers in docs/p1-measurement.md) — the PURE decisions behind levers 2, 3, 5 and 11.
 *
 * SpixiContentPage and HomePage are MAUI-bound and compile nowhere outside the app, so each rule they apply is stated
 * HERE as booleans / bytes in → one answer out, and scripts/csh executes it (#46 r1 M2). No MAUI type, no Core type:
 * the call sites read their own state and pass it in. Change a rule here and the harness says so.
 */
using System;
using System.Collections.Generic;

namespace SPIXI
{
    internal static class OpenPerfRules
    {
        /** Lever 5: may a tap take the pre-warmed chat spare? `isChat` = the spare holds a SingleChatPage · `booted` = its
         *  shell reported `ixian:onload` · `claimWarming` = the lever-5 dial. READY → yes. WARMING → yes only with the dial,
         *  and then the attach waits for the spare's own onload (SpixiContentPage.attachSpareOnBoot), never before. */
        internal static bool spareMayAttach(bool isChat, bool booted, bool claimWarming)
        {
            return isChat && (booted || claimWarming);
        }

        /** Lever 5 (#46 r1 A-N3): a claim on a WARMING spare was cancelled before its attach — re-run the tap on the cold
         *  path? Only when the DOCUMENT failed or went stale under a tap that still stands: it never booted (`boot`), its
         *  attach threw (`attach`), or a theme / language / dev-mode re-bake or low memory dropped it (`theme` · `reload` ·
         *  `language` · `devmode` · `lowmem`). `lowmem` re-runs too (#46 r2 R2-N4): the low-memory drop (Node.cs
         *  onLowMemory) gives back the SPARE — a hidden WebView nobody asked for — not the conversation the user tapped;
         *  the cold open builds the one WebView that tap needs anyway (the floor of any open), so dropping the tap
         *  would save nothing and lose the user's action. Never when the user or the app LEFT: a chat sweep (`close`: tab switch,
         *  cleardetail, tx detail), the host was replaced (`host`), shutdown (`stop`), backgrounding (`sleep`: a cold load
         *  into a suspending process is the dead-renderer case the drop exists for). Unknown word → no retry (one more tap
         *  beats a conversation opening over a screen the user chose). */
        /** Lever 5 (#46 r2 R2-N5): the cold re-run of a cancelled warming claim is POSTED (cancelTakenWarmingSpare may run
         *  off the main thread). A navigation that started in between — the user's next tap, any pushPageLoaded /
         *  pushModalLoaded / spare take, each bumps the navigation sequence under preloadLock — is NEWER and wins, and so
         *  does a later cancel that does not re-run (a `close` sweep, `sleep` …: the user or the app left): the re-run
         *  stands only when the sequence it saw at the cancel is still the current one. */
        internal static bool coldRerunStands(long seqAtCancel, long seqNow)
        {
            return seqAtCancel == seqNow;
        }

        internal static bool takenClaimRetries(string? why)
        {
            switch (why)
            {
                case "boot":
                case "attach":
                case "theme":
                case "reload":
                case "language":
                case "devmode":
                case "lowmem":
                    return true;
                default:
                    return false;
            }
        }

        /** Lever 5 (#46 r1 C-cs2): the `[P1]` bodies of the claim, built HERE so the fence is executed — fixed words and
         *  an integer only. `why` passes only as a fixed lowercase word of 1–12 letters, anything else reads `other`. */
        internal static string p1ClaimWait(long ms)
        {
            return "spare claim warm=1 boot=" + Math.Max(0L, ms);
        }

        internal static string p1ClaimAbandon(string? why)
        {
            bool word = why != null && why.Length >= 1 && why.Length <= 12;
            if (word)
            {
                foreach (char ch in why!)
                {
                    if (ch < 'a' || ch > 'z')
                    {
                        word = false;
                        break;
                    }
                }
            }
            return "spare claim abandon why=" + (word ? why : "other");
        }

        /** Lever 3: is THIS a placement where a spare may warm while a conversation is OPEN? Desktop (WinUI / Mac) and a wide
         *  window with the chat column (`column >= 0`) only — there a chat switch never closes one, so the after-close warm
         *  never fires. A narrow phone keeps today's rule (the spare warms after a close). */
        internal static bool besideOpenChatPlacement(bool desktop, bool wide, int column)
        {
            return desktop && wide && column >= 0;
        }

        /** Lever 3: the warm gate's relaxation — beside an OPEN chat yes (placement allows), beside a STAGING chat never. */
        internal static bool warmBesideOpenChat(bool placementAllows, bool chatStaging)
        {
            return placementAllows && !chatStaging;
        }

        /** Lever 11: ms between hiding a closing overlay stage and removing it (#229b). The wait exists for WinUI — a WebView2
         *  surface torn down in the frame it is still visible flashes — so Windows keeps 100. Android needs only the hide to
         *  reach glass before the teardown: one 60 Hz frame. iOS / Mac keep 100 (not measured, not changed). */
        internal static int closeHideWaitMs(bool windows, bool android)
        {
            if (windows)
            {
                return 100;
            }
            return android ? 16 : 100;
        }

        /** Lever 2: a signature of what the wallet rows show of the contact list (the row text is the contact's nickname when
         *  the counterparty is a contact, else the address). Order-independent (a sum over contacts), so a re-sorted list is
         *  the same signature; a rename, an add or a delete changes it. FNV-1a over the address bytes and the nickname chars. */
        internal static long walletNameSignature(IEnumerable<KeyValuePair<byte[]?, string?>> contacts)
        {
            unchecked
            {
                ulong sum = 0;
                ulong n = 0;
                foreach (KeyValuePair<byte[]?, string?> c in contacts)
                {
                    ulong h = 14695981039346656037UL;
                    if (c.Key != null)
                    {
                        foreach (byte b in c.Key)
                        {
                            h = (h ^ b) * 1099511628211UL;
                        }
                    }
                    h = (h ^ 0xFF) * 1099511628211UL;   // separator: address bytes and name chars never run together
                    if (c.Value != null)
                    {
                        foreach (char ch in c.Value)
                        {
                            h = (h ^ (ch & 0xFFu)) * 1099511628211UL;
                            h = (h ^ ((uint)ch >> 8)) * 1099511628211UL;
                        }
                    }
                    sum += h;
                    n++;
                }
                return walletSignatureOf(sum, n);
            }
        }

        /** Lever 2: the signature from the per-contact hash SUM and the contact COUNT. The count term keeps a contact whose
         *  hash happens to be 0 mod 2^64 (or a set whose hashes cancel) from vanishing: the count alone moves it. */
        internal static long walletSignatureOf(ulong sum, ulong count)
        {
            unchecked
            {
                return (long)(sum ^ (count * 0x9E3779B97F4A7C15UL));
            }
        }

        /** Lever 2: must the rows this document already holds be re-pushed although nothing raised the dirty flag? Only
         *  when the document HOLDS rows (`pushed`) and an input the rows render changed since that push: the names, or the
         *  fiat price. Before the first push the tab entry forces anyway, so this never adds a boot-time push. */
        /** Lever 2 (#46 r1 A-N5): the wallet latch is a DOCUMENT GENERATION, not a bool. HomePage bumps its generation at
         *  every site the document's rows die (onLoaded · reload · reloadShell); a burst reads the generation BEFORE its
         *  rows and, after them, latches THAT generation (or NotFed when the page could not receive it). A burst that
         *  straddles a reload therefore latches the OLD generation, which never equals the new one: an old-document burst
         *  cannot mark the fresh document fed. One int written once — no check-then-set window. */
        internal const int WalletNotFed = -1;

        internal static int walletLatchAfterBurst(bool pageLoaded, int docGenAtBurst)
        {
            return pageLoaded ? docGenAtBurst : WalletNotFed;
        }

        internal static bool walletDocumentFed(int latchedGen, int docGenNow)
        {
            return latchedGen != WalletNotFed && latchedGen == docGenNow;
        }

        internal static bool walletRowsStale(bool pushed, long namesNow, long namesAtPush, bool fiatChanged)
        {
            return pushed && (namesNow != namesAtPush || fiatChanged);
        }
    }
}
