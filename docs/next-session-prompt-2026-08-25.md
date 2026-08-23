# NEXT SESSION — entry prompt. Paste this.

**READ `docs/handoff-2026-08-25-menu-requests.md` FIRST. It is the whole brief.**
Then `DECISIONS.md` rows **#517–#520** and `docs/opus-review-verdict-517-519.md` for
the loop that closed the last batch.
**LANGUAGE RULE: ASD-STE100 Simplified Technical English** — chat replies and code
comments. Damir re-confirmed it on 2026-08-22.

---

## SETUP

```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
npm install --no-save jsdom tree-sitter tree-sitter-c-sharp  # ONE call
```

⚠ **If Damir has NOT yet committed #517–#520, the clone does NOT carry the batch** —
it lives uncommitted on his disk. Ask first; if uncommitted, stage the changed files
from his disk instead of relying on the clone, or wait for his commit.

**Verify before you touch anything. If any number differs, say so and STOP.**

| Check | Expect |
|---|---|
| Ixian-Core | clean at `097341a` |
| `node scripts/generate-chat-pattern.mjs` | triangles **224×193.988** default |
| `node scripts/build-demo-bundle.mjs` | **275** exports |
| `node scripts/build-shells.mjs` | **18** shells |
| `node scripts/smoke-test.mjs` | **BASELINE OK 2766 pass / the 3 KNOWN** (#136 · M5 · B3) |
| `node scripts/cs-syntax-check.mjs` | **142** clean + **1** known gap |
| `node scripts/verify-locales.mjs` | ALL LOCALES CLEAN |

⚠ **2766, not 2691.** The #517–#520 batch added ~75 asserts.

## ★★ ASK DAMIR FIRST

1. **Has the #517–#520 batch been committed?** It was delivered UNCOMMITTED with a
   green pipeline; his F5
   (`docs/f5-checklist-2026-08-24-scroll-sounds-press.md`) gates the commit.
2. **Did the F5 pass?** The wallet-scroll rows (1.1–1.8) and the dark press
   visibility (3.4) carry dials that are his to call. A fail is a finding AND a pin
   gap — bring the log, not a guess.

## THE WORK, in priority order

0. **The #46 loop is run by OPUS models.** Builder never reviews its own work.
   #520 is the latest receipt: 7 MAJOR-class across 3 rounds, none reachable by
   self-review, two of them fixes eating their own tails.
1. **THE MENU BATCH** — handoff §2.1. Four calls, all Damir's. Anchored dropdown
   (mobile message menu + chats row menu) · deeper mobile scrim · desktop
   `[data-dt-ctx-source]` retune with **NO wash (#268)** · QR full bottom sheet
   folded with the existing explainer. Rider: dev HUD 72 px rail offset.
   ⚠ Press rows now carry `isolation: isolate` (#519) — re-verify any NEW lift
   against it.
2. **REQUESTS — the BE verb question FIRST** — handoff §2.2. Read `SpixiMessageCode`
   in Ixian-Core; do not touch it. One row, not three. No copy before the answer.
3. **CONTACTS BACK-STACK** — mechanism first (#294). The IA move stays parked.

## DO-NOTs

1. Do not touch Ixian-Core. 2. No desktop menu wash (#268). 3. No second
address-explainer surface. 4. No request-cancel copy before the BE answer.
5. Do not build the Contacts IA move. 6. Builder never reviews its own work.
7. Do not re-litigate the #519 dials without Galaxy numbers.

## STANDING RULES THAT EARNED THEIR PLACE

* ★★ A CSS pin that reads one rule in one file cannot pin a cascade — and the
  corpus now includes SHELL `<style>` blocks; keep it that way.
* ★★ PIN THE GUARANTEE, NOT THE SHAPE — and a REBASED pin is a NEW pin: mutate it
  again (#520: a widened regex window went vacuous and hid a defect class).
* ★★ A FIX CAN EAT ITS OWN TAIL — twice in one batch this round. Fresh reviewers
  exist for exactly this.
* ★ MUTATE BEFORE BELIEVING — 32 mutations this round; every pin earned its place.
* ★ A PASS IS NOT A PROOF. Read the screenshot or the log, not the tick.
* ★ A DEFECTIVE BRIEF IS THE NORMAL CASE — the handoff's own reserve prescription
  ("pad by exactly what the hero gives up") was wrong in a way only the loop found.
* ★ RESOLVE COLOUR DIALS AGAINST EVERY GROUND (#520: 1.000:1 on cards).
* ★ jsdom has NO ResizeObserver — stub it or RO code is unexecuted, unpinned code.
* ★ AN ACCEPTANCE TEST CAN BE THE LAST DEFECT — verify the arithmetic of your own
  probe claims (`range == max(top, maxPre − delta)`, invariant `range ≥ top`).
* ★ THE RUNNING APP IS NOT THE BUILD OUTPUT — `strings -el` (UTF-16), wipe
  `obj`/`bin` on any C# change (#387), process launched after the build.
* ⚠ VERIFY THE EXTRACT LANDED. ⚠ Never republish a live artifact from a stale copy.
* Bundle BEFORE shells. DECISIONS rows at decision time. Smoke as bookends.
  `git --no-optional-locks` always. Verdicts to disk WITH THE BATCH IN THE FILENAME.

## DELIVERY

Windows + PowerShell, Android on adb
(`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe` — not on PATH),
a Mac in the office for iOS. Land everything on his disk **UNCOMMITTED** with a full
green pipeline. **ONE step at a time and WAIT.** Expectations in a table **OUTSIDE**
the pasted block, with the NUMBER to expect. Check the device is attached BEFORE the
run step (#450). Android: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c
Release`, then `-t:Run` as a SEPARATE command (#320). Windows:
`-f net10.0-windows10.0.19041.0 -c Debug`, then the exe separately. Tarballs into
**`_deliveries/`**, NEVER the repo root; `tar` needs `--overwrite`. `device_bash` is
capped at 45 s — stage git adds in chunks of ~20. `mv` stranded `*.lock` files to
`_to_delete/`. `git push` does NOT work from the bridge. **Never `git add -A`** —
the tree carries CRLF-only churn on ~116 files.
