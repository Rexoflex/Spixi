Read `docs/handoff-2026-08-15.md` first. It is the live state. Then read
`docs/f5-findings-2026-08-14.md` — that is the work list, 19 findings from a Windows and
Android F5 pass, each already triaged with file:line evidence. Do not re-derive them.

Write all output in ASD-STE100 Simplified Technical English. This applies to chat, docs,
code comments and commit messages. See the language rule in `CLAUDE.md`.

Verify the state before you plan anything. Handoffs in this project have been wrong about
the commit state more than once. Check `git --no-optional-locks log --oneline -3` and
`git --no-optional-locks status --porcelain` yourself. Expect two committed cleanup
commits on top of `7c9ed942`, and the #346 + #347 batch UNCOMMITTED in the working tree.

Set up a cloud twin first. The Windows working tree is mixed CRLF and
`scripts/build-demo-bundle.mjs` cannot parse a CRLF component, so it fails on Damir's PC.
Clone the twin and do all building and testing there:

```
git clone --depth 1 https://github.com/Rexoflex/Spixi.git
git fetch --depth 30 origin redesign/frontend && git checkout FETCH_HEAD
npm install jsdom --no-save
```

Ship results back as a tarball through `SendUserFile` plus `device_commit_files`, then
`tar xzf --overwrite` on his machine. The mount CANNOT unlink, so never rely on
`git checkout -- .` there.

## FIRST ACTION — settle W1 and W10

Two F5 failures are probably stale packaged assets, not real defects. Every item that
failed is a change inside a shell; every visual item that passed comes from the external
files added by #345; `obj/bin` was not wiped before that F5. The probe is in the handoff.
Ask Damir to run it before you plan anything, because a positive result removes two items
and changes what "W10" even means.

## The work, in order

0. **W15** — desktop create/restore render full width. `src/shells/launch.html` has no
   width rule at all and is the source for five built files, so one cap fixes create,
   restore, retry and the onboarding tail. These are art-directed screens: cap the
   CONTENT column, leave the hero illustration and gradient alone.
1. **W14** — delete account and delete wallet must ALWAYS return to the welcome screen,
   and the app FROZE. The freeze outranks everything else on the list. The routing half
   is known (punch-list E1); the freeze is new and unexplained.
2. **W2** — the Account save control does nothing. Both halves look wired (C# pushes the
   `settingsApply` cap and handles `ixian:apply:`; the shell has the handler and sends
   it), so find where it actually breaks before changing anything. Damir asked what it
   SHOULD do: the recommendation on record is auto-save with a "Saved" toast and no
   check icon.
3. **A9** landscape Account pane · **A7** FAB residue rectangle and the "Contacts" title
   that should read "New chat".
4. **W4a** · **W9** (desktop only — it stays on mobile) · **W11** · **W8** — cheap and
   certain, see the findings doc.
5. **A5 / W4b** — the centre-out row fill. Its own unit. Damir does NOT want press
   feedback removed; he wants this instead of the current flat tint.
6. **W1** — the chat-info treatment, only after a measurement says what it waits on.
7. **D1 reply-to** — ★ DESIGN LOCKED by Damir on 2026-08-15, and no longer BE-blocked.
   Read the D1 section of the findings doc in full before you plan it. In short: no
   protocol change, the reference rides in the body as a message ID, the quote is
   resolved LOCALLY and its text is never sent, and tapping the quote jumps to the
   referenced message. Three small C# pieces; the FE half is already built behind
   `bridge.cap('reply')`. Verify the two-device id round-trip BEFORE building (#215).

## Rules that apply to every batch

* Verify a plan against the code before you build it. A recent loop found six briefed
  plans defective, two of which would have shipped something worse than the stub.
* ★ Measure before you optimise (#294). This project has paid twice for guessing.
* Zero C# unless you have evidence (#215). Ixian-Core is NOT in this repo.
* Smoke must stay green: `node scripts/smoke-test.mjs` → `BASELINE OK — 1540 pass / the 4
  KNOWN pre-existers`.
* Add a mutation-honest pin for every fix and PROVE it fails when you revert the fix.
  Three pins in the last batch were dead on first write and only mutation testing caught
  them.
* bundle BEFORE shells, always.
* Damir makes all commits. Do not commit unless he asks.
* Add a row to `DECISIONS.md` for every significant decision, when you make it.
* Run the #46 adversarial loop on anything substantial: disjoint read-only auditors →
  fixes → a FRESH reviewer told to break your verdict → repeat until clean. The last one
  found three MAJORs in its own fixes.

## Two things that save time

* A .NET SDK installs in the cloud container: `apt-get install -y dotnet-sdk-8.0`.
  Roslyn `csc` over the changed files finds syntax errors in seconds. NuGet is NOT
  reachable, so compile against the shared framework with `-nostdlib` and explicit `-r:`
  references if you need to run something.
* The full smoke test takes more than 45 s, so the device bridge kills it. Run it in the
  twin.
