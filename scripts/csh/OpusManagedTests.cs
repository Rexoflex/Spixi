// EXECUTED: the REAL Spixi/VoIP/OpusDecoder.cs and OpusEncoder.cs (start → useManagedOnly → the factory) and the REAL
// SmallFixFlags of Spixi/Utils/SpixiFlags.cs, over the Concentus model of StubsOpus.cs and the stubbed Preferences / Logging.
// Shown here: with the switch ON (absent or any stored value but a 0 in dev mode) the property is false at EVERY Create —
// the first decoder or encoder of a process included, whichever comes first — so the model never reaches its native probe
// and returns the managed codec even with a native library present; with the switch OFF the property is untouched (the old
// path: the probe runs, the native codec is returned when present). And the switch block: keys, absent = ON, a stored 0
// acts only in dev mode, each key its own switch, the [FLAGS] line text (all 4), read() logs nothing, one line per process.
// NOT shown: the real Concentus package (the model is upstream's check written out; the real factory on Linux is the
// scratch proof in packet P103), the platforms' native loaders, the call sites in the platform players / recorders and
// VoiceClips.peaksCsvOf (they construct these wrappers and call start(); pin pins-fixb5/f-opus-managed reads that).
// DELIBERATE BREAKS (one mutation each in a copy, then node scripts/run-csh.mjs; the red tests in brackets):
//   o1 useManagedOnly `= false` → `= true` [on_decoder_is_managed_no_probe, on_encoder_is_managed_no_probe,
//      on_first_create_of_a_process_either_order]
//   o2 OpusDecoder.start: the `useManagedOnly();` line deleted [on_decoder_is_managed_no_probe, on_first_create_of_a_process_either_order]
//   o3 SmallFixFlags.read `Get(OpusManagedOnlyKey, 1)` → `, 0)` [on_decoder_is_managed_no_probe, flags_absent_is_all_on, flags_each_key_is_its_own_switch]
//   o5 SmallFixFlags.read `catch (Exception)` → `catch (InvalidOperationException)` (the stub's NullReferenceException escapes)
//      [flags_a_throwing_store_keeps_both_on]
//   o4 flagsLine `" declineclears="` → `" declineclears ="` [flags_line_text_all_4, flags_read_lazily_one_line_per_process]
using System;
using System.Collections.Generic;
using System.Reflection;
using Concentus;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.VoIP;

[TestClass]
public class OpusManagedTests
{
    private sealed class Sink : IAudioDecoderCallback, IAudioEncoderCallback
    {
        public void onDecodedData(byte[] data) { }
        public void onDecodedData(short[] data) { }
        public void onDecodedData(float[] data) { }
        public void onEncodedData(byte[] data) { }
    }

    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;

    /** A fresh process: the switches not read yet, the factory property at its default, no probe yet. */
    private static void freshProcess()
    {
        typeof(SmallFixFlags).GetField("state", BindingFlags.NonPublic | BindingFlags.Static)!.SetValue(null, -1);
        OpusCodecFactory.harnessReset();
        Lines.Clear();
    }

