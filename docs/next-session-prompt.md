# Next session — paste this

Repo: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`, branch
`redesign/frontend`. Ixian-Core sibling frozen at `097341a`, read-only, must be present.

**Read `docs/release-readiness.md` FIRST — the whole file.** Then `docs/handoff-2026-09-06b.md`,
then DECISIONS **#803** and **#804**, then `docs/opus-review-verdict-session-q.md`.

★ **This is NOT the session that finishes the app, and no single session is.** The build is
feature-complete. What remains is one gate we owe, a small number of fixes that gate names, one
BE engagement, three walks on hardware, and a freeze nobody has scheduled. This session owns
**the gate and the fixes**. It cannot own the walks, the engineer, or the freeze. Say so in your
first reply rather than promising a finish.

---

## Item 0 — verify the baseline in a clean clone before touching anything

Expect exactly: bundle **320 exports** · **18 shells** · smoke **BASELINE OK 4377 / the 3 known
(#136 · M5 · B3)** WITH the sibling (one lower without) · locales **784 ALL CLEAN** · i18n-lint ✓
(6 dev exemptions) · pseudo **9/9** · cs-syntax **138 + 1** ·
`extract-strings` / `build-shells` / `build-legal-docs` `--check` all ✓ ·
`strip-release --check` GATE 1 OK · `smoke-packaged` GATE 2 OK at **4376**.
**Any difference → STOP and say so before building.**

⚠ `build-legal-docs --check` prints 🟡 on **privacy** by design. That is the held Privacy Policy,
not a broken gate. Terms is baked and real (12 147 chars, 20 sections).

---

## Item 1 — ★ THE SECURITY HANDOVER SWEEP. This is the session's point.

`CLAUDE.md` has promised since 2026-08-15 that **the redesign introduces nothing**, and
`docs/security-handover-gate.md` is the gate that proves it. **That sweep has never run.** Only
the per-batch lens and ONE partial pass over #642–#722 have. Until the sweep runs, "we
introduced nothing" is an assertion, not a finding — and it is the sentence the BE engineer is
about to be handed.

The method is in the gate doc. The scope is the **whole delta from the fork point `0e85a4b8` to
HEAD**. One question per finding, and only one: **does this exposure exist at the baseline?**

* **No → we introduced it → we fix it before handover.**
* **Yes → legacy → it goes to him untouched.**

Sweep at least these classes, and derive the list from the DIFF, not from this paragraph
(#798 — a sweep written from the author's list is not yet a sweep):

* every new or changed `ixian:` verb and every `sendUiCommand` push
* every `spixi.*` storage key, and which WebView partition it lives in
* every WebView setting we set or changed, on all four platforms
* every HTML sink (`innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`-shaped calls)
* every network fetch a shell or a handler can start, and what it leaks
* every log line that can carry an address, a filename, a password or a URL
* every filesystem path built from a value the WebView or a remote peer supplied

**Write the census into `docs/security-handover-gate.md`**, in its existing two-column shape, with
`file:line` for each row. A row with no anchor is not a finding.

⚠ Two rules this repo learned the hard way and both apply here: cite by **branch or method**, not
by a line number a later comment will move (#773); and a **refusal** — "we did not introduce X" —
must be written from the cases you did not think of, never from your own list (#798).

## Item 2 — the three rows the gate already names as OURS

These sit in the gate's own "ours — fix before handover" column and are still open. The sweep may
add more; these do not wait for it.

1. **security MAJOR #3** — `Spixi/Pages/Chat/SingleChatPage.xaml.cs:746`. The link-open confirm
   modal is spoofable: `HtmlDecode` runs AFTER the modal shows the pre-decode URL, so the user
   approves one string and the app navigates to another. **We built the modal; legacy had none**,
   so this is ours by the gate's rule even though it is an improvement on nothing.
2. **security MAJOR #6(a)** — `Spixi/Platforms/iOS/iOSWebViewHandler.cs:101`. The global link
   handoff gives **mini-app** content a one-tap, no-confirm Safari launch: no `TargetFrame` test,
   no main-frame test, no MiniAppPage classification. Introduced by our own iOS bring-up.
3. **`spixi.draft.*`** — `src/shells/chat.html`. Our key, holding the user's own unsent
   plaintext, in a `file://` localStorage partition a mini-app may be able to read. The gate says
   fix it **regardless of what the sweep concludes about the partition**.

