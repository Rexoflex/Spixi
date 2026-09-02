# HANDOFF — SESSION H CLOSED: the slides, the roster, the 760 column, the A–H loop

★★ **Everything in `docs/prompt-session-h.md` shipped, the ⑥ Opus loop ran to CLEAN, and
NOTHING here has touched a device yet — Damir's F5 walk
(`docs/f5-checklist-session-h.md`) is the gate on all of it. Commit is his, one batch,
message in `docs/commit-message-session-h.txt`.**

## 0 · The numbers

```
bundle 317 · shells 18 · smoke BASELINE OK 3892 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 787 · i18n-lint ✓ · pseudo 9/9 · cs-syntax 140 clean + 1 known gap
extract-strings --check ✓ · build-shells --check ✓ · Ixian-Core 097341a untouched
```

★ Entry was **3831 (recorded) / 313 exports / "788" locales**. Two record corrections
(#723): locales are **787** (extract + verify agree on the committed tip; three docs
carried 788 forward — the #660 class), and **the #710 pin was RED in a clean clone**
(Session G regenerated icons.js but never icons.iife.js; local files hid it). The
structural cures are in: registry-equality gate + generate-icons read-back.

★ +60 pins net. Mutations: auditor C ran 14 against the suite/build (8/8 Session H pins
killed; the THREE survivors were the gate-layer holes, now closed), I ran 4 against the
fix round (4/4 killed), the reviewer re-killed the new gates twice.

## 1 · ⚠ WHAT NEEDS DAMIR

1. **The F5 walk** — `docs/f5-checklist-session-h.md`, Android first (§1–§4), then the
   Windows 760/§5 rows. The L8-arm row (double-back during a slide) and the
   peer-scoped-Pay row (§6) are the two that guard against regressions this session
   itself could have introduced.
2. **The [PAINTDIAG] readout (§3 of the checklist)** — four log lines from one
   Account→Contacts→Back round trip, both form factors. The L14 fix gets designed from
   those numbers and from nothing else (#688 falsified the last guess). The probes are
   pinned as a SET — when you've measured, the removal is one batch: two home.html
   emits, the HomePage handler, the two C# stamps, the pin.
3. **The URL-preview ruling** — `docs/url-preview-memo.md`. Recommendation: (a)
   sender-composed (Signal model, = be-cutover C14(a)), behind the #232 human-BE gate;
   (d) none until then. Nothing is built.
4. **The privacy wording pass (#730)** — `PRIVACY_DEFAULT` in launch-shell.js and
   §4.4 of `docs/legal/privacy-policy.md` are now honest AND platform-scoped, but the
   words are mine; the claim boundaries that must survive your rewrite are in the
   docblock at the const. The retention placeholder in the policy is still yours.
5. **Composer-pill dial** — renders sent in-chat. If dark still reads too quiet, the
   next step is ground #232833 (#724 names it).

## 2 · What shipped — the map

§① the in-shell subscreen slide (#725) · §② the skeleton roster (#726) · §③ [PAINTDIAG]
armed (#727) · §④ the URL-preview memo, decision only (#727) · §⑤b the 760 column
(#728) · icons 87→90 + wiring (#723) · the composer pill pair + thin scrollbar (#724) ·
★★ the ⑥ loop (#729, `docs/opus-review-verdict-session-h.md`) and the gate sweep
(#730, `docs/security-gate-sweep-642-722.md`). New BE rows: **CORE-7** (OfflinePush
returns true on its skip path) · **CORE-7b** (BotUsers writes the roster to disk under
its lock).

## 3 · ★★ THE RULES THIS SESSION PAID FOR

1. **A SURFACE THAT GAINS AN EXIT ANIMATION INHERITS THE L8 DOUBLE-BACK GUARD IN THE
   SAME BATCH.** I built the slide, reported "state first, pixels linger", and auditor A
   showed the state I moved WAS the back routing — a second back inside 220 ms
   backgrounded the app on three surfaces; the reviewer then found the fourth (settings)
   in MY FIX ROUND. The class the canon already knew (#646: fixes carry their own
   MAJORs) — it held at exactly the predicted rate.
2. **THE SUITE PROVED src/ AND TRUSTED THE ARTIFACTS.** Three mutations that ship a
   visibly broken app survived 3875 green assertions, all in one blind spot. A pin on
   source proves the source; only `--check` gates (rebuild-and-compare) prove what
   ships. They are in the suite now — never bypass them by rebuilding INSIDE a mutation
   copy and calling the kill a pass.
3. **AN ENUMERATED LIST IS FOUND BY THE NEXT REVIEWER (#658, again).** Per-glyph icon
   pins, per-shell DEFAULT pins, per-importer order pins — each replaced by one derived
   assertion this session. When a pin names instances, ask what rule generates them.
4. **AN UNDERSELL AND AN OVERSELL ARE THE SAME DEFECT ON A LEGAL SURFACE.** The privacy
   blurb claimed too little collection; my fix claimed a control that doesn't exist on
   desktop. Both caught by reading `pushProviderSupported()`, not the copy.
5. **THE RECORD LIES WHEN NOBODY RE-MEASURES IT.** 788 locales and a "green" #710 both
   travelled three documents. Verify the baseline in a CLEAN CLONE, not on the tree
   that made the numbers.

## 4 · Still open (unchanged from the last handoff unless noted)

- The iOS rows of the Session G walk (15–27, 37) — wait for the Mac session.
- Increment 3 unwalked on the phone (L4 back · Downloads/App-details confirm · GIF
  keyboard · keyboard↔tray) — now joined by this session's §1–§4 rows.
- `[EXCERPTDIAG]` (now capped at 12/process) and the Samsung LinkUri lines — next walk.
- The chat doodle pattern's ORIGIN (third-party-notices.md, still OPEN).
- The `ixian.0.log` from a failing lock session · the W-3.1 screenshot — still owed.
- B's logged-not-fixed suspicions: S-1 (roster replay via messageQueue on a reload
  path that doesn't exist today), S-2 (boot race, unconstructable), S-3 (receipt-storm
  doubling — wants a device measurement before anyone touches it).
- Session B's carried items: the sticky `.c-money-cta` under the iOS keyboard · the
  iOS menu re-anchor first-resize-only · the blind-group same-nick roster collapse ·
  the `[CDPERF]` probe stays until L10's family is closed (the #726 walk may close it).
- `Config.maxLogCount` = 5 — RELEASE BLOCKER row unchanged (reduce to 1 + retire the
  diagnostics before handover; the gate sweep lists the full set).

## 5 · Workflow notes for the next session

This session ran in the cloud container on a CLEAN CLONE (`/tmp/spixi`), gates in-container
(no bridge timeouts, no mount truncation), delivery as one tar extracted onto the mount
— that workflow held and is the recommended shape. Ixian-Core cloned as a sibling
(the M1 hold-out pins need it — a run WITHOUT it reads 3830/3890-11, not a real delta).
Never `git add -A`; `git --no-optional-locks status`; Windows builds with F5, not
`dotnet build` (#663).
