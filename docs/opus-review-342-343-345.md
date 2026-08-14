# The #46 loop over #342, #343 and #345 — verdict and record

Run 2026-08-14. Decision row: `DECISIONS.md` **#346**.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

## Why this loop existed

Three batches shipped with no independent review. #345 changed how every screen in the
app is delivered. The loop was owed.

## Protocol

Three disjoint read-only auditors → verify every claim against the code → fix → a FRESH
reviewer told to break the verdict → round 2 → round 3. Rebuild and smoke between passes.

Auditor scopes: **A** = #345 (the build pipeline, `PerfTrace`, the generated output).
**B** = #343 (press feedback, the `ad2c7ca` revert). **C** = #342 (the share ladder, the
two money-surface avatars) plus the wallet-password path.

Baseline before any change: **1503 pass / the 4 known pre-existers**.
Baseline after: **1536 pass / the same 4**. +33 assertions, zero regressions.

## The five shipped MAJORs

| # | Defect | Evidence | Fix |
|---|---|---|---|
| ① | The press-release rule deleted four components' own `transition` | Measured in a real engine. `.c-button[data-morphing]` lost `width` (the #29 success morph), `.c-bottomnav__item` lost `color` (the #39 ink fade), `.c-chip` and the list rows went 100 ms → 200 ms | `base.css` now lists only components that declare no transition; the six that do carry the press properties themselves |
| ② | The `ad2c7ca` revert deleted a PRE-#343 rule | `.chat-boot__spinner` lost its box. `git show e364941:src/shells/chat.html` has the rule; HEAD did not | Restored in `src/shells/chat.html` |
| ③ | `build-shells.mjs` preflighted only the shells being built | Reproduced: drop an export, run `build-shells.mjs chat`, and `settings.html` gets `createSettingsHub === undefined` with the guard silent | The preflight walks `Object.keys(SHELLS)`; the write loop still writes only what was asked |
| ④ | The tip sheet named the GROUP as the payee | `chat.html` `name: rec.senderNick \|\| identity.name` — and `identity.name` is the group's name | The name ladder mirrors the avatar ladder |
| ⑤ | `Remove("waletpass")` — one `l` | Every read and write in the tree uses `"walletpass"` | Typo corrected in `SettingsPage.xaml.cs` |

### Why ① matters more than it looks

`transition` is a shorthand. It REPLACES; it never merges. A rule strong enough to win
deletes the whole declaration it beats. All 22 shells paid this, including the 18 that
never call `attachPressFeedback()` — they took the cost and got nothing back.

## The auditor MAJOR that was REFUTED

An auditor reported: a wallet password containing `+` is silently rewritten, so the user
cannot restore a backup on a new phone.

**The mangling is real.** `HttpUtility.UrlDecode` form-decodes `+` to a space. Proven
with Roslyn against the shared framework:

```
IN  : ixian:changepass:--D--Hunter2--D--Corr3ct+Horse!
OUT : ixian:changepass:--D--Hunter2--D--Corr3ct Horse!   <<< CHANGED
```

**The consequence is not.** Every password path in the app applies the identical decode:
`LockPage.xaml.cs:93` · `LaunchRestorePage.xaml.cs:36` · `LaunchRetryPage.xaml.cs:33` ·
`LaunchCreatePage.xaml.cs:43` · `SettingsPage.xaml.cs:170` ·
`EncryptionPassword.xaml.cs:34`. No XAML in the tree contains `IsPassword`, so there is
no native entry that could disagree. The wallet is written under the mangled string and
every later entry mangles the same way — including restore, which the auditor's scenario
turned on.

**Fixing it would cause the harm the report described.** Any change that makes `+`
faithful breaks every existing wallet written under the mangled password.

The round-1 reviewer found the corroboration independently:
`LaunchCreatePage.xaml.cs:65` already carries a guardrail comment forbidding exactly this
change, for exactly this reason. An earlier session reached the same conclusion.

**Ruling: downgraded to MINOR. Documented, not fixed.** Two residuals are recorded in
`docs/security-review-for-be-engineer.md`.

## The reviewer then broke the fixes — 3 MAJOR

This is the part that justifies the step.

