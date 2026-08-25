# Handoff — READ FIRST. The WALLET SEND pass (Damir's call, 2026-08-23).

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**
★ Entry prompt: `docs/next-session-prompt-2026-08-25.md`.
★ Damir, verbatim: *"I want to finalize the Wallet - send flow, so we need to talk
about that in the next session."* — the session STARTS with the interview, then builds.
★ Pre-reads, in order: `docs/wallet-parity-analysis.md` (#264 — the whole map) ·
DECISIONS **#232** (wallet-send-last strategy + the human-BE gate) · **#255** (the
roster-filter prerequisite) · `SECURITY.md` + the CLAUDE.md "C# TOUCHES NO RISKY
PARTS" block · `docs/security-handover-gate.md` (the lens applies WHILE building) ·
be-cutover rows **W5, W6, W9** · #517–#521 for the state of the wallet tab itself.
★ The 2026-08-25 menu handoff (`docs/handoff-2026-08-25-menu-requests.md`) is NOT
dead — its menu batch and the BE-verb/contacts items move to AFTER the wallet pass.

---

## 0. Where things stand in one paragraph

#517–#520 (scroll · sounds · press) PASSED Damir's F5 29/29 and are COMMITTED; #521
(his sound picks: `minimal/queued` + `minimal/warning` at −16 dBFS) rides the
follow-up commit. Baseline: bundle **275** · shells **18** · smoke **2766 / the 3
KNOWN** · cs-syntax **142+1** · locales CLEAN. The wallet SEND surface is BUILT and
wired (`createWalletSend` compose→review→confirm, `src/shells/home.html:2163-2190`)
but **capability-gated OFF** (`composeSend`) — today the Send button delegates to the
legacy native `ixian:sendixi` flow. Everything that remains is deliberate: the signed
hand-off verb, the fee push, and the roster filter.

## 1. ★★ THE INTERVIEW FIRST — the calls only Damir can make

Do not build before these are answered. Money surface: every answer becomes a
DECISIONS row (#522+).

1. **What does "finalize" mean?** Flip `composeSend` (in-page compose → review →
   C#-signed confirm) and RETIRE `WalletSendPage`/`WalletSend2Page` at the repoint —
   or keep the native flow and only polish it? The parity doc assumes the former.
2. **W5, the verb shape:** proposed `ixian:signSend:<addr>:<amount>` → C# signs +
   NATIVE confirm + broadcast, with an ACK push so the review's done/fail is real.
   ⚠ SECURITY.md: the WebView composes, ONLY C# signs — and a tx composed in the
   WebView must get a **native confirm** (CLAUDE.md hard rule). Does the native
   confirm also carry the payment-auth gate (be-cutover **PA1**)?
3. **W6, the fee push:** shape and cadence (on tab2 load / balance tick). Money math
   must not ship on the `WALLET_FEE_ESTIMATE` placeholder (0).
4. **The recipient picker:** in-shell picker now (retiring `WalletRecipientPage`) —
   which also unlocks the parked create-group flow (#256) — or keep native for v1?
5. **Who writes the C#?** #232 gates money C# on HUMAN BE REVIEW. The session can
   build W5/W6 (HomePage dispatch + `Node.sendTransactionFrom` + native confirm),
   but the security-review doc must carry it and the BE engineer must see it BEFORE
   it ships to users. Confirm Damir wants us to build it now vs hand BE a work order.
6. **Scan routing:** `ixian:quickscan` → address fill into the compose (wired,
   rides W5). Any dial on scan-to-send behaviour?

## 2. THE BUILD, in order (after the interview)

1. **#255 PREREQUISITE FIRST:** `createWalletSend` consumes the UNFILTERED roster —
   groups would appear as MONEY RECIPIENTS. Filter (the Q5 people-only grammar
   already exists for W8's request strip at `home.html`) + pending badge, BEFORE the
   gate flips. This is FE-only and safe to build the moment the interview ends.
2. **W6 fee push** (small C#) → the review's fee + total lines go real.
3. **W5 signed hand-off** (C#: new `HomePage.onNavigating` branch → native confirm →
   sign + broadcast → ack push; FE: `onSend` already emits the verb shape, the
   review sheet consumes the ack). ⚠ Amounts ride the #77 canon
   (`formatIxiAmount`, C# mirrors). ⚠ The verb, the confirm, the ack and every new
   log line go into `docs/security-handover-gate.md` AS BUILT, not after.
4. **Flip `composeSend`** + on-device F5 → the native send pages retire at the §5
   repoint (their own small batch).
5. **The #46 loop (OPUS auditors/reviewers, builder never reviews own work)** — on a
   MONEY surface the loop is not optional, and the security-review doc for the BE
   engineer gets the money-path delta appended.

## 3. DO-NOTs (money edition)

1. The WebView NEVER signs, never sees keys, never composes the confirm PAST the
   native step. The verb is the wall (SECURITY.md §1, #220/#221).
2. No new NuGet (#495). No Ixian-Core changes — `097341a` is frozen; if the sign
   path needs core, it is a BE row, full stop.
3. Do not flip `composeSend` before #255's filter is in and F5'd.
4. Do not invent a fee. No fee push → the review does not show (keep the gate).
5. The handover-gate lens runs WHILE building (#512's lesson).
6. Builder never reviews own work; verdict to disk with the batch in the filename.

## 4. Queued after the wallet pass (unchanged)

The menu batch (all four calls taken, `docs/handoff-2026-08-25-menu-requests.md` §2)
· the request-cancel BE verb question (`SpixiMessageCode`, read-only) · the contacts
back-stack mechanism (#294) · still-open carry: A-6 repro · decrypt-loop observation
· `OfflinePushMessages` timeout (BE) · iOS #503 §2 (Damir) · `maxLogCount` RELEASE
BLOCKER · W-3 repair path · MAJOR-6 upstream. 🟡 #521's more-sounds question if
Damir has not answered it in chat by then.

## 5. Delivery (standing rules, unchanged)

Windows + PowerShell, Galaxy on adb (full path), Mac for iOS. Land UNCOMMITTED, full
green pipeline, ONE step at a time and WAIT, expectations OUTSIDE the pasted block
with the NUMBER to expect. Wipe `obj`/`bin` on any C# change (#387). Bundle BEFORE
shells. Tarballs into `_deliveries/` only, `tar --overwrite`, VERIFY THE EXTRACT
LANDED. `device_bash` 45 s cap; `git --no-optional-locks`; never `git add -A`;
`git push` does not work from the bridge. Smoke baseline going in: **2766 / 3 KNOWN**
— it will move with the batch; record the new number in the handoff you write.
