/* isolation-check — the ★ PARAMOUNT invariant, as far as a static read can see it (quality research #13; interface I1 of
 * docs/contract-qtools.md; SECURITY.md § 1 and § 4, DECISIONS #220).
 *
 * DEFECT CLASS. Chat, and every surface that renders untrusted or remote content, lives in its OWN WebView, isolated from
 * the wallet and every other pane; cross-pane coordination goes through C#, never shared JS. This check fails when the code
 * breaks that in a way the source shows.
 *
 * USAGE  node scripts/quality/isolation-check.mjs [--root <dir>] [--json]
 *        exit 0 clean · 1 a finding · 2 an input could not be read (fail closed: a missing file, a C# file the parser
 *        cannot read that names a token this check reads, the census table missing from the gate doc, …)
 *        `export async function check(root) → { ok, findings: [{ rule, file, line, text }], seen, error? }`
 *
 * THE STRUCTURE IT READS (found in the tree, not assumed). Every page is a class that derives from SpixiContentPage; each
 * page XAML holds ONE <WebView>; a page puts a trusted shell into its WebView with `loadPage(webView, "<file>.html")`
 * (SpixiContentPage.loadPage → generatePage → a `file:` URL). SingleChatPage loads chat.html. MiniAppPage points its WebView
 * at the publisher's entry point (a UrlWebViewSource) and carries ClassId="miniapp", the marker the platform handlers drop
 * privileges on. SpixiContentPage.onNavigatingGlobal answers its verbs for EVERY page — the chat page and the mini-app
 * page too. Desktop split view: HomePage moves another PAGE's Content (with that page's own WebView) into `rightContent` or
 * a staged ContentView; the panes meet only in C# (`Utils.sendUiCommand(this, "selectChat" | "selectTx", …)`).
 *
 * THE RULES (each one TRUE on the tree it was written on; a real exception goes into the gate doc or into the lists below
 * with its reason, after a read against SECURITY.md § 1 — never by loosening a rule):
 *   ISO-1   the chat page (SingleChatPage) loads a document other than chat.html (a loadPage argument, literal or not)
 *   ISO-2   chat.html is loaded by a class other than the chat page
 *   ISO-3   the shell ↔ page map is not one to one outside chat: a computed loadPage argument, a loaded file that is not an
 *           output of the SHELLS table of scripts/build-shells.mjs (or is not built), a page that loads two shells, a shell
 *           that two pages load, or the shared base loading a literal shell itself. A WRAPPER — a method whose parameter
 *           goes straight into loadPage (`loadShell(w, f) { loadPage(w, f); }`) — is resolved one level: each call of it
 *           with a literal is a load of the CALLER's page (so ISO-1 / ISO-2 see it); a wrapper called with a computed value,
 *           or a wrapper of a wrapper, is a computed load (fails closed as ISO-3)
 *   ISO-4   a web view document set outside its listed homes (SOURCES): `new Url/HtmlWebViewSource`, a `Source` /
 *           `DefaultFile` / `HybridRoot` assignment on a web view (a receiver that is a XAML web view x:Name, a variable
 *           declared with a web view type, or named webView / wv), `SetValue(…SourceProperty, …)`, a load call
 *           (LOAD_CALLS: LoadDataWithBaseURL, LoadRequest, NavigateToString …), generatePage; any XAML `Source=` /
 *           `<WebView.Source>` / Style Setter of those; or the mini-app page given a trusted shell (loadPage)
 *   ISO-5   the WebView markers moved: a XAML web view whose ClassId differs from MARKERS (the mini-app page loses
 *           "miniapp", another page gains "miniapp" or the camera marker "scan"), or C# writes ClassId
 *   ISO-6   a web view that is not one page's own MAUI WebView: a page XAML with more than one web view element, one in a
 *           XAML whose class is not a page, a HybridWebView or a WebView subclass in XAML, or a web view built in C# (`new`
 *           of WebView, HybridWebView, a class of the tree that derives from one, or a platform view) outside PLATFORM_VIEWS
 *   ISO-7   a chat-only verb (its only sender is chat.html, by the bridge contract) is tested by a page other than the chat
 *           page and the shared base (outside CHAT_ONLY_ELSEWHERE)
 *   ISO-8   a money or keys verb answered in the chat page, or a money, keys or PATH verb answered in the shared base (the
 *           contract's marks of THAT handler branch), outside RISKY_IN_CHAT_OR_BASE — the base answers every WebView, the
 *           chat one and the mini-app one too
 *   ISO-9   the verb surface of untrusted content widened: the mini-app page answers a verb, or one of its verbs reaches a
 *           mark, outside MINIAPP_VERBS (SECURITY.md § 4 rule 4: the SpixiAppSdk surface only); or the shared base answers a
 *           verb outside BASE_VERBS (MiniAppPage.handleBridgeUrl calls onNavigatingGlobal first)
 *   ISO-10  a WebView setting in C# or XAML (SETTING_PROPS / SETTING_CALLS; in XAML an attribute, a property element or a
 *           Style Setter of a web view type) whose (setting, file, value) is not a row of the census table in
 *           docs/security-handover-gate.md (the heading names CENSUS_HEADING)
 *   ISO-11  a census row whose site is gone (the gate doc tells the BE engineer about a setting the code no longer has)
 *   ISO-12  script run inside a WebView (SCRIPT_CALLS: EvaluateJavaScript*, ExecuteScript*, Eval, LoadUrl, PostWebMessage*,
 *           CallDevToolsProtocolMethodAsync, CallAsyncJavaScript, AddDocumentStartJavaScript, InvokeJavaScriptAsync …)
 *           outside SCRIPT_HOMES — a new path that runs script in a WebView is how a JS bridge between panes would be built
 *   ISO-13  a name of the REJECTED hosted-pane design (`executeUiCommandInPane`, `ixian:pane:`) in C#, JS or a shell
 *   ISO-14  a shell composes another document into its own (iframe / frame / object / embed / portal / webview / srcdoc),
 *           in markup or in a JS string (a tag, or the argument of createElement), over src/shells, the built shells, the
 *           bundle sources and the built bundle. A shell that the HTML walker refuses for such an element is ISO-14 at
 *           once, and the other rules do not run
 *   ISO-15  a built shell (Spixi/Resources/Raw/html) or the built bundle emits a verb its source does not, or the other way
 *           round — the contract is made from src, so what ships must be what was read
 *
 * WHAT IT CANNOT SEE. Everything lib-csharp.mjs and bridge-contract.mjs list (no binding: calls by name; no field taint; a
 * verb composed at run time; a verb test through a dictionary key; Ixian-Core bodies; the listed unparsable files).
 * Runtime navigation the C# builds from data (a WebView pointed at a URL made at run time inside a listed home). A wrapper
 * of loadPage more than one level deep is not resolved (it is reported as computed, so it fails closed). A Source set on a
 * receiver whose web view type the file does not declare (a field of another class, a cast, a property chain) and whose
 * name is not a XAML x:Name or webView / wv. A web view type written only as `Android.Webkit.WebView` in a base list, or
 * through a `using` alias. A setting set through a helper this list does not name, through reflection, or through a
 * key-value string (`SetValueForKey` IS named; a plain `SetValue` is not, except for a SourceProperty / ClassIdProperty).
 * XAML set from a ResourceDictionary in another file than the Style's (the Setter is read where it is written). Script
 * injected by a platform default the code does not call. Two WebViews in one OS window that share a process or a storage
 * partition (platform behaviour: rows F-23 / O-03 of the gate doc). Whether the JS of one pane can reach another at run
 * time. The settings census matches setting + file + value, so a second identical site in the same file is covered by the
 * same row. It guards against MISTAKES, not against an author who hides code.
 */
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReadError, read, listFiles, STRING_TYPES, strValue, memberOf, memberName, typeName, callee, argNodes, norm, desc, perTree, params, idents } from './lib-csharp.mjs';
import { analyze, inlineFacts, lexJs, jsFacts, shellMap, BASE_PAGE, bundleFiles, CONTRACT_FILE } from './bridge-contract.mjs';
import { walkHtml } from '../lib/lean-strip.mjs';
import { createHash } from 'node:crypto';

