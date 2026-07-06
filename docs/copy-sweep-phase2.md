# Copy sweep — Phase 2 tail (2026-07-06)

Reviewed the consolidated `en-us` dictionary (607 keys) + the copy-morph label
swaps + multi-select copy. Overall the copy is strong: one consistent voice,
honest about what actions do, no dark patterns. Findings below.

## Applied (typographic consistency)

The whole dictionary uses the typographic apostrophe `’` (“doesn’t”, “can’t”,
“What’s inside”). Two keys used the ASCII `'` — fixed at source
(`wallet-shell.js` fallbacks) so `extract-strings` regenerates them cleanly:

| Key | Before | After |
|---|---|---|
| `senderAddress` | `Sender's address` | `Sender’s address` |
| `recipientAddress` | `Recipient's address` | `Recipient’s address` |

(Generated `en-us.js`/`.json` were updated to match; the demo `strings.iife.js`
picks it up on Damir's `build-strings-iife` run.)

## Copy-morph honesty — CLEAN

Every `setSuccess` label swap accurately describes the completed action:
Installed · Request sent · Account created · Restored · Unlocked · Password
changed · Copied · Sent · Backed up · Tipped. No button morphs into a claim it
didn't deliver. The width-morph (#29) only swaps the label; no state lies.

## Multi-select media/card rows — deferred by design, VERIFIED intentional

`chat-select.js` gates selection on `textOf(row)` — media/card rows are skipped
because the feature is **copy-only** (#139) and an image has no text to copy.
This is honest, not a gap. Extending select-mode to media (for forward/delete)
is a v2 *feature*, not a copy fix — leave deferred.

## Honesty flags — RESOLVED (Damir, 2026-07-06): no copy changes

1. **`handshakeEstablishing` — “Establishing a quantum-secure handshake…”** →
   **KEEP.** Ixian's crypto genuinely is post-quantum, so this and the
   secure-notice “post-quantum encryption” copy are both accurate + consistent.

2. **`slide1Copy` — “No servers, no middlemen.”** → **KEEP as-is.** Intended
   brand/decentralization framing.

3. **“your PIN” vs “PIN or biometrics.”** → **LEAVE for now, revisit later.**
   The biometric/PIN distinction on destructive deletes isn't wired yet — it
   comes from the security-level tiers and won't be visible in the launch
   version (added later). When that feature lands, align `deleteAccountBody` /
   `deleteWalletBody` (“your PIN”) with `paymentAuthSub` (“PIN or biometrics”).
   Deferred follow-up, not a launch blocker.
