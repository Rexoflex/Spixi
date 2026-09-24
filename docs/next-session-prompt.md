THE OFFICE FIX ROUND — overnight, UNATTENDED (Damir is away; do not wait for answers).

0 · CLOUD-ONLY run (#398 precedent) — the Mac is CLOSED, there is NO device bridge
Clone both repos into the container (anonymous HTTPS works):
  git clone -b redesign/frontend https://github.com/Rexoflex/Spixi.git Spixi
  git clone https://github.com/ixian-platform/Ixian-Core.git Ixian-Core && (cd Ixian-Core && git checkout 097341a)
(Ixian-Core as a SIBLING of Spixi.) Confirm `git log --oneline -3` shows the commit that added THIS prompt
(on top of 796616cf). Read `docs/walk-verdict-ios-office-2026-09-24.md` FIRST (the list below comes from it),
then DECISIONS #972/#973 and `docs/handoff-2026-09-24c.md` §5. `npm i --no-save jsdom eslint globals` for the
suite. Nobody can answer a question tonight: make the reasonable call, write it down as a 🟡 dial in
DECISIONS, and go on. If a step needs a device or Damir, do the preparation, record what is needed, skip on.
DELIVERY: you cannot push. Commit locally in the clone (one commit per logical batch, attribution lines),
then `git format-patch 796616cf..HEAD -o /mnt/user-data/outputs/office-fix-patches/` AND a tarball of every
changed file, and send both with SendUserFile. Damir applies them tomorrow with `git am`.

1 · What you CANNOT do tonight — plan for it
No iPhone, no Mac app run, no C# compile (the device shell is a Linux VM; Damir compiles in the morning).
So every C# change is UNCOMPILED: keep it small, run `cs-syntax-check`, and list it in the morning checklist.
The iO.5 / iO.11 / reply-to device facts stay OWED — build the instrument, not a guessed fix (#294).

2 · The list, in this order
 1. [SPUSH] trace → the system log. `SpixiPushGate.trace` uses Console.WriteLine, invisible on the device.
    Switch to NSLog/os_log (fixed vocabulary, never the address). Pin it.
 2. iO.5 grouping. The thread id is set in `apply()` and lost downstream (OneSignal suspect). Wrap the
    contentHandler passed to OneSignal so the thread id is re-applied on the final content; add one trace line
    that prints whether the content arriving at the final handler still carried the thread. Pin it.
 3. iO.11 (a muted contact's GROUP post arrives, with his name → verdict Show, `fa` not in store.muted).
    Read-only first: how does the group push set `fa` (sender vs group vs relay/creator), and what key does
    `SPushPrefsShare.build()` write. Extend the trace to say which set `fa` hit (muted/nicks/none) — never the
    address. Fix only if the code proves the cause; otherwise the trace is the deliverable.
 4. N1 — the keyboard lifts the composer but NOT the message log on iOS (the ⊕ attach sheet DOES lift it;
    in a new chat the keyboard covers the secure notice). Find why the two paths differ (iOS-29/iOS-53
    lineage: --kb-inset, the native lever, #303). Render before/after in the harness; pin the property.
 5. N2 — group creation, name field: the keyboard cannot be dismissed, and Return submits. Return = blur
    only; add a dismiss path. Render + pin.
 6. #970 — Damir chose an APP-SIDE ignore list: a declined request's address is ignored when it comes back,
    with an un-block path (Account or the contact directory — your call, 🟡 dial). Check the security gate
    doc before adding any spixi.* key or verb (docs/security-handover-gate.md); prefer a C# pref.
 7. Mac notes from iO.29: M1 empty received bubble after accepting a contact request (find the message type
    that renders empty; check whether it is Catalyst-only in code) · M2 left-pane divider not resizable on
    Catalyst (D1 is WinUI-wired) · M4 no Dock badge / Dock bounce on a new message on Catalyst.
    M3 (Dock logo small) = asset note only, do not redraw.
 8. The colon: Damir chose ": " in every locale — close the #969 dial in the record; no code if already so.
 9. Reply-to: prepare the on-device check (what to log, where) for Damir; do not build the feature.

3 · The loop (#46, #943)
After the build: renders on the BUILT shells, pins, a mutation per pin, then a fresh break-my-verdict
reviewer ON OPUS over the batch; fix; repeat until a round finds nothing. Run the FULL suite (container
snapshot with the Core sibling @ 097341a) before calling it done; compare the delta, not the absolute (#895).
Pipeline order: extract-strings → build-locales → build-strings-iife → build-demo-bundle → build-shells →
smoke + lint + pseudo + the --check gates.

4 · Close
DECISIONS rows (#974+) for every change and dial · a morning checklist `docs/f5-checklist-office-fix.md`
(Damir: the iPhone build commands from the walk verdict, the Mac run, what to read in Console.app with the
new trace) · a walk sheet for the re-test rows (iO.5, iO.11, N1, N2, #970, M1, M2, M4) · a handoff
`docs/handoff-2026-09-25.md` · the patch set + tarball (section 0). Do NOT push — Damir reviews and applies with `git am`.

NOT tonight: the code review/sweep · L6 · the freeze · the strip · batch 4 · the memory kill · the
translator pass · CORE-9…13 · server-side mute (BE row only).

Rules #215 · #294 · #660 · #663 · #771 · #772 · #798 · #811 · #895 · #906 · #935 · #943 · #953/#959.
Chat replies in ASD-STE100 (#931).
