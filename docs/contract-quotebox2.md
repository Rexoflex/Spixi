# Agent contract — quotebox2

File name: `docs/contract-quotebox2.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Prompt: project doc `claude/session-quotebox2-prompt.md` (Ready by Damir, 2026-11-26 15:33 "quotebox2 after PR 30").
Number block: DECISIONS #2025–#2034 · lessons L315–L318 · packets P111–P112.

## 1 · Base
- Tree: `work/quotebox2` @ `ae7b8303` "Merge pull request #29 from Rexoflex/work/fixb5" (it holds the merge of pull
  request 30 = `c211d7de`) · baseline: `BASELINE OK <n> / the 2 KNOWN (#136 · B3)` (n read by the lead before the build;
  expected 7094 = the fixb5 tree + the quotebox tree, which added no smoke row) · CSH <n> (expected 919) ·
  tools by `npm ci` on the committed lock (jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 ·
  tree-sitter-c-sharp 0.23.5) · `../Ixian-Core` @ `097341a` · .NET SDK 10.0.115 · `TZ=America/Los_Angeles`.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (#1312,
  #1478: own switch, old path = the fallback; no new verb, no new push) · the security handover gate triggers (a new log
  line → the gate doc and a packet) · the size rule R1–R6 (#1963 (8): app C# ≤ +60 code lines; R2 no history comments;
  R5 no probe outside `#if SPIXI_DEV_COEXIST`; R6 a file over 1,500 lines grows only by the lines a fix cannot place
  elsewhere — name them) · edit `src/`, never `Spixi/Resources/Raw/html` · no commit, no push, no full smoke, nothing
  in Ixian-Core.

