// VENDORED — DO NOT EDIT BY HAND (#920, Session AC, route B: Mac Catalyst without the BE engineer).
// Source: https://github.com/curiosity-ai/rocksdb-sharp @ f1cf0ba0306fa01b55efa2292c1cc44ee3192b88 (csharp/src/RocksSafePath.cs), BSD-2-Clause (LICENSE
// beside this folder) — the commit the dev's RocksDB.0.0.42.nupkg names in its nuspec metadata (his DLL is a
// MODIFIED build of it: a static __Internal binding for iOS/Android; this is the public source). Compiled for the
// maccatalyst TFM ONLY (the csproj removes Platforms/MacCatalyst/**/*.cs from every other TFM).
// The ONLY edited file is AutoNativeImport.cs (the Catalyst patch, marked "#920"); this file is
// identical to upstream below this header (modulo BOM, CRLF and the final newline). Re-vendor: see README.md beside this folder.
#nullable disable
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Linq;

namespace RocksDbSharp
{
    public class RocksSafePath : IDisposable
    {
        public IntPtr Handle { get; private set; }

        public RocksSafePath(string path)
        {
            var enc = new System.Text.UTF8Encoding(false, false);
            byte[] utf16  = enc.GetBytes(path);
            Handle = Marshal.AllocHGlobal(utf16.Length + 1);
            Marshal.Copy(utf16, 0, Handle, utf16.Length);
            Marshal.WriteByte(Handle, utf16.Length, 0); //Add the null-terminator to the byte sequence
        }

        public void Dispose()
        {
            //Disabled disposing, as it seems RocksDB actually save some of these strings without copying
            //This should be tied to the lifetime of the RocksDB object
            //if(Handle != IntPtr.Zero)
            //{
                //Marshal.FreeHGlobal(Handle);
                //Handle = IntPtr.Zero;
            //}
        }
    }
}
