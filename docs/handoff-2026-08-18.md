# Handoff — 2026-08-18 (post-N4, UPDATED IN PLACE after the #380 F5 pass). READ FIRST.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Supersedes `docs/archive/handoff-2026-08-17g.md` (consumed by the N4 session).
★ Planning doc: `docs/master-worklist-2026-08-17.md` (N4 struck 2026-08-18 —
R2 fully closed). Open tally: **~28 N-items** (5 fix-first + N60/N61 · 15 round
items · 9 dials — the #378 launch-set dial is NEW) + the §B carryovers (D-9 ·
D1+N6 · I-1 · I-9 · I-10 · I-12) + D-17b.

**★ #380 SESSION BUDGET MODE (Damir, standing):** sessions are scoped SMALL.
One Opus review round, only when C#/money/data paths changed. Smoke as
BOOKENDS (baseline + final) + ONE batched mutation-proof run. No agent
fan-outs for non-drafting work. If an item balloons: STOP at triage doc +
plan, hand off, do not build.

---

## 1. State — verify, do not trust

```
git --no-optional-locks log --oneline -3
git --no-optional-locks status --porcelain
```

The N4 batch (#378–#379) is COMMITTED by Damir on top of `646ef4e9`, plus a
small doc followup (#380 verdict + this rewrite) — the followup should be at
HEAD when you read this; VERIFY the chain reaches `646ef4e9` → `5fa908b6`
(the #375–#377 batch). **F5 #380: PASS — Damir: "all works" on Android AND
Windows** (12 + 4 legs, no failure reported; the one deploy hitch was XA0010
= no device attached, not the app). `docs/f5-checklist-2026-08-18-n4.md` is
CONSUMED — archive it at the next batch commit.

| Item | Value |
|---|---|
| N4 | **BUILT (#378/#379).** 13 locales live: 8 + it-it/id-id/lt-lt/cn-cn/ja-jp. Dictionary + `Utils.cs` gate + BOTH pickers moved together; `setDocLang` maps cn-cn → zh-cn (document locale only). Drafts = machine, native review OPEN (`docs/n4-review-notes.md`) |
| Riders | id-id Pay/Request legacy SWAP fixed (money-direction) · id-id de-shouted (~33 values) · 18 rework-era legacy ids drafted into the 5 lang txts · variant cultures (it-ch) now resolve to the FILE code (`SpixiLocalization` + S3 push) |
| ④ | Overflow audit: `scripts/i18n-overflow-audit.mjs` (now a smoke GATE). 29 breakers fixed at source; 72 near-misses = device watch-list (`docs/n4-overflow-audit.md`) |
| Loop | #46 on Opus, 3 rounds: r1 audit (1 MAJOR + 4 MINOR found+fixed) · r2 reviewer PASS + residuals fixed · r3 verdict **CLEAN**. All new pins mutation-proven (10 mutations, every pin fired) |
| Smoke | **BASELINE OK 1947 / the 4 KNOWN pre-existers (#136 · #149③ · M5 · B3)** — was 1903; +44 = locale-list extensions + N4 gates. lint ✓ · pseudo 9/9 · locales ALL CLEAN 13/13 · overflow NO BREAKERS · NUL clean |
| Security | Gate section #379 written (`docs/security-handover-gate.md`): the batch introduces NO verb, key, sink, fetch, or WebView setting |
| ★ N57 | UNCHANGED — Core-side, protocol run still Damir's TOP action (17g §2.1 stands verbatim) |

## 2. Damir — the short list

1. **★ Run the N57 protocol** (`docs/n57-triage-group-visibility.md` §2) —
   unchanged, still the top action. Then send the BE engineer be-cutover
   `[Q1-ESC]` + `[NT1]` + the N57 verdict row.
2. **N60:** NOT reproduced on the N4 update-over-install (no
   `INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Keep one configuration per test
   device; keep watching every Android deploy.
3. **Dial (#378): the launch language set.** Proposal = the 13 live + tr,
   pl, ko, vi, uk (18 total); ar/he/fa deferred (RTL pass needed). Each new
   language costs ~713 FE + ~593 legacy drafted + review. Answer before any
   dictionary beyond the five is built. Full table: `docs/n4-locale-audit.md` ②.
4. **Native review of the 5 machine drafts** — when you have reviewers, hand
   them `docs/n4-review-notes.md` + `src/strings/draft/<code>.json`.
5. **Dials still open (log answers, no build until given):** N56 wash values ·
   N61 backup scope · contact_new post-pop feedback · blind-bubble avatar
   photos (#372) · N48 chip on non-blind heros (#370) · ru/lt legacy dashes
   (#371 — NOTE: the two FEEDER lines were swept in N4, the broad sweep stays
   open) · N3 voice-sweep target list · the A2 fallback · zh→cn-cn C# map
   (#378 rider: Chinese OS auto-detect lands on en-us today; manual pick works).

## 3. NEXT SESSION — N13 + N40 triage ONLY (#380 budget mode)

`docs/next-session-prompt.md` is the paste-ready prompt. Scope is PINNED and
SMALL: **N13 build** (onboarding "Back up now" does nothing at account
creation — data-loss class) + **N40 triage/protocol ONLY** (no build; the
verdict may be "Damir repro session needed"). NOTHING else: N10 · N15 · N39
queue for the session after, then the rounds R3 → R4 → R7 → R6 → R8 → R5 →
R9 per worklist §F. N61 rides R4. N57 stays Core-side — wait for the
protocol verdict.

## 4. How to work — unchanged, one addition

Cloud twin recipe: clone/tar → checkout the batch commit → `npm install jsdom
--no-save` → bundle BEFORE shells → smoke green at **1947/4** (state the number
when it moves). String-change pipeline: extract → build-locales →
build-strings-iife → (bundle → shells) → verify-locales + i18n-lint + pseudo +
**i18n-overflow-audit** (NEW — also runs inside smoke). Standing set: verify
plans against code (#215) · #294 · mutation-honest pins, PROVEN · Damir
commits · DECISIONS rows at decision time · the #46 loop on Opus (#352) · the
security handover gate while building (#379 section = latest template) ·
tarball delivery (plain `tar xzf` in PowerShell; the mount cannot unlink;
`git --no-optional-locks` always). Ixian-Core reference: `097341a`. Deploy:
wipe obj/bin → Android `dotnet build Spixi\Spixi.csproj -f net10.0-android -c
Release -t:Run` · Windows two-step: `dotnet build ... -f
net10.0-windows10.0.19041.0 -c Debug` then run the exe (⚠ `-t:Run` does NOT
chain the build on Windows). ⚠ C# changed in this batch (Utils.cs ·
SpixiLocalization.cs · SettingsPage.xaml.cs) → the obj/bin wipe is REQUIRED.

## 5. THE DEFERRED PILE — one pass, later (17g §5 stands, plus N4 residuals)

17g §5 verbatim (N13 🔴 top · D-17b · N40 · N10 · N46 ★ · N47 · legs 29–30 ·
the log-onlys · the #376 folds). N4 adds (all logged in #379): the 7 older
locales' ALL-CAPS badge values (ABGELEHNT class — next copy round; switch the
smoke isShout pins to \p{Lu} when they join) · appDetails renders as a brand
line in all 13 locales · ru chat-modal-tip-custom shortening renames the
Custom tier too · a pre-fix persisted variant pref ("it-ch") cannot self-heal
from the picker (inert current row) · overflow near-miss watch-list (72) ·
legacy-only shout pairs (settings-lock-locked · address-gen-2, orphaned page).

## 6. Do not re-attempt — 17f/17g §6 stand verbatim, plus:

- The N3a dash gates now hold ALL 12 built sets + 9 feeder files. New locale
  copy NEVER ships an em/en dash.
- A locale exists ONLY as the full set: dictionary + build-locales/iife LANGS +
  Utils.cs gate case + BOTH picker rows — the four-list smoke pin fails on any
  partial add. Do not add a picker row ahead of its dictionary.
- cn-cn is a FILE code: dictionary keys stay cn-cn end-to-end; only
  `setDocLang` maps the document locale to zh-cn. Do not "fix" lookups to zh.
- The five drafts are legacy-register matched (it=tu · id=Anda · lt=jūs ·
  cn=您 · ja=です/ます). Do not restyle register without the native dial.
- id-id legacy was the caps outlier and is now sentence-case per en canon —
  do not "restore" caps from an old diff.
