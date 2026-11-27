using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using System;

namespace SPIXI
{
    public partial class SingleChatPage
    {
        /** The match of matchReply; a developer build also logs its [QB2] line (ids and counts only, never a text, name or address). */
        private bool tryReplyMatch(FriendMessage message, long replyTime, string self, ReplyQuote.Index idx, string? preferred,
            out ReplyQuote.Match? match, int channel, bool viaLoad)
        {
            bool found = ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match);
#if SPIXI_DEV_COEXIST
            try   // its own catch: a throw of the line never changes the match
            {
                Logging.info("[QB2] " + ReplyMatchLog.body(self, found && match != null, ReplyMatchLog.candidates(message.message, idx),
                    replyDeepCached(channel)?.Count ?? -1, idx.Count, viaLoad, MainThread.IsMainThread));
            }
            catch (Exception) { }
#endif
            return found;
        }
    }
}
