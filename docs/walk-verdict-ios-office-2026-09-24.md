# Walk verdict — the iPhone office day (2026-09-24, AI15 / iPhone 15, Debug, device)

**30 P · 4 F · 5 N/A** of 39 (`docs/walk-artifact-ios-office.html`). DECISIONS #972.

## Build (iO.1 / iO.2)
* First compile of `Spixi-PushService/`, `SPushPrefsShare.cs`, #912 ②, #490's iOS line: **one error**,
  `IL2104` (OneSignal's own trim report) made fatal by the extension's `TreatWarningsAsErrors` →
  `<WarningsNotAsErrors>IL2104</WarningsNotAsErrors>` (4 lines, `Spixi-PushService.csproj`).
* Profiles: the Mac held the PRE-#932 app profile (no App Group) + the wildcard; the extension signed with
  the wildcard. Fix = the two regenerated profiles copied to `~/Library/MobileDevice/Provisioning Profiles/<UUID>`,
  the two old ones moved to `~/old-profiles`. Auto-selection then picked the right ones; nothing pinned.
* Commands (zsh: paste one line at a time, no `#` comment lines):
  `dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64` (no
  `-p:CodesignProvision` — a global property also re-signs the extension) →
  `xcrun devicectl device install app --device <id> Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app` →
  `xcrun devicectl device process launch --device <id> com.ixilabs.spixi`.

## Fails and findings
| Row | Result | Reading |
|---|---|---|
| iO.5 | F | No thread grouping (Notification Grouping = Automatic tried). The name is applied in the SAME `apply()` as the thread id and shows → the thread id is set, then lost downstream (OneSignal's `DidReceiveNotificationExtensionRequest` suspect). Fix: re-apply the thread in a wrapped `contentHandler`. Unverified — see the log finding. |
| log | — | `[SPUSH]` (`Console.WriteLine`) does NOT reach the device unified log (Console.app, streaming, filter `spush`: zero lines). Fix: `NSLog`/os_log. Needed before iO.5/iO.11 can be proven. |
| iO.7 | F → **(b)** | ★ The mute question answered: each muted message shows a separate row with OneSignal's generic text ("Spixi · New message"), no sender. The same text as iO.9. The emptied content is NOT what iOS shows (it shows the generic text). Mute cannot be done on the device → **BE row: the IPN server skips the send for a muted pair** (1:1 and group, see iO.11b). |
| iO.9 | P (as designed) | Master switch OFF: backgrounded = nothing; killed = the same generic "New message" row as iO.7. |
| iO.11 | F | A muted 1:1 contact's GROUP post arrives, **title = the contact's name** → the extension chose Show with a nick for that `fa`, so `fa` was NOT in `store.muted` (contact confirmed still muted). Premise of #919 ("mutes by sender everywhere") does not hold on the device. Cause unknown: verify with the NSLog trace first (#215/#294) — `fa` form in a group push vs the store key, or the store not re-synced. |
| iO.11b | F (dial) | Group mute not honoured — by design of the store (1:1 only); Damir wants it → folds into the server-side mute row. |
| iO.17 | P + N1 | See N1. |
| iO.18 | N/A | No "Show amounts" on mobile (reveal = desktop pane only, by design). |

## Notes found beside the walk (fix round)
* **N1 — the keyboard does not lift the message log.** The composer rises above the keyboard; the log stays, so
  the newest messages (and, in a new chat, the bottom of the secure notice) sit under the composer/keyboard.
  The ⊕ attach sheet DOES lift the log → the keyboard leg differs. iOS keyboard family (iOS-29/iOS-53 lineage).
* **N2 — group creation, name field:** the keyboard cannot be dismissed, and Return submits the creation.
  Return should only dismiss.

## Damir's decisions (interview, 2026-09-24)
* **#970** declined request returns → **app-side local ignore list** + an un-block path. No BE message.
* **Colon** in "Name: text" → `": "` for every locale (#969 dial closed).
* **Reply-to** on-device carrier check → in the fix round (~1 h, before any build for it).

## Fix round (next session, in this order)
1. `[SPUSH]` trace via NSLog · 2. iO.5 thread re-apply · 3. iO.11 root cause (trace first) · 4. N1 · 5. N2 ·
6. #970 ignore list · 7. reply-to device check. BE: server-side mute (iO.7/iO.11b).
Renders, pins, mutations and a fresh Opus reader per #943; FULL suite before done.

## iO.29 — Mac Catalyst (route B, #920): **P — FIRST BOOT EVER**
* The July stamp (`librocksdb.dylib`, vtool → `platform MACCATALYST · minos 15.0`, made 2026-07-20) was
  still on this Mac. `dotnet build Spixi/Spixi.csproj -f net10.0-maccatalyst -c Debug` → **Build succeeded**
  (first compile of the vendored `Platforms/MacCatalyst/RocksDbSharp/`). Launched from
  `Spixi.app/Contents/MacOS/Spixi`: boots past `RocksDBStorage.prepareStorageInternal`, the desktop shells
  (rail, split pane, welcome pane) render, a contact request was accepted and a message sent both ways.
  The stamp is proven at load time. Release (universal, lipo) is still untested.
* Terminal trap: a stuck bracketed-paste mode wraps pastes in `[200~ … ~` → `printf '\e[?2004l'`.
* **M1** — after accepting the contact request, an EMPTY received bubble (meta "22:05" only) under the
  "You are now connected" event chip. Check on Windows/Android before calling it Catalyst-only.
* **M2** — the left pane divider is not resizable (D1's grip is WinUI-wired, #240/#242 — the Catalyst leg
  was never built).
* **M3** — the Dock icon's logo reads small inside its tile (not a blocker; the macOS icon grid wants a
  larger glyph than the iOS one).
* **M4** — no new-message signal on macOS: no Dock badge (count) and no Dock bounce when a message arrives
  while the app is in the background. The Catalyst notification/badge leg was never built.
