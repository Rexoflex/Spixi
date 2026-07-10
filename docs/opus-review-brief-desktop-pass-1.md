# Opus adversarial review brief — DESKTOP PASS batch 1 (#236)

> Separate Opus session, per the §5c workflow: fable BUILT, this session REVIEWS.
> Read files with the **Read tool only** (the sandbox mount serves stale/truncated
> copies — bottomnav.css and the shell tails were provably stale during the build
> session). Verdict per finding: MAJOR/MINOR/NIT, file:line. Mechanical fixes may
> land directly; architectural findings become 🟡 DECISIONS rows. Context:
> DECISIONS #232 (directives) · #235 (the FE MINORs' origin) · #236 (this batch) ·
> `docs/desktop-split-spec.md` §6e (the spec rows) · `docs/fable-build-brief-desktop-pass.md`.

## Scope — what changed (all FE, zero C#)

| File | Change |
|---|---|
| `src/components/message-bubble.js` | #235: `displayUrl` host-first rebuild + end-truncate; `LINKIFY_MAX` 4096 guard in `linkifyInto` |
| `src/components/bottomnav.js` | additive `variant: 'rail'` option → `c-bottomnav--rail` class |
| `src/styles/components/bottomnav.css` | new `--rail` variant section (appended; base untouched) |
| `src/shells/home.html` | rail wiring (`data-desktop` gate replaces `.is-desktop`; preview `?desktop=1/?mobile=1` script) · pin: `spixi.pins` set + `capabilities.pin:true` + `addChat` re-seed + `onPersist` mirror |
| `src/shells/chat.html` | `.is-desktop` → `data-desktop` re-gate of the #207 canvas rules (now LIVE on WinUI) · pre-paint chat-prefs boot script (pattern ×0.36 in dark, clamped) |
| `src/shells/settings.html` | `onShare` (navigator.share → clipboard fallback) · Chat-appearance takeover (persist-only handlers) · `readChatPrefs` clamp · 3 new stylesheet links (settings-screens/message-bubble/chat-pattern) |
| `src/styles/components/message-bubble.css` | `.c-bubble` font-size/line-height × `--chat-text-scale` (flagged component change) |
| `src/components/settings-screens.js` | comment-only (TEXT_SIZES adoption note) |
| `docs/desktop-split-spec.md` §6e · DECISIONS #236 | spec + log |

## Attack the verdict — priority order

1. **#235 fixes (security-adjacent).** Try to make `displayUrl` lie: userinfo with
   ports, IPv6 hosts, punycode/IDN, `%40` encoded @, a path `@domain` landing at
   position <64 of a rebuilt label, double-@ userinfo, `new URL` throwing paths.
   Confirm the label can never LEAD with a non-host token when a host parses.
   Check `LINKIFY_MAX`: is 4096 defensible vs real message caps? Does the skip
   path (`appendWithMentions`) stay linear on the same crafted token (mention
   regex on 50KB with many @s)? Does the guard change behavior for a legit long
   message WITH a link (links stop linkifying — acceptable? flag if not).
