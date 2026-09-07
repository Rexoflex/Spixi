using System;
using System.Runtime.InteropServices;
using Foundation;                        // #310: NSObject + [Export] for the explicit UIDelegate adopter
using Microsoft.Maui.ApplicationModel;   // MainThread + Browser (iOS-10 handoff)
using Microsoft.Maui.Handlers;
using Microsoft.Maui.Platform;
using UIKit;
using WebKit;

namespace Spixi.Platforms.iOS
{
    class SecureNavigationDelegate : MauiWebViewNavigationDelegate
    {
        readonly iOSWebViewHandler? _owner;   // #311: reach the handler's UIDelegate root for the runtime probe/re-assert
        bool _udProbed;                       // one-shot per WebView
        int _reassertLogged;                  // #312: log the first heals only, never spam

        public SecureNavigationDelegate(WebViewHandler handler) : base(handler)
        {
            _owner = handler as iOSWebViewHandler;
        }

        /* ★ handover sweep O-16: OUR DIAGNOSTICS DO NOT GO INTO A PUBLISHER'S CONSOLE.
         *
         * `MauiProgram.cs` registers this handler for typeof(WebView), so it also serves the
         * MINI-APP WebView, which renders third-party publisher code. Writing a `[cam-perm]`
         * line with `EvaluateJavaScript` puts our diagnostic into whatever document holds the
         * WebView — including that publisher's page. The values are a fixed vocabulary, so this
         * is not an injection; it is our internal state, offered to code that is not ours.
         *
         * The page-console half is now gated on the same trust marker the batch already uses
         * for a PRIVILEGE (`isTrustedHost`). FAIL CLOSED: a host this code cannot identify gets
         * nothing. The `ixian.log` half is kept at every call site — that file is ours, so no
         * line becomes undiagnosable, and the Inspector workflow still works on our shells. */
        void forwardToConsole(WKWebView webView, string msg)
        {
            if (_owner == null || !_owner.isTrustedHost())
            {
                return;
            }
            try { webView?.EvaluateJavaScript("try{console.error('" + msg + "')}catch(e){}", null); } catch { }
        }

