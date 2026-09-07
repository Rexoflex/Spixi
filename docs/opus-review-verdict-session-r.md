# Opus #46 verdict — Session R (the security handover sweep and its fix batch)

Run 2026-09-06/07, in a cloud container on a clean clone plus the session's uncommitted delta.
Three disjoint READ-ONLY auditors on Opus, then a fix pass, then a FRESH break-my-verdict
reviewer — repeated. Six rounds.

| round | verdict | what it found |
|---|---|---|
| r1 (three auditors) | NOT CLEAN | 3 MAJOR |
| r2 | NOT CLEAN | 1 MAJOR |
| r3 | NOT CLEAN | 3 MAJOR |
| r4 | NOT CLEAN | 1 MAJOR, 3 MINOR |
| r5 | NOT CLEAN | 1 MAJOR, 3 MINOR |
| r6 | NOT CLEAN | 2 MAJOR, 4 MINOR, 2 NIT |

Every finding was fixed. **CLEAN is not claimed**: round 6's two MAJORs are closed and their own
reproductions were re-run RED, but no seventh round reviewed that fix.

---

## The three MAJORs of round 1

**A · security MAJOR #3 was not closed, and the gate said it was.** The first fix deleted
`WebUtility.HtmlDecode` from both `openLink` branches and claimed the opened string was now
byte-identical to the string the confirm modal displayed. The second decode was already there, on
line one of the same method: `HttpUtility.UrlDecode(e.Url)`. A peer message
`https://paypal.com%40evil.example/login` was shown verbatim and opened as
`https://paypal.com@evil.example/login`, host `evil.example`. ⚠ The reviewer found it is one step
worse: the LITERAL `@` form was also a working spoof, and removing the second decode never touched
it.

**B · the iOS capture gate added a test whose value on iOS was never established.** It refused
unless `WKSecurityOrigin.Protocol` was `""` or `"file"`. If WebKit returns `"null"` for an opaque
`file://` origin, the QR scanner is dead — a feature that took five device rounds to make work.
The test bought nothing, because `isScanDocument` reads the same fact from a traceable value.

**C · the peer-forget helper never ran on five removal paths**, because those C# handlers push
nothing back. Leave group and Delete chat history from the contact or group info surface still left
the user's own unsent plaintext draft and the peer's address in nine key names. ★ The pin could not
see any of it: it derived its subjects from PUSH names, so a path that pushes nothing could never
enter the walk — #798 on the wrong axis. A later pass found a **sixth** path, a full history wipe,
which the reviewer's own grep could not see either.

---

## ★★ The pattern the loop is really about

The pin protecting the link-spoof fix was rebuilt three times, and a fresh reviewer defeated every
version, **because each one proved a NEGATIVE by matching ONE SPELLING**:

| round | what the pin matched | what walked past it |
|---|---|---|
| r2 | a 400-character window after the guard | a neighbouring `return;` satisfied it while the guard did nothing |
| r3 | the keyword `if (`, one space | a sink written `if(`; also a `#if`-fenced guard, and the hand-off moved INSIDE the guard's own body |
| r4 | the TYPE name `Browser` / `Launcher` | a private helper, a local variable holding `IBrowser`, `using static` |
| r5 | the METHOD name `OpenAsync` | `UIApplication.SharedApplication.OpenUrl`, and `SFileOperations.open` — which `SingleChatPage` already calls twice in the same file, and which on Windows is `Process.Start(UseShellExecute = true)` |

Each version was narrower than the class it claimed to close. Two of the escapes re-opened a
security MAJOR with the whole suite green, exit 0.

**The fourth attempt changed the design.** Every external link the app opens now goes through ONE
gate, `Utils.openExternal`. The pin proves a POSITIVE, branch-scoped property: inside each
`ixian:openLink:` dispatch branch, and inside the iOS external `http(s)` branch, the only method
call is the gate. A negative sweep over the OS-open primitives rides with it, with its permitted
homes named and its blind spot stated in its own message.

That property killed **reflection** and a **wrapper helper** on its first run. No amount of
pattern-widening would have caught either.

★ The rule: **a negative sweep IS an author's list, always.** The only escape is to prove a
positive property over a small slice.

---

## ★★ And then the loop found the instrument

Rounds 5 and 6 found that `stripCode` — the helper most of the suite's raw sweeps read through —
removed BLOCK comments before LINE comments. So **any `/*` inside a `//` comment opened a fake
block comment** and blanked everything to the next `*/`.

* **17 live lines across four files** were invisible to every negative sweep: three `ThemeManager`
  methods, a `launch-shell.js` constant, and the same line in both generated bundles.
* A reproduction hid an OS-open primitive with `UseShellExecute = true` behind two ordinary
  comments. The whole suite reported `BASELINE OK`, exit 0.
* ⚠ The first repair fixed the LITERAL half only, and the file it named was still cut.

It is now a one-pass four-state tokenizer. Its pin compares it against **three independent naive
reference strippers**, so the pin and the repair share no premise. Two sibling strippers were
deleted in favour of it.

⚠ **The class is not closed file-wide.** 123 occurrences of the naive regex and 26 more local
strippers under 17 names remain across the suite and the scripts.

---

## Other findings worth carrying

* The census itself reported **16 rows OPEN that the batch had already closed**, because the doc
  pass ran BETWEEN the two fix batches. ★ A census is a snapshot, and a snapshot taken mid-batch is
  stale before it is read. It must state the commit and the smoke number it came from.
* The app-invite privacy gate **failed open**: C# admitted an icon on `StartsWith("http")`, which
  takes `http:/host/x.gif` with one slash; the shell's gate tested `/^https?:\/\//i`, failed it,
  classified it as LOCAL — and local is never gated. The browser then normalised it back.
* **Nine of the loop's own pins were found vacuous by the next reviewer**, several of them pins
  their author had already mutation-tested.
* Five separate times, a correction introduced a NEW false claim in the comment it was fixing.

---

## Verdict

**Six rounds, every finding fixed, CLEAN not claimed.** Round 6's two MAJORs are closed and their
reproductions re-run RED. One focused reviewer over `LOOPFIX8` and `LOOPFIX9` would close the
verdict.

★ The rule this loop paid for is the one it opened with (#798), and it paid at the level of the
pins rather than the code — three times. The rule that finally ended it is older: **when a reviewer
finds the same class of defect twice, stop patching and question the design.**
