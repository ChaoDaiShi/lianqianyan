[CmdletBinding()]
param(
    [string]$GenieRoot = 'F:\gpt sovites 轻量级\Genie-TTS',
    [string]$ModelDirectory = '',
    [string]$ReferenceAudio = '',
    [ValidateRange(1, 65535)]
    [int]$SidecarPort = 9881,
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,
    [ValidateRange(1, 65535)]
    [int]$WebPort = 5173,
    [string]$DatabasePath = '',
    [ValidateRange(5, 600)]
    [int]$StartupTimeoutSeconds = 120,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-StrictMode -Version Latest

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class EducationMindCyreneProcessJob
{
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int informationClass,
        IntPtr information,
        uint informationLength
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    public static IntPtr CreateKillOnCloseJob()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        var information = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        information.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(information);
        IntPtr pointer = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(information, pointer, false);
            if (!SetInformationJobObject(job, 9, pointer, (uint)length))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            return job;
        }
        catch
        {
            CloseHandle(job);
            throw;
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }

    public static void Assign(IntPtr job, IntPtr process)
    {
        bool alreadyAssigned;
        if (!IsProcessInJob(process, job, out alreadyAssigned))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        if (alreadyAssigned)
        {
            return;
        }
        if (!AssignProcessToJobObject(job, process))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
    }

    public static void Close(IntPtr job)
    {
        if (job != IntPtr.Zero && !CloseHandle(job))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
    }
}
'@

function Resolve-RequiredDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LiteralPath,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $item = Get-Item -LiteralPath $LiteralPath -ErrorAction Stop
    if (-not $item.PSIsContainer) {
        throw "$Label 不是目录"
    }
    return $item.FullName
}

function Resolve-RequiredFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LiteralPath,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $item = Get-Item -LiteralPath $LiteralPath -ErrorAction Stop
    if ($item.PSIsContainer) {
        throw "$Label 不是文件"
    }
    return $item.FullName
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $connections = @(
        Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    )
    if ($connections.Count -gt 0) {
        throw "$Label 端口已被其他进程占用：$Port"
    }
}

function ConvertTo-QuotedProcessArgument {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Value.Contains('"')) {
        throw '进程参数不能包含双引号'
    }
    return '"' + $Value + '"'
}

function Start-HiddenProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$StandardOutputPath,
        [Parameter(Mandatory = $true)]
        [string]$StandardErrorPath,
        [Parameter(Mandatory = $true)]
        [IntPtr]$JobHandle
    )

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StandardOutputPath `
        -RedirectStandardError $StandardErrorPath `
        -PassThru
    try {
        [EducationMindCyreneProcessJob]::Assign($JobHandle, $process.Handle)
        return $process
    }
    catch {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        throw
    }
}

function Add-ProcessTreeToJob {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId,
        [Parameter(Mandatory = $true)]
        [IntPtr]$JobHandle
    )

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return
    }
    [EducationMindCyreneProcessJob]::Assign($JobHandle, $process.Handle)

    $children = @(
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    )
    foreach ($child in $children) {
        Add-ProcessTreeToJob -ProcessId ([int]$child.ProcessId) -JobHandle $JobHandle
    }
}

function Stop-ProcessTree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $children = @(
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    )
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId ([int]$child.ProcessId)
    }

    if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Wait-HttpCondition {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,
        [Parameter(Mandatory = $true)]
        [System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds,
        [Parameter(Mandatory = $true)]
        [string]$StandardOutputPath,
        [Parameter(Mandatory = $true)]
        [string]$StandardErrorPath
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            throw "$Label 提前退出。日志：$StandardOutputPath；$StandardErrorPath"
        }

        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200 -and (& $Condition $response)) {
                return
            }
        }
        catch {
            # Readiness polling intentionally tolerates connection errors until the deadline.
        }
        Start-Sleep -Milliseconds 250
    }

    throw "$Label 在 $TimeoutSeconds 秒内未就绪。日志：$StandardOutputPath；$StandardErrorPath"
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiDirectory = Resolve-RequiredDirectory -LiteralPath (Join-Path $projectRoot 'apps\api') -Label 'Education API 目录'
$genieLauncher = Resolve-RequiredFile -LiteralPath (Join-Path $apiDirectory 'scripts\start_genie_voice.ps1') -Label 'Genie-TTS 启动器'
$apiPython = Resolve-RequiredFile -LiteralPath (Join-Path $apiDirectory '.venv\Scripts\python.exe') -Label 'Education API Python'
$resolvedGenieRoot = Resolve-RequiredDirectory -LiteralPath $GenieRoot -Label 'Genie-TTS 根目录'