## 2 · Items and ownership
| Item | Agent | Model (effort high) | Owns | Reads only | Owes | Scratch |
|---|---|---|---|---|---|---|
| 1 (the dev log line of the reply match) + 3 (the three sweep sites) | builder-a | Opus | `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (`matchReply` and the `ixian:undorequest` success branch only) · `Spixi/Pages/Contacts/ContactNewPage.xaml.cs` (one line) · `Spixi/Utils/SpixiContentPage.cs` (one line) · `Spixi/Utils/SpixiFlags.cs` (ONE block appended at the end) · `scripts/csh/QuoteBox2Tests.cs` (new) + its `Compile`/test registration if the harness needs one · `scripts/pins-quotebox2/**` · ONE registration line in `scripts/smoke-test.mjs` (after the `pins-fixb5` line) + the removal of gate 18's one `LEGACY_G3` entry · the re-bases of other batches' pins that the change turns red (each named, after a look at the diff, the old claim kept, #1568) | everything else | § 4 | `/home/claude/scratch/a/` |
| 2 (a fix) | — | — | NOT BUILT: the cause is not proven (`docs/quotebox2-mechanism.md`) | | | |

Item 1 by the prompt: the mechanism could not be proven off the device, so NO fix; ONE developer-build log line.

## 3 · Interfaces (exact)
### 3a · `QuoteBox2Flags` (SpixiFlags.cs, one block appended after `SmallFixFlags`; the pattern of `SmallFixFlags`)
- `public const string SweepOnForgetKey = "flagSweepOnForget";` · `public static bool SweepOnForget` — absent = ON; a
  stored 0 acts only in dev mode (`S16PassRules.effectiveFlag(dev, v)`); read lazily, once per process; a store that
  throws = ON; the first read logs ONE line `[FLAGS] quotebox2 sweeponforget=<0|1>` (fixed words, 0|1 only).
- `internal static int read()` and `public static string flagsLine(int b)` as in `SmallFixFlags` (CSH calls them).

### 3b · The three sites (#1966 (3)) — each exactly ONE new statement, directly after the `SPeerLocalStores.forget(…)`
statement of that branch:
`if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();`
1. `SingleChatPage.xaml.cs` — `ixian:undorequest`, inside `if (requestRemoved) { … }` (near line 1076).
2. `ContactNewPage.xaml.cs` — the `pendingDeletion` re-add (near line 229).
3. `SpixiContentPage.cs` — the `pendingDeletion` heal in `sendContactRequestGuarded` (near line 7702).
(Use the type's namespace as the file needs it; if `SContacts` is not in scope, qualify it — say which.)

### 3c · The developer-build line of the reply match (inside `#if SPIXI_DEV_COEXIST` ONLY, R5)
- Pure class `ReplyMatchLog` in the same SpixiFlags.cs block, the WHOLE class inside `#if SPIXI_DEV_COEXIST`:
  - `public static int candidates(string? text, ReplyQuote.Index? index)` — the number of candidates the match could
    consider for this reply line: the sum of `index.byExcerpt[key].Count` over the SAME probe keys `ReplyQuote.tryMatch`
    uses (p = −1: the whole rest; p = 0 … min(rest.Length, MaxNameProbeChars) − 1 where `rest[p] == ':'` and
    `rest[p + 1] == ' '`: `rest[(p + 2)..]`), with no time or self filter; 0 for no shape / null index.
  - `public static string body(string? replyIdHex, bool found, int cand, int deep, int idx, bool viaLoad, bool uiThread)` →
    `reply match reply=<hex> found=<0|1> cand=<n> deep=<n> idx=<n> via=<load|live> ui=<0|1>`; `<hex>` = the id when it is
    1 … 64 chars of `[0-9a-f]`, else `-`; `cand`, `idx` < 0 → 0; `deep` < −1 → −1 (−1 = no cached deeper read).
- The call in `SingleChatPage.matchReply`: ONE `#if SPIXI_DEV_COEXIST` … `#endif` statement group that logs
  `Logging.info("[QB2] " + ReplyMatchLog.body(self, <matched>, ReplyMatchLog.candidates(message.message, idx),
  replyDeepCached(channel)?.Count ?? -1, idx.Count, index != null, MainThread.IsMainThread))` once per call, for BOTH
  outcomes (matched and the fallback box), never for a row that is not reply-shaped, inside the existing `try` (a throw
  of the line must not change the match). No message text, no name, no address in the line. With the symbol absent
  the method's statements are the base's (byte-for-byte after the `#if` group is cut).
- `found` = `ReplyQuote.tryMatch` returned true with a match.

## 4 · What builder-a returns
- The files it CHANGED (the lead copies back only these) and, per file, the code lines added (R1).
- CSH `QuoteBox2Tests.cs`: the switch (absent ON, a stored 0 off only in dev mode, a throwing store ON, the line text),
  `ReplyMatchLog.body` (grammar, hex sanitising, bounds), `ReplyMatchLog.candidates` over the Seed 57 plan
  (`SDevSeedPlan.quotePlan(SDevSeedPlan.QuoteChat)`, candidates built like `WalkTools2SeedTests`) AND the evidence table of
  `docs/quotebox2-mechanism.md` § 3: (E1) the whole chat as the read → A–D found, cand 1 each; (E2) the read without row
  515 (C's target) → C found=0 cand=0, A, B, D found; (E3) no read, the open's window of 51 rows → A, B not found;
  (E4) a SHORT read that keeps the OLDEST k rows (k = 500: rows 1 … 500, j 0 … 499) + the open's window of 51 → C AND B
AND A not found, D found; (E5) the read with row 515's
  time moved past the reply + 300 s → C found=0 cand=1. Run: `node scripts/run-csh.mjs` → `CSH pass=<n> fail=0`.
- Pins `scripts/pins-quotebox2/a-sweep.mjs` and `b-matchlog.mjs` (source pins: state their limits in the first comment,
  #1735; the house shape of `pins-fixb5/e-small-fixes.mjs`): a = each of the three sites holds the 3b statement exactly
  once, directly after its branch's forget; `QuoteBox2Flags.SweepOnForget` read only at those three sites; its key
  declared once and named nowhere else in `Spixi/**` / `src/**`; the three bodies with the line cut = their base bodies
  (SHA-256 over stripCode, whitespace collapsed, `git show ae7b8303:<file>`); gate 18 holds no `SpixiContentPage.cs`
  entry. b = matchReply's new statements all inside ONE `#if SPIXI_DEV_COEXIST` group; the group names `Logging.info`,
  `ReplyMatchLog.body`, `ReplyMatchLog.candidates` once each and no `message.message` except as the first argument of
  `candidates`, no address / name / text word; matchReply with the group cut = the base body; the `ReplyMatchLog` class
  wholly inside `#if SPIXI_DEV_COEXIST`.
- Per pin and per site: the command, the green line, ONE deliberate break each (a one-token mutation in a full copy,
  `node scripts/run-pins.mjs --root <copy> pins-quotebox2/<mod>`), the red line with the failing key.
- Every other batch's pin that turned red and its re-base (file, key, old → new, why), each red again on a one-token
  break.
- What it could not prove (⚠ C# UNCOMPILED: the four app files).

## 5 · Integration (the lead)
Copy back → C#-only, so no html pipeline; `build-shells --check`, `build-locales --check`, `cs-syntax-check` → grep the
smoke for the tokens of every edited line (L84) → the full smoke ONCE (nothing beside it, L153) + CSH → #46 → export.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
