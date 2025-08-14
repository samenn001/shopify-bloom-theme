# Create a properly structured Shopify theme zip file
$ErrorActionPreference = "Stop"

$sourceDir = "C:\Users\ennour01\cat-tree-store"
$tempDir = "$env:TEMP\shopify-theme-temp"
$outputZip = "$sourceDir\shopify-theme-ready.zip"

Write-Host "Creating Shopify theme zip file..."

# Clean up any existing temp directory and zip file
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
if (Test-Path $outputZip) {
    Remove-Item -Path $outputZip -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy theme directories to temp location
$themeDirs = @('assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates')
foreach ($dir in $themeDirs) {
    $sourcePath = Join-Path $sourceDir $dir
    if (Test-Path $sourcePath) {
        Write-Host "Copying $dir..."
        Copy-Item -Path $sourcePath -Destination $tempDir -Recurse
    }
}

# Verify layout/theme.liquid exists in temp directory
$themeFile = Join-Path $tempDir "layout\theme.liquid"
if (-not (Test-Path $themeFile)) {
    Write-Error "Critical file missing: layout/theme.liquid"
    exit 1
}

Write-Host "Verified layout/theme.liquid exists"

# Create the zip file using .NET compression
Add-Type -Assembly System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Successfully created $outputZip"
Write-Host "The zip file contains:"
$themeDirs | ForEach-Object { Write-Host "  - $_/" }

Write-Host "`nThis file is ready to upload to Shopify!"