# Session 4 fix batch — #46 brief (#1147, #1148)

Range `09472504..HEAD` (commits 43fb1fd5 #1147, 3aae3bcd #1148). Smoke BASELINE OK 5161 / the 2 KNOWN · CSH 71/71.

| Item | What | Files |
|---|---|---|
| #1147 (1) | A2 band = selected-row colour + radius-12, ring 1 px `--outline-action-default` | chat.html |
| #1147 (2) | my sent photo shows its preview while sending (`thumbAfterTransfer` after the path is set) | SingleChatPage.xaml.cs |
| #1147 (3) | "Click to download" on `data-desktop` (new key, 13 locales) | typed-bubbles.js, strings |
| #1147 (4) | spare warm after close 350 → 0 ms (still posted) | HomePage.xaml.cs |
| #1147 (5) | photo fade on open: quiet ground → preview fades in; glyph after 600 ms | typed-bubbles.js, media-bubble.js/.css, chat.html |
| #1147 (6) | dev-only close probe `[P1] close … posted/removed` | SpixiContentPage.cs |
| #1148 (1) | chip weight 600 → 500 | tokens.css |
| #1148 (2) | photo tile edge per side | media-bubble.css |
| #1148 (3) | UnreadRule (own / updates / call cards / connected line / reactions never count; missed incoming call + contact request count) | UnreadRule.cs, Node.cs, VoIPManager.cs, StreamProcessor.cs |
| #1148 (4) | reaction heart on the list row (persisted flag, 13th `addChat` arg 🟡) | SReactionFlags.cs, HomePage, home.html, chatlist-item.js, strings, gate doc |

Must hold: CLAUDE.md ground rules · no Core change · no path / name / address in a push or log · [P1] dev-only · an older shell ignores the new arg.
