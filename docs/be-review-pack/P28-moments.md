# P28 · MOMENTS · Seven one-time "moment" sheets (S17 F)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (no moment writes a setting; the payment moment only DELAYS the review) | no (the native confirm is unchanged) | yes — 3 new pushes, 3 new verbs, 2 dev verbs (S18 D3: + `ixian:devmoments:reset`) | built behind flag `SpixiFlags.S17Moments` (default ON) | 6 min |

**Look here first:** `Spixi/Utils/S17MomentRules.cs` — the grammar and the decision, pure (csh `S17MomentTests.cs`, 7 tests — S18 D3 +1: the decision log line). `Spixi/Meta/SMoments.cs` reads the inputs and stores what the rules decide.

**DECISIONS:** #1312 · #1340–#1345 (S17 F) · MOMENTS.md (Damir 17:12 / 17:36) · 20:37 full-bleed art · 20:42 text buttons

## What changed and why
- A moment sheet teaches one fact when the user's own action makes it relevant: AI translation (after a non-English language pick) · auto-download photos (after the first manual photo) · a file from an offline sender · the first IXI received with no backup (SAFETY) · the microphone (before the OS dialog) · a mini app's first open (per app) · the first payment (before the review).
- Each shows ONCE (per language / per app). At most one per session, and never in a session with a hint / update / backup / rating card — the first IXI excepted. C# decides; the shells only ask and show.
- Seen flags: `SLocalOnlyStore` keys `moments.seen` · `moments.langs` · `moments.apps` (device only, never in a backup, wiped with the account). Session bits are in memory.
- Seen is stored BEFORE C# answers "yes", so every close path (button, back, scrim, swipe) counts.
- Home holds its own rating / hint cards back in a session that had a moment. The backup card is SAFETY: it always shows (like the first-IXI moment). A "session" = the process, at most 6 h after its first moment / card (`SMoments.SessionMs`).
- ★ #46 security r1 (MAJOR-1, fixed): the auto-download offer NEVER writes the setting from the chat WebView. Its button sends `ixian:openPrivacy`; C# opens Settings › Privacy (`SettingsPage.openAt`, push `openScreen('privacy')`) and the user picks there.
- The after-the-result moments are ASKED only when the host's screen is clear, so C#'s "yes" (seen stored) shows at once.
- Flag OFF = no cap, no push, every verb below ignored (today).

