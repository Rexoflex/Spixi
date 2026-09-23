// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Native.Load.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace RocksDbSharp
{
    public abstract partial class Native
    {
        public static Native Instance;

        static Native()
        {
            if (RuntimeInformation.ProcessArchitecture == Architecture.X86 && RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                throw new RocksDbSharpException("Rocksdb on windows is not supported for 32 bit applications");
            Instance = NativeImport.Auto.Import<Native>("rocksdb", "10.4.2", true);
        }

        public Native()
        {
        }
    }
}