        public override void DecidePolicy(WKWebView webView, WKNavigationAction navigationAction, Action<WKNavigationActionPolicy> decisionHandler)
        {
            // iOS bring-up 2026-07-22 (sim crash, 20:37 report): a managed exception escaping this
            // WebKit callback is an uncaught NSException -> abort. Guard + log; fail closed (Cancel).
            // #273-#281 review C1: WebKit raises a NATIVE NSException when a decision handler
            // runs twice, and the managed catch cannot intercept that — track whether a
            // decision was already delivered so the fail-closed Cancel never double-fires
            // (base.DecidePolicy may have decided before throwing).
            bool decided = false;
            Action<WKNavigationActionPolicy> decide = policy => { if (decided) return; decided = true; decisionHandler(policy); };
            try
            {
                var url = navigationAction.Request.Url?.AbsoluteString ?? "";

                /* #312 (device round 4, 2026-08-07): fork (a) CONFIRMED — the mic probe logged
                 * `[cam-perm] invoked` on the SAME WebView whose boot camera request had just
                 * prompted, so the delegate works once re-asserted; something in MAUI's
                 * post-connect property sync swaps UIDelegate, and the #311 first-ixian heal
                 * RACES the scan shell's boot getUserMedia (auto-enter fires in the same JS
                 * task that emits ixian:onload — two IPCs, warm entries lose, cold launches
                 * win — exactly the observed fresh-OK / re-entry-prompts split). The heal now
                 * runs on EVERY navigation, which includes the MAIN-FRAME file:// load: that
                 * one fires before the page even parses, so it deterministically precedes any
                 * page JS. Cost: one native property read per bridge nav. The log vocabulary
                 * is FIXED ("load"/"ixian:*") — never interpolate a raw URL into an eval. */
                if (_owner != null && !(webView.UIDelegate is MediaCaptureUIDelegate))
                {
                    webView.UIDelegate = _owner.EnsureUiDelegate();
                    if (_reassertLogged < 2)
                    {
                        _reassertLogged++;
                        var rm = "[cam-perm] reasserted at nav " + (url.StartsWith("ixian:", StringComparison.OrdinalIgnoreCase) ? "ixian:*" : "load");
                        forwardToConsole(webView, rm);
                        try { IXICore.Meta.Logging.info(rm); } catch { }
                    }
                }

                /* #311 (device round 3, 2026-08-07): the [cam-perm] delegate has provably never
                 * been consulted (a FRESH mic getUserMedia prompted WebKit's own dialog with no
                 * [cam-perm] line) — with the delegate strong-rooted AND explicitly exported.
                 * Remaining forks: (a) something re-assigns UIDelegate after ConnectHandler
                 * (MAUI internals), (b) the selector never registered, (c) WebKit stopped
                 * consulting this API. This one-shot runs at the page's FIRST bridge navigation
                 * — the page is alive and it lands right BEFORE the scan shell's auto-enter
                 * getUserMedia — logs the RUNTIME UIDelegate identity + respondsToSelector,
                 * and if the delegate is not ours RE-ASSERTS it (= the fix, if fork (a)). */
                if (!_udProbed && url.StartsWith("ixian:", StringComparison.OrdinalIgnoreCase))
                {
                    _udProbed = true;
                    try
                    {
                        var ud = webView.UIDelegate;
                        var udName = ud == null ? "NULL" : ud.GetType().Name;
                        bool responds = false;
                        try { responds = (ud as NSObject)?.RespondsToSelector(new ObjCRuntime.Selector("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:")) ?? false; } catch { }
                        bool reasserted = false;
                        if (!(ud is MediaCaptureUIDelegate) && _owner != null)
                        {
                            webView.UIDelegate = _owner.EnsureUiDelegate();
                            reasserted = true;
                        }
                        var msg = "[cam-perm] probe uiDelegate=" + udName + " respondsToSelector=" + responds + (reasserted ? " REASSERTED" : "");
                        forwardToConsole(webView, msg);
                        try { IXICore.Meta.Logging.info(msg); } catch { }
                    }
                    catch { /* diagnostics must never break navigation */ }
                }

                if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                    url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    // iOS-10 (#283): http/https NEVER loads in-WebView (unchanged invariant),
                    // but a REAL link tap now hands off to the OS browser — parity with
                    // Windows/redesigned flows, which route external links through the one
                    // Utils.openExternal gate (ixian:openLink / HomePage guide-about links).
                    // Gated on LinkActivated: only a user-gesture anchor tap qualifies —
                    // programmatic redirects and scripted location changes stay Cancel-blocked
                    // with no handoff (no silent IP-leak vector).
                    // ⚠ #772: this comment also claimed "subframe loads" were covered, and the
                    // code did not test the frame at all — a subframe anchor tap handed off
                    // exactly like a main-frame one. The frame test below is what makes that
                    // sentence true.
                    /* ★ security MAJOR #6(a) (handover sweep): THE HANDOFF IS FOR OUR OWN
                     * SHELLS ONLY, AND FOR THE MAIN FRAME ONLY. MauiProgram.cs registers this
                     * handler for typeof(WebView), so the MINI-APP WebView rides it too
                     * (Pages/MiniApps/MiniAppPage.xaml) — third-party publisher code could
                     * therefore open an arbitrary URL in Safari, and neither the frame nor the
                     * host was tested. The gate honours the SAME untrusted-content marker
                     * Android keys its privilege drops on (ClassId="miniapp";
                     * Platforms/Android/WebViewRenderer.cs, DomStorageEnabled and the console
                     * forward), and it requires the main frame to be navigating itself: a
                     * subframe anchor loses the handoff, a subframe retargeting _top loses it,
                     * and a blank target (TargetFrame is null for a new window) loses it.
                     * FAIL CLOSED — the host must be PROVEN one of ours; an unidentifiable
                     * host is untrusted and gets no handoff.
                     * The Cancel below is UNCHANGED for every case, trusted or not: remote
                     * content still never loads in any WebView, ours or a publisher's. No
                     * shipped shell has an http anchor at all (every external link goes
                     * through the ixian:openLink verb), so this costs our own pages nothing. */
                    bool trustedHost = _owner != null && _owner.isTrustedHost();
                    bool mainFrameOnly = navigationAction.TargetFrame?.MainFrame == true
                                         && navigationAction.SourceFrame?.MainFrame == true;
                    if (trustedHost && mainFrameOnly && navigationAction.NavigationType == WKNavigationType.LinkActivated)
                    {
                        var external = url;
                        MainThread.BeginInvokeOnMainThread(async () =>
                        {
                            /* ★ THE ONE EXTERNAL-OPEN GATE (Spixi/Utils/Utils.cs). This site is
                             * a different tier from the ixian:openLink verbs — the URL is an
                             * anchor href inside one of OUR OWN shells, already narrowed to the
                             * main frame of a trusted host by the guard above — but it is still
                             * an external open, and the walk that proves "one sink, one home"
                             * only holds if EVERY site goes through the gate. What changes for
                             * this site: the string is parsed once instead of by `new Uri`, an
                             * unparsable href is refused instead of throwing inside the
                             * dispatched lambda, and an href carrying userinfo no longer hands
                             * off. No shipped shell has an http anchor at all (every external
                             * link goes through the ixian:openLink verb), so nothing of ours
                             * loses a hand-off today.
                             * The gate keeps the G-1 rule this catch held: it logs the scheme
                             * and the exception TYPE, never the URL and never ex.Message. */
                            try { SPIXI.Utils.openExternal(external); }
                            catch (Exception oex) { IXICore.Meta.Logging.error("Browser handoff failed for a {0} link: {1}", verbLabel(external), oex.GetType().Name); }
                        });
                    }
                    decide(WKNavigationActionPolicy.Cancel);
                    return;
                }

                base.DecidePolicy(webView, navigationAction, decide);
            }
            catch (Exception ex)
            {
                /* ★ security MAJOR (handover sweep A-1 / G-1): THE URL NEVER REACHES THE LOG.
                 * The try above wraps base.DecidePolicy, and that is the call which raises
                 * MAUI's Navigating event — so EVERY page's onNavigating runs inside it. Five
                 * bridge grammars carry a plaintext wallet password:
                 *   ixian:unlock:<pass> · ixian:create:<nick>:<pass> · ixian:restore:<pass> ·
                 *   ixian:proceed:<pass> · ixian:changepass:<old>--<delim>--<new>
                 * LockPage.doUnlock is not fenced, so a throw on a wrong password wrote that
                 * password into ixian.log — a file DevPage renders and shares to the OS share
                 * sheet in one tap. Log the verb NAME only; verbLabel below is the one label a
                 * navigation may carry here.
                 * ⚠ LaunchPage's create, restore and proceed legs ARE fenced now
                 * (LaunchPage.runFencedVerb, same batch). This label is still the defence for
                 * LockPage and for any page that gains a password verb later, so it does not
                 * depend on a page-side fence.
                 * ⚠ The exception object is still logged in full. It is the reason this catch
                 * exists (a managed exception escaping a WebKit callback aborts the process),
                 * and no handler on the password verbs composes a password into an exception
                 * message today. This file cannot enforce that, so it is recorded as a
                 * residual and not claimed as an invariant. */
                try { IXICore.Meta.Logging.error("Exception occured in DecidePolicy for '{0}': {1}", verbLabel(navigationAction?.Request?.Url?.AbsoluteString), ex); } catch { }
                if (!decided) { try { decide(WKNavigationActionPolicy.Cancel); } catch { } }   // C1 (re-review R3): route through the one-shot — a deferred base continuation can no longer double-fire
            }
        }

