Read `docs/handoff-2026-08-15c.md` first. It is the live state.

It is the ONLY handoff in `docs/`. Everything consumed lives in `docs/archive/` under its
original filename. ⚠ If you go digging there, three NAMES lie:
`docs/archive/handoff-2026-08-16.md`, `-17.md` and `-18.md` were all written on
**2026-08-13** and are OLDER than the file above. Read the date in the header, never the
file name.

Then read `docs/f5-findings-2026-08-15.md`. That is the work list — twelve defects and nine
ideas from a Windows F5 pass, each already triaged with file:line evidence, an owner and an
effort. **Do not re-derive them.**

Write all output in ASD-STE100 Simplified Technical English. This applies to chat, docs, code
comments and commit messages. See the language rule in `CLAUDE.md`.

**Verify the state before you plan anything.** Handoffs in this project have been wrong about
the commit state more than once. Check `git --no-optional-locks log --oneline -3` and
`git --no-optional-locks status --porcelain` yourself. Batches **#348** and **#348b** were on
Damir's disk and uncommitted when the last session ended. Confirm whether he has committed
and pushed them. If he has not, that is step one and nothing else starts before it.

Set up a cloud twin first. The Windows working tree is mixed CRLF and
`scripts/build-demo-bundle.mjs` cannot parse a CRLF component, so it fails on Damir's PC.
Clone the twin and do all building and testing there:

```
git clone --depth 1 https://github.com/Rexoflex/Spixi.git
cd Spixi
git fetch --depth 30 origin redesign/frontend && git checkout FETCH_HEAD
npm install jsdom --no-save
```

Ship results back as a tarball through `SendUserFile` + `device_commit_files`, then
`tar xzf <name>.tar.gz`. **Do not pass `--overwrite`** — Windows `tar.exe` is bsdtar, it
rejects the flag and it overwrites by default. **The mount CANNOT unlink**, so never plan a
step that deletes a file on the mount. Damir is on PowerShell, not CMD.

## FIRST ACTION

⚠ **Read D-14 first.** An Ixian-Core `0.9.8k` regression (commit `5643e5b`) nulls the sender
address on every BOT-chat message, because a bot chat's friend is `FriendType.Normal` and the
new test has no `bot` exception. It breaks tipping in every bot room and it is **not ours**.
One word in Core fixes it. It is BE item 1. Check whether the engineer has shipped it before
you plan any tipping work.

**The Android pass is OWED.** Three items in #348 and #348b have never run on a touch device:
**A9** (Android landscape Account), **A7** (the FAB residue), and **A5 / I-8** (the centre-out
press fill on touch — Windows tested it with a mouse only). The **Android Release `PERF`
numbers** are owed as well. ★ `PerfTrace` **must be deleted before any release** and it stays
in the tree until those numbers exist.

Give Damir a short device runsheet for these, one step at a time, and wait for each result.

## ★ AND A SESSION OF ITS OWN: TIPPING + GROUP BEHAVIOUR

**Damir, 2026-08-15:** *"tipping and group behavior needs its own separate session that we
need to test out everything."* Do NOT fold this into a mixed batch again — this session
proved why. Give it one dedicated device session that walks the whole surface:

- **Tipping:** 1:1 · private group · bot room · over balance · twice on one message · after
  an account restore · the amount and its digit grouping (**I-6**).
- **Groups:** leave · kick · ban · delete · add member · rename · re-avatar — each one as
  OWNER and as member, in a normal group, a bot room and a blind room.

**D-4 · D-10 residual · D-12 · D-14 · D-15 · CI7** all live in that surface, and most need a
BE answer first. **Get the BE answers BEFORE the session** or it becomes another triage pass.

## Then, in this order

1. ★ **D-16 — the press fill.** Damir saw it at F5 and chose to DEFER rather than ship it
   unaudited. Two defects in one: the sweep is only as long as the click (`pressable.js` holds
   `data-pressed` only between `pointerdown` and `pointerup`, and `base.css:300` flips
   `background-size` only while it is present), and a selected, hovered row lands on
   `--surface-action-tonal-hover` = `primary-600` — which is also `--surface-action-default`,
   the filled BUTTON surface. Fix A + B first (a ~250 ms floor with the #346 cancel latch
   still winning; ease the selected-row hover in at the fill duration). Do C — the token ramp
   — **with I-2**, same disease one step apart. ⚠ This is the ONE shared press mechanism and
   **#343 is the precedent**: #46 loop and mutation pins required.
