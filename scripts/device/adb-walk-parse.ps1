<#
adb-walk-parse.ps1 - turns the output folder of an adb-walk run into summary.md and summary.csv.

Usage:   .\adb-walk-parse.ps1 -RunDir "<repo>\Claude outputs\adbwalk\<yyyyMMdd-HHmm>"
Exit:    0 = every required row has data, 2 = at least one "no data" row, 3 = run.json missing or unreadable,
         4 = a pulled log holds a switch state line that differs from the state asked with -Flags
         (1 = the script itself failed; should not happen).
Switch state (batch perfb1toggle): summary.md names the state of the app's own [FLAGS] line, re-built from its four
         captured digits (no raw line is copied). A run with run.json flags.asked must show that state in the flags
         pull (android-walk-flags-00.txt, a fixed name): no state line there = "no data", exit 2; any different state
         line in the flags pull or in a rep log = exit 4. In such a run, when the state is not proven or differs (or
         run.json has any flags.stop, a coldstart log without its own state line, or a rep log that cannot be read), NO NUMBER is written: every metric row is "no data" in summary.md and summary.csv
         (same rows and columns) and summary.md says the numbers are withheld. A run without flags.asked (an old run
         too) reads the state from its coldstart logs, else says "not read"; its summary.csv is not changed.
Steps added in batch walksteps2: chatinfo, tab-apps, tab-wallet, tab-account, history, resume-now, resume-3s, scroll-image.
Steps added in batch filewalk: scroll-files, scroll-voice, scroll-photos, viewer, downloads (the scroll and long-task rows and
         the viewer close row count only lines whose own stamp is >= the rep's stamp2 from run.json; a step that is not in
         run.json adds no row and no note line).
Steps added in batch photo1a: open-seed (per index k of run.json seedIndex the rows "open-seed k=<k>": the warm reps, then the
         same rows prefixed "cold " for the one cold rep; the app's new "[P1] chat onload-main / read / media" lines and the
         old chat batch / chat-shell lines are OPTIONAL rows: a build that has no such line gives n/a, never "no data" and
         never exit 2; intent -> present, present ms= and attach spare= stay required) and mem-photos (the rows of mem-end).

Safety rules (this script is read by a security reviewer):
- Reads ONLY files named by run.json inside -RunDir (plain file names; any name with a path part is refused).
- Writes ONLY summary.md and summary.csv into -RunDir. No network, no adb, no other process, no other file.
- The summaries hold step names, metric names, numbers, units, file names of the run folder, the run.json header
  fields and short fixed notes. No raw log line is ever copied; manifest text is reduced to printable ASCII.
- "No data" rule: a required value that is missing for ANY requested rep makes the row say "no data". Never a 0,
  never a guess, never a median over fewer reps than requested.

Windows PowerShell 5.1 and PowerShell 7. ASCII only. Numbers always use the invariant culture (dot decimal sign).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Inv = [System.Globalization.CultureInfo]::InvariantCulture
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:NoData = 'no data'
$script:NotAvail = 'n/a'

# ---------------------------------------------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------------------------------------------

function Get-Prop {
    # Property of a ConvertFrom-Json object, or $null when it does not exist (safe under StrictMode).
    param($Obj, [string]$Name)
    if ($null -eq $Obj) { return $null }
    $p = $Obj.PSObject.Properties[$Name]
    if ($null -eq $p) { return $null }
    return $p.Value
}

function Get-Num {
    # A non-negative finite number (double) from a JSON number or a digit string; $null otherwise.
    param($V)
    if ($null -eq $V) { return $null }
    $d = 0.0
    if ($V -is [string]) {
        if (-not [double]::TryParse($V, [System.Globalization.NumberStyles]::Float, $script:Inv, [ref]$d)) { return $null }
    }
    elseif (($V -is [int]) -or ($V -is [long]) -or ($V -is [double]) -or ($V -is [decimal]) -or ($V -is [single])) {
        $d = [double]$V
    }
    else { return $null }
    if ([double]::IsNaN($d) -or [double]::IsInfinity($d) -or ($d -lt 0) -or ($d -gt 1e9)) { return $null }
    return $d
}

function Format-Safe {
    # Manifest text -> the safe charset only (everything else becomes "?"), one line, capped. Used for EVERY string
    # that comes from run.json before it is printed. URL schemes and instruction-like words remove the whole string.
    param($Text, [int]$Max = 80)
    if ($null -eq $Text) { return '' }
    $s = [string]$Text
    $s = [regex]::Replace($s, '[^A-Za-z0-9 _.,:=/()%+-]', '?')
    $s = [regex]::Replace($s, ' {2,}', ' ').Trim()
    # Any "scheme:/" or "scheme://", plus http(s)/javascript with a colon, www. and data:.
    if ([regex]::IsMatch($s, '(?i)(https?|javascript)[ ]*:|[a-z][a-z0-9+.-]{1,15}:[ ]*/|www\.|data:')) { return '(removed)' }
    # Defense in depth only: all printed manifest text sits inside a Markdown code span, where these words are inert.
    if ([regex]::IsMatch($s, '(?i)ignore|disregard|instruction|prompt|assistant|override')) { return '(removed)' }
    if ($s.Length -gt $Max) { $s = $s.Substring(0, $Max - 3) + '...' }
    return $s
}

function Format-Span {
    # Markdown code span around already reduced text (the reduced charset holds no backtick).
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return '' }
    return ('`' + $Text + '`')
}

function Format-Num {
    param([double]$V)
    $r = [Math]::Round($V, 2, [MidpointRounding]::AwayFromZero)
    if ($r -eq 0) { return '0' }
    return $r.ToString('0.##', $script:Inv)
}

function Test-Same {
    # Ordinal string equality. (-eq / -ceq compare with culture rules and ignore some invisible characters.)
    param($A, $B)
    if (($A -isnot [string]) -or ($B -isnot [string])) { return $false }
    return [string]::Equals($A, $B, [System.StringComparison]::Ordinal)
}

function Test-OpenSeedName {
    # Batch photo1a: the step names the driver gives the reps of open-seed (case-sensitive, anchored, the index 00..55).
    param($Name)
    if ($Name -isnot [string]) { return $false }
    return [regex]::IsMatch($Name, '\Aopen-seed-k(?:[0-4][0-9]|5[0-5])(?:-cold)?\z', [System.Text.RegularExpressions.RegexOptions]::CultureInvariant)
}

function Get-StepKey {
    # The step table's OWN key for a manifest step name, or $null. Print the key, never the manifest string.
    param($Name)
    if ($Name -isnot [string]) { return $null }
    foreach ($k in $script:StepTable.Keys) {
        if (Test-Same $k $Name) { return [string]$k }
    }
    # Batch photo1a: the per-index names of open-seed (open-seed-kNN, open-seed-kNN-cold; NN = 00..55).
    if (Test-OpenSeedName $Name) { return $Name }
    return $null
}

function Get-RepFileName {
    # The ONLY file name a rep may use: android-walk-<step>-NN.txt / shot-<step>-NN.png. $null when not derivable.
    param([string]$Step, $Rep, [string]$Kind)
    $key = Get-StepKey $Step
    if (($null -eq $key) -or ($null -eq $Rep)) { return $null }
    $n = [long][Math]::Floor([double]$Rep)
    if (($n -lt 1) -or ($n -gt 99)) { return $null }
    $nn = $n.ToString('00', $script:Inv)
    if ($Kind -eq 'log') { return ('android-walk-' + $key + '-' + $nn + '.txt') }
    return ('shot-' + $key + '-' + $nn + '.png')
}

function Test-SafeName {
    # The general shape of a data file name of this driver (case-sensitive, step keys from MY table), or run.json
    # for the Src=run column. A manifest name must in addition equal the name derived for its own entry.
    param($Name)
    if ($null -eq $Name) { return $false }
    if (-not ($Name -is [string])) { return $false }
    if (Test-Same $Name 'run.json') { return $true }
    $keys = New-Object System.Collections.Generic.List[string]
    foreach ($k in $script:StepTable.Keys) { $keys.Add([regex]::Escape([string]$k)) }
    $alt = ($keys.ToArray() -join '|') + '|open-seed-k(?:[0-4][0-9]|5[0-5])(?:-cold)?'
    $re = '^(shot-(' + $alt + ')-[0-9]{2}\.png|android-walk-(' + $alt + ')-[0-9]{2}\.txt|meminfo-(home|end|trim|photos)-(app|renderer)\.txt)\z'
    return [regex]::IsMatch($Name, $re)
}

function Read-TextFile {
    # UTF-8 with tolerance: BOM dropped, invalid bytes replaced (never throws on content).
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $start = 0
    if (($bytes.Length -ge 3) -and ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)) { $start = 3 }
    $enc = New-Object System.Text.UTF8Encoding($false, $false)
    return $enc.GetString($bytes, $start, $bytes.Length - $start)
}

