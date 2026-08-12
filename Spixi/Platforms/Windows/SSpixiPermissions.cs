
namespace Spixi
{
    public class SSpixiPermissions
    {
        public static void requestAudioRecordingPermissions()
        {

        }

        // #334 AND-11: no runtime mic gate on Windows — always granted.
        public static bool hasAudioRecordingPermissions()
        {
            return true;
        }
    }
}
