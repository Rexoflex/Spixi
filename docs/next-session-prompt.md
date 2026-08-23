# NEXT SESSION — entry prompt. Paste this.

**READ `docs/handoff-2026-08-24-overnight.md` FIRST. It is the whole brief.**
The session's job, set by Damir on 2026-08-23: **the OVERNIGHT v1 BATCHES W + A–E**
— ★ FIRST the wallet F5 follow-ups (`docs/f5-findings-2026-08-23-wallet-pass.md`:
the missing wallet-send.css link in chat.html is the verified root cause of the
unstyled in-chat compose) · then groups/info + the remove-contact data bug ·
requests lifecycle · account lifecycle + theme splash · missed-call notification ·
the menu batch if room. All dials are ALREADY ANSWERED (#532–#534) — build, do not
re-interview.
**LANGUAGE RULE: ASD-STE100 Simplified Technical English** — chat replies and code
comments.

## SETUP
```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
```
⚠ The wallet pass (#522–#531) must be IN the clone — check
`Spixi/Utils/SPayments.cs` exists. Missing → Damir has not pushed → STOP and say so.

**Verify before you touch anything. If any number differs, say so and STOP.**
bundle **277** · shells **18** · smoke **BASELINE OK 2823 / the 3 KNOWN**
(#136 · M5 · B3) · cs-syntax **143 + 1** · locales CLEAN · Ixian-Core `097341a`.

## THE WORK
Batches A–E per the handoff §1, priority cut §2. Verify-first everywhere. The #46
loop is OPUS-run per batch; builder never reviews own work; verdicts to disk with
the batch in the filename. DECISIONS rows (#535+) at decision time.
Handover-gate rows AS BUILT for every new verb/key/log line.

## DO-NOTs
1. No Ixian-Core changes (`097341a` frozen); core needs = BE row.
2. No re-interviewing settled dials (#532–#534 answered).
3. No half-landed batches — a batch that starts, finishes.
4. No new NuGet (#495). 5. No invented data (A1: a roster the protocol lacks is a
BE row, not a fake). 6. Bundle BEFORE shells, always.
7. v1.1 items stay OUT (Damir's list is the fence).

## DELIVERY
Cloud night. Land everything UNCOMMITTED via `_deliveries/` tarball + the bridge
when the desktop is online; `tar --overwrite`; VERIFY THE EXTRACT LANDED. Write:
the F5 checklist artifact (the Wallet Pass F5 pattern) · the morning handoff ·
the fresh next-session prompt. Never `git add -A`; `git push` does not work from
the bridge; `git --no-optional-locks` always.
