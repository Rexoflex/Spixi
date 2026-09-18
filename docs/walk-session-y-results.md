# Walk Y — results (2026-09-17, Android, dev-coexist build)

**12 pass · 0 fail · 0 n/a** — Y.1–Y.12 all P (the contact-details premium pass, both themes, phone + the Windows pane).

## Numbers read off the same session's logcat

| stamp | value | reads as |
|---|---|---|
| `chat attach spare=1` → `present` | 51 ms · 53 ms · 115 ms (n=50) | the #800 pre-warm on the critical path: the open is the drain + paint |
| `chat attach spare=0` → `present` | 233 ms (boot nav=79 · parse pre=39 inline=22) | one cold open (no spare ready) — the structural cost #765 named |
| `chat frames` after open | n=52–54 · drop=0–1 · max=22–33 ms | clean |
| `chats-after-close frames` | n=48–49 · **drop=1 · max=78–89 ms** | the `warm()` of the next spare lands here (#799's instrument); ONE long frame per close |
| `chat warm onload` | 161 · 184 ms | the spare's boot, off the critical path |
| `chat-shell rtt` | med 3–7 ms | the bridge round trip |
| `chromium: tile memory limits exceeded, some content may not draw` | 4× during chat opens | WebView compositor warning — observed, no blank tiles reported on the walk; watch on the memory item |
| SELinux `avc: denied { ioctl }` on `peers.ixi` (0x9409, `.NET TP Worker`) | 1× | .NET file probe refused by policy; harmless |
| `dumpsys meminfo` TOTAL PSS | **260 MB → 319 MB** (RSS 392 → 450 MB) across the walk | +59 MB in minutes — the AND-40 curve (kill at ~511 MB) needs the series below |

## Owed for AND-40 (the Android kill)

A 30-minute series, app in normal use then idle, one line per 5 minutes:

```powershell
1..7 | ForEach-Object { "$(Get-Date -Format HH:mm:ss)  " + (adb shell dumpsys meminfo com.ixilabs.spixi.dev | Select-String "TOTAL PSS").ToString().Trim(); Start-Sleep -Seconds 300 } | Tee-Object -FilePath meminfo-series.txt
```

And ONE full dump at the end, so the growing category is named (Native Heap · Graphics · WebView · .NET):

```powershell
adb shell dumpsys meminfo com.ixilabs.spixi.dev > meminfo-full.txt
```