2. **D-17** — the Apps search field appears then disappears on a first visit with an empty
   list. FE, small. Read #340 C-MAJOR-1a/b/c first; same surface.
3. **I-10** — the app pane feels slow to open. ⚠ **MEASURE FIRST (#294).** One `PerfTrace`
   reading. #340 BUG-2② is the prime suspect.
4. **D-9** — finish the delete-account story on device. The alert-safety half (D-9②) is built;
   the black-screen and the "account exists" dead end need a device test.
5. **Cheap and unblocked:** I-2 (an outline on the selected chip), I-6 (digit grouping in the
   tip amount — a money-safety item).
6. **D-6** (account tier copy), only when the BE engineer answers. Damir is asking him.
7. **I-1 + the welcome flicker**, as ONE native transition treatment. ★ **MOBILE ONLY** — on
   desktop the chat is a pinned pane in a grid column, not a pushed page. Gate on
   `DeviceInfo.Platform`, never on `DeviceInfo.Idiom` (it is posture-dependent) and never on
   the window width. Measure on the A52 before you judge it (#294, and #343 is the precedent).
8. **D1 — reply-to.** ★ **DESIGN LOCKED** by Damir on 2026-08-15, and no longer BE-blocked.
   Read the D1 section of the findings doc in full before you plan it. In short: no protocol
   change, the reference rides in the body as a message ID, the quote is resolved LOCALLY and
   its text is never sent, and tapping the quote jumps to the referenced message. **Three
   small C# pieces; the FE half is already built behind `bridge.cap('reply')`.**
   **Verify the two-device id round-trip BEFORE you build** (#215).
9. **The security sweep, LAST.**

⚠ **A5 and CI7 stay BLOCKED.** Group rename and add-member are still not available in
Ixian-Core. **Do not plan around them.**

## EIGHT questions for the BE engineer

They are listed with evidence at the end of `docs/f5-findings-2026-08-15.md`. **Item 1 (D-14,
the `0.9.8k` bot-chat sender-address regression) is urgent and is one word.** Item 7 — *can a
reaction be REMOVED?* — unblocks two open items at once (the D-10 residual and D-12).

## The rules

- Verify a plan against the code before you build it.
- Measure before you optimise (**#294**).
- **Zero C# unless you have evidence** (**#215**). Ixian-Core is NOT in this repo.
- Smoke stays green at **BASELINE OK — 1627 pass / the 4 known pre-existers
  (#136 · #149③ · M5 · B3)**.
- **Every fix gets a mutation-honest pin, and you must PROVE it fails when reverted.**
- Bundle BEFORE shells.
- **Damir makes all commits.**
- Add a `DECISIONS.md` row for every significant decision, when you make it.
- Run the **#46 loop** on anything substantial — disjoint auditors, then a fresh reviewer told
  to break your verdict, and repeat until a round finds no product defect.

## ★ The security handover gate — this persists

**The redesign must introduce NOTHING.** Before the app goes to the BE engineer, an
introduced-vs-inherited security sweep runs over the whole delta from the fork point
`0e85a4b8`. **One question per finding: does this exposure exist at the baseline?**
No → we introduced it → we fix it before handover. Yes → legacy → he sees it untouched. He
must see only his own legacy issues, never ours.

The sweep runs LAST, but **apply the lens while you build**. Any batch that adds an `ixian:`
verb, a `spixi.*` localStorage key, a WebView setting, an `innerHTML`/`eval` sink, a network
fetch, or a log line must ask the question as it goes.

★ **Reply-to is the one to watch** — its body marker is a new parsing surface for
peer-controlled content.

⚠ **Three items are already known to be OURS and must be fixed before handover:**
**MAJOR #3** (the spoofable chat link-open confirm modal — we built the linkify and the
modal, legacy had neither), **MAJOR #6** (the mini-app WebView regressions from the iOS
bring-up), and the **`spixi.draft.*`** key, which holds the user's own unsent message text
in plaintext in a partition third-party mini-app code may be able to read. All three are in
`docs/security-handover-gate.md`, which `CLAUDE.md` names as a ground rule.

⚠ There is **no .NET in the cloud container** and the install is blocked. Damir's build is the
first compiler pass over any C# you write. Say so plainly, and run a comment-aware brace and
paren balance scan as a weak substitute.
