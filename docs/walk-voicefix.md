# Walk — Voice fix (`voicefix`, 2026-11-23)

The Artifact page: "Spixi walk — voicefix", https://claude.ai/artifact/RNayCYysahymYbf4T4GU1P (the same rows, Pass / Fail / N/A, Copy results).

What this walk checks: the Windows app does NOT end when the photo chat with a voice message opens, with no
`DOTNET_` variable and **no debugger** (Ctrl+F5) — the ends of 2026-11-23 were shown only under the Visual Studio
debugger (`docs/voicefix-mechanisms.md` § 0, DECISIONS #1900). This batch changes NO app file: the
build is the build of the base (`redesign/frontend` @ `462ba3e4`) or any later one. Android: no row (no change, no
Android finding).

## Before you start (Windows)
1. `git status` in your clone: no change in `Spixi/` (the launch profile is not tracked: `.gitignore:443`).
2. Check the launch profile has no `DOTNET_` variable (prints `0`):
   `(Get-Content "$HOME\Claude\Projects\Spixi Rework Of Frontend\Spixi\Spixi\Properties\launchSettings.json" -Raw | Select-String -Pattern 'DOTNET_' -AllMatches).Matches.Count`
3. Build in Visual Studio as always (#663: no `dotnet build`). Start with **Ctrl+F5** (Debug › Start Without Debugging).

## Rows

| Id | Where | Do | Pass when |
|---|---|---|---|
| W-BUILD | Windows, Ctrl+F5 | Start Spixi with Ctrl+F5 | Visual Studio's title bar does NOT say "(Debugging)" and the Output window shows no `Loaded '…'` lines for Spixi.exe: no debugger is attached (this batch changes no app file, so no build-only mark exists) |
| W-1 | Windows, Ctrl+F5 | Open the photo chat with the voice message, go back, 20 times. On every 5th open, first scroll up as far as 2 older pages (fewer if the chat has fewer) | Spixi never ends; at every open the voice row shows its waveform (not the plain bars) |
| W-2 | Windows, Ctrl+F5 | In that chat, play the voice message to the end | it plays to the end; the play button returns to ▶ |
| W-3 (information, optional) | Windows, F5 | Only if you want the debugger fault seen once more: F5, open photo chats for 3 minutes | NOT a fail of this batch: an end with `Exception thrown at 0x… : 0xC000001D: Illegal Instruction` (or `ExecutionEngineException` in "Unknown Module") is the known debugger fault (#1900, #1904); write the last 4 hex digits of the address in the note (seen: `086F` three times, `095B` once) |

Mark each row Pass / Fail / N/A with a note, then paste the results in the main chat.
