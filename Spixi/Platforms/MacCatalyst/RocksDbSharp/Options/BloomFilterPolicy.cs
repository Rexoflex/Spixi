// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Options/BloomFilterPolicy.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;

namespace RocksDbSharp
{
    public class BloomFilterPolicy
    {
        public IntPtr Handle { get; protected set; }

        private BloomFilterPolicy(IntPtr handle)
        {
            this.Handle = handle;
        }

        ~BloomFilterPolicy()
        {
            if (Handle != IntPtr.Zero)
            {
#if !NODESTROY
                // Commented out until a solution is found to rocksdb issue #1095 (https://github.com/facebook/rocksdb/issues/1095)
                // If you create one of these, use it in an Option which will destroy it when finished
                // Otherwise don't create one or it will leak
                //Native.Instance.rocksdb_filterpolicy_destroy(Handle);
#endif
                Handle = IntPtr.Zero;
            }
        }

        /// <summary>
        /// Return a new filter policy that uses a bloom filter with approximately
        /// the specified number of bits per key.
        /// bits_per_key: bits per key in bloom filter. A good value for bits_per_key
        /// is 10, which yields a filter with ~ 1% false positive rate.
        /// use_block_based_builder: use block based filter rather than full fiter.
        /// If you want to builder full filter, it needs to be set to false.
        /// Callers must delete the result after any database that is using the
        /// result has been closed.
        /// Note: if you are using a custom comparator that ignores some parts
        /// of the keys being compared, you must not use NewBloomFilterPolicy()
        /// and must provide your own FilterPolicy that also ignores the
        /// corresponding parts of the keys.  For example, if the comparator
        /// ignores trailing spaces, it would be incorrect to use a
        /// FilterPolicy (like NewBloomFilterPolicy) that does not ignore
        /// trailing spaces in keys.
        /// </summary>
        /// <param name="bits_per_key">Bits per key.</param>
        public static BloomFilterPolicy Create(int bits_per_key = 10, bool use_block_based_builder = true) {
            IntPtr handle = use_block_based_builder ? Native.Instance.rocksdb_filterpolicy_create_bloom(bits_per_key) : Native.Instance.rocksdb_filterpolicy_create_bloom_full(bits_per_key);
            return new BloomFilterPolicy(handle);
        }
    }
}
