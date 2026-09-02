# URL previews (OG image / title) — the decision memo

**Status: DECISION OWED (Damir). Nothing is built. Session H, 2026-08-31.**
Queue item ④ (prompt-session-h §④); consolidates be-cutover **C14** and the #82 rule so the
call can be made from one page.

## The one fact everything follows from

A preview needs SOMEONE to fetch the linked page. Whoever fetches it reveals their IP
address (and a fetch timestamp) to every site that gets linked in a chat. Spixi is P2P —
there is no server in the middle to absorb that. This is the same rule that gates remote
media (#82): the READER's device must not contact a sender-chosen host without consent.

A second, harder fact: the receiver cannot even DISCOVER the og: tags client-side.
Reading cross-origin HTML from the WebView is CORS-blocked (#190). So there is no
FE-only preview, gated or not — every option below needs C# and/or protocol work.

## The options

**(a) Sender-composed preview — RECOMMENDED (Signal's model).**
The sender's device fetches the page at COMPOSE time (the sender chose the link; they
are navigating there anyway, so their IP was already shown to that host), extracts
title / domain / a small thumbnail, and embeds the bytes in the message payload. The
receiver renders the card with ZERO network fetch.
- Privacy: clean. The reader never contacts the linked host.
- Cost: C# compose-side unfurl + payload carriage (app-layer message data; confirm
  Ixian-Core message-size headroom for a ~10–20 KB thumb) + `addMessage` push args.
  Protocol addition → BE work, human BE review first (#232 gate — security-flagged).
- FE: the card is ALREADY BUILT and gated (`c-bubble__linkpreview`, message-bubble.js
  `linkPreview` param — title / domain / 48px thumb). Zero FE work at switch-on.
- Spoof note: preview content is SENDER-controlled. The card must keep the true domain
  prominent, and the confirm modal keeps showing the real URL (shipped, #231c).

**(b) Sender sends title/domain + the og:image URL; the receiver fetches the image.**
Lighter payload, but the receiver's device fetches from a sender-chosen host at render
= the exact #82 leak, on every preview. Not a NEW leak class — remote GIF/image tiles
already client-fetch under the default-ON `spixi.media.autoload` pref — so (b) could
ride the SAME pref as an interim IF the standing #82 posture is re-blessed for it.
Still weaker than (a): attacker-chosen image host + an image-decoder surface in the
chat WebView (contained by the ★ #221 isolation, but real).

**(c) An unfurl proxy service — REJECTED.** A metadata-seeing server contradicts the
P2P model; it would see every link every user previews.

**(d) None (status quo).** Links stay text: linkify + middle-truncation + the confirm
modal with the true target (#231c). Zero cost, zero leak, reads plainer than TG/Signal.

## Recommendation

(a), at the BE cutover, behind the #232 human-BE review. (d) until then. (b) only if
Damir explicitly re-blesses the #82 posture for previews — and even then as an interim
labeled as such. Whatever is picked: never fetch on receipt, only on the sender's side
or behind the reader's explicit media consent.

## What a "yes" to (a) unlocks, for scoping

One §8 payload field, one compose-time unfurl (with a size cap + timeout + http(s)-only
+ no redirects to private ranges — the unfurler is itself an SSRF surface, list it in
the BE work order), one push arg. The FE switch-on is a one-line gate flip.
