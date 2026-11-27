/* ==== imgurl · A — the media origin's three request handlers and their call sites (source pin).
 * Contract docs/contract-imgurl.md § 3; packet docs/be-review-pack/P113-media-origin.md. The BEHAVIOUR of the grant table (the URL
 * grammar, the owner binding, the document, the caps, the switch, the mini-app rule) runs in the C# harness: scripts/csh/MediaGrantsTests.cs
 * over the REAL Spixi/Utils/MediaGrants.cs. This module holds what the harness cannot compile: the platform files.
 *
 * LIMITS — read first (DECISIONS 1735: the limits of a source pin are stated, not hidden). This is a SOURCE pin. It reads the TEXT of
 * Spixi/Platforms/Android/WebViewRenderer.cs, Spixi/Platforms/Windows/WindowsWebViewHandler.cs, Spixi/Platforms/iOS/iOSWebViewHandler.cs,
 * Spixi/Platforms/iOS/MediaSchemeHandler.cs, Spixi/Utils/MediaGrants.cs (and two constants, one csproj target, the harness project).
 * What it does NOT catch:
 *   · anything at RUN time: that Android really calls ShouldInterceptRequest for an <img> of the media host, that WebView2 raises
 *     WebResourceRequested for it, that WebKit hands the scheme to the handler and that the content rule list lets it through, that a
 *     404 shows as a broken picture and not as a network try, that serverUp / serverDown run in the order read here, that the element
 *     the handler reads is the element the page grants for. The device walk proves those (P113, the walk rows);
 *   · that the C# COMPILES: no platform file is compiled before Damir's build (Windows: CI). A wrong API name passes this pin;
 *   · deliberately hidden code: a `#define` / `#if` trick, a `using X = …;` alias, a type that shadows MediaGrants / ImgurlFlags /
 *     SafetyRules, a second `partial` of a handler in another file, reflection by a built name, a csproj `Compile Remove`, an identifier
 *     written with a `\u` escape;
 *   · a call written another way than the text pinned here (a method group, a delegate, a helper that calls serverUp or tryServe, `this.`
 *     in front). The NAME counts of g3 are exact over the code of every C# file under Spixi/, not over what a program builds at run time;
 *   · a member OUTSIDE the bodies read here that answers the media host first (a second WebViewClient, a second WebResourceRequested
 *     subscriber, a second scheme handler): g3 counts the three names, not every way to answer a request;
 *   · the other builders' halves: the page's grants (pins-imgurl/b-page), the shell's acceptance (c-shell). (The renderer-death and
 *     page-store hooks H1–H4 left this batch by #1972; d-life d6 holds that none is left.)
 * Comments are removed first (the smoke's `stripCode`: C# strings and raw strings are kept byte for byte) and texts are compared after
 * whitespace collapse, so a line break, an indent or a comment is free; a code token is not. A method body is found by its signature
 * and cut at its matching brace (string and char literals skipped).
 *
 * KEYS (each ONE `ok`; the deliberate breaks of each — one mutation in a full copy, #802 — are in a-handler-breaks.mjs, run by hand):
 *   Android  a1 before-gate · a2 never-falls-through · a3 serve-rule · a4 404-path · a5 serverup-not-miniapp · a6 serverdown ·
 *            a7 console-source (dev builds: the one log site near the media path)
 *   Windows  w1 before-gate · w2 never-falls-through · w3 serve-rule · w4 404-path · w5 filter · w6 serverup-not-miniapp · w7 serverdown
 *   iOS/Mac  i1 create-order · i2 gate · i3 fallback · i4 serverup-not-miniapp · i5 serverdown · i6 content-rule · i7 weak-owner ·
 *            i8 serve-rule · i9 never-network · c1 mac-csproj
 *   Shared   g1 no-log · g2 no-file-no-network · g3 callers · g4 prefix · g5 size-bounds · g6 harness
 */
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const count = (t, s) => t.split(s).length - 1;

