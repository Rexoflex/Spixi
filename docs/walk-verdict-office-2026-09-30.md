# Walk verdict — the office day after #1080–#1083 (2026-09-30, Mac + iPhone 15)

HEAD `97bbf3e8`. Sheet `docs/walk-artifact-office-1083.html`. Logs `docs/walk-office-1083-logs.md`.
**68 P · 11 F · 6 N/A** of 86 (X.10 not marked). DECISIONS #1084.

Builds: first iOS + Mac Catalyst compile of #1040–#1082 C# = **PASS on both** (iOS 1661 warnings, Mac 1644).
Smoke 5013 / the 2 KNOWN on the Mac.

## Fails and findings — first read only, NOT verified (#294). Find the mechanism before any fix.

| # | Row | Damir | First read |
|---|---|---|---|
| 1 | NEW · Mac text size | Text on basic screens is too small on the MacBook Air; the welcome notice most (screenshots: chats list, wallet + welcome pane) | `Platforms/MacCatalyst/Info.plist` `UIDeviceFamily` = 1, 2 only → Catalyst runs in the iPad idiom, which scales the whole window to 77 %. Candidate: family 6 ("Optimize for Mac", 100 %). Verify first: every WebView size and the native chrome change with it. |
| 2 | OV.10 | Tick change is instant on iPhone AND Android | The #1028 crossfade does not show on either platform. Check `setMessageStatus` on a live push. |
| 3 | OV.13 / OV.14 | The line is there, but the top bars of the list and the chat are pushed down; the rail logo is cut by the hairline and sits lower (screenshot 1) | `[M6]` shows page top 0 → 41 → 0, window 41. Suspect a double inset (content pushed by the inset AND the line placed from it). |
| 4 | OV.15 · C.9 · C.13 · F9 · F10 (Mac) | Calls on the Mac end at once, 0:00 | ★ **Mechanism found in the log + source (2026-09-30):** the Mac log has an AVAudioEngine stack at `AVAudioEngineImpl::InstallTapOnNode` ← `-[AVAudioNode installTapOnBus:bufferSize:format:block:]`. `Platforms/MacCatalyst/SAudioRecorder.cs initRecorder` installs the mic tap with a FIXED `PCMInt16` format (`new AVAudioFormat(PCMInt16, sampleRate, …)`); AVAudioEngine refuses a tap format that differs from the input hardware format, so the recorder throws and the call ends. The iOS copy (`Platforms/iOS/SAudioRecorder.cs`) was already fixed: it taps in `InputNode.GetBusOutputFormat(0)` and converts with `AVAudioConverter` to the desired format. The Mac copy never got that fix. Fix = port the iOS recorder shape to MacCatalyst (tap in the hardware format + converter). **CONFIRMED (ixian.log 20:25:22):** `Exception occured while starting VoIP session: ObjCRuntime.ObjCException … Name: com.apple.coreaudio.avfaudio Reason: Failed to create tap due to format mismatch, <AVAudioFormat 1 ch, 16000 Hz, Int16>`. The repeated `dialing → busy` in ~50 ms is probably the peer still holding the failed session; re-check after the fix. |
| 5 | C.2 · OV.15 | Mac ring card: FULL address when there is no nickname (not truncated, #211 canon); the card is square, not rounded (screenshot 2) | Name = truncate the address like the chat topbar. Square card = the Windows F9 class (the stage is not transparent). |
| 6 | F8 (Mac) | The dim is there, but a solid screen sits behind it | Same as the Windows F8 (deferred #1083). |
| 7 | OV.23 | App invite picker = a small bottom sheet with a rocket and the app name | Design ask: a real picker — app icons, and a full screen with search when there are many apps. |
| 8 | PR.6 (Mac, P with note) | A payment on the Mac shows `+0.20000000` | The #77 amount rule (≤ 2 dp, `formatIxiAmount`) is bypassed on one path on the Mac. Find which surface (chat card / tx row / detail). |
| 9 | F1 (Mac) | Back from Contacts flashes the previous screen (Wallet) | The #1077 / #1083 F1 class on desktop. |
| 10 | F6 (P with note) | The nickname text still flickers and moves; the field looks smaller | Damir may send a screen recording. Same as the deferred #1083 F6. |
| 11 | N2 (P with note) | With a DRAFT in the chat, peer typing does not show in the row | Typing must override the draft in the excerpt; the draft returns when the peer sends or stops. |
| 12 | C.10 (P with note) | Speaker does not work on iOS | The iOS speaker route (#1074 Debug-only) does not switch. |
| 13 | M3 | The Dock icon logo is still small (screenshot 3) | Icon art: a larger glyph for the macOS grid. |
| 14 | iO.R | Mute is still not honoured on iOS / macOS | Known (iO.7 (b), #972): the IPN server must skip the send for a muted pair. BE row. |
| 15 | Launch | `performFetchWithCompletionHandler` warning ("fetch" missing in UIBackgroundModes) | Record only. |

**Accepted as is:** PR.4 the explorer link opens with no confirm (trusted host) · Y.7 the keyboard does not
come back after the Tip sheet on iOS.

**N/A:** OV.27 (Release, later) · F17b · C.17 (later) · C.18 · C.22 · C.13 (no Mac calls).

## Group typing (Damir's question)

The app half is BUILT (C21, Session AD #928): the typist rides the push and the pill names them. It does not
show because **Ixian-Core does not relay `msgTyping` to the group members** — `CoreStreamProcessor.sendTyping`
addresses the GROUP, and the host does not forward it (walk AD.14). That is **CORE-12**
(`docs/be-cutover-brief.md`): Core must relay typing like a chat message, rate-limited. The alternative is to
drop typing in groups and say so. F17 passed here — confirm if the group leg was really seen (a group where you
or the peer is the creator can differ).
