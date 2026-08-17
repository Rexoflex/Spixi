# F5 checklist — the FIX + R2 batch (#370–#373)

**RESULTS (Damir, 2026-08-17 — DECISIONS #374): B1–B4 · C1–C3 · D1–D4 · E1–E7 PASS
(E3 badge leg interrupted, re-test; D5 owed). A1–A5 ALL FAIL — root cause =
Ixian-Core 0.9.8k stores bot-room messages identity-less AND its nick backfill
is dead there (be-cutover Q1-ESC; NOT a batch defect — B1 proves the ladder).
Batch COMMITTED. New: N57 (group visibility vs connectivity — investigate) ·
N58 (chats avatar flicker) · N59 (row sub gap).**

**LANGUAGE RULE: ASD-STE100.** Build first: wipe obj/bin → Windows
`dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug` (run the exe) ·
Android `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run`.
C# changed in 5 files — the twin has no .NET, so YOUR build is the compile gate.
Local smoke first: `node scripts/smoke-test.mjs` → expect **BASELINE OK 1858 / the 4 known**.

## A. D-19b — the public Spixi bot room (the #369 escalation)

| # | Step | Expect |
|---|---|---|
| A1 | Open the public Spixi bot room | Named senders show their NICKNAMES. NO row says "Hidden member". |
| A2 | Find an anonymous row (no nick, no address) | It has NO sender label at all (legacy parity). It does not merge into a named run. |
| A3 | Tap a NAMED sender who is in the room roster | The member sheet opens WITH the address + copy + a working Add-contact/relation state. No dead end. |
| A4 | Long-press that sender's message → Tip → small amount → confirm | The tip completes. The payee NAME on the sheet is the nick or a TRUNCATED address — never a full base58 line. |
| A5 | Multi-select 2 named + 1 anonymous message → Copy | Named lines read "Nick: text". The anonymous line is bare text (no ": text", no placeholder). |

## B. D-19b — blind groups (the #369 amendment)

| # | Step | Expect |
|---|---|---|
| B1 | Open a BLIND group with named members | Bubbles show NICKNAMES now (only addresses stay hidden). Nameless senders show "Hidden member". |
| B2 | Group info roster in that blind group | Nameless members read "Hidden member" — NEVER "x…" + address and never a raw address as a name. |
| B3 | Composer @ in the blind group | The picker offers real nicks only. No address-shaped entry. |
| B4 | Sender labels in blind rooms | No tap-to-copy, no member sheet, no address in a tooltip. |

## C. N48 — own owner status

| # | Step | Expect |
|---|---|---|
| C1 | Group info of a BLIND group YOU created | Hero shows a "You are the owner" chip under the member count. |
| C2 | Group info of a blind group you did NOT create | No chip. |
| C3 | Any BOT room info | Never shows the chip. |

## D. N49 + N50 — the cheap #369 finds

| # | Step | Expect |
|---|---|---|
| D1 | Desktop: open a chat | The list row tints when the conversation appears. |
| D2 | Desktop: close the chat (back) | The tint CLEARS. Chat→chat switch keeps only the new row tinted. |
| D3 | Phone: open + back out of a chat | No tinted row flashes during the close slide. |
| D4 | Android: contact details → trigger the remove-blocked modal (or open a member sheet) → OS back | Back closes the MODAL first. The page stays. A second back pops the page. |
| D5 | With a sheet open on contact details, flip the OS theme, then press back | Back still works after the reload (one press may be eaten once right after a dismiss — known ≤400 ms window, self-heals). |

## E. R2 — copy & locale round

| # | Step | Expect |
|---|---|---|
| E1 | Account → Chat appearance | Order: preview → **Text size** → **Background** → **Opacity** (renamed; check de/sl too: Deckkraft / Prekrivnost). |
| E2 | A 2-person group info → kick one member (or view a 1-member group) | Sub reads "1 member" / "1 Mitglied" — not "1 members". Topbar count too. |
| E3 | Member sheet of someone who sent YOU a contact request | Badge says "Request received" — not "Request sent". Still no request button. |
| E4 | Welcome → Restore with an account already on the device | The alert NAMES the way out (restart → Account → Delete wallet → Restore). Check Deutsch/slovenščina wording. |
| E5 | Account hub | Chat appearance, App lock and Downloads rows carry one-line subtitles; other rows stay bare. |
| E6 | Apps tab, empty account | ONE short line ("Games, tools and AI that run directly in your chats." / sl = your exact text). |
| E7 | Deutsch anywhere | No spaced en-dashes ("–") left in app copy. |

## Commit (ONE batch, after F5)

```
batch: D-19b family rework + N48/N49/N50 + R2 copy & locale round (#370-#373)
```

Body: DECISIONS #370–#373. Consumed handoff → `docs/archive/handoff-2026-08-17e.md`
(delete the stale root copy: `Move-Item docs\handoff-2026-08-17e.md -Destination $env:TEMP` or plain delete).
