# P23 · THEME · Theme, language, hints and About / help links

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW | no | yes | shipped | 5 min |

**Look here first:** `Spixi/Utils/Utils.cs:784` — `openExternal`, the one external-open gate (http/https without user-info, or mailto); every verb in this packet hands it a C# constant or a C#-built mailto, never a WebView string.

**DECISIONS:** #242 · #334 · #379 · #385 · #421 · #498 · #767 · #800 · #1246 · #1262 · #1263 · #1267 · #1285 · #1311

## What changed and why
The OS theme flip is reachable now and PUSHES `setTheme` to every generated shell instead of reloading pages (#385, #421). A language pick re-localizes the settings shell in place (`setLocale`) and echoes the code C# really loaded (`setLanguage`) (#334, #498); five more FE dictionaries ship, the C# language list is unchanged (#379).
About / How-to rows send a fixed id, not a URL — `ixian:openLink:` is gone from SettingsPage (#1285). The update card, the hint cards and the translation report open only C#-owned links (#1263, #1267, #1246). Hint counters live in a local-only file, written only for whitelisted ids (#1262). `ixian:apply:` saves the nickname without closing Account (#242).

## Files (verified at 387ca78b)
- `Spixi/Utils/Utils.cs:784` — the gate; `:846` `openTranslationReport` builds the mailto from a known code (#1246).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:1136` — `aboutLinkUrl`: 4 fixed ids → `Config.cs:31-34` constants (#1285).
- `Spixi/Utils/S11HintRules.cs:41` / `:60` / `:67` — hint verb whitelist · `helpUrlFor` (only `network`) · hints-off 0/1 (#1262, #1267).
- `Spixi/Pages/Home/HomePage.xaml.cs:924` — `ixian:updateHelp` opens `Config.updateHelpUrl` (#1263).
- `Spixi/Lang/SpixiLocalization.cs:125` — the language file path is built only from the fixed list (legacy shape, unchanged).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:1082` — appearance value `int.TryParse`, then the shared push sweep `UIHelpers.cs:482` (#421).
- `Spixi/Lang/SpixiLocalization.cs:386` — deletes only the `ll_*.html` it just truncated (C#-named path) (#767).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `aboutLink` | `<website\|network\|source\|help>` | settings.html (SettingsPage; Downloads names are peer text) | `SettingsPage.xaml.cs:485` | ours #1285 |
| `reportTranslation` | `<lang code>` | settings.html · launch.html | `SettingsPage.xaml.cs:473` · `LaunchPage.xaml.cs:231` | ours #1246 |
| `updateHelp` · `hintHelp` | none · `<tip id>` | home.html (untrusted names / previews) | `HomePage.xaml.cs:924` · `:932` | ours #1263 · #1267 |
| `hint` | `<shown\|done>:<tip id>` | home.html | `HomePage.xaml.cs:944` | ours #1262 |
| `hintsoff` | `<0\|1>` | settings.html | `SettingsPage.xaml.cs:970` | ours #1262 |
| `rating:yes` | none | settings.html (About) | `SettingsPage.xaml.cs:457` → `Config.cs:54-55` store URLs | legacy name, NEW host #1267 |
| `apply` | `<nick text>` | settings.html | `SettingsPage.xaml.cs:779` | ours #242 |
| `language` · `appearance` | `<lang code>` · `<int>` | settings.html | `SettingsPage.xaml.cs:818` · `:1077` | legacy, reshaped (no reload; pushes) #334 #421 |
| push `setTheme` | `<light\|dark>` | C# → every generated shell incl. chat, not mini-apps | `UIHelpers.cs:505` · `HomePage.xaml.cs:5449` `:5870` | ours #421 |
| push `setLanguage` · `setLocale` | `<loaded code>` · `<requested code>` | C# → settings.html | `SettingsPage.xaml.cs:869` · `:883` (`:930` loaded code) | ours #498 · #334 |
| push `setHints` · `setHintsOff` | `<json numbers + ids + bool>` · `<True\|False>` | C# → home.html · settings.html | `HomePage.xaml.cs:2831` · `SettingsPage.xaml.cs:979` | ours #1262 |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| home script (a peer name XSS) opens its own URL via `hintHelp` / `updateHelp` | id → C# constant only (`S11HintRules.cs:60`, `HomePage.xaml.cs:924`); HomePage has no `openLink` sink | csh `S11HintTests.s12_helpUrlFor_maps_only_network_to_the_config_constant`; `pins-s11/a-cs.mjs` `updateHelpOnlyTheGate` · `noOpenLinkOnHome` |
| settings script opens any page via About | fixed id map `SettingsPage.xaml.cs:1136`; `openLink` deleted | `pins-s14/b-settings.mjs` `csMap` · `csAbout` · `csNoOpenLink` · `noOpenLinkShell` |
| a crafted code builds a mailto with its own address / body | code checked against the C# list (`S9FixRules.cs:205`) | csh `S9FixTests.translation_report_link_is_built_from_a_known_code_only` |
| a hint verb writes free text to disk | action pair + id whitelist before any write (`S11HintRules.cs:41`) | csh `S11HintTests.the_verb_is_one_action_and_one_whitelisted_id` |
| a language or theme name used as a path or injected into HTML | path from the fixed list (`SpixiLocalization.cs:125`); `setTheme` is one of two words (`ThemeManager.cs:155`); every push argument is base64-encoded | no pin (legacy path code, unchanged) |

## Given up / left open
- `loadLanguage` still logs the raw WebView code on failure (`SpixiLocalization.cs:150`, present at 0e85a4b8); the SettingsPage line is cleaned (`:833`), the inner one is not — legacy, his column.
- A variant code that prefix-matches (e.g. `it-xx…`) is stored as the language preference (legacy) and echoed by `setLocale` (ours; used only as a dictionary key, `src/shells/settings.html:1942`).
- `ixian:appearance:` accepts any integer (unknown → light); presentation only.
- Chat background / pattern / text size are shell-only `spixi.chat.*` keys, no C# verb; they sit in the shared `file://` storage (MAJOR #4, one `localStorage` origin for shells and mini-apps — see `legacy-not-ours.md`).

## Question for BE
Should `SpixiLocalization.loadLanguage` refuse any code that is not exactly in its list (no prefix match, no raw-string persist) — yes/no?
