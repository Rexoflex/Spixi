Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend, Session H + the evening rulings committed. Ixian-Core is a SIBLING
clone at ..\Ixian-Core, frozen at 097341a.
READ docs/handoff-2026-09-01.md FIRST (it supersedes 08-31b), then
docs/fable-build-brief-premium-density.md WHOLE (§7 measurements · §8/§9 rulings), then
DECISIONS #723–#735. The Opus verdict (docs/opus-review-verdict-session-h.md) has three
MAJOR lessons — read them before touching the slide, the gates, or anything animated.

VERIFY THE BASELINE FIRST — clean clone, Linux container (npm i jsdom tree-sitter
tree-sitter-c-sharp), Ixian-Core sibling at 097341a. If any number differs, say so and STOP:
bundle 317 · shells 18 · smoke BASELINE OK 3892 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 787 · i18n-lint OK · pseudo 9/9 · cs-syntax 140 clean + 1 known gap
extract-strings --check OK · build-shells --check OK
Mutate in FULL tar copies, never cp -al. Bundle BEFORE shells, always. Measure the closing
number AFTER the last suite edit. Render before I rebuild — my eye rules every dial.

Then, in order:
① small walk fallout (#731/#733): the FULL legal docs in-app (bake docs/legal/*.md into the
   bundle at build time through openDocSheet; retire BOTH summaries — TERMS_DEFAULT still
   carries the false "no personal data" claim; name the one-paragraph dud's mechanism on
   device; ⚠ my retention placeholder gates the policy shipping) · the Spixi-bot dead
   address row in chat info;
② perf + motion, ONE cluster (#731/#735, measured facts in handoff §2): [CDPERF]-style
   stamps on SingleChatPage open FIRST (present vs the per-message replay) → the L10-shape
   fix if the stamps confirm → REMOVE the conversation from the mobile slide rule (#735①,
   amends #707 like #718) → the L14 cover-handshake (C# closes the Account pane ON the
   shell's cover-painted verb — the 56/88ms flash, gone) → retire the whole [PAINTDIAG]
   set in one batch (emits + handler + stamps + set-pin, pin rewritten as the reversal) →
   the SEED HARNESS (50 contacts + history through the REAL message store, compiled only
   under SpixiDevCoexist) and re-run the same stamps at 50;
③ ★ THE PREMIUM PASS — the session's centrepiece, brief = spec, EVERY dial ruled:
   measure my 12 screenshots properly (docs/reference-screens/premium/; read
   devicePixelRatio in-app first — my Edge 30 Fusion runs non-stock font/display size) →
   render sheets on the REAL components (bubble: lh/padding/tails/elevation/softened blue ·
   list+bars: avatar 54dp-class, names +1–2 weights both row types, chip weight, menus
   tighter · chat-info/account: TG-clean contact details, avatar treatment, card grammar +
   the Notifications regroup with state-neutral OneSignal copy · light canvas #EEECEF +
   #83058E@6% pattern+gradient default-ON · composer: ⊕ inside the pill, truly floating,
   caret-without-keyboard) → I pick per dial → ONE token batch, pins on every moved value,
   full gates, a walk checklist from the sheets;
④ my pending rulings as I give them (URL previews per docs/url-preview-memo.md · the
   privacy wording pass #730);
⑤ the iOS rows (Session G walk 15–27, 37) when I say I am on the Mac.
Commit is mine, in GitHub Desktop; write the message file and the handoff.
