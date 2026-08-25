[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [Parameter(Mandatory = $true)]
    [string]$CubismCorePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolvedZip = (Resolve-Path -LiteralPath $ZipPath).Path
$resolvedCore = (Resolve-Path -LiteralPath $CubismCorePath).Path
$zipInfo = Get-Item -LiteralPath $resolvedZip
$coreInfo = Get-Item -LiteralPath $resolvedCore

if ($zipInfo.PSIsContainer -or $zipInfo.Length -le 0 -or $zipInfo.Length -gt 30MB) {
    throw 'The Live2D ZIP must be a non-empty file no larger than 30 MB.'
}
if ($coreInfo.PSIsContainer -or $coreInfo.Length -le 0 -or $coreInfo.Extension -ne '.js') {
    throw 'Cubism Core must be a non-empty JavaScript file.'
}

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.local\live2d'))
$modelRoot = [IO.Path]::GetFullPath((Join-Path $localRoot 'Cyrene1002'))
$modelRootWithSeparator = $modelRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$coreRoot = [IO.Path]::GetFullPath((Join-Path $localRoot 'core'))

[IO.Directory]::CreateDirectory($modelRoot) | Out-Null
[IO.Directory]::CreateDirectory($coreRoot) | Out-Null

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$allowedExtensions = @('.json', '.moc3', '.png')
$seenPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$archiveStream = [IO.File]::OpenRead($resolvedZip)
$archive = [IO.Compression.ZipArchive]::new($archiveStream, [IO.Compression.ZipArchiveMode]::Read, $false)
$extracted = 0
$totalUncompressed = [long]0

try {
    foreach ($entry in $archive.Entries) {
        $relative = $entry.FullName.Replace('\', '/')
        if ([string]::IsNullOrWhiteSpace($entry.Name)) {
            continue
        }

        $segments = $relative.Split('/', [StringSplitOptions]::RemoveEmptyEntries)
        if (
            $segments.Count -lt 2 -or
            $segments[0] -ne 'Cyrene1002' -or
            $segments -contains '..' -or
            [IO.Path]::IsPathRooted($relative)
        ) {
            throw "Unsafe or unexpected ZIP entry: $relative"
        }

        $extension = [IO.Path]::GetExtension($relative).ToLowerInvariant()
        if ($extension -notin $allowedExtensions) {
            continue
        }
        if (-not $seenPaths.Add($relative)) {
            throw "Duplicate ZIP entry: $relative"
        }

        $totalUncompressed += $entry.Length
        if ($totalUncompressed -gt 40MB) {
            throw 'The uncompressed Live2D model exceeds the 40 MB safety limit.'
        }

        $destination = [IO.Path]::GetFullPath(
            (Join-Path $localRoot ($segments -join [IO.Path]::DirectorySeparatorChar))
        )
        if (-not $destination.StartsWith($modelRootWithSeparator, [StringComparison]::OrdinalIgnoreCase)) {
            throw "ZIP entry escapes local model directory: $relative"
        }

        $parent = [IO.Path]::GetDirectoryName($destination)
        if ($null -eq $parent) {
            throw "ZIP entry has no destination directory: $relative"
        }
        [IO.Directory]::CreateDirectory($parent) | Out-Null

        $sourceStream = $entry.Open()
        $destinationStream = [IO.File]::Open(
            $destination,
            [IO.FileMode]::Create,
            [IO.FileAccess]::Write,
            [IO.FileShare]::None
        )
        try {
            $sourceStream.CopyTo($destinationStream)
        }
        finally {
            $destinationStream.Dispose()
            $sourceStream.Dispose()
        }
        $extracted += 1
    }
}
finally {
    $archive.Dispose()
    $archiveStream.Dispose()
}

$modelJsonPath = Join-Path $modelRoot 'Cyrene.model3.json'
if (-not (Test-Path -LiteralPath $modelJsonPath -PathType Leaf)) {
    throw 'Cyrene.model3.json was not found after extraction.'
}

$modelJson = Get-Content -LiteralPath $modelJsonPath -Raw | ConvertFrom-Json
$references = @(
    [string]$modelJson.FileReferences.Moc
    [string]$modelJson.FileReferences.Physics
    [string]$modelJson.FileReferences.DisplayInfo
) + @($modelJson.FileReferences.Textures | ForEach-Object { [string]$_ })

foreach ($reference in $references) {
    if ([string]::IsNullOrWhiteSpace($reference)) {
        throw 'The model manifest contains an empty required file reference.'
    }
    $referencedPath = [IO.Path]::GetFullPath((Join-Path $modelRoot $reference))
    if (
        -not $referencedPath.StartsWith($modelRootWithSeparator, [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $referencedPath -PathType Leaf)
    ) {
        throw "The model manifest references a missing or unsafe file: $reference"
    }
}

$coreDestination = Join-Path $coreRoot 'live2dcubismcore.min.js'
Copy-Item -LiteralPath $resolvedCore -Destination $coreDestination -Force

Write-Output "Installed $extracted model files in $modelRoot"
Write-Output "ZIP SHA256: $((Get-FileHash -LiteralPath $resolvedZip -Algorithm SHA256).Hash)"
Write-Output "Model SHA256: $((Get-FileHash -LiteralPath $modelJsonPath -Algorithm SHA256).Hash)"
Write-Output "Core SHA256: $((Get-FileHash -LiteralPath $coreDestination -Algorithm SHA256).Hash)"