export const CHAT_PAGE = 'SingleChatPage';
export const CHAT_SHELL = 'chat.html';
export const MINIAPP_PAGE = 'MiniAppPage';
export const GATE_DOC = 'docs/security-handover-gate.md';
export const CENSUS_HEADING = 'WebView settings census';
export const BUILT_DIR = 'Spixi/Resources/Raw/html';
export const BUILT_BUNDLE = 'Spixi/Resources/Raw/html/spixi.bundle.js';

/* ─── the listed homes (today's tree; a new entry is a security review, not a refactor) ─── */

/** ISO-4: where a WebView content source may be made or set. key: file | Class.member | what; n = how many sites */
export const SOURCES = [
  { file: 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs', at: 'MiniAppPage.MiniAppPage', what: 'new UrlWebViewSource', n: 1, reason: 'the ONE untrusted document: the publisher entry point, `file://` + the installed app path' },
  { file: 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs', at: 'MiniAppPage.MiniAppPage', what: 'Source = source', n: 1, reason: 'the same source, set on the mini-app page\'s own WebView' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.loadPage', what: 'Source = generatePage(html_file_name)', n: 1, reason: 'loadPage: a trusted shell from the page\'s own literal' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.loadPage', what: 'generatePage(html_file_name)', n: 1, reason: 'the same call' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.reload', what: 'Source = generatePage(loadedHtmlFileName)', n: 1, reason: 'reload: the document loadPage set before' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.reload', what: 'generatePage(loadedHtmlFileName)', n: 1, reason: 'the same call' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.Dispose', what: 'Source = null', n: 1, reason: 'teardown: the document is dropped' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.generatePage', what: 'new UrlWebViewSource', n: 1, reason: 'the shell file as a `file:` URL (generatePage)' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.generatePage', what: 'new HtmlWebViewSource', n: 1, reason: 'the localized shell text with its base URL (generatePage)' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.generateFallbackPage', what: 'new HtmlWebViewSource', n: 2, reason: 'the fixed built-in error page (gate doc, Session L: no script, no network)' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebViewClient.OnPageFinished', what: 'new UrlWebViewSource', n: 1, reason: 'event arguments for MAUI Navigated, not a load' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebViewClient.ShouldOverrideUrlLoading', what: 'new UrlWebViewSource', n: 1, reason: 'event arguments for MAUI Navigating, not a load' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.SendNavigatingCanceled', what: 'new UrlWebViewSource', n: 1, reason: 'event arguments for MAUI Navigating, not a load' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.LoadHtml', what: 'LoadDataWithBaseURL|Control', n: 1, reason: 'the Android half of an HtmlWebViewSource (generatePage / generateFallbackPage) on the renderer\'s own control' },
];
/** a call that puts a document into a web view (ISO-4 counts it as a source) */
const LOAD_CALLS = new Set(['LoadDataWithBaseURL', 'LoadData', 'NavigateToString', 'Navigate', 'LoadHtmlString', 'LoadRequest', 'LoadFileUrl',
  'LoadSimulatedRequest', 'NavigateWithWebResourceRequest']);
/** a XAML attribute / property element / Setter that sets a web view's document (ISO-4: none is listed) */
const XAML_SOURCE_PROPS = new Set(['Source', 'DefaultFile', 'HybridRoot']);

/** ISO-5: the XAML WebView markers (file → ClassId); every other <WebView> carries none */
export const MARKERS = {
  'Spixi/Pages/MiniApps/MiniAppPage.xaml': { value: 'miniapp', reason: 'the untrusted-content marker: Android drops DOM storage and the console mirror, iOS builds a non-persistent store, Windows drops DevTools / host objects / permissions (SafetyRules.isMiniAppMarker)' },
  'Spixi/Pages/Scan/ScanPage.xaml': { value: 'scan', reason: 'the ONE WebView Android may give the camera (WebViewRenderer.OnPermissionRequest → S16SecRules.captureRefusal)' },
};

/** ISO-6: where a platform web view may be built (one per MAUI WebView, inside its handler) */
export const PLATFORM_VIEWS = [
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.CreateNativeControl', what: 'SpixiWebview', n: 1, reason: 'the Android renderer builds the native view of ONE MAUI WebView' },
  { file: 'Spixi/Platforms/iOS/iOSWebViewHandler.cs', at: 'iOSWebViewHandler.createIsolatedMiniAppView', what: 'MauiWKWebView', n: 1, reason: 'the mini-app WebView with its own non-persistent data store (row F-23)' },
];
const PLATFORM_VIEW_RE = /(^|\.)(WebView|WKWebView|MauiWKWebView|SpixiWebview|WebView2|MauiWebView|CoreWebView2)$/;
/** the MAUI web view types; a class of the tree whose base is one of them (by its written name) is one too */
const MAUI_WEBVIEW_BASES = new Set(['WebView', 'Microsoft.Maui.Controls.WebView', 'HybridWebView', 'Microsoft.Maui.Controls.HybridWebView']);

/** ISO-7: a chat-only verb that another page tests, and why that is not a route from chat into that page */
export const CHAT_ONLY_ELSEWHERE = [
  { verb: 'installApp', cls: 'AppDetailsPage', reason: 'AppDetailsPage tests the PREFIX `ixian:install` (its own verb, app_details.html); `installApp` passes the same prefix, but only chat.html sends it and the chat WebView cannot reach AppDetailsPage\'s handler' },
  { verb: 'callback', cls: 'CallPage', reason: 'CallPage tests the PREFIX `ixian:call` and hands the URL to onCallControl, which acts only on its own call* verbs; call.html never sends `callback`, and the chat WebView cannot reach CallPage\'s handler' },
];

/** ISO-8: a money / keys verb answered in the chat page, or a money / keys / path verb answered in the shared base, with its reason */
export const RISKY_IN_CHAT_OR_BASE = [
  { verb: 'chat', cls: 'SingleChatPage', mark: 'money', reason: 'SingleChatPage.onSend, bot rooms with a price: `new Transaction(…)` (Ixian-Core signs in the constructor) ONLY to read amount + fee against the balance; the transaction is never added, sent or kept (legacy: the same block at 0e85a4b8)' },
  { verb: 'chatreply', cls: 'SingleChatPage', mark: 'money', reason: 'the same onSend path (a reply is a chat message): the bot-room price check builds a Transaction that is never sent' },
  { verb: 'contextAction', cls: 'SingleChatPage', mark: 'money', reason: 'the chat tip (`contextAction:tip:`): legacy, SECURITY.md § 3 row "Chat tip" and gap 5.1; reaches prepareTransactionFrom / addTransaction' },
  { verb: 'feeQuery', cls: 'SingleChatPage', mark: 'money', reason: 'SPayments.handleFeeQuery: a fee estimate builds a transaction it never signs or sends (Node.calculateTransactionFee → prepareTransactionFrom)' },
  { verb: 'payRequest', cls: 'SingleChatPage', mark: 'money', reason: 'SPayments.handlePayRequest: a PROPOSAL — C# re-validates and shows the NATIVE confirm before signing (gate doc batch #522–#529)' },
  { verb: 'signSend', cls: 'SingleChatPage', mark: 'money', reason: 'SPayments.handleSignSend: the W5 hand-off — C# re-parses address and amount, computes its own fee, native DisplayAlert before Node.sendTransactionFrom (gate doc batch #522–#529)' },
];

/** ISO-9: the SpixiAppSdk surface of MiniAppPage, with the marks each verb may reach */
export const MINIAPP_VERBS = [
  { verb: 'action', marks: ['keys', 'money', 'path'], reason: 'SpixiAppSdk actions: SEND_PAYMENT → native OK/Cancel before addTransaction (SECURITY.md § 3); AUTH signs a challenge with the key in C# (the key never crosses); the storage actions reach MiniAppStorage.safeTablePath (SafetyRules.childPath)' },
  { verb: 'back', marks: [], reason: 'close the mini app' },
  { verb: 'data', marks: [], reason: 'app data to the session peers' },
  { verb: 'getStorageData', marks: [], reason: 'the app\'s own storage table (read)' },
  { verb: 'onload', marks: [], reason: 'the SDK boot handshake' },
  { verb: 'protocolData', marks: [], reason: 'protocol data to the session peers' },
  { verb: 'setStorageData', marks: [], reason: 'the app\'s own storage table (write)' },
];

/** ISO-9: the verbs the SHARED BASE answers — SpixiContentPage.onNavigatingGlobal / webViewNavigating run for every page, and
 *  MiniAppPage.handleBridgeUrl calls onNavigatingGlobal first, so each of these is reachable from the mini-app WebView too */
export const BASE_VERBS = [
  { verb: 'appAccept', reason: 'accept an incoming call or mini-app session invite; onAppAccept refuses only the VoIP branch on a surface that does not accept call pushes; the mini-app invite branch (MiniAppManager.acceptAppRequest) runs for any surface, the mini-app WebView too (legacy, 0e85a4b8)' },
  { verb: 'appReject', reason: 'reject that call or invite (the same split: the VoIP branch refused off call surfaces, MiniAppManager.rejectAppRequest for any surface; legacy)' },
  { verb: 'cdping', reason: 'gated on hasGeneratedContent (false for the mini-app WebView): a digit token is echoed as cdpong' },
  { verb: 'copytext', reason: 'gated on hasGeneratedContent: the native clipboard write of the shells (#1037)' },
  { verb: 'hangUp', reason: 'gated on acceptsCallPushes: a surface that receives no call state cannot end a call' },
  { verb: 'haptic', reason: 'gated on hasGeneratedContent and the foreground: a fixed haptic kind' },
  { verb: 'moment', reason: 'gated on hasGeneratedContent and five page types (SMoments.handleVerb)' },
  { verb: 'onload', reason: 'webViewNavigating: the document-ready signal of every page' },
  { verb: 'painted', reason: 'gated on hasGeneratedContent: the present-on-paint latch (gate doc Session O)' },
];

/** ISO-12: where script may run inside a WebView. what = method | receiver */
export const SCRIPT_HOMES = [
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.evaluateJavascript', what: 'EvaluateJavaScriptAsync|_webView', n: 1, reason: 'the push transport (Utils.sendUiCommand) into THIS page\'s own WebView' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.checkIfPageLoaded', what: 'EvaluateJavaScriptAsync|_webView', n: 1, reason: 'reads document.readyState of this page\'s own WebView' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.startSpareKeepProof', what: 'EvaluateJavaScriptAsync|wv', n: 1, reason: 'reads document.readyState of the spare chat\'s own WebView' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.OnEvaluateJavaScriptRequested', what: 'EvaluateJavascript|Control', n: 1, reason: 'the Android half of MAUI EvaluateJavaScriptAsync, on the renderer\'s own control' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.OnEvalRequested', what: 'LoadUrl|', n: 1, reason: 'the Android half of MAUI Eval (a `javascript:` URL on its own control)' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.LoadUrl', what: 'LoadUrl|', n: 1, reason: 'the renderer\'s navigation entry (MAUI LoadUrl)' },
  { file: 'Spixi/Platforms/Android/WebViewRenderer.cs', at: 'SpixiWebviewRenderer2.LoadUrl', what: 'LoadUrl|Control', n: 1, reason: 'the same, on the native control' },
  { file: 'Spixi/Platforms/iOS/iOSWebViewHandler.cs', at: 'SecureNavigationDelegate.forwardToConsole', what: 'EvaluateJavaScript|webView', n: 1, reason: 'one fixed-format console.error line into the same WebView' },
  { file: 'Spixi/Platforms/iOS/iOSWebViewHandler.cs', at: 'MediaCaptureUIDelegate.forward', what: 'EvaluateJavaScript|webView', n: 1, reason: 'one fixed-format console.error line into the same WebView' },
  { file: 'Spixi/Utils/SpixiContentPage.cs', at: 'SpixiContentPage.p1HookConsole', what: 'CallDevToolsProtocolMethodAsync|core', n: 2, reason: '`#if SPIXI_DEV_COEXIST`, Windows, not the mini app: Runtime.enable + a call-stack size for the [P1] console mirror (TEMPORARY, retired with the [P1] set)' },
];
const SCRIPT_CALLS = new Set(['EvaluateJavaScriptAsync', 'EvaluateJavascript', 'EvaluateJavaScript', 'ExecuteScriptAsync', 'ExecuteScript',
  'Eval', 'LoadUrl', 'PostWebMessageAsString', 'PostWebMessageAsJson', 'InjectJavaScript', 'EvaluateJavaScriptAsyncInFrame',
  'CallDevToolsProtocolMethodAsync', 'CallDevToolsProtocolMethodForSessionAsync', 'CallAsyncJavaScript', 'CallAsyncJavaScriptAsync',
  'ExecuteScriptWithResultAsync', 'AddDocumentStartJavaScript', 'AddDocumentStartJavaScriptAsync', 'InvokeJavaScriptAsync']);

