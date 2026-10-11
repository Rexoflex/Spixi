# P16 · SPARE · The warm chat spare, the parked Account, in-shell Account sublevels

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — the Change-password form lives in the parked Account WebView (scrubbed on every leave) | no | shipped | 6 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:214` — `attach` throws if the page already holds a conversation: the one rule that keeps peer A's DOM / JS / draft out of peer B's chat (a spare is used once, then disposed with its chat).

**DECISIONS:** #220 · #315 · #341 · #546 · #780 · #800 · #802 · #804 · #805 · #1132 · #1133 · #1311 · #1312

## What changed and why
A blank `SingleChatPage` (own WebView, no friend) is staged hidden in HomePage's grid; a tap attaches the friend and presents it, saving the WebView boot (#780, #800, loop #802). Desktop wide windows keep a second one beside an open chat, and a still-booting spare may be taken (#1132, #1133).
The mobile Account (`SettingsPage`) is PARKED hidden on close instead of disposed, and is warmed once 900 ms after the first chats paint (#315, #546).
Backup, Downloads and Change password render inside the Account's own WebView on every form factor, so no extra page boots; the password form is scrubbed on every leave (#804, #341).
There is no chat-info / contact-details reuse today: every chat info is a fresh WebView; a pooled chat-info WebView is a PLANNED lever only (#1312).

## Files (verified at 387ca78b)
- `Spixi/Utils/SpixiContentPage.cs:1756` — `warmSpareChat`; refuses on a lock shown in place (`:1763`), a non-host top page, a reservation, an open chat (#800).
- `Spixi/Utils/SpixiContentPage.cs:1984` — `pushSpareChat` refuses the take under a lock; every refusal drops the spare (#800).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:418` — a blank page drops every verb except `ixian:onload` and its own `file:` load; shared verbs gated on `friend != null` (`:395`) (#800).
- `Spixi/Utils/UIHelpers.cs:279` — the live-pages enumerator skips a friend-less chat, so no push reaches the spare (#800).
- `Spixi/Utils/SpixiContentPage.cs:1537` — `representParkedOverlay` refuses while a lock is shown in place (#315).
- `Spixi/Utils/UIHelpers.cs:489` / `:540` — the theme push drops the spare and disposes the parked Account (#800, #315).
- `Spixi/Meta/Node.cs:1019` / `:1022` — low memory disposes the parked Account and drops the spare; `App.xaml.cs:1369` drops the spare on sleep (every platform but Windows) (#315, #800).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:1488` — delete account disposes the parked Account after the pop (old nick / avatar / address) (#315).

## Bridge surface
None new — C#-only lifecycle. The blank spare raises only `ixian:onload`; the re-presented Account gets `onRepresented` (listed in P14). #804 removed three emits from the current shells; their C# handlers stay as the legacy fallback (`ixian:backup` · `ixian:downloads` · `ixian:encpass` at `SettingsPage.xaml.cs:631` · `:645` · `:497`).

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| peer A's content or JS state shows in peer B's chat through the spare | one conversation per WebView (`SingleChatPage.xaml.cs:214`); drafts keyed by peer address (`src/shells/chat.html:8351`) | smoke `★★ Session P L1·3 (spec §5.3)` · `★ Session P L1·6 pair` |
| a peer push or a verb lands in the blank spare | in no enumerator (`UIHelpers.cs:279`); blank verbs dropped (`SingleChatPage.xaml.cs:426`) | smoke `★★ Session P L1·2` (×4) · `L1·4 belt A/B` |
| the spare or the parked Account is shown over / under a lock | `:1763` · `:1984` · `:1537` refuse; lock stage ZIndex 200 (`SpixiContentPage.cs:3924`) | smoke `★★ Session P L1·4 guards` · `#315 ★ #230 fail-closed` |
| read the three passwords left in the parked Account's inputs | `releaseEncpass` on every view change and every park route (`src/shells/settings.html:907` render, `:720` exitSettings) | smoke `★★ #804 PIN 5` · `PIN 5b SECURITY BEHAVIOURAL` |
| a stale-theme / stale-language spare or Account comes back | dropped on theme (`UIHelpers.cs:489`/`:540`), language (`SettingsPage.xaml.cs:899`), insets (`UIHelpers.cs:433`) | smoke `★★ Session P L1·5 (spec §5.5)` (eleven drop sites) |
| a mini-app reads `spixi.draft.<addr>` (own unsent text) | Android: no DOM storage for mini-apps (`WebViewRenderer.cs:482`); iOS: non-persistent store (`iOSWebViewHandler.cs:723`) | Windows / Mac: no proof — O-03 (#805) open |

## Given up / left open
- The parked Account (own address, nickname, avatar, settings, Downloads list) lives behind the lock for the session; only the spare is dropped on sleep (#315, #800).
- Scrubbing clears the DOM values; the JS strings die with garbage collection, weaker than destroying the page (#804).
- Every shell document shares one `file://` storage origin, so any chat WebView can read every `spixi.draft.*` key; Windows / Mac mini-apps too (O-03, #805).
- The theme on "System" sometimes shows wrong on Android; a spare built around the flip may bake the old theme (#1311 (a), mechanism owed).

## Question for BE
Should the parked Account WebView be disposed when the app locks (as the chat spare is on sleep) — yes/no?
