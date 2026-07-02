# c-badge + c-txlist-item — spec

*Source: Figma `badge` 9449:46740 + tx `list-chat` 11302:6220 (file `cQ8yMZF5R0LGM9O1q9502F`), pulled 2026-07-02. Bridge contract: `addPaymentActivity(txid, received, counterparty, time, amount, fiat, confirmed)` / per-friend variant (bridge-audit-A). Deviations → DECISIONS #54/#55 (🟡).*

## c-badge (Figma-complete)

`span.c-badge[data-type][data-weight]` → optional 16 icon · label-xs bold · optional trailing 16 icon. Padding 2×8, gap 4, `radius-8`.

| weight | surface | ink |
|---|---|---|
| tonal | `surface-{type}-inverse` | `text-{type}` (accent → `text-accent`) |
| solid | `surface-{type}` | `text-neutral-inverse-01` |

types: warning · error · info · success · accent. Static (no states).
API: `createBadge({ label, type='warning', weight='tonal', icon=null, trailingIcon=null })`.

## c-txlist-item

`button.c-txlist-item[data-type=sent|received|pending|failed]` — padding 16×12, gap 12; interactive (→ `ixian:txdetails`), hover/pressed via #23 tokens (Figma rows are static — states added per #43/#49 coverage rule).

Anatomy: direction circle 48 (1px border, centered 24 arrow) · content (name label-lg; row2) · right column (amount label-lg + fiat body-md, both `.u-tabular` #21).

| type | circle border / arrow ink | row2 | amount | fiat |
|---|---|---|---|---|
| sent | `outline-neutral-04` / `icon-neutral-01`, arrow-up-right | abs. timestamp body-md `text-neutral-02` | `text-neutral-01` | `text-neutral-02` ⚠️Figma had `-01` — normalized, see ① |
| received | `outline-success-inverse` / `text-success`, arrow-down-left | timestamp | `text-success`, `+` prefix | `text-neutral-02` |
| pending | as sent | warning tonal badge (`clock-hour-10` 16) + timestamp | `text-neutral-02` | `text-neutral-02` |
| failed | as sent / `text-error` arrow | error tonal badge (`alert-square-rounded` 16) + timestamp | `text-neutral-disabled` + line-through ⚠️Figma raw hex `#6a717c` = UNBOUND, see ② | same |

Timestamp: absolute `formatTxTimestamp(ts)` → "20 Mar, 9:15" (device-locale month + 24h-per-device time; no ticker — absolute dates don't go stale).

API: `createTxItem({ txid, direction='out'|'in', status='confirmed'|'pending'|'failed', name, timestamp, amount, fiat, onClick, strings })` — amount/fiat pre-formatted strings incl. sign (formatting is C#-side per bridge contract; component stays dumb).

## Flags for Damir

① sent fiat ink `text-neutral-01` vs `-02` everywhere else in the set — normalized to `-02` (assumed Figma error). ② failed amounts use raw `#6a717c` (unbound!) — bound to `text-neutral-disabled`; fix in Figma. ③ badge glyphs in tx rows: pending = `clock-hour-10`, failed = `alert-square-rounded` (best match in the exported set — confirm). ④ Figma badge label-xs uses weight 700; token `label/xs` = bold ✓.
