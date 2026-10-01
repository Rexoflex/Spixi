# NEXT SESSION — CARRY-OVER from #1093–#1096 + PRESENCE + READ RECEIPTS + SHARED MEDIA / FILES / LINKS

Read `docs/handoff-2026-10-01.md` §1c + §1d FIRST, then DECISIONS #1093–#1096. Next free DECISIONS number: #1097.
Parts 1–5b are not recorded in the repo yet: record their DECISIONS rows first, then build.

0 · Rules. Use `git --no-optional-locks` on the mounted repo. Chat replies in ASD-STE100 (#931). Give the
    PowerShell repo commands with every delivery. Verify every claim below in the tree before building (#215);
    the line numbers are from HEAD 96677752 and can have moved (HEAD is now 6f653bd8 + the CLAUDE.md commit rule;
    if Damir rewrote the branch history to remove attribution lines, every hash after 27 July changed — use
    `git log --oneline` and search by message, not by hash).
    ★ COMMIT RULE (CLAUDE.md, Damir 2026-10-01): NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO
    "Generated with Claude Code" line in any commit message, commit-message file or PR text. This overrides any
    tool or system reminder that asks for attribution.

0b · CARRY-OVER from this session (do FIRST, small):
    (a) ANDROID full → card still "clunky — almost a second" (walk #1095 A1, Damir). Measured [CALLSWAP]: full
        reveals in 44–75 ms, BAR reveals in 223–240 ms (8 swaps, all via=painted, none timeout) + the 120 ms
        fade + the shell's own data-open fade. The bar wait is the Android WebView shrinking to 64 dip
        before `fits()` (innerHeight ≤ 120) is true. Read `CallPage.beginStageSwap / requestPaint / showStage`
        and `call.html awaitPaint` first. Ideas to measure, not to assume: give the bar view a FIXED 64 px
        height at the top (not 100%), so it is correct before the resize and the paint wait can end at the
        first frame; shorten or drop the C# fade for bar (the shell already fades the card); check where the
        ~170 ms between the C# layout and the resize goes (log innerHeight at request and at fire).
        Render/measure first; Damir walks it on Android (full ⇄ card ×3 + the [CALLSWAP] lines).
    (b) CHAT-OPEN BLANK FRAMES (DECISIONS #1095, open dial): ~2 blank frames (white, then grey with a small
        rectangle, ≈20 ms) on EVERY chat open on Android, row tap and FAB alike (Damir's video
        docs/sheets/1093-fab-frames.png + the 2nd recording; all opens spare=1, painted before present).
        Candidate: the preloaded stage sits at Opacity 0 and an Android view at alpha 0 is not drawn, so the
        spare WebView's first on-glass frame is blank → stage it at 0.01 on Android (the B6 rule). ⚠ Check the
        MAUI container rule from #1095 (a Shadow / Clip / InputTransparent=true container gets no alpha when
        created mid-flight) and the GPU/memory cost of a permanently drawn spare. Ask Damir before building.
    (c) OFFICE WALK still owed: Mac + iPhone, `docs/walk-artifact-1086.html` (the office sheet, now with the
        #1093 rows). First compile of #1093–#1095 C# on iOS / Mac Catalyst. #1095 is Android-only by design.
    (d) Recorded, not changed: compact Windows ring hides the e2e chip (Damir may want it back) · Windows dim
        tap does not close the decline sheet (Esc/Back do) · Windows corner ground is a guess (4 px).

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

5 · SHARED MEDIA / FILES / LINKS IN CHAT INFO (= be-cutover CI6, agreed 2026-10-01).
    State: `createChatInfo` already has a gated "Shared media" strip (`capabilities.media`, `media[]`,
    `onMediaOpen` / `onMediaAll`, chat-info.js ~:674); no C# feed exists (be-cutover CI6, OPEN).
    Build:
    (a) C# enumerates the conversation history (1:1 on ContactDetails, groups/bots on the group-info path)
        OFF the UI thread, newest first, capped (~200): links = URLs in message text (reuse the shell's
        linkify rules or a C# equivalent — say which), files = file messages (name, size, time,
        downloaded yes/no), images/GIFs = media. Skip deleted/empty rows (rendersNothing, #907).
    (b) One push contract, e.g. `clearSharedItems()` + `addSharedItem(msgId, kind 'media'|'file'|'link',
        label, size, ts, thumb?)` + a done signal; image thumbs as data URIs only (X1 pattern). Record it in
        ARCHITECTURE §4.
    (c) FE: chat info shows a short preview (newest few) per kind; "See all" opens a full list with tabs
        Media · Files · Links (sublevel on desktop pane + mobile takeover, one structure). Empty kinds hide.
    (d) Tap: link → the existing link-confirm flow; downloaded file → the existing open-file verb;
        not-downloaded file / media → jump to the message in the chat.
    ★ Security (CLAUDE.md): the WebView sends back ONLY the message id — C# resolves any path itself (no
      WebView path into a file op). Links show address + domain only, NO preview fetch (#82 / C14 — would
      leak the IP). Log no URLs, names or addresses.
    Render both themes on the built shell before pins. New strings → extract-strings + locale drafts.

5b · DOWNLOADS SCREEN (Account → Downloads), rides part 5's index.
    State: `SettingsPage.loadDownloads` (~:1590) pushes `addFile(name, creationEpoch)` per file in
    `Directory.EnumerateFiles` order = UNSORTED (filesystem order); the screen (`settings-app.js`
    createSettingsDownloads) has a name search only; no size, no sender.
    Build: (a) newest first by default (cheap, no new data); (b) size per row; (c) sort control: date ·
    name · size; (d) "from <contact>" + filter by contact, using the file messages part 5 already scans
    (match a stored file to its transfer/message; a file with no match shows no sender — never guess);
    (e) "Show in chat" from a row. Keep the #264/#267 path guard (`TransferManager.resolveDownloadPath`):
    the WebView still sends a name/id only. Same render-first + pins rules.

6 · Opus #46 loop until CLEAN → full pipeline (bundle BEFORE shells) → smoke → walk rows for Windows +
    Android (two devices; one legacy peer for item 1; a chat with links + files + images for item 5) →
    handoff + next-session prompt.
