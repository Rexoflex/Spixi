# iOS Simulator findings — first pass (2026-07-22, iPhone 17 Pro sim, iOS 26.5)

First-ever iOS run. Phase-B rules apply: platform bugs only, fix small, log in
DECISIONS.md. Damir's walk-through findings, numbered as reported. Not yet triaged
into fixes — this file is the punch list.

| # | Finding | First read / suspected root cause | Status |
|---|---------|-----------------------------------|--------|
| iOS-1 | Entry/launch screen not full-screen — white strips at status bar + home indicator; should bleed edge-to-edge to feel premium | Safe-area class, same root as iOS-3/iOS-4: WKWebView not laid out edge-to-edge (native page background showing through). Needs viewport-fit=cover + env(safe-area-inset-*) padding in the shells + MAUI page/WebView ignoring safe area | OPEN |
| iOS-2 | Backup intro ("One file protects everything") uses a different illustration than the backup nudge + Account→backup pane — should be the SAME asset | Consistency nit, asset swap in the launch/backup shell | OPEN |
| iOS-3 | Wallet screen: same not-full-screen white strips | Same root as iOS-1 | OPEN |
| iOS-4 | Dark mode: web content follows the toggle but top/bottom strips stay SYSTEM-light — native chrome shows through | Confirms iOS-1 diagnosis: the strips are the NATIVE page background; it must follow the app theme (and ideally the fix for iOS-1 makes the strips disappear entirely) | OPEN |
| iOS-5 | **CRASH**: in a chat, tapping the composer ⊕ opened the attach/Share sheet and the APP QUIT ("Spixi quit unexpectedly") | Native crash, likely the native file/photo-picker bridge invoked from the attach sheet on simulator. Needs the crash report (`~/Library/Logs/DiagnosticReports/Spixi-*.ips`) or `simctl spawn booted log stream` capture on repro | OPEN — crash log wanted |
| iOS-6 | With the software keyboard up, the top bar gets shoved off-screen — keyboard appears to RESIZE/push the whole page rather than the composer avoiding it | Classic iOS WKWebView keyboard-viewport behaviour differs from Windows WebView2; needs keyboard-avoidance strategy (visualViewport handling or native inset) so the topbar stays put and only the composer lifts | OPEN |

Notes: iOS-1/3/4 are almost certainly ONE fix (edge-to-edge + themed native background
+ safe-area CSS), which the Android pass will also want. iOS-5 is the only crash-class
finding of the run. Everything else in the walk (boot, account create on healthy disk,
wallet render, chats list, chat view, composer, message send, dark-mode web content)
worked on first contact.

Context: account-creation hang from earlier in the evening was the FULL DISK
(51.5GB of duplicate simulator runtimes since removed), not an app bug — creation
succeeded immediately on a healthy disk.
| iOS-7 | **CRASH**: app quits when RECEIVING a contact request (sim, iPhone 17 Pro) — core Stage-5 flow | Unknown yet — receive path spans network parse → friend/roster update → UI event → possibly local-notification presentation (SPushService/UNUserNotificationCenter is a suspect class on sim). Crash report + console capture wanted | OPEN — crash log wanted |
| iOS-8 | Unread badge (row + Unread chip + tab) persists after opening and leaving the chat; the only prior action was accepting the contact request — the stuck row shows the #273 `request-done` "Contact Accepted" excerpt | Suspect the unread tied to the REQUEST event (request-done kind) is not cleared by the chat-open read path (message unreads presumably are). Possibly cross-platform, NOT iOS-specific — verify on Windows before classifying | OPEN — needs cross-platform check |
