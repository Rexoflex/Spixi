# Apps experience — premiumisation interview

Answer inline (a letter, "agree", or your own take). Each has my recommendation so you can move fast. Grouped by flow.

---

## A. Add a mini app (the main rework)

**A1 — Primary path.** How should "Add" lead?
- (a) **Discovery-first** — Browse the directory is the hero; paste/scan/file are secondary. *(recommend)*
- (b) Manual-first — keep link/scan/file up front.
- (c) Equal weight.

**A2 — Entry point.** What triggers Add, and what does it open?
- (a) A **+ button** that opens a small "Add" sheet (Browse · Scan · Paste · File). *(recommend)*
- (b) + goes straight to Discover; manual add tucked inside.
- (c) Keep the current FAB → full Add screen.

**A3 — Method presentation.** Replace the URL-field-first form with…
- (a) **Clean method tiles/rows** (icon + one line each), input revealed only when you pick "Paste a link". *(recommend)*
- (b) Keep a visible URL field + buttons.

**A4 — Paste-a-link.** After pasting a link, show…
- (a) an **instant inline preview card** (icon/name/publisher) with Install right there. *(recommend)*
- (b) navigate to the full details screen (current).

**A5 — QR.** How prominent is Scan? (Spixi is P2P/QR-heavy)
- (a) First-class, near the top. *(recommend)*
- (b) Secondary.

**A6 — From file.** Keep the "install from file" method? (yes / no / only on desktop)

---

## B. Install

**B1 — Modal chain.** Collapse install to **one confirm + inline button progress** (spinner → check → "Open"), dropping the separate installing/success modals?  (recommend: **yes**)

**B2 — Confirm step.** Keep the permissions/source **confirm sheet** as a trust checkpoint, or auto-install for **verified** apps? (recommend: keep confirm; consider auto for verified later)

**B3 — Permissions display.** You chose compact chips earlier — for premium, revisit?
- (a) Keep **compact chips**.
- (b) **Plain-language list grouped by sensitivity** (payments/identity first). *(recommend for trust)*
- (c) Chips by default, tap a chip → plain-language explanation.

**B4 — After install.** Auto-surface **Open** inline (recommend), and/or a quiet "Installed" toast? (your call on the toast)

---

## C. Details / listing — **heavy rework** (your priority)

Think "polished app-store listing." Questions from the top of the screen down.

**C1 — Header style.** How rich should the top be?
- (a) **Cover/hero banner** (a wide branded image or gradient) with the icon overlapping it, name, publisher, verified — full app-store feel. *(recommend if the feed can supply a cover; gradient fallback otherwise)*
- (b) Compact header: icon + name + publisher + verified (no cover).
- (c) Big centred icon, name, publisher stacked (minimal).

**C2 — Primary action.** Where does Install/Open live?
- (a) **Sticky bar pinned to the bottom** (always reachable, store-style). *(recommend)*
- (b) A prominent button in the header next to the icon.
- (c) Inline in the content (current).

**C3 — Screenshots / preview media.** A **carousel** high on the page (needs the feed to provide images)?
- (a) Yes — screenshots carousel is the biggest "real store" signal. *(recommend, feed-gated)*
- (b) Support a single hero preview only.
- (c) Skip media.

**C4 — Section order.** Propose the vertical order (drag your preference):
hero · **screenshots** · short tagline · **Install/Open** · about (expandable) · **what this app can do** (permissions) · info (version/size/category) · developer · related apps.
→ Tell me your ideal order, or "use recommended."

**C5 — Description.** Long descriptions: **clamp to ~3 lines with "Read more"** expand? (recommend: yes)

**C6 — Permissions in details.** Beyond the confirm-time chips, in the details body do you want a **"What this app can do"** section with plain-language lines + icons (e.g. "🔐 Can sign you in", "💳 Can request payments")? (recommend: **yes** — this is a premium trust moment)

**C7 — Trust & safety cues.** Which to show?
- Verified-publisher emphasis · a subtle "Runs securely inside Spixi — no data leaves your device without permission" reassurance line · a **Report app** affordance (⋮). Which of these do you want? (some may need §8)

**C8 — Social proof.** Ratings ⭐ · install count · reviews — want any of these (all need §8/feed)? (yes-all / ratings-only / later / no)

**C9 — Metadata block.** Which fields, and in what priority: **category** · version · size · app ID · "what's new"/changelog · last updated · languages. Mark must-have vs nice-to-have, and which can hide under "Advanced".

**C10 — Developer / publisher block.** Show a **publisher row** (avatar + name + "More from IXI Labs →" + verified), tappable to their other apps? (yes / later — needs feed)

**C11 — Related apps.** A **"You might also like"** strip at the bottom (needs feed)? (yes / later / no)

**C12 — Multi-user signal.** Surface clearly that an app is **multiplayer** (a badge/label like "Play with friends")? (recommend: yes)

**C13 — Install URL (dev).** Move the raw appinfo URL + copy into an **"Advanced" disclosure**, out of the main flow? (recommend: **yes**)

**C14 — Uninstall placement (installed apps).** For an installed app's details, where does Uninstall go — secondary button, or in a ⋮ so the primary CTA is a clean "Open"? (recommend: ⋮, keep Open primary)

---

## D. Launch

**D1 — Tap behaviour.** Tapping an installed app should…
- (a) **Launch the app** (app-launcher model); details/uninstall on ⋮/long-press. *(recommend)*
- (b) Open **details** first (current).

**D2 — Launch transition.** Want a subtle **hero animation** (icon expands into the app) on launch? (yes / no / later)

**D3 — Recently used.** A **"Recently used" row** at the top of installed for one-tap relaunch? (yes / no)

**D4 — Multi-user apps.** Launching a multi-user app → a clean **"Play solo · Invite a friend"** choice? (recommend: yes)

---

## E. Uninstall

**E1 — Gesture.** Add **swipe-to-uninstall** on rows (consistent with the chats swipe)? (yes / no)

**E2 — Confirmation.** Replace the modal chain with **remove → toast "App removed · Undo"**?
- (a) Toast + **Undo**, no modal. *(recommend)*
- (b) Keep a confirm modal.
- (c) Confirm **only** for apps with sensitive permissions/stored data; toast+undo otherwise. *(good middle ground)*

---

## F. System consistency (your question)

**F1 — Chips.** Unify: extract a **static/read-only `c-chip` variant** and reuse it for capability chips, instead of the custom `c-app-cap` I built? (recommend: **yes**)

**F2 — Verified badge.** Use the existing **`c-badge`** for the verified badge instead of my custom one — if it fits the shape? (recommend: **yes, if it fits**)

**F3 — Text input.** Extract a reusable **`c-text-field`** (for the add-link input + future forms), rather than a one-off input? (yes / not now)

---

## G. Layout & visual

**G1 — Default view.** First open shows **list** or **grid**? (recommend: list)

**G2 — Card content (grid).** On a card, show: icon (48/64?) · name · **creator** · **category tag**? Which of these belong on the card vs only in details?

**G3 — Icon polish.** App icons: rounded-square with a hair of **elevation/shadow**? (yes / flat)

**G4 — Empty state.** Friendly **illustration + "Browse the directory" CTA**, not just a text line? (recommend: yes — illustration language pending)

---

## H. Scope & sequencing

**H1 — First slice.** I recommend building **(1) the collapsed inline install** and **(2) the reimagined Add flow** first (both pure FE, biggest premium jump). Agree, or a different starting point?

**H2 — Anything missing?** Any part of the app experience that bugs you that I haven't covered here?
