// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/ColumnFamilies.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RocksDbSharp
{
    public class ColumnFamilies : IEnumerable<ColumnFamilies.Descriptor>
    {
        private List<Descriptor> Descriptors { get; } = new List<Descriptor>();

        public static readonly string DefaultName = "default";

        public class Descriptor
        {
            public string Name { get; }
            public ColumnFamilyOptions Options { get; }

            public Descriptor(string name, ColumnFamilyOptions options)
            {
                this.Name = name;
                this.Options = options;
            }
        }

        public ColumnFamilies(ColumnFamilyOptions options = null)
        {
            Descriptors.Add(new Descriptor(DefaultName, options ?? new ColumnFamilyOptions()));
        }

        public IEnumerable<string> Names => this.Select(cfd => cfd.Name);

        public IEnumerable<IntPtr> OptionHandles => this.Select(cfd => cfd.Options.Handle);

        public void Add(Descriptor descriptor)
        {
            if (descriptor.Name == DefaultName)
                Descriptors[0] = descriptor;
            else
                Descriptors.Add(descriptor);
        }

        public void Add(string name, ColumnFamilyOptions options)
        {
            Add(new Descriptor(name, options));
        }

        public IEnumerator<Descriptor> GetEnumerator()
        {
            return Descriptors.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return Descriptors.GetEnumerator();
        }
    }
}
