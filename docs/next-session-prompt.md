# Next session — paste this

Repo: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`, branch
`redesign/frontend`. Ixian-Core sibling frozen at `097341a`, read-only.

**Read `docs/handoff-2026-09-06.md` FIRST.** Then DECISIONS #800, #801, #802, #803.

**Item 0 — verify the baseline in a clean clone before touching anything.** Expect exactly:
bundle 320 · shells 18 · smoke **BASELINE OK 4362 / the 3 known (#136 · M5 · B3)** WITH the
sibling (4361 without) · locales **784 ALL CLEAN** · i18n-lint ✓ (6 dev exemptions) · pseudo
9/9 · cs-syntax 138 + 1 · `extract-strings`/`build-shells`/`build-legal-docs` `--check` all ✓ ·
`strip-release --check` OK (gate 1) · `smoke-packaged` OK (gate 2, 4359). Any difference → STOP
and say so before building.

**Item 1 — the numbers are IN. Do not re-take them.** Session P's levers were measured on the
phone on 2026-09-06: `attach spare=1 tap=0ms` on 10/10 · `present t=` 300/409 → 67–262 ms ·
`batch=1` on every open · the pre-warm costs ~15 MB PSS and ships ENABLED. Read
`docs/f5-checklist-session-p.md` §3 and DECISIONS #803 before proposing any change to either
lever. ⚠ #799's `chats-after-close` frame probe is **RETIRED as unfit** — three captures of the
same build spanned `drop=` 1..11. Do not use it as an acceptance test; build the counterfactual
(a `git stash` build of the parent, same phone, same seed) instead.

**Item 2 — the real target: the Account WebView-boot jank (#803). ★ CONFIRMED BY MEASUREMENT on a
fresh, EMPTY account (2026-09-06 evening): 12.19 % janky frames over one minute of Account sublevel
opens, against a 2.00 % baseline on the same profile, with the GPU idle (99th 11 ms) — zero
contacts, zero chats, zero messages, phone cool. The data, the memory and this branch are all ruled
OUT on evidence. Beat 12.19 % / 99th 48 ms empty, and 21.66 % / 99th 150 ms on a heavy seed. ★ The chats list is EXONERATED — scrolling 50 rows and opening 3 chats reads 4.09 % janky / 90th 8 ms on the same profile, so row count is NOT what made Damir's real account scroll badly; that is a separate, narrower question about live network activity. Full ladder in the handoff.** Damir's own discrimination
named it: *"backup and password stutter, how-to-use and about open just nicely."* Exactly three
Account entries `pushPageLoaded` a NEW page with its OWN WebView —
`Spixi/Pages/Settings/SettingsPage.xaml.cs:383` (EncryptionPassword), `:489` (BackupPage),
`:501` (DownloadsPage). How-to-use and About are in-hub sublevels in the already-open settings
WebView and are smooth. Each of the three pays a cold **130–230 ms** Chromium boot + parse on the
main thread, and `dumpsys meminfo` reports `WebViews: 3` in ONE pid with **no `:sandboxed_process`
rows** — WebView is **in-process** on this device, so every shell boot competes with the UI it is
animating. #800's pre-warm is the cure, already built, pinned and priced; this is pointing it at
three more shells (`settings_encryption.html`, `settings_backup.html`, `downloads.html`) and
paying the memory for however many spares are held at once. **Measure that memory the same way:
paired A/B inside one process, never across builds.** Ask Damir for the ranking before building —
one shared spare, three, or a cheaper answer (a warmed WebView pool) are different products.

**Item 2b — ⚠ THE PHONE WAS HOT during every capture in Session P, and it was never controlled
for.** Read `docs/handoff-2026-09-06.md` §"Two things found at the END" before trusting any absolute
number in the checklist §3. Also there: a no-backoff retry loop (`missing encryption keys`, nine at
a time every ~2.5 s, forever) in Damir's own Windows log — a candidate for heat and battery,
predating this branch. ⚠ Its first hypothesis was TESTED AND REFUTED the same evening: a fresh
account seeded with 50 KEYLESS contacts and ~11 600 messages produced ZERO such lines. Keyless
contacts are not the trigger; do not start there. Read `dumpsys battery | temperature` at the start and end of every
future perf capture.

**Item 3 — two open rows from Walk P, both needing a measurement before any code.** (a) **B7**: a
BOT group shows no reactions ON THE PHONE — and ★ the SAME build passes it on WINDOWS. One binary,
two devices, two answers: this is room/account state, not code, and not the batch (B6 passed on the
phone). Discriminator first, on the phone: react in a NORMAL group. ⚠ `case "like"` drops the tap
silently when `friend.addReaction` returns false; if this is investigated, give it a stamp before
giving it a fix. (b) **the sporadic stutter**: run `adb shell dumpsys gfxinfo
com.ixilabs.spixi.dev` on the heavy seed. Janky-frame percentage plus the 50/90/95/99 shape says
whether it is GC or one long main-thread stall. ⚠ Memory is NOT the mechanism — `TOTAL SWAP PSS`
was 224 KB, so the device is not swapping; the app-info "maximum" is a high-water mark that only
grows.

**Then, in Damir's order:** whatever he ranks next. Candidates already designed or deferred:
B2 (prepend on load-more — the shell contract is complete, the C# half is not), B4 (the load
window, his dial), ⛔ #779 (parked with the lead), the `[CDPERF]` retirement (one batch, nine
pieces, pinned as a set).

**Rules that bind the work:** mutate in FULL tar copies, never `cp -al`, and run the COPY's
scripts · bundle BEFORE shells · the closing number is measured AFTER the last suite edit ·
every pin declares `stripCode` or raw and asserts a PROPERTY (#771) · a behavioural pin that
stubs the function under test proves nothing · a comment stating an invariant the code does not
enforce is a defect (#772) · file:line is a searchable anchor (#773) · `onNavigating` cancels
FIRST and re-allows only `file:` (#797) · **a refusal, an enumeration or a sweep written from
the author's list is not yet a pin (#798, and the rule that closed the #802 loop)** · the commit
is Damir's in GitHub Desktop, never `git add -A`, nothing pushes from the container.

**If a #46 loop runs: run it on Opus.** Session P's rounds 1–12 ran on the session's own model
and the thirteenth round, on Opus, still found a MAJOR the other twelve had walked past.
