# local-nuget

Repo-local NuGet feed (wired via `nuget.config` at the repo root).

Put the BE dev's custom **`RocksDB.0.0.42.nupkg`** (custom-built RocksDB-Sharp
managed wrapper for Android/iOS) here and commit it, so every clone — PC, Mac —
restores it without machine setup. Until it lands, Android/iOS restores warn
NU1603 and resolve a wrong public version; MacCatalyst is unaffected (uses the
public 10.4.2 package). See `docs/mac-bringup-log.md` 2026-07-20.
