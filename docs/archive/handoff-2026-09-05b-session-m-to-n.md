# HANDOFF — SESSION M (2026-09-05): the definitive read for Session N

★★ **This file SUPERSEDES `docs/handoff-2026-09-05.md`** (archived as
`docs/archive/handoff-2026-09-05-session-m.md`). Read this whole file, then **DECISIONS
#783–#788**, then — if you are touching perf — **`docs/perf-chat-open-brief.md`** and
**#780–#782**. The Sessions I–K verdict still lives in the brief that ordered it
(`docs/opus-review-brief-sessions-i-k.md` §Verdict). #771 and #772 still stand and Session M
paid for both again.

## 0 · State and the numbers

**Session M is BUILT, WALKED AND COMMITTED. The tree is clean.**

```
b37083a3  The verified chat-open brief: four corrected numbers, the strip fork, and its prompt
9140f097  Walk M: 24 P / 0 F, the chat-open split measured a third time (#788)
7965b592  session M — chat appearance
```

Clean clone, Linux container, `npm i jsdom tree-sitter tree-sitter-c-sharp`, **Ixian-Core
sibling at 097341a PRESENT**:

```
bundle 321 · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3)  ← WITH the sibling
                        (say which, always — the M1 hold-out gate, #748, is one assertion fewer without it)
locales ALL CLEAN 786 · i18n-lint ✓ (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check ✓ · build-shells --check ✓
build-legal-docs --check ✓ (terms baked · privacy HELD 🟡) · Ixian-Core 097341a untouched
```

**4067 → 4090 (+23).** No new export (321), no net new string (786 — `patternIntensity` retired
with its card, `patternNone` added), no new C# file. **22 mutations run against every new and
rebased pin; 22 killed, zero survivors.**

⚠ **Built `chat.html` headroom is unchanged** — Session M touched no chat prose, so the `#345`
ceiling still has the 1 663 B Session L left it. Any prose edit to that shell budgets a raise in
the same commit, priced the way the pin's docblock prices it.

## 1 · What Session M shipped (full detail in #783–#787)

★ **#783 — chat appearance is three cards, and the storage did not move.** Background absorbed
Opacity; Canvas became a value row; the Opacity card and its builder are gone from the file. The
ruling that made it small: the `(style, level)` pair **stays as two keys** — with Strong retired
the level is binary, so `level 0` **is** None and `level 1 + style` **is** that style, computable
at render time from what already exists. Zero migration, zero new `spixi.*` key, zero ladder
change. **#774 ③ answered — Damir picked HIDE**, so 3 cards in light, 2 in dark. And the
light-only row now survives a live OS flip (`settings.html` re-renders that one view from
`applyPushedTheme`'s `onApplied`; a blanket rebuild was refused — it would drop an open sheet).

★ **#784 — apps opens on grid and the view survives a restart.** `spixi.apps.layout`, two fixed
words, **read at state-seed time**, default grid, and **a stored `'list'` still wins** — the
order of those two is what the pin asserts. Its gate row landed in the same batch.

★ **#785 — the 120 ms present hold is a RACE.** `presentPreload` awaits
`Task.WhenAny(Task.Delay(op.revealDelayMs), op.painted.Task)`. **It can only ever present
earlier** — a shell that never signals waits exactly what it waits today — which is why it went
to all five DATA pages at once. One implementation on both sides: `bridge.painted()` (latched,
double rAF) and ONE inbound home (`onNavigatingGlobal` → virtual `onPaintedSignal`), with
SingleChatPage's own branch **deleted** and replaced by an override that still calls base.

★ **#786 — ② ruled logged-not-built**, and the ruling recorded rather than silently resolved.

★ **#787 — the swatch boost is per style.** One multiplier cannot balance two artworks with
different ink coverage, so doodles is ×3 and matrix/flow keep ×6. The pin asserts the
**relation**, not the number. It also exposed dead code #783 had left behind (`swatchGroup`) and
three docblocks that had become pointers to a row that no longer exists.

## 1b · The walk (2026-09-05) — 24 P · 0 F · `docs/walk-session-m-results.md` · #788

**Every row scored, and the log agrees with the sheet** — recorded as an outcome, because
#776's lesson was the opposite. A4, B3 and C6 — the three the batch turned on — all pass.

★★ **The chat-open split, third capture, newer build (8 opens):**

```
77 ms  WebView creation
99 ms  document parse        ← nav == dcl on ALL EIGHT (the third capture to say it)
~20 ms push + drain           (4–65, scales with message count)
~88 ms render → painted       (37–164, scales with message count)
 6 ms  painted → present
       median total 292 ms · range 247–420 · ZERO backstop lines
```

The parse is **a third of a median open**. That is the lean build's target with a current number.

⚠ Two figures moved against walk L and **neither is claimed**: `painted→present` 3–7 ms against
L's ~30 (the chat asks `revealDelayMs: 0`, so #785's race never runs there — L's was derived,
this is the first stamped measurement of the span), and parse 87–102 against L's 117–144 while
the bundle **grew** 9.4 KB.

