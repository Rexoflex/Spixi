Read docs/handoff-2026-08-17g.md FIRST and verify the git state it describes
(the #375-#377 commit should be at HEAD, parent af10a004 - if it is not, stop
and say so). Then run the N4 LOCALE EXPANSION session (worklist R2, the only
(L) item left - it has its own session by design): ① AUDIT what exists - the
8 built FE dictionaries (en/de/es-co/fr/pt-br/ru/sl/sr) vs the 13 legacy
lang/*.txt sets; it/id/lt/cn/ja have C# strings but NO FE dictionary (the
#360 residual - those users get English shells today while legacy pages
translate). ② PROPOSE the launch language set (15-20; bring the coverage
numbers per candidate - how many of the 713 keys the legacy set can seed vs
needs drafting) and LOG it as a dial for me before building dictionaries
beyond the five named. ③ BUILD the five missing dictionaries (legacy-reuse
first, machine-draft the rest into src/strings/draft/, native review flagged)
- ⚠ the dictionary and the Utils.cs culture gate move TOGETHER (a dictionary
without the gate never loads; the gate without a dictionary shows English) -
and un-hide them from both pickers (#258 languagePending rows become real).
④ The per-language BUTTON-OVERFLOW audit (longest-string per key per language
vs the 32/44/56 button widths + chip/topbar labels; jsdom-measured, report +
fix the breakers). Zero em/en-dashes in new drafts (the N3a gates hold all
built sets at zero). Do NOT touch the §5 pile, do NOT build N57 (Core-side;
my protocol run is pending), do NOT re-attempt anything in 17g §6. House
rules in full: cloud twin, verify against code before building (#215),
bundle before shells, smoke green with mutation-proven pins (state the new
number vs 1903/4), extract/build-locales/iife/verify + i18n-lint + pseudo
after any string change, the #46 loop on Opus for anything substantial,
DECISIONS rows at decision time, security gate while building (new locale
files = no verbs/keys/sinks, but the gate row still gets written), tarball
delivery + updated handoff + F5 checklist at the end. I commit.
