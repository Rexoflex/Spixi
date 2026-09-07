# Next session — paste this

Repo: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`, branch
`redesign/frontend`. Ixian-Core sibling frozen at `097341a`, read-only, must be present.

**Read `docs/handoff-2026-09-07.md` FIRST — the whole file.** Then `docs/release-readiness.md`,
then the final section of `docs/security-handover-gate.md` (the census), then DECISIONS **#805**
and **#806**, then `docs/opus-review-verdict-session-r.md`.

★ **The security handover gate has now RUN.** That was the last thing standing between this app
and the BE engineer. What remains is verification on hardware, one engagement, a short list of
buildable rows, and a freeze nobody has scheduled. **No single session finishes this**; say so
in your first reply rather than promising a finish.

---

## Item 0 — verify the baseline in a clean clone

Expect exactly: bundle **321 exports** · **18 shells** · smoke **BASELINE OK 4613 / the 3 known
(#136 · M5 · B3)** WITH the sibling · locales **786 ALL CLEAN** · i18n-lint ✓ (6 dev) · pseudo
**9/9** · cs-syntax **138 + 1** · `extract-strings` / `build-shells` / `build-legal-docs`
`--check` all ✓ · `strip-release --check` GATE 1 OK · `smoke-packaged` GATE 2 OK.
**Any difference → STOP and say so before building.**

⚠ `build-legal-docs --check` prints 🟡 on **privacy** by design — the held Privacy Policy, not a
broken gate.

---

## Item 1 — ★ the memory kill, and it is the only thing a user is feeling right now

Damir, 2026-09-07: **Android kills the app after about half an hour.** Settings reads 221 MB
average, **511 MB maximum**, on the Dev/coexist build. `#764` logged 411 MB, so it has grown.

