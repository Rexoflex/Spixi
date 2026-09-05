# OPUS REVIEW BRIEF — Session M (#774–#788) + Session N's C# and #797 (#789–#797)

**Ordered by:** handoff-2026-09-05d §3 item 0. **Run:** Session O, 2026-09-05, cloud container,
clean clone of `cba8fc18` (one docs commit past `056a59eb`), Ixian-Core sibling at `097341a`.
**Rule:** a CLEAN verdict before any build item. The verdict is appended to THIS file (#660).

## Baseline (verified before any edit, sibling present)

```
bundle 321 · shells 18 · smoke BASELINE OK 4132 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 786 · i18n-lint ✓ (6 dev exemptions) · pseudo 9/9
cs-syntax 138 clean + 1 known gap (SpixiTransactionInclusionCallbacks.cs)
extract-strings --check ✓ · build-shells --check ✓ · build-legal-docs --check ✓ (privacy HELD 🟡)
strip-release --check (gate 1) · smoke-packaged (gate 2) — see §Verdict for the numbers
git status after bundle + shells rebuild: clean (no diff)
```

## The two deltas under review

| Delta | Range | What changed (non-doc) |
|---|---|---|
| Session M | `f174801e..b37083a3` | #783 chat appearance 3 cards (`settings-screens.js/.css`, `settings.html`) · #784 apps layout persist (`apps-shell.js`, `home.html`) · #785 present race (`SpixiContentPage.cs` PreloadOp.painted + `onPaintedSignal`, `SingleChatPage.cs` override, `native.js` `bridge.painted`, 5 shells wired) · #787 swatch boost per style · `[CDPERF] chats` pair (`HomePage.cs`) · smoke +pins |
| Session N C# | `b37083a3..056a59eb` | #789 purge C# (`HomePage` 3 branches + `newChat`/`onStartAppMulti`, `AppDetailsPage` fallback → loud log, `UIHelpers` roster readers, `SpixiContentPage` `hasLegacyPageChrome`/`rethemesByPush` gone, `ThemeManager`, `Utils`, `SpixiLocalization`) · #791 rtt echo (`onNavigatingGlobal` cdpong) · #792 csproj `SpixiStripReleaseHtml` target · #797 (`SContacts.leaveGroup` try + order, `ContactDetails.onNavigating` cancel-first, `SingleChatPage` ixian:leave) |

Session N's JS/CSS/pins already had an in-session #46 loop (#789/#790/#792 mutations). They
are IN scope for auditor C only as gates (do the pins prove what they claim).

## Protocol (the #46 shape, as Session L ran it)

Three READ-ONLY auditors with DISJOINT scopes → verifiers against the tree (a finding that
does not reproduce is recorded as such, not dropped) → fix agents on disjoint files → a FRESH
break-my-verdict reviewer over the FIXES → repeat until CLEAN. Every fix lands with a pin;
every pin is mutated in a FULL tar copy (bundle before shells when a component moved).

## Auditor A — C#

Files: `Spixi/Utils/SpixiContentPage.cs` · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` ·
`Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs` ·
`Spixi/Utils/SContacts.cs` · `Spixi/Pages/Contacts/ContactDetails.xaml.cs` ·
`Spixi/Utils/UIHelpers.cs` · `Spixi/Utils/Utils.cs` · `Spixi/Utils/ThemeManager.cs` ·
`Spixi/Spixi.csproj` (the strip target).

Questions:
1. #785: `PreloadOp.painted` + `target.pendingPaint` + `onPaintedSignal`. Can a stale gate
   present the WRONG navigation (a page pushed twice; a park/re-present; an abandoned op)?
   Does `WhenAny` leave a `Task.Delay` continuation that touches a disposed page? Does the
   SingleChatPage override double-present or skip `base`? Is the verb accepted from a
   mini-app WebView (security gate: introduced verb, inert claim)?
2. #797: `SContacts.leaveGroup` — the send in a try, removal after. Is `removeFriend` reached
   on every path, incl. a null `friend`, a bot, a group the user OWNS? Does the catch log an
   address or `ex.Message`? `ContactDetails.onNavigating` cancel-first: does ANY branch need
   the navigation to proceed (file:, http handoff, tel:)? Is the `file:` re-allow safe?
3. #789 purge: every deleted branch — is there a live emitter left anywhere (any shell, any
   C# `sendUiCommand`, any `loadPage`)? `AppDetailsPage` loud-log fallback — is the page
   left in a usable state? `UIHelpers.getLiveShellPages` after `rethemesByPush` removal —
   does every shipped document still re-theme? `supportsRawDataUriArgs` → does the mini-app
   leg still fail closed?
4. #791 cdpong: digits-only ≤16, `hasGeneratedContent`-gated — can it reach a mini-app?
5. #792 csproj target: `BeforeTargets="PrepareForBuild"`, Release-only, `-p:SpixiStripHtml=false`.
   Property evaluation inside the target body (the #46 in-session fix); the swapped
   `MauiAsset` `LogicalName` shape; does a FAILED node run fail the build LOUD or silently
   ship the committed tree?
6. `[CDPERF] chats` pair — fixed words + integers only; `cdChatsRuns < 4`.
7. Security lens (`docs/security-handover-gate.md`): new verb / storage key / sink / fetch /
   log line — introduced vs inherited. Money and the lock/call exclusion untouched.

## Auditor B — JS + CSS

Files: `src/bridge/native.js` · `src/components/settings-screens.js` · `src/components/apps-shell.js`
· `src/styles/components/settings-screens.css` · `src/shells/{home,settings,app_details,contact_details,downloads,wallet_sent,chat}.html`.

Questions:
1. `bridge.painted()`: latched, double rAF. Which shells call it, and WHEN — after the data is
   on glass, or on onload? A shell that calls it before its burst presents an EMPTY page.
   Enumerate each call site with the push that precedes it.
2. #783: the (style, level) pair stays two keys. Trace every reader/writer of
   `spixi.chat.pattern` / the level key in `chat.html` AND `settings.html` — pre-paint
   ladders (#690). None → style X → None → Matrix: what is stored at each step? Dark mode:
   is the Canvas row absent (HIDE, #774 ③), and does a dark user with a stored light-only
   ground get a sane render?
3. #784: `spixi.apps.layout` read at seed, stored `'list'` wins over the new default; write
   takes the normalised value; try/catch both sides. Does ANY late reader flip the layout?
4. #787: `PATTERN_SWATCH_BOOST` per style — is every consumer (tiles in settings, any preview
   in chat) reading the per-style value? Is the CSS var the same in both themes?
5. The Session M shell edits (`app_details` +6, `contact_details` +9, `downloads` +13,
   `wallet_sent` +7): each is presumably the `painted()` wiring — confirm nothing else moved.
6. #772: any comment stating an invariant the code does not enforce. #773: any `file:line`
   number in a comment.

## Auditor C — pins, gates, docs

Files: `scripts/smoke-test.mjs` (Session M + Session N + #797 blocks) · `scripts/strip-release.mjs`
· `scripts/smoke-packaged.mjs` · `scripts/build-shells.mjs` (the `--check` path) ·
DECISIONS #774–#797 · `docs/handoff-2026-09-05d.md` · `docs/prewarm-chat-spec.md` ·
`docs/security-handover-gate.md` (Session M + N rows present?).

Questions:
1. #771: every Session M/N pin declares `stripCode` or raw. Would each pin go RED on the
   defect it names? Pick the 6 highest-value pins and DESIGN a mutation for each (the
   verifier runs them).
2. A behavioural pin that stubs the function under test — any?
3. `strip-release.mjs`: unterminated `/*`, a `*/` inside a string, `url("/*")`, a `//` inside a
   value (`url(http://…)`) — CSS has no `//` comments; does the strip touch one?
4. Gate 2 compares against the SAME transform (`stripCssComments`) — what post-condition is
   independent of the transform? Is there one?
5. DECISIONS claims vs the tree: #785 "five call sites enumerated" · #797 "sendLeave has ONE
   call site" · #789 "js/ holds exactly html5-qrcode" · #790 (F) both directions · #788
   "zero backstop lines" is a device fact, not a pin — fine. Any claim the code does not bear?
6. The security-handover-gate rows for Session M (`spixi.apps.layout`, `ixian:painted`) and
   Session N (`ixian:cdping`/`cdpong`, the strip target) — present and accurate?
7. `docs/prewarm-chat-spec.md` §3: is every anchor a real, searchable identifier in the tree
   TODAY (`parkOnClose`, `parkOnLoad`, `representParkedOverlay`, `deferPreloadReady`,
   `armPresentOnPainted`, `warmAccountAfterFirstPaint`)? A spec anchored to a name that does
   not exist is a defective brief (#297 class).

## Non-negotiables (verify they HOLD)

- ★ chat = its own WebView; no JS between panes; coordination C#-only (#221).
- Money: nothing in either delta touches signing or the wallet (grep, then read).
- The lock and the call surface stay mutually exclusive; the lock wins (#272).
- Damir's rulings stand: #783 HIDE the Canvas row in dark · #784 grid default, stored list
  wins · #786 do nothing · #778 no proactive Account release · #779 parked · #782 tiers.
- `revealDelayMs` can only ever present EARLIER (WhenAny, never WhenAll).
- An onNavigating handler cancels FIRST (#797).

## Accepted dials (not findings)

- The `[CDPERF]` set is temporary and retires at release hardening.
- `maxLogCount=5` is a marked release blocker.
- Privacy legal doc HELD on two markers.
- D1–D4 are Damir's, not the loop's.

## Verdict (appended — Session O, 2026-09-05)

# ★★ CLEAN — after FIVE rounds (r4 was prose-only). Closing suite 4227 / the 3 known, sibling present.

**Protocol run as ordered.** 3 disjoint read-only auditors (C# · JS+CSS · pins/gates/docs) →
2 verifiers (V1 C#: confirmed 8, refuted 1 as stated — the csproj `<Error>` gap has no live
path — re-graded 2 down, elevated 4; V2 JS/pins: ran auditor C's six mutations, confirmed all,
elevated the strip masker false-alarm from NIT to a build-stopper) → 3 fixers on disjoint
files → a FRESH break-my-verdict reviewer per round. Verdicts: **r1 NOT CLEAN (6 MINOR · 5
NIT)** · **r2 NOT CLEAN (5 MINOR · 7 NIT)** · **r3 NOT CLEAN (3 MINOR · 2 NIT)** · **r4 NOT
CLEAN (2 MINOR prose · 1 NIT)** · **r5 = this section, the two sentences and the missing
§Verdict fixed.**

Numbers: smoke **4132 → 4227** (+95 pins) / the 3 known (#136 · M5 · B3), WITH the sibling ·
bundle 320 (was 321 — `PATTERN_LEVELS` retired) · shells 18 · cs-syntax 138 + 1 known gap ·
locales ALL CLEAN **784** (was 786) · lint ✓ (6 dev) · pseudo 9/9 · extract-strings /
build-shells / build-legal-docs `--check` ✓ · strip-release `--stats` 102996 → 30688 (unchanged)
· gate 2 re-run at the close (see the handoff) · Ixian-Core 097341a untouched.
Mutations: the lead's tally is 32 (r1) + 12 (r2) + 4 (r3) + 1 (r4) + the reviewers' own (10 +
12 + 7 + 2); every survivor became a finding, none survived the round that found it.

## The two MAJORs (DECISIONS #798)

1. **The #797 rule held on ONE page.** Auditor A: nine `onNavigating` handlers cancelled only at
   the tail (a throw inside a branch → Android LOADS the verb as a page; on `LockPage` that
   URL is `ixian:unlock:<plaintext wallet password>`); r1's reviewer found six more with a
   permissive `else`. All 19 now carry the grammar five pages already shipped, and the pin is a
   WALK over every handler (r2's reviewer proved it catches a 20th page). ⚠ One leg unverified:
   the #768 fallback ladder's `HtmlWebViewSource` on WinUI/iOS — device row in the checklist;
   the lead's W0 evidence was BROKEN by r2's reviewer (the walk-L row does not name the page).
2. **The dark Chat-appearance screen shipped an empty card** (auditor B; two comments asserted
   the opposite).

## Answers to the brief's questions

**Auditor A (C#):** #785 HOLDS on every sub-question (per-page gate; `WhenAny` continuation
captures nothing; the chat override calls base; the verb was un-gated → now gated). #797 HOLDS
for reachability, the bool was DISCARDED → fixed at all four sites. #789 purge HOLDS (zero live
emitters for the three deleted branches; every shell still re-themes; the mini-app leg fails
closed). #791 HOLDS. #792 property timing HOLDS, node failure fails LOUD, `<Error>` added as
insurance. `[CDPERF] chats` HOLDS. Security lens: two verbs introduced (one now gated), no key,
no sink, no fetch; money and the lock/call exclusion untouched.

**Auditor B (JS):** `bridge.painted()` HOLDS at all five sites (none on onload; outbound order
by causality) — one site inert on 4/5 routes (comment fixed), one site unconditional on a
no-mount branch (gated). #783 HOLDS (the pair stays two keys; None → Doodles → None → Matrix
lossless; dark ground inert) — the empty SECTION was the MAJOR. #784 HOLDS. #787 HOLDS (one
consumer, a CSS var identical in both themes). #772: six comments corrected. #773 clean.

**Auditor C (pins):** two vacuous pins on #785's central property (the `renderLayout` negative
matched nothing; the placement pins were positive-only against a LATCHED signal) → repaired;
`strip-release` scanner HOLDS on every crafted input, its MASKER threw on correct CSS → fixed;
gate 2's transform-independent post-condition is thin (one content pin on the allowlisted
file) → recorded, `spixi.base.css` needs a content pin before it joins the allowlist; #791's
ceiling sentence was stale; #797's row was unfindable by key; two prewarm-spec anchors did not
exist (`UIHelpers.getChatPages` · `App.OnTrimMemory`) → corrected.

## What the loop proved about itself

★ **Three Session O pins were found vacuous by the NEXT reviewer** — `if \(` with a space
(house style writes `if(` 27 times in one file) · a 200-char window that a `!` negation
satisfied · an `ex.Message` ban that `+ ex` walked past — and a fourth (the length bound
called a charset gate) in r3. #771 in its own loop, four times.
★ **The r1 reviewer's line stands as the rule:** the fixes that NARROWED were all correct and
complete; the two that WIDENED A REFUSAL each shipped a comment claiming the refused cases
were enumerated, and each left one out.
★ **A verdict must exist before a row cites it (#660):** #798 was written citing this section
while the section did not exist — r4 caught it.

## Ledger for whoever runs the next loop

- The `file:`-only tail on 19 handlers vs #768's ladder: **device row, not a code change.**
  Android is immune by construction (`LoadHtml` → `LoadDataWithBaseURL`, no
  `SendNavigatingCanceled`); WinUI/iOS: delete `<exe>\html`, app lock ON, boot. A blank lock
  = one `about:blank` clause in the shared tail.
- A bot that is a group member cannot be left (Core `removeFriend` refuses `isFriendInGroup`);
  it now reads as an honest error instead of "Contact removed". BE row.
- `spixi.base.css` joins the strip allowlist only after it has a content pin (gate 2 is thin).
- `HomePage`'s `ixian:qrresult:` branch is dead (only `scan.html` emits it, routed to
  `ScanPage`); anchored, not deleted — deletion needs a #789-style proof.
- Residual pins that read a hand list: none left in the Session O block; the two ordering
  pins tolerate a tree with no loose branch.

_(Loop closed 2026-09-05. Next: the Session O build queue — item 1 the pre-warm, which this
verdict unblocks; item 4's three cancel-first pages are DONE here, walk them.)_
