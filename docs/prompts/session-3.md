Read CLAUDE.md, then docs/handoff-2026-10-02.md, then DECISIONS #1116 (6), #1117 (4), #1122, #1123 (the session-2 walk
+ the log analysis) and #1124 (Damir's in-chat media-tile idea). Next free DECISIONS number: #1126.
Already decided (do not re-open): #1101–#1123, #1125 (post-v1) · P-1 is WIDENED to the whole app's felt speed (#1122 (b), the folded
`docs/p1-scope.md` below) · the read-only-first method (Damir: "rank by risk, avoid anything that can break things", #782).
Open for the interview: #1124 · the E-W3 re-send · the G-3 150 s window. The office walk (Mac + iPhone,
`docs/walk-artifact-session2-office.html`) is NOT a blocker: when Damir gives its results, record them first (#1126+).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every
delivery · ★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit
message, commit-message file or PR text · verify every claim in the tree (#215) · mechanism first (#294): measure before a
lever · C# touches no risky parts · bridge protocol frozen · security handover gate · no Ixian-Core change.
★ MAC RE-SYNC: if I say I am on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): `git --no-optional-locks status` → no modified tracked files; the session-2 commit
("Session 2: chat-open hold, kept last seen, shared items, Mac fixes") and the #1123 walk commit are in `git log` and HEAD = origin/redesign/frontend;
`node scripts/smoke-test.mjs` → BASELINE OK 5089 / the 2 KNOWN (#136 · B3) and `node scripts/run-csh.mjs` → CSH pass=26.

## Outcome (O)
For: Spixi users and Damir. After this session Damir holds a MEASURED, ranked list of what makes the app feel slow, and
picks what to fix; nothing is changed before "go".
We know it worked when:
  - A table: every user-reachable transition × platform (Android Release + SpixiDevCoexist, Windows F5, iPhone, Mac) →
    tap-to-first-frame ms, frames dropped, any blank/flash frame. Stamps and frame data (recordings or Choreographer),
    not one probe run (#803 (2): the same-build spread was as wide as the effect). (DoD P-1)
  - The chat open headline: < 100 ms tap → first chat frame, no flicker — measured on all four, with the session-2
    G-1 `[CDPERF] chat held` lines as the Android baseline. (DoD P-1, G-1)
  - A ranked lever list (ms gained × certainty ÷ risk), each with its mechanism verified in the tree and the A/B against
    the parent build where the question is "did we cause this".
  - Part A: A1 logs `why=vsc frames≥1` on Android and a recording shows no plain/grey frame (G-1); A2–A4 picked from
    renders and built with pins + walk rows (G-4, G-5, G-6); A5 has a decision row (#1124).
  - Damir's picks recorded as DECISIONS rows; renders (both themes) for any visual dial (motion durations, the desktop
    chat-info pane).

## Scope
In: the 12 leads below + anything the measurement finds · Out: changing code before "go"; the BE-owned T1 rows; Core.

## Known leads (verify each in the tree first — #215) — folded from `docs/p1-scope.md` (Damir, 2026-10-01)
| # | Lead | Source | Status |
|---|---|---|---|
| 1 | Pages that still boot their OWN cold WebView on push: chat info (`ContactDetails`), Add contact, App details, legacy `wallet_recipient` / `settings_lock`. 130–230 ms each, main thread, in-process WebView on the Motorola | #803 (5), #804 | known, not fixed. Options: in-shell sublevel (the #804 way) or a pre-warm — each against SECURITY.md §1 (untrusted content keeps its own WebView) |
| 2 | Desktop gets ONE pre-warmed chat per session (chats are switched, never closed) → 87 ms once, then 178–241 ms | #803 (7) | design limit, not built |
| 3 | Waits on animation / handshake: bar reveal ≈240 ms — #1123: `[CALLPAINT] mode=bar fit=212–223ms via=resize` vs `full 42ms`, so the delay is the WebView RESIZE to 64 px; Account → Contacts shows the chats list mid-slide | #1115 A1, #1077 | #1077 open |
| 4 | Motion durations 200–300 ms (`--duration-200/300`, subscreen slide 300 ms). Fast apps ≈150–250 ms | `src/styles` tokens | never dialled — render options, Damir picks |
| 5 | Chats-list scroll stutter — INHERITED (the pre-redesign build stutters the same) | #803 (3) | cause never traced |
| 6 | `backdrop-filter` ×10 in the CSS — GPU cost on mid-range Android while scrolling | grep `src/` | unmeasured |
| 7 | No virtualization: long chat log, 500-member bot roster (roster burst not chunked) | cdperf-2026-08-29 §3 | unmeasured |
| 8 | Cold start ≈2 s Android Release; ~1.0 s is the FIRST WebView's engine init. Lever: create the home WebView in parallel with the node/wallet boot (ceiling ≈1.5 s) | #925 | named, not built; lifecycle design + BE |
| 9 | Build settings for walks and release: Release, AOT / profiled AOT, trimming — confirm what ships | #925 | check |
| 10 | ★ Desktop chat-info right pane feels sluggish and stuttery, does not "gently push" the chat (Damir). Tree: `HomePage.xaml.cs` opens it via `pushPageLoaded(new ContactDetails(…), … slideIn: true)` — a NEW cold WebView every open (lead 1) — and at present `ColumnDefinitions[2].Width` jumps 0 → 360 in ONE frame (`infoPaneCol2Pending` present branch). The conversation column snaps while only the overlay slides | tree, unmeasured | measure open ms + frames on Windows; render (a) animate the column width (a WebView2 re-layout per frame may itself stutter — measure) · (b) slide the pane OVER the chat, resize once at the end · (c) keep the pane's WebView warm while a chat is open (security check: same contact's data, own WebView) |
| 11 | ★ Wallet tab flickers its transactions on every visit (Damir). Tree: the `ixian:tab:` branch calls `loadTransactions(true)` for `tab2` — `forceRefresh` bypasses `UIHelpers.shouldRefreshTransactions`, so every visit sends `clearPaymentActivity` and re-pushes every row. The apps tab already has the fix: `loadApps(!appsPushedToShell)` | tree, unmeasured | likely cheap: the same gate (force only on first feed), and/or the shell keeps the rows until the burst completes; check a filter change and a new tx still refresh; sweep other tabs for the pattern |
| 12 | ★ Account → Wallet (or → Chats) shows the previous screen for a moment; the open chat flickers through (Damir: "feels broken"). Tree: `settings.html` nav `onChange` sends `ixian:landtab:<id>` then `exitSettings()` → `ixian:back` → an IMMEDIATE pop. Only `contacts` uses the L14 cover handshake (`exitSettings('handoff')` → `popOnCoverPainted`). For a TAB the home shell's `showView` + its `ixian:tab:` echo (the #897 sweep that closes the conversation) land AFTER Account is gone. Same class as #1077 | tree, unmeasured | (a) SMALL: every tab hand-off through the existing handshake (`landOnTabNow` → `ixian:coverpainted` at the 2nd rAF; Account exits with `handoff`); fold lead 11 in · (b) LARGE (post-v1 option): Account as a view inside the home WebView (allowed by §1, moves SettingsPage verbs into HomePage — architecture, BE eye) |
Already settled — do NOT reopen without new numbers: bridge round trip 3–4 ms (#796) · one locale per shell and the
per-shell bundle (dropped / deferred) · chat pre-warm (#800) + batch transport (#801) · Account sublevels in-hub (#804) ·
bot-room chat info present-first (cdperf 2026-08-31).
Method: reuse the `[CDPERF]` / `[STARTDIAG]` stamp shape (temporary, removed after). Android in Release +
`SpixiDevCoexist`. Frame data from recordings or Choreographer frames. Rule 3 of `docs/audit-refactor-plan.md`: tag every
finding FELT or INTERNAL; FELT ranks first at equal risk.

## Part A — session-2 walk follow-ups (#1123, #1124; Damir: "let the new session do the work")
| # | Item | Mechanism / input | Gate before build |
|---|---|---|---|
| A1 | ★ **G-1 hold never ran**: every open logs `chat held frames=0 ms=0 why=noview` | `holdStageUntilDrawn` (`SpixiContentPage.cs`) got no native WebView. The same cast works at `:311`, so `_webView` or `Handler` is null AT PRESENT time. Hypotheses: (a) the spare's WebView is not the target page's `_webView` yet; (b) the handler is disconnected while the WebView moves into the stage. #294: two guesses → ONE probe line first (which link is null + the PlatformView type name), Damir runs it, then the fix | probe log → fix → recording: `why=vsc frames≥1`, no plain/grey frame. This is the P-1 headline — do it with the chat-open measurement |
| A2 | G-4 pulse too short; barely visible on SENT bubbles | Damir: 3 s with a fade-out; maybe a 2 px glow; or a tinted bubble ground for 2.5 s | 3 renders on the BUILT chat shell, both themes, sent + received, file / photo / text; reduced motion; Damir picks |
| A3 | G-5 Downloads rows: one glyph for every file | reuse the chat's file-type badges (PNG, JPG, PDF …) — the SAME component, not a copy | render; pin |
| A4 | G-6 spacing + tap | the media grid has no side gutter (screenshot: it runs to the panel edge below inset cards; check the desktop pane too); the chips sit too close to the danger card; a tap on an image tile should offer Open | render (both themes, phone + desktop pane) → Damir; check the edge-to-edge choice of #1119 against the screenshot |
| A5 | #1124 in-chat media tiles + circular progress + Privacy switch | one feature: `c-fbubble` hands over to `c-mbubble` for images; glyph + ring while transferring; the preview when the file is local; default ON only for files already on the device | interview + renders + the 🟡 row / BE ask / gate row in session 3; BUILD in session 4 after the P-1 picks (lead 7 may change the chat row path) |
| A6 | Inherited, not FE: `missing encryption keys` every 2.5 s on Windows (`Ixian-Core/Streaming/PendingMessageProcessor.cs:423`) | BE row since 2026-09-28 | none — note it only if P-1 shows a cost |

## Reverse interview (R)
Before any measurement: read the code the leads name and Part A names. Part A order to confirm: A1 with the chat-open measurement; A2–A4 renders first; A5 renders + decision only. Ask "is this worth doing at all?" per lead (already done · cheaper
as a walk row · later). Then the method dials: which devices, Release vs Debug, how many runs per path, who records.
Do not start until I say "go".

## Generate, then grade (G)
Measurement first, a stamp set per path, the table. Levers: three options where real alternatives exist (renders on the
BUILT shell, both themes, for visual dials), graded, Damir picks, a DECISIONS row. Any probe code: every gate in
docs/process.md §G2 (smoke + `node scripts/run-csh.mjs`), pins with deliberate breaks, the #46 loop before delivery.

## Export (E)
DECISIONS rows · `docs/release-readiness.md` (P-1 + the leads as rows) · the measurement table as a doc · walk / measure
sheet · handoff · status-log entry · CLAUDE.md "Where we are now" replaced · lessons · `docs/commit-message-<batch>.txt`
(no attribution) · `docs/prompts/session-4.md` (the picked fixes) · skill proposals.
