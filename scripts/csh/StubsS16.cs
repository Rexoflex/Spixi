// ★ S16 #46 r1 (R4 MAJOR-4) — harness-only stubs so the REAL Spixi/Meta/WalletPassStore.cs (+ SpixiFlags.cs) compile and
// run here: a MAUI-shaped SecureStorage (ISecureStorage, SecureStorage.Default) over an in-memory dictionary with
// switchable failures / delays, and the three Preferences members the store uses that Stubs.cs does not have (as
// extension methods, so Stubs.cs stays untouched). Shapes follow maui-SecureStorage.shared.cs (MAUI 10.0.71).
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.Maui.Storage
{
    public interface ISecureStorage
    {
        Task<string?> GetAsync(string key);
        Task SetAsync(string key, string value);
        bool Remove(string key);
        void RemoveAll();
    }

    public sealed class FakeSecureStorage : ISecureStorage
    {
        public readonly Dictionary<string, string> d = new Dictionary<string, string>();
        public int getDelayMs, setDelayMs, removeDelayMs;
        public bool throwOnGet, throwOnSet;
        public int gets, sets, removes;
        public readonly List<string> removedKeys = new List<string>();

        public void reset()
        {
            lock (d) { d.Clear(); }
            getDelayMs = setDelayMs = removeDelayMs = 0;
            throwOnGet = throwOnSet = false;
            gets = sets = removes = 0;
            removedKeys.Clear();
        }

        public async Task<string?> GetAsync(string key)
        {
            Interlocked.Increment(ref gets);
            if (getDelayMs > 0) await Task.Delay(getDelayMs);
            if (throwOnGet) throw new InvalidOperationException("stub get");
            lock (d) { return d.TryGetValue(key, out var v) ? v : null; }
        }

        public async Task SetAsync(string key, string value)
        {
            Interlocked.Increment(ref sets);
            if (setDelayMs > 0) await Task.Delay(setDelayMs);
            if (throwOnSet) throw new InvalidOperationException("stub set");
            lock (d) { d[key] = value; }
        }

        public bool Remove(string key)
        {
            Interlocked.Increment(ref removes);
            if (removeDelayMs > 0) Thread.Sleep(removeDelayMs);   // Android's Remove is synchronous (maui-SecureStorage.android.cs)
            lock (d) { removedKeys.Add(key); return d.Remove(key); }
        }

        public void RemoveAll()
        {
            lock (d) { d.Clear(); }
        }
    }

    public static class SecureStorage
    {
        public static readonly FakeSecureStorage Fake = new FakeSecureStorage();
        public static ISecureStorage Default => Fake;
    }

    public static class PreferencesS16StubExt
    {
        public static bool ContainsKey(this Preferences p, string k) => p.d.ContainsKey(k);
        public static int Get(this Preferences p, string k, int def) => p.d.TryGetValue(k, out var v) && int.TryParse(v, out int n) ? n : def;
        public static void Set(this Preferences p, string k, int v) { p.d[k] = v.ToString(); }
    }
}
