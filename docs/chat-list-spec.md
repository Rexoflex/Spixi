# Chat List Item — Spec (token-exact, from Figma)

**Status:** For Damir review → then build `c-chatlist-item` (+ `c-timestamp`, `c-status-icon`, `c-indicator`)
**Sources:** `chat-item/Default` 11275:114694 · `status-icon` 11304:5725 · `timestamp-chatlist` 11275:114508 · `excerpt` 11275:114320 · `indicator` 11275:114555 · "Chats - LM" screen 11306:19731
**Bridge contract:** `addChat(addr, nick, timestamp, avatar, online, excerpt, type, unreadCount)` + `setContactStatus` deltas (ARCHITECTURE.md §4)

## 1. Anatomy & tokens (extracted, not eyeballed)

```
chat-item        padding: var(--spacing-12); width: 100%
└ row            flex, gap: var(--spacing-12), align: center
  ├ avatar       48px circle, border: var(--outline-width-1) var(--outline-neutral-02)
  │              (+ online dot: surface-presence-online — from screen, bottom-right)
  ├ content      column, flex: 1, min-width: 0
  │  ├ name      body/lg (18/28 regular) · var(--text-neutral-01) · ellipsis
  │  └ excerpt   body/md (16/24) · var(--text-neutral-02) · nowrap ellipsis
  └ right-col    column, gap: var(--spacing-4), align: end
     ├ row1      gap: var(--spacing-2): [status-icon 16px] + [timestamp]
     │           timestamp: body/sm · var(--text-neutral-02) · right-aligned
     └ row2      gap: 4px: indicators (18px circles)
```

## 2. Status icons (16px, from `status-icon` set)

| Status | Glyph | Color token |
|---|---|---|
| sending | clock | `--icon-neutral-03` |
| sent | 1 check | `--icon-neutral-03` |
| delivered | 2 checks | `--icon-neutral-03` |
| read | 2 checks | `--icon-accent` |
| failed | alert | `--icon-error` |

Maps from bridge: `addChat.type` ∈ `"" / typing / read / confirmed / pending / default` + per-message `sent/confirmed/read` booleans in chat view. Mapping table: pending→sending, confirmed→delivered, read→read; sent-only→sent; errorSending→failed.

## 3. Timestamp behavior (c-timestamp, `variant="chatlist"`)

Figma variants: today / yesterday / weekday / date. Rules (best practice, matching design):

| Message age | Display | Example |
|---|---|---|
| today | `HH:mm` (locale, 24h follows device) | 12:58 |
| yesterday | localized "Yesterday" (`SL` key) | Yesterday |
| 2–6 days | weekday name (localized) | Monday |
| same year, ≥7 days | `DD MMM` | 03 Jun |
| older | `DD MMM YYYY` | 03 Jun 2025 |

- Re-render triggers: minute tick only while a visible row shows a today-time; midnight rollover re-classifies all rows (single scheduled task, not per-row timers).
- All timestamps tabular (`.u-tabular`) so columns don't shimmy.
- Same component serves conversation date-separators and bubble times with different variants (bubble: always `HH:mm`).

## 4. Indicators (18px, radius-full)

| Variant | Surface | Content |
|---|---|---|
| count | `--surface-accent` | unread count, body/xs, `--text-neutral-inverse-01`; caps at 99+ |
| count-muted | neutral (muted chat) | count |
| muted | neutral | bell-off glyph |
| mention | `--surface-accent` | "@" — priority over count when both |

## 5. Excerpt (14 Figma types → rendering rules)

`plain-text` · `plain-text-group` ("Sender: text") · `mention` (highlighted @handle) · `file` (icon + name) · `gif` · `call` / `call-missed` (missed = `--text-error` + icon) · `payment` (icon + "Payment request 25 IXI") · `app invite` · `typing` / `typing-group` (**`--text-action-default`**, replaces excerpt while active) · `replied` · `group-event` ("Han Solo was added") · `draft` (**"Draft:" prefix in `--text-error`** + text)

Each maps 1:1 from the bridge excerpt string + type glyph (§4 `addChat` args). Icons inline 16px, `--icon-neutral-03` unless stated.

## 6. Row states (from "Chats - LM" screen)

| State | Treatment |
|---|---|
| default | screen surface |
| **unread** | name + excerpt step up to semibold; row surface appears tinted (`--surface-neutral-02`?) — **confirm ①** |
| pressed | `--surface-interactive-pressed` |
| selected (desktop split) | `--surface-interactive-selected` |
| contact request | distinct block: tinted surface, "Wants to connect", Decline (outline 32) + Accept (fill 32, check icon) |

## 7. Flags for Damir (③ = needs decision)

1. **① Unread row**: is the tinted background intentional (which token), or only bold text?
2. **② `size/avatar/48` missing** — list avatar is 48px; keys have 24/32/40/56/96. Add 48 (and scale/48 exists already).
3. **③ Indicator drift in Figma**: the mention "@" indicator uses body/xs at 14/20 semibold while count uses 12/16 regular — same 18px circle, two text styles. Unify?
4. **④ Name weight**: `body/lg regular` in component, but unread rows render bold — treat weight as state-driven (regular read / semibold unread)?

## 8. Build plan (after review)

`c-indicator` → `c-status-icon` → `c-timestamp` (with scheduler) → `c-excerpt` → `c-chatlist-item` composing them; then the Chats demo gets real rows from mock data, and the same primitives serve contact list and transaction list (payment rows reuse timestamp + indicator).
