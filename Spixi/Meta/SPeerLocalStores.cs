namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S9 (A3 fix r1): the per-peer Spixi-side stores added in S9 — SAppJoins (8-APP), SVoicePlayed (8-FACE) and
    /// SPhotoGroups (#1244) — forgotten in ONE call at every site that already forgets a peer's declined invites
    /// (SAppDeclines.clear: contact remove / history delete / re-add / room leave). One statement per site keeps those
    /// sites short (the P0 #1155 removal pin reads a fixed window after FriendList.removeFriend) and means a fourth store
    /// is added here once, not at eight sites. Each store never throws.
    /// </summary>
    public static class SPeerLocalStores
    {
        public static void forget(string? peer)
        {
            SAppJoins.clear(peer);
            SVoicePlayed.clear(peer);
            SPhotoGroups.clear(peer);
        }
    }
}
