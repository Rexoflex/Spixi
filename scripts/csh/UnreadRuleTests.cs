// ★ #1148 (3)/(4) (session 4 fix batch part 2) — the unread rule (Spixi/Utils/UnreadRule.cs) and the reaction-heart store
// (Spixi/Meta/SReactionFlags.cs), EXECUTED. The call sites (Node.addMessageWithType, VoIPManager.endVoIPSession,
// StreamProcessor's late-call + msgReaction paths, SingleChatPage's clears, HomePage's addChat) are MAUI-bound and compile
// nowhere here; scripts/pins-s4/fix2.mjs pins that each site calls these rules.
using System.Collections.Generic;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class UnreadRuleTests
{
    // —— a NEW message (Node.addMessageWithType) ——
    [TestMethod]
    public void incoming_text_file_payment_request_invite_contact_request_count_1()
    {
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.standard, false, false), "incoming text");
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.fileHeader, false, false), "incoming file");
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.sentFunds, false, false), "incoming payment");
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.requestFunds, false, false), "incoming payment request");
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.appSession, false, false), "incoming app invite");
    }

    [TestMethod]
    public void pending_incoming_request_counts_in_the_icon_badge_until_answered()
    {
        Assert.IsTrue(UnreadRule.isPendingIncomingRequest(false, true, FriendMessageType.requestAdd, false), "#1150: a pending incoming request = 1 in the icon badge");
        Assert.IsFalse(UnreadRule.isPendingIncomingRequest(true, true, FriendMessageType.requestAdd, false), "accepted: no longer pending");
        Assert.IsFalse(UnreadRule.isPendingIncomingRequest(false, true, FriendMessageType.requestAdd, true), "my own outgoing request is not counted");
        Assert.IsFalse(UnreadRule.isPendingIncomingRequest(false, true, FriendMessageType.standard, false), "an unapproved contact whose last message is not the request");
        Assert.IsFalse(UnreadRule.isPendingIncomingRequest(false, false, FriendMessageType.requestAdd, false), "no last message");
    }

    [TestMethod]
    public void my_own_messages_count_0()
    {
        foreach (FriendMessageType t in System.Enum.GetValues(typeof(FriendMessageType)))
        {
            Assert.IsFalse(UnreadRule.countsAsUnread(t, true, false), "own " + t);
        }
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.requestFunds, true, false), "my own payment request (SPayments / HomePage)");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.voiceCall, true, false), "my OUTGOING call card (VoIPManager.initiateCall)");
    }

    [TestMethod]
    public void an_update_counts_0()
    {
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.standard, false, true), "a chatStream re-send / edit of a shown message");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.fileHeader, false, true), "a file header update");
    }

    [TestMethod]
    public void call_cards_and_system_rows_count_0_at_insert()
    {
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.voiceCall, false, false), "an INCOMING call card at insert (it counts at its end, if missed)");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.voiceCallEnd, false, false), "voiceCallEnd");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.appSessionEnd, false, false), "appSessionEnd");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.kicked, false, false), "kicked");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.banned, false, false), "banned");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.requestAddSent, false, false), "requestAddSent");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.requestAdd, false, false), "#1150: an incoming contact request is not an unread (Accept / Decline on its card)");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.reaction, false, false), "reaction (a count never)");
    }

    [TestMethod]
    public void the_connected_line_counts_0()
    {
        Assert.IsTrue(UnreadRule.isSystemLineId(new byte[] { 1 }), "{1} = the connected line");
        Assert.IsTrue(UnreadRule.isSystemLineId(new byte[] { 4 }) && UnreadRule.isSystemLineId(new byte[] { 5 }), "{4}/{5} nick/avatar");
        Assert.IsFalse(UnreadRule.isSystemLineId(new byte[] { 2 }) || UnreadRule.isSystemLineId(new byte[] { 1, 0 }) || UnreadRule.isSystemLineId(null), "a real id is not a system line");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.standard, false, false, UnreadRule.isSystemLineId(new byte[] { 1 })), "the connected line (standard, not local) → 0");
        Assert.IsTrue(UnreadRule.countsAsUnread(FriendMessageType.standard, false, false, UnreadRule.isSystemLineId(new byte[] { 9, 9, 9 })), "a real incoming text with a real id → 1");
    }

    // —— a call ENDED (VoIPManager.endVoIPSession, StreamProcessor's late-call path) ——
    [TestMethod]
    public void missed_incoming_call_counts_1()
    {
        Assert.IsTrue(UnreadRule.missedCallCounts(false, false, false, false), "incoming, rang out / caller hung up, chat closed");
    }

    [TestMethod]
    public void outgoing_answered_declined_or_open_chat_call_counts_0()
    {
        Assert.IsFalse(UnreadRule.missedCallCounts(true, false, false, false), "OUTGOING unanswered (Damir's phantom 2)");
        Assert.IsFalse(UnreadRule.missedCallCounts(true, true, false, false), "outgoing answered");
        Assert.IsFalse(UnreadRule.missedCallCounts(false, true, false, false), "incoming ANSWERED");
        Assert.IsFalse(UnreadRule.missedCallCounts(false, false, true, false), "incoming DECLINED on this device");
        Assert.IsFalse(UnreadRule.missedCallCounts(false, false, false, true), "missed, but its chat is OPEN (the card shows)");
    }

    // —— a reaction (StreamProcessor msgReaction) → the heart, never a count ——
    [TestMethod]
    public void a_like_or_tip_on_my_message_sets_the_heart()
    {
        Assert.IsTrue(UnreadRule.reactionRaisesDot("like:", true, false, false), "like on my message");
        Assert.IsTrue(UnreadRule.reactionRaisesDot("tip:100.5", true, false, false), "tip on my message");
    }

    [TestMethod]
    public void receipts_their_message_my_reaction_or_open_chat_set_nothing()
    {
        Assert.IsFalse(UnreadRule.reactionRaisesDot("seen:", true, false, false), "a room's seen: receipt");
        Assert.IsFalse(UnreadRule.reactionRaisesDot("received:", true, false, false), "a room's received: receipt");
        Assert.IsFalse(UnreadRule.reactionRaisesDot("fileReceived:", true, false, false), "fileReceived:");
        Assert.IsFalse(UnreadRule.reactionRaisesDot("like:", false, false, false), "a like on THEIR message");
        Assert.IsFalse(UnreadRule.reactionRaisesDot("like:", true, true, false), "my own like (another device)");
        Assert.IsFalse(UnreadRule.reactionRaisesDot("like:", true, false, true), "the chat is open");
        Assert.IsFalse(UnreadRule.reactionRaisesDot(null, true, false, false), "no reaction");
    }

    // —— the store: fixed key, address-keyed, bounded ——
    [TestMethod]
    public void store_pure_set_clear_cap()
    {
        var l = new List<string>();
        Assert.IsTrue(SReactionFlags.setInto(l, "A", 3) && !SReactionFlags.setInto(l, "A", 3), "set once; a second set is no change");
        SReactionFlags.setInto(l, "B", 3); SReactionFlags.setInto(l, "C", 3); SReactionFlags.setInto(l, "D", 3);
        Assert.AreEqual(3, l.Count, "the list itself is bounded at the cap (not only the stored string)");
        Assert.AreEqual("B,C,D", SReactionFlags.serialize(l, 3), "over the cap the OLDEST flag goes");
        Assert.IsTrue(SReactionFlags.clearInto(l, "C") && !SReactionFlags.clearInto(l, "C"), "clear once");
        Assert.IsFalse(SReactionFlags.setInto(l, "x,y", 3) || SReactionFlags.setInto(l, "", 3) || SReactionFlags.setInto(l, null, 3), "a ',' / empty / null address is refused");
        Assert.AreEqual("B,D", string.Join(",", SReactionFlags.parse(" B,,D,B ")), "parse skips empty + duplicate parts");
    }

    [TestMethod]
    public void store_persists_in_one_preference_and_clears()
    {
        var P = Microsoft.Maui.Storage.Preferences.Default;
        SReactionFlags.clearAll();
        Assert.IsTrue(SReactionFlags.set("Abc") && SReactionFlags.has("Abc"), "set → has");
        Assert.AreEqual("Abc", P.Get("reaction_flags", ""), "ONE fixed preference key, the address list");
        Assert.IsFalse(SReactionFlags.set("Abc"), "a second reaction: no change, no write");
        Assert.IsTrue(SReactionFlags.clear("Abc") && !SReactionFlags.has("Abc") && P.Get("reaction_flags", "x") == "", "the chat opened → cleared on disk");
        Assert.IsFalse(SReactionFlags.clear("Abc"), "a clear with nothing set is a no-op");
        SReactionFlags.set("Q"); SReactionFlags.clearAll();
        Assert.IsTrue(!SReactionFlags.has("Q") && !P.d.ContainsKey("reaction_flags"), "the account wipe removes the key");
    }
}
