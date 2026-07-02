# Token Structure Analysis — for review before tokens.css

**Status:** Awaiting Damir's review · **Source:** Figma `Spixi-App`, Components page (node 9275:74), variables sampled from Buttons, Text fields, Nav bars, and Chat-list sections
**Decision needed:** approve/adjust §3 proposed structure, answer §5 questions. Then: clean up Figma variables → generate `src/styles/tokens.css` → lock.

## 1. What exists today (current mode = light)

| Group | Structure | Notes |
|---|---|---|
| `colors/surface/neutral/01–04, disabled` | numbered elevation ramp | the "ambiguous surface 1/2/3" problem |
| `colors/surface/action/{default,hover,pressed,disabled}` + `action-tonal/*` | interactive states | solid + tonal button fills |
| `colors/surface/destructive/*` + `destructive-tonal/*` | interactive states | |
| `colors/surface/semantic/{accent, accent-hover, accent-inverse, error(-inverse), success-inverse, warning-inverse}` | status colors | `-inverse` = tonal background |
| `colors/text|icon/neutral/{01,02,03, disabled, on-action, on-disabled, inverse-01, inverse-02}` | content ramp | text & icon mirror each other |
| `colors/text|icon/action/*`, `colors/text|icon/semantic/*` | | |
| `colors/outline/neutral/01–04, disabled` + `action/*` + `semantic/*` | borders | |
| `spacing/{none,3xs,xxs,xs,sm,md,lg,xl,super-lg}` = 0/2/4/8/12/16/20/24/80 | | gap between 24 and 80 unsampled |
| `corner-radius/{xs,lg,xl,full}` **and** `corner-radius/{8,12,16}` | **mixed named + numeric scales** | `full` = 800 |
| `typography/{display,heading,label,body}/{xs–md}` composites + per-size primitives (`font-family`, `size`, `weight`, `line-height`, `tracking`) | | Sora headings/display, Source Sans 3 body/label |
| `outline-width/1` | | |

## 2. Issues found (fix in Figma before generating tokens.css)

1. **Two token generations coexist.** Legacy: `colors/text/01`, `colors/text/02`, `colors/outline/03`, `colors/surface/accent` (#007fa6 teal), `colors/icon/warning` (#ea580c). Current: `colors/text/neutral/01`, `colors/outline/neutral/03`, `colors/surface/semantic/accent` (#3050bd), `colors/icon/semantic/warning` (#8f5f00). Components still reference both.
2. **Same name, different values.** `colors/text/01` resolves to `#0a0a0f` in Buttons but `#0e0f0f` in chat components — two variables sharing a display name across collections. Same for `label/lg` and `body/lg`: Inria Sans 18/28 (Buttons, Text fields) vs Source Sans 3 semibold (chat components).
3. **Legacy font.** `Inria Sans` survives in `heading/sm`, `label/lg`, `body/lg` in some collections — predates the Sora + Source Sans 3 decision.
4. **Role overlap.** `semantic/accent` ≡ `action/default` (both #3050bd) — accent vs action is undefined; pick one meaning.
5. **Mixed radius scales** (named + numeric) and a stray `Boolean` variable.
6. **No component/region semantics** — bars, bubbles, cards all resolve to `surface/neutral/N`, which is the ambiguity Damir flagged.
7. Filters/modals section (`sub-expanded-filters`: age/languages/sentiment/article-filters) looks imported from a different product — archive candidate.

## 3. Proposed structure (two layers)

**Layer 1 — primitives** (mode-switched: light/dark values live here). Keep current taxonomy, cleaned: `colors/{surface|text|icon|outline}/{neutral|action|destructive|semantic}/…`, one radius scale (named: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · full`), spacing as-is (rename `super-lg` → `4xl`; fill 32/40/48/64 if needed), typography Sora + Source Sans 3 only.

**Layer 2 — semantic aliases** (new; reference Layer 1, never raw values). Components and shells consume **only** this layer:

| Token | Initial mapping |
|---|---|
| `colors/surface/screen` | → `neutral/01` |
| `colors/surface/topbar` + `text/topbar`, `icon/topbar` | → `neutral/01`, `text/neutral/01`, `icon/neutral/01` |
| `colors/surface/bottombar` + `icon/bottombar-active`, `icon/bottombar-inactive` | → `neutral/01`, `action/default`, `icon/neutral/03` |
| `colors/surface/card` / `card-raised` | → `neutral/02` / `neutral/03` |
| `colors/surface/bubble-sent` + `text/bubble-sent`, `text/bubble-sent-meta` | → `action/default`, `text/neutral/on-action`, `inverse-02` |
| `colors/surface/bubble-received` + `text/bubble-received`, `text/bubble-received-meta` | → `neutral/03`, `text/neutral/01`, `text/neutral/02` |
| `colors/surface/input` + `outline/input`, `outline/input-focus` | → `neutral/02`, `outline/neutral/03`, `outline/semantic/accent` |
| `colors/surface/composer` (chat input bar) | → `neutral/01` |

Retheming a region (Damir's goal) = remapping one alias; dark mode never touches Layer 2.

**CSS output:** Layer 1 → `:root` / `[data-theme=dark]` custom properties; Layer 2 → theme-independent aliases (`--surface-topbar: var(--surface-neutral-01)`). Naming: slashes → hyphens, `colors/` dropped: `colors/surface/bubble-sent` → `--surface-bubble-sent`.

## 4. Migration map (legacy → current)

`colors/text/01|02` → `colors/text/neutral/01|02` · `colors/outline/03` → `outline/neutral/03` · `colors/surface/accent` → delete (or define accent role) · `colors/icon/warning` → `icon/semantic/warning` · Inria Sans `heading/sm`, `label/lg`, `body/lg` → Sora/Source Sans 3 equivalents · numeric radii → named scale · delete `Boolean`.

## 5. Open questions for Damir

1. Bubble-sent color: accent blue (proposed) or a neutral? Group/blind-group bubbles same as 1:1?
2. Do topbar/bottombar differ from screen surface in either mode today, or is the token purely future-proofing? (Affects whether they get own primitives or just aliases.)
3. `accent` vs `action`: keep both roles (accent = brand highlights, action = interactive) or merge?
4. Radius `full = 800` → convention `9999`, OK?
5. Dark-mode values: I could only read the active mode via sampling. To dump both modes completely I'll enumerate the collections via the Figma plugin API (`use_figma`) — OK to run read-only?
6. Should the cleanup (delete legacy variables, rebind components) happen in Figma now, or do we freeze Figma and do cleanup only in `tokens.css` first?

## Next after review

1. Answers folded in → final token list.
2. Full two-mode extraction from Figma.
3. `src/styles/tokens.css` generated + committed; DESIGN_SYSTEM.md tokens section written.
4. Figma variable cleanup (if approved) so design and code reference identical names.