/* the index one past the string / char literal that opens at i, or i when none opens there */
const skipLit = (t, i) => {
  const c = t[i];
  if (c === "'") { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); return m ? i + m[0].length : i; }
  let j = i, verbatim = false;
  while (t[j] === '@' || t[j] === '$') { if (t[j] === '@') verbatim = true; j++; }
  if (t[j] !== '"') return i;
  let r = j; while (t[r] === '"') r++;
  if (r - j >= 3) { const e = t.indexOf('"'.repeat(r - j), r); return e < 0 ? t.length : e + (r - j); }
  if (r - j === 2) return j + 2;
  for (let k = j + 1; k < t.length; k++) {
    if (verbatim) { if (t[k] === '"') { if (t[k + 1] === '"') { k++; continue; } return k + 1; } continue; }
    if (t[k] === '\\') { k++; continue; }
    if (t[k] === '"' || t[k] === '\n') return k + 1;
  }
  return t.length;
};
/* the brace-matched block after the ONE occurrence of `sig` (a text or a RegExp) in `code` (comments already removed): '' when sig is not
   there exactly once */
const body = (code, sig) => {
  const hits = typeof sig === 'string' ? [...code.matchAll(new RegExp(sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))] : [...code.matchAll(new RegExp(sig.source, 'g'))];
  if (hits.length !== 1) return '';
  let i = hits[0].index + hits[0][0].length, depth = 0, open = -1;
  while (i < code.length) {
    const e = skipLit(code, i);
    if (e > i) { i = e; continue; }
    if (code[i] === ';' && open < 0) return '';
    if (code[i] === '{') { if (depth === 0) open = i; depth++; }
    else if (code[i] === '}' && --depth === 0) return code.slice(open, i + 1);
    i++;
  }
  return '';
};
const NET_OR_FILE = /\b(?:File|FileStream|FileInfo|Directory|Path|HttpClient|WebRequest|WebClient|Socket|NSUrlSession|NSUrlConnection|FromFile|FromUrl|ReadAllBytes|OpenRead|LoadUrl|LoadRequest|Navigate)\b/;
const LOG = /\b(?:Logging|Console|Debug|Trace|NSLog)\b/;

