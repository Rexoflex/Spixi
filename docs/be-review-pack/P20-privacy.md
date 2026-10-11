# P20 · PRIVACY · Privacy switches that change the wire, and "last seen"

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MED | no | yes | shipped | 5 min |

**Look here first:** `Spixi/Utils/SpixiProtocols.cs:48` — "Hide my online status" only ADDS `spixi.presence-hidden.1` to a capability answer that goes out when a contact's app asks (`Spixi/Network/StreamProcessor.cs:1012`). Keepalives, delivery receipts and that answer still show the network and the peer that you are online. It is a request, not suppression; the UI text says so.

**DECISIONS:** #1102 · #1103 · #1104 · #1105 · #1113 · #1116 · #1118 · #1164 · #1234 · #1281 · #1300

## What changed and why
- Three Account → Privacy switches, stored as app preferences. C# enforces them at the send sites: receipts off = no `msgRead`, typing off = no typing sent and none shown (#1234).
- Reciprocal: with receipts off you also see no "read" ticks and no group "seen" (#1234). Hide online = the capability id above + no online dot or last seen for anyone. Real hiding = Core, v1.1 (#1234, #1104).
- "Online" is display-only: sighted ≤ 150 s; else "last seen" in three words (#1103, #1113). Core's `friend.online` (routing) is untouched (#1103).
- The newest sighting of each accepted 1:1 contact is kept on disk, rounded down to 5 min, max 512 contacts (#1116, #1118). The #1102 implied read was removed (#1164).

## Files (verified at 387ca78b)
- `Spixi/Meta/SPrivacyPrefs.cs:17`–`:19` — keys `privacyReadReceipts` (default on), `privacyTypingIndicators` (on), `privacyHideOnline` (off); bools only (#1234).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:6523` — the ONLY `msgRead` sent by Spixi; Core sends none (#1234).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:808` — the gate before the only `StreamProcessor.sendTyping` call (`:810`); `Spixi/Network/StreamProcessor.cs:662` hides incoming typing (#1234).
- `Spixi/Utils/PresenceDisplay.cs:136` — hide rule (mine on, or the contact announces the id). `:55` / `:73` write sightings, also while hide is ON (#1118, #1234).
- `Spixi/Meta/SSightingStore.cs:29` — ONE preference `last_sightings` = `address:seconds,…`; `:31` 5-min grain; `:30` cap 512 (#1118).
- `Spixi/Utils/SContacts.cs:172` — sighting forgotten on removal (also `SingleChatPage.xaml.cs:990`, `HomePage.xaml.cs:6960`); `SettingsPage.xaml.cs:1759` clears it on wipe (#1118).
- `Spixi/Meta/SChatPrefs.cs:23` / `:36` — `fav.<address>` and `chatPhotoPreviews` (their verbs are in other packets).
- Android backup excludes every preference (`sharedpref`), so sightings stay on the phone (#1281, #1300).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:readReceipts:<on\|off>` | `on`, anything else = off | `settings.html` → SettingsPage (renders peer-chosen download file names = untrusted) | `SettingsPage.xaml.cs:1010` | ours |
| `ixian:typingIndicators:<on\|off>` | same | `settings.html` → SettingsPage | `SettingsPage.xaml.cs:1017` | ours |
| `ixian:hideOnline:<on\|off>` | same | `settings.html` → SettingsPage | `SettingsPage.xaml.cs:1023` | ours |
| push `setReadReceipts` | `<"True"\|"False">` | C# → `settings.html` (`:1013`, `:1728`) and → `chat.html` (untrusted renderer, a bool only) | `SingleChatPage.xaml.cs:6975` | ours |
| push `setTypingIndicators` | `<"True"\|"False">` | C# → `settings.html` | `SettingsPage.xaml.cs:1020`, `:1729` | ours |
| push `setHideOnline` | `<"True"\|"False">` | C# → `settings.html` | `SettingsPage.xaml.cs:1026`, `:1730` | ours |
Mini-app WebView: `MiniAppPage` handles none of these. The stored value is echoed, never the URL text.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| a switch says "off" but a `msgRead` still goes out | C# gate at the only send site, `SingleChatPage.xaml.cs:6523` | `pins-s8/cs-wiring.mjs` "S8 PR1 receipts + typing" · csh `S8RulesTests.read_receipts_rules` |
| typing off but typing still sent | `SingleChatPage.xaml.cs:808` | `pins-s8/cs-wiring.mjs` "S8 PR1 receipts + typing" |
| a peer (or the network) still sees me online with "hide" on | nothing on the wire: `SpixiProtocols.cs:48` asks Spixi peers only; honest text `hideOnlineHint` | `pins-s8/cs-wiring.mjs` "S8 PR3 settings verbs" |
| a compromised settings WebView flips a switch silently | nothing — the verb is the user's own switch; C# stores exactly on/off | no pin — walk only |
| data at rest: a contact's routine on disk | 5-min grain, accepted 1:1 only (`PresenceDisplay.cs` `keeps`), cap 512, forget + wipe, not in the backup | csh `Run.cs` "int: ONE preference string, address:seconds" |

## Given up / left open
- Delivery receipts (`msgReceived`, legacy Core behaviour) and presence keepalives have no switch. They still show you are online (#1104, #1234).
- A peer learns "hidden" only when its app asks again: once per contact per run, at chat open. A stored answer never expires, and turning the switch OFF lags the same way (#1234).
- Sightings are still written while "hide" is ON (only the display is hidden) (#1118, #1234).
- Not verified: whether any Core-side removal of an accepted 1:1 contact skips `SSightingStore.forget`. If so, the entry stays until the cap or the wipe.

## Question for BE
Will Core v1.1 give the app a way to stop presence keepalives for a user who hides online status (yes / no)?
