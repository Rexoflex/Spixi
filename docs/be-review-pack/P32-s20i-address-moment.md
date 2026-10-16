# P32 · S20I ADDRESS MOMENT · "How people find you" on the Account hub (S20I Drop D)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (one more id in the S17 moment set, a fixed set validated before anything is written; no new WebView / `spixi.*` key and no new store key — the S17 local-only `moments.seen` carries it; 1 int pref (the flag); 1 page bool) | no (the moment only explains the address and opens the address sheet the hub already has; no amount, no send; it never holds back the `pay` sheet — the V1A-M `ixihelp` session rule) | 1 new ask id `ixian:moment:addrhelp` · 1 new cap `addrhelp` (Settings) · 1 extra `setMoments` push to the Account page when it is presented | built behind flag `SpixiFlags.S20AddrHelp` (default ON) · ⚠ UNCOMPILED for MAUI until the S20I build | 2 min |

**Look here first:** `Spixi/Utils/S20IRules.cs` (pure; csh `S20ITests`, 5 tests) · `Spixi/Utils/S17MomentRules.cs` `Ids` + `respectsButNeverTakes` (+ `addrhelp`) · `Spixi/Meta/SMoments.cs` (flag OFF return + `case S20IRules.AddrHelpId`) · `Spixi/Pages/Home/HomePage.xaml.cs` `onOverlayPresented` (the SettingsPage branch) · `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`shownToUser`, the cap).

**DECISIONS:** #1340 (S17 moment sheets, P28) · #1450 (V1A-M ixihelp: obeys the session, never takes it, P31) · #1312 · #1462 (this change; Damir 2026-10-15 23:25 + 23:38).

## What changed and why
- **The moment (flag `S20AddrHelp`).** User testing showed the address was not understood. The first time the Account hub is ON SCREEN, settings.html asks `ixian:moment:addrhelp` through the existing S17 moment client. C#: `addrhelp` joins the ONE fixed id set `S17MomentRules.Ids` (no argument — `parseAsk` refuses any tail); its own check is `S20IRules.addrHelpEligible(flag, page is SettingsPage sp && sp.shownToUser)` — **every account** (created, restored or older: Damir 23:38), once per id (`moments.seen`); it obeys the one-per-session + card rule but never takes the session (`respectsButNeverTakes`, the `ixihelp` rule), so it never holds back `pay`.
- **"On screen", not "loaded".** The phone warms the Account page HIDDEN at start (`warmParkedOverlay`) and parks it hidden again on close (#315), so a load is not an open. `SettingsPage.shownToUser` (a volatile bool, false at construction) turns true in `HomePage.onOverlayPresented` — the overlay fresh present (incl. a claimed warm page and the desktop pane) AND the parked re-present — which also re-pushes `setMoments` so the page asks again; ★ #46 r1 (security MINOR-1) it turns false again in `HomePage.onOverlayClosed`. While false the answer is `Wait` (nothing stored; one `[MO] ask id=addrhelp d=refuse why=wait` line inside the 100-line cap). The legacy push fallback (a legacy page above Home) never calls `onOverlayPresented`, so it never grants — fails closed. The shell also asks only with the hub in view and nothing over it, and a LATE yes waits for a clear hub (#46 r1 M3) — on the PHONE; in the desktop pane the hub is always in view beside the screen, so the sheet may show while a sub-screen is open next to it (#46 r3 N8).
- **Side effect (#46 r1 NIT-1):** the extra `setMoments` at every Account present also lets a still-pending LANGUAGE moment ask again on a later Account open (before, only the load pushed). Lang never takes the session; at worst the lang sheet and this sheet show one after the other.
- **Flag.** One int pref `flagS20AddrHelp`, read once at start, absent = ON, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`); `[FLAGS] s20addrhelp=<0|1>` logged right after the V1A-M hints line. OFF = no `addrhelp` cap (the shell never asks), the ask ignored before anything is read (nothing answered, stored or logged), no extra push. ⚠ No Developer switch row in this drop (🟡 #1462): the pref is set by hand.
- **Not C#:** the "My address" row is back above Contacts (settings-shell.js) — JS only, it opens the same address sheet.

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:moment:addrhelp` | no argument (any tail refused) | every moment host (home / chat (UNTRUSTED) / settings / contact details / app details — never a mini-app WebView). Only a **Settings page on screen** gets `Yes`; every other page gets `Wait` (nothing stored, no session); App details is refused silently (`appDetailsAsk`). | `SMoments.handleVerb` → `answerAsync` → `momentAnswer` | ours (a new id in the S17 verb) |
| cap `addrhelp` | a fixed word in Settings' existing setCaps (inside the `S17Moments` block) | C# → settings.html | — | ours |
| `setMoments` | unchanged shape; may list `addrhelp` in `seen`; ONE extra push to the Account page at its present | C# → settings.html | `SMoments.pushTo` | reshaped (values + timing only) |
| log `[FLAGS] s20addrhelp=<0\|1>` · `[MO] ask id=addrhelp d=<…> why=<…>` | fixed words | C# | `SpixiFlags.init` · `SMoments.answerAsync` (the existing capped line) | ours |

## Threat → rule → proof
| A hostile page could try… | What stops it | Proof |
|---|---|---|
| a chat asking `addrhelp` to burn the id (mark it seen) so the user never sees it | only a Settings page ON SCREEN gets `Yes`; a chat gets `Wait`, which stores nothing | `S20ITests.eligibility_a_settings_page_on_screen_every_account` |
| a forged tail / case (`ixian:moment:addrhelp:x`, `ADDRHELP`) | `parseAsk` refuses before anything is read | `S20ITests.parse_ask_takes_addrhelp_with_no_argument_only` |
| flooding the log with asks | the existing 100-line cap on `[MO] ask` lines; fixed words only | `S17MomentTests.AskLine_WhyMatchesDecide_FixedWordsOnly` (shape now includes `addrhelp`) |
| holding back the first-payment sheet | `addrhelp` never takes the session | `S20ITests.session_rule_obeyed_but_never_taken` |

## How to switch it off
Developer mode on, then set the int preference `flagS20AddrHelp` to 0 and restart (no dev switch row yet, #1462 🟡).
