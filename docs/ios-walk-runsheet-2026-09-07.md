# iOS device walk — runsheet, Mac, 2026-09-07

HEAD `23491879` (Session R). Branch `redesign/frontend`. Repo `~/Documents/GitHub/Spixi`.

★ **This walk is not just Session R.** `docs/release-readiness.md` §6: the last iOS device pass
was **2026-08-27 at `eeed6549`**. **Sessions I → R have never been on an iPhone** — the pre-warm
(#800), the batch transport (#801), the legacy purge (#789/#790), the density pass, #804's Account
sublevels and the whole Session R security batch are all unverified there.

Walk sheet: `docs/f5-checklist-session-r.md` §1–§3. §4 is Android-only (`adb`), skip it.

---

## 0 — preflight

```bash
cd ~/Documents/GitHub/Spixi
git log --oneline -1            # expect 23491879
git status --porcelain          # expect EMPTY
node --version                  # v20+ ; v22.23.2 seen on this Mac
dotnet --version                # expect 10.0.3xx
xcodebuild -version

# the Ixian-Core SIBLING is a hard requirement (Spixi.csproj:365 imports ../../Ixian-Core)
[ -d ../Ixian-Core ] && (cd ../Ixian-Core && git log --oneline -1) || echo "MISSING SIBLING"
```

If it says MISSING SIBLING:

```bash
cd ~/Documents/GitHub
git clone https://github.com/ixian-platform/Ixian-Core.git
cd Ixian-Core && git checkout 097341a && git log --oneline -1   # expect 097341a
cd ~/Documents/GitHub/Spixi
```

## 1 — the pipeline gates (order is load-bearing)

```bash
cd ~/Documents/GitHub/Spixi
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs      # BEFORE shells, always
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/verify-locales.mjs
node scripts/cs-syntax-check.mjs
node scripts/smoke-test.mjs
git status --porcelain                  # must STILL be empty (or CRLF-only noise)
```

Expect exactly: bundle **321 exports** · **18 shells** · locales **786 ALL CLEAN** · lint ✓ (6 dev)
· pseudo **9/9** · cs-syntax **138 + 1** · smoke **BASELINE OK — 4613 pass / the 3 KNOWN
pre-existers (#136 · M5 · B3)** with the sibling present.

**Any difference → stop and report it before building.**

## 2 — the restore. ⚠ This is a test, not a formality

`nuget.config` gained `<clear/>` + `packageSourceMapping` in Session R and **could not be validated
in the container that wrote it**. This restore is the first validation, and it must resolve BOTH
RocksDB references — `0.0.42` from `local-nuget/` for android/ios, `10.4.2.64152` from nuget.org
for maccatalyst. Restoring the project (not one TFM) exercises both.

```bash
dotnet restore Spixi/Spixi.csproj
```

If it fails: `nuget.config` is the first suspect. Send the error.

## 3 — signing. Check the profile BEFORE the build

`docs/release-readiness.md` records the iOS provisioning profile as *"exists but expired"*.
The csproj now forces `CodesignEntitlements = Platforms/iOS/Entitlements.plist` (`aps-environment`
= development), and **codesign validates that against the profile** — a wildcard profile FAILS by
design.

```bash
DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
for p in "$DIR"/*.mobileprovision; do
  security cms -D -i "$p" -o /tmp/pp.plist 2>/dev/null
  printf '%-40s | aps=%-12s | exp=%s\n' \
    "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' /tmp/pp.plist 2>/dev/null)" \
    "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:aps-environment' /tmp/pp.plist 2>/dev/null || echo NONE)" \
    "$(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' /tmp/pp.plist 2>/dev/null)"
done
```

Want: a row for `…com.ixilabs.spixi`, `aps=development`, expiry in the future. If it is expired or
absent, regenerate the **iOS App Development** profile for `com.ixilabs.spixi` with Push ticked in
the portal, download it, double-click it, re-run the loop.

## 4 — build for the DEVICE

```bash
cd ~/Documents/GitHub/Spixi
rm -rf Spixi/obj Spixi/bin

dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug \
  -p:RuntimeIdentifier=ios-arm64 \
  -p:CodesignProvision="VS: com.ixilabs.spixi Development" \
  2>&1 | tee ios-build.log
```

| trap | rule |
|---|---|
| `-p:RuntimeIdentifier=ios-arm64` | ★ **NOT optional.** Debug iOS with no RID silently builds a **SIMULATOR** app (`Spixi.csproj:75`) and installs nothing |
| `-p:CodesignKey="Apple Development: Damir Rekic"` | ★ **do NOT pass it** — MSBuild matches the CN exactly and the real CN ends `(77X9Y36WPG)`. The csproj's `iPhone Developer` alias resolves |
| `rm -rf Spixi/obj Spixi/bin` | mandatory here: C# changed heavily AND the RocksDB xcframework slice differs sim ↔ device |
| profile name | if yours is named differently, use the name printed by the §3 loop |
| codesign refuses the entitlement | the escape hatch is `-p:CodesignEntitlements=` (empty) — ⚠ it **suppresses push**, so C-rows and the notification walk become n/a |

Expect ~1700 warnings (Ixian-Core CA1416/CA2022 noise) / **0 errors**. Warm build ~45 s.
★ Session R touched a lot of C# and `cs-syntax-check` proves braces, not types — **this compile is
the first real test of the batch.**

## 5 — install and launch

```bash
xcrun devicectl list devices                     # copy the iPhone's Identifier
DEV=<paste-the-UDID>

xcrun devicectl device install app --device "$DEV" \
  Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app

xcrun devicectl device process launch --device "$DEV" com.ixilabs.spixi
```

Live console (optional, second terminal):

```bash
xcrun devicectl device process launch --console --device "$DEV" com.ixilabs.spixi
```

WebView inspection: **Safari → Develop → [iPhone] → the Spixi WebView** (Settings → Safari →
Advanced → Web Inspector must be ON on the phone). That is where §1/§2 rows get diagnosed.

## 6 — what to walk

**Session R rows — `docs/f5-checklist-session-r.md`:**

* **§1.1–1.3** remote media: Tenor/Giphy still tiles · any other host must render as a plain
  confirm-to-open link (⚠ intended change) · Account → Privacy has the pictures/GIFs switch and
  turning it OFF stops the tiles. ★ iOS + MacCatalyst were the only platforms actually leaking.
* **§2.1–2.3** the one external-link gate: an ordinary `https://` link confirms and opens ·
  `https://paypal.com@evil.example/login` is **refused** · About / How to use / explorer / support
  mail all still open (one gate — if one breaks they are all suspect).
* **§2.4 iOS-ONLY, the row the session is least sure of** — the QR scanner. Camera must come up and
  a code must scan. On failure `ixian.log` carries `[cam-perm] … DENIED reason=…` — **the word
  after `reason=` is the answer**, send that line.
* **§2.5 iOS-ONLY** — open a mini-app: loads and works (its storage is partitioned now).
* **§2.6** restore an account from a real backup (the restore path gained a zip-slip fence).
* **§2.7** pay a contact with a long nickname — nickname on ONE clamped line, **address always
  beneath it**.
* **§3.1–3.3** drafts: remove contact · Leave group · Delete chat history · Account → delete all
  chat history — the unsent draft must be gone in every case.

**The six-session iOS backlog (never on an iPhone), worth the same session:**

* **the pre-warm (#800)** — open chats repeatedly; chat-open speed, and whether the chats list got
  worse. ★ And watch memory: the Android kill (~30 min, 511 MB) suspect is
  `SpixiContentPage.Dispose()` doing its teardown inside `if (!Navigation.NavigationStack.Contains(this))`,
  which is platform-neutral code. iOS instrument = **Xcode → Debug → Debug Navigator → Memory**, or
  Instruments → Allocations.
* **#804** — Account → Backup / Change password / Downloads must open **inline, no WebView boot**.
* **the legacy purge (#789/#790)** — anything that fails to load an asset (icons, fonts, images).
* **carried iOS-only defects to re-check**: the bot-group load freeze (SEV-1, 2026-08-27) · the
  keyboard that cannot be dismissed during onboarding (SEV-1) · iOS-67 the FAB → contacts picker ·
  iOS-44 attach sheet under the composer · iOS-56b edge-swipe in subscreens.

**Report per row: pass / fail / n/a.** For a fail: the exact symptom, plus the `[cam-perm]` line for
2.4. Then `ixian.log` via dev mode → send log.

⚠ Do not `git add -A` — CRLF churn on ~116 files.
