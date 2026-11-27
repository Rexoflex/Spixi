namespace SPIXI
{
    public partial class SingleChatPage
    {
        public void convertToBot()
        {
            popToRootAsync();
            if (homePage != null)
            {
                homePage.removeDetailContent(false);
                homePage.onChat(friend.walletAddress, null);
            } else
            {
                HomePage.Instance().onChat(friend.walletAddress, null);
            }
        }
    }
}
