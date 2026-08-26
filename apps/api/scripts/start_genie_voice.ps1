[CmdletBinding()]
param(
    [string]$GenieRoot = 'F:\gpt sovites 轻量级\Genie-TTS',
    [string]$ModelDirectory = '',
    [string]$ReferenceAudio = '',
    [string]$ReferenceText = '能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。',
    [ValidateRange(1, 65535)]
    [int]$Port = 9881,
    [string]$HostAddress = '127.0.0.1',
    [ValidateRange(44, 100000000)]
    [int]$MaxAudioBytes = 20000000,
    [switch]$ValidateOnly,
    [switch]$PrintEducationEnvironment
)

$ErrorActionPreference = 'Stop'

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

$normalizedHost = $HostAddress.Trim().ToLowerInvariant()
if ($normalizedHost -notin @('127.0.0.1', 'localhost', '::1')) {
    throw 'Genie-TTS 侧车只允许监听回环地址'
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$resolvedGenieRoot = Resolve-RequiredDirectory -LiteralPath $GenieRoot -Label 'Genie-TTS 根目录'

if ([string]::IsNullOrWhiteSpace($ModelDirectory)) {
    $ModelDirectory = Join-Path $resolvedGenieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus'
}
if ([string]::IsNullOrWhiteSpace($ReferenceAudio)) {
    $ReferenceAudio = Join-Path $projectRoot '.local\voice\cyrene-reference.wav'
}

$resolvedModelDirectory = Resolve-RequiredDirectory -LiteralPath $ModelDirectory -Label '昔涟 ONNX 模型目录'
$resolvedGenieData = Resolve-RequiredDirectory -LiteralPath (Join-Path $resolvedGenieRoot 'GenieData') -Label 'GenieData 目录'
$resolvedReferenceAudio = Resolve-RequiredFile -LiteralPath $ReferenceAudio -Label '昔涟参考音频'
$geniePython = Resolve-RequiredFile -LiteralPath (Join-Path $resolvedGenieRoot '.venv\Scripts\python.exe') -Label 'Genie-TTS Python'
$apiDirectory = Resolve-RequiredDirectory -LiteralPath (Join-Path $projectRoot 'apps\api') -Label 'Education API 目录'

if ([string]::IsNullOrWhiteSpace($ReferenceText)) {
    throw '昔涟参考文本不能为空'
}

$env:GENIE_DATA_DIR = $resolvedGenieData
$env:GENIE_SIDECAR_MODEL_DIR = $resolvedModelDirectory
$env:GENIE_SIDECAR_REFERENCE_AUDIO = $resolvedReferenceAudio
$env:GENIE_SIDECAR_REFERENCE_TEXT = $ReferenceText.Trim()
$env:GENIE_SIDECAR_HOST = $normalizedHost
$env:GENIE_SIDECAR_PORT = [string]$Port
$env:GENIE_SIDECAR_MAX_AUDIO_BYTES = [string]$MaxAudioBytes

$env:EDUCATION_TTS_PROVIDER = 'genie'
$env:EDUCATION_TTS_BASE_URL = "http://${normalizedHost}:$Port"
$env:EDUCATION_TTS_TIMEOUT = '60'
$env:EDUCATION_TTS_MAX_AUDIO_BYTES = [string]$MaxAudioBytes

if ($PrintEducationEnvironment) {
    Write-Output "`$env:EDUCATION_TTS_PROVIDER = 'genie'"
    Write-Output "`$env:EDUCATION_TTS_BASE_URL = '$($env:EDUCATION_TTS_BASE_URL)'"
    Write-Output "`$env:EDUCATION_TTS_TIMEOUT = '60'"
    Write-Output "`$env:EDUCATION_TTS_MAX_AUDIO_BYTES = '$MaxAudioBytes'"
}

Push-Location -LiteralPath $apiDirectory
try {
    & $geniePython -c 'import os; from pathlib import Path; from app.voice.cyrene_genie_manifest import validate_genie_assets; report = validate_genie_assets(Path(os.environ["GENIE_SIDECAR_MODEL_DIR"]), Path(os.environ["GENIE_SIDECAR_REFERENCE_AUDIO"]), Path(os.environ["GENIE_DATA_DIR"])); print(f"validated model_files={report.model_file_count} model_bytes={report.model_bytes} runtime_resources={report.runtime_resource_count} reference_sha256={report.reference_sha256}")'
    if ($LASTEXITCODE -ne 0) {
        throw '昔涟 Genie-TTS 资产校验失败'
    }

    if ($ValidateOnly) {
        Write-Output "Genie-TTS 配置校验通过：$normalizedHost`:$Port"
        return
    }

    Write-Output "正在启动昔涟 Genie-TTS：http://${normalizedHost}:$Port"
    & $geniePython -m uvicorn 'app.voice.genie_sidecar:create_app' '--factory' '--host' $normalizedHost '--port' ([string]$Port) '--workers' '1'
    if ($LASTEXITCODE -ne 0) {
        throw "Genie-TTS 侧车退出，代码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