2. **The `.is-desktop` → `data-desktop` re-gate.** This ACTIVATES formerly-dead
   rules on WinUI: rail layout in home.html + pattern-off/dark-ground in chat.html.
   Hunt regressions: anything else keyed off body column layout (wallet takeover
   `position:fixed` now covers the rail — flagged as accepted, verify nothing
   worse), FAB stacking, `#chats-nav` wrapper stretch, topbar/hero widths, the
   1:1 phone demos (must NOT pick up data-desktop — they run in desktop browsers!
   → check `src/demo/*.html`: the #228 UA sniff sets data-desktop in a desktop
   BROWSER too; demos previously relied on `.is-desktop` being off. Did the
   re-gate leak desktop styling into phone-framed demos? chat.html/home.html are
   SHELLS not demos, but they're also opened raw in browsers for preview — that's
   now desktop-styled BY DESIGN; confirm that's coherent with the demo pass).
3. **Rail variant CSS.** Specificity vs base (hover/active/crossfade/pill),
   badge ring color on the rail surface, RTL (`border-inline-end`), reduced
   motion, avatar item, `[data-dual]` guard, keyboard focus visibility.
4. **Chat-appearance prefs.** The ×0.36 dark derivation (drift vs tokens if #76
   values ever re-dial — is the ratio hardcoded in TWO places? yes: chat.html boot
   + the spec; flag maintenance), clamp ranges, pre-paint ordering (theme script
   MUST run first — verify head order in chat.html), text-scale calc under the
   #227 desktop type dial, emoji-big bubbles unscaled, preview-vs-dark discrepancy
   (known flag — confirm severity), settings takeover back/hardware-back path,
   `currentView` coverage.
5. **Pin.** Re-flush seeding (clearChats drops rows → addChat re-seed), unpin vs
   upsert-merge (undefined key keeps stale true?), handshaking rows, tombstone
   interplay (delete sheds pin), swipe accelerator toggling pin twice fast,
   localStorage quota/corruption paths, requests-vs-pinned ordering
   (orderedTimeline), pin on a chat that later becomes a request again.
6. **Share.** navigator.share availability on WinUI WebView2 (fallback path must
   be the one that actually runs), clipboard on non-secure origins, double-tap.

## r2 addendum (#237 — Damir F5 round, same day; review WITH the above)

Additional changes: rail 72px + `c-bottomnav__logo` (component option, rail-only,
aria-hidden) · home topbar desktop title "Chats"/`logo:false` + a second topbar
action (message-plus → `openContacts('start')`) · `:root[data-desktop] .fab
{display:none}` · home body `border-inline-end` outline-neutral-03 ·
settings.html desktop: rail nav (variant+logo, active account) + `onBack:
undefined` on desktop + `setSettingsSaveVisible` (new settings-shell.js export;
`data-save` tag on the topbar check) + shell `syncSave()` at rebuild/showHub/
onNickname/onAvatarRemove/S14-apply · tokens.css body-md dial 3 applied then
REVERTED (verify byte-identical to pre-batch values 15px/21px).

r2 attack surface: ① Save-visibility truth table — every dirty flip covered?
(nickname edit → reveal; revert-to-savedName → hide; avatar pick (loadAvatar tmp
push → rebuild) → reveal; remove → hide; C# re-push after save → hide). Any path
where Save hides while STILL dirty (data loss on rail-exit? no — exitSettings
saves dirty on the way out — verify). ② Desktop settings with no back + hidden
Save: keyboard/SR exit path = rail buttons (verify reachable/labelled). ③ The
topbar action count changed on desktop — check `.c-topbar__actions` layout with
2 buttons + settings hub `showSaved`/`setSettingsSaveVisible` still target the
RIGHT button (`[data-save]` — but `showSaved` queries the FIRST actions button;
settings hub has only one action, fine — verify no other hub action added). ④
Rail logo inside a <nav> landmark (decorative span, aria-hidden — acceptable?).
⑤ Hairline: body border under data-desktop — check no double-border against the
rail's own border-inline-end and no layout shift at 384px min-width.

## r3 addendum (#238 — Damir F5 round 3; review WITH the above)

Changes: hairline → `body::after` fixed strip z-31 pointer-events-none (was a body
border, painted over by inset-0 z-30 takeovers) · rail border neutral-01→03 ·
rail `[aria-current]` action-ink rule restored (source-order tie made selected
icons grey) · settings `dirtyLock` (lock toggle → Save shows + exit routes
ixian:save; C# persists lock ONLY in onSaveSettings:249 — verified) · `spixi.landtab`
handshake (settings writes `<id>:<ts>` pre-exit; home consumes via storage event +
visibilitychange/focus, 15s staleness discard, re-emits `ixian:tab:`) · desktop tab
scrollers hide the scrollbar track (full-bleed selected rows).

r3 attack surface: ① landtab — storage-event double-fire (removeItem echoes back
into settings — benign?), consume racing the C# pop (ixian:tab sent while hidden —
does HomePage.onNavigating handle it mid-push-stack?), the 15s guard vs a slow
save-pop, `lastIndexOf(':')` parse on a hostile/corrupted value, focus-fallback
firing on ordinary window focus with a live key. ② dirtyLock — lock-off auth
CANCELED: dirtyLock stays true → Save visible for a toggle that didn't happen
(row state self-heals from setLockEnabled push? verify the switch UI reverts);
save-then-pop still loses nothing? ③ z-31 strip — above takeover content: any
takeover with its own right-edge control at x=last-pixel? (pointer-events none —
visual only). ④ scrollbar hide — keyboard focus scroll + PageUp/Down still work;
any user complaint channel for lost thumb is a dial, not a defect. ⑤ rail ink —
verify avatar item (no icon) and badge contrast unaffected by the border recolor.

## Known/accepted flags (don't re-litigate, verify containment)

- Dark preview shows light-scale pattern intensity (component sets raw v) — logged.
- Wallet takeover covers the rail on desktop (mobile-parity fixed-inset) — polish later.
- No visual pinned marker (sort-only) — Damir art-direction dial.
- Main shell scripts could not be node-checked in-session (mount truncation) —
  verify they parse via Read-tool review; Damir's build-shells is the hard gate.
- #234 lock fix, C15, reply-to, wallet-send: NOT in this batch (gated) — confirm
  the batch didn't touch those surfaces.
