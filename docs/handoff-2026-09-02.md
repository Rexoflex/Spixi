# HANDOFF — SESSION I (2026-09-02): the definitive read for Session J

★★ **This file SUPERSEDES every earlier handoff** (08-30, 08-31b, 09-01 are archived in
`docs/archive/`). Read this whole file, then `docs/fable-build-brief-premium-density.md`
§10 (the picks ledger with every reversal value), then DECISIONS #736–#747. The Opus
verdict (`docs/opus-review-verdict-session-h.md`) still carries the three MAJOR lessons.

## 0 · State and the numbers

Damir commits the WHOLE Session I batch (code + docs + 16 sheets) as ONE commit — the short
message is `docs/commit-message-session-i.txt`. After it, the tree at the tip must read:

```
bundle 319 · shells 18 · smoke BASELINE OK 3978 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 786 · i18n-lint ✓ (5 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check ✓ · build-shells --check ✓
build-legal-docs --check ✓ (terms baked · privacy HELD 🟡) · Ixian-Core 097341a untouched
```

Why the numbers moved: bundle 317 → 319 (`LEGAL_DOCS`, `timeOpts`) · locales 787 → 786
(two "Off: …" sub keys retired, one neutral key added) · cs-syntax 140 → 141
(`Utils/SDevSeed.cs`) · smoke +86 pins. Verify in a CLEAN CLONE with Ixian-Core as a
sibling; if any number differs, say so and STOP. ★ The C# of this batch COMPILED on
Damir's machine (Windows Debug + Android Release) — the compile gate passed.

## 1 · What Session I shipped (all built, all pinned, all walked)

