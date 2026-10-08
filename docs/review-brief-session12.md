# Review brief — session 12 (S11 walk fixes + #1267 picks)

Tree: `/home/claude/twin/Spixi` (base = HEAD f20aac00 "Session 11: …"; `git --no-optional-locks diff HEAD` + untracked files = the batch). Sibling `/home/claude/twin/Ixian-Core` @097341a. Contract: `/tmp/s12/CONTRACT.md`. Rows: DECISIONS #1265 (answers) · #1266 (walk S11) · #1267 (interview).

READ-ONLY. Do NOT run `scripts/smoke-test.mjs` and do NOT run `run-csh` (the lead runs them; 2 cores). You may run single pin modules: `/tmp/s12/mkrunner.sh /home/claude/twin/Spixi /home/claude/twin/Spixi/scripts/_r-<you>.mjs pins-s12/<mod> …` then `node scripts/_r-<you>.mjs` from the repo root — but for any deliberate break COPY the tree first (`cp -a /home/claude/twin/Spixi /tmp/s12/rev-<you>/Spixi` + Ixian-Core sibling) and break only your copy; delete your runner after. Be harsh; the author wants to be proven wrong. Severity MAJOR / MINOR / NIT, `file:line`, mechanism, evidence.

## What landed
| Item | Files |
|---|---|
| L update URL → download.html | `Spixi/Meta/Config.cs`, `scripts/pins-s11/a-cs.mjs` |
| A tips 1/3/4, `ixian:hintHelp:<id>` + cap `hintHelp` (🟡), order after 5–9, tip 2 held | `glass-card.js`, `home.html` (hint region + HINT_IDS import), `S11HintRules.cs`, `HomePage.xaml.cs`, `Config.cs` (networkHelpUrl), `scripts/csh/S11HintTests.cs`, `Stubs.cs`, pins-s12/a-* , re-based pins-s11/a-hints, a-cs |
| B About B + How to use A + Rate row (`ixian:rating:yes` on SettingsPage, cap `rate` Android/iOS), storage key `spixi.howtoSeen`, 4 new icons, `--ab-*` tokens | `settings-app.js`, `settings-app.css`, `tokens.css`, `settings.html`, `SettingsPage.xaml.cs` (lead moved the cap above `hints` and the branch above `reportTranslation` after the merge), `src/assets/icons/*`, pins-s12/b-*, re-based pins-s9/b2-copy |
| C paste on the 2-step amount (Send + Request) | `amount-pad.js`, pins-s12/c-paste |
| D Windows viewer Save: `[P1] savephoto r=` probe, observed task, share-tolerant open, cancel w/o toast; window root ground (resize band candidate) | `SingleChatPage.xaml.cs` (onSavePhoto), `Platforms/Windows/SFileOperations.cs`, `Platforms/Windows/App.xaml.cs`, `S11MediaRules.cs`, `SpixiContentPage.cs` (applyPageSurfaceColor hook), `scripts/csh/S12SaveTests.cs`, pins-s12/d-*, re-based pins-s11/g-cs, pins-s9/a2-wiring |
| E (lead) V-26: after a candidate release the grounds wait for the native WebView's draw (`S12GroundWait`, `groundStep`), the cold chat open takes the same hold | `SpixiContentPage.cs` (releaseHeld, S12GroundWait, presentOverlay chat hold), `S11ChatRules.cs`, `scripts/csh/S12HoldTests.cs`, pins-s12/e-hold, re-based pins-s11/c-wiring |
| Strings | 36 new keys × 12 drafts (`src/strings/draft/*.json`) |

Mechanism evidence for E: DECISIONS #1266 (probe: `dirty=0` on every held frame, `dirty=1` two frames after the release; recording: one #f9f9fb frame per open lined up with the release ±20 ms).

## Scopes (disjoint)
- **R1 — C# (all of it), compile-level + threading + platform lifetimes + security.** SpixiContentPage (E + D hook), SingleChatPage onSavePhoto, Windows SFileOperations + App.xaml.cs, SettingsPage rating branch + caps, HomePage hintHelp branch + caps, S11HintRules / S11MediaRules / S11ChatRules, Config. Questions: does every API exist with that signature (WinUI, CommunityToolkit 14.2.0, Android Choreographer / View.IsDirty / PostInvalidateOnAnimation)? Can S12GroundWait leave the grounds transparent forever (a hole) — close during the wait, a parked chat, a theme sweep during the wait (`groundsHeld`), a second hold of the same op, a page disposed? Does the cold chat hold change the iOS / Windows / Mac paths (it must not)? Does the cold hold interact badly with `revealDelayMs`, the park / re-present path, the desktop wide pane (column), a lock stage? Backup still works on Windows? Any WebView-supplied value reaching openExternal or a file op? Log lines: codes / types only?
- **R2 — shells + UX + security of the JS.** glass-card / home.html hints, settings-app About + How-to + settings.html, amount-pad paste. Money safety of the paste (every locale, focus in a real field, sheets over step 2, Review open, listener leaks, double fire). About: the version chip parser, `ixian:openLink:` rows unchanged, Licences, Rate only with the cap. How-to: localStorage handling (`spixi.howtoSeen`), a11y (aria-expanded, focus, keyboard), RTL, both themes, 320 px. Copy lens on every new English string (claims rules in DECISIONS #1265: no "no servers", PQ conditional, E2E wording; the How-to steps must match the real UI paths) — check each path in the code.
- **R3 — tests.** Every new / re-based pin and csh test: does it fail when its behaviour breaks? Derive your own mutations (budget ~15) on the EFFECTFUL lines in a COPY; report each survivor with the exact break. Re-based pins must not be weaker than before (diff them against HEAD). Is any new behaviour unpinned (e.g. the cold chat hold actually entering holdStageUntilDrawn; the Windows ground on theme flip; the hintHelp cap gate in the shell; paste on Request)?

## Accepted dials (do not re-open)
#1265 / #1267 decisions (tip targets, held tip 2, order, paste A, V-26 fix, Save probe + candidate, About B / How to use A without "Show me", Rate row Android/iOS only, splash kept, cold-start stall after the freeze, resize band candidate). Agent C refuses (not truncates) a paste > 64 chars and is stricter than ungroupAmountInput by design.

## §5 Verdict
(lead fills in)

### Verdict (written by the lead, 2026-10-08)
| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | R1 C# | 2 | 2 | 5 | cold hold broke chat → chat swap; self-invalidate wait proved nothing → fixed |
| r1 | R2 shells + copy | 2 | 6 | 7 | paste fr / ru / lt '.' as grouping; leading-zero group → fixed; copy / back / drafts fixed |
| r1 | R3 tests | 3 | 3 | 1 | lost csh cases; wait class unpinned; paste exclusion unpinned; 9 survivors → pinned |
| r2 | fresh reader | 0 | 4 | 4 | CLEAN; m-1 / m-2 fixed, m-3 recorded, m-4 done |
| r3 | fresh reader (m-1, m-2) | 0 | 0 | 5 | CLEAN; NITs (stale comments) fixed |

Deliberate breaks: every new pin and every fix (A 11 · B 29 · C 23 · D 21 · lead 18) failed for exactly its reason; r1 R3 survivors M1–M3, J1–J5, J7, J12 all killed by the r1 pins. Full table: `docs/review-brief-session12.md` §5 = this, findings: DECISIONS #1268. Final numbers: smoke BASELINE OK 5686 / the 2 KNOWN · CSH 344.
