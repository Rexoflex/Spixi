Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone, frozen at 097341a.
Read docs/handoff-2026-08-30.md and follow it.
★ Session A (L1 · L2 · L8) is COMMITTED and WALKED. Damir: "all seems to be good."

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 299 · shells 18 · smoke BASELINE OK 3496 / the 3 known (#136 · M5 · B3)
  · locales CLEAN 775 · cs-syntax 140+1 · Ixian-Core 097341a
⚠ Smoke takes ~10 min and my bridge shell has a 45-second limit — run it in the container.

Read in this order, then start:
  1. docs/handoff-2026-08-30.md              — what happened and what is owed
  2. docs/launch-worklist-2026-08-29.md      — THE QUEUE. L1/L2/L8 are marked built.
  3. DECISIONS.md #646 and #647              — why the adversarial loop is not optional
  4. docs/cdperf-2026-08-29-android.md       — the chat-info measurement (L10)
  5. docs/fatal-language-change-2026-08-29.md — the false fatal (L11)

★★ ITEM 0, BEFORE ANY BUILDING: run the #46 adversarial loop that is still owed over
#507–#511 — docs/opus-review-brief-507-511.md, no verdict appended, two batches deep.
Session A shipped without its loop, I asked, and it turned out to be seven MAJORs plus two
more inside the fixes. Do not repeat that. Independent read-only auditors with disjoint
scopes, then fixes, then a FRESH break-my-verdict reviewer over the fixes.

THIS SESSION IS SESSION B: L6 · L7 · L5 · L11 · L10.
  L6 · Account → Contacts: the rail jumps to Chats, the right pane opens a chat, and
       mobile flickers. ⚠ #294: MEASURE the flicker before assuming it shares a cause
       with the rail. Three symptoms, possibly three bugs.
  L7 · ✅ ALREADY RULED — REMOVE "Mark as read" from the chats row menu. No verb, no
       persistence, no receipts. Do not rebuild it.
  L5 · the launch sheets are light on a dark phone.
  L11 · the false "Fatal exception" on a language change.
  L10 · the bot room presents 140 ms late. ★ ENDS BY REMOVING the [CDPERF] probe.
★ ALSO REMOVE the temporary [RCPT] probe in StreamProcessor + SingleChatPage.getSelectedChannel().
★ AND FOLD the member-context check into cs-syntax-check — it PARSES, it does not COMPILE
  (#593), and a nested `private` member broke Damir's build this session.

Do NOT re-open: kick/ban stays bot-room only · delete-messages in private groups works ·
no Ixian-Core changes (CORE-1/2/3 are BE rows) · wallet-SEND redesign stays LAST ·
"Mark as read" is decided.
⚠ Owed by Damir, not you: L12, the bot-room half of kick/ban — no admin account on his
test set. Don't call #637 done until he walks it.

Interview him for anything unknown, don't assume. One command per code block, real paths,
no placeholders, no trailing comments. He has been right every time he pushed back.