/* ISO-10: the WebView setting names (Android WebSettings / CookieManager, WKWebViewConfiguration / WKPreferences /
 * WKWebpagePreferences / WKWebView, CoreWebView2Settings / CoreWebView2, MAUI WebView and its platform-specifics) */
export const SETTING_PROPS = new Set(('JavaScriptEnabled JavaScriptCanOpenWindowsAutomatically AllowFileAccess AllowFileAccessFromFileURLs ' +
  'AllowUniversalAccessFromFileURLs AllowContentAccess DomStorageEnabled DatabaseEnabled MediaPlaybackRequiresUserGesture CacheMode ' +
  'MixedContentMode BuiltInZoomControls DisplayZoomControls SaveFormData SavePassword LoadWithOverviewMode UseWideViewPort ' +
  'LoadsImagesAutomatically BlockNetworkImage BlockNetworkLoads SafeBrowsingEnabled UserAgentString ForceDark ' +
  'AlgorithmicDarkeningAllowed OffscreenPreRaster DisabledActionModeMenuItems GeolocationEnabled ' +
  'WebsiteDataStore ProcessPool Preferences DefaultWebpagePreferences AllowsContentJavaScript AllowsInlineMediaPlayback ' +
  'MediaTypesRequiringUserActionForPlayback MediaPlaybackRequiresUserAction AllowsAirPlayForMediaPlayback ' +
  'AllowsPictureInPictureMediaPlayback LimitsNavigationsToAppBoundDomains UpgradeKnownHostsToHttps FraudulentWebsiteWarningEnabled ' +
  'TextInteractionEnabled ElementFullscreenEnabled UserContentController Inspectable AllowsBackForwardNavigationGestures ' +
  'AllowsLinkPreview CustomUserAgent ApplicationNameForUserAgent DataDetectorTypes IgnoresViewportScaleLimits ' +
  'AreDevToolsEnabled AreHostObjectsAllowed IsWebMessageEnabled IsScriptEnabled AreDefaultScriptDialogsEnabled ' +
  'AreDefaultContextMenusEnabled IsStatusBarEnabled IsZoomControlEnabled IsBuiltInErrorPageEnabled AreBrowserAcceleratorKeysEnabled ' +
  'IsPasswordAutosaveEnabled IsGeneralAutofillEnabled IsPinchZoomEnabled IsSwipeNavigationEnabled HiddenPdfToolbarItems ' +
  'IsReputationCheckingRequired IsNonClientRegionSupportEnabled UserAgent AdditionalBrowserArguments ' +
  'AllowSingleSignOnUsingOSPrimaryAccount EnableZoomControls IsJavaScriptAlertEnabled Cookies').split(' '));
