# BATCH SPEC — THE PRE-LAUNCH SECURITY CLOSE (proposed, 2026-09-04)

**Status: PROPOSED — not started, not approved.** Written for the lead to review before any
code moves. Sized for one session after the Session L commit lands.

## Why this batch exists

`docs/security-handover-gate.md` carries a section headed **"Ours — MUST be fixed before
handover"**. Three of its rows are still OPEN. A fourth security row (`L8`, the wallet password)
sits in `docs/be-cutover-brief.md` under a heading that says *"nothing here blocks the
frontend"* — which is true of that brief as a whole and **not** true of that row.

**Every row below is fixable in this repo. None needs an Ixian-Core change and none needs the BE
engineer.** That was the open question; it has been checked against the sibling clone at
`097341a`, not assumed.

## ⚠ First finding: the BE cutover brief has STALE ROWS

Three rows read as open bugs and are already fixed. They cost a wrong verbal brief on
2026-09-04 before the code was read:

| Row | Brief says | Tree says |
|---|---|---|
| **L2** | create/unlock parse the password differently → silent wallet lockout | **FIXED (#334).** `LaunchPage.xaml.cs:260-263` slices on the FIRST `:` and takes the raw remainder, matching `ixian:proceed:`/`ixian:restore:`. A ⚠ GUARDRAIL above it forbids "harmonizing" the `UrlDecode` — existing wallets were encrypted under today's decode, so changing it is itself a lockout vector. |
| **L1** | create-failure pushes nothing → the button wedges in its loading morph | **FIXED (#334).** The generate thread body is fenced; `removeLoadingOverlay` fires on the failure paths and wake locks release in a `finally`. |
| **C9** | `friend.bot \|\|` in the tip guard blocks bot tips | **FIXED.** The comment at the tip case records the removal of the old `friend.bot \|\| (Group && …botInfo…)` short-circuit. |

**Action (in this batch, ~30 min):** reconcile the brief against the tree and mark those rows
done, so the next person planning a launch scope is not misled the same way. A deferral list
that lies about what is deferred is worse than no list.

## The four rows

### S-1 · MAJOR #3 — the link-open confirm modal is spoofable ★ highest value / lowest cost

`Spixi/Pages/Chat/SingleChatPage.xaml.cs:597-599`

```csharp
string decoded_link = WebUtility.HtmlDecode(link);
Browser.Default.OpenAsync(new Uri(decoded_link));
```

The FE modal (#231c) shows the user the **pre-decode** URL; C# then HTML-decodes it and opens the
result. `https://paypal.com&commat;evil.example.com/login` **displays** as paypal-leading and
**opens** host `evil.example.com`. This defeats the exact mitigation the modal was built to be.

- **Fix:** decode **before** the string that is shown to the user is chosen — one canonical form
  from modal to sink — and add an `http`/`https` scheme allowlist at the sink (`new Uri(...)`
  will happily construct `javascript:`, `file:`, `intent:`).
- **Also check:** `:590`'s `if (!link.Contains("://")) link = "http://" + link;` runs on the
  pre-decode string. Confirm the two orderings agree after the fix.
- **Pin:** the decode must not sit between the display value and `OpenAsync`; scheme allowlist
  asserted at the sink. Source pin + a behavioural pin on the FE modal's displayed string.
- **Size:** ~1h including pins.

### S-2 · Peer-supplied filename reaches two file writes unsanitized

`Spixi/Data/TransferManager.cs:758` (`File.Create`) and `:615` (`File.Move`)

```csharp
transfer.filePath  = Path.Combine(downloadsPath, transfer.fileName + "." + uid + ".ixipart");   // :758
string final_file_path = Path.Combine(downloadsPath, transfer.fileName);                        // :615
```

`transfer.fileName` arrives from the **remote peer**. There is no sanitize on the receive path —
`grep` for `transfer.fileName =` finds no normalisation anywhere in the file. The guard already
exists (`resolveDownloadPath`, `:193`, fail-closed on empty / `..` / separators / rooted /
canonical escape) and is used **only** on the open/delete side (`#267` closed the user-reachable
half). `Path.Combine` does not protect: a rooted or `..`-bearing second argument wins.

- **Fix:** run the receive path through the same `resolveDownloadPath` guard, at **both** write
  sites (the `.ixipart` create and the final move), and reject the transfer with a logged error
  rather than writing outside `Downloads`.
- **Watch:** the de-dup loop at `:617-621` rebuilds the path from `transfer.fileName` again —
  it must consume the *sanitized* name, not the raw one, or the guard is bypassed on the second
  file with the same name.
- **Pin:** a `..`-bearing and a rooted name must both fail closed at each write site.
- **Size:** ~1h. **This is the one I would do first if only one gets done.**

### S-3 · `spixi.draft.*` — the user's unsent text, in plaintext, in a shared partition

`src/shells/chat.html:5607` (`DRAFT_PREFIX`), written by `saveDraft`.

Our key, our data. The mechanism is inherited (**MAJOR #4** — the shells load from `file://`, and
on Chromium-based WebViews every `file://` document shares **one** localStorage partition with
mini-app content). The sweep on whether that partition really is shared is still open; this row
is marked *"fix regardless of what the sweep concludes"*, and that is the right call — an
unsent private message is the most sensitive thing the chat surface holds.

- **Options, in order of preference:**
  1. **Don't persist it.** Keep the draft in memory for the life of the WebView. Costs the
     draft on a cold chat re-open; that is a product call, and it is the only option with no
     residual.
  2. **Move it C#-side** — a `saveDraft`/`loadDraft` verb pair; C# holds it in the app's own
     storage, outside the shared `file://` partition.
  3. Encrypt at rest in the shell — **rejected**: the key would live in the same partition.
- **Ask the lead:** (1) or (2). (1) is smaller and has no residual; (2) preserves behaviour.
- **Size:** (1) ~1h. (2) ~3h including the verb, the C# store and pins.

### S-4 · L8 — the wallet password is stored in plaintext

Written at `Spixi/Pages/Settings/EncryptionPassword.xaml.cs:85` and
`Spixi/Pages/Settings/SettingsPage.xaml.cs:455`; read at `Spixi/Meta/Node.cs:406`
(`Preferences.Default.Get("walletpass", "")`).

Two legacy `// TODO: encrypt the password` markers mark the original intent. `Preferences` is
plaintext on every platform we ship.

- **Verified:** `grep` over the Ixian-Core sibling at `097341a` finds **no** reference to
  `walletpass` or to `Preferences` — the key is entirely ours, so this is a contained move.
- **Fix:** `SecureStorage` (MAUI Essentials, already referenced via `Microsoft.Maui.Storage`;
  Keychain on iOS/Mac, EncryptedSharedPreferences on Android, DPAPI on Windows).
- **⚠ The care is in the migration, not the write.** `SecureStorage` is **async** and can throw
  on a device with no keystore; `Node.loadWallet` reads the key on the **cold-start unlock
  path**, where a throw or a silent empty read means the user cannot open their wallet. Needs:
  a one-time migration that only removes the `Preferences` copy **after** a confirmed
  `SecureStorage` read-back (the #341 MAJOR-1 lesson — confirm the write before dropping the
  old value), and a fail-soft that falls back to prompting rather than to a locked-out app.
- **Pin:** the read-back-before-delete ordering; no `Preferences` write of `walletpass` survives.
- **Size:** ~3h. **Highest risk of the four** — it touches cold start. Do it last, and behind
  its own device pass.

## Order, and why

1. **S-2** (traversal) — remote-triggerable, smallest, no UX surface.
2. **S-1** (link spoof) — remote-triggerable, phishing ramp, small.
3. **S-3** (drafts) — needs a product decision first.
4. **S-4** (wallet password) — largest blast radius; last, and it earns its own device pass.
5. The BE-brief reconciliation, alongside any of them.

## Out of scope for this batch (stated, so it is not assumed)

- **MAJOR #6** (mini-app WebView regressions from the iOS bring-up) — rides with the iOS work.
- **MAJOR #4 itself** (is the `file://` partition really shared?) — that is a platform sweep, not
  a fix. S-3 is written so its answer does not matter.
- Everything else in the BE cutover brief — genuinely enhancements, genuinely post-launch:
  reactions beyond ❤️ (needs an Ixian-Core reaction-store change), link previews (needs a
  sender-side unfurl + payload carriage, and a human BE review first), the call-UI broadcast.

## Working rules for whoever builds it

Unchanged and load-bearing: clean-clone gates in a Linux container with the Ixian-Core sibling at
`097341a`; mutate in full tar copies, never `cp -al`; bundle before shells; every fix carries a
docblock naming the defect, the failure it prevents and the reversal; **every pin declares
`stripCode` or raw explicitly (#771)** and a behavioural pin that stubs the function under test
proves nothing; a comment stating an invariant the code does not enforce is a defect (#772).

★ **This batch touches the wallet unlock path and a network-facing write path. It gets a #46
adversarial loop before it is called done** — not self-review. The Session L loop found three
MAJORs in a batch that had already passed self-review, and two of its own fixes were broken by
the next reviewer.
