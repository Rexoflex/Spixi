# BE cutover brief — deferred C# asks

*The running list of C#/bridge changes intentionally deferred while we wire the redesigned frontend to the FROZEN bridge (zero C# change). Strategy (Damir, 2026-07-07): max out the zero-C# surface → get the whole app working + tested → then ONE focused BE pass against a working app. Nothing here blocks the frontend; each item is an enhancement to raise fidelity or unlock an inline action.*

*Add rows as we hit them; this becomes the BE work order. Sources cited file:line. Related: `docs/chat-batch2-spec.md`, DECISIONS #179.*

## Ground rules for the BE pass
- **Every arg-signature change lands JS + C# in the SAME commit** (the WebView handler and the `Utils.sendUiCommand(...)` call site must agree).
- **No signing/broadcast moves into the WebView.** SECURITY.md invariant: shells emit intent, C# signs. Inline-pay etc. stays a confirm-page open unless BE builds a signed path.
- Prefer **additive args** (append to the end of existing `sendUiCommand` signatures) over new commands, to keep the change surface small.

## Chat surface

| # | Type | Ask | Why | C# touch point | Effort |
|---|---|---|---|---|---|
| C1 | **Payments** | Add a stable `statusEnum` (`actionable\|pending\|processing\|failed\|completed\|declined\|canceled`) + `kind` (`request\|sent`) to `addPaymentRequest` / `updatePaymentRequestStatus`. | Today role/status live only in the **localized `title`** + a 2-value `statusIcon` (`fa-clock`/`fa-check-circle`). Mappable but lossy; a real enum lets the redesigned card show correct role + colored status badge. | `SingleChatPage.xaml.cs:1310/1314/1361/1365/1665` (add args, compute from `FriendMessage`/activity status) | ~1–2h |
| C2 | **Payments** | Send `fiat` + an `insufficient` (balance < amount+fee) flag to `addPaymentRequest`. | Card supports a fiat sub-line + a "not enough IXI" disabled-Pay note; both are C#-known, absent from the current args. | same call sites | ~1h |
| C3 | **Payments (inline Pay)** | *Decision, not code yet.* Keep inline **Pay** = open the existing confirm page via `ixian:viewPayment` (**zero C#**, recommended, keeps money-confirm step), OR add `ixian:payRequest:<id>` + a signed inline path. | Inline signing removes the confirmation screen for a money action → SECURITY.md §8 territory. | `onViewPayment`/`onConfirmPaymentRequest` already exist (xaml.cs:781/817) | decision only |
| C4 | **Calls** | Enrich `addCall(id, message, declined, time)` → add `missed` (bool), `duration` (secs or preformatted), `outgoing`/`direction`. | `addCall` is lossy: can't tell missed vs answered vs duration; the redesigned call card needs them. `VoIPManager` already knows the outcome. Call-back reuses existing `ixian:call`. | `SingleChatPage.xaml.cs` `addCall` call site + `VoIPManager` | ~½ day |
| C5 | **Reactions** | Include a per-user **own** flag (did *I* react) in the `addReactions` aggregate. | Bridge sends only `key:count` (xaml.cs:1607) → pills can't show "you reacted" (`own:false` hardcoded in the shell). | `updateReactions` (xaml.cs:1602) | ~1h |
| C6 | **Reactions (tips)** | Confirm/normalize the **tip** reaction token. Today it's `tip:<txid>` (xaml.cs:979), aggregated as `tip:<txid>:count` — a txid, not a display amount. | Shell omits tip pills in v1 (won't render money it can't format). Either send a preformatted amount, or document the txid→amount lookup. | `updateReactions` + reaction storage | ~1h + decision |
| C7 | **Apps (decline)** | *Optional.* Add `ixian:declineApp:<id>` if a Decline-invite affordance is wanted. | No legacy decline verb exists; v1 omits Decline (legacy did too). One `else if` branch + handler. | `SingleChatPage.xaml.cs` dispatch | trivial |

## Other shells
*(to be filled as wallet / apps / settings / launch are bridge-wired)*

| # | Shell | Ask | Why | Effort |
|---|---|---|---|---|
| — | — | — | — | — |

## Cross-cutting (later)
- **Canonical §5 shell filenames + `setRoute`** (ARCHITECTURE item 5): repoint C# page classes to the redesigned shell names once all shells are wired. Currently Stage-4a drop-in over legacy filenames.
- **Avatars in self-contained shells**: C# avatar paths don't resolve in the inlined shells (gradient fallback used). Needs data-URI or a resolvable path scheme (parked flag, handoff).