        /* ★ A-1 / G-1: the ONE label a navigation may carry into any log line in this file.
         * This mirrors LaunchPage.logVerbName (Pages/Launch/LaunchPage.xaml.cs). That method
         * is private to its page, so the RULE is restated here rather than imported; keep the
         * two in step if either changes.
         * The rule: take the scheme, and for our own bridge URLs the verb name up to and
         * including the second ':'. Refuse anything outside a conservative ASCII alphabet, so
         * a crafted verb cannot smuggle a payload into the "name". A password, a nickname, a
         * host, a path and a query can never survive this. */
        internal static string verbLabel(string? url)
        {
            try
            {
                if (string.IsNullOrEmpty(url)) return "<none>";
                int colon = url.IndexOf(':');
                if (colon <= 0) return "<unrecognized>";
                string scheme = url.Substring(0, colon);
                if (scheme.Length > 16 || !isAsciiAlnum(scheme)) return "<unrecognized>";
                if (!scheme.Equals("ixian", StringComparison.Ordinal)) return scheme + ":";
                int sep = url.IndexOf(':', colon + 1);
                string name = sep >= 0 ? url.Substring(0, sep + 1) : url;
                /* A LENGTH BOUND as well as an alphabet. Every password grammar carries a
                 * second ':', so the cut above already drops the payload for all five of
                 * them; the bound covers the case with NO second colon, where the whole URL
                 * would otherwise be the "name" and an all-alphanumeric payload would pass
                 * the alphabet test. The longest bridge verb is far under this.
                 * ⚠ LaunchPage.logVerbName has the alphabet rule but not this bound. It is
                 * reported with this batch rather than changed from here. */
                if (name.Length > 48) return "<unrecognized>";
                foreach (char c in name)
                {
                    // the verb name alphabet: our verbs are ASCII letters, digits and ':'
                    if (c != ':' && !isAsciiAlnum(c)) return "<unrecognized>";
                }
                return name;
            }
            catch (Exception)
            {
                return "<unrecognized>";   // a label must never break the line it labels
            }
        }

        static bool isAsciiAlnum(char c)
        {
            return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
        }

