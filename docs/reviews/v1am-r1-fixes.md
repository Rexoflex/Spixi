# V1A-M #46 r1 — fix plan (main session verdicts)

Design decision (main session, 🟡 DECISIONS row; A-MINOR-1 / B-MINOR-1): `ixihelp` RESPECTS the session rule (refused when a moment or a card already showed this session) but does NOT TAKE the session — so the first-payment `pay` sheet, mic/app/autodl/offline and home's hint / rating cards are never held back by "What is IXI?". C#: `S17MomentRules.takesSession(id[, installMoment])` returns false for ixihelp; `exemptFromSession` unchanged (ixihelp NOT exempt). JS mirror: moment-sheet.js answer() must not set state.session for ixihelp (find the line ≈:322 that mirrors takesSession).
A-MINOR-2 (upgraders see it once): ACCEPTED, documented in P31 + DECISIONS (one sheet, does not take the session now).
B-MINOR-3 (a late yes lost on a reload): ACCEPTED, documented (rare; seen is stored; at worst the user never sees it).

| Finding | Verdict | Owner | Fix |
|---|---|---|---|
| A-MINOR-1 / B-MINOR-1 | valid | CS + HOME | the design decision above; CSH + c-csharp + h-ixihelp pins updated (ixihelp: refused by session/card, never takes it) |
| A-MINOR-2 | valid, accepted | CS (P31) | document |
| A-MINOR-3 | valid | CS | P31 six corrections + P31 row in docs/be-review-pack/README.md + an addendum line in P28 (the id list, NIT-9) |
| A-MINOR-4 | valid | MAIN | security-handover-gate.md V1A-M section |
| A-NIT-1 | valid | CS | `case V1AMRules.IxiHelpId:` |
| A-NIT-2 | valid | CS (SHints.cs, S11HintRules.cs comments) + HOME (word-tip.js:8 comment) | fix comments |
| A-NIT-5 | recorded | — | the S17/S20/S20G pattern; not changed |
| B-MINOR-2 | valid | HOME | tryIxiHelpMoment skips while firstixi is wanted / pending / waiting; firstixi's `backup` close also drops a waiting ixihelp entry (it re-asks next document — seen is stored? NO: a granted-but-not-shown ixihelp is seen in C#; accept: if dropped it is lost — so instead keep it waiting but never show it while a BackupPage push is up: simplest = do not ask ixihelp in a document where firstixi was wanted). Pin it. |
| B-MINOR-4 | valid | HOME | send the ixihelp ask after paint (deferToPaint / the iOS-34 helper), never synchronously inside the tab click |
| B-MINOR-5 | valid | HOME | ✕ → focus moves to a sensible next target (request card's first action / the empty-state CTA / the list); re-insert keeps focus if the tip held it |
| B-MINOR-6 | valid | HOME | observers installed only after the cap AND a setHints with off=false and at least one word id not done; disconnect when off or both done; pumpWordTip cheap checks first |
| B-MINOR-7 | valid | HOME | pin each cap guard separately; fix the header |
| B-NIT-1..6 | NIT-1 accept (document), NIT-3: no tip on a search result / Requests chip? → hide the tip while a search query is non-empty; NIT-4: aria-label "Close tip" → keep `close` key (no new string) but add aria-describedby to the text; NIT-5: desktop inset align to the rows' 8 px inset under data-desktop; NIT-6 ignore |
| C-1 | valid | AVATAR | whitelist non-base code points in the edge grapheme (FE0F, 200D+pictographic, 20E3, 1F3FB–1F3FF, E0020–E007F, the RI pair) and cap the length; `.c-avatar__emoji { max-width:100%; overflow:hidden; white-space:nowrap }` |
| C-2 | valid | AVATAR (owns chat.html for this one line) | the chat header avatar takes the group / bot name, not the channel title |
| C-3 | valid | AVATAR | strip bidi / format controls (200B–200F, 202A–202E, 2060, 2066–2069, FEFF) at both ends before the edge test |
| C-4 | valid | AVATAR | pin the chat.html topbar (incl. bot channel) + hostile marks + bidi + trailing punctuation cases; Release check compares a group avatar's full outerHTML to the base build's shape |
| C-5 | valid | STRINGS | widen the lexicon (sr novac/novca/novcem/novcu, fr achat, es ganancia, …) + a BOM clause |
| C-6 | valid | STRINGS | es-co intro-restore-replace-text: "billetera" (the restore flow's word) |
| C-N1 | accept the contract (trailing punctuation hides the emoji) — but cheap: skip trailing \p{P} → AVATAR may do it, with pins | AVATAR |
| C-N3 | comment only | AVATAR | update the avatar.js N1 header comment |
| C-N7 | valid | AVATAR | `sanctioned:` note on the px literals |
| C-N8 | valid | STRINGS | write the BOM as ﻿ |
| smoke N3a | valid | STRINGS | ru-ru momentIxiHelpBody has an em-dash; the built ru dictionary must have zero em-dashes → rephrase ("IXI является токеном сети Ixian." or similar, no dash) |
| smoke #345 size | MAIN | set CHAT / INDEX ceilings after the fixes, MEASURED |
| smoke GATE 54 (a4) | MAIN | investigate (flaky vs home.html change) |
