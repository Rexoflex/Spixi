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
                            FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
                            var ft = TransferManager.prepareFileTransfer(t_file_name, fs, path, friendMessage.transferId);
                            if (ft == null)
                            {
                                fs.Dispose();
                                Logging.error("Failed to prepare file transfer for an unfinished sent file");   // ★ S9 #46 r4: fixed words — no name, address or path
                                return;
                            }
                            if (friend.bot || friend.type == FriendType.Group)
                            {
                                ft.channel = channel;
                                ft.groupAddress = friend.walletAddress;
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
