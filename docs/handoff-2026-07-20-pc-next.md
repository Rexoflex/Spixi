# HANDOFF 2026-07-20 → next session (PC, Android bring-up)

**Phase:** B — platform bring-up (`docs/handoff-post-freeze.md` §1B rules apply:
platform bugs only, no features, no refactors, no cleanup-while-in-there).
**Written after:** Mac bring-up session 1. Full findings: `docs/mac-bringup-log.md`.
**Damir works two machines now: Mac (this session's work) + PC (Windows F5 + Android).
Same branch `redesign/frontend` on both — PULL FIRST on either machine, push when done.**

## What the Mac session established (short version)

- ★ First non-Windows build+launch ever. `net10.0-maccatalyst` compiles; **WKWebView
  renders the launch shell correctly** (fonts, icons, layout, i18n status line). The
  handoff's "nothing ever ran outside Windows" risk is now materially smaller.
- ✗ Boot blocks at RocksDB: public RocksDbSharp wrapper misdetects MacCatalyst as
  Windows (`AutoNativeImport` falls through to kernel32). NOT fixable repo-side;
  needs the dev's custom RocksDB-Sharp — the same artifact Android needs anyway.
- Repo changes committed: csproj Windows-TFM guard (no-op on Windows) · catalyst
  NativeReference shim (gitignored folder) · `nuget.config` + `local-nuget/` feed ·
  docs (checklist, log, this file) · CLAUDE.md status row.

## The single blocking artifact

**`RocksDB.0.0.42.nupkg`** — the dev's custom-built RocksDB-Sharp managed wrapper
(csproj already references it for android/ios; it is NOT on nuget.org). Damir has
asked the dev for it (+ optional: maccatalyst slice in RocksDB.xcframework).

## PC session — do in this order

1. **Pull `redesign/frontend`** (brings the Mac session's commit).
2. **Regression check (5 min):** normal Windows F5 (`net10.0-windows`) must behave
   exactly as before — the csproj TFM guard and `nuget.config` should be no-ops
   on Windows. If anything smells off, THIS commit is the suspect; report, don't fight.
3. **When the nupkg arrives:** drop `RocksDB.0.0.42.nupkg` into `local-nuget/`,
   commit it (repo-local feed is already wired via `nuget.config`). Restore proof:
   the android/ios NU1603 warning ("0.0.42 not found, resolved 6.4.6.3735") must
   DISAPPEAR. If VS caches the old resolution: close VS, delete `Spixi/obj/`, reopen.
4. **Android build:** VS 2026 as admin (emulator-list quirk) → F5 with an Android
   emulator target (or a USB phone). **F5, never Rebuild Solution** (standing rule;
   the historical Rebuild/RocksDbSharp errors may be FIXED by the nupkg, but verify
   before relaxing anything).
5. **Test passes:** `docs/mac-bringup-checklist.md` Stages 4–5 are platform-generic —
   single-device checklist first (boot/wallet, fonts+icons via `file:///android_asset/`,
   system dark-mode flip, Deutsch locale incl. DATE SEPARATORS, lock cycle, the ZIndex
   tripwire log line), then the 2-device passes (lock↔call BOTH orders ·
   contact-request both roles incl. the re-open composer gate · overlay-over-ring).
   Chrome `chrome://inspect` on the PC = live WebView console.
6. **Log findings** in `docs/mac-bringup-log.md` (rename to `platform-bringup-log.md`
   at first Android entry — it's cross-platform now) and fix small + surgical.

## Meanwhile / afterwards on the Mac (whoever gets there first)

- Once the nupkg is in the repo: **iOS Simulator on the Mac** should work — the
  RocksDB.xcframework already has an `ios-arm64_x86_64-simulator` slice, workloads +
  Xcode 26.5 (workload set pinned 10.0.300.3) are installed and proven. That is the
  handoff's REAL risk platform (strict WKWebView `file://` sandbox — X1's raison
  d'être). Command shape: `dotnet build -f net10.0-ios -t:Run` with a booted simulator.
- Still owed on the Mac: Node LTS install → full generator pipeline run → expect a
  CLEAN git tree (the one-shot clone health check) · Safari pass over `src/demo/*.html`.

## Gotchas carried forward

- `git` not on Damir's PATH on the PC (GitHub Desktop workflow). On the Mac it exists.
- Build order (if generators run): strings-iife AND demo-bundle BOTH before
  build-shells; never commit stale built artifacts (#255).
- Session tooling (AI-side): the Mac file-bridge served one stale csproj read —
  verify repo files against `git diff` via shell before editing on top of them.
- Damir shares the Mac with the BE dev — disk is tight (workload install failed on
  space once; caches were cleared). Mind big downloads.
- Don't touch: wallet send (LAST, standing) · reply-to (BE-blocked) · refactor
  (deferred, needs behavioural shell coverage first) · BE-cutover rows (phase C).