★★★ **ONE INSTRUMENT IS OWED, and it is this batch's own headline.** The five DATA pages carry
**no stamp**. Damir's eye confirms none presents empty — the failure mode — but nothing in the
log says whether they presented on `ixian:painted` or waited out the 120 ms timer, so **#785's
central claim is untested on device.** One temporary line in `presentPreload`
(`[CDPERF] present <page> by=paint|timer t=…ms`) settles all five in one capture and retires
with the set. **First thing next time the phone is out.**

★ The `[CDPERF] chats` stamp works and its bound behaves as designed — but `rows=5`, so the
~60-row case queue A1 wanted still needs `ixian:devseed:heavy`.

## 1c · Three ways a measurement lied this session — all cheap to repeat

① ★★ **A render can be wrong in a way that reads as data.** The swatch dial set `mask-size` on
the FACE; the mask lives on its `::before`, so the inline was inert, all six candidate rows were
the same tile, and the "differences" were render noise. Its answer (96px) **shipped for about an
hour** before a corrected strip — injected as a stylesheet, the only way to move a
pseudo-element's property — showed the opposite. **Tell: when a dial strip shows the control you
did NOT change also changing, the strip is lying.** It was visible and I read past it.

② ★ **A pin that depends on ambient state asserts a different thing depending on what ran before
it.** The appearance block inherited whatever `data-theme` an earlier pin had left on the jsdom
document and failed for a reason unrelated to the code. Both fixtures set the theme explicitly
now.

③ ★★ **A grep is not a reference graph.** The perf brief "corrected" the audit's claim that
`fonts/` was dead — by matching `fonts/` inside `../webfonts/`. The audit was right. **Damir
caught it by knowing the app.** Verify a dependency by what LOADS it, not by what mentions it.

## 2 · Session N's queue, in order

★ **ITEM 0 — THE #46 ADVERSARIAL LOOP OVER SESSION M.** Sessions I–K are reviewed and L is
reviewed; **M is not**, and it changed a present path shared by every load-then-present page, a
settings screen, and a storage key. Run it before further build on those surfaces. Not blocking.

