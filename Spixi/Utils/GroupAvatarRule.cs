/* ★ S8 (#1231) — TWO GROUP RULES, pure (scripts/csh executes them: S8RulesTests.cs).
 *
 * accept: a GROUP's picture is taken only from its OWNER. For a group-addressed avatar Core resolves the sender
 * (CoreStreamProcessor.receiveData, Ixian-Core Streaming/CoreStreamProcessor.cs:813-890): `group_sender_address` = the
 * stream sender, or the REAL sender when the owner relayed it (spixi_message.groupSenderAddress, trusted only from the
 * owner). The owner's own picture (sendAvatar(member, group), :2323-2356) comes straight from the owner, so
 * `group_sender_address` IS the owner — it is never null on that path. A null sender or an unknown owner fails CLOSED
 * (dropped). A non-group friend (1:1 contact, bot room) is not this rule's business → accepted (today's path).
 * Addresses compare as Core's Address.SequenceEqual does (addressNoChecksum bytes, Address.cs:367).
 *
 * writesAddedLine: the "added you to this group" line is written only into a group Core found that holds NO message
 * yet (no stored row on channel 0 and no last message) — an unknown count (-1: the store could not answer) writes nothing.
 *
 * addedLineText (★ #46 r1 C-MAJOR-3 / A-NIT-1): which string the line uses — `chat-group-added-you` with the contact's
 * nickname as this device knows it, or, when that name is empty / blank, `chat-group-added-you-noname` ("You were added
 * to this group") with no arg. The name is used as given (trimmed); it is an argument to string.Format, never a format. */
using System;

namespace SPIXI
{
    public static class GroupAvatarRule
    {
        public static bool accept(bool isGroup, byte[]? groupSender, byte[]? owner)
        {
            if (!isGroup)
            {
                return true;
            }
            if (groupSender == null || owner == null || groupSender.Length == 0 || owner.Length == 0)
            {
                return false;
            }
            return groupSender.AsSpan().SequenceEqual(owner);
        }

        public static bool writesAddedLine(bool groupFound, int storedMessages, bool hasLastMessage)
        {
            return groupFound && storedMessages == 0 && !hasLastMessage;
        }

        public const string AddedKey = "chat-group-added-you";
        public const string AddedNoNameKey = "chat-group-added-you-noname";

        public sealed class AddedLine
        {
            public readonly string key;
            public readonly string arg;
            public readonly string fallback;   // the en-us text, for a language file that lacks the key
            public AddedLine(string k, string a, string f) { key = k; arg = a; fallback = f; }
        }

        public static AddedLine addedLineText(string? ownerName)
        {
            string name = ownerName == null ? "" : ownerName.Trim();
            if (name.Length == 0)
            {
                return new AddedLine(AddedNoNameKey, "", "You were added to this group");
            }
            return new AddedLine(AddedKey, name, "{0} added you to this group");
        }
    }
}
