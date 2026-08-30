param(
    [ValidateSet('validate', 'start', 'status', 'stop')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $PSCommandPath
$Workspace = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir '..\..'))
$OutputRoot = [System.IO.Path]::GetFullPath((Join-Path $Workspace 'demo_video_20260830'))
$RuntimeRoot = [System.IO.Path]::GetFullPath((Join-Path $OutputRoot 'runtime'))
$SourceDatabase = [System.IO.Path]::GetFullPath((Join-Path $Workspace 'apps\api\education.db'))
$TargetDatabase = [System.IO.Path]::GetFullPath((Join-Path $RuntimeRoot 'demo-education.db'))
$StatePath = Join-Path $RuntimeRoot 'runtime-state.json'
$BackendPort = 8010
$FrontendPort = 5180
$BackendUrl = "http://127.0.0.1:$BackendPort"
$FrontendUrl = "http://127.0.0.1:$FrontendPort"

function Test-PathWithin {
    param([string]$Child, [string]$Parent)
    $parentWithSeparator = $Parent.TrimEnd('\') + '\'
    return $Child.StartsWith($parentWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-SafeConfiguration {
    $safe = (Test-PathWithin -Child $TargetDatabase -Parent $RuntimeRoot) -and
        (Test-PathWithin -Child $RuntimeRoot -Parent $OutputRoot) -and
        (Test-Path -LiteralPath $SourceDatabase -PathType Leaf)
    return [ordered]@{
        workspace = $Workspace
        outputRoot = $OutputRoot
        runtimeRoot = $RuntimeRoot
        sourceDatabase = $SourceDatabase
        targetDatabase = $TargetDatabase
        backendPort = $BackendPort
        frontendPort = $FrontendPort
        backendUrl = $BackendUrl
        frontendUrl = $FrontendUrl
        safe = $safe
    }
}

function Wait-HttpReady {
    param([string]$Url, [int]$Seconds = 45)
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $response.StatusCode
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for $Url"
}

function Get-ProcessSnapshot {
    param([int]$ProcessId)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return $null
    }
    return [ordered]@{
        pid = [int]$process.ProcessId
        parentPid = [int]$process.ParentProcessId
        name = $process.Name
        commandLine = $process.CommandLine
    }
}

function Stop-ValidatedProcessTree {
    param([int]$ProcessId, [string]$ExpectedPattern, [switch]$ValidatedDescendant)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return
    }
    if ((-not $ValidatedDescendant) -and ($process.CommandLine -notmatch $ExpectedPattern)) {
        throw "Refusing to stop PID $ProcessId because it is not a demo process"
    }
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ValidatedProcessTree -ProcessId ([int]$child.ProcessId) -ExpectedPattern $ExpectedPattern -ValidatedDescendant
    }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

$configuration = Get-SafeConfiguration
if (-not $configuration.safe) {
    throw 'Resolved demo runtime paths are unsafe or the source database is missing'
}

if ($Action -eq 'validate') {
    $configuration | ConvertTo-Json -Depth 4
    exit 0
}

if ($Action -eq 'start') {
    if (Test-Path -LiteralPath $StatePath) {
        throw "Demo runtime state already exists at $StatePath; run -Action stop first"
    }

    New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
    Copy-Item -LiteralPath $SourceDatabase -Destination $TargetDatabase
    $sourceHashBefore = (Get-FileHash -LiteralPath $SourceDatabase -Algorithm SHA256).Hash

    $python = [System.IO.Path]::GetFullPath((Join-Path $Workspace 'apps\api\.venv\Scripts\python.exe'))
    if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
        throw "Backend Python runtime is missing: $python"
    }
    $pnpmCommand = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $pnpmCommand) {
        $pnpmCommand = (Get-Command pnpm -ErrorAction Stop).Source
    }

    $savedEnvironment = @{}
    foreach ($name in @('EDUCATION_DATABASE_URL', 'EDUCATION_CAPTCHA_MODE', 'EDUCATION_CORS_ORIGINS', 'EDUCATION_AUTH_COOKIE_SECURE', 'EDUCATION_API_URL')) {
        $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }

    try {
        $databaseUrlPath = $TargetDatabase.Replace('\', '/')
        $env:EDUCATION_DATABASE_URL = "sqlite:///$databaseUrlPath"
        $env:EDUCATION_CAPTCHA_MODE = 'off'
        $env:EDUCATION_CORS_ORIGINS = $FrontendUrl
        $env:EDUCATION_AUTH_COOKIE_SECURE = 'false'
        $backend = Start-Process -FilePath $python `
            -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', "$BackendPort", '--workers', '1') `
            -WorkingDirectory (Join-Path $Workspace 'apps\api') `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $RuntimeRoot 'backend.stdout.log') `
            -RedirectStandardError (Join-Path $RuntimeRoot 'backend.stderr.log') `
            -PassThru

        $env:EDUCATION_API_URL = $BackendUrl
        $frontend = Start-Process -FilePath $pnpmCommand `
            -ArgumentList @('dev', '--host', '127.0.0.1', '--port', "$FrontendPort", '--strictPort') `
            -WorkingDirectory $Workspace `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $RuntimeRoot 'frontend.stdout.log') `
            -RedirectStandardError (Join-Path $RuntimeRoot 'frontend.stderr.log') `
            -PassThru
    }
    finally {
        foreach ($name in $savedEnvironment.Keys) {
            [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
        }
    }

    try {
        $backendStatus = Wait-HttpReady -Url "$BackendUrl/api/health"
        $frontendStatus = Wait-HttpReady -Url $FrontendUrl
    }
    catch {
        Stop-ValidatedProcessTree -ProcessId $frontend.Id -ExpectedPattern "$FrontendPort|pnpm|vite"
        Stop-ValidatedProcessTree -ProcessId $backend.Id -ExpectedPattern "$BackendPort|uvicorn"
        throw
    }

    $state = [ordered]@{
        startedAt = (Get-Date).ToUniversalTime().ToString('o')
        sourceDatabase = $SourceDatabase
        sourceDatabaseSha256 = $sourceHashBefore
        targetDatabase = $TargetDatabase
        backend = Get-ProcessSnapshot -ProcessId $backend.Id
        frontend = Get-ProcessSnapshot -ProcessId $frontend.Id
        backendUrl = $BackendUrl
        frontendUrl = $FrontendUrl
        backendStatus = $backendStatus
        frontendStatus = $frontendStatus
    }
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $StatePath -Encoding UTF8
    $state | ConvertTo-Json -Depth 6
    exit 0
}

