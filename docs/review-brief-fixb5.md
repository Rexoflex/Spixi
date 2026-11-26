# Review brief — fixb5, the page batch (DECISIONS #1990–#2009)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5 when the
loop closes (#660). Prompt: project doc `claude/session-fixb5-prompt.md`; contract: `docs/contract-fixb5.md`.

## 1 · What the batch is
| Item | What landed | Where (files) | Ruling |
|---|---|---|---|
| 1 | "Protect your account" with the keyboard open (Android): the round picture hides, the title gets small, both password fields AND the button show above the keyboard; the first field's Next / Enter moves to the second field (Android and iPhone; the desktop returns early: Enter keeps the focus on Windows and Mac); the layout does not change without a keyboard | `src/shells/launch.html`, `src/styles/components/launch-form.css`; pins `pins-fixb5/d-protect-keyboard` (+ by hand `d-protect-keyboard-render.mjs`, Chromium) | #1837 |
| 2 | Slide 4 title "Play together." under a NEW key `slide4Title3` in the 14 locales (`slide4Title2` removed, as #1848 did) | `src/components/launch-shell.js` (1 line), `src/strings/draft/*.json` (+ generated tables); pin `pins-fixb5/c-slide4` | #1833 |
| 3 | NOT BUILT — stopped with a question (contract § 7) | — | #1825 (4) |
| 4 | The add-contact chooser's `onDismiss` clears the handle only when it is its own | `src/bridge/contacts-page.js`; pin `pins-fixb5/a-chooser` | #1877 |
| 5 | `lock.html` latches "revealed" only when the form exists: an early `setAuthPending("False")` can no longer strand the form | `src/shells/lock.html`; pin `pins-fixb5/b-lock`; packet P105 | #1924, #1844 (6) |
| 6 | `OpusCodecFactory.AttemptToUseNativeLibrary = false` before each of the two factory calls (decoder, encoder), every platform; switch `OpusManagedOnly` | `Spixi/VoIP/OpusDecoder.cs`, `Spixi/VoIP/OpusEncoder.cs`, `Spixi/Utils/SpixiFlags.cs` (`SmallFixFlags`); pin `pins-fixb5/f-opus-managed`; CSH `OpusManagedTests` (over `StubsOpus.cs`, a model of upstream's check); packet P103 | #1905, #1844 (3) |
| 7 | Two of the three small fixes: the Home decline also runs `SContacts.scheduleSentSweep()` and `ChatMediaStore.deleteChat` (switch `DeclineClears`); `sendContactRequestGuarded` logs the exception TYPE (no switch, a hole fix). The undo (`SingleChatPage.xaml.cs`, the chat page C# of session `quotebox`) and the two `pendingDeletion` re-adds (`ContactNewPage.xaml.cs`, `SpixiContentPage.cs` outside the named line) are NOT built: the prompt's file areas do not hold them (a question) | `Spixi/Pages/Home/HomePage.xaml.cs` (+2), `Spixi/Utils/SpixiContentPage.cs` (1 changed); pin `pins-fixb5/e-small-fixes`; packet P104; the gate doc | #1963 (5) |
| 8 | The lock page's "Unknown localization key; …": the key was the literal `…` of a comment (`*SL{…}`); the comment is reworded | `src/shells/lock.html`; pin `pins-fixb5/b-lock-keys` | MC `n-20261125-lock-page-unknown-l10n-key` |
| 9 | The main chat's rows #1839–#1844, #1960–#1964 copied word for word after #1838; their index lines; the two #1420–#1423 lines (#1839 (1)); `docs/walk-launch.md` `ixian.cfg` lines + LW-DEF-W4 / -A2 / -A3 / -A4C walked (#1839 (3)) | `DECISIONS.md`, `docs/decisions-index.md`, `docs/walk-launch.md` | #1839 |
Re-based pins (each named in the handoff): `pins-fixb1/g-sparekeep` (the SpixiFlags.cs hash), `pins-lockb/b-csharp` (b7 cuts the new block), `pins-photo1a/b-store` (b1: the decline now calls `deleteChat`), `pins-s20f/l-slides` (the slide-4 key), `pins-on1/ring-geometry.json` (hashed inputs; the geometry equal), `pins-fixb4/c-keyboard-render.mjs` (by hand; two rows follow #1837).

## 2 · How to run
- Tree: cloud twin of `work/fixb5` (base `0eda93f5` "Merge pull request #28 from Rexoflex/work/walktools2"), the working-tree
  diff against `HEAD` (= the base) · `../Ixian-Core` @ `097341a` · tools by `npm ci` · `TZ=America/Los_Angeles`.
- Pipeline: FULL (bundle before shells) · smoke before: `BASELINE OK 7054 / the 2 KNOWN` · CSH 908.
- Pins: `node scripts/run-pins.mjs pins-fixb5/<a-chooser|b-lock|b-lock-keys|c-slide4|d-protect-keyboard|e-small-fixes|f-opus-managed>`;
  `node scripts/run-csh.mjs`; `node scripts/cs-syntax-check.mjs`. Chromium by hand:
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb5/d-protect-keyboard-render.mjs`.
- Known failures: the 2 KNOWN (#136 · B3). C# outside the harness is ⚠ UNCOMPILED (the Windows job of `redesign-ci`).

## 3 · Auditor scopes (round 1; disjoint)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Fable 5.2 | the whole diff, security only | the ★ rules (isolation, C# touches no risky parts, frozen bridge), the gate triggers (keys, settings, sinks, fetches, log lines), what a peer or a page can reach |
| R | Fable 5.2 | items 6 and 5 (the riskiest files): `OpusDecoder.cs`, `OpusEncoder.cs`, `SmallFixFlags`, `StubsOpus.cs` / `OpusManagedTests.cs`, `f-opus-managed`, P103 · `lock.html`, `b-lock`, P105 | can a peer's voice data still reach a native decoder (any path, any order, any thread, the switch OFF / ON, the upstream source)? can the lock form still be hidden for good (any push order)? |
| A | Opus | item 7: `HomePage.xaml.cs`, `SpixiContentPage.cs`, `SmallFixFlags`, `e-small-fixes`, P104, the gate doc's lists | the twin copied right (calls, order, threads, exceptions); the switch; the pin's breaks |
| B | Opus | items 1, 2, 4, 8: `launch.html`, `launch-form.css`, `launch-shell.js`, the locale tables, `contacts-page.js`, the lock comment; pins a, b-lock-keys, c, d + the render | behaviour in both themes, desktop / iPhone unchanged, the copy and claims rules in each locale, each pin fails for the right reason |
| C | Opus | item 9 + the record: the 11 copied rows byte for byte against `/mnt/project/claude_talk-rulings-*.md`, the index lines, `walk-launch.md`, the contract, the packets' facts | word for word, place, nothing else changed; facts true in the tree |
A source-text pin states its limits in its first version; a gap of the stated class is a NIT, not a MAJOR (#1735).

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · WebView composes, C# signs · no WebView path into a file op · no URL,
  address, name or text in logs · bundle BEFORE shells · no new verb, push name or argument shape · one switch per change
  with the old path (#1478) · the size rule R1–R6 (#1963 (8)).
- Accepted (do not re-open): #1837 (the compact header, the button stays) · #1833 ("Play together.") · #1924's direction ·
  #1844 (3) (the line is ours) · #1963 (5) (the three fixes; their file areas are a question here, not a finding) ·
  #1964 (1), (2).

## 5 · Verdict
**CLEAN at r3** — MAJOR per round: **3 → 0 → 0**. Readers (all fresh, read-only; none saw the builders' context): r1 S (Fable 5.2,
security-only, whole diff) · R (Fable 5.2, items 6 and 5) · A (Opus, item 7) · B (Opus, items 1, 2, 4, 8) · C (Opus, item 9 and the
record); r2 X (Fable 5.2, security-only over the final tree + items 6 and 5) · Y (Opus, item 1 as fixed + the docs); r3 W (Fable 5.2,
security-only over the final tree) · Z (Opus, item 1's round-2 changes + the docs). Their texts: `/home/claude/review/r<n>/<reader>.md`
(the cloud twin; the counts and the findings are summarised here).

| Round | MAJOR | MINOR | NIT | Fixed in the next fix round / recorded |
|---|---|---|---|---|
| r1 | 3 (B-M1 a tap on the button lost to the relayout · B-M2 the nav-bar pad dropped, the button 36 px under the keyboard · C-M1 walk A-BUILD could not show the lazy `[FLAGS]` line) | 14 | 24 | all MAJOR fixed; MINOR fixed but: S-1 / A-1 gate 18's `LEGACY_G3` entry (recorded, owed: outside the one registration block; the docs say so; pin e3 holds the site) |
| r2 | 0 | 5 (X-m1 P105 lacked the deleted line · Y-1 the pair reveal hid the focused field on a tall keyboard · Y-2 the iPhone Enter move landed out of view · Y-3 / Y-4 walk A-4 words and emulator steps) | 7 | all fixed; X-n1 the voicefix probe recorded (owed) |
| r3 | 0 | 4 (W-m1 the BE doc's Voice fix addendum is stale · Z-m1 no iPhone row · Z-m2 the 1 px budget at 360 × 640 · Z-m3 the gate-doc wording, also W-n1) | 7 | doc corrections after the last reader (permitted): Z-m1 → walk I-1 (Apple phase), Z-m2 → walk A-4 + #1990, Z-m3 / W-n1 → the gate doc; W-m1 recorded (owed: `docs/security-review-for-be-engineer.md` is outside the file areas) |

NITs recorded, not fixed (each with its direction): W-n2 a held hardware Enter moves to the confirm field, whose existing Enter
submits what the user typed twice (direction: `&& !e.repeat` at `launch-shell.js:1482` / `:1419`) · Z-n1 no pin row for the
`!resizeModel` guard of the iPhone reveal (direction: in d (4) on the Android UA stub `scrollIntoView` and assert 0 calls) · A-N3 the
re-base notes of three older pins carry a date and a batch name (#1596 convention) · R-n6's limit: a per-key throwing store is not
modelled (stated in P103). The code files are committed as the last readers read them (SHA-256 in the handoff).
