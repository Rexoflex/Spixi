# #46 LOOP VERDICT — SESSION C (L18 · L16 · L15 · L5 · L10 · L6)

2026-08-31. Three read-only auditors with disjoint scopes, then fixes, then **mutation** —
15 mutations against the repaired tree, two of which survived and forced a new pin.

**Verdict: 4 MAJOR · 12 MINOR/NIT · ALL FIXED. Round 2 clean.**

⚠ **Two of the four MAJORs were mine, and both were invisible to every gate this project
has.** One would have shipped a fix that did nothing and reported itself as a success.

---

## The scopes

| auditor | scope |
|---|---|
| **A** | the C# and Android-resource delta — HomePage, ContactDetails, SpixiContentPage, the splash XML, `Spixi.csproj` |
| **B** | the shells — `home.html`, `launch.html`, `lock.html`, `settings.html`, plus the built output |
| **C** | components, CSS, tokens, demos, `build-demo-bundle.mjs` |

Auditor C rasterised every flag at 1×, 3× and 24× with a purpose-built renderer. That is
why the art findings are measurements rather than opinions, and it is the reason three of
them exist at all.

---

## MAJOR

### A-1 · L10 was a no-op, and the probe would have called it a success

`MainThread.BeginInvokeOnMainThread` runs its action **INLINE** when the caller is already
on the main thread. A `Navigating` handler is. **This tree already states it** —
`SpixiContentPage.cs`: `if (MainThread.IsMainThread) drop(); else MainThread.BeginInvokeOnMainThread(drop);`.

So `signalPreloadReady()` presented **synchronously** (every `ContactDetails` push site
passes `revealDelayMs: 0`, so `presentPreload` has no `await` before its opacity flip), and
the deferred burst ran inline right after it — exactly where it ran before the change.

★★ **And the instrument could not have told us.** `[CDPERF] presented` is emitted from
`onPreloadPresented()`, which now fires *before* the burst either way. A device run would
have printed a ~140 ms improvement over a screen that had not moved.

**Fixed:** `Dispatcher.Dispatch`, which always posts (that is its distinction from
`DispatchIfRequired`). And the fix **ships its own discriminator** — two new probe lines,
`roster burst` and `onLoad returned`. Burst after ⇒ the post is real. Burst before ⇒ it ran
inline and nothing moved.

⚠ The real cost was never the queue position. It is that **the UI thread never returns**,
so no frame can be composited while `loadMembers` does one file read and one base64 per
member.

### B-1 · L6's rail fix was defeated one line later

`onSettingsClosed() { clearAccountPaneFlag(); consumeLandTab(); setNavActive(nav, activeNav); }`

The unconditional write overwrote the Account highlight `consumeLandTab` had just set, on
the exact path Damir reported — and the comment above it called that *"a consistent
no-op"*, which had been true only for the tab-id branch.

★ **Every L6 pin in the first cut was a shape-grep over the branch and `openContacts`. Not
one read the rail's final state.** #395's F-4 lesson, repeating.

**Fixed by deleting the disagreement**, not by patching a fifth writer: `railTarget()`
answers "what should the rail say" once, and every writer asks it.

### B-2 · dropping `ixian:tab:` also dropped `repaintOwnSystemBars()`

`HomePage.systemBarSurfaceColorString()` returns the **wallet hero** colour whenever
`currentTab == "tab2"`. With no tab verb, Wallet → Account → Contacts leaves hero-tuned
glyphs over an opaque `--surface-screen` takeover that reaches y=0.

**Fixed:** `ixian:homeoverlay:` carries a **level** now — 0 nothing · 1 a sheet · 2 a
full-shell takeover. Back routing still asks `>= 1`; level 2 repaints the bars and
suppresses the hero.

⚠ **This closed a PRE-EXISTING hole too.** The wallet's own Receive/Send takeover is reached
*from* tab2 and has always had it. L6 only made it reachable a second way, which is how the
review found it.

### C-1 · the flags failed their own acceptance criterion at real size

An auditor rasterised all thirteen at 1×, 3× and 24×:

- **Brazil read as a smiley face** at 3× — a phone's real resolution for a 20 px box.
- **Serbia's red shield with a bold equal-armed white cross is the SWISS emblem.**
- **Every discriminating feature was sub-pixel at DPR 1** — Windows at 100%, the platform
  the row came from.

★★ **AND THEN DAMIR DELETED THE WHOLE CLASS**, which is the second time in two sessions
that his one-line ruling made a fix smaller than any of its patches:

> *"can we use damn emojis"* · *"do we keep the emojis on mobile right, as they are
> perfect."*

They are perfect — they are the platform's own artwork, and better than anything we would
ship. The defect was never "the emoji is wrong", it was "**one platform cannot draw it**".
So the emoji **stays wherever the device can paint one**, and only the platforms that
cannot get a fallback — and the fallback is `Spixi/Resources/Raw/html/img/flags/*.png`,
thirteen PNGs that have shipped with this app since the legacy build and that nothing in
the redesign referenced. **Damir pointed at the folder.**

⚠ Two things that fell out of it and would have been defects:

* The set had `gb.png` and **no `us.png`**, so the en-us row would have been a Union Jack
  on Windows and 🇺🇸 on a phone. `us.png` was added at the same size, and a pin now proves
  the two paths name the same country **per row**.
* The platform test is **not** "is this desktop". macOS HAS colour flag emoji; only Windows
  does not. `flagGlyphAvailable()` asks the device — paints one on a canvas and looks for
  colour — once, cached, failing safe to the PNG.

