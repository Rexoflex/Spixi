# SESSION H — THE SUBSCREEN SLIDES, THE SKELETON ROSTER, AND THE REVIEW

Spixi frontend redesign. Repo: `C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi`
Branch `redesign/frontend`. Ixian-Core is a SIBLING clone at `..\Ixian-Core`, frozen at `097341a`.
**Read `docs/handoff-2026-08-31.md` first (all five sections — §5 is the walk addendum), then
this.** DECISIONS #702–#721 are Session G; read #714, #715, #716 — three device-found root
causes, each a lesson about where a page actually lives.

## VERIFY THE BASELINE, AND STOP IF ANY NUMBER DIFFERS
```
bundle 313 · shells 18 · smoke BASELINE OK 3831 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 788 · i18n-lint ✓ · pseudo 9/9 · cs-syntax 140 clean + 1 known gap
Ixian-Core 097341a (170 modified = CRLF churn; --ignore-cr-at-eol EMPTY)
```
⚠ Run `cs-syntax-check` and the smoke in a Linux CONTAINER (clone `origin/redesign/frontend`;
`npm i jsdom tree-sitter tree-sitter-c-sharp`). The device VM cannot build tree-sitter and the
bridge kills anything past 45 s. ★ MEASURE THE CLOSING NUMBER AFTER THE LAST EDIT TO THE SUITE.
⚠ Mutate in a FULL copy (`tar`), never `cp -al` — shared inodes made three parallel builds write
one file (handoff §4). ⚠ Never `open(p,'w').write(open(p).read()…)` — it zeroes the file. Twice.

## ① THE SUBSCREEN SLIDES THAT L9 COULD NOT REACH (Damir's walk row 31)
#707 slides every NATIVE overlay on mobile. These are IN-SHELL views and still appear instantly:
Contacts (from the Chats FAB and from Account) · Chat appearance · Notifications · How to use
· About · Contributors · Delete data · **Wallet Send / Receive** (Damir: yes) · the Launch
**create / restore** views. Build ONE shared slide (a small component, 220 ms in from the
right, 220 ms out, `prefers-reduced-motion` instant, NEVER under `:root[data-desktop]` —
#704: desktop only chat info slides) and attach it where each shell mounts the view:
`settings.html` `renderLayout`/`showHub`, `home.html` `contactsView` + the wallet takeovers,
`launch-shell.js` `show()`. The exit must run BEFORE the swap, and hardware back / the edge
swipe / the arrow must all take the same exit. ★ RENDER a phone before he rebuilds.
⚠ Ask before sliding anything not on this list.

## ② BOT-GROUP CHAT INFO: PAINT FIRST, SKELETONS IN BATCHES (Damir)
The bot room's chat info arrives late as one paint (L10's family). Wanted: the info card
paints at once, the roster shows skeleton rows, and real rows replace them in small batches
(requestAnimationFrame-paced, ~20 per frame — measure, then pick). `chat-info.js`,
`createChatInfo`, the roster push path in `ContactDetails.xaml.cs`. Smooth open is the goal;
do not change what the roster contains.

## ③ TWO L14-FAMILY FLASHES — instrument, do not guess (walk rows 57 · 58)
Desktop: Account → Contacts briefly shows the CHAT LIST in the left pane before Contacts takes
over, and again on the way back (longer the second time). Mobile: Account → Contacts → back
flickers — re-check first, #718 stopped Account sliding. #688 falsified the last traced
mechanism; the next instrument must observe the PAINT (a frame-timestamp probe), not the swap.

## ④ URL PREVIEWS — OG image / meta (Damir's question, logged)
A preview needs SOMEONE to fetch the page. The reader's device fetching it leaks the reader's
IP to every linked site (#82 — the same rule that gates remote media). Honest options:
sender-side preview (the sender fetches, embeds title/description/image bytes in the message —
a protocol addition, BE), or none. Write the decision memo; build nothing until he rules.

## ⑤ SMALL, WAITING ON HIM
- Icon exports: `tabler-icon-volume` (In-app sounds), `tabler-icon-bell-ringing` or
  `cloud-bolt` (the OneSignal row) → `src/assets/icons/` → `node scripts/generate-icons.mjs`.
- The chat doodle pattern's ORIGIN (docs/legal/third-party-notices.md marks it OPEN).
- `[EXCERPTDIAG]` and the Samsung `LinkUri is null (mime…)` lines from his next walk.
- The iOS rows of the walk (15–27, 37) — return them when he says he is on the Mac.

## ⑤b THE 760 COLUMN — RULED, BUILD IT (Damir 2026-08-30: "Yes 760")
Wide desktop only (`:root[data-desktop]`): the conversation column and the composer are
capped at **760px** and centred; the canvas (gradient + pattern) stays full-bleed. Bubbles
keep `--layout-bubble-max` inside the column; the unread strip, date pills and the secure
notice centre with it; the chevron / @ FAB keep their inset from the COLUMN's edge, not the
window's. Telegram Desktop / iMessage / Signal Desktop grammar — the render is in the
Session G chat (lower half of the desktop image). One rule in `chat.html`'s desktop block,
a pin, a Windows walk. Phones untouched.

## ⑥ THEN THE REVIEW
A full Opus adversarial review of Sessions A–G (#642–#721): three read-only auditors with
disjoint scopes (JS shells + components · C# pages + platform · pins/build scripts),
findings with file:line, fixers, a reviewer, loop to CLEAN (the #46 rule). And the
security-handover gate sweep for #642–#721 — new verbs (`ixian:notifPushProvider`,
`ixian:cleardetail`, the back mirrors), the `spixi.hsstage.<addr>` key, the tray, edge-back:
introduced-vs-inherited, one question per finding.

## THE RULES (the short list — the long one is DECISIONS)
Trace what the platform actually reads (#714 #715 #716 were all "the page is not where you
think it is") · a bare key name is a prefix test · kill is the exit code · keep the controls
· a value that works by coincidence breaks when the coincidence does · measure, and let it
overrule you · render before he rebuilds · commit is Damir's, in GitHub Desktop.
