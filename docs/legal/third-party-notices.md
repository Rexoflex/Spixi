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

### html5-qrcode — Apache License 2.0

Copyright (c) 2020 Minhaz. Licensed under the Apache License, Version 2.0; you may obtain
a copy at http://www.apache.org/licenses/LICENSE-2.0. Distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
