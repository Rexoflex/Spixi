/* ★ S16 (#1312 rule 1, L8 / #909, P03) — the PURE half of the walletpass move to SecureStorage. No MAUI, no Core type, no
 * disk: the harness executes every rule AND the store's whole decision core over a stub store (scripts/csh/S16PassTests.cs).
 * Spixi/Meta/WalletPassStore.cs is the thin platform shell: it implements IStore with Preferences + bounded SecureStorage
 * calls (each one inside Task.Run, waited with the bounds below) and calls coldStart / write / read / clear.
 * Pinned at the call sites by scripts/pins-s16/b-l8.mjs. Never a value or its length in a line this file builds. */
using System;

namespace SPIXI
{
    public static class S16PassRules
    {
        /** The one key, in BOTH stores: the plaintext Preferences key (legacy) and the SecureStorage key (its own store). */
        public const string PassKey = "walletpass";

        /* The bounds of the blocking waits (the cold-start read runs on the UI thread in App()). ColdReadMs bounds ONLY the
         * wait on the App() prefetch (a read already running since the top of App()); every other secure read — the
         * migration's and write()'s read-back, a fresh read — waits ReadBackMs. So a migrating cold start blocks at most
         * SetMs + ReadBackMs (3 s), a plain secure cold start at most ColdReadMs (3 s); readBoundMs is the one choice. */
        public const int ColdReadMs = 3000;
        public const int SetMs = 2000;
        public const int ReadBackMs = 1000;
        public const int RemoveMs = 1000;

        /** ★ S16 #46 r1 (R2 MINOR-1): the wait on one secure read — the cold bound only for the prefetch task taken by the
         *  first cold-start read, the read-back bound for everything else. */
        public static int readBoundMs(bool prefetchTaken)
        {
            return prefetchTaken ? ColdReadMs : ReadBackMs;
        }

        // —— the flags (SpixiFlags.init) ——

        /** A stored 0 turns a flag OFF only while dev mode is on (the S11ChatRules.effectiveContainer precedent); anything
         *  else — absent (1), 1, a stray value, dev mode off — is the default ON. */
        public static bool effectiveFlag(bool devMode, int stored)
        {
            return !(devMode && stored == 0);
        }

        /** `ixian:devflash:<securepass|mediagate>:<0|1>` — the tail after the name must be exactly "0" or "1". */
        public static bool parseFlagTail(string? tail, out int value)
        {
            value = 1;
            if (tail == "0") { value = 0; return true; }
            if (tail == "1") { value = 1; return true; }
            return false;
        }

        /** The one start line: fixed words and 0|1 only. */
        public static string flagsLine(bool securePass, bool mediaGate)
        {
            return "[FLAGS] securepass=" + (securePass ? "1" : "0") + " mediagate=" + (mediaGate ? "1" : "0");
        }

        // —— the cold-start source ——

        public enum Source { Migrate, Secure, Legacy, ReverseCopy }

        /** Flag ON: a plaintext value still present → MIGRATE it (verify-then-remove); else the secure value only.
         *  Flag OFF: the plaintext (legacy); absent → copy a secure value back (a flag flip never strands the user). */
        public static Source coldStartSource(bool flagOn, bool plainPresent)
        {
            if (flagOn)
            {
                return plainPresent ? Source.Migrate : Source.Secure;
            }
            return plainPresent ? Source.Legacy : Source.ReverseCopy;
        }

        public enum Plain { RemovePlain, KeepPlain }

        /** A secure write counts only when it did not fail AND reading it back gives the same string (ordinal). */
        public static bool writeVerified(bool writeFailed, string? readBack, string expected)
        {
            return !writeFailed && readBack != null && string.Equals(readBack, expected, StringComparison.Ordinal);
        }

        /** The plaintext goes only after a verified secure copy; ANY failure keeps it. */
        public static Plain migrateOutcome(bool writeFailed, string? readBack, string expected)
        {
            return writeVerified(writeFailed, readBack, expected) ? Plain.RemovePlain : Plain.KeepPlain;
        }

        // —— the log words ——

        public enum Read { Hit, Miss, Timeout, Error }

        public static string readWord(Read r)
        {
            switch (r)
            {
                case Read.Hit: return "hit";
                case Read.Miss: return "miss";
                case Read.Timeout: return "timeout";
                default: return "error";
            }
        }

        /** `[L8] store=<secure|legacy> read=<hit|miss|timeout|error> ms=<int> migrated=<0|1>` — never the value or its length. */
        public static string coldStartLine(bool flagOn, Read r, long ms, bool migrated)
        {
            return "[L8] store=" + (flagOn ? "secure" : "legacy") + " read=" + readWord(r) + " ms=" + Math.Max(0L, ms)
                + " migrated=" + (migrated ? "1" : "0");
        }

        /** A failure word reaches a log line only as a type name / fixed word: [A-Za-z0-9_], 1..48 chars, else "error". */
        public static string safeWord(string? word)
        {
            if (string.IsNullOrEmpty(word) || word.Length > 48)
            {
                return "error";
            }
            foreach (char c in word)
            {
                bool okc = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
                if (!okc)
                {
                    return "error";
                }
            }
            return word;
        }

