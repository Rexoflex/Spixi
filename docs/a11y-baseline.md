# Accessibility baseline (axe-core over the built shells)

First run of `scripts/quality/a11y-scan.mjs` (quality item 7, session `qtools`). A REPORT: nothing here fails a build.

| | |
|---|---|
| Date | 2026-11-27 |
| axe-core | 4.14.1 (exact, devDependency) |
| Chrome | Chrome for Testing 153.0.8010.12 (`/usr/bin/google-chrome`, headless, DevTools protocol, no Playwright) |
| Node | 22.23.5 (global `WebSocket`) |
| Tree | `work/qtools` built shells, `Spixi/Resources/Raw/html/*.html` (18 files, none skipped) |
| Run | `node scripts/quality/a11y-scan.mjs --out <report.json>` · 72 page runs · 182 s on 2 cores (cloud twin) · default total limit 480 s (below the 540 s (9 minutes) the CI runner gives a child), 30 s per page run |
| Rules | axe default set (WCAG 2.0/2.1 A and AA + best-practice), `resultTypes: violations, incomplete` |

## What is scanned

Matrix: every shell × light and dark × phone and desktop = 18 × 2 × 2 = 72 runs.

| Axis | Setting |
|---|---|
| Light / dark | `prefers-color-scheme` emulated. The shells' head script reads the C# carrier `*SL{SpixiThemeName}` (unresolved in `file://`), then `localStorage spixi.appearance`, then the OS scheme, and sets `data-theme` on `<html>`. The scan checks the attribute after load and fixes it if it differs (it never did; no setup note in the run). |
| Phone | 390 × 844, deviceScaleFactor 2, mobile and touch emulation, Android 14 Chrome UA (so `data-desktop` is NOT set) |
| Desktop | 1280 × 800, no touch, Windows Edge UA (`data-desktop` set, the 2-pane / rail layout) |
| Motion | `prefers-reduced-motion: reduce`, so entrance animations do not fake contrast readings |

