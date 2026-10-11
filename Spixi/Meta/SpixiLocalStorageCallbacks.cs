using IXICore.Meta;
using IXICore.Storage;
using IXICore.Streaming;
using System;
using System.IO;

namespace SPIXI.Meta
{
    internal class SpixiLocalStorageCallbacks : LocalStorageCallbacks
    {
        public void processMessage(Friend friend, int channel, FriendMessage friendMessage)
        {
            if (friendMessage.filePath != "")
            {
                string t_file_name = Path.GetFileName(friendMessage.filePath);
                try
                {
                    if (friendMessage.type == FriendMessageType.fileHeader && friendMessage.completed == false)
                    {
                        if (friendMessage.localSender)
                        {
                            /* ★ S16 (#1311 (c)): ONCE per transfer id per session, BEFORE any file op — no id → nothing to re-arm;
                             * already outgoing → quiet; already tried this session → quiet (its error line, if any, was logged
                             * once). S16FixRules.rearmLeg (the order is executed in S16FixTests). No id in any log line. */
                            if (S16FixRules.rearmLeg(friendMessage.transferId, TransferManager.hasOutgoing, TransferManager.claimRearm) != S16FixRules.RearmLeg.Arm)
                            {
                                return;
                            }
                            /* ★ S16 #46 r1 (R3 m1 / n6): the file op is tried ONCE per id per session only when it fails for good (the
                             * source is gone). Any other failure (a sharing violation, protected data on an iOS background load) releases the claim, so the next message load tries again; the error line is
                             * written once per id either way (S16FixRules.rearmFailure, executed in S16FixTests). The stream is
                             * disposed on every failure after the open. */
                            FileStream? fs = null;
                            try
                            {
                                /* ★ S9 #46 r4: my unfinished SENT file is re-armed from the path recorded at send time — after an iOS
                                 * container move that absolute path is gone, so a durable Sent copy is re-rooted into TODAY's Sent
                                 * folder (PhotoRules.rerootSent — the SharedItems.localPathOf rule). Any other path is used as recorded. */
                                string path = friendMessage.filePath;
                                if (!File.Exists(path))
                                {
                                    string? rerooted = PhotoRules.rerootSent(path, Path.Combine(Config.spixiUserFolder, PhotoRules.SentFolderName));
                                    if (rerooted != null && File.Exists(rerooted))
                                    {
                                        path = rerooted;
                                    }
                                }
                                // TODO may not work on Android/iOS due to unauthorized access
                                fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
                                var ft = TransferManager.prepareFileTransfer(t_file_name, fs, path, friendMessage.transferId);
                                if (ft == null)
                                {
                                    fs.Dispose();
                                    Logging.error("Failed to prepare file transfer for an unfinished sent file");   // ★ S9 #46 r4: fixed words — no name, address or path
                                    return;
                                }
                                fs = null;   // the transfer owns the stream now — a later throw must not dispose it
                                if (friend.bot || friend.type == FriendType.Group)
                                {
                                    ft.channel = channel;
                                    ft.groupAddress = friend.walletAddress;
                                }
                            }
                            catch (Exception e)
                            {
                                try { fs?.Dispose(); } catch (Exception) { }
                                if (TransferManager.rearmFailed(friendMessage.transferId, e))
                                {
                                    Logging.error("Error occured while trying to prepare file transfer for an unfinished sent file (" + e.GetType().Name + ")");   // the TYPE only — no id, path, name or message text
                                }
                            }
                        }
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Error occured while trying to prepare file transfer for an unfinished sent file (" + e.GetType().Name + ")");   // ★ S9 #46 r4: the TYPE only — no path, name or message text
                }
            }
        }
    }
}
