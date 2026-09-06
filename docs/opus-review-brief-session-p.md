# Session P review brief — common context (READ FIRST)

Repo copy under review: /home/claude/work/dev/Spixi (the MUTATED tree). The untouched baseline is
/home/claude/work/base/Spixi (HEAD b12f752d). The unified diff of everything this session changed:
/home/claude/work/review/session-p.diff. Ixian-Core (frozen 097341a, read-only) is at
/home/claude/work/dev/Ixian-Core.

What was built (two levers, one build — Damir's call):
1. THE PRE-WARMED BLANK CHAT (#780; design = docs/prewarm-chat-spec.md; DECISIONS #800):
   SpixiContentPage.warmSpareChat / pushSpareChat / dropSpareChat / hasSpareChat (a NEW slot
   `spareChatOp`, separate from `parkedOverlay`), SingleChatPage's private blank ctor +
   createSpare + attach + spareShellBooted + ownsSystemBarStrip override + the onNavigating blank
   guards, HomePage.onChat (spare first, fallback unchanged), HomePage triggers
   (onOverlayClosed → 350 ms; first clearChatsDone → 1800 ms), drops in pushThemeToAllPages /
   reloadAllPages / SettingsPage language pick / Node.onLowMemory / HomePage.stop /
   setOverlayHost, belts in Utils.getChatPages + UIHelpers.getLiveShellPages.
2. THE BATCH TRANSPORT (#298 B1+B3; design = docs/chat-transport-spec.md; DECISIONS #801):
   SingleChatPage.UiBatch + push() + insertMessage(…, batch) + updateReactions(fm, batch) +
   loadMessages → ONE `addMessages(base64 JSON, "append")` + `messagesDone`; the shell
   (src/shells/chat.html → built Spixi/Resources/Raw/html/chat.html) gained `addMessages` /
   `messagesDone` handlers, `logDirty` / `batchSeen` / `lastPaintMs` / `prependBatch`, and
   onChatScreenLoaded paints only when dirty. Both transports must stay live on both ends.
   B2 (prepend from C#) and B4 (window) deliberately NOT built.
3. Pins: the `★★ Session P` block at the end of scripts/smoke-test.mjs (78 pins), plus four
   existing pins REBASED in place (A4 ⑥ tap stamp · Session I ② shell paint · Session O ⑫ stage
   count · Utils.cs comment glob `img/flags/*.png` → `<code>.png` because that `/*` inside a
   `//` comment opened a runaway block for every naive stripper in the suite).
   Closing suite: BASELINE OK 4307 / the 3 known. 28 mutations, 28 killed (list below).

House rules that bind YOUR findings (from CLAUDE.md / DECISIONS #771–#773, #797, #798):
- Cite a SEARCHABLE ANCHOR (a quoted line), never a bare line number.
- A pin must assert a PROPERTY, not a line shape; a behavioural pin that stubs the function
  under test proves nothing; every pin declares stripCode or RAW.
- A comment that states an invariant the code does not enforce is a DEFECT (#772).
- A refusal is documented from the cases the author did NOT think of (#798): when you find a
  guard, enumerate the cases outside its author's list.
- C# is NOT compiled here (no toolchain). Read it as a compiler would: definite assignment,
  nullable flow, accessibility (private nested types in signatures, protected access through a
  derived-typed expression), pattern-variable scope, `lock` + UI-thread reads, async voids.
- Security lens (SECURITY.md §1, #221): the chat WebView stays isolated; a push carrying
  message text is a SINK; no new verb, key, fetch, setting; logs carry fixed words + integers.
- The [CDPERF] set is TEMPORARY and must live and die together; every new stamp is fixed
  words + integers.

Report format (one line per finding, then a paragraph of evidence):
  SEVERITY (MAJOR|MINOR|NIT) · file · `anchor` · what is wrong · why it matters · how to prove it
  (a mutation that should fail a pin but does not, a repro sequence, or a compile error).
Grade MAJOR = user-visible defect, data loss, security exposure, a compile error, or a pin that
is vacuous on the property it names. Do NOT propose fixes in code; describe them. Do NOT edit
files. Also list explicitly what you checked and found CLEAN (so the verifier can refute you).

Mutations already killed (do not re-run; find the ones NOT on this list):
M1 blank ctor fetches presence · M2 onload guard removed · M3 blank-verb guard moved after
ixian:back · M4 attach latches not reset · M5 attach onLoad twice · M6 warm sets activePreload ·
M7 getChatPages drops a friend guard · M8 getLiveShellPages skip removed · M9 theme no drop ·
M10 lowmem no drop · M11 language no drop · M12 onChat fallback deleted · M13 activePreload set
before refusals · M14 READY check gone · M15 strip gate removed · M16 trigger A outside guard ·
M17 trigger B faster than Account · M18 messagesDone dropped after batch · M19 one row bypasses
the batch · M20 intern every ≥256 string · M21 allowlist gains setChatMode · M22 messagesDone
does not render · M23 fold ignored · M24 onChatScreenLoaded always re-renders · M25 250 ms timer
deleted · M26 interned ints not resolved · M27 prepend derives the boundary.