        public static string writeFailedLine(string? word)
        {
            return "[L8] write failed (" + safeWord(word) + ")";
        }

        // —— the decision core (WalletPassStore implements IStore; the harness a stub) ——

        public interface IStore
        {
            bool plainHas();
            string plainGet();
            void plainSet(string value);
            void plainRemove();
            /** Bounded. Hit only with a non-null value. */
            Read secureGet(out string? value);
            /** Bounded. false on a throw or a timeout; failWord = the exception type name or "timeout". */
            bool secureSet(string value, out string? failWord);
            /** Bounded; never throws. */
            void secureRemove();
            /** The ms for the cold-start line (since the prefetch started, else since the read began). */
            long elapsedMs();
        }

        /** The cold-start read (Node.loadWallet). Returns the password, or null → the caller shows the retry view. A secure
         *  miss / timeout / error never falls back to plaintext (there is none on that leg by construction). `note` = an
         *  extra fixed-word line when a migration kept its source, else null. */
        public static string? coldStart(bool flagOn, IStore s, out string line, out string? note)
        {
            note = null;
            bool migrated = false;
            Read r;
            string? pass = null;
            switch (coldStartSource(flagOn, s.plainHas()))
            {
                case Source.Migrate:
                    {
                        pass = s.plainGet();
                        r = Read.Hit;
                        bool wrote = s.secureSet(pass, out string? word);
                        string? back = null;
                        if (wrote)
                        {
                            Read rb = s.secureGet(out back);
                            if (rb != Read.Hit)
                            {
                                back = null;
                                word = readWord(rb);
                            }
                            else if (!string.Equals(back, pass, StringComparison.Ordinal))
                            {
                                word = "mismatch";
                            }
                        }
                        if (migrateOutcome(!wrote, back, pass) == Plain.RemovePlain)
                        {
                            s.plainRemove();
                            migrated = true;
                        }
                        else
                        {
                            note = "[L8] migrate kept plaintext (" + safeWord(word) + ")";
                        }
                        break;
                    }
                case Source.Secure:
                    r = s.secureGet(out pass);
                    if (r != Read.Hit)
                    {
                        pass = null;
                    }
                    break;
                case Source.Legacy:
                    pass = s.plainGet();
                    r = Read.Hit;
                    break;
                default:   // ReverseCopy
                    {
                        r = s.secureGet(out string? sec);
                        if (r == Read.Hit && sec != null)
                        {
                            pass = sec;
                            s.plainSet(sec);
                            /* ★ S16 #46 r1 (R2 NIT-1): this re-read hits MAUI Preferences' in-memory copy, so it proves the Set
                             * call, not the disk; kept as a cheap guard on this dev-only (flag OFF) path. */
                            if (s.plainHas() && string.Equals(s.plainGet(), sec, StringComparison.Ordinal))
                            {
                                s.secureRemove();
                                migrated = true;
                            }
                            else
                            {
                                note = "[L8] reverse copy kept secure (mismatch)";
                            }
                        }
                        else
                        {
                            pass = null;
                        }
                        break;
                    }
            }
            line = coldStartLine(flagOn, r, s.elapsedMs(), migrated);
            return pass;
        }

        /** Store a password the caller has VERIFIED. Flag ON: secure write → read back → compare; true only on equal, the
         *  plaintext is never written; it is removed on success, and on failure only when it differs from `pass`.
         *  Flag OFF: the legacy plaintext Set. */
        public static bool write(bool flagOn, IStore s, string pass, out string? failWord)
        {
            failWord = null;
            if (!flagOn)
            {
                s.plainSet(pass);
                return true;
            }
            if (!s.secureSet(pass, out failWord))
            {
                dropStalePlain(s, pass);
                return false;
            }
            Read rb = s.secureGet(out string? back);
            if (!writeVerified(false, rb == Read.Hit ? back : null, pass))
            {
                failWord = rb == Read.Hit ? "mismatch" : readWord(rb);
                dropStalePlain(s, pass);
                return false;
            }
            if (s.plainHas())
            {
                s.plainRemove();
            }
            return true;
        }

        /** ★ S16 #46 r1 (R2 MINOR-2): after a failed flag-ON write, a plaintext value that DIFFERS from the verified new
         *  password is known-wrong (an old password left by a failed migration) — remove it; an equal one is still the live
         *  password on a device whose secure store fails, so it stays. Never a plaintext write. */
        private static void dropStalePlain(IStore s, string pass)
        {
            if (s.plainHas() && !string.Equals(s.plainGet(), pass, StringComparison.Ordinal))
            {
                s.plainRemove();
            }
        }

        /** The current value (BackupPage), in the cold start's own order: a plaintext still present is what the cold start
         *  used (an unfinished migration, or flag OFF); else the secure value. null = none / unreadable. */
        public static string? read(IStore s)
        {
            if (s.plainHas())
            {
                return s.plainGet();
            }
            return s.secureGet(out string? v) == Read.Hit ? v : null;
        }

        /** The wipe and "no wallet file": both stores. */
        public static void clear(IStore s)
        {
            s.secureRemove();
            s.plainRemove();
        }
    }
}
