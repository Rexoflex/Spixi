using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;
using System.Collections.Generic;

namespace Spixi_UnitTests
{
    /* ★ G-2 (session 2, #1116 (2), #1118 (a)) — executes the pure parts of the kept "last seen": the stored grain, the
     * stored string (parse / serialize / cap) and the newest-of rule (Spixi/Meta/SSightingStore.cs,
     * Spixi/Utils/PresenceDisplay.cs). Run:
     *   dotnet test Spixi-UnitTests\Spixi-UnitTests.csproj --filter SightingStore */
    [TestClass]
    public class SightingStoreTests
    {
        [TestMethod]
        public void TheGrainRoundsDownNeverUp()
        {
            Assert.AreEqual(600, (int)SSightingStore.coarse(899), "899 s → 600 s: rounded DOWN to 5 min, never newer than the truth");
            Assert.AreEqual(900, (int)SSightingStore.coarse(900), "an exact step stays");
            Assert.AreEqual(0, (int)SSightingStore.coarse(0), "unknown stays unknown");
            Assert.AreEqual(0, (int)SSightingStore.coarse(-5), "a negative time is unknown");
        }

        [TestMethod]
        public void TheStoredStringSurvivesARoundTripAndSkipsJunk()
        {
            var d = SSightingStore.parse("aaa:600,bbb:900,:5,ccc:,ddd:x,eee:-3,aaa:300");
            Assert.AreEqual(2, d.Count, "two good rows; empty address, empty time, junk and negative are skipped");
            Assert.AreEqual(600, (int)d["aaa"], "a duplicate keeps the NEWER time");
            var back = SSightingStore.parse(SSightingStore.serialize(d, 10));
            Assert.AreEqual(600, (int)back["aaa"], "round trip");
            Assert.AreEqual(900, (int)back["bbb"], "round trip");
        }

        [TestMethod]
        public void TheCapKeepsTheNewest()
        {
            var d = new Dictionary<string, long> { { "old", 300 }, { "mid", 600 }, { "new", 900 } };
            var kept = SSightingStore.parse(SSightingStore.serialize(d, 2));
            Assert.AreEqual(2, kept.Count, "capped");
            Assert.IsFalse(kept.ContainsKey("old"), "the OLDEST sighting goes first");
            Assert.IsTrue(kept.ContainsKey("new") && kept.ContainsKey("mid"), "the newest stay");
        }

        [TestMethod]
        public void LastSeenIsTheNewestSightingAndNeverInTheFuture()
        {
            Assert.AreEqual(0, (int)PresenceDisplay.newestSighting(0, 0, 0, 10000), "nothing known → 0 (the UI shows nothing)");
            Assert.AreEqual(4000, (int)PresenceDisplay.newestSighting(0, 0, 4000, 10000), "after a restart the KEPT sighting shows");
            Assert.AreEqual(9000, (int)PresenceDisplay.newestSighting(9000, 0, 4000, 10000), "a live keepalive wins when newer");
            Assert.AreEqual(9500, (int)PresenceDisplay.newestSighting(0, 9500, 4000, 10000), "a message heard this run wins when newer");
            Assert.AreEqual(10000, (int)PresenceDisplay.newestSighting(12000, 0, 0, 10000), "a sighting ahead of the clock reads as now");
        }

        [TestMethod]
        public void ASightingOnlyMovesForward()
        {
            var d = new Dictionary<string, long>();
            Assert.IsTrue(SSightingStore.noteInto(d, "a", 1000, 10), "a first sighting is written");
            Assert.AreEqual(900, (int)d["a"], "stored coarse (5-min grain, down)");
            Assert.IsFalse(SSightingStore.noteInto(d, "a", 1100, 10), "the same 5-min step: no write");
            Assert.IsFalse(SSightingStore.noteInto(d, "a", 600, 10), "an OLDER sighting never overwrites");
            Assert.IsTrue(SSightingStore.noteInto(d, "a", 1300, 10), "a newer step is written");
            Assert.AreEqual(1200, (int)d["a"], "…and stored");
            Assert.IsFalse(SSightingStore.noteInto(d, "", 1300, 10), "no address: nothing");
            Assert.IsFalse(SSightingStore.noteInto(d, "b", 0, 10), "unknown time: nothing");
        }

        [TestMethod]
        public void TheWriteCapDropsTheOldest()
        {
            var d = new Dictionary<string, long>();
            SSightingStore.noteInto(d, "old", 300, 2);
            SSightingStore.noteInto(d, "mid", 600, 2);
            SSightingStore.noteInto(d, "new", 900, 2);
            Assert.AreEqual(2, d.Count, "capped");
            Assert.IsFalse(d.ContainsKey("old"), "the oldest goes");
        }

        [TestMethod]
        public void ParseKeepsTheNewerDuplicateInEitherOrder()
        {
            Assert.AreEqual(600, (int)SSightingStore.parse("a:300,a:600")["a"], "older first → the newer wins");
            Assert.AreEqual(600, (int)SSightingStore.parse("a:600,a:300")["a"], "newer first → the newer stays");
        }
    }
}