function New-Rx {
    param([string]$Pattern, [bool]$Multiline = $false)
    $o = [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
    if ($Multiline) { $o = $o -bor [System.Text.RegularExpressions.RegexOptions]::Multiline }
    return (New-Object System.Text.RegularExpressions.Regex -ArgumentList $Pattern, $o)
}

# Digits are written [0-9] on purpose: \d also matches non-ASCII digits and logs can hold any bytes.
$script:RxStamp = New-Rx '(?<![0-9])([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})\.([0-9]{3,7})\|'
$script:RxT0 = New-Rx '^([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?\z'
$script:RxTotalPss = New-Rx 'TOTAL PSS:[ \t]+([0-9]{1,12})(?![0-9])'
$script:RxTotalRow = New-Rx '^[ \t]*TOTAL[ \t]+([0-9]{1,12})(?![0-9])' $true

# ---------------------------------------------------------------------------------------------------------------
# The log lines we know (3.4). Prefix = identifies the line; the numbers are read as key=value tokens after it.
# ---------------------------------------------------------------------------------------------------------------
# Every pattern is anchored at the MESSAGE START: "<severity letters>|<digits>: " then optionally "[WEBVIEW] <LEVEL> ".
$script:Cm = '^[A-Za-z]{1,10}\|[0-9]{1,6}: (?:\[WEBVIEW\] [A-Z]{1,12} )?'
$script:RxTag = New-Rx ($script:Cm + '\[(?:P1|CDPERF)\] ')
# The phone filter's grammar for the rest of a [P1] / [CDPERF] message: 1-16 tokens, optional (file:///...) tail.
$script:RxGrammar = New-Rx '^[a-z0-9_.=-]{1,40}( [a-z0-9_.=-]{1,40}){0,15}( \(file:///android_asset/html/[a-z.]{0,24}:[0-9]{1,6}\))?[ \t]*\z'
$script:L = @{
    Boot    = @{ Gram = $true;  Label = 'shell boot';                  Rx = (New-Rx ($script:Cm + '\[P1\] shell boot [a-z_]+(?=\s|$)')) }
    Hold    = @{ Gram = $true;  Label = 'boot hold';                   Rx = (New-Rx ($script:Cm + '\[P1\] boot hold(?=\s|$)')) }
    Present = @{ Gram = $true;  Label = 'open singlechatpage present'; Rx = (New-Rx ($script:Cm + '\[P1\] open singlechatpage present(?=\s|$)')) }
    Frames  = @{ Gram = $true;  Label = 'frames open-singlechatpage';  Rx = (New-Rx ($script:Cm + '\[P1\] frames open-singlechatpage(?=\s|$)')) }
    Spare   = @{ Gram = $true;  Label = 'chat attach spare=';          Rx = (New-Rx ($script:Cm + '\[CDPERF\] chat attach(?=\s|$)')) }
    Send    = @{ Gram = $true;  Label = 'shell send chat';             Rx = (New-Rx ($script:Cm + '\[P1\] shell send chat(?=\s)')) }
    Scroll  = @{ Gram = $true;  Label = 'shell scroll';                Rx = (New-Rx ($script:Cm + '\[P1\] shell scroll [a-z_]+(?=\s|$)')) }
    Long    = @{ Gram = $true;  Label = 'shell longtask';              Rx = (New-Rx ($script:Cm + '\[P1\] shell longtask [a-z_]+(?=\s|$)')) }
    InfoPresent = @{ Gram = $true; Label = 'open contactdetails present';      Rx = (New-Rx ($script:Cm + '\[P1\] open contactdetails present(?=\s|$)')) }
    InfoFrames  = @{ Gram = $true; Label = 'frames open-contactdetails';       Rx = (New-Rx ($script:Cm + '\[P1\] frames open-contactdetails(?=\s|$)')) }
    SendDetails = @{ Gram = $true; Label = 'shell send details';               Rx = (New-Rx ($script:Cm + '\[P1\] shell send details(?=\s)')) }
    TabApps     = @{ Gram = $true; Label = 'shell tab-apps';                   Rx = (New-Rx ($script:Cm + '\[P1\] shell tab-apps(?=\s)')) }
    TabWallet   = @{ Gram = $true; Label = 'shell tab-wallet';                 Rx = (New-Rx ($script:Cm + '\[P1\] shell tab-wallet(?=\s)')) }
    TabAccount  = @{ Gram = $true; Label = 'shell tab-account';                Rx = (New-Rx ($script:Cm + '\[P1\] shell tab-account(?=\s)')) }
    TabAppsFr   = @{ Gram = $true; Label = 'shell frames-tab-apps';            Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-tab-apps(?=\s)')) }
    TabWalletFr = @{ Gram = $true; Label = 'shell frames-tab-wallet';          Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-tab-wallet(?=\s)')) }
    TabAccountFr = @{ Gram = $true; Label = 'shell frames-tab-account';        Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-tab-account(?=\s)')) }
    Load        = @{ Gram = $true; Label = 'chat load';                        Rx = (New-Rx ($script:Cm + '\[P1\] chat load(?=\s|$)')) }
    SendViewImage   = @{ Gram = $true; Label = 'shell send viewimage';            Rx = (New-Rx ($script:Cm + '\[P1\] shell send viewimage(?=\s)')) }
    OverlayOpen     = @{ Gram = $true; Label = 'shell overlay-open';              Rx = (New-Rx ($script:Cm + '\[P1\] shell overlay-open(?=\s)')) }
    OverlayOpenFr   = @{ Gram = $true; Label = 'shell frames-overlay-open';       Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-overlay-open(?=\s)')) }
    OverlayCloseFr  = @{ Gram = $true; Label = 'shell frames-overlay-close';      Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-overlay-close(?=\s)')) }
    SendLoadDl      = @{ Gram = $true; Label = 'shell send loaddownloads';        Rx = (New-Rx ($script:Cm + '\[P1\] shell send loaddownloads(?=\s)')) }
    SubOpen         = @{ Gram = $true; Label = 'shell subscreen-open';            Rx = (New-Rx ($script:Cm + '\[P1\] shell subscreen-open(?=\s)')) }
    SubOpenFr       = @{ Gram = $true; Label = 'shell frames-subscreen-open';     Rx = (New-Rx ($script:Cm + '\[P1\] shell frames-subscreen-open(?=\s)')) }
    # Batch photo1a: the three new app lines (developer builds) and the two old lines of the chat open that open-seed also reads.
    ChatOnloadMain = @{ Gram = $true; Label = 'chat onload-main';           Rx = (New-Rx ($script:Cm + '\[P1\] chat onload-main(?=\s)')) }
    ChatRead        = @{ Gram = $true; Label = 'chat read';                  Rx = (New-Rx ($script:Cm + '\[P1\] chat read(?=\s)')) }
    ChatMedia       = @{ Gram = $true; Label = 'chat media';                 Rx = (New-Rx ($script:Cm + '\[P1\] chat media(?=\s)')) }
    ChatBatch       = @{ Gram = $true; Label = 'chat batch';                 Rx = (New-Rx ($script:Cm + '\[CDPERF\] chat batch(?=\s)')) }
    ChatShell       = @{ Gram = $true; Label = 'chat-shell n=';              Rx = (New-Rx ($script:Cm + '\[CDPERF\] chat-shell(?= n=)')) }
    # These two start directly after the colon (no WEBVIEW prefix); the address that follows is never read.
    Conn    = @{ Gram = $false; Label = 'Network client connected to'; Rx = (New-Rx '^[A-Za-z]{1,10}\|[0-9]{1,6}: Network client connected to [A-Za-z0-9-]{1,24}(\.[A-Za-z0-9-]{1,24}){0,7}:[0-9]{1,5}[ \t]*\z') }
    Hello   = @{ Gram = $false; Label = 'Received Hello:';             Rx = (New-Rx '^[A-Za-z]{1,10}\|[0-9]{1,6}: Received Hello: Node version [0-9]{1,6}[ \t]*\z') }
}

function Get-TokMs {
    # Integer value of "key=<int>ms" in the tail of a line (the chat-shell line writes its times with the unit); $null otherwise.
    param([string]$Tail, [string]$Key)
    $m = [regex]::Match($Tail, '(?<![A-Za-z0-9_])' + [regex]::Escape($Key) + '=(-?[0-9]{1,12})ms(?![A-Za-z0-9_.])')
    if (-not $m.Success) { return $null }
    $v = [long]::Parse($m.Groups[1].Value, $script:Inv)
    if (($v -gt 1000000000) -or ($v -lt -1000000000)) { return $null }
    return $v
}

function Get-Tok {
    # Integer value of "key=<int>" in the tail of a line; $null when absent or not a clean integer.
    param([string]$Tail, [string]$Key)
    $m = [regex]::Match($Tail, '(?<![A-Za-z0-9_])' + [regex]::Escape($Key) + '=(-?[0-9]{1,12})(?![A-Za-z0-9_.])')
    if (-not $m.Success) { return $null }
    $v = [long]::Parse($m.Groups[1].Value, $script:Inv)
    if (($v -gt 1000000000) -or ($v -lt -1000000000)) { return $null }
    return $v
}

# ---------------------------------------------------------------------------------------------------------------
# Time: the app stamp has no year (MM-dd HH:mm:ss.ffff). Current year, then +-180 days against the reference.
# ---------------------------------------------------------------------------------------------------------------

function New-Stamp {
    # DateTime from parts; $null when the parts are not a real time (Feb 30, :60 ...).
    param([int]$Year, [int]$Mo, [int]$Dy, [int]$H, [int]$Mi, [int]$S, [long]$Ticks)
    try {
        $dt = New-Object System.DateTime -ArgumentList $Year, $Mo, $Dy, $H, $Mi, $S
        return $dt.AddTicks($Ticks)
    }
    catch { return $null }
}

function Get-FracTicks {
    param([string]$Digits)
    $d = $Digits
    if ($d.Length -gt 7) { $d = $d.Substring(0, 7) }
    $d = $d.PadRight(7, '0')
    return [long]::Parse($d, $script:Inv)
}

function Convert-T0 {
    # t0 text "MM-ddTHH:mm:ss.fff" -> DateTime. Base = the previous rep's t0 (or the parse time for the first):
    # a run that crosses New Year keeps its order.
    param([string]$Text, $Prev, [datetime]$Now)
    if ([string]::IsNullOrEmpty($Text)) { return $null }
    $m = $script:RxT0.Match($Text)
    if (-not $m.Success) { return $null }
    $g = $m.Groups
    $ticks = 0
    if ($g[6].Success) { $ticks = Get-FracTicks $g[6].Value }
    $base = $Now
    if ($null -ne $Prev) { $base = [datetime]$Prev }
    $year = $base.Year
    $dt = New-Stamp $year ([int]$g[1].Value) ([int]$g[2].Value) ([int]$g[3].Value) ([int]$g[4].Value) ([int]$g[5].Value) $ticks
    if ($null -eq $dt) { return $null }
    $d = ($dt - $base).TotalDays
    if ($d -gt 180) {
        $dt = New-Stamp ($year - 1) ([int]$g[1].Value) ([int]$g[2].Value) ([int]$g[3].Value) ([int]$g[4].Value) ([int]$g[5].Value) $ticks
    }
    elseif (($null -ne $Prev) -and ($d -lt -180)) {
        $dt = New-Stamp ($year + 1) ([int]$g[1].Value) ([int]$g[2].Value) ([int]$g[3].Value) ([int]$g[4].Value) ([int]$g[5].Value) $ticks
    }
    return $dt
}

function Convert-LineStamp {
    # The stamp of a raw log event relative to the rep's t0; $null when it is not a real time.
    param($Ev, [datetime]$T0)
    $year = $T0.Year
    $dt = New-Stamp $year $Ev.Mo $Ev.Dy $Ev.H $Ev.Mi $Ev.S $Ev.Ticks
    if ($null -eq $dt) { return $null }
    $d = ($dt - $T0).TotalDays
    if ($d -lt -180) { return (New-Stamp ($year + 1) $Ev.Mo $Ev.Dy $Ev.H $Ev.Mi $Ev.S $Ev.Ticks) }
    if ($d -gt 180) { return (New-Stamp ($year - 1) $Ev.Mo $Ev.Dy $Ev.H $Ev.Mi $Ev.S $Ev.Ticks) }
    return $dt
}

# ---------------------------------------------------------------------------------------------------------------
# Log files: read once, keep only [P1] / [CDPERF] / network lines that carry the app's own stamp. Independent of the
# logcat prefix (brief or threadtime): the stamp is searched anywhere in the line, a leading "* " does not matter.
# ---------------------------------------------------------------------------------------------------------------
$script:LogCache = New-Object System.Collections.Hashtable -ArgumentList ([StringComparer]::Ordinal)

function Get-LogRaw {
    param([string]$Name, [string]$RunPath)
    if ($script:LogCache.ContainsKey($Name)) { return $script:LogCache[$Name] }
    $events = New-Object System.Collections.Generic.List[object]
    $state = 'ok'
    if ([string]::IsNullOrEmpty($Name)) { $state = 'noname' }
    elseif (-not (Test-SafeName $Name)) { $state = 'badname' }
    else {
        $path = Join-Path $RunPath $Name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $state = 'missing' }
        else {
            try {
                if ((New-Object System.IO.FileInfo -ArgumentList $path).Length -gt 4194304) { throw 'toolarge' }
                $text = Read-TextFile $path
                $lines = [regex]::Split($text, '\r\n|\n|\r')
                foreach ($line in $lines) {
                    try {
                        if ($line.Length -gt 1000) { continue }
                        if (($line.IndexOf('[P1]', [StringComparison]::Ordinal) -lt 0) -and ($line.IndexOf('[CDPERF]', [StringComparison]::Ordinal) -lt 0) -and
                            ($line.IndexOf('Network client connected to', [StringComparison]::Ordinal) -lt 0) -and ($line.IndexOf('Received Hello:', [StringComparison]::Ordinal) -lt 0)) { continue }
                        $m = $script:RxStamp.Match($line)
                        if (-not $m.Success) { continue }
                        $g = $m.Groups
                        $ev = [pscustomobject]@{
                            Mo    = [int]$g[1].Value
                            Dy    = [int]$g[2].Value
                            H     = [int]$g[3].Value
                            Mi    = [int]$g[4].Value
                            S     = [int]$g[5].Value
                            Ticks = (Get-FracTicks $g[6].Value)
                            Msg   = $line.Substring($m.Index + $m.Length)
                        }
                        $events.Add($ev)
                    }
                    catch { continue }
                }
            }
            catch {
                if ($_.Exception.Message -eq 'toolarge') { $state = 'toolarge' } else { $state = 'unreadable' }
            }
        }
    }
    $res = [pscustomobject]@{ State = $state; Events = $events }
    $script:LogCache[$Name] = $res
    return $res
}

# ---------------------------------------------------------------------------------------------------------------
# Results of one extractor for one rep: value | missing (with the reason) | empty (legitimately nothing)
# ---------------------------------------------------------------------------------------------------------------
function New-Res {
    param([string]$State, $Value, [string]$Why)
    return [pscustomobject]@{ State = $State; Value = $Value; Why = $Why }
}

function Test-Ready {
    # $null when the rep's window can be searched, otherwise the "missing" result with the reason.
    param($C)
    if (-not $C.Usable) { return (New-Res 'missing' $null $C.Why) }
    if ($null -ne $C.LogWhy) { return (New-Res 'missing' $null $C.LogWhy) }
    if ($null -eq $C.T0) { return (New-Res 'missing' $null $C.T0Why) }
    return $null
}

function Get-Hits {
    # All window lines with this prefix, as { Ev; Tail }.
    param($C, $LineDef)
    $hits = New-Object System.Collections.Generic.List[object]
    foreach ($w in $C.Window) {
        $m = $LineDef.Rx.Match($w.Msg)
        if ($m.Success) {
            if ($LineDef.Gram) {
                $tm = $script:RxTag.Match($w.Msg)
                if ((-not $tm.Success) -or (-not $script:RxGrammar.IsMatch($w.Msg.Substring($tm.Length)))) { continue }
            }
            $hits.Add([pscustomobject]@{ Stamp = $w.Stamp; Tail = $w.Msg.Substring($m.Index + $m.Length) })
        }
    }
    return [pscustomobject]@{ Items = $hits }
}

function Get-MissingLine {
    param($C, $LineDef)
    return (New-Res 'missing' $null ($C.Label + ': no "' + $LineDef.Label + '" line in ' + $C.LogName))
}

function Get-MissingTok {
    param($C, $LineDef, [string]$Key)
    return (New-Res 'missing' $null ($C.Label + ': "' + $LineDef.Label + '" has no readable ' + $Key + '= in ' + $C.LogName))
}

function X-Delta {
    # Own stamp of the FIRST such line minus t0, in ms.
    param($C, $LineDef)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $LineDef).Items
    if ($hits.Count -eq 0) { return (Get-MissingLine $C $LineDef) }
    $ms = ($hits[0].Stamp - $C.T0).Ticks / 10000.0
    return (New-Res 'value' $ms '')
}

function Get-MissingCount {
    param($C, $LineDef, [int]$Have, [int]$Min)
    return (New-Res 'missing' $null ($C.Label + ': only ' + $Have.ToString($script:Inv) + ' "' + $LineDef.Label + '" lines (needs ' + $Min.ToString($script:Inv) + ') in ' + $C.LogName))
}

function X-Count {
    # Number of such lines in the window; fewer than $Min = missing (a real zero is never reported for a required count).
    param($C, $LineDef, [int]$Min)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $LineDef).Items
    if ($hits.Count -lt $Min) { return (Get-MissingCount $C $LineDef $hits.Count $Min) }
    return (New-Res 'value' ([double]$hits.Count) '')
}

function X-NthDelta {
    # Own stamp of the N-th such line (1 = first) minus t0, in ms.
    param($C, $LineDef, [int]$N)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $LineDef).Items
    if (($N -lt 1) -or ($hits.Count -lt $N)) { return (Get-MissingCount $C $LineDef $hits.Count $N) }
    $ms = ($hits[$N - 1].Stamp - $C.T0).Ticks / 10000.0
    return (New-Res 'value' $ms '')
}

function X-Token {
    # key=<int> of the FIRST such line.
    param($C, $LineDef, [string]$Key)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $LineDef).Items
    if ($hits.Count -eq 0) { return (Get-MissingLine $C $LineDef) }
    $v = Get-Tok $hits[0].Tail $Key
    if ($null -eq $v) { return (Get-MissingTok $C $LineDef $Key) }
    if ($v -lt 0) { return (Get-MissingTok $C $LineDef $Key) }
    return (New-Res 'value' ([double]$v) '')
}

function X-TokenMs {
    # key=<int>ms of the FIRST such line (the chat-shell line: paint=, glass=).
    param($C, $LineDef, [string]$Key)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $LineDef).Items
    if ($hits.Count -eq 0) { return (Get-MissingLine $C $LineDef) }
    $v = Get-TokMs $hits[0].Tail $Key
    if (($null -eq $v) -or ($v -lt 0)) { return (Get-MissingTok $C $LineDef $Key) }
    return (New-Res 'value' ([double]$v) '')
}

