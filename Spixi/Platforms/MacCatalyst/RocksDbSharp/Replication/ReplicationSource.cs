// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Replication/ReplicationSource.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections.Generic;
using System.IO;

namespace RocksDbSharp
{
    public class ReplicationSource
    {
        private readonly RocksDb _db;
        private readonly string _dbPath;

        public ReplicationSource(RocksDb db, string dbPath)
        {
            _db = db;
            _dbPath = dbPath;
        }

        public ReplicationSession GetInitialState()
        {
            var tempPath = Path.Combine(Path.GetTempPath(), "rocksdb_replication_" + Guid.NewGuid().ToString());
            using (var cp = _db.Checkpoint())
            {
                cp.Save(tempPath);
            }
            return new ReplicationSession(tempPath);
        }

        public IEnumerable<ReplicationBatch> GetWalUpdates(ulong sequenceNumber)
        {
            _db.DisableFileDeletions();
            using (var iterator = _db.GetUpdatesSince(sequenceNumber))
            {
                while (iterator.Valid())
                {
                    iterator.Status(); // Check for errors

                    var batch = iterator.GetBatch(out ulong seq);

                    try
                    {
                        byte[] data = batch.ToBytes();
                        yield return new ReplicationBatch
                        {
                            SequenceNumber = seq,
                            Data = data
                        };
                    }
                    finally
                    {
                        batch.Dispose();
                    }

                    iterator.Next();
                }
            }
            _db.EnableFileDeletions();
        }
    }
}
