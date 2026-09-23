// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Replication/ReplicationConsumer.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.IO;

namespace RocksDbSharp
{
    public class ReplicationConsumer
    {
        private readonly RocksDb _db;

        public ReplicationConsumer(RocksDb db)
        {
            _db = db;
        }

        public static void IngestFile(ReplicationFile file, string destinationDbPath)
        {
            Directory.CreateDirectory(destinationDbPath);

            string destPath = Path.Combine(destinationDbPath, file.FileName);

            using (var fileStream = new FileStream(destPath, FileMode.Create, FileAccess.Write))
            {
                file.FileStream.CopyTo(fileStream);
            }
        }

        public void IngestBatch(ReplicationBatch batch)
        {
            if (_db == null) throw new InvalidOperationException("DB is not initialized.");

            using (var writeBatch = new WriteBatch(batch.Data))
            {
                _db.Write(writeBatch);
            }
        }
    }
}
