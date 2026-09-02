# HANDOFF — SESSION H + THE EVENING (2026-08-31): the definitive read for Session I

★★ **This file SUPERSEDES `docs/handoff-2026-08-31b.md`** (kept as the session-close
record — this one adds the walk, the [PAINTDIAG] measurements, and the evening's
thirteen rulings). Read this whole file, then `docs/fable-build-brief-premium-density.md`
(the pass you will build — §7/§8/§9 are measurements + every ruling), then DECISIONS
#723–#735. The review verdict is `docs/opus-review-verdict-session-h.md`; the security
sweep `docs/security-gate-sweep-642-722.md`.

## 0 · State and the numbers

Damir commits the WHOLE batch (code + docs + screenshots) as ONE commit — message in
`docs/commit-message-session-h.txt`. After it, the tree at the tip must read:

```
bundle 317 · shells 18 · smoke BASELINE OK 3892 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 787 · i18n-lint ✓ · pseudo 9/9 · cs-syntax 140 clean + 1 known gap
extract-strings --check ✓ · build-shells --check ✓ · Ixian-Core 097341a untouched
```

Verify in a CLEAN CLONE with Ixian-Core as a sibling (a run without it reads 3892−11).
If any number differs, say so and STOP. If the commit has NOT landed, the ~70-file
batch is uncommitted on Damir's tree — do not build on top without saying so.

## 1 · Session H shipped, and the walk PASSED it

