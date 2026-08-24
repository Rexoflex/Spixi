# NEXT SESSION — entry prompt. Paste this.

**READ `docs/handoff-2026-08-25-morning.md` FIRST (state + the F5 result), then
`docs/f5-findings-2026-08-24-overnight.md` (the fix list, mechanisms named), then
`docs/handoff-2026-08-25-menu-requests.md` §2 (Batch E).**
The job, in this order: **① THE F5 FIXES (F5-1..F5-6, priority order in the findings
doc §last)** — the restore race (EnsureNodeRunning guard), the untagged missed-call
poster, the bot-removal crash (Damir's logcat names it; without a logcat, build the
diagnostic and say so), the picker/sheet styling, the Max dial (ONE question) —
**② BATCH E, the menu batch** (#551): (a) anchored dropdown for the message menu +
chats row menu on mobile · (b) mobile scrim one level deeper · (c) desktop #268
stands, retune `[data-dt-ctx-source]` · (d) Account QR sheet = REUSE
`openAddressSheet` (do NOT build a second sheet) + the dev-HUD 72 px rail offset
rider. ⚠ Re-verify z-order against the #519 `isolation: isolate` press layers.
All dials are answered (#532–#534, #552) — build, do not re-interview.
**LANGUAGE RULE: ASD-STE100 Simplified Technical English** — chat replies and code
comments.

## SETUP
```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
```
⚠ The overnight batches (#535–#552) must be IN the clone — check
`Spixi/Utils/SContacts.cs` exists. Missing → Damir has not pushed the overnight
commit (`docs/commit-2026-08-24-overnight.txt` has the staging list) → STOP and say so.

**Verify before you touch anything. If any number differs, say so and STOP.**
bundle **291** · shells **18** · smoke **BASELINE OK 2996 / the 3 KNOWN**
(#136 · M5 · B3) · cs-syntax **144 + 1** · locales CLEAN · Ixian-Core `097341a`.

## THE WORK
Verify-first everywhere (#294/#215) — F5-1 and F5-2 in particular need the mechanism
CONFIRMED (a log line / a repro) before the fix is called done. DECISIONS rows
(#553+) at decision time. Handover-gate rows AS BUILT for every new verb/key/log
line. The #46 loop is OPUS-run (F5 fixes + Batch E can share one loop), builder
never reviews own work, verdict to disk with the batch in the filename. Mutate
before believing. The smoke number will move — record the new baseline.

## DO-NOTs
1. No Ixian-Core changes (`097341a` frozen); core needs = BE row
   (`security-review-for-be-engineer.md` §1e is the current list).
2. No re-interviewing settled dials. F5-6 (the Max hint) is the ONE open question.
3. No half-landed batches — a batch that starts, finishes.
4. No new NuGet (#495). 5. No invented data.
6. Bundle BEFORE shells, always. 7. v1.1 items stay OUT.
8. Do NOT rebuild the address sheet — reuse `openAddressSheet` (wallet-receive.js).
9. Windows runs via TWO commands (build, then the exe) — `-t:Run` hits MSB3073/9009.

## DELIVERY
Same as the overnight (the #398 precedent): everything UNCOMMITTED via a
`_deliveries/` tarball + the bridge when the desktop is online; `tar --overwrite`;
VERIFY THE EXTRACT LANDED (hash the extracted files against the cloud tree). Write:
the F5 checklist for this batch (fresh artifact, per-item notes) · the handoff ·
the fresh next-session prompt · the prepared commit message. `git --no-optional-locks`
always · never `git add -A` (`_scratch/` is untracked and must stay out) · `git push`
does not work from the bridge. If the bridge is offline, hold the tarball and say so.
