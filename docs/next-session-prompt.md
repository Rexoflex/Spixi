Session AD — ALL the C# verbs that are ours, in ONE session, before the office (work order = DECISIONS #927, amended: no wallet-password work)

0 · Before anything else (#215)
Read `docs/handoff-2026-09-23.md`, then DECISIONS #916–#927. Check `device_bash`; use
`git --no-optional-locks status` (never plain `git status` on the VM). Run the four `--check` gates on
the real tree. Verify HEAD is `b333142c` and the tree is clean (only `_to_delete/`). CHECK DECISIONS and
the be-cutover anchors before accepting any row from this prompt (#660). The FULL suite runs in the
container on a SNAPSHOT copy with the Ixian-Core sibling, BEFORE (expect 4817 / the 2 KNOWN) and AFTER
each batch — predicted is not an acceptable last line. Reviews run on Opus — pin the model explicitly.
Nothing here compiles C#: every C# change gets an F5 row; a build error is this session's bug.

1 · The rule of this session
A cutover row is OURS when its fix is app-side C# (an `ixian:` handler, a `sendUiCommand` push, app
storage) or a shell; it is HIS only when the fix is in Ixian-Core's storage or wire protocol. Verify the
anchor of every row against the tree before building it — the ledger records what a session FOUND, not
what the tree IS. Damir's ask (2026-09-23): "finalize the C# verbs if easy to do and just do them all in a session".
So: ONE session, batches 1 → 3 → 4 in that order, as far as it reaches; ONE #46 loop on Opus over the
whole delta at the end (plus a mid-point loop after batch 1 if it touched more than five C# files);
mutation-kill every new pin; ONE walk sheet (`docs/walk-artifact-session-ad.html`) — Damir walks once on
Windows + Android; the AC follow-up's rotation rows (Chats · Wallet · a chat) ride the same sheet.
★ NO wallet-password work this round (Damir): L8 and L2 are OUT — leave their rows as they are.

2 · Batch 1 — the rows that DELETE a workaround (do first)
 · CH6: `addChat` pushes a message KIND → delete `home.html`'s locale-carrier reverse map
   (`excerptFromRaw` + `#sl-carriers`, #192/#268). Keep the carriers only where no push can replace them.
 · C1/C2: `addPaymentRequest` pushes a status ENUM + request KIND (+ fiat, insufficient) → the shell stops
   interpreting localized `title`/`status`/`statusIcon` (#187). The C#-localized title may still ride
   along for display; the DECISION must come from the enum.
 · S11's store: one push replaces `spixi.landtab` (#238) → delete the store, the storage-event leg, the
   15 s guard, the `suppressNextTabOverlayExit` epoch belt if it only served this.
 · #274's stash: re-localize `settings.html` in place on a language pick (the #257/#285 mechanism)
   instead of reloading it → delete `spixi.settings.view` + `langBuilt`.
 · ★ C16 remote delete: `Spixi/Network/StreamProcessor.cs` `msgDelete` → `UIHelpers.deleteMessage`
   pushes UI only. Call `friend.deleteMessage(...)` + recompute `metaData.lastMessage`, mirroring the
   LOCAL delete in `SingleChatPage.xaml.cs`; then retire the Q12 `spixi.exdel` hint (#253/#254) if its
   premise is gone. CORE-10 (authorship) stays his — do not add a check here, log that it is still open.
 Each: render/boot the built shell through the wire BEFORE pinning where a shell changed; the pin is
 DERIVED (the push's arg count from the C# call site, the shell's reader from the handler), never a list.

3 · Batch 2 — DROPPED for this round except W11
 · W11 (`requestFundsResponse` dropped when no chat page is open — move the mutation out of
   `if (chat_page != null)`): small, money-adjacent, the loop reviews it as a money-path change. Build it.
 · L6 (restore destroys before `verifyWallet`): a blocker and ours, but a wallet-path reorder with its
   own full loop — NOT this session; name it first in the next handoff.
 · L2 / MAJOR #8 and L8: wallet-password work, OUT by Damir's call. Do not touch, do not design.

4 · Batch 3 — small verbs and pushes (verify each anchor, then build)
S2 backup status push · S9 `ixian:dev` + un-gate the hub row · A3/A4/A5b · C6 tip amount · C17 + CO1
(`addContact` 6th arg) · CO3/CO4/CO5 · C21 typing sender · CH8 empty-nick fallback · CI2 activity enum ·
C4 call-back while active · i18n-C# (the two hardcoded strings) · CH4 mute-aware unread total +
favorites as an app preference · CH3 mark-read persistence + media purge on chat delete.

5 · Batch 4 — medium, ours (as far as the session reaches; leave the rest named in the handoff)
C10 request linkage · CI6 shared-media feed · C22 return-to-call · A8 media flag + reveal · FC1 cancel
(app half; the peer half rides C16) · C12 paste-to-send (desktop) · NT1 (b) · PV1 · cheap sweep items:
retire `[STARTDIAG]` (its numbers are in #913/#925), the dead `getChatPages` #284 branch, `#490
clearRemoteNotifications`. NOT the two chat-open paths / two transports (they wait on #925's lever).

6 · NOT this session
CORE-1…CORE-11, C8, reply/edit, resend, RC1, CI7, GJ1, S12, the Core blockers (his) · W7 · #82 · C14 ·
C20 · CI4 · AC.11 / AC.18 (Damir's decisions) · the startup lever (#925, design with BE) · AND-48 (a
render session first) · AND-47 (verify in Core's `Logging.cs` first; if the guard is app-side, one line,
otherwise a row) · the office day (`docs/walk-artifact-ios-office.html`, after this session and the portal
steps) · the endgame (#916, after the office).

7 · Records at the end
DECISIONS rows per batch · `docs/be-cutover-brief.md` rows moved to ✅ LANDED with the anchor, the
security rows re-verified · `docs/security-review-for-be-engineer.md` + `docs/security-handover-gate.md`
for batch 2 · `docs/handoff-<date>.md` + this prompt rewritten · `docs/f5-checklist-session-ad.md` (the
paste, the builds, one row per C# file) · `docs/walk-artifact-session-ad.html` · `docs/commit-message-
session-ad.txt` · consumed docs → `docs/archive/`. Ask Damir once for AC.3's Windows clean-launch line.

Rules #215 · #294 · #660 · #663 · #771 · #798 · #811 · #882 ③ · #895 · #906 · #911 · #912 · #926 ·
★ #927: a verb is ours; only Core's storage or wire is his — read the anchor before believing the owner
  column · a pin over a push is derived from the C# call site AND the shell's handler, never one of them.
