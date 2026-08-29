[CmdletBinding()]
param(
    [string]$SourceRoot = 'F:\gpt sovites 轻量级\Genie-TTS',
    [string]$EnginePackageRoot = '',
    [string]$ReferenceAudio = '',
    [string]$RuntimeRoot = '',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimeParent = Join-Path $projectRoot 'runtime'
# Target layout: runtime\genie-tts
if ([string]::IsNullOrWhiteSpace($EnginePackageRoot)) {
    $EnginePackageRoot = Join-Path $projectRoot 'apps\api\.venv\Lib\site-packages\genie_tts'
}
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
    $RuntimeRoot = Join-Path $runtimeParent 'genie-tts'
}
if ([string]::IsNullOrWhiteSpace($ReferenceAudio)) {
    $ReferenceAudio = Join-Path $projectRoot '.local\voice\cyrene-reference-clean.wav'
}

$expectedReferenceHash = 'EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1'
$modelRelativePath = 'Output\昔涟AI-GPT-SOVITS--V2proplus'
$requiredUpstreamFiles = @('pyproject.toml', 'requirements.txt', 'LICENSE')

function Assert-AbsoluteDirectory {
    param([string]$LiteralPath, [string]$Label)
    if (-not [System.IO.Path]::IsPathFullyQualified($LiteralPath)) {
        throw "$Label 必须使用绝对路径"
    }
    if (-not (Test-Path -LiteralPath $LiteralPath -PathType Container)) {
        throw "$Label 不存在：$LiteralPath"
    }
    return (Resolve-Path -LiteralPath $LiteralPath).Path
}

function Assert-AbsoluteFile {
    param([string]$LiteralPath, [string]$Label)
    if (-not [System.IO.Path]::IsPathFullyQualified($LiteralPath)) {
        throw "$Label 必须使用绝对路径"
    }
    if (-not (Test-Path -LiteralPath $LiteralPath -PathType Leaf)) {
        throw "$Label 不存在：$LiteralPath"
    }
    return (Resolve-Path -LiteralPath $LiteralPath).Path
}

function Assert-ChildPath {
    param([string]$Target, [string]$Parent)
    $resolvedTarget = [System.IO.Path]::GetFullPath($Target)
    $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
    if (-not $resolvedTarget.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "拒绝操作项目运行目录之外的路径：$resolvedTarget"
    }
}

function Copy-DirectoryContents {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "运行资产目录不存在：$Source"
    }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
    }
}

function Copy-EnginePackageContents {
    param([string]$Source, [string]$Destination)
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Get-ChildItem -LiteralPath $Source -Recurse -Force -File | ForEach-Object {
        $relative = [System.IO.Path]::GetRelativePath($Source, $_.FullName)
        $segments = $relative -split '[\\/]'
        if ('__pycache__' -notin $segments -and $_.Extension -notin @('.pyc', '.pyo')) {
            $target = Join-Path $Destination $relative
            New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }
    }
}

function Get-DirectorySummary {
    param([string]$LiteralPath)
    $files = @(Get-ChildItem -LiteralPath $LiteralPath -Recurse -File)
    return [ordered]@{
        files = $files.Count
        bytes = [long](($files | Measure-Object -Property Length -Sum).Sum)
    }
}

$resolvedSource = Assert-AbsoluteDirectory -LiteralPath $SourceRoot -Label 'Genie-TTS 来源目录'
$resolvedEnginePackage = Assert-AbsoluteDirectory -LiteralPath $EnginePackageRoot -Label '已锁定 Genie-TTS Python 包'
$resolvedReference = Assert-AbsoluteFile -LiteralPath $ReferenceAudio -Label '昔涟干净参考音频'
$resolvedRuntime = [System.IO.Path]::GetFullPath($RuntimeRoot)
Assert-ChildPath -Target $resolvedRuntime -Parent $runtimeParent

$sourceData = Join-Path $resolvedSource 'GenieData'
$sourceModel = Join-Path $resolvedSource $modelRelativePath
foreach ($path in @($sourceData, $sourceModel)) {
    if (-not (Test-Path -LiteralPath $path -PathType Container)) {
        throw "Genie-TTS 来源缺少必要目录：$path"
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedEnginePackage '__init__.py') -PathType Leaf)) {
    throw '已锁定 Genie-TTS Python 包缺少 __init__.py'
}
foreach ($name in $requiredUpstreamFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedSource $name) -PathType Leaf)) {
        throw "Genie-TTS 来源缺少必要文件：$name"
    }
}

$referenceHash = (Get-FileHash -LiteralPath $resolvedReference -Algorithm SHA256).Hash
if ($referenceHash -ne $expectedReferenceHash) {
    throw "昔涟参考音频校验失败：$referenceHash"
}

