# BUILD BRIEF — THE PREMIUM DENSITY PASS (Damir, 2026-08-31, mid-walk)

**Damir's report, verbatim in substance:** the app "lacks a punch to feel premium. The
bubbles have less padding in best chat apps, there's nuanced details that elevate the
experience and gaps are more measured" — and the same class of complaint on **chat
info's gaps**, the **chats list**, the **top bar**, the **bottom nav**, and "some bits
in Account". Reference apps: **Telegram + WhatsApp**.

**★ THE METHOD IS THE ROW.** This is ONE measured token-level pass, not five ad-hoc
screen tweaks. Nothing moves without: (1) Damir's reference screenshots measured in dp,
(2) our value measured beside it, (3) a RENDER SHEET on the real components — current
vs 2–3 candidates, same content, side by side — and (4) his pick PER DIAL. The #294/
#215 rules apply to design numbers exactly as to code: measure, render before he
rebuilds, and his eye is the authority. Figma mirroring is retired (#316) — tokens.css
is the only source of truth to move.

## 0 · Inputs — ★ ALL RECEIVED 2026-08-31 (the interview below rules every open dial)

- Screenshots, ALL on the same phone (name the model — px→dp needs its scale), same
  theme, ours captured in the same sitting: ① a conversation (2–3 short same-sender
  bubbles + one long multi-line, both directions, ticks visible) — TG, WA, ours ·
  ② the chats list with an unread badge + top bar — TG, WA, ours · ③ group/contact
  info — TG (the gap grammar he wants), WA optional, ours · ④ settings/account — TG,
  ours. Bottom nav rides in ② and ④.
- The one-word target where the two references disagree (TG and WA make different
  calls on several dials below).

## 1 · What we ship today — measured from the tree (mobile)

| surface | dial | ours today | where |
|---|---|---|---|
| bubble | text | **16px / 24px line (1.50)** | tokens.css body-md (mobile block) |
| bubble | padding | 8 × 12 | message-bubble.css:74 |
| bubble | radius | 16 (+ grouped corners) | :75 |
| bubble | in-group gap | 2px | :59 |
| bubble | between-group gap | 12px | :47 |
| bubble | row inline inset | 16 | :46 |
| chats list | row padding / gap | 12 / 12 | chatlist-item.css:7-9 |
| chat info | body padding | 16 × 16, 32 bottom | chat-info.css:16 |
| chat info | row heights | 44 / 48 / 52 / 56 mixed | chat-info.css (grep min-height) |
| bars | nav/topbar targets | 44 (--size-target-min) | bottomnav.css:36 |

Reference ballparks to VERIFY against his screenshots, never to ship from memory:
TG bubble ≈ 16/19–20 text (≈1.22), 6–7 × 10–12 padding, radius 17–18, in-group 3–4,
between-group 8–10; iMessage ≈ 1.29 line, 1–2 in-group. **The single biggest lever is
our 1.50 bubble line-height — document rhythm, not chat rhythm; every multi-line
bubble is ~17% taller than the reference, which makes every other gap read wrong.**
Desktop already rides 15/21 (1.4, #227); mobile never got that pass. body-md is the
BUBBLE role since #227/#231b (excerpts left it) → tightening it moves bubbles +
composer together and leaves lists alone. Verify the role's other riders with a grep
before locking (the #423 lesson: read what actually consumes the token).

## 2 · Build order (after Damir's screenshots land)

1. Measure his screenshots → one dp table per surface, TG / WA / ours columns.
2. Render sheet #1 — THE BUBBLE: current vs candidate A (TG-tight: lh ~20, pad 6×11,
   in-group 3, group 10) vs candidate B (halfway). Real components, both themes, the
   #711 Playwright render path. He picks per dial.
3. Render sheet #2 — LIST + BARS: row rhythm, top-bar height/hairline, bottom-nav
   pill metrics, unread badge geometry.
4. Render sheet #3 — CHAT INFO + ACCOUNT: section gaps, disc-to-text gutter, row
   height CANON (today four heights coexist — 44/48/52/56; propose two).
5. Land as ONE token batch + the few component-local paddings; pins on every moved
   value; full gates; the walk rows come from the sheets themselves.

## 3 · Guardrails

- 44px touch targets survive every density cut (--size-target-min is a floor, not a
  dial). A11y line-length/contrast pins must stay green.
- The 760 column (#728), the composer pill pair (#724) and the slide grammar (#725)
  are Session H work — density edits ride ON them, never rework them.
- "Nuanced details" candidates to price separately, each its own dial row: meta tucked
  into the last text line's trailing gap · same-sender vs cross-sender group gaps
  differing · bubble pressed-state feedback · unread-badge optical sizing. Build none
  without a ruling.


## 4 · ★ RULED IN FROM THE WALK (Damir, 2026-08-31 — build these, no re-litigating)

- **⊕ returns INSIDE the composer pill** ("more premium"). Reverses #705's outside-disc;
  keep the tray/✕ behaviour, only the housing moves. A2 spacing compensation
  (`data-no-attach`) retires with it.
- **Caret active on chat entry — RULED: caret WITHOUT the keyboard** (Damir: "same as
  WhatsApp and TG"). Build: focus the composer input on chat open with `inputmode=none`
  (no soft keyboard rises), swap to `inputmode=text` + refocus on the first field tap
  (keyboard rises then). Verify on Android WebView AND WKWebView (#215 — inputmode=none
  behaviour differs); desktop keeps the #252 Q10 autofocus as-is. The #303 keyboard
  levers (--kb-inset) must be unaffected while the field is focused-but-keyboardless.
- **The composer truly FLOATS: messages pass UNDER the pill** (his screenshot: the log
  ends above it today). `--composer-h` is already published — absolute-position the
  slot, give #messages bottom padding from the var. Check the kb-inset margin, the
  request pane, the tray, and the FAB slots all still compose.
- **Blue "event" excerpt canon**: file sent · reacted · app invite · connected — one
  list, one tint (the connected line's). + "X left the group" for private groups —
  ⚠ #215 verify first whether a leave emits any message at all (GJ1's sibling; likely BE).
- **Secure notice redesign** ("looks a bit AI generated") — part of this pass's render
  sheets, not a separate batch.
- **Nameless bot-group senders**: truncated address in the SAME face as nicknames.
- **Emoji-only = sticker grammar** (no bubble at all; big-emoji rule already exists,
  remove the bubble) · **flag emojis** miss the big-emoji detector (regional-indicator
  pairs) — fix the detector, and check flag glyph size on Android generally.
- **Entrance dial (A1 note)**: consider slide+fade hybrid (shorter travel + opacity) for
  ALL slide-ins or none — render it beside the current full-travel slide, one pick.
- **Bot-info address is a dud** (Spixi bot: no copy, no QR, no full address) — fix
  rides this pass's chat-info sheet.
- **Menus/dropdowns: LESS padding** (Damir 2026-08-31 second note). Sweep the shared
  overlay grammar once — the context menu, the ⊕ popover (desktop), the chats-row
  menu, channel panel, member sheet rows — measure current paddings, one render round,
  one token move where they share one.
- **Bubbles get a SUBTLE ELEVATION** (Damir: "other apps have some subtle elevation or
  something"). He is right about the references: WA/TG bubbles carry a faint ~1px drop
  shadow. ⚠ HISTORY BEFORE BUILDING: N82(b)/#427 removed the bubble HAIRLINE in both
  themes on measurement, and `--border-bubble-received` is transparent-not-absent with
  its seven consumer rules KEPT — the edge is one token from returning. Elevation is a
  different lever than the hairline (shadow below vs outline around): render both, and
  the combination, on the real canvas in BOTH themes; the dark canvas measured 1.12:1
  bubble separation (#427's number) is what a shadow must improve without mud.

## 5 · ★ A15 RULED (Damir, same night): THE FULL LEGAL DOCUMENTS SHIP IN-APP

The walk's one FAIL, resolved as a ruling: the privacy/terms sheets showed "a single
paragraph, a dud". Build: bake `docs/legal/privacy-policy.md` + `docs/legal/
terms-of-use.md` into the bundle at BUILD TIME (a build-step read, not a hand copy) and
pipe them through openDocSheet's existing renderer (`# ` headings, `- ` lists,
`[label](https://…)` links already supported). Keep a two-line lead paragraph on top;
keep the "provided in English only" line; RETIRE both hand-written summaries —
★ TERMS_DEFAULT still claims "IXI Labs collects no personal data", the exact #730 class
the review fixed on the privacy side, and it dies with this build. Nice-to-have on the
same door: third-party-notices.md under About. While in there, name the dud's mechanism
on device (why one paragraph rendered — stale bundle vs a legacy-SL shadow on
strings.privacyBody) so the class is understood, not just replaced. The retention
placeholder inside privacy-policy.md is still Damir's to fill BEFORE this ships in-app.

## 6 · THE TYPEFACE DIAL (Damir, Motorola, 2026-08-31: "it's Roboto, but WA/TG use a
different font on Motorola")

Mechanism, verified at our end: we ask for `system-ui` (#226's dial — correct), and
Roboto is the Android WEBVIEW's answer to it. Native TextViews (WA/TG) inherit the
OEM's configured system face; Chromium resolves `system-ui` from its OWN font table,
which on most OEM skins still maps to Roboto — OEM font replacement does not reach it.
No CSS stack fixes this from inside a WebView.

The decision (Damir rules on a render, not a default):
- (a) accept Roboto on Android (platform-canonical, zero work, the gap stays);
- (b) bundle OUR body face — Source Sans 3 is already in the tree (the pre-#226 body
  font): identical on every phone/OEM/WebView, the consistency route; ⚠ partially
  reverses #226's "native feel" ruling, so it is a ruling, not a drift;
- (c) chase the OEM font at runtime — per-OEM archaeology, no public API; listed to be
  REJECTED.
⚠ Before concluding "different family": at reading size the WA/TG difference is often
Roboto at different WEIGHTS + letter-spacing (Medium names, tighter tracking). The
render sheet gets a type row — current system-ui vs weight/tracking-tuned vs bundled
Source Sans 3, same bubbles — and Damir's screenshot set gains ONE close-up crop of WA
body text on the Motorola to settle family-vs-weight with evidence.

## 7 · ★ FIRST MEASUREMENTS — from Damir's 2026-08-31 screenshot set
(`docs/reference-screens/premium/` — Motorola, 1080×2400, all three apps same device, so
raw-px comparisons are exact; dp given at an assumed ~2.6 px/dp — pin the true scale
next session by reading `devicePixelRatio` on the device before converting anything.)

| dial | SPIXI | WhatsApp | Telegram | verdict |
|---|---|---|---|---|
| single-line bubble height | **100 px** | **82 px** | **87–89 px** | ★ ours is +22% vs WA, +13% vs TG — THE punch gap, now a number |
| in-group bubble gap | 6 px | ~7 px | ~(n/a clean) | ours is fine |
| composer bar height | **128 px** | 115 px | 107 px | ours +11–20% |
| chats-list row pitch | 180 px | ~188 px | 191 px | ours is NOT too airy — the list gap feel is elsewhere |
| chats-list avatar | ~120 px (~46dp) | ~129 px (49dp) | ~142 px (**54dp**) | TG reads richer via BIGGER avatar in similar pitch |

Readings: the oversize is concentrated in the BUBBLE (line-height + vertical padding)
and the COMPOSER, not the list pitch; the list wants a bigger avatar + hierarchy work,
not tighter rows. ⚠ The §1 claim "mobile bubble line-height 1.50" must be RE-VERIFIED
against the measured 100 px before any token moves — resolve which tokens block
(mobile vs desktop) really carries 16/24 vs 15/21, then re-derive (the #660 rule:
measure, don't carry).

**Damir's font observation (same set):** WA + TG body text renders the MOTOROLA system
face, but TG's chat-row NICKNAMES look like Roboto (TG bundles Roboto Medium for
emphasis) — i.e. the references MIX families/weights per role. Supports §6's
family-vs-weight caution; the close-up crop request stands.

**Light chat canvas (Damir: "don't like the background color in light mode"):** ours is
the cool blue-grey (#ebf0f5 family); WA's is a warm cream with doodles. Direction is an
interview answer (warm vs whiter vs cooler-lighter), then a render round like N81/N82 —
those rows hold the measured history of this exact canvas; read them before proposing.

**Release perf verdict (Damir, same night): chat OPEN is the moment** — "subtle stutter,
like a game on a bad computer", and the chat's native slide-in does NOT play on Release.
Filed in next-session ⑥ (now unconditional): instrument SingleChatPage open —
present timing vs the per-message replay marshals; the likely shape is the L10
treatment (signal present → post the replay → chunk it, #726's grammar) but ONLY after
stamps. Do not touch the slide before the stutter is measured — they are probably one
mechanism (replay starves the UI thread, the 300 ms slide drops all its frames).

## 8 · ★★ THE INTERVIEW ANSWERS (Damir, 2026-08-31 — every remaining dial RULED)

Device: **Motorola Edge 30 Fusion** (1080×2400). ⚠ His system settings are NOT stock:
Font size at the 2nd stop, Display size at the 2nd stop
(`docs/reference-screens/premium/moto-display-settings.png`) — read
`devicePixelRatio` + `innerWidth` in-app before converting ANY px measurement to dp.

1. **CHAT OPEN: remove the slide for conversations** ("it's always yanky" — motion
   jumps straight to the end; a janky slide is worse than none). AMENDS #707 the way
   #718 did for Account: the CONVERSATION is excluded from the mobile slide rule; the
   sublevels/takeovers keep theirs (he passed A1–A4 happily). The open-stutter perf
   stamps still go in — the stutter exists with or without the slide, and the L10/#726
   treatment likely fixes the cause the slide was exposing.
2. (folded into 1 — Account already doesn't slide, confirmed good.)
3. **LIGHT CHAT CANVAS RULED: base #EEECEF · pattern ink #83058E at 6% opacity ·
   pattern AND gradient DEFAULT ON in light.** Amends the N81/N82 light story (flat
   #f4f6f9, desktop pattern-off): render first, contrast-check the bubbles + date pills
   + secure notice on the new ground before locking (the N82 measured history applies).
4. **Bubble tails: YES** — WA/TG grammar, tail on the group-start bubble.
5. **Names +1–2 weights** in rows — BOTH chats list AND tx list. References also set
   list nicknames ~1–2pt SMALLER while bolder — render both moves together. (Bot-group
   nameless sender = nickname face, re-confirmed.)
6. **Sent-bubble blue: soften a bit — REVERSIBLY.** Keep the current value in the token
   comment as the reversal (house rule anyway).
7. (= 5, both row types confirmed.)
8. Device + settings recorded above.

P.S. rulings: **filter chip text weight UP** (chats/wallet chips). **Account/settings
gaps**: audit ours against `tg-settings-dark.png` + `spixi-account-dark.png` in sheet
#3. **Contact details/chat info: redesign to TG's cleanliness** — reference
`tg-contact-details-dark.png` vs `spixi-chat-info-dark.png`; his call-outs: our layout
reads busy vs TG's (actions row → username card → context rows → groups), and **our
avatars "seem a bit off"** — review the gradient-avatar treatment (hue pairs, letter
weight/size, maybe subtle radial depth like TG's) as its own dial.

## 9 · LATE ADD (Damir, same night): THE NOTIFICATIONS SCREEN
(`docs/reference-screens/premium/spixi-notifications-dark.png`)

- **Gaps read wrong**: every switch row is its OWN card with inter-card gaps, while
  Account groups related rows into shared cards — one grouping grammar, apply the
  Account card-grouping here (all four rows are one "Notifications" group; the P2 note
  stays attached to its row). Rides sheet #3.
- **The OneSignal sub-label is confusing**: it permanently reads "Off: messages arrive
  when Spixi checks…" under a switch that is ON — a state-mismatched sentence at a
  glance. #712's intent (sub = the cost of the off state, note = what is true now) was
  honest but reads as a contradiction. Rewrite: the SUB becomes state-neutral and
  plain ("Wakes this device instantly when a message arrives. Uses OneSignal, a push
  provider." — or per-platform equivalent); the STATE-dependent explanation stays in
  the note below, which already follows the switch. Keep the #712 claim boundaries
  (token+IP disclosure, the off-cost per platform) — they move, they do not vanish;
  12 locales get re-drafts for whichever strings change.

## 10 · ★★ THE PICKS — Session I, 2026-09-02 (the ledger; DECISIONS #742 is the row)

Measured first (#736): Damir's Motorola renders at **devicePixelRatio 2.5** (two independent
layout reads), chat text scale 1.0. In CSS px: ours single-line bubble **40** (100 px) ·
WhatsApp **32.8** (82 px) · Telegram **29** (72 px, exact-colour mask). List pitch 72 / 75 /
76.4 · avatar 48 / 52 / 56 · composer PILL 50 / 46 / 43. The three apps' time digits are the
SAME 21 px; the " PM" width was the difference (his phone is 24-hour; the app followed the
en-us locale). §6: the Moto "Default" face is a different FAMILY (his Font-style screenshot);
unreachable from a WebView.

16 sheets in `docs/reference-screens/premium/sheets/` (real components, 432 CSS px, Roboto):

| dial | sheet | PICK | what moved | reversal |
|---|---|---|---|---|
| 1a bubble geometry | bubble-geo-light/dark | **A · TG-tight** | `--bubble-line-height 20 · -pad-y 6 · -pad-x 11 · -radius 18 · -gap-group 10 · -gap-inner 3 · -meta-margin-top 4` → single-line 32 CSS = 80 px | body-md 24 / spacing-8 / spacing-12 / radius-16 / spacing-12 / spacing-2 / spacing-8 (in the token comments) |
| timestamp | — (Damir's add) | **11/14 Medium + the device hour cycle** | `--bubble-meta-size 11 · -line-height 14 · -weight 500`; `Utils.deviceHourCycle()` → `hourCycle` custom string → `<html data-hour-cycle>` → `timeOpts()` | body-xs 12/16 regular; drop the carrier = locale default |
| 1c tails + elevation | bubble-tails(-dark) | **tail + elevation** | `--bubble-tail 8 / -tail-h 13`; `--bubble-elevation` light `0 1px 0.5px rgba(0,0,0,.13)`, dark `0 1px 1px rgba(0,0,0,.45)` | `--bubble-tail: 0px`; elevation `0 0 0 0 transparent` (never `none`) |
| 1d sent blue | bubble-blue | **A · #2160C2** (5.97:1) | both sent tokens, both themes | #1956B2 |
| 1e typeface | bubble-type | **(a′) Roboto tuned** | `--bubble-tracking −0.2px`, meta Medium | tracking-body-md (0), regular |
| 2 list + bars | list-light/dark | **current avatar + A** | avatar 48 stays; `--row-name-size 17 · -weight 600 · -weight-unread 700 · --row-pad-y 11 · --tx-name-size 15 · -weight 600 · --chip-weight 600`; desktop keeps 14 / pad 12 | body-lg 18 regular / semibold unread / pad 12 / #277 regular |
| 2b avatars | avatars-light/dark | **D** | radial depth (22% corner, ≈5% at the initials), anchors 1/2/3 re-tuned, hero initials 80 → 30px / 96 → 36px | the old hsl pairs in the trailing comments; 135° flat pair gradient |
| 3a chat info | info | **A canon** | `--row-h-nav 48 · --row-h-switch 56 · --row-h-member 56 · --screen-gap 12 · --screen-pad 12` | 52 / 44 / 48 / 56 mixed, gap + pad 16 |
| 3b notifications | notifs | **A + canon** | one `.c-settings__group`, the P2 note under it; sub = `notifPushProviderSub` (state-neutral) | the two "Off: …" sub keys (gone from 13 locales) |
| 3c account hub | hub | **A canon** | same tokens as 3a | — |
| 4 light canvas | canvas | **k2** | `--chat-canvas-base #EEECEF · --chat-pattern-ink #83058E @ .06`; gradient = `289deg #E9EDF4 → #EEECEF → #F2EAF1`; pattern + gradient default-ON everywhere; notice card `#E4E1E6` | #ebf0f5 · #061663 · the five-stop teal wash · desktop pattern-off · #dfe6ee |
| 5 composer | composer | **B** | ⊕ inside the pill (`--composer-attach-size 36`, 44 hit); `--composer-pad-block 6 · --composer-input-pad 6` → pill 46 = 115 px; the slot is ABSOLUTE and `#messages` pads by `--composer-h`; caret-without-keyboard (#733①) | #705's outside disc · spacing-8 · the in-flow slot · desktop-only autofocus |
| 6 menus | menu | **A** | `--menu-row-h 40 · --menu-row-gap 10 · --menu-gap 4`; react row + detail a step tighter | 44 / 12 / 8 |
| A1 entrance | (mid-frame render) | **hybrid** | `SlideTravel 0.4` + FadeTo; `--subslide-from 40%` + opacity keyframes | 100% travel, no fade |
| §4 riders | — | built | emoji-only = sticker + flag detector · blue event canon (file · reacted · app invite · connected) · nameless bot sender in the nickname face | — |
| not built | — | — | "X left the group" (#215 device check) · the secure-notice REDESIGN (colour re-tuned only) · the TG-order chat-info rebuild (canon landed; the reorder is the next sheet) | — |

## 11 · THE WALK CHECKLIST (Session I → Damir's device, from the sheets)

Every row is a PASS/FAIL on the Motorola Release (`-p:SpixiDevCoexist=true`) unless marked W (Windows).

1. **Bubble:** a single-line received bubble measures **80 px** tall on a screenshot (was 100); the text is 16, the time 11 Medium; the tail sits on the FIRST bubble of a group only; a faint lift under every bubble in light; dark bubbles separate from the #10151e canvas without mud.
2. **Timestamps read 24-hour** ("16:42") beside Telegram's on the same phone; Windows follows its own culture.
3. **Sent blue** reads a step softer, ticks still visible; white text legible.
4. **Chats list:** names semibold, unread bold, avatar unchanged at 48, row pitch ≈ 190 px on a screenshot; chips semibold; tx-list names semibold.
5. **Avatars:** the hero letter on chat info / Account is hero-sized; no olive/brown discs; a soft top-left light on every gradient disc.
6. **Chat info / Account / Notifications:** rows 48 / switch rows 56, tighter section gaps; Notifications is ONE card with the note under it; the OneSignal sub reads neutral under a switch in either state.
7. **Light canvas:** #EEECEF with the magenta pattern and the soft wash, default on a fresh install (Chat appearance still offers Solid / Gradient, Off / Subtle); the secure notice card reads as a card, not a blue patch.
8. **Composer:** ⊕ inside the pill, bottom-left; the tray still opens/closes on it (✕ rotation); the pill is shorter; the last message scrolls UNDER the pill; the chevron and @ FAB still float above it; keyboard rise still lifts the bar (Android + iOS).
9. **Caret-without-keyboard:** open a chat → caret blinks, NO keyboard; first tap on the field → keyboard rises; type; leave; re-open → same again. Both WebViews (#215).
10. **Menus:** long-press menu and chats-row menu rows tighter; every row still taps cleanly.
11. **Emoji-only:** "👍" and "🇸🇮" render as stickers (no bubble), time in a small chip; "ok 👍" stays a bubble.
12. **Chats list excerpts:** a file / a reaction / an app invite tail reads in the action blue.
13. **Nameless bot sender:** the truncated address above a bot-room bubble is in the nickname face, still copyable.
14. **Hybrid entrance:** About / Chat appearance / Notifications / the directory slide in over a fade; nothing "yanks"; back slides out + fades.
15. **Conversation open:** NO slide (instant), and the `[CDPERF]` lines in logcat — paste `chat onload / load / drain / present / frames` + the `chat-shell` line, at 3 contacts and at 50 (About → Seed).
16. **Account → Contacts:** no chat-list flash on the way in (`[L14] handoff pop released by cover` in logcat, not `backstop`); the way back unchanged.
17. **Legal:** About → Terms of Use scrolls the full 20-section document; Privacy Policy shows the summary (held) — fill the retention line + remove the "(Updated Session G/#708…)" note and the next build ships it in full.
18. **Bot info:** the Spixi-bot address row opens the sheet with copy + QR + the full address.
19. **W · Unread strip** runs pane-edge to scrollbar on the desktop chat.
20. **W · desktop rows:** names semibold at 14, pad 12 (unchanged sizes, only the weight).
21. **Notification:** the disc behind the small icon in the shade is the splash blue #175595.
