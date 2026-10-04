// ★ #1166 P-03 / P-04 / V-4 (session 5b) — the chats-list rules (Spixi/Utils/ChatsListRules.cs), EXECUTED. The call sites
// (HomePage.loadChats / loadContacts / updateChat / HandlePickSucceeded) are MAUI-bound and compile nowhere here;
// scripts/pins-s5/home.mjs pins that each site calls these rules and executes the shell half on the built index.html.
using System.Collections.Generic;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ChatsListRulesTests
{
    [TestMethod]
    public void batch_wire_is_strs_first_then_items_in_order()
    {
        var b = new ChatsBatch();
        b.add("setAvatarFor", "A1", "data:image/png;base64,AAAA");
        b.add("addChat", "A1", "Nick", "1700000000", "", "true", null);
        Assert.AreEqual("{\"strs\":[],\"items\":[{\"f\":\"setAvatarFor\",\"a\":[\"A1\",\"data:image/png;base64,AAAA\"]},{\"f\":\"addChat\",\"a\":[\"A1\",\"Nick\",\"1700000000\",\"\",\"true\",null]}]}", b.toJson(), "wire");
        Assert.IsTrue(!b.toJson().StartsWith("data:"), "never the raw data: fast path");
        Assert.AreEqual(2, b.Count, "count");
    }

    [TestMethod]
    public void batch_escapes_quotes_backslash_controls_and_every_non_ascii_char()
    {
        var b = new ChatsBatch();
        b.add("addChat", "q\"b\\c\nd\u2028e😀é\u007f");
        Assert.AreEqual("{\"strs\":[],\"items\":[{\"f\":\"addChat\",\"a\":[\"q\\\"b\\\\c\\u000ad\\u2028e\\ud83d\\ude00\\u00e9\\u007f\"]}]}", b.toJson(), "escapes");
        var lone = new ChatsBatch();
        lone.add("addChat", "x\ud800y");
        Assert.IsTrue(lone.toJson().Contains("x\\ud800y"), "a lone surrogate survives as an escape");
        foreach (char c in b.toJson()) Assert.IsTrue(c >= 0x20 && c < 0x7f, "pure printable ASCII");
    }

    [TestMethod]
    public void batch_empty_is_still_a_valid_burst()
    {
        Assert.AreEqual("{\"strs\":[],\"items\":[]}", new ChatsBatch().toJson(), "empty");
    }

    [TestMethod]
    public void avatar_goes_once_per_address_then_only_on_change()
    {
        var l = new AvatarLedger();
        string u1 = "data:image/jpeg;base64,AAAA", u2 = "data:image/jpeg;base64,BBBB";
        Assert.AreEqual("", l.rowArg("A", u1, out string? p1), "a photo row carries \"\"");
        Assert.AreEqual(u1, p1, "first time → setAvatarFor");
        Assert.AreEqual("", l.rowArg("A", u1, out string? p2), "again → \"\"");
        Assert.IsTrue(p2 == null, "unchanged → nothing to send");
        l.rowArg("A", u2, out string? p3);
        Assert.AreEqual(u2, p3, "a changed photo goes again");
        l.rowArg("B", u1, out string? p4);
        Assert.AreEqual(u1, p4, "another address has its own entry");
        Assert.AreEqual(2, l.Count, "two addresses");
    }

    [TestMethod]
    public void avatar_that_goes_away_is_forgotten_and_sentinels_pass_through()
    {
        var l = new AvatarLedger();
        l.rowArg("A", "data:image/png;base64,AAAA", out _);
        Assert.AreEqual("img/spixiavatar.png", l.rowArg("A", "img/spixiavatar.png", out string? p), "sentinel passes through unchanged");
        Assert.AreEqual("", p, "photo removed → setAvatarFor \"\" once");
        l.rowArg("A", "img/spixiavatar.png", out string? p2);
        Assert.IsTrue(p2 == null, "…and only once");
        Assert.AreEqual("img/spixi-group-avatar.png", l.rowArg("G", "img/spixi-group-avatar.png", out string? p3), "group sentinel kept (old-exe group fallback)");
        Assert.IsTrue(p3 == null, "a never-sent sentinel sends nothing");
        Assert.AreEqual("C:/x/a_128.jpg", l.rowArg("R", "C:/x/a_128.jpg", out string? p4), "a raw-path fallback keeps its old shape");
        Assert.IsTrue(p4 == null, "…and is never pushed as a photo");
        Assert.AreEqual("", l.rowArg("N", null, out _), "null → \"\"");
    }

    [TestMethod]
    public void avatar_reset_means_a_new_document_hears_every_photo_again()
    {
        var l = new AvatarLedger();
        string u = "data:image/png;base64,AAAA";
        l.rowArg("A", u, out _);
        l.reset();
        Assert.AreEqual(0, l.Count, "empty after reset");
        l.rowArg("A", u, out string? p);
        Assert.AreEqual(u, p, "sent again after reset");
    }

    [TestMethod]
    public void avatar_signature_is_length_and_hash_never_the_uri()
    {
        string u = "data:image/png;base64,QUJDRA==";
        string sig = AvatarLedger.signature(u);
        Assert.IsTrue(sig.StartsWith(u.Length + ":") && !sig.Contains("base64"), "length:hash — " + sig);
        Assert.AreEqual(sig, AvatarLedger.signature(u), "stable");
        Assert.IsTrue(sig != AvatarLedger.signature("data:image/png;base64,QUJDRQ=="), "a one-char change moves it");
    }

    [TestMethod]
    public void group_cap_is_ten_picks_besides_the_creator()
    {
        Assert.AreEqual(10, GroupLimit.MaxPicked, "Core CreateGroupMessage.cs:58");
        Assert.IsFalse(GroupLimit.exceeds(10), "10 picked (+ creator = 11) is allowed");
        Assert.IsTrue(GroupLimit.exceeds(11), "11 picked → refused");
        Assert.IsFalse(GroupLimit.exceeds(2), "the minimum");
    }
}
