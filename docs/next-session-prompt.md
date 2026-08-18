Read docs/handoff-2026-08-19.md FIRST and verify the git state it describes
(the #381-#384 batch on top of 26f29133 - if the chain does not match, stop and
say so). Confirm Spixi/Meta/Config.cs reads "spixi-0.9.22" (it was lowered for
an F5 and reverted in that batch). This session runs in **#380 BUDGET MODE -
the scope is PINNED, do not widen it.**

THE BUG ROUND. Six findings came out of the #383 F5. **PICK ONE, TWO AT MOST**,
in this order. Every one of them is TRIAGE-FIRST (#215) - name the mechanism in
code before touching anything, and if it balloons or needs a dial, STOP at a
triage doc + plan and hand off.

① **N65 - Windows: the language pick does NOTHING** (highest value - visible,
reproducible on your dev machine, suspect already named). SettingsPage.xaml.cs
:469-497 puts the preference, the setLocale push, reloadShell() and the live
chat reloads ALL inside `if (SpixiLocalization.loadLanguage(lang))` - a false
return is a silent total no-op. FIRST: log what loadLanguage("pt-br") actually
returns on Windows. If TRUE, the bug is the FOUR-way state split Damir
screenshotted in one frame (hub French - row value Deutsch - checkmark pt-br -
app German): enumerate the four sources separately. Either way the handler must
stop failing silently.

② **N66 - only the OS-FOLLOW theme path is broken.** Explicit Dark/Light themes
everything correctly; System leaves the Android Account screen light and makes
the Windows panes disagree. DIFF THE TWO PATHS, do not invent a third. Prime
suspect: the parked Account WebView (#315) is missing from the flip fan-out -
the same "a collection was missed" class as #251 and #284.

③ **N69 - first connect after account creation never completes until restart**,
and a contact request sent in that window reports success and is LOST. SPLIT
IT: (b) the silent loss is FE/C# and fixable alone - queue-and-say-pending, or
refuse honestly. (a) is C#/Core and may also explain the original D-21 symptom
(see docs/n40-triage-connecting.md - M1 is confirmed in code but CANNOT be what
I originally saw, the served version equals the shipping build).

④ **N67 - ONE "Delete Spixi account" action** (my product call). Destructive
path: reproduce the delete-then-restore error FIRST, security-gate row, keep the
W14/#348 live-wallet guard.

⑤ **N68** - the fatal-exception dialog on failed-restore then create. Logcat
before code.

⑥ **N70** - the update notice does not appear when the app started offline
(re-arm the hourly version check on the offline-to-online edge). Small.

NOT THIS SESSION: N63 (locale fallback tail) - N64 (update-notice design round)
- N10/N15/N39. Do not touch N57 (Core-side, my protocol run pending), the
deferred pile, or anything in the archived 17g handoff section 6.

ECONOMY RULES (hard): smoke as bookends only - baseline once (expect 1971/4) and
final once (state the new number) - plus ONE batched mutation-proof run for any
new pins. ONE Opus review round at the end, and only if C#/money/data paths
changed; no r2/r3 unless it finds a MAJOR. No agent fan-outs. Standing set
otherwise unchanged: cloud twin - verify against code (#215) - **bundle BEFORE
shells, and READ the bundle build's output, it was silently dead for months
(#383)** - locale pipeline + i18n-lint + pseudo + i18n-overflow-audit only IF
strings changed - DECISIONS rows at decision time - security gate row - tarball
delivery + updated handoff + F5 checklist (short - only the legs the session
touched). Any C# change means I wipe obj/bin before deploying. I commit.
