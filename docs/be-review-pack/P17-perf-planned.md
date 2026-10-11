# P17 · PERF-PLANNED · Planned performance levers with a security surface (nothing built)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — #8 would put the wallet pane in one JS context with home (peer names / previews); option B moves the payment list out of chat info | yes — a new media URL channel, a new https shell origin, reshaped chat-info verbs | planned (flagged when built) | 6 min |

**Look here first:** `Spixi/Platforms/Android/WebViewRenderer.cs:126` — `ShouldInterceptRequest`, the one hook that #1 (media by URL) and #6 (https shells) would extend. Today it passes every non-http(s) URL and blocks every http(s) URL except https tenor / giphy / apps.spixi.io (`Spixi/Utils/Utils.cs:857`). A new `appassets` branch here decides which bytes on disk any WebView, chat included, can pull.

**DECISIONS:** #1310 · #1312 · #220 · #1303 · #1313 (MAJOR #8 rides with #6) · proposed #1314–#1319 (the research's #1313–#1318 renumbered +1; not yet in DECISIONS.md)

## What changed and why
Nothing is built and Damir has not picked: this is the BE preview of the levers from the session-16 perf research that touch security; goal peak < 500 MB with the SAME security (#1310). No `SpixiFlags` class, flag or `[FLAGS]` line exists in the tree yet.
Each picked lever would ship behind a `SpixiFlags` switch with today's path as the fallback, a security-only #46 at high effort, one packet and a gate row; BE reviews all packets once at handover (#1312); a flag-on run logs one `[FLAGS]` line at start (proposed #1314). Ixian-Core asks are on the Core-asks page (BE-only, #1312 (A)).

## Files (verified at 387ca78b) — today's anchors the levers would change
- `Spixi/Platforms/Android/WebViewRenderer.cs:126` — `ShouldInterceptRequest(view, request)`; `view` names the asking WebView, which "serve only the owner" needs (#1312).
- `Spixi/Platforms/Android/WebViewRenderer.cs:450` / `:451` — `AllowFileAccess` + `AllowFileAccessFromFileURLs` = true for EVERY WebView, mini-apps included (legacy, baseline `:356-357`). #6 turns them off only with its flag on (#1312).
- `Spixi/Platforms/Android/SPlatformUtils.cs:29` + `WebViewRenderer.cs:289` — shells load from `file:///android_asset/` → no V8 code cache (#1310).
- `Spixi/MauiProgram.cs:47` — one compat renderer for every Android WebView; all WebViews share ONE renderer process (legacy). #5 adds a `chat` Profile.
- `Spixi/Platforms/Windows/WindowsWebViewHandler.cs:39` — WebView2 `WebResourceRequested` exists (IsAllowedURL block). iOS / Mac have no `WKURLSchemeHandler` (`iOSWebViewHandler.cs:44` DecidePolicy only).
- data: URI producers #1 replaces: `Pages/Chat/SingleChatPage.xaml.cs:3118`, `:7270`, `:7861` · `Utils/SharedItems.cs:188`, `:210` · `Utils/ViewerImage.cs:118` · `Utils/S11MediaRules.cs:355` · `Utils/Utils.cs:175` (all base64 again under O-11 (#1303)).
- `Spixi/Pages/Contacts/ContactDetails.xaml.cs:1222` `addPaymentActivity` · `:1107` `txdetails` · `:547` `removecontact` · `:599` `removehistory` · `:1120` `userdefinednick` — what option B strips.
- `Spixi/Spixi.csproj:145` — iOS `UseInterpreter=true` (lever #10, neutral; reason = BE ask).

## Bridge surface (every row PLANNED — nothing in the tree)
| Verb / push / channel | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| GET `https://appassets.androidplatform.net/m/<id>?w=<px>` · iOS/Mac `spixi-media://` · Win `WebResourceRequested` | `<id from C#'s own table>`, `<int px>` | any document in the asking WebView: `chat.html` (SingleChatPage), `contact_details.html` (ContactDetails), `index.html` (HomePage) — all render untrusted content | `WebViewRenderer.cs:126` (to extend) | planned · new channel (#1) |
| pushes `setFileThumb` · `viewerImage` · `setSharedItems` · `setAvatarFor` | a URL instead of a `data:` URI | C# → owning page | `SingleChatPage.xaml.cs:7231`, `:7649` · `ContactDetails.xaml.cs:771`, `:654` · `HomePage.xaml.cs:3821` | planned · reshaped (#1) |
| media-miss verb (name not set) → C# re-pushes the data: URI | `<id>` | the shell whose image failed | not designed | planned (#1 fallback) |
| shells served at `https://appassets.androidplatform.net/` (WebViewAssetLoader) | — | every shell; mini-apps stay `file://` (`MiniAppPage.xaml.cs:65`) | new loader | planned · new origin (#6) |
| "drop decoded images" push (name not set) | none | C# → every shell on `OnTrimMemory(UI_HIDDEN/BACKGROUND)` | not designed | planned (#3) |
| `ixian:editnick` (native prompt) · "open payments" (no payload, name not set) · NATIVE confirm on `removecontact` / `removehistory` / `kick` / `ban` / `leave` · `txdetails` removed or peer-locked · `addPaymentActivity` removed | no payload | `contact_details.html` in the pooled chat-info WebView (untrusted) | `ContactDetails.xaml.cs` (old verbs answered beside the new until BE's yes) | planned · reshaped (option B) |

## Flags (PLANNED, proposed #1315 — none exists in the tree)
| Lever | Flag | Fallback (flag off = today) |
|---|---|---|
| #1 media origin | `MediaOrigin` | data: URIs; per image a handler miss → the shell asks again → C# pushes the data: URI |
| #3 trim on Android 14+ | `TrimHidden` | today's `Node.onLowMemory` only |
| #5 chat renderer profile | `ChatProfile` | default profile; run-time fallback when `MULTI_PROFILE` is absent |
| #6 https asset origin | `AssetOrigin` | `file:///android_asset/`; `AllowFileAccess` off only with the flag on |
| #7 pooled chat-info WebView | `PoolChatInfo` | a new WebView per open; shell RE-LOADED on each reuse |
| option B stripped chat info | `StrippedChatInfo`, then `ChatInfoInChat` | today's verbs and sheets |
| #8 trusted host | `TrustedHost` | today's shells (needs Damir's architecture yes first) |

## Threat → rule → proof
| A hostile … could try … | What stops it (planned rule) | Proof |
|---|---|---|
| message with script in `chat.html` requests `/m/<another chat's id>` or `/m/../wallet.ixi` | C# resolves ids from its own table only, never a path; answers only the `view` that owns the id; `Cache-Control: no-store` | no proof — pin owed at build |
| message with injected `<img>` markup (no script) probes ids | ids must be unguessable per-WebView tokens, not message ids (our recommendation; not in the research) | no proof |
| renderer exploit in chat reads the wallet pane's memory (one shared renderer, legacy) | #5 `chat` Profile = own renderer process; iOS/Mac own `WKWebsiteDataStore` | no proof — device check |
| chat script uses chat-info verbs (rename peer, wipe history, read payments) | #7 keeps chat info in its own WebView (merge rejected, proposed #1318); option B native confirms | no proof |
| mini-app (`file://`) XHR-reads `wallet.ixi` (legacy MAJOR #8: file access on for every WebView) | NOT closed by #6 as researched — mini-apps keep `file://` and file access; #1313 (Damir) asks #6 to remove it from mini-apps too (planned) | no proof — open; ours to fix since #1313 |

## Given up / left open
- #8 vs SECURITY.md §1: home renders untrusted names / previews (#1310), so a host with home + wallet is a §1 question, not only perf; #220 rejected a single host incl. chat.
- With #6, all shells share one https origin (same as `file://` today); the mini-app must never join it.
- Each flag carries two paths until BE's yes (#1312 (1)); "flag off = today, byte for byte" only a walk proves.

## Question for BE
Do you accept the media handler rule — C# serves only ids from a table it filled for that WebView, never a path, `no-store`, data: URIs kept as the fallback for one release — as the replacement for base64 images (yes / no)?
