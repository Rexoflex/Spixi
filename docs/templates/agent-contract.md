# Agent contract — <batch>

File name: `docs/contract-<batch>.md`. The lead writes it BEFORE any agent starts (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.

## 1 · Base
- Tree: `work/<batch>` @ "<commit message>" · baseline: `BASELINE OK <n> / the 2 KNOWN (#136 · B3)` · CSH <n> ·
  tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160)
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (#1312,
  #1478: own switch, old path = the fallback) · the security handover gate triggers · edit `src/`, never
  `Spixi/Resources/Raw/html` · no commit, no push, no full smoke, nothing in Ixian-Core

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Scratch folder |
|---|---|---|---|---|---|---|
| 1 | builder-a | <sonnet / opus> | | | | `_to_delete/a/` |
| 2 | builder-b | | | | | `_to_delete/b/` |
| — | sweep (a search helper for the lead — NOT a #46 reviewer, #1471) | haiku | none (read-only) | | a findings list with `file:line` | `_to_delete/s/` |

Model by the cost of a wrong result (`docs/orchestration.md` § 2): C#, bridge and security-lens items = Opus.

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape (arguments, types, order, errors) | Provider | Consumer |
|---|---|---|---|

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin: the command (`node scripts/run-pins.mjs <dir/mod>`), the green output line, the break it made (one-token
  mutation in a full copy, #802), the red line with the failing key.
- What it could not prove (⚠ C# UNCOMPILED, unrun, not rendered).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (bundle BEFORE shells) → the `--check` gates.
2. Pin registrations in `scripts/smoke-test.mjs`: check the scope each line landed in; grep the smoke for the tokens
   of every edited line (the INLINE pins, L84).
3. The full smoke (one at a time, nothing that executes beside it, L153) + CSH → the #46 loop until CLEAN (a full
   smoke between fix and review rounds — the Hard rule) → the export docs →
   commit, ONE push of `work/<batch>`, the pull request inside the fork, wait for `redesign-ci`
   (`docs/orchestration.md` § 4).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