function X-Spare {
    # spare=0 / spare=1 of the first "chat attach" line.
    param($C)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $script:L.Spare).Items
    if ($hits.Count -eq 0) { return (Get-MissingLine $C $script:L.Spare) }
    $v = Get-Tok $hits[0].Tail 'spare'
    if (($null -eq $v) -or (($v -ne 0) -and ($v -ne 1))) { return (Get-MissingTok $C $script:L.Spare 'spare') }
    return (New-Res 'value' ([double]$v) '')
}

function X-Send {
    # dt= of the first "shell send chat" line with dt >= 0 (dt=-1 means no tap in the last 2 s).
    param($C)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    foreach ($h in (Get-Hits $C $script:L.Send).Items) {
        $v = Get-Tok $h.Tail 'dt'
        if (($null -ne $v) -and ($v -ge 0)) { return (New-Res 'value' ([double]$v) '') }
    }
    return (New-Res 'missing' $null ($C.Label + ': no "shell send chat" line with dt>=0 in ' + $C.LogName))
}

function X-SendLine {
    # Like X-Send, for any "send" line definition: dt= of the first such line with dt >= 0.
    param($C, $LineDef)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    foreach ($h in (Get-Hits $C $LineDef).Items) {
        $v = Get-Tok $h.Tail 'dt'
        if (($null -ne $v) -and ($v -ge 0)) { return (New-Res 'value' ([double]$v) '') }
    }
    return (New-Res 'missing' $null ($C.Label + ': no "' + $LineDef.Label + '" line with dt>=0 in ' + $C.LogName))
}

function X-Field {
    # A non-negative integer field of the run.json rep (only "swipes" for now). No log needed.
    param($C, [string]$Name)
    if (-not $C.Usable) { return (New-Res 'missing' $null $C.Why) }
    if ($Name -eq 'swipes') {
        if ($null -eq $C.Swipes) { return (New-Res 'missing' $null ($C.Label + ': no swipes in run.json')) }
        return (New-Res 'value' ([double]$C.Swipes) '')
    }
    return (New-Res 'missing' $null ($C.Label + ': unknown field in run.json'))
}

function X-Scroll {
    # ALL "shell scroll" lines of the window; Kind = drops (sum), gap (max), frames (sum).
    param($C, [string]$Kind)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $script:L.Scroll).Items
    if ($hits.Count -eq 0) { return (Get-MissingLine $C $script:L.Scroll) }
    $sum = 0.0
    $max = 0.0
    foreach ($h in $hits) {
        $n = Get-Tok $h.Tail 'n'
        $drop = Get-Tok $h.Tail 'drop'
        $gap = Get-Tok $h.Tail 'max'
        if (($null -eq $n) -or ($null -eq $drop) -or ($null -eq $gap) -or ($n -lt 0) -or ($drop -lt 0) -or ($gap -lt 0)) {
            return (Get-MissingTok $C $script:L.Scroll 'n/drop/max')
        }
        if ($Kind -eq 'drops') { $sum += [double]$drop }
        elseif ($Kind -eq 'frames') { $sum += [double]$n }
        elseif ([double]$gap -gt $max) { $max = [double]$gap }
    }
    if ($Kind -eq 'gap') { return (New-Res 'value' $max '') }
    return (New-Res 'value' $sum '')
}

function X-Long {
    # "shell longtask" lines: Kind = count (zero is a real value), longest (no lines = nothing to report).
    param($C, [string]$Kind)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    $hits = (Get-Hits $C $script:L.Long).Items
    $max = 0.0
    foreach ($h in $hits) {
        $v = Get-Tok $h.Tail 'ms'
        if (($null -eq $v) -or ($v -lt 0)) { return (Get-MissingTok $C $script:L.Long 'ms') }
        if ([double]$v -gt $max) { $max = [double]$v }
    }
    if ($Kind -eq 'count') { return (New-Res 'value' ([double]$hits.Count) '') }
    if ($hits.Count -eq 0) { return (New-Res 'empty' $null '') }
    return (New-Res 'value' $max '')
}

function Get-HitsFrom {
    # Like Get-Hits, but only the lines whose own stamp is >= the rep's stamp2 (callers check that T2 exists).
    param($C, $LineDef)
    $hits = New-Object System.Collections.Generic.List[object]
    foreach ($h in (Get-Hits $C $LineDef).Items) {
        if ($h.Stamp -ge $C.T2) { $hits.Add($h) }
    }
    return [pscustomobject]@{ Items = $hits }
}

function Test-ReadyT2 {
    # Test-Ready, and in addition a readable stamp2 (the windowed rows of the filewalk steps).
    param($C)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    if ($null -eq $C.T2) { return (New-Res 'missing' $null $C.T2Why) }
    return $null
}

function X-FirstNonNeg {
    # key=<int> of the FIRST such line whose value is >= 0 (the shell writes -1 when it saw no tap: no value, as X-Send).
    param($C, $LineDef, [string]$Key)
    $r = Test-Ready $C
    if ($null -ne $r) { return $r }
    foreach ($h in (Get-Hits $C $LineDef).Items) {
        $v = Get-Tok $h.Tail $Key
        if (($null -ne $v) -and ($v -ge 0)) { return (New-Res 'value' ([double]$v) '') }
    }
    return (New-Res 'missing' $null ($C.Label + ': no "' + $LineDef.Label + '" line with ' + $Key + '>=0 in ' + $C.LogName))
}

function X-TokenW {
    # key=<int> of the FIRST such line from stamp2 on.
    param($C, $LineDef, [string]$Key)
    $r = Test-ReadyT2 $C
    if ($null -ne $r) { return $r }
    $hits = (Get-HitsFrom $C $LineDef).Items
    if ($hits.Count -eq 0) { return (New-Res 'missing' $null ($C.Label + ': no "' + $LineDef.Label + '" line from stamp2 on in ' + $C.LogName)) }
    $v = Get-Tok $hits[0].Tail $Key
    if (($null -eq $v) -or ($v -lt 0)) { return (Get-MissingTok $C $LineDef $Key) }
    return (New-Res 'value' ([double]$v) '')
}

function X-ScrollW {
    # X-Scroll over the "shell scroll" lines from stamp2 on only.
    param($C, [string]$Kind)
    $r = Test-ReadyT2 $C
    if ($null -ne $r) { return $r }
    $hits = (Get-HitsFrom $C $script:L.Scroll).Items
    # #46 r2 (B2-3): the rep does two swipes after stamp2, each with its own scroll line: fewer than two = the pull came too
    # early, a partial sum is no value (the rep counts as a rep without a value, as one with no line).
    if ($hits.Count -lt 2) { return (New-Res 'missing' $null ($C.Label + ': fewer than two "' + $script:L.Scroll.Label + '" lines from stamp2 on in ' + $C.LogName + ' (the two swipes)')) }
    $sum = 0.0
    $max = 0.0
    foreach ($h in $hits) {
        $n = Get-Tok $h.Tail 'n'
        $drop = Get-Tok $h.Tail 'drop'
        $gap = Get-Tok $h.Tail 'max'
        if (($null -eq $n) -or ($null -eq $drop) -or ($null -eq $gap) -or ($n -lt 0) -or ($drop -lt 0) -or ($gap -lt 0)) {
            return (Get-MissingTok $C $script:L.Scroll 'n/drop/max')
        }
        if ($Kind -eq 'drops') { $sum += [double]$drop }
        elseif ($Kind -eq 'frames') { $sum += [double]$n }
        elseif ([double]$gap -gt $max) { $max = [double]$gap }
    }
    if ($Kind -eq 'gap') { return (New-Res 'value' $max '') }
    return (New-Res 'value' $sum '')
}

function X-LongW {
    # X-Long over the "shell longtask" lines from stamp2 on only (zero is a real value; no stamp2 = missing).
    param($C, [string]$Kind)
    $r = Test-ReadyT2 $C
    if ($null -ne $r) { return $r }
    # #46 r3 (B3-4): a pull before both swipes' scroll lines were in the log also misses their long tasks: the same rule as
    # X-ScrollW (fewer than two scroll lines from stamp2 on = no value for this rep).
    if (((Get-HitsFrom $C $script:L.Scroll).Items).Count -lt 2) { return (New-Res 'missing' $null ($C.Label + ': fewer than two "' + $script:L.Scroll.Label + '" lines from stamp2 on in ' + $C.LogName + ' (the two swipes): no long-task value')) }
    $hits = (Get-HitsFrom $C $script:L.Long).Items
    $max = 0.0
    foreach ($h in $hits) {
        $v = Get-Tok $h.Tail 'ms'
        if (($null -eq $v) -or ($v -lt 0)) { return (Get-MissingTok $C $script:L.Long 'ms') }
        if ([double]$v -gt $max) { $max = [double]$v }
    }
    if ($Kind -eq 'count') { return (New-Res 'value' ([double]$hits.Count) '') }
    if ($hits.Count -eq 0) { return (New-Res 'empty' $null '') }
    return (New-Res 'value' $max '')
}

function X-Am {
    # am.totalTime from run.json (no log needed). EmptyOk = the field is optional for this step.
    param($C, [bool]$EmptyOk)
    if (-not $C.Usable) { return (New-Res 'missing' $null $C.Why) }
    if ($null -eq $C.Am) {
        if ($EmptyOk) { return (New-Res 'empty' $null '') }
        return (New-Res 'missing' $null ($C.Label + ': no am.totalTime in run.json'))
    }
    return (New-Res 'value' $C.Am '')
}

function X-Mem {
    # Kind = app | rend | sum. The memory context holds the already parsed app / renderer results.
    param($C, [string]$Kind)
    if (-not $C.Usable) { return (New-Res 'missing' $null $C.Why) }
    if ($Kind -eq 'app') { return $C.MemApp }
    if ($Kind -eq 'rend') { return $C.MemRend }
    if ($C.MemApp.State -ne 'value') { return $C.MemApp }
    if ($C.MemRend.State -ne 'value') { return $C.MemRend }
    return (New-Res 'value' ($C.MemApp.Value + $C.MemRend.Value) '')
}