State scanned per shell (the main screen; pushes go through the page's own `executeUiCommand`, base64 as C# sends them):

| Shell | State scanned |
|---|---|
| index.html | chats tab with 6 chats (`setCaps`, `addChat` × 6, `clearChatsDone`) |
| chat.html | 1:1 conversation with 4 text messages |
| contact_details.html | a saved contact (name, address, relation `contact`) |
| settings.html | the settings hub (nickname, address, version pushed) |
| app_details.html | a not-yet-installed app (`init`) |
| wallet_sent.html | a confirmed sent payment, amounts shown |
| call.html | the full call screen, call in progress |
| intro.html | launch welcome step (no push needed) |
| lock.html · scan.html · settings_backup.html · settings_encryption.html · contributors.html · empty_detail.html | as loaded (these shells draw their main screen on their own) |
| contact_new.html · app_new.html | the empty form |
| downloads.html · dev.html | the empty state ("Files you receive in chats appear here", "Waiting for the log...") |

Network: Chrome is cut off. Every URL, loopback included, goes to a dead proxy (`--proxy-server=127.0.0.1:9`, `--proxy-bypass-list=<-loopback>`), every host name is unresolvable (`--host-resolver-rules="MAP * ~NOTFOUND"`), and component update, sync, pings, domain reliability and background networking are off. `file://` pages need none, so they load as before. Proof: with `HTTPS_PROXY`, `HTTP_PROXY` and `ALL_PROXY` pointed at a logging proxy, the old flag set (`--disable-background-networking` only) made 7 CONNECTs in 25 s (`redirector.gvt1.com`, `accounts.google.com`, `android.clients.google.com`); the scan made 0. The DevTools port is the only listener Chrome opens, bound to `127.0.0.1` (`--remote-debugging-address=127.0.0.1`; the listening sockets read from `/proc/net/tcp` were loopback only). If Chrome dies mid-scan the scan stops at once: exit 2 when no page was scanned, else a partial report marked INCOMPLETE.

Each page run: load, wait 1.2 s, push the feed, wait 1.2 s, check the theme, inject `axe.min.js`, `axe.run(document)`.
The renders were read by eye (a PNG per run via `--shots`) for the shells with a feed; each shows the named state.

## What the scan cannot see

Anything after a user action (sheets, modals, menus, the other tabs and steps: Apps, Wallet, the settings sub-screens, launch steps 2 to 4, the ring card of a call, a chat with media or a quote); keyboard order and focus handling; screen-reader speech; contrast over images, gradients and overlapping layers (axe lists these as "incomplete": 0 to 20 nodes per shell, counted in the matrix column `inc`, not judged); the Android and iOS WebViews (this is desktop Chrome with a phone viewport; the platform insets are not set; fonts and icons raster differently). `*SL{…}` carriers stay unresolved in `file://`, so strings come from the English dictionary.

## Matrix

Cells: violating nodes by impact, critical / serious / moderate / minor. `inc` = nodes axe could not decide.

| Shell | light phone | dark phone | light desktop | dark desktop | inc |
|---|---|---|---|---|---|
| app_details.html | 0/0/7/0 | 0/0/7/0 | 0/0/7/0 | 0/0/7/0 | 1 |
| app_new.html | 0/0/6/0 | 0/0/6/0 | 0/0/6/0 | 0/0/6/0 | 0 |
| call.html | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 1 |
| chat.html | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 16 |
| contact_details.html | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 1 |
| contact_new.html | 0/0/7/0 | 0/0/7/0 | 0/0/7/0 | 0/0/7/0 | 0 |
| contributors.html | 0/2/20/0 | 0/1/20/0 | 0/2/20/0 | 0/1/20/0 | 16 |
| dev.html | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 0 |
| downloads.html | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 0 |
| empty_detail.html | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0 |
| index.html | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 20 |
| intro.html | 0/0/6/0 | 0/0/6/0 | 0/0/6/0 | 0/0/6/0 | 10 |
| lock.html | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 0/0/5/0 | 4 |
| scan.html | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 0/0/4/0 | 0 |
| settings.html | 0/1/9/0 | 0/1/9/0 | 0/1/9/0 | 0/1/9/0 | 3 |
| settings_backup.html | 0/1/16/0 | 0/1/16/0 | 0/1/16/0 | 0/1/16/0 | 0 |
| settings_encryption.html | 0/0/8/0 | 0/0/8/0 | 0/0/8/0 | 0/0/8/0 | 0 |
| wallet_sent.html | 0/0/14/0 | 0/0/14/0 | 0/0/14/0 | 0/0/14/0 | 1 |

Totals (an element seen in four runs counts four times): critical 0, serious 14, moderate 508, minor 0.
Theme and width change nothing except one contrast reading (contributors, light only). Every other finding is structural.

## Findings by rule

Distinct elements = unique shell + selector across the four runs.

| Rule | Impact | Shells | Distinct | Read | Direction of a fix |
|---|---|---|---|---|---|
| color-contrast | serious | contributors | 1 | The topbar title `.c-topbar__title` (white `#f9fafb`) in LIGHT only: axe reads its text-shadow colour `#dce0e6` as the background (1.26 : 3). Probably a false positive of the text-shadow rule over the hero gradient, which axe cannot see. Needs a look. | Check the shadow token in the light theme; if the title sits on the dark hero, no change, else darken the shadow. |
| scrollable-region-focusable | serious | contributors | 1 | The scroll body `.c-settings__body` holds no focusable child, so a keyboard user cannot scroll it. Real (hardware keyboard on desktop and tablets). | `tabindex="0"` plus a label on the scroll body when it has no focusable content. |
| label-content-name-mismatch | serious | settings | 1 | The avatar button `.c-settings__avatar` has `aria-label="Change photo"` while its visible text is the initials ("AK"); WCAG 2.5.3 wants the visible text in the name. Mild: the visible text is not a label. | Mark the initials `aria-hidden` (they are decoration) or put them in the label. |
| aria-hidden-focus | serious | settings_backup | 1 | `#c-settings-backup-adv-1` (the collapsed "Advanced" box) is `aria-hidden="true"` and still contains focusable content. Real: focus can land on content a screen reader hides. | Use `inert` (or `hidden` / `display:none`) on the collapsed box instead of `aria-hidden`. |
| region | moderate | 16 of 18 (all but call, empty_detail) | 82 | Content outside any landmark (search field, filter row, list rows, cards). | Wrap each shell's body in `<main>`; the topbar in `<header>`, the bottom nav in `<nav aria-label>`. |
| meta-viewport | moderate | 18 of 18 | 18 | `user-scalable=no, maximum-scale=1` in every shell (WCAG 1.4.4). By design (the app has its own text size, the WebView is not a browser), so this is a ruling, not a bug. | Keep and record as a known deviation, or remove `user-scalable=no` per the text-size decision. |
| landmark-one-main | moderate | 15 of 18 (not call, scan, empty_detail) | 15 | No `<main>`. Same fix as `region`. | One `<main>` per shell. |
| page-has-heading-one | moderate | 12 of 18 | 12 | No `<h1>` (titles are `div.c-topbar__title`). | Render the topbar title as `<h1>` (or `role="heading" aria-level="1"`). |

Notes: no critical finding; no `image-alt`, `button-name`, `label`, `aria-*` validity or `duplicate-id` finding in the scanned states. The scan was proven to find those classes (see "Proof" below).

## SERIOUS and CRITICAL (for the one Mission Control item "Check")

Critical: none.

Serious (4 rules, each on one shell, same in all four runs unless said):

1. `scrollable-region-focusable` · contributors.html · `.c-settings__body` · real.
2. `aria-hidden-focus` · settings_backup.html · `#c-settings-backup-adv-1` · real.
3. `label-content-name-mismatch` · settings.html · `.c-settings__avatar` ("Change photo" vs initials) · mild.
4. `color-contrast` · contributors.html · `.c-topbar__title` · LIGHT theme only (2 of 4 runs) · probably a false positive (text-shadow over a gradient); needs a look.

## Proof that the scan finds something (the deliberate break)

A temp copy of the built html folder, with this inserted after `<body>` in `index.html` only (the copy was deleted; the repo shell is unchanged):
`<img src="img/spixiavatar.png">` (no alt), `<button type="button"></button>` (no name), `<p style="color:#bbb;background:#fff">` (low contrast).
`node scripts/quality/a11y-scan.mjs --html-dir <copy>/html --only index.html` reported, in all four runs of index.html: `image-alt` critical 1 (`img`), `button-name` critical 1 (`body > button[type="button"]`), `color-contrast` serious 1 (`p`). Counts went from 0/0/5/0 to 2/1/7/0 per run (the two extra moderate are `region` hits of the inserted nodes). The real index.html has no critical or serious finding.

## How to read a re-run

`a11y-report.json` has `meta`, `states`, `rules` (per rule: shells, runs, nodes, distinctElements, one example) and `runs` (per shell, theme, view: violations with selectors, up to 3 HTML samples and the axe message, `incomplete`, `pushed`, `missingHandlers`, `pageErrors`). `missingHandlers` must be empty (a non-empty list means a feed names a push the shell no longer has: the scan then shows a less complete screen). The markdown summary goes to stdout and to `$GITHUB_STEP_SUMMARY`. Exit 0 = the scan ran; 2 = it could not (no Chrome via `$CHROME_BIN` / PATH, no `node_modules/axe-core`, no global `WebSocket`, Chrome did not start, no page scanned).
