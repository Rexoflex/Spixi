using AVFoundation;

namespace Spixi
{
    public class SSpixiPermissions
    {
        public static void requestAudioRecordingPermissions()
        {
            AVAudioSession av_session = AVAudioSession.SharedInstance();
            if (av_session != null)
            {
                av_session.RequestRecordPermission(delegate (bool granted)
                {

                });
            }
        }

        // #334 AND-11: synchronous check so VoIPManager can GATE the accept.
        // Undetermined counts as NOT granted — the gate fires the request and
        // keeps the call ringing; a second Accept tap lands after the grant.
        public static bool hasAudioRecordingPermissions()
        {
            try
            {
                return AVAudioSession.SharedInstance()?.RecordPermission == AVAudioSessionRecordPermission.Granted;
            }
            catch
            {
                return false;
            }
        }
    }
}
