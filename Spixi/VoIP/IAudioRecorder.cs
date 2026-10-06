using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace SPIXI.VoIP
{
    public interface IAudioRecorder : IDisposable
    {
        void setOnSoundDataReceived(Action<byte[]> on_sound_data_received);

        void start(string codec);

        void stop();

        bool isRunning();

        /* ★ #1074 (call premium): MUTE = the recorder keeps running and the encoder keeps
         * producing frames, but the PCM is zeroed first. It must NOT stop sending: the peer's
         * VoIPManager.lastPacketReceivedCheck hangs up after 10 s with no packets, so a
         * mute that went silent on the wire would end the call. Opus DTX is off (Concentus
         * default), so a zeroed buffer still encodes to normal frames. */
        void setMuted(bool muted);

        /* ★★ #1208 (S7) — A VOICE MESSAGE, not a call. The same recorder class, a SEPARATE instance (VoiceClips makes its
         * own with `new`; the call keeps SAudioRecorder.Instance()), started this way instead of start(codec): Opus at
         * `bitrate` (VoiceCodec.BitrateBps = 10 000) with the VOIP application (a call keeps 24 000 and its own
         * application), a MEDIA audio setup (Android: the MIC source and a media focus request; iOS / Mac: PlayAndRecord with
         * DefaultToSpeaker), and `onInterrupted` raised when the platform takes the audio away (Android focus loss, an iOS
         * session interruption) — VoiceClips then stops and keeps the clip. The data callback is unchanged: batches of
         * [int16 little-endian length][Opus packet], 20 ms per packet. stop() ends either mode. */
        void startVoiceMessage(int bitrate, Action? onInterrupted);
    }
}
