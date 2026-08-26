[CmdletBinding()]
param(
    [ValidateSet('127.0.0.1', '0.0.0.0')]
    [string]$HostAddress = '127.0.0.1',
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,
    [ValidateRange(1, 65535)]
    [int]$SidecarPort = 9881
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$apiRoot = Join-Path $packageRoot 'apps\api'
$webRoot = Join-Path $packageRoot 'web'
$genieRoot = Join-Path $packageRoot 'runtime\Genie-TTS'
$referenceAudio = Join-Path $packageRoot '.local\voice\cyrene-reference.wav'
$modelDirectory = Join-Path $genieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus'
$dataDirectory = Join-Path $packageRoot 'data'
$logDirectory = Join-Path $packageRoot 'logs'
$apiPython = Join-Path $apiRoot '.venv\Scripts\python.exe'
$geniePython = Join-Path $genieRoot '.venv\Scripts\python.exe'

foreach ($required in @($apiPython, $geniePython, (Join-Path $webRoot 'index.html'), $referenceAudio, $modelDirectory)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "运行资产缺失，请先执行 install.ps1：$required"
    }
}

New-Item -ItemType Directory -Path $dataDirectory, $logDirectory -Force | Out-Null
$databasePath = (Join-Path $dataDirectory 'education.db').Replace('\', '/')

$env:GENIE_DATA_DIR = Join-Path $genieRoot 'GenieData'
$env:GENIE_SIDECAR_MODEL_DIR = $modelDirectory
$env:GENIE_SIDECAR_REFERENCE_AUDIO = $referenceAudio
$env:GENIE_SIDECAR_REFERENCE_TEXT = '能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。'
$env:GENIE_SIDECAR_HOST = '127.0.0.1'
$env:GENIE_SIDECAR_PORT = [string]$SidecarPort
$env:GENIE_SIDECAR_MAX_AUDIO_BYTES = '20000000'

$env:EDUCATION_DATABASE_URL = "sqlite:///$databasePath"
$env:EDUCATION_WEB_DIST_DIR = $webRoot
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_BASE_URL = "http://127.0.0.1:$SidecarPort"
$env:EDUCATION_TTS_TIMEOUT = '60'
$env:EDUCATION_TTS_MAX_AUDIO_BYTES = '20000000'

$sidecarOutput = Join-Path $logDirectory 'genie-sidecar.out.log'
$sidecarError = Join-Path $logDirectory 'genie-sidecar.err.log'
$sidecar = Start-Process -FilePath $geniePython `
    -ArgumentList @('-m', 'uvicorn', 'app.voice.genie_sidecar:create_app', '--factory', '--host', '127.0.0.1', '--port', [string]$SidecarPort, '--workers', '1') `
    -WorkingDirectory $apiRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $sidecarOutput `
    -RedirectStandardError $sidecarError `
    -PassThru

try {
    $sidecarReady = $false
    for ($attempt = 0; $attempt -lt 120; $attempt += 1) {
        if ($sidecar.HasExited) { throw "Genie-TTS 侧车提前退出，代码：$($sidecar.ExitCode)" }
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$SidecarPort/health" -TimeoutSec 2
            if ($health.ready -eq $true) { $sidecarReady = $true; break }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $sidecarReady) { throw 'Genie-TTS 侧车在 60 秒内未就绪' }

    Write-Output "EDUCATIONMIND_READY：http://127.0.0.1:$ApiPort/#/agent"
    Push-Location -LiteralPath $apiRoot
    try {
        & $apiPython '-m' 'uvicorn' 'app.main:app' '--host' $HostAddress '--port' ([string]$ApiPort) '--workers' '1'
        if ($LASTEXITCODE -ne 0) { throw "Education API 退出，代码：$LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
}
finally {
    if (-not $sidecar.HasExited) {
        Stop-Process -Id $sidecar.Id -Force -ErrorAction SilentlyContinue
        $sidecar.WaitForExit(5000) | Out-Null
    }
}
