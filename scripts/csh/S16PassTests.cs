// ★ S16 a-l8 (#1312 rule 1, L8 / #909) — the walletpass store, EXECUTED (Spixi/Utils/S16PassRules.cs): the flag rule, the
// cold-start sources, the verify-then-remove rule, the log lines, and the WHOLE decision core of WalletPassStore over a stub
// store (a SecureStorage that can miss, time out, throw, or read back something else). The platform shell
// (Spixi/Meta/WalletPassStore.cs: Task.Run + bounded waits, the iOS accessible) is MAUI-bound — scripts/pins-s16/b-l8.mjs.
using System;
using System.Collections.Generic;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S16PassTests
{
    /** A stub of both stores. `ops` records every call in order. */
    private sealed class Stub : S16PassRules.IStore
    {
        public string? plain;                 // null = the key is absent
        public string? secure;                // null = no secure value
        public S16PassRules.Read getMode = S16PassRules.Read.Hit;   // Timeout / Error = every secure read fails that way
        public string? setFails = null;       // a type name / "timeout" = every secure write fails
        public string? readBackOverride = null; // a secure read returns this instead (a corrupt store)
        public bool plainSetDrops = false;    // the plaintext Set does not stick
        public readonly List<string> ops = new List<string>();

        public bool plainHas() { ops.Add("plainHas"); return plain != null; }
        public string plainGet() { ops.Add("plainGet"); return plain ?? ""; }
        public void plainSet(string v) { ops.Add("plainSet"); if (!plainSetDrops) plain = v; }
        public void plainRemove() { ops.Add("plainRemove"); plain = null; }
        public S16PassRules.Read secureGet(out string? value)
        {
            ops.Add("secureGet");
            value = null;
            if (getMode != S16PassRules.Read.Hit) return getMode;
            string? v = readBackOverride ?? secure;
            if (v == null) return S16PassRules.Read.Miss;
            value = v;
            return S16PassRules.Read.Hit;
        }
        public bool secureSet(string value, out string? failWord)
        {
            ops.Add("secureSet");
            failWord = setFails;
            if (setFails != null) return false;
            secure = value;
            return true;
        }
        public void secureRemove() { ops.Add("secureRemove"); secure = null; }
        public long elapsedMs() { return 42; }
    }

    private const string P = "correct horse battery";

    [TestMethod]
    public void flag_zero_acts_only_in_dev_mode()
    {
        Assert.IsTrue(S16PassRules.effectiveFlag(false, 1), "absent/1, dev off → ON");
        Assert.IsTrue(S16PassRules.effectiveFlag(true, 1), "1, dev on → ON");
        Assert.IsTrue(S16PassRules.effectiveFlag(false, 0), "a stored 0 with dev mode OFF does nothing (a user who left dev mode gets the default)");
        Assert.IsFalse(S16PassRules.effectiveFlag(true, 0), "stored 0 + dev mode → OFF");
        Assert.IsTrue(S16PassRules.effectiveFlag(true, 7), "a stray value → ON");
        Assert.IsTrue(S16PassRules.effectiveFlag(true, -1), "negative → ON");
    }

    [TestMethod]
    public void flag_verb_tail_is_exactly_0_or_1()
    {
        Assert.IsTrue(S16PassRules.parseFlagTail("0", out int v0) && v0 == 0, "0");
        Assert.IsTrue(S16PassRules.parseFlagTail("1", out int v1) && v1 == 1, "1");
        Assert.IsFalse(S16PassRules.parseFlagTail("", out _), "empty");
        Assert.IsFalse(S16PassRules.parseFlagTail(null, out _), "null");
        Assert.IsFalse(S16PassRules.parseFlagTail("01", out _), "two digits");
        Assert.IsFalse(S16PassRules.parseFlagTail("true", out _), "a word");
        Assert.IsFalse(S16PassRules.parseFlagTail("1:0", out _), "a second colon");
    }

    [TestMethod]
    public void cold_start_sources_cover_the_four_cases()
    {
        Assert.AreEqual(S16PassRules.Source.Migrate, S16PassRules.coldStartSource(true, true), "flag on + plaintext → migrate");
        Assert.AreEqual(S16PassRules.Source.Secure, S16PassRules.coldStartSource(true, false), "flag on, no plaintext → secure only");
        Assert.AreEqual(S16PassRules.Source.Legacy, S16PassRules.coldStartSource(false, true), "flag off + plaintext → legacy");
        Assert.AreEqual(S16PassRules.Source.ReverseCopy, S16PassRules.coldStartSource(false, false), "flag off, no plaintext → copy back");
    }

    [TestMethod]
    public void verify_then_remove_needs_an_ordinal_equal_read_back()
    {
        Assert.AreEqual(S16PassRules.Plain.RemovePlain, S16PassRules.migrateOutcome(false, P, P), "written + same read back → remove");
        Assert.AreEqual(S16PassRules.Plain.KeepPlain, S16PassRules.migrateOutcome(true, P, P), "the write threw → keep");
        Assert.AreEqual(S16PassRules.Plain.KeepPlain, S16PassRules.migrateOutcome(false, null, P), "read back nothing → keep");
        Assert.AreEqual(S16PassRules.Plain.KeepPlain, S16PassRules.migrateOutcome(false, P.ToUpperInvariant(), P), "case differs → keep (ordinal)");
        Assert.AreEqual(S16PassRules.Plain.KeepPlain, S16PassRules.migrateOutcome(false, P + " ", P), "trailing space → keep");
        Assert.IsFalse(S16PassRules.writeVerified(false, "", P), "empty read back");
        Assert.IsTrue(S16PassRules.writeVerified(false, "", ""), "the rule itself is plain equality");
    }

    [TestMethod]
    public void log_lines_are_fixed_words_and_ints_only()
    {
        Assert.AreEqual("[L8] store=secure read=hit ms=12 migrated=1", S16PassRules.coldStartLine(true, S16PassRules.Read.Hit, 12, true), "secure line");
        Assert.AreEqual("[L8] store=legacy read=miss ms=0 migrated=0", S16PassRules.coldStartLine(false, S16PassRules.Read.Miss, -5, false), "legacy line, ms clamped");
        Assert.AreEqual("[L8] store=secure read=timeout ms=3001 migrated=0", S16PassRules.coldStartLine(true, S16PassRules.Read.Timeout, 3001, false), "timeout");
        Assert.AreEqual("[L8] store=secure read=error ms=1 migrated=0", S16PassRules.coldStartLine(true, S16PassRules.Read.Error, 1, false), "error");
        Assert.AreEqual("[FLAGS] securepass=1 mediagate=0", S16PassRules.flagsLine(true, false), "flags line");
        Assert.AreEqual("[L8] write failed (KeyStoreException)", S16PassRules.writeFailedLine("KeyStoreException"), "a type name passes");
        Assert.AreEqual("[L8] write failed (error)", S16PassRules.writeFailedLine("my secret pass"), "anything with a space → error");
        Assert.AreEqual("[L8] write failed (error)", S16PassRules.writeFailedLine(null), "null → error");
        Assert.AreEqual("error", S16PassRules.safeWord(new string('a', 49)), "over 48 chars → error");
        Assert.AreEqual("error", S16PassRules.safeWord("a/b"), "a path character → error");
    }

    // —— the decision core over the stub ——

    [TestMethod]
    public void migrate_success_removes_plaintext_after_the_verified_copy()
    {
        var s = new Stub { plain = P };
        string? pass = S16PassRules.coldStart(true, s, out string line, out string? note);
        Assert.AreEqual(P, pass, "the plaintext value opens the wallet this start");
        Assert.IsTrue(s.plain == null && s.secure == P, "plaintext gone, secure holds it");
        Assert.AreEqual("[L8] store=secure read=hit ms=42 migrated=1", line, "line");
        Assert.IsTrue(note == null, "no note");
        int set = s.ops.IndexOf("secureSet"), get = s.ops.IndexOf("secureGet"), rm = s.ops.IndexOf("plainRemove");
        Assert.IsTrue(set >= 0 && get > set && rm > get, "write → read back → only then remove: " + string.Join(",", s.ops));
    }

    [TestMethod]
    public void migrate_failures_keep_the_plaintext_and_still_open()
    {
        var threw = new Stub { plain = P, setFails = "KeyStoreException" };
        Assert.AreEqual(P, S16PassRules.coldStart(true, threw, out string l1, out string? n1), "write threw → plaintext value returned");
        Assert.IsTrue(threw.plain == P && !threw.ops.Contains("plainRemove"), "plaintext kept");
        Assert.AreEqual("[L8] store=secure read=hit ms=42 migrated=0", l1, "line");
        Assert.AreEqual("[L8] migrate kept plaintext (KeyStoreException)", n1, "note names the type");

        var timeout = new Stub { plain = P, setFails = "timeout" };
        S16PassRules.coldStart(true, timeout, out _, out string? n2);
        Assert.IsTrue(timeout.plain == P, "a write timeout keeps it");
        Assert.AreEqual("[L8] migrate kept plaintext (timeout)", n2, "note");

        var corrupt = new Stub { plain = P, readBackOverride = "something else" };
        Assert.AreEqual(P, S16PassRules.coldStart(true, corrupt, out _, out string? n3), "mismatch → plaintext value");
        Assert.IsTrue(corrupt.plain == P, "a read back that differs keeps it");
        Assert.AreEqual("[L8] migrate kept plaintext (mismatch)", n3, "note");

        var miss = new Stub { plain = P, getMode = S16PassRules.Read.Timeout };
        S16PassRules.coldStart(true, miss, out _, out string? n4);
        Assert.IsTrue(miss.plain == P, "a read-back timeout keeps it");
        Assert.AreEqual("[L8] migrate kept plaintext (timeout)", n4, "note");
    }

    [TestMethod]
    public void secure_leg_never_falls_back_to_plaintext()
    {
        var hit = new Stub { secure = P };
        Assert.AreEqual(P, S16PassRules.coldStart(true, hit, out string l1, out _), "hit");
        Assert.AreEqual("[L8] store=secure read=hit ms=42 migrated=0", l1, "line");

        foreach (var mode in new[] { S16PassRules.Read.Timeout, S16PassRules.Read.Error })
        {
            var s = new Stub { secure = P, getMode = mode };
            Assert.IsTrue(S16PassRules.coldStart(true, s, out string l, out _) == null, mode + " → null (the retry view)");
            Assert.IsTrue(!s.ops.Contains("plainGet") && !s.ops.Contains("plainSet"), mode + ": the plaintext is never read or written");
            Assert.AreEqual("[L8] store=secure read=" + S16PassRules.readWord(mode) + " ms=42 migrated=0", l, "line");
        }
        var none = new Stub();
        Assert.IsTrue(S16PassRules.coldStart(true, none, out string l3, out _) == null, "miss → null");
        Assert.AreEqual("[L8] store=secure read=miss ms=42 migrated=0", l3, "line");
    }

    [TestMethod]
    public void flag_off_is_legacy_and_copies_a_secure_value_back()
    {
        var legacy = new Stub { plain = P, secure = "stale" };
        Assert.AreEqual(P, S16PassRules.coldStart(false, legacy, out string l1, out _), "legacy reads the plaintext");
        Assert.IsTrue(!legacy.ops.Contains("secureGet") && !legacy.ops.Contains("secureSet"), "and never touches the secure store");
        Assert.AreEqual("[L8] store=legacy read=hit ms=42 migrated=0", l1, "line");

        var back = new Stub { secure = P };
        Assert.AreEqual(P, S16PassRules.coldStart(false, back, out string l2, out _), "flag flipped off after a migration: the secure value opens");
        Assert.IsTrue(back.plain == P && back.secure == null, "copied back to plaintext, then the secure one removed");
        Assert.IsTrue(back.ops.IndexOf("secureRemove") > back.ops.LastIndexOf("plainGet"), "remove only after the copy verified: " + string.Join(",", back.ops));
        Assert.AreEqual("[L8] store=legacy read=hit ms=42 migrated=1", l2, "line");

        var dropped = new Stub { secure = P, plainSetDrops = true };
        Assert.AreEqual(P, S16PassRules.coldStart(false, dropped, out _, out string? n3), "a copy that did not stick still opens");
        Assert.IsTrue(dropped.secure == P, "the secure value is kept");
        Assert.AreEqual("[L8] reverse copy kept secure (mismatch)", n3, "note");

        var none = new Stub();
        Assert.IsTrue(S16PassRules.coldStart(false, none, out _, out _) == null, "nothing anywhere → null");
    }

    [TestMethod]
    public void write_on_is_secure_verified_and_never_plaintext()
    {
        var s = new Stub { plain = "old" };
        Assert.IsTrue(S16PassRules.write(true, s, P, out string? w0), "verified write");
        Assert.IsTrue(s.secure == P && s.plain == null && w0 == null, "secure holds it, the stale plaintext is removed");
        Assert.IsTrue(!s.ops.Contains("plainSet"), "never a plaintext write");

        var threw = new Stub { plain = "old", setFails = "IOException" };
        Assert.IsFalse(S16PassRules.write(true, threw, P, out string? w1), "a throw → false");
        Assert.AreEqual("IOException", w1, "word");
        Assert.IsTrue(!threw.ops.Contains("plainSet"), "no plaintext write on failure either");
        Assert.IsTrue(threw.plain == null, "★ #46 r1 MINOR-2: a plaintext that DIFFERS from the verified new password is removed on failure");
        var same = new Stub { plain = P, setFails = "IOException" };
        Assert.IsFalse(S16PassRules.write(true, same, P, out _), "false");
        Assert.IsTrue(same.plain == P && !same.ops.Contains("plainRemove"), "an EQUAL plaintext stays (still the live password)");

        var corrupt = new Stub { plain = "old", readBackOverride = "x" };
        Assert.IsFalse(S16PassRules.write(true, corrupt, P, out string? w2), "a different read back → false");
        Assert.AreEqual("mismatch", w2, "word");
        Assert.IsTrue(corrupt.plain == null, "the read-back failure also drops a differing plaintext");

        var rbTimeout = new Stub { getMode = S16PassRules.Read.Timeout };
        Assert.IsFalse(S16PassRules.write(true, rbTimeout, P, out string? w3), "read-back timeout → false");
        Assert.AreEqual("timeout", w3, "word");
    }

    [TestMethod]
    public void write_off_is_the_legacy_plaintext_set()
    {
        var s = new Stub();
        Assert.IsTrue(S16PassRules.write(false, s, P, out _), "true");
        Assert.IsTrue(s.plain == P && !s.ops.Contains("secureSet"), "plaintext, no secure call");
    }

    [TestMethod]
    public void read_follows_the_cold_start_order_and_clear_empties_both()
    {
        Assert.AreEqual(P, S16PassRules.read(new Stub { plain = P, secure = "older" }), "a plaintext still present is what the cold start used");
        Assert.AreEqual(P, S16PassRules.read(new Stub { secure = P }), "else the secure value");
        Assert.IsTrue(S16PassRules.read(new Stub()) == null, "none → null (BackupPage refuses)");
        Assert.IsTrue(S16PassRules.read(new Stub { secure = P, getMode = S16PassRules.Read.Error }) == null, "unreadable → null");

        var c = new Stub { plain = P, secure = P };
        S16PassRules.clear(c);
        Assert.IsTrue(c.plain == null && c.secure == null, "both stores empty");
    }
}
