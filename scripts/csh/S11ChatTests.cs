// ★ S11 C (#1262) — the pure rules of the 10-FLASH probe build (the hold's release step, the dev switches, the [P1]
// probe lines) and of the photo auto-download (the decision + the verb grammar), EXECUTED (S11ChatRules). The call sites
// (SpixiContentPage's hold, DevPage, SettingsPage, SingleChatPage) are MAUI-bound — scripts/pins-s11/c-wiring.mjs.
using System;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S11ChatTests
{
    [TestMethod]
    public void hold_step_old_path_releases_on_vsc_and_cap()
    {
        Assert.AreEqual("", S11ChatRules.holdStep(false, false, false, 0, 10, 250), "old: nothing seen → hold");
        Assert.AreEqual("vsc", S11ChatRules.holdStep(false, true, false, 0, 10, 250), "old: the visual-state callback → vsc");
        Assert.AreEqual("vsc", S11ChatRules.holdStep(false, true, true, 5, 10, 250), "old: the paint answer changes nothing");
        Assert.AreEqual("cap", S11ChatRules.holdStep(false, false, false, 0, 250, 250), "old: the cap");
    }

    [TestMethod]
    public void hold_step_candidate_waits_for_the_paint_answer_plus_one_frame()
    {
        Assert.AreEqual("", S11ChatRules.holdStep(true, true, false, 0, 40, 250), "candidate: vsc alone no longer releases");
        Assert.AreEqual("", S11ChatRules.holdStep(true, true, true, 0, 40, 250), "candidate: the answer's own frame — keep holding");
        Assert.AreEqual("paint", S11ChatRules.holdStep(true, false, true, 1, 40, 250), "candidate: one frame after the answer → paint");
        Assert.AreEqual("paint", S11ChatRules.holdStep(true, true, true, 3, 40, 250), "candidate: later frames → paint");
        Assert.AreEqual("cap", S11ChatRules.holdStep(true, true, false, 0, 251, 250), "candidate: no answer → the cap backstop");
        Assert.AreEqual("cap", S11ChatRules.holdStep(true, true, true, 0, 250, 250), "candidate: the cap wins over a pending frame");
        Assert.AreEqual(1, S11ChatRules.AckFrames, "one frame after the answer");
    }

    [TestMethod]
    public void flash_verb_is_exact()
    {
        Assert.IsTrue(S11ChatRules.applyFlashVerb("candidate:1", 0, out int a) && a == S11ChatRules.FlashCandidateOff, "candidate:1 sets the OFF bit");
        Assert.IsTrue(S11ChatRules.applyFlashVerb("candidate:0", a, out int b) && b == 0, "candidate:0 clears it");
        Assert.IsTrue(S11ChatRules.applyFlashVerb("grounds:1", 0, out int c) && c == S11ChatRules.FlashSkipGrounds, "grounds");
        Assert.IsTrue(S11ChatRules.applyFlashVerb("input:1", c, out int d) && d == (S11ChatRules.FlashSkipGrounds | S11ChatRules.FlashSkipInput), "input keeps grounds");
        string[] bad = { "candidate:2", "candidate:", ":1", "candidate1", "candidate:1:", "Candidate:1", "wrapper:1", "input:01", " input:1", "input:1 ", "", "x" };
        foreach (string s in bad)
        {
            Assert.IsFalse(S11ChatRules.applyFlashVerb(s, 6, out int n), "refused: [" + s + "]");
            Assert.AreEqual(6, n, "a refusal leaves the bits: [" + s + "]");
        }
        Assert.IsFalse(S11ChatRules.applyFlashVerb(null, 0, out _), "null");
        Assert.IsTrue(S11ChatRules.applyFlashVerb("input:0", 0xFF, out int m) && m == (S11ChatRules.FlashCandidateOff | S11ChatRules.FlashSkipGrounds), "unknown bits are masked");
    }

    [TestMethod]
    public void flash_bits_act_only_in_dev_mode()
    {
        Assert.AreEqual(0, S11ChatRules.effectiveFlashBits(false, S11ChatRules.FlashAll), "dev mode off → the shipped behaviour (candidate ON, no skip)");
        Assert.AreEqual(S11ChatRules.FlashAll, S11ChatRules.effectiveFlashBits(true, 0xFF), "dev mode on → the stored bits, masked");
        Assert.AreEqual("1,1,1", S11ChatRules.flashSwitchesArg(0), "default: candidate ON, grounds + input at the release");
        Assert.AreEqual("0,0,1", S11ChatRules.flashSwitchesArg(S11ChatRules.FlashCandidateOff | S11ChatRules.FlashSkipGrounds), "switch positions");
    }

    [TestMethod]
    public void probe_lines_pass_the_p1_grammar()
    {
        string f = S11ChatRules.holdFrameLine(3, 42, false, 5, true);
        Assert.AreEqual("hold frame f=3 ms=42 rel=0 od=5 dirty=1", f);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + f), "frame line is a valid [P1] line");
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + S11ChatRules.holdFrameLine(-1, long.MaxValue, true, int.MaxValue, false)), "extremes stay valid");
        string r = S11ChatRules.holdReleaseLine("paint", 4, 66, true, true, 3, 1, S11ChatRules.FlashSkipGrounds | S11ChatRules.FlashCandidateOff);
        Assert.AreEqual("hold release why=paint frames=4 ms=66 cand=1 vsc=1 ack=1 ackf=3 stale=1 skip=2", r);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + r), "release line is a valid [P1] line");
        string n = S11ChatRules.holdReleaseLine("cap", 15, 250, true, false, -1, 0, 0);
        Assert.AreEqual("hold release why=cap frames=15 ms=250 cand=1 vsc=0 ack=0 ackf=none stale=0 skip=0", n, "no answer → ack=0 ackf=none");
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + n), "the no-answer release line is a valid [P1] line");
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + S11ChatRules.holdReleaseLine("paint", int.MaxValue, long.MaxValue, true, true, int.MaxValue, int.MaxValue, -1)), "extremes stay valid");
        Assert.IsTrue(S11ChatRules.holdReleaseLine("Weird why", 0, 0, false, false, -1, 0, 0).Contains("why=other"), "an unknown reason is a fixed word");
    }

    [TestMethod]
    public void auto_download_setting_grammar()
    {
        Assert.AreEqual("off", S11ChatRules.normalizeAutoDownload(null), "absent → off (default)");
        Assert.AreEqual("off", S11ChatRules.normalizeAutoDownload("ALWAYS"), "case-exact");
        Assert.AreEqual("wifi", S11ChatRules.normalizeAutoDownload("wifi"));
        Assert.IsTrue(S11ChatRules.parseAutoDownloadVerb("always:1", out string s1, out bool l1) && s1 == "always" && l1);
        Assert.IsTrue(S11ChatRules.parseAutoDownloadVerb("wifi:0", out string s2, out bool l2) && s2 == "wifi" && !l2);
        Assert.IsTrue(S11ChatRules.parseAutoDownloadVerb("off:1", out string s3, out _) && s3 == "off");
        foreach (string b in new[] { "always", "always:", "always:2", "mobile:1", ":1", "always:1:", "wifi:10", "" })
        {
            Assert.IsFalse(S11ChatRules.parseAutoDownloadVerb(b, out string bs, out bool bl), "refused: [" + b + "]");
            Assert.IsTrue(bs == "off" && bl, "a refusal leaves the defaults: [" + b + "]");
        }
        Assert.IsFalse(S11ChatRules.parseAutoDownloadVerb(null, out _, out _), "null");
    }

    [TestMethod]
    public void auto_download_decision()
    {
        const long MB = 1024 * 1024;
        Assert.IsTrue(S11ChatRules.shouldAutoDownload("always", 2 * MB, true, false, true, true), "always · photo · 2 MB · mobile data");
        Assert.IsTrue(S11ChatRules.shouldAutoDownload("wifi", 2 * MB, true, true, true, true), "wifi only · on Wi-Fi");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("wifi", 2 * MB, true, false, true, true), "wifi only · NOT on Wi-Fi");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("off", 2 * MB, true, true, true, true), "off");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload(null, 2 * MB, true, true, true, true), "unset = off (the default)");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", 2 * MB, true, true, false, true), "Load pictures off → never");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", 2 * MB, false, true, true, true), "not a photo → never");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", 2 * MB, true, true, true, false), "contact not ok → never");
        Assert.IsTrue(S11ChatRules.shouldAutoDownload("always", 10 * MB, true, true, true, true), "exactly 10 MB is in");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", 10 * MB + 1, true, true, true, true), "one byte over the cap");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", 0, true, true, true, true), "an unknown size (0) is never auto");
        Assert.IsFalse(S11ChatRules.shouldAutoDownload("always", -5, true, true, true, true), "a negative size");
        Assert.AreEqual(10L * 1024 * 1024, S11ChatRules.AutoDownloadMaxBytes);
    }

    [TestMethod]
    public void stale_paint_answer_is_ignored()   // ★ S11 C2 (#1263, R1-m1)
    {
        Assert.AreEqual(2, S11ChatRules.AckMinFrames, "the genuine answer cannot come before frame 2");
        Assert.AreEqual(-1, S11ChatRules.ackStep(false, -1, 0), "frame 0 (the push's own turn) → stale");
        Assert.AreEqual(-1, S11ChatRules.ackStep(false, -1, 1), "frame 1 → stale");
        Assert.IsTrue(S11ChatRules.isStaleAck(false, -1, 0) && S11ChatRules.isStaleAck(false, -1, 1), "both counted stale");
        Assert.AreEqual(2, S11ChatRules.ackStep(false, -1, 2), "frame 2 → the answer, at frame 2");
        Assert.IsFalse(S11ChatRules.isStaleAck(false, -1, 2), "frame 2 is not stale");
        Assert.AreEqual(7, S11ChatRules.ackStep(false, -1, 7), "a later answer keeps its frame");
        Assert.AreEqual(3, S11ChatRules.ackStep(false, 3, 9), "a second answer never moves the first");
        Assert.IsFalse(S11ChatRules.isStaleAck(false, 3, 0), "an answered hold counts nothing stale");
        Assert.AreEqual(-1, S11ChatRules.ackStep(true, -1, 9), "an ENDED hold takes no answer");
        Assert.IsFalse(S11ChatRules.isStaleAck(true, -1, 0), "an ended hold counts nothing stale");
        /* the whole sequence a hold sees: a stale painted at frame 1, then the real one at frame 3 → release at frame 4 */
        int at = S11ChatRules.ackStep(false, -1, 1);
        Assert.AreEqual("", S11ChatRules.holdStep(true, true, at >= 0, at >= 0 ? 2 - at : 0, 30, 250), "stale answer → still held at frame 2");
        at = S11ChatRules.ackStep(false, at, 3);
        Assert.AreEqual("", S11ChatRules.holdStep(true, true, at >= 0, 3 - at, 50, 250), "the answer's own frame → held");
        Assert.AreEqual("paint", S11ChatRules.holdStep(true, true, at >= 0, 4 - at, 66, 250), "one frame later → paint");
    }

    [TestMethod]
    public void deferred_action_belongs_to_its_hold()   // ★ S11 C2 (#1263, R1-m5)
    {
        Assert.IsTrue(S11ChatRules.deferredOwns(3, 3), "no newer hold → the deferred action runs");
        Assert.IsFalse(S11ChatRules.deferredOwns(3, 4), "a newer hold started → skip");
    }

    [TestMethod]
    public void auto_download_contact_rule()   // ★ S11 C2 (#1263, #46 r1 R1-M1)
    {
        // contactOkForAuto(isRoom, isBot, hidesParticipants, approved, pendingDeletion, senderIsApprovedContact)
        Assert.IsTrue(S11ChatRules.contactOkForAuto(false, false, false, true, false, false), "1:1 with an approved contact");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(false, false, false, false, false, false), "1:1 pending request (not approved)");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(false, false, false, true, true, false), "1:1 being deleted");
        Assert.IsTrue(S11ChatRules.contactOkForAuto(true, false, false, true, false, true), "group · approved sender contact");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(true, false, false, true, false, false), "group · sender not an approved contact");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(true, false, true, true, false, true), "group that hides its participants");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(true, false, false, false, false, true), "group not approved");
        // the R1-M1 case: a BOT room (Core: bot = true, type = Normal) — the caller passes isRoom = bot || Group
        Assert.IsFalse(S11ChatRules.contactOkForAuto(true, true, false, true, false, false), "bot room (public channel) → never");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(true, true, false, true, false, true), "bot room even with an approved sender → never");
        Assert.IsFalse(S11ChatRules.contactOkForAuto(false, true, false, true, false, true), "a bot flag alone → never (never the 1:1 branch)");
    }

    [TestMethod]
    public void unmetered_profiles()   // ★ S11 C2 (#1263, R3-MAJOR-4 W2)
    {
        Assert.IsTrue(S11ChatRules.unmeteredProfiles(new[] { "WiFi" }), "Wi-Fi");
        Assert.IsTrue(S11ChatRules.unmeteredProfiles(new[] { "Cellular", "Ethernet" }), "Ethernet next to cellular");
        Assert.IsTrue(S11ChatRules.unmeteredProfiles(new[] { "Cellular", "WiFi" }), "Wi-Fi next to cellular");
        Assert.IsFalse(S11ChatRules.unmeteredProfiles(new[] { "Cellular" }), "cellular only");
        Assert.IsFalse(S11ChatRules.unmeteredProfiles(new[] { "Bluetooth", "Unknown" }), "bluetooth / unknown");
        Assert.IsFalse(S11ChatRules.unmeteredProfiles(new string[0]), "no profile (offline)");
        Assert.IsFalse(S11ChatRules.unmeteredProfiles(null), "a failed read");
        Assert.IsFalse(S11ChatRules.unmeteredProfiles(new[] { "wifi", "WIFI", "ethernet" }), "exact names only");
    }

    [TestMethod]
    public void auto_download_limits()   // ★ S11 C2 (#1263, #46 r1 R1-m4)
    {
        const long MB = 1024 * 1024;
        Assert.AreEqual(4, S11ChatRules.AutoMaxInFlight);
        Assert.AreEqual(50 * MB, S11ChatRules.AutoChatBudgetBytes);
        Assert.IsTrue(S11ChatRules.autoBudgetOk(3, 40 * MB, 10 * MB), "3 running · 40 + 10 = 50 MB → in");
        Assert.IsFalse(S11ChatRules.autoBudgetOk(4, 0, MB), "4 running → wait");
        Assert.IsFalse(S11ChatRules.autoBudgetOk(0, 40 * MB, 10 * MB + 1), "one byte over the chat budget");
        Assert.IsFalse(S11ChatRules.autoBudgetOk(0, 0, 0), "an unknown size");

        var running = new System.Collections.Generic.HashSet<string>();
        var L = new S11AutoLedger();
        long t = 1_000_000;
        for (int i = 0; i < 4; i++)
        {
            Assert.IsTrue(L.tryAdmit("chatA", "t" + i, MB, t, id => running.Contains(id)), "admit " + i);
            running.Add("t" + i);
        }
        Assert.IsFalse(L.tryAdmit("chatB", "t4", MB, t, id => running.Contains(id)), "a 5th while 4 run (any chat) → refused");
        running.Remove("t0");
        Assert.IsTrue(L.tryAdmit("chatB", "t4", MB, t + 1, id => running.Contains(id)), "one finished → a slot");
        running.Add("t4");
        Assert.IsFalse(L.tryAdmit("chatB", "t5", MB, t + 2, id => running.Contains(id)), "4 running again");
        // a STUCK transfer stops counting after AutoInFlightStaleMs (its bytes stay in the budget)
        Assert.IsTrue(L.tryAdmit("chatB", "t5", MB, t + S11ChatRules.AutoInFlightStaleMs + 1, id => running.Contains(id)), "stuck ones go stale");

        // the per-chat budget, over the window
        var B = new S11AutoLedger();
        for (int i = 0; i < 5; i++)
        {
            Assert.IsTrue(B.tryAdmit("chatC", "b" + i, 10 * MB, t + i, id => false), "10 MB #" + i + " (finished at once)");
        }
        Assert.IsFalse(B.tryAdmit("chatC", "b5", 1, t + 10, id => false), "50 MB used → this chat waits");
        Assert.IsTrue(B.tryAdmit("chatD", "d0", 10 * MB, t + 10, id => false), "another chat has its own budget");
        Assert.IsTrue(B.tryAdmit("chatC", "b6", 10 * MB, t + 4 + S11ChatRules.AutoBudgetWindowMs + 1, id => false), "24 h later the budget is back");
        Assert.IsFalse(B.tryAdmit("chatC", "b7", 0, t + 4 + S11ChatRules.AutoBudgetWindowMs + 2, id => false), "a zero size never");
        Assert.AreEqual(0, B.PendingCount, "tryAdmit never queues");
    }

    [TestMethod]
    public void auto_download_album_waits_for_a_slot()   // ★ S11 G3 (#1263 MINOR-6: a 10-photo album)
    {
        const long MB = 1024 * 1024;
        var running = new System.Collections.Generic.HashSet<string>();
        Func<string, bool> run = id => running.Contains(id);
        var L = new S11AutoLedger();
        long t = 5_000_000;
        Assert.IsFalse(L.HasPending, "nothing waits");
        for (int i = 0; i < 10; i++)
        {
            S11AutoAdmit a = L.offer("album", "p" + i, 2 * MB, t, run, "tag" + i);
            if (a == S11AutoAdmit.Admitted)
            {
                running.Add("p" + i);
            }
            Assert.AreEqual(i < 4 ? S11AutoAdmit.Admitted : S11AutoAdmit.Queued, a, "photo " + i);
        }
        Assert.IsTrue(L.HasPending && L.PendingCount == 6, "6 wait (not offers for good)");
        Assert.AreEqual(S11AutoAdmit.Queued, L.offer("album", "p5", 2 * MB, t, run, "dup"), "the same id is never queued twice");
        Assert.AreEqual(6, L.PendingCount);
        Assert.IsFalse(L.takeReady(t + 1, run, out _, out _, out _), "4 still run → nothing fits");
        int admitted = 0;
        for (int round = 0; round < 10 && L.HasPending; round++)
        {
            running.Remove("p" + round);   // one completes / fails
            while (L.takeReady(t + 10 + round, run, out string chat, out string id, out object? tag))
            {
                Assert.AreEqual("album", chat);
                Assert.AreEqual("tag" + id.Substring(1), tag, "the caller's handle comes back");
                Assert.AreEqual(S11AutoAdmit.Admitted, L.offer(chat, id, 2 * MB, t + 10 + round, run, tag), "re-offered → admitted");
                running.Add(id);
                admitted++;
            }
        }
        Assert.AreEqual(6, admitted, "all 10 download in the end");
        Assert.IsFalse(L.HasPending);

        // the BUDGET stays final: 50 MB per chat — 10 MB photos: 4 run, the 5th waits, the 6th would pass the budget → refused
        var B = new S11AutoLedger();
        running.Clear();
        for (int i = 0; i < 4; i++)
        {
            Assert.AreEqual(S11AutoAdmit.Admitted, B.offer("big", "b" + i, 10 * MB, t, run, null));
            running.Add("b" + i);
        }
        Assert.AreEqual(S11AutoAdmit.Queued, B.offer("big", "b4", 10 * MB, t, run, null), "40 + 10 = 50 fits → waits for the cap");
        Assert.AreEqual(S11AutoAdmit.Refused, B.offer("big", "b5", 10 * MB, t, run, null), "40 + 10 waiting + 10 > 50 → refused (final)");
        Assert.AreEqual(S11AutoAdmit.Refused, B.offer("big", "b6", 0, t, run, null), "an unknown size → refused");
        Assert.AreEqual(1, B.PendingCount);
        running.Remove("b0");
        Assert.AreEqual(S11AutoAdmit.Admitted, B.offer("big", "b4", 10 * MB, t + 1, run, null), "the waiting one offered again with a free slot → admitted");
        Assert.AreEqual(0, B.PendingCount, "…and leaves the queue (never handed back a second time)");

        // a waiting one the budget no longer fits is DROPPED at re-admission (final), not handed back
        var D = new S11AutoLedger();
        running.Clear();
        for (int i = 0; i < 4; i++)
        {
            Assert.AreEqual(S11AutoAdmit.Admitted, D.offer("c", "d" + i, 5 * MB, t, run, null));
            running.Add("d" + i);
        }
        Assert.AreEqual(S11AutoAdmit.Queued, D.offer("c", "d4", 10 * MB, t, run, null));
        running.Remove("d0");
        Assert.IsTrue(D.tryAdmit("c", "x1", 25 * MB, t + 1, run), "another admission used the budget meanwhile (20 + 25 = 45)");
        running.Add("x1");
        running.Remove("d1");
        Assert.IsFalse(D.takeReady(t + 2, run, out _, out _, out _), "45 + 10 > 50 → dropped, nothing handed back");
        Assert.AreEqual(0, D.PendingCount, "dropped for good");

        // bounds: per chat and in all; old ones expire
        var Q = new S11AutoLedger();
        Func<string, bool> all = id => true;
        for (int i = 0; i < 4; i++)
        {
            Assert.AreEqual(S11AutoAdmit.Admitted, Q.offer("q" + i, "r" + i, 1, t, all, null));
        }
        for (int i = 0; i < S11ChatRules.AutoPendingPerChat; i++)
        {
            Assert.AreEqual(S11AutoAdmit.Queued, Q.offer("one", "w" + i, 1, t, all, null), "waits " + i);
        }
        Assert.AreEqual(S11AutoAdmit.Refused, Q.offer("one", "w-over", 1, t, all, null), "the per-chat bound");
        int n = S11ChatRules.AutoPendingPerChat;
        for (int c = 0; n < S11ChatRules.AutoPendingMax; c++)
        {
            for (int i = 0; i < S11ChatRules.AutoPendingPerChat && n < S11ChatRules.AutoPendingMax; i++, n++)
            {
                Assert.AreEqual(S11AutoAdmit.Queued, Q.offer("chat" + c, "y" + c + "-" + i, 1, t, all, null));
            }
        }
        Assert.AreEqual(S11AutoAdmit.Refused, Q.offer("fresh", "z", 1, t, all, null), "the overall bound");
        Assert.AreEqual(S11ChatRules.AutoPendingMax, Q.PendingCount);
        Assert.IsFalse(Q.takeReady(t + S11ChatRules.AutoPendingMaxAgeMs + 1, id => false, out _, out _, out _), "an hour later every waiting one expired");
        Assert.AreEqual(0, Q.PendingCount);
        Assert.IsFalse(Q.HasPending);
    }
}
