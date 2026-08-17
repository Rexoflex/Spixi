# Master worklist — 2026-08-17 reconciliation

Damir's list 1 + list 2, deduplicated, reconciled against the live plan
(`handoff-2026-08-16d.md` §3), the findings register (`f5-findings-2026-08-15.md`)
and what is already built. New items get stable IDs **N1–N45** so sessions can
reference them. Duplicates between the two lists are merged and noted.

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
| **N5** | Account "Delete data" card not responsive — truncates on small screens, whole button-card clips on narrow desktop | FE | S |
| **N10** | App-invite **Cancel in chat doesn't work** — should cancel, keep the bubble, say "Canceled" on BOTH ends | C# here + maybe BE (counterpart side) | triage |
| **N33** | Group file transfer only relays from the CREATOR when members aren't mutually connected; others' files reach the creator only | **BE / protocol → new Table B q11** | BE |
| **N36** | Select mode: selecting/deselecting messages must show ONLY the selected color — no pressed flash (pressable opt-out in select mode) | FE | S |
| **N49** | Deselecting a chat leaves the ROW highlighted (desktop; selected tint not cleared on convo close) — #369 F5 find | FE | S |
| **N50** | contact_details: OS back must dismiss the top overlay (remove-blocked modal) BEFORE popping the page — the shell has no dismissTopOverlay back wiring (#368 loop named it, #369 F5 hit it) | FE | XS |
| **N15** | Group typing indicator shows NOTHING (bot + private). Sender attribution is a known BE ask (be-cutover C21); whether the GENERIC pill can show in groups may be ours — triage first | triage → likely split | M |
| **N39** | Request/cancel story: payment request has no cancel (does sender-side bubble delete revoke it?); outgoing contact-request delete should prompt revoke + explain (legacy `ixian:undorequest` EXISTS — likely buildable without BE) | C# here + FE | M |

## D. NEW — buildable, grouped into rounds

**R1 — Identity round (chat surfaces) — ✅ BUILT 2026-08-17 (#364–#368, with D-5)**
- ~~**N1** Avatar system rework~~ **BUILT #364** (12 quantized anchors + white ink both themes + group glyph; the hashHue-distribution suspect was disproven — S/L was the cause)
- ~~**N34** Owner chip~~ **BUILT #365** (Owner-ONLY — "Admin" has no data source in Core; blind-gated)
- **N22** ~~built earlier~~ **BUILT #361** (private-group member count)
- ~~**N26** member-sheet Add contact~~ **BUILT #366** (relation rides the bridge; BOTH surfaces; request-payment NOT built — no address-bearing money verb on SingleChatPage, logged)
- ~~**N27** name the blocking groups~~ **BUILT #367** (in-shell modal; path-out is text — tap-through = follow-up dial)

**R2 — Copy & locale round (with D-7 + I-11 + AND-35)**
- **N3** Copy sweep: remove em-dashes app-wide, simpler friendlier voice; shorten the apps empty-state line (sl text supplied). (S)
- **N4** Locale expansion: audit existing translations, pick the launch 15–20 languages, add FE dictionaries (⚠ it/id/lt/cn/ja have C# strings but NO FE dictionary — the #360 residual; dictionary + Utils.cs culture gate move TOGETHER), button-label overflow audit per language. (L)
- **N32** Zero balance shows `0.00` (IXI + fiat) — tiny dial against the trailing-zero trim; needs its own pin. (XS)

**R3 — Art & atmosphere round (with the I-3 design round)**
- **N14** Nudges/notices: security notice redesign + subtle blue-ish top-center radial gradient (transparent bottom) on security notice, backup nudge (dialog on Windows / sheet on mobile) and rating nudge; rating nudge uses the `rate-me` illustration from images/. (M)
- **N45** Apply the saved PNG illustrations (the untracked `images/*.png` in your git status). Answer: pick per asset by actual bytes — PNG usually wins for painterly art (the 800 KB explore SVG class), SVG wins for flat line art and stays crisp at any scale; ship 1x/2x PNGs where PNG wins. (S)
- **N21** Chat pattern: dig up the legacy lineart pattern; make ALL levels more subtle — current subtle becomes the new strongest. (S–M)
- **N19** Connecting/loading: animated gradient line as the topbar's bottom border — decide connecting-only vs shared loading affordance (design dial first). (M)

**R4 — Onboarding & restore round (with I-1)**
- **N13** (bug, above) then: **N12** restore must NOT ask for backup; community bot works post-restore when already in contacts (address check). (M)
- **N44** Spinner-on-button masking create/restore work (setLoading exists). (S)

**R5 — Calls round**
- **N11** One round: bubble states polish · Call back ONLY on ended/missed calls (today it shows during a live call) · call banner BELOW the topbar so the app stays usable in-call (chats list starts under it) · Speaker toggle in the banner · OS-side real ringing (persistent/vibrating notification with accept/decline — fullScreenIntent class on Android). (L)

**R6 — Notifications round**
- **N35** Per-chat notification toggle must work on private groups (works on bot only today) + a global toggle · Android: tapping an OS notification deep-links STRAIGHT into that chat (today: chat list first, slow) · combine multiple notifications from the same chat into one (MessagingStyle grouping). (M–L)

**R7 — Wallet & money round**
- **N25** TX details: collapse address/date/fee/txid under "See details" + chevron. (S–M)
- **N31** Tipping should not ALSO create a payment bubble — verify what creates it, then dial. (S triage)
- **N38** Desktop: hide the dead Share button (wallet receive AND the account address row — same disease, one fix). (XS)
- **N43** Search bars appear only when content overflows (chats + wallet; wallet also only once the hero is minimized) — dial then build. (S–M)

**R8 — Desktop round**
- **N9** Send/Receive live in the detail pane instead of overtaking the wallet — tradeoffs on request. (design dial)
- **N24** Apps: highlight the list row whose details are open. (XS)
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
| **N48** | Blind groups: show MY OWN owner status (self-only `amOwner` push, no identity leak) | Dial GIVEN (#369): build with the D-19 family batch — same C# area |

## F. Sequencing proposal (your rule: fix and finalize, BE last)

1. **F5 the #356–#360 batch** (in progress) — commit.
2. **Bug batch:** N13 · N5 · N36 · N38 · N24 (+ N40/N10 triage) — small, high-irritation.
3. **Table A as planned:** D-5 → D-9 → D1 (+N6, +N18 design together).
4. **Rounds in this order:** R1 identity → R2 copy/locale → R4 onboarding → R7 wallet → R3 art → R6 notifications → R8 desktop → R5 calls → R9 apps.
5. **Table B** grows by one: **q11 = N33** (group file relay). q1 (D-14/D-19 sender nulling) remains the urgent one.
6. Security sweep stays LAST, before handover.

*Anything in E answered by you (a dial) moves into its round; anything answered "no" gets a one-line DECISIONS row so it never comes back.*