export const SETTING_CALLS = new Set(('SetSupportMultipleWindows SetSupportZoom SetAppCacheEnabled SetGeolocationEnabled ' +
  'SetWebContentsDebuggingEnabled AddJavascriptInterface RemoveJavascriptInterface SetAcceptThirdPartyCookies SetAcceptCookie ' +
  'SetAcceptFileSchemeCookies SetValueForKey SetUrlSchemeHandler AddScriptMessageHandler AddUserScript AddHostObjectToScript ' +
  'AddScriptToExecuteOnDocumentCreatedAsync SetVirtualHostNameToFolderMapping AddWebResourceRequestedFilter SetMixedContentMode ' +
  'SetEnableZoomControls SetDisplayZoomControls SetIsJavaScriptAlertEnabled SetExecutionMode SetJavaScriptEnabled ' +
  'SetAllowFileAccess SetAllowFileAccessFromFileURLs SetAllowUniversalAccessFromFileURLs SetAllowContentAccess ' +
  'SetDomStorageEnabled SetDatabaseEnabled SetMediaPlaybackRequiresUserGesture SetJavaScriptCanOpenWindowsAutomatically ' +
  'SetSafeBrowsingEnabled SetBlockNetworkLoads SetBlockNetworkImage SetAllowUniversalAccessFromFileUrls SetAllowFileAccessFromFileUrls ' +
  'EnableZoomControls DisplayZoomControls SetAlgorithmicDarkeningAllowed SetForceDark SetForceDarkStrategy AddContentRuleList ' +
  'RemoveContentRuleList RemoveAllContentRuleLists SetDownloadListener').split(' '));

export const REJECTED_NAMES = ['executeUiCommandInPane'];
export const REJECTED_PREFIX = 'ixian:pane:';
const EMBED_TAG_RE = /<\s*(iframe|frame|frameset|object|embed|portal|webview|fencedframe)\b/i;
const EMBED_WORD_RE = /^(iframe|frame|frameset|object|embed|portal|webview|fencedframe)$/i;   /* as a createElement argument */

/* ─── helpers ─── */
/** 1-based line of an offset (line starts cached per string object) */
const lineAt = (text, at) => {
  let starts = LINE_CACHE.get(text);
  if (!starts) { starts = [0]; for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1); LINE_CACHE.set(text, starts); if (LINE_CACHE.size > 64) LINE_CACHE.delete(LINE_CACHE.keys().next().value); }
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= at) lo = mid; else hi = mid - 1; }
  return lo + 1;
};
const LINE_CACHE = new Map();
const ln = (node) => node.startPosition.row + 1;
const where = (node) => { const { member, type } = memberOf(node); return typeName(type) + '.' + memberName(member); };
const firstLit = (arg) => (arg && STRING_TYPES.includes(arg.namedChildren[0] && arg.namedChildren[0].type) && arg.namedChildren.length === 1) ? strValue(arg.namedChildren[0]) : null;

/** count sites against a listed set: every key over its count, or not listed, is a finding */
function againstList(sites, list, rule, label, findings) {
  const allowed = new Map(list.map((e) => [e.file + '|' + e.at + '|' + e.what, e.n]));
  const seen = new Map();
  for (const s of sites) {
    const k = s.file + '|' + s.at + '|' + s.what;
    const c = (seen.get(k) || 0) + 1;
    seen.set(k, c);
    if (!allowed.has(k) || c > allowed.get(k)) findings.push({ rule, file: s.file, line: s.line, text: label + ' `' + s.what + '` in ' + s.at + (allowed.has(k) ? ' (more sites than the ' + allowed.get(k) + ' listed)' : ' — not a listed home') });
  }
}

