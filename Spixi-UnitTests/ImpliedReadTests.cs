using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using System.Collections.Generic;

namespace Spixi_UnitTests
{
    /* ★★ #1102 — executes the implied-read rule (Spixi/Utils/ImpliedRead.cs). Run on the PC:
     *   dotnet test Spixi-UnitTests\Spixi-UnitTests.csproj --filter ImpliedRead
     * Each case names the rule clause it guards; a break of a clause fails the case(s) that exercise it. */
    [TestClass]
    public class ImpliedReadTests
    {
        private static FriendMessage own(byte id, string text = "hi", FriendMessageType t = FriendMessageType.standard)
        {
            return new FriendMessage(new byte[] { id }, text, 0, true, t) { sent = true, confirmed = true };
        }

        private static FriendMessage queued(byte id)
        {
            return new FriendMessage(new byte[] { id }, "hi", 0, true, FriendMessageType.standard) { sent = false, confirmed = false };
        }

        private static FriendMessage relayed(byte id)
        {
            return new FriendMessage(new byte[] { id }, "hi", 0, true, FriendMessageType.standard) { sent = true, confirmed = false };
        }

        private static FriendMessage theirs(byte id)
        {
            return new FriendMessage(new byte[] { id }, "yo", 0, false, FriendMessageType.standard);
        }

        [TestMethod]
        public void MarksEarlierOwnMessagesAndTheReadOne()
        {
            var a = own(1); var b = own(2); var c = own(3);
            var list = new List<FriendMessage> { a, b, c };
            var changed = ImpliedRead.markThrough(list, new byte[] { 2 });
            Assert.IsTrue(a.read && b.read, "a and b read");
            Assert.AreEqual(2, changed.Count);
        }

        [TestMethod]
        public void LaterMessagesStayDelivered()
        {
            var a = own(1); var b = own(2); var c = own(3);
            ImpliedRead.markThrough(new List<FriendMessage> { a, b, c }, new byte[] { 2 });
            Assert.IsFalse(c.read, "a message after X has no receipt yet: it stays delivered");
        }

        [TestMethod]
        public void ReceivedMessagesAreNotTouched()
        {
            var t = theirs(1); var b = own(2);
            ImpliedRead.markThrough(new List<FriendMessage> { t, b }, new byte[] { 2 });
            Assert.IsFalse(t.read, "a received message is not ours to mark");
        }

        [TestMethod]
        public void FailedMessagesAreNotMarked()
        {
            var a = own(1); a.errorSending = true; var b = own(2);
            ImpliedRead.markThrough(new List<FriendMessage> { a, b }, new byte[] { 2 });
            Assert.IsFalse(a.read, "a message that failed to send may never have arrived");
        }

        [TestMethod]
        public void DeletedTombstonesAreNotMarked()
        {
            var a = own(1, ""); var b = own(2);
            var changed = ImpliedRead.markThrough(new List<FriendMessage> { a, b }, new byte[] { 2 });
            Assert.IsFalse(a.read, "#907: a deleted row shows nothing");
            Assert.AreEqual(1, changed.Count);
        }

        [TestMethod]
        public void OnlyTextAndFileRows()
        {
            var p = own(1, "tx", FriendMessageType.sentFunds); var f = own(2, "uid:name:1", FriendMessageType.fileHeader); var b = own(3);
            ImpliedRead.markThrough(new List<FriendMessage> { p, f, b }, new byte[] { 3 });
            Assert.IsFalse(p.read, "a payment row has no tick");
            Assert.IsTrue(f.read, "a file row has a tick");
        }

        [TestMethod]
        public void AlreadyReadIsNotReturned()
        {
            var a = own(1); a.read = true; var b = own(2);
            var changed = ImpliedRead.markThrough(new List<FriendMessage> { a, b }, new byte[] { 2 });
            Assert.AreEqual(1, changed.Count, "only real changes are pushed");
        }

        [TestMethod]
        public void AMessageThatNeverLeftStaysUnread()
        {
            var q = queued(1); var b = own(2);
            ImpliedRead.markThrough(new List<FriendMessage> { q, b }, new byte[] { 2 });
            Assert.IsFalse(q.read, "#46 r1 A1: still in the pending queue — it may never arrive");
        }

        [TestMethod]
        public void ARelayedMessageBecomesDeliveredAndRead()
        {
            var r = relayed(1); var b = own(2);
            ImpliedRead.markThrough(new List<FriendMessage> { r, b }, new byte[] { 2 });
            Assert.IsTrue(r.sent && r.confirmed && r.read, "#46 r1 C7: all three flags are written (the fixture no longer pre-sets them)");
        }

        [TestMethod]
        public void AConfirmedButNotSentFlagIsCompleted()
        {
            var c = new FriendMessage(new byte[] { 1 }, "hi", 0, true, FriendMessageType.standard) { sent = false, confirmed = true };
            var b = own(2);
            ImpliedRead.markThrough(new List<FriendMessage> { c, b }, new byte[] { 2 });
            Assert.IsTrue(c.sent && c.read, "(#46 r1 M20) the sent flag is written too");
        }

        [TestMethod]
        public void UnknownIdChangesNothing()
        {
            var a = own(1);
            var changed = ImpliedRead.markThrough(new List<FriendMessage> { a }, new byte[] { 9 });
            Assert.IsFalse(a.read);
            Assert.AreEqual(0, changed.Count);
        }

        [TestMethod]
        public void ReceiptForAReceivedIdChangesNothing()
        {
            var a = own(1); var t = theirs(2);
            var changed = ImpliedRead.markThrough(new List<FriendMessage> { a, t }, new byte[] { 2 });
            Assert.IsFalse(a.read, "X must be ours");
            Assert.AreEqual(0, changed.Count);
        }
    }
}