# ---------------------------------------------------------------------------------------------------------------
# The metric table (3.5). One definition = one row. To add a metric: add a New-Def line to the step's list.
#   Src = which file(s) the row names: log | run | memapp | memrend | membot
# ---------------------------------------------------------------------------------------------------------------
function New-Def {
    param([string]$Name, [string]$Unit, [bool]$Required, [string]$Src, [scriptblock]$Extract, [string]$Agg = 'stats')
    return @{ Name = $Name; Unit = $Unit; Required = $Required; Src = $Src; Extract = $Extract; Agg = $Agg }
}

$script:OpenDefs = @(
    (New-Def 'present ms=' 'ms' $true 'log' { param($c) X-Token $c $script:L.Present 'ms' }),
    (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.Frames 'drop' }),
    (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.Frames 'max' }),
    (New-Def 'spare used' '0/1' $true 'log' { param($c) X-Spare $c } 'spare')
)
$script:SendDef = (New-Def 'tap -> send dt=' 'ms' $true 'log' { param($c) X-Send $c })
$script:AmOptDef = (New-Def 'am TotalTime' 'ms' $false 'run' { param($c) X-Am $c $true })
# Scroll and long-task rows for the steps added in walksteps2 (the old 'scroll' entry below keeps its own copy).
$script:ScrollDropDef = (New-Def 'scroll drops (sum)' 'count' $true 'log' { param($c) X-Scroll $c 'drops' })
$script:ScrollGapDef = (New-Def 'scroll max gap (max)' 'ms' $true 'log' { param($c) X-Scroll $c 'gap' })
$script:ScrollFramesDef = (New-Def 'scroll frames n (sum)' 'count' $true 'log' { param($c) X-Scroll $c 'frames' })
$script:LongCountDef = (New-Def 'long tasks' 'count' $false 'log' { param($c) X-Long $c 'count' })
$script:LongMaxDef = (New-Def 'longest long task' 'ms' $false 'log' { param($c) X-Long $c 'longest' })
# Windowed variants for the filewalk steps: only lines from the rep's stamp2 on.
$script:ScrollDropWDef = (New-Def 'scroll drops (sum)' 'count' $true 'log' { param($c) X-ScrollW $c 'drops' })
$script:ScrollGapWDef = (New-Def 'scroll max gap (max)' 'ms' $true 'log' { param($c) X-ScrollW $c 'gap' })
$script:ScrollFramesWDef = (New-Def 'scroll frames n (sum)' 'count' $true 'log' { param($c) X-ScrollW $c 'frames' })
$script:LongCountWDef = (New-Def 'long tasks' 'count' $false 'log' { param($c) X-LongW $c 'count' })
$script:LongMaxWDef = (New-Def 'longest long task' 'ms' $false 'log' { param($c) X-LongW $c 'longest' })
# The three file / voice / photo chats: open rows of the chat intent (no spare, no send row), then the windowed scroll rows.
$script:ChatScrollDefs = @(
    (New-Def 'intent -> present' 'ms' $true 'log' { param($c) X-Delta $c $script:L.Present }),
    (New-Def 'present ms=' 'ms' $true 'log' { param($c) X-Token $c $script:L.Present 'ms' }),
    (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.Frames 'drop' }),
    (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.Frames 'max' }),
    $script:ScrollDropWDef,
    $script:ScrollGapWDef,
    $script:ScrollFramesWDef,
    $script:LongCountWDef,
    $script:LongMaxWDef
)

# Batch photo1a: the rows of one open-seed index. $Prefix = '' for the warm reps, 'cold ' for the one cold rep. The first three
# rows are the old lines (required, as in chat-intent); every row that reads a line of the chat open that a base build may not
# write (the new [P1] chat lines) or that is not always written (chat batch, chat-shell) is OPTIONAL: no value = n/a, not
# "no data", not exit 2.
function New-OpenSeedDefs {
    param([string]$Prefix)
    return @(
        (New-Def ($Prefix + 'intent -> present') 'ms' $true 'log' { param($c) X-Delta $c $script:L.Present }),
        (New-Def ($Prefix + 'present ms=') 'ms' $true 'log' { param($c) X-Token $c $script:L.Present 'ms' }),
        (New-Def ($Prefix + 'attach spare=') '0/1' $true 'log' { param($c) X-Spare $c } 'spare'),
        (New-Def ($Prefix + 'onload-main ms=') 'ms' $false 'log' { param($c) X-Token $c $script:L.ChatOnloadMain 'ms' }),
        (New-Def ($Prefix + 'read ms=') 'ms' $false 'log' { param($c) X-Token $c $script:L.ChatRead 'ms' }),
        (New-Def ($Prefix + 'read passes') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatRead 'passes' }),
        (New-Def ($Prefix + 'read rows') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatRead 'rows' }),
        (New-Def ($Prefix + 'batch json=') 'chars' $false 'log' { param($c) X-Token $c $script:L.ChatBatch 'json' }),
        (New-Def ($Prefix + 'shell paint=') 'ms' $false 'log' { param($c) X-TokenMs $c $script:L.ChatShell 'paint' }),
        (New-Def ($Prefix + 'shell glass=') 'ms' $false 'log' { param($c) X-TokenMs $c $script:L.ChatShell 'glass' }),
        (New-Def ($Prefix + 'media thumbs') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatMedia 'thumbs' }),
        (New-Def ($Prefix + 'media hit') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatMedia 'hit' }),
        (New-Def ($Prefix + 'media pre') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatMedia 'pre' }),
        (New-Def ($Prefix + 'media voice') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatMedia 'voice' }),
        (New-Def ($Prefix + 'media vpre') 'count' $false 'log' { param($c) X-Token $c $script:L.ChatMedia 'vpre' })
    )
}
$script:OpenSeedWarmDefs = New-OpenSeedDefs ''
$script:OpenSeedColdDefs = New-OpenSeedDefs 'cold '

$script:StepTable = [ordered]@{
    'coldstart'   = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'am TotalTime' 'ms' $true 'run' { param($c) X-Am $c $false }),
            (New-Def 'start -> first shell boot' 'ms' $true 'log' { param($c) X-Delta $c $script:L.Boot }),
            (New-Def 'first shell boot load=' 'ms' $true 'log' { param($c) X-Token $c $script:L.Boot 'load' }),
            (New-Def 'start -> boot hold released' 'ms' $true 'log' { param($c) X-Delta $c $script:L.Hold }),
            (New-Def 'boot hold ms=' 'ms' $true 'log' { param($c) X-Token $c $script:L.Hold 'ms' })
        ) }
    'chat-intent' = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'intent -> present' 'ms' $true 'log' { param($c) X-Delta $c $script:L.Present })
        ) + $script:OpenDefs }
    'chat-tap'    = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @() + $script:OpenDefs + @($script:SendDef) }
    'scroll'      = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'scroll drops (sum)' 'count' $true 'log' { param($c) X-Scroll $c 'drops' }),
            (New-Def 'scroll max gap (max)' 'ms' $true 'log' { param($c) X-Scroll $c 'gap' }),
            (New-Def 'scroll frames n (sum)' 'count' $true 'log' { param($c) X-Scroll $c 'frames' }),
            (New-Def 'long tasks' 'count' $false 'log' { param($c) X-Long $c 'count' }),
            (New-Def 'longest long task' 'ms' $false 'log' { param($c) X-Long $c 'longest' })
        ) }
    'resume'      = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @() + $script:OpenDefs + @($script:SendDef, $script:AmOptDef) }
    'resume-long' = @{ Kind = 'reps'; Reps = 'one'; Defs = @() + $script:OpenDefs + @($script:SendDef, $script:AmOptDef) }
    'mem-home'    = @{ Kind = 'mem'; Phase = 'home' }
    'mem-end'     = @{ Kind = 'mem'; Phase = 'end' }
    'mem-trim'    = @{ Kind = 'mem'; Phase = 'trim' }
    'mem-photos'  = @{ Kind = 'mem'; Phase = 'photos' }
    'network'     = @{ Kind = 'reps'; Reps = 'one'; Defs = @(
            (New-Def 'wifi on -> first node connected' 'ms' $true 'log' { param($c) X-Delta $c $script:L.Conn }),
            (New-Def 'wifi on -> first Hello' 'ms' $false 'log' { param($c) X-Delta $c $script:L.Hello })
        ) }
    'killrenderer' = @{ Kind = 'info-kill' }
    'chatinfo'    = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> present' 'ms' $true 'log' { param($c) X-Delta $c $script:L.InfoPresent }),
            (New-Def 'present ms=' 'ms' $true 'log' { param($c) X-Token $c $script:L.InfoPresent 'ms' }),
            (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.InfoFrames 'drop' }),
            (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.InfoFrames 'max' }),
            (New-Def 'tap -> send dt=' 'ms' $true 'log' { param($c) X-SendLine $c $script:L.SendDetails })
        ) }
    'tab-apps'    = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> tab shown first=' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabApps 'first' }),
            (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.TabAppsFr 'drop' }),
            (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabAppsFr 'max' })
        ) }
    'tab-wallet'  = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> tab shown first=' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabWallet 'first' }),
            (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.TabWalletFr 'drop' }),
            (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabWalletFr 'max' })
        ) }
    'tab-account' = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> tab shown first=' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabAccount 'first' }),
            (New-Def 'frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.TabAccountFr 'drop' }),
            (New-Def 'frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.TabAccountFr 'max' })
        ) }
    'history'     = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'older pages loaded' 'count' $true 'log' { param($c) X-Count $c $script:L.Load 3 }),
            (New-Def 'first swipe -> 3rd page' 'ms' $true 'log' { param($c) X-NthDelta $c $script:L.Load 3 }),
            $script:ScrollGapDef,
            $script:ScrollDropDef,
            $script:ScrollFramesDef,
            $script:LongCountDef,
            $script:LongMaxDef,
            (New-Def 'swipes' 'count' $true 'run' { param($c) X-Field $c 'swipes' })
        ) }
    'resume-now'  = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @() + $script:OpenDefs + @($script:SendDef, $script:AmOptDef) }
    'resume-3s'   = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @() + $script:OpenDefs + @($script:SendDef, $script:AmOptDef) }
    'scroll-image' = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            $script:ScrollDropDef,
            $script:ScrollGapDef,
            $script:ScrollFramesDef,
            $script:LongCountDef,
            $script:LongMaxDef
        ) }
    'scroll-files'  = @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:ChatScrollDefs }
    'scroll-voice'  = @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:ChatScrollDefs }
    'scroll-photos' = @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:ChatScrollDefs }
    'viewer'      = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> viewimage sent dt=' 'ms' $true 'log' { param($c) X-SendLine $c $script:L.SendViewImage }),
            (New-Def 'tap -> viewer shown first=' 'ms' $true 'log' { param($c) X-FirstNonNeg $c $script:L.OverlayOpen 'first' }),
            (New-Def 'viewer frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.OverlayOpenFr 'drop' }),
            (New-Def 'viewer frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.OverlayOpenFr 'max' }),
            (New-Def 'close frames drop' 'count' $true 'log' { param($c) X-TokenW $c $script:L.OverlayCloseFr 'drop' }),
            (New-Def 'close frames max gap' 'ms' $true 'log' { param($c) X-TokenW $c $script:L.OverlayCloseFr 'max' })
        ) }
    'downloads'   = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @(
            (New-Def 'tap -> loaddownloads sent dt=' 'ms' $true 'log' { param($c) X-SendLine $c $script:L.SendLoadDl }),
            (New-Def 'tap -> list shown first=' 'ms' $true 'log' { param($c) X-FirstNonNeg $c $script:L.SubOpen 'first' }),
            (New-Def 'list frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.SubOpenFr 'drop' }),
            (New-Def 'list frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.SubOpenFr 'max' }),
            $script:ScrollDropWDef,
            $script:ScrollGapWDef,
            $script:ScrollFramesWDef,
            $script:LongCountWDef,
            $script:LongMaxWDef
        ) }
    # Batch photo1a: the rows are built per index in Invoke-Main (the step names of the reps are open-seed-kNN[-cold]).
    'open-seed'   = @{ Kind = 'open-seed' }
}

$script:MemDefs = @(
    (New-Def 'app PSS' 'kB' $true 'memapp' { param($c) X-Mem $c 'app' }),
    (New-Def 'renderer PSS' 'kB' $true 'memrend' { param($c) X-Mem $c 'rend' }),
    (New-Def 'app + renderer PSS' 'kB' $true 'membot' { param($c) X-Mem $c 'sum' })
)

