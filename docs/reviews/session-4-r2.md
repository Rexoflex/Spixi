# Session 4 · #46 round 2 — fresh reader (Opus) over the r1 fixes `c671c20d..6d0159e9`

Result: 0 MAJOR · 2 MINOR · 5 NIT · 11 mutants, 1 smoke survivor (m6; m1 killed by csh only). Every other r1 fix verified (B-1 in Chromium, B-2 every load path through onLoad, latch generation, claim re-run single-winner, fence holds).

| ID | Sev | Finding | Fix owner |
|---|---|---|---|
| R2-1 | MINOR | A-M2 not fixed for the user: the shell paints a preview only in `complete`; my own sent photo stays `progress` until the peer's `fileFullyReceived` (typed-bubbles.js:1015, chat.html:2306, :5760) | CHAT |
| R2-2 | MINOR | B-3 regression: an older jump's visibility fallback steals a newer jump's highlight (no jump token, chat.html:1937 / :1967) | CHAT |
| R2-m6 | MINOR | the wallet chip-pick 2 s expiry is unpinned (home.html:2419) | NAV |
| R2-N1 | NIT | OFF→ON fast loses an in-flight preview (key added before decode) | CHAT |
| R2-N2 | NIT | sent tile label "Sending IMG_2.jpg, Sent" contradicts itself | CHAT |
| R2-N3 | NIT | `jpegSize` atob's the whole URI on every render — decode the head only | CHAT |
| R2-N4 | NIT | `lowmem` re-run: say why in the docblock | CS |
| R2-N5 | NIT | the cold re-run is posted: a newer tap in that turn can be superseded | CS |
| R2-m1 | NIT | `close` retry mutant survives smoke (csh kills it) — acceptable, csh is a gate | — |
