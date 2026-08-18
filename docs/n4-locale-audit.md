# N4 locale expansion — audit + launch-set proposal (2026-08-17, cloud session)

**LANGUAGE RULE: ASD-STE100.** Data verified against code at twin baseline
`646ef4e9` (#215). Pipeline reproduced byte-identical before this audit
(git status clean after full rebuild; smoke BASELINE OK 1903/4).

## ① What exists — FE dictionaries vs legacy sets

Three layers hold strings. Each language needs all three to be complete:

| Layer | Source | Count | Who reads it |
|---|---|---|---|
| FE dictionary | `src/strings/<code>.json` (+`.js`) | 713 keys | The 22 redesigned shells via `window.SL` |
| Legacy C# set | `Spixi/Resources/Raw/lang/<code>.txt` | 589–607 ids | C# alerts/pages via `SpixiLocalization` + `*SL{}` |
| Culture gate | `Utils.cs` switch (~:129) + `setDocLang` (strings IIFE) | code list | Amount separators · `<html lang>` · every Intl date/time call |

**Built FE dictionaries (8):** en-us, de-de, es-co, fr-fr, pt-br, ru-ru, sl-si, sr-sp.
**Legacy sets (13):** the 8 above + it-it, id-id, lt-lt, cn-cn, ja-jp.
**The #360 residual (5):** it/id/lt/cn/ja users get a translated C# layer and an
English shell. `App.xaml.cs:100-107` auto-detects and PERSISTS it-it/ja-jp/id-id/lt-lt
on first run, so those OS users land there without a picker tap. (cn-cn: .NET
reports zh-cn, C# cannot map it, those users land on en-us — see the dial in ③.)

### Per-language coverage against the 713 FE keys

Seed = a legacy value reachable through the `build-locales.mjs` value-match
(placeholder-free, not byte-equal to English). Numbers computed with the same
algorithm the builder runs (`/tmp/n4-audit.mjs`, this session).

| Lang | Legacy ids | Seedable | Needs draft | em/en dashes in legacy | Dashes in seeded subset | Legacy ids still English |
|---|---|---|---|---|---|---|
| de-de | 593 | 116 | 597 | 0 | 0 | 29 |
| es-co | 593 | 125 | 588 | 0 | 0 | 17 |
| fr-fr | 593 | 119 | 594 | 0 | 0 | 20 |
| pt-br | 593 | 122 | 591 | 0 | 0 | 16 |
| ru-ru | 593 | 127 | 586 | 3 | 0 | 6 |
| sl-si | 607 | 126 | 587 | 0 | 0 | 9 |
| sr-sp | 607 | 126 | 587 | 0 | 0 | 9 |
| **it-it** | 575 | 119 | 594 | 0 | 0 | 25 |
| **id-id** | 589 | 126 | 587 | 0 | 0 | 10 |
| **lt-lt** | 589 | 127 | 586 | 5 | 1 | 7 |
| **cn-cn** | 589 | 127 | 586 | 1 | 1 | 5 |
| **ja-jp** | 589 | 126 | 587 | 0 | 0 | 6 |

Notes:
- 129 of the 713 keys map to a legacy id by value (placeholder-free). The
  per-language seed count is lower where a legacy value is missing or English.
- The two dash hits in the seeded subset are BOTH `index-backup-prompt-desc`
  (lt-lt en dash, cn-cn double em dash). This id is one of the two feeder ids
  the N3a gate already sweeps for pt/ru/sr/sl. The same narrow sweep applies
  (precedent, not the open #371 broad-legacy dial).
- The built 7 carry 17–25 `english-fallback` keys each (`draft/*.todo.json`,
  for native translators). Not in N4 scope.

## ② Launch language set — proposal (DIAL, Damir decides)

A NEW language (no legacy set) costs the full stack: ~713 FE keys drafted
+ ~593 legacy ids drafted + picker/gate wiring + native review. An EXISTING
language costs only the FE dictionary (~586–594 drafted) + wiring.

**Proposal: launch with 18.** The 13 existing (all three layers complete after
this session) + 5 new, picked for messenger + crypto adoption and reach:

| Tier | Languages | Cost per language | Coverage from legacy |
|---|---|---|---|
| Ship now (13) | en, de, es-co, fr, pt-br, ru, sl, sr + it, id, lt, cn, ja | 0 (after this session) | 116–127 of 713 seeded |
| Add for launch (5) | tr · pl · ko · vi · uk | 713 FE + ~593 legacy drafted + review | 0 — no legacy set |
| Deferred, flagged | ar · he · fa (RTL) | Full stack + an RTL layout pass over all 22 shells | 0 |
| Alternates | nl · th · hi · ko↔nl swap etc. | Same as "add" tier | 0 |

Rationale for the 5: tr/vi/uk = top crypto-adoption markets (Chainalysis top-10
class), pl = large EU market adjacent to existing lt, ko = major messenger +
crypto market. RTL languages are excluded from launch: they need a
direction-audit of every shell (a separate (L) item), not just strings.

**Rule until the dial is answered:** dictionaries beyond the five named in ③
are NOT built. This doc + the DECISIONS row log the dial.

## ③ Build scope executed this session (the five named)

it-it · id-id · lt-lt · cn-cn · ja-jp, each: legacy-reuse first, machine-draft
into `src/strings/draft/<code>.json` (native review flagged in the todo/glossary
files), wired into `build-locales.mjs` / `verify-locales.mjs` /
`build-strings-iife.mjs` / the smoke N3a gates, un-hidden in BOTH pickers
(`settings.html` LANGS + `launch-shell.js` LAUNCH_LANGS, rows leave
PENDING_LANGS), and added to the `Utils.cs` culture-gate switch in the SAME
change. Zero em/en dashes in all new drafts.

cn-cn riders (logged as decisions):
- `setDocLang` maps cn-cn → zh-cn for `<html lang>` only (cn-cn is not a valid
  BCP-47 Chinese tag; dates/screen readers need zh). Dictionary lookup keys stay
  cn-cn end-to-end.
- OPTIONAL C# rider (NOT built, dial): map .NET zh-* → cn-cn in
  `SpixiLocalization.loadLanguage` so Chinese OS auto-detect lands on Chinese.
  Today those users pick 中文 manually — that path works once un-hidden.

## ④ Button-overflow audit

Method + results live in `docs/n4-overflow-audit.md` (written by this session
after the dictionaries build).
