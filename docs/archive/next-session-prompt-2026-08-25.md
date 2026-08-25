# NEXT SESSION — entry prompt. Paste this.

**READ `docs/handoff-2026-08-26-wallet-send.md` FIRST. It is the whole brief.**
The session's job, set by Damir on 2026-08-23: **finalize the WALLET SEND flow** —
and it STARTS WITH AN INTERVIEW (*"we need to talk about that"*), not with code.
Then `docs/wallet-parity-analysis.md`, DECISIONS **#232 · #255 · #517–#521**, and
`docs/opus-review-verdict-517-519.md` for the last loop.
**LANGUAGE RULE: ASD-STE100 Simplified Technical English** — chat replies and code
comments. Damir re-confirmed it on 2026-08-22.

---

## SETUP

```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
npm install --no-save jsdom tree-sitter tree-sitter-c-sharp  # ONE call
```

⚠ #517–#520 are committed; **#521 (sound picks) + the wallet-send handoff docs ride
a follow-up commit** — confirm with Damir that it is pushed before trusting the
clone; if not, stage the 7 changed files from his disk.

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

## ★★ THE INTERVIEW FIRST — handoff §1, the six calls only Damir can make

Finalize-scope · the W5 verb + native confirm (+PA1?) · the W6 fee push · the
recipient picker (retire `WalletRecipientPage`? unlocks create-group #256) · who
writes the money C# (#232's human-BE gate stands) · scan-to-send dials.
**Every answer = a DECISIONS row (#522+), written at decision time.**

## THE BUILD, after the interview (handoff §2)

1. **#255 roster filter FIRST** — groups must never appear as money recipients.
2. **W6 fee push** (small C#). 3. **W5 signed hand-off** (C# signs + NATIVE confirm
+ ack push; the WebView composes only — SECURITY.md is the wall). 4. Flip
`composeSend`, F5. 5. **The #46 loop, OPUS-run** — money surface, not optional; the
security-handover-gate row is written WHILE building; the BE engineer sees the
money-path delta before it ships.

## DO-NOTs

1. WebView never signs, never sees keys, no confirm past the native step.
2. No Ixian-Core changes (`097341a` frozen); core needs = BE row.
3. No `composeSend` flip before the #255 filter is F5'd. 4. No invented fee.
5. No new NuGet. 6. Builder never reviews its own work.
7. The menu batch, the request-verb question and the contacts back-stack stay
   QUEUED behind this pass (`docs/handoff-2026-08-25-menu-requests.md`).

## STANDING RULES THAT EARNED THEIR PLACE

★★ A CSS pin cannot pin a cascade from one rule in one file (corpus includes shell
`<style>` blocks — keep it). ★★ Pin the guarantee, not the shape; a REBASED pin is a
NEW pin — mutate it again. ★★ A fix can eat its own tail — twice in one batch last
round; fresh reviewers exist for this. ★ Mutate before believing; invent mutations
the work order does not list. ★ A pass is not a proof — read the log, not the tick.
★ A defective brief is the normal case — verify premises at source
(`raw.githubusercontent.com` answers when nuget.org 403s). ★ Resolve colour dials
against every ground. ★ jsdom has no ResizeObserver — stub it or RO code is
unpinned. ★ An acceptance test can be the last defect — check your own arithmetic.
★ THE RUNNING APP IS NOT THE BUILD OUTPUT — wipe `obj`/`bin` on C# change (#387),
relaunch, probe the assembly byte-level (a naive UTF-16 decode misses odd-offset
strings — the corrected probe scans both alignments). ⚠ Verify the extract landed.
⚠ Never republish a live artifact from a stale copy. Bundle BEFORE shells. DECISIONS
rows at decision time. Verdicts to disk WITH THE BATCH IN THE FILENAME.

## DELIVERY

Windows + PowerShell, Galaxy on adb
(`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe` — not on PATH),
Mac in the office for iOS. Land on his disk **UNCOMMITTED**, full green pipeline.
**ONE step at a time and WAIT.** Expectations OUTSIDE the pasted block, with the
NUMBER to expect. Device attached BEFORE the run step (#450). Android: build, then
`-t:Run` as a SEPARATE command (#320). Windows: `-f net10.0-windows10.0.19041.0 -c
Debug`, exe separately. Tarballs into **`_deliveries/`** only; `tar --overwrite`.
`device_bash` 45 s cap — git adds in chunks of ~20. `mv` stranded `*.lock` to
`_to_delete/`. `git push` does NOT work from the bridge. **Never `git add -A`.**