if ([string]::IsNullOrWhiteSpace($ModelDirectory)) {
    $ModelDirectory = Join-Path $resolvedGenieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus'
}
if ([string]::IsNullOrWhiteSpace($ReferenceAudio)) {
    $ReferenceAudio = Join-Path $projectRoot '.local\voice\cyrene-reference.wav'
}
if ([string]::IsNullOrWhiteSpace($DatabasePath)) {
    $DatabasePath = Join-Path $projectRoot '.local\runtime\education.db'
}

$resolvedModelDirectory = Resolve-RequiredDirectory -LiteralPath $ModelDirectory -Label '昔涟 ONNX 模型目录'
$resolvedReferenceAudio = Resolve-RequiredFile -LiteralPath $ReferenceAudio -Label '昔涟参考音频'
if (-not [System.IO.Path]::IsPathRooted($DatabasePath)) {
    throw 'Education API 数据库必须使用绝对路径'
}
$resolvedDatabasePath = [System.IO.Path]::GetFullPath($DatabasePath)

if (($SidecarPort -eq $ApiPort) -or ($SidecarPort -eq $WebPort) -or ($ApiPort -eq $WebPort)) {
    throw '侧车、API 与网站端口必须互不相同'
}

Assert-PortAvailable -Port $SidecarPort -Label 'Genie-TTS 侧车'
Assert-PortAvailable -Port $ApiPort -Label 'Education API'
Assert-PortAvailable -Port $WebPort -Label 'Vite 网站'

