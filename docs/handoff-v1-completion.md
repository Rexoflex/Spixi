# Handoff — v1 mobile-completion batches (#195–#200)

Six autonomous batches from Damir's v1 list (2026-07-07). Each was built on the
frozen bridge, ran an **adversarial reviewer agent + audit-fix loop**, and has a
DECISIONS row (#195–#200) + BE asks in `docs/be-cutover-brief.md`. All uncommitted
in the working tree — this is the build + smoke + F5 + commit gate.

## The ONE build sequence (run once, covers all six batches)
```
node scripts/generate-icons.mjs          # (only if icons changed — none this round; safe to skip)
node scripts/build-demo-bundle.mjs        # components changed: contacts-shell, contacts-page (NEW), apps-item,
                                          #   settings-shell, settings-app, settings-backup, wallet-receive
node scripts/build-shells.mjs             # DEFAULT now writes 12 drop-ins (7 NEW: contact_details, contact_new,
                                          #   app_details, app_new, settings_backup, settings_encryption,
                                          #   downloads, dev, contributors)
node scripts/smoke-test.mjs
```
Then build/run net10.0-windows and F5 the checklist below → commit (one commit or six per the DECISIONS rows).

## What each batch delivered

| # | Batch | Zero-C# now | Built + BE-gated (flagged) |
|---|---|---|---|
| 195 | **Dark tunings + 2 backlog fixes** | sent-bubble gradient `180deg #353FB7→#2046A7` · chat base `surface-neutral-01` · pattern ink `hsla(242,76%,72%)` · nameless-sender→truncated copyable address (handles nick==address) · my-reaction persists across re-flush (per-peer localStorage) | — |
| 196 | **Chat info + contact details** | `contact_details.html` (NEW, 1:1/bot: nick edit·pay·request·payments·delete-history·remove) · in-chat group/bot info takeover (members·notifications·leave) | 1:1 mute · group roster push · tx enum · bot destructive (CI1–CI5) |
| 197 | **Contacts (FAB + topbar)** | picker (FAB)→open chat · directory (topbar)→contact details · `contact_new.html` (NEW add-contact) · roster from clearContacts/addContact | group-create-in-shell · pending badge · dual-nick (CO1–CO5) |
| 198 | **Apps details + add** | `app_details.html` (NEW install/launch/uninstall) · `app_new.html` (NEW fetch/scan/file) · apps-item menuBtn guard | verified flag · fetch-fail push (A3/A4/A5b) |
| 199 | **Account/Settings** | Save button (`ixian:save`) · `settings_backup.html` (NEW, w/ **backup.svg**) · About + How-to takeovers · peer bottom-nav on the account screen | change-pw/downloads/dev/contributors shells built, hub rows GATED (S7–S12) |
| 200 | **Wallet Receive + Send** | **Receive LIVE** (QR·copy·request-amount, from `setAddress`) | **Send** compose built, gated `composeSend` OFF → native `ixian:sendixi` stays live (W5–W8) |

## F5 checklist
- **Chat:** dark canvas + saturated white-text outgoing bubble + periwinkle pattern · nameless bot/group sender shows a truncated address you can tap-to-copy · react to a message → your ❤ pill stays selected after the chat re-flushes/reopens · group header tap → in-chat info (members/notifications/leave); 1:1 header tap → contact details page (nick edit/pay/request/payments/delete/remove).
- **Chats list:** FAB → contacts picker → tap a contact opens the chat · topbar Contacts → directory → tap → contact details · Add contact → the redesigned add-contact page (address + scan + send request).
- **Apps:** tap an app → redesigned details (install/launch/uninstall) · + → redesigned add-app (fetch URL / scan / install-from-file).
- **Account:** bottom-nav Account shows the hub with a **Save** button + the bottom nav · Backup row → redesigned backup screen with the backup.svg illustration · About + How to use open as slide-in views. (Change-password / Downloads / Contributors / Dev rows are hidden — gated pending BE nav verbs.)
- **Wallet:** Receive → redesigned QR takeover (copy address, request an amount) · Send → still the native flow in v1 (compose is built but gated off until the BE sign verb).

## Notes / caveats
- **Reviewer catches fixed this round:** app-details `showAppRemoved` import-shadow (uninstall re-render) · settings `downloads` "Delete all" wired a dead SettingsPage verb (row removed) + peer-nav dropped unsaved edits (now routes through save-if-dirty) · wallet Receive "send request to contact" wired a WalletReceivePage verb dead on HomePage (strip gated off) + address colon-strip risk (now verbatim). Contacts round fixed 4 MINORs (roster flash, scroll, stale-✓, request wedge).
- **Sandbox #175:** all edits were made/validated with the file tools; node builds are your local step (the mount truncates large files). The build sequence above is the source of truth.
- **BE cutover:** everything gated is in `docs/be-cutover-brief.md` — CI1–CI5 (chat info), CO1–CO5 (contacts), A3–A5b (apps), S7–S12 (settings), W5–W8 (wallet). Flip the capability flags / add the verbs in the one BE pass to light the gated features up.
- **Account peer-tab is a partial:** the account screen now wears the bottom nav, but tapping another tab lands on home's *last* tab (no home-tab-select verb) and theme/language changes still drop a held nickname (legacy parity) — both need BE (S11 / a save-without-pop verb).

---

## Round-2 F5 fixes (#201) — same build sequence, re-test list

After your first F5 you reported gaps per screen; Round-2 fixed all the zero-C# ones (adversarial review CLEAN). Same build sequence applies. **Component files changed → the `build-demo-bundle` step is required.**

Re-test after rebuild:
- **Chat:** bot **channel selector** appears (bot chats) and switches channels · a **named** group/bot sender's address is copyable (tap → member sheet) · a big **GIF** preview no longer spills under the composer (opens the full-screen viewer) · pattern is lighter (dark).
- **Contacts:** entering **contact details** no longer flickers · **back** from details returns to the **directory** (not chats) · add-contact **button sits under the input** · an **invalid address** shows an inline error (no system dialog / freeze).
- **Apps:** **+** opens the **premium** add-app (Paste link / Scan QR / From file tiles + trust banner, no Discover) · **tap a card → launches** the app · **info icon → details** (uninstall lives there) · **Explore banner** shows and opens apps.spixi.io.
- **Account:** **Save** no longer flickers / no empty-Apps jump (lands on chats) · **theme now propagates** to every screen (pick light/dark in Account → chats/chat/wallet all follow) · backup no longer asks for a (fake) password.

Still BE-blocked (built + gated, need the cutover — not bugs): account QR/address (S1), Downloads/Contributors/Change-password reachability (S7/S8/S10), backup "Action needed" status (S2), wallet Send (W5) + Receive→request-a-contact (W8), how-to external link (S13), apps real icons + list-uninstall (A1). Parked by your call: full apps ⋮ interaction (desktop-final), account directional slide-in (enhancement).
