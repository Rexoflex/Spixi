# P113 · CHAT PICTURES BY A LOCAL LINK THAT C# SERVES — THE HANDLER AND THE GRANT TABLE (batch imgurl, item 1a)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM–HIGH (a new resource path in every shell WebView on three platforms; a new scheme handler on iPhone / Mac) | none | **none**: the link rides the existing `setFileThumb` / `viewerImage` pushes as another value (the page and shell half: § Page half below; the shell half and the keeper: P114) | `ImgurlFlags.MediaOrigin` (`flagMediaOrigin`, absent = ON; a stored 0 acts only in dev mode). OFF = no server, no scheme handler, no link: the `data:` values of the base | 8 min |

**Look here first:** `Spixi/Utils/MediaGrants.cs` (pure, 197 lines, run by csh `MediaGrantsTests`, 33 tests): `grant` and
`tryServe`. Then the three request handlers, each a few lines BEFORE the existing URL gate: Android
`Platforms/Android/WebViewRenderer.cs` `SpixiWebViewClient.ShouldInterceptRequest` → `mediaResponse`; Windows
`Platforms/Windows/WindowsWebViewHandler.cs` `CoreWebView2_WebResourceRequested` → `answerMedia`; iPhone / Mac
`Platforms/iOS/MediaSchemeHandler.cs` (new) installed by `iOSWebViewHandler.createMediaView`. **DECISIONS:** #1642 (Damir: the design
rule), the research conditions of P-25, #1312 / #1478 (own switch, the old path = the fallback).

## What changes
- Today a chat thumbnail (≤ 64 KB JPEG) and the viewer picture (≤ 1.2 MB JPEG) cross the bridge as base64 `data:` text. With the
  switch ON the page gives C#'s OWN re-encoded JPEG bytes to `MediaGrants.grant(webView, document, kind, id, px, bytes)` and pushes
  the URL it returns: `https://spixi-media.invalid/m/<32 hex>` (Android, Windows) or `spixi-media://m/<32 hex>` (iPhone, Mac).
- The WebView asks for that URL; the handler of THAT WebView answers the bytes (`image/jpeg`, `Cache-Control: no-store`,
  `X-Content-Type-Options: nosniff`) or a 404. It never falls through to the base handler, the URL gate or the network.
- iPhone / Mac: a shell's WKWebView is built from MAUI's own configuration plus the scheme handler (the pattern of the mini-app
  view). Its content rule list gets ONE more exception: `^spixi-media://m/[0-9a-f]+$`, case-sensitive, on the anchored list only.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| ★ One pane reads another pane's picture (chat ↔ wallet ↔ a mini app) | a grant lives in the table of ONE WebView (`ConditionalWeakTable`, keys by reference); each handler passes its OWN element as the owner; a token is 16 random bytes (`RandomNumberGenerator`) | csh `owner_another_webview_cannot_serve_the_token`, `owner_is_compared_by_reference_not_by_equals`, `threads_…`; pin a3 / w3 / i8 (the owner each handler passes) |
