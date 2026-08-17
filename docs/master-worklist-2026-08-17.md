# Master worklist — 2026-08-17 reconciliation

Damir's list 1 + list 2, deduplicated, reconciled against the live plan
(`handoff-2026-08-16d.md` §3), the findings register (`f5-findings-2026-08-15.md`)
and what is already built. New items get stable IDs **N1–N45** so sessions can
reference them. Duplicates between the two lists are merged and noted.

*2026-08-17 (late): the D-19b family + N48/N49/N50 + the R2 round are BUILT
(#370–#373). Struck below. N4 stays open (needs its own session). N51–N55
added from Damir's #370-era F5 walk (all code-verified). Also struck:
the FIVE #361 rows this doc predated (N5 · N24 · N36 · N38 · N45) — the §F
item-2 "bug batch" proposal became the #361 batch the same day, and only the
R1/R2 strikes were ever applied here.*

---

## A. Already DONE — strike from both lists

| Item | Where |
|---|---|
| Apps empty-state search bar flicker (list 2) | **D-17, built #359** — your F5 items 13–14 |
| "Connecting…" dies on language change (list 1 origin) | **D-20, built #357** — F5 items 6–8. ⚠ List 2's "connecting not showing after long use" is DIFFERENT and new → **N40** |
| Bot-room sender impersonation | **D-19, built #356** |
| Digit grouping / amount readability | **I-6, built #360** (zero-balance 2-decimals dial = **N32**, small rider) |
| Selected chip vs button ambiguity | **I-2, built #358** |

## B. Already TRACKED — no new rows needed

| Item (both lists) | Tracked as | State |
|---|---|---|
| Delete account → remove all data → welcome | **D-9** | Table A next-but-one |
| Reply messages, non-C# way | **D1** — design LOCKED: reference rides the message BODY as an id, resolved locally, no protocol change (that IS the minimal-C# way; three small C# pieces remain). NEW rider **N6**: auto-@mention the replied author in groups | Table A row 3 |
| Group rename / photo / add members (owner) | **Table B q5** — verified NOT in Ixian-Core; A5 + CI7 stay BLOCKED. Re-verified at `097341a` | Parked, BE |
| Chat-info loads slowly, skeletons imperative | **I-9** — Damir escalation noted; still measure-first (#294), then build | Table A tail, now prioritized |
| Welcome/create/restore flicker | **I-1 + welcome flicker** (one native transition, mobile only). Spinner-on-button during create/restore = NEW rider in **N44** | Table A tail |
| A52 slow entering chats | **Measured and closed** #349: 234 ms cold / 212 ms warm, no segment dominates, verdict "no further chat-entry perf work". Remaining honest levers: I-1 (transition masks latency), **I-12**/#298 (transport prepend, not bigger reflush), I-10 (app-pane, measure first) | Tracked |
| Restore copy / locale round | **D-7 + I-11 + AND-35** — one locale round; N3/N4 fold into it | Table A tail |

## C. NEW — bugs first (the fix-first rule)

| ID | Item | Owner | Size |
|---|---|---|---|
| **N13** | Onboarding **Backup now does nothing** at account creation. Data-loss class — highest of the new bugs | C# + FE | triage |
| **N40** | **D-21 candidate:** "Connecting…" stops showing on a LIVE document after long app use while offline. Distinct from D-20 (fresh documents). Prime suspect already on file: the update-available branch starves the connectivity block (loop r1 note on #357); second suspect the delay-counter. Needs one repro session | C# | triage |
| ~~**N5**~~ | **BUILT #361** (danger-sub wrap + min-width chain + the master-column clamp; #362 refined; F5 pass #363) | FE | done |
| **N10** | App-invite **Cancel in chat doesn't work** — should cancel, keep the bubble, say "Canceled" on BOTH ends | C# here + maybe BE (counterpart side) | triage |
| **N33** | Group file transfer only relays from the CREATOR when members aren't mutually connected; others' files reach the creator only | **BE / protocol → new Table B q11** | BE |
| ~~**N36**~~ | **BUILT #361** (pressable bails in `[data-selecting]`, in-bubble controls pointer-dead). The Android A4 flash is a DIFFERENT layer → **N36b** — RE-OBSERVED by Damir 2026-08-17 (repro gate met) → promoted into the N51+ fix batch → **BUILT #375** (the #363 one-liner on .c-bubble-row; ⚠ if the flash survives on device, a SECOND layer hides beneath — report, do not stack) | FE | done |
| ~~**N49**~~ | **BUILT #370** — highlight rides onOverlayPresented (wide only, r2 F-1) + guarded clear on close | FE | done |
| ~~**N50**~~ | **BUILT #370** — cdoverlay/cdBack wiring (homeoverlay grammar) + onLoad reset + HomePage route | FE | done |
| **N15** | Group typing indicator shows NOTHING (bot + private). Sender attribution is a known BE ask (be-cutover C21); whether the GENERIC pill can show in groups may be ours — triage first | triage → likely split | M |
| **N39** | Request/cancel story: payment request has no cancel (does sender-side bubble delete revoke it?); outgoing contact-request delete should prompt revoke + explain (legacy `ixian:undorequest` EXISTS — likely buildable without BE) | C# here + FE | M |
| ~~**N51**~~ | **BUILT #375** (chatoverlay/chatBack mirror — the N50 grammar + the two off-stack arms; #376 A-1 dead-handle wedge fixed) + **AND-37** (settings onBack sheet arm, FE-only) | C# + FE | S |
| ~~**N52**~~ | **BUILT #375** (ring → SOLID --surface-warning + visible-start rAF poll; #376: reduced-motion static ring + id re-bind; messagesToLoad 25→50, D-18 re-walked — ⚠ A52 re-measure owed) | FE + C# 1-line | S |
| ~~**N53**~~ | **BUILT #375** (all five upserts feed the badge; #376 B-1 re-flush quiet window + B-5 200px clear) | FE | S |
| ~~**N54**~~ | **BUILT #375** (nearBottom gate) | FE | XS |
| ~~**N55**~~ | **BUILT #375** at THREE sites; contact_new deliberately NONE (#376 B-2 — C# alert-and-stay paths made it false; post-pop feedback = open dial) | FE | S |
| **N57** | **TRIAGED #375 → `docs/n57-triage-group-visibility.md`** — FE + C# push path exonerated; 3 candidate mechanisms ALL Core-side; Damir runs the 4-leg protocol; be-cutover [N57?] updated | triage → likely BE | triage |
| ~~**N58**~~ | **BUILT #375** (avatar NODE decode cache, the #340 class; presence dot patched in place) | FE | S |
| ~~**N59**~~ | **BUILT #375** (stack gap 0 + sub pull-up) | FE | XS |
| ~~**N56**~~ | **BUILT #375** (--surface-pinned 9%/6% + ladder + press-fade landing; values = Damir eyeball dial) | FE | XS |

## D. NEW — buildable, grouped into rounds

**R1 — Identity round (chat surfaces) — ✅ BUILT 2026-08-17 (#364–#368, with D-5)**
- ~~**N1** Avatar system rework~~ **BUILT #364** (12 quantized anchors + white ink both themes + group glyph; the hashHue-distribution suspect was disproven — S/L was the cause)
- ~~**N34** Owner chip~~ **BUILT #365** (Owner-ONLY — "Admin" has no data source in Core; blind-gated)
- **N22** ~~built earlier~~ **BUILT #361** (private-group member count)
- ~~**N26** member-sheet Add contact~~ **BUILT #366** (relation rides the bridge; BOTH surfaces; request-payment NOT built — no address-bearing money verb on SingleChatPage, logged)
- ~~**N27** name the blocking groups~~ **BUILT #367** (in-shell modal; path-out is text — tap-through = follow-up dial)

**R2 — Copy & locale round — ✅ RUN 2026-08-17 (#371; D-7 + I-11 + AND-35 + the one-liners)**
- ~~**N3**~~ **#371 partial**: apps empty-state = Damir's short line · 17 aria joiners de-dashed · de-de 40 + sl-si 2 en-dashes rewritten. OPEN residue: the "simpler friendlier voice" app-wide sweep has NO target list (ask Damir) · ru copula dashes + lt-lt legacy dashes = Damir's call
- **N4** Locale expansion: audit existing translations, pick the launch 15–20 languages, add FE dictionaries (⚠ it/id/lt/cn/ja have C# strings but NO FE dictionary — the #360 residual; dictionary + Utils.cs culture gate move TOGETHER), button-label overflow audit per language. (L) — **SKIPPED in #371, needs its own session**
- ~~**N32**~~ built #361

**R3 — Art & atmosphere round (with the I-3 design round)**
- **N14** Nudges/notices: security notice redesign + subtle blue-ish top-center radial gradient (transparent bottom) on security notice, backup nudge (dialog on Windows / sheet on mobile) and rating nudge; rating nudge uses the `rate-me` illustration from images/. (M)
- ~~**N45**~~ **BUILT #361** (PNG-per-asset by bytes, 13 sites rewired, rating-nudge illustration grammar = N14a; #362 fixed 2 demo refs)
- **N21** Chat pattern: dig up the legacy lineart pattern; make ALL levels more subtle — current subtle becomes the new strongest. (S–M)
- **N19** Connecting/loading: animated gradient line as the topbar's bottom border — decide connecting-only vs shared loading affordance (design dial first). (M)

**R4 — Onboarding & restore round (with I-1)**
- **N13** (bug, above) then: **N12** restore must NOT ask for backup; community bot works post-restore when already in contacts (address check). (M)
- **N44** Spinner-on-button masking create/restore work (setLoading exists). (S)

**R5 — Calls round**
- **N11** One round: bubble states polish · Call back ONLY on ended/missed calls (today it shows during a live call) · call banner BELOW the topbar so the app stays usable in-call (chats list starts under it) · Speaker toggle in the banner · OS-side real ringing (persistent/vibrating notification with accept/decline — fullScreenIntent class on Android). (L)

**R6 — Notifications round**
- **N35** Per-chat notification toggle must work on private groups (works on bot only today) + a global toggle · Android: tapping an OS notification deep-links STRAIGHT into that chat (today: chat list first, slow) · combine multiple notifications from the same chat into one (MessagingStyle grouping). (M–L)
  - *Damir repro 2026-08-17: 15 messages from one sender = 15 tray rows. VERIFIED cause: `SPushService.showLocalNotification` calls `manager.Notify(messageId, ...)` with a UNIQUE id per message; `SetGroup(data)` is set but no group SUMMARY exists, so Android never collapses. NO FE lever exists (the tray is native). Damir dial 2026-08-17: goes to the BE ENGINEER, not us — logged as **be-cutover NT1** (cheap interim = stable per-chat id + SetNumber; proper fix = MessagingStyle + summary, pairs with this round's deep-link ask). Ask politely at the cutover.*

**R7 — Wallet & money round**
- **N25** TX details: collapse address/date/fee/txid under "See details" + chevron. (S–M)
- **N31** Tipping should not ALSO create a payment bubble — verify what creates it, then dial. (S triage)
- ~~**N38**~~ **BUILT** — account half #348-W9, wallet-receive half #361 (same `isDesktopPresentation` predicate)
- **N43** Search bars appear only when content overflows (chats + wallet; wallet also only once the hero is minimized) — dial then build. (S–M)

**R8 — Desktop round**
- **N9** Send/Receive live in the detail pane instead of overtaking the wallet — tradeoffs on request. (design dial)
- ~~**N24**~~ **BUILT #361** (+#362: aria-current on `__open`, present-time push — the precedent N49 copied)
- **N29** Very wide window: left-align bubbles vs centered max-width column (WhatsApp style, affects composer) — dial. (design)
- **N30** Sounds: desktop incoming chat/payment + a desktop-specific toggle; mobile send/receive/tx sounds. (M)

**R9 — Apps & icons**
- **N2** Icon audit: missing icons, duplicate/misfit uses; includes the list⇄grid toggle using a REAL grid glyph (today it reuses the apps icon). (S–M)
- **N41** Downloads: filter by date/user/type; explore media-tiles view. (M)

## E. NEW — questions needing an answer or a Damir dial (no build yet)

| ID | Question | Short position |
|---|---|---|
| **N7** | Account as a preloaded peer screen like wallet/chats/apps? | Feasible. Trade: memory + boot cost of one more live WebView vs instant tab entry. Middle path: idle-warmup after first paint. Needs a session to measure (#294) |
| **N8** | Send flow redesign WITHOUT the BE engineer? | The compose/review takeover already exists behind `bridge.cap` — the question is whether legacy `ixian:` verbs suffice for the cutover. Needs one verification session against `be-cutover-brief.md`; verdict before building |
| **N16** | Pin message | Design first: LOCAL pin (per device, zero protocol) vs synced pin (protocol/BE). Local-first recommended; sticky row + jump is FE |
| **N18** | Share contact via Spixi (picker → contact bubble + inline add) | Buildable shape exists, BUT it is a NEW peer-controlled body-marker surface — same hostile-parsing class as reply-to. Design + gate care together with D1 |
| **N42** | Contact-list affordance in Account too? | Dial — cheap either way |
| **N28** | "Do we need skeletons??" | Chat-info: yes (I-9, measured first). App-wide: no — zero-gates + reserved boxes are working; skeletons only where a real measured wait exists |
| **N46** | Delete-flow rework: BRANDED checkboxes + a UX pass (#369, Damir: off-brand) | ★ REMIND Damir near master-list completion — his explicit ask |
| **N47** | Support nickname RESET to address-only? (#369 B3 — today a nick cannot be removed) | Dial |
| ~~**N48**~~ | **BUILT #370** (groups-only, loop A-5; hero chip in blind rooms) | done |

## F. Sequencing proposal (your rule: fix and finalize, BE last)

1. **F5 the #356–#360 batch** (in progress) — commit.
2. **Bug batch:** N13 · N5 · N36 · N38 · N24 (+ N40/N10 triage) — small, high-irritation.
3. **Table A as planned:** D-5 → D-9 → D1 (+N6, +N18 design together).
4. **Rounds in this order:** R1 identity → R2 copy/locale → R4 onboarding → R7 wallet → R3 art → R6 notifications → R8 desktop → R5 calls → R9 apps.
5. **Table B** grows by one: **q11 = N33** (group file relay). q1 (D-14/D-19 sender nulling) remains the urgent one.
6. Security sweep stays LAST, before handover.

*Anything in E answered by you (a dial) moves into its round; anything answered "no" gets a one-line DECISIONS row so it never comes back.*
