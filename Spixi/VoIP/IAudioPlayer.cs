using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace SPIXI.VoIP
{
    public interface IAudioPlayer : IDisposable
    {
        void start(string codec);

        void stop();

        bool isRunning();

        int write(byte[] audio_data);

        void setVolume(float volume);

        /* ★★ #1208 (S7) — A VOICE MESSAGE, not a call. A SEPARATE instance (VoiceClips makes its own with `new`; the call
         * keeps SAudioPlayer.Instance()), started this way instead of start(codec): the Opus decoder at 16 kHz mono, MEDIA
         * output on the LOUDSPEAKER (Android: USAGE_MEDIA + media focus, never VOICE_COMMUNICATION = the earpiece; iOS / Mac:
         * the Playback category), NO catch-up (the caller paces the writes in real time, so nothing is sped up or dropped),
         * and `onInterrupted` raised when the platform takes the audio away. write() takes the same
         * [int16 little-endian length][Opus packet] frames as a call. stop() ends either mode. */
        void startVoiceMessage(Action? onInterrupted);
    }
}
