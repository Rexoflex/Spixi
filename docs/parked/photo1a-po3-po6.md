APPLIED 2026-11-18 (#1728): the store is back in work/photo1a;
the patch file is removed; the packets moved to docs/be-review-pack/.
The text below is history (the state at the time it was parked).

# Parked: PO-3 + PO-6 of batch photo1a — the thumbnail and waveform store (2026-11-18)

**Why parked.** Ruling #1641 put PO-3 (the 320 px thumbnail made once and kept in the app cache, a true LRU of 128) and
PO-6 (the C# half: a voice row's duration + 40 peaks kept) into "Photo open 1a". The prompt (main chat, rulings #1640 /
#1606) says: PO-3 is BUILT by a Claude Fable 5.2 sub-agent; the security-only readers and the reader of the riskiest
file (the store) are Fable 5.2; no other model. On 2026-11-18 at about 00:00 the account's Fable 5.2 limit was reached
(the API: "resets Nov 21, 11pm (Europe/Ljubljana)") in the middle of the round-2 fix of the store. So the store could
neither be fixed nor re-read by the named model. By the prompt ("If you cannot start a Fable 5.2 sub-agent: stop PO-3 and
report it; do not build it with another model") PO-3 stopped; PO-6 lives in the same store and needs the same readers, so
it stopped too. The rest of the batch (PO-0, PO-1, PO-5, the walk step) is delivered in `work/photo1a` (DECISIONS #1719).

**What is here.** `photo1a-po3-po6.patch` — `git apply docs/parked/photo1a-po3-po6.patch` on top of `work/photo1a`
(checked with `git apply --check` on the delivered tree) gives back the full tree as it stood after review round 1 +
the lead's job-creation generation read: `Spixi/Utils/ChatMediaStore.cs` (glue), `ChatMediaStoreRules.cs` (engine),
`scripts/csh/ChatMediaStoreTests.cs` (78 tests; CSH 733 on the full tree), `scripts/pins-photo1a/b-store.mjs` (b1–b11),
the SCP region R2 (`chatThumbFor` / `voiceInfoFor` and their LRUs), the generation in `ThumbJob` / `VoiceInfoJob`, the
store calls in the delete paths, the two switches `PhotoThumbStore` / `VoicePeaksStore` (Android only), the four-token
`[FLAGS]` line, and the pin re-bases of that shape. The packets `P67-thumbnail-store.md` and `P68-voice-peaks-store.md`
describe it.

**Review state of the parked code.** Round 1 (Fable S-store, Fable S-delete): 2 MAJOR — a 60 s late-put timer; derived
files left by a declined request and others → fixed (delete generations read when a job is made; an orphan sweep; direct
calls at the reachable paths; trash rename; byte bound; links; harness seams under `SPIXI_CSH`). Round 2 (Fable
break-my-verdict, Opus correctness) — OPEN, not fixed:
| # | Severity | Finding | Direction |
|---|---|---|---|
| G1 | MAJOR (by the letter; needs a link planted in the app-private cache) | the links rule does not cover the per-key paths: `placeOf`, `get` → `discard`, `put`, `deleteMessage`, `deleteChat` → `toTrash` act through a link at `<root>/<acct16>` or `<root>/<acct16>/<chat16>` | refuse / plain miss when the account or chat folder is a link; remove a link as a link; extend `links_areNeverFollowed_*` (also a file link inside a chat folder) |
| G2 | MINOR | `generationOf` takes the write lock, which is held across disk work; it is called on the main thread and inside `lock (messages)` | a lock-free read (Volatile counters, written under the lock) |
| G3 | MINOR | the sweep runs once per process | re-arm the chat part when the friend count dropped |
| G4 | MINOR (pin gap) | `if (!ReferenceEquals(engineOf(), e))` → `if (false)` and removing `!isLink(e2)` stay green | tests |
| G5 | NIT | (delivered in the branch already: Settings' single delete calls `noteFileDeleted()`) | — |
| G6 | NIT | a job after `deleteMessage` is refused on disk but `ifCurrent` accepts its memory entry; a comment says otherwise | refuse the memory entry for a dead name too |
| G7 | NIT | a kill between the trash rename and the tree delete leaves `del-…` until the next process's first store call | confirm the sweep removes it |
| F-2 | MINOR | the generation is read at enqueue, not when the load read its rows (a delete between the row read and the enqueue) | read `generationOf` once at the top of `loadMessages` and pass it to the batch's jobs |
| F-3 | MINOR, record | removals in files the batch may not edit (HomePage decline, Core's removals, the heals, the dev unseed) wait for the next process's sweep | the re-arm of G3 |
| N-3 | NIT | a dev-mode switch OFF leaves kept files until a delete names them | record |
Also recorded by the readers: the store folder lies inside the FileProvider root `cache-path .` (`provider_paths.xml:40-42`); no caller can name a store file.

**How to resume (proposal for the main chat; Damir rules).** (a) After the Fable reset: a new session (or this one,
resumed) applies the patch on the merged `redesign/frontend`, a Fable 5.2 builder fixes G1–G7 + F-2 / F-3, a fresh Fable
5.2 security reader per round, then the full smoke and its own operator block (a cold-open A / B). (b) Damir allows
Opus for this fix round and its readers (a change of #1640 / #1606 for this batch). (c) Drop PO-3 / PO-6 and go straight
to images by URL (#1642), which would read the same kept thumbnail (see DECISIONS #1720).
