// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/Comparator.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using Transitional;

namespace RocksDbSharp
{
    public interface Comparator
    {
        string Name { get; }
        int Compare(IntPtr a, UIntPtr alen, IntPtr b, UIntPtr blen);
    }

    public abstract class StringComparatorBase : Comparator
    {
        public Encoding Encoding { get; }

        public string Name { get; }

        public StringComparatorBase(Encoding encoding = null, string name = null, IntPtr state = default(IntPtr))
        {
            Name = name ?? typeof(StringComparatorBase).Name;
            Encoding = encoding ?? Encoding.UTF8;
        }

        public abstract int Compare(string a, string b);

        public unsafe int Compare(IntPtr a, UIntPtr alen, IntPtr b, UIntPtr blen)
        {
            var astr = Encoding.GetString((byte*)a, (int)alen);
            var bstr = Encoding.GetString((byte*)b, (int)blen);
            return Compare(astr, bstr);
        }
    }

    public class StringComparator : StringComparatorBase
    {
        public Comparison<string> CompareFunc { get; }

        public StringComparator(IComparer<string> comparer = null, Encoding encoding = null, string name = null)
            : base(encoding, name)
        {
            if (comparer == null)
                comparer = StringComparer.CurrentCulture;
            CompareFunc = comparer.Compare;
        }

        public StringComparator(bool ignoreCase, Encoding encoding = null, string name = null)
            : this(ignoreCase ? StringComparer.CurrentCultureIgnoreCase : StringComparer.CurrentCulture, encoding, name)
        {
        }

        public override int Compare(string a, string b) => CompareFunc(a, b);
    }
}
