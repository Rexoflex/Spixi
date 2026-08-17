# F5 checklist — the #375/#376 fix batch (2026-08-17)

> **RESULTS (Damir, 2026-08-17): ALL PASS.** Android legs 1–7 + 18 ✓ · reading
> set 8–12 ✓ (no chat-entry lag reported → A52 re-measure dormant) · 13–17 ✓.
> N59 amended same day → **N59b** (group-centred disc, Damir screenshot). ⚠ The
> N57 SYMPTOM RE-OBSERVED in normal use — the §⑤ protocol run is still owed and
> is now the top Damir action. Batch committed per the message below. CONSUMED.


**LANGUAGE RULE: ASD-STE100.**

Build first, in this order (components + shells + strings + C# changed):

```
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs
node scripts/smoke-test.mjs        (expect: BASELINE OK 1903 / the same 4)
```

Then wipe obj/bin → build BOTH platforms (C# changed: SingleChatPage · HomePage
· Config). Android is the primary target for ① and ④.

## ① N51 + AND-37 — hardware back (Android)

| Leg | Steps | PASS = |
|---|---|---|
| 1 | Open a chat → ⊕ attach sheet → OS back | The SHEET closes. The chat stays. Second back exits the chat |
| 2 | Long-press a message → menu sheet → back | The MENU closes, chat stays |
| 3 | Bot chat → tap the title → channel selector open → back | The SELECTOR closes, chat stays |
| 4 | Long-press → Select → select mode on → back | SELECTION exits (bar gone), chat stays. Second back exits |
| 5 | ★ The A-1 wedge probe: long-press a message; have the OTHER device delete that exact message; tap Select on it → selection auto-cancels → press back repeatedly | Back keeps WORKING (first press may be consumed once — the self-heal; the next pops the chat). Pre-fix: back was dead forever |
| 6 | Account → Theme (or Language) sheet open → back | The sheet closes. You stay on Account (pre-fix: you landed on Chats) |
| 7 | Chat with a MODAL up (delete confirm) → back | The modal behaves as before (no light-dismiss of a money/destructive modal) |

## ② The reading set (any platform; Android preferred)

| Leg | Steps | PASS = |
|---|---|---|
| 8 | Scroll up in a busy chat; peer types | The view does NOT jump to the bottom (N54). At the bottom it still follows |
| 9 | Stay scrolled up; peer sends 3 messages | The chevron shows a "3" badge (N53). Scroll to the bottom → badge clears |
| 10 | Tap "Show older messages" while scrolled up | NO phantom badge from the re-flushed history (#376 B-1) |
| 11 | Group with an @you mention off-screen → tap the @ FAB | The target message shows a clear ORANGE ring AFTER the scroll lands (N52). Check BOTH themes. With reduced motion ON: a static ring still shows |
| 12 | Open a long chat | The first window is now 50 rows; "Show older" walks 50 → 150 → 200 (the exact-100 press is guarded — D-18 re-walk). ⚠ Feel the entry speed; if it lags, say so — the A52 re-measure is owed (#349 baseline 234 ms at 25 rows) |

## ③ Toast · pin · avatars · gap

| Leg | Steps | PASS = |
|---|---|---|
| 13 | Group chat → tap a stranger sender → member sheet → Send contact request | "Contact request sent" toast + the pending badge (N55). Same from a group pane in Contact details |
| 14 | Contacts → Add contact → send a request to a NEW valid address | NO toast; the page pops (that is the feedback). To an ALREADY-ADDED address: the native alert only, NO false green toast (#376 B-2) |
| 15 | Pin a chat (row menu) | The row carries a LIGHT brand wash, both themes (N56). Press it: no blink through white/transparent (#376 C-1). Selected (desktop dual-pane) still wins. ⚠ DIAL: light = 9%, dark = 6% — say lighter/stronger |
| 16 | Chats list with avatar PHOTOS: enter a chat, back out, switch tabs, return — repeat | Photos do NOT flicker on entry (N58). A presence dot flip does not flicker the photo |
| 17 | Account: rows with subtitles (Chat appearance, App lock, Downloads, Backup) | The title↔subtitle gap reads tighter (N59) |

## ④ N36b — the Android select-mode flash

| Leg | Steps | PASS = |
|---|---|---|
| 18 | Select mode → tap several messages to toggle | NO pressed flash on the rows. ⚠ If a flash SURVIVES: report it exactly (which surface, which theme) — a SECOND layer hides beneath the tap-highlight and we must NOT stack fixes (#363 caveat) |

## ⑤ N57 — the group-visibility repro (2 sessions, 3 accounts)

Run `docs/n57-triage-group-visibility.md` §2 (owner + two members, ~20 min).
Paste the fingerprint log lines + the sender's tick state into the session.
That decides Core-vs-transport and finishes the be-cutover row.

---

## Commit (after F5)

One batch. Suggested message:

```
batch: F5 fix round - N51+AND-37 back grammar, N53/N54/N52 reading set,
N55 toasts, N56 pin wash, N58 avatar cache, N59, N36b + N57 triage (#375, #376)

- N51: ixian:chatoverlay/chatBack mirror (the N50 grammar applied to chat;
  channel selector + select mode arms; A-1 dead-handle wedge fixed in-loop)
- AND-37: settings onBack dismisses sheets first (FE-only)
- N53: scroll-latest badge fed (all five upserts; re-flush quiet window)
- N54: typing indicator no longer yanks the view
- N52: mention pulse visible (solid ring, visible-start, reduced-motion);
  messagesToLoad 25->50, D-18 guard re-walked
- N55: request-sent toast at three sites; contact_new deliberately none
- N56: --surface-pinned wash + ladder + press-fade landing
- N58: chats avatar decode cache (the #340 class)
- N59: Account row title/sub gap tightened
- N36b: tap-highlight kill on .c-bubble-row
- N57: triage doc + be-cutover row (Core-side suspects, no build)
- smoke 1903/same-4; mutation-proven pins; #46 loop PASS (DECISIONS #375, #376)
```
