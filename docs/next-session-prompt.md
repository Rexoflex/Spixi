# Next session

Read first: `docs/handoff-2026-09-16.md`, then `DECISIONS.md` **#845–#860**.

⚠⚠ **`device_bash` does not work on this machine** (Windows update, 2026-09-08 — #860). You
can read and write files; you cannot run git, node, the generators or any gate. **Prepare
batches, hand Damir a command block, and never report a gate as green that you did not see
him run.** Claude Code on the machine is the fallback if something genuinely must run.

⚠ `DECISIONS.md` is **1.8 MB** — stage it, append in the container, commit it back. Do not
read it into context.

---

## Item 0 — is the pin batch committed?

`scripts/smoke-test.mjs` (8 fixes), `scripts/pin-sweep.mjs` (new), `DECISIONS.md` (#859,
#860) and three docs were waiting on one commit and one suite run. If `git log` shows them
in, say so and move on. **The baseline is 2 known pre-existers, not 3** — M5 went green at
#848. If M5 is red, it is NEW.

## Item 1 — whatever the stutter experiment said

`CHAT_SPARE_ENABLED = false` was the one-token discriminator (handoff §2).

* **improved** → the resident spare is the cause. Decide the trade knowingly: chat-open
  300→113 ms against ~15 MB resident and the jank. Then look at AND-40 again with it off.
* **unchanged** → cold WebView boots. Contact details is the worst of them (a fresh WebView
  per open, #803's 130–230 ms). ⚠ #804's cure is not directly available — ContactDetails
  keeps its own WebView deliberately (#221/#247), so hosting it in-shell needs a security
  read FIRST. And re-arm the `[CDPERF]` probe before touching code (#294, #668).

## Item 2 — the walk findings

From `f5-checklist-session-u.md` or the artifact. §5.1 is the one that matters.

## Item 3 — thinner icons (#856)

`generate-icons` → `build-demo-bundle` → `build-shells`, **its own commit**. Then the gate
nobody has: nothing compares the SVG sources with the generated registry, and
`generate-icons.mjs` has no `--check`. Cheapest gate on the board.

---

## Rules this project has paid for

* **#215 verify first** — two rows in Session U's own queue were already built.
* **#294 don't guess** — narrow the mechanism, then get the device datum.
* **#798 a sweep from the author's list is not a sweep** — #859 is the latest bill for this,
  and `pin-sweep.mjs` is the answer. Run it on every batch.
* **#771 a comment about a removal names the thing removed** — strip comments before any
  negative sweep.
* **#772 a comment stating an unenforced invariant is a defect.**
* **#828 a harness you wrote yourself is not verification** — assemble it from the suite's
  own header, and **slice it by CONTENT, not line number** (edits shift the file).
* **The walk finds what the gates cannot.** Every genuinely new defect for several sessions
  running came from Damir holding the phone.
