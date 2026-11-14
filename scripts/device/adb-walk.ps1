<#
adb-walk.ps1 - device timing walk of the Spixi Dev app on ONE Android phone over adb.

Usage:
  powershell -ExecutionPolicy Bypass -File scripts\device\adb-walk.ps1 [-Calibrate] [-Steps coldstart,scroll]
             [-Repeats 5] [-Serial <id>] [-Apk <path>] [-KillRenderer]

Walk: pre-flight, then each step x Repeats (one screenshot + one DOTNET log pull per rep), run.json after
every rep, then adb-walk-parse.ps1 -RunDir <run folder>; the exit code is the parser's.
Steps (default order; the walk-steps-2 steps run after the old ones so the old rows keep their meaning):
  coldstart, mem-home, chat-intent, chat-tap, scroll, resume, resume-long, network, mem-end, mem-trim,
  resume-now, resume-3s (60 s in the background, then the chat tap at once / after 3 s; resume = after 2 s),
  chatinfo (tap on the chat header of seed chat k-1), tab-apps, tab-wallet, tab-account (tap on the tab, then
  Chats), history (seed chat k+4, swipes to older until 3 older pages were asked for).
  scroll-image runs only when named in -Steps: it needs imageChatAddress in walk.local.json. imageChatAddress must be
  the address of a dev-seed chat (Spixi/Utils/SDevSeed.cs), never a real contact; scroll-image keeps no screenshot.
  New steps take a screenshot before the input too (shot-<step>-NN-pre.png): no input when that check fails
  (except resume-now, resume-3s and scroll-image: a focus check only, as the old resume). A pre-check PNG that fails is
  deleted. The tab steps wait for the app's own frames log lines (a count only): the first tab tap is gated by the
  pre-check; the Chats tap by the tab's frames line (and for Account the SettingsPage line); the screenshot by the Chats
  frames line (and for Account the SettingsPage close line). It is taken on Chats only and is deleted when its home
  check fails: Wallet and Account data stay out of files. A tab rep that fails after its tab tap, or whose home check
  fails, restarts the app (force-stop, am start -W: a cold start lands on Chats) so no later step meets Wallet or
  Account; the same restart follows a failed cal-11. resume-now and resume-3s also delete a chat PNG that fails its check.
-Calibrate: pre-flight, device.txt, cal-*.png, tries.txt (renderer lookup), calibrate.json (no numbers); exit 0.
            It also tries each tap point of the new steps once (cal-08..13; no screenshot on Apps, Wallet, Account;
            cal-11 and cal-12 use the same frames-line gates and screen checks; a cal-11, cal-12 or cal-13 PNG that is not
            the expected screen is deleted; when cal-11 failed or was not confirmed, cal-12..13 are skipped).
Inputs: a52s.json next to this script (timing, taps, swipes, screen probes; the package is pinned below);
        <repo>\Claude outputs\adbwalk\walk.local.json (optional, never in git): { "seedAddresses": [...],
        "imageChatAddress": "..." (optional) }; both are masked in everything the script writes.
Output: <repo>\Claude outputs\adbwalk\<yyyyMMdd-HHmm>\ (walk) or calibrate-<yyyyMMdd-HHmm>\.
Exit:   0 ok - 1 driver failure (bad arguments, pre-flight, crash) - else the parser's code (2 no data, 3 no run.json).

Safety rules (Assert-AdbCommand is an allowlist of every command shape this script can send):
- the only app this tool may drive is the pinned package com.ixilabs.spixi.dev (a52s.json must say the same)
- never uninstall, pm clear, root, reboot, rm -r, input text (no PIN or password is ever typed)
- install only with "install -r", and only an APK whose file name starts with the pinned package id
- phone files only /data/local/tmp/adbwalk-shot.png and /data/local/tmp/adbwalk-log.txt (rm -f only these two)
- input events (tap, swipe, BACK) and screencap are sent only when our activity has the focus, checked in a
  separate adb call just before (a window that takes the focus in that gap can still receive one event).
  All other commands (am, svc, settings, logcat, dumpsys, kill of the confirmed renderer, HOME, the wake key)
  do not depend on the focus. After a screencap the focus is read again; a foreign result deletes the PNG.
- the log pull is filtered ON THE PHONE by the app pid, the Core log stamp and the app's own token grammar
  ([P1] / [CDPERF] lines, "Starting Spixi", "Network client connected to <host:port>", "Received Hello: ...").
  Contact addresses and other Core lines do not match; tokens of [a-z0-9_.=-] could in theory still carry
  lower-case text, and the connect line carries the node host:port.
- a notification of another app does not take the focus and can appear in a screenshot: run.json records
  device.dnd (Do not disturb) and the script warns when it is off or unknown
- the only "settings put" restores stay_on_while_plugged_in to the value read at the start
- finally: stay_on restored; Wi-Fi re-enabled when this run turned it off (the network step only runs when
  Wi-Fi was enabled at its start and adb is on USB, so the restore target is always "enabled"); both phone
  files are removed with rm -f (the result is not checked); the lock removed. The pending restore is kept in restore-pending.json (it holds an unsalted,
  truncated SHA-256 of the serial, not the serial itself) until it succeeded; the next run on THAT phone applies it first (closing the
  window skips the finally block). Hook runs use their own .lock.hook, restore-pending.hook.json and
  adb-walk-refused.hook.log.
- left changed on the phone after a run: the dev app stays running in front with the keyguard dismissed (it
  was force-stopped and cold-started when the coldstart step or -Calibrate ran); the tabs Apps, Wallet and
  Account were opened when a tab step ran; the dev-seed chats were opened (their unread state changes); logcat buffer size 16M until reboot and a cleared
  log buffer; with -Apk the build is replaced; with -KillRenderer the renderer may be killed.
- no seed address and no serial in the files the SCRIPT writes (walk.log, run.json, calibrate.json, device.txt,
  tries.txt) and on the console (masked as <seed k> / <serial>, "seed k" / "serial" in notes); device text
  reaches them only through a strict capture or Get-SafeNote. meminfo files, pulled logs and screenshots are
  stored as the phone returns them.
