# #46 r1 fixes — session 6 (for the r2 fresh reader)
| Finding | Verdict | Claimed fix |
|---|---|---|
| A1 m1 readStatus zero not in the status cache | real | SingleChatPage.updateMessagesReadStatus: literal-0 setContactStatus + pushZeroedChatRow (cs.mjs #1175 C#) |
| A1 m2 full flush on every open | real | UIHelpers.pushChatRowLive (row push when HomePage live, flag only when not); refreshChatRow unchanged |
| A1 m3 member nick unsanitized → lock screen | real (ours) | FileRowRules.sanitizeMemberName (control + bidi strip, cap 32 + …) + csh member_name_sanitized_and_capped |
| A1 NIT-1 1:1 empty prefix | recorded | not fixed (rare: an empty nickname) |
| A1 NIT-2 stale legacy-additions drafts | real | 5 legacy-additions.txt line 17 updated |
| A1 NIT-3 getIncomingTransfer Contains | recorded | safe direction (offer shown) |
| A2 M1 per-node press guard vs row replace | real | message-menu.js: ONE document press record (capture), timers check isConnected + voids() on all 3 surfaces |
| A2 M2 double click opens + closes the viewer | real | no scrim light-dismiss; tap-to-close only ≥ 350 ms after open; click detail > 1 ignored |
| A2 m1 focus restore steals focus | real | restoreRowFocus: document.hasFocus() guard (+ pin) |
| A2 m2 .c-tile-col width breaks #570 pill floor | real | .c-tile-col width = card rail, max-width 100% |
| A2 m3 decode error → blank viewer | real | img error → thumbnail back + setFailed (+ pin) |
| A2 m4 Paused not announced | real | markPausedTile updates aria-label / data-aria-base / progressbar; restored on the first live write |
| A2 n1 probe listeners in release | real | probe gated on data-p1 |
| A2 n2 caption tap | real | ground click = closest bar / foot, never a button |
| A2 n3 hybrid touch hover | recorded | (hover: hover) css guard limits it |
| A2 n4 paused tile resume path | open question → Damir | C# resumes on its own 60 s re-request; no tap path |
| A2 motion 3 press snaps the open fade | real | el transition none only once the finger moves |
| A3 MAJOR-1 wait-end path unpinned | real | view pin 1b (setTimeout 20000→0) |
| A3 MAJOR-2 menu gesture disjunction | real | menu.mjs split: move only / cancel only / doc scroll / replace mid-press / detached timer / keydown reset |
| A3 MINOR-1 Paused after re-render | real | cs.mjs rerenderNoPaused |
| A3 MINOR-2 focus on full flush | real | hover.mjs flushFocused |
| A3 MINOR-3 usableMemberName threshold | real | csh 24 / 25 / 30-with-space cases |
| A3 NIT-5 optional groups in re-bases | real | `(?:, transfer)?` / `(?:, fTransfer)?` made required |
