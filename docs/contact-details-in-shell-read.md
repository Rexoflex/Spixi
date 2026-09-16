# Contact details in the home shell — the read (#864)

Damir, 2026-09-16: *"check if we can do contact details in a bottom sheet to save chromium? How does it affect existing stuff."*

This is a read, not a build (#215 / #294). Everything below was measured against the files, not
remembered. The C# it would need cannot be built under #860 (Claude Code + F5 is the route).

---

## The short answer

**Yes, for the two home-side entries** (contacts directory row, chats row-menu "View contact") —
it is the #804 / #827 move applied to the last pushed page that still opens from the home
shell. **Not as a literal `c-sheet`**, **not from the chat header**, and **not before the
`CHAT_SPARE_ENABLED = false` experiment** has said which cost the stutter actually is.

## What it saves — and what it does not

| | |
|---|---|
| saves, per open | one cold WebView boot — #803 measured that class at **130–230 ms on the main thread** — and one live WebView while the surface is open (~15 MB PSS class) |
| saves, at idle | **nothing**. ContactDetails is not resident; unlike the #800 spare there is no standing cost to remove |
| AND-40 | **not the fix**. The 511 MB kill is a spike above a ~400 MB floor (#830); this batch changes nothing about the floor |

## What `contact_details.html` actually is

Not a details card. It renders **`createChatInfo`** (nickname override, notifications, group
members with kick/ban, shared groups, payment activity, remove / delete history) **and
`createWalletSend`** — the in-shell money compose (#640: `signSend` / `feeQuery` /
`sendrequest`). Measured bridge surface (`ContactDetails.xaml.cs`, 57 KB):

* **20 verbs in**: `back ban call cdoverlay chat disableNotifications enableNotifications feeQuery kick leave onload openChat removecontact removehistory sendContactRequest sendrequest sharedGroups signSend txdetails userdefinednick`
* **19 pushes out**: `addMember addPaymentActivity cdBack clearMembers clearRecentActivity leaveGroupResult removeContactResult removeHistoryResult setAddress setAvatar setCaps setContactNotifications setContext setGroupInfo setNickname setPaneMode setSharedGroups showCallButton showIndicator`

`HomePage.xaml.cs` already answers **11 of the 20 by name** (`back chat feeQuery leave onload
removecontact removehistory sendrequest sharedGroups signSend txdetails`) — the wallet tab and
the chats row-menu put them there. The C# batch is therefore:

1. the other **9 verbs** on HomePage (`ban call cdoverlay dis/enableNotifications kick openChat sendContactRequest userdefinednick`), each answered against the Friend the panel names;
2. **re-targeting the 19 pushes** at the home WebView *with the address as an argument*, so the panel can drop a late push for a contact it no longer shows — the Session T `checked` shape (`addKnownAddress(kind, address, nick, checked)`), not the page's implicit "this contact";
3. one **security-handover-gate row per verb** (new verb on HomePage) and the G-3 rule on every log line (`Address` formats base58 into `ex.Message`).

## The two forks it needs (both already have a precedent)

**① By host.** ContactDetails opens from three places through one router,
`HomePage.openContactDetails` (:1630): the contacts directory, the chats row-menu, and the
**conversation header** (`SingleChatPage.onContactDetails`). The first two are in the home
WebView and can mount the surface in place. The third is in the chat WebView, which **cannot**
host the money compose (#221: the conversation is walled off from the wallet) — and popping the
conversation to show a sheet in home would turn "look at who I'm talking to" into "leave the
chat". So the chat-header entry **keeps the page**. Same component on both arms (`createChatInfo`
is in the shared bundle), so the fork is hosting, not rendering — exactly the add-contact shape,
where `contact_new.html` still serves the desktop pane.

**② By width.** #247 pins ContactDetails into grid column 1 or 2 **beside a native WebView**. A
DOM surface inside home.html cannot sit in a grid column next to another WebView, so on a wide
window the router keeps pushing the page — the #836 `paneAvailable` fork, read at tap time.

## Security — no new exposure class, one re-verification owed

#221's wall is *conversation ↔ everything else*. ContactDetails is already on the shell side of
it: it holds wallet send, and it is C#-mediated from the conversation (`ixian:details` →
HomePage). home.html already renders nicknames and avatars (textContent + `safeImageSrc`),
hosts the wallet, and hosts the add-contact form since Session T. Moving the surface in does not
cross the wall; it moves within the shell side of it.

What is owed is the same **re-verification #804 did**, not a new model: `onNavigating` cancels
first and re-allows only `file:`; no catch logs a URL; every C#→JS push is dropped when the
panel is gone (the `loadGroupAvatar` guard shape); the money review sheet locks the overlay
stack in flight (tip-audit C1) exactly as it does today in the page.

## Shape: a takeover subscreen, not a `c-sheet`

The surface is tall (avatar, name, address, actions row, notifications, shared groups, payment
activity, remove / delete). A `c-sheet` on mobile is capped and scrollable (`max-height: calc(100%
- kb-inset)`), and this surface **spawns** sheets of its own (the money review, the remove
confirm). A sheet that opens sheets fights the stack. The add-contact form and wallet Send are
the precedents: an in-shell **subscreen** that slides over the list (`slideSubscreenIn`) with its
own topbar back. If Damir has a Figma for it as a sheet, that changes the answer — ask.

## What it touches, listed

* `HomePage.xaml.cs` — 9 new verb branches, 19 pushes re-targeted, `openContactDetails` gains the mobile arm (mount in shell) beside the existing pushes.
* `home.html` — `<link>` `chat-info.css` (28.7 KB, currently only in `contact_details.html`); a `mountContactDetails` in `contacts-page.js` or a sibling bridge file; the C#→JS handlers with the drop-if-gone guard.
* `contact_details.html` — **kept** (chat-header arm, desktop panes), same as `contact_new.html` was kept.
* `chats-row-menu.js` "View contact" and the directory `onViewContact` — route to the in-shell mount when `!paneAvailable()`.
* Pins — every pin that asserts `ixian:details:` from the directory / row-menu is re-based in **both halves** (#861); GATE 54 gains a (d) for the new mount; the handover gate gains 9 rows.
* Walk — contact details from the list, from the row-menu, from the chat header, on a phone and on a wide window; back from each; a late `addMember` push after backing out.

## Sequence

1. **`CHAT_SPARE_ENABLED = false`, rebuild, five minutes.** Improved → the resident spare is the cost and this is a nicety. Unchanged → cold boots are the cost and this batch is the treatment for the contact-details symptom.
2. If unchanged: the `[CDPERF]` probe comes back on the details open *before* code moves (#294; it was removed at #668).
3. Then the batch, in Claude Code (C# needs F5 — #663), with the handover rows written beside the verbs, not after.
