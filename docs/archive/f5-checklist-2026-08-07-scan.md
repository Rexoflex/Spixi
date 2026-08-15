# F5 checklist — 2026-08-07 scan batch (#307 decode · #308 C-9 storage probe)

One device round covers BOTH open items from `docs/handoff-2026-08-04b.md`. Zero C# in this
batch — but the HTML changed, so the stamp-trap wipe is mandatory.

## Build (the #301 gotcha, unchanged)

```
rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64 -p:CodesignKey="Apple Development" -p:ValidateXcodeVersion=false
# + the same with -t:Run -p:_DeviceName=AI15   (--launchdev failure at the end is harmless)
```

Bundle sanity after building (both must hit):

```
grep -c "__setKbInset"      Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/chat.html   # ≥1
grep -c "attachFeedSizer"   Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/scan.html   # ≥1 (the #307 fix is in the bundle)
```

## A — DECODE (#307)

1. Open Scan. **Expected layout change:** the camera is no longer full-bleed — it sits as a
   centered 3:4 block with dark letterbox bands above/below (the classic scanner look).
   Frame brackets centered ON the visible video.
2. Aim at a Spixi QR (another phone's Receive QR, and the printed/desktop one if handy).
   **Expected: it decodes.** Note roughly how fast vs the legacy app (gut feel is fine —
   fps/zoom dials move only on measurements, and only now that decode works).
3. Torch on/off mid-scan once (A8 regression guard: LED truly off, zoom kept).
4. If it does NOT decode: leave the scanner pointed away from any code for ~3 s — if the
   feed is unhealthy the #301 probe line appears under the frame; **photograph/copy it
   verbatim** (it now reports the aspect-locked `box WxH` — expect ~393×524-ish, NOT
   393×737 and NOT 0×0).

## B — C-9 STORAGE MATRIX (#308) — same visits, just read one line

The consent card, when it shows, now carries a dim line at the bottom:

```
storage probe — ll_scan.html · grant:G · probe:N · appearance:A [· write:ERR(…)]
```

Do exactly this and note the line each time:

1. **Entry 1** (fresh after install/relaunch): note `probe:N₁`, `appearance`, any `write:ERR`.
2. Allow → scan or cancel → leave ScanPage. **Entry 2** (same app run): note the line again.
   (If NO card shows on entry 2 — that's the #305 grant surviving = consent fixed on its own;
   still do step 3.)
3. **Kill the app** (swipe away), relaunch, enter Scan. Note the line once more.

**Read the matrix:**

| observation | verdict |
|---|---|
| `probe` INCREMENTS across entries (N₂ > N₁) | same-page localStorage PERSISTS → storage theory dead; the grant clear is a logic path (did you revoke camera in iOS Settings? that clears it honestly) |
| `probe` stuck at 0 every entry, `write:ok` | reads are session-ephemeral → **C-9 CONFIRMED — every `spixi.*` localStorage feature is dead on iOS** → be-cutover row (C# pref push), NOT a scan patch |
| `write:ERR(...)` on the line | localStorage structurally dead on `file://` → same escalation, exception name = evidence |
| `appearance:1` at any point | cross-FILE visibility works (ll_settings → ll_scan) → per-file-origin theory dead too |
| `appearance:0` throughout | ambiguous on its own (dead storage kills it identically) — the runsheet C-9 Inspector variant stays the tie-breaker for the cross-page leg |

Also: `[scan-probe] storage {...}` logs to the console on every mount if you happen to have
the Inspector attached — richer than the on-screen line, but NOT required.

## C — report back (verbatim numbers, please)

- decode: yes/no + rough speed vs legacy · the probe line if anything looked dead
- the storage line from entries 1, 2 and post-relaunch (three readings)
- whether the consent card still gated entry 2 / the post-relaunch entry

## Then

**ONE commit** (message suggestion in the session chat). The next session takes the C-9
verdict → either closes consent as a logic fix or opens the be-cutover storage row; speed
dials (fps 10 / A8 min×2) move only with measurements, per #307.

⚠ Bridge hygiene, unchanged: `git --no-optional-locks` only; commits from GitHub Desktop
(the mount can't replace `.git/index` — #306); stranded locks → `_to_delete/`.


---

# ROUND 2 (post device round 1) — #309: delegates + staged-box + re-latch

Round 1 verdicts: decode ✅ · feed box misplaced ❌ · WebKit dialog every visit ❌ · no
storage line = grant PERSISTED (C-9 same-page CLEAR, iOS-52). All three fixed; **C# changed
this time** (iOSWebViewHandler) → the full wipe+build+deploy again:

```
rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64 -p:CodesignKey="Apple Development" -p:ValidateXcodeVersion=false
grep -c "requestRestart" Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/scan.html   # ≥1
# then the same command with  -t:Run -p:_DeviceName=AI15
```

## What to check

1. **Enter Scan: NO dialogs at all.** No WebKit "Allow Spixi to use your camera?", no
   consent card — straight to the live camera (grant persisted + the fixed delegate
   auto-grants). THE key check: the WebKit dialog reappearing = the delegate fix didn't
   take.
2. **Feed geometry:** full-WIDTH camera block, vertically centered, dark bands above and
   below only; bracket frame fully ON the camera picture.
3. **A single quick feed blink ~a second after entry is EXPECTED and correct** — that's
   the re-latch resizing the decode region after the page presents. Once, brief, then
   steady. Constant blinking/restarting = report.
4. **Decode speed:** aim a Spixi QR filling the bracket — should decode promptly now
   (the slow case was the misplaced sampling region). Compare gut-feel vs legacy.
5. **Torch** on → off once mid-scan (LED truly off, scanning continues). If you use torch
   BEFORE the blink lands, a re-lit torch after the blink is correct behavior.
6. First-ever-visit sanity (optional): iOS Settings → Spixi → Camera OFF, then enter Scan
   → honest denied card; re-enable → Allow card → works. (This also exercises the
   storage line one more time if you want a second reading.)

## Report back

- dialogs seen (ideally: none) · feed/frame placement · blink observed? (once/constant/none)
- decode speed vs legacy · torch
- anything the probe line says if it ever appears

## Then

**ONE commit** for the whole day (#307 + #308 + #309) — suggested message in the chat.


---

# ROUND 3 — #310: the delegate, registrar-proof (C#-only)

Round 2: geometry ✅ (the smaller-than-screen feed is the intended letterbox — a 3:4 camera
stream can't fill the screen without re-breaking decode) · WebKit dialog ❌ still there →
the delegate method was NEVER being called; rebuilt with an explicit ObjC export + made
observable. C# only — same wipe+build+deploy:

```
rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64 -p:CodesignKey="Apple Development" -p:ValidateXcodeVersion=false
# then the same command with  -t:Run -p:_DeviceName=AI15
```

## Check

1. Enter Scan. **Dialog gone → fixed** (first-ever grant may show ONE iOS system sheet with
   the usage text — that one is correct and never repeats).
2. **Dialog STILL there →** leave the scanner open → Mac Safari → Develop → iPhone →
   ll_scan.html → Console. Report: does ANY line starting with `[cam-perm]` appear
   (and its exact text)?
   - `[cam-perm] invoked …` present → WebKit consults us; the text tells me which branch
     misbehaves.
   - NO `[cam-perm]` line at all → WebKit never calls this selector on your iOS version →
     I go hunting for the newer WebKit permission API next round.

## Report back
dialog gone yes/no · if no: the `[cam-perm]` console lines verbatim (or "none").


---

# ROUND 4 — #311: the fork-splitter (C#-only)

Round 3 Inspector session: C-9 CLOSED (grant:1 · probe:23 · appearance:1 — storage
persists, cross-page works) · mic probe proved WebKit never consults our delegate.
This round logs WHO the UIDelegate is at runtime and re-asserts ours if swapped.

Same wipe+build+deploy (C#-only). Then: enter Scan (Inspector optional — attach after
entry and scroll up, or just report the dialog).

## Report
1. Dialog on entry: yes/no.
2. The `[cam-perm] probe uiDelegate=… respondsToSelector=…` console line, verbatim
   (Inspector; it fires at page boot, so attach + `location.reload()` shows it live).

## What the line means
- `uiDelegate=MauiWebViewUIDelegate REASSERTED` (or NULL) → MAUI was swapping our
  handler out — found AND fixed in the same stroke; dialog should be gone.
- `uiDelegate=MediaCaptureUIDelegate respondsToSelector=false` → registrar refuses the
  export → next round targets registration.
- `uiDelegate=MediaCaptureUIDelegate respondsToSelector=true` + dialog still shows →
  WebKit's API moved on this iOS → research round.


---

# ROUND 5 — #312: heal on every navigation (C#-only) — expected FINAL round

Round 4 proved the delegate works once re-asserted (mic probe) — the boot camera request
was RACING the heal (cold launches won, warm re-entries lost). The heal now runs at every
navigation, including the page's own file:// load, which always precedes page JS.

Same wipe+build+deploy. Then the closing pass:

1. Enter Scan **warm, several times in a row** (the failing case): every entry should go
   straight to the camera — no WebKit dialog, no consent card.
2. Decode a Spixi QR end-to-end once (bracket-filling, should be prompt).
3. Torch on/off once.

All clean → **ONE commit, #307–#312** (message suggestion in the chat).
