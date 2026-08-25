using SPIXI.Interfaces;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;
using System.IO;
using System;
using System.Linq;
using Microsoft.Maui.Devices;
using Microsoft.Maui.ApplicationModel;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Principal;
using IXICore.Meta;

namespace Spixi
{
    public class SFilePicker
    {
        static TaskCompletionSource<SpixiImageData?> taskCompletionSource;

        public static async Task<SpixiImageData?> PickImageAsync()
        {
            // Merges Microsoft's built-in platform definitions for Images, Videos, and Audio
            var allMediaTypes = new FilePickerFileType(new Dictionary<DevicePlatform, IEnumerable<string>>
            {
                { DevicePlatform.WinUI, FilePickerFileType.Images.Value
                .Concat(FilePickerFileType.Videos.Value)
                .Concat(new[] { ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma" }) }
            });

            var options = new PickOptions
            {
                // Simply swap out ".Images" for your combined object
                FileTypes = allMediaTypes,
            };

            FileResult? fileData;
            try
            {
                fileData = await FilePicker.PickAsync(options);
            }
            catch (Exception ex) when (isPickerBrokerFailure(ex))
            {
                // #568: the WinUI FileOpenPicker throws E_FAIL (0x80004005) inside
                // MAUI PlatformPickAsync when the process is ELEVATED (the picker
                // broker refuses an administrator process). Fall back to the classic
                // Win32 dialog, which works elevated and unelevated.
                Logging.warn("SFilePicker: the WinUI picker failed (#568), the Win32 dialog takes over: " + ex.GetType().Name + " " + ex.Message);
                return await pickWithWin32Async(MEDIA_FILTER);
            }

            if (fileData == null)
                return null; // User canceled file picking

            SpixiImageData spixi_img_data = new() { name = Path.GetFileName(fileData.FullPath), path = fileData.FullPath, stream = await fileData.OpenReadAsync() };

            // Return Task object
            return spixi_img_data;
        }

        public static async Task<SpixiImageData?> PickFileAsync()
        {
            FileResult? fileData;
            try
            {
                fileData = await FilePicker.PickAsync();
            }
            catch (Exception ex) when (isPickerBrokerFailure(ex))
            {
                // #568: same broker failure as PickImageAsync. This is the path the
                // restore flow uses (LaunchPage.onSelectFile), and the path Damir's
                // ixian.log caught three times.
                Logging.warn("SFilePicker: the WinUI picker failed (#568), the Win32 dialog takes over: " + ex.GetType().Name + " " + ex.Message);
                return await pickWithWin32Async(ALL_FILTER);
            }

            if (fileData == null)
                return null; // User canceled file picking

            SpixiImageData spixi_img_data = new() { name = Path.GetFileName(fileData.FullPath), path = fileData.FullPath, stream = await fileData.OpenReadAsync() };

            // Return Task object
            return spixi_img_data;
        }

        public static byte[] ResizeImage(byte[] imageData, int newWidth, int newHeight, long quality)
        {
            using var originalImage = new Bitmap(new MemoryStream(imageData));

            int originalWidth = originalImage.Width;
            int originalHeight = originalImage.Height;

            float widthRatio = (float)newWidth / originalWidth;
            float heightRatio = (float)newHeight / originalHeight;

            float ratio = Math.Max(widthRatio, heightRatio);

            int resizedPreCropWidth = (int)Math.Round(originalWidth * ratio);
            int resizedPreCropHeight = (int)Math.Round(originalHeight * ratio);

            // Full area to crop on resized image
            int resizedCropX = resizedPreCropWidth - newWidth;
            int resizedCropY = resizedPreCropHeight - newHeight;

            int croppedWidth = (int)((resizedPreCropWidth - resizedCropX) / ratio);
            int croppedHeight = (int)((resizedPreCropHeight - resizedCropY) / ratio);

            // Half of area to crop on original image
            int cropX = (int)(resizedCropX / ratio / 2);
            int cropY = (int)(resizedCropY / ratio / 2);

            // Crop and resize
            var resizedImage = new Bitmap(newWidth, newHeight);
            using var graphics = Graphics.FromImage(resizedImage);
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.DrawImage(originalImage, new Rectangle(0, 0, newWidth, newHeight), new Rectangle(cropX, cropY, croppedWidth, croppedHeight), GraphicsUnit.Pixel);

            // Convert to JPEG
            var encoder = ImageCodecInfo.GetImageDecoders().First(codec => codec.FormatID == System.Drawing.Imaging.ImageFormat.Jpeg.Guid);
            var encoderParameters = new EncoderParameters(1);
            encoderParameters.Param[0] = new EncoderParameter(Encoder.Quality, quality);

            using var outputStream = new MemoryStream();
            resizedImage.Save(outputStream, encoder, encoderParameters);
            return outputStream.ToArray();
        }

        // ── #568 · the classic Win32 open dialog ────────────────────────────
        // Root cause (Damir's ixian.log, reproduced 3x, elevation CONFIRMED):
        // Microsoft.Maui.Storage.FilePickerImplementation.PlatformPickAsync throws
        // COMException 0x80004005 (E_FAIL) because the WinUI FileOpenPicker needs a
        // broker that refuses an ELEVATED process. Damir launched the exe from an
        // "Administrator:" PowerShell window, so the process inherited elevation.
        //
        // comdlg32 GetOpenFileNameW has no broker. It works elevated and unelevated.
        // Gate note: the returned path comes from the OS dialog, never from the
        // WebView, so this adds no new untrusted-input surface.

        /* ★ review MINOR-1: the catch must not be narrower than the failure. The log
         * named COMException, but a broker refusal can also surface as
         * UnauthorizedAccessException, and MAUI may wrap either. A picker that throws
         * ANY of these is a picker that did not pick — falling back is always better
         * than the honest alert the caller would otherwise show, and the log records the
         * exception type so a new shape is visible rather than silent.
         * ⚠ OperationCanceledException is deliberately NOT included: a cancel is a
         * result, and re-opening a second dialog over it would be a bug. */
        private static bool isPickerBrokerFailure(Exception ex)
        {
            for (Exception? e = ex; e != null; e = e.InnerException)
            {
                if (e is OperationCanceledException)
                {
                    return false;
                }
                if (e is COMException || e is UnauthorizedAccessException)
                {
                    return true;
                }
            }
            return false;
        }

        private const string ALL_FILTER = "All files\0*.*\0";

        /* ⚠ review MINOR-2: NO "All files" pair here. The MAUI picker this replaces
         * offers media only, and the avatar consumers pass whatever comes back into
         * ResizeImage → new Bitmap(...), which throws on a non-image. The fallback must
         * not be able to hand them a file the picker it stands in for could not. */
        private const string MEDIA_FILTER =
            "Media files\0*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp;*.heic;*.mp4;*.mov;*.avi;*.mkv;*.wmv;*.m4v;*.3gp;*.webm;*.mp3;*.wav;*.aac;*.ogg;*.flac;*.m4a;*.wma\0";

        private const int OFN_NOCHANGEDIR = 0x00000008;
        private const int OFN_PATHMUSTEXIST = 0x00000800;
        private const int OFN_FILEMUSTEXIST = 0x00001000;
        private const int OFN_EXPLORER = 0x00080000;

        // The dialog writes the chosen path into lpstrFile. 32k wide characters is
        // the classic ceiling for a single selection.
        private const int PATH_BUFFER_CHARS = 32768;

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct OPENFILENAMEW
        {
            public int lStructSize;
            public IntPtr hwndOwner;
            public IntPtr hInstance;
            public string? lpstrFilter;
            public string? lpstrCustomFilter;
            public int nMaxCustFilter;
            public int nFilterIndex;
            public IntPtr lpstrFile;
            public int nMaxFile;
            public string? lpstrFileTitle;
            public int nMaxFileTitle;
            public string? lpstrInitialDir;
            public string? lpstrTitle;
            public int Flags;
            public ushort nFileOffset;
            public ushort nFileExtension;
            public string? lpstrDefExt;
            public IntPtr lCustData;
            public IntPtr lpfnHook;
            public string? lpTemplateName;
            public IntPtr pvReserved;
            public int dwReserved;
            public int FlagsEx;
        }

        // No SetLastError: this export reports through CommDlgExtendedError, not GetLastError.
        [DllImport("comdlg32.dll", CharSet = CharSet.Unicode)]
        private static extern bool GetOpenFileNameW(ref OPENFILENAMEW ofn);

        [DllImport("comdlg32.dll")]
        private static extern int CommDlgExtendedError();

        // True when the process runs with administrator rights. This is the value
        // that decides whether the WinUI picker can reach its broker, so the
        // fallback records it once: a later log tells us which branch of #568 fired.
        private static bool isElevated()
        {
            try
            {
                using WindowsIdentity identity = WindowsIdentity.GetCurrent();
                return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch (Exception)
            {
                return false;
            }
        }

        // The MAUI window handle, so the dialog is modal to the app and cannot go
        // behind it. IntPtr.Zero (no window yet) still opens a usable dialog.
        private static IntPtr mainWindowHandle()
        {
            try
            {
                var window = Microsoft.Maui.Controls.Application.Current?.Windows?.FirstOrDefault();
                if (window?.Handler?.PlatformView is Microsoft.UI.Xaml.Window xamlWindow)
                    return WinRT.Interop.WindowNative.GetWindowHandle(xamlWindow);
            }
            catch (Exception ex)
            {
                Logging.warn("SFilePicker: no window handle for the Win32 dialog: " + ex.Message);
            }
            return IntPtr.Zero;
        }

        private static async Task<SpixiImageData?> pickWithWin32Async(string filter)
        {
            Logging.info("SFilePicker: the Win32 open dialog runs (#568), elevated=" + isElevated());

            string? path = await MainThread.InvokeOnMainThreadAsync(() => showWin32OpenDialog(filter));

            if (string.IsNullOrEmpty(path))
                return null; // the user canceled, or the dialog failed and said so

            try
            {
                return new SpixiImageData
                {
                    name = Path.GetFileName(path),
                    path = path,
                    stream = File.OpenRead(path)
                };
            }
            catch (Exception ex)
            {
                /* The caller alerts on a null result (#334 L1 honest-alert grammar).
                 * ⚠ review MINOR-3: the TYPE, never ex.Message — an IOException or an
                 * UnauthorizedAccessException embeds the full local path, and ixian.log is
                 * shareable from DevPage (the handover-gate rule). */
                Logging.error("SFilePicker: the Win32 dialog chose a file we cannot open: " + ex.GetType().Name);
                return null;
            }
        }

        // Runs the modal dialog. Must run on the UI thread: the common dialog pumps
        // its own messages and owns the app window while it is open.
        private static string? showWin32OpenDialog(string filter)
        {
            IntPtr buffer = Marshal.AllocHGlobal(PATH_BUFFER_CHARS * sizeof(char));
            try
            {
                // A dirty buffer reads back as a path the user never chose.
                Marshal.Copy(new byte[PATH_BUFFER_CHARS * sizeof(char)], 0, buffer, PATH_BUFFER_CHARS * sizeof(char));

                OPENFILENAMEW ofn = new OPENFILENAMEW
                {
                    hwndOwner = mainWindowHandle(),
                    lpstrFilter = filter,
                    nFilterIndex = 1,
                    lpstrFile = buffer,
                    nMaxFile = PATH_BUFFER_CHARS,
                    Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR
                };
                ofn.lStructSize = Marshal.SizeOf(ofn);

                if (GetOpenFileNameW(ref ofn))
                    return Marshal.PtrToStringUni(buffer);

                int error = CommDlgExtendedError();
                if (error != 0)
                    Logging.error("SFilePicker: the Win32 open dialog failed, CommDlgExtendedError=" + error);

                return null; // error == 0 is a normal cancel
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }
    }
}
