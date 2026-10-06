[CmdletBinding()]
param(
    [string]$OutputRoot,
    [string]$RegctlPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $projectRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath exited with code $LASTEXITCODE"
    }
}

function Copy-FilteredTree {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    $sourceRoot = (Resolve-Path -LiteralPath $Source).Path
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
        $_.FullName -notmatch '[\\/](?:__pycache__|\.pytest_cache)[\\/]' -and
        $_.Extension -notin @('.pyc', '.pyo')
    } | ForEach-Object {
        $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
        $target = Join-Path $Destination $relative
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $target
    }
}

$trackedStatus = (& git status --porcelain --untracked-files=no) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect tracked Git state.' }
if (-not [string]::IsNullOrWhiteSpace($trackedStatus)) {
    throw "Tracked files must be clean before a release build:`n$trackedStatus"
}

$sourceCommit = (& git rev-parse HEAD).Trim()
$branch = (& git branch --show-current).Trim()
if ($sourceCommit -notmatch '^[0-9a-f]{40}$') { throw 'Invalid source commit.' }
if ([string]::IsNullOrWhiteSpace($branch)) { throw 'Release build requires a branch.' }

$releaseDate = (Get-Date).ToUniversalTime().ToString('yyyyMMdd')
$releaseId = "$releaseDate-$($sourceCommit.Substring(0, 12))"
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $projectRoot ".local\ecs-lianqianyan-$releaseDate"
}
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$releaseRoot = Join-Path $OutputRoot $releaseId
if (Test-Path -LiteralPath $releaseRoot) {
    throw "Release output already exists: $releaseRoot"
}
New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null

$oldBasePath = [Environment]::GetEnvironmentVariable('VITE_BASE_PATH', 'Process')
$oldApiUrl = [Environment]::GetEnvironmentVariable('VITE_EDUCATION_API_URL', 'Process')
try {
    $env:VITE_BASE_PATH = '/lianqianyan/'
    $env:VITE_EDUCATION_API_URL = '/lianqianyan'
    Invoke-Checked -FilePath 'pnpm' -ArgumentList @('build')
} finally {
    [Environment]::SetEnvironmentVariable('VITE_BASE_PATH', $oldBasePath, 'Process')
    [Environment]::SetEnvironmentVariable('VITE_EDUCATION_API_URL', $oldApiUrl, 'Process')
}

$dist = Join-Path $projectRoot 'dist'
$indexPath = Join-Path $dist 'index.html'
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw 'Vite build did not produce dist/index.html.'
}
$indexHtml = Get-Content -LiteralPath $indexPath -Raw
if ($indexHtml -notmatch '/lianqianyan/assets/') {
    throw 'The production HTML does not use the /lianqian/assets prefix.'
}
if ($indexHtml -match '(?:src|href)=["'']/assets/') {
    throw 'The production HTML still references root /assets paths.'
}

$context = Join-Path $releaseRoot 'context'
New-Item -ItemType Directory -Force -Path $context | Out-Null
Copy-FilteredTree -Source $dist -Destination (Join-Path $context 'dist')
Copy-FilteredTree -Source (Join-Path $projectRoot 'apps\api\app') -Destination (Join-Path $context 'apps\api\app')
Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\api\pyproject.toml') -Destination (Join-Path $context 'apps\api\pyproject.toml') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'apps\api\uv.lock') -Destination (Join-Path $context 'apps\api\uv.lock') -Force
Copy-FilteredTree -Source (Join-Path $projectRoot 'deploy\server') -Destination (Join-Path $context 'deploy\server')

$releaseMetadata = [ordered]@{
    project = 'lianqianyan'
    release_id = $releaseId
    source_commit = $sourceCommit
    source_branch = $branch
    public_url = 'https://8.156.67.132/lianqianyan/'
    db_schema = 1
    created_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    base_images = [ordered]@{
        python = 'python:3.12.12-slim-bookworm@sha256:2986c55feb36e6cae00fa1fefb454283e4b33f35e75ff8bdd123b134130be301'
        nginx = 'nginxinc/nginx-unprivileged:1.27.5-alpine3.21@sha256:28d91bdce70ad09025ea901458fdd149259d8e05982ade79d4ef2c0d9470eb48'
    }
}
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText(
    (Join-Path $context 'release.json'),
    ($releaseMetadata | ConvertTo-Json -Depth 5) + "`n",
    $utf8
)

