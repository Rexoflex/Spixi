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
                /* ★ #573: the CHECK takes the application context. Damir's B4 log shows a
                 * Java NPE here on a headless wake, because MainActivity.Instance was null
                 * and the whole incoming-call path died with it (SPlatformUtils.appContext
                 * carries the mechanism). PermissionChecker accepts any Context. */
                if (PermissionChecker.CheckSelfPermission(SPlatformUtils.appContext(), Manifest.Permission.RecordAudio) != PermissionChecker.PermissionGranted)
                {
                    // The REQUEST needs an Activity — only an Activity can show the OS
                    // dialog. With no Activity there is nothing to ask on, so say so and
                    // let the AND-11 accept gate (hasAudioRecordingPermissions) decide.
                    MainActivity? activity = MainActivity.Instance;
                    if (activity == null)
                    {
                        Logging.warn("Audio recording permission is not granted, and there is no Activity to request it on (#573).");
                        return;
                    }
                    activity.RequestPermissions(new string[] { Manifest.Permission.RecordAudio }, recordAudioPermissionRequest);
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
                // #573: the accept gate must give a true answer on a headless wake too.
                return PermissionChecker.CheckSelfPermission(SPlatformUtils.appContext(), Manifest.Permission.RecordAudio) == PermissionChecker.PermissionGranted;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
