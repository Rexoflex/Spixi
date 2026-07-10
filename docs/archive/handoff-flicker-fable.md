# Handoff — Native flicker fixes (for a Fable build session)

> Work order. Read this + `docs/native-feel-punch-list.md` §A + `docs/be-cutover-brief.md` [N1]/[N3] before starting.
> Also read FIRST: `CLAUDE.md` ground rules (esp. the two ★ rules), `SECURITY.md` §1, `docs/security-review-for-be-engineer.md` §3.
> Prepared 2026-07-09 (Opus) for Damir.
> **STATUS: IMPLEMENTED 2026-07-09 (Fable) — see DECISIONS #222** (load-then-present + theme-aware surface +
> Account fix + C#-injected boot theme). Awaiting Damir's both-themes F5 + commit.

## Context (1 paragraph)
Spixi is a decentralized MAUI messenger. The UI is a redesigned WebView frontend (vanilla-JS shells in `src/shells/`, built to `Spixi/Resources/Raw/html`) talking to C# over a FROZEN `ixian:` bridge. The chat CONVERSATION is its OWN isolated WebView; the home shell (chat list + wallet + apps) and settings are separate WebViews. This isolation is the #1 security invariant (SECURITY.md §1) — do not weaken it.

## The task
Eliminate the NATIVE page-transition flicker when opening pushed screens. User-reported worst cases (Damir, live F5): opening a **conversation** (in LIGHT mode shows a **DARK** flash), **chat-info**, **add-contact**, **app-details** (all "massive"), and the **Account** slide-in.

## Decided approach (Damir)
**"Load then move":** keep the user on the CURRENT screen until the incoming screen's WebView has loaded (signals `ixian:onload`), then present it. Theme-agnostic — no blank/wrong-theme frame ever shows. Apply first to the worst offenders. Complement with a THEME-AWARE base-class background for the rest, and the one-line Account animation fix.

## Screen inventory (file:line)
- Conversation: `HomePage.xaml.cs:839` (`PushAsync(new SingleChatPage)`) · `ContactDetails.xaml.cs:90`
- Chat info (1:1): `HomePage.xaml.cs:288/491` · `SingleChatPage.xaml.cs:369` (`ContactDetails`)
- Add contact: `HomePage.xaml.cs:221` (`ContactNewPage`)
- App details: `HomePage.xaml.cs:1799/1793` · `AppsPage.xaml.cs:91` · `SingleChatPage.xaml.cs:944` (`AppDetailsPage`)
- Account: `HomePage.xaml.cs:726` (`SettingsPage`) — the ONLY push missing `Config.defaultXamarinAnimations` (=`false`, `Config.cs:56`), hence the slide.

## Root cause
- `Spixi/Utils/SpixiContentPage.cs` (base class) sets no `BackgroundColor` → native surface shows before the WebView paints.
- Light-mode DARK flash on chat open: `src/shells/chat.html:301` resolves the boot theme from localStorage before paint (dark instant-bg at :21); on a fresh conversation WebView the light theme isn't applied in time → boots dark, flips to light.

## Implement (priority order)
1. **Load-then-present** (primary). Preload the incoming WebView offscreen on tap; hold the user on the current screen until `ixian:onload`; then present. Start with conversation, chat-info, app-details, add-contact.
2. **Theme-matched background** (complement). Base-class `SpixiContentPage` (+ WebView) `BackgroundColor` = the CURRENT-theme surface from `SpixiThemeMode`/appearance. **MUST be theme-aware — a hardcoded dark bg BREAKS light mode (that is the reported symptom).**
3. **Account slide** (one line): pass `Config.defaultXamarinAnimations` to `HomePage.xaml.cs:726`.

## HARD CONSTRAINTS (non-negotiable)
1. **SAFE C# ONLY.** Do NOT touch: transaction signing/broadcast, keys/passwords/seed across the bridge, WebView-supplied paths→filesystem ops, a JS bridge between chat and other panes, password-over-URL, or IP-leaking remote fetches. The flicker work is a background colour + navigation timing + an animation flag — nothing else. (Full list: `docs/security-review-for-be-engineer.md` §3.)
2. **ISOLATION (SECURITY.md §1).** Preloading keeps a WebView its OWN isolated WebView — do NOT merge WebViews or wire a shared JS bridge between panes. Coordinate via C# only.
3. **THEME AWARENESS.** Test EVERY change in BOTH light and dark. The light-mode dark-flash proves a hardcoded-dark bg is wrong.

## Verify
- F5 each screen (conversation, chat-info, add-contact, app-details, account) in BOTH themes — no flash, no wrong-theme frame, no Account slide.
- Run the #46 audit loop; hand to an Opus reviewer before commit (project pattern: fable builds, Opus audits).
- If a preloaded conversation WebView is kept alive, note its teardown lifecycle for the BE engineer (an isolated WebView holding untrusted content in the background — still isolated, flag it).

## Deliverable
ONE focused commit (e.g. "native flicker: load-then-present + theme-matched bg + account slide"). No unrelated changes bundled in.
