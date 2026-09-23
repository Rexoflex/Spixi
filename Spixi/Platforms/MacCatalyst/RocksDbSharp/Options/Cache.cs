// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Options/Cache.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections.Generic;
using System.Text;

namespace RocksDbSharp
{
    public class Cache
    {
        public IntPtr Handle { get; protected set; }

        private Cache(IntPtr handle)
        {
            this.Handle = handle;
        }

        ~Cache()
        {
            if (Handle != IntPtr.Zero)
            {
                Native.Instance.rocksdb_cache_destroy(Handle);
                Handle = IntPtr.Zero;
            }
        }

        public static Cache CreateLru(ulong capacity)
        {
            IntPtr handle = Native.Instance.rocksdb_cache_create_lru(new UIntPtr(capacity));
            return new Cache(handle);
        }

        public Cache SetCapacity(ulong capacity)
        {
            Native.Instance.rocksdb_cache_set_capacity(Handle, new UIntPtr(capacity));
            return this;
        }

        public ulong GetUsage()
        {
            return Native.Instance.rocksdb_cache_get_usage(Handle).ToUInt64();
        }

        public ulong GetPinnedUsage()
        {
            return Native.Instance.rocksdb_cache_get_pinned_usage(Handle).ToUInt64();
        }
    }
}
