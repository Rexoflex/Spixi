# Handoff — READ FIRST. State after the #517–#520 batch (scroll · sounds · press).

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** Damir re-confirmed 2026-08-22.
★ Entry prompt: `docs/next-session-prompt-2026-08-25.md`.
★ Previous handoff: `docs/handoff-2026-08-24-scroll-sounds-menu.md` (items 1–4 are DONE).
DECISIONS **#517** (wallet scroll) · **#518** (sound reversal + belt) · **#519** (press trio)
· **#520** (the loop — 3 rounds, 7 MAJOR-class total, read it before touching these areas).

---

## 0. Where things stand in one paragraph

Items 1–4 of the 2026-08-24 handoff are BUILT, loop-CLEAN after three rounds, and
delivered UNCOMMITTED to Damir's disk with a full green pipeline: bundle **275** ·
shells **18** · smoke **BASELINE OK 2766 / the 3 KNOWN (#136 · M5 · B3)** · cs-syntax
**142 + 1** · locales **ALL CLEAN**. ⚠ The smoke number is **2766**, not 2691 — this
batch added ~75 asserts. ★ **Damir's F5 PASSED 2026-08-23 — 29/29, 0 fail** (`docs/f5-verdict-2026-08-24-scroll-sounds-press.md`); no dials called. The #514–#516 batch WAS
committed and pushed before this batch started (`e1237928` + `8f2773ed` + `f29b344e`,
tarball untracking included) — verify the new batch sits on top of `f29b344e`
uncommitted before you add anything.

## 1. ★ FIRST: has Damir committed #517–#520?

Same rule as last time. The batch passed the loop AND the device walk (29/29). Order:
HE commits → only then new work on these files. His commit should include the whole delivery (source + generated).

## 2. THE WORK, in priority order

**0. The #46 loop stays OPUS-run** (#520 has the receipts: 4 MAJOR pass 1, 3 more
from fresh reviewers — including two fixes eating their own tails and one of MY pin
rebases going vacuous. The builder never reviews its own work.)

**1. THE MENU BATCH** — unblocked, not started. All four calls are Damir's
(2026-08-22): (a) mobile ANCHORED DROPDOWN for the message menu AND the chats row
menu (`desktop-anchors.js` has `anchorSheetAbove`; fixes 4.1 structurally);
(b) the lift STAYS, mobile scrim one level deeper (`--surface-scrim`, 0.6 today);
(c) desktop: **#268 STANDS — no wash**; retune or drop `[data-dt-ctx-source]`;
(d) the QR opens a FULL BOTTOM SHEET folded with the existing "What is this
address?" explainer — ONE surface (#443/#453). Rider: the dev HUD 72 px rail offset.
⚠ The #517 batch did NOT touch the menu z-order work, so the sequencing warning from
the last handoff is satisfied — the anchored dropdown lands on reviewed ground.
⚠ NEW ground to respect: every press-row family now carries `isolation: isolate`
(#519) — the lift/scrim work must re-verify z-order against that (the loop verified
today's surfaces; a NEW lift on a row family is the case to check).

**2. REQUESTS — answer the BE question FIRST** (handoff-2026-08-24 §5b, unchanged):
does `SpixiMessageCode` in Ixian-Core carry a withdraw/cancel verb for a contact
request / payment request / app invite? READ Ixian-Core (frozen at `097341a`), do not
touch it. Verbs exist → FE+C# row. No verbs → BE row; the only honest FE work is
copy that does not lie. ONE row, not three. Do not design copy before the answer.

**3. CONTACTS BACK-STACK** (§5a(i)): find the mechanism first (#294) — why does Back
from Contacts (entered from Settings) land in Chats? Do not build past it.
(ii) the IA move stays PARKED by Damir until the account/peer screen exists.

## 3. STILL OPEN (carried, unchanged unless noted)

* **The press-feedback dials** are now Damir's F5 calls: the 70 ms paint delay, the
  5% alpha wash (dark visibility on the Galaxy), the fade-phase re-press trade
  (#519/#520 accepted residuals).
* **The sound-picks interview** — Damir said "later" when offered 2026-08-23.
* **A-6** (the corrected repro: foreground + airplane-mode window) · the **Android
  decrypt loop** (observation only) · **BE-owned** `OfflinePushMessages.cs:118`
  HttpClient no Timeout · **iOS #503** (`docs/ios-nse-spec.md` §2 is Damir's
  decision) · **`maxLogCount` = 5** RELEASE BLOCKER · **W-3's repair path** never
  exercised · **MAJOR-6** unfixable on the managed surface.

## 4. DO-NOTs

1. Do not touch Ixian-Core (five smoke pins enforce `097341a`).
2. Do not add a desktop menu backdrop wash (#268, thrice affirmed).
3. Do not build a second address-explainer surface — fold the existing one in.
4. Do not design request-cancel copy before the BE verb answer.
5. Do not build the Contacts IA move.
6. Do not let the builder review its own work.
7. Do not re-litigate the #519 dials without the Galaxy numbers — each is one
   constant, and the F5 checklist names them.

## 5. Rules that earned their place THIS round (add to the standing set)

* ★★ **A FIX CAN EAT ITS OWN TAIL, TWICE IN ONE BATCH:** the measurement probe for
  the clamp fix performed the clamp; the deficit fix's "zero reserve" broke the belt
  that read zero as unset. Fresh reviewers found both; the builder found neither.
* ★★ **A REBASED PIN IS A NEW PIN AND MUST BE MUTATION-PROVEN AGAIN.** My widened
  regex window swallowed the very anchor it existed to hold — the defect could
  return with a green suite. Index arithmetic beats windowed regex for ORDER pins.
* ★ **RESOLVE A COLOUR DIAL AGAINST EVERY GROUND IT SITS ON.** "One level above
  idle" was resolved against the screen; four of eight families sit on cards where
  the result was 1.000:1 — invisible on touch, fine on desktop, i.e. invisible in
  exactly the review that would pass it.
* ★ **jsdom HAS NO ResizeObserver** — RO-dependent code is unexecuted, unpinned code
  until the fixture stubs it. Two limbs of the wallet fix were invisible that way.
* ★ **AN ACCEPTANCE TEST CAN BE THE LAST DEFECT:** the probe arithmetic shipped
  wrong twice and would have failed a CORRECT build on device. r3's honest form:
  `range == max(top, maxPre − delta)`, invariant `range ≥ top`.

## 6. Delivery (unchanged rules)

Windows + PowerShell, Android on adb
(`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`), a Mac for iOS.
Land everything UNCOMMITTED, full green pipeline, ONE step at a time and WAIT,
expectations OUTSIDE the pasted block with the NUMBER to expect. Tarballs into
`_deliveries/` only; `tar --overwrite`; VERIFY THE EXTRACT LANDED. `device_bash` is
capped at 45 s; stage git adds in chunks of ~20; `mv` stranded `*.lock` to
`_to_delete/`; `git push` does not work from the bridge; **never `git add -A`**
(CRLF churn on ~116 files). **Wipe `obj`/`bin` on any C# change (#387)** — this
batch changed five C# files. Bundle BEFORE shells, always.
