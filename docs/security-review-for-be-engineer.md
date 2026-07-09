# 🔒 Security review — FOR THE BE ENGINEER

> **What this is / reminder:** the security handoff **Damir plans to show the BE engineer.**
> If Damir mentions this review, "the risks", "showing the BE engineer", the wallet wall-off,
> or the C# security check in ANY session → point him to THIS file and remind him it is the doc
> to walk the BE engineer through.
> Prepared 2026-07-09 (Opus). Keep current as C# lands. Pairs with SECURITY.md (§1 = the paramount isolation invariant).

## TL;DR
- The C# shipped so far does **NOT** weaken the wallet wall-off. Nothing shipped touches signing, keys, balances, or the payment broadcast path — it is all metadata pushes + non-money verbs.
- The isolation invariant (SECURITY.md §1) is what **contains a compromised chat**: chat is its own WebView, so a chat exploit cannot emit the destructive HomePage verbs.
- Biggest PLANNED landmine: **W5 `signSend`** — keep a native confirm before signing. Plus several pre-existing wallet/password bugs worth prioritising.
- **Standing rule (also in CLAUDE.md): any C# we write avoids the risky parts (§3 below).** If a task needs them → STOP, do not code it, log it here.

## 1. Shipped C# (BE-cutover #208–#219) — verdict: safe for the wall
No shipped change touches signing, keys, balances or broadcast. All of it is outbound metadata (group/bot kind, mention flag, reaction excerpt, call args, own-reaction keys, self-nick, version/address/language) or non-money verbs (uninstall, accept/decline request). Verified in source:

- **A1 uninstall** (`ixian:uninstall:<id>` → `MiniAppManager.remove`): SAFE. `remove()` returns early unless `appList.ContainsKey(app_id)`, then deletes the STORED `app.id` path — a hostile `../../` id fails the check and never deletes. (MiniAppManager.cs:334-346.)
- **X1 `imageToDataUri`**: SAFE in practice — every call site passes a C#-derived path (validated Address avatar, stored app icon, or user-picked file); no WebView string reaches it. It *would* be an arbitrary-file-read primitive if one ever did → add a code comment; never pass WebView input to it. Minor: it base64s whole files into the bridge payload (fine for avatars; do not point it at large files).
- **C7(b) remote app icon**: the IP-leak-on-invite-receipt is correctly gated behind the media-autoload pref. Good.
- **CH2 accept/decline → `removeFriend`** and **A1 uninstall**: destructive but non-money, on the HomePage WebView. Consistent with the EXISTING bridge trust model (legacy already has `ixian:remove`/`deleteh`). They are safe *because* of §1: a compromised chat WebView cannot reach these verbs (different WebView/bridge).
- Robustness nit (not a wall issue): `onAcceptRequest`/`onDeclineRequest` call `new Address(str)` before the null-guard — malformed input could throw in the handler. Try/catch it.
- **N1/N3 load-then-move preload (#222): SAFE for the wall — flag the lifecycle.** `SpixiContentPage.pushPageLoaded` stages the incoming page's WebView invisibly (Opacity 0, InputTransparent) inside the CURRENT page's native layout until the shell signals `ixian:onload`, then presents it. The staged page keeps its OWN WebView, JS context and bridge handlers — nothing is merged into the host's WebView and NO JS bridge is shared (§1 intact; same native-tree containment as the shipped desktop rightContent pattern). While staged, a conversation WebView (untrusted content) is briefly alive off-screen — bounded by a 4s timeout; every abandonment path (timeout-present, cancel, host popped) either presents it or `Dispose()`s it (handler disconnected), so it is never left running in the background. Review ask: confirm the teardown paths cover platform edge cases (WinUI/Android).

## 2. Planned C# — risk ranking
| Item | Risk | Insist on |
|---|---|---|
| **W5** `ixian:signSend` (in-page Send; C# signs+broadcasts a WebView-composed tx without reopening the native WalletSendPage) | **HIGH — the one to get right** | Challenges SECURITY.md §2/§3 (final send is native). Do NOT ship a no-native-prompt version. C# must re-validate addr+amount+fee+balance and show a native OK/Cancel BEFORE signing. Currently gated OFF (`composeSend`) and delegating to the native flow — keep it there until the native-confirm contract exists. |
| **C3** inline Pay on a request card | Medium | Take the zero-C# option: inline Pay opens the existing native confirm via `ixian:viewPayment`. No signed inline path. |
| **C12** `attachData`/`attachClipboard` (WebView base64 → C# temp file → send) | Medium | C# names the temp file itself (never a WebView name → overwrite/traversal); cap payload size (DoS); validate MIME. New "WebView writes a file" ingress — no money, but new surface. |
| **CH3** delete + history/media wipe verbs | Medium | Auth-gate consistently (§9.1: `deleteh` is not LockPage-gated like account/wallet deletion). |
| **S13** promote `openLink` to global | Low | Keep the URL validated; minor phishing vector from chat. |

Pre-existing wallet/security bugs (NOT caused by our C#; high value for a security-conscious BE):
- **L6** restore mutates state (wipes onboarding/lock flags, overwrites stored `walletpass`) BEFORE verifying the password → wrong password = lockout + data loss. Verify-then-mutate.
- **L8 / §9.1** the wallet password is stored in PLAINTEXT `Preferences["walletpass"]`, and is never cleared (all removal sites use the misspelled key `"waletpass"`) — a plaintext secret lingers even after wallet deletion. Move to SecureStorage.
- **L2 / §9.2** passwords ride navigation URLs and are `UrlDecode`d differently on create vs unlock → a `+`/space/`%xx`/`<nick>:` in a password silently locks the user out. One canonical decode-safe capture.
- **§9.1** `ixian:open/delete:<file>` (downloads) do no filename sanitisation (path traversal in principle).

## 3. Standing rule — C# work AVOIDS the risky parts
Any C#/bridge change we make must NOT:
1. Sign or broadcast a transaction from WebView-composed data **without a native confirm** (C# re-validates + native OK/Cancel).
2. Move private keys, seed phrases, or the wallet password across the bridge or into the WebView.
3. Feed a **WebView-supplied path/filename** into a filesystem op (C# names its own temp files; validate ids against a stored list, as `remove()` does).
4. Wire a **JS bridge between chat and other panes** — cross-surface coordination is C#-only (SECURITY.md §1).
5. Extend the **password-over-URL** pattern.
6. Auto-fetch a remote resource that **leaks the user's IP** without the media-autoload gate.

If a planned task appears to need any of the above → **STOP, do not code it, add it to this file, and it becomes a BE-engineer discussion**, not a silent change.
