# Session 4 · #46 round 1 — findings and fix assignment (base 9f4164d6)

Readers: A (C#, Opus) 0 MAJOR / 5 MINOR / 6 NIT · B (shells, Opus) 1 MAJOR / 5 MINOR / 4 NIT + motion lens 3 MINOR / 2 NIT · C (pins, Opus, 20 mutations) 4 MAJOR / 9 MINOR / 4 NIT survivors.
Verification (main session): B-1 reproduced by the reader in Chromium on the built shell; M2 checked: `TransferManager.cs:707` is the only `fm.completed = true` for a sent file; C-c3/c4/c7/c9 are survivors by construction (source pins read the callee, not the call site). All findings accepted unless marked.

| ID | Sev | Finding (short) | Owner |
|---|---|---|---|
| B-1 | MAJOR | a preview that fails to decode makes the photo un-openable (failed → media retry loop; CTA "Open file" lies) — fall back to the file action, drop the bad thumb | CHAT |
| C-c4 | MAJOR | `enqueueThumb` without `Task.Run(drainThumbs)` survives (pin matches the copy in `finally`) | CHAT |
| C-c3 | MAJOR | `updateFile` without `thumbAfterTransfer(uid)` survives | CHAT |
| C-c9 | MAJOR | SChatPrefs setter key unpinned (a wrong key = a dead switch) | CHAT |
| C-c7 | MAJOR | non-batch `enqueueThumb` in `noteThumbCandidate` unpinned | CHAT |
| A-M1 | MINOR | a Privacy change does not reach a chat overlay alive under Account (no OnAppearing) — push the change to live chat pages | CHAT (+ the one SettingsPage line) |
| A-M2 | MINOR | a SENT photo gets no preview until the peer finishes (`completed` set only on `fileFullyReceived`) — mine + local path is enough | CHAT |
| A-M3 | MINOR | thumb cache cleared at 64 → re-decode each open (gate text "once per process" false); no cancel on close; 40 MB cap vs G-6b 20 MB (#1133 text wrong) | CHAT |
| A-M4 / B-5 | MINOR | gate doc rows missing: new verb `ixian:photoPreviews`, the settings `setPhotoPreviews` push, widened `coverpainted` + `apply:` on hand-off, the type-only store log lines, lever 3 second resident WebView, lever 1 wakes F1 on every Android page | CHAT (gate doc) |
| A-M5 | MINOR | desktop re-warm puts a hidden WebView over the live chat — walk rows (input, scroll, select, focus) | main (walk sheet) |
| B-2 | MINOR | chat shell defaults previews ON — an older exe shows picture-less tiles; default OFF until `setPhotoPreviews` | CHAT |
| B-3 | MINOR | a re-render ends the 3 s jump highlight early; re-apply from shell state (also N-4: a second jump restarts it) | CHAT |
| B-4 | MINOR | wallet chips switch at clear, rows at commit — sync the chips at commit | NAV |
| B-6 | MINOR | tiles resize + flash blank when a preview lands — keep the face until the img is decoded/faded; size from the JPEG when known | CHAT |
| L-1 | MINOR | 3 s / 1600 / 100 literals — a `--duration-highlight` token read by JS | CHAT |
| L-2 | MINOR | the highlight's exit fade ~900 ms (> any open) — fade out within `--duration-300` | CHAT |
| L-3 | MINOR | Account tab close now waits for coverpainted (≤ 400 ms backstop) — walk row with the worst case | main (walk sheet) |
| C-j1 | MINOR | wallet net re-arm per row unpinned (rows spaced) | NAV |
| C-j2 | MINOR | the 2nd rAF before coverpainted unpinned (count frames) | NAV |
| C-j9 · j12 · j13 · j19 · j20 · j10 | MINOR | stored preview on complete · offer tile never shows a picture after a re-flush · loading/failed tap = one action · failed face · overlay hidden on file tiles · FILE_THUMB_KEEP eviction — all unpinned | CHAT |
| C-cs2 | MINOR | no fence that the new `[P1]` lines concatenate only fixed words / integers | CS |
| A-N1 | NIT | `thumbsSent` doc race — the doc number in the key | CHAT |
| A-N2 · N3 | NIT | `cancelTakenWarmingSpare` clears `activePreload` only via the posted cancel; a cancel during the claim loses the tap (no cold retry) | CS |
| A-N4 | NIT | `thumbAfterTransfer` uses `selectedChannel` — use the transfer's channel | CHAT |
| A-N5 | NIT | wallet latch can be set by an old-document burst — a document generation | CS |
| A-N6 | NIT | dead re-check comment overstated | CS |
| B-N1 · N2 · N3 | NIT | SENT tile ring says "Downloading" · dead `failed` retry face (see B-1) · thumb cache bound loose | CHAT |
| C-csh1 · csh2 · cs1 | NIT | csh tests do not prove their claims (separator, count term); re-warm delay has no upper bound | CS |
