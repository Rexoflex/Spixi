# Apps experience — premium UX proposal

A proposal (not yet built) for optimising the whole mini-app lifecycle — **add · discover · view details · install · launch · uninstall** — beyond the faithful redesign we shipped. The redesign matched the Figma and the legacy flows; this is about making each step feel like a modern, premium app store rather than a developer form. Everything below is FE-only unless flagged **(§8/BE)**.

**Guiding principle:** *fewer screens and overlays, more inline state, discovery-first, and forgiving actions.* Every place the legacy app hops between a form → a modal → another modal is a place we can collapse into one confident, inline moment.

---

## 1. Add a mini app — the biggest win

**Problem (legacy, still in the current build):** the Add screen leads with a raw URL text field and three buttons. That's a developer form. Most users don't have a URL to paste — they want to *browse*, or a friend hands them a QR.

**Proposed:**

- **Discovery-first.** The primary "add" path is **Browse the directory** (Discover), presented as the hero action. Pasting a link becomes a *secondary* "Add manually" path, not the first thing a user sees.
- **Method tiles, not a form.** Replace "URL field + 3 buttons" with a small set of clean, tappable rows/tiles, each icon + one-line description: **Browse Spixi Mini Apps** (hero) · **Scan a QR code** · **Paste a link** · **Install from a file**. Nothing is a naked input until the user chooses it.
- **Progressive disclosure.** Tapping "Paste a link" *then* reveals the input — with an **instant inline preview card** (icon · name · publisher · verified) fetched as they paste, and an Install CTA right there. No navigating to a separate details screen just to find out what the link is.
- **QR as a first-class path.** Peer-to-peer sharing (a friend shows a QR) is a core Spixi behaviour — make Scan prominent, not a tertiary button.

This turns "add" from a chore into the friendliest surface in the shell.

---

## 2. Install — collapse the modal chain

**Problem:** the legacy flow is Install button → confirm sheet → **installing modal** → **success modal** — three overlays stacked on top of the details screen.

**Proposed:**

- Keep **one** confirm step (the permissions + source sheet — it's a genuine trust checkpoint), but make it **trust-forward**: publisher + **verified** badge prominent, permissions grouped by sensitivity (payments / identity first) with plain-language, "Source" shown but understated.
- On confirm, the **Install button morphs inline** — spinner → "Installing…" → a success check (we already have the `setLoading`/`setSuccess` button morphs) — and then simply becomes **Open**. **No separate installing or success modals.** Optionally a quiet toast "Installed".
- Net: from three overlays down to one sheet + an inline button state. That single change is the clearest "premium" upgrade in the flow.

---

## 3. Details — an app-store listing, not a spec sheet

**Proposed:**

- **Hero header:** large icon, name, publisher + verified, a **category** tag, and a **sticky bottom Install/Open** so the CTA is always reachable.
- **Screenshots / preview carousel** near the top **(§8/feed — needs the directory to provide images)**. This is the single biggest driver of "does this feel like a real store."
- **About** (description) · **What's new** / version notes **(§8)** · size · permissions as tap-to-explain chips.
- **Move the raw install URL into an "Advanced" disclosure** — developers care about it, users don't; it shouldn't sit in the main flow.
- Ratings / install counts are a nice-to-have later **(§8)**.

---

## 4. Launch — make it feel like a launcher

**Proposed:**

- **Tap-to-launch.** Tapping an installed app (icon/card) should *open the app*, not its details — the app-launcher mental model. Details/Uninstall live on the **⋮ / long-press**. (This is the open flag from the build; I recommend flipping tap → launch.)
- A subtle **launch transition** (the icon expands into the app view) reads as premium and orients the user.
- A **"Recently used"** row at the top of the installed view for one-tap relaunch of the apps people actually use.
- **Multi-user apps:** launching presents a clean "Play solo · Invite a friend" choice instead of a bare contact picker.

---

## 5. Uninstall — forgiving, not a modal chain

**Problem:** legacy is confirm modal → **removed modal**.

**Proposed:**

- **Swipe-to-uninstall** on a row (consistent with the chats-row swipe we built), or long-press → a lightweight manage mode.
- Replace the modal chain with: remove → **toast "App removed · Undo"**. **Undo** restores it instantly. Forgiving, fast, no blocking dialog. (Keep a confirm only for apps with sensitive permissions / stored data.)

---

## 6. Cross-cutting polish

- **One chip & badge system.** Extract a **static/read-only variant of `c-chip`** so capability chips reuse it, and use **`c-badge`** for the verified badge — instead of the two custom elements I built. Consistency *is* premium.
- **Skeleton loaders** for Discover and link-fetch, so nothing pops in blank.
- **Friendly empty state** with an illustration + "Browse the directory" CTA, not just a line of text.
- **Real, rounded-square app icons** with a hair of elevation; graceful gradient fallback (already built).
- **Recents / favourites** surfacing.

---

## 7. Suggested rollout

**P0 — pure FE, high impact, do now:** collapse the install flow to inline button progress (no installing/success modals); uninstall → toast + Undo; the Add flow as method-tiles + progressive disclosure with inline paste-preview; decide tap → launch. *(Grid alignment already fixed.)*

**P1 — FE, unblocked once the Discover feed lands:** discovery-first add, the store-style details header, category tags, skeletons.

**P2 — needs §8/BE:** screenshots + "what's new" in the directory feed, `addApp`+publisher (so installed rows show the creator), ratings, and uninstall-by-id from the list.

**Recommendation:** start with the **install collapse** and the **Add-flow reimagining** — they're the two that most make the app feel modern, and both are pure frontend. Say the word and I'll build them behind the same audit loop.
