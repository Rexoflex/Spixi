# Opus adversarial review — #227–#230 (type dial 2 · platform flag · lock/overlay flicker)

Independent #46 pass over the uncommitted batch (fable's self-review already ran; findings below
were re-verified against the real on-disk files, not the Read-tool view — see NOTE). Scope:
`src/styles/tokens.css`, `chatlist-item/txlist-item/search-field/wallet-hero.css`, the `data-desktop`
head snippets in `src/shells/*.html`, `scripts/smoke-test.mjs` new assertions, and C#
`SpixiContentPage.cs` / `App.xaml.cs` / `SettingsPage.xaml.cs` / `LockPage.xaml.cs`
(+ `HomePage.xaml.cs` back-swallow).

## Verdict: CLEAN on logic + security. 1 MINOR (build hygiene) + NITs. No MAJOR. No new DECISIONS row needed.

★ rules held: presentation TIMING/input-gating only — no signing/broadcast, no keys/passwords added
to the bridge, no WebView-supplied filesystem paths, no chat↔pane JS bridge, no password-over-URL
extension. The staged lock keeps its OWN isolated WebView in the host grid = the sanctioned #221
model (SECURITY §1). The existing `ixian:unlock:<pass>` path is unchanged (pre-existing known issue,
NOT extended by this batch).

## MINOR

- **M1 — `Spixi/Pages/Settings/SettingsPage.xaml.cs` has 21 trailing NUL bytes** (offsets 19023–19044,
  after the final `}`; file is `M` in git, part of the #229 confirm-site edits). Real on-disk
  corruption from a truncating-mount Edit write (documented #175/#165 class), NOT the Read-tool view —
  `grep -rIL` flags only this file; content is otherwise fully intact (all braces balanced, no interior
  NULs, no lost lines). Roslyn usually treats a post-EOF `\0` as an end-marker so it MAY compile, but
  it is unclean and a nonzero build risk. **Strip before building** (do NOT use the Edit tool on this
  mount — it re-truncates large files):
  `tr -d '\000' < SettingsPage.xaml.cs > /tmp/s && mv /tmp/s SettingsPage.xaml.cs`
  All other batch C# files are NUL-clean (0 bytes each).

## NIT

- **N1 — `presentPreload` abandoned-branch is fail-OPEN for a modal lock** (SpixiContentPage.cs:830).
  If a `modalMode` op were ever `abandoned`, it disposes without `onLockPresentFailed()` → the app
  lock latch stays set with no lock shown. Unreachable in practice (`abandoned` is only meant to be set
  by a staged page's own `popPageAsync`; LockPage never pops itself while staging — and grep finds no
  live setter of `abandoned` at all). Defensive: add `if (op.modalMode && op.target is LockPage) onLockPresentFailed()`
  to that branch too, mirroring the catch/`presentPlainModal` paths.
- **N2 — second resume while already locked in place runs `HomePage.onResume()` under the lock**
  (App.xaml.cs:246/268). With the in-place lock the CurrentPage is HomePage (not LockPage), so a
  re-resume skips the lock branch on `!isLockScreenActive` (correct — no double-lock) but then falls
  through to `p.onResume()` on HomePage beneath the opaque lock. Benign (own data, input frozen by the
  opaque stage) but differs from the old modal path (which ticked LockPage.onResume). Optional guard:
  bail the fall-through when `hasModalOverlay()`.
- **N3 — in-place modal present skips `applyPlatformPageChrome()`** (SpixiContentPage.cs:860-873; only
  the modal-push fallback re-applies it at :890). iOS notch insets for an in-place lock rely on the
  host grid's chrome. Windows/F5 unaffected; verify at the iOS phase (already flagged there in #229).
- **N4 — stale comment** tokens.css:300 "desktop overrides at 700px" — now the `:root[data-desktop]`
  platform flag, not a 700px query. Doc drift only.
- **N5 — heading-md desktop 28/28 line-height** (tokens.css:339, ratio 1.0). Pre-existing, already
  flagged in #229; confirm at the type dial.

## Re-verified fable self-review fixes (all CORRECT)
MAJOR-1 host input freeze during staging + unfreeze in the `finally` on every outcome
(SpixiContentPage.cs:759,1003); biometric defer via uiReady+pageVisible+authAttempted + `onPresentedInPlace`
(LockPage.xaml.cs:78-89,72-76); fail-closed `onLockPresentFailed` on present failure
(SpixiContentPage.cs:805,994 / App.xaml.cs:226); `ts.Seconds`→`ts.TotalSeconds` lock-bypass fix
(App.xaml.cs:246); back swallowed while locked (HomePage.xaml.cs:1551); in-place close = hide→commit→dispose
(SpixiContentPage.cs:377-383); double-close guard (`overlayStack.Remove` result, :472).

## Front-end confirmations
- 14 shells set `data-desktop` at boot; `launch.html` exempt (documented); charset is the first head
  child in the sampled shells; UA detection sends iPad/mobile UAs to mobile and desktop OS (WinUI) to
  desktop. Correct.
- `:root[data-desktop]` (spec 0,2,0) + later source order wins over base `:root`; component CSS uses
  `:root[data-desktop] …` (chatlist/txlist padding, search-field 36px) not media queries; NO `≥700px`
  type/density query remains anywhere in `src/styles` (only the layout-only `--layout-breakpoint-split`
  token + comments). `--font-display: "Sora"` defined; Sora preloaded per shell; wallet amount/compactbal
  on the brand face. Correct.
- smoke assertions valid: container/≥700px component-CSS guards, tokens `:root[data-desktop]` present +
  no 700px query, every non-exempt shell sets the flag. (NOTE: the Read-tool rendered `/` regex/comment
  delimiters as `\` for this file; `cat -A`/`sed` confirm the disk is correct — a Read-tool artifact,
  not a file defect.)

## Commands for Damir (no builds/smoke run in this review session)
1. `cd Spixi/Pages/Settings && tr -d '\000' < SettingsPage.xaml.cs > /tmp/s && mv /tmp/s SettingsPage.xaml.cs`  (M1)
2. `node scripts/build-shells.mjs`  (tokens.css/component CSS/shell heads changed; NOT `all` — drifted shells per handoff §4)
3. `node scripts/smoke-test.mjs`
4. Build `net10.0-windows` only (net10.0-android RocksDbSharp breakage is pre-existing) → F5 the #229/#230 lock + #227/#228 type checklist.
