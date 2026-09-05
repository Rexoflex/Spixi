# HANDOFF — SESSION N (2026-09-05): the legacy purge · the perf instruments · the strip fork

★★ **This file SUPERSEDES `docs/handoff-2026-09-05b.md`** (archived as
`docs/archive/handoff-2026-09-05b-session-m-to-n.md` — its §6 was Session N's brief and is
consumed here). Read this whole file, then **DECISIONS #789–#797**, then — before touching the
present machinery, the gates, the pins or anything animated — the Sessions I–K verdict in
`docs/opus-review-brief-sessions-i-k.md` §Verdict. #771 · #772 · #773 still stand.

## 0 · State and the numbers

**Session N is BUILT and gated in the container. UNCOMMITTED — the commit is Damir's**
(`docs/commit-message-session-n.txt`; the walk is `docs/walk-artifact-session-n.html`; the
checklist is `docs/f5-checklist-session-n.md`). The batch lands on his tree as a tar over the
bridge; the deletions the bridge cannot make are the `git rm` block in §2.

Clean clone of `b37083a3`, Linux container, `npm i jsdom tree-sitter tree-sitter-c-sharp
playwright-core`, **Ixian-Core sibling at 097341a PRESENT**:

```
bundle 321 · shells 18 · smoke BASELINE OK 4132 / the 3 known (#136 · M5 · B3)  ← WITH the sibling (4125 before #797)
                        (one fewer without it — the M1 hold-out gate, #748: this session's
                         gate-2 run in /tmp read exactly that, 4124 with no sibling)
locales ALL CLEAN 786 · i18n-lint ✓ (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 138 clean + 1 known gap  ← 141 → 138: three C# pages are DELETED
extract-strings --check ✓ · build-shells --check ✓ · build-legal-docs --check ✓ (terms baked · privacy HELD 🟡)
strip-release --check ✓ (gate 1) · smoke-packaged ✓ (gate 2) · Ixian-Core 097341a untouched
```

