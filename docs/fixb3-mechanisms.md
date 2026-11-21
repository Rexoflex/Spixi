# Fix batch 3 — the mechanisms, written before the fixes (#294)

Batch `fixb3` (MC session `fixb3`). Base `redesign/frontend` @ `14ae57f2`. Code read in the tree of the base. `MAP` =
`Spixi/Pages/MiniApps/MiniAppPage.xaml.cs`, `CD` = `Spixi/Pages/Contacts/ContactDetails.xaml.cs`, `SC` =
`Spixi/Utils/SContacts.cs`, `HP` = `Spixi/Pages/Home/HomePage.xaml.cs`, `cd.html` = `src/shells/contact_details.html`
(read only: `src/**` is session `photo1b`'s area), `W` = `scripts/device/adb-walk.ps1`.

## 0 · Data finding first (item 2): files of a deleted history stay on disk
| What stays | Where (no account data) | Which path leaves it | Ours or legacy |
|---|---|---|---|
| **My Sent copies** of the photos and files I sent in that chat | `<spixiUserFolder>/Sent/<uid><ext>` (Android `files/Documents/Spixi/Sent/`, Windows `%USERPROFILE%\Documents\Spixi\Sent\`) | chat info › Delete history: `CD.onRemoveHistory` (`CD:1290-1322`) does NOT call `SContacts.scheduleSentSweep()`. Its twin `SC.removeHistory` (`SC:618-645`, the chats-list path) does (`SC:631`), so do `removeContact` (`SC:177`) and `leaveGroup` (`SC:120`). The copies stay until a LATER delete on another path runs the sweep (it deletes every Sent copy that no history names). | **OURS** (S9 #46 r1 m-3 added the sweep to three of the four delete paths; the gate's lens: introduced → fix). ⚠ LIMIT after the fix (#46 r1 S m-3, recorded, not changed): a Sent copy YOUNGER than `SentSweepMinAgeSeconds` (600 s, `SC:383-386`) is skipped and no later pass is scheduled for it — it stays until a later delete runs the sweep |
| **Received files** that were downloaded | `TransferManager.downloadsPath` = `<spixiUserFolder>/Downloads/` (`Spixi/Data/TransferManager.cs:355`) | chat info › Delete history never deletes them (no "media" choice on that sheet). The chats-list sheet has the box "Delete media & files" (CH3, `HP:6936-6943`, `HP:7004-7032`); without the tick they stay too. Account › Downloads lists every file of the folder (`SettingsPage.xaml.cs:2070-2079`), so they stay visible THERE on every platform. | a choice of the redesign (CH3): the user's downloads are kept unless the user ticks the box. Not changed here; the chat-info sheet has no box (a shell change: Fix batch 4, or as is) → question Q-2 |
| the kept thumbnails / waveforms (Android) | the photo1a store | both paths call `ChatMediaStore.deleteChat` (`CD:1299`, `SC:632`) | — (already gone) |

Both platforms behave the same for disk: the difference Damir saw (WALK #1540, the remark on row SW-S5-ROTATE) is in what
chat info SHOWS, not in what is on disk.

## 1 · Item 2 — "Delete history" on Windows: chat info still shows the media and the files
| Step | What happens | file:line |
|---|---|---|
| open | the shell asks ONCE at boot: `bridge.send('ixian:sharedItems')` | `cd.html:1443-1446` |
| scan | C# scans the history off the UI thread and answers ONE push `setSharedItems(json)` | `CD:628-650`, `Spixi/Utils/SharedItems.cs:333` |
| show | the shell keeps the list in `state.sharedItems`; an EMPTY list → no shared section (`chat-info.js:719`), the "See all" cover closes (`cd.html:1010`) | `cd.html:1355-1363` |
| delete | `ixian:removehistory` → native confirm → `onRemoveHistory`: Core deletes the history, the local stores are cleared, the push `removeHistoryResult(addr, "ok")`, the open chat page reloads, a native alert | `CD:581-590`, `CD:1290-1322` |
| the shell on `removeHistoryResult` | forgets the per-conversation storage keys only; `state.sharedItems` is NOT touched | `cd.html:1264-1267` |
| result | nothing asks for the items again and nothing pushes them: the open chat-info page shows the media and files of the deleted history until a NEW `ContactDetails` is made (a re-open) | — |

- **Why Windows:** on the desktop chat info is a pane BESIDE the open chat (`HP:2147-2153`, `"chatinfo"` column 2). After
  the delete the pane stays open in front of the user, so the stale list stays visible. A re-open makes a new
  `ContactDetails` (`HP:2151-2166`), whose boot scan finds nothing.
- **Why the phone looked right:** not proven on the phone. The code path is the same; the phone's chat info is a full page
  that is made new on each open (`SingleChatPage.xaml.cs:1264`, `:1277`), and the row's own steps turned the phone (a
  layout change can re-host the page). The fix does not depend on it: it pushes the empty list on every platform.
- **Second path, the same gap:** the chats-list row menu › Delete chat (`HP:7004-7032`) on Windows while that contact's
  chat-info pane is open: the pane is not told either.

**Fix (C# only; no `src/**`, no new verb, no new push name):** after a SUCCESSFUL delete, the page re-runs its own scan
off the UI thread and pushes `setSharedItems` again (the existing push; the scan of an empty history is `[]`). A scan
generation makes a late result of an OLDER scan (the boot scan) unable to land after the new one. `CD.onRemoveHistory`
uses `SC.removeHistory` (one body: it adds the Sent sweep, row 0). The chats-list path tells an open chat-info page of
that contact to re-scan. **Switch: none** — a hole-closing fix (#1321: deleted data stays visible / on disk; #1478 adds
no flag duty): the old path is the stale view. Packet P85, one gate row.

## 2 · Item 1 — a mini-app action before `ixian:onload`
| Step | What happens | file:line |
|---|---|---|
| the verb | `ixian:action<text>` / `xa:<base64>` → `handleAction(text)` on the UI thread, for every navigation the mini app makes | `MAP:222-237` |
| the handler | `miniAppActionHandler` is set only in `onLoad` (the `ixian:onload` verb) | `MAP:40`, `MAP:448-455` |
| before onload | `jsonResult = DeserializeObject(action)`, then `miniAppActionHandler.processAction(…)` on a null field → `NullReferenceException` | `MAP:261-267` |
| the catch | `Logging.error("Exception while processing Mini App action '{0}': {1}", action, e)` — the WHOLE action text and the whole exception (message + stack) go into the log | `MAP:405-407` |
| then | `sendActionRejected(c, id, e.Message)` (to the same mini app) and a native alert that shows the action text | `MAP:408-412` |
| the response catch | `Logging.error("Exception occured in handleActionPageResponse …: " + e)` — the exception of the POST to the mini-app-supplied `responseUrl` (its text can name that URL) | `MAP:391-394` |

- **Who sees the log:** the Developer page shows it and shares it with one tap (`#1744 (4)`). A mini app's action text can
  hold anything (a long string, a secret-like value, control characters that break log lines).
- **Legacy (at the fork point `0e85a4b8`: the same three lines and the null field; P61 (6) recorded them):** the catch
  line, the alert with the action text, `e.Message` to the app, the response catch line. Damir ruled the log part fixed
  (#1744 (4)); the alert and `e.Message` (both to the same mini app / the user's screen, not the log) stay legacy, recorded
  in P84, not changed.

**Fix:** (1) a guard at the top of `handleAction`: no handler yet → the action is refused as "not ready": one fixed-word
line with the command NAME only (a fixed list of the eleven `MiniAppCommands` names, else `unknown`), the existing
`sendActionRejected(c, id, "not ready")` reply (it answers only `getStorage` / `setStorage` / `sendPayment`), no dialog,
no exception, no call into the handler or the storage. (2) both catches log `<fixed words> (<name>, <exception type
name>)` — never the action text, an argument, `e.Message` or `e.ToString()`. **Switch: none** — hole-closing (#1321: a
log leak; the old path is the leak). Packet P84, one gate row.

## 3 · Item 3 — the walk step `downloads` gives "no data"
- `W` step `downloads` needs `taps.accountDownloads` and `screens.downloads` (`W:855`); both are absent (#1674 ③), so
  every rep is skipped with the gap (`W:851-874`). The render of the built settings shell at the phone's CSS viewport
  (384 × 853, DPR 2.8125) puts the Downloads row at CSS y 1192–1248 inside the hub's scroller, below the bottom bar
  (CSS y ≈ 774): one tap from the top cannot reach it (#1674 ③).
- **Fix (scripts only):** after the Account tab's gates, ONE fixed swipe from the map (`swipes.accountDownloads`, a fling
  that ends at the bottom of the hub, so the end position does not depend on the fling's speed), a settle, then a
  screen check of the scrolled hub (`screens.accountScrolled`; its PNG deleted in a `finally`, never kept) BEFORE the
  one tap. A failed check sends no tap (no data, the app restarted and proven). No typed input, no new verb, no new
  entry (#1521, #1522 ②). The four keys stay absent until the operator block's calibrate.
- **Note on #1666 ④ ("no screenshot on the Account screen"):** #1739 (3) (Damir) asks for a screen check of the
  scrolled hub. The check is a screenshot of the Account hub for its probes only: deleted at once, never kept (the
  rule's aim, "no Account data in files", holds). The calibrate keeps its picture of the scrolled hub (as it keeps
  cal-17 of the Downloads list) until the keys are filled. Recorded in the batch's DECISIONS row.

## 4 · Item 4 — the walk step `history` on a named dev-seed chat
- `W:1689-1720` opens seed chat `k + 4` by list position (`Get-Seed`, from `walk.local.json`), swipes `historyOlder`
  until 3 page requests are counted or `historyMaxSwipes`. Seed 56 (the photo chat) has 100 messages: ONE older page
  (#1742 (2), the research § 4); no step reaches it (`scroll-photos` asks for no page).
- **Fix (scripts only):** an opt-in parameter (`-HistorySeed <dev-seed index>`), the gates of `open-seed`: the address is
  `Get-DevSeedAddress` (derived, never read, never typed); a PROVEN restart before each rep (each rep starts at the
  newest page in a new process) or a halt; the chat check and at least one page request ("a present chat with rows")
  else no data. Its rows have their own step name; without the option `history` and its rows are unchanged.
