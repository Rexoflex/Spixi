using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using System.Collections.Generic;

namespace Spixi_UnitTests
{
    /* ★★ #1103 (#46 r1 C3) — executes the pure parts of the displayed-presence rule (Spixi/Utils/PresenceDisplay.cs). Run:
     *   dotnet test Spixi-UnitTests\Spixi-UnitTests.csproj --filter PresenceDisplay */
    [TestClass]
    public class PresenceDisplayTests
    {
        [TestMethod]
        public void FreshUpTo150Seconds()
        {
            Assert.IsTrue(PresenceDisplay.isFresh(1000, 1150), "150 s old = still online (one keepalive + 50 s)");
            Assert.IsFalse(PresenceDisplay.isFresh(1000, 1151), "151 s old = not online");
            Assert.IsFalse(PresenceDisplay.isFresh(0, 5), "never seen = not online");
        }

        [TestMethod]
        public void LastSeenIsLocalAndNeverInTheFuture()
        {
            Assert.AreEqual(5000 - 300, (int)PresenceDisplay.localEpochOf(9700, 10000, 5000), "300 s ago on the network clock = 300 s ago locally");
            Assert.AreEqual(5000, (int)PresenceDisplay.localEpochOf(10100, 10000, 5000), "a sighting ahead of the network clock reads as now, never later");
            Assert.AreEqual(0, (int)PresenceDisplay.localEpochOf(0, 10000, 5000), "unknown stays 0 (the UI shows nothing)");
        }

        [TestMethod]
        public void TheLatchPushesOnlyOnAChange()
        {
            var latch = new Dictionary<string, bool>();
            Assert.IsTrue(PresenceDisplay.latchFlip(latch, "a", true), "first value pushes");
            Assert.IsFalse(PresenceDisplay.latchFlip(latch, "a", true), "same value does not");
            Assert.IsTrue(PresenceDisplay.latchFlip(latch, "a", false), "a flip pushes");
        }
    }
}
