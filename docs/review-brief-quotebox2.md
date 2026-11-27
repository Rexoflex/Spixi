# Review brief — quotebox2 (#2025–#2030)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1. The verdict goes into § 5 (#660).

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 | The mechanism of the Windows REPLY C miss (WALK #1968): NOT proven off the device (as first written: "narrowed by the walk (B and D matched in the same opens, so the one deeper read was present)" — wrong, #46 r1 O2 MAJOR-1 and r2 MAJOR-1: no way is excluded; see the mechanism doc § 0). An evidence table in CSH. ONE developer-build line `[QB2] reply match reply=<hex> found= cand= deep= idx= via= ui=` at every reply match, inside `#if SPIXI_DEV_COEXIST` (packet P112) | `docs/quotebox2-mechanism.md` · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (`matchReply`) · `Spixi/Utils/SpixiFlags.cs` (`ReplyMatchLog`) · `scripts/csh/QuoteBox2Tests.cs` · `scripts/pins-quotebox2/b-matchlog.mjs` | #2025, #2026 |
| 3 | The three sent-sweep sites of #1966 (3): `if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();` after `SPeerLocalStores.forget` at the undo (`ixian:undorequest`), the `ContactNewPage` re-add and the `sendContactRequestGuarded` heal; one switch `QuoteBox2Flags.SweepOnForget` (absent = ON, a stored 0 only in dev mode; `[FLAGS] quotebox2 sweeponforget=<0\|1>`); gate 18's `LEGACY_G3` entry of the fixed log line removed (packet P111) | `SingleChatPage.xaml.cs` (undo branch) · `Spixi/Pages/Contacts/ContactNewPage.xaml.cs` · `Spixi/Utils/SpixiContentPage.cs` · `SpixiFlags.cs` (`QuoteBox2Flags`) · `scripts/smoke-test.mjs` · `scripts/pins-quotebox2/a-sweep.mjs` · CSH | #2027 |
| — | Re-bases of other batches' pins (each after a look at the diff, the old claim kept) | `pins-histcs/a-path` (a6, a7), `pins-histcs/b-lines` (b2), `pins-fixb5/e-small-fixes` (e5), `pins-fixb1/g-sparekeep` (FLAGSFILE), `pins-lockb/b-csharp` (b7), `pins-s5/p0` ((4) window) | #2028 |
| 4 | Walk rows `docs/walk-quotebox2.md` | docs | #2026 |

Not built, and why: item 2 (the fix) — no proven cause (the prompt: build NO fix then). `scripts/size-count.mjs` is not
on the base (size by Pygments, `docs/handoff-2026-11-27-quotebox2.md`).

## 2 · How to run
- Tree: `/home/claude/spixi` (the cloud twin), branch `work/quotebox2`, the working tree against `ae7b8303` (`git diff ae7b8303`;
  new files: `git status --short`). Ixian-Core @ `097341a` at `../Ixian-Core`. Do NOT run the full smoke; do not edit.
- Smoke before: `BASELINE OK — 7094 pass / the 2 KNOWN`; CSH 919 → 940 (937 after the build, +3 in round 1). Pins: `node scripts/run-pins.mjs pins-quotebox2/a-sweep`
  (and `b-matchlog`); CSH: `node scripts/run-csh.mjs` (read-only readers may run single pins and CSH in a COPY of the tree
  under their scratch folder, not in the tree; only after the lead says the full smoke is done).
- Known failures: the 2 KNOWN (#136 · B3).

## 3 · Readers (fresh, read-only; disjoint scopes; #1606)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Claude Fable 5.2 | the whole delta, security only; first the reply-match code (`matchReply` and `ReplyMatchLog`) — the file where an error costs most | a quote from a peer must never make the page show or load something outside this chat; the dev line carries no text, name, address or path, cannot be steered by a peer into a log injection (newline, control chars) or into a cost (a peer-sized loop); `#if SPIXI_DEV_COEXIST` holds every probe (R5); the sweep switch: deletes only C#'s own Sent copies through the existing helper; the gate triggers (log lines +2, prefs +1) are honest |
| O1 | Claude Opus | the C# (4 app files) | correctness: the match result unchanged in both builds (the second `tryMatch` in the dev group, its catch); locks and threads (`matchReply` runs inside `lock (messages)` and on pool, network and UI threads; `replyDeepCached` takes `replyLock`); the three sites (placement, the null address, the order against the twin `SContacts.removeContact`); the switch block (lazy read, one line, dev-only OFF); R1 / R2 / R6 |
| O2 | Claude Opus | tests, pins, docs | do the pins and CSH tests fail when the behaviour breaks (derived cases, not author-listed; a source-text pin states its limits, #1735: a gap of the stated class is a NIT); the re-bases keep the old claims; the mechanism doc's claims against the code (`file:line` of `ae7b8303`) and against the walk record (`claude/talk-rulings-2026-11-26.md` #1968, quoted in the prompt); the walk sheet (every command complete, rows observable, the BUILD row shows something only this build has, L149 copy first) |

Findings carry `file:line`, a severity (MAJOR · MINOR · NIT) and a failure scenario.

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · C# touches no risky parts · no new verb or push (frozen
  bridge) · #1478 own switch, old path = the fallback · no URL / address / name / text in logs · R5.
- Accepted (do not re-open): the three sites and their one switch (#1966 (3), Damir) · no fix without a proven cause
  (the prompt) · the second `tryMatch` call inside the dev group (the builder's choice: the group cannot change `match`).

## 5 · Verdict
**CLEAN at round 5** (the last permitted round; #2029).

| Round | Readers (fresh, read-only) | MAJOR | MINOR | NIT | What changed after it |
|---|---|---|---|---|---|
| r1 | S Claude Fable 5.2 (security only) · O1 Opus (C#) · O2 Opus (tests, pins, docs); started during the base-tree smoke behind an execution gate (L317) | 1 (O2: the walk record misread open by open) | 7 | 10 | docs; pin b4 holds the exact call text; three CSH tests (Sonnet fixer) |
| r2 | one Opus | 1 (the walk's log cut at 200 lines excludes nothing) | 2 | 4 | docs only |
| r3 | one Opus | 0 | 3 | 1 | docs only (the reading table parked, rule 9 precedent) |
| r4 | one Opus | 0 | 1 | 5 | docs only |
| r5 | one Opus | 0 | 1 | 3 | doc corrections only (rule 8) |

Code files as the readers of r2–r5 read them (SHA-256, first 12; committed byte-identical): `SingleChatPage.xaml.cs` 5d20e24f551b ·
`ContactNewPage.xaml.cs` ccae1519ccfa · `SpixiContentPage.cs` 50c510a4a1b3 · `SpixiFlags.cs` 3a2343cef473 · `pins-quotebox2/a-sweep.mjs`
c9f1026d1760 · `pins-quotebox2/b-matchlog.mjs` 1ebd24aef7e3 · `scripts/csh/QuoteBox2Tests.cs` 174f7d46afe1. Smoke on that tree:
`BASELINE OK — 7103 / the 2 KNOWN`; CSH 940.
Recorded, not changed (with the direction of a fix): the 9-line dev group (R6; a `ReplyMatchLog` helper taking matchReply's locals)
· `candidates` copies the probe loop (one shared probe enumerator in `ReplyQuote.cs`) · three probe passes per reply row in a
developer build (one pass for `candidates` and the found-check) · gate 18's stale `ContactNewPage.xaml.cs` entry (remove it in a
batch that owns gate 18) · the chat-file count of the evidence copy (needs Seed 57's folder; a walk tool could name it).
