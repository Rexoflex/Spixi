# Next session — paste this

Repo `Spixi`, branch `redesign/frontend`. Motorola on the cable, Release + coexist
(`-c Release -p:SpixiDevCoexist=true`). Ixian-Core sibling frozen at `097341a` if reachable.

**Read `docs/handoff-2026-09-08b.md` FIRST**, then `DECISIONS.md` **#811–#820**.

**The goal for this session, in Damir's words: finish the remaining jank and finalize the
Android version.**

---

## Item 0 — commit Session S if it is not already in

~92 files, walked **28 P / 0 F**. Message in `docs/commit-message-session-s.txt`.
⚠ `git add` the new docs and `docs/sheets/session-s/`; never `git add -A`.

---

## ★ Item 1 — the i18n drafting gate. Build the pin BEFORE the six strings.

Six keys are the English string in **all twelve** locales:

```
spixiAddressSub · peerAddressTitle · peerAddressBody
peerQrLabel     · removeContactOpt · removeFailedToast
```

They are absent from every `src/strings/draft/*.json` — added after the last drafting round,
so `build-locales` silently fell back to English twelve times over.

**Filling them is the small half. The gate is the point**, because the next key added after a
drafting round does this again and nothing notices.

The property, and it is narrow enough to be honest: *a key that is English in ALL twelve
locales AND missing from every draft file is a translation that never happened.* Today nine
keys are English in all twelve — two are correctly untranslatable (`appUrlPlaceholder`,
`gif`), one is a phantom, six are the defect. The allow-list must be **explicit and short**,
each entry carrying its reason (#798: derived, not the author's list).

⚠ Do NOT make `verify-locales`'s "still-English" count a failure. Most of it is legitimate —
"Apps", "Wallet", "Status" are the same word in German. That is why this defect survived.

Then fill the six, in the seven locales that have draft files.

⚠ And drop the phantom: `someKey: "fallback"` is a docblock EXAMPLE in `settings-app.js`
(`strings.someKey || 'fallback'`) that `extract-strings` scraped as a real reference. Fix the
sweep so a doc example cannot become a key, not just the one symptom.

---

## Item 2 — the last jank screen: Add contact / Add app

The Account rows are closed (#820: 9–15 ms to glass on his device). **This is the same
mechanism #804 cured, on the two screens nobody has migrated** — Damir reported it
2026-09-06 and it is priced in `docs/handoff-2026-09-06b.md`.

★ Verify before building (#215), the way #804 was: does the screen still push a page with its
own WebView, and does the shell already have a route for it? Six questions, six answers in
the tree, before a token moves.

---

## ★ Item 3 — the Android memory kill. The only thing users lose work to.

Unchanged and now three sessions old. **~30 minutes, 511 MB max, on a Release build.**

```
adb shell dumpsys meminfo com.ixilabs.spixi.dev
```

Read the **FOOTER**: `WebViews:` count and the `Native Heap` / `Dalvik Heap` / `Graphics`
split, at launch and again after the half hour that gets it killed.

* `WebViews:` grows with use → a WebView leak.
* `WebViews:` stays 3–4 while Native or Graphics grows → not WebViews.

★ **The suspect is code:** `SpixiContentPage.Dispose()` sets `disposed = true` and then does
ALL of its teardown inside `if (!Navigation.NavigationStack.Contains(this))`. A page on the
stack when `Dispose` runs is marked disposed and keeps its platform WebView for ever. #800's
pre-warm re-arms a chat page on every back-out, ~15 MB each.

**The free discriminator:** `CHAT_SPARE_ENABLED = false`, rebuild, use it for the same half
hour. Kills stop → the pre-warm is the cause and the fix is the disposal, not the flag.

⚠ Rule out the heavy seed first (10 × 1000). On that profile neither number means anything.

---

## Item 4 — the Android defect list, to finalize the platform

Two crashes nobody has characterised, and they need a logcat AT the repro, not after:

* **AND-25** — remove-contact throws a fatal exception, reproducible.
* **AND-27** — mic denied → re-asked natively → **no call screen appeared at all**.

Then the small ones: **AND-28** (existing contacts show no avatar) · **AND-30** ("Add contact"
offered for someone who already is one) · **AND-36** (rotation leaves a row highlighted) ·
**AND-37** (back over an Account sheet lands on Chats) · the four landscape rows
(**AND-31/32/33/34**) · **AND-35** (chat-appearance copy + order).

---

## Item 5 — the two one-liners that are release blockers

* **`maxLogCount = 5 → 1`** in `Spixi/Meta/Config.cs`. It carries its own
  `RELEASE BLOCKER — REDUCE TO 1 BEFORE LAUNCH` marker, and GATE 23 asserts the legal PAIR
  (5 with the marker, or 1 without it), so the flip edits that one file.
* **Retire the diagnostic probes** — `[CDPERF]` (including this session's
  `settings-sub`, which has done its job), `[SCROLL]`, `[PAINTDIAG]`, `[EXCERPTDIAG]`,
  `landtabprobe`. Each comes out **with its pin**.

---

## Rules this project keeps paying for

* **#215 verify first · #294 do not guess.** Session S's whole value was checking a premise
  instead of building against it, twice.
* **#772 — a comment stating an invariant the code does not enforce is a defect.** Session S
  converted three of them into pins, and refused a fourth that told it to delete live code.
* **#798 / #771 — a refusal, an enumeration or a sweep written from the author's list is not
  a pin.** Three distance-window pins convicted correct code this session.
* ★ **A measurement with no assertion that its subject changed is a pin with no mutation.**
  Two instruments reported clean results this session while measuring nothing.
* ★ **A sweep is only as wide as the surfaces it visits.** The pseudo-locale crawl found "no
  leaks" on surfaces it never opened; the walk's free row found them in one tap.
* ⚠ **Stale staged artifacts bit twice.** After a rebuild, re-stage before re-measuring, and
  assert a computed value rather than trusting a screenshot.
* Windows: **F5, never `dotnet build`** (#663). An incremental iOS build does **not**
  repackage `Raw/html` (#320). Wipe `obj`/`bin` on any C# change.
* ⚠ On this bridge: `smoke-test.mjs` cannot run (>3 min per call, and a backgrounded run dies
  with its call). `grep -c $'\0'` is a **vacuous** NUL check — use `tr -dc '\000' | wc -c`
  with a control. Plain `git status` strands a `.git/index.lock`; use `--no-optional-locks`.
