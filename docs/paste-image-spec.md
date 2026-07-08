# Paste-to-send screenshot / image (desktop) — spec

**Status:** 🟡 spec only — DEFERRED to the full Desktop pass (Damir, 2026-07-09: "we will add it once we tackle the full Desktop, not immediately"). Nothing built yet.

**Goal.** On desktop, let the user paste an image from the clipboard (e.g. a Win+Shift+S snip, or any copied image) directly into the chat composer, preview it as a thumbnail, and send it. The counterpart receives it through the existing file-transfer path (accept → download → bubble). Feasible and contained — not architectural.

## 1. Split of work

| Half | Where | C# needed? |
|---|---|---|
| Capture the pasted image + compress + show a composer thumbnail | FE (`chat.html` composer + a small component) | **No** |
| Hand the bytes to C# → temp file → `TransferManager` send | ONE new §8 verb `ixian:attachData` | **Yes (small)** |
| Render the received image inline (vs a generic file bubble) | the media flag we already need | **Yes** — already logged (A8 / #81 / #82) |

The receive side is already done: an incoming image arrives as a normal file transfer and renders through the file bubble wired in #178 (offer → progress → complete → `ixian:openfile:<fileid>`). No new receive work — it just wants the media flag to show inline instead of as a file row.

## 2. FE — capture (zero-C#)

1. **Paste event** on the composer (`textarea`/contenteditable): read `e.clipboardData.items`, find the first `item.type.startsWith('image/')`, call `item.getAsFile()` → a `Blob`. WebView2 (WinUI desktop runtime) supports `ClipboardEvent.clipboardData` with image items. Guard: if no image item, let the normal text paste proceed.
2. **Compress + downscale client-side** before anything touches the bridge: draw the blob to an offscreen `<canvas>` clamped to a max dimension (e.g. 1600px longest side), then `canvas.toBlob('image/webp', ~0.7)` (JPEG fallback where WebP encode is unavailable). A full-screen PNG snip (multi-MB) drops to tens of KB — this is what keeps the bridge string payload and the P2P transfer sane. **This is the whole "compression protocol"** — no exotic wire format; downscale + re-encode, the standard messenger approach. (Blurred placeholder while loading = BlurHash/ThumbHash, already logged #81/#272 — separate, optional.)
3. **Preview in the composer** via the existing context strip (`setComposerContext`, #79 — built for reply quotes): show the thumbnail (object URL) + an ✕ to discard + optionally the estimated send size. Multiple pastes = replace or queue (v1: single pending attachment).
4. **Send** fires the §8 verb below with the compressed bytes, then clears the pending attachment and revokes the object URL.

Desktop-gate the whole affordance behind a capability (`bridge.cap('pasteAttach')` or `SPIXI_ENV` desktop flag) so mobile shells are unaffected.

## 3. BE — the one new verb (§8)

**`ixian:attachData:<mime>:<base64>`** (or, to keep the arg small and avoid a huge `location.href`, a paired push: FE calls a no-arg `ixian:attachBegin`, C# calls back a JS getter, OR chunk — see §5). C# decodes the base64, writes a temp file (suggested name e.g. `paste-<ts>.webp`), and feeds it to the **existing `TransferManager`** send exactly like a picked file. Nothing else in the transfer path changes; the counterpart's accept/download/complete flow is untouched.

- Reuse the current send semantics of `ixian:sendfile` (attach sheet → native picker, `chat.html:1144`); this verb is the "I already have the bytes, skip the picker" variant.
- Optionally return the assigned `fileid` so the FE can immediately show the outgoing progress bubble (we already render sender-side progress, #193/#273).

## 4. Rendering the received image

Until the **media flag** on `addFile` lands (A8 / be-cutover; standard from #81, IP/auto-load posture #82), a pasted image arrives as a **generic file bubble** (functional — download + open works). With the flag, the same bytes render as an **inline image tile** (the media tile + full-screen viewer already exist, #201/#202). No new component work — it reuses what's built; it only needs the flag to disambiguate media from file. This is the *same* flag GIFs/images already need, so it is **not** new BE scope beyond what's logged.

## 5. Watch-items / can-of-worms check

- **Payload size over the bridge.** A string arg can choke on multi-MB base64. Mitigations, in order of preference: (a) compress hard client-side (§2.2) — usually enough; (b) if still large, C# reads the WebView clipboard directly on an `ixian:attachClipboard` no-arg verb (Windows clipboard API) instead of shuttling base64 — cleaner on desktop, but couples to the OS clipboard timing; (c) chunk the base64. **Recommendation: (a) + a size cap; fall back to (b) for desktop if needed.**
- **P2P both-online.** It's a file transfer, so the usual "keep Spixi open / peer must be online" caveat applies (same as any attachment; the "Keep Spixi open" hint is already wired, #274).
- **Security.** Bytes originate in the WebView and are user-initiated (a paste) — no keys/credentials involved, so it's outside the money/signing fence. C# owns writing the temp file + cleanup. Validate the decoded MIME server-side; cap the size.
- **Format support.** WebP encode is available in WebView2; JPEG is the universal fallback. PNG kept only for tiny images (screenshots of text compress better as PNG, but size-cap decides).

## 6. Scope decision

- **v1 (when scheduled):** single pending pasted image, client-compressed to WebP/JPEG, sent via `ixian:attachData`, received as a file bubble; inline rendering rides the existing media flag.
- **Deferred to the full Desktop pass** per Damir — build alongside the desktop attach/composer polish, not as a standalone batch now.
- **Later/optional:** paste-queue of multiple images, drag-drop of image files, ThumbHash placeholder, paste of non-image files.

## Refs
- Attach sheet + current file/media verbs: `src/shells/chat.html:1129-1151` (`ixian:sendfile`, `ixian:sendmedia` gated on `cap('media')`).
- File bubble receive/render + open: `chat.html:750-766` (`ixian:openfile:<fileid>`), wired #178.
- Composer context strip for the thumbnail: `setComposerContext` (#79).
- Media flag (inline image vs file): be-cutover A8 · standard #81 · auto-load/IP posture #82.
- Sender-side transfer progress already rendered: #193 / §9.5 #273.
