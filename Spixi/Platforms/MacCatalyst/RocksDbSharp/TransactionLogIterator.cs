// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/TransactionLogIterator.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Runtime.InteropServices;

namespace RocksDbSharp
{
    public class TransactionLogIterator : IDisposable
    {
        public IntPtr Handle { get; private set; }

        internal TransactionLogIterator(IntPtr handle)
        {
            Handle = handle;
        }

        public bool Valid()
        {
            return Native.Instance.rocksdb_wal_iter_valid(Handle) != 0;
        }

        public void Next()
        {
            Native.Instance.rocksdb_wal_iter_next(Handle);
        }

        public void Status()
        {
            Native.Instance.rocksdb_wal_iter_status(Handle);
        }

        public unsafe WriteBatch GetBatch(out ulong sequenceNumber)
        {
            ulong seq;
            IntPtr writeBatchHandle = Native.Instance.rocksdb_wal_iter_get_batch(Handle, (IntPtr)(&seq));
            sequenceNumber = seq;
            return new WriteBatch(writeBatchHandle);
        }

        public void Dispose()
        {
            if (Handle != IntPtr.Zero)
            {
                Native.Instance.rocksdb_wal_iter_destroy(Handle);
                Handle = IntPtr.Zero;
            }
        }
    }
}
