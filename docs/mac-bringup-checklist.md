# Mac bring-up checklist — Phase B, Android first

**Written:** 2026-07-20. Context: `docs/handoff-post-freeze.md` §1 phase **B** (platform
bring-up), picked with Damir on the Mac clone at `audit-baseline` + the handoff commit.
**Nothing has ever run outside Windows.** Android first (expected mostly fine), then
iOS/WKWebView (the real risk). MacCatalyst is a bonus WKWebView proxy we can try cheaply.

**Rules for this phase (handoff §1B):** platform bugs only. No new features, no
refactors, no "clean up while you're in there" — a mid-bring-up refactor makes every
platform bug ambiguous.

---

## Stage 0 — What you should already have

The clone is at `redesign/frontend`, tree clean, built shells committed under
`Spixi/Resources/Raw/html/` — so **nothing needs generating just to run the app**.
`node_modules/` is present, so Node is presumably installed. Verify in Terminal:

```
node --version        # any v20+ LTS is fine
```

## Stage 1 — Toolchain (one time, mostly downloads)

Run each in Terminal; stop and report at the first thing that doesn't match.

1. **.NET 10 SDK** (Arm64 installer from `https://dotnet.microsoft.com/download`):

   ```
   dotnet --version      # expect 10.x
   ```

2. **MAUI workloads:**

   ```
   sudo dotnet workload install maui
   dotnet workload list  # expect maui (android/ios/maccatalyst come with it)
   ```

3. **Java (JDK 17)** — required by the Android toolchain:

   ```
   brew install --cask microsoft-openjdk@17
   ```

   (No Homebrew? Say so — there's a plain installer alternative.)

4. **Android SDK + emulator** — easiest is **Android Studio** (`https://developer.android.com/studio`):
   install it, open it once, let the setup wizard fetch the SDK. Then
   **More Actions → Virtual Device Manager → Create device** → Pixel 7, newest stable
   API image (arm64). Boot it once to check it opens.

5. **Xcode** (App Store) — NOT needed for Android; install it in the background now so
   it's ready for the iOS/MacCatalyst stage. Open it once and accept the license.

## Stage 2 — Prove the clone + pipeline are healthy (10 min, high value)

The generators are deterministic and their outputs are committed, so a full run on a
healthy clone should end with a **clean git tree**. That single fact verifies Node, the
scripts, and the clone in one shot. From the repo root:

```
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/smoke-test.mjs
```

(Order is load-bearing — `build-strings-iife` AND `build-demo-bundle` must both precede
`build-shells`; the preflight fails loud if not.)

Then check **GitHub Desktop**: the tree should show **no changes** (or CRLF-only noise).
Any real diff or any script failure → stop, screenshot, send it over. Don't commit
anything from this run.

## Stage 3 — Build + run on the Android emulator

Start the emulator (Android Studio → Device Manager → ▶), then from the repo root:

```
cd Spixi
dotnet build -f net10.0-android -t:Run
```

First build is slow (several minutes). The app should install and launch on the
emulator straight into the launch shell.

- If the build fails around **RocksDbSharp**: don't fight it — that dependency is the
  known build landmine (it's why "F5, never Rebuild" existed on Windows). Copy the
  first error lines and send them.
- Prefer an IDE? VS Code + the ".NET MAUI" extension gives you a play button over the
  same build. Terminal is fine too.

**Debugging view:** with the emulator running the app, open Chrome on the Mac →
`chrome://inspect` → the Spixi WebView appears → **inspect** = live DOM + console.
That console is what I'll want for anything that looks wrong.

## Stage 4 — First-run checklist (single device)

Walk these in order; screen-record the run (emulator side toolbar has a record button):

1. **Boot + wallet create/restore** — all 5 launch shells render, fonts + icons show
   (asset loading via `file:///android_asset/` is the first thing that could differ
   from Windows).
2. **Theme** — flip the system dark mode; app follows, no flash of wrong theme.
3. **Locale + dates** (handoff watch item 5) — set the device language to **Deutsch**:
   shell copy translates AND dates/clocks localize (check a date separator — a
   small-ICU WebView silently keeps English formats).
4. **Lock** — set the lock, background/foreground the app, unlock. Then the ZIndex
   tripwire: if the log ever prints
   `"Call surface: another modal is on top — refusing to pop it"` → **MAJOR**, stop.
5. **General feel** — chats list scroll, open a chat, composer + keyboard behaviour,
   long-press message menu, back gestures.

## Stage 5 — Two-device passes (once one device is healthy)

These are the least-verified flows in the repo (handoff §3) and all need a second
device/emulator:

| # | Flow | What must be true |
|---|---|---|
| 1 | **Lock ↔ call, BOTH orders** | Locked device: incoming call rings audibly, **no UI**; ring appears within one tick of unlock. On-call device: lock wins, call UI never sits above the lock. |
| 2 | **Contact request, both roles** | Accept in-chat → back out → **re-open** → composer live, no request pane (the #215 F5 gate). Decline after accept must NOT delete the contact. |
| 3 | **ZIndex vs Children order** | Overlay staged after a live ring must not cover it (unanswerable call). Fallback is specified-not-implemented — if this breaks, it's a known fix, report it. |

## When something's wrong — what to send

Screen recording + `chrome://inspect` console screenshot + (for crashes)
`adb logcat` tail. That's enough for a surgical fix session. Findings get fixed
small and logged in `DECISIONS.md`; anything C#-structural goes through the
security-review doc per the standing rules.

## Not in scope this phase

Refactor/sweeps (deferred, prerequisite unmet — handoff §5) · wallet send (LAST, by
standing decision) · reply-to (BE-blocked) · BE cutover rows (phase C, with the
engineer).
