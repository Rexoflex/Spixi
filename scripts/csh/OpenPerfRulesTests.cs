// ★ #1132 (session 4) — the P-1 lever rules (Spixi/Utils/OpenPerfRules.cs), EXECUTED. The call sites are MAUI-bound
// (SpixiContentPage, HomePage) and compile nowhere here; scripts/pins-s4/cs.mjs pins that each site calls these rules.
using System.Collections.Generic;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class OpenPerfRulesTests
{
    [TestMethod]
    public void lever5_ready_spare_attaches()
    {
        Assert.IsTrue(OpenPerfRules.spareMayAttach(true, true, false), "READY, dial off");
        Assert.IsTrue(OpenPerfRules.spareMayAttach(true, true, true), "READY, dial on");
    }

    [TestMethod]
    public void lever5_warming_spare_is_taken_only_with_the_dial()
    {
        Assert.IsTrue(OpenPerfRules.spareMayAttach(true, false, true), "WARMING + dial → taken (attach waits for its onload)");
        Assert.IsFalse(OpenPerfRules.spareMayAttach(true, false, false), "WARMING, dial off → today's why=warming refusal");
    }

    [TestMethod]
    public void lever5_a_non_chat_spare_is_never_taken()
    {
        Assert.IsFalse(OpenPerfRules.spareMayAttach(false, true, true), "not a SingleChatPage");
        Assert.IsFalse(OpenPerfRules.spareMayAttach(false, false, true), "not a SingleChatPage, warming");
    }

    [TestMethod]
    public void lever3_placement_is_desktop_and_wide_and_the_chat_column_only()
    {
        Assert.IsTrue(OpenPerfRules.besideOpenChatPlacement(true, true, 1), "desktop, wide, column 1");
        Assert.IsFalse(OpenPerfRules.besideOpenChatPlacement(false, true, 1), "a wide PHONE/tablet keeps today's rule");
        Assert.IsFalse(OpenPerfRules.besideOpenChatPlacement(true, false, 1), "a NARROW desktop window keeps today's rule");
        Assert.IsFalse(OpenPerfRules.besideOpenChatPlacement(true, true, -1), "the full-span placement (narrow) is never beside");
    }

    [TestMethod]
    public void lever3_never_beside_a_staging_chat()
    {
        Assert.IsTrue(OpenPerfRules.warmBesideOpenChat(true, false), "placement allows, nothing staging");
        Assert.IsFalse(OpenPerfRules.warmBesideOpenChat(true, true), "a chat is STAGING → the `chat` refusal stands");
        Assert.IsFalse(OpenPerfRules.warmBesideOpenChat(false, false), "placement refuses");
    }

    [TestMethod]
    public void lever11_close_wait_per_platform()
    {
        Assert.AreEqual(100, OpenPerfRules.closeHideWaitMs(true, false), "Windows keeps the #229b 100 ms");
        Assert.AreEqual(16, OpenPerfRules.closeHideWaitMs(false, true), "Android: one 60 Hz frame");
        Assert.AreEqual(100, OpenPerfRules.closeHideWaitMs(false, false), "iOS / Mac unchanged");
    }

    private static KeyValuePair<byte[]?, string?> c(string addr, string? nick)
    {
        return new KeyValuePair<byte[]?, string?>(Encoding.ASCII.GetBytes(addr), nick);
    }

    [TestMethod]
    public void lever2_name_signature_moves_on_rename_add_delete_and_not_on_order()
    {
        var a = new List<KeyValuePair<byte[]?, string?>> { c("A1", "Ana"), c("B2", "Bo") };
        long s = OpenPerfRules.walletNameSignature(a);
        Assert.AreEqual(s, OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("B2", "Bo"), c("A1", "Ana") }), "order-independent");
        Assert.AreEqual(s, OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "Ana"), c("B2", "Bo") }), "deterministic");
        Assert.IsTrue(s != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "Anna"), c("B2", "Bo") }), "a rename moves it");
        Assert.IsTrue(s != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "Ana") }), "a delete moves it");
        Assert.IsTrue(s != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "Ana"), c("B2", "Bo"), c("C3", "Cy") }), "an add moves it");
        Assert.IsTrue(s != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "Bo"), c("B2", "Ana") }), "a SWAP of two names moves it (names bind to addresses)");
        Assert.IsTrue(OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>>())
            != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { new KeyValuePair<byte[]?, string?>(null, null) }), "a null contact still counts");
        Assert.IsTrue(OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "š") })
            != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { c("A1", "a") }), "both bytes of a non-ASCII char count");
    }

    /* #46 r1 C-csh1: a pair whose address bytes + name bytes form the SAME stream without the separator — address
       41 00 42 00 + no name vs address 41 00 + name "B" (a name char hashes low byte, high byte: 'B' → 42 00). Without
       the 0xFF separator both streams are 41 00 42 00 and the hashes are equal; with it they differ. */
    [TestMethod]
    public void lever2_the_separator_keeps_address_and_name_apart()
    {
        var k1 = new KeyValuePair<byte[]?, string?>(new byte[] { 0x41, 0x00, 0x42, 0x00 }, "");
        var k2 = new KeyValuePair<byte[]?, string?>(new byte[] { 0x41, 0x00 }, "B");
        Assert.IsTrue(OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { k1 })
            != OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>> { k2 }), "the byte streams coincide without the separator");
    }

    /* #46 r1 C-csh2: the count term, through its seam — an equal hash SUM with a different contact COUNT (a contact that
       hashes to 0, or hashes that cancel mod 2^64) must still move the signature; the sum alone cannot see it. */
    [TestMethod]
    public void lever2_the_count_term_moves_the_signature_at_an_equal_sum()
    {
        Assert.IsTrue(OpenPerfRules.walletSignatureOf(0, 0) != OpenPerfRules.walletSignatureOf(0, 1), "sum 0: no contact vs one that hashes to 0");
        Assert.IsTrue(OpenPerfRules.walletSignatureOf(12345, 2) != OpenPerfRules.walletSignatureOf(12345, 3), "an equal sum, one more contact");
        Assert.AreEqual(OpenPerfRules.walletSignatureOf(0, 0), OpenPerfRules.walletNameSignature(new List<KeyValuePair<byte[]?, string?>>()), "walletNameSignature folds through walletSignatureOf (empty list = sum 0, count 0)");
    }

    /* #46 r1 A-N5: an old-document burst never marks the fresh document fed — the latch is the generation the burst
       read BEFORE its rows. The HomePage sequence, replayed: gen 0, a burst starts (reads 0) · the document reloads
       (gen 1) · the old burst ends and latches · the new document must still read NOT fed. */
    [TestMethod]
    public void lever2_an_old_document_burst_cannot_latch_the_new_document()
    {
        int docGen = 0;
        int latched = OpenPerfRules.WalletNotFed;
        Assert.IsFalse(OpenPerfRules.walletDocumentFed(latched, docGen), "boot: not fed");
        int genAtBurst = docGen;                                            // the burst reads the generation before its rows
        docGen++;                                                           // reload / reloadShell / onLoaded bump it
        latched = OpenPerfRules.walletLatchAfterBurst(true, genAtBurst);    // the old burst ends; pageLoaded is true again
        Assert.IsFalse(OpenPerfRules.walletDocumentFed(latched, docGen), "the straddling burst latched the OLD generation");
        latched = OpenPerfRules.walletLatchAfterBurst(true, docGen);
        Assert.IsTrue(OpenPerfRules.walletDocumentFed(latched, docGen), "a burst inside the new document feeds it");
        Assert.IsFalse(OpenPerfRules.walletDocumentFed(OpenPerfRules.walletLatchAfterBurst(false, docGen), docGen), "#340: a burst an unloaded page dropped never latches");
        docGen++;
        Assert.IsFalse(OpenPerfRules.walletDocumentFed(latched, docGen), "the next reload unlatches with no write to the latch");
    }

    /* #46 r1 A-N3: which cancel causes re-run the tap on the cold path. */
    [TestMethod]
    public void lever5_a_cancelled_claim_re_runs_the_tap_only_when_the_document_went_stale()
    {
        foreach (string w in new[] { "boot", "attach", "theme", "reload", "language", "devmode", "lowmem" })
        {
            Assert.IsTrue(OpenPerfRules.takenClaimRetries(w), w + " → the tap stands → cold re-run");
        }
        foreach (string? w in new[] { "close", "host", "stop", "sleep", "timeout", "warming", "", null, "Theme" })
        {
            Assert.IsFalse(OpenPerfRules.takenClaimRetries(w), (w ?? "null") + " → the user / the app left (or unknown) → no re-run");
        }
    }

    /* #46 r2 R2-N5: the POSTED cold re-run stands only when no navigation (or leave) bumped the sequence after the cancel. */
    [TestMethod]
    public void lever5_a_posted_cold_rerun_never_supersedes_a_newer_tap()
    {
        long navSeq = 41;
        long seqAtCancel = navSeq;                                          // read under the cancel's lock
        Assert.IsTrue(OpenPerfRules.coldRerunStands(seqAtCancel, navSeq), "nothing happened in that turn → the re-run stands");
        navSeq++;                                                           // the user's next tap (pushPageLoaded) before the post runs
        Assert.IsFalse(OpenPerfRules.coldRerunStands(seqAtCancel, navSeq), "a newer tap wins — the re-run returns");
        Assert.IsFalse(OpenPerfRules.coldRerunStands(seqAtCancel, navSeq + 1), "two newer navigations: still superseded");
        Assert.IsFalse(OpenPerfRules.coldRerunStands(seqAtCancel + 1, seqAtCancel), "never stands on a mismatch either way");
    }

    /* #46 r1 C-cs2: the claim's [P1] bodies are fixed words + an integer — executed, with hostile `why` values. */
    [TestMethod]
    public void lever5_the_claim_p1_bodies_are_fixed_words_and_an_integer()
    {
        Assert.AreEqual("spare claim warm=1 boot=37", OpenPerfRules.p1ClaimWait(37));
        Assert.AreEqual("spare claim warm=1 boot=0", OpenPerfRules.p1ClaimWait(-5), "a negative clock reads 0");
        Assert.AreEqual("spare claim abandon why=boot", OpenPerfRules.p1ClaimAbandon("boot"));
        Assert.AreEqual("spare claim abandon why=close", OpenPerfRules.p1ClaimAbandon("close"));
        foreach (string? w in new[] { "1abcDEFghiJKLmnoPQRstuVWXyz2345", "abc def", "a=b", "ana@x", "abc1", "", null, "abcdefghijklm", "š" })
        {
            Assert.AreEqual("spare claim abandon why=other", OpenPerfRules.p1ClaimAbandon(w), "not a fixed word: " + (w ?? "null"));
        }
        Assert.AreEqual("spare claim abandon why=abcdefghijkl", OpenPerfRules.p1ClaimAbandon("abcdefghijkl"), "12 letters pass");
        foreach (string w in new[] { "boot", "attach", "theme", "reload", "language", "devmode", "lowmem", "close", "host", "stop", "sleep", "timeout" })
        {
            Assert.IsTrue(P1Perf.isValidLine("[P1] " + OpenPerfRules.p1ClaimAbandon(w)), "grammar: " + w);
        }
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + OpenPerfRules.p1ClaimWait(long.MaxValue)), "grammar: the widest int");
    }

    [TestMethod]
    public void the_new_p1_lines_pass_the_grammar()
    {
        // the bodies SpixiContentPage composes (p1HoldProbe's widest case + nat=, attachSpareOnBoot, abandonSpareClaim)
        string pv = new string('x', 37);
        Assert.IsTrue(P1Perf.isValidLine("[P1] a1 hold webview=1 handler=1 pv=" + pv + " incontent=1 stageh=1 page=" + new string('p', 30) + " nat=1"), "a1 hold + nat (9 tokens, the widest pv/page)");
        Assert.IsTrue(P1Perf.isValidLine("[P1] spare claim warm=1 boot=1000"), "spare claim");
        Assert.IsTrue(P1Perf.isValidLine("[P1] spare claim abandon why=boot") && P1Perf.isValidLine("[P1] spare claim abandon why=attach"), "spare abandon");
    }

    [TestMethod]
    public void close_probe_lines_pass_the_grammar()
    {
        // ★ #1147 (6): SpixiContentPage.p1CloseStep composes "close " + P1Perf.kind(page) + " " + step + " ms=" + ms
        string widest = new string('p', 30);   // MaxKindLength
        Assert.IsTrue(P1Perf.isValidLine("[P1] close " + widest + " posted ms=" + long.MaxValue), "close posted (4 tokens, the widest kind + ms)");
        Assert.IsTrue(P1Perf.isValidLine("[P1] close singlechatpage removed ms=0"), "close removed");
        Assert.IsFalse(P1Perf.isValidLine("[P1] close singlechatpage Removed ms=0"), "the grammar is lower-case only (a step must be a fixed lower-case word)");
    }

    [TestMethod]
    public void lever2_rows_stale_only_when_the_document_holds_rows()
    {
        Assert.IsFalse(OpenPerfRules.walletRowsStale(false, 1, 2, true), "no rows in the document → never (the tab entry forces; no boot push)");
        Assert.IsFalse(OpenPerfRules.walletRowsStale(true, 5, 5, false), "rows, nothing moved → the gate stays down");
        Assert.IsTrue(OpenPerfRules.walletRowsStale(true, 5, 6, false), "rows, names moved");
        Assert.IsTrue(OpenPerfRules.walletRowsStale(true, 5, 5, true), "rows, price moved");
    }
}
