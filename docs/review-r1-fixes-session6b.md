# #46 round 1 — session 6b (auditors A C#, B shells, C tests+seam) — full reports in the lead's context; summary + verdicts here
Damir picks made after r1 (2026-10-05): (P1) an EDITED message shows its ORIGINAL time and keeps its place: C# sends
`receivedTimestamp` (Core keeps it, never touched by a replace) as the time arg for a message with sequence > 0, and the edit
window runs from it (true 24 h from send). (P2) a VALID quote line that matches nothing → a quote box with NO jump, drawn from
the line itself (name = before the first ": " when that part is ≤ 32 text elements, else no name; text capped like an excerpt);
plain text only when the first line is not a quote shape.

## r1 findings · verdict · claimed fix (for the r2 reader — VERIFY each)
| Finding | Verdict | Claimed fix (where) |
|---|---|---|
| A MAJOR-1 reply match quadratic, unbounded, under lock / UI thread | real (bench 4 s) | per-page candidate memo (id+seq+text) + excerpt index; normalize stops at 62 elements; quote-line check ≤ 4096 chars; deep read only in loadMessages BEFORE lock(messages), off UI, only when a row is reply-shaped; never on the network thread (SingleChatPage, ReplyQuote) |
| A MAJOR-2 quote name = my private alias | real | 1:1 → no name either side; room → own nick / senderNick / roster nick; NO Friend.nickname / FriendList.getFriend().nickname / resolveNick; the agent's reflection read of Core `_nick` was REMOVED by the lead (replyNameOf) |
| C M-1 / m-1 / A MINOR-3 ambiguity (newest wins, ": " suffix, post-reply match) | real | ranking: remembered compose target (sender device) → exact line → longest excerpt → newest ≤ reply time → skew fallback; residual peer-side ambiguity 🟡 |
| C M-2 / A MINOR-2 edit breaks quotes (timestamp overwritten) | real | matching uses the ORIGINAL time (EditRules.displayTime → receivedTimestamp when sequence > 0); excerpt-changing edits → Damir P2 box |
| C M-3 edited row moves on reopen | real | Damir P1: time arg 6 = receivedTimestamp for an edited non-bot standard row; the chats-row time + order and chat-info link times too |
| A MINOR-1 newest-50 vs a ~51-row receiver | real | NewestWindow 25 |
| A MINOR-4 answer to a RequestSent contact | real | approved && state == Approved |
| A MINOR-5 streams marked edited + metadata write per chunk | real | edited + re-copy only for non-bot |
| A MINOR-6 a peer replaces its own file/payment row (inherited) | real, inherited | the drop guard also drops non-standard targets |
| A MINOR-7 deep read on network thread / inside the open build | real | see MAJOR-1 |
| A NITs (resolveNick warning, quotejump Task.Run, edit-before-original) | ok | gone with the call · one read at a time · comment |
| B-1 MAJOR hover Reply covers Retry | real (geometry) | no hover button on a failed row |
| B-2 #1203 img covers the focus ring | real | ring on the tile's ::after above the img (border, forced-colors safe) |
| B-3 / C m-4 a text quote starting 💸📞🚀 shown as typed | real | typed only on the exact wire words; 📷/📎 prefix keeps text |
| B-4 refused Save loses text silently | real | toast `editNoLonger` + the text stays as a plain draft |
| B-5 quotejump not found = silent | real | 2 s wait → the existing `sharedJumpTooFar` toast; any jumpToMessage cancels |
| B-6 two fingers on two rows | real | document-level touch count |
| B-7 a Tab stop per row, name "Reply" | real | tabindex −1, roving on row focus-within, "Reply to <sender>" |
| B-8 focus lost after ✕ | real | focus → input |
| B-9 swipe lost on a row rebuild | real | document-level swipe state keyed pointerId + message id |
| B N-1…N-8, C NIT grapheme cut | ok | as listed in the R report (cap-gated wiring, strict > 24 px, detail === 2, Save disabled unchanged, comment, editMessage key reused, grapheme cut) |
| C m-2 Links list the quoted URL / "…" URLs | real | SharedItems extracts from the body |
| C m-3 fallback name differs loaded vs not | recorded | NIT-level; 1:1 now carries no name at all |
| C m-5 cost on every receipt | real | see MAJOR-1 |
| C m-6 / survivors W1–W4, S2, S3, S6, S7 | real | new pins kill each (agents' kill lists) |
| A-MINOR (lead) Damir P2 no-match box | new pick | C# fallbackOf + the shell's no-jump box |

## r2 (fresh reader) findings · verdict · claimed fix (for the r3 reader — VERIFY each)
| Finding | Verdict | Claimed fix |
|---|---|---|
| r2 MAJOR-1 P1 used the arrival clock (`receivedTimestamp`) for RECEIVED messages → a peer's edited row moved on my device | real | a replace keeps Core's `timestamp`: StreamProcessor passes `existing.timestamp` for a found non-stream replace, `onEditMessage` passes `msg.timestamp`; `EditRules.displayTime` removed; every reader back to plain `timestamp`; the 24 h window = now − timestamp |
| r2 MAJOR-2 a C#-refused edit lost the text | real | C# re-pushes the current state on every refusal of a row in memory; the shell keeps a pending edit per id: same body = success, a different body or 3 s silence = refused → toast + text back (merged with any field text); `canEditRec` mirrors the 25-newer rule |
| r2 MINOR-1 a peer rewrites a local system line | real (inherited) | drop guard + `UnreadRule.isSystemLineId(existing.id)` |
| r2 MINOR-2 matched box shows the peer-written name | real | matched quoteName = this device's `expectedName` ("" in 1:1); the line's name only in a P2 box |
| r2 MINOR-3 roving button = no keyboard Reply on plain-text rows | real | the log = ONE Tab stop with a roving row (arrows / Home / End; other rows' controls out of the Tab order; focus carried across a rebuild; selection mode owns tabindex, roving restored by an observer) |
| r2 MINOR-4 touch set never self-heals | real | a primary pointerdown clears it |
| r2 MINOR-5 the quotejump toast fires before a slow jump lands | real | the jump's load burst (clearMessages / prepend) cancels the wait too |
| r2 MINOR-7 the excerpt bound unpinned (M1 survived) | real | csh `charsRead` counter: ≤ 512 chars read for a 64 000-char text; 1000 × 64 000 under 3 s |
| r2 NITs | ok | remembered target after the bot-price check, forgotten on a failed store · memo keyed on the raw sender name · comment fixed · P2 drops an address-like name part entirely · failed-row exit re-renders · swipe registry swept above 200 · the 3 remaining UTF-16 cuts → grapheme |
| recorded, not fixed | — | a status-only updateMessage carrying the OLD body for the edited id that lands between Save and C#'s replace push would read as a refusal (C# pushes the replace synchronously in the verb handler, so the window is the UI-thread hop only) · the peer-side ambiguity of identical excerpts (🟡 in #1198) · C m-3 loaded-vs-unloaded name in 1:1 (local only) |

## r3 (fresh reader) — CLEAN (0 MAJOR · 3 MINOR · 7 NIT, 10 mutations / 9 killed)
| Finding | Fix (lead) | Break |
|---|---|---|
| r3 MINOR-1 a quote-shaped edit lands as its BODY → read as refused | `noteEditAnswer` also accepts the body after the first new line of a quote-shaped typed text | revert → edit.mjs `quoteShapedAccepted` false ✓ |
| r3 MINOR-2 a mouse click focuses a rove row → `:focus-within` keeps the reply button up | reveal on `.c-bubble-row:focus-visible` / the button's `:focus-visible` only | revert → lead.mjs red ✓ |
| r3 MINOR-3 the belt skips STREAM chunks (append onto a system line / file row) | the lookup also runs for non-bot stream chunks; a chunk onto a non-text / system row is dropped | revert → cs.mjs `lookup` false ✓ |
| r3 S2 survivor (addMe `noteEditAnswer` unpinned) · NITs 2–7 | recorded: bot final replace keeps the last chunk's time (negligible) · a streaming 1:1 contact shows "edited" (no Spixi app streams in 1:1) · refused text into another open edit's unsaved draft / lost if the chat closes within 3 s · a throw after a local replace reads as success · rows have no role / name, reply button DOM order on sent rows, in-place added controls stay tabbable, stale `logFocusId` after selection mode → the S9 a11y sweep · the old-body tick during the UI hop (r2) | — |
