# F5 CHECKLIST — SESSION H (#723–#730)

Build first, in this order (any terminal with Node on the REAL files):
```
node scripts/generate-icons.mjs          (expect: 90 icons · read-back ✓)
node scripts/build-demo-bundle.mjs       (expect: 317 exports)
node scripts/build-shells.mjs            (expect: 18 shells)
node scripts/smoke-test.mjs              (expect: BASELINE OK 3892 / the 3 known)
```
Then wipe `obj`/`bin` → build (Windows = F5, never `dotnet build` — #663) → walk.
Android for §1–§4; Windows for §5–§6.

## 1 · The subscreen slides (#725) — Android phone
- [ ] Account → About: slides in from the right (300 ms), Back: slides OUT revealing
      the hub (hub's nav visible under the exit). Same for How to use, Contributors,
      Chat appearance, Notifications, Delete data, Change password.
- [ ] Chats FAB → New chat: slides in over the list; its Back slides out. Same from
      Account → Contacts.
- [ ] Wallet → Receive and Send: slide in/out. A TAB TAP while one is open closes it
      INSTANTLY (no slide — programmatic close).
- [ ] Launch (fresh install or log-out): Create your account slides over welcome;
      Back slides it off. Restore the same.
- [ ] ★ THE L8 ARM: open Contacts → press hardware back TWICE fast. The second press
      must ABORT the slide (cover snaps away) — the app must NOT background. Repeat on
      a wallet takeover and on Account → About.
- [ ] During an exit slide, tap where a list row will be: the tap must be EATEN
      (shield), not open a chat underneath.
- [ ] ⊕ in a chat: tap ⊕ three times fast — the third tap re-opens the tray.
- [ ] Windows: NO slide anywhere in-shell (instant swaps, #704 — only chat info slides).

## 2 · The skeleton roster (#726) — a big bot room
- [ ] Open the bot room's info: the card (hero, name, count, notifications) paints AT
      ONCE with skeleton member rows; real rows fill in visibly smooth batches.
- [ ] Search members mid-fill: filtering works, no dupes, no frozen tail.
- [ ] A private group + a 1:1 open exactly as before (single paint).

## 3 · [PAINTDIAG] — the L14 walk (#727)
Desktop AND phone: Account → Contacts → Back, twice. Then pull the log / logcat:
- [ ] `[PAINTDIAG] account-closed t=…` → `[PAINTDIAG] cover=<ms>` — the gap = how long
      the chat list was really visible on the way IN.
- [ ] `[PAINTDIAG] backsend=<ms>` → `[PAINTDIAG] re-present SettingsPage t=…` — the
      way-back timeline. Send me the four lines; the fix gets designed from them.

## 4 · The composer pill (#724) — dark theme
- [ ] The pill is clearly findable on the dark canvas (own ground + visible hairline).
- [ ] Type 6+ lines: a THIN thumb, no arrows, no track column; text does not shift.

## 5 · The 760 column (#728) — Windows, wide window
- [ ] Conversation column + composer capped ~760 and centred; canvas full-bleed edge
      to edge; scrollbar at the WINDOW edge; chevron/@ FAB hug the COLUMN's edge.
- [ ] Narrow the window below ~780: layout identical to before the batch.

## 6 · Riders
- [ ] Settings → Notifications: In-app sounds wears the volume glyph; the OneSignal
      row wears cloud-bolt.
- [ ] Welcome → Privacy Policy link: the summary reads platform-honest (🟡 wording
      pass yours, #730 — the claim boundaries are in the launch-shell docblock).
- [ ] Downloads / App details (mobile): hardware back still closes an open confirm
      first, then the page (the B MINOR-2/N-3 fixes must not have moved this).
- [ ] Contact details → Pay: compose + native confirm still work (signSend is now
      peer-scoped; the confirm must appear exactly as before). Chat attach-Pay too.

## Commit
One batch, message in `docs/commit-message-session-h.txt`. ⚠ NEW files to `git add`:
`src/components/subscreen-slide.js` · `src/styles/components/subscreen-slide.css` ·
`docs/opus-review-verdict-session-h.md` · `docs/security-gate-sweep-642-722.md` ·
`docs/url-preview-memo.md` · `docs/f5-checklist-session-h.md` ·
`docs/handoff-2026-08-31b.md` · `docs/commit-message-session-h.txt` ·
`src/assets/icons/tabler-icon-{volume,bell-ringing,cloud-bolt}.svg`.
Never `git add -A` (CRLF churn); never plain `git status` on the mount
(`git --no-optional-locks`).