- local folders (run folder, output root, repo, APK folder, profile, local app data, temp; only when the value
  is an absolute path) are replaced by <path> in every file this script writes and every line it prints (the
  parser's own console line names the summary.md path); adb's own text of a failed pull or install
  is never shown (only the exit code and a strict capture); a failed restore ends with exit 1
- a value adb did not print is absent from run.json, never 0

Test hook: environment variable ADBWALK_ADB = full path of an adb executable to use instead of adb on PATH.
Hook runs are marked: folder prefix hook-, "adbHook": true in run.json / calibrate.json, a console banner.
#>
[CmdletBinding()]
param(
    [string]$Serial = '',
    [string]$Apk = '',
    [string[]]$Steps = @(),
    [int]$Repeats = 5,
    [switch]$Calibrate,
    [switch]$KillRenderer
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Off

# ---------------------------------------------------------------- constants and state
# Safety rule from the security review: the only app this tool may drive. a52s.json must carry the same id.
$script:PinnedPackage = 'com.ixilabs.spixi.dev'
$script:Inv = [System.Globalization.CultureInfo]::InvariantCulture
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
$script:Ws = [char[]]@(32, 9, 13, 10)
$script:AllSteps = @('coldstart', 'mem-home', 'chat-intent', 'chat-tap', 'scroll', 'resume', 'resume-long', 'network', 'mem-end', 'mem-trim',
    'resume-now', 'resume-3s', 'chatinfo', 'tab-apps', 'tab-wallet', 'tab-account', 'history', 'scroll-image')
# Walk steps 2: the new steps run AFTER the old ones, so every old row keeps its place and its meaning. scroll-image
# runs only when it is named in -Steps (it needs the local key imageChatAddress, the image seed of speed batch 1a).
$script:DefaultSteps = @($script:AllSteps | Where-Object { $_ -cne 'scroll-image' })
$script:TabNames = @{ 'tab-apps' = 'tabApps'; 'tab-wallet' = 'tabWallet'; 'tab-account' = 'tabAccount' }
$script:TabFrames = @{ 'tab-apps' = 'apps'; 'tab-wallet' = 'wallet'; 'tab-account' = 'account' }
$script:ImageSeed = -1
$script:SeedAddrCount = 0
$script:TimingKeys = @('coldStartIdleSec', 'coldStartTimeoutSec', 'coldStartSettleSec', 'chatSettleMs', 'backSettleMs',
    'scrollSettleMs', 'resumeWaitSec', 'resumeLongWaitSec', 'memQuietSec', 'wifiOffSec',
    'tabSettleMs', 'historySwipeMs', 'historyMaxSwipes', 'resumeLateTapMs')
$script:PhoneShot = '/data/local/tmp/adbwalk-shot.png'
$script:PhoneLog = '/data/local/tmp/adbwalk-log.txt'
$script:PhoneFiles = @($script:PhoneShot, $script:PhoneLog)
# No space and no quote in the stamp format: the stamped shell commands stay quote-free.
$script:StampCmd = 'date +%m-%dT%H:%M:%S.%N'
$script:LogCmd = 'logcat -d -v threadtime -s DOTNET:I'
$script:PollCmd = $script:LogCmd + ' | grep -c -e P1..boot.hold -e P1..shell.boot'
# Walk steps 2: the number of history pages the chat shell asked for (a count only, no line leaves the phone).
$script:LoadPollCmd = $script:LogCmd + ' | grep -c -e P1..shell.send.loadmore'
# Walk steps 2, tab steps: the frames lines of the app's own log (a count only, no line leaves the phone). The tab steps
# tap and photograph only after the matching line shows that the view really changed.
$script:FramePoll = @{
    apps = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-apps')
    wallet = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-wallet')
    account = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-account')
    chats = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-chats')
    settings = ($script:LogCmd + ' | grep -c -e P1..frames.open-settingspage')
    settingsclosed = ($script:LogCmd + ' | grep -c -e P1..close.settingspage.done')
}
# The ONE command that may hold quotes, brackets and a redirect: matched by exact string equality.
$script:LogRe = '^[0-9]{2}-[0-9]{2} [0-9:.]{12} +[0-9]+ +[0-9]+ [A-Z] DOTNET *: [0-9]{2}-[0-9]{2} [0-9:.]{8,16}\|[A-Za-z]{1,10}\|[0-9]{1,6}: ((\[WEBVIEW\] [A-Z]{1,12} )?\[(P1|CDPERF)\] [a-z0-9_.=-]{1,40}( [a-z0-9_.=-]{1,40}){0,15}( \(file:///android_asset/html/[a-z.]{0,24}:[0-9]{1,6}\))?$|Starting Spixi [a-z0-9.-]{1,24} \([a-z0-9.-]{1,24}\)$|Network client connected to [A-Za-z0-9-]{1,24}(\.[A-Za-z0-9-]{1,24}){0,7}:[0-9]{1,5}$|Received Hello: Node version [0-9]{1,6}$)'
$script:LogPullPrefix = 'logcat -d --pid='
$script:LogPullSuffix = ' -v threadtime -s DOTNET:I | grep -E ''' + $script:LogRe + ''' > /data/local/tmp/adbwalk-log.txt'

$script:Mode = 'walk'
$script:Hook = $false
$script:DevSerial = ''
$script:AdbPath = ''
$script:Root = ''
$script:RepoPath = ''
$script:RunDir = ''
$script:RunName = ''
$script:WalkLog = ''
$script:Cfg = $null
$script:Pkg = ''
$script:Comp = ''
$script:W = 0
$script:H = 0
$script:Tm = @{}
$script:RepeatsN = 1
$script:StepsReq = @()
$script:Seeds = New-Object System.Collections.Generic.List[object]
$script:SeedNote = @{}
$script:ShellAllow = @()
$script:LockPath = ''
$script:LockOwned = $false
$script:PendingPath = ''
$script:PendingWritten = $false
$script:StartedIso = ''
$script:StayOld = $null
$script:WifiTouched = $false
$script:WalkStarted = $false
$script:DevInfo = [ordered]@{}
$script:AppInfo = [ordered]@{}
$script:Reps = New-Object System.Collections.Generic.List[object]
$script:Mem = New-Object System.Collections.Generic.List[object]
$script:NeedRecover = $true
$script:LastFailed = $false
$script:ErrStreak = 0
$script:Halted = $false
$script:HaltNote = 'run stopped after 3 failed reps (error or no-screen) in a row'
$script:ScrollOpen = ''
$script:ScrollWhat = ''
$script:DrawingState = 0
$script:CalShots = New-Object System.Collections.Generic.List[object]
$script:TriesFile = ''
$script:ApkFull = ''
$script:ApkDir = ''
$script:RestoreFailed = $false
$script:Dnd = ''
$script:LockSuffix = ''

# ---------------------------------------------------------------- text, log, console
function Protect-Text([string]$Text) {
    # Every string that leaves the script passes here: serial and seed addresses never reach a file or the console.
    # Only long values are replaced (serial >= 6, seeds 30..60 base58), so numbers in the text stay intact.
    if ($null -eq $Text) { return '' }
    $t = $Text
    # FIRST, on the raw text: local folders (both separators, case-insensitive) -> <path>; then serial, then seeds.
    $dirs = New-Object System.Collections.Generic.List[string]
    foreach ($d in @($script:RunDir, $script:Root, $script:RepoPath, $script:ApkDir, $env:USERPROFILE, $env:LOCALAPPDATA, $env:TEMP)) {
        if ($d) { $d2 = $d.TrimEnd([char]92, [char]47) } else { $d2 = '' }
        # r6-1: only an absolute folder (drive letter, UNC, or a POSIX root) is replaced: a bare word (a relative TEMP,
        # a provider-qualified -Apk) inside a seed address or the serial would cut the masks below.
        if ($d2.Length -ge 4 -and (Test-RootedDir $d2)) {
            foreach ($v in @($d2, $d2.Replace([char]92, [char]47), $d2.Replace([char]47, [char]92))) { if (-not $dirs.Contains($v)) { $dirs.Add($v) } }
        }
    }
    foreach ($v in @($dirs | Sort-Object -Property Length -Descending)) {
        $t = [regex]::Replace($t, [regex]::Escape($v), '<path>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    if ($script:DevSerial -and (Test-SerialMaskable $script:DevSerial)) { $t = $t.Replace($script:DevSerial, '<serial>') }
    if ($Serial -and (Test-SerialMaskable $Serial)) { $t = $t.Replace($Serial, '<serial>') }
    for ($i = 0; $i -lt $script:Seeds.Count; $i++) {
        $s = $script:Seeds[$i]
        if ($s) { $t = $t.Replace([string]$s, '<seed ' + $i + '>') }
    }
    return $t
}

function Test-RootedDir([string]$D) {
    return ($D -cmatch '^[A-Za-z]:[\\/]' -or $D -cmatch '^[\\/]{2}[^\\/]' -or $D -cmatch '^[\\/][^\\/]')
}

function Remove-LocalFile([string]$Path) {
    # Returns $false when the file is still there after one retry.
    for ($i = 0; $i -lt 2; $i++) {
        try { if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Force }; return $true } catch { Start-Sleep -Milliseconds 200 }
    }
    return $false
}

function Get-Cut([string]$Text, [int]$Max) {
    # Mask first, then cut: a cut must never leave half an address behind.
    if ($null -eq $Text) { return '' }
    $t = ((Protect-Text $Text) -replace '\s+', ' ').Trim($script:Ws)
    if ($t.Length -gt $Max) { $t = $t.Substring(0, $Max) + '...' }
    return $t
}

function Get-SafeNote([string]$Text, [int]$Max = 120) {
    # Notes in the json files and adb error text: a fixed character set, at most 120 characters, no links.
    $t = Protect-Text $Text
    $t = [regex]::Replace($t, '<seed ([0-9]{1,2})>', 'seed $1')
    $t = $t.Replace('<serial>', 'serial')
    if ($t -match '[A-Za-z][A-Za-z0-9+.-]{1,15}:/' -or $t -match '(?i)www\.|data:') { return '(removed)' }
    $t = [regex]::Replace($t, '[^A-Za-z0-9 _.,:=/()%+-]', '?')
    if ($t.Length -gt $Max) { $t = $t.Substring(0, $Max) }
    return $t
}

function Get-ErrText($Err) {
    # Our own ADBWALK-* texts through Get-SafeNote; a .NET exception only as its type name + script line.
    $m = [string]$Err.Exception.Message
    if ($m -cmatch '^ADBWALK-[A-Z]+:') { return (Get-SafeNote ($m -replace '^ADBWALK-[A-Z]+:\s*', '') 300) }
    return ('driver: ' + $Err.Exception.GetType().Name + ' (line ' + $Err.InvocationInfo.ScriptLineNumber + ')')
}

function ConvertTo-MaskedObject($Obj) {
    # Mask string VALUES before serializing: masking the JSON text could rewrite numbers and names.
    if ($null -eq $Obj) { return $null }
    if ($Obj -is [string]) { return (Protect-Text $Obj) }
    if ($Obj -is [System.Collections.IDictionary]) {
        $o = [ordered]@{}
        foreach ($k in $Obj.Keys) { $o[$k] = ConvertTo-MaskedObject $Obj[$k] }
        return $o
    }
    if ($Obj -is [System.Collections.IList]) {
        $l = New-Object System.Collections.Generic.List[object]
        foreach ($x in $Obj) { $l.Add((ConvertTo-MaskedObject $x)) }
        return ,$l
    }
    return $Obj
}

function Write-JsonFile([string]$Path, $Obj) {
    $json = ConvertTo-Json -InputObject (ConvertTo-MaskedObject $Obj) -Depth 8
    [System.IO.File]::WriteAllText($Path, $json, $script:Utf8)
}

function Write-WalkLog([string]$Line) {
    if (-not $script:WalkLog) { return }
    $t = Protect-Text $Line
    # Local paths appear as file names only (no user name, no folder).
    if ($script:RunDir) { $t = $t.Replace($script:RunDir + [System.IO.Path]::DirectorySeparatorChar, '') }
    if ($script:RepoPath) { $t = $t.Replace($script:RepoPath, '<repo>') }
    $stamp = [DateTime]::Now.ToString('HH:mm:ss.fff', $script:Inv)
    [System.IO.File]::AppendAllText($script:WalkLog, ($stamp + ' ' + $t + "`r`n"), $script:Utf8)
}

function Say([string]$Line) { Write-Host ([regex]::Replace((Protect-Text $Line), '[^\x20-\x7E]', '?')) }

function Say-Log([string]$Line) {
    Say $Line
    Write-WalkLog $Line
}

function Write-TextFile([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, (Protect-Text $Text), $script:Utf8)
}

function Write-RawFile([string]$Path, [string]$Text) {
    # Machine-read numbers (meminfo): written as returned, never masked.
    [System.IO.File]::WriteAllText($Path, $Text, $script:Utf8)
}

function Split-Lines([string]$Text) {
    if (-not $Text) { return @() }
    return @($Text -split "\r?\n")
}

function Get-FirstLine([string]$Text) {
    foreach ($l in (Split-Lines $Text)) { $c = $l.Trim($script:Ws); if ($c) { return $c } }
    return ''
}

function Get-Clean([string]$Text) {
    if ($null -eq $Text) { return '' }
    return $Text.Trim($script:Ws)
}

function Get-Pids([string]$Text) {
    return @(((Get-Clean $Text) -split '[ \t\r\n]+') | Where-Object { $_ -cmatch '^[0-9]{1,9}\z' })
}

function Test-SerialMaskable([string]$S) {
    # Masking a short or all-digit serial would rewrite numbers (a run name, a pid): such serials are refused.
    if ($S.Length -lt 6) { return $false }
    if ($S -cmatch '^[0-9]+\z' -and $S.Length -lt 10) { return $false }
    return $true
}

function Stop-Walk([string]$Why) { throw ('ADBWALK-STOP: ' + $Why) }

# ---------------------------------------------------------------- the one native-command wrapper
function ConvertTo-ArgString([string]$Arg) {
    # Windows command-line quoting (CommandLineToArgvW rules), so a path with spaces stays ONE argument.
    if ($Arg.Length -gt 0 -and $Arg -notmatch '[\s"]') { return $Arg }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append([char]34)
    $bs = 0
    foreach ($ch in $Arg.ToCharArray()) {
        if ($ch -eq [char]92) { $bs++; continue }
        if ($ch -eq [char]34) {
            [void]$sb.Append([char]92, (2 * $bs + 1))
            [void]$sb.Append([char]34)
            $bs = 0
            continue
        }
        if ($bs -gt 0) { [void]$sb.Append([char]92, $bs); $bs = 0 }
        [void]$sb.Append($ch)
    }
    if ($bs -gt 0) { [void]$sb.Append([char]92, (2 * $bs)) }
    [void]$sb.Append([char]34)
    return $sb.ToString()
}

function Invoke-Native([string]$File, [string]$ArgText, [int]$TimeoutSec) {
    # Process API instead of "& adb ... 2>&1": PowerShell 5.1 turns native stderr into errors under 'Stop'.
    $res = [ordered]@{ ExitCode = -1; StdOut = ''; StdErr = ''; TimedOut = $false; Command = ''; Verb = '' }
    $p = $null
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $File
        $psi.Arguments = $ArgText
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.RedirectStandardInput = $true
        $psi.CreateNoWindow = $true
        $psi.StandardOutputEncoding = $script:Utf8
        $psi.StandardErrorEncoding = $script:Utf8
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo = $psi
        [void]$p.Start()
        # stdin closed at once = "adb shell -n": adb never waits on the console.
        $p.StandardInput.Close()
        # Both streams read asynchronously: a full stderr pipe cannot block a process that writes stdout.
        $outTask = $p.StandardOutput.ReadToEndAsync()
        $errTask = $p.StandardError.ReadToEndAsync()
        if ($p.WaitForExit($TimeoutSec * 1000)) {
            $p.WaitForExit()
            $res.ExitCode = $p.ExitCode
        } else {
            $res.TimedOut = $true
            try { $p.Kill() } catch { }
            [void]$p.WaitForExit(5000)
        }
        # Bounded waits: a server process that inherited the pipe must not hang the walk.
        if ($outTask.Wait(5000)) { $res.StdOut = [string]$outTask.Result }
        if ($errTask.Wait(5000)) { $res.StdErr = [string]$errTask.Result }
    } catch {
        $res.StdErr = 'cannot run adb: ' + $_.Exception.GetType().Name
    } finally {
        if ($p) { $p.Dispose() }
    }
    return (New-Object PSObject -Property $res)
}

function Get-LogPullCmd([string]$ProcId) { return ($script:LogPullPrefix + $ProcId + $script:LogPullSuffix) }

function Initialize-Allowlist {
    # Every piped command the script sends, as a whole string; nothing else may hold a "|".
    $script:PipedCmds = @(
        $script:PollCmd,
        $script:LoadPollCmd,
        $script:FramePoll['apps'],
        $script:FramePoll['wallet'],
        $script:FramePoll['account'],
        $script:FramePoll['chats'],
        $script:FramePoll['settings'],
        $script:FramePoll['settingsclosed'],
        'dumpsys window | grep -e mCurrentFocus=',
        'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus=',
        'dumpsys activity activities | grep -e mKeyguardShowing=',
        'dumpsys power | grep -e mWakefulness=',
        ('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime='),
        'dumpsys display | grep -i -e framerate',
        'ps -A | grep -e sandboxed',
        'dumpsys wifi | grep -e Wi-Fi.is'
    )
    $pe = [regex]::Escape($script:Pkg)
    $ce = $pe + '/[A-Za-z0-9_.]+'
    $script:ShellAllow = @(
        '^date \+%m-%dT%H:%M:%S\.%N\z',
        ('^am force-stop ' + $pe + '\z'),
        ('^am start -W -n ' + $ce + '\z'),
        ('^am start -n ' + $ce + '\z'),
        ('^am start -n ' + $ce + ' --es fa [1-9A-HJ-NP-Za-km-z]{30,60}\z'),
        ('^am send-trim-memory ' + $pe + ' RUNNING_LOW\z'),
        '^logcat -c\z',
        '^logcat -G 16M\z',
        '^input tap [0-9]{1,5} [0-9]{1,5}\z',
        '^input swipe [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5}\z',
        '^input keyevent (3|4|KEYCODE_WAKEUP)\z',
        '^wm dismiss-keyguard\z',
        '^wm size\z',
        '^wm density\z',
        '^getprop ro\.(product\.model|build\.version\.release|build\.version\.sdk)\z',
        '^dumpsys battery\z',
        '^dumpsys activity activities\z',
        '^dumpsys activity services [A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+\z',
        ('^dumpsys package ' + $pe + '\z'),
        '^dumpsys meminfo [0-9]{1,9}\z',
        ('^pm path ' + $pe + '\z'),
        ('^cmd package resolve-activity --brief -c android\.intent\.category\.LAUNCHER ' + $pe + '\z'),
        '^settings get global (stay_on_while_plugged_in|zen_mode)\z',
        '^settings put global stay_on_while_plugged_in ([0-9]|1[0-5])\z',
        '^svc power stayon usb\z',
        '^svc wifi (enable|disable)\z',
        '^screencap -p /data/local/tmp/adbwalk-shot\.png\z',
        '^rm -f /data/local/tmp/adbwalk-(shot\.png|log\.txt)\z',
        ('^pidof ' + $pe + '\z'),
        '^kill [0-9]{1,9}\z'
    )
}

function Test-Ordinal([string]$A, [string]$B) { return [string]::Equals($A, $B, [System.StringComparison]::Ordinal) }

function Test-ShellAllowed([string]$Cmd) {
    if ($script:ShellAllow.Count -eq 0) { return $false }
    # Printable ASCII only: no zero-width, soft hyphen, NUL or other look-alike in a shell string.
    if ($Cmd -cmatch '[^\x20-\x7E]') { return $false }
    # The filtered log pull: built again from the validated pid and compared as a whole string.
    if ($Cmd.StartsWith($script:LogPullPrefix, [System.StringComparison]::Ordinal)) {
        $rest = $Cmd.Substring($script:LogPullPrefix.Length)
        if ($rest -cmatch '^([0-9]{1,9}) ') { return (Test-Ordinal $Cmd (Get-LogPullCmd $Matches[1])) }
        return $false
    }
    if ($Cmd.Contains('|')) {
        foreach ($pc in $script:PipedCmds) { if (Test-Ordinal $Cmd $pc) { return $true } }
        return $false
    }
    # Everything else: no quoting, expansion, globbing, subshell, redirect, background or newline.
    if ($Cmd -match '[`$\\''"&(){}<>\[\]*?\r\n]') { return $false }
    foreach ($raw in ($Cmd -split '[;|]')) {
        $piece = $raw.Trim(' ')
        $hit = $false
        foreach ($re in $script:ShellAllow) { if ($piece -cmatch $re) { $hit = $true; break } }
        if (-not $hit) { return $false }
    }
    return $true
}

function Test-LocalPullTarget([string]$Path) {
    # A pull writes only a direct child of the current run folder with one of the known names.
    if (-not $script:RunDir) { return $false }
    try {
        $full = [System.IO.Path]::GetFullPath($Path)
        $rd = [System.IO.Path]::GetFullPath($script:RunDir)
    } catch { return $false }
    $parent = [System.IO.Path]::GetDirectoryName($full)
    if (-not [string]::Equals($parent, $rd, [System.StringComparison]::OrdinalIgnoreCase)) { return $false }
    return ([System.IO.Path]::GetFileName($full) -cmatch '^(shot|android-walk|cal)-[A-Za-z0-9-]{1,60}\.(png|txt)\z')
}

function Test-ApkName([string]$Path) {
    $name = [System.IO.Path]::GetFileName($Path)
    return ($name -cmatch ('^' + [regex]::Escape($script:PinnedPackage) + '(-|_|\.apk\z)') -and $name -cmatch '\.apk\z')
}

function Assert-AdbCommand([string[]]$A) {
    $ok = $false
    if ($A.Count -ge 1) {
        $verb = $A[0]
        if ((Test-Ordinal $verb 'devices') -or (Test-Ordinal $verb 'start-server')) { $ok = ($A.Count -eq 1) }
        elseif (Test-Ordinal $verb 'install') { $ok = ($A.Count -eq 3 -and (Test-Ordinal $A[1] '-r') -and (Test-ApkName $A[2])) }
        elseif (Test-Ordinal $verb 'pull') {
            $known = $false
            foreach ($pf in $script:PhoneFiles) { if (Test-Ordinal $pf $A[1]) { $known = $true } }
            $ok = ($A.Count -eq 3 -and $known -and (Test-LocalPullTarget $A[2]))
        }
        elseif (Test-Ordinal $verb 'shell') { $ok = ($A.Count -eq 2 -and (Test-ShellAllowed $A[1])) }
    }
    if (-not $ok) { Stop-Walk ('refused adb command (not in the allowlist): ' + ($A -join ' ')) }
}

function Invoke-Adb {
    param([string[]]$AdbArgs, [int]$TimeoutSec = 60, [switch]$NoSerial)
    Assert-AdbCommand $AdbArgs
    $all = New-Object System.Collections.Generic.List[string]
    $shown = New-Object System.Collections.Generic.List[string]
    if ((-not $NoSerial) -and $script:DevSerial) { $all.Add('-s'); $all.Add($script:DevSerial); $shown.Add('-s'); $shown.Add('<serial>') }
    for ($i = 0; $i -lt $AdbArgs.Count; $i++) {
        $a = $AdbArgs[$i]
        $all.Add($a)
        # Local paths (pull target, APK) are logged as file names only.
        if ($i -eq 2 -and ($AdbArgs[0] -ceq 'pull' -or $AdbArgs[0] -ceq 'install')) { $shown.Add([System.IO.Path]::GetFileName($a)) }
        else { $shown.Add($a) }
    }
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($a in $all) { $parts.Add((ConvertTo-ArgString $a)) }
    $argText = $parts -join ' '
    $shownParts = New-Object System.Collections.Generic.List[string]
    foreach ($a in $shown) { $shownParts.Add((ConvertTo-ArgString $a)) }
    $shownText = $shownParts -join ' '
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-Native $script:AdbPath $argText $TimeoutSec
    $sw.Stop()
    $r.Command = 'adb ' + $shownText
    $r.Verb = [string]$AdbArgs[0]
    $line = 'adb ' + $shownText + ' -> exit ' + $r.ExitCode + ' (' + $sw.ElapsedMilliseconds + ' ms)'
    if ($r.TimedOut) { $line += ' TIMEOUT after ' + $TimeoutSec + ' s' }
    if ($r.ExitCode -ne 0) { $line += ' : ' + (Get-AdbWhy $r) }
    Write-WalkLog $line
    return $r
}

function Invoke-Shell([string]$Cmd, [int]$TimeoutSec = 60) {
    return (Invoke-Adb -AdbArgs @('shell', $Cmd) -TimeoutSec $TimeoutSec)
}

function Get-AdbWhy($R) {
    # pull / install: adb's own text names local paths: only the exit, a fixed word and a strict capture.
    if ($R.Verb -ceq 'pull') {
        if ($R.TimedOut) { return 'pull failed timeout' }
        return 'pull failed'
    }
    if ($R.Verb -ceq 'install') {
        $why = 'install failed'
        if (($R.StdOut + "`n" + $R.StdErr) -cmatch 'Failure \[([A-Z_]{1,60})') { $why = 'install failed: ' + $Matches[1] }
        if ($R.TimedOut) { $why += ' timeout' }
        return $why
    }
    # Other commands: stderr's first line (reduced); of stdout only its length: grep'd dumpsys / ps may name other apps.
    $why = Get-SafeNote (Get-FirstLine $R.StdErr)
    if (-not $why) { $why = 'stdout ' + $R.StdOut.Length + ' chars' }
    if ($R.TimedOut) { $why = 'timeout ' + $why }
    return $why
}

function Invoke-ShellReq([string]$Cmd, [int]$TimeoutSec = 60) {
    # A REQUIRED command: a non-zero exit stops this rep (status error), not the run.
    $r = Invoke-Shell $Cmd $TimeoutSec
    if ($r.ExitCode -ne 0 -or $r.TimedOut) {
        $short = ($Cmd -split ';')[-1].Trim(' ')
        throw ('ADBWALK-REP: "' + (Get-Cut $short 60) + '" failed (exit ' + $r.ExitCode + '): ' + (Get-AdbWhy $r))
    }
    return $r
}

function Wait-Ms([int]$Ms, [string]$Why) {
    if ($Ms -le 0) { return }
    Write-WalkLog ('wait ' + $Ms + ' ms (' + $Why + ')')
    Start-Sleep -Milliseconds $Ms
}

function Wait-Sec([int]$Sec, [string]$Why) {
    if ($Sec -le 0) { return }
    Write-WalkLog ('wait ' + $Sec + ' s (' + $Why + ')')
    Start-Sleep -Seconds $Sec
}

# ---------------------------------------------------------------- config
function Read-JsonFile([string]$Path) {
    # ReadAllText strips a BOM and reads UTF-8; ConvertFrom-Json accepts CRLF.
    $text = [System.IO.File]::ReadAllText($Path)
    return ($text | ConvertFrom-Json)
}

function Get-Field($Obj, [string]$Name) {
    if ($null -eq $Obj) { return $null }
    if ($Obj -isnot [System.Management.Automation.PSCustomObject]) { return $null }
    $p = $Obj.PSObject.Properties[$Name]
    if ($null -eq $p) { return $null }
    return $p.Value
}

function Test-IsInt($V) {
    if ($null -eq $V) { return $false }
    if (-not ($V -is [int] -or $V -is [long] -or $V -is [double] -or $V -is [decimal])) { return $false }
    return ([double]$V -eq [math]::Floor([double]$V))
}

function Get-Seed([int]$K) {
    if ($K -lt 0 -or $K -ge $script:Seeds.Count) { return $null }
    return $script:Seeds[$K]
}

function Get-SeedGap([int]$K) {
    # Only the seedAddresses list counts here: the image chat address (after it in $script:Seeds) is no seed chat.
    if ($K -ge $script:SeedAddrCount) { return ('walk.local.json has no seed address ' + $K) }
    if ($script:SeedNote.ContainsKey($K)) { return $script:SeedNote[$K] }
    if (-not (Get-Seed $K)) { return 'walk.local.json has no seed address' }
    return ''
}

function Test-OnScreen([int]$X, [int]$Y) {
    return ($X -ge 0 -and $Y -ge 0 -and $X -le ($script:W - 1) -and $Y -le ($script:H - 1))
}

function Get-TapGap([string]$Name) {
    $tap = Get-Field (Get-Field $script:Cfg 'taps') $Name
    if ($null -eq $tap) { return ('a52s.json has no taps.' + $Name) }
    $x = Get-Field $tap 'x'
    $y = Get-Field $tap 'y'
    if (-not (Test-IsInt $x) -or -not (Test-IsInt $y)) { return ('a52s.json taps.' + $Name + ' is not two integers') }
    if ($x -eq 0 -and $y -eq 0) { return ('taps.' + $Name + ' not calibrated') }
    if (-not (Test-OnScreen $x $y)) { return ('taps.' + $Name + ' is off the screen') }
    return ''
}

function Get-SwipeGap([string]$Name) {
    $sw = Get-Field (Get-Field $script:Cfg 'swipes') $Name
    if ($null -eq $sw) { return ('a52s.json has no swipes.' + $Name) }
    $v = @()
    foreach ($k in @('x1', 'y1', 'x2', 'y2', 'ms')) {
        $f = Get-Field $sw $k
        if (-not (Test-IsInt $f)) { return ('a52s.json swipes.' + $Name + '.' + $k + ' is not an integer') }
        $v += [int]$f
    }
    if ($v[0] -eq 0 -and $v[1] -eq 0 -and $v[2] -eq 0 -and $v[3] -eq 0) { return ('swipes.' + $Name + ' not calibrated') }
    if (-not (Test-OnScreen $v[0] $v[1]) -or -not (Test-OnScreen $v[2] $v[3])) { return ('swipes.' + $Name + ' is off the screen') }
    $dx = $v[2] - $v[0]
    $dy = $v[3] - $v[1]
    if ([math]::Sqrt($dx * $dx + $dy * $dy) -lt 200) { return ('swipes.' + $Name + ' is shorter than 200 px') }
    if ($v[4] -lt 100 -or $v[4] -gt 2000) { return ('swipes.' + $Name + '.ms is not 100..2000') }
    return ''
}

function Get-ScreenGap([string]$Name) {
    $scr = Get-Field (Get-Field $script:Cfg 'screens') $Name
    if ($null -eq $scr) { return ('a52s.json has no screens.' + $Name) }
    $probes = @(Get-Field $scr 'probes')
    if ($probes.Count -eq 0) { return ('screens.' + $Name + ' not calibrated (no probes)') }
    $i = 0
    $placeholder = 0
    foreach ($pr in $probes) {
        $i++
        $x = Get-Field $pr 'x'
        $y = Get-Field $pr 'y'
        $rgb = [string](Get-Field $pr 'rgb')
        $tol = Get-Field $pr 'tol'
        if (-not (Test-IsInt $x) -or -not (Test-IsInt $y) -or -not (Test-IsInt $tol) -or $rgb -cnotmatch '^#[0-9A-Fa-f]{6}\z') {
            return ('screens.' + $Name + ' probe ' + $i + ' is invalid')
        }
        if (-not (Test-OnScreen $x $y) -or $tol -lt 0 -or $tol -gt 255) {
            return ('screens.' + $Name + ' probe ' + $i + ' is off the screen or tol is not 0..255')
        }
        # The contract's sample probe {0,0,#000000} is a placeholder, not a calibration.
        if ($x -eq 0 -and $y -eq 0 -and $rgb -eq '#000000') { $placeholder++ }
    }
    if ($placeholder -eq $probes.Count) { return ('screens.' + $Name + ' not calibrated (placeholder probe)') }
    $min = Get-Field $scr 'minMatch'
    if (-not (Test-IsInt $min) -or $min -lt 1 -or $min -gt $probes.Count) { return ('screens.' + $Name + '.minMatch is not 1..' + $probes.Count) }
    return ''
}

function Get-StepGap([string]$Step) {
    $need = @()
    if ($Step -eq 'coldstart') { $need = @('screen:home') }
    elseif ($Step -eq 'chat-intent') { $need = @('screen:chat') }
    elseif ($Step -eq 'chat-tap' -or $Step -eq 'resume' -or $Step -eq 'resume-long') { $need = @('tap:chatRow1', 'screen:chat') }
    elseif ($Step -eq 'scroll') { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', 'seed:0') }
    elseif ($Step -eq 'resume-now' -or $Step -eq 'resume-3s') { $need = @('tap:chatRow1', 'screen:chat') }
    elseif ($Step -eq 'chatinfo') { $need = @('tap:chatHeader', 'screen:chat', 'screen:chatinfo') }
    elseif ($script:TabNames.ContainsKey($Step)) { $need = @(('tap:' + $script:TabNames[$Step]), 'tap:tabChats', 'screen:home') }
    elseif ($Step -eq 'history') { $need = @('swipe:historyOlder', 'screen:chat', 'count:historyMaxSwipes') }
    elseif ($Step -eq 'scroll-image') { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', 'image:') }
    foreach ($n in $need) {
        $kind, $name = $n -split ':', 2
        $gap = ''
        if ($kind -eq 'screen') { $gap = Get-ScreenGap $name }
        elseif ($kind -eq 'tap') { $gap = Get-TapGap $name }
        elseif ($kind -eq 'swipe') { $gap = Get-SwipeGap $name }
        elseif ($kind -eq 'seed') { $gap = Get-SeedGap ([int]$name) }
        elseif ($kind -eq 'count') { if ($script:Tm[$name] -lt 1) { $gap = ('a52s.json timing.' + $name + ' is 0') } }
        elseif ($kind -eq 'image') { if ($script:ImageSeed -lt 0) { $gap = 'walk.local.json has no valid imageChatAddress (the image seed of speed batch 1a)' } }
        if ($gap) { return $gap }
    }
    return ''
}

function Get-TapText([string]$Name) {
    $tap = Get-Field (Get-Field $script:Cfg 'taps') $Name
    return ('input tap ' + [int](Get-Field $tap 'x') + ' ' + [int](Get-Field $tap 'y'))
}

function Get-SwipeText([string]$Name) {
    $sw = Get-Field (Get-Field $script:Cfg 'swipes') $Name
    return ('input swipe ' + [int](Get-Field $sw 'x1') + ' ' + [int](Get-Field $sw 'y1') + ' ' + [int](Get-Field $sw 'x2') + ' ' +
        [int](Get-Field $sw 'y2') + ' ' + [int](Get-Field $sw 'ms'))
}

# ---------------------------------------------------------------- phone output readers
function Read-Stamp([string]$Text) {
    # First line of the shell output = the phone clock, e.g. 11-12T17:45:10.123456789 -> 11-12T17:45:10.123
    $first = Get-FirstLine $Text
    $o = @{ T0 = $null; Note = '' }
    if ($first -cmatch '^([0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})\.([0-9]{3})[0-9]*\z') { $o.T0 = $Matches[1] + '.' + $Matches[2] }
    elseif ($first -match '%N|\.N\z|:[0-9]{2}\z') { $o.Note = 'phone date has no %N' }
    else { $o.Note = 'no phone clock stamp in the shell output' }
    return $o
}

function Set-RepStamp($Rec, [string]$Text) {
    $s = Read-Stamp $Text
    if ($s.T0) { $Rec['t0'] = $s.T0 }
    else { throw ('ADBWALK-REP: ' + $s.Note) }
}

function Read-AmOutput([string]$Text) {
    $o = @{ Am = [ordered]@{}; Notes = (New-Object System.Collections.Generic.List[string]); Error = '' }
    $total = $null; $wait = $null; $state = $null
    foreach ($l in (Split-Lines $Text)) {
        $t = Get-Clean $l
        if ($t -cmatch '^TotalTime:\s*([0-9]{1,9})\z') { $total = [int]$Matches[1] }
        elseif ($t -cmatch '^WaitTime:\s*([0-9]{1,9})\z') { $wait = [int]$Matches[1] }
        elseif ($t -cmatch '^LaunchState:\s*([A-Z]{1,10})\z') { $state = $Matches[1] }
        elseif ($t.StartsWith('Status:', [System.StringComparison]::Ordinal)) {
            if ($t -cmatch '^Status:\s*([A-Za-z_]{1,20})\z') { if ($Matches[1] -cne 'ok') { $o.Notes.Add('am Status: ' + $Matches[1]) } }
            else { $o.Notes.Add('am Status: (unreadable)') }
        }
        elseif ($t -match 'current task has been brought to the front') { $o.Notes.Add('am: task brought to the front (intent not delivered)') }
        elseif ($t -match 'delivered to currently running top-most instance') { $o.Notes.Add('am: intent delivered to the running instance') }
        elseif ($t -match '^Error' -or $t -match 'Exception') { if (-not $o.Error) { $o.Error = Get-SafeNote $t } }
    }
    if ($null -ne $total) { $o.Am['totalTime'] = $total }
    if ($null -ne $wait) { $o.Am['waitTime'] = $wait }
    if ($null -ne $state) { $o.Am['launchState'] = $state }
    return $o
}

function Test-AppFront {
    # The focus line itself never leaves this function: it may name another app.
    # Exact shape only, e.g. mCurrentFocus=Window{8db8463 u0 com.ixilabs.spixi.dev/crc64e0b33a801f5f9986.MainActivity}
    $r = Invoke-Shell 'dumpsys window | grep -e mCurrentFocus='
    $re = '^mCurrentFocus=Window\{[0-9a-f]{1,16} u[0-9]{1,3} ' + [regex]::Escape($script:Pkg) + '/[A-Za-z0-9_.]{1,200}\}\z'
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if ($t.StartsWith('mCurrentFocus=', [System.StringComparison]::Ordinal) -and -not $t.StartsWith('mCurrentFocus=null', [System.StringComparison]::Ordinal)) {
            return [bool]($t -cmatch $re)
        }
    }
    return $false
}

function Invoke-Back {
    # BACK only while our app has the focus; a foreign window gets no key at all. Returns: BACK sent.
    if (-not (Test-AppFront)) { return $false }
    [void](Invoke-Shell 'input keyevent 4')
    return $true
}

function Invoke-BackReq {
    if (-not (Invoke-Back)) { throw 'ADBWALK-NOSCREEN: foreign window in front (BACK not sent)' }
}

function Assert-AppFront {
    if (-not (Test-AppFront)) { throw 'ADBWALK-NOSCREEN: foreign window in front (input skipped)' }
}

function Get-ScreenState {
    $o = @{ Awake = $false; Locked = $false; Why = '' }
    $p = Invoke-Shell 'dumpsys power | grep -e mWakefulness='
    $o.Awake = ($p.StdOut -cmatch 'mWakefulness=Awake')
    $w = Invoke-Shell 'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus='
    $a = Invoke-Shell 'dumpsys activity activities | grep -e mKeyguardShowing='
    $txt = $w.StdOut + "`n" + $a.StdOut
    if ($txt -cmatch '(mDreamingLockscreen|isKeyguardShowing|mShowingLockscreen|mKeyguardShowing)=true') {
        $o.Locked = $true; $o.Why = $Matches[0]
    } elseif ($w.StdOut -cmatch 'mCurrentFocus=[^\r\n]*(NotificationShade|Keyguard|Bouncer)') {
        $o.Locked = $true; $o.Why = 'a system window has the focus'
    }
    return $o
}

# ---------------------------------------------------------------- screenshots and probes
function Initialize-Drawing {
    if ($script:DrawingState -eq 0) {
        # Loading the assembly is not enough (on Linux it loads, then fails on first use): make one bitmap.
        try {
            Add-Type -AssemblyName System.Drawing
            $probe = New-Object System.Drawing.Bitmap(1, 1)
            $probe.Dispose()
            $script:DrawingState = 1
        } catch { $script:DrawingState = 2 }
    }
    return ($script:DrawingState -eq 1)
}

function Get-PngSize([string]$Path) {
    # Read the IHDR chunk directly: the size check needs no System.Drawing and decodes nothing.
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $null }
    $buf = New-Object byte[] 24
    $fs = [System.IO.File]::OpenRead($Path)
    try { $n = $fs.Read($buf, 0, 24) } finally { $fs.Dispose() }
    if ($n -lt 24) { return $null }
    $sig = @(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82)
    for ($i = 0; $i -lt 16; $i++) { if ($i -lt 8 -or $i -ge 12) { if ($buf[$i] -ne $sig[$i]) { return $null } } }
    $w = ([long]$buf[16] * 16777216) + ([long]$buf[17] * 65536) + ([long]$buf[18] * 256) + [long]$buf[19]
    $h = ([long]$buf[20] * 16777216) + ([long]$buf[21] * 65536) + ([long]$buf[22] * 256) + [long]$buf[23]
    return @{ W = $w; H = $h }
}

function Test-Probes([string]$Path, [string]$Name) {
    $o = @{ Ok = $false; Note = ''; Matched = 0; Of = 0; Detail = (New-Object System.Collections.Generic.List[object]) }
    $scr = Get-Field (Get-Field $script:Cfg 'screens') $Name
    $probes = @(Get-Field $scr 'probes')
    $o.Of = $probes.Count
    if (-not (Initialize-Drawing)) { $o.Note = 'cannot read PNG'; return $o }
    $ms = $null
    $bmp = $null
    try {
        # A memory copy: the PNG on disk is never locked.
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $ms = New-Object System.IO.MemoryStream(, $bytes)
        $bmp = New-Object System.Drawing.Bitmap($ms)
        foreach ($pr in $probes) {
            $x = [int](Get-Field $pr 'x'); $y = [int](Get-Field $pr 'y'); $tol = [int](Get-Field $pr 'tol')
            $hex = ([string](Get-Field $pr 'rgb')).Substring(1)
            $wr = [Convert]::ToInt32($hex.Substring(0, 2), 16)
            $wg = [Convert]::ToInt32($hex.Substring(2, 2), 16)
            $wb = [Convert]::ToInt32($hex.Substring(4, 2), 16)
            $c = $bmp.GetPixel($x, $y)
            $hit = ([math]::Abs([int]$c.R - $wr) -le $tol) -and ([math]::Abs([int]$c.G - $wg) -le $tol) -and ([math]::Abs([int]$c.B - $wb) -le $tol)
            if ($hit) { $o.Matched++ }
            $o.Detail.Add([ordered]@{ x = $x; y = $y; want = ('#' + $hex.ToUpperInvariant()); actual = ('#{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B); tol = $tol; match = [bool]$hit })
        }
        $min = [int](Get-Field $scr 'minMatch')
        $o.Ok = ($o.Matched -ge $min)
        if (-not $o.Ok) { $o.Note = 'probes ' + $o.Matched + ' of ' + $o.Of + ' match (minMatch ' + $min + ')' }
    } catch {
        $o.Ok = $false
        $o.Note = 'cannot read PNG'
        $o.Detail.Clear()
    } finally {
        if ($bmp) { $bmp.Dispose() }
        if ($ms) { $ms.Dispose() }
    }
    return $o
}

function Test-Screen([string]$Png, [string]$Name) {
    # Focus was checked before the screenshot; here: (2) the PNG size, then (3) at least minMatch probes.
    $size = Get-PngSize $Png
    if ($null -eq $size) { return @{ Ok = $false; Note = 'screenshot is not a PNG' } }
    if ($size.W -ne $script:W -or $size.H -ne $script:H) {
        return @{ Ok = $false; Note = ('screenshot is ' + $size.W + 'x' + $size.H + ', a52s.json wants ' + $script:W + 'x' + $script:H) }
    }
    $pr = Test-Probes $Png $Name
    if (-not $pr.Ok) { return @{ Ok = $false; Note = $pr.Note } }
    return @{ Ok = $true; Note = '' }
}

function Save-Shot([string]$LocalName) {
    $local = Join-Path $script:RunDir $LocalName
    if (Test-Path -LiteralPath $local) { throw ('ADBWALK-REP: ' + $LocalName + ' exists already') }
    [void](Invoke-ShellReq ('screencap -p ' + $script:PhoneShot))
    $r = Invoke-Adb -AdbArgs @('pull', $script:PhoneShot, $local) -TimeoutSec 120
    [void](Invoke-Shell ('rm -f ' + $script:PhoneShot))
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or -not (Test-Path -LiteralPath $local)) {
        $left = ''
        if (-not (Remove-LocalFile $local)) { $left = ', local file not deleted' }
        throw ('ADBWALK-REP: screenshot ' + (Get-AdbWhy $r) + $left)
    }
    return $local
}

function Save-Log([string]$LocalName) {
    # Filtered ON THE PHONE (app pid + emitter shapes), then pulled byte-exact. Returns a note ('' = pulled).
    $local = Join-Path $script:RunDir $LocalName
    if (Test-Path -LiteralPath $local) { throw ('ADBWALK-REP: ' + $LocalName + ' exists already') }
    $p = Invoke-Shell ('pidof ' + $script:Pkg)
    $ids = @(Get-Pids $p.StdOut)
    if ($ids.Count -ne 1) {
        [System.IO.File]::WriteAllBytes($local, (New-Object byte[] 0))
        if ($ids.Count -eq 0) { return 'app not running at pull' }
        return 'several app pids at pull'
    }
    $w = Invoke-Shell (Get-LogPullCmd $ids[0])
    # The shell returns grep's status: 1 = no matching line (an empty file, the parser says no data), not an error.
    if ($w.TimedOut -or ($w.ExitCode -ne 0 -and $w.ExitCode -ne 1)) {
        [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
        throw ('ADBWALK-REP: filtered log write failed (exit ' + $w.ExitCode + '): ' + (Get-AdbWhy $w))
    }
    $r = Invoke-Adb -AdbArgs @('pull', $script:PhoneLog, $local) -TimeoutSec 120
    [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or -not (Test-Path -LiteralPath $local)) {
        $left = ''
        if (-not (Remove-LocalFile $local)) { $left = ', local file not deleted' }
        throw ('ADBWALK-REP: log ' + (Get-AdbWhy $r) + $left)
    }
    return ''
}

# ---------------------------------------------------------------- processes and memory
function Get-ServiceBlocks([string]$Text) {
    # A block starts at a line containing "ServiceRecord{".
    $blocks = New-Object System.Collections.Generic.List[string]
    $cur = $null
    foreach ($l in (Split-Lines $Text)) {
        if ($l.Contains('ServiceRecord{')) {
            if ($null -ne $cur) { $blocks.Add($cur.ToString()) }
            $cur = New-Object System.Text.StringBuilder
        }
        if ($null -ne $cur) { [void]$cur.AppendLine($l) }
    }
    if ($null -ne $cur) { $blocks.Add($cur.ToString()) }
    return $blocks
}

function Find-Renderer {
    # Only a CONFIRMED renderer is returned: RendererPid stays empty otherwise (never a guess).
    $o = @{ AppPid = $null; RendererPid = $null; Confirmed = $false; Note = ''; CandCount = 0
        OwnPsLines = (New-Object System.Collections.Generic.List[string]); RawLines = (New-Object System.Collections.Generic.List[string]) }
    $r = Invoke-Shell ('pidof ' + $script:Pkg)
    $ids = @(Get-Pids $r.StdOut)
    if ($ids.Count -eq 0) { $o.Note = 'app not running (pidof gave no pid)'; return $o }
    if ($ids.Count -gt 1) { $o.Note = 'pidof gave several pids'; return $o }
    $o.AppPid = [int]$ids[0]
    $ps = Invoke-Shell 'ps -A | grep -e sandboxed'
    if ($ps.TimedOut -or ($ps.ExitCode -ne 0 -and $ps.ExitCode -ne 1)) { $o.Note = 'ps -A failed (exit ' + $ps.ExitCode + ')'; return $o }
    $cands = @{}
    $providers = @{}
    foreach ($l in (Split-Lines $ps.StdOut)) {
        $tok = @((Get-Clean $l) -split '[ \t]+')
        if ($tok.Count -lt 3) { continue }
        $name = $tok[$tok.Count - 1]
        if ($tok[1] -cmatch '^[0-9]{1,9}\z' -and $name -cmatch '^([A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+):sandboxed_process' -and $Matches[1].Length -le 100) {
            $cands[[int]$tok[1]] = (Get-Clean $l)
            $providers[$Matches[1]] = $true
        }
    }
    $o.CandCount = $cands.Count
    if ($cands.Count -eq 0) { $o.Note = 'no :sandboxed_process renderer found'; return $o }

    # 1) AOSP files an external isolated service under the CLIENT package: <our pkg>/...SandboxedProcessService0:0.
    $s = Invoke-Shell ('dumpsys activity services ' + $script:Pkg)
    if ($s.TimedOut -or $s.ExitCode -ne 0) { $o.Note = 'dumpsys activity services ' + $script:Pkg + ' failed (exit ' + $s.ExitCode + ')'; return $o }
    foreach ($l in (Split-Lines $s.StdOut)) {
        if ($l.Contains('ServiceRecord{') -or $l.Contains('app=ProcessRecord') -or $l.Contains('processName=') -or $l.Contains('packageName=')) { $o.RawLines.Add((Get-SafeNote (Get-Clean $l) 300)) }
    }
    $own = @{}
    foreach ($bl in (Get-ServiceBlocks $s.StdOut)) {
        $first = @(Split-Lines $bl)[0]
        if (-not $first.Contains('SandboxedProcessService')) { continue }
        if ($bl -cmatch 'app=ProcessRecord\{[0-9a-f]+ ([0-9]{1,9}):') {
            $rp = [int]$Matches[1]
            if ($cands.ContainsKey($rp)) { $own[$rp] = $true }
        }
    }
    foreach ($k in $own.Keys) { $o.OwnPsLines.Add((Get-SafeNote $cands[$k] 300)) }
    if ($own.Count -eq 1) {
        foreach ($k in $own.Keys) { $o.RendererPid = [int]$k }
        $o.Confirmed = $true
        return $o
    }
    if ($own.Count -gt 1) { $o.Note = [string]$own.Count + ' renderers filed under the app: cannot tell apart'; return $o }

    # 2) Fallback: blocks of the WebView provider package that name our pid or package as a client.
    $pe = [regex]::Escape($script:Pkg)
    $usRe = '(?<![A-Za-z0-9_.])(' + $o.AppPid + ':)?' + $pe + '(?![A-Za-z0-9_.])'
    $ours = @{}
    foreach ($prov in $providers.Keys) {
        $s2 = Invoke-Shell ('dumpsys activity services ' + $prov)
        if ($s2.TimedOut -or $s2.ExitCode -ne 0) { $o.Note = 'dumpsys activity services ' + $prov + ' failed (exit ' + $s2.ExitCode + ')'; return $o }
        foreach ($bl in (Get-ServiceBlocks $s2.StdOut)) {
            if ($bl -cnotmatch 'app=ProcessRecord\{[0-9a-f]+ ([0-9]{1,9}):') { continue }
            $rp = [int]$Matches[1]
            if ($cands.ContainsKey($rp) -and $bl -cmatch $usRe) { $ours[$rp] = $true }
        }
    }
    if ($ours.Count -eq 1) {
        foreach ($k in $ours.Keys) { $o.RendererPid = [int]$k }
        $o.Confirmed = $true
    } elseif ($ours.Count -gt 1) {
        $o.Note = [string]$ours.Count + ' renderers name the app: cannot tell apart'
    } else {
        $o.Note = 'renderer cannot be told apart (' + $cands.Count + ' sandboxed processes)'
    }
    return $o
}

function Save-Meminfo([int]$ProcId, [string]$LocalName) {
    $r = Invoke-Shell ('dumpsys meminfo ' + $ProcId)
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or $r.StdOut -cnotmatch ('MEMINFO in pid ' + $ProcId + '[^0-9]')) {
        return ('dumpsys meminfo ' + $ProcId + ' gave no MEMINFO: ' + (Get-AdbWhy $r))
    }
    Write-RawFile (Join-Path $script:RunDir $LocalName) $r.StdOut
    return ''
}

# ---------------------------------------------------------------- restore state (survives a killed run)
function Get-DeviceFingerprint {
    # 16 hex chars of SHA-256 of the serial: ties a pending restore to one phone without storing the serial.
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $h = $sha.ComputeHash($script:Utf8.GetBytes($script:DevSerial)) } finally { $sha.Dispose() }
    return (([System.BitConverter]::ToString($h)).Replace('-', '').Substring(0, 16).ToLowerInvariant())
}

function Write-Pending {
    $d = [ordered]@{ device = (Get-DeviceFingerprint); stayOld = $script:StayOld; wifiTouched = [bool]$script:WifiTouched; pid = $PID; started = $script:StartedIso }
    # Temp file + move: a crash mid-write never leaves a half file.
    $tmp = $script:PendingPath + '.tmp'
    [System.IO.File]::WriteAllText($tmp, (ConvertTo-Json -InputObject $d -Depth 8), $script:Utf8)
    if ([System.IO.File]::Exists($script:PendingPath)) { [System.IO.File]::Replace($tmp, $script:PendingPath, [NullString]::Value) }
    else { [System.IO.File]::Move($tmp, $script:PendingPath) }
    $script:PendingWritten = $true
}

function Invoke-PendingRestore {
    if (-not [System.IO.File]::Exists($script:PendingPath)) { return }
    Say-Log 'pending restore file found: an interrupted run left the phone changed'
    try { $pd = Read-JsonFile $script:PendingPath } catch { Stop-Walk 'the pending restore file is unreadable: restore the phone by hand, then delete the file' }
    # A file of another phone (or an older file without a fingerprint) is never applied here.
    if (-not (Test-Ordinal ([string](Get-Field $pd 'device')) (Get-DeviceFingerprint))) {
        Stop-Walk ([System.IO.Path]::GetFileName($script:PendingPath) + ' belongs to another phone: attach that phone, or delete the file')
    }
    $so = [string](Get-Field $pd 'stayOld')
    $wt = (Get-Field $pd 'wifiTouched') -eq $true
    if ($so -cnotmatch '^([0-9]|1[0-5])\z') {
        if ($wt) { [void](Invoke-Shell 'svc wifi enable') }
        Stop-Walk 'the pending restore file has a stayOld outside 0..15 (file kept): fix or delete the file'
    }
    $ok = $true
    if ($wt) { $ok = ((Invoke-Shell 'svc wifi enable').ExitCode -eq 0) -and $ok }
    $ok = ((Invoke-Shell ('settings put global stay_on_while_plugged_in ' + $so)).ExitCode -eq 0) -and $ok
    if (-not $ok) { Stop-Walk 'cannot apply the pending restore file (kept): check the phone' }
    [System.IO.File]::Delete($script:PendingPath)
    Say-Log 'restored the phone state left by an interrupted run'
}

function Restore-Phone {
    # Phone commands first, console output last: on Ctrl+C a console write must not skip a restore.
    if (-not $script:PendingWritten) { return }
    $msgs = New-Object System.Collections.Generic.List[string]
    $allOk = $true
    if ($script:WifiTouched) {
        $ok1 = $false
        try { $ok1 = ((Invoke-Shell 'svc wifi enable').ExitCode -eq 0) } catch { }
        if ($ok1) { $msgs.Add('finally: Wi-Fi enabled') } else { $allOk = $false; $msgs.Add('finally: WARNING svc wifi enable failed: turn Wi-Fi on by hand') }
    }
    if ($null -ne $script:StayOld) {
        $cmd = 'settings put global stay_on_while_plugged_in ' + $script:StayOld
        $ok2 = $false
        try { $ok2 = ((Invoke-Shell $cmd).ExitCode -eq 0) } catch { }
        if ($ok2) { $msgs.Add('finally: stay_on_while_plugged_in restored to ' + $script:StayOld) }
        else { $allOk = $false; $msgs.Add('finally: WARNING restore failed: run "adb shell ' + $cmd + '" by hand') }
    }
    try { [void](Invoke-Shell ('rm -f ' + $script:PhoneShot)) } catch { }
    try { [void](Invoke-Shell ('rm -f ' + $script:PhoneLog)) } catch { }
    if ($allOk) { try { [System.IO.File]::Delete($script:PendingPath) } catch { } }
    else { $script:RestoreFailed = $true; $msgs.Add('finally: the pending restore file is kept: the next run applies it first') }
    foreach ($m in $msgs) { try { Write-WalkLog $m; Say $m } catch { } }
}

# ---------------------------------------------------------------- reps
function New-Rep([string]$Step, [int]$Rep) {
    return @{ step = $Step; rep = $Rep; status = 'ok'; notes = (New-Object System.Collections.Generic.List[string]) }
}

function Add-Note($Rec, [string]$Text) {
    if ($Text) { $Rec.notes.Add((Protect-Text $Text)) }
}

function Get-Nn([int]$Rep) { return $Rep.ToString('00', $script:Inv) }

function Save-RunJson([bool]$Finished) {
    if ($script:Mode -ne 'walk' -or -not $script:RunDir -or -not $script:WalkStarted) { return }
    $doc = [ordered]@{ schema = 1; tool = 'adb-walk'; run = $script:RunName; mode = 'walk' }
    if ($script:Hook) { $doc['adbHook'] = $true }
    $doc['device'] = $script:DevInfo
    $doc['app'] = $script:AppInfo
    $doc['repeats'] = $script:RepeatsN
    $doc['stepsRequested'] = [string[]]$script:StepsReq
    $doc['reps'] = $script:Reps
    $doc['memory'] = $script:Mem
    $doc['finished'] = $Finished
    Write-JsonFile (Join-Path $script:RunDir 'run.json') $doc
}

function Complete-Rep($Rec, [int]$Of) {
    $out = [ordered]@{ step = $Rec.step; rep = $Rec.rep; status = $Rec.status }
    foreach ($k in @('t0', 'log', 'shot', 'shotPre', 'screen', 'screenOk', 'swipes', 'am')) { if ($Rec.ContainsKey($k)) { $out[$k] = $Rec[$k] } }
    $full = ($Rec.notes -join ', ')
    $out['note'] = Get-SafeNote $full
    $script:Reps.Add($out)
    # error and no-screen both count toward the halt; only ok resets it.
    if ($Rec.status -eq 'error' -or $Rec.status -eq 'no-screen') {
        $script:ErrStreak++
        $script:NeedRecover = $true; $script:LastFailed = $true
    } elseif ($Rec.status -eq 'ok') {
        $script:ErrStreak = 0
        $script:NeedRecover = $false; $script:LastFailed = $false
    }
    Save-RunJson $false
    $line = '[' + $Rec.step + ' ' + $Rec.rep + '/' + $Of + '] ' + $Rec.status
    if ($Rec.ContainsKey('am') -and $Rec['am'].Contains('totalTime')) { $line += ' TotalTime=' + $Rec['am']['totalTime'] }
    if ($full) { $line += ' - ' + (Get-SafeNote $full) }
    Say-Log $line
    if ($script:ErrStreak -ge 3 -and -not $script:Halted) {
        $script:Halted = $true
        Say-Log 'three failed reps in a row: the walk stops here (is the phone still attached, unlocked, the app in front?)'
    }
}

function Invoke-EnsureHome {
    # Bounded recovery. Focus FIRST: our app in front after a failure -> one BACK; a foreign window gets no key,
    # only the single "am start -W -n" that brings our app to the front. Returns: app in front.
    if (-not $script:NeedRecover) { return $true }
    $script:NeedRecover = $false
    $front = Test-AppFront
    if ($front -and $script:LastFailed) {
        Write-WalkLog 'recover: back once'
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
        $front = Test-AppFront
    }
    $script:LastFailed = $false
    if ($front) { return $true }
    Say-Log '  recover: the app is not in front: am start'
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    if (Test-AppFront) { return $true }
    $script:NeedRecover = $true
    return $false
}

function Reset-AppToChats {
    # After a tab rep that failed past its tab tap (or a cal-11 that failed): Wallet, Account or Apps may be in front,
    # and the recovery BACK would only move the task to the back (am start -W then resumes the same view). A cold start
    # always boots on the Chats tab. The coldstart pair of commands; Invoke-Shell, so this never throws on a failed exit.
    [void](Invoke-Shell ('am force-stop ' + $script:Pkg))
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    Say-Log '  tab step: the app was restarted after a failed tab rep (a cold start lands on Chats)'
}

function Invoke-ShotCheck($Rec, [string]$Expect, [switch]$DropOnFail) {
    # -DropOnFail (tab steps): a PNG whose probe check fails is deleted and not recorded (it may show Wallet or Account).
    if ($Expect) { $Rec['screen'] = $Expect }
    # Focus BEFORE screencap: a foreign window is never photographed.
    if (-not (Test-AppFront)) {
        if ($Expect) { $Rec['screenOk'] = $false }
        if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
        Add-Note $Rec 'foreign window in front (no screenshot)'
        return
    }
    $name = 'shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '.png'
    $local = Save-Shot $name
    if (-not (Test-AppFront)) {
        $gone = Remove-LocalFile $local
        if ($Expect) { $Rec['screenOk'] = $false }
        if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
        if ($gone) { Add-Note $Rec 'foreign window during the screenshot (PNG deleted)' }
        else { Add-Note $Rec 'foreign window during the screenshot, local file not deleted' }
        return
    }
    $dropped = $false
    if (-not $DropOnFail) { $Rec['shot'] = $name }
    if ($Expect) {
        $chk = Test-Screen $local $Expect
        $Rec['screenOk'] = [bool]$chk.Ok
        if (-not $chk.Ok) {
            if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
            if ($DropOnFail) {
                $dropped = $true
                if (Remove-LocalFile $local) { Add-Note $Rec ('PNG deleted: ' + $chk.Note) }
                else { Add-Note $Rec ($chk.Note + ', local file not deleted') }
            } else {
                Add-Note $Rec $chk.Note
            }
        }
    }
    if ($DropOnFail -and -not $dropped) { $Rec['shot'] = $name }
}

function Invoke-LogPull($Rec) {
    $name = 'android-walk-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '.txt'
    $n = Save-Log $name
    $Rec['log'] = $name
    if ($n) { Add-Note $Rec $n }
}

function Add-AmResult($Rec, $Am) {
    if ($Am.Am.Count -gt 0) { $Rec['am'] = $Am.Am }
    foreach ($n in $Am.Notes) { Add-Note $Rec $n }
}

function Invoke-ColdstartRep($Rec) {
    [void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))
    Wait-Sec $script:Tm['coldStartIdleSec'] 'coldStartIdleSec'
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    Add-AmResult $Rec $am
    Set-RepStamp $Rec $r.StdOut
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    $limit = $script:Tm['coldStartTimeoutSec']
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $seen = $false
    while ($sw.Elapsed.TotalSeconds -lt $limit) {
        $p = Invoke-Shell $script:PollCmd
        if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})' -and [int]$Matches[1] -gt 0) { $seen = $true; break }
        Start-Sleep -Seconds 1
    }
    if ($seen) { Write-WalkLog ('boot line after ' + [int]$sw.Elapsed.TotalSeconds + ' s') }
    else { Add-Note $Rec ('no boot line within ' + $limit + ' s') }
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    Invoke-ShotCheck $Rec 'home'
    Invoke-LogPull $Rec
}

function Invoke-ChatRep($Rec, [string]$How) {
    [void](Invoke-ShellReq 'logcat -c')
    if ($How -eq 'intent') {
        $r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed ($Rec.rep - 1)))
        $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
        Add-AmResult $Rec $am
        Set-RepStamp $Rec $r.StdOut
        if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    } else {
        Assert-AppFront
        $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatRow1'))
        Set-RepStamp $Rec $r.StdOut
    }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-ScrollRep($Rec) {
    if ($script:ScrollOpen) {
        if ($Rec.rep -eq 1) { throw ('ADBWALK-REP: ' + $script:ScrollOpen) }
        throw ('ADBWALK-SKIP: ' + $script:ScrollWhat + ' did not open (see rep 1)')
    }
    [void](Invoke-ShellReq 'logcat -c')
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatOlder'))
    Set-RepStamp $Rec $r.StdOut
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Assert-AppFront
    [void](Invoke-ShellReq (Get-SwipeText 'chatNewer'))
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    if ($Rec.step -ceq 'scroll-image' -and $Rec.ContainsKey('shot')) {
        # The image chat must be a dev-seed chat, but a wrong address would photograph a real contact: no PNG is kept.
        $png = Join-Path $script:RunDir ([string]$Rec['shot'])
        $Rec.Remove('shot')
        if (Remove-LocalFile $png) { Add-Note $Rec 'PNG deleted (scroll-image keeps no screenshot until the image seed exists)' }
        else { Add-Note $Rec 'PNG not deleted: local file not deleted' }
    }
    Invoke-LogPull $Rec
}

function Invoke-ResumeRep($Rec, [int]$WaitSec, [int]$TapWaitMs, [switch]$DropOnFail) {
    # $TapWaitMs: the wait between the resume and the chat tap; -1 = the old 2 s of the resume rows (unchanged).
    # -DropOnFail (resume-now, resume-3s only): a chat PNG whose probe check fails is deleted (the tap may have hit Wallet).
    [void](Invoke-ShellReq 'input keyevent 3')
    Wait-Sec $WaitSec 'resume wait'
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ('am start -W -n ' + $script:Comp) 60
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    Add-AmResult $Rec $am
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    if ($TapWaitMs -lt 0) { Wait-Sec 2 'after resume' } else { Wait-Ms $TapWaitMs 'after resume' }
    Assert-AppFront
    $r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatRow1'))
    Set-RepStamp $Rec $r2.StdOut
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chat' -DropOnFail:$DropOnFail
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-PreCheck($Rec, [string]$Expect) {
    # The screen check BEFORE the input: focus first, then one screenshot (shot-<step>-NN-pre.png) and its probes.
    # A failed check stops the rep before any input (no-screen) and DELETES the PNG: the screen may be Wallet or
    # Account. Only a PNG that passed is kept (shotPre). A failed check is re-calibrated with -Calibrate.
    if (-not (Test-AppFront)) { throw 'ADBWALK-NOSCREEN: foreign window in front (no screenshot, input skipped)' }
    $name = 'shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '-pre.png'
    $local = Save-Shot $name
    if (-not (Test-AppFront)) {
        if (Remove-LocalFile $local) { throw 'ADBWALK-NOSCREEN: foreign window during the screenshot (PNG deleted)' }
        throw 'ADBWALK-NOSCREEN: foreign window during the screenshot, local file not deleted'
    }
    $chk = Test-Screen $local $Expect
    if (-not $chk.Ok) {
        $left = ' (PNG deleted)'
        if (-not (Remove-LocalFile $local)) { $left = ' (local file not deleted)' }
        throw ('ADBWALK-NOSCREEN: before the input the ' + $Expect + ' screen check failed: ' + $chk.Note + $left)
    }
    $Rec['shotPre'] = $name
}

function Invoke-OpenSeedChat([int]$K) {
    # A seed chat by the notification intent fa (the only entry besides a tap, DECISIONS 1521).
    $r = Invoke-ShellReq ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $K))
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
}

function Invoke-ChatInfoRep($Rec) {
    # Seed chat k-1 by fa, the chat check, then the tap on the chat header: Chat info opens. Then BACK twice.
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-OpenSeedChat ($Rec.rep - 1)
    Invoke-PreCheck $Rec 'chat'
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatHeader'))
    Set-RepStamp $Rec $r.StdOut
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chatinfo'
    Invoke-LogPull $Rec
    # A Chat info page that did not open gets no BACK of its own (a second BACK on home would leave the app).
    if ($Rec['screenOk']) {
        Invoke-BackReq
        Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
    }
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-TabRep($Rec) {
    # From Chats: the tap on one bottom tab (t0), then the tap on Chats. The screenshot is taken on Chats only:
    # the tabs Apps, Wallet and Account show TEST account data. Each view change is confirmed by the app's own
    # frames log line (no timer alone): the Chats tap goes out only after the tab (and for Account the SettingsPage)
    # showed, the screenshot only after Chats came back, and a screenshot that fails the home check is deleted.
    $tap = $script:TabNames[$Rec.step]
    $key = $script:TabFrames[$Rec.step]
    $to = 3 * $script:Tm['tabSettleMs']
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-PreCheck $Rec 'home'
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText $tap))
    # From here on the tab may be in front: a failure of any kind restarts the app (it boots on Chats), then rethrows.
    $tapped = $true
    $reset = $false
    try {
        Set-RepStamp $Rec $r.StdOut
        if (-not (Wait-LogCount $key $to)) { throw ('ADBWALK-REP: the ' + $key + ' tab did not show (no frames line): no tap back, no screenshot') }
        if ($key -eq 'account') {
            if (-not (Wait-LogCount 'settings' $to)) { throw 'ADBWALK-REP: the account settings page did not show (no frames line): no tap back, no screenshot' }
        }
        Assert-AppFront
        [void](Invoke-ShellReq (Get-TapText 'tabChats'))
        if ($key -eq 'account') {
            if (-not (Wait-LogCount 'settingsclosed' $to)) { throw 'ADBWALK-REP: the account settings page did not close (no close line): no screenshot' }
        }
        if (-not (Wait-LogCount 'chats' $to)) { throw 'ADBWALK-REP: Chats did not come back (no frames line): no screenshot' }
        Wait-Ms 300 'after the Chats frames line'
        Invoke-ShotCheck $Rec 'home' -DropOnFail
        Invoke-LogPull $Rec
        # The home check failed (the PNG is deleted, the rep is no-screen): the view is unknown, restart on Chats.
        if ($Rec['screenOk'] -ne $true) { $reset = $true; Reset-AppToChats }
    } catch {
        if ($tapped -and -not $reset -and -not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { Reset-AppToChats }
        throw
    }
}

function Invoke-HistoryRep($Rec) {
    # Seed chat k+4 (seeds 5..9: no other step opens them, so each rep starts at the newest page) by fa, the chat check,
    # then swipes to older messages until the chat shell asked for 3 older pages or historyMaxSwipes is reached.
    # t0 = the first swipe. The rep ends with BACK: the chat is closed after the rep.
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-OpenSeedChat ($Rec.rep + 4)
    Invoke-PreCheck $Rec 'chat'
    $c0 = Get-LoadMoreCount
    if ($null -eq $c0) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
    $k = 0
    $got = 0
    while ($k -lt $script:Tm['historyMaxSwipes']) {
        Assert-AppFront
        if ($k -eq 0) {
            $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'historyOlder'))
            Set-RepStamp $Rec $r.StdOut
        } else {
            [void](Invoke-ShellReq (Get-SwipeText 'historyOlder'))
        }
        $k++
        $Rec['swipes'] = $k
        Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'
        $c = Get-LoadMoreCount
        if ($null -eq $c) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
        $got = $c - $c0
        if ($got -ge 3) { break }
    }
    if ($got -lt 3) { Add-Note $Rec ('only ' + $got + ' page requests after ' + $k + ' swipes') }
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Test-TcpSerial {
    return ($script:DevSerial -cmatch ':[0-9]+\z' -or $script:DevSerial.Contains('_adb-tls-connect'))
}

function Invoke-NetworkRep($Rec) {
    # Wi-Fi off would cut a TCP adb link; and a Wi-Fi that was off must stay off: refuse both cases.
    if (Test-TcpSerial) { throw 'ADBWALK-SKIP: network step refused: adb runs over TCP (Wi-Fi), use USB' }
    $ws = Invoke-Shell 'dumpsys wifi | grep -e Wi-Fi.is'
    if ($ws.StdOut -cnotmatch '(?m)^Wi-Fi is enabled') { throw 'ADBWALK-SKIP: network step refused: Wi-Fi is not enabled at the start of the step' }
    [void](Invoke-ShellReq 'logcat -c')
    # Flag and pending file before the command: the restore happens even when this process dies right after.
    $script:WifiTouched = $true
    Write-Pending
    [void](Invoke-ShellReq 'svc wifi disable')
    Wait-Sec $script:Tm['wifiOffSec'] 'wifiOffSec'
    $r = Invoke-ShellReq ($script:StampCmd + '; svc wifi enable')
    Set-RepStamp $Rec $r.StdOut
    Wait-Sec 30 'after wifi enable'
    Invoke-LogPull $Rec
}

function Invoke-KillRendererRep($Rec) {
    $f = Find-Renderer
    if (-not $f.Confirmed -or -not $f.RendererPid) {
        $why = $f.Note
        if (-not $why) { $why = 'renderer not confirmed' }
        throw ('ADBWALK-SKIP: no confirmed renderer pid: ' + $why)
    }
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-Shell ($script:StampCmd + '; kill ' + $f.RendererPid)
    $s = Read-Stamp $r.StdOut
    if ($s.T0) { $Rec['t0'] = $s.T0 }
    $answer = (($r.StdOut -split "\r?\n" | Select-Object -Skip 1) -join ' ') + ' ' + $r.StdErr
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or $answer -match '(?i)not permitted|denied|no such process') {
        throw ('ADBWALK-REP: kill refused (exit ' + $r.ExitCode + '): ' + (Get-SafeNote (Get-Clean $answer)))
    }
    if (-not $s.T0) { throw ('ADBWALK-REP: ' + $s.Note) }
    Wait-Sec 3 'after kill'
    $p = Invoke-Shell ('pidof ' + $script:Pkg)
    $now = @(Get-Pids $p.StdOut)
    if ($now -contains [string]$f.AppPid) { Add-Note $Rec 'app pid alive after 3 s' }
    elseif ($now.Count -gt 0) { Add-Note $Rec 'app pid changed within 3 s (restarted)' }
    else { Add-Note $Rec 'app pid gone after 3 s' }
    Invoke-ShotCheck $Rec ''
    Invoke-LogPull $Rec
}

function Invoke-RepBody($Rec) {
    $s = $Rec.step
    if ($s -eq 'coldstart') { Invoke-ColdstartRep $Rec }
    elseif ($s -eq 'chat-intent') { Invoke-ChatRep $Rec 'intent' }
    elseif ($s -eq 'chat-tap') { Invoke-ChatRep $Rec 'tap' }
    elseif ($s -eq 'scroll') { Invoke-ScrollRep $Rec }
    elseif ($s -eq 'resume') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] (-1) }
    elseif ($s -eq 'resume-long') { Invoke-ResumeRep $Rec $script:Tm['resumeLongWaitSec'] (-1) }
    elseif ($s -eq 'resume-now') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] 0 -DropOnFail }
    elseif ($s -eq 'resume-3s') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] $script:Tm['resumeLateTapMs'] -DropOnFail }
    elseif ($s -eq 'chatinfo') { Invoke-ChatInfoRep $Rec }
    elseif ($script:TabNames.ContainsKey($s)) { Invoke-TabRep $Rec }
    elseif ($s -eq 'history') { Invoke-HistoryRep $Rec }
    elseif ($s -eq 'scroll-image') { Invoke-ScrollRep $Rec }
    elseif ($s -eq 'network') { Invoke-NetworkRep $Rec }
    elseif ($s -eq 'killrenderer') { Invoke-KillRendererRep $Rec }
}

function Invoke-Step([string]$Step, [int]$Count, [bool]$NeedsHome) {
    # Calibration is checked up front: a step whose taps or screens are missing never touches the phone.
    $gap = Get-StepGap $Step
    for ($i = 1; $i -le $Count; $i++) {
        $rec = New-Rep $Step $i
        $skip = ''
        if ($script:Halted) { $skip = $script:HaltNote }
        elseif ($gap) { $skip = $gap }
        elseif ($Step -eq 'chat-intent' -or $Step -eq 'chatinfo') { $skip = Get-SeedGap ($i - 1) }
        elseif ($Step -eq 'history') { $skip = Get-SeedGap ($i + 4) }
        if ($skip) {
            $rec.status = 'skipped'
            Add-Note $rec $skip
        } else {
            try {
                if ($NeedsHome -and -not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
                Invoke-RepBody $rec
            } catch {
                $msg = [string]$_.Exception.Message
                if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
                if ($msg.StartsWith('ADBWALK-SKIP:')) { $rec.status = 'skipped' }
                elseif ($msg.StartsWith('ADBWALK-NOSCREEN:')) { $rec.status = 'no-screen' }
                else { $rec.status = 'error' }
                Add-Note $rec (Get-ErrText $_)
            }
        }
        Complete-Rep $rec $Count
    }
}

function Invoke-ScrollStep([string]$Step, [int]$SeedK, [string]$What) {
    # scroll: seed 0 (a 1000-message text chat); scroll-image: the local imageChatAddress (walk steps 2).
    $script:ScrollOpen = ''
    $script:ScrollWhat = $What
    $opened = $false
    if (-not (Get-StepGap $Step) -and -not $script:Halted) {
        if (-not (Invoke-EnsureHome)) {
            $script:ScrollOpen = 'the app is not in front: ' + $What + ' was not opened'
        } else {
            $r = Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $SeedK))
            $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
            if ($r.ExitCode -ne 0 -or $r.TimedOut -or $am.Error) {
                $why = $am.Error
                if (-not $why) { $why = Get-AdbWhy $r }
                $script:ScrollOpen = $What + ' did not open: ' + $why
                $script:NeedRecover = $true; $script:LastFailed = $true
            } else {
                $opened = $true
                Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            }
        }
    }
    Invoke-Step $Step $script:RepeatsN $false
    if ($opened) {
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
        else { Say-Log ('  ' + $Step + ': foreign window in front, BACK not sent'); $script:NeedRecover = $true; $script:LastFailed = $true }
    }
}

function Invoke-MemPhase([string]$Phase) {
    $rec = [ordered]@{ phase = $Phase; status = 'ok' }
    $notes = New-Object System.Collections.Generic.List[string]
    if ($script:Halted) {
        $rec.status = 'skipped'; $notes.Add($script:HaltNote)
    } else {
        try {
            if (-not (Invoke-EnsureHome)) { $notes.Add('the app is not in front') }
            if ($Phase -eq 'trim') {
                [void](Invoke-ShellReq ('am send-trim-memory ' + $script:Pkg + ' RUNNING_LOW'))
                Wait-Sec 5 'after send-trim-memory'
            } else {
                Wait-Sec $script:Tm['memQuietSec'] 'memQuietSec'
            }
            $f = Find-Renderer
            if (-not $f.AppPid) { throw ('ADBWALK-REP: ' + $f.Note) }
            $rec['appPid'] = $f.AppPid
            $appFile = 'meminfo-' + $Phase + '-app.txt'
            $e = Save-Meminfo $f.AppPid $appFile
            if ($e) { throw ('ADBWALK-REP: ' + $e) }
            $rec['appFile'] = $appFile
            # Renderer data only for a CONFIRMED renderer.
            if ($f.Confirmed -and $f.RendererPid) {
                $rFile = 'meminfo-' + $Phase + '-renderer.txt'
                $e2 = Save-Meminfo $f.RendererPid $rFile
                if ($e2) { $notes.Add('renderer: ' + $e2) }
                else { $rec['rendererPid'] = $f.RendererPid; $rec['rendererFile'] = $rFile }
            }
            if ($f.Note) { $notes.Add('renderer: ' + $f.Note) }
        } catch {
            $msg = [string]$_.Exception.Message
            if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
            $rec.status = 'error'
            $notes.Add((Get-ErrText $_))
        }
    }
    $full = $notes -join ', '
    $rec['note'] = Get-SafeNote $full
    $script:Mem.Add($rec)
    Save-RunJson $false
    $line = '[mem-' + $Phase + '] ' + $rec.status
    if ($rec.Contains('appPid')) { $line += ' app pid ' + $rec['appPid'] }
    if ($rec.Contains('rendererPid')) { $line += ', renderer pid ' + $rec['rendererPid'] }
    if ($full) { $line += ' - ' + (Get-SafeNote $full) }
    Say-Log $line
}

# ---------------------------------------------------------------- pre-flight
function Get-PackageInfo {
    $r = Invoke-Shell ('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime=')
    $o = @{ VersionName = ''; VersionCode = ''; LastUpdate = '' }
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if (-not $t) { continue }
        if (-not $o.VersionName -and $t -cmatch 'versionName=([0-9A-Za-z._-]{1,40})(\s|\z)') { $o.VersionName = $Matches[1] }
        if (-not $o.VersionCode -and $t -cmatch 'versionCode=([0-9]{1,12})(\s|\z)') { $o.VersionCode = $Matches[1] }
        if (-not $o.LastUpdate -and $t -cmatch 'lastUpdateTime=([0-9: -]{1,40})') { $o.LastUpdate = Get-Clean $Matches[1] }
    }
    return $o
}

function Test-PackageInstalled {
    $r = Invoke-Shell ('pm path ' + $script:Pkg)
    return ($r.ExitCode -eq 0 -and $r.StdOut -cmatch '(?m)^package:')
}

function Get-DeviceFacts {
    $f = @{}
    $rel = Get-Clean (Invoke-Shell 'getprop ro.build.version.release').StdOut
    $f.Release = ''
    if ($rel -cmatch '^[0-9A-Za-z._-]{1,20}\z') { $f.Release = $rel }
    $sdk = Get-Clean (Invoke-Shell 'getprop ro.build.version.sdk').StdOut
    $f.Sdk = ''
    if ($sdk -cmatch '^[0-9]{1,3}\z') { $f.Sdk = $sdk }
    $f.Width = $null; $f.Height = $null; $f.Density = $null
    $ws = (Invoke-Shell 'wm size').StdOut
    if ($ws -cmatch 'Physical size:\s*([0-9]{1,5})x([0-9]{1,5})') { $f.Width = [int]$Matches[1]; $f.Height = [int]$Matches[2] }
    $f.Override = ($ws -cmatch 'Override size:\s*([0-9]{1,5}x[0-9]{1,5})')
    $f.OverrideText = ''
    if ($f.Override) { $f.OverrideText = $Matches[1] }
    $wd = (Invoke-Shell 'wm density').StdOut
    if ($wd -cmatch 'Physical density:\s*([0-9]{1,4})') { $f.Density = [int]$Matches[1] }
    # The refresh rate as one rounded number; no raw dumpsys text leaves the phone.
    $disp = (Invoke-Shell 'dumpsys display | grep -i -e framerate').StdOut
    $f.Refresh = ''
    $num = $null
    if ($disp -cmatch 'mActiveRenderFrameRate=([0-9]{1,4}(\.[0-9]{1,9})?)') { $num = $Matches[1] }
    elseif ($disp -cmatch 'renderFrameRate ([0-9]{1,4}(\.[0-9]{1,9})?)') { $num = $Matches[1] }
    if ($num) { $f.Refresh = 'renderFrameRate=' + [math]::Round([double]::Parse($num, $script:Inv)) }
    return $f
}

function Select-Device {
    [void](Invoke-Adb -AdbArgs @('start-server') -NoSerial -TimeoutSec 30)
    $r = Invoke-Adb -AdbArgs @('devices') -NoSerial -TimeoutSec 30
    if ($r.ExitCode -ne 0) { Stop-Walk ('adb devices failed: ' + (Get-AdbWhy $r)) }
    $rows = New-Object System.Collections.Generic.List[object]
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if (-not $t -or $t.StartsWith('List of devices') -or $t.StartsWith('*')) { continue }
        # adb prints <serial><TAB><state>; any other row is "other" and never selected. States from a fixed set only.
        $cells = $l.TrimEnd([char]13).Split([char]9)
        if ($cells.Count -ne 2 -or -not $cells[0]) { $rows.Add(@{ Id = $null; State = 'other' }); continue }
        $st = 'other'
        foreach ($known in @('device', 'unauthorized', 'offline', 'recovery', 'sideload', 'bootloader', 'host')) { if (Test-Ordinal $cells[1] $known) { $st = $known } }
        if ($cells[1].StartsWith('no permissions', [System.StringComparison]::Ordinal)) { $st = 'no permissions' }
        $rows.Add(@{ Id = $cells[0]; State = $st })
    }
    $states = @($rows | ForEach-Object { $_.State }) -join ', '
    if (-not $states) { $states = 'none' }
    Say ('  adb devices: ' + $rows.Count + ' attached (' + $states + ')')
    if ($Serial) {
        $hit = @($rows | Where-Object { $_.Id -and (Test-Ordinal $_.Id $Serial) })
        if ($hit.Count -eq 0) { Stop-Walk 'the -Serial device is not attached' }
        if ($hit[0].State -ne 'device') { Stop-Walk ('the -Serial device is in state ' + $hit[0].State) }
        $sel = $Serial
    } else {
        $ready = @($rows | Where-Object { $_.Id -and $_.State -ceq 'device' })
        if ($ready.Count -eq 0) { Stop-Walk ('no phone in state device (seen: ' + $states + '); unauthorized = accept the USB debugging prompt') }
        if ($ready.Count -gt 1) { Stop-Walk ([string]$ready.Count + ' phones in state device: pass -Serial') }
        $sel = $ready[0].Id
    }
    # A short serial cannot be masked without corrupting numbers in the output.
    if (-not (Test-SerialMaskable $sel)) { Stop-Walk 'serial too short to mask safely: pass none / use USB' }
    $sl = $sel.ToLowerInvariant()
    foreach ($word in (@($script:AllSteps) + @('killrenderer', $script:Pkg, 'shot', 'android-walk', 'meminfo', 'cal', 'summary', 'run'))) {
        if ($word.Contains($sl) -or $sl.Contains($word)) { Stop-Walk 'serial collides with an output word: masking it would rewrite file names' }
    }
    $script:DevSerial = $sel
}

function Invoke-Preflight {
    Say-Log ('pre-flight (adb: ' + [System.IO.Path]::GetFileName($script:AdbPath) + ')')
    Select-Device
    $model = Get-Clean (Invoke-Shell 'getprop ro.product.model').StdOut
    $want = [string](Get-Field (Get-Field $script:Cfg 'device') 'model')
    if (-not $model) { Stop-Walk 'cannot read ro.product.model' }
    if (-not (Test-Ordinal $model $want)) { Stop-Walk ('wrong phone: model ' + (Get-SafeNote $model) + ', a52s.json wants ' + $want) }
    # A run that was killed left its restore behind: apply it before any other gate, and before reading the "old" value.
    Invoke-PendingRestore
    $b = Invoke-Shell 'dumpsys battery'
    if ($b.StdOut -cnotmatch '(?m)^\s*level:\s*([0-9]{1,3})') { Stop-Walk 'cannot read the battery level' }
    $level = [int]$Matches[1]
    if ($level -le 50) { Stop-Walk ('battery ' + $level + '% (needs more than 50%): charge the phone') }
    $script:BatteryLevel = $level
    Say ('  phone ' + (Get-SafeNote $model) + ', battery ' + $level + '%')
    if ($Apk) {
        $before = $null
        if (Test-PackageInstalled) { $before = Get-PackageInfo }
        Say '  install -r (this can take a minute)'
        $ir = Invoke-Adb -AdbArgs @('install', '-r', $script:ApkFull) -TimeoutSec 300
        if ($ir.ExitCode -ne 0 -or $ir.StdOut -cnotmatch '(?m)^Success') {
            Stop-Walk ('install -r failed (exit ' + $ir.ExitCode + '): ' + (Get-AdbWhy $ir))
        }
        if (-not (Test-PackageInstalled)) { Stop-Walk ('after install -r ' + $script:Pkg + ' is still missing: the APK is not the dev build') }
        $after = Get-PackageInfo
        if ($before -and $before.LastUpdate -and $after.LastUpdate -eq $before.LastUpdate) {
            Stop-Walk ('install -r did not update ' + $script:Pkg + ' (lastUpdateTime unchanged): is the APK the dev build?')
        }
        Say-Log '  installed'
    }
    if (-not (Test-PackageInstalled)) { Stop-Walk ('package ' + $script:Pkg + ' is not installed') }
    $ra = Invoke-Shell ('cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ' + $script:Pkg)
    $lastLine = ''
    foreach ($l in (Split-Lines $ra.StdOut)) { $c = Get-Clean $l; if ($c) { $lastLine = $c } }
    if ($lastLine -cnotmatch ('^' + [regex]::Escape($script:Pkg) + '/([A-Za-z0-9_.]{1,120})\z')) {
        Stop-Walk 'cannot resolve the launcher activity'
    }
    $script:Comp = $lastLine
    $activity = $Matches[1]
    $pi = Get-PackageInfo
    $facts = Get-DeviceFacts
    $script:Facts = $facts
    $script:PkgInfo = $pi
    $stay = Get-Clean (Invoke-Shell 'settings get global stay_on_while_plugged_in').StdOut
    if ($stay -cnotmatch '^([0-9]|1[0-5])\z') { Stop-Walk 'cannot read stay_on_while_plugged_in (not 0..15)' }
    $script:StayOld = [int]$stay
    $zen = Get-Clean (Invoke-Shell 'settings get global zen_mode').StdOut
    $script:Dnd = ''
    if ($zen -cmatch '^[1-3]\z') { $script:Dnd = 'on' } elseif ($zen -cmatch '^0\z') { $script:Dnd = 'off' }
    if ($script:Dnd -eq 'off') { Say-Log 'WARNING: Do not disturb is off: a notification of another app can appear in a screenshot (turn it on for unattended runs)' }
    elseif (-not $script:Dnd) { Say-Log 'WARNING: Do not disturb state unknown: a notification of another app can appear in a screenshot (turn it on for unattended runs)' }

    # From here on the script changes phone state: the restore is persisted FIRST.
    Write-Pending
    [void](Invoke-Shell 'input keyevent KEYCODE_WAKEUP')
    Start-Sleep -Milliseconds 500
    [void](Invoke-Shell 'wm dismiss-keyguard')
    Start-Sleep -Milliseconds 1500
    $st = Get-ScreenState
    if (-not $st.Awake) { Stop-Walk 'the screen did not wake: unlock the phone, keep it on, run again' }
    if ($st.Locked) { Stop-Walk ('unlock the phone (' + $st.Why + ' after wm dismiss-keyguard); the script never types a PIN') }
    $sr = Invoke-Shell 'svc power stayon usb'
    if ($sr.ExitCode -ne 0) { Say-Log ('  warning: svc power stayon usb failed: ' + (Get-AdbWhy $sr)) }
    $g = Invoke-Shell 'logcat -G 16M'
    if ($g.ExitCode -ne 0) { Say-Log ('  warning: logcat -G 16M failed (the log buffer may be small): ' + (Get-AdbWhy $g)) }
    $c = Invoke-Shell 'logcat -c'
    if ($c.ExitCode -ne 0) { Stop-Walk ('logcat -c failed: ' + (Get-AdbWhy $c)) }

    $dev = [ordered]@{ model = (Get-SafeNote $model) }
    if ($facts.Release) { $dev['release'] = $facts.Release }
    if ($facts.Sdk) { $dev['sdk'] = $facts.Sdk }
    if ($null -ne $facts.Width) { $dev['width'] = $facts.Width; $dev['height'] = $facts.Height }
    if ($null -ne $facts.Density) { $dev['density'] = $facts.Density }
    $dev['refresh'] = $facts.Refresh
    if ($script:Dnd) { $dev['dnd'] = $script:Dnd }
    $script:DevInfo = $dev
    $script:AppInfo = [ordered]@{ package = $script:Pkg; activity = $activity; versionName = $pi.VersionName; versionCode = $pi.VersionCode }
    Say-Log ('pre-flight ok: ' + (Get-SafeNote $model) + ' Android ' + $facts.Release + ', ' + $script:Pkg + ' ' + $pi.VersionName + ' (' + $pi.VersionCode + ')')
}

# ---------------------------------------------------------------- walk and calibrate
function Get-EstimateSec {
    $t = $script:Tm
    $n = $script:RepeatsN
    $sum = 30
    foreach ($s in $script:StepsReq) {
        if ($s -eq 'coldstart') { $sum += $n * ($t['coldStartIdleSec'] + $t['coldStartSettleSec'] + 10) }
        elseif ($s -eq 'chat-intent' -or $s -eq 'chat-tap') { $sum += $n * (($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 6) }
        elseif ($s -eq 'scroll') { $sum += 5 + $n * (2 * $t['scrollSettleMs'] / 1000 + 6) }
        elseif ($s -eq 'resume') { $sum += $n * ($t['resumeWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 10) }
        elseif ($s -eq 'resume-long') { $sum += $t['resumeLongWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 10 }
        elseif ($s -eq 'mem-home' -or $s -eq 'mem-end') { $sum += $t['memQuietSec'] + 6 }
        elseif ($s -eq 'mem-trim') { $sum += 11 }
        elseif ($s -eq 'network') { $sum += $t['wifiOffSec'] + 36 }
        elseif ($s -eq 'killrenderer') { $sum += 12 }
        elseif ($s -eq 'resume-now') { $sum += $n * ($t['resumeWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 8) }
        elseif ($s -eq 'resume-3s') { $sum += $n * ($t['resumeWaitSec'] + ($t['resumeLateTapMs'] + $t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 8) }
        elseif ($s -eq 'chatinfo') { $sum += $n * ((2 * $t['chatSettleMs'] + 2 * $t['backSettleMs']) / 1000 + 10) }
        elseif ($script:TabNames.ContainsKey($s)) { $sum += $n * (2 * $t['tabSettleMs'] / 1000 + 7) }
        elseif ($s -eq 'history') { $sum += $n * (($t['chatSettleMs'] + $t['scrollSettleMs'] + $t['backSettleMs']) / 1000 + 10 * ($t['historySwipeMs'] / 1000 + 1) + 8) }
        elseif ($s -eq 'scroll-image') { $sum += 5 + $n * (2 * $t['scrollSettleMs'] / 1000 + 6) }
    }
    return [int]$sum
}

function Invoke-Walk {
    $script:WalkStarted = $true
    Save-RunJson $false
    $est = Get-EstimateSec
    Say-Log ('walk: ' + ($script:StepsReq -join ', ') + ' x ' + $script:RepeatsN + ' - estimate about ' + [math]::Ceiling($est / 60) + ' min')
    foreach ($s in $script:StepsReq) {
        if ($s -eq 'coldstart') { Invoke-Step 'coldstart' $script:RepeatsN $false }
        elseif ($s -eq 'mem-home') { Invoke-MemPhase 'home' }
        elseif ($s -eq 'chat-intent') { Invoke-Step 'chat-intent' $script:RepeatsN $true }
        elseif ($s -eq 'chat-tap') { Invoke-Step 'chat-tap' $script:RepeatsN $true }
        elseif ($s -eq 'scroll') { Invoke-ScrollStep 'scroll' 0 'the chat of seed 0' }
        elseif ($s -eq 'resume-now' -or $s -eq 'resume-3s' -or $s -eq 'chatinfo' -or $script:TabNames.ContainsKey($s)) { Invoke-Step $s $script:RepeatsN $true }
        elseif ($s -eq 'history') {
            Invoke-Step 'history' $script:RepeatsN $true
            # The step leaves the chat closed: after a failed rep, one bounded recovery.
            if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }
        }
        elseif ($s -eq 'scroll-image') { Invoke-ScrollStep 'scroll-image' $script:ImageSeed 'the image chat' }
        elseif ($s -eq 'resume') { Invoke-Step 'resume' $script:RepeatsN $true }
        elseif ($s -eq 'resume-long') { Invoke-Step 'resume-long' 1 $true }
        elseif ($s -eq 'network') { Invoke-Step 'network' 1 $false }
        elseif ($s -eq 'mem-end') { Invoke-MemPhase 'end' }
        elseif ($s -eq 'mem-trim') { Invoke-MemPhase 'trim' }
        elseif ($s -eq 'killrenderer') { Invoke-Step 'killrenderer' 1 $true }
    }
}

function Save-CalShot([string]$Name, [string]$Expect, $Cal) {
    $entry = [ordered]@{ file = $Name; expect = $Expect }
    $local = $null
    try {
        # Focus BEFORE screencap: a foreign window is never photographed.
        if (-not (Test-AppFront)) {
            $entry['error'] = 'foreign window in front (no screenshot)'
            Say ('  ' + $Name + ' not taken: foreign window in front')
        } else {
            $local = Save-Shot $Name
            if (-not (Test-AppFront)) {
                $entry['error'] = 'foreign window during the screenshot (PNG deleted)'
                $gone = Remove-LocalFile $local
                if (-not $gone) { $entry['error'] = 'foreign window during the screenshot, local file not deleted' }
                $local = $null
                if ($gone) { Say ('  ' + $Name + ' deleted: foreign window during the screenshot') }
                else { Say ('  ' + $Name + ' NOT deleted: foreign window during the screenshot') }
            } else {
                $Cal.files.Add($Name)
                Say ('  ' + $Name)
            }
        }
    } catch {
        $m = [string]$_.Exception.Message
        if ($m.StartsWith('ADBWALK-STOP:')) { throw }
        $entry['error'] = Get-ErrText $_
        Say ('  ' + $Name + ' failed: ' + $entry['error'])
    }
    $script:CalShots.Add(@{ Entry = $entry; Path = $local })
}

function Add-CalTry($Cal, [string]$Name, [string]$Result, [string]$Note) {
    $Cal.tries.Add([ordered]@{ name = $Name; result = $Result; note = (Get-SafeNote $Note) })
    Say ('  try ' + $Name + ': ' + $Result)
}

function Invoke-CalInput($Cal, [string]$Cmd, [string]$Label) {
    # Every tap and swipe is gated by the focus; returns $true when the input was sent.
    if (-not (Test-AppFront)) { $Cal.notes.Add($Label + ' skipped: foreign window in front'); return $false }
    [void](Invoke-Shell $Cmd)
    return $true
}

function Get-LoadMoreCount {
    # The number of "[P1] shell send loadmore" lines since the last logcat -c; $null when unreadable.
    $p = Invoke-Shell $script:LoadPollCmd
    if ($p.TimedOut) { return $null }
    if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})\z') { return [int]$Matches[1] }
    return $null
}

function Get-LogCount([string]$Key) {
    # The number of lines of one frames-poll kind since the last logcat -c (a count only); $null when unreadable.
    $cmd = $script:FramePoll[$Key]
    if (-not $cmd) { return $null }
    $p = Invoke-Shell $cmd
    if ($p.TimedOut) { return $null }
    if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})\z') { return [int]$Matches[1] }
    return $null
}

function Wait-LogCount([string]$Key, [int]$TimeoutMs, [int]$Above = 0) {
    # Polls every 300 ms until the count is above $Above (0 = at least one line); $false at the timeout.
    # At least one poll is made, also with a timeout of 0.
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($true) {
        $c = Get-LogCount $Key
        if ($null -ne $c -and $c -gt $Above) { Write-WalkLog ('frames line ' + $Key + ' after ' + $sw.ElapsedMilliseconds + ' ms'); return $true }
        if ($sw.ElapsedMilliseconds -ge $TimeoutMs) { Write-WalkLog ('no frames line ' + $Key + ' within ' + $TimeoutMs + ' ms'); return $false }
        Start-Sleep -Milliseconds 300
    }
}

function Get-LastCalShot {
    if ($script:CalShots.Count -eq 0) { return $null }
    return $script:CalShots[$script:CalShots.Count - 1]
}

function Test-CalShotScreen($Shot, [string]$Expect) {
    # The probe check of a calibration PNG at once; a screenshot that was not taken fails.
    if ($null -eq $Shot -or -not $Shot.Path) { return $false }
    # A screen that is not calibrated is never a confirmed screen.
    if (Get-ScreenGap $Expect) { return $false }
    $chk = Test-Screen $Shot.Path $Expect
    return [bool]$chk.Ok
}

function Remove-CalShot($Cal, $Shot, [string]$Why) {
    # A calibration PNG that is not the screen it was meant to be may show Wallet or Account: it is deleted.
    $name = [string]$Shot.Entry['file']
    if (Remove-LocalFile $Shot.Path) {
        $Shot.Entry['error'] = $Why + ': PNG deleted'
        $Shot.Path = $null
        [void]$Cal.files.Remove($name)
        Say ('  ' + $name + ' deleted: ' + $Why)
    } else {
        $Shot.Entry['error'] = $Why + ': local file not deleted'
        Say ('  ' + $name + ' NOT deleted: ' + $Why)
    }
}

function Invoke-CalNewTaps($Cal) {
    # One try of each tap point and swipe of the walk-steps-2 steps; cal-log.txt then holds their log lines.
    # No screenshot while Apps, Wallet or Account is in front: those tabs show TEST account data.
    # The tab taps are gated like the walk (no logcat -c here: cal-log.txt keeps the earlier lines, so the count
    # BEFORE the tap is read and a count above it is awaited), and a screen check comes before each later input.
    $gapSeed0 = Get-SeedGap 0
    if ($gapSeed0) { $Cal.notes.Add('cal-08..10 not taken: ' + $gapSeed0) }
    elseif (Get-TapGap 'chatHeader') { $Cal.notes.Add('cal-08..10 not taken: ' + (Get-TapGap 'chatHeader')) }
    else {
        $seedI = Get-Seed 0
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seedI))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        if (Invoke-CalInput $Cal (Get-TapText 'chatHeader') 'cal-08 tap') {
            Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            Save-CalShot 'cal-08-chatinfo.png' 'chatinfo' $Cal
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-09 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-09-chat-after-info.png' 'chat' $Cal
        }
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-10 BACK not sent: foreign window in front') }
        Save-CalShot 'cal-10-home-after-info.png' 'home' $Cal
    }
    # The last screenshot (cal-10, or cal-07 when cal-08..10 were not tried) must be the home screen: no tab tap otherwise.
    $homeUp = Test-CalShotScreen (Get-LastCalShot) 'home'
    # $skip12: why cal-12..13 are not tried. A cal-11 that failed (a tab tap that did not complete, or a PNG that is not
    # home) or that was not tried because home was not confirmed leaves the screen unknown: no further input.
    $skip12 = ''
    if (Get-TapGap 'tabChats') { $Cal.notes.Add('cal-11 not taken: ' + (Get-TapGap 'tabChats')) }
    elseif (-not $homeUp) {
        $Cal.notes.Add('cal-11 not taken: the last screenshot is not a confirmed home screen')
        $skip12 = 'the home screen was not confirmed before cal-11'
    }
    else {
        $tabKeys = @{ 'tabApps' = 'apps'; 'tabWallet' = 'wallet'; 'tabAccount' = 'account' }
        $to = 3 * $script:Tm['tabSettleMs']
        $failed = $false
        foreach ($tn in @('tabApps', 'tabWallet', 'tabAccount')) {
            if (Get-TapGap $tn) { $Cal.notes.Add('cal-11 ' + $tn + ' not tried: ' + (Get-TapGap $tn)); continue }
            $key = $tabKeys[$tn]
            $b = Get-LogCount $key
            $bs = 0
            $bcl = 0
            if ($key -eq 'account') { $bs = Get-LogCount 'settings'; $bcl = Get-LogCount 'settingsclosed' }
            if ($null -eq $b -or $null -eq $bs -or $null -eq $bcl) { $Cal.notes.Add('cal-11 ' + $tn + ' not tried: cannot count the frames lines in the phone log'); $failed = $true; break }
            if (-not (Invoke-CalInput $Cal (Get-TapText $tn) ('cal-11 ' + $tn))) { $failed = $true; break }
            if (-not (Wait-LogCount $key $to $b)) { $Cal.notes.Add('cal-11 ' + $tn + ': no frames line, no tap back'); $failed = $true; break }
            if ($key -eq 'account') {
                if (-not (Wait-LogCount 'settings' $to $bs)) { $Cal.notes.Add('cal-11 ' + $tn + ': no SettingsPage frames line, no tap back'); $failed = $true; break }
            }
            $bc = Get-LogCount 'chats'
            if ($null -eq $bc) { $Cal.notes.Add('cal-11 ' + $tn + ': cannot count the Chats frames lines, no tap back'); $failed = $true; break }
            if (-not (Invoke-CalInput $Cal (Get-TapText 'tabChats') 'cal-11 tabChats')) { $failed = $true; break }
            if ($key -eq 'account') {
                if (-not (Wait-LogCount 'settingsclosed' $to $bcl)) { $Cal.notes.Add('cal-11 ' + $tn + ': the SettingsPage did not close (no close line)'); $failed = $true; break }
            }
            if (-not (Wait-LogCount 'chats' $to $bc)) { $Cal.notes.Add('cal-11 ' + $tn + ': Chats did not come back (no frames line)'); $failed = $true; break }
            Wait-Ms 300 'after the Chats frames line'
        }
        if ($failed) {
            $Cal.notes.Add('cal-11 screenshot not taken: a tab tap did not complete')
            $skip12 = 'cal-11 did not complete'
            # Wallet, Account or Apps may still be in front: restart the app (it boots on Chats) before anything else.
            Reset-AppToChats
            $Cal.notes.Add('cal-11 failed: the app was restarted (a cold start lands on Chats)')
        } else {
            Save-CalShot 'cal-11-home-after-tabs.png' 'home' $Cal
            $s11 = Get-LastCalShot
            if ($s11 -and $s11.Path -and -not (Test-CalShotScreen $s11 'home')) { Remove-CalShot $Cal $s11 'not home' }
            if (-not (Test-CalShotScreen (Get-LastCalShot) 'home')) {
                $skip12 = 'the cal-11 screenshot is not a confirmed home screen'
                Reset-AppToChats
                $Cal.notes.Add('cal-11 screenshot is not home: the app was restarted (a cold start lands on Chats)')
            }
        }
    }
    $gapSeed5 = Get-SeedGap 5
    if ($skip12) { $Cal.notes.Add('cal-12..13 not taken: ' + $skip12) }
    elseif ($gapSeed5) { $Cal.notes.Add('cal-12..13 not taken: ' + $gapSeed5) }
    elseif (Get-SwipeGap 'historyOlder') { $Cal.notes.Add('cal-12..13 not taken: ' + (Get-SwipeGap 'historyOlder')) }
    else {
        $seedH = Get-Seed 5
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seedH))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        # The chat screen must be up before any swipe; its PNG is kept (a chat or home screen), unless it is neither.
        Save-CalShot 'cal-12a-history-before.png' 'chat' $Cal
        $s12a = Get-LastCalShot
        if (-not (Test-CalShotScreen $s12a 'chat')) {
            if ($s12a -and $s12a.Path -and -not (Test-CalShotScreen $s12a 'home')) { Remove-CalShot $Cal $s12a 'not chat and not home' }
            $Cal.notes.Add('cal-12..13 not taken: the chat screen was not confirmed before the swipes')
        } else {
            $c0 = Get-LoadMoreCount
            $k = 0
            $got = 0
            if ($null -ne $c0) {
                while ($k -lt $script:Tm['historyMaxSwipes']) {
                    if (-not (Invoke-CalInput $Cal (Get-SwipeText 'historyOlder') 'cal-12 swipe')) { break }
                    $k++
                    Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'
                    $c = Get-LoadMoreCount
                    if ($null -eq $c) { break }
                    $got = $c - $c0
                    if ($got -ge 3) { break }
                }
            }
            Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
            $hres = 'ok'
            if ($got -lt 3) { $hres = 'error' }
            Add-CalTry $Cal 'history' $hres ('loadmore lines ' + $got + ' after ' + $k + ' swipes')
            Save-CalShot 'cal-12-history.png' 'chat' $Cal
            $s12 = Get-LastCalShot
            if ($s12 -and $s12.Path -and -not (Test-CalShotScreen $s12 'chat') -and -not (Test-CalShotScreen $s12 'home')) { Remove-CalShot $Cal $s12 'not chat and not home' }
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-13 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-13-home-after-history.png' 'home' $Cal
            $s13 = Get-LastCalShot
            if ($s13 -and $s13.Path -and -not (Test-CalShotScreen $s13 'home')) { Remove-CalShot $Cal $s13 'not home' }
        }
    }
}

function Invoke-Calibrate {
    $cal = [ordered]@{ schema = 1; tool = 'adb-walk'; run = $script:RunName; mode = 'calibrate' }
    if ($script:Hook) { $cal['adbHook'] = $true }
    $cal['device'] = $script:DevInfo
    $cal['app'] = $script:AppInfo
    $cal['files'] = (New-Object System.Collections.Generic.List[string])
    $cal['screenshots'] = (New-Object System.Collections.Generic.List[object])
    $cal['tries'] = (New-Object System.Collections.Generic.List[object])
    $cal['notes'] = (New-Object System.Collections.Generic.List[string])
    $script:TriesFile = Join-Path $script:RunDir 'tries.txt'
    $f = $script:Facts
    $pi = $script:PkgInfo
    $d = Invoke-Shell $script:StampCmd
    $st = Read-Stamp $d.StdOut
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('adb-walk calibrate ' + $script:RunName)
    [void]$sb.AppendLine('model: ' + $script:DevInfo['model'])
    [void]$sb.AppendLine('release: ' + $f.Release)
    [void]$sb.AppendLine('sdk: ' + $f.Sdk)
    [void]$sb.AppendLine('wm size (physical): ' + $f.Width + 'x' + $f.Height + '   override: ' + $f.OverrideText)
    [void]$sb.AppendLine('wm density (physical): ' + $f.Density)
    [void]$sb.AppendLine('refresh: ' + $f.Refresh)
    [void]$sb.AppendLine('battery level: ' + $script:BatteryLevel)
    [void]$sb.AppendLine('stay_on_while_plugged_in (before the run): ' + $script:StayOld)
    [void]$sb.AppendLine('resolved component: ' + $script:Comp)
    [void]$sb.AppendLine('versionName: ' + $pi.VersionName)
    [void]$sb.AppendLine('versionCode: ' + $pi.VersionCode)
    if ($st.T0) { [void]$sb.AppendLine('phone date +%m-%dT%H:%M:%S.%N: parses, stamp ' + $st.T0 + ' (exit ' + $d.ExitCode + ')') }
    else { [void]$sb.AppendLine('phone date +%m-%dT%H:%M:%S.%N: ' + $st.Note + ' (exit ' + $d.ExitCode + ')') }
    [void]$sb.AppendLine('PNG probe reader (System.Drawing): ' + (Initialize-Drawing))
    Write-TextFile (Join-Path $script:RunDir 'device.txt') $sb.ToString()
    $cal.files.Add('device.txt')
    Say '  device.txt'

    [void](Invoke-Shell ('am force-stop ' + $script:Pkg))
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec 12 'calibrate start'
    Save-CalShot 'cal-01-home.png' 'home' $cal
    $seed0 = $null
    if (-not (Get-SeedGap 0)) { $seed0 = Get-Seed 0 }
    if ($seed0) {
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seed0))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        Save-CalShot 'cal-02-chat-intent.png' 'chat' $cal
        if (-not (Get-SwipeGap 'chatOlder')) {
            if (Invoke-CalInput $cal (Get-SwipeText 'chatOlder') 'cal-03 swipe') {
                Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
                Save-CalShot 'cal-03-chat-scrolled.png' 'chat' $cal
            }
        } else { $cal.notes.Add('cal-03 not taken: ' + (Get-SwipeGap 'chatOlder')) }
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $cal.notes.Add('cal-04 BACK not sent: foreign window in front') }
        Save-CalShot 'cal-04-home-after-back.png' 'home' $cal
    } else { $cal.notes.Add('cal-02..04 not taken: ' + (Get-SeedGap 0)) }
    if (-not (Get-TapGap 'chatRow1')) {
        if (Invoke-CalInput $cal (Get-TapText 'chatRow1') 'cal-05 tap') {
            Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            Save-CalShot 'cal-05-chat-tap.png' 'chat' $cal
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $cal.notes.Add('cal-06 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-06-home.png' 'home' $cal
        }
    } else { $cal.notes.Add('cal-05..06 not taken: ' + (Get-TapGap 'chatRow1')) }
    [void](Invoke-Shell 'input keyevent 3')
    Wait-Sec 3 'after home key'
    [void](Invoke-Shell ('am start -n ' + $script:Comp))
    Wait-Sec 3 'after am start'
    Save-CalShot 'cal-07-home-resumed.png' 'home' $cal
    Invoke-CalNewTaps $cal

    Say '  renderer lookup (lines in tries.txt):'
    $fr = Find-Renderer
    $tb = New-Object System.Text.StringBuilder
    [void]$tb.AppendLine('== renderer lookup')
    [void]$tb.AppendLine('app pid: ' + $fr.AppPid)
    [void]$tb.AppendLine('renderer pid: ' + $fr.RendererPid + '  confirmed: ' + $fr.Confirmed)
    [void]$tb.AppendLine('note: ' + (Get-SafeNote $fr.Note))
    if ($fr.OwnPsLines.Count -gt 0) {
        [void]$tb.AppendLine('--- ps -A lines of the pids named under ' + $script:Pkg)
        foreach ($l in $fr.OwnPsLines) { [void]$tb.AppendLine($l) }
    } else {
        [void]$tb.AppendLine('--- sandboxed processes in ps -A: ' + $fr.CandCount)
    }
    [void]$tb.AppendLine('--- dumpsys activity services ' + $script:Pkg + ' (ServiceRecord, app=, processName=, packageName= lines)')
    foreach ($l in $fr.RawLines) { [void]$tb.AppendLine($l) }
    Write-TextFile $script:TriesFile $tb.ToString()
    $rres = 'ok'
    if (-not $fr.Confirmed) { $rres = 'error' }
    Add-CalTry $cal 'renderer-lookup' $rres $fr.Note
    if ($fr.AppPid) {
        $e = Save-Meminfo $fr.AppPid 'meminfo-cal-app.txt'
        if ($e) { Add-CalTry $cal 'meminfo-app' 'error' $e } else { $cal.files.Add('meminfo-cal-app.txt'); Add-CalTry $cal 'meminfo-app' 'ok' '' }
    } else { Add-CalTry $cal 'meminfo-app' 'error' $fr.Note }
    if ($fr.Confirmed -and $fr.RendererPid) {
        $e = Save-Meminfo $fr.RendererPid 'meminfo-cal-renderer.txt'
        if ($e) { Add-CalTry $cal 'meminfo-renderer' 'error' $e } else { $cal.files.Add('meminfo-cal-renderer.txt'); Add-CalTry $cal 'meminfo-renderer' 'ok' '' }
    } else { Add-CalTry $cal 'meminfo-renderer' 'error' 'no confirmed renderer pid' }

    try {
        $ln = Save-Log 'cal-log.txt'
        $cal.files.Add('cal-log.txt')
        if ($ln) { $cal.notes.Add('cal-log.txt: ' + $ln) }
        Say '  cal-log.txt'
    } catch { $cal.notes.Add('cal-log.txt: ' + (Get-ErrText $_)) }
    $cal.files.Add('tries.txt')

    foreach ($s in $script:CalShots) {
        $e = $s.Entry
        if ($s.Path) {
            # Size first (IHDR only); a PNG of the wrong size is never decoded.
            $size = Get-PngSize $s.Path
            if ($size) { $e['width'] = $size.W; $e['height'] = $size.H; $e['sizeOk'] = ($size.W -eq $script:W -and $size.H -eq $script:H) }
            else { $e['sizeOk'] = $false }
            $gap = Get-ScreenGap $e.expect
            if (-not $e['sizeOk']) { $e['probes'] = 'not decoded: size mismatch' }
            elseif ($gap) { $e['probes'] = 'not calibrated: ' + $gap }
            else {
                $pr = Test-Probes $s.Path $e.expect
                if ($pr.Ok) { $e['probes'] = 'ok' } else { $e['probes'] = $pr.Note }
                $e['matched'] = $pr.Matched
                $e['of'] = $pr.Of
                $e['probeDetail'] = $pr.Detail
            }
            Say ('  check ' + $e.file + ': size ' + $e['width'] + 'x' + $e['height'] + ', probes: ' + $e['probes'])
        }
        $cal.screenshots.Add($e)
    }
    $safeNotes = New-Object System.Collections.Generic.List[string]
    foreach ($n in $cal.notes) { $safeNotes.Add((Get-SafeNote $n)) }
    $cal['notes'] = $safeNotes
    $cal.files.Add('calibrate.json')
    $cal.files.Add('walk.log')
    Write-JsonFile (Join-Path $script:RunDir 'calibrate.json') $cal
}

# ---------------------------------------------------------------- lock
function Enter-Lock {
    $script:LockPath = Join-Path $script:Root ('.lock' + $script:LockSuffix)
    $myStart = [System.Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o', $script:Inv)
    $content = ConvertTo-Json -InputObject ([ordered]@{ pid = $PID; started = $myStart }) -Depth 8
    $bytes = $script:Utf8.GetBytes($content)
    $created = $false
    try {
        # Atomic: CreateNew fails when the file exists.
        $fs = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
        $created = $true
    } catch { if (-not [System.IO.File]::Exists($script:LockPath)) { throw } }
    if (-not $created) {
        $live = $false
        $oldId = 0
        try {
            # Read by pattern, not ConvertFrom-Json: PowerShell 7 would turn the ISO time into a DateTime.
            $lt = [System.IO.File]::ReadAllText($script:LockPath)
            $oldStart = ''
            if ($lt -cmatch '"pid":\s*([0-9]{1,9})') { $oldId = [int]$Matches[1] }
            if ($lt -cmatch '"started":\s*"([0-9T:.Z+-]{1,40})"') { $oldStart = $Matches[1] }
            if ($oldId -gt 0 -and $oldId -ne $PID) {
                $proc = Get-Process -Id $oldId -ErrorAction SilentlyContinue
                # Only a PowerShell process can be another adb-walk run; any other live pid is a reused pid.
                if ($proc -and (@('powershell', 'pwsh', 'powershell_ise') -contains $proc.ProcessName.ToLowerInvariant())) {
                    # Same pid AND the same start time (1 s tolerance: Linux derives StartTime from clock ticks).
                    # A start time that cannot be read (either side) fails closed: refuse.
                    try {
                        $was = [DateTime]::Parse($oldStart, $script:Inv, [System.Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
                        $live = ([math]::Abs(($proc.StartTime.ToUniversalTime() - $was).TotalSeconds) -lt 1)
                    } catch { $live = $true }
                }
            }
        } catch { $live = $true }
        if ($live) {
            $why = 'another adb-walk run holds the lock (PID ' + $oldId + ')'
            try {
                $rl = Join-Path $script:Root ('adb-walk-refused' + $script:RefusedSuffix + '.log')
                if ([System.IO.File]::Exists($rl) -and (New-Object System.IO.FileInfo($rl)).Length -gt 65536) {
                    [System.IO.File]::WriteAllText($rl, ([DateTime]::Now.ToString('yyyy-MM-ddTHH:mm:ss', $script:Inv) + " log restarted`r`n"), $script:Utf8)
                }
                [System.IO.File]::AppendAllText($rl, ([DateTime]::Now.ToString('yyyy-MM-ddTHH:mm:ss', $script:Inv) + ' refused: ' + (Protect-Text $why) + "`r`n"), $script:Utf8)
            } catch { }
            Stop-Walk $why
        }
        [System.IO.File]::WriteAllBytes($script:LockPath, $bytes)
        Write-Host 'adb-walk: a stale lock was taken over'
    }
    $script:LockOwned = $true
}

function Exit-Lock {
    if (-not $script:LockOwned) { return }
    try {
        $lt = [System.IO.File]::ReadAllText($script:LockPath)
        if ($lt -cmatch '"pid":\s*([0-9]{1,9})' -and [int]$Matches[1] -eq $PID) { [System.IO.File]::Delete($script:LockPath) }
    } catch { Write-Host 'adb-walk: cannot remove the lock file' }
}

# ---------------------------------------------------------------- main: arguments first, no adb before they pass
function Exit-Usage([string]$Why) {
    Say ('adb-walk: ' + $Why)
    exit 1
}

if ($Calibrate) { $script:Mode = 'calibrate' }
if ($Repeats -lt 1 -or $Repeats -gt 50) { Exit-Usage '-Repeats must be 1..50' }
$script:RepeatsN = $Repeats
if ($Serial -and -not (Test-SerialMaskable $Serial)) { Exit-Usage 'serial too short to mask safely: pass none / use USB' }
$want = New-Object System.Collections.Generic.List[string]
foreach ($stepArg in $Steps) {
    foreach ($part in ([string]$stepArg -split ',')) {
        $stepName = $part.Trim(' ').ToLowerInvariant()
        if (-not $stepName) { continue }
        if ($script:AllSteps -notcontains $stepName) { Exit-Usage ('unknown step "' + $stepName + '" (known: ' + ($script:AllSteps -join ', ') + '; -KillRenderer adds killrenderer)') }
        $want.Add($stepName)
    }
}
if ($want.Count -eq 0) { $script:StepsReq = @($script:DefaultSteps) }
else { $script:StepsReq = @($script:AllSteps | Where-Object { $want -contains $_ }) }
if ($KillRenderer) { $script:StepsReq = @($script:StepsReq) + @('killrenderer') }

$cfgPath = Join-Path $PSScriptRoot 'a52s.json'
if (-not (Test-Path -LiteralPath $cfgPath)) { Exit-Usage 'a52s.json is missing next to this script' }
if ((New-Object System.IO.FileInfo($cfgPath)).Length -gt 65536) { Exit-Usage 'a52s.json is larger than 64 KB' }
try { $script:Cfg = Read-JsonFile $cfgPath } catch { Exit-Usage ('a52s.json is not valid JSON (' + $_.Exception.GetType().Name + ')') }
if ((Get-Field $script:Cfg 'schema') -ne 1) { Exit-Usage 'a52s.json schema is not 1' }
$cfgPkg = [string](Get-Field $script:Cfg 'package')
# The store app holds a real account: only the pinned package is ever driven.
if ($cfgPkg -cne $script:PinnedPackage) { Exit-Usage ('a52s.json package "' + (Get-SafeNote $cfgPkg) + '" is not the pinned ' + $script:PinnedPackage + ': refused') }
$script:Pkg = $script:PinnedPackage
foreach ($scrName in @('home', 'chat', 'chatinfo')) {
    if (@(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') $scrName) 'probes').Count -gt 16) { Exit-Usage ('a52s.json screens.' + $scrName + ' has more than 16 probes') }
}
$cdev = Get-Field $script:Cfg 'device'
if (-not [string](Get-Field $cdev 'model')) { Exit-Usage 'a52s.json device.model is missing' }
if (-not (Test-IsInt (Get-Field $cdev 'width')) -or -not (Test-IsInt (Get-Field $cdev 'height'))) { Exit-Usage 'a52s.json device.width/height are not integers' }
$script:W = [int](Get-Field $cdev 'width')
$script:H = [int](Get-Field $cdev 'height')
if ($script:W -lt 1 -or $script:H -lt 1 -or $script:W -gt 10000 -or $script:H -gt 10000) { Exit-Usage 'a52s.json device.width/height must be 1..10000' }
$timing = Get-Field $script:Cfg 'timing'
foreach ($k in $script:TimingKeys) {
    $v = Get-Field $timing $k
    $max = 900
    if ($k.EndsWith('Ms', [System.StringComparison]::Ordinal)) { $max = 60000 }
    if (-not (Test-IsInt $v) -or $v -lt 0 -or $v -gt $max) { Exit-Usage ('a52s.json timing.' + $k + ' is not an integer 0..' + $max) }
    $script:Tm[$k] = [int]$v
}
Initialize-Allowlist

$script:RepoPath = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot '..') '..')).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$script:Root = Join-Path (Join-Path $script:RepoPath 'Claude outputs') 'adbwalk'
$localJson = Join-Path $script:Root 'walk.local.json'
if (Test-Path -LiteralPath $localJson) {
    if ((New-Object System.IO.FileInfo($localJson)).Length -gt 65536) { Exit-Usage 'walk.local.json is larger than 64 KB' }
    $seedCount = 0
    try { $seedCount = @(Get-Field (Read-JsonFile $localJson) 'seedAddresses').Count } catch { }
    if ($seedCount -gt 64) { Exit-Usage 'walk.local.json has more than 64 seed addresses' }
    try {
        $lj = Read-JsonFile $localJson
        $k = 0
        foreach ($seedItem in @(Get-Field $lj 'seedAddresses')) {
            $str = [string]$seedItem
            if ($str -cmatch '^[1-9A-HJ-NP-Za-km-z]{30,60}\z') { $script:Seeds.Add($str) }
            else { $script:Seeds.Add($null); $script:SeedNote[$k] = ('walk.local.json seed ' + $k + ' is not a base58 address') }
            $k++
        }
        $script:SeedAddrCount = $script:Seeds.Count
        # Walk steps 2: the optional address of the image chat (the image seed of speed batch 1a). It is masked like a seed.
        $img = [string](Get-Field $lj 'imageChatAddress')
        if ($img -cmatch '^[1-9A-HJ-NP-Za-km-z]{30,60}\z') { $script:Seeds.Add($img); $script:ImageSeed = $script:Seeds.Count - 1 }
    } catch { Write-Host 'adb-walk: walk.local.json is unreadable: steps that need a seed address are skipped' }
}

if ($Apk) {
    # A relative path is resolved against the PowerShell location, not the process directory.
    try { $script:ApkFull = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Apk) } catch { Exit-Usage '-Apk is not a valid path' }
    $script:ApkDir = [System.IO.Path]::GetDirectoryName($script:ApkFull)
    if (-not (Test-Path -LiteralPath $script:ApkFull -PathType Leaf) -or $script:ApkFull -cnotmatch '\.apk\z') { Exit-Usage '-Apk must name an existing .apk file' }
    # The name guard keeps "install -r" away from the store app (same signature, real account).
    if (-not (Test-ApkName $script:ApkFull)) { Exit-Usage ('the APK name does not start with ' + $script:PinnedPackage + ': refused') }
}

if ($env:ADBWALK_ADB) {
    if (-not (Test-Path -LiteralPath $env:ADBWALK_ADB -PathType Leaf)) { Exit-Usage 'ADBWALK_ADB names no file' }
    $script:AdbPath = $env:ADBWALK_ADB
    $script:Hook = $true
    Say ('TEST HOOK: adb is replaced by ' + [System.IO.Path]::GetFileName($script:AdbPath) + ' - NOT a device run')
    # A hook run never reads, applies or deletes the device run's lock, pending restore or refusal log.
    $script:LockSuffix = '.hook'
} else {
    $cmd = Get-Command 'adb.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) { $cmd = Get-Command 'adb' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 }
    if (-not $cmd) { Exit-Usage 'adb is not on PATH (install Android platform-tools)' }
    $script:AdbPath = $cmd.Path
}

$script:RefusedSuffix = ''
$pendingName = 'restore-pending.json'
if ($script:Hook) { $script:RefusedSuffix = '.hook'; $pendingName = 'restore-pending.hook.json' }
$script:PendingPath = Join-Path $script:Root $pendingName

$ok = $false
try {
    [void][System.IO.Directory]::CreateDirectory($script:Root)
    Enter-Lock
    $script:StartedIso = [DateTime]::UtcNow.ToString('o', $script:Inv)
    $prefix = ''
    if ($script:Hook) { $prefix = 'hook-' }
    if ($script:Mode -eq 'calibrate') { $prefix += 'calibrate-' }
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmm', $script:Inv)
    $dir = Join-Path $script:Root ($prefix + $stamp)
    $n = 2
    while (Test-Path -LiteralPath $dir) { $dir = Join-Path $script:Root ($prefix + $stamp + '-' + $n); $n++ }
    [void][System.IO.Directory]::CreateDirectory($dir)
    $script:RunDir = $dir
    $script:RunName = Split-Path -Leaf $dir
    $script:WalkLog = Join-Path $dir 'walk.log'
    if ($script:Hook) { Write-WalkLog ('TEST HOOK: adb is replaced by ' + [System.IO.Path]::GetFileName($script:AdbPath) + ' - NOT a device run') }
    Say-Log ('adb-walk ' + $script:Mode + ' ' + $script:RunName + ' (package ' + $script:Pkg + ', seeds ' + @($script:Seeds | Where-Object { $_ }).Count + ')')

    Invoke-Preflight
    if ($script:Mode -eq 'calibrate') { Invoke-Calibrate } else { Invoke-Walk }
    $ok = $true
} catch {
    $m = [string]$_.Exception.Message
    if ($m.StartsWith('ADBWALK-STOP:')) { Say-Log ('STOP: ' + (Get-ErrText $_)) }
    else { Say-Log ('driver failure: ' + ((Get-ErrText $_) -replace '^driver: ', '')) }
} finally {
    Restore-Phone
    if ($script:WalkStarted) { try { Save-RunJson $ok } catch { } }
    Exit-Lock
}

function Exit-Final([int]$Code) {
    # A failed restore wins over every other result: the phone is still changed.
    if ($script:RestoreFailed) { Write-Host 'RESTORE FAILED: run the script again with the phone attached, or restore by hand'; exit 1 }
    exit $Code
}

$runShown = ''
if ($script:RunDir) { $runShown = 'Claude outputs' + [System.IO.Path]::DirectorySeparatorChar + 'adbwalk' + [System.IO.Path]::DirectorySeparatorChar + $script:RunName }
if (-not $ok) {
    if ($runShown) { Say ('run folder: ' + $runShown) }
    if ($script:WalkStarted) { Say 'run.json has finished=false; adb-walk-parse.ps1 -RunDir <run folder> still reads it' }
    Exit-Final 1
}
Say ('run folder: ' + $runShown)
if ($script:Mode -eq 'calibrate') { Exit-Final 0 }

$parser = Join-Path $PSScriptRoot 'adb-walk-parse.ps1'
if (-not (Test-Path -LiteralPath $parser)) {
    Say 'the parser adb-walk-parse.ps1 is missing next to this script: the raw files stay in the run folder'
    Exit-Final 1
}
$global:LASTEXITCODE = 0
try { & $parser -RunDir $script:RunDir | Out-Host } catch { Say ('the parser failed: ' + $_.Exception.GetType().Name); Exit-Final 1 }
$code = $LASTEXITCODE
$summary = Join-Path $script:RunDir 'summary.md'
$resultLine = ''
if (Test-Path -LiteralPath $summary) {
    foreach ($l in [System.IO.File]::ReadAllLines($summary)) { if ($l.StartsWith('RESULT: ', [System.StringComparison]::Ordinal)) { $resultLine = Get-Clean $l; break } }
}
if ($resultLine) { Say $resultLine } else { Say 'summary.md has no RESULT line' }
Exit-Final $code
