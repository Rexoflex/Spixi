# Review brief — Voice fix (`voicefix`, #1900–#1906)

Readers by #1606: ONE fresh read-only **Claude Fable 5.2** for the security-only pass (the prompt names
`Spixi/Utils/VoiceCodec.cs` as the riskiest file: it is UNCHANGED; the pass reads the probe's use of it and the
security records), **Claude Opus** for the other reader. Readers get this brief and the tree, never the lead's chat.

## 1 · What the batch is
A diagnosis. The Windows walk build of 2026-11-23 ended with `0xc000001d`; the prompt read it as "the voice decode
asks for an instruction the i9-9900K lacks". The operator steps on Damir's PC showed instead a fault of the Visual
Studio debugging session (a call through a stale callback target in the WinUI dispatcher). So the batch changes NO app file. It adds:
the mechanisms doc, a developer probe (`scripts/voicefix/`), a walk sheet, the security records, DECISIONS
#1900–#1906, L279–L280, the export docs.

## 2 · How to run
- The probe (needs NuGet, or a `Concentus.dll` 2.2.2): `cd scripts/voicefix && dotnet build -c Release -o out`
  (or `-p:ConcentusDll=<file> --configfile <a nuget.config with no source>`), then `dotnet out/VoiceFixProbe.dll
  --runs 1 --sets none,hwintrinsic0`. Delete `obj/` and `bin/` after.
- The checks: `node scripts/build-shells.mjs --check`, `node scripts/build-locales.mjs --check`; the full smoke and
  CSH run once after the last fix (#1503).

## 3 · Reader scopes (disjoint)
- **S — security-only (Fable 5.2):** `scripts/voicefix/Program.cs`, `scripts/voicefix/VoiceFixProbe.csproj`; the new
  sections of `docs/security-handover-gate.md` and `docs/security-review-for-be-engineer.md`; DECISIONS #1902, #1905.
  Questions: can the probe print or write account data (a name, a path, a text, a key)? Can it write or delete in
  the account's folders? Is the child-process start safe (arguments, environment, the executable it starts)? Are the
  security records true to the tree (the Concentus behaviour at `lostromb/concentus` @ `6c2328d`, the fork point's
  version)?
- **C — correctness (Opus):** `docs/voicefix-mechanisms.md`, `docs/walk-voicefix.md`, DECISIONS #1900, #1901, #1903,
  #1904, the decisions-index block, L279–L280, `docs/contract-voicefix.md`. Questions: is every `file:line` and
  every claim about the tree true at this commit? Does the doc claim more than the evidence shows (the run table is
  the evidence; the operator's pasted lines are quoted in it)? Is the probe's decode loop the same as
  `VoiceClips.peaksCsvOf` / `framesOf` (`Spixi/VoIP/VoiceClips.cs:910-985`)? Is the walk sheet runnable as written?

## 4 · Non-negotiables and accepted dials
- No app file changes; no new verb, push, key, log line, switch or packet.
- The operator rule: nothing the probe prints names a file, a path, a message text or a key.
- A finding about the CAUSE needs evidence in the tree or the run table; "the debugger might not be the only
  condition" is accepted as stated (§ 5 of the mechanisms doc says what is not shown).

## 5 · Verdict

**CLEAN at r5** (the last permitted round; prompt: "not CLEAN at round 5 → stop"). Readers: each round ONE fresh
read-only Claude Fable 5.2 for S and one fresh read-only Claude Opus for C (#1606); 10 readers in all.

| Round | S (Fable 5.2) | C (Opus) | What changed after it |
|---|---|---|---|
| r1 | 0 MAJOR · 4 MINOR · 5 NIT | 0 MAJOR · 7 MINOR · 4 NIT | the probe: Concentus's native route off (`AttemptToUseNativeLibrary = false`), the 500-file cap and the capped read, fail closed on a null `ProcessPath`, `CORECLR_*` removed; the records: the Concentus routes, the counts; the doc: line numbers, the § 3 claims, the 15:36 `…095B` end, the lesson cells |
| r2 | 0 MAJOR · 3 MINOR · 4 NIT | 0 MAJOR · 4 MINOR · 6 NIT | the cause scoped to the one stack read; the per-platform routes; `FileShare.Delete`; `DOTNET_ROOT*` kept |
| r3 | 0 MAJOR · 1 MINOR · 4 NIT | 0 MAJOR · 3 MINOR · 4 NIT | the sink inherited / the trigger widened by ours (#1208) + Q-3; the PLC reach; "consistent with a fixed offset"; the probe header and `dotnetVarCount` |
| r4 | **1 MAJOR** · 0 MINOR · 3 NIT | 0 MAJOR · 2 MINOR · 4 NIT | MAJOR (record truth): Android API 23 may load the system's libopus — now stated as possible, not verified, in every record and in Q-3; the "0 of 3" count qualified; the Mac `dlopen` order |
| r5 | 0 MAJOR · 1 MINOR · 4 NIT | 0 MAJOR · 1 MINOR · 2 NIT | doc corrections only (rule 8): "a call through a stale or invalid callback target (consistent with a use-after-free; inferred)"; a native result on API 23 = a pre-handover fix by the gate's rule; § 3 / § 7 wording; `PcmCollector` `:989-1031`; the index rows |

Recorded, not changed (r5, a code file after the last round — rule 8): `scripts/voicefix/Program.cs:24-25` says the
probe measures "the MANAGED decoder — the one the app runs" without "on Windows with no opus library placed"
(NIT; direction: qualify the sentence in the next batch that touches the probe).

The code files are committed exactly as the r5 readers read them (SHA-256): `Program.cs` `51561e570c4233c7…`,
`VoiceFixProbe.csproj` `824f66e9e9cefe22…`, `clips/silk-16k-10kbps-12s.txt` `3ea24113656a7c6c…`,
`clips/silk-16k-24kbps-6s.txt` `17c028e9883d511a…`.
