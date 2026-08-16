Read `docs/handoff-2026-08-15c.md` first. It is the live state.

It is the ONLY handoff in `docs/`. Everything consumed lives in `docs/archive/` under its
original filename. ⚠ If you go digging there, three NAMES lie:
`docs/archive/handoff-2026-08-16.md`, `-17.md` and `-18.md` were all written on
**2026-08-13** and are OLDER than the file above. Read the date in the header, never the
file name.

Then read `docs/f5-findings-2026-08-15.md`. That is the work list — **17 defects and 11
ideas**, each already triaged with file:line evidence, an owner and an effort. **Do not
re-derive them.**

Write all output in ASD-STE100 Simplified Technical English. This applies to chat, docs, code
comments and commit messages. See the language rule in `CLAUDE.md`.

**Verify the state before you plan anything.** Handoffs in this project have been wrong about
the commit state more than once — including this one, mid-session. Check
`git --no-optional-locks log --oneline -3` and `git --no-optional-locks status --porcelain`
yourself. **Expect a CLEAN tree at `0a8cf16`**, with `99e2106` (#348 + #348b) beneath it and
`f11286a` beneath that. If the tree is dirty or those commits are missing, stop and sort that
out before anything else.

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

## ★ DAMIR'S RULE FOR THIS PHASE (2026-08-15)

**"We need to focus on fixing stuff and finalizing our work load as agreed, and we just leave
BE dependent stuff for last part."**

Follow it literally. **§9 of the handover splits every open item into table A (build now,
nothing external blocks it) and table B (parked until the engineer answers).** Work table A
top to bottom. Do NOT open a table B item, and do not design around one — if a plan needs a
BE answer, it belongs in table B and it waits.

⚠ **Before you plan anything, check whether the BE answers arrived.** Two of them change
table A: **Q1 (D-14)** is a one-word Core fix that restores tipping in bot rooms, and
**Q2** decides whether the Leave half of D-15 can be built.

## FIRST ACTION — the Android pass. It is OWED.

Three items in #348 and #348b have **never run on a touch device**: **A9** (Android landscape
Account), **A7** (the FAB residue), and **A5 / I-8** (the centre-out press fill on touch —
Windows tested it with a mouse only). The **Release `PERF` numbers** are owed as well.
★ `PerfTrace` **must be deleted before any release** and it stays in the tree until those
numbers exist.

Give Damir a short device runsheet, one step at a time, and wait for each result.

## Then work table A in order

The full table with owners and effort is in the handover. In short:

**D-16** (the press fill — it does not finish on a fast click, and a selected hovered row
lands on `--surface-action-tonal-hover` = `primary-600`, which is also
`--surface-action-default`, the filled BUTTON surface) → **I-2 + D-16 fix C together**, one
token pass → **D-17** → **I-6** → **D-5** → **D-9** → ★ **D1 reply-to** → **I-1 + the welcome
flicker** → **I-10 / I-9** (measure first) → the honest halves of **D-4** and **D-15** →
**D-1 part B** → **D-7 + I-11 together** (both are copy across 13 locale files — one locale
round, not two) → **I-3** → and **the security sweep LAST**.

⚠ **D-16 changes the ONE shared press mechanism and #343 is the precedent** — a motion change
that passed review and made chat entry worse on device, reverted the same night. **#46 loop
and mutation pins are required.**

★ **Tipping and group behaviour still get their own device session** (Damir, 2026-08-15).
Walk the whole surface: tip in a 1:1 · a private group · a bot room · over balance · twice on
one message · after a restore. Groups: leave · kick · ban · delete · add member · rename ·
re-avatar, each as OWNER and as member, in a normal group, a bot room and a blind room.

## Table B — the eight BE questions, for reference only

Do not build against these. They are listed with file:line evidence at the end of
`docs/f5-findings-2026-08-15.md`, and as a table in §9B of the handover.
**Q1 (D-14)** is urgent and is one word. **Q7** — *can a reaction be REMOVED?* — unblocks two
items at once (D-12 and the D-10 residual). **A5 and CI7 stay BLOCKED**: group rename and
add-member are not in Core, so do not plan around them.

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
