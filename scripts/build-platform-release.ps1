[CmdletBinding()]
param(
    [ValidateSet('All', 'Platform', 'Full')]
    [string]$Edition = 'All',
    [string]$Version = '',
    [string]$OutputDirectory = '',
    [string]$GenieRoot = 'F:\gpt sovites 轻量级\Genie-TTS',
    [switch]$SkipBuild,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $projectRoot 'release'
}
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

if ([string]::IsNullOrWhiteSpace($Version)) {
    $packageMetadata = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    $Version = [string]$packageMetadata.version
}
if ($Version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw '发布版本号格式无效'
}

function Assert-ChildPath {
    param([string]$Target, [string]$Parent)
    $resolvedTarget = [System.IO.Path]::GetFullPath($Target)
    $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
    if (-not $resolvedTarget.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "拒绝操作输出目录之外的路径：$resolvedTarget"
    }
}

function Reset-Target {
    param([string]$Target)
    Assert-ChildPath -Target $Target -Parent $outputRoot
    if (Test-Path -LiteralPath $Target) {
        if (-not $Force) { throw "目标已存在；确认版本后使用 -Force：$Target" }
        Remove-Item -LiteralPath $Target -Recurse -Force
    }
}

function Copy-TreeContents {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "源目录不存在：$Source"
    }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
    }
}

function Copy-SourceTreeContents {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "源码目录不存在：$Source"
    }

    $excludedDirectories = @(
        '.git',
        '.pytest_cache',
        '.venv',
        '__pycache__',
        'dist',
        'node_modules',
        'release'
    )
    $excludedExtensions = @('.db', '.log', '.pyc', '.pyo', '.sqlite3')
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null

    Get-ChildItem -LiteralPath $Source -Recurse -Force -File | ForEach-Object {
        $relative = [System.IO.Path]::GetRelativePath($Source, $_.FullName)
        $segments = $relative -split '[\\/]'
        $isExcludedDirectory = @($segments | Where-Object { $_ -in $excludedDirectories }).Count -gt 0
        $isEnvironmentFile = $_.Name -eq '.env' -or $_.Name.StartsWith('.env.', [System.StringComparison]::OrdinalIgnoreCase)
        $isExcludedExtension = $_.Extension.ToLowerInvariant() -in $excludedExtensions
        if (-not $isExcludedDirectory -and -not $isEnvironmentFile -and -not $isExcludedExtension) {
            $target = Join-Path $Destination $relative
            $targetParent = Split-Path -Parent $target
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }
    }
}

function Copy-RequiredFile {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "源文件不存在：$Source"
    }
    $parent = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function New-ZipFromDirectory {
    param([string]$SourceDirectory, [string]$ZipPath)
    Reset-Target -Target $ZipPath
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archiveStream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew)
    try {
        $archive = [System.IO.Compression.ZipArchive]::new(
            $archiveStream,
            [System.IO.Compression.ZipArchiveMode]::Create,
            $false
        )
        try {
            Get-ChildItem -LiteralPath $SourceDirectory -Recurse -Force -File | ForEach-Object {
                $relative = [System.IO.Path]::GetRelativePath($SourceDirectory, $_.FullName).Replace('\', '/')
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive,
                    $_.FullName,
                    $relative,
                    [System.IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        }
        finally {
            $archive.Dispose()
        }
    }
    finally {
        $archiveStream.Dispose()
    }
}

if (-not $SkipBuild) {
    Push-Location -LiteralPath $projectRoot
    try {
        & pnpm.cmd 'build'
        if ($LASTEXITCODE -ne 0) { throw '前端生产构建失败' }
    }
    finally {
        Pop-Location
    }
}

$distRoot = Join-Path $projectRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html') -PathType Leaf)) {
    throw 'dist/index.html 不存在，无法发布'
}

$stagingRoot = Join-Path $outputRoot 'staging'
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
$builtArtifacts = [System.Collections.Generic.List[string]]::new()

if ($Edition -in @('All', 'Platform')) {
    $sourceName = "EducationMind-Platform-FullSource-$Version"
    $sourceStage = Join-Path $stagingRoot $sourceName
    $sourceZip = Join-Path $outputRoot "$sourceName.zip"
    Reset-Target -Target $sourceStage
    New-Item -ItemType Directory -Path $sourceStage -Force | Out-Null

    # 完整平台源码使用显式白名单。不得把仓库根目录、数据库、秘密或本机缓存整体复制进发布包。
    foreach ($name in @(
        '.editorconfig',
        '.eslintignore',
        '.eslintrc.json',
        '.prettierrc',
        'AGENTS.md',
        'biome.json',
        'components.json',
        'cpage_config.json',
        'index.html',
        'meta.json',
        'package.json',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'postcss.config.js',
        'README.md',
        'tailwind.config.js',
        'THIRD_PARTY_NOTICES.md',
        'tsconfig.json',
        'tsconfig.node.json',
        'vite.config.ts',
        'vitest.config.ts'
    )) {
        Copy-RequiredFile -Source (Join-Path $projectRoot $name) -Destination (Join-Path $sourceStage $name)
    }

    foreach ($name in @('src', 'public', 'mcp', 'packages', 'scripts', 'deploy')) {
        Copy-SourceTreeContents -Source (Join-Path $projectRoot $name) -Destination (Join-Path $sourceStage $name)
    }

    foreach ($name in @('app', 'scripts', 'tests')) {
        Copy-SourceTreeContents -Source (Join-Path $projectRoot "apps\api\$name") -Destination (Join-Path $sourceStage "apps\api\$name")
    }
    foreach ($name in @('pyproject.toml', 'uv.lock', 'README.md')) {
        Copy-RequiredFile -Source (Join-Path $projectRoot "apps\api\$name") -Destination (Join-Path $sourceStage "apps\api\$name")
    }

    Copy-SourceTreeContents -Source (Join-Path $projectRoot '.local\live2d') -Destination (Join-Path $sourceStage '.local\live2d')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'deploy\platform-source\README.md') -Destination (Join-Path $sourceStage 'PLATFORM_SOURCE_README.md')

    New-ZipFromDirectory -SourceDirectory $sourceStage -ZipPath $sourceZip
    $builtArtifacts.Add($sourceZip)

    $platformName = "EducationMind-Platform-Web-$Version"
    $platformStage = Join-Path $stagingRoot $platformName
    $platformZip = Join-Path $outputRoot "$platformName.zip"
    Reset-Target -Target $platformStage
    New-Item -ItemType Directory -Path $platformStage -Force | Out-Null
    Copy-TreeContents -Source $distRoot -Destination $platformStage
    Copy-RequiredFile -Source (Join-Path $projectRoot 'cpage_config.json') -Destination (Join-Path $platformStage 'cpage_config.json')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'meta.json') -Destination (Join-Path $platformStage 'meta.json')
    @"
