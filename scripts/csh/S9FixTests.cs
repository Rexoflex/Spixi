// ★ S9 A3 (session 9) — the pure rules of the S8 fix rows, the desktop rows and the language link, EXECUTED:
//   · S9FixRules.writesCreatedLine / createdLine (8-GRP-ADD, #1243 (1)) — the owner's {7} line
//   · S9FixRules.appState / marksJoin + SAppJoins (8-APP, #1243 (3)) — Declined > Missing > Minimized > Joined > invite
//   · S9FixRules.playedArg + SVoicePlayed (8-FACE, #1243 (4), #1247 — no stored flag = "0")
//   · S9FixRules.infoPaneFollowsChat / closesInfoPaneOnChatClose (#1179 (a))
//   · S9FixRules.downloadsDialog / dialogSize (#1173 (8))
//   · S9FixRules.hapticKind (D-04) · S9FixRules.translationReportMailto (#1246)
// The call sites are MAUI-bound (HomePage, SingleChatPage, SpixiContentPage, DownloadsPage, SettingsPage, LaunchPage, Utils).
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class S9FixTests
{
    static Microsoft.Maui.Storage.Preferences P => Microsoft.Maui.Storage.Preferences.Default;
    static string LO(string k) => SLocalOnlyStore.get(k);
    /* ★ #46 r1 (MINOR-3): the stores live in the backup-excluded SLocalOnlyStore file — a fresh folder per test */
    static void freshLocal()
    {
        string d = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "csh-a3-" + Guid.NewGuid().ToString("N"));
        System.IO.Directory.CreateDirectory(d);
        SLocalOnlyStore.folder = () => d;
        SLocalOnlyStore.resetForTests();
    }
    /* a restart: the deferred write lands, every in-memory copy goes, the next read comes from the file */
    static void restart()
    {
        Assert.IsTrue(SLocalOnlyStore.flush(), "the deferred write lands");
        SLocalOnlyStore.resetForTests();
        SAppJoins.resetCacheForTest();
        SVoicePlayed.resetCacheForTest();
    }

    // —— 8-GRP-ADD ——
    [TestMethod]
    public void created_line_only_in_an_empty_new_group_and_its_text()
    {
        Assert.IsTrue(S9FixRules.writesCreatedLine(true, 0, false), "a new group with no rows → the line");
        Assert.IsFalse(S9FixRules.writesCreatedLine(true, 1, false), "a stored row → no line");
        Assert.IsFalse(S9FixRules.writesCreatedLine(true, 0, true), "a last message → no line");
        Assert.IsFalse(S9FixRules.writesCreatedLine(true, -1, false), "an unknown count → no line");
        Assert.IsFalse(S9FixRules.writesCreatedLine(false, 0, false), "no group → no line");
        Assert.AreEqual("chat-group-you-created", S9FixRules.CreatedKey, "the key");
        // ★ S10 P3 (#1254): createdLine is TWO lines now (line1 + "\n" + line2) — the S10 cases live in S10FixTests.cs
        Assert.AreEqual("Du hast diese Gruppe erstellt\nX", S9FixRules.createdLine("Du hast diese Gruppe erstellt", "X"), "the localized text as given");
        Assert.AreEqual("You created this group\nX", S9FixRules.createdLine(null, "X"), "a missing key → the English fallback");
        Assert.AreEqual("You created this group\nX", S9FixRules.createdLine("  ", "X"), "a blank value → the English fallback");
        Assert.AreEqual("{0}\nX", S9FixRules.createdLine("{0}", "X"), "the text is never formatted (no argument)");
        Assert.IsTrue(UnreadRule.isSystemLineId(new byte[] { UnreadRule.AddedToGroupLineId }), "the line's id {7} is a system line (no unread)");
    }

    // —— 8-APP ——
    [TestMethod]
    public void app_state_order()
    {
        Assert.AreEqual("Declined", S9FixRules.appState(false, true, true, true), "Declined wins over everything");
        Assert.AreEqual("Declined", S9FixRules.appState(true, false, true, true), "…over Missing too");
        Assert.AreEqual("Missing", S9FixRules.appState(true, false, true, false), "a missing app → Missing (Open again could not run it)");
        Assert.AreEqual("Minimized", S9FixRules.appState(false, true, true, false), "a live page → Minimized over Joined");
        Assert.AreEqual("Joined", S9FixRules.appState(false, false, true, false), "joined, no page → Joined");
        Assert.AreEqual("", S9FixRules.appState(false, false, false, false), "nothing → the invite");
        Assert.AreEqual("Minimized", S9FixRules.appState(false, true, false, false), "a live page without a stored join → Minimized (today)");
    }

    [TestMethod]
    public void join_marks_an_incoming_invite_of_that_app_only()
    {
        Assert.IsTrue(S9FixRules.marksJoin(true, false, "com.x.app", "com.x.app"), "an incoming invite row of the app");
        Assert.IsFalse(S9FixRules.marksJoin(true, true, "com.x.app", "com.x.app"), "my own invite (Launch) is never marked");
        Assert.IsFalse(S9FixRules.marksJoin(false, false, "com.x.app", "com.x.app"), "not an appSession row");
        Assert.IsFalse(S9FixRules.marksJoin(true, false, "com.x.other", "com.x.app"), "another app's row");
        Assert.IsFalse(S9FixRules.marksJoin(true, false, "COM.X.APP", "com.x.app"), "an exact (ordinal) id match only");
        Assert.IsFalse(S9FixRules.marksJoin(true, false, "spixi.voip", "spixi.voip"), "the call app is never marked");
        Assert.IsFalse(S9FixRules.marksJoin(true, false, "", ""), "a blank row / empty id");
    }

    [TestMethod]
    public void app_joins_store_add_has_clear_restart()
    {
        P.d.Clear();
        freshLocal();
        SAppJoins.clearAll();
        Assert.IsFalse(SAppJoins.has("Peer1", "AB01"), "empty");
        Assert.IsTrue(SAppJoins.add("Peer1", "AB01"), "first add");
        Assert.IsFalse(SAppJoins.add("Peer1", "ab01"), "the same row (hex case-folded) is not added twice");
        Assert.IsTrue(SAppJoins.has("Peer1", "ab01") && SAppJoins.has("Peer1", "AB01"), "has, any hex case");
        Assert.AreEqual("Peer1|ab01", LO("app_joins"), "ONE local-only string `app_joins`, peer|hex");
        Assert.IsFalse(P.d.ContainsKey("app_joins"), "nothing in the backed-up preferences");
        SAppJoins.add("Peer2", "cd02");
        restart();
        Assert.IsTrue(SAppJoins.has("Peer1", "ab01") && SAppJoins.has("Peer2", "cd02"), "after a restart the rows are still joined");
        SAppJoins.clear("Peer1");
        Assert.IsFalse(SAppJoins.has("Peer1", "ab01"), "clear(peer) forgets that peer");
        Assert.IsTrue(SAppJoins.has("Peer2", "cd02"), "…and only that peer");
        Assert.IsFalse(LO("app_joins").Contains("Peer1"), "…on disk too");
        SAppJoins.clearAll();
        Assert.IsFalse(SAppJoins.has("Peer2", "cd02") || LO("app_joins") != "" , "clearAll empties memory and removes the key");
        Assert.IsFalse(SAppJoins.add(null, "ab") || SAppJoins.add("p", ""), "empty input is refused");
        Assert.AreEqual(256, SAppJoins.CAP, "the cap");
    }

    // —— 8-FACE ——
    [TestMethod]
    public void played_arg_rule()
    {
        Assert.AreEqual("0", S9FixRules.playedArg(true, false, false), "#1247: a received clip with NO stored flag → \"0\" (blue until played)");
        Assert.AreEqual("1", S9FixRules.playedArg(true, false, true), "a received clip stored as played → \"1\"");
        Assert.AreEqual("", S9FixRules.playedArg(true, true, true), "my own clip → \"\"");
        Assert.AreEqual("", S9FixRules.playedArg(true, true, false), "my own clip → \"\"");
        Assert.AreEqual("", S9FixRules.playedArg(false, false, true), "not a voice row → \"\"");
    }

    [TestMethod]
    public void voice_played_store_add_has_clear_cap_restart()
    {
        P.d.Clear();
        freshLocal();
        SVoicePlayed.clearAll();
        Assert.IsFalse(SVoicePlayed.has("Peer1", "aa"), "empty");
        Assert.IsTrue(SVoicePlayed.add("Peer1", "AA"), "first add");
        Assert.IsFalse(SVoicePlayed.add("Peer1", "aa"), "a repeat is not a second entry");
        Assert.AreEqual("Peer1|aa", LO("voice_played"), "ONE local-only string `voice_played`, peer|hex");
        restart();
        Assert.IsTrue(SVoicePlayed.has("Peer1", "aa"), "after a restart the clip is still played");
        Assert.IsFalse(SVoicePlayed.has("Peer2", "aa"), "keyed by peer AND id");
        for (int i = 0; i < SVoicePlayed.CAP + 5; i++)
        {
            SVoicePlayed.add("Peer3", i.ToString("x4"));
        }
        Assert.IsFalse(SVoicePlayed.has("Peer1", "aa"), "the cap evicts the OLDEST entry first");
        Assert.IsTrue(SVoicePlayed.has("Peer3", (SVoicePlayed.CAP + 4).ToString("x4")), "the newest stays");
        Assert.AreEqual(SVoicePlayed.CAP, LO("voice_played").Split(',').Length, "the stored string holds CAP entries");
        restart();
        Assert.IsFalse(SVoicePlayed.has("Peer3", "0000"), "an evicted entry stays evicted after a restart");
        SVoicePlayed.clear("Peer3");
        Assert.IsFalse(SVoicePlayed.has("Peer3", (SVoicePlayed.CAP + 4).ToString("x4")), "clear(peer)");
        SVoicePlayed.add("Peer4", "bb");
        SVoicePlayed.clearAll();
        Assert.IsFalse(SVoicePlayed.has("Peer4", "bb") || LO("voice_played") != "" , "clearAll");
        Assert.AreEqual(4096, SVoicePlayed.CAP, "the cap");
    }

    // —— #1179 (a) ——
    [TestMethod]
    public void info_pane_follows_a_chat_switch_on_desktop_beside_only()
    {
        Assert.IsTrue(S9FixRules.infoPaneFollowsChat(true, true, true), "desktop + wide + the pane beside the chat → follows");
        Assert.IsFalse(S9FixRules.infoPaneFollowsChat(false, true, true), "mobile / tablet → closes as before");
        Assert.IsFalse(S9FixRules.infoPaneFollowsChat(true, false, true), "a narrow window → closes");
        Assert.IsFalse(S9FixRules.infoPaneFollowsChat(true, true, false), "a col-1 pane (over the chat) → closes");
        Assert.IsTrue(S9FixRules.closesInfoPaneOnChatClose(false, false), "no follow → the chat's close closes its pane (#247)");
        Assert.IsTrue(S9FixRules.closesInfoPaneOnChatClose(true, false), "a follow whose chat is not open → close");
        Assert.IsFalse(S9FixRules.closesInfoPaneOnChatClose(true, true), "a follow to an open chat → the swap closes the old pane, not this");
    }

    // —— #1173 (8) ——
    [TestMethod]
    public void downloads_dialog_size_and_platform()
    {
        Assert.IsTrue(S9FixRules.downloadsDialog(true) && !S9FixRules.downloadsDialog(false), "desktop only");
        S9FixRules.dialogSize(1400, 900, out double w, out double h);
        Assert.IsTrue(w == 600 && h == 640, "a big window → 600 × 640 (" + w + " × " + h + ")");
        S9FixRules.dialogSize(500, 500, out w, out h);
        Assert.IsTrue(w == 452 && h == 452, "a small window → a 24 px gutter per side (" + w + " × " + h + ")");
        S9FixRules.dialogSize(200, 100, out w, out h);
        Assert.IsTrue(w == 280 && h == 240, "never below the minimum (" + w + " × " + h + ")");
        S9FixRules.dialogSize(0, double.NaN, out w, out h);
        Assert.IsTrue(w == 600 && h == 640, "an unknown host size → the maximum");
    }

    // —— D-04 ——
    [TestMethod]
    public void haptic_kinds()
    {
        Assert.AreEqual(S9FixRules.Haptic.Click, S9FixRules.hapticKind("click"), "click");
        Assert.AreEqual(S9FixRules.Haptic.LongPress, S9FixRules.hapticKind("long"), "long");
        Assert.AreEqual(S9FixRules.Haptic.Click, S9FixRules.hapticKind("success"), "success = a click");
        foreach (string bad in new[] { "", "Click", "click ", "long:1", "vibrate", "success\n" })
        {
            Assert.AreEqual(S9FixRules.Haptic.None, S9FixRules.hapticKind(bad), "unknown → none: [" + bad + "]");
        }
        Assert.AreEqual(S9FixRules.Haptic.None, S9FixRules.hapticKind(null), "null → none");
    }

    // —— #1246 ——
    static readonly string[] Langs = { "cn-cn", "en-us", "es-co", "de-de", "id-id", "fr-fr", "it-it", "ja-jp", "lt-lt", "pt-br", "ru-ru", "sl-si", "sr-sp" };

    [TestMethod]
    public void translation_report_link_is_built_from_a_known_code_only()
    {
        Assert.AreEqual("mailto:support@spixi.io?subject=Spixi%20translation%20problem%20%28de-de%29",
            S9FixRules.translationReportMailto("de-de", Langs), "the exact link");
        foreach (string code in Langs)
        {
            string? u = S9FixRules.translationReportMailto(code, Langs);
            Assert.IsTrue(u != null && u.StartsWith("mailto:support@spixi.io?subject=", StringComparison.Ordinal) && u.EndsWith("%28" + code + "%29", StringComparison.Ordinal), "every app language: " + code);
            Assert.IsTrue(Uri.TryCreate(u, UriKind.Absolute, out Uri? parsed) && parsed!.Scheme == "mailto", "it parses as a mailto (the MailCompose gate): " + code);
        }
        foreach (string bad in new[] { "xx-yy", "DE-DE", "de", "de-de&body=x", "de-de?cc=a@b.c", "../de-de", "de_de", "de-de ", "", "de-dee-e", "d-de" })
        {
            Assert.IsTrue(S9FixRules.translationReportMailto(bad, Langs) == null, "refused: [" + bad + "]");
        }
        Assert.IsTrue(S9FixRules.translationReportMailto(null, Langs) == null, "null refused");
        Assert.IsTrue(S9FixRules.translationReportMailto("de-de", new string[0]) == null, "a code not in the app's list is refused");
    }

    // —— #46 r1 MINOR-3: the one-time move out of Preferences + the deferred, coalesced write ——
    [TestMethod]
    public void stores_migrate_out_of_preferences_and_write_deferred()
    {
        P.d.Clear();
        freshLocal();
        P.Set("voice_played", "Old|aa,Old|bb");
        P.Set("app_joins", "Old|cc");
        SVoicePlayed.resetCacheForTest();
        SAppJoins.resetCacheForTest();
        Assert.IsTrue(SVoicePlayed.has("Old", "aa") && SVoicePlayed.has("Old", "bb"), "an old backed-up value is read once");
        Assert.IsTrue(SAppJoins.has("Old", "cc"), "…for every store");
        Assert.IsFalse(P.d.ContainsKey("voice_played") || P.d.ContainsKey("app_joins"), "and the Preferences keys are gone");
        string file = SLocalOnlyStore.path();
        Assert.IsTrue(System.IO.File.Exists(file), "the migration wrote the local-only file");
        long before = new System.IO.FileInfo(file).Length;
        SVoicePlayed.add("New", "dd");
        SVoicePlayed.add("New", "ee");
        Assert.IsTrue(SVoicePlayed.has("New", "ee"), "a change is readable at once");
        Assert.AreEqual(before, new System.IO.FileInfo(file).Length, "…but not yet written (deferred, no write on the caller's thread)");
        System.Threading.Thread.Sleep(SLocalOnlyStore.DeferMs + 600);
        Assert.IsTrue(System.IO.File.ReadAllText(file).Contains("New|ee"), "ONE background write lands after DeferMs");
        SVoicePlayed.add("Late", "ff");
        SLocalOnlyStore.clearAll();
        System.Threading.Thread.Sleep(SLocalOnlyStore.DeferMs + 600);
        Assert.IsFalse(System.IO.File.Exists(file), "a write scheduled before an account wipe never brings the file back");
    }

    // —— #46 r1 MAJOR-1: the follow SEQUENCE (present B → close A → pane B arrives) ——
    [TestMethod]
    public void info_pane_follow_survives_the_old_chat_close_until_pane_b_presents()
    {
        var f = new S9FixRules.InfoPaneFollow();
        Assert.IsTrue(f.closesPanesOnChatClose(false), "no follow → a chat close closes its pane (#247)");
        f.begin("B");
        Assert.IsFalse(f.onChatPresented("A"), "another chat's present stages nothing");
        Assert.IsTrue(f.onChatPresented("B"), "(1) chat B presents → stage pane B");
        Assert.IsFalse(f.onChatPresented("B"), "…once");
        Assert.IsTrue(f.active, "the follow is NOT consumed by chat B's present (r0's defect)");
        Assert.IsFalse(f.closesPanesOnChatClose(true), "(2) the sweep closes chat A while chat B is open → pane A stays on glass");
        Assert.IsFalse(f.onPanePresented("A"), "pane A presenting again is not the end");
        Assert.IsTrue(f.onPanePresented("B"), "(3) pane B presents → the follow is done");
        Assert.IsFalse(f.active, "…and over");
        Assert.IsTrue(f.closesPanesOnChatClose(true), "after it, a chat close closes its pane again");
        f.begin("C");
        Assert.IsFalse(f.onPanePresented("C"), "a pane that presents before its chat was staged does not end the follow");
        Assert.IsTrue(f.closesPanesOnChatClose(false), "a follow whose chat is not open does not hold panes");
        f.end();
        Assert.IsFalse(f.active, "end()");
    }

    // —— #46 r1 MINOR-2: "Open again" reopens — no second accept, no new mark ——
    [TestMethod]
    public void open_again_is_a_reopen()
    {
        Assert.IsTrue(S9FixRules.joinIsReopen(true, true), "the newest invite row is already joined → reopen");
        Assert.IsFalse(S9FixRules.joinIsReopen(true, false), "an unjoined (newer) invite → a real Join (accept + mark)");
        Assert.IsFalse(S9FixRules.joinIsReopen(false, false), "no incoming invite row → a real Join path (sendJoinAccept decides)");
    }
}