$shellFiles = Get-ChildItem -LiteralPath (Join-Path $context 'deploy\server') -Filter '*.sh' -File
foreach ($shellFile in $shellFiles) {
    $bytes = [IO.File]::ReadAllBytes($shellFile.FullName)
    if ($bytes -contains 13) { throw "Shell script is not LF-only: $($shellFile.Name)" }
}

$sumPath = Join-Path $context 'SHA256SUMS'
$sumLines = Get-ChildItem -LiteralPath $context -Recurse -File | Where-Object {
    $_.FullName -ne $sumPath
} | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($context.Length + 1).Replace('\', '/')
    "$((Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant())  $relative"
}
[IO.File]::WriteAllText($sumPath, ($sumLines -join "`n") + "`n", $utf8)

$contextArchive = Join-Path $releaseRoot "lianqianyan-context-$releaseId.tar.gz"
Invoke-Checked -FilePath 'tar.exe' -ArgumentList @('-czf', $contextArchive, '-C', $context, '.')
$contextArchiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $contextArchive).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$contextArchive.sha256", "$contextArchiveHash  $([IO.Path]::GetFileName($contextArchive))`n", $utf8)

if ([string]::IsNullOrWhiteSpace($RegctlPath)) {
    $RegctlPath = Join-Path $projectRoot '.local\tools\regctl-v0.11.4\regctl-windows-amd64.exe'
}
$RegctlPath = [IO.Path]::GetFullPath($RegctlPath)
if (-not (Test-Path -LiteralPath $RegctlPath -PathType Leaf)) {
    throw "Verified regctl v0.11.4 is required at: $RegctlPath"
}
$regctlHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $RegctlPath).Hash.ToLowerInvariant()
if ($regctlHash -ne '3dcf16028cbe95ead5d2706c5a646e5614478e4782b5fdd11e274a0d92973267') {
    throw 'regctl-windows-amd64.exe failed its pinned SHA-256 check.'
}

$pythonBase = Join-Path $releaseRoot 'python-base-linux-amd64.tar'
$nginxBase = Join-Path $releaseRoot 'nginx-base-linux-amd64.tar'
$pythonReference = 'python:3.12.12-slim-bookworm@sha256:2986c55feb36e6cae00fa1fefb454283e4b33f35e75ff8bdd123b134130be301'
$nginxReference = 'nginxinc/nginx-unprivileged:1.27.5-alpine3.21@sha256:28d91bdce70ad09025ea901458fdd149259d8e05982ade79d4ef2c0d9470eb48'
Write-Host "regctl image export: python linux/amd64"
Invoke-Checked -FilePath $RegctlPath -ArgumentList @('image', 'export', '--platform', 'linux/amd64', '--name', 'python:3.12.12-slim-bookworm', $pythonReference, $pythonBase)
Write-Host "regctl image export: nginx-unprivileged linux/amd64"
Invoke-Checked -FilePath $RegctlPath -ArgumentList @('image', 'export', '--platform', 'linux/amd64', '--name', 'nginxinc/nginx-unprivileged:1.27.5-alpine3.21', $nginxReference, $nginxBase)

foreach ($baseArchive in @($pythonBase, $nginxBase)) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $baseArchive).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText("$baseArchive.sha256", "$hash  $([IO.Path]::GetFileName($baseArchive))`n", $utf8)
}

[pscustomobject]@{
    releaseId = $releaseId
    sourceCommit = $sourceCommit
    output = $releaseRoot
    contextArchive = $contextArchive
    contextArchiveSha256 = $contextArchiveHash
    pythonBaseArchive = $pythonBase
    nginxBaseArchive = $nginxBase
} | ConvertTo-Json -Depth 3