/** the census table of the gate doc */
export function readCensus(root) {
  const doc = read(root, GATE_DOC);
  const lines = doc.split('\n');
  const heads = lines.map((l, i) => [l, i]).filter(([l]) => /^#{2,4}\s/.test(l) && l.includes(CENSUS_HEADING));
  if (heads.length !== 1) throw new ReadError(GATE_DOC + ': expected ONE heading that names "' + CENSUS_HEADING + '", found ' + heads.length);
  let i = heads[0][1] + 1;
  while (i < lines.length && !lines[i].trim().startsWith('|')) { if (/^#{1,4}\s/.test(lines[i])) break; i++; }
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|').replace(/^`+|`+$/g, '').trim());
  if (i >= lines.length || !lines[i].trim().startsWith('|')) throw new ReadError(GATE_DOC + ': no table under the "' + CENSUS_HEADING + '" heading');
  const head = cells(lines[i]).map((c) => c.toLowerCase());
  if (head.join('|') !== 'setting|file|value|verdict') throw new ReadError(GATE_DOC + ': the census table header must be | setting | file | value | verdict | (found | ' + head.join(' | ') + ' |)');
  i += 2;
  const rows = [];
  for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const c = cells(lines[i]);
    if (c.length < 4 || !c[0] || !c[1]) throw new ReadError(GATE_DOC + ':' + (i + 1) + ': a census row needs setting, file, value, verdict');
    rows.push({ setting: c[0], file: c[1], value: norm(c[2]), verdict: c[3], line: i + 1 });
  }
  if (!rows.length) throw new ReadError(GATE_DOC + ': the census table has no row');
  return rows;
}

/** XAML (comments removed): the web view elements (any of `types`, with or without a namespace prefix; `<X.Prop>` is a
 *  property element, not a web view), their attributes, the x:Class, the settings and the document sources written as an
 *  attribute, a property element or a Style Setter */
function readXaml(root, types) {
  const out = [];
  const T = [...types].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const elRe = new RegExp('<(?:\\w+:)?(' + T + ')\\b(?![.\\w])((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)>', 'g');
  const propRe = new RegExp('<(?:\\w+:)?(?:' + T + ')\\.(\\w+)\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?(?:' + T + ')\\.\\1\\s*>', 'g');
  const isType = (q) => types.has(String(q).split(/[.:]/).pop());
  for (const rel of listFiles(root, 'Spixi', (n) => n.endsWith('.xaml'))) {
    const raw = read(root, rel);
    const text = raw.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
    const cls = (/\bx:Class\s*=\s*"([^"]+)"/.exec(text) || [])[1] || '';
    const views = [], settings = [], sources = [];
    const take = (prop, value, line, how) => {
      const local = prop.split(/[.:]/).pop();
      if (SETTING_PROPS.has(local) || SETTING_CALLS.has(local)) settings.push({ setting: local, file: rel, value: norm(value), line });
      if (XAML_SOURCE_PROPS.has(local)) sources.push({ file: rel, line, text: how + ' ' + local + '="' + norm(value).slice(0, 80) + '"' });
    };
    for (const m of text.matchAll(elRe)) {
      const attrs = {};
      const line = lineAt(text, m.index);
      for (const a of m[2].matchAll(/([\w:.]+)\s*=\s*"([^"]*)"/g)) { attrs[a[1]] = a[2]; take(a[1], a[2], line, 'the attribute'); }
      views.push({ type: m[1], attrs, line });
    }
    for (const m of text.matchAll(propRe)) take(m[1], m[2].replace(/<[^>]*>/g, ' '), lineAt(text, m.index), 'the property element');
    for (const m of text.matchAll(/<(?:\w+:)?Setter\b([^>]*)>/g)) {
      const prop = (/\bProperty\s*=\s*"([^"]*)"/.exec(m[1]) || [])[1];
      if (!prop) continue;
      const value = (/\bValue\s*=\s*"([^"]*)"/.exec(m[1]) || [])[1] || '';
      let target = prop.includes('.') ? prop.slice(0, prop.lastIndexOf('.')) : '';
      if (!target) {
        const before = text.slice(0, m.index);
        const st = before.lastIndexOf('<Style');
        if (st >= 0 && before.indexOf('</Style>', st) < 0) target = (/\bTargetType\s*=\s*"([^"]*)"/.exec(text.slice(st, text.indexOf('>', st))) || [])[1] || '';
      }
      if (target && isType(target)) take(prop, value, lineAt(text, m.index), 'the Style Setter');
    }
    out.push({ rel, cls: cls.split('.').pop(), views, settings, sources });
  }
  return out;
}

/** what one C# file holds for the rules (depends on that file's content only, so it is cached per parsed tree) */
function fileFacts(f) {
  const r = f.tree.rootNode;
  const o = { loads: [], sources: [], scripts: [], settings: [], markerWrites: [], rejected: [], news: [], sourceSets: [], typed: [] };
  for (const inv of desc(r, 'invocation_expression')) {
    const c = callee(inv);
    const watched = c.name === 'loadPage' || c.name === 'generatePage' || SCRIPT_CALLS.has(c.name) || SETTING_CALLS.has(c.name) || LOAD_CALLS.has(c.name) || c.name === 'SetValue' || c.name === 'SetBinding';
    if (!watched) continue;
    const args = argNodes(inv);
    if (c.name === 'loadPage') {
      const { member } = memberOf(inv);
      const arg = args[1] ? firstLit(args[1]) : null;
      let param = -1;
      if (arg === null && args[1] && member && /^[A-Za-z_]\w*$/.test(args[1].text.trim()) && (member.type === 'method_declaration' || member.type === 'constructor_declaration')) param = params(member).names.indexOf(args[1].text.trim());
      o.loads.push({ line: ln(inv), cls: typeName(memberOf(inv).type), at: where(inv), member: member ? memberName(member) : '', arg, argText: args[1] ? norm(args[1].text) : '', param });
    }
    if (c.name === 'generatePage') o.sources.push({ line: ln(inv), at: where(inv), what: 'generatePage(' + norm(args.map((a) => a.text).join(', ')) + ')' });
    if (LOAD_CALLS.has(c.name)) o.sources.push({ line: ln(inv), at: where(inv), what: c.name + '|' + norm(c.recv) });
    if (SCRIPT_CALLS.has(c.name)) o.scripts.push({ line: ln(inv), at: where(inv), what: c.name + '|' + norm(c.recv) });
    if (SETTING_CALLS.has(c.name)) o.settings.push({ setting: c.name, value: norm(args.map((a) => a.text).join(', ')), line: ln(inv) });
    if ((c.name === 'SetValue' || c.name === 'SetBinding') && /ClassIdProperty/.test(inv.text)) o.markerWrites.push({ line: ln(inv), text: norm(inv.text) });
    if ((c.name === 'SetValue' || c.name === 'SetBinding') && /\b(Source|DefaultFile|HybridRoot)Property\b/.test(args[0] ? args[0].text : '')) o.sources.push({ line: ln(inv), at: where(inv), what: c.name + '(' + norm(args[0].text) + ')' });
  }
  for (const n of desc(r, 'object_creation_expression')) {
    const t = norm((n.childForFieldName('type') || n).text);
    if (/(^|\.)(Url|Html)WebViewSource$/.test(t)) o.sources.push({ line: ln(n), at: where(n), what: 'new ' + t.split('.').pop() });
    o.news.push({ line: ln(n), at: where(n), full: t.replace(/<.*$/, '').replace(/^global::/, ''), type: (t.replace(/<.*$/, '').split('.').pop() || '') });
  }
  for (const a of desc(r, 'assignment_expression')) {
    const l = a.childForFieldName('left');
    if (!l || (l.type !== 'member_access_expression' && l.type !== 'identifier')) continue;
    let name = '', recv = '';
    if (l.type === 'member_access_expression') { name = (l.childForFieldName('name') || l).text; recv = (l.childForFieldName('expression') || {}).text || ''; }
    else if (a.parent && a.parent.type === 'initializer_expression') name = l.text;
    if (!XAML_SOURCE_PROPS.has(name) && name !== 'ClassId' && !SETTING_PROPS.has(name)) continue;
    const rt = a.childForFieldName('right');
    if (!rt) continue;
    if (XAML_SOURCE_PROPS.has(name)) o.sourceSets.push({ line: ln(a), at: where(a), recv: idents(recv).pop() || '', what: name + ' = ' + norm(rt.text), init: l.type === 'identifier' });
    if (name === 'ClassId') o.markerWrites.push({ line: ln(a), text: norm(a.text) });
    if (SETTING_PROPS.has(name)) o.settings.push({ setting: name, value: norm(rt.text), line: ln(a) });
  }
  for (const d of desc(r, ['variable_declaration', 'parameter', 'property_declaration'])) {
    const ty = d.childForFieldName('type');
    if (!ty) continue;
    const tn = (norm(ty.text).replace(/<.*$/, '').replace(/\?$/, '').split('.').pop()) || '';
    if (!/^[A-Z]/.test(tn)) continue;
    if (d.type === 'variable_declaration') { for (const v of d.namedChildren.filter((c) => c.type === 'variable_declarator')) { const id = v.namedChildren.find((c) => c.type === 'identifier'); if (id) o.typed.push({ type: tn, name: id.text }); } }
    else { const id = d.childForFieldName('name'); if (id) o.typed.push({ type: tn, name: id.text }); }
  }
  if (REJECTED_NAMES.some((w) => f.src.includes(w)) || f.src.includes(REJECTED_PREFIX)) {
    for (const n of r.descendantsOfType(['identifier', ...STRING_TYPES])) {
      const v = n.type === 'identifier' ? n.text : strValue(n);
      if (REJECTED_NAMES.includes(v) || v.startsWith(REJECTED_PREFIX)) o.rejected.push({ line: ln(n), text: v });
    }
  }
  return o;
}