**4090 → 4125 → 4132 (#797).** No new export (321), no new string (786), no new C# file. **Nine
mutations in full tar copies, every one killed by the pin it was aimed at** (#790/#791/#792
rows list them); the two pins that went red on the REAL tree after the fix round were mine
and were repaired (a Message line that named the file twice; a guard the audit had changed).

⚠ **Built `chat.html` headroom, in the pin's OWN unit (normalized chars, not raw bytes):
5 376 under the 660 KB ceiling.** The raise to 670 this session shipped for an hour was not
needed and is reverted — auditor B measured it. When a raise is ever needed, price the DELTA.

## 1 · What Session N shipped (full detail in #789–#795)

★★ **#789 — THE LEGACY PURGE.** The last four legacy documents (`apps.html` ·
`settings_lock.html` · `wallet_recipient.html` · `address.html`), their C# pages (`AppsPage` ·
`SetLockPage` · `WalletRecipientPage`), `css/` · `libs/` (FontAwesome) · `fonts/` (Inter) ·
`js/*` except `html5-qrcode.min.js` (★ LIVE — scan.html injects it), `hasLegacyPageChrome` +
`rethemesByPush` + every branch that read them, HomePage's three dead verb branches, the
`SpixiThemeMode` carrier, three csproj rows, and ~60 unreferenced images. **Every route was
re-proved with a real reference search first** — and the re-proof found two MORE grep lies
beyond the three the brief listed: `css/spixiui-*.css` was NOT "loaded by 0 html" (the four
legacy pages load it through the `css/*SL{SpixiThemeMode}` carrier — that IS the transitive
`fonts/` chain), and the redesign never embedded Inter (base.css embeds Sora). Per-site
decisions: the `AppDetailsPage` "should not happen" fallback is a LOUD `Logging.error` now,
not a legacy page. Raw/html 15 MB → ~7.7 MB. Surviving PNGs re-encoded losslessly (−5 %,
pixel identity asserted); the lossy set is his eye (#795).

★★ **#790 — THE REACHABILITY GATE.** The smoke suite is the pruner the csproj never had:
every file under `images/` + `img/` must be referenced by exact path from a shipped
html/css/js (or composed by the launch shell / the flag list, with the bases pinned), and
every referenced path must ship. Plus: 18 documents all `viewport-fit=cover`, no loader of
css/libs/fonts, js/ ≡ html5-qrcode, every document runs `createNativeBridge` except the one
named bundle-less shell, no C# reader of the deleted roster, the csproj still wholesale.
14 legacy pins rewritten in place. ★ The corpus is read through `stripCode` — the raw corpus
named two comment-only paths as "dangling" on the first run (#771 in reverse).

★ **#791 — THE TWO INVESTIGATIONS, AS INSTRUMENTS.** `[CDPERF] chat-shell parse pre= tokens=
base= styles= pattern= body= icons= strings= bundle= inline=` (per-file cost on the critical
path, one line per open) and `[CDPERF] chat-shell rtt n=5 med= min= max=` (one JS→C#→JS loop
over the cancelled-navigation transport, armed 1.5 s after the present). **Both TEMPORARY,
retire with the set (⑬).** Decision rule for rtt written before the number exists: ≤ ~3 ms →
drop #781 forever; ≥ ~15 ms → it is the only route below ~120 ms. **Nothing else in Goal 2
was built on the arithmetic.**

★★ **#792 — THE STRIP FORK, SETTLED: a Release packaging step with its two gates.**
`scripts/strip-release.mjs` (CSS-only, allowlist = `spixi.tokens.css`, 103 → 31 KB; throws on
an unterminated comment; post-conditions: no `/*` survives, braces balance, every custom
property survives) · GATE 1 `--check` (packaged ≡ strip(committed), byte-identity for
everything else IN BOTH DIRECTIONS) · GATE 2 `scripts/smoke-packaged.mjs` (the whole suite
over a stripped full copy; the in-suite artifact gate asks gate 1's question under
`SPIXI_PACKAGED_FROM`). **Gate 2's first run found exactly the pin it was built to find** —
the Session F byte-identity pin — which now asserts `built ≡ stripCssComments(src)` under a
packaged run. The csproj target `SpixiStripReleaseHtml` swaps the one `MauiAsset` in Release.
✅ **THE MSBUILD WIRING IS NOW VERIFIED on the Signed Release APK** (§2b: gate 1 OK against its `assets/html`; it was unverified when this section was written — no toolchain here). Auditor A caught its MAJOR before
it left the container: the output-dir property was evaluated in the project body where
`$(IntermediateOutputPath)` is still EMPTY — it would have written into the working tree, one
directory shared by four TFMs. It is evaluated inside the target now, and pinned. Damir proves
the swap took with gate 1 against the DEPLOYED folder (checklist §2C); if it did not, gate 1
fails loud on the byte-compare — the exact failure mode the gate exists for.

★ **#793 — the doodle tile under SVGO**: rendered on the real built shell, both themes, canvas
max delta 6/255 on < 0.001 % of pixels. **His eye, not landed** (`docs/sheets/session-n/`).

★ **#794 — the pre-warm (#780): DESIGNED, not built** — `docs/prewarm-chat-spec.md`. Tier 3
in his own ranking, C# lifecycle inside the overlay machinery, and the one measurement #780
demands (chats-list frame drops) needs the phone. The spec is the build minus the typing.

## 1b · The #46 loop this batch ran (in-session; the brief said a delete batch gets one)

Two disjoint read-only auditors (C# + csproj · shells/scripts/pins/strip) → verify → fix →
**a fresh break-my-verdict reviewer over the fixes** (§1c). **Auditor A: 1 MAJOR** (the csproj
property evaluation), 3 MINOR (comment invariants; the bundle-less `empty_detail.html` that
runs neither native.js nor theme-runtime — now a named, pinned exception; the target had no
pin), 4 NIT (ASCII digits; gate the echo on `hasGeneratedContent`; two overclaiming comments).
**Auditor B: 2 MAJOR** (the strip's silent truncation on an unterminated `/*` — and BOTH gates
compared against the same function, so nothing downstream could see it; the ceiling raise that
was not needed), 7 MINOR (FLAG_BASE unpinned; three slices without honest end anchors — one was
88 % of the file; a raw-XML csproj positive; gate 1 proved only ⊆; quoted `url()` desync;
cpSync copying obj/bin), 7 NIT. **All fixed; every fix re-pinned; the two self-defeating pins
the fixes produced were caught by the next suite run and repaired.**

## 1c · Three ways a measurement lied this session

① ★★ **A full-screenshot diff read max delta 239 on a 0.06-alpha change.** The TIMESTAMPS
differed between the two runs. Cropped to the canvas: 6. Diff the region the change can reach.
② ★ **A size pin's headroom was quoted in raw bytes while the pin compares normalized chars.**
Session L's "1 663 B" was 9 703 in the pin's unit; a raise shipped for an hour on that number.
③ ★ **The `--check` gate that compares against its own transform cannot see the transform
fail.** Gate 1 held while strip() would have truncated a file with an unterminated comment;
the post-conditions that catch it are independent of the transform (no `/*`, braces,
property-name set).

## 2 · Landing on Damir's tree (bridge) — DONE over the bridge at session end

The tar landed (`tar --overwrite`, 53 modified/new files) and the 103 deletions were made
by MOVING each file to `_to_delete/purged/<its path>` (the bridge cannot `rm`; a move is a
delete to git). Verified on the tree: `git status` = **103 D · 45 M · 9 new · your 4+1 staged
archive renames**; `build-shells --check` ✓ · `strip-release --stats` ✓ · `extract-strings
--check` ✓ ran there. So in GitHub Desktop: the 103 deletions are already listed as deleted —
tick them with the rest, `git add` the 9 new files (checklist §0), never `git add -A`.
Sanity before commit: **no** file under `Raw/html/css|libs|fonts`, exactly **13** under
`img/flags/`, `js/` holds only `html5-qrcode.min.js`. Then delete `_to_delete/` (the purged
copies, the delivery tar, the deletion list, the archived-original of the 05b handoff).

## 2b · Walk N on Android + the group Damir could not delete (#797, same afternoon)

**Walk N, Android: 15 P · 0 F · 9 N/A.** A1–A9 · A11–A13 · A15 · C3 · C4 pass; A10 not
reproducible; A14 = the Signed APK's `assets/html` is 7.0 MB unzipped; B1/B2 = the #796
capture; B3 two-device; B4 not built. **C1/C2 ran from the container over the bridge:** the
APK's `spixi.tokens.css` is 30 688 bytes and `strip-release --check` against its `assets/html`
prints **GATE 1 OK — the MSBuild leg of #792 is verified on a real package.** C5 (a Debug
build) is Damir's. D1–D4 still `?`.

**The bug he hit on the way** — delete every contact, a shared group remains, "delete this
group" says *Webpage not available*, a restart and a restore both keep it — is OURS and is
FIXED (#797, C# only: `SContacts.cs` · `ContactDetails.xaml.cs` · `SingleChatPage.xaml.cs`;
no bundle, no shells). Core throws when the leave notice has no route (the owner is not a
contact); `leaveGroup` ran the send before the removal with no try; ContactDetails cancelled
the navigation only at the END of its chain, so Android loaded `ixian:leave` as a page.
Smoke **4125 → 4132**. ⚠ `WalletSentPage` · `LockPage` · `LaunchPage` cancel at the tail
too — queued (two lines each), not done blind on the wallet and lock paths. **Phone check:**
Contacts → the group → Leave group → the group is gone, stays gone after a restart.

## 3 · Session N+1's queue, in order

★ **ITEM 0 — THE OWED #46 LOOPS: Session M (still not reviewed — it changed a present path
shared by every load-then-present page) and Session N's C# in a SEPARATE session** (this
session's loop was in-session; a delete batch touching navigation earns the separate one
CLAUDE.md prescribes).
① ✅ **THE CAPTURE IS DONE** (same afternoon, #796, `docs/cdperf-2026-09-05-session-n-capture.md`):
   rtt 3–4 ms → #781 dropped forever · strings 5 ms → L2 dropped · the seven files = 66–74 ms
   of a ~105 ms parse · **and the eval QUEUE is 60–90 ms of the drain→painted gap** (#298's
   batch transport, C#-side, is the second lever). Still owed: the #788 `present <page>
   by=paint|timer` line — one temporary line in `presentPreload`, phone-only.
② **Damir's rulings**: D1 doodle SVGO land/keep · D2 lossy PNGs · D3 contacts-es.svg ·
   D4 the four Session M dials.
③ **The pre-warm build** per `docs/prewarm-chat-spec.md` — its before-numbers are #796 (create
   72–79 + parse 102–109 = ~180 ms of ~315) — with the phone in the room, the chats-list frame
   probe first, a #46 loop after. ⛔ #779 stays parked. **Then the batch transport (#298,
   `addMessages` + `messagesDone`) — the eval queue's 50–70 ms.**
④ Gate 2 recorded per release in DECISIONS; next allowlist candidate `spixi.base.css` after
   one release on tokens alone. JS stays OFF the list.
⑤ Then the unchanged tail of the M queue: RAM (#764/#778 BE row) · the group-avatar device
   fact (⑤) · the TG-order chat-info rebuild (⑩) · URL previews / privacy wording / "X left
   the group" (⑪) · iOS rows (⑫) · release hardening LAST (⑬ — retire `[CDPERF]` incl. the
   Session N pair, `[LANDTAB]` · `[EXCERPTDIAG]` · `[SCROLL]` · `[KBTRAY]` · `[WV2]` ·
   `[WEBVIEW]` · the console mirror · `maxLogCount=5` · `SpixiDevCoexist` · the keystore).

## 4 · The render harness (Session N rebuild)

`/tmp/render/harness.mjs` in the container — Playwright over the pinned Chromium under
`/opt/pw-browsers`, `--allow-file-access-from-files`; boots the BUILT shell from `file://`,
432×900 @2.5, Android UA, Roboto forced via an init-script `<style>`, theme via
`colorScheme` + `spixi.appearance`; pushes through `executeUiCommand(window[name], …b64)`
(`addMe(id, address, nick, avatar, text, time, sent, confirmed, read, paid, errorSending)` ·
`addThem(id, address, nick, avatar, text, time, …)`). **Keep `page.on('pageerror')`.** A
before/after sheet = the same harness over a full tar copy with the candidate generated in.
⚠ `addInitScript` takes ONE argument object, not two positionals.

## 5 · Rules and workflow (unchanged, plus three from this session)

Clean-clone gates in a Linux container; say whether the Ixian-Core sibling was present ·
mutate in FULL tar copies, never `cp -al` · bundle BEFORE shells, always (this session's
`build-shells` warned about a stale bundle after a one-line component comment — it was right)
· measure the closing number AFTER the last suite edit · render on the real shells before
Damir rebuilds · measure on device before any fix (#215) · every pin declares `stripCode` or
raw (#771) · a comment stating an invariant the code does not enforce is a defect (#772) ·
`file:line` is a searchable anchor, never a number (#773).

New: **a reference graph is built from what LOADS (src/href/url()/composed bases), never from
what MENTIONS** · **a size pin's headroom is quoted in the pin's own unit** · **a gate that
compares against its own transform needs post-conditions independent of the transform** ·
**a slice needs an END anchor and a guard, or a renamed anchor widens it silently**.

⚠ PowerShell for Damir: ONE command per block, nothing in a block that is not a command.
⚠ The Write tool round-trips a backslash-u-zero escape into a literal NUL (the #257 trap, paid again this
session in `strip-release.mjs` — spell it `String.fromCharCode(0)` and check the file bytes).

## 6 · The one thing only Damir can do

**The phone (B1/B2), the deployed-folder gate 1 (C2), and the four D rulings.** The pre-warm
waits on B1; the strip fork's MSBuild leg waits on C1/C2; every lossy image waits on D.
