# P112 · THE DEVELOPER-BUILD LINE OF THE REPLY MATCH (batch quotebox2, item 1)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| NONE in a store build (the line is not compiled; `tryReplyMatch` is a pass-through = the base call, b2) · LOW in a developer build (a log line of ids and counts) | none | none | none: `#if SPIXI_DEV_COEXIST` (absent from a store build; the O-35 release gate of `Spixi/Spixi.csproj`) | 2 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.ReplyMatch.cs` `tryReplyMatch` (the match, then the one `#if SPIXI_DEV_COEXIST`
group; `matchReply` in `SingleChatPage.xaml.cs` calls it in place of the base's `ReplyQuote.tryMatch`, one line changed, #2031)
· `ReplyMatchLog` at the end of `Spixi/Utils/SpixiFlags.cs` (wholly inside `#if SPIXI_DEV_COEXIST`).

**DECISIONS:** #2025, #2026 · the walk WALK #1968 · `docs/quotebox2-mechanism.md` § 4.

## What and why
The Windows walk showed REPLY C of the dev seed's Seed 57 as the plain fallback box (no target matched). The cause is not
proven off the device: neither the other replies (B is on record only in open 1, D only in open 2) nor the walk's log (its
paste kept the last 200 matching lines and did not reach the start of the process) exclude a read fault, so a read fault,
a throwing match, (a) row 515 not stored as seeded and (c) C pushed with no read in its index all stay open
(`docs/quotebox2-mechanism.md` § 0). This line, one per match of a reply-shaped row, gives the next walk the fields to tell them apart (the mechanism doc § 4):
`[QB2] reply match reply=<message id hex> found=<0|1> cand=<n> deep=<n|-1> idx=<n> via=<load|live> ui=<0|1>`.
`reply` is accepted only as 1 … 64 lowercase hex chars, else `-`; the counts are bounded integers; no message text, name or
address. `found` is the result of the ONE match call (`ReplyQuote.tryMatch`, as in the base); the line is written after it inside
its own `try { … } catch (Exception) { }`, so the match itself is the base's (a throw of the match still reaches `matchReply`'s catch).

## What a reviewer checks
- With `SPIXI_DEV_COEXIST` absent, `tryReplyMatch` = the base call, and `matchReply` with the base call put back = the base body
  (pin `pins-quotebox2/b-matchlog` b2).
- The cost, in a developer build only: per PUSH of a reply-shaped row (a load, and every `updateMessage` of it — a receipt or an
  edit): at most 33 probes of `candidates` and one log line of about 90 bytes; bounded per event.

## Tests
Pin `pins-quotebox2/b-matchlog` (b1 the group, b2 the old path, b3 its own catch, b4 the words, b5 the class wrapped) ·
CSH `QuoteBox2Tests` (`body`, `candidates`, the evidence table E1–E5). ⚠ C# UNCOMPILED until CI's Windows job.
