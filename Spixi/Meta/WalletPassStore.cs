/* ★ S16 (#1312 rule 1, L8 / #909, P03, flag SpixiFlags.SecureWalletPass) — where the wallet password lives.
 * The thin platform shell around S16PassRules (the decision core, executed over a stub in scripts/csh/S16PassTests.cs).
 * MAUI 10.0.71 facts behind the shape (maui-SecureStorage.*.cs):
 *   · Windows PlatformGetAsync/SetAsync AWAIT DataProtectionProvider on the caller's SynchronizationContext → blocking the
 *     UI thread on them directly can deadlock. So EVERY SecureStorage call here runs inside Task.Run (no context; the
 *     awaits continue on the pool) and the caller waits with a bound (S16PassRules.*Ms). Android's Remove is synchronous
 *     and builds EncryptedSharedPreferences — it goes through Task.Run + a bound too.
 *   · iOS / Mac: Keychain; the default accessible is AfterFirstUnlock (iCloud-backup-able). Writes here use
 *     AfterFirstUnlockThisDeviceOnly (the SecureStorageExtensions.SetAsync overload). The Keychain SURVIVES an uninstall →
 *     App() calls clear() when no wallet file exists.
 *   · The secure store is its own container (alias <pkg>.microsoft.maui.essentials.preferences), so the wipe's
 *     Preferences.Default.Clear() does not reach it → the wipe calls clear().
 * All secure calls are serialized by one gate (never two EncryptedSharedPreferences builds at once on Android).
 * Log lines: fixed words, enum words, ints and exception TYPE names only — never the value or its length. */
