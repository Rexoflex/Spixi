# F5 checklist — R1 identity round (#364–#368)

**LANGUAGE RULE: ASD-STE100.** Short sentences. One instruction per sentence.

Batch: N1 avatar rework · N34 owner chip · N26/D-5 member relation · N27
remove-blocked groups. C# CHANGED (SingleChatPage · ContactDetails ·
SpixiContentPage) → full app build required. The cloud twin could not compile
C# — treat the C# as uncompiled until your build succeeds.

## Before F5

1. Extract the tarball at the repo root: `tar xzf spixi-r1-364.tar.gz` (PowerShell).
2. Run `node scripts/smoke-test.mjs`. Expect **BASELINE OK — 1813 pass / the 4 known pre-existers**.
3. Build `net10.0-windows` (Build, NOT Rebuild). Then deploy Android if you test leg B.
4. Generators already ran in the twin. The tarball carries the built bundle + 22 shells + locales. Do not re-run generators unless smoke fails.

## A. N1 — avatars (#364)

| # | Step | Expect |
|---|---|---|
| A1 | Open the chats list, LIGHT theme | Group AND bot rows show the two-person glyph on a gradient. Person rows keep initials. No row shows the single-person glyph unless it has no name |
| A2 | Switch to DARK theme | Gradients stay dark and saturated. Initials/glyphs are WHITE (the old dark mode showed pastel discs with dark initials) |
| A3 | Scan your real contact rows | Colors spread across distinct anchors. No "four similar greens" |
| A4 | Open a group chat, then a bot room | Topbar avatar = group glyph. Chat info hero = group glyph. A 1:1 chat keeps initials/photo |
| A5 | FAB → contacts picker | Group rows wear the glyph; people keep initials |
| A6 | Chats row menu → Delete | The modal's peer header shows the group glyph for a group |
| A7 | ★ INTENDED SHIFT — not a bug | App tiles and reply-quote tints also move to the 12 anchor hues (same hash source). Slight color changes there are correct |
| A8 | Group sender labels, both themes | Labels stay readable (AA re-verified at all 12 anchors) |

## B. N34 — owner chip (#365)

| # | Step | Expect |
|---|---|---|
| B1 | Open a group/bot room where the OWNER has posted | The owner's first-of-run bubbles carry an "Owner" chip at the top-right of the name row |
| B2 | Member sheet for the owner (tap the sender) | "Owner" badge next to the name |
| B3 | A room where the owner has a bare-address label | The chip is NOT monospace |
| B4 | A BLIND group/bot | NO chip anywhere. No owner badge in any sheet |
| B5 | Your own messages in a group you own | No chip (sent bubbles carry no name row — accepted) |

## C. N26 + D-5 — member relation (#366) · needs 2 accounts

| # | Step | Expect |
|---|---|---|
| C1 | Group/bot chat: tap a sender who IS your contact | Sheet shows "In your contacts" + Message-less identity + NO "Send contact request" (the AND-30 wrong offer is gone) |
| C2 | Tap a STRANGER → Send contact request | Button latches once. Reopen the sheet → "Request sent" badge. The chats list gains the "Request sent" row (marker preserved) |
| C3 | Chat header ⓘ → Group info → tap a member | Same relation badges. A stranger gets a working "Send contact request" HERE too (new). Your own row gets no request button |
| C4 | The pending peer accepts (2nd device) → reopen the chat | The sheet now shows "In your contacts" (relation rides each message push; a fresh open re-pushes history) |
| C5 | Blind group/bot | No relation badges. Sheets stay masked |
| C6 | 1:1 chats + payment/file bubbles | Unchanged (relation is a group text-row datum only) |

## D. N27 — remove blocked (#367)

| # | Step | Expect |
|---|---|---|
| D1 | Contact details → Remove a contact who is IN one of your groups → confirm | An in-app dialog NAMES the blocking group(s) and states the path out. OK dismisses. Scrim tap dismisses. A long list scrolls; OK stays reachable (test landscape too) |
| D2 | Remove a contact in NO group | Removes as before (native "removed" alert) |
| D3 | Settings → Deutsch → repeat D1 | The three new strings render in German |

## Commit (after PASS)

```
batch: R1 identity round — N1 avatar rework, N34 owner chip, N26/D-5 member relation, N27 remove-blocked (#364-#368)

Avatar system: 12 quantized anchors, computed-contrast gradients, white ink
in both themes, a distinct group glyph threaded through every group surface
(#364). Owner chip on group run heads + the member sheet, blind-gated (#365).
Per-member relation rides the bridge (addThem/addContact/addMember trailing
arg); the member sheet offers Add contact only to true strangers, on both
the chat and group-info surfaces via one shared guarded verb (#366). A
refused contact remove now names the blocking groups in-shell (#367).
Opus #46 loop, two rounds, CLEAN (#368). Smoke 1813/4; new pins
mutation-proven.
```

Then: `git mv docs/handoff-2026-08-17d.md docs/archive/` (the live handoff is
`docs/handoff-2026-08-17e.md`) — include the move in the same commit.