& $genieLauncher `
    -GenieRoot $resolvedGenieRoot `
    -ModelDirectory $resolvedModelDirectory `
    -ReferenceAudio $resolvedReferenceAudio `
    -Port $SidecarPort `
    -ValidateOnly

Push-Location -LiteralPath $apiDirectory
try {
    & $apiPython -c 'import fastapi, uvicorn; from app.main import app; assert app.title; print("validated education_api=ok")'
    if ($LASTEXITCODE -ne 0) {
        throw 'Education API 运行时校验失败'
    }
}
finally {
    Pop-Location
}

$pnpmCommand = Get-Command 'pnpm.cmd' -ErrorAction Stop
$webUrl = "http://127.0.0.1:$WebPort"
$sidecarUrl = "http://127.0.0.1:$SidecarPort"
$apiUrl = "http://127.0.0.1:$ApiPort"

if ($ValidateOnly) {
    Write-Output '昔涟语音网站运行环境校验通过'
    Write-Output "sidecar=$sidecarUrl"
    Write-Output "api=$apiUrl"
    Write-Output "web=$webUrl/#/agent"
    Write-Output "database=$resolvedDatabasePath"
    return
}

$databaseDirectory = Split-Path -Parent $resolvedDatabasePath
$logDirectory = Join-Path $projectRoot '.logs'
[System.IO.Directory]::CreateDirectory($databaseDirectory) | Out-Null
[System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sidecarOutputLog = Join-Path $logDirectory "cyrene-sidecar-$timestamp.out.log"
$sidecarErrorLog = Join-Path $logDirectory "cyrene-sidecar-$timestamp.err.log"
$apiOutputLog = Join-Path $logDirectory "education-api-$timestamp.out.log"
$apiErrorLog = Join-Path $logDirectory "education-api-$timestamp.err.log"
$webOutputLog = Join-Path $logDirectory "education-web-$timestamp.out.log"
$webErrorLog = Join-Path $logDirectory "education-web-$timestamp.err.log"

$sidecarProcess = $null
$apiProcess = $null
$webProcess = $null
$processJobHandle = [EducationMindCyreneProcessJob]::CreateKillOnCloseJob()

try {
    $powerShellExecutable = (Get-Process -Id $PID).Path
    $sidecarArguments = @(
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        (ConvertTo-QuotedProcessArgument $genieLauncher),
        '-GenieRoot',
        (ConvertTo-QuotedProcessArgument $resolvedGenieRoot),
        '-ModelDirectory',
        (ConvertTo-QuotedProcessArgument $resolvedModelDirectory),
        '-ReferenceAudio',
        (ConvertTo-QuotedProcessArgument $resolvedReferenceAudio),
        '-Port',
        [string]$SidecarPort
    )
    $sidecarProcess = Start-HiddenProcess `
        -FilePath $powerShellExecutable `
        -ArgumentList $sidecarArguments `
        -WorkingDirectory $projectRoot `
        -StandardOutputPath $sidecarOutputLog `
        -StandardErrorPath $sidecarErrorLog `
        -JobHandle $processJobHandle

    Wait-HttpCondition `
        -Uri "$sidecarUrl/health" `
        -Process $sidecarProcess `
        -Condition {
            param($response)
            $status = $response.Content | ConvertFrom-Json
            return $status.ready -eq $true -and $status.runtime -eq 'genie_tts'
        } `
        -Label 'Genie-TTS 侧车' `
        -TimeoutSeconds $StartupTimeoutSeconds `
        -StandardOutputPath $sidecarOutputLog `
        -StandardErrorPath $sidecarErrorLog
    Add-ProcessTreeToJob -ProcessId $sidecarProcess.Id -JobHandle $processJobHandle

    $databaseUrlPath = $resolvedDatabasePath.Replace('\', '/')
    $env:EDUCATION_DATABASE_URL = "sqlite:///$databaseUrlPath"
    $env:EDUCATION_TTS_PROVIDER = 'genie'
    $env:EDUCATION_TTS_BASE_URL = $sidecarUrl
    $env:EDUCATION_TTS_TIMEOUT = '60'
    $env:EDUCATION_TTS_MAX_AUDIO_BYTES = '20000000'
    $env:EDUCATION_API_URL = $apiUrl

    $apiArguments = @(
        '-m',
        'uvicorn',
        'app.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        [string]$ApiPort
    )
    $apiProcess = Start-HiddenProcess `
        -FilePath $apiPython `
        -ArgumentList $apiArguments `
        -WorkingDirectory $apiDirectory `
        -StandardOutputPath $apiOutputLog `
        -StandardErrorPath $apiErrorLog `
        -JobHandle $processJobHandle

    Wait-HttpCondition `
        -Uri "$apiUrl/api/voice/status" `
        -Process $apiProcess `
        -Condition {
            param($response)
            $status = $response.Content | ConvertFrom-Json
            return $status.configured -eq $true -and $status.provider -eq 'genie_tts'
        } `
        -Label 'Education API' `
        -TimeoutSeconds $StartupTimeoutSeconds `
        -StandardOutputPath $apiOutputLog `
        -StandardErrorPath $apiErrorLog
    Add-ProcessTreeToJob -ProcessId $apiProcess.Id -JobHandle $processJobHandle

    $webArguments = @(
        'dev',
        '--host',
        '127.0.0.1',
        '--port',
        [string]$WebPort,
        '--strictPort'
    )
    $webProcess = Start-HiddenProcess `
        -FilePath $pnpmCommand.Source `
        -ArgumentList $webArguments `
        -WorkingDirectory $projectRoot `
        -StandardOutputPath $webOutputLog `
        -StandardErrorPath $webErrorLog `
        -JobHandle $processJobHandle

    Wait-HttpCondition `
        -Uri "$webUrl/#/agent" `
        -Process $webProcess `
        -Condition { param($response) return $response.Content -match '<div id="root"></div>' } `
        -Label 'Vite 网站' `
        -TimeoutSeconds $StartupTimeoutSeconds `
        -StandardOutputPath $webOutputLog `
        -StandardErrorPath $webErrorLog
    Add-ProcessTreeToJob -ProcessId $webProcess.Id -JobHandle $processJobHandle

    Write-Output 'CYRENE_WEB_READY'
    Write-Output "昔涟语音网站：$webUrl/#/agent"
    Write-Output "语音状态：$webUrl/api/voice/status"
    Write-Output "运行数据库：$resolvedDatabasePath"
    Write-Output "日志目录：$logDirectory"
    Write-Output '按 Ctrl+C 停止本轮网站、API 与语音侧车。'

    while ($true) {
        foreach ($ownedProcess in @($sidecarProcess, $apiProcess, $webProcess)) {
            $ownedProcess.Refresh()
            if ($ownedProcess.HasExited) {
                throw "运行进程意外退出：PID $($ownedProcess.Id)"
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    if ($null -ne $webProcess) {
        Stop-ProcessTree -ProcessId $webProcess.Id
    }
    if ($null -ne $apiProcess) {
        Stop-ProcessTree -ProcessId $apiProcess.Id
    }
    if ($null -ne $sidecarProcess) {
        Stop-ProcessTree -ProcessId $sidecarProcess.Id
    }
    if ($processJobHandle -ne [IntPtr]::Zero) {
        [EducationMindCyreneProcessJob]::Close($processJobHandle)
        $processJobHandle = [IntPtr]::Zero
    }
}