⚠ #3 above is a design question, not a deletion: drafts are a shipped feature Damir uses. Price
the options (drop the key · move it behind a C# pref push · scope the partition) and
**recommend one explicitly** — do not choose silently.

## Item 3 — correct `docs/be-cutover-brief.md` BEFORE the engineer reads it

The parity audit found **five stale rows** (S5/L4 · S7 · S13 · CO2 — landed, still written as
open). A brief that lies about what is done wastes the one engagement we get. Re-verify each row
against the tree and mark it, and while you are in there confirm the 13 blocker rows are still
blockers.

---

## Gated — do NOT start these until the number exists

**Add contact and Add app** (`HomePage.xaml.cs:826` → `ContactNewPage`, `:832` → `AppNewPage`)
are the same mechanism #804 removed, and Damir reported both stutter. **They are gated on the
§3 measurement in `docs/f5-checklist-session-q.md`,** which has not been taken. If the three
Account rows come back smooth and these still stutter, that is the evidence to build on. If
everything is smooth, something else carried it and the next step is a **systrace, not another
guess** (#294).

★ And one of them is a widening: `ixian:fetch:` is a REMOTE fetch (`MiniAppManager.fetch` →
`extractAppInfo`). Hosting it on the page that also hosts the chats list needs a security-gate
row before a line is written — which is another reason item 1 comes first.

---

## NOT a session, and do not plan one around them

* **The measurement and the walks** — Damir's, on hardware. The §3 gfxinfo protocol; a current
  **iOS** walk (Sessions I → Q have never been on an iPhone); the **iOS-32 thermal parity**
  reading, which is his own stated ship gate and has never been taken.
* **The BE engagement** — the A3 walkthrough, the #232/#523 money review, and his inherited set
  (Android MAJOR #8 · #9 · #234 · cleartext `walletpass` · MAJOR #10 · L6 · S16 residual).
  Walk him through `docs/security-review-for-be-engineer.md` first.
* **The Privacy Policy** — held on three markers. It needs counsel, not a batch.
* **The freeze** — Phase 4's four items are all undone and there is **no store-submission path
  written down at all**: no signing identity, no listing, no review timeline. That is a plan
  Damir owns, and it is the longest pole left.

⚠ **`maxLogCount = 5` → 1 is a FREEZE-TIME flip, not this session's.** The marker at
`Spixi/Meta/Config.cs:94` is real, but five logs are what make a crash reproducible, and there
are three open crash-class rows (AND-25 · AND-27 · iOS-67). Flip it when the walks are done,
not before. The same applies to the live diagnostic sets (`[CDPERF]` · `[SCROLL]` ·
`[PAINTDIAG]` · `[EXCERPTDIAG]` · `ixian:landtabprobe:`) — they retire as sets, at the freeze.

⚠ **iOS-67 must NOT be fixed before its test runs.** Rule #215.

---

## Do NOT

* **B7** — a bot group shows no reactions on the phone while the SAME build passes on Windows.
  Untouched. The discriminator is still owed and is still one minute on the phone: react in a
  NORMAL (non-bot) group.
* **the no-backoff retry loop** (`missing encryption keys`) — its first hypothesis was TESTED
  AND REFUTED (50 keyless seeded contacts produced zero lines). Nobody should look for it in the
  keyless path.
* ⚠ **"wallet-send last" is a FOSSIL.** Send shipped at #523, the legacy pages went at #640, and
  `composeSend` is pushed unconditionally (`HomePage.xaml.cs:1965`). The live constraint is the
  **#232/#523 review gate** — the money delta must not reach users before the BE engineer
  reviews it, and it is enabled in every build today. Do not re-defer the feature; do chase the
  review.
* **security-review MAJOR #8** (the wallet password's `+` → space form-decode). Inherited, on the
  wallet path, and the naive fix locks out every user who already set a `+` password. It goes to
  the engineer with its migration shape, not into a batch.
* **reaction code** and **wallet-send code** — unchanged, per the standing rule.

---

## Rules that bind

Mutate in FULL tar copies, never `cp -al`, and run the COPY's scripts · bundle BEFORE shells ·
the closing number is measured AFTER the last suite edit · every pin declares `stripCode` or raw
and asserts a PROPERTY (#771) · **a distance pin over raw text is defeated by prose — two of the
suite's own pins went red at Session Q's comments and were right to** · a behavioural pin that
stubs the function under test proves nothing · a comment stating an invariant the code does not
enforce is a defect (#772) · `file:line` is a searchable anchor, and a line number is only an
anchor while nothing above it grows — cite by BRANCH or METHOD when a batch is adding comments
(#773) · a refusal, an enumeration or a sweep written from the author's list is not yet a pin
(#798) · chat and any surface rendering untrusted content lives in its OWN WebView (#221) · the
bridge protocol is frozen · ASD-STE100 Simplified Technical English for all output · the commit
is Damir's in GitHub Desktop, never `git add -A` (CRLF churn on ~116 files), nothing pushes from
the container.

**RUN THE #46 LOOP ON OPUS.** Session Q's batch was three deleted tokens, it had already passed
twelve of my own mutations, and the loop still found four MAJORs — two of them in pins I had
mutation-tested myself.

⚠ Two tooling facts worth carrying:
* **jsdom 30 silently ignores the `userAgent` constructor option that jsdom 29 honours.** The
  container installs 30; Damir's `node_modules` has 29. A pin that sets a phone UA the old way
  runs as a DESKTOP on one machine and a phone on the other, with no error. Set it in
  `beforeParse` with `Object.defineProperty(w.navigator, 'userAgent', …)`.
* **jsdom cannot report the URL of a blocked navigation.** `window.location` is unforgeable and
  its `href` descriptor is non-configurable — both verified, not assumed. A behavioural pin can
  count navigation ATTEMPTS, never their targets.

**Build rules:** Windows must be built with F5 in Visual Studio, never `dotnet build` — it does
not stage `MauiAsset` and the app then silently serves the previous build's shell (#663).
Android: `-t:SignAndroidPackage` then `adb install -r`, and verify `lastUpdateTime` before
measuring anything.
