# Next session — paste this

Repo `Spixi`, branch `redesign/frontend`. `Ixian-Core` sibling frozen at `097341a`, read-only,
present if you can reach it. Android device on the cable, Dev/coexist build
(`-p:SpixiDevCoexist=true`) so the seed harness exists.

**Read `docs/handoff-2026-09-08.md` FIRST**, then `DECISIONS.md` **#811**, then whatever Damir
pasted back from `docs/walk-artifact-session-s.html`.

---

## ★ ITEM 0 — READ THE WALK BEFORE YOU PLAN ANYTHING

Session S built no fix on purpose. It built the instrument that decides what the fix should be,
and **row A1 of the walk answers the whole question in one tap**:

| A1 says | then |
|---|---|
| Backup **swaps the whole screen** to a new page | #804 was not in the build he judged. There is nothing to fix. Confirm with B1 and close the row |
| Backup **slides in** and B1's `paint` for Backup / Change password is close to How-to-use's | the screen build is not the cost. The mechanism is outside the WebView — go to §C3 and the meminfo work below, and do NOT redesign a screen |
| Backup **slides in** and its `paint` is 2× How-to-use's | the screen build IS the cost on that device, and `build` vs `paint` says whether it is JS or the frame. Fix what the split names |
| `n=` on the Downloads `list` line is large | build the batch: one `addFiles(json)` push with `clearFiles`/`addFile` kept live (the #801 both-transports pattern), and consider deferring `ixian:loadDownloads` to the END of the slide. Both are specified in #811 §3 |
| `n=` is 0 or tiny | the one measured mechanism is ruled OUT. Say so and close it |

⚠ **The probe is TEMPORARY and a pin holds it in place.** When it has done its job, remove the
probe AND its pin in the same commit.

---

## Item 1 — ★ THE MEMORY KILL. It is the only thing a user is losing work to.

Unchanged and now two sessions old. Android kills the app after about half an hour; Settings
reads 221 MB average, **511 MB maximum**, on a **RELEASE** build (`-c Release
-p:SpixiDevCoexist=true` — the title "Spixi Dev" proves the flag, not the configuration).
`#764` logged 411 MB; #803's paired readings read 292–316 MB PSS.

```
adb shell dumpsys meminfo com.ixilabs.spixi.dev
```

Read the **FOOTER**: the `WebViews:` count and the `Native Heap` / `Dalvik Heap` / `Graphics`
split, at launch and again after the half hour that gets it killed.

* `WebViews:` grows with use → a WebView leak.
* `WebViews:` stays 3–4 while Native or Graphics grows → not WebViews.

★ **The suspect is code:** `SpixiContentPage.Dispose()` sets `disposed = true` and then does
ALL of its teardown — handler disconnect, `Source = null`, layout removal — inside
`if (!Navigation.NavigationStack.Contains(this))`. A page on the stack when `Dispose` runs is
marked disposed and keeps its platform WebView for ever. `#800`'s pre-warm creates a chat page
and re-arms it on every back-out, at a measured ~15 MB each.

**The free discriminator:** `CHAT_SPARE_ENABLED = false`, rebuild, use it for the same half
hour. Kills stop → the pre-warm is the cause and the fix is the disposal, not the flag.

⚠ Rule out the heavy seed first (10 × 1000). On that profile neither number means anything.

---

## Item 2 — the seventh #46 round Session R never ran

CLEAN was never claimed for Session R. Round 6's two MAJORs are fixed and their reproductions
re-run red, but no reviewer saw the fix. One focused reviewer over `LOOPFIX8` and `LOOPFIX9`
closes it.

---

## Item 3 — the stripper class, still open

Session R rewrote `stripCode` as a four-state tokenizer after finding it had hidden **17 live
lines across four files** from every negative sweep in the suite. **123 occurrences of the
naive regex and 26 more local strippers under 17 names remain** across the suite and the
scripts. Each can hide code from the sweep that reads it. Session R called this "the next
session's first list"; two sessions later it is still a list nobody has written.

---

## Rules this project keeps paying for

* **#215 verify first · #294 do not guess.** Session S's whole value was checking a premise
  instead of building against it, and it cost twenty minutes.
* **#798 / #771** — a refusal, an enumeration or a sweep written from the author's list is not
  a pin. ⚠ And the PROSE is the pin's input: Session S's own gate convicted its own file
  because the message named two tokens forty characters apart.
* **★ A measurement with no assertion that its subject changed is a pin with no mutation.**
  Session S's first run reported four perfectly clean screens; two of the clicks had opened
  nothing.
* **Execute what you write.** Every deliverable this session — the shell patch, the two pins,
  the walk artifact — was RUN before it was believed, and the walk artifact was still shipping
  the wrong session label until it was opened in a browser.
* Wipe `obj`/`bin` on any C# or `MauiIcon` change. Windows: **F5, never `dotnet build`**
  (#663). An incremental iOS build does **not** repackage `Raw/html` (#320).
* Never `git add -A` — CRLF churn on ~116 files. The commit is Damir's, in GitHub Desktop.
* ⚠ On this bridge: `smoke-test.mjs` cannot be run (it needs more than the 3 minutes a call
  allows, and a backgrounded run is killed with its call). `grep -c $'\0'` is a **vacuous**
  NUL check — it matches every line; use `tr -dc '\000' | wc -c` with a control. Plain
  `git status` strands a 0-byte `.git/index.lock`; use `git --no-optional-locks`.