The queue (#723–#730): the in-shell subscreen slide (all four surfaces, native
300/220) · the skeleton roster (40 ms leading paint + 24-row batches, C# chunked) ·
[PAINTDIAG] armed · the URL-preview memo (decision only) · the 760 column · the
composer pill pair + thin scrollbar · icons 90 · ★ the A–H Opus loop (3 MAJORs fixed —
read the verdict's lessons before touching the slide or the gates) · the gate sweep
(privacy copy honest + platform-scoped).

**Damir's device walk: 21 PASS · 1 FAIL · 0 N/A (#731).** Every ★ regression guard
green. The one FAIL (A15, the legal sheets) became ruling #733. Late riders landed the
same evening: dev-coexist (#732 — test builds beside legacy on his Motorola, "Spixi
Dev", remove-at-release via `grep SpixiDevCoexist`) and the derived provider authority
(#734, after `INSTALL_FAILED_CONFLICTING_PROVIDER`).

## 2 · ★★ THE MEASURED FACTS Session I builds from

1. **[PAINTDIAG], Android (#731):** way-in flash = **56/88 ms** of visible chat list.
   Mechanism exact: the shell consumes the hand-off BEFORE C# closes the Account pane,
   but the cover takes 104–109 ms to paint and C# tears the pane down 20–50 ms into
   the build. **Fix: a handshake — promote the cover emit to a real verb; C# closes
   the pane ON cover-painted, not on exit.** Way-back clean (9→4 ms). Windows way-in
   already clean (cover precedes close by ~90 ms); the wide way-back is unstamped —
   add one stamp only if Damir still sees it. THEN retire the whole [PAINTDIAG] set in
   ONE batch (two home.html emits, the HomePage handler, two C# stamps, the set-pin —
   rewrite the pin as the reversal).
2. **Release perf (#735 context):** overall ok; **CHAT OPEN stutters** ("like a game on
   a bad computer") and the conversation's native slide plays as a jump-to-end.
   Instrument SingleChatPage open [CDPERF]-style BEFORE code: present timestamp vs the
   per-message replay marshals. Likely one mechanism (replay starves the UI thread);
   likely fix shape = the L10/#726 treatment (present → post → chunk). The stamps rule.
3. **Density measurements (brief §7):** our single-line bubble is **+22% taller than
   WhatsApp's** and +13% vs Telegram on the same screen; composer +11–20%; the CHATS
   LIST pitch is fine — it wants a BIGGER avatar (TG 54dp vs our ~46) and stronger
   names, not tighter rows. ⚠ Verify the §1 line-height claim against tokens.css
   before moving anything, and read `devicePixelRatio` in-app first — Damir's Edge 30
   Fusion runs NON-STOCK font/display size.

## 3 · ★★ EVERY DIAL IS RULED — the premium pass builds, it does not ask

`docs/fable-build-brief-premium-density.md` §4/§5/§8/§9 is the complete ledger
(#733/#735). Headlines: the CONVERSATION leaves the mobile slide rule (amends #707 the
way #718 did — remove it with the perf item) · light chat canvas **#EEECEF + pattern
ink #83058E @ 6%, pattern AND gradient default-ON in light** (render + contrast-check
vs the N81/N82 history before locking) · bubble TAILS · bubble subtle elevation
(render vs the #427 hairline history) · names +1–2 weights on chat AND tx rows,
references run list nicknames smaller-but-bolder · sent-blue softened REVERSIBLY ·
filter-chip weight up · ⊕ back INSIDE the pill · caret-without-keyboard on entry
(inputmode=none trick, verify both WebViews) · the composer truly FLOATS (messages
pass under; --composer-h is published) · menus/dropdowns tighter (one shared-grammar
sweep) · blue event-excerpt canon (+ "left the group" needs a #215 verify) · emoji-only
= sticker + the flag-emoji detector fix · nameless bot senders in the nickname face ·
contact details redesigned to TG's cleanliness + the gradient-avatar review ("our
avatars seem a bit off") · Notifications screen regrouped into Account's card grammar
+ the OneSignal sub-label made state-neutral (keep #712's claim boundaries; locales
re-drafted) · the FULL legal documents in-app (bake docs/legal at build time through
openDocSheet; both hand-written summaries retire — TERMS_DEFAULT still carries the
false no-data claim). 12 reference screenshots in `docs/reference-screens/premium/`.
Method unchanged: measure → render sheets on the REAL components → Damir picks per
dial → ONE token batch → pins → gates.

## 4 · ⚠ What still needs Damir (nothing blocks the start)

- The **URL-preview ruling** (`docs/url-preview-memo.md`) and the **privacy wording
  pass** (#730) — whenever he rules; the legal-docs build (#733) needs his retention
  placeholder filled BEFORE the policy ships in-app.
- The GIF keyboard's `LinkUri is null (mime…)` logcat line at its next failure —
  no code before that line exists (#294).
- iOS rows (Session G walk 15–27, 37) — when he says Mac.

## 5 · Session I's queue, in order

① Small walk fallout: legal docs in-app (#733, incl. naming the one-paragraph dud's
   mechanism on device) · the Spixi-bot dead address row · [EXCERPTDIAG]/LinkUri stay
   waiting on logs.
② Perf + motion, one cluster: chat-open stamps → the L10-shape fix if confirmed →
   REMOVE the conversation slide (#735①) → the L14 cover-handshake → retire
   [PAINTDIAG] as a set. (The seed harness — 50 contacts + history through the REAL
   message store, compiled only under SpixiDevCoexist — follows the stamps, §prompt.)
③ ★ THE PREMIUM PASS (§3 above; the brief is the spec). Biggest single session win.
④ Damir's pending rulings as they arrive (URL previews · privacy wording).
⑤ iOS rows when on the Mac.

## 6 · Rules and workflow (unchanged, load-bearing)

Clean-clone gates in a Linux container (npm i jsdom tree-sitter tree-sitter-c-sharp;
Ixian-Core sibling at 097341a) · mutate in FULL tar copies, never cp -al · bundle
BEFORE shells, always · measure the closing number AFTER the last suite edit · render
before Damir rebuilds; his eye rules every dial · commit is Damir's, one batch, in
GitHub Desktop; never `git add -A`; `git --no-optional-locks status` on the mount ·
delivery from the container = one tar extracted onto the mount (`tar --overwrite`),
`_to_delete_*` for anything the bridge cannot delete · the diagnostics ([PAINTDIAG] ·
[LANDTAB] · [EXCERPTDIAG] · [CDPERF]) and `maxLogCount=5` and `SpixiDevCoexist` all
retire before release — the gate sweep holds the list.
