Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend, Session I committed. Ixian-Core is a SIBLING clone at
..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-02.md FIRST (it supersedes every earlier handoff), then
docs/fable-build-brief-premium-density.md §10 (the picks ledger — every value has its
reversal in the token comment), then DECISIONS #736–#747. The Opus verdict
(docs/opus-review-verdict-session-h.md) still has the three MAJOR lessons — read them
before touching the slide, the gates, or anything animated.

VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp), Ixian-Core sibling at 097341a. If any number differs, say so and STOP:
bundle 319 · shells 18 · smoke BASELINE OK 3978 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 786 · i18n-lint OK (5 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check OK · build-shells --check OK
build-legal-docs --check OK (terms baked · privacy HELD)
Mutate in FULL tar copies, never cp -al. Bundle BEFORE shells, always. Measure the closing
number AFTER the last suite edit. Render before I rebuild — my eye rules every dial.

Then, in order (handoff §3 has the mechanisms, all traced on my walk, #747):
① THE SEVEN WALK FIXES, smallest first: typed-card lift (call/app-invite/payment/file
   never read --bubble-elevation) · the ⊕ pressed state clipped to the 36 disc · the
   Notifications screen's sections flat inside the group ("cards within a card") · the
   chats-ROW timestamp (still huge — measure vs TG, one token) · Account "too dense": a
   THIRD row height for stacked rows (render → I pick) · ★ the keyboard ↔ ⊕ tray
   flicker is BACK (regression of #721 under the floating slot — measure on device,
   re-base #721 on the absolute slot) · the caret-without-keyboard does not blink on
   Android WebView (one more shape, else drop it and say so).
   Then the LIGHT CANVAS round (#744/A14): ground · ink · wash · a swatch that can show
   its option — rendered together, I pick. I will also give you the colour I want.
② THE NUMBERS: the logcat capture that works (docs/f5-checklist-session-j.md — to a
   FILE, grep after; findstr on an endless pipe showed nothing) → [CDPERF] at 3 and at
   load, [L14] → the L10-shape chat-open fix ONLY if the stamps say so → retire the
   [CDPERF] set (the pin becomes its reversal).
③ SEED HARNESS v2: a count dial — 10 contacts × 1000 messages + 40 × 40 (I want a real
   load, not 2–40); measure the store write; "Seed 12" is the longest today.
④ Walk fallout from my eye on the rest (reversals in the token comments).
⑤ The TG-order chat-info rebuild + the secure-notice redesign — render rounds, I pick.
⑥ My pending rulings as I give them (URL previews · privacy wording · "left the group").
⑦ The iOS rows (Session G walk 15–27, 37) when I say I am on the Mac.
Commit is mine, in GitHub Desktop; write the message file, the handoff, and the walk
artifact (clickable, P/F/N per row, copyable results) — plus the PowerShell build blocks
in docs/f5-checklist-session-j.md (Windows: dotnet build -p:Platform=x64, copy Raw beside
the exe, start it — never -t:Run; Android: the Release SpixiDevCoexist build over Spixi Dev).
