# 🔒 Security review — FOR THE BE ENGINEER

> **What this is / reminder:** the security handoff **Damir plans to show the BE engineer.**
> If Damir mentions this review, "the risks", "showing the BE engineer", the wallet wall-off,
> or the C# security check in ANY session → point him to THIS file and remind him it is the doc
> to walk the BE engineer through.
> Prepared 2026-07-09 (Opus). Keep current as C# lands. Pairs with SECURITY.md (§1 = the paramount isolation invariant).

## TL;DR
- The C# shipped so far does **NOT** weaken the wallet wall-off. Nothing shipped touches signing, keys, balances, or the payment broadcast path — it is all metadata pushes + non-money verbs.
- The isolation invariant (SECURITY.md §1) is what **contains a compromised chat**: chat is its own WebView, so a chat exploit cannot emit the destructive HomePage verbs.
- Biggest PLANNED landmine: **W5 `signSend`** — keep a native confirm before signing. Plus several pre-existing wallet/password bugs worth prioritising.
- **Standing rule (also in CLAUDE.md): any C# we write avoids the risky parts (§3 below).** If a task needs them → STOP, do not code it, log it here.
- **⚠ OPEN MAJOR (#234, pre-existing lock bypass — needs your eyes + a fix decision): the resume/privacy lock shows a "Cancel" that unlocks the app WITHOUT the password.** See §1a.

## 1. Shipped C# (BE-cutover #208–#219) — verdict: safe for the wall
No shipped change touches signing, keys, balances or broadcast. All of it is outbound metadata (group/bot kind, mention flag, reaction excerpt, call args, own-reaction keys, self-nick, version/address/language) or non-money verbs (uninstall, accept/decline request). Verified in source:

- **A1 uninstall** (`ixian:uninstall:<id>` → `MiniAppManager.remove`): SAFE. `remove()` returns early unless `appList.ContainsKey(app_id)`, then deletes the STORED `app.id` path — a hostile `../../` id fails the check and never deletes. (MiniAppManager.cs:334-346.)
- **X1 `imageToDataUri`**: SAFE in practice — every call site passes a C#-derived path (validated Address avatar, stored app icon, or user-picked file); no WebView string reaches it. It *would* be an arbitrary-file-read primitive if one ever did → add a code comment; never pass WebView input to it. Minor: it base64s whole files into the bridge payload (fine for avatars; do not point it at large files).
- **C7(b) remote app icon**: the IP-leak-on-invite-receipt is correctly gated behind the media-autoload pref. Good.
- **CH2 accept/decline → `removeFriend`** and **A1 uninstall**: destructive but non-money, on the HomePage WebView. Consistent with the EXISTING bridge trust model (legacy already has `ixian:remove`/`deleteh`). They are safe *because* of §1: a compromised chat WebView cannot reach these verbs (different WebView/bridge).
- Robustness nit (not a wall issue): `onAcceptRequest`/`onDeclineRequest` call `new Address(str)` before the null-guard — malformed input could throw in the handler. Try/catch it.
- **N1/N3 round 3 — OVERLAY NAVIGATION (#225): SAFE for the wall (Opus reviewer PASS).** Redesigned screens are no longer pushed; each loads hidden in HomePage's native Grid and is shown in place, closed = removed + Disposed. Each overlay keeps its OWN WebView / JS context / bridge — N isolated WebViews in one native grid = the sanctioned #221 model, NOT the rejected #220 single-host-WebView; no chat↔pane JS bridge exists; cross-surface coordination stays C#-only. Wallet money flows, scan, lock (modal) and mini-apps remain NATIVE pushed pages on the root NavigationPage (same §3 signing entry points). Review asks for BE: (a) the overlay stack lifecycle (SpixiContentPage.cs — closeOverlay/setOverlayHost/abandon paths all Dispose the WebView), (b) `hostNav` routing of native pushes from overlay pages, (c) parity of `Utils.getChatPage` overlay scan with the old stack scan (message routing).
- **LOCK modal load-then-present (#229): SAFE for the wall — one trade-off needs sign-off.** `pushModalLoaded` stages the LOCK page's WebView hidden (same containment as #222 — own WebView/bridge, Disposed on every abandonment path), presents via `PushModalAsync` on the root nav. Auth logic, unlock events and the encpass path are UNTOUCHED — the change is presentation timing + input gating. Hard guarantees: the lock can never be dropped (any staging obstacle → immediate plain modal push = old behaviour) and never fails open (a failed present clears the app's active-lock latch → next resume re-locks; `App.onLockPresentFailed`). During staging the abandoned screen stays VISIBLE up to ~1.3s but is input-FROZEN (`hostGrid.InputTransparent`; #46 reviewer MAJOR-1). Biometrics fire only once the lock is actually on screen. **Bonus fix: resume-lock used `ts.Seconds > 5` (the 0–59 component) — 63s in background = NO lock; now `TotalSeconds` (real pre-existing lock-bypass, worth BE eyes).** Review asks: (a) the ≤1.3s visible-but-frozen staging window vs your lock threat model, (b) LockPage OnAppearing/onload auth gating.
- **N1/N3 load-then-move preload (#222): SAFE for the wall — flag the lifecycle.** `SpixiContentPage.pushPageLoaded` stages the incoming page's WebView invisibly (Opacity 0, InputTransparent) inside the CURRENT page's native layout until the shell signals `ixian:onload`, then presents it. The staged page keeps its OWN WebView, JS context and bridge handlers — nothing is merged into the host's WebView and NO JS bridge is shared (§1 intact; same native-tree containment as the shipped desktop rightContent pattern). While staged, a conversation WebView (untrusted content) is briefly alive off-screen — bounded by a 4s timeout; every abandonment path (timeout-present, cancel, host popped) either presents it or `Dispose()`s it (handler disconnected), so it is never left running in the background. Review ask: confirm the teardown paths cover platform edge cases (WinUI/Android).

## 1a. ⚠ OPEN MAJOR — resume/privacy-lock bypass via Cancel (#234, Opus #233, PRE-EXISTING)

Surfaced during the #230 in-place-lock review; **not introduced by #227–#231** (lives in the lock wiring, ~#159). **The privacy lock that appears on app resume can be dismissed WITHOUT the password by tapping its "Cancel" button — the app unlocks.** This defeats the App-lock feature. Chain, all in the real tree:

1. Resume lock = `new LockPage(true)` (`App.xaml.cs:251`) → `justConfirm` = **confirm mode**.
2. `lock-shell.js lockSync` renders a **Cancel** button in confirm mode (`cancel.hidden = !confirm`, :123).
3. `lock-page.js onCancel()` → `br.send('ixian:change')` (:55).
4. `LockPage.onNavigating` for `ixian:change` under `justConfirm` fires `authSucceeded(this, false)` + closes the lock (`closeModalOverlay`/PopModal, :111-124).
5. The resume lock's `authSucceeded` handler is `App.onUnlock`, which **ignores the bool** and unconditionally sets `isLockScreenActive = false` (`App.xaml.cs:218-222`) → app is unlocked.

**Blast radius is limited to the resume lock.** The SettingsPage confirm-locks (delete wallet/account, lock-off) all check `e.Value`/`succeeded` and bail on false (`onDeleteWallet:299`, `onDeleteAccount:345`, `HandleAuthSucceeded:287`) — Cancel there safely aborts. The BOOT lock is `new LockPage()` (unlock mode, no Cancel, only a "Use another wallet"→LaunchPage hatch) = correctly un-dismissable. Only the resume lock's `true` opens the escape.

**Why not fixed in review:** `justConfirm` couples two axes — close-in-place-vs-rebuild-Home on success (resume wants close) and show-a-Cancel-escape (resume must NOT). Guarding `App.onUnlock` on the bool alone is insufficient (Cancel still CLOSES the lock → visible content with the latch stuck "locked"). The correct fix (a resume-lock mode that closes-in-place but has NO Cancel escape, or making `App.onUnlock` only release on `true` AND suppressing the Cancel path for resume) is a design/BE call. **✅ USER-CONFIRMED ON-DEVICE (Damir 2026-07-10):** "when the app prompts lock + password you can bypass on Cancel; reopening the app the lock has no Cancel" — resume/confirm lock Cancel bypasses (confirmed); boot lock is safe (no Cancel). Fail-closed target: a resume lock must require auth to dismiss, on every path.

### ⚠ MAJOR #2 — in-place lock over a NON-HomePage host was back-dismissable (Opus re-audit #235; **FIXED in review**, keep for context)

A distinct lock bypass, found by the break-my-verdict re-audit: `App.OnResume` stages the resume lock on `CurrentPage` (`App.xaml.cs:257`), which can be a pushed LEGACY page (Wallet Send / Scan / Backup / mini-app / …). `presentPreload.canShowInPlace` allowed the in-place opacity-flip whenever the host was top-of-stack, so the lock rendered inside the legacy page's Grid — but only `HomePage.OnBackButtonPressed` swallows back while `hasModalOverlay()`; every legacy page pops itself unconditionally (WalletSendPage:333, ScanPage:93, BackupPage:145, MiniAppPage:585, +~15 more). Hardware/gesture back → the host page pops → the lock stage is torn down → content exposed without auth, plus fail-open aftermath (stale `modalOverlayOp` freezes HomePage back forever; `isLockScreenActive` stuck → future resumes skip locking; leaked lock WebView). **FIX LANDED:** `canShowInPlace` now also requires `op.host == overlayHost` (`SpixiContentPage.cs`) — in-place only over the back-guarded HomePage; legacy-page hosts fall through to a real `PushModalAsync` (ModalStack sits above the page tree; the LockPage's own `OnBackButtonPressed` swallows back = un-poppable). BE ask: sanity-check the fix + confirm no legacy page needs the base-class back guard as belt-and-suspenders.

### ⚠ MINOR — resume-lock STAGING input-freeze targets the wrong grid for a non-Grid legacy host (Opus re-audit #246; pre-existing, low-reachability)

Surfaced during the DESKTOP PASS 2 lock scrutiny; **NOT introduced by #240–#245** (App.OnResume + `pushModalLoaded` both predate it). Distinct from MAJOR #2 (which was fixed): the *presentation* is safe — `canShowInPlace` requires `op.host == overlayHost` AND `NavigationStack.Last == op.host`, so a resume lock over a pushed legacy page always falls through to a real `PushModalAsync` (un-poppable). The narrow gap is the ≤1.2s **staging** window BEFORE present: `pushModalLoaded` freezes `hostGrid.InputTransparent` (`SpixiContentPage.cs:777-778`), but when the calling legacy page's `Content` is **not a Grid** the staging falls back to the overlay-host (HomePage) grid (`:723-732`) and freezes THAT — while the visible, on-top legacy page stays input-live for the staging window. Impact: input-only (no content exposure — the lock covers the page on present); reachable only for a legacy page with non-Grid `Content`, backgrounded then resumed (rare — most legacy pages have Grid content and freeze correctly). Fix (C#, your call): in the non-Grid fallback, also freeze the *actual visible* page's input during staging (or freeze both). Security-flagged → gated on your review (#232); low severity, no rush.

### ⚠ MAJOR #5 — the call RING could cover the LOCK, and a call event could POP the lock (Opus #46 loop over #270; DECISIONS #272; **FIXED in review** — please sanity-check)

Introduced by the Q4 native call surface (#270) and caught before it shipped. `CallPage` presents in place inside HomePage's Grid (ZIndex 100, under the lock's 200) — but when a **legacy page is pushed above the host** it falls back to a real `PushModalAsync`, and MAUI's **ModalStack sits above the entire page tree, i.e. above the lock stage**. Three consequences, none exotic: **(a)** a call arriving while the app was locked painted the **caller's nickname + avatar** and offered **Accept/Decline over the lock** (pre-#270 the DOM ring rendered *under* the lock — this was a new exposure); **(b)** `LockPage.performUnlock`'s `PopModalAsync()` pops the **top** modal → a successful unlock popped the **ring**, leaving the lock up; **(c)** worst: with a lock pushed *above* a modal ring (legacy page on top → background >5s → resume; `App.OnResume`'s `CurrentPage` check cannot see a modal), the call's own teardown — `CallPage.hideSurface` → `PopModalAsync` (**pop-the-top**) — **popped the LOCK** on the next remote hang-up or the 45s ring timeout, and `App.isLockScreenActive` stays latched ⇒ **no lock for the rest of the session**.

**FIX LANDED (FE-side C#, presentation only — no auth logic touched):** the lock and the call surface are now **mutually exclusive and the lock wins** — `CallPage.lockUp()` (in-place · pushed-modal · boot/root · **staging**, via the new derived `SpixiContentPage.isLockStaging()`) makes `ensureSurface` refuse to present, and `App.OnResume` tears any existing call surface down **before** staging the resume lock, so nothing can ever be modal-above a lock. `hideSurface` additionally pops **only** when the call page is the top of the modal stack (fail-closed, with a `Logging.error` tripwire). The call keeps running and **ringing audibly** while locked; the ring/bar re-presents within one UI tick of the unlock.

**BE asks:** (1) sanity-check the fix; (2) **product call** — is "rings audibly, no ring UI, appears on unlock" the behaviour you want, or should an incoming call be answerable from the lock screen (that needs a deliberate, native design, not a fallback side-effect)? (3) **Class-wide, logged not fixed:** `PopModalAsync` is *pop-the-top* at **every** call site in the tree (`LockPage:122/171`, `HomePage:1299`, `OnboardPage`, `DevPage`, `ContributorsPage`) — safe only because nothing stacks modals today. Any future second modal re-opens this whole class → a `popModal(page)` helper that refuses when the page is not top. (4) Related: `SpixiContentPage.OnDisappearing → Dispose()` is guarded only by `NavigationStack.Contains(this)`, **not** `ModalStack` — a modal covered by another modal has its WebView torn down. Unreachable today; not widened because MAUI's Disappearing-vs-pop ordering can't be verified from the tree (#215) and a wrong guard would leak every popped modal's WebView.

### ⚠ MAJOR #3 — chat link-open confirm modal is spoofable (Opus re-audit #235; C#/BE, be-cutover **C15**)

`SingleChatPage.xaml.cs:344` runs `WebUtility.HtmlDecode` on the link **after** the FE confirm modal already showed the pre-decode URL, then `Browser.OpenAsync`. `https://paypal.com&commat;evil.example.com/login` displays paypal-leading but opens host `evil.example.com`. Defeats the #231c "the modal shows the true target" mitigation. Fix (C#): don't HtmlDecode a URL for OpenAsync (or decode before showing) + add an http/https scheme allowlist at the sink. Details: be-cutover C15.

### ⚠ MAJOR #4 — the shells' localStorage may be readable by third-party MINI-APP code (Opus #46 loop over #253; DECISIONS #254; PRE-EXISTING, FE mitigated one key)

**The finding.** The redesigned shells are loaded from a bare local path — `SPlatformUtils.getHtmlBaseUrl()` returns `Config.spixiUserFolder + "/html/"` on Windows/iOS/Mac/Android (`Platforms/*/SPlatformUtils.cs:30-40`) → the WebView resolves it as a **`file://`** document. **Mini-apps** — third-party, publisher-supplied HTML/JS — are loaded as `"file://" + app_entry_point` (`Pages/MiniApps/MiniAppPage.xaml.cs:58`). In **Chromium-based WebViews (WebView2, Android WebView) all `file://` documents share ONE localStorage partition**; WKWebView likewise shares the default `WKWebsiteDataStore` across WebViews in a process unless explicitly given its own. If that holds on our platforms, **mini-app code can read every `spixi.*` key the shells write** — a non-chat, untrusted surface reading chat-derived data (SECURITY.md §1 / ★ #221 class).

**What's in there today** (FE-side state the redesign persists, all same-origin localStorage — the #238 `spixi.landtab` precedent):

| Key | Contents | Class |
|---|---|---|
| `spixi.draft.<addr>` | the user's **own composed message plaintext** (CH7) | ⚠ own message text |
| `spixi.exdel.<addr>` | deleted-tail excerpt hint (Q12) | **text DROPPED — now `{del, t, kind}` only, DECISIONS #254** |
| `spixi.likes.*` / `spixi.mentions.seen.*` / `spixi.pins` / `spixi.app.declined.*` / `spixi.exdel.*` (keys) | contact **addresses** + interaction metadata | ⚠ metadata / address disclosure |
| `spixi.chat.pattern` / `.textscale` / `landtab` / theme | UI prefs | benign |

**What the FE did (zero-C#):** the Q12 hint was about to persist a capped line of **counterpart-authored** message text; the loop **dropped the field** rather than widen the exposure (#254). Text tails degrade to an empty excerpt. Reversible if you confirm isolation.

**BE ask (the actual fix — C#/platform, not FE):**
1. **Confirm or refute the shared partition**, per platform, on-device (#215 lesson — don't assume): can a mini-app page read `localStorage.getItem('spixi.pins')`? A 5-line test mini-app answers it.
2. If shared → **give the mini-app WebView its own storage partition** (WebView2: a distinct `UserDataFolder`/environment; iOS/Mac: `WKWebViewConfiguration.WebsiteDataStore = WKWebsiteDataStore.NonPersistent()` or a per-app store; Android: a separate WebView data dir / `WebStorage` scoping). That closes the whole family at once — including the pre-existing **drafts plaintext**.
3. Until then, treat `spixi.draft.*` as the open item: it predates this batch and persists own message text in the same store.

Nothing here signs, moves money, or crosses the chat wall in the FE — the Q12 handshake is same-origin localStorage only, and after #254 its payload carries **no chat content at all**.

**#334 addendum — the ANDROID leg went LIVE via #331 and is now CONTAINED.** #331 flipped `DomStorageEnabled = true` renderer-wide to heal the dead-storage walk symptoms (AND-9) — which also **armed this finding's premise on Android for the first time** (pre-#331, Android DOM storage was off app-wide = accidental containment; the mini-app WebView rides the same globally-registered renderer, `MauiProgram.cs:46-48`). Landed same-session (#334): the flip is now scoped — `DomStorageEnabled = (ClassId != "miniapp")` (`Platforms/Android/WebViewRenderer.cs`) with `ClassId="miniapp"` on the MiniAppPage WebView (`MiniAppPage.xaml`) — shells keep localStorage, mini-apps keep the SDK-bridge storage they always had (zero functional regression: the flag was false for them until yesterday). Ask (1)'s 5-line test mini-app remains the formal closure; asks (2)/(3) (WebView2/WKWebView partition split) unchanged.

### ✅ CLOSED #267 — Downloads `..`-traversal on `ixian:open/delete:<name>` (was: MINOR→escalated at #264 S8)

**The guard LANDED with the S16 downloads-sublevel work (quirks-final ②, DECISIONS
#267), sanctioned by the work order ("★ the C# `..`-traversal guard must land with
it"):** `TransferManager.resolveDownloadPath(file_name)` — ONE shared, fail-closed
resolver (rejects empty / `..` / any separator / rooted input, then re-checks the
canonical full path stays under the Downloads root; rejects log via `Logging.error`)
— now runs on **all four** verb sites: the shipped `DownloadsPage` `ixian:open:` /
`ixian:delete:` pair AND the new SettingsPage `ixian:openDownload:` /
`ixian:deleteDownload:` pair. **BE: review the resolver** (TransferManager.cs, next
to `downloadsPath`) rather than re-deriving it.

**Residual, same class, DIFFERENT entry point (still open):** `TransferManager.cs:542`
composes `Path.Combine(downloadsPath, transfer.fileName)` from a **REMOTE-PEER-supplied**
file name at receive time — a hostile peer's `..\` name is a write-time traversal.
Verify + sanitize at the transfer-accept boundary (be-cutover S16 residual).

### ⚠ MAJOR #6 — mini-app WebView regressions from the iOS bring-up (#282/#283; Opus #46 loop over #282+#283; C#/BE — logged, NOT fixed)

Two regressions from the iOS bring-up batch reached the **mini-app** WebView — the one surface that runs third-party, publisher-supplied HTML/JS (`MiniAppPage.xaml.cs:57-60` loads `"file://" + app_entry_point`). Both come from GLOBAL wiring: `iOSWebViewHandler` is registered for `typeof(WebView)` (`MauiProgram.cs:51`), so everything it does applies to every WebView in the app, mini-apps included.

**(a) SECURITY — the iOS-10 external-link handoff gives mini-app content a one-tap, no-confirm Safari launch.** `SecureNavigationDelegate.DecidePolicy` (`iOSWebViewHandler.cs:29-51`) hands ANY http/https navigation with `NavigationType == LinkActivated` to `Browser.Default.OpenAsync` — silently. On the trusted shells this is the intended iOS-10 behaviour (and the redesigned chat flow shows an FE confirm modal before its `ixian:openLink` even fires). But on the mini-app WebView it means: publisher code renders a full-viewport anchor → the user's next tap opens ANY attacker URL in Safari — no confirm, instant IP disclosure to the link host plus a phishing ramp (the class MAJOR #3 is about, minus even the spoofable modal). Two gaps compound it: **(1)** there is no `TargetFrame`/`MainFrame` check — a link tap inside a mini-app iframe is still `LinkActivated`, so subframe content gets the same handoff (the code comment claims subframe loads stay blocked; that holds for subframe *loads*, not for link *taps* in subframes); **(2)** the handoff is keyed on navigation type alone, with no notion of which page hosts the WebView. Pre-#283, mini-app http/https was hard-`Cancel` with no handoff at all — this is a widened surface, not a parity fix. **Fix (C#, your review):** scope the handoff to trusted host shells — classify the hosting page (MiniAppPage → NO silent handoff; either keep hard-Cancel or route through a native confirm dialog showing the true host, honouring MAJOR #3's decode ordering) and add `navigationAction.TargetFrame?.MainFrame == true` to the gate for the shells that keep it. The content-rule allowlist (`iOSWebViewHandler.cs:95-120` — tenor/giphy/apps.spixi.io) is NOT a mitigation here: it gates in-WebView subresource loads, not the `Browser.OpenAsync` sink.

**(b) UX/robustness — mini-apps lost their safe-area inset. ✅ FIXED 2026-08-18 (#401) — please sanity-check.** `applyPlatformPageChrome` now classifies a page as needing native inset padding when `hasLegacyPageChrome(...) || !hasGeneratedContent`, and `hasGeneratedContent` is false exactly for `MiniAppPage` (it never calls `loadPage`). Applied on BOTH platform branches: iOS restores the pre-#282 padding, and the new Android full-bleed round (AND-7, which removes the root-view top padding for every other page) never introduces the twin defect there. The alternative — declaring inset-awareness part of the mini-app SDK contract — stays available as a product decision + SDK version gate. Original finding below, for the record. **(b) as reported:** `applyPlatformPageChrome` (`SpixiContentPage.cs:229-237`) now pads only the 8 filenames in `hasLegacyPageChrome` (`:197-213`); every other page gets `Padding = 0` on the premise that it is a redesigned, `viewport-fit=cover` + `env(safe-area-inset-*)`-aware shell. MiniAppPage never sets `loadedHtmlFileName` (it assigns `webView.Source` directly, bypassing the base-class loader), so it falls into the `else` → zero padding — but its content is third-party HTML that CANNOT be assumed inset-aware. Pre-#282 the blanket iOS padding covered it; post-#282 mini-app UIs render under the notch/home indicator. **Fix (C#):** classify MiniAppPage as legacy-chrome — either restore the native inset padding for it specifically (e.g. `hasLegacyPageChrome` keyed on the page type, not just the filename, or MiniAppPage overriding `applyPlatformPageChrome`) or declare inset-awareness part of the mini-app SDK contract (that is a product decision + SDK version gate, not a default).

Neither touches money or the chat wall directly; (a) is the actionable one — it hands an untrusted surface a user-gesture-cheap external-launch primitive that the trusted shells deliberately wrap in a confirm. Classification ask: confirm MiniAppPage's trust tier in the handler layer (it currently inherits every "trusted shell" behaviour the global handler ships, and will inherit the next one too).

### ⚠ MAJOR #7 — WKWebView delegates were GC-collectable: the http/https block could silently VANISH (found on-device 2026-08-07; DECISIONS #309; **FIXED in review** — please sanity-check)

`WKWebView.NavigationDelegate` and `.UIDelegate` are **weak** ObjC references, and `iOSWebViewHandler.ConnectHandler` assigned freshly constructed managed delegates without keeping a strong root — so the .NET GC could collect either at any time, and WebKit then silently reverts to its DEFAULT behavior. This was **observed on the iPhone**, not theorized: WebKit's own per-origin camera prompt ("Allow "Spixi" to use your camera?") appeared on every scan visit — a UI that is unreachable while `MediaCaptureUIDelegate` is alive (it auto-grants once AVFoundation is authorized). The camera symptom is the benign tell; the security half is `SecureNavigationDelegate`: **with it collected, the http/https `Cancel` + gated browser handoff disappear — a WKWebView with a nil navigation delegate ALLOWS navigations by default**, so remote http(s) content could load INSIDE any shell WebView (including chat — the #221 wall's own transport gate) until the page is rebuilt. Intermittent by GC timing, which is why every earlier F5 passed. **Fix landed (2 fields):** the handler now holds `_navigationDelegate`/`_uiDelegate` strong references for exactly the WebView's lifetime (released in `DisconnectHandler`). Your review asks: (1) sanity-check the retention pattern; (2) sweep the codebase for OTHER weak-delegate assignments without roots (`UIDelegate`/`NavigationDelegate`/`Delegate` setters on any ObjC-bridged object — the class is generic); (3) note the content-rule allowlist was ALSO downstream of this delegate's death only for the handoff path, not for loads (rules live in the configuration, unaffected by GC — no change needed there).

**#312 addendum (same day):** on-device probing refined the mechanism — beyond the GC hazard, **MAUI's post-connect property sync RE-ASSIGNS `UIDelegate`** (fork (a), confirmed: the delegate answers once re-asserted on the same WebView whose boot request prompted), so the strong roots alone were insufficient. Landed fix: `SecureNavigationDelegate.DecidePolicy` re-heals the UIDelegate on EVERY navigation (the main-frame file:// load precedes any page JS → deterministic), with a fixed-vocabulary log (a raw URL interpolated into an `EvaluateJavaScript` string would be a JS-injection vector — deliberately not done). The NAVIGATION delegate is empirically NOT clobbered (our DecidePolicy handles every nav — it is itself the probe's host), so the http/https block's runtime integrity holds; your sweep ask from the main paragraph stands.

*Running tally of global-handler behaviours the mini-app WebView inherits (grows until the trust-tier split lands):* the #283 link handoff (above) · the #293 `MediaCaptureUIDelegate` (mini-app content can trigger the OS camera/mic permission flow) · **the #301 F2 zoom pin** (`ScrollView.MinimumZoomScale = MaximumZoomScale = 1` — pinch-zoom disabled for third-party content that may rely on it; UX-only, no data exposure).

### ⚠ MAJOR #8 — ANDROID: mini-app WebView can XHR-read ARBITRARY app files, including `wallet.ixi` (#334 pre-audit; PRE-EXISTING; logged, NOT fixed)

The Android renderer sets `AllowFileAccess = true` + `AllowFileAccessFromFileURLs = true` for EVERY WebView (`Platforms/Android/WebViewRenderer.cs:370-371`; one compat renderer registered for `typeof(WebView)`, `MauiProgram.cs:46-48`), and the mini-app document is itself `file://` (`MiniAppPage.xaml.cs:57-58`). The resource gate passes every non-http(s) URL: `Utils.IsAllowedURL` (`Utils.cs:217-234`) returns true for anything not starting with http, so `ShouldInterceptRequest` (`WebViewRenderer.cs:76-85`) waves `file:///…/Spixi/wallet.ixi` (`Config.cs:20-22`) — and the account/chat-history files — straight through to publisher JS via fetch/XHR. **Strictly worse than MAJOR #4** (files, not localStorage keys) and Android-specific in this severity (iOS gates through a different mechanism). **Fix (C#, your review + on-device verify per #215):** gate `AllowFileAccessFromFileURLs` OFF for the `miniapp`-tagged WebView — but FIRST verify with a real mini-app that its own asset loading survives (relative same-directory loads may ride `AllowFileAccess` alone) — and/or extend `ShouldInterceptRequest` to reject `file://` targets outside `html/Apps/<id>/` for mini-app WebViews. Deliberately NOT landed this session: needs the real-mini-app verification you can run at the walkthrough.

### ⚠ MAJOR #9 — ANDROID: `OnPermissionRequest` auto-grants mic/camera to EVERY WebView, mini-apps included (#334 pre-audit; PRE-EXISTING; logged, NOT fixed)

`SpixiWebChromeClient.OnPermissionRequest` (`Platforms/Android/WebViewRenderer.cs:52-56`) calls `request.Grant(request.GetResources())` unconditionally, for every WebView on the shared renderer. Once the app holds RECORD_AUDIO/CAMERA (after the first call/scan), third-party mini-app JS calling `getUserMedia` gets the mic/camera **silently** — no prompt beyond the OS indicator dot. This is the Android twin of the MAJOR #6 trust-tier ask (and of the #293 `MediaCaptureUIDelegate` tally row). **Fix (C#, your review):** scope the auto-grant to trusted shells (scan is the only legitimate consumer today); deny — or route through a native prompt — for `miniapp`-tagged WebViews.

### ⚠ TRUST-SIGNAL — presence "online" stays green ~2 min after a peer quits (F4, iPhone F5 2026-08-04; DECISIONS #300/#301; BE/Ixian-Core — logged, deliberately NOT patched in the shell)

A green presence dot is a **trust signal**: users message someone the app asserts is
online and read silence as intent. Damir's device F5: the most-recently-online contact
keeps showing **online for ~2 minutes after that person closed Spixi**; an app restart
clears it. The FE render is correct — it faithfully shows what C# pushes (verified at
batch-A A4). The staleness is upstream: `Node.cs:418-455` reports online while a
`PresenceList` entry exists and `friend.relayNode != null`, and it only goes false when
the PL entry **expires** — nothing signals a clean quit. `StreamProcessor.cs:217-222`
additionally force-sets online on any inbound stream message. So "online" really means
*"announced in the presence list and not yet expired"* — and the restart-clears-it
symptom fits exactly (a fresh process rebuilds the PL from the network instead of
carrying the stale entry).

**Why the shell must not "fix" this:** there is no honest signal to render differently —
any FE-side timeout would be a second guess layered on a stale claim. Two BE-side ways
out (either or both): **(1)** shorten presence expiry / send an explicit offline announce
on clean shutdown (Ixian-Core); **(2)** soften the claim — a "last seen …" treatment
instead of a binary dot, which becomes an FE job **once the bridge carries a timestamp**
(it currently pushes only the boolean). Files with the chat-transport work order
(`docs/chat-transport-spec.md`) — same engagement, same owner.

### ℹ #315 — Account overlay now PARKS (warm WebView) instead of disposing on close (2026-08-07 №2; presentation-lifecycle only)
The narrow-mode SettingsPage keeps ONE hidden-but-alive WebView between opens
(iOS-46 route (a): instant re-present). **No new attack surface**: the page keeps its
own isolated WebView/JS context (§1/#221 unchanged), no data crosses anywhere it
didn't before, the bridge gained one C#→JS push (`onRepresented`, no arguments) and
zero JS→C# verbs. Reviewed properties worth your eyes: the re-present path REFUSES
while the privacy lock is shown in place (fail-closed, same #230 gate class as
pushPageLoaded), and a parked page is torn down on host recreation, on
`reloadAllPages` (theme/language), and under memory pressure (`Node.onLowMemory`).
Residual accepted: a jetsam-killed parked content process re-presents blank until one
of those teardowns fires (never a data exposure — the page shows nothing).

## 1b. ⚠ FOUND 2026-08-13 (#341 audit) — the change-password path, three items

Two of these were **fixed in #341**. The third is **logged and NOT patched** — it needs
its own test and its own decision.

**① FIXED — the wallet password change did not update the cached password, and the
result was a lockout plus an unrestorable backup.**
`Node.loadWallet` reads `Preferences["walletpass"]` at every cold start
(`Spixi/Meta/Node.cs:248-256`). `EncryptionPassword` re-encrypted the wallet and never
touched that preference. Therefore the next launch opened the wallet with the OLD
password, failed, and dropped the user on `LaunchRetryPage`. `BackupPage.xaml.cs:144`
encrypts the backup archive with the same preference, so a backup taken between the
change and the next restart needed one password for the archive and a different one for
the wallet inside it. Create, restore and retry all set the preference
(`LaunchCreatePage:197`, `LaunchRestorePage:139`, `LaunchRetryPage:64`); only the change
path did not. **This shipped.** Both routes now set it, and both first CONFIRM that the
new password opens the wallet — `writeWallet` is called as a statement everywhere in
this repo, so a failure reported by return value would otherwise move the cached
password while the wallet file stayed on the old one.
🟡 **For BE:** confirm on device that `isValidPassword` reports false after a failed
`writeWallet`. The confirmation belt is cheap, not proven (rule #215). If `writeWallet`
returns a bool, please read it at every call site in this repo.

**② FIXED — an exception on a password path put both passwords into a shareable log.**
The change-password branch had no `try/catch`. A throw escaped `onNavigating`, so
`e.Cancel` was never set at the end of the chain, and `iOSWebViewHandler.cs:116` logs
`navigationAction.Request.Url.AbsoluteString` — the whole `ixian:changepass:` URL. That
file is `ixian.log`, which `DevPage` renders into a WebView and offers through the OS
share sheet. Both routes are now fenced, and neither catch logs the URL.
🟡 **For BE — the general rule this exposes:** ANY unhandled exception on ANY `ixian:`
navigation reaches that logger. Every verb that carries a secret must be fenced. Please
review the iOS handler: logging a full bridge URL on error is unsafe as a default.

**③ LOGGED, NOT PATCHED — deleting the wallet leaves the plaintext wallet password in
Preferences.** `SettingsPage.xaml.cs:633` removes the key `"waletpass"`. The key that is
written everywhere else is `"walletpass"`. The typo is harmless at
`LaunchCreatePage:192` and `LaunchRestorePage:135`, because both set the real key
immediately after. Here it is not harmless: `onDeleteWallet` is the path that is meant
to leave nothing behind, and the plaintext password survives it. One character fixes it,
but it changes what a delete removes, so it needs its own test. This belongs with the
punch-list item E1 ("Delete account must remove all data").

**Standing note on the password transport.** `ixian:changepass:<DELIM>old<DELIM>new`
carries plaintext password material in a navigation URL. #341 did not invent this and
did not widen it, but the pattern now has a second host page. The navigation is
cancelled by C#, so no history entry keeps the URL, and the shell scrubs its fields on
every leave path. A non-URL transport for secrets is still the correct long-term ask.

## 1c. ★ THE MONEY-PATH DELTA (#522–#529, 2026-08-23) — REVIEW THIS BEFORE RELEASE

**W5/W6/PA1 are BUILT. Per the #232/#523 gate, this delta must not ship to users before
your review.** One new file carries all of it: `Spixi/Utils/SPayments.cs` (~330 lines).
Page edits: HomePage + SingleChatPage dispatch four `StartsWith(…, Ordinal)` verbs into
it; SettingsPage adds the `paymentauth` preference.

The contract, in one paragraph: the WebView COMPOSES and emits
`ixian:signSend:<addr>:<amount>` (or `ixian:payRequest:<msgIdHex>`). `SPayments`
re-validates the address (`ExtendedAddress.Validate`), re-parses the amount
(`IxiNumber`), computes its own fee, re-checks the balance, then shows a NATIVE
`DisplayAlert` built ONLY from those values — recipient (nickname + FULL address),
amount, fee — then optionally the Plugin.Fingerprint auth (PA1, fail-closed on error,
WinUI-skipped like the app lock), and only then calls `Node.sendTransactionFrom` —
the SAME sign+broadcast site the legacy pages use. Every outcome answers with a push;
the shell never resolves a money action alone. Re-entry is latched app-wide.

What to check hardest:
1. `handleSignSend` / `handlePayRequest` — confirm-before-sign order (smoke-pinned +
   mutation-proven), the null guard after `sendTransactionFrom`, the settled-state
   re-check after the await in payRequest.
2. `handleFeeQuery` — read-only by design; confirm nothing in the estimate path can
   broadcast (it uses `Node.calculateTransactionFee`, the legacy estimator).
3. `onSendRequestFromChat` (SingleChatPage) — the peer-scope Ordinal compare + the
   approved/Normal/!bot guard. A request is a chat message; nothing signs.
4. The improvements over legacy you should keep: the legacy confirm never showed the
   destination (`wallet_send_2.html:133` unwritten); WalletContactRequestPage:148 has
   no null guard (NRE on failed broadcast) — the new path guards it, the legacy page is
   yours untouched until the §5 repoint.

## 2. Planned C# — risk ranking
| Item | Risk | Insist on |
|---|---|---|
| **W5** `ixian:signSend` | ~~HIGH~~ **BUILT (#523) — see §1c above.** The native-confirm contract it insisted on is exactly what shipped: re-validate + native OK/Cancel BEFORE signing, review-before-release. | §1c |
| **C3** inline Pay on a request card | ~~Medium~~ **BUILT (#523) as `ixian:payRequest`** — the inline Pay now IS a native-confirm path (SPayments), not a signed inline path. Old exe keeps `ixian:viewPayment`. | §1c |
| **C12** `attachData`/`attachClipboard` (WebView base64 → C# temp file → send) | Medium | C# names the temp file itself (never a WebView name → overwrite/traversal); cap payload size (DoS); validate MIME. New "WebView writes a file" ingress — no money, but new surface. |
| **CH3** delete + history/media wipe verbs | Medium | Auth-gate consistently (§9.1: `deleteh` is not LockPage-gated like account/wallet deletion). |
| **S13** promote `openLink` to global | Low | Keep the URL validated; minor phishing vector from chat. |

Pre-existing wallet/security bugs (NOT caused by our C#; high value for a security-conscious BE):
- **L6** restore mutates state (wipes onboarding/lock flags, overwrites stored `walletpass`) BEFORE verifying the password → wrong password = lockout + data loss. Verify-then-mutate.
- **L8 / §9.1** the wallet password is stored in PLAINTEXT `Preferences["walletpass"]`. **PARTLY CLOSED #346:** the one HARMFUL removal site — `onDeleteWallet`, `SettingsPage.xaml.cs:732` — used the misspelled key `"waletpass"` and therefore removed nothing, so the plaintext secret survived the one action whose whole meaning is "destroy the wallet". Corrected. The same typo at `LaunchCreatePage.xaml.cs:192` and `LaunchRestorePage.xaml.cs:135` is harmless (both `Set("walletpass", …)` on the next line) and was left alone. **STILL OPEN and still the real ask: move it to SecureStorage.** Two `// TODO: encrypt the password` markers mark the intent (`Node.cs:250`, `LaunchRetryPage.xaml.cs:63`). Related: `LaunchRetryPage.proceed` caches the typed password BEFORE validating it, so every failed unlock leaves a WRONG plaintext password on disk.
- **L2 / §9.2 — ⚠ THIS ROW WAS WRONG, corrected #346.** Passwords do ride navigation URLs. `HttpUtility.UrlDecode` is FORM decoding, so a literal `+` becomes a space and `%41` becomes `A` — proven with Roslyn. **But the claimed lockout DOES NOT HAPPEN.** Every password path applies the IDENTICAL decode — `LockPage.xaml.cs:93` · `LaunchRestorePage.xaml.cs:36` · `LaunchRetryPage.xaml.cs:33` · `LaunchCreatePage.xaml.cs:43` · `SettingsPage.xaml.cs:170` · `EncryptionPassword.xaml.cs:34` — and no XAML in the tree contains `IsPassword`, so no native entry can disagree. The wallet is written under the mangled string and every later entry mangles the same way, restore included. The earlier "decoded differently on create vs unlock" claim does not survive reading the six sites: they differ only in how they SPLIT, after an identical decode.
  **★ DO NOT "FIX" THE TRANSPORT.** Any change that makes `+` faithful breaks every existing wallet written under the mangled password. `LaunchCreatePage.xaml.cs:65` already carries a guardrail comment forbidding exactly this, for exactly this reason.
  Two residuals that ARE real, and both are yours to judge:
  1. The stored password is not the password the user believes they have. It only bites OUTSIDE this app — for example `wallet.ixi` opened by another Ixian client. `WalletStorage` lives in Ixian-Core and is not in this repo, so it is unverifiable here. **Test:** create a wallet with password `a+b` in Spixi, then open `wallet.ixi` in the Ixian desktop client with `a+b` and with `a b`.
  2. The decode is not injective: `a+b` and `a b` unlock the same wallet, so every `+` silently costs a character of entropy.
  The clean end state is still one canonical decode-safe capture — but it needs a MIGRATION, not an edit.
- **§9.1** ~~`ixian:open/delete:<file>` (downloads) do no filename sanitisation~~ ✅ CLOSED #267 (`TransferManager.resolveDownloadPath`, both hosts); residual = the receive-time `transfer.fileName` write path (TransferManager.cs:542).

## 3. Standing rule — C# work AVOIDS the risky parts
Any C#/bridge change we make must NOT:
1. Sign or broadcast a transaction from WebView-composed data **without a native confirm** (C# re-validates + native OK/Cancel).
2. Move private keys, seed phrases, or the wallet password across the bridge or into the WebView.
3. Feed a **WebView-supplied path/filename** into a filesystem op (C# names its own temp files; validate ids against a stored list, as `remove()` does).
4. Wire a **JS bridge between chat and other panes** — cross-surface coordination is C#-only (SECURITY.md §1).
5. Extend the **password-over-URL** pattern.
6. Auto-fetch a remote resource that **leaks the user's IP** without the media-autoload gate.

If a planned task appears to need any of the above → **STOP, do not code it, add it to this file, and it becomes a BE-engineer discussion**, not a silent change.

## 1d. 🟡 The money-confirm dialog over a lock (#530 loop, NIT-2 — verify on device)

The W5/W6 native confirm root-routes via `displaySpixiAlert` → `Application.Current.
MainPage.DisplayAlert` (a PLATFORM dialog, above the MAUI page tree). This is
LEGACY-PARITY (every `displaySpixiAlert` in the app shares the class; the legacy
WalletSend2Page used `DisplayAlert` too), and the #272 pop-the-lock mechanism is
ABSENT here — a platform DisplayAlert is not on MAUI's ModalStack, so `PopModalAsync`
cannot pop it and dismissing it cannot pop the lock. But in a narrow race — Send
tapped, then a resume-lock fires before the queued `MainThread` alert runs — the
confirm could paint over an in-place lock. Confirming there only signs a payment the
user already composed (no wallet-data leak). **Ask: reproduce the race on device
first (#215/#294). If real, the belt is to gate `SPayments.handleSignSend` /
`handlePayRequest` on the lock-active field (same field #272 added), so a money
confirm never opens while a lock is up.** Not fixed pre-emptively — no mechanism was
reproduced, only surfaced by reading.

## 1e. 🟡 Bot-group protocol rows (2026-08-24 F5 evidence, Ixian-Core frozen at 097341a)

Four core-side items, each with file:line, surfaced by the A1/D1/F5 walk. None are
FE-fixable; the shell already renders the honest fallback for each.

1. **Roster gap — writers can be absent from the member list.** The client-side hook
   that would fetch an unknown group sender's record on message arrival is COMMENTED
   OUT (`CoreStreamProcessor.cs` ~:970, the "Add a pending chat list for bots" TODO).
   A message is accepted; the roster is not updated. The shell shows the writer's
   address on the bubble (SingleChatPage.resolveNick fallback) but the members list
   only reads `friend.users.contacts`.
2. **The 500-contact roster cap.** `BotUsers.setPubKey` (Ixian-Core
   Streaming/Bot/Users/BotUsers.cs:193) DROPS entries past 500 — "TODO temporary
   limit, should be removed after switching to db". A big public room can never list
   more than 500 members on the client.
3. **Post-leave streaming.** After a bot-group leave, the server keeps streaming that
   group's messages — "Received message for group … that is invalid" repeats in every
   log captured on 2026-08-24. Each is re-validated and re-logged forever.
4. **No poison-message drop.** The same 4 undecryptable payloads ("mac check in
   ChaCha20Poly1305 failed" → "Data length is negative: -1903019248" etc.) are
   retried every few seconds ACROSS RESTARTS (all three 2026-08-24 logs). The client
   never acks/drops an undecryptable offline message, so the S2 redelivers it
   forever — battery + log churn, and it buries real errors.
