# SESSION — PRESENCE + READ RECEIPTS (agreed with Damir 2026-10-01; run AFTER the current parallel session)

Paste this into the session after the parallel one. Combine it with what that session prepares as the next version.
Nothing below is recorded in the repo yet. Record DECISIONS rows first (next free numbers), then build.

0 · Rules. Use `git --no-optional-locks` on the mounted repo. Chat replies in ASD-STE100 (#931). Give the
    PowerShell repo commands with every delivery. Verify every claim below in the tree before building (#215);
    the line numbers are from HEAD 96677752 and can have moved.

1 · IMPLIED READ (our side; works with LEGACY peers).
    Finding (Damir's screenshot, chat with a legacy user): read ticks on some messages, "delivered" on the
    ones between them. Mechanism: the receiver sends ONE `msgRead` per message, fire-and-forget, no retry
    (`SingleChatPage.updateMessageReadStatus` ~:3583; same code in legacy 0e85a4b8:1531). Its
    `updateMessagesReadStatus` (~:3614) first marks `metaData.lastMessage` read WITHOUT a receipt, so the
    loop that sends receipts can skip it. Our receiver (`StreamProcessor` `case msgRead` ~:660) marks only
    the ONE message.
    Build: when a `msgRead` arrives for own message X, also mark every EARLIER own message in the same
    chat + channel read (sent/confirmed/read), persist, and push the tick updates (one batch, not one push
    per row). 1:1 only — group "seen" is per member (#658 rule: `UIHelpers.anyOtherMemberHasMessage`),
    do not apply implied read to groups/bots without checking that rule. A message with NO later receipt
    stays "delivered" (honest).
    Also fix OUR receiver side for new-app peers: opening a chat must send a receipt for every unread
    message — the lastMessage pre-mark must not swallow its receipt.
    Pins: executed where possible; mutation-test (#771/#798).

2 · SHORTER "ONLINE" WINDOW + "LAST SEEN" (our side).
    Finding: a contact shows online ~2–5 min after leaving (F4, security-review doc "TRUST-SIGNAL";
    Core: keepalive every 100 s `CoreConfig.clientKeepAliveInterval`, expiry 300 s
    `clientPresenceExpiration`; app: `Node.cs` online while a PresenceList entry exists).
    Build: (a) show "online" only when `friend.lastSeenTime` (set in `Network/NetworkProtocol.cs` ~:474)
    is within ~2 min — pick the value from the 100 s keepalive, state it; (b) C# pushes the last-seen
    timestamp (new trailing arg or a new push — an older shell must ignore it) and the chat header + chat
    info show "last seen …" (localized, relative time, the timestamp.js rules) when not online. Accuracy
    is ±~2 min — say so in DECISIONS. Render both themes before pins. New strings → extract-strings +
    all locales (drafts).

3 · BE / CORE ASK (record only, do not build): an explicit "going offline" announce on a clean close and
    when the app goes to the background, so the network drops the presence at once (be-cutover-brief new
    row + security-review F4 cross-reference). Shorter keepalive is the Core engineer's call (battery +
    network cost for every user).

4 · NOT in v1 (Damir agreed): a privacy setting to hide online status. Presence is how the network routes
    messages to you, so the app cannot hide it from the network; a WhatsApp-style "hide mine / hide
    theirs" would be display-only. Record as a deferred row with that reason.

5 · Opus #46 loop until CLEAN → full pipeline (bundle BEFORE shells) → smoke → walk rows for Windows +
    Android (two devices; one legacy peer for item 1) → handoff + next-session prompt.
