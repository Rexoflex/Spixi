// ★ S16 (#1320 F1 · F2 · F3/F4 · F5, #1313 MAJOR #9) — the pure half of the Session 16 security batch, EXECUTED
// (Spixi/Utils/S16SecRules.cs): the lock's `ixian:change` leg and the unlock release · no navigation over a STAGING lock
// (5 s bound) · the mic / clipboard gate · the home decline acts on an incoming request only · the Android capture grant.
// The call sites (LockPage, App, SpixiContentPage, SingleChatPage, HomePage, the Android WebViewRenderer) are MAUI /
// platform-bound — scripts/pins-s16/a-sec.mjs.
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S16SecTests
{
    [TestMethod]
    public void change_on_an_app_lock_is_refused()
    {
        Assert.AreEqual(S16SecRules.ChangeLeg.Refuse, S16SecRules.changeLeg(true, true), "the app lock (confirm + appLock): refused");
        Assert.AreEqual(S16SecRules.ChangeLeg.Refuse, S16SecRules.changeLeg(false, true), "appLock alone refuses too (no shape lets it through)");
    }

    // ★ #46 r1 (R1-n6): the cold-start leg (→ LaunchPage) has no sender since RESTORE-B — refused like the app lock.
    [TestMethod]
    public void change_cancels_only_a_settings_authorise_lock()
    {
        Assert.AreEqual(S16SecRules.ChangeLeg.Cancel, S16SecRules.changeLeg(true, false), "a Settings authorise lock: Cancel (authSucceeded false)");
        Assert.AreEqual(S16SecRules.ChangeLeg.Refuse, S16SecRules.changeLeg(false, false), "the cold-start lock: refused (no shell sends it any more)");
    }

    [TestMethod]
    public void unlock_releases_only_on_true()
    {
        Assert.IsTrue(S16SecRules.unlockReleases(new SPIXI.EventArgs<bool>(true)), "a verified unlock");
        Assert.IsFalse(S16SecRules.unlockReleases(new SPIXI.EventArgs<bool>(false)), "a cancel (authSucceeded false) never unlocks");
        Assert.IsFalse(S16SecRules.unlockReleases(null), "no args");
        Assert.IsFalse(S16SecRules.unlockReleases(EventArgs.Empty), "a plain EventArgs");
        Assert.IsFalse(S16SecRules.unlockReleases(new SPIXI.EventArgs<string>("True")), "another payload type");
    }

    [TestMethod]
    public void overlay_refused_while_the_lock_stages()
    {
        Assert.AreEqual(5000.0, S16SecRules.StagingRefuseMs, "one named bound (Damir: 5 s)");
        Assert.IsTrue(S16SecRules.overlayRefused(true, 0), "staging, just started");
        Assert.IsTrue(S16SecRules.overlayRefused(true, 1200), "staging, at the lock's own timeout");
        Assert.IsTrue(S16SecRules.overlayRefused(true, 4999.9), "inside the bound");
        Assert.IsFalse(S16SecRules.overlayRefused(true, 5000), "the bound's edge: the navigation wins again (a stuck stage)");
        Assert.IsFalse(S16SecRules.overlayRefused(true, 60000), "a stage stuck for a minute does not freeze navigation");
        Assert.IsTrue(S16SecRules.overlayRefused(true, -1), "a negative age refuses — the lock side");
        Assert.IsFalse(S16SecRules.overlayRefused(false, 0), "no lock staging: nothing refused");
        Assert.IsFalse(S16SecRules.overlayRefused(false, -1), "no lock staging, whatever the age");
    }

    /* ★ #46 r1 (R1-M2, R4-3): the gate's whole combination, one input at a time from the allowed state
       (gate on · foreground · no lock · chat on top · an overlay chat · host on top · no modal). */
    private static string? gate(bool gateOn = true, bool foreground = true, bool appLock = false, bool inPlaceLock = false, bool lockStaging = false,
        bool chatOnTop = true, bool infoCovers = false, bool viaOverlay = true, bool hostIsNavTop = true, bool modalOpen = false)
    {
        return S16SecRules.mediaInputRefusal(gateOn, foreground, appLock, inPlaceLock, lockStaging, chatOnTop, infoCovers, viaOverlay, hostIsNavTop, modalOpen);
    }

    [TestMethod]
    public void media_input_gate_off_is_todays_behaviour()
    {
        Assert.AreEqual<string?>(null, gate(gateOn: false, foreground: false, appLock: true, inPlaceLock: true, lockStaging: true, chatOnTop: false, infoCovers: true, hostIsNavTop: false, modalOpen: true), "flag off: never refused, whatever the state");
        Assert.AreEqual<string?>(null, gate(gateOn: false, infoCovers: true), "flag off + chat info covering");
        Assert.AreEqual<string?>(null, gate(gateOn: false, appLock: true), "flag off + an app lock");
        Assert.AreEqual<string?>(null, gate(gateOn: false, modalOpen: true), "flag off + a modal");
    }

    [TestMethod]
    public void media_input_gate_allows_the_chat_on_screen()
    {
        Assert.AreEqual<string?>(null, gate(), "an overlay chat on top, Home on top of the stack, no modal, no lock");
        Assert.AreEqual<string?>(null, gate(viaOverlay: false, hostIsNavTop: false), "a pushed (non-overlay) chat: the host test does not apply (isShownChat already needs navTop == this)");
    }

    [TestMethod]
    public void media_input_gate_each_lock_alone_refuses()
    {
        Assert.AreEqual<string?>("locked", gate(appLock: true), "an app lock latched");
        Assert.AreEqual<string?>("locked", gate(inPlaceLock: true), "a lock shown in place");
        Assert.AreEqual<string?>("locked", gate(lockStaging: true), "a lock staging (the desktop idle lock)");
        Assert.AreEqual<string?>("locked", gate(appLock: true, foreground: false, chatOnTop: false), "the lock is named first");
    }

    [TestMethod]
    public void media_input_gate_background_and_covered_refuse()
    {
        Assert.AreEqual<string?>("background", gate(foreground: false), "the app is in the background");
        Assert.AreEqual<string?>("background", gate(foreground: false, chatOnTop: false), "background is named before hidden");
        Assert.AreEqual<string?>("hidden", gate(chatOnTop: false), "another pane is the top overlay");
        Assert.AreEqual<string?>("hidden", gate(hostIsNavTop: false), "a legacy page (a mini-app, Wallet Send, Scan) is pushed over Home — the chat is still the top overlay");
        Assert.AreEqual<string?>("hidden", gate(modalOpen: true), "a modal covers everything");
        Assert.AreEqual<string?>("hidden", gate(viaOverlay: false, modalOpen: true), "a pushed chat under a modal");
    }

    // ★ #46 r2 (M1): isShownChat counts a ContactDetails on top as "shown" (the tick's rule) — only the desktop col-2 pane is BESIDE.
    [TestMethod]
    public void media_input_gate_chat_info_covering_refuses()
    {
        Assert.AreEqual<string?>("hidden", gate(infoCovers: true), "ContactDetails on top, not beside (a phone's full-span chat info, desktop column 1, a member's page) → hidden");
        Assert.AreEqual<string?>(null, gate(infoCovers: false), "ContactDetails beside the chat (desktop column 2) — the chat is visible → allowed");
        Assert.AreEqual<string?>("background", gate(infoCovers: true, foreground: false), "background is named first");
        Assert.AreEqual<string?>("locked", gate(infoCovers: true, lockStaging: true), "the lock is named first");
    }

    // ★ #46 r1 (R1-n5): the card's predicate, exactly.
    [TestMethod]
    public void decline_removes_exactly_what_the_request_card_shows()
    {
        Assert.IsTrue(S16SecRules.declineAllowed(false, true, false), "not approved + their requestAdd last: the card → declined (a bot / payment-type card too)");
        Assert.IsFalse(S16SecRules.declineAllowed(true, true, false), "approved (a stale card / a crafted verb): refused");
        Assert.IsFalse(S16SecRules.declineAllowed(false, true, true), "my own requestAdd (an outgoing request): refused");
        Assert.IsFalse(S16SecRules.declineAllowed(false, false, false), "not approved but the last message is not a requestAdd (no card): refused");
        Assert.IsFalse(S16SecRules.declineAllowed(true, false, false), "an approved contact chatting: refused");
    }

    // ★ #46 r1 (R1-M1, R4-2): the marker, never the document — Android's WebView.Url is "about:blank" for every shell.
    [TestMethod]
    public void capture_grants_video_to_the_scan_page_marker_only()
    {
        string[] video = { S16SecRules.AndroidVideoCapture };
        Assert.AreEqual("android.webkit.resource.VIDEO_CAPTURE", S16SecRules.AndroidVideoCapture, "the Android constant, value for value");
        Assert.AreEqual("scan", S16SecRules.ScanMarker, "the marker ScanPage.xaml sets");
        Assert.AreEqual("miniapp", S16SecRules.MiniAppMarker, "the mini-app marker (MiniAppPage.xaml)");
        Assert.AreEqual<string?>(null, S16SecRules.captureRefusal(true, "scan", video, "file", true), "the scan page (document about:blank on Android): granted");
        Assert.AreEqual<string?>(null, S16SecRules.captureRefusal(true, "scan", video, null, true), "no origin reported: granted");
        Assert.AreEqual<string?>(null, S16SecRules.captureRefusal(true, "scan", video, "null", true), "an opaque origin: granted");
    }

    [TestMethod]
    public void capture_refusals_name_the_reason()
    {
        string[] video = { S16SecRules.AndroidVideoCapture };
        Assert.AreEqual<string?>("untrusted-host", S16SecRules.captureRefusal(true, "miniapp", video, "file", true), "a mini-app never gets capture");
        Assert.AreEqual<string?>("untrusted-host", S16SecRules.captureRefusal(false, "scan", video, "file", true), "a host this code cannot identify");
        Assert.AreEqual<string?>("not-the-scan-page", S16SecRules.captureRefusal(true, null, video, "file", true), "chat (no marker) — even on a peer download named scan.html");
        Assert.AreEqual<string?>("not-the-scan-page", S16SecRules.captureRefusal(true, "", video, "file", true), "an empty marker");
        Assert.AreEqual<string?>("not-the-scan-page", S16SecRules.captureRefusal(true, "Scan", video, "file", true), "the marker is exact (ordinal)");
        // ★ #46 r4 (m1): a forged marker on any OTHER WebView object is refused — the identity test is structural
        Assert.AreEqual<string?>("not-the-scan-page", S16SecRules.captureRefusal(true, "scan", video, "file", false), "the scan marker on a WebView that is not ScanPage's own");
        Assert.AreEqual<string?>("capture-type", S16SecRules.captureRefusal(true, "scan", new[] { "android.webkit.resource.AUDIO_CAPTURE" }, "file", true), "the microphone, even for the scan page");
        Assert.AreEqual<string?>("capture-type", S16SecRules.captureRefusal(true, "scan", new[] { S16SecRules.AndroidVideoCapture, "android.webkit.resource.AUDIO_CAPTURE" }, "file", true), "video + audio together");
        Assert.AreEqual<string?>("capture-type", S16SecRules.captureRefusal(true, "scan", new string[0], "file", true), "nothing asked");
        Assert.AreEqual<string?>("capture-type", S16SecRules.captureRefusal(true, "scan", null, "file", true), "no resources");
        Assert.AreEqual<string?>("capture-type", S16SecRules.captureRefusal(true, "scan", new[] { "android.webkit.resource.PROTECTED_MEDIA_ID" }, "file", true), "protected media");
        Assert.AreEqual<string?>("remote-origin", S16SecRules.captureRefusal(true, "scan", video, "https", true), "a remote origin in the scan WebView");
        Assert.AreEqual<string?>("remote-origin", S16SecRules.captureRefusal(true, "scan", video, "HTTP", true), "a remote origin, any case");
    }
}
