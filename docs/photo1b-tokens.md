# photo1b (#1644) — the chat-background tokens

Damir's picks, applied as value changes in `src/styles/tokens.css` (no switch; the proof is the render and the pins). Owner: agent `tokens`, base `55feaddc`.
Files: `src/styles/tokens.css` (+ built `Spixi/Resources/Raw/html/spixi.tokens.css`, by `build-shells`), the re-based pins below, `scripts/pins-photo1b/g-tokens.mjs` (new), `scripts/pins-photo1b/render-grounds.mjs` (new, by hand).

## 1. The picks (names: Mist = `flat`, Iris = `gradient`, Spixi = `blue`, Meadow = `green`)

| Canvas | Light | Dark |
|---|---|---|
| Mist | Today (unchanged) | Calmer 2 values + ground back to `#0C0E10`; bubble lifted; quote re-derived |
| Iris | Calmer 1 | Calmer 1 |
| Spixi | Calmer 1 | Calmer 2 |
| Meadow · Aurora · Dusk · Ocean | Calmer 2 | Calmer 2 |

The pattern alpha follows each step: in each changed canvas's own rule (phone) and in its own desktop line (0.8 x phone, selector weight (0,4,0) so it wins over the canvas rule). The shared dark defaults (ink `#C6CFFD`, sent `#1A4A96`, card `#19253B`, alpha 0.101 / desktop 0.0808) are NOT changed: other surfaces share them (the S17 tile resets were narrowed or removed in fix round 1, see § 8b). Dark Mist's picks are written in the two dark Mist rules only.

## 2. Every changed line (old to new; `--outline-card-sent-selected` follows `--outline-card-sent` with the same rgb, alpha 0.45 light / 0.55 dark, and is not listed)

