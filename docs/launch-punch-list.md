# Launch punch list — Damir, 2026-08-13 (Windows pass)

This file holds Damir's list of missing items for launch. The next session must read it
before it starts any build.

**This is a FIRST-PASS grouping, not a plan.** The groups and the effort marks are a
starting point. Agree the plan with Damir before you build anything.

Effort marks:

- **FE** = front-end only. No C# change. Full build sequence: bundle, then shells.
- **FE+C#** = needs a shell change and a C# change.
- **BE** = needs the Ixian Core or the back-end engineer. Check the capability first (#215).
- **?** = a question. Answer it with evidence before you plan the work.
- **MEASURE** = do not change code until you have a number (#294).

---

## A. Group identity and avatars

| # | Item | Mark |
|---|---|---|
| A1 | Groups in the chats list use the same icon as an unknown user. Add a distinct group icon. | FE |
| A2 | The group avatar is sometimes the single-user icon. Same root cause as A1. | FE |
| A3 | Every avatar without an image must use a white glyph or white initials, on a darker or more saturated gradient. Legibility is the goal. | FE |
| A4 | The gradients are too similar to each other. Widen the colour range. | FE |
| A5 | If I own the group, I must be able to rename it, change its image, and add people. | **BE** — check the Ixian Spixi repository for the capability first. `contact_details.html:206` states that no rename verb exists today. |

**Note on A5:** this is the same missing verb as the new item N1 below.

## B. Copy, translations, and languages

| # | Item | Mark |
|---|---|---|
| B1 | Remove every em-dash. Use simpler and friendlier copy. | FE — **measured: 250 em-dashes across the 8 locale files, 41 of them in `src/strings/en-us.json`.** |
| B2 | Check that the translations are correct. Add more major languages. Identify the first 15 to 20. | FE — **today there are 8 locales:** de-de, en-us, es-co, fr-fr, pt-br, ru-ru, sl-si, sr-sp. |
| B3 | Check that button labels fit in every language. Find the labels that are too long. | FE |
| B4 | Shorten the empty-state text for "no apps". Slovenian today: *"Igre, orodja in AI, ki delujejo neposredno v klepetu."* Find the correct short text for English and the other languages. | FE |
| B5 | Rename "Change wallet password" to "Change Spixi password". Key `changePassword`, 8 locales. | FE — see handoff item (f) |

## C. Layout and responsive faults

| # | Item | Mark |
|---|---|---|
| C1 | "Delete data" in Account is not responsive. It truncates on a small screen. The whole button card is cut off in a narrow desktop window. | FE |
| C2 | On desktop, must Send and Receive live in the pane instead of covering the wallet screen? | **?** — this is W2 case A territory. Read #338 first. |
| C3 | On desktop, in the apps screen, highlight the app in the list that the user is viewing. | FE |
| C4 | Wallet details: hide the address, date, fee, and transaction id behind a "See details" control that expands below. | FE |
| C5 | Private group chats need a member count in the top bar, under the group name. Use the bot-group pattern. | FE |
| C6 | The Account screen needs an explanation of the address. Add better text, or an info button that opens a sheet on mobile and a dialog on desktop. | FE |
| C7 | On desktop, the share button beside the address string does nothing. Hide it, or make it work. | FE |
| C8 | In the apps screen, the list-to-grid switch uses the apps icon. Use a real grid icon. | FE |

## D. Chat features

| # | Item | Mark |
|---|---|---|
| D1 | Reply to a message. Find the route that needs no C# change. If the reply is in a group, use the `@` mention. | **?** then FE — a real capability question. Check what the bridge already carries. |
| D2 | Pin a message to the chat. A sticky row at the top. Tapping it moves the user to that message. | **?** then FE |
| D3 | Group typing indicators. | **BE?** — check whether the stream already carries this. |
| D4 | Cancelling an app invite in the chat does not work. It must cancel, stay in the chat, and read "Cancelled" on both ends, until the user deletes the bubble. | FE+C# |
| D5 | Fine-tune the call bubbles. Fix the icons and the states. "Call back" must appear only on a call that the user missed. | FE |
| D6 | Redesign the security notice in the chat. Add a gradient. | FE |
| D7 | If a file is a media file, show the bubble as a square with a small preview after the download. | FE — **lowest priority (Damir)** |
| D8 | Share a contact. Open the contact picker, then share the address. The bubble shows the shared contact with an inline "Send request" control. | **?** then FE+C# |
| D9 | In the Spixi community bot group, the member list shows only a copyable address. Show "Add contact" when the user is not in the contacts. Consider payment actions there too. | FE |

## E. Account lifecycle and onboarding

| # | Item | Mark |
|---|---|---|
| E1 | "Delete account" must remove all data and return the user to the welcome screen. | FE+C# |
| E2 | When restoring, do not ask the user to make a backup. The community entry must work if it is already in the contacts. Check against the address. | FE+C# |
| E3 | **The backup screen does nothing when creating an account. "Backup now" did not work.** | FE+C# — **this is a defect, not a polish item. Treat it as high priority.** |
| E4 | The backup nudge needs a gradient. A dialog on Windows, a sheet on mobile. | FE |
| E5 | The rating nudge needs an illustration. Use `rate-me` from the images folder, not the current icon-illustration. | FE |

## F. Architecture questions — answer before you plan

| # | Item | Notes |
|---|---|---|
| F1 | *"Can we safely make Account an actual peer screen so it is preloaded, like Wallet, Chats, and Apps? What is the trade-off?"* | **Check the current state first.** DECISIONS #245 and #320 already shipped "Account as peer tab", with park and instant re-present. Ask Damir what is still missing. It may be the preload only, not the peer status. |
| F2 | *"What can we do about the Send flow? It is the only legacy screen. Can we redesign it with the existing flow, with no BE engineer?"* | **Read #338 before you answer.** W2 case A was built and then reverted, because it broke money flows on a wide window. `popPageAsync()` has two meanings. A correct fix must make each converted page's pop path overlay-aware AND extend the `ixian:tab:` sweep first. |
| F3 | *"Do we need skeletons?"* | **?** — decide this with Damir after C1 to C8, because it changes several screens. |

## G. Performance

| # | Item | Mark |
|---|---|---|
| G1 | An old Samsung Galaxy A52 5G is slow when entering a chat. Make it faster. | **MEASURE** — do not guess. Rule #294. Start with the chat open path: shell boot, `loadMessages`, avatar pushes. |
| G2 | `Utils.imageUriCache` has no size limit and no eviction. One 240 KB icon holds about 640 KB, because a .NET string is UTF-16. | **MEASURE** — see handoff item (g). |

## H. Visual polish

| # | Item | Mark |
|---|---|---|
| H1 | Find the legacy line-art pattern and use it. Make the patterns more subtle. The current "subtle" level must become the strongest level, then reduce from there. | FE — **note: this supersedes the #339 W5 re-dial. Say so in the DECISIONS row.** |
| H2 | While connecting (test with airplane mode), show a moving gradient line as the bottom border of the top bar. Decide whether this is only for connecting, or for loading too. | FE |

## I. Known faults with no group

| # | Item | Mark |
|---|---|---|
| I1 | A contact cannot be removed because the contact is in a group. Show which group, and offer the user a quick way to solve it. | FE+C# |
| I2 | "When on desktop adding contact" — **the item is incomplete. Ask Damir what the fault is.** | **?** |

## N. New items from the #340 test session

| # | Item | Mark |
|---|---|---|
| N1 | **A local contact nickname needs a reset.** Damir: *"if I change someone's nickname on my device, I must be able to reset it to normal."* Today Spixi has NO local rename: `src/shells/contact_details.html:206` states that no verb exists, and `friend.nickname` comes from the peer over the stream (`SpixiMessageCode.nick`). Therefore this is TWO pieces of work: (1) add a local nickname override, and (2) add a "Reset to their name" control that clears the override. The override must be local only. Do not send it to the peer. | **BE?** then FE+C# — check the Ixian Core store first (#215). Same missing verb family as A5 (group rename). |

---

## Items that this session already answered

- **The password screen size** — handoff item (a). The current behaviour is correct for W7.
  The in-pane version is cheap. Do not pin the page to grid column 1.
- **The label rename** — handoff item (f), and B5 above.
- **Chat → request money uses the legacy screen** — handoff item (b).
- **A nickname change does not refresh the chats list** — handoff item (c).
- **Avatars do not render on all surfaces** — handoff item (d). The screens are not named yet.
- **The image cache has no limit** — handoff item (g), and G2 above.

## H3 — desktop dark-mode colour pass (Damir, 2026-08-14) — ⏳ LATE, NEEDS DAMIR'S COLOURS

**Damir has already changed the screen title and the selected states on desktop from the
brand accent to NEUTRAL.** This item is to finish that pass properly and to supply the
values. 🟡 **BLOCKED ON DAMIR: he provides the colours. Do not pick them.**

**Why the direction is right.** On desktop three "you are here" signals are visible at
once — the rail tab, the filter chip and the selected list row. If all three carry the
accent, none of them reads as primary and the surface reads as busy. Reserve saturation
for ACTION and ATTENTION (primary button, unread badge, links). Use neutral elevation
for STRUCTURE (titles, selected rows, the active rail item). A screen title is structure,
not an action, so it should not be accent-coloured at all.

Dark mode sharpens this: saturated blue on near-black has lower effective contrast than
on white, and large areas of it visually vibrate.

**Two things to verify when the colours land:**

1. **Keep ONE accent anchor** so the app does not feel dead — normally the rail's active
   indicator or the unread badge. Neutral everywhere costs the interface its pulse.
2. **The neutral selected state must still be legible.** On a dark surface a selection
   generally needs at least a 4-6% lightness step before it reads as selected rather
   than as a rendering artefact. Check `--surface-interactive-selected` in
   `src/styles/tokens.css`. Selection also carries `aria-current`, so the non-colour cue
   for accessibility already exists — but a sighted user still has to see it at a glance.

Related: **A3** (white glyph/initials on avatars) and **A4** (widen the avatar gradient
range) are the same class of problem. Do all three in one colour pass.