        static bool isAsciiAlnum(string s)
        {
            if (s.Length == 0) return false;
            foreach (char c in s)
            {
                if (!isAsciiAlnum(c)) return false;
            }
            return true;
        }
    }

    /* iOS scan: the camera never turned on (Damir F5 2026-07-29).
     * getUserMedia() in a WKWebView does NOT reach the OS permission sheet by itself —
     * WebKit asks the WKUIDelegate via requestMediaCapturePermissionForOrigin:…, and
     * with NO UIDelegate installed that request is auto-DENIED. The shell then correctly
     * showed its "camera denied" state, so it looked like a permission refusal when in
     * fact nothing was ever asked. Info.plist already carries NSCameraUsageDescription.
     * We ask AVFoundation for the real OS permission first and mirror the user's answer
     * back to WebKit — the WebView never gets capture the user hasn't granted.
     * ★ Handover sweep D1: that was the ONLY test, and it is not enough. The request is now
     * refused unless the hosting page is one of ours, the type is the camera, the frame is
     * the main frame and the document is the scan shell — see captureRefusal below. */
    /* #310 (device round 2, 2026-08-07): the [Model]-subclass override was NEVER invoked on
     * device — WebKit kept showing its OWN per-origin camera prompt on every scan visit, a
     * UI that is unreachable while this delegate decides, and the r2 strong-rooting (#309)
     * changed nothing → GC was not the (sole) cause; the override simply wasn't being
     * consulted. Rebuilt as an explicit NSObject + IWKUIDelegate adopter with a
     * hand-written [Export] of WebKit's exact selector — the registrar-proof shape (this
     * app already hit two registrar bug families, #280/#281; SPushService's hand-written
     * exports with block params run fine on this same device/Debug registrar today).
     * Every invocation is OBSERVABLE (#215): entry + AVFoundation status forward into the
     * page console as [cam-perm] lines, so the #304 Inspector workflow can PROVE whether
     * WebKit consulted us — if the prompt shows and no [cam-perm] line ever logs, the
     * selector is not being called at all (next suspect: a newer WebKit delegate API
     * superseding this one on current iOS).
     * ⚠ Handover sweep O-16 narrowed the PAGE-CONSOLE half to a trusted host, so the
     * Inspector workflow above reads our own shells only. `ixian.log` still receives every
     * line from every host, so nothing became undiagnosable. */
    class MediaCaptureUIDelegate : NSObject, IWKUIDelegate
    {
        /* ★ D1 (handover sweep): the root of the trust test. The delegate is created by the
         * handler that owns the WebView, so it can ask that handler which tier the hosting
         * page belongs to. Null owner = an unidentifiable host = untrusted (fail closed). */
        readonly iOSWebViewHandler? _owner;

        public MediaCaptureUIDelegate(iOSWebViewHandler? owner)
        {
            _owner = owner;
        }

        /* Diagnostics into the page console (Inspector-visible) + the app log.
         * ★ handover sweep O-16: NOT `static` any more, so it can read `_owner`. The page
         * console belongs to whatever document holds this WebView, and this delegate is
         * installed on the MINI-APP WebView too (third-party publisher code). The console half
         * is therefore gated on the same trust marker the capture gate uses, and it FAILS
         * CLOSED: an unidentifiable host receives nothing. The `ixian.log` half is unchanged,
         * so every refusal named in `captureRefusal` is still recorded for us. */
        void forward(WKWebView webView, string msg)
        {
            if (_owner != null && _owner.isTrustedHost())
            {
                try { webView?.EvaluateJavaScript("try{console.error('[cam-perm] " + msg + "')}catch(e){}", null); } catch { }
            }
            try { IXICore.Meta.Logging.info("[cam-perm] " + msg); } catch { }
        }

        /* ★ D1 (handover sweep, MAJOR): WHO MAY ASK FOR CAPTURE.
         *
         * This delegate used to grant on ONE test — "is AVFoundation authorized" — which is
         * permanently true after the user's first QR scan. It never read `origin` or `frame`,
         * and the handler that installs it is registered for typeof(WebView)
         * (MauiProgram.cs), so the MINI-APP WebView (Pages/MiniApps/MiniAppPage.xaml,
         * third-party publisher code) inherited a silent camera and microphone grant, in any
         * frame, with no prompt and no in-app indicator. The refusal is now first and the
         * grant is last.
         *
         * Four tests, ALL of which must pass, every one of them fail-closed:
         *   1. the hosting page is one of ours — the SAME ClassId="miniapp" marker Android
         *      keys its privilege drops on (isTrustedHost);
         *   2. the type is Camera. Nothing in this app captures audio in a WebView: VoIP
         *      capture is native (SPIXI.VoIP / CallPage), so call.html asks for nothing.
         *      ⚠ This also closes a real defect in the old mapping: WKMediaCaptureType
         *      .CameraAndMicrophone fell into the `else` and was checked against the VIDEO
         *      authorization, so a camera-only permission granted the MICROPHONE too;
         *   3. the request comes from the MAIN frame — a subframe never gets capture;
         *   4. the document asking is the QR scan shell (isScanDocument). Chat renders
         *      untrusted peer content in its own WebView (★ #221) and must never reach a
         *      camera, so "one of our shells" is not by itself enough.
         * Every refusal is named in the [cam-perm] line, so a denial is diagnosable without
         * logging a URL (#310's observability rule). ⚠ Since O-16 the Inspector shows that
         * line for OUR shells only; ixian.log still receives it for every host, which is the
         * copy that matters for an untrusted-host refusal. */
        [Export("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:")]
        public void RequestMediaCapturePermission(
            WKWebView webView,
            WKSecurityOrigin origin,
            WKFrameInfo frame,
            WKMediaCaptureType type,
            Action<WKPermissionDecision> decisionHandler)
        {
            string? refusal = captureRefusal(webView, origin, frame, type);
            if (refusal != null)
            {
                forward(webView, "invoked type=" + type + " DENIED reason=" + refusal);
                decisionHandler(WKPermissionDecision.Deny);
                return;
            }

            // Only a camera request from the scan document reaches this line.
            var mediaType = AVFoundation.AVAuthorizationMediaType.Video;

            var status = AVFoundation.AVCaptureDevice.GetAuthorizationStatus(mediaType);
            forward(webView, "invoked type=" + type + " avf=" + status);
            if (status == AVFoundation.AVAuthorizationStatus.Authorized)
            {
                decisionHandler(WKPermissionDecision.Grant);
                return;
            }
            if (status == AVFoundation.AVAuthorizationStatus.Denied
                || status == AVFoundation.AVAuthorizationStatus.Restricted)
            {
                decisionHandler(WKPermissionDecision.Deny);   // shell renders its denied state + Settings hint
                return;
            }

            // NotDetermined → this is the call that actually shows the OS sheet (once, ever).
            AVFoundation.AVCaptureDevice.RequestAccessForMediaType(mediaType, granted =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    forward(webView, "avf sheet answered granted=" + granted);
                    try { decisionHandler(granted ? WKPermissionDecision.Grant : WKPermissionDecision.Deny); }
                    catch (Exception ex) { IXICore.Meta.Logging.error("Media capture decision failed: {0}", ex); }
                });
            });
        }

        /* ★ D1: the four tests, in one place. Returns null when the request may proceed to
         * AVFoundation, and otherwise a FIXED refusal word — never a URL, a host or a path,
         * because `forward` writes it into ixian.log and into the page console.
         * The default of every branch is refusal, and the catch refuses too: a gate whose
         * unknown case admits is not a gate. */
        string? captureRefusal(WKWebView webView, WKSecurityOrigin origin, WKFrameInfo frame, WKMediaCaptureType type)
        {
            try
            {
                if (_owner == null || !_owner.isTrustedHost()) return "untrusted-host";
                if (type != WKMediaCaptureType.Camera) return "capture-type";
                if (frame == null || !frame.MainFrame) return "subframe";

                /* The requesting origin. ⚠ THIS TEST IS A BLACKLIST, ON PURPOSE (#46 loop A,
                 * MAJOR-2). The first cut required the protocol to be "file" or empty. Nothing
                 * in this tree, and no reading available here, establishes what WebKit reports
                 * for a file:// MAIN FRAME. If it reports an opaque origin as "null", that
                 * whitelist DENIES the scanner — a feature that took five device rounds to make
                 * work (#304 · #305 · #307 · #309 · #312) — and it buys nothing, because the
                 * next test reads the same fact from a source whose value IS traceable end to
                 * end: ScanPage → generatePage → file:///…/ll_scan.html.
                 * So this test now refuses only the two protocols whose meaning is certain and
                 * whose presence is always wrong here: a REMOTE document never gets capture.
                 * Every other value — "file", "", "null", or anything else WebKit may invent —
                 * falls through to isScanDocument, which is fail-CLOSED on the document itself.
                 * ⚠ The GATE still refuses the unknown case. This one test does not: it is a
                 * belt over a rule the next line already enforces from a known source. Do not
                 * turn it back into a whitelist without a device answer for that value. */
                string protocol = origin?.Protocol ?? "";
                if (protocol.Equals("http", StringComparison.OrdinalIgnoreCase)
                    || protocol.Equals("https", StringComparison.OrdinalIgnoreCase)) return "remote-origin";

                if (!isScanDocument(webView)) return "not-the-scan-document";
                return null;
            }
            catch (Exception)
            {
                return "gate-error";
            }
        }

        /* The ONE document that legitimately opens a camera: the QR scan shell.
         * ScanPage loads "scan.html" (Pages/Scan/ScanPage.xaml.cs) and generatePage serves it
         * from the user's html folder as "ll_scan.html" (Utils/SpixiContentPage.cs). Decode
         * runs inside that page: the vendored html5-qrcode library is the only getUserMedia
         * caller in the whole frontend, and only src/shells/scan.html loads it
         * (js/html5-qrcode.min.js, co-located with the shell).
         * The bare "scan.html" leaf is accepted as well, because the fallback source shapes in
         * generatePage do not all carry the "ll_" prefix. A mini-app cannot reach this test by
         * naming its entry point scan.html: it fails the trust marker first. */
        static bool isScanDocument(WKWebView webView)
        {
            try
            {
                string url = webView?.Url?.AbsoluteString ?? "";
                if (!url.StartsWith("file://", StringComparison.OrdinalIgnoreCase)) return false;
                int cut = url.IndexOfAny(new char[] { '?', '#' });
                if (cut >= 0) url = url.Substring(0, cut);
                int slash = url.LastIndexOf('/');
                string leaf = slash >= 0 ? url.Substring(slash + 1) : url;
                return leaf.Equals("ll_scan.html", StringComparison.OrdinalIgnoreCase)
                    || leaf.Equals("scan.html", StringComparison.OrdinalIgnoreCase);
            }
            catch (Exception)
            {
                return false;
            }
        }
    }

    public class iOSWebViewHandler : WebViewHandler
    {
        static bool _swizzled;

        /* #309 (device-measured 2026-08-07): WKWebView's NavigationDelegate and UIDelegate
         * are WEAK ObjC references. Assigning fresh managed objects without a strong root
         * leaves them collectable — and once the GC reaps them, WebKit silently reverts to
         * its DEFAULT behavior. Observed on the iPhone: WebKit's own per-origin camera
         * prompt ("Allow "Spixi" to use your camera?") on EVERY scan visit — impossible
         * while MediaCaptureUIDelegate lives, since it auto-grants when AVFoundation is
         * already authorized (file:// origins get no persisted WebKit grant, hence every
         * visit). The same hazard on SecureNavigationDelegate is SECURITY-relevant: a
         * collected navigation delegate removes the http/https Cancel + browser handoff
         * (remote content could then load in-WebView) — logged in
         * docs/security-review-for-be-engineer.md. These fields are the strong roots;
         * the handler lives exactly as long as its WebView. */
        SecureNavigationDelegate? _navigationDelegate;
        MediaCaptureUIDelegate? _uiDelegate;

        /* #311: the runtime probe re-asserts the UIDelegate through this (keeps the
         * strong root on the handler — never hand out an unrooted fresh instance). */
        internal IWKUIDelegate EnsureUiDelegate()
        {
            if (_uiDelegate == null) _uiDelegate = new MediaCaptureUIDelegate(this);
            return _uiDelegate;
        }

        /* ★ security MAJOR #6(a) / D1 / D2 (handover sweep): THE TRUST TEST FOR THIS HANDLER.
         *
         * MauiProgram.cs registers this handler for typeof(WebView), so it serves the app's
         * own shells AND the mini-app WebView, which renders third-party publisher code.
         * The mini-app page declares the untrusted-content marker
         * (Pages/MiniApps/MiniAppPage.xaml, ClassId="miniapp") and Android keys its privilege
         * drops on it (Platforms/Android/WebViewRenderer.cs: DomStorageEnabled stays off, the
         * console is not forwarded). iOS read that marker NOWHERE — which is why the same
         * WebView could reach the camera, the microphone and the OS browser. This method is
         * where iOS reads the marker for a PRIVILEGE; isMiniAppHost below reads it for the
         * storage jar. The marker is now a two-platform contract, not a one-platform claim.
         *
         * The marker is read off the VIRTUAL view — the MAUI WebView that declares it in XAML
         * — and not off the platform view, because ClassId is a MAUI concept.
         * FAIL CLOSED: a host this code cannot identify is untrusted. VirtualView is set
         * before ConnectHandler runs and cleared in DisconnectHandler, so "no WebView" means
         * a torn-down handler or a shape this code does not know. Neither may hold a
         * privilege. */
        internal bool isTrustedHost()
        {
            try
            {
                var element = VirtualView as Microsoft.Maui.Controls.WebView;
                if (element == null) return false;
                return !string.Equals(element.ClassId, "miniapp", StringComparison.Ordinal);
            }
            catch (Exception)
            {
                return false;
            }
        }

        /* ★ C-1…C-4 / D2 (handover sweep): POSITIVE identification of the mini-app host.
         *
         * This method is deliberately NOT the negation of isTrustedHost(). The two guards
         * protect opposite things, so each one must fail to false. isTrustedHost() hands out
         * a privilege, and an unidentifiable host must not get it. This method takes the
         * shells' storage away, and an unidentifiable host must not lose it: a WebView this
         * code cannot name could be a shell, and a shell with an in-memory store loses every
         * spixi.* key at the next launch. A mini-app cannot shed the marker. ClassId is set
         * in our own XAML in our own process (Pages/MiniApps/MiniAppPage.xaml), and no code
         * in the repository assigns ClassId.
         * ⚠ The residual is stated and not hidden. A WebView with no readable VirtualView
         * keeps the DEFAULT store. That is the behaviour every platform shipped before this
         * fix, so this method can only ever remove an exposure. */
        internal bool isMiniAppHost()
        {
            try
            {
                var element = VirtualView as Microsoft.Maui.Controls.WebView;
                if (element == null) return false;
                return string.Equals(element.ClassId, "miniapp", StringComparison.Ordinal);
            }
            catch (Exception)
            {
                return false;
            }
        }

        protected override void ConnectHandler(WKWebView platformView)
        {
            base.ConnectHandler(platformView);

            //var previousDelegate = platformView.NavigationDelegate;
            _navigationDelegate = new SecureNavigationDelegate(this);
            _uiDelegate = new MediaCaptureUIDelegate(this);   // D1: the delegate asks the handler which trust tier hosts it
            platformView.NavigationDelegate = _navigationDelegate;
            platformView.UIDelegate = _uiDelegate;   // iOS scan: without this getUserMedia is auto-denied

            platformView.ScrollView.ContentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentBehavior.Never;
            platformView.ScrollView.ScrollEnabled = false;
            platformView.ScrollView.Bounces = false;

            // F2 (#301): pinch is a CHAT-ONLY gesture (message text size). The redesigned
            // shells all clamp the viewport (minimum/maximum-scale=1, user-scalable=no),
            // which WKWebView honors — this pin is the belt for the still-legacy pages
            // (wallet_recipient.html, apps.html, …) that ship no clamp. The shells scroll inner
            // containers (ScrollEnabled=false above), so pinning the WebView's own zoom
            // costs nothing there. Note WebKit may re-derive zoom scales from a page's
            // viewport meta on navigation, so the meta clamp stays the primary fix; this
            // is best-effort coverage for pages without one. ⚠ The handler is still
            // INSTALLED for every WebView (MauiProgram.cs registers it for typeof(WebView)),
            // so this zoom pin also applies to third-party MINI-APP content — logged on
            // security-review MAJOR #6 (the trust-tier split of this handler). ⚠ #772: the
            // handover sweep split the two privileges that mattered — the camera grant and
            // the OS-browser handoff now read the ClassId marker (isTrustedHost) — so
            // "everything in this handler is global" is no longer true of them; it stays
            // true of this zoom pin, which is presentation and carries no privilege.
            platformView.ScrollView.MinimumZoomScale = 1;
            platformView.ScrollView.MaximumZoomScale = 1;

            // Safari Web Inspector. From iOS 16.4 a WKWebView is INVISIBLE to the
            // Develop menu unless this is set — which is why the sim/device passes had
            // no console: every shell is a WebView, so without it nothing is
            // inspectable on either the simulator or hardware. DEBUG-only: a shippable
            // build must never expose its WebViews to an attached machine.
#if DEBUG
            if (OperatingSystem.IsIOSVersionAtLeast(16, 4) || OperatingSystem.IsMacCatalystVersionAtLeast(16, 4))
            {
                platformView.Inspectable = true;
            }
#endif

            // Remove the iOS keyboard accessory bar (up/down arrows and checkmark)
            var assistantItem = platformView.InputAssistantItem;
            if (assistantItem != null)
            {
                assistantItem.LeadingBarButtonGroups = Array.Empty<UIBarButtonItemGroup>();
                assistantItem.TrailingBarButtonGroups = Array.Empty<UIBarButtonItemGroup>();
            }

            // Try swizzling WKContentView's inputAccessoryView to return nil
            TrySwizzleInputAccessoryView();
        }

        protected override void DisconnectHandler(WKWebView platformView)
        {
            // #309: release the strong delegate roots with the WebView they served.
            _navigationDelegate = null;
            _uiDelegate = null;
            base.DisconnectHandler(platformView);
        }

        /* ★ F1(a) (handover sweep): THE ALLOW RULES ARE ANCHORED.
         *
         * WebKit matches "url-filter" as a regular expression against the URL and the match is
         * a SEARCH, not a full match — so an UNANCHORED allow rule fires on a SUBSTRING. With
         * the previous rules, "https://attacker.example/track.gif?u=https://a.tenor.com/y"
         * contained the tenor pattern, ignore-previous-rules set the block rule aside for that
         * load, and the request left the device. The chat shell hands WebKit exactly such a
         * URL: a peer message whose text is a media URL renders an <img> on chat open.
         * Android and Windows never had this hole — both call Utils.IsAllowedURL, whose regex
         * is anchored at BOTH ends (^https://[A-Za-z0-9]+\.(tenor|giphy)\.com/…$) — so iOS
         * was the outlier. That method is the contract; these rules mirror it:
         *   · tenor and giphy — "^…$", both ends, the same one-label host shape;
         *   · apps.spixi.io — "^https://apps\.spixi\.io/" with a free tail, because
         *     IsAllowedURL admits that host with a StartsWith and not with the regex. A
         *     mirror must not be STRICTER than the gate it mirrors;
         *   · file — "^file://", which is the second half of the same bug: an https URL that
         *     merely CONTAINS "file://" in its query used to win ignore-previous-rules.
         * ⚠ The BLOCK rule is the one that stays unanchored, and it must. It has to match
         * every URL at any position; ".*" is the documented form for "everything", WebKit
         * special-cases it, and anchoring it changes nothing while risking a rejected list. */
        const string anchoredContentRules = """
                [
                    {
                        "trigger": { "url-filter": ".*" }, 
                        "action": { "type": "block" }
                    },
                    {
                        "trigger": { "url-filter": "^file://" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "^https://[A-Za-z0-9]+\\.tenor\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+$" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "^https://[A-Za-z0-9]+\\.giphy\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+$" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "^https://apps\\.spixi\\.io/.*" },
                        "action": { "type": "ignore-previous-rules" }
                    }
                ]
                """;

        /* The pre-F1(a) rules, kept ONLY as rung ② of the ladder below. They carry the
         * substring bypass this fix closes, but they still block every host that does not
         * match at all — which is strictly better than the no-rules state a failed compile
         * used to leave behind. */
        const string unanchoredContentRules = """
                [
                    {
                        "trigger": { "url-filter": ".*" }, 
                        "action": { "type": "block" }
                    },
                    {
                        "trigger": { "url-filter": "file://.*" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://[A-Za-z0-9]+\\.tenor\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://[A-Za-z0-9]+\\.giphy\\.com/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    },
                    {
                        "trigger": { "url-filter": "https://apps\\.spixi\\.io/[A-Za-z0-9_/=%\\?\\-\\.\\&]+" },
                        "action": { "type": "ignore-previous-rules" }
                    }
                ]
                """;

        /* ★ C-1…C-4 / D2 (handover sweep): THE MINI-APP DOES NOT SHARE OUR STORAGE.
         *
         * Every WKWebView in this app used WKWebsiteDataStore.DefaultDataStore, because no
         * file in this tree ever set a data store. The shells write 27 spixi.* localStorage
         * keys into that store. Nine key families carry a peer wallet address in the key
         * NAME, and spixi.draft.<address> holds the user's own unsent plaintext. MiniAppPage
         * loads third-party publisher code from a file:// URL into a MAUI WebView
         * (Pages/MiniApps/MiniAppPage.xaml.cs), so on iOS that code sat in the same jar.
         * Android already refuses this: its renderer keys DomStorageEnabled on
         * ClassId != "miniapp" (Platforms/Android/WebViewRenderer.cs). iOS read the marker
         * nowhere, which is what made the marker a one-platform claim.
         *
         * WHY THE FIX IS HERE. A WKWebView copies its configuration at construction, so
         * platformView.Configuration returns a COPY, and an assignment to WebsiteDataStore on
         * that copy changes nothing. The store must be chosen BEFORE the WKWebView exists,
         * and CreatePlatformView is the only moment this handler owns. Note the difference:
         * a mutation of an OBJECT reached through Configuration does take effect, which is
         * why AddContentRuleList below works on the live controller.
         *
         * WHY A NON-PERSISTENT STORE. The mini-app SDK gives apps their own persistence
         * through C#. MiniAppActionHandler.processStorageSet and processStorageGet (the
         * "setStorage" and "getStorage" commands) call MiniAppStorage.setStorageData and
         * getStorageData, which write files under the app's own folder. A mini-app therefore
         * does not need browser localStorage to persist. An in-memory store keeps
         * localStorage WORKING inside one session and drops it at teardown.
         *
         * FAIL SAFE. Only a positively identified mini-app takes this path. Every failure
         * falls back to MAUI's own WebView. This change cannot delete a shell's storage. */
        protected override WKWebView CreatePlatformView()
        {
            WKWebView platformView = createIsolatedMiniAppView() ?? base.CreatePlatformView();
            compileContentRules(platformView, "ContentBlockingRules", anchoredContentRules, false);
            return platformView;
        }

        /* Builds the mini-app WebView with its own in-memory website data store. Returns null
         * when the host is not a mini-app, and null when the isolated view cannot be built.
         * A null return makes the caller use MAUI's own WebView, which is what every platform
         * shipped before this fix. */
        WKWebView? createIsolatedMiniAppView()
        {
            if (!isMiniAppHost()) return null;
            try
            {
                var configuration = MauiWKWebView.CreateConfiguration();
                configuration.WebsiteDataStore = WKWebsiteDataStore.NonPersistentDataStore;
                return new MauiWKWebView(CoreGraphics.CGRect.Empty, this, configuration);
            }
            catch (Exception ex)
            {
                /* Loud on purpose. The fallback shares the shells' store with publisher code,
                 * so a silent failure would restore the exposure this method removes. */
                IXICore.Meta.Logging.error("Mini-app storage isolation failed ({0}). This WebView uses the default data store.", ex.GetType().Name);
                return null;
            }
        }

        /* ★ F1(a) — A FAILED COMPILE USED TO FAIL OPEN, SILENTLY.
         *
         * The old callback acted only when `error == null`. On any failure NO rule list was
         * attached, so the WebView loaded every host with nothing blocking it and nothing
         * said so. The rule list is the ONLY subresource gate iOS has — DecidePolicy sees
         * navigations, not the image loads that carry the media-autoload leak — so the
         * failure case is the one that matters most.
         * The ladder never ends with zero rules while any compile can still succeed:
         *   ① the anchored list;
         *   ② on failure, the previous UNANCHORED list. Anchoring is the only change in ①, so
         *      this rung exists for the case where a WebKit version rejects "^" or "$": the
         *      app must lose the substring fix, never ALL of its blocking;
         *   ③ if that fails too, an error line. There is nothing else this handler can attach,
         *      and a silent failure is what made this ladder worth writing.
         * The log carries the rule-list identifier and WebKit's own message; both are our own
         * constants, so no user data reaches it. */
        static void compileContentRules(WKWebView platformView, string identifier, string rules, bool isFallback)
        {
            WKContentRuleListStore.DefaultStore.CompileContentRuleList(identifier, rules,
                (compiledRuleList, error) =>
                {
                    if (error == null && compiledRuleList != null)
                    {
                        platformView.Configuration.UserContentController.AddContentRuleList(compiledRuleList);
                        if (isFallback)
                        {
                            IXICore.Meta.Logging.error("Content blocking: the UNANCHORED fallback rule list is active. Remote subresources are blocked, but the F1(a) substring bypass is open.");
                        }
                        return;
                    }
                    string reason = error?.LocalizedDescription ?? "the compiler returned no rule list";
                    if (!isFallback)
                    {
                        IXICore.Meta.Logging.error("Content blocking: the anchored rule list did not compile ({0}). Trying the unanchored fallback.", reason);
                        compileContentRules(platformView, "ContentBlockingRulesUnanchored", unanchoredContentRules, true);
                        return;
                    }
                    IXICore.Meta.Logging.error("Content blocking: NO rule list is attached ({0}). Remote subresources are NOT blocked in this WebView.", reason);
                });
        }


        // ObjC runtime imports for method swizzling
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr objc_getClass(string name);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr sel_registerName(string name);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr class_getInstanceMethod(IntPtr cls, IntPtr sel);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr method_getImplementation(IntPtr method);
 
        [DllImport("/usr/lib/libobjc.A.dylib")]
        static extern IntPtr method_setImplementation(IntPtr method, IntPtr imp);
 
        // Delegates must match Objective-C IMP signature: id (*IMP)(id, SEL, ...)
        // We return nil (IntPtr.Zero) for inputAccessoryView
        delegate IntPtr InputAccessoryViewDelegate(IntPtr self, IntPtr _cmd);
        static InputAccessoryViewDelegate? _returnNilDelegate;
        static IntPtr _originalImp = IntPtr.Zero;
 
        static void TrySwizzleInputAccessoryView()
        {
            if (_swizzled)
                return;
 
            try
            {
                var cls = objc_getClass("WKContentView");
                if (cls == IntPtr.Zero)
                    return;
 
                var selector = sel_registerName("inputAccessoryView");
                var method = class_getInstanceMethod(cls, selector);
                if (method == IntPtr.Zero)
                    return;
 
                _originalImp = method_getImplementation(method);
 
                _returnNilDelegate ??= new InputAccessoryViewDelegate(ReturnNil);
                var imp = Marshal.GetFunctionPointerForDelegate(_returnNilDelegate);
 
               method_setImplementation(method, imp);
                _swizzled = true;
            }
            catch
            {
                // Ignore failures (iOS internals may change)
            }
        }
 
        static IntPtr ReturnNil(IntPtr self, IntPtr _cmd) => IntPtr.Zero;
    }
}
