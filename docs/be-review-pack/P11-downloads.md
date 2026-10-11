# P11 · DOWNLOADS · Downloads list, shared items, delete / open / show in Downloads

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no | yes | shipped | 6 min |

**Look here first:** `Spixi/Pages/Settings/SettingsPage.xaml.cs:750` — `File.Delete` on a path built from a file NAME the settings WebView sent; its only guard is `TransferManager.resolveDownloadPath` (`Spixi/Data/TransferManager.cs:292`, `:308`).

**DECISIONS:** #267 · #328 · #772 · #1106 · #1107 · #1120 · #1121 · #1154 · #1166 · #1173 · #1176 · #1190 · #1202 · #1245 · #1254 · #1293 · #1312 · #1322

## What changed and why
- Open / delete of a download take a leaf NAME from the WebView; ONE fail-closed resolver now guards all five name sites (was a plain `Path.Combine` at 0e85a4b8), and the pair got a second host in the Settings sublevel (#267; O-38 accepted, #1293).
- Settings › Downloads: newest first, size, sender + avatar from C#'s own index (by received message, never by name), "Show in chat" (#1107, #1254).
- Chat info shared items: C# scans history, decodes small thumbnails, and answers open / view / show in chat / delete from this device / show in Downloads; the WebView sends only `<hex id>:<n>`, resolved against C#'s own last scan (#1106, #1120, #1121, #1154, #1166).
- So the target of a DELETE is named two ways: by NAME (Downloads, Settings — guarded) and by TOKEN (chat info — C# resolves the path). A delete re-pushes the open chat's row (#1190, #1202).

## Files (verified at the S16 tree)
- `Spixi/Data/TransferManager.cs:283` — resolveDownloadPath: no `..`, no separator, not rooted, its own `GetFileName`, no invalid char (`:292`); canonical path under the root (`:308`).
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:723` — deleteDownload: name → resolve (`:726`) → index lookup → `File.Delete` (`:750`); `:1840` takes the name off the RAW url, decoded once.
- `Spixi/Pages/Downloads/DownloadsPage.xaml.cs:179` — the legacy `ixian:delete:` / `ixian:open:` (`:158`) now through the same resolver (`:182`, `:164`).
- `Spixi/Utils/SharedItems.cs:421` — deleteLocal: received only, inside the Downloads root, still this message's file, then `File.Delete` (`:437`); `:468` resolve = own last scan; `:195` chat-info thumbnails: sniff, ≤ 20 MB, ≤ 60 per scan → `SThumbnail.makeJpeg` in-process (`:208`).
- `Spixi/Utils/DownloadsIndex.cs:137` — sourceOf: a file → its sender only through its received message + size, re-checked each lookup.

## Bridge surface
SP = `Spixi/Pages/Settings/SettingsPage.xaml.cs` (shell `settings.html`: own UI, shows peer-chosen file names + contact labels as text). CD = `Spixi/Pages/Contacts/ContactDetails.xaml.cs` (shell `contact_details.html` = chat info, RENDERS UNTRUSTED content). DP = `Spixi/Pages/Downloads/DownloadsPage.xaml.cs` (`downloads.html`, peer-chosen names). Built shells in `Spixi/Resources/Raw/html/`. None is reachable from `MiniAppPage`. `downloadsoverlay` · `downloadsBack` · `setPresentation` = the P05 `overlay`.

| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:loadDownloads` | none | settings → SettingsPage | SP:666 → :1865 | ours |
| `ixian:openDownload:` | `<%-encoded leaf name>` | settings → SettingsPage | SP:683 | ours (2nd host) |
| `ixian:showDownloadInChat:` | `<%-encoded leaf name>` | settings → SettingsPage | SP:705 | ours |
| `ixian:deleteDownload:` | `<%-encoded leaf name>` | settings → SettingsPage | SP:723 | ours (2nd host) |
| `ixian:sharedItems` | none | chat info → ContactDetails | CD:639 | ours |
| `ixian:sharedShow:` · `ixian:sharedShowInDownloads:` | `<hex id>:<n>` | chat info → ContactDetails | CD:663 · CD:845 | ours |
| `ixian:sharedOpen:` | `<hex id>:<n>` | chat info → ContactDetails | CD:680 | ours |
| `ixian:sharedView:` | `<hex id>:<n>` (ViewerRules.isItemToken) | chat info → ContactDetails | CD:729 | ours |
| `ixian:sharedDeleteLocal:` | `<hex id>:<n>` | chat info → ContactDetails | CD:776 | ours |
| `setSharedItems` | `<json [[id,n,kind,label,size,ts,local,thumb data-uri,received]]>` | C# → chat info | CD:654 · :835 | ours |
| `viewerImage` | `<token>`, `<data uri \| "">` | C# → chat info | CD:771 | ours (chat half: P10 `media`) |
| `highlightDownload` | `<leaf name>` | C# → downloads | DP:286 | ours |
| `setDownloadSenders` · `setDownloadAvatars` | `<json [[name,label,s<n>]]>` · `<json [[s<n>,data-uri]]>` | C# → settings | SP:1925 · :1953 · SP:1926 · :1954 | ours |
| `addFile` (downloads) | `<name>`, `<epoch s>`, `<size>` (SP) | C# → settings, downloads | SP:1895 · DP:260 | reshaped (epoch, size) |

## Threat → rule → proof
| A hostile … could try | What stops it | Proof |
|---|---|---|
| compromised settings / downloads WebView sends `deleteDownload:..%2Fwallet.ixi` or `x.txt:ads` | `TransferManager.cs:292` + `:308`, fail-closed | no executed test of the resolver; source pins only (smoke "★ #1107 GATE (ours, fixed): the Downloads name guard logs the name LENGTH…") |
| page shows a decoy `report%2Epdf`, the confirm names one file, another is deleted | SP:1840 / DP:225: the raw url, `Uri.UnescapeDataString` once | smoke "★ #1107 settings shell: … sends the ENCODED name (the #267 decoy rule)" |
| compromised chat-info WebView names any file to delete or open | token → own scan (`SharedItems.cs:468`); delete only received + inside Downloads + `fileMatches` (`SharedItems.cs:421`, `Spixi/Utils/ViewerRules.cs:54`) | csh `ViewerRulesTests.token_grammar_is_hex_colon_digits_only` · `delete_is_received_local_inside_downloads_only` |
| peer's crafted image decoded when chat info opens | `SharedItems.cs:195` sniff + cap + count | csh `ViewerRulesTests.source_gate_is_sniff_and_cap`; the decoder: no proof |

## Given up / left open
- Open / delete still take a NAME from JS (not a C#-issued id), on two hosts (O-38, accepted #1293).
- F8 fixed (#1322): `DownloadsPage.xaml.cs:175`, `:193`, `:235` and the two SettingsPage twins (`SettingsPage.xaml.cs:1689` wipe downloads, `:1850` unescape) now log the exception TYPE only (its message can carry the peer-chosen name or path). Pin `scripts/pins-s16/a-sec.mjs` F8.
- Legacy: H-10 `provider_paths.xml` publishes all of `files/`; every open hands a C#-resolved path (#1245). Opening uses the OS handler for the peer's (kept) extension.
- The contact-delete media purge (`isInsideDownloadsRoot`, `TransferManager.cs:329`) is in P09 `contacts`.
- ⚠ Stale doc: `docs/security-review-for-be-engineer.md` "#267 residual" still lists the receive-time `Path.Combine(downloadsPath, transfer.fileName)` as open — fixed (`TransferManager.cs:866`, #1245; P10).

## Question for BE
Do you accept that Downloads open / delete take a leaf NAME from the WebView, guarded only by `resolveDownloadPath` (`TransferManager.cs:283`), instead of a C#-issued id (yes / no)?
