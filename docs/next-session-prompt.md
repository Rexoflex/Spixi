X.8 KEYBOARD FIX + MENU FADE-OUT, then THE OFFICE (Mac + iPhone).

0 · Read `docs/handoff-2026-09-29b.md` FIRST (§9 = the latest state, §2 = the office plan), then DECISIONS #1057–#1070.
Check: PC HEAD = d3bf6338 or later (#1057–#1070; push = Damir); `node scripts/smoke-test.mjs` = BASELINE OK 4985 /
the 2 KNOWN (with the Ixian-Core sibling). #1065 (keyboard stays up) and #1067 (menu grows in) are the base.

1 · X.8 on ANDROID (Damir): keyboard up → long-press a message → the keyboard CLOSES and the menu opens → the menu
closes → the keyboard COMES BACK. The field loses focus at the long-press on the BUBBLE; #1065 only guards the MENU
(no focus move on open, mousedown prevented on menu/scrim) and then restores focus. Verify first (#294): find what
blurs the textarea during the press — the bubble's touch/pointer handlers (pressable / long-press arming), the
native long-press text selection or `contextmenu`, or a focus call in the menu-open path. Add a `[KBDIAG]` log
(document.activeElement + event type at touchstart/pointerdown/contextmenu/blur) if the source does not say.
Then fix at the source (keep the field focused through the press), not by re-focusing afterwards. Windows has no
soft keyboard — the check is Android; iPhone at the office.

2 · Same files (Damir): the long-press menu must FADE OUT the way it grows in (#1067 mirror on close: scale 1 → 0.92
+ fade on the same curve, remove after transitionend with a timeout belt; reduced motion = instant). Both the message
menu and the chats-row menu (`anchorSheetToRow`). Render/measure open AND close.

3 · Opus #46 loop over items 1–2 AND #1067 + #1068 (never reviewed) → FULL pipeline (bundle BEFORE shells) → smoke
in the container twin → land on the PC → short walk sheet (Artifact). X.3 passed after warm-up — do not touch it.
X.10 dial (grow 0.2 → 0.3 s) only if Damir asks.

3b · Desktop polish round (Damir's images attached: the huddle card + the mini-apps screen):
 - SESSION PANE (Damir's name): a mini-app opens in the detail pane on desktop (today: PushAsync full page at SingleChatPage:1978, HomePage:5132/5248).
   Use the pushPageLoaded column path; expand-to-full-window and back via a NATIVE/trusted-frame control, never
   inside the mini-app page. Mobile unchanged. Mini-app WebView stays isolated (security-handover-gate: Windows
   storage partition still open).
 - Background for the two items below: `docs/agent-hub-note.md` (idea only, v1 first).
 - MANIFEST PERMISSIONS (design with the session pane; agent mode will reuse both): define the declared-permission fields
   a mini-app manifest carries (e.g. sign in as you · sign transactions · local storage · multi-user · device
   access · message scopes). Shape them so AI-agent scopes ("Can message: drivers", "Reads: telemetry",
   "Cannot pay") fit the same model later. A permission is shown ONLY if it is declared in the manifest AND
   enforced by C#; a mini-app never signs (native confirm, C# signs). Check what the manifest/appinfo parser
   reads today first (#215); new fields = spec + DECISIONS row + BE review before any enforcement code.
 - In-call strip restyle (1:1) after the huddle image: CallPage #270 strip keeps its mechanism; lock always wins (#272).
   Mute + speaker = NEW C# (VoIPManager has only setVolume) — build per platform or leave the buttons out; no dead buttons.
 - Incoming call screen, premium: Accept · Decline · silence ring (local). "Decline with message" = small new verb.
 - Mini-apps tab, desktop only, after the image: installed grid + hero + category filters + Add mini app + SDK link.
   Capability chips ONLY from real manifest data; no "Concept" catalog cards (A2 parked).
 Spec first → render → Opus #46 loop → land.

4 · The office walk (handoff §2): Mac/iPhone rows of `docs/walk-artifact-overnight-1028.html`, W.15 of
`docs/walk-artifact-1050.html`, X.1 · X.7 · X.8 · X.9 · X.10 of `docs/walk-artifact-1058.html`, and items 1–2 on the iPhone.

5 · Fix round from the office findings → Opus #46 loop → deliver. Commit + push = Damir. Chat replies in ASD-STE100 (#931).
