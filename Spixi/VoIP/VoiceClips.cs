/* ═══ ★★ #1208 (S7) — VOICE MESSAGES, THE AUDIO HALF ═══
 * One process-wide recording session and one process-wide player, both for VOICE MESSAGES only. A call never touches
 * this file: it keeps SAudioRecorder.Instance() / SAudioPlayer.Instance() (24 000 bit/s, its own stream types). Here
 * every clip gets its OWN platform instance (`new SAudioRecorder()` / `new SAudioPlayer()`) started in the voice mode
 * (startVoiceMessage: VoiceCodec.BitrateBps with the VOIP application · MEDIA output on the loudspeaker).
 *
 * RECORDING — the recorder's callback delivers BATCHES of [int16 little-endian length][Opus packet] (every platform
 * recorder: OpusEncoder.encodeFrame frames, collected until ≥ 150 bytes, then handed over in one array). The batch is
 * split here into raw packets (each 1..VoiceCodec.MaxPacketBytes; a malformed tail is dropped). At
 * MaxDurationMs / FrameMs packets (30 s) the recording stops and the clip is KEPT. An INTERRUPT (the page leaves, the app
 * goes to the background, a call starts, the platform takes the audio, a voice clip starts to play) = stop and keep.
 * The kept clips live in MEMORY ONLY, keyed by the chat's address, at most KeptCap chats (the oldest goes); ✕ (cancel)
 * or ➤ (send) ends one. Nothing of a clip is ever written to disk here (the FILE route's .ogg is the page's).
 *
 * PLAYBACK — one clip at a time. The page hands in packets C# itself parsed (VoiceCodec.tryParseInline /
 * tryDemuxOgg, both bounded); a dedicated thread writes them to the platform player PACED IN REAL TIME (at most
 * PlayLeadMs ahead of the clock), so the position pushed every PlayTickMs is the clip's real progress, and pause =
 * drop the player (and its short lead) and remember the position; resume = a fresh player from that packet.
 *
 * A call in progress (VoIPManager.isInitiated) → a recording is refused (`busy`) and a play does nothing (a log line).
 * VoIPManager calls interruptAll when a call starts (initiateCall / onReceivedCall).
 *
 * THREADS — every public method may be called from any thread. `gate` guards the state; no platform call (start,
 * stop, write) is made while holding it. Pushes go through IVoiceHost, which marshals to the main thread.
 * SECURITY — no audio byte, path or name crosses into the WebView: the host pushes a state word, milliseconds, the row
 * id C# itself pushed, and (★ S8 picks #1239) the live mic level as ONE integer 0–100. Logs carry fixed words and exception TYPES only — never an id, an address, a length of a
 * peer's data or a path. */
