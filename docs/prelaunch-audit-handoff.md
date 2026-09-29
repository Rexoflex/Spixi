# Spixi pre-launch engineering audit — handoff

Prepared 2026-09-29 for pasting into a new work session. It summarises the audit run on 2026-09-27/28, every finding with its current status, the decisions Damir made, what was changed on disk, and what is still open.

Tracker artifact (live statuses and notes): https://claude.ai/artifact/G7TEww65jyCJrThS7q5K1n

**Reviewed 2026-09-29 against the tree (DECISIONS #1054).** Corrections are applied in place and marked *(review)*. What was checked, what was not, and the release blockers this audit did not list are in section 9. This doc does not replace `docs/release-readiness.md`; §1 of that doc is still the release-blocker list, and section 4 below now points to it.

---

## 0. How to use this in a new session

- Treat this as context, not as a task list to run blindly. Each finding has a Location; **re-read the code before changing it**, because line numbers drift.
- Anything owned by **Core** lives in the shared Ixian-Core repo, which also powers the DLT node, S2 and QuIXI. Change Core only with the same care as section 6, and always as a separate, reviewable commit for the BE engineer.
- Do not start the R-02 refactor before the freeze ends.
- Items marked **out of scope** or **decided against** in section 7 should not be reopened without Damir.

---

## 1. Scope and method

**Brief (Damir):** a senior-engineer audit before launch. Map the architecture, find real risks, rank them, and separate confirmed problems from ones that need investigation. No flood of minor findings. Phase 1 was read-only; fixes were not made in the audit itself except where noted in section 6.

**Covered:**

- Batch 1: the inbound message pipeline end to end, including Ixian-Core (`CoreStreamProcessor`, `Friend`, `FriendList`, `MessageCrypto`, `NetworkRemoteEndpoint`).
- File transfer, mini-apps, avatars, lifecycle (resume and sleep), UI update loops.
- UI, colour and UX review across the shells, both themes, with rendered comparisons.
- docs.ixian.io, for the protocol claims (the StreamMessage envelope, spixi2 authenticity).

**Not covered yet:**

- **Batch 2:** lifecycle and memory with a real device capture (`dumpsys meminfo` over 30+ minutes on Android, and Instruments on iOS). This is what would prove or clear P-01 and P-02 as the cause of the Android kill after about 30 minutes.
- A full light-mode pass of the wallet sub-screens, settings sub-screens, contact details, launch/lock and sheets. Only the chat, the chat list, the wallet list, the account hub and the cards were reviewed in light mode.
- Two-node network tests. S-01 in particular needs one.

**Each finding lists:** severity (critical / high / medium / low), confidence (High means read in code and reasoned through; Medium means likely but platform or runtime behaviour is unverified), owner (Ours, Core, or both), and origin (introduced by the redesign, inherited from legacy, or mixed).

---

## 2. Architecture as found

- **Stack:** Spixi is a .NET MAUI C# host plus 18 self-contained HTML shells, each shown in its own WebView. The components are vanilla JS, and the bundle is inlined into each shell at build time.
- **JS → C# bridge:** cancelled `ixian:` navigations, sent through one serialized outbox (`src/bridge/native.js`). Handled in `SpixiContentPage.webViewNavigating` and `onNavigatingGlobal`.
- **C# → JS bridge:** `Utils.sendUiCommand` builds `executeUiCommand(cmd,'b64',…)` and runs it with `EvaluateJavaScriptAsync`. Commands are queued until the page has loaded (`SpixiContentPage.sendMessage` / `processMessageQueue`).
- **Loops:**
  - `Node.mainLoop` runs every 2.5 s.
  - `Node.updateUILoop` runs every 2 s on the thread pool (`Task.Run`), and calls `HomePage.OnUpdateUI` → `updateScreen`.
  - Changes are signalled through static flags (`UIHelpers.shouldRefreshContacts`, `shouldRefreshTransactions`).
- **Heavy files:** `SpixiContentPage.cs` (4,802 lines, 74 statics: overlay, preload, spare chat, lock, privacy shield), `HomePage.xaml.cs` (5,840 lines) and `SingleChatPage.xaml.cs` (4,264 lines).
- **Ixian-Core:** a shared project at `../Ixian-Core`, pinned at `097341a` (xcore-0.9.8k, 2026-08-03). Spixi builds against whatever is checked out there.
- **Design tokens** in `src/styles/tokens.css` are layered: primitives → keys → semantic tokens. The dark neutral keys now map to the `ink-*` ramp.
- **Tests:** `Spixi-UnitTests` has only localization tests. `scripts/smoke-test.mjs` has about 36k lines of mostly source-text pins. Core's `UnitTests/` does not cover `NetworkRemoteEndpoint` or `CoreStreamProcessor`.

---

## 3. Findings

The status here matches the tracker as of 2026-09-29. Anything not marked otherwise is **open**.

### 3.1 Security

**S-01 · CRITICAL · Core · confidence Medium · a failed decryption does not stop processing** (CORE-15)

- **Location:** `Ixian-Core/Streaming/CoreStreamProcessor.cs` → `receiveData`, the block after `// decrypt the message if necessary`.
- **Problem:** when `message.decrypt()` fails, only a `FriendType.Temporary` friend gets a retry and a `return null`. For any other contact, execution falls through to `new SpixiMessage(message.data)`. The "must be encrypted" guard only fires for `encryptionType == none`. So a message that claims spixi2, carries a plain SpixiMessage and names one of your contacts as `sender` is parsed and shown.
- **Why it matters:** for spixi2, the AEAD key is the only proof of the sender; docs.ixian.io says the signature is not used. `NetworkProtocol` passes `s2data` from any endpoint straight to `receiveData`, and push replay uses the same path. Upstream master has the same code.
- **Fix:** after the Temporary retry, `return null` (with a log line) on every failed decryption. Add a Core unit test that feeds in a spixi2 message with a bad payload.
- **Before patching:** confirm with a two-node test that a forged message actually shows. Treat it as a **blocker** until that test says otherwise. It is **not** patched locally, deliberately: it could drop legitimate messages in some key-exchange cases.

**S-02 · CRITICAL · ours (inherited) · a peer's file name is used directly in the download path** (known S16 residual)

- **Location:** `Spixi/Data/TransferManager.cs` → `acceptFile`, where `Path.Combine(downloadsPath, transfer.fileName + "." + uid + ".ixipart")` is built, and the completion step `Path.Combine(downloadsPath, transfer.fileName)` → `File.Move`.
- **Problem:** `..` segments or a rooted name let the file land outside Downloads. On Windows that could be the Startup folder. On Android, the FileProvider publishes the whole `files/` tree (H-10).
- **Fix:** sanitize the name once, when the header arrives: `Path.GetFileName`, strip invalid characters, refuse empty or dot-only names. Then route every composed path through the existing `resolveDownloadPath`. In the same change, narrow `provider_paths.xml` to the Downloads folder.
- *(review)* Verified: `TransferManager.cs:810` (the `.ixipart` path) and `:667` (the final path) use the raw `transfer.fileName`, which is read off the wire at `:77`; `resolveDownloadPath` guards only open and delete. The provider exposure is **wider** than stated: `provider_paths.xml` shares `files-path "."` (the whole `files/`) **and** `external-path "."` (the external-storage root), plus both caches. Narrow all of them.
- **Effort:** about 30 min.

**S-03 · HIGH · ours (introduced in C6) · tip amounts are whatever the sender claims**

- **Location:** `SingleChatPage.xaml.cs`, where the reaction push sums `tip:<amount>` tokens (C6), and `chat.html`, where `parseReactions` renders "Tipped N IXI".
- **Problem:** Core's `addReaction` accepts any `tip:` token up to 32 characters, with no link to a transaction. The app then shows the summed amount as a verified-looking green chip. That invites the "I tipped you by mistake, send it back" scam.
- **Fix:** for tips you received, show a count only ("Tipped ×3"). Show an amount only if it matches a transaction in your own activity store. Tips you sent can keep their amounts.
- **Effort:** about 2 h. The Core question is filed as CORE-17.

**S-04 · MEDIUM *(review: was HIGH)* · ours (inherited) · confidence Medium · a malformed mini-app bridge URL can crash the app**

- **Location:** `MiniAppPage.xaml.cs` → `onNavigating` (`ixian:protocolData`, `ixian:setStorageData`, `xa:`).
- **Problem:** `current_url.Substring(prefixLen, current_url.IndexOf('=') - prefixLen)` throws when the URL has no `=`. `Convert.FromBase64String` throws on bad input. There is no `try`, and this runs on the UI thread.
- *(review)* Verified in code. Severity lowered: only the installed mini app's own code builds these URLs; a remote peer cannot. The worst case is a mini app the user installed crashing Spixi — no data or funds are exposed. Still fix it before launch.
- **Fix:**
  - validate before slicing;
  - use `Convert.TryFromBase64String`;
  - wrap the handler body in a `try` that logs and drops the verb;
  - then sweep every other mini-app verb for the same pattern.
- **Effort:** about 1 h.

**S-05 · MEDIUM · Core · an unauthenticated S2 error message marks any contact offline** (CORE-16)

- **Location:** the `StreamMessageCode.error` branch of `receiveData`. It runs before decryption or any sender check.
- **Problem:** it removes the contact's presence entry, clears `relayNode` and sets `online = false`. It also dereferenced a null `friend`.
- **Status:** the null half is patched locally (section 6). Authenticating the sender stays with BE.

**S-06 · MEDIUM · ours (inherited) · accepting a file pre-allocates the size the peer declared**

- **Location:** `TransferManager.acceptFile` → `fileStream.SetLength((long)transfer.fileSize)`.
- **Problem:** a header claiming tens of GB fills the device's storage.
- **Fix:** cap the accepted size and show it on the card, check free space before accepting, and don't pre-allocate.
- **Effort:** about 1 h.

**S-07 · MEDIUM · ours · the welcome copy claims "Encrypted on your device"**

- **Problem:** chat history is not encrypted at rest (CORE-11).
- *(review)* Three strings carry the claim, not one: `slide1Copy` ("Encrypted on your device and opened only by…"), `aboutBody` ("Your messages are encrypted on your device…") and `secureNoticeText` ("Messages are sealed on your device…"). Each means "encrypted before it leaves your device", which is true, but reads as encryption at rest. Reword all three together, in all 12 locales. The Privacy Policy does not claim encryption at rest (§3 says history lives in local storage).
- **Fix:** reword to encryption in transit, e.g. "End-to-end encrypted: only the person you send to can read it."
- **Effort:** about 15 min, plus translations.

### 3.2 Performance and memory

**P-01 · HIGH · ours (inherited) · avatars are decoded at full size and never freed**

- **Location:** `StreamProcessor.receiveData`, the `avatar` case → `Platforms/*/SFilePicker.ResizeImage(data,128,128,100)`, for any payload under 500 KB.
- **Problem:** on Android, `BitmapFactory.DecodeByteArray` runs with no bounds check, and the original, cropped and scaled bitmaps are never recycled. iOS uses UIImage and Windows uses System.Drawing, with the same lack of a cap.
- **Why it matters:** a remote peer can force an out-of-memory crash. It's also the **lead suspect for the Android kill after about 30 minutes**; that isn't proven and needs the batch 2 capture.
- **Fix:**
  - decode the bounds first (`inJustDecodeBounds`);
  - enforce a pixel cap;
  - use `inSampleSize` so the decode lands near 256 px;
  - dispose all three bitmaps;
  - apply the same cap on every platform.
- **Effort:** about 2 h.

**P-02 · MEDIUM · Core and ours · message lists are cached per contact and freed only on a low-memory signal** (overlaps CORE-8)

- **Problem:** `Friend.getMessages(channel, n)` replaces the cached list whenever `n != 100`. Load-more and the widening read leave large windows in memory after the chat closes. The chat-list flush calls `getMessages` for every contact whose last message is local. `freeMemory()` only runs from `onLowMemory`.
- **Fix:** trim the cache back to the default window when a chat closes, and read the last message by id in the flush.
- **Effort:** about 3 h.

**P-03 · MEDIUM · ours · the chat list and wallet rebuild completely on every small change**

- **Problem:** every message, receipt, reaction or typing event sets `shouldRefreshContacts` (typing sets it twice). The next tick rebuilds the whole list and sends one `EvaluateJavaScriptAsync` per row. The wallet re-sends its whole history.
- **Fix:**
  - send per-row updates for status, typing and reactions;
  - batch the full flush into one push (like the #801 transport);
  - diff wallet activity instead of re-sending it.
- **Effort:** about 1 day. Animating row reorder should wait until this is done.

**P-04 · MEDIUM · ours (introduced in X1) · each row carries the avatar as a base64 data URI**

- **Location:** `SingleChatPage.insertMessage` and `HomePage.getFriendMessageHelper` → `Utils.imageToDataUri` per row.
- **Fix:** push each avatar once per document (`setAvatarFor(address, dataUri)`) and have rows reference it by address.
- **Effort:** about 3 h.

### 3.3 Correctness and concurrency

**C-06 · HIGH · Core · OBSERVED · parallel sends corrupt a connection's message-ID sets** (CORE-14)

- **What happened:** Damir hit this twice in a Visual Studio Debug run.
- **Call stack:** `CoreStreamProcessor.fetchFriendsPresence` (`Task.Run` per friend, about line 3042) → `StreamClientManager.sendToClient` → `NetworkClientManagerBase.sendToClient` → `RemoteEndpoint.sendData` → `TryCheckDuplicateMessage`.
- **Cause:** `recentIds` / `recentIdsSet` and `requestedIds` / `requestedIdsSet` in `Network/NetworkRemoteEndpoint.cs` have no lock. They are written from any sending thread and read by `parseLoop`.
- **Origin:** added in Core commit `f279c7a` (2026-04-05, network stack rework). **It is not caused by the redesign.** Legacy 0.9.22 builds against the same Core and has the same race. It shows up in Debug because the exception is thrown inside a background task, which Visual Studio breaks on.
- **Why it still matters:** once corrupted, that connection's duplicate and "was this reply requested" checks misbehave.
- **Status:** **patched locally** (section 6).

**C-01 · MEDIUM · ours · confidence Medium · MAUI navigation state is read off the UI thread**

- **Problem:** `HomePage.OnUpdateUI` runs on a pool thread and reads `Navigation.NavigationStack`. `Utils.getChatPage` walks the same stack from network threads.
- **Effect:** rare "collection was modified" exceptions. They are caught, so the symptom is an update that silently doesn't happen.
- **Fix:**
  - keep a thread-safe registry of live chat pages;
  - dispatch the UI tick to the main thread, or snapshot the stack there.
- **Effort:** about 4 h.

**C-02 · MEDIUM · Core and ours · typing timers share one List across threads**

- **Problem:** each timer callback removes the *first* timer in the list, not its own (`_typingTimers.Remove(_typingTimers.FirstOrDefault())`). An exception inside a timer callback ends the process.
- **Fix:** one timer per friend, reset with `Change()`, stored in a `ConcurrentDictionary`, and the callback wrapped in a `try`.
- **Effort:** about 1 h.

**C-03 · MEDIUM · ours · confidence Medium · resume can block the UI thread with no time limit**

- **Location:** `App.xaml.cs`, in the resume path and `EnsureNodeRunning`: `while (status == stopping) Thread.Sleep(50)`, followed by `throw new Exception("Error starting Node")`. `OnSleep` also flushes local storage synchronously.
- **Fix:** move the restart to a background task with a bounded wait, and show a recoverable error instead of throwing.
- **Effort:** about 3 h.

**C-04 · MEDIUM · ours (inherited) · mini-app network calls block, and downloads have no size limit**

- **Problem:** the mini-app code calls `PostAsync(...).Result` and `GetByteArrayAsync(...).Result`, and names files from the URL.
- **Fix:** use `await`, add a 15–30 s timeout, stream downloads to disk with a cap, and name temp files with a GUID.
- **Effort:** about 2 h.

**C-05 · LOW · ours (inherited) · every reaction raises the unread count and writes to disk**

- **Location:** `StreamProcessor.receiveData`, the `msgReaction` case.
- **Fix:** only count reactions to your own messages, or don't count them at all. Group receipts do *not* take this path; I checked this in Core.
- **Effort:** about 30 min.

### 3.4 UI and UX defects

Damir has excluded U-01, U-02, U-03 and U-05 from the polish round. Keep them tracked.

- **U-01 · medium:**
  - **Problem:** the wallet filter chips shrink to "A" / "S." / "R…" at widths of 361–450 px. `.c-chip{min-width:0}` (#841) stops the row from overflowing, so the collapse measure in `wallet-shell.js fit()` (#278) never triggers.
  - **Fix:** `.c-wallet-filters .c-chip { flex: none; }` plus a smoke pin at 390 px.
- **U-02 · low:** 12-hour times show a leading zero ("01:08 PM"). In `components/timestamp.js`, change `hour:'2-digit'` to `'numeric'`.
    - *(review)* ⚠ `timeOpts()` (`timestamp.js:30`) serves every locale. `'numeric'` everywhere turns 24-hour "09:05" into "9:05" in some locales (de-DE). Use `'numeric'` only when the resolved cycle is 12-hour (`h12`/`h11`, from the `data-hour-cycle` carrier or `Intl.DateTimeFormat().resolvedOptions().hourCycle`).
- **U-03 · low:** two text colours are just under AA. The sent-bubble timestamp (opacity .7) measures 3.3–3.7:1, and the "Failed" badge 4.44:1.
- **U-04 · low · FIXED (#1008):** transaction status badges truncate to "Pen…" / "Fail…" in the desktop list pane.
- **U-05 · low:** group excerpts in the chat list show the sender as "Han … :" or "A.:".
- **U-06 · low (a design call):** card and icon styles are inconsistent. The call card has a 2 px border while other cards have none, and the account hub uses coloured discs while contact details use monochrome glyphs.

### 3.5 Premium polish (D items)

- **D-01 · FIXED.** Dark mode mixed two blue-greys. Damir landed a neutral dark palette in a separate session:
  - canvas `#090A0D` (ink-1000), received bubble `#1A1C1F`;
  - hairline rgba(255,255,255,.07) plus a 5% top highlight.
  - It was verified from a Windows screenshot on 2026-09-28; the result reads cleanly. Optional tweak: drop the top highlight to 3% if it looks like a line on short bubbles.
- **D-02 · FIXED (#1003).** Sent cards used a 2 px blue stroke; they now use a tinted fill in both themes.
- **D-03 · FIXED (#1004, #1016).** Pending request amounts use the primary text colour; the status chip carries the state.
- **D-04 · open.**
  - **Gap:** motion is already tokenized (`--duration-*`, `--easing-standard`, about 130 uses), so the gap is haptics.
  - **Fix:** add one verb (`ixian:haptic:click|long|success`) that calls MAUI `HapticFeedback`, for send, payment confirmation, long-press and swipe end.
- **D-05 · FIXED (#1005).** File names keep their extension (`fillFileName`).
- **D-06 · open.** The dark chat canvas stacks a glow, a pattern and a dot grid. Keep one of them, and decide on a real device.
- **D-07 · FIXED (#1006).** Call cards were three stacked rows; now one compact row. Original spec:
  - **Target:** one row, about 64 px: an outcome-tinted medallion with a direction glyph, the title, a line with duration and time, and a round call-back button.
  - **Colour:** red only for missed calls, neutral for declined.
  - **Glyphs:** needs Tabler `phone-outgoing` and `phone-incoming`.
- **D-08 · DONE as decided (#1007, #1017).** The account hub.
  - **Kept as they are (Damir):** the rainbow icon discs, and the backup row where it is.
  - **Still worth doing if touched:** white cards on a grey ground in light mode, shorter subtitles, the address shown in the profile header.
- **D-09 · FIXED (#1002, #997, #1023, #1029).** Mist landed as `#ECEEF1`; Matrix was replaced by Contours; a doodle pattern was built and rejected. Original decision:
  - **Default:** the light chat canvas moves from blue-grey `#E4EAF3` to **Mist**, a near-neutral with a hint of cool; Damir's own mock sampled at about `#EEF1F8`.
  - **Brand gradient:** offered as a choice, not the default.
  - **Pattern:** no doodles. The existing "matrix" pattern should be replaced by a more premium pattern, with candidates shown to Damir before one is picked.
  - **Rest of the design:** the elevation shadow on bubbles stays.
- **D-10 · FIXED (#1001).** Placeholder avatar gradients, including the sender-name colours (1f).
  - **Palette:** option B ("Telegram-close, readable"): bright, light-topped vertical gradients in OKLCH, with white initials at about 2.6–3.3:1. That means relaxing the #364 "≥ 4.5:1" rule for avatars to the 3:1 large-text floor.
  - **Anchor 2:** replaced by the Y1 Sunflower `#E6B816 → #DC8400`, with `text-shadow: 0 1px 2px rgba(0,0,0,.3)` on its initials.
  - **Unchanged:** the same palette in both themes, and identity hashing (`identityIndex`), so nobody's colour family jumps.
  - **Sender names:** group sender-name colours should be re-derived from the new anchor hues, so a person's name and avatar read as the same colour.

Option B values (top → bottom, index 0–11):

| # | Name | Top | Bottom |
|---|---|---|---|
| 0 | red | `#FC797D` | `#D95029` |
| 1 | orange | `#F78445` | `#CB6300` |
| 2 | sunflower (replaces amber) | `#E6B816` | `#DC8400` |
| 3 | lime | `#97B72F` | `#439A15` |
| 4 | green | `#67C05E` | `#00A157` |
| 5 | teal | `#00C79C` | `#00A297` |
| 6 | cyan | `#00C2DA` | `#0096D0` |
| 7 | blue | `#2CB1FF` | `#3480EC` |
| 8 | violet | `#909CFF` | `#8A68E3` |
| 9 | purple | `#BB8DFA` | `#AE59C8` |
| 10 | pink | `#E57DCC` | `#CF4A8C` |
| 11 | rose | `#F778A0` | `#DA4959` |

The anchor order in `avatar.css` may differ from this table; map the anchors by hue, not by index. Replace the 22% white "specular" veil with a 1 px inner top highlight and a faint inner edge.

### 3.6 Release readiness

- **R-01 · HIGH · no automated test exercises C# behaviour** on the message, money or overlay paths. Start a small xUnit project for pure logic:
  - path sanitizing (S-02);
  - decrypt failure (S-01, in Core);
  - tip parsing (S-03);
  - bridge URL parsing (S-04).
- **R-02 · LOW · three files hold most of the state logic,** and about 40% of their lines are narrative comments. Leave it until after the freeze. When it starts, move the overlay state machine out first, behind tests.

---

## 4. Suggested fix order

1. **Before any external build:** S-02 (with the provider narrowing), S-04, S-03 (switch to a count display), S-07 (all three strings), S-06, U-02 (12-hour guard). All are ours and small.
1b. *(review)* **The one-line release blockers in `release-readiness.md` §1**, which this audit does not list — see section 9.
2. **Core blocker:** run the S-01 two-node test with BE, then ship the one-line fix.
3. **Stability:** P-01, then C-02, C-03, C-01 and C-04. Confirm P-01 and P-02 against the Android 30-minute kill with a batch 2 memory capture.
4. **Smoothness:** P-04, then P-03.
5. **Remaining polish** *(review: the 2026-09-28 round already landed D-02, D-03, D-05, D-07, D-08, D-09, D-10 and U-04)*: D-04 (haptics, no code exists yet) and D-06 (dark canvas layers, decide on a device).
6. **R-01:** start the xUnit project alongside steps 1–3.

---

## 5. Ixian-Core items (the BE ledger)

`docs/be-cutover-brief.md` tracks CORE-1 … CORE-17.

**Added by this audit:**

- CORE-14: the `sendData` race (observed).
- CORE-15: decrypt fall-through (a question and a blocker).
- CORE-16: error-message spoof.
- CORE-17: tip reactions have no transaction link (a decision).
- VN-1 / VN-2: voice-message questions for v1.1.

**Classified for local patching:**

| Item | Status |
|---|---|
| CORE-14 lock | **patched locally** |
| CORE-13 receipt from a removed contact (a `sender_friend` null guard) | **patched locally** |
| CORE-16, null half only | **patched locally** |
| Presence loop runs over a snapshot of `FriendList.friends` | **patched locally** (new; not a CORE number) |
| #962 accept-for-a-cancelled-request guard (earlier session) | already local |
| CORE-15, CORE-4, CORE-7 | small, but need testing or BE semantics first; not patched |
| CORE-8 and CORE-1, 2, 3, 5, 6, 9, 10, 11, 12, 17 | BE only (design, protocol or larger changes) |

`fetchAllFriendsPresences` and `fetchAllFriendsSectorNodes` loop over the friend list in the same unsafe way, but nothing calls them, so they were left alone.

---

## 6. Local changes made on disk (all uncommitted)

### Ixian-Core (working copy, pinned base `097341a`)

Use `git diff --ignore-cr-at-eol` to review. A plain diff lists whole files as changed because of Windows line endings.

| Change | File | Size |
|---|---|---|
| CORE-14: one private `idsLock` around `TryCheckDuplicateMessage`, `TryAddRequestedMessageId` and the `parseLoop` requested-ID check. Logging stays outside the lock. | `Network/NetworkRemoteEndpoint.cs` | +40 / −25 |
| #962: `if (friend == null)` guard on `acceptAdd` / `acceptAdd2` | `Streaming/CoreStreamProcessor.cs` | +16 |
| CORE-13: `if (sender_friend != null)` around `handleMsgReceived` in the invalid-group branch. The sibling `sendReceivedConfirmation` already returns early on null. | `Streaming/CoreStreamProcessor.cs` | +5 / −1 |
| CORE-16 null half: `if (friend == null) return null;` at the top of the `error` branch | `Streaming/CoreStreamProcessor.cs` | +5 |
| `fetchAllFriendsPresencesInSector` loops over a copy taken under `lock (FriendList.friends)` (the same pattern `FriendList` uses internally) | `Streaming/CoreStreamProcessor.cs` | +6 / −1 |

**Safety reasoning:**

- The locked sections are tiny and call nothing outside the lock, so they cannot deadlock. The cost is nanoseconds per send, even on busy DLT nodes.
- The changed members are private, so no other repo can depend on them.
- The other three changes turn an exception that was already caught into a clean `return`, with the same outcome.

**Not done yet:**

- Nothing is compiled; the shell on Damir's computer has no `dotnet`. Build in Visual Studio, and check in a Debug run that the CORE-14 break is gone.
- For BE: submit one PR with separate commits (use `git add -p` for `CoreStreamProcessor.cs`). Ask the BE engineer to run it on a DLT or S2 node before merging, and to confirm that DLT and S2 don't run `CoreStreamProcessor`; their repos weren't available to check.
- Don't lose these patches when Core is re-pinned.

### Spixi docs (uncommitted)

- **`docs/be-cutover-brief.md`:**
  - a new section with CORE-14 to CORE-17;
  - Blockers rows for CORE-14 and CORE-15;
  - the count note changed to 17, and the ledger line to CORE-1 … CORE-17;
  - a voice-messages section with VN-1 (a new message type) and VN-2 (the offline size limit).
  - Not yet recorded: that CORE-13, CORE-14 and the CORE-16 null half are now patched locally.
  - `release-readiness.md` still says 15 Core items. *(review: `be-cutover-brief.md:719` repeats that note; it is still true.)*
- **`docs/security-review-for-be-engineer.md`:** a CORE-15 entry.
- **`ARCHITECTURE.md`:** the §8 voice row is marked superseded and points to VN-1 and VN-2.

---

## 7. Decisions and answers (so they are not reopened)

- **Crash origin:** the Visual Studio `sendData` crash is a Core bug from April 2026. It is not from the redesign, and legacy has it too.
- **Android system font** (to use the Motorola or Samsung font like WhatsApp does):
  - **Decision:** not for v1.0.
  - **Why:** the WebView maps `system-ui` to Roboto. A possible route is reading `config_bodyFontFamily` and setting the WebView's `SansSerifFontFamily`, but it works differently per phone maker (Samsung FlipFont likely won't work), and the gain is small.
  - **If revisited:** a ten-minute check on the Motorola first; possibly v1.1.
- **Voice messages:**
  - **Decision:** out of scope for v1.0.
  - **v1.1 approach:** a new message type (not the file-transfer route), pending BE answers to VN-1 and VN-2.
  - **Mic slot:** stays hidden behind its flag.
  - **Background downloads:** downloads while the app is closed are not realistic on the current transfer design.
- **Transitions:**
  - **Yes:** a payment success moment and a crossfade on the delivery ticks.
  - **Later:** row reorder animation, only after P-03.
  - **No:** transitions between WebViews.
- **Dark mode** is done (D-01). Don't retune it further, apart from the optional 3% top highlight.
- **Account hub:** keep the rainbow discs and the current backup row placement.
- **Chat background pattern:** no doodles. The "Today" day chip is not to be changed.
- **Avatars:** option B plus the Sunflower anchor, and sender-name colours re-derived to match the avatars.

---

## 8. Open items and next steps

1. Build the Core patches, test them in a Debug run, and open the BE PR (section 6).
2. Update `be-cutover-brief.md` and `release-readiness.md` to show which Core items are patched locally.
3. Run the S-01 two-node test with the BE engineer.
4. Land the small security fixes that are ours: S-02, S-04, S-03, S-06, S-07.
5. Run the premium polish round prompt (the pattern section stops for Damir's pick).
6. Batch 2: a device memory capture to confirm the cause of the Android kill (P-01 / P-02).
7. Optional: a full light-mode audit of the screens not yet covered (section 1).
8. Start R-01 (the xUnit project).

---

## 9. Review 2026-09-29 (DECISIONS #1054)

**Verified in code (tree = PC HEAD `174133c4` + the uncommitted #1050–#1053 batch):**

| Finding | Result |
|---|---|
| S-01 | Not tested (needs two nodes). Keep as a blocker until the test says otherwise. |
| S-02 | Confirmed; provider exposure wider than stated (corrected above). |
| S-03 | Confirmed: `chat.html` renders the claimed tip total ("Tipped N IXI") with no transaction check. |
| S-04 | Confirmed; severity lowered to MEDIUM (corrected above). |
| S-07 | Confirmed as ambiguous wording, in three strings (corrected above). |
| P-01 | Confirmed: `SFilePicker.ResizeImage` (Android) calls `BitmapFactory.DecodeByteArray` with no bounds check. |
| U-01 | Plausible: no `flex: none` on the wallet chips. Not reproduced. |
| U-02 | Confirmed; the fix needs a 12-hour guard (corrected above). |
| D items, U-04 | Most already landed on 2026-09-28 (corrected above). |

**Not re-checked:** C-01…C-05, P-02…P-04, S-05, S-06, U-03, U-05, U-06, and the local Ixian-Core patches in section 6 (the Core folder was not connected in the review session).

**Release blockers this audit does not list.** They are tracked in `docs/release-readiness.md` §1 and the security docs; keep ONE list there and link to it from here:

- `Config.maxLogCount = 5` (`Spixi/Meta/Config.cs:101`), under its own "reduce to 1 before launch" marker.
- MAJOR #8: a `+` in the wallet password becomes a space (`HttpUtility.UrlDecode`); the naive fix locks out existing `+` passwords.
- #234: Cancel on the resume lock.
- The open rows in `docs/security-handover-gate.md` (the introduced-vs-inherited sweep, Session R: 65 introduced, 38 fixed, 27 open).
- The gates that have never run, and the freeze that has never been scheduled (`release-readiness.md` §1, §5).