using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI
{
    public static class WalletPassStore
    {
        private const string Key = S16PassRules.PassKey;

        private static readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
        private static readonly object prefetchLock = new object();
        private static Task<SecureResult>? prefetchTask = null;
        private static Stopwatch? coldWatch = null;
        /* ★ S16 #46 r1 (R2 MINOR-4): the no-wallet clear() runs without a wait; every later secure call awaits it FIRST
         * (explicit order — not left to the semaphore's queue), so a create's write can never be overtaken by it. */
        private static volatile Task pendingClear = Task.CompletedTask;

        private struct SecureResult
        {
            public string? value;
            public string? error;   // exception type name, null = no throw
        }

        /** App() top, before `new Node()`: with the flag on, a wallet file present (★ #46 r1 MINOR-4: a no-wallet launch
         *  never builds the secure store) and no plaintext left to migrate, start the secure read now so it overlaps the
         *  rest of the start (Node.loadWallet waits for it, bounded). */
        public static void prefetch(bool walletPresent)
        {
            try
            {
                if (!SpixiFlags.SecureWalletPass || !walletPresent || Preferences.Default.ContainsKey(Key))
                {
                    return;
                }
                lock (prefetchLock)
                {
                    coldWatch = Stopwatch.StartNew();
                    prefetchTask = Task.Run(() => secureGetCore());
                }
            }
            catch (Exception ex)
            {
                Logging.warn("[L8] prefetch failed (" + ex.GetType().Name + ")");
            }
        }

        /** Node.loadWallet (cold start, the restore paths): the stored password, or false → the caller shows the retry
         *  view. Flag ON never reads the plaintext except to migrate it (S16PassRules.coldStart). */
        public static bool readForColdStart(out string? pass)
        {
            pass = null;
            bool flagOn = SpixiFlags.SecureWalletPass;
            try
            {
                lock (prefetchLock)
                {
                    if (coldWatch == null)
                    {
                        coldWatch = Stopwatch.StartNew();
                    }
                }
                pass = S16PassRules.coldStart(flagOn, new Store(true), out string line, out string? note);
                Logging.info(line);
                if (note != null)
                {
                    Logging.warn(note);
                }
            }
            catch (Exception ex)
            {
                pass = null;
                Logging.error("[L8] cold start read failed (" + ex.GetType().Name + ")");
            }
            finally
            {
                lock (prefetchLock)
                {
                    coldWatch = null;
                    prefetchTask = null;   // one-shot: a later read is a fresh one
                }
            }
            return pass != null;
        }

        /** Store a password the caller has VERIFIED (it opened the wallet). false = not stored (logged); the caller goes on —
         *  the next cold start then asks for the password once (the retry view). */
        public static bool write(string pass)
        {
            invalidatePrefetch();
            try
            {
                if (S16PassRules.write(SpixiFlags.SecureWalletPass, new Store(false), pass, out string? failWord))
                {
                    return true;
                }
                Logging.error(S16PassRules.writeFailedLine(failWord));
            }
            catch (Exception ex)
            {
                Logging.error(S16PassRules.writeFailedLine(ex.GetType().Name));
            }
            return false;
        }

        /** The current password (BackupPage), bounded; null = none / unreadable. */
        public static string? read()
        {
            try
            {
                return S16PassRules.read(new Store(false));
            }
            catch (Exception ex)
            {
                Logging.error("[L8] read failed (" + ex.GetType().Name + ")");
                return null;
            }
        }

        /** The wipe (wait = true, bounded) + App() with no wallet file (wait = false — the UI thread never waits; a stale
         *  iOS Keychain value survives an uninstall): both stores. */
        public static void clear(bool wait = true)
        {
            invalidatePrefetch();
            try
            {
                S16PassRules.clear(new Store(false, wait));
            }
            catch (Exception ex)
            {
                Logging.error("[L8] clear failed (" + ex.GetType().Name + ")");
            }
        }

        private static void invalidatePrefetch()
        {
            lock (prefetchLock)
            {
                prefetchTask = null;
            }
        }

        // —— the bounded platform calls (each ONE Task.Run around the SecureStorage call; never on the caller's context) ——

        private static async Task<SecureResult> secureGetCore()
        {
            await pendingClear.ConfigureAwait(false);
            await gate.WaitAsync().ConfigureAwait(false);
            try
            {
                string? v = await SecureStorage.Default.GetAsync(Key).ConfigureAwait(false);
                return new SecureResult { value = v };
            }
            catch (Exception ex)
            {
                return new SecureResult { error = ex.GetType().Name };
            }
            finally
            {
                gate.Release();
            }
        }

        private static S16PassRules.Read waitGet(Task<SecureResult> t, int ms, out string? value)
        {
            value = null;
            try
            {
                if (!t.Wait(ms))
                {
                    return S16PassRules.Read.Timeout;
                }
            }
            catch (Exception)
            {
                return S16PassRules.Read.Error;
            }
            SecureResult r = t.Result;
            if (r.error != null)
            {
                Logging.warn("[L8] secure read threw (" + S16PassRules.safeWord(r.error) + ")");
                return S16PassRules.Read.Error;
            }
            if (r.value == null)
            {
                return S16PassRules.Read.Miss;
            }
            value = r.value;
            return S16PassRules.Read.Hit;
        }

        private sealed class Store : S16PassRules.IStore
        {
            private readonly bool coldStart;
            private readonly bool waitRemove;

            public Store(bool coldStart, bool waitRemove = true)
            {
                this.coldStart = coldStart;
                this.waitRemove = waitRemove;
            }

            public bool plainHas()
            {
                return Preferences.Default.ContainsKey(Key);
            }

            public string plainGet()
            {
                return Preferences.Default.Get(Key, "");
            }

            public void plainSet(string value)
            {
                Preferences.Default.Set(Key, value);
            }

            public void plainRemove()
            {
                Preferences.Default.Remove(Key);
            }

            public S16PassRules.Read secureGet(out string? value)
            {
                Task<SecureResult>? t = null;
                if (coldStart)
                {
                    lock (prefetchLock)
                    {
                        t = prefetchTask;       // the App() prefetch serves the FIRST cold-start read only
                        prefetchTask = null;
                    }
                }
                // ★ #46 r1 (R2 MINOR-1): the cold bound only for that prefetch; a read-back / fresh read waits ReadBackMs
                int ms = S16PassRules.readBoundMs(t != null);
                if (t == null)
                {
                    t = Task.Run(() => secureGetCore());
                }
                return waitGet(t, ms, out value);
            }

            public bool secureSet(string value, out string? failWord)
            {
                failWord = null;
                invalidatePrefetch();
                Task<string?> t = Task.Run<string?>(async () =>
                {
                    await pendingClear.ConfigureAwait(false);
                    await gate.WaitAsync().ConfigureAwait(false);
                    try
                    {
#if IOS || MACCATALYST
                        // ★ L8: ThisDeviceOnly — never in an iCloud / encrypted-backup restore to another device.
                        await SecureStorage.Default.SetAsync(Key, value, global::Security.SecAccessible.AfterFirstUnlockThisDeviceOnly).ConfigureAwait(false);
#else
                        await SecureStorage.Default.SetAsync(Key, value).ConfigureAwait(false);
#endif
                        return (string?)null;
                    }
                    catch (Exception ex)
                    {
                        return ex.GetType().Name;
                    }
                    finally
                    {
                        gate.Release();
                    }
                });
                try
                {
                    if (!t.Wait(S16PassRules.SetMs))
                    {
                        failWord = "timeout";
                        return false;
                    }
                }
                catch (Exception ex)
                {
                    failWord = ex.GetType().Name;
                    return false;
                }
                failWord = t.Result;
                return failWord == null;
            }

            public void secureRemove()
            {
                Task<string?> t = Task.Run<string?>(async () =>
                {
                    await gate.WaitAsync().ConfigureAwait(false);
                    try
                    {
                        SecureStorage.Default.Remove(Key);
                        return (string?)null;
                    }
                    catch (Exception ex)
                    {
                        return ex.GetType().Name;
                    }
                    finally
                    {
                        gate.Release();
                    }
                });
                if (!waitRemove)
                {
                    pendingClear = t;   // no wait (the no-wallet start); every later secure call awaits it first
                    return;
                }
                try
                {
                    if (!t.Wait(S16PassRules.RemoveMs))
                    {
                        Logging.warn("[L8] secure remove timeout");
                    }
                    else if (t.Result != null)
                    {
                        Logging.warn("[L8] secure remove threw (" + S16PassRules.safeWord(t.Result) + ")");
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("[L8] secure remove failed (" + ex.GetType().Name + ")");
                }
            }

            public long elapsedMs()
            {
                lock (prefetchLock)
                {
                    return coldWatch != null ? coldWatch.ElapsedMilliseconds : 0;
                }
            }
        }
    }
}