using IXICore.Meta;
using Spixi;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI.VoIP
{
    /** The chat page as VoiceClips sees it. Called from any thread; the page marshals to the main thread. */
    public interface IVoiceHost
    {
        /** The chat's own address (the kept-clip key); "" = no conversation. */
        string voiceChatKey { get; }

        /** false once the page is torn down — a recording is then stopped and kept, a playback stopped. */
        bool voiceHostAlive { get; }

        /** V6 `voiceRec(state, elapsedMs)`. `stillValid` (optional) is asked again ON the main thread right before the push
         *  (#46 r1 B m-3: a `recording` resync posted just before the recording ended must not land after its `stopped`). */
        void pushVoiceRec(string state, int elapsedMs, Func<bool>? stillValid = null);

        /** V5 `voiceState(idHex, state, posMs, durMs)`. */
        void pushVoiceState(string idHex, string state, int posMs, int durMs);

        /** ★ S8 picks (#1239) `voiceRecLevel(level)`: the live mic level 0–100 while recording (VoiceLevel.Gate: one per
         *  100 ms cell of the recording clock = 10/s, ≥ 50 ms apart). `stillValid` is asked again ON the main thread (the
         *  recording may have ended since). */
        void pushVoiceRecLevel(int level, Func<bool>? stillValid = null);
    }

    public enum VoiceRecStart
    {
        Started,     // a recording runs for this chat (now, or already)
        Kept,        // this chat holds a kept clip — it is ✕ or ➤ first (nothing is lost by a stray tap)
        Busy,        // a call is in progress
        Denied,      // no microphone permission (the OS request was fired)
        Error        // the recorder did not start
    }

    public static class VoiceClips
    {
        public const int RecTickMs = 1000;            // the `recording` resync push
        public const int PlayTickMs = 200;            // the `playing` position push
        public const int PlayLeadMs = 120;            // how far the player is fed ahead of the clock
        public const int PlayTailMs = 250;            // the end waits for the device to play the lead out
        public const int KeptCap = 16;                // chats with a kept clip (memory only)
        public const int MaxRecPackets = VoiceCodec.MaxDurationMs / VoiceCodec.FrameMs;   // 1500 = 30 s
        public const int RecBackstopMs = VoiceCodec.MaxDurationMs + 3000;                 // a stalled mic still ends
        public const int JoinMs = 1000;
        /* the waveform decode keeps at most this many samples (31 s at 16 kHz + one 120 ms frame) — a peer's packets that
           claim long frames cannot grow the buffer past it */
        public const int MaxPcmSamples = VoiceCodec.ParseMaxDurationMs * (VoiceCodec.SampleRate / 1000) + 1920;

        private static readonly object gate = new object();

        // ---- recording (under gate) ----
        private static IAudioRecorder? recorder = null;
        private static IVoiceHost? recHost = null;
        private static string? recKey = null;
        private static List<byte[]>? recPackets = null;
        private static Stopwatch? recClock = null;
        private static Timer? recTimer = null;
        private static VoiceLevel.Gate? recLevelGate = null;   // ★ S8 picks (#1239): the level push throttle of the live recording
        private static int recGen = 0;   // bumped by every start and end: a stale callback / tick is a no-op
        /* #46 r1 A M6: while endRecording stops the recorder, the recorder FLUSHES its last buffered packets to the callback
           (voice mode, every platform) — they land in the ending clip: flushGen = that recording's generation, flushPackets
           = its list. Cleared once the recorder has stopped. */
        private static int flushGen = -1;
        /* #46 r2: the recording being STARTED (not yet published) — its early packets land here (startRecording) */
        private static int startingGen = -1;
        private static List<byte[]>? startingPackets = null;
        private static List<byte[]>? flushPackets = null;
        private static readonly Dictionary<string, List<byte[]>> kept = new Dictionary<string, List<byte[]>>(StringComparer.Ordinal);
        private static readonly List<string> keptOrder = new List<string>();

        // ---- playback (under gate) ----
        private static IVoiceHost? playHost = null;
        private static string? playId = null;
        private static List<byte[]>? playPackets = null;
        private static int playDurMs = 0;
        private static int playFrom = 0;          // the packet the next run starts at
        private static bool playPaused = false;
        private static int playGen = 0;           // bumped by every run start, pause and stop
        private static int playPosMs = 0;         // the running clip's position (written by its thread)
        private static Thread? playThread = null;
        private static Thread? lastRunThread = null;   // the newest run thread — the next one waits for it (#46 r1 A M8)

        /* ════════════════ RECORDING ════════════════ */

        /** The kept clip of `key` in ms (0 = none). */
        public static int keptMs(string? key)
        {
            if (string.IsNullOrEmpty(key))
            {
                return 0;
            }
            lock (gate)
            {
                return kept.TryGetValue(key, out List<byte[]>? k) ? k.Count * VoiceCodec.FrameMs : 0;
            }
        }

        /** ★ lead (#46 r3 MINOR-2): is a recording running (or starting) anywhere? A finished download must not cut it.
         *  (`startingGen` is set and cleared inside startRecording on the main thread: it matters only to a reader on another thread.) */
        public static bool isRecording
        {
            get
            {
                lock (gate)
                {
                    return recorder != null || startingGen >= 0;
                }
            }
        }

        /** The live recording's length for `host` in ms, or -1 when `host` is not recording. */
        public static int recordingMs(IVoiceHost host)
        {
            lock (gate)
            {
                return recorder != null && recHost == host && recPackets != null ? recPackets.Count * VoiceCodec.FrameMs : -1;
            }
        }

        /** V7 `ixian:voicerec:start`. Main thread (the platform permission request needs it). */
        public static VoiceRecStart startRecording(IVoiceHost host)
        {
            string key = host.voiceChatKey;
            if (string.IsNullOrEmpty(key))
            {
                return VoiceRecStart.Error;
            }
            if (VoIPManager.isInitiated())
            {
                Logging.info("Voice: recording refused (busy)");
                return VoiceRecStart.Busy;
            }
            lock (gate)
            {
                if (kept.ContainsKey(key))
                {
                    return VoiceRecStart.Kept;
                }
                if (recorder != null && recHost == host)
                {
                    return VoiceRecStart.Started;   // already recording here (a repeated tap) — the page re-pushes the state
                }
            }
            if (!SSpixiPermissions.hasAudioRecordingPermissions())
            {
                try
                {
                    SSpixiPermissions.requestAudioRecordingPermissions();
                }
                catch (Exception e)
                {
                    Logging.warn("Voice: the permission request failed (" + e.GetType().Name + ")");
                }
                Logging.info("Voice: recording refused (denied)");
                return VoiceRecStart.Denied;
            }
            endRecording(true, "switch", true);   // another chat's recording: stopped and kept there
            stopPlayback(true);                   // the microphone and the player share one audio session

            IAudioRecorder r = new SAudioRecorder();   // NOT Instance(): the call's recorder is never borrowed
            /* #46 r2 MINOR: the recorder is STARTED before it is published, then published under `gate` only if no call
               began and nothing else took the generation meanwhile — a concurrent interruptAll (an incoming call on the
               network thread) can never meet a published-but-not-started recorder and leave the mic running unowned.
               Packets that arrive between the start and the publish go to startingPackets (same generation). */
            int gen;
            List<byte[]> packets = new List<byte[]>(MaxRecPackets);
            lock (gate)
            {
                gen = ++recGen;
                startingGen = gen;
                startingPackets = packets;
            }
            try
            {
                r.setOnSoundDataReceived((data) => onRecData(gen, data));
                r.setOnVoiceLevel((level) => onRecLevel(gen, level));   // ★ S8 picks (#1239): the live wave (voice mode only)
                r.startVoiceMessage(VoiceCodec.BitrateBps, () => interruptAll("focus"));
                if (!r.isRunning())
                {
                    throw new InvalidOperationException("the recorder is not running");
                }
            }
            catch (Exception e)
            {
                bool focusBusy = e is AudioFocusBusyException;   // ★ 7b (#1224 (4)): the platform holds the audio → `busy`, not an error
                if (focusBusy)
                {
                    Logging.info("Voice: recording refused (focus)");
                }
                else
                {
                    Logging.warn("Voice: the recorder failed to start (" + e.GetType().Name + ")");
                }
                lock (gate)
                {
                    if (startingGen == gen)
                    {
                        startingGen = -1;
                        startingPackets = null;
                    }
                }
                try { r.Dispose(); } catch (Exception) { }
                return focusBusy ? VoiceRecStart.Busy : VoiceRecStart.Error;
            }
            bool published = false;
            bool callNow = false;
            lock (gate)
            {
                if (startingGen == gen)
                {
                    startingGen = -1;
                    startingPackets = null;
                }
                /* #46 r1 A M1 + r2: a call that started since the check above (its interruptAll ran before this recording
                   existed), or another start that took the generation — re-checked under `gate`, right before the publish */
                callNow = VoIPManager.isInitiated();
                if (!callNow && recGen == gen && recorder == null)
                {
                    recorder = r;
                    recHost = host;
                    recKey = key;
                    recPackets = packets;
                    recClock = Stopwatch.StartNew();
                    recTimer = new Timer((_) => recTick(gen), null, RecTickMs, RecTickMs);
                    recLevelGate = new VoiceLevel.Gate();
                    published = true;
                }
            }
            if (!published)
            {
                try { r.Dispose(); } catch (Exception) { }   // lost the race: this recorder never had an owner — it stops here
                Logging.info(callNow ? "Voice: recording refused (busy)" : "Voice: recording refused (raced)");
                return callNow ? VoiceRecStart.Busy : VoiceRecStart.Error;
            }
            Logging.info("Voice: recording started");
            return VoiceRecStart.Started;
        }

        /** V7 `ixian:voicerec:cancel` — the live recording and the kept clip of this chat are dropped. */
        public static void cancelRecording(IVoiceHost host)
        {
            string key = host.voiceChatKey;
            bool mine;
            lock (gate)
            {
                mine = recorder != null && string.Equals(recKey, key, StringComparison.Ordinal);
            }
            if (mine)
            {
                endRecording(false, "cancel", false);
            }
            lock (gate)
            {
                removeKeptLocked(key);
            }
            Logging.info("Voice: recording cancelled");
        }

        /** V7 `ixian:voicerec:send` — the clip to send (the live recording, else the kept one), taken out of the store;
         *  null = nothing recorded. A send that fails gives it back (keepAgain). */
        public static List<byte[]>? takeForSend(IVoiceHost host)
        {
            string key = host.voiceChatKey;
            if (string.IsNullOrEmpty(key))
            {
                return null;
            }
            bool live;
            lock (gate)
            {
                live = recorder != null && string.Equals(recKey, key, StringComparison.Ordinal);
            }
            List<byte[]>? packets = live ? endRecording(false, "send", false) : null;
            lock (gate)
            {
                if (packets == null && kept.TryGetValue(key, out List<byte[]>? k))
                {
                    packets = k;
                }
                removeKeptLocked(key);
            }
            return packets != null && packets.Count > 0 ? packets : null;
        }

        /** A send that failed: the clip goes back to the chat's bar (kept). */
        public static void keepAgain(string? key, List<byte[]>? packets)
        {
            if (string.IsNullOrEmpty(key) || packets == null || packets.Count == 0)
            {
                return;
            }
            lock (gate)
            {
                putKeptLocked(key, packets);
            }
        }

        /** A new document of `host`'s chat (onLoad): a recording of this chat still running (a WebView reload, a reopen
         *  within the liveness tick) is stopped and kept, this host's clip stops playing — no push (the shell is new).
         *  Returns the kept clip's ms (0 = none) — the page pushes `stopped` with it. */
        public static int documentLoaded(IVoiceHost host)
        {
            string key = host.voiceChatKey;
            bool sameChat;
            bool playing;
            lock (gate)
            {
                sameChat = recorder != null && string.Equals(recKey, key, StringComparison.Ordinal);
                playing = playHost == host;
            }
            if (sameChat)
            {
                endRecording(true, "reload", false);
            }
            if (playing)
            {
                stopPlayback(false);
            }
            return keptMs(key);
        }

        /** The page leaves (OnDisappearing): stop and keep its recording, stop its clip. */
        public static void interruptHost(IVoiceHost host, string why)
        {
            bool rec;
            bool play;
            lock (gate)
            {
                rec = recorder != null && recHost == host;
                play = playHost == host;
            }
            if (rec)
            {
                endRecording(true, why, true);
            }
            if (play)
            {
                stopPlayback(true);
            }
        }

        /** The app goes to the background, a call starts, the platform took the audio: stop and keep, stop playing. */
        public static void interruptAll(string why)
        {
            try
            {
                endRecording(true, why, true);
                stopPlayback(true);
            }
            catch (Exception e)
            {
                Logging.warn("Voice: interrupt failed (" + e.GetType().Name + ")");
            }
        }

        /** The recorder's callback (its sender thread): split the batch into packets. */
        private static void onRecData(int gen, byte[] data)
        {
            if (data == null)
            {
                return;
            }
            bool full = false;
            lock (gate)
            {
                bool live = gen == recGen && recPackets != null;
                List<byte[]>? target = live ? recPackets : (gen == flushGen ? flushPackets : (gen == startingGen ? startingPackets : null));
                if (target == null)
                {
                    return;   // a stale callback (another recording, or after the flush)
                }
                int o = 0;
                while (o + 2 <= data.Length)
                {
                    int len = data[o] | (data[o + 1] << 8);   // OpusEncoder.encodeFrame: BitConverter = little-endian
                    o += 2;
                    if (len < 1 || len > VoiceCodec.MaxPacketBytes || o + len > data.Length)
                    {
                        break;   // a malformed tail is dropped, never guessed
                    }
                    if (target.Count >= MaxRecPackets)
                    {
                        break;
                    }
                    byte[] p = new byte[len];
                    Buffer.BlockCopy(data, o, p, 0, len);
                    target.Add(p);
                    o += len;
                }
                full = live && target.Count >= MaxRecPackets;
            }
            if (full)
            {
                // ★ #1208 (1): 30 s — the recording stops and waits (kept). Never on the recorder's own thread.
                Task.Run(() =>
                {
                    bool still;
                    lock (gate)
                    {
                        still = gen == recGen;
                    }
                    if (still)
                    {
                        endRecording(true, "full", true);
                    }
                });
            }
        }

        /** ★ S8 picks (#1239) — the recorder's level callback (its capture thread): the LIVE recording of `gen` only (a
         *  starting / ending / stale one pushes nothing), throttled by VoiceLevel.Gate (one push per 100 ms cell of the
         *  recording clock = 10/s on every platform, ≥ 50 ms apart, the PEAK since the last push; #46 r1 A MINOR-1).
         *  Only the integer leaves — to the page, which posts it to the main thread and re-checks isLiveRecording there. Never logged, never stored. */
        private static void onRecLevel(int gen, int level)
        {
            IVoiceHost? h;
            int send;
            lock (gate)
            {
                if (gen != recGen || recorder == null || recHost == null || recClock == null || recLevelGate == null)
                {
                    return;
                }
                if (!recLevelGate.offer(recClock.ElapsedMilliseconds, level, out send))
                {
                    return;
                }
                h = recHost;
            }
            h.pushVoiceRecLevel(send, () => isLiveRecording(gen));
        }

        /** Every RecTickMs: the liveness check, the backstop, the `recording` resync. A Timer thread. */
        private static void recTick(int gen)
        {
            IVoiceHost? h;
            int ms;
            long wall;
            lock (gate)
            {
                if (gen != recGen || recorder == null || recPackets == null || recClock == null)
                {
                    return;
                }
                h = recHost;
                ms = recPackets.Count * VoiceCodec.FrameMs;
                wall = recClock.ElapsedMilliseconds;
            }
            if (h == null || !h.voiceHostAlive)
            {
                endRecording(true, "left", false);   // the page is gone — the clip waits in the store for the next open
                return;
            }
            if (wall >= RecBackstopMs)
            {
                endRecording(true, "backstop", true);
                return;
            }
            h.pushVoiceRec("recording", ms, () => isLiveRecording(gen));   // #46 r1 B m-3: re-checked on the main thread
        }

        /** Is `gen` still the running recording? (the main-thread re-check of a posted `recording` push) */
        private static bool isLiveRecording(int gen)
        {
            lock (gate)
            {
                return gen == recGen && recorder != null;
            }
        }

        /** End the live recording (if any). keep → the clip goes to the store and, when `push`, its host hears `stopped`
         *  (an empty clip: `idle`); returns null. !keep → the packets are RETURNED (send) — the caller owns them. */
        private static List<byte[]>? endRecording(bool keep, string why, bool push)
        {
            IAudioRecorder? r;
            IVoiceHost? h;
            string? key;
            List<byte[]>? packets;
            Timer? t;
            lock (gate)
            {
                if (recorder == null)
                {
                    return null;
                }
                r = recorder;
                h = recHost;
                key = recKey;
                packets = recPackets;
                t = recTimer;
                flushGen = recGen;          // #46 r1 A M6: the stop's flush still lands in THIS clip
                flushPackets = packets;
                clearRecordingLocked();
                recGen++;
            }
            try { t?.Dispose(); } catch (Exception) { }
            try
            {
                r.Dispose();   // = stop(): the platform recorder flushes its tail (voice mode), then releases the audio session
            }
            catch (Exception e)
            {
                Logging.warn("Voice: the recorder failed to stop (" + e.GetType().Name + ")");
            }
            lock (gate)
            {
                if (flushPackets == packets)
                {
                    flushGen = -1;
                    flushPackets = null;
                }
            }
            if (!keep)
            {
                return packets;
            }
            int ms = packets != null ? packets.Count * VoiceCodec.FrameMs : 0;
            if (key != null && packets != null && packets.Count > 0)
            {
                lock (gate)
                {
                    putKeptLocked(key, packets);
                }
                Logging.info("Voice: recording stopped and kept (" + why + ")");
            }
            if (push && h != null && h.voiceHostAlive)
            {
                h.pushVoiceRec(ms > 0 ? "stopped" : "idle", ms);
            }
            return null;
        }

        private static void clearRecordingLocked()
        {
            recorder = null;
            recHost = null;
            recKey = null;
            recPackets = null;
            recClock = null;
            recTimer = null;
            recLevelGate = null;   // ★ S8 picks (#1239)
        }

        private static void putKeptLocked(string key, List<byte[]> packets)
        {
            kept[key] = packets;
            keptOrder.Remove(key);
            keptOrder.Add(key);
            while (keptOrder.Count > KeptCap)
            {
                kept.Remove(keptOrder[0]);   // bounded: the oldest chat's clip goes
                keptOrder.RemoveAt(0);
            }
        }

        private static void removeKeptLocked(string key)
        {
            kept.Remove(key);
            keptOrder.Remove(key);
        }

        /* ════════════════ PLAYBACK ════════════════ */

        /** V8, the toggle half: `idHex` of `host` is the current clip → playing: pause · paused: resume. false = it is
         *  not (the caller then parses the clip and calls play). */
        public static bool toggleIfCurrent(IVoiceHost host, string idHex)
        {
            bool paused;
            lock (gate)
            {
                if (playHost != host || playPackets == null || !string.Equals(playId, idHex, StringComparison.Ordinal))
                {
                    return false;
                }
                paused = playPaused;
            }
            if (paused)
            {
                resumePlayback();
            }
            else
            {
                pausePlayback();
            }
            return true;
        }

        /** V8: play a clip C# parsed (bounded). Any clip playing stops; a recording is stopped and kept.
         *  #46 r1 A M8: the old clip's end, the new clip's state and its run thread are ONE critical section with a fresh
         *  generation; the new run thread first waits for every earlier run thread (each disposes its player — the shared
         *  audio session / volume stream — before a newer one creates its own), then checks its generation. */
        public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)
        {
            int dur = durMs > 0 ? durMs : (packets != null ? packets.Count * VoiceCodec.FrameMs : 0);
            if (VoIPManager.isInitiated())
            {
                Logging.info("Voice: play refused (call active)");
                host.pushVoiceState(idHex, "stopped", 0, dur);   // §7: a tap during a call is answered, never silent
                return;
            }
            if (packets == null || packets.Count == 0 || packets.Count > VoiceCodec.MaxPackets)
            {
                host.pushVoiceState(idHex, "error", 0, 0);
                return;
            }
            endRecording(true, "play", true);
            IVoiceHost? oldHost = null;
            string? oldId = null;
            int oldDur = 0;
            Thread? t = null;
            lock (gate)
            {
                // #46 r1 A M1: re-checked under `gate`, right before the clip is published
                if (!VoIPManager.isInitiated())
                {
                    oldHost = playHost;
                    oldId = playId;
                    oldDur = playDurMs;
                    playGen++;   // the old run (if any) ends
                    playHost = host;
                    playId = idHex;
                    playPackets = packets;
                    playDurMs = dur;
                    playFrom = 0;
                    playPaused = false;
                    Volatile.Write(ref playPosMs, 0);
                    t = newRunLocked();
                }
            }
            if (t == null)
            {
                Logging.info("Voice: play refused (call active)");
                host.pushVoiceState(idHex, "stopped", 0, dur);
                return;
            }
            t.Start();
            // #46 r2 NIT: the same row re-played on the same host gets only its new run's `playing` — no `stopped` around it
            bool sameRow = oldHost == host && string.Equals(oldId, idHex, StringComparison.Ordinal);
            if (oldId != null && oldHost != null && !sameRow && oldHost.voiceHostAlive)
            {
                oldHost.pushVoiceState(oldId, "stopped", 0, oldDur);
            }
        }

        /** #46 r1 B m-10: a deleted row (local or remote) that is the current clip stops. */
        public static void stopIfCurrent(IVoiceHost host, string idHex)
        {
            bool mine;
            lock (gate)
            {
                mine = playHost == host && string.Equals(playId, idHex, StringComparison.Ordinal);
            }
            if (mine)
            {
                stopPlayback(true);
            }
        }

        /** Stop the clip (if any); `push` → its host hears `stopped` (position 0). */
        public static void stopPlayback(bool push)
        {
            Thread? t;
            IVoiceHost? h;
            string? id;
            int dur;
            lock (gate)
            {
                if (playId == null)
                {
                    return;
                }
                h = playHost;
                id = playId;
                dur = playDurMs;
                t = playThread;
                playGen++;
                clearPlaybackLocked();
            }
            join(t);
            if (push && h != null && h.voiceHostAlive)
            {
                h.pushVoiceState(id, "stopped", 0, dur);
            }
        }

        private static void pausePlayback()
        {
            Thread? t;
            IVoiceHost? h;
            string? id;
            int dur;
            int pos;
            lock (gate)
            {
                if (playId == null || playPaused || playPackets == null)
                {
                    return;
                }
                pos = Math.Min(Volatile.Read(ref playPosMs), playPackets.Count * VoiceCodec.FrameMs);
                playFrom = pos / VoiceCodec.FrameMs;
                playPaused = true;
                playGen++;
                t = playThread;
                playThread = null;
                h = playHost;
                id = playId;
                dur = playDurMs;
            }
            join(t);   // the run thread disposes its player before this returns
            if (h != null && h.voiceHostAlive)
            {
                h.pushVoiceState(id, "paused", Math.Min(pos, dur), dur);
            }
        }

        private static void resumePlayback()
        {
            if (VoIPManager.isInitiated())
            {
                Logging.info("Voice: play refused (call active)");
                stopPlayback(true);   // §7: a tap during a call → `stopped` with the clip's length
                return;
            }
            Thread? t = null;
            lock (gate)
            {
                if (playId == null || !playPaused || VoIPManager.isInitiated())
                {
                    return;
                }
                playPaused = false;
                t = newRunLocked();
            }
            t?.Start();
        }

        private static void clearPlaybackLocked()
        {
            playHost = null;
            playId = null;
            playPackets = null;
            playDurMs = 0;
            playFrom = 0;
            playPaused = false;
            playThread = null;
            Volatile.Write(ref playPosMs, 0);
        }

        /** A new run thread for the published clip (under `gate`; the caller starts it). It waits for `lastRunThread` first. */
        private static Thread? newRunLocked()
        {
            IVoiceHost? h = playHost;
            string? id = playId;
            List<byte[]>? pk = playPackets;
            if (h == null || id == null || pk == null)
            {
                return null;
            }
            int gen = ++playGen;
            int from = playFrom;
            int dur = playDurMs;
            IVoiceHost runHost = h;
            string runId = id;
            List<byte[]> runPackets = pk;
            Thread? prev = lastRunThread;
            Thread t = new Thread(() => playLoop(gen, runHost, runId, runPackets, from, dur, prev));
            t.IsBackground = true;
            t.Name = "VoiceClip";
            playThread = t;
            lastRunThread = t;
            return t;
        }

        /** The run thread: feed the player in real time, push the position, end (or fail) the clip. It owns its player. */
        private static void playLoop(int gen, IVoiceHost host, string id, List<byte[]> packets, int from, int durMs, Thread? prev)
        {
            IAudioPlayer? p = null;
            bool ended = false;
            bool failed = false;
            /* #46 r1 A M8: an earlier run disposes its player (iOS SetActive(false), Android's volume-stream restore) before
               this one creates its own — then the generation decides whether this run still owns the clip */
            join(prev);
            lock (gate)
            {
                if (playGen != gen || VoIPManager.isInitiated())
                {
                    return;   // superseded (or a call started) before a player existed — nothing to dispose
                }
            }
            try
            {
                p = new SAudioPlayer();   // NOT Instance(): the call's player is never borrowed
                p.startVoiceMessage(() => interruptAll("focus"));
                if (!p.isRunning())
                {
                    throw new InvalidOperationException("the player is not running");
                }
                int count = packets.Count;
                long totalMs = (long)count * VoiceCodec.FrameMs;
                long startMs = (long)from * VoiceCodec.FrameMs;
                if (Volatile.Read(ref playGen) == gen)
                {
                    host.pushVoiceState(id, "playing", (int)Math.Min(startMs, durMs), durMs);
                }
                Stopwatch clock = Stopwatch.StartNew();
                int next = from;
                long lastPush = 0;
                while (Volatile.Read(ref playGen) == gen)
                {
                    long pos = startMs + clock.ElapsedMilliseconds;
                    Volatile.Write(ref playPosMs, (int)Math.Min(pos, totalMs));
                    if (next < count && (long)next * VoiceCodec.FrameMs < pos + PlayLeadMs)
                    {
                        p.write(framesOf(packets, ref next, pos + PlayLeadMs));
                    }
                    if (pos >= totalMs + PlayTailMs)
                    {
                        ended = true;
                        break;
                    }
                    if (!host.voiceHostAlive)
                    {
                        break;   // the page is gone: nobody to tell
                    }
                    long now = clock.ElapsedMilliseconds;
                    if (now - lastPush >= PlayTickMs)
                    {
                        lastPush = now;
                        host.pushVoiceState(id, "playing", (int)Math.Min(pos, durMs), durMs);
                    }
                    Thread.Sleep(10);
                }
            }
            catch (Exception e)
            {
                failed = true;
                Logging.warn("Voice: playback failed (" + e.GetType().Name + ")");
            }
            finally
            {
                try { p?.Dispose(); } catch (Exception) { }
            }
            if (!ended && !failed)
            {
                if (!host.voiceHostAlive)
                {
                    lock (gate)
                    {
                        if (playGen == gen)
                        {
                            playGen++;
                            clearPlaybackLocked();
                        }
                    }
                }
                return;   // paused or stopped by another call — it pushed its own state
            }
            bool mine;
            lock (gate)
            {
                mine = playGen == gen;
                if (mine)
                {
                    playGen++;
                    clearPlaybackLocked();
                }
            }
            if (mine && host.voiceHostAlive)
            {
                host.pushVoiceState(id, failed ? "error" : "stopped", 0, durMs);
            }
        }

        /** The packets from `next` whose start is before `untilMs`, as ONE write in the call frame format
         *  [int16 little-endian length][packet]… (what OpusDecoder.decode reads). */
        private static byte[] framesOf(List<byte[]> packets, ref int next, long untilMs)
        {
            int end = next;
            int size = 0;
            while (end < packets.Count && (long)end * VoiceCodec.FrameMs < untilMs)
            {
                size += 2 + packets[end].Length;
                end++;
            }
            byte[] buf = new byte[size];
            int o = 0;
            for (int i = next; i < end; i++)
            {
                byte[] pk = packets[i];
                buf[o] = (byte)(pk.Length & 0xFF);
                buf[o + 1] = (byte)((pk.Length >> 8) & 0xFF);
                Buffer.BlockCopy(pk, 0, buf, o + 2, pk.Length);
                o += 2 + pk.Length;
            }
            next = end;
            return buf;
        }

        private static void join(Thread? t)
        {
            if (t == null || t == Thread.CurrentThread)
            {
                return;
            }
            try
            {
                t.Join(JoinMs);
            }
            catch (Exception)
            {
            }
        }

        /* ════════════════ THE WAVEFORM (V4) ════════════════ */

        /** The clip's waveform: every packet decoded once with OpusDecoder (16 kHz mono) → VoiceCodec.peaks → the csv.
         *  null = a packet does not decode. Call OFF the UI and network threads. Bounded: ≤ VoiceCodec.MaxPackets packets of
         *  ≤ MaxPacketBytes, ≤ MaxPcmSamples kept. */
        public static string? peaksCsvOf(List<byte[]>? packets)
        {
            if (packets == null || packets.Count == 0 || packets.Count > VoiceCodec.MaxPackets)
            {
                return null;
            }
            PcmCollector pcm = new PcmCollector(MaxPcmSamples);
            OpusDecoder decoder = new OpusDecoder(VoiceCodec.SampleRate, 1, pcm, OpusDecoderReturnType.shorts);
            try
            {
                decoder.start();
                int i = 0;
                foreach (byte[] pk in packets)
                {
                    if (pk == null || pk.Length < 1 || pk.Length > VoiceCodec.MaxPacketBytes)
                    {
                        return null;
                    }
                    int one = i;
                    decoder.decode(framesOf(packets, ref one, ((long)i + 1) * VoiceCodec.FrameMs));
                    i++;
                }
                return VoiceCodec.peaksCsv(VoiceCodec.peaks(pcm.toArray(), VoiceCodec.PeakCount));
            }
            catch (Exception e)
            {
                Logging.warn("Voice: decode failed (" + e.GetType().Name + ")");
                return null;
            }
            finally
            {
                try { decoder.stop(); } catch (Exception) { }
            }
        }

        /** OpusDecoder's sink for the waveform: the decoded samples, capped. */
        private sealed class PcmCollector : IAudioDecoderCallback
        {
            private readonly int cap;
            private readonly List<short> samples;

            public PcmCollector(int cap)
            {
                this.cap = cap;
                samples = new List<short>(Math.Min(cap, 64 * 1024));
            }

            public void onDecodedData(short[] data)
            {
                int room = cap - samples.Count;
                if (data == null || room <= 0)
                {
                    return;
                }
                if (data.Length <= room)
                {
                    samples.AddRange(data);
                }
                else
                {
                    samples.AddRange(new ArraySegment<short>(data, 0, room));
                }
            }

            public void onDecodedData(byte[] data)
            {
                // the decoder is built with OpusDecoderReturnType.shorts — never called
            }

            public void onDecodedData(float[] data)
            {
                // the decoder is built with OpusDecoderReturnType.shorts — never called
            }

            public short[] toArray()
            {
                return samples.ToArray();
            }
        }
    }
}
