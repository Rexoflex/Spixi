namespace SPIXI
{
    /* ★ #1176 — the chat-info "Show in chat" rule. PURE (no MAUI, no Core type), so scripts/csh EXECUTES it
     * (InfoPaneRulesTests.cs). The call site (ContactDetails.showInChat) is MAUI-bound; scripts/pins-s6/cs.mjs pins
     * that it asks this rule and HomePage.isInfoPaneBeside. */
    public static class InfoPaneRules
    {
        /** Does "Show in chat" (and the sharedOpen fall-back jump) CLOSE the chat-info page?
         *  besidePane: this info page is the desktop pane pinned to column 2 beside the conversation (HomePage owns it).
         *  chatOpen:   that conversation is open right now (Utils.getChatPage(friend) != null) — the jump lands in it.
         *  Only both together keep the pane open: the open chat applies the jump itself (SingleChatPage.requestJump →
         *  applyPendingJumpWindow) and the pane stays beside it. Phone / column 1 / no open chat = today's behaviour
         *  (close the info page, open the chat at the message). */
        public static bool showInChatClosesInfo(bool besidePane, bool chatOpen)
        {
            return !(besidePane && chatOpen);
        }
    }
}
