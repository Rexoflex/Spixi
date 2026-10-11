# Two directions — pick one

Same moment (once after the update, any time from About › What's new), same six topics, same storage and security (PROPOSAL.md §1, §4–§6). Only the look, the layout and the motion differ.

| | A · Aurora spotlight | B · Live UI stories |
|---|---|---|
| Idea | a premium "magic" moment: illustrated scenes, brand aurora | show, don't tell: the real feature plays on the real app surfaces |
| Layout | centred card over the dimmed home; card 1 full bleed | full-height story sheet from the bottom (a tall dialog on desktop) |
| Art | six new illustrated scenes (glossy tiles, rings, sparkles) on dark backgrounds | no art: bubbles, composer, picker, settings rows built from the tokens, with a ghost finger |
| Type | the app's UI type, centred | Sora display headlines (the wordmark face), left-aligned, short punchy lines |
| Theme | panels fixed dark in both themes (like the welcome flow) | follows the app theme fully |
| Motion | swipe with parallax depth; the aurora collapses into the panel; each scene plays once, backgrounds breathe | timed progress segments; tap right / left, hold to pause; each story replays the real interaction, then moves on |
| Words do the work? | the copy explains, the art sets the mood | the stage explains, the copy is a headline |
| Ties to the welcome carousel | strong (same aurora + illustration family) | deliberately different (product UI, not brand art) |
| Per-release cost later | one new scene per feature (~0.5 day each) | one scripted stage per feature (~0.5 day each); always matches the real UI, but must be re-checked when that UI changes |
| Risk | can feel like marketing; dark panel in light mode | auto-advance can be too fast for long locales (the timer can pause; a11y: no auto-advance under reduced motion); demo text must be translated (≈ 12 short strings) |
| Code | ~420 lines + 6 scenes in `illustrations.js` | ~520 lines (stage builders + clock) + no art |
| Effort | ~1 session | ~1.3 sessions |

A mix is possible: B's live stages inside A's card (keeps A's frame and swipe, drops the illustrations), or A's hero card in front of B's stories.