① **Walk fallout (#737, #738):** the FULL legal documents bake from `docs/legal` at build
time (`scripts/lib/legal-docs.mjs`; `build-legal-docs --check` in-suite); Terms ships in
full, Privacy is HELD automatically while its two editorial markers stand; both hand
summaries retired; the A15 dud named. The Spixi-bot address row opens the address sheet.
The desktop unread strip runs pane-edge to scrollbar.

② **Perf + motion (#739–#741):** the L14 cover handshake (`ixian:handoff` → `onHandoff`
→ `ixian:coverpainted`, 400 ms backstop; **walk: no flash**) and [PAINTDIAG] retired as a
set · the conversation out of the mobile slide rule (**walk: "no stutter, some lag —
much better"**) · [CDPERF] chat-open ARMED (numbers not yet captured — see §2) · the seed
harness (About → Seed 50 / Remove, `SPIXI_DEV_COEXIST` only) · the slide+fade hybrid on
both slide systems (**walk: pass**).

③ **THE PREMIUM PASS (#742, #746):** 16 sheets → Damir's picks → one token batch (brief
§10). Bubble 100 → 80 px, tails + lift, #2160C2, Roboto tuned, 11 Medium timestamps AND
the device 12/24-hour setting (`hourCycle`), list names/chips/tx weights, avatar depth +
anchors + hero initials, the 48/56 canon, Notifications one card + neutral sub, canvas
#EEECEF + magenta pattern + wash, composer pill 46 with ⊕ inside and truly floating, menus
40, emoji stickers + flags, blue event excerpts, bot sender face, notification accent =
splash blue (#743). Four walk fixes the same evening (#746).

## 2 · ★★ THE WALK (#747) — 33 P · 7 F · 2 N/A — and what each FAIL is

| row | FAIL | mechanism (traced, not guessed) | size |
|---|---|---|---|
| A3/A4 | the lift is on TEXT bubbles only; call / app-invite / payment / file cards flat | typed-bubbles.css never reads `--bubble-elevation` | 1 line per card class |
| A7 | the chats-ROW timestamp still reads huge | only the in-bubble meta moved (11/14 Medium); the row's time is untouched | measure vs TG row, one token |
| A13 | Notifications = "cards within a big card" | `switchRow` returns `.c-settings__section`, which the notifs screen paints as a card of its own; inside the new `.c-settings__group` it must be flat | one selector |
| A14 | the light canvas is ugly (pass, but) | = #744: the k2 wash is invisible, the magenta is not what he wants; the whole light dial re-opens (ground · ink · wash · a swatch that can SHOW its option) | one render round, his pick |
| A15 | the ⊕ pressed state is a big disc that "doesn't fit the composer" | the press layer paints the 44 HIT box, not the 36 disc | clip the press `::before` to the disc |
| A19 ★ | the caret does not blink; **and keyboard ↔ ⊕ tray flickers again** (composer drops and rises) | ① Android WebView draws no caret for a focused field with `inputmode=none` (no IME, no caret) — #215: one more shape to try (programmatic selection after focus), else DROP the dial and say so. ② **REGRESSION of #721**: the tray now mounts inside the ABSOLUTE slot while the `--kb-inset` margin still transitions 280 ms; #721's seamless swap assumed the in-flow slot | ① device test · ② measure, re-base #721 on the floating slot |
| Account | "too tight within sections, too dense" (his screenshot) | the 48 canon on rows that ALL carry a sub-line | a third height: stacked rows 56 · single nav 48 · switch 56 — render, pick |

Also from the walk: **nothing reached logcat** (A26/A28 N/A, A30's `[L14]` line unread). Two
suspects, both removed by the capture recipe in `docs/f5-checklist-session-j.md`: PowerShell
block-buffers `findstr` on an endless pipe (and `/C:"[CDPERF]"` is still a regex class), and the
.NET Android console tag. **Capture to a FILE, grep after.** And the seed harness is too thin
for what he wants to measure: 2–40 messages per contact, "we must simulate 1000+" — v2 below.

## 3 · Session J's queue, in order

① **The seven walk fixes** (§2), smallest first: typed-card lift · the ⊕ press clip · the
   Notifications flat sections · the row-time token · the Account third height (render →
   pick) · the tray ↔ keyboard regression (device-measured, #721 re-based on the absolute
   slot) · the caret (one more shape, else drop). Then the light canvas round (#744/A14):
   ground · ink · wash · swatch, rendered together, his pick.
② **The numbers**: the logcat capture that works (file + grep), `[CDPERF]` at 3 and at
   load, `[L14]` — then **the L10-shape chat-open fix** only if the stamps say so ("some
   lag" says they will), then retire the [CDPERF] set (its pin becomes the reversal).
③ **Seed harness v2**: a count dial — 10 contacts × 1000 messages + 40 × 40, through the
   same Core calls (the store write of 10k messages is the cost to measure); "Seed 12" is
   today's longest (40), not Seed 08.
④ Walk fallout from his eye on the rest (every value has its reversal in the token comment).
⑤ The **TG-order chat-info rebuild** and the **secure-notice redesign** (both render rounds).
⑥ Pending rulings as they arrive: URL previews (`docs/url-preview-memo.md`) · privacy
   wording (#730) — the two markers in `privacy-policy.md` hold the full policy · "X left
   the group" (#215 device check first).
⑦ iOS rows (Session G walk 15–27, 37) when he says Mac — the caret + composer rows too.

## 4 · LAUNCH STATUS — what is still missing (against `docs/launch-worklist-2026-08-29.md`)

Sessions A–I delivered L1 · L2 · L5 · L6 · L7 · L8 · L9 · L10 · L11 · L13 · L14 (the
handshake) · L15 · L16 · L17 · L18 · the 760 column · the premium pass. **Open:**

- **L3 swipe-back everywhere** (mobile; the iOS signal #706 exists, the gesture rule is
  `docs/swipe-back-spec.md`) and **L4** (welcome OS-back; #714 fixed the root cause — the
  iPhone walk confirms).
- **L12** the bot-room half of kick/ban — needs an ADMIN account on Damir's side.
- **GIFs** (keyboard + pasted page links) — DEFERRED by Damir to a later version.
- **The nine iOS rows** (Session G walk 15–27, 37) — the office Mac.
- **Two BE/Core rows** (payment-request excerpt CORE-2, the 6-member group delivery repro).
- **Damir's inputs**: the privacy retention line + the §4.4 note (holds the full policy in-app) ·
  the URL-preview ruling · the light-canvas ruling · the `LinkUri is null` logcat line (#294).
- **Release hardening sweep** (one session, last): retire [LANDTAB] · [EXCERPTDIAG] ·
  [CDPERF] (after the fix) · `maxLogCount=5` · `SpixiDevCoexist` (five csproj lines +
  `SDevSeed.cs` + the SettingsPage blocks + the About card) · the store keystore.
- Then the **Opus adversarial loop over Sessions I–J** (the #46 rule: every batch of this
  size gets one before it ships) and the security gate sweep.

## 5 · Rules and workflow (unchanged, load-bearing)

Clean-clone gates in a Linux container (npm i jsdom tree-sitter tree-sitter-c-sharp;
Ixian-Core sibling at 097341a) · mutate in FULL tar copies, never cp -al · **bundle
BEFORE shells, always** (the bundle build bakes the legal docs first) · measure the closing
number AFTER the last suite edit · render before Damir rebuilds; his eye rules every dial ·
commit is Damir's, one batch, in GitHub Desktop; never `git add -A`; `git
--no-optional-locks status` on the mount · delivery from the container = tars extracted
onto the mount (`tar --overwrite`), `_to_delete_*` for anything the bridge cannot delete.
**Windows builds from PowerShell**: `dotnet build … -f net10.0-windows10.0.19041.0
-p:Platform=x64` (never `-t:Run` on this target, #663), then copy `Resources\Raw\*`
beside the exe and start it — the recipe is in `docs/f5-checklist-session-j.md`. Android:
`dotnet build … -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run`, installs
over Spixi Dev. The render-sheet generator (Playwright over the real bundle, Roboto
installed, variants as scoped CSS) is described in #742 — rebuild it from that description.
