// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/ColumnFamilyHandle.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RocksDbSharp
{
#pragma warning disable IDE1006 // Naming (missing I) for backward source-compatibility reasons
    public interface ColumnFamilyHandle
#pragma warning restore IDE1006
    {
        IntPtr Handle { get; }
    }

    class ColumnFamilyHandleInternal : ColumnFamilyHandle, IDisposable
    {
        public ColumnFamilyHandleInternal(IntPtr handle)
        {
            this.Handle = handle;
        }

        public IntPtr Handle { get; protected set; }

        public void Dispose()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                Native.Instance.rocksdb_column_family_handle_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }
    }
}
