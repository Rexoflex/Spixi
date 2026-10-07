/* ★ S8 (#1233) — MINI-APP ACCEPT / DECLINE, the pure half (scripts/csh: S8RulesTests.cs).
 *
 * An appSession row stores the invite text `appId||installUrl||name||imageUrl` (or a bare app id — SingleChatPage's
 * addAppRequest parse); the session id is derived from the app id ALONE (MiniAppPage.sessionIdFor — the one home of
 * that math). Join (`ixian:joinApp:<appId>`, which carries no row) sends Core's appRequestAccept when the NEWEST
 * appSession row of that app in the chat is INCOMING, the app is not `spixi.voip`, and this (peer, session) has not
 * been accepted yet in this run. Decline (`ixian:appDecline:<msgIdHex>`) acts on an INCOMING, non-blank invite row only. */
using System;
using System.Collections.Generic;
using IXICore.Streaming;

namespace SPIXI
{
    public static class AppInviteRules
    {
        public const string VoipAppId = "spixi.voip";

        /** The app id of an invite row's text; "" for a blank (deleted) row. */
        public static string appIdOf(string? rowText)
        {
            if (string.IsNullOrEmpty(rowText))
            {
                return "";
            }
            int sep = rowText.IndexOf("||", StringComparison.Ordinal);
            return sep >= 0 ? rowText.Substring(0, sep) : rowText;
        }

        /** Does Join send appRequestAccept? */
        public static bool joinSendsAccept(string? appId, bool newestRowFound, bool newestRowIsIncoming, bool alreadyAccepted)
        {
            return !string.IsNullOrEmpty(appId) && appId != VoipAppId && newestRowFound && newestRowIsIncoming && !alreadyAccepted;
        }

        /** May this row be declined? An incoming, non-blank invite of an app that is not the call app. */
        public static bool canDecline(bool isAppSessionRow, bool localSender, string? rowText)
        {
            string appId = appIdOf(rowText);
            return isAppSessionRow && !localSender && appId.Length > 0 && appId != VoipAppId;
        }

        /** ★ #46 r1 (C-MAJOR-3): the inviter's side of a peer's reject — is this row MY OWN invite for that session?
         *  `rowSessionId` = MiniAppPage.sessionIdFor(the row's app id) (null for a blank row); a byte-exact match only. */
        public static bool isMyInviteForSession(FriendMessageType type, bool localSender, byte[]? rowSessionId, byte[]? sessionId)
        {
            if (type != FriendMessageType.appSession || !localSender || rowSessionId == null || sessionId == null
                || rowSessionId.Length == 0 || rowSessionId.Length != sessionId.Length)
            {
                return false;
            }
            return rowSessionId.AsSpan().SequenceEqual(sessionId);
        }

        private static readonly HashSet<string> accepted = new HashSet<string>(StringComparer.Ordinal);
        private static readonly Queue<string> acceptedOrder = new Queue<string>();
        private static readonly object gate = new object();
        public const int AcceptCap = 512;

        /** true ONCE per (peer, session hex) per run (capped, the oldest dropped). */
        public static bool claimAccept(string? peer, string? sessionHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(sessionHex))
            {
                return false;
            }
            string key = peer + "|" + sessionHex;
            lock (gate)
            {
                if (!accepted.Add(key))
                {
                    return false;
                }
                acceptedOrder.Enqueue(key);
                while (accepted.Count > AcceptCap && acceptedOrder.Count > 0)
                {
                    accepted.Remove(acceptedOrder.Dequeue());
                }
                return true;
            }
        }

        /** Was this (peer, session) already accepted in this run? (no claim) */
        public static bool wasAccepted(string? peer, string? sessionHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(sessionHex))
            {
                return false;
            }
            lock (gate)
            {
                return accepted.Contains(peer + "|" + sessionHex);
            }
        }

        /** Tests only. */
        public static void resetAccepts()
        {
            lock (gate)
            {
                accepted.Clear();
                acceptedOrder.Clear();
            }
        }
    }
}
