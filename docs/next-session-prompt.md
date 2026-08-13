# Next session — starting prompt

Copy the text below into a new session.

---

Read `docs/handoff-2026-08-18.md` first. It is the live state. Then read the `#340` row in
`DECISIONS.md`.

**Write all output in ASD-STE100 Simplified Technical English.** This applies to chat, docs,
code comments, and commit messages. See the language rule in `CLAUDE.md`.

Verify the state before you plan anything. The previous handoff was wrong about the commit
state, and a session that trusted it would have looked for work that was not there. Check
`git --no-optional-locks log --oneline -3` and
`git --no-optional-locks diff --ignore-cr-at-eol --stat` yourself.

**Note: the working tree is CRLF and HEAD is LF.** A plain `git diff` shows about 11000
lines of identical text. Always add `--ignore-cr-at-eol`.

## The work, in order

**1. Read `docs/launch-punch-list.md` first.** This is Damir's list of missing items for
launch. It is already grouped into sections A to N, with a first-pass effort mark on each
item. **The grouping is a starting point, not a plan.** Do this before any build:

- Answer the questions marked `?` with evidence from the code. Sections F, D1, D2, D8, C2
  and I2 all hold open questions. Some may already be done — F1 is the clearest example.
- Ask Damir about item I2. Its text is incomplete.
- Ask Damir for the screen names in handoff item (d).
- Then give Damir a proposed order of work, and wait for him to agree it.

Three items in that list are defects, not polish. Say so when you propose the order:
**E3** (the backup screen does nothing when creating an account), **C7** (the desktop share
button does nothing), and **I1** (a contact cannot be removed).

**2. Then item (a) — the password screen inside the Account pane.** Damir confirmed he wants
it. The handoff proves the route is cheap: the form is already the bundle component
`createEncPassScreen`, and `settings.html` already has `showBackup()` / `showDownloads()`.
Read the warning in the handoff. Do not pin the page back to grid column 1. That is the W7
bug. Use the `encpassInline` capability route.

**3. Item (f) rides with it — rename the label.** Key `changePassword` in
`src/strings/*.json`, 8 locales. New English value: "Change Spixi password". Write the 7
translations yourself; do not leave English in the other locales.

**4. Then items (b) and (c)** — the chat route for a money request, and the live nickname
refresh in the chats list.

**5. Item (d) needs information first.** Ask Damir which screens do not show avatars. Do not
change code until you have the list.

**6. Item (g) is a measurement task, not a build task.** `Utils.imageUriCache` has no limit.
Measure it on a real device before you change it. Rule #294 applies: measure first.

## Rules that apply to every batch

- Verify a plan against the code before you build it.
- Run the #46 loop over any C# that you write: three disjoint read-only auditors, then
  fixes, then a fresh reviewer that tries to break your verdict. Repeat until it is clean.
  Rebuild and run the smoke test between each pass.
- The smoke test must stay green: `node scripts/smoke-test.mjs` gives
  `BASELINE OK — 1435 pass / the 4 KNOWN pre-existers`.
- Add a mutation-honest smoke pin for each fix. Prove that the pin fails when you revert the
  fix. A pin that cannot fail is worse than no pin.
- Damir makes all commits. Do not commit.
- The mount cannot unlink files. Write in place, or use SendUserFile and device_commit_files.
- Add a row to `DECISIONS.md` for every significant decision, when you make it.

## Two things that save time

- A .NET SDK installs in the cloud container:
  `apt-get update && apt-get install -y dotnet-sdk-8.0`. Then Roslyn `csc` over the changed
  files finds every syntax error in seconds. Use it before you hand C# to Damir.
- The full smoke test takes more than 45 s, so the device bridge kills it. Clone the repo in
  the cloud container and run it there.
