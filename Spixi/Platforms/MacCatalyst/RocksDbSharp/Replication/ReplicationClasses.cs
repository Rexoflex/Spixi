// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Replication/ReplicationClasses.cs), BSD-2-Clause (LICENSE
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
    public class ReplicationFile : IDisposable
    {
        public string FileName { get; set; }
        public ulong FileSize { get; set; }
        public Stream FileStream { get; set; }

        public void Dispose()
        {
            FileStream?.Dispose();
        }
    }

    public class ReplicationBatch
    {
        public ulong SequenceNumber { get; set; }
        public byte[] Data { get; set; }
    }

    public class ReplicationSession : IDisposable
    {
        private readonly string _tempPath;

        public ReplicationSession(string tempPath)
        {
            _tempPath = tempPath;
        }

        public IEnumerable<ReplicationFile> Files
        {
            get
            {
                foreach (var filePath in Directory.GetFiles(_tempPath))
                {
                    var fileName = Path.GetFileName(filePath);
                    var fileInfo = new FileInfo(filePath);
                    var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    yield return new ReplicationFile
                    {
                        FileName = fileName,
                        FileSize = (ulong)fileInfo.Length,
                        FileStream = stream
                    };
                }
            }
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempPath))
            {
                Directory.Delete(_tempPath, true);
            }
        }
    }
}
