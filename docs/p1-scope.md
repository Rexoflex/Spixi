# P-1 scope — the session-3 performance review (input for `docs/prompts/session-3.md`)

Damir, 2026-10-01: "session 3 should tackle this". **Session 2 Export: fold this file into
`docs/prompts/session-3.md` and record it as a DECISIONS row** (this note takes no number, so
session 2's numbering is not disturbed).

## 1 · The change

P-1 (#1116) was "chat open < 100 ms, no flicker". It is WIDENED to **the whole app's felt
speed**: every tap → next frame, every screen transition, scroll, and the cold start. Chat open
stays the headline criterion. Session 3 stays **read-only first**: measure every path, rank, and
then Damir picks the fixes (#294, #782 — rank by risk, avoid anything that can break things).

## 2 · Outcome (testable)

- A table: every user-reachable transition × platform (Android Release, Windows F5, iPhone, Mac)
  → tap-to-first-frame ms, frames dropped, any blank/flash frame. Stamps, not estimates.
- A ranked lever list (ms gained × certainty ÷ risk), each with its mechanism verified in the tree.
- No code change before Damir says "go".

## 3 · Known leads (verify each in the tree first — #215)

| # | Lead | Source | Status |
|---|---|---|---|
| 1 | Pages that still boot their OWN cold WebView on push: chat info (`ContactDetails`), Add contact, App details, legacy `wallet_recipient` / `settings_lock`. 130–230 ms each, main thread, in-process WebView on the Motorola | #803 (5), #804 | known, not fixed. Options: in-shell sublevel (the #804 way) or a pre-warm — each against SECURITY.md §1 (untrusted content keeps its own WebView) |
| 2 | Desktop gets ONE pre-warmed chat per session (chats are switched, never closed) → 87 ms once, then 178–241 ms | #803 (7) | design limit, not built |
| 3 | Waits on animation / handshake: bar reveal ≈240 ms (session 2 G-9 probes it); Account → Contacts shows the chats list mid-slide | #1115 A1, #1077 | G-9 in session 2; #1077 open |
| 4 | Motion durations 200–300 ms (`--duration-200/300`, subscreen slide 300 ms). Fast apps ≈150–250 ms | `src/styles` tokens | never dialled — render options, Damir picks |
| 5 | Chats-list scroll stutter — INHERITED (the pre-redesign build stutters the same) | #803 (3) | cause never traced |
| 6 | `backdrop-filter` ×10 in the CSS — GPU cost on mid-range Android while scrolling | grep `src/` | unmeasured |
| 7 | No virtualization: long chat log, 500-member bot roster (roster burst not chunked) | cdperf-2026-08-29 §3 | unmeasured |
| 8 | Cold start ≈2 s Android Release; ~1.0 s is the FIRST WebView's engine init. Lever: create the home WebView in parallel with the node/wallet boot (ceiling ≈1.5 s) | #925 | named, not built; lifecycle design + BE |
| 9 | Build settings for walks and release: Release, AOT / profiled AOT, trimming — confirm what ships | #925 | check |
| 10 | ★ **Desktop chat-info right pane feels sluggish and stuttery, does not "gently push" the chat** (Damir, 2026-10-01). Read from the tree: `HomePage.xaml.cs` opens it via `pushPageLoaded(new ContactDetails(…), … slideIn: true)` — a NEW cold WebView every open (lead 1) — and at present `ColumnDefinitions[2].Width` jumps 0 → 360 in ONE frame (`HomePage.xaml.cs` `infoPaneCol2Pending` present branch, `new GridLength(Math.Min(infoPaneWidth, avail))`). So the conversation column snaps narrower while only the overlay slides. | tree, unmeasured | Measure open ms + frames on Windows. Options to render for Damir: (a) animate the column width (risk: a WebView2 re-layout per frame may itself stutter — measure); (b) slide the pane OVER the chat, resize the column once at the end; (c) keep the pane's WebView warm while a chat is open (security check: it shows the same contact's data, own WebView) |
| 11 | ★ **Wallet tab flickers its transactions on every visit** (Damir, 2026-10-01). Read from the tree: the `ixian:tab:` branch calls `loadTransactions(true)` for `tab2` — `forceRefresh` bypasses the `UIHelpers.shouldRefreshTransactions` gate, so every visit sends `clearPaymentActivity` and re-pushes every row. The apps tab right below already has the fix: `loadApps(!appsPushedToShell)` — force only when this document was never fed. | tree, unmeasured | Likely cheap: the same gate for transactions (force only on first feed; the dirty flag covers new txs), and/or the shell keeps the old rows until the new burst is complete. Check that a filter change and a new tx still refresh. Then sweep for the same pattern on other tabs/screens |
| 12 | ★ **Account → Wallet (or → Chats) shows the previous screen for a moment; the open chat flickers through** (Damir, 2026-10-01: "feels broken"). Read from the tree: `settings.html` nav `onChange` sends `ixian:landtab:<id>` then `exitSettings()` → `ixian:back` → an IMMEDIATE pop. Only `contacts` uses the L14 cover handshake (`exitSettings('handoff')` → `popOnCoverPainted`, home answers `ixian:coverpainted` at the 2nd rAF). For a TAB the pop does not wait: the home shell's `showView` + its `ixian:tab:` echo (which runs the #897 sweep that closes the conversation) land AFTER Account is gone. Same class as #1077. | tree, unmeasured | (a) SMALL: route every tab hand-off through the existing handshake — `landOnTabNow` sends `ixian:coverpainted` at the 2nd rAF after `showView` (the `ixian:tab:` echo goes first through the serial outbox, so the sweep runs before the pop), and Account exits with `handoff`. Check the dirty `ixian:save:` path keeps its cleanup; fold lead 11 in (the wallet must not clear on landing). (b) LARGE, Damir's framing "Account is not a screen on its own": make Account a view inside the home WebView, like Contacts. Allowed by §1 (Account shows no untrusted content), but it moves SettingsPage's verbs into HomePage — architecture, BE eye, after freeze. Recommend (a) now, (b) as a post-v1 option |

## 4 · Already settled — do NOT reopen without new numbers

Bridge round trip 3–4 ms (direct channel dropped, #796) · one locale per shell and per-shell
bundle (5 ms / 17–19 ms, dropped or deferred) · chat pre-warm (#800) + batch transport (#801)
shipped · Account sublevels in-hub (#804) · bot-room chat info present-first (cdperf 2026-08-31).

## 5 · Method

Reuse the `[CDPERF]` / `[STARTDIAG]` stamp shape (temporary, removed after). Android in Release
+ `SpixiDevCoexist`. Frame data from recordings or Choreographer frames, not one probe run
(#803 (2): same-build spread was as wide as the effect). A/B against the parent build where the
question is "did we cause this".