| Canvas / theme | Line | Old | New |
|---|---|---|---|
| Iris light | `--gradient-chat` | lg(180deg, #CCD0EC 0%, #D0C9EB 50%, #D5C3EB 100%) | lg(180deg, #CDD0E8 0%, #D0CAE7 50%, #D4C4E6 100%) |
| Iris light | `--chat-pattern-ink` | #3A2F66 | #3A3160 |
| Iris light | `--chat-pattern-alpha-1` | 0.1024 | 0.09216 |
| Iris light | `--surface-bubble-sent` | #6145D6 | #604DC5 |
| Iris light | `--surface-card-sent` | #EFECFB | #EFEDF9 |
| Iris light | `--outline-card-sent` | rgba(97, 69, 214, 0.18) | rgba(96, 77, 197, 0.18) |
| Iris light | `--surface-select-row-gap` | #B6B6E4 | #B6B6E0 |
| Iris light (desktop) | `--chat-pattern-alpha-1` | 0.08192 | 0.073728 |
| Spixi light | `--gradient-chat` | lg(180deg, #C9DDF2 0%, #C5D6F1 50%, #C2CFEE 100%) | lg(180deg, #CCDDEE 0%, #C7D6ED 50%, #C4CFE9 100%) |
| Spixi light | `--chat-pattern-ink` | #1E3A66 | #233B60 |
| Spixi light | `--chat-pattern-alpha-1` | 0.1024 | 0.09216 |
| Spixi light | `--surface-bubble-sent` | #3050BD | #3653AE |
| Spixi light | `--surface-card-sent` | #EAEEF8 | #EBEEF7 |
| Spixi light | `--outline-card-sent` | rgba(48, 80, 189, 0.18) | rgba(54, 83, 174, 0.18) |
| Spixi light | `--surface-select-row-gap` | #ADC1E9 | #AFC1E5 |
| Spixi light (desktop) | `--chat-pattern-alpha-1` | 0.08192 | 0.073728 |
| Meadow light | `--gradient-chat` | lg(160deg, #D6EBC6 0%, #D2EDA8 45%, #CFE9BD 100%) | lg(160deg, #DAE9CF 0%, #D6EABA 45%, #D4E6C8 100%) |
| Meadow light | `--chat-pattern-ink` | #2F5A1E | #3A572F |
| Meadow light | `--chat-pattern-alpha-1` | 0.1024 | 0.08192 |
| Meadow light | `--surface-bubble-sent` | #0E7A55 | #3A755B |
| Meadow light | `--surface-card-sent` | #E7F2EE | #EBF1EF |
| Meadow light | `--outline-card-sent` | rgba(14, 122, 85, 0.18) | rgba(58, 117, 91, 0.18) |
| Meadow light | `--surface-select-row-gap` | #B8D4AB | #BBD1BA |
| Meadow light (desktop) | `--chat-pattern-alpha-1` | 0.08192 | 0.065536 |
| Aurora light | `--gradient-chat` | lg(150deg, #7EE0C4 0%, #5FB4EE 48%, #8F80F2 100%) | lg(150deg, #99DAC6 0%, #7AB2DA 48%, #8F88D7 100%) |
| Aurora light | `--chat-pattern-alpha-1` | 0.192 | 0.1536 |
| Aurora light | `--surface-bubble-sent` | #07666B | #316366 |
| Aurora light | `--surface-card-sent` | #E6F0F0 | #EAEFF0 |
| Aurora light | `--outline-card-sent` | rgba(7, 102, 107, 0.18) | rgba(49, 99, 102, 0.18) |
| Aurora light | `--surface-select-row-gap` | #57A4E6 | #6EA2D5 |
| Aurora light (desktop) | `--chat-pattern-alpha-1` | 0.1536 | 0.12288 |
| Dusk light | `--gradient-chat` | lg(160deg, #FFD9C4 0%, #E9C9FF 100%) | lg(160deg, #F7DCCD 0%, #E4CEF3 100%) |
| Dusk light | `--chat-pattern-ink` | #7A3F5E | #70475C |
| Dusk light | `--chat-pattern-alpha-1` | 0.1024 | 0.08192 |
| Dusk light | `--surface-bubble-sent` | #D02B7D | #B74C7A |
| Dusk light | `--surface-card-sent` | #FAEAF2 | #F8EDF2 |
| Dusk light | `--outline-card-sent` | rgba(208, 43, 125, 0.18) | rgba(183, 76, 122, 0.18) |
| Dusk light | `--surface-select-row-gap` | #D5BCDC | #CFC0DA |
| Dusk light (desktop) | `--chat-pattern-alpha-1` | 0.08192 | 0.065536 |
| Ocean light | `--gradient-chat` | lg(160deg, #BDEFFF 0%, #C9D6FF 100%) | lg(160deg, #CAECF7 0%, #CDD7F3 100%) |
| Ocean light | `--chat-pattern-ink` | #0E5770 | #2C5566 |
| Ocean light | `--chat-pattern-alpha-1` | 0.1024 | 0.08192 |
| Ocean light | `--surface-bubble-sent` | #0D7AA7 | #3E7897 |
| Ocean light | `--surface-card-sent` | #E7F2F6 | #ECF2F5 |
| Ocean light | `--outline-card-sent` | rgba(13, 122, 167, 0.18) | rgba(62, 120, 151, 0.18) |
| Ocean light | `--surface-select-row-gap` | #ABCBF4 | #B3CAEC |
| Ocean light (desktop) | `--chat-pattern-alpha-1` | 0.08192 | 0.065536 |
| Mist dark | `--gradient-chat` | #040607 | #0C0E10 |
| Mist dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Mist dark | `--surface-bubble-sent` | #1A4A96 | #2D4D81 |
| Mist dark | `--surface-card-sent` | #19253B | #1E2636 |
| Mist dark | `--surface-bubble-received` | #1A1D1F | #272B2D |
| Mist dark | `--surface-bubble-received-quote` | #000000 | #151819 |
| Mist dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |
| Mist dark | `--chat-pattern-ink` | #C6CFFD (shared dark default) | #C9D0F0 (own line in the Mist rules) |
| Mist dark | `--gradient-bubble-sent` | #1A4A96 (shared) | #2D4D81 |
| Iris dark | `--gradient-chat` | lg(160deg, #0E0433 0%, #050422 100%) | lg(160deg, #0E072E 0%, #05051E 100%) |
| Iris dark | `--chat-pattern-ink` | #C6CFFD | #C8D0F7 |
| Iris dark | `--chat-pattern-alpha-1` | 0.101 | 0.0909 |
| Iris dark | `--surface-bubble-sent` | #4B31B7 | #4A3AA8 |
| Iris dark | `--surface-card-sent` | #261F44 | #252140 |
| Iris dark | `--outline-card-sent` | rgba(156, 142, 215, 0.22) | rgba(155, 147, 207, 0.22) |
| Iris dark | `--surface-select-row-gap` | #212659 | #212756 |
| Iris dark | `--surface-bubble-received` | #1D194F | #1D1C49 |
| Iris dark | `--surface-bubble-received-quote` | #06041B | #07061B |
| Iris dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.07272 |
| Spixi dark | `--gradient-chat` | lg(160deg, #021135 0%, #020721 100%) | lg(160deg, #07132B 0%, #04091A 100%) |
| Spixi dark | `--chat-pattern-ink` | #C2DDFB | #C9DCF1 |
| Spixi dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Spixi dark | `--surface-bubble-sent` | #2D48A3 | #374D8A |
| Spixi dark | `--surface-card-sent` | #1E253E | #212638 |
| Spixi dark | `--outline-card-sent` | rgba(140, 154, 204, 0.22) | rgba(145, 157, 191, 0.22) |
| Spixi dark | `--surface-select-row-gap` | #1C2C5A | #1E2D53 |
| Spixi dark | `--surface-bubble-received` | #0C1F4B | #13213F |
| Spixi dark | `--surface-bubble-received-quote` | #02071C | #040817 |
| Spixi dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |
| Meadow dark | `--gradient-chat` | lg(160deg, #001A12 0%, #020D0A 100%) | lg(160deg, #071913 0%, #040C0A 100%) |
| Meadow dark | `--chat-pattern-ink` | #BFE8CB | #C8E4D0 |
| Meadow dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Meadow dark | `--surface-bubble-sent` | #11603F | #2E5C45 |
| Meadow dark | `--surface-card-sent` | #172B26 | #1E2A27 |
| Meadow dark | `--outline-card-sent` | rgba(124, 168, 149, 0.22) | rgba(140, 165, 153, 0.22) |
| Meadow dark | `--surface-select-row-gap` | #1B3243 | #1E3143 |
| Meadow dark | `--surface-bubble-received` | #0B2920 | #142721 |
| Meadow dark | `--surface-bubble-received-quote` | #02100B | #050E0A |
| Meadow dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |
| Aurora dark | `--gradient-chat` | lg(150deg, #001B18 0%, #000F3E 52%, #120041 100%) | lg(150deg, #081A17 0%, #051332 52%, #110A33 100%) |
| Aurora dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Aurora dark | `--surface-bubble-sent` | #08626A | #2F5F64 |
| Aurora dark | `--surface-card-sent` | #152B30 | #1F2B2F |
| Aurora dark | `--outline-card-sent` | rgba(119, 169, 173, 0.22) | rgba(141, 167, 170, 0.22) |
| Aurora dark | `--surface-select-row-gap` | #1A2E68 | #1E315F |
| Aurora dark | `--surface-bubble-received` | #0D2353 | #152546 |
| Aurora dark | `--surface-bubble-received-quote` | #040E2A | #071023 |
| Aurora dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |
| Dusk dark | `--gradient-chat` | lg(160deg, #200821 0%, #0B051B 100%) | lg(160deg, #1D0C1D 0%, #0A0716 100%) |
| Dusk dark | `--chat-pattern-ink` | #FFC9E4 | #F5CFE1 |
| Dusk dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Dusk dark | `--surface-bubble-sent` | #A62264 | #943E63 |
| Dusk dark | `--surface-card-sent` | #3C1B2F | #38222F |
| Dusk dark | `--outline-card-sent` | rgba(206, 133, 170, 0.22) | rgba(196, 149, 169, 0.22) |
| Dusk dark | `--surface-select-row-gap` | #2B2850 | #292A4C |
| Dusk dark | `--surface-bubble-received` | #2E193A | #2B1D34 |
| Dusk dark | `--surface-bubble-received-quote` | #0F0515 | #0E0813 |
| Dusk dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |
| Ocean dark | `--gradient-chat` | lg(160deg, #001C27 0%, #010B22 100%) | lg(160deg, #091B23 0%, #040C1C 100%) |
| Ocean dark | `--chat-pattern-ink` | #A6ECFF | #B9E8F5 |
| Ocean dark | `--chat-pattern-alpha-1` | 0.101 | 0.0808 |
| Ocean dark | `--surface-bubble-sent` | #13729A | #3B708C |
| Ocean dark | `--surface-card-sent` | #182F3C | #222F39 |
| Ocean dark | `--outline-card-sent` | rgba(125, 177, 199, 0.22) | rgba(147, 176, 192, 0.22) |
| Ocean dark | `--surface-select-row-gap` | #1A3255 | #1F3251 |
| Ocean dark | `--surface-bubble-received` | #032A43 | #122A3B |
| Ocean dark | `--surface-bubble-received-quote` | #011524 | #071520 |
| Ocean dark (desktop) | `--chat-pattern-alpha-1` | 0.0808 | 0.06464 |

Unchanged on purpose: light Mist (every line), light Aurora ink (`#FFFFFF`), the light Aurora ring `--outline-select-ring` `#2B47A9`, the sent PICK colours (`[data-chat-sent=...]`), the names / count / order of the appearances, the default appearance (no stored key = Mist + contours).

## 3. The two computed values (never invented; computed with OKLab, WCAG contrast)

Dark Mist ground `#0C0E10` (= `--chat-canvas-base`). The old received bubble `#1A1D1F` read 1.198 : 1 on the old ground `#040607` and would read only 1.141 : 1 on `#0C0E10` (so the 1.35 of the pick is a lift, not today's value).

| Value | Rule | Result | Ratio |
|---|---|---|---|
| Received bubble | OKLab L raised, a and b kept (same hue); the smallest 8-bit value with WCAG bubble : ground >= 1.35 | `#272B2D` | **1.353 : 1** on `#0C0E10` (`#262A2C` reads 1.335, below) |
| Its quote | S19 rule: OKLab (L, a, b) scaled by one k, bisected to 1.25 : 1 darker than the bubble | `#151819` | **1.249 : 1** to the bubble |

Mist text on the bubble 12.02 : 1; Mist meta 7.67 : 1 (4.58 : 1 as painted at 0.7). The notice card (`#1A1C1F`) on the new ground reads 1.13 : 1 (1.19 on the old ground; see section 7).

## 4. Floors per changed cell (computed from the tokens as the built chat resolves them; `g-tokens` key `floors`)

F1 text on the received bubble >= 4.5 (dark >= 7); F2 white on Auto sent >= 4.6; F5 sent meta ink >= 4.5; F6 sent ticks at 0.7 >= 3 or not lower than the old value of the cell; F7 the select ring on its gap >= 3; F3 dark bubble >= 1.15 off every ground stop; F4 / F4b dark meta full / as painted >= 4.5; F4c quote 1.2 to 1.3.

| Cell | Auto sent | F1 | F2 | F5 | F6 (old) | F7 | F3 (per stop) | F4 / F4b | F4c |
|---|---|---|---|---|---|---|---|---|---|
| Iris light | `#604DC5` | 18.44 | 5.97 | 5.28 | 3.44 (3.44) | 3.58 | | | |
| Spixi light | `#3653AE` | 18.44 | 6.69 | 5.91 | 3.77 (3.75) | 3.85 | | | |
| Meadow light | `#3A755B` | 18.44 | 5.19 | 5.19 | 3.44 (3.34) | 4.30 | | | |
| Aurora light | `#316366` | 18.44 | 6.47 | 5.72 | 3.72 (3.64) | 3.02 | | | |
| Dusk light | `#B74C7A` | 18.44 | 4.64 | 4.64 | 3.09 (2.95) | 4.06 | | | |
| Ocean light | `#3E7897` | 18.44 | 4.63 | 4.63 | 3.14 (3.08) | 4.18 | | | |
| Iris dark | `#4A3AA8` | 13.44 | 8.16 | 7.21 | 4.42 (4.42) | 5.40 | 1.208 / 1.256 | 8.58 / 4.89 | 1.251 |
| Spixi dark | `#374D8A` | 13.41 | 7.76 | 6.85 | 4.28 (4.29) | 5.17 | 1.158 / 1.243 | 8.56 / 4.92 | 1.252 |
| Meadow dark | `#2E5C45` | 13.16 | 7.35 | 6.50 | 4.12 (4.02) | 5.10 | 1.159 / 1.263 | 8.40 / 4.87 | 1.250 |
| Aurora dark | `#2F5F64` | 12.75 | 6.83 | 6.04 | 3.88 (3.80) | 4.84 | 1.183 / 1.209 / 1.242 | 8.14 / 4.73 | 1.251 |
| Dusk dark | `#943E63` | 13.30 | 6.42 | 5.68 | 3.64 (3.56) | 5.25 | 1.183 / 1.259 | 8.49 / 4.91 | 1.250 |
| Ocean dark | `#3B708C` | 12.44 | 5.18 | 4.57 | 3.11 (3.04) | 4.92 | 1.191 / 1.322 | 7.94 / 4.67 | 1.249 |
| Mist dark | `#2D4D81` | 12.02 | 8.07 | 7.13 | 4.41 (4.39) | 5.24 | 1.353 | 7.67 / 4.58 | 1.249 |

All floors hold; none moved. Dark Meadow / Spixi dark F3 of 1.158 / 1.159 sit on the first stop, above 1.15. Light Iris F6 (3.437 vs 3.439) is below the old value by 0.002 but above 3, so the "or >= 3" clause holds. Mist light is today's, not measured again.

## 5. The ring of light Aurora

| | Gap | Ring `#2B47A9` on the gap |
|---|---|---|
| Before (S20) | `#57A4E6` | 3.049 : 1 |
| After (Calmer 2) | `#6EA2D5` | **3.024 : 1 (>= 3)** |

The ring is NOT re-set: `#2B47A9` stays (same hue, darker than primary-600). A one-step-lighter ring `#2B47B9` would read 2.881 and fail (that is the `ring` break of `g-tokens`). Dark Aurora ring on its new gap `#1E315F`: 4.84.

## 6. Pattern check on dark Mist (the alpha is checked again on the lighter ground)

| | Phone alpha 0.0808 | Desktop alpha 0.06464 |
|---|---|---|
| Ink `#C9D0F0` on `#0C0E10`, delta L* | 7.23 | 5.69 |
| Visibility vs A (ink over ground, mean contrast - 1; the S19 rule) | 0.977 (inside 0.97 to 1.15) | |

The floors of the old pins (delta L* dark >= 7 phone, >= 5 desktop) hold. The six coloured dark canvases read 0.77 to 0.86 x A at the calm alpha: lower on purpose (the pick), so the pin floor for them is 0.75 (Mist keeps 0.97 to 1.15).

## 7. Floors that moved or were re-based (report, not hidden)

| Where | Was | Now | Why |
|---|---|---|---|
| notice card on dark Mist (`pins-s20/r-notice-card`) | >= 1.15 on `#040607` | >= 1.12; measured 1.13 | the ground is `#0C0E10` again; the card `#1A1C1F` is unchanged |
| brand-gradient delta L*, Iris light, phone (smoke row ~38900) | >= 5 | >= 4.5; measured 4.9956 | Iris's own alpha 0.09216 |
| same, desktop (`pins-s18/e-pattern-desktop`) | >= 4 | >= 3.5; measured 3.94 | Iris's own desktop alpha 0.073728 |
| dark pattern visibility vs A, six coloured canvases (`r-dark-grounds`, `r-dark-bubbles`) | 0.97 to 1.15 | 0.75 to 1.15 | the alpha 0.101 to 0.0808 / 0.0909 |
| Mist ground vs A's stop (`pins-s19/r-dark-bubbles.mjs:140`, S19 option B "every stop darker than A's") | Mist ground strictly darker than A's | Mist ground not lighter than A's (equal: `#0C0E10` is A's own ground again); the six coloured canvases stay strictly darker | the ruling puts Mist's ground back at A's value |
| bubble vs sent, dark Mist ("ask" of `pins-s20g/c-n1`) | > the S20 value (1.768) | >= 1.6; measured 1.694 | the new sent `#2D4D81` is lighter; the brief's lifted bubble sits closer |

## 8. Re-based pins (file, clause, old to new). Each carries a `* photo1b (#1644): old -> new` note.

| File | Clause | Old | New |
|---|---|---|---|
| `scripts/pins-s17/c-appearance.mjs` | resets (tile = chat, fix round 1) | tile Iris light alpha 0.1024; dark Mist / Iris tile ink `#C6CFFD` | 0.09216; `#C9D0F0` / `#C8D0F7` |
| `scripts/pins-s17/c-appearance.mjs` | AUTO sent colours (7 x dark) | flat `#1a4a96`, Iris `#6145d6`/`#4b31b7`, Spixi `#3050bd`/`#2d48a3`, Meadow `#0e7a55`/`#11603f`, Aurora `#07666b`/`#08626a`, Dusk `#d02b7d`/`#a62264`, Ocean `#0d7aa7`/`#13729a` | the section 2 values |
| same | TODAY grounds + inks (6 light + 6 dark canvases; dark Mist `#040607 / #C6CFFD`) | the S20 strings | the section 2 values (dark Mist `#0C0E10 / #C9D0F0`) |
| same | GAP (12 cells) | `#B6B6E4 #ADC1E9 #B8D4AB #57A4E6 #D5BCDC #ABCBF4`, dark `#212659 #1C2C5A #1B3243 #1A2E68 #2B2850 #1A3255` | `#B6B6E0 #AFC1E5 #BBD1BA #6EA2D5 #CFC0DA #B3CAEC`, dark `#212756 #1E2D53 #1E3143 #1E315F #292A4C #1F3251` |
| same | resets (tile) | light Aurora alpha `0.192`, Iris tile sent `#6145d6`; dark tile sent `#1a4a96`/`#4b31b7`, Meadow root ink `#BFE8CB`, alpha `0.101` | `0.1536`, `#604dc5`; `#2d4d81`/`#4a3aa8`, `#C8E4D0`, `0.0808` |
| `scripts/pins-s18/e-pattern-desktop.mjs` | phone alpha per canvas | light Mist 0.1024, Aurora 0.192, dark 0.101 | per canvas: Iris/Spixi light 0.09216, Meadow/Dusk/Ocean light 0.08192, Aurora light 0.1536, Iris dark 0.0909, other dark 0.0808; desktop = 0.8 x |
| same | brand delta L* floor / dark Mist ink | 4; Mist ink from the shared default | 3.5 at Iris's own alpha; ink read from the Mist rule |
| `scripts/pins-s19/r-dark-bubbles.mjs` | Mist ground rule; pattern floor | ground darker than A's stop; 0.97 to 1.15 | Mist ground equals A's `#0C0E10`; six canvases >= 0.75 |
| `scripts/pins-s20/r-dark-grounds.mjs` | grounds (7 x stops), bubbles + quotes, Mist ratios, pattern floor | L x 0.85 of S19 B; S20 bubble relations | the exact picked strings; Mist 1.35 +- 0.01 and 1.25 +- 0.01; Mist 0.97 / others 0.75 |
| `scripts/pins-s20/r-notice-card.mjs` | Mist visible card | >= 1.15 | >= 1.12 |
| `scripts/pins-s20g/c-n1.mjs` | SHIFT (bubble + quote); ASK | S20 bubble at OKLCH L -0.06 (Mist -0.04); farther from sent than S20 | the exact picked bubble + quote; Mist >= 1.6, the others farther than S20 |
| `scripts/pins-s4/fix4.mjs` | `mistOwn` bubble | `#1a1d1f` | `#272b2d` |
| `scripts/pins-s8p/g-grounds.mjs` | light Spixi, dark Meadow, dark Spixi (ground, ink, gap) | S20 strings | the section 2 values |
| `scripts/pins-fixb2/g-aurora-ring.mjs` | held gaps (light / dark Aurora) | `#57A4E6` / `#1A2E68` | `#6EA2D5` / `#1E315F` (the ring held, 3.02) |
| `scripts/smoke-test.mjs` (inline rows, never run here) | light Iris regex (~26154); emoji-only sender stops (~38111); pattern delta L* row (~38891 to 38915); dark Iris + flat descendant regexes (~38926 to 38933); dark Meadow regex (~40250) | S20 strings; stops `#ccd0ec #d0c9eb #d5c3eb`; dark Mist `#040607` | the picked strings; stops `#cdd0e8 #d0cae7 #d4c4e6`; `darkMist === '#0C0E10'`, `dMistA === 0.0808` |

## 8b. Fix round 1 (O2-1 .. O2-3): the tiles show what the chat shows

Found by a fresh reader: elements with their OWN `data-chat-ground` (the Settings preview, the canvas dots, the Background swatches) lost to the S17 tile resets, so the picks did not show there (Chromium, built `settings.html` vs built `chat.html`: 42 of 84 cells differed before; 0 after). Changed lines in `src/styles/tokens.css` (the chat-root values are NOT changed):

| Rule | Was | Now |
|---|---|---|
| light phone tile reset `:root:not([data-theme='dark']) [data-chat-ground]:not([data-chat-ground='aurora'])` | alpha `0.1024` + tile-max `1` on every non-Aurora tile | tile-max `1` only; the alpha `0.1024` moved to a rule for `flat` (Mist, no own alpha) alone |
| light desktop tile reset (`:root[data-desktop]:not([data-theme='dark']) [data-chat-ground]:not(...aurora)`) | alpha `0.08192` + tile-max `0.8` | tile-max `0.8` only; the alpha `0.08192` for `flat` alone |
| light desktop alpha lines (Iris/Spixi `0.073728`, Meadow/Dusk/Ocean `0.065536`) | root form only | root form + descendant form `:root[data-desktop]:not([data-theme='dark']) [data-chat-ground='X']` (0,4,0) |
| dark ink reset `:root[data-theme='dark'] [data-chat-ground='flat'], [...='gradient'] { --chat-pattern-ink: #C6CFFD }` | forced `#C6CFFD` on the Mist and Iris tiles | removed: every dark canvas rule (root + descendant form) sets its own ink, so nothing leaks (Mist `#C9D0F0`, Iris `#C8D0F7`) |

Proof: `pins-photo1b/g-tokens` key `tile` (7): for all 7 canvases x light / dark x phone / desktop, a tile under a plain root and under every other canvas root has the ink, alpha, ground, Auto sent and sent card of a chat root on that ground; `pins-s17/c-appearance` resets clause re-based to "tile = chat" (light Aurora root: Mist tile 0.1024, Iris tile 0.09216; dark Meadow root: Mist tile ink `#C9D0F0`, Iris tile `#C8D0F7`); by hand `scripts/pins-photo1b/preview-vs-chat.mjs` (Chromium, the real preview / dots / swatches). Not compared, as in the base: the select gap of a Mist tile under another canvas root (no preview paints it).

Stale pass messages re-written to the new values (O2-2): `pins-s20g/c-n1.mjs` (shift, ask, quote), `pins-s20/r-dark-grounds.mjs` (bubbles, light, header), `pins-s17/c-appearance.mjs` (today / edge), `pins-s4/fix4.mjs`, `pins-s8p/g-grounds.mjs`, `smoke-test.mjs` (#3A3160), `pins-s20/r-notice-card.mjs` (1.17 -> 1.19: the card read 1.189 on `#040607`). Comments in `tokens.css`: light Iris gap ring 3.59 -> 3.58 on the new gap, the Spixi gap's middle stop `#C7D6ED`.

## 9. Deliberate breaks (#802: one token in a full temp copy + `build-shells`; the pin must go red for that reason)

Recorded in the RETURN list and in the header of `g-tokens.mjs`. The break per changed clause of each re-based pin was run in the same way.

## 10. Render

`node scripts/pins-photo1b/render-grounds.mjs --root <tree> --out <dir>` paints 7 appearances x light / dark x 1280 x 800 (desktop UA) and 412 x 915 (phone UA) = 28 PNGs, plus `mist-dark-grounds-040607-07090B-0C0E10.png` (three dark Mist grounds side by side; the first two are a ground-only style override under the tree's new bubble). Run once into `/home/claude/wt/tokens-out`. A render is not a proof: the numbers above are.