## Files
- `Spixi/Utils/S17MomentRules.cs:48` `parseAsk` · `:83` `decide` · `:119` `capsCsv` · `:126` `pushJson`.
- `Spixi/Meta/SMoments.cs` — `noteLanguage` · `pushJson(page)` (the chat gets only its own moments' ids and no app list) · `handleVerb` · `answerAsync` (per-moment conditions; seen stored before the answer) · `micEligible` · `takePrivacyOpen` (one `ixian:openPrivacy`, same page, ≤ 10 min).
- `Spixi/Utils/SpixiContentPage.cs:6460` — the verb branch: only Home / a chat / Settings / Contact details, only `hasGeneratedContent` (never a mini-app WebView).
- Caps + push: `HomePage.xaml.cs:2844` · `SettingsPage.xaml.cs:255`, `:270` · `SingleChatPage.xaml.cs:1655`, `:1664` · `ContactDetails.xaml.cs:245`.
- `SettingsPage.xaml.cs:939` — the language is noted after `setLocale` (non-English only).
- `SingleChatPage.xaml.cs` — `ixian:openPrivacy` (exact) → `SettingsPage.openAt("privacy")`; `SettingsPage.xaml.cs` — `openAt` / `pushPendingScreen` (push `openScreen`).
- `Spixi/Utils/SpixiFlags.cs` — `S17Moments`; `Spixi/Pages/Dev/DevPage.xaml.cs` — `ixian:devflash:s17m:<0|1>`.

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:moment:<id>` | id ∈ autodl · offline · firstixi · mic · pay (exact, no argument) | home / chat (UNTRUSTED) / settings / contact details | `SpixiContentPage:6460` → `SMoments.handleVerb` | ours (new) |
| `ixian:moment:lang:<xx-yy>` · `ixian:moment:app:<id>` | `^[a-z]{2}-[a-z]{2}$` · `^[A-Za-z0-9._-]{1,128}$` | same | same | ours (new) |
| `ixian:moment:card` | none (exact) | home only (other pages: ignored) | same | ours (new) |
| push `setMoments` | `{"seen":[ids],"apps":[ids],"lang":"<code>","session":bool,"sessionMs":<0 … 21600000>}` built from validated values; a CHAT page gets only `seen ∩ {autodl, offline, mic, pay}` and `apps: []` | C# → the four pages | `SMoments.pushTo` | ours (new) |
| push `momentAnswer` | `id, arg, "1"\|"0", caps` — caps = MiniAppCapabilities NAMES (constants) | C# → the asking page | `SMoments.answerAsync` | ours (new) |
| `ixian:openPrivacy` | none (exact) | chat.html → SingleChatPage, ONCE, from the page C# granted the autodl moment, within 10 min (`takePrivacyOpen`) | `SettingsPage.openAt("privacy")` (a pending screen older than 15 s is dropped) | ours (new; navigation only) |
| push `openScreen` | `"privacy"` (C#'s constant; the shell accepts the exact id) | C# → settings.html | `SettingsPage.pushPendingScreen` | ours (new) |
| `ixian:devflash:s17m:` | `<0\|1>` | dev.html → DevPage | DevPage | ours (dev) |

## Threat → rule → proof
| A hostile page script could try… | What stops it | Proof |
|---|---|---|
| inject into the store or a push | exact grammar; every list value re-validated on the way in AND out | csh `ParseAsk_ExactGrammarOnly`, `Lists_*`, `PushJson_*` |
| turn auto-download on from a chat | nothing on a chat page writes it any more (#46 security r1): the offer only opens Settings › Privacy in front of the user | pin `f-moments.mjs` (SOURCE: openPrivacy, chatAutoDl) |
| hold back the backup reminder | the backup card ignores the moment session (safety) | pin `f-moments.mjs` (HOME: backupSafety; SOURCE: backupSafety) |
| reach the verbs from a mini app | `hasGeneratedContent` + the four page types | pin `f-moments.mjs` (hosts) |
| read other panes' state from the chat | the chat's `setMoments` carries only its own moments (no first-IXI bit, no app list, no pending language); `ixian:moment:app:` from a chat answers only for an installed MultiUser app. Accepted residual (#46 security r4): asking app by app tells the chat whether that app's moment was already seen, and its capability names when not | #46 security r3 / r4 |
| spoof a lock-screen line with a nickname (sender name now ON by default, #1346) | `displayNameFor` strips controls / separators / format / bidi and caps at 32 (the #1178 member-name rule) | FileRowRulesTests (the shared sanitizer) |
| make a payment easier | the pay moment only DELAYS the FE review; `ixian:signSend` and the native confirm are untouched (`SPayments.cs` unchanged) | pin `f-moments.mjs` (review) |
| (worst case) | burn moments (e.g. the first-payment warning) and take the session → no hint / rating card and no other moment for up to 6 h; never the backup card, never money | — |

## Given up / left open
- "Dirty" backup (new contacts since the last backup) is not tracked in C#; the first-IXI moment uses "never backed up" only.
- The first-IXI moment fires on the first wallet list that holds a received payment — an existing user with no backup gets it once after this update (its title says "first IXI").
- The offline moment is a heuristic: no transfer tick 10 s after a manual accept while the peer is not shown online (the sender may hide its status).
- Windows: the mic moment shows only for a packaged (MSIX) build — an unpackaged exe has no OS dialog. iOS / macOS: after a refusal the mic moment is consumed (the OS never asks again).
- App details › Launch (`app_details.html`, AppDetailsPage) opens an app WITHOUT the app moment (that page is not a moment host); the next grid / invite open then shows it once.
- A granted after-the-result moment is lost if the app dies between C#'s "yes" and the sheet (the ask waits for a clear screen, so the window is the answer latency).

## Question for BE
None blocking. Is `SLocalOnlyStore` the right home for the moment flags (yes / no)?

## S18 D3 addendum (2026-10-12) — the decision log line + Developer › Reset moment sheets
Why: the S17 walk (Android) showed no sheet for MO-LANG / MO-APP / MO-OFFLINE / MO-AUTODL. The most likely cause is the one-per-session rule (the Pay moment was granted first in the same process), but C# logged no decision, so it could not be proven; the walk sheet also never said "restart between moment rows".

| Verb / push / log | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| log `[MO] ask id=<id> d=<grant\|refuse\|consume> why=<seen\|wait\|session\|card\|ok>` | id = one of the seven fixed ids, re-read from `S17MomentRules.Ids` by index; no language code, no app id | written by C# once per `ixian:moment:*` ask, at most 100 per process or per dev reset | `SMoments.answerAsync` → `S17MomentRules.askLine` / `why` (pure) | ours (new) |
| `ixian:devmoments:reset` | none (exact) | dev.html → DevPage, dev mode on | `SMoments.resetForDev` — removes `moments.seen` · `moments.langs` · `moments.apps`, clears the session bits; one line `[MO] dev reset: moment sheets cleared` | ours (dev) |
| `setCaps "devmoments"` | constant | DevPage.onLoad → dev.html | the Reset row shows only then (no dead row) | ours (dev) |

- `why` follows `decide()`'s own order: seen → consume (`why=ok`: the id's own check says it is never needed) → wait → session → card → ok. Proof: csh `S17MomentTests.AskLine_WhyMatchesDecide_FixedWordsOnly` (every id × eligibility × the three bits: refuse ⇔ a why other than ok; the line always matches the fixed shape; an id outside the set logs nothing). Pin `scripts/pins-s18/f-moments-dev.mjs`.
- Files: `Spixi/Utils/S17MomentRules.cs` (`Why`, `why`, `decisionWord`, `askLine`, `DevResetVerb`, `DevResetLine`) · `Spixi/Meta/SMoments.cs` (`answerAsync` the line; `resetForDev`) · `Spixi/Pages/Dev/DevPage.xaml.cs` (the branch; the cap) · `src/shells/dev.html` (the row in the Release flags card).
- Threat: a hostile host page can add `[MO] ask` lines only by sending asks, at most 100 per process or per dev reset (`MaxAskLines`; the reset needs a user tap in dev mode), so it cannot flood `ixian.log`; the reset is reachable only from DevPage in dev mode, and its worst case is every moment once more (more warning, never less). Gate rows: `docs/security-handover-gate.md` § Session 18 D3.
- Question for BE: none.
