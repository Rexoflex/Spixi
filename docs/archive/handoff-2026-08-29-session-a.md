# HANDOFF — session A (L1 · L2 · L8), 2026-08-29

> ⚠⚠ **THE FIRST BUILD OF THIS BATCH WAS BADLY BROKEN AND THE SUITE WAS GREEN FOR ALL OF
> IT.** Damir asked whether the #46 adversarial loop had run. It had not — the same
> omission #512 recorded on the previous batch, repeated in the next one, on a batch that
> touches the money path. He chose to run it before walking. It found **seven MAJORs**; the
> break-my-verdict pass over the fixes found **two more inside the repairs**. Nine total.
> DECISIONS **#646** and **#647** carry all of them. This document describes the FIXED build.
>
> The worst one is worth stating plainly: contact-details **Pay and Request did nothing at
> all** — guarded on `state.group`, an always-truthy metadata object, instead of
> `state.isGroup`. They had replaced native screens the same row deleted. Fifty pins were
> green because every one of them read the CALL SITE and none asked whether the code behind
> it runs.


Built in the container on a clone of `redesign/frontend` at `c2831c2a`, which was your
tree's exact commit and clean. Decisions: **#642 (L1) · #643 (L2) · #644 (L8) · #645
(what the gates caught)**. Walk sheet: `docs/f5-checklist-2026-08-29-session-a.md`.

## The baseline moved. Three numbers.

```
bundle 299 · shells 18 · smoke BASELINE OK 3474 / the 3 known (#136 · M5 · B3)
· locales CLEAN 774 · cs-syntax 140+1 · Ixian-Core 097341a
```

| Gate | Was | Now | Why |
|---|---|---|---|
| cs-syntax | 143 + 1 | 140 + 1 | three C# pages DELETED |
| locales | CLEAN 772 | CLEAN 774 | two copy keys for the read detail |
| smoke | 3402 | 3474 | 72 new pins — 22 of them from the loop |

Ixian-Core was not touched. I verified `097341a` on a fresh clone, **not on your working
copy** — your `Ixian-Core` sibling is outside the folder this session can reach. Add it
as a folder if you want me to check yours; I only need to read it.

## What landed

**L1 — the legacy Send and Receive screens are gone.** Contact details composes in the
page now, through the same three verbs SingleChatPage uses; the shell still proposes
only and C# still signs. `WalletSendPage`, `WalletReceivePage` **and `WalletSend2Page`**
are deleted with their XAML, their HTML, their case labels, their `.csproj` rows and
every call site. `WalletRecipientPage` STAYS.

**L2 — private-group delivery ticks.** Delivered at one confirmed member; never a green
double check in a group; the single check set at the hand-off; the read detail as counts
in the long-press menu. Bot rooms are outside the branch by construction. Ixian-Core
untouched.

**L8 — the chat-info slide-out.** An op that slid in slides out, on every platform,
keyed on the same per-op flag the entry reads. Hardware back slides too.

## Three things I got wrong first, and how

* **L1's inventory was wrong on one line** and you caught it. It said nothing emits
  `ixian:receiveixi`; `home.html` emitted it in two live branches. You pushed back on
  the premise — *"why wouldn't the address be ready"* — and you were right: the branch
  cannot be reached, because `setAddress` is pushed inside the `ixian:onload` handler,
  in the same turn as `selectTab`. So no toast and no loading state were built.
* **L2's premise was wrong too.** #641 said `setMessageSent` has zero callers. It has
  one, and that one is reached only on the offline push-server path — and in a group it
  is called with the MEMBER's `Friend`, which does not hold the group message. There was
  no truthful trigger to wait for, which is why the optimistic rule was a real choice
  rather than a shortcut.
* **The W-h gate found a defect I shipped.** The ported Request sheet needs
  `tip-sheet.css` and `chip.css`, and I linked neither. It would have opened unstyled.

## What I checked and what I did not

Every pin was proven by **mutation on the real files with the real suite** — two rounds,
26 mutations, all 26 caught. Two pins were brittle for the wrong reason and were
re-based. Seven older pins went red on changes that preserved every guarantee they were
written for; each was re-based to the property, never deleted.

**Not checked, because only you can:** anything needing real funds, a real peer, a
private group with an absent member, the bot room, or the iPhone. That is rows 1.3,
1.5, 2.1–2.4, 2.7 and 3.6.

## Before you build

The bridge cannot delete. Nine dead files were moved to `_to_delete/`:

```powershell
Remove-Item -Recurse -Force _to_delete
```

Then the obj/bin wipe, because three C# pages are gone and a stale `obj` keeps their
generated XAML:

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
```

## What the loop changed about how this batch is gated

The three pin shapes that failed here are worth carrying:

* **A pin that reads a call site proves the call site.** It says nothing about whether the
  callee runs. The batch now ships an **executing** pin that lifts the shipped guard and the
  shipped initial state out of the built file and runs them together.
* **A pin that asserts a push proves the push.** Two derivations were being computed for
  shell handlers that DISCARD their arguments — dead code carrying a guarantee. The pins are
  paired negatives now: if the shell ever starts reading them, they go red.
* **Mutation could not find any of this.** Mutation only proves a pin notices a change to
  the line it already reads. Three of the nine were invisible to it by construction.

## Owed

* Your walk of `docs/f5-checklist-2026-08-29-session-a.md`.
* **L12** — the bot-room half of kick/ban is still UNVERIFIED. #637 is not done.
* 🟡 **Your dial:** counts vs a member list in the long-press menu. Counts are built.