# ---------------------------------------------------------------------------------------------------------------
# Statistics and rows
# ---------------------------------------------------------------------------------------------------------------
function Get-SeedIndexes {
    # Batch photo1a: run.json seedIndex = 1 to 8 distinct whole numbers 0..55 (round 1 F4: a negative number is none too); anything else = none (the step shows "no data").
    param($M)
    $raw = Get-Prop $M 'seedIndex'
    if ($null -eq $raw) { return @() }
    $out = New-Object System.Collections.Generic.List[int]
    foreach ($v in @($raw)) {
        $n = Get-Num $v
        if (($null -eq $n) -or ($n -ne [Math]::Floor($n)) -or ($n -lt 0) -or ($n -gt 55)) { return @() }
        if ($out.Contains([int]$n)) { return @() }
        $out.Add([int]$n)
    }
    if (($out.Count -lt 1) -or ($out.Count -gt 8)) { return @() }
    return $out.ToArray()
}

function Get-Median {
    param([double[]]$Values)
    $s = [double[]]$Values.Clone()
    [Array]::Sort($s)
    $n = $s.Length
    if (($n % 2) -eq 1) { return $s[[int](($n - 1) / 2)] }
    return (($s[[int]($n / 2) - 1] + $s[[int]($n / 2)]) / 2.0)
}

function Get-StepDef {
    # Step names are case-sensitive and compared ordinally: COLDSTART is an unknown step.
    param([string]$Name)
    $k = Get-StepKey $Name
    if ($null -eq $k) { return $null }
    # Batch photo1a: a per-index open-seed name is a rep step with the rows of one index (cold = one rep, warm = repeats).
    if (Test-OpenSeedName $k) {
        if ($k.EndsWith('-cold', [StringComparison]::Ordinal)) { return @{ Kind = 'reps'; Reps = 'one'; Defs = $script:OpenSeedColdDefs } }
        return @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:OpenSeedWarmDefs }
    }
    return $script:StepTable[$k]
}

function New-Row {
    param([string]$Step, [string]$Metric, [string]$N, [string]$Median, [string]$Min, [string]$Max, [string]$Unit, [string]$Note, [string]$Files, [string]$Kind)
    return [pscustomobject]@{ Step = $Step; Metric = $Metric; N = $N; Median = $Median; Min = $Min; Max = $Max; Unit = $Unit; Note = $Note; Files = $Files; Kind = $Kind }
}

function Get-RowFiles {
    # The files a row was computed from (names only, accepted names only), joined by a space.
    param($Def, $Ctxs)
    $names = New-Object System.Collections.Generic.List[string]
    if ($Def.Src -eq 'run') { $names.Add('run.json') }
    else {
        foreach ($c in $Ctxs) {
            $cand = @()
            if ($Def.Src -eq 'log') { $cand = @($c.LogName) }
            elseif ($Def.Src -eq 'memapp') { $cand = @($c.AppName) }
            elseif ($Def.Src -eq 'memrend') { $cand = @($c.RendName) }
            else { $cand = @($c.AppName, $c.RendName) }
            foreach ($n in $cand) {
                if ((Test-SafeName $n) -and (-not $names.Contains($n))) { $names.Add($n) }
            }
        }
    }
    return ($names.ToArray() -join ' ')
}

function Get-DataRow {
    param([string]$Step, $Def, $Ctxs)
    $vals = New-Object System.Collections.Generic.List[double]
    $why = New-Object System.Collections.Generic.List[string]
    $total = @($Ctxs).Count
    foreach ($c in $Ctxs) {
        $r = & $Def.Extract $c
        if ($r.State -eq 'value') { $vals.Add([double]$r.Value) }
        elseif ($r.State -eq 'missing') { $why.Add([string]$r.Why) }
        elseif ($Def.Required) { $why.Add($c.Label + ': no value') }
    }
    $files = Get-RowFiles $Def $Ctxs
    $noData = $false
    $note = ''
    if ($Def.Required) {
        if ($why.Count -gt 0) {
            $noData = $true
            $note = $why[0]
            if ($why.Count -gt 1) { $note = $note + '; ' + ($why.Count - 1).ToString($script:Inv) + ' more rep(s) lack it' }
        }
    }
    elseif ($vals.Count -eq 0) {
        # Optional metric with nothing to report: not counted, not a zero.
        $noteNa = 'no value in any rep'
        if ($why.Count -gt 0) { $noteNa = $why[0] }
        return (New-Row $Step $Def.Name '' $script:NotAvail $script:NotAvail $script:NotAvail $Def.Unit $noteNa $files 'optional')
    }
    if ($noData) {
        return (New-Row $Step $Def.Name '' $script:NoData $script:NoData $script:NoData $Def.Unit $note $files 'nodata')
    }
    $arr = $vals.ToArray()
    $med = Get-Median $arr
    $mn = ($arr | Measure-Object -Minimum).Minimum
    $mx = ($arr | Measure-Object -Maximum).Maximum
    $notes = New-Object System.Collections.Generic.List[string]
    if ($Def.Agg -eq 'spare') {
        $k = 0
        foreach ($v in $arr) { if ($v -eq 1) { $k++ } }
        $notes.Add('spare=1 in ' + $k.ToString($script:Inv) + ' of ' + $arr.Length.ToString($script:Inv))
    }
    if ((-not $Def.Required) -and ($arr.Length -lt $total)) {
        $notes.Add('value in ' + $arr.Length.ToString($script:Inv) + ' of ' + $total.ToString($script:Inv) + ' reps')
        if ($why.Count -gt 0) { $notes.Add($why[0]) }
    }
    if ($arr.Length -eq 1) { $notes.Add('single sample') }
    return (New-Row $Step $Def.Name $arr.Length.ToString($script:Inv) (Format-Num $med) (Format-Num $mn) (Format-Num $mx) $Def.Unit ($notes.ToArray() -join '; ') $files 'data')
}

# ---------------------------------------------------------------------------------------------------------------
# Contexts: one per rep (and one per memory phase). All properties always exist.
# ---------------------------------------------------------------------------------------------------------------
function New-Ctx {
    param([string]$Label, [bool]$Present, [bool]$Usable, [string]$Why)
    return [pscustomobject]@{
        Label = $Label; Present = $Present; Usable = $Usable; Why = $Why
        Am = $null
        Swipes = $null
        T0 = $null; T0Why = ''
        T2 = $null; T2Why = ''
        LogName = ''; LogWhy = $null; Window = @()
        AppName = ''; RendName = ''
        MemApp = $null; MemRend = $null
        Status = ''; Note = ''
    }
}

function Get-StatusWhy {
    param([string]$Label, [string]$Status, [string]$Note)
    $s = $Label + ': status ' + (Format-Safe $Status 20)
    $n = Format-Safe $Note 80
    if ($n.Length -gt 0) { $s = $s + ' (' + $n + ')' }
    return $s
}

function Get-LogWhy {
    param([string]$Label, [string]$State, [string]$Name)
    if ($State -eq 'ok') { return $null }
    if ($State -eq 'noname') { return ($Label + ': no log file named in run.json') }
    if ($State -eq 'badname') { return ($Label + ': log file name not accepted') }
    if ($State -eq 'toolarge') { return ($Label + ': log file too large') }
    if ($State -eq 'missing') { return ($Label + ': log file ' + $Name + ' missing') }
    return ($Label + ': log file ' + $Name + ' unreadable')
}

function New-RepCtx {
    # $Entry = the manifest rep; $T0 / $Upper = DateTime or $null; the window is built here.
    param($Entry, [string]$Step, [string]$RepText, $T0, $T0Why, $Upper, [string]$RunPath)
    $label = 'rep ' + $RepText
    $status = [string](Get-Prop $Entry 'status')
    $note = [string](Get-Prop $Entry 'note')
    $usable = (Test-Same $status 'ok')
    $why = ''
    if (-not $usable) { $why = Get-StatusWhy $label $status $note }
    $c = New-Ctx $label $true $usable $why
    $c.Status = $status
    $c.Note = $note
    $am = Get-Prop $Entry 'am'
    $c.Am = Get-Num (Get-Prop $am 'totalTime')
    # swipes (history step): a whole number 0..1000, else $null.
    $sw = Get-Num (Get-Prop $Entry 'swipes')
    if (($null -ne $sw) -and (($sw -gt 1000) -or ($sw -ne [Math]::Floor($sw)))) { $sw = $null }
    $c.Swipes = $sw
    $c.T0 = $T0
    $c.T0Why = $T0Why
    # stamp2 (filewalk steps): the device time of the second stamp, same format as t0; only read when a row asks for it.
    $s2 = Get-Prop $Entry 'stamp2'
    if (($null -eq $s2) -or ([string]$s2 -eq '')) { $c.T2Why = $label + ': no stamp2 in run.json' }
    elseif ($null -eq $T0) { $c.T2Why = $label + ': stamp2 needs a readable t0' }
    else {
        $t2 = Convert-T0 ([string]$s2) $T0 $T0
        if (($null -eq $t2) -or ($t2 -le $T0)) { $c.T2Why = $label + ': stamp2 not readable' }
        else { $c.T2 = $t2 }
    }
    $logName = Get-Prop $Entry 'log'
    $expLog = Get-RepFileName $Step ([double]$RepText) 'log'
    $raw = $null
    if (($null -eq $logName) -or ([string]$logName).Length -eq 0) { $c.LogWhy = Get-LogWhy $label 'noname' '' }
    elseif (-not (Test-Same ([string]$logName) $expLog)) { $c.LogWhy = Get-LogWhy $label 'badname' '' }
    else {
        $c.LogName = $expLog
        $raw = Get-LogRaw $expLog $RunPath
        $c.LogWhy = Get-LogWhy $label $raw.State $expLog
    }
    if ($usable -and ($null -eq $c.LogWhy) -and ($null -ne $T0)) {
        $win = New-Object System.Collections.Generic.List[object]
        foreach ($ev in $raw.Events) {
            $dt = Convert-LineStamp $ev $T0
            if ($null -eq $dt) { continue }
            if ($dt -lt $T0) { continue }
            if (($null -ne $Upper) -and ($dt -ge $Upper)) { continue }
            $win.Add([pscustomobject]@{ Stamp = $dt; Msg = $ev.Msg })
        }
        $c.Window = $win.ToArray()
    }
    return $c
}

function Read-TotalPss {
    # App Summary "TOTAL PSS:" first; fallback = first number of the "TOTAL" table row. kB, as a result object.
    param([string]$Label, [string]$Name, [string]$Kind, [string]$RunPath, [string]$Expected)
    if ([string]::IsNullOrEmpty($Name)) { return (New-Res 'missing' $null ($Label + ': no ' + $Kind + ' meminfo file named in run.json')) }
    if (-not (Test-Same $Name $Expected)) { return (New-Res 'missing' $null ($Label + ': ' + $Kind + ' meminfo file name not accepted')) }
    $path = Join-Path $RunPath $Name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return (New-Res 'missing' $null ($Label + ': file ' + $Name + ' missing')) }
    try { $text = Read-TextFile $path }
    catch { return (New-Res 'missing' $null ($Label + ': file ' + $Name + ' unreadable')) }
    $m = $script:RxTotalPss.Match($text)
    if (-not $m.Success) { $m = $script:RxTotalRow.Match($text) }
    if (-not $m.Success) { return (New-Res 'missing' $null ($Label + ': no TOTAL PSS in ' + $Name)) }
    $kb = [long]::Parse($m.Groups[1].Value, $script:Inv)
    if ($kb -gt 1000000000) { return (New-Res 'missing' $null ($Label + ': TOTAL PSS in ' + $Name + ' is not a readable number')) }
    return (New-Res 'value' ([double]$kb) '')
}

function New-MemCtx {
    param($Entry, [string]$Phase, [string]$RunPath)
    $label = 'mem ' + $Phase
    if ($null -eq $Entry) {
        $c = New-Ctx $label $false $false 'no memory entry in run.json'
        return $c
    }
    $status = [string](Get-Prop $Entry 'status')
    $note = [string](Get-Prop $Entry 'note')
    $usable = (Test-Same $status 'ok')
    $why = ''
    if (-not $usable) { $why = Get-StatusWhy $label $status $note }
    $c = New-Ctx $label $true $usable $why
    $c.Status = $status
    $expApp = 'meminfo-' + $Phase + '-app.txt'
    $expRend = 'meminfo-' + $Phase + '-renderer.txt'
    $appFile = Get-Prop $Entry 'appFile'
    $rendFile = Get-Prop $Entry 'rendererFile'
    if ($null -ne $appFile) { $c.AppName = [string]$appFile }
    if ($null -ne $rendFile) { $c.RendName = [string]$rendFile }
    $c.MemApp = Read-TotalPss $label $c.AppName 'app' $RunPath $expApp
    # No renderer pid / file = no renderer value (and so no sum); the app value stays.
    $rendPid = Get-Prop $Entry 'rendererPid'
    if (($null -eq $rendPid) -or ($null -eq (Get-Prop $Entry 'rendererFile'))) {
        $why2 = $label + ': no renderer process in run.json'
        $n2 = Format-Safe $note 60
        if ($n2.Length -gt 0) { $why2 = $why2 + ' (' + $n2 + ')' }
        $c.MemRend = New-Res 'missing' $null $why2
    }
    else {
        $c.MemRend = Read-TotalPss $label $c.RendName 'renderer' $RunPath $expRend
    }
    if (-not (Test-Same $c.AppName $expApp)) { $c.AppName = '' }
    if (-not (Test-Same $c.RendName $expRend)) { $c.RendName = '' }
    return $c
}

