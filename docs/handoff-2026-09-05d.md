# HANDOFF — AFTER SESSION N (2026-09-05): committed, walked, captured · the next session

★★ **This file SUPERSEDES `docs/handoff-2026-09-05c.md`** (archived as
`docs/archive/handoff-2026-09-05c-session-n.md` — Session N's full detail lives there and in
DECISIONS #789–#797; nothing from it is still open except what §2 lists). Read this whole
file, then **DECISIONS #789–#797**, then `docs/cdperf-2026-09-05-session-n-capture.md` before
anything perf, then `docs/prewarm-chat-spec.md` if the pre-warm is on the plate, and — before
touching the present machinery, the gates, the pins or anything animated — the Sessions I–K
verdict in `docs/opus-review-brief-sessions-i-k.md` §Verdict. #771 · #772 · #773 still stand.

## 0 · State — everything is COMMITTED

```
HEAD 056a59eb  Walk N (Android) + the [CDPERF] capture + the undeletable group (#796–#797)
     aeee3bdc  Session N — the legacy purge · the perf instruments · the strip fork (#789–#795)
     b37083a3  (the clone Session N started from)
Ixian-Core sibling at 097341a, untouched. Working tree CLEAN. _to_delete/ gone.
```

Baseline the next session must reproduce (clean clone, Linux container, `npm i jsdom
tree-sitter tree-sitter-c-sharp playwright-core`, Ixian-Core sibling PRESENT):

```
bundle 321 · shells 18 · smoke BASELINE OK 4132 / the 3 known (#136 · M5 · B3)  ← WITH the sibling
                        (one fewer without it — the M1 hold-out gate, #748; record which)
locales ALL CLEAN 786 · i18n-lint ✓ (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 138 clean + 1 known gap
extract-strings --check ✓ · build-shells --check ✓ · build-legal-docs --check ✓ (terms baked · privacy HELD 🟡)
strip-release --check ✓ (gate 1) · smoke-packaged ✓ (gate 2)
```

## 1 · What the two commits hold (one paragraph each; the rows have the rest)

**#789–#795, Session N.** The last four legacy documents, three C# pages, `css/ libs/ fonts/`,
`js/*` except `html5-qrcode.min.js`, `hasLegacyPageChrome`/`rethemesByPush` and ~60 images
DELETED, every route re-proved (Raw/html 15 → 7.7 MB; the APK's `assets/html` measures 7.0 MB).
The smoke suite is the reachability gate now. Two TEMPORARY `[CDPERF]` instruments (per-file
parse · one bridge round trip). The comment-strip fork = a Release packaging step with two gates
(`strip-release.mjs --check` · `smoke-packaged.mjs`); **its MSBuild leg is VERIFIED — gate 1
ran against the Signed Release APK and printed GATE 1 OK.** The SVGO doodle rendered for
Damir's eye (not landed); the pre-warm designed (not built).

**#796, the capture (3 opens, Motorola, Release + dev-coexist).** rtt **3–4 ms → #781 dropped
forever** · strings **4–5 ms → L2 dropped** · L1/L3 hold ≤ ~12 ms, not now · the pre-warm moves
~180 ms (create 72–79 + parse 102–109) of a ~315 ms open · **new: drain → painted is 96–126 ms
while the shell needs 26–38 ms — the Android WebView eval QUEUE (~12 serial evaluates per open)
is 60–90 ms → #298's batch transport (`addMessages` + `messagesDone`) is the second lever.**
Expected after both: an open in the ~70–90 ms band.

**#797, the undeletable group (found on the walk).** Core throws when a leave notice has no
route (the group's owner is not a contact); `SContacts.leaveGroup` ran the send BEFORE the
removal with no try; `ContactDetails.onNavigating` cancelled its navigation only at the tail,
so Android loaded `ixian:leave` as a page ("Webpage not available"). Send in a try, removal
after it; ContactDetails cancels FIRST and re-allows only `file:`; **`sendLeave` has ONE call
site now.** Six mutations, all killed. Not a Session N regression — #248/#567 code, first
reached by the delete-everything order.

**Walk N, Android: 15 P · 0 F · 9 N/A** (A10 not reproducible · A14/C1/C2 measured from the
container · B1/B2 = the capture · B3 two-device · B4 not built · C5 = a Debug build). Windows:
"works as well, tried most." The walked artifact, checklist and commit message are archived
(`docs/archive/*session-n*`).

## 2 · Still open — the whole list

- **D1–D4 (Damir, one word each):** doodle SVGO land/keep (the sheet stays live at
  `docs/sheets/session-n/doodle-svgo-sheet.png`, the candidate beside it) · lossy PNGs
  render/no · `contacts-es.svg` convert/keep · the four Session M dials
  (`docs/walk-session-m-results.md`).
- **Cancel-first in `WalletSentPage` · `LockPage` · `LaunchPage`** (#797's class: they set
  `e.Cancel` only at the tail; two lines each; wallet and lock paths → do it WITH a device
  walk, not blind).
- **The #788 `[CDPERF] present <page> by=paint|timer` line** — one temporary line in
  `presentPreload`, phone-only.
- **The owed #46 loops** — Session M (never reviewed; it changed the present path every
  load-then-present page shares) and Session N's C# + #797 (the in-session loop covered the
  strip and the purge; navigation and a leave path earn the separate one).
- The M queue's tail (unchanged): RAM (#764/#778 BE row) · the group-avatar device fact · the
  TG-order chat-info rebuild · URL previews / privacy wording / "X left the group" · iOS rows ·
  release hardening LAST (retire every `[CDPERF]` line incl. the Session N pair, `[LANDTAB]` ·
  `[EXCERPTDIAG]` · `[SCROLL]` · `[KBTRAY]` · `[WV2]` · `[WEBVIEW]` · the console mirror ·
  `maxLogCount=5` · `SpixiDevCoexist` · the keystore).

## 3 · The next session, in order (also `docs/next-session-prompt.md`)

0. **THE OWED #46 LOOPS** (§2) — a CLEAN verdict before any build item, as Session L did.
1. **THE PRE-WARM BUILD** per `docs/prewarm-chat-spec.md` — with the phone in the room: the
   chats-list frame probe BEFORE (`CdperfFrameProbe` for 600 ms after every chat close), the
   seven pins from spec §5, the measurement plan §6, a #46 loop AFTER. Its before-number is
   #796. ⛔ #779 (the retained warm WebView) stays parked with the lead.
2. **THE BATCH TRANSPORT** (#298 §1–§4, `docs/chat-transport-spec.md`): `addMessages` +
   `messagesDone` for the load burst — the eval queue's measured 50–70 ms. Small C#, shell
   idempotent on both transports. Measure with the same stamps.
3. Damir's D rulings whenever he gives them; the SVGO land is `cp` + `generate-chat-pattern`
   + `build-shells` (−135 KB per chat open).
4. Gate 2 recorded per release; next allowlist candidate `spixi.base.css` after one release on
   tokens alone. JS stays OFF the list.
5. The M tail; release hardening LAST.

## 4 · The render harness (unchanged from Session N)

`/tmp/render/harness.mjs` in the container — Playwright over the pinned Chromium under
`/opt/pw-browsers`, `--allow-file-access-from-files`; boots the BUILT shell from `file://`,
432×900 @2.5, Android UA, Roboto forced via an init-script `<style>`, theme via
`colorScheme` + `spixi.appearance`; pushes through `executeUiCommand(window[name], …b64)`
(`addMe(id, address, nick, avatar, text, time, sent, confirmed, read, paid, errorSending)` ·
`addThem(id, address, nick, avatar, text, time, …)`). Keep `page.on('pageerror')`.
`addInitScript` takes ONE argument object. Rebuild it from these notes — the container is gone.

## 5 · Rules and workflow

Clean-clone gates in a Linux container; say whether the Ixian-Core sibling was present ·
mutate in FULL tar copies, never `cp -al` · bundle BEFORE shells, always · measure the closing
number AFTER the last suite edit · render on the real shells before Damir rebuilds · measure on
device before any fix (#215) · every pin declares `stripCode` or raw (#771); a behavioural pin
that stubs the function under test proves nothing · a comment stating an invariant the code
does not enforce is a defect (#772) · `file:line` is a searchable anchor, never a number (#773)
· a reference graph is built from what LOADS, never from what MENTIONS · a size pin's headroom
is quoted in the pin's own unit · a gate that compares against its own transform needs
post-conditions independent of the transform · a slice needs an END anchor and a guard ·
**an onNavigating handler cancels FIRST** (#797: a throw after a late cancel is a page load on
Android).

Bridge: `device_commit_files` for deliveries (LF, NUL-swept first); `git --no-optional-locks`
on his tree; the bridge cannot `rm` — `mv` to `_to_delete/`; never `git add -A`; the commit is
Damir's in GitHub Desktop; nothing pushes from the container. PowerShell for Damir: ONE command
per block. The Write tool round-trips a backslash-u-zero escape into a literal NUL — spell it
`String.fromCharCode(0)` and check the bytes.

## 6 · The one thing only Damir can do

The phone for the pre-warm's before/after and the chats-list frame probe; the D rulings; a
device walk for the three cancel-first pages.