⚠ **Do not guess and do not open a redesign (#294).** The instrument is one command, and the
handoff §"NEW" carries the protocol:

```
adb shell dumpsys meminfo io.ixian.spixi.dev
```

Read the FOOTER — the `WebViews:` count and the `Native Heap` / `Dalvik Heap` / `Graphics` split
— at launch and again after the half hour that gets it killed.

★ **The suspect is already in code.** `SpixiContentPage.Dispose()` sets `disposed = true` and then
does ALL of its teardown inside `if (!Navigation.NavigationStack.Contains(this))`. A page on the
stack when `Dispose` runs is marked disposed and **keeps its platform WebView for ever**. `#800`'s
pre-warm re-arms a chat page on every back-out, at a measured ~15 MB each, so a path that used to
run once now runs many times per session.

**The free discriminator costs one token** and it is the same experiment item 5 of the last prompt
has been carrying: set `CHAT_SPARE_ENABLED = false`, rebuild, use it for the same half hour.
Kills stop → the pre-warm is the cause, and **do not just flip the flag** — that discards a
measured win Damir took knowingly (#802). Fix the disposal.

⚠ Rule out the heavy seed first. On a 10 × 1000 profile neither number means anything.

---

## Item 2 — the comment-stripper class, and it is a gate on every sweep you write

Session R found that `stripCode` removed BLOCK comments before LINE comments, so a `/*` inside a
`//` comment blanked live code — **17 live lines across four files, invisible to every negative
sweep in the suite**. A reproduction hid an OS-open primitive behind two ordinary comments with
the whole suite green.

That one is fixed and pinned. ⚠ **The class is not closed: 123 occurrences of the naive regex and
26 more local strippers under 17 names remain** across `scripts/` and the suite. Each can hide
code from whatever reads through it.

Close them the way Session R did: reuse the repaired tokenizer rather than writing an eighteenth,
and pin the property against independent reference strippers so pin and repair share no premise.
⚠ CSS has no `//`, so a CSS stripper is legitimately different — say why in its docblock.

---

## Item 3 — the 27 INTRODUCED rows still open

They are `O-…` in the census, and each names its owner. Three groups:

* **Buildable now, no decision** — the NITs and the hygiene rows. Batch them by surface, not one
  by one, and run ONE #46 loop over the batch.
* **Damir's ruling** — the live wallet balance inside the chat document (`O-01`) is the one that
  matters. The gate rejected the same design for `setTipResult` on ★ #221 grounds. Either it goes,
  or it gets a gate row with the depth the tip refusal got.
* **One device test each** — chiefly `O-03`: do a mini-app document and a shell share one
  `localStorage` origin on Windows? Open a mini-app, and in its WebView2 dev tools evaluate
  `localStorage.length` and `localStorage.getItem('spixi.pins')`. That one answer moves four rows.

---

## Item 4 — the rows that are ours, buildable, and need no decision

`docs/release-readiness.md` §3. Read it THERE and re-verify each row against the tree — several
docs it draws on have been stale, and at least six briefed plans have been defective (#297, #301).
Lead with the **i18n residual (M13)**: surfaces still render English under a chosen locale, and
both lint gates have been proven blind to that class (#269), so a green gate is not evidence.

⚠ Batch by surface, not by platform. One #46 loop over the whole batch.

---

## NOT a session, and do not plan one around them

* **The walks** — Windows and Android F5 of Session R (`docs/f5-checklist-session-r.md`), and a
  current **iOS** walk. Sessions I → R have never been on an iPhone, and Session R changed the iOS
  capture gate, the iOS content rules and the iOS storage partition. That walk is now overdue in a
  way it was not before.
* **The BE engagement** — the #232/#523 money review (the compose surface is live in every build
  today), and his inherited set. Walk him through `docs/security-review-for-be-engineer.md` first;
  it gained nine rows this session.
* **iOS-32 thermal parity** — Damir's own stated ship gate. Never measured.
* **The Privacy Policy** — held on three markers. Counsel, not a batch.
* **The freeze** — Phase 4's four items are all undone, and there is still **no store-submission
  path written down anywhere**: no signing identity, no listing, no review timeline.

⚠ **`maxLogCount = 5 → 1` is a FREEZE-TIME flip**, and the pin no longer blocks it — Session R
made the contract "5 with the marker, or 1 without, and no other pair". The live diagnostic sets
(`[CDPERF]` · `[SCROLL]` · `[PAINTDIAG]` · `[EXCERPTDIAG]` · `ixian:landtabprobe:`) retire as sets,
at the freeze.

⚠ **iOS-67 must NOT be fixed before its test runs.** Rule #215.

---

## Rules that bind

Mutate in FULL copies and run the COPY's scripts · bundle BEFORE shells · every pin declares
`stripCode` or raw and asserts a PROPERTY (#771) · **a distance pin over raw text is defeated by
prose** · a behavioural pin that stubs the function under test proves nothing · a comment stating
an invariant the code does not enforce is a defect (#772) · cite by BRANCH or METHOD, never a bare
line number (#773) · **a refusal, an enumeration or a sweep written from the author's list is not
yet a pin (#798)** · chat and any surface rendering untrusted content lives in its OWN WebView
(#221) · the bridge protocol is frozen · ASD-STE100 Simplified Technical English for all output ·
the commit is Damir's in GitHub Desktop, never `git add -A` (CRLF churn on ~116 files).

★★ **THE TWO RULES SESSION R PAID FOR, and they cost six rounds:**

1. **A negative sweep IS an author's list, always.** "No other X exists anywhere" cannot be proven
   from text — three rounds each lost the next spelling (a keyword, a type name, a method name).
   The escape is to prove a POSITIVE property over a small slice: *inside this branch, the only
   call is the gate*. That caught reflection and a wrapper helper on its first run.
2. **When a reviewer finds the same class of defect twice, stop patching and question the design.**
   The design change closed in one round what three patches could not.

★ And one more, from the census: **a census is a snapshot, and a snapshot taken mid-batch is stale
before anyone reads it.** The doc pass belongs after the last fixer, and its summary must state the
commit and the smoke number it was derived from.

**RUN THE #46 LOOP ON OPUS.** Session R's loop found MAJORs in every round, including two inside
the tool every other finding was measured with.

**Build rules:** Windows must be built with F5 in Visual Studio, never `dotnet build` — it does not
stage `MauiAsset` and the app then silently serves the previous build's shell (#663). Android:
`-t:SignAndroidPackage` then `adb install -r`, and verify `lastUpdateTime` before measuring
anything.
