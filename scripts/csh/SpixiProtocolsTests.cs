// ★ #1197 (session 6b) — the capability answer (Spixi/Utils/SpixiProtocols.cs), EXECUTED: the ids, who gets an answer,
// the 60 s per-address limiter and its 512 cap (the oldest dropped). The StreamProcessor case is MAUI-bound;
// scripts/pins-s6b/cs.mjs pins that it calls claimAnswer before sendAppProtocols.
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class SpixiProtocolsTests
{
    [TestMethod]
    public void ids_are_reply_then_edit_utf8()
    {
        var ids = SpixiProtocols.ids();
        Assert.AreEqual(2, ids.Count, "two ids");
        Assert.AreEqual("spixi.reply.1", Encoding.UTF8.GetString(ids[0]), "reply first");
        Assert.AreEqual("spixi.edit.1", Encoding.UTF8.GetString(ids[1]), "edit second");
        Assert.IsFalse(ReferenceEquals(ids, SpixiProtocols.ids()), "a fresh list per call");
    }

    [TestMethod]
    public void only_a_known_approved_normal_1to1_contact_is_answered()
    {
        long N = SpixiProtocols.Never;
        Assert.IsTrue(SpixiProtocols.shouldAnswer(true, true, false, true, 0, N), "a contact, never answered");
        Assert.IsFalse(SpixiProtocols.shouldAnswer(false, true, false, true, 0, N), "unknown sender");
        Assert.IsFalse(SpixiProtocols.shouldAnswer(true, false, false, true, 0, N), "a group");
        Assert.IsFalse(SpixiProtocols.shouldAnswer(true, true, true, true, 0, N), "a bot room");
        Assert.IsFalse(SpixiProtocols.shouldAnswer(true, true, false, false, 0, N), "unapproved (a request)");
        Assert.IsFalse(SpixiProtocols.shouldAnswer(true, true, false, true, 59_999, 0), "59.999 s after the last answer");
        Assert.IsTrue(SpixiProtocols.shouldAnswer(true, true, false, true, 60_000, 0), "exactly 60 s after");
        Assert.IsTrue(SpixiProtocols.shouldAnswer(true, true, false, true, long.MinValue + 5, N), "Never never overflows");
    }

    [TestMethod]
    public void the_limiter_answers_once_per_address_per_60s()
    {
        SpixiProtocols.resetLimiter();
        Assert.IsTrue(SpixiProtocols.claimAnswer("A", true, true, false, true, 1000), "first ask → answer");
        Assert.IsFalse(SpixiProtocols.claimAnswer("A", true, true, false, true, 1000 + 59_999), "within 60 s → none");
        Assert.IsTrue(SpixiProtocols.claimAnswer("B", true, true, false, true, 1500), "another address is independent");
        Assert.IsTrue(SpixiProtocols.claimAnswer("A", true, true, false, true, 1000 + 60_000), "60 s later → answer again");
        Assert.IsFalse(SpixiProtocols.claimAnswer("A", true, true, false, true, 1000 + 60_001), "…and the clock restarted at that answer");
        int before = SpixiProtocols.limiterCount;
        Assert.IsFalse(SpixiProtocols.claimAnswer("G", true, false, false, true, 5000), "a group → none");
        Assert.IsFalse(SpixiProtocols.claimAnswer("", true, true, false, true, 5000), "no address → none");
        Assert.IsFalse(SpixiProtocols.claimAnswer(null, true, true, false, true, 5000), "null address → none");
        Assert.AreEqual(before, SpixiProtocols.limiterCount, "a refusal records nothing");
        SpixiProtocols.resetLimiter();
    }

    [TestMethod]
    public void the_limiter_is_capped_at_512_and_drops_the_oldest()
    {
        SpixiProtocols.resetLimiter();
        for (int i = 0; i <= 512; i++)
        {
            Assert.IsTrue(SpixiProtocols.claimAnswer("a" + i, true, true, false, true, 10_000 + i), "answer a" + i);
        }
        Assert.AreEqual(512, SpixiProtocols.limiterCount, "513 answers → 512 kept");
        Assert.IsTrue(SpixiProtocols.claimAnswer("a0", true, true, false, true, 10_600), "a0 (the oldest) was dropped → answered again within 60 s");
        Assert.IsFalse(SpixiProtocols.claimAnswer("a2", true, true, false, true, 10_600), "a2 is still held");
        Assert.AreEqual(512, SpixiProtocols.limiterCount, "still capped (a1 was dropped for a0)");
        Assert.IsTrue(SpixiProtocols.claimAnswer("a1", true, true, false, true, 10_601), "a1 went next (the oldest at that point)");
        SpixiProtocols.resetLimiter();
    }
}
