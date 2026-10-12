# 00 · Start here — the BE review of the Spixi redesign

**For:** the BE engineer. **Must-read: about 2 h 30 min.** **You decide: 10 yes / no lines** in [`00-decision-sheet.md`](00-decision-sheet.md). Each line states what we ship unless you say no. No meeting is needed.
Facts are at `redesign/frontend` `052aac6b`, against the fork point `0e85a4b8` (upstream Spixi).
Words used: S16 / S17 = our build sessions 16 and 17 (commits `e2e84629`, `052aac6b`) · walked = tested by hand on a device · F1–F8 = findings made while writing this pack (README) · L2, L8, MAJOR #n = ids of inherited issues (`legacy-not-ours.md`) · #n = a row in `DECISIONS.md`.

## 1 · What to read, and how long
| Part | Read | Minutes |
|---|---|---|
| **Must** | This page + [`00-decision-sheet.md`](00-decision-sheet.md) | 3 + 10 |
| **Must** | The HIGH packets: P01–P17, P24, P25 (19 packets; P17 is planned work, nothing built) | 130 |
| **Must** | [`core-asks.md`](core-asks.md) — what needs Ixian-Core (your side) | 5 |
| | **Must-read total** | **148 (2 h 28)** |
| Skim | MED: P18–P22, and P28 (LOW–MED: a chat page can open a Settings screen) | 36 |
| Optional | LOW: P23, P26 · [`legacy-not-ours.md`](legacy-not-ours.md) · the README table of the eight findings F1–F8 (found while condensing; F1–F4 and F8 fixed in #1322, F5 in part) | 24 |
| | **Everything** | **208 (3 h 28)** |

- The minutes cover each packet's page (about 1 page: what, why, files, bridge table, threat → rule → proof, one question) and its **Look here first** line — not the full diff. The diffs are in [`00-diffs.md`](00-diffs.md) for when a packet makes you want to look.
- Two sittings work well: (1) this page, the decision sheet, P01–P11, P24 and `core-asks.md` (106 min); (2) P12–P17 and P25 (42 min), then the skim part.
- Short of time? Read only each packet's **Look here first** line: the one line to open in the IDE, the riskiest in that packet.

## 2 · How to answer
- One line per decision on the sheet: `D2 yes`, `D5 no — <why>`. Send it to Damir in any form (mail, chat, a file).
- A "no" is a flag switch or a small code change; each line says which, and what it costs.
- Comments on a packet: write the packet id and the line.

## 3 · What the redesign is
1. The WebView front end of Spixi is rewritten: 29 legacy HTML pages became 18 shells (`src/shells/`, Vite + vanilla JS; no Bootstrap, jQuery or Font Awesome).
2. The C# changes serve those shells: new bridge verbs and pushes, native confirms, and rules for files, the lock and media.
3. Ixian-Core is not changed (`097341a`, `xcore-0.9.8k`). The wire protocol is not changed; new uses of existing message codes are in P15 (decision D7).
4. We built first and you review once, now (DECISIONS #1312; decision D1). The larger changes made after that rule (P24, P25, P26, P28) sit behind 4 runtime flags. The #1322 security fixes F1, F2, F5, F8 and MAJOR #9 have no flag (F3 / F4 are behind P25's `MediaInputGate`).
5. The gate rule (`docs/security-handover-gate.md`): an exposure we introduced is fixed before handover; an inherited one goes to you untouched (`legacy-not-ours.md`). Exception: two of ours are still open, and you decide them: home `removecontact` with no native confirm (D5), and MAJOR #8, mini-app file access (ours since #1313; its planned fix rides with the https origin of D8, extended so mini-apps lose file access too).

## 4 · What changed, in numbers (`0e85a4b8` → `052aac6b`)
| | Count |
|---|---|
| C# files in `Spixi/` | **84 new · 74 changed · 11 deleted**, plus 43 vendored `rocksdb-sharp` files for Mac (#920, P22) |
| C# lines | **+60 535 / −4 786** (the vendored files are marked `-diff` and not counted) |
| `ixian:` verbs (WebView → C#) | **91 new** verb names · **14 legacy names gone**: 9 with the deleted native pages (wallet send / receive / recipient / contact request, onboarding), 5 removed from `HomePage`; `send` also left chat and chat info |
| Pushes (C# → JS, `Utils.sendUiCommand`) | **117 new** function names |
| Runtime flags (`Spixi/Utils/SpixiFlags.cs`) | **4, all ON:** `SecureWalletPass` (P24) · `MediaInputGate` (P25) · `S17Bridge` (P26) · `S17Moments` (P28) |
| Review packets | **27** (P01–P26, P28; P27 is reserved) + `core-asks.md` (19 rows) + `legacy-not-ours.md` |

- How we counted: distinct string literals `"ixian:<name>` and `sendUiCommand(…, "<name>")` in `Spixi/*.cs` at `052aac6b` minus those at `0e85a4b8`. Every new name is named in at least one packet (checked by grep).
- The flags turn OFF only in dev mode today (`S16PassRules.effectiveFlag`). A release-wide OFF is one line in `SpixiFlags.init()`; the old path is in the build.
- Build status at `052aac6b`: S16 (P24, P25) is compiled and walked on Android and Windows (14 pass · 1 fail · 1 not tested; the D2 retry view was not reached on a device yet). S17 (P26, P28) is committed; its first compile and walk is the next build, and a failure there is fixed before handover. iPhone and Mac walks are next.

## 5 · The trust model in 5 lines (full list: `README.md`, SECURITY.md §1–§4)
1. Chat and every surface with peer or remote content has its own WebView. It shares no DOM or JS with the wallet or another pane; panes talk only through C# (#220).
2. A WebView only asks (an `ixian:` navigation) and its own page's C# answers. Mini-apps reach only their own verb list; every global verb we added refuses them (P06, P07).
3. Only C# signs and broadcasts, after a native dialog built from the values it signs (`SPayments.confirmAndAuth`, P02).
4. No key, seed or password goes into a WebView (legacy exception L2: passwords ride `ixian:` URLs out of lock, launch and settings). C# names every file it writes; the exceptions are listed in P11.
5. Every push argument is base64 in one composer, `Utils.sendUiCommand` (P14).

## 6 · Where things are
| File | What |
|---|---|
| [`00-decision-sheet.md`](00-decision-sheet.md) | The 10 decisions + the FYI questions of the other packets |
| [`00-diffs.md`](00-diffs.md) | One `git diff` per packet, PowerShell blocks that write them to files, and each **Look here first** line at `052aac6b` |
| [`README.md`](README.md) | All packets in one table, the full trust model, the findings F1–F8 |
| `P01…P28` | One packet per change group: what · why · files · bridge table · threat → rule → proof · the ONE question |
| [`00-refresh-list.md`](00-refresh-list.md) | Our work list: line numbers that moved in S16 / S17. A packet's `file:line` is from the tree it names; the symbol names still hold, and `00-diffs.md` has the current line for each "Look here first" |
