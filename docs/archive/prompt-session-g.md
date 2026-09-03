# SESSION G — THE PRE-iPHONE SWEEP

Spixi frontend redesign. Repo: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`
Branch `redesign/frontend`. Ixian-Core is a SIBLING clone at `..\Ixian-Core`, frozen at `097341a`.
**Read `docs/handoff-2026-08-30.md` first, then this.**

★★ **THE GOAL OF THIS SESSION: land everything that must be right BEFORE iPhone testing.**
iOS is the last platform and the most expensive to re-walk, so anything that would make an
iPhone walk produce noise should be fixed first.

## VERIFY THE BASELINE, AND STOP IF ANY NUMBER DIFFERS
```
bundle 308 · shells 18 · smoke BASELINE OK 3716 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 780 · i18n-lint ✓ · pseudo 9/9 · cs-syntax 110 clean + 1 known gap
Ixian-Core 097341a (170 modified = CRLF churn; --ignore-cr-at-eol EMPTY)
```
⚠ **Run `cs-syntax-check` in a Linux container, not on the device VM** — it fails to build
tree-sitter there and gets recorded as SKIPPED. It is not broken.
⚠ Smoke takes ~4 min and the device bridge kills anything past 45 s. Run it in the container,
or `node scripts/smoke-test.mjs` locally in a real terminal.
★ **MEASURE THE CLOSING NUMBER AFTER THE LAST EDIT TO THE SUITE (#681).**

---

## ① FIRST — the four rulings in `handoff-2026-08-30.md` §1
Do not start building until these are answered; two of them change what you build.
`rsa2` retirement · `slide1Copy`/`aboutBody` copy · **the L9/L8 contradiction** · the
twelve translations.

## ①b ★★ TWO THINGS DAMIR REPORTED ON DEVICE THAT SESSION F DID **NOT** CLOSE
Both are from his 2026-08-30 walk. Neither is a regression; both are unfinished.

**① THE DARK DESKTOP CANVAS — ✅ CLOSED. Kept here because the DIAGNOSIS is the reusable part.**
Sampled off his screenshot: the rail is `#131821` (L* 8.14), the chat list `#11161f` (7.15),
the chat canvas `#111317` (5.84) at the bottom and 7.73 at the top. The cause is not
lightness, it is COLOUR FAMILY: `--surface-screen` in dark is `#10151e` (chroma **7.00**,
blue-tinted ink) and `--chat-canvas-base` is `#0f1115` (chroma **2.62**, near-neutral grey).
★ The old `.20` radial lift was HIDING it — it added enough blue that the canvas read as the
same family. Dropping to `.06` (#701, correct on its own terms) exposed the base over most
of the pane. **Mobile is unaffected because the canvas is full-bleed with no chrome beside it,
which is exactly why Damir sees it only on desktop.**
✅ **RULED AND LANDED 2026-08-30: option B, `#10151e` — the chrome's own `--surface-screen`.**
The bottom of the pane, where the radial fades out, now matches the rail and list exactly and
the lift reads as a rise off that same colour. Supersedes the #701 "leave the base at
`#0f1115`" ruling, which he made against a measurement about neutral01 LIGHTNESS with no
knowledge of the chrome adjacency. Pinned as a reversal with the #701 reasoning kept.

**② "You are now connected" does not appear on accept, then snaps in — STILL OPEN, and I
mis-diagnosed it once, so read this before touching it.**
FIXED already: the excerpt reads in the action colour and is TRUNCATED via `canonExcerptText`
(it was shipping the full 48-char address). Also fixed, though it is NOT Damir's case: the
accept pane inside the chat (`chat.html` `showRequestPane` → `ixian:accept`, reachable when a
request arrives while the chat is open — `SingleChatPage.xaml.cs:2263`) staged nothing in the
list, because the #109/CH2 "Establishing a quantum-secure handshake…" hold lives only in
home.html's REQUEST-CARD handler and the two shells share no JS (#221). It now writes
`spixi.hsstage.<addr>` and home.html consumes it over the same one-origin localStorage
grammar as the exdel hints — stale-guarded at 30 s and consumed on read.

⚠⚠ **WHAT IS ACTUALLY STILL BROKEN IS THE REQUESTER'S SIDE, AND IT NEEDS A REPRO BEFORE A
FIX.** Read Damir's screenshots: the row goes from **`4spozn…U6uArf` with an unread badge and
NO excerpt** to **`Androoo` with the connected line**. The NAME changing from address to
nickname is the tell — the nickname arrives with the handshake, so this device was the one
that SENT the request and was waiting for the peer, not the one that accepted. There is no
local staging on that path because the device took no action.
★ **DO NOT "fix" this by showing "Establishing…" whenever a row has an address-shaped name
and no excerpt.** That also describes a legitimately empty contact, and it would lie. Get the
repro first: which device, which screen was being watched, and whether C# pushes anything at
all between approval and the connected message. Damir has both devices, so he can drive it.
★ My first diagnosis said he had accepted from inside the chat. He corrected it — accept
lives in the chat LIST for his flow. Cost: one wrong fix that happened to be worth keeping.

## ①c ⚠ LANDED BUT NEVER SEEN ON HARDWARE — walk these before iOS
Damir walked most of the Aug batch, but these went in after his last build, or could not be
verified in a container at all:
1. **The Windows `.exe` icon** — judge in Explorer at Large/Medium/Small, NOT the taskbar
   (it caches a stale square). Does the `.exe` take the committed `.ico` or the resizetizer's?
2. **`OneSignal.ConsentRequired` / `ConsentGiven` compiling.** No NuGet egress in the
   container. Fallback spelling `OneSignalNative.` is written at the edit in `SPushService.cs`.
3. **The GIF keyboard actually inserting** — the regex fix is traced, not observed.
4. **Back closing a confirm in Downloads / App details** before the page pops.
5. **The Canvas tiles and the live ground refresh** — both fixed after his last Windows build.

## ② THE ACCOUNT / NAVIGATION DEFECTS (Damir, on device 2026-08-30)
These are the ones that will pollute an iPhone walk if left.
- **Contacts on mobile flickers.** On DESKTOP, opening Contacts leaves the right pane jumping
  to an open chat — **it should stay in the Account empty state.** ⚠ Ask Damir for the exact
  path if the repro is not obvious; #669 fixed a related rail/pane bug and its notes name the
  parked-peer re-present as the real mechanism (same one L14 describes).
- **CHATS or APPS → Account → Wallet shows a brief flash** of the previous screen. **Only in
  that order and only on Wallet.** That ordering is the clue — it is a state left behind by
  the first tab, not a Wallet bug.
- **L4 / OS back on create+restore.** Traced end-to-end in Session F and believed FIXED by
  #399; the log line `"LaunchPage back: view=… overlay=…"` is still there. **This is now an
  acceptance test, not a diagnosis** — one logcat walk closes it.

## ③ THE COMPOSER (Damir wants a PREVIEW before it is built)
- Attach sheet should open **under the composer**, WhatsApp-style, not over it.
- Move the **⊕** somewhere better.
- **Send button keeps its active colour always** — livelier than the current disabled grey.
★ **RENDER IT FIRST.** Damir asked explicitly to preview before building. The composer is
`src/components/composer.js`; the attach sheet is `openAttachSheet` in `chat.html`.

## ④ THE GESTURE BATCH — L3 · L9 (fable, together)
- **L3 swipe-back everywhere**: screens, sheets, dialogs, one level per gesture. `docs/swipe-back-spec.md`
  sizes it at ~55–60 surfaces and its headline finding is that **iOS raises no back signal at
  all** — which is why this belongs before the iPhone walk, not after.
  ★ Session F landed the two REACHABLE shells (`downloads`, `app_details`, both halves). The
  other seven are LATENT — measured: their mounted factories open no overlay — and each is
  the same paired JS+C# edit.
- **L9 slide-in for all subscreens** — blocked on the contradiction in §1③.

## ⑤ NOTIFICATIONS P2 — the push opt-out (Damir raised it again)
`docs/privacy-workorder-2026-08-29.md` §P2. A real user-facing switch in privacy settings:
skip Initialize when off, OptOut at runtime, a settings row, and per-platform copy across
twelve locales. **P1 (the pre-consent gate) already shipped** — this is the user choice, not
the leak fix. Costed and deliberately not built in Session F because it is a feature, not a
correctness fix, and the app was days from shipping.

## ⑥ THE GUI SWEEP
Missing icons, duplicate glyphs used for different meanings, anything that reads wrong.
★ There is precedent for this being real: #602/#621 found the two call glyphs SWAPPED, and
the fix had to reach `createCallBubble` as well as the excerpt map — one event, one glyph.

## ⑦ CARRIED, LOWER PRIORITY
- **`Package.appxmanifest`** points every Windows visual at eleven committed 2026-07-05
  bitmaps that nothing else references — the L17 shape. Unpackaged today
  (`WindowsPackageType=None`), so it bites when packaging is switched on.
- **The intensity-swatch boost** (`PATTERN_SWATCH_BOOST = 6`) was verified by RENDER at an
  alpha that no longer ships; the arithmetic still holds but the render was never repeated.
- **The legal documents** are written (`docs/legal/`) and NOT wired into `strings.termsBody` /
  `privacyBody`. Mechanical, deliberately deferred until the last placeholder closes.

---

## ★★ THE RULES THIS PROJECT KEEPS PAYING FOR
1. **TRACE WHAT THE PLATFORM ACTUALLY READS.** #684's entire premise dissolved on one read of
   `WebViewRenderer.cs`.
2. **CHECK A BLOCKING CLAIM AT SOURCE BEFORE REPEATING IT.**
3. **STRIP COMMENTS BEFORE ANY NEGATIVE SWEEP** — and XML comments are not JS comments.
   A `//`-stripper on an HTML file eats 62KB and everything after every `https://`.
4. **MUTATE EVERY PIN BEFORE BELIEVING IT, AND READ BOTH HOMES** — `src/` AND the built
   `Spixi/Resources/Raw/html/`. ★ A BARE KEY NAME IS A PREFIX TEST · BOUND A SLICE BY THE NEXT
   DECLARATION · A PIN'S TEXT GOES STALE LIKE A COMMENT.
   ⚠ The harness: `cp -al`, ONE edit per copy, `os.remove` before writing, three at a time.
   ★★ **KILL IS THE EXIT CODE, NEVER A SUBSTRING** — a pin message contains "BASELINE OK".
   ★★ **KEEP THE CONTROLS.** They are the only reason the broken harness was caught.
5. **A PIN THAT OUTLIVES ITS RULING IS HOW A DELIBERATE DECISION GETS "FIXED" BACK.** Retire
   pins AS reversals with the old ruling kept in the message. Session F retired six that way.
6. **MEASURE BEFORE ASSUMING, AND RENDER BEFORE HE REBUILDS.** A measurement has now
   overruled the obvious reading seven times (#294, #670, #688, #689, #701, the gradient
   midpoint, the dark bubble inversion). ★ And measurement overruled *me* on the gradient:
   OKLab was my hypothesis and it was WRONG.
7. **A VALUE THAT WORKS BY COINCIDENCE WILL BREAK WHEN THE COINCIDENCE DOES.** Pin the
   PROPERTY (an aspect ratio, a class), never the arrangement (a square, a sibling count).
8. **SIZE THE SESSION AROUND THE REVIEW, NOT THE ROWS.**
