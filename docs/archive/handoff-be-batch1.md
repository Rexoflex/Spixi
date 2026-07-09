# Handoff — BE cutover batch 1 (fable, 2026-07-08/09) → batch 2 (Opus)

**Role.** Land the non-money C# rows of `docs/be-cutover-brief.md`, wiring existing C# data
to the already-built shells. Read, in order, before touching anything:
`docs/be-conventions.md` (the bridge rulebook — mimic existing shapes EXACTLY) →
`docs/fable-be-workorder.md` (🟢 do / 🟡 human review / 🔴 NEVER: money/signing/credentials)
→ `docs/be-cutover-brief.md` (per-row ask + file:line).

**The fence (unchanged, non-negotiable):** 🔴 rows (C1–C3, C6, C9, C10, W1–W8, tips,
anything signing/wallet-password) = HUMAN ONLY. One row = one tiny JS+C# co-change, new
args at the END of existing `sendUiCommand` signatures only, `// <row>` comment at each
touch, frozen verbs/pushes must keep working. Damir confirms each row via build+F5 before
the next (he authorized small same-theme batches later in the session).

## Landed this session (all additive; NO component/bundle change — `build-shells` only)

| Row | C# | JS | F5 status |
|---|---|---|---|
| **CH1** group/bot kind on `addChat` (arg 9: `"group"\|"bot"\|""`) | `HomePage.xaml.cs:1073` (updateChat) + `:1140/1157/1167` (loadChats, local `chat_kinds`/`mention_flags` maps — `FriendMessageHelper` is Ixian-Core, no field added) | `home.html` addChat → `chat.type` | ✅ verified (incl. bot-in-Groups amend — kind STRING superseded the first bool draft) |
| **S4** version | `SettingsPage.onLoad` → `setVersion` (mirrors `LaunchPage:33`) | `settings.html` handler + hub/About | ✅ |
| **S1** own address | `SettingsPage.onLoad` → `setAddress`, **PLAIN identity form** `getPrimaryAddress().ToString()` (= legacy share, `HomePage:322`) — NOT `ExtendedAddress(OfflineTag)` whose `_suffix` is payment-only (Damir caught `_5CQen`; wallet-receive keeps its extended form, W7 untouched) | `settings.html` → hub QR + copy chip | ✅ after fix |
| **S3** current language | `SettingsPage.onLoad` → `setLanguage` (read = `resetLanguage:229` shape) | `settings.html` → Language row current | ✅ |
| **C5** reaction own-flag | `SingleChatPage.updateReactions:1624` — NEW TRAILING arg: `;`-joined keys the local user reacted with; own address mirrors the like case (blind groups = `GroupChat.DeriveGroupAddress`); `key:count;` format untouched | `chat.html` addReactions/parseReactions — bridge own-keys authoritative, `myLikes` = optimistic/old-exe fallback | built, untested |
| **CH8** reaction excerpt | `StreamProcessor:472` msgReaction → new `UIHelpers.updateChatReaction` → new `HomePage.updateChatReaction:1099` pushes `addChatReaction(addr, nick, reactionKey, unixSecs)`; own echoes skipped (`isMyAddress`) | `home.html`: handler + **sticky `reactionExcerpts` map** (C# re-flushes within a tick and would clobber it; cleared on read / newer real message; drafts win) | 🟡 works but **nick missing** — see finding 2 |
| **CH5** @-mention flag on `addChat` (arg 10) | `HomePage.hasUnreadMention:869` — **TEXT HEURISTIC** (no mention protocol): unread incoming standard msgs in the current channel containing `@<nick>`, case-insensitive, cap 50, groups/bots only | `home.html` → `chat.mention` (indicator, Unread filter, badge); live-tick `unread=0` clears it | ✅ displays well |
| **C4** enriched `addCall` (args 5–7: outgoing / missed / durationSecs) | `SingleChatPage:1518-1525` — all derivable at the call site, VoIPManager untouched | `chat.html` addCall/upsertCall/buildCallRow — card side from `outgoing` (fixes #190 outgoing-call-on-left), duration from raw secs (legacy "(m:ss)" label parse = old-exe fallback), call-back nudge kept for missed AND no-answer (legacy parity, deliberate) | 🟡 works but see finding 3 |

**FE bugfixes (zero-C#, landed alongside):**
1. `chat.html updateMessage` — C#'s `message.sent` (DELIVERY flag, xaml:1646) was misread
   as direction and **overwrote the row side on every status tick** → own group messages
   flipped to received while delivery lagged (Damir screenshot). Now: existing rows keep
   their `addMe`/`addThem` side; only a robustness-create of an unseen row guesses. ✅ verified.
2. S1 address form fix above.

## Damir findings for batch 2 (fold into be-cutover-brief / DECISIONS per the ritual — do NOT silently fix)

1. **[SPEC — chat composer] @-mention autocomplete.** Typing `@` anywhere in the composer
   should pop an anchored member picker (quick select → inserts `@Nick`). FE-ONLY, zero-C#:
   the roster already flows via `ixian:loadContacts` → `groupRoster` (#206). Independent of
   reply (#25, §8 BE-gated — needs a per-message reference); they share identity data only.
   End-state BE row (later): structured mention payload replacing the CH5 text heuristic.
2. **[BUG — CH8] Group reaction shows glyph + "Reacted" with NO nick.** `HomePage.
   updateChatReaction` sends `""` when the reactor isn't in `friend.users` (or nick empty;
   blind groups can't match). Fix: truncated-address fallback mirroring the chat bubbles'
   nameless-sender treatment (#194 `senderIsAddress`); first REPRO-CHECK what
   `group_sender_address` carries for Damir's group (StreamProcessor msgReaction case).
3. **[BUG — C4, separate session per Damir] "Tap to call back" shows while the call is
   still ACTIVE.** The card is built from the initial `voiceCall` message and never learns
   live state; nudge should appear only once the call is done (needs an active state or
   defer-to-`voiceCallEnd`). Bubble polish batch.
4. **[BUG — group ticks, Damir screenshot 2026-07-09 00:xx] Own GROUP messages stay on the
   clock ("sending") — never delivered/read.** Received/read in groups ride the
   `received:`/`seen:` reaction aggregates (`Friend.addReaction` → `setMessageReceived`/
   `setMessageRead`, Friend.cs:1017-1030) — verify that path actually fires a
   `updateMessage` push to the open chat (UIHelpers.updateMessage) AND that the shell's
   status pipeline applies it: `chat.html` `updateMessage` → `upsertText` → `statusFrom`
   (surgical `setMessageStatus` tick on sent rows). Suspects: C# never re-pushes for group
   delivery ticks while the page is open; or `message.sent/confirmed` flags simply never
   flip for group/bot messages (server-ack model) → then the FIX is mapping the
   received/seen aggregates to ticks, not the flags. Related to (but NOT caused by) the
   `updateMessage` direction fix this session — pre-fix these rows flipped to the received
   side entirely, so the stuck-tick was invisible.

## Ritual still OWED for this batch (batch-2 first actions)

1. **#46 audit loop over the whole batch** (read-only auditor → fixes → adversarial
   review until CLEAN). It has NOT run. Judgment hot-spots: CH5 heuristic (@ inside
   words/URLs? nick containing regex-ish chars is fine — plain `Contains`), CH8 sticky-map
   lifecycle (delete tombstones? desktop dual-pane), C4 old-exe arg-undefined paths,
   C5 blind-group derived address.
2. **DECISIONS rows** (Damir renumbers on merge): CH1 kind-string (bots count as groups in
   the chip) · CH5 heuristic + cap · CH8 sticky excerpt + own-echo skip · C4 nudge parity ·
   S1 identity-vs-payment address forms · updateMessage direction fix.
3. **be-cutover-brief**: mark CH1/CH5/CH8/C4/C5/S1/S3/S4 landed (keep end-state notes:
   CH6 excerpt-kind enum, mention payload); ARCHITECTURE §9 table sync for the 2 new
   pushes (`addChatReaction`, `setVersion`/`setAddress`/`setLanguage` on SettingsPage) +
   the 3 arg extensions (`addChat`+2, `addReactions`+1, `addCall`+3).
4. **CLAUDE.md status** one-liner for the batch.

## Build/verify (Damir's machine — sandbox CANNOT build)

`node scripts/build-shells.mjs` (home/chat/settings changed; NO bundle rebuild — zero
component edits) → `node scripts/smoke-test.mjs` → build `net10.0-windows` → F5.
F5 checklist: Groups chip (2 groups + bot) · Account QR/address (no `_suffix`) + Version +
current Language · own ❤ persists app restart · counterpart ❤ → "«nick»: Reacted" excerpt
(after finding-2 fix) sticky until read · `@nick` from machine B → @ indicator + Unread
chip · calls: answered = right side + m:ss, rang-out = right, missed = left + nudge.

## Environment quirks (this PC)

- **bash sandbox mirror serves STALE files** (git diff/node see pre-session state — #175
  class). File tools (Read/Write/Edit/Grep) hit the real disk and are reliable; verify
  edits via Grep, hand build/smoke to Damir.
- **Ixian-Core is mounted read-only** (`…\Spixi Rework Of Frontend\Ixian-Core`) — reference
  ONLY (Friend/FriendType/FriendMessageHelper/ReactionData/ExtendedAddress live there).
  Do not edit; rows needing Ixian-Core changes (CH4 persistence, C8 per-emoji storage) get
  flagged to Damir first.
- Two machines available for counterpart testing; only the OBSERVING machine needs the
  new build.

## Remaining 🟢 rows (work-order order)

**C7** (app-invite decline verb + install-URL always present) → **C8** (arbitrary emoji
reactions — touches reaction storage; check Ixian-Core impact BEFORE starting, may need
Damir) → **A1, A2, X1** → **CH2, CH3, CH4** (persistence cluster; CH4 likely Ixian-Core
metadata → flag) → **S14 + §9 settings family**. 🟡 stays human (L-rows, credential
settings); 🔴 untouchable.
