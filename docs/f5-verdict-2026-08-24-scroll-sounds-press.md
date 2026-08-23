# F5 verdict — batch #517–#520 (wallet scroll · sounds · press)

**Walked by Damir, 2026-08-23. RESULT: 29 pass · 0 fail · 0 n/a · 0 open (of 29).**

Sheet: the "F5 Walk 517–520" artifact (mirrors
`docs/f5-checklist-2026-08-24-scroll-sounds-press.md`). All build gates G1–G6 green,
including the byte-level build-identity probe (win-x64 Spixi.dll carries the three
new batch strings).

| Area | Rows | Result |
|---|---|---|
| Build gates | G1–G6 | pass (bundle 275 · shells 18 · smoke 2766/3 KNOWN · cs-syntax 142+1 · locales clean · identity True) |
| Wallet scroll oscillator (#517) | 1.1–1.8 | pass — no flicker, no stuck hero, no blank band, valve and tab round-trip clean |
| Transaction sounds removed (#518) | 2.1–2.5 | pass — zero chimes incl. the restore chain walk (2.3, the acceptance test) |
| Press feedback (#519) | 3.1–3.7 | pass — no scroll trail, smooth fill under load, wash visible on card grounds, both themes |
| Riders | 4.1–4.3 | pass — reduced motion, selected-row tonal press, pinned wash return |

Dials: none called — 70 ms paint delay, 5% wash, 12 px collapse threshold all stand
as shipped.

⚠ Session-notes for the record: the first Windows build failed on file locks (the
OLD app was still running — the exact trap the identity gate exists for), and the
first identity probe printed a FALSE False (a naive whole-file UTF-16 decode misses
strings at odd byte offsets; the corrected probe scans both alignments). Both are
instrument lessons, not app defects.

Next: Damir commits the batch (46 M · 2 D · 5 new docs incl. this one) and deletes
`_to_delete/`. Then the 2026-08-25 handoff (menu batch · BE verb question ·
contacts back-stack).
