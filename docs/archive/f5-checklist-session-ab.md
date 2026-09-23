# F5 checklist — Session AB (2026-09-19, addendum 2026-09-22): the owed loop over #896–#900 · the bubble gap + the tail · "show older" after deletes

Rows: DECISIONS **#902** (the tab sweep) · **#903** (the reused tx detail) · **#904** (gap + tail) ·
**#905** (the menu, re-verified) · **#906** (privacy vs the code · the pins) · **#907** (your report the same evening: "Show older" on every open after deleting messages).
**Walk sheet: `docs/archive/walk-artifact-session-ab.html`** (walked 2026-09-22 — `docs/walk-session-ab-results.md`) — 17 rows, P/F/N + notes, Copy results at the top.
Renders: `docs/sheets/session-ab/` (`tail-sheet-light.png`, `tail-sheet-dark.png` first).

★ **C# CHANGED IN FOUR FILES — this needs a build, and the build is also the COMPILE CHECK.** Nothing
in the workshop compiles C#; `cs-syntax-check` (138 clean) is a parse. `HomePage.xaml.cs`
(`onTransaction(…, fromConversation)`, the staging legs, the rating/probe gate) · `WalletSentPage.xaml.cs`
(`txLock`, the pool hop, `showTransaction`, `paneHosted`, `shownTransaction`) · `SingleChatPage.xaml.cs`
(one argument, and #907's `loadMessages` window) · `SpixiContentPage.cs` (`volatile pageLoaded` + the posted re-drain in `sendMessage` —
the BASE class). **If it does not build, send me the first error: that is mine, not your setup.**

**Suite, one environment (container, no `Ixian-Core` sibling), on snapshot copies of the tree:**

| | result |
|---|---|
| BEFORE (HEAD `ed392326`) | `BASELINE OK — 4756 pass / the 2 KNOWN` |
| AFTER (this batch) | `BASELINE OK — 4768 pass / the same 2 KNOWN` |
| AFTER, with an `Ixian-Core` sibling beside the checkout (= your machine) | `BASELINE OK — **4770** pass / the same 2 KNOWN` |

+12 = the twelve new pins (seven from the loop and the bubbles, five for #907). ★ **The "+2 on your machine" is now explained, by diffing two logs:** with `Ixian-Core` checked out beside the repo, the two M1 (#448) hold-out gates RUN instead of being skipped. I cloned Core at `097341a` next to the container tree for #907 and the count moved by exactly those two. **Expect 4770 locally.**
Compare the delta, not the absolute.

## 1 · The paste (PowerShell, repo root)

```powershell
npm.cmd i --no-save jsdom eslint globals
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/build-shells.mjs --check
node scripts/build-legal-docs.mjs --check
node scripts/smoke-test.mjs
Remove-Item -Recurse -Force _to_delete
```

Then **build**: Windows = **F5 in Visual Studio, never `dotnet build`** (#663). Android =
`dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug` then the same with `-t:Run`.

For a FAIR startup timing (#912) use a Release build — keep the flag, it stays "Spixi Dev" beside your
real Spixi: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true -t:Run`
(if Android refuses to install over the Debug one — different signing — uninstall Spixi Dev first; only
the dev test account goes). If a deploy dies with `ADB1000` / "read past the end of the stream": `adb
kill-server; adb start-server`, retry; then a full install:
`-t:Run -p:EmbedAssembliesIntoApk=true -p:AndroidFastDeploymentType=""`.

## 1b · #912 addendum (2026-09-22) — walked AB.1–AB.17 already; these four are NEW and need ONE more build

| # | where | what |
|---|---|---|
| AB2.1 | Windows | F5 → `ixian.log` has five `[STARTDIAG] … at +N ms` lines (logger up · node constructed · wallet decrypted · root page set · home shell loaded) and `copyResources: N copied, M unchanged`. **Second launch: `0 copied, 51 unchanged`.** Paste the five STARTDIAG lines from a cold launch — they are the startup answer |
| AB2.2 | Android | build + run; the app opens; logcat/`ixian.log` shows the same five lines. Paste them too (Debug AND, if you make one, Release) |
| AB2.3 | Android | `adb shell dumpsys backup | grep -i spixi` is optional; the real check is a restore on a second phone — OWED, not today |
| AB2.4 | iOS | nothing to do now: `AppDelegate.excludeHistoryFromBackup` is UNCOMPILED until the next iOS build — that build is its compile check |

## 2 · The walk (details + expected results are on the sheet)

| # | where | what |
|---|---|---|
| AB.1 | desktop | ★ hide the wallet → open tx A → **Show amounts** → click tx B: **B is MASKED, and the eye is back** |
| AB.2 | desktop | same, but wait on A (a PENDING tx): its status updates and A **stays revealed** |
| AB.3 | desktop | click through 8–10 transactions fast: every card matches its highlighted row; no fade, no flash |
| AB.4 | desktop | on tx B → "View in explorer": the explorer opens **B** |
| AB.5 | desktop | ★ Wallet tab → Account → Contacts → a contact → **Message** → close Contacts → tap a tx → back: **empty pane, not the chat** |
| AB.6 | desktop | in a chat, a payment card → **Details** → back: you are **back in that chat** |
| AB.7 | desktop | tap a chat row and IMMEDIATELY tap Wallet: no conversation appears on the wallet tab |
| AB.8 | desktop | leave Chats with a conversation open → Wallet: **no "rate the app" prompt** over the wallet |
| AB.9 | desktop | type a few characters in a chat and tap Wallet within half a second → back to Chats → reopen it: **is the draft complete?** (either answer is a result) |
| AB.10 | phone | Wallet → a transaction: the detail opens with its old soft reveal, **no spinner flash**; "Show amounts" works |
| AB.11 | both | ★ open `tail-sheet-light.png` / `-dark.png`: **7×11 (shipped) or 6×10?** the note is the answer |
| AB.12 | both | a run of 3+ messages from one sender: the gap reads as **2 px**, the tail is whole (no cut-off edge), both sides |
| AB.13 | phone | a sticker (emoji-only) and a media tile still have **no tail**; the selection tick still lines up |
| AB.14 | — | read `docs/legal/proposed-amendments-2026-09-19.md`: accept / reword / reject each of the two |
| AB.15 | both | ★ open the chat from your screenshot (the one you deleted messages in): it opens with a **full window of messages**, no five-row cutoff; "Show older" appears only if there really is older history, and pressing it loads more |
| AB.17 | both | delete a CALL card → reopen the chat: does it come back as "No answer"? (expected YES — Core stores a deleted row as an empty row, and an empty call row IS a missed call; BE row CORE-9. Write what you see) |
| AB.16 | both | a chat with FEWER than 50 messages: **no** "Show older" pill at all, and the messages sit against the composer |

## 3 · Not on the sheet, still open

AA.8 (the call with no UI — did not reproduce; the diagnostic stays armed) · the Z.10 chooser copy pick ·
S1 timed (#872 ②) · AND-40 · the #890 dials · an **iPhone walk** (iOS-43 / iOS-44 / iOS-55 were found
built-and-never-walked, #905) · the translator pass.