/* ─── the shells and their JS, cached by content (a pin runs the check on copies that differ in one file) ─── */
const sha = (t) => createHash('sha1').update(t).digest('hex');
const WALKS = new Map(), HITS = new Map();
/** the src and built shell documents */
function shellDocs(root) {
  const out = [];
  const { map } = shellMap(root);
  for (const [src, built] of [...map].sort()) {
    const rel = 'src/shells/' + src, brel = BUILT_DIR + '/' + built;
    if (!existsSync(join(root, brel))) throw new ReadError('the built shell ' + brel + ' (from ' + rel + ') is missing');
    out.push({ file: rel, html: read(root, rel) }, { file: brel, html: read(root, brel) });
  }
  return out;
}
function walkCached(html, file) {
  const k = sha(html);
  if (WALKS.has(k)) return WALKS.get(k);
  let parts;
  try { parts = walkHtml(html, { file }).parts; } catch (e) { throw new ReadError(file + ': the HTML walker refused: ' + String(e.message || e).split('\n')[0]); }
  const res = { markupHits: [], scripts: [] };
  let at = 0;
  for (const p of parts) {
    if (p.kind === 'markup') {
      const m = EMBED_TAG_RE.exec(p.text) || /\bsrcdoc\s*=/i.exec(p.text);
      if (m) res.markupHits.push({ at: at + m.index, text: m[0] });
    }
    if (p.kind === 'script' && p.text.trim()) res.scripts.push({ code: p.text, start: at });
    at += p.text.length;
  }
  WALKS.set(k, res);
  return res;
}
/** the ISO-13 / ISO-14 hits of one piece of JS, offsets only (lines are computed for a hit only) */
function jsHits(code, file) {
  const k = sha(code);
  if (HITS.has(k)) return HITS.get(k);
  const out = [];
  const tokens = lexJs(code, file);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'name') {
      if (REJECTED_NAMES.includes(t.value)) out.push({ rule: 'ISO-13', at: t.start, text: 'the REJECTED hosted-pane name `' + t.value + '`' });
      if (t.value === 'srcdoc') out.push({ rule: 'ISO-14', at: t.start, text: 'script names `srcdoc` (a document inside the shell)' });
      continue;
    }
    if (t.type !== 'string' && t.type !== 'template') continue;
    const inner = (t.type === 'template' ? t.value : code.slice(t.start, t.end)).slice(1, -1);
    const created = i >= 2 && tokens[i - 1].value === '(' && /^createElement(NS)?$/.test(tokens[i - 2].value || '');
    if (inner.startsWith(REJECTED_PREFIX)) out.push({ rule: 'ISO-13', at: t.start, text: 'the REJECTED hosted-pane verb `' + inner.slice(0, 40) + '`' });
    if (EMBED_TAG_RE.test(inner) || (created && EMBED_WORD_RE.test(inner))) out.push({ rule: 'ISO-14', at: t.start, text: 'script builds an embedded document: `' + inner.slice(0, 40) + '`' });
  }
  HITS.set(k, out);
  return out;
}
/** the shells the HTML walker refuses because they hold an embedding element */
function embedRefusals(root) {
  const out = [];
  const { map } = shellMap(root);
  for (const [src, built] of [...map].sort()) {
    for (const rel of ['src/shells/' + src, BUILT_DIR + '/' + built]) {
      if (!existsSync(join(root, rel))) continue;
      try { walkCached(read(root, rel), rel); } catch (e) {
        const m = /:(\d+) — a <(iframe|frame|frameset|object|embed|portal|webview|fencedframe)\b/i.exec(e.message);
        if (!m) throw e;
        out.push({ file: rel, line: Number(m[1]), text: 'the shell embeds a document: `<' + m[2] + '>` (the HTML walker refuses it)' });
      }
    }
  }
  return out;
}

/** every file the two checks read, relative to root (a pin copies exactly these into a temp tree) */
export function inputs(root) {
  return [
    ...listFiles(root, 'Spixi', (n) => n.endsWith('.cs') || n.endsWith('.xaml')),
    ...listFiles(root, BUILT_DIR, (n) => n.endsWith('.html')).filter((r) => r.split('/').length === BUILT_DIR.split('/').length + 1),
    BUILT_BUNDLE,
    ...listFiles(root, 'src/shells', (n) => n.endsWith('.html')),
    ...bundleFiles(root),
    'scripts/build-demo-bundle.mjs', 'scripts/build-shells.mjs', GATE_DOC, CONTRACT_FILE,
  ].filter((r, i, a) => a.indexOf(r) === i).sort();
}

