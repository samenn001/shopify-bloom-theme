$source = 'C:\Users\ennour01\cat-tree-store'
$destination = 'C:\Users\ennour01\bloom-and-climb-theme-clean.zip'

# Essential theme directories
$essentialDirs = @('assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates')

# Create temp directory
$tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

# Copy only essential directories
foreach ($dir in $essentialDirs) {
    $sourcePath = Join-Path $source $dir
    $destPath = Join-Path $tempDir $dir
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
    }
}

# Remove video files from assets to save space
$videoFiles = Join-Path $tempDir 'assets\*.mp4'
Remove-Item $videoFiles -ErrorAction SilentlyContinue

# Create zip
Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $destination -Force

# Clean up temp
Remove-Item $tempDir -Recurse -Force

# Show size
$zipFile = Get-Item $destination
Write-Host "Created: $($zipFile.Name)"
Write-Host "Size: $([math]::Round($zipFile.Length/1MB, 2)) MB"