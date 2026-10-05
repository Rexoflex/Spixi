// ★ #1176 — the chat-info "Show in chat" rule (Spixi/Utils/InfoPaneRules.cs), EXECUTED. The call site
// (ContactDetails.showInChat) is MAUI-bound; scripts/pins-s6/cs.mjs pins that it asks this rule.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class InfoPaneRulesTests
{
    [TestMethod]
    public void beside_pane_with_the_chat_open_stays()
    {
        Assert.IsFalse(InfoPaneRules.showInChatClosesInfo(true, true), "desktop col-2 pane beside the open chat: only the jump");
    }

    [TestMethod]
    public void every_other_layout_closes_and_opens_the_chat()
    {
        Assert.IsTrue(InfoPaneRules.showInChatClosesInfo(false, true), "phone / column 1 / full span: today's close");
        Assert.IsTrue(InfoPaneRules.showInChatClosesInfo(true, false), "beside, but the chat is not open: the jump needs the chat opened");
        Assert.IsTrue(InfoPaneRules.showInChatClosesInfo(false, false));
    }
}
