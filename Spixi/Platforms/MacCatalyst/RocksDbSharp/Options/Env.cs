// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Options/Env.cs), BSD-2-Clause (LICENSE
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
    public class Env
    {
        public IntPtr Handle { get; protected set; }

        private Env(IntPtr handle)
        {
            Handle = handle;
        }

        public static Env CreateDefaultEnv()
        {
            return new Env(Native.Instance.rocksdb_create_default_env());
        }

        public static Env CreateMemEnv()
        {
            return new Env(Native.Instance.rocksdb_create_mem_env());
        }

        public Env SetBackgroundThreads(int value)
        {
            Native.Instance.rocksdb_env_set_background_threads(Handle, value);
            return this;
        }

        public Env SetHighPriorityBackgroundThreads(int value)
        {
            Native.Instance.rocksdb_env_set_high_priority_background_threads(Handle, value);
            return this;
        }

        public void JoinAllThreads()
        {
            Native.Instance.rocksdb_env_join_all_threads(Handle);
        }

        ~Env()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                Native.Instance.rocksdb_env_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }
    }
}
