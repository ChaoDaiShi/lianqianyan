[CmdletBinding()]
param(
    [ValidateSet('127.0.0.1', '0.0.0.0')]
    [string]$HostAddress = '127.0.0.1',
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$apiRoot = Join-Path $packageRoot 'apps\api'
$webRoot = Join-Path $packageRoot 'web'
$genieRoot = Join-Path $packageRoot 'runtime\Genie-TTS'
$referenceAudio = Join-Path $packageRoot '.local\voice\cyrene-reference.wav'
$modelDirectory = Join-Path $genieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus'
$genieDataDirectory = Join-Path $genieRoot 'GenieData'
$dataDirectory = Join-Path $packageRoot 'data'
$logDirectory = Join-Path $packageRoot 'logs'
$apiPython = Join-Path $apiRoot '.venv\Scripts\python.exe'

foreach ($required in @(
    $apiPython,
    (Join-Path $webRoot 'index.html'),
    $referenceAudio,
    $modelDirectory,
    $genieDataDirectory
)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "运行资产缺失，请先执行 install.ps1：$required"
    }
}

New-Item -ItemType Directory -Path $dataDirectory, $logDirectory -Force | Out-Null
$databasePath = (Join-Path $dataDirectory 'education.db').Replace('\', '/')

$env:EDUCATION_DATABASE_URL = "sqlite:///$databasePath"
$env:EDUCATION_WEB_DIST_DIR = $webRoot
$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_GENIE_ROOT = $genieRoot
$env:EDUCATION_TTS_MODEL_DIR = $modelDirectory
$env:EDUCATION_TTS_GENIE_DATA_DIR = $genieDataDirectory
$env:EDUCATION_TTS_REFERENCE_AUDIO_PATH = $referenceAudio
$env:EDUCATION_TTS_REFERENCE_TEXT = '能在梦里听见朦胧的神谕。'
$env:EDUCATION_TTS_TIMEOUT = '60'
$env:EDUCATION_TTS_MAX_AUDIO_BYTES = '20000000'

Write-Output "EDUCATIONMIND_STARTING：http://127.0.0.1:$ApiPort/#/agent"
Push-Location -LiteralPath $apiRoot
try {
    & $apiPython '-m' 'uvicorn' 'app.main:app' '--host' $HostAddress '--port' ([string]$ApiPort) '--workers' '1'
    if ($LASTEXITCODE -ne 0) { throw "Education API 退出，代码：$LASTEXITCODE" }
}
finally {
    Pop-Location
}
