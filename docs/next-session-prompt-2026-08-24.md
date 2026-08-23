# NEXT SESSION — entry prompt. Paste this.

**READ `docs/handoff-2026-08-24-scroll-sounds-menu.md` FIRST. It is the whole brief.**
Then `DECISIONS.md` rows **#514, #515, #516**, and `docs/handoff-2026-08-23-loop-w46.md` for the
round that came before.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English** — chat replies and code comments.
Damir re-confirmed it on 2026-08-22.

---

## SETUP

```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
npm install --no-save jsdom tree-sitter tree-sitter-c-sharp  # ONE call
```

**Verify before you touch anything. If any number differs, say so and STOP.**

| Check | Expect |
|---|---|
| Ixian-Core | clean at `097341a` |
| `node scripts/generate-chat-pattern.mjs` | triangles **224×193.988** default |
| `node scripts/build-demo-bundle.mjs` | **275** exports |
| `node scripts/build-shells.mjs` | **18** shells |
| `node scripts/smoke-test.mjs` | **BASELINE OK 2691 pass / the 3 KNOWN** (#136 · M5 · B3) |
| `node scripts/cs-syntax-check.mjs` | **142** clean + **1** known gap |
| `node scripts/verify-locales.mjs` | ALL LOCALES CLEAN |

⚠ **2691, not 2580.** The last batch added ~111 asserts.

## ★★ ASK DAMIR THIS FIRST, BEFORE ANY WORK

**Has the #514–#516 batch been committed?** It passed a full device walk — 13 of 13, with the
app-lock bypass proven in the log — and it was left UNCOMMITTED on his disk. That pass describes
exactly those bytes. **Adding to that tree before it is committed makes everything he walked
unverified again.** His `git rm --cached spixi-*.tar.gz` (#513, his call, taken) belongs in the same
sitting as its own commit.

## THE WORK, in priority order

**0. THE #46 ADVERSARIAL LOOP IS RUN BY OPUS MODELS.** This work is built with Fable; the review is
not. Disjoint read-only auditors → verify each finding against the tree → disjoint fix owners → ONE
pin owner → **FRESH break-my-verdict reviewers over the fixes** → loop until clean. The builder never
reviews its own work. The last loop found **7 MAJORs in pass 1 and 7 more from the fresh
reviewers**, including a second bypass created by the fix for the first. See handoff §7.

**1. THE WALLET SCROLL OSCILLATOR** — handoff §1. Leads the batch. Mechanism is confirmed with
Damir: the hero is a SIBLING of the scroller, so collapsing it grows the scroller's viewport, drops
the maximum scroll offset, clamps `scrollTop` to 0, and `if (top <= 1) → expand` closes the loop.
Fix = **reserve the height** (measured, not guessed) **+ latch the collapse**. Not a one-liner.

**2. TRANSACTION SOUNDS OUT** — handoff §2. Damir's call. **BOTH** sounds, sent and received —
`transactionSent()` also fires on verification. This **REVERSES #506**; write the row as a design
reversal, not a bug fix.

**3. THE FOUR `Logging.info` CALLS ON THE SOUND PATH** — handoff §3. Owed since 2026-08-22. Cheap.
Now a belt rather than a diagnosis.

**4. PRESS FEEDBACK** — handoff §5c. Three findings: rows light up while scrolling (needs a delay
before PAINT, not a tighter threshold); the fill stalls halfway on Galaxy (**`background-size` is a
main-thread property** — move to a compositor one); the fill colour goes neutral, one level above the
idle row token. Item (ii) is its own scope — it touches three recorded rulings.

**5. THE MENU BATCH** — handoff §4. Four calls, all Damir's, all taken 2026-08-22. The anchored
dropdown lands on the z-order and lift work the last loop reviewed, so do not interleave it with
item 1.

**6. REQUESTS — ONE ROW, NOT THREE** — handoff §5b. Contact request, payment request and app invite
all share one defect: **a local removal cannot tell the peer.** Traced: `ixian:undorequest` →
`FriendList.removeFriend(friend)`, "**WITHOUT sendLeave**". ⚠ **Answer the BE question first** — does
`SpixiMessageCode` carry a withdraw/cancel verb? Read Ixian-Core; **do not touch it**. If the verbs
do not exist this is a BE row, and the only honest FE work is copy that does not lie.

**7. CONTACTS IN PREFERENCES — SPLIT IN TWO** — handoff §5a. The broken back-stack is a defect and
is buildable now (find the mechanism first, #294). Moving Contacts out of Settings is an IA decision
Damir has already parked until the account/peer screen exists — **record it and wait.**

## STILL OPEN

**A-6** (`(foreground)` in the Android log — owed three rounds, ten seconds to get) · the **sound
picks interview** Damir asked for · the **Android decrypt loop** (6,567 errors in 17.5 min —
observation, nothing built on it) · **BE-owned:** `OfflinePushMessages.cs:118` `HttpClient` with no
`Timeout` · **iOS #503** (`docs/ios-nse-spec.md` §2 is Damir's decision) · **`maxLogCount` = 5**
RELEASE BLOCKER · **W-3's repair path** never exercised · **MAJOR-6** unfixable on the managed
surface, do not "fix" it from reasoning.

## DO-NOTs

1. Do not touch Ixian-Core. Five smoke pins enforce `097341a`.
2. Do not add a backdrop wash to desktop contextual menus (#268, re-affirmed twice).
3. Do not build a second address-explainer surface — fold the existing one in.
4. Do not design the request-cancel copy before the BE verb question is answered.
5. Do not build the Contacts IA move — Damir parked it himself.
6. Do not let the builder review its own work.

## STANDING RULES THAT EARNED THEIR PLACE

* ★★ **A CSS PIN THAT READS ONE RULE IN ONE FILE CANNOT PIN A CASCADE.** One helper defect made
  three pins vacuous and hid a MAJOR for a whole batch.
* ★★ **PIN THE GUARANTEE, NOT THE SHAPE.** `catch (Exception beltEx) { throw; }` kept the shape,
  removed the guarantee, passed the whole suite.
* ★ **MUTATE BEFORE BELIEVING — and invent mutations the work order does not list.** 42 mutations
  against the last round's pins produced 16 greens, 14 of them real holes.
* ★ **A PASS IS NOT A PROOF.** Read the screenshot or the log, not the tick.
* ★ **ABSENCE OF A LINE IS NOT A DIAGNOSTIC.**
* ★ **A DEFECTIVE BRIEF IS THE NORMAL CASE.** Verify the premise — the wallet-scroll mechanism in
  this very handoff was wrong on the first reading and Damir corrected it.
* ★ **A FIX CAN TRADE ONE DEFECT FOR ANOTHER.**
* ★ **VERIFY AT SOURCE, and read the SHIPPING artifact.** `nuget.org` is 403 from the container but
  `raw.githubusercontent.com` answers — that is how the OneSignal ordering question was finally
  settled after two sessions of guessing.
* ★★ **THE RUNNING APP IS NOT THE BUILD OUTPUT.** Source new + assembly new + **process launched
  after the build**. Two device rounds were lost to this. Check the assembly with
  `strings -el`, **UTF-16 not ASCII**.
* ⚠ **VERIFY THE EXTRACT LANDED.** A tarball copied to disk but never unpacked cost a whole round.
* ⚠ **DO NOT REPUBLISH A LIVE ARTIFACT FROM A STALE LOCAL COPY** — it overwrites what the user has
  filled in.
* Bundle BEFORE shells. DECISIONS rows at decision time. Smoke as bookends. `git --no-optional-locks`
  always. **#387: wipe `obj`/`bin` on any C# change.**
* **WRITE THE VERDICT TO DISK (#459 ①) — and put the BATCH in the filename.** A date-only name
  clobbered another batch's verdict once.

## DELIVERY

Windows + PowerShell, Android on adb, a Mac in the office for iOS. Land everything on his disk
**UNCOMMITTED** with a full green pipeline. **ONE step at a time and WAIT.** Expectations in a table
**OUTSIDE** the pasted block, with the NUMBER to expect. `adb` is not on PATH:
`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`. Check the device is attached
BEFORE the run step (#450). Android:
`dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`, then `-t:Run` as a SEPARATE command
(#320). Windows: `-f net10.0-windows10.0.19041.0 -c Debug`, then the exe separately.

Land tarballs into **`_deliveries/`**, NEVER the repo root. `tar` needs `--overwrite`. `device_bash`
is capped at 45 s — stage git adds in chunks of ~20. Git strands `*.lock` files the bridge cannot
delete — `mv` them to `_to_delete/`. `git push` does NOT work from the bridge. **Never `git add -A`**
— the tree carries CRLF-only churn on ~116 files.