export async function check(root) {
  const findings = [];
  const seen = {};
  const F = (rule, file, line, text) => findings.push({ rule, file, line, text });
  try {
    const census = readCensus(root);
    /* ISO-14 first: the HTML walker refuses a shell that embeds a document (it does not model one), and everything
     * below reads the shells through it — so such a shell is reported as ISO-14 here and the rest does not run */
    const refused = embedRefusals(root);
    if (refused.length) { for (const r of refused) F('ISO-14', r.file, r.line, r.text); return { ok: false, findings, seen: { refusedShells: refused.length } }; }
    const an = await analyze(root, { guardTokens: [...SETTING_PROPS, ...SETTING_CALLS, ...SCRIPT_CALLS, ...LOAD_CALLS, ...REJECTED_NAMES, 'loadPage', 'generatePage', 'WebViewSource', 'HybridWebView', 'ClassId'] });
    const { model, verbs, js } = an;
    for (const c of [BASE_PAGE, CHAT_PAGE, MINIAPP_PAGE]) if (!model.classes.has(c)) throw new ReadError('class ' + c + ' not found in Spixi/**.cs');
    const isPage = (c) => c !== BASE_PAGE && model.isA(c, BASE_PAGE);
    const pages = [...model.classes.keys()].filter(isPage).sort();
    seen.csFiles = model.files.length;
    seen.pages = pages.length;

    /* the web view types: MAUI's two, and every class of the tree whose base is one of them (by its written name) */
    const webTypes = new Set(['WebView', 'HybridWebView']);
    for (let grew = true; grew;) {
      grew = false;
      for (const [name, decls] of model.classes) {
        if (webTypes.has(name)) continue;
        if (decls.some((d) => d.baseFull.some((b) => MAUI_WEBVIEW_BASES.has(b) || webTypes.has(b)))) { webTypes.add(name); grew = true; }
      }
    }
    const xaml = readXaml(root, webTypes);
    const xamlViewNames = new Set();
    for (const x of xaml) for (const v of x.views) if (v.attrs['x:Name']) xamlViewNames.add(v.attrs['x:Name']);

    /* ── ISO-1 … ISO-4: loads and sources ── */
    const loads = [], sources = [], platformViews = [], scripts = [], settings = [], markerWrites = [], rejected = [], wrappers = [];
    const facts = [];
    for (const f of model.files) {
      const x = perTree(f.tree, 'isolation-facts', () => fileFacts(f));
      facts.push({ f, x });
      const add = (list, items) => { for (const it of items) list.push({ file: f.rel, ...it }); };
      add(sources, x.sources); add(scripts, x.scripts); add(settings, x.settings); add(markerWrites, x.markerWrites); add(rejected, x.rejected);
      for (const l of x.loads) (l.arg === null && l.param >= 0 ? wrappers : loads).push({ file: f.rel, ...l });
      const webNames = new Set([...xamlViewNames, ...x.typed.filter((t) => webTypes.has(t.type)).map((t) => t.name)]);
      for (const ss of x.sourceSets) {
        if (ss.init || webNames.has(ss.recv) || /web_?view|^wv$/i.test(ss.recv)) sources.push({ file: f.rel, line: ss.line, at: ss.at, what: ss.what });
      }
      for (const n of x.news) {
        if (webTypes.has(n.type) && !/^Android\.Webkit\./.test(n.full)) platformViews.push({ file: f.rel, line: n.line, at: n.at, what: n.type });
        else if (PLATFORM_VIEW_RE.test(n.full)) platformViews.push({ file: f.rel, line: n.line, at: n.at, what: n.type });
      }
    }
    /* a wrapper: a method whose parameter flows into loadPage — each call of it with a literal at that position is a load
     * of the CALLER's page (one level; a wrapper called with a computed value is a computed load, ISO-3) */
    for (const w of wrappers) {
      for (const { f } of facts) {
        if (!f.src.includes(w.member)) continue;
        for (const inv of desc(f.tree.rootNode, 'invocation_expression')) {
          const c = callee(inv);
          if (c.name !== w.member) continue;
          const callerCls = typeName(memberOf(inv).type);
          const recvLast = idents(c.recv).pop() || '';
          const reaches = (!c.recv || c.recv === 'this' || c.recv === 'base') ? model.lineage(callerCls).includes(w.cls) : recvLast === w.cls;
          if (!reaches) continue;
          const arg = argNodes(inv)[w.param];
          const lit = arg ? firstLit(arg) : null;
          loads.push({ file: f.rel, line: ln(inv), cls: callerCls, at: where(inv) + ' via ' + w.cls + '.' + w.member, arg: lit, argText: arg ? norm(arg.text) : '' });
        }
      }
    }
    seen.loads = loads.length;
    const builtShells = new Set(listFiles(root, BUILT_DIR, (n) => n.endsWith('.html')).map((r) => r.slice(BUILT_DIR.length + 1)));
    const shellOutputs = new Set(shellMap(root).map.values());
    const shellsOf = new Map(), pagesOf = new Map();
    for (const l of loads) {
      const shown = l.arg === null ? '<' + l.argText + '>' : l.arg;
      if (l.cls === CHAT_PAGE) { if (l.arg !== CHAT_SHELL) F('ISO-1', l.file, l.line, 'the chat page loads ' + shown + ' into its WebView (only ' + CHAT_SHELL + ' may live there; ' + l.at + ')'); continue; }
      if (l.arg === CHAT_SHELL) { F('ISO-2', l.file, l.line, l.cls + ' loads ' + CHAT_SHELL + ' (only ' + CHAT_PAGE + ' may host the chat document; ' + l.at + ')'); continue; }
      if (l.cls === MINIAPP_PAGE) { F('ISO-4', l.file, l.line, 'the mini-app page loads the trusted shell ' + shown + ' (its WebView holds untrusted content only)'); continue; }
      if (l.cls === BASE_PAGE) { F('ISO-3', l.file, l.line, 'the shared base loads ' + shown + ' itself (' + l.at + ') — every page would show it'); continue; }
      if (l.arg === null) { F('ISO-3', l.file, l.line, l.at + ' loads a computed document ' + shown + ' — a page loads one literal shell'); continue; }
      if (!shellOutputs.has(l.arg) || !builtShells.has(l.arg)) { F('ISO-3', l.file, l.line, l.at + ' loads ' + l.arg + ', which is not a built shell of the SHELLS table (scripts/build-shells.mjs)'); continue; }
      if (!shellsOf.has(l.cls)) shellsOf.set(l.cls, new Map());
      if (!shellsOf.get(l.cls).has(l.arg)) shellsOf.get(l.cls).set(l.arg, l);
      if (!pagesOf.has(l.arg)) pagesOf.set(l.arg, new Map());
      if (!pagesOf.get(l.arg).has(l.cls)) pagesOf.get(l.arg).set(l.cls, l);
    }
    for (const [cls, m] of shellsOf) if (m.size > 1) { const l = [...m.values()][1]; F('ISO-3', l.file, l.line, cls + ' loads ' + m.size + ' shells (' + [...m.keys()].sort().join(', ') + ') — one page, one shell'); }
    for (const [shell, m] of pagesOf) if (m.size > 1) { const l = [...m.values()][1]; F('ISO-3', l.file, l.line, shell + ' is loaded by ' + m.size + ' pages (' + [...m.keys()].sort().join(', ') + ') — one shell, one page handler'); }
    seen.shellPages = pagesOf.size;
    againstList(sources, SOURCES, 'ISO-4', 'a WebView content source', findings);
    for (const x of xaml) for (const src of x.sources) F('ISO-4', src.file, src.line, 'XAML sets a web view document: ' + src.text + ' — a page loads its shell through loadPage');

    /* ── ISO-5 / ISO-6: the XAML WebViews ── */
    seen.xamlWebViews = 0;
    const markerSeen = new Set();
    for (const x of xaml) {
      seen.xamlWebViews += x.views.length;
      settings.push(...x.settings);
      if (!x.views.length) continue;
      if (!x.cls || !model.classes.has(x.cls) || !isPage(x.cls)) F('ISO-6', x.rel, x.views[0].line, 'a <' + x.views[0].type + '> in a XAML whose class (' + (x.cls || 'none') + ') is not a page — a pane must be a page with its own WebView');
      if (x.views.length > 1) F('ISO-6', x.rel, x.views[1].line, x.views.length + ' web view elements in one page (' + x.views.map((v) => v.type).join(', ') + ') — one page, one WebView');
      if (x.views.some((v) => v.type !== 'WebView')) { const v = x.views.find((y) => y.type !== 'WebView'); F('ISO-6', x.rel, v.line, 'a <' + v.type + '> — the platform handlers, the markers and the bridge know the MAUI WebView only'); }
      for (const v of x.views) {
        const want = MARKERS[x.rel] ? MARKERS[x.rel].value : undefined;
        const got = v.attrs.ClassId;
        if (got !== want) F('ISO-5', x.rel, v.line, '<' + v.type + ' ClassId="' + (got === undefined ? '' : got) + '"> — the listed marker is ' + (want === undefined ? 'none' : '"' + want + '"'));
        if (want !== undefined) markerSeen.add(x.rel);
      }
    }
    for (const rel of Object.keys(MARKERS)) if (!markerSeen.has(rel)) F('ISO-5', rel, 1, 'the listed marker "' + MARKERS[rel].value + '" is on no web view element of ' + rel);
    for (const w of markerWrites) F('ISO-5', w.file, w.line, 'C# writes the WebView marker: `' + w.text.slice(0, 120) + '` (the marker is set once, in XAML)');
    againstList(platformViews, PLATFORM_VIEWS, 'ISO-6', 'a web view built in code', findings);

    /* ── ISO-7 / ISO-8 / ISO-9: verbs, by the bridge contract ── */
    seen.verbs = verbs.size;
    for (const v of [...verbs.keys()].sort()) {
      const r = verbs.get(v);
      const hs = [...r.handlers.values()];
      if (r.senders.size === 1 && r.senders.has(CHAT_SHELL)) {
        for (const h of hs) {
          if (h.cls === CHAT_PAGE || h.cls === BASE_PAGE) continue;
          if (CHAT_ONLY_ELSEWHERE.some((e) => e.verb === v && e.cls === h.cls)) continue;
          F('ISO-7', h.file, h.line, 'the chat-only verb `ixian:' + v + '` is tested in ' + h.cls + '.' + h.member + ' — a verb only the chat document sends belongs to the chat page');
        }
      }
      for (const h of hs) {
        if (h.cls === CHAT_PAGE || h.cls === BASE_PAGE) {
          for (const m of h.cls === BASE_PAGE ? ['money', 'keys', 'path'] : ['money', 'keys']) {
            if (!h.marks.has(m)) continue;
            if (RISKY_IN_CHAT_OR_BASE.some((e) => e.verb === v && e.cls === h.cls && e.mark === m)) continue;
            F('ISO-8', h.file, h.line, 'the ' + m + ' verb `ixian:' + v + '` is answered in ' + h.cls + '.' + h.member + ' (' + h.why.get(m) + ') — reachable from the chat WebView' + (h.cls === BASE_PAGE ? ' and the mini-app WebView' : '') + ', and not listed');
          }
        }
        if (h.cls === BASE_PAGE && !BASE_VERBS.some((e) => e.verb === v)) F('ISO-9', h.file, h.line, 'the shared base answers `ixian:' + v + '` (' + h.member + ') — every WebView reaches it, the mini-app one too; not in BASE_VERBS');
        if (h.cls === MINIAPP_PAGE) {
          const e = MINIAPP_VERBS.find((x) => x.verb === v);
          if (!e) { F('ISO-9', h.file, h.line, 'the mini-app page answers `ixian:' + v + '` (' + h.member + ') — not in the SpixiAppSdk list'); continue; }
          for (const m of h.marks) if (!e.marks.includes(m)) F('ISO-9', h.file, h.line, 'the mini-app verb `ixian:' + v + '` now reaches ' + m + ' (' + h.why.get(m) + ')');
        }
      }
    }

    /* ── ISO-10 / ISO-11: the settings census ── */
    seen.settings = settings.length;
    seen.censusRows = census.length;
    const used = new Set();
    for (const s of settings) {
      const i = census.findIndex((c) => c.setting === s.setting && c.file === s.file && c.value === s.value);
      if (i < 0) F('ISO-10', s.file, s.line, 'WebView setting `' + s.setting + '` = `' + s.value + '` has no row in the census of ' + GATE_DOC);
      else used.add(i);
    }
    census.forEach((c, i) => { if (!used.has(i)) F('ISO-11', GATE_DOC, c.line, 'census row `' + c.setting + '` · ' + c.file + ' · `' + c.value + '` names no site in the code'); });

    /* ── ISO-12: script into a WebView ── */
    seen.scriptSites = scripts.length;
    againstList(scripts, SCRIPT_HOMES, 'ISO-12', 'script run in a WebView', findings);

    /* ── ISO-13 / ISO-14 / ISO-15: the JS and the shells ── */
    for (const x of rejected) F('ISO-13', x.file, x.line, 'the REJECTED hosted-pane name `' + x.text + '` (SECURITY.md § 1, DECISIONS #220)');
    const jsUnits = [];
    for (const f of js.files) jsUnits.push({ file: f, code: read(root, f), offset: () => 0 });
    jsUnits.push({ file: BUILT_BUNDLE, code: read(root, BUILT_BUNDLE), offset: () => 0 });
    for (const h of shellDocs(root)) {
      const w = walkCached(h.html, h.file);
      for (const m of w.markupHits) F('ISO-14', h.file, lineAt(h.html, m.at), 'the shell embeds a document: `' + m.text + '`');
      for (const sc of w.scripts) jsUnits.push({ file: h.file, code: sc.code, offset: () => lineAt(h.html, sc.start) - 1 });
    }
    for (const u of jsUnits) {
      for (const hit of jsHits(u.code, u.file)) F(hit.rule, u.file, u.offset() + lineAt(u.code, hit.at), hit.text);
    }
    const key = (e) => (e.verb ? e.verb : e.shape);
    const firstOf = (emits, k) => emits.find((e) => key(e) === k);
    const drift = (builtFile, builtText, builtEmits, srcs) => {
      const bk = new Set(builtEmits.map(key)), sk = new Map();
      for (const s0 of srcs) for (const e of s0.emits) if (!sk.has(key(e))) sk.set(key(e), { ...s0, e });
      for (const k of [...bk].filter((x) => !sk.has(x)).sort()) F('ISO-15', builtFile, lineAt(builtText, firstOf(builtEmits, k).at), 'the built file emits `' + k + '`, which its source does not (rebuild)');
      for (const k of [...sk.keys()].filter((x) => !bk.has(x)).sort()) { const s0 = sk.get(k); F('ISO-15', s0.file, lineAt(s0.text, s0.e.at), 'the source emits `' + k + '`, which the built ' + builtFile + ' does not (rebuild)'); }
    };
    for (const [, s0] of js.shells) {
      const bf = BUILT_DIR + '/' + s0.out, bt = read(root, bf);
      drift(bf, bt, inlineFacts(bt, bf).emits, [{ file: s0.rel, text: read(root, s0.rel), emits: s0.emits }]);
    }
    const bundleText = read(root, BUILT_BUNDLE);
    drift(BUILT_BUNDLE, bundleText, jsFacts(bundleText, BUILT_BUNDLE).emits, [...js.comp].map(([f, c]) => ({ file: f, text: read(root, f), emits: c.emits })));
    seen.shells = js.shells.size;
  } catch (e) {
    if (e instanceof ReadError) return { ok: false, findings, seen, error: e.message };
    throw e;
  }
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  findings.sort((a, b) => (Number(a.rule.slice(4)) - Number(b.rule.slice(4))) || cmp(a.file, b.file) || a.line - b.line || cmp(a.text, b.text));
  return { ok: findings.length === 0, findings, seen };
}

async function main(argv) {
  let root = fileURLToPath(new URL('../..', import.meta.url));
  const a = [...argv];
  const ri = a.indexOf('--root');
  if (ri >= 0) { root = a[ri + 1]; a.splice(ri, 2); }
  if (!existsSync(root)) { console.error('isolation-check: CANNOT READ — no such root ' + root); return 2; }
  const res = await check(root);
  if (a.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    for (const f of res.findings) console.log(f.rule + '  ' + f.file + (f.line ? ':' + f.line : '') + '  ' + f.text);
    if (res.error) console.log('isolation-check: CANNOT READ — ' + res.error);
    else console.log('isolation-check: ' + (res.ok ? 'OK' : 'FAIL — ' + res.findings.length + ' finding(s)') + ' · ' + Object.entries(res.seen).map(([k, v]) => k + '=' + v).join(' '));
  }
  return res.error ? 2 : res.ok ? 0 : 1;
}

const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) process.exitCode = await main(process.argv.slice(2));
