// ★ #1207 (session 7): + the voice id, supports() (the stored answer) and claimAsk() (one ask per address per run, cap 512).
// ★ #1197 (session 6b) — the capability answer (Spixi/Utils/SpixiProtocols.cs), EXECUTED: the ids, who gets an answer,
// the 60 s per-address limiter and its 512 cap (the oldest dropped). The StreamProcessor case is MAUI-bound;
// scripts/pins-s6b/cs.mjs pins that it calls claimAnswer before sendAppProtocols.
using System.Collections.Generic;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class SpixiProtocolsTests
{
    [TestMethod]
    public void ids_are_reply_then_edit_then_voice_utf8()
    {
        var ids = SpixiProtocols.ids();
        Assert.AreEqual(3, ids.Count, "three ids (★ #1208: + voice)");
        Assert.AreEqual("spixi.reply.1", Encoding.UTF8.GetString(ids[0]), "reply first");
        Assert.AreEqual("spixi.edit.1", Encoding.UTF8.GetString(ids[1]), "edit second");
        Assert.AreEqual("spixi.voice.1", Encoding.UTF8.GetString(ids[2]), "voice third");
        Assert.IsFalse(ReferenceEquals(ids, SpixiProtocols.ids()), "a fresh list per call");
        Assert.IsFalse(ReferenceEquals(ids[2], SpixiProtocols.ids()[2]), "fresh byte arrays too");
    }

    // —— ★ #1207 (session 7): the stored answer + the ask ——
    [TestMethod]
    public void supports_is_an_exact_utf8_byte_compare()
    {
        var answer = new List<byte[]> { Encoding.UTF8.GetBytes("spixi.reply.1"), Encoding.UTF8.GetBytes("spixi.voice.1") };
        Assert.IsTrue(SpixiProtocols.supports(answer, SpixiProtocols.VoiceId), "voice in the answer");
        Assert.IsTrue(SpixiProtocols.supports(SpixiProtocols.ids(), SpixiProtocols.VoiceId), "this build's own list");
        Assert.IsFalse(SpixiProtocols.supports(answer, SpixiProtocols.EditId), "edit is not in this answer");
        Assert.IsFalse(SpixiProtocols.supports(null, SpixiProtocols.VoiceId), "no stored answer → false");
        Assert.IsFalse(SpixiProtocols.supports(new List<byte[]>(), SpixiProtocols.VoiceId), "an empty answer");
        Assert.IsFalse(SpixiProtocols.supports(new List<byte[]> { Encoding.UTF8.GetBytes("spixi.voice.10") }, SpixiProtocols.VoiceId), "a longer id");
        Assert.IsFalse(SpixiProtocols.supports(new List<byte[]> { Encoding.UTF8.GetBytes("spixi.voice.") }, SpixiProtocols.VoiceId), "a prefix");
        Assert.IsFalse(SpixiProtocols.supports(new List<byte[]> { Encoding.UTF8.GetBytes("SPIXI.VOICE.1") }, SpixiProtocols.VoiceId), "case");
        Assert.IsFalse(SpixiProtocols.supports(new List<byte[]> { Encoding.Unicode.GetBytes("spixi.voice.1") }, SpixiProtocols.VoiceId), "UTF-16 bytes");
        Assert.IsTrue(SpixiProtocols.supports(new List<byte[]> { null!, new byte[64], Encoding.UTF8.GetBytes("spixi.voice.1") }, SpixiProtocols.VoiceId), "a null entry / a 64-byte mini-app hash are skipped");
        Assert.IsFalse(SpixiProtocols.supports(answer, ""), "an empty id");
    }

    [TestMethod]
    public void the_ask_goes_once_per_address_per_run_only_to_an_approved_normal_1to1()
    {
        SpixiProtocols.resetAsks();
        Assert.IsFalse(SpixiProtocols.claimAsk("A", false, true, false, true), "unknown");
        Assert.IsFalse(SpixiProtocols.claimAsk("A", true, false, false, true), "a group");
        Assert.IsFalse(SpixiProtocols.claimAsk("A", true, true, true, true), "a bot");
        Assert.IsFalse(SpixiProtocols.claimAsk("A", true, true, false, false), "unapproved");
        Assert.IsFalse(SpixiProtocols.claimAsk(null, true, true, false, true), "null address");
        Assert.IsFalse(SpixiProtocols.claimAsk("", true, true, false, true), "empty address");
        Assert.AreEqual(0, SpixiProtocols.askCount, "a refusal records nothing");
        Assert.IsTrue(SpixiProtocols.claimAsk("A", true, true, false, true), "the first open → ask");
        Assert.IsFalse(SpixiProtocols.claimAsk("A", true, true, false, true), "the second open → no ask");
        Assert.IsTrue(SpixiProtocols.claimAsk("B", true, true, false, true), "another address is independent");
        Assert.IsTrue(SpixiProtocols.claimAsk("a", true, true, false, true), "ordinal: \"a\" is not \"A\"");
        SpixiProtocols.resetLimiter();
        Assert.IsFalse(SpixiProtocols.claimAsk("A", true, true, false, true), "the answer limiter is a separate map");
        SpixiProtocols.resetAsks();
        Assert.IsTrue(SpixiProtocols.claimAsk("A", true, true, false, true), "a new run (reset) → ask again");
        SpixiProtocols.resetAsks();
    }

    [TestMethod]
    public void the_ask_set_is_capped_at_512_and_drops_the_oldest()
    {
        SpixiProtocols.resetAsks();
        for (int i = 0; i <= 512; i++)
        {
            Assert.IsTrue(SpixiProtocols.claimAsk("k" + i, true, true, false, true), "ask k" + i);
        }
        Assert.AreEqual(512, SpixiProtocols.askCount, "513 asks → 512 kept");
        Assert.IsFalse(SpixiProtocols.claimAsk("k1", true, true, false, true), "k1 is still held");
        Assert.IsFalse(SpixiProtocols.claimAsk("k512", true, true, false, true), "the newest is held");
        Assert.IsTrue(SpixiProtocols.claimAsk("k0", true, true, false, true), "k0 (the oldest) was dropped → asked again");
        Assert.AreEqual(512, SpixiProtocols.askCount, "still capped (k1 dropped for k0)");
        Assert.IsTrue(SpixiProtocols.claimAsk("k1", true, true, false, true), "k1 went next");
        SpixiProtocols.resetAsks();
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
