# Handoff → next session: i18n batch + starter locales are DONE — pick up Phase 2 tail / Phase 3

> **HOW TO USE THIS HANDOFF**
> 1. **Damir, on the PC first (sandbox can't build/commit — #142):** run the i18n
>    generator + build chain and eyeball, then **commit via GitHub Desktop.** See
>    "Damir PC steps" below. Do this BEFORE the fresh chat.
> 2. **Fresh chat:** run the boot ritual, confirm the i18n work is committed
>    (`git log`), then start the **next task** (Phase 2 tail — see bottom).
>    The i18n batch + locales are DONE + audited; treat them as history/context.

Boot ritual for the fresh chat: `CLAUDE.md` → `DECISIONS.md` (latest rows, esp.
**#166 → #170**) → this file. The i18n extraction batch (§B of the previous
handoff) is COMPLETE, its fallback conflicts are resolved, and 7 starter locale
dictionaries exist and pass an automated audit.

This session's commit also includes, beyond the i18n batch: **#169** Terms/Privacy
marked English-only (not translated, by decision); **#170** the icon discs
redesigned to vivid per-glyph GRADIENT fills + white glyph (both modes) — see
DECISIONS; and a **demo language switcher** in `desktop.html` (top-right dropdown /
`?lang=<code>` / `?pseudo`). All are captured in the DECISIONS rows the boot ritual reads.

## Sandbox reality on THIS machine (re-confirmed HARD this session — read it)

`#142` stands, and it BIT an audit agent this session. The **bash/sandbox mount
serves STALE and sometimes TRUNCATED copies** of working-tree files (a component
read as an old/short version; `desktop.html` served truncated at ~line 522). The
**file tools (Read/Edit/Write) see FRESH content** and **write through correctly**.
Rules that worked:
- Do all script RUNS against a clean snapshot: `git archive HEAD <paths> | tar -x -C /tmp/clean` — never stale. Author/run there.
- Trust the **file tools** for editing the working tree; trust **`git show HEAD:<path>`** for committed truth.
- **`cp` from /tmp into the working tree WRITES correctly** (verified via the file tools) — that's how generated artifacts were delivered.
- **Do NOT run the generators (`extract-strings`, `build-locales`, …) from the sandbox against the working tree** — they read stale/truncated components and emit CORRUPT output. (An audit agent did exactly this and "found" a bogus 605-vs-607 key drift. Ground truth = 607, verified against the clean snapshot + git HEAD.)
- Bundle build + full smoke = **DAMIR on the PC** (PowerShell, `Spixi` subfolder, no `&&`).

## What was done this session (i18n batch §B + follow-ups)

**Extraction + dictionary (#166).** `scripts/extract-strings.mjs` sweeps all 66
components for `strings.KEY || 'fallback'` (single/double-quote, multi-line
`+`-concatenated) plus 61 dynamic `strings['prefix'+token]` keys → canonical
**`src/strings/en-us.js` / `.json` (607 keys)** + translator context sheet
**`docs/i18n-strings.md`** (per-component tables, kind, length, `{…}` placeholders,
legacy-SL-id map — 116 keys reuse a shipped translation). Provider
**`src/strings/index.js`** (`enUS`, `pseudoStrings()` marker Proxy, `resolveStrings`)
+ demo global **`src/demo/strings.iife.js`** (`build-strings-iife.mjs`). Demo
**`desktop.html`** boots from the dictionary; `?pseudo` swaps a marker locale.

**Structural hook (#166).** The desktop Theme/Language `label.textContent === 'Theme'`
intercept (broke under any non-English UI) → `row.dataset.settingKey === 'theme'/'language'`;
`settings-shell.js settingRow` sets the inert `data-setting-key`. Verified by the
pseudo-locale render smoke.

**Conflicts resolved (#167).** The sweep found 25 keys used with divergent English.
Damir picked: copy toast → "Copied", Scan → "Scan", delete-history → short body,
errors → fuller. Plus correctness SPLITS (both wordings kept): per-chat
`deleteHistory*` vs delete-everything **`deleteAllHistory*`**; launch create-account
`repeatPassword`/`newTooShort`/`repeatMismatch` vs change-password
**`encpassRepeat`/`encpassTooShort`/`encpassMismatch`**; payment `pending` vs contact
`requestSent`; settings `backupTitle` vs launch **`backupHeadline`**. Net 600→607 keys,
0 conflicts.

**Starter locales (#168).** `scripts/build-locales.mjs` reuses the shipped legacy
`Resources/Raw/lang/<code>.txt` translation for placeholder-free matched keys
(110/locale) and fills the rest from Claude-drafted translations (7 parallel
subagents, glossary-guided). Files: **`src/strings/{de-de,es-co,fr-fr,sr-sp,sl-si,ru-ru,pt-br}.{json,js}`**
(each 607 keys). New gate **`scripts/verify-locales.mjs`** (parity · placeholder-set
equality · protected-token · empty) = **ALL 7 CLEAN**. Serbian = Latin script.

**Gates (all green, run against the clean snapshot):** `extract-strings --check` 0
(no conflicts) · `i18n-lint.mjs` clean (no hardcoded strings in DOM sinks) ·
`verify-locales.mjs` clean · `pseudo-locale-smoke.mjs` 9/9 (markers render, no
English leak, `data-setting-key` present).

**Audit outcome (#168).** #46 adversarial reviewer ran; its two MAJORs were mount
artifacts (disproven vs snapshot + git HEAD). Real fixes: extractor now skips
`strings.X` inside comments (no-fallback refs dropped 5→3). Documented gap below.

## Damir PC steps (run in order, PowerShell, `Spixi` subfolder, no `&&`)

```
node scripts/extract-strings.mjs        # regen en-us.js/.json + docs/i18n-strings.md (exit 1 ONLY if conflicts — currently 0)
node scripts/build-strings-iife.mjs     # regen src/demo/strings.iife.js
node scripts/build-locales.mjs          # regen the 7 src/strings/<code>.json/.js
node scripts/verify-locales.mjs         # audit gate — expect ALL LOCALES CLEAN
node scripts/build-demo-bundle.mjs      # settings-shell.js changed (data-setting-key)
node scripts/smoke-test.mjs             # existing suite
node scripts/i18n-lint.mjs              # optional: no hardcoded-string leaks
node scripts/pseudo-locale-smoke.mjs    # optional: render markers, no leak
```
Eyeball: open `src/demo/desktop.html` and use the **language dropdown (top-right)** — or
`?lang=de-de` (es-co/fr-fr/sr-sp/sl-si/ru-ru/pt-br) / `?pseudo` — to see each locale live
(`strings.iife.js` embeds en-us + all 7 locales + the marker locale). Under `?pseudo` the
whole UI should be `⟦markers⟧` (any real English = a hardcoded string). Confirm Theme/Language
still route the pane in every locale. Then commit via GitHub Desktop. **Note:** `src/strings/draft/` holds the per-language draft
JSON + glossaries + `.todo.json` — keep or gitignore as you prefer (regenerable).

## Known gaps / scoped follow-ups (none block the batch)

- **Legal bodies = ENGLISH ONLY by decision (#169) — not a gap.** `termsBody` /
  `privacyBody` are intentionally not localized (per-jurisdiction legal review is out
  of scope); they fall back to the `TERMS_DEFAULT` / `PRIVACY_DEFAULT` constants in
  `launch-shell.js` (marked with a code comment) and render English in every locale.
  Their TITLES are translated. `walletTitle` falls back to a passed-in dynamic title,
  so it has no fixed English to translate either.
- **Translations are a machine STARTER — need native review.** Each subagent flagged
  its uncertain keys (e.g. `tip`→"napojnica/gorjeta", `blindGroup`, `handshake`,
  tier "receipts"). One known divergence: pt-br localized size labels S/M/L/XL→P/M/G/GG,
  ru-ru kept S/M/L/XL (harmless).
- **Sentence-fragment anti-pattern.** `finePrintAck` ("and acknowledge the") concatenates
  with a following link — brittle for gendered/inflected languages. Consider recomposing
  as a whole sentence with the link inline when the legal strings are revisited.
- **Only `desktop.html` is wired to the provider.** The other demos (chat/chats/settings/
  wallet/apps/launch) each need the same 2-line change: add `<script src="strings.iife.js">`
  and source `strings` from `window.SpixiStrings` (see `desktop.html` ~line 462 + ~538).
- **Demo COMPOSITION strings don't translate (by design — verify in production, not the demo).**
  All COMPONENT strings translate. But the demo composes some things with hardcoded literals:
  the **rail nav labels** (Chats/Apps/Wallet/Account — no dict keys), **pane/screen titles**
  (Wallet hero title, "Send IXI", the `<h2>Chats</h2>` list header), and a few component calls
  that **don't pass `strings`** (e.g. `showIncomingCall`, `showBackupNudge`) so they fall back
  to English. In production the shell (native.js) supplies nav labels + titles from the SL
  channel and threads `strings` into every component — Phase 3 covers this. Damir's call: don't
  fix the demo, test i18n of composition strings in the real app.
- **Fold `verify-locales` + a pseudo-locale block into `smoke-test.mjs`** so the main
  suite gates i18n too (currently separate scripts). `extract --check` only gates
  CONFLICTS, not parity — `verify-locales` is the parity gate.

## Next task (fresh chat) — Phase 2 tail, then Phase 3

Per CLAUDE.md status + `handoff-desktop-split-build.md §NEXT` (roadmap unchanged):
Phase 2 tail — **a11y sweep** (clears backlog [A1] chat-info `aria-expanded`) · **copy
sweep** · **dark-mode deviations log** (clears the `.c-txsheet` `--surface-menu` item) ·
**B2 icon exports** (bulb/torch, shield-lock, remaining gaps) · **contacts-on-desktop
batch**. Then **Phase 3 integration** — this is where i18n goes live: wire the SL token
channel / a `getStrings` bridge into `native.js`, real `ixian:language:<code>` switch,
the ARCHITECTURE §9 sync table, C# repoint table, device tests → Phase 4 freeze audit.

## Key files (i18n)
`scripts/{extract-strings,build-strings-iife,build-locales,verify-locales,i18n-lint,pseudo-locale-smoke}.mjs`
· `src/strings/{index.js,en-us.js,en-us.json,<7 locales>.{json,js}}` (+ `draft/`)
· `src/demo/strings.iife.js` · `src/components/settings-shell.js` (data-setting-key)
· `src/demo/desktop.html` (provider + hook) · `docs/i18n-strings.md` (translator sheet).
