# P31 · V1A-M MOMENTS AND TIPS · The "What is IXI?" moment + two word tips on the Chats screen (V1A-M M1 · M2)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (one more id in the S17 moment set; two more ids on the S11 hint verb; fixed sets, validated before anything is written; no new WebView / `spixi.*` key and no new store key — the S17 / S11 local-only keys carry the new ids; 2 int prefs (the flags); 1 dev push) | no (the moment only explains IXI and opens the existing address sheet; no amount, no send; it never holds back the first-payment `pay` sheet — #46 r1) | 1 new ask id `ixian:moment:ixihelp` · 2 new hint ids on `ixian:hint:done:` · 2 new caps `ixihelp`, `wordtips` · dev surface: `ixian:devflash:v1ixihelp:<0\|1>`, `ixian:devflash:v1hints:<0\|1>` + push `setFlagsDevV1` | built behind flags `SpixiFlags.V1IxiHelp` and `SpixiFlags.V1Hints` (default ON) · ⚠ UNCOMPILED for MAUI until the V1A-M build | 3 min |

**Look here first:** `Spixi/Utils/V1AMRules.cs` (pure; csh `V1AMTests`, 7 tests) · `Spixi/Utils/S17MomentRules.cs:108`, `:122` (`takesSession` — false for `ixihelp`, #46 r1) · `Spixi/Meta/SMoments.cs:141` (flag OFF) · `:214` (the id's check) · `Spixi/Pages/Home/HomePage.xaml.cs:959` (the word-tip branch) · `:2859` (the caps).

**DECISIONS:** #1340 (S17 moment sheets, P28) · #1262 / #1267 (S11 / S12 hint cards) · #1312 · V1A-M (Damir's Dials 2026-10-15: M1 title A + coin art; M2 tips "contact request" and "no phone book" only, style A).

## What changed and why
- **M1 — "What is IXI?" (flag `V1IxiHelp`).** The first time the user opens the Wallet tab, home asks the moment `ixihelp` through the existing S17 moment client. C#: `ixihelp` joins the ONE fixed id set `S17MomentRules.Ids` (no argument — `parseAsk` refuses any tail, like `mic` / `pay`); its own check is `V1AMRules.ixiHelpEligible(flag, page is HomePage)` — **home only**; once per id (`moments.seen`, the local-only file); it **obeys** the session rule — refused when a moment or a card already showed in this session (it is **not** exempt like `firstixi` / `lang`) — but it **never takes the session** (★ #46 r1, A-MINOR-1, the main session's decision: `S17MomentRules.takesSession` / `respectsButNeverTakes`). So "What is IXI?" never holds back the first-payment `pay` sheet ("Before you pay"), the mic / app / autodl / offline moments or home's hint / rating cards; the JS mirror (`moment-sheet.js`) does not set its session bit for it either. The sheet's "Show my address" opens the address sheet the Wallet zero-state already opens (JS only).
- **M2 — word tips (flag `V1Hints`).** Two quiet cards explain a word the first time it shows: "contact request" (under the first incoming request) and "no phone book" (empty Chats). Their × sends `ixian:hint:done:wordrequest|wordphonebook`. C#: the ids are `S11HintRules.WordIds` — beside the rotation list `TipIds`, not in it (the shell's weekly tip rotation, `glass-card.js HINT_IDS`, stays as it is); `isTipId` admits both, so the S11 grammar, the done list and the `setHints` push carry them. HomePage takes a word-id verb in its OWN branch before the S11 one: `done` → `SHints.markDone`; `shown` is dropped ALWAYS (a word tip never moves `lastShown`); flag OFF drops everything. The user's "Tips on the Chats screen" switch also hides word tips (shell side, from `setHints.off`).
- **Flags.** Two int prefs read once at start, absent = ON, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`, the S16 rule); `[FLAGS] v1ixihelp=<0|1>` and `[FLAGS] v1hints=<0|1>` logged right after the S20G line. OFF = no `ixihelp` / `wordtips` cap (the shell then never asks / never renders a tip), and C# ignores `ixian:moment:ixihelp` (nothing answered, stored or logged) / every word-id hint verb.

### How to switch it off
Developer mode on → Developer › Release flags → "What is IXI moment (V1A)" / "New-word tips (V1A)" → restart. (Verbs `ixian:devflash:v1ixihelp:0` / `ixian:devflash:v1hints:0`; stored only with dev mode on; leaving dev mode gives the defaults back.)

## Files
- `Spixi/Utils/V1AMRules.cs` (new): `IxiHelpId` · `flagLineIxiHelp` / `flagLineHints` · `ixiHelpEligible` · `parseWordTipVerb` (the S11 `parseVerb` + `isWordId`) · `wordTipMarksDone` (done only, flag on) · `devFlagsArg`.
- `Spixi/Utils/S17MomentRules.cs:38` `Ids` + `"ixihelp"` (parseAsk / askLine / why / isSeenId / pushJson read this set) · `:108`, `:122` `takesSession` (both overloads) `&& !respectsButNeverTakes(id)` · `:111` `respectsButNeverTakes` (= `ixihelp` only). `exemptFromSession` / `decide` / `why` unchanged.
- `Spixi/Utils/S11HintRules.cs:31` `WordIds` · `:36` `isTipId` admits them · `:47` `isWordId`. `helpUrlFor` unchanged (null for a word id: no Learn more).
- `Spixi/Meta/SMoments.cs:141` flag OFF → return before `answerAsync` · `:214` `case V1AMRules.IxiHelpId:` · `:251`, `:268` the session bit and the home push follow `takesSession` (unchanged lines; false for `ixihelp`). The chat's push filter (`ChatSeenIds`, `:82`) is unchanged — a chat never learns about it.
- `Spixi/Pages/Home/HomePage.xaml.cs:959` the word-tip branch (before the S11 `ixian:hint:` branch, `:970`) · `:2859` setCaps `+ ",ixihelp"` (S17Moments && V1IxiHelp) `+ ",wordtips"` (V1Hints).
- `Spixi/Utils/SpixiFlags.cs:20-21` keys `flagV1IxiHelp` / `flagV1Hints` · `:51`, `:55` the flags · `:71-72` the reads · `:91-94` `effectiveFlag` + the two lines.
- `Spixi/Pages/Dev/DevPage.xaml.cs:122`, `:141` the two devflash branches · `:376` push `setFlagsDevV1`; `src/shells/dev.html` the rows.
- JS (shell side, for orientation): `src/components/moment-sheet.js` (`ixihelp`), `src/components/word-tip.js` (new), `src/shells/home.html`.

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:moment:ixihelp` | no argument (any tail refused) | every moment host (`SpixiContentPage.cs:6466`): home / chat (UNTRUSTED) / settings / contact details / app details — never a mini-app WebView. Only **home** gets `Yes`; chat, Settings and Contact details get `Wait` (nothing stored, no session, one `[MO] ask id=ixihelp d=refuse why=wait` line inside the 100-line cap); App details is refused silently (`appDetailsAsk`, unlogged). Home's shell asks it on the Wallet tab's first open. | `SMoments.handleVerb` → `answerAsync` → `momentAnswer` | ours (a new id in the S17 verb) |
| `ixian:hint:done:wordrequest` · `ixian:hint:done:wordphonebook` (`shown:` for them is accepted and dropped) | one action of the S11 pair + one id of `WordIds` | home.html → HomePage | `V1AMRules.parseWordTipVerb` → `SHints.markDone` | ours (new ids on the S11 verb) |
| caps `ixihelp`, `wordtips` | fixed words in the existing setCaps | C# → home.html | — | ours |
| `setMoments` / `setHints` | unchanged shape; may now list `ixihelp` in `seen` / the word ids in `done` | C# → home (and the other moment hosts; a chat's `seen` is filtered) | — | reshaped (values only) |
| `ixian:devflash:v1ixihelp:<0\|1>` · `ixian:devflash:v1hints:<0\|1>` · push `setFlagsDevV1("<0\|1>,<0\|1>")` | one digit each | dev.html → DevPage (dev mode only) | DevPage, the s20g rules | ours (dev surface) |
| log `[FLAGS] v1ixihelp=<0\|1>` · `[FLAGS] v1hints=<0\|1>` · `[MO] ask id=ixihelp d=<…> why=<…>` | fixed words | C# | `SpixiFlags.init` · `SMoments.answerAsync` (the existing capped ask line) | ours |

## Threat → rule → proof
| A hostile page could try… | What stops it | Proof |
|---|---|---|
| inject a new moment / hint id or a value into the store | fixed id sets, Ordinal, before any write; stored values are the constants | csh `m1_parse_ask…`, `m2_word_verb…`, S11 `the_verb_is_one_action…` |
| freeze the weekly tip rotation with a word tip's `shown` | `shown` for a word id never writes (`wordTipMarksDone`), the S11 branch never sees a word id | csh `m2_store_keeps_the_word_done_and_never_lastShown`; pin `pins-v1am/c-csharp.mjs` (word) |
| burn the moment / take the session from a chat page | `ixihelp` is answered Yes on HomePage only; Wait elsewhere stores nothing; even a granted `ixihelp` never takes the session (#46 r1); a chat's push never names it | csh `m1_session_rule_obeyed_but_never_taken`; pin `c-csharp.mjs` (off: eligible, sessionOnlyViaRule) |
| act with the flag OFF | the ask returns before `answerAsync`; the word branch writes nothing | pin `c-csharp.mjs` (off, word) |
| (worst case) | the "What is IXI?" sheet marked seen, or a word tip marked done, without the user seeing it | — |

## What the reviewer must confirm
1. `S17MomentRules.Ids` growing to 8 is acceptable (the seen cap `Ids.Length` grows with it; `exemptFromSession` unchanged), and the third session class it adds: `ixihelp` obeys the session rule but never takes it (`takesSession` false, #46 r1).
2. Word ids riding `isTipId` (the S11 store / push) but not `TipIds` (the rotation) is the split you want.
3. The flag-OFF paths are the S17 / S11 behaviour for every other id — with one residue (#46 r1 NIT-3): values stored while a flag was ON (`ixihelp` in `moments.seen`, word ids in `hints.done`) still ride `setMoments` / `setHints` after it goes OFF (dev mode only — Release cannot store an effective 0). Harmless: the shells filter by their own id lists (`moment-sheet.js` MOMENT_IDS, `glass-card.js` HINT_IDS) and no word tip renders without the `wordtips` cap. Also `ixihelp`, once seen, rides the Settings / Contact details `setMoments` (only a chat's push is filtered), like `firstixi`.

## Cost
Nothing at runtime beyond one more array entry and one string compare per hint verb.

## Given up / left open
- Out (V1A-N): the "your address" and "canvas" tips, the group mosaic, haptics, the blank lock alert.
- The moment is asked on the Wallet tab's first open only; a user who never opens the Wallet never sees it.
- **Session (#46 r1 A-MINOR-1, decided):** as first built, a granted `ixihelp` took the session, so a new user who opened the Wallet and then tapped Send in the same session (< 6 h) got no "Before you pay" sheet (`[MO] ask id=pay d=refuse why=session`), and home's hint / rating cards and the other moments waited too. Now it obeys the session rule but never takes it (`takesSession` false; the JS mirror too). What stays: after `pay` (or another moment / a card) in a session, "What is IXI?" waits for a later session AND a later home document (a refused ask latches for the document) — a refusal stores nothing.
- **Upgraders see it once (#46 r1 A-MINOR-2, accepted):** there is no Consume path for a wallet that already has history — every existing user gets "What is IXI?" once, on a Wallet open after the update (a later document when firstixi was wanted, see below) (the `firstixi` upgrade precedent, P28). A wallet-history condition would be a C# read near the wallet (its own lens check); not built. Since #46 r1 it no longer takes the session, so that one sheet holds nothing back.
- **A late "yes" lost on a reload (#46 r1 B-MINOR-3, accepted):** C# stores `seen` BEFORE it answers `1`; if the home document reloads (theme, language, WebView recovery) between that answer and the sheet, the sheet is not shown and is not asked again (seen). Rare (the window is the answer latency); at worst the user never sees the explainer — nothing else depends on it.
- **Order with the first IXI (#46 r2 MINOR-1, r3):** home waits for the first wallet flush of the document (or 2 s) before it asks `ixihelp`, and skips it in a document where `firstixi` is wanted — the safety sheet stands alone. Recorded (#1450): (a) the skip keys on the WANT, so when C# Consumes `firstixi` (a backup exists → nothing shows) the explainer waits for the next document (next cold start); (b) a wallet flush slower than the 2 s bound (a restored account on a slow phone) can still show "What is IXI?" before "You received your first IXI" — both show, only the order differs.

## Question for BE
None blocking.
