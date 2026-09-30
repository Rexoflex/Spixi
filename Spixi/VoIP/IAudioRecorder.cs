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
    }
}