$modelSummary = Get-DirectorySummary -LiteralPath $sourceModel
if ($modelSummary.files -ne 9 -or $modelSummary.bytes -ne 335992804) {
    throw "昔涟 ONNX 模型清单不匹配：files=$($modelSummary.files) bytes=$($modelSummary.bytes)"
}

New-Item -ItemType Directory -Path $runtimeParent -Force | Out-Null
$staging = Join-Path $runtimeParent ('.genie-tts.staging.' + [Guid]::NewGuid().ToString('N'))
$backup = Join-Path $runtimeParent ('.genie-tts.backup.' + [Guid]::NewGuid().ToString('N'))
Assert-ChildPath -Target $staging -Parent $runtimeParent
Assert-ChildPath -Target $backup -Parent $runtimeParent
$readmeSource = Join-Path $resolvedRuntime 'README.md'
if (-not (Test-Path -LiteralPath $readmeSource -PathType Leaf)) {
    throw "项目运行区说明不存在：$readmeSource"
}

try {
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    Copy-Item -LiteralPath $readmeSource -Destination (Join-Path $staging 'README.md') -Force
    Copy-EnginePackageContents -Source $resolvedEnginePackage -Destination (Join-Path $staging 'src\genie_tts')
    Copy-DirectoryContents -Source $sourceData -Destination (Join-Path $staging 'GenieData')
    Copy-DirectoryContents -Source $sourceModel -Destination (Join-Path $staging $modelRelativePath)
    New-Item -ItemType Directory -Path (Join-Path $staging 'Reference') -Force | Out-Null
    Copy-Item -LiteralPath $resolvedReference -Destination (Join-Path $staging 'Reference\cyrene-reference.wav') -Force

    foreach ($name in $requiredUpstreamFiles) {
        Copy-Item -LiteralPath (Join-Path $resolvedSource $name) -Destination (Join-Path $staging $name) -Force
    }
    foreach ($readme in @('README.md', 'README_zh.md')) {
        $sourceReadme = Join-Path $resolvedSource $readme
        if (Test-Path -LiteralPath $sourceReadme -PathType Leaf) {
            $destinationName = if ($readme -eq 'README.md') { 'UPSTREAM_README.md' } else { 'UPSTREAM_README_zh.md' }
            Copy-Item -LiteralPath $sourceReadme -Destination (Join-Path $staging $destinationName) -Force
        }
    }

    $manifest = [ordered]@{
        format = 1
        engine = 'Genie-TTS'
        engine_version = '2.0.2'
        imported_at_utc = [DateTime]::UtcNow.ToString('o')
        source_directory_name = [System.IO.Path]::GetFileName($resolvedSource.TrimEnd('\'))
        engine_source_origin = 'apps/api/.venv installed genie-tts==2.0.2'
        engine_source = Get-DirectorySummary -LiteralPath (Join-Path $staging 'src')
        genie_data = Get-DirectorySummary -LiteralPath (Join-Path $staging 'GenieData')
        cyrene_model = Get-DirectorySummary -LiteralPath (Join-Path $staging $modelRelativePath)
        reference_audio = [ordered]@{
            file = 'Reference/cyrene-reference.wav'
            sha256 = $referenceHash
            prompt = '能在梦里听见朦胧的神谕。'
        }
    }
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $staging 'RUNTIME_MANIFEST.json') -Encoding utf8

    if (Test-Path -LiteralPath $resolvedRuntime) {
        if (-not $Force) {
            throw "项目 Genie-TTS 运行区已经存在；确认后使用 -Force：$resolvedRuntime"
        }
        Move-Item -LiteralPath $resolvedRuntime -Destination $backup
    }
    Move-Item -LiteralPath $staging -Destination $resolvedRuntime
    if (Test-Path -LiteralPath $backup) {
        Remove-Item -LiteralPath $backup -Recurse -Force
    }
}
catch {
    if (Test-Path -LiteralPath $staging) {
        Remove-Item -LiteralPath $staging -Recurse -Force
    }
    if ((Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $resolvedRuntime)) {
        Move-Item -LiteralPath $backup -Destination $resolvedRuntime
    }
    throw
}

$finalManifest = Get-Content -LiteralPath (Join-Path $resolvedRuntime 'RUNTIME_MANIFEST.json') -Raw | ConvertFrom-Json
Write-Output "PROJECT_GENIE_RUNTIME=$resolvedRuntime"
Write-Output "ENGINE_FILES=$($finalManifest.engine_source.files)"
Write-Output "GENIE_DATA_FILES=$($finalManifest.genie_data.files)"
Write-Output "MODEL_FILES=$($finalManifest.cyrene_model.files)"
Write-Output "REFERENCE_SHA256=$($finalManifest.reference_audio.sha256)"