# ---------------------------------------------------------------------------------------------------------------
# The switch state (batch perfb1toggle): the app's own start-up line "[FLAGS] warmidle=N sparerearm=N sparekeep=N
# noemptydetail=N" after the Core log stamp. Anchored, case-sensitive; only the four digits are kept.
# ---------------------------------------------------------------------------------------------------------------
$script:FlagsPullName = 'android-walk-flags-00.txt'
$script:RxFlagState = New-Rx '^[0-9]{2}-[0-9]{2} [0-9:.]{12} +[0-9]+ +[0-9]+ [A-Z] DOTNET *: [0-9]{2}-[0-9]{2} [0-9:.]{8,16}\|[A-Za-z]{1,10}\|[0-9]{1,6}: \[FLAGS\] warmidle=([01]) sparerearm=([01]) sparekeep=([01]) noemptydetail=([01])\z'
$script:RxFlagAsked = New-Rx '^warmidle=([01]),sparerearm=([01]),sparekeep=([01]),noemptydetail=([01])\z'
$script:FlagsStopWords = [ordered]@{
    'start-failed' = 'the start with the perfb1flags extra failed'
    'not-stored' = 'the app did not store the switch state (Developer mode off, or the build on the phone does not have this batch)'
    'no-state-line' = 'the app logged no switch state line after the cold start'
    'pull-failed' = 'the log pull of the switch state failed'
    'state-differs' = 'the app logged a switch state that differs from the asked state'
    'unproven-process' = 'the app process changed after the switch state was proven (a restart inside the run): the state of the new process is not proven'
}

function Read-FlagStates {
    # State lines of one log file, each RE-BUILT from the four captured digits. State: ok | missing | unreadable.
    param([string]$Name, [string]$RunPath)
    $lines = New-Object System.Collections.Generic.List[string]
    $state = 'ok'
    $path = Join-Path $RunPath $Name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $state = 'missing' }
    else {
        try {
            if ((New-Object System.IO.FileInfo -ArgumentList $path).Length -gt 4194304) { throw 'toolarge' }
            foreach ($line in [regex]::Split((Read-TextFile $path), '\r\n|\n|\r')) {
                if ($line.Length -gt 1000) { continue }
                $mm = $script:RxFlagState.Match($line)
                if ($mm.Success) {
                    $lines.Add('warmidle=' + $mm.Groups[1].Value + ' sparerearm=' + $mm.Groups[2].Value + ' sparekeep=' + $mm.Groups[3].Value + ' noemptydetail=' + $mm.Groups[4].Value)
                }
            }
        }
        catch { $state = 'unreadable'; $lines.Clear() }
    }
    return [pscustomobject]@{ State = $state; Lines = $lines.ToArray() }
}

function Get-FlagsStatus {
    # Mode: asked (run.json flags.asked is a string) | free. Problem: '' | nodata | differs | badasked.
    param($Manifest, $Reps, [string]$RunPath)
    $fm = Get-Prop $Manifest 'flags'
    $askedRaw = Get-Prop $fm 'asked'
    $stopRaw = Get-Prop $fm 'stop'
    $st = [pscustomobject]@{ Mode = 'free'; Asked = ''; Logged = ''; Problem = ''; Why = ''; Stop = ''; Mixed = @() }
    if ($null -ne $stopRaw) {
        # Any stop value counts as a stop; a code that is not known prints fixed words, never the raw value.
        $st.Stop = 'the driver stopped the run (an unknown stop code)'
        if ($stopRaw -is [string]) {
            foreach ($k in $script:FlagsStopWords.Keys) { if (Test-Same $k $stopRaw) { $st.Stop = [string]$script:FlagsStopWords[$k] } }
        }
    }
    if ($null -ne $askedRaw) {
        $st.Mode = 'asked'
        $am = $null
        if ($askedRaw -is [string]) { $am = $script:RxFlagAsked.Match($askedRaw) }
        if (($null -eq $am) -or (-not $am.Success)) {
            $st.Problem = 'badasked'
            $st.Why = 'run.json flags.asked is not a valid state'
            return $st
        }
        $st.Asked = 'warmidle=' + $am.Groups[1].Value + ' sparerearm=' + $am.Groups[2].Value + ' sparekeep=' + $am.Groups[3].Value + ' noemptydetail=' + $am.Groups[4].Value
    }
    # The files to read: the flags pull (asked runs), then every rep log named by its own derived name.
    $files = New-Object System.Collections.Generic.List[object]
    $coldNone = $false
    if ($st.Mode -eq 'asked') { $files.Add(@{ Name = $script:FlagsPullName; Pull = $true; Cold = $false }) }
    foreach ($r in $Reps) {
        $key = Get-StepKey ([string](Get-Prop $r 'step'))
        $rn = Get-Num (Get-Prop $r 'rep')
        if (($null -eq $key) -or ($null -eq $rn)) { continue }
        $exp = Get-RepFileName $key $rn 'log'
        if (($null -eq $exp) -or (-not (Test-Same ([string](Get-Prop $r 'log')) $exp))) {
            # An ok coldstart rep without its own log name has no state line to read: not proven (asked runs).
            if (($st.Mode -eq 'asked') -and (Test-Same $key 'coldstart') -and (Test-Same ([string](Get-Prop $r 'status')) 'ok')) { $coldNone = $true }
            continue
        }
        $dup = $false
        foreach ($f in $files) { if (Test-Same $f.Name $exp) { $dup = $true } }
        if (-not $dup) { $files.Add(@{ Name = $exp; Pull = $false; Cold = (Test-Same $key 'coldstart') }) }
    }
    $lastLogged = ''
    $firstBad = ''
    $pullRes = $null
    $unread = $false
    $distinct = New-Object System.Collections.Generic.List[string]
    foreach ($f in $files) {
        $res = Read-FlagStates $f.Name $RunPath
        if ($f.Pull) { $pullRes = $res }
        else {
            # A rep log that cannot be read, or a coldstart log (a new process) without its own state line, proves nothing.
            if (($res.State -ne 'ok') -and ($res.State -ne 'missing')) { $unread = $true }
            if ($f.Cold -and ($res.Lines.Count -eq 0)) { $coldNone = $true }
        }
        foreach ($ln in $res.Lines) {
            if (-not $distinct.Contains($ln)) { $distinct.Add($ln) }
            if (($st.Mode -eq 'asked') -and ($firstBad -eq '') -and (-not (Test-Same $ln $st.Asked))) { $firstBad = $ln }
            if ($f.Pull -or $f.Cold) { $lastLogged = $ln }
        }
    }
    if ($st.Mode -eq 'free') {
        # Free mode: the state lines of ALL rep logs. One distinct state = read; more than one = a warning (mixed).
        if ($distinct.Count -eq 1) { $st.Logged = $distinct[0] }
        elseif ($distinct.Count -gt 1) { $st.Mixed = @($distinct.ToArray() | Select-Object -First 4) }
        return $st
    }
    if ($firstBad -ne '') { $st.Problem = 'differs'; $st.Logged = $firstBad; return $st }
    if (($null -eq $pullRes) -or ($pullRes.Lines.Count -eq 0)) {
        $st.Problem = 'nodata'
        if ($pullRes.State -eq 'ok') { $st.Why = 'the flags log pull has no [FLAGS] state line' }
        else { $st.Why = 'the flags log pull is ' + $pullRes.State }
        return $st
    }
    if ($unread -or $coldNone) {
        $st.Problem = 'nodata'
        if ($unread) { $st.Why = 'a rep log is unreadable or too large' } else { $st.Why = 'a coldstart log has no [FLAGS] state line' }
        return $st
    }
    if ($st.Stop -ne '') {
        # The driver stopped this run (flags.stop): the state is not proven, whatever the files hold.
        $st.Problem = 'nodata'
        $st.Why = 'the driver stopped the run (see the stop reason)'
        return $st
    }
    $st.Logged = $lastLogged
    return $st
}

# ---------------------------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------------------------
function Format-MdCell {
    param([string]$Text)
    return ($Text -replace '\|', '/')
}

function Format-MdFiles {
    param([string]$Files)
    if ([string]::IsNullOrEmpty($Files)) { return '' }
    $parts = $Files.Split(' ')
    if ($parts.Length -le 2) { return $Files }
    return ($parts[0] + ' .. ' + $parts[$parts.Length - 1] + ' (' + $parts.Length.ToString($script:Inv) + ' files)')
}

function Format-CsvCell {
    param([string]$Text)
    if ($null -eq $Text) { return '' }
    if ($Text.IndexOfAny([char[]]@(',', '"', "`r", "`n")) -ge 0) { return ('"' + $Text.Replace('"', '""') + '"') }
    return $Text
}

function Protect-Csv {
    # Spreadsheet formula injection: a text cell that starts with = + - @ gets a leading apostrophe.
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return '' }
    if ('=+-@'.IndexOf($Text[0]) -ge 0) { return ("'" + $Text) }
    return $Text
}

function Write-Utf8 {
    param([string]$Path, [string]$Text)
    [System.IO.File]::WriteAllText($Path, $Text, $script:Utf8NoBom)
}

