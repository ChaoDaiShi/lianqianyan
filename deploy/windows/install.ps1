[CmdletBinding()]
param(
    [string]$PythonLauncher = 'py'
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$apiRoot = Join-Path $packageRoot 'apps\api'
$genieRoot = Join-Path $packageRoot 'runtime\Genie-TTS'
$apiEnvironment = Join-Path $apiRoot '.venv'

foreach ($required in @(
    (Join-Path $apiRoot 'pyproject.toml'),
    (Join-Path $genieRoot 'pyproject.toml'),
    (Join-Path $genieRoot 'GenieData'),
    (Join-Path $genieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus'),
    (Join-Path $packageRoot '.local\voice\cyrene-reference.wav')
)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "正式包缺少必需资产：$required"
    }
}

if (-not (Test-Path -LiteralPath $apiEnvironment)) {
    & $PythonLauncher '-3' '-m' 'venv' $apiEnvironment
    if ($LASTEXITCODE -ne 0) { throw 'Education API 虚拟环境创建失败' }
}

$apiPython = Join-Path $apiEnvironment 'Scripts\python.exe'
& $apiPython '-m' 'pip' 'install' '--disable-pip-version-check' '-e' $genieRoot
if ($LASTEXITCODE -ne 0) { throw 'Genie-TTS 依赖安装失败' }
& $apiPython '-m' 'pip' 'install' '--disable-pip-version-check' '-e' $apiRoot
if ($LASTEXITCODE -ne 0) { throw 'Education API 依赖安装失败' }

Push-Location -LiteralPath $apiRoot
try {
    & $apiPython '-c' 'import genie_tts; from app.main import app; print(f"{app.title}; genie_tts=embedded")'
    if ($LASTEXITCODE -ne 0) { throw '内嵌昔涟语音运行时导入校验失败' }
}
finally {
    Pop-Location
}

Write-Output 'INSTALLATION_READY：单一 Python 环境和内嵌昔涟语音运行时已安装。'
