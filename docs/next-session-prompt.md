Session AE — the last FE fix round before the office: the freeze · the ⊕ sheet on Android · the Telegram-style fade behind the composer · the bot-room Delete gate · AD's re-walk rows (DECISIONS #935–#937)

0 · Before anything else (#215)
Read `docs/handoff-2026-09-23c.md`, then `docs/handoff-2026-09-23b.md` §2 and §5b (Session AD's own
lessons), then DECISIONS #928–#937. Check `device_bash`; use `git --no-optional-locks status` (never
plain `git status` on the VM). Verify HEAD is `a664d59f` or later and whether Damir's post-walk docs
commit has landed (if `git status` shows docs uncommitted, that commit is item 0). Run the four
`--check` gates on the real tree. The FULL suite runs in the container on a SNAPSHOT copy with the
Ixian-Core sibling — BEFORE (expect 4848 / the 2 KNOWN) and AFTER; predicted is not an acceptable last
line. Reviews run on Opus — pin the model explicitly. Nothing here compiles C#: every C# change gets an
F5 row; a build error is this session's bug. If another session is running on the folder, land NEW
files only (handoff §5).

1 · THE FREEZE first — a diagnosis, not a fix (#935; handoff §1.1)
Windows Debug froze after remove-contact → group-participant prompt → leave-group WITH "delete media".
ASK DAMIR for (a) the `ixian.log` tail — a `leavegroup: media purge deleted n of m` line means the purge
finished; none means it never returned — and (b) the VS Break All UI-thread stack. NO CODE BEFORE THE
STACK. Candidates in `HomePage.onLeaveGroupFor` in run order: the synchronous `collectReceivedMedia`
listing on the UI thread · `SContacts.leaveGroup`'s fan-out under Core's locks · `popPageAsync` on the
removed pane. If the listing: list → op → purge as ONE background job, the op marshalled back. Full loop;
walk row: the same sequence on a contact with a long history.

2 · The ⊕ attach sheet opens PARTIALLY on Android (Damir's ask; handoff §1.2)
Symptom: the tile row cut at the viewport bottom, the second row hidden, until the keyboard has been
opened once. INSTRUMENT FIRST: at sheet open log `--kb-inset`, `--safe-top`, `innerHeight`; suspect the
#918 cap (`max-height: calc(100% - --safe-top - --kb-inset)` + `bottom: var(--kb-inset)`,
`overlay.css:73-77`) reading a STALE or uninitialised `--kb-inset` before the first keyboard round
(#770 class). Fix at the source of the value, not with a bigger cap. Shell-only. Walk: fresh install →
chat → ⊕ before any keyboard → both rows visible; then a keyboard round → still both rows.

3 · ★ Messages fade BEHIND the composer, the Telegram way (Damir's ask; handoff §1.3)
Reference: `docs/sheets/session-ae/reference-telegram-composer-fade-{light,dark}.png`. His words: "the
opacity drops at the SAME LEVEL as the composer, not above the composer." READ FIRST what was rejected
and why — #889/#892 (the glass BAND: "ugly, a rectangle and cut off") and #893 (a fade ABOVE the pill:
declined, AA.7) — this is neither. Build: a `mask-image` on the message scroller whose stops are DERIVED
from `--composer-h` (+ `--kb-inset` when the keyboard is up): fully opaque down to the composer's top
edge, dissolving to ~0 across the composer's own height; the composer background at partial ALPHA (a
tint, NOT a blur) so the dissolving bubble is faintly visible through it. Constraints: `#messages` pads
by `--composer-h`, so the effect exists only when scrolled up — the render MUST assert a bubble is under
the band (#811; #893's nine-message chat proved nothing) · the sticky day pill stays crisp and unmasked ·
the band follows the keyboard · desktop too · both themes · `chat.html` + `composer.css` only, no C#.
RENDER FIRST on the built shell through the wire (a long conversation scrolled mid-way, NOW/AFTER, light
+ dark, phone + desktop) → `docs/sheets/session-ae/` → Damir picks (and can say "no" — #893 did) → only
then the pins: mask stops derived from the composer token · composer alpha < 1 · pill unmasked ·
`CHAT_KB_CEIL` re-based with its delta.

4 · #934 (b) the bot-room Delete gate (handoff §1.4)
In a bot room Delete shows on OWN messages for everyone and on ALL messages for admins; never on another
member's message when not admin (`mode.isBot`, `mode.admin` from `setChatMode`; `message-menu.js:132`
adds Delete unconditionally). The select-mode bulk delete under the same predicate. Shell-only; a
derived pin (the predicate read from the shell, not restated); walk rows as admin and as non-admin.

5 · AD.13 a second tip refused + the re-walk rows (handoff §1.5–1.7)
AD.13: ASK which device could not tip and the alert text before any code — the shell has no gate, the
refusal is send-side (C# `contextAction:tip` → native confirm → wallet). AD.19 (C17, needs a
legacy-state contact — remind Damir) · AD.20 (A4's three reasons) · AD.23 (the shared-file purge case):
rows on this round's sheet. AD.14 is CORE-12 (group typing fan-out), NOT ours — leave it.

6 · Records at the end
DECISIONS rows (the freeze diagnosis · the ⊕ fix · the fade pick · the gate · AD.13's answer) · the
be-cutover ledger where a row moved · `docs/f5-checklist-session-ae.md` (the paste + one row per C#
file) · `docs/walk-artifact-session-ae.html` (this round + AD.19/AD.20/AD.23) · `docs/commit-message-
session-ae.txt` · a new handoff + this prompt rewritten for the OFFICE DAY (install the two profiles →
wipe obj/bin → iPhone build → `docs/walk-artifact-ios-office.html`, iO.7 the mute test → optional route B)
· consumed → `docs/archive/`: `handoff-2026-09-23b.md`, `f5-checklist-session-ad.md`,
`walk-artifact-session-ad.html`, `commit-message-session-ad.txt`.

7 · NOT this session
Batch 4's medium rows (CI6 · C22 · A8 · FC1 · C12 · NT1(b) · PV1) · L6 · the memory kill · the translator
pass · the strip/endgame (#933, after the office) · L8 / L2 (OUT) · CORE-10 / CORE-12 (his) · the
later-version items (#934 (a) · #936 dapp file UX · C14 · C20).

Rules #215 · #294 · #660 · #663 · #771 · #798 · #811 · #882 ③ · #895 · #906 · #926 · #927 · #929 ·
★ #935: a failed walk row is a question first (which device, what text, what stack), a fix second ·
★ #892/#893: a rejected dial is a boundary, not a veto — read what was rejected and why before building
  the neighbour; render before you pin, and let Damir say no.