| # | What was wrong with the fix | How it was found |
|---|---|---|
| (a) | The instant-on rule sat ABOVE the release rules. Both are (0,2,1), so source order decides — instant-on LOST for the FAB and four row families, which ramped their tint in over 200 ms while chat rows snapped | Computed style in Chromium, all 12 selectors |
| (b) | The cancel latch armed on EVERY scroll, including momentum after `touchend` and programmatic scrolls, with no end event left to release it | Measured: no feedback on the first tap at 100 / 500 / 900 / 1150 ms after a fling settled; feedback only at 1400 ms, which is the 1200 ms backstop, not the gesture |
| (c) | The new `<script src>` gate used `\bsrc=`, which matches inside `data-src=` — the attribute the inliner writes onto everything it inlines | `build-shells.mjs apps` and `payments` hard-failed, blaming an attribute that was not there |

(b) is the worst of the three. It reproduced the exact symptom press feedback exists to
cure, in an intermittent form that heals on the second tap — which would have been
miserable to diagnose on a device.

## Round 2 — 4 MINOR, no MAJOR

1. `empty_detail.html` got no guard at all, because the block was gated on the bundle.
   It could render completely unstyled, in silence — the desktop resting pane.
2. The build-time probe check was a raw substring test: a commented-out declaration
   PASSED, and legal `--spacing-16 : 16px` FAILED.
3. That check printed "Nothing was written." after writing three files. It left a new
   bundle beside 22 old shells — the version-skew state #258 §5.6 exists to prevent.
4. A gesture that ended with no end event could strand the in-flight flag, so a later
   scroll re-latched and one following tap lost its feedback.

All four fixed. Round 3 over those fixes found nothing.

## Two pins were DEAD on first write

Both were caught by mutation testing, not by reading.

1. The "release rule names no declaring component" pin matched the reduced-motion block,
   which legitimately names all twelve. It was scoped to the release rule.
2. The stranded-latch pin dispatched `scroll` at `document`, but the smoke block attaches
   to `pressRoot`. The event never reached the listener, so the pin passed whatever the
   code did.

Every new pin was then reverted and proven to fail.

## What was checked and found correct

- The #345 platform claims, each against real code: Android `loadDataWithBaseURL`
  (`WebViewRenderer.cs:227`) with `AllowFileAccess` true (`:370-371`); Windows
  `copyResources()` on every start (`App.xaml.cs:36-41`); Apple symlinks at launch.
  `Spixi.csproj:143` globs `Resources\Raw\**`, so the six new files package.
- `CacheMode.NoCache` unchanged, so no shell/bundle version skew at runtime.
- `PerfTrace` logs fixed labels, a filename, elapsed ms and a message COUNT. No address,
  nickname, message text or password. Both sinks are `try/catch`.
- The #342 share ladder handles every path and did not drift from the `home.html` version
  it was copied from. Only the bare address is shared.
- The two money-surface avatars cannot leak: the picker roster filters groups (the #255
  money fence), tip is gated off for blind groups and bots, and a roster miss degrades to
  the gradient.
- ★ #221 chat isolation, the frozen bridge, and the money paths are untouched.

## Still open, for a device

- **The `+` residual that cannot be checked here:** `wallet.ixi` is encrypted with the
  mangled password. `WalletStorage` is in Ixian-Core, which is not in this repo. Test:
  create a wallet with password `a+b` in Spixi, then open `wallet.ixi` in the Ixian
  desktop client with `a+b` and with `a b`.
- **HTML5 drag on desktop** may strand the press flag, because a native drag can suppress
  `pointerup`. Test on WinUI: drag-select text out of a chat bubble, release, scroll the
  list, then tap a row once. Does the first tap tint?
- **The boot guard on WKWebView.** `document.documentElement.innerHTML = …` mid-parse
  works in Chromium. It has never been tested on WebKit. Test: delete
  `spixi.icons.js` from the packaged output on an iOS build and open any screen.

## Three residual NITs, recorded and not fixed

- `.chat-boot__spinner` uses `--border-subtle`, which `tokens.css` never defines, so the
  ring always takes its hardcoded fallback. Pre-existing text, restored verbatim.
- The `<script src>` gate still misses `<script type="module"src="a.js">` (no whitespace)
  and `<script src=a.js>` (unquoted), and would false-positive on an attribute value
  containing ` src='…'`. None occurs in the tree today. Tightening the regex further
  costs more than it buys.
- `.c-app-item` has no `border-radius` in list layout, so a list-layout press paints a
  square tint behind a rounded row, and a tap on the `⋮` overflow tints the whole row.
  Both pre-existing #343.