    /** One body over its own preference dictionary (devMode + the Opus key; null = absent); the dictionary found is put back. */
    private static void with(bool? dev, int? opus, Action body)
    {
        var before = new Dictionary<string, string>(P.d);
        try
        {
            P.d.Clear();
            if (dev != null) P.Set("devMode", dev.Value);
            if (opus != null) P.Set(SmallFixFlags.OpusManagedOnlyKey, opus.Value);
            freshProcess();
            body();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in before) P.d[kv.Key] = kv.Value;
            freshProcess();
        }
    }

    private static StubOpusCodec startDecoder()
    {
        var d = new OpusDecoder(48000, 1, new Sink(), OpusDecoderReturnType.shorts);
        d.start();
        var c = (StubOpusCodec)typeof(OpusDecoder).GetField("decoder", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(d)!;
        d.stop();
        return c;
    }

    private static StubOpusCodec startEncoder()
    {
        var e = new OpusEncoder(48000, 24000, 1, Concentus.Enums.OpusApplication.OPUS_APPLICATION_VOIP, new Sink());
        e.start();
        var c = (StubOpusCodec)typeof(OpusEncoder).GetField("encoder", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(e)!;
        e.stop();
        return c;
    }

    [TestMethod]
    public void on_decoder_is_managed_no_probe()
    {
        foreach (var (dev, opus) in new (bool?, int?)[] { (null, null), (false, null), (true, null), (false, 0), (true, 1), (true, 2) })
        {
            with(dev, opus, () =>
            {
                StubOpusCodec c = startDecoder();
                Assert.IsFalse(c.Native, "switch on (dev " + dev + ", key " + opus + "): the managed decoder");
                Assert.AreEqual(0, OpusCodecFactory.Probes, "switch on: the native probe never runs");
                Assert.AreEqual("False", string.Join(",", OpusCodecFactory.AllowAtCreate), "switch on: the property is false at the Create");
            });
        }
    }

    [TestMethod]
    public void on_encoder_is_managed_no_probe()
    {
        with(null, null, () =>
        {
            StubOpusCodec c = startEncoder();
            Assert.IsFalse(c.Native, "switch on: the managed encoder");
            Assert.AreEqual(0, OpusCodecFactory.Probes, "switch on: the native probe never runs");
            Assert.AreEqual("False", string.Join(",", OpusCodecFactory.AllowAtCreate));
        });
    }

    [TestMethod]
    public void on_first_create_of_a_process_either_order()
    {
        with(null, null, () =>
        {
            Assert.IsFalse(startEncoder().Native, "encoder first: managed");
            Assert.IsFalse(startDecoder().Native, "then the decoder: managed");
        });
        with(null, null, () =>
        {
            Assert.IsFalse(startDecoder().Native, "decoder first: managed");
            Assert.IsFalse(startEncoder().Native, "then the encoder: managed");
            Assert.IsFalse(startDecoder().Native, "a second decoder: managed");
            Assert.AreEqual("False,False,False", string.Join(",", OpusCodecFactory.AllowAtCreate));
            Assert.AreEqual(0, OpusCodecFactory.Probes);
        });
    }

    [TestMethod]
    public void off_is_the_old_path()
    {
        with(true, 0, () =>
        {
            Assert.IsTrue(startDecoder().Native, "switch off + a native library present: the native decoder (the old path)");
            Assert.IsTrue(startEncoder().Native, "switch off: the native encoder");
            Assert.AreEqual(2, OpusCodecFactory.Probes, "switch off: each Create reaches the probe");
            Assert.AreEqual("True,True", string.Join(",", OpusCodecFactory.AllowAtCreate), "switch off: the property is never written");
            Assert.IsTrue(OpusCodecFactory.AttemptToUseNativeLibrary);
        });
        with(true, 0, () =>
        {
            OpusCodecFactory.NativePresent = false;
            Assert.IsFalse(startDecoder().Native, "switch off, no native library: the managed decoder, as at the base");
            Assert.AreEqual(1, OpusCodecFactory.Probes);
        });
    }

    /* ===================== the switch block ===================== */

    private static string bitsWith(bool? dev, int? o, int? d)
    {
        P.d.Clear();
        if (dev != null) P.Set("devMode", dev.Value);
        if (o != null) P.Set(SmallFixFlags.OpusManagedOnlyKey, o.Value);
        if (d != null) P.Set(SmallFixFlags.DeclineClearsKey, d.Value);
        Lines.Clear();
        int b = SmallFixFlags.read();
        Assert.AreEqual(0, Lines.Count, "read() logs nothing");
        return ((b & 1) != 0 ? "1" : "0") + ((b & 2) != 0 ? "1" : "0");
    }

    private static void store(Action body) => with(null, null, body);

    [TestMethod]
    public void flags_keys()
    {
        Assert.AreEqual("flagOpusManagedOnly", SmallFixFlags.OpusManagedOnlyKey);
        Assert.AreEqual("flagDeclineClears", SmallFixFlags.DeclineClearsKey);
    }

    [TestMethod]
    public void flags_absent_is_all_on()
    {
        store(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                Assert.AreEqual("11", bitsWith(dev, null, null), "no key (dev " + dev + ") → both ON");
            }
            foreach (int v in new[] { 1, 2, -1, int.MaxValue, int.MinValue })
            {
                Assert.AreEqual("11", bitsWith(true, v, v), "stored " + v + " in dev mode → ON: only a 0 turns a switch off");
            }
        });
    }

    [TestMethod]
    public void flags_stored_zero_acts_only_in_dev_mode()
    {
        store(() =>
        {
            Assert.AreEqual("00", bitsWith(true, 0, 0), "dev on + both 0 → both OFF");
            Assert.AreEqual("11", bitsWith(false, 0, 0), "dev off + both 0 → both ON");
            Assert.AreEqual("11", bitsWith(null, 0, 0), "dev absent + both 0 → both ON");
        });
    }

    [TestMethod]
    public void flags_each_key_is_its_own_switch()
    {
        store(() =>
        {
            Assert.AreEqual("01", bitsWith(true, 0, null), "only opus at 0");
            Assert.AreEqual("10", bitsWith(true, null, 0), "only declineclears at 0");
            Assert.AreEqual("11", bitsWith(true, null, null));
            P.Set("flagLockSecondClock", 0);
            P.Set("flagLoadMoreOffUi", 0);
            Assert.AreEqual(3, SmallFixFlags.read(), "another batch's stored 0 changes neither");
        });
    }

    [TestMethod]
    public void flags_line_text_all_4()
    {
        var want = new[]
        {
            "[FLAGS] fixb5 opusmanaged=0 declineclears=0", "[FLAGS] fixb5 opusmanaged=1 declineclears=0",
            "[FLAGS] fixb5 opusmanaged=0 declineclears=1", "[FLAGS] fixb5 opusmanaged=1 declineclears=1",
        };
        for (int b = 0; b < 4; b++)
        {
            Assert.AreEqual(want[b], SmallFixFlags.flagsLine(b));
        }
    }

    [TestMethod]
    public void flags_read_lazily_one_line_per_process()
    {
        with(true, 0, () =>
        {
            Assert.AreEqual(0, Lines.Count, "nothing read or logged before the first use");
            Assert.IsFalse(SmallFixFlags.OpusManagedOnly);
            Assert.IsTrue(SmallFixFlags.DeclineClears);
            P.Set(SmallFixFlags.OpusManagedOnlyKey, 1);
            Assert.IsFalse(SmallFixFlags.OpusManagedOnly, "a store change after the first read acts at the next start");
            Assert.AreEqual("[FLAGS] fixb5 opusmanaged=0 declineclears=1", string.Join("|", Lines), "ONE line, at the first read");
        });
    }

    /** A store that throws keeps both ON. The stub throws by a null dictionary, so the FIRST read (devMode) throws; a throw after a
     *  devMode read of true (the catch resets dev to false) is not shown here: the stub cannot throw per key. */
    [TestMethod]
    public void flags_a_throwing_store_keeps_both_on()
    {
        Preferences was = Preferences.Default;
        try
        {
            Preferences.Default = new Preferences { d = null! };
            freshProcess();
            Assert.AreEqual(3, SmallFixFlags.read(), "a throwing store: both ON");
            Assert.AreEqual(0, Lines.Count, "read() logs nothing on a throw");
            Assert.IsFalse(startDecoder().Native, "a throwing store: the managed decoder");
            Assert.AreEqual(0, OpusCodecFactory.Probes);
        }
        finally
        {
            Preferences.Default = was;
            freshProcess();
        }
    }
}
