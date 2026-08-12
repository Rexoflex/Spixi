using Android;
using AndroidX.Core.Content;
using IXICore.Meta;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Spixi
{
    public class SSpixiPermissions
    {
        static int recordAudioPermissionRequest = 1;

        public static void requestAudioRecordingPermissions()
        {
            try
            {
                if (PermissionChecker.CheckSelfPermission(MainActivity.Instance, Manifest.Permission.RecordAudio) != PermissionChecker.PermissionGranted)
                {
                    MainActivity.Instance.RequestPermissions(new string[] { Manifest.Permission.RecordAudio }, recordAudioPermissionRequest);
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception occured while requesting permissions for audio recording: " + e);
            }
        }

        // #334 AND-11: synchronous check so VoIPManager can GATE the accept —
        // the request above is ASYNC (returns with the OS dialog still up).
        public static bool hasAudioRecordingPermissions()
        {
            try
            {
                return PermissionChecker.CheckSelfPermission(MainActivity.Instance, Manifest.Permission.RecordAudio) == PermissionChecker.PermissionGranted;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