| A mini app gets the path | `serverUp` only under `MediaGrants.hostOk(ClassId)`; iOS installs the scheme handler only for `isTrustedHost()`; no server = 404. With the switch ON a mini app's request for the media host gets that 404 on Android / Windows, where the base gave the block response (the empty response / 403): both are local answers, nothing is served | csh `miniapp_never_gets_a_server`; pin a5 / w6 / i2 / i4, g3 (no other caller) |
| The WebView names a path, a file or a host | the grammar is the prefix + exactly 32 lower-case hex + the end; the bytes are the array given to `grant` — no file API in the class or the handlers | csh the five `grammar_*` tests; pin g2, a2, w2, i9 |
| The media host reaches the network or the old gate | the media branch stands first and always returns a response (Windows: inside one `try`, the environment lookup, then the 404 FIRST, then a hit replaces it; with no environment no response can be set); `.invalid` resolves nowhere; a custom scheme has no network | pin a1, a2, a4, w1, w2, w4, i9 |
| A picture outlives its document, page or WebView | `beginDocument` / `revokeOwner` / `serverDown` drop the grants; an owner that is collected takes them along; `no-store` | csh `document_*`, `server_down_revokes_everything`, `owner_is_not_kept_alive_by_the_table`; pin a6, w7, i5 |
| Memory grows without bound | per WebView: 512 thumbnails and 16 MB of them, ONE viewer picture (a new one revokes the old), per picture 64 KB / 1.2 MB; over = `null` = the `data:` value | csh the five `caps_*` tests; pin g5 (the bounds equal the producers') |
| The WebView decodes bytes that are not ours | `grant` takes only bytes that start as a JPEG (`FF D8 FF`), served as `image/jpeg` + `nosniff`; the callers pass C#'s re-encoded JPEG | csh `input_bad_values_grant_nothing`; the page half |
| A token, an id or a path in a log | no log line in `MediaGrants`, the scheme handler or the media members | csh `token_is_random_32_lower_hex_and_says_nothing`; pin g1 |
| iOS: the new rule opens a host | anchored at both ends to the custom scheme; never added to the unanchored fallback list. If the list WITH the exception does not compile: the media server of that WebView is taken down (`mediaRuleLost`) and the PLAIN anchored list is compiled under the base name `ContentBlockingRules`, with its own unanchored fallback rung; one error line says so (fixed words + WebKit's compile reason, as the two existing rungs) — a failed media rule never costs a shell its anchoring | pin i6 |
| The iOS view cannot be built | any throw → `base.CreatePlatformView()`, no server, the chat keeps `data:` | pin i1, i3 |

**OFF:** `serverUp` makes no server, `grant` is `null`, `tryServe` is `false`, iOS builds MAUI's own view with the base rule list
(csh `switch_off_*`). With the switch OFF the media branch is skipped too: the media host meets the base URL gate (Android: the empty block response; Windows: 403), exactly as before; iOS builds no scheme handler.
**Stage 2 deletes:** the switch reads in `MediaGrants` and `createMediaView`; the off rows of the csh tests and of pin a.
**Known:** a same-key grant with OTHER bytes revokes the old URL (a URL names one byte sequence).
- The same key with other bytes AT the byte or count cap: the old URL is revoked and the answer is `null` (the caller pushes the `data:` value of the new bytes; the old tile's URL answers 404 until that push lands).
- Android: a renderer's `Dispose` takes its element's server down. A renderer disposed late, after a new renderer took the same element, takes the new one's server too: the chat falls back to `data:`, URLs already pushed answer 404 until the next document.
- 512 thumbnails per document and WebView, no eviction: thumbnail 513 and later ride the `data:` path until the next document.
- Android dev builds (`SPIXI_DEV_COEXIST`): the console mirror logs a source that starts with the media host as the word `media`, so a 404's URL (with its token) does not reach `ixian.log` (pin a7). Store builds have no mirror.
- Windows: the response needs a `CoreWebView2Environment` (the sender's, else the platform view's). With neither the request goes on to the network, where `.invalid` resolves nowhere.
⚠ C# UNCOMPILED: `WebViewRenderer.cs`, `iOSWebViewHandler.cs`, `MediaSchemeHandler.cs` (Windows: compiled by CI). Source pin
`scripts/pins-imgurl/a-handler.mjs` (30 rows; its limits are its first lines). Not proven before the walk: that each engine
routes an `<img>` of the URL to the handler, and that WebKit's rule list lets the scheme through.

## Page half (the chat page: when a link is pushed, which bytes, how long a grant lives)

**Look here first (page):** `SingleChatPage.MediaOrigin.cs` — `mediaUrlFor(doc)` (switch · `MediaGrants.serving(_webView)` ·
`mediaUrlDoc == doc`, the document whose `setCaps` carried `mediaOrigin`), `mediaThumbValue` / `viewerValueAsync` (grant, else
`MediaPushRules.valueOf` = the data: URI of the same bytes), `chatThumbJpeg` (chatThumbFor's order in bytes: cap + sniff →
LRU → miss mark → store → decode; memory / disk kept only through `ChatMediaStore.ifCurrentThumb` and the same-version check),
`mediaBeginDocument` / `mediaRevoke` (the document and the teardown), `mediaOriginCaps`. Call sites in `SingleChatPage.xaml.cs`:
`processThumb` and `onViewImage` (one ternary each; the OFF branch is the old call), `mediaBeginDocument();` after `thumbDoc++`,
`caps += mediaOriginCaps();` after the Photo1bChatCaps line, `mediaRevoke();` beside `dropMediaBatch()` in `OnDisappearing`.

| What could go wrong | What stops it | Proof |
|---|---|---|
| A URL reaches a shell that does not accept it (no cap) → no picture | the URL path needs THIS document's `mediaOrigin` cap (`mediaUrlDoc == doc`), recorded when the caps text is built | csh `MediaPushTests.url_path_needs_this_documents_caps`; pin b `b2`, `b7` |
| A grant outlives its document or page | `beginDocument` right after `thumbDoc++`; `revokeOwner` at the teardown; 1a's `serverDown` at the handler's disconnect covers a Dispose that does not pass `OnDisappearing` (a dropped spare, an abandoned preload) | pin b `b5`, `b6`; MediaGrantsTests (1a) |
| The URL path decodes a file the data: path would refuse | the same 20 MB cap and 16-byte sniff before any cache or decode; one bounded decoder call | pin b `b4` |
| A refused grant costs a second decode | `valueOf(null, bytes)` builds the data: URI from the bytes in hand | csh `value_without_a_grant_is_the_data_uri_of_the_same_bytes` |
| Switch OFF changes the base | the OFF branch of each ternary is the base call; the page with the five statements reverted hashes to the base | pin b `b8`; csh `switch_off_is_the_base` |