if ($Action -eq 'status') {
    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
        [ordered]@{ running = $false; statePath = $StatePath } | ConvertTo-Json
        exit 0
    }
    $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    $backendProcess = Get-ProcessSnapshot -ProcessId ([int]$state.backend.pid)
    $frontendProcess = Get-ProcessSnapshot -ProcessId ([int]$state.frontend.pid)
    $backendReady = $false
    $frontendReady = $false
    try { $backendReady = (Invoke-WebRequest -Uri "$BackendUrl/api/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch {}
    try { $frontendReady = (Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch {}
    [ordered]@{
        running = ($null -ne $backendProcess) -and ($null -ne $frontendProcess) -and $backendReady -and $frontendReady
        backendReady = $backendReady
        frontendReady = $frontendReady
        backend = $backendProcess
        frontend = $frontendProcess
        statePath = $StatePath
    } | ConvertTo-Json -Depth 5
    exit 0
}

if ($Action -eq 'stop') {
    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
        [ordered]@{ stopped = $true; reason = 'no-state' } | ConvertTo-Json
        exit 0
    }
    $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    Stop-ValidatedProcessTree -ProcessId ([int]$state.frontend.pid) -ExpectedPattern "$FrontendPort|pnpm|vite"
    Stop-ValidatedProcessTree -ProcessId ([int]$state.backend.pid) -ExpectedPattern "$BackendPort|uvicorn"
    $sourceHashAfter = (Get-FileHash -LiteralPath $SourceDatabase -Algorithm SHA256).Hash
    if ($sourceHashAfter -ne $state.sourceDatabaseSha256) {
        throw 'The source database changed while the demo runtime was active'
    }
    Remove-Item -LiteralPath $StatePath
    [ordered]@{
        stopped = $true
        sourceDatabaseUnchanged = $true
        sourceDatabaseSha256 = $sourceHashAfter
    } | ConvertTo-Json
    exit 0
}
