# F5 CHECKLIST — SESSION G · the pre-iPhone sweep (#702–#709)

The interactive version (Pass / Fail / N/A + note, Copy results → Markdown) is the
"Session G Walk" artifact. This file is the command sheet.

## 0 · Re-prove the baseline (one command per line, real terminal — smoke takes ~4 min)

```
node scripts/build-demo-bundle.mjs      # expect 313 exports (BUNDLE BEFORE SHELLS)
```
```
node scripts/build-shells.mjs           # expect 18 shell(s) written
```
```
node scripts/smoke-test.mjs             # expect BASELINE OK 3785 / the 3 known (#136 · M5 · B3)
```
```
node scripts/verify-locales.mjs         # expect ALL LOCALES CLEAN ✓ · 783
```
```
node scripts/i18n-lint.mjs              # expect ✓
```
```
node scripts/pseudo-locale-smoke.mjs    # expect 9/9
```
```
node scripts/cs-syntax-check.mjs        # expect 140 + 1 skipped — prints SKIPPED on the device VM (known mislocation, run it in a container)
```

⚠ `docs/session-g.patch` is the transport file — git-excluded locally. Delete it.
⚠ Three new files to `git add`: `docs/commit-message-session-g.txt` ·
`docs/handoff-2026-08-31.md` · `src/components/edge-back.js`.

## 1 · Windows

**F5 in Visual Studio (net10.0-windows, Debug), never `dotnet build`** (#663 — a dotnet
build serves the previous shell and looks normal). First check: the chat composer shows the
⊕ OUTSIDE the text pill. If not, the old shell is being served.

## 2 · Android — step zero is adb, every time

```
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
```
```
& $adb kill-server
```
```
& $adb devices
```
Exactly one serial in state `device`. Uninstall only if you want a clean install (it wipes
the account on that phone):
```
& $adb uninstall com.ixilabs.spixi
```
```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug
```
```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run
```
More than one phone: add `-p:AdbTarget=-s<serial>` (no space after `-s`).

The log lines this walk reads:
```
& $adb logcat | Select-String "NOTIFDIAG|LaunchPage back|RESTOREDIAG|accept add|received keys"
```

## 3 · What to walk

Sections and rows are in the artifact and in `docs/handoff-2026-08-31.md` §2:
the composer (#705) · edge swipe (#706, iOS; Android only with 3-button navigation) ·
slide-in everywhere on mobile (#707) · the OneSignal opt-out row (#708) · the copy
(#702/#703) · the five §1c items never seen on hardware · the open defects that need a
path (requester-side "now connected", the Contacts pane jump, the Wallet flash, L4) ·
the GUI sweep (#709: export tabler-icon-external-link + tabler-icon-link).