★ **Three rounds of my artwork were deleted by one line of his.** The lesson is the same
one #658 taught: when a reviewer keeps finding the next instance of a defect, the class is
wrong, not the instance.

---

## MINOR / NIT, all fixed

| # | what |
|---|---|
| A-2 / B-3 | `ixian:cleardetail` gated one of its four sweeps while the shell promised "a no-op on a narrow window" of all of them. The **whole verb** is wide-gated now. |
| A-3 | ⚠ **L16's scope was wrong, and Damir's answer rested on it.** `layout/splash_screen.xml` is not "the pre-31 splash": `values/styles.xml` sets it as `windowBackground` with **no version qualifier**, so it is the activity ground on every api level. Leaving it would have handed a #175595 splash to a #144576 window. Its gradient moved; the `@drawable/splash` bitmap stays out of scope. |
| A-4 | `Spixi.csproj`'s `MauiSplashScreen` colour is dead on Android but **live on iOS and Windows** — declared in the F5 checklist. |
| B-4 | the `onClose` read-back branch was **unreachable on every path it named**. Replaced by one deferred `syncNav()`. |
| B-5 | a throwing `mountContacts` stranded `contactsFromAccount` **for the life of the document** — nothing else clears it. Guarded; `cleardetail` now fires only after the mount succeeds. |
| B-6 | ★ **the Account rail item went dead** while the directory is open: `bottomnav.js` early-returns on a re-tap of the item carrying `aria-current`, and this row deliberately lights Account. A capture-phase listener routes the tap through the takeover's own Back. |
| B-NIT-7 | `launch-shell.js` stated the opposite of what L5 did **and spelled a `*SL{}` carrier out in prose**, which ships into the bundle — the N83 hazard. |
| B-NIT-8 | a second false comment about the same takeover ("the `.contacts-takeover` wrapper never exists" — it does). |
| B-NIT-9 | ★ **the destructure gate matched only `name(`**, and L15 added the first export a shell consumes as a **value**. A forgotten destructure would have thrown at module top level and booted `settings.html` blank, with every gate green. The gate reads value-shaped uses now. |
| C-m3 | the unknown-locale fallback row **lost its 28 px gutter** — the one row that is pre-selected and carries the hint. |
| C-m4 | `--text-logotype` aliased `--text-action-default`, re-coupling what a role exists to separate. It points at the primitive. |
| C-m5, N-3 | two docblocks still taught the retired `ignorePushedTheme` rule. |
| C-N1, N-2 | the duplicate-flag pin compared **markup**, so it would pass on an arms shrunk to a dot; the token pin split by position with three `:root` blocks after the split. Both rewritten to measure. |
| C-N6 | half-pixel band seams at DPR 1 (an olive line across Colombia, pink across Indonesia). Whole units now. |

---

## 🟡 Left for Damir — logged, not silently changed

* **C-m6 · four Spixi marks, three answers.** The launch welcome logo and the lock logo are
  still `--icon-accent` inside dark-pinned subtrees (a light blue mark on dark, in both
  themes), and the boot cover is `#ffffff`. L18 changed the topbar and the rail because
  those are what he named. **Nothing records whether the other two are a deliberate
  carve-out.**
* **L15 · Serbia.** If he wants the state flag rather than the civil one, it needs the four
  firesteels — and that means a bigger slot, not a better path.
* **A-NIT-3** · `rightContent.IsVisible` is `true` before the first layout pass. Pre-existing,
  shared with `onChat`/`onTransaction`; L6's mobile-unchanged guarantee now leans on it.
* **The mobile flicker (L6 ③)** is NOT fixed and the source says so. Same mechanism as
  **L14**; they want one fix.

---

## ★★ What the mutation run found that reading did not

**19 mutations. 17 caught first time. 2 survived, and the two that survived were the
important ones.** (Four more were run against the redrawn flag work after Damir's ruling —
all caught, 23 in total.)

Both flag pins **execute the shipped bundle** — which is right, the artifact is what a user
runs. But a mutation of `src/components/flags.js` with no rebuild left the source saying one
thing and the shipped file another, and **every gate stayed green**.

★ Fixed with a **DIFFERENTIAL pin**: the source module and the shipped bundle are both run,
and their output is compared per flag. Same shape the receipt-detail pin was rebuilt into
last session. Read both homes, never one.

## ★★ And the pins themselves

**Seven of mine were wrong on their first run. FOUR of them read their own prose:**

* a `#144576` inside the comment I had just written to explain the scope,
* an `ixian:homeoverlay:` inside the comment explaining why the verb does *not* reuse it —
  which truncated the slice to nothing, twice,
* a negative lookahead that backtracked onto a space and matched `= false;` anyway, twice,
* a `data-desktop` sweep that matched the comment explaining why the test is **not**
  `data-desktop` — written *after* the three above were already written up on this page,
* and then a `[CDPERF]` sweep that matched the comment recording that **[CDPERF] had been
  removed**.

⚠⚠ **FIVE TIMES, and three of them after the rule was written down on this page, by the
person who wrote it.** Each new pin looked like the case where it did not matter. It never
is — **a comment explaining an absence necessarily NAMES the thing that is absent**, which
is exactly what a negative sweep looks for.

★ **So it stopped being a decision.** `stripCode` is a top-level helper in `smoke-test.mjs`
now, with all five failures listed at its definition, and every negative sweep goes through
it. That is the #658 shape again: when the same class keeps coming back, delete the class
rather than patch the next instance.

**This is the sixth session running in which the pin owner's own pins read prose, and
mutation is what found them every time.** Reading them did not.