export default async function ({ ok, root, stripCode, readFileSync, readdirSync, existsSync, join }) {
  const read = (rel) => { const p = join(root, rel); return existsSync(p) ? readFileSync(p, 'utf8').replace(/^﻿/, '') : ''; };
  const AND_F = 'Spixi/Platforms/Android/WebViewRenderer.cs', WIN_F = 'Spixi/Platforms/Windows/WindowsWebViewHandler.cs',
    IOS_F = 'Spixi/Platforms/iOS/iOSWebViewHandler.cs', SCH_F = 'Spixi/Platforms/iOS/MediaSchemeHandler.cs', GR_F = 'Spixi/Utils/MediaGrants.cs';
  const and = stripCode(read(AND_F)), win = stripCode(read(WIN_F)), iosRaw = read(IOS_F), ios = stripCode(iosRaw), sch = stripCode(read(SCH_F)), gr = stripCode(read(GR_F));
  const andN = norm(and), winN = norm(win), iosN = norm(ios), schN = norm(sch), grN = norm(gr);

  /* ---------- Android ---------- */
  const aIntercept = norm(body(and, 'public override WebResourceResponse? ShouldInterceptRequest(AWebView? view, IWebResourceRequest? request)'));
  const aMedia = norm(body(and, /WebResourceResponse\??\s+mediaResponse\(IWebResourceRequest\? request, string url\)/));
  const aClient = body(and, 'public class SpixiWebViewClient : WebViewClient');
  const aChanged = norm(body(and, 'protected override void OnElementChanged(ElementChangedEventArgs<Microsoft.Maui.Controls.WebView> e)'));
  const aDispose = norm(body(and, 'public class SpixiWebviewRenderer2 : ViewRenderer<Microsoft.Maui.Controls.WebView, SpixiWebview>, IWebViewDelegate'));
  ok(aIntercept === '{ var url = request.Url?.ToString() ?? ""; if (ImgurlFlags.MediaOrigin && url.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase)) { return mediaResponse(request, url); } '
      + 'if (!Utils.IsAllowedURL(url)) { return new WebResourceResponse("text/plain", "utf-8", null); } return base.ShouldInterceptRequest(view, request); }',
    'imgurl a1 android before-gate: ShouldInterceptRequest answers the media host FIRST (directly after the url line, before Utils.IsAllowedURL and before the base call), with a return');
  ok(aMedia.length > 0 && !/\bbase\b/.test(aMedia) && !/IsAllowedURL|ShouldInterceptRequest/.test(aMedia) && !/return\s+null\b/.test(aMedia) && !/default\b/.test(aMedia) && !NET_OR_FILE.test(aMedia)
      && count(andN, 'WebResourceResponse? mediaResponse(') === 0 && count(andN, ' WebResourceResponse mediaResponse(') === 1 && count(aClient, 'mediaResponse(') === 2,
    'imgurl a2 android never-falls-through: mediaResponse never calls the base, never returns null (its type is not nullable) and names no file or network API; it is called once');
  ok(aMedia.startsWith('{ var headers = new Dictionary<string, string>(MediaGrants.Headers); try { object? owner = _renderer?.Element; '
      + 'if (owner != null && request?.Method == "GET" && MediaGrants.tryServe(owner, url, out byte[] bytes)) '
      + 'return new WebResourceResponse(MediaGrants.ContentType, null, 200, "OK", headers, new System.IO.MemoryStream(bytes, false)); }'),
    'imgurl a3 android serve-rule: the owner is this client\'s renderer element, GET only, the bytes come from MediaGrants.tryServe with the contract\'s type and headers');
  ok(aMedia.endsWith('} catch (Exception) { } return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new System.IO.MemoryStream(Array.Empty<byte>(), false)); }'),
    'imgurl a4 android 404-path: every miss and every failure is a 404 with the headers and an empty body, outside the try');
  ok(count(andN, 'MediaGrants.serverUp(') === 1 && count(andN, 'serverUp') === 1
      && aChanged.includes('UpdateDisplayZoomControls(); if (MediaGrants.hostOk(e.NewElement.ClassId)) MediaGrants.serverUp(e.NewElement); } Load(); }')
      && aChanged.indexOf('if (e.NewElement != null)') > 0 && aChanged.indexOf('if (e.NewElement != null)') < aChanged.indexOf('MediaGrants.serverUp('),
    'imgurl a5 android serverup-not-miniapp: the ONE serverUp is the body of `if (MediaGrants.hostOk(e.NewElement.ClassId))`, inside the NewElement block of OnElementChanged');
  ok(count(andN, 'MediaGrants.serverDown(') === 2 && aChanged.includes('if (e.OldElement != null) { MediaGrants.serverDown(e.OldElement);')
      && aDispose.includes('if (disposing) { try { if (Element != null) MediaGrants.serverDown(Element); if (Control != null)'),
    'imgurl a6 android serverdown: the old element in OnElementChanged and the element in Dispose lose their server (two calls)');

  const aConsole = norm(body(and, 'public override bool OnConsoleMessage(ConsoleMessage? consoleMessage)'));
  ok(aConsole.includes('string source = consoleMessage.SourceId() ?? ""; if (source.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase)) source = "media"; '
      + 'IXICore.Meta.Logging.info("[WEBVIEW] " + consoleMessage.InvokeMessageLevel() + " " + msg + " (" + source + ":" + consoleMessage.LineNumber() + ")");')
      && count(andN, 'SourceId()') === 1 && count(aConsole, 'Logging.') === 1,
    'imgurl a7 android console-source: the dev console mirror logs a source that starts with the media host as the fixed word "media" (the URL carries the grant token); SourceId() is read in that ONE place');

  /* ---------- Windows ---------- */
  const wEvent = norm(body(win, 'private void CoreWebView2_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs args)'));
  const wMedia = norm(body(win, 'private void answerMedia(CoreWebView2? core, CoreWebView2WebResourceRequestedEventArgs args)'));
  const wConnect = norm(body(win, 'protected override void ConnectHandler(WebView2 platformView)'));
  const wDisconnect = norm(body(win, 'protected override void DisconnectHandler(WebView2 platformView)'));
  ok(wEvent === '{ var uri = args.Request.Uri; if (ImgurlFlags.MediaOrigin && uri.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase)) { answerMedia(sender as CoreWebView2, args); return; } '
      + 'if (!Utils.IsAllowedURL(uri)) { var env = (sender as CoreWebView2)?.Environment; if (env != null) '
      + 'args.Response = env.CreateWebResourceResponse(null, 403, "Blocked", ""); } }',
    'imgurl w1 windows before-gate: WebResourceRequested answers the media host FIRST (directly after the uri line, before Utils.IsAllowedURL) and returns');
  ok(wMedia.length > 0 && !/IsAllowedURL|GetDeferral|\basync\b|\bawait\b|\bTask\b|\bnull;/.test(wMedia) && !NET_OR_FILE.test(wMedia)
      && count(wMedia, 'args.Response =') === 2 && count(wMedia, 'CreateWebResourceResponse(') === 2 && count(winN, 'answerMedia(') === 2,
    'imgurl w2 windows never-falls-through: answerMedia only sets one of two responses at once (no deferral, no task, no file, no network call, the response is never set back to null); it is called once');
  ok(wMedia.includes('object? owner = ((global::Microsoft.Maui.IElementHandler)this).VirtualView; '
      + 'if (owner != null && args.Request.Method == "GET" && MediaGrants.tryServe(owner, args.Request.Uri, out byte[] bytes)) '
      + 'args.Response = env.CreateWebResourceResponse(new MemoryStream(bytes, false).AsRandomAccessStream(), 200, "OK", "Content-Type: " + MediaGrants.ContentType + "\\r\\n" + MediaGrants.HeaderLines); }'),
    'imgurl w3 windows serve-rule: the owner is this handler\'s own virtual view, GET only, the bytes come from MediaGrants.tryServe with the contract\'s type and headers');
  ok(wMedia.startsWith('{ try { var env = core?.Environment ?? PlatformView?.CoreWebView2?.Environment; if (env == null) return; '
      + 'args.Response = env.CreateWebResourceResponse(null, 404, "Not Found", MediaGrants.HeaderLines); object? owner ='),
    'imgurl w4 windows 404-path: inside ONE try, the environment (the sender\'s, else the platform view\'s), then the 404 with the headers and no body FIRST; only a hit replaces it; a throw leaves what was set');
  ok(wConnect.includes('core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All); '
      + 'core.WebResourceRequested -= CoreWebView2_WebResourceRequested; core.WebResourceRequested += CoreWebView2_WebResourceRequested;'),
    'imgurl w5 windows filter: the "*" filter for every context and source kind stands before the subscription (the event fires for the https media host)');
  ok(count(winN, 'MediaGrants.serverUp(') === 1 && count(winN, 'serverUp') === 1
      && wConnect.includes('if (((global::Microsoft.Maui.IElementHandler)this).VirtualView is global::Microsoft.Maui.Controls.WebView element && MediaGrants.hostOk(element.ClassId)) MediaGrants.serverUp(element); }')
      && wConnect.indexOf('core.WebResourceRequested += CoreWebView2_WebResourceRequested;') < wConnect.indexOf('MediaGrants.serverUp('),
    'imgurl w6 windows serverup-not-miniapp: the ONE serverUp is the body of `if (… VirtualView is … WebView element && MediaGrants.hostOk(element.ClassId))`, after the handler is subscribed');
  ok(count(winN, 'MediaGrants.serverDown(') === 1
      && wDisconnect === '{ if (((global::Microsoft.Maui.IElementHandler)this).VirtualView is object element) MediaGrants.serverDown(element); base.DisconnectHandler(platformView); }',
    'imgurl w7 windows serverdown: DisconnectHandler takes the server down, then calls the base');

  /* ---------- iOS / Mac ---------- */
  const iCreate = norm(body(ios, 'protected override WKWebView CreatePlatformView()'));
  const iMedia = norm(body(ios, 'WKWebView? createMediaView()'));
  const iConnect = norm(body(ios, 'protected override void ConnectHandler(WKWebView platformView)'));
  const iDisconnect = norm(body(ios, 'protected override void DisconnectHandler(WKWebView platformView)'));
  const iLost = norm(body(ios, 'void mediaRuleLost()'));
  const iCompile = norm(body(ios, 'static void compileContentRules(WKWebView platformView, string identifier, string rules, bool isFallback, Action? anchoredFailed = null)'));
  const iNav = norm(body(ios, 'class SecureNavigationDelegate : MauiWebViewNavigationDelegate'));
  const sStart = norm(body(sch, 'public void StartUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)'));
  const sStop = norm(body(sch, 'public void StopUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)'));
  ok(iCreate.startsWith('{ WKWebView? mediaView = createMediaView(); if (mediaView != null) {')
      && iCreate.endsWith('return mediaView; } WKWebView platformView = createIsolatedMiniAppView() ?? base.CreatePlatformView(); '
        + 'compileContentRules(platformView, "ContentBlockingRules", anchoredContentRules, false); return platformView; }') && count(iosN, 'createMediaView()') === 2,
    'imgurl i1 ios create-order: the media view is tried first and used only when it was built; else the two base statements stand unchanged (the mini-app view or MAUI\'s own, the plain rule list)');
  ok(iMedia.startsWith('{ if (!SPIXI.ImgurlFlags.MediaOrigin || !isTrustedHost()) return null; try {'),
    'imgurl i2 ios gate: createMediaView returns null FIRST when the switch is OFF or the host is not proven one of ours (isTrustedHost fails closed: a mini app gets no scheme handler)');
  ok(iMedia.includes('try { var configuration = MauiWKWebView.CreateConfiguration(); var scheme = new MediaSchemeHandler(this); configuration.SetUrlSchemeHandler(scheme, SPIXI.MediaGrants.Scheme); '
      + 'var view = new MauiWKWebView(CoreGraphics.CGRect.Empty, this, configuration); _mediaScheme = scheme; return view; } catch (Exception) { return null; } }')
      && !/serverUp/.test(iMedia) && !/serverUp/.test(iCreate) && count(iosN, '_mediaScheme = ') === 2 && count(iosN, '_mediaScheme = scheme;') === 1 && count(iLost, '_mediaScheme = null;') === 1,
    'imgurl i3 ios fallback: any throw gives null (the caller uses the base view) with _mediaScheme still null and NO serverUp; _mediaScheme is set in ONE place, after the view is built');
  ok(count(iosN, 'MediaGrants.serverUp(') === 1 && count(iosN, 'serverUp') === 1
      && iConnect.includes('if (_mediaScheme != null && mediaOwner() is global::Microsoft.Maui.Controls.WebView mediaElement && SPIXI.MediaGrants.hostOk(mediaElement.ClassId)) '
        + '{ SPIXI.MediaGrants.serverUp(mediaElement); }'),
    'imgurl i4 ios serverup-not-miniapp: the ONE serverUp is in ConnectHandler, only with the scheme handler installed, a known element and MediaGrants.hostOk(ClassId)');
  ok(count(iosN, 'MediaGrants.serverDown(') === 2
      && iDisconnect === '{ _navigationDelegate = null; _uiDelegate = null; if (mediaOwner() is object mediaElement) SPIXI.MediaGrants.serverDown(mediaElement); base.DisconnectHandler(platformView); }'
      && iLost === '{ _mediaScheme = null; if (mediaOwner() is object element) SPIXI.MediaGrants.serverDown(element); }',
    'imgurl i5 ios serverdown: DisconnectHandler (before the base call, while the element is still known) and the lost rule list take the server down (two calls)');
  const rawList = (name) => { const a = iosRaw.indexOf('const string ' + name + ' = """'); const b = a < 0 ? -1 : iosRaw.indexOf('""";', a + 30); return a < 0 || b < 0 ? 'spixi-media' : iosRaw.slice(a, b); };
  ok(iosN.includes('const string mediaContentRule = ",{\\"trigger\\":{\\"url-filter\\":\\"^spixi-media://m/[0-9a-f]+$\\",\\"url-filter-is-case-sensitive\\":true},\\"action\\":{\\"type\\":\\"ignore-previous-rules\\"}}";')
      && count(iosN, 'spixi-media') === 1 && !rawList('anchoredContentRules').includes('spixi-media') && !rawList('unanchoredContentRules').includes('spixi-media')
      && count(iosN, 'withMediaRule(') === 2 && count(iosN, 'mediaContentRule') === 2
      && iCreate.includes('if (mediaView != null) { compileContentRules(mediaView, "ContentBlockingRulesMedia", withMediaRule(anchoredContentRules), false, mediaRuleLost); return mediaView; }')
      && iCompile.includes('if (anchoredFailed != null) { try { anchoredFailed(); } catch (Exception) { } IXICore.Meta.Logging.error("Content blocking: the rule list with the media exception did not compile ({0}). This WebView serves no media link; compiling the anchored list.", reason); '
        + 'compileContentRules(platformView, "ContentBlockingRules", anchoredContentRules, false); return; } if (!isFallback) {')
      && count(iCompile, 'anchoredFailed') === 2 && count(iCompile, 'compileContentRules(') === 2
      && iCompile.includes('compileContentRules(platformView, "ContentBlockingRulesUnanchored", unanchoredContentRules, true); return; }'),
    'imgurl i6 ios content-rule: ONE more exception, anchored at both ends and case-sensitive, only on the anchored list of a WebView that has the scheme handler; when that list does not compile the server goes down and the PLAIN anchored list is compiled under the base name (its own ladder); the unanchored fallback gets no exception');
  ok(schN.includes('sealed class MediaSchemeHandler : NSObject, IWKUrlSchemeHandler { readonly WeakReference<iOSWebViewHandler> _owner; '
      + 'public MediaSchemeHandler(iOSWebViewHandler owner) { _owner = new WeakReference<iOSWebViewHandler>(owner); }')
      && count(schN, 'iOSWebViewHandler') === 4 && !/\bstatic\b/.test(schN),
    'imgurl i7 ios weak-owner: the scheme handler holds its handler only through a WeakReference (its one field; no static)');
  ok(schN.includes('[Export("webView:startURLSchemeTask:")] public void StartUrlSchemeTask(') && schN.includes('[Export("webView:stopURLSchemeTask:")] public void StopUrlSchemeTask(') && sStop === '{ }'
      && sStart.includes('object? owner = _owner.TryGetTarget(out iOSWebViewHandler? handler) ? handler.mediaOwner() : null; byte[] bytes = Array.Empty<byte>(); '
        + 'bool hit = owner != null && request.HttpMethod == "GET" && SPIXI.MediaGrants.tryServe(owner, url.AbsoluteString ?? "", out bytes);')
      && sStart.includes('using var headers = new NSMutableDictionary<NSString, NSString>(); foreach (var h in SPIXI.MediaGrants.Headers) headers.Add((NSString)h.Key, (NSString)h.Value); '
        + 'if (hit) headers.Add((NSString)"Content-Type", (NSString)SPIXI.MediaGrants.ContentType); using var response = new NSHttpUrlResponse(url, hit ? 200 : 404, "HTTP/1.1", headers);')
      && sStart.includes('using var response = new NSHttpUrlResponse(url, hit ? 200 : 404, "HTTP/1.1", headers); using NSData? body = hit ? NSData.FromArray(bytes) : null; answering = true; '
        + 'urlSchemeTask.DidReceiveResponse(response); if (body != null) urlSchemeTask.DidReceiveData(body); urlSchemeTask.DidFinish(); }')
      && sStart.includes('if (!answering) { try { urlSchemeTask.DidFailWithError(')
      && iosN.includes('internal object? mediaOwner() => ((global::Microsoft.Maui.IElementHandler)this).VirtualView;'),
    'imgurl i8 ios serve-rule: the owner is the handler\'s own virtual view, GET only, the bytes come from MediaGrants.tryServe; a miss is a 404 with no body; stop is a no-op; one answer per task');
  ok(sch.length > 0 && !NET_OR_FILE.test(sch) && !/\b(?:Task|async|await|DispatchQueue|Thread)\b/.test(sch),
    'imgurl i9 ios never-network: the scheme handler has no network call, no file call and no second thread (the answer is given inside the start call)');
  const proj = read('Spixi/Spixi.csproj');
  const macTarget = /<Target Name="SpixiMacUsesAppleWebViewHandler" AfterTargets="_MauiRemovePlatformCompileItems" Condition="\$\(TargetFramework\.Contains\('-maccatalyst'\)\)">([\s\S]*?)<\/Target>/.exec(proj);
  ok(!!macTarget && macTarget[1].includes('<Compile Include="Platforms\\iOS\\iOSWebViewHandler.cs" />') && macTarget[1].includes('<Compile Include="Platforms\\iOS\\MediaSchemeHandler.cs" />')
      && count(macTarget[1], '<Compile Include=') === 2,
    'imgurl c1 mac-csproj: the Mac target that re-adds iOSWebViewHandler.cs also re-adds the file it names, MediaSchemeHandler.cs (MAUI removes Platforms/iOS/** from the Mac build)');

  /* ---------- shared ---------- */
  const iMediaMembers = iMedia + ' ' + iLost + ' ' + norm(body(ios, 'static string withMediaRule(string rules)'));
  ok(gr.length > 0 && sch.length > 0 && aMedia.length > 0 && wMedia.length > 0 && iMedia.length > 0 && iLost.length > 0
      && !LOG.test(gr) && !LOG.test(sch) && !LOG.test(aMedia) && !LOG.test(wMedia) && !LOG.test(iMediaMembers),
    'imgurl g1 no-log: MediaGrants, the scheme handler and the three media members write no log line (a token, an id or a path cannot reach a log from here)');
  ok(gr.length > 0 && !NET_OR_FILE.test(gr) && !/\b(?:Stream|MemoryStream|Process|Environment)\b/.test(gr) && !NET_OR_FILE.test(aMedia) && !NET_OR_FILE.test(iMediaMembers),
    'imgurl g2 no-file-no-network: MediaGrants, the Android media member and the iOS media members name no file, path, process or network API (the bytes are the grant\'s own array)');
  const all = [];
  const walk = (dir) => { for (const e of readdirSync(join(root, dir), { withFileTypes: true })) { const rel = dir + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(rel); } else if (e.name.endsWith('.cs')) all.push(rel); } };
  walk('Spixi');
  const users = (word) => all.filter((f) => new RegExp('(?<![A-Za-z0-9_])' + word + '(?![A-Za-z0-9_])').test(stripCode(read(f)))).sort().join(' ');
  ok(users('serverUp') === [AND_F, IOS_F, WIN_F, GR_F].sort().join(' ') && users('tryServe') === [AND_F, SCH_F, WIN_F, GR_F].sort().join(' ')
      && users('hostOk') === [AND_F, IOS_F, WIN_F, GR_F].sort().join(' ')
      && users('SetUrlSchemeHandler') === IOS_F && users('MediaSchemeHandler') === [IOS_F, SCH_F].sort().join(' '),
    'imgurl g3 callers: serverUp / hostOk are named only in the three platform files (and MediaGrants.cs), tryServe only in the three request handlers, SetUrlSchemeHandler only in iOSWebViewHandler.cs (every C# file under Spixi/)');
  ok(/#if IOS \|\| MACCATALYST\s+public static string Prefix => SchemePrefix;\s+#else\s+public static string Prefix => HttpsPrefix;\s+#endif/.test(gr)
      && grN.includes('public const string Host = "https://spixi-media.invalid/";') && grN.includes('public const string HttpsPrefix = Host + "m/";')
      && grN.includes('public const string Scheme = "spixi-media";') && grN.includes('public const string SchemePrefix = Scheme + "://m/";') && count(grN, '#if') === 1,
    'imgurl g4 prefix: iOS / Mac get the scheme form, every other platform the https form (the harness runs the https arm only); the one #if of the file');
  ok(grN.includes('public const int ThumbJpegMax = 64 * 1024;') && norm(stripCode(read('Spixi/Pages/Chat/SingleChatPage.xaml.cs'))).includes('public const long ChatThumbMaxBytes = 64 * 1024;')
      && grN.includes('public const int ViewerJpegMax = 1_200_000;') && norm(stripCode(read('Spixi/Utils/ViewerImage.cs'))).includes('public const int MaxJpegBytes = 1_200_000;'),
    'imgurl g5 size-bounds: the table\'s per-picture bounds equal the two producers\' own (ChatThumbMaxBytes, ViewerImage.MaxJpegBytes) — a bigger producer bound would turn every picture into the data: path');
  const tests = stripCode(read('scripts/csh/MediaGrantsTests.cs'));
  ok(read('scripts/csh/csh.csproj').includes('<Compile Include="../../Spixi/Utils/MediaGrants.cs" />') && !/Compile Remove/.test(read('scripts/csh/csh.csproj'))
      && count(tests, '[TestMethod]') === 33 && count(tests, '[TestClass]') === 1,
    'imgurl g6 harness: csh.csproj compiles the REAL MediaGrants.cs and MediaGrantsTests.cs holds its 33 tests (comments removed before the count)');
}
