# Contract — Voice fix (`voicefix`, 2026-11-23)

From `docs/templates/agent-contract.md`, cut to what this batch became. Prompt: `claude/session-voicefix-prompt.md`.
Base `redesign/frontend` @ `462ba3e4`. Number block #1900–#1914 · L279–L282 · P94–P96.

## Items, owners, files

| Item | Owner (model) | Files | State |
|---|---|---|---|
| 1 · mechanism | lead (Claude Opus — diagnosis, with the operator in the loop) | `docs/voicefix-mechanisms.md` | done (#1900) |
| 2 · probe + operator steps | lead (Claude Opus) | `scripts/voicefix/**` | done (#1903) |
| 3 · fix | — | — | lapsed: the premise does not hold (#1901) |
| 4 · other platforms | lead | `docs/voicefix-mechanisms.md` § 6 | done |
| 5 · security record | lead | `docs/security-handover-gate.md` (own section), `docs/security-review-for-be-engineer.md` (own addendum) | done (#1905) |
| 6 · tests and pins | — | — | lapsed with item 3 (#1901) |
| export | lead | `DECISIONS.md` (#1900–#1906), `docs/decisions-index.md` (own block), `docs/lessons.md` (L279–L280), `docs/walk-voicefix.md`, `docs/review-brief-voicefix.md`, `docs/handoff-2026-11-23-voicefix.md`, `docs/status-log.md` (one entry), `CLAUDE.md` (one bullet) | — |

No builder sub-agent ran: the work was a diagnosis that waited on Damir's PC step by step (#1510), and the items that
would have been built (the fix, the guard pin) lapsed. The readers of § 4 of the brief are fresh sub-agents.

## Interfaces

None. No app file, no shell, no bridge verb or push, no switch, no packet. The probe compiles the app's
`VoiceCodec.cs`, `SDevSeedPlan.cs`, `PhotoRules.cs`, `IAudioDecoder.cs`, `OpusDecoder.cs` as links (read only).

## Scratch

Lead only: `/home/claude/work/`, `/home/claude/ext/` (the Concentus source at `6c2328d`, the staged `Concentus.dll`
of the Windows build, the cloud JIT listings). Damir's PC: `Claude outputs\voicefix-probe\` (the built probe; outside
the repo clone).
