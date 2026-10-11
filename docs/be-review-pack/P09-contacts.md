# P09 · CONTACTS · Contacts, requests, groups: accept, decline, remove, ignore, create, leave

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH — contact, history and received-file deletes are raised from WebViews that render untrusted content | no | yes | shipped | 8 min |

**Look here first:** `Spixi/Pages/Contacts/ContactDetails.xaml.cs:547` — `ixian:removecontact:<0|1>` from chat info (a shell that renders peer names): no native confirm, only the JS sheet. `1` first leaves every shared group (`SContacts.cs:147`), then removes the contact and its history (`:167`) — only if the leaves lifted Core's refusal (Core `FriendList.removeFriend` refuses while the contact is in any group). Legacy `ixian:remove` had no confirm either; the leave-all step is new.

**DECISIONS:** #219 · #248 · #265 · #400 · #435 · #447 · #539 · #540 · #542 · #562 · #567 · #613 · #634 · #635 · #676 · #797 · #928 · #947 · #962 · #967 · #970 · #978 · #984 · #1141 · #1155 · #1303 · #1312

## What changed and why
- Delete in the chats list sent no verb, so the contact and its history stayed on disk. HomePage now has address-scoped `removehistory`, `removecontact`, `sharedGroups` and `leavegroup`. Their bodies are in `SContacts` (#539, #540, #676).
- Chat info uses the same verb and the same sheet. Legacy `ixian:remove` and its dead-end modal are deleted (#634).
- The request feed is in the chats list (#219). A decline remembers the requester in an app ignore list. A re-sent request from that address is dropped before Core (#970, #978, #984).
- Groups are created in the shell (#265, #1141). Leaving a group or bot sends `sendLeave`, then removes the record at once, to avoid Core's `leaveConfirmed` crash (#567, #797). Favourites are an app preference (#928).
- An outgoing request is hidden, not revoked. The revoke verbs are deleted (#562, #947, #967).

## Files (verified at 387ca78b)
- `Spixi/Utils/SContacts.cs:134` — `removeContact`: a group or bot leaves (`:70`, `:99` sendLeave, `:108` removeFriend). With `leave=1`, each shared group is left first (`:147`).
- `Spixi/Pages/Home/HomePage.xaml.cs:6754` — `onRemoveContactFor`: parses `<addr>:<0|1>[:media]`. A `:media` purge runs only on success (`:6803`).
- `Spixi/Pages/Home/HomePage.xaml.cs:6384` — `onAcceptRequest`: any known friend is set to approved and `sendAcceptAdd` is sent. There is no state test.
- `Spixi/Pages/Home/HomePage.xaml.cs:6938` — the decline predicate: only an incoming request is ignore-listed. The removal (`:6946`) runs for any friend.
- `Spixi/Network/StreamProcessor.cs:289` — `isIgnoredRequest`: a pre-Core peek, ≤ 16 KiB (`:300`), checked against `SRequestIgnore` (`ignored_requests` app preference, canonical addresses, cap 256). Any parse failure passes the message on to Core.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:950` — legacy `ixian:undorequest`, unanchored prefix. It removes the open chat's friend in any state. We added the ignore list and a result push.

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:removecontact:` | `<addr b58>:<0\|1>[:media]` | `home.html`→`index.html`, HomePage (untrusted list) | `HomePage.xaml.cs:997` | ours |
| `ixian:removecontact:` | `<0\|1>` (this page's contact) | `contact_details.html`, ContactDetails (untrusted) | `ContactDetails.xaml.cs:547` | ours, replaces `ixian:remove` |
| `ixian:removehistory:` · `ixian:leavegroup:` | `<addr>[:media]` | HomePage | `HomePage.xaml.cs:993` · `:1022` | ours |
| `ixian:sharedGroups[:<addr>]` | none / `<addr>` (read-only) | HomePage · ContactDetails | `HomePage.xaml.cs:1001` · `ContactDetails.xaml.cs:712` | ours |
| `ixian:acceptRequest:` · `ixian:declineRequest:` · `ixian:favchat:` | `<addr>` · `<addr>` · `<addr>:on\|off` | HomePage | `HomePage.xaml.cs:1747` · `:1752` · `:1392` | ours |
| `ixian:creategroup:` · `ixian:groupreset` | `<0\|1><name>:\|<addr>\|…` · none | HomePage | `HomePage.xaml.cs:1098` · `:1080` | ours |
| `ixian:openChat:` | `<addr>` (a known friend only) | ContactDetails | `ContactDetails.xaml.cs:607` | ours |
| `ixian:viewcontact:` | `<addr>` (lookup only) | `contact_new.html` ContactNewPage · `chat.html` SingleChatPage (untrusted) | `ContactNewPage.xaml.cs:117` · `SingleChatPage.xaml.cs:468` | ours |
| `ixian:unignore:` | `<addr>` (touches the preference only) | `settings.html`, SettingsPage | `SettingsPage.xaml.cs:667` | ours |
| `ixian:undorequest` · `ixian:joinBot` | none | `chat.html` SingleChatPage (untrusted: peer messages) · `settings.html` SettingsPage (our content only) | `SingleChatPage.xaml.cs:950` · `SettingsPage.xaml.cs:804` | reshaped · relocated legacy |
| `removeContactResult` · `removeHistoryResult` · `leaveGroupResult` · `undoRequestResult` | `<addr>, ok\|left\|blocked\|fail[, name, addr…]` | C# → home / contact_details / chat / settings | `HomePage.xaml.cs:6818` · `:6747` · `:6883` · `:6979` | ours |
| `addRequest` · `onRequestResult` · `setChatFavorite` · `setSharedGroups` · `setIgnoredRequests` | `<addr, nick, avatar, ts>` · `<0\|1, text>` · `<addr, 0\|1>` · `<addr, pairs>` · `<csv addr>` | C# → home / contact_new / settings | `HomePage.xaml.cs:3892` · `:6499` + `ContactNewPage.xaml.cs:319` · `:1425` · `:6913` · `SettingsPage.xaml.cs:1739` | ours |
| `setContext` · `setRelation` · `setGroupInfo` · `clearMembers` · `addMember` · `setGroupOwner` | enums, counts, flags, addr, nick, avatar | C# → `contact_details.html` ContactDetails (first five) · `chat.html` SingleChatPage (`setGroupOwner` only) | `ContactDetails.xaml.cs:147` · `:154` · `:298` · `:423` · `:496` · `SingleChatPage.xaml.cs:1468` | ours |
A mini-app cannot raise any of these: `MiniAppPage.xaml.cs:148` handles its own 8 verbs plus `onNavigatingGlobal`, which has none of them.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| compromised chat-info WebView: remove this contact and leave all its shared groups | Page-scoped (it uses the page's own `friend`, `ContactDetails.xaml.cs:566`). Otherwise nothing native: the JS sheet only | no proof (a JS confirm only, #634) |
| compromised home WebView: `removecontact`/`removehistory`/`leavegroup` for every address with `:media` | Paths come from C#'s own history, never the URL. Received, completed rows only (`SContacts.cs:333`). No `..` re-root (`:348`). Root re-checked per file (`:596`) | smoke `★ CH3 ②: isInsideDownloadsRoot is fail-closed …` · `★ CH3 ③ … :media token is stripped first …` |
| compromised home WebView: `declineRequest:<approved contact>` | Not ignore-listed (`HomePage.xaml.cs:6938`). The removal still runs; Core refuses a group member | smoke `★★ #978/#984/#985: an address is REMEMBERED only on an incoming decline …` |
| compromised home WebView: accept a stranger's pending request, or create a group of ≤ 10 contacts with its own name | Only a friend already in the list (`HomePage.xaml.cs:6395`). Group needs 2–10 valid members (`:1122`, `GroupLimit` `:2557`). No native confirm | no proof |
| hostile peer: re-sends a declined request | Dropped before Core (`StreamProcessor.cs:289`). A parse failure passes it to Core | smoke `★★ #978: the drop runs BEFORE Core (base.receiveData) and only when ALL hold …` |
| crafted payload: hijacks a destructive verb | StartsWith + Ordinal + a trailing colon, placed above the legacy `Contains()` branches. Address parsed inside try | smoke `★★ A6 C#: HomePage dispatches the three address-scoped verbs (StartsWith + Ordinal + colon)` |

## Given up / left open
- No destructive contacts verb has a native confirm (both `removecontact`, `removehistory`, `leavegroup`, `declineRequest`, the legacy chat `undorequest`/`leave`). The perf research plans an option B (native confirm) behind a flag. It is not built and has no row yet (#1312).
- #962: an accept that arrives after a cancel causes an NRE in Core `CoreStreamProcessor.cs:1214` (`acceptAdd`) / `:1260` (`acceptAdd2`), `friend` is null; caught at the end of `receiveData`. The patch is `docs/core-patches/962-accept-null-guard.patch` and is not in Core 097341a. A copy is uncommitted on Damir's PC. BE-only.
- A bot leave never waits for `leaveConfirmed`, because Core `StreamClientManager.getClient` (`Network/StreamClientManager.cs:118`) calls itself. The server keeps sending to the left room (#567). A decline does not tell the peer: the protocol has no reject message (#970). Core-side removals do not clear our per-contact app preferences (O-06 residual, #1303).

## Question for BE
Do you want a native C# confirm before `removecontact` (both pages), or is the shell sheet enough, as it was for legacy `ixian:remove`?