# ---------------------------------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------------------------------
function Invoke-Main {
    $runPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($RunDir)
    if (-not (Test-Path -LiteralPath $runPath -PathType Container)) {
        Write-Host ('run folder not found: ' + $RunDir)
        Write-Host 'RESULT: RUN.JSON UNUSABLE (exit 3)'
        return 3
    }

    # --- the manifest -----------------------------------------------------------------------------------------
    $manifestPath = Join-Path $runPath 'run.json'
    $m = $null
    $problem = ''
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { $problem = 'run.json is missing' }
    else {
        try { $m = (Read-TextFile $manifestPath) | ConvertFrom-Json }
        catch { $problem = 'run.json cannot be read as JSON' }
    }
    if (($problem -eq '') -and (($null -eq $m) -or ($m -isnot [System.Management.Automation.PSCustomObject]))) { $problem = 'run.json is not a JSON object' }
    if ($problem -eq '') {
        $schema = Get-Num (Get-Prop $m 'schema')
        if (($null -eq $schema) -or ($schema -ne 1)) { $problem = 'run.json has no schema 1' }
        elseif ($null -eq $m.PSObject.Properties['stepsRequested']) { $problem = 'run.json has no stepsRequested' }
        elseif ($null -eq (Get-Num (Get-Prop $m 'repeats'))) { $problem = 'run.json has no valid repeats' }
    }
    if ($problem -ne '') {
        Write-Host ($problem + ' in ' + $RunDir)
        Write-Host 'RESULT: RUN.JSON UNUSABLE (exit 3)'
        return 3
    }

    $repeats = [long][Math]::Floor((Get-Num (Get-Prop $m 'repeats')))
    if (($repeats -lt 1) -or ($repeats -gt 50)) {
        Write-Host 'run.json has repeats outside 1..50'
        Write-Host 'RESULT: RUN.JSON UNUSABLE (exit 3)'
        return 3
    }
    $finished = ((Get-Prop $m 'finished') -is [bool]) -and ((Get-Prop $m 'finished') -eq $true)

    # --- steps, reps -------------------------------------------------------------------------------------------
    $steps = New-Object System.Collections.Generic.List[string]
    foreach ($s in @(Get-Prop $m 'stepsRequested')) {
        if ($null -eq $s) { continue }
        $name = [string]$s
        if (-not $steps.Contains($name)) { $steps.Add($name) }
    }
    $reps = New-Object System.Collections.Generic.List[object]
    foreach ($r in @(Get-Prop $m 'reps')) { if ($null -ne $r) { $reps.Add($r) } }
    $memEntries = New-Object System.Collections.Generic.List[object]
    foreach ($r in @(Get-Prop $m 'memory')) { if ($null -ne $r) { $memEntries.Add($r) } }

    # The switch state (batch perfb1toggle) is judged BEFORE any row is computed: in a run with flags.asked whose state is
    # not proven or differs, no number is shown. The reps and the memory entries are emptied, so every metric row takes the
    # existing "no data" form (a run that stopped before its steps looks the same).
    $fs = Get-FlagsStatus $m $reps $runPath
    $withheld = (($fs.Mode -eq 'asked') -and ($fs.Problem -ne ''))
    if ($withheld) { $reps.Clear(); $memEntries.Clear() }

    # -RunDir time reference: parse time. t0 chain in manifest order (a New Year in the middle keeps its order).
    $now = Get-Date
    $t0s = New-Object 'System.Collections.Generic.List[object]'
    $t0Why = New-Object 'System.Collections.Generic.List[string]'
    $prev = $null
    for ($i = 0; $i -lt $reps.Count; $i++) {
        $text = Get-Prop $reps[$i] 't0'
        $repText = [string](Get-Prop $reps[$i] 'rep')
        $dt = $null
        $why = ''
        if (($null -eq $text) -or ([string]$text -eq '')) { $why = 'rep ' + (Format-Safe $repText 10) + ': no t0 in run.json' }
        else {
            $dt = Convert-T0 ([string]$text) $prev $now
            if ($null -eq $dt) { $why = 'rep ' + (Format-Safe $repText 10) + ': t0 not readable' }
        }
        if ($null -ne $dt) { $prev = $dt }
        $t0s.Add($dt)
        $t0Why.Add($why)
    }

    # Contexts for the reps of requested steps, keyed "step|rep".
    $repCtx = New-Object System.Collections.Hashtable -ArgumentList ([StringComparer]::Ordinal)
    $stepRepCount = New-Object System.Collections.Hashtable -ArgumentList ([StringComparer]::Ordinal)
    for ($i = 0; $i -lt $reps.Count; $i++) {
        $e = $reps[$i]
        $step = [string](Get-Prop $e 'step')
        if (-not $stepRepCount.ContainsKey($step)) { $stepRepCount[$step] = 0 }
        $stepRepCount[$step] = $stepRepCount[$step] + 1
        # Batch photo1a: the reps of open-seed carry per-index step names; they count when open-seed was requested.
        if ((-not $steps.Contains($step)) -and (-not ((Test-OpenSeedName $step) -and $steps.Contains('open-seed')))) { continue }
        $def = Get-StepDef $step
        if (($null -eq $def) -or ($def.Kind -ne 'reps')) { continue }
        $repNum = Get-Num (Get-Prop $e 'rep')
        if ($null -eq $repNum) { continue }
        $repText = ([long][Math]::Floor($repNum)).ToString($script:Inv)
        $upper = $null
        for ($j = $i + 1; $j -lt $reps.Count; $j++) {
            if ($null -ne $t0s[$j]) { $upper = $t0s[$j]; break }
        }
        $repCtx[$step + '|' + $repText] = New-RepCtx $e $step $repText $t0s[$i] $t0Why[$i] $upper $runPath
    }

    # --- rows --------------------------------------------------------------------------------------------------
    $rows = New-Object System.Collections.Generic.List[object]
    $stepList = New-Object System.Collections.Generic.List[string]
    foreach ($s in $steps) { $stepList.Add($s) }
    # -KillRenderer is a switch of the driver, not a step: show it when the manifest has such a rep.
    if ((-not $stepList.Contains('killrenderer')) -and $stepRepCount.ContainsKey('killrenderer')) { $stepList.Add('killrenderer') }

    foreach ($step in $stepList) {
        $safeStep = Format-Safe $step 40
        $def = Get-StepDef $step
        if ($null -eq $def) {
            # An unknown requested step is a "no data" row: nothing was measured for it.
            $rows.Add((New-Row $safeStep 'unknown step' '' $script:NoData $script:NoData $script:NoData '' 'not a known step' '' 'nodata'))
            continue
        }
        $step = Get-StepKey $step
        if ($def.Kind -eq 'open-seed') {
            # Batch photo1a: per index k of run.json seedIndex, the warm rows (n = repeats) and then the cold rows (n = 1).
            $seedIdx = @(Get-SeedIndexes $m)
            if ($seedIdx.Count -eq 0) {
                $osNote = 'no seedIndex in run.json'
                for ($i = $reps.Count - 1; $i -ge 0; $i--) {
                    if (Test-Same ([string](Get-Prop $reps[$i] 'step')) 'open-seed') {
                        $osNote = 'status ' + (Format-Safe ([string](Get-Prop $reps[$i] 'status')) 20)
                        $osNt = Format-Safe ([string](Get-Prop $reps[$i] 'note')) 80
                        if ($osNt.Length -gt 0) { $osNote = $osNote + '; ' + $osNt }
                        break
                    }
                }
                $rows.Add((New-Row $step 'seed chats' '' $script:NoData $script:NoData $script:NoData '' $osNote '' 'nodata'))
                continue
            }
            foreach ($seedK in $seedIdx) {
                $nnK = ([int]$seedK).ToString('00', $script:Inv)
                $labelK = 'open-seed k=' + ([int]$seedK).ToString($script:Inv)
                foreach ($cold in @($false, $true)) {
                    $sk = 'open-seed-k' + $nnK
                    $countK = $repeats
                    $defsK = $script:OpenSeedWarmDefs
                    if ($cold) { $sk = $sk + '-cold'; $countK = 1; $defsK = $script:OpenSeedColdDefs }
                    $ctxK = New-Object System.Collections.Generic.List[object]
                    if (-not $stepRepCount.ContainsKey($sk)) { $ctxK.Add((New-Ctx 'step' $false $false 'no reps in run.json')) }
                    else {
                        for ($k = 1; $k -le $countK; $k++) {
                            $keyK = $sk + '|' + $k.ToString($script:Inv)
                            if ($repCtx.ContainsKey($keyK)) { $ctxK.Add($repCtx[$keyK]) }
                            else {
                                $labelR = 'rep ' + $k.ToString($script:Inv)
                                $ctxK.Add((New-Ctx $labelR $false $false ($labelR + ': not in run.json')))
                            }
                        }
                    }
                    foreach ($dK in $defsK) { $rows.Add((Get-DataRow $labelK $dK $ctxK.ToArray())) }
                }
            }
            continue
        }
        if ($def.Kind -eq 'info-kill') {
            $note = 'no reps in run.json'
            for ($i = $reps.Count - 1; $i -ge 0; $i--) {
                if (Test-Same ([string](Get-Prop $reps[$i] 'step')) 'killrenderer') {
                    $st = Format-Safe ([string](Get-Prop $reps[$i] 'status')) 20
                    $nt = Format-Safe ([string](Get-Prop $reps[$i] 'note')) 80
                    $note = 'status ' + $st
                    if ($nt.Length -gt 0) { $note = $note + '; ' + $nt }
                    break
                }
            }
            $rows.Add((New-Row $step 'kill renderer (info only)' '' '' '' '' '' $note '' 'info'))
            continue
        }

        # expected contexts
        $ctxs = New-Object System.Collections.Generic.List[object]
        if ($def.Kind -eq 'mem') {
            $entry = $null
            foreach ($me in $memEntries) {
                if (Test-Same ([string](Get-Prop $me 'phase')) $def.Phase) { $entry = $me }
            }
            $ctxs.Add((New-MemCtx $entry $def.Phase $runPath))
            $defs = $script:MemDefs
        }
        else {
            $count = $repeats
            if ($def.Reps -eq 'one') { $count = 1 }
            if (-not $stepRepCount.ContainsKey($step)) {
                # The run stopped before this step: one placeholder, one note.
                $ctxs.Add((New-Ctx 'step' $false $false 'no reps in run.json'))
            }
            else {
                for ($k = 1; $k -le $count; $k++) {
                    $key = $step + '|' + $k.ToString($script:Inv)
                    if ($repCtx.ContainsKey($key)) { $ctxs.Add($repCtx[$key]) }
                    else {
                        $label = 'rep ' + $k.ToString($script:Inv)
                        $ctxs.Add((New-Ctx $label $false $false ($label + ': not in run.json')))
                    }
                }
            }
            $defs = $def.Defs
        }
        foreach ($d in $defs) {
            $rows.Add((Get-DataRow $step $d $ctxs.ToArray()))
        }
    }

    $noDataRows = 0
    $dataRows = 0
    foreach ($r in $rows) {
        if ($r.Kind -eq 'nodata') { $noDataRows++ }
        elseif ($r.Kind -eq 'data') { $dataRows++ }
    }
    $hook = ((Get-Prop $m 'adbHook') -is [bool]) -and ((Get-Prop $m 'adbHook') -eq $true)
    $resPrefix = 'RESULT: '
    if ($hook) { $resPrefix = 'RESULT: TEST HOOK ' }
    $result = $resPrefix + 'OK'
    $exitCode = 0
    if ($noDataRows -gt 0) {
        $result = $resPrefix + 'NO DATA in ' + $noDataRows.ToString($script:Inv) + ' rows'
        $exitCode = 2
    }
    elseif ($dataRows -eq 0) {
        # Nothing was measured at all (empty stepsRequested, only informational steps): never "OK".
        $result = $resPrefix + 'NO DATA - no step produced a value'
        $exitCode = 2
    }
    # The switch state (batch perfb1toggle): a different state is exit 4; an unproven asked state is "no data".
    if ($fs.Problem -eq 'differs') {
        $result = $resPrefix + 'SWITCH STATE DIFFERS from the state asked with -Flags (exit 4)'
        $exitCode = 4
    }
    elseif ($fs.Problem -eq 'badasked') {
        $result = $resPrefix + 'SWITCH STATE NOT VALID: run.json flags.asked is not a state (exit 4)'
        $exitCode = 4
    }
    elseif ($fs.Problem -eq 'nodata') {
        if ($exitCode -eq 0) { $result = $resPrefix + 'NO DATA - the switch state asked with -Flags is not proven' }
        else { $result = $result + '; the switch state asked with -Flags is not proven' }
        $exitCode = 2
    }

    # --- summary.csv -------------------------------------------------------------------------------------------
    $csv = New-Object System.Text.StringBuilder
    [void]$csv.Append("step,metric,n,median,min,max,unit,note,files`n")
    foreach ($r in $rows) {
        $cells = @((Protect-Csv $r.Step), (Protect-Csv $r.Metric), $r.N, $r.Median, $r.Min, $r.Max, (Protect-Csv $r.Unit), (Protect-Csv $r.Note), (Protect-Csv $r.Files))
        $out = New-Object System.Collections.Generic.List[string]
        foreach ($cell in $cells) { $out.Add((Format-CsvCell ([string]$cell))) }
        [void]$csv.Append(($out.ToArray() -join ',') + "`n")
    }

    # --- summary.md --------------------------------------------------------------------------------------------
    $device = Get-Prop $m 'device'
    $app = Get-Prop $m 'app'
    $fld = {
        param($v, [int]$max)
        $t = Format-Safe $v $max
        if ($t.Length -eq 0) { return '`not in run.json`' }
        return (Format-Span $t)
    }
    $ver = (& $fld (Get-Prop $app 'versionName') 40)
    $verCode = Format-Safe (Get-Prop $app 'versionCode') 20
    if ($verCode.Length -gt 0) { $ver = $ver + ' (' + (Format-Span $verCode) + ')' }
    $md = New-Object System.Text.StringBuilder
    [void]$md.Append("# Device walk summary`n`n")
    if ($hook) { [void]$md.Append("TEST HOOK RUN - adb was replaced, these are NOT device numbers`n`n") }
    if (-not $finished) { [void]$md.Append("RUN NOT FINISHED`n`n") }
    [void]$md.Append('- Run: ' + (& $fld (Get-Prop $m 'run') 60) + "`n")
    [void]$md.Append('- Mode: ' + (& $fld (Get-Prop $m 'mode') 60) + "`n")
    [void]$md.Append('- Device model: ' + (& $fld (Get-Prop $device 'model') 60) + "`n")
    [void]$md.Append('- Android release: ' + (& $fld (Get-Prop $device 'release') 60) + "`n")
    [void]$md.Append('- App: ' + (& $fld (Get-Prop $app 'package') 60) + ', version ' + $ver + "`n")
    [void]$md.Append('- Repeats: ' + $repeats.ToString($script:Inv) + "`n")
    [void]$md.Append('- Refresh: ' + (& $fld (Get-Prop $device 'refresh') 60) + "`n")
    $dnd = Format-Safe (Get-Prop $device 'dnd') 20
    if ($dnd.Length -eq 0) { $dnd = 'unknown' }
    [void]$md.Append('- Do not disturb: ' + (Format-Span $dnd) + "`n")
    if ($fs.Problem -eq 'differs') { [void]$md.Append('- Switch state: DIFFERS - asked ' + (Format-Span $fs.Asked) + ' with -Flags, the app logged ' + (Format-Span $fs.Logged) + " (the run is not OK, exit 4)`n") }
    elseif ($fs.Problem -eq 'badasked') { [void]$md.Append("- Switch state: not valid (run.json flags.asked is not a state; the run is not OK, exit 4)`n") }
    elseif ($fs.Problem -eq 'nodata') { [void]$md.Append('- Switch state: not read (asked ' + (Format-Span $fs.Asked) + ' with -Flags, but ' + $fs.Why + ': the state is NOT proven)' + "`n") }
    elseif ($fs.Mode -eq 'asked') { [void]$md.Append('- Switch state: ' + (Format-Span $fs.Logged) + " (asked with -Flags; proven by the app's own [FLAGS] line)`n") }
    elseif ($fs.Mixed.Count -gt 1) { [void]$md.Append('- Switch state: mixed (no -Flags; the logs of this run hold more than one state: ' + (($fs.Mixed | ForEach-Object { Format-Span $_ }) -join '; ') + ")`n") }
    elseif ($fs.Logged -ne '') { [void]$md.Append('- Switch state: ' + (Format-Span $fs.Logged) + " (no -Flags; read from the app's own [FLAGS] line)`n") }
    else { [void]$md.Append("- Switch state: not read (no -Flags, and the run pulled no [FLAGS] line)`n") }
    if ($fs.Stop -ne '') { [void]$md.Append('- Switch run stopped: ' + $fs.Stop + "`n") }
    if ($withheld) { [void]$md.Append('- Numbers withheld: the switch state asked with -Flags is not proven or differs, so this run shows no number (every metric row is no data)' + "`n") }
    [void]$md.Append('- Parsed (PC time): ' + $now.ToString('yyyy-MM-dd HH:mm:ss', $script:Inv) + "`n`n")
    if (Test-Same $dnd 'off') { [void]$md.Append("Note: Do not disturb was off - a notification of another app can be in a screenshot`n`n") }
    [void]$md.Append($result + "`n`n")
    [void]$md.Append("| Step | Metric | n | Median | Min | Max | Unit | Note | Files |`n")
    [void]$md.Append("|---|---|---|---|---|---|---|---|---|`n")
    foreach ($r in $rows) {
        $cells = @((Format-Span $r.Step), $r.Metric, $r.N, $r.Median, $r.Min, $r.Max, $r.Unit, (Format-Span $r.Note), (Format-Span (Format-MdFiles $r.Files)))
        $out = New-Object System.Collections.Generic.List[string]
        foreach ($cell in $cells) { $out.Add((Format-MdCell ([string]$cell))) }
        [void]$md.Append('| ' + ($out.ToArray() -join ' | ') + " |`n")
    }
    [void]$md.Append("`nEvery metric is one value per rep (median / min / max over the reps); times are the phone clock.`n`n")
    [void]$md.Append("Legend`n`n")
    $legend = @(
        '- am TotalTime: `am start -W` TotalTime, from run.json (am.totalTime).',
        '- start -> first shell boot: own stamp of the first `[P1] shell boot <name> load=` line minus the rep t0.',
        '- first shell boot load=: the `load=` of that line.',
        '- start -> boot hold released: own stamp of the first `[P1] boot hold ms= why=` line minus t0; boot hold ms= is its `ms=`.',
        '- intent -> present: own stamp of the first `[P1] open singlechatpage present` line minus t0.',
        '- present ms=: the `ms=` of that line (the chat page is visible).',
        '- frames drop / frames max gap: `drop=` / `max=` of the first `[P1] frames open-singlechatpage n= drop= max=` line.',
        '- spare used: `[CDPERF] chat attach spare=1` (a ready spare was used) or `spare=0 why=...`; the note counts the 1s.',
        '- tap -> send dt=: `dt=` of the first `[P1] shell send chat dt=` line with dt >= 0.',
        '- scroll drops / scroll frames n: sums of `drop=` / `n=` over all `[P1] shell scroll <name> ms= n= drop= max=` lines of the rep; scroll max gap: the largest `max=`.',
        '- long tasks: count of `[P1] shell longtask <name> ms=` lines per rep (0 is a real value); longest long task: the largest `ms=` (no value for a rep without such a line).',
        '- app PSS / renderer PSS: `TOTAL PSS:` of the `dumpsys meminfo` file (fallback: first number of the TOTAL row); the sum is both.',
        '- network rows (t0 = phone stamp taken with `svc wifi enable`): wifi on -> first node connected = own stamp of the first `Network client connected to` line minus t0; wifi on -> first Hello = the first `Received Hello:` line (optional). The address after "connected to" is never copied.',
        '- Log files are filtered on the phone to timing lines (`[P1] `, `[CDPERF] `, `Starting Spixi`, `Network client connected to`, `Received Hello`, and the exact state line `[FLAGS] warmidle= sparerearm= sparekeep= noemptydetail=`); an empty file means nothing matched.',
        '- A rep window = lines whose own app stamp is >= the rep t0 and < the t0 of the next rep of the run. "no data" = a required value is missing for some rep; n/a = an optional value that no rep had.',
        '- chat info: t0 = the tap on the chat header; the rows read the first `[P1] open contactdetails present ms=` line, the first `[P1] frames open-contactdetails n= drop= max=` line and `[P1] shell send details dt=`.',
        '- tab-apps / tab-wallet / tab-account: t0 = the tap on the tab; `first=` of the shell line `[P1] shell tab-<name> first=` (ms from the tap to the second frame after the tab is shown, on the tap clock of the shell) and `drop=` / `max=` of `[P1] shell frames-tab-<name>`. Screenshots are taken only on the Chats tab.',
        '- history: t0 = the first swipe to older messages; older pages loaded = number of `[P1] chat load` lines in the rep (C# answers one page request each; at least 3 are required); first swipe -> 3rd page = own stamp of the third such line minus t0; the scroll and long-task rows as for scroll; swipes = from run.json. A visible jump is NOT measured (no log line shows it).',
        '- resume (unchanged since 2026-11-12): the chat tap goes 2 s after the resume. resume-now: at once (after the focus check). resume-3s: after 3 s. Neither new row replaces the resume row.',
        '- scroll-image: the scroll rows in a chat with images (opened by the notification intent with the address of the local key imageChatAddress).',
        '- Switch state: the four digits of the app''s own `[FLAGS] warmidle= sparerearm= sparekeep= noemptydetail=` line (printed re-built, never the raw line). With -Flags the flags pull must show the asked state (none = no data, exit 2) and no pulled log may show another (exit 4).'
    )
    foreach ($l in $legend) { [void]$md.Append($l + "`n") }
    # One note line per filewalk step, only for a step that is in this run (an old run prints none of them).
    $legendNew = [ordered]@{
        'scroll-files'  = '- scroll-files: the chat of the file seed (local key fileChatAddress), opened by the notification intent; t0 = before the intent; the open rows as for chat-intent (no spare, no send row); the scroll and long-task rows count only lines whose own stamp is >= stamp2 (the stamp before the first swipe) from run.json.'
        'scroll-voice'  = '- scroll-voice: the same rows for the chat of the voice seed (local key voiceChatAddress).'
        'scroll-photos' = '- scroll-photos: the same rows for the chat of the photo seed (local key photoChatAddress).'
        'viewer'        = '- viewer: t0 = the tap on the photo tile in the image chat; tap -> viewimage sent dt= = `dt=` of the first `[P1] shell send viewimage` line with dt >= 0; tap -> viewer shown first= = `first=` of the first `[P1] shell overlay-open` line with first >= 0 (-1 = no tap seen = no value); viewer frames = `drop=` / `max=` of the first `[P1] shell frames-overlay-open` line; close frames = the first `[P1] shell frames-overlay-close` line from stamp2 (the BACK) on.'
        'downloads'     = '- downloads: t0 = the tap on Downloads in the Account tab; tap -> loaddownloads sent dt= = `dt=` of the first `[P1] shell send loaddownloads` line with dt >= 0; tap -> list shown first= = `first=` of the first `[P1] shell subscreen-open` line with first >= 0; list frames = `drop=` / `max=` of the first `[P1] shell frames-subscreen-open` line; the scroll and long-task rows (`shell scroll` / `shell longtask` lines) count only lines from stamp2 (the first swipe) on.'
        'open-seed'     = '- open-seed k=<k>: the dev-seed chat of index k (0 = Seed 01), opened by the notification intent (address derived by the script); t0 = before the intent; the warm rows (n = repeats) come first, then the same rows prefixed `cold ` (one rep, after a proven restart of the app). intent -> present / present ms= / attach spare= as for chat-intent (required). Optional rows (n/a on a build without the line, never exit 2): onload-main ms= = `ms=` of the first `[P1] chat onload-main` line; read ms= / passes / rows = the first `[P1] chat read` line; batch json= = `json=` of the first `[CDPERF] chat batch` line; shell paint= / glass= = the first `[CDPERF] chat-shell n=` line; media thumbs / hit / pre / voice / vpre = the first `[P1] chat media` line (written once, 2 s after the present).'
        'mem-photos'    = '- mem-photos: the app and renderer PSS read last (after open-seed), as mem-end.'
    }
    foreach ($k in $legendNew.Keys) {
        if ($stepList.Contains([string]$k)) { [void]$md.Append($legendNew[$k] + "`n") }
    }
    [void]$md.Append("`nFiles`n`n")
    $seen = New-Object System.Collections.Generic.List[string]
    $fileLines = New-Object System.Collections.Generic.List[string]
    $addFile = {
        param($n, $expected)
        if ($null -eq $n) { return }
        $nm = [string]$n
        if ($nm.Length -eq 0) { return }
        # A manifest name is shown only when it equals the name derived for its own entry; else "(name refused)".
        if (($null -eq $expected) -or (-not (Test-Same $nm $expected))) {
            if (-not $seen.Contains('?invalid')) { $seen.Add('?invalid'); $fileLines.Add('- `(name refused)` missing') }
            return
        }
        if ($seen.Contains($nm)) { return }
        $seen.Add($nm)
        if (Test-Path -LiteralPath (Join-Path $runPath $nm) -PathType Leaf) { $fileLines.Add('- ' + (Format-Span $nm)) }
        else { $fileLines.Add('- ' + (Format-Span $nm) + ' missing') }
    }
    foreach ($r in $reps) {
        $rn = Get-Num (Get-Prop $r 'rep')
        $st = [string](Get-Prop $r 'step')
        & $addFile (Get-Prop $r 'log') (Get-RepFileName $st $rn 'log')
        & $addFile (Get-Prop $r 'shot') (Get-RepFileName $st $rn 'shot')
    }
    if ($fs.Mode -eq 'asked') { & $addFile $script:FlagsPullName $script:FlagsPullName }
    foreach ($me in $memEntries) {
        $ph = [string](Get-Prop $me 'phase')
        $expA = $null
        $expR = $null
        foreach ($known in @('home', 'end', 'trim', 'photos')) {
            if (Test-Same $ph $known) { $expA = 'meminfo-' + $known + '-app.txt'; $expR = 'meminfo-' + $known + '-renderer.txt' }
        }
        & $addFile (Get-Prop $me 'appFile') $expA
        & $addFile (Get-Prop $me 'rendererFile') $expR
    }
    if ($fileLines.Count -eq 0) { [void]$md.Append("- (none named in run.json)`n") }
    foreach ($l in $fileLines) { [void]$md.Append($l + "`n") }

    # --- write (only these two files) ------------------------------------------------------------------------
    $mdPath = Join-Path $runPath 'summary.md'
    $csvPath = Join-Path $runPath 'summary.csv'
    foreach ($target in @($mdPath, $csvPath)) {
        $item = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
        if ($null -ne $item) {
            if ((($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) -or $item.PSIsContainer) {
                Write-Host ('refused: ' + (Split-Path -Leaf $target) + ' exists and is a link or a folder')
                Write-Host 'RESULT: REFUSED TO WRITE (exit 3)'
                return 3
            }
        }
    }
    foreach ($target in @($mdPath, $csvPath)) {
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
    }
    Write-Utf8 $csvPath $csv.ToString()
    Write-Utf8 $mdPath $md.ToString()
    Write-Host $mdPath
    Write-Host $result
    return $exitCode
}

$code = 1
try {
    $code = Invoke-Main
}
catch {
    Write-Host ('adb-walk-parse failed: ' + $_.Exception.Message)
    Write-Host 'RESULT: PARSER ERROR (exit 1)'
    $code = 1
}
exit $code