EducationMind 平台静态导入版 $Version

index.html 位于 ZIP 根目录，可直接导入支持 Vite 静态包的平台。
本包不含服务端、模型、参考音频、数据库或密钥。平台必须把同域 /api/* 转发到 Education API，服务型功能才可用。
需要由平台同时构建和运行前后端时，请上传 EducationMind-Platform-FullSource-$Version.zip。
完整本机服务请使用 EducationMind-Windows-Full-$Version.zip。
"@ | Set-Content -LiteralPath (Join-Path $platformStage 'DEPLOYMENT_README.txt') -Encoding utf8
    New-ZipFromDirectory -SourceDirectory $platformStage -ZipPath $platformZip
    $builtArtifacts.Add($platformZip)
}

if ($Edition -in @('All', 'Full')) {
    $fullName = "EducationMind-Windows-Full-$Version"
    $fullStage = Join-Path $stagingRoot $fullName
    $fullZip = Join-Path $outputRoot "$fullName.zip"
    Reset-Target -Target $fullStage
    New-Item -ItemType Directory -Path $fullStage -Force | Out-Null

    Copy-TreeContents -Source $distRoot -Destination (Join-Path $fullStage 'web')
    Copy-SourceTreeContents -Source (Join-Path $projectRoot 'apps\api\app') -Destination (Join-Path $fullStage 'apps\api\app')
    Copy-SourceTreeContents -Source (Join-Path $projectRoot 'apps\api\scripts') -Destination (Join-Path $fullStage 'apps\api\scripts')
    foreach ($name in @('pyproject.toml', 'uv.lock', 'README.md')) {
        Copy-RequiredFile -Source (Join-Path $projectRoot "apps\api\$name") -Destination (Join-Path $fullStage "apps\api\$name")
    }

    $resolvedGenieRoot = (Resolve-Path -LiteralPath $GenieRoot).Path
    Copy-SourceTreeContents -Source (Join-Path $resolvedGenieRoot 'src') -Destination (Join-Path $fullStage 'runtime\Genie-TTS\src')
    Copy-TreeContents -Source (Join-Path $resolvedGenieRoot 'GenieData') -Destination (Join-Path $fullStage 'runtime\Genie-TTS\GenieData')
    Copy-TreeContents -Source (Join-Path $resolvedGenieRoot 'Output\昔涟AI-GPT-SOVITS--V2proplus') -Destination (Join-Path $fullStage 'runtime\Genie-TTS\Output\昔涟AI-GPT-SOVITS--V2proplus')
    foreach ($name in @('pyproject.toml', 'requirements.txt', 'README.md', 'README_zh.md', 'LICENSE')) {
        Copy-RequiredFile -Source (Join-Path $resolvedGenieRoot $name) -Destination (Join-Path $fullStage "runtime\Genie-TTS\$name")
    }

    Copy-RequiredFile -Source (Join-Path $projectRoot '.local\voice\cyrene-reference.wav') -Destination (Join-Path $fullStage '.local\voice\cyrene-reference.wav')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'deploy\windows\install.ps1') -Destination (Join-Path $fullStage 'install.ps1')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'deploy\windows\start.ps1') -Destination (Join-Path $fullStage 'start.ps1')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'deploy\windows\README.md') -Destination (Join-Path $fullStage 'README.md')
    Copy-RequiredFile -Source (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') -Destination (Join-Path $fullStage 'THIRD_PARTY_NOTICES.md')
    New-Item -ItemType Directory -Path (Join-Path $fullStage 'data'), (Join-Path $fullStage 'logs') -Force | Out-Null

    New-ZipFromDirectory -SourceDirectory $fullStage -ZipPath $fullZip
    $builtArtifacts.Add($fullZip)
}

$manifestPath = Join-Path $outputRoot "EducationMind-$Version-SHA256.txt"
Reset-Target -Target $manifestPath
$manifestLines = foreach ($artifact in $builtArtifacts) {
    $hash = Get-FileHash -LiteralPath $artifact -Algorithm SHA256
    "$($hash.Hash)  $([System.IO.Path]::GetFileName($artifact))"
}
$manifestLines | Set-Content -LiteralPath $manifestPath -Encoding ascii
$builtArtifacts.Add($manifestPath)

$builtArtifacts | ForEach-Object { Write-Output "RELEASE_ARTIFACT=$($_)" }
