# Third-party notices — what Spixi ships that is not ours

Written 2026-08-30 (#710). Every item below is shipped inside the app binary or its
WebView assets. The App's Contributors screen carries the short credit; this file carries
the notice each licence requires. ⚠ **Incomplete by design until the NuGet list is
resolved on a machine with egress** — the .NET packages are listed with the licence each
publisher declares, not verified against the package's own LICENSE file.

## Assets bundled in the WebView

| asset | where | licence | what the licence asks | done |
|---|---|---|---|---|
| **Tabler Icons** — © Paweł Kuna, tabler.io/icons | `src/assets/icons/*` → `icons.js` (87 glyphs, exported through Figma as filled outlines) | MIT | keep the copyright notice and the licence text with the software | credit row in the app (`ASSET_CREDITS`) + the notice below |
| **UI SFX** — uisfx.com | interface sounds | CC0 1.0 | nothing; credit is courtesy | credit row in the app |
| **Sora** (Google Fonts) | `src/assets/fonts/sora-latin-wght-normal.woff2` | SIL OFL 1.1 | keep the OFL notice; do not sell the font on its own | notice below |
| **Source Sans 3** (Adobe) | `src/assets/fonts/source-sans-3-latin-wght-normal.woff2` | SIL OFL 1.1 | as above | notice below |
| **Twemoji Country Flags** — Twemoji artwork, font subset by TalkJS (`country-flag-emoji-polyfill` 0.1.10) | `src/assets/fonts/TwemojiCountryFlags.woff2` → shipped as `Resources/Raw/html/fonts/TwemojiCountryFlags.js` (a data: URL in a script — a file:// font fetch is CORS-refused), injected at runtime on a device that cannot paint a flag (Windows) — L15b, Session Z | CC-BY 4.0 (artwork) · MIT (the polyfill's code, none of which ships) | give credit, link the licence, state changes (a subset) | credit row in the app (`ASSET_CREDITS`) + the notice below |
| **The chat doodle pattern** | `src/assets/images/chat-bg-doodles.svg`, `doodle-pattern-aug.svg` | ⚠ **UNKNOWN — Damir's export; origin not recorded in the repo** | depends on the source: original work needs nothing; a marketplace/stock asset may require attribution or forbid redistribution in an app | **OPEN — Damir to state the source** |
| **Spixi logo, empty-state illustrations** | `src/assets/images/*-es.svg`, `logo.svg` | IXI Labs' own | — | — |

## JavaScript shipped in `Resources/Raw/html/js`

| library | used by | licence |
|---|---|---|
| html5-qrcode (mebjas) | `scan.html` (the redesigned scan shell) | Apache-2.0 — notice required |
| qrcodejs (davidshimjs) `qrcode.min.js` | the seven LEGACY pages still shipped (`address`, `apps`, `wallet_recipient`, `settings_lock`, …) | MIT |
| jQuery, Bootstrap | the legacy pages only | MIT |
| clipboard.js | legacy pages | MIT |

## .NET packages (publisher-declared licence; verify on a machine with NuGet egress)

BouncyCastle.Cryptography (MIT-style BouncyCastle licence) · CommunityToolkit.Maui (MIT) ·
Concentus (BSD-3) · Microsoft.Maui.* (MIT) · Mono.Nat (MIT) · NAudio (MIT) ·
Newtonsoft.Json (MIT) · OneSignalSDK.DotNet (MIT) · Plugin.Fingerprint (MIT) ·
RocksDB / RocksDbSharp (Apache-2.0 / BSD) · Ixian-Core (see its LICENSE).

**Vendored source (not a package):** `Spixi/Platforms/MacCatalyst/RocksDbSharp/**` — the
managed RocksDbSharp wrapper from `curiosity-ai/rocksdb-sharp` @ `f1cf0ba0`, compiled for the
maccatalyst TFM only (#920). BSD-2-Clause; the upstream `LICENSE` is vendored beside it
(`RocksDbSharp/LICENSE`) and the notice is below. `AutoNativeImport.cs` inside it carries
its own MIT notice (warrenfalk). The native `librocksdb` it loads is the public package's
build, Apache-2.0 / GPL-2.0 dual — the same binary the Windows TFM already ships.

---

## Notices

### Tabler Icons — MIT

```
MIT License

Copyright (c) 2020-2025 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Sora and Source Sans 3 — SIL Open Font License 1.1

Sora © 2020 The Sora Project Authors (github.com/sora-xor/sora-font).
Source Sans 3 © 2010–2020 Adobe (github.com/adobe-fonts/source-sans).
Both are licensed under the SIL Open Font License, Version 1.1
(https://openfontlicense.org). The fonts are embedded in the app and are not sold on
their own; the OFL text ships with the app per the licence.

### Twemoji Country Flags — CC-BY 4.0

The flag glyphs in `TwemojiCountryFlags.woff2` are the Twemoji emoji artwork
(https://twemoji.twitter.com, Copyright 2019 Twitter, Inc and other contributors),
licensed under the Creative Commons Attribution 4.0 International License
(https://creativecommons.org/licenses/by/4.0/). Changes: the artwork is used as a font
— Mozilla's `twemoji-colr` build (the shipped file's internal family name is "Twemoji
Mozilla") — subset to the country and sub-national flags by TalkJS as
`country-flag-emoji-polyfill` 0.1.10 (MIT for the build; https://github.com/talkjs/country-flag-emoji-polyfill).
Spixi ships the subset unmodified, as a base64 data: URL inside `fonts/TwemojiCountryFlags.js`,
and loads it only on a platform whose system emoji font draws no flags; the in-app credit row
(Account → Contributors) carries the licence link and the word "subset".

### html5-qrcode — Apache License 2.0

Copyright (c) 2020 Minhaz. Licensed under the Apache License, Version 2.0; you may obtain
a copy at http://www.apache.org/licenses/LICENSE-2.0. Distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.

### RocksDbSharp (vendored managed wrapper, Mac Catalyst only) — BSD-2-Clause

Copyright (c) 2015, Warren Falk, Copyright (c) 2022, Curiosity GmbH. All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the conditions in `Spixi/Platforms/MacCatalyst/RocksDbSharp/LICENSE`
are met (retain the copyright notice, this list of conditions and the disclaimer). THIS
SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES ARE DISCLAIMED.
