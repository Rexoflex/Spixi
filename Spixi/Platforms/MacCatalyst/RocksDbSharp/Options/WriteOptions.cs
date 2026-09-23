// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Options/WriteOptions.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;

namespace RocksDbSharp
{
    public class WriteOptions
    {
        public WriteOptions()
        {
            Handle = Native.Instance.rocksdb_writeoptions_create();
        }

        public IntPtr Handle { get; protected set; }

        ~WriteOptions()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                Native.Instance.rocksdb_writeoptions_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }

        public WriteOptions SetSync(bool value)
        {
            Native.Instance.rocksdb_writeoptions_set_sync(Handle, Native.MarshalBool(value));
            return this;
        }

        public WriteOptions DisableWal(int disable)
        {
            Native.Instance.rocksdb_writeoptions_disable_WAL(Handle, disable);
            return this;
        }


    }
}
