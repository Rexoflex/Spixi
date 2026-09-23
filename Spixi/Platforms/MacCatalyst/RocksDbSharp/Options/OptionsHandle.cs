// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Options/OptionsHandle.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Dynamic;

namespace RocksDbSharp
{
    /*
    Configure options for a RocksDb store.

    Note on SetXXX() syntax:
       Why not syntax like new Options { XXX = ... } instead?  Two reasons
       1. The rocksdb C API does not support reading the options and so a class with properties is not an appropriate representation
       2. The API functions are named as imperatives and don't always begin with "set" so one like "OptimizeLevelStyleCompaction" wouldn't work right
    */
    public abstract class OptionsHandle
    {
        // The following exists only to retain a reference to those types which are used in-place by rocksdb
        // and not copied (or reference things that are used in-place).  The idea is to have managed references
        // track the behavior of the unmanaged reference as much as possible.  This prevents access violations
        // when the garbage collector cleans up the last managed reference
        internal dynamic References { get; } = new ExpandoObject();

        public IntPtr Handle { get; private set; }

        public OptionsHandle()
        {
            Handle = Native.Instance.rocksdb_options_create();
        }

        ~OptionsHandle()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                Native.Instance.rocksdb_options_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }
    }
}
