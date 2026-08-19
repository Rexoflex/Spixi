using Foundation;
using SPIXI.Interfaces;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Spixi
{
    public class SPlatformUtils
    {
        public static Stream getAsset(string path)
        {
            return new FileStream(Path.Combine(getAssetsPath(), path), FileMode.Open, FileAccess.Read);
        }

        public static string getAssetsBaseUrl()
        {
            return NSBundle.MainBundle.BundlePath + "/";
        }

        public static string getAssetsPath()
        {
            return NSBundle.MainBundle.BundlePath + "/Contents/Resources/";
        }

        public static string getHtmlBaseUrl()
        {
            return Config.spixiUserFolder + "/html/";
        }

        public static string getHtmlPath()
        {
            return Config.spixiUserFolder + "/html";
        }

        public static void startRinging()
        {
        }

        public static void stopRinging()
        {
        }

        public static void startDialtone(DialtoneType type)
        {
        }

        public static void stopDialtone()
        {
        }

        // ★ N73 (#391): the parameter exists for signature parity with Android, which is
        // the only platform that paints a system-bar strip of its own. No-op here.
        public static void setEdgeToEdge(string surfaceColor = null, string topColor = null)   // ★ AND-7d (#409): signature parity; still a no-op here
        {

        }
    }
}
