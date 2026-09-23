// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/SliceTransform.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;

namespace RocksDbSharp
{
    public class SliceTransform
    {
        public IntPtr Handle { get; protected set; }

        private SliceTransform(IntPtr handle)
        {
            this.Handle = handle;
        }

        public static SliceTransform CreateFixedPrefix(/*(size_t)*/ ulong fixed_prefix_length)
        {
            UIntPtr fixedPrefix = (UIntPtr)fixed_prefix_length;
            IntPtr handle = Native.Instance.rocksdb_slicetransform_create_fixed_prefix(fixedPrefix);
            return new SliceTransform(handle);
        }

        public static SliceTransform CreateNoOp()
        {
            IntPtr handle = Native.Instance.rocksdb_slicetransform_create_noop();
            return new SliceTransform(handle);
        }

        ~SliceTransform()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                // Commented out until a solution is found to rocksdb issue #1095 (https://github.com/facebook/rocksdb/issues/1095)
                // If you create one of these, use it in an Option which will destroy it when finished
                // Otherwise don't create one or it will leak
                //Native.Instance.rocksdb_slicetransform_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }
    }
}