⓪ ⛔ **THE WARM CHAT WEBVIEW IS STILL PARKED — DO NOT START IT (#779).** With the lead engineer.
   If yes, the order is fixed by #777: close MAJOR #3 first · wipe FAIL-CLOSED · cap the page's
   lifetime · a gate row · a #46 loop.
①a ★★ **THE PERF ROUND — `docs/perf-chat-open-brief.md` first**, then
   `docs/perf-lean-workorder.md` §4 (Damir's risk ranking, #782). The brief re-measured the
   background docs and corrects four headline numbers, one of which changes a risk tier
   (**55 pin sources read built artifacts, not 4**). Its §1 names the fork neither doc does:
   whether the comment strip runs in `build-shells.mjs` or as a Release packaging step.
   **Settle that before any code.** Prompt: `docs/next-session-prompt-perf.md`.
   ⚠ The walk's parse number (99 ms, a third of the open) is the current evidence for it.
① ✅ **DONE (#785)** — ⚠ **but the instrument is owed** (§1b). Do it with the phone.
② 🟡 **RULED NOT-BUILT (#786)** — the split-screen tray backstop. One stamp when wanted.
③ RAM (#764) — measured; the FE lever is demoted (#778). A BE/core row with a number.
④ ✅ `[SCROLL]` — measured, no fix needed; walk M says the same.
⑤ **The group-avatar device fact** (the hash is NOT it): photo → find the writer under the group
   address (`FriendList.setAvatar` callers, `writeAvatar`); disc → the row is not handing the
   address, get two addresses from Contact details and run `identityIndex`.
⑥ ✅ Closed by walk L (G1/G2) — it was #768's stale asset set.
⑦ ✅ **BUILT (#783 · #787).** ⚠ **THREE ONE-WORD DIALS ARE OPEN AND THEY ARE DAMIR'S** — he was
   asked on the walk sheet and left all of them `?`:
   **(a)** the card is called **Canvas** (the spec's word was "Colour"; he said neither);
   **(b)** the empty tile is **None** (a new string — "Off" was already translated but names the
   control); **(c)** the doodles boost is **×3**, with ×4.5 and ×2 rendered either side; and a
   fourth, **(d)** the matrix swatch could go **larger** than 144px. Every strip is in
   `docs/sheets/session-m/`. Each is a one-line change; a rename is 13 locales, which is why
   none was taken on a guess.
⑧ ✅ **BUILT (#784).**
⑨ Walk fallout from his eye on the rest.
⑩ The TG-order chat-info rebuild (render round — the harness boots the real shells).
⑪ Pending rulings: URL previews (`docs/url-preview-memo.md`) · privacy wording (#730) ·
   "X left the group" (#215 device check first).
⑫ iOS rows (Session G walk 15–27, 37) when he says Mac.
⑬ **Release hardening stays last** — retire `[LANDTAB]` · `[EXCERPTDIAG]` · `[CDPERF]` (chat +
   appnew + the boot/ctor stamps **+ the `chats` pair** + the `presentPreload` stamp when it
   exists) · `[SCROLL]` · `[KBTRAY]` · `[WV2]` · `[WEBVIEW]` · the console mirror ·
   `maxLogCount=5` · `SpixiDevCoexist` (csproj + SDevSeed.cs + the SettingsPage blocks + the
   About card) · the store keystore.

## 3 · The render harness

`/tmp/j/render/harness.mjs` — Playwright (`playwright-core`, npm) over the pinned chromium under
`/opt/pw-browsers`, `--allow-file-access-from-files`. It boots the BUILT shell
(`Spixi/Resources/Raw/html/<shell>.html`) from `file://` exactly as the device does, 432×900
@2.5, an Android UA (`isMobile`, `hasTouch`), Roboto forced via an init-script `<style>` (apt
`fonts-roboto`), theme via `colorScheme` + `data-theme`. Pushes are driven through
`executeUiCommand(window[name], …base64 args)` — the same wire C# uses. `page.evaluate` for
measurements. PNG out; PIL for sheets. Symlink `node_modules` into the harness dir. **Keep
`page.on('pageerror')`.**

★ **Two traps, both paid for:** a comment containing `*/` inside a path (`chromium-*/chrome`)
**closes the block comment** and the file stops parsing; and to dial a property on a
**pseudo-element**, inject a `<style>` — an inline style is inert and photographs a strip of
identical tiles that looks like data (§1c ①).

★ A **before/after** sheet is cheap: `git archive HEAD Spixi/Resources/Raw/html` into a temp dir
gives the pre-batch built shells, and the same harness renders both.

## 4 · Rules and workflow

Clean-clone gates in a Linux container; **say whether the Ixian-Core sibling was present** when
recording smoke · mutate in FULL tar copies, **never `cp -al`** (rebuild bundle + shells inside
the copy when a component moves) · **bundle BEFORE shells, always** · measure the closing number
AFTER the last suite edit · render on the real shells before Damir rebuilds · **measure on device
before any fix (#215)** · every pin declares `stripCode` or raw explicitly (#771), and a
behavioural pin that stubs the function under test proves nothing · a comment stating an
invariant the code does not enforce is a defect (#772); `file:line` is a searchable anchor, never
a number (#773).

★ **Working through the bridge (Session M's route, and it worked):** the container clone is where
the gates run; source-only changes land on Damir's tree as a tar (`tar --overwrite`; the bridge
cannot delete, so a stray file gets `mv`'d into `_to_delete/`), and the generators then run in
the device VM against his repo. **`smoke-test.mjs` does not finish there** — it exceeds the VM's
175 s ceiling — so the container run is the authoritative number and his local run is the
pre-commit confirmation. `cs-syntax-check` reports SKIPPED there (no tree-sitter). And **never
`git add -A`**: ~116 files show as modified on CRLF alone.

⚠ **When writing PowerShell for Damir: ONE command per block, and NEVER put anything in a code
block that is not a command.** Session M put a `git status` listing and a sample `[CDPERF]` line
in blocks beside command blocks; both were pasted and both errored. The quickstart doc
(`docs/android-test-quickstart.md`) has said this since 2026-08-29 and it was still broken twice
in one day.

★ **Android walk:** `adb` is at `C:\Program Files (x86)\Android\android-sdk\platform-tools\` —
**not** where Android Studio puts it. Build the walk on **Release + `-p:SpixiDevCoexist=true`**
(`com.ixilabs.spixi.dev`, same key, installs over the existing Spixi Dev): a Debug build's
timings are not honest for a timing change. Capture with `Out-File -Encoding utf8`, never `>`.

## 5 · The one thing only Damir can do

**The phone, and the four dials.** The instrument owed in §1b needs one capture. ⑤ needs two
addresses off Contact details. And ⑦'s four one-word dials cost him a line each — they are the
only thing standing between the appearance screen and done.

---

# 6 · SESSION L → N ADDENDUM (appended 2026-09-05): the legacy purge and the chat open

Written in the Session L thread after Session M committed, from a measurement pass over the
shipped payload. It is the input for **Session N's two goals.** Companions:
`docs/lean-build-audit.md` · `docs/perf-lean-workorder.md` (tiered by risk on #782).

## 6a · The legacy stack — precisely what is dead and why it is still shipping

`Resources/Raw/**` is included **wholesale** by the csproj. Nothing prunes by reachability, so a
page nobody can open still ships, and its assets with it. **~1.8 MB** is kept alive this way:
`js/` 692K · `css/` 488K · `libs/` 324K (FontAwesome) · `fonts/` 340K, plus an unaudited share of
`img/` 4.9M and `images/` 2.5M.

The app's own `hasLegacyPageChrome` roster is the authoritative list of what is still on the old
chrome (bootstrap + FontAwesome + `spixiui-*.css`):

| page | generated? | reachable? | verdict |
|---|---|---|---|
★ **CORRECTION (Damir, 2026-09-05): "when I lock/unlock I never see the legacy lock page — why is
it genuinely live?" He was right and the claim below was wrong.** All four pages are dead or
fallback-only, so **Goal 1 is a straight deletion, not a migration.** The error is worth keeping
because it is the SAME error three times in one week: a **substring grep standing in for a
semantic question**. `ixian:lock` matched as a PREFIX where the code demands exact equality;
`fonts/` looked absent in HTML because the reference is transitive through CSS; `grep -l "Inter"`
matched "Interactive". ⚠ **In this batch, match the URL / the verb / the exact call — never the
word.** A delete batch is exactly where that mistake ships a dead route or removes a live one.

| `apps.html` | **YES** (`build-shells.mjs:105`, `AppsPage`) | **`AppsPage` is NEVER constructed** — grep for `new AppsPage` returns nothing; the Apps tab lives in the home shell | **dead, and it is what keeps FontAwesome + `fonts/` alive** |
| `settings_lock.html` | no | **DEAD — corrected 2026-09-05.** The redesigned settings sends `ixian:lock:on` / `ixian:lock:off`, handled by `SettingsPage.xaml.cs:745` (`StartsWith`). `SetLockPage` hangs off `HomePage.xaml.cs:855`, which is **`.Equals("ixian:lock")` — an EXACT match on the bare verb.** `ixian:lock:on` ≠ `ixian:lock`, and **no shipping shell emits the bare verb at all.** Unreachable | **delete** |
| `wallet_recipient.html` | no | 3 sites: `newChat()` (`HomePage:751/1692`), `onStartAppMulti` (`:4291`), and `AppDetailsPage:384` — the last is an explicit *"should not happen"* fallback | two unmigrated paths + one deliberate safety net |
| `address.html` | no | callers not yet traced | **trace before touching** |

★ **The fonts question, settled.** The redesign's `--font-ui` is a **pure system stack**
(`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
sans-serif`) and the only face it embeds is **Sora**, base64 in `spixi.base.css`. `fonts/`
contains **only Inter** (`Inter-Regular`, `Inter-Bold`, `InterDisplay-SemiBold`), loaded **only**
by `css/spixiui-*.css`. **No redesigned shell links `fonts/` at all.** So Damir is right — we
never use Inter. It is dead to the redesign and alive only because the legacy CSS still ships.

⚠ **Two traps, both paid for once already this week:**
1. **`fonts/` is reached TRANSITIVELY** — html → `css/spixiui-*.css` → `url('../fonts/Inter-*.woff2')`.
   A grep of the HTML for `fonts/` returns **zero** and the folder looks dead. It is not, until the
   legacy CSS goes with it. (An earlier audit made exactly this call and would have broken a
   shipping screen.)
2. **`grep -l "Inter"` matches "Interactive", "Internal", "Interval".** Fifteen redesigned shells
   "reference Inter" by that test and **none of them loads it.** Match the URL, not the word.

## 6b · The chat open — where it honestly stands

A warm open is **~320 ms**: 60 ms WebView creation · **125 ms parse** · 30 ms push+drain ·
74 ms render → painted · 30 ms → present. Per-open payload is **~2.9 MB across seven files**
(`chat.html` 658 · `bundle` 1204 · `strings` 498 · `chat-pattern.css` 248 · `icons` 124 ·
`tokens.css` 100 · `base.css` 74).

**What is a fact:** the payload is bloated. 74 % of the bundle's 321 exports are never called by
chat (83 are destructured). All 13 locales ship to use one. `tokens.css` is **69 % comments**.
The doodle tile measures **231 → 96 KB** under SVGO (−58.2 %), **not pixel-identical** — at the
0.07 alpha the chat paints, worst case ≈6/255 on 0.4 % of pixels. Damir's eye on the harness.

**What is NOT a fact: how many milliseconds any of that buys.** Every ms figure in the work
order is arithmetic over byte counts, and a re-measure already shrank the inputs (comment share
33 %, not 41 %; `chat.html` 39 %, not 61 % — the earlier pass conflated comments with
comments+indentation and used a regex that over-matched `/*` inside strings). **Nothing here is
believed until investigation #1 — per-file parse timing — has run. One hour, zero risk.**

★ **The exception, and the one to bet on: the pre-warm (#780).** It does not shrink anything, it
**moves** work off the critical path — build a blank chat WebView on chat CLOSE, let it parse,
hand it the conversation on tap, **destroy it after use exactly as today.** ~95 ms, deterministic,
and **#777 does not apply**: the spare never held a conversation, so there is nothing to leak.
⚠ Do not trade open latency for chats-list jank — start on **idle**, and measure chats-list frame
drops before and after. Release the spare on `OnTrimMemory` (unlike #778's parked Account pane, a
spare costs nothing to drop).

## 6c · The comment-strip fork — the decision neither document had, and its two gates

Does the strip run **inside `build-shells.mjs`** (committed artifacts change; the readable
artifact `[WEBVIEW]` line-number tracing depends on is gone) or as a **Release packaging step**
(zero diff, every pin untouched)? **The packaging step is right** — it also keeps dev builds
readable for free. But it breaks a chain, and the batch must restore it:

> Today `build-shells --check` proves **committed ≡ fresh build of source**. That one proof is the
> entire justification for committing 83 549 lines of build output. With a packaging strip the
> chain becomes source → committed (proven) → **packaged (unproven)** → store.

**Two gates, both in the same batch or the strip does not land:**
1. **`packaged ≡ strip(committed)`** — re-run the strip over the committed artifact at check time
   and byte-compare. A deterministic strip makes this trivial, and it re-closes the chain.
2. **Run the smoke suite against the PACKAGED artifacts at least once per release.** Today ~4 000
   pins validate the committed artifact; after this change that is no longer what ships. Gate 1
   only proves the strip was deterministic — gate 2 proves it was harmless.

★ Also corrected: **55 pin sources read built artifacts**, not the 4 an earlier pass named — and
those 4 line numbers were stale the day they were written (#773 in its own habitat). Any strip
touching committed artifacts must re-verify all 55.
