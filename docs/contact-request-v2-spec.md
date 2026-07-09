# Contact-request UX v2 — enter-chat + security-notice accept/decline (spec)

**Status:** 🟡 captured for a future session (Damir 2026-07-09). CH2 v1 (request cards in
the chats list + Accept/Decline + list handshake, DECISIONS #218/#219) is LANDED and stays
as the fallback. v2 is a **design pivot** for how a pending incoming request is handled.

## The vision (Damir)

Let the user **enter** a pending request's conversation. Inside the chat, the **security
notice** (the `c-sysnotice` / secure-chat notice, #91) does double duty for a not-yet-accepted
contact:

1. **Pending (not accepted):** the notice shows the **request itself** — the requester's
   **full, copyable address** (this is a "reveal on intent" surface per the #211 canon, so full
   address is allowed here, unlike list rows) + **Accept / Decline** actions inline in the notice.
   The composer stays disabled until accepted (#86 non-contact rule).
2. **Establishing (accepting):** on Accept, the notice **shrinks to a short "Establishing a
   quantum-secure handshake…"** state — the SAME wording as the list handshake (chats-shell
   `handshakeEstablishing`), shown **here in the chat**, for **≥3 seconds** so it reads as real
   and the user can register it. Composer still disabled.
3. **Connected:** once the handshake completes, the notice **expands to the normal secure-chat
   notice** ("Messages are secured…", the standard #91 copy) and the composer enables.

So the notice is a small state machine: **request → establishing (≥3s) → secured**.

## What it touches (scope)

- **Chat shell (`src/shells/chat.html`) + `SingleChatPage`:** allow entering a pending-request
  chat. Today tapping a request card runs Accept/Decline in the list; v2 needs a "open request"
  path (the request card tap → `ixian:chat:<addr>`), and the chat must know it's a pending request
  (a C# push, e.g. `setContactRequest(address)` / a flag on chat-open) so it renders the
  request-notice instead of the normal one. Accept/Decline from the notice reuse the **existing**
  `ixian:acceptRequest`/`declineRequest` verbs (CH2b) — no new verbs.
- **Secure-notice component (`c-sysnotice`, `createSystemNotice`):** add the three states
  (request-with-actions+copyable-address · establishing · secured). The copyable address = the
  #194 click-to-copy pattern; Accept/Decline = `createButton`.
- **Handshake-complete signal:** v1 has NO bridge handshake-complete signal (the list handshake is
  replaced by the C# re-flush). v2's "establishing → secured" transition needs either (a) the same
  ≥3s FE timer (simple, no C#), or (b) a real C# handshake-complete push (§9, cleaner). Start with
  the **≥3s FE timer** (zero-C#); a real signal is a later refinement.
- **The ≥3s hold** (Damir): applies to the establishing state in BOTH the list (v1) and the notice
  (v2). Implement once in v2 (the notice) since that becomes the primary surface.

## Decisions to make when building v2

1. **Do request cards stay in the list, or do requests become enter-able chat rows?** Likely BOTH:
   keep the card's Accept/Decline for the quick path, and make tapping the card **enter** the chat
   (where the fuller notice + copyable address live). Confirm with Damir.
2. **How does the chat learn it's a pending request?** Cleanest = a C# push on chat-open
   (`setContactRequest`/a flag), since `SingleChatPage` knows `friend.state`/`!friend.approved`.
   (The shell can't infer it — it only gets messages.) One tiny co-change.
3. **Handshake-complete = FE 3s timer vs C# signal.** Ship the timer first.
4. Full-address-in-notice is a **reveal-on-intent** surface (#211) — allowed (the user entered the
   chat); the LIST card stays truncated (already fixed, DECISIONS #219 amend).

## Not in v2 (stays v1)
The list request cards + Accept/Decline + the CH2a chip count/hide all stay. v2 is additive: it
enriches the in-chat experience for a pending request; it does not remove the list feed.
