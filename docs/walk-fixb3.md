# Walk sheet — Fix batch 3 (`work/fixb3`)

Artifact: "Spixi Fix batch 3 — walk rows" (https://claude.ai/artifact/TccAjSLNWykyGxctK4Yvv9). Two parts; each part has its own count and "Copy results". The walk sends no IXI and
approves no mini-app action. ★ L149: copy the data folder first (rows W-1, W-2, A-1 delete a chat history).

## Set-up
- **Copy the data first.** Windows: close Spixi, then
  `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-fixb3"`. Android: Account › Backup.
- **Use dev-seed chats only** (Account › About › the dev card: "Seed 50 · heavy" makes Seed 54 documents, Seed 56 photos).
- **The test mini app** (it never sends `ixian:onload`, so each action it sends is "before onload"). PowerShell, from the repo:
  ```powershell
  cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; $d = "$env:TEMP\fixb3walk"; Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force $d | Out-Null
  cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; Copy-Item -Recurse "docs\walk-safety-app\app" "$env:TEMP\fixb3walk\app"; Copy-Item "docs\walk-safety-app\appinfo-good.spixi" "$env:TEMP\fixb3walk\appinfo.spixi"; Copy-Item "Spixi\Resources\Raw\html\img\flags\us.png" "$env:TEMP\fixb3walk\icon.png"
  cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; tar.exe -a -cf "$env:USERPROFILE\Desktop\fixb3-walk-app.zip" -C "$env:TEMP\fixb3walk" appinfo.spixi icon.png app
  ```
  For Android: copy `fixb3-walk-app.zip` to the phone's Download folder.
  ⚠ **A re-walk after 2026-11-22:** the `app` folder of `docs/walk-safety-app` now sends `ixian:onload`, so the block
  above makes an app that sends it. Build the zip with set-up (5b) of `docs/walk-safety.md` instead (the same file name;
  it sets the kit switch `window.SAFETY_WALK_NO_ONLOAD = true` in `config.js`). The switch stays in the kit for this
  sheet (#1965 (4), `docsb` Q-4 (c)).
- Windows: close Visual Studio, delete `Spixi\bin` and `Spixi\obj`, then build and start with Ctrl+F5 (#1844 (1); never `dotnet build`, #663). Android: the Release
  dev build (no html changed in this batch; a plain build is enough).

## Part 1 · Windows
| ID | Steps | Pass when | P/F/N/A | Note |
|---|---|---|---|---|
| W-BUILD | 1) Mini apps › Add › `fixb3-walk-app.zip` › Install (if "Safety walk test" is already installed: remove it first — the copy of the Safety walk may be patched to send onload). 2) Open "Safety walk test". 3) Tap "2 · Read inside". 4) Account › Developer › the log. | The log has `MiniAppPage: an action before ixian:onload was refused (getStorage)` (only this build writes it). No error dialog opened. | | P84 |
| W-1 | Copy the data first. 1) Open the Seed 56 chat (photos). 2) Open chat info (the pane beside the chat). Look at Media. 3) Delete history › confirm (OK in the system dialog). 4) Look at chat info while it stays open. 5) Close chat info and open it again. 6) The same with the Seed 54 chat (documents) and Files. | 4 and 5: no Media and no Files section (and no "See all" cover) for that chat. The chat shows no messages. | | P85 |
| W-2 | 1) Open the Seed 55 chat (or another seed chat with files) and its chat info beside it. 2) In the chats list, right-click that chat › Delete chat › history only (no "Delete media & files" tick) › confirm. | The open chat-info pane drops its Media / Files at once. | | P85 · the chats-list path |
| W-3 | 1) In "Safety walk test" tap 1, 2, 3, 4 and 8, one after the other. 2) Go back, open the app again, tap 2. 3) Account › Developer › the log. | No error dialog; Spixi keeps working. The log lines say only `refused (setStorage)` / `refused (getStorage)` — never "walk", "inside", "outside" or any text of the app. | | P84 |

## Part 2 · Android
| ID | Steps | Pass when | P/F/N/A | Note |
|---|---|---|---|---|
| A-BUILD | 1) Mini apps › Add › `fixb3-walk-app.zip` from Download › Install (if "Safety walk test" is already installed: remove it first — the copy of the Safety walk may be patched to send onload). 2) Open it, tap 2. 3) Account › Developer › the log. | The log has `MiniAppPage: an action before ixian:onload was refused (getStorage)`. No error dialog. | | P84 |
| A-1 | Back up first. 1) Seed 56 chat › chat info: look at Media. 2) Delete history › OK. 3) Look at chat info, then close it and open it again. | No Media / Files section for that chat (as before this batch: it must still pass). | | P85 |

## After the walk
Paste each part's "Copy results" text in the main chat. A fail: write what you saw in the note.
